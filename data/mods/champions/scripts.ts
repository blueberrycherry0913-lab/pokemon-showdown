export const Scripts: ModdedBattleScriptsData = {
	gen: 9,
	// Pokemon Champions SP (Stat Point) system: 1 SP = +1 to that stat at Level 50.
	// EV field is reinterpreted as SP (0-32 per stat, 66 total — enforced in
	// sim/team-validator.ts via `useStatPoints = dex.currentMod === 'champions'`
	// and sim/dex-formats.ts via evLimit = 66).
	//
	// Constants bake in the canonical "Level 50" baseline. If the format's
	// rule table includes 'Force IV 0' (Testing Standard's IV-removal clause),
	// we use 0-IV constants (+5 / +60). Otherwise the canonical Champions
	// behavior of treating stats as 31-IV-equivalent (+20 / +75) is preserved
	// for any future champions-mod format that wants it.
	statModify(baseStats, set, statName) {
		const tr = this.trunc;
		let stat = baseStats[statName];
		const evs = set.evs[statName];
		const force0IVs = this.ruleTable.has('forceiv0');
		const hpBaseline = force0IVs ? 60 : 75;
		const baseline = force0IVs ? 5 : 20;
		if (statName === 'hp') {
			return stat + evs + hpBaseline;
		}
		stat = stat + evs + baseline;
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
	pokemon: {
		// Don't revert Mega Evolutions (or Primal Reversions / Z-bursts) after fainting.
		// Diverges from base sim/pokemon.ts:formeChange by omitting `this.formeRegression = true`
		// inside the `source.effectType === 'Item'` branch. Everything else in this function
		// mirrors the base — kept verbatim so that mainline forme-change behavior (Tera,
		// Status-source like Shaymin-Sky, Ability-source) stays canon.
		// TODO: confirm interaction with Revival Blessing.
		formeChange(speciesId, source, isPermanent, abilitySlot = '0', message) {
			const rawSpecies = this.battle.dex.species.get(speciesId);

			const species = this.setSpecies(rawSpecies, source);
			if (!species) return false;

			if (this.battle.gen <= 2) return true;

			// The species the opponent sees
			const apparentSpecies =
				this.illusion ? this.illusion.species.name : species.baseSpecies;
			if (isPermanent) {
				this.baseSpecies = rawSpecies;
				this.details = this.getUpdatedDetails();
				let details = (this.illusion || this).details;
				if (this.terastallized) details += `, tera:${this.terastallized}`;
				this.battle.add('detailschange', this, details);
				this.updateMaxHp();
				if (!source) {
					// Tera forme
					// Ogerpon/Terapagos text goes here
					this.formeRegression = true;
				} else if (source.effectType === 'Item') {
					this.canTerastallize = null; // National Dex behavior
					if (source.zMove) {
						this.battle.add('-burst', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true; // Ultra Burst counts as an action for Truant
					} else if (source.isPrimalOrb) {
						if (this.illusion) {
							this.ability = '';
							this.battle.add('-primal', this.illusion, species.requiredItem);
						} else {
							this.battle.add('-primal', this, species.requiredItem);
						}
					} else {
						this.battle.add('-mega', this, apparentSpecies, species.requiredItem);
						this.moveThisTurnResult = true; // Mega Evolution counts as an action for Truant
					}
				} else if (source.effectType === 'Status') {
					// Shaymin-Sky -> Shaymin
					this.battle.add('-formechange', this, species.name, message);
				}
			} else {
				if (source?.effectType === 'Ability') {
					this.battle.add('-formechange', this, species.name, message, `[from] ability: ${source.name}`);
				} else {
					this.battle.add('-formechange', this, this.illusion ? this.illusion.species.name : species.name, message);
				}
			}
			if (isPermanent && (!source || !['disguise', 'iceface'].includes(source.id))) {
				if (this.illusion && source) {
					// Tera forme by Ogerpon or Terapagos breaks the Illusion
					this.ability = ''; // Don't allow Illusion to wear off
				}
				const ability = species.abilities[abilitySlot] || species.abilities['0'];
				// Ogerpon's forme change doesn't override permanent abilities
				if (source || !this.getAbility().flags['cantsuppress']) this.setAbility(ability, null, null, true);
				// However, its ability does reset upon switching out
				this.baseAbility = this.battle.toID(ability);
			}
			if (this.terastallized) {
				this.knownType = true;
				this.apparentType = this.terastallized;
			}
			return true;
		},
	},
};
