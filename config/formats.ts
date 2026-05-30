// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts
/*
If you want to add custom formats, create a file in this folder named: "custom-formats.ts"

Paste the following code into the file and add your desired formats and their sections between the brackets:
--------------------------------------------------------------------------------
// Note: This is the list of formats
// The rules that formats use are stored in data/rulesets.ts

export const Formats: FormatList = [
];
--------------------------------------------------------------------------------

If you specify a section that already exists, your format will be added to the bottom of that section.
New sections will be added to the bottom of the specified column.
The column value will be ignored for repeat sections.
*/

export const Formats: import('../sim/dex-formats').FormatList = [

	// Custom
	///////////////////////////////////////////////////////////////////

	{
		section: "Custom",
		column: 1,
	},
	{
		name: "[Gen 9] Testing Standard",
		desc: `Custom fan-game rework playtesting format. Inherits Nat Dex AG roster and clauses; Pok&eacute;mon Champions SP system + Level 50 lock + 0-IV baseline applied via mod=champions.`,
		mod: 'champions',
		ruleset: [
			'Standard NatDex',
			// Keep 'Obtainable Moves' on (the default via Standard NatDex) so Pokemon
			// can only use moves in their NatDex AG learnset. Custom moves the user
			// adds via data/learnsets.ts will pass; canon moves not in a species's
			// learnset (e.g. Venusaur with Light That Burns the Sky) will be rejected.
			// We do still lift Abilities and Formes since the user has custom abilities
			// (e.g. Burning Soul on Charizard) and custom formes that wouldn't pass the
			// canon checks otherwise.
			'!Obtainable Abilities',
			'!Obtainable Formes',
			// All IVs forced to 0 silently; champions/scripts.ts:statModify switches to
			// 0-IV baseline constants when this clause is in the rule table.
			'Force IV 0',
			// TEMPORARY: only Gen 1 lineage Pokémon (Bulbasaur-Mew family + their
			// forward/backward evolutions + Mega/Primal/Ultra/G-Max formes) are legal.
			// Drop this line to restore the full roster.
			'Gen 1 Only',
			// Enforce that set.ability must be one of the species's own ability slots.
			// '!Obtainable Abilities' above lifts the core learnset-based check (needed
			// for custom abilities/formes), so we gate species-level legality here.
			'Species Abilities',
			// Reject sets where the chosen basic ability matches the awakened (hidden)
			// ability — no strategic choice if both slots are the same.
			'No Dup Abilities',
		],
		banlist: [
			// With all IVs at 0, Hidden Power is always Fighting-type at low BP — uglier
			// than just disabling it. Can revisit if a custom Hidden Power replacement
			// gets added to the rework.
			'Hidden Power',
		],
		restricted: [],
		// Type Order STAB (§6 of master reference):
		//   Pure type (single type): ×1.6
		//   Primary type (types[0]):  ×1.5
		//   Secondary type (types[1]): ×1.4
		// Adaptability and Specialist bypass the standard table (their ability handlers
		// fire first; we detect them here to avoid clobbering their values).
		// Specialist adds +0.75 additively to the type-order base.
		onModifySTAB(stab, attacker, defender, move) {
			if (stab <= 1) return stab; // move has no STAB (includes Specialist's 0.75x penalty)
			if (attacker.hasAbility('adaptability')) return stab; // preserve Adaptability
			const types = attacker.types;
			if (!types.includes(move.type)) return stab; // forceSTAB edge case
			if (attacker.hasAbility('specialist')) {
				// Additive +0.75 on top of type-order base
				if (types.length === 1) return 2.35; // 1.6 + 0.75
				if (types[0] === move.type) return 2.25; // 1.5 + 0.75
				return 2.15; // 1.4 + 0.75
			}
			if (types.length === 1) return 1.6; // pure type
			if (types[0] === move.type) return 1.5; // primary
			return 1.4; // secondary
		},
		// Marked persistence (§4): the marked volatile is re-added when the Marked Pokémon
		// switches back in, because Pokemon objects persist for the whole battle but volatiles
		// are cleared on switch-out. markedHunter is set in the marked condition's onStart.
		onSwitchIn(pokemon) {
			const hunter = (pokemon as any).markedHunter;
			if (hunter && !pokemon.volatiles['marked']) {
				pokemon.addVolatile('marked', hunter);
			}
		},
		// Mark is only cleared when the Marked Pokémon faints (§4).
		onFaint(pokemon) {
			if ((pokemon as any).markedHunter) {
				delete (pokemon as any).markedHunter;
				// volatile will already have been removed when the pokemon fainted,
				// but guard in case the order differs.
				if (pokemon.volatiles['marked']) pokemon.removeVolatile('marked');
			}
		},
		// ── Blanket type effects (§1.5) ──────────────────────────────────────────
		// Fighting types are immune to flinching; Dark types are immune to Taunt and
		// Torment. Mirrors Inner Focus's canon pattern (return null blocks the volatile).
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'flinch' && pokemon.hasType('Fighting')) return null;
			if ((status.id === 'taunt' || status.id === 'torment') && pokemon.hasType('Dark')) return null;
		},
		// Steel types cannot be phazed (§1.5): immune to forced-switch effects (Roar,
		// Whirlwind, Dragon Tail, Circle Throw, etc.). DragOut fires for both the
		// forceSwitch action and damaging forceSwitch moves.
		onDragOut(pokemon) {
			if (pokemon.hasType('Steel')) {
				this.add('-fail', pokemon);
				return false;
			}
		},
		// Flying types benefit from enemy-set Tailwind (§1.5), in addition to ally-set
		// Tailwind. The own-side Tailwind ×2 is handled by the canon tailwind condition;
		// this adds the foe-side Tailwind ×2 (they stack).
		onModifySpe(spe, pokemon) {
			if (pokemon.hasType('Flying') && pokemon.side.foe.sideConditions['tailwind']) {
				return this.chainModify(2);
			}
		},
		// Water types purge all non-volatile status at the end of the second turn after
		// infliction (§1.5): the status chips on turns 1 and 2, then clears. The counter
		// lives on statusState, which is recreated on every (re-)infliction, so Toxic's
		// escalating clock resets on purge automatically. High onResidualOrder so the
		// second chip lands before the cure. This format-level onResidual fires once per
		// active Pokémon (findBattleEventHandlers is called per-active in fieldEvent), so we
		// operate on the single pokemon arg — looping getAllActive here would multi-count.
		onResidualOrder: 100,
		onResidual(pokemon) {
			if (!pokemon.status || !pokemon.hasType('Water')) return;
			pokemon.statusState.waterPurge = (pokemon.statusState.waterPurge || 0) + 1;
			if (pokemon.statusState.waterPurge >= 2) {
				pokemon.cureStatus();
			}
		},
	},
];
