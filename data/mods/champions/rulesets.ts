export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	// Forces every IV to 0 silently on validation. Used by Testing Standard.
	// The stat-math constants in champions/scripts.ts:statModify switch from a
	// 31-IV baseline to a 0-IV baseline when this rule is present. The
	// validator's `useStatPoints && !maxedIVs` check in sim/team-validator.ts
	// has been extended to also accept zeroed IVs so this clause doesn't
	// trip it.
	forceiv0: {
		effectType: 'ValidatorRule',
		name: 'Force IV 0',
		desc: "All IVs are forced to 0 (instead of the canonical 31). Pairs with the SP system to give a clean 0-EV / 0-IV baseline.",
		onChangeSet(set) {
			set.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
		},
	},
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
	// Override NatDex Mod under mod=champions to lift ALL of base NatDex Mod's
	// custom-content rejections:
	//   - species with natDexTier === 'Illegal'
	//   - species with natDexTier === 'Unreleased'
	//   - moves with isNonstandard === 'Unobtainable'
	//   - items with isNonstandard set (custom mega stones, etc.)
	// The user keeps the tags in data/formats-data.ts / data/items.ts as design
	// markers for future use, but Testing Standard should treat all custom
	// content as legal — matching the 'Full cross-gen roster legal out of the
	// box' goal in the implementation guide. Inherit: true preserves the rest
	// (ruleset adds +Unobtainable / +Past / Sketch Post-Gen 7, onBegin clears
	// Tera on Megas/Primals/Ultras).
	natdexmod: {
		inherit: true,
		onValidateSet() {
			// no-op — all base NatDex Mod legality checks intentionally lifted.
		},
	},
};
