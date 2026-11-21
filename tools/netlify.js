/* Builds dist/ for a manual Netlify drag-and-drop deploy: only the files the site serves,
   with no node_modules, sources or Docker/nginx config. Run via `npm run netlify`. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const skip = new Set(['main.css', 'tailwind.src.css']); // build sources, not loaded by the pages

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

for (const f of fs.readdirSync(root)) {
  if (/\.html$/.test(f) || f === 'robots.txt' || f === 'sitemap.xml') fs.copyFileSync(path.join(root, f), path.join(dist, f));
}
fs.cpSync(path.join(root, 'assets'), path.join(dist, 'assets'), {
  recursive: true,
  filter: (src) => !skip.has(path.basename(src)),
});

fs.writeFileSync(path.join(dist, '_redirects'), [
  '/index.html / 301!',
  ...['abstract', 'committee', 'registration', 'track'].map(page => `/${page}.html /${page} 301!`),
  '',
].join('\n'));

// same caching rules as nginx.conf
fs.writeFileSync(path.join(dist, '_headers'), [
  '/*', '  Cache-Control: no-cache', '',
  '/assets/*', '  Cache-Control: public, max-age=3600', '',
  '/assets/styles/*', '  Cache-Control: no-cache', '',
  '/assets/js/*', '  Cache-Control: no-cache', '',
].join('\n'));

console.log('dist/ ready - drag the dist folder onto Netlify');
