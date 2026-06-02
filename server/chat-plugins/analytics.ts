'use strict';

/**
 * Battle Analytics Page
 * Renders battle_report_full.json + battle_report_summary.json as an
 * in-server HTML dashboard, accessible via /view-analytics or /analytics.
 */

import * as path from 'path';
import * as fs from 'fs';
import {getDB, deleteGame, deleteAllGames} from '../analytics/db';
import {generateReports} from '../analytics/report';

const ANALYTICS_DIR = path.join(__dirname, '../../../logs/analytics');
const FULL_PATH = path.join(ANALYTICS_DIR, 'battle_report_full.json');
const SUMMARY_PATH = path.join(ANALYTICS_DIR, 'battle_report_summary.json');

// ---------------------------------------------------------------------------
// Types (mirror the report generator output)
// ---------------------------------------------------------------------------

interface PlayerRow {
	player_id: string;
	username: string;
	games_played: number;
	wins: number;
	losses: number;
	win_rate: number;
	most_brought_pokemon: string;
}

interface PokemonRow {
	species: string;
	games_brought: number;
	win_rate_when_brought: number;
	avg_turns_survived: number;
	dmg_dealt_per_game: number;
	dmg_dealt_true_per_game: number;
	dmg_dealt_direct_per_game: number;
	dmg_dealt_residual_per_game: number;
	dmg_dealt_hazard_per_game: number;
	dmg_taken_per_game: number;
	dmg_taken_true_per_game: number;
	dmg_reduced_typing_per_game: number;
	dmg_amplified_typing_per_game: number;
	dmg_reduced_modifiers_per_game: number;
	dmg_avoided_per_game: number;
	healing_per_game: number;
	kills_total: number;
	deaths_total: number;
	assists_total: number;
	kills_per_game: number;
	deaths_per_game: number;
	assists_per_game: number;
	kda_ratio: number;
	immune_hits_total: number;
	immune_hits_per_game: number;
	turns_survived_total: number;
	status_inflicted_total: number;
	hazards_set_total: number;
	hazards_cleared_total: number;
}

interface FullReport {
	generated_at: string;
	games_total: number;
	avg_turns_per_game: number;
	players: PlayerRow[];
	pokemon: PokemonRow[];
	items?: Array<{item: string; count: number}>;
}

interface LeaderEntry {
	rank: number;
	species: string;
	value: number;
	games_brought: number;
}

