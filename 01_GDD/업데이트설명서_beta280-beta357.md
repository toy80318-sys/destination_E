# DESTINATION EARTH — 업데이트 설명서 (v1.0.0-beta.280 → beta.357)

> 기간: beta.280 이후 누적 (현재 설치본 기준 beta.354, 저장소 최신 beta.357, 2026-07-09) · 출처: git 커밋 81개 요약.
> 한 줄 요약: 이 구간의 핵심은 **① 전체화면 오프닝 프롤로그 신설**, **② 모바일(Android/Capacitor) 대응 착수**, **③ 음성 정합·재녹음 대량 보강**, **④ 보스 극악난이도 강화**, 그리고 **⑤ 새 게임 안정화(크래시·음성 폭주 수정)** 입니다.

---
## 🎬 1. 오프닝 프롤로그 (신규)
- **전체화면 오프닝 프롤로그 신설:** 새 게임을 시작하면 100년 전 사건을 담은 프롤로그가 먼저 재생됩니다(이미지 없을 때 자동 스킵 가드 포함).
- **새 게임 = 프롤로그 우선:** 새 게임 진입 시 다른 자동 컷신은 억제하고 프롤로그만 재생.
- **백구 1인칭 나레이션 음성:** 프롤로그 전용 백구 음성 14개 생성·연동. 나레이터를 본편과 분리하고, 저음(B.Brian·eleven_v3)으로 재녹음해 딱딱함/연기 톤 개선.
- **프롤로그 키아트 10컷** 임시 배치(경로 `img/prologue/`), scene09 등 교체.

## 📱 2. 모바일(Android) 대응 — Capacitor
- **Capacitor Android 스캐폴드:** 설정·webDir 빌드·네이티브 초기화 + 가이드 추가로 같은 웹 코드베이스를 안드로이드 앱으로 패키징하는 기반 마련.
- **모바일 UI 재설계(`body.is-mobile` 토큰 기반):**
  - 허브 사이드바 → **드로어(햄버거)** 재구성.
  - 모달 → **바텀시트**(하단 시트·둥근 상단·버튼 상단 이동).
  - 세이프에어리어(노치) 대응, 타이틀·언어토글 등 **터치 타깃 확대**.
  - 가로 폰 대응 `@media max-height:600` 보정.
- **에셋 최적화 파이프라인:** 이미지 용량 약 85%↓(652MB→96MB), 오디오 ffmpeg 재인코딩 — 앱 용량 다이어트.
- **앱 아이콘·스플래시 CI 자동 생성**(@capacitor/assets) + **Android 테스트 APK 클라우드 빌드(CI)** + 테스트 가이드.

## 🎙️ 3. 음성(보이스) 정합·보강
- **한글판 오용 교정:** 백구·사령관·시스템이 영어(EN) 보이스로 나오던 것을 KO 보이스로 재생성.
- **영문판 미재생 수정:** `lang()`이 존재하지 않던 `I18N.lang` 대신 `getLang()`을 쓰도록 교정 → 영문 음성 정상 재생.
- **영문판 정합:** 최근 추가분 40개(674~713) EN 음성 생성·연동, Aori 음성 남성으로 교정(Matilda→Patrick).
- **엔딩 무음 대사 음성화:** 실제 엔딩(earthLiberationEnding)에 vid 주입, 엔딩 크레딧 무음 대사 9개(vid 674~682) 캐릭터별 음성 추가.
- **백구 동적 멘트 음성화:** 이름 변수는 제외하고 읽도록 처리(핵심 25개 + 컷신).
- **발음 교정:** 테슬라 "100,247"(십만 이백사십칠), 광개토 "1700년" 등.
- **첫 만남 인사 멘트 제거**(연출 정리), 약탈자(도르가) 음성 굵게 교체.

## ⚔️ 4. 전투 · 밸런스
- **보스 극악난이도 강화:** 우르사 메이저 30%·블랙팔콘 히든보스 50% 확률로 아군 함선 **1방 즉파괴**.
- **전투력 상한 1000 → 2000** 상향, 검은 함선 컷신 후 전투력 500+ 대형 적함 등장.
- **학익진 진형 수렴 속도 2배** — 학익진 발동 시 더 빠르게 진형 형성.
- 아이젠클로 중간보스전: 컷신이 차단돼도 전투에 반드시 진입하도록 안전망 추가.

