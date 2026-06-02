'use strict';

/**
 * Analytics Processor — receives |analytic| protocol lines from the battle
 * stream (intercepted in room-battle.ts before they reach clients), buffers
 * them per game, and flushes to SQLite + generates reports when the battle ends.
 *
 * Protocol lines (emitted from sim/battle.ts):
 *   |analytic|dmg|{JSON}    — one damage event
 *   |analytic|heal|{JSON}   — one healing event
 *   |analytic|end|{JSON}    — battle over; includes team/outcome summary
 */

import * as path from 'path';
import * as fs from 'fs';
import {getDB, insertGame, upsertPlayer, insertDamageEvent, insertPokemonGameStats} from './db';
import {generateReports} from './report';

// ---------------------------------------------------------------------------
// In-memory buffer per active game
// ---------------------------------------------------------------------------

interface DmgEvent {
	t: number;            // turn
	type: 'direct' | 'residual' | 'hazard';
	ip: string | null;    // inflictor species
	ipl: string | null;   // inflictor player slot (p1/p2)
	tp: string;           // target species
	tpl: string;          // target player slot
	d: number;            // actual damage (HP removed, clamped)
	c: number;            // calculated damage (pre-clamp, for True/overkill)
	mhp: number;          // target's max HP (for % normalization)
	b: number;            // neutral baseline
	tm: number;           // typeMod
	fstage?: number;      // base-damage factor from favorable stat stages (≤1)
	fscreen?: number;     // screen reduction multiplier (≤1)
	ssp?: string | null;  // screen setter species (avoidance credited here)
	sspl?: string | null; // screen setter player slot
	src: string | null;   // source move/status/hazard name
	lethal: boolean;
}

interface HealEvent {
	t: number;
	tp: string;           // causer species (attributed)
	tpl: string;          // causer player slot
	recip: string;        // recipient species
	recipl: string;       // recipient player slot
	amt: number;          // actual HP restored (clamped)
	calc: number;         // calculated heal (pre-clamp, for True)
	mhp: number;          // recipient's max HP (for % normalization)
}

interface PokeEnd {
	pl: string;        // player slot
	sp: string;        // species
	fainted: boolean;
	lead: boolean;     // was the team lead
	activeTurns: number;
}

interface EndPayload {
	format: string;
	winner: string | null;   // 'p1' | 'p2' | null (draw)
	turns: number;
	players: Array<{id: string; name: string}>;
	pokes: PokeEnd[];
}

interface SubAvoidEvent {
	t: number;
	tp: string;           // substitute owner species (credited the avoidance)
	tpl: string;          // owner player slot
	av: number;           // would-be damage the sub absorbed
	mhp: number;          // owner max HP
}

interface ImmuneEvent {
	t: number;
	tp: string;   // species that was immune
	tpl: string;  // player slot
}

// Inflictor-attributed count events (assist / status / hazard set / hazard clear).
interface CreditEvent { ip: string; ipl: string }

interface GameBuffer {
	gameId: string;
	dmg: DmgEvent[];
	heal: HealEvent[];
	sub: SubAvoidEvent[];
	immune: ImmuneEvent[];
	assist: CreditEvent[];
	status: CreditEvent[];
	hazardset: CreditEvent[];
	hazardclear: CreditEvent[];
	// player slot → {userId, username}
	playerMap: {[slot: string]: {id: string; name: string}};
}

const buffers = new Map<string, GameBuffer>();

// ---------------------------------------------------------------------------
// Public API — called from room-battle.ts receive()
// ---------------------------------------------------------------------------

/**
 * Process a single |analytic|TYPE|JSON line.
 * @param roomId  the battle room's id (used as game_id)
 * @param line    the raw protocol line, e.g. "|analytic|dmg|{...}"
 * @param playerMap  slot→{id,name} known by the room (passed on end; ignored on dmg/heal)
 */
