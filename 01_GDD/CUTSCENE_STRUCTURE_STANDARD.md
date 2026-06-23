# 컷신 표준 구조 (Cutscene Structure Standard)

> 목적: 게임 내 모든 대사 시퀀스(컷신)를 **단일 표준 구조**로 통일한다.
> 이 표준은 새 컨벤션이 아니라 **이미 존재하는 `showCharDialog` 패턴으로의 수렴**이다 (CLAUDE.md "새 컨벤션 금지" 준수).
> 근거: 컷신 전수 감사 (2026-06-23).

---

## 1. 배경 — 현재 비일관성

대사 시퀀스가 **렌더러 3종**으로 분산되어 있다:

| 렌더러 | 위치 | scene 필드 | 음성 |
|---|---|---|---|
| **R1 `showCharDialog`** (표준) | `js/story-scenes-pc.js:87` | `{char,name,color,text,vid?}` | `VoicePlayer.playLine` (vid 우선→text 폴백) |
| R2 combat openModal 스테퍼 | `js/modules/combat.js:3649~` | `{sp,tx}` | 없음 (text 옵저버 의존) |
| R3 엔딩 오버레이 | `js/modules/ending-credits.js:289~` | `{sp,col,tx,ic}` | 없음 |

추가 문제:
- **scene 필드명 3종 혼재**: `{char,name,color,text}` vs `{sp,tx}` vs `{sp,col,tx,ic}`. 일부 호출부가 `.map()`으로 즉석 변환(중복 하드코딩): `combat.js:3738`, `quest-gen.js:214,259`.
- **화자→char/color 매핑을 지역화 이름 if-비교로 재도출** (취약): `combat.js:3740`, `quest-gen.js:219`, `ending-credits.js:339,343,662`. 정답 레지스트리(`factions.js STORY_NPCS`, `HEROES`)가 있는데 미사용.
- **vid 명시가 거의 전무** — 단 2곳(`story-quest-engine.js:153` 게이트, `shakedown-popup.js:14` 통행료). 영웅·Phase·combat 보스·엔딩 컷신 전부 vid 없음 → 보스 격파 에필로그 무음 버그의 직접 원인.

---

## 2. 표준 scene 객체 스키마

```js
{
  char:  'baekgu1',                 // (필수) 초상 키 — portrait 맵으로 해석
  name:  I18N.t('speaker.baekgu'),  // (권장) 화자 표시명 — i18n (하드코딩 금지)
  color: '#66ddff',                 // (권장) 화자명 색상
  text:  I18N.t('ursa.outro.bk'),   // (필수) 대사 — i18n
  vid:   '<manifest key>',          // (선택·권장) 명시 음성 id → VOICE_MANIFEST
  female: undefined                 // (선택) 성별 음성 강제 (사령관 등)
}
```

- 임시 형식 `{sp,tx}`, `{sp,col,tx,ic}`는 **폐기**.
- `char`는 처음부터 초상 id를 직접 보유 → 지역화 이름 비교 제거.

## 3. 단일 진입 API

```js
STORY_SCENES_PC.showCharDialog({ scenes: [ /* 표준 scene 배열 */ ], onDone });
```

- 모든 대사 시퀀스는 이 경로로. R1은 이미 try/catch + onDone 폴백 + idle 타임아웃 + 중복트리거 가드 보유(`story-scenes-pc.js:88,313,733,739`).

## 4. 화자 레지스트리 일원화

화자→`char`/`color` 매핑을 **단일 헬퍼**로:

```js
STORY_SCENES_PC.speakerToChar(id) // → {char, color}  (factions.js STORY_NPCS + HEROES 기반)
```

- 호출부의 if-문자열 비교 제거. scene 데이터는 화자 `id`를 직접 들고 다닌다.

## 5. 음성 배선 표준

- **vid 명시를 1순위.** 키 포맷은 manifest 숫자키 권장(shakedown 패턴). i18n 점표기 키는 manifest 항목이 있을 때만(게이트 패턴 — 동작 확인됨).
- text매칭은 **폴백으로만**.
- `{nm}` 등 플레이스홀더가 치환되는 대사는 **반드시 vid 명시** (치환 후 text매칭이 깨지므로).
- SSOT: `01_GDD/voice/voice_manifest.csv`. 생성기 drift(VOICE_BYTEXT vs VOICE_TEXT2NUM) 주의 — 재생성으로 기존 음성 깨뜨리지 말 것.

