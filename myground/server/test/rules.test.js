'use strict';
// Regeltests der Serverlogik: node --test test/rules.test.js
const test = require('node:test');
const assert = require('node:assert');
const { Game, C, W, H } = require('../game');

function mk(plates = []) {
  const msgs = [];
  const g = new Game({ seed: 7, emit: (m, to) => msgs.push({ m, to }) });
  g.plates = []; g.grid.fill(-1); g.reserved.fill(0);
  for (const [cx, cy, rails = 0] of plates) { const id = g.plates.length; g.plates.push({ id, cx, cy, rot: 0, rails, state: 'ground', holder: -1, t: 0, tx: 0, ty: 0, fx: 0, fy: 0 }); g.grid[cy * W + cx] = id; }
  g.msgs = msgs;
  return g;
}
const put = (p, x, y, face) => { p.x = x + 0.5; p.y = y + 0.5; if (face != null) p.face = face; };
const run = (g, s) => { for (let i = 0; i < Math.round(s / C.TICK); i++) g.step(); };
const valid = g => { // jede Platte liegt auf genau einem freien, nicht festen Feld
  const seen = new Set();
  for (const pl of g.plates) {
    assert.strictEqual(pl.state, 'ground'); assert.strictEqual(pl.holder, -1);
    assert.strictEqual(g.grid[pl.cy * W + pl.cx], pl.id); assert.strictEqual(g.map.fixed[pl.cy * W + pl.cx], 0);
    assert.ok(!seen.has(pl.cy * W + pl.cx)); seen.add(pl.cy * W + pl.cx);
  }
  assert.strictEqual(g.reserved.reduce((a, b) => a + b, 0), 0);
};

test('Karte: Stationen, Tor und 48 Startpunkte liegen auf dem festen Grundgerüst und sind verbunden', () => {
  const g = mk();
  const pts = [...g.map.stations, g.map.gate, ...g.map.spawns];
  assert.strictEqual(g.map.spawns.length, 48);
  assert.strictEqual(new Set(g.map.spawns.map(s => s.x + ',' + s.y)).size, 48);
  const seen = new Set([0]), q = [0];
  while (q.length) { const i = q.pop(), x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * W + nx; if (nx >= 0 && ny >= 0 && nx < W && ny < H && g.map.fixed[j] && !seen.has(j)) { seen.add(j); q.push(j); } } }
  for (const p of pts) assert.ok(seen.has(p.y * W + p.x), 'erreichbar ohne bewegliche Platten: ' + p.x + ',' + p.y);
});

test('Gleichzeitiges Greifen: der Server vergibt die Platte eindeutig an die erste Anfrage', () => {
  const g = mk([[1, 1]]);
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  put(a, 1, 0, 2); put(b, 0, 1, 1);          // beide grenzen an Platte (1,1)
  assert.strictEqual(g.act(a.id, 'grab'), true);
  assert.strictEqual(g.act(b.id, 'grab'), false); // selber Serverschritt
  assert.strictEqual(g.plates[0].holder, a.id);
  assert.strictEqual(b.hold, -1);
  assert.ok(g.msgs.some(x => x.to === b.id && /anderen Haken/.test(x.m.text)));
  run(g, C.REACH + 0.1);
  assert.strictEqual(g.plates[0].state, 'held');
  assert.strictEqual(g.act(b.id, 'grab'), false); // auch danach nicht
});

