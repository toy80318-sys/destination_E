#!/usr/bin/env bash
# 복원 후 검증 스크립트
# 실행: bash migration-antigravity/scripts/verify.sh

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PKG_DIR}/.." && pwd)"
CWD_SANITIZED="$(echo "${REPO_DIR}" | sed 's|/|-|g')"
MEMORY_DIR="${HOME}/.claude/projects/${CWD_SANITIZED}/memory"

PASS=0
FAIL=0

check() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  ✅ ${label}"
    PASS=$((PASS+1))
  else
    echo "  ❌ ${label}"
    FAIL=$((FAIL+1))
  fi
}

echo "═══ 마이그레이션 검증 ═══"
echo ""
echo "[설정 파일]"
check "글로벌 settings.json 존재"            "[[ -f '${HOME}/.claude/settings.json' ]]"
check "프로젝트 settings.local.json 존재"    "[[ -f '${REPO_DIR}/.claude/settings.local.json' ]]"
check "글로벌 defaultMode=acceptEdits"       "grep -q 'acceptEdits' '${HOME}/.claude/settings.json' 2>/dev/null"

echo ""
echo "[자동 메모리]"
check "메모리 디렉토리 존재"                  "[[ -d '${MEMORY_DIR}' ]]"
check "MEMORY.md 인덱스"                      "[[ -f '${MEMORY_DIR}/MEMORY.md' ]]"
check "image_workflow 메모리"                 "[[ -f '${MEMORY_DIR}/project_image_workflow.md' ]]"
check "pwa_workflow 메모리"                   "[[ -f '${MEMORY_DIR}/project_pwa_workflow.md' ]]"
check "electron_workflow 메모리"              "[[ -f '${MEMORY_DIR}/project_electron_workflow.md' ]]"
check "story_consistency 피드백"              "[[ -f '${MEMORY_DIR}/feedback_story_consistency.md' ]]"

echo ""
echo "[프로젝트 상태]"
check "Git 저장소"                             "[[ -d '${REPO_DIR}/.git' ]]"
check "CLAUDE.md 존재"                        "[[ -f '${REPO_DIR}/CLAUDE.md' ]]"
check "best-practice CLAUDE.md 존재"           "[[ -f '${REPO_DIR}/claude-code-best-practice-main/CLAUDE.md' ]]"
check "game.js 존재"                          "[[ -f '${REPO_DIR}/game.js' ]]"
check "i18n_dict.js 존재"                     "[[ -f '${REPO_DIR}/js/data/i18n_dict.js' ]]"

echo ""
echo "[Claude Code 명령 가용성]"
check "claude CLI 설치"                       "command -v claude > /dev/null"

echo ""
echo "═══ 결과: ${PASS} PASS / ${FAIL} FAIL ═══"
if [[ $FAIL -eq 0 ]]; then
  echo "✅ 마이그레이션 정상 — Claude Code 시작 준비 완료"
  echo ""
  echo "다음: cd ${REPO_DIR} && claude"
  exit 0
else
  echo "⚠️  실패 항목 확인 필요 — 위 ❌ 행을 점검하세요"
  exit 1
fi
