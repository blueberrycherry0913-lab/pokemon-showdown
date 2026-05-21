# Claude Working Guide — Custom Pokemon Fan-Game Showdown Server

This file is loaded automatically by Claude Code at session start. Read it before touching anything.

---

## Project Overview

This is a **custom Pokemon fan-game** using Pokemon Showdown as a playtesting sandbox. The goal is to implement custom and edited abilities (and eventually moves, items, etc.) from a design spreadsheet (TSV file) into the Showdown server and client.

There are **two separate repositories**:
- **Server**: `C:\Users\primo\Documents\GitHub\pokemon-showdown\`
  - Active work happens in a **git worktree**: `.claude\worktrees\<worktree-name>\`
  - Push command (from worktree): `git push origin HEAD:master`
- **Client**: `C:\Users\primo\Documents\GitHub\pokemon-showdown-client\`
  - Push command: `git push origin master`

---

## Standing Rules (Non-Negotiable)

1. **Never `git add -A` or `git add .`** — The `.claude/` directory is untracked and must never be committed. Always stage specific files: `git add data/abilities.ts`
2. **Never amend a pushed commit** — make a new commit instead.
3. **The client repo has uncommitted user changes** in `play.pokemonshowdown.com/js/client-endload.js` and `play.pokemonshowdown.com/src/battle-tooltips.ts`. Do not blow them away. Always `git add <specific-file>`.
4. **Always read a file before editing it** — the Edit tool will error if you haven't read the file first in the current session.
5. **Do not tell the user to relaunch until you have pushed** to the remote.
6. **Grammar and spelling errors can be fixed silently** — no need to ask.

---

## The Design Spreadsheet (TSV)

The user provides a TSV file (usually in `C:\Users\primo\Downloads\`) with these columns:

| Column | Meaning |
|--------|---------|
| Ability Name | Display name |
| Tags | Type tags, mechanical tags (e.g. `#Offensive`, `#OnSwitchIn`) |
| Hard Data | Technical implementation details — what the ability actually does |
| Changes/Notes | Notes about what differs from the canon ability |
| Description | Player-facing short description → goes in `shortDesc` |
| Origin | Classification (see below) |

### Origin Values

| Value | Meaning | Action |
|-------|---------|--------|
| `Unchanged` | No changes from canon Showdown | Add shortDesc + origin; do not touch mechanics |
| `Buffed` | Made stronger | Implement the buff; add shortDesc + origin |
| `Nerfed` | Made weaker | Implement the nerf; add shortDesc + origin |
| `Altered` | Changed but not clearly stronger/weaker | Implement the change; add shortDesc + origin |
| `Custom` | Completely new ability | Implement from scratch; add shortDesc + origin |
| `Depreciated` | Phased out; kept for compatibility | **Skip entirely** — do not implement or add fields |
| `Standby` | Planned but not ready yet | **Skip entirely** — do not implement or add fields |
| `Ready` / `Ready Edited` / `Ready Custom` | Designed and ready | Treat as full implementation target |

> **Note:** "Depreciated" is the user's spelling — do not correct it in origin strings, it has a specific meaning here.

---

## Three Implementation Modes

The user will tell you which mode to use. Respect the scope boundaries to conserve tokens.

### Description Mode
**Goal:** Update `shortDesc` and `origin` only.
- Read the TSV description column and set `shortDesc` to match (fixing any grammar/spelling).
- Set `origin` to the value from the Origin column.
- **Do not** read or modify event handlers, mechanical logic, or anything else about how the ability works.
- Ideal for: abilities marked Unchanged, or when the user wants to batch-update descriptions separately from mechanics.

### Effect Mode
**Goal:** Implement or update the mechanical behavior of abilities only.
- Read the Hard Data column and Changes/Notes column from the TSV.
- Implement the event handlers, stat interactions, etc.
- **Do not** touch `shortDesc` or `origin` fields — leave them as-is or add them only if completely absent and required for the file to be valid.
- Ideal for: batching mechanical changes without touching descriptions.

