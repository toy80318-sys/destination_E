# Claude Code 지시서 — 음성(보이스) 게임 연동 (2026-06-20)

> 작성: Cowork 음성 제작 세션. **코드 적용은 Coder(Claude Code) 권한.**
> 목적: 제작 완료된 491개 음성 클립을 게임 컷신·팝업·퀘스트 대사에 연결(자동 재생) + 설정 토글.
> ⭐ 한/영 정합성, 하드코딩 금지, 단위별 구현, 변경 .js마다 `node --check` 원칙 준수.

## 0. 산출물 (이미 제작 완료)
- 클립: `01_GDD/voice/clips/<slug>/<slug>_NNN.mp3` — **총 491개 / 25 화자**.
- 매핑: `01_GDD/voice/voice_manifest.csv` (num, char, slug, clip, lang, text) — **대사번호 ↔ 클립 ↔ 원문**의 단일 진실원본(SSOT).
- JS 매니페스트: `01_GDD/voice/voice_manifest.js` (`VOICE_MANIFEST[num] = {slug, clip, lang}`).
- 화자별 검증표: `01_GDD/voice/voice_map_<slug>.csv` (대본↔인식 대조).

화자/클립 수: commander 43, baekgu 166, yisunsin 64, marcopolo 47, gagarin 35, jangyeongsil 27, gwanggaeto 16, einstein 18, tesla 15, maximoff 11, nelson 8, ursamajor 8, navai 5, eisenklau 5, leehwiso 5, aori 2, wolfelder 2, chiks/volcan/borg/karim/krash/veil/dorga/rebel 각 1, etc(영문) 6.

## 0-A. ⚠ 지금 음성이 "안 나온 진짜 이유" & 조치 — 2026-06-22

연동(배선)은 **이미 거의 다 돼 있었다.** 점검 결과:
- ✅ 클립 배치됨: `02_Assets/audio/voice/` **558개**, `02_Assets/audio/voice_en/` **563개**.
- ✅ 매니페스트 적재됨: `js/data/voice-manifest.js` 존재 + `VOICE_MANIFEST`·`VOICE_BYTEXT` 정의됨.
- ✅ 스크립트 포함됨: `index.html`·`index-holo.html` 둘 다 `voice-manifest.js` → `voice-player.js` 로드.
- ✅ 호출부 존재: `portrait-baekgu.js`, `shakedown-popup.js` 가 `VoicePlayer` 호출.

**진짜 원인:** `js/modules/voice-player.js` 파일이 **67행에서 잘려(truncated) 있었다.** IIFE 가 닫히지 않아 `SyntaxError: Unexpected end of input` → **스크립트 전체가 실행되지 않고 `window.VoicePlayer` 자체가 정의되지 않음** → 모든 호출(`VoicePlayer.playVoice`, 자동매칭 등)이 무효 → 음성이 하나도 안 났다.

**조치(Cowork 세션에서 이미 완료):**
1. `voice-player.js` 를 **142줄 정상본으로 복구**(잘린 부분 복원: `playPath`/`playVoice`/`playByText`/`playLine`/`observe`/`window.VoicePlayer` export). 기존 추가 기능(AudioMgr 연동, `femOverride`, `_EXCLUDE_RE` 마르코 028 제외)은 보존.
2. **자동재생 잠금해제(`_unlock`) 추가** — 브라우저/Electron autoplay policy 대응(첫 입력 시 무음 워밍업).
3. **`node --check js/modules/voice-player.js` 통과 확인됨(실제 PC, 2026-06-22).**

> ⚠ 검증 함정: 워크스페이스 마운트가 stale 캐시를 보여줘 `node --check` 가 67행 절단 에러를 낼 수 있음. **실제 파일은 142줄 정상**(Read 도구/실 PC 기준). Coder 는 실제 작업 경로에서 재검증할 것.

