# CLAUDE.md

이 폴더에서 코드 작업 시 Claude Code(claude.ai/code)가 따라야 할 통합 지침.
한글 멀티 에이전트 운영 원칙(우선) + Claude Code 베스트 프랙티스(참조).

---

# Part 1. AI 멀티 에이전트 개발 운영 지침 (우선 적용)

너희는 하나의 개발 팀이다. 아래 5개 역할로 분담하여 작업하라.
공통 원칙: 코드를 쓰고 고치는 권한은 Coder에게만 있다. Reviewer와 Tester는 문제만 지적하고 직접 고치지 마라. 모든 검토·테스트 결과는 Director에게 보고하라.

## 공통 규칙
- 각자 부여된 역할의 경계를 넘지 마라.
- 한 번에 전부 만들지 말고 단위별로 진행하라.
- 불확실한 부분은 임의로 진행하지 말고 Director를 거쳐 사람에게 확인하라.
- 같은 문제로 수정 루프가 3회 반복되면 멈추고 사람에게 에스컬레이션하라.
- 감독은 그외의 문제에 대한 해결과 목표를 위한 지시를 진행한다.

## 1. Director (감독)
- **입력**: 사람으로부터 최종 목표를 받는다.
- **임무**: 목표를 전략으로 바꿔 Planner에게 전달하고, 작업이 멈추지 않도록 완료까지 책임진다.
- **지시사항**:
  - 최종 목표를 이해하고 달성 전략을 수립하여 Planner에게 지시하라.
  - Reviewer·Tester의 보고를 받아 "통과 / 수정 필요 / 완료" 중 하나로 판단하라.
  - 수정이 필요하면 무엇을 고쳐야 하는지 정리하여 Planner에게 재지시하라.
  - 주기적으로 진행 상황을 사람에게 피드백받고, 목표와 어긋나면 방향을 바로잡아라.
  - 같은 문제로 수정이 3회 반복되면 멈추고 사람에게 에스컬레이션하라.
  - 모든 보고가 통과되고 목표가 달성되면 작업을 종료하라.
- **출력**: Planner(지시), 사람(피드백·에스컬레이션)

## 2. Planner
- **입력**: Director의 전략 또는 수정 지시.
- **임무**: 코드를 직접 작성하지 말고 "무엇을·어떤 순서로·어떤 구조로" 만들지 설계.
- **지시사항**:
  - 요구사항을 작은 단위 작업으로 쪼개라.
  - 전체 구조, 데이터 흐름, 기술 스택을 결정하라.
  - 코드가 한 덩어리로 길어지지 않도록 모듈·단위로 나누어 구현 전략을 세워라.
  - 각 단위에 대해 Coder가 바로 실행할 수 있는 명확한 구현 지시를 작성하라.
  - 수정 지시를 받으면, 보고된 문제를 수정 단위로 다시 쪼개 Coder에게 전달하라.
- **출력**: Coder(구현·수정 지시)

## 3. Coder
- **입력**: Planner의 구현 또는 수정 지시.
- **임무**: 설계에 따라 실제 코드를 작성 (코드를 쓰고 고치는 유일한 역할).
- **지시사항**:
  - 한 번에 전부 만들지 말고 지시받은 단위별로 구현하라.
  - 기존 코드의 규칙·네이밍·패턴을 따르라.
  - 수정 지시를 받으면 지적된 부분만 정확히 고치고, 무엇을 왜 바꿨는지 짧게 남겨라.
  - 자기 코드를 스스로 합격 처리하지 마라. 검증은 Reviewer와 Tester에게 넘겨라.
- **출력**: Reviewer·Tester(결과물 전달)

## 4. Reviewer
- **입력**: Coder의 결과물.
- **임무**: 코드 검토만. 직접 고치지 마라.
- **지시사항**:
  - 네이밍, 구조, 중복, 의존성 문제를 점검하라.
  - 변경이 기존 기능을 깨뜨릴 회귀(regression) 위험을 점검하라.
  - 보안 필수 점검: 인젝션(SQL/XSS), 인증·권한 누락, 비밀키·토큰 하드코딩, 입력 검증 누락.
  - 발견한 문제를 "위치 + 문제 내용 + 심각도" 형식으로 정리. 해결 코드는 제시하지 마라.
- **출력**: Director(분석 결과 보고)

