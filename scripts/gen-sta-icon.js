// ──────────────────────────────────────────────────────────────────────
// img/ui/STA01.png (1024×1024 원본) → img/ui/STA01_icon.png (128×128 최적화)
//   · 은하지도 보유(총독) 행성 아이콘용. 원본은 컷신 등 다른 용도로 유지.
//   · 박스(평균) 다운스케일 — pngjs 순수 JS (sharp 미설치 환경 대응).
//   · 사용자 요청 2026-06-16
// 실행: node scripts/gen-sta-icon.js
// ──────────────────────────────────────────────────────────────────────
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const SRC = path.join('img', 'ui', 'STA01.png');
const DST = path.join('img', 'ui', 'STA01_icon.png');
const SIZE = 128;

const src = PNG.sync.read(fs.readFileSync(SRC));
const out = new PNG({ width: SIZE, height: SIZE });
const fx = src.width / SIZE, fy = src.height / SIZE;

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
    const y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
    // 투명 가장자리 번짐 방지 위해 알파 가중 평균(프리멀티플)
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const i = (src.width * sy + sx) << 2;
        const al = src.data[i + 3];
        r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al;
        a += al; n++;
      }
    }
    const o = (SIZE * y + x) << 2;
    out.data[o]     = a > 0 ? Math.round(r / a) : 0;
    out.data[o + 1] = a > 0 ? Math.round(g / a) : 0;
    out.data[o + 2] = a > 0 ? Math.round(b / a) : 0;
    out.data[o + 3] = Math.round(a / n);
  }
}

fs.writeFileSync(DST, PNG.sync.write(out, { colorType: 6, deflateLevel: 9 }));
const sz = fs.statSync(DST).size;
console.log(`[gen-sta-icon] ${SRC} (${src.width}x${src.height}) -> ${DST} (${SIZE}x${SIZE}, ${(sz/1024).toFixed(1)}KB)`);
