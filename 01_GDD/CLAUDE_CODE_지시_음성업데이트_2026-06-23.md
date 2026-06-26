# Claude Code 지시서 — 음성 파일 업데이트 적용 (2026-06-23)

> 작성: Cowork 음성 세션. **코드 적용은 Coder(Claude Code) 권한.**
> 이번 세션에서 추가·교체된 음성 클립과 매니페스트(SSOT) 변경을 게임에 반영한다.
> 상세 산출물 기록: `01_GDD/voice/생성기록_2026-06-23.md` · 연동 원리: `01_GDD/CLAUDE_CODE_지시_음성연동.md`(§0-A 최소적용, §0-B 보스후/엔딩).

## 0-Z. 보스 2페이즈 각성 멘트 (2026-06-25 추가)
- 문제: 우르사 메이저/블랙팔콘 **2페이즈 전환**(호위 전멸 후 본체 각성)에 로그 배너(`combat.ursaPhase2`·`combat.blackfalconPhase2`)만 있고 **보스 음성 대사가 없었음**.
- 신규 음성(KO+EN, 기존 보스 보이스): `650` 우르사("호위는 끝났다. 이제… 내가 직접 상대해주마.") · `651` 블랙팔콘("호위 따위… 시험에 불과했다. 이제 진짜 어둠을 보여주지."). 배포·매니페스트·재빌드 완료(VOICE_MANIFEST 606 / VOICE_BYTEXT 588).
- **Coder:** combat.js 의 2페이즈 전환 처리(`combat.ursaPhase2`/`blackfalconPhase2` 배너 출력 지점)에서, 배너와 함께 보스 대사 1줄 표시 + `VoicePlayer.playVoice('650')`(우르사) / `'651'`(블랙팔콘) 호출. 자막은 신규 음성 텍스트와 동일하게(또는 i18n `combat.ursaPhase2.line`/`blackfalconPhase2.line` 신설). 페이즈당 1회.
- 추가 전투 대사 음성(블랙팔콘, 기존 대본 그대로 — 자막 텍스트 자동매칭으로 재생):
  - `652` `combat.blackfalconRetreat`·`blackfalconRetreatLog`(동일 텍스트) — "💬 [블랙팔콘] 통신 신호 수신… 보이드 함대가 어둠 속으로 사라진다…"
  - `653` `combat.dimRayCharging` — "🌑 [블랙팔콘] 차원 절단광선 충전… 함대 비기함 함선이 위험합니다!"
  - 이 둘은 자막(배너)이 화면에 그대로 뜨므로 voice-player 자동매칭으로 재생됨(별도 vid 불요). EN 자동재생만 vid 또는 EN브리지 확장 필요.
- ※ 우르사 방어막 무력화·친위대 전멸 순간은 **phase6 컷신 대사로 이미 음성화**돼 있음(CH13-C/CH13-E). 전투 중 순수 배너(이모지+수치, 캐릭터 대사 아님)는 음성 대상 아님.

## 0. 최신 추가분 (2차 갱신 — 가장 위)
- **엔딩 영웅 회상 `610~621`(KO+EN):** heroBlocks 영웅 한마디 7(이순신/장영실/광개토/가가린/넬슨/테슬라/마르코) + 백구 일기 5. 각 영웅·백구 기존 보이스. (이름변수 포함분 h06.text·h02/h03/h08.diary는 자막만)
- **전투후 멘트 `combat.defeatGeneric1~3`·`merchant.thanks1~3`(KO+EN):** 해적 격파 후 적 멘트(랜덤1) + 상인 구출 감사(25%). 자막 i18n 문구와 **정확히 일치**하도록 신규 생성. 적=`pyPk875kUhi61JhqMlUF`/EN`SOYHLrjzK2X1ezoPC6cr`, 상인=`ZZ4xhVcc83kZBfNIlIIz`/EN`cjVigY5qzO86Huf0OWal`.
- **전수 감사(최종):** 매니페스트 **594행 / KO 누락 0 / EN 누락 0.** 500~523 KO·EN 완비, 524~529(오생성) 삭제 확인.
- ⚠ **EN 자동재생 주의(Coder):** 위 팝업/엔딩 멘트(`combat.defeatGeneric*`·`merchant.thanks*`·`ending.h0X.text/diary`)와 보이드/엔딩 sp/tx 컷신은 EN 빌드에서 자막이 영어라 KO 텍스트 매칭이 안 됨. → ① `vid` 명시재생 주입(가장 확실) 또는 ② `scripts/gen-voice-bytext-en.js` 를 phase 컷신뿐 아니라 **이 i18n 키들의 EN 문구→엔트리**도 인덱싱하도록 확장. KO 빌드는 자막 텍스트 자동매칭으로 이미 재생됨.