### Full Mode
**Goal:** Handle everything — mechanics AND descriptions.
- Implement mechanical changes from Hard Data + Changes/Notes.
- Set `shortDesc` from the Description column.
- Set `origin` from the Origin column.
- This is the default mode for new abilities or major reworks.

---

## Key Files

### Server (work in the worktree)
| File | Role |
|------|------|
| `data/abilities.ts` | All ability implementations — primary edit target |
| `sim/dex-abilities.ts` | `Ability` class definition — contains the `origin` field |
| `config/formats.ts` | Custom STAB system and format-level overrides |
| `server/chat-commands/info.ts` | `/dt` command — displays `Origin` instead of generation |
| `server/chat.ts` | `getDataAbilityHTML()` — uses `ability.shortDesc \|\| ability.desc` |

### Client (separate repo)
| File | Role |
|------|------|
| `play.pokemonshowdown.com/style/utilichart.css` | Teambuilder/search UI styles |
| `play.pokemonshowdown.com/style/battle-search.css` | Dex list view styles |

> When making CSS changes, **both CSS files must be updated together** — they style the same UI elements in different contexts.

---

## Ability Data Structure

Each ability in `data/abilities.ts` looks like this:

```typescript
abilityid: {
    // Event handlers (optional, depends on ability)
    onStart(pokemon) { ... },
    onModifyAtk(atk, attacker, defender, move) { ... },

    // Custom fields added for this fan-game
    shortDesc: "Player-facing description shown in /dt.",
    origin: 'Buffed',  // One of the Origin values above

    // Standard fields
    flags: {},         // or { breakable: 1 }, { cantsuppress: 1 }, etc.
    name: "Ability Name",
    rating: 2,
    num: 123,          // Official ability number; custom abilities use 10000+
},
```

The `origin` field was added to `sim/dex-abilities.ts` and `server/chat-commands/info.ts` already — it displays in the `/dt` command output in place of the generation number.

---

## Custom STAB System

The fan-game uses a **type-order STAB system**, implemented in `config/formats.ts` on the Testing Standard format's `onModifySTAB` handler:

| Condition | Multiplier |
|-----------|-----------|
| Pure type (single-type Pokémon) | ×1.6 |
| Primary type (first type of a dual-type) | ×1.5 |
| Secondary type (second type of a dual-type) | ×1.4 |
| Adaptability | Overrides above (handled separately) |
| Specialist (custom ability) | Adds +0.75 to the above |

Non-STAB moves: no change from base (×1.0).

---

## Showdown Event System — Key Patterns

### Prefix Rules
- `onFoo` — fires on the **holder** when the holder triggers `Foo`
- `onFoeFoo` — fires on the **holder** when a **foe** triggers `Foo`
- `onAnyFoo` — fires on the **holder** when **any Pokémon** triggers `Foo`
- `onAllyFoo` — fires on the **holder** when an **ally** triggers `Foo`
- `onSourceFoo` — fires on the **holder** when the **holder is the source** of `Foo`

### Critical Gotchas

**`onAnySwitchIn` takes NO parameters.**
```typescript
// CORRECT
onAnySwitchIn() {
    const holder = this.effectState.target; // get holder this way
}

// WRONG — will not receive parameters
onAnySwitchIn(pokemon) { ... }
```

**SwitchIn uses `fieldEvent`, not `runEvent`** — this means `onFoeSwitchIn` does NOT exist. Use `onAnySwitchIn` instead and filter by checking if the switching Pokémon is a foe of the holder.

**`onFoeAfterMove(source, target, move)`** — `source` is typed as `VoidSourceMove` in `sim/global-types.ts`. It has move-related properties but may not have full Pokémon properties. Use `this.effectState.target` to reference the holder.

**`chainModify` fractions** — use integer ratios to avoid floating point:
```typescript
this.chainModify([5325, 4096]); // ×1.3
this.chainModify([6144, 4096]); // ×1.5
this.chainModify([4915, 4096]); // ×1.2
```

