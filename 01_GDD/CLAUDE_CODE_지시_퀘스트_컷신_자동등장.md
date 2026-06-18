# Claude Code 지시서 — 시나리오 퀘스트 수락 → 컷신 자동/강제 등장 + 다음 행성 안내

> 작성: Cowork 검증 세션 (2026-06-18). 코드 적용은 Coder(Claude Code) 권한.
> 사용자 요청: ① 시나리오 퀘스트 수주 시 관련 컷신 자동 등장 ② 다음 퀘스트로 이어지도록 "다음은 OO 행성으로 이동" 안내 팝업 ③ 퀘스트 수락 시 관련 컷신 **강제** 등장 반드시 진행.
>
> ⭐ **한/영 정합성 필수(사용자 지시 2026-06-18):** 신규 멘트·`nextHint`·컷신 대사·팝업 문구 등 **모든 수정 요소는 `i18n/ko.js`·`i18n/en.js` 양판에 동일 키로 반영**. 적용 후 `node scripts/i18n-parity.js` 로 키 일치·누락 0·미번역 0 확인. 인물 멘트도 한/영 둘 다 몰입형으로 작성(영문은 직역이 아니라 영어권 자연 대사).

---

## 현재 구조 (확인됨)

- 수락 핸들러: `js/modules/quest-gen.js` `acceptQuest(pid,idx)` (L432)
  - story_quest 수락 시 **`notify()` 토스트만** 발생 — 컷신 자동 재생 없음.
  - `void_boss` → `showVoidBossIntro(q)` 팝업.
  - **`q._midBoss==='eisenklau'` → 수락 즉시 `startEisenklauMidBoss(q)` 컷신+전투** (L468~, 2026-06-17). ← **이 패턴을 일반 시나리오 퀘스트로 확장할 것.**
- 컷신 API: `window.STORY_SCENES_PC.forceReplayScene(sceneId)` (story-scenes-pc.js L751).
- 퀘스트 템플릿에 **`cutscene_pre` / `cutscene_post`** 필드가 이미 존재 (story-quest-engine.js L129~130, L340~343) — **그러나 acceptQuest에서 발화되지 않음(미연결).**
- 행성 인트로 매핑: `_intros[i][planetId]` → `forceReplayScene` 강제 재생 로직 존재 (story-quest-engine.js L392~401).

---

## 지시 1) 수락 시 컷신 강제 자동 등장

`acceptQuest`의 `q.type==='story_quest'` 분기에서, 토스트 후 **`q.cutscene_pre`(또는 매핑된 sceneId)가 있으면 강제 재생**:

```js
// (story_quest 수락 처리 직후, saveGame 전후)
if(q.type==='story_quest' && q.cutscene_pre && window.STORY_SCENES_PC){
  setTimeout(function(){
    try{ window.STORY_SCENES_PC.forceReplayScene(q.cutscene_pre); }
    catch(e){ console.error('[quest] pre-cutscene failed', e); }
  }, 300);  // eisenklau 패턴과 동일 지연
}
```

- **강제 보장:** `forceReplayScene`는 이미 "이미 본 씬도 다시 재생"(testing-friendly) 동작 → 수락 시 반드시 등장. 단, 1회만 강제하려면 `q._preShown` 플래그로 가드(중복 수락 방지) 후 저장.
- `cutscene_pre`가 비어있는 시나리오 퀘스트는 템플릿에 sceneId를 채워야 함(story-quest-engine 템플릿 데이터). 매핑 누락 퀘스트 목록은 적용 시 `console.warn('[story] … 등록된 인트로 컷씬이 없습니다')` 로 확인.

## 지시 2) 다음 행성 안내 — **세계관 속 인물 멘트**로 행동 권유 ⭐ 사용자 요청(2026-06-18)

시나리오 퀘스트 **완료(claim) 또는 수락 직후**, 다음 목표 행성을 안내하되 — **"다음은 OO 행성으로 이동" 같은 시스템 안내는 금지.** 반드시 **그 상황 속에 있는 인물(백구·이순신·장영실·마르코 등)의 1인칭 멘트**로, **무엇을 위해 / 어떤 문제를 풀기 위해** 그 행성으로 가는지 동기를 담아 권유한다. 유저가 그 장면 안에 있는 듯한 몰입형 대사.