test('Mitfahren, Drehen, Ablegen: wer draufsteht, landet am Ablageort', () => {
  const g = mk([[1, 1, 1]]);
  const a = g.addPlayer('A'), r = g.addPlayer('R');
  put(a, 1, 0, 2); put(r, 1, 1);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  assert.strictEqual(r.ride, 0); assert.strictEqual(r.state, 'alive');
  assert.strictEqual(g.grid[1 * W + 1], -1);
  g.setInput(a.id, 1, 0); run(g, 1); g.setInput(a.id, 0, 0);    // nach Osten fahren, Platte hängt voraus
  const c = g.platePos(g.plates[0]);
  assert.ok(Math.abs(r.x - c.x) < 0.5 && Math.abs(r.y - c.y) < 0.5, 'Mitfahrer bleibt auf der Platte');
  assert.ok(r.x > 4, 'Mitfahrer wurde mitgenommen');
  g.step();
  g.setInput(a.id, 0, 1); g.step(); g.setInput(a.id, 0, 0);     // Blick nach Süden
  assert.strictEqual(g.act(a.id, 'rot'), true);
  assert.strictEqual(g.plates[0].rot, 1);
  const tx = Math.floor(a.x), ty = Math.floor(a.y) + 1;
  assert.strictEqual(g.act(a.id, 'grab'), true);                // ablegen
  run(g, C.DROP + 0.1);
  assert.strictEqual(g.plates[0].cx, tx); assert.strictEqual(g.plates[0].cy, ty);
  assert.strictEqual(r.ride, -1); assert.strictEqual(Math.floor(r.x), tx); assert.strictEqual(Math.floor(r.y), ty);
  assert.strictEqual(r.state, 'alive');
  assert.ok(a.armCd > 0, 'Abklingzeit läuft');
  assert.strictEqual(g.act(a.id, 'grab'), false);
  valid(g);
});

test('Ablegen nur auf freiem Feld in Reichweite', () => {
  const g = mk([[1, 1], [2, 1]]);
  const a = g.addPlayer('A'); g.addPlayer('B');
  put(a, 1, 0, 2); g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  put(a, 2, 0, 2);
  assert.strictEqual(g.act(a.id, 'grab'), false, 'belegtes Feld');
  a.face = 0; assert.strictEqual(g.act(a.id, 'grab'), false, 'außerhalb der Arena');
  a.face = 1; assert.strictEqual(g.act(a.id, 'grab'), false, 'festes Feld');
  put(a, 3, 0, 2); assert.strictEqual(g.act(a.id, 'grab'), true);
  run(g, 0.5); valid(g);
});

test('Abspringen von der fahrenden Platte und Aufspringen auf einen fremden Kran', () => {
  const g = mk([[1, 1]]);
  const a = g.addPlayer('A'), r = g.addPlayer('R'), j = g.addPlayer('J');
  put(a, 1, 0, 2); put(r, 1, 1); put(j, 10, 0);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  g.setInput(a.id, 1, 0); run(g, 1); g.setInput(a.id, 0, 0); g.step(); // Platte hängt jetzt östlich über dem festen Ring
  g.setInput(r.id, 0, 0);
  assert.strictEqual(g.act(r.id, 'jump'), true);
  assert.strictEqual(r.ride, -1); assert.strictEqual(r.state, 'air');
  run(g, C.AIR + 0.1);
  assert.strictEqual(r.ride, 0, 'ohne Richtung landet er wieder auf der Platte');
  g.setInput(r.id, 0, -1); run(g, C.JUMP_CD); g.act(r.id, 'jump'); run(g, C.AIR + 0.15); g.setInput(r.id, 0, 0);
  assert.strictEqual(r.ride, -1);
  // J springt auf die getragene Platte auf
  const c = g.platePos(g.plates[0]);
  j.x = c.x - 1.4; j.y = c.y; g.grid[Math.floor(j.y) * W + Math.floor(j.x)] >= 0 || (g.map.fixed[Math.floor(j.y) * W + Math.floor(j.x)] = 1);
  g.setInput(j.id, 1, 0); g.act(j.id, 'jump'); run(g, C.AIR + 0.1); g.setInput(j.id, 0, 0);
  assert.strictEqual(j.ride, 0, 'Aufspringen auf fremde Platte');
});