**Coder 가 할 일(이번 건):**
1. 복구된 `js/modules/voice-player.js` 를 그대로 채택하고 `node --check` 재확인. (이미 정상이면 변경 없음)
2. `index.html`·`index-holo.html` 의 `?v=` 캐시버스터 버전을 올려(예: `?v=20260622001`) 구버전 캐시 무효화.
3. **인게임 검증:** 새 게임 → 화면 1회 클릭(잠금 해제) → 콘솔 `VoicePlayer.playVoice('001')` 로 소리 확인 → 컷신/통행료 진행하며 자동재생 확인 → Director 보고.
4. (선택) 자동매칭이 타이핑효과/중복 노드로 과다·누락되면 §5 처럼 컷신 라인 전환부에 `VoicePlayer.playLine({vid,text,female})` 명시 호출로 보강.

## 1. 에셋 배치 (참고 — 이미 적용됨, 신규 추가 시에만)
1. `01_GDD/voice/clips/` 전체를 `02_Assets/audio/voice/` 로 복사(폴더 구조 유지). 단 `_sample_*` 폴더는 제외.
   - 단, etc(486~491)·rebel(482)·navai(483~485)는 매니페스트의 `clip` 경로를 그대로 따름.
2. **영문판:** `01_GDD/voice/clips_en/` 전체를 `02_Assets/audio/voice_en/` 로 복사(매니페스트 `clip_en` 경로).
3. `package.json` `build.files` 에 `02_Assets/audio/voice/**` 와 `02_Assets/audio/voice_en/**` 포함 확인(미포함 시 추가).
3. 용량 점검: mp3 491개. 빌드 사이즈 영향 확인 후 Director 보고.

## 2. 매니페스트 적재
- `01_GDD/voice/voice_manifest.js` 를 `js/data/voice-manifest.js` 로 이동/복사하고 게임에서 정적 import.
- 키 = 대사 `num`(문자열). 값 = `{slug, clip, lang}`. **대사 식별은 num 기준**.

## 3. 대사 객체에 voice id(vid) 연결
- `voice_manifest.csv` 의 `text` 는 각 컷신/팝업/퀘스트 대사 원문에서 추출된 것. 각 대사 객체에 `vid:"<num>"` 필드를 부여.
- 연결 대상(원천 데이터):
  - 컷신 대사: `js/data/phase1_quests.js`·`phase2_quests.js`·`phase3_quests.js` 의 컷신 `{char,name,text}` 배열.
  - 팝업/통행료/전투 등장·종료 멘트: `js/modules/shakedown-popup.js`, `combat.js`, `report-popup.js` 관련 대사.
  - NPC 단발 대사(치크스/불칸/보그/카림/크라쉬/베일/도르가/반란군/항법AI 보고).
- 매칭 방법: `voice_manifest.csv` 의 `text` 와 원문 대사를 정규화(공백·문장부호 제거) 비교해 `num` 매핑 → 해당 대사 객체에 `vid` 주입. **임의로 대사 텍스트를 바꾸지 말 것**(불일치 시 Director 보고).

## 4. 재생 모듈 (`js/modules/voice-player.js` 신규, 정적 로드)
- `playVoice(vid)`: `VOICE_MANIFEST[vid]` 조회 → 현재 언어/빌드에 맞는 클립 재생. 직전 음성 정지 후 재생(중첩 금지).
- 대사 표시 시점에 자동 호출: 컷신 라인 전환·팝업 표시 시 해당 `vid` 재생, 라인/팝업 닫힘 시 정지.
- HTMLAudioElement 풀링(동시 1개). 파일 없을 때 무음 폴백(에러로 게임 죽지 않게).
- 경로 베이스는 상수로 분리(`VOICE_BASE = '02_Assets/audio/voice/'`), 하드코딩 금지.

