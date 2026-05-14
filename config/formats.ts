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
		desc: `Custom fan-game rework playtesting format. Inherits Nat Dex AG roster and clauses; Pok&eacute;mon Champions stat system applied separately (see Steps 3-4).`,
		mod: 'gen9',
		ruleset: [
			'Standard NatDex',
			'!Obtainable',
			// SP system, Level 50, IV removal added in Steps 3-4
		],
		banlist: [],
		restricted: [],
	},
];