## 6. 데이터 위치 일원화

- 대사 콘텐츠는 **데이터파일**로 (Phase 컷신 `js/data/phase*_quests.js`가 모범).
- combat/엔딩/보이드 인라인 대사도 동급 데이터로 이전, 코드는 ID 참조만.

### 6-1. 통합 대상 — 보스/엔딩 컷신 (사용자 지정 2026-06-23)

현재 보스·엔딩 컷신 정의가 여러 모듈에 인라인으로 흩어져 있다. 이를 **공통 컷신 데이터 모듈**(예: `js/data/boss-cutscenes.js`)에 표준 `{char,name,color,text,vid}` 배열로 모으고, 트리거 함수는 거기서 참조만 한다.

| 컷신 | 현재 위치(인라인) | 렌더러 | 통합 처리 |
|---|---|---|---|
| 우르사 보스전 후 에필로그 | `combat.js:3716` `showBossVictoryEpilogue` (`{sp,tx}`→표준, vid 601~609 배선됨) | R1 showCharDialog | 데이터→공통모듈, vid 유지 🟢 |
| 우르사 페이즈2 팝업 | `combat.js:3694` `_showUrsaPhase2Popup` | R1 | 데이터→공통모듈 🟢 |
| 블랙팔콘 페이즈2 팝업 | `combat.js:3704` `_showBlackfalconPhase2Popup` | R1 | 데이터→공통모듈 🟢 |
| 보이드 보스 인트로/아웃트로 | `quest-gen.js:213~271` (`{sp,tx,fx}`→표준) | R1 | 데이터→공통모듈 🟡 |
| 지구해방 엔딩 컷신 | `ending-credits.js:289~` (R3, `{sp,col,tx,ic}`) + `combat.js:3755` `showBossCelebration`(모달) | R3 (고유 연출) | **데이터만 공통모듈로, 렌더러(R3 자동롤·크레딧 연출)는 보존** — 렌더러 통합은 비권장/승인 필요 🔴 |

원칙:
- R1 경유 컷신(에필로그·페이즈2·보이드)은 **데이터+화자매핑+vid를 공통모듈/헬퍼로 일원화** (저~중위험).
- 엔딩(R3)은 **대사 데이터·화자매핑만 표준 정렬**하고 **고유 렌더링(자동 진행·크레딧 롤·레이아웃)은 유지**. 렌더러 자체 통합은 고위험이라 별도 승인 전 금지.
- 통합 후 회귀 검증 필수: 각 컷신 1회 재생 흐름·초상·색·순서·음성(vid) 동일성, 엔딩 연출 무손상.

---

## 7. 단계별 리팩터링 계획 + 위험도

| 단계 | 내용 | 위험도 |
|---|---|---|
| **1. 화자 매핑 일원화** | `speakerToChar()` 헬퍼 신설(STORY_NPCS+HEROES), `combat.js:3738`·`quest-gen.js:214,259` if-매핑 치환 | 🟢 낮음 |
| **2. scene 스키마 정리** | combat/quest-gen `{sp,tx}`→`{char,name,color,text}` 표준화 | 🟡 중 (텍스트·순서 누락 주의) |
| **3. vid 배선** | 영웅·Phase·combat 보스·게이트 컷신에 `vid` 부여 | 🟡 중 (manifest 누락 키는 조용히 폴백→안전) |
| **4. R2(combat 보스 브리핑)→showCharDialog 흡수** | openModal 스테퍼 제거 | 🔴 높음 (전투 진입 분기 결합 — 깨지면 진행 불가) |
| **5. R3(엔딩) 표준화** | — | 🔴🔴 매우 높음. **통합 비권장** — 스키마/화자매핑만 헬퍼로 정렬, 렌더러는 유지 |
| **6. 데이터 위치 이전** | 인라인 대사→데이터파일 | 🟡 중 (전역 로드 타이밍·중복 로드 가드) |

### 적용 원칙
- **1~3단계(저~중위험) 우선 적용.** 각 단계: 추출/치환 → `node --check` → 해당 컷신 1회 재생 검증 → 회귀(기존 컷신 음성·초상·순서) 확인.
- **4~5단계(고위험)는 실행 전 사람 승인.** 특히 엔딩(R3)은 고유 연출 손실 위험으로 렌더러 통합 비권장.
- 커밋/push는 사람 승인 전 금지.
