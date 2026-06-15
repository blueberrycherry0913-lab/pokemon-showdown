'use strict';

/**
 * Analytics Report Generator
 *
 * Queries the SQLite DB and writes two JSON files to logs/analytics/:
 *   battle_report_full.json    — §4.1: all players + all Pokémon
 *   battle_report_summary.json — §4.2: top/bottom 10 per stat
 *
 * Files are written atomically (temp→rename).
 */

import * as path from 'path';
import * as fs from 'fs';

import type Database from 'better-sqlite3';

const ANALYTICS_DIR = path.join(__dirname, '../../../logs/analytics');
const FULL_PATH = path.join(ANALYTICS_DIR, 'battle_report_full.json');
const SUMMARY_PATH = path.join(ANALYTICS_DIR, 'battle_report_summary.json');
// Leaderboard sample-size floors. Testing values now; real-play values in comments.
const MIN_GAMES_FOR_LEADERBOARD = 1; // → 3
const MIN_MOVES_USED = 1;            // → 10  (offense per-move stats)
const MIN_HITS_FACED = 1;            // → 10  (Threat Absorbed)
const MIN_MOVES_AIMED = 1;           // → 10  (Threats Nullified rate)
const MIN_ACTIVE_TURNS = 1;          // → 10  (per-active-turn stats)

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function generateReports(db: Database.Database): void {
	const {gamesTotal, avgTurns} = getGlobalStats(db);
	const players = getPlayers(db);
	const pokemon = getPokemon(db);
	const items = getItems(db);

	const generatedAt = new Date().toISOString();

	// --- Full report ---
	const full = {
		generated_at: generatedAt,
		games_total: gamesTotal,
		avg_turns_per_game: avgTurns,
		players,
		pokemon,
		items,
	};
	writeAtomic(FULL_PATH, full);

	// --- Summary report (slice from full data — no re-query) ---
	const leaderboards: {[stat: string]: {top_10: object[]; bottom_10: object[]}} = {};

	// [key, accessor, eligibility] — each stat's floor depends on its denominator.
	const byGames = (p: PokemonRow) => p.games_brought >= MIN_GAMES_FOR_LEADERBOARD;
	const byMoves = (p: PokemonRow) => p.moves_used_total >= MIN_MOVES_USED;
	const byHits = (p: PokemonRow) => p.hits_faced_total >= MIN_HITS_FACED;
	const byAimed = (p: PokemonRow) => (p.hits_faced_total + p.threats_nullified_total) >= MIN_MOVES_AIMED;
	const byTurns = (p: PokemonRow) => p.active_turns_total >= MIN_ACTIVE_TURNS;
	const byPart = (p: PokemonRow) => p.games_participated >= MIN_GAMES_FOR_LEADERBOARD;

	const statKeys: Array<[string, (p: PokemonRow) => number, (p: PokemonRow) => boolean]> = [
		['win_rate_when_brought', p => p.win_rate_when_brought, byGames],
		['games_brought', p => p.games_brought, byGames],
		// offense (÷ moves used)
		['threat_output_per_move', p => p.threat_output_per_move, byMoves],
		['pct_max_hp_dealt_per_move', p => p.pct_max_hp_dealt_per_move, byMoves],
		['true_damage_dealt_per_move', p => p.true_damage_dealt_per_move, byMoves],
		// defense
		['threat_absorbed_per_hit', p => p.threat_absorbed_per_hit, byHits],
		['threats_nullified_rate', p => p.threats_nullified_rate, byAimed],
		// per active turn
		['healing_per_turn', p => p.healing_per_turn, byTurns],
		['kills_per_turn', p => p.kills_per_turn, byTurns],
		['assists_per_turn', p => p.assists_per_turn, byTurns],
		// chip dealt (÷ games)
		['indirect_dealt_per_game', p => p.indirect_dealt_per_game, byGames],
		['hazard_dealt_per_game', p => p.hazard_dealt_per_game, byGames],
		// outcome / presence
		['kda_ratio', p => p.kda_ratio, byPart],
		['avg_turns_survived', p => p.avg_turns_survived, byPart],
		['turns_survived_total', p => p.turns_survived_total, byGames],
		['status_inflicted_total', p => p.status_inflicted_total, byGames],
		['hazards_set_total', p => p.hazards_set_total, byGames],
		['hazards_cleared_total', p => p.hazards_cleared_total, byGames],
		['type_ability_activations_per_game', p => p.type_ability_activations_per_game, byGames],
	];

	for (const [statKey, accessor, eligible] of statKeys) {
		const pool = pokemon.filter(eligible);
		const sorted = [...pool].sort((a, b) => accessor(b) - accessor(a));
		const top10 = sorted.slice(0, 10).map((p, i) => ({
			rank: i + 1, species: p.species, value: accessor(p), games_brought: p.games_brought,
		}));
		const bottom10 = [...sorted].reverse().slice(0, 10).map((p, i) => ({
			rank: i + 1, species: p.species, value: accessor(p), games_brought: p.games_brought,
		}));
		leaderboards[statKey] = {top_10: top10, bottom_10: bottom10};
	}

	const summary = {
		generated_at: generatedAt,
		games_total: gamesTotal,
		avg_turns_per_game: avgTurns,
		leaderboards,
	};
	writeAtomic(SUMMARY_PATH, summary);
}

