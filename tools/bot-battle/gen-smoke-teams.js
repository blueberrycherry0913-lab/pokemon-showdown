'use strict';

/**
 * Smoke-test team generator.
 *
 * Builds an ordered list of [Gen 9] Testing Standard teams for the bot harness's pool
 * mode (run.js pairs consecutive teams: game i = teams[2i] vs teams[2i+1]). Every
 * eligible Pokémon (smoke-pool.js) appears in >= MIN_GAMES teams, and EACH of its
 * legal basic-ability variants appears in >= 1 team (user requirement: both basic
 * abilities tested). Variants listed in prescreen-crashers.json are excluded first.
 *
 * Sets: type-based standard moves (smoke-pool.movesFor), Oran Berry, Hardy nature,
 * Level 50, 0 IVs, no EVs/SP.
 *
 * Run from this directory after `node build` (and after prescreen-variants.js):
 *   node gen-smoke-teams.js
 */

const fs = require('fs');
const path = require('path');

const {Dex, TeamValidator} = require('../../dist/sim');
const {buildPool, movesFor, variantsOf} = require('./smoke-pool');

const FORMAT = 'gen9testingstandard';
const MOD = 'champions';
const MIN_GAMES = 5;               // user: >=5 battles per species
const dex = Dex.mod(MOD);
const validator = new TeamValidator(FORMAT);

const CRASHERS_FILE = path.join(__dirname, 'prescreen-crashers.json');
const OUT_FILE = path.join(__dirname, 'smoke-teams.txt');

function loadCrashers() {
	if (!fs.existsSync(CRASHERS_FILE)) {
		console.warn(`[gen] ${path.basename(CRASHERS_FILE)} not found — run prescreen-variants.js first. Proceeding with NO exclusions.`);
		return new Set();
	}
	const arr = JSON.parse(fs.readFileSync(CRASHERS_FILE, 'utf8'));
	return new Set(arr.map(c => `${c.id}|${c.ability}`));
}

function shuffleTiebreak() { return Math.random() - 0.5; }

