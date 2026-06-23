/*

Ratings and how they work:

-1: Detrimental
	  An ability that severely harms the user.
	ex. Defeatist, Slow Start

 0: Useless
	  An ability with no overall benefit in a singles battle.
	ex. Color Change, Plus

 1: Ineffective
	  An ability that has minimal effect or is only useful in niche situations.
	ex. Light Metal, Suction Cups

 2: Useful
	  An ability that can be generally useful.
	ex. Flame Body, Overcoat

 3: Effective
	  An ability with a strong effect on the user or foe.
	ex. Chlorophyll, Sturdy

 4: Very useful
	  One of the more popular abilities. It requires minimal support to be effective.
	ex. Adaptability, Magic Bounce

 5: Essential
	  The sort of ability that defines metagames.
	ex. Imposter, Shadow Tag

*/

export const Abilities: import('../sim/dex-abilities').AbilityDataTable = {
	noability: {
		isNonstandard: "Past",
		flags: {},
		name: "No Ability",
		rating: 0.1,
		num: 0,
	},
	adaptability: {
		onModifySTAB(stab, source, target, move) {
			if (move.forceSTAB || source.hasType(move.type)) {
				if (stab === 2) {
					return 2.25;
				}
				return 2;
			}
		},
		flags: {},
		name: "Adaptability",
		rating: 4,
		num: 91,
	},
	aerilate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Flying';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Flying-type moves and increases their power by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Aerilate",
		rating: 4,
		num: 184,
	},
	aftermath: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (!target.hp) {
				for (const pokemon of this.getAllActive()) {
					if (pokemon === target) continue;
					this.damage(pokemon.baseMaxhp / 4, pokemon, target);
				}
			}
		},
		shortDesc: "Explodes upon fainting, dealing 1/4th max HP damage to the whole battlefield.",
		origin: 'Buffed',
		flags: {},
		name: "Aftermath",
		rating: 3,
		num: 106,
	},
	airlock: {
		onSwitchIn(pokemon) {
			this.add('-ability', pokemon, 'Air Lock');
			if (this.field.weather) {
				this.field.clearWeather();
			}
		},
		shortDesc: "When this Pokémon enters battle, the current weather is fully removed.",
		origin: 'Buffed',
		flags: {},
		name: "Air Lock",
		rating: 2,
		num: 76,
	},
	analytic: {
		onBasePowerPriority: 21,
		onBasePower(basePower, pokemon, target, move) {
			if (target && !this.queue.willMove(target)) {
				this.debug('Analytic boost');
				return this.chainModify([5325, 4096]);
			}
		},
		shortDesc: "Increases the power of moves by x1.3 if moving after all targets of the attack.",
		origin: 'Buffed',
		flags: {},
		name: "Analytic",
		rating: 3,
		num: 148,
	},
	angerpoint: {
		onHit(target, source, move) {
			if (!target.hp) return;
			if (move?.effectType === 'Move' && target.getMoveHitData(move).crit) {
				const isAlly = source && source.side === target.side;
				if (isAlly) {
					// Ally crit: boost Attack up to +3 stages, but never lower it
					const delta = 3 - (target.boosts.atk ?? 0);
					if (delta > 0) this.boost({ atk: delta }, target, target);
				} else {
					// Foe crit: max Attack to +6
					this.boost({ atk: 12 }, target, target);
				}
			}
		},
		shortDesc: "Maxes Attack after a foe's critical hit; sets Attack to +3 stages after an ally's critical hit.",
		origin: 'Nerfed',
		flags: {},
		name: "Anger Point",
		rating: 1,
		num: 83,
	},
	angershell: {
		onDamage(damage, target, source, effect) {
			this.effectState.checkedAngerShell = !(
				effect.effectType === "Move" && !effect.multihit &&
				!(effect.hasSheerForce && source.hasAbility('sheerforce'))
			);
		},
		onTryEatItem(item) {
			const healingItems = [
				'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry', 'berryjuice',
			];
			if (healingItems.includes(item.id)) {
				return this.effectState.checkedAngerShell;
			}
			return true;
		},
		onAfterMoveSecondary(target, source, move) {
			this.effectState.checkedAngerShell = true;
			if (!source || source === target || !target.hp || !move.totalDamage) return;
			const lastAttackedBy = target.getLastAttackedBy();
			if (!lastAttackedBy) return;
			const damage = move.multihit ? move.totalDamage : lastAttackedBy.damage;
			if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
				this.boost({ atk: 1, spa: 1, spe: 1, def: -1, spd: -1 }, target, target);
			}
		},
		shortDesc: "Lowers Defense/Sp. Def by 1 stage and raises Attack/Sp. Atk/Speed by 1 stage when HP drops below half.",
		origin: 'Unchanged',
		flags: {},
		name: "Anger Shell",
		rating: 3,
		num: 271,
	},
	angrysleeper: {
		// Detect sleep status at end of previous turn; double power on wake-up turn.
		onResidualOrder: 30,
		onResidual(pokemon) {
			this.effectState.wasSleeping = (pokemon.status === 'slp');
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (this.effectState.wasSleeping && !attacker.status && move.category !== 'Status') {
				this.effectState.wasSleeping = false;
				return this.chainModify(2);
			}
		},
		shortDesc: "Attacks on the turn this Pokémon wakes from sleep are doubled in power.",
		origin: 'Custom',
		flags: {},
		name: "Angry Sleeper",
		rating: 2,
		num: 10020,
	},
	anticipation: {
		onStart(pokemon) {
			// Initialize state and mark all current foes as already-seen so
			// onAnySwitchIn doesn't re-fire for opponents already on the field.
			pokemon.abilityState.seenFoes = new Set<Pokemon>();
			pokemon.abilityState.anticipatedFoes = new Set<Pokemon>();
			for (const foe of pokemon.foes()) {
				pokemon.abilityState.seenFoes.add(foe);
			}
		},
		onAnySwitchInPriority: -1,
		onAnySwitchIn() {
			const holder = this.effectState.target;
			if (!holder.isActive) return;
			if (!holder.abilityState.seenFoes) return;
			for (const foe of holder.foes()) {
				if ((holder.abilityState.seenFoes as Set<Pokemon>).has(foe)) continue;
				(holder.abilityState.seenFoes as Set<Pokemon>).add(foe);
				for (const moveSlot of foe.moveSlots) {
					const move = this.dex.moves.get(moveSlot.move);
					if (move.category === 'Status') continue;
					const moveType = move.id === 'hiddenpower' ? foe.hpType : move.type;
					if (
						(this.dex.getImmunity(moveType, holder) && this.dex.getEffectiveness(moveType, holder) > 0) ||
						move.ohko || move.selfdestruct
					) {
						this.add('-ability', holder, 'Anticipation');
						(holder.abilityState.anticipatedFoes as Set<Pokemon>).add(foe);
						break;
					}
				}
			}
		},
		onModifyDamage(damage, source, target, move) {
			if (!(target.abilityState.anticipatedFoes as Set<Pokemon> | undefined)?.has(source)) return;
			const moveType = move.id === 'hiddenpower' ? source.hpType : move.type;
			if (
				(this.dex.getImmunity(moveType, target) && this.dex.getEffectiveness(moveType, target) > 0) ||
				move.ohko || move.selfdestruct
			) {
				return this.chainModify(0.25);
			}
		},
		onFoeAfterMove(source, target, move) {
			(this.effectState.target.abilityState.anticipatedFoes as Set<Pokemon> | undefined)?.delete(source);
		},
		shortDesc: "Senses a foe's dangerous moves; if immediately attacked with one of those moves, the Pokémon takes 75% less damage.",
		origin: 'Buffed',
		flags: {},
		name: "Anticipation",
		rating: 2,
		num: 107,
	},
	antidomain: {
		onStart(pokemon) {
			this.field.addPseudoWeather('antidomain', pokemon, this.effect);
		},
		onEnd(pokemon) {
			if (this.field.pseudoWeather['antidomain']?.source === pokemon) {
				this.field.removePseudoWeather('antidomain');
			}
		},
		shortDesc: "Eliminates the effects of a Domain while on the field.",
		origin: 'Custom',
		flags: {},
		name: "Anti-Domain",
		rating: 3,
		num: 10005,
	},
	arenatrap: {
		onFoeTrapPokemon(pokemon) {
			if (!pokemon.isAdjacent(this.effectState.target)) return;
			if (pokemon.isGrounded()) {
				pokemon.tryTrap(true);
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			if (pokemon.isGrounded(!pokemon.knownType)) { // Negate immunity if the type is unknown
				pokemon.maybeTrapped = true;
			}
		},
		onTrapPokemon(pokemon) {
			if (pokemon.isGrounded()) {
				pokemon.tryTrap(true);
			}
		},
		onMaybeTrapPokemon(pokemon) {
			if (pokemon.isGrounded(!pokemon.knownType)) {
				pokemon.maybeTrapped = true;
			}
		},
		shortDesc: "Prevents both the Pokémon and foe from fleeing. Does not work on ungrounded targets.",
		origin: 'Nerfed',
		flags: {},
		name: "Arena Trap",
		rating: 4,
		num: 71,
	},
	armortail: {
		onFoeTryMove(target, source, move) {
			const targetAllExceptions = ['perishsong', 'flowershield', 'rototiller'];
			if (move.target === 'foeSide' || (move.target === 'all' && !targetAllExceptions.includes(move.id))) {
				return;
			}

			const armorTailHolder = this.effectState.target;
			if ((source.isAlly(armorTailHolder) || move.target === 'all') && move.priority > 0.1) {
				this.attrLastMove('[still]');
				this.add('cant', armorTailHolder, 'ability: Armor Tail', move, `[of] ${target}`);
				return false;
			}
		},
		shortDesc: "Prevents opponent using priority moves.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Armor Tail",
		rating: 2.5,
		num: 296,
	},
	aromaveil: {
		onAllyTryAddVolatile(status, target, source, effect) {
			if (['attract', 'disable', 'encore', 'healblock', 'taunt', 'torment'].includes(status.id)) {
				if (effect.effectType === 'Move') {
					const effectHolder = this.effectState.target;
					this.add('-block', target, 'ability: Aroma Veil', `[of] ${effectHolder}`);
				}
				return null;
			}
		},
		shortDesc: "Protects self and allies from moves or abilities that limit their move choices. (Taunt, Encore, Cursed Body, etc)",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Aroma Veil",
		rating: 2,
		num: 165,
	},
	asoneglastrier: {
		onSwitchInPriority: 1,
		onStart(pokemon) {
			if (this.effectState.unnerved) return;
			this.add('-ability', pokemon, 'As One');
			this.add('-ability', pokemon, 'Unnerve');
			this.effectState.unnerved = true;
		},
		onEnd() {
			this.effectState.unnerved = false;
		},
		onFoeTryEatItem() {
			return !this.effectState.unnerved;
		},
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				this.boost({ atk: length }, source, source, this.dex.abilities.get('chillingneigh'));
			}
		},
		shortDesc: "Combines Unnerve and Chilling Neigh/Grim Neigh.",
		origin: 'Depreciated',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "As One (Glastrier)",
		rating: 3.5,
		num: 266,
	},
	asonespectrier: {
		onSwitchInPriority: 1,
		onStart(pokemon) {
			if (this.effectState.unnerved) return;
			this.add('-ability', pokemon, 'As One');
			this.add('-ability', pokemon, 'Unnerve');
			this.effectState.unnerved = true;
		},
		onEnd() {
			this.effectState.unnerved = false;
		},
		onFoeTryEatItem() {
			return !this.effectState.unnerved;
		},
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				this.boost({ spa: length }, source, source, this.dex.abilities.get('grimneigh'));
			}
		},
		shortDesc: "Combines Unnerve and Chilling Neigh/Grim Neigh.",
		origin: 'Depreciated',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "As One (Spectrier)",
		rating: 3.5,
		num: 267,
	},
	aurabreak: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Aura Break');
		},
		onAnyTryPrimaryHit(target, source, move) {
			if (target === source || move.category === 'Status') return;
			move.hasAuraBreak = true;
		},
		shortDesc: "Reduces power of Dark- and Fairy-type moves.",
		origin: 'Depreciated',
		flags: { breakable: 1 },
		name: "Aura Break",
		rating: 1,
		num: 188,
	},
	baddreams: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (!pokemon.hp) return;
			for (const target of pokemon.foes()) {
				if (target.status === 'slp' || target.hasAbility('comatose')) {
					this.damage(target.baseMaxhp / 8, target, pokemon);
				}
			}
		},
		onFoeTryHeal(damage, target, source, effect) {
			if (effect?.id === 'rest') {
				this.hint("Bad Dreams prevents Rest's healing effect.");
				return false;
			}
		},
		shortDesc: "Prevents Rest's healing for sleeping foes; deals 1/8th MaxHP damage to sleeping foes per turn.",
		origin: 'Buffed',
		flags: {},
		name: "Bad Dreams",
		rating: 1.5,
		num: 123,
	},
	ballfetch: {
		onTryHit(target, source, move) {
			if ((!move.flags['ball'] && !move.flags['bursting']) || !source) return;
			this.add('-ability', target, 'Ball Fetch');
			if (move.basePower && move.category !== 'Status') {
				const atkStat = move.category === 'Special' ? 'spa' : 'atk';
				const defStat = move.category === 'Special' ? 'spd' : 'def';
				const atk = source.getStat(atkStat);
				const def = source.getStat(defStat);
				const damage = Math.max(1, Math.floor(
					Math.floor(Math.floor(2 * source.level / 5 + 2) * move.basePower * atk / def) / 50
				) + 2);
				this.damage(damage, source, target);
			}
			return null;
		},
		onAllyTryHit(target, source, move) {
			if ((!move.flags['ball'] && !move.flags['bursting']) || !source) return;
			const holder = this.effectState.target;
			this.add('-ability', holder, 'Ball Fetch');
			if (move.basePower && move.category !== 'Status') {
				const atkStat = move.category === 'Special' ? 'spa' : 'atk';
				const defStat = move.category === 'Special' ? 'spd' : 'def';
				const atk = source.getStat(atkStat);
				const def = source.getStat(defStat);
				const damage = Math.max(1, Math.floor(
					Math.floor(Math.floor(2 * source.level / 5 + 2) * move.basePower * atk / def) / 50
				) + 2);
				this.damage(damage, source, holder);
			}
			return null;
		},
		shortDesc: "Pokémon will fetch foe's Ball or Bursting attacks and return them at full power.",
		origin: 'Buffed',
		flags: {},
		name: "Ball Fetch",
		rating: 2,
		num: 237,
	},
	battery: {
		onAllyBasePowerPriority: 22,
		onAllyBasePower(basePower, attacker, defender, move) {
			if (attacker !== this.effectState.target && move.type === 'Electric') {
				this.debug('Battery boost');
				return this.chainModify([8192, 4096]);
			}
		},
		shortDesc: "Doubles the power of teammates' Electric-type moves.",
		origin: 'Reworked',
		flags: {},
		name: "Battery",
		rating: 0,
		num: 217,
	},
	battlearmor: {
		onCriticalHit: false,
		onModifySecondaries(secondaries) {
			return secondaries.map(effect => {
				if (!effect.self) return {...effect, chance: Math.ceil((effect.chance || 100) / 2)};
				return effect;
			});
		},
		shortDesc: "Protected from crits; secondary effects against this Pokémon have halved chances.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Battle Armor",
		rating: 2,
		num: 4,
	},
	battlebond: {
		onSourceAfterFaint(length, target, source, effect) {
			if (source.bondTriggered) return;
			if (effect?.effectType !== 'Move') return;
			if (source.species.id === 'greninjabond' && source.hp && !source.transformed && source.side.foePokemonLeft()) {
				this.boost({ atk: 1, spa: 1, spe: 1 }, source, source, this.effect);
				this.add('-activate', source, 'ability: Battle Bond');
				source.bondTriggered = true;
			}
		},
		onModifyMovePriority: -1,
		onModifyMove(move, attacker) {
			if (move.id === 'watershuriken' && attacker.species.name === 'Greninja-Ash' &&
				!attacker.transformed) {
				move.multihit = 3;
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Battle Bond",
		rating: 3.5,
		num: 210,
	},
	beadsofruin: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Beads of Ruin');
		},
		onAnyModifySpD(spd, target, source, move) {
			const abilityHolder = this.effectState.target;
			if (target.hasAbility('Beads of Ruin')) return;
			if (!move.ruinedSpD?.hasAbility('Beads of Ruin')) move.ruinedSpD = abilityHolder;
			if (move.ruinedSpD !== abilityHolder) return;
			this.debug('Beads of Ruin SpD drop');
			return this.chainModify(0.75);
		},
		shortDesc: "Lowers Special Defense of all Pokémon except itself by 25%.",
		origin: 'Unchanged',
		flags: {},
		name: "Beads of Ruin",
		rating: 4.5,
		num: 284,
	},
	beastboost: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				const bestStat = source.getBestStat(true, true);
				this.boost({ [bestStat]: length }, source);
			}
		},
		shortDesc: "The Pokémon boosts its most proficient stat by 1 stage each time it knocks out a Pokémon.",
		origin: 'Unchanged',
		flags: {},
		name: "Beast Boost",
		rating: 3.5,
		num: 224,
	},
	berserk: {
		onDamage(damage, target, source, effect) {
			this.effectState.checkedBerserk = !(
				effect.effectType === "Move" && !effect.multihit &&
				!(effect.hasSheerForce && source.hasAbility('sheerforce'))
			);
		},
		onTryEatItem(item) {
			const healingItems = [
				'aguavberry', 'enigmaberry', 'figyberry', 'iapapaberry', 'magoberry', 'sitrusberry', 'wikiberry', 'oranberry', 'berryjuice',
			];
			if (healingItems.includes(item.id)) {
				return this.effectState.checkedBerserk;
			}
			return true;
		},
		onAfterMoveSecondary(target, source, move) {
			this.effectState.checkedBerserk = true;
			if (!source || source === target || !target.hp || !move.totalDamage) return;
			const lastAttackedBy = target.getLastAttackedBy();
			if (!lastAttackedBy) return;
			const damage = move.multihit && !move.smartTarget ? move.totalDamage : lastAttackedBy.damage;
			if (target.hp <= target.maxhp / 2 && target.hp + damage > target.maxhp / 2) {
				this.boost({ spa: 1, atk: 1 }, target, target);
			}
		},
		shortDesc: "Raises Attack and Special Attack by 1 stage when HP drops below half.",
		origin: 'Buffed',
		flags: {},
		name: "Berserk",
		rating: 2,
		num: 201,
	},
	bigpecks: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.def && boost.def < 0) {
				delete boost.def;
				if (!(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "Defense", "[from] ability: Big Pecks", `[of] ${target}`);
				}
			}
		},
		flags: { breakable: 1 },
		name: "Big Pecks",
		rating: 0.5,
		num: 145,
	},
	blaze: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Fire' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Blaze boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Fire' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Blaze boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Powers up Fire-type moves by x1.5 when below 1/3 MaxHP.",
		origin: 'Unchanged',
		flags: {},
		name: "Blaze",
		rating: 2,
		num: 66,
	},
	bulletproof: {
		onTryHit(target, source, move) {
			if (move.flags['bullet'] || move.flags['ball']) {
				this.add('-immune', target, '[from] ability: Bulletproof');
				return null;
			}
		},
		shortDesc: "Pokémon is immune to Bullet and Ball moves.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Bulletproof",
		rating: 3,
		num: 171,
	},
	burningsoul: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			return this.chainModify(pokemon.hp / pokemon.maxhp + 0.5);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			return this.chainModify(pokemon.hp / pokemon.maxhp + 0.5);
		},
		shortDesc: "Attack and Sp. Atk scale with remaining HP: ×1.5 at 100% HP, ×1.0 at 50% HP, ~×0.51 at 1% HP.",
		origin: 'Custom',
		flags: {},
		name: "Burning Soul",
		rating: 2,
		num: 10001,
	},
	cagefighter: {
		// Double Attack and Defense while the Pokémon cannot switch out.
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (pokemon.volatiles['trapped'] || pokemon.volatiles['ingrain'] ||
				pokemon.volatiles['partiallytrapped'] || pokemon.maybeTrapped) {
				return this.chainModify(2);
			}
		},
		onModifyDefPriority: 6,
		onModifyDef(def, pokemon) {
			if (pokemon.volatiles['trapped'] || pokemon.volatiles['ingrain'] ||
				pokemon.volatiles['partiallytrapped'] || pokemon.maybeTrapped) {
				return this.chainModify(2);
			}
		},
		shortDesc: "Doubles Attack and Defense when the Pokémon cannot switch out.",
		origin: 'Custom',
		flags: {},
		name: "Cage Fighter",
		rating: 2.5,
		num: 10014,
	},
	cheekpouch: {
		onEatItem(item, pokemon) {
			this.heal(pokemon.baseMaxhp / 3);
		},
		shortDesc: "Restores additional 1/3 MaxHP when a Berry is consumed.",
		origin: 'Unchanged',
		flags: {},
		name: "Cheek Pouch",
		rating: 2,
		num: 167,
	},
	chillingneigh: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				this.boost({ atk: length }, source);
			}
		},
		flags: {},
		name: "Chilling Neigh",
		rating: 3,
		num: 264,
	},
	chlorophyll: {
		onModifySpe(spe, pokemon) {
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(2);
			}
			if (this.field.pseudoWeather['grassdomain']) {
				return this.chainModify(2);
			}
		},
		shortDesc: "Doubles the Pokémon's Speed in Grass Domain or Harsh Sun.",
		origin: 'Altered',
		flags: {},
		name: "Chlorophyll",
		rating: 3,
		num: 34,
	},
	clearbody: {
		onTryBoost(boost, target, source, effect) {
			if (source && target !== source) {
				let showMsg = false;
				let i: BoostID;
				for (i in boost) {
					if ((boost[i] as number) < 0) {
						delete boost[i];
						showMsg = true;
					}
				}
				if (showMsg && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
					this.add("-fail", target, "unboost", "[from] ability: Clear Body", `[of] ${target}`);
				}
			}
		},
		shortDesc: "Pokemon cannot have its stats dropped by a foe.",
		origin: 'Unchanged',
		flags: {breakable: 1},
		name: "Clear Body",
		rating: 2,
		num: 29,
	},
	cloudnine: {
		onSwitchIn(pokemon) {
			// Cloud Nine does not activate when Skill Swapped or when Neutralizing Gas leaves the field
			this.add('-ability', pokemon, 'Cloud Nine');
			((this.effect as any).onStart as (p: Pokemon) => void).call(this, pokemon);
		},
		onStart(pokemon) {
			pokemon.abilityState.ending = false; // Clear the ending flag
			this.eachEvent('WeatherChange', this.effect);
		},
		onEnd(pokemon) {
			pokemon.abilityState.ending = true;
			this.eachEvent('WeatherChange', this.effect);
		},
		suppressWeather: true,
		flags: {},
		name: "Cloud Nine",
		rating: 1.5,
		num: 13,
	},
	colorchange: {
		onTryHit(target, source, move) {
			if (!target.hp) return;
			const type = move.type;
			if (
				target.isActive && move.effectType === 'Move' && move.category !== 'Status' &&
				type !== '???' && !target.hasType(type)
			) {
				if (!target.setType(type)) return false;
				this.add('-start', target, 'typechange', type, '[from] ability: Color Change');

				if (target.side.active.length === 2 && target.position === 1) {
					// Curse Glitch
					const action = this.queue.willMove(target);
					if (action && action.move.id === 'curse') {
						action.targetLoc = -1;
					}
				}
			}
		},
		shortDesc: "Changes the Pokémon's type to the foe's move's type before it lands.",
		origin: 'Buffed',
		flags: {},
		name: "Color Change",
		rating: 0,
		num: 16,
	},
	comatose: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Comatose');
		},
		onSetStatus(status, target, source, effect) {
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Comatose');
			}
			return false;
		},
		// Permanent sleep "status" implemented in the relevant sleep-checking effects
		shortDesc: "The Pokémon is always treated as if it is asleep, but can still act normally. Does not feel the negative effects of being asleep.",
		origin: 'Unchanged',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Comatose",
		rating: 4,
		num: 213,
	},
	combobreaker: {
		// +1 priority on the turn after using an attack.
		onModifyPriority(priority, pokemon, target, move) {
			if (move.category === 'Status') return;
			if (this.effectState.movedLastTurn) return priority + 1;
		},
		onResidualOrder: 5,
		onResidual(pokemon) {
			this.effectState.movedLastTurn = !!pokemon.moveThisTurn;
		},
		shortDesc: "Gains +1 priority on the turn after using an attack.",
		origin: 'Custom',
		flags: {},
		name: "Combo Breaker",
		rating: 2.5,
		num: 10013,
	},
	commander: {
		onAnySwitchInPriority: -2,
		onAnySwitchIn() {
			((this.effect as any).onUpdate as (p: Pokemon) => void).call(this, this.effectState.target);
		},
		onStart(pokemon) {
			((this.effect as any).onUpdate as (p: Pokemon) => void).call(this, pokemon);
		},
		onUpdate(pokemon) {
			if (this.gameType !== 'doubles') return;
			// don't run between when a Pokemon switches in and the resulting onSwitchIn event
			if (this.queue.peek()?.choice === 'runSwitch') return;

			const ally = pokemon.allies()[0];
			if (pokemon.switchFlag || ally?.switchFlag) return;
			if (!ally || pokemon.baseSpecies.baseSpecies !== 'Tatsugiri' || ally.baseSpecies.baseSpecies !== 'Dondozo') {
				// Handle any edge cases
				if (pokemon.getVolatile('commanding')) pokemon.removeVolatile('commanding');
				return;
			}

			if (!pokemon.getVolatile('commanding')) {
				// If Dondozo already was commanded this fails
				if (ally.getVolatile('commanded')) return;
				// Cancel all actions this turn for pokemon if applicable
				this.queue.cancelAction(pokemon);
				// Add volatiles to both pokemon
				this.add('-activate', pokemon, 'ability: Commander', `[of] ${ally}`);
				pokemon.addVolatile('commanding');
				ally.addVolatile('commanded', pokemon);
				// Continued in conditions.ts in the volatiles
			} else {
				if (!ally.fainted) return;
				pokemon.removeVolatile('commanding');
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
		name: "Commander",
		rating: 0,
		num: 279,
	},
	competitive: {
		onAfterEachBoost(boost, target, source, effect) {
			if (!source || target.isAlly(source)) {
				return;
			}
			let statsLowered = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					statsLowered = true;
				}
			}
			if (statsLowered) {
				this.boost({ spa: 2 }, target, target, null, false, true);
			}
		},
		shortDesc: "Raises Special Attack by 2 stages when the Pokémon's stats are lowered by a foe.",
		origin: 'Unchanged',
		flags: {},
		name: "Competitive",
		rating: 2.5,
		num: 172,
	},
	compoundeyes: {
		onSourceModifyAccuracyPriority: -1,
		onSourceModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			this.debug('compoundeyes - enhancing accuracy');
			return this.chainModify([5325, 4096]);
		},
		shortDesc: "The Pokémon's accuracy is boosted by a x1.3 multiplier.",
		origin: 'Unchanged',
		flags: {},
		name: "Compound Eyes",
		rating: 3,
		num: 14,
	},
	contrary: {
		onChangeBoost(boost, target, source, effect) {
			if (effect && effect.id === 'zpower') return;
			let i: BoostID;
			for (i in boost) {
				boost[i]! *= -1;
			}
		},
		shortDesc: "Makes stat changes have an opposite effect.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Contrary",
		rating: 4.5,
		num: 126,
	},
	corrosion: {
		// Implemented in sim/pokemon.js:Pokemon#setStatus
		flags: {},
		name: "Corrosion",
		rating: 2.5,
		num: 212,
	},
	corrosivevenom: {
		// Pokémon's Poison-type moves combine Corrosive effectiveness (SE vs Steel)
		// with regular Poison effectiveness (SE vs Grass and Fairy). The mod's
		// trySetStatus override already allows poisoning all types without Corrosion.
		// onEffectiveness fires for the DEFENDER, so the SE-vs-Steel override is done
		// attacker-side: bypass Steel's Poison immunity, then ×2 the damage (base
		// typeMod is 0 neutral after the immunity bypass, so ×2 = super effective).
		onModifyMove(move) {
			if (move.type === 'Poison') move.ignoreImmunity = true;
		},
		onModifyDamage(damage, source, target, move) {
			if (move.type === 'Poison' && target.hasType('Steel')) {
				return this.chainModify(2);
			}
		},
		shortDesc: "Pokémon's Poison-type moves share characteristics of both Corrosive and Regular Poison moves.",
		origin: 'Custom',
		flags: {},
		name: "Corrosive Venom",
		rating: 3,
		num: 10006,
	},
	costar: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			const ally = pokemon.allies()[0];
			if (!ally) return;

			let i: BoostID;
			for (i in ally.boosts) {
				pokemon.boosts[i] = ally.boosts[i];
			}
			const volatilesToCopy = ['dragoncheer', 'focusenergy', 'gmaxchistrike', 'laserfocus'];
			// we need to be sure to remove all the overlapping crit volatiles before trying to add any
			for (const volatile of volatilesToCopy) pokemon.removeVolatile(volatile);
			for (const volatile of volatilesToCopy) {
				if (ally.volatiles[volatile]) {
					pokemon.addVolatile(volatile);
					if (volatile === 'gmaxchistrike') pokemon.volatiles[volatile].layers = ally.volatiles[volatile].layers;
					if (volatile === 'dragoncheer') pokemon.volatiles[volatile].hasDragonType = ally.volatiles[volatile].hasDragonType;
				}
			}
			this.add('-copyboost', pokemon, ally, '[from] ability: Costar');
		},
		shortDesc: "Copies the ally's current stat changes upon entering battle.",
		origin: 'Unchanged',
		flags: {},
		name: "Costar",
		rating: 0,
		num: 294,
	},
	cottondown: {
		onDamagingHit(damage, target, source, move) {
			let activated = false;
			for (const pokemon of this.getAllActive()) {
				if (pokemon === target || pokemon.fainted) continue;
				if (!activated) {
					this.add('-ability', target, 'Cotton Down');
					activated = true;
				}
				this.boost({ spe: -2 }, pokemon, target, null, true);
			}
		},
		shortDesc: "When hit by a damaging move, lowers the Speed of all other Pokémon by 2 stages.",
		origin: 'Buffed',
		flags: {},
		name: "Cotton Down",
		rating: 2,
		num: 238,
	},
	cudchew: {
		onEatItem(item, pokemon, source, effect) {
			if (item.isBerry && (!effect || !['bugbite', 'pluck'].includes(effect.id))) {
				this.effectState.berry = item;
				this.effectState.counter = 2;
				// This is needed in case the berry was eaten during residuals, preventing the timer from decreasing this turn
				if (!this.queue.peek()) this.effectState.counter--;
			}
		},
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (!this.effectState.berry || !pokemon.hp) return;
			if (--this.effectState.counter <= 0) {
				const item = this.effectState.berry;
				this.add('-activate', pokemon, 'ability: Cud Chew');
				this.add('-enditem', pokemon, item.name, '[eat]');
				if (this.singleEvent('Eat', item, null, pokemon, null, null)) {
					this.runEvent('EatItem', pokemon, null, null, item);
				}
				if (item.onEat) pokemon.ateBerry = true;
				delete this.effectState.berry;
				delete this.effectState.counter;
			}
		},
		shortDesc: "Can eat the same Berry that was already consumed on the next turn.",
		origin: 'Unchanged',
		flags: {},
		name: "Cud Chew",
		rating: 2,
		num: 291,
	},
	curiousmedicine: {
		onStart(pokemon) {
			for (const ally of pokemon.adjacentAllies()) {
				ally.clearBoosts();
				this.add('-clearboost', ally, '[from] ability: Curious Medicine', `[of] ${pokemon}`);
			}
		},
		shortDesc: "Resets all stat changes of adjacent allies upon entering the battlefield.",
		origin: 'Unchanged',
		flags: {},
		name: "Curious Medicine",
		rating: 0,
		num: 261,
	},
	cursedbody: {
		onDamagingHit(damage, target, source, move) {
			if (source.volatiles['disable']) return;
			if (!move.isMax && !move.flags['futuremove'] && move.id !== 'struggle') {
				if (this.randomChance(1, 2)) {
					source.addVolatile('disable', this.effectState.target);
				}
			}
		},
		shortDesc: "50% chance to Disable the foe's move when hit by a damaging move.",
		origin: 'Buffed',
		flags: {},
		name: "Cursed Body",
		rating: 2,
		num: 130,
	},
	cutecharm: {
		onDamagingHit(damage, target, source, move) {
			if (this.randomChance(3, 10)) {
				source.addVolatile('charmed', this.effectState.target);
			}
		},
		shortDesc: "Attacking the Pokémon has a 30% chance to Charm its attacker.",
		origin: 'Buffed',
		flags: {},
		name: "Cute Charm",
		rating: 0.5,
		num: 56,
	},
	damp: {
		onAnyTryMove(target, source, effect) {
			if (['explosion', 'mindblown', 'mistyexplosion', 'selfdestruct'].includes(effect.id)) {
				this.attrLastMove('[still]');
				this.add('cant', this.effectState.target, 'ability: Damp', effect, `[of] ${target}`);
				return false;
			}
		},
		onAnyDamage(damage, target, source, effect) {
			if (effect && effect.name === 'Aftermath') {
				return false;
			}
		},
		flags: { breakable: 1 },
		name: "Damp",
		rating: 0.5,
		num: 6,
	},
	dancer: {
		shortDesc: "Copies the foe's Dance moves immediately when used.",
		origin: 'Unchanged',
		flags: {},
		name: "Dancer",
		// implemented in runMove in scripts.js
		rating: 1.5,
		num: 216,
	},
	darkaura: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Dark Aura');
		},
		onAnyBasePowerPriority: 20,
		onAnyBasePower(basePower, source, target, move) {
			if (target === source || move.category === 'Status' || move.type !== 'Dark') return;
			if (!move.auraBooster?.hasAbility('Dark Aura')) move.auraBooster = this.effectState.target;
			if (move.auraBooster !== this.effectState.target) return;
			return this.chainModify([move.hasAuraBreak ? 3072 : 5448, 4096]);
		},
		flags: {},
		name: "Dark Aura",
		rating: 3,
		num: 186,
	},
	dauntlessshield: {
		onStart(pokemon) {
			if (pokemon.shieldBoost) return;
			pokemon.shieldBoost = true;
			this.boost({ def: 1 }, pokemon);
		},
		flags: {},
		name: "Dauntless Shield",
		rating: 3.5,
		num: 235,
	},
	dazzling: {
		onFoeTryMove(target, source, move) {
			const targetAllExceptions = ['perishsong', 'flowershield', 'rototiller'];
			if (move.target === 'foeSide' || (move.target === 'all' && !targetAllExceptions.includes(move.id))) {
				return;
			}

			const dazzlingHolder = this.effectState.target;
			if ((source.isAlly(dazzlingHolder) || move.target === 'all') && move.priority > 0.1) {
				this.attrLastMove('[still]');
				this.add('cant', dazzlingHolder, 'ability: Dazzling', move, `[of] ${target}`);
				return false;
			}
		},
		shortDesc: "Protects the Pokémon and its allies from high-priority moves.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Dazzling",
		rating: 2.5,
		num: 219,
	},
	defeatist: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				return this.chainModify(0.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, pokemon) {
			if (pokemon.hp <= pokemon.maxhp / 2) {
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves Attack and Special Attack when HP is at or below half.",
		origin: 'Unchanged',
		flags: {},
		name: "Defeatist",
		rating: -1,
		num: 129,
	},
	defiant: {
		onAfterEachBoost(boost, target, source, effect) {
			if (!source || target.isAlly(source)) {
				return;
			}
			let statsLowered = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					statsLowered = true;
				}
			}
			if (statsLowered) {
				this.boost({ atk: 2 }, target, target, null, false, true);
			}
		},
		shortDesc: "Raises Attack by 2 stages when the Pokémon's stats are lowered by a foe.",
		origin: 'Unchanged',
		flags: {},
		name: "Defiant",
		rating: 3,
		num: 128,
	},
	deltastream: {
		onStart(source) {
			this.field.setWeather('deltastream');
		},
		onAnySetWeather(target, source, weather) {
			const strongWeathers = ['desolateland', 'primordialsea', 'deltastream'];
			if (this.field.getWeather().id === 'deltastream' && !strongWeathers.includes(weather.id)) return false;
		},
		onEnd(pokemon) {
			if (this.field.weatherState.source !== pokemon) return;
			for (const target of this.getAllActive()) {
				if (target === pokemon) continue;
				if (target.hasAbility('deltastream')) {
					this.field.weatherState.source = target;
					return;
				}
			}
			this.field.clearWeather();
		},
		flags: {},
		name: "Delta Stream",
		rating: 4,
		num: 191,
	},
	desolateland: {
		onStart(source) {
			this.field.setWeather('desolateland');
		},
		onAnySetWeather(target, source, weather) {
			const strongWeathers = ['desolateland', 'primordialsea', 'deltastream'];
			if (this.field.getWeather().id === 'desolateland' && !strongWeathers.includes(weather.id)) return false;
		},
		onEnd(pokemon) {
			if (this.field.weatherState.source !== pokemon) return;
			for (const target of this.getAllActive()) {
				if (target === pokemon) continue;
				if (target.hasAbility('desolateland')) {
					this.field.weatherState.source = target;
					return;
				}
			}
			this.field.clearWeather();
		},
		flags: {},
		name: "Desolate Land",
		rating: 4.5,
		num: 190,
	},
	dirtyfighter: {
		// Standby: halves Fighting-type damage; next Dark-type move is doubled.
		shortDesc: "Halves damage from Fighting-type moves; the Pokémon's next Dark-type move is doubled in power.",
		origin: 'Custom',
		flags: {},
		name: "Dirty Fighter",
		rating: 0,
		num: 10016,
	},
	disguise: {
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect?.effectType === 'Move' && ['mimikyu', 'mimikyutotem'].includes(target.species.id)) {
				this.add('-activate', target, 'ability: Disguise');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, source, move) {
			if (!target) return;
			if (!['mimikyu', 'mimikyutotem'].includes(target.species.id)) {
				return;
			}
			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target || move.category === 'Status') return;
			if (!['mimikyu', 'mimikyutotem'].includes(target.species.id)) {
				return;
			}

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return 0;
		},
		onUpdate(pokemon) {
			if (['mimikyu', 'mimikyutotem'].includes(pokemon.species.id) && this.effectState.busted) {
				const speciesid = pokemon.species.id === 'mimikyutotem' ? 'Mimikyu-Busted-Totem' : 'Mimikyu-Busted';
				pokemon.formeChange(speciesid, this.effect, true);
				this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon, this.dex.species.get(speciesid));
			}
		},
		shortDesc: "Once per battle, negates the first hit of a damaging move.",
		origin: 'Unchanged',
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Disguise",
		rating: 3.5,
		num: 209,
	},
	download: {
		onStart(pokemon) {
			let totaldef = 0;
			let totalspd = 0;
			for (const target of pokemon.foes()) {
				totaldef += target.getStat('def', false, true);
				totalspd += target.getStat('spd', false, true);
			}
			if (totaldef && totaldef >= totalspd) {
				this.boost({ spa: 1 });
			} else if (totalspd) {
				this.boost({ atk: 1 });
			}
		},
		shortDesc: "Raises Atk or SpA based on the foe's lower defensive stat upon entering battle.",
		origin: 'Unchanged',
		flags: {},
		name: "Download: Offense",
		rating: 3.5,
		num: 88,
	},
	downloaddefense: {
		// Raises Defense or Sp. Def based on the foe's higher offensive stat.
		onStart(pokemon) {
			let totalAtk = 0;
			let totalSpA = 0;
			for (const target of pokemon.foes()) {
				totalAtk += target.getStat('atk', false, true);
				totalSpA += target.getStat('spa', false, true);
			}
			if (totalAtk >= totalSpA) {
				this.boost({ def: 1 });
			} else {
				this.boost({ spd: 1 });
			}
		},
		shortDesc: "On switch-in, boosts Defense or Sp. Def based on the foe's higher offensive stat.",
		origin: 'Custom',
		flags: {},
		name: "Download: Defense",
		rating: 2.5,
		num: 10021,
	},
	dragonize: {
		isNonstandard: "Future",
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Dragon';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Dragon-type moves and boosts their power by ×1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Dragonize",
		rating: 4,
		num: 312,
	},
	dragonsmaw: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Dragon') {
				this.debug('Dragon\'s Maw boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Dragon') {
				this.debug('Dragon\'s Maw boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Dragon's Maw",
		rating: 3.5,
		num: 263,
	},
	drizzle: {
		onStart(source) {
			if (source.species.id === 'kyogre' && source.item === 'blueorb') return;
			this.field.setWeather('raindance');
		},
		flags: {},
		name: "Drizzle",
		rating: 4,
		num: 2,
	},
	drought: {
		onStart(source) {
			if (source.species.id === 'groudon' && source.item === 'redorb') return;
			this.field.setWeather('sunnyday');
		},
		flags: {},
		name: "Drought",
		rating: 4,
		num: 70,
	},
	dryskin: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Water') {
				if (!this.heal(target.baseMaxhp / 4)) {
					this.add('-immune', target, '[from] ability: Dry Skin');
				}
				return null;
			}
		},
		onSourceBasePowerPriority: 17,
		onSourceBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Fire') {
				return this.chainModify(1.25);
			}
		},
		onWeather(target, source, effect) {
			if (target.effectiveWeather() !== effect.id) return;
			if (effect.id === 'raindance' || effect.id === 'primordialsea') {
				this.heal(target.baseMaxhp / 8);
			} else if (effect.id === 'sunnyday' || effect.id === 'desolateland') {
				this.damage(target.baseMaxhp / 8, target, target);
			}
		},
		flags: { breakable: 1 },
		name: "Dry Skin",
		rating: 3,
		num: 87,
	},
	earlybird: {
		// Mechanics in slp condition (champions mod): wakeThreshold 1 instead of 2, +2 Spe on wake
		shortDesc: "Wakes from sleep in half the turns and gains +2 Speed on waking.",
		origin: 'Buffed',
		flags: {},
		name: "Early Bird",
		rating: 1.5,
		num: 48,
	},
	eartheater: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Ground') {
				if (!this.heal(target.baseMaxhp / 4)) {
					this.add('-immune', target, '[from] ability: Earth Eater');
				}
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Earth Eater",
		rating: 3.5,
		num: 297,
	},
	echolocation: {
		// Ignores evasion; prevents accuracy drops; +20% accuracy; 1.5× from sound moves.
		onModifyMovePriority: -2,
		onModifyMove(move, pokemon) {
			move.ignoreEvasion = true;
		},
		onModifyAccuracyPriority: 5,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			return this.chainModify(1.2);
		},
		onTryBoost(boost, target, source, effect) {
			if (source && target !== source && boost.accuracy && boost.accuracy < 0) {
				delete boost.accuracy;
				if (!(effect as ActiveMove).secondaries) {
					this.add('-fail', target, 'unboost', 'accuracy', '[from] ability: Echolocation', `[of] ${target}`);
				}
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.flags['sound']) return this.chainModify(1.5);
		},
		shortDesc: "Accuracy can't be lowered, ignores evasion, +20% accuracy; takes 1.5× from sound moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Echolocation",
		rating: 2,
		num: 10019,
	},
	effectspore: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target) && source.runStatusImmunity('powder')) {
				if (this.randomChance(1, 2)) {
					const r = this.random(100);
					if (r < 20) {
						source.trySetStatus('slp', target);
					} else if (r < 60) {
						source.trySetStatus('stun', target);
					} else {
						source.trySetStatus('psn', target);
					}
				}
			}
		},
		shortDesc: "Contact has a 50% chance to inflict poison (20%), stun (20%), or sleep (10%).",
		origin: 'Buffed',
		flags: {},
		name: "Effect Spore",
		rating: 2,
		num: 27,
	},
	electricsurge: {
		onStart(source) {
			this.field.setTerrain('electricterrain');
		},
		flags: {},
		name: "Electric Surge",
		rating: 4,
		num: 226,
	},
	electromorphosis: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			target.addVolatile('charge');
		},
		shortDesc: "Doubles power of the next Electric-type move when hit by an attack.",
		origin: 'Unchanged',
		flags: {},
		name: "Electromorphosis",
		rating: 3,
		num: 280,
	},
	embodyaspectcornerstone: {
		onStart(pokemon) {
			if (pokemon.baseSpecies.name === 'Ogerpon-Cornerstone-Tera' && pokemon.terastallized &&
				!this.effectState.embodied) {
				this.effectState.embodied = true;
				this.boost({ def: 1 }, pokemon);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Embody Aspect (Cornerstone)",
		rating: 3.5,
		num: 304,
	},
	embodyaspecthearthflame: {
		onStart(pokemon) {
			if (pokemon.baseSpecies.name === 'Ogerpon-Hearthflame-Tera' && pokemon.terastallized &&
				!this.effectState.embodied) {
				this.effectState.embodied = true;
				this.boost({ atk: 1 }, pokemon);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Embody Aspect (Hearthflame)",
		rating: 3.5,
		num: 303,
	},
	embodyaspectteal: {
		onStart(pokemon) {
			if (pokemon.baseSpecies.name === 'Ogerpon-Teal-Tera' && pokemon.terastallized &&
				!this.effectState.embodied) {
				this.effectState.embodied = true;
				this.boost({ spe: 1 }, pokemon);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Embody Aspect (Teal)",
		rating: 3.5,
		num: 301,
	},
	embodyaspectwellspring: {
		onStart(pokemon) {
			if (pokemon.baseSpecies.name === 'Ogerpon-Wellspring-Tera' && pokemon.terastallized &&
				!this.effectState.embodied) {
				this.effectState.embodied = true;
				this.boost({ spd: 1 }, pokemon);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Embody Aspect (Wellspring)",
		rating: 3.5,
		num: 302,
	},
	emergencyexit: {
		onEmergencyExit(target) {
			if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.switchFlag) return;
			for (const side of this.sides) {
				for (const active of side.active) {
					active.switchFlag = false;
				}
			}
			target.switchFlag = true;
			this.add('-activate', target, 'ability: Emergency Exit');
		},
		shortDesc: "Switches out to a random ally when HP falls below 50%.",
		origin: 'Unchanged',
		flags: {},
		name: "Emergency Exit",
		rating: 1,
		num: 194,
	},
	fairyaura: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Fairy Aura');
		},
		onAnyBasePowerPriority: 20,
		onAnyBasePower(basePower, source, target, move) {
			if (target === source || move.category === 'Status' || move.type !== 'Fairy') return;
			if (!move.auraBooster?.hasAbility('Fairy Aura')) move.auraBooster = this.effectState.target;
			if (move.auraBooster !== this.effectState.target) return;
			return this.chainModify([move.hasAuraBreak ? 3072 : 5448, 4096]);
		},
		flags: {},
		name: "Fairy Aura",
		rating: 3,
		num: 187,
	},
	filter: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0) {
				this.debug('Filter neutralize');
				return this.chainModify(0.75);
			}
		},
		shortDesc: "Reduces damage from super-effective attacks by 25%.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Filter",
		rating: 3,
		num: 111,
	},
	flamebody: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(1, 2)) {
					source.trySetStatus('brn', target);
				}
			}
		},
		shortDesc: "Contact with the Pokémon has a 50% chance to burn the attacker.",
		origin: 'Buffed',
		flags: {},
		name: "Flame Body",
		rating: 2,
		num: 49,
	},
	flareboost: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (attacker.status === 'brn' && move.category === 'Special') {
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Flare Boost",
		rating: 2,
		num: 138,
	},
	flashfire: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fire') {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Fire') {
				this.boost({ atk: 1, spa: 1 }, target);
			}
		},
		shortDesc: "Reduces the damage of Fire-type moves by 50% and raises Attack and Sp. Atk by +1 when hit by one.",
		origin: 'Reworked',
		flags: { breakable: 1 },
		name: "Flash Fire",
		rating: 3.5,
		num: 18,
	},
	flowergift: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('WeatherChange', this.effect, this.effectState, pokemon);
		},
		onWeatherChange(pokemon) {
			if (!pokemon.isActive || pokemon.baseSpecies.baseSpecies !== 'Cherrim' || pokemon.transformed) return;
			if (!pokemon.hp) return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				if (pokemon.species.id !== 'cherrimsunshine') {
					pokemon.formeChange('Cherrim-Sunshine', this.effect, false, '0', '[msg]');
				}
			} else {
				if (pokemon.species.id === 'cherrimsunshine') {
					pokemon.formeChange('Cherrim', this.effect, false, '0', '[msg]');
				}
			}
		},
		onAllyModifyAtkPriority: 3,
		onAllyModifyAtk(atk, pokemon) {
			if (this.effectState.target.baseSpecies.baseSpecies !== 'Cherrim') return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		onAllyModifySpDPriority: 4,
		onAllyModifySpD(spd, pokemon) {
			if (this.effectState.target.baseSpecies.baseSpecies !== 'Cherrim') return;
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, breakable: 1 },
		name: "Flower Gift",
		rating: 1,
		num: 122,
	},
	flowerveil: {
		onAllyTryBoost(boost, target, source, effect) {
			if ((source && target === source) || !target.hasType('Grass')) return;
			let showMsg = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
					showMsg = true;
				}
			}
			if (showMsg && !(effect as ActiveMove).secondaries) {
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Flower Veil', `[of] ${effectHolder}`);
			}
		},
		onAllySetStatus(status, target, source, effect) {
			if (target.hasType('Grass') && source && target !== source && effect && effect.id !== 'yawn') {
				this.debug('interrupting setStatus with Flower Veil');
				if (effect.name === 'Synchronize' || (effect.effectType === 'Move' && !effect.secondaries)) {
					const effectHolder = this.effectState.target;
					this.add('-block', target, 'ability: Flower Veil', `[of] ${effectHolder}`);
				}
				return null;
			}
		},
		onAllyTryAddVolatile(status, target) {
			if (target.hasType('Grass') && status.id === 'yawn') {
				this.debug('Flower Veil blocking yawn');
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Flower Veil', `[of] ${effectHolder}`);
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Flower Veil",
		rating: 0,
		num: 166,
	},
	fluffy: {
		onSourceModifyDamage(damage, source, target, move) {
			let mod = 1;
			if (move.type === 'Fire') mod *= 2;
			if (move.flags['contact']) mod /= 2;
			return this.chainModify(mod);
		},
		flags: { breakable: 1 },
		name: "Fluffy",
		rating: 3.5,
		num: 218,
	},
	forecast: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('WeatherChange', this.effect, this.effectState, pokemon);
		},
		onWeatherChange(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Castform' || pokemon.transformed) return;
			let forme = null;
			switch (pokemon.effectiveWeather()) {
			case 'sunnyday':
			case 'desolateland':
				if (pokemon.species.id !== 'castformsunny') forme = 'Castform-Sunny';
				break;
			case 'raindance':
			case 'primordialsea':
				if (pokemon.species.id !== 'castformrainy') forme = 'Castform-Rainy';
				break;
			case 'hail':
			case 'snowscape':
				if (pokemon.species.id !== 'castformsnowy') forme = 'Castform-Snowy';
				break;
			default:
				if (pokemon.species.id !== 'castform') forme = 'Castform';
				break;
			}
			if (pokemon.isActive && forme) {
				pokemon.formeChange(forme, this.effect, false, '0', '[msg]');
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
		name: "Forecast",
		rating: 2,
		num: 59,
	},
	forewarn: {
		onStart(pokemon) {
			for (const target of pokemon.foes()) {
				const targetTypes = target.types;
				const allMoves = target.moveSlots.map(ms => this.dex.moves.get(ms.move));
				// Prioritize moves that do not share a type with the foe
				const nonTypeMoves = allMoves.filter(m => !targetTypes.includes(m.type));
				const typeMoves = allMoves.filter(m => targetTypes.includes(m.type));
				const prioritized = [...nonTypeMoves, ...typeMoves];
				// Reveal up to 2 moves by name in a SINGLE activation (one banner per foe)
				const revealed = prioritized.slice(0, 2).map(m => m.name).join(', ');
				if (revealed) {
					this.add('-activate', pokemon, 'ability: Forewarn', revealed, `[of] ${target}`);
				}
			}
		},
		shortDesc: "Detects and reveals 2 of the foe's moves by name, prioritizing those that don't share the foe's type.",
		origin: 'Buffed',
		flags: {},
		name: "Forewarn",
		rating: 1,
		num: 108,
	},
	friendguard: {
		onAnyModifyDamage(damage, source, target, move) {
			if (target !== this.effectState.target && target.isAlly(this.effectState.target)) {
				this.debug('Friend Guard weaken');
				return this.chainModify(0.75);
			}
		},
		shortDesc: "Reduces damage done to allies by 25%.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Friend Guard",
		rating: 0,
		num: 132,
	},
	frisk: {
		onStart(pokemon) {
			for (const target of pokemon.foes()) {
				if (target.item) {
					this.add('-item', target, target.getItem().name, '[from] ability: Frisk', `[of] ${pokemon}`);
					target.addVolatile('frisk');
				}
			}
		},
		condition: {
			duration: 1,
			noCopy: true,
			onModifyItem(item, target) {
				return null; // item disabled for 1 turn
			},
		},
		shortDesc: "The Pokémon can check a foe's held item and disables it for 1 turn.",
		origin: 'Buffed',
		flags: {},
		name: "Frisk",
		rating: 2,
		num: 119,
	},
	fullmetalbody: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			let showMsg = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) {
					delete boost[i];
					showMsg = true;
				}
			}
			if (showMsg && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
				this.add("-fail", target, "unboost", "[from] ability: Full Metal Body", `[of] ${target}`);
			}
		},
		flags: {},
		name: "Full Metal Body",
		rating: 2,
		num: 230,
	},
	furcoat: {
		onSourceModifyDamage(damage, source, target, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves damage from contact moves used on the Pokémon.",
		origin: 'Nerfed',
		flags: { breakable: 1 },
		name: "Fur Coat",
		rating: 2.5,
		num: 169,
	},
	galewings: {
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.type === 'Flying' && pokemon.hp === pokemon.maxhp) return priority + 1;
		},
		shortDesc: "Gives priority to Flying-type moves when the Pokémon is at full health.",
		origin: 'Unchanged',
		flags: {},
		name: "Gale Wings",
		rating: 1.5,
		num: 177,
	},
	galvanize: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Electric';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Electric-type moves and increases their power by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Galvanize",
		rating: 4,
		num: 206,
	},
	gluttony: {
		onStart(pokemon) {
			pokemon.abilityState.gluttony = true;
			const statBoostBerries = [
				'liechiberry', 'ganlonberry', 'salacberry', 'petayaberry',
				'apicotberry', 'lansatberry', 'micleberry', 'starfberry',
				'marangaberry',
			];
			if (statBoostBerries.includes(pokemon.item)) {
				pokemon.eatItem(true);
			}
		},
		onDamagingHit(damage, target, source, move) {
			const healBerries = [
				'oranberry', 'sitrusberry', 'figyberry', 'wikiberry',
				'magoberry', 'aguavberry', 'iapapaberry',
			];
			if (healBerries.includes(target.item)) {
				target.eatItem(true);
			}
		},
		shortDesc: "Pokémon eats stat berries on entry and heal berries upon taking any damage.",
		origin: 'Buffed',
		flags: {},
		name: "Gluttony",
		rating: 3,
		num: 82,
	},
	goodasgold: {
		onTryHit(target, source, move) {
			if (move.category === 'Status' && target !== source) {
				this.add('-immune', target, '[from] ability: Good as Gold');
				return null;
			}
		},
		shortDesc: "Gives immunity to status moves.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Good as Gold",
		rating: 5,
		num: 283,
	},
	gooey: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				if (!source.volatiles['interlocked'] && !target.volatiles['interlocked']) {
					this.add('-ability', target, 'Gooey');
					source.addVolatile('interlocked', target);
					target.addVolatile('interlocked', source);
					if (source.volatiles['interlocked']) source.volatiles['interlocked'].statDropped = true;
					this.boost({ spe: -1, atk: -1 }, source, target, null, true);
				}
			}
		},
		shortDesc: "On contact: lowers attacker's Speed and Attack by 1 stage. Also initiates Interlocked.",
		origin: 'Buffed',
		flags: {},
		name: "Gooey",
		rating: 3,
		num: 183,
	},
	gorillatactics: {
		onStart(pokemon) {
			pokemon.abilityState.choiceLock = "";
		},
		onBeforeMove(pokemon, target, move) {
			if (move.isZOrMaxPowered || move.id === 'struggle') return;
			if (pokemon.abilityState.choiceLock && pokemon.abilityState.choiceLock !== move.id) {
				// Fails unless ability is being ignored (these events will not run), no PP lost.
				this.addMove('move', pokemon, move.name);
				this.attrLastMove('[still]');
				this.debug("Disabled by Gorilla Tactics");
				this.add('-fail', pokemon);
				return false;
			}
		},
		onModifyMove(move, pokemon) {
			if (pokemon.abilityState.choiceLock || move.isZOrMaxPowered || move.id === 'struggle') return;
			pokemon.abilityState.choiceLock = move.id;
		},
		onModifyAtkPriority: 1,
		onModifyAtk(atk, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			// PLACEHOLDER
			this.debug('Gorilla Tactics Atk Boost');
			return this.chainModify(1.5);
		},
		onDisableMove(pokemon) {
			if (!pokemon.abilityState.choiceLock) return;
			if (pokemon.volatiles['dynamax']) return;
			for (const moveSlot of pokemon.moveSlots) {
				if (moveSlot.id !== pokemon.abilityState.choiceLock) {
					pokemon.disableMove(moveSlot.id, false, this.effectState.sourceEffect);
				}
			}
		},
		onEnd(pokemon) {
			pokemon.abilityState.choiceLock = "";
		},
		shortDesc: "Boosts the Pokémon's Attack stat but only allows the use of the first selected move.",
		origin: 'Unchanged',
		flags: {},
		name: "Gorilla Tactics",
		rating: 4.5,
		num: 255,
	},
	grasspelt: {
		onModifyDefPriority: 6,
		onModifyDef(pokemon) {
			if (this.field.isTerrain('grassyterrain')) return this.chainModify(1.5);
		},
		flags: { breakable: 1 },
		name: "Grass Pelt",
		rating: 0.5,
		num: 179,
	},
	grassysurge: {
		onStart(source) {
			this.field.setTerrain('grassyterrain');
		},
		flags: {},
		name: "Grassy Surge",
		rating: 4,
		num: 229,
	},
	grimneigh: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				this.boost({ spa: length }, source);
			}
		},
		flags: {},
		name: "Grim Neigh",
		rating: 3,
		num: 265,
	},
	guarddog: {
		onDragOutPriority: 1,
		onDragOut(pokemon) {
			this.add('-activate', pokemon, 'ability: Guard Dog');
			return null;
		},
		onTryBoostPriority: 2,
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.boost({ atk: 1 }, target, target, null, false, true);
			}
		},
		onAllyTryBoostPriority: 2,
		onAllyTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Guard Dog', `[of] ${effectHolder}`);
			}
		},
		shortDesc: "Protects itself and allies from Intimidate; receives +1 Attack when Intimidated; cannot be forced out.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Guard Dog",
		rating: 3,
		num: 275,
	},
	gulpmissile: {
		onDamagingHit(damage, target, source, move) {
			if (!source.hp || !source.isActive || target.isSemiInvulnerable()) return;
			if (['cramorantgulping', 'cramorantgorging'].includes(target.species.id)) {
				this.damage(source.baseMaxhp / 4, source, target);
				if (target.species.id === 'cramorantgulping') {
					this.boost({ def: -1 }, source, target, null, true);
				} else {
					source.trySetStatus('stun', target, move);
				}
				target.formeChange('cramorant', move);
			}
		},
		// The Dive part of this mechanic is implemented in Dive's `onTryMove` in moves.ts
		onSourceTryPrimaryHit(target, source, effect) {
			if (effect?.id === 'surf' && source.hasAbility('gulpmissile') && source.species.name === 'Cramorant') {
				const forme = source.hp <= source.maxhp / 2 ? 'cramorantgorging' : 'cramorantgulping';
				source.formeChange(forme, effect);
			}
		},
		flags: { cantsuppress: 1, notransform: 1 },
		name: "Gulp Missile",
		rating: 2.5,
		num: 241,
	},
	guts: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (pokemon.status) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts Attack by x1.5 if afflicted with a status and ignores the Attack-reducing effect of the status.",
		origin: 'Unchanged',
		flags: {},
		name: "Guts",
		rating: 3.5,
		num: 62,
	},
	hadronengine: {
		onStart(pokemon) {
			if (!this.field.setTerrain('electricterrain') && this.field.isTerrain('electricterrain')) {
				this.add('-activate', pokemon, 'ability: Hadron Engine');
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (this.field.isTerrain('electricterrain')) {
				this.debug('Hadron Engine boost');
				return this.chainModify([5461, 4096]);
			}
		},
		flags: {},
		name: "Hadron Engine",
		rating: 4.5,
		num: 289,
	},
	harvest: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (this.field.isWeather(['sunnyday', 'desolateland']) || this.field.pseudoWeather['grassdomain'] || this.randomChance(1, 2)) {
				if (pokemon.hp && !pokemon.item && this.dex.items.get(pokemon.lastItem).isBerry) {
					pokemon.setItem(pokemon.lastItem);
					pokemon.lastItem = '';
					this.add('-item', pokemon, pokemon.getItem(), '[from] ability: Harvest');
				}
			}
		},
		shortDesc: "50% chance to restore a consumed Berry each turn. 100% in Harsh Sun or Grass Domain.",
		origin: 'Altered',
		flags: {},
		name: "Harvest",
		rating: 2.5,
		num: 139,
	},
	healer: {
		onSwitchIn(pokemon) {
			// Cure and restore the ally Healer replaced (most recently active benched ally)
			for (const ally of pokemon.side.pokemon) {
				if (ally === pokemon || ally.fainted || ally.isActive) continue;
				if (ally.activeTurns > 0) {
					this.add('-activate', pokemon, 'ability: Healer');
					ally.cureStatus();
					this.heal(Math.floor(ally.baseMaxhp * 0.1), ally);
					break;
				}
			}
		},
		shortDesc: "On switch-in, the ally Healer replaced has their status cured and recovers 10% MaxHP.",
		origin: 'Reworked',
		flags: {},
		name: "Healer",
		rating: 2,
		num: 131,
	},
	heatproof: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				this.debug('Heatproof Atk weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				this.debug('Heatproof SpA weaken');
				return this.chainModify(0.5);
			}
		},
		onDamage(damage, target, source, effect) {
			if (effect && effect.id === 'brn') {
				return damage / 2;
			}
		},
		flags: { breakable: 1 },
		name: "Heatproof",
		rating: 2,
		num: 85,
	},
	heavymetal: {
		onModifyWeightPriority: 1,
		onModifyWeight(weighthg) {
			return weighthg * 2;
		},
		flags: { breakable: 1 },
		name: "Heavy Metal",
		rating: 0,
		num: 134,
	},
	honeygather: {
		flags: {},
		name: "Honey Gather",
		rating: 0,
		num: 118,
	},
	hospitality: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			for (const ally of pokemon.adjacentAllies()) {
				this.heal(ally.baseMaxhp / 4, ally, pokemon);
			}
		},
		shortDesc: "Restores 1/4 MaxHP to an ally on switch-in (doubles).",
		origin: 'Unchanged',
		flags: {},
		name: "Hospitality",
		rating: 2,
		num: 299,
	},
	hugepower: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk) {
			return this.chainModify(2);
		},
		shortDesc: "Doubles the Pokémon's Attack stat.",
		origin: 'Unchanged',
		flags: {},
		name: "Huge Power",
		rating: 5,
		num: 37,
	},
	hungerswitch: {
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (pokemon.species.baseSpecies !== 'Morpeko' || pokemon.terastallized) return;
			const targetForme = pokemon.species.name === 'Morpeko' ? 'Morpeko-Hangry' : 'Morpeko';
			if (pokemon.species.name === 'Morpeko-Hangry') {
				// End of a Hangry Mode turn — heal 20% MaxHP before switching back
				this.heal(Math.floor(pokemon.baseMaxhp / 5));
			}
			pokemon.formeChange(targetForme);
		},
		shortDesc: "Alternates between Full Belly and Hangry Mode each turn; heals 20% MaxHP at end of Hangry Mode turns.",
		origin: 'Buffed',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Hunger Switch",
		rating: 2,
		num: 258,
	},
	hustle: {
		onModifyBasePowerPriority: 5,
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.category !== 'Status') {
				return this.modify(basePower, 1.3);
			}
		},
		onSourceModifyAccuracyPriority: -1,
		onSourceModifyAccuracy(accuracy, target, source, move) {
			if (move.category !== 'Status' && typeof accuracy === 'number') {
				return this.chainModify([3686, 4096]);
			}
		},
		shortDesc: "Boosts offensive move power by ×1.3, but all offensive moves have ×0.9 accuracy.",
		origin: 'Reworked',
		flags: {},
		name: "Hustle",
		rating: 3.5,
		num: 55,
	},
	hydration: {
		onResidualOrder: 5,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			if (pokemon.status && ['raindance', 'primordialsea'].includes(pokemon.effectiveWeather())) {
				this.debug('hydration');
				this.add('-activate', pokemon, 'ability: Hydration');
				pokemon.cureStatus();
			}
		},
		flags: {},
		name: "Hydration",
		rating: 1.5,
		num: 93,
	},
	hypercutter: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.atk && boost.atk < 0) {
				delete boost.atk;
				if (!(effect as ActiveMove).secondaries) {
					this.add("-fail", target, "unboost", "Attack", "[from] ability: Hyper Cutter", `[of] ${target}`);
				}
			}
		},
		onModifyCritRatio(critRatio, user, target, move) {
			if (this.checkMoveMakesContact(move, user, target, true)) return critRatio + 1;
		},
		shortDesc: "Prevents Attack from being lowered. Contact moves have a 1/8 chance to crit.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Hyper Cutter",
		rating: 2,
		num: 52,
	},
	icebody: {
		onWeather(target, source, effect) {
			if (effect.id === 'hail' || effect.id === 'snowscape') {
				this.heal(target.baseMaxhp / 16);
			}
		},
		onResidualOrder: 28,
		onResidual(target) {
			if (this.field.pseudoWeather['icedomain'] && !this.field.isWeather(['hail', 'snowscape'])) {
				this.heal(target.baseMaxhp / 16);
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'hail') return false;
		},
		shortDesc: "Restores 1/16 MaxHP per turn in Hailstorm, Snowscape, or Ice Domain.",
		origin: 'Altered',
		flags: {},
		name: "Ice Body",
		rating: 1,
		num: 115,
	},
	iceface: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			if (this.field.isWeather(['hail', 'snowscape']) && pokemon.species.id === 'eiscuenoice') {
				this.add('-activate', pokemon, 'ability: Ice Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue', this.effect, true);
			}
		},
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect?.effectType === 'Move' && effect.category === 'Physical' && target.species.id === 'eiscue') {
				this.add('-activate', target, 'ability: Ice Face');
				this.effectState.busted = true;
				return 0;
			}
		},
		onCriticalHit(target, type, move) {
			if (!target) return;
			if (move.category !== 'Physical' || target.species.id !== 'eiscue') return;
			if (target.volatiles['substitute'] && !(move.flags['bypasssub'] || move.infiltrates)) return;
			if (!target.runImmunity(move)) return;
			return false;
		},
		onEffectiveness(typeMod, target, type, move) {
			if (!target) return;
			if (move.category !== 'Physical' || target.species.id !== 'eiscue') return;

			const hitSub = target.volatiles['substitute'] && !move.flags['bypasssub'] && !(move.infiltrates && this.gen >= 6);
			if (hitSub) return;

			if (!target.runImmunity(move)) return;
			return 0;
		},
		onUpdate(pokemon) {
			if (pokemon.species.id === 'eiscue' && this.effectState.busted) {
				pokemon.formeChange('Eiscue-Noice', this.effect, true);
			}
		},
		onWeatherChange(pokemon, source, sourceEffect) {
			// snow/hail resuming because Cloud Nine/Air Lock ended does not trigger Ice Face
			if ((sourceEffect as Ability)?.suppressWeather) return;
			if (!pokemon.hp) return;
			if (this.field.isWeather(['hail', 'snowscape']) && pokemon.species.id === 'eiscuenoice') {
				this.add('-activate', pokemon, 'ability: Ice Face');
				this.effectState.busted = false;
				pokemon.formeChange('Eiscue', this.effect, true);
			}
		},
		flags: {
			failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1,
			breakable: 1, notransform: 1,
		},
		name: "Ice Face",
		rating: 3,
		num: 248,
	},
	icescales: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.category === 'Special') {
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves damage from Special moves.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Ice Scales",
		rating: 4,
		num: 246,
	},
	illuminate: {
		onStart(pokemon) {
			let activated = false;
			for (const target of pokemon.foes()) {
				if (!activated) {
					this.add('-ability', pokemon, 'Illuminate', 'boost');
					activated = true;
				}
				this.boost({ evasion: -1 }, target, pokemon, null, true);
			}
		},
		shortDesc: "Lowers the foe's evasion by 1 stage on switch-in.",
		origin: 'Reworked',
		flags: {},
		name: "Illuminate",
		rating: 1.5,
		num: 35,
	},
	illusion: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.illusion) return this.chainModify(0.9);
		},
		onBeforeSwitchIn(pokemon) {
			pokemon.illusion = null;
			// yes, you can Illusion an active pokemon but only if it's to your right
			for (let i = pokemon.side.pokemon.length - 1; i > pokemon.position; i--) {
				const possibleTarget = pokemon.side.pokemon[i];
				if (!possibleTarget.fainted) {
					// If Ogerpon is in the last slot while the Illusion Pokemon is Terastallized
					// Illusion will not disguise as anything
					if (!pokemon.terastallized || !['Ogerpon', 'Terapagos'].includes(possibleTarget.species.baseSpecies)) {
						pokemon.illusion = possibleTarget;
					}
					break;
				}
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (target.illusion) {
				this.singleEvent('End', this.dex.abilities.get('Illusion'), target.abilityState, target, source, move);
			}
		},
		onEnd(pokemon) {
			if (pokemon.illusion && !pokemon.beingCalledBack) {
				this.debug('illusion cleared');
				pokemon.illusion = null;
				const details = pokemon.getUpdatedDetails();
				this.add('replace', pokemon, details);
				this.add('-end', pokemon, 'Illusion');
				if (this.ruleTable.has('illusionlevelmod')) {
					this.hint("Illusion Level Mod is active, so this Pok\u00e9mon's true level was hidden.", true);
				}
			}
		},
		onFaint(pokemon) {
			pokemon.illusion = null;
		},
		shortDesc: "Disguised as last party member. The hit that breaks the disguise deals 10% less damage.",
		origin: 'Buffed',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
		name: "Illusion",
		rating: 4.5,
		num: 149,
	},
	immunity: {
		onUpdate(pokemon) {
			if (pokemon.status === 'psn' || pokemon.status === 'tox') {
				this.add('-activate', pokemon, 'ability: Immunity');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'psn' && status.id !== 'tox') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Immunity');
			}
			return false;
		},
		flags: { breakable: 1 },
		name: "Immunity",
		rating: 2,
		num: 17,
	},
	imposter: {
		onSwitchIn(pokemon) {
			// Imposter does not activate when Skill Swapped or when Neutralizing Gas leaves the field
			// Imposter copies across in doubles/triples
			// (also copies across in multibattle and diagonally in free-for-all,
			// but side.foe already takes care of those)
			const target = pokemon.side.foe.active[pokemon.side.foe.active.length - 1 - pokemon.position];
			if (target) {
				pokemon.transformInto(target, this.dex.abilities.get('imposter'));
			}
		},
		shortDesc: "Transforms into the opposing Pokémon, barring their MaxHP, on switch-in.",
		origin: 'Unchanged',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
		name: "Imposter",
		rating: 5,
		num: 150,
	},
	inert: {
		onAnyTryMove(target, source, effect) {
			if (['explosion', 'mindblown', 'mistyexplosion', 'selfdestruct'].includes(effect.id)) {
				this.attrLastMove('[still]');
				this.add('cant', this.effectState.target, 'ability: Inert', effect, `[of] ${target}`);
				return false;
			}
		},
		onAnyDamage(damage, target, source, effect) {
			if (effect && effect.name === 'Aftermath') {
				return false;
			}
		},
		shortDesc: "Prevents self-destructing moves and on-death ability effects while on the field.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Inert",
		rating: 0.5,
		num: 10007,
	},
	infiltrator: {
		onModifyMove(move) {
			move.infiltrates = true;
		},
		shortDesc: "Bypasses Substitute, screens, Safeguard, and Mist.",
		origin: 'Unchanged',
		flags: {},
		name: "Infiltrator",
		rating: 2.5,
		num: 151,
	},
	innardsout: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (!target.hp) {
				if (!move.smartTarget) damage += Number(move.totalDamage);
				this.damage(target.getUndynamaxedHP(damage), source, target);
			}
		},
		shortDesc: "Damages attacker equal to remaining HP when KO'd.",
		origin: 'Unchanged',
		flags: {},
		name: "Innards Out",
		rating: 4,
		num: 215,
	},
	innerfocus: {
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'flinch') return null;
		},
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Inner Focus', `[of] ${target}`);
			}
		},
		shortDesc: "Immune to flinching and Intimidate.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Inner Focus",
		rating: 1,
		num: 39,
	},
	insomnia: {
		onUpdate(pokemon) {
			if (pokemon.status === 'slp') {
				this.add('-activate', pokemon, 'ability: Insomnia');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'slp') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Insomnia');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.add('-immune', target, '[from] ability: Insomnia');
				return null;
			}
		},
		shortDesc: "Prevents the Pokémon from falling asleep.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Insomnia",
		rating: 1.5,
		num: 15,
	},
	intimidate: {
		onStart(pokemon) {
			let activated = false;
			for (const target of pokemon.adjacentFoes()) {
				if (!activated) {
					this.add('-ability', pokemon, 'Intimidate', 'boost');
					activated = true;
				}
				if (target.volatiles['substitute']) {
					this.add('-immune', target);
				} else {
					this.boost({ atk: -1 }, target, pokemon, null, true);
				}
			}
		},
		shortDesc: "Lowers the foe's Attack stat by 1 stage on switch-in.",
		origin: 'Unchanged',
		flags: {},
		name: "Intimidate",
		rating: 3.5,
		num: 22,
	},
	intrepidsword: {
		onStart(pokemon) {
			if (pokemon.swordBoost) return;
			pokemon.swordBoost = true;
			this.boost({ atk: 1 }, pokemon);
		},
		flags: {},
		name: "Intrepid Sword",
		rating: 4,
		num: 234,
	},
	invisiblewall: {
		shortDesc: "Screen moves used by this Pokémon last 3 additional turns.",
		origin: 'Custom',
		flags: {},
		name: "Invisible Wall",
		rating: 2,
		num: 10004,
	},
	ironbarbs: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		shortDesc: "Inflicts 1/8 MaxHP damage to attackers on contact.",
		origin: 'Unchanged',
		flags: {},
		name: "Iron Barbs",
		rating: 2.5,
		num: 160,
	},
	ironfist: {
		onBasePowerPriority: 23,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['punch']) {
				this.debug('Iron Fist boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts the power of punching moves by ×1.5.",
		origin: 'Buffed',
		flags: {},
		name: "Iron Fist",
		rating: 3.5,
		num: 89,
	},
	justified: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Dark') {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Dark') {
				this.boost({ atk: 1, spa: 1 }, target);
			}
		},
		shortDesc: "Take 50% less damage from Dark-type moves, and raises Attack and Special Attack by +1 stage when hit by one.",
		origin: 'Buffed',
		flags: {},
		name: "Justified",
		rating: 3,
		num: 154,
	},
	keeneye: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.accuracy && boost.accuracy < 0) {
				delete boost.accuracy;
				if (!(effect as ActiveMove).secondaries) {
					this.add("-fail", target, "unboost", "accuracy", "[from] ability: Keen Eye", `[of] ${target}`);
				}
			}
		},
		onModifyMove(move) {
			move.ignoreEvasion = true;
		},
		onModifyAccuracyPriority: 5,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			return this.chainModify(1.1);
		},
		shortDesc: "Slightly increases accuracy by 10%, ignores evasion, and prevents accuracy from being lowered.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Keen Eye",
		rating: 1,
		num: 51,
	},
	klutz: {
		// Klutz isn't technically active immediately in-game, but it activates early enough to beat all items
		// we should keep an eye out in future gens for items that activate on switch-in before Unnerve
		onSwitchInPriority: 1,
		// Item suppression implemented in Pokemon.ignoringItem() within sim/pokemon.js
		onStart(pokemon) {
			this.singleEvent('End', pokemon.getItem(), pokemon.itemState, pokemon);
		},
		flags: {},
		name: "Klutz",
		rating: -1,
		num: 103,
	},
	leafguard: {
		onSetStatus(status, target, source, effect) {
			if (['sunnyday', 'desolateland'].includes(target.effectiveWeather())) {
				if ((effect as Move)?.status) {
					this.add('-immune', target, '[from] ability: Leaf Guard');
				}
				return false;
			}
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'yawn' && ['sunnyday', 'desolateland'].includes(target.effectiveWeather())) {
				this.add('-immune', target, '[from] ability: Leaf Guard');
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Leaf Guard",
		rating: 0.5,
		num: 102,
	},
	levitate: {
		// airborneness implemented in sim/pokemon.js:Pokemon#isGrounded
		shortDesc: "Gives immunity to Ground type moves.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Reactive Levitation",
		rating: 3.5,
		num: 26,
	},
	libero: {
		onPrepareHit(source, target, move) {
			if (this.effectState.libero) return;
			if (move.hasBounced || move.flags['futuremove'] || move.sourceEffect === 'snatch' || move.callsMove) return;
			const type = move.type;
			if (type && type !== '???' && source.getTypes().join() !== type) {
				if (!source.setType(type)) return;
				this.effectState.libero = true;
				this.add('-start', source, 'typechange', type, '[from] ability: Libero');
			}
		},
		flags: {},
		name: "Libero",
		rating: 4,
		num: 236,
	},
	lightmetal: {
		onModifyWeight(weighthg) {
			return this.trunc(weighthg / 2);
		},
		flags: { breakable: 1 },
		name: "Light Metal",
		rating: 1,
		num: 135,
	},
	lightningrod: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Electric') {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Electric') {
				this.boost({ atk: 1, spa: 1 }, target);
			}
		},
		onAnyRedirectTarget(target, source, source2, move) {
			if (move.type !== 'Electric' || move.flags['pledgecombo']) return;
			const redirectTarget = ['randomNormal', 'adjacentFoe'].includes(move.target) ? 'normal' : move.target;
			if (this.validTarget(this.effectState.target, source, redirectTarget)) {
				if (move.smartTarget) move.smartTarget = false;
				if (this.effectState.target !== target) {
					this.add('-activate', this.effectState.target, 'ability: Lightning Rod');
				}
				return this.effectState.target;
			}
		},
		shortDesc: "Reduces the damage of Electric-type moves by 50% and raises Attack and Special Attack by +1 stage when hit by one.",
		origin: 'Altered',
		flags: {},
		name: "Lightning Rod",
		rating: 3,
		num: 31,
	},
	limber: {
		onUpdate(pokemon) {
			if (pokemon.status === 'par') {
				this.add('-activate', pokemon, 'ability: Limber');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'par' && status.id !== 'stun') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Limber');
			}
			return false;
		},
		shortDesc: "The Pokémon is protected from paralysis.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Limber",
		rating: 2,
		num: 7,
	},
	lingeringaroma: {
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.flags['cantsuppress'] || sourceAbility.id === 'lingeringaroma') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				source.setAbility('lingeringaroma', target);
			}
		},
		shortDesc: "Contact changes the attacker's Ability to Lingering Aroma.",
		origin: 'Unchanged',
		flags: {},
		name: "Lingering Aroma",
		rating: 2,
		num: 268,
	},
	liquidooze: {
		onSourceTryHeal(damage, target, source, effect) {
			this.debug(`Heal is occurring: ${target} <- ${source} :: ${effect.id}`);
			const canOoze = ['drain', 'leechseed', 'strengthsap'];
			if (canOoze.includes(effect.id)) {
				this.damage(damage);
				return 0;
			}
		},
		shortDesc: "Damages attackers using any draining move, hurting them for the amount they would have healed.",
		origin: 'Unchanged',
		flags: {},
		name: "Liquid Ooze",
		rating: 2.5,
		num: 64,
	},
	liquidvoice: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			if (move.flags['sound'] && !pokemon.volatiles['dynamax']) { // hardcode
				move.type = 'Water';
			}
		},
		shortDesc: "All sound-based moves become Water-type moves.",
		origin: 'Unchanged',
		flags: {},
		name: "Liquid Voice",
		rating: 1.5,
		num: 204,
	},
	longreach: {
		onModifyMove(move) {
			delete move.flags['contact'];
		},
		shortDesc: "The Pokémon uses its moves without making contact with the target.",
		origin: 'Unchanged',
		flags: {},
		name: "Long Reach",
		rating: 1,
		num: 203,
	},
	magicbounce: {
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (target === source || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.actions.useMove(newMove, target, { target: source });
			return null;
		},
		onAllyTryHitSide(target, source, move) {
			if (target.isAlly(source) || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.actions.useMove(newMove, this.effectState.target, { target: source });
			move.hasBounced = true; // only bounce once in free-for-all battles
			return null;
		},
		shortDesc: "Reflects status moves back to the attacker.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Magic Bounce",
		rating: 4,
		num: 156,
	},
	magicguard: {
		onDamage(damage, target, source, effect) {
			if (effect.effectType !== 'Move') {
				if (effect.effectType === 'Ability') this.add('-activate', source, 'ability: ' + effect.name);
				return false;
			}
		},
		shortDesc: "Protects the Pokémon from indirect damage.",
		origin: 'Unchanged',
		flags: {},
		name: "Magic Guard",
		rating: 4,
		num: 98,
	},
	magician: {
		onAfterMoveSecondarySelf(source, target, move) {
			if (!move || source.switchFlag === true || !move.hitTargets || source.item || source.volatiles['gem'] ||
				move.id === 'fling' || move.category === 'Status') return;
			// Only steal when a chance secondary effect actually activated (not guaranteed effects like Knock Off)
			if (!(move as any).magicianTrigger) return;
			const hitTargets = move.hitTargets;
			this.speedSort(hitTargets);
			for (const pokemon of hitTargets) {
				if (pokemon !== source) {
					const yourItem = pokemon.takeItem(source);
					if (!yourItem) continue;
					if (!source.setItem(yourItem)) {
						pokemon.item = yourItem.id; // bypass setItem so we don't break choicelock or anything
						continue;
					}
					this.add('-item', source, yourItem, '[from] ability: Magician', `[of] ${pokemon}`);
					return;
				}
			}
		},
		flags: {},
		shortDesc: "Steals a foe's held item when a chance secondary effect of this Pokémon's move activates.",
		origin: 'Reworked',
		name: "Magician",
		rating: 1,
		num: 170,
	},
	magmaarmor: {
		onUpdate(pokemon) {
			if (pokemon.status === 'frz') {
				this.add('-activate', pokemon, 'ability: Magma Armor');
				pokemon.cureStatus();
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'frz' || type === 'frb') return false;
		},
		flags: { breakable: 1 },
		name: "Magma Armor",
		rating: 0.5,
		num: 40,
	},
	magnetpull: {
		onFoeTrapPokemon(pokemon) {
			if (pokemon.hasType('Steel') && pokemon.isAdjacent(this.effectState.target)) {
				pokemon.tryTrap(true);
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			if (!pokemon.knownType || pokemon.hasType('Steel')) {
				pokemon.maybeTrapped = true;
			}
		},
		shortDesc: "Prevents Steel-type Pokémon from escaping.",
		origin: 'Unchanged',
		flags: {},
		name: "Magnet Pull",
		rating: 4,
		num: 42,
	},
	marvelscale: {
		onModifyDefPriority: 6,
		onModifyDef(def, pokemon) {
			if (pokemon.status) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Increases Defense by x1.5 if inflicted with a non-volatile status.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Marvel Scale",
		rating: 2.5,
		num: 63,
	},
	megalauncher: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['pulse']) {
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Mega Launcher",
		rating: 3,
		num: 178,
	},
	megasol: {
		isNonstandard: "Future",
		onWeatherModifyDamagePriority: 1,
		onWeatherModifyDamage(damage, attacker, defender, move) {
			(this.dex.conditions.getByID('sunnyday' as ID) as any).onWeatherModifyDamage
				.call(this, damage, attacker, defender, move);
			return damage; // fast exit from event
		},
		shortDesc: "Moves act as if there is harsh sunlight.",
		origin: 'Altered',
		flags: {},
		name: "Solar Battery",
		rating: 3,
		num: 315,
		// Partially implemented in Pokemon.effectiveWeather() in sim/pokemon.ts
	},
	merciless: {
		onModifyCritRatio(critRatio, source, target) {
			if (target && ['psn', 'tox', 'cor', 'mlt'].includes(target.status as string)) return 5;
		},
		shortDesc: "The Pokémon's attacks become critical hits if the target is poisoned or corroded.",
		origin: 'Altered',
		flags: {},
		name: "Merciless",
		rating: 2,
		num: 196,
	},
	mimicry: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			this.singleEvent('TerrainChange', this.effect, this.effectState, pokemon);
		},
		onTerrainChange(pokemon) {
			let types;
			switch (this.field.terrain) {
			case 'electricterrain':
				types = ['Electric'];
				break;
			case 'grassyterrain':
				types = ['Grass'];
				break;
			case 'mistyterrain':
				types = ['Fairy'];
				break;
			case 'psychicterrain':
				types = ['Psychic'];
				break;
			default:
				types = pokemon.baseSpecies.types;
			}
			const oldTypes = pokemon.getTypes();
			if (oldTypes.join() === types.join() || !pokemon.setType(types)) return;
			if (this.field.terrain || pokemon.transformed) {
				this.add('-start', pokemon, 'typechange', types.join('/'), '[from] ability: Mimicry');
				if (!this.field.terrain) this.hint("Transform Mimicry changes you to your original un-transformed types.");
			} else {
				this.add('-activate', pokemon, 'ability: Mimicry');
				this.add('-end', pokemon, 'typechange', '[silent]');
			}
		},
		flags: {},
		name: "Mimicry",
		rating: 0,
		num: 250,
	},
	mindseye: {
		onTryBoost(boost, target, source, effect) {
			if (source && target === source) return;
			if (boost.accuracy && boost.accuracy < 0) {
				delete boost.accuracy;
				if (!(effect as ActiveMove).secondaries) {
					this.add("-fail", target, "unboost", "accuracy", "[from] ability: Mind's Eye", `[of] ${target}`);
				}
			}
		},
		onModifyMovePriority: -5,
		onModifyMove(move) {
			move.ignoreEvasion = true;
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) {
				move.ignoreImmunity['Fighting'] = true;
				move.ignoreImmunity['Normal'] = true;
			}
		},
		flags: { breakable: 1 },
		name: "Mind's Eye",
		rating: 0,
		num: 300,
	},
	minus: {
		onModifyBasePowerPriority: 5,
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type !== 'Electric' || move.category === 'Status') return;
			const triggered = this.battle.getAllActive().some(
				p => p !== attacker && p.hasAbility(['plus', 'magnetpull', 'magnetismpulse'])
			);
			return this.chainModify(triggered ? 1.5 : 1.1);
		},
		shortDesc: "Boosts Electric moves by ×1.1; ×1.5 if any Pokémon on field has Plus, Magnet Pull, or Magnetism Pulse.",
		origin: 'Buffed',
		flags: {},
		name: "Minus",
		rating: 0,
		num: 58,
	},
	mirrorarmor: {
		onTryBoost(boost, target, source, effect) {
			// Don't bounce self stat changes, or boosts that have already bounced
			if (!source || target === source || !boost || effect.name === 'Mirror Armor') return;
			let b: BoostID;
			for (b in boost) {
				if (boost[b]! < 0) {
					if (target.boosts[b] === -6) continue;
					const negativeBoost: SparseBoostsTable = {};
					negativeBoost[b] = boost[b];
					delete boost[b];
					if (source.hp) {
						this.add('-ability', target, 'Mirror Armor');
						this.boost(negativeBoost, source, target, null, true);
					}
				}
			}
		},
		shortDesc: "Reflects any stat-lowering effects back to the attacker.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Mirror Armor",
		rating: 2,
		num: 240,
	},
	mistysurge: {
		onStart(source) {
			this.field.setTerrain('mistyterrain');
		},
		flags: {},
		name: "Misty Surge",
		rating: 3.5,
		num: 228,
	},
	moldbreaker: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Mold Breaker');
		},
		onModifyMove(move) {
			move.ignoreAbility = true;
		},
		shortDesc: "Moves can be used regardless of Abilities.",
		origin: 'Unchanged',
		flags: {},
		name: "Mold Breaker",
		rating: 3,
		num: 104,
	},
	moody: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			let stats: BoostID[] = [];
			const boost: SparseBoostsTable = {};
			let statPlus: BoostID;
			for (statPlus in pokemon.boosts) {
				if (statPlus === 'accuracy' || statPlus === 'evasion') continue;
				if (pokemon.boosts[statPlus] < 6) {
					stats.push(statPlus);
				}
			}
			let randomStat: BoostID | undefined = stats.length ? this.sample(stats) : undefined;
			if (randomStat) boost[randomStat] = 2;

			stats = [];
			let statMinus: BoostID;
			for (statMinus in pokemon.boosts) {
				if (statMinus === 'accuracy' || statMinus === 'evasion') continue;
				if (pokemon.boosts[statMinus] > -6 && statMinus !== randomStat) {
					stats.push(statMinus);
				}
			}
			randomStat = stats.length ? this.sample(stats) : undefined;
			if (randomStat) boost[randomStat] = -1;

			this.boost(boost, pokemon, pokemon);
		},
		shortDesc: "Raises one stat by +2 stages and lowers another by -1 stage each turn.",
		origin: 'Unchanged',
		flags: {},
		name: "Moody",
		rating: 5,
		num: 141,
	},
	motordrive: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Electric') {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Electric') {
				this.boost({ spe: 1 }, target);
			}
		},
		shortDesc: "Reduces the damage of Electric-type moves by 50% and increases Speed by +1 stage when hit by one.",
		origin: 'Nerfed',
		flags: {},
		name: "Motor Drive",
		rating: 2.5,
		num: 78,
	},
	moxie: {
		onSourceAfterFaint(length, target, source, effect) {
			if (effect && effect.effectType === 'Move') {
				this.boost({ atk: length }, source);
			}
		},
		shortDesc: "Boosts Attack by +1 stage after knocking out any Pokémon.",
		origin: 'Unchanged',
		flags: {},
		name: "Moxie",
		rating: 3,
		num: 153,
	},
	multiscale: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.hp >= target.maxhp) {
				this.debug('Multiscale weaken');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves damage taken when HP is full.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Multiscale",
		rating: 3.5,
		num: 136,
	},
	multitype: {
		// Multitype's type-changing itself is implemented in statuses.js
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Multitype",
		rating: 4,
		num: 121,
	},
	mummy: {
		onDamagingHit(damage, target, source, move) {
			const sourceAbility = source.getAbility();
			if (sourceAbility.flags['cantsuppress'] || sourceAbility.id === 'mummy') {
				return;
			}
			if (this.checkMoveMakesContact(move, source, target, !source.isAlly(target))) {
				source.setAbility('mummy', target);
			}
		},
		shortDesc: "Contact with this Pokémon spreads this Ability.",
		origin: 'Unchanged',
		flags: {},
		name: "Mummy",
		rating: 2,
		num: 152,
	},
	myceliummight: {
		onFractionalPriorityPriority: -1,
		onFractionalPriority(priority, pokemon, target, move) {
			if (move.category === 'Status') {
				return -0.1;
			}
		},
		onModifyMove(move) {
			if (move.category === 'Status') {
				move.ignoreAbility = true;
			}
		},
		flags: {},
		name: "Mycelium Might",
		rating: 2,
		num: 298,
	},
	naturalcure: {
		onCheckShow(pokemon) {
			// This is complicated
			// For the most part, in-game, it's obvious whether or not Natural Cure activated,
			// since you can see how many of your opponent's pokemon are statused.
			// The only ambiguous situation happens in Doubles/Triples, where multiple pokemon
			// that could have Natural Cure switch out, but only some of them get cured.
			if (pokemon.side.active.length === 1) return;
			if (pokemon.showCure === true || pokemon.showCure === false) return;

			const cureList = [];
			let noCureCount = 0;
			for (const curPoke of pokemon.side.active) {
				// pokemon not statused
				if (!curPoke?.status) {
					// this.add('-message', "" + curPoke + " skipped: not statused or doesn't exist");
					continue;
				}
				if (curPoke.showCure) {
					// this.add('-message', "" + curPoke + " skipped: Natural Cure already known");
					continue;
				}
				const species = curPoke.species;
				// pokemon can't get Natural Cure
				if (!Object.values(species.abilities).includes('Natural Cure')) {
					// this.add('-message', "" + curPoke + " skipped: no Natural Cure");
					continue;
				}
				// pokemon's ability is known to be Natural Cure
				if (!species.abilities['1'] && !species.abilities['H']) {
					// this.add('-message', "" + curPoke + " skipped: only one ability");
					continue;
				}
				// pokemon isn't switching this turn
				if (curPoke !== pokemon && !this.queue.willSwitch(curPoke)) {
					// this.add('-message', "" + curPoke + " skipped: not switching");
					continue;
				}

				if (curPoke.hasAbility('naturalcure')) {
					// this.add('-message', "" + curPoke + " confirmed: could be Natural Cure (and is)");
					cureList.push(curPoke);
				} else {
					// this.add('-message', "" + curPoke + " confirmed: could be Natural Cure (but isn't)");
					noCureCount++;
				}
			}

			if (!cureList.length || !noCureCount) {
				// It's possible to know what pokemon were cured
				for (const pkmn of cureList) {
					pkmn.showCure = true;
				}
			} else {
				// It's not possible to know what pokemon were cured

				// Unlike a -hint, this is real information that battlers need, so we use a -message
				this.add('-message', `(${cureList.length} of ${pokemon.side.name}'s pokemon ${cureList.length === 1 ? "was" : "were"} cured by Natural Cure.)`);

				for (const pkmn of cureList) {
					pkmn.showCure = false;
				}
			}
		},
		onSwitchOut(pokemon) {
			if (!pokemon.status) return;

			// if pokemon.showCure is undefined, it was skipped because its ability
			// is known
			if (pokemon.showCure === undefined) pokemon.showCure = true;

			if (pokemon.showCure) this.add('-curestatus', pokemon, pokemon.status, '[from] ability: Natural Cure', '[silent]');
			pokemon.clearStatus();

			// only reset .showCure if it's false
			// (once you know a Pokemon has Natural Cure, its cures are always known)
			if (!pokemon.showCure) pokemon.showCure = undefined;
		},
		shortDesc: "All status problems heal when it switches out.",
		origin: 'Unchanged',
		flags: {},
		name: "Natural Cure",
		rating: 2.5,
		num: 30,
	},
	neuroforce: {
		onModifyDamage(damage, source, target, move) {
			if (move && target.getMoveHitData(move).typeMod > 0) {
				return this.chainModify([5120, 4096]);
			}
		},
		flags: {},
		name: "Neuroforce",
		rating: 2.5,
		num: 233,
	},
	neutralizinggas: {
		// Ability suppression implemented in sim/pokemon.ts:Pokemon#ignoringAbility
		onSwitchInPriority: 2,
		onSwitchIn(pokemon) {
			this.add('-ability', pokemon, 'Neutralizing Gas');
			pokemon.abilityState.ending = false;
			const strongWeathers = ['desolateland', 'primordialsea', 'deltastream'];
			for (const target of this.getAllActive()) {
				if (target.hasItem('Ability Shield')) {
					this.add('-block', target, 'item: Ability Shield');
					continue;
				}
				// Can't suppress a Tatsugiri inside of Dondozo already
				if (target.volatiles['commanding']) {
					continue;
				}
				if (target.illusion) {
					this.singleEvent('End', this.dex.abilities.get('Illusion'), target.abilityState, target, pokemon, 'neutralizinggas');
				}
				if (target.volatiles['slowstart']) {
					delete target.volatiles['slowstart'];
					this.add('-end', target, 'Slow Start', '[silent]');
				}
				if (strongWeathers.includes(target.getAbility().id)) {
					this.singleEvent('End', this.dex.abilities.get(target.getAbility().id), target.abilityState, target, pokemon, 'neutralizinggas');
				}
			}
		},
		onEnd(source) {
			if (source.transformed) return;
			for (const pokemon of this.getAllActive()) {
				if (pokemon !== source && pokemon.hasAbility('Neutralizing Gas')) {
					return;
				}
			}
			this.add('-end', source, 'ability: Neutralizing Gas');

			// FIXME this happens before the pokemon switches out, should be the opposite order.
			// Not an easy fix since we cant use a supported event. Would need some kind of special event that
			// gathers events to run after the switch and then runs them when the ability is no longer accessible.
			// (If you're tackling this, do note extreme weathers have the same issue)

			// Mark this pokemon's ability as ending so Pokemon#ignoringAbility skips it
			if (source.abilityState.ending) return;
			source.abilityState.ending = true;
			const sortedActive = this.getAllActive();
			this.speedSort(sortedActive);
			for (const pokemon of sortedActive) {
				if (pokemon !== source) {
					if (pokemon.getAbility().flags['cantsuppress']) continue; // does not interact with e.g Ice Face, Zen Mode
					if (pokemon.hasItem('abilityshield')) continue; // don't restart abilities that weren't suppressed

					// Will be suppressed by Pokemon#ignoringAbility if needed
					this.singleEvent('Start', pokemon.getAbility(), pokemon.abilityState, pokemon);
					if (pokemon.ability === "gluttony") {
						pokemon.abilityState.gluttony = false;
					}
				}
			}
		},
		shortDesc: "Neutralizes the abilities of all Pokémon in battle while on the field.",
		origin: 'Unchanged',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Neutralizing Gas",
		rating: 3.5,
		num: 256,
	},
	noguard: {
		onAnyInvulnerabilityPriority: 1,
		onAnyInvulnerability(target, source, move) {
			if (move && (source === this.effectState.target || target === this.effectState.target)) return 0;
		},
		onAnyAccuracy(accuracy, target, source, move) {
			if (move && (source === this.effectState.target || target === this.effectState.target)) {
				return true;
			}
			return accuracy;
		},
		shortDesc: "Ensures attacks by or against the Pokémon land.",
		origin: 'Unchanged',
		flags: {},
		name: "No Guard",
		rating: 4,
		num: 99,
	},
	normalize: {
		onModifyTypePriority: 1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'hiddenpower', 'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'struggle', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (!(move.isZ && move.category !== 'Status') &&
				// TODO: Figure out actual interaction
				(!noModifyType.includes(move.id) || this.activeMove?.isMax) && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Normal';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "All the Pokémon's moves become Normal type and are boosted by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Normalize",
		rating: 0,
		num: 96,
	},
	oblivious: {
		onUpdate(pokemon) {
			if (pokemon.volatiles['charmed']) {
				this.add('-activate', pokemon, 'ability: Oblivious');
				pokemon.removeVolatile('charmed');
			}
			if (pokemon.volatiles['taunt']) {
				this.add('-activate', pokemon, 'ability: Oblivious');
				pokemon.removeVolatile('taunt');
				// Taunt's volatile already sends the -end message when removed
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'charmed') return false;
		},
		onTryHit(pokemon, target, move) {
			if (move.volatileStatus === 'charmed' || move.id === 'taunt') {
				this.add('-immune', pokemon, '[from] ability: Oblivious');
				return null;
			}
		},
		shortDesc: "Immune to Charmed, Intimidate, Awe-Inspiring, and Dark-type status moves.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Oblivious",
		rating: 2,
		num: 12,
	},
	opportunist: {
		onFoeAfterBoost(boost, target, source, effect) {
			if (effect?.name === 'Opportunist' || effect?.name === 'Mirror Herb') return;
			if (!this.effectState.boosts) this.effectState.boosts = {} as SparseBoostsTable;
			const boostPlus = this.effectState.boosts;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! > 0) {
					boostPlus[i] = (boostPlus[i] || 0) + boost[i]!;
				}
			}
		},
		onAnySwitchInPriority: -3,
		onAnySwitchIn() {
			if (!this.effectState.boosts) return;
			this.boost(this.effectState.boosts, this.effectState.target);
			delete this.effectState.boosts;
		},
		onAnyAfterMega() {
			if (!this.effectState.boosts) return;
			this.boost(this.effectState.boosts, this.effectState.target);
			delete this.effectState.boosts;
		},
		onAnyAfterTerastallization() {
			if (!this.effectState.boosts) return;
			this.boost(this.effectState.boosts, this.effectState.target);
			delete this.effectState.boosts;
		},
		onAnyAfterMove() {
			if (!this.effectState.boosts) return;
			this.boost(this.effectState.boosts, this.effectState.target);
			delete this.effectState.boosts;
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (!this.effectState.boosts) return;
			this.boost(this.effectState.boosts, this.effectState.target);
			delete this.effectState.boosts;
		},
		onEnd() {
			delete this.effectState.boosts;
		},
		shortDesc: "Copies stat boosts by the opponent.",
		origin: 'Unchanged',
		flags: {},
		name: "Opportunist",
		rating: 3,
		num: 290,
	},
	orichalcumpulse: {
		onStart(pokemon) {
			if (this.field.setWeather('sunnyday')) {
				this.add('-activate', pokemon, 'Orichalcum Pulse', '[source]');
			} else if (this.field.isWeather('sunnyday')) {
				this.add('-activate', pokemon, 'ability: Orichalcum Pulse');
			}
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				this.debug('Orichalcum boost');
				return this.chainModify([5461, 4096]);
			}
		},
		flags: {},
		name: "Orichalcum Pulse",
		rating: 4.5,
		num: 288,
	},
	overcoat: {
		onImmunity(type, pokemon) {
			const immuneTypes = ['sandstorm', 'hail', 'snowscape', 'sunnyday', 'raindance', 'desolateland', 'primordialsea', 'deltastream', 'powder'];
			if (immuneTypes.includes(type)) return false;
		},
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (move.flags['powder'] && target !== source && this.dex.getImmunity('powder', target)) {
				this.add('-immune', target, '[from] ability: Overcoat');
				return null;
			}
		},
		shortDesc: "Protects the Pokémon from powder moves and all weather effects.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Overcoat",
		rating: 2.5,
		num: 142,
	},
	overgrow: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Grass' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Overgrow boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Grass' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Overgrow boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Powers up Grass-type moves by x1.5 when below 1/3 MaxHP.",
		origin: 'Unchanged',
		flags: {},
		name: "Overgrow",
		rating: 2,
		num: 65,
	},
	overthinker: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (!pokemon.activeTurns) return;
			// Single Overthinker banner: suppress the boost's own ability banner
			// (isSecondary=true → plain -boost) so only the HP-cost line carries
			// [from] ability. Previously the boost AND damage each showed it (twice).
			const boosted = this.boost({ spa: 1 }, pokemon, pokemon, null, true);
			if (boosted) {
				this.damage(pokemon.baseMaxhp / 8, pokemon, pokemon);
			}
		},
		shortDesc: "Raises Sp. Atk by 1 stage each turn, but loses 1/8 max HP.",
		origin: 'Custom',
		flags: {},
		name: "Overthinker",
		rating: 3,
		num: 10002,
	},
	owntempo: {
		onUpdate(pokemon) {
			if (pokemon.volatiles['confusion']) {
				this.add('-activate', pokemon, 'ability: Own Tempo');
				pokemon.removeVolatile('confusion');
			}
			if (pokemon.volatiles['mindcontrolled']) {
				this.add('-activate', pokemon, 'ability: Own Tempo');
				pokemon.removeVolatile('mindcontrolled');
			}
		},
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'confusion' || status.id === 'mindcontrolled') return null;
		},
		onHit(target, source, move) {
			if (move?.volatileStatus === 'confusion') {
				this.add('-immune', target, 'confusion', '[from] ability: Own Tempo');
			}
			if (move?.volatileStatus === 'mindcontrolled') {
				this.add('-immune', target, 'mindcontrolled', '[from] ability: Own Tempo');
			}
		},
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Own Tempo', `[of] ${target}`);
			}
		},
		shortDesc: "Prevents the Pokémon from becoming Confused or Mind Controlled.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Own Tempo",
		rating: 2,
		num: 20,
	},
	parentalbond: {
		onPrepareHit(source, target, move) {
			if (move.category === 'Status' || move.multihit || move.flags['noparentalbond'] || move.flags['charge'] ||
				move.flags['futuremove'] || move.spreadHit || move.isZ || move.isMax) return;
			move.multihit = 2;
			move.multihitType = 'parentalbond';
		},
		// Damage modifier implemented in BattleActions#modifyDamage()
		onSourceModifySecondaries(secondaries, target, source, move) {
			if (move.multihitType === 'parentalbond' && move.id === 'secretpower' && move.hit < 2) {
				// hack to prevent accidentally suppressing King's Rock/Razor Fang
				return secondaries.filter(effect => effect.volatileStatus === 'flinch');
			}
		},
		shortDesc: "Allows the Pokémon to attack twice, first at 100% power, then again at 25% power.",
		origin: 'Unchanged',
		flags: {},
		name: "Parental Bond",
		rating: 4.5,
		num: 185,
	},
	parasiticspores: {
		onDamagingHit(damage, target, source, move) {
			if (!target.hp) {
				const typeMod = target.getMoveHitData(move).typeMod;
				if (typeMod <= 0) {
					for (const pokemon of this.getAllActive()) {
						if (!pokemon.hp || pokemon.volatiles['mindcontrolled']) continue;
						if (pokemon.hasType('Psychic')) continue;
						pokemon.addVolatile('mindcontrolled', target);
					}
				}
			}
		},
		shortDesc: "If KO'd by a non-super effective move, all Pokémon on the field become Mind Controlled.",
		origin: 'Custom',
		flags: {},
		name: "Parasitic Spores",
		rating: 2,
		num: 10009,
	},
	pastelveil: {
		onStart(pokemon) {
			for (const ally of pokemon.alliesAndSelf()) {
				if (['psn', 'tox'].includes(ally.status)) {
					this.add('-activate', pokemon, 'ability: Pastel Veil');
					ally.cureStatus();
				}
			}
		},
		onUpdate(pokemon) {
			if (['psn', 'tox'].includes(pokemon.status)) {
				this.add('-activate', pokemon, 'ability: Pastel Veil');
				pokemon.cureStatus();
			}
		},
		onAnySwitchIn() {
			((this.effect as any).onStart as (p: Pokemon) => void).call(this, this.effectState.target);
		},
		onSetStatus(status, target, source, effect) {
			if (!['psn', 'tox'].includes(status.id)) return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Pastel Veil');
			}
			return false;
		},
		onAllySetStatus(status, target, source, effect) {
			if (!['psn', 'tox'].includes(status.id)) return;
			if ((effect as Move)?.status) {
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Pastel Veil', `[of] ${effectHolder}`);
			}
			return false;
		},
		flags: { breakable: 1 },
		name: "Pastel Veil",
		rating: 2,
		num: 257,
	},
	perishbody: {
		onDamagingHit(damage, target, source, move) {
			if (!this.checkMoveMakesContact(move, source, target) || source.volatiles['perishsong']) return;
			this.add('-ability', target, 'Perish Body');
			source.addVolatile('perishsong');
			target.addVolatile('perishsong');
		},
		flags: {},
		name: "Perish Body",
		rating: 1,
		num: 253,
	},
	pickpocket: {
		// Steals item when making contact OR when being hit by a contact move.
		onAfterMove(source, target, move) {
			if (target && target !== source && move?.flags['contact']) {
				if (source.item || source.switchFlag || source.forceSwitchFlag || target.switchFlag === true) {
					return;
				}
				const theirItem = target.takeItem(source);
				if (!theirItem) return;
				if (!source.setItem(theirItem)) {
					target.item = theirItem.id;
					return;
				}
				this.add('-enditem', target, theirItem, '[silent]', '[from] ability: Pickpocket', `[of] ${source}`);
				this.add('-item', source, theirItem, '[from] ability: Pickpocket', `[of] ${source}`);
			}
		},
		onAfterMoveSecondary(target, source, move) {
			if (source && source !== target && move?.flags['contact']) {
				if (target.item || target.switchFlag || target.forceSwitchFlag || source.switchFlag === true) {
					return;
				}
				const yourItem = source.takeItem(target);
				if (!yourItem) {
					return;
				}
				if (!target.setItem(yourItem)) {
					source.item = yourItem.id;
					return;
				}
				this.add('-enditem', source, yourItem, '[silent]', '[from] ability: Pickpocket', `[of] ${source}`);
				this.add('-item', target, yourItem, '[from] ability: Pickpocket', `[of] ${source}`);
			}
		},
		flags: {},
		name: "Pickpocket",
		shortDesc: "Steals foe's held item on contact — whether user makes contact or is hit by one.",
		desc: "When this Pokémon uses a contact move or is hit by a contact move, it steals the target's held item. Activates only if this Pokémon has no item of its own.",
		origin: 'Buffed',
		rating: 1,
		num: 124,
	},
	pickup: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (pokemon.item) return;
			const pickupTargets = this.getAllActive().filter(target => (
				target.lastItem && target.usedItemThisTurn && pokemon.isAdjacent(target)
			));
			if (!pickupTargets.length) return;
			const randomTarget = this.sample(pickupTargets);
			const item = randomTarget.lastItem;
			randomTarget.lastItem = '';
			this.add('-item', pokemon, this.dex.items.get(item), '[from] ability: Pickup');
			pokemon.setItem(item);
		},
		flags: {},
		name: "Pickup",
		rating: 0.5,
		num: 53,
	},
	piercingdrill: {
		onModifyMove(move) {
			if (!move.flags['contact']) return;
			delete move.flags['protect'];
			move.flags['bypasssub'] = 1;
		},
		onHit(target, source, move) {
			if (move.flags['contact'] && target.volatiles['substitute']) {
				target.removeVolatile('substitute');
			}
		},
		shortDesc: "Contact moves bypass Protect and Substitute; destroys the Substitute.",
		origin: 'Custom',
		flags: {},
		name: "Piercing Drill",
		rating: 3,
		num: 10078,
	},
	pixilate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Fairy';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Fairy-type moves and increases their power by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Pixilate",
		rating: 4,
		num: 182,
	},
	plus: {
		onModifyBasePowerPriority: 5,
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type !== 'Electric' || move.category === 'Status') return;
			const triggered = this.battle.getAllActive().some(
				p => p !== attacker && p.hasAbility(['minus', 'magnetpull', 'magnetismpulse'])
			);
			return this.chainModify(triggered ? 1.5 : 1.1);
		},
		shortDesc: "Boosts Electric moves by ×1.1; ×1.5 if any Pokémon on field has Minus, Magnet Pull, or Magnetism Pulse.",
		origin: 'Buffed',
		flags: {},
		name: "Plus",
		rating: 0,
		num: 57,
	},
	plushy: {
		onSourceModifyDamage(damage, source, target, move) {
			let mod = 1;
			if (move.type === 'Fire') mod *= 2;
			if (move.category === 'Physical') mod /= 2;
			return this.chainModify(mod);
		},
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect && (effect.id === 'brn' || effect.id === 'scr')) return damage * 2;
		},
		shortDesc: "Halves damage from Physical moves, but doubles damage from Fire-type moves and burn/scorch.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Plushy",
		rating: 3.5,
		num: 10008,
	},
	poisonedscales: {
		// When hit by a direct attack, poison all active Pokémon (blocked by powder immunity).
		onDamagingHit(damage, target, source, move) {
			for (const pokemon of this.getAllActive()) {
				if (!pokemon.hp) continue;
				// Blocked by powder immunity: Grass types, Safety Goggles, Overcoat
				if (pokemon.hasType('Grass')) continue;
				if (pokemon.hasItem('safetygoggles')) continue;
				if (pokemon.hasAbility('overcoat')) continue;
				pokemon.trySetStatus('psn', target);
			}
		},
		shortDesc: "When hit by a direct attack, poisons all active Pokémon (blocked by powder immunity).",
		origin: 'Custom',
		flags: {},
		name: "Poisoned Scales",
		rating: 2.5,
		num: 10017,
	},
	poisonheal: {
		onDamagePriority: 1,
		onDamage(damage, target, source, effect) {
			if (effect.id === 'psn' || effect.id === 'tox') {
				this.heal(target.baseMaxhp / 8);
				return false;
			}
		},
		shortDesc: "Restores 1/8 MaxHP per turn instead of taking poison damage.",
		origin: 'Unchanged',
		flags: {},
		name: "Poison Heal",
		rating: 4,
		num: 90,
	},
	poisonpoint: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(1, 2)) {
					source.trySetStatus('psn', target);
				}
			}
		},
		shortDesc: "Contact with the Pokémon has a 50% chance to poison the attacker.",
		origin: 'Buffed',
		flags: {},
		name: "Poison Point",
		rating: 2,
		num: 38,
	},
	poisonpuppeteer: {
		onAnyAfterSetStatus(status, target, source, effect) {
			if (source.baseSpecies.name !== "Pecharunt") return;
			if (source !== this.effectState.target || target === source || effect.effectType !== 'Move') return;
			if (status.id === 'psn' || status.id === 'tox') {
				target.addVolatile('confusion');
			}
		},
		shortDesc: "Pokémon poisoned by Pecharunt also become confused.",
		origin: 'Unchanged',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
		name: "Poison Puppeteer",
		rating: 3,
		num: 310,
	},
	poisontouch: {
		onSourceDamagingHit(damage, target, source, move) {
			// Despite not being a secondary, Shield Dust / Covert Cloak block Poison Touch's effect
			if (target.hasAbility('shielddust') || target.hasItem('covertcloak')) return;
			if (this.checkMoveMakesContact(move, target, source)) {
				if (this.randomChance(1, 2)) {
					target.trySetStatus('psn', source);
				}
			}
		},
		shortDesc: "May poison the target when making contact (50% chance).",
		origin: 'Buffed',
		flags: {},
		name: "Poison Touch",
		rating: 2.5,
		num: 143,
	},
	polluted: {
		// Attacks sharing the Pokémon's type have a 30% chance to poison the target.
		onModifyMove(move, source, target) {
			if (move.category === 'Status') return;
			if (source.hasType(move.type)) {
				if (!move.secondaries) move.secondaries = [];
				move.secondaries.push({
					chance: 30,
					status: 'psn',
				});
			}
		},
		shortDesc: "Attacks sharing the Pokémon's type have a 30% chance to poison the target.",
		origin: 'Custom',
		flags: {},
		name: "Polluted",
		rating: 2,
		num: 10010,
	},
	powerconstruct: {
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Zygarde' || pokemon.transformed || !pokemon.hp) return;
			if (pokemon.species.id === 'zygardecomplete' || pokemon.hp > pokemon.maxhp / 2) return;
			this.add('-activate', pokemon, 'ability: Power Construct');
			pokemon.formeChange('Zygarde-Complete', this.effect, true);
			pokemon.canMegaEvo = pokemon.canMegaEvo === false ? false : this.actions.canMegaEvo(pokemon);
			pokemon.formeRegression = true;
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Power Construct",
		rating: 5,
		num: 211,
	},
	powerofalchemy: {
		onAllyFaint(target) {
			if (!this.effectState.target.hp) return;
			const ability = target.getAbility();
			if (ability.flags['noreceiver'] || ability.id === 'noability') return;
			this.effectState.target.setAbility(ability, target);
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
		name: "Power of Alchemy",
		rating: 0,
		num: 223,
	},
	powerspot: {
		onAllyBasePowerPriority: 22,
		onAllyBasePower(basePower, attacker, defender, move) {
			if (attacker !== this.effectState.target) {
				this.debug('Power Spot boost');
				return this.chainModify([5325, 4096]);
			}
		},
		shortDesc: "Boosts power of an ally's moves by x1.3.",
		origin: 'Unchanged',
		flags: {},
		name: "Power Spot",
		rating: 0,
		num: 249,
	},
	prankster: {
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.category === 'Status') {
				move.pranksterBoosted = true;
				return priority + 1;
			}
		},
		shortDesc: "Gives +1 priority to status moves.",
		origin: 'Unchanged',
		flags: {},
		name: "Prankster",
		rating: 4,
		num: 158,
	},
	pressure: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Pressure');
		},
		onDeductPP(target, source) {
			if (target.isAlly(source)) return;
			return 1;
		},
		shortDesc: "The Pokémon raises the foe's PP usage by +2.",
		origin: 'Buffed',
		flags: {},
		name: "Pressure",
		rating: 2.5,
		num: 46,
	},
	primordialsea: {
		onStart(source) {
			this.field.setWeather('primordialsea');
		},
		onAnySetWeather(target, source, weather) {
			const strongWeathers = ['desolateland', 'primordialsea', 'deltastream'];
			if (this.field.getWeather().id === 'primordialsea' && !strongWeathers.includes(weather.id)) return false;
		},
		onEnd(pokemon) {
			if (this.field.weatherState.source !== pokemon) return;
			for (const target of this.getAllActive()) {
				if (target === pokemon) continue;
				if (target.hasAbility('primordialsea')) {
					this.field.weatherState.source = target;
					return;
				}
			}
			this.field.clearWeather();
		},
		flags: {},
		name: "Primordial Sea",
		rating: 4.5,
		num: 189,
	},
	prismarmor: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0) {
				this.debug('Prism Armor neutralize');
				return this.chainModify(0.75);
			}
		},
		flags: {},
		name: "Prism Armor",
		rating: 3,
		num: 232,
	},
	propellertail: {
		onModifyMovePriority: 1,
		onModifyMove(move) {
			// most of the implementation is in Battle#getTarget
			move.tracksTarget = move.target !== 'scripted';
		},
		shortDesc: "Ignores moves and abilities that draw in moves.",
		origin: 'Unchanged',
		flags: {},
		name: "Propeller Tail",
		rating: 0,
		num: 239,
	},
	protean: {
		onPrepareHit(source, target, move) {
			if (this.effectState.protean) return;
			if (move.hasBounced || move.flags['futuremove'] || move.sourceEffect === 'snatch' || move.callsMove) return;
			const type = move.type;
			if (type && type !== '???' && source.getTypes().join() !== type) {
				if (!source.setType(type)) return;
				this.effectState.protean = true;
				this.add('-start', source, 'typechange', type, '[from] ability: Protean');
			}
		},
		shortDesc: "Changes the Pokémon's type to its last used move.",
		origin: 'Standby',
		flags: {},
		name: "Protean",
		rating: 4,
		num: 168,
	},
	protectivesoul: {
		// When KO'd, leaves a free substitute for the next ally that switches in.
		onDamagingHit(damage, target, source, move) {
			if (!target.hp) {
				target.side.addSideCondition('protectivesoulbarrier', target);
				const sc = target.side.sideConditions['protectivesoulbarrier'];
				if (sc) (sc as any).barrierHP = 1;
			}
		},
		shortDesc: "When KO'd, leaves a 1 HP substitute for the next ally that switches in.",
		origin: 'Custom',
		flags: {},
		name: "Protective Soul",
		rating: 2,
		num: 10012,
	},
	protosynthesis: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('WeatherChange', this.effect, this.effectState, pokemon);
		},
		onWeatherChange(pokemon) {
			// Protosynthesis is not affected by Utility Umbrella
			if (this.field.isWeather('sunnyday')) {
				pokemon.addVolatile('protosynthesis');
			} else if (!pokemon.volatiles['protosynthesis']?.fromBooster && !this.field.isWeather('sunnyday')) {
				pokemon.removeVolatile('protosynthesis');
			}
		},
		onEnd(pokemon) {
			delete pokemon.volatiles['protosynthesis'];
			this.add('-end', pokemon, 'Protosynthesis', '[silent]');
		},
		condition: {
			noCopy: true,
			onStart(pokemon, source, effect) {
				if (effect?.name === 'Booster Energy') {
					this.effectState.fromBooster = true;
					this.add('-activate', pokemon, 'ability: Protosynthesis', '[fromitem]');
				} else {
					this.add('-activate', pokemon, 'ability: Protosynthesis');
				}
				this.effectState.bestStat = pokemon.getBestStat(false, true);
				this.add('-start', pokemon, 'protosynthesis' + this.effectState.bestStat);
			},
			onModifyAtkPriority: 5,
			onModifyAtk(atk, pokemon) {
				if (this.effectState.bestStat !== 'atk' || pokemon.ignoringAbility()) return;
				this.debug('Protosynthesis atk boost');
				return this.chainModify([5325, 4096]);
			},
			onModifyDefPriority: 6,
			onModifyDef(def, pokemon) {
				if (this.effectState.bestStat !== 'def' || pokemon.ignoringAbility()) return;
				this.debug('Protosynthesis def boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpAPriority: 5,
			onModifySpA(spa, pokemon) {
				if (this.effectState.bestStat !== 'spa' || pokemon.ignoringAbility()) return;
				this.debug('Protosynthesis spa boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpDPriority: 6,
			onModifySpD(spd, pokemon) {
				if (this.effectState.bestStat !== 'spd' || pokemon.ignoringAbility()) return;
				this.debug('Protosynthesis spd boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpe(spe, pokemon) {
				if (this.effectState.bestStat !== 'spe' || pokemon.ignoringAbility()) return;
				this.debug('Protosynthesis spe boost');
				return this.chainModify(1.5);
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'Protosynthesis');
			},
		},
		shortDesc: "Raises highest stat in harsh sunlight, or if holding Booster Energy.",
		origin: 'Standby',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Protosynthesis",
		rating: 3,
		num: 281,
	},
	psychicsurge: {
		onStart(source) {
			this.field.setTerrain('psychicterrain');
		},
		shortDesc: "The Pokémon creates a Psychic Terrain when it enters a battle.",
		origin: 'Standby',
		flags: {},
		name: "Psychic Surge",
		rating: 4,
		num: 227,
	},
	punkrock: {
		onBasePowerPriority: 7,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['sound']) {
				this.debug('Punk Rock boost');
				return this.chainModify([5325, 4096]);
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.flags['sound']) {
				this.debug('Punk Rock weaken');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Boosts sound-based moves and halves damage from the same moves.",
		origin: 'Standby',
		flags: { breakable: 1 },
		name: "Punk Rock",
		rating: 3.5,
		num: 244,
	},
	purepower: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk) {
			return this.chainModify(2);
		},
		shortDesc: "Doubles the Pokémon's Attack stat.",
		origin: 'Unchanged',
		flags: {},
		name: "Pure Power",
		rating: 5,
		num: 74,
	},
	purifyingsalt: {
		onSetStatus(status, target, source, effect) {
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Purifying Salt');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.add('-immune', target, '[from] ability: Purifying Salt');
				return null;
			}
		},
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ghost') {
				this.debug('Purifying Salt weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(spa, attacker, defender, move) {
			if (move.type === 'Ghost') {
				this.debug('Purifying Salt weaken');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Protects from status conditions and halves damage from Ghost-type moves.",
		origin: 'Unchanged',
		flags: { breakable: 1 },
		name: "Purifying Salt",
		rating: 4,
		num: 272,
	},
	quarkdrive: {
		onSwitchInPriority: -2,
		onStart(pokemon) {
			this.singleEvent('TerrainChange', this.effect, this.effectState, pokemon);
		},
		onTerrainChange(pokemon) {
			if (this.field.isTerrain('electricterrain')) {
				pokemon.addVolatile('quarkdrive');
			} else if (!pokemon.volatiles['quarkdrive']?.fromBooster) {
				pokemon.removeVolatile('quarkdrive');
			}
		},
		onEnd(pokemon) {
			delete pokemon.volatiles['quarkdrive'];
			this.add('-end', pokemon, 'Quark Drive', '[silent]');
		},
		condition: {
			noCopy: true,
			onStart(pokemon, source, effect) {
				if (effect?.name === 'Booster Energy') {
					this.effectState.fromBooster = true;
					this.add('-activate', pokemon, 'ability: Quark Drive', '[fromitem]');
				} else {
					this.add('-activate', pokemon, 'ability: Quark Drive');
				}
				this.effectState.bestStat = pokemon.getBestStat(false, true);
				this.add('-start', pokemon, 'quarkdrive' + this.effectState.bestStat);
			},
			onModifyAtkPriority: 5,
			onModifyAtk(atk, pokemon) {
				if (this.effectState.bestStat !== 'atk' || pokemon.ignoringAbility()) return;
				this.debug('Quark Drive atk boost');
				return this.chainModify([5325, 4096]);
			},
			onModifyDefPriority: 6,
			onModifyDef(def, pokemon) {
				if (this.effectState.bestStat !== 'def' || pokemon.ignoringAbility()) return;
				this.debug('Quark Drive def boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpAPriority: 5,
			onModifySpA(spa, pokemon) {
				if (this.effectState.bestStat !== 'spa' || pokemon.ignoringAbility()) return;
				this.debug('Quark Drive spa boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpDPriority: 6,
			onModifySpD(spd, pokemon) {
				if (this.effectState.bestStat !== 'spd' || pokemon.ignoringAbility()) return;
				this.debug('Quark Drive spd boost');
				return this.chainModify([5325, 4096]);
			},
			onModifySpe(spe, pokemon) {
				if (this.effectState.bestStat !== 'spe' || pokemon.ignoringAbility()) return;
				this.debug('Quark Drive spe boost');
				return this.chainModify(1.5);
			},
			onEnd(pokemon) {
				this.add('-end', pokemon, 'Quark Drive');
			},
		},
		shortDesc: "Raises highest stat on Electric Terrain, or if holding Booster Energy.",
		origin: 'Standby',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, notransform: 1 },
		name: "Quark Drive",
		rating: 3,
		num: 282,
	},
	royalmajesty: {
		onFoeTryMove(target, source, move) {
			const targetAllExceptions = ['perishsong', 'flowershield', 'rototiller'];
			if (move.target === 'foeSide' || (move.target === 'all' && !targetAllExceptions.includes(move.id))) {
				return;
			}

			const dazzlingHolder = this.effectState.target;
			if ((source.isAlly(dazzlingHolder) || move.target === 'all') && move.priority > 0.1) {
				this.attrLastMove('[still]');
				this.add('cant', dazzlingHolder, 'ability: Royal Majesty', move, `[of] ${target}`);
				return false;
			}
		},
		shortDesc: "Blocks priority moves of priority +1 or higher, barring Protection moves.",
		origin: 'Renamed',
		flags: { breakable: 1 },
		name: "Royal Majesty",
		rating: 2.5,
		num: 214,
	},
	quickdraw: {
		onFractionalPriorityPriority: -1,
		onFractionalPriority(priority, pokemon, target, move) {
			if (move.category !== "Status" && this.randomChance(3, 10)) {
				this.add('-activate', pokemon, 'ability: Quick Draw');
				return 0.1;
			}
		},
		shortDesc: "30% chance for the Pokémon to move first.",
		origin: 'Unchanged',
		flags: {},
		name: "Quick Draw",
		rating: 2.5,
		num: 259,
	},
	quickfeet: {
		onModifySpe(spe, pokemon) {
			if (pokemon.status) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts Speed by x1.5 if statused; ignores Speed-reducing effects of statuses.",
		origin: 'Unchanged',
		flags: {},
		name: "Quick Feet",
		rating: 2.5,
		num: 95,
	},
	raindish: {
		onWeather(target, source, effect) {
			if (target.effectiveWeather() !== effect.id) return;
			if (effect.id === 'raindance' || effect.id === 'primordialsea') {
				this.heal(target.baseMaxhp / 16);
			}
		},
		shortDesc: "The Pokémon gradually regains HP in rain.",
		origin: 'Standby',
		flags: {},
		name: "Rain Dish",
		rating: 1.5,
		num: 44,
	},
	rattled: {
		onDamagingHit(damage, target, source, move) {
			if (['Dark', 'Bug', 'Ghost'].includes(move.type)) {
				this.boost({ spe: 1 });
			}
		},
		onAfterBoost(boost, target, source, effect) {
			if (effect?.name === 'Intimidate' && boost.atk) {
				this.boost({ spe: 1 });
			}
		},
		shortDesc: "Bug, Ghost, or Dark moves and Intimidate scare the Pokémon, boosting its Speed by +1.",
		origin: 'Unchanged',
		flags: {},
		name: "Rattled",
		rating: 1,
		num: 155,
	},
	receiver: {
		// Reworked: blocks Ball/Bursting moves and returns them at full power using the attacker's own stats.
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (target === source) return;
			if (!move.flags['ball'] && !move.flags['bursting']) return;
			this.add('-ability', target, 'Receiver');
			if (move.basePower > 0 && move.category !== 'Status') {
				const returnDamage = this.actions.getDamage(source, source, move, false as any);
				if (typeof returnDamage === 'number' && returnDamage > 0) {
					this.damage(returnDamage, source, target, move);
				}
			}
			return null;
		},
		shortDesc: "Blocks Ball and Bursting attacks, returning them at full power using the attacker's own stats.",
		origin: 'Reworked',
		flags: { breakable: 1 },
		name: "Receiver",
		rating: 2.5,
		num: 222,
	},
	reckless: {
		onBasePowerPriority: 23,
		onBasePower(basePower, attacker, defender, move) {
			if (move.recoil || move.hasCrashDamage) {
				this.debug('Reckless boost');
				return this.chainModify([4915, 4096]);
			}
		},
		shortDesc: "Powers up moves that have recoil damage by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Reckless",
		rating: 3,
		num: 120,
	},
	refrigerate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Ice';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Ice-type moves and increases their power by x1.2.",
		origin: 'Unchanged',
		flags: {},
		name: "Refrigerate",
		rating: 4,
		num: 174,
	},
	regenerator: {
		onSwitchOut(pokemon) {
			// Record turn for the accumulating heal system. Applies to both native
			// and borrowed Regenerator (Trace/Imposter). The actual healing is applied
			// by the format-level onSwitchIn in config/formats.ts so it fires even
			// when the ability has reverted to Trace/Imposter by re-entry.
			pokemon.m.regenTurnOut = this.turn;
		},
		shortDesc: "Heals 10% MaxHP per turn while inactive, up to 30% after 3 turns.",
		origin: 'Nerfed',
		flags: {},
		name: "Regenerator",
		rating: 3.5,
		num: 144,
	},
	ripen: {
		onTryHeal(damage, target, source, effect) {
			if (!effect) return;
			if (effect.name === 'Berry Juice' || effect.name === 'Leftovers') {
				this.add('-activate', target, 'ability: Ripen');
			}
			if ((effect as Item).isBerry) return this.chainModify(2);
		},
		onChangeBoost(boost, target, source, effect) {
			if (effect && (effect as Item).isBerry) {
				let b: BoostID;
				for (b in boost) {
					boost[b]! *= 2;
				}
			}
		},
		onSourceModifyDamagePriority: -1,
		onSourceModifyDamage(damage, source, target, move) {
			if (target.abilityState.berryWeaken) {
				target.abilityState.berryWeaken = false;
				return this.chainModify(0.5);
			}
		},
		onTryEatItemPriority: -1,
		onTryEatItem(item, pokemon) {
			this.add('-activate', pokemon, 'ability: Ripen');
		},
		onEatItem(item, pokemon) {
			const weakenBerries = [
				'Babiri Berry', 'Charti Berry', 'Chilan Berry', 'Chople Berry', 'Coba Berry', 'Colbur Berry', 'Haban Berry', 'Kasib Berry', 'Kebia Berry', 'Occa Berry', 'Passho Berry', 'Payapa Berry', 'Rindo Berry', 'Roseli Berry', 'Shuca Berry', 'Tanga Berry', 'Wacan Berry', 'Yache Berry',
			];
			// Record if the pokemon ate a berry to resist the attack
			pokemon.abilityState.berryWeaken = weakenBerries.includes(item.name);
		},
		shortDesc: "Doubles the effect of berries.",
		origin: 'Unchanged',
		flags: {},
		name: "Ripen",
		rating: 2,
		num: 247,
	},
	rivalry: {
		onBasePowerPriority: 24,
		onBasePower(basePower, attacker, defender, move) {
			if (attacker.gender && defender.gender) {
				if (attacker.gender === defender.gender) {
					this.debug('Rivalry boost');
					return this.chainModify(1.3);
				} else {
					this.debug('Rivalry weaken');
					return this.chainModify(0.8);
				}
			}
		},
		shortDesc: "Deals x1.3 damage vs same gender; x0.8 vs opposite gender.",
		origin: 'Buffed',
		flags: {},
		name: "Rivalry",
		rating: 0.5,
		num: 79,
	},
	rkssystem: {
		// RKS System's type-changing itself is implemented in statuses.js
		shortDesc: "Changes type depending on held item.",
		origin: 'Standby',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "RKS System",
		rating: 4,
		num: 225,
	},
	rockhead: {
		onDamage(damage, target, source, effect) {
			if (effect.id === 'recoil') {
				if (!this.activeMove) throw new Error("Battle.activeMove is null");
				if (this.activeMove.id !== 'struggle') return null;
			}
			if (effect.id === 'lifeorb') return null;
		},
		shortDesc: "Protects the Pokémon from recoil damage, including Life Orb recoil.",
		origin: 'Buffed',
		flags: {},
		name: "Rock Head",
		rating: 3.5,
		num: 69,
	},
	rockypayload: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Rock') {
				this.debug('Rocky Payload boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Rock') {
				this.debug('Rocky Payload boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Powers up Rock-type moves by x1.5.",
		origin: 'Unchanged',
		flags: {},
		name: "Rocky Payload",
		rating: 3.5,
		num: 276,
	},
	roughskin: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				this.damage(source.baseMaxhp / 8, source, target);
			}
		},
		shortDesc: "Inflicts 1/8 MaxHP damage to attackers on contact.",
		origin: 'Unchanged',
		flags: {},
		name: "Rough Skin",
		rating: 2.5,
		num: 24,
	},
	runaway: {
		// Cannot be trapped; +1 Speed once the first time trapping is attempted per switch-in.
		onStart(pokemon) {
			this.effectState.trapBoostGiven = false;
		},
		onImmunity(type, pokemon) {
			if (type === 'trapped') {
				if (!this.effectState.trapBoostGiven) {
					this.effectState.trapBoostGiven = true;
					this.boost({ spe: 1 }, pokemon);
				}
				return false;
			}
		},
		shortDesc: "Cannot be trapped; gains +1 Speed the first time a foe attempts to trap it.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Run Away",
		rating: 1.5,
		num: 50,
	},
	sandforce: {
		onBasePowerPriority: 21,
		onBasePower(basePower, attacker, defender, move) {
			if (this.field.isWeather('sandstorm')) {
				if (move.type === 'Rock' || move.type === 'Ground' || move.type === 'Steel') {
					this.debug('Sand Force boost');
					return this.chainModify([5325, 4096]);
				}
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		shortDesc: "Boosts certain moves' power in a sandstorm.",
		origin: 'Standby',
		flags: {},
		name: "Sand Force",
		rating: 2,
		num: 159,
	},
	sandrush: {
		onModifySpe(spe, pokemon) {
			if (this.field.isWeather('sandstorm')) {
				return this.chainModify(2);
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		shortDesc: "Boosts the Pokémon's Speed in a sandstorm.",
		origin: 'Standby',
		flags: {},
		name: "Sand Rush",
		rating: 3,
		num: 146,
	},
	sandspit: {
		onDamagingHit(damage, target, source, move) {
			this.field.setWeather('sandstorm');
		},
		shortDesc: "Creates a sandstorm when hit by an attack.",
		origin: 'Standby',
		flags: {},
		name: "Sand Spit",
		rating: 1,
		num: 245,
	},
	sandstream: {
		onStart(source) {
			this.field.setWeather('sandstorm');
		},
		shortDesc: "The Pokémon summons a sandstorm in battle.",
		origin: 'Standby',
		flags: {},
		name: "Sand Stream",
		rating: 4,
		num: 45,
	},
	sandveil: {
		onImmunity(type, pokemon) {
			if (type === 'sandstorm') return false;
		},
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			if (this.field.isWeather('sandstorm')) {
				this.debug('Sand Veil - decreasing accuracy');
				return this.chainModify([3277, 4096]);
			}
		},
		shortDesc: "Boosts the Pokémon's evasion in a sandstorm.",
		origin: 'Standby',
		flags: { breakable: 1 },
		name: "Sand Veil",
		rating: 1.5,
		num: 8,
	},
	sapsipper: {
		// Altered: 50% damage reduction instead of immunity; boosts both Atk and SpA.
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Grass') return this.chainModify(0.5);
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Grass') this.boost({ atk: 1, spa: 1 }, target);
		},
		shortDesc: "Halves damage from Grass-type moves; raises Attack and Sp. Atk by +1 when hit by one.",
		origin: 'Altered',
		flags: {},
		name: "Sap Sipper",
		rating: 3,
		num: 157,
	},
	schooling: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Wishiwashi' || pokemon.level < 20 || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'wishiwashi') {
					pokemon.formeChange('Wishiwashi-School');
				}
			} else {
				if (pokemon.species.id === 'wishiwashischool') {
					pokemon.formeChange('Wishiwashi');
				}
			}
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (
				pokemon.baseSpecies.baseSpecies !== 'Wishiwashi' || pokemon.level < 20 ||
				pokemon.transformed || !pokemon.hp
			) return;
			if (pokemon.hp > pokemon.maxhp / 4) {
				if (pokemon.species.id === 'wishiwashi') {
					pokemon.formeChange('Wishiwashi-School');
				}
			} else {
				if (pokemon.species.id === 'wishiwashischool') {
					pokemon.formeChange('Wishiwashi');
				}
			}
		},
		shortDesc: "Changes Wishiwashi to School Form.",
		origin: 'Standby',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Schooling",
		rating: 3,
		num: 208,
	},
	scrappy: {
		onModifyMovePriority: -5,
		onModifyMove(move) {
			if (!move.ignoreImmunity) move.ignoreImmunity = {};
			if (move.ignoreImmunity !== true) {
				move.ignoreImmunity['Fighting'] = true;
				move.ignoreImmunity['Normal'] = true;
			}
		},
		onTryBoost(boost, target, source, effect) {
			if (effect.name === 'Intimidate' && boost.atk) {
				delete boost.atk;
				this.add('-fail', target, 'unboost', 'Attack', '[from] ability: Scrappy', `[of] ${target}`);
			}
		},
		shortDesc: "Normal and Fighting moves hit Ghost types; immune to Intimidate.",
		origin: 'Unchanged',
		flags: {},
		name: "Scrappy",
		rating: 3,
		num: 113,
	},
	screencleaner: {
		onStart(pokemon) {
			let activated = false;
			for (const sideCondition of ['reflect', 'lightscreen', 'auroraveil']) {
				for (const side of [pokemon.side, ...pokemon.side.foeSidesWithConditions()]) {
					if (side.getSideCondition(sideCondition)) {
						if (!activated) {
							this.add('-activate', pokemon, 'ability: Screen Cleaner');
							activated = true;
						}
						side.removeSideCondition(sideCondition);
					}
				}
			}
		},
		shortDesc: "Nullifies effects of Light Screen, Reflect, and Aurora Veil on switch-in.",
		origin: 'Unchanged',
		flags: {},
		name: "Screen Cleaner",
		rating: 2,
		num: 251,
	},
	seedsower: {
		onDamagingHit(damage, target, source, move) {
			this.field.setTerrain('grassyterrain');
		},
		shortDesc: "Turns the ground into Grassy Terrain when the Pokémon is hit by an attack.",
		origin: 'Standby',
		flags: {},
		name: "Seed Sower",
		rating: 2.5,
		num: 269,
	},
	serenegrace: {
		onModifyMovePriority: -2,
		onModifyMove(move) {
			if (move.secondaries) {
				this.debug('doubling secondary chance');
				for (const secondary of move.secondaries) {
					if (secondary.chance) secondary.chance *= 2;
				}
			}
			if (move.self?.chance) move.self.chance *= 2;
		},
		shortDesc: "Doubles the likelihood of added effects occurring.",
		origin: 'Unchanged',
		flags: {},
		name: "Serene Grace",
		rating: 3.5,
		num: 32,
	},
	shadowshield: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.hp >= target.maxhp) {
				this.debug('Shadow Shield weaken');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves damage taken when HP is full.",
		origin: 'Unchanged',
		flags: {},
		name: "Shadow Shield",
		rating: 3.5,
		num: 231,
	},
	shadowtag: {
		onFoeTrapPokemon(pokemon) {
			if (!pokemon.hasAbility('shadowtag') && pokemon.isAdjacent(this.effectState.target)) {
				pokemon.tryTrap(true);
			}
		},
		onFoeMaybeTrapPokemon(pokemon, source) {
			if (!source) source = this.effectState.target;
			if (!source || !pokemon.isAdjacent(source)) return;
			if (!pokemon.hasAbility('shadowtag')) {
				pokemon.maybeTrapped = true;
			}
		},
		// Nerfed: also traps the user.
		onTrapPokemon(pokemon) {
			pokemon.tryTrap(true);
		},
		onMaybeTrapPokemon(pokemon) {
			pokemon.maybeTrapped = true;
		},
		shortDesc: "Prevents all Pokémon, including the user, from switching out.",
		origin: 'Nerfed',
		flags: {},
		name: "Shadow Tag",
		rating: 3.5,
		num: 23,
	},
	sharpness: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['slicing']) {
				this.debug('Sharpness boost');
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts the power of slicing moves by x1.5.",
		origin: 'Unchanged',
		flags: {},
		name: "Sharpness",
		rating: 3.5,
		num: 292,
	},
	shedskin: {
		onResidualOrder: 5,
		onResidualSubOrder: 3,
		onResidual(pokemon) {
			if (pokemon.hp && pokemon.status && this.randomChance(1, 2)) {
				this.debug('shed skin');
				this.add('-activate', pokemon, 'ability: Shed Skin');
				pokemon.cureStatus();
			}
		},
		onImmunity(type, pokemon) {
			if (type === 'trapped') return false;
		},
		shortDesc: "50% chance to heal status at end of each turn; cannot be trapped.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Shed Skin",
		rating: 3.5,
		num: 61,
	},
	sheerforce: {
		onModifyMove(move, pokemon) {
			if (move.secondaries && !move.hasSheerForceBoost) {
				delete move.secondaries;
				// Technically not a secondary effect, but it is negated
				delete move.self;
				if (move.id === 'clangoroussoulblaze') delete move.selfBoost;
				// Actual negation of `AfterMoveSecondary` effects implemented in scripts.js
				move.hasSheerForce = true;
			}
		},
		onBasePowerPriority: 21,
		onBasePower(basePower, pokemon, target, move) {
			if (move.hasSheerForce || move.hasSheerForceBoost) return this.chainModify([5325, 4096]);
		},
		shortDesc: "Removes secondary effects to boost move power by 30%; no longer suppresses Life Orb recoil.",
		origin: 'Nerfed',
		flags: {},
		name: "Sheer Force",
		rating: 3.5,
		num: 125,
	},
	shellarmor: {
		onCriticalHit: false,
		onModifySecondaries(secondaries) {
			return secondaries.map(effect => {
				if (!effect.self) return {...effect, chance: Math.ceil((effect.chance || 100) / 2)};
				return effect;
			});
		},
		shortDesc: "Protected from crits; secondary effects against this Pokémon have halved chances.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Shell Armor",
		rating: 2,
		num: 75,
	},
	shielddust: {
		onModifySecondaries(secondaries) {
			this.debug('Shield Dust prevent secondary');
			return secondaries.filter(effect => !!effect.self);
		},
		flags: { breakable: 1 },
		shortDesc: "Blocks the secondary effects of attacks taken.",
		origin: 'Unchanged',
		name: "Shield Dust",
		rating: 2,
		num: 19,
	},
	shieldsdown: {
		onSwitchInPriority: -1,
		onStart(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Minior' || pokemon.transformed) return;
			if (pokemon.hp > pokemon.maxhp / 2) {
				if (pokemon.species.forme !== 'Meteor') {
					pokemon.formeChange('Minior-Meteor');
				}
			} else {
				if (pokemon.species.forme === 'Meteor') {
					pokemon.formeChange(pokemon.set.species);
				}
			}
		},
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Minior' || pokemon.transformed || !pokemon.hp) return;
			if (pokemon.hp > pokemon.maxhp / 2) {
				if (pokemon.species.forme !== 'Meteor') {
					pokemon.formeChange('Minior-Meteor');
				}
			} else {
				if (pokemon.species.forme === 'Meteor') {
					pokemon.formeChange(pokemon.set.species);
				}
			}
		},
		onSetStatus(status, target, source, effect) {
			if (target.species.id !== 'miniormeteor' || target.transformed) return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Shields Down');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (target.species.id !== 'miniormeteor' || target.transformed) return;
			if (status.id !== 'yawn') return;
			this.add('-immune', target, '[from] ability: Shields Down');
			return null;
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Shields Down",
		rating: 3,
		num: 197,
	},
	simple: {
		onChangeBoost(boost, target, source, effect) {
			if (effect && effect.id === 'zpower') return;
			let i: BoostID;
			for (i in boost) {
				boost[i]! *= 2;
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Doubles all of this Pokémon's stat changes.",
		origin: 'Unchanged',
		name: "Simple",
		rating: 4,
		num: 86,
	},
	skilllink: {
		onModifyMove(move) {
			if (move.multihit && Array.isArray(move.multihit) && move.multihit.length) {
				move.multihit = move.multihit[1];
			}
			if (move.multiaccuracy) {
				delete move.multiaccuracy;
			}
		},
		flags: {},
		shortDesc: "Multi-strike moves always hit the maximum number of times.",
		origin: 'Unchanged',
		name: "Skill Link",
		rating: 3,
		num: 92,
	},
	slowstart: {
		onStart(pokemon) {
			this.add('-start', pokemon, 'ability: Slow Start');
			this.effectState.counter = 5;
		},
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (pokemon.activeTurns && this.effectState.counter) {
				this.effectState.counter--;
				if (!this.effectState.counter) {
					this.add('-end', pokemon, 'Slow Start');
					delete this.effectState.counter;
				}
			}
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			if (this.effectState.counter) {
				return this.chainModify(0.5);
			}
		},
		onModifySpe(spe, pokemon) {
			if (this.effectState.counter) {
				return this.chainModify(0.5);
			}
		},
		onEnd(pokemon) {
			if (pokemon.beingCalledBack) return;
			this.add('-end', pokemon, 'Slow Start', '[silent]');
		},
		flags: {},
		name: "Slow Start",
		rating: -1,
		num: 112,
	},
	slushrush: {
		onModifySpe(spe, pokemon) {
			if (this.field.isWeather(['hail', 'snowscape'])) {
				return this.chainModify(2);
			}
		},
		flags: {},
		name: "Slush Rush",
		rating: 3,
		num: 202,
	},
	sniper: {
		onModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).crit) {
				this.debug('Sniper boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "This Pokémon's critical hits deal 2.25x damage instead of 1.5x.",
		origin: 'Unchanged',
		name: "Sniper",
		rating: 2,
		num: 97,
	},
	snowcloak: {
		onImmunity(type, pokemon) {
			if (type === 'hail') return false;
		},
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			if (this.field.isWeather(['hail', 'snowscape'])) {
				this.debug('Snow Cloak - decreasing accuracy');
				return this.chainModify([3277, 4096]);
			}
		},
		flags: { breakable: 1 },
		name: "Snow Cloak",
		rating: 1.5,
		num: 81,
	},
	snowwarning: {
		onStart(source) {
			this.field.setWeather('snowscape');
		},
		flags: {},
		name: "Snow Warning",
		rating: 4,
		num: 117,
	},
	solarpower: {
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (['sunnyday', 'desolateland'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(1.5);
			}
		},
		onWeather(target, source, effect) {
			if (target.effectiveWeather() !== effect.id) return;
			if (effect.id === 'sunnyday' || effect.id === 'desolateland') {
				this.damage(target.baseMaxhp / 8, target, target);
			}
		},
		flags: {},
		name: "Solar Power",
		rating: 2,
		num: 94,
	},
	solidrock: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0) {
				this.debug('Solid Rock neutralize');
				return this.chainModify(0.75);
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Reduces damage from super-effective attacks by 25%.",
		origin: 'Unchanged',
		name: "Solid Rock",
		rating: 3,
		num: 116,
	},
	soulheart: {
		onAnyFaintPriority: 1,
		onAnyFaint() {
			this.boost({ spa: 1 }, this.effectState.target);
		},
		flags: {},
		name: "Soul-Heart",
		rating: 3.5,
		num: 220,
	},
	soundproof: {
		onTryHit(target, source, move) {
			if (target !== source && move.flags['sound']) {
				this.add('-immune', target, '[from] ability: Soundproof');
				return null;
			}
		},
		onAllyTryHitSide(target, source, move) {
			if (move.flags['sound']) {
				this.add('-immune', this.effectState.target, '[from] ability: Soundproof');
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Gives immunity to sound-based moves.",
		origin: 'Unchanged',
		name: "Soundproof",
		rating: 2,
		num: 43,
	},
	speedboost: {
		onResidualOrder: 28,
		onResidualSubOrder: 2,
		onResidual(pokemon) {
			if (pokemon.activeTurns) {
				this.boost({ spe: 1 });
			}
		},
		flags: {},
		name: "Speed Boost",
		rating: 4.5,
		num: 3,
	},
	spicyspray: {
		isNonstandard: "Future",
		onDamagingHit(damage, target, source, move) {
			if (!source.trySetStatus('brn', target) && !source.status && source.hasType('Fire')) {
				this.add('-immune', source);
			}
		},
		flags: {},
		name: "Spicy Spray",
		rating: 3,
		num: 318,
	},
	stakeout: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender) {
			if (!defender.activeTurns) {
				this.debug('Stakeout boost');
				return this.chainModify(2);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender) {
			if (!defender.activeTurns) {
				this.debug('Stakeout boost');
				return this.chainModify(2);
			}
		},
		flags: {},
		shortDesc: "Deals double damage to Pokémon switching in.",
		origin: 'Unchanged',
		name: "Stakeout",
		rating: 4.5,
		num: 198,
	},
	stall: {
		onFractionalPriority: -0.1,
		flags: {},
		shortDesc: "This Pokémon moves after all other Pokémon do.",
		origin: 'Unchanged',
		name: "Stall",
		rating: -1,
		num: 100,
	},
	stalwart: {
		onModifyMovePriority: 1,
		onModifyMove(move) {
			// most of the implementation is in Battle#getTarget
			move.tracksTarget = move.target !== 'scripted';
		},
		flags: {},
		shortDesc: "Ignores redirection. If foe attempts to redirect, both original target and redirector are hit.",
		origin: 'Buffed',
		name: "Stalwart",
		rating: 0,
		num: 242,
	},
	stamina: {
		onDamagingHit(damage, target, source, effect) {
			this.boost({ def: 1 });
		},
		flags: {},
		shortDesc: "Raises Defense by 1 stage when hit by an attack.",
		origin: 'Unchanged',
		name: "Stamina",
		rating: 4,
		num: 192,
	},
	stancechange: {
		onModifyMovePriority: 1,
		onModifyMove(move, attacker, defender) {
			if (attacker.species.baseSpecies !== 'Aegislash' || attacker.transformed) return;
			if (move.category === 'Status' && move.id !== 'kingsshield') return;
			const targetForme = (move.id === 'kingsshield' ? 'Aegislash' : 'Aegislash-Blade');
			if (attacker.species.name !== targetForme) attacker.formeChange(targetForme);
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		shortDesc: "Changes form depending on the moves used.",
		origin: 'Unchanged',
		name: "Stance Change",
		rating: 4,
		num: 176,
	},
	static: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(1, 2)) {
					source.trySetStatus('stun', target);
				}
			}
		},
		shortDesc: "Contact with this Pokémon has a 50% chance to Stun the attacker.",
		origin: 'Altered',
		flags: {},
		name: "Static",
		rating: 2,
		num: 9,
	},
	steadfast: {
		onTryBoost(boost, target, source, effect) {
			// Reworked: the user's stats cannot change by any means (self- or foe-inflicted, raise or drop).
			// Unlike Clear Body / Full Metal Body, there is no self-boost exemption.
			let blockedDrop = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) blockedDrop = true;
				delete boost[i];
			}
			if (blockedDrop && source && source !== target && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
				this.add('-fail', target, 'unboost', '[from] ability: Steadfast', `[of] ${target}`);
			}
		},
		shortDesc: "This Pokémon's stats cannot be changed by any means.",
		origin: 'Reworked',
		flags: {},
		name: "Steadfast",
		rating: 1,
		num: 80,
	},
	steamengine: {
		onDamagingHit(damage, target, source, move) {
			if (['Water', 'Fire'].includes(move.type)) {
				this.boost({ spe: 3 });
			}
		},
		flags: {},
		shortDesc: "Raises Speed by +3 stages when hit by a Fire- or Water-type move.",
		origin: 'Nerfed',
		name: "Steam Engine",
		rating: 2,
		num: 243,
	},
	steelworker: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Steel') {
				this.debug('Steelworker boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Steel') {
				this.debug('Steelworker boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "Powers up this Pokémon's Steel-type moves.",
		origin: 'Unchanged',
		name: "Steelworker",
		rating: 3.5,
		num: 200,
	},
	steelyspirit: {
		onAllyBasePowerPriority: 22,
		onAllyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Steel') {
				this.debug('Steely Spirit boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		name: "Steely Spirit",
		rating: 3.5,
		num: 252,
	},
	stench: {
		onModifyMovePriority: -1,
		onModifyMove(move) {
			if (move.category !== "Status") {
				this.debug('Adding Stench flinch');
				if (!move.secondaries) move.secondaries = [];
				for (const secondary of move.secondaries) {
					if (secondary.volatileStatus === 'flinch') return;
				}
				move.secondaries.push({
					chance: 25,
					volatileStatus: 'flinch',
				});
			}
		},
		shortDesc: "This Pokémon's attacks have a 25% chance to make the target flinch.",
		origin: 'Buffed',
		flags: {},
		name: "Stench",
		rating: 0.5,
		num: 1,
	},
	stickyhold: {
		onTakeItem(item, pokemon, source) {
			if (!this.activeMove) throw new Error("Battle.activeMove is null");
			if (!pokemon.hp || pokemon.item === 'stickybarb') return;
			if ((source && source !== pokemon) || this.activeMove.id === 'knockoff') {
				this.add('-activate', pokemon, 'ability: Sticky Hold');
				// Buffed: a foe that tries to remove the item has its Speed lowered by 2 stages.
				if (source && source !== pokemon) {
					this.boost({ spe: -2 }, source, pokemon, null, true);
				}
				return false;
			}
		},
		shortDesc: "Item can't be removed; a foe that tries lowers its own Speed by 2 stages.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Sticky Hold",
		rating: 1.5,
		num: 60,
	},
	stilledtime: {
		// All moves on the field have their priority set to 0.
		onAnyModifyPriority(priority, pokemon, target, move) {
			return 0;
		},
		shortDesc: "All moves used while this Pokémon is on the field have their priority changed to 0.",
		origin: 'Custom',
		flags: {},
		name: "Stilled Time",
		rating: 3,
		num: 10015,
	},
	stormdrain: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Water') {
				if (!this.boost({ spa: 1 })) {
					this.add('-immune', target, '[from] ability: Storm Drain');
				}
				return null;
			}
		},
		onAnyRedirectTarget(target, source, source2, move) {
			if (move.type !== 'Water' || move.flags['pledgecombo']) return;
			const redirectTarget = ['randomNormal', 'adjacentFoe'].includes(move.target) ? 'normal' : move.target;
			if (this.validTarget(this.effectState.target, source, redirectTarget)) {
				if (move.smartTarget) move.smartTarget = false;
				if (this.effectState.target !== target) {
					this.add('-activate', this.effectState.target, 'ability: Storm Drain');
				}
				return this.effectState.target;
			}
		},
		flags: { breakable: 1 },
		name: "Storm Drain",
		rating: 3,
		num: 114,
	},
	strongjaw: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['bite']) {
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "Boosts the power of biting moves by 50%.",
		origin: 'Unchanged',
		name: "Strong Jaw",
		rating: 3.5,
		num: 173,
	},
	sturdy: {
		onTryHit(pokemon, target, move) {
			if (move.ohko) {
				this.add('-immune', pokemon, '[from] ability: Sturdy');
				return null;
			}
		},
		onDamagePriority: -30,
		onDamage(damage, target, source, effect) {
			if (target.hp === target.maxhp && damage >= target.hp && effect && effect.effectType === 'Move') {
				this.add('-ability', target, 'Sturdy');
				return target.hp - 1;
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Cannot be knocked out with one hit from full HP; blocks OHKO moves.",
		origin: 'Unchanged',
		name: "Sturdy",
		rating: 3,
		num: 5,
	},
	suctioncups: {
		onDragOutPriority: 1,
		onDragOut(pokemon) {
			this.add('-activate', pokemon, 'ability: Suction Cups');
			return null;
		},
		flags: { breakable: 1 },
		shortDesc: "Negates all moves that force this Pokémon to switch out.",
		origin: 'Unchanged',
		name: "Suction Cups",
		rating: 1,
		num: 21,
	},
	superluck: {
		onModifyCritRatio(critRatio) {
			return critRatio + 1;
		},
		flags: {},
		shortDesc: "Heightens the critical-hit ratios of this Pokémon's moves.",
		origin: 'Unchanged',
		name: "Super Luck",
		rating: 1.5,
		num: 105,
	},
	supersweetsyrup: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Supersweet Syrup');
			for (const target of pokemon.adjacentFoes()) {
				if (target.volatiles['substitute']) {
					this.add('-immune', target);
				} else {
					this.boost({ evasion: -1 }, target, pokemon, null, true);
				}
			}
		},
		shortDesc: "On switch-in, lowers adjacent foes' evasiveness by 1 stage (every time).",
		origin: 'Buffed',
		flags: {},
		name: "Supersweet Syrup",
		rating: 1.5,
		num: 306,
	},
	supremeoverlord: {
		onStart(pokemon) {
			if (pokemon.side.totalFainted) {
				this.add('-activate', pokemon, 'ability: Supreme Overlord');
				const fallen = Math.min(pokemon.side.totalFainted, 5);
				this.add('-start', pokemon, `fallen${fallen}`, '[silent]');
				this.effectState.fallen = fallen;
			}
		},
		onEnd(pokemon) {
			this.add('-end', pokemon, `fallen${this.effectState.fallen}`, '[silent]');
		},
		onBasePowerPriority: 21,
		onBasePower(basePower, attacker, defender, move) {
			if (this.effectState.fallen) {
				const powMod = [4096, 4506, 4915, 5325, 5734, 6144];
				this.debug(`Supreme Overlord boost: ${powMod[this.effectState.fallen]}/4096`);
				return this.chainModify([powMod[this.effectState.fallen], 4096]);
			}
		},
		flags: {},
		name: "Supreme Overlord",
		rating: 4,
		num: 293,
	},
	surgesurfer: {
		onModifySpe(spe) {
			if (this.field.isTerrain('electricterrain')) {
				return this.chainModify(2);
			}
		},
		flags: {},
		name: "Surge Surfer",
		rating: 3,
		num: 207,
	},
	swarm: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Bug' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Swarm boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Bug' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Swarm boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "Powers up Bug-type moves by x1.5 when below 1/3 max HP.",
		origin: 'Unchanged',
		name: "Swarm",
		rating: 2,
		num: 68,
	},
	sweetveil: {
		onAllySetStatus(status, target, source, effect) {
			if (status.id === 'slp') {
				this.debug('Sweet Veil interrupts sleep');
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Sweet Veil', `[of] ${effectHolder}`);
				return null;
			}
		},
		onAllyTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.debug('Sweet Veil blocking yawn');
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Sweet Veil', `[of] ${effectHolder}`);
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Sweet Veil",
		rating: 2,
		num: 175,
	},
	sweetness: {
		onSetStatus(status, target, source, effect) {
			this.debug('Sweetness interrupts status');
			const effectHolder = this.effectState.target;
			this.add('-block', target, 'ability: Sweetness', `[of] ${effectHolder}`);
			return null;
		},
		onAllySetStatus(status, target, source, effect) {
			this.debug('Sweetness interrupts ally status');
			const effectHolder = this.effectState.target;
			this.add('-block', target, 'ability: Sweetness', `[of] ${effectHolder}`);
			return null;
		},
		onAllyTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.debug('Sweetness blocking yawn');
				const effectHolder = this.effectState.target;
				this.add('-block', target, 'ability: Sweetness', `[of] ${effectHolder}`);
				return null;
			}
		},
		shortDesc: "Protects user and allies on the field from all non-volatile status conditions.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Sweetness",
		rating: 3,
		num: 10140,
	},
	constrictor: {
		onResidualOrder: 26,
		onResidual(pokemon) {
			if (!pokemon.volatiles['interlocked']) return;
			const partner = (pokemon.volatiles['interlocked'] as any).partner as Pokemon | undefined;
			if (!partner || partner.fainted) return;
			this.damage(Math.floor(partner.baseMaxhp / 6), partner, pokemon, this.effect);
		},
		shortDesc: "Pokémon Interlocked with this Pokémon take 1/6 MaxHP damage each turn.",
		origin: 'Custom',
		flags: {},
		name: "Constrictor",
		rating: 2.5,
		num: 10141,
	},
	emotionalsilencer: {
		onAnyAfterMove(source, target, move) {
			const holder = this.effectState.target;
			if (source === holder || source.isAlly(holder)) return;
			if (!move.flags['emotion']) return;
			this.boost({ atk: 2, spa: 2 }, holder, holder, this.effect);
		},
		shortDesc: "When a foe uses an emotion-based move, this Pokémon gains +2 to both offensive stats.",
		origin: 'Custom',
		flags: {},
		name: "Emotional Silencer",
		rating: 3,
		num: 10142,
	},
	skewer: {
		onModifyMove(move) {
			if (move.flags['piercing']) {
				move.flags['bypasssub'] = 1;
			}
		},
		onBasePowerPriority: 22,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['piercing']) return this.chainModify(1.5);
		},
		shortDesc: "Piercing moves have +50% power and bypass Substitute.",
		origin: 'Custom',
		flags: {},
		name: "Skewer",
		rating: 3,
		num: 10144,
	},
	flashfreeze: {
		onStart() {
			this.effectState.triggered = false;
		},
		onAfterDamage(damage, target, source, move) {
			if (!this.effectState.triggered && target.hp && target.hp <= target.maxhp / 4) {
				this.effectState.triggered = true;
				this.add('-activate', target, 'ability: Flash Freeze');
				if (this.field.setWeather('snowscape', target, {name: 'Flash Freeze'})) {
					this.field.weatherState.duration = 1;
				}
				for (const pokemon of this.getAllActive()) {
					if (pokemon !== target && !pokemon.fainted) {
						pokemon.trySetStatus('frb', target, null);
					}
				}
			}
		},
		onResidualOrder: 28,
		onResidual(pokemon) {
			if (!this.effectState.triggered && pokemon.hp && pokemon.hp <= pokemon.maxhp / 4) {
				this.effectState.triggered = true;
				this.add('-activate', pokemon, 'ability: Flash Freeze');
				if (this.field.setWeather('snowscape', pokemon, {name: 'Flash Freeze'})) {
					this.field.weatherState.duration = 1;
				}
				for (const poke of this.getAllActive()) {
					if (poke !== pokemon && !poke.fainted) {
						poke.trySetStatus('frb', pokemon, null);
					}
				}
			}
		},
		shortDesc: "At ≤25% HP: Frostbite all other active Pokémon and set 1-turn Snowstorm.",
		origin: 'Custom',
		flags: {},
		name: "Flash Freeze",
		rating: 3.5,
		num: 10145,
	},
	swiftswim: {
		onModifySpe(spe, pokemon) {
			if (['raindance', 'primordialsea'].includes(pokemon.effectiveWeather())) {
				return this.chainModify(2);
			}
		},
		flags: {},
		name: "Swift Swim",
		rating: 3,
		num: 33,
	},
	swordofruin: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Sword of Ruin');
		},
		onAnyModifyDef(def, target, source, move) {
			const abilityHolder = this.effectState.target;
			if (target.hasAbility('Sword of Ruin')) return;
			if (!move.ruinedDef?.hasAbility('Sword of Ruin')) move.ruinedDef = abilityHolder;
			if (move.ruinedDef !== abilityHolder) return;
			this.debug('Sword of Ruin Def drop');
			return this.chainModify(0.75);
		},
		flags: {},
		shortDesc: "Lowers the Defense of all other Pokémon by 25%.",
		origin: 'Unchanged',
		name: "Sword of Ruin",
		rating: 4.5,
		num: 285,
	},
	symbiosis: {
		onAllyAfterUseItem(item, pokemon) {
			if (pokemon.switchFlag) return;
			const source = this.effectState.target;
			const myItem = source.takeItem();
			if (!myItem) return;
			if (
				!this.singleEvent('TakeItem', myItem, source.itemState, pokemon, source, this.effect, myItem) ||
				!pokemon.setItem(myItem)
			) {
				source.item = myItem.id;
				return;
			}
			this.add('-activate', source, 'ability: Symbiosis', myItem, `[of] ${pokemon}`);
		},
		flags: {},
		name: "Symbiosis",
		rating: 0,
		num: 180,
	},
	synchronize: {
		onStart(pokemon) {
			if (!pokemon.status || pokemon.status === 'slp' || pokemon.status === 'frz' || pokemon.status === 'frb') return;
			const status = this.dex.conditions.get(pokemon.status);
			for (const foe of pokemon.foes()) {
				this.add('-activate', pokemon, 'ability: Synchronize');
				foe.trySetStatus(status, pokemon, { status: pokemon.status, id: 'synchronize' } as Effect);
			}
		},
		onAfterSetStatus(status, target, source, effect) {
			if (!source || source === target) return;
			if (effect && effect.id === 'toxicspikes') return;
			if (status.id === 'slp' || status.id === 'frz' || status.id === 'frb') return;
			this.add('-activate', target, 'ability: Synchronize');
			// Hack to make status-prevention abilities think Synchronize is a status move
			// and show messages when activating against it.
			source.trySetStatus(status, target, { status: status.id, id: 'synchronize' } as Effect);
		},
		shortDesc: "Passes non-sleep status to the foe upon infliction; re-applies on switch-in while statused.",
		origin: 'Buffed',
		flags: {},
		name: "Synchronize",
		rating: 2.5,
		num: 28,
	},
	tabletsofruin: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Tablets of Ruin');
		},
		onAnyModifyAtk(atk, source, target, move) {
			const abilityHolder = this.effectState.target;
			if (source.hasAbility('Tablets of Ruin')) return;
			if (!move.ruinedAtk) move.ruinedAtk = abilityHolder;
			if (move.ruinedAtk !== abilityHolder) return;
			this.debug('Tablets of Ruin Atk drop');
			return this.chainModify(0.75);
		},
		flags: {},
		shortDesc: "Lowers the Attack of all other Pokémon by 25%.",
		origin: 'Unchanged',
		name: "Tablets of Ruin",
		rating: 4.5,
		num: 284,
	},
	tangledfeet: {
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy, target) {
			if (typeof accuracy !== 'number') return;
			if (target?.volatiles['confusion']) {
				this.debug('Tangled Feet - decreasing accuracy');
				return this.chainModify(0.5);
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Raises evasion by 2 stages while this Pokémon is confused.",
		origin: 'Unchanged',
		name: "Tangled Feet",
		rating: 1,
		num: 77,
	},
	tanglinghair: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				if (!source.volatiles['interlocked'] && !target.volatiles['interlocked']) {
					this.add('-ability', target, 'Tangling Hair');
					source.addVolatile('interlocked', target);
					target.addVolatile('interlocked', source);
					if (source.volatiles['interlocked']) source.volatiles['interlocked'].statDropped = true;
					this.boost({ atk: -1, spe: -1 }, source, target, null, true);
				}
			}
		},
		shortDesc: "On contact: lowers attacker's Speed and Attack by 1 stage. Also initiates Interlocked.",
		origin: 'Buffed',
		flags: {},
		name: "Tangling Hair",
		rating: 2,
		num: 233,
	},
	tanglingvines: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target, true)) {
				if (!source.volatiles['interlocked'] && !target.volatiles['interlocked']) {
					this.add('-ability', target, 'Tangling Vines');
					source.addVolatile('interlocked', target);
					target.addVolatile('interlocked', source);
					if (source.volatiles['interlocked']) source.volatiles['interlocked'].statDropped = true;
					this.boost({ atk: -1, spe: -1 }, source, target, null, true);
				}
			}
		},
		shortDesc: "On contact: lowers attacker's Speed and Attack by 1 stage. Also initiates Interlocked.",
		origin: 'Custom',
		flags: {},
		name: "Tangling Vines",
		rating: 2,
		num: 10007,
	},
	technician: {
		onBasePowerPriority: 30,
		onBasePower(basePower, attacker, defender, move) {
			const basePowerAfterMultiplier = this.modify(basePower, this.event.modifier);
			this.debug(`Base Power: ${basePowerAfterMultiplier}`);
			if (basePowerAfterMultiplier <= 60) {
				this.debug('Technician boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "Powers up this Pokémon's moves of 60 base power or less by 50%.",
		origin: 'Unchanged',
		name: "Technician",
		rating: 3.5,
		num: 101,
	},
	telepathy: {
		onStart(pokemon) {
			pokemon.m.telepathyUsed = false;
		},
		onTryHit(target, source, move) {
			if (target !== source && target.isAlly(source) && move.category !== 'Status') {
				this.add('-activate', target, 'ability: Telepathy');
				return null;
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Once per battle, Pokémon can act after already knowing what the opponent has chosen to do. Also immune to ally's damaging moves in doubles.",
		origin: 'Buffed',
		name: "Telepathy",
		rating: 3,
		num: 140,
	},
	teraformzero: {
		onAfterTerastallization(pokemon) {
			if (pokemon.baseSpecies.name !== 'Terapagos-Stellar') return;
			if (this.field.weather || this.field.terrain) {
				this.add('-ability', pokemon, 'Teraform Zero');
				this.field.clearWeather();
				this.field.clearTerrain();
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1 },
		name: "Teraform Zero",
		rating: 3,
		num: 309,
	},
	terashell: {
		// effectiveness implemented in sim/pokemon.ts:Pokemon#runEffectiveness
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, breakable: 1 },
		name: "Tera Shell",
		rating: 3.5,
		num: 308,
	},
	terashift: {
		onSwitchInPriority: 2,
		onSwitchIn(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Terapagos') return;
			if (pokemon.species.forme !== 'Terastal') {
				this.add('-activate', pokemon, 'ability: Tera Shift');
				pokemon.formeChange('Terapagos-Terastal', this.effect, true);
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1, notransform: 1 },
		name: "Tera Shift",
		rating: 3,
		num: 307,
	},
	teravolt: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Teravolt');
		},
		onModifyMove(move) {
			move.ignoreAbility = true;
		},
		flags: {},
		name: "Teravolt",
		rating: 3,
		num: 164,
	},
	thermalexchange: {
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Fire') {
				this.boost({ atk: 1 });
			}
		},
		onUpdate(pokemon) {
			if (pokemon.status === 'brn') {
				this.add('-activate', pokemon, 'ability: Thermal Exchange');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'brn') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Thermal Exchange');
			}
			return false;
		},
		flags: { breakable: 1 },
		name: "Thermal Exchange",
		rating: 2.5,
		num: 270,
	},
	thickfat: {
		onSourceModifyAtkPriority: 6,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire' || move.type === 'Electric') {
				this.debug('Thick Fat weaken');
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Ice' || move.type === 'Fire' || move.type === 'Electric') {
				this.debug('Thick Fat weaken');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Halves the damage taken from Fire-, Ice-, and Electric-type moves.",
		origin: 'Buffed',
		flags: { breakable: 1 },
		name: "Thick Fat",
		rating: 3.5,
		num: 47,
	},
	tintedlens: {
		onModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod < 0) {
				this.debug('Tinted Lens boost');
				return this.chainModify(2);
			}
		},
		flags: {},
		shortDesc: "Doubles the power of not-very-effective moves.",
		origin: 'Unchanged',
		name: "Tinted Lens",
		rating: 4,
		num: 110,
	},
	torrent: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Water' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Torrent boost');
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Water' && attacker.hp <= attacker.maxhp / 3) {
				this.debug('Torrent boost');
				return this.chainModify(1.5);
			}
		},
		flags: {},
		shortDesc: "Powers up Water-type moves by x1.5 when below 1/3 max HP.",
		origin: 'Unchanged',
		name: "Torrent",
		rating: 2,
		num: 67,
	},
	toughclaws: {
		onBasePowerPriority: 21,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['contact']) {
				return this.chainModify([5325, 4096]);
			}
		},
		flags: {},
		shortDesc: "Boosts the power of contact moves by 30%.",
		origin: 'Unchanged',
		name: "Tough Claws",
		rating: 3.5,
		num: 181,
	},
	toxicboost: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.category !== 'Physical') return;
			// Escalating: +50% physical Atk when badly poisoned, +30% when regular poisoned.
			if (attacker.status === 'tox') return this.chainModify(1.5);
			if (attacker.status === 'psn') return this.chainModify(1.3);
		},
		shortDesc: "Ignores poison's SpD drop & chip; physical Atk x1.3 when poisoned, x1.5 when badly poisoned.",
		origin: 'Buffed',
		flags: {},
		name: "Toxic Boost",
		rating: 3,
		num: 137,
	},
	toxicchain: {
		onSourceDamagingHit(damage, target, source, move) {
			// Despite not being a secondary, Shield Dust / Covert Cloak block Toxic Chain's effect
			if (target.hasAbility('shielddust') || target.hasItem('covertcloak')) return;

			if (this.randomChance(3, 10)) {
				target.trySetStatus('tox', source);
			}
		},
		flags: {},
		name: "Toxic Chain",
		rating: 4.5,
		num: 305,
	},
	toxicdebris: {
		onDamagingHit(damage, target, source, move) {
			const side = source.isAlly(target) ? source.side.foe : source.side;
			const toxicSpikes = side.sideConditions['toxicspikes'];
			if (move.category === 'Physical' && (!toxicSpikes || toxicSpikes.layers < 2)) {
				this.add('-activate', target, 'ability: Toxic Debris');
				side.addSideCondition('toxicspikes', target);
			}
		},
		flags: {},
		shortDesc: "Sets a layer of Toxic Spikes when hit by a physical move.",
		origin: 'Unchanged',
		name: "Toxic Debris",
		rating: 3.5,
		num: 295,
	},
	trace: {
		onStart(pokemon) {
			this.effectState.seek = true;
			// n.b. only affects Hackmons
			// interaction with No Ability is complicated: https://www.smogon.com/forums/threads/pokemon-sun-moon-battle-mechanics-research.3586701/page-76#post-7790209
			if (pokemon.adjacentFoes().some(foeActive => foeActive.ability === 'noability')) {
				this.effectState.seek = false;
			}
			// interaction with Ability Shield is similar to No Ability
			if (pokemon.hasItem('Ability Shield')) {
				this.add('-block', pokemon, 'item: Ability Shield');
				this.effectState.seek = false;
			}
			if (this.effectState.seek) {
				this.singleEvent('Update', this.effect, this.effectState, pokemon);
			}
		},
		onUpdate(pokemon) {
			if (!this.effectState.seek) return;

			const possibleTargets = pokemon.adjacentFoes().filter(
				target => !target.getAbility().flags['notrace'] && target.ability !== 'noability'
			);
			if (!possibleTargets.length) return;

			const target = this.sample(possibleTargets);
			const ability = target.getAbility();
			pokemon.setAbility(ability, target);
		},
		shortDesc: "On switch-in, this Pokémon copies a foe's Basic Ability.",
		origin: 'Altered',
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1 },
		name: "Trace",
		rating: 2.5,
		num: 36,
	},
	trainedassassin: {
		// Marking is driven by the Testing Standard format's onBattleStart roster scan
		// (config/formats.ts), so it fires at the start of round 1 even if this Pokémon is
		// benched. The ability itself carries no event handlers.
		shortDesc: "At the start of the first turn, a random opponent will be Marked.",
		origin: 'Custom',
		flags: {},
		name: "Trained Assassin",
		rating: 2.5,
		num: 10018,
	},
	transistor: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Transistor boost');
				return this.chainModify([5325, 4096]);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Electric') {
				this.debug('Transistor boost');
				return this.chainModify([5325, 4096]);
			}
		},
		flags: {},
		name: "Transistor",
		rating: 3.5,
		num: 262,
	},
	triage: {
		onModifyPriority(priority, pokemon, target, move) {
			if (move?.flags['heal']) return priority + 3;
		},
		flags: {},
		shortDesc: "Gives +3 priority to healing moves.",
		origin: 'Unchanged',
		name: "Triage",
		rating: 3.5,
		num: 205,
	},
	truant: {
		onStart(pokemon) {
			pokemon.removeVolatile('truant');
			if (pokemon.activeTurns && (pokemon.moveThisTurnResult !== undefined || !this.queue.willMove(pokemon))) {
				pokemon.addVolatile('truant');
			}
		},
		onBeforeMovePriority: 9,
		onBeforeMove(pokemon) {
			if (pokemon.removeVolatile('truant')) {
				this.add('cant', pokemon, 'ability: Truant');
				return false;
			}
			pokemon.addVolatile('truant');
		},
		condition: {},
		flags: {},
		shortDesc: "This Pokémon cannot attack on consecutive turns.",
		origin: 'Unchanged',
		name: "Truant",
		rating: -1,
		num: 54,
	},
	turboblaze: {
		onStart(pokemon) {
			this.add('-ability', pokemon, 'Turboblaze');
		},
		onModifyMove(move) {
			move.ignoreAbility = true;
		},
		flags: {},
		name: "Turboblaze",
		rating: 3,
		num: 163,
	},
	unaware: {
		onAnyModifyBoost(boosts, pokemon) {
			const unawareUser = this.effectState.target;
			if (unawareUser === pokemon) return;
			if (unawareUser === this.activePokemon && pokemon === this.activeTarget) {
				boosts['def'] = 0;
				boosts['spd'] = 0;
				boosts['evasion'] = 0;
			}
			if (pokemon === this.activePokemon && unawareUser === this.activeTarget) {
				boosts['atk'] = 0;
				boosts['def'] = 0;
				boosts['spa'] = 0;
				boosts['accuracy'] = 0;
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Ignores other Pokémon's stat changes when dealing or taking damage.",
		origin: 'Unchanged',
		name: "Unaware",
		rating: 4,
		num: 109,
	},
	unburden: {
		onAfterUseItem(item, pokemon) {
			if (pokemon !== this.effectState.target) return;
			pokemon.addVolatile('unburden');
		},
		onTakeItem(item, pokemon) {
			pokemon.addVolatile('unburden');
		},
		onEnd(pokemon) {
			pokemon.removeVolatile('unburden');
		},
		condition: {
			onModifySpe(spe, pokemon) {
				if (!pokemon.item && !pokemon.ignoringAbility()) {
					return this.chainModify(2);
				}
			},
		},
		flags: {},
		shortDesc: "Doubles this Pokémon's Speed if its held item is used or lost.",
		origin: 'Unchanged',
		name: "Unburden",
		rating: 3.5,
		num: 84,
	},
	unnerve: {
		onSwitchInPriority: 1,
		onStart(pokemon) {
			if (this.effectState.unnerved) return;
			this.add('-ability', pokemon, 'Unnerve');
			this.effectState.unnerved = true;
		},
		onEnd() {
			this.effectState.unnerved = false;
		},
		onFoeUseItem() {
			// Buffed: blocks all consumable items (berries and others), not just berries.
			return !this.effectState.unnerved;
		},
		shortDesc: "While this Pokémon is active, foes cannot use any consumable held items.",
		origin: 'Buffed',
		flags: {},
		name: "Unnerve",
		rating: 1,
		num: 127,
	},
	unseenfist: {
		onModifyMove(move) {
			if (move.flags['contact']) delete move.flags['protect'];
		},
		flags: {},
		name: "Unseen Fist",
		rating: 2,
		num: 260,
	},
	vesselofruin: {
		onStart(pokemon) {
			if (this.suppressingAbility(pokemon)) return;
			this.add('-ability', pokemon, 'Vessel of Ruin');
		},
		onAnyModifySpA(spa, source, target, move) {
			const abilityHolder = this.effectState.target;
			if (source.hasAbility('Vessel of Ruin')) return;
			if (!move.ruinedSpA) move.ruinedSpA = abilityHolder;
			if (move.ruinedSpA !== abilityHolder) return;
			this.debug('Vessel of Ruin SpA drop');
			return this.chainModify(0.75);
		},
		flags: {},
		shortDesc: "Lowers the Special Attack of all other Pokémon by 25%.",
		origin: 'Unchanged',
		name: "Vessel of Ruin",
		rating: 4.5,
		num: 284,
	},
	vengefulspirit: {
		// Inflicts a random status condition on the attacker when KO'd.
		onDamagingHit(damage, target, source, move) {
			if (!target.hp) {
				const statuses = ['brn', 'psn', 'stun', 'frb', 'slp'];
				const status = this.sample(statuses);
				source.trySetStatus(status as any, target);
			}
		},
		shortDesc: "Inflicts a random status condition on the attacker when KO'd.",
		origin: 'Custom',
		flags: {},
		name: "Vengeful Spirit",
		rating: 2,
		num: 10011,
	},
	victorystar: {
		onAnyModifyAccuracyPriority: -1,
		onAnyModifyAccuracy(accuracy, target, source) {
			if (source.isAlly(this.effectState.target) && typeof accuracy === 'number') {
				return this.chainModify([4506, 4096]);
			}
		},
		flags: {},
		name: "Victory Star",
		rating: 2,
		num: 162,
	},
	vitalspirit: {
		onUpdate(pokemon) {
			if (pokemon.status === 'slp') {
				this.add('-activate', pokemon, 'ability: Vital Spirit');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'slp') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Vital Spirit');
			}
			return false;
		},
		onTryAddVolatile(status, target) {
			if (status.id === 'yawn') {
				this.add('-immune', target, '[from] ability: Vital Spirit');
				return null;
			}
		},
		flags: { breakable: 1 },
		shortDesc: "Prevents this Pokémon from falling asleep.",
		origin: 'Unchanged',
		name: "Vital Spirit",
		rating: 1.5,
		num: 72,
	},
	voltabsorb: {
		onTryHit(target, source, move) {
			// Special/Status Electric moves are absorbed and heal 1/3 max HP.
			if (target !== source && move.type === 'Electric' && move.category !== 'Physical') {
				if (!this.heal(target.baseMaxhp / 3)) {
					this.add('-immune', target, '[from] ability: Volt Absorb');
				}
				return null;
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			// Physical Electric moves still hit, but for 50% damage.
			if (move.type === 'Electric' && move.category === 'Physical') {
				this.debug('Volt Absorb damage reduction');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Special/Status Electric moves heal 1/3 max HP; Physical Electric moves deal 50% damage.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Volt Absorb",
		rating: 3.5,
		num: 10,
	},
	wanderingspirit: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) this.skillSwap(source, target);
		},
		flags: {},
		name: "Wandering Spirit",
		rating: 2.5,
		num: 254,
	},
	waterabsorb: {
		onTryHit(target, source, move) {
			// Special/Status Water moves are absorbed and heal 1/3 max HP.
			if (target !== source && move.type === 'Water' && move.category !== 'Physical') {
				if (!this.heal(target.baseMaxhp / 3)) {
					this.add('-immune', target, '[from] ability: Water Absorb');
				}
				return null;
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			// Physical Water moves still hit, but for 50% damage.
			if (move.type === 'Water' && move.category === 'Physical') {
				this.debug('Water Absorb damage reduction');
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Special/Status Water moves heal 1/3 max HP; Physical Water moves deal 50% damage.",
		origin: 'Altered',
		flags: { breakable: 1 },
		name: "Water Absorb",
		rating: 3.5,
		num: 11,
	},
	waterbubble: {
		onSourceModifyAtkPriority: 5,
		onSourceModifyAtk(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				return this.chainModify(0.5);
			}
		},
		onSourceModifySpAPriority: 5,
		onSourceModifySpA(atk, attacker, defender, move) {
			if (move.type === 'Fire') {
				return this.chainModify(0.5);
			}
		},
		onUpdate(pokemon) {
			if (pokemon.status === 'brn') {
				this.add('-activate', pokemon, 'ability: Water Bubble');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'brn') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Water Bubble');
			}
			return false;
		},
		shortDesc: "Halves damage taken from Fire-type moves and prevents burns.",
		origin: 'Nerfed',
		flags: { breakable: 1 },
		name: "Water Bubble",
		rating: 4.5,
		num: 199,
	},
	watercompaction: {
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Water') {
				this.boost({ def: 2 });
			}
		},
		flags: {},
		name: "Water Compaction",
		rating: 1.5,
		num: 195,
	},
	waterveil: {
		onUpdate(pokemon) {
			if (pokemon.status === 'brn') {
				this.add('-activate', pokemon, 'ability: Water Veil');
				pokemon.cureStatus();
			}
		},
		onSetStatus(status, target, source, effect) {
			if (status.id !== 'brn') return;
			if ((effect as Move)?.status) {
				this.add('-immune', target, '[from] ability: Water Veil');
			}
			return false;
		},
		flags: { breakable: 1 },
		name: "Water Veil",
		rating: 2,
		num: 41,
	},
	weakarmor: {
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Physical') {
				this.boost({ def: -1, spe: 2 }, target, target);
			}
		},
		flags: {},
		name: "Weak Armor",
		rating: 1,
		num: 133,
	},
	wellbakedbody: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Fire') {
				if (!this.boost({ def: 2 })) {
					this.add('-immune', target, '[from] ability: Well-Baked Body');
				}
				return null;
			}
		},
		flags: { breakable: 1 },
		name: "Well-Baked Body",
		rating: 3.5,
		num: 273,
	},
	whitesmoke: {
		onTryBoost(boost, target, source, effect) {
			let blockedDrop = false;
			let i: BoostID;
			for (i in boost) {
				if (boost[i]! < 0) blockedDrop = true;
				delete boost[i];
			}
			if (blockedDrop && source && source !== target && !(effect as ActiveMove).secondaries && effect.id !== 'octolock') {
				this.add('-fail', target, 'unboost', '[from] ability: White Smoke', `[of] ${target}`);
			}
		},
		shortDesc: "This Pokémon's stats cannot be changed by any means.",
		origin: 'Reworked',
		flags: {},
		name: "White Smoke",
		rating: 2,
		num: 73,
	},
	specialist: {
		onModifySTAB(stab, source, target, move) {
			if (move.type === '???') return; // typeless: no modification
			if (stab <= 1) return 0.75; // non-STAB: 0.75x penalty
			// STAB case: return undefined so the format handler applies type-order + 0.75
		},
		shortDesc: "Increases STAB by an additional x0.75, but weakens non-STAB moves by a x0.75 multiplier.",
		origin: 'Custom',
		flags: {},
		name: "Specialist",
		rating: 3.5,
		num: 10003,
	},
	wildvines: {
		onBasePowerPriority: 19,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['vine']) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts the power of Vine moves by 50%.",
		origin: 'Custom',
		flags: {},
		name: "Wild Vines",
		rating: 3.5,
		num: 10114,
	},
	wimpout: {
		onEmergencyExit(target) {
			if (!this.canSwitch(target.side) || target.forceSwitchFlag || target.switchFlag) return;
			for (const side of this.sides) {
				for (const active of side.active) {
					active.switchFlag = false;
				}
			}
			target.switchFlag = true;
			this.add('-activate', target, 'ability: Wimp Out');
		},
		flags: {},
		name: "Wimp Out",
		rating: 1,
		num: 193,
	},
	windpower: {
		onDamagingHitOrder: 1,
		onDamagingHit(damage, target, source, move) {
			if (move.flags['wind']) {
				target.addVolatile('charge');
			}
		},
		onSideConditionStart(side, source, sideCondition) {
			const pokemon = this.effectState.target;
			if (sideCondition.id === 'tailwind') {
				pokemon.addVolatile('charge');
			}
		},
		flags: {},
		name: "Wind Power",
		rating: 1,
		num: 277,
	},
	windrider: {
		onStart(pokemon) {
			if (pokemon.side.sideConditions['tailwind']) {
				this.boost({ atk: 1, spa: 1 }, pokemon, pokemon);
			}
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (move.flags['wind']) {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.flags['wind']) {
				this.boost({ atk: 1, spa: 1 }, target, target);
			}
		},
		onSideConditionStart(side, source, sideCondition) {
			const pokemon = this.effectState.target;
			if (sideCondition.id === 'tailwind') {
				this.boost({ atk: 1, spa: 1 }, pokemon, pokemon);
			}
		},
		flags: { breakable: 1 },
		name: "Wind Rider",
		rating: 3.5,
		// We do not want Brambleghast to get Infiltrator in Randbats
		num: 274,
		origin: 'Buffed',
		shortDesc: "Halves wind move damage; +1 Atk/SpA on wind hit or Tailwind.",
	},
	wonderguard: {
		onTryHit(target, source, move) {
			if (target === source || move.category === 'Status' || move.id === 'struggle') return;
			if (move.id === 'skydrop' && !source.volatiles['skydrop']) return;
			this.debug('Wonder Guard immunity: ' + move.id);
			if (target.runEffectiveness(move) <= 0 || !target.runImmunity(move)) {
				if (move.smartTarget) {
					move.smartTarget = false;
				} else {
					this.add('-immune', target, '[from] ability: Wonder Guard');
				}
				return null;
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, failskillswap: 1, breakable: 1 },
		name: "Wonder Guard",
		rating: 5,
		num: 25,
	},
	wonderskin: {
		onModifyAccuracyPriority: 10,
		onModifyAccuracy(accuracy, target, source, move) {
			if (move.category === 'Status' && typeof accuracy === 'number') {
				this.debug('Wonder Skin - setting accuracy to 50');
				return 50;
			}
		},
		flags: { breakable: 1 },
		name: "Wonder Skin",
		rating: 2,
		num: 147,
	},
	zenmode: {
		onResidualOrder: 29,
		onResidual(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Darmanitan' || pokemon.transformed) {
				return;
			}
			if (pokemon.hp <= pokemon.maxhp / 2 && !['Zen', 'Galar-Zen'].includes(pokemon.species.forme)) {
				pokemon.addVolatile('zenmode');
			} else if (pokemon.hp > pokemon.maxhp / 2 && ['Zen', 'Galar-Zen'].includes(pokemon.species.forme)) {
				pokemon.addVolatile('zenmode'); // in case of base Darmanitan-Zen
				pokemon.removeVolatile('zenmode');
			}
		},
		onEnd(pokemon) {
			if (!pokemon.volatiles['zenmode'] || !pokemon.hp) return;
			pokemon.transformed = false;
			delete pokemon.volatiles['zenmode'];
			if (pokemon.species.baseSpecies === 'Darmanitan' && pokemon.species.battleOnly) {
				pokemon.formeChange(pokemon.species.battleOnly as string, this.effect, false, '0', '[silent]');
			}
		},
		condition: {
			onStart(pokemon) {
				if (!pokemon.species.name.includes('Galar')) {
					if (pokemon.species.id !== 'darmanitanzen') pokemon.formeChange('Darmanitan-Zen');
				} else {
					if (pokemon.species.id !== 'darmanitangalarzen') pokemon.formeChange('Darmanitan-Galar-Zen');
				}
			},
			onEnd(pokemon) {
				if (['Zen', 'Galar-Zen'].includes(pokemon.species.forme)) {
					pokemon.formeChange(pokemon.species.battleOnly as string);
				}
			},
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1 },
		name: "Zen Mode",
		rating: 0,
		num: 161,
	},
	zerotohero: {
		onSwitchOut(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Palafin') return;
			if (pokemon.species.forme !== 'Hero') {
				pokemon.formeChange('Palafin-Hero', this.effect, true);
				pokemon.heroMessageDisplayed = false;
			}
		},
		onSwitchIn(pokemon) {
			if (pokemon.baseSpecies.baseSpecies !== 'Palafin') return;
			if (!pokemon.heroMessageDisplayed && pokemon.species.forme === 'Hero') {
				this.add('-activate', pokemon, 'ability: Zero to Hero');
				pokemon.heroMessageDisplayed = true;
			}
		},
		flags: { failroleplay: 1, noreceiver: 1, noentrain: 1, notrace: 1, failskillswap: 1, cantsuppress: 1, notransform: 1 },
		name: "Zero to Hero",
		rating: 5,
		num: 278,
	},

	// CAP
	mountaineer: {
		onDamage(damage, target, source, effect) {
			if (effect && effect.id === 'stealthrock') {
				return false;
			}
		},
		onTryHit(target, source, move) {
			if (move.type === 'Rock' && !target.activeTurns) {
				this.add('-immune', target, '[from] ability: Mountaineer');
				return null;
			}
		},
		isNonstandard: "CAP",
		flags: { breakable: 1 },
		name: "Mountaineer",
		rating: 3,
		num: -1,
	},
	rebound: {
		isNonstandard: "CAP",
		onTryHitPriority: 1,
		onTryHit(target, source, move) {
			if (this.effectState.target.activeTurns) return;

			if (target === source || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.actions.useMove(newMove, target, { target: source });
			return null;
		},
		onAllyTryHitSide(target, source, move) {
			if (this.effectState.target.activeTurns) return;

			if (target.isAlly(source) || move.hasBounced || !move.flags['reflectable'] || target.isSemiInvulnerable()) {
				return;
			}
			const newMove = this.dex.getActiveMove(move.id);
			newMove.hasBounced = true;
			newMove.pranksterBoosted = false;
			this.actions.useMove(newMove, this.effectState.target, { target: source });
			move.hasBounced = true; // only bounce once in free-for-all battles
			return null;
		},
		flags: { breakable: 1 },
		name: "Rebound",
		rating: 3,
		num: -2,
	},
	persistent: {
		isNonstandard: "CAP",
		// implemented in the corresponding move
		flags: {},
		name: "Persistent",
		rating: 3,
		num: -3,
	},

	// --- Rows 324–338: LowHP type abilities ---
	breakingpoint: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker, defender, move) {
			if (attacker.types.includes(move.type) && attacker.hp <= attacker.maxhp / 3) {
				return this.chainModify(1.5);
			}
		},
		onModifySpAPriority: 5,
		onModifySpA(atk, attacker, defender, move) {
			if (attacker.types.includes(move.type) && attacker.hp <= attacker.maxhp / 3) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Powers up Same-type moves by x1.5 when at or below 1/3 MaxHP.",
		origin: 'Custom',
		flags: {},
		name: "Breaking Point",
		rating: 2,
		num: 10022,
	},

	// --- Rows 339–351: Type-change abilities (Normal → X, ×1.2 boost) ---
	pyrolize: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Fire';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Fire-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Pyrolize",
		rating: 4,
		num: 10037,
	},
	hydrate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Water';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Water-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Hydrate",
		rating: 4,
		num: 10038,
	},
	verdant: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Grass';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Grass-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Verdant",
		rating: 4,
		num: 10039,
	},
	brawler: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Fighting';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Fighting-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Brawler",
		rating: 4,
		num: 10040,
	},
	toxify: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Poison';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Poison-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Toxify",
		rating: 4,
		num: 10041,
	},
	terraform: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Ground';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Ground-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Terraform",
		rating: 4,
		num: 10042,
	},
	cerebrate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Psychic';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Psychic-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Cerebrate",
		rating: 4,
		num: 10043,
	},
	infestate: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Bug';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Bug-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Infestate",
		rating: 4,
		num: 10044,
	},
	petrify: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Rock';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Rock-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Petrify",
		rating: 4,
		num: 10045,
	},
	spectralize: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Ghost';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Ghost-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Spectralize",
		rating: 4,
		num: 10046,
	},
	blacken: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Dark';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Dark-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Blacken",
		rating: 4,
		num: 10047,
	},
	reinforce: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Steel';
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Steel-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Reinforce",
		rating: 4,
		num: 10048,
	},
	astralize: {
		onModifyTypePriority: -1,
		onModifyType(move, pokemon) {
			const noModifyType = [
				'judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball',
			];
			if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) &&
				!(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
				move.type = 'Cosmic' as any;
				move.typeChangerBoosted = this.effect;
			}
		},
		onBasePowerPriority: 23,
		onBasePower(basePower, pokemon, target, move) {
			if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
		},
		shortDesc: "Turns Normal-type moves into Cosmic-type moves and increases their power by x1.2.",
		origin: 'Custom',
		flags: {},
		name: "Astralize",
		rating: 4,
		num: 10049,
	},

	// --- Row 352: Generalist ---
	generalist: {
		onModifySTAB(stab, attacker, defender, move) {
			if (stab > 1) return 1;
		},
		onBasePowerPriority: 21,
		onBasePower(basePower, pokemon, target, move) {
			if (move.category !== 'Status') return this.chainModify(1.25);
		},
		shortDesc: "Suppresses STAB; all attacking moves have a x1.25 power boost.",
		origin: 'Custom',
		flags: {},
		name: "Generalist",
		rating: 3,
		num: 10050,
	},

	// --- Rows 353–370: Type immunity abilities ---
	otherworldly: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Normal') {
				this.add('-immune', target, '[from] ability: Otherworldly');
				return null;
			}
		},
		shortDesc: "Gives immunity to Normal-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Otherworldly",
		rating: 1,
		num: 10051,
	},
	fireproof: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Fire') {
				this.add('-immune', target, '[from] ability: Fireproof');
				return null;
			}
		},
		onTrySetStatus(status, target, source, effect) {
			if (status.id === 'brn' || status.id === 'scr') {
				if (effect?.effectType === 'Move') this.add('-immune', target, '[from] ability: Fireproof');
				return false;
			}
		},
		shortDesc: "Immune to Fire-type moves and Burn.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Fireproof",
		rating: 2,
		num: 10052,
	},
	waterproof: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Water') {
				this.add('-immune', target, '[from] ability: Waterproof');
				return null;
			}
		},
		shortDesc: "Gives immunity to Water-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Waterproof",
		rating: 1,
		num: 10053,
	},
	insulated: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Electric') {
				this.add('-immune', target, '[from] ability: Insulated');
				return null;
			}
		},
		onTrySetStatus(status, target, source, effect) {
			if (status.id === 'stun' || status.id === 'par') {
				if (effect?.effectType === 'Move') this.add('-immune', target, '[from] ability: Insulated');
				return false;
			}
		},
		shortDesc: "Immune to Electric-type moves and Stun.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Insulated",
		rating: 2,
		num: 10054,
	},
	herbicide: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Grass') {
				this.add('-immune', target, '[from] ability: Herbicide');
				return null;
			}
		},
		shortDesc: "Gives immunity to Grass-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Herbicide",
		rating: 1,
		num: 10055,
	},
	frostproof: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Ice') {
				this.add('-immune', target, '[from] ability: Frostproof');
				return null;
			}
		},
		onTrySetStatus(status, target, source, effect) {
			if (status.id === 'frb' || status.id === 'frz') {
				if (effect?.effectType === 'Move') this.add('-immune', target, '[from] ability: Frostproof');
				return false;
			}
		},
		shortDesc: "Immune to Ice-type moves and Frostbite.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Frostproof",
		rating: 2,
		num: 10056,
	},
	pacifist: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Fighting') {
				this.add('-immune', target, '[from] ability: Pacifist');
				return null;
			}
		},
		shortDesc: "Gives immunity to Fighting-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Pacifist",
		rating: 1,
		num: 10057,
	},
	immunized: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Poison') {
				this.add('-immune', target, '[from] ability: Immunized');
				return null;
			}
		},
		onTrySetStatus(status, target, source, effect) {
			if (status.id === 'psn' || status.id === 'tox' || status.id === 'cor' || status.id === 'mlt') {
				if (effect?.effectType === 'Move') this.add('-immune', target, '[from] ability: Immunized');
				return false;
			}
		},
		shortDesc: "Immune to Poison-type moves and poison status.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Immunized",
		rating: 2,
		num: 10058,
	},
	antiair: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Flying') {
				this.add('-immune', target, '[from] ability: Anti-Air');
				return null;
			}
		},
		shortDesc: "Gives immunity to Flying-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Anti-Air",
		rating: 1,
		num: 10059,
	},
	mindblock: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Psychic') {
				this.add('-immune', target, '[from] ability: Mind Block');
				return null;
			}
		},
		shortDesc: "Gives immunity to Psychic-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Mind Block",
		rating: 1,
		num: 10060,
	},
	pesticide: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Bug') {
				this.add('-immune', target, '[from] ability: Pesticide');
				return null;
			}
		},
		shortDesc: "Gives immunity to Bug-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Pesticide",
		rating: 1,
		num: 10061,
	},
	unyielding: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Rock') {
				this.add('-immune', target, '[from] ability: Unyielding');
				return null;
			}
		},
		shortDesc: "Gives immunity to Rock-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Unyielding",
		rating: 1,
		num: 10062,
	},
	hallowed: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Ghost') {
				this.add('-immune', target, '[from] ability: Hallowed');
				return null;
			}
		},
		shortDesc: "Gives immunity to Ghost-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Hallowed",
		rating: 1,
		num: 10063,
	},
	scaleward: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Dragon') {
				this.add('-immune', target, '[from] ability: Scaleward');
				return null;
			}
		},
		shortDesc: "Gives immunity to Dragon-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Scaleward",
		rating: 1,
		num: 10064,
	},
	pureheart: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Dark') {
				this.add('-immune', target, '[from] ability: Pure Heart');
				return null;
			}
		},
		shortDesc: "Gives immunity to Dark-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Pure Heart",
		rating: 1,
		num: 10065,
	},
	antimagnet: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Steel') {
				this.add('-immune', target, '[from] ability: Antimagnet');
				return null;
			}
		},
		shortDesc: "Gives immunity to Steel-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Antimagnet",
		rating: 1,
		num: 10066,
	},
	disenchanted: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Fairy') {
				this.add('-immune', target, '[from] ability: Disenchanted');
				return null;
			}
		},
		shortDesc: "Gives immunity to Fairy-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Disenchanted",
		rating: 1,
		num: 10067,
	},
	anomaly: {
		onTryHit(target, source, move) {
			if (target !== source && (move.type as string) === 'Cosmic') {
				this.add('-immune', target, '[from] ability: Anomaly');
				return null;
			}
		},
		shortDesc: "Gives immunity to Cosmic-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Anomaly",
		rating: 1,
		num: 10068,
	},

	// --- Rows 371–372: Manifestation abilities ---
	offensivemanifestation: {
		onDamagingHit(damage, target, source, move) {
			if (target.hasType(move.type)) {
				this.boost({ atk: 1, spa: 1 }, target);
				this.heal(Math.floor(target.baseMaxhp / 4));
			}
		},
		shortDesc: "When hit by a same-type move, raises Atk and SpA by 1 and heals 1/4 max HP.",
		origin: 'Custom',
		flags: {},
		name: "Offensive Manifestation",
		rating: 3,
		num: 10069,
	},
	defensivemanifestation: {
		onDamagingHit(damage, target, source, move) {
			if (target.hasType(move.type)) {
				this.boost({ def: 1, spd: 1 }, target);
				this.heal(Math.floor(target.baseMaxhp / 4));
			}
		},
		shortDesc: "When hit by a same-type move, raises Def and SpD by 1 and heals 1/4 max HP.",
		origin: 'Custom',
		flags: {},
		name: "Defensive Manifestation",
		rating: 3,
		num: 10070,
	},

	// --- Row 374: Luck's Due ---
	lucksdue: {
		onAfterMove(source, target, move) {
			if (move.missed) {
				this.effectState.ready = true;
			} else if (move.category !== 'Status') {
				this.effectState.ready = false;
			}
		},
		onModifyCritRatio(critRatio, source) {
			if (this.effectState.ready) return 3;
		},
		shortDesc: "If the user's last attack missed, the next attack is a Critical Hit.",
		origin: 'Custom',
		flags: {},
		name: "Luck's Due",
		rating: 3,
		num: 10071,
	},

	// --- Row 375: Awakend Trace ---
	awakendtrace: {
		onStart(pokemon) {
			const foeSide = this.sides.find(s => s !== pokemon.side);
			const target = foeSide?.active.find(p => !!p && !p.fainted) ?? null;
			if (!target) return;
			const awakenedId = this.toID(target.species.abilities['H'] ?? '');
			if (!awakenedId) return;
			const ability = this.dex.abilities.get(awakenedId);
			if (!ability.exists || ability.id === pokemon.ability) return;
			if (pokemon.setAbility(ability.id)) {
				this.add('-ability', pokemon, ability.name, '[from] ability: Awakend Trace');
			}
		},
		shortDesc: "On switch-in, copies a foe's Awakened (H-slot) Ability.",
		origin: 'Custom',
		flags: {},
		name: "Awakend Trace",
		rating: 3,
		num: 10072,
	},

	// --- Row 376: Reactive Flyer ---
	reactiveflyer: {
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Ground') {
				this.add('-immune', target, '[from] ability: Reactive Flyer');
				return null;
			}
		},
		shortDesc: "Gives immunity to Ground-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Reactive Flyer",
		rating: 2,
		num: 10073,
	},

	// --- Row 377: Caclulated ---
	caclulated: {
		onFractionalPriority: -0.1,
		onModifyMove(move) {
			move.accuracy = true;
		},
		shortDesc: "User moves last in its priority bracket; its moves cannot miss.",
		origin: 'Custom',
		flags: {},
		name: "Caclulated",
		rating: 3,
		num: 10074,
	},

	// --- Row 378: Heavy Cannon ---
	heavycannon: {
		onBasePowerPriority: 22,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['beam'] || move.flags['heavyprojectile']) return this.chainModify(1.3);
		},
		shortDesc: "Boosts the power of beam and heavy projectile moves by x1.3.",
		origin: 'Custom',
		flags: {},
		name: "Heavy Cannon",
		rating: 3,
		num: 10075,
	},

	// --- Row 380: Pulse Generator ---
	pulsegenerator: {
		onBasePowerPriority: 22,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['pulse']) return this.chainModify(1.5);
		},
		shortDesc: "Boosts the power of pulse moves by x1.5.",
		origin: 'Custom',
		flags: {},
		name: "Pulse Generator",
		rating: 4,
		num: 10076,
	},

	// --- Row 381: Air Supiriority ---
	airsupiriority: {
		onStart(pokemon) {
			if (!pokemon.side.sideConditions['tailwind']) {
				pokemon.side.addSideCondition('tailwind', pokemon);
			}
		},
		shortDesc: "Sets Tailwind for the user's side on switch-in.",
		origin: 'Custom',
		flags: {},
		name: "Air Supiriority",
		rating: 3,
		num: 10077,
	},

	// --- Row 383: Dream Guide (mechanic lives in slp condition in conditions.ts) ---
	dreamguide: {
		shortDesc: "Holder and active allies can use moves normally even while asleep.",
		origin: 'Custom',
		flags: {},
		name: "Dream Guide",
		rating: 2,
		num: 10079,
	},

	// --- Row 384: Hypnotic ---
	hypnotic: {
		onModifyMove(move) {
			if (
				move.status === 'slp' ||
				move.secondary?.status === 'slp' ||
				move.secondaries?.some(s => s.status === 'slp')
			) {
				move.accuracy = true;
			}
		},
		shortDesc: "Moves that can inflict sleep cannot miss.",
		origin: 'Custom',
		flags: {},
		name: "Hypnotic",
		rating: 3,
		num: 10080,
	},

	// --- Row 385: Weak Point ---
	weakpoint: {
		onSourceModifyDamage(damage, source, target, move) {
			const typeMod = target.runEffectiveness(move);
			if (typeMod === 0) return this.chainModify(0.5);  // neutral → ×0.5
			if (typeMod > 0) return this.chainModify(2);       // SE → ×2 additional
		},
		shortDesc: "Takes 0.5× from neutral moves; takes 2× extra from super-effective moves.",
		origin: 'Custom',
		flags: {},
		name: "Weak Point",
		rating: 2,
		num: 10081,
	},

	// --- Row 386: Judo Master ---
	judomaster: {
		onAfterMoveSecondarySelf(source, target, move) {
			if (!move.flags['contact'] || !target || target.fainted) return;
			if (!this.randomChance(1, 4)) return;
			if (!this.battle.canSwitch(target.side)) return;
			(target as any).draggedOut = true;
		},
		shortDesc: "Contact moves have a 25% chance to force the target to switch out.",
		origin: 'Custom',
		flags: {},
		name: "Judo Master",
		rating: 3,
		num: 10082,
	},

	// --- Row 387: Adaptive ---
	adaptive: {
		onStart(pokemon) {
			this.effectState.resistedTypes = Object.create(null);
		},
		onDamagingHit(damage, target, source, move) {
			if (!this.effectState.resistedTypes) this.effectState.resistedTypes = Object.create(null);
			this.effectState.resistedTypes[move.type] = true;
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (this.effectState.resistedTypes?.[move.type]) return this.chainModify(0.5);
		},
		shortDesc: "Gains ×0.5 resistance to each type that has hit it.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Adaptive",
		rating: 3,
		num: 10083,
	},

	// --- Row 388: Hero (renamed + reworked from Harder They Fall) ---
	hardertheyfall: {
		onStart(pokemon) {
			this.effectState.heroBoostStages = 0;
			this.effectState.heroTrackedFoe = null;
			const foe = pokemon.foes()[0];
			if (!foe) return;
			const foeBST = (Object.values(foe.species.baseStats) as number[]).reduce((a: number, b: number) => a + b, 0);
			let stages = 0;
			if (foeBST >= 650) stages = 2;
			else if (foeBST >= 500) stages = 1;
			if (stages > 0) {
				this.effectState.heroTrackedFoe = foe;
				this.effectState.heroBoostStages = stages;
				this.add('-ability', pokemon, 'Hero');
				this.boost({ atk: stages, def: stages, spa: stages, spd: stages, spe: stages }, pokemon);
			}
		},
		onAnySwitchIn() {
			const pokemon = this.effectState.target;
			if (!pokemon.isActive) return;
			const foe = pokemon.foes()[0];
			if (foe === this.effectState.heroTrackedFoe) return; // ally switched in, no foe change
			// Foe changed — remove old boost
			if (this.effectState.heroBoostStages > 0) {
				const old = this.effectState.heroBoostStages as number;
				this.boost({ atk: -old, def: -old, spa: -old, spd: -old, spe: -old }, pokemon);
				this.effectState.heroBoostStages = 0;
				this.effectState.heroTrackedFoe = null;
			}
			if (!foe) return;
			const foeBST = (Object.values(foe.species.baseStats) as number[]).reduce((a: number, b: number) => a + b, 0);
			let stages = 0;
			if (foeBST >= 650) stages = 2;
			else if (foeBST >= 500) stages = 1;
			if (stages > 0) {
				this.effectState.heroTrackedFoe = foe;
				this.effectState.heroBoostStages = stages;
				this.add('-ability', pokemon, 'Hero');
				this.boost({ atk: stages, def: stages, spa: stages, spd: stages, spe: stages }, pokemon);
			}
		},
		onAnyFaint(fainted: Pokemon) {
			const pokemon = this.effectState.target;
			if (!pokemon.isActive) return;
			if (fainted !== this.effectState.heroTrackedFoe) return;
			if (this.effectState.heroBoostStages > 0) {
				const old = this.effectState.heroBoostStages as number;
				this.boost({ atk: -old, def: -old, spa: -old, spd: -old, spe: -old }, pokemon);
				this.effectState.heroBoostStages = 0;
				this.effectState.heroTrackedFoe = null;
			}
		},
		shortDesc: "vs. ≥500 BST foe: +1 Omniboost; vs. ≥650 BST: +2 Omniboost. Boost lost when foe leaves.",
		origin: 'Custom',
		flags: {},
		name: "Hero",
		rating: 3,
		num: 10084,
	},

	// --- Row 389: Mind Set ---
	mindset: {
		onStart(pokemon) {
			pokemon.abilityState.choiceLock = '';
		},
		onBeforeMove(pokemon, target, move) {
			if (pokemon.abilityState.choiceLock === move.id) return;
			if (pokemon.abilityState.choiceLock) {
				const lockedMove = this.dex.getActiveMove(pokemon.abilityState.choiceLock);
				this.add('-activate', pokemon, 'ability: Mind Set');
				this.add('-block', pokemon, 'move: ' + lockedMove.name);
				return false;
			}
			pokemon.abilityState.choiceLock = move.id;
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			if (pokemon.volatiles['dynamax']) return;
			return this.chainModify(1.5);
		},
		shortDesc: "Boosts Sp. Atk by x1.5 but locks the user into the first move used.",
		origin: 'Custom',
		flags: {},
		name: "Mind Set",
		rating: 3,
		num: 10085,
	},

	// --- Row 390: Soul Accumulation ---
	soulaccumulation: {
		onAnyFaint() {
			const target = this.effectState.target;
			if (!target || target.fainted) return;
			this.heal(Math.floor(target.baseMaxhp * 2 / 3), target);
		},
		shortDesc: "Heals 2/3 max HP whenever any Pokémon on the field faints.",
		origin: 'Custom',
		flags: {},
		name: "Soul Accumulation",
		rating: 4,
		num: 10086,
	},

	// --- Row 391: Alphabet ---
	alphabet: {
		onModifyAtkPriority: 5,
		onModifyAtk(atk, pokemon) {
			const count = pokemon.side.pokemon.filter(p => p.species.baseSpecies === 'Unown').length;
			if (count > 0) return this.chainModify(Math.pow(1.2, count));
		},
		onModifyDefPriority: 6,
		onModifyDef(def, pokemon) {
			const count = pokemon.side.pokemon.filter(p => p.species.baseSpecies === 'Unown').length;
			if (count > 0) return this.chainModify(Math.pow(1.2, count));
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, pokemon) {
			const count = pokemon.side.pokemon.filter(p => p.species.baseSpecies === 'Unown').length;
			if (count > 0) return this.chainModify(Math.pow(1.2, count));
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, pokemon) {
			const count = pokemon.side.pokemon.filter(p => p.species.baseSpecies === 'Unown').length;
			if (count > 0) return this.chainModify(Math.pow(1.2, count));
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			const count = pokemon.side.pokemon.filter(p => p.species.baseSpecies === 'Unown').length;
			if (count > 0) return this.chainModify(Math.pow(1.2, count));
		},
		shortDesc: "Boosts all stats by x1.2 per Unown in the party.",
		origin: 'Custom',
		flags: {},
		name: "Alphabet",
		rating: 3,
		num: 10087,
	},

	// --- Row 392: Flower Trick ---
	flowertrick: {
		onModifyCritRatioPriority: 3,
		onModifyCritRatio(critRatio, source, target, move) {
			if (move.type === 'Grass') return 3;
		},
		shortDesc: "Grass-type moves always land a critical hit.",
		origin: 'Custom',
		flags: {},
		name: "Flower Trick",
		rating: 4,
		num: 10088,
	},

	// --- Row 393: Celestial Body ---
	celestialbody: {
		onStart(pokemon) {
			this.field.addPseudoWeather('gravity', pokemon, this.effect);
		},
		onTryHit(target, source, move) {
			if (target !== source && move.type === 'Ground') {
				this.add('-immune', target, '[from] ability: Celestial Body');
				return null;
			}
		},
		shortDesc: "Sets Gravity on entry; holder is immune to Ground-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Celestial Body",
		rating: 3,
		num: 10089,
	},

	// --- Row 394: Psychic Vision ---
	psychicvision: {
		onStart(pokemon) {
			this.effectState.firstTurn = true;
		},
		// signature is (accuracy, target=ability holder, source=attacker, move)
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy, target, source, move) {
			// Never-miss moves pass accuracy === true (a boolean), so they still hit.
			if (!this.effectState.firstTurn || typeof accuracy !== 'number') return;
			if (move.type === 'Psychic' || move.type === 'Dark') return;
			this.add('-activate', target, 'ability: Psychic Vision');
			return 0;
		},
		onResidual(pokemon) {
			this.effectState.firstTurn = false;
		},
		shortDesc: "On switch-in, non-Psychic/Dark moves with accuracy checks miss for its first turn.",
		origin: 'Custom',
		flags: {},
		name: "Psychic Vision",
		rating: 3,
		num: 10090,
	},

	// --- Row 395: Mind Probe ---
	mindprobe: {
		onAfterMoveSecondarySelf(source, target, move) {
			if (move.type !== 'Psychic' || !target || target.fainted) return;
			if (!this.randomChance(1, 5)) return;
			if (target.hasType('Psychic')) return;
			if (target.volatiles['mindcontrolled']) return;
			target.addVolatile('mindcontrolled', source);
		},
		shortDesc: "Psychic-type moves have a 20% chance to inflict Mind Controlled.",
		origin: 'Custom',
		flags: {},
		name: "Mind Probe",
		rating: 3,
		num: 10091,
	},

	// --- Row 396: Pitiful ---
	pitiful: {
		onStart(pokemon) {
			this.effectState.triggered = false;
		},
		onDamagingHit(damage, target, source, move) {
			if (this.effectState.triggered) return;
			if (target.hp <= target.baseMaxhp / 3) {
				this.effectState.triggered = true;
				this.add('-ability', target, 'Pitiful');
				for (const side of this.battle.sides) {
					for (const pokemon of side.active) {
						if (pokemon && !pokemon.fainted) {
							this.boost({ atk: -2, spa: -2 }, pokemon, target);
						}
					}
				}
			}
		},
		shortDesc: "When HP drops to 1/3, lowers all active Pokémon's Atk and SpA by 2 stages.",
		origin: 'Custom',
		flags: {},
		name: "Pitiful",
		rating: 2,
		num: 10092,
	},

	// --- Row 397: Golddigger ---
	golddigger: {
		onBasePowerPriority: 10,
		onBasePower(basePower, attacker, defender, move) {
			if (defender.item) return this.chainModify(1.1);
		},
		onBeforeMove(source, target, move) {
			this.effectState.preTargetItem = target?.item ?? '';
		},
		onAfterMoveSecondarySelf(source, target, move) {
			const pre = this.effectState.preTargetItem as string;
			this.effectState.preTargetItem = '';
			if (!target || !pre) return;
			if (!target.item && source.item === pre) {
				this.boost({ atk: 1, spa: 1 }, source);
			}
		},
		shortDesc: "x1.1 power vs item holders; gains +1 Atk/SpA when stealing a foe's item.",
		origin: 'Custom',
		flags: {},
		name: "Golddigger",
		rating: 3,
		num: 10093,
	},

	// --- Row 398: Death Roll ---
	deathroll: {
		onBasePowerPriority: 10,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['bite']) return this.chainModify(1.1);
		},
		onAfterMoveSecondarySelf(source, target, move) {
			if (!move.flags['bite'] || !target || target.fainted) return;
			// Cannot apply Death Grip if either Pokémon is already Interlocked or in Death Grip
			if (source.volatiles['interlocked'] || target.volatiles['interlocked']) return;
			if (source.volatiles['deathgrip'] || target.volatiles['deathgrip']) return;
			// Apply Death Grip: source = aggressor, target = victim
			source.addVolatile('deathgrip', target);
			target.addVolatile('deathgrip', source);
			if (target.volatiles['deathgrip']) target.volatiles['deathgrip'].isVictim = true;
		},
		shortDesc: "Biting moves deal ×1.1 power and inflict Death Grip on the target.",
		origin: 'Custom',
		flags: {},
		name: "Death Roll",
		rating: 4,
		num: 10094,
	},

	// --- Row 402: Punisher ---
	punisher: {
		onModifyDamage(damage, source, target, move) {
			if (target.getMoveHitData(move).typeMod > 0) {
				return this.chainModify(1.25);
			}
		},
		shortDesc: "Super Effective moves deal ×2.5 total (×5 for double SE).",
		origin: 'Custom',
		flags: {},
		name: "Punisher",
		rating: 3,
		num: 10096,
	},

	// --- Row 404: Evasive ---
	evasive: {
		onStart(pokemon) {
			this.boost({ evasion: 1 }, pokemon);
		},
		shortDesc: "Raises evasion by 1 stage on switch-in.",
		origin: 'Custom',
		flags: {},
		name: "Evasive",
		rating: 2,
		num: 10097,
	},

	// --- Row 405: Slippery ---
	slippery: {
		onStart(pokemon) {
			this.boost({ evasion: 1 }, pokemon);
		},
		shortDesc: "Raises evasion by 1 stage on switch-in.",
		origin: 'Custom',
		flags: {},
		name: "Slippery",
		rating: 2,
		num: 10098,
	},

	// --- Row 406: Light-footed ---
	lightfooted: {
		shortDesc: "Immune to entry hazards.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Light-footed",
		rating: 2,
		num: 10099,
	},

	// --- Row 407: Tiny Feet ---
	tinyfeet: {
		shortDesc: "Immune to entry hazards.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Tiny Feet",
		rating: 2,
		num: 10100,
	},

	// --- Row 408: Best in Show ---
	bestinshow: {
		onModifyDamage(damage, source, target, move) {
			const atkTypes = [...source.types].sort();
			if (!atkTypes.includes(move.type)) return;
			const defTypes = [...target.types].sort();
			if (atkTypes.length !== defTypes.length || !atkTypes.every((t, i) => t === defTypes[i])) return;
			const typeMod = target.getMoveHitData(move).typeMod;
			if (typeMod >= 1) return;
			return this.chainModify(Math.pow(2, 1 - typeMod));
		},
		shortDesc: "Moves sharing user's type deal SE damage to foes with user's exact type combo.",
		origin: 'Custom',
		flags: {},
		name: "Best in Show",
		rating: 2,
		num: 10101,
	},

	// --- Row 409: Inverse Mold Breaker ---
	inversemoldbreaker: {
		onTryHit(target, source, move) {
			move.ignoreAbility = true;
		},
		shortDesc: "When attacked, the attacker's ability is suppressed for that hit.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Inverse Mold Breaker",
		rating: 3,
		num: 10102,
	},

	// --- Row 410: Heavy Sleeper ---
	heavysleeper: {
		onSourceModifyDamage(damage, source, target, move) {
			// Only applies while asleep: converts the sleep +10% damage penalty into a -10% bonus.
			// The slp condition already skips its own 1.1× for Heavy Sleeper holders (see conditions.ts),
			// so the net effect while asleep is 0.9× instead of 1.1× (or 1.0× without this ability).
			if (target.status !== 'slp') return;
			return this.chainModify(0.9);
		},
		shortDesc: "While asleep: takes 10% less dmg, no damage-threshold wake; lockout still applies.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Heavy Sleeper",
		rating: 3,
		num: 10103,
	},

	// --- Row 403: Magnetism Pulse ---
	magnetismpulse: {
		onStart(pokemon) {
			pokemon.addVolatile('magnetrise');
		},
		shortDesc: "Sets Magnet Rise on switch-in.",
		origin: 'Custom',
		flags: {},
		name: "Magnetism Pulse",
		rating: 2,
		num: 10104,
	},

	// --- Row 238: Combative ---
	combative: {
		onAfterMove(source, target, move) {
			if (move.category === 'Status') return;
			this.boost({ spe: 1 }, source);
		},
		shortDesc: "Speed is boosted by +1 stage after each attacking move used.",
		origin: 'Custom',
		flags: {},
		name: "Combative",
		rating: 3,
		num: 10105,
	},

	// --- Row 415: Empty Head ---
	emptyhead: {
		onUpdate(pokemon) {
			if (pokemon.volatiles['confusion']) {
				this.add('-activate', pokemon, 'ability: Empty Head');
				pokemon.removeVolatile('confusion');
			}
			if (pokemon.volatiles['mindcontrolled']) {
				this.add('-activate', pokemon, 'ability: Empty Head');
				pokemon.removeVolatile('mindcontrolled');
			}
		},
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'confusion' || status.id === 'mindcontrolled') return null;
		},
		onTryHit(target, source, move) {
			if (target !== source && move.id === 'hypnosis') {
				this.add('-immune', target, '[from] ability: Empty Head');
				return null;
			}
		},
		onHit(target, source, move) {
			if (move?.volatileStatus === 'confusion') {
				this.add('-immune', target, 'confusion', '[from] ability: Empty Head');
			}
			if (move?.volatileStatus === 'mindcontrolled') {
				this.add('-immune', target, 'mindcontrolled', '[from] ability: Empty Head');
			}
		},
		onTryBoost(boost, target, source, effect) {
			// Ignore all stat changes — neither self-inflicted nor foe-inflicted affect this Pokémon.
			let b: BoostID;
			for (b in boost) {
				delete boost[b];
			}
		},
		shortDesc: "Immune to Mind Control, confusion, and Hypnosis; also ignores all stat changes.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Empty Head",
		rating: 2,
		num: 10106,
	},

	// --- Row 416: Awe-Inspiring ---
	aweinspiring: {
		onStart(pokemon) {
			let activated = false;
			for (const target of pokemon.adjacentFoes()) {
				if (!activated) {
					this.add('-ability', pokemon, 'Awe-Inspiring', 'boost');
					activated = true;
				}
				if (target.volatiles['substitute']) {
					this.add('-immune', target);
				} else {
					this.boost({ spa: -1 }, target, pokemon, null, true);
				}
			}
		},
		shortDesc: "Lowers the foe's Sp. Atk by 1 stage on switch-in.",
		origin: 'Custom',
		flags: {},
		name: "Awe-Inspiring",
		rating: 3.5,
		num: 10107,
	},

	// --- Row 417: Antiarmor ---
	antiarmor: {
		onAfterMoveSecondarySelf(source, target, move) {
			if (!move || move.category === 'Status' || !target || target === source || target.fainted) return;
			this.boost({ def: -1 }, target, source);
		},
		shortDesc: "The user's attacks lower the target's Defense by 1 stage.",
		origin: 'Custom',
		flags: {},
		name: "Antiarmor",
		rating: 3,
		num: 10108,
	},

	// --- Row 418: Overwhelming ---
	// NOTE: onEffectiveness fires for the DEFENDER's ability in this engine, so the
	// attacker-side resist floor is done via onModifyDamage (reading typeMod), the same
	// pattern as Best in Show. ignoreImmunity (onModifyMove) handles type/grounding immunities.
	overwhelming: {
		onModifyMove(move) {
			if (move.category !== 'Status') move.ignoreImmunity = true;
		},
		onModifyDamage(damage, source, target, move) {
			const typeMod = target.getMoveHitData(move).typeMod;
			if (typeMod < 0) {
				// Undo the resistance to floor at neutral; SE bonuses (typeMod >= 0) are kept.
				return this.chainModify(Math.pow(2, -typeMod));
			}
		},
		shortDesc: "This Pokémon's attacks ignore resistances and immunities (minimum neutral damage).",
		origin: 'Custom',
		flags: {},
		name: "Overwhelming",
		rating: 3.5,
		num: 10109,
	},

	// --- Row 419: Champion ---
	// onEffectiveness fires for the DEFENDER, so this attacker-side override uses
	// onModifyDamage: ×2 when a Fighting move hits a Fighting target (flips the
	// Fighting matchup component from neutral to super effective).
	champion: {
		onModifyDamage(damage, source, target, move) {
			if (move.type === 'Fighting' && target.hasType('Fighting')) {
				return this.chainModify(2);
			}
		},
		shortDesc: "This Pokémon's Fighting-type moves are super effective against Fighting types.",
		origin: 'Custom',
		flags: {},
		name: "Champion",
		rating: 2,
		num: 10110,
	},

	// --- Row 420: Paralyzing Tendrals ---
	// Mechanic lives in the `interlocked` condition (data/mods/champions/conditions.ts):
	// while Interlocked, the partner of a Paralyzing Tendrals holder flinches 30%/turn.
	paralyzingtendrals: {
		shortDesc: "While Interlocked, the interlock partner has a 30% chance to flinch each turn.",
		origin: 'Custom',
		flags: {},
		name: "Paralyzing Tendrals",
		rating: 2,
		num: 10111,
	},

	// --- Row 422: Frustration Tolerance ---
	frustrationtolerance: {
		onSourceModifyDamage(damage, source, target, move) {
			if (target.volatiles['confusion']) {
				return this.chainModify(0.5);
			}
		},
		shortDesc: "Takes half damage from attacks while confused.",
		origin: 'Custom',
		flags: {},
		name: "Frustration Tolerance",
		rating: 2,
		num: 10112,
	},

	// --- Row 429: Pre-Loaded Shell ---
	preloadedshell: {
		onStart(pokemon) {
			this.effectState.shellReady = true;
		},
		onModifyMove(move, pokemon) {
			if (move.id === 'hydrocannon' && this.effectState.shellReady) {
				this.effectState.shellReady = false;
				delete move.self;
				this.add('-ability', pokemon, 'Pre-Loaded Shell');
			}
		},
		shortDesc: "Once per switch-in, Hydro Cannon is used without needing to recharge.",
		origin: 'Custom',
		flags: {},
		name: "Pre-Loaded Shell",
		rating: 2,
		num: 10113,
	},

	// --- Row 435: Protective Resonance ---
	// Side condition `protectiveresonance` defined in data/mods/champions/conditions.ts.
	protectiveresonance: {
		onAfterMove(source, target, move) {
			if (move.flags['sound']) {
				source.side.addSideCondition('protectiveresonance', source, move);
			}
		},
		shortDesc: "This Pokémon's sound moves grant its side a 3-turn screen that halves incoming damage.",
		origin: 'Custom',
		flags: {},
		name: "Protective Resonance",
		rating: 3,
		num: 10115,
	},

	// --- Row 436: Burning Engine ---
	burningengine: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Fire') {
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Fire') {
				this.boost({ spe: 1 }, target);
			}
		},
		shortDesc: "Reduces Fire-type damage by 50% and raises Speed by 1 stage when hit by a Fire move.",
		origin: 'Custom',
		flags: {},
		name: "Burning Engine",
		rating: 2.5,
		num: 10116,
	},

	// --- Row 437: Iron Foot ---
	ironfoot: {
		onBasePowerPriority: 23,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['kicking']) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Boosts the power of Kicking moves by 50%.",
		origin: 'Custom',
		flags: {},
		name: "Iron Foot",
		rating: 3,
		num: 10117,
	},

	// --- Row 442: Garbage Eater ---
	garbageeater: {
		onStart(pokemon) {
			const hazards = ['spikes', 'toxicspikes', 'stealthrock', 'stickyweb'] as const;
			const present = hazards.filter(h => pokemon.side.sideConditions[h]);
			if (!present.length) return;
			const chosen = this.sample(present);
			pokemon.side.removeSideCondition(chosen, pokemon);
			this.add('-sideend', pokemon.side, this.dex.conditions.get(chosen).name, '[from] ability: Garbage Eater', `[of] ${pokemon}`);
			this.heal(Math.floor(pokemon.baseMaxhp / 12), pokemon, pokemon);
		},
		shortDesc: "On switch-in, absorbs 1 random entry hazard on user's side; heals 1/12 MaxHP.",
		origin: 'Custom',
		flags: {},
		name: "Garbage Eater",
		rating: 2.5,
		num: 10118,
	},

	// --- Row 443: Jungle Beat ---
	junglebeat: {
		onModifyMovePriority: -1,
		onModifyMove(move) {
			if (!move.flags['sound']) return;
			move.category = 'Physical';
			if (!move.secondaries) move.secondaries = [];
			move.secondaries.push({
				chance: 100,
				volatileStatus: 'junglebeatvines',
			});
		},
		shortDesc: "Sound moves are Physical; targets take 1/12 HP vine damage at turn end.",
		origin: 'Custom',
		flags: {},
		name: "Jungle Beat",
		rating: 3,
		num: 10119,
	},

	// --- Row 444: Striker ---
	striker: {
		onBasePowerPriority: 23,
		onBasePower(basePower, attacker, defender, move) {
			if (move.flags['ball']) {
				return this.chainModify(1.5);
			}
		},
		shortDesc: "Ball moves have 1.5x power.",
		origin: 'Custom',
		flags: {},
		name: "Striker",
		rating: 3,
		num: 10120,
	},

	// --- Domain Setter abilities (10121–10139) ---
	// Each sets the corresponding Domain pseudoWeather on switch-in.
	// Duration scales with same-type team members (via the domain condition's
	// durationCallback), exactly like the Domain move version. No onEnd —
	// the domain persists after switch-out (Drought/Drizzle pattern).

	domainsetternormal: {
		onStart(pokemon) {
			this.field.addPseudoWeather('normaldomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Normal Domain. Duration scales with Normal-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Normal",
		rating: 3,
		num: 10121,
	},

	domainsetterfire: {
		onStart(pokemon) {
			this.field.addPseudoWeather('firedomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Fire Domain. Duration scales with Fire-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Fire",
		rating: 3,
		num: 10122,
	},

	domainsetterwater: {
		onStart(pokemon) {
			this.field.addPseudoWeather('waterdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Water Domain. Duration scales with Water-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Water",
		rating: 3,
		num: 10123,
	},

	domainsetterelectric: {
		onStart(pokemon) {
			this.field.addPseudoWeather('electricdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Electric Domain. Duration scales with Electric-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Electric",
		rating: 3,
		num: 10124,
	},

	domainsettergrass: {
		onStart(pokemon) {
			this.field.addPseudoWeather('grassdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Grass Domain. Duration scales with Grass-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Grass",
		rating: 3,
		num: 10125,
	},

	domainsetterice: {
		onStart(pokemon) {
			this.field.addPseudoWeather('icedomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Ice Domain. Duration scales with Ice-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Ice",
		rating: 3,
		num: 10126,
	},

	domainsetterfighting: {
		onStart(pokemon) {
			this.field.addPseudoWeather('fightingdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Fighting Domain. Duration scales with Fighting-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Fighting",
		rating: 3,
		num: 10127,
	},

	domainsetterpoison: {
		onStart(pokemon) {
			this.field.addPseudoWeather('poisondomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Poison Domain. Duration scales with Poison-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Poison",
		rating: 3,
		num: 10128,
	},

	domainsetterground: {
		onStart(pokemon) {
			this.field.addPseudoWeather('grounddomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Ground Domain. Duration scales with Ground-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Ground",
		rating: 3,
		num: 10129,
	},

	domainsetterair: {
		onStart(pokemon) {
			this.field.addPseudoWeather('flyingdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Air Domain. Duration scales with Flying-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Air",
		rating: 3,
		num: 10130,
	},

	domainsetterpsychic: {
		onStart(pokemon) {
			this.field.addPseudoWeather('psychicdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Psychic Domain. Duration scales with Psychic-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Psychic",
		rating: 3,
		num: 10131,
	},

	domainsetterbug: {
		onStart(pokemon) {
			this.field.addPseudoWeather('bugdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Bug Domain. Duration scales with Bug-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Bug",
		rating: 3,
		num: 10132,
	},

	domainsetterrock: {
		onStart(pokemon) {
			this.field.addPseudoWeather('rockdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Rock Domain. Duration scales with Rock-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Rock",
		rating: 3,
		num: 10133,
	},

	domainsetterghost: {
		onStart(pokemon) {
			this.field.addPseudoWeather('ghostdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Ghost Domain. Duration scales with Ghost-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Ghost",
		rating: 3,
		num: 10134,
	},

	domainsetterdragon: {
		onStart(pokemon) {
			this.field.addPseudoWeather('dragondomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Dragon Domain. Duration scales with Dragon-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Dragon",
		rating: 3,
		num: 10135,
	},

	domainsetterdark: {
		onStart(pokemon) {
			this.field.addPseudoWeather('darkdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Dark Domain. Duration scales with Dark-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Dark",
		rating: 3,
		num: 10136,
	},

	domainsettersteel: {
		onStart(pokemon) {
			this.field.addPseudoWeather('steeldomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Steel Domain. Duration scales with Steel-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Steel",
		rating: 3,
		num: 10137,
	},

	domainsetterfairy: {
		onStart(pokemon) {
			this.field.addPseudoWeather('fairydomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Fairy Domain. Duration scales with Fairy-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Fairy",
		rating: 3,
		num: 10138,
	},

	domainsettercosmic: {
		onStart(pokemon) {
			this.field.addPseudoWeather('cosmicdomain', pokemon, this.effect);
		},
		shortDesc: "On switch-in, sets Cosmic Domain. Duration scales with Cosmic-type allies.",
		origin: 'Custom',
		flags: {},
		name: "Domain Setter: Cosmic",
		rating: 3,
		num: 10139,
	},

	// --- Row 446: Charged Spines ---
	chargedspines: {
		onDamagingHit(damage, target, source, move) {
			if (move.flags['contact']) {
				source.addVolatile('chargedspineselectrify');
			}
		},
		shortDesc: "When hit by a contact move, gives the attacker Electrify for 2 turns.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Charged Spines",
		rating: 2,
		num: 10149,
	},

	// --- Row 450: Emotion Siphon ---
	emotionsiphon: {
		onAnyAfterMove(source, target, move) {
			const holder = this.effectState.target;
			if (source === holder || source.isAlly(holder)) return;
			if (!move.flags['emotion']) return;
			this.heal(Math.floor(holder.baseMaxhp / 4), holder, holder, this.effect);
		},
		shortDesc: "Heals 25% MaxHP when a foe uses an emotion-based move.",
		origin: 'Custom',
		flags: {},
		name: "Emotion Siphon",
		rating: 3,
		num: 10146,
	},

	// --- Elastic ---
	elastic: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ice') return this.chainModify(2);
			return this.chainModify(0.9);
		},
		shortDesc: "Takes 0.9× direct damage, but 2× from Ice-type moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Elastic",
		rating: 2.5,
		num: 10148,
	},

	// --- Row 451: Endocrine Dampener ---
	endocrinedampener: {
		onFoeTryMove(target, source, move) {
			const targetAllExceptions = ['perishsong', 'flowershield', 'rototiller'];
			if (move.target === 'foeSide' || (move.target === 'all' && !targetAllExceptions.includes(move.id))) {
				return;
			}
			const holder = this.effectState.target;
			if (target !== holder) return;
			if (move.priority > 0.1) {
				this.attrLastMove('[still]');
				this.add('cant', holder, 'ability: Endocrine Dampener', move, `[of] ${target}`);
				return false;
			}
		},
		shortDesc: "Blocks priority moves (priority +1 or higher) aimed at this Pokémon.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Endocrine Dampener",
		rating: 2.5,
		num: 10147,
	},

	// --- Legendary Bird / Custom Awakened Ability Stubs ---
	frosty: {
		shortDesc: "TBD — Articuno's innate ability.",
		origin: 'Custom',
		flags: {},
		name: "Frosty",
		rating: 0,
		num: 10150,
	},
	winterfreeze: {
		shortDesc: "TBD — Articuno's awakened ability.",
		origin: 'Custom',
		flags: {},
		name: "Winter Freeze",
		rating: 0,
		num: 10151,
	},
	springstorm: {
		shortDesc: "TBD — Zapdos's awakened ability.",
		origin: 'Custom',
		flags: {},
		name: "Spring Storm",
		rating: 0,
		num: 10152,
	},
	summersun: {
		shortDesc: "TBD — Moltres's awakened ability.",
		origin: 'Custom',
		flags: {},
		name: "Summer Sun",
		rating: 0,
		num: 10153,
	},
	seeded: {
		shortDesc: "TBD — Falcuatro's innate ability.",
		origin: 'Custom',
		flags: {},
		name: "Seeded",
		rating: 0,
		num: 10154,
	},
	autumnmoon: {
		shortDesc: "TBD — Falcuatro's awakened ability.",
		origin: 'Custom',
		flags: {},
		name: "Autumn Moon",
		rating: 0,
		num: 10155,
	},
	energyabsorb: {
		// Uses base types (not Tera type) to determine same-type matches.
		// Physical same-type: 50% damage reduction.
		// Special same-type: take damage, then heal 1/3 max HP.
		// Status same-type: heal 1/3 max HP.
		onSourceModifyDamage(damage, source, target, move) {
			if (move.category === 'Physical' && target.types.includes(move.type)) {
				this.debug('Energy Absorb halved Physical same-type damage');
				return this.chainModify(0.5);
			}
		},
		onDamagingHit(damage, target, source, move) {
			if (move.category === 'Special' && target.types.includes(move.type)) {
				this.heal(Math.floor(target.baseMaxhp / 3), target, source, this.effect);
			}
		},
		onHit(target, source, move) {
			if (move.category === 'Status' && target !== source && target.types.includes(move.type)) {
				this.heal(Math.floor(target.baseMaxhp / 3), target, source, this.effect);
			}
		},
		shortDesc: "50% dmg from Physical same-type moves; heal 1/3 HP from Special/Status same-type moves. Ignores Tera.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Energy Absorb",
		rating: 3,
		num: 10156,
	},

	// --- Row 454: Solvent Saliva ---
	solventsaliva: {
		onDamagingHit(damage, target, source, move) {
			if (target.fainted) return;
			// Auto-trigger if the holder just interlocked the target this hit.
			const autoTrigger = !!(target.volatiles['interlocked'] &&
				(target.volatiles['interlocked'] as any).partner === source);
			if (!autoTrigger && (!move.flags['contact'] || !this.randomChance(3, 10))) return;
			// 50/50: Stunned or Corroded
			const status = this.random(2) === 0 ? 'stun' : 'cor';
			target.trySetStatus(status, source, this.effect);
		},
		shortDesc: "30% chance to Stun or Corrode on contact; auto-triggers when inflicting Interlocked.",
		origin: 'Custom',
		flags: {},
		name: "Solvent Saliva",
		rating: 2.5,
		num: 10157,
	},

	// --- Row 455: Rock Cannon ---
	rockcannon: {
		onModifyMove(move) {
			if (move.type !== 'Rock') return;
			delete move.flags['contact'];
		},
		shortDesc: "Rock-type moves lose contact and act as if the user has 3× base Speed (ignores boosts).",
		origin: 'Custom',
		flags: {},
		name: "Rock Cannon",
		rating: 3,
		num: 10158,
	},
	freezer: {
		onSourceModifyDamage(damage, source, target, move) {
			if (move.type === 'Ice') return this.chainModify(0.5);
		},
		onDamagingHit(damage, target, source, move) {
			if (move.type === 'Ice') {
				this.boost({ atk: 1, spa: 1 }, target, target, this.effect);
			}
		},
		shortDesc: "Reduces Ice-type moves by 50%; Ice hits boost Atk and SpA by +1.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Freezer",
		rating: 3,
		num: 10159,
	},

	// --- Red Hot ---
	redhot: {
		onDamagingHit(damage, target, source, move) {
			if (this.checkMoveMakesContact(move, source, target)) {
				if (this.randomChance(1, 2)) {
					target.trySetStatus('brn', source);
				}
			}
		},
		shortDesc: "50% chance to burn the target when this Pokémon uses a contact move.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Red Hot",
		rating: 2,
		num: 10160,
	},

	// --- Rotation ---
	rotation: {
		onTryHit(target, source, move) {
			if (move.flags['ball'] || move.flags['bursting'] || move.flags['beam'] || move.flags['heavyprojectile']) {
				this.add('-immune', target, '[from] ability: Rotation');
				return null;
			}
		},
		shortDesc: "Pokémon is immune to Ball, Bursting, Beam, and Heavy Projectile moves.",
		origin: 'Custom',
		flags: { breakable: 1 },
		name: "Rotation",
		rating: 2,
		num: 10161,
	},
};
