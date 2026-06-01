'use strict';

/**
 * Battle Analytics Page
 * Renders battle_report_full.json + battle_report_summary.json as an
 * in-server HTML dashboard, accessible via /view-analytics or /analytics.
 */

import * as path from 'path';
import * as fs from 'fs';

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
	dmg_dealt_direct_per_game: number;
	dmg_dealt_residual_per_game: number;
	dmg_dealt_hazard_per_game: number;
	dmg_taken_per_game: number;
	dmg_reduced_typing_per_game: number;
	dmg_amplified_typing_per_game: number;
	dmg_reduced_modifiers_per_game: number;
	healing_per_game: number;
	kills_total: number;
	deaths_total: number;
	assists_total: number;
	kills_per_game: number;
	deaths_per_game: number;
	assists_per_game: number;
	kda_ratio: number;
}

interface FullReport {
	generated_at: string;
	games_total: number;
	avg_turns_per_game: number;
	players: PlayerRow[];
	pokemon: PokemonRow[];
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

const STAT_LABELS: {[k: string]: {label: string; fmt: (v: number) => string; desc: string}} = {
	win_rate_when_brought: {label: 'Win Rate', fmt: pct, desc: 'Win % when this species is on the team (≥3 games)'},
	dmg_dealt_per_game: {label: 'Damage Dealt / Game', fmt: v => v.toFixed(1), desc: 'Avg total damage output per game brought'},
	dmg_taken_per_game: {label: 'Damage Taken / Game', fmt: v => v.toFixed(1), desc: 'Avg total damage received per game brought'},
	kda_ratio: {label: 'KDA', fmt: v => v.toFixed(2), desc: '(Kills + Assists) / max(Deaths, 1)'},
	healing_per_game: {label: 'Healing / Game', fmt: v => v.toFixed(1), desc: 'Avg HP restored per game brought'},
	avg_turns_survived: {label: 'Turns Survived', fmt: v => v.toFixed(1), desc: 'Avg turns active on field per game brought'},
	dmg_reduced_typing_per_game: {label: 'Dmg Avoided (Typing)', fmt: v => v.toFixed(1), desc: 'Avg damage blocked by type resistances per game'},
	dmg_amplified_typing_per_game: {label: 'Dmg Amplified (Typing)', fmt: v => v.toFixed(1), desc: 'Avg extra damage taken from type weaknesses per game'},
	dmg_reduced_modifiers_per_game: {label: 'Dmg Avoided (Modifiers)', fmt: v => v.toFixed(1), desc: 'Avg damage blocked by screens/buffs/abilities per game'},
	games_brought: {label: 'Appearances', fmt: v => String(v), desc: 'Number of games where this species was on a team'},
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
					<tr><th></th><th>Species</th><th>${h(meta.label)}</th><th>Games</th></tr>
					${topRows || '<tr><td colspan="4"><em>Not enough data</em></td></tr>'}
				</table>
			</div>
			<div>
				<p style="margin:0 0 4px;font-weight:bold;color:#c0392b">▼ Bottom 10</p>
				<table class="ladder">
					<tr><th></th><th>Species</th><th>${h(meta.label)}</th><th>Games</th></tr>
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
	<h3>All Species (by appearances)</h3>
	<div style="overflow-x:auto">
	<table class="ladder" style="width:100%;font-size:.9em">
		<tr>
			<th>Species</th><th>Games</th><th>Win%</th>
			<th>Dealt/g</th><th>Taken/g</th><th>Healed/g</th>
			<th>K</th><th>D</th><th>A</th><th>KDA</th><th>Turns</th>
		</tr>`;
	for (const p of sorted) {
		const bg = winRateColor(p.win_rate_when_brought);
		buf += `
		<tr style="background:${bg}">
			<td><strong>${h(p.species)}</strong></td>
			<td>${h(p.games_brought)}</td>
			<td>${pct(p.win_rate_when_brought)}</td>
			<td>${h(p.dmg_dealt_per_game.toFixed(0))}</td>
			<td>${h(p.dmg_taken_per_game.toFixed(0))}</td>
			<td>${h(p.healing_per_game.toFixed(0))}</td>
			<td>${h(p.kills_total)}</td>
			<td>${h(p.deaths_total)}</td>
			<td>${h(p.assists_total)}</td>
			<td>${h(p.kda_ratio.toFixed(2))}</td>
			<td>${h(p.avg_turns_survived.toFixed(1))}</td>
		</tr>`;
	}
	return buf + '</table></div>';
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
};

export const pages: Chat.PageTable = {
	analytics(args, user) {
		this.title = '[Battle Analytics]';

		const full = loadFull();
		const summary = loadSummary();

		if (!full || !summary) {
			return `<div class="pad">
				<h2>Battle Analytics</h2>
				<div class="infobox">
					<p>No data yet — play a battle to generate analytics.</p>
					<p><small>Data appears in <code>logs/analytics/</code> after the first completed game.</small></p>
				</div>
			</div>`;
		}

		const statOrder = [
			'win_rate_when_brought',
			'dmg_dealt_per_game',
			'kda_ratio',
			'dmg_taken_per_game',
			'healing_per_game',
			'avg_turns_survived',
			'dmg_reduced_typing_per_game',
			'dmg_amplified_typing_per_game',
			'dmg_reduced_modifiers_per_game',
			'games_brought',
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
		buf += '</div>';
		return buf;
	},
};
