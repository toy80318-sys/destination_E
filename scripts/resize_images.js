// Resize images to recommended sizes from img/IMAGE_GUIDE.md
// Keeps aspect ratio, fits inside target box. Re-encodes PNG with compression.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TARGETS = {
  'img/bg':          { w: 1280, h: 720 },
  'img/ships':       { w: 400,  h: 300 },
  'img/planets':     { w: 400,  h: 400 },
  'img/chars':       { w: 200,  h: 300 },
  'img/crew':        { w: 200,  h: 300 },
  'img/parts':       { w: 200,  h: 200 },
  'img/commodities': { w: 150,  h: 150 },
};

const dir = process.argv[2];
if (!TARGETS[dir]) {
  console.error('Unknown dir:', dir, 'Expected one of:', Object.keys(TARGETS).join(', '));
  process.exit(1);
}
const target = TARGETS[dir];

(async () => {
  if (!fs.existsSync(dir)) {
    console.log('Dir not found, skipping:', dir);
    return;
  }
  const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  let totalBefore = 0, totalAfter = 0, count = 0, skipped = 0;
  for (const f of files) {
    const p = path.join(dir, f);
    const before = fs.statSync(p).size;
    totalBefore += before;
    try {
      const m = await sharp(p).metadata();
      // Skip if already within target bounds
      if (m.width <= target.w && m.height <= target.h) {
        skipped++;
        totalAfter += before;
        continue;
      }
      const buf = await sharp(p)
        .resize(target.w, target.h, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
        .toBuffer();
      fs.writeFileSync(p, buf);
      const after = fs.statSync(p).size;
      totalAfter += after;
      count++;
    } catch (e) {
      console.log(`ERR ${p}: ${e.message}`);
      totalAfter += before;
    }
  }
  const mb = b => (b / 1024 / 1024).toFixed(2);
  console.log(`${dir}: resized=${count} skipped=${skipped} before=${mb(totalBefore)}MB after=${mb(totalAfter)}MB saved=${mb(totalBefore - totalAfter)}MB`);
})();
