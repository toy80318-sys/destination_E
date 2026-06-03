---
name: project-pwa-workflow
description: "PWA 배포 구조 — manifest.json, service-worker.js, GitHub Pages 호스팅. 캐시 버전 동기화 규칙 포함"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0cd84d32-3d37-4a31-90e5-2474714074a8
---

이 프로젝트는 PWA로 배포 가능하도록 셋업됨 (2026-05-30).

**구성 파일**
- `manifest.json` (root) — 앱 메타 / 아이콘 / 디스플레이 모드(fullscreen)
- `service-worker.js` (root) — 오프라인 캐싱 (network-first: HTML/JS/CSS, cache-first: 이미지/오디오)
- `img/icons/icon-{192,512,maskable-512}.png` — 사용자가 PWA Builder로 생성
- `index.html` 하단에 SW 등록 스크립트 포함

**호스팅**: GitHub Pages (`toy80318-sys/destination_E`, `main` 브랜치, Settings → Pages → Deploy from main /)

**Why:** 캐시 버전을 안 올리면 사용자 기기에 옛 빌드가 영구 캐싱돼 신규 변경사항이 반영되지 않음. 이미지 워크플로([[project-image-workflow]])의 `_GAME_VER` 갱신과 동일한 이유로 캐시 버스팅 필수.

**How to apply:**
- `index.html`의 `_GAME_VER` 또는 `?v=` 쿼리를 올릴 때마다 `service-worker.js` 상단의 `CACHE_VERSION = 'de-cache-vYYYYMMDD-N'` 도 같이 올릴 것
- 새 핵심 파일(JS data 등)을 추가하면 `service-worker.js`의 `CORE_ASSETS` 배열에도 추가
- 외부 도메인(Firebase, gstatic)은 SW가 가로채지 않도록 설정됨 — 클라우드 세이브는 정상 동작
