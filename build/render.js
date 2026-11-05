// Rend la maquette de l'app (remplace la capture de la plateforme d'origine) et l'image Open Graph.
const path = require('path'), fs = require('fs');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const ROOT = path.join(__dirname, '..');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const pg = await b.newPage();
  // Maquette : 1512x732 css @2x = 3024x1464, comme l'image d'origine
  await pg.setViewport({ width: 1512, height: 732, deviceScaleFactor: 2 });
  await pg.goto('file:///' + path.join(__dirname, 'mock.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  const full = path.join(__dirname, 'mock-3024.png');
  await pg.screenshot({ path: full });
  await pg.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await pg.goto('file:///' + path.join(__dirname, 'og.html').replace(/\\/g, '/'), { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(ROOT, 'assets/lumiere-og.png') });
  await b.close();
  console.log('ok');
})();