// ---------------------------------------------------------------------------
// Data queries
// ---------------------------------------------------------------------------

function getGlobalStats(db: Database.Database): {gamesTotal: number; avgTurns: number} {
	const row = db.prepare(
		`SELECT COUNT(*) AS cnt, AVG(turns_total) AS avg_turns FROM game_record`
	).get() as {cnt: number; avg_turns: number | null};
	return {
		gamesTotal: row.cnt,
		avgTurns: row.avg_turns ? round2(row.avg_turns) : 0,
	};
}

function getPlayers(db: Database.Database): object[] {
	const rows = db.prepare(`
		SELECT pr.player_id, pr.username, pr.games_played, pr.wins, pr.losses
		FROM player_record pr
		WHERE pr.is_excluded = 0
	`).all() as Array<{player_id: string; username: string; games_played: number; wins: number; losses: number}>;

	return rows.map(r => {
		const mostBrought = getMostBrought(db, r.player_id);
		return {
			player_id: r.player_id,
			username: r.username,
			games_played: r.games_played,
			wins: r.wins,
			losses: r.losses,
			win_rate: r.games_played > 0 ? round2(r.wins / r.games_played) : 0,
			most_brought_pokemon: mostBrought,
		};
	});
}

function getMostBrought(db: Database.Database, playerId: string): string {
	const row = db.prepare(`
		SELECT pokemon_species, COUNT(*) AS cnt
		FROM pokemon_game_stats
		WHERE player_id = ? AND brought = 1
		GROUP BY pokemon_species
		ORDER BY cnt DESC
		LIMIT 1
	`).get(playerId) as {pokemon_species: string} | undefined;
	return row?.pokemon_species || '';
}

interface PokemonRow {
	species: string;
	// presence / denominators
	games_brought: number;
	games_participated: number;
	games_as_lead: number;
	moves_used_total: number;
	hits_faced_total: number;
	active_turns_total: number;
	turns_survived_total: number;
	// win rates
	win_rate_when_brought: number;
	win_rate_as_lead: number;
	// offense (÷ damaging moves used)
	threat_output_per_move: number;
	pct_max_hp_dealt_per_move: number;
	true_damage_dealt_per_move: number;
	// indirect (non-hazard) damage dealt (÷ games brought)
	indirect_dealt_per_game: number;
	hazard_dealt_per_game: number;
	// defense
	threat_absorbed_per_hit: number;
	threats_nullified_rate: number;
	threats_nullified_total: number;
	// per active turn
	healing_per_turn: number;
	kills_per_turn: number;
	assists_per_turn: number;
	// outcome
	deaths_total: number;
	kda_ratio: number;
	avg_turns_survived: number; // per participated game
	// flat totals
	status_inflicted_total: number;
	hazards_set_total: number;
	hazards_cleared_total: number;
	type_ability_activations_total: number;
	type_ability_activations_per_game: number;
	kills_total: number;
	assists_total: number;
	threat_output_raw_total: number;
	threat_absorbed_raw_total: number;
}

