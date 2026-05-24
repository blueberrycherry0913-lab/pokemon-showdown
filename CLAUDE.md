# Claude Handoff — Pokémon Fan Game Showdown Server

This document is a knowledge-transfer file for a future Claude conversation. It captures what has been built, the conventions in use, and the gotchas discovered along the way so the next Claude doesn't have to learn them from scratch.

**How to use this file:** Claude Code loads this automatically at session start. Read it in full before doing any work. Trust the conventions and gotchas — most of them were learned the painful way.

---

## 1. Project overview

The user is building a custom fan-game rework of Pokémon. Pokémon Showdown is the playtesting platform. The goal is balance and identity refresh — most Pokémon are getting new stats, abilities, moves, and typings, and battle mechanics are also being modified. The eventual real game is a Cobblemon Mod Addon; Showdown is the sandbox to validate mechanics.

**The user's master design doc** lives at `C:\Users\primo\Downloads\pokemon_fan_game_master_reference.md`. The user attaches it via `@` when discussing design changes. Always read it when the user references it — it's the source of truth for design intent and overrides anything in this handoff doc if they conflict.

**Companion files (mentioned in master ref):**
- `pokemon_fan_game_open_questions.md` — unresolved questions
- `pokemon_fan_game_retired_ideas.md` — replaced/retired ideas

