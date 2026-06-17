'use strict';

/**
 * Bot-account detection for analytics separation.
 *
 * Battles where ANY participant is a recognized bot are recorded to the SEPARATE
 * bot analytics DB (battle_analytics_bots_v2.db) and bot report files, so they
 * never pollute the real player leaderboards. This guarantees the player DB only
 * ever contains human-vs-human games.
 *
 * Add bot account ids below (lowercase, no spaces/punctuation — i.e. toID form),
 * then rebuild, OR set `exports.analyticsbotids = ['botalpha', ...]` in
 * config/config.js to extend the list without editing source.
 */

declare const Config: any;

export const BOT_IDS = new Set<string>(['botalpha', 'botbravo', 'testerbotruby', 'testerbotsapphire']);

function isBotId(id: string): boolean {
	const lc = (id || '').toLowerCase();
	if (BOT_IDS.has(lc)) return true;
	if (typeof Config !== 'undefined' && Array.isArray(Config.analyticsbotids)) {
		return Config.analyticsbotids.some((x: string) => ('' + x).toLowerCase() === lc);
	}
	return false;
}

export function isBotGame(playerMap?: {[slot: string]: {id: string; name: string}}): boolean {
	if (!playerMap) return false;
	for (const slot in playerMap) {
		const p = playerMap[slot];
		if (p && isBotId(p.id)) return true;
	}
	return false;
}
