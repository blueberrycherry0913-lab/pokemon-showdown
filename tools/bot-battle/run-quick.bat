@echo off
title Showdown Quick Bot Test
REM ============================================================
REM  EVERYDAY quick bot test (the norm): a handful of games to sanity-check
REM  whatever you're working on. Defaults to 8 games of mode=both (your
REM  default-teams.txt pool + random generated teams).
REM
REM  Override anything by passing flags — they win over the defaults below:
REM    run-quick.bat --games=5
REM    run-quick.bat --games=10 --watch
REM    run-quick.bat --mode=pool --teams=myteams.txt
REM    run-quick.bat --mode=random          (pure generated teams, no file)
REM
REM  Prereq: server running (launch-showdown-clean.bat). <=6 games work even
REM  with throttling on; for more, set Config.nothrottle=true (see run-smoke.bat).
REM  For the big "test everything" pass use run-smoke.bat.
REM ============================================================

cd /d "C:\Users\primo\Documents\GitHub\pokemon-showdown\tools\bot-battle"

if not exist node_modules (
  echo Installing harness dependencies ^(first run only^)...
  call npm install
  echo.
)

set TEAMS=C:\Users\primo\Documents\GitHub\pokemon-showdown-client\play.pokemonshowdown.com\default-teams.txt

echo Running a quick bot test (8 games unless you passed --games)...
node run.js --games=8 --mode=both --teams="%TEAMS%" --names=TesterBotRuby,TesterBotSapphire %*

echo.
pause
