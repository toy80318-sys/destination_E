---
name: project-image-workflow
description: 데스티네이션 어스 — 이미지 추가/교체 시 최적화·캐시버스터·모바일 LOD 처리 워크플로
metadata: 
  node_type: memory
  type: project
  originSessionId: 083a7274-7b69-4d32-9a04-be80ec90fa72
---

데스티네이션 어스(Firebase 호스팅 웹게임)에서 이미지를 추가/교체할 때 따라야 하는 절차.

**Why:** Firebase 호스팅이 PNG를 24h 캐싱하고, 모바일은 별도 축소본(LOD)을 로드하며, 사용자가 올리는 원본은 보통 1MB+ 비최적화 상태로 들어온다. 이 절차를 빠뜨리면 "이전 이미지가 그대로 보인다"거나 모바일에서 깨지는 문제가 재발한다.

**How to apply:**
- **캐시 버스터**: 모든 이미지 URL에 `?v=<window._GAME_VER>`가 붙는다. `_GAME_VER`는 `index.html`(단일 소스)에서 설정하고, `game.js` line 4는 `window._GAME_VER=window._GAME_VER||'...'` 폴백일 뿐이니 덮어쓰지 말 것. 이미지 교체 후엔 `index.html`의 `_GAME_VER` 값을 새 값으로 bump 해야 클라이언트가 새로 받는다. 패턴: `YYYYMMDD.<descriptor>`.
- **bg PNG → JPG 정식 워크플로**: `scripts/convert_bg_png_to_jpg.js` (1600×900 mozjpeg q85, P31.png만 예외). sharp 미설치 시 `npm install --no-save sharp` 로 일회성 설치. 산출물: `*.jpg` 갱신 + 원본 `*.png` 삭제. 새 배경은 `img/bg/P##.png`로 올린 뒤 이 스크립트 1회 실행하면 됨.
- **최적화**: 사용자가 올린 원본 이미지는 `scripts/resize_images.js`의 디렉토리별 기준으로 줄인다 (chars 200×300, ships 400×300, planets/bg 등). sharp 사용, PNG palette+compressionLevel9.
- **모바일 LOD**: `_MOBILE_LOD_DIRS`(ships/chars/parts/combat/quests/commodities)에 속한 디렉토리는 `img/<dir>/m/<file>` 축소본을 반드시 생성해야 한다(`scripts/gen_mobile_lod.js`, chars=160px). bg/planets/hub/ui는 LOD 없음(원본 사용).
- 함선 이미지 화이트리스트는 `window._SHIP_IMG_SET` (game.js) — 새 함선 png 추가 시 여기도 갱신해야 UFO 폴백을 막는다.

배포: `npm run deploy` (firebase hosting). 사용자가 명시적으로 요청할 때만 배포할 것.
