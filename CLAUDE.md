이 폴더는 데스티네이션 어스 웹게임 폴더임
글로벌 스텐다드 기준으로 게임이 완성도 있는 형태가 되도록
검증하고 코딩하는 작업진행 주기적으로 버그수정
기존의 유사한 게임을 참고하여 UI개선 및 게임 벨런스 조정

---

이 파일은 본 저장소에서 AI 코딩 에이전트(Claude Code / Claude Cowork)가 작업할 때 따라야 할 지침이다. 하위 디렉터리에 별도 CLAUDE.md가 있다면, 해당 영역에 들어갈 때 그 파일의 규칙을 우선한다.

## 프로젝트 개요

- **제목:** 데스티네이션 어스 (Destination Earth)
- **플랫폼:** PC — Windows 우선, macOS·Linux(AppImage) 지원
- **배포처:** Steam (1순위), itch.io·Firebase 호스팅(웹) 병행
- **엔진 / 스택:** 바닐라 HTML/CSS/JS 웹게임을 Electron 33으로 패키징. 빌드는 electron-builder 25.
- **타깃 스펙:** 데스크톱 x64(Win10+), Steam Deck은 Windows 빌드 + Proton 호환 경로. Steam 스토어 페이지 사양과 일치시킬 것.
- **현재 단계:** 베타 / 출시 준비 (`package.json` version 기준 `1.0.0-beta.x`).

한 줄 요약: 24개 행성을 순회하며 함선·영웅을 모아 지구로 귀환하는 빅 픽처 스페이스 RPG. 의사결정 시 이 한 문장을 기준점으로 삼는다.

## 빌드 및 실행 명령

에디터 GUI가 아니라 CLI로 검증 가능한 경로를 명시한다. 에이전트는 GUI를 조작할 수 없다.

```bash
# 로컬 데스크톱 실행
npm run electron          # 일반 실행
npm run electron:dev      # 로깅 활성화 실행

# 배포 빌드 (publish 안 함)
npm run dist:win          # Windows (nsis 설치본 + portable + win-unpacked)
npm run dist:mac          # macOS (dmg) — Mac 하드웨어에서만 가능
npm run dist:linux        # Linux (AppImage)

# Steam 원클릭 빌드 (Windows)
build-steam-win.bat       # 버전 bump → dist:win → dist 폴더 열기. 로그는 build-log.txt

# 버전 / 배포
npm run release:local     # 버전 bump (git push 안 함)
npm run release           # 버전 bump + push
npm run deploy            # Firebase 호스팅 배포 + 정리
```

빌드 산출물 위치: `dist/`. **Steam depot 업로드용은 `dist/win-unpacked/` 폴더 통째로** (설치본 .exe가 아님). 자세한 흐름은 `STEAM_BUILD_GUIDE.md` 참고.

버전은 `npm run bump`(= `scripts/bump-version.js`)으로만 올린다. `package.json`의 `version`과 게임 내 `_GAME_VER`를 직접 손으로 어긋나게 두지 말 것.

## 변경 검증 (Verifying Changes)

큰 변경(새 함수·대규모 리팩터·데이터 구조 변경) 후에는 반드시 검증하고 커밋한다. 매번 전체 패키징 빌드를 돌리지 말 것.

```bash
node --check game.js                 # 구문(파서) 검증 — game.js 및 수정한 모든 js/ 파일
node scripts/verify-i18n-live.js     # i18n 라이브 검증 (텍스트/번역 변경 시)
```

- **코드/로직 소규모 수정:** 수정한 `.js` 파일에 `node --check` 통과.
- **시스템/구조 변경:** 핵심 흐름(새 게임 → 행성 순회 → 영웅 영입 → 엔딩)을 시뮬레이션/플레이로 1회 이상 확인.
- **에셋/콘텐츠 추가:** 정적 이미지 참조 누락 검증, 빌드 포함 목록(`build.files`) 확인.
- 전체 패키징 빌드(`dist:win` 등)는 출시 후보(RC) 또는 빌드 파이프라인 변경 시에만 수행한다.
- 검증·테스트 결과는 Director에게 보고한다(프로젝트 멀티 에이전트 지침 준수).