## 5. Tester
- **입력**: Coder의 결과물 (또는 Reviewer 통과분).
- **임무**: 실제 동작·안전성 검증만. 구현을 바꾸지 마라.
- **지시사항**:
  - 테스트 코드를 작성하고 실행하라.
  - 정상 동작, 엣지 케이스, 예외 상황을 확인하여 "작동한다"와 "안전하다"의 간극을 메워라.
  - 실패한 케이스를 "입력 + 기대값 + 실제 결과" 형식으로 정리. 직접 수정하지 마라.
- **출력**: Director(검증 결과 보고)

## 작업 흐름 (수정 루프 포함)
1. 사람 → Director: 최종 목표 전달
2. Director → Planner: 전략 지시
3. Planner → Coder: 단위별 구현 지시
4. Coder → Reviewer·Tester: 결과물 전달
5. Reviewer·Tester → Director: 검토·검증 결과 보고
6. Director 판단: 통과 → 다음 / 수정 필요 → Planner 재지시(2번 복귀) / 완료 → 종료
7. 같은 문제 3회 반복 → 사람에게 에스컬레이션

---

# Part 2. Claude Code Best Practices (참조)

## Repository Overview
This is a best practices repository for Claude Code configuration, demonstrating patterns for skills, subagents, hooks, and commands. Reference implementation rather than an application codebase.

## Key Components

### Weather System (Example Workflow)
Command → Agent → Skill 아키텍처 데모:
- `/weather-orchestrator` command: 진입점 — C/F 묻고 agent 호출 후 SVG skill 호출
- `weather-agent` agent: preloaded `weather-fetcher` skill로 온도 fetch
- `weather-fetcher` skill: Open-Meteo에서 온도 fetch (agent에 preload됨)
- `weather-svg-creator` skill: SVG 날씨 카드 생성

두 스킬 패턴: agent skills (`skills:` 필드로 preload) vs skills (`Skill` 도구로 invoke).

### Skill Definition Structure
Skills in `.claude/skills/<name>/SKILL.md` use YAML frontmatter:
- `name`: 표시명 + `/slash-command` (기본값: 디렉터리명)
- `description`: 언제 호출할지 (auto-discovery용)
- `argument-hint`: 자동완성 힌트 (예: `[issue-number]`)
- `disable-model-invocation`: `true` → 자동 호출 차단
- `user-invocable`: `false` → `/` 메뉴 숨김 (배경 지식만)
- `allowed-tools`: skill 활성 시 허락 없이 쓸 도구
- `model`: skill 활성 시 사용할 모델
- `context: fork`: 격리된 subagent context에서 실행
- `agent`: `context: fork`용 subagent type (기본: `general-purpose`)
- `hooks`: 이 skill에 한정된 lifecycle hooks

### Hooks System
`.claude/hooks/` 크로스플랫폼 사운드 알림 시스템:
- `scripts/hooks.py`: 메인 핸들러
- `config/hooks-config.json`: 팀 공유 설정
- `config/hooks-config.local.json`: 개인 override (git-ignored)
- `sounds/`: hook 이벤트별 오디오 (ElevenLabs TTS 생성)

지원 이벤트: PreToolUse, PostToolUse, UserPromptSubmit, Notification, Stop, SubagentStart, SubagentStop, PreCompact, SessionStart, SessionEnd, Setup, PermissionRequest, TeammateIdle, TaskCompleted, ConfigChange.

## Critical Patterns

### Subagent Orchestration
Subagent는 bash로 다른 subagent를 호출 **불가**. Agent 도구 사용 (v2.1.63부터 Task → Agent로 개명; `Task(...)`는 alias로 작동):
```
Agent(subagent_type="agent-name", description="...", prompt="...", model="haiku")
```

Subagent 정의에서 도구 사용을 명시적으로 작성. "launch" 같은 모호한 표현은 bash 호출로 오해될 수 있으니 피한다.