function main() {
	const crashers = loadCrashers();
	const poolIds = buildPool(dex);

	// Per-species state: legal variants (minus crashers), running totals.
	const species = [];   // {id, name, variants: [ability], moves: [..]}
	const total = {};     // id -> appearances
	const vcount = {};     // id -> {ability -> count}
	let droppedSpecies = 0, droppedVariants = 0;
	for (const id of poolIds) {
		const sp = dex.species.get(id);
		const variants = variantsOf(sp).filter(ab => {
			const drop = crashers.has(`${id}|${ab}`);
			if (drop) droppedVariants++;
			return !drop;
		});
		if (!variants.length) { droppedSpecies++; continue; } // every variant crashed → drop species
		// Species Clause counts by BASE species, so two formes of one base (Alcremie creams,
		// Indeedee-M/F, Raichu vs Raichu-Alola, …) cannot share a team. Track base to keep
		// them on separate teams while still testing each forme.
		species.push({id, name: sp.name, base: sp.baseSpecies || sp.name, variants, moves: movesFor(sp)});
		total[id] = 0;
		vcount[id] = {};
		for (const ab of variants) vcount[id][ab] = 0;
	}

	const byId = Object.fromEntries(species.map(s => [s.id, s]));
	const hasUncovered = id => byId[id].variants.some(ab => vcount[id][ab] === 0);
	const allCovered = () => species.every(s => total[s.id] >= MIN_GAMES && !hasUncovered(s.id));

	function pickTeamIds(exclude) {
		const cands = species.filter(s => !exclude.has(s.id)).map(s => s.id);
		cands.sort((a, b) => {
			const ua = hasUncovered(a) ? 0 : 1, ub = hasUncovered(b) ? 0 : 1;
			if (ua !== ub) return ua - ub;          // uncovered-variant species first
			if (total[a] !== total[b]) return total[a] - total[b]; // then lowest total
			return shuffleTiebreak();
		});
		// Take 6 with DISTINCT base species (Species Clause is per base species).
		const team = [];
		const usedBase = new Set();
		for (const id of cands) {
			const base = byId[id].base;
			if (usedBase.has(base)) continue;
			usedBase.add(base);
			team.push(id);
			if (team.length === 6) break;
		}
		return team;
	}
	function pickVariant(id) {
		const vs = byId[id].variants;
		let best = vs[0], bestC = vcount[id][best];
		for (const ab of vs) {
			const c = vcount[id][ab];
			if (c < bestC || (c === bestC && shuffleTiebreak() < 0)) { best = ab; bestC = c; }
		}
		return best;
	}
	function commitTeam(exclude) {
		const ids = pickTeamIds(exclude);
		return ids.map(id => {
			const ability = pickVariant(id);
			total[id]++; vcount[id][ability]++;
			return {id, name: byId[id].name, ability, moves: byId[id].moves};
		});
	}

	const teams = [];
	const HARD_CAP = species.length * 4; // safety
	while (teams.length < HARD_CAP) {
		const a = commitTeam(new Set());
		const b = commitTeam(new Set(a.map(m => m.id)));
		teams.push(a, b);
		if (allCovered()) break;
	}

	// Validate every team.
	let problemCount = 0;
	teams.forEach((team, idx) => {
		const sets = team.map(m => ({
			species: m.name, name: m.name, level: 50, gender: '', ability: m.ability,
			item: 'Oran Berry', moves: m.moves, nature: 'Hardy',
			ivs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}, evs: {},
		}));
		const problems = validator.validateTeam(sets);
		if (problems) {
			problemCount++;
			if (problemCount <= 10) console.warn(`[gen] team #${idx + 1} problems: ${problems.slice(0, 3).join(' | ')}`);
		}
	});

	// Write export format.
	const blocks = teams.map((team, idx) => {
		const header = `=== [${FORMAT}] Smoke ${idx + 1} ===`;
		const setText = team.map(m => {
			const lines = [
				`${m.name} @ Oran Berry`,
				`Ability: ${m.ability}`,
				`Level: 50`,
				`Hardy Nature`,
				`IVs: 0 HP / 0 Atk / 0 Def / 0 SpA / 0 SpD / 0 Spe`,
				...m.moves.map(mv => `- ${mv}`),
			];
			return lines.join('\n');
		}).join('\n\n');
		return `${header}\n${setText}`;
	});
	fs.writeFileSync(OUT_FILE, blocks.join('\n\n') + '\n');

	// Coverage report + histogram.
	const totals = species.map(s => total[s.id]);
	const hist = {};
	for (const t of totals) hist[t] = (hist[t] || 0) + 1;
	const uncoveredSpecies = species.filter(s => hasUncovered(s.id));
	const belowMin = species.filter(s => total[s.id] < MIN_GAMES);

	console.log(`\n================ GENERATION SUMMARY ================`);
	console.log(`Pool species        : ${poolIds.length}  (used ${species.length}, dropped ${droppedSpecies} all-variant-crash)`);
	console.log(`Crasher variants     : excluded ${droppedVariants}`);
	console.log(`Variants covered     : ${species.reduce((n, s) => n + s.variants.length, 0)}  ` +
		`(species with uncovered variants: ${uncoveredSpecies.length})`);
	console.log(`Teams                : ${teams.length}  => Games: ${teams.length / 2}`);
	console.log(`Species below ${MIN_GAMES} games : ${belowMin.length}`);
	console.log(`Appearance histogram : ${Object.keys(hist).sort((a, b) => a - b).map(k => `${k}×=${hist[k]}`).join('  ')}`);
	console.log(`Team validator problems: ${problemCount}`);
	if (uncoveredSpecies.length) console.log(`  UNCOVERED: ${uncoveredSpecies.map(s => s.name).join(', ')}`);
	console.log(`Run with             : node run.js --games=${teams.length / 2} --mode=pool --teams=${path.basename(OUT_FILE)} --names=TesterBotRuby,TesterBotSapphire`);
	console.log(`Written to           : ${path.relative(process.cwd(), OUT_FILE)}`);
	console.log(`====================================================`);

	// Spot-check sample.
	const sample = ['beedrill', 'blastoise', 'hitmonlee'].map(id => dex.species.get(id)).filter(sp => sp.exists);
	for (const sp of sample) console.log(`  sample ${sp.name} (${sp.types.join('/')}): ${movesFor(sp).join(', ')}`);
}

main();
