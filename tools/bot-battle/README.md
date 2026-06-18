# Bot-vs-Bot Battle Harness

Two headless bots that connect to your **running** Showdown server, challenge each
other in **[Gen 9] Testing Standard**, and play random games. Completed games feed
the §28 analytics dashboard automatically; crashes are logged (with the exact
teams) and scrubbed from analytics.

It's a standalone command-line program — **not** a server toggle or UI button. The
server just sees two players battling.

## Quick start

1. Start the server as usual (`launch-showdown-clean.bat`). Leave it running.
2. First time only: `npm install` (gets `sockjs-client`).
3. Run a batch:
   ```
   node run.js --games=200 --mode=both
   ```
   …or just double-click **`run-bots.bat`** on the Desktop.

It prints a win-rate/crash summary and exits. `Ctrl+C` stops it early.

## Two ways to run: quick (everyday) vs full smoke test (occasional)

| Launcher | What it does | When |
|---|---|---|
| **`run-quick.bat`** | 8 games of `mode=both` (your `default-teams.txt` + random teams). Override with flags, e.g. `run-quick.bat --games=5 --watch` or `--mode=pool --teams=myteams.txt`. | **The norm** — sanity-check whatever you're working on. |
| **`run-smoke.bat`** | The big one: pre-screens **every (species, ability) variant** offline for crashes, generates balanced-coverage teams (every fully-evolved Gen1/Gen8/Cosmic + Osteokhan, ≥5 games each, both basic abilities), then plays one full live pass (~61 games). | **Opt-in**, when you want to "test everything" after big changes. |

Both are plain launchers around `node run.js`; nothing is enabled server-side.

### The throttle toggle (needed only for big runs)

The server caps each user to **12 battles + team validations per 3 minutes** (anti-DoS,
`server/monitor.ts`). That's fine for ≤6 games but kills longer runs (you'll see
`handshake failed` / a *"Due to high load"* popup around game 6). To allow a full smoke
test, set **`exports.nothrottle = true;`** in `config/config.js` and restart the server;
set it back to `false` for normal use. This is the toggle that turns the extensive test
on/off — it's `config.js` (git-ignored, local to your server), not committed.

The full pipeline by hand (what `run-smoke.bat` runs):
```
node prescreen-variants.js        # offline crash screen -> prescreen-crashers.json
node gen-smoke-teams.js           # coverage teams -> smoke-teams.txt (excludes crashers)
node run.js --mode=pool --teams=smoke-teams.txt --names=TesterBotRuby,TesterBotSapphire
```
If the server crashes mid-run, restart it and resume with `--start=<last completed game>`.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--games=N` | auto | number of games. Omitted in **pool** mode = exactly one full pass (poolSize/2 games); otherwise 50 |
| `--start=K` | 0 | skip the first K games (advance the pool cursor by 2K) and run K+1…games — resume a pool run in batches against the same file |
| `--mode=random\|pool\|both` | both | team source (see below) |
| `--teams=PATH` | teams.txt | team file for pool/both (export or packed format) |
| `--strict-pool` | off | skip pool teams that fail the validator (default: use anyway) |
| `--server=host:port` | localhost:8000 | running server |
| `--names=A,B` | BotAlpha,BotBravo | bot names (use **unregistered** names) |
| `--move=F` | 0.7 | AI: `1.0` = never voluntarily switch, `0.7` = ~30% switch |
| `--mega=F` | 0.6 | AI: `0` = no random Tera/Mega, `0.6` = often |
| `--watch` | off | viewable mode (see below) |
| `--watch-delay=MS` | 900 | per-choice delay in watch mode |
| `--watch-linger=MS` | 5000 | keep room open this long after a win |
| `--replays` | off | attempt `/savereplay` after each game |
| `--timeout=S` | 180 (600 in watch) | per-game timeout (seconds); a hang past this is logged as a crash |
| `--noauth` | off | log in without a loginserver assertion (only if your server sets `Config.noguestsecurity = true`) |
| `--loginserver=URL` | play.pokemonshowdown.com | assertion source |

**Moves-only bots:** `--move=1.0 --mega=0` (forced post-faint switches still happen — those are mandatory).

## Watching games

```
node run.js --games=10 --mode=both --watch
```

In watch mode the harness prints a `/join battle-gen9testingstandard-N` link the
moment each battle opens — type that into your client to spectate live. Turns are
slowed (`--watch-delay`, default 0.9s/choice) so they're readable, and each room
stays open a few seconds after the win (`--watch-linger`). Add `--replays` to also
attempt to save a replay of each game. Note: battles don't auto-appear in your
client's battle list — you join by the printed room id.

## Team sources

- **pool** — rotates teams from a file (`--teams=<path>`, default `teams.txt`). The
  file can be in the Showdown **export format** (teambuilder Import/Export — multiple
  teams separated by `=== [format] name ===` headers) OR the packed format (one
  packed team per line); the loader auto-detects. Pool teams are **lenient**: a team
  that fails the validator is used anyway (with a warning), since your game has no
  strict move validator — the server is the final arbiter. Use `--strict-pool` to
  skip invalid teams instead.
- **random** — generates fresh `[Gen 9] Testing Standard`-legal teams (random species,
  learnset moves, valid abilities/items, SP spreads), validated before use. Widest
  coverage for bug-hunting.
- **both** — alternates pool / generated.

Use your existing teams file:

```
node run.js --games=20 --mode=pool --teams="C:\Users\primo\Documents\GitHub\pokemon-showdown-client\play.pokemonshowdown.com\default-teams.txt"
```

(This is the default in `run-bots.bat`.)

## Output

- `results/run-<timestamp>.jsonl` — one row per game (winner, turns, or crash).
- `results/crashes/<roomid>.json` — full crash artifact: reason, turn count, both
  packed teams, and the captured battle log. The two teams let you reproduce the
  matchup. (`results/` is git-ignored.)

## Bot stats are kept separate

Bot games record the **same** analytics as player games, but into a **separate
database** (`logs/analytics/battle_analytics_bots_v2.db`) and separate report
files — they never touch your real player leaderboards. Routing is automatic: any
battle where a participant is a known bot id (default `botalpha` / `botbravo`,
configurable in `server/analytics/bots.ts` or via `Config.analyticsbotids`) goes
to the bot dataset, so the player DB stays human-only.

View bot stats in your client:

| Command | Shows |
|---|---|
| `/analyticsbots` | bot leaderboard dashboard |
| `/analyticsbotsfull` | raw bot data + per-game Remove buttons |
| `/analyticsbotsremove <game_id>` | scrub one bot game (staff) |
| `/analyticsbotsclearall confirm` | wipe all bot data (staff) |

The normal `/analytics` / `/analyticsfull` pages continue to show **players only**.

## Login note

Bots use **unregistered** names and fetch a guest assertion from the public
loginserver — this needs internet access. If your dev server runs with
`Config.noguestsecurity = true`, pass `--noauth` to skip the loginserver entirely.

## How it works

`connection.js` speaks the same SockJS endpoint (`/showdown`) as the browser client,
so games run through the real `RoomBattle` pipeline (validation + analytics
interception in `server/room-battle.ts` + report generation). `ai.js` reuses the
engine's own `RandomPlayerAI` decision logic. No server-side code is modified.

A hard sim crash never reaches the analytics flush (the DB is only written on the
`end` event), so crashed games normally leave nothing in the DB; the harness still
calls `deleteGame` as a guarantee net (`scrub.js`).
