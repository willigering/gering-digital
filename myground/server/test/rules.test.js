'use strict';
// Regeltests der Spiellogik (Brückenbau-Rennen): node --test test/rules.test.js
const test = require('node:test');
const assert = require('node:assert');
const { Game, C, W, H } = require('../game');

function mk(plates = []) {
  const msgs = [];
  const g = new Game({ seed: 7, emit: (m, to) => msgs.push({ m, to }) });
  g.plates = []; g.grid.fill(-1); g.reserved.fill(0);
  for (const [cx, cy] of plates) { const id = g.plates.length; g.plates.push({ id, cx, cy, rot: 0, rails: 0, state: 'ground', holder: -1, t: 0, tx: 0, ty: 0, fx: 0, fy: 0, rideT: 0 }); g.grid[cy * W + cx] = id; }
  g.msgs = msgs;
  return g;
}
const put = (p, x, y, face) => { p.x = x + 0.5; p.y = y + 0.5; if (face != null) p.face = face; };
const run = (g, s) => { for (let i = 0; i < Math.round(s / C.TICK); i++) g.step(); };
const cell = p => [Math.floor(p.x), Math.floor(p.y)];
const valid = g => { // jede Platte liegt auf genau einem freien, nicht festen Feld
  const seen = new Set();
  for (const pl of g.plates) {
    assert.strictEqual(pl.state, 'ground'); assert.strictEqual(pl.holder, -1);
    assert.strictEqual(g.grid[pl.cy * W + pl.cx], pl.id); assert.strictEqual(g.map.fixed[pl.cy * W + pl.cx], 0);
    assert.ok(!seen.has(pl.cy * W + pl.cx)); seen.add(pl.cy * W + pl.cx);
  }
  assert.strictEqual(g.reserved.reduce((a, b) => a + b, 0), 0);
};
const reach = (g, from) => { // alle über Boden erreichbaren Felder
  const seen = new Set([from]), q = [from];
  while (q.length) { const i = q.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * W + x + dx; if (g.solid(x + dx, y + dy) && !seen.has(j)) { seen.add(j); q.push(j); } } }
  return seen;
};

test('Karte: Stationen, Tor und 48 Startpunkte liegen auf festem Boden; ohne Platten kommt man vom Start nirgends hin', () => {
  const g = mk();
  assert.strictEqual(g.map.spawns.length, 48);
  for (const p of [...g.map.stations, g.map.gate, ...g.map.spawns]) assert.strictEqual(g.map.fixed[p.y * W + p.x], 1);
  const r = reach(g, 11 * W + 10);
  for (const p of [...g.map.stations, g.map.gate]) assert.ok(!r.has(p.y * W + p.x), 'nur mit Brücke erreichbar: ' + p.x + ',' + p.y);
  for (const s of g.map.spawns) assert.ok(r.has(s.y * W + s.x));
});

test('Karte: keine Lücke zwischen festen Feldern ist auf den Wegen länger als drei Felder', () => {
  const g = mk();
  // jedes Ziel ist erreichbar, wenn man Lücken bis drei Felder Länge überbrücken darf
  const seen = new Set([11 * W + 10]), q = [11 * W + 10];
  while (q.length) {
    const i = q.pop(), x = i % W, y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let n = 1; n <= 4; n++) {
      const nx = x + dx * n, ny = y + dy * n; if (!g.inb(nx, ny)) break;
      if (g.map.fixed[ny * W + nx]) { if (!seen.has(ny * W + nx)) { seen.add(ny * W + nx); q.push(ny * W + nx); } break; }
    }
  }
  for (const p of [...g.map.stations, g.map.gate]) assert.ok(seen.has(p.y * W + p.x), p.x + ',' + p.y);
});

test('Niemand fällt runter: an der Kante ist Schluss', () => {
  const g = mk();
  const a = g.addPlayer('A'); put(a, 10, 11);
  g.setInput(a.id, 0, -1); run(g, 2);
  assert.deepStrictEqual(cell(a), [10, 11]); assert.strictEqual(a.state, 'alive');
  g.setInput(a.id, -1, 1); run(g, 12);                       // schräg in die Ecke
  assert.deepStrictEqual(cell(a), [0, 12]); assert.strictEqual(a.state, 'alive');
});

test('Eine gelbe Platte ist Boden: sie schließt die Lücke zum Pfeiler', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'); put(a, 10, 11);
  g.setInput(a.id, 0, -1); run(g, 3);
  assert.deepStrictEqual(cell(a), [10, 9]);                  // Platte (10,10), Pfeiler (10,9), dann Lücke
});

