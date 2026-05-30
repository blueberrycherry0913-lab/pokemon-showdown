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
		// Normal blanket effects (§1.5), applied as flat end-of-calc damage multipliers:
		//  - Inverse-STAB: a Normal-type attacker deals ×1.1 on NON-STAB moves (move type is
		//    not one of its types). Mutually exclusive with STAB — STAB moves are handled by
		//    onModifySTAB above, so the !hasType(move.type) guard prevents any double-dip.
		//  - Soft Resistance: a Normal-type defender takes ×0.9 from every move except Fighting
		//    and Ghost, regardless of type effectiveness.
		// Both accumulate into the ModifyDamage event modifier (chainModify, no return), so when
		// a Normal attacks a Normal with a non-STAB non-Fighting/Ghost move both apply (×0.99).
		onModifyDamage(damage, source, target, move) {
			if (source.hasType('Normal') && !source.hasType(move.type) && !move.forceSTAB) {
				this.chainModify(1.1); // Inverse-STAB
			}
			if (target.hasType('Normal') && move.type !== 'Fighting' && move.type !== 'Ghost') {
				this.chainModify(0.9); // Soft Resistance
			}
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
		// Fighting types are immune to flinching. Mirrors Inner Focus's canon pattern
		// (return null blocks the volatile). (Dark's Taunt/Torment immunity is handled by
		// the broader Dark-type-status-move immunity in onTryHit below.)
		onTryAddVolatile(status, pokemon) {
			if (status.id === 'flinch' && pokemon.hasType('Fighting')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Fighting', '[msg]Flinch Immunity');
				return null;
			}
		},
		// Two §1.5 hit-time effects:
		//  - Dark types are immune to ALL Dark-type status moves used against them (Taunt,
		//    Torment, Fake Tears, Parting Shot, Topsy-Turvy, etc.). The canon Prankster-Dark
		//    immunity (any-type Prankster-boosted status move) is separate and stays canon.
		//  - Flying types gain +1 Speed stage when hit by a Wind-flagged move. NO immunity is
		//    granted — the wind move still deals full damage (we do not return null for it).
		onTryHit(target, source, move) {
			if (target === source) return;
			if (move.flags?.['wind'] && target.hasType('Flying')) {
				this.add('-activate', target, 'typeEffect', '[type]Flying', '[msg]Wind Speed Boost');
				this.boost({ spe: 1 }, target, target);
				// fall through — wind move proceeds at full effect (no immunity)
			}
			if (move.category === 'Status' && move.type === 'Dark' && target.hasType('Dark')) {
				this.add('-activate', target, 'typeEffect', '[type]Dark', '[msg]Dark Move Immunity');
				this.add('-immune', target);
				return null;
			}
		},
		// Flying types gain +1 Speed stage whenever Tailwind is set by EITHER side of the
		// field (§1.5), including their own. SideConditionStart fires globally from
		// Side.addSideCondition (sim/side.ts). The own-side Tailwind ×2 speed is still
		// applied by the canon tailwind condition and stacks with this stage boost.
		onSideConditionStart(targetSide, source, sideCondition) {
			if (sideCondition.id !== 'tailwind') return;
			for (const pokemon of this.getAllActive()) {
				if (pokemon.hasType('Flying')) this.boost({ spe: 1 }, pokemon, pokemon);
			}
		},
		// Steel types cannot be phazed (§1.5): immune to forced-switch effects (Roar,
		// Whirlwind, Dragon Tail, Circle Throw, etc.). DragOut fires for both the
		// forceSwitch action and damaging forceSwitch moves.
		onDragOut(pokemon) {
			if (pokemon.hasType('Steel')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Steel', '[msg]Phazing Immunity');
				this.add('-fail', pokemon);
				return false;
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
				this.add('-activate', pokemon, 'typeEffect', '[type]Water', '[msg]Status Purge');
				pokemon.cureStatus();
			}
		},
	},
];
