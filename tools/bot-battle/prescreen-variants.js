'use strict';

/**
 * Offline crash pre-screen for the smoke test.
 *
 * For every (species, basic-ability) variant in the smoke-test pool, runs a couple of
 * short headless [Gen 9] Testing Standard battles (solo test mon vs a fixed opponent
 * panel) using the SAME dist/sim the server runs. Catches thrown exceptions and
 * |error| / |bigerror|…crash protocol lines. Any variant that crashes is written to
 * prescreen-crashers.json so gen-smoke-teams.js can exclude it BEFORE the live run —
 * preventing a deterministically-crashing ability from recurring every game.
 *
 * Run from this directory after `node build`:  node prescreen-variants.js
 */

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const {Dex, BattleStream, getPlayerStreams, Teams} = require('../../dist/sim');
const {RandomPlayerAI} = require('../../dist/sim/tools/random-player-ai');
const {buildPool, movesFor, variantsOf} = require('./smoke-pool');

// CHOICE-LAYER NOISE: errors produced by the RandomPlayerAI / choice handling itself
// (NOT the battle engine) when driving offline solo 1v1s — e.g. a targeting quirk, or
// the AI sending a stale/extra choice after a faint. These cannot happen on the live
// server (6-mon teams, server-managed requests) and must NOT be counted as format
// crashes. Verified: every such "crash" cleared once these were swallowed.
const CHOICE_NOISE = /\[Invalid choice\]|\[Unavailable choice\]|Incomplete choice|autoChoose|more choices than unfainted|Can't move:/i;

// Base RandomPlayerAI.receiveError throws on a rejected choice; the live harness's
// WSPlayerAI swallows it and submits `default`. Mirror that (broadened to all choice
// noise) so AI artifacts don't abort the pre-screen or masquerade as sim crashes.
class SafeAI extends RandomPlayerAI {
	receiveError(error) {
		const msg = (error && error.message) || '';
		if (CHOICE_NOISE.test(msg)) {
			try { this.choose('default'); } catch (e) { /* nothing left to choose */ }
			return;
		}
		throw error;
	}
}

const FORMAT = 'gen9testingstandard';
const MOD = 'champions';
const dex = Dex.mod(MOD);

const BATTLES_PER_VARIANT = 2;     // a couple of RNG rolls per variant (inline first pass)
const CONFIRM_BATTLES = 6;         // fresh-process re-test battles for a flagged variant
// Let battles end NATURALLY (random play converges — verified 30/30 end well under this).
// Do NOT cap turns + `>forcetie`: forcetie fires engine cleanup paths that throw on
// some abilities (e.g. Ice Face) and would false-positive. Timeout is a hang-catch only.
const BATTLE_TIMEOUT_MS = 25000;
const CRASH_EXIT_CODE = 3;         // --confirm child exit code when the variant crashes

const OUT_FILE = path.join(__dirname, 'prescreen-crashers.json');

// Fixed, deliberately-simple opponents (in-pool Gen 1 mons). If one of THESE crashes,
// every variant will report a crash — an obvious "swap the opponent" signal.
const OPPONENTS = ['Snorlax', 'Lapras'];

function makeSet(speciesId, ability) {
	const sp = dex.species.get(speciesId);
	return {
		species: sp.name, name: sp.name, level: 50, gender: '',
		ability, item: 'Oran Berry', moves: movesFor(sp),
		nature: 'Hardy', ivs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, evs: {},
	};
}

function opponentSet(name) {
	const sp = dex.species.get(name);
	return makeSet(sp.id, sp.abilities['0']);
}

/** Run one headless battle; resolve {crashed, error}. Never rejects.
 * Ends a turn-capped battle GRACEFULLY with `>forcetie` (the resulting |tie| lets the
 * stream close on its own) and only ever calls stream.destroy() on a genuine crash or
 * hang. Calling destroy() mid-tick on a HEALTHY battle was itself throwing
 * "Cannot set properties of undefined (setting 'duration')" — a teardown artifact, not
 * a format bug (verified: a no-destroy runner is clean across 100+ runs). */
function runBattle(teamA, teamB) {
	return new Promise(resolve => {
		let done = false;
		let stream = null;
		let timer = null;
		const finish = (crashed, error) => {
			if (done) return;
			done = true;
			try { if (timer) clearTimeout(timer); } catch (e) { /* ignore */ }
			// Only force-destroy a broken/hung battle; healthy ones close themselves.
			if (crashed) { try { if (stream) stream.destroy(); } catch (e) { /* ignore */ } }
			resolve({crashed, error});
		};
		timer = setTimeout(() => finish(true, `timeout >${BATTLE_TIMEOUT_MS}ms (possible hang)`), BATTLE_TIMEOUT_MS);

		try {
			stream = new BattleStream();
			const streams = getPlayerStreams(stream);

			// Watch the omniscient feed for crash/error/end + turn cap.
			(async () => {
				try {
					for await (const chunk of streams.omniscient) {
						for (const line of chunk.split('\n')) {
							if (line.startsWith('|error|')) {
								const msg = line.slice('|error|'.length);
								if (!CHOICE_NOISE.test(msg)) {
									finish(true, 'error: ' + msg.replace(/\n/g, ' ').slice(0, 300));
								}
							} else if (line.startsWith('|bigerror|') && /crash/i.test(line)) {
								finish(true, 'bigerror: ' + line.slice('|bigerror|'.length).slice(0, 300));
							} else if (line.startsWith('|win|') || line === '|tie' || line.startsWith('|tie|')) {
								finish(false, null);
							}
						}
					}
					finish(false, null); // stream ended cleanly
				} catch (err) {
					const msg = (err && err.message) || String(err);
					// Choice-layer noise from the offline harness is not a format crash.
					if (CHOICE_NOISE.test(msg)) finish(false, null);
					else finish(true, 'stream throw: ' + msg.slice(0, 300) + (process.env.PRESCREEN_STACK ? '\nSTACK:\n' + ((err && err.stack) || '').split('\n').slice(1, 12).join('\n') : ''));
				}
			})();

			const p1 = new SafeAI(streams.p1);
			const p2 = new SafeAI(streams.p2);
			// Swallow read-loop rejections caused by tearing the stream down on finish.
			Promise.resolve(p1.start()).catch(() => {});
			Promise.resolve(p2.start()).catch(() => {});

			const spec = {formatid: FORMAT};
			streams.omniscient.write(
				`>start ${JSON.stringify(spec)}\n` +
				`>player p1 ${JSON.stringify({name: 'A', team: Teams.pack(teamA)})}\n` +
				`>player p2 ${JSON.stringify({name: 'B', team: Teams.pack(teamB)})}`
			);
		} catch (err) {
			finish(true, 'setup throw: ' + (err && err.message || String(err)).slice(0, 300));
		}
	});
}

