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

// Active-Domain stat boost (§3): a Pokémon gets ×1.2 to all five battle stats while standing in
// ANY active Domain matching one of its types. Applied ONCE even when a dual-type qualifies for
// two active Domains (×1.2, not ×1.44) — this single shared check replaces the per-Domain stat
// handlers that used to live in data/mods/champions/conditions.ts. Anti-Domain suppresses it.
const DOMAIN_TYPE_BY_ID: {[id: string]: string} = {
	normaldomain: 'Normal', firedomain: 'Fire', waterdomain: 'Water', electricdomain: 'Electric',
	grassdomain: 'Grass', icedomain: 'Ice', fightingdomain: 'Fighting', poisondomain: 'Poison',
	grounddomain: 'Ground', flyingdomain: 'Flying', psychicdomain: 'Psychic', bugdomain: 'Bug',
	rockdomain: 'Rock', ghostdomain: 'Ghost', dragondomain: 'Dragon', darkdomain: 'Dark',
	steeldomain: 'Steel', fairydomain: 'Fairy', cosmicdomain: 'Cosmic',
};
function pokemonInActiveDomain(battle: any, pokemon: any): boolean {
	if (battle.field.pseudoWeather['antidomain']) return false;
	for (const id in DOMAIN_TYPE_BY_ID) {
		if (battle.field.pseudoWeather[id] && pokemon.hasType(DOMAIN_TYPE_BY_ID[id])) return true;
	}
	return false;
}

