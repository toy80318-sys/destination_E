#!/usr/bin/env node
// 앱 아이콘 변환: img/icons/icon.png(우선) 또는 icon-512.png → build/icon.ico + .icns + .png
// 사용자 요청 2026-06-09: 1024×1024 RGBA(알파 포함) icon.png 신버전 적용
// 실행: node scripts/gen-app-icons.js
const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

const ICON_DIR = path.join(__dirname, '..', 'img', 'icons');
const OUT_DIR = path.join(__dirname, '..', 'build');

// 우선순위: 고해상도 icon.png(1024) → icon-512.png 폴백
const candidates = ['icon.png', 'icon-512.png'];
let SRC = null;
for (const f of candidates) {
  const p = path.join(ICON_DIR, f);
  if (fs.existsSync(p)) { SRC = p; break; }
}

if (!SRC) {
  console.error('[icons] 원본 누락 — ' + candidates.map(f => path.join(ICON_DIR, f)).join(' / ') + ' 모두 없음');
  process.exit(1);
}
console.log('[icons] 원본 사용:', path.basename(SRC));

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const input = fs.readFileSync(SRC);
console.log('[icons] 원본 크기:', (input.length / 1024).toFixed(1) + ' KB');

// PNG 헤더에서 width/height/colorType 확인 (RGBA 알파 검증)
// IHDR: width(4) height(4) bitdepth(1) colortype(1)
//   colortype 2 = RGB, 6 = RGBA, 4 = GA, 3 = palette
try {
  const w = input.readUInt32BE(16);
  const h = input.readUInt32BE(20);
  const colorType = input.readUInt8(25);
  const hasAlpha = (colorType === 6 || colorType === 4);
  console.log('[icons] 해상도:', w + '×' + h, '· 색상타입:', colorType,
              '(' + (hasAlpha ? 'RGBA — 알파 포함 ✓' : 'RGB — 알파 없음') + ')');
  if (!hasAlpha) {
    console.warn('[icons] 경고: 알파 채널 없음 — 모서리가 사각형으로 보일 수 있음');
  }
} catch (e) {
  console.warn('[icons] PNG 헤더 분석 실패:', e.message);
}

// Windows .ico (다해상도: 16, 24, 32, 48, 64, 128, 256)
const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, false);
if (ico) {
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
  console.log('[icons] ✓ build/icon.ico   생성 (' + (ico.length / 1024).toFixed(1) + ' KB)');
} else {
  console.error('[icons] ✗ .ico 변환 실패');
}

// Mac .icns
const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (icns) {
  fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icns);
  console.log('[icons] ✓ build/icon.icns  생성 (' + (icns.length / 1024).toFixed(1) + ' KB)');
} else {
  console.error('[icons] ✗ .icns 변환 실패');
}

// Linux는 PNG 그대로 사용 (electron-builder가 자동 처리)
fs.copyFileSync(SRC, path.join(OUT_DIR, 'icon.png'));
console.log('[icons] ✓ build/icon.png   복사 (' + (input.length / 1024).toFixed(1) + ' KB)');

console.log('\n[icons] 완료. PC 빌드(npm run dist:win 등)에서 자동 사용됨.');
