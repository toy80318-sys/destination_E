@echo off
REM ============================================================
REM  DESTINATION EARTH - Windows build (Steam + general)
REM  1) version bump (+1, cache buster)  2) build  3) open dist
REM  Output: dist\win-unpacked (Steam depot) + NSIS setup + portable
REM  All output is logged to build-log.txt
REM ============================================================
cd /d "%~dp0"
echo [BUILD START] %date% %time% > build-log.txt
echo [1/4] checking dependencies... >> build-log.txt
where npm >> build-log.txt 2>&1
if not exist node_modules (
  echo [1/4] running npm install... >> build-log.txt
  call npm install >> build-log.txt 2>&1
  if errorlevel 1 ( echo [FAIL] npm install failed >> build-log.txt & pause & exit /b 1 )
)
echo [2/4] bumping version (patch +1, cache buster)... >> build-log.txt
call node scripts\bump-version.js --no-commit >> build-log.txt 2>&1
if errorlevel 1 ( echo [WARN] version bump failed - building with current version >> build-log.txt )
echo [3/4] building Windows targets (NSIS + portable + win-unpacked)... >> build-log.txt
call npm run dist:win >> build-log.txt 2>&1
if errorlevel 1 ( echo [FAIL] build failed - see errors above >> build-log.txt & pause & exit /b 1 )
echo [4/4] DONE %date% %time% >> build-log.txt
echo [OUTPUT] %~dp0dist >> build-log.txt
start "" "%~dp0dist"
exit /b 0
