'use strict';

/**
 * Bot-vs-bot battle harness — orchestrator / entry point.
 *
 * Connects two headless bots to a RUNNING server (start it first with your normal
 * launch-showdown-clean.bat), has them challenge each other in
 * [Gen 9] Testing Standard, drives random choices, and runs N games. Completed
 * games feed the §28 analytics dashboard automatically. Crashes are logged with
 * the matchup (teams) for reproduction and scrubbed from analytics.
 *
 * Usage:
 *   node run.js --games=200 --mode=both
 *   node run.js --games=10 --mode=random --move=1.0 --mega=0   (moves-only bots)
 *
 * Flags:
 *   --games=N         number of games (default 50)
 *   --mode=M          random | pool | both       (default both)
 *   --teams=PATH      team file for pool/both mode (export OR packed format)
 *   --strict-pool     skip pool teams that fail the validator (default: use anyway)
 *   --server=host:port                            (default localhost:8000)
 *   --names=A,B       bot names                   (default BotAlpha,BotBravo)
 *   --move=F          AI: 1.0 = never switch, 0.7 = ~30% switch (default 0.7)
 *   --mega=F          AI: 0 = no random Tera/Mega, 0.6 = often   (default 0.6)
 *   --watch           viewable mode: print each room's /join link, slow turns,
 *                     and keep the room open after a win
 *   --watch-delay=MS  per-choice delay in watch mode (default 900)
 *   --watch-linger=MS keep room open this long after a win (default 5000)
 *   --replays         attempt /savereplay after each game
 *   --timeout=S       per-game timeout in seconds (default 180; 600 in watch mode)
 *   --noauth          log in without a loginserver assertion (dev servers with
 *                     Config.noguestsecurity = true)
 *   --loginserver=URL override loginserver base   (default play.pokemonshowdown.com)
 */

const fs = require('fs');
const path = require('path');

const {Connection, toID} = require('./connection');
const {WSPlayerAI} = require('./ai');
const {FORMAT, teamSource} = require('./teams');
const {scrubGame} = require('./scrub');

function parseArgs(argv) {
	const out = {};
	for (const a of argv.slice(2)) {
		const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
		if (m) out[m[1]] = m[2] === undefined ? true : m[2];
	}
	return out;
}

const args = parseArgs(process.argv);
const GAMES = Number(args.games) || 50;
// Batched/resume: skip the first START games (advance the pool cursor by 2*START so
// game START+1 draws the right teams) and run games START+1 .. GAMES. Lets a big pool
// run be split into chunks against the same static team file (see --teams).
const START = Math.max(0, Number(args.start) || 0);
const MODE = args.mode || 'both';
const TEAMS_FILE = args.teams || undefined; // defaults to ./teams.txt inside teams.js
const STRICT_POOL = !!args['strict-pool'];
const SERVER = args.server || 'localhost:8000';
const [NAME_A, NAME_B] = (args.names || 'BotAlpha,BotBravo').split(',').map(s => s.trim());
const MOVE = args.move !== undefined ? Number(args.move) : 0.7;
const MEGA = args.mega !== undefined ? Number(args.mega) : 0.6;
const WATCH = !!args.watch;
const WATCH_DELAY = Number(args['watch-delay']) || 900;   // ms delay per choice (watch mode)
const WATCH_LINGER = args['watch-linger'] !== undefined ? Number(args['watch-linger']) : 5000; // ms to keep room open after a win
const REPLAYS = !!args.replays;                            // attempt /savereplay after each game
// Watch mode slows turns, so use a longer per-game timeout unless overridden.
const TIMEOUT_MS = (Number(args.timeout) || (WATCH ? 600 : 180)) * 1000;
const NOAUTH = !!args.noauth;
const LOGINSERVER = args.loginserver || 'https://play.pokemonshowdown.com/';

