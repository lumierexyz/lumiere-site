// Rapatrie les chunks .mjs du bundle Framer (imports relatifs récursifs).
const fs = require('fs'), path = require('path');
const BASE = 'https://hyperliquid.xyz/assets/sites/6ktsPtDJItiO79yHbVKS9m/';
const DIR = path.join(__dirname, '..', 'assets');
const seen = new Set();
async function get(name) {
  if (seen.has(name)) return; seen.add(name);
  const file = path.join(DIR, name);
  let src;
  if (fs.existsSync(file)) src = fs.readFileSync(file, 'utf8');
  else {
    const r = await fetch(BASE + name);
    if (!r.ok) { console.log('FAIL', r.status, name); return; }
    src = await r.text(); fs.writeFileSync(file, src); console.log('got', name, src.length);
  }
  const re = /(?:from\s*|import\s*\(\s*|import\s*)["']\.\/([^"']+\.mjs)["']/g;
  let m; const deps = [];
  while ((m = re.exec(src))) deps.push(m[1]);
  for (const d of deps) await get(d);
}
(async () => {
  const html = fs.readFileSync(path.join(DIR, '..', 'index.html'), 'utf8');
  const names = new Set(['script_main.DNcLcCh8.mjs','PX9hIOIVM.CebETsE9.mjs']);
  for (const m of html.matchAll(/assets\/sites\/6ktsPtDJItiO79yHbVKS9m\/([^"']+\.mjs)/g)) names.add(m[1]);
  for (const n of names) await get(n);
})();