export function process(
	roomId: string,
	line: string,
	playerMap?: {[slot: string]: {id: string; name: string}}
): void {
	const db = getDB();
	if (!db) return; // better-sqlite3 not installed

	// |analytic|TYPE|JSON
	const parts = line.split('|');
	// parts: ['', 'analytic', TYPE, JSON...]
	const type = parts[2];
	// The §7 speed-tie log reordering can append protocol tags (e.g. "|[simult]")
	// to the line. Our payload is always a JSON object, so cut at its closing brace.
	let json = parts.slice(3).join('|');
	const braceEnd = json.lastIndexOf('}');
	if (braceEnd >= 0) json = json.slice(0, braceEnd + 1);

	// Get the per-game buffer, creating it on demand. Any event type may be the
	// first one seen in a game (e.g. an immune hit or heal on turn 1 before any
	// damage), so all of them must be able to create the buffer.
	const getBuf = (): GameBuffer => {
		let buf = buffers.get(roomId);
		if (!buf) {
			buf = {gameId: roomId, dmg: [], heal: [], sub: [], immune: [], assist: [], status: [], hazardset: [], hazardclear: [], playerMap: {}};
			buffers.set(roomId, buf);
		}
		return buf;
	};

	switch (type) {
	case 'dmg': {
		let ev: DmgEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().dmg.push(ev);
		break;
	}
	case 'heal': {
		let ev: HealEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().heal.push(ev);
		break;
	}
	case 'subavoid': {
		let ev: SubAvoidEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().sub.push(ev);
		break;
	}
	case 'immune': {
		let ev: ImmuneEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().immune.push(ev);
		break;
	}
	case 'assist': case 'status': case 'hazardset': case 'hazardclear': {
		let ev: CreditEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf()[type].push(ev);
		break;
	}
	case 'end': {
		let payload: EndPayload;
		try { payload = JSON.parse(json); } catch { return; }
		const buf = getBuf();
		if (playerMap) buf.playerMap = playerMap;
		buffers.delete(roomId);
		flushGame(db, buf, payload);
		break;
	}
	}
}

// ---------------------------------------------------------------------------
// End-of-game flush
// ---------------------------------------------------------------------------

