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

// True if `species` is part of a Gen 8 evolution family (Grookey-Calyrex, nums 810-905):
//   - Any family member has num 810-905
//   - Or it's a forme of a Gen 8-lineage species (G-Max, regional, etc.)
// Mirrored in the client's build-indexes.
function isGen8Lineage(dex: any, species: any): boolean {
	if (!species || !species.exists) return false;
	if (species.baseSpecies && species.baseSpecies !== species.name) {
		const base = dex.species.get(species.baseSpecies);
		if (base.exists && base.id !== species.id && isGen8Lineage(dex, base)) return true;
	}
	let root = species;
	let safety = 20;
	while (root.prevo && safety-- > 0) {
		const prev = dex.species.get(root.prevo);
		if (!prev.exists) break;
		root = prev;
	}
	return familyHasGen8Member(dex, root, new Set<string>());
}
function familyHasGen8Member(dex: any, species: any, seen: Set<string>): boolean {
	if (seen.has(species.id)) return false;
	seen.add(species.id);
	if (species.num >= 810 && species.num <= 905) return true;
	if (species.evos) {
		for (const evoName of species.evos) {
			const evo = dex.species.get(evoName);
			if (evo.exists && familyHasGen8Member(dex, evo, seen)) return true;
		}
	}
	return false;
}

// Specific Pokémon added to Testing Standard as "Cosmic Additions" — hand-picked
// for Cosmic-type coverage. Not full lineages; just these individual species.
const COSMIC_ADDITION_NUMS = new Set([178, 606, 774]); // Xatu, Beheeyem, Minior
function isCosmicAddition(species: any): boolean {
	if (!species || !species.exists) return false;
	return COSMIC_ADDITION_NUMS.has(species.num);
}

// --- National Dex move legality (used by natdexmod below) -------------------
// Goal: the server verifier accepts exactly the moves the client teambuilder
// offers. The teambuilder treats a move as legal if it appears ANYWHERE in the
// species' evolution / forme learnset chain (full National Dex availability,
// including any custom moves the user added to data/learnsets.ts). We cannot use
// the engine's getFullLearnset here: under the champions mod it deliberately
// stops at the species' own entry (learnsetParent returns null for prevo — a
// quirk of the real Pokémon Champions game where every species has a
// self-contained learnset), which would wrongly reject prevo-inherited moves
// like Venusaur's Grass Whistle that the teambuilder still shows. We also avoid
// the standard checkCanLearn machinery, which walks Dex.forGen / Dex.mod('genX')
// for event/egg/transfer sources and would crash on the deleted gen 1-8 mods.
//
// Instead we replicate the client's firstLearnsetid + nextLearnsetid walk
// (play.pokemonshowdown.com/src/battle-dex-search.ts) reading getLearnsetData
// directly, so the two stay in lock-step.

// Special-forme learnset redirects — mirror of the client's nextLearnsetid.
// Also includes renamed base species where toID(name) !== dex key.
const LEARNSET_REDIRECTS: { [id: string]: string } = {
	gastrodoneast: 'gastrodon',
	pumpkaboosuper: 'pumpkaboo',
	sinisteaantique: 'sinistea',
	tatsugiristretchy: 'tatsugiri',
	// Renamed base species: species.id = toID(newName) but learnset is keyed by original dex key
	ninetalesfire: 'ninetales',
	cocommander: 'exeggutor',
	indeedeem: 'indeedee',
	toxtricityamped: 'toxtricity',
	tauroscombat: 'taurospaldeacombat',
	taurosblaze: 'taurospaldeablaze',
	taurosaqua: 'taurospaldeaaqua',
};

// The first species id in the chain that actually owns learnset data.
function firstLearnsetid(dex: any, species: any): string {
	if (LEARNSET_REDIRECTS[species.id]) return LEARNSET_REDIRECTS[species.id];
	if (dex.species.getLearnsetData(species.id).learnset) return species.id;
	let baseLearnsetid = dex.toID(species.baseSpecies);
	if (typeof species.battleOnly === 'string' && species.battleOnly !== species.baseSpecies) {
		baseLearnsetid = dex.toID(species.battleOnly);
	}
	if (baseLearnsetid && dex.species.getLearnsetData(baseLearnsetid).learnset) return baseLearnsetid;
	return '';
}

