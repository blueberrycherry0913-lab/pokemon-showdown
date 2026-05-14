export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	// Add Adjust Level = 50 to Standard AG when running under mod=champions.
	// Other inherited clauses (Standard NatDex's Species/Nickname/OHKO/etc.)
	// chain through this transparently.
	standardag: {
		inherit: true,
		ruleset: [
			'Obtainable', 'Team Preview', 'HP Percentage Mod', 'Cancel Mod', 'Endless Battle Clause',
			'Adjust Level = 50',
		],
	},
};
