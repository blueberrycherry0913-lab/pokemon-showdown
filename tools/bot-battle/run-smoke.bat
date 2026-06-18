@echo off
title Showdown FULL Smoke Test
REM ============================================================
REM  EXTENSIVE smoke test (the occasional "test everything" run).
REM  Pre-screens every (species, ability) variant offline for crashes,
REM  generates balanced-coverage teams, then plays one full live pass.
REM
REM  Prereqs:
REM    1. Server running (launch-showdown-clean.bat).
REM    2. Config.nothrottle = true in config/config.js  (the server caps a user
REM       to 12 battles+validations / 3 min; a full run needs that off).
REM       Toggle it back to false when you don't want big runs.
REM
REM  For everyday 5-10 game testing use run-quick.bat instead.
REM ============================================================

cd /d "C:\Users\primo\Documents\GitHub\pokemon-showdown\tools\bot-battle"

if not exist node_modules (
  echo Installing harness dependencies ^(first run only^)...
  call npm install
  echo.
)

echo [1/3] Pre-screening every ability variant for crashes (offline, ~couple min)...
node prescreen-variants.js
if errorlevel 1 goto :err

echo.
echo [2/3] Generating coverage teams (every species ^>=5 games, both abilities)...
node gen-smoke-teams.js
if errorlevel 1 goto :err

echo.
echo [3/3] Running the full live smoke test (one pass through all teams)...
echo   Crashes (if any) are logged to results\crashes\ with the exact matchup.
node run.js --mode=pool --teams=smoke-teams.txt --names=TesterBotRuby,TesterBotSapphire
goto :done

:err
echo.
echo *** Smoke-test setup failed (see the error above). ***

:done
echo.
pause
