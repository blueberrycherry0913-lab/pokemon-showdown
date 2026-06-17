'use strict';

/**
 * Shared pool / moveset / ability-variant logic for the §smoke-test scripts
 * (prescreen-variants.js + gen-smoke-teams.js).
 *
 * Pool = the fully-evolved, legal roster of [Gen 9] Testing Standard that the user
 * wants smoke-tested: the client teambuilder buckets **Gen1 + Gen8** (as-is) +
 * **Cosmic** (base formes only → Xatu / Beheeyem / Minior) + **Osteokhan**.
 * Megas / NFE / Other / Custom (except Osteokhan) are excluded.
 *
 * Movesets are dictated purely by typing (CLAUDE.md / user spec): the "High" standard
 * move (Physical + Special) of each type; mono-types top up to 4 with that type's
 * "Medium" Physical + Special. Looked up by name via dex.moves.get() so the correct
 * id resolves (e.g. "Chi Strike" → chistrike).
 */

const fs = require('fs');

const CLIENT_TABLES = 'C:/Users/primo/Documents/GitHub/pokemon-showdown-client/play.pokemonshowdown.com/data/teambuilder-tables.js';

// High-tier standard move per type: [Physical, Special]. From
// "Reworked Move Sheet - Standard Moves.tsv" (Structure = High).
const HIGH = {
	Bug: ['X-Scissor', 'Signal Beam'], Cosmic: ['Meteor Mash', 'Moonblast'], Dark: ['Night Slash', 'Dark Pulse'],
	Dragon: ['Dragon Hammer', 'Dragon Pulse'], Electric: ['Supercell Slam', 'Thunderbolt'], Fairy: ['Play Rough', 'Dazzling Gleam'],
	Fighting: ['True Strength', 'Aura Sphere'], Fire: ['Fire Lash', 'Flamethrower'], Flying: ['Aerial Ace', 'Air Slash'],
	Ghost: ['Phantom Force', 'Shadow Ball'], Grass: ['Seed Bomb', 'Energy Ball'], Ground: ['High Horsepower', 'Earth Power'],
	Ice: ['Icicle Crash', 'Ice Beam'], Normal: ['Body Slam', 'Power Surge'], Poison: ['Cross Poison', 'Sludge Bomb'],
	Psychic: ['Psycho Cut', 'Psychic'], Rock: ['Rock Slide', 'Power Gem'], Steel: ['Solid Smash', 'Flash Cannon'],
	Water: ['Liquidation', 'Surf'],
};

// Medium-tier standard move per type: [Physical, Special]. Used to top mono-types up to 4.
const MED = {
	Bug: ['Skitter Smack', 'Struggle Bug'], Cosmic: ['Grav-Well', 'Swift'], Dark: ['Assurance', 'Night Daze'],
	Dragon: ['Breaking Swipe', 'Wyrm Surge'], Electric: ['Wild Charge', 'Shock Wave'], Fairy: ['Glimmering Rush', 'Fae Current'],
	Fighting: ['Fury', 'Chi Strike'], Fire: ['Flame Wheel', 'Searing Shot'], Flying: ['Sky Strike', 'Air Cutter'],
	Ghost: ['Shadow Strike', 'Bitter Malice'], Grass: ['Razor Leaf', 'Magical Leaf'], Ground: ['Bulldoze', 'Mud Shot'],
	Ice: ['Avalanche', 'Aurora Beam'], Normal: ['Slam', 'Neutral Burst'], Poison: ['Blight Brush', 'Sludge'],
	Psychic: ['Psyche Slam', 'Extrasensory'], Rock: ['Rock Throw', 'Shale Burst'], Steel: ['Ironclad', 'Magnet Bomb'],
	Water: ['Dive', 'Water Pulse'],
};

/** Read BattleTeambuilderTable.testingstandard.overrideTier from the client repo. */
function readOverrideTier() {
	const code = fs.readFileSync(CLIENT_TABLES, 'utf8');
	const sandbox = {exports: {}};
	// eslint-disable-next-line no-new-func
	new Function('exports', code)(sandbox.exports);
	const tbl = sandbox.exports.BattleTeambuilderTable.testingstandard;
	if (!tbl || !tbl.overrideTier) throw new Error('testingstandard.overrideTier not found in client teambuilder-tables.js');
	return tbl.overrideTier;
}

/**
 * Build the eligible species-id pool. Gen1/Gen8 buckets as-is; Cosmic restricted to
 * base formes (drops Minior colour/Meteor formes) → 3; plus Osteokhan.
 */
function buildPool(dex) {
	const ot = readOverrideTier();
	const ids = [];
	const seen = new Set();
	const add = id => { if (!seen.has(id)) { seen.add(id); ids.push(id); } };
	for (const id in ot) {
		const bucket = ot[id];
		const sp = dex.species.get(id);
		if (!sp.exists) continue;
		if (bucket === 'Gen1' || bucket === 'Gen8') add(sp.id);
		else if (bucket === 'Cosmic' && !sp.forme) add(sp.id); // base-forme Cosmic only
	}
	add(dex.species.get('osteokhan').id);
	return ids;
}

/** Moves for a species: High Phys/Spec of each type; mono-types add their Medium Phys/Spec. Cap 4, deduped. */
function movesFor(species) {
	const out = [];
	const push = mv => { if (mv && !out.includes(mv)) out.push(mv); };
	for (const t of species.types) for (const mv of (HIGH[t] || [])) push(mv);
	if (out.length < 4) {
		for (const t of species.types) for (const mv of (MED[t] || [])) { if (out.length < 4) push(mv); }
	}
	return out.slice(0, 4);
}

/**
 * Legal basic-ability variants for a species: the unique abilities in slots 0/1,
 * excluding the awakened (H) slot (No Dup Abilities forbids basic === awakened).
 */
function variantsOf(species) {
	const H = species.abilities['H'];
	const set = [];
	for (const k of ['0', '1']) {
		const a = species.abilities[k];
		if (a && a !== H && !set.includes(a)) set.push(a);
	}
	return set.length ? set : [species.abilities['0']]; // fallback (shouldn't happen)
}

module.exports = {HIGH, MED, readOverrideTier, buildPool, movesFor, variantsOf};