**Abilities work:** When implementing or editing abilities, ask the user to attach `CLAUDE_ABILITIES.md` (located in `C:\Users\primo\Downloads\`) for detailed ability-specific conventions, implementation modes, event system gotchas, and a reference table of already-implemented abilities.

---

## 2. Repository topology

### Server: `https://github.com/blueberrycherry0913-lab/pokemon-showdown` (fork of smogon/pokemon-showdown)

Two checkouts on disk:
- **Main repo**: `C:\Users\primo\Documents\GitHub\pokemon-showdown` — what the running server actually uses
- **Worktree**: `C:\Users\primo\Documents\GitHub\pokemon-showdown\.claude\worktrees\compassionate-mcnulty-b55706` — where you (Claude) do edits

The user wants commits to land directly on `master` (no PR flow). Push from the worktree branch to `origin/master` via `git push origin HEAD:master`. The worktree branch name is `claude/compassionate-mcnulty-b55706`; this is the branch you're on by default.

### Client: `https://github.com/blueberrycherry0913-lab/pokemon-showdown-client`

Single checkout: `C:\Users\primo\Documents\GitHub\pokemon-showdown-client`. Branch is `master`. Edit and push directly. **The client has uncommitted user changes you must not blow away** — currently `play.pokemonshowdown.com/js/client-endload.js` and `play.pokemonshowdown.com/src/battle-tooltips.ts`. Use `git add <specific-file>` not `git add -A`.

### Why two repos
Pokémon Showdown is split into a server (TS, game logic, validator) and a client (TS/JS, teambuilder + battle UI). Some changes (formats, validators, type chart) are server-only; some (teambuilder UI, search dropdowns) are client-only; many require coordinated changes to both.

---

## 3. Deploy pipeline: `launch-showdown-clean.bat`

Location: `C:\Users\primo\Desktop\launch-showdown-clean.bat`. This is the user's daily-driver script. Five phases:

1. **Wipe** `CLIENT_DIR\caches\pokemon-showdown` (the client's internal server clone for build-indexes)
2. **Pull + build SERVER_DIR** (`git pull` then `node build`)
3. **Pull + build CLIENT_DIR** (`git pull` then `node build full`)
4. **Launch server** (`node pokemon-showdown` in a new cmd window)
5. **Launch client http-server** (`npx http-server -p 8080 -c-1`) and open browser to `testclient.html?~~localhost:8000`

**The `-c-1` flag is load-bearing.** `testclient.html` loads JS files without cachebuster query strings, so without `-c-1` the browser serves stale JS even after Ctrl+Shift+R. **If the user reports "no change visually after relaunch", check the bat still has `-c-1`.**

**Workflow:** push to origin/master on BOTH repos first, then user runs the bat. The bat pulls both repos and rebuilds before launching.

---

## 4. The Testing Standard format

This is the single active format. Defined in `config/formats.ts` (server). Everything else has been stripped.

```typescript
{
  name: "[Gen 9] Testing Standard",
  mod: 'champions',  // hijacks the champions mod for SP system + Level 50
  ruleset: [
    'Standard NatDex',
    '!Obtainable Abilities',  // allows custom abilities like "Burning Soul"
    '!Obtainable Formes',     // allows custom forms (Mega Venusaur X, etc.)
    'Force IV 0',             // zeroes all IVs at validation time
    'Gen 1 Only',             // gates non-Gen-1 species (temporary)
  ],
  banlist: ['Hidden Power'],
}
```

### Format ID — critical detail

`toID("[Gen 9] Testing Standard")` = **`gen9testingstandard`** (with "testing", NOT "teststandard"). The client has ~16 places checking `format.includes('champions') || format.includes('testingstandard')` to engage SP UI. **If you add new checks, use `'testingstandard'` exactly.** I lost a debugging session because I used `'teststandard'` and the substring never matched.

---

## 5. The champions mod hijack

Pokémon Showdown's "champions" mod (at `data/mods/champions/`) was repurposed to host the SP system and Testing Standard's clauses. Original Champion-game-specific data files (abilities/items/moves/etc.) were deleted in Step 3. Remaining files:

- `data/mods/champions/scripts.ts` — `statModify` (SP math) + `formeChange` override (mega permanence — **DO NOT REMOVE**)
- `data/mods/champions/rulesets.ts` — `Force IV 0`, overridden `standardag` (adds Adjust Level = 50), overridden `natdexmod` (custom-content gating), and `Gen 1 Only` clause
- `data/mods/champions/conditions.ts` — Domain field effects (one per type, 19 total)

### SP system — how it works

The "champions" mod re-interprets the EV field as **SP (Stat Points)**: 1 SP = +1 to that stat at Level 50, capped at 32 per stat, 66 total.

Three places gate the SP system on `dex.currentMod === 'champions'`:
1. `sim/team-validator.ts:1130` — `useStatPoints` enables 32-per-stat cap + "Stat Points" UI labels
2. `sim/dex-formats.ts:284` — sets `evLimit = 66` when valueRules.evlimit==='Auto'
3. `data/mods/champions/scripts.ts:statModify` — the actual stat math

**Stat formula (per `statModify` in scripts.ts):**
- HP: `base + sp + (forceIV0 ? 60 : 75)`
- Other: `(base + sp + (forceIV0 ? 5 : 20)) * natureModifier`

The `forceIV0` branch is gated on `ruleTable.has('forceiv0')` — Testing Standard's `'Force IV 0'` clause sets that. Constants `60/5` produce 0-IV-equivalent stats; `75/20` would be 31-IV-equivalent (canon Champions mode).

### Force IV 0 clause

In `data/mods/champions/rulesets.ts`. `onChangeSet` zeroes `set.ivs` silently at validation time. Server validator at `sim/team-validator.ts:1135` was patched to default-fill IVs to 0 (not 31) when `'forceiv0'` is in the rule table, and the maxedIVs check at line 1141 now accepts EITHER all-31 OR all-0 IVs.

### Gen 1 Only clause

Restricts Testing Standard to **Gen 1 evolution families**. Detection (in `data/mods/champions/rulesets.ts`):
1. If species is a Mega/Primal/Ultra/G-Max forme, recurse on `baseSpecies`
2. Walk `prevo` back to evolution-family root
3. From root, DFS the `evos` tree; eligible if any family member has `num 1-151` or `gen === 1`

Result: Venusaur, Pichu (prevo of Pikachu Gen 1), Munchlax (prevo of Snorlax), Magnezone (forward evo), Mega Venusaur X (mega of Venusaur), Raichu-Alola (regional), etc. all pass. Garchomp, Meltan, Bidoof all reject.

**Easy to remove:** drop `'Gen 1 Only'` from Testing Standard's ruleset in `config/formats.ts`.

---

## 6. Tagging conventions (opt-in validation system)

The user maintains a tagging system in their data files. The validator gates content **opt-in style**: content is "ready" by default unless tagged, and "gated" if tagged with a specific value.

### Species (`data/formats-data.ts`)

| Tag | Effect |
|---|---|
| `natDexTier: 'Illegal'` | **REJECTED** by validator (gate word) |
| `natDexTier: 'Unreleased'` | REJECTED under obtainable |
| `isNonstandard: 'Past'` / `'Custom'` / `'custom'` (lowercase) | passes validator |
| no tags | passes |

### Moves (`data/moves.ts`)

| Tag | Effect |
|---|---|
| `isNonstandard: 'Unobtainable'` on current-gen move | REJECTED (gate word) |
| `isNonstandard: 'Past'` | passes |
| no tag | passes |

### Items (`data/items.ts`)

| Tag | Effect |
|---|---|
| `isNonstandard: 'Unobtainable'` | REJECTED (gate word) |
| `isNonstandard: 'Past'` / `'Custom'` / etc. | passes |
| no `isNonstandard` | passes |

### Gate-word principle

**"Unobtainable" (for moves/items) and `natDexTier: 'Illegal'` (for species) are the canonical gate words.** Anything else is "ready". The user explicitly wants gating to be opt-in: things they haven't reworked yet get the gate tag; everything else is implicitly legal.

**Important:** the validator was at one point lifted to a no-op (everything passes regardless of tags). The user pushed back hard — they want the validator to actually enforce tags so they can use it as a project-management tool. **Do not lift validation again** unless explicitly asked.

### Special tag: `isNonstandard: 'custom'` (lowercase)

The user's convention for marking wholly-custom Pokémon they invented. Lowercase intentionally — canon Showdown's `'Custom'` (capital C) is used for Pokestar mons / Missingno and shouldn't collide. The client's `build-indexes` buckets `isNonstandard === 'custom'` species under a "Custom" header in the teambuilder (currently 0 species; ready when needed).

---

## 7. Teambuilder dex hierarchy (current state)

Under Testing Standard, the teambuilder dex shows these sections (in order, top to bottom):

| Header | Count | Contents |
|---|---|---|
| **Gen1** | 119 | Fully-evolved Gen 1 lineage (Venusaur, Charizard, Raichu, Snorlax, Magnezone, Rhyperior, Mewtwo, Mew, regional formes like Raichu-Alola) |
| **Megas** | 24 | Mega Evolutions of Gen 1 lineage (canon + Future-tagged custom ones: Raichu-Mega-X/Y, Clefable-Mega, Victreebel-Mega, Starmie-Mega, Dragonite-Mega) |
| **NFE** | 109 | Still-evolving Gen 1 lineage (Bulbasaur, Pikachu, Pichu, Magnemite, Rhyhorn, Geodude, Munchlax) |
| **Other** | 28 | G-Max forms (12) + Cosplay Pikachus (6) + Cap Pikachus (7) + LGPE Starters (2) + Pichu-Spiky-eared |
| *(hidden)* | 1237 | Illegal — everything not Gen 1 lineage |

**Mega tier inheritance**: this was a previous behavior where Megas inherited their base species's tier. The Gen 1 Only restriction superseded it — when Gen 1 Only is removed later, Mega inheritance code would need to be re-thought.

**"Other" detection**: forme matches `Gmax | Cosplay | Rock-Star | Belle | Pop-Star | PhD | Libre | Original | Hoenn | Sinnoh | Unova | Kalos | Partner | World | Spiky-eared | Starter`. See `build-tools/build-indexes` for the exact set.

### Stat-bar color gradient

In `build-tools/build-indexes` and `play.pokemonshowdown.com/src/battle-team-editor.tsx`, the stat-bar color uses ceilings to map stat values to hue. For Testing Standard the ceilings are **HP=320, non-HP=220** (lower = more lenient = greener for typical mons). The user tuned this; don't change without permission.

---

## 8. THE TWO TEAMBUILDERS — CRITICAL

The client has **two parallel teambuilder UIs**. The user's launch bat opens the **legacy** one. If you patch only one, the user sees nothing change.

| HTML | Loads | Source | Update by |
|---|---|---|---|
| `testclient.html` *(what user sees)* | `js/client-teambuilder.js` | Hand-written JS, **no TS source** | Edit `.js` directly |
| `preactalpha.html` / `testclient-beta.html` | `js/battle-team-editor.js` | `src/battle-team-editor.tsx` | Edit `.tsx`, build compiles |

**Whenever you change teambuilder behavior, patch BOTH files.** The user only sees the legacy one currently, but they'll switch eventually and the changes should be in both. I've usually patched both as a habit.

**Known gap as of session 5**: the champions dual-ability UI (awakened display + "Abilities" label + no label on ability input) was implemented only in `client-teambuilder.js`. `battle-team-editor.tsx` still has the default single-ability layout for champions mode. Port this before the user switches to `preactalpha.html`.

Other client-side files that touch format detection:
- `play.pokemonshowdown.com/src/battle-dex.ts` (Dex.forFormat — mod routing)
- `play.pokemonshowdown.com/src/battle-dex-search.ts` (BattlePokemonSearch — tier filtering, dex display)
- `play.pokemonshowdown.com/src/battle-tooltips.ts` (stat tooltips during battle)
- `build-tools/build-indexes` (the per-format teambuilder-tables.js generator)

---

## 9. Custom type chart

19 types total (canon 18 + **Cosmic**). The master reference specifies 14 canon adjustments + the full Cosmic interaction matrix. Latest state pushed to `data/typechart.ts` is verified to match the spec exactly (0 deviations).

### Cosmic snapshot
- **Offensive**: NVE on Ghost/Psychic, self-SE on Cosmic, neutral elsewhere
- **Defensive**: Weak to Psychic + Cosmic, resists Ghost + Normal + Dark, neutral elsewhere

### Doc inconsistency
At master-ref line 185, the chart cell shows `Dark → Cosmic = -` (neutral), but the text at line 64, the flavor at line 76, and the balance table at line 240 all say "Cosmic resists Dark". I followed the text (cosmic.damageTaken.Dark = 2 / resist) since 2 sources agree against the 1 chart cell. If the user clarifies the chart is correct, flip `cosmic.dT.Dark` back to 0.

### damageTaken encoding (Showdown's internal representation)

In `data/typechart.ts`, `damageTaken` is keyed by ATTACKING type from the defender's perspective:
- `0` = neutral (1×)
- `1` = weak (2×)
- `2` = resist (0.5×)
- `3` = immune (0×)

So `ice.damageTaken.Water = 2` means Ice takes 0.5× damage from Water (Ice resists Water).

### Verification recipe

When applying type chart changes, run a script that compares every cell to expected and use `Dex.getEffectiveness(atk, def)` to verify the engine returns the right multiplier (`-1` = 0.5×, `0` = 1×, `1` = 2×, with `Dex.getImmunity` returning false for 0×).

---

## 10. Memory files (saved in user's claude config)

Located at `C:\Users\primo\.claude\projects\C--Users-primo-Documents-GitHub-pokemon-showdown\memory\`:

- `MEMORY.md` — index of all memory files
- `project_deploy_mechanism.md` — the launch bat details + gotchas
- `project_two_teambuilders.md` — testclient vs preactalpha distinction
- `feedback_git_add_a.md` — don't use `git add -A` (`.claude/` leaks in)
- `feedback_mega_permanence_canon.md` — keep the `formeChange` override

These auto-load into the next conversation's context. The handoff doc supplements them.

---

## 11. Gotchas and best practices

### Git workflow
- **Server**: `git push origin HEAD:master` from the worktree
- **Client**: `git push origin master` from CLIENT_DIR
- **Never `git add -A`** — `.claude/` is untracked here and leaks into commits. Always `git add <specific-files>`
- **Never amend a pushed commit** — make a new commit

### Build / deploy
- Test changes locally with `node build` (server) or `node build full` (client) before pushing
- The user's launch bat does git pulls — don't tell them to relaunch until you've pushed
- The `-c-1` flag in the bat is essential for client cache (don't remove)

### TypeScript build vs build full
- Server: `node build` compiles TS via esbuild
- Client: `node build` only does TS + cachebuster updates. `node build full` ALSO runs `build-indexes` / `build-learnsets` / `build-minidex` which re-clones the server cache and rebuilds the teambuilder data. **Use `full` when changing build-indexes or species data.**

### Verifying changes
- Server-side data: `node -e "const {Dex} = require('./dist/sim'); ..."` from the worktree
- Format validation: `new TeamValidator('gen9testingstandard').validateSet(set, {})` returns array of problems or null
- Type chart: `Dex.getEffectiveness(atk, def)` and `Dex.getImmunity(atk, def)`
- Client teambuilder tables: read `play.pokemonshowdown.com/data/teambuilder-tables.js` via `new Function('exports', code)(sandbox.exports)`

### Working directory awareness
- Bash tool's CWD can drift between Server and Client repos as you `cd` around. Always use `git -C <path>` for git operations to be explicit
- Don't conflate the worktree path with the main repo path. Edits go in the worktree; the running server uses the main repo (which gets pulled by the bat)

### Build error tracebacks (frequent during this project)
- `Cannot read properties of undefined (reading 'includeData')` → some code is calling `Dex.mod('genX')` for a deleted gen. Fix with `hasMod` guard
- `module not found './dist/sim'` → bash session is in client repo. cd to server worktree
- Validator silently passes content that should fail → check `validateStats` is being called (gated on `'nonexistent'` ban via Obtainable)

### When the user says "no change visually"
Common causes in priority order:
1. Browser cache (despite Ctrl+Shift+R) — verify `-c-1` is in the bat
2. Patched wrong teambuilder (preact instead of legacy)
3. Format ID typo (`teststandard` vs `testingstandard`)
4. Main repo didn't pull (verify bat phase [2/5] ran)
5. Stale dist/ — server `node build` didn't run

---

## 12. What's been built (chronological commit summary)

### Step 1 — Server cleanup (5 commits)
Deleted 46 mod folders, `data/random-battles/`, `server/chat-plugins/randombattles/`. Stripped `config/formats.ts` from 5682 lines to ~33 (only Nat Dex AG). Preserved `data/mods/champions/`.

### Step 2 — Testing Standard format added (1 commit)
Added `[Gen 9] Testing Standard` (formatid `gen9testingstandard`) inheriting `Standard NatDex` + `!Obtainable`.

### Step 3 — SP system + Level 50 (3 commits + fixes)
Switched mod to `champions`. Stripped champions mod data files (kept scripts.ts + rulesets.ts). Tweaked ruleset to use `!Obtainable Moves/Abilities/Formes` (not blanket `!Obtainable`) so `Nonexistent` ban still triggers `validateStats`. Restored `formeChange` override (mega permanence). Client teambuilder patches to engage SP UI (slider max 32, total 66, "Stat Points" labels).

### Step 4 — IV removal (1 commit + UI fix)
Added `Force IV 0` ruleset clause. statModify branches on `ruleTable.has('forceiv0')` for 0-IV constants. Validator patched to default-fill IVs to 0 and accept all-0 IVs. Hidden Power banned. Client hides IV/DV column when SP mode.

### Custom content tagging refinements (multiple commits)
- Re-enabled Obtainable Moves so canon learnsets restrict moves (Venusaur can't use Light That Burns the Sky)
- Override of `natdexmod` to drop the gen walk-back (gen mods deleted in Step 1), but otherwise keep canon gating
- Item rejection narrowed to `isNonstandard === 'Unobtainable'` only (so 'Past' items like Heavy-Duty Boots pass)

### Teambuilder bucketing (multiple commits)
- Custom/Past tier headers
- Mega base-tier inheritance (later replaced)
- Lowercase `'custom'` tag for user mons
- Gen1/Megas/NFE/Other hierarchy (current)

### Gen 1 Only restriction (current)
- Validator clause restricting to Gen 1 evolution families
- Client renders Gen1 at top, then Megas, NFE, Other

### Type chart (latest)
- 14 canon adjustments applied
- Cosmic type fully implemented per master reference

### Champions dual-ability teambuilder UI (session 5)
- Added `awakenedability-display` div in legacy teambuilder (`client-teambuilder.js`) showing `species.abilities['H']` (the hidden/awakened ability)
- "Abilities" label added above the display, matching `.setchart label` font/color/size
- Basic ability input stays at exact same Y position as Pokémon and Item inputs — no label in champions mode
- Went through ~10 rounds of positioning iteration; final layout is fully zoom-independent
- `.setchart` and `.setcol` changed from `height: 127px` to `min-height: 127px` so the card can grow in champions mode
- **`battle-team-editor.tsx` (Preact teambuilder) NOT updated** — user currently uses legacy (`testclient.html`); Preact update is pending
- Last commit: `5a202043` — "Add Abilities label above awakened display, matching setchart label styling"

### Validator overhaul (session 4)
- `gen1only.onValidateSet`: rejection message changed to `"${set.name || set.species} is not available yet."`
- `natdexmod.onValidateSet`: added a Gen 1 lineage bypass — if `isGen1Lineage(this.dex, species)` returns true, skip the `natDexTier: 'Illegal'` rejection entirely. Gen 1 species should always be legal regardless of how they're tagged. Both rejection branches (Illegal, Unreleased) now say "is not available yet."
- package-lock.json: committed the updated pg-* packages (pg-cloudflare 1.4.0, pg-connection-string 2.13.0, pg-pool 3.14.0, pg-protocol 1.14.0) to origin/master so `npm ci` in the build bat no longer fails

### Type-order STAB (session 4)
- Implemented §6 of master reference in actual damage calculation by adding `onModifySTAB` directly to the format object in `config/formats.ts` (format objects act as battle conditions and can carry `on*` event handlers)
- Pure type (single type): ×1.6 | Primary type (types[0]): ×1.5 | Secondary type (types[1]): ×1.4
- Adaptability is bypassed (its handler fires first and returns 2; format handler detects it with `attacker.hasAbility('adaptability')` and returns `stab` unchanged)

### Battle tooltip overhaul (session 4)
- Ability multiplier comments suppressed from default display (removed from base-power line entirely)
- Alt-key True Power chain added: holding Alt while hovering a move shows `True Power: 90 × Primary STAB (×1.5) × Iron Fist (×1.2) = 162` with full multiplier breakdown
- Type-order STAB labels in tooltip: `Pure STAB (×1.6)` / `Primary STAB (×1.5)` / `Secondary STAB (×1.4)`
- See §17 for full technical detail

### Domain field effects (sessions 7–9)
- Created `data/mods/champions/conditions.ts` with 19 Domain conditions (one per type, Normal through Cosmic). Domains use **pseudoWeather** (not terrain) so multiple can be active at once. Duration: 5 turns. No grounding requirement — affects all Pokémon.
- **Domain effects**: Each domain boosts same-type Pokémon Atk/Def/SpA/SpD by ×1.25 and grants same-type moves +10% accuracy. Handler patterns: `chainModify([5120, 4096])` for stats (priority 5 for atk/spa, 6 for def/spd), `chainModify(1.1)` for accuracy.
- **19 Domain moves** in `data/moves.ts` — IDs `domain{type}`, nums -101 to -119, named "Domain: Fire" etc. Each carries `pseudoWeather: '{type}domain'`. Charizard has `domainfire: ["9L1"]` as example learnset.
- **Custom move num log**: -2 (Shadow Strike), -3 (Polar Flare), -101…-119 (Domain: Bug through Domain: Water). Slot -4 is now unused.
- **Stale dist bug**: Deleted stale champions dist artifacts. See §16 gotcha #19.
- **Client tooltip changes**:
  - `calculateModifiedStats`: applies domain stat boosts before `return stats` — shows green `stat-boosted` numbers in hover panel
  - `showMoveTooltip`: when Alt held and domain matches move type, accuracy line shows: `Accuracy: 85% × Fire Domain (×1.1) = 93.5%`; if accuracy is 0 (Cannot Miss), breakdown is skipped
  - Domain type list is duplicated inline in **both** of those locations — update both if adding a new type
- **"Cannot Miss" label**: `ModifiableValue.toString()` returns `"Cannot Miss"` (not `"can't miss"`) when `value === 0` with `isAccuracy === true`. Applies to No Guard, sure-hit moves, etc.
- **See §19** for the full domain system technical reference.

### Abilities work (sessions 6+)
- Custom `origin` field added to `Ability` class (`sim/dex-abilities.ts`) and displayed in `/dt` output (`server/chat-commands/info.ts`) in place of generation number
- Abilities implemented through rows 1–25 of the TSV design doc; see `CLAUDE_ABILITIES.md` for the full reference table and conventions

### Mind Controlled volatile status (sessions 10–11)

Full implementation of §4's Mind Controlled mechanic — the opposing player actually picks moves for the afflicted Pokémon. See §21 for the full technical reference.

**Server changes:**
- `data/mods/champions/conditions.ts`: `mindcontrolled` volatile. Instance-based duration (see §21). `onDamagingHit` cures it when damage ≥ 50% max HP. `onStart` removes Confusion (volatile override per §4) and applies flinch only if target hasn't moved yet (Hypno faster). `onResidual` tracks instance consumption. `onEnd` announces end.
- `data/moves.ts`: `mindcontrolledtest` move (num -4) — `onTryHit` blocks Psychic types (immune) and already-MC'd targets (immune, no flinch on reapplication). `mindcontrolselfdamage` move (num -5) — `category: "Physical"`, `damageCallback` + `ignoreImmunity: true` (confusion-style damage, 40 BP).
- `sim/side.ts`:
  - `MoveRequest` extended: `controlledActive?: PokemonMoveRequestData[]`, `controlledSide?: SideRequestData`
  - `ChosenAction` extended: `externalMove?: boolean`
  - `Choice` extended: `controlledActions: ChosenAction[]`
  - `clearChoice()` initializes `controlledActions: []`
  - `isChoiceDone()` returns false until `controlledActions.length >= controlledActive.length`
  - `commitChoices()` also calls `battle.queue.addChoice(this.choice.controlledActions)`
  - `choose()`: max-choice length check accounts for `controlledActive`; new `case 'controlled':` routes to `chooseControlled()`
  - `chooseControlled(moveText)`: validates move against the MC'd Pokémon's request data; pushes action to `controlledActions` with `externalMove: true` for the selfdamage case
- `sim/battle.ts`: `getRequests()` — after building regular requests, iterates all sides; for each MC'd Pokémon, pushes its move data into the opponent's `controlledActive`; converts afflicted side to `{wait: true}` when all active Pokémon are MC'd. Move-action resolver propagates `externalMove` field.
- `sim/battle-queue.ts`: `MoveAction` interface extended with `externalMove?: boolean`.

**Client changes:**
- `play.pokemonshowdown.com/src/battle-choices.ts`:
  - `BattleMoveRequest`: `controlledActive?`, `controlledSide?` fields added
  - `BattleChoiceBuilder`: `controlledChoices: string[]` array; `isDone()` waits for controlled too; `toString()` concatenates both arrays; `addChoice()` intercepts `"controlled move X"` strings into `controlledChoices`; `isControlledDone()` helper
- `play.pokemonshowdown.com/src/panel-battle.tsx`:
  - `renderControlledMoveMenu()`: renders move buttons with `cmd: "/controlled move ${i+1}"` plus Self-Hit and Force Switch buttons
  - `case 'move':` block: after own choices are done, shows the controlled section if `!choices.isControlledDone()`
  - Back button (`data-cmd="/cancel"`) in the MC panel's `whatdo` resets `BattleChoiceBuilder` without sending `/undo` (safe because `isDone()` and `isEmpty()` are both false mid-MC)
- `play.pokemonshowdown.com/js/client-battle.js`:
  - MC panel renders Self-Hit and Force Switch buttons
  - `<button name="clearChoice">Back</button>` lets player return to their own move selection
  - Timer wrapped in `<span style="float:right">` so it doesn't push the 4th move slot down

**Protocol flow (singles):**
1. P1's Pokémon gets Mind Controlled
2. Next `makeRequest('move')`: P1 → `{wait: true}`; P2 → `{active: [...], controlledActive: [...], controlledSide: ...}`
3. P2 sees own move buttons, submits their own choice; controlled section then appears
4. P2 picks move for P1's Pokémon, submission becomes `"move 1, controlled move 2"`
5. Server `side.choose("move 1, controlled move 1")` routes: `"move 1"` → own action; `"controlled move 1"` → `chooseControlled()` → `controlledActions`
6. `commitChoices()` queues both into the battle queue; MC'd Pokémon executes the chosen move

### Move category framework — §5 (current session)

- **Sound/bypasssub refactor**: Removed `bypasssub: 1` from all 31 sound moves (only those that also had `sound: 1`). Substitute bypass is now an inherent engine effect of `sound`: the substitute condition's `onTryPrimaryHit` in `data/moves.ts` checks `move.flags['sound']` directly alongside `move.flags['bypasssub']`.
- **New MoveFlags** declared in `sim/dex-moves.ts`: `ball`, `beam`, `bone`, `bursting`, `corrosive`, `exploding`, `heavyprojectile`, `kicking`, `light`, `piercing`, `vine`. Also added `piercingHit?: boolean` to `MoveHitData` interface.
- **Bullet screen bypass**: `bullet` flag now also bypasses Reflect, Light Screen, and Aurora Veil. Added `&& !move.flags['bullet']` to all three screen conditions' `onAnyModifyDamage` handlers in `data/moves.ts`. The existing `bullet` flag (Bulletproof hook) and the user's "Bullet" category are the same flag — resolved by giving the existing flag a second effect.
- **Piercing protect bypass**: `checkMoveBypassesProtect` in `sim/battle.ts` — when protect would block a `piercing` move, sets `piercingHit = true` on the hit data and returns `true` (move hits). `getDamage` in `sim/battle-actions.ts` applies 0.5× modifier when `piercingHit` is set (after the Z-move `bypassProtect` block).
- **Bone immunity bypass**: Full implementation across 4 hit pipeline steps in `sim/battle-actions.ts` plus a damage floor in `getDamage`:
  - `hitStepInvulnerabilityEvent` — bone moves bypass semi-invulnerability (Dig, Fly, Phantom Force, etc.)
  - `hitStepTryHitEvent` — bone moves skip the entire `TryHit` event, bypassing Wonder Guard, Flash Fire, Volt Absorb, Water Absorb, Sap Sipper, Air Balloon, etc.
  - `hitStepTypeImmunity` — bone moves set `move.ignoreImmunity = true`, bypassing type chart 0× matchups and `isGrounded()` (Levitate, Magnet Rise, etc.)
  - `hitStepTryImmunity` — bone moves skip powder immunity and `TryImmunity` event
  - `getDamage` — `if (move.flags['bone'] && typeMod < 0) typeMod = 0` clamps to neutral floor (normally automatic since `getEffectiveness` returns 0 for immune matchups anyway)
- Applied `bone: 1` to Bone Club, Bonemerang, Bone Rush, Shadow Bone in `data/moves.ts`.
- **Pending**: `bursting` (splash damage to adjacent targets), `corrosive` (custom type matchup overrides). See §22 for the full move category technical reference.

---

## 13. Open questions / likely next steps

Based on the master reference's roadmap (line 19-25):

- **"Plan 2: Edit stats for Generation 1 Pokémon"** — the user has been doing this in `data/formats-data.ts` and `data/pokedex.ts`. They tag reworked species with `*` and new species with `**` (suffix notation in their Pokemon_Reworked.tsv — see master ref §"File Conventions").
- **"Plan 3: Add a few New Pokémon"** — the `isNonstandard: 'custom'` (lowercase) tag is ready to bucket these under a "Custom" UI header.
- **"Plan 4: Add mechanical/functionality changes"** — the master reference §1.5 (Blanket Type Effects), §2 (Weather), §3 (Terrain), §4 (Status Conditions), §5 (Move Categories — **partially done**: Sound ✓, Bullet ✓, Piercing ✓, Bone ✓; Bursting and Corrosive pending — see §22), ~~§6 (Typing Order STAB — DONE)~~, §7 (Speed Ties), §8 (Dual Ability System), §11 (Generation Gimmick Reworks) all describe pending mechanical work.
- **"Plan 5: Edit stats for Gen 8 Pokémon"** — will require lifting the Gen 1 Only clause (or replacing with a "Gen 1 + Gen 8 only" variant).

**When new mechanical work starts**, expect to touch `sim/battle-actions.ts`, `sim/battle.ts`, `sim/pokemon.ts`, `data/abilities.ts`, `data/conditions.ts`, `data/moves.ts`, `data/scripts.ts` — but for Testing Standard-specific overrides, prefer `data/mods/champions/scripts.ts` and `rulesets.ts` to keep canon Showdown code paths intact.

---

## 14. Quick reference

### Common commands

```bash
# Server worktree path
cd "C:/Users/primo/Documents/GitHub/pokemon-showdown/.claude/worktrees/compassionate-mcnulty-b55706"

# Server build + quick verify
node build && node -e "const {Dex} = require('./dist/sim'); console.log(Dex.formats.get('gen9testingstandard').name);"

# Server push (worktree branch -> origin/master)
git push origin HEAD:master

# Client path
cd "C:/Users/primo/Documents/GitHub/pokemon-showdown-client"

# Client TS rebuild only (when editing battle-team-editor.tsx etc.)
node build

# Client full rebuild (when editing build-indexes or after major data changes)
Remove-Item -Recurse -Force "caches/pokemon-showdown" -ErrorAction SilentlyContinue
node build full

# Validate a team set
node -e "
const {TeamValidator} = require('./dist/sim');
const v = new TeamValidator('gen9testingstandard');
console.log(v.validateSet({species:'Venusaur', name:'V', level:50, gender:'F',
  moves:['gigadrain'], ability:'Overgrow', item:'Heavy-Duty Boots',
  nature:'Modest', evs:{spa:32,spe:32}}, {}));
"

# Inspect teambuilder-tables.js output
node -e "
const code = require('fs').readFileSync('C:/Users/primo/Documents/GitHub/pokemon-showdown-client/play.pokemonshowdown.com/data/teambuilder-tables.js','utf8');
const sandbox = {exports: {}};
new Function('exports', code)(sandbox.exports);
const champ = sandbox.exports.BattleTeambuilderTable.champions;
console.log('overrideTier sample:', champ.overrideTier.venusaur);
"
```

### Key file map

| Concern | File |
|---|---|
| Format definition | `config/formats.ts` |
| SP math | `data/mods/champions/scripts.ts` (statModify) |
| Mega permanence | `data/mods/champions/scripts.ts` (formeChange) |
| Format clauses (Force IV 0, Gen 1 Only, natdexmod, standardag) | `data/mods/champions/rulesets.ts` |
| Type chart | `data/typechart.ts` |
| Custom Pokemon data | `data/pokedex.ts` |
| Tier/legality tags | `data/formats-data.ts` |
| Domain conditions (19 types, effects) | `data/mods/champions/conditions.ts` |
| Domain-setting moves (19, IDs domain{type}, nums −101…−119) | `data/moves.ts` (end of file) |
| Custom moves | `data/moves.ts` |
| Custom items | `data/items.ts` |
| Custom learnsets | `data/learnsets.ts` |
| SP validator | `sim/team-validator.ts` (lines ~1130, 1135, 1141) |
| evLimit=66 trigger | `sim/dex-formats.ts` (line ~284) |
| Legacy teambuilder UI | `play.pokemonshowdown.com/js/client-teambuilder.js` *(hand-written JS)* |
| Preact teambuilder UI | `play.pokemonshowdown.com/src/battle-team-editor.tsx` |
| Format detection (client) | `play.pokemonshowdown.com/src/battle-dex-search.ts` (~line 653) |
| Battle stat tooltips + move BP display | `play.pokemonshowdown.com/src/battle-tooltips.ts` (ModifiableValue class, showMoveTooltip, listen) |
| Type-order STAB (damage calc) | `config/formats.ts` (onModifySTAB on the format object) |
| Tier bucketing (client) | `build-tools/build-indexes` |
| Launch bat | `C:\Users\primo\Desktop\launch-showdown-clean.bat` |
| Sprite redirects (battle + teambuilder) | `play.pokemonshowdown.com/src/battle-dex.ts` (`getSpriteData`, `getTeambuilderSpriteData`, `getPokemonIconNum`) |
| Ability implementations | `data/abilities.ts` |
| Ability class + origin field | `sim/dex-abilities.ts` |
| /dt ability display | `server/chat-commands/info.ts` |
| Move category flags (`MoveFlags` + `MoveHitData`) | `sim/dex-moves.ts` (MoveFlags interface ~line 28, MoveHitData ~line 295) |
| Hit pipeline (invulnerability / TryHit / TypeImmunity / TryImmunity) | `sim/battle-actions.ts` (`hitStep*` functions) |
| Protect bypass hook (`checkMoveBypassesProtect`) | `sim/battle.ts` |
| Piercing damage modifier + bone neutral floor | `sim/battle-actions.ts` (`getDamage`) |

---

## 15. Sprite system deep-dive

### How spriteid is built (critical gotcha)

The client's `Species` class (in `play.pokemonshowdown.com/src/battle-dex-data.ts`) computes `spriteid` as:

```typescript
const baseId = toID(this.baseSpecies);         // e.g. 'venusaur'
this.formeid = '-' + toID(this.forme);          // e.g. '-megax'
this.spriteid = baseId + this.formeid;           // e.g. 'venusaur-megax'
```

**`spriteid` always has a hyphen between the base species and forme.** It is NOT the same as `toID(speciesName)` (which strips all non-alphanumeric chars). Examples:
- Venusaur-Mega-X → `spriteid = 'venusaur-megax'`
- Venusaur-Mega-Y → `spriteid = 'venusaur-megay'`
- Venusaur-Gmax → `spriteid = 'venusaur-gmax'`
- Venusaur-Mega (canon) → `spriteid = 'venusaur-mega'`

**`species.id` (used for icon lookups) IS the no-hyphen toID form**: `'venusaurmegax'`.

### The two ID namespaces

| Variable | Format | Used for |
|---|---|---|
| `species.id` | `toID()` — no hyphens | `getPokemonIconNum`, `BattlePokemonSprites[speciesid]` animation lookup |
| `species.spriteid` | `baseId + formeid` — has hyphens | `getSpriteData` `name`, `getTeambuilderSpriteData` `spriteid`, actual CDN filenames |

**This is why icon redirects matched (`'venusaurmegax'`) while sprite redirects didn't (`'venusaur-megax'`)** — three sessions were lost to this before the root cause was found.

### CDN sprite directories and what exists

The client's `Dex.resourcePrefix` is `//play.pokemonshowdown.com/` (set via `Config.routes.client`). All sprite files come from the CDN, not from the local repo. Verified CDN paths for reference:

| Path | Exists | Notes |
|---|---|---|
| `sprites/gen5/{spriteid}.png` | ✓ for gen1-5 mons | BW-era static sprites. Gen6+ megas exist here (e.g. `venusaur-mega.png`) |
| `sprites/dex/{spriteid}.png` | ✓ for gen1-6 mons + their formes | XY-era dex sprites. Megas exist (e.g. `venusaur-mega.png`) |
| `sprites/home-centered/{spriteid}.png` | ✓ for gen1-8 base + Gmax | HOME-app art style. **Mega forms do NOT have home-centered sprites.** GMax forms DO (e.g. `venusaur-gmax.png`). |
| `sprites/ani/{spriteid}.gif` | ✓ for gen1-5 mons + gen6 megas | Animated GIFs. Megas animated (e.g. `venusaur-mega.gif`). GMax forms are NOT animated. |

### Directory selection in getTeambuilderSpriteData

The function picks the sprite directory by evaluating `homeExists` and then:
- `gen >= 8 && homeExists` → `sprites/home-centered/`
- `gen >= 6 && xydexExists` → `sprites/dex/`
- otherwise → `sprites/gen5/`

`homeExists` is true for most Pokémon including custom formes with `isNonstandard: 'Past'`. With `dex.gen = 9` (champions mod), `gen >= 8` is always true, so the teambuilder almost always resolves to `sprites/home-centered/` — which means **Mega forms will silently 404** because Mega sprites aren't in home-centered.

**When adding sprite redirects for Mega forms, always return early from `getTeambuilderSpriteData` with an explicit `spriteDir: 'sprites/dex'`** rather than letting the homeExists logic run.

### How to add a sprite redirect for a custom form

All three redirect points live in `play.pokemonshowdown.com/src/battle-dex.ts`:

**1. Battle front/back sprite (`getSpriteData`):**
```typescript
// After `let name = species.spriteid;`
if (name === 'custom-formeid') name = 'target-spriteid';  // use hyphens

// After `let speciesid = species.id;` (for animation lookup — no hyphens)
if (speciesid === 'customformeid') speciesid = 'targetspriteid';

// In the `if (!animatedSprite)` block, if target has no animated/gen5 sprite:
if (name === 'target-spriteid') {
    spriteData.url = `${Dex.resourcePrefix}sprites/home-centered/${name}.png`;
    return spriteData;
}
```

**2. Teambuilder sprite (`getTeambuilderSpriteData`):**
```typescript
// Before the species.exists check — return early with explicit directory
if (spriteid === 'custom-formeid') return { spriteDir: 'sprites/dex', spriteid: 'target-spriteid', x: -2, y: -3 };
// or for GMax targets:
if (spriteid === 'custom-formeid') return { spriteDir: 'sprites/home-centered', spriteid: 'target-spriteid', x: 8, y: 10, h: 96 };
```

**3. Icon sheet (`getPokemonIconNum`):**
```typescript
// At the top of the function — uses toID format (no hyphens)
if (id === 'customformeid') id = 'targetformeid' as ID;
```

**4. Legacy teambuilder form-picker (`client-teambuilder.js` line ~3807):**
The form-picker builds its sprite URL using the local `spriteid` variable, not `data.spriteid`. Change it to `data.spriteid` so it picks up the redirect from `getTeambuilderSpriteData`.

### Current sprite redirects (as of this session)

Venusaur-Mega-X and Venusaur-Mega-Y are custom forms. Their visual redirects:

| Custom form | spriteid | → redirect | Battle sprite | Teambuilder sprite |
|---|---|---|---|---|
| Venusaur-Mega-Y | `venusaur-megay` | `venusaur-mega` | `sprites/ani/venusaur-mega.gif` (animated) | `sprites/dex/venusaur-mega.png` |
| Venusaur-Mega-X | `venusaur-megax` | `venusaur-gmax` | `sprites/home-centered/venusaur-gmax.png` | `sprites/home-centered/venusaur-gmax.png` |

Icons use `BattlePokemonIconIndexes`: `venusaurmega: 1320`, `venusaurgmax: 1397`.

### Verifying sprite URLs before writing redirects

Before writing a redirect, always verify the CDN path with WebFetch:
```
https://play.pokemonshowdown.com/sprites/{dir}/{spriteid}.png
```
The CDN is picky — `venusaurmega.png` (no hyphen) is 404 but `venusaur-mega.png` (with hyphen) is 200.

---

## 16. Pitfalls I (Claude) hit during this work (cumulative)

Listed for posterity so the next Claude doesn't repeat them:

1. **Patched only the preact teambuilder, not the legacy one.** The user reported "SP not working" for hours. Lesson: always patch BOTH teambuilders when changing UI behavior.
2. **Used `'teststandard'` substring instead of `'testingstandard'`.** Format ID has "ing" in it. Lesson: derive the format ID via `toID(name)` before hardcoding.
3. **Stripped `pokemon.formeChange` override** thinking it was Champion-game-specific. User pushed back — mega permanence is canon to the rework. Lesson: ask before removing behavior from a working mod.
4. **Made the natdexmod onValidateSet a no-op** to make everything pass. User wanted opt-in gating, not blanket lift. Lesson: read what the user wants gated vs ungated carefully; default to preserving the validator.
5. **Forced `format = 'ubers'` for testingstandard** in battle-dex-search.ts. This caused tier-set slicing that hid all custom tiers. Lesson: when adding format-detection branches in client search code, trace the full downstream slice/filter logic.
6. **Used `git add -A`** once and committed `.claude/settings.local.json`. Had to amend before pushing. Lesson: stage specific files always.
7. **Built spec verification tables with typos** when applying the type chart. Cost an iteration. Lesson: build the spec from the doc's chart row-by-row and double-check diagonals (Dark→Dark, Dragon→Dragon, etc.) — those are easy to misread.
8. **Assumed Cosmic resists `'Cosmic'` was 0 (neutral)** when the spec doc had an internal inconsistency (chart vs text). Always cross-reference doc sections when applying spec changes; flag inconsistencies to the user.
9. **Misread "Dark → Cosmic" chart cell** vs the text spec saying Cosmic resists Dark. Flagged it to user; followed the text. Lesson: doc inconsistencies happen — surface them transparently rather than picking silently.
10. **Sprite redirects used `toID`-format IDs (`'venusaurmegax'`) instead of spriteid-format (`'venusaur-megax'`).** Icons worked (they use `toID`) but sprite redirects never fired (they use `species.spriteid` which has hyphens). Three pushes were wasted. Lesson: always verify the format of the value being compared — `species.id` and `species.spriteid` are different namespaces. See §15 for the full breakdown.
11. **Assumed home-centered sprites exist for Mega forms.** They don't — HOME doesn't include Mega forms. Mega sprites live in `sprites/dex/` or `sprites/gen5/` or `sprites/ani/`. Lesson: before writing a sprite redirect, use WebFetch to confirm the target URL actually returns 200.
12. **Re-fetched `Dex.species.get('venusaurmega')` in `getTeambuilderSpriteData` to update the species for directory logic** — but `venusaurmega` was removed from our pokedex (replaced by Mega-X/Y), so `exists=false` triggered the early return. Lesson: when redirecting sprites, return early with an explicit `{spriteDir, spriteid}` object rather than trying to re-derive the species.
13. **`onModifySTAB` is not available in `rulesets.ts` ValidatorRules**, only in the `Scripts` export or directly on the format object. Also can't go in `data/mods/champions/scripts.ts` as a `Battle.prototype` method because those are non-event hooks. Lesson: format-level battle event handlers go directly on the format definition object in `config/formats.ts`.
14. **Used `this.activeMove!.type` in `onModifySTAB`** in an early draft. Wrong — the move is the 4th argument `(stab, attacker, defender, move)`, not `this.activeMove`. Lesson: always check the event handler signature before referencing `this.*` — some events pass their subject as arguments.
15. **package-lock.json drift causes `npm ci` failures in the build bat.** When npm packages auto-update in the worktree, committing only `package.json` but not `package-lock.json` means `node build full` (which clones fresh and runs `npm ci`) fails with lock mismatch. Always commit `package-lock.json` alongside any package changes.
16. **Stacking a display element above an input in the same float cell raises the input.** If you add an element above an input in a `float:right` cell, the input moves down by that element's height. To add visual elements above a cell's input without displacing it, use `position:absolute` with a negative `top` value on the overlay element, anchored to a `position:relative` cell.
17. **Content-box inputs vs border-box display divs mismatch.** When matching a `<div>`'s visual size to a `<input>`, remember the input is content-box in the PS client. A `<div>` with `box-sizing: border-box; width: 108px` has the same visual width as an `<input>` with `box-sizing: content-box; width: 104px; padding: 1px; border: 1px`.
18. **Negative `top` absolute children appear outside the cell boundary, and that's fine.** `position:absolute; top:-13px` on a child of a `position:relative` float cell causes the child to appear 13px above the cell's top edge. Default `overflow: visible` lets it show. Adjacent cells at the same row don't conflict as long as horizontal positions don't overlap.
19. **Stale `dist/data/mods/champions/` files silently shadow base data.** When the original champions mod data files were deleted from source (Step 3), `node build` left their compiled `.js` counterparts in `dist/data/mods/champions/` untouched. The dex merge logic uses child-wins-on-conflict: if a species key exists in the mod's learnsets/abilities/moves/etc., it *replaces* the base entry for that species rather than merging. Charizard had an entry in the old champions `learnsets.js`, so `Dex.mod('champions').species.getLearnsetData('charizard')` returned the stale champion-game learnset instead of the updated base learnset. The worktree's dist was clean (no stale files) so validation passed there but failed on the running server. **Fix: manually delete any `.js`/`.js.map` file in `dist/data/mods/champions/` that has no corresponding `.ts` source file.** `node build` never deletes orphaned artifacts. Current legitimate champions dist files are: `conditions.js`, `rulesets.js`, `scripts.js` (plus `.map` siblings). If you see `abilities.js`, `formats-data.js`, `items.js`, `learnsets.js`, or `moves.js` in that folder, delete them — they are stale.

20. **`this.battle.hasPseudoWeather()` in the CLIENT uses the condition's `name`, not its ID.** The `-fieldstart` handler in `battle.ts` does `this.addPseudoWeather(effect.name, ...)` where `effect.name` is the human-readable name (e.g. `"Fire Domain"`). So client checks must use **`this.battle.hasPseudoWeather('Fire Domain')`** (capital F, with space) — NOT `'firedomain'`. Meanwhile the move definition's `pseudoWeather:` field and the server's `this.field.pseudoWeather` map both use the lowercase ID `'firedomain'`. This asymmetry is Showdown's own pattern (it matches how Electric Terrain etc. are checked on the client).

21. **Domain type list is duplicated in two places in `battle-tooltips.ts`.** `calculateModifiedStats` (stat boost display) and `showMoveTooltip` (accuracy breakdown) each have their own inline `[string, string][]` array mapping domain name to type name. If you add a new domain type, **update both arrays**. The arrays are defined near `return stats` in `calculateModifiedStats` and near the accuracy display line in `showMoveTooltip`.

22. **"Cannot Miss" (accuracy value 0) correctly skips domain accuracy breakdown.** `ModifiableValue.toString()` returns `"Cannot Miss"` when `value === 0` with `isAccuracy === true`. My domain accuracy display code gates on `accuracy.value > 0`, so moves affected by No Guard, sure-hit status moves, etc. still show "Cannot Miss" without a spurious breakdown. If you see "Cannot Miss" on a move that has numeric accuracy, check whether the Pokémon has No Guard — it zeroes accuracy first and returns early from `getMoveAccuracy`.

23. **Domain moves use the lowercase condition ID in `pseudoWeather:`, while condition names use Title Case with a space.** Move definition: `pseudoWeather: 'firedomain'` (lowercase, no space). Condition `name`: `"Fire Domain"` (Title Case, space). The `battle-actions.ts` engine converts the move's `pseudoWeather` field to a condition lookup by ID, which finds `firedomain` in conditions and uses its `.name` for the `-fieldstart` message. So the client ends up tracking `"Fire Domain"` in its pseudoWeather array, not `"firedomain"`. Keep this distinction in mind whenever reading or checking domain state.

24. **`onHit` + `this.damage()` silently fails for Status moves with `basePower: 0`.** `getDamage` returns `undefined` early when `!basePower` — it never reaches the `damageCallback` check. When `spreadMoveHit` receives `undefined` damage it exits without inflicting anything. The move "announces" but no damage is dealt. Fix: use `category: "Physical"` + `damageCallback` + `ignoreImmunity: true` (exactly the pattern used for confusion self-damage). The `damageCallback` field is checked BEFORE the `!basePower` early return, so it always runs.

25. **`duration: 2` counts residuals, not "effective turns".** When a volatile is applied after the target already moved (e.g. Hypno slower), the residual fires at end of the SAME turn — decrementing duration to 1 and leaving only ONE effective turn of control instead of two. If your mechanic needs "N times the target's move slot is consumed", do NOT use `duration`. Use a manual `instances` counter in `onResidual` and only decrement it when `target.moveThisTurn` reflects the target actually acting (or failing to act due to a condition-applied flinch). See §21 for the full Mind Control instance-tracking pattern.

26. **`deductPP` returns false for moves not in the Pokémon's moveset, triggering the "no PP left" bail.** When the MC user submits `mindcontrolselfdamage` for the MC'd Pokémon, `runMove` calls `pokemon.deductPP('mindcontrolselfdamage')`, which walks `moveSlots` looking for the ID and returns false when not found. The battle then adds `cant` with reason `nopp` and cancels the move. Fix: add `externalMove: true` to the `ChosenAction` in `chooseControlled()` and thread it through `MoveAction` → `runMove` options. The `externalMove` flag bypasses `deductPP` entirely (same mechanism Dancer uses). Must be declared in both `ChosenAction` (side.ts) and `MoveAction` (battle-queue.ts) for TypeScript to accept it.

27. **Inline `getTimerHTML()` in a `whatdo` div adds to the div's flow height, pushing elements below.** The timer button has non-trivial height. If it word-wraps to a new line inside `whatdo`, the entire `movecontrols` section below is pushed down — visually the 4th move slot appears oddly low. Fix: wrap the timer call in `<span style="float:right">`, which takes it out of the normal flow. The `whatdo` text is then a single line and the move buttons sit at their correct height.

28. **The Preact client's `/cancel` command is safe to use as a "Back" button from the MC panel.** The `'cancel,undo'` handler in `panel-chat.tsx` first checks `room.choices.isDone() || room.choices.isEmpty()` — if either is true it sends `/undo` to the server. When the player is in the MC panel, `isDone()` is false (controlled choices not done) and `isEmpty()` is false (own move is chosen), so `/undo` is NOT sent. The handler then does `room.choices = new BattleChoiceBuilder(room.request)` which resets all local choice state (own choices AND controlledChoices cleared) and triggers a re-render back at the own-move picker. No server state is disturbed.

29. **The existing `bullet` flag (Bulletproof hook) doubles as the "Bullet" screen-bypass category.** All canonical Bullet-category moves (Bullet Seed, Rock Blast, Gyro Ball, etc.) already had `bullet: 1` for Bulletproof interactions. There is no second `bulletcategory` flag. When implementing screen bypass, add `&& !move.flags['bullet']` to the existing screen conditions' `onAnyModifyDamage` in `data/moves.ts` — don't create a new flag.

30. **`getEffectiveness()` returns 0 (neutral) for immune type matchups, not a large negative.** In `sim/dex.ts`, `damageTaken = 3` maps to `case 3:` which falls through to `default: return 0`. So bypassing type immunity with `move.ignoreImmunity = true` naturally produces typeMod = 0 (1× damage floor) with no extra work. The explicit `if (move.flags['bone'] && typeMod < 0) typeMod = 0` clamp in getDamage is a defensive guard for edge cases only.

31. **Wonder Guard lacks `flags['breakable']` — `move.ignoreAbility = true` does NOT bypass it.** `suppressingAbility()` in `battle.ts` only suppresses abilities that have `effect.flags['breakable']`. Wonder Guard intentionally omits this flag. To bypass Wonder Guard for Bone moves, skip the entire `hitStepTryHitEvent` by returning `new Array(targets.length).fill(true)` before `runEvent('TryHit', ...)` is called — `move.ignoreAbility` alone won't do it.

32. **The Mold Breaker mechanism is two-part: `move.ignoreAbility = true` PLUS `effect.flags['breakable']` on the ability.** `suppressingAbility()` returns true only when both conditions hold. Setting `ignoreAbility` on a move only affects abilities that explicitly opted in via `breakable: 1` in their definition. Abilities like Wonder Guard (and any custom ability without `breakable`) are unaffected.

33. **The hit pipeline in `trySpreadMoveHit` runs 8 ordered steps.** In gen ≥ 7: 0 InvulnerabilityEvent → 1 TryHitEvent → 2 TypeImmunity → 3 TryImmunity → 4 Accuracy → 5 BreakProtect → 6 StealBoosts → 7 MoveHitLoop. In gen ≤ 6, steps 1 and 2 are swapped (TypeImmunity runs before TryHitEvent). Bone bypasses steps 0–3 individually by returning `new Array(targets.length).fill(true)` in each hitStep* function.

34. **`runImmunity()` fast-returns `true` when `source.ignoreImmunity === true`.** In `sim/pokemon.ts` (line ~2268), the very first check is `if (source && source.ignoreImmunity === true) return true`. This short-circuits ALL subsequent logic — the type chart lookup, `isGrounded()` for Ground immunity (which also handles Levitate and Magnet Rise volatile), and the `hasType('Flying')` ground-exemption. Setting `move.ignoreImmunity = true` in `hitStepTypeImmunity` is the cleanest single-line bypass for all type-based and grounding-based immunities simultaneously.

---

## 17. Battle tooltip system (session 4)

The move base-power tooltip in `play.pokemonshowdown.com/src/battle-tooltips.ts` was significantly reworked. Key classes and fields:

### `ModifiableValue` class

Tracks a move's effective base power as it's modified by abilities, terrain, weather, etc.

| Field | Purpose |
|---|---|
| `value: number` | Current numeric BP |
| `maxValue: number` | Range max (for spread/multi-hit with variable BP) |
| `comment: string[]` | Display strings shown in default tooltip (NOT for ability mods anymore) |
| `abilityMods: {label: string, factor: number}[]` | **NEW** — ability multipliers, suppressed from default display but available for Alt chain |

`reset()` clears all four fields including `abilityMods`.

### `abilityModify(factor, abilityName)` — key behavior change

Previously called `this.modify(factor, abilityName)` which added a `(1.2× from Iron Fist)` comment to `this.comment`. Now:
- Checks `tryAbility(abilityName)` as before
- Pushes `{label: abilityName, factor}` to `this.abilityMods` instead of calling `modify`
- Applies the factor inline (with the Technician `maxValue` guard preserved: `if (!(abilityName === 'Technician' && this.maxValue > 60))`)
- **Result**: ability modifiers are invisible in the default `Base power: N` line but appear in the Alt chain

### Default display (no Alt held)

```
Base power: 90
```

Just the raw BP. No ability commentary.

### Alt chain display (Alt held)

```
True Power: 90 × Primary STAB (×1.5) × Iron Fist (×1.2) = 162
```

Logic in `showMoveTooltip`:
1. Get `abilityModProduct = value.abilityMods.reduce((p,m) => p * m.factor, 1)`
2. Back-calculate `rawBP = Math.round(value.value / abilityModProduct)`
3. Determine STAB: `pokemon.getTypes(serverPokemon)` returns `[mainTypes, addedType]`; `mainTypes[0]` = primary, `mainTypes[1]` = secondary
4. STAB labels: `Pure STAB (×1.6)` / `Primary STAB (×1.5)` / `Secondary STAB (×1.4)` / `Adaptability (×2)` — Adaptability check via `ability === 'adaptability'`
5. Chain = `rawBP × ${stabLabel} × ${abilityLabel} = ${finalBP}`

### Alt key toggling

`BattleTooltips.altHeld` — static boolean, toggled by a namespaced handler in `listen()`:

```typescript
$(document).off('keydown.alttooltip keyup.alttooltip').on('keydown.alttooltip keyup.alttooltip', ...)
```

On toggle, calls `BattleTooltips.hideTooltip()` then `this.showTooltip(BattleTooltips.parentElem)` to re-render in place without mouse movement. `parentElem` is the currently-hovered element (tracked by existing Showdown code).

### Type-order STAB (server-side damage calc)

`onModifySTAB` on the format object in `config/formats.ts`:

```typescript
onModifySTAB(stab, attacker, defender, move) {
    if (stab <= 1) return stab;                          // no STAB
    if (attacker.hasAbility('adaptability')) return stab; // preserve Adaptability
    const types = attacker.types;
    if (!types.includes(move.type)) return stab;          // forceSTAB edge case
    if (types.length === 1) return 1.6;                   // pure type
    if (types[0] === move.type) return 1.5;               // primary
    return 1.4;                                           // secondary
},
```

This fires AFTER ability handlers (Adaptability gets its stab=2 result first and the format handler passes it through). The handler is on the format definition object because format objects are battle conditions and support `on*` event handlers.

### Domain additions to the tooltip system (session 8–9)

**Stat boost display** — `calculateModifiedStats` applies domain boosts just before `return stats`:
```typescript
const domainTypeEntries: [string, string][] = [
    ['Fire Domain', 'Fire'], ['Water Domain', 'Water'], ... // all 19
];
for (const [domainName, typeName] of domainTypeEntries) {
    if (this.battle.hasPseudoWeather(domainName) && this.pokemonHasType(pokemon, typeName as Dex.TypeName)) {
        stats.atk = Math.floor(stats.atk * 1.25);
        stats.def = Math.floor(stats.def * 1.25);
        stats.spa = Math.floor(stats.spa * 1.25);
        stats.spd = Math.floor(stats.spd * 1.25);
        // No break — dual-type Pokémon get multiple domain boosts if both domains are active
    }
}
```
The `renderStats` function compares these boosted values to the base `serverPokemon.stats` and applies `class="stat-boosted"` (green) automatically.

**Accuracy breakdown in Alt display** — replaces the plain accuracy line in `showMoveTooltip`:
```
Default:   Accuracy: 85%
Alt held:  Accuracy: 85% × Fire Domain (×1.1) = 93.5%
```
Gated on `accuracy.value > 0` — moves that show "Cannot Miss" (value = 0) skip the breakdown.

**"Cannot Miss" label** — `ModifiableValue.toString()` was changed from `"can't miss"` to `"Cannot Miss"`.

---

## 18. Champions-mode dual-ability teambuilder UI (session 5)

The legacy teambuilder (`client-teambuilder.js`) now renders a champions-specific ability cell layout that shows both the awakened (hidden) ability and the basic ability.

### HTML structure in champions mode (inside `setcol-details`)

```html
<!-- setrow-icons row — unchanged, just item icon -->
<div class="setrow setrow-icons">
  <div class="setcell"><span class="itemicon">...</span></div>
</div>

<!-- item + ability row -->
<div class="setrow">
  <div class="setcell setcell-item"><label>Item</label><input name="item"></div>
  <div class="setcell setcell-ability-champions">  <!-- position:relative; padding-top:13px; float:right -->
    <label>Abilities</label>                        <!-- abs: top:-26px, right:3px, width:108px -->
    <div class="awakenedability-display">...</div>  <!-- abs: top:-13px, right:3px, margin:0 -->
    <input name="ability">                          <!-- in-flow; padding-top pushes to Y=99 -->
  </div>
</div>
```

### Y coordinate positions from `setcol-details` top (content-box input assumption)

| Element | Y range | How |
|---|---|---|
| Details row | 0–60px | `height: 60px` |
| Icons row | 60–84px | `height: 24px` |
| "Abilities" label | 58–71px | `top: -26px` from cell at Y=84 |
| Awakened display | 71–95px | `top: -13px` from cell at Y=84 ← same Y as move slot 3 |
| Ability input | Y=99 start | `padding-top: 13px` + input `margin-top: 2px` |
| Gap display→input | 4px | = move slot 3→4 gap |

### Key CSS classes added

| Class | Rule |
|---|---|
| `.setcell-ability-champions` | `float:right; padding-top:13px; position:relative` |
| `.setcell-ability-champions > label` | `position:absolute; top:-26px; right:3px; width:108px` |
| `.setcell-ability-champions .awakenedability-display` | `position:absolute; top:-13px; right:3px; margin:0` |
| `.awakenedability-display` | read-only display box: `box-sizing:border-box; width:108px; height:24px; background:#EEEEEE; color:#555555; font-size:9pt; line-height:20px; border:1px solid #AAAAAA; border-radius:3px; padding:1px 3px` |

### Awakened ability content source

`species.abilities['H']` (the hidden ability field). Fallback: `'&mdash;'` as a raw HTML entity — **do not** pass this through `BattleLog.escapeHTML` or it becomes `&amp;mdash;`.

### `battle-team-editor.tsx` NOT updated

The Preact teambuilder has not been updated with these champions UI changes. Required Preact changes mirror the JS: detect champions mode in the ability cell render, emit the awakened display div + "Abilities" label, and omit the per-input "Ability" label.

---

## 19. Domain system technical reference

### What domains are

Domains replace terrains as the field-effect mechanic. 19 types, one domain per type (including Cosmic). Key differences from canon terrains:
- Use **pseudoWeather** (not the terrain slot) → multiple domains can be active simultaneously
- **No grounding requirement** — affect ALL Pokémon on the field unconditionally
- Each domain's condition ID is `{type}domain` (lowercase, no space): `firedomain`, `waterdomain`, etc.
- Each domain's condition name is `"{Type} Domain"` (Title Case, with space): `"Fire Domain"`, etc.

### ID vs. name — the critical distinction

| Context | Form | Example |
|---|---|---|
| Move definition `pseudoWeather:` field | Lowercase ID | `'firedomain'` |
| Server: `this.field.pseudoWeather['firedomain']` | Lowercase ID | `'firedomain'` |
| Server: `this.field.addPseudoWeather('firedomain', source)` | Lowercase ID | `'firedomain'` |
| Client: `this.battle.hasPseudoWeather('Fire Domain')` | Title Case name | `'Fire Domain'` |
| Battle log `-fieldstart` arg | `"move: Fire Domain"` prefix | `'move: Fire Domain'` |

The mismatch exists because `battle.ts`'s `-fieldstart` handler calls `Dex.getEffect(args[1])` on the `"move: Fire Domain"` string, gets the condition, and stores `effect.name` (= `"Fire Domain"`) in `this.pseudoWeather`. So the client always knows domains by name, never by ID.

### Effects (current spec)

All 19 domains apply the same effect pattern, only the type differs:

```typescript
// In data/mods/champions/conditions.ts
onModifyAtkPriority: 5,
onModifyAtk(atk, attacker) {
    if (attacker.hasType('Fire')) return this.chainModify([5120, 4096]); // ×1.25
},
onModifySpAPriority: 5,
onModifySpA(spa, attacker) {
    if (attacker.hasType('Fire')) return this.chainModify([5120, 4096]);
},
onModifyDefPriority: 6,
onModifyDef(def, target) {        // target = the DEFENDING Pokémon
    if (target.hasType('Fire')) return this.chainModify([5120, 4096]);
},
onModifySpDPriority: 6,
onModifySpD(spd, target) {
    if (target.hasType('Fire')) return this.chainModify([5120, 4096]);
},
onModifyAccuracy(accuracy, target, source, move) {
    if (typeof accuracy !== 'number') return; // skip Cannot Miss
    if (move.type === 'Fire') return this.chainModify(1.1);
},
```

`[5120, 4096]` = 5120/4096 = exactly ×1.25. Using the fractional form preserves Showdown's internal chain-modifier precision.

### Domain moves

| Move name | Move ID | Num | pseudoWeather |
|---|---|---|---|
| Domain: Normal | `domainnormal` | -114 | `normaldomain` |
| Domain: Fire | `domainfire` | -108 | `firedomain` |
| Domain: Water | `domainwater` | -119 | `waterdomain` |
| Domain: Electric | `domainelectric` | -105 | `electricdomain` |
| Domain: Grass | `domaingrass` | -111 | `grassdomain` |
| Domain: Ice | `domainice` | -113 | `icedomain` |
| Domain: Fighting | `domainfighting` | -107 | `fightingdomain` |
| Domain: Poison | `domainpoison` | -115 | `poisondomain` |
| Domain: Ground | `domainground` | -112 | `grounddomain` |
| Domain: Flying | `domainflying` | -109 | `flyingdomain` |
| Domain: Psychic | `domainpsychic` | -116 | `psychicdomain` |
| Domain: Bug | `domainbug` | -101 | `bugdomain` |
| Domain: Rock | `domainrock` | -117 | `rockdomain` |
| Domain: Ghost | `domainghost` | -110 | `ghostdomain` |
| Domain: Dragon | `domaindragon` | -104 | `dragondomain` |
| Domain: Dark | `domaindark` | -103 | `darkdomain` |
| Domain: Steel | `domainsteel` | -118 | `steeldomain` |
| Domain: Fairy | `domainfairy` | -106 | `fairydomain` |
| Domain: Cosmic | `domaincosmic` | -102 | `cosmicdomain` |

All moves: Status, `accuracy: true`, `basePower: 0`, `pp: 10`, `target: "all"`, `flags: {}`. Type matches the domain type.

### Custom move num registry

| Range | Assigned to |
|---|---|
| -2 | Shadow Strike |
| -3 | Polar Flare |
| -4 | Mind Controlled (the move Hypno uses, `mindcontrolledtest`) |
| -5 | Mind Control: Self-Hit (`mindcontrolselfdamage`) |
| -101…-119 | Domain: Bug through Domain: Water (alphabetical by ID) |

### Dual-type stacking

If two domains are simultaneously active and a Pokémon is dual-typed (e.g. Charizard Fire/Flying with Fire Domain + Flying Domain), both domains fire their `onModifyAtk` etc. handlers independently. The stat gets boosted twice: ×1.25 × ×1.25 = ×1.5625. The client tooltip also applies both boosts (the `domainTypeEntries` loop has no `break`).

### Adding a new domain (checklist)

1. Add condition to `data/mods/champions/conditions.ts` with all 5 stat/accuracy handlers
2. Add move to `data/moves.ts` with `pseudoWeather: '{type}domain'` and next available num
3. Add learnset entry to `data/learnsets.ts` for any Pokémon that should know it
4. Update the domain type list in `battle-tooltips.ts` — it appears in **two** places:
   - `calculateModifiedStats` (stat boost display)
   - `showMoveTooltip` (accuracy Alt breakdown)
5. Run `node build` on server, `node build` on client, push both, run the bat

---

## 20. Mind Control system technical reference

### Overview

Mind Control is a volatile status (`mindcontrolled`) that lets the MC user's player pick moves for the afflicted Pokémon. It's analogous to Freeze/Thaw in that it lasts a fixed number of "instances" (effective turn consumptions), not a fixed number of calendar turns.

### Duration: instance-based, not turn-based

`mindcontrolled` has NO `duration` field. It uses a manual `instances: 2` counter managed in `onResidual`.

**What counts as an instance:**
- The flinch firing on the application turn (Hypno faster — target couldn't move)
- Each turn the MC'd Pokémon uses a forced MC'd move

**What does NOT count as an instance:**
- The application turn when the target already moved (Hypno slower — `moveThisTurn` non-empty, flinch not added)
- Turns where the target couldn't move for an unrelated reason (sleep, full paralysis, etc.) — those don't decrement

**`onStart` logic:**
```typescript
onStart(target, source) {
    target.volatiles['mindcontrolled'].instances = 2;
    target.volatiles['mindcontrolled'].firstResidual = true;
    // Only add flinch if target hasn't moved yet this turn
    if (!target.moveThisTurn) target.addVolatile('flinch');
}
```

**`onResidual` logic (onResidualOrder: 11):**
```typescript
onResidual(target) {
    const volatile = target.volatiles['mindcontrolled'];
    if (volatile.firstResidual) {
        volatile.firstResidual = false;
        if (!target.moveThisTurn) volatile.instances--; // flinch fired
        // if target already moved (Hypno slower): skip
    } else {
        if (target.moveThisTurn) volatile.instances--; // forced move used
    }
    if (volatile.instances <= 0) target.removeVolatile('mindcontrolled');
}
```

**Case walkthrough:**

| Scenario | Turn T | Residual T | Turn T+1 | Residual T+1 | Turn T+2 | Residual T+2 |
|---|---|---|---|---|---|---|
| Hypno faster | target flinches | instances 2→1 | forced move | instances 1→0 → expire | — | — |
| Hypno slower | target moves freely, MC applied | instances stays 2 | forced move | instances 2→1 | forced move | instances 1→0 → expire |

### `mindcontrolselfdamage` move

The "Self-Hit" option in the MC panel. Key fields:
```typescript
{
    category: "Physical",   // NOT Status — Status hits getDamage's basePower:0 early-return
    basePower: 0,
    damageCallback(pokemon) { return this.actions.getConfusionDamage(pokemon, 40); },
    ignoreImmunity: true,   // Ghost-type bypass
    isNonstandard: "Custom",
}
```
`damageCallback` is checked BEFORE the `!basePower` early-return in `getDamage`, so it always fires. The move must be submitted with `externalMove: true` (set in `chooseControlled()` in `side.ts`) to bypass `deductPP` — since `mindcontrolselfdamage` is not in the MC'd Pokémon's moveset, `deductPP` would otherwise return false and trigger "no PP left."

### `mindcontrolledtest` move (the actual Mind Controlled move)

Key `onTryHit` behavior:
```typescript
onTryHit(target) {
    if (target.hasType('Psychic')) { this.add('-immune', target); return null; }
    if (target.volatiles['mindcontrolled']) { this.add('-immune', target); return null; }
}
```
- Psychic types are permanently immune
- Already-MC'd targets are immune (prevents reapplication AND prevents re-granting flinch)

### externalMove flag threading

`externalMove: true` must be declared and passed through four files:
1. `sim/side.ts` — `ChosenAction` interface: `externalMove?: boolean`; set to `true` in `chooseControlled()` for the selfdamage action
2. `sim/battle-queue.ts` — `MoveAction` interface: `externalMove?: boolean`
3. `sim/battle.ts` — move-action resolver passes `externalMove: action.externalMove` to `runMove`
4. `sim/battle-actions.ts` — `runMove` reads `options?.externalMove` and skips `deductPP` when true

### Client-side MC panel structure

**Legacy (`client-battle.js`):**
```javascript
'<div class="whatdo">' +
'<button name="clearChoice">Back</button> ' +
'Mind Control: Choose for <strong>' + name + '</strong>! ' +
'<span style="float:right">' + this.getTimerHTML() + '</span>' +
'</div>' +
'<div class="movecontrols"><div class="movemenu">' + movebuttons + specialButtons + '</div></div>'
```
- `name="clearChoice"` → calls `clearChoice()` → `this.choice = null` → re-render from own-move selection
- Timer in `float:right` span → doesn't add height to the `whatdo` div

**Preact (`panel-battle.tsx`):**
```tsx
<div class="whatdo">
    <button data-cmd="/cancel" class="button">Back</button> {}
    {this.renderOldChoices(request, choices)}
    Choose a move for your opponent's <strong>{controlledPokemonName}</strong>!
</div>
```
- `data-cmd="/cancel"` → handled by `'cancel,undo'` in `panel-chat.tsx` → `room.choices = new BattleChoiceBuilder(room.request)` (no `/undo` sent — safe because choices aren't done or empty)

### Request protocol

When a Pokémon is MC'd, `getRequests()` in `battle.ts`:
- Sends `{wait: true}` to the MC'd player's side
- Injects `controlledActive` (the MC'd Pokémon's move data) and `controlledSide` (their team info) into the MC user's request

Submission format: `"move 1, controlled move 2"` — own move first, then controlled move. The server's `side.choose()` splits on `, ` and routes `"controlled move N"` to `chooseControlled()`.

---

## 21. Tone / collaboration notes

The user is technical enough to follow detailed explanations but not deep into Showdown internals. They want:
- Concise summaries of what changed and why
- A clear "your turn — run the bat and check X" handoff at the end of each push
- To be told when there's a doc inconsistency or ambiguous spec rather than have you guess silently
- To be asked before destructive operations (large deletes, force pushes) — they OK'd most operations along the way but appreciate the confirmation

They iterate. They'll often realize partway through that they want something slightly different. Don't push back on revisions; just implement them. Use `AskUserQuestion` when there's a genuine fork in the design — they appreciate being asked rather than having you commit to one path.

They use a Windows machine with PowerShell. Use `Set-Location` and `Remove-Item` in PowerShell tool, not POSIX equivalents. Path separators: backslashes for Windows-style paths in tool args.

---

---

## 22. Move category system technical reference

### Overview

§5 of the master reference defines 11 new move category flags. Most are tag-only (for ability hooks); a few have inherent mechanical effects. The existing `bullet` flag predates this session but gained a second mechanical effect during it.

| Flag | Status | Mechanical effect |
|---|---|---|
| `ball` | Tag only | None inherent — for BulletProof-style ability hooks |
| `beam` | Tag only | None inherent |
| `bone` | **Implemented** | Bypasses all immunities; neutral damage floor |
| `bursting` | Pending | On hit, also strike each adjacent target at 25% base power |
| `corrosive` | Pending | Poison moves: no SE vs Grass/Fairy (→1×); always 2× SE vs Steel |
| `exploding` | Tag only | None inherent |
| `heavyprojectile` | Tag only | None inherent |
| `kicking` | Tag only | None inherent |
| `light` | Tag only | None inherent |
| `piercing` | **Implemented** | Bypasses Protect/Detect at 50% damage |
| `vine` | Tag only | None inherent |

The pre-existing `bullet` flag also has a mechanical effect (added this session):
- **Bullet**: bypasses Reflect, Light Screen, and Aurora Veil

### Hit pipeline — `trySpreadMoveHit` in `sim/battle-actions.ts`

8 ordered steps (gen ≥ 7; in gen ≤ 6, steps 1 and 2 are swapped):

| Step | Function | What it does | Bone bypass |
|---|---|---|---|
| 0 | `hitStepInvulnerabilityEvent` | Blocks vs. semi-invulnerable targets (Dig, Fly, Phantom Force, etc.) | `return new Array(targets.length).fill(true)` at top |
| 1 | `hitStepTryHitEvent` | Fires `TryHit` event — Wonder Guard, Flash Fire, Volt Absorb, Sap Sipper, Air Balloon, etc. | `return fill(true)` before `runEvent('TryHit', ...)` |
| 2 | `hitStepTypeImmunity` | Type chart 0× matchups + `isGrounded()` (Levitate, Magnet Rise) | `move.ignoreImmunity = true` |
| 3 | `hitStepTryImmunity` | Powder immunity, `TryImmunity` event | `return fill(true)` at top |
| 4 | `hitStepAccuracy` | Accuracy roll | Normal |
| 5 | `hitStepBreakProtect` → `checkMoveBypassesProtect` | Protect/Detect block | Piercing: sets `piercingHit = true`, returns `true` |
| 6 | `hitStepStealBoosts` | Spectral Thief | Normal |
| 7 | `hitStepMoveHitLoop` → `getDamage` | Damage calculation | Bone: `typeMod = max(0, typeMod)`; Piercing: `baseDamage × 0.5` |

### Bullet screen bypass

All three screen conditions in `data/moves.ts` (`reflect`, `lightscreen`, `auroraveil`) have this guard added to their `onAnyModifyDamage` handler:

```typescript
if (!crit && !infiltrates && !move.flags['bullet']) {
    // apply damage reduction
}
```

When `move.flags['bullet']` is set, the reduction block is skipped entirely.

### Piercing protect bypass

`checkMoveBypassesProtect` in `sim/battle.ts` — inside the block where protect would block a non-status move:

```typescript
if (move.flags['piercing']) {
    defender.getMoveHitData(move).piercingHit = true;
    return true; // move hits through protect at reduced damage
}
return false; // normally blocked
```

`getDamage` in `sim/battle-actions.ts` — after the Z-move `bypassProtect` block:

```typescript
if (target.getMoveHitData(move).piercingHit) {
    baseDamage = this.battle.modify(baseDamage, 0.5);
}
```

### Bone immunity bypass

Four locations in `sim/battle-actions.ts`:

**`hitStepInvulnerabilityEvent`** — first line inside the function body:
```typescript
if (move.flags['bone']) return new Array(targets.length).fill(true);
```

**`hitStepTryHitEvent`** — before the `runEvent('TryHit', ...)` call (bypasses Wonder Guard, Flash Fire, Volt Absorb, Sap Sipper, Air Balloon, etc.):
```typescript
if (move.flags['bone']) return new Array(targets.length).fill(true);
```

**`hitStepTypeImmunity`** — at the top (causes `runImmunity()` in `pokemon.ts` to fast-return `true` before type chart and `isGrounded()` checks, handling Levitate + Magnet Rise):
```typescript
if (move.flags['bone']) move.ignoreImmunity = true;
```

**`hitStepTryImmunity`** — first line:
```typescript
if (move.flags['bone']) return new Array(targets.length).fill(true);
```

**Damage floor in `getDamage`** (normally redundant — `getEffectiveness()` returns 0 for immune matchups anyway, but guards edge cases):
```typescript
let typeMod = target.runEffectiveness(move);
typeMod = this.battle.clampIntRange(typeMod, -6, 6);
if (move.flags['bone'] && typeMod < 0) typeMod = 0;
target.getMoveHitData(move).typeMod = typeMod;
```

### Moves with bone flag applied (current)

| Move | Flag |
|---|---|
| Bone Club | `bone: 1` |
| Bonemerang | `bone: 1` |
| Bone Rush | `bone: 1` |
| Shadow Bone | `bone: 1` |

### Pending: bursting

On hit, also strike each adjacent target at 25% base power. Needs multi-target secondary hit logic — not yet started.

### Pending: corrosive

Custom Poison-type matchup overrides:
- Poison-type moves no longer deal SE damage vs Grass or Fairy (→ 1× neutral)
- Poison-type moves always deal 2× SE vs Steel (Steel no longer resists Poison)

Implementation will require hooking into `runEffectiveness` or the type chart event system. Not yet started.

---

*This file is committed to the repo and loaded automatically by Claude Code. For ability-specific conventions, implementation modes, and the abilities reference table, see `CLAUDE_ABILITIES.md` (attach manually via `@C:\Users\primo\Downloads\CLAUDE_ABILITIES.md` when doing ability work).*
