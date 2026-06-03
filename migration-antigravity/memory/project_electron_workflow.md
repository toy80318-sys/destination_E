---
name: project-electron-workflow
description: PC 데스크탑 빌드(Electron) 구조 — 진입점·세이브 백업·웹/PC 분기 패턴
metadata: 
  node_type: memory
  type: project
  originSessionId: ec1ebca4-e1ac-493f-b6b6-831e6b024a0c
---

웹 게임을 PC로 패키징하기 위해 Electron이 도입됨 (커밋 `f96b71f`, 2026-05-31).
웹과 PC 빌드가 **같은 코드베이스**에서 동작하며, 분기는 `window.desktopAPI` 존재 여부로 판단.

**Why:** 자체 사이트 + Steam + itch.io 3채널 PC 배포 목표. 웹 버전(GitHub Pages `destination.cgtation.kr`)은 그대로 유지하면서 정식 PC 게임 형태도 같이 가져가야 함. game.js 18000줄을 비동기로 재작성하지 않고도 데스크탑 세이브 영구화를 달성하기 위해 localStorage 후킹 + 사용자 데이터 폴더 백업 방식을 채택함.

**How to apply:**
- **Electron 진입점**: `electron/main.js` (메인 프로세스), `electron/preload.js`(contextBridge로 `window.desktopAPI` 노출). package.json `main`이 `electron/main.js`를 가리킴.
- **데스크탑 분기 패턴**: 게임 코드에서 `if (window.desktopAPI)` 로 PC 분기 판단. `window.IS_DESKTOP` 도 desktop-bridge.js가 같이 설정해줌. 기존 `window.IS_MOBILE` 은 Electron이면 강제 `false`로 떨어뜨려 PC 고해상도 보장 (game.js 9~17행).
- **세이브 백업 위치**: `app.getPath('userData')/saves/<key>.json` (Windows: `%APPDATA%/Destination Earth/saves`). `js/desktop-bridge.js`가 `Storage.prototype.setItem` 을 후킹해서 `de_save*`, `de_audio_settings` 등 키를 자동 백업. 부팅 시 localStorage 비어있고 백업 있으면 자동 복구.
- **service-worker는 데스크탑에서 비활성**: index.html의 SW 등록부에 `!window.desktopAPI` 가드 있음. PC 빌드에 service-worker.js를 포함하지 않도록 package.json `build.files`에서 `!service-worker.js` 제외 처리됨.
- **빌드 명령**: `npm run electron` (개발 실행), `npm run dist:win/mac/linux` (배포 패키지). 출력은 `dist/` (.gitignore 처리됨). Mac DMG는 Mac 호스트에서만 빌드 가능.
- **외부 링크**: main.js의 `setWindowOpenHandler` + `will-navigate`가 `http(s)://` 링크를 `shell.openExternal`로 라우팅. 게임 코드의 `target=_blank` 는 그대로 두어도 됨.
- **단축키**: F11(풀스크린)·F12(DevTools)·Ctrl+R(새로고침)·Ctrl+Q(종료)는 main.js의 빈 메뉴 + accelerator로 제공.
- **빌드 출력 사이즈 다이어트**: 빌드시 `img_backup/`, `.screens/`, `Doc/`, `service-worker.js`, source maps는 자동 제외.
- **GitHub Actions 자동 빌드/발행**: `.github/workflows/build-pc.yml` — `v*` 태그 푸시 시 Windows .exe 자동 빌드 + Release 자동 발행 (workflow_dispatch 수동 트리거도 지원). 발행 단계는 **`softprops/action-gh-release@v2`** 로 dist 파일을 직접 첨부 (electron-builder `--publish=always` 재실행은 CI 환경에서 즉시 실패하는 사례 있음 — beta.2 사고). 발행 단계에 `continue-on-error: true` 절대 쓰지 말 것 — 실패가 success로 마스킹되어 Release 안 만들어지는데 워크플로는 초록불.
- **dist:\* 스크립트는 항상 `--publish=never`**: CI에서 electron-builder가 자동 publish 시도하면 GH_TOKEN 미설정으로 빌드 자체가 실패 (`GitHub Personal Access Token is not set`). 빌드와 publish는 워크플로에서 단계 분리.

연관 메모리: [[project-pwa-workflow]] (PWA 캐시 버전 동기화 — 데스크탑은 SW 비활성이라 무관), [[project-image-workflow]] (모바일 LOD — 데스크탑은 항상 PC 고해상도이므로 LOD 디렉토리 영향 없음).
