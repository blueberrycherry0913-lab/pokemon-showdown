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
 *   --server=host:port                            (default localhost:8000)
 *   --names=A,B       bot names                   (default BotAlpha,BotBravo)
 *   --move=F          AI: 1.0 = never switch, 0.7 = ~30% switch (default 0.7)
 *   --mega=F          AI: 0 = no random Tera/Mega, 0.6 = often   (default 0.6)
 *   --timeout=S       per-game timeout in seconds (default 180)
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
const MODE = args.mode || 'both';
const SERVER = args.server || 'localhost:8000';
const [NAME_A, NAME_B] = (args.names || 'BotAlpha,BotBravo').split(',').map(s => s.trim());
const MOVE = args.move !== undefined ? Number(args.move) : 0.7;
const MEGA = args.mega !== undefined ? Number(args.mega) : 0.6;
const TIMEOUT_MS = (Number(args.timeout) || 180) * 1000;
const NOAUTH = !!args.noauth;
const LOGINSERVER = args.loginserver || 'https://play.pokemonshowdown.com/';

const RESULTS_DIR = path.join(__dirname, 'results');
const CRASH_DIR = path.join(RESULTS_DIR, 'crashes');
fs.mkdirSync(CRASH_DIR, {recursive: true});
const RESULTS_FILE = path.join(RESULTS_DIR, `run-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class Harness {
	constructor() {
		this.nextTeam = teamSource(MODE);
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
		console.log(`Both bots logged in. Running ${GAMES} game(s) of ${FORMAT} (mode=${MODE}, move=${MOVE}, mega=${MEGA}).`);

		for (let i = 1; i <= GAMES; i++) {
			await this.playGame(i);
			await sleep(300); // let rooms settle between games
		}

		this.printSummary();
		this.connA.close();
		this.connB.close();
	}

	makeAI(conn, roomid) {
		const map = this.aiByConn.get(conn);
		let ai = map.get(roomid);
		if (!ai) {
			ai = new WSPlayerAI(choice => conn.send(roomid, choice), {move: MOVE, mega: MEGA});
			map.set(roomid, ai);
		}
		return ai;
	}

	onLine(conn, side, roomid, line) {
		// Global lines: connection B watches for an incoming challenge to accept.
		if (!roomid) {
			if (side === 'b' && line.startsWith('|updatechallenges|')) this.maybeAccept(line);
			return;
		}
		if (!roomid.startsWith('battle-')) return;

		// First battle line of the game pins the room id.
		if (this.game && !this.game.roomid) this.game.roomid = roomid;

		// Feed every battle-room line to this connection's AI (it acts only on
		// |request| / |error|, logs the rest). This is the engine's own decision logic.
		this.makeAI(conn, roomid).receive(line);

		// Drive game-state tracking off connection A's view (avoids double counting).
		if (side !== 'a' || !this.game || this.game.ended) return;
		this.game.log.push(line);
		if (line.startsWith('|turn|')) {
			const t = parseInt(line.slice(6), 10);
			if (!isNaN(t)) this.game.turns = t;
		} else if (line.startsWith('|win|')) {
			this.game.winner = line.slice(5).trim();
			this.endGame(false);
		} else if (line.startsWith('|tie')) {
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
		let data;
		try { data = JSON.parse(line.slice('|updatechallenges|'.length)); } catch { return; }
		const from = data && data.challengesFrom;
		if (from && from[toID(NAME_A)]) {
			this.game.accepted = true;
			this.connB.sendGlobal(`/utm ${this.game.teamB.packed}`);
			this.connB.sendGlobal(`/accept ${NAME_A}`);
		}
	}

	endGame(crashed) {
		if (!this.game || this.game.ended) return;
		this.game.ended = true;
		this.game.crashed = crashed;
		clearTimeout(this.game.timer);
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
			winner: undefined, reason: null, turns: 0, log: [], errors: [],
			teamA, teamB, resolve: null, timer: null,
		};
		const done = new Promise(res => { game.resolve = res; });
		game.timer = setTimeout(() => {
			if (!game.ended) { game.reason = `timeout after ${TIMEOUT_MS / 1000}s (possible hang)`; this.endGame(true); }
		}, TIMEOUT_MS);

		// Challenge handshake. A sets its team and challenges; B auto-accepts via maybeAccept().
		this.connA.sendGlobal(`/utm ${teamA.packed}`);
		this.connA.sendGlobal(`/challenge ${NAME_B}, ${FORMAT}`);

		await done;
		await this.finishGame(game);
	}

	async finishGame(game) {
		const roomid = game.roomid;
		// Leave the battle room on both connections and drop their AIs.
		if (roomid) {
			this.connA.send(roomid, '/leave');
			this.connB.send(roomid, '/leave');
			this.aiByConn.get(this.connA).delete(roomid);
			this.aiByConn.get(this.connB).delete(roomid);
		}

		const excluded = game.crashed || game.winner === undefined;
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
		this.game = null;
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
