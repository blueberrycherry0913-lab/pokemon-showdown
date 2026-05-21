// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts
/*
If you want to add custom formats, create a file in this folder named: "custom-formats.ts"

Paste the following code into the file and add your desired formats and their sections between the brackets:
--------------------------------------------------------------------------------
// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts

export const Formats: FormatList = [
];
--------------------------------------------------------------------------------

If you specify a section that already exists, your format will be added to the bottom of that section.
New sections will be added to the bottom of the specified column.
The column value will be ignored for repeat sections.
*/

export const Formats: import('../sim/dex-formats').FormatList = [

	// Custom
	///////////////////////////////////////////////////////////////////

	{
		section: "Custom",
		column: 1,
	},
	{
		name: "[Gen 9] Testing Standard",
		desc: `Custom fan-game rework playtesting format. Inherits Nat Dex AG roster and clauses; Pok&eacute;mon Champions SP system + Level 50 lock + 0-IV baseline applied via mod=champions.`,
		mod: 'champions',
		ruleset: [
			'Standard NatDex',
			// Keep 'Obtainable Moves' on (the default via Standard NatDex) so Pokemon
			// can only use moves in their NatDex AG learnset. Custom moves the user
			// adds via data/learnsets.ts will pass; canon moves not in a species's
			// learnset (e.g. Venusaur with Light That Burns the Sky) will be rejected.
			// We do still lift Abilities and Formes since the user has custom abilities
			// (e.g. Burning Soul on Charizard) and custom formes that wouldn't pass the
			// canon checks otherwise.
			'!Obtainable Abilities',
			'!Obtainable Formes',
			// All IVs forced to 0 silently; champions/scripts.ts:statModify switches to
			// 0-IV baseline constants when this clause is in the rule table.
			'Force IV 0',
			// TEMPORARY: only Gen 1 lineage Pokémon (Bulbasaur-Mew family + their
			// forward/backward evolutions + Mega/Primal/Ultra/G-Max formes) are legal.
			// Drop this line to restore the full roster.
			'Gen 1 Only',
			// Enforce that set.ability must be one of the species's own ability slots.
			// '!Obtainable Abilities' above lifts the core learnset-based check (needed
			// for custom abilities/formes), so we gate species-level legality here.
			'Species Abilities',
			// Reject sets where the chosen basic ability matches the awakened (hidden)
			// ability — no strategic choice if both slots are the same.
			'No Dup Abilities',
		],
		banlist: [
			// With all IVs at 0, Hidden Power is always Fighting-type at low BP — uglier
			// than just disabling it. Can revisit if a custom Hidden Power replacement
			// gets added to the rework.
			'Hidden Power',
		],
		restricted: [],
		// Type Order STAB (§6 of master reference):
		//   Pure type (single type): ×1.6
		//   Primary type (types[0]):  ×1.5
		//   Secondary type (types[1]): ×1.4
		// Adaptability and Specialist bypass the standard table (their ability handlers
		// fire first; we detect them here to avoid clobbering their values).
		// Specialist adds +0.75 additively to the type-order base.
		onModifySTAB(stab, attacker, defender, move) {
			if (stab <= 1) return stab; // move has no STAB (includes Specialist's 0.75x penalty)
			if (attacker.hasAbility('adaptability')) return stab; // preserve Adaptability
			const types = attacker.types;
			if (!types.includes(move.type)) return stab; // forceSTAB edge case
			if (attacker.hasAbility('specialist')) {
				// Additive +0.75 on top of type-order base
				if (types.length === 1) return 2.35; // 1.6 + 0.75
				if (types[0] === move.type) return 2.25; // 1.5 + 0.75
				return 2.15; // 1.4 + 0.75
			}
			if (types.length === 1) return 1.6; // pure type
			if (types[0] === move.type) return 1.5; // primary
			return 1.4; // secondary
		},
	},
];
