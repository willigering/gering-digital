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
    await until(() => at(rider.player, rider.world), 'Movement failed (' + key + ') ' + JSON.stringify(rider.player), 9000);
  } finally {
    await rider.page.keyboard.up(key);
  }
}

async function use(rider, label, finished) {
  await until(async () => (await rider.page.locator('#prompt').isVisible()) &&
    (await rider.page.locator('#prompt').textContent()).includes(label), 'Missing interaction ' + label + ' ' + JSON.stringify(rider.player));
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
    await first.waitForFunction(() => {
      const resources = performance.getEntriesByType('resource');
      return ['doener-eck.webp', 'nachtbus-offen.webp', 'figuren.webp']
        .every(file => resources.some(entry => entry.name.endsWith('/' + file)));
    });
    await first.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await first.locator('#scene').screenshot({ path: screenshot });
    await first.screenshot({ path: screenshot.replace(/\.png$/, '-page.png') });
  }
  await first.goto(base + '/zombiebus/?server=' + gamePort);
  const { BUS, DOOR, DEPOT, blocked, busCenter, busPoint, cameraFor } = await import('../zombiebus/world.mjs');
  const ada = await rider(null, 'Ada', first);
  assert.equal(ada.player.inside, true);
  const invite = first.url();
  const seat = async current => {
    if (current.player.x < 345) await move(current, 'd', p => p.x >= 345);
    await use(current, 'Ans Steuer', () => current.world.driver === current.id);
  };
  const exitBus = async current => {
    if (current.player.x > DOOR.x + 16) await move(current, 'a', p => p.x <= DOOR.x + 13);
    await use(current, 'Aussteigen', () => !current.player.inside);
  };
  const drive = async current => {
    await current.page.locator('#depart').click();
    await until(() => current.world.phase === 'travel', 'Could not start driving');
  };
  const park = async current => {
    await current.page.keyboard.press('e');
    await until(() => current.world.phase === 'stop' && !current.world.driver, 'Could not park');
  };

  await seat(ada);
  const ben = await rider(invite, 'Ben');
  await until(() => ada.world.players[ben.id], 'Creator does not see mid-stop join');
  assert.deepEqual(Object.keys(ada.world.players).sort(), Object.keys(ben.world.players).sort());
  assert.equal(ada.world.fuel, ben.world.fuel);
  assert.ok(ada.world.zombies.filter(z => ben.world.zombies.some(other => other.id === z.id)).length >= 4);

  const oldAda = ada.id;
  const close = performance.now();
  await ada.page.close();
  await until(() => !ben.world.players[oldAda] && !ben.world.driver, 'Leaving driver remains in world', 2500);
  assert.ok(performance.now() - close < 2500, 'Normal close should clear the seat before heartbeat expiry');
  assert.match(await ben.page.locator('#crew').textContent(), /^Ben/);
  await seat(ben);

  const again = await rider(invite, 'Ada');
  assert.notEqual(again.id, oldAda);
  assert.equal(again.player.inside, true);
  assert.equal(Object.values(again.world.players).filter(p => p.name === 'Ada').length, 1);
  await exitBus(again);
  await until(async () => (await ben.page.locator('#passenger-status').textContent()).includes('Ada'), 'Driver does not see who is outside');
  assert.equal(await ben.page.locator('#depart').isDisabled(), true);
  await use(again, 'Einsteigen', () => again.player.inside);
  await until(async () => !(await ben.page.locator('#depart').isDisabled()), 'Departure is still disabled with all aboard');

  await drive(ben);
  await move(ben, 'd', (_, world) => world.bus.x >= 469);
  await until(() => again.world.bus.x > BUS.x + 200, 'Second session does not see the bus moving');
  const beforeTurning = ben.world.bus.y;
  await move(ben, 's', (_, world) => world.bus.y >= beforeTurning + 18);
  await park(ben);
  assert.ok(ben.world.bus.x >= 469 && ben.world.bus.x < 500);
  assert.ok(ben.world.fuel < 38);
  await until(() => again.world.phase === 'stop' && again.world.bus.x === ben.world.bus.x, 'Parking is not synchronized');
  const door = busPoint(again.world.bus, DOOR);

  await exitBus(again);
  const shooter = again.player;
  const target = again.world.zombies.find(z => {
    const length = Math.hypot(z.x - shooter.x, z.y - shooter.y);
    return length > 18 && length < 205 && [0.15, 0.4, 0.65, 0.9].every(fraction =>
      !blocked(again.world, shooter.x + (z.x - shooter.x) * fraction, shooter.y + (z.y - shooter.y) * fraction));
  });
  assert.ok(target, 'There should be a zombie within range');
  const field = await again.page.locator('#scene').boundingBox();
  const origin = cameraFor(again.world.bus, again.player);
  await again.page.mouse.move(field.x + (target.x - origin.x) / 800 * field.width, field.y + (target.y - 15) / 450 * field.height);
  await again.page.mouse.down();
  await until(() => again.player.ammo < 18 && ben.world.zombies.some(z => z.id === target.id && z.hp === 1),
    'Mouse shot did not hit the same zombie in both sessions', 1800);
  await again.page.mouse.up();

  if (again.player.x > 650) await move(again, 'a', p => p.x <= 641);
  if (again.player.x < 629) await move(again, 'd', p => p.x >= 634);
  // Go around the front of the bus before walking up to the control panel.
  await move(again, 'd', p => p.x >= again.world.bus.x + BUS.w + 12);
  await move(again, 'w', p => p.y <= 237);
  await move(again, 'a', p => p.x <= 645);
  await move(again, 'w', p => p.y <= 210);
  await use(again, 'Waschstraße starten', () => again.world.wash > 0);
  await until(() => ben.world.zombies.some(z => z.spinning), 'Wash is not synchronized');

  if (again.player.y < 230) await move(again, 's', p => p.y >= 232);
  await move(again, 'd', p => p.x >= again.world.bus.x + BUS.w + 12);
  await move(again, 's', p => p.y >= Math.max(338, door.y + 15));
  await move(again, 'a', p => p.x <= 710);
  await use(again, 'Kanister nehmen', () => again.player.cargo === 'fuel');
  if (again.player.y < door.y + 11) await move(again, 's', p => p.y >= door.y + 13);
  await move(again, 'a', p => p.x <= door.x + 6);
  if (again.player.y > door.y + 19) await move(again, 'w', p => p.y <= door.y + 18);
  await use(again, 'Vorrat ablegen', () => again.world.cargo.fuel === 1);
  await use(again, 'Einsteigen', () => again.player.inside);

  await seat(ben);
  await drive(ben);
  await move(ben, 'd', (_, world) => world.bus.x >= 1003);
  await park(ben);
  assert.equal(ben.world.stop, 1);
  await until(async () => (await again.page.locator('#stop').textContent()) === 'Gewerbehof', 'Second district did not render');
  assert.ok(again.world.items.some(item => item.x === 1253 && item.kind === 'fuel'));

  const code = new URL(invite).searchParams.get('raum');
  const save = path.join(gameEnv.ZOMBIEBUS_DATA, code + '.json');
  const age = ben.world.age;
  const savedX = ben.world.bus.x;
  const savedFuel = ben.world.fuel;
  await again.page.close();
  await ben.page.close();
  await until(() => JSON.parse(fs.readFileSync(save)).world.bus?.x === savedX, 'Last close did not save the parked position');
  await stop(game);
  game = startGame();
  await ready();
  const restored = await rider(invite, 'Ada');
  assert.equal(restored.world.stop, 1);
  assert.equal(restored.world.bus.x, savedX);
  assert.equal(restored.world.fuel, savedFuel);
  assert.equal(restored.world.cargo.fuel, 1);
  assert.ok(restored.world.age < age + 2, 'An empty room must not advance');
  assert.equal(restored.world.driver, null);
  assert.equal(Object.keys(restored.world.players).length, 1);
  assert.equal(restored.player.inside, true);

  await seat(restored);
  await drive(restored);
  await move(restored, 'a', (_, world) => world.bus.x <= savedX - 35);
  assert.equal(restored.world.bus.face, -1);
  await move(restored, 'd', (_, world) => busCenter(world.bus).x >= DEPOT.x - 60);
  await park(restored);
  assert.equal(restored.world.stop, 2);
  await seat(restored);
  await restored.page.locator('#finish-route').click();
  await until(() => restored.world.phase === 'complete', 'Solo player did not finish at the depot');
  assert.equal(await restored.page.locator('#finished h2').textContent(), 'Alle an Bord angekommen.');

  const stalled = new WebSocket('ws://127.0.0.1:' + gamePort + '/ws', { origin: base, autoPong: false });
  await once(stalled, 'open');
  const drop = once(stalled, 'close');
  stalled.send(JSON.stringify({ type: 'join', room: code, name: 'Funkloch', tab: 'ab'.repeat(16) }));
  await until(() => Object.values(restored.world.players).some(p => p.name === 'Funkloch'), 'Heartbeat fixture did not join');
  await until(() => !Object.values(restored.world.players).some(p => p.name === 'Funkloch'), 'Heartbeat did not remove stale player', 10000);
  await drop;
  assert.deepEqual([...ada.errors, ...ben.errors, ...again.errors, ...restored.errors], []);
  console.log('ZomBUS: artwork, tile, two sessions, driver close, rejoin, shooting, wash, WASD driving, parking, supplies, save/restart, reverse, depot and heartbeat passed.');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  await Promise.all([stop(php), stop(game)]);
  fs.rmSync(scratch, { recursive: true, force: true });
});