## 디렉터리 구조 / 아키텍처 개요

```
destination_E-main/
├── index.html              # 진입점
├── game.js                 # 메인 게임 로직 (대형 단일 파일)
├── game.css                # 스타일
├── js/modules/             # 분리된 기능 모듈 25종 (전투·정비소·퀘스트·도감 등)
├── electron/               # 데스크톱 셸 (main.js, preload.js)
├── img/                    # 이미지 에셋 (ships/H 1024×1024 기준)
├── 02_Assets/audio/        # 오디오
├── scripts/                # 빌드·검증·자산 생성 스크립트
├── build/                  # 빌드 리소스 (아이콘 등)
└── dist/                   # 빌드 산출물 (커밋 금지)
```

핵심 시스템

- **게임 로직·상태:** `game.js` — 함선/영웅/행성/전투/경제 상태 및 진행.
- **기능 모듈:** `js/modules/` — 전투, 정비소(제작·거래·파츠), 주점 가챠, 퀘스트/컷씬, 엔딩 크레딧, 도감 등.
- **데스크톱 셸:** `electron/main.js` — 창 상태·환경설정 저장, autoUpdater, Steam 빌드 감지.

데이터 흐름: 입력 → `game.js` 로직 → 상태 변경 → DOM 렌더 + `localStorage` 저장.

## 코드 스타일 / 규칙

- **기존 코드의 네이밍·패턴·구조를 따른다.** 새 컨벤션을 임의로 도입하지 않는다.
- 새 기능은 `game.js`에 무한정 쌓지 말고, 적절한 단위로 `js/modules/`에 분리한다(기존 25개 모듈 분할 방식 참고).
- **정적 로드를 선호한다.** 동적 로딩은 순환 의존 해소·실제 성능상 코드 분할·런타임 조건부 로드가 꼭 필요할 때만.
- **하드코딩 금지:** 밸런싱 수치는 가능한 한 데이터 테이블/상수로 분리한다. 비밀 키·토큰은 코드에 남기지 않는다.
- 입력 검증을 빠뜨리지 않는다.
- 한 번에 전부 만들지 말고 지시받은 단위별로 구현한다.

## 에셋 및 콘텐츠 규칙

- 대용량 바이너리: 현재 Git LFS 미사용. 로컬 백업(`img_backup/` 266MB)은 `.gitignore`로 제외.
- 함선 이미지는 `img/ships/H/` 기준(1024×1024)으로 통일하고, 다른 사이즈는 `scripts/ships-h-propagate.js` 등 전용 스크립트로 일괄 생성한다.
- 빌드 포함/제외 목록은 `package.json`의 `build.files`를 따른다(`img_backup/`, `Doc/`, `07_Tools/`, `*.map`, `service-worker.js` 등 제외).
- **라이선스 불명 에셋은 절대 커밋하지 않는다.** 외부 에셋은 출처·라이선스를 확인하고 기록한다 — Steam 출시 시 법적 리스크가 된다.

## 세이브 데이터 / 영속성

- 게임 진행 저장: 브라우저 `localStorage` (Electron 내부 partition에 귀속).
- Electron 환경설정·창 상태: `app.getPath('userData')` 하위에 저장 → 설치 폴더 내부에 쓰지 않으므로 Steam Cloud 호환 OK.
- 세이브 포맷 변경 시 버전 필드/마이그레이션을 처리한다. **출시 후에는 기존 세이브를 깨뜨리는 변경을 함부로 하지 않는다.**

## Steam 통합 (Steamworks)

