# Claude Code 지시서 — Cowork 세션 인수인계 (2026-06-14)

Cowork에서 분석·분리·정리 작업을 진행했고, **실행 검증·커밋·버전 bump**는 Claude Code에서 마무리한다.
아래 순서대로 진행. (역할: Director→Planner→Coder→Reviewer/Tester 흐름 준수)

---

## 0. 이번 세션에서 이미 적용된 변경 (현재 작업트리 상태)

| 파일 | 변경 내용 |
|---|---|
| `CLAUDE.md` | 프로젝트 지침 보강 (빌드/검증/Steam/세이브/에셋 규칙) |
| `game.js` | 8,497 → **4,946줄**. 전투 블록(구 4899~8452, `_enemyTierBoost`~`_grantBlackHoleRewardsSilent`) 제거 |
| `js/modules/combat.js` | **신규 3,564줄 / 전투 함수 62개** (game.js에서 분리) |
| `index.html` | `game.js` 직후에 `<script src="js/modules/combat.js?v=...">` 추가 |
| (삭제) | 루트 `ships.js`·`phase6_quests.js`·`story-scenes-pc.js` — 널바이트 손상 고아 파일 제거 (정상본은 `js/data/`·`js/`에 유지, git 미추적이라 커밋 불필요) |

분리 원칙: `combatState` 선언과 역할/스탯 시스템(`SHIP_ROLE_*`, `getShipStats` 등)은 game.js에 잔류. 전투 함수는 전역이라 호출부 변경 불필요. 정적 검증(`node --check`)은 Cowork에서 전 파일 통과 확인함.

---

## 1. [필수] 전투 분리 실행 검증

정적 검증은 끝났으나 **런타임 검증은 미완**. 반드시 실제 실행으로 확인할 것.

```bash
node --check game.js
node --check js/modules/combat.js
npm run electron:dev
```

게임 실행 후 점검:
1. 새 게임 시작 → 행성 이동 → **전투 1회 이상 트리거**
2. DevTools 콘솔에 `ReferenceError`/`undefined` 없는지 (특히 `combatState`, `startCombat`, `runCombatTurn`, `drawCombatFrame`, `_finishCombat`)
3. 전투 캔버스 렌더·턴 진행·영웅 스킬 버튼·보스전 진입 정상 동작
4. 엔딩(보스 격파) 경로까지 도달 가능한지 (시간 되면)

→ 이상 발견 시: 해당 함수가 game.js 잔류 전역(`getShipStats` 등)을 참조하는데 못 찾는 경우인지 확인. 경계 변수는 `combatState` 외엔 없음.

## 2. [필수] 커밋 + 버전 bump

검증 통과 시에만:

```bash
npm run release:local      # 버전 bump (+1), push 안 함
git add -A
git commit -m "refactor(split): C1 — 전투 엔진 combat.js 분리 + 손상 고아파일 제거 + CLAUDE.md 보강"
```

커밋 대상: `CLAUDE.md`, `game.js`, `js/modules/combat.js`, `index.html`, (삭제 3파일은 미추적이라 영향 없음)

## 3. [선택] 긴 파일 분리 후속 (C2~C4)

C1과 동일 패턴(전역 함수 이동, `let/const` 경계 변수만 `window` 호환 주의, 단계마다 검증):

- **C2** — 엔딩 시퀀스 → `js/modules/combat-endings.js` (보스 에필로그/엔딩 ~400줄)
- **C3** — 크루/퀘스트 처리 (game.js 구 3021~4450, ~1,400줄) → `js/modules/crew-quests.js`
- **C4** — ECONOMY (game.js 구 2158~2683, ~525줄) → `js/modules/economy.js`

각 단계: 추출 → `node --check` → `npm run electron`으로 해당 기능 흐름 확인 → 커밋.

## 4. [선택] 에셋 일관성 (이미지 — 정상 동작하나 HD 미보유)

컷신 NPC 5종이 HD 폴더(`img/chars/H/`) 없이 기본 `img/chars/`에서 로드됨(동작은 정상, 폴백):
`volcan`, `aori`, `wolf_elder`, `nav_ai`, `chiks_vanguard`
→ HD 버전 제작 시 `img/chars/H/`에 동일 파일명으로 추가하면 자동 활용.

---

## 참고: Cowork 검증으로 확인된 "정상" 항목 (재작업 불필요)

- **컷신 캐릭터 이미지**: 참조 27종 전부 실제 파일로 해석 — 깨진 초상 0건
- **퀘스트 이미지**: 핵심 매트릭스 4타입 × F01~F07 = 28개 전부 존재. `combat_FF06.png`만 없으나 `_PIRATE_FF_POOL`에서 의도적 제외(주석 명시) — 버그 아님
- **컷신/퀘스트 텍스트**: 중복 단어·빈 대사·인코딩 깨짐 0건
- **전체 51개 로드 JS**: `node --check` 통과, onclick 핸들러 23개 전부 정의됨

## 참고: 문서 이슈 (코드 무관 — Cowork에서 처리 예정/가능)

- `01_GDD/MASTER_CHECKLIST_AND_ROADMAP.md` 가 개발 착수 전 상태로 낡음(현재 beta.168과 모순)
- `01_GDD/` 에 GDD v1.0 / v5.3 / v6.0 혼재 — 정본 표기 불명
