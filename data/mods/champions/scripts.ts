export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	// Pokemon Champions SP (Stat Point) system: 1 SP = +1 to that stat at Level 50.
	// EV field is reinterpreted as SP (0-32 per stat, 66 total — enforced in
	// sim/team-validator.ts via `useStatPoints = dex.currentMod === 'champions'`
	// and sim/dex-formats.ts via evLimit = 66).
	//
	// The +75 / +20 constants bake in the canonical "31 IV, Level 50" baseline
	// stat. Step 4 will override IVs to 0; that needs handling here too at that
	// time (subtract 15 from non-HP, 30 from HP if maxedIVs is false).
	statModify(baseStats, set, statName) {
		const tr = this.trunc;
		let stat = baseStats[statName];
		const evs = set.evs[statName];
		if (statName === 'hp') {
			return stat + evs + 75;
		}
		stat = stat + evs + 20;
		const nature = this.dex.natures.get(set.nature);
		// Natures are calculated with 16-bit truncation.
		if (nature.plus === statName) {
			stat = this.ruleTable.has('overflowstatmod') ? Math.min(stat, 595) : stat;
			stat = tr(tr(stat * 110, 16) / 100);
		} else if (nature.minus === statName) {
			stat = this.ruleTable.has('overflowstatmod') ? Math.min(stat, 728) : stat;
			stat = tr(tr(stat * 90, 16) / 100);
		}
		return stat;
	},
};
