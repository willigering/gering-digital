'use strict';
// Zwei unabhängige Browsersitzungen spielen eine komplette Runde über echte WebRTC-Datenkanäle.
// Standard ist das Host-Modell: Sitzung A eröffnet eine Baustelle und rechnet das Spiel, Sitzung B tritt bei.
//   php -S localhost:8788 -t <Repo-Wurzel>     (liefert /myground/ samt api.php aus)
//   node test/browser.js              direkte Verbindung
//   RELAY=1 node test/browser.js      Gast erzwingt iceTransportPolicy "relay"; geprüft wird das ausgewählte ICE-Kandidatenpaar
//   RELAY=2 node test/browser.js      Host und Gast erzwingen das Relay
//   MODE=server MG_URL=http://localhost:8787 node test/browser.js   gegen den optionalen Node-Spielserver
// Braucht Playwright (NODE_PATH); PW_CHANNEL=chrome nimmt das installierte Chrome.
const assert = require('node:assert');
const { chromium } = require('playwright');

const SERVER_MODE = process.env.MODE === 'server', RELAY = +(process.env.RELAY || 0);
const BASE = (process.env.MG_URL || (SERVER_MODE ? 'http://localhost:8787' : 'http://localhost:8788')) + '/myground/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = page => page.evaluate(() => window.__mg.state);

