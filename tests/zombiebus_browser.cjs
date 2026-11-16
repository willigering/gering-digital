'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { once } = require('node:events');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { WebSocket } = require(require.resolve('ws', { paths: [path.resolve(__dirname, '../tools/zombiebus')] }));

const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(process.env.ZOMBIEBUS_TEST_TMP || os.tmpdir(), 'gd-zombiebus-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let php, game, browser;

async function availablePort() {
  const server = net.createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function until(condition, message, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await pause(40);
  }
  assert.fail(message);
}

async function httpReady(url) {
  await until(() => new Promise(resolve => {
    const request = http.get(url, response => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => request.destroy());
  }), 'Server unavailable: ' + url);
}

async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const done = once(child, 'exit');
  child.kill();
  await done;
}

async function rider(url, name, page) {
  if (!page) page = await (await browser.newContext({ viewport: { width: 1380, height: 900 } })).newPage();
  let world, id;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('websocket', peer => peer.on('framereceived', data => {
    const frame = JSON.parse(data.payload);
    if (frame.type === 'joined') id = frame.id;
    if (frame.world) world = frame.world;
  }));
  if (url) await page.goto(url);
  if (url && new URL(url).searchParams.has('raum')) {
    assert.equal(await page.locator('#room').inputValue(), new URL(url).searchParams.get('raum'));
    if (process.env.ZOMBIEBUS_SCREENSHOT && name === 'Ben') {
      await page.locator('#game').screenshot({ path: process.env.ZOMBIEBUS_SCREENSHOT.replace(/\.png$/, '-join.png') });
    }
    await page.locator('#name').fill(name);
    await page.keyboard.press('Enter');
  } else {
    await page.locator('.brand').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'start');
    await page.keyboard.press('Enter');
  }
  await until(() => id && world?.players[id], 'Could not join as ' + name);
  await page.locator('#hud').waitFor();
  assert.deepEqual(errors, []);
  return {
    page,
    get id() { return id; },
    get world() { return world; },
    get player() { return world.players[id]; },
    get errors() { return errors; }
  };
}

async function move(rider, key, at) {
  await rider.page.keyboard.down(key);
  try {
    await until(() => at(rider.player), 'Movement failed (' + key + ') ' + JSON.stringify(rider.player));
  } finally {
    await rider.page.keyboard.up(key);
  }
}

async function use(rider, label, finished) {
  await until(async () => (await rider.page.locator('#prompt').isVisible()) &&
    (await rider.page.locator('#prompt').textContent()).includes(label), 'Missing interaction ' + label);
  await rider.page.keyboard.press('e');
  await until(finished, 'Interaction failed: ' + label);
}