// The "Trapped" category (§4): the family of trapping volatiles that bind a Pokémon in place
// and/or restrict its targeting. Ghost-types are immune to ALL of them (§1.5 / §4 line 269) —
// the onTryAddVolatile handler below blocks any of these from being applied to a Ghost, so
// individual trapping moves/abilities never need their own Ghost check. Add a new trapping
// volatile's id here and Ghost immunity is automatic.
//   • interlocked — shared two-Pokémon bind (Gooey, Tangling Vines)
//   • deathgrip   — relational variant of Interlocked (Wrap, Bind)
//   • locked      — one-sided trap, ends when inflictor leaves the field (not yet built)
//   • rooted      — one-sided trap, inflictor free to switch (not yet built)
//   • swallowed   — predatory size-check trap (not yet built)
// (Switch-prevention trapping — Arena Trap / Shadow Tag / Mean Look / canon binding moves — is
//  handled separately by the Ghost guard in pokemon.tryTrap; see champions/scripts.ts.)
const TRAPPED_VOLATILES = new Set(['interlocked', 'deathgrip', 'locked', 'rooted', 'swallowed']);

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
		// Type Order STAB (§6 of master reference) + Tera Crystal STAB (§11), as a single
		// additive model: final = 1.0 (neutral) + original-typing bonus + Tera bonus.
		//   Original-typing bonus (read from attacker.types, the PRE-Tera typing):
		//     Pure (single type): +0.6 (→1.6) | Primary (types[0]): +0.5 (→1.5) | Secondary: +0.4 (→1.4)
		//   Tera bonus (§11): +0.5 when the move's type matches the chosen Tera type
		//     (attacker.terastallized). Stacks additively with the original-typing bonus, so a
		//     dual-type that Teras into one of its types keeps Primary/Secondary (NOT Pure) and
		//     adds +0.5 — you can never GAIN the Pure bonus via Tera. Original-type STAB is
		//     preserved (e.g. Fire/Water Tera Fire still gets 1.4 on Water moves).
		//   Doc table: Pure Fire→Tera Fire 2.1 | Fire/Dragon→Tera Fire 2.0 | Dragon/Fire→Tera Fire 1.9 | Water→Tera Fire 1.5.
		// This handler runs even in the Tera case (canon runs ModifySTAB unconditionally and our
		// return value wins), so it is the single source of truth for STAB in this format.
		// Tera does NOT mutate attacker.types — getTypes() applies the mono-type override only
		// for defense, so reading attacker.types here always gives the original offensive typing.
		// Adaptability/Specialist keep their ability bonuses; the Tera +0.5 stacks additively.
		onModifyMove(move) {
			if (move.flags['piercing']) move.ignorePositiveDefensive = true;
		},
		onModifySTAB(stab, attacker, defender, move) {
			if (stab <= 1) return stab; // engine: move matches neither an original type nor the Tera type → no STAB
			const types = attacker.types; // ORIGINAL typing (pre-Tera)
			const tera = attacker.terastallized; // chosen Tera type, or undefined
			const teraBonus = (tera && move.type === tera) ? 0.5 : 0;
			// Adaptability keeps its canon multiplier; the Tera bonus stacks on top.
			if (attacker.hasAbility('adaptability')) return stab + teraBonus;
			let bonus = 0; // §6 original-typing bonus, relative to 1.0
			if (types.includes(move.type)) {
				if (types.length === 1) bonus = 0.6; // pure
				else if (types[0] === move.type) bonus = 0.5; // primary
				else bonus = 0.4; // secondary
				if (attacker.hasAbility('specialist')) bonus += 0.75; // Specialist additive
			}
			const result = 1 + bonus + teraBonus;
			return result > 1 ? result : stab;
		},
		// Active-Domain stat boost (§3): ×1.2 to all five battle stats for a Pokémon standing in
		// any active Domain of one of its types — applied once (no dual-type ×1.44 stacking), and
		// suppressed by Anti-Domain. Priorities mirror the per-Domain handlers this replaced
		// (Atk/SpA/Spe at 5, Def/SpD at 6) so the boost lands after stat-stage calculation.
		onModifyAtkPriority: 5,
		onModifyAtk(atk, attacker) {
			if (pokemonInActiveDomain(this, attacker)) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa, attacker) {
			if (pokemonInActiveDomain(this, attacker)) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def, target) {
			if (pokemonInActiveDomain(this, target)) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd, target) {
			if (pokemonInActiveDomain(this, target)) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe, pokemon) {
			if (pokemonInActiveDomain(this, pokemon)) return this.chainModify([6144, 5120]);
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
		// Mark faint logic (§4): removal conditions and transfer on Hunter/self-KO.
		onFaint(pokemon, source, effect) {
			// Case 1: the fainted Pokémon IS a Hunter — clear its Mark from the Marked Pokémon.
			for (const side of this.sides) {
				for (const p of side.pokemon) {
					if ((p as any).markedHunter === pokemon) {
						delete (p as any).markedHunter;
						if (p.volatiles['marked']) p.removeVolatile('marked');
					}
				}
			}
			// Case 2: the fainted Pokémon IS Marked.
			const hunter = (pokemon as any).markedHunter;
			if (!hunter) return;
			delete (pokemon as any).markedHunter;
			// Determine transfer vs. removal.
			// Transfer: killed by the Hunter OR self-KO (Explosion, Final Gambit, etc.)
			const killedByHunter = source === hunter;
			const selfKO = source === pokemon;
			if (killedByHunter || selfKO) {
				const teammates = pokemon.side.pokemon.filter(p => p !== pokemon && !p.fainted);
				if (teammates.length > 0) {
					const newTarget = this.sample(teammates);
					(newTarget as any).markedHunter = hunter;
					if (newTarget.isActive) newTarget.addVolatile('marked', hunter);
					// If benched, onSwitchIn will re-add the volatile on entry.
				}
			}
			// Third-party KO: mark ends entirely, no transfer.
		},
		// Marked accuracy-lowering-on-Hunter removal (§4).
		onAfterBoost(boost, target, source, effect) {
			if (!(boost.accuracy && boost.accuracy < 0)) return;
			if (!source || source === target) return;
			const hunter = (source as any).markedHunter;
			if (!hunter || target !== hunter) return;
			delete (source as any).markedHunter;
			if (source.volatiles['marked']) source.removeVolatile('marked');
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
			// Ghost types are immune to the entire "Trapped" category (§1.5 / §4 line 269):
			// Interlocked, Death Grip, Locked, Rooted, Swallowed. Centralized here so individual
			// trapping moves/abilities never need their own Ghost check.
			if (TRAPPED_VOLATILES.has(status.id) && pokemon.hasType('Ghost')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Ghost', '[msg]Trap Immunity');
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
