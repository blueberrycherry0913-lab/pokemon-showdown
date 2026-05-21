// Domains — the champions-mod replacement for terrains.
// One domain is active at a time (backed by the terrain slot).
// Each affects all Pokémon on the field with no grounding requirement.
// Effects are intentionally empty here; they will be filled in per-domain
// when the design spec is finalised.
export const Conditions: import('../../../sim/dex-conditions').ConditionDataTable = {
	normaldomain: {
		name: "Normal Domain",
		effectType: 'Terrain',
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
	},

	firedomain: {
		name: "Fire Domain",
		effectType: 'Terrain',
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
	},

	waterdomain: {
		name: "Water Domain",
		effectType: 'Terrain',
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
	},

	electricdomain: {
		name: "Electric Domain",
		effectType: 'Terrain',
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
	},

	grassdomain: {
		name: "Grass Domain",
		effectType: 'Terrain',
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
	},

	icedomain: {
		name: "Ice Domain",
		effectType: 'Terrain',
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
	},

	fightingdomain: {
		name: "Fighting Domain",
		effectType: 'Terrain',
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
	},

	poisondomain: {
		name: "Poison Domain",
		effectType: 'Terrain',
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
	},

	grounddomain: {
		name: "Ground Domain",
		effectType: 'Terrain',
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
	},

	flyingdomain: {
		name: "Flying Domain",
		effectType: 'Terrain',
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
	},

	psychicdomain: {
		name: "Psychic Domain",
		effectType: 'Terrain',
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
	},

	bugdomain: {
		name: "Bug Domain",
		effectType: 'Terrain',
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
	},

	rockdomain: {
		name: "Rock Domain",
		effectType: 'Terrain',
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
	},

	ghostdomain: {
		name: "Ghost Domain",
		effectType: 'Terrain',
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
	},

	dragondomain: {
		name: "Dragon Domain",
		effectType: 'Terrain',
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
	},

	darkdomain: {
		name: "Dark Domain",
		effectType: 'Terrain',
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
	},

	steeldomain: {
		name: "Steel Domain",
		effectType: 'Terrain',
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
	},

	fairydomain: {
		name: "Fairy Domain",
		effectType: 'Terrain',
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
	},

	cosmicdomain: {
		name: "Cosmic Domain",
		effectType: 'Terrain',
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
	},
};
