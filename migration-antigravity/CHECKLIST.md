# 마이그레이션 검증 체크리스트

새 환경(Antigravity + Claude Code)에서 작업을 시작하기 전 다음을 확인하세요.

## A. 사전 확인 (Firebase Studio 환경)

- [ ] `git status` clean — 미커밋 변경 없음
- [ ] `git push origin main` 완료
- [ ] `migration-antigravity/` 자체도 git에 commit되어 push됨

## B. Antigravity / Claude Code 설치

- [ ] Antigravity 설치 + Google 계정 로그인
- [ ] Claude Code CLI 설치 (`claude --version` 동작)
- [ ] Anthropic 계정 로그인 완료 (`claude` 첫 실행 시 OAuth)

## C. 프로젝트 클론 + 복원

- [ ] `git clone https://github.com/toy80318-sys/destination_E.git`
- [ ] 클론된 폴더로 이동
- [ ] `bash migration-antigravity/scripts/restore.sh` 실행
  - [ ] 글로벌 settings.json 복사됨
  - [ ] 프로젝트 settings.local.json 복사됨
  - [ ] 메모리 5개 파일 복사됨
- [ ] `bash migration-antigravity/scripts/verify.sh` → 전부 PASS

## D. Claude Code 첫 실행 검증

- [ ] Antigravity 내장 터미널에서 `claude` 실행
- [ ] 초기 시스템 메시지에 `MEMORY.md` 인덱스가 자동 로드됨
- [ ] CLAUDE.md (3줄 + 201줄) 둘 다 컨텍스트에 포함됨
- [ ] 권한 모드가 `acceptEdits`로 표시됨

테스트 명령:
```
git status를 보여줘
```
→ 권한 프롬프트 없이 즉시 실행되어야 함.

## E. MCP 서버 재인증 (필요 시)

이전 환경에서 쓰던 서버:
- [ ] `mcp__claude_ai_Gmail__*` (Gmail)
- [ ] `mcp__claude_ai_Google_Calendar__*` (Calendar)
- [ ] `mcp__claude_ai_Google_Drive__*` (Drive)
- [ ] `mcp__claude_ai_higgsfield__*` (미디어 생성)

Claude Code 안에서 `/mcp` 명령으로 각각 OAuth 재인증.

## F. 프로젝트 빌드/실행 검증

- [ ] `node -c game.js` — 구문 통과
- [ ] `node scripts/extract-i18n.js` — 추출기 정상 동작
- [ ] 로컬 서버 실행: `python3 -m http.server 8765` → 브라우저에서 게임 로드
- [ ] (선택) Electron PC 빌드: `cd electron && npm install && npm start`
- [ ] (선택) Firebase 배포: `firebase deploy --only firestore:rules`

## G. 진행 중 작업 이어가기

i18n 마지막 배치: **G9 완료** (commits `013899c` + `7e90ca1` + `e7d2d55`).
다음 시작점: **G10-A** (남은 baekgu() 정적 대사 33개).

- [ ] `git log --oneline -5` — 최신 커밋이 G9 시리즈인지 확인
- [ ] Claude Code 안에서 "G10 이어서 진행" 요청 → 메모리에서 컨텍스트 복원 확인

---

## 문제 발생 시

| 증상 | 해결 |
|---|---|
| 메모리가 로드 안 됨 | `claude` 세션을 새로 시작. `~/.claude/projects/<sanitized>/memory/MEMORY.md` 경로 존재 확인 |
| 권한 프롬프트가 계속 뜸 | `~/.claude/settings.json` 의 `defaultMode` 값 확인 (`acceptEdits` 여야 함) |
| Git push가 401 / permission denied | GitHub PAT 또는 SSH 키 새 환경에 등록 필요 |
| 프로젝트 settings의 옛 경로 룰 (`/home/user/destinatione/...`) 미작동 | 새 경로(`~/projects/destinatione/...`)로 자동 매칭됨 — 단, 경로 하드코딩된 룰은 수동 수정 |
| Firebase 인증 안 됨 | `firebase login` 재실행 |