// how: 'create' eröffnet eine Baustelle, 'link' kommt über den Einladungslink, 'list' über die Raumliste
async function join(browser, name, how, room, relay) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); // eigene Sitzung: kein geteilter Speicher
  const page = await ctx.newPage();
  page.on('pageerror', e => { throw e; });
  const q = new URLSearchParams(); if (relay) q.set('relay', '1'); if (how === 'link') q.set('raum', room);
  await page.goto(BASE + (q.size ? '?' + q : ''));
  assert.strictEqual(await page.textContent('#status'), 'Getrennt');
  await page.fill('#name', name);
  if (how === 'list') await page.click('#roomList button[data-room="' + room + '"]', { timeout: 8000 });
  else await page.click(how === 'create' ? '#createBtn' : '#joinBtn');
  await page.waitForFunction(() => window.__mg.state.connected, null, { timeout: 30000 });
  assert.match(await page.textContent('#status'), how === 'create' ? /^Host/ : /^Verbunden/);
  if (await page.isVisible('#help.on')) await page.click('#helpClose');
  return page;
}
// Fährt per Tastatur über das feste Grundgerüst zum Zielfeld.
async function drive(page, goal, timeoutMs = 60000) {
  const map = await page.evaluate(() => { const m = window.__mg.map(); return { W: m.W, H: m.H, fixed: Array.from(m.fixed) }; });
  const { W, H, fixed } = map, from = new Int16Array(W * H).fill(-1), q = [goal.y * W + goal.x];
  from[q[0]] = q[0];
  for (let h = 0; h < q.length; h++) { const x = q[h] % W, y = (q[h] - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && fixed[j] && from[j] < 0) { from[j] = q[h]; q.push(j); } } }
  const held = new Set(), set = async want => { for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); } for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); } };
  const end = Date.now() + timeoutMs;
  for (;;) {
    assert.ok(Date.now() < end, 'Ziel nicht erreicht: ' + JSON.stringify(goal));
    const s = await st(page), me = s.me;
    if (s.phase === 'result') { await set(new Set()); return s; }
    if (!me || me.st !== 0) { await set(new Set()); await sleep(100); continue; }
    const cx = Math.floor(me.tx), cy = Math.floor(me.ty), i = cy * W + cx;
    if (cx === goal.x && cy === goal.y && Math.abs(me.tx - cx - 0.5) < 0.3 && Math.abs(me.ty - cy - 0.5) < 0.3) { await set(new Set()); return s; }
    const n = from[i] < 0 || from[i] === i ? i : from[i], tx = (n % W) + 0.5, ty = Math.floor(n / W) + 0.5, want = new Set();
    const horiz = Math.floor(ty) === cy && n !== i, ox = cx + 0.5 - me.tx, oy = cy + 0.5 - me.ty;
    if (n !== i && horiz && Math.abs(oy) > 0.18) want.add(oy > 0 ? 'ArrowDown' : 'ArrowUp');
    else if (n !== i && !horiz && Math.abs(ox) > 0.18) want.add(ox > 0 ? 'ArrowRight' : 'ArrowLeft');
    else { if (tx - me.tx > 0.12) want.add('KeyD'); else if (tx - me.tx < -0.12) want.add('KeyA'); if (ty - me.ty > 0.12) want.add('KeyS'); else if (ty - me.ty < -0.12) want.add('KeyW'); }
    await set(want); await sleep(40);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined });
  const out = { modell: SERVER_MODE ? 'Node-Spielserver' : 'Browser-Host', mode: RELAY === 2 ? 'relay (Host und Gast erzwungen)' : RELAY ? 'relay (Gast erzwungen)' : 'direkt' };
  try {
    const a = await join(browser, 'Anke', SERVER_MODE ? 'server' : 'create', '', RELAY === 2 || (SERVER_MODE && RELAY));
    const room = (await st(a)).room;
    if (!SERVER_MODE) { assert.match(room, /^[A-Z]{4}$/); assert.strictEqual((await st(a)).hosting, true); out.raum = room; }
    const b = await join(browser, 'Bernd', SERVER_MODE ? 'server' : 'link', room, !!RELAY);
    await a.waitForFunction(() => window.__mg.state.players === 2);
    await b.waitForFunction(() => window.__mg.state.players === 2);
    // Verbindungsart anhand des ausgewählten ICE-Kandidatenpaars (Gast; im Host-Modell zusätzlich die Host-Seite)
    out.pairB = await b.evaluate(() => window.__mg.selectedPair());
    out.pairA = SERVER_MODE ? await a.evaluate(() => window.__mg.selectedPair()) : (await a.evaluate(() => window.__mg.hostPairs()))[0];
    if (RELAY) {
      assert.strictEqual(out.pairB.local, 'relay', 'lokaler Kandidat des Gasts muss relay sein'); assert.ok(out.pairB.bytesSent > 0 && out.pairB.bytesReceived > 0); assert.match(await b.textContent('#status'), /Relay/);
      if (RELAY === 2 || SERVER_MODE) assert.strictEqual(out.pairA.local, 'relay', 'lokaler Kandidat von A muss relay sein');
    }
    assert.strictEqual(await a.isDisabled('#start'), false);
    await a.click('#start');                                             // Rundenstart durch Gast A
    await b.waitForFunction(() => window.__mg.state.phase === 'countdown');
    await a.waitForFunction(() => window.__mg.state.phase === 'play', null, { timeout: 8000 });
    assert.match(await a.textContent('#timer'), /^[34]:\d\d$/);

    // Gast B: eine gelbe Platte neben dem festen Gerüst greifen, drehen, ablegen, springen
    const pick = await b.evaluate(() => { const m = window.__mg.map(), s = window.__mg.state; for (const p of s.plates) for (const [dx, dy, face] of [[0, -1, 2], [1, 0, 3], [0, 1, 0], [-1, 0, 1]]) { const x = p.cx + dx, y = p.cy + dy; if (x >= 0 && y >= 0 && x < m.W && y < m.H && m.fixed[y * m.W + x]) return { id: p.id, x, y, face, px: p.cx, py: p.cy }; } });
    await drive(b, { x: pick.x, y: pick.y });
    const faceKey = ['KeyW', 'KeyD', 'KeyS', 'KeyA'][pick.face];
    await b.keyboard.down(faceKey); await sleep(60); await b.keyboard.up(faceKey); await sleep(150);
    let sb = await st(b);
    if (Math.floor(sb.me.tx) !== pick.x || Math.floor(sb.me.ty) !== pick.y) { await drive(b, { x: pick.x, y: pick.y }); await b.keyboard.down(faceKey); await sleep(30); await b.keyboard.up(faceKey); await sleep(150); }
    await b.keyboard.press('KeyE');
    await b.waitForFunction(id => window.__mg.state.plates[id].state === 'held', pick.id, { timeout: 4000 });
    sb = await st(b);
    assert.strictEqual(sb.plates[pick.id].holder, sb.myId, 'Server hat die Platte Gast B zugeteilt');
    assert.strictEqual((await st(a)).plates[pick.id].holder, sb.myId, 'Gast A sieht denselben Besitzer');
    if (process.env.SHOT) await b.screenshot({ path: process.env.SHOT });
    await b.keyboard.press('KeyR');
    await b.waitForFunction(id => window.__mg.state.plates[id].rot === 1, pick.id, { timeout: 3000 });
    await b.keyboard.press('KeyE');                                      // zurück auf das freie Feld davor
    await b.waitForFunction(id => window.__mg.state.plates[id].state === 'ground', pick.id, { timeout: 4000 });
    sb = await st(b);
    assert.deepStrictEqual([sb.plates[pick.id].cx, sb.plates[pick.id].cy, sb.plates[pick.id].rot], [pick.px, pick.py, 1]);
    await b.keyboard.press('Space');
    await b.waitForFunction(() => window.__mg.state.me.st === 1, null, { timeout: 2000 });
    out.actions = 'greifen, drehen, ablegen, springen: ok';

    // Gast A: drei Stempel in beliebiger Reihenfolge, dann zum Tor
    const m = await a.evaluate(() => { const x = window.__mg.map(); return { stations: x.stations, gate: x.gate }; });
    for (const i of [1, 0, 2]) { await drive(a, m.stations[i]); await a.waitForFunction(bit => window.__mg.state.stamps & bit, 1 << i, { timeout: 3000 }); }
    assert.strictEqual((await st(a)).stamps, 7);
    assert.strictEqual(await a.locator('#stamps i.has').count(), 3);
    await drive(a, m.gate);
    await a.waitForFunction(() => window.__mg.state.phase === 'result', null, { timeout: 5000 });
    const ra = (await st(a)).result, rb = (await st(b)).result;
    assert.strictEqual(ra.winner, (await st(a)).myId); assert.strictEqual(ra.reason, 'tor'); assert.strictEqual(rb.winner, ra.winner);
    assert.ok(await b.isVisible('#result.on'));
    assert.match(await b.textContent('#resTitle'), /Anke gewinnt/);
    out.round = 'komplette Runde: Sieger ' + ra.rank[0].name + ' (Tor, 3 Stempel)';

    // direkter Wiedereinstieg aus dem Ergebnis
    await b.click('#again');
    await a.waitForFunction(() => window.__mg.state.phase === 'countdown', null, { timeout: 4000 });
    assert.strictEqual(await a.isVisible('#result.on'), false);
    out.rejoin = 'Wiedereinstieg: ok';

    // Verbindungsabbruch: B verschwindet, A bleibt allein und sieht das sofort
    if (RELAY) { const pair = await b.evaluate(() => window.__mg.selectedPair()); out.pairBEnd = pair; assert.strictEqual(pair.local, 'relay'); assert.ok(pair.bytesSent > out.pairB.bytesSent + 1000 && pair.bytesReceived > out.pairB.bytesReceived + 20000, 'Spielverkehr lief über das Relay'); }
    await b.context().close();
    await a.waitForFunction(() => window.__mg.state.players === 1, null, { timeout: 20000 });
    out.disconnect = 'Abbruch des Gasts erkannt: ok';
    if (!SERVER_MODE) {
      // Dritte Sitzung kommt über die Raumliste; danach verschwindet der Host
      const c = await join(browser, 'Cem', 'list', room, false);
      await a.waitForFunction(() => window.__mg.state.players === 2);
      out.liste = 'Beitritt über die Raumliste: ok';
      await a.context().close();
      await c.waitForSelector('#lost.on', { timeout: 15000 });
      assert.match(await c.textContent('#status'), /Getrennt/);
      out.hostWeg = 'Host weg: Gast bekommt Störungsmeldung mit „Erneut verbinden“: ok';
    }
    console.log(JSON.stringify(out, null, 1));
    console.log('BROWSERTEST OK');
  } finally { await browser.close(); }
})().catch(e => { console.error('BROWSERTEST FEHLGESCHLAGEN:', e); process.exit(1); });
