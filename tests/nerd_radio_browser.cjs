'use strict';
// NERD RADIO: Bedienung, echte Audiodaten, Platzierung neben dem Modulstapel, Mobilansicht.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dtp-radio-'));
const env = { ...process.env, GD_ROOT: root, GD_DB_PATH: path.join(scratch, 'site.sqlite') };
const port = 22000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const shots = process.env.DTP_SCREENSHOT_DIR ? path.join(process.env.DTP_SCREENSHOT_DIR, 'nerd-radio') : '';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const php = code => {
  const r = spawnSync('php', ['-r', `require ${JSON.stringify(root + '/dau_lib.php')}; ${code}`], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
};
// Acht Module, damit auf dem Desktop der Modulstapel (ab vier Karten) aktiv ist.
php(`db()->exec("DELETE FROM html_pages"); $q=db()->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES(?,?,?,'lernen',1)");
foreach(['osi','subnetsprint','m3','m4','m5','m6','m7','m8'] as $i=>$s)$q->execute([$s,'Modul '.($i+1),'Beschreibung '.($i+1)]);`);

let server, browser;
(async () => {
  if (shots) fs.mkdirSync(shots, { recursive: true });
  server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root, path.join(__dirname, 'support/router.php')], { env, stdio: 'ignore' });
  // node:http statt fetch: robust, auch wenn der PHP-Server die Verbindung beim Start früh schließt.
  const ready = () => new Promise(resolve => {
    const req = http.get(base + '/dau-to-pro/', res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
  for (let n = 0; n < 60; n++) { if (await ready()) break; if (n === 59) throw Error('PHP preview server unavailable'); await pause(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox'] });
  const errors = [];

  /* ---------- Platzierung: Karten bleiben mittig, Gerät verdeckt nichts ---------- */
  const layout = page => page.evaluate(() => {
    const box = e => e.getBoundingClientRect();
    const device = box(document.querySelector('.nr-device'));
    const cards = [...document.querySelectorAll('#module-grid .module-card')].filter(c => !c.closest('.stack-row.is-behind') && c.getClientRects().length);
    const blocks = [...cards, ...document.querySelectorAll('.section-heading,.filterbar')].map(box);
    // Nur sichtbare Überdeckung zählt: Schnittfläche innerhalb des Viewports.
    const top = Math.max(0, device.top), bottom = Math.min(innerHeight, device.bottom);
    const hit = r => bottom > top && !(r.right <= device.left || r.left >= device.right || Math.min(r.bottom, innerHeight) <= top || Math.max(r.top, 0) >= bottom);
    const left = Math.min(...cards.map(c => box(c).left)), right = Math.max(...cards.map(c => box(c).right));
    return {
      players: document.querySelectorAll('[data-nerd-radio]').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardsCenter: (left + right) / 2, pageCenter: document.documentElement.clientWidth / 2, cardsRight: right,
      device: { left: device.left, right: device.right, top: device.top, bottom: device.bottom, width: device.width },
      overlaps: blocks.filter(hit).length, stacked: document.getElementById('module-grid').classList.contains('is-stacked'),
      gridBottom: box(document.getElementById('module-grid')).bottom, stageWidth: document.querySelector('.nr-stage').offsetWidth
    };
  });
  for (const [width, height, mobile] of [[2560, 1440], [1920, 1080], [1600, 900], [1440, 900], [1024, 768], [390, 844, true], [320, 568, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: !!mobile, hasTouch: !!mobile });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${width}: ${e.message}`));
    await page.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
    await page.evaluate(() => scrollTo(0, document.getElementById('lernmodule').offsetTop));
    await pause(250);
    const g = await layout(page);
    assert.equal(g.players, 1, `Genau ein Player bei ${width}`);
    assert.ok(g.overflow <= 0, `Kein horizontales Scrollen bei ${width}: ${g.overflow}`);
    assert.ok(Math.abs(g.cardsCenter - g.pageCenter) < 1.5, `Modulkarten bleiben mittig bei ${width}: ${g.cardsCenter} vs ${g.pageCenter}`);
    assert.equal(g.overlaps, 0, `Gerät verdeckt keine Module bei ${width}`);
    assert.ok(g.device.width >= Math.min(280, width - 40), `Gerät bleibt bedienbar groß bei ${width}: ${g.device.width}`);
    if (width >= 1860) {
      assert.ok(g.device.left >= g.cardsRight + 8, `Gerät steht rechts neben den Modulen bei ${width}`);
      assert.ok(g.stacked, 'Modulstapel bleibt aktiv');
    } else {
      assert.ok(g.stageWidth <= Math.min(640, width - 40) + 1, `Gerät passt in die Breite bei ${width}`);
    }
    // Den ganzen Modulbereich durchscrollen: zu keinem Zeitpunkt verdeckt das Gerät sichtbare Module.
    const end = await page.evaluate(() => { const s = document.querySelector('.nr-stage').getBoundingClientRect(); return scrollY + s.bottom; });
    for (let y = await page.evaluate(() => scrollY); y < end; y += 200) {
      await page.evaluate(v => scrollTo(0, v), y); await pause(width >= 1860 ? 350 : 120);
      const s = await layout(page);
      assert.equal(s.overlaps, 0, `Kein Überdecken beim Scrollen (${width}, y=${y})`);
      // Solange der Modulstapel im Bild ist, läuft das Gerät daneben mit.
      if (width >= 1860 && s.gridBottom > s.device.bottom + 40) assert.ok(s.device.top > 0 && s.device.bottom < height, `Gerät bleibt neben dem Stapel im Bild (${width}, y=${y})`);
    }
    if (shots) { await page.locator('.nr-stage').scrollIntoViewIfNeeded(); await pause(200); await page.screenshot({ path: path.join(shots, `layout-${width}.png`) }); }
    console.log(`${width}×${height}: Karten mittig, Gerät ${g.device.width.toFixed(0)} px, keine Überdeckung`);
    await context.close();
  }

  /* ---------- Bedienung und echte Audiodaten ---------- */
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`player: ${e.message}`));
  await page.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
  await page.evaluate(() => scrollTo(0, document.getElementById('lernmodule').offsetTop));
  const radio = () => page.evaluate(() => {
    const r = document.querySelector('[data-nerd-radio]').nerdRadio;
    return { state: r.state, track: r.track, volume: r.volume, voices: r.voices, contexts: r.contexts, level: r.level(),
      title: document.querySelector('[data-radio-title]').textContent, time: document.querySelector('[data-radio-elapsed]').textContent };
  });
  // Leuchtende Segmente im Display zählen (Türkis- und Goldtöne mit hoher Helligkeit).
  const lit = () => page.evaluate(() => {
    const c = document.querySelector('[data-radio-viz]'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && Math.max(d[i], d[i + 1], d[i + 2]) > 180) n++;
    return n;
  });
  // Höchstwert über eine Sekunde: die Chiptunes haben echte Pausen zwischen den Noten.
  const litPeak = async () => { let m = 0; for (let n = 0; n < 10; n++) { m = Math.max(m, await lit()); await pause(100); } return m; };
  const key = name => page.locator(`[data-radio-${name}]`);

  let r = await radio();
  assert.equal(r.state, 'stopped');
  assert.equal(r.contexts, 0, 'Kein Audio vor einer bewussten Benutzeraktion');
  assert.equal(await lit(), 0, 'Anzeige ist in Ruhe dunkel');

  await key('play').click(); await pause(1500);
  r = await radio();
  assert.equal(r.state, 'playing', 'Play startet');
  assert.ok(r.level > 0, 'Analyser liefert echte Audiodaten');
  const litPlaying = await litPeak();
  assert.ok(litPlaying > 10, `Display reagiert auf das Signal: ${litPlaying}`);
  assert.equal(await key('play').getAttribute('aria-label'), 'Pause');
  assert.match(r.title, /^01 – /);
  if (shots) await page.locator('.nr-pin').screenshot({ path: path.join(shots, 'player-playing.png') });

  await key('play').click(); await pause(700);
  r = await radio();
  assert.equal(r.state, 'paused', 'Pause hält an');
  assert.equal(r.voices, 0, 'Pause verwirft vorgeplante Noten');
  const pausedAt = r.time;
  await pause(1100);
  assert.equal((await radio()).time, pausedAt, 'Zeit steht in der Pause');
  await pause(500);
  assert.equal(await lit(), 0, 'Anzeige klingt in der Pause aus und kommt zur Ruhe');

  await key('play').click(); await pause(1200);
  r = await radio();
  assert.equal(r.state, 'playing', 'Fortsetzen nach Pause');
  assert.ok(r.time >= pausedAt, 'Zeit läuft nach der Pause weiter');

  await key('stop').click(); await pause(400);
  r = await radio();
  assert.equal(r.state, 'stopped', 'Stopp');
  assert.equal(r.time, '00:00', 'Stopp setzt die Zeit zurück');
  assert.equal(await lit(), 0, 'Stopp setzt die Anzeige zurück');

  await key('next').click(); await pause(150);
  r = await radio();
  assert.equal(r.track, 1); assert.match(r.title, /^02 – /);
  assert.equal(r.state, 'stopped', 'Titelwechsel im Stopp startet nichts');
  await key('prev').click(); await key('prev').click(); await pause(150);
  assert.match((await radio()).title, /^03 – /, 'Zurück springt zyklisch zum letzten Titel');

  await key('shuffle').click(); await pause(900);
  r = await radio();
  assert.equal(r.state, 'playing', 'Zufallstitel spielt');
  assert.notEqual(r.track, 2, 'Zufall wählt einen anderen Titel');

  await key('volume').fill('0'); await pause(300);
  assert.ok((await radio()).volume < 0.02, 'Lautstärke 0 wirkt auf die Wiedergabe');
  await key('volume').fill('80'); await pause(300);
  assert.ok(Math.abs((await radio()).volume - 0.8) < 0.03, 'Lautstärke 80 wirkt auf die Wiedergabe');

  await key('list').click();
  assert.ok(await page.locator('[data-radio-playlist]').isVisible(), 'Playlist öffnet im Display');
  assert.equal(await page.locator('.nr-playlist__item').count(), 3);
  await page.locator('.nr-playlist__item').nth(1).click(); await pause(500);
  r = await radio();
  assert.ok(await page.locator('[data-radio-playlist]').isHidden(), 'Playlist schließt nach Auswahl');
  assert.equal(r.track, 1); assert.equal(r.state, 'playing');
  await key('list').click(); await page.keyboard.press('Escape');
  assert.ok(await page.locator('[data-radio-playlist]').isHidden(), 'Escape schließt die Playlist');

  await key('mode').click();
  assert.equal(await key('mode').getAttribute('aria-pressed'), 'true', 'Anzeige umgeschaltet');
  assert.ok(await litPeak() > 5, 'Wellenform reagiert ebenfalls auf das Signal');
  await key('mode').click();

  // Schnelles Mehrfachklicken erzeugt keine zweite Musikinstanz.
  for (let n = 0; n < 5; n++) await key('play').click({ delay: 0 });
  await pause(1200);
  r = await radio();
  assert.equal(r.contexts, 1);
  assert.equal(r.state, 'paused', 'Fünf Klicks enden in Pause');
  assert.equal(r.voices, 0, 'Keine weiterlaufenden Stimmen');
  await key('play').click(); await pause(1200);
  const v1 = (await radio()).voices;
  await pause(1200);
  const v2 = (await radio()).voices;
  assert.ok(v1 < 60 && v2 < 60, `Keine doppelte Wiedergabe (${v1}/${v2} Stimmen)`);
  await key('stop').click();
  await context.close();

  /* ---------- Reduzierte Bewegung ---------- */
  const calm = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
  const calmPage = await calm.newPage();
  calmPage.on('pageerror', e => errors.push(`reduced: ${e.message}`));
  await calmPage.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
  await calmPage.locator('[data-radio-play]').click(); await pause(1200);
  assert.equal(await calmPage.locator('[data-radio-cone]').first().evaluate(e => e.style.transform), '', 'Keine Lautsprecherbewegung bei reduzierter Bewegung');
  await calmPage.locator('[data-radio-stop]').click();
  await calm.close();

  assert.deepEqual(errors, [], 'Keine JavaScript-Fehler');
  console.log('NERD RADIO: Bedienung, Audiodaten, Platzierung und reduzierte Bewegung bestanden');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) server.kill(); fs.rmSync(scratch, { recursive: true, force: true });
});