**멘트 공식 (둘 중 상황에 맞게):**
- `"{목표/물건}을(를) 얻기 위해 {행성}으로 향하자."`
- `"{문제/위협}을(를) 해결하려면 {행성}으로 가야 한다."`

**세계관 멘트 예시 (시스템어 → 몰입 멘트):**
| 상황 | ❌ 시스템 안내 | ✅ 인물 멘트(권장) |
|---|---|---|
| 설계도 단편 | "다음은 슈멜츠로 이동" | 장영실: "거북선의 나머지 설계도가 **슈멜츠**의 포지에 잠들어 있소. 그 불길로 가야겠소." |
| 영웅 영입 | "우르사 알파로 이동" | 백구: "이순신 장군의 신호가 **우르사 알파**에서 잡혔어요. 그를 깨우러 가요!" |
| 자원/해결 | "아이젠콕으로 이동" | 마르코: "이 봉쇄를 뚫을 열쇠는 **아이젠콕**에 있어. 거기서 답을 찾자." |
| 위협 대응 | "타이탄H로 이동" | 이순신: "적 함대가 **타이탄H**에 집결 중이다. 선수를 쳐야 한다 — 항로를 잡아라." |

**구현:**
- 데이터: 퀘스트 템플릿에 `nextPlanet`(행성 ID) + `nextHintBy`(화자: 'baekgu'|'H01'|'H02'|'H08'…) + 멘트 i18n 키. 시나리오 순서표에서 다음 step planetId 조회로도 가능.
- 표시: `openModal` 1버튼, **화자 포트레이트 포함**(`_baekguSrcByMood` 또는 인물 `img/chars/heroNN.png`). 컷신톤 연출 권장.
- i18n: 멘트는 퀘스트별로 다르므로 **퀘스트 템플릿에 `nextHint:{ko,en}` 멘트를 직접 부여**(범용 `quest.nextGuide` 한 줄로 통일하지 말 것 — 몰입 저하). 공통 폴백만 1개 둠.
- **행성명은 반드시 i18n `planet.<ID>.nm` 토큰**으로 멘트 안에 삽입(하드코딩·코드네임·구지명 금지).
- 발화 위치: 완료 시 `cutscene_post` → onDone 콜백에서 멘트 팝업. (post 컷신 없으면 즉시.)

> **전역 원칙(사용자 지시):** 길 안내·행동 권유를 포함한 **모든 시스템적 멘트는 세계관 속 인물의 대사로** 바꾼다. "다음 단계", "행성 N으로", "퀘스트 수락됨" 같은 메타·시스템 표현 대신, 그 상황의 인물이 말하듯 1인칭·몰입형으로. (수락 토스트 `notify.questAccept*` 류도 가능한 범위에서 인물 톤으로 점진 교체 검토.)

## 지시 3) 흐름 일관성

수락 → (pre 컷신 강제) → 진행 → 완료 → (post 컷신) → 다음 행성 안내 팝업 → 다음 시나리오. 끊김 없이 이어지는지 신규게임~페이즈 진행으로 1회 플레이 확인.

---

## 검증 (적용 후)

```bash
node --check js/modules/quest-gen.js js/story-quest-engine.js
# cutscene_pre 발화 연결 확인
grep -nE "cutscene_pre|forceReplayScene|nextPlanet|quest.nextGuide" js/modules/quest-gen.js js/story-quest-engine.js
```
- 인게임: 시나리오 퀘스트 수락 → 컷신 강제 등장 확인 / 완료 → 다음 행성 안내 팝업 확인 / 중복 수락 시 과다 재생 없는지 확인.
- i18n: `quest.nextGuide` ko/en 패리티 확인(`node scripts/i18n-parity.js`).

> 연계: 보스 팝업→컷신·거북선·메타 = CLAUDE_CODE_지시_거북선_보스컷신_메타.md
