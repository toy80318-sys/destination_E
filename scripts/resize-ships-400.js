#!/usr/bin/env node
// img/ships 의 Boss.png · S10.png 를 400×400 으로 정규화 (2026-06-11)
// 원본은 img_backup/ships_2048/ 에 백업. 실행: node scripts/resize-ships-400.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const SHIPS = path.join(ROOT, 'img', 'ships');
const BACKUP = path.join(ROOT, 'img_backup', 'ships_2048');
fs.mkdirSync(BACKUP, { recursive: true });

function resizeBilinear(srcPng, dstW, dstH) {
  const srcW = srcPng.width, srcH = srcPng.height;
  const src = srcPng.data;
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = (srcW - 1) / dstW;
  const yRatio = (srcH - 1) / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const gx = x * xRatio, gy = y * yRatio;
      const gxi = Math.floor(gx), gyi = Math.floor(gy);
      const dx = gx - gxi, dy = gy - gyi;
      for (let c = 0; c < 4; c++) {
        const i00 = ((gyi * srcW) + gxi) * 4 + c;
        const i10 = ((gyi * srcW) + Math.min(gxi + 1, srcW - 1)) * 4 + c;
        const i01 = ((Math.min(gyi + 1, srcH - 1) * srcW) + gxi) * 4 + c;
        const i11 = ((Math.min(gyi + 1, srcH - 1) * srcW) + Math.min(gxi + 1, srcW - 1)) * 4 + c;
        const v = src[i00] * (1 - dx) * (1 - dy) + src[i10] * dx * (1 - dy)
                + src[i01] * (1 - dx) * dy + src[i11] * dx * dy;
        dst[((y * dstW) + x) * 4 + c] = Math.round(v);
      }
    }
  }
  const out = new PNG({ width: dstW, height: dstH });
  dst.copy(out.data);
  return out;
}

const TARGETS = ['Boss.png', 'S10.png'];
let done = 0;
for (const f of TARGETS) {
  const p = path.join(SHIPS, f);
  if (!fs.existsSync(p)) { console.warn('[skip] 없음:', f); continue; }
  const png = PNG.sync.read(fs.readFileSync(p));
  if (png.width === 400 && png.height === 400) { console.log('[skip] 이미 400:', f); continue; }
  fs.copyFileSync(p, path.join(BACKUP, f));
  const out = resizeBilinear(png, 400, 400);
  fs.writeFileSync(p, PNG.sync.write(out));
  console.log('[ok]', f, png.width + 'x' + png.height, '→ 400x400');
  done++;
}
console.log('완료:', done, '개 변환');
