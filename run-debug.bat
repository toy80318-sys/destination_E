@echo off
REM 게임 디버그 실행 — 콘솔 로그를 game-debug.log 로 캡처
cd /d "%~dp0"
echo [DEBUG RUN] %date% %time% > game-debug.log
"dist\win-unpacked\Destination Earth.exe" --enable-logging >> game-debug.log 2>&1
echo [EXIT CODE] %errorlevel% >> game-debug.log