function flushGame(
	db: import('better-sqlite3').Database,
	buf: GameBuffer,
	end: EndPayload
): void {
	const timestamp = new Date().toISOString();
	const pA = end.players[0];
	const pB = end.players[1];
	if (!pA || !pB) return;

	// Resolve actual user IDs from the playerMap (set from room context).
	// Fall back to the slot name if not available.
	const idA = buf.playerMap[pA.id]?.id || pA.id;
	const idB = buf.playerMap[pB.id]?.id || pB.id;
	const nameA = buf.playerMap[pA.id]?.name || pA.name;
	const nameB = buf.playerMap[pB.id]?.name || pB.name;
	const winnerId = end.winner === pA.id ? idA : end.winner === pB.id ? idB : null;

	// Wrap everything in a transaction for atomicity
	db.transaction(() => {
		// 1. game_record
		insertGame(db, buf.gameId, timestamp, end.format, idA, idB, winnerId, end.turns);

		// 2. player_record upserts
		upsertPlayer(db, idA, nameA, winnerId === idA, winnerId !== null && winnerId !== idA);
		upsertPlayer(db, idB, nameB, winnerId === idB, winnerId !== null && winnerId !== idB);

		// 3. damage_event rows (written via a single statement loop)
		for (const ev of buf.dmg) {
			const inflictorPlayerId = ev.ipl ? (buf.playerMap[ev.ipl]?.id || ev.ipl) : null;
			const targetPlayerId = buf.playerMap[ev.tpl]?.id || ev.tpl;
			insertDamageEvent(
				db,
				buf.gameId, ev.t, ev.type,
				ev.ip, inflictorPlayerId,
				ev.tp, targetPlayerId,
				ev.d, ev.c ?? ev.d, ev.mhp ?? 0, ev.b,
				ev.type === 'direct' ? ev.src : null,
				ev.type === 'residual' ? ev.src : null,
				ev.type === 'hazard' ? ev.src : null,
				null, // status_inflicted — not yet tracked
				ev.lethal
			);
		}

		// 4. pokemon_game_stats — aggregate from damage events + heal events
		const allSpecies = new Set<string>();
		for (const p of end.pokes) allSpecies.add(`${p.pl}:${p.sp}`);

		for (const pk of end.pokes) {
			const playerId = buf.playerMap[pk.pl]?.id || pk.pl;
			const isWinnerSide = pk.pl === end.winner;
			const participated = buf.dmg.some(e =>
				(e.ip === pk.sp && e.ipl === pk.pl) || (e.tp === pk.sp && e.tpl === pk.pl)
			);
			const outcome: 'win' | 'loss' | 'dnp' =
				!participated ? 'dnp' : isWinnerSide ? 'win' : 'loss';

			// All damage/healing accumulated as % of max HP.
			//   Total = actual HP removed / maxHP (capped 100% per hit)
			//   True  = calculated damage / maxHP (uncapped — includes overkill)
			let dealtTotal = 0, dealtDirect = 0, dealtResidual = 0, dealtHazard = 0, dealtTrue = 0;
			let takenTotal = 0, takenDirect = 0, takenResidual = 0, takenHazard = 0, takenTrue = 0;
			let reducedTyping = 0, amplifiedTyping = 0, reducedModifiers = 0;
			// Combined "damage avoided" (% max HP): typing + stat stages + defensive
			// modifiers, plus the screen portion of any hit THIS Pokémon set a screen for.
			let dmgAvoided = 0;
			let kills = 0, deaths = 0;

			for (const ev of buf.dmg) {
				const mhp = ev.mhp || 0;
				if (mhp <= 0) continue; // can't normalize without max HP
				const pctTotal = Math.min((ev.d / mhp) * 100, 100); // actual removed, capped
				const pctTrue = ((ev.c ?? ev.d) / mhp) * 100;        // calculated, uncapped
				const isInflictor = ev.ip === pk.sp && ev.ipl === pk.pl;
				const isTarget = ev.tp === pk.sp && ev.tpl === pk.pl;
				const isScreenSetter = !!ev.ssp && ev.ssp === pk.sp && ev.sspl === pk.pl;

				if (isInflictor) {
					dealtTotal += pctTotal;
					dealtTrue += pctTrue;
					if (ev.type === 'direct') dealtDirect += pctTotal;
					else if (ev.type === 'residual') dealtResidual += pctTotal;
					else if (ev.type === 'hazard') dealtHazard += pctTotal;
					if (ev.lethal) kills++;
				}
				if (isTarget) {
					takenTotal += pctTotal;
					takenTrue += pctTrue;
					if (ev.type === 'direct') takenDirect += pctTotal;
					else if (ev.type === 'residual') takenResidual += pctTotal;
					else if (ev.type === 'hazard') takenHazard += pctTotal;
					if (ev.lethal) deaths++;

					// Typing / modifier reduction, as % of max HP (full-data breakdown).
					if (ev.type === 'direct' && ev.b > 0) {
						const expectedAfterType = ev.b * Math.pow(2, ev.tm); // type applied to neutral
						const calc = ev.c ?? ev.d;
						if (ev.tm < 0) reducedTyping += Math.max(0, (ev.b - expectedAfterType) / mhp * 100);
						if (ev.tm > 0) amplifiedTyping += Math.max(0, (expectedAfterType - ev.b) / mhp * 100);
						if (calc < expectedAfterType) {
							reducedModifiers += Math.max(0, (expectedAfterType - calc) / mhp * 100);
						}
					}
				}

				// Combined avoidance — only direct hits, only when this Pokémon is the
				// target (gets type+stage+other) or the screen setter (gets screen).
				if (ev.type === 'direct' && (isTarget || isScreenSetter)) {
					const a = avoidanceComponents(ev);
					if (isTarget) dmgAvoided += (a.targetHp / mhp) * 100;
					if (isScreenSetter) dmgAvoided += (a.screenHp / mhp) * 100;
				}
			}

			// Healing CAUSED by this Pokémon, as % of recipient max HP.
			let healingReceived = 0, healingTrue = 0;
			for (const ev of buf.heal) {
				if (ev.tp === pk.sp && ev.tpl === pk.pl) {
					const mhp = ev.mhp || 0;
					if (mhp <= 0) continue;
					healingReceived += Math.min((ev.amt / mhp) * 100, 100);
					healingTrue += ((ev.calc ?? ev.amt) / mhp) * 100;
				}
			}

			// Substitute absorption — the sub owner avoided the full would-be hit.
			for (const ev of buf.sub) {
				if (ev.tp === pk.sp && ev.tpl === pk.pl) {
					const mhp = ev.mhp || 0;
					if (mhp <= 0) continue;
					dmgAvoided += Math.min((ev.av / mhp) * 100, 100);
				}
			}

			// Immune hits absorbed (type- or ability-based) by this Pokémon.
			let immuneHits = 0;
			for (const ev of buf.immune) {
				if (ev.tp === pk.sp && ev.tpl === pk.pl) immuneHits++;
			}

			// Assists / status / hazards — counted from inflictor-attributed events
			// emitted live by the sim (assist logic lives in the battle engine now).
			const countCredit = (arr: CreditEvent[]) =>
				arr.reduce((n, e) => n + (e.ip === pk.sp && e.ipl === pk.pl ? 1 : 0), 0);
			const assists = countCredit(buf.assist);
			const statusInflicted = countCredit(buf.status);
			const hazardsSet = countCredit(buf.hazardset);
			const hazardsCleared = countCredit(buf.hazardclear);

			insertPokemonGameStats(
				db,
				buf.gameId, playerId, pk.sp,
				true, pk.lead, outcome,
				dealtTotal, dealtDirect, dealtResidual, dealtHazard, dealtTrue,
				takenTotal, takenDirect, takenResidual, takenHazard, takenTrue,
				reducedTyping, amplifiedTyping, reducedModifiers, dmgAvoided,
				healingReceived, healingTrue, kills, deaths, assists, pk.activeTurns, immuneHits,
				statusInflicted, hazardsSet, hazardsCleared
			);
		}
	})();

	// 5. Regenerate reports (outside transaction, best-effort)
	try {
		generateReports(db);
	} catch (err) {
		console.error('[Analytics] Report generation failed:', err);
	}
}

