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
const MIN_GAMES_FOR_LEADERBOARD = 1; // TODO: restore to 3 once testing is done

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function generateReports(db: Database.Database): void {
	const {gamesTotal, avgTurns} = getGlobalStats(db);
	const players = getPlayers(db);
	const pokemon = getPokemon(db);

	const generatedAt = new Date().toISOString();

	// --- Full report ---
	const full = {
		generated_at: generatedAt,
		games_total: gamesTotal,
		avg_turns_per_game: avgTurns,
		players,
		pokemon,
	};
	writeAtomic(FULL_PATH, full);

	// --- Summary report (slice from full data — no re-query) ---
	const leaderboards: {[stat: string]: {top_10: object[]; bottom_10: object[]}} = {};

	const statKeys: Array<[string, (p: PokemonRow) => number]> = [
		['win_rate_when_brought', p => p.win_rate_when_brought],
		['games_brought', p => p.games_brought],
		['dmg_dealt_per_game', p => p.dmg_dealt_per_game],
		['dmg_dealt_true_per_game', p => p.dmg_dealt_true_per_game],
		['dmg_dealt_direct_per_game', p => p.dmg_dealt_direct_per_game],
		['dmg_dealt_residual_per_game', p => p.dmg_dealt_residual_per_game],
		['dmg_dealt_hazard_per_game', p => p.dmg_dealt_hazard_per_game],
		['dmg_taken_per_game', p => p.dmg_taken_per_game],
		['dmg_taken_true_per_game', p => p.dmg_taken_true_per_game],
		['dmg_reduced_typing_per_game', p => p.dmg_reduced_typing_per_game],
		['dmg_amplified_typing_per_game', p => p.dmg_amplified_typing_per_game],
		['dmg_reduced_modifiers_per_game', p => p.dmg_reduced_modifiers_per_game],
		['dmg_avoided_per_game', p => p.dmg_avoided_per_game],
		['healing_per_game', p => p.healing_per_game],
		['avg_turns_survived', p => p.avg_turns_survived],
		['kda_ratio', p => p.kda_ratio],
	];

	const eligible = pokemon.filter(p => p.games_brought >= MIN_GAMES_FOR_LEADERBOARD);

	for (const [statKey, accessor] of statKeys) {
		const sorted = [...eligible].sort((a, b) => accessor(b) - accessor(a));
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
	games_brought: number;
	games_as_lead: number;
	win_rate_when_brought: number;
	win_rate_as_lead: number;
	avg_turns_survived: number;
	dmg_dealt_total: number;
	dmg_dealt_direct_total: number;
	dmg_dealt_residual_total: number;
	dmg_dealt_hazard_total: number;
	dmg_dealt_per_game: number;
	dmg_dealt_direct_per_game: number;
	dmg_dealt_residual_per_game: number;
	dmg_dealt_hazard_per_game: number;
	dmg_dealt_true_total: number;
	dmg_dealt_true_per_game: number;
	dmg_taken_total: number;
	dmg_taken_direct_total: number;
	dmg_taken_residual_total: number;
	dmg_taken_hazard_total: number;
	dmg_taken_per_game: number;
	dmg_taken_direct_per_game: number;
	dmg_taken_residual_per_game: number;
	dmg_taken_hazard_per_game: number;
	dmg_taken_true_total: number;
	dmg_taken_true_per_game: number;
	dmg_reduced_typing_total: number;
	dmg_reduced_typing_per_game: number;
	dmg_amplified_typing_total: number;
	dmg_amplified_typing_per_game: number;
	dmg_reduced_modifiers_total: number;
	dmg_reduced_modifiers_per_game: number;
	dmg_avoided_total: number;
	dmg_avoided_per_game: number;
	healing_total: number;
	healing_per_game: number;
	healing_true_total: number;
	healing_true_per_game: number;
	kills_total: number;
	kills_per_game: number;
	deaths_total: number;
	deaths_per_game: number;
	assists_total: number;
	assists_per_game: number;
	kda_ratio: number;
}

function getPokemon(db: Database.Database): PokemonRow[] {
	// Aggregate per species across all non-excluded players.
	// "per game" = divided by games where brought=1 for that species.
	const rows = db.prepare(`
		SELECT
			pgs.pokemon_species                           AS species,
			COUNT(*)                                      AS games_brought,
			SUM(pgs.was_lead)                             AS games_as_lead,
			SUM(CASE WHEN pgs.outcome = 'win' THEN 1 ELSE 0 END)  AS wins_brought,
			SUM(CASE WHEN pgs.was_lead = 1 AND pgs.outcome = 'win' THEN 1 ELSE 0 END) AS wins_lead,
			SUM(CASE WHEN pgs.was_lead = 1 THEN 1 ELSE 0 END)     AS lead_count,
			SUM(pgs.turns_survived)                       AS turns_survived_total,
			SUM(pgs.dmg_dealt_total)                      AS dmg_dealt_total,
			SUM(pgs.dmg_dealt_direct)                     AS dmg_dealt_direct_total,
			SUM(pgs.dmg_dealt_residual)                   AS dmg_dealt_residual_total,
			SUM(pgs.dmg_dealt_hazard)                     AS dmg_dealt_hazard_total,
			SUM(pgs.dmg_dealt_true)                       AS dmg_dealt_true_total,
			SUM(pgs.dmg_taken_total)                      AS dmg_taken_total,
			SUM(pgs.dmg_taken_direct)                     AS dmg_taken_direct_total,
			SUM(pgs.dmg_taken_residual)                   AS dmg_taken_residual_total,
			SUM(pgs.dmg_taken_hazard)                     AS dmg_taken_hazard_total,
			SUM(pgs.dmg_taken_true)                       AS dmg_taken_true_total,
			SUM(pgs.dmg_reduced_typing)                   AS dmg_reduced_typing_total,
			SUM(pgs.dmg_amplified_typing)                 AS dmg_amplified_typing_total,
			SUM(pgs.dmg_reduced_modifiers)                AS dmg_reduced_modifiers_total,
			SUM(pgs.dmg_avoided)                          AS dmg_avoided_total,
			SUM(pgs.healing_received)                     AS healing_total,
			SUM(pgs.healing_true)                         AS healing_true_total,
			SUM(pgs.kills)                                AS kills_total,
			SUM(pgs.deaths)                               AS deaths_total,
			SUM(pgs.assists)                              AS assists_total
		FROM pokemon_game_stats pgs
		JOIN player_record pr ON pgs.player_id = pr.player_id
		WHERE pr.is_excluded = 0 AND pgs.brought = 1
		GROUP BY pgs.pokemon_species
	`).all() as Array<{
		species: string;
		games_brought: number;
		games_as_lead: number;
		wins_brought: number;
		wins_lead: number;
		lead_count: number;
		turns_survived_total: number;
		dmg_dealt_total: number;
		dmg_dealt_direct_total: number;
		dmg_dealt_residual_total: number;
		dmg_dealt_hazard_total: number;
		dmg_dealt_true_total: number;
		dmg_taken_total: number;
		dmg_taken_direct_total: number;
		dmg_taken_residual_total: number;
		dmg_taken_hazard_total: number;
		dmg_taken_true_total: number;
		dmg_reduced_typing_total: number;
		dmg_amplified_typing_total: number;
		dmg_reduced_modifiers_total: number;
		dmg_avoided_total: number;
		healing_total: number;
		healing_true_total: number;
		kills_total: number;
		deaths_total: number;
		assists_total: number;
	}>;

	return rows.map(r => {
		const gb = r.games_brought;
		const pg = (n: number) => gb > 0 ? round2(n / gb) : 0;
		const kda = round2((r.kills_total + r.assists_total) / Math.max(r.deaths_total, 1));
		return {
			species: r.species,
			games_brought: gb,
			games_as_lead: r.games_as_lead,
			win_rate_when_brought: gb > 0 ? round2(r.wins_brought / gb) : 0,
			win_rate_as_lead: r.lead_count > 0 ? round2(r.wins_lead / r.lead_count) : 0,
			avg_turns_survived: pg(r.turns_survived_total),

			dmg_dealt_total: round2(r.dmg_dealt_total),
			dmg_dealt_direct_total: round2(r.dmg_dealt_direct_total),
			dmg_dealt_residual_total: round2(r.dmg_dealt_residual_total),
			dmg_dealt_hazard_total: round2(r.dmg_dealt_hazard_total),
			dmg_dealt_per_game: pg(r.dmg_dealt_total),
			dmg_dealt_direct_per_game: pg(r.dmg_dealt_direct_total),
			dmg_dealt_residual_per_game: pg(r.dmg_dealt_residual_total),
			dmg_dealt_hazard_per_game: pg(r.dmg_dealt_hazard_total),
			dmg_dealt_true_total: round2(r.dmg_dealt_true_total),
			dmg_dealt_true_per_game: pg(r.dmg_dealt_true_total),

			dmg_taken_total: round2(r.dmg_taken_total),
			dmg_taken_direct_total: round2(r.dmg_taken_direct_total),
			dmg_taken_residual_total: round2(r.dmg_taken_residual_total),
			dmg_taken_hazard_total: round2(r.dmg_taken_hazard_total),
			dmg_taken_per_game: pg(r.dmg_taken_total),
			dmg_taken_direct_per_game: pg(r.dmg_taken_direct_total),
			dmg_taken_residual_per_game: pg(r.dmg_taken_residual_total),
			dmg_taken_hazard_per_game: pg(r.dmg_taken_hazard_total),
			dmg_taken_true_total: round2(r.dmg_taken_true_total),
			dmg_taken_true_per_game: pg(r.dmg_taken_true_total),

			dmg_reduced_typing_total: round2(r.dmg_reduced_typing_total),
			dmg_reduced_typing_per_game: pg(r.dmg_reduced_typing_total),
			dmg_amplified_typing_total: round2(r.dmg_amplified_typing_total),
			dmg_amplified_typing_per_game: pg(r.dmg_amplified_typing_total),
			dmg_reduced_modifiers_total: round2(r.dmg_reduced_modifiers_total),
			dmg_reduced_modifiers_per_game: pg(r.dmg_reduced_modifiers_total),
			dmg_avoided_total: round2(r.dmg_avoided_total),
			dmg_avoided_per_game: pg(r.dmg_avoided_total),

			healing_total: round2(r.healing_total),
			healing_per_game: pg(r.healing_total),
			healing_true_total: round2(r.healing_true_total),
			healing_true_per_game: pg(r.healing_true_total),

			kills_total: r.kills_total,
			kills_per_game: pg(r.kills_total),
			deaths_total: r.deaths_total,
			deaths_per_game: pg(r.deaths_total),
			assists_total: r.assists_total,
			assists_per_game: pg(r.assists_total),
			kda_ratio: kda,
		};
	});
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