## 🐛 5. 버그 수정 · 안정화 (특히 새 게임)
- **새 게임 크래시 수정:** `ft-sh` 값 따옴표 손상으로 인한 새 게임 크래시 복구(beta.285).
- **"갑자기 음성" 수정:** 새 게임 시 영웅 위치단서 음성 8개가 한꺼번에 재생되던 문제 수정.
- **영웅 퀘스트 순서:** 스폰에 페이즈 게이트 적용 — 새 게임에 전 페이즈 영웅 퀘스트가 쏟아지던 문제 수정.
- **index.html 손상 복구:** beta.279에서 발생한 mojibake(문자 깨짐) 복구 + 게이트힌트 컷신 하이재킹 수정.
- **불러오기 수정:** 로드 시 엔딩 오버레이가 강제 재생되던 문제 수정.
- **UI:** 특수 거북선/디스트로이스타 수령 팝업 이미지 중앙정렬, 정비소 함선 HP·SH 수치 표시, 홀로버튼 호버 스크롤바·거래소 버튼 너비.

## 🚀 6. 배포 · 스팀 · 인프라
- **개인정보처리방침 추가** — 데이터 수집 게임의 GDPR/스팀 출시 필수 요소.
- **웹 자동 배포:** Firebase Hosting을 릴리스 태그에 자동 배포(로컬 firebase login 의존 제거).
- **모바일 CI:** Android APK 빌드를 릴리스 태그에 자동 연동 + GitHub Release 첨부.
- **에이전트·하네스·루프 엔지니어링 세팅**(`.claude` 팀 공유 구성) — Write/Edit 후 구문·i18n 자동 검사 훅, 리뷰어/테스터 에이전트, `/verify-game`·`/ship` 커맨드.

---
### 버전 / 캐시
- 저장소 최신 `package.json` version **1.0.0-beta.357**, 캐시버스터 `20260709003`, `_GAME_VER` `20260709.web_v1.0.0-beta.357`.
- 현재 사용자 설치본은 **beta.354** — 최신(357)과의 차이는 릴리스 미세 조정 수준.
- ※ 본 문서는 git 커밋 메시지 기반 요약입니다. 플레이어용 패치노트로는 §1~§4, 개발/QA용으로는 §5~§6까지 포함.

---
---

# DESTINATION EARTH — Update Notes (v1.0.0-beta.280 → beta.357)

> Period: cumulative since beta.280 (installed build beta.354, latest repo build beta.357, 2026-07-09) · Source: summary of 81 git commits.
> In one line: this stretch centers on **① a new full-screen opening prologue**, **② the start of mobile (Android/Capacitor) support**, **③ major voice consistency & re-recording work**, **④ tougher extreme-difficulty bosses**, and **⑤ new-game stabilization (crash & voice-spam fixes)**.

---
## 🎬 1. Opening Prologue (New)
- **New full-screen opening prologue:** starting a new game now plays a prologue depicting the events of 100 years ago (with an auto-skip guard when images are missing).
- **New game = prologue first:** other automatic cutscenes are suppressed on new-game entry so only the prologue plays.
- **Baekgu first-person narration voice:** 14 prologue-only Baekgu voice clips generated and wired. The narrator is split from the main game and re-recorded in a deep tone (B.Brian · eleven_v3) to fix stiffness/acting.
- **10 prologue key-art frames** placed provisionally (path `img/prologue/`), with scene09 and others swapped.

## 📱 2. Mobile (Android) Support — Capacitor
- **Capacitor Android scaffold:** config, webDir build, native init, and a guide — laying the groundwork to package the same web codebase as an Android app.
- **Mobile UI redesign (`body.is-mobile` token-based):**
  - Hub sidebar → **drawer (hamburger)**.
  - Modals → **bottom sheets** (bottom-anchored, rounded top, buttons moved up).
  - Safe-area (notch) support; enlarged **touch targets** for title, language toggle, etc.
  - Landscape-phone fix via `@media max-height:600`.
- **Asset optimization pipeline:** images reduced ~85% (652MB→96MB), audio re-encoded with ffmpeg — trimming app size.
- **App icon/splash auto-generated in CI** (@capacitor/assets) + **cloud-built Android test APK (CI)** + testing guide.

