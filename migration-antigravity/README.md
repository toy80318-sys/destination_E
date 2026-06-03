# Antigravity 마이그레이션 패키지

데스티네이션 어스 프로젝트를 **Google Antigravity 안에서 Claude Code로 이어 작업**하기 위한 설정·메모리·지침 묶음.

전제: Antigravity는 VS Code 포크이므로 Claude Code CLI를 그대로 사용할 수 있습니다. 본 패키지는 **Firebase Studio → 로컬 Antigravity** 환경 전환 시 사라지는 Claude Code 고유 자산(자동 메모리·권한 룰·프로젝트 지침)을 한 곳에 모아 즉시 복원할 수 있도록 구성했습니다.

---

## 패키지 구조

```
migration-antigravity/
├── README.md                    # 이 파일
├── CHECKLIST.md                 # 전후 검증 체크리스트
├── memory/                      # 자동 메모리 (5개 파일)
│   ├── MEMORY.md                # 인덱스
│   ├── feedback_story_consistency.md
│   ├── project_electron_workflow.md
│   ├── project_image_workflow.md
│   └── project_pwa_workflow.md
├── settings/
│   ├── global-settings.json     # ~/.claude/settings.json (73 allow + 7 deny + acceptEdits)
│   └── project-settings.local.json  # 프로젝트별 .claude/settings.local.json (185 allow)
└── scripts/
    ├── restore.sh               # 새 환경에 자동 복원
    └── verify.sh                # 복원 후 검증
```

---

## 0. 사전 작업 (현재 환경에서)

1. **모든 변경사항 commit·push 확인**
   ```bash
   git status   # working tree clean 확인
   git push origin main
   ```

2. **이 패키지가 최신 상태인지 확인**
   - 메모리 파일이 5개 (MEMORY.md + 4건)
   - settings 2개 (global + local)
   - 패키지 자체도 git에 commit되어 있어야 새 환경에서 받을 수 있음

---

## 1. 새 환경 (로컬 Antigravity)

### 1-1. Antigravity 설치
- `antigravity.google`에서 OS별 설치 파일 다운로드
- Google 계정 로그인 → Gemini 3 액세스 부여

### 1-2. Claude Code CLI 설치
```bash
# macOS / Linux
curl -fsSL https://claude.com/install.sh | sh

# Windows (PowerShell)
iwr -useb https://claude.com/install.ps1 | iex
```
설치 후 `claude --version`으로 확인. Anthropic 계정 로그인 필요.

### 1-3. 프로젝트 가져오기
```bash
mkdir -p ~/projects && cd ~/projects
git clone https://github.com/toy80318-sys/destination_E.git destinatione
cd destinatione
```
이 시점에 `migration-antigravity/` 폴더가 클론된 저장소 안에 함께 들어옵니다.

### 1-4. 자동 복원 스크립트 실행
```bash
bash migration-antigravity/scripts/restore.sh
```
이 스크립트가 다음 작업을 자동 수행:
- 메모리 파일을 `~/.claude/projects/<sanitized-cwd>/memory/`로 복사
- 글로벌 `~/.claude/settings.json` 복사 (기존 파일이 있으면 `.bak`로 백업)
- 프로젝트 `.claude/settings.local.json` 복사

### 1-5. Antigravity에서 폴더 열기
```
File → Open Folder → ~/projects/destinatione
```
Antigravity 내장 터미널에서 `claude` 실행 → 즉시 Claude Code 시작.

### 1-6. 검증
```bash
bash migration-antigravity/scripts/verify.sh
```

---

## 2. 손실되는 항목 (의도적)

다음은 Firebase Studio 환경 고유라 패키지에 포함하지 않았습니다 — 새 환경에서 다시 인증·연결하세요.

| 항목 | 재설정 방법 |
|---|---|
| MCP 서버 (Gmail·Calendar·Drive·higgsfield) | Claude Code에서 `/mcp` 명령 → 각 서버 OAuth 재인증 |
| `scheduled_tasks.lock` | Claude Code가 자동 재생성 |
| Cloud Save Firestore 인증 (Anonymous UID) | 게임 첫 실행 시 자동 재생성 — 새 UID가 됨 (이전 클라우드 세이브와 분리됨, 의도) |
| Firebase Studio 자체 환경 | 사용 안 함 |

---

## 3. CLAUDE.md 지침 — Antigravity에서

프로젝트 루트의 `CLAUDE.md`(3줄짜리 게임 개요)와 `claude-code-best-practice-main/CLAUDE.md`(201줄짜리 5-역할 모델 + Claude Code 베스트 프랙티스)는 그대로 유지됩니다.

Claude Code는 두 파일을 자동 로드하므로 별도 작업 불필요.

---

## 4. 멀티 에이전트 활용 (옵션)

Antigravity는 자체 multi-agent 시스템을 지원합니다 (Gemini 3 기반). 5-역할 모델을 Antigravity 네이티브 에이전트로 분리하고 싶다면:

- `.antigravity/agents/director.md`, `planner.md`, `coder.md`, `reviewer.md`, `tester.md` 작성
- 각 파일에 CLAUDE.md Part 1의 해당 역할 지시사항 복사

단, **현재는 Claude Code 단일 어시스턴트 안에서 5-역할 모드를 시뮬레이션**하는 방식으로 진행 중이므로(G9 적용 완료), 우선 그대로 두고 필요 시점에 분리 확장 권장.

---

## 5. 진행 중 작업

마지막 적용된 i18n 배치: **G9** (notify 9 + modal 20 = 28키, 29 사이트 치환, unique 2386→2354).
GitHub 최신 commit: `e7d2d55` 시리즈.

새 환경에서 G10부터 이어 작업하면 됩니다.

---

## 문제 해결

- **복원 후 메모리가 안 보임**: Claude Code 세션을 새로 시작 (`exit` 후 `claude` 재실행)
- **권한 프롬프트가 여전히 떠**: `~/.claude/settings.json`의 `defaultMode`가 `"acceptEdits"`인지 확인
- **MCP 서버가 안 보임**: `/mcp` 명령 → 서버별 재인증 필요. 마이그레이션 패키지에는 인증 정보 미포함 (보안)
