/* Cache-busting: appends ?v=<hash of the file's contents> to every local CSS/JS reference in the
   pages. The hash only changes when the file does, so a new deploy gets a new URL and neither
   browsers nor Cloudflare can serve the old file. Run `npm run stamp` before every deploy. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const ref = /((?:src|href)=")(assets\/(?:styles|js)\/[\w.-]+\.(?:css|js))(?:\?v=[0-9a-f]+)?(")/g;

let changed = 0;
for (const page of pages) {
  const file = path.join(root, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(ref, (m, a, asset, q) => {
    const bytes = fs.readFileSync(path.join(root, asset));
    const v = crypto.createHash('md5').update(bytes).digest('hex').slice(0, 8);
    return `${a}${asset}?v=${v}${q}`;
  });
  if (after !== before) { fs.writeFileSync(file, after); changed++; console.log('stamped', page); }
}
console.log(changed ? `${changed} page(s) updated` : 'already up to date');
