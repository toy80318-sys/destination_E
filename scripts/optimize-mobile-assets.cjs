#!/usr/bin/env node
// 모바일(Capacitor) 에셋 최적화 — 이미지 리사이즈+압축을 mobile-www/ 로 출력.
//   · 파일명·경로·확장자 유지(.png/.jpg) → 게임 코드 참조 무변경.
//   · PNG: 최대 1024px 캡 + 팔레트 양자화. JPG: 1024 캡 + mozjpeg.
//   · 원본(img/·02_Assets/img)은 그대로 — 데스크톱/웹/Steam 무영향.
//   · 오디오(mp3)는 ffmpeg 필요 → 별도 단계(가이드 §4). 여기선 이미지만.
//   사용: node scripts/optimize-mobile-assets.cjs  (= npm run mobile:assets 의 일부)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'mobile-www');
const MAXDIM = 1024;          // 최대 변(px) — 초과분만 축소
const PNG_Q = 80;             // 팔레트 양자화 품질(0~100)
const JPG_Q = 80;
const IMG_DIRS = ['img', '02_Assets/img'];   // 최적화 대상 이미지 루트

let nOpt = 0, nCopy = 0, orig = 0, out = 0, fail = 0;

async function proc(src, dst) {
  const ext = path.extname(src).toLowerCase();
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const o = fs.statSync(src).size;
  try {
    if (ext === '.png') {
      await sharp(src).resize({ width: MAXDIM, height: MAXDIM, fit: 'inside', withoutEnlargement: true })
        .png({ palette: true, quality: PNG_Q, effort: 5, compressionLevel: 9 }).toFile(dst);
    } else if (ext === '.jpg' || ext === '.jpeg') {
      await sharp(src).resize({ width: MAXDIM, height: MAXDIM, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPG_Q, mozjpeg: true }).toFile(dst);
    } else {
      fs.copyFileSync(src, dst); nCopy++; orig += o; out += o; return;
    }
    out += fs.statSync(dst).size; orig += o; nOpt++;
  } catch (e) {
    console.warn('  ⚠ 최적화 실패→원본 복사: ' + path.relative(ROOT, src) + ' (' + e.message + ')');
    try { fs.copyFileSync(src, dst); } catch (_) {}
    orig += o; out += o; fail++;
  }
}

async function walk(srcDir, dstDir) {
  for (const f of fs.readdirSync(srcDir)) {
    const s = path.join(srcDir, f), d = path.join(dstDir, f);
    if (fs.statSync(s).isDirectory()) await walk(s, d);
    else await proc(s, d);
  }
}

// ── 오디오(mp3) 재인코딩 — ffmpeg 있을 때만(빌드 머신). 없으면 원본 유지(가이드 §4). ──
const { spawnSync } = require('child_process');
function hasFfmpeg() { try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch (e) { return false; } }
function optimizeAudio() {
  const dir = path.join(OUT, '02_Assets/audio');
  if (!fs.existsSync(dir)) { console.log('  (오디오 폴더 없음 — build-mobile-www.cjs 먼저 실행)'); return; }
  if (!hasFfmpeg()) { console.warn('  ⚠ ffmpeg 미설치 — 오디오 재인코딩 건너뜀(원본 유지). 빌드 머신에서 ffmpeg 설치 후 npm run mobile:assets 재실행 권장.'); return; }
  let a = 0, ao = 0, an = 0;
  (function walkA(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) { walkA(p); continue; }
      if (!/\.mp3$/i.test(f)) continue;
      const o = fs.statSync(p).size, tmp = p + '.tmp.mp3';
      const r = spawnSync('ffmpeg', ['-y', '-i', p, '-b:a', '96k', '-ar', '44100', tmp], { stdio: 'ignore' });
      if (r.status === 0) { fs.renameSync(tmp, p); ao += o; an += fs.statSync(p).size; a++; }
      else { try { fs.unlinkSync(tmp); } catch (_) {} }
    }
  })(dir);
  console.log('  오디오 재인코딩(96k): ' + a + '개, ' + (ao / 1048576).toFixed(1) + 'MB → ' + (an / 1048576).toFixed(1) + 'MB');
}

(async () => {
  for (const dir of IMG_DIRS) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) { console.warn('  (없음, 건너뜀) ' + dir); continue; }
    await walk(src, path.join(OUT, dir));
  }
  const pct = orig ? (100 - out / orig * 100).toFixed(0) : 0;
  console.log('이미지 최적화 완료: 압축 ' + nOpt + (nCopy ? (' / 복사 ' + nCopy) : '') + (fail ? (' / 실패 ' + fail) : '') +
    ' — ' + (orig / 1048576).toFixed(1) + 'MB → ' + (out / 1048576).toFixed(1) + 'MB (' + pct + '%↓)');
  optimizeAudio();
})();