test('Gleichzeitiges Greifen: die Platte geht eindeutig an die erste Anfrage', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  put(a, 10, 11, 0); put(b, 10, 9, 2);
  assert.strictEqual(g.act(a.id, 'grab'), true);
  assert.strictEqual(g.act(b.id, 'grab'), false);
  assert.strictEqual(g.plates[0].holder, a.id); assert.strictEqual(b.hold, -1);
  assert.ok(g.msgs.some(x => x.to === b.id && /anderen Haken/.test(x.m.text)));
});

test('Brücke bauen: greifen, tragen, in die Lücke legen, drüberfahren', () => {
  const g = mk([[9, 10], [10, 10]]);
  const a = g.addPlayer('A'); put(a, 10, 10, 3);             // steht auf der einen, greift die andere
  assert.strictEqual(g.act(a.id, 'grab'), true); run(g, C.REACH + 0.1);
  assert.strictEqual(g.plates[0].state, 'held');
  put(a, 10, 9, 0);                                          // auf dem Pfeiler, Blick in die Lücke (10,8)
  assert.strictEqual(g.act(a.id, 'grab'), true); run(g, C.DROP + 0.1);
  assert.deepStrictEqual([g.plates[0].cx, g.plates[0].cy], [10, 8]); valid(g);
  g.setInput(a.id, 0, -1); run(g, 2);
  assert.deepStrictEqual(cell(a), [10, 5]);                  // über die Stempelinsel bis an deren obere Kante
});

test('Ablegen nur auf ein freies Feld direkt vor dem Kran', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'); put(a, 10, 11, 0);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  put(a, 9, 11, 1);                                          // vor mir fester Boden
  assert.strictEqual(g.act(a.id, 'grab'), false);
  assert.ok(g.msgs.some(x => x.to === a.id && /kein Platz/.test(x.m.text)));
  a.face = 0; assert.strictEqual(g.act(a.id, 'grab'), true); run(g, C.DROP + 0.1);
  assert.deepStrictEqual([g.plates[0].cx, g.plates[0].cy], [9, 10]); valid(g);
});

test('Du kranst mich mal: wer auf der Platte steht, fährt mit und landet am Ablageort', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  put(a, 10, 11, 0); put(b, 10, 10);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  assert.strictEqual(b.ride, 0);
  assert.ok(g.msgs.some(x => x.to === b.id && x.m.t === 'msg'));
  g.setInput(a.id, 1, 0); run(g, 1); g.setInput(a.id, 0, 0);
  a.face = 0; const [ax] = cell(a);
  assert.strictEqual(g.act(a.id, 'grab'), true); run(g, C.DROP + 0.1);
  assert.strictEqual(b.ride, -1); assert.strictEqual(b.state, 'alive');
  assert.deepStrictEqual(cell(b), [ax, 10]); valid(g);
});

test('Fahrgäste darf man höchstens sechs Sekunden tragen, dann setzt der Haken ab', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  put(a, 10, 11, 0); put(b, 10, 10);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  run(g, C.KIDNAP - 0.5); assert.strictEqual(g.plates[0].state, 'held');
  run(g, 1);
  assert.strictEqual(a.hold, -1); assert.strictEqual(b.ride, -1); assert.strictEqual(b.state, 'alive'); valid(g);
  assert.ok(g.solid(...cell(b)));
});

test('Zurück zum Start: kurze Pause, eigener Startplatz, Stempel bleiben, Platte am Haken wird frei', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  a.stamps = 3; put(a, 10, 11, 0);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  assert.strictEqual(g.act(a.id, 'home'), true);
  assert.strictEqual(a.state, 'fallen'); valid(g);
  assert.strictEqual(g.act(a.id, 'home'), false);
  run(g, C.TOW + 0.1);
  assert.strictEqual(a.state, 'alive'); assert.strictEqual(a.stamps, 3);
  assert.strictEqual(g.map.fixed[Math.floor(a.y) * W + Math.floor(a.x)], 1);
  assert.strictEqual(g.act(a.id, 'home'), false);            // Abklingzeit
  run(g, C.TOW_CD); assert.strictEqual(g.act(a.id, 'home'), true);
  assert.ok(b);
});

test('Sprung und Drehen gibt es nicht mehr', () => {
  const g = mk([[10, 10]]);
  const a = g.addPlayer('A'); put(a, 10, 11, 0);
  assert.strictEqual(g.act(a.id, 'jump'), false);
  assert.strictEqual(g.act(a.id, 'rot'), false);
  assert.strictEqual(a.state, 'alive');
});

