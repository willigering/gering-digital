'use strict';
// NERD FM: Bedienung, echte Audiodaten, eigene Audiodateien, Platzierung im Kopf der Trainingszone, Mobilansicht.
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
const env = { ...process.env, GD_ROOT: root, GD_DB_PATH: path.join(scratch, 'site.sqlite'), NERD_RADIO_AUDIO: 'audio/nerd-radio-test' };
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

// Eigener Musikordner nur für den Test (NERD_RADIO_AUDIO): drei Testsignale, wird am Ende gelöscht.
// So hängt der Test nicht davon ab, welche Songs im echten Ordner liegen.
const testDir = path.join(root, 'dau-to-pro/audio/nerd-radio-test');
const wav = (seconds, f = 110) => {
  const rate = 22050, n = Math.round(rate * seconds), buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate, gate = (t * 2) % 1 < 0.5 ? 1 : 0;
    const v = gate * 0.25 * (Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * 2 * f * t) + 0.6 * Math.sin(2 * Math.PI * 6 * f * t));
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2);
  }
  return buf;
};

let server, browser;
(async () => {
  fs.rmSync(testDir, { recursive: true, force: true }); fs.mkdirSync(testDir, { recursive: true });
  ['01_Testsignal_Alpha', '02_Testsignal_Beta', '03_Testsignal_Gamma'].forEach((n, i) => fs.writeFileSync(path.join(testDir, n + '.wav'), wav(20, 110 + i * 27)));
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

  /* ---------- Platzierung: Desktop rechts im Kopf der Trainingszone (ohne Platz im Fluss), mobil unter der Überschrift ---------- */
  const layout = page => page.evaluate(() => {
    const box = e => e.getBoundingClientRect();
    const device = box(document.querySelector('.nr-device'));
    const cards = [...document.querySelectorAll('#module-grid .module-card')].filter(c => !c.closest('.stack-row.is-behind') && c.getClientRects().length);
    const blocks = [...cards, ...document.querySelectorAll('.hero-copy,.catalog-section .section-heading>div,.catalog-section .section-count,.filterbar')].map(box);
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
      art: (({ top, height }) => ({ top, height }))(box(document.querySelector('.hero-art-wrap'))),
      stagePos: getComputedStyle(document.querySelector('.nr-stage')).position,
      headingTextBottom: box(document.querySelector('.catalog-section .section-heading>div')).bottom,
      headingTop: box(document.querySelector('.catalog-section .section-heading')).top,
      gridTop: box(document.getElementById('module-grid')).top,
      stageWidth: document.querySelector('.nr-rail').offsetWidth
    };
  });
  for (const [width, height, mobile] of (process.env.DTP_RADIO_SMOKE === '1' ? [] : [[2560, 1440], [1920, 1080], [1600, 900], [1440, 900], [1024, 768], [390, 844, true], [320, 568, true]])) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: !!mobile, hasTouch: !!mobile });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${width}: ${e.message}`));
    await page.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
    const g = await layout(page);
    assert.equal(g.players, 1, `Genau ein Player bei ${width}`);
    assert.ok(g.overflow <= 0, `Kein horizontales Scrollen bei ${width}: ${g.overflow}`);
    assert.ok(Math.abs(g.cardsCenter - g.pageCenter) < 1.5, `Modulkarten bleiben mittig bei ${width}: ${g.cardsCenter} vs ${g.pageCenter}`);
    // Die Trainingszone rutscht durch das Gerät nicht nach unten: Überschrift steht wie ohne Gerät.
    const headingWithout = await page.evaluate(() => {
      const st = document.querySelector('.nr-stage'); st.style.display = 'none';
      const t = document.querySelector('.catalog-section .section-heading').getBoundingClientRect().top;
      st.style.display = ''; return t;
    });
    if (width > 860) {
      assert.equal(g.stagePos, 'absolute', `Gerät nimmt keinen Platz im Seitenfluss ein bei ${width}`);
      assert.ok(Math.abs(g.headingTop - headingWithout) < 1, `Trainingszone wird nicht nach unten geschoben bei ${width}`);
      assert.ok(g.device.top >= g.art.top + g.art.height * 0.85, `Gerät steht unter den Hero-Figuren bei ${width}`);
      assert.ok(g.device.bottom <= g.gridTop, `Gerät endet über der Modulauswahl bei ${width}`);
      assert.ok(g.device.center > g.pageCenter, `Gerät steht rechts bei ${width}`);
    } else {
      assert.ok(g.device.top >= g.headingTextBottom - 1 && g.device.bottom <= g.gridTop, `Mobil: Gerät zwischen Überschrift und Modulauswahl bei ${width}`);
    }
    assert.ok(g.stageWidth <= Math.min(600, width - 40) + 1, `Gerät passt in die Breite bei ${width}`);
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
    console.log(`${width}×${height}: Gerät ${g.device.width.toFixed(0)} px im Kopf der Trainingszone, Karten mittig, keine Überdeckung`);
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
    let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 90 && Math.max(d[i], d[i + 1], d[i + 2]) > 160) n++;
    return n;
  });
  // Höchstwert über eine Sekunde: die Testsignale haben echte Pausen im Rhythmus.
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
  // Echte Beleuchtung: Helligkeit der Lichtebenen folgt der Musik (Gold = Bass, Cyan = Höhen)
  const lightSamples = [];
  // Schein von Ring (Gold) und Pilz (Cyan) sowie der Membranhub folgen der Musik
  for (let n = 0; n < 20; n++) {
    lightSamples.push(await page.evaluate(() => {
      const op = n => Number(getComputedStyle(document.querySelector(`[data-radio-light="${n}"]`)).opacity);
      const cone = getComputedStyle(document.querySelector('[data-radio-cone]')).transform;
      return [op('gold-halo'), op('cyan-halo'), cone === 'none' ? 1 : Number(cone.slice(7).split(',')[0])];
    }));
    await pause(60);
  }
  const spread = i => Math.max(...lightSamples.map(s => s[i])) - Math.min(...lightSamples.map(s => s[i]));
  assert.ok(spread(0) > 0.05 && spread(1) > 0.03, `Licht pulsiert mit der Musik: ${spread(0).toFixed(2)} / ${spread(1).toFixed(2)}`);
  assert.ok(spread(2) > 0.004, `Membranen pumpen mit dem Bass: ${spread(2).toFixed(4)} ${lightSamples.map(s => s.map(v => v.toFixed(3)).join("/")).join(" ")}`);
  const faced = await page.evaluate(() => [...document.querySelectorAll('[data-radio-face]')].every(e => e.classList.contains('is-placed') && getComputedStyle(e).transform.startsWith('matrix3d')));
  assert.ok(faced, 'Display und Regler liegen perspektivisch auf der schrägen Front');
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
  await key('pause').click(); await pause(400);
  assert.equal((await radio()).state, 'paused', 'Pause-Taste hält an');
  await key('pause').click(); await pause(200);
  assert.equal((await radio()).state, 'paused', 'Pause-Taste startet nicht neu');
  await key('play').click(); await pause(1200);
  assert.ok(r.time >= pausedAt, 'Zeit läuft nach der Pause weiter');

  await key('stop').click(); await pause(400);
  r = await radio();
  assert.equal(r.state, 'stopped', 'Stopp');
  assert.equal(r.time, '00:00', 'Stopp setzt die Zeit zurück');
  assert.equal(await lit(), 0, 'Stopp setzt die Anzeige zurück');
  await pause(500);
  const rest = await page.evaluate(() => [...document.querySelectorAll('[data-radio-light]')].map(e => Number(getComputedStyle(e).opacity)));
  await pause(400);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('[data-radio-light]')].map(e => Number(getComputedStyle(e).opacity))), rest, 'Im Stopp leuchtet das Gerät ruhig');
  assert.ok(rest.every(v => v < 0.1), `Ohne Musik sind die Leuchten aus: ${rest}`);

  await key('next').click(); await pause(150);
  r = await radio();
  assert.equal(r.track, 1); assert.match(r.title, /^02 – /);
  assert.equal(r.state, 'stopped', 'Titelwechsel im Stopp startet nichts');
  await key('prev').click(); await key('prev').click(); await pause(150);
  assert.match((await radio()).title, /^03 – /, 'Zurück springt zyklisch zum letzten Titel');
  // Mausrad wechselt den Titel nur direkt auf der Titelzeile (dort zeigt der Mauszeiger ein Mausrad-Symbol);
  // über dem übrigen Gerät passiert nichts am Radio.
  const titleRow = page.locator('.nr-display__track');
  const cursorOf = locator => locator.evaluate(e => getComputedStyle(e).cursor);
  await page.locator('[data-radio-play]').hover();
  await page.mouse.wheel(0, 120); await pause(450);
  assert.match((await radio()).title, /^03 – /, 'Mausrad über dem Gerät (nicht auf dem Titel) wechselt nichts');
  assert.match(await cursorOf(titleRow), /^url\("data:image\/svg\+xml/, 'Mauszeiger auf der Titelzeile wird zum Mausrad-Symbol');
  assert.ok(!/^url/.test(await cursorOf(page.locator('[data-radio-play]'))), 'Auf den Tasten bleibt der normale Mauszeiger');
  await titleRow.hover();
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120); await pause(450);
  assert.match((await radio()).title, /^01 – /, 'Mausrad auf dem Titel nach unten: nächster Titel');
  await page.mouse.wheel(0, -120); await pause(450);
  assert.match((await radio()).title, /^03 – /, 'Mausrad auf dem Titel nach oben: vorheriger Titel');
  assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'Mausrad auf dem Titel scrollt die Seite nicht');

  await key('shuffle').click(); await pause(900);
  r = await radio();
  assert.equal(r.state, 'playing', 'Zufallstitel spielt');
  assert.notEqual(r.track, 2, 'Zufall wählt einen anderen Titel');

  // Playwright fill() auf type=range setzt oft nur den Wert ohne input-Event.
  // Deshalb Wert setzen und input explizit auslösen; danach auf die Audio-Rampe warten.
  const setVolumeUi = async pct => {
    await key('volume').evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, pct);
  };
  const volumeReaches = async target => {
    let v = NaN;
    for (let t = 0; t < 30; t++) { await pause(100); v = (await radio()).volume; if (Math.abs(v - target) < 0.03) break; }
    return v;
  };
  await setVolumeUi(0);
  { const v = await volumeReaches(0); assert.ok(v < 0.03, `Lautstärke 0 wirkt auf die Wiedergabe: ${v}`); }
  await setVolumeUi(80);
  { const v = await volumeReaches(0.8); assert.ok(Math.abs(v - 0.8) < 0.03, `Lautstärke 80 wirkt auf die Wiedergabe: ${v}`); }
  // Knopf und Füllung folgen dem Regler (Wert am gemeinsamen Container)
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.nr-volume')).getPropertyValue('--nr-vol').trim()), '80%', 'Lautstärkeknopf bewegt sich mit');

  await key('list').click();
  assert.ok(await page.locator('[data-radio-playlist]').isVisible(), 'Playlist öffnet im Display');
  assert.equal(await page.locator('.nr-playlist__item').count(), 3);
  await page.locator('.nr-playlist__play').nth(1).click(); await pause(500);
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
  const calmLight = await calmPage.evaluate(() => [...document.querySelectorAll('[data-radio-light]')].map(e => Number(getComputedStyle(e).opacity)));
  await pause(500);
  assert.deepEqual(await calmPage.evaluate(() => [...document.querySelectorAll('[data-radio-light]')].map(e => Number(getComputedStyle(e).opacity))), calmLight, 'Kein Pulsieren bei reduzierter Bewegung');
  await calmPage.locator('[data-radio-stop]').click();
  await calm.close();

  /* ---------- Songs aus dem Musikordner, keine generierten Loops ---------- */
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
  assert.equal(await items.count(), 3, 'Nur die Songs aus dem Ordner, keine Loops');
  const texts = await items.allInnerTexts();
  assert.ok(texts[0].includes('Testsignal Alpha') && !texts.some(t => /Stack Overflow|Ctrl \+ Alt|404/.test(t)), 'Titel aus dem Dateinamen ohne Nummer, keine Loops');
  await ownPage.locator('.nr-playlist__play').nth(0).click(); await pause(1300);
  let o = await ownState();
  assert.equal(o.state, 'playing', 'Datei spielt');
  assert.match(o.title, /Testsignal Alpha$/);
  assert.equal(o.length, '00:20', 'Echte Dateilänge statt Loop-Anzeige');
  assert.ok(o.level > 0, 'Analyser liefert Daten der Datei');
  assert.equal(o.time, '00:01', 'Zeit läuft mit der Datei');
  /* ---------- Module wechseln, ohne AudioContext oder Song zu verlieren ---------- */
  await pause(650);
  const beforeModule = await ownState();
  const seconds = t => { const [m, s] = t.split(':').map(Number); return m * 60 + s; };
  await ownPage.locator('#module-grid a.module-card[href="../osi/"]').click();
  await ownPage.locator('[data-module-shell]').waitFor({ state: 'visible' });
  await ownPage.frameLocator('[data-module-frame]').locator('h1').getByText('Testmodul').waitFor();
  assert.equal(new URL(ownPage.url()).searchParams.get('modul'), 'osi', 'Module werden über die persistente Lernansicht geöffnet');
  await pause(1500);
  let duringModule = await ownState();
  assert.equal(duringModule.state, 'playing', 'Musik läuft im Modul ohne Pause weiter');
  assert.ok(seconds(duringModule.time) >= seconds(beforeModule.time) + 1, 'Die Datei läuft im geöffneten Modul weiter');
  assert.equal(await ownPage.evaluate(() => document.querySelector('[data-nerd-radio]').nerdRadio.contexts), 1, 'AudioContext wurde nicht neu erstellt');
  await ownPage.locator('[data-module-radio-play]').click();
  assert.equal((await ownState()).state, 'paused', 'Modulsteuerung pausiert den ursprünglichen Player');
  await pause(550);
  const pausedModule = (await ownState()).time;
  await pause(600);
  assert.equal((await ownState()).time, pausedModule, 'Kein Songfortschritt in der Pause');
  await ownPage.locator('[data-module-radio-play]').click();
  await ownPage.waitForFunction(() => document.querySelector('[data-nerd-radio]').nerdRadio.state === 'playing');
  assert.equal((await ownState()).state, 'playing', 'Modulsteuerung setzt denselben Song fort');
  await ownPage.frameLocator('[data-module-frame]').locator('#next-module').click();
  await ownPage.waitForFunction(() => new URL(location.href).searchParams.get('modul') === 'subnetsprint');
  assert.equal((await ownState()).state, 'playing', 'Auch der Wechsel zwischen zwei Modulen stoppt die Musik nicht');
  await ownPage.frameLocator('[data-module-frame]').locator('dtp-back #back-module').click();
  await ownPage.locator('[data-module-shell]').waitFor({ state: 'hidden' });
  assert.equal(new URL(ownPage.url()).searchParams.has('modul'), false, 'Zurück aus dem Modul ohne Seitenreload');
  assert.equal((await ownState()).state, 'playing', 'Musik spielt nach Rückkehr zur Modulauswahl weiter');
  const seek = ownPage.locator('[data-radio-seek]');
  assert.equal(await seek.isEnabled(), true, 'Fortschrittsbalken ist bei einer MP3 bedienbar');
  const seekBox = await seek.boundingBox();
  assert.ok(seekBox && seekBox.width > 10, 'Regler hat eine klickbare Fläche');
  // Die Testaudioantwort liefert nun HTTP 206 und kann wirklich seeken.
  const bar = ownPage.locator('.nr-display__bar');
  const box = await bar.boundingBox();
  assert.ok(box && box.width > 10, 'Die Schiene hat eine sichtbare Fläche');
  await ownPage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await pause(350);
  o = await ownState();
  assert.ok(Number(o.time.slice(3)) >= 8 && Number(o.time.slice(3)) <= 13,
    `Klick spult zur Titelmitte (Zeit=${o.time}, Regler=${await seek.inputValue()})`);
  await ownPage.locator('[data-radio-pause]').click();
  await seek.focus();
  await ownPage.keyboard.press('Home');
  await pause(150);
  assert.equal((await ownState()).time, '00:00', 'Tastatur setzt Position an den Titelanfang');
  await ownPage.locator('[data-radio-stop]').click(); await pause(300);
  o = await ownState();
  assert.equal(o.state, 'stopped'); assert.equal(o.time, '00:00', 'Stopp setzt die Datei zurück');
  await own.close();
  console.log('Songs: Playlist ohne Loops, Wiedergabe, Länge und Stopp bestanden');

  /* ---------- Playlist-Editor: Titel per Klick an/aus, wird gemerkt, übersprungen, mindestens einer bleibt aktiv ---------- */
  const edit = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ep = await edit.newPage();
  ep.on('pageerror', e => errors.push(`editor: ${e.message}`));
  await ep.goto(base + '/dau-to-pro/', { waitUntil: 'networkidle' });
  const eState = () => ep.evaluate(() => { const r = document.querySelector('[data-nerd-radio]').nerdRadio; return { track: r.track, state: r.state }; });
  const toggles = ep.locator('.nr-playlist__item');
  const eKey = n => ep.locator(`[data-radio-${n}]`);
  await eKey('list').click();
  assert.deepEqual(await toggles.evaluateAll(l => l.map(e => e.getAttribute('aria-checked'))), ['true', 'true', 'true'], 'Anfangs sind alle Titel aktiv');
  await toggles.nth(1).click();
  assert.equal(await toggles.nth(1).getAttribute('aria-checked'), 'false', 'Klick auf den Titel schaltet ihn aus');
  assert.equal(await ep.locator('.nr-playlist__row').nth(1).getAttribute('data-on'), 'false');
  assert.equal(await ep.locator('[data-radio-playlist]').isVisible(), true, 'Playlist bleibt zum weiteren Bearbeiten offen');
  assert.match(await ep.locator('[data-radio-playlist]').getAttribute('aria-label'), /2 von 3 Titeln aktiv/);
  await eKey('list').click();   // schließen
  assert.equal((await eState()).track, 0);
  await eKey('next').click(); await pause(150);
  assert.equal((await eState()).track, 2, 'Weiter überspringt den abgewählten Titel');
  await eKey('prev').click(); await pause(150);
  assert.equal((await eState()).track, 0, 'Zurück überspringt ihn ebenfalls');
  await ep.locator('.nr-display__track').hover();
  await ep.mouse.wheel(0, 120); await pause(450);
  assert.equal((await eState()).track, 2, 'Mausrad überspringt den abgewählten Titel');
  await eKey('shuffle').click(); await pause(700);
  assert.equal((await eState()).track, 0, 'Zufall wählt nur unter aktiven Titeln');
  await eKey('stop').click();
  // Der Stand bleibt über ein Neuladen erhalten (Gäste: im Browser).
  await ep.reload({ waitUntil: 'networkidle' });
  await eKey('list').click();
  assert.deepEqual(await toggles.evaluateAll(l => l.map(e => e.getAttribute('aria-checked'))), ['true', 'false', 'true'], 'Auswahl bleibt nach dem Neuladen erhalten');
  // Ein abgewählter Titel lässt sich gezielt abspielen; er wird dabei wieder aktiv.
  await ep.locator('.nr-playlist__play').nth(1).click(); await pause(600);
  assert.equal((await eState()).track, 1);
  assert.equal(await ep.locator('.nr-playlist__row').nth(1).getAttribute('data-on'), 'true', 'Abspielen aktiviert den Titel wieder');
  await eKey('stop').click();
  // Nur noch ein aktiver Titel: Abwählen wird verweigert, das Mausrad hat keine Wirkung mehr.
  await eKey('list').click();
  await toggles.nth(1).click(); await toggles.nth(2).click();
  assert.deepEqual(await toggles.evaluateAll(l => l.map(e => e.getAttribute('aria-checked'))), ['true', 'false', 'false']);
  await toggles.nth(0).click();
  assert.equal(await toggles.nth(0).getAttribute('aria-checked'), 'true', 'Der letzte aktive Titel bleibt an');
  assert.match(await ep.locator('[data-radio-status]').textContent(), /Mindestens ein Titel/);
  await eKey('list').click();
  assert.equal(await ep.locator('.nr-device').evaluate(e => e.classList.contains('has-wheel')), false, 'Mit nur einem aktiven Titel gibt es kein Mausrad-Symbol');
  assert.ok(!/^url/.test(await ep.locator('.nr-display__track').evaluate(e => getComputedStyle(e).cursor)), 'Dann bleibt der Mauszeiger normal');
  await edit.close();
  console.log('Playlist-Editor: an/aus, überspringen, merken, Mindestens-einer und Mausrad-Symbol bestanden');

  assert.deepEqual(errors, [], 'Keine JavaScript-Fehler');
  console.log('NERD FM: Bedienung, Audiodaten, Platzierung und reduzierte Bewegung bestanden');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.rmSync(testDir, { recursive: true, force: true }); if (browser) await browser.close(); if (server) server.kill(); fs.rmSync(scratch, { recursive: true, force: true });
});