test('Absturz und Respawn: kurze Pause, sicherer Startpunkt, Stempel bleiben', () => {
  const g = mk();
  const a = g.addPlayer('A'); g.addPlayer('B');
  g.start(a.id); run(g, C.COUNTDOWN + 0.1);
  a.stamps = 3; put(a, 3, 3);                 // Loch
  g.step();
  assert.strictEqual(a.state, 'fallen');
  run(g, C.RESPAWN - 0.3); assert.strictEqual(a.state, 'fallen');
  run(g, 0.5);
  assert.strictEqual(a.state, 'alive'); assert.strictEqual(a.stamps, 3);
  assert.ok(g.map.spawns.some(s => s.x === Math.floor(a.x) && s.y === Math.floor(a.y)));
  assert.ok(g.msgs.some(x => x.to === a.id && x.m.t === 'msg'));
});

test('Leitplanken sperren die Kante, Springen kommt drüber', () => {
  const g = mk([[1, 1, 2]]);                  // Planke an der Ostkante
  const a = g.addPlayer('A');
  put(a, 1, 1); g.grid[1 * W + 2] = -1; g.map.fixed[1 * W + 2] = 1;
  g.setInput(a.id, 1, 0); run(g, 1);
  assert.strictEqual(Math.floor(a.x), 1, 'bleibt hängen');
  g.act(a.id, 'jump'); run(g, C.AIR); g.setInput(a.id, 0, 0);
  assert.ok(a.x > 2, 'gesprungen');
});

test('Stempel in beliebiger Reihenfolge und Sieg am Tor', () => {
  const g = mk();
  const a = g.addPlayer('A'), b = g.addPlayer('B');
  assert.strictEqual(g.start(a.id), true);
  put(a, g.map.stations[2].x, g.map.stations[2].y); g.step();
  assert.strictEqual(a.stamps, 0, 'im Countdown gibt es nichts');
  run(g, C.COUNTDOWN + 0.1);
  put(a, g.map.gate.x, g.map.gate.y); g.step(); assert.strictEqual(g.phase, 'play', 'ohne Stempel kein Sieg');
  for (const i of [2, 0, 1]) { put(a, g.map.stations[i].x, g.map.stations[i].y); g.step(); }
  assert.strictEqual(a.stamps, 7);
  put(a, g.map.gate.x, g.map.gate.y); g.step();
  assert.strictEqual(g.phase, 'result');
  assert.strictEqual(g.result.winner, a.id); assert.strictEqual(g.result.reason, 'tor');
  assert.strictEqual(g.result.rank.length, 2); assert.strictEqual(g.result.rank[1].id, b.id);
  assert.strictEqual(g.start(b.id), true, 'direkter Wiedereinstieg aus dem Ergebnis');
  assert.strictEqual(a.stamps, 0);
});

test('Zeitlimit: meiste Stempel gewinnt; bei Gleichstand, wer die Zahl zuerst hatte', () => {
  const g = mk();
  const a = g.addPlayer('A'), b = g.addPlayer('B'), c = g.addPlayer('C');
  g.start(a.id); run(g, C.COUNTDOWN + 0.1);
  const S = g.map.stations;
  put(b, S[0].x, S[0].y); g.step();           // B: 1 Stempel (zuerst)
  put(a, S[1].x, S[1].y); g.step();           // A: 1
  put(a, S[2].x, S[2].y); g.step();           // A: 2 (zuerst bei 2)
  put(b, S[1].x, S[1].y); g.step();           // B: 2 (später)
  put(c, S[0].x, S[0].y); g.step();           // C: 1
  put(a, 0, 0); put(b, 0, 0); put(c, 0, 0);
  run(g, C.ROUND);
  assert.strictEqual(g.phase, 'result');
  assert.strictEqual(g.result.reason, 'zeit');
  assert.deepStrictEqual(g.result.rank.map(r => r.id), [a.id, b.id, c.id]);
});