test('Stempel in beliebiger Reihenfolge und Sieg am Tor', () => {
  const g = mk();
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  g.start(a.id); run(g, C.COUNTDOWN + 0.1);
  assert.strictEqual(g.phase, 'play');
  const [s0, s1, s2] = g.map.stations;
  put(a, g.map.gate.x, g.map.gate.y); run(g, 0.1);
  assert.strictEqual(g.phase, 'play');                       // ohne Stempel kein Ausgang
  put(a, s2.x, s2.y); run(g, 0.1); put(a, s0.x, s0.y); run(g, 0.1); put(a, s1.x, s1.y); run(g, 0.1);
  assert.strictEqual(a.stamps, 7);
  put(a, g.map.gate.x, g.map.gate.y); run(g, 0.1);
  assert.strictEqual(g.phase, 'result'); assert.strictEqual(g.result.winner, a.id); assert.strictEqual(g.result.reason, 'tor');
  assert.ok(b);
});

test('Zeitlimit: meiste Stempel gewinnt; bei Gleichstand, wer die Zahl zuerst hatte; ohne Stempel entscheidet das Los', () => {
  let g = mk();
  let a = g.addPlayer('A'), b = g.addPlayer('B'), c = g.addPlayer('C');
  g.start(a.id); run(g, C.COUNTDOWN + 0.1);
  const [s0, s1] = g.map.stations;
  put(b, s0.x, s0.y); run(g, 0.1); put(c, s0.x, s0.y); run(g, 0.1); put(c, s1.x, s1.y); run(g, 0.1); put(b, s1.x, s1.y); run(g, 0.1);
  run(g, C.ROUND);
  assert.strictEqual(g.phase, 'result'); assert.strictEqual(g.result.reason, 'zeit');
  assert.deepStrictEqual(g.result.rank.map(p => p.id), [c.id, b.id, a.id]);
  g = mk(); a = g.addPlayer('A'); b = g.addPlayer('B');
  g.start(a.id); run(g, C.COUNTDOWN + C.ROUND + 0.2);
  assert.strictEqual(g.result.reason, 'los');
  assert.strictEqual(g.result.rank.filter(p => p.id === g.result.winner).length, 1);
});

test('Verbindungsabbruch mit Platte am Haken: Platte liegt sofort wieder gültig, Mitfahrer steht drauf', () => {
  for (const when of ['reach', 'held', 'drop']) {
    const g = mk([[10, 10]]);
    const a = g.addPlayer('A'), b = g.addPlayer('B'), c = g.addPlayer('C');
    put(a, 10, 11, 0); put(b, 10, 10);
    g.act(a.id, 'grab');
    if (when !== 'reach') run(g, C.REACH + 0.1);
    if (when === 'drop') { put(a, 9, 11, 0); g.act(a.id, 'grab'); }
    g.removePlayer(a.id);
    run(g, C.DROP + 0.1);
    valid(g);
    assert.strictEqual(b.ride, -1); assert.strictEqual(b.state, 'alive'); assert.ok(g.solid(...cell(b)), when);
    assert.ok(c);
  }
});

test('Rundenstart: Baumaterial liegt als Lager vor der Startfläche, die Menge richtet sich nach der Zahl der Kräne', () => {
  const g = new Game({ seed: 3, allowBots: true });
  const a = g.addPlayer('A');
  assert.strictEqual(g.start(a.id), false);                  // allein kein Rennen
  g.addPlayer('B');
  assert.strictEqual(g.start(a.id), true);
  assert.strictEqual(g.plates.length, 12);
  for (const pl of g.plates) assert.ok(pl.cy === 10 || pl.cy === 9);
  valid(g);
  run(g, C.COUNTDOWN + C.ROUND + C.RESULT + 1);
  g.addBots(46);
  assert.strictEqual(g.players.size, 48); assert.strictEqual(g.addPlayer('zu viel'), null);
  g.start(a.id);
  assert.strictEqual(g.plates.length, 39); valid(g);
});

test('Bots sind gekennzeichnet, nur mit Freigabe verfügbar und bauen sich selbst Brücken zu den Stempeln', () => {
  const off = new Game({ seed: 1 }); off.addPlayer('A');
  assert.strictEqual(off.addBots(3), 0);
  const g = new Game({ seed: 5, allowBots: true });
  const a = g.addPlayer('A');
  assert.strictEqual(g.addBots(3), 3);
  for (const p of g.players.values()) if (p !== a) { assert.strictEqual(p.bot, true); assert.ok(p.name.startsWith('BOT ')); }
  g.start(a.id);
  let stamps = 0;
  for (let t = 0; t < C.COUNTDOWN + C.ROUND && g.phase !== 'result'; t += 1) {
    run(g, 1);
    for (const p of g.players.values()) { assert.notStrictEqual(p.state, 'air'); if (p.state === 'alive' && p.ride < 0) assert.ok(g.solid(...cell(p)), 'Kran steht auf Boden'); }
    stamps = Math.max(stamps, ...[...g.players.values()].map(p => (p.stamps & 1) + (p.stamps >> 1 & 1) + (p.stamps >> 2 & 1)));
  }
  assert.ok(stamps >= 1, 'mindestens ein Bot holt einen Stempel, erreicht: ' + stamps);
});