const RESULTS_DIR = path.join(__dirname, 'results');
const CRASH_DIR = path.join(RESULTS_DIR, 'crashes');
fs.mkdirSync(CRASH_DIR, {recursive: true});
const RESULTS_FILE = path.join(RESULTS_DIR, `run-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class Harness {
	constructor() {
		this.nextTeam = teamSource(MODE, {file: TEAMS_FILE, strict: STRICT_POOL});
		this.aiByConn = new Map(); // conn -> Map(roomid -> WSPlayerAI)
		this.game = null;          // current game state
		this.stats = {a: 0, b: 0, ties: 0, crashes: 0, setupErrors: 0, turnsTotal: 0, completed: 0};

		this.connA = new Connection({
			name: NAME_A, server: SERVER, noAuth: NOAUTH, loginServer: LOGINSERVER,
			onLine: (roomid, line) => this.onLine(this.connA, 'a', roomid, line),
		});
		this.connB = new Connection({
			name: NAME_B, server: SERVER, noAuth: NOAUTH, loginServer: LOGINSERVER,
			onLine: (roomid, line) => this.onLine(this.connB, 'b', roomid, line),
		});
		this.aiByConn.set(this.connA, new Map());
		this.aiByConn.set(this.connB, new Map());
	}

	async start() {
		console.log(`Connecting ${NAME_A} and ${NAME_B} to ${SERVER} ...`);
		this.connA.connect();
		this.connB.connect();
		await Promise.all([this.connA.ready, this.connB.ready]);
		console.log(`Both bots logged in. Running games ${START + 1}..${GAMES} of ${FORMAT} (mode=${MODE}, move=${MOVE}, mega=${MEGA}${START ? `, resuming from #${START + 1}` : ''}${WATCH ? `, WATCH +${WATCH_DELAY}ms/choice` : ''}).`);
		if (WATCH) console.log(`Watch mode on: join each battle room in your client when its /join link prints below.`);

		// Resume support: discard the first 2*START pool draws so game START+1 lines up
		// with teams[2*START] vs teams[2*START+1] in the static team file.
		for (let s = 0; s < 2 * START; s++) {
			try { this.nextTeam(); } catch (err) { /* pool exhausted/short — ignore */ }
		}

		for (let i = START + 1; i <= GAMES; i++) {
			await this.playGame(i);
			await sleep(1200); // let the server fully tear down the room before the next challenge
		}

		this.printSummary();
		this.connA.close();
		this.connB.close();
	}

	makeAI(conn, roomid) {
		const map = this.aiByConn.get(conn);
		let ai = map.get(roomid);
		if (!ai) {
			// Watch mode delays each choice so turns are human-readable in the client.
			const sendChoice = WATCH ?
				(choice => setTimeout(() => conn.send(roomid, choice), WATCH_DELAY)) :
				(choice => conn.send(roomid, choice));
			ai = new WSPlayerAI(sendChoice, {move: MOVE, mega: MEGA});
			map.set(roomid, ai);
		}
		return ai;
	}

	onLine(conn, side, roomid, line) {
		// Global lines: connection B watches for an incoming challenge to accept.
		if (!roomid) {
			const who = side === 'a' ? NAME_A : NAME_B;
			// Capture recent global lines for handshake diagnostics.
			if (this.game) (this.game.globalLines || (this.game.globalLines = [])).push(`${who}: ${line}`);
			// Challenge/team rejections come back as popups (and sometimes PMs) — surface them,
			// otherwise a refused challenge hangs silently.
			// Popups carry challenge/team rejections — always surface them. PMs (incl. the
			// challenge handshake) are captured in globalLines above but not printed (noisy).
			if (line.startsWith('|popup|')) {
				console.error(`[${who}] server popup: ${line.slice('|popup|'.length).replace(/\|\|/g, '  —  ')}`);
			}
			// This server uses the classic PM-based challenge protocol (no |updatechallenges|):
			// the offer arrives as |pm|<from>|<to>|/challenge <format>|... — B accepts that.
			if (side === 'b' && line.startsWith('|pm|')) this.maybeAccept(line);
			return;
		}
		if (!roomid.startsWith('battle-')) return;

		// Pin the room id on the authoritative room-join line (`|init|battle`), NOT the
		// first battle- line seen. A trailing line from the PREVIOUS game's room (chat,
		// |leave|, late |request|) would otherwise mis-pin this game to the old room, so
		// finishGame's /leave targeted an already-left room while the bots stayed joined
		// to the real one — rooms accumulated until the server throttled new challenges
		// (~6-12 games in, surfacing as "handshake failed / accepted=false").
		if (this.game && !this.game.roomid && (line.startsWith('|init|battle') || line.startsWith('|player|') || line.startsWith('|turn|'))) {
			this.game.roomid = roomid;
			clearTimeout(this.game.handshakeTimer);
			console.log(`[game ${this.game.index}] battle room opened: ${roomid}`);
			if (WATCH) console.log(`[game ${this.game.index}] WATCH — in your client type:  /join ${roomid}`);
		}

		// Feed every battle-room line to this connection's AI (it acts only on
		// |request| / |error|, logs the rest). This is the engine's own decision logic.
		this.makeAI(conn, roomid).receive(line);

		// Drive game-state tracking off connection A's view (avoids double counting).
		// Once the room is pinned, ignore stray lines from any OTHER room (a previous
		// game's trailing |win|/|tie| must not end this game).
		if (side !== 'a' || !this.game || this.game.ended) return;
		if (this.game.roomid !== roomid) return; // only this game's pinned room (ignores stray/old-room lines)
		this.game.log.push(line);
		if (line.startsWith('|turn|')) {
			const t = parseInt(line.slice(6), 10);
			if (!isNaN(t)) this.game.turns = t;
		} else if (line.startsWith('|win|')) {
			this.game.winner = line.slice(5).trim();
			this.endGame(false);
		} else if (line === '|tie' || line.startsWith('|tie|')) {
			// NB: exact match — `|tier|...` (room init) also starts with "|tie".
			this.game.winner = null;
			this.endGame(false);
		} else if (line.startsWith('|bigerror|') && /crash/i.test(line)) {
			this.game.reason = line.slice('|bigerror|'.length);
			this.endGame(true);
		} else if (line.startsWith('|error|')) {
			// Sim-level error surfaced into the room — record but don't necessarily end;
			// a hang afterward will trip the timeout, a recovery will reach |win|.
			this.game.errors.push(line);
		}
	}

	maybeAccept(line) {
		if (!this.game || this.game.accepted) return;
		// Challenge offer PM: |pm| <fromIdentity>| <toIdentity>|/challenge <format>|<tbf>|<msg>|...
		// (A bare "/challenge" with no format is a cancel/clear — ignore it.)
		const parts = line.split('|');
		const from = toID(parts[2]);     // challenger
		const to = toID(parts[3]);       // recipient (should be us, connB)
		const payload = parts[4] || '';
		if (to !== this.connB.id) return;            // not addressed to this bot
		if (from !== toID(NAME_A)) return;           // not from our challenger
		if (!payload.startsWith('/challenge ')) return; // not an active challenge offer
		const format = payload.slice('/challenge '.length).split('|')[0];
		if (toID(format) !== toID(FORMAT)) return;   // different format

		console.log(`[game ${this.game.index}] ${NAME_B} received the challenge — accepting.`);
		this.game.accepted = true;
		this.connB.sendGlobal(`/utm ${this.game.teamB.packed}`);
		this.connB.sendGlobal(`/accept ${NAME_A}`);
	}

	endGame(crashed) {
		if (!this.game || this.game.ended) return;
		this.game.ended = true;
		this.game.crashed = crashed;
		clearTimeout(this.game.timer);
		clearTimeout(this.game.handshakeTimer);
		this.game.resolve();
	}

	async playGame(index) {
		// Team setup. A generator/validator failure is a setup error, not a battle crash.
		let teamA, teamB;
		try {
			teamA = this.nextTeam();
			teamB = this.nextTeam();
		} catch (err) {
			this.stats.setupErrors++;
			console.error(`[game ${index}] team setup failed: ${err.message}`);
			return;
		}

		const game = this.game = {
			index, roomid: null, ended: false, crashed: false, accepted: false,
			winner: undefined, reason: null, turns: 0, log: [], errors: [], globalLines: [],
			teamA, teamB, resolve: null, timer: null, handshakeTimer: null,
		};
		const done = new Promise(res => { game.resolve = res; });
		game.timer = setTimeout(() => {
			if (!game.ended) { game.reason = `timeout after ${TIMEOUT_MS / 1000}s (possible hang)`; this.endGame(true); }
		}, TIMEOUT_MS);

		// Handshake watchdog: if no battle room opens within 30s the challenge or accept
		// was rejected (almost always shown as a |popup| above). Report and move on rather
		// than waiting out the full per-game timeout.
		game.handshakeTimer = setTimeout(() => {
			if (game.ended || game.roomid) return;
			console.error(`[game ${index}] handshake failed — no battle room after 30s (accepted=${game.accepted}).`);
			console.error(`  Last global lines (look for a popup just above):`);
			for (const l of game.globalLines.slice(-15)) console.error(`    ${l}`);
			game.reason = `challenge handshake failed (accepted=${game.accepted}, no battle room)`;
			this.endGame(true);
		}, 30000);

		// Challenge handshake. A sets its team and challenges; B auto-accepts via maybeAccept().
		console.log(`[game ${index}] ${NAME_A} challenging ${NAME_B} to ${FORMAT} …`);
		this.connA.sendGlobal(`/utm ${teamA.packed}`);
		this.connA.sendGlobal(`/challenge ${NAME_B}, ${FORMAT}`);

		await done;
		await this.finishGame(game);
	}

	async finishGame(game) {
		const roomid = game.roomid;
		const excluded = game.crashed || game.winner === undefined;

		this.recordResult(game, roomid, excluded);

		// Watch mode: optionally save a replay, then keep the room open so you can
		// see the end of the battle in your client before the bots leave.
		if (roomid && REPLAYS) this.connA.send(roomid, '/savereplay');
		if (roomid && WATCH && !excluded) {
			console.log(`[game ${game.index}] keeping room open ${WATCH_LINGER / 1000}s — /join ${roomid}`);
			await sleep(WATCH_LINGER);
		}

		// Leave the battle room on both connections and drop their AIs.
		if (roomid) {
			this.connA.send(roomid, '/leave');
			this.connB.send(roomid, '/leave');
			this.aiByConn.get(this.connA).delete(roomid);
			this.aiByConn.get(this.connB).delete(roomid);
		}
		this.game = null;
	}

	recordResult(game, roomid, excluded) {
		if (excluded) {
			this.stats.crashes++;
			const scrubbed = roomid ? scrubGame(roomid) : false;
			const artifact = {
				time: new Date().toISOString(),
				game: game.index,
				roomid,
				reason: game.reason || (game.winner === undefined ? 'ended without win/tie' : 'crash'),
				turns: game.turns,
				errors: game.errors,
				scrubbedFromAnalytics: scrubbed,
				teamA: game.teamA.packed,
				teamB: game.teamB.packed,
				log: game.log,
			};
			const file = path.join(CRASH_DIR, `${(roomid || `game-${game.index}`)}.json`);
			fs.writeFileSync(file, JSON.stringify(artifact, null, 2));
			console.log(`[game ${game.index}] CRASH/EXCLUDED — ${artifact.reason}. Logged to ${path.relative(process.cwd(), file)}${scrubbed ? ' (analytics scrubbed)' : ''}`);
			this.append({game: game.index, roomid, result: 'crash', reason: artifact.reason, turns: game.turns});
		} else {
			this.stats.completed++;
			this.stats.turnsTotal += game.turns;
			let result;
			if (game.winner === null || game.winner === '') {
				this.stats.ties++; result = 'tie';
			} else if (toID(game.winner) === toID(NAME_A)) {
				this.stats.a++; result = NAME_A;
			} else {
				this.stats.b++; result = NAME_B;
			}
			console.log(`[game ${game.index}] ${result === 'tie' ? 'TIE' : `${result} won`} in ${game.turns} turns.`);
			this.append({game: game.index, roomid, result, turns: game.turns});
		}
	}

	append(row) {
		fs.appendFileSync(RESULTS_FILE, JSON.stringify(row) + '\n');
	}

	printSummary() {
		const s = this.stats;
		const avgTurns = s.completed ? (s.turnsTotal / s.completed).toFixed(1) : '—';
		console.log(`\n================ SUMMARY ================`);
		console.log(`Games requested : ${GAMES}`);
		console.log(`Completed       : ${s.completed}  (avg ${avgTurns} turns)`);
		console.log(`  ${NAME_A} wins : ${s.a}`);
		console.log(`  ${NAME_B} wins : ${s.b}`);
		console.log(`  Ties          : ${s.ties}`);
		console.log(`Crashes/excluded: ${s.crashes}   (see results/crashes/)`);
		console.log(`Team setup fails: ${s.setupErrors}`);
		console.log(`Per-game results: ${path.relative(process.cwd(), RESULTS_FILE)}`);
		console.log(`=========================================`);
	}
}

new Harness().start().then(() => process.exit(0)).catch(err => {
	console.error('Harness fatal error:', err);
	process.exit(1);
});
