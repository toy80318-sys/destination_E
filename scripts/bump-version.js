#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// 버전 비트 자동화 — 한 번에 모든 캐시 비트 + 태그 + 푸시
//
// 사용법:
//   node scripts/bump-version.js                  → patch (beta.102 → beta.103)
//   node scripts/bump-version.js minor            → minor (beta.102 → beta.110) — 예약
//   node scripts/bump-version.js --message "..."  → 커밋 메시지 지정
//   node scripts/bump-version.js --no-push        → 로컬만, 푸시 안 함
//   node scripts/bump-version.js --no-tag         → 비트만, 태그 안 만듦
//   node scripts/bump-version.js --no-commit      → 파일만 수정
//
// 수행 작업:
//   1. package.json version 증가 (1.0.0-beta.N → 1.0.0-beta.N+1)
//   2. index.html  _GAME_VER + ?v=YYYYMMDDNNN  비트
//   3. service-worker.js  CACHE_VERSION 비트
//   4. git add -A
//   5. git commit -m "chore: bump v1.0.0-beta.N+1"
//   6. git tag -a v1.0.0-beta.N+1
//   7. git push origin main + tag → Pages 배포 + PC 빌드 트리거
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const valueOf = (name) => {
  const i = args.indexOf(name);
  return (i >= 0 && i < args.length - 1) ? args[i + 1] : null;
};

const NO_PUSH = flag('--no-push');
const NO_TAG = flag('--no-tag');
const NO_COMMIT = flag('--no-commit');
const MESSAGE = valueOf('--message') || valueOf('-m');

const log = (msg) => console.log('[bump] ' + msg);
const die = (msg) => { console.error('[bump] ERROR: ' + msg); process.exit(1); };

// ─── 1. package.json 읽기 + 다음 버전 계산 ───
const pkgPath = path.join(ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const m = /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/.exec(pkg.version);
if (!m) die('package.json version 형식 인식 불가: ' + pkg.version);
const [, M, mn, p, betaStr] = m;
const newBeta = parseInt(betaStr, 10) + 1;
const newVer = `${M}.${mn}.${p}-beta.${newBeta}`;
const newTag = `v${newVer}`;

// 캐시 버스터 (YYYYMMDD + 3자리 일련번호 = 매번 +1)
// _GAME_VER 의 ?v= 쌍을 모든 매치 모아서 최신 (= 최대값) 사용
const indexPath = path.join(ROOT, 'index.html');
const indexSrc = fs.readFileSync(indexPath, 'utf8');

const allCacheBusts = [];
const cbRe = /\?v=(\d{11})/g; let cbm;
while ((cbm = cbRe.exec(indexSrc))) allCacheBusts.push(cbm[1]);
if (!allCacheBusts.length) die('?v= 캐시 버스터 패턴 못 찾음');

// 최대값 = 가장 최신 비트
const oldCacheBust = allCacheBusts.sort().pop();

// 날짜 변경 시 일련번호 리셋, 같은 날이면 +1
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
let newSerial;
if (oldCacheBust.slice(0, 8) === today) {
  newSerial = String(parseInt(oldCacheBust.slice(8), 10) + 1).padStart(3, '0');
} else {
  newSerial = '001';
}
const newCacheBust = today + newSerial;
const newGameVer = `${today}.web_v${newVer}`;

log(`현재 → 다음: ${pkg.version} → ${newVer}`);
log(`캐시 버스터: ${oldCacheBust} → ${newCacheBust}`);
log(`_GAME_VER  : ${newGameVer}`);

// ─── 2. 파일 수정 ───
// package.json
pkg.version = newVer;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
log('✓ package.json');

// index.html — 캐시 버스터 + _GAME_VER
let newIndex = indexSrc.replace(/\?v=\d{8}\d{3}/g, '?v=' + newCacheBust);
newIndex = newIndex.replace(/_GAME_VER\s*=\s*'[^']+'/,
                            `_GAME_VER='${newGameVer}'`);
fs.writeFileSync(indexPath, newIndex);
log('✓ index.html (' + newGameVer + ')');

// service-worker.js — CACHE_VERSION
const swPath = path.join(ROOT, 'service-worker.js');
if (fs.existsSync(swPath)) {
  const swSrc = fs.readFileSync(swPath, 'utf8');
  // de-cache-vYYYYMMDD-NNN
  const newSw = swSrc.replace(/de-cache-v\d{8}-\d{3}/g,
                              `de-cache-v${today}-${newSerial}`);
  fs.writeFileSync(swPath, newSw);
  log('✓ service-worker.js');
}

// ─── 3. git commit + tag + push ───
if (NO_COMMIT) { log('--no-commit → git 작업 스킵, 종료'); process.exit(0); }

const run = (cmd) => {
  log('$ ' + cmd);
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
};
const runStdout = (cmd) => execSync(cmd, { cwd: ROOT }).toString().trim();

try { run('git add -A'); }
catch (e) { die('git add 실패: ' + e.message); }

// commit 메시지
const commitMsg = MESSAGE ||
  `chore(release): bump to ${newVer}\n\nCache buster: ${newCacheBust}\n_GAME_VER: ${newGameVer}`;

try { run(`git commit -m ${JSON.stringify(commitMsg)}`); }
catch (e) {
  // 변경 사항 없으면 commit 실패 — 이미 커밋된 상태에서 비트만 하려는 경우
  const status = runStdout('git status --porcelain');
  if (!status) {
    log('(변경 사항 없음 — 커밋 스킵)');
  } else {
    die('git commit 실패');
  }
}

// tag
if (!NO_TAG) {
  try {
    run(`git tag -a ${newTag} -m "Release ${newTag}"`);
    log('✓ 태그 생성: ' + newTag);
  } catch (e) { die('git tag 실패: ' + e.message); }
}

// push
if (!NO_PUSH) {
  try {
    run('git push origin main');
    if (!NO_TAG) run(`git push origin ${newTag}`);
    log('');
    log('═══════════════════════════════════════════════════════════════════');
    log(`✓ 배포 완료 ${newTag}`);
    log('  · GitHub Pages: 자동 재배포 (2~3분)');
    log('  · PC 빌드: Actions 페이지에서 진행 (5~15분)');
    log('  · Releases : https://github.com/toy80318-sys/destination_E/releases');
    log('═══════════════════════════════════════════════════════════════════');
  } catch (e) { die('git push 실패: ' + e.message); }
} else {
  log('(--no-push → 로컬에만 적용, 푸시는 직접 git push origin main + ' + newTag + ')');
}