async function run() {
  const phpPort = await availablePort();
  const gamePort = await availablePort();
  const base = 'http://127.0.0.1:' + phpPort;
  const gameEnv = { ...process.env, PORT: String(gamePort), ZOMBIEBUS_LOCAL: '1', ZOMBIEBUS_DATA: path.join(scratch, 'saves') };
  const startGame = () => spawn(process.execPath, [path.join(root, 'tools/zombiebus/server.mjs')], { env: gameEnv, stdio: 'inherit' });
  const ready = () => httpReady('http://127.0.0.1:' + gamePort + '/health');
  php = spawn('php', ['-d', 'session.save_path=' + scratch, '-S', '127.0.0.1:' + phpPort, '-t', root, path.join(root, 'tests/support/router.php')], {
    env: { ...process.env, GD_ROOT: root, GD_DB_PATH: path.join(scratch, 'site.sqlite') }, stdio: process.env.ZOMBIEBUS_PHP_LOG ? 'inherit' : 'ignore'
  });
  game = startGame();
  await Promise.all([httpReady(base + '/'), ready()]);
  browser = await chromium.launch({
    headless: true, executablePath: process.env.ZOMBIEBUS_CHROMIUM || undefined, args: ['--no-sandbox']
  });
  const firstContext = await browser.newContext({ viewport: { width: 1380, height: 900 } });
  const first = await firstContext.newPage();
  await first.goto(base + '/');
  const tile = first.locator('article').filter({ has: first.locator('a[href="/zombiebus/"]') });
  assert.equal(await tile.count(), 1);
  assert.equal(await tile.locator('.project-preview-wide').count(), 1);
  await tile.locator('a[href="/zombiebus/"]').click();
  await first.waitForURL(base + '/zombiebus/');
  assert.match(await first.title(), /ZomBUS/);
  await first.locator('#open-settings').focus();
  await first.keyboard.press('Enter');
  assert.equal(await first.evaluate(() => document.activeElement.id), 'music');
  await first.keyboard.press('Escape');
  assert.equal(await first.evaluate(() => document.activeElement.id), 'open-settings');
  const screenshot = process.env.ZOMBIEBUS_SCREENSHOT;
  if (screenshot) {
    await first.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/map/background.png')));
    await first.locator('#game').screenshot({ path: screenshot });
  }
  const mobile = await (await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true })).newPage();
  await mobile.goto(base + '/');
  const preview = mobile.locator('.project-preview-wide:has(.zombiebus-tile-title)');
  await preview.scrollIntoViewIfNeeded();
  await preview.locator('img').evaluate(img => img.decode());
  const [frameBox, titleBox] = await Promise.all([preview.boundingBox(), preview.locator('.zombiebus-tile-title').boundingBox()]);
  assert.ok(titleBox.x >= frameBox.x && titleBox.x + titleBox.width < frameBox.x + frameBox.width);
  if (screenshot) await preview.screenshot({ path: screenshot.replace(/\.png$/, '-tile.png') });
  await mobile.goto(base + '/zombiebus/');
  if (screenshot) await mobile.locator('#game').screenshot({ path: screenshot.replace(/\.png$/, '-mobile.png') });
  for (const selector of ['.gate h1', '#start', '#open-join', '#open-settings']) {
    const box = await mobile.locator(selector).boundingBox();
    assert.ok(box && box.x >= 0 && box.x + box.width <= 375 && box.y + box.height <= 740,
      selector + ' is clipped: ' + JSON.stringify(box));
  }
  await mobile.context().close();
  await first.goto(base + '/zombiebus/?server=' + gamePort);
  await first.evaluate(() => localStorage.setItem('zombiebus-name', 'Ada'));
  await first.reload();
  const ada = await rider(null, 'Ada', first);
  assert.equal(ada.player.inside, true);
  const invite = first.url();
  await ada.page.locator('#game-menu').click();
  await ada.page.locator('#invite').click();
  await ada.page.locator('#notice').waitFor();
  await ada.page.keyboard.press('Escape');
  await move(ada, 'd', p => p.x >= 377);
  await move(ada, 'w', p => p.y <= 338);
  await use(ada, 'Ans Steuer', () => ada.world.driver === ada.id);

  const ben = await rider(invite, 'Ben');
  await until(() => ada.world.players[ben.id], 'Creator does not see mid-stop join');
  assert.deepEqual(Object.keys(ada.world.players).sort(), Object.keys(ben.world.players).sort());
  assert.equal(ada.world.stop, ben.world.stop);
  assert.equal(ada.world.fuel, ben.world.fuel);
  assert.ok(ada.world.zombies.filter(z => ben.world.zombies.some(other => other.id === z.id)).length >= 4);

  const oldAda = ada.id;
  const beforeClose = ben.world.age;
  const close = performance.now();
  await ada.page.close();
  await until(() => !ben.world.players[oldAda] && !ben.world.driver, 'Leaving driver remains in world', 2500);
  assert.ok(performance.now() - close < 2500, 'Normal close should clear the seat before heartbeat expiry');
  assert.match(await ben.page.locator('#crew').textContent(), /^Ben/);
  assert.doesNotMatch(await ben.page.locator('#crew').textContent(), /Ada/);
  await until(() => ben.world.age > beforeClose + .1, 'Simulation stalled after room creator left');
  await move(ben, 'd', p => p.x >= 377);
  await move(ben, 'w', p => p.y <= 338);
  await use(ben, 'Ans Steuer', () => ben.world.driver === ben.id);

  const again = await rider(invite, 'Ada');
  assert.notEqual(again.id, oldAda);
  assert.equal(again.player.inside, true);
  assert.equal(Object.values(again.world.players).filter(p => p.name === 'Ada').length, 1);
  await move(again, 'a', p => p.x <= 303);
  await use(again, 'Aussteigen', () => !again.player.inside);
  await until(async () => (await ben.page.locator('#passenger-status').textContent()).includes('Ada'), 'Driver does not see who is outside');
  assert.equal(await ben.page.locator('#depart').isDisabled(), true);

  await move(again, 'd', p => p.x >= 440);
  const field = await again.page.locator('#scene').boundingBox();
  const target = again.world.zombies.find(z => z.x > 420 && Math.hypot(z.x - again.player.x, z.y - again.player.y) < 242);
  assert.ok(target, 'There should be a zombie within range');
  await again.page.mouse.move(field.x + target.x / 800 * field.width, field.y + (target.y - 7) / 450 * field.height);
  await again.page.mouse.down();
  await until(() => again.player.ammo < 18 && ben.world.zombies.some(z => z.id === target.id && z.hp === 1),
    'Mouse shot did not hit the same zombie in both sessions', 1800);
  await again.page.mouse.up();

  await move(again, 'd', p => p.x >= 646);
  await move(again, 'w', p => p.y <= 201);
  await use(again, 'Waschstraße starten', () => again.world.wash > 0);
  await until(() => again.world.zombies.some(z => z.spinning), 'No zombie spun in the wash');
  await until(() => ben.world.zombies.some(z => z.spinning), 'Wash is not synchronized');
  await move(again, 'd', p => p.x >= 686);
  await use(again, 'Kanister nehmen', () => again.player.cargo === 'fuel');
  if (screenshot) await again.page.locator('#game').screenshot({ path: screenshot.replace(/\.png$/, '-game.png') });
  await move(again, 's', p => p.y >= 380);
  await move(again, 'a', p => p.x <= 306);
  await use(again, 'Vorrat ablegen', () => again.world.fuel >= 56);
  await use(again, 'Einsteigen', () => again.player.inside);
  await until(async () => !(await ben.page.locator('#depart').isDisabled()), 'Departure is still disabled with all aboard');
  await ben.page.locator('#depart').click();
  await until(() => ben.world.phase === 'travel' && again.world.phase === 'travel', 'Trip is not synchronized');
  await until(() => ben.world.stop === 1 && again.world.stop === 1, 'Second stop did not arrive', 9000);
  assert.equal(ben.world.fuel, 24);
  assert.equal(ben.world.cargo.fuel, 1);
  assert.equal(await again.page.locator('#stop').textContent(), 'Gewerbehof');
  assert.ok(again.world.items.some(item => item.x === 698 && item.kind === 'fuel'));

  const code = new URL(invite).searchParams.get('raum');
  const save = path.join(gameEnv.ZOMBIEBUS_DATA, code + '.json');
  const age = ben.world.age;
  await again.page.close();
  await ben.page.close();
  await until(() => JSON.parse(fs.readFileSync(save)).world.stop === 1, 'Last close did not save progress');
  await stop(game);
  game = startGame();
  await ready();
  const restored = await rider(invite, 'Ada');
  assert.equal(restored.world.stop, 1);
  assert.equal(restored.world.fuel, 24);
  assert.equal(restored.world.cargo.fuel, 1);
  assert.ok(restored.world.age < age + 2, 'An empty room must not advance');
  assert.equal(restored.world.driver, null);
  assert.equal(Object.keys(restored.world.players).length, 1);
  assert.equal(restored.player.inside, true);

  const stalled = new WebSocket('ws://127.0.0.1:' + gamePort + '/ws', {
    origin: base, autoPong: false
  });
  await once(stalled, 'open');
  const drop = once(stalled, 'close');
  stalled.send(JSON.stringify({ type: 'join', room: code, name: 'Funkloch', tab: 'ab'.repeat(16) }));
  await until(() => Object.values(restored.world.players).some(p => p.name === 'Funkloch'), 'Heartbeat fixture did not join');
  const stalledSince = performance.now();
  await until(() => !Object.values(restored.world.players).some(p => p.name === 'Funkloch'), 'Heartbeat did not remove stale player', 10000);
  assert.ok(performance.now() - stalledSince >= 4500, 'Heartbeat timed out prematurely');
  await drop;
  assert.deepEqual([...ada.errors, ...ben.errors, ...again.errors, ...restored.errors], []);
  console.log('ZomBUS: tile at desktop and mobile widths, direct URL, keyboard menu, solo start, mid-stop join, driver close, rejoin, shooting, wash, cargo, trip, save/restart and heartbeat passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  await Promise.all([stop(php), stop(game)]);
  fs.rmSync(scratch, { recursive: true, force: true });
});
