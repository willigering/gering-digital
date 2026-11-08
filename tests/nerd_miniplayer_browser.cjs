'use strict';
// NERD FM Mini-Player: Musik von der Startseite läuft in Modul und Spickzettel weiter (Titel + Position), Pause/Stopp werden respektiert.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dtp-mini-'));
const env = { ...process.env, GD_ROOT: root, GD_DB_PATH: path.join(scratch, 'site.sqlite'), NERD_RADIO_AUDIO: 'audio/nerd-radio-test' };
const port = 23000 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const php = code => {
  const r = spawnSync('php', ['-r', `require ${JSON.stringify(root + '/dau_lib.php')}; require_once ${JSON.stringify(root + '/html_project_lib.php')}; ${code}`], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r.stdout;
};
const testDir = path.join(root, 'dau-to-pro/audio/nerd-radio-test');
const wav = (seconds, f) => {
  const rate = 22050, n = Math.round(rate * seconds), buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(0.3 * 32767 * Math.sin(2 * Math.PI * f * i / rate)), 44 + i * 2);
  return buf;
};
const seconds = text => { const [m, s] = text.split(':').map(Number); return m * 60 + s; };

let server, browser;
(async () => {
  fs.rmSync(testDir, { recursive: true, force: true }); fs.mkdirSync(testDir, { recursive: true });
  ['01_Testsignal_Alpha', '02_Testsignal_Beta'].forEach((n, i) => fs.writeFileSync(path.join(testDir, n + '.wav'), wav(120, 220 + i * 55)));
  const slug = JSON.parse(php(`$b=hp_bundles()[array_key_first(hp_bundles())];$v=hp_import_local($b['path'],$b['slug']);
    db()->prepare("INSERT INTO html_pages(slug,title,subject,description,category,draft_version,live_version,published) VALUES(?,?,?,?,'lernen',?,?,1)")->execute([$b['slug'],$b['title'],$b['subject'],$b['description'],$v,$v]);
    echo json_encode($b['slug']);`));
  server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', root, path.join(__dirname, 'support/router.php')], { env, stdio: 'ignore' });
  for (let n = 0; n < 60; n++) { try { if ((await fetch(base + '/dau-to-pro/')).ok) break; } catch (_) { /* Server startet noch */ } if (n === 59) throw Error('PHP server unavailable'); await pause(100); }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Endpoint: nur GET, nur aktive Titel mit Abruf-Link.
  const api = await page.request.get(base + '/dau-to-pro/api/radio-tracks.php');
  assert.equal(api.status(), 200);
  const listed = await api.json();
  assert.equal(listed.ok, true); assert.equal(listed.tracks.length, 2);
  assert.equal((await page.request.post(base + '/dau-to-pro/api/radio-tracks.php')).status(), 405, 'POST ist nicht erlaubt');

  // Ohne Musik bleibt jede Seite still, und es wird nichts nachgeladen.
  let apiCalls = 0;
  page.on('request', r => { if (r.url().includes('radio-tracks.php')) apiCalls++; });
  await page.goto(`${base}/${slug}/`);
  assert.equal(await page.locator('.dtp-mini').count(), 0, 'Ohne Musik kein Mini-Player');
  await page.goto(`${base}/dau-to-pro/cheat-sheet.html`);
  assert.equal(await page.locator('.dtp-mini').count(), 0);
  assert.equal(apiCalls, 0, 'Ohne Übergabe wird die Playlist nicht abgefragt');

  // Startseite: zweiten Titel wählen, abspielen, ein Stück laufen lassen.
  await page.goto(base + '/dau-to-pro/');
  await page.evaluate(() => localStorage.setItem('dtp-nerd-radio-track', '1'));
  await page.reload();
  await page.click('[data-radio-play]');
  await page.waitForFunction(() => document.querySelector('[data-nerd-radio]').nerdRadio.state === 'playing');
  await page.waitForFunction(() => /^00:0[2-9]/.test(document.querySelector('[data-radio-elapsed]').textContent), null, { timeout: 15000 });
  const title = (await page.locator('[data-radio-title]').textContent()).trim().replace(/^\d+\s*–\s*/, '');   // Radio zeigt „02 – Titel“
  const heard = seconds((await page.locator('[data-radio-elapsed]').textContent()).trim());

  // Wechsel ins Modul: Mini-Player übernimmt Titel und Position und spielt weiter.
  await page.goto(`${base}/${slug}/`);
  const mini = page.locator('.dtp-mini');
  await mini.waitFor({ timeout: 10000 });
  await page.waitForSelector('.dtp-mini.is-playing', { timeout: 10000 });
  assert.equal((await mini.locator('[data-mini-title]').textContent()).trim(), title, 'Gleicher Titel wie im Radio');
  const inModule = seconds((await mini.locator('[data-mini-time]').textContent()).trim());
  assert.ok(inModule >= heard, `Position übernommen (${inModule} >= ${heard})`);
  await page.waitForFunction(s => { const [m, x] = document.querySelector('[data-mini-time]').textContent.split(':').map(Number); return m * 60 + x >= s + 2; }, inModule, { timeout: 10000 });

  // Spickzettel: läuft weiter, Position wächst weiter.
  const before = seconds((await mini.locator('[data-mini-time]').textContent()).trim());
  await page.goto(`${base}/dau-to-pro/cheat-sheet.html`);
  await page.waitForSelector('.dtp-mini.is-playing', { timeout: 10000 });
  assert.equal((await page.locator('.dtp-mini [data-mini-title]').textContent()).trim(), title);
  assert.ok(seconds((await page.locator('.dtp-mini [data-mini-time]').textContent()).trim()) >= before, 'Position bleibt erhalten');

  // Pause im Mini-Player: Der nächste Seitenwechsel zeigt ihn pausiert und startet nichts.
  await page.click('[data-mini-toggle]');
  await page.waitForSelector('.dtp-mini:not(.is-playing)');
  await page.goto(`${base}/${slug}/`);
  await page.waitForSelector('.dtp-mini', { timeout: 10000 });
  await pause(1200);
  assert.equal(await page.locator('.dtp-mini.is-playing').count(), 0, 'Pausiert bleibt pausiert');
  assert.equal(await page.locator('.dtp-mini.is-waiting').count(), 0);

  // Weiterspielen, nächster Titel, dann Beenden.
  await page.click('[data-mini-toggle]');
  await page.waitForSelector('.dtp-mini.is-playing');
  await page.click('[data-mini-next]');
  await page.waitForSelector('.dtp-mini.is-playing');
  assert.notEqual((await page.locator('[data-mini-title]').textContent()).trim(), title, 'Nächster Titel');
  await page.click('[data-mini-stop]');
  assert.equal(await page.locator('.dtp-mini').count(), 0);
  await page.goto(`${base}/dau-to-pro/cheat-sheet.html`);
  await pause(500);
  assert.equal(await page.locator('.dtp-mini').count(), 0, 'Nach Beenden kommt nichts wieder');

  // Ohne Übergabe (Musik läuft in einem anderen Tab) startet der Mini-Player nicht doppelt.
  await page.evaluate(() => localStorage.setItem('dtp-nerd-radio-resume', JSON.stringify({ id: 'x', t: 3, playing: true, handoff: false, at: Date.now() })));
  await page.reload(); await pause(500);
  assert.equal(await page.locator('.dtp-mini').count(), 0, 'Ohne Übergabe bleibt es still');
  // Veralteter Stand wird ignoriert.
  await page.evaluate(() => localStorage.setItem('dtp-nerd-radio-resume', JSON.stringify({ id: 'x', t: 3, playing: true, handoff: true, at: Date.now() - 3600e3 })));
  await page.reload(); await pause(500);
  assert.equal(await page.locator('.dtp-mini').count(), 0, 'Alter Stand wird ignoriert');

  // Autoplay gesperrt: Der Mini-Player bleibt sichtbar und bietet Play an.
  const strict = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await strict.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('blocked', 'NotAllowedError')); });
  await strict.goto(base + '/dau-to-pro/cheat-sheet.html');
  await strict.evaluate(() => localStorage.setItem('dtp-nerd-radio-resume', JSON.stringify({ id: 'audio/nerd-radio-test/01_Testsignal_Alpha.wav', t: 5, playing: true, handoff: true, at: Date.now() })));
  await strict.reload();
  await strict.waitForSelector('.dtp-mini.is-waiting', { timeout: 10000 });

  // Mobil bleibt der Mini-Player im Bild und überdeckt keine Seitenbreite.
  const phone = await (await browser.newContext({ viewport: { width: 375, height: 700 } })).newPage();
  await phone.goto(base + '/dau-to-pro/cheat-sheet.html');
  await phone.evaluate(() => localStorage.setItem('dtp-nerd-radio-resume', JSON.stringify({ id: 'audio/nerd-radio-test/01_Testsignal_Alpha.wav', t: 5, playing: false, handoff: true, at: Date.now() })));
  await phone.reload();
  await phone.waitForSelector('.dtp-mini');
  const box = await phone.locator('.dtp-mini').boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 700, 'Mini-Player liegt vollständig im Bild');

  assert.deepEqual(errors, [], 'Keine Seitenfehler: ' + errors.join('; '));
  console.log('NERD FM Mini-Player: OK');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill();
  fs.rmSync(testDir, { recursive: true, force: true });
  fs.rmSync(scratch, { recursive: true, force: true });
});
