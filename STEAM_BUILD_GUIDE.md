# 스팀 인디게임 출시 — 멀티 OS 빌드 가이드 (2026-06-11)

## 빌드 결과물 위치

모든 빌드 결과물은 **`D:\work\2026\0519_DESTINATION_EARTH\destination_E-main\dist\`** 에 생성됩니다.

| 파일/폴더 | 용도 |
|---|---|
| `dist\win-unpacked\` | **스팀 depot 업로드용** — SteamPipe로 이 폴더를 통째로 업로드 |
| `dist\Destination Earth Setup x.x.x.exe` | 일반 배포용 NSIS 설치파일 (홈페이지/itch.io 등) |
| `dist\*portable*.exe` | 무설치 포터블 실행파일 |
| `dist\Destination Earth-x.x.x.AppImage` | Linux 빌드 시 생성 |
| `dist\Destination Earth-x.x.x.dmg` | macOS 빌드 시 생성 (Mac에서만 빌드 가능) |

## OS별 빌드 전략 (스팀 기준)

전제: electron-builder는 **빌드하는 OS에서 해당 OS 타겟**을 만드는 게 원칙입니다.

### 1. Windows (필수 — 1순위)
- 사용자 PC(Windows)에서: 프로젝트 루트의 **`build-steam-win.bat` 더블클릭** 또는 `npm run dist:win`
- 스팀에는 설치파일(.exe)이 아니라 **`win-unpacked` 폴더**를 depot으로 업로드합니다.

### 2. Linux + Steam Deck (2순위 — 인디 노출에 유리)
- 권장 경로 A (간단): **네이티브 Linux 빌드 생략**하고 Windows 빌드를 **Proton 호환**으로 제공. Steamworks 설정에서 "Steam Deck 호환성 검토" 신청만 하면 됨. 최근 인디 다수가 이 방식.
- 권장 경로 B (네이티브): Windows의 WSL2(Ubuntu) 또는 GitHub Actions(ubuntu-latest)에서 `npm run dist:linux`. 스팀 depot에는 AppImage가 아닌 `dist/linux-unpacked/` 폴더 업로드.

### 3. macOS (3순위 — Mac 하드웨어 필요)
- Windows에서 mac 빌드는 **불가능** (서명·공증이 Mac 전용).
- Apple Developer 계정($99/년) + 공증(notarization) 필수. Mac이 없으면 GitHub Actions `macos-latest` 러너로 빌드 가능.
- 초기 출시는 Windows(+Proton)로 하고 mac은 위시리스트 수요 확인 후 추가하는 것을 권장.

### GitHub Actions로 3-OS 동시 빌드 (선택)
저장소에 워크플로(`.github/workflows/`)를 추가하면 태그 푸시 한 번으로 win/mac/linux 동시 빌드 가능. 원하면 다음 작업으로 만들어 드립니다.

## 스팀 출시 시 코드 체크리스트

1. **electron-updater 비활성화 (중요)** — 스팀은 자체 업데이트 시스템을 쓰므로 스팀 빌드에서는 `electron/main.js`의 autoUpdater를 꺼야 합니다. 환경변수 분기 예: 빌드 시 `STEAM_BUILD=1` 설정 → main.js에서 `if(!process.env.STEAM_BUILD)` 조건으로 업데이트 확인 스킵. (현재 코드는 항상 업데이트 확인 → 스팀 심사에서 지적될 수 있음)
2. **Steamworks 연동(도전과제·오버레이)** — `steamworks.js` 패키지로 추후 추가 가능. 출시 필수는 아님.
3. **코드 서명** — 스팀 배포 자체에는 불필요(스팀이 신뢰 체인 제공). NSIS 일반 배포용에만 SmartScreen 회피 목적으로 고려.
4. **저장 위치** — 현재 `app.getPath('userData')` 사용 중이라 스팀 호환 OK. Steam Cloud 연동 시 해당 폴더를 Auto-Cloud 경로로 지정하면 됨.

## 빌드 → 스팀 업로드 흐름 요약

```
build-steam-win.bat  →  dist\win-unpacked\
  → Steamworks 파트너 사이트에서 App/Depot 생성 (Windows 64bit depot)
  → steamcmd + app_build 스크립트로 win-unpacked 업로드
  → 실행 옵션(Launch Option): "Destination Earth.exe"
  → 브랜치(default/beta) 지정 후 출시
```
