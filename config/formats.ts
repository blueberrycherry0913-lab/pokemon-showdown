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
			// Lift the legality checks that would reject custom moves / abilities / formes,
			// but keep 'Nonexistent' banned and 'EV Limit = Auto' active (both inherited from
			// the unmodified parts of Obtainable). 'Nonexistent' is what gates validateStats —
			// without it the 32 SP per-stat cap, 66 total cap, and Level 50 lock never fire.
			'!Obtainable Moves',
			'!Obtainable Abilities',
			'!Obtainable Formes',
			// All IVs forced to 0 silently; champions/scripts.ts:statModify switches to
			// 0-IV baseline constants when this clause is in the rule table.
			'Force IV 0',
		],
		banlist: [
			// With all IVs at 0, Hidden Power is always Fighting-type at low BP — uglier
			// than just disabling it. Can revisit if a custom Hidden Power replacement
			// gets added to the rework.
			'Hidden Power',
		],
		restricted: [],
	},
];
