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
// Domain Setter abilities (§ domain-setter restructuring): maps each domain-setter ability ID
// to the type it requires the Pokémon to have.  Used by onValidateTeam (one-per-team) and
// onValidateSet (type-match check).
const DOMAIN_SETTER_BY_TYPE: {[id: string]: string} = {
	domainsetternormal: 'Normal', domainsetterfire: 'Fire', domainsetterwater: 'Water',
	domainsetterelectric: 'Electric', domainsettergrass: 'Grass', domainsetterice: 'Ice',
	domainsetterfighting: 'Fighting', domainsetterpoison: 'Poison', domainsetterground: 'Ground',
	domainsetterair: 'Flying', domainsetterpsychic: 'Psychic', domainsetterbug: 'Bug',
	domainsetterrock: 'Rock', domainsetterghost: 'Ghost', domainsetterdragon: 'Dragon',
	domainsetterdark: 'Dark', domainsettersteel: 'Steel', domainsetterfairy: 'Fairy',
	domainsettercosmic: 'Cosmic',
};
const DOMAIN_SETTER_IDS = new Set(Object.keys(DOMAIN_SETTER_BY_TYPE));
// Domain moves: maps move ID → the type it requires ≥3 team members of (for min-duration rule).
const DOMAIN_MOVE_TYPE: {[id: string]: string} = {
	domainnormal: 'Normal', domainfire: 'Fire', domainwater: 'Water',
	domainelectric: 'Electric', domaingrass: 'Grass', domainice: 'Ice',
	domainfighting: 'Fighting', domainpoison: 'Poison', domainground: 'Ground',
	domainair: 'Flying', domainpsychic: 'Psychic', domainbug: 'Bug',
	domainrock: 'Rock', domainghost: 'Ghost', domaindragon: 'Dragon',
	domaindark: 'Dark', domainsteel: 'Steel', domainfairy: 'Fairy',
	domaincosmic: 'Cosmic',
};
const DOMAIN_MIN_TEAM_SIZE = 3;

// Gen 1 legendary/mythical Pokémon banned in Testing Standard (not in Mythics and Megas).
const GEN1_LEGENDARIES = new Set(['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew']);

// Playtest-only species banned from all battle formats.
const PLAYTEST_SPECIES_BANS: string[] = [
	'TESTER', 'Falcuatro',
];

// Playtest-only moves (name contains "TEST") banned from all battle formats.
const PLAYTEST_MOVE_BANS: string[] = [
	'MindControlled TEST', 'Corrosion (TEST)', 'Mark (TEST)', 'Frostbite (TEST)',
	'Freeze (TEST)', 'Charmed (TEST)', 'Stunned (TEST)', 'Interlocked (TEST)',
	'Death Grip (TEST)', 'Rainbow (TEST)', 'Full Moon (TEST)', 'New Moon (TEST)',
	'Fog (TEST)',
];

// Species banned in both formats — regional forward-evolutions of non-Gen-1 lines or Galar
// fossil chimeras that slip through the Gen 1 Only clause due to having no Gen 1 lineage anchor.
const SHARED_EXPLICIT_BANS: string[] = [
	// Galar fossil chimeras (no pre-evolution; Gen 1 Only has nothing to anchor on)
	'Arctovish', 'Arctozolt', 'Dracovish', 'Dracozolt',
	// Gen 5 lineage: Basculin → Basculegion (Hisui)
	'Basculegion', 'Basculegion-F',
	// Gen 2 lineage forward-evos (Hisui/Paldea)
	'Cursola', 'Overqwil', 'Sneasler', 'Ursaluna', 'Ursaluna-Bloodmoon', 'Wyrdeer',
	// Gen 3 lineage forward-evo (Galarian)
	'Obstagoon',
];

// Gen 8 legendary/mythical Pokémon banned only in Testing Standard (legal in Mythics and Megas).
const GEN8_LEGENDARY_BANS: string[] = [
	'Urshifu', 'Urshifu-Rapid-Strike',
	'Zacian', 'Zacian-Crowned',
	'Zamazenta', 'Zamazenta-Crowned',
	'Zarude', 'Zarude-Dada',
	'Spectrier', 'Regidrago', 'Regieleki', 'Eternatus',
	'Enamorus', 'Enamorus-Therian',
	'Calyrex', 'Calyrex-Ice', 'Calyrex-Shadow',
];

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

