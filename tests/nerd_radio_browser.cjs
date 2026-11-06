'use strict';
// NERD RADIO: Bedienung, echte Audiodaten, eigene Audiodateien, Platzierung unter dem Hero, Mobilansicht.
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

// Kurzes Testsignal (Akkord mit Rhythmus) als eigene Datei im Musikordner; wird am Ende gelöscht.
const testTrack = path.join(root, 'dau-to-pro/audio/nerd-radio/99_Testsignal_Nerd_Radio.wav');
const wav = seconds => {
  const rate = 22050, n = Math.round(rate * seconds), buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate, gate = (t * 4) % 1 < 0.7 ? 1 : 0.15;
    const v = gate * 0.25 * (Math.sin(2 * Math.PI * 110 * t) + Math.sin(2 * Math.PI * 220 * t) + 0.6 * Math.sin(2 * Math.PI * 660 * t));
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2);
  }
  return buf;
};

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

  /* ---------- Platzierung: unter dem Hero, rechts unter dem Logo, scrollt normal mit ---------- */
  const layout = page => page.evaluate(() => {
    const box = e => e.getBoundingClientRect();
    const device = box(document.querySelector('.nr-device'));
    const cards = [...document.querySelectorAll('#module-grid .module-card')].filter(c => !c.closest('.stack-row.is-behind') && c.getClientRects().length);
    const blocks = [...cards, ...document.querySelectorAll('.hero-copy,.catalog-section .section-heading,.filterbar')].map(box);
    // Nur sichtbare Überdeckung zählt: Schnittfläche innerhalb des Viewports.
    const top = Math.max(0, device.top), bottom = Math.min(innerHeight, device.bottom);
    const hit = r => bottom > top && !(r.right <= device.left || r.left >= device.right || Math.min(r.bottom, innerHeight) <= top || Math.max(r.top, 0) >= bottom);
    const left = Math.min(...cards.map(c => box(c).left)), right = Math.max(...cards.map(c => box(c).right));
    const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
    return {
      players: document.querySelectorAll('[data-nerd-radio]').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardsCenter: (left + right) / 2, pageCenter: document.documentElement.clientWidth / 2,
      device: { left: device.left, right: device.right, top: device.top, bottom: device.bottom, width: device.width, center: (device.left + device.right) / 2 },
      overlaps: blocks.filter(hit).length, nav,
      heroBottom: box(document.querySelector('.hero-inner')).bottom,
      headingTop: box(document.querySelector('.catalog-section .section-heading')).top,
      gridTop: box(document.getElementById('module-grid')).top,
      stageWidth: document.querySelector('.nr-rail').offsetWidth
    };
  });
  for (const [width, height, mobile] of [[2560, 1440], [1920, 1080], [1600, 900], [1440, 900], [1024, 768], [390, 844, true], [320, 568, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: !!mobile, hasTouch: !!mobile });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${width}: ${e.message}`));
    await page.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
    const g = await layout(page);
    assert.equal(g.players, 1, `Genau ein Player bei ${width}`);
    assert.ok(g.overflow <= 0, `Kein horizontales Scrollen bei ${width}: ${g.overflow}`);
    assert.ok(Math.abs(g.cardsCenter - g.pageCenter) < 1.5, `Modulkarten bleiben mittig bei ${width}: ${g.cardsCenter} vs ${g.pageCenter}`);
    assert.ok(g.device.top >= g.heroBottom - 1, `Gerät steht unter dem Hero bei ${width}`);
    assert.ok(g.device.bottom <= g.headingTop, `Gerät steht über der Trainingszone bei ${width}`);
    if (width > 860) assert.ok(g.device.center > g.pageCenter, `Gerät steht rechts unter dem Logo bei ${width}`);
    assert.ok(g.stageWidth <= Math.min(520, width - 40) + 1, `Gerät passt in die Breite bei ${width}`);
    assert.ok(g.device.width >= Math.min(280, width - 48), `Gerät bleibt bedienbar groß bei ${width}: ${g.device.width}`);
    // Die ganze Startseite bis unter die Module durchscrollen: nie eine Überdeckung,
    // und sobald die Modulauswahl oben steht, ist das Gerät aus dem Bild gescrollt.
    const end = await page.evaluate(() => scrollY + document.getElementById('module-grid').getBoundingClientRect().top + 400);
    for (let y = 0; y < end; y += 200) {
      await page.evaluate(v => scrollTo(0, v), y); await pause(120);
      const s = await layout(page);
      assert.equal(s.overlaps, 0, `Kein Überdecken beim Scrollen (${width}, y=${y})`);
      if (s.gridTop <= s.nav + 20) assert.ok(s.device.bottom <= s.nav, `Gerät ist während der Modulauswahl nicht sichtbar (${width}, y=${y})`);
    }
    if (shots) { await page.evaluate(() => scrollTo(0, 0)); await pause(200); await page.screenshot({ path: path.join(shots, `layout-${width}.png`), fullPage: width < 800 }); }
    console.log(`${width}×${height}: Gerät ${g.device.width.toFixed(0)} px unter dem Hero, Karten mittig, keine Überdeckung`);
    await context.close();
  }

  /* ---------- Bedienung und echte Audiodaten ---------- */
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`player: ${e.message}`));
  await page.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
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

  /* ---------- Eigene Audiodatei aus audio/nerd-radio/ ---------- */
  fs.mkdirSync(path.dirname(testTrack), { recursive: true });
  fs.writeFileSync(testTrack, wav(2.6));
  const own = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownPage = await own.newPage();
  ownPage.on('pageerror', e => errors.push(`datei: ${e.message}`));
  await ownPage.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
  const ownState = () => ownPage.evaluate(() => {
    const r = document.querySelector('[data-nerd-radio]').nerdRadio;
    return { state: r.state, track: r.track, level: r.level(), title: document.querySelector('[data-radio-title]').textContent,
      time: document.querySelector('[data-radio-elapsed]').textContent, length: document.querySelector('[data-radio-length]').textContent };
  });
  await ownPage.locator('[data-radio-list]').click();
  const items = ownPage.locator('.nr-playlist__item');
  const count = await items.count();
  assert.ok(count >= 4, 'Datei erscheint zusätzlich zu den drei Loops');
  const index = (await items.allInnerTexts()).findIndex(t => t.includes('Testsignal Nerd Radio'));
  assert.ok(index >= 0 && index < count - 3, 'Eigene Dateien stehen vor den Loops, Titel aus dem Dateinamen ohne Nummer');
  await items.nth(index).click(); await pause(1300);
  let o = await ownState();
  assert.equal(o.state, 'playing', 'Datei spielt');
  assert.match(o.title, /Testsignal Nerd Radio$/);
  assert.equal(o.length, '00:02', 'Echte Dateilänge statt Loop-Anzeige');
  assert.ok(o.level > 0, 'Analyser liefert Daten der Datei');
  assert.equal(o.time, '00:01', 'Zeit läuft mit der Datei');
  await ownPage.locator('[data-radio-stop]').click(); await pause(300);
  o = await ownState();
  assert.equal(o.state, 'stopped'); assert.equal(o.time, '00:00', 'Stopp setzt die Datei zurück');
  await own.close();
  fs.rmSync(testTrack, { force: true });
  console.log('Eigene Audiodatei: Playlist, Wiedergabe, Länge und Stopp bestanden');

  assert.deepEqual(errors, [], 'Keine JavaScript-Fehler');
  console.log('NERD RADIO: Bedienung, Audiodaten, Platzierung und reduzierte Bewegung bestanden');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.rmSync(testTrack, { force: true }); if (browser) await browser.close(); if (server) server.kill(); fs.rmSync(scratch, { recursive: true, force: true });
});
