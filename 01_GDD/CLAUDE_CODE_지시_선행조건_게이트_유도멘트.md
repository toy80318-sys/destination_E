# Claude Code 지시서 — 퀘스트·컷신 선행조건 게이트 + 유도 멘트

> 작성: Cowork 검증 세션 (2026-06-18). 코드 적용은 Coder(Claude Code).
> 사용자 요청: 퀘스트/컷신에 필요한 **인물·아이템이 없으면 컷신을 진행하지 말고**, "먼저 {행성}에서 {인물/아이템}을 찾아야 해…" 식 **유도 멘트**로 순서를 잡아주고, 그 퀘스트/컷신은 **잠금**.
> ⭐ 공통 규칙(마스터 A): i18n ko/en 양판 · 인물 1인칭 몰입형 · 행성명 planet.<ID>.nm 토큰 · 하드코딩 금지.

## 현황 (활용 가능한 기존 인프라)
- 퀘스트 템플릿: `locked` / `lockReason`(ko/en) 지원(story-quest-engine L98~132).
- 씬 잠금 체크: `isSceneStoryUnlocked(sid)`(L357), 페이즈 게이트 `_isPhaseUnlocked`.
- 선행 조건 함수: `HERO_PLANET_MAP[*].cond`(영웅↔행성·보유 조건), `cutscene_pre/post`.
- 보유 판정 소스: `G.heroes`(영웅), `G.inventory`(아이템), `G.blueprints`/rewardFlags(설계도).

## 1) 선언적 선행조건 필드 추가
각 게이트 대상 퀘스트/컷신 템플릿에 `requires` 추가:
```js
requires:{
  heroes:['H08'],            // 필요한 영웅(영입 완료)
  items:['G18'],             // 필요한 아이템(인벤토리 보유)
  blueprints:['LGD01'],      // 필요한 설계도/단편
  quests:['Q05-M']           // 선행 퀘스트 완료
}
```
- 순서가 중요한 경우 배열 순서를 **유도 우선순위**로 사용.

## 2) 선행조건 위치 맵 (어디서 구하는지)
- 영웅 → `HERO_PLANET_MAP[heroId].planet` (이미 존재). 
- 설계도/단편 → `BLUEPRINT_MAP` 역참조(해당 단편이 나오는 행성).
- 아이템 → 아이템별 산출 행성 맵(신규 작은 상수, 없으면 "관련 퀘스트 행성").
- 모든 위치 표시는 **planet.<ID>.nm** 토큰(코드네임/구지명 금지).

## 3) 게이트 판정 & 동작
- 리졸버 `checkPrereqs(tmpl)` → `{ok:false, missing:[{type:'hero',id:'H08',planet:'P19'}, ...]}`(보유 안 된 것만, 우선순위 순).
- **미충족 시:**
  - 해당 퀘스트 `locked=true`, `lockReason`= 자동 생성 유도 멘트.
  - 해당 컷신 재생 차단: `isSceneStoryUnlocked`(또는 `forceReplayScene`/`cutscene_pre` 호출 전)에서 `checkPrereqs` 실패면 **컷신을 재생하지 않고** 유도 팝업 표시.
- **충족 시:** 자동 잠금 해제 → 정상 진행.

## 4) 유도 멘트 (백구/인물 · 몰입형 · 순서 유도)
- **첫 번째 미충족 선행조건**을 기준으로 안내(여러 개면 순서대로 하나씩).
- 형식: `"먼저 {planet}에서 {prereqName}을(를) 찾아야 해…"` — 백구 또는 관련 인물 화자, 포트레이트 포함.
- 다단계 예시(장영실 컷신, 거북선 설계도+마르코 선행):
  - (설계도 미보유) 백구: "거북선 설계도부터예요. **{planet:슈멜츠}** 의 포지에서 찾아야 해요…"
  - (설계도 OK·마르코 미영입) 백구: "다음은 사람이에요. **{planet}** 에서 **마르코 폴로**를 먼저 만나야 합니다…"
  - (모두 충족) → 장영실 컷신/퀘스트 잠금 해제.
- i18n 키: `gate.needHero`/`gate.needItem`/`gate.needBlueprint`/`gate.needQuest` (ko/en), `{planet}`·`{name}` 토큰 치환.

## 5) 표시(UI)
- 잠긴 퀘스트는 목록에 **자물쇠 + lockReason 1줄**로 노출(숨기지 말고 '다음 목표'로 안내) — 유도 효과.
- 잠긴 컷신을 트리거하는 행성 진입/퀘스트 수락 시도 시: 유도 팝업 1회(중복 스팸 방지 가드 `G._gateHintShown[key]`).

## 검증 (적용 후)
```bash
node --check js/story-quest-engine.js js/modules/quest-gen.js js/modules/combat.js game.js
node scripts/i18n-parity.js
grep -nE "requires|checkPrereqs|gate.need|isSceneStoryUnlocked" js/story-quest-engine.js js/modules/quest-gen.js
```
- 인게임: 선행 인물/아이템 없을 때 컷신이 **재생되지 않고** 유도 멘트가 뜨는지 / 조건 충족 시 자동 해제·정상 진행 / 다단계 순서가 맞게 안내되는지 확인 → Director 보고.

> 연계: 수락→컷신 자동등장 = CLAUDE_CODE_지시_퀘스트_컷신_자동등장.md · 다음행성 인물멘트 = 동 문서 지시2 · 스토리 연결 = CLAUDE_CODE_지시_스토리연결성_강화.md
