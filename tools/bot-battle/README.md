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

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--games=N` | 50 | number of games to play |
| `--mode=random\|pool\|both` | both | team source (see below) |
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

- **random** — generates fresh `[Gen 9] Testing Standard`-legal teams (random Gen 1
  species, learnset moves, valid abilities/items, SP spreads) and validates each
  with the real `TeamValidator` before use. Widest coverage for bug-hunting.
- **pool** — rotates packed teams you paste into `teams.txt` (one per line).
- **both** — alternates pool / generated.

## Output

- `results/run-<timestamp>.jsonl` — one row per game (winner, turns, or crash).
- `results/crashes/<roomid>.json` — full crash artifact: reason, turn count, both
  packed teams, and the captured battle log. The two teams let you reproduce the
  matchup. (`results/` is git-ignored.)

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
