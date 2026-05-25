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
			// 1/16 per turn (halved from canon's 1/8)
			this.damage(pokemon.baseMaxhp / 16);
		},
		// -33% SpDef while Poisoned. Fires at -101 priority so it applies after all other
		// modifiers (domain boosts, stat stages, etc.) have already been chained in.
		onModifySpDPriority: -101,
		onModifySpD(spd) {
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
			this.damage(this.clampIntRange(pokemon.baseMaxhp / 16, 1) * this.effectState.stage);
		},
		// -50% SpDef while Toxicked. Same late-priority pattern as psn.
		onModifySpDPriority: -101,
		onModifySpD(spd) {
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
			// Sleep Talk and Snore can still be used while asleep — don't count those turns
			if (move.id === 'sleeptalk' || move.id === 'snore') return;
			if (pokemon.status !== 'slp' || !pokemon.hp) return;
			pokemon.statusState.sleepTurns++;
			if (pokemon.statusState.sleepTurns > 2) {
				// Third turn: Pokémon wakes up and can move this turn
				pokemon.cureStatus();
				return;
			}
			this.add('cant', pokemon, 'slp');
			return false;
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			if (!pokemon.hp || pokemon.status !== 'slp') return;
			// Heal-tax: sleeping restores 1/10 max HP per end-of-turn
			this.heal(Math.floor(pokemon.baseMaxhp / 10), pokemon, pokemon);
		},
		// Takes 10% more damage from all attacks while asleep.
		// onSourceModifyDamage fires on the DEFENDER's conditions; source = attacker, target = sleeping Pokémon.
		onSourceModifyDamage(damage, source, target, move) {
			return this.chainModify(1.1);
		},
		// Active wake-up: a single hit dealing ≥50% of the sleeper's max HP wakes it immediately.
		onDamagingHit(damage, target, source, move) {
			if (target.status !== 'slp') return;
			if (damage >= target.baseMaxhp / 2) {
				target.cureStatus();
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
			// Phase 1 lockout: Pokémon loses its first action
			if (pokemon.statusState.frozenPhase === 1 && pokemon.statusState.lockoutPending) {
				pokemon.statusState.lockoutPending = false;
				this.add('cant', pokemon, 'frz');
				return false;
			}
		},
		onResidualOrder: 9,
		onResidual(pokemon) {
			if (!pokemon.hp || pokemon.status !== 'frz') return;
			// 1/8 chip damage in both phases
			this.damage(Math.floor(pokemon.baseMaxhp / 8));
			if (pokemon.statusState.frozenPhase === 1) {
				// End of Phase 1 turn — transition to Phase 2 (sustained Frozen)
				pokemon.statusState.frozenPhase = 2;
				pokemon.statusState.lockoutPending = false; // discard any unserved lockout
			}
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
			this.effectState.confusionTurns = 0;
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
			this.effectState.confusionTurns++;
			if (this.effectState.confusionTurns > 2) {
				// 2 turns served — confusion clears, Pokémon acts freely this turn
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
			// Set the guard flag BEFORE useMove so the recursive onBeforeMove call skips
			this.effectState.redirecting = true;
			this.actions.useMove(randomMoveId, pokemon);
			return false; // suppress the originally-chosen move
		},
	},
};
