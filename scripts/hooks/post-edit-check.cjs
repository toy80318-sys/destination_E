#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// Claude Code PostToolUse 훅 — 편집 직후 자동 검증(하네스 피드백 루프).
//   · .js 편집 → node --check (구문). 실패 시 에러를 컨텍스트로 되돌려 즉시 자가수정 유도.
//   · i18n/ko.js·en.js 편집 → scripts/i18n-parity.js (로케일 키 일치).
//   · 게이트가 아닌 피드백: 성공 시 침묵(exit 0), 실패 시 decision:block + reason(에러 본문).
//   설정: .claude/settings.json hooks.PostToolUse (matcher Write|Edit)
// ═══════════════════════════════════════════════════════════════════
const { execFileSync } = require('child_process');
const path = require('path');

let raw = '';
try { raw = require('fs').readFileSync(0, 'utf8'); } catch (e) { process.exit(0); }
let file = '';
try {
  const j = JSON.parse(raw || '{}');
  file = (j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || '';
} catch (e) { process.exit(0); }
if (!file) process.exit(0);

const norm = file.replace(/\\/g, '/');
// 검증 제외: 생성물/외부/문서
if (/node_modules|mobile-www|\/android\/|\/ios\/|\/dist\/|img_backup|01_GDD|07_Tools|\.min\.js/.test(norm)) process.exit(0);

function block(reason) {
  console.log(JSON.stringify({ decision: 'block', reason: reason.slice(0, 1500) }));
  process.exit(0);
}

// 1) JS 구문 검사
if (/\.(js|cjs|mjs)$/.test(norm)) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    block('[hook:post-edit-check] node --check 실패 — 방금 편집한 파일에 구문 오류가 있습니다. 즉시 수정하세요:\n' +
      String(e.stderr || e.message || ''));
  }
}

// 2) i18n 파리티 (ko.js / en.js 편집 시)
if (/i18n\/(ko|en)\.js$/.test(norm)) {
  try {
    const root = path.resolve(__dirname, '..', '..');
    const out = execFileSync(process.execPath, [path.join(root, 'scripts', 'i18n-parity.js')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    if (!/✅/.test(out)) block('[hook:post-edit-check] i18n 로케일 키 불일치 — ko/en 양쪽에 키를 추가했는지 확인:\n' + out);
  } catch (e) {
    block('[hook:post-edit-check] i18n-parity 실패:\n' + String(e.stdout || e.stderr || e.message || ''));
  }
}

process.exit(0);
