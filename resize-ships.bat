@echo off
cd /d "%~dp0"
node scripts\resize-ships-400.js > resize-log.txt 2>&1
exit /b 0
