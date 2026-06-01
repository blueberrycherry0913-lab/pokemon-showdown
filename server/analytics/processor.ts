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
	d: number;            // actual damage
	b: number;            // neutral baseline
	tm: number;           // typeMod
	src: string | null;   // source move/status/hazard name
	lethal: boolean;
}

interface HealEvent {
	t: number;
	tp: string;
	tpl: string;
	amt: number;
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

interface GameBuffer {
	gameId: string;
	dmg: DmgEvent[];
	heal: HealEvent[];
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
	const json = parts.slice(3).join('|');

	switch (type) {
	case 'dmg': {
		let ev: DmgEvent;
		try { ev = JSON.parse(json); } catch { return; }
		let buf = buffers.get(roomId);
		if (!buf) {
			buf = {gameId: roomId, dmg: [], heal: [], playerMap: {}};
			buffers.set(roomId, buf);
		}
		buf.dmg.push(ev);
		break;
	}
	case 'heal': {
		let ev: HealEvent;
		try { ev = JSON.parse(json); } catch { return; }
		const buf = buffers.get(roomId);
		if (buf) buf.heal.push(ev);
		break;
	}
	case 'end': {
		let payload: EndPayload;
		try { payload = JSON.parse(json); } catch { return; }
		const buf = buffers.get(roomId) || {gameId: roomId, dmg: [], heal: [], playerMap: {}};
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
				ev.d, ev.b,
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

			// Damage dealt
			let dealtTotal = 0, dealtDirect = 0, dealtResidual = 0, dealtHazard = 0;
			// Damage taken
			let takenTotal = 0, takenDirect = 0, takenResidual = 0, takenHazard = 0;
			// Type modifiers on taken damage
			let reducedTyping = 0, amplifiedTyping = 0, reducedModifiers = 0;
			let kills = 0, deaths = 0;

			for (const ev of buf.dmg) {
				const isInflictor = ev.ip === pk.sp && ev.ipl === pk.pl;
				const isTarget = ev.tp === pk.sp && ev.tpl === pk.pl;

				if (isInflictor) {
					dealtTotal += ev.d;
					if (ev.type === 'direct') dealtDirect += ev.d;
					else if (ev.type === 'residual') dealtResidual += ev.d;
					else if (ev.type === 'hazard') dealtHazard += ev.d;
					if (ev.lethal) kills++;
				}
				if (isTarget) {
					takenTotal += ev.d;
					if (ev.type === 'direct') takenDirect += ev.d;
					else if (ev.type === 'residual') takenResidual += ev.d;
					else if (ev.type === 'hazard') takenHazard += ev.d;
					if (ev.lethal) deaths++;

					// Typing reduction columns — only meaningful for direct damage with typeMod
					if (ev.type === 'direct' && ev.b > 0) {
						// expectedAfterType = baseline * 2^typeMod
						const typeMultiplier = Math.pow(2, ev.tm);
						const expectedAfterType = Math.round(ev.b * typeMultiplier);
						if (ev.tm < 0) {
							// type reduced damage
							reducedTyping += Math.max(0, ev.b - expectedAfterType);
						}
						if (ev.tm > 0) {
							// type amplified damage
							amplifiedTyping += Math.max(0, expectedAfterType - ev.b);
						}
						// modifier reduction = expected (after type) minus actual
						if (ev.d < expectedAfterType) {
							reducedModifiers += Math.max(0, expectedAfterType - ev.d);
						}
					}
				}
			}

			// Healing received
			let healingReceived = 0;
			for (const ev of buf.heal) {
				if (ev.tp === pk.sp && ev.tpl === pk.pl) healingReceived += ev.amt;
			}

			// Assists (§2.4): within 3 turns before each lethal, count non-killer inflictors
			const assists = computeAssists(buf.dmg, pk.sp, pk.pl);

			insertPokemonGameStats(
				db,
				buf.gameId, playerId, pk.sp,
				true, pk.lead, outcome,
				dealtTotal, dealtDirect, dealtResidual, dealtHazard,
				takenTotal, takenDirect, takenResidual, takenHazard,
				reducedTyping, amplifiedTyping, reducedModifiers,
				healingReceived, kills, deaths, assists, pk.activeTurns
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
// Assist derivation (§2.4)
// ---------------------------------------------------------------------------

function computeAssists(dmg: DmgEvent[], species: string, playerSlot: string): number {
	let assists = 0;
	for (const lethal of dmg) {
		if (!lethal.lethal) continue;
		const lethalTurn = lethal.t;
		// Find all inflictors who damaged this target in the 3 turns prior (inclusive)
		const assisters = new Set<string>();
		for (const ev of dmg) {
			if (ev.tp !== lethal.tp || ev.tpl !== lethal.tpl) continue;
			if (ev.t < lethalTurn - 3 || ev.t > lethalTurn) continue;
			if (ev.d <= 0) continue;
			if (ev.ip === lethal.ip && ev.ipl === lethal.ipl) continue; // skip killer
			if (ev.ip && ev.ipl) assisters.add(`${ev.ipl}:${ev.ip}`);
		}
		if (assisters.has(`${playerSlot}:${species}`)) assists++;
	}
	return assists;
}