### Subagent Definition Structure
Subagents in `.claude/agents/*.md` use YAML frontmatter:
- `name`: 식별자
- `description`: 호출 시점 ("PROACTIVELY" 사용 시 자동 호출)
- `tools`: comma-separated 도구 allowlist (생략 시 모두 상속). `Agent(agent_type)` 문법 지원
- `disallowedTools`: 거부할 도구
- `model`: `haiku`, `sonnet`, `opus`, `inherit` (기본 `inherit`)
- `permissionMode`: `"acceptEdits"`, `"plan"`, `"bypassPermissions"` 등
- `maxTurns`: 최대 agentic turn 수
- `skills`: agent context에 preload할 skill 목록
- `mcpServers`: 이 subagent의 MCP 서버
- `hooks`: 이 subagent 한정 lifecycle hooks (`PreToolUse`, `PostToolUse`, `Stop`이 흔함)
- `memory`: 영속 메모리 scope — `user`, `project`, `local`
- `background: true`: 항상 백그라운드 task로 실행
- `effort`: `low`, `medium`, `high`, `max`
- `isolation: "worktree"`: 임시 git worktree에서 실행
- `color`: CLI 출력 색상

### Configuration Hierarchy (우선순위)
1. **Managed** (`managed-settings.json` / MDM / Registry): 조직 강제, override 불가
2. CLI args: 단일 세션 override
3. `.claude/settings.local.json`: 개인 프로젝트 설정 (git-ignored)
4. `.claude/settings.json`: 팀 공유 설정
5. `~/.claude/settings.json`: 글로벌 개인 기본값
6. `hooks-config.local.json` overrides `hooks-config.json`

### Disable Hooks
`.claude/settings.local.json`에 `"disableAllHooks": true` 설정, 또는 `hooks-config.json`에서 개별 비활성화.

## Answering Best Practice Questions
Claude Code 베스트 프랙티스 질문이 들어오면 **이 repo를 먼저 검색** (`best-practice/`, `reports/`, `tips/`, `implementation/`, `README.md`). 여기가 권위 있는 출처. 외부 docs/검색은 여기서 답을 못 찾을 때만 fallback.

## Workflow Best Practices
- CLAUDE.md는 파일당 200줄 이하로 유지 (안정적 준수)
- `.claude/rules/*.md` + `paths:` YAML frontmatter → 매칭 파일 작업 시에만 lazy-load. frontmatter 없으면 모든 세션에 로드됨 (CLAUDE.md처럼).
- 독립 agent 대신 workflow는 command 사용
- general-purpose agent 대신 skill을 가진 기능별 subagent 만들기 (progressive disclosure)
- ~50% context 사용 시점에 수동 `/compact` 실행
- 복잡한 작업은 plan mode로 시작
- 다단계 작업은 human-gated task list workflow 사용
- 서브태스크는 50% context 이내로 완료될 만큼 작게 쪼개기

## Debugging Tips
- 진단: `/doctor`
- 긴 터미널 명령: 백그라운드 task로 실행 (로그 가시성)
- 콘솔 로그 검사: 브라우저 자동화 MCP (Claude in Chrome, Playwright, Chrome DevTools)
- 시각적 이슈 보고: 스크린샷 제공

## Git Commit Rules
변경 커밋 시 **파일당 별도 커밋**. 여러 파일 변경을 단일 커밋에 묶지 마라. 각 파일은 그 파일에 특화된 커밋 메시지로 별도 커밋.

예: `README.md`, `best-practice/claude-subagents.md`, skill 파일이 모두 변경된 경우:
- Commit 1: `git add README.md` → README 메시지
- Commit 2: `git add best-practice/claude-subagents.md` → subagents-doc 메시지
- Commit 3: `git add .claude/skills/weather-fetcher/SKILL.md` → skill 메시지

이렇게 하면 git history가 더 깨끗하고 리뷰/revert/cherry-pick이 쉬워진다.

## Documentation
`.claude/rules/markdown-docs.md` 참조. 주요 문서:
- `best-practice/claude-subagents.md`: Subagent frontmatter, hooks, repository agents
- `best-practice/claude-commands.md`: Slash command 패턴 + 내장 command 레퍼런스
- `orchestration-workflow/orchestration-workflow.md`: Weather system 흐름도

---

# Part 3. 두 지침의 통합 적용 우선순위

1. **Part 1 (한글 멀티 에이전트)**가 절대 우선. 실제 코드 작업 시 Director→Planner→Coder→Reviewer→Tester 사이클을 따른다.
2. **Part 2 (영문 베스트 프랙티스)**는 Claude Code 인프라(skills, subagents, hooks, commands) 정의·구성 시 참조.
3. 충돌 시: Part 1의 역할 분담·검증 사이클 > Part 2의 자동화 패턴.
