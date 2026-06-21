# Claude Code 지시서 — 사이버펑크 글래스 UI 테마 전면 적용

> 작성: Cowork 디자인 세션. 코드 적용은 Coder(Claude Code) 권한.
> 디자인 소스: `game-holo-theme.css` (재사용 클래스 포함) · 시안: `01_GDD/ui/ui_clone_holo.html`, `ui_buttons_holo.html`
> 별도 실행본: `index-holo.html` (game.css → game-holo-theme.css 순 로드).

## 현황 (왜 일부만 적용됐나)
- ✅ 적용됨: `.btn` 계열, `.modal`(codex·auction 등 openModal 기반), `.ic`·`.ship-c`·`.gc-card`·`.crew-c`, `#hud`·`.hub-side`·`#bkdialog`·`.bar-fi`.
- ❌ 미적용: **통행료(`shakedown-popup.js`)·전투(`combat.js`)·보상(`report-popup.js`) 팝업** — 컨테이너를 **인라인 style로 직접 생성**(클래스 없음) → CSS 테마가 닿지 못함.
  - 근거: shakedown-popup.js `style=10/class=0`, report-popup.js `18/0`, combat.js `81/2`.

## 목표
인라인 스타일로 그려지는 팝업/카드 컨테이너에 **재사용 홀로 클래스를 부착**(또는 인라인 배경/테두리 제거)해 테마가 적용되게 한다. 레이아웃·로직은 유지, 룩앤필만 교체.

## 재사용 클래스 (game-holo-theme.css에 정의됨)
- `.holo-overlay` — 전체 화면 딤드 오버레이(팝업 배경)
- `.holo-panel` (+ `.c-red/.c-gold/.c-green/.c-purple`) — 노치 글래스 패널(끊김 없는 네온 라인)
- `.holo-card` — 글래스 카드(작은 컷)
- `.holo-chip` — 글래스 칩
- `.holo-portrait` — 인물 포트레이트 프레임(컷+글로우)

## 작업 단위
1. **shakedown-popup.js** — 통행료 팝업
   - 바깥 오버레이 div → `class="holo-overlay"` (인라인 background/inset 제거).
   - 본문 카드 div → `class="holo-panel c-red"` (적 도발이므로 red; 인라인 background/border 제거, padding 등 레이아웃 인라인은 유지).
   - NPC 포트레이트 래퍼 → `class="holo-portrait"`.
2. **combat.js** — 전투 진입 브리핑 / 스펙 카드 / 등장 헤더
   - `_hostileVsHeader`·브리핑 팝업 컨테이너 → `holo-panel`(+세력색), 스펙 요약 카드 → `holo-card`.
   - 전투 시작 버튼은 이미 `.btn`(테마 적용됨) — 유지.
3. **report-popup.js** — 보상/획득 팝업
   - 팝업 패널 → `holo-panel`, 보상 항목 카드 → `holo-card`, 등급색은 `cr-L/cr-H/cr-R` 클래스 유지(테마가 색 분기).
4. **공통 규칙**
   - 인라인 `background:`·`border:`·`border-radius:` 만 제거(또는 비우기) → 클래스가 적용되도록. **width/padding/flex/위치 인라인은 그대로 둠**.
   - 텍스트/이미지/버튼 구조 변경 금지. 색 의미(적=red, 보상=gold/green) 유지.
   - 노치 컷이 모서리 콘텐츠와 겹치면 패널 padding을 16px↑로.

## 검증
```bash
node --check js/modules/shakedown-popup.js js/modules/combat.js js/modules/report-popup.js
```
- 인게임(index-holo.html): 통행료·전투·보상 팝업이 노치 글래스+네온 라인으로 표시 / 버튼·모달과 톤 일치 / 텍스트 잘림 없음 / 모바일에서도 정상.
- 원본(index.html)은 영향 없음(테마 미로드).

## 정식 통합(선택)
디자인 확정 후 `game-holo-theme.css` 내용을 `game.css` 말미에 병합하고 `index.html`에도 반영하면 단일본으로 통일. (그 전까지는 index-holo.html로 비교 검토 권장.)

> 색 변수: 테마는 game.css의 `--cyan/--gold/--red/--green/--purple` 를 그대로 사용 → 추가 색 정의 불필요.
