# 행성명 변경 — 전 표면 커버리지 체크리스트 (빠진 곳 점검용)

> "행성 이름이 바뀌면 어디를 체크해야 하나 / 빠진 곳 없나"에 대한 종합 점검표.
> 핵심: 행성명은 대부분 `I18N.t('planet.<ID>.nm')` 로 표시 → **i18n 값만 바꾸면 자동 반영**. 문제는 **하드코딩된 대사**(코드·옛지명·메타).

---

## A. i18n 자동 반영 — 별도 작업 거의 불필요 ✅

> `planet.<ID>.nm` (그리고 loc/civ/feat/warn/benefit/op) 값만 교체하면 아래는 전부 자동 갱신.

| 표면 | 반영 방식 | 상태 |
|---|---|---|
| 은하지도 (스타맵) | `planet.nm` | ✅ 자동 |
| 각 행성 메뉴 / 메인 허브 / HUD 현재행성 | `planet.nm` | ✅ 자동 |
| 행성 경매 | `planet.nm` | ✅ 자동 |
| 탐색 도감 — 행성 탭 | `planet.nm` + lore i18n | ✅ 자동 |
| 통행료 팝업 · 전투 보고 팝업 | `planet.nm` (하드코딩 0건) | ✅ 자동 |
| 행성 로어(위치/문명/특징/경고/혜택) | `planet.<ID>.loc/civ/...` i18n | ✅ 자동 |
| 백구 멘트 中 `{행성}` 토큰 사용분 | 토큰 치환 | ✅ 자동 |

→ **이 곳들은 i18n 사전 값(A섹션, PLANET_RENAME_APPLY.md)만 바꾸면 끝.**

---

## B. 하드코딩 — 수동 find-replace 필요 ⚠️ (i18n 안 거치고 문자열 직접 박힘)

| 표면 | 파일 | 잔존 요소 |
|---|---|---|
| **컷씬·퀘스트 대사** | `js/data/phase1~6_quests.js` | 옛지명 **12** (Kepler-22b·아레스-III·케플러-62e·47 우르사이 마요리스·제타 레티쿨리·타이탄 기지 등) + **코드** H05/H06/R06 + **메타** 페이즈/행성번호/Ring/+% → **CUTSCENE_META_FIX.md (36건)** 참조 |
| **컷씬 엔진** | `js/story-scenes-pc.js` | 코드 **H08** (제네시스 프로토콜 H08) |
| **엔딩 대화 · 보스 에필로그/인트로** | `js/modules/combat.js` | **우르사-알파**(474·585) → 우르사 알파, **TOI-700**(1067) → 하이브 모우 |
| **메인 로직 모달/알림** | `game.js` | 옛지명(센타우리 에코 등) + 일부 코드/메타 |
| **운항일지(도감 우측)** | `js/data/baekgu-diary.js` | 메타 제목 "제1지 — 각성 **(행성 1~5)**" 등 6개 |
| 엔딩 크레딧 | `js/modules/ending-credits.js` | 표시 텍스트 코드/메타 **0건 (clean)** ✅ |
| 주점/경매/가챠 UI · 도감 UI · 팝업 | tavern·auction·gacha·codex·shakedown·report | 하드코딩 옛지명 **0건** ✅ |

---

## C. 추가로 체크할 곳 (질문 목록에 없던 항목) 🔎

1. **보스 에필로그 / 보스 인트로 팝업** (`combat.js` `showBossVictoryEpilogue`·`showUrsaMajorIntro`·`_showBlackfalconPhase2Popup`) — 옛 행성명 하드코딩(우르사-알파·TOI-700) → 수동 교체.
2. **백구 항해일지 제목** (`baekgu-diary.js`) — "행성 1~5" 같은 **행성번호 메타** → "프록시마 권역" 식으로 풀어쓰기.
3. **game.js 모달·토스트 알림** — 일부 행성명/코드 하드코딩.
4. **i18n 로어 텍스트 자체** — `planet.<ID>.loc/civ/feat` 설명문이 **다른 행성 이름을 직접 언급**하면 그 문장도 같이 수정(자동반영은 키 이름만, 문장 속 타 행성명은 아님).
5. **컷씬 메타 표현 전반** — 페이즈/스탯%/함선수/크루수 → CUTSCENE_META_FIX.md 의 원칙대로 인게임 대사화.

---

## D. 통합 검사 명령 (적용 후 0 확인용)

```bash
# 1) 하드코딩 옛 행성/지역명
grep -rnE "Kepler-22b|Kepler-442b|아레스-III|케플러-62[ef]|케플러-452|47 우르사이 마요리스|TRAPPIST|TOI-700|LHS 1140|글리제 667|글리제 581g|캅테인 b|타이탄-X|타이탄 기지|우르사-알파|오미크론-퍼세이|로스 128|티가든 금융|볼프 1061c|기가-넷" js/ game.js

# 2) 대사 속 코드네임
grep -rnE "text:'[^']*(H0[1-9]|R0[1-8]|G[0-9]{2}|LGD0[0-9])" js/data/phase*_quests.js js/story-scenes-pc.js js/modules/combat.js

# 3) 대사 속 메타(페이즈/행성번호/스탯)
grep -rnE "text:'[^']*(페이즈\s*[0-9]|행성\s*[0-9]+\s*[~-]|Ring\s*[0-9]|[+\-][0-9]+\s*%|크루\s*[0-9]+\s*명)" js/data/phase*_quests.js js/modules/combat.js
```

---

## E. 적용 우선순위 요약

1. **i18n 행성명 31종 교체** (PLANET_RENAME_APPLY.md A) → A섹션 표면 전부 자동 해결.
2. **하드코딩 지역명 교체** (PLANET_RENAME_APPLY.md B) → 컷씬·엔딩·combat.js·game.js.
3. **컷씬 코드·메타 정리** (CUTSCENE_META_FIX.md, 36건) → 몰입 깨는 표현 제거.
4. 위 D의 grep 3종으로 잔존 0 확인 → `node --check` + 게임 실행 검수.

> 결론: 질문하신 표면 중 **탐색도감·은하지도·행성메뉴·행성경매·통행료팝업·백구멘트(토큰)** 는 i18n 자동반영(A). **컷씬·퀘스트·엔딩 대화/팝업·보스 에필로그·일지 제목·game.js 모달** 은 수동 교체(B·C). 엔딩 크레딧 표시 텍스트는 이미 깨끗.