**`abilityState` is an `AnyObject`** — you can store arbitrary state, including `Set<Pokemon>` references, but TypeScript will require casts when reading back:
```typescript
(holder.abilityState.mySet as Set<Pokemon>).has(foe)
```

---

## Common Pitfalls

### 1. Editing Without Reading
The Edit tool requires you to have read a file in the current session before editing it. If you get an error, read the file first.

### 2. Duplicate Edit Strings
If the `old_string` in an Edit call appears more than once in the file, the edit fails. Use a larger context window (include surrounding lines) to make it unique, or use `replace_all: true` for intentional global replacements.

### 3. `As One` Duplicates
There are two entries: `asoneglastrier` and `asonespectrier`. Their content is nearly identical — always include the `name:` field in your edit context to disambiguate.

### 4. CSS: Both Files Must Match
`utilichart.css` and `battle-search.css` both style the same description columns (`.utilichart .abilitydesccol` vs `.dexlist .abilitydesccol`). Changing one without the other causes visual inconsistency.

### 5. Wrong Git Worktree Push
From the **worktree**: `git push origin HEAD:master`
From the **client**: `git push origin master`
Do not confuse these — running the client push command from the server worktree will fail or push to the wrong branch.

### 6. Ability ID vs Display Name
Ability IDs in `data/abilities.ts` are all-lowercase with no spaces or punctuation (`arenatrap`, `ballfetch`, `badreams`). The `name:` field is the display name with proper casing.

### 7. Depreciated vs Deprecated
The user spells it "Depreciated" — this is intentional in the Origin column and in `origin:` strings. Do not autocorrect it.

### 8. `onStart` vs Seeding State
If an ability needs to track Pokémon that were already on the field when the ability holder switched in (e.g., Anticipation), use `onStart` to seed initial state and `onAnySwitchIn` to catch newly arriving Pokémon. Without seeding, the ability will incorrectly trigger on foes that were already present.

---

## Implemented Abilities Reference (as of rows 1–25)

| Ability | Origin | Key Change |
|---------|--------|-----------|
| Specialist | Custom | +0.75 STAB, ×0.75 non-STAB |
| Aerilate | Unchanged | — |
| Aftermath | Buffed | No contact required; hits entire field 1/4 max HP |
| Air Lock | Unchanged | — |
| Analytic | Buffed | Triggers if moving after the specific target (not last-overall) |
| Anger Point | Unchanged | — |
| Anger Shell | Unchanged | — |
| Anticipation | Buffed | Shudder on foe switch-in; reduces damage from dangerous moves by 33% on first action |
| Arena Trap | Nerfed | Also traps the user |
| Armor Tail | Unchanged | — |
| Aroma Veil | Unchanged | — |
| As One (both) | Depreciated | Skipped |
| Aura Break | Depreciated | Skipped |
| Bad Dreams | Buffed | Works with new sleep condition; 1/8 max HP damage to sleeping foes |
| Ball Fetch | Buffed | Blocks bullet moves targeting holder/ally; reflects damage using attacker's own stats |
| Battery | Buffed | ×1.5 (was ×1.3) for ally Special moves |
| Battle Armor | Unchanged | — |
| Battle Bond | Depreciated | Skipped |
| Beads of Ruin | Unchanged | — |
| Beast Boost | Unchanged | — |
| Berserk | Buffed | Now also raises Attack (was SpA only) |
| Big Pecks | Standby | Skipped |
| Blaze | Unchanged | — |
| Bulletproof | Standby | Skipped |

---

## Workflow Checklist

When starting a new session:
1. Read this file (done automatically by Claude Code).
2. Ask the user for the current TSV file if working on abilities.
3. Confirm the batch range and implementation mode before starting.
4. Read only the specific ability blocks you'll be editing — don't load the entire file unless necessary.
5. Make edits, verify the output with a targeted Read, then commit + push before telling the user it's done.
