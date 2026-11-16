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
  await page.locator('#name').fill(name);
  await page.locator('#join-button').click();
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
  assert.match(await first.title(), /ZomBUS!!!/);
  const screenshot = process.env.ZOMBIEBUS_SCREENSHOT;
  if (screenshot) {
    await first.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/art.mjs')));
    await first.waitForTimeout(250);
    await first.locator('#scene').screenshot({ path: screenshot });
    await first.screenshot({ path: screenshot.replace(/\.png$/, '-page.png') });
  }
  await first.goto(base + '/zombiebus/?server=' + gamePort);
  const ada = await rider(null, 'Ada', first);
  assert.equal(ada.player.inside, true);
  const invite = first.url();
  await move(ada, 'd', p => p.x >= 339);
  await use(ada, 'Ans Steuer', () => ada.world.driver === ada.id);

  const ben = await rider(invite, 'Ben');
  await until(() => ada.world.players[ben.id], 'Creator does not see mid-stop join');
  assert.deepEqual(Object.keys(ada.world.players).sort(), Object.keys(ben.world.players).sort());
  assert.equal(ada.world.stop, ben.world.stop);
  assert.equal(ada.world.fuel, ben.world.fuel);
  assert.ok(ada.world.zombies.filter(z => ben.world.zombies.some(other => other.id === z.id)).length >= 4);

  const oldAda = ada.id;
  const close = performance.now();
  await ada.page.close();
  await until(() => !ben.world.players[oldAda] && !ben.world.driver, 'Leaving driver remains in world', 2500);
  assert.ok(performance.now() - close < 2500, 'Normal close should clear the seat before heartbeat expiry');
  assert.match(await ben.page.locator('#crew').textContent(), /^Ben/);
  await move(ben, 'd', p => p.x >= 339);
  await use(ben, 'Ans Steuer', () => ben.world.driver === ben.id);

  const again = await rider(invite, 'Ada');
  assert.notEqual(again.id, oldAda);
  assert.equal(again.player.inside, true);
  assert.equal(Object.values(again.world.players).filter(p => p.name === 'Ada').length, 1);
  await move(again, 's', p => p.y >= 308);
  await use(again, 'Aussteigen', () => !again.player.inside);
  await until(async () => (await ben.page.locator('#passenger-status').textContent()).includes('Ada'), 'Driver does not see who is outside');
  assert.equal(await ben.page.locator('#depart').isDisabled(), true);

  await move(again, 'd', p => p.x >= 405);
  const field = await again.page.locator('#scene').boundingBox();
  const target = again.world.zombies.find(z => z.x > 420 && Math.hypot(z.x - again.player.x, z.y - again.player.y) < 242);
  assert.ok(target, 'There should be a zombie within range');
  await again.page.mouse.move(field.x + target.x / 800 * field.width, field.y + (target.y - 7) / 450 * field.height);
  await again.page.mouse.down();
  await until(() => again.player.ammo < 18 && ben.world.zombies.some(z => z.id === target.id && z.hp === 1),
    'Mouse shot did not hit the same zombie in both sessions', 1800);
  await again.page.mouse.up();

  await move(again, 'd', p => p.x >= 571);
  await move(again, 'w', p => p.y <= 178);
  await use(again, 'Waschstraße starten', () => again.world.wash > 0);
  await until(() => again.world.zombies.some(z => z.spinning), 'No zombie spun in the wash');
  await until(() => ben.world.zombies.some(z => z.spinning), 'Wash is not synchronized');
  if (again.player.y < 174) await move(again, 's', p => p.y >= 177);
  await move(again, 'd', p => p.x >= 666);
  await move(again, 'w', p => p.y <= 157);
  await use(again, 'Kanister nehmen', () => again.player.cargo === 'fuel');
  await move(again, 's', p => p.y >= 347);
  await move(again, 'a', p => p.x <= 340);
  if (again.player.y > 338) await move(again, 'w', p => p.y <= 338);
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

  await move(restored, 's', p => p.y >= 309);
  await use(restored, 'Aussteigen', () => !restored.player.inside);
  await move(restored, 'd', p => p.x >= 691);
  await move(restored, 'w', p => p.y <= 201);
  await use(restored, 'Kanister nehmen', () => restored.player.cargo === 'fuel');
  await move(restored, 's', p => p.y >= 338);
  await move(restored, 'a', p => p.x <= 339);
  if (restored.player.y > 338) await move(restored, 'w', p => p.y <= 338);
  await use(restored, 'Vorrat ablegen', () => restored.world.fuel === 64);
  await use(restored, 'Einsteigen', () => restored.player.inside);
  await move(restored, 'd', p => p.x >= 339);
  await use(restored, 'Ans Steuer', () => restored.world.driver === restored.id);
  await restored.page.locator('#depart').click();
  await until(() => restored.world.phase === 'complete', 'Solo player did not reach the terminus', 9000);
  assert.equal(await restored.page.locator('#finished h2').textContent(), 'Alle an Bord angekommen.');
  assert.deepEqual([...ada.errors, ...ben.errors, ...again.errors, ...restored.errors], []);
  console.log('ZomBUS: tile, direct URL, mid-stop join, driver close, rejoin, shooting, wash, cargo, trip, save/restart, heartbeat and solo arrival passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  await Promise.all([stop(php), stop(game)]);
  fs.rmSync(scratch, { recursive: true, force: true });
});
