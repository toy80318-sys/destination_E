// Resize bg JPGs to 1280x720 with mozjpeg quality 85 (good size/quality balance for backgrounds)
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = 'img/bg';
const TARGET_W = 1280, TARGET_H = 720;

(async () => {
  const files = fs.readdirSync(DIR).filter(f => /\.jpg$/i.test(f));
  let totalBefore = 0, totalAfter = 0, count = 0;
  for (const f of files) {
    const p = path.join(DIR, f);
    const before = fs.statSync(p).size;
    totalBefore += before;
    try {
      const buf = await sharp(p)
        .resize(TARGET_W, TARGET_H, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true, progressive: true })
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
  console.log(`${DIR}: resized=${count} before=${mb(totalBefore)}MB after=${mb(totalAfter)}MB saved=${mb(totalBefore - totalAfter)}MB`);
})();
