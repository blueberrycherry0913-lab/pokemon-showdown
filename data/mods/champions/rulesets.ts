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
	// Override NatDex Mod under mod=champions to lift the `natDexTier === 'Illegal'`
	// rejection. The user keeps the Illegal tag in their data/formats-data.ts as a
	// design marker for future use (e.g., gating not-yet-balanced Pokémon), but
	// Testing Standard should treat all species as legal by default — matching the
	// 'Full cross-gen Pokémon roster legal out of the box' goal in the implementation
	// guide. Everything else from base NatDex Mod (Unreleased / Unobtainable move /
	// non-standard item checks, the Mega/Primal/Ultra Tera onBegin clear) is kept.
	natdexmod: {
		inherit: true,
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const requireObtainable = this.ruleTable.has('obtainable');
			if (requireObtainable) {
				if (species.natDexTier === "Unreleased") {
					const basePokemon = this.toID(species.baseSpecies);
					if (this.ruleTable.has(`+pokemon:${species.id}`) || this.ruleTable.has(`+basepokemon:${basePokemon}`)) {
						return;
					}
					return [`${set.name || set.species} does not exist in the National Dex.`];
				}
				for (const moveid of set.moves) {
					const move = this.dex.moves.get(moveid);
					if (move.isNonstandard === 'Unobtainable' && move.gen === this.dex.gen || move.id === 'lightofruin') {
						if (this.ruleTable.has(`+move:${move.id}`)) continue;
						const problem = `${set.name}'s move ${move.name} does not exist in the National Dex.`;
						if (this.ruleTable.has('omunobtainablemoves')) {
							const { outOfBattleSpecies } = this.getValidationSpecies(set);
							if (!this.omCheckCanLearn(move, outOfBattleSpecies, this.allSources(outOfBattleSpecies), set, problem)) continue;
						}
						return [problem];
					}
				}
			}
			if (!set.item) return;
			let item = this.dex.items.get(set.item);
			let gen = this.dex.gen;
			while (item.isNonstandard && gen >= 7) {
				item = this.dex.forGen(gen).items.get(item.id);
				gen--;
			}
			if (requireObtainable && item.isNonstandard) {
				if (this.ruleTable.has(`+item:${item.id}`)) return;
				return [`${set.name}'s item ${item.name} does not exist in Gen ${this.dex.gen}.`];
			}
		},
	},
};