- **autoUpdater:** `electron/main.js`에 Steam 빌드 감지가 이미 구현됨 — 환경변수 `STEAM_BUILD=1`·`SteamAppId`·`SteamGameId` 또는 실행 폴더의 `steam_build.flag` 존재 시 자동 업데이트를 건너뛴다. Steam은 자체 업데이트를 쓰므로 Steam 빌드에서는 반드시 비활성 경로로 동작해야 한다.
- **Steamworks SDK(도전과제·오버레이·클라우드):** 현재 미연동. 추후 `steamworks.js`로 추가 가능하며 출시 필수는 아니다. 연동 시 SDK 초기화 성공 여부를 항상 확인한 뒤 호출하고, Steam이 없는 환경(웹·CI·에디터 실행)에서도 게임이 죽지 않도록 폴백한다.
- **App ID·비밀 키는 커밋 금지.** 환경변수나 미추적 설정으로 관리한다.

## 빌드 / 배포 파이프라인

- Steam 업로드: `dist/win-unpacked/`를 SteamPipe(steamcmd + app_build 스크립트)로 depot 업로드. Launch Option은 `Destination Earth.exe`.
- 업로드 전 체크: 버전 번호 갱신, 디버그 로그/치트 비활성화, 빌드 사이즈 확인, autoUpdater가 Steam 빌드에서 꺼지는지 확인.
- GitHub Actions로 win/mac/linux 3-OS 동시 빌드 가능(`.github/workflows/`).
- **빌드 산출물(`dist/`·`out/`)·로컬 설정·비밀 키는 절대 커밋하지 않는다.** `.gitignore` 확인.

## 작업 시 주의사항 (에이전트용)

- 에디터/플랫폼 GUI 전용 작업(Steamworks 파트너 사이트 설정, 코드 서명·공증 등)은 직접 수행할 수 없다. 코드/설정 차원에서 가능한지 먼저 검토하고, 안 되면 사용자에게 알린다.
- 대규모 리팩터링·시스템 추가 전에는 영향 범위를 먼저 요약해 확인을 받는다.
- 밸런싱 수치·레벨 디자인 의도 등 "게임 디자인 결정"은 임의로 바꾸지 않는다.
- 불확실하면 추측해서 진행하지 말고 질문한다(Director를 거쳐 사람에게 확인).

## 지속 개발 루프 (멀티 에이전트)

`.claude/agents/`에 프로젝트 서브에이전트 3종이 정의되어 있다 (세션 시작 시 로드됨):

- **de-coder** — 구현 담당. 코드를 쓰고 고치는 권한은 이 에이전트에게만 있다.
- **de-reviewer** — 리뷰 담당(읽기 전용). 결함·규칙 위반을 지적만 한다.
- **de-tester** — 검증 담당. 구문 검증·시뮬레이션을 실행하고 보고만 한다.

`/dev-loop` 명령(`.claude/commands/dev-loop.md`)이 이들을 오케스트레이션한다:
`DEV_BACKLOG.md`에서 미완료 항목 1건 선택 → de-coder 구현 → de-tester/de-reviewer 병렬 검증 → 수정 반복(최대 2회) → 체크·로그(`DEV_LOOP_LOG.md`)·커밋·푸시. 사이클당 정확히 1건만 처리한다.

반복 실행: 대화형 세션에서는 `/loop 30m /dev-loop`, 원격/헤드리스 세션에서는 크론 스케줄로 감싼다. 중단하려면 `DEV_BACKLOG.md`의 중단 플래그 섹션에 `STOP`을 쓴다. `❓`(결정 대기)·`⏸`(보류) 항목은 루프가 건너뛴다 — 게임 디자인 결정이 필요한 작업은 자동 처리하지 않는다.

상세 프로토콜(에이전트별 입출력 계약, 검증 게이트 G1~G6, 작업 유형별 라우팅, 안전장치 전체 목록)은 **`AGENT_HARNESS_GUIDE.md`** 를 따른다 — 멀티 에이전트 체계의 단일 기준 문서다.

## 리뷰어 참고

- `// @crumbs` 마커나 `#region @crumbs` 블록 같은 임시 디버그 계측은 리뷰에서 결함으로 지적하지 않는다. 병합 전 제거되는 일시적 코드다.
- Reviewer·Tester는 문제만 지적하고 직접 고치지 않는다. 코드를 쓰고 고치는 권한은 Coder에게만 있다.
