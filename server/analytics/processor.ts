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
	tpow?: number;        // Threat Power of the move (for Threat Absorbed)
	ssp?: string | null;  // screen setter species (Threat Absorbed split)
	sspl?: string | null; // screen setter player slot
	src: string | null;   // source move/status/hazard name
	lethal: boolean;
	self?: boolean;       // recoil/Life Orb/self HP loss — excluded from residual dealt
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
	sp: string;        // species (final forme — Mega if it evolved, since Mega is permanent)
	base?: string;     // baseSpecies; pre-mega events (tagged with base name) credit this entry
	fainted: boolean;
	lead: boolean;     // was the team lead
	activeTurns: number;
	item?: string;     // item brought (set.item display name), '' if none
	itemMega?: boolean; // true if a Mega Stone / Z-Crystal (excluded from item leaderboard)
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
	tp: string;           // substitute owner species (credited)
	tpl: string;          // owner player slot
	av: number;           // would-be damage the sub absorbed
	mhp: number;          // owner max HP
	tpow?: number;        // Threat Power of the intercepted move
}

interface NullifiedEvent {
	tp: string;           // species the move did nothing to
	tpl: string;          // player slot
	kind: 'immune' | 'miss';
}

// A damaging move was USED (offense numerator + moves-used denominator).
interface ThreatUsedEvent { ip: string; ipl: string; tpow: number }

// Inflictor-attributed count events (assist / status / hazard set / hazard clear).
interface CreditEvent { ip: string; ipl: string }

