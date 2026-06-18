# Claude Code 지시서 — 거북선 설계도 획득 난이도 완화 + 안내 팝업

> 작성: Cowork 검증 세션 (2026-06-18). 코드 적용은 Coder(Claude Code) 권한.
> 사용자 요청: ① 거북선 설계도 1~3 획득 쉽게(퀘스트 등장확률 증가) ② 다른 설계도 등장 행성 **반드시 언급 팝업** ③ 백구/인물 안내.
> ⭐ 한/영 정합성 필수: 신규 멘트·팝업은 i18n ko/en 양판 동일 키, `node scripts/i18n-parity.js` 0 확인. 멘트는 인물 1인칭 몰입형.

## 현황 (확인됨)
- `js/data/crafting.js` `BLUEPRINT_MAP` — 행성별 설계도, 퀘스트 **5% 드롭**. 거북선(LGD01) 드롭 행성 = P13·P22.
- 거북선 설계도 단편 1/3·2/3·3/3 = `phase1_quests.js` Q02-M·Q03-M·Q05-M(스토리). phase2 아카이브 "조각 5% 드롭"도 존재.

## 지시 1) 확률 상향 — 퀘스트 거북선(LGD01_SP) 경로만 ✅ 확정
- ✅ **확정(Director): 거북선 설계도 단편 퀘스트 확률 = 5% → 20%.**
- 상향 대상 = LGD01_SP 획득 경로의 거북선 설계도 단편(1·2·3) 퀘스트(phase1 Q02-M·Q03-M·Q05-M, phase2 아카이브 드롭)뿐. **단편 드롭만 별도 상수로 분리해 20%.**
- ⛔ 유지(변경 금지): 일반 신화 거북선(LGD01) + 일반 `BLUEPRINT_MAP` 전체 5%(전 행성 전설/신화 설계도). 손대지 말 것.

## 지시 2) "다른 설계도 행성" 안내 팝업 (백구/인물)
- 거북선 설계도 단편을 **하나 획득할 때마다**, 아직 못 얻은 나머지 단편의 **등장 행성을 명시**하는 안내 팝업 1회.
- 화자 = 백구 또는 장영실·이순신·마르코(포트레이트 포함). 시스템어 금지, 1인칭 몰입형.
- 예) 백구: "다음 거북선 설계도 조각은 **{planet}** 에 있어요. 항로를 잡죠!" — `{planet}`=i18n `planet.<ID>.nm`(하드코딩·코드네임 금지).
- i18n 키: `blueprint.nextHint` ko/en. 미획득 단편 행성은 BLUEPRINT_MAP/획득 플래그(`G.blueprints`·rewardFlags)로 판별.

## 지시 3) 흐름
단편 1 획득(이벤트/컷신) → 안내 팝업(다음 행성) → 이동 → 단편 2 → 3 완성 → 슈멜츠 포지 제작 → LGD01_SP 완성 컷신. 끊김 없이 연결(연계: 퀘스트_컷신_자동등장).

## 검증 (적용 후)
```bash
node --check js/data/crafting.js js/modules/quest-gen.js game.js
node scripts/i18n-parity.js
grep -nE "BLUEPRINT_MAP|blueprint.nextHint|G.blueprints" js/data/crafting.js js/modules/quest-gen.js game.js
```
- 인게임: 단편 획득 시 안내 팝업 반드시 표시·행성명 정확 / 확률 20%로 수집 수월 확인.

> 연계: 거북선 전투 스펙·이미지 = CLAUDE_CODE_지시_거북선_보스컷신_메타.md · 퀘스트 컷신 자동등장 = CLAUDE_CODE_지시_퀘스트_컷신_자동등장.md
