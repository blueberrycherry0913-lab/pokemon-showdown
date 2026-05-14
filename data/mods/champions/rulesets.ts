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
	// Mirror base NatDex Mod's onValidateSet — same gating rules so the user's
	// data-layer tags (`natDexTier: 'Illegal' | 'Unreleased'`, `isNonstandard`
	// on moves/items) actually gate content. Only divergence from base: drop
	// the `Dex.forGen(gen).items.get(...)` walk-back loop, because Step 1
	// deleted every gen 1-8 mod folder, so forGen(8) etc. crash. Walking back
	// is irrelevant for the user's rework anyway — there's no older-gen copy
	// of custom items.
	natdexmod: {
		inherit: true,
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			if (species.natDexTier === 'Illegal') {
				if (this.ruleTable.has(`+pokemon:${species.id}`)) return;
				return [`${set.name || set.species} does not exist in the National Dex.`];
			}
			const requireObtainable = this.ruleTable.has('obtainable');
			if (requireObtainable) {
				if (species.natDexTier === 'Unreleased') {
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
						return [`${set.name}'s move ${move.name} does not exist in the National Dex.`];
					}
				}
			}
			if (!set.item) return;
			const item = this.dex.items.get(set.item);
			// Only reject `isNonstandard === 'Unobtainable'` (the canonical gating
			// tag). Items tagged 'Past' / 'Future' / 'CAP' / etc. pass. Base
			// NatDex Mod rejects any isNonstandard truthy but uses a walk-back
			// loop to find a standard older-gen version; we can't walk back
			// because gen 1-8 mods are deleted, so we relax the check to only
			// gate on 'Unobtainable'.
			if (requireObtainable && item.isNonstandard === 'Unobtainable') {
				if (this.ruleTable.has(`+item:${item.id}`)) return;
				return [`${set.name}'s item ${item.name} does not exist in the National Dex.`];
			}
		},
	},
};