function getPokemon(db: Database.Database): PokemonRow[] {
	const rows = db.prepare(`
		SELECT
			pgs.pokemon_species                                   AS species,
			COUNT(*)                                              AS games_brought,
			SUM(CASE WHEN pgs.outcome != 'dnp' THEN 1 ELSE 0 END) AS games_participated,
			SUM(pgs.was_lead)                                     AS games_as_lead,
			SUM(CASE WHEN pgs.outcome = 'win' THEN 1 ELSE 0 END)  AS wins_brought,
			SUM(CASE WHEN pgs.was_lead = 1 AND pgs.outcome = 'win' THEN 1 ELSE 0 END) AS wins_lead,
			SUM(CASE WHEN pgs.was_lead = 1 THEN 1 ELSE 0 END)     AS lead_count,
			SUM(pgs.turns_survived)                               AS active_turns_total,
			SUM(pgs.moves_used)                                   AS moves_used_total,
			SUM(pgs.hits_faced)                                   AS hits_faced_total,
			SUM(pgs.threat_output_raw)                            AS threat_output_raw_total,
			SUM(pgs.threat_absorbed_raw)                          AS threat_absorbed_raw_total,
			SUM(pgs.threats_nullified)                            AS threats_nullified_total,
			SUM(pgs.dmg_dealt_direct)                             AS pct_max_hp_dealt_total,
			SUM(pgs.dmg_dealt_true)                               AS true_damage_dealt_total,
			SUM(pgs.dmg_dealt_residual)                           AS indirect_dealt_total,
			SUM(pgs.dmg_dealt_hazard)                             AS hazard_dealt_total,
			SUM(pgs.healing_received)                             AS healing_total,
			SUM(pgs.kills)                                        AS kills_total,
			SUM(pgs.deaths)                                       AS deaths_total,
			SUM(pgs.assists)                                      AS assists_total,
			SUM(pgs.status_inflicted)                             AS status_inflicted_total,
			SUM(pgs.hazards_set)                                  AS hazards_set_total,
			SUM(pgs.hazards_cleared)                              AS hazards_cleared_total,
			SUM(pgs.type_ability_activations)                     AS type_ability_activations_total
		FROM pokemon_game_stats pgs
		JOIN player_record pr ON pgs.player_id = pr.player_id
		WHERE pr.is_excluded = 0 AND pgs.brought = 1
		GROUP BY pgs.pokemon_species
	`).all() as Array<{[k: string]: number} & {species: string}>;

	return rows.map(r => {
		const gb = r.games_brought;
		const gp = r.games_participated || 0;
		const mu = r.moves_used_total || 0;
		const hf = r.hits_faced_total || 0;
		const at = r.active_turns_total || 0;
		const movesAimed = hf + (r.threats_nullified_total || 0);
		const perMove = (n: number) => mu > 0 ? round2(n / mu) : 0;
		const perTurn = (n: number) => at > 0 ? round2(n / at) : 0;
		const perGame = (n: number) => gb > 0 ? round2(n / gb) : 0;
		return {
			species: r.species,
			games_brought: gb,
			games_participated: gp,
			games_as_lead: r.games_as_lead,
			moves_used_total: mu,
			hits_faced_total: hf,
			active_turns_total: at,
			turns_survived_total: at,
			win_rate_when_brought: gb > 0 ? round2(r.wins_brought / gb) : 0,
			win_rate_as_lead: r.lead_count > 0 ? round2(r.wins_lead / r.lead_count) : 0,

			threat_output_per_move: Math.round(mu > 0 ? r.threat_output_raw_total / mu : 0),
			pct_max_hp_dealt_per_move: perMove(r.pct_max_hp_dealt_total),
			true_damage_dealt_per_move: perMove(r.true_damage_dealt_total),

			indirect_dealt_per_game: perGame(r.indirect_dealt_total),
			hazard_dealt_per_game: perGame(r.hazard_dealt_total),

			threat_absorbed_per_hit: Math.round(hf > 0 ? r.threat_absorbed_raw_total / hf : 0),
			threats_nullified_rate: movesAimed > 0 ? round2((r.threats_nullified_total || 0) / movesAimed) : 0,
			threats_nullified_total: r.threats_nullified_total || 0,

			healing_per_turn: perTurn(r.healing_total),
			kills_per_turn: perTurn(r.kills_total),
			assists_per_turn: perTurn(r.assists_total),

			deaths_total: r.deaths_total,
			kda_ratio: round2((r.kills_total + r.assists_total) / Math.max(r.deaths_total, 1)),
			avg_turns_survived: gp > 0 ? round2(at / gp) : 0,

			status_inflicted_total: r.status_inflicted_total,
			hazards_set_total: r.hazards_set_total,
			hazards_cleared_total: r.hazards_cleared_total,
			type_ability_activations_total: r.type_ability_activations_total || 0,
			type_ability_activations_per_game: perGame(r.type_ability_activations_total || 0),
			kills_total: r.kills_total,
			assists_total: r.assists_total,
			threat_output_raw_total: Math.round(r.threat_output_raw_total || 0),
			threat_absorbed_raw_total: Math.round(r.threat_absorbed_raw_total || 0),
		};
	});
}

/** Most-brought items, excluding Mega Stones / Z-Crystals (item_is_mega = 1). */
function getItems(db: Database.Database): Array<{item: string; count: number}> {
	const rows = db.prepare(`
		SELECT pgs.item AS item, COUNT(*) AS count
		FROM pokemon_game_stats pgs
		JOIN player_record pr ON pgs.player_id = pr.player_id
		WHERE pr.is_excluded = 0 AND pgs.brought = 1
		      AND pgs.item != '' AND pgs.item_is_mega = 0
		GROUP BY pgs.item
		ORDER BY count DESC, item ASC
	`).all() as Array<{item: string; count: number}>;
	return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
	return Math.round(n * 100) / 100;
}

function writeAtomic(filePath: string, data: object): void {
	const tmp = `${filePath}.tmp`;
	fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
	fs.renameSync(tmp, filePath);
}