// ---------------------------------------------------------------------------
// Damage-avoidance decomposition
// ---------------------------------------------------------------------------

/**
 * Decompose a direct hit's avoided damage (in HP) into the portion credited to
 * the defender (typing resist + favorable stat stages + non-screen defensive
 * modifiers) and the portion credited to the screen setter. Uses a multiplicative
 * model so the components compose correctly (no double counting).
 */
function avoidanceComponents(ev: DmgEvent): {targetHp: number; screenHp: number} {
	const c = ev.c ?? ev.d;
	if (c <= 0 || ev.type !== 'direct') return {targetHp: 0, screenHp: 0};

	const fType = ev.tm < 0 ? Math.pow(2, ev.tm) : 1;       // resist factor (≤1)
	let fStage = ev.fstage ?? 1;                            // favorable stat stages (≤1)
	if (!(fStage > 0) || fStage > 1) fStage = 1;
	let fScreen = ev.fscreen ?? 1;                          // screen multiplier (≤1)

	// Net final-chain modifier factor, derived from neutral baseline vs calculated.
	const afterType = (ev.b || 0) * Math.pow(2, ev.tm);
	let modChain = afterType > 0 ? c / afterType : 1;
	if (modChain > 1) modChain = 1;                          // count reductions only
	// If there was effectively no chain reduction, don't credit a screen (it was
	// likely bypassed — crit/infiltrator/etc. — despite being present).
	if (modChain > 0.999) fScreen = 1;
	const fOther = fScreen > 0 ? Math.min(modChain / fScreen, 1) : 1; // non-screen mods

	const denom = fType * fStage * fScreen * fOther;
	if (!(denom > 0)) return {targetHp: 0, screenHp: 0};

	const baseline = c / denom; // what the hit would have done with no defender advantages
	let rem = baseline;
	const typeAv = rem * (1 - fType); rem *= fType;
	const stageAv = rem * (1 - fStage); rem *= fStage;
	const screenAv = rem * (1 - fScreen); rem *= fScreen;
	const otherAv = rem * (1 - fOther);

	return {targetHp: typeAv + stageAv + otherAv, screenHp: screenAv};
}
