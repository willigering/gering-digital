'use strict';
// Rüdiger: läuft jede Strecke nur mit „rechts“ ab und prüft, dass man nirgends länger als eine halbe Sekunde an einer Wand hängt,
// dass es obere Etagen gibt und dass Itemboxen nicht gehäuft stehen.
//   php -S localhost:8788 -t .   dann   node tests/speed_flow_browser.cjs   (Playwright über NODE_PATH, PW_CHANNEL=chrome)
const assert = require('node:assert');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  try {
    const page = await browser.newPage();
    page.on('pageerror', e => { throw e; });
    await page.goto((process.env.SPEED_URL || 'http://localhost:8788') + '/speed/');
    await page.waitForFunction(() => window.__hj);
    const res = await page.evaluate(() => {
      const hj = window.__hj, T = 32, out = [];
      for (const i of hj.PLAY) {
        hj.load(i);
        const g = hj.map.g, W = hj.map.W, me = hj.me, stops = [];
        let stuck = 0, steps = 0, lastX = me.x;
        while (me.x < (W - 30) * T && steps < 400000) {
          hj.step(1, { r: true, l: false, down: false, jump: false, boost: false, hook: false });
          steps++;
          if (me.x - lastX < 0.01) { if (me.stun <= 0 && ++stuck === 60) { stops.push({ x: Math.floor(me.x / T), y: Math.floor(me.y / T), ahead: [1, 2, 3].map(k => g[Math.floor(me.y / T) - k][Math.floor(me.x / T) + 1]).join('') }); me.x += 3 * T; me.y -= 4 * T; stuck = 0; } }
          else stuck = 0;
          lastX = me.x;
        }
        let deckCols = 0, boxes = 0, minGap = 1e9, last = -1e9, stack = 0;
        for (let x = 0; x < W; x++) { let d = false, n = 0; for (let y = 1; y < 26; y++) { if (g[y][x] === '=') d = true; if (g[y][x] === '?') n++; } if (d) deckCols++; if (n) { boxes++; minGap = Math.min(minGap, x - last); last = x; if (n > 1) stack++; } }
        out.push({ map: i, W, sekunden: +(steps / 120).toFixed(1), stops, etagenAnteil: +(deckCols / W).toFixed(2), boxen: boxes, boxenJe100: +(boxes / W * 100).toFixed(1), kleinsterAbstand: minGap, stapel: stack });
      }
      return out;
    });
    for (const r of res) console.log(JSON.stringify(r));
    for (const r of res) {
      assert.deepStrictEqual(r.stops, [], 'Strecke ' + r.map + ': Lauf bleibt an einer Wand hängen');
      assert.ok(r.etagenAnteil >= 0.18, 'Strecke ' + r.map + ': zu wenig obere Etagen');
      assert.ok(r.stapel === 0 && r.kleinsterAbstand >= 26, 'Strecke ' + r.map + ': Itemboxen stehen gehäuft');
    }
    console.log('RUEDIGER FLOW OK');
  } finally { await browser.close(); }
})().catch(e => { console.error('RUEDIGER FLOW FEHLGESCHLAGEN:', e.message); process.exit(1); });
