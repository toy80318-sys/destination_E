@echo off
REM 3-OS release: version bump + commit + tag + push
REM -> GitHub Actions builds Windows/macOS/Linux -> GitHub Releases
cd /d "%~dp0"
echo [RELEASE START] %date% %time% > release-log.txt
git config user.name "toy80318" >> release-log.txt 2>&1
git config user.email "toy80318@gmail.com" >> release-log.txt 2>&1
call node scripts\bump-version.js --message "release: itch.io 3-OS build" >> release-log.txt 2>&1
if errorlevel 1 ( echo [FAIL] bump/commit/push failed >> release-log.txt & pause & exit /b 1 )
echo [DONE] pushed - GitHub Actions building win/mac/linux >> release-log.txt
echo Check: https://github.com/toy80318-sys/destination_E/actions >> release-log.txt
exit /b 0
