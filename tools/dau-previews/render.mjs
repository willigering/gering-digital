// Rendert die DAU-TO-PRO-Vorschaubilder lokal (nicht auf dem Webserver):
//   node tools/dau-previews/render.mjs            -> alle Motive
//   node tools/dau-previews/render.mjs osi-modell -> nur ein Motiv
// Ergebnis: assets/dau-previews/<id>.webp (1280×720) und <id>-640.webp (640×360)
// sowie die SVG-Quelle in tools/dau-previews/svg/<id>.svg.
// Benötigt nur Node und Playwright/Chromium auf dem Entwicklungsrechner.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { motifs, svgFor, W, H } from './motifs.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../assets/dau-previews');
const svgDir = join(here, 'svg');
mkdirSync(out, { recursive: true });
mkdirSync(svgDir, { recursive: true });

const only = process.argv.slice(2);
const selected = only.length ? motifs.filter(m => only.includes(m.id)) : motifs;
if (!selected.length) { console.error('Unbekanntes Motiv:', only.join(', ')); process.exit(1); }

const browser = await chromium.launch(process.env.DTP_CHROMIUM_PATH ? { executablePath: process.env.DTP_CHROMIUM_PATH, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process'] } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><body style="margin:0;background:#000"></body>');
for (const motif of selected) {
  const svg = svgFor(motif);
  writeFileSync(join(svgDir, motif.id + '.svg'), svg);
  const result = await page.evaluate(async ({ svg, W, H }) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    const encode = (w, h, q) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/webp', q);
    };
    return { large: encode(W, H, .86), small: encode(W / 2, H / 2, .84) };
  }, { svg, W, H });
  for (const [suffix, data] of [['', result.large], ['-640', result.small]]) {
    if (!data.startsWith('data:image/webp;base64,')) throw new Error('WebP-Export nicht unterstützt');
    const file = join(out, motif.id + suffix + '.webp');
    writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log('✓', motif.id);
}
await browser.close();

