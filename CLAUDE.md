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

### Abilities work (sessions 6+)
- Custom `origin` field added to `Ability` class (`sim/dex-abilities.ts`) and displayed in `/dt` output (`server/chat-commands/info.ts`) in place of generation number
- Abilities implemented through rows 1–25 of the TSV design doc; see `CLAUDE_ABILITIES.md` for the full reference table and conventions

---

## 13. Open questions / likely next steps

Based on the master reference's roadmap (line 19-25):

- **"Plan 2: Edit stats for Generation 1 Pokémon"** — the user has been doing this in `data/formats-data.ts` and `data/pokedex.ts`. They tag reworked species with `*` and new species with `**` (suffix notation in their Pokemon_Reworked.tsv — see master ref §"File Conventions").
- **"Plan 3: Add a few New Pokémon"** — the `isNonstandard: 'custom'` (lowercase) tag is ready to bucket these under a "Custom" UI header.
- **"Plan 4: Add mechanical/functionality changes"** — the master reference §1.5 (Blanket Type Effects), §2 (Weather), §3 (Terrain), §4 (Status Conditions), §5 (Move Categories), ~~§6 (Typing Order STAB — DONE)~~, §7 (Speed Ties), §8 (Dual Ability System), §11 (Generation Gimmick Reworks) all describe pending mechanical work.
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

## 19. Tone / collaboration notes

The user is technical enough to follow detailed explanations but not deep into Showdown internals. They want:
- Concise summaries of what changed and why
- A clear "your turn — run the bat and check X" handoff at the end of each push
- To be told when there's a doc inconsistency or ambiguous spec rather than have you guess silently
- To be asked before destructive operations (large deletes, force pushes) — they OK'd most operations along the way but appreciate the confirmation

They iterate. They'll often realize partway through that they want something slightly different. Don't push back on revisions; just implement them. Use `AskUserQuestion` when there's a genuine fork in the design — they appreciate being asked rather than having you commit to one path.

They use a Windows machine with PowerShell. Use `Set-Location` and `Remove-Item` in PowerShell tool, not POSIX equivalents. Path separators: backslashes for Windows-style paths in tool args.

---

*This file is committed to the repo and loaded automatically by Claude Code. For ability-specific conventions, implementation modes, and the abilities reference table, see `CLAUDE_ABILITIES.md` (attach manually via `@C:\Users\primo\Downloads\CLAUDE_ABILITIES.md` when doing ability work).*
