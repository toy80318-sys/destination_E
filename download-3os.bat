@echo off
REM Download CURRENT-version 3-OS builds into one folder (itch.io upload set)
REM Version auto-detected from package.json → release_itchio\v<version>\
cd /d "%~dp0"
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set VER=%%v
if "%VER%"=="" ( echo [FAIL] could not read version from package.json & pause & exit /b 1 )
set DIR=release_itchio\v%VER%
mkdir "%DIR%" 2>nul
set BASE=https://github.com/toy80318-sys/destination_E/releases/download/v%VER%
echo [DL START] %date% %time%  (v%VER%) > download-log.txt
echo [1/4] Windows Setup... >> download-log.txt
curl -L -o "%DIR%\Destination Earth Setup %VER%.exe" "%BASE%/Destination.Earth.Setup.%VER%.exe" >> download-log.txt 2>&1
echo [2/4] macOS Intel dmg... >> download-log.txt
curl -L -o "%DIR%\Destination Earth %VER%.dmg" "%BASE%/Destination.Earth-%VER%.dmg" >> download-log.txt 2>&1
echo [3/4] macOS Apple Silicon dmg... >> download-log.txt
curl -L -o "%DIR%\Destination Earth %VER%-arm64.dmg" "%BASE%/Destination.Earth-%VER%-arm64.dmg" >> download-log.txt 2>&1
echo [4/4] Linux AppImage... >> download-log.txt
curl -L -o "%DIR%\Destination Earth %VER%.AppImage" "%BASE%/Destination.Earth-%VER%.AppImage" >> download-log.txt 2>&1
echo [DONE] %date% %time% >> download-log.txt
dir "%DIR%" >> download-log.txt
start "" "%DIR%"
exit /b 0
