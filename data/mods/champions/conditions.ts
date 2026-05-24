// Domains — the champions-mod replacement for terrains.
// One domain is active at a time (backed by the terrain slot).
// Each affects all Pokémon on the field with no grounding requirement.
// Effects: +25% Atk/SpA/Def/SpD for same-type Pokémon; +10% accuracy for same-type moves.
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
			if (attacker.hasType('Normal')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Normal')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Normal')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Normal')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Fire')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fire')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fire')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fire')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Water')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Water')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Water')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Water')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Electric')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Electric')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Electric')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Electric')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Grass')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Grass')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Grass')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Grass')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Ice')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ice')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ice')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ice')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Fighting')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fighting')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fighting')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fighting')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Poison')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Poison')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Poison')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Poison')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Ground')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ground')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ground')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ground')) return this.chainModify([5120, 4096]);
		},
		onModifyAccuracy(accuracy, target, source, move) {
			if (typeof accuracy !== 'number') return;
			if (move.type === 'Ground') return this.chainModify(1.1);
		},
	},

	flyingdomain: {
		name: "Flying Domain",

		duration: 5,
		onFieldStart(field, source, effect) {
			if (effect?.effectType === 'Ability') {
				this.add('-fieldstart', 'move: Flying Domain', '[from] ability: ' + effect.name, `[of] ${source}`);
			} else {
				this.add('-fieldstart', 'move: Flying Domain');
			}
		},
		onFieldResidualOrder: 27,
		onFieldResidualSubOrder: 10,
		onFieldEnd() {
			this.add('-fieldend', 'move: Flying Domain');
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (attacker.hasType('Flying')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Flying')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Flying')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Flying')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Psychic')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Psychic')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Psychic')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Psychic')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Bug')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Bug')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Bug')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Bug')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Rock')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Rock')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Rock')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Rock')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Ghost')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Ghost')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Ghost')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Ghost')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Dragon')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Dragon')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Dragon')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Dragon')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Dark')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Dark')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Dark')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Dark')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Steel')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Steel')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Steel')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Steel')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Fairy')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Fairy')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Fairy')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Fairy')) return this.chainModify([5120, 4096]);
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
			if (attacker.hasType('Cosmic')) return this.chainModify([5120, 4096]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (attacker.hasType('Cosmic')) return this.chainModify([5120, 4096]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (target.hasType('Cosmic')) return this.chainModify([5120, 4096]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (target.hasType('Cosmic')) return this.chainModify([5120, 4096]);
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
};
