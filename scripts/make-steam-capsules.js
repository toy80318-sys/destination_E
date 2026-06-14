#!/usr/bin/env node
// Higgsfield로 생성한 가로/세로 키아트(PNG) → 스팀 캡슐 전 규격으로 크롭+리사이즈
//   입력: steam/store_assets_hf/_wide_raw.png (16:9), _vert_raw.png (3:4)
//   출력: steam/store_assets_hf/ 에 스팀 규격 파일들
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const DIR = path.join(__dirname, '..', 'steam', 'store_assets_hf');
const WIDE = path.join(DIR, '_wide_raw.png');
const VERT = path.join(DIR, '_vert_raw.png');

function load(p) { return PNG.sync.read(fs.readFileSync(p)); }

// 중앙 기준 cover 크롭 후 목표 크기로 bilinear 리사이즈
function coverResize(src, dw, dh) {
  const sw = src.width, sh = src.height;
  const s = Math.max(dw / sw, dh / sh);
  const cw = Math.round(dw / s), ch = Math.round(dh / s);
  const ox = Math.round((sw - cw) / 2), oy = Math.round((sh - ch) / 2);
  const out = new PNG({ width: dw, height: dh });
  const xR = cw / dw, yR = ch / dh;
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const gx = ox + x * xR, gy = oy + y * yR;
      const x0 = Math.floor(gx), y0 = Math.floor(gy);
      const dx = gx - x0, dy = gy - y0;
      for (let c = 0; c < 4; c++) {
        const p = (xi, yi) => src.data[((Math.min(Math.max(yi,0),sh-1) * sw) + Math.min(Math.max(xi,0),sw-1)) * 4 + c];
        const v = p(x0,y0)*(1-dx)*(1-dy) + p(x0+1,y0)*dx*(1-dy) + p(x0,y0+1)*(1-dx)*dy + p(x0+1,y0+1)*dx*dy;
        out.data[((y * dw) + x) * 4 + c] = Math.round(v);
      }
    }
  }
  return out;
}

function save(png, name) {
  fs.writeFileSync(path.join(DIR, name), PNG.sync.write(png));
  console.log('[ok]', name, png.width + 'x' + png.height);
}

if (!fs.existsSync(WIDE) || !fs.existsSync(VERT)) {
  console.error('[FAIL] _wide_raw.png / _vert_raw.png 가 없습니다. download-steam-art.bat 을 먼저 실행하세요.');
  process.exit(1);
}
const wide = load(WIDE);
const vert = load(VERT);

// 가로 키아트 기반
save(coverResize(wide, 1232, 706), 'main_capsule_1232x706.png');
save(coverResize(wide, 920, 430),  'header_capsule_920x430.png');
save(coverResize(wide, 920, 430),  'library_header_920x430.png');
save(coverResize(wide, 462, 174),  'small_capsule_462x174.png');
save(coverResize(wide, 1920, 620), 'library_hero_1920x620.png');
// 세로 키아트 기반
save(coverResize(vert, 748, 896),  'vertical_capsule_748x896.png');
save(coverResize(vert, 600, 900),  'library_capsule_600x900.png');
console.log('완료 — 스팀 캡슐 7종 생성');
