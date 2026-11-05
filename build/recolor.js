// Fait passer la palette vert/menthe d'origine sur le bleu ciel du logo Lumière.
// Toute teinte entre 140° et 195° est tournée à 214°, saturation plafonnée.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const HUE = 214, SAT_CAP = 0.62;

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb(h, s, l) {
  h /= 360;
  const f = (p, q, t) => { if (t < 0) t++; if (t > 1) t--; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if (s === 0) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(v => Math.round(v * 255));
}
function map(r, g, b) {
  const [h, s, l] = rgb2hsl(r, g, b);
  if (s < 0.02 || h < 140 || h > 195) return null;
  return hsl2rgb(HUE, Math.min(s, SAT_CAP), l);
}
const hx = n => n.toString(16).padStart(2, '0');
let count = 0;
function recolor(src) {
  src = src.replace(/(^|[^\w&-])(#)([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])/g, (all, pre, h, v, off, str) => {
    const before = str.slice(Math.max(0, off - 6), off + pre.length);
    if (/(href|id|url)=?["']?$/i.test(before) || /href=["']$/.test(str.slice(off - 5, off + 1))) return all;
    let r, g, b, a = '';
    if (v.length === 3) { [r, g, b] = [...v].map(c => parseInt(c + c, 16)); }
    else { r = parseInt(v.slice(0, 2), 16); g = parseInt(v.slice(2, 4), 16); b = parseInt(v.slice(4, 6), 16); a = v.slice(6); }
    const m = map(r, g, b); if (!m) return all;
    count++;
    const out = m.map(hx).join('') + a;
    return pre + h + (v === v.toUpperCase() ? out.toUpperCase() : out);
  });
  src = src.replace(/rgb(a?)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*,[^)]*)?\)/g, (all, A, r, g, b, rest) => {
    const m = map(+r, +g, +b); if (!m) return all;
    count++;
    const sep = all.includes(', ') ? ', ' : ',';
    return `rgb${A}(${m.join(sep)}${rest || ''})`;
  });
  return src;
}
const files = ['index.html', ...fs.readdirSync(path.join(ROOT, 'assets'))
  .filter(f => /\.(mjs|css|svg)$|téléchargement$/.test(f)).map(f => 'assets/' + f)];
for (const f of files) {
  const p = path.join(ROOT, f), before = count;
  let s = fs.readFileSync(p, 'utf8');
  if (f === 'index.html') s = s.replace(/https:\/\/hyperliquid\.xyz\/assets\/sites\/6ktsPtDJItiO79yHbVKS9m\//g, './assets/');
  s = recolor(s);
  fs.writeFileSync(p, s);
  if (count > before) console.log(f, count - before);
}
