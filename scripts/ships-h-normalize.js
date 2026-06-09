#!/usr/bin/env node
// img/ships/H/ 폴더 함선 이미지 표준화
// 사용자 요청 2026-06-09:
//   1. 새롭게 업데이트한 함선들 (H/ 폴더 기존 25개) 사이즈 일정하게 (2048 → 1024)
//   2. 교체되지 않은 함선 (원본 ships/ 에만 있는 44개) 도 H/ 폴더로 1024 표준화 복사
//
// 결과: img/ships/H/ 폴더에 모든 함선 1024×1024 RGBA 통일.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SRC_DIR = 'img/ships';
const DST_DIR = 'img/ships/H';
const TARGET = 1024;

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
        const tl = src[(gyi * srcW + gxi) * 4 + c];
        const tr = src[(gyi * srcW + (gxi + 1)) * 4 + c];
        const bl = src[((gyi + 1) * srcW + gxi) * 4 + c];
        const br = src[((gyi + 1) * srcW + (gxi + 1)) * 4 + c];
        const top = tl * (1 - dx) + tr * dx;
        const bot = bl * (1 - dx) + br * dx;
        dst[(y * dstW + x) * 4 + c] = Math.round(top * (1 - dy) + bot * dy);
      }
    }
  }
  const out = new PNG({ width: dstW, height: dstH });
  out.data = dst;
  return out;
}

// 패딩: 작은 정사각형이 아닌 이미지(예: 400×281)는 정사각 캔버스에 중앙 배치
function fitToSquare(srcPng, target) {
  if (srcPng.width === srcPng.height) return resizeBilinear(srcPng, target, target);
  // 비율 보존 후 중앙 패딩 (투명)
  const ratio = Math.min(target / srcPng.width, target / srcPng.height);
  const newW = Math.round(srcPng.width * ratio);
  const newH = Math.round(srcPng.height * ratio);
  const resized = resizeBilinear(srcPng, newW, newH);
  const canvas = new PNG({ width: target, height: target });
  canvas.data.fill(0);
  const offX = Math.floor((target - newW) / 2);
  const offY = Math.floor((target - newH) / 2);
  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const s = (y * newW + x) * 4;
      const d = ((y + offY) * target + (x + offX)) * 4;
      canvas.data[d] = resized.data[s];
      canvas.data[d + 1] = resized.data[s + 1];
      canvas.data[d + 2] = resized.data[s + 2];
      canvas.data[d + 3] = resized.data[s + 3];
    }
  }
  return canvas;
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.png'));
console.log('[ships-h] 대상 파일:', files.length);
console.log('[ships-h] 목표 사이즈:', TARGET + '×' + TARGET);

let processed = 0, errors = 0, skipped = 0;
const stats = { resize: 0, upscale: 0, copyAlready: 0 };

files.forEach((f, idx) => {
  const src = path.join(SRC_DIR, f);
  const dst = path.join(DST_DIR, f);
  try {
    const buf = fs.readFileSync(src);
    const pngIn = PNG.sync.read(buf);
    let action;
    if (pngIn.width === TARGET && pngIn.height === TARGET) {
      // 이미 정확한 사이즈 — 그대로 복사
      fs.writeFileSync(dst, buf);
      action = 'asis';
      stats.copyAlready++;
    } else {
      const pngOut = fitToSquare(pngIn, TARGET);
      const outBuf = PNG.sync.write(pngOut);
      fs.writeFileSync(dst, outBuf);
      if (pngIn.width > TARGET) {
        action = 'down';
        stats.resize++;
      } else {
        action = 'up';
        stats.upscale++;
      }
    }
    processed++;
    if (processed % 10 === 0 || idx === files.length - 1) {
      console.log('[ships-h] ' + (processed) + '/' + files.length + ' (' + f + ' ' + action + ')');
    }
  } catch (e) {
    errors++;
    console.error('  ✗', f, e.message);
  }
});

console.log('\n[ships-h] 완료');
console.log('  처리:', processed, '/', files.length);
console.log('  다운스케일 (2048→1024):', stats.resize);
console.log('  업스케일 (400→1024 보간):', stats.upscale);
console.log('  사이즈 일치 (그대로 복사):', stats.copyAlready);
console.log('  실패:', errors);
