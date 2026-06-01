'use strict';

/**
 * Analytics DB — SQLite schema and low-level operations.
 * Uses better-sqlite3 (already an optionalDependency of the server).
 * Returns null from getDB() when the package is not installed.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
let BetterSqlite3: typeof import('better-sqlite3') | null = null;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	BetterSqlite3 = require('better-sqlite3');
} catch {
	// analytics disabled — package absent
}

import * as path from 'path';
import * as fs from 'fs';

import type Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDB(): Database.Database | null {
	if (!BetterSqlite3) return null;
	if (db) return db;

	const dir = path.join(__dirname, '../../../logs/analytics');
	fs.mkdirSync(dir, {recursive: true});

	db = new BetterSqlite3(path.join(dir, 'battle_analytics.db'));
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	initSchema(db);
	return db;
}

function initSchema(database: Database.Database): void {
	database.exec(`
		CREATE TABLE IF NOT EXISTS game_record (
			game_id     TEXT PRIMARY KEY,
			timestamp   DATETIME NOT NULL,
			format      TEXT NOT NULL,
			player_a_id TEXT NOT NULL,
			player_b_id TEXT NOT NULL,
			winner_id   TEXT,
			turns_total INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS player_record (
			player_id    TEXT PRIMARY KEY,
			username     TEXT NOT NULL,
			is_excluded  INTEGER NOT NULL DEFAULT 0,
			games_played INTEGER NOT NULL DEFAULT 0,
			wins         INTEGER NOT NULL DEFAULT 0,
			losses       INTEGER NOT NULL DEFAULT 0
		);

		CREATE TABLE IF NOT EXISTS pokemon_game_stats (
			stat_id               INTEGER PRIMARY KEY AUTOINCREMENT,
			game_id               TEXT NOT NULL,
			player_id             TEXT NOT NULL,
			pokemon_species       TEXT NOT NULL,
			brought               INTEGER NOT NULL DEFAULT 0,
			was_lead              INTEGER NOT NULL DEFAULT 0,
			outcome               TEXT NOT NULL DEFAULT 'dnp'
			                        CHECK (outcome IN ('win','loss','dnp')),
			dmg_dealt_total       INTEGER NOT NULL DEFAULT 0,
			dmg_dealt_direct      INTEGER NOT NULL DEFAULT 0,
			dmg_dealt_residual    INTEGER NOT NULL DEFAULT 0,
			dmg_dealt_hazard      INTEGER NOT NULL DEFAULT 0,
			dmg_taken_total       INTEGER NOT NULL DEFAULT 0,
			dmg_taken_direct      INTEGER NOT NULL DEFAULT 0,
			dmg_taken_residual    INTEGER NOT NULL DEFAULT 0,
			dmg_taken_hazard      INTEGER NOT NULL DEFAULT 0,
			dmg_reduced_typing    INTEGER NOT NULL DEFAULT 0,
			dmg_amplified_typing  INTEGER NOT NULL DEFAULT 0,
			dmg_reduced_modifiers INTEGER NOT NULL DEFAULT 0,
			healing_received      INTEGER NOT NULL DEFAULT 0,
			kills                 INTEGER NOT NULL DEFAULT 0,
			deaths                INTEGER NOT NULL DEFAULT 0,
			assists               INTEGER NOT NULL DEFAULT 0,
			turns_survived        INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (game_id)   REFERENCES game_record(game_id),
			FOREIGN KEY (player_id) REFERENCES player_record(player_id)
		);

		CREATE TABLE IF NOT EXISTS damage_event (
			event_id            INTEGER PRIMARY KEY AUTOINCREMENT,
			game_id             TEXT NOT NULL,
			turn                INTEGER NOT NULL,
			event_type          TEXT NOT NULL CHECK (event_type IN ('direct','residual','hazard')),
			inflictor_pokemon   TEXT,
			inflictor_player    TEXT,
			target_pokemon      TEXT NOT NULL,
			target_player       TEXT NOT NULL,
			damage_amount       INTEGER NOT NULL,
			neutral_baseline_dmg INTEGER NOT NULL DEFAULT 0,
			source_move         TEXT,
			source_status       TEXT,
			source_hazard       TEXT,
			status_inflicted    TEXT,
			is_lethal           INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (game_id) REFERENCES game_record(game_id)
		);

		CREATE INDEX IF NOT EXISTS idx_damage_event_game
			ON damage_event(game_id);
		CREATE INDEX IF NOT EXISTS idx_damage_event_target
			ON damage_event(game_id, target_pokemon, target_player);
		CREATE INDEX IF NOT EXISTS idx_pgs_game
			ON pokemon_game_stats(game_id);
		CREATE INDEX IF NOT EXISTS idx_pgs_player
			ON pokemon_game_stats(player_id);
	`);
}

// ---------------------------------------------------------------------------
// Prepared-statement wrappers (lazily compiled)
// ---------------------------------------------------------------------------

type Stmt<T> = Database.Statement<T[]>;

const stmts: {[key: string]: Stmt<unknown>} = {};

function stmt<T extends unknown[]>(database: Database.Database, key: string, sql: string): Stmt<T> {
	if (!stmts[key]) stmts[key] = database.prepare(sql) as unknown as Stmt<T>;
	return stmts[key] as Stmt<T>;
}

export function insertGame(
	database: Database.Database,
	gameId: string, timestamp: string, format: string,
	playerAId: string, playerBId: string, winnerId: string | null, turnsTotal: number
): void {
	stmt(database, 'ins_game',
		`INSERT OR IGNORE INTO game_record
		 (game_id,timestamp,format,player_a_id,player_b_id,winner_id,turns_total)
		 VALUES (?,?,?,?,?,?,?)`
	).run(gameId, timestamp, format, playerAId, playerBId, winnerId, turnsTotal);
}

export function upsertPlayer(
	database: Database.Database,
	playerId: string, username: string, won: boolean, lost: boolean
): void {
	stmt(database, 'upsert_player',
		`INSERT INTO player_record (player_id,username,games_played,wins,losses)
		 VALUES (?,?,1,?,?)
		 ON CONFLICT(player_id) DO UPDATE SET
		   username     = excluded.username,
		   games_played = games_played + 1,
		   wins         = wins  + excluded.wins,
		   losses       = losses + excluded.losses`
	).run(playerId, username, won ? 1 : 0, lost ? 1 : 0);
}

export function insertDamageEvent(
	database: Database.Database,
	gameId: string, turn: number, eventType: string,
	inflictorPokemon: string | null, inflictorPlayer: string | null,
	targetPokemon: string, targetPlayer: string,
	damageAmount: number, neutralBaseline: number,
	sourceMove: string | null, sourceStatus: string | null, sourceHazard: string | null,
	statusInflicted: string | null, isLethal: boolean
): void {
	stmt(database, 'ins_damage',
		`INSERT INTO damage_event
		 (game_id,turn,event_type,inflictor_pokemon,inflictor_player,
		  target_pokemon,target_player,damage_amount,neutral_baseline_dmg,
		  source_move,source_status,source_hazard,status_inflicted,is_lethal)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
	).run(
		gameId, turn, eventType, inflictorPokemon, inflictorPlayer,
		targetPokemon, targetPlayer, damageAmount, neutralBaseline,
		sourceMove, sourceStatus, sourceHazard, statusInflicted, isLethal ? 1 : 0
	);
}

export function insertPokemonGameStats(
	database: Database.Database,
	gameId: string, playerId: string, species: string,
	brought: boolean, wasLead: boolean, outcome: 'win' | 'loss' | 'dnp',
	dmgDealtTotal: number, dmgDealtDirect: number, dmgDealtResidual: number, dmgDealtHazard: number,
	dmgTakenTotal: number, dmgTakenDirect: number, dmgTakenResidual: number, dmgTakenHazard: number,
	dmgReducedTyping: number, dmgAmplifiedTyping: number, dmgReducedModifiers: number,
	healingReceived: number, kills: number, deaths: number, assists: number, turnsSurvived: number
): void {
	database.prepare(
		`INSERT INTO pokemon_game_stats
		 (game_id,player_id,pokemon_species,brought,was_lead,outcome,
		  dmg_dealt_total,dmg_dealt_direct,dmg_dealt_residual,dmg_dealt_hazard,
		  dmg_taken_total,dmg_taken_direct,dmg_taken_residual,dmg_taken_hazard,
		  dmg_reduced_typing,dmg_amplified_typing,dmg_reduced_modifiers,
		  healing_received,kills,deaths,assists,turns_survived)
		 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
	).run(
		gameId, playerId, species,
		brought ? 1 : 0, wasLead ? 1 : 0, outcome,
		dmgDealtTotal, dmgDealtDirect, dmgDealtResidual, dmgDealtHazard,
		dmgTakenTotal, dmgTakenDirect, dmgTakenResidual, dmgTakenHazard,
		dmgReducedTyping, dmgAmplifiedTyping, dmgReducedModifiers,
		healingReceived, kills, deaths, assists, turnsSurvived
	);
}
