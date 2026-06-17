@echo off
REM Local Linux build attempt on Windows (electron-builder).
REM AppImage usually needs Docker Desktop. Falls back to tar.gz/dir if AppImage fails.
cd /d "%~dp0"
echo [LINUX BUILD] %date% %time% > build-linux-log.txt
echo [info] docker check... >> build-linux-log.txt
where docker >> build-linux-log.txt 2>&1
docker info >> build-linux-log.txt 2>&1
echo [1/2] trying AppImage (needs docker)... >> build-linux-log.txt
call npx electron-builder --linux AppImage --publish=never >> build-linux-log.txt 2>&1
if errorlevel 1 (
  echo [WARN] AppImage failed - trying tar.gz / dir (no-docker targets)... >> build-linux-log.txt
  call npx electron-builder --linux tar.gz dir --publish=never >> build-linux-log.txt 2>&1
)
echo [DONE] %date% %time% >> build-linux-log.txt
echo === dist linux outputs === >> build-linux-log.txt
dir dist\*.AppImage dist\*.tar.gz >> build-linux-log.txt 2>&1
start "" "dist"
pause
