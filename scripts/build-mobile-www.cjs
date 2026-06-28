#!/usr/bin/env node
// 모바일(Capacitor) webDir 조립 — 런타임 웹 자산을 mobile-www/ 로 복사.
//   Electron build.files 와 같은 "포함 목록" 기반. Capacitor 는 webDir 전체를 네이티브
//   앱에 번들하므로, node_modules/.git/dist/01_GDD 등은 절대 포함하지 않는다.
//   사용: node scripts/build-mobile-www.cjs   (= npm run mobile:www)
//   ⚠ img/(655M)+02_Assets/audio(229M) 대용량 → 출시 전 압축/Play Asset Delivery 필요(가이드 참고).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'mobile-www');

// 포함할 런타임 자산(파일/디렉터리). ⚠ 이미지(img·02_Assets/img)는 제외 —
//   optimize-mobile-assets.cjs 가 리사이즈·압축해서 mobile-www 로 출력(중복 복사 방지).
const INCLUDE = [
  'index.html', 'privacy.html', '404.html',
  'game.js', 'game.css', 'game-holo-theme.css',
  'i18n', 'js', '02_Assets/audio',
];
const INCLUDE_EXTRA = [];
// 복사 제외 확장자/이름(용량·불필요)
const SKIP = new Set(['.map', '.txt', '.md', '.DS_Store', 'Thumbs.db']);

let nFiles = 0, nBytes = 0;
function copyRec(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copyRec(path.join(src, f), path.join(dst, f));
  } else {
    const ext = path.extname(src).toLowerCase();
    if (SKIP.has(ext) || SKIP.has(path.basename(src))) return;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    nFiles++; nBytes += st.size;
  }
}

// 초기화
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const rel of INCLUDE.concat(INCLUDE_EXTRA)) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) { console.warn('  (없음, 건너뜀) ' + rel); continue; }
  copyRec(src, path.join(OUT, rel));
}

console.log('mobile-www 조립 완료: ' + nFiles + ' files, ' + (nBytes / 1048576).toFixed(1) + ' MB');
console.log('다음: npx cap sync android  (또는 npx cap add android 최초 1회)');
if (nBytes > 150 * 1048576) {
  console.warn('⚠ 번들 ' + (nBytes / 1048576).toFixed(0) + 'MB — 플레이스토어 AAB 권장(<150MB) 초과. 에셋 압축/Play Asset Delivery 필요.');
}