## 4-B. 추가 반영 (2026-06-20 갱신)
- **게이트 안내 멘트(변수 제거):** `gate.needHero/needItem/needBlueprint/needQuest` 는 `{planet}`·`{name}` 변수를 **뺀 일반 문장으로 텍스트 교체** + 백구 음성 클립 연결(매니페스트 num=`gate.*`). 예) needHero → "사령관, 순서가 있어요. 먼저 만나야 할 사람이 있습니다. 그 사람 없이는 다음으로 못 가요." i18n ko/en 동시 수정.
- **아우레우스 여성 보스(신규):** combat_F02(여성 사령관) 등장/전투/패배 대사 3종 신설 + 전용 음성(매니페스트 num=`aureus.001~003`). 게임에 보스 대사 객체로 추가하고 vid 연결. ⚠ 스토리상 'CEO 발테르'(남성 이름)와 이미지(여성) 불일치 → 이름/성별 정합은 Director 확인.
- **장영실:** 음성 = Yuna(20대 여성·명랑)로 재제작 완료(clips/jangyeongsil 전체 교체). 캐릭터가 여성임에 유의(대사/표기 정합).
- **테슬라:** 음성 = Joon-ho(감정형)로 재제작 완료(clips/tesla 전체 교체).
- **사령관 성별 분기:** 남성 주인공 = Hunmin(`clips/commander/`, 매니페스트 `clip`), 여성 주인공 = Yuna(`clips/commander_f/`, 매니페스트 `clip_f`). 주인공 성별 선택값에 따라 `clip`/`clip_f` 중 선택 재생(줄 순서 동일).
- **영문판 캐스팅(`01_GDD/voice/casting_en.json`):** 이순신=George, 아인슈타인=Brian으로 확정(이순신 Brian·아인슈타인 George에서 변경). 486~491 영문은 광개토=Bryan/가가린=Charlie/넬슨=Daniel/사령관=Liam/아우레우스 보스=Sarah.

## 4-C. 전투 후 적/해적 멘트 (신규 음성)
- 전투 종료 시 **적/해적 멘트**를 음성 재생: 패배 시 후회 멘트(`combat.enemyRegret1~3`), 적 퇴각 시 도망 멘트(`combat.enemyFlee1~3`) 중 랜덤 1개.
- 클립: KO `02_Assets/audio/voice/combat/`, EN `voice_en/combat/`. 매니페스트 `combat.*` 항목 참조.
- `report-popup.js` 전투 결과 표시 시 결과(승/패·적퇴각)에 따라 해당 배열에서 랜덤 vid 재생. i18n 자막은 기존 `전투팝업_몰입강화` 멘트 배열과 동일 텍스트 사용.

## 4-D. 통행료 NPC 음성 ↔ 포트레이트 성별 일치 (수정 필요)
- `shakedown-popup.js`는 통행료 NPC(보그/카림/크라쉬/베일/도르가, vid 477~481)를 **랜덤 선택**하되 포트레이트는 **세력 이미지**(`combat_<faction>.png`)를 사용. 아우레우스(F02)는 **여성 이미지(combat_F02)** 라 남성 음성과 불일치.
- **해결:** 표시 포트레이트가 여성일 때(예: 세력 F02 또는 여성 combat 이미지) **`clip_f`/`clip_en_f`(여성 음성, 이미 생성)** 재생, 그 외 `clip`. 매니페스트 477~481에 여성 변형 포함됨.
- 권장: 통행료 음성 선택을 **포트레이트(이미지)의 성별 기준**으로 결정(이름 무관). 또는 세력별로 NPC 풀을 성별 일치시키도록 데이터 정리.

## 4-E. 전설급 크루 영입 멘트 (백구)
- **전설급(legendary) 크루 영입** 이벤트에 백구 음성 재생:
  - 등장/발견 시 → `crew.legendaryRecruit1` ("전설급 크루예요! …꼭 영입하세요!")
  - 영입 완료 시 → `crew.legendaryRecruit2` ("전설의 크루가 합류했어요! …")
- 크루 가챠/주점·이벤트에서 **rarity==legendary(전설/신화)** 분기 시 해당 vid 재생. 특별 보상 폭죽(`_fireFireworks()`)과 함께 쓰면 효과적.
- 클립: KO `voice/baekgu/crew_legendary_1·2.mp3`, EN `voice_en/baekgu/...`. 매니페스트 `crew.legendaryRecruit1·2`. i18n 자막은 동일 텍스트로 추가.

## 4-F. 전설/신화 파츠·함선 획득 멘트 (백구)
- 보상 획득 시 등급별 백구 음성 재생(특별 보상 폭죽 `_fireFireworks()` 병행 권장):
  - 전설 파츠 → `item.legendaryPart` / 신화 파츠 → `item.mythicPart`
  - 전설 함선 → `ship.legendary` / 신화 함선 → `ship.mythic`