## 1. 이번에 바뀐 것(요약 — 사실)
- **SSOT 갱신:** `01_GDD/voice/voice_manifest.csv` — 신규/교체 행 반영 완료(아래).
- **클립 배포 완료:** 전부 `02_Assets/audio/voice/` (KO) · `02_Assets/audio/voice_en/` (EN)에 복사됨.
- 신규/교체 내역:
  - `veil_001`(KO·EN) 묵직 저음으로 교체.
  - `etc_482`(EN) 한국어 잔재 → 영어로 재생성(언어 섞임 수정).
  - 엔딩 고정대사 `492~499`(navai/commander/baekgu/yisunsin, KO+EN).
  - 컷신 누락분 `500~523`(KO) + `500~523` EN(완비). ※ 524~529는 오생성분이라 삭제됨.
  - 블랙팔콘 보스 컷신 `530~548`(KO+EN). 블랙팔콘 신규 보이스 `aMPcWoZ4aG9JgmmSJZZX` 계정 저장됨.
  - 보스 아웃트로 `601~609`(KO+EN, 607~609 여성 사령관 clip_f 포함).
  - 백구 전설/신화 멘트 6종(crew_legendary_1/2, get_legendPart/mythicPart/legendShip/mythicShip, KO+EN).
  - **장영실 KO 전체 재녹음**(`jangyeongsil_001~027` + `514`) — 라이브러리 보이스 "JY" `bQlkYuipD5BHEhntA5iz`, 한국식 단위(세 개 등). ⚠ 장영실 보이스는 추가 교체 검토 중일 수 있음 — 사람 확인 후 확정.
- 감사 결과(2026-06-23): 매니페스트 576행 전부 KO·EN 클립 존재, 누락 0, 언어 섞임 0.

## 2. Coder 작업 (순서대로, 단위별 `node --check`)
1. **매니페스트 재빌드:** 갱신된 `voice_manifest.csv` → `js/data/voice-manifest.js` 재생성(리치 포맷 `VOICE_MANIFEST`/`VOICE_BYTEXT`, num 키 + `clip/clip_f/clip_en/clip_en_f/lang`). 이어서 `node scripts/gen-voice-bytext-en.js` 로 EN 브리지 갱신.
2. **캐시버스터:** `index.html`·`index-holo.html` 의 `voice-manifest.js`·`voice-player.js` `?v=` 버전 상향(예: `?v=20260623001`).
3. **sp/tx 컷신 vid 배선**(EN 자동재생·정확도 위해 — `STORY_SCENES_PC.showCharDialog` 는 `playLine({vid})` 지원):
   - `js/modules/quest-gen.js` `showVoidBossIntro/Outro` 각 scene 라인에 `vid` 주입. 매핑: 생성기록 §E 표(voidGovernorReact=530 … afterUrsa=548).
   - 엔딩 `js/modules/ending-credits.js` `showLine()` 고정대사에 `playLine({vid})`: sys1=492, sys2=493, liberationDone=494, cmdTogether=495, bg100Final=496, diary6Chain=497, diaryLand412=498.
   - 우르사 보스 아웃트로(601~609 렌더 지점)에도 vid 주입(601~609). 604/606은 이름 포함이라 자막 우선이나, 클립은 기본호칭으로 생성돼 있음.
4. **엔딩/일기 오작동 자동매칭 차단:** 엔딩·일기 오버레이 표시 중 전역 `MutationObserver` 자동매칭이 이름표/일기 본문을 잡지 않게 가드(`VoicePlayer.suppress()` 유지 또는 셀렉터 한정). 백구 일기 반복·이름표("광개토대왕") 오재생 제거.
5. **빌드 포함:** `package.json` `build.files` 에 `02_Assets/audio/voice/**`·`02_Assets/audio/voice_en/**` 포함 확인.
6. **검증(Tester→Director):** `npm run electron` → 화면 1회 클릭(자동재생 잠금 해제) → 통행료·컷신·보스(우르사/블랙팔콘)·엔딩을 KO/EN 각각 진행하며 음성 재생·언어 일치·중복/오재생 없음 확인. 실패는 "입력+기대+실제"로 보고.

## 3. 제약
- 대사 텍스트·밸런스·레벨 디자인 임의 변경 금지. 코드 수정은 Coder만. 불확실하면 Director.
- 음성 키(el_key.txt)·생성 산출물(dist/)·비밀키 커밋 금지.
