# DEV_BACKLOG — 지속 개발 루프 작업 목록

`/dev-loop`가 위에서부터 순서대로 1건씩 처리한다.
표기: `- [ ]` 대기 / `- [x]` 완료 / `⏸` 보류 / `❓` 결정 대기(사람 확인 필요) / `⚠` 자동처리 실패

## 중단 플래그
<!-- 아래 줄에 STOP 이라고 쓰면 루프가 다음 사이클부터 멈춘다 -->
(비어 있음 = 계속 진행)

## 작업 목록

### 모바일 트랙 (우선 — 기획서_모바일_UI재설계.md §5 순서, body.is-mobile 게이트로 데스크톱 회귀 0 원칙)
- [x] M1. 모달 → 바텀시트 전환 — `body.is-mobile`에서 `.modal`을 하단 시트 스타일(화면 하단 고정, `--sheet-radius`, 슬라이드업 애니메이션)로, 닫기 버튼 ≥48px. 데스크톱 모달 불변 (`game.css`) (완료: 2026-07-05, 수정 1회차 포함 — 상세는 DEV_LOOP_LOG)
- [ ] M2. 정비소 밀집 화면 모바일 재구성 1/3 — 함선 탭: 좌우 2열 → 세그먼트 탭 상하 스택, 터치 타깃 ≥48px (`js/modules/render-ship-tab.js`, `game.css`)
- [ ] M3. 정비소 재구성 2/3 — 파츠/제작 탭: 그리드 셀 41px → ≥48px, 드래그 대신 탭→슬롯 선택 보조 (`js/modules/render-craft-tab.js`)
- [ ] M4. 정비소 재구성 3/3 — 거래 탭 카드화 (`js/modules/render-trade-tab.js`)
- [ ] M5. 도감·경매 세로 카드 리스트 + 상세 바텀시트 (`js/modules/codex.js`, `js/modules/auction.js`)
- [ ] M6. 전투 HUD 엄지존 배치 — 스킬/전술 버튼 하단 좌우, 게이지·폰트 확대 (`js/modules/combat.js`, `game.css`)
- [ ] M7. 스타맵 핀치 줌 + 드래그 팬, 행성 노드 히트박스 ≥48px (`game.js` 스타맵 렌더부)
- [ ] M8. 세이브 영속화 — localStorage → Capacitor Preferences/Filesystem 이중화(네이티브에서만, 1회 마이그레이션 + 웹 폴백). WebView localStorage는 OS가 정리할 수 있음 (`js/modules/capacitor-init.js` 확장)
- ❓ M9. Android 실기 빌드·테스트 — Android Studio/실기기 필요(사람). `npx cap add android` → AAB 서명 → Play 내부 테스트

### QA / 출시 전 검증
- [x] 1. 고정 시드 맵 검증 — 재시작 후 행성 위치가 동일한지 시뮬레이션으로 확인 (`js/modules/galaxy-gen.js`) (완료: 2026-07-02, 22/23 통과 — 상세는 DEV_LOOP_LOG)
- [ ] 2. 전투 공식 클램프 검증 — 최소 데미지 1 보장, LOY 0/100 엣지 케이스 (`js/modules/combat.js`)
- [ ] 3. 세이브 마이그레이션/호환 점검 — 버전 필드 처리 확인, 구버전 세이브 로드 시뮬레이션 (`js/modules/save-slots.js`, `js/cloudsave.js`)
- [ ] 4. 풀 플레이스루 무결성 시뮬레이션 — 새 게임 → 행성 순회 → 영웅 영입 → 엔딩 핵심 함수 경로 검증
- [ ] 5. 출시 전 빌드 점검 — 디버그 로그/치트 비활성 확인, autoUpdater Steam 빌드 OFF 코드 검증, `build.files` 포함 목록 확인

### 모듈 분리 (로드맵 C 시리즈)
- [ ] 6. C4: ECONOMY 모듈 추출 마무리 — `game.js:1604` ECONOMY 마커 기준 → `js/modules/economy.js` (기존 분할 방식 준수, 경계 변수 참조 검증 포함)
- ⏸ 7. C3: 크루/퀘스트 → `crew-quests.js` 추출 — 로드맵상 보류(함수 파편화). 보류 해제 지시 전까지 건너뜀

### 출시 지원 도구
- [ ] 8. 스크린샷 자동 캡처 스크립트 — puppeteer-core로 FHD(1920×1080) 게임플레이 캡처, `scripts/capture-screenshots.js`
- [ ] 9. 트레일러용 30~60초 장면 구성안 + 자막 스크립트 문서 작성 → `steam/TRAILER_STORYBOARD.md`

### 후속 (사이클에서 발견된 정리 항목)
- [ ] 14. 바텀시트 닫기 퇴장 모션(슬라이드다운) — 현재 진입만 애니메이션, 닫기는 즉시 소멸(CSS 단독 한계). JS 최소 훅 또는 스와이프 다운 닫기와 묶어 검토 (발견: M1 리뷰, 낮음)
- [ ] 15. `_isMobileFit()` 높이≤768 단독 판정 재검토 — 1366×768 데스크톱에 is-mobile 부여되는 누수. 바텀시트는 pointer:coarse 게이트로 방어했으나 드로어 등 다른 is-mobile 규칙은 여전히 영향 (발견: M1 리뷰, 별도 과제 — 기존 동작 변경이라 신중히)
- [ ] 13. `galaxy-gen.js:14` 미사용 `seed` 파라미터 정리 — 동작 변경 없이 "지도는 고정 레이아웃(시드 미사용)" 주석 명시만. 시드 랜덤맵 도입 여부는 게임 디자인 결정이므로 이 항목에서 다루지 않음 (발견: 사이클 #1)

### 결정 대기 (사람 확인 필요 — 루프가 건너뜀)
- ❓ 10. `privacy.html`의 `[CONTACT_EMAIL]` 자리표시 2곳 교체 — 운영자 이메일 필요
- ❓ 11. 컷신 NPC 5종 HD 초상 제작 — 스타일/생성 방식 결정 필요
- ❓ 12. Steamworks SDK 연동(도전과제·클라우드) — 1.0 포함 여부 결정 필요

## 완료
<!-- /dev-loop가 완료 항목을 여기로 옮기지 않고 위에서 [x] 체크만 한다 -->