// Walk one step back along the chain (battleOnly → changesFrom → prevo, plus the
// Cap-Pikachu base-evo and Rockruff-Dusk special cases). Mirrors the client.
function nextLearnsetid(dex: any, learnsetid: string, species: any): string {
	if (learnsetid === 'lycanrocdusk' || (species.id === 'rockruff' && learnsetid === 'rockruff')) {
		return 'rockruffdusk';
	}
	const lsetSpecies = dex.species.get(learnsetid);
	if (!lsetSpecies.exists) return '';

	const next = lsetSpecies.battleOnly || lsetSpecies.changesFrom || lsetSpecies.prevo;
	if (next) return dex.toID(Array.isArray(next) ? next[0] : next);

	if (!lsetSpecies.prevo && lsetSpecies.baseSpecies && dex.species.get(lsetSpecies.baseSpecies).prevo) {
		let baseEvo = dex.species.get(lsetSpecies.baseSpecies);
		while (baseEvo.prevo) baseEvo = dex.species.get(baseEvo.prevo);
		return baseEvo.id;
	}
	return '';
}

// Gen 3 / Gen 4 HM moves. These can't be transferred up to modern gens, so a
// species only "knows" them in gen 9 if it has a gen 5+ source for them.
const GEN3_HMS = new Set(['cut', 'fly', 'surf', 'strength', 'flash', 'rocksmash', 'waterfall', 'dive']);
const GEN4_HMS = new Set(['cut', 'fly', 'surf', 'strength', 'rocksmash', 'waterfall', 'rockclimb']);

// True iff this learnset source list is gen-9-available, replicating the client
// teambuilder's global source-string builder (build-indexes lines 1147-1184).
// Ordinary moves are available from any source; gen 3/4 HM moves need a gen 5+
// source. Only consulted for nonstandard species (see natDexCanLearn) — standard
// species get every raw learnset move via the champions-table override loop.
function sourcesReachGen9(sources: string[], moveid: string): boolean {
	const gens = sources.map(s => parseInt(s.charAt(0)));
	const minGen = Math.min(...gens);
	if (minGen <= 4 && (GEN3_HMS.has(moveid) || GEN4_HMS.has(moveid))) {
		let available = false;
		if (minGen === 3) available = true;
		if (available) available = !GEN3_HMS.has(moveid);
		if (available || gens.includes(4)) available = true;
		if (available) available = !GEN4_HMS.has(moveid);
		if (available) return true;
		return gens.some(g => g > 4);
	}
	return true;
}

// True if `moveid` appears anywhere in `species`'s full learnset chain, matching
// exactly what the teambuilder offers. The client's champions learnset table is
// built per-ancestor: a STANDARD species contributes every move in its raw
// learnset (build-indexes loop 1, marked '9a' unconditionally), while a
// NONSTANDARD species (custom / Past / CAP / etc.) only contributes moves whose
// sources reach gen 9 (the HM-filtered global fallback, loop 2). We mirror that
// distinction per chain step.
function natDexCanLearn(dex: any, species: any, moveid: string): boolean {
	let learnsetid = firstLearnsetid(dex, species);
	const seen = new Set<string>();
	while (learnsetid && !seen.has(learnsetid)) {
		seen.add(learnsetid);
		const learnset = dex.species.getLearnsetData(learnsetid).learnset;
		const sources = learnset && learnset[moveid];
		if (sources) {
			const lsetSpecies = dex.species.get(learnsetid);
			if (!lsetSpecies.isNonstandard || sourcesReachGen9(sources, moveid)) return true;
		}
		learnsetid = nextLearnsetid(dex, learnsetid, species);
	}
	return false;
}

