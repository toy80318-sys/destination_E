#!/usr/bin/env node
// 앱 아이콘 변환: img/icons/icon-512.png → build/icon.ico + build/icon.icns
// 실행: node scripts/gen-app-icons.js
const fs = require('fs');
const path = require('path');
const png2icons = require('png2icons');

const SRC = path.join(__dirname, '..', 'img', 'icons', 'icon-512.png');
const OUT_DIR = path.join(__dirname, '..', 'build');

if (!fs.existsSync(SRC)) {
  console.error('[icons] 원본 누락:', SRC);
  process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const input = fs.readFileSync(SRC);

// Windows .ico (다해상도: 16, 24, 32, 48, 64, 128, 256)
const ico = png2icons.createICO(input, png2icons.BILINEAR, 0, false);
if (ico) {
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico);
  console.log('[icons] build/icon.ico 생성 (' + ico.length + ' bytes)');
} else {
  console.error('[icons] .ico 변환 실패');
}

// Mac .icns
const icns = png2icons.createICNS(input, png2icons.BILINEAR, 0);
if (icns) {
  fs.writeFileSync(path.join(OUT_DIR, 'icon.icns'), icns);
  console.log('[icons] build/icon.icns 생성 (' + icns.length + ' bytes)');
} else {
  console.error('[icons] .icns 변환 실패');
}

// Linux는 PNG 그대로 사용 (electron-builder가 자동 처리)
fs.copyFileSync(SRC, path.join(OUT_DIR, 'icon.png'));
console.log('[icons] build/icon.png 복사 완료');

console.log('[icons] 완료. package.json의 build.*.icon 경로를 build/icon.* 로 갱신하세요.');
