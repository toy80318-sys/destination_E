#!/usr/bin/env bash
# Antigravity / 로컬 환경에서 Claude Code 설정을 복원합니다.
# 실행: bash migration-antigravity/scripts/restore.sh
#
# 작업:
#   1) ~/.claude/settings.json 복원 (기존 파일은 .bak로 백업)
#   2) <repo>/.claude/settings.local.json 복원 (기존 파일은 .bak로 백업)
#   3) 자동 메모리 디렉토리 생성 + 메모리 5개 파일 복사
#
# 안전 가드: 기존 파일이 있으면 무조건 .bak 백업 후 덮어쓰기. 강제 종료 시 무손실.

set -euo pipefail

# ─── 경로 계산 ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_DIR="$(cd "${PKG_DIR}/.." && pwd)"
CWD_SANITIZED="$(echo "${REPO_DIR}" | sed 's|/|-|g')"  # /home/user/proj → -home-user-proj
MEMORY_DIR="${HOME}/.claude/projects/${CWD_SANITIZED}/memory"

echo "═══ Antigravity 마이그레이션 복원 ═══"
echo "패키지:    ${PKG_DIR}"
echo "프로젝트:  ${REPO_DIR}"
echo "메모리:    ${MEMORY_DIR}"
echo ""

# ─── 1. 글로벌 settings.json ─────────────────────────────────────────
echo "[1/3] 글로벌 ~/.claude/settings.json 복원"
mkdir -p "${HOME}/.claude"
if [[ -f "${HOME}/.claude/settings.json" ]]; then
  BACKUP="${HOME}/.claude/settings.json.bak.$(date +%s)"
  cp "${HOME}/.claude/settings.json" "${BACKUP}"
  echo "  기존 파일 백업 → ${BACKUP}"
fi
cp "${PKG_DIR}/settings/global-settings.json" "${HOME}/.claude/settings.json"
echo "  복원 완료 (allow $(python3 -c 'import json;d=json.load(open("'"${HOME}"'/.claude/settings.json"));print(len(d.get("permissions",{}).get("allow",[])))') / deny $(python3 -c 'import json;d=json.load(open("'"${HOME}"'/.claude/settings.json"));print(len(d.get("permissions",{}).get("deny",[])))'))"
echo ""

# ─── 2. 프로젝트 settings.local.json ────────────────────────────────
echo "[2/3] 프로젝트 .claude/settings.local.json 복원"
mkdir -p "${REPO_DIR}/.claude"
if [[ -f "${REPO_DIR}/.claude/settings.local.json" ]]; then
  BACKUP="${REPO_DIR}/.claude/settings.local.json.bak.$(date +%s)"
  cp "${REPO_DIR}/.claude/settings.local.json" "${BACKUP}"
  echo "  기존 파일 백업 → ${BACKUP}"
fi
# sanitized 버전 우선 사용 (경로 하드코딩 제거, 146개 룰).
# 원본(185개)을 원하면 USE_RAW_SETTINGS=1 환경변수 설정 후 실행.
if [[ "${USE_RAW_SETTINGS:-0}" == "1" ]]; then
  cp "${PKG_DIR}/settings/project-settings.local.json" "${REPO_DIR}/.claude/settings.local.json"
  echo "  원본 settings 사용 (USE_RAW_SETTINGS=1)"
else
  cp "${PKG_DIR}/settings/project-settings.sanitized.json" "${REPO_DIR}/.claude/settings.local.json"
fi
echo "  복원 완료 (allow $(python3 -c 'import json;d=json.load(open("'"${REPO_DIR}"'/.claude/settings.local.json"));print(len(d.get("permissions",{}).get("allow",[])))'))"
echo ""

# ─── 3. 자동 메모리 ──────────────────────────────────────────────────
echo "[3/3] 자동 메모리 복원"
mkdir -p "${MEMORY_DIR}"
COPIED=0
for f in "${PKG_DIR}"/memory/*.md; do
  [[ -f "$f" ]] || continue
  name="$(basename "$f")"
  if [[ -f "${MEMORY_DIR}/${name}" ]]; then
    BACKUP="${MEMORY_DIR}/${name}.bak.$(date +%s)"
    cp "${MEMORY_DIR}/${name}" "${BACKUP}"
    echo "  기존 ${name} 백업 → ${BACKUP##*/}"
  fi
  cp "$f" "${MEMORY_DIR}/${name}"
  COPIED=$((COPIED+1))
done
echo "  ${COPIED}개 파일 복사 완료"
echo ""

echo "═══ 복원 완료 ═══"
echo ""
echo "다음 단계:"
echo "  1) 검증:           bash migration-antigravity/scripts/verify.sh"
echo "  2) Claude Code 시작: cd ${REPO_DIR} && claude"
echo "  3) MCP 서버 재인증: claude 안에서 /mcp 명령"