export const Rulesets: import('../../../sim/dex-formats').ModdedFormatDataTable = {
	// Restrict Testing Standard to Gen 1 lineage (Bulbasaur-Mew), Gen 8 lineage
	// (Grookey-Calyrex), or Cosmic Additions (Xatu, Beheeyem, Minior).
	// Temporary — easy to remove by dropping 'Gen 1 Only' from the format's ruleset.
	gen1only: {
		effectType: 'ValidatorRule',
		name: 'Gen 1 Only',
		desc: "Only Gen 1 lineage (Bulbasaur-Mew), Gen 8 lineage (Grookey-Calyrex), or Cosmic Additions (Xatu, Beheeyem, Minior) are legal.",
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			if ((species as any).canLearnAnyMove) return; // utility test species, always legal
			if (!isGen1Lineage(this.dex, species) && !isGen8Lineage(this.dex, species) && !isCosmicAddition(species)) {
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
			if ((species as any).canLearnAnyMove) return; // utility test species, skip ability gating
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
			if ((species as any).canLearnAnyMove) return; // utility test species, skip dup check
			// The effective awakened ability is set.ability2 (player override) or species H-slot.
			const ability2Override = (set as any).ability2 as string | undefined;
			const awakened = (ability2Override && ability2Override !== '') ? ability2Override : species.abilities['H'];
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
		// Mega → base-form conversion: when the teambuilder submits a mega species,
		// silently convert to the base species + mega stone so the battle starts with
		// the pre-mega Pokémon. The format's onBeforeMove auto-triggers mega evolution
		// on the first move, and the formeChange override in scripts.ts keeps it
		// permanent. The teambuilder continues to show mega stats for planning.
		onChangeSet(set) {
			const species = this.dex.species.get(set.species);
			if (species.isMega && species.requiredItem) {
				// Convert to base form + stone
				set.item = species.requiredItem;
				set.species = species.baseSpecies;
				// Pick the base form's first ability (pre-mega ability)
				const base = this.dex.species.get(species.baseSpecies);
				if (base.exists) set.ability = base.abilities['0'];
			}
		},
		onValidateSet(set) {
			const species = this.dex.species.get(set.species);
			if (species.natDexTier === 'Illegal') {
				if (this.ruleTable.has(`+pokemon:${species.id}`)) return;
				// Gen 1 lineage is legal by default (Gen 1 Only is the species gate),
				// but honor an explicit Illegal tag on regional/alt formes the user has
				// gated. Keep Megas, custom species, and cosmetic 'Other'-bucket formes
				// (Gmax / Cosplay / Cap / Starter / Spiky-eared) always legal — these
				// mirror the teambuilder's Megas/Other/Custom buckets in build-indexes.
				if (isGen1Lineage(this.dex, species) || isGen8Lineage(this.dex, species)) {
					if ((species as any).isMega) return;
					if (species.isNonstandard === 'custom') return;
					const otherFormes = [
						'Cosplay', 'Rock-Star', 'Belle', 'Pop-Star', 'PhD', 'Libre',
						'Original', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Partner', 'World',
						'Spiky-eared', 'Starter',
					];
					if (species.forme && (species.forme.endsWith('Gmax') || otherFormes.includes(species.forme))) return;
				}
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
				// National Dex move-legality check. Mirrors the client teambuilder's
				// canLearn (see natDexCanLearn above): a move is legal if it appears
				// anywhere in the species' full evolution/forme learnset chain. This is
				// the move verifier — it rejects moves the species can't learn while
				// honoring every custom move the user added to data/learnsets.ts.
				// Mega formes were already converted to their base species + stone in
				// onChangeSet above, so set.species is the pre-mega form whose learnset
				// (e.g. Venusaur) is what we validate against.
				const moveSpecies = this.dex.species.get(set.species);
				if (!(moveSpecies as any).canLearnAnyMove) {
					const problems: string[] = [];
					for (const moveid of set.moves) {
						const move = this.dex.moves.get(moveid);
						if (!move.exists) continue;
						if (this.ruleTable.has(`+move:${move.id}`)) continue;
						if (!natDexCanLearn(this.dex, moveSpecies, move.id)) {
							problems.push(`${set.name || set.species} can't learn ${move.name}.`);
						}
					}
					if (problems.length) return problems;
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
