'use strict';

/**
 * Analytics scrub helper.
 *
 * A hard sim crash never reaches `flushGame` (the DB is only written on the
 * `end` event — see server/analytics/processor.ts), so crashed games normally
 * leave nothing in the DB. This is a guarantee net: for any game-id we want
 * excluded, delete its rows (and roll back the players' W/L) via the server's
 * own `deleteGame`.
 *
 * Bot games are recorded to the SEPARATE bot DB (battle_analytics_bots_v2.db),
 * so we scrub against the 'bots' scope — never touching the player DB.
 */

let dbModule = null;
try {
	dbModule = require('../../dist/server/analytics/db');
} catch (err) {
	console.warn('[scrub] could not load dist/server/analytics/db (run `node build` first):', err.message);
}

/**
 * Remove a game's analytics rows. Safe to call even if the game was never
 * recorded (returns false). Tolerates a transiently locked DB.
 * @param {string} gameId  the battle room id, e.g. "battle-gen9testingstandard-12"
 * @returns {boolean} whether a row was actually deleted
 */
function scrubGame(gameId) {
	if (!dbModule || !dbModule.getDB || !dbModule.deleteGame) return false;
	let db;
	try {
		db = dbModule.getDB('bots'); // bot games live in the separate bot DB
	} catch (err) {
		console.warn(`[scrub] getDB failed for ${gameId}:`, err.message);
		return false;
	}
	if (!db) return false; // better-sqlite3 not installed
	try {
		db.pragma('busy_timeout = 5000'); // wait on the server's WAL writer instead of erroring
	} catch { /* ignore */ }
	try {
		return dbModule.deleteGame(db, gameId);
	} catch (err) {
		console.warn(`[scrub] deleteGame failed for ${gameId} (DB locked by server?):`, err.message);
		return false;
	}
}

module.exports = {scrubGame};