// Domain Setter awakened-ability validation shared by both custom formats.
function validateDomainSetter(this: any, set: any): string[] | void {
	const ability2 = (set as any).ability2 as string | undefined;
	if (!ability2) return;
	const id = this.toID(ability2);
	if (!DOMAIN_SETTER_IDS.has(id)) {
		return [`${set.name || set.species}'s Awakened ability "${ability2}" is not a valid Domain Setter ability.`];
	}
	const requiredType = DOMAIN_SETTER_BY_TYPE[id];
	const species = this.dex.species.get(set.species);
	if (!species.types.includes(requiredType as any)) {
		return [`${set.name || set.species} cannot use ${ability2} (type mismatch: needs ${requiredType}).`];
	}
}

// Team-level Domain minimum-size validation shared by both custom formats.
// Domain Setter abilities and Domain moves require ≥3 team members of the matching type
// (so the minimum duration is 3 turns rather than 1).
function validateDomainTeamSize(this: any, team: any[]): string[] | void {
	const problems: string[] = [];

	// Helper: count team members that have a given type.
	const countType = (type: string) =>
		team.filter((s: any) => this.dex.species.get(s.species).types.includes(type)).length;

	// Domain Setter awakened ability check.
	for (const set of team) {
		const ability2 = (set as any).ability2 as string | undefined;
		if (!ability2) continue;
		const id = this.toID(ability2);
		if (!DOMAIN_SETTER_IDS.has(id)) continue;
		const requiredType = DOMAIN_SETTER_BY_TYPE[id];
		if (countType(requiredType) < DOMAIN_MIN_TEAM_SIZE) {
			problems.push(
				`${set.name || set.species} has a ${requiredType} Domain Setter ability, but the team only has ` +
				`${countType(requiredType)} ${requiredType}-type Pokémon. A Domain Setter requires at least ` +
				`${DOMAIN_MIN_TEAM_SIZE} team members of that type (minimum duration = ${DOMAIN_MIN_TEAM_SIZE} turns).`
			);
		}
	}

	// Domain move check.
	for (const set of team) {
		for (const move of set.moves) {
			const id = this.toID(move);
			if (!DOMAIN_MOVE_TYPE[id]) continue;
			const requiredType = DOMAIN_MOVE_TYPE[id];
			if (countType(requiredType) < DOMAIN_MIN_TEAM_SIZE) {
				problems.push(
					`${set.name || set.species} has ${move}, but the team only has ` +
					`${countType(requiredType)} ${requiredType}-type Pokémon. Domain moves require at least ` +
					`${DOMAIN_MIN_TEAM_SIZE} team members of that type (minimum duration = ${DOMAIN_MIN_TEAM_SIZE} turns).`
				);
			}
		}
	}

	return problems.length ? problems : undefined;
}

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
			// Abilities and Formes lifted for custom abilities/formes.
			// Moves lifted temporarily — all moves pass regardless of learnset.
			'!Obtainable Abilities',
			'!Obtainable Formes',
			'!Obtainable Moves',
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
			// Lift the Evasion Clause (inherited from Standard NatDex). It bans evasion
			// abilities (Sand Veil/Snow Cloak), items, and moves — but reworked abilities
			// must be testable. Negating the umbrella cascades to its three child clauses
			// (Evasion Abilities/Items/Moves), so this one line removes all of them.
			'!Evasion Clause',
		],
		banlist: [
			// With all IVs at 0, Hidden Power is always Fighting-type at low BP.
			'Hidden Power',
			// Fossil chimeras + non-Gen-1 regional forward-evos that slip Gen 1 Only.
			...SHARED_EXPLICIT_BANS,
			// Gen 8 legendaries/mythicals (legal in Mythics and Megas).
			...GEN8_LEGENDARY_BANS,
			// Playtest-only species and moves.
			...PLAYTEST_SPECIES_BANS,
			...PLAYTEST_MOVE_BANS,
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
			// Flying types benefit from the opposing side's Tailwind (§1.5)
			if (pokemon.hasType('Flying') && pokemon.side.foe.sideConditions['tailwind']) {
				return this.chainModify([3, 2]);
			}
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
		// Trained Assassin (§4): at the very start of the battle — before any switch-in —
		// every Pokémon carrying Trained Assassin (in its basic OR awakened slot) marks one
		// random target chosen from the OPPOSING team (active or benched). The holder's own
		// side — including the holder itself — is never eligible. Because this is a roster scan
		// (not the ability's own onStart), it fires even when the holder is on the bench on
		// turn 1. Nobody is active yet at this point, so we only set markedHunter; the
		// onSwitchIn handler below adds the marked volatile (and its reveal) when the chosen
		// target actually enters the field.
		onBattleStart() {
			for (const side of this.sides) {
				for (const source of side.pokemon) {
					if (source.ability !== 'trainedassassin' && source.ability2 !== 'trainedassassin') continue;
					const candidates = source.side.foe.pokemon.filter(
						p => !p.fainted && !(p as any).markedHunter && !p.volatiles['marked']
					);
					if (!candidates.length) continue;
					const target = this.sample(candidates);
					(target as any).markedHunter = source;
					this.add('-message', `${source.name}'s Trained Assassin has Marked ${target.name}!`);
				}
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
			// Regenerator accumulating heal (§ abilities): fires here rather than in
			// the ability's own onSwitchIn so it works for Trace/Imposter users whose
			// ability reverts to Trace/Imposter by the time they re-enter.
			if (pokemon.m.regenTurnOut !== undefined) {
				const turns = Math.min(3, this.turn - pokemon.m.regenTurnOut);
				if (turns > 0) {
					this.heal(Math.floor(pokemon.baseMaxhp * 0.10 * turns), pokemon, pokemon);
				}
				delete pokemon.m.regenTurnOut;
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
					this.add('-message', `${hunter.name}'s Mark has transferred to ${newTarget.name}!`);
				} else {
					this.add('-message', `${hunter.name}'s Mark fades — no targets remain.`);
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
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Fighting'}));
				return null;
			}
			// Ghost types are immune to the entire "Trapped" category (§1.5 / §4 line 269):
			// Interlocked, Death Grip, Locked, Rooted, Swallowed. Centralized here so individual
			// trapping moves/abilities never need their own Ghost check.
			if (TRAPPED_VOLATILES.has(status.id) && pokemon.hasType('Ghost')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Ghost', '[msg]Trap Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Ghost'}));
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
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: target.species.name, ipl: target.side.id, ty: 'Flying'}));
				this.boost({ spe: 1 }, target, target);
				// fall through — wind move proceeds at full effect (no immunity)
			}
			if (move.category === 'Status' && move.type === 'Dark' && target.hasType('Dark')) {
				this.add('-activate', target, 'typeEffect', '[type]Dark', '[msg]Dark Move Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: target.species.name, ipl: target.side.id, ty: 'Dark'}));
				this.add('-immune', target);
				return null;
			}
		},
		// Steel types cannot be phazed (§1.5): immune to forced-switch effects (Roar,
		// Whirlwind, Dragon Tail, Circle Throw, etc.). DragOut fires for both the
		// forceSwitch action and damaging forceSwitch moves.
		onDragOut(pokemon) {
			if (pokemon.hasType('Steel')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Steel', '[msg]Phazing Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Steel'}));
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
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Water'}));
				pokemon.cureStatus();
			}
		},
		// Testing Standard bans Mega Evolutions, Mega Stones, and Gen 1 legendaries.
		// Domain Setter awakened-ability validation is also applied (shared with Mythics and Megas).
		onValidateSet(set) {
			const problems: string[] = [];
			const species = this.dex.species.get(set.species);
			// Ban Mega forms (any species whose forme contains "mega", case-insensitive).
			if (species.forme && /mega/i.test(species.forme)) {
				problems.push(`${species.name} is a Mega Evolution and is banned from Testing Standard.`);
			}
			// Ban Gen 1 legendaries/mythicals (check both the species and its base species so
			// formes like Mewtwo-Mega-X are caught by the forme check above AND the legendary check).
			const baseId = this.dex.species.get(species.baseSpecies).id;
			if (GEN1_LEGENDARIES.has(species.id) || GEN1_LEGENDARIES.has(baseId)) {
				problems.push(`${species.name} is a legendary Pokémon and is banned from Testing Standard.`);
			}
			// Ban Mega Stones.
			if (set.item) {
				const item = this.dex.items.get(set.item);
				if (item.megaStone) {
					problems.push(`${item.name} is a Mega Stone and is banned from Testing Standard.`);
				}
			}
			// Domain Setter awakened-ability validation (shared).
			const domainProblems = validateDomainSetter.call(this, set);
			if (domainProblems) problems.push(...domainProblems);
			return problems.length ? problems : undefined;
		},
		onValidateTeam(team) {
			const problems: string[] = [];
			const count = team.filter((set: any) => DOMAIN_SETTER_IDS.has(this.toID(set.ability2))).length;
			if (count > 1) {
				problems.push('Only one Pokémon per team may have a Domain Setter as their Awakened ability.');
			}
			const sizeProblems = validateDomainTeamSize.call(this, team);
			if (sizeProblems) problems.push(...sizeProblems);
			return problems.length ? problems : undefined;
		},
	},
	{
		name: "[Gen 9] Mythics and Megas",
		desc: `Custom fan-game rework — same as Testing Standard but Mega Evolutions, Mega Stones, and legendary/mythical Pok&eacute;mon are legal.`,
		mod: 'champions',
		ruleset: [
			'Standard NatDex',
			'!Obtainable Abilities',
			'!Obtainable Formes',
			'!Obtainable Moves',
			'Force IV 0',
			'Gen 1 Only',
			'Species Abilities',
			'No Dup Abilities',
		],
		banlist: [
			'Hidden Power',
			// Fossil chimeras + non-Gen-1 regional forward-evos that slip Gen 1 Only.
			...SHARED_EXPLICIT_BANS,
			// Playtest-only species and moves.
			...PLAYTEST_SPECIES_BANS,
			...PLAYTEST_MOVE_BANS,
		],
		restricted: [],
		// All battle handlers (STAB, domain stat boost, blanket type effects, etc.) are
		// identical to Testing Standard. The only difference is the onValidateSet ban list:
		// Mythics and Megas skips the Mega/legendary/Mega-Stone bans.
		onModifyMove(move: any) {
			if (move.flags['piercing']) move.ignorePositiveDefensive = true;
		},
		onModifySTAB(stab: number, attacker: any, defender: any, move: any) {
			if (stab <= 1) return stab;
			const types = attacker.types;
			const tera = attacker.terastallized;
			const teraBonus = (tera && move.type === tera) ? 0.5 : 0;
			if (attacker.hasAbility('adaptability')) return stab + teraBonus;
			let bonus = 0;
			if (types.includes(move.type)) {
				if (types.length === 1) bonus = 0.6;
				else if (types[0] === move.type) bonus = 0.5;
				else bonus = 0.4;
				if (attacker.hasAbility('specialist')) bonus += 0.75;
			}
			const result = 1 + bonus + teraBonus;
			return result > 1 ? result : stab;
		},
		onModifyAtkPriority: 5,
		onModifyAtk(atk: number, attacker: any) {
			if (pokemonInActiveDomain(this, attacker)) return this.chainModify([6144, 5120]);
		},
		onModifySpAPriority: 5,
		onModifySpA(spa: number, attacker: any) {
			if (pokemonInActiveDomain(this, attacker)) return this.chainModify([6144, 5120]);
		},
		onModifyDefPriority: 6,
		onModifyDef(def: number, target: any) {
			if (pokemonInActiveDomain(this, target)) return this.chainModify([6144, 5120]);
		},
		onModifySpDPriority: 6,
		onModifySpD(spd: number, target: any) {
			if (pokemonInActiveDomain(this, target)) return this.chainModify([6144, 5120]);
		},
		onModifySpePriority: 5,
		onModifySpe(spe: number, pokemon: any) {
			if (pokemonInActiveDomain(this, pokemon)) return this.chainModify([6144, 5120]);
			if (pokemon.hasType('Flying') && pokemon.side.foe.sideConditions['tailwind']) {
				return this.chainModify([3, 2]);
			}
		},
		onModifyDamage(damage: number, source: any, target: any, move: any) {
			if (source.hasType('Normal') && !source.hasType(move.type) && !move.forceSTAB) {
				this.chainModify(1.1);
			}
			if (target.hasType('Normal') && move.type !== 'Fighting' && move.type !== 'Ghost') {
				this.chainModify(0.9);
			}
		},
		onBattleStart(this: any) {
			for (const side of this.sides) {
				for (const source of side.pokemon) {
					if (source.ability !== 'trainedassassin' && source.ability2 !== 'trainedassassin') continue;
					const candidates = source.side.foe.pokemon.filter(
						(p: any) => !p.fainted && !(p as any).markedHunter && !p.volatiles['marked']
					);
					if (!candidates.length) continue;
					const target = this.sample(candidates);
					(target as any).markedHunter = source;
					this.add('-message', `${source.name}'s Trained Assassin has Marked ${target.name}!`);
				}
			}
		},
		onSwitchIn(pokemon: any) {
			const hunter = (pokemon as any).markedHunter;
			if (hunter && !pokemon.volatiles['marked']) {
				pokemon.addVolatile('marked', hunter);
			}
			if (pokemon.m.regenTurnOut !== undefined) {
				const turns = Math.min(3, this.turn - pokemon.m.regenTurnOut);
				if (turns > 0) {
					this.heal(Math.floor(pokemon.baseMaxhp * 0.10 * turns), pokemon, pokemon);
				}
				delete pokemon.m.regenTurnOut;
			}
		},
		onFaint(pokemon: any, source: any, effect: any) {
			for (const side of this.sides) {
				for (const p of side.pokemon) {
					if ((p as any).markedHunter === pokemon) {
						delete (p as any).markedHunter;
						if (p.volatiles['marked']) p.removeVolatile('marked');
					}
				}
			}
			const hunter = (pokemon as any).markedHunter;
			if (!hunter) return;
			delete (pokemon as any).markedHunter;
			const killedByHunter = source === hunter;
			const selfKO = source === pokemon;
			if (killedByHunter || selfKO) {
				const teammates = pokemon.side.pokemon.filter((p: any) => p !== pokemon && !p.fainted);
				if (teammates.length > 0) {
					const newTarget = this.sample(teammates);
					(newTarget as any).markedHunter = hunter;
					if (newTarget.isActive) newTarget.addVolatile('marked', hunter);
					this.add('-message', `${hunter.name}'s Mark has transferred to ${newTarget.name}!`);
				} else {
					this.add('-message', `${hunter.name}'s Mark fades — no targets remain.`);
				}
			}
		},
		onAfterBoost(boost: any, target: any, source: any, effect: any) {
			if (!(boost.accuracy && boost.accuracy < 0)) return;
			if (!source || source === target) return;
			const hunter = (source as any).markedHunter;
			if (!hunter || target !== hunter) return;
			delete (source as any).markedHunter;
			if (source.volatiles['marked']) source.removeVolatile('marked');
		},
		onTryAddVolatile(status: any, pokemon: any) {
			if (status.id === 'flinch' && pokemon.hasType('Fighting')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Fighting', '[msg]Flinch Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Fighting'}));
				return null;
			}
			if (TRAPPED_VOLATILES.has(status.id) && pokemon.hasType('Ghost')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Ghost', '[msg]Trap Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Ghost'}));
				return null;
			}
		},
		onTryHit(target: any, source: any, move: any) {
			if (target === source) return;
			if (move.flags?.['wind'] && target.hasType('Flying')) {
				this.add('-activate', target, 'typeEffect', '[type]Flying', '[msg]Wind Speed Boost');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: target.species.name, ipl: target.side.id, ty: 'Flying'}));
				this.boost({ spe: 1 }, target, target);
			}
			if (move.category === 'Status' && move.type === 'Dark' && target.hasType('Dark')) {
				this.add('-activate', target, 'typeEffect', '[type]Dark', '[msg]Dark Move Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: target.species.name, ipl: target.side.id, ty: 'Dark'}));
				this.add('-immune', target);
				return null;
			}
		},
		onDragOut(pokemon: any) {
			if (pokemon.hasType('Steel')) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Steel', '[msg]Phazing Immunity');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Steel'}));
				this.add('-fail', pokemon);
				return false;
			}
		},
		onResidualOrder: 100,
		onResidual(pokemon: any) {
			if (!pokemon.status || !pokemon.hasType('Water')) return;
			pokemon.statusState.waterPurge = (pokemon.statusState.waterPurge || 0) + 1;
			if (pokemon.statusState.waterPurge >= 2) {
				this.add('-activate', pokemon, 'typeEffect', '[type]Water', '[msg]Status Purge');
				this.add('analytic', 'typeabilityactivation', JSON.stringify({ip: pokemon.species.name, ipl: pokemon.side.id, ty: 'Water'}));
				pokemon.cureStatus();
			}
		},
		onValidateSet(set: any) {
			return validateDomainSetter.call(this, set);
		},
		onValidateTeam(team: any[]) {
			const problems: string[] = [];
			const count = team.filter((set: any) => DOMAIN_SETTER_IDS.has(this.toID(set.ability2))).length;
			if (count > 1) {
				problems.push('Only one Pokémon per team may have a Domain Setter as their Awakened ability.');
			}
			const sizeProblems = validateDomainTeamSize.call(this, team);
			if (sizeProblems) problems.push(...sizeProblems);
			return problems.length ? problems : undefined;
		},
	},
];
