#!/usr/bin/env node
// PNG 리사이즈 (pngjs + bilinear) — img/icons/icon.png(1024) → 192/512/maskable
// 사용자 요청 2026-06-09: 신버전 icon.png 알파 채널 유지하며 PWA 아이콘 갱신
// 실행: node scripts/resize-icon.js
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ICON_DIR = path.join(__dirname, '..', 'img', 'icons');
const SRC = path.join(ICON_DIR, 'icon.png');

if (!fs.existsSync(SRC)) {
  console.error('[resize] 원본 누락:', SRC);
  process.exit(1);
}

const targets = [
  { out: 'icon-192.png', size: 192, maskable: false },
  { out: 'icon-512.png', size: 512, maskable: false },
  { out: 'icon-maskable-512.png', size: 512, maskable: true },
];

// Bilinear 리사이즈 — RGBA 4채널 보존
function resizeBilinear(srcPng, dstW, dstH) {
  const srcW = srcPng.width, srcH = srcPng.height;
  const src = srcPng.data;
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = (srcW - 1) / dstW;
  const yRatio = (srcH - 1) / dstH;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const gx = x * xRatio;
      const gy = y * yRatio;
      const gxi = Math.floor(gx);
      const gyi = Math.floor(gy);
      const dx = gx - gxi;
      const dy = gy - gyi;

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

  const png = new PNG({ width: dstW, height: dstH });
  png.data = dst;
  return png;
}

// Maskable: 안전 영역 80%에 그리고 가장자리 투명 여백 확보
function applyMaskablePadding(srcPng) {
  const w = srcPng.width, h = srcPng.height;
  const pad = Math.round(w * 0.10); // 10% padding (PWA spec safe zone)
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const resized = resizeBilinear(srcPng, innerW, innerH);
  const out = new PNG({ width: w, height: h });
  out.data.fill(0); // 투명 배경
  for (let y = 0; y < innerH; y++) {
    for (let x = 0; x < innerW; x++) {
      const sIdx = (y * innerW + x) * 4;
      const dIdx = ((y + pad) * w + (x + pad)) * 4;
      out.data[dIdx] = resized.data[sIdx];
      out.data[dIdx + 1] = resized.data[sIdx + 1];
      out.data[dIdx + 2] = resized.data[sIdx + 2];
      out.data[dIdx + 3] = resized.data[sIdx + 3];
    }
  }
  return out;
}

(async () => {
  const srcBuf = fs.readFileSync(SRC);
  const srcPng = PNG.sync.read(srcBuf);
  console.log('[resize] 원본:', srcPng.width + '×' + srcPng.height,
              '(' + (srcBuf.length / 1024).toFixed(1) + ' KB)');

  for (const t of targets) {
    const resized = resizeBilinear(srcPng, t.size, t.size);
    let final = resized;
    if (t.maskable) {
      // Maskable: 1024 → 512 maskable 패딩 적용 (원본에서 직접 패딩)
      final = applyMaskablePadding(resizeBilinear(srcPng, t.size, t.size));
    }
    const outBuf = PNG.sync.write(final);
    const outPath = path.join(ICON_DIR, t.out);
    fs.writeFileSync(outPath, outBuf);
    console.log('[resize] ✓', t.out, '(' + t.size + '×' + t.size,
                (t.maskable ? '· maskable safe-zone' : '') + ', ' + (outBuf.length / 1024).toFixed(1) + ' KB)');
  }

  console.log('\n[resize] 완료. PWA manifest 의 icon-192/icon-512 자동 갱신됨.');
})();