interface GameBuffer {
	gameId: string;
	dmg: DmgEvent[];
	heal: HealEvent[];
	sub: SubAvoidEvent[];
	nullified: NullifiedEvent[];
	threatused: ThreatUsedEvent[];
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
			buf = {
				gameId: roomId, dmg: [], heal: [], sub: [], nullified: [], threatused: [],
				assist: [], status: [], hazardset: [], hazardclear: [], playerMap: {},
			};
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
	case 'nullified': {
		let ev: NullifiedEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().nullified.push(ev);
		break;
	}
	case 'threatused': {
		let ev: ThreatUsedEvent;
		try { ev = JSON.parse(json); } catch { return; }
		getBuf().threatused.push(ev);
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

	// Discard very short games (forfeit/disconnect before meaningful play begins).
	const MIN_TURNS_TO_RECORD = 5;
	if (end.turns < MIN_TURNS_TO_RECORD) return;

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
				ev.d, ev.c ?? ev.d, ev.mhp ?? 0, 0,
				ev.type === 'direct' ? ev.src : null,
				ev.type === 'residual' ? ev.src : null,
				ev.type === 'hazard' ? ev.src : null,
				null, // status_inflicted — not yet tracked
				ev.lethal, ev.tpow ?? 0
			);
		}

		// 4. pokemon_game_stats — aggregate the Threat Stats system per Pokémon.
		for (const pk of end.pokes) {
			const playerId = buf.playerMap[pk.pl]?.id || pk.pl;
			const isWinnerSide = pk.pl === end.winner;
			// Base-aware species match (permanent-Mega folding; base === sp for non-megas).
			const baseName = pk.base || pk.sp;
			const mon = (sp: string | null | undefined) => sp === pk.sp || sp === baseName;
			// Participated = was actually sent out (active ≥ 1 turn).
			const participated = (pk.activeTurns || 0) > 0;
			const outcome: 'win' | 'loss' | 'dnp' =
				!participated ? 'dnp' : isWinnerSide ? 'win' : 'loss';

			// Offense realized damage (direct moves only): % Max HP Dealt (capped) and
			// True Damage Dealt (uncapped). Residual/hazard dealt kept separately.
			let dealtDirect = 0, dealtDirectTrue = 0, dealtResidual = 0, dealtHazard = 0;
			// Defense: Threat Absorbed (raw Threat Power soaked) + hits faced denominator.
			let threatAbsorbed = 0, hitsFaced = 0;
			let kills = 0, deaths = 0;

			for (const ev of buf.dmg) {
				const mhp = ev.mhp || 0;
				const isInflictor = mon(ev.ip) && ev.ipl === pk.pl;
				const isTarget = mon(ev.tp) && ev.tpl === pk.pl;

				if (isInflictor) {
					if (mhp > 0) {
						const pctTotal = Math.min((ev.d / mhp) * 100, 100);
						const pctTrue = ((ev.c ?? ev.d) / mhp) * 100;
						if (ev.type === 'direct') { dealtDirect += pctTotal; dealtDirectTrue += pctTrue; }
						else if (ev.type === 'residual' && !ev.self) dealtResidual += pctTotal;
						else if (ev.type === 'hazard') dealtHazard += pctTotal;
					}
					if (ev.lethal) kills++;
				}
				if (isTarget) {
					if (ev.lethal) deaths++;
					// Threat Absorbed only counts DIRECT move hits that connect.
					if (ev.type === 'direct') {
						hitsFaced++;
						if (!ev.lethal) {
							const tpow = ev.tpow || 0;
							const ownScreen = !!ev.ssp && ev.ssp === ev.tp && ev.sspl === ev.tpl;
							const allyScreen = !!ev.ssp && !ownScreen;
							threatAbsorbed += allyScreen ? tpow * 0.5 : tpow; // own/no screen → full
						}
					}
				}
				// Ally screen setter gets the other half (only when setter ≠ target).
				if (ev.type === 'direct' && !ev.lethal && !!ev.ssp &&
					mon(ev.ssp) && ev.sspl === pk.pl && !(ev.ssp === ev.tp && ev.sspl === ev.tpl)) {
					threatAbsorbed += (ev.tpow || 0) * 0.5;
				}
			}

			// Substitute intercepts → full Threat Power to the sub owner, no survival gate.
			for (const ev of buf.sub) {
				if (mon(ev.tp) && ev.tpl === pk.pl) {
					threatAbsorbed += ev.tpow || 0;
					hitsFaced++;
				}
			}

			// Threat Output (Σ Threat Power) + moves-used denominator.
			let threatOutputRaw = 0, movesUsed = 0;
			for (const ev of buf.threatused) {
				if (mon(ev.ip) && ev.ipl === pk.pl) { threatOutputRaw += ev.tpow || 0; movesUsed++; }
			}

			// Threats Nullified — damaging moves (immune/miss) that did nothing to it.
			let threatsNullified = 0;
			for (const ev of buf.nullified) {
				if (mon(ev.tp) && ev.tpl === pk.pl) threatsNullified++;
			}

			// Healing CAUSED by this Pokémon, as % of recipient max HP.
			let healingReceived = 0, healingTrue = 0;
			for (const ev of buf.heal) {
				if (mon(ev.tp) && ev.tpl === pk.pl) {
					const mhp = ev.mhp || 0;
					if (mhp <= 0) continue;
					healingReceived += Math.min((ev.amt / mhp) * 100, 100);
					healingTrue += ((ev.calc ?? ev.amt) / mhp) * 100;
				}
			}

			const countCredit = (arr: CreditEvent[]) =>
				arr.reduce((n, e) => n + (mon(e.ip) && e.ipl === pk.pl ? 1 : 0), 0);

			insertPokemonGameStats(db, buf.gameId, playerId, pk.sp, true, pk.lead, outcome, {
				dmg_dealt_direct: dealtDirect,
				dmg_dealt_true: dealtDirectTrue,
				dmg_dealt_residual: dealtResidual,
				dmg_dealt_hazard: dealtHazard,
				threat_output_raw: threatOutputRaw,
				moves_used: movesUsed,
				threat_absorbed_raw: threatAbsorbed,
				hits_faced: hitsFaced,
				threats_nullified: threatsNullified,
				healing_received: healingReceived,
				healing_true: healingTrue,
				kills, deaths,
				assists: countCredit(buf.assist),
				turns_survived: pk.activeTurns || 0,
				status_inflicted: countCredit(buf.status),
				hazards_set: countCredit(buf.hazardset),
				hazards_cleared: countCredit(buf.hazardclear),
				item: pk.item || '',
				item_is_mega: pk.itemMega ? 1 : 0,
			});
		}
	})();

	// 5. Regenerate reports (outside transaction, best-effort)
	try {
		generateReports(db);
	} catch (err) {
		console.error('[Analytics] Report generation failed:', err);
	}
}

