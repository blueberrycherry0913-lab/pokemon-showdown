'use strict';

/**
 * Team sources for the bot-battle harness.
 *
 *  - Pool mode:      reads packed teams (one per line, or blank-line-separated
 *                    Import/Export blocks) from teams.txt and rotates them.
 *  - Generator mode: builds random `[Gen 9] Testing Standard`-legal teams on the
 *                    fly and validates each with TeamValidator before use.
 *  - Both mode:      alternates pool / generated per game.
 *
 * Everything is validated against the real format validator, so an illegal team
 * never reaches the server (and a validator crash on a generated team is itself
 * a useful bug signal).
 */

const fs = require('fs');
const path = require('path');

// dist is produced by `node build` in the server repo root.
const {Dex, Teams, TeamValidator} = require('../../dist/sim');

const FORMAT = 'gen9testingstandard';
const MOD = 'champions'; // the mod gen9testingstandard runs on (see CLAUDE.md §5)

const dex = Dex.mod(MOD);
const validator = new TeamValidator(FORMAT);

// Always-legal items (no isNonstandard gate, no species requirement). Includes
// '' (no item) a couple of times to bias toward itemless sets.
const SAFE_ITEMS = [
	'', '', 'Leftovers', 'Life Orb', 'Heavy-Duty Boots', 'Focus Sash',
	'Choice Band', 'Choice Specs', 'Choice Scarf', 'Assault Vest',
	'Rocky Helmet', 'Sitrus Berry', 'Expert Belt', 'Black Sludge',
];

const NATURES = [
	'Hardy', 'Adamant', 'Modest', 'Jolly', 'Timid', 'Bold', 'Calm',
	'Careful', 'Impish', 'Naive', 'Brave', 'Relaxed', 'Quiet', 'Sassy',
];

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

// Eligible base species: Gen 1 dex numbers, selectable (not a battle-only forme,
// not a sub-forme entry), and not validator-gated as Illegal. The validator is
// the final arbiter; this just keeps the random reject rate low (~3 tries/team).
const SPECIES_POOL = dex.species.all().filter(s =>
	s.num >= 1 && s.num <= 151 &&
	!s.battleOnly &&
	!s.forme &&
	s.isNonstandard !== 'Illegal'
);

