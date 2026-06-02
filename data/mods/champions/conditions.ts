// Domains — the champions-mod replacement for terrains.
// Multiple domains can be active at once (backed by pseudoWeather, not terrain).
// Each affects all Pokémon on the field with no grounding requirement.
// Effects: +20% Atk/SpA/Def/SpD/Spe for same-type Pokémon; +10% BP and accuracy for same-type moves.
export const Conditions: import('../../../sim/dex-conditions').ConditionDataTable = {
	normaldomain: {
		name: "Normal Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Normal Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Normal Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 1,
		onFieldEnd() {
			this.add('-fieldend', 'move: Normal Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Normal')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Normal')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Normal')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Normal')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Normal')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Normal') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Normal') return this.chainModify(1.1);
		},
	},

	firedomain: {
		name: "Fire Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Fire Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Fire Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 2,
		onFieldEnd() {
			this.add('-fieldend', 'move: Fire Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Fire')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fire')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fire')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fire')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Fire')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Fire') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Fire') return this.chainModify(1.1);
		},
	},

	waterdomain: {
		name: "Water Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Water Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Water Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 3,
		onFieldEnd() {
			this.add('-fieldend', 'move: Water Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Water')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Water')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Water')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Water')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Water')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Water') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Water') return this.chainModify(1.1);
		},
	},

	electricdomain: {
		name: "Electric Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Electric Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Electric Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 4,
		onFieldEnd() {
			this.add('-fieldend', 'move: Electric Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Electric')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Electric')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Electric')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Electric')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Electric')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Electric') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Electric') return this.chainModify(1.1);
		},
	},

	grassdomain: {
		name: "Grass Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Grass Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Grass Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 5,
		onFieldEnd() {
			this.add('-fieldend', 'move: Grass Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Grass')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Grass')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Grass')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Grass')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Grass')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Grass') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Grass') return this.chainModify(1.1);
		},
	},

	icedomain: {
		name: "Ice Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Ice Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Ice Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 6,
		onFieldEnd() {
			this.add('-fieldend', 'move: Ice Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Ice')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ice')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ice')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ice')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Ice')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Ice') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Ice') return this.chainModify(1.1);
		},
	},

	fightingdomain: {
		name: "Fighting Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Fighting Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Fighting Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 7,
		onFieldEnd() {
			this.add('-fieldend', 'move: Fighting Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Fighting')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fighting')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fighting')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fighting')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Fighting')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Fighting') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Fighting') return this.chainModify(1.1);
		},
	},

	poisondomain: {
		name: "Poison Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Poison Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Poison Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 8,
		onFieldEnd() {
			this.add('-fieldend', 'move: Poison Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Poison')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Poison')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Poison')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Poison')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Poison')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Poison') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Poison') return this.chainModify(1.1);
		},
	},

	grounddomain: {
		name: "Ground Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Ground Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Ground Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 9,
		onFieldEnd() {
			this.add('-fieldend', 'move: Ground Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Ground')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ground')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ground')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ground')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Ground')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Ground') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Ground') return this.chainModify(1.1);
		},
	},

	flyingdomain: {
		name: "Air Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Air Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Air Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 10,
		onFieldEnd() {
			this.add('-fieldend', 'move: Air Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Flying')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Flying')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Flying')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Flying')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Flying')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Flying') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Flying') return this.chainModify(1.1);
		},
	},

	psychicdomain: {
		name: "Psychic Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Psychic Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Psychic Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 11,
		onFieldEnd() {
			this.add('-fieldend', 'move: Psychic Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Psychic')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Psychic')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Psychic')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Psychic')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Psychic')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Psychic') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Psychic') return this.chainModify(1.1);
		},
	},

	bugdomain: {
		name: "Bug Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Bug Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Bug Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 12,
		onFieldEnd() {
			this.add('-fieldend', 'move: Bug Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Bug')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Bug')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Bug')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Bug')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Bug')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Bug') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Bug') return this.chainModify(1.1);
		},
	},

	rockdomain: {
		name: "Rock Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Rock Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Rock Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 13,
		onFieldEnd() {
			this.add('-fieldend', 'move: Rock Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Rock')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Rock')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Rock')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Rock')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Rock')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Rock') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Rock') return this.chainModify(1.1);
		},
	},

	ghostdomain: {
		name: "Ghost Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Ghost Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Ghost Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 14,
		onFieldEnd() {
			this.add('-fieldend', 'move: Ghost Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Ghost')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ghost')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ghost')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ghost')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Ghost')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Ghost') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Ghost') return this.chainModify(1.1);
		},
	},

	dragondomain: {
		name: "Dragon Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Dragon Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Dragon Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 15,
		onFieldEnd() {
			this.add('-fieldend', 'move: Dragon Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Dragon')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Dragon')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Dragon')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Dragon')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Dragon')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Dragon') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Dragon') return this.chainModify(1.1);
		},
	},

	darkdomain: {
		name: "Dark Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Dark Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Dark Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 16,
		onFieldEnd() {
			this.add('-fieldend', 'move: Dark Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Dark')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Dark')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Dark')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Dark')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Dark')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Dark') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Dark') return this.chainModify(1.1);
		},
	},

	steeldomain: {
		name: "Steel Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Steel Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Steel Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 17,
		onFieldEnd() {
			this.add('-fieldend', 'move: Steel Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Steel')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Steel')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Steel')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Steel')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Steel')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Steel') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Steel') return this.chainModify(1.1);
		},
	},

	fairydomain: {
		name: "Fairy Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Fairy Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Fairy Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 18,
		onFieldEnd() {
			this.add('-fieldend', 'move: Fairy Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Fairy')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fairy')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fairy')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fairy')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Fairy')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Fairy') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Fairy') return this.chainModify(1.1);
		},
	},

	cosmicdomain: {
		name: "Cosmic Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Cosmic Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Cosmic Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 19,
		onFieldEnd() {
			this.add('-fieldend', 'move: Cosmic Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Cosmic')) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Cosmic')) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Cosmic')) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Cosmic')) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Cosmic')) return this.chainModify([6144, 5120]);
		},
		onModifyBasePower(basePower, attacker, defender, move) {
			if (move.type === 'Cosmic') return this.chainModify(1.1);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Cosmic') return this.chainModify(1.1);
		},
	},

	// ── Volatile status conditions ────────────────────────────────────────────

	mindcontrolled: {
		name: 'mindcontrolled',
		// No turn-based duration — we track "instances" manually.
		// Two move-slots must be consumed before MC expires:
		//   • flinch counts as one instance (Hypno-faster case)
		//   • each forced MC'd move counts as one instance
		// A turn where MC is applied but the target already moved (Hypno
		// slower) does NOT consume an instance — that's the whole point.
		onStart(target, source) {
			// Overrides Confusion per §4 volatile stacking rules
			if (target.volatiles['confusion']) target.removeVolatile('confusion');
			this.add('-start', target, 'move: Mind Controlled', `[of] ${source}`);
			// Initialize instance budget
			target.volatiles['mindcontrolled'].instances = 2;
			// Mark that the first residual is the application turn
			target.volatiles['mindcontrolled'].firstResidual = true;
			// Flinch only if the target hasn't moved yet this turn (i.e. Hypno
			// was faster). If they've already moved, flinch would be wasted and
			// the application turn should not eat into the instance budget.
			if (!target.moveThisTurn) {
				target.addVolatile('flinch');
			}
		},
		onEnd(target) {
			this.add('-end', target, 'move: Mind Controlled');
		},
		onResidualOrder: 11,
		onResidual(target) {
			const volatile = target.volatiles['mindcontrolled'];
			if (!volatile) return;

			if (volatile.firstResidual) {
				// End of the turn MC was applied.
				volatile.firstResidual = false;
				if (!target.moveThisTurn) {
					// Target couldn't move (flinch fired) → one instance consumed.
					volatile.instances--;
				}
				// If target already moved before MC was applied (Hypno slower),
				// moveThisTurn is non-empty — don't consume an instance.
			} else {
				// Subsequent turns: check whether the forced MC'd move was used.
				if (target.moveThisTurn) {
					volatile.instances--;
				}
				// Couldn't move (sleep, paralysis, etc.) — don't count.
			}

			if (volatile.instances <= 0) {
				target.removeVolatile('mindcontrolled');
			}
		},
		// Cure immediately if the afflicted Pokémon takes 50%+ max HP in a single hit
		onDamagingHit(damage, target, source, move) {
			if (damage >= target.baseMaxhp / 2) {
				target.removeVolatile('mindcontrolled');
			}
		},
	},

	charmed: {
		name: 'charmed',
		duration: 3,
		// Replaces canon Infatuation (§4). Gender-agnostic, 3 turns deterministic.
		// Damaging moves by the Charmed Pokémon targeting the source deal ×0.25 damage.
		// Status moves are unaffected.
		onStart(target, source) {
			this.add('-start', target, 'move: Charmed', `[of] ${source}`);
		},
		onUpdate(pokemon) {
			if (this.effectState.source && !this.effectState.source.isActive && pokemon.volatiles['charmed']) {
				pokemon.removeVolatile('charmed');
			}
		},
		onEnd(target) {
			this.add('-end', target, 'move: Charmed');
		},
		onBasePower(basePower, attacker, defender, move) {
			if (move.category === 'Status') return;
			if (defender !== this.effectState.source) return;
			return this.chainModify(0.25);
		},
	},

	// §4 Interlocked volatile — shared two-Pokémon binding status.
	// Both Pokémon receive this volatile simultaneously (applied by the move's onHit).
	// Effects:
	//   • 3-turn deterministic duration
	//   • Both are trapped (cannot switch); phazing still ends the condition naturally
	//   • Single-target foe moves must target the Interlocked partner only
	//   • Shared damage: outside-attacker hits propagate to the partner (doubles mechanic;
	//     irrelevant in singles since the only attacker IS the partner)
	//   • Ends on KO (fainted partner triggers onEnd cleanup) or phasing (volatile cleared)
	interlocked: {
		name: 'interlocked',
		duration: 3,
		noCopy: true,
		onStart(target, source) {
			this.effectState.partner = source;
			this.add('-start', target, 'interlocked', `[of] ${source}`);
		},
		onEnd(target) {
			this.add('-end', target, 'interlocked');
			// Guard against recursion: Showdown calls onEnd BEFORE deleting volatiles[id],
			// so without this flag A's onEnd removes B's volatile → B's onEnd fires → sees
			// A's volatile still present → removes it again → infinite loop.
			if (this.effectState.ending) return;
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['interlocked']) {
				partner.volatiles['interlocked'].ending = true;
				partner.removeVolatile('interlocked');
			}
		},
		onTrapPokemon(pokemon) {
			pokemon.trapped = true;
		},
		onBeforeFaint(target) {
			// clearVolatile() is called after BeforeFaint without firing onEnd,
			// so we must explicitly clean up the partner here.
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['interlocked']) {
				partner.volatiles['interlocked'].ending = true;
				partner.removeVolatile('interlocked');
			}
		},
		onSwitchOut(target) {
			// Phasing moves (Roar, Dragon Tail, etc.) bypass trapping and force a switch.
			// clearVolatile() runs after SwitchOut without firing onEnd, so clean up partner here.
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['interlocked']) {
				partner.volatiles['interlocked'].ending = true;
				partner.removeVolatile('interlocked');
			}
		},
		onBeforeMove(pokemon, target, move) {
			const partner = this.effectState.partner;
			if (!partner || partner.fainted) return;
			// Paralyzing Tendrals (ability): while Interlocked, the partner's holder makes
			// this Pokémon flinch 30%/turn. Fighting types and Inner Focus are immune (§1.5).
			if (partner.hasAbility('paralyzingtendrals') && !pokemon.hasType('Fighting') &&
				!pokemon.hasAbility('innerfocus') && this.randomChance(3, 10)) {
				this.add('cant', pokemon, 'flinch');
				return false;
			}
			// Restrict single-target foe moves: must aim at the Interlocked partner only.
			// Self-targeting and ally-targeting moves are unaffected.
			// In singles this can never fail (only opponent IS the partner).
			const singleFoeTargets = ['normal', 'adjacentFoe', 'any', 'randomNormal'];
			if (
				singleFoeTargets.includes(move.target as string) &&
				target && target.side !== pokemon.side &&
				target !== partner
			) {
				this.add('-fail', pokemon);
				return false;
			}
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return; // skip Cannot Miss
			if (source !== this.effectState.partner) return; // only partner attacking
			return this.chainModify(1.5);
		},
		onDamagingHit(damage, target, source, move) {
			// Shared damage (doubles mechanic): an outside attacker hits one Interlocked
			// Pokémon → the partner takes the same damage.
			// In singles the only attacker is always the partner, so this never fires.
			// Battle.prototype.damage is raw damage and does NOT re-trigger onDamagingHit.
			const partner = this.effectState.partner;
			if (!partner || partner.fainted) return;
			if (source === partner) return; // Normal exchange — no shared damage
			this.damage(damage, partner);
		},
	},

	// §4 Death Grip volatile — relational variant of Interlocked.
	// The aggressor applies this to the victim. Both receive the volatile simultaneously.
	// Shares all Interlocked mechanics (3-turn trap, move redirect, +1.5× accuracy on partner)
	// EXCEPT: the victim takes 1/8 max HP chip damage each residual turn; the aggressor does not.
	// effectState.partner = the other Pokémon in the grip.
	// effectState.isVictim = true on the victim's copy, false/absent on the aggressor's copy.
	deathgrip: {
		name: 'deathgrip',
		duration: 3,
		noCopy: true,
		onStart(target, source) {
			this.effectState.partner = source;
			// isVictim is NOT set here — it must be set by the call site on the victim's copy only.
			// (Both copies' onStart receive the same args so we can't distinguish victim from aggressor here.)
			this.add('-start', target, 'deathgrip', `[of] ${source}`);
		},
		onEnd(target) {
			this.add('-end', target, 'deathgrip');
			if (this.effectState.ending) return;
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['deathgrip']) {
				partner.volatiles['deathgrip'].ending = true;
				partner.removeVolatile('deathgrip');
			}
		},
		onTrapPokemon(pokemon) {
			pokemon.trapped = true;
		},
		onBeforeFaint(target) {
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['deathgrip']) {
				partner.volatiles['deathgrip'].ending = true;
				partner.removeVolatile('deathgrip');
			}
		},
		onSwitchOut(target) {
			const partner = this.effectState.partner;
			if (partner && !partner.fainted && partner.volatiles['deathgrip']) {
				partner.volatiles['deathgrip'].ending = true;
				partner.removeVolatile('deathgrip');
			}
		},
		onBeforeMove(pokemon, target, move) {
			const partner = this.effectState.partner;
			if (!partner || partner.fainted) return;
			const singleFoeTargets = ['normal', 'adjacentFoe', 'any', 'randomNormal'];
			if (
				singleFoeTargets.includes(move.target as string) &&
				target && target.side !== pokemon.side &&
				target !== partner
			) {
				this.add('-fail', pokemon);
				return false;
			}
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (source !== this.effectState.partner) return;
			return this.chainModify(1.5);
		},
		onResidual(pokemon) {
			// Only the victim takes chip damage; aggressor does not.
			if (!this.effectState.isVictim) return;
			this.damage(Math.floor(pokemon.baseMaxhp / 8));
		},
		onDamagingHit(damage, target, source, move) {
			const partner = this.effectState.partner;
			if (!partner || partner.fainted) return;
			if (source === partner) return;
			this.damage(damage, partner);
		},
	},

	marked: {
		name: 'marked',
		noCopy: true,
		// Relational status (§4). The Marked Pokémon carries this volatile; the Hunter
		// is the Pokémon that inflicted it (stored in effectState.source).
		// Hunter's attacks vs. the Marked deal ×1.5 damage and cannot miss.
		// Only one Mark per Pokémon; persists through switches on both sides;
		// cleared only when the Marked Pokémon faints.
		onStart(target, source) {
			// Mirror the hunter reference directly on the Pokemon object so it
			// survives switch-out (volatiles are cleared but the object persists).
			(target as any).markedHunter = source;
			this.add('-start', target, 'move: Marked', `[of] ${source}`);
		},
		onEnd(target) {
			this.add('-end', target, 'move: Marked');
		},
		onSourceModifyDamage(damage, source, target, move) {
			if (!this.effectState.source || source !== this.effectState.source) return;
			if (move.category === 'Status') return;
			return this.chainModify(1.5);
		},
		onAccuracy(accuracy, target, source, move) {
			if (!this.effectState.source || source !== this.effectState.source) return;
			if (move.category === 'Status') return;
			return true; // cannot miss
		},
	},

	// --- Status condition overrides ---
	// §4 of the master reference: every status has both a damage component and a stat-reduction
	// component.
	// Poison family:    Poisoned = 1/16 chip + -33% SpDef; Toxic    = escalating chip + -50% SpDef.
	// Burn family:      Burned   = 1/16 chip + -33% Atk;   Scorched = 1/8 chip + -50% Atk.
	// Corrosion family: Corroded = 1/16 chip + -33% Def;   Melting  = 1/8 chip + -50% Def.

	cor: {
		name: 'cor',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'cor', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'cor');
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			// 1/16 per turn
			this.damage(pokemon.baseMaxhp / 16);
		},
		// -33% Defense while Corroded. Fires last so it stacks correctly with domain boosts.
		onModifyDefPriority: -101,
		onModifyDef(def) {
			def = this.finalModify(def);
			return Math.floor(def * 2 / 3);
		},
	},

	mlt: {
		name: 'mlt',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'mlt', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'mlt');
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			// 1/8 per turn (doubled from Corroded)
			this.damage(pokemon.baseMaxhp / 8);
		},
		// -50% Defense while Melting
		onModifyDefPriority: -101,
		onModifyDef(def) {
			def = this.finalModify(def);
			return Math.floor(def * 1 / 2);
		},
	},

	brn: {
		name: 'brn',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.id === 'flameorb') {
				this.add('-status', target, 'brn', '[from] item: Flame Orb');
			} else if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'brn', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'brn');
			}
		},
		onResidualOrder: 10,
		onResidual(pokemon) {
			// 1/16 per turn (canon value, unchanged)
			this.damage(pokemon.baseMaxhp / 16);
		},
		// -33% Attack while Burned (nerfed from canon's -50%, which was hardcoded in getDamage).
		// Moved to event handler so Scorched can use the same pattern at -50%.
		onModifyAtkPriority: -101,
		onModifyAtk(atk, pokemon, target, move) {
			if (move.category === 'Physical' && !pokemon.hasAbility('guts')) {
				atk = this.finalModify(atk);
				return Math.floor(atk * 2 / 3);
			}
		},
	},

	scr: {
		name: 'scr',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'scr', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'scr');
			}
		},
		onResidualOrder: 10,
		onResidual(pokemon) {
			// 1/8 per turn (doubled from Burned)
			this.damage(pokemon.baseMaxhp / 8);
		},
		// -50% Attack while Scorched
		onModifyAtkPriority: -101,
		onModifyAtk(atk, pokemon, target, move) {
			if (move.category === 'Physical' && !pokemon.hasAbility('guts')) {
				atk = this.finalModify(atk);
				return Math.floor(atk * 1 / 2);
			}
		},
		// Thermal counter (§4): Ice move ≥65 BP demotes Scorched to Burned on hit
		onDamagingHit(damage, target, source, move) {
			if (move.type !== 'Ice' || move.basePower < 65) return;
			target.cureStatus();
			target.setStatus('brn', source, move);
		},
	},

	psn: {
		name: 'psn',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'psn', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'psn');
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			// Toxic Boost ignores poison chip damage.
			if (pokemon.hasAbility('toxicboost')) return;
			// 1/16 per turn (halved from canon's 1/8)
			this.damage(pokemon.baseMaxhp / 16);
		},
		// -33% SpDef while Poisoned. Fires at -101 priority so it applies after all other
		// modifiers (domain boosts, stat stages, etc.) have already been chained in.
		onModifySpDPriority: -101,
		onModifySpD(spd, target) {
			// Toxic Boost ignores poison's SpD drop.
			if (target.hasAbility('toxicboost')) return;
			spd = this.finalModify(spd);
			return Math.floor(spd * 2 / 3);
		},
	},

	tox: {
		name: 'tox',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			this.effectState.stage = 0;
			if (sourceEffect && sourceEffect.id === 'toxicorb') {
				this.add('-status', target, 'tox', '[from] item: Toxic Orb');
			} else if (sourceEffect && sourceEffect.effectType === 'Ability') {
				this.add('-status', target, 'tox', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'tox');
			}
		},
		onSwitchIn() {
			this.effectState.stage = 0;
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			// Escalating: 1/16 on turn 1, +1/16 each subsequent turn (canon-preserved)
			if (this.effectState.stage < 15) {
				this.effectState.stage++;
			}
			// Toxic Boost ignores toxic chip damage (stage still advances).
			if (pokemon.hasAbility('toxicboost')) return;
			this.damage(this.clampIntRange(pokemon.baseMaxhp / 16, 1) * this.effectState.stage);
		},
		// -50% SpDef while Toxicked. Same late-priority pattern as psn.
		onModifySpDPriority: -101,
		onModifySpD(spd, target) {
			// Toxic Boost ignores toxic's SpD drop.
			if (target.hasAbility('toxicboost')) return;
			spd = this.finalModify(spd);
			return Math.floor(spd * 1 / 2);
		},
	},

	stun: {
		name: 'stun',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'stun', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'stun');
			}
			// First-action lockout: the Pokémon loses its next possible action.
			// Persists through switching — fires on the Pokémon's next onBeforeMove.
			target.statusState.lockoutPending = true;
		},
		onBeforeMove(pokemon, target, move) {
			// Serve pending lockout first (takes precedence over everything else)
			if (pokemon.statusState.lockoutPending) {
				pokemon.statusState.lockoutPending = false;
				this.add('cant', pokemon, 'stun');
				return false;
			}
			// Ongoing pivot block: Stunned Pokémon cannot use switching moves
			if (move.selfSwitch) {
				this.add('cant', pokemon, 'stun');
				return false;
			}
		},
		// Grey out pivot moves in the move menu
		onDisableMove(pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				const move = this.dex.moves.get(moveSlot.id);
				if (move.selfSwitch) pokemon.disableMove(moveSlot.id);
			}
		},
		// -33% Speed while Stunned. Applied at -101 priority so it stacks after all other mods.
		onModifySpePriority: -101,
		onModifySpe(spe) {
			spe = this.finalModify(spe);
			return Math.floor(spe * 2 / 3);
		},
	},

	par: {
		name: 'par',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect && sourceEffect.id === 'thunderwave') {
				this.add('-status', target, 'par', '[from] move: Thunder Wave');
			} else if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'par', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'par');
			}
			// First-action lockout (resets on escalation from Stunned, giving a second lockout)
			target.statusState.lockoutPending = true;
		},
		onBeforeMove(pokemon, target, move) {
			// Serve pending lockout first
			if (pokemon.statusState.lockoutPending) {
				pokemon.statusState.lockoutPending = false;
				this.add('cant', pokemon, 'par');
				return false;
			}
			// Ongoing pivot block: Paralyzed Pokémon cannot use switching moves
			if (move.selfSwitch) {
				this.add('cant', pokemon, 'par');
				return false;
			}
		},
		// Grey out pivot moves in the move menu
		onDisableMove(pokemon) {
			for (const moveSlot of pokemon.moveSlots) {
				const move = this.dex.moves.get(moveSlot.id);
				if (move.selfSwitch) pokemon.disableMove(moveSlot.id);
			}
		},
		// -50% Speed while Paralyzed
		onModifySpePriority: -101,
		onModifySpe(spe) {
			spe = this.finalModify(spe);
			return Math.floor(spe * 1 / 2);
		},
		// Priority suppression: moves with effective priority > 0 are reduced by 1 bracket (floor: 0).
		// Quick Attack (+1) → 0, Extreme Speed (+2) → +1, etc.
		onModifyPriority(priority, pokemon, target, move) {
			if (priority > 0) return Math.max(priority - 1, 0);
		},
	},

	antidomain: {
		name: "Anti-Domain",
		onFieldStart(field, source, effect) {
			this.add('-fieldstart', 'move: Anti-Domain', '[from] ability: Anti-Domain', `[of] ${source}`);
		},
		onFieldEnd() {
			this.add('-fieldend', 'move: Anti-Domain');
		},
		// Priority 4 fires after domain's priority 5 (Atk/SpA/Spe), undoing the ×1.2 boost.
		onModifyAtkPriority: 4,
		onModifyAtk(atk, attacker) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && attacker.hasType(type as any)) this.chainModify([5120, 6144]);
			}
		},
		onModifySpAPriority: 4,
		onModifySpA(spa, attacker) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && attacker.hasType(type as any)) this.chainModify([5120, 6144]);
			}
		},
		// Priority 5 fires after domain's priority 6 (Def/SpD), undoing the ×1.2 boost.
		onModifyDefPriority: 5,
		onModifyDef(def, target) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && target.hasType(type as any)) this.chainModify([5120, 6144]);
			}
		},
		onModifySpDPriority: 5,
		onModifySpD(spd, target) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && target.hasType(type as any)) this.chainModify([5120, 6144]);
			}
		},
		onModifySpePriority: 4,
		onModifySpe(spe, pokemon) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && pokemon.hasType(type as any)) this.chainModify([5120, 6144]);
			}
		},
		onModifyBasePowerPriority: -1,
		onModifyBasePower(basePower, attacker, defender, move) {
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && move.type === type) this.chainModify([10, 11]);
			}
		},
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			const d = this.field.pseudoWeather;
			for (const [id, type] of [
				['normaldomain', 'Normal'], ['firedomain', 'Fire'], ['waterdomain', 'Water'],
				['electricdomain', 'Electric'], ['grassdomain', 'Grass'], ['icedomain', 'Ice'],
				['fightingdomain', 'Fighting'], ['poisondomain', 'Poison'], ['grounddomain', 'Ground'],
				['flyingdomain', 'Flying'], ['psychicdomain', 'Psychic'], ['bugdomain', 'Bug'],
				['rockdomain', 'Rock'], ['ghostdomain', 'Ghost'], ['dragondomain', 'Dragon'],
				['darkdomain', 'Dark'], ['steeldomain', 'Steel'], ['fairydomain', 'Fairy'],
				['cosmicdomain', 'Cosmic'],
			] as [string, string][]) {
				if (d[id] && move.type === type) this.chainModify([10, 11]);
			}
		},
	},

	slp: {
		name: 'slp',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'slp', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'slp');
			}
			target.statusState.sleepTurns = 0;
		},
		onBeforeMove(pokemon, target, move) {
			// Comatose Pokémon use Comatose's perpetual-sleep logic, not this condition's lockout
			if (pokemon.hasAbility('comatose')) return;
			// Sleep Talk and Snore can still be used while asleep — don't count those turns
			if (move.id === 'sleeptalk' || move.id === 'snore') return;
			if (pokemon.status !== 'slp' || !pokemon.hp) return;
			pokemon.statusState.sleepTurns++;
			// Early Bird halves the lockout from 2 turns to 1
			const wakeThreshold = pokemon.hasAbility('earlybird') ? 1 : 2;
			if (pokemon.statusState.sleepTurns > wakeThreshold) {
				pokemon.cureStatus();
				if (pokemon.hasAbility('earlybird')) this.boost({ spe: 2 }, pokemon, pokemon, null);
				return;
			}
			// Dream Guide: holder and active allies can attack despite sleep lockout (turns still accumulate)
			if (pokemon.hasAbility('dreamguide') ||
				pokemon.alliesActive().some(p => !p.fainted && p.hasAbility('dreamguide'))) return;
			this.add('cant', pokemon, 'slp');
			return false;
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			if (pokemon.hasAbility('comatose')) return;
			if (!pokemon.hp || pokemon.status !== 'slp') return;
			// Heal-tax: sleeping restores 1/10 max HP per end-of-turn
			this.heal(Math.floor(pokemon.baseMaxhp / 10), pokemon, pokemon);
		},
		// Takes 10% more damage from all attacks while asleep.
		// onSourceModifyDamage fires on the DEFENDER's conditions; source = attacker, target = sleeping Pokémon.
		onSourceModifyDamage(damage, source, target, move) {
			if (target.hasAbility('comatose') || target.hasAbility('heavysleeper')) return;
			return this.chainModify(1.1);
		},
		// Active wake-up: a single hit dealing ≥50% of the sleeper's max HP wakes it immediately.
		onDamagingHit(damage, target, source, move) {
			if (target.hasAbility('comatose') || target.hasAbility('heavysleeper')) return;
			if (target.status !== 'slp') return;
			if (damage >= target.baseMaxhp / 2) {
				target.cureStatus();
				if (target.hasAbility('earlybird')) this.boost({ spe: 2 }, target, target, null);
			}
		},
	},

	frb: {
		name: 'frb',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'frb', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'frb');
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			// 1/16 per turn (mirrors Burned/Poisoned/Corroded minor-tier chip)
			this.damage(Math.floor(pokemon.baseMaxhp / 16));
		},
		// -33% Special Attack while Frostbitten
		onModifySpAPriority: -101,
		onModifySpA(spa, pokemon) {
			spa = this.finalModify(spa);
			return Math.floor(spa * 2 / 3);
		},
	},

	frz: {
		name: 'frz',
		effectType: 'Status',
		onStart(target, source, sourceEffect) {
			if (sourceEffect?.effectType === 'Ability') {
				this.add('-status', target, 'frz', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-status', target, 'frz');
			}
			// Phase 1 — Frozen Solid: 1-turn lockout + 50% damage reduction
			target.statusState.frozenPhase = 1;
			target.statusState.lockoutPending = true;
		},
		onBeforeMove(pokemon, target, move) {
			// Phase 1 lockout: Pokémon loses its first action (the "thaw attempt").
			// Transition to Phase 2 happens here — the attempt to thaw is the trigger,
			// not end-of-turn, so the Pokémon enters the regular Frozen state immediately
			// after its first blocked action.
			if (pokemon.statusState.frozenPhase === 1 && pokemon.statusState.lockoutPending) {
				pokemon.statusState.lockoutPending = false;
				pokemon.statusState.frozenPhase = 2;
				this.add('cant', pokemon, 'frz');
				return false;
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			if (!pokemon.hp || pokemon.status !== 'frz') return;
			// 1/8 chip damage in both phases
			this.damage(Math.floor(pokemon.baseMaxhp / 8));
		},
		// Phase 1 damage reduction: takes 50% less from non-Ice attacking moves while Frozen Solid.
		// onSourceModifyDamage fires on the DEFENDER's conditions; source = attacker, target = frozen Pokémon.
		onSourceModifyDamage(damage, source, target, move) {
			if (target.statusState.frozenPhase !== 1) return;
			if (move.type === 'Ice') return; // Ice moves bypass the reduction (§4)
			return this.chainModify(0.5);
		},
		// Phase 2: -50% Special Attack while Frozen (sustained)
		onModifySpAPriority: -101,
		onModifySpA(spa, pokemon) {
			if (pokemon.statusState.frozenPhase !== 2) return;
			spa = this.finalModify(spa);
			return Math.floor(spa * 1 / 2);
		},
		// Thermal counter (§4): Fire move ≥65 BP demotes Phase 1 Frozen Solid → Frostbitten on hit.
		onDamagingHit(damage, target, source, move) {
			if (target.statusState.frozenPhase !== 1) return;
			if (move.type !== 'Fire' || move.basePower < 65) return;
			target.cureStatus();
			target.setStatus('frb', source, move);
		},
	},

	confusion: {
		onStart(target, source, sourceEffect) {
			// Psychic types are immune to Confusion (§1.5 blanket effect)
			if (target.hasType('Psychic')) {
				this.add('-immune', target);
				return false;
			}
			if (sourceEffect?.id === 'lockedmove') {
				this.add('-start', target, 'confusion', '[fatigue]');
			} else if (sourceEffect?.effectType === 'Ability') {
				this.add('-start', target, 'confusion', '[from] ability: ' + sourceEffect.name, `[of] ${source}`);
			} else {
				this.add('-start', target, 'confusion');
			}
			this.effectState.confusionInstances = 0;
		},
		onEnd(target) {
			this.add('-end', target, 'confusion');
		},
		onBeforeMovePriority: 3,
		onBeforeMove(pokemon, target, move) {
			// Guard: the redirected random move is executing — skip the confusion check
			if (this.effectState.redirecting) {
				this.effectState.redirecting = false;
				return;
			}
			// 2 confused actions served — confusion clears, Pokémon acts freely this turn
			if (this.effectState.confusionInstances >= 2) {
				pokemon.removeVolatile('confusion');
				return;
			}
			this.add('-activate', pokemon, 'confusion');
			// Collect moves that still have PP (currently-usable moveset)
			const validMoves = pokemon.moveSlots
				.filter(ms => ms.id && ms.pp > 0)
				.map(ms => ms.id);
			if (!validMoves.length) return false; // no PP on any move — block action
			const randomMoveId = this.sample(validMoves);
			// Increment BEFORE useMove; guard flag prevents recursive onBeforeMove from counting
			this.effectState.confusionInstances++;
			this.effectState.redirecting = true;
			this.actions.useMove(randomMoveId, pokemon);
			return false; // suppress the originally-chosen move
		},
	},

	// Side condition created by Protective Soul ability when holder is KO'd.
	// Grants the next ally that switches in a free substitute (no HP cost).
	protectivesoulbarrier: {
		name: 'Protective Soul Barrier',
		onSwitchIn(pokemon) {
			if (pokemon.volatiles['substitute']) {
				// Already has a substitute; discard the barrier.
				pokemon.side.removeSideCondition('protectivesoulbarrier');
				return;
			}
			const hp = (this.effectState as any).barrierHP || 1;
			// Install the substitute volatile directly (no HP deducted from the incoming Pokémon).
			(pokemon.volatiles as any)['substitute'] = {hp, id: 'substitute', target: pokemon, source: pokemon};
			this.add('-start', pokemon, 'Substitute');
			pokemon.side.removeSideCondition('protectivesoulbarrier');
		},
	},

	// Side condition created by the Protective Resonance ability when the holder uses a
	// sound move. A 2-turn screen that halves all incoming damage to the holder's side.
	protectiveresonance: {
		duration: 2,
		onSideStart(side) {
			this.add('-sidestart', side, 'ability: Protective Resonance');
		},
		onAnyModifyDamage(damage, source, target, move) {
			if (target !== source && this.effectState.target.hasAlly(target)) {
				if (!target.getMoveHitData(move).crit && !move.infiltrates) {
					this.debug('Protective Resonance weaken');
					if (this.activePerHalf > 1) return this.chainModify([2732, 4096]);
					return this.chainModify(0.5);
				}
			}
		},
		onSideResidualOrder: 26,
		onSideResidualSubOrder: 12,
		onSideEnd(side) {
			this.add('-sideend', side, 'ability: Protective Resonance');
		},
	},

	// ── Minimal weather overrides (§2) — built so the §1.5 weather-coupled blanket
	// immunities (Ice+Steel/Snowstorm, Water/Heavy Rain, Fire/Harsh Sun) have real
	// mechanics to hook into. Canon weather IDs/names are retained; flavor renames and
	// the full §2 weather pass (power-boost removal, etc.) are a separate task. Each
	// condition is copied whole from data/conditions.ts because mod conditions replace
	// the base entry, then modified.

	// Sandstorm — chip 1/16 (§2). Rock/Ground/Steel immunity is canon
	// (enforced by runStatusImmunity('sandstorm') before onWeather fires).
	// §2: weather no longer modifies power/stats — the canon Rock SpD ×1.5 boost is removed.
	sandstorm: {
		name: 'Sandstorm',
		effectType: 'Weather',
		duration: 5,
		durationCallback(source, effect) {
			if (source?.hasItem('smoothrock')) return 8;
			return 5;
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Sandstorm', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Sandstorm');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Sandstorm', '[upkeep]');
			if (this.field.isWeather('sandstorm')) this.eachEvent('Weather');
		},
		onWeather(target) {
			this.damage(target.baseMaxhp / 16);
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// Snowscape (Snowstorm) — hail-style chip (1/16) instead of the canon Snow Defense
	// boost (§2). Ice and Steel types are immune to the chip (§1.5).
	snowscape: {
		name: 'Snowscape',
		effectType: 'Weather',
		duration: 5,
		durationCallback(source, effect) {
			if (source?.hasItem('icyrock')) return 8;
			return 5;
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Snowscape', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Snowscape');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Snowscape', '[upkeep]');
			if (this.field.isWeather('snowscape')) this.eachEvent('Weather');
		},
		onWeather(target) {
			if (target.hasType('Ice') || target.hasType('Steel')) return;
			this.damage(target.baseMaxhp / 16);
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// RainDance (Heavy Rain) — non-Water Pokémon spend +1 PP per move (§2); Water types
	// are immune (§1.5). Burn cannot be inflicted while raining (Will-O-Wisp's move-level
	// override is deferred to §5). §2: weather no longer modifies power — the canon Water ×1.5
	// boost and Fire ×0.5 suppression are removed.
	raindance: {
		name: 'RainDance',
		effectType: 'Weather',
		duration: 5,
		durationCallback(source, effect) {
			if (source?.hasItem('damprock')) return 8;
			return 5;
		},
		onImmunity(type, pokemon) {
			if (pokemon.effectiveWeather() !== 'raindance') return;
			if (type === 'brn') return false;
		},
		onAfterMove(source, target, move) {
			if (source.effectiveWeather() !== 'raindance') return;
			if (source.hasType('Water')) return;
			// Moves at 1 PP drop to 0; deductPP clamps at 0.
			source.deductPP(move.id, 1);
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'RainDance', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'RainDance');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'RainDance', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// SunnyDay (Harsh Sun) — self-stat-drop moves drop one ADDITIONAL stage (§2); Fire and
	// Grass types are exempt (Fire's exemption is its §1.5 blanket effect). Frostbite (and
	// canon Freeze) cannot be inflicted while the sun is harsh. §2: weather no longer modifies
	// power — the canon Fire ×1.5 boost, Water ×0.5 suppression, and Hydro Steam boost are removed.
	sunnyday: {
		name: 'SunnyDay',
		effectType: 'Weather',
		duration: 5,
		durationCallback(source, effect) {
			if (source?.hasItem('heatrock')) return 8;
			return 5;
		},
		onImmunity(type, pokemon) {
			if (pokemon.effectiveWeather() !== 'sunnyday') return;
			if (type === 'frz' || type === 'frb') return false;
		},
		onChangeBoost(boost, target, source, effect) {
			if (target.effectiveWeather() !== 'sunnyday') return;
			if (target !== source) return; // self-stat-drops only
			if (!effect || effect.effectType !== 'Move') return;
			if (target.hasType('Fire') || target.hasType('Grass')) return;
			let stat: BoostID;
			for (stat in boost) {
				const v = boost[stat]!;
				if (v < 0) boost[stat] = v - 1;
			}
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'SunnyDay', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'SunnyDay');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'SunnyDay', '[upkeep]');
			this.eachEvent('Weather');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// ── New §2 weathers ───────────────────────────────────────────────────────────
	// Rainbow, Full Moon, New Moon, Fog, Clear Skies. None modify power/stats (§2).
	// Weather IDs are lowercase (rainbow/fullmoon/newmoon/fog/clearskies); the protocol
	// strings below ("Rainbow", "Full Moon", …) toID() to those IDs on the client, where
	// `weatherNameTable` supplies the display names.

	// Rainbow — multiplies all secondary-effect rates of DAMAGING moves by ×1.25. Status
	// moves' primary effects and accuracy are unaffected. Stacks multiplicatively with
	// Serene Grace (both run through onModifyMove; the product is order-independent).
	rainbow: {
		name: 'Rainbow',
		effectType: 'Weather',
		duration: 5,
		onModifyMovePriority: -2,
		onModifyMove(move) {
			if (move.category === 'Status') return;
			if (move.secondaries) {
				for (const secondary of move.secondaries) {
					if (secondary.chance) secondary.chance *= 1.25;
				}
			}
			if (move.self?.chance) move.self.chance *= 1.25;
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Rainbow', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Rainbow');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Rainbow', '[upkeep]');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// Full Moon — blocks moves with priority +1 or higher from being used. Same rule as canon
	// Psychic Terrain, with the grounded-only restriction lifted (applies to ALL Pokémon).
	// onTryHit only fires against foe-targeted moves, so protection/guard moves (target self or
	// allySide) and zero/negative-priority moves are naturally exempt.
	fullmoon: {
		name: 'Full Moon',
		effectType: 'Weather',
		duration: 5,
		onTryHitPriority: 4,
		onTryHit(target, source, effect) {
			if (effect && (effect.priority <= 0.1 || effect.target === 'self')) return;
			if (target.isSemiInvulnerable() || target.isAlly(source)) return;
			this.add('-activate', target, 'move: Full Moon');
			return null;
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Full Moon', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Full Moon');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Full Moon', '[upkeep]');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// New Moon — blocks all forms of HP healing (mirrors Heal Block's onTryHeal). Exempt:
	// Leftovers / Black Sludge (passive item healing), Regenerator (switch-out heal), and
	// Z-Power heals. Pain Split redistributes HP via sethp and never reaches TryHeal, so it is
	// inherently unaffected. Healing berries, drain heal portions, Strength Sap, recovery moves,
	// and ability heals (Volt Absorb, Rain Dish, etc.) are all blocked by the default return.
	newmoon: {
		name: 'New Moon',
		effectType: 'Weather',
		duration: 5,
		onTryHeal(damage, target, source, effect) {
			if (!effect) return;
			if (effect.id === 'leftovers' || effect.id === 'blacksludge') return;
			if (effect.id === 'regenerator') return;
			if (effect.id === 'zpower' || (effect as Move).isZ) return damage;
			return false;
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'New Moon', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'New Moon');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'New Moon', '[upkeep]');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// Fog — reduces the accuracy of all moves by ×0.8 (multiplicative; stacks with every other
	// accuracy modifier). Cloud Nine / Air Lock suppress this like any weather effect.
	fog: {
		name: 'Fog',
		effectType: 'Weather',
		duration: 5,
		onModifyAccuracyPriority: -1,
		onModifyAccuracy(accuracy) {
			if (typeof accuracy !== 'number') return;
			return this.chainModify(0.8);
		},
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				if (this.gen <= 5) this.effectState.duration = 0;
				this.add('-weather', 'Fog', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Fog');
			}
		},
		onFieldResidualOrder: 1,
		onFieldResidual() {
			this.add('-weather', 'Fog', '[upkeep]');
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},

	// Clear Skies — the neutral named field state. No mechanical effects, no turn limit (no
	// `duration`, so the residual decrement at sim/battle.ts never expires it). Persists until
	// another weather replaces it. Settable explicitly (e.g. a weather-clearing move); the
	// default empty-weather state is mechanically identical.
	clearskies: {
		name: 'Clear Skies',
		effectType: 'Weather',
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-weather', 'Clear Skies', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-weather', 'Clear Skies');
			}
		},
		onFieldEnd() {
			this.add('-weather', 'none');
		},
	},
};