## 🎙️ 3. Voice — Consistency & Reinforcement
- **KO build misuse fixed:** Baekgu/Commander/System that were playing English voices regenerated with KO voices.
- **EN playback fix:** `lang()` now uses `getLang()` instead of the nonexistent `I18N.lang`, restoring English voice playback.
- **EN parity:** 40 recent additions (674–713) generated & wired in English; Aori corrected to a male voice (Matilda→Patrick).
- **Silent ending lines voiced:** vid injected into the actual ending (earthLiberationEnding); 9 silent ending-credit lines (vid 674–682) given per-character voices.
- **Baekgu dynamic lines voiced:** read while excluding name variables (25 core lines + cutscenes).
- **Pronunciation fixes:** Tesla "100,247", Gwanggaeto "year 1700", etc.
- **First-meeting greetings removed** (staging cleanup); raider (Dorga) voice swapped to a heavier tone.

## ⚔️ 4. Combat · Balance
- **Extreme-difficulty bosses buffed:** Ursa Major 30% / Black Falcon hidden boss 50% chance to **one-shot** a friendly ship.
- **Combat-power cap 1000 → 2000**; large enemy ships (500+ power) appear after the black-ship cutscene.
- **Crane-wing formation converges 2× faster** when triggered.
- Eisenklau mid-boss: safety net so the battle is always entered even if its cutscene is blocked.

## 🐛 5. Bug Fixes · Stabilization (esp. New Game)
- **New-game crash fixed:** recovered from a crash caused by corrupted `ft-sh` value quotes (beta.285).
- **"Sudden voice" fix:** 8 hero-location-clue voices that all played at once on new game.
- **Hero quest ordering:** phase gate applied to spawns — fixes all-phase hero quests flooding a new game.
- **index.html corruption recovered:** mojibake introduced in beta.279 fixed + gate-hint cutscene hijacking fixed.
- **Load fix:** ending overlay force-replaying on load fixed.
- **UI:** centered special Geobukseon/Destroy-Star reward popup images, HP·SH values shown for workshop ships, holo-button hover scrollbar & exchange button width.

## 🚀 6. Release · Steam · Infrastructure
- **Privacy policy added** — required for GDPR/Steam release of a data-collecting game.
- **Web auto-deploy:** Firebase Hosting deploys on release tags (local firebase login dependency removed).
- **Mobile CI:** Android APK build auto-linked to release tags + attached to GitHub Releases.
- **Agent/harness/loop engineering setup** (`.claude` team-shared config) — post Write/Edit syntax & i18n auto-check hooks, reviewer/tester agents, `/verify-game` & `/ship` commands.

---
### Version / Cache
- Latest repo `package.json` version **1.0.0-beta.357**, cache buster `20260709003`, `_GAME_VER` `20260709.web_v1.0.0-beta.357`.
- Current installed build is **beta.354** — differences vs. latest (357) are release-level minor tweaks.
- ※ This document summarizes git commit messages. For player patch notes use §1–§4; for dev/QA include §5–§6.

---
---

## 🔖 업데이트 태그 / 키워드 (KO)

**패치 핵심 태그:** `#오프닝프롤로그` `#백구나레이션` `#모바일버전준비` `#안드로이드` `#풀보이스` `#음성정합` `#영어음성` `#보스강화` `#극악난이도` `#학익진` `#새게임안정화` `#버그수정` `#스팀출시준비`

**스토어/공지 검색 키워드:** 데스티네이션 어스 업데이트, beta.357, 오프닝 프롤로그, 백구, 모바일 안드로이드, 풀보이스 한국어·영어, 우르사 메이저, 블랙팔콘, 거북선, 우주 함대 RPG, 턴제 전략

## 🔖 Update Tags / Keywords (EN)

**Patch highlight tags:** `#OpeningPrologue` `#BaekguNarration` `#MobileReady` `#Android` `#FullyVoiced` `#VoiceFixes` `#EnglishVoice` `#BossBuff` `#ExtremeDifficulty` `#CraneWingFormation` `#NewGameStability` `#BugFixes` `#SteamSoon`

**Store/announcement keywords:** Destination Earth update, beta.357, opening prologue, Baekgu, mobile Android, fully voiced (Korean & English), Ursa Major, Black Falcon, Turtle Ship, space fleet RPG, turn-based strategy
