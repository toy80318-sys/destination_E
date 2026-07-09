#!/usr/bin/env node
// 음성 클립 음량 측정/정상화 (ffmpeg-static · volumedetect 기반)
//   측정: node scripts/audio-loudness.cjs measure <폴더...>
//   정상화: node scripts/audio-loudness.cjs normalize <폴더...> --target=-20 [--tol=3] [--apply]
//     · mean_volume 이 target±tol(dB) 벗어난 클립만 gain 보정(음질 보존 — 단순 볼륨, 다이나믹 무가공)
//     · --apply 없으면 드라이런(대상 목록만 출력). 피크 클리핑 방지: max_volume+gain > -0.5dB 면 gain 캡.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const FF = require('ffmpeg-static');

const args = process.argv.slice(2);
const mode = args[0];
const dirs = args.filter(a => !a.startsWith('--') && a !== mode);
const target = parseFloat((args.find(a => a.startsWith('--target=')) || '--target=-20').split('=')[1]);
const tol = parseFloat((args.find(a => a.startsWith('--tol=')) || '--tol=3').split('=')[1]);
const apply = args.includes('--apply');

const { spawnSync } = require('child_process');
function measure(f) {
  // ffmpeg 는 volumedetect 통계를 성공 시에도 stderr 로 출력한다.
  const r = spawnSync(FF, ['-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = String(r.stderr || '');
  const mean = parseFloat((s.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
  const max = parseFloat((s.match(/max_volume:\s*(-?[\d.]+)/) || [])[1]);
  return { mean, max };
}

let files = [];
for (const d of dirs) {
  if (!fs.existsSync(d)) { console.warn('(없음) ' + d); continue; }
  files = files.concat(fs.readdirSync(d).filter(f => /\.mp3$/i.test(f)).map(f => path.join(d, f)));
}
if (!files.length) { console.log('mp3 없음'); process.exit(0); }

const rows = [];
for (const f of files) {
  const { mean, max } = measure(f);
  rows.push({ f, mean, max });
}
rows.sort((a, b) => a.mean - b.mean);

if (mode === 'measure') {
  const means = rows.map(r => r.mean).filter(v => !isNaN(v));
  const med = means[Math.floor(means.length / 2)];
  console.log('클립 ' + rows.length + '개 · mean_volume 중앙값 ' + med.toFixed(1) + 'dB · 범위 ' + means[0].toFixed(1) + ' ~ ' + means[means.length - 1].toFixed(1) + 'dB');
  console.log('--- 조용한 순 상위 15 ---');
  rows.slice(0, 15).forEach(r => console.log('  ' + r.mean.toFixed(1) + 'dB (max ' + r.max.toFixed(1) + ') ' + path.basename(r.f)));
  console.log('--- 큰 순 상위 8 ---');
  rows.slice(-8).forEach(r => console.log('  ' + r.mean.toFixed(1) + 'dB (max ' + r.max.toFixed(1) + ') ' + path.basename(r.f)));
  process.exit(0);
}

if (mode === 'normalize') {
  const out = rows.filter(r => !isNaN(r.mean) && Math.abs(r.mean - target) > tol);
  console.log('대상(target ' + target + '±' + tol + 'dB 이탈): ' + out.length + '/' + rows.length + (apply ? ' — 적용' : ' — 드라이런(--apply 필요)'));
  let done = 0;
  for (const r of out) {
    let gain = target - r.mean;
    if (r.max + gain > -0.5) gain = -0.5 - r.max;   // 클리핑 방지 캡
    if (Math.abs(gain) < 0.5) { console.log('  (스킵 gain<0.5) ' + path.basename(r.f)); continue; }
    console.log('  ' + r.mean.toFixed(1) + 'dB → gain ' + (gain > 0 ? '+' : '') + gain.toFixed(1) + 'dB  ' + path.basename(r.f));
    if (!apply) continue;
    const tmp = r.f + '.norm.mp3';
    try {
      execFileSync(FF, ['-y', '-i', r.f, '-af', 'volume=' + gain.toFixed(2) + 'dB', '-b:a', '128k', '-ar', '44100', tmp], { stdio: 'ignore' });
      fs.renameSync(tmp, r.f); done++;
    } catch (e) { try { fs.unlinkSync(tmp); } catch (_) {} console.warn('  실패: ' + r.f); }
  }
  if (apply) console.log('정상화 완료: ' + done + '개');
}
