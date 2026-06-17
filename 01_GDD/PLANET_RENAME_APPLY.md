# 이름 변경 마스터 — 행성 + 지역/위치명 일괄 교체표 · Claude Code 바로 적용

> 기존 게임 상태에서 이 문서만 보고 **모든 변경(행성명 + 지역/위치명)을 일괄 적용**할 수 있도록 정리했습니다.
> 두 종류:
> - **(A) 행성 이름** — `planet.<ID>.nm` i18n 값(ko/en) 교체.
> - **(B) 지역/위치명** — 퀘스트·컷씬·스토리에 **하드코딩된 문자열** 직접 find-replace.
> ⚠️ 게임 코드 수정은 Coder(Claude Code) 권한. 적용 후 `node --check` + 실행 검증 필수.

---

# (A) 행성 이름 — `planet.<ID>.nm` (ko / en)

| i18n 키 | KO | EN |
|---|---|---|
| `planet.P01.nm` | 프록시마B | Proxima B |
| `planet.P02.nm` | 센타우리 에코 | Centauri Echo |
| `planet.P03.nm` | 버나드 프라임 | Barnard Prime |
| `planet.P04.nm` | 카스텔룸 | Castellum |
| `planet.P05.nm` | 티가든 | Teegarden |
| `planet.P06.nm` | 넥서스 프라임 | Nexus Prime |
| `planet.P07.nm` | 메르카투 | Mercatus |
| `planet.P08.nm` | 글리제 | Gliese |
| `planet.P09.nm` | 볼티움 | Voltium |
| `planet.P10.nm` | 페르세틴 | Persetin |
| `planet.P11.nm` | 펙토라움 | Pectoraum |
| `planet.P12.nm` | 기가툼 | Gigatum |
| `planet.P13.nm` | 아이젠콕 | Eisenkock |
| `planet.P14.nm` | 슈멜츠 | Schmelz |
| `planet.P15.nm` | 타르타로스 | Tartarus |
| `planet.P16.nm` | 페스작센 | Fessachsen |
| `planet.P17.nm` | 하이브 모우 | Hive Maw |
| `planet.P18.nm` | 카토닉 | Catonic |
| `planet.P19.nm` | 우르사 알파 | Ursa Alpha |
| `planet.P20.nm` | 오미크론 | Omicron |
| `planet.P21.nm` | 코사크 | Cossack |
| `planet.P22.nm` | 벙커존 | Bunker Zone |
| `planet.P23.nm` | 뉴 마스 | New Mars |
| `planet.P24.nm` | 루나 게이트 | Lunar Gate |
| `planet.P25.nm` | 유로파 | Europa |
| `planet.P26.nm` | 타이탄H | Titan H |
| `planet.P27.nm` | 글리제 균열 | Gliese Rift |
| `planet.P28.nm` | 캅테인 균열 | Kapteyn Rift |
| `planet.P29.nm` | 오리온 균열 | Orion Rift |
| `planet.P30.nm` | 제타 레티쿨리 | Zeta Reticuli |
| `planet.P31.nm` | 지구 | Earth |

### 붙여넣기용 i18n 사전 형식

```js
'planet.P01.nm': { ko: '프록시마B',     en: 'Proxima B' },
'planet.P02.nm': { ko: '센타우리 에코',  en: 'Centauri Echo' },
'planet.P03.nm': { ko: '버나드 프라임',  en: 'Barnard Prime' },
'planet.P04.nm': { ko: '카스텔룸',       en: 'Castellum' },
'planet.P05.nm': { ko: '티가든',         en: 'Teegarden' },
'planet.P06.nm': { ko: '넥서스 프라임',  en: 'Nexus Prime' },
'planet.P07.nm': { ko: '메르카투',       en: 'Mercatus' },
'planet.P08.nm': { ko: '글리제',         en: 'Gliese' },
'planet.P09.nm': { ko: '볼티움',         en: 'Voltium' },
'planet.P10.nm': { ko: '페르세틴',       en: 'Persetin' },
'planet.P11.nm': { ko: '펙토라움',       en: 'Pectoraum' },
'planet.P12.nm': { ko: '기가툼',         en: 'Gigatum' },
'planet.P13.nm': { ko: '아이젠콕',       en: 'Eisenkock' },
'planet.P14.nm': { ko: '슈멜츠',         en: 'Schmelz' },
'planet.P15.nm': { ko: '타르타로스',     en: 'Tartarus' },
'planet.P16.nm': { ko: '페스작센',       en: 'Fessachsen' },
'planet.P17.nm': { ko: '하이브 모우',    en: 'Hive Maw' },
'planet.P18.nm': { ko: '카토닉',         en: 'Catonic' },
'planet.P19.nm': { ko: '우르사 알파',    en: 'Ursa Alpha' },
'planet.P20.nm': { ko: '오미크론',       en: 'Omicron' },
'planet.P21.nm': { ko: '코사크',         en: 'Cossack' },
'planet.P22.nm': { ko: '벙커존',         en: 'Bunker Zone' },
'planet.P23.nm': { ko: '뉴 마스',        en: 'New Mars' },
'planet.P24.nm': { ko: '루나 게이트',    en: 'Lunar Gate' },
'planet.P25.nm': { ko: '유로파',         en: 'Europa' },
'planet.P26.nm': { ko: '타이탄H',        en: 'Titan H' },
'planet.P27.nm': { ko: '글리제 균열',    en: 'Gliese Rift' },
'planet.P28.nm': { ko: '캅테인 균열',    en: 'Kapteyn Rift' },
'planet.P29.nm': { ko: '오리온 균열',    en: 'Orion Rift' },
'planet.P30.nm': { ko: '제타 레티쿨리',  en: 'Zeta Reticuli' },
'planet.P31.nm': { ko: '지구',           en: 'Earth' },
```