- `report-popup.js`(획득 보상) 또는 제작/가챠/경매 보상 처리에서 **획득 아이템 rarity + type(part/ship)** 분기로 vid 선택.
- 클립: KO `voice/baekgu/get_*.mp3`, EN `voice_en/baekgu/get_*.mp3`. 매니페스트 키 위와 동일. i18n 자막 동일 텍스트 추가.

## 5. 설정(옵션) 연동
- 환경설정에 **보이스 ON/OFF + 볼륨 슬라이더** 추가. `localStorage`(웹) / Electron userData(설정 동기화)에 저장.
- 기존 사운드(효과음/BGM) 설정 패턴을 따름. i18n ko/en 라벨 동일 키.

## 6. 한/영(KO/EN) 빌드 처리 — 영문 음성 전체 제작 완료(2026-06-20)
- **영문판 음성 485줄 전체 생성 완료.** 경로 `02_Assets/audio/voice_en/<slug>/<slug>_NNN.mp3`, 매니페스트 **`clip_en`** 컬럼.
- 캐스팅: `01_GDD/voice/casting_en.json` (영어 네이티브 성우). 우르사 메이저=전용 묵직 보스 음성, 이순신=George, 아인슈타인=Brian, 가가린=Charlie, 광개토=Bryan, 넬슨=Daniel, 사령관=Liam.
- 재생 로직: 게임 언어=EN → `clip_en`, KO → `clip`(여성 주인공이면 `clip_f`). `lang` 필드는 etc 486~491이 원래 영어임을 표시(KO 빌드에서도 영어 재생 또는 자막).
- etc 482~485(반란군·항법보고)도 영어판 생성됨(`voice_en/etc/`). 486~491 영어 클립은 `02_Assets/audio/voice/etc/`(KO·EN 공용).
- ⚠ 미생성(영문): 게이트 안내(gate.*)·아우레우스 보스(aureus.*)는 KO만 있음 — 영문판 필요 시 추가 생성(아우레우스 보스 영문명 = **Valeria**).

## 7. 네이밍·정합성 주의 (반영 필요)
- **불칸(476, volcan):** 통행료 적 이름 '볼칸→불칸' 확정. i18n ko/en 표기 변경. 반란군 리더(482)는 '볼칸' 유지.
- **마르코 폴로 301:** 대사 "볼칸이 내부 노선을…"→"불칸이…" 로 텍스트 수정됨. **기존 마르코 음성은 '볼칸' 발음 → 해당 줄 재녹음 대상**(현재 클립은 구버전). i18n 텍스트만 먼저 수정, 음성은 추후 교체.
- **아우레우스 여성 보스(combat_F02.png = 여성 사령관):** 영문판 공식 표기가 **'Valeria'(여성)** 임을 확인 → 보스는 **여성 Valeria**가 정답. 한글 'CEO 발테르'(남성)는 **'발레리아'로 정정 권장.** KO 보스 음성(전용 여성)·대사 3종 제작 완료(`aureus.001~003`). 게임에 보스 대사로 추가하고 vid 연결.
- **녹음≠대본/변수 잔존 대사:** `01_GDD/voice/음성대본_수정필요_정리.md` 참고(이휘소·장영실 일부, 백구 동적 변수 멘트 등은 음성 제외 또는 대본 보강 후 교체).

## 8. 검증
```bash
node --check js/modules/voice-player.js js/data/voice-manifest.js game.js
node scripts/i18n-parity.js
```
- 인게임: 컷신/팝업 표시 시 해당 음성 자동 재생, 라인 전환 시 정지, 설정 ON/OFF·볼륨 동작, EN 빌드 영어줄 재생/ KO 빌드 생략, 파일 누락 시 무음 폴백 → Director 보고.

> 연계: 캐릭터 성격/음색 = `01_GDD/voice/보이스디자인_프롬프트_V3.md`, 수정필요 대사 = `01_GDD/voice/음성대본_수정필요_정리.md`, 미녹음 대사 = `01_GDD/voice/음성생성_프롬프트+대본_미녹음.md`.