function pick(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function sample(arr, n) {
	const copy = arr.slice();
	const out = [];
	while (out.length < n && copy.length) {
		out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
	}
	return out;
}

/** All moves a species can legally learn (union across its evo-chain learnsets), minus Hidden Power (banlisted). */
function legalMoves(species) {
	const moves = new Set();
	for (const ld of dex.species.getFullLearnset(species.id)) {
		if (ld && ld.learnset) {
			for (const moveid of Object.keys(ld.learnset)) moves.add(moveid);
		}
	}
	return [...moves].filter(m => !m.startsWith('hiddenpower'));
}

/** Build one random PokemonSet. */
function genMon() {
	const species = pick(SPECIES_POOL);
	const moves = legalMoves(species);

	// Basic ability: slots 0/1 only. The awakened (H) ability is auto-assigned
	// server-side (CLAUDE.md §8); using it as the basic ability would trip the
	// `No Dup Abilities` clause.
	const basicAbilities = [species.abilities['0'], species.abilities['1']].filter(Boolean);

	// SP spread: ≤32 per stat, ≤66 total (CLAUDE.md §5). Drop points into 2-3 stats.
	const evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
	let budget = 66;
	for (const stat of sample(STATS, 2 + Math.floor(Math.random() * 2))) {
		const v = Math.min(32, budget, Math.floor(Math.random() * 33));
		evs[stat] = v;
		budget -= v;
	}

	return {
		species: species.name,
		name: species.name,
		level: 50,
		gender: '',
		ability: pick(basicAbilities) || species.abilities['0'],
		item: pick(SAFE_ITEMS),
		moves: sample(moves, Math.min(4, moves.length)),
		nature: pick(NATURES),
		// Force IV 0 zeroes IVs at validation; the validator accepts all-0 (CLAUDE.md §5).
		ivs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
		evs,
	};
}

/**
 * Generate a validated random team. Returns {team, packed} or throws after
 * `maxTries` (which would itself indicate a generator/validator problem).
 */
function generateTeam(maxTries = 60) {
	let lastProblems = null;
	for (let i = 0; i < maxTries; i++) {
		const team = [];
		for (let s = 0; s < 6; s++) team.push(genMon());
		const problems = validator.validateTeam(team);
		if (!problems) return {team, packed: Teams.pack(team)};
		lastProblems = problems;
	}
	throw new Error(`Could not generate a valid team in ${maxTries} tries. Last problems: ${JSON.stringify(lastProblems)}`);
}

/**
 * Parse a teams file into an array of teams (each a PokemonSet[]).
 * Auto-detects the Showdown EXPORT format (teambuilder Import/Export — supports
 * multiple teams separated by "=== [format] name ===" headers) vs. the packed
 * format (one packed team per line).
 */
function parseTeamsFile(raw) {
	const isExport = /^===.*===\s*$/m.test(raw) || /^\s*Ability:\s/m.test(raw);
	if (isExport) {
		const chunks = raw.split(/^===.*===\s*$/m).map(c => c.trim()).filter(Boolean);
		const source = chunks.length ? chunks : [raw];
		const teams = [];
		for (const chunk of source) {
			const t = Teams.import(chunk);
			if (t && t.length) teams.push(t);
		}
		return teams;
	}
	// Packed format: one team per non-comment line.
	const teams = [];
	for (const line of raw.split('\n').map(l => l.trim())) {
		if (!line || line.startsWith('#') || line.startsWith('//')) continue;
		const t = Teams.unpack(line);
		if (t && t.length) teams.push(t);
	}
	return teams;
}

/**
 * Load teams from a file (export OR packed format). By default LENIENT: a team
 * that fails the validator is used anyway (with a warning) — your game has no
 * strict move validator, so hand-made teams with freeform movesets must still
 * run; the server is the final arbiter. Pass `strict` to skip invalid teams.
 */
function loadPool(file = path.join(__dirname, 'teams.txt'), strict = false) {
	if (!fs.existsSync(file)) {
		console.warn(`[teams] team file not found: ${file}`);
		return [];
	}
	const parsed = parseTeamsFile(fs.readFileSync(file, 'utf8'));
	const out = [];
	let idx = 0;
	for (const team of parsed) {
		idx++;
		const problems = validator.validateTeam(team);
		if (problems) {
			if (strict) {
				console.warn(`[teams] skipping invalid pool team #${idx}: ${problems.slice(0, 2).join('; ')}`);
				continue;
			}
			console.warn(`[teams] pool team #${idx} has validator warnings (using anyway): ${problems.slice(0, 2).join('; ')}`);
		}
		out.push({team, packed: Teams.pack(team)});
	}
	console.log(`[teams] loaded ${out.length} team(s) from ${path.basename(file)}.`);
	return out;
}

/**
 * Returns a function `nextTeam()` that yields {team, packed} per call, according
 * to `mode`: 'random' | 'pool' | 'both'. `opts.file` selects the pool file;
 * `opts.strict` skips (rather than warns on) invalid pool teams.
 */
function teamSource(mode, opts = {}) {
	const file = opts.file;
	const pool = (mode === 'pool' || mode === 'both') ? loadPool(file, !!opts.strict) : [];
	if ((mode === 'pool' || mode === 'both') && !pool.length) {
		if (mode === 'pool') {
			throw new Error(`mode=pool but no teams found in ${file || 'teams.txt'}. Paste teams there or pass --teams=<path>.`);
		}
		console.warn(`[teams] mode=both but the team file has no teams — falling back to generated teams only.`);
	}
	let poolIndex = 0;
	let useGenerated = false; // toggled in 'both' mode
	return function nextTeam() {
		const havePool = pool.length > 0;
		if (mode === 'pool' || (mode === 'both' && havePool && !useGenerated)) {
			const t = pool[poolIndex % pool.length];
			poolIndex++;
			if (mode === 'both') useGenerated = true;
			return t;
		}
		if (mode === 'both') useGenerated = false;
		return generateTeam();
	};
}

module.exports = {FORMAT, generateTeam, loadPool, teamSource, SPECIES_POOL};