---

# (B) 지역/위치명 — 하드코딩 문자열 find-replace

> 아래는 i18n 키가 아니라 퀘스트·컷씬·스토리 대사에 **문자열 그대로** 박혀 있는 위치명입니다.
> 행성명 교체와 별도로, 이 문자열들을 직접 치환해야 스토리 표기가 일치합니다. (괄호 = 게임 소스 등장 횟수)

| 기존 문자열 (찾기) | 변경 (바꾸기) | 비고 |
|---|---|---|
| `Kepler-22b` (13) | `아이젠콕` / EN `Eisenkock` | P13 행성명과 동일 — 본문 하드코딩분 |
| `Kepler-442b` (11) | `슈멜츠` / EN `Schmelz` | P14, 포지 행성(거북선 완성지) |
| `아레스-III` (4) | `페스작센` / EN `Fessachsen` | P16, 어둠의 요새 |
| `케플러-62e` (1) | `벙커존` / EN `Bunker Zone` | 에코 기지 위치 = P22 |
| `47 우르사이 마요리스 b` (2) | `우르사이 마요리스` / EN `Ursae Majoris` | 이순신 캡슐 좌표(= P19 우르사 알파 권역). 명칭 단축 |

### 위치 정합성 메모 (스토리 일관성)

- **볼프 교역소**(3회) — 문자열은 그대로 두되, 위치 = **버나드 프라임(P03)**. (planet.P03.nm 교체로 행성명 자동 반영. 별도 "볼프 1061c" 문자열은 소스에 없음)
- **에코 기지**(5회) · **오딧세이 보급망**(오딧세이 10회) — 시설/보급망 명칭은 유지. 위치는 각각 **벙커존(P22)** / **벙커존~뉴 마스(P22~P23)**.
- **옛 소련 캡슐(VOSTOK)** — 위치 = **티가든(P05) 인근**. (문자열 변경 없음, 위치 설명만)

### 치환 대상 파일 (예상)

- `js/data/phase1_quests.js` ~ `phase6_quests.js` (대사·desc)
- `js/story-scenes-pc.js`, `js/story-quest-engine.js`
- `js/data/baekgu-diary.js` (운항 일지 원문)
- 위치 확인: `grep -rn "Kepler-22b\|Kepler-442b\|아레스-III\|케플러-62e\|우르사이 마요리스" js/`

---

# (C) 컷씬 잔존 코드네임 → 실명 (대사에 코드 노출 금지)

> 컷씬 대사(`text:`)에 `R06` 같은 코드가 그대로 보이면 안 됨 → 실제 이름으로 치환.

### 즉시 수정 — 화면 보고된 R06 (이순신 컷씬, 페이즈3)

| 파일·라인 | 기존 | 변경 |
|---|---|---|
| `js/data/phase3_quests.js:571` (KO) | `…타이탄 기지이야. 연대를 공식화하고 R06를 확보하자.` | `…타이탄H이야. 연대를 공식화하고 저항군 반물질을 확보하자.` |
| `js/data/phase3_quests.js:663` (EN) | `…Our heading is Titan Base. … secure the R06.` | `…Our heading is Titan H. … secure the Resistance Antimatter.` |
| `js/data/phase3_quests.js:100` (desc) | `레인저: "R06 반물질 5단 팩…"` | `레인저: "저항군 반물질 5단 팩…"` |

### 재료 코드 R01~R08 → 실명 (`commodity.R##.nm`)

