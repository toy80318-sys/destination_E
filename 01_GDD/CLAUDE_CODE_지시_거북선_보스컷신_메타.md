# Claude Code 지시서 — 퀘스트 거북선 스펙 / 보스팝업→컷신 / 잔존 메타

> 작성: Cowork 검증 세션 (2026-06-18). 코드 적용은 Coder(Claude Code) 권한.
> 모든 항목 적용 후 `node --check` + 인게임 1회 확인 → Director 보고.
>
> ⭐ **한/영 정합성 필수(사용자 지시 2026-06-18):** 본 지시서의 **모든 수정 요소(신규/변경 대사·멘트·팝업·라벨)는 `i18n/ko.js`와 `i18n/en.js` 양쪽에 동일 키로 반영**한다. 적용 후 `node scripts/i18n-parity.js` 로 **키 일치·누락 0·미번역(값=키) 0** 확인 필수. 컷신/대사 교체 시 한글만 고치고 영문을 빠뜨리지 말 것.

---

## 1) 퀘스트 거북선(LGD01_SP) — 스펙/크기 변경 없음, 이미지만 생성 ⭐ Director 확정(2026-06-18)

**확정:** 거북선 스펙은 **현행 유지** — 체력·능력치 **×5**, 전투 크기 **×2**. **수치/크기 변경 없음.**

**특수 ×5 거북선 = 퀘스트 경로 전용 (코드 검증 완료, 설계 일치 — 변경 없음):**
- `LGD01_SP`(×5 특수)는 **"설계도 3단편 완성 보상"으로만 1회 지급**(game.js L2964~, `price:0` 구매 불가). → 퀘스트를 통해서만 획득되는 특수 거북선.
- 일반 신화 거북선 `LGD01`(제작/구매·`BLUEPRINT_MAP` P13·P22 드롭)은 **일반 스펙 유지**.
- `BLUEPRINT_MAP`/일반 제작이 `LGD01_SP`를 주는 누수 경로 **없음**(grep 전수 확인). → 추가 조치 불필요.

**현재 상태(유지)** (`js/data/ships.js` L40~41):
- `LGD01_SP` = maxHP 1300000(×5), maxSH 325000(×5), ATT 1225(×5), INT 1175(×5), TEC 1050(×5), LOY 100 / 전투 시 2배 크기
- 기준 `LGD01`: maxHP 260000, maxSH 65000, ATT 245, INT 235, TEC 210
- → **ships.js 및 combat.js 스케일 코드 변경 불필요.** 그대로 둘 것.

**이미지 누락 1건 — 임시 해소 완료 ✅ (2026-06-18, Cowork):**
- `combat.js` L528 이 `img/ships/LGD01_SP.png` 직접 반환하나 파일이 없었음 → **`LGD01.png` 복사본으로 `img/ships/LGD01_SP.png` 생성 완료**(깨진 이미지 방지).
- (선택) 추후 거북선 신화 변형 전용 에셋(2배 크기·강화 톤)으로 교체 권장.

---

## 2) 보스전 팝업 대화 → 컷신 전면 전환 ⭐ 사용자 요청

`js/modules/combat.js` 보스 관련 함수 현황:

| 함수 | 라인 | 현재 형태 | 조치 |
|---|---|---|---|
| `showUrsaMajorIntro` | 3324 | 이미 **컷씬(p6_ch13b)으로 교체됨** (주석 L3321) | ✅ 확인만 |
| `showBossVictoryEpilogue` | 3438 | 이미 **풀스크린 컷신(STORY_SCENES_PC)으로 변경됨** (주석 L3458, 2026-06-17) | ✅ 확인만 |
| `_showUrsaPhase2Popup` | 3396 | **팝업(openModal) 잔존** | → 컷신 전환 |
| `_showBlackfalconPhase2Popup` | 3416 | **팝업(openModal) 잔존** (L1832서 호출) | → 컷신 전환 |
| `showBossCelebration` | 3477 | **팝업(openModal) 잔존** (지구해방 선언) | → 컷신 전환 검토 |

**지시:** 위 3개(`_showUrsaPhase2Popup`, `_showBlackfalconPhase2Popup`, `showBossCelebration`)의 팝업 대화를 `STORY_SCENES_PC` 컷신 호출로 교체. 기존 컷신 전환 2건(intro·epilogue)의 패턴을 그대로 따를 것. 전환 후 보스전 진입~페이즈2~격파~셀레브레이션이 모두 컷신으로 끊김 없이 이어지는지 확인.

---

## 3) act/페이즈 메타 우회 — 잔존 8건 ⭐ 사용자 요청 (대본/스토리 수정)

표시텍스트 속 코드네임(P##/G##/R##/H##/LGD##)은 **검증 결과 0건(이미 본래 이름으로 교체 완료)** ✅.
단, **시스템 메타("행성 N~", "Ring N") 8건 잔존** → 인게임 대사체로 우회 표현:

| 파일:라인 | 원문(발췌) | 권장 수정 방향 |
|---|---|---|
| phase1_quests.js:479 | "…수퍼비아 Ring 1…" | "수퍼비아 **내권역**" 식 세계관 표현 |
| phase1_quests.js:509 | "아우레우스 Ring 1…" | "아우레우스 내권역" |
| phase1_quests.js:543 | "우르사이 마요리스 (치크스) Ring 1…" | "우르사이 마요리스 외곽" 등 |
| phase1_quests.js:567 | (EN) "…Superbia Ring 1…" | "the inner Superbia region" |
| phase1_quests.js:597 | (EN) "Aureus Ring 1…" | "inner Aureus region" |
| phase1_quests.js:631 | (EN) "Ursae Majoris (Chiks) Ring 1…" | "the Ursae Majoris frontier" |
| phase2_quests.js:575 | "다음 단계 — 행성 11~…" | "다음 항로 — **다음 권역으로**" 식 |
| phase3_quests.js:589 | "{사령관}. 다음 단계 — 행성 16~…" | "{사령관}, 다음 항로로 향하자" 식 |

> "ACT N", "페이즈 N", "Phase N" 직접 언급은 잔존 0 (이미 정리됨). 위 8건만 우회 처리하면 메타 노출 0.

---

## 4) 적용 후 검증 명령

```bash
node --check js/data/ships.js js/data/phase1_quests.js js/data/phase2_quests.js js/data/phase3_quests.js js/modules/combat.js
# 코드네임 잔존(0 기대)
grep -rnoE "(text|desc|label|line|msg|title):'[^']*\b(P[0-9]{2}|G[0-9]{2}|R0[1-8]|H1[0-3]|LGD0[0-9])\b" js/data/phase*_quests.js js/story-scenes-pc.js
# 메타 잔존(0 기대)
grep -rnoE "(text|desc|label|line|msg|title):'[^']*(ACT\s*[0-9]|페이즈\s*[0-9]|[Pp]hase\s*[0-9]|행성\s*[0-9]+\s*[~-]|Ring\s*[0-9])" js/data/phase*_quests.js js/modules/combat.js
```

> 연계: 코드네임 치환표 = QUEST_CUTSCENE_CODE_FIX.md · 행성/지역 = PLANET_RENAME_APPLY.md · 컷씬 메타 = CUTSCENE_META_FIX.md