interface SummaryReport {
	generated_at: string;
	games_total: number;
	avg_turns_per_game: number;
	leaderboards: {[stat: string]: {top_10: LeaderEntry[]; bottom_10: LeaderEntry[]}};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadFull(): FullReport | null {
	try {
		return JSON.parse(fs.readFileSync(FULL_PATH, 'utf8')) as FullReport;
	} catch {
		return null;
	}
}

function loadSummary(): SummaryReport | null {
	try {
		return JSON.parse(fs.readFileSync(SUMMARY_PATH, 'utf8')) as SummaryReport;
	} catch {
		return null;
	}
}

function h(str: string | number): string {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function pct(n: number): string {
	return (n * 100).toFixed(1) + '%';
}

function medal(rank: number): string {
	return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
}

// Win-rate to hue: 50% = yellow, 100% = green, 0% = red
function winRateColor(rate: number): string {
	const pctVal = Math.round(rate * 100);
	if (pctVal >= 60) return '#d4edda';
	if (pctVal >= 45) return '#fff3cd';
	return '#f8d7da';
}

// ---------------------------------------------------------------------------
// HTML builders
// ---------------------------------------------------------------------------

function buildHeader(full: FullReport): string {
	const updated = new Date(full.generated_at).toLocaleString();
	return `
	<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:16px">
		<div class="infobox" style="flex:1;min-width:140px;text-align:center">
			<strong style="font-size:1.6em">${h(full.games_total)}</strong><br/>
			<small>Total Games</small>
		</div>
		<div class="infobox" style="flex:1;min-width:140px;text-align:center">
			<strong style="font-size:1.6em">${h(full.avg_turns_per_game)}</strong><br/>
			<small>Avg Turns / Game</small>
		</div>
		<div class="infobox" style="flex:1;min-width:140px;text-align:center">
			<strong style="font-size:1.6em">${h(full.players.length)}</strong><br/>
			<small>Players Tracked</small>
		</div>
		<div class="infobox" style="flex:1;min-width:140px;text-align:center">
			<strong style="font-size:1.6em">${h(full.pokemon.length)}</strong><br/>
			<small>Species Seen</small>
		</div>
	</div>
	<p style="color:#888;font-size:.85em">Last updated: ${h(updated)} &nbsp;
		<button class="button" name="send" value="/join view-analytics">
			<i class="fa fa-refresh"></i> Refresh
		</button>
	</p>`;
}

function buildPlayers(players: PlayerRow[]): string {
	if (!players.length) return '<p><em>No player data yet.</em></p>';
	let buf = `<h3>Players</h3>
	<table class="ladder" style="width:100%;max-width:700px">
		<tr>
			<th>Player</th><th>Games</th><th>W</th><th>L</th>
			<th>Win Rate</th><th>Most Brought</th>
		</tr>`;
	for (const p of players.sort((a, b) => b.win_rate - a.win_rate)) {
		const bg = winRateColor(p.win_rate);
		buf += `
		<tr style="background:${bg}">
			<td><strong>${h(p.username)}</strong></td>
			<td>${h(p.games_played)}</td>
			<td style="color:#27ae60">${h(p.wins)}</td>
			<td style="color:#c0392b">${h(p.losses)}</td>
			<td>${pct(p.win_rate)}</td>
			<td>${h(p.most_brought_pokemon || '—')}</td>
		</tr>`;
	}
	return buf + '</table>';
}

// All damage/healing stats are % of max HP (averaged per game brought).
const pctOf = (v: number) => v.toFixed(1) + '%';
const STAT_LABELS: {[k: string]: {label: string; fmt: (v: number) => string; desc: string}} = {
	win_rate_when_brought: {label: 'Win Rate', fmt: pct, desc: 'Win % when this species is on the team'},
	dmg_dealt_per_game: {label: 'Damage Dealt / Game', fmt: pctOf, desc: 'Avg % of targets’ max HP dealt per game (capped at 100% per hit)'},
	dmg_dealt_true_per_game: {label: 'True Damage Dealt / Game', fmt: pctOf, desc: 'Like Damage Dealt but uncapped — counts overkill / >100% nukes'},
	dmg_taken_per_game: {label: 'Damage Taken / Game', fmt: pctOf, desc: 'Avg % of own max HP lost per game (capped at 100% per hit)'},
	kda_ratio: {label: 'KDA', fmt: v => v.toFixed(2), desc: '(Kills + Assists) / max(Deaths, 1)'},
	healing_per_game: {label: 'Healing Caused / Game', fmt: pctOf, desc: 'Avg % of HP this Pokémon caused to be healed per game (Wish credits the wisher, etc.)'},
	avg_turns_survived: {label: 'Turns Survived', fmt: v => v.toFixed(1), desc: 'Avg turns active on field per game brought'},
	dmg_avoided_per_game: {label: 'Damage Avoided / Game', fmt: pctOf, desc: 'Avg % max HP of damage prevented per game — typing resists, stat stages, abilities/items, Substitute, and screens (screens credited to the setter)'},
	immune_hits_per_game: {label: 'Immune Hits / Game', fmt: v => v.toFixed(2), desc: 'Avg number of fully-immune hits absorbed per game (type immunity or ability — Levitate, Volt Absorb, Flash Fire, etc.)'},
	dmg_reduced_typing_per_game: {label: 'Dmg Avoided (Typing)', fmt: pctOf, desc: 'Avg % max HP of damage blocked by type resistances per game'},
	dmg_amplified_typing_per_game: {label: 'Dmg Amplified (Typing)', fmt: pctOf, desc: 'Avg % max HP of extra damage taken from type weaknesses per game'},
	dmg_reduced_modifiers_per_game: {label: 'Dmg Avoided (Modifiers)', fmt: pctOf, desc: 'Avg % max HP of damage blocked by screens/buffs/abilities per game'},
	games_brought: {label: 'Times Brought', fmt: v => String(v), desc: 'Total number of times this species was brought to a battle (counts each player separately)'},
	turns_survived_total: {label: 'Most Turns Survived', fmt: v => String(v), desc: 'Total turns spent active on the field across all games'},
	status_inflicted_total: {label: 'Most Status Inflicted', fmt: v => String(v), desc: 'Total non-volatile statuses (burn/poison/sleep/etc.) this species inflicted on foes'},
	hazards_set_total: {label: 'Most Hazards Set', fmt: v => String(v), desc: 'Total entry hazards set (Stealth Rock, Spikes, Toxic Spikes, Sticky Web)'},
	hazards_cleared_total: {label: 'Most Hazards Cleared', fmt: v => String(v), desc: 'Total entry hazards removed (Rapid Spin, Defog, etc.)'},
};

function buildLeaderboard(statKey: string, board: {top_10: LeaderEntry[]; bottom_10: LeaderEntry[]}): string {
	const meta = STAT_LABELS[statKey];
	if (!meta || (!board.top_10.length && !board.bottom_10.length)) return '';

	const topRows = board.top_10.map(e => `
		<tr>
			<td>${medal(e.rank)}</td>
			<td><strong>${h(e.species)}</strong></td>
			<td>${h(meta.fmt(e.value))}</td>
			<td style="color:#888">${h(e.games_brought)}g</td>
		</tr>`).join('');

	const botRows = board.bottom_10.map(e => `
		<tr>
			<td>${medal(e.rank)}</td>
			<td><strong>${h(e.species)}</strong></td>
			<td>${h(meta.fmt(e.value))}</td>
			<td style="color:#888">${h(e.games_brought)}g</td>
		</tr>`).join('');

	return `
	<div style="margin-bottom:20px">
		<h3 style="margin-bottom:4px">${h(meta.label)}</h3>
		<p style="margin:0 0 8px;color:#666;font-size:.85em">${h(meta.desc)}</p>
		<div style="display:flex;gap:16px;flex-wrap:wrap">
			<div>
				<p style="margin:0 0 4px;font-weight:bold;color:#27ae60">▲ Top 10</p>
				<table class="ladder">
					<tr><th></th><th>Species</th><th>${h(meta.label)}</th><th>Brought</th></tr>
					${topRows || '<tr><td colspan="4"><em>Not enough data</em></td></tr>'}
				</table>
			</div>
			<div>
				<p style="margin:0 0 4px;font-weight:bold;color:#c0392b">▼ Bottom 10</p>
				<table class="ladder">
					<tr><th></th><th>Species</th><th>${h(meta.label)}</th><th>Brought</th></tr>
					${botRows || '<tr><td colspan="4"><em>Not enough data</em></td></tr>'}
				</table>
			</div>
		</div>
	</div>`;
}

function buildSpeciesTable(pokemon: PokemonRow[]): string {
	if (!pokemon.length) return '';
	const sorted = [...pokemon].sort((a, b) => b.games_brought - a.games_brought);
	let buf = `
	<h3>All Species (by times brought)</h3>
	<div style="overflow-x:auto">
	<table class="ladder" style="width:100%;font-size:.9em">
		<tr>
			<th>Species</th><th>Brought</th><th>Win%</th>
			<th>Dealt%/g</th><th>True%/g</th><th>Taken%/g</th><th>Heal%/g</th>
			<th>K</th><th>D</th><th>A</th><th>KDA</th><th>Turns</th>
		</tr>`;
	// Defensive against stale report files that predate newer fields.
	const num = (v: number | undefined) => (typeof v === 'number' ? v : 0);
	for (const p of sorted) {
		const bg = winRateColor(num(p.win_rate_when_brought));
		buf += `
		<tr style="background:${bg}">
			<td><strong>${h(p.species)}</strong></td>
			<td>${h(num(p.games_brought))}</td>
			<td>${pct(num(p.win_rate_when_brought))}</td>
			<td>${h(num(p.dmg_dealt_per_game).toFixed(1))}%</td>
			<td>${h(num(p.dmg_dealt_true_per_game).toFixed(1))}%</td>
			<td>${h(num(p.dmg_taken_per_game).toFixed(1))}%</td>
			<td>${h(num(p.healing_per_game).toFixed(1))}%</td>
			<td>${h(num(p.kills_total))}</td>
			<td>${h(num(p.deaths_total))}</td>
			<td>${h(num(p.assists_total))}</td>
			<td>${h(num(p.kda_ratio).toFixed(2))}</td>
			<td>${h(num(p.avg_turns_survived).toFixed(1))}</td>
		</tr>`;
	}
	return buf + '</table></div>';
}

function buildItems(items?: Array<{item: string; count: number}>): string {
	if (!items?.length) return '';
	const max = items[0].count || 1;
	let buf = `<h3>Most Brought Items <small style="font-weight:normal;font-size:.7em">(Mega Stones &amp; Z-Crystals excluded)</small></h3>`;
	buf += `<table class="ladder" style="max-width:480px">`;
	buf += `<tr><th></th><th>Item</th><th>Times Brought</th></tr>`;
	items.slice(0, 25).forEach((it, i) => {
		const pctW = Math.round((it.count / max) * 100);
		buf += `<tr><td>${medal(i + 1)}</td>` +
			`<td><strong>${h(it.item)}</strong></td>` +
			`<td><span style="display:inline-block;background:#88a;height:10px;width:${pctW}px;` +
			`vertical-align:middle;border-radius:2px"></span> ${h(it.count)}</td></tr>`;
	});
	return buf + `</table>`;
}

// ---------------------------------------------------------------------------
// Full raw-data breakdown (queries the SQLite DB directly)
// ---------------------------------------------------------------------------

// Every numeric column on pokemon_game_stats, in display order.
// `pctCol` marks values that are % of max HP (shown with 1 decimal + %).
const PGS_NUMERIC_COLUMNS: [string, string, boolean][] = [
	['dmg_dealt_total', 'Dealt', true],
	['dmg_dealt_direct', 'Dealt(dir)', true],
	['dmg_dealt_residual', 'Dealt(res)', true],
	['dmg_dealt_hazard', 'Dealt(haz)', true],
	['dmg_dealt_true', 'Dealt(true)', true],
	['dmg_taken_total', 'Taken', true],
	['dmg_taken_direct', 'Taken(dir)', true],
	['dmg_taken_residual', 'Taken(res)', true],
	['dmg_taken_hazard', 'Taken(haz)', true],
	['dmg_taken_true', 'Taken(true)', true],
	['dmg_avoided', 'Avoided', true],
	['dmg_reduced_typing', 'Red(type)', true],
	['dmg_amplified_typing', 'Amp(type)', true],
	['dmg_reduced_modifiers', 'Red(mod)', true],
	['healing_received', 'Heal', true],
	['healing_true', 'Heal(true)', true],
	['kills', 'K', false],
	['deaths', 'D', false],
	['assists', 'A', false],
	['turns_survived', 'Turns', false],
	['immune_hits', 'Immune', false],
	['status_inflicted', 'Status', false],
	['hazards_set', 'HazSet', false],
	['hazards_cleared', 'HazClr', false],
];

// Format a stored stat value for the full-data tables.
function fmtCell(val: number, isPct: boolean): string {
	if (val === null || val === undefined) val = 0;
	return isPct ? val.toFixed(1) + '%' : String(val);
}

function buildFullDataPage(): string {
	const db = getDB();
	if (!db) {
		return `<div class="pad"><h2>Full Battle Data</h2>` +
			`<div class="infobox"><p>Database unavailable (better-sqlite3 not installed).</p></div></div>`;
	}

	let buf = `<div class="pad"><h2><i class="fa fa-database"></i> Full Battle Data</h2>`;
	buf += `<p style="color:#888;font-size:.85em">Raw per-game and per-Pokémon data straight from the database. ` +
		`<button class="button" name="send" value="/join view-analyticsfull"><i class="fa fa-refresh"></i> Refresh</button></p>`;

	// ----- 1. Games log -----
	const games = db.prepare(
		`SELECT g.*, pa.username AS a_name, pb.username AS b_name, pw.username AS w_name
		 FROM game_record g
		 LEFT JOIN player_record pa ON g.player_a_id = pa.player_id
		 LEFT JOIN player_record pb ON g.player_b_id = pb.player_id
		 LEFT JOIN player_record pw ON g.winner_id  = pw.player_id
		 ORDER BY g.timestamp DESC`
	).all() as any[];

	buf += `<hr/><h3>Games (${games.length})</h3>`;
	buf += `<p style="color:#888;font-size:.8em">Use <b>Remove</b> to scrub a bugged match from all charts (staff only). ` +
		`<button class="button" name="send" value="/analyticsclearall confirm" ` +
		`style="color:#c0392b">Wipe ALL data</button></p>`;
	buf += `<div style="overflow-x:auto"><table class="ladder" style="font-size:.85em">`;
	buf += `<tr><th></th><th>Game ID</th><th>When</th><th>Format</th><th>Player A</th><th>Player B</th><th>Winner</th><th>Turns</th></tr>`;
	for (const g of games) {
		buf += `<tr>` +
			`<td><button class="button" name="send" value="/analyticsremove ${h(g.game_id)}" ` +
			`style="color:#c0392b"><i class="fa fa-trash"></i></button></td>` +
			`<td><small>${h(g.game_id)}</small></td>` +
			`<td><small>${h(new Date(g.timestamp).toLocaleString())}</small></td>` +
			`<td>${h(g.format)}</td>` +
			`<td>${h(g.a_name || g.player_a_id)}</td>` +
			`<td>${h(g.b_name || g.player_b_id)}</td>` +
			`<td>${h(g.w_name || (g.winner_id ? g.winner_id : 'Draw'))}</td>` +
			`<td>${h(g.turns_total)}</td></tr>`;
	}
	buf += `</table></div>`;

	// ----- 2. Per-species totals + per-game + min + max for every numeric stat -----
	const speciesRows = db.prepare(
		`SELECT pokemon_species AS species, COUNT(*) AS brought,
			${PGS_NUMERIC_COLUMNS.map(([c]) =>
				`SUM(${c}) AS ${c}_sum, MIN(${c}) AS ${c}_min, MAX(${c}) AS ${c}_max`).join(', ')}
		 FROM pokemon_game_stats
		 WHERE brought = 1
		 GROUP BY pokemon_species
		 ORDER BY brought DESC, species ASC`
	).all() as any[];

	buf += `<hr/><h3>Per-Species Totals (${speciesRows.length} species)</h3>`;
	buf += `<p style="color:#888;font-size:.8em">Each stat shows <b>total</b> (sum), <b>/g</b> (per time brought), ` +
		`min and max across individual games.</p>`;
	buf += `<div style="overflow-x:auto"><table class="ladder" style="font-size:.8em"><tr><th>Species</th><th>Brought</th>`;
	for (const [, label] of PGS_NUMERIC_COLUMNS) buf += `<th>${h(label)}</th>`;
	buf += `</tr>`;
	for (const r of speciesRows) {
		buf += `<tr><td><strong>${h(r.species)}</strong></td><td>${h(r.brought)}</td>`;
		for (const [c, , isPct] of PGS_NUMERIC_COLUMNS) {
			const sum = r[`${c}_sum`] || 0;
			const perGame = r.brought > 0 ? sum / r.brought : 0;
			const mn = r[`${c}_min`] ?? 0;
			const mx = r[`${c}_max`] ?? 0;
			buf += `<td title="min ${h(fmtCell(mn, isPct))} / max ${h(fmtCell(mx, isPct))}">` +
				`${h(fmtCell(sum, isPct))}<br/><small style="color:#888">${h(fmtCell(perGame, isPct))}/g</small><br/>` +
				`<small style="color:#aaa">${h(fmtCell(mn, isPct))}–${h(fmtCell(mx, isPct))}</small></td>`;
		}
		buf += `</tr>`;
	}
	buf += `</table></div>`;

	// ----- 3. Raw per-(game, player, Pokémon) rows -----
	const rawRows = db.prepare(
		`SELECT s.*, pr.username
		 FROM pokemon_game_stats s
		 LEFT JOIN player_record pr ON s.player_id = pr.player_id
		 ORDER BY s.game_id DESC, s.player_id ASC, s.was_lead DESC, s.dmg_dealt_total DESC`
	).all() as any[];

	buf += `<hr/><h3>Raw Rows (${rawRows.length})</h3><div style="overflow-x:auto"><table class="ladder" style="font-size:.78em">`;
	buf += `<tr><th>Game</th><th>Player</th><th>Species</th><th>Lead</th><th>Outcome</th>`;
	for (const [, label] of PGS_NUMERIC_COLUMNS) buf += `<th>${h(label)}</th>`;
	buf += `</tr>`;
	for (const r of rawRows) {
		buf += `<tr><td><small>${h(String(r.game_id).replace('battle-', ''))}</small></td>` +
			`<td>${h(r.username || r.player_id)}</td>` +
			`<td><strong>${h(r.pokemon_species)}</strong></td>` +
			`<td>${r.was_lead ? '✓' : ''}</td>` +
			`<td>${h(r.outcome)}</td>`;
		for (const [c, , isPct] of PGS_NUMERIC_COLUMNS) buf += `<td>${h(fmtCell(r[c] ?? 0, isPct))}</td>`;
		buf += `</tr>`;
	}
	buf += `</table></div></div>`;

	// Collapse newlines — the legacy client splits |pagehtml| on '\n'.
	return buf.replace(/\n\s*/g, ' ');
}

// ---------------------------------------------------------------------------
// Chat commands + page export
// ---------------------------------------------------------------------------

export const commands: Chat.Commands = {
	analytics(target, room, user) {
		return this.parse('/join view-analytics');
	},
	battlestats(target, room, user) {
		return this.parse('/join view-analytics');
	},
	analyticsfull(target, room, user) {
		return this.parse('/join view-analyticsfull');
	},
	analyticsraw(target, room, user) {
		return this.parse('/join view-analyticsfull');
	},

	analyticsremove(target, room, user) {
		this.checkCan('rangeban'); // staff/admin only
		const gameId = target.trim();
		if (!gameId) return this.errorReply(`Usage: /analyticsremove <game_id>  (find IDs on the Full Data page)`);
		const db = getDB();
		if (!db) return this.errorReply(`Analytics DB unavailable (better-sqlite3 not installed).`);
		const ok = deleteGame(db, gameId);
		if (!ok) return this.errorReply(`No analytics record found for game "${gameId}".`);
		try { generateReports(db); } catch {}
		this.globalModlog('ANALYTICSREMOVE', null, gameId);
		this.sendReply(`Removed game "${gameId}" from analytics and regenerated the charts.`);
		// refresh the full-data page for the user
		return this.parse('/join view-analyticsfull');
	},
	analyticsremovehelp: [`/analyticsremove <game_id> - Deletes one battle's data from the analytics charts. Requires: &`],

	analyticsclearall(target, room, user) {
		this.checkCan('rangeban');
		if (target !== 'confirm') {
			return this.errorReply(`This wipes ALL analytics data. Type /analyticsclearall confirm to proceed.`);
		}
		const db = getDB();
		if (!db) return this.errorReply(`Analytics DB unavailable.`);
		const n = deleteAllGames(db);
		try { generateReports(db); } catch {}
		this.globalModlog('ANALYTICSCLEARALL', null, `${n} games`);
		return this.sendReply(`Wiped all analytics data (${n} games removed).`);
	},
};

export const pages: Chat.PageTable = {
	analytics(args, user) {
		this.title = '[Battle Analytics]';

		const full = loadFull();
		const summary = loadSummary();

		if (!full || !summary) {
			return `<div class="pad"><h2>Battle Analytics</h2>` +
				`<div class="infobox"><p>No data yet — play a battle to generate analytics.</p>` +
				`<p><small>Data appears in <code>logs/analytics/</code> after the first completed game.</small></p>` +
				`</div></div>`;
		}

		const statOrder = [
			'win_rate_when_brought',
			'dmg_dealt_per_game',
			'dmg_dealt_true_per_game',
			'kda_ratio',
			'dmg_taken_per_game',
			'dmg_avoided_per_game',
			'immune_hits_per_game',
			'healing_per_game',
			'avg_turns_survived',
			'dmg_reduced_typing_per_game',
			'dmg_amplified_typing_per_game',
			'dmg_reduced_modifiers_per_game',
			'games_brought',
			'turns_survived_total',
			'status_inflicted_total',
			'hazards_set_total',
			'hazards_cleared_total',
		];

		let buf = '<div class="pad">';
		buf += '<h2><i class="fa fa-bar-chart"></i> Battle Analytics</h2>';
		buf += buildHeader(full);
		buf += '<hr/>';
		buf += buildPlayers(full.players);
		buf += '<hr/>';
		buf += '<h2>Leaderboards</h2>';
		for (const key of statOrder) {
			if (summary.leaderboards[key]) {
				buf += buildLeaderboard(key, summary.leaderboards[key]);
			}
		}
		buf += '<hr/>';
		buf += buildSpeciesTable(full.pokemon);
		buf += '<hr/>';
		buf += buildItems(full.items);
		buf += `<hr/><p><button class="button" name="send" value="/join view-analyticsfull">` +
			`<i class="fa fa-database"></i> View Full Raw Data</button></p>`;
		buf += '</div>';
		// The legacy client splits room messages on '\n' (HTMLRoom.add), so a
		// |pagehtml| payload MUST be a single line — collapse all newlines/indent
		// introduced by template literals into single spaces.
		return buf.replace(/\n\s*/g, ' ');
	},

	analyticsfull(args, user) {
		this.title = '[Full Battle Data]';
		// --- Access gate ---
		// To restrict this page later, uncomment the line below; only users with
		// the given global permission (e.g. console/admin access) will be able to
		// open it. Left open for now during testing.
		// this.checkCan('rangeban');
		return buildFullDataPage();
	},
};