| 코드 | KO | EN(예시) | 팩션 |
|---|---|---|---|
| R01 | (i18n 확인 — 보이드 계열) | Void … | F07 보이드 |
| R02 | (i18n 확인 — 치크스 계열) | Chiks … | F05 치크스 |
| R03 | 아우레우스 태양핵 | Aureus Solar Core | F02 |
| R04 | 크리그 마그마 코어 | Krieg Magma Core | F04 |
| R05 | 메카니카 양자칩 | Mechanica Quantum Chip | F03 |
| R06 | 저항군 반물질 | Resistance Antimatter | F06 |
| R07 | 수퍼비아 중력자 | Superbia Graviton | F01 |
| R08 | 은하 혼돈 결정 | Galactic Chaos Crystal | F07 |

> - R01·R02 정확한 이름은 `commodity.R01.nm`·`commodity.R02.nm` i18n 값으로 확인 후 치환.
> - **컷씬 코드 전수 검사:** `grep -rnE "text:'[^']*(R0[1-8]|G[0-9]{2}|LGD0[0-9])" js/data/phase*_quests.js js/story-scenes-pc.js`
> - 현재 `text:` 대사 중 잔존 코드는 **R06(phase3:571/663) 1건**뿐. 나머지 컷씬은 이미 실명화(v1.0.0-beta.126)됨. desc/label 필드엔 R02·R03·R04·R06·R07·R08 일부 잔존 — 표기 일관성 위해 함께 정리 권장.
> - 참고: 운항기록 HTML(`BAEKGU_VOYAGE_LOG.html`) 대사에는 코드 노출 없음(이미지 경로만 코드 형태).

---

# (D) 탐색도감 → 문명 설명 (`faction.F0#.start`) — 코드/옛지명 잔존

> 도감 "문명" 탭의 각 문명권 **시작/대표 행성** 필드(`faction.F0#.start`, `i18n/ko.js`·`i18n/en.js`)에 **"P##" 코드 접두어 + 일부 옛 행성명**이 노출됨. 코드 제거 + 신규 행성명으로.

| 키 | 현재 (KO) | → 권장 (KO) | EN 현황 |
|---|---|---|---|
| `faction.F01.start` | `P01 프록시마B` | `프록시마B` | `P01 Proxima B` → `Proxima B` |
| `faction.F02.start` | `P06 넥서스 프라임` | `넥서스 프라임` | `P06 Nexus Prime` → `Nexus Prime` |
| `faction.F03.start` | `P09 볼티움` | `볼티움` | `P09 Voltium` → `Voltium` |
| `faction.F04.start` (크리그) | `P13 케플러-22b` ⚠ | `아이젠콕` | `P13 Eisenkock`(이미 신규명, P13만 제거) |
| `faction.F05.start` (치크스) | `P17 시리우스 베타 (TOI-700)` ⚠ | `하이브 모우` | `P17 Sirius Beta (TOI-700)` → `Hive Maw` |
| `faction.F06.start` (저항군) | `P22 지구 (태양계, 봉쇄됨)` ⚠ | `벙커존 (태양계 저항 거점)` ※지구는 P31 — 불일치, 확인 | `P22 Earth (...)` → `Bunker Zone (...)` |
| `faction.F07.start` | `P30 제타 레티쿨리 (균열 최심부)` | `제타 레티쿨리 (균열 최심부)` | `P30 Zeta Reticuli (...)` → `Zeta Reticuli (...)` |

> - **크리그(F04) 질문 답:** KO `start` 값에 옛 행성명 **"케플러-22b"** 남아 있음 → **아이젠콕**으로 수정(EN은 이미 Eisenkock). `env/traits/warn/look/quip` 등 나머지 F04 설명문에는 옛 행성명 없음(환경·문화 서술뿐).
> - 7개 문명 모두 **"P##" 코드 접두어 제거** 권장(도감 표시용엔 코드 불필요).
> - **F06 "지구" 불일치:** F06 대표행성은 P22(벙커존)인데 텍스트는 "지구"(P31). 의도(저항군 고향=지구)인지 오류인지 확인 후 처리.
> - 검사: `grep -nE "faction\.F0[1-7]\.start" i18n/ko.js i18n/en.js`

---

## 적용 순서 (권장)

1. **(A)** `planet.<ID>.nm` ko/en 값 교체 (i18n 사전).
2. **(B)** 하드코딩 지역명 find-replace (KO/EN 필드 각각).
3. `node --check game.js` + 변경 js 전부 검증.
4. 게임 실행 → 은하지도·컷씬·운항기록 행성/지역명 표기 일치 확인.

> 운항기록 문서(`BAEKGU_VOYAGE_LOG.html`)에는 (A)·(B) 모두 한글/영문 반영 완료.
