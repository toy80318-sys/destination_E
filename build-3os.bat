@echo off
setlocal
REM ============================================================================
REM build-3os.bat - 3-OS 릴리스를 한 폴더로 정리
REM   - Windows : 로컬에서 빌드(npm run dist:win) 후 dist\ 에서 복사
REM   - macOS / Linux : GitHub Actions(CI) 빌드 결과를 GitHub Releases 에서 다운로드
REM   - 출력 : release\v<version>\   (.gitignore 처리됨 - git 추적 안 됨)
REM
REM 사용법:
REM   build-3os.bat            -> Windows 빌드 후 3-OS 한 폴더로 정리
REM   build-3os.bat nobuild    -> Windows 재빌드 없이 기존 dist\ 산출물로 정리만
REM
REM 사전 조건(mac/linux):
REM   해당 버전 태그(v<version>)를 push 하여 CI 가 mac/linux 를 빌드·릴리스했어야 함
REM   (release-3os.bat 으로 태그 push -> GitHub Actions -> GitHub Releases)
REM ============================================================================
cd /d "%~dp0"

for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "VER=%%v"
if "%VER%"=="" ( echo [FAIL] package.json 버전을 읽지 못했습니다. & pause & exit /b 1 )

set "OUT=release\v%VER%"
set "BASE=https://github.com/toy80318-sys/destination_E/releases/download/v%VER%"
if not exist "%OUT%" mkdir "%OUT%"
set "LOG=%OUT%\collect-log.txt"

echo [3-OS COLLECT] v%VER%  %date% %time% > "%LOG%"
echo ============================================================
echo   DESTINATION EARTH  3-OS packaging  ^(v%VER%^)
echo   output: %OUT%
echo ============================================================

REM -- [1] Windows 로컬 빌드 (nobuild 인자 주면 건너뜀) ----------------------
if /i not "%~1"=="nobuild" (
  echo [1/6] Windows 빌드 ^(npm run dist:win^)...
  echo [1] npm run dist:win >> "%LOG%"
  call npm run dist:win >> "%LOG%" 2>&1
  if errorlevel 1 ( echo [FAIL] Windows 빌드 실패 - %LOG% 확인 & pause & exit /b 1 )
) else (
  echo [1/6] Windows 빌드 건너뜀 ^(nobuild^)
  echo [1] skip build ^(nobuild^) >> "%LOG%"
)

REM -- [2] Windows 설치본(NSIS) 복사 ----------------------------------------
echo [2/6] Windows 설치본 복사...
if exist "dist\Destination Earth Setup %VER%.exe" (
  copy /y "dist\Destination Earth Setup %VER%.exe" "%OUT%\Destination Earth Setup %VER%.exe" >> "%LOG%" 2>&1
) else (
  echo [WARN] dist\Destination Earth Setup %VER%.exe 없음 - npm run dist:win 먼저 실행 >> "%LOG%"
)

REM -- [3] Windows 포터블 복사 ----------------------------------------------
echo [3/6] Windows 포터블 복사...
if exist "dist\Destination Earth %VER%.exe" (
  copy /y "dist\Destination Earth %VER%.exe" "%OUT%\Destination Earth %VER% (portable).exe" >> "%LOG%" 2>&1
) else (
  echo [WARN] dist\Destination Earth %VER%.exe 없음 >> "%LOG%"
)

REM -- [4] macOS Intel(x64) dmg 다운로드 (CI 릴리스) ------------------------
echo [4/6] macOS Intel dmg 다운로드...
curl -L --fail --remove-on-error -o "%OUT%\Destination Earth %VER%.dmg" "%BASE%/Destination.Earth-%VER%.dmg" >> "%LOG%" 2>&1
if errorlevel 1 echo [WARN] macOS Intel dmg 다운로드 실패 ^(해당 버전 CI 릴리스 미존재?^) >> "%LOG%"

REM -- [5] macOS Apple Silicon(arm64) dmg 다운로드 -------------------------
echo [5/6] macOS Apple Silicon dmg 다운로드...
curl -L --fail --remove-on-error -o "%OUT%\Destination Earth %VER%-arm64.dmg" "%BASE%/Destination.Earth-%VER%-arm64.dmg" >> "%LOG%" 2>&1
if errorlevel 1 echo [WARN] macOS arm64 dmg 다운로드 실패 >> "%LOG%"

REM -- [6] Linux AppImage 다운로드 -----------------------------------------
echo [6/6] Linux AppImage 다운로드...
curl -L --fail --remove-on-error -o "%OUT%\Destination Earth %VER%.AppImage" "%BASE%/Destination.Earth-%VER%.AppImage" >> "%LOG%" 2>&1
if errorlevel 1 echo [WARN] Linux AppImage 다운로드 실패 >> "%LOG%"

REM -- 결과 정리 -----------------------------------------------------------
echo [DONE] %date% %time% >> "%LOG%"
echo === result === >> "%LOG%"
dir "%OUT%" >> "%LOG%"
echo.
echo ============================================================
echo   완료. 결과 폴더: %OUT%
echo ============================================================
dir "%OUT%"
start "" "%OUT%"
endlocal
exit /b 0