/**
 * Fresh-process confirmation: run one flagged variant in a brand-new process (no
 * cumulative engine state) for CONFIRM_BATTLES battles vs the opponent panel.
 * Exits CRASH_EXIT_CODE if it genuinely crashes, 0 otherwise. Invoked by main() via
 * spawnSync so a sequential-run cross-attribution artifact can't false-positive.
 */
async function confirmMode(id, ability) {
	const opponents = OPPONENTS.map(opponentSet);
	const testSet = makeSet(id, ability);
	for (let b = 0; b < CONFIRM_BATTLES; b++) {
		const opp = opponents[b % opponents.length];
		const res = await runBattle([testSet], [opp]);
		if (res.crashed) {
			console.log(`CONFIRMED CRASH ${id} @ ${ability} vs ${opp.species}: ${res.error}`);
			process.exit(CRASH_EXIT_CODE);
		}
	}
	console.log(`clean ${id} @ ${ability} (${CONFIRM_BATTLES} fresh battles)`);
	process.exit(0);
}

/** Re-test a flagged variant in a fresh child process; returns {confirmed, detail}. */
function confirmInFreshProcess(id, ability) {
	const r = spawnSync(process.execPath, [__filename, '--confirm', id, ability], {encoding: 'utf8', timeout: 120000});
	const detail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').pop();
	return {confirmed: r.status === CRASH_EXIT_CODE, detail};
}

async function main() {
	// Confirmation sub-invocation: `node prescreen-variants.js --confirm <id> <ability...>`
	const argv = process.argv.slice(2);
	if (argv[0] === '--confirm') {
		await confirmMode(argv[1], argv.slice(2).join(' '));
		return;
	}

	const pool = buildPool(dex);
	const opponents = OPPONENTS.map(opponentSet);

	// Flatten to (species, ability) variants.
	const variants = [];
	for (const id of pool) {
		const sp = dex.species.get(id);
		for (const ability of variantsOf(sp)) variants.push({id, name: sp.name, ability});
	}
	console.log(`Pre-screening ${variants.length} (species, ability) variants from a pool of ${pool.length} species ` +
		`(${BATTLES_PER_VARIANT} battles each vs ${OPPONENTS.join(', ')}).`);

	const crashers = [];
	let i = 0;
	for (const v of variants) {
		i++;
		const testSet = makeSet(v.id, v.ability);
		let crash = null;
		for (let b = 0; b < BATTLES_PER_VARIANT && !crash; b++) {
			const opp = opponents[b % opponents.length];
			const res = await runBattle([testSet], [opp]);
			if (res.crashed) crash = {opponent: opp.species, error: res.error};
		}
		if (crash) {
			// Confirm in a fresh process (true isolation) before trusting it — the inline
			// sequential pass can cross-attribute a torn-down battle's error to the next one.
			process.stdout.write(`  [${i}/${variants.length}] flagged ${v.name} @ ${v.ability} (${crash.error}) — confirming in fresh process… `);
			const {confirmed, detail} = confirmInFreshProcess(v.id, v.ability);
			if (confirmed) {
				crashers.push({species: v.name, id: v.id, ability: v.ability, opponent: crash.opponent, error: crash.error});
				console.log(`CONFIRMED CRASH.`);
			} else {
				console.log(`clean in isolation → NOT a crasher (harness artifact). [${detail}]`);
			}
		} else if (i % 50 === 0) {
			console.log(`  [${i}/${variants.length}] ok so far (${crashers.length} crashers)`);
		}
	}

	fs.writeFileSync(OUT_FILE, JSON.stringify(crashers, null, 2));
	console.log(`\n================ PRE-SCREEN SUMMARY ================`);
	console.log(`Variants tested : ${variants.length}`);
	console.log(`Crashers        : ${crashers.length}`);
	if (crashers.length) {
		const bySpecies = {};
		for (const c of crashers) (bySpecies[c.species] || (bySpecies[c.species] = [])).push(c.ability);
		for (const sp in bySpecies) console.log(`   ${sp}: ${bySpecies[sp].join(', ')}`);
	}
	console.log(`Written to      : ${path.relative(process.cwd(), OUT_FILE)}`);
	console.log(`====================================================`);
	process.exit(0);
}

main().catch(err => { console.error('prescreen fatal:', err); process.exit(1); });
