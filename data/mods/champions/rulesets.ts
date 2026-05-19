// True if `species` is part of a Gen 1 evolution family (Bulbasaur-Mew, num 1-151):
//   - The species itself is Gen 1 (gen === 1 or num 1-151)
//   - Or any species in its forward/backward evolution chain is Gen 1
//     (so Pichu / Munchlax / Magnezone / Rhyperior all qualify)
//   - Or it's a Mega / Primal / Ultra-Burst / G-Max forme of a Gen 1-lineage species
//     (Mega Venusaur X, Primal Groudon doesn't qualify since Groudon isn't Gen 1, etc.)
// Used by the Gen 1 Only validator clause below and mirrored in the client's
// build-indexes so the teambuilder UI shows the same set as legal.
function isGen1Lineage(dex: any, species: any): boolean {
	if (!species || !species.exists) return false;
	// Non-base formes inherit eligibility from their base species
	if (species.baseSpecies && species.baseSpecies !== species.name) {
		const base = dex.species.get(species.baseSpecies);
		if (base.exists && base.id !== species.id && isGen1Lineage(dex, base)) return true;
	}
	// Walk prevo chain back to the root of the family
	let root = species;
	let safety = 20;
	while (root.prevo && safety-- > 0) {
		const prev = dex.species.get(root.prevo);
		if (!prev.exists) break;
		root = prev;
	}
	return familyHasGen1Member(dex, root, new Set<string>());
}
function familyHasGen1Member(dex: any, species: any, seen: Set<string>): boolean {
	if (seen.has(species.id)) return false;
	seen.add(species.id);
	if (species.num >= 1 && species.num <= 151) return true;
	if (species.gen === 1) return true;
	if (species.evos) {
		for (const evoName of species.evos) {
			const evo = dex.species.get(evoName);
			if (evo.exists && familyHasGen1Member(dex, evo, seen)) return true;
		}
	}
	return false;
}

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	// Restrict Testing Standard to Gen 1 lineage Pokémon (Bulbasaur-Mew family,
	// their forward/backward evolutions, and their Mega/Primal/Ultra-Burst/G-Max
	// formes). Temporary — easy to remove by dropping 'Gen 1 Only' from the
	// format's ruleset.
	gen1only: {
		effectType: 'ValidatorRule',
		name: 'Gen 1 Only',
		desc: "Only Pokémon descended from a Gen 1 species (Bulbasaur-Mew, num 1-151) and their Mega/Primal/Ultra/G-Max formes are legal.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			if (!isGen1Lineage(this.dex, species)) {
				return [`${set.name || set.species} is not available yet.`];
			}
		},
	},
	// Enforces that set.ability must be one of the ability slots listed in the
	// species's pokedex entry. Replaces the '!Obtainable Abilities' lift — we
	// still keep that flag so the core learnset-based ability validation doesn't
	// fire (it's incompatible with custom data), but we enforce species-level
	// ability legality here ourselves.
	// For Mega formes the player picks a pre-mega ability, so we validate
	// against the base species's ability slots instead.
	speciesabilities: {
		effectType: 'ValidatorRule',
		name: 'Species Abilities',
		desc: "A Pokémon may only use abilities listed in its Pokédex entry.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const source = (species as any).isMega
				? this.dex.species.get(species.baseSpecies)
				: species;
			const legal = new Set(
				Object.values(source.abilities).map((a: any) => this.toID(a))
			);
			if (!legal.has(this.toID(set.ability))) {
				return [`${set.name || set.species} can't have ${set.ability}.`];
			}
		},
	},
	// Prevents a Pokémon from having the same ability in both the basic and
	// awakened (hidden) slots. Duplicate abilities give no strategic choice.
	nodupabilities: {
		effectType: 'ValidatorRule',
		name: 'No Dup Abilities',
		desc: "A Pokémon may not have the same ability in both its basic and awakened slots.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			const awakened = species.abilities['H'];
			if (awakened && this.toID(set.ability) === this.toID(awakened)) {
				return [`${set.name || set.species} has duplicate abilities.`];
			}
		},
	},
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
				// Gen 1 lineage always passes — the Gen 1 Only clause is the species gate.
				// natDexTier 'Illegal' is only enforced for non-Gen1 species.
				if (isGen1Lineage(this.dex, species)) return;
				if (this.ruleTable.has(`+pokemon:${species.id}`)) return;
				return [`${set.name || set.species} is not available yet.`];
			}
			const requireObtainable = this.ruleTable.has('obtainable');
			if (requireObtainable) {
				if (species.natDexTier === 'Unreleased') {
					const basePokemon = this.toID(species.baseSpecies);
					if (this.ruleTable.has(`+pokemon:${species.id}`) || this.ruleTable.has(`+basepokemon:${basePokemon}`)) {
						return;
					}
					return [`${set.name || set.species} is not available yet.`];
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
