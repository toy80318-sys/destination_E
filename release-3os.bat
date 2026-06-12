@echo off
REM 3-OS release: link git repo (first run) + commit + tag + push
REM -> GitHub Actions builds Windows/macOS/Linux -> GitHub Releases
cd /d "%~dp0"
echo [RELEASE START] %date% %time% > release-log.txt
where git >> release-log.txt 2>&1
if errorlevel 1 ( echo [FAIL] git not installed >> release-log.txt & pause & exit /b 1 )
if not exist .git (
  echo [SETUP] linking to remote repo... >> release-log.txt
  git init >> release-log.txt 2>&1
  git remote add origin https://github.com/toy80318-sys/destination_E.git >> release-log.txt 2>&1
  git fetch origin main >> release-log.txt 2>&1
  if errorlevel 1 ( echo [FAIL] fetch failed - check network/auth >> release-log.txt & pause & exit /b 1 )
  git checkout -b main >> release-log.txt 2>&1
  git reset --soft origin/main >> release-log.txt 2>&1
)
git config user.name "toy80318" >> release-log.txt 2>&1
git config user.email "toy80318@gmail.com" >> release-log.txt 2>&1
for /f "tokens=2 delims=:, " %%v in ('findstr /c:"\"version\"" package.json') do set VER=%%~v
echo [VER] %VER% >> release-log.txt
git add -A >> release-log.txt 2>&1
git commit -m "release: v%VER% (itch.io 3-OS build)" >> release-log.txt 2>&1
git tag -a v%VER% -m "v%VER%" >> release-log.txt 2>&1
git push origin main --tags >> release-log.txt 2>&1
if errorlevel 1 ( echo [FAIL] push failed - login window may have appeared >> release-log.txt & pause & exit /b 1 )
echo [DONE] pushed v%VER% - GitHub Actions building win/mac/linux >> release-log.txt
echo Check: https://github.com/toy80318-sys/destination_E/actions >> release-log.txt
exit /b 0
