(function (root) {
'use strict';
// „Der Boden ist gekündigt“ – autoritative Spiellogik.
// Reine Logik ohne Netzwerk. Läuft im Browser des Hosts (game.js), im Node-Spielserver (server/server.js)
// und direkt in den Regeltests.

const W = 21, H = 13;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0 Nord, 1 Ost, 2 Süd, 3 West
const C = {
  TICK: 0.05,      // Sekunden je Serverschritt
  SPEED: 3.4,      // Felder je Sekunde
  CARRY: 2.7,      // mit Platte am Haken
  AIR: 0.42,       // Flugzeit eines Sprungs
  JUMP_CD: 0.75,
  REACH: 0.4,      // Greifarm fährt aus: Zeit zum Reagieren
  DROP: 0.3,       // Greifarm legt ab
  ARM_CD: 1.0,     // Abklingzeit nach dem Ablegen
  ROT_CD: 0.2,
  RESPAWN: 1.6,
  ROUND: 240,
  COUNTDOWN: 3,
  RESULT: 14,
  MAX: 48,
};

const FALL_LINES = ['Das war eben noch ein Weg.', 'Der Boden wurde fristgerecht gekündigt.', 'Statik ist auch nur eine Meinung.', 'Abwärts ging es schneller als geplant.', 'Hier stand mal was.'];
const RIDE_LINES = ['Du wirst versetzt.', 'Mitfahren kostet nichts. Noch.', 'Fremder Kran, eigenes Risiko.'];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rotMask = (m, r) => ((m << r) | (m >> (4 - r))) & 15;

// Festes Grundgerüst: Außenring plus Stichwege zu Stationen und Tor. Alles andere ist verhandelbar.
function buildMap() {
  const fixed = new Uint8Array(W * H);
  const set = (x, y) => { fixed[y * W + x] = 1; };
  for (let x = 0; x < W; x++) { set(x, 0); set(x, H - 1); }
  for (let y = 0; y < H; y++) { set(0, y); set(W - 1, y); }
  for (let y = 1; y <= 3; y++) { set(5, y); set(15, y); }
  for (let x = 1; x <= 4; x++) set(x, 9);
  for (let y = 6; y <= 11; y++) set(10, y);
  const ring = [];
  for (let x = 0; x < W; x++) ring.push([x, 0]);
  for (let y = 1; y < H; y++) ring.push([W - 1, y]);
  for (let x = W - 2; x >= 0; x--) ring.push([x, H - 1]);
  for (let y = H - 2; y >= 1; y--) ring.push([0, y]);
  const spawns = [];
  for (let i = 0; i < C.MAX; i++) { const c = ring[Math.floor(i * ring.length / C.MAX)]; spawns.push({ x: c[0], y: c[1] }); }
  return { W, H, fixed, stations: [{ x: 5, y: 3 }, { x: 15, y: 3 }, { x: 4, y: 9 }], gate: { x: 10, y: 6 }, spawns };
}

class Game {
  constructor(opts = {}) {
    this.rng = mulberry(opts.seed == null ? (Date.now() & 0x7fffffff) : opts.seed);
    this.emit = opts.emit || (() => { });   // emit(nachricht, empfängerId | null)
    this.allowBots = !!opts.allowBots;
    this.map = buildMap();
    this.players = new Map();
    this.nextId = 1;
    this.phase = 'lobby';
    this.phaseT = 0;
    this.round = 0;
    this.seq = 0;
    this.result = null;
    this.botT = 0;
    this.genPlates();
  }

  // ------------------------------------------------------------ Karte und Platten
  inb(cx, cy) { return cx >= 0 && cy >= 0 && cx < W && cy < H; }
  solid(cx, cy) { return this.inb(cx, cy) && (this.map.fixed[cy * W + cx] === 1 || this.grid[cy * W + cx] >= 0); }
  free(cx, cy) { const i = cy * W + cx; return this.inb(cx, cy) && !this.map.fixed[i] && this.grid[i] < 0 && !this.reserved[i]; }
  genPlates() {
    this.plates = [];
    this.grid = new Int16Array(W * H).fill(-1);
    this.reserved = new Uint8Array(W * H);
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      const i = cy * W + cx;
      if (this.map.fixed[i] || this.rng() >= 0.5) continue;
      const r = this.rng(), d = Math.floor(this.rng() * 4);
      const rails = r < 0.28 ? 1 << d : r < 0.4 ? (1 << d) | (1 << ((d + 1) % 4)) : 0; // Leitplanken an einer oder zwei Kanten
      const id = this.plates.length;
      this.plates.push({ id, cx, cy, rot: 0, rails, state: 'ground', holder: -1, t: 0, tx: 0, ty: 0, fx: 0, fy: 0 });
      this.grid[i] = id;
    }
  }
  railAt(cx, cy, dir) {
    if (!this.inb(cx, cy)) return false;
    const id = this.grid[cy * W + cx];
    return id >= 0 && (rotMask(this.plates[id].rails, this.plates[id].rot) & (1 << dir)) !== 0;
  }
  edgeBlocked(cx, cy, dir) { return this.railAt(cx, cy, dir) || this.railAt(cx + DIRS[dir][0], cy + DIRS[dir][1], (dir + 2) % 4); }
  platePos(pl) {
    if (pl.state === 'held') { const h = this.players.get(pl.holder); if (h) return { x: h.x + DIRS[h.face][0], y: h.y + DIRS[h.face][1] }; }
    if (pl.state === 'drop') { const k = 1 - clamp(pl.t / C.DROP, 0, 1); return { x: pl.fx + (pl.tx + 0.5 - pl.fx) * k, y: pl.fy + (pl.ty + 0.5 - pl.fy) * k }; }
    return { x: pl.cx + 0.5, y: pl.cy + 0.5 };
  }
  plateMsg(pl) { this.emit({ t: 'p', p: [pl.id, pl.state, pl.holder, pl.cx, pl.cy, pl.rot, pl.tx, pl.ty, +pl.fx.toFixed(2), +pl.fy.toFixed(2)] }, null); }
  place(pl, cx, cy) {
    this.reserved[cy * W + cx] = 0;
    pl.cx = cx; pl.cy = cy; pl.state = 'ground'; pl.t = 0;
    this.grid[cy * W + cx] = pl.id;
    for (const p of this.players.values()) if (p.ride === pl.id) { p.ride = -1; p.x = cx + 0.5 + p.rx; p.y = cy + 0.5 + p.ry; }
    const h = this.players.get(pl.holder);
    if (h && h.hold === pl.id) { h.hold = -1; h.armCd = C.ARM_CD; }
    pl.holder = -1;
    this.plateMsg(pl);
  }
  // Halter stürzt ab, trennt die Verbindung oder die Runde endet: Platte muss sofort wieder gültig liegen.
  release(pl) {
    const h = this.players.get(pl.holder);
    if (pl.state === 'reach') {
      pl.state = 'ground'; pl.holder = -1; if (h) h.hold = -1; this.plateMsg(pl);
    } else if (pl.state === 'held') {
      const c = this.platePos(pl);
      let best = null, bd = 1e9;
      for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
        if (!this.free(cx, cy)) continue;
        const d = (cx + 0.5 - c.x) ** 2 + (cy + 0.5 - c.y) ** 2;
        if (d < bd) { bd = d; best = [cx, cy]; }
      }
      this.place(pl, best[0], best[1]);
    } else if (pl.state === 'drop') {
      if (h) h.hold = -1; pl.holder = -1; // Ablage läuft ohne Halter zu Ende
    }
  }

  // ------------------------------------------------------------ Spieler
  roster() {
    return { t: 'roster', phase: this.phase, round: this.round, bots: this.allowBots, tl: Math.ceil(this.phaseT),
      ps: [...this.players.values()].map(p => ({ id: p.id, name: p.name, bot: p.bot, c: p.slot, st: p.stamps })) };
  }
  roundMsg() {
    return { t: 'round', phase: this.phase, round: this.round, tl: this.phaseT,
      map: { W, H, fixed: Array.from(this.map.fixed).join(''), stations: this.map.stations, gate: this.map.gate },
      plates: this.plates.map(pl => [pl.id, pl.state, pl.holder, pl.cx, pl.cy, pl.rot, pl.tx, pl.ty, pl.fx, pl.fy, pl.rails]) };
  }
  addPlayer(name, opts = {}) {
    if (this.players.size >= C.MAX) return null;
    const used = new Set([...this.players.values()].map(p => p.slot));
    let slot = 0; while (used.has(slot)) slot++;
    const clean = String(name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Kran ' + (slot + 1);
    const p = { id: this.nextId++, slot, name: opts.bot ? 'BOT ' + clean : clean, bot: !!opts.bot, x: 0, y: 0, face: 2, state: 'alive', airT: 0, respawnT: 0,
      jumpCd: 0, armCd: 0, rotCd: 0, hold: -1, ride: -1, rx: 0, ry: 0, stamps: 0, stampAt: [0, 0, 0], lot: 1e6 + this.nextId, in: { mx: 0, my: 0 }, bt: null };
    this.toSpawn(p);
    this.players.set(p.id, p);
    this.emit(this.roster(), null);
    return p;
  }
  toSpawn(p) { const s = this.map.spawns[(p.slot * 29) % C.MAX]; p.x = s.x + 0.5; p.y = s.y + 0.5; p.state = 'alive'; p.ride = -1; p.airT = 0; }
  removePlayer(id) {
    const p = this.players.get(id);
    if (!p) return;
    if (p.hold >= 0) this.release(this.plates[p.hold]);
    this.players.delete(id);
    this.emit(this.roster(), null);
    if (this.phase === 'play' || this.phase === 'countdown') {
      if (this.players.size === 0) { this.phase = 'lobby'; this.emit(this.roster(), null); }
      else if (this.players.size === 1) this.finish([...this.players.values()][0], 'allein');
    }
  }
  setInput(id, mx, my) {
    const p = this.players.get(id);
    if (!p) return;
    p.in.mx = Number.isFinite(mx) ? clamp(mx, -1, 1) : 0;
    p.in.my = Number.isFinite(my) ? clamp(my, -1, 1) : 0;
  }
  say(p, text) { if (!p.bot) this.emit({ t: 'msg', text }, p.id); }
  frozen() { return this.phase === 'countdown' || this.phase === 'result'; }

  // Aktionen werden in Ankunftsreihenfolge verarbeitet: Wer zuerst beim Server ist, bekommt die Platte.
  act(id, kind) {
    const p = this.players.get(id);
    if (!p || this.frozen()) return false;
    if (kind === 'jump') {
      if (p.state !== 'alive' || p.jumpCd > 0) return false;
      p.ride = -1; p.state = 'air'; p.airT = C.AIR; p.jumpCd = C.JUMP_CD;
      return true;
    }
    if (kind === 'rot') {
      const pl = p.hold >= 0 ? this.plates[p.hold] : null;
      if (!pl || pl.state !== 'held' || p.rotCd > 0) return false;
      pl.rot = (pl.rot + 1) % 4; p.rotCd = C.ROT_CD;
      for (const r of this.players.values()) if (r.ride === pl.id) { const x = r.rx; r.rx = -r.ry; r.ry = x; }
      this.plateMsg(pl);
      return true;
    }
    if (kind !== 'grab' || p.state !== 'alive' || p.ride >= 0) return false;
    const cx = Math.floor(p.x) + DIRS[p.face][0], cy = Math.floor(p.y) + DIRS[p.face][1];
    if (p.hold >= 0) { // ablegen
      const pl = this.plates[p.hold];
      if (pl.state !== 'held') return false;
      if (!this.free(cx, cy)) { this.say(p, 'Da ist kein Platz.'); return false; }
      const c = this.platePos(pl);
      pl.state = 'drop'; pl.t = C.DROP; pl.tx = cx; pl.ty = cy; pl.fx = c.x; pl.fy = c.y;
      this.reserved[cy * W + cx] = 1;
      this.plateMsg(pl);
      return true;
    }
    if (p.armCd > 0) return false;
    const pid = this.inb(cx, cy) ? this.grid[cy * W + cx] : -1;
    if (pid < 0) { this.say(p, 'Da ist nichts zu holen.'); return false; }
    const pl = this.plates[pid];
    if (pl.state !== 'ground') { this.say(p, 'Die hängt schon an einem anderen Haken.'); return false; }
    pl.state = 'reach'; pl.holder = p.id; pl.t = C.REACH; p.hold = pid;
    this.plateMsg(pl);
    return true;
  }

  fall(p) {
    if (p.hold >= 0) this.release(this.plates[p.hold]);
    p.state = 'fallen'; p.respawnT = C.RESPAWN; p.ride = -1;
    this.say(p, FALL_LINES[Math.floor(this.rng() * FALL_LINES.length)]);
  }
  respawn(p) { // nächster fester Startpunkt, Stempel bleiben
    let best = this.map.spawns[0], bd = 1e9;
    for (const s of this.map.spawns) { const d = (s.x + 0.5 - p.x) ** 2 + (s.y + 0.5 - p.y) ** 2; if (d < bd) { bd = d; best = s; } }
    p.x = best.x + 0.5; p.y = best.y + 0.5; p.state = 'alive'; p.airT = 0; p.jumpCd = 0;
  }
  land(p) {
    p.state = 'alive';
    if (p.hold >= 0) return;
    for (const pl of this.plates) {
      if (pl.state !== 'held' && pl.state !== 'drop') continue;
      const c = this.platePos(pl);
      if (Math.abs(p.x - c.x) <= 0.5 && Math.abs(p.y - c.y) <= 0.5) { p.ride = pl.id; p.rx = clamp(p.x - c.x, -0.42, 0.42); p.ry = clamp(p.y - c.y, -0.42, 0.42); return; }
    }
  }
  movePlayer(p, dt) {
    p.jumpCd = Math.max(0, p.jumpCd - dt); p.armCd = Math.max(0, p.armCd - dt); p.rotCd = Math.max(0, p.rotCd - dt);
    if (p.state === 'fallen') { p.respawnT -= dt; if (p.respawnT <= 0) this.respawn(p); return; }
    if (this.frozen()) return;
    let mx = p.in.mx, my = p.in.my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (len > 0.15) p.face = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 1 : 3) : (my > 0 ? 2 : 0);
    if (p.ride >= 0) { p.rx = clamp(p.rx + mx * C.SPEED * 0.6 * dt, -0.42, 0.42); p.ry = clamp(p.ry + my * C.SPEED * 0.6 * dt, -0.42, 0.42); return; }
    const sp = p.hold >= 0 && this.plates[p.hold].state === 'held' ? C.CARRY : C.SPEED;
    if (p.state === 'air') {
      p.x += mx * sp * dt; p.y += my * sp * dt; p.airT -= dt;
      if (p.airT <= 0) this.land(p);
      return;
    }
    // am Boden: Leitplanken sperren die Kante, Löcher sperren nichts
    let cx = Math.floor(p.x), cy = Math.floor(p.y);
    let nx = p.x + mx * sp * dt;
    if (Math.floor(nx) !== cx && this.edgeBlocked(cx, cy, nx > p.x ? 1 : 3)) nx = nx > p.x ? cx + 0.98 : cx + 0.02;
    p.x = nx; cx = Math.floor(p.x);
    let ny = p.y + my * sp * dt;
    if (Math.floor(ny) !== cy && this.edgeBlocked(cx, cy, ny > p.y ? 2 : 0)) ny = ny > p.y ? cy + 0.98 : cy + 0.02;
    p.y = ny;
  }

  // ------------------------------------------------------------ Runde
  start(byId) {
    if (this.phase !== 'lobby' && this.phase !== 'result') return false;
    if (this.players.size < 2) { const p = this.players.get(byId); if (p) this.say(p, 'Allein kündigt sich kein Boden. Es fehlt ein zweiter Kran.'); return false; }
    this.round++; this.seq = 0; this.result = null;
    this.genPlates();
    const order = [...this.players.values()];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((p, i) => { p.lot = i; }); // ausgeloste Reihenfolge für eine Runde ganz ohne Stempel
    for (const p of this.players.values()) { p.stamps = 0; p.stampAt = [0, 0, 0]; p.hold = -1; p.armCd = 0; p.jumpCd = 0; p.respawnT = 0; this.toSpawn(p); }
    this.phase = 'countdown'; this.phaseT = C.COUNTDOWN;
    this.emit(this.roundMsg(), null);
    this.emit(this.roster(), null);
    return true;
  }
  ranking() {
    const n = p => (p.stamps & 1) + (p.stamps >> 1 & 1) + (p.stamps >> 2 & 1);
    return [...this.players.values()].sort((a, b) => {
      const na = n(a), nb = n(b);
      if (na !== nb) return nb - na;                                   // meiste Stempel
      if (na > 0 && a.stampAt[na - 1] !== b.stampAt[nb - 1]) return a.stampAt[na - 1] - b.stampAt[nb - 1]; // wer diese Zahl zuerst hatte
      return a.lot - b.lot;                                            // Losreihenfolge vom Rundenstart
    });
  }
  finish(winner, reason) {
    for (const pl of this.plates) if (pl.state === 'reach' || pl.state === 'held') this.release(pl);
    const rank = this.ranking();
    if (!winner) { winner = rank[0]; const n = winner.stamps; reason = n === 0 ? 'los' : 'zeit'; }
    const rest = rank.filter(p => p !== winner);
    this.result = { t: 'result', winner: winner.id, reason, rank: [winner, ...rest].map(p => ({ id: p.id, name: p.name, bot: p.bot, c: p.slot, st: p.stamps })) };
    this.phase = 'result'; this.phaseT = C.RESULT;
    this.emit(this.result, null);
    this.emit(this.roster(), null);
  }

  step(dt = C.TICK) {
    if (this.phase !== 'lobby') {
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        if (this.phase === 'countdown') { this.phase = 'play'; this.phaseT = C.ROUND; this.emit(this.roster(), null); }
        else if (this.phase === 'play') this.finish(null, 'zeit');
        else if (this.phase === 'result') { this.phase = 'lobby'; this.phaseT = 0; for (const p of this.players.values()) p.stamps = 0; this.emit(this.roster(), null); }
      }
    }
    this.botT -= dt;
    if (this.botT <= 0) { this.botT = 0.25; for (const p of this.players.values()) if (p.bot) this.think(p); }
    for (const p of this.players.values()) this.movePlayer(p, dt);
    for (const pl of this.plates) {
      if (pl.state === 'reach') {
        pl.t -= dt;
        if (pl.t <= 0) { // anheben: wer draufsteht, fährt mit
          pl.state = 'held'; this.grid[pl.cy * W + pl.cx] = -1;
          for (const p of this.players.values()) {
            if (p.state !== 'alive' || p.ride >= 0 || p.hold >= 0 || Math.floor(p.x) !== pl.cx || Math.floor(p.y) !== pl.cy) continue;
            p.ride = pl.id; p.rx = clamp(p.x - pl.cx - 0.5, -0.42, 0.42); p.ry = clamp(p.y - pl.cy - 0.5, -0.42, 0.42);
            this.say(p, RIDE_LINES[Math.floor(this.rng() * RIDE_LINES.length)]);
          }
          this.plateMsg(pl);
        }
      } else if (pl.state === 'drop') {
        pl.t -= dt;
        if (pl.t <= 0) this.place(pl, pl.tx, pl.ty);
      }
    }
    for (const p of this.players.values()) {
      if (p.ride >= 0) { const c = this.platePos(this.plates[p.ride]); p.x = c.x + p.rx; p.y = c.y + p.ry; continue; }
      if (p.state !== 'alive') continue;
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      if (!this.solid(cx, cy)) { this.fall(p); continue; }
      if (this.phase !== 'play') continue;
      for (let i = 0; i < 3; i++) {
        const s = this.map.stations[i];
        if (s.x === cx && s.y === cy && !(p.stamps & (1 << i))) {
          p.stamps |= 1 << i;
          const n = (p.stamps & 1) + (p.stamps >> 1 & 1) + (p.stamps >> 2 & 1);
          p.stampAt[n - 1] = ++this.seq;
          this.say(p, n === 3 ? 'Drei Stempel. Ab zum Tor.' : 'Stempel ' + n + ' von 3. Ordnung muss sein.');
          this.emit(this.roster(), null);
        }
      }
      if (cx === this.map.gate.x && cy === this.map.gate.y) {
        if (p.stamps === 7) { this.finish(p, 'tor'); return; }
        if (!p.gateHint || p.gateHint < this.seq + 1) { p.gateHint = this.seq + 1; this.say(p, 'Ohne drei Stempel kein Ausgang.'); }
      }
    }
  }
  snapshot() {
    const ps = [];
    for (const p of this.players.values()) ps.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), p.face, p.state === 'alive' ? 0 : p.state === 'air' ? 1 : 2, p.ride, p.hold, +p.armCd.toFixed(1)]);
    return { t: 's', tl: +this.phaseT.toFixed(1), ps };
  }

  // ------------------------------------------------------------ Testbots (nur lokal, als BOT gekennzeichnet)
  addBots(n) { let k = 0; const names = ['Kalle', 'Uschi', 'Horst', 'Gabi', 'Manni', 'Elke', 'Rudi', 'Inge']; while (k < n && this.allowBots && this.addPlayer(names[this.players.size % names.length] + ' ' + (this.players.size + 1), { bot: true })) k++; return k; }
  think(p) {
    if (p.state !== 'alive' || this.frozen()) { p.in.mx = p.in.my = 0; return; }
    if (p.ride >= 0) { if (this.rng() < 0.08) this.act(p.id, 'jump'); return; }
    if (p.hold >= 0) { if (this.rng() < 0.2) { if (this.rng() < 0.4) this.act(p.id, 'rot'); this.act(p.id, 'grab'); } }
    else if (this.rng() < 0.03) this.act(p.id, 'grab');
    let goal = this.map.gate, bd = 1e9;
    if (p.stamps !== 7) this.map.stations.forEach((s, i) => { const d = Math.abs(s.x + 0.5 - p.x) + Math.abs(s.y + 0.5 - p.y); if (!(p.stamps & (1 << i)) && d < bd) { bd = d; goal = s; } });
    const sx = Math.floor(p.x), sy = Math.floor(p.y), from = new Int16Array(W * H).fill(-1), q = [goal.y * W + goal.x];
    from[q[0]] = q[0];
    for (let h = 0; h < q.length && from[sy * W + sx] < 0; h++) { // Breitensuche vom Ziel rückwärts
      const cx = q[h] % W, cy = (q[h] - cx) / W;
      for (let d = 0; d < 4; d++) {
        const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
        if (!this.solid(nx, ny) || from[ny * W + nx] >= 0 || this.edgeBlocked(cx, cy, d)) continue;
        from[ny * W + nx] = q[h]; q.push(ny * W + nx);
      }
    }
    const nxt = from[sy * W + sx];
    if (nxt < 0) { p.in.mx = p.in.my = 0; return; }
    const tx = nxt === sy * W + sx ? sx + 0.5 : (nxt % W) + 0.5, ty = nxt === sy * W + sx ? sy + 0.5 : Math.floor(nxt / W) + 0.5;
    // erst auf die Spurmitte, dann zum nächsten Feld: so fährt der Bot nicht über die Kante
    const ox = sx + 0.5 - p.x, oy = sy + 0.5 - p.y, horiz = Math.floor(ty) === sy;
    if (horiz && Math.abs(oy) > 0.12) { p.in.mx = 0; p.in.my = Math.sign(oy); }
    else if (!horiz && Math.abs(ox) > 0.12) { p.in.my = 0; p.in.mx = Math.sign(ox); }
    else { p.in.mx = clamp((tx - p.x) * 4, -1, 1); p.in.my = clamp((ty - p.y) * 4, -1, 1); }
  }
}

const api = { Game, C, W, H, DIRS, buildMap, rotMask };
if (typeof module === 'object' && module.exports) module.exports = api; else root.MGLogic = api;
})(typeof self !== 'undefined' ? self : this);