test('Zeitlimit ohne einen einzigen Stempel: die ausgeloste Reihenfolge entscheidet, genau ein Sieger', () => {
  const g = mk();
  const ps = [g.addPlayer('A'), g.addPlayer('B'), g.addPlayer('C'), g.addPlayer('D')];
  g.start(ps[0].id);
  const lots = ps.map(p => p.lot).sort((x, y) => x - y);
  assert.deepStrictEqual(lots, [0, 1, 2, 3]);
  const first = ps.find(p => p.lot === 0), second = ps.find(p => p.lot === 1);
  g.removePlayer(first.id);                   // der Erstgeloste geht: es zählt unter den Verbleibenden
  run(g, C.COUNTDOWN + C.ROUND + 0.2);
  assert.strictEqual(g.result.reason, 'los');
  assert.strictEqual(g.result.winner, second.id);
  assert.strictEqual(g.result.rank.filter(r => r.id === g.result.winner).length, 1);
  run(g, C.RESULT + 0.1); assert.strictEqual(g.phase, 'lobby');
});

test('Verbindungsabbruch mit Platte am Haken: Platte liegt sofort wieder gültig, Mitfahrer steht drauf', () => {
  const g = mk([[1, 1], [2, 1], [3, 1]]);
  const a = g.addPlayer('A'), r = g.addPlayer('R'), z = g.addPlayer('Z');
  put(a, 1, 0, 2); put(r, 1, 1);
  g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  g.setInput(a.id, 1, 0); run(g, 0.4);        // Platte schwebt über dem festen Ring
  g.removePlayer(a.id);
  valid(g);
  assert.strictEqual(r.ride, -1);
  assert.strictEqual(g.grid[Math.floor(r.y) * W + Math.floor(r.x)], 0, 'Mitfahrer steht auf der abgelegten Platte');
  g.step(); assert.strictEqual(r.state, 'alive');
  // Abbruch während der Greifarm noch ausfährt
  put(z, 2, 0, 2); g.act(z.id, 'grab'); g.step(); g.removePlayer(z.id); valid(g);
  // Abbruch während des Ablegens
  const y = g.addPlayer('Y'); put(y, 3, 0, 2); g.act(y.id, 'grab'); run(g, C.REACH + 0.1); put(y, 6, 0, 2); g.act(y.id, 'grab'); g.step();
  g.removePlayer(y.id); run(g, C.DROP + 0.1); valid(g);
  assert.strictEqual(g.plates[2].cx, 6); assert.strictEqual(g.plates[2].cy, 1);
});

test('Absturz mit Platte am Haken gibt die Platte frei', () => {
  const g = mk([[1, 1]]);
  const a = g.addPlayer('A');
  put(a, 1, 0, 2); g.act(a.id, 'grab'); run(g, C.REACH + 0.1);
  put(a, 5, 5); g.step();
  assert.strictEqual(a.state, 'fallen'); assert.strictEqual(a.hold, -1); valid(g);
});

test('Ein Spieler allein kann nicht starten; zwei reichen; 48 passen, der 49. nicht', () => {
  const g = mk();
  const a = g.addPlayer('A');
  assert.strictEqual(g.start(a.id), false);
  g.addPlayer('B');
  assert.strictEqual(g.start(a.id), true);
  for (let i = 2; i < 48; i++) assert.ok(g.addPlayer('P' + i));
  assert.strictEqual(g.addPlayer('zu viel'), null);
  assert.strictEqual(new Set([...g.players.values()].map(p => Math.floor(p.x) + ',' + Math.floor(p.y))).size, 48, 'jeder hat einen eigenen Startpunkt');
});

test('Bots sind gekennzeichnet, nur mit Freigabe verfügbar und spielen eine Runde zu Ende', () => {
  assert.strictEqual(mk().addBots(3), 0);
  const g = new Game({ seed: 3, allowBots: true });
  const a = g.addPlayer('Mensch');
  assert.strictEqual(g.addBots(5), 5);
  for (const p of g.players.values()) if (p !== a) { assert.ok(p.bot); assert.match(p.name, /^BOT /); }
  g.start(a.id);
  run(g, C.COUNTDOWN + C.ROUND + 1);
  assert.strictEqual(g.phase, 'result');
  assert.ok(g.result.rank[0].st > 0, 'Bots sammeln Stempel');
  valid(g);
});
