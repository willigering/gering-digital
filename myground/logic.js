(function (root) {
'use strict';
// „Du kranst mich mal“ – autoritative Spiellogik.
// Brückenbau-Rennen: Feste Papp-Inseln mit Lücken dazwischen. Wer zu einem Stempel will, legt sich mit gelben Platten
// einen Weg. Kräne fahren nur auf Boden und bleiben an jeder Kante stehen. Jede liegende gelbe Platte darf jeder
// Kran wegheben, auch wenn ein anderer draufsteht: der fährt dann mit.
// Reine Logik ohne Netzwerk. Läuft im Browser des Hosts (game.js), im Node-Spielserver (server/server.js)
// und direkt in den Regeltests.

const W = 21, H = 13;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 0 Nord, 1 Ost, 2 Süd, 3 West
const C = {
  TICK: 0.05,      // Sekunden je Serverschritt
  SPEED: 3.4,      // Felder je Sekunde
  CARRY: 2.7,      // mit Platte am Haken
  REACH: 0.4,      // Greifarm fährt aus: Zeit zum Reagieren
  DROP: 0.3,       // Greifarm legt ab
  ARM_CD: 1.0,     // Abklingzeit nach dem Ablegen
  TOW: 1.8,        // Abschleppen zum Start dauert so lange
  TOW_CD: 4,
  KIDNAP: 6,       // so lange darf man eine Platte mit Fahrgast höchstens tragen
  ROUND: 300,
  COUNTDOWN: 3,
  RESULT: 14,
  MAX: 48,
};

const TOW_LINES = ['Abschleppdienst ist unterwegs.', 'Zurück auf Los.', 'Einmal Heimfahrt, bitte.'];
const RIDE_LINES = ['Du wirst versetzt.', 'Mitfahren kostet nichts. Noch.', 'Fremder Kran, eigenes Risiko.'];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rotMask = (m, r) => ((m << r) | (m >> (4 - r))) & 15;

// Feste Inseln: Startfläche unten, drei Stempelinseln, der Ausgang oben in der Mitte. Dazwischen einzelne Pfeiler,
// damit keine Lücke länger als drei Felder ist. Alles andere muss gebaut werden.
function buildMap() {
  const fixed = new Uint8Array(W * H);
  const set = (x, y) => { fixed[y * W + x] = 1; };
  const block = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y); };
  block(0, 11, W - 1, 12);                    // Start
  block(1, 0, 3, 2); block(17, 0, 19, 2);     // Stempel links und rechts
  block(9, 5, 11, 7);                         // Stempel Mitte
  block(9, 0, 11, 2);                         // Ausgang
  for (const [x, y] of [[5, 9], [5, 6], [2, 6], [2, 4], [10, 9], [15, 9], [15, 6], [18, 6], [18, 4]]) set(x, y);
  const spawns = [];                          // von der Mitte nach außen, zwei Reihen
  for (let i = 0; i < W; i++) { const x = 10 + (i % 2 ? 1 : -1) * Math.ceil(i / 2); if (x < 0 || x >= W) continue; spawns.push({ x, y: 11 }); spawns.push({ x, y: 12 }); }
  for (let i = 0; spawns.length < C.MAX; i++) spawns.push({ x: i % W, y: 11 });   // mehr Kräne als Felder: Plätze doppelt belegen
  spawns.length = C.MAX;
  return { W, H, fixed, stations: [{ x: 2, y: 1 }, { x: 18, y: 1 }, { x: 10, y: 6 }], gate: { x: 10, y: 1 }, spawns };
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
  // Baumaterial: wenige gelbe Platten, als Lager direkt vor der Startfläche. Knapp genug, dass man sie sich wegnimmt.
  genPlates(n = 2) {
    this.plates = [];
    this.grid = new Int16Array(W * H).fill(-1);
    this.reserved = new Uint8Array(W * H);
    const count = clamp(6 + 3 * n, 12, 39), cells = [];
    for (const y of [10, 9]) {
      const row = [];
      for (let x = 0; x < W; x++) if (!this.map.fixed[y * W + x]) row.push([x, y]);
      for (let i = row.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [row[i], row[j]] = [row[j], row[i]]; }
      cells.push(...row);
    }
    for (const [cx, cy] of cells.slice(0, count)) {
      const id = this.plates.length;
      this.plates.push({ id, cx, cy, rot: 0, rails: 0, state: 'ground', holder: -1, t: 0, tx: 0, ty: 0, fx: 0, fy: 0, rideT: 0 });
      this.grid[cy * W + cx] = id;
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
    pl.cx = cx; pl.cy = cy; pl.state = 'ground'; pl.t = 0; pl.rideT = 0;
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
        const lone = !DIRS.some(([dx, dy]) => this.solid(cx + dx, cy + dy));
        const d = (cx + 0.5 - c.x) ** 2 + (cy + 0.5 - c.y) ** 2 + (lone ? 1000 : 0);
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
      towCd: 0, armCd: 0, hold: -1, ride: -1, rx: 0, ry: 0, stamps: 0, stampAt: [0, 0, 0], lot: 1e6 + this.nextId, in: { mx: 0, my: 0 }, bt: null };
    this.toSpawn(p);
    this.players.set(p.id, p);
    this.emit(this.roster(), null);
    return p;
  }
  toSpawn(p) { const s = this.map.spawns[p.slot % C.MAX]; p.x = s.x + 0.5; p.y = s.y + 0.5; p.state = 'alive'; p.ride = -1; p.airT = 0; }
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
    if (kind === 'home') {                     // festgefahren oder gestrandet: zurück zum Start schleppen lassen, Stempel bleiben
      if (p.state !== 'alive' || p.towCd > 0) return false;
      this.tow(p);
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

  tow(p) {
    if (p.hold >= 0) this.release(this.plates[p.hold]);
    p.state = 'fallen'; p.respawnT = C.TOW; p.towCd = C.TOW_CD; p.ride = -1;
    this.say(p, TOW_LINES[Math.floor(this.rng() * TOW_LINES.length)]);
  }
  movePlayer(p, dt) {
    p.armCd = Math.max(0, p.armCd - dt); p.towCd = Math.max(0, p.towCd - dt);
    if (p.state === 'fallen') { p.respawnT -= dt; if (p.respawnT <= 0) this.toSpawn(p); return; }
    if (this.frozen()) return;
    let mx = p.in.mx, my = p.in.my;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (len > 0.15) p.face = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 1 : 3) : (my > 0 ? 2 : 0);
    if (p.ride >= 0) { p.rx = clamp(p.rx + mx * C.SPEED * 0.6 * dt, -0.42, 0.42); p.ry = clamp(p.ry + my * C.SPEED * 0.6 * dt, -0.42, 0.42); return; }
    const sp = p.hold >= 0 && this.plates[p.hold].state === 'held' ? C.CARRY : C.SPEED;
    // Kräne fahren nur auf Boden: an jeder Kante ohne Nachbarfeld ist Schluss
    let cx = Math.floor(p.x), cy = Math.floor(p.y);
    let nx = p.x + mx * sp * dt;
    if (Math.floor(nx) !== cx && !this.solid(Math.floor(nx), cy)) nx = nx > p.x ? cx + 0.98 : cx + 0.02;
    p.x = nx; cx = Math.floor(p.x);
    let ny = p.y + my * sp * dt;
    if (Math.floor(ny) !== cy && !this.solid(cx, Math.floor(ny))) ny = ny > p.y ? cy + 0.98 : cy + 0.02;
    p.y = ny;
  }

  // ------------------------------------------------------------ Runde
  start(byId) {
    if (this.phase !== 'lobby' && this.phase !== 'result') return false;
    if (this.players.size < 2) { const p = this.players.get(byId); if (p) this.say(p, 'Allein ist das kein Rennen. Es fehlt ein zweiter Kran.'); return false; }
    this.round++; this.seq = 0; this.result = null;
    this.genPlates(this.players.size);
    const order = [...this.players.values()];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    order.forEach((p, i) => { p.lot = i; }); // ausgeloste Reihenfolge für eine Runde ganz ohne Stempel
    for (const p of this.players.values()) { p.stamps = 0; p.stampAt = [0, 0, 0]; p.hold = -1; p.armCd = 0; p.towCd = 0; p.respawnT = 0; this.toSpawn(p); }
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
            if (p.state !== 'alive' || p.ride >= 0 || p.id === pl.holder || Math.floor(p.x) !== pl.cx || Math.floor(p.y) !== pl.cy) continue;
            p.ride = pl.id; p.rx = clamp(p.x - pl.cx - 0.5, -0.42, 0.42); p.ry = clamp(p.y - pl.cy - 0.5, -0.42, 0.42);
            this.say(p, RIDE_LINES[Math.floor(this.rng() * RIDE_LINES.length)]);
          }
          this.plateMsg(pl);
        }
      } else if (pl.state === 'drop') {
        pl.t -= dt;
        if (pl.t <= 0) this.place(pl, pl.tx, pl.ty);
      } else if (pl.state === 'held') {              // Fahrgäste darf man nicht ewig spazieren tragen
        let riders = false; for (const p of this.players.values()) if (p.ride === pl.id) riders = true;
        pl.rideT = riders ? pl.rideT + dt : 0;
        if (pl.rideT > C.KIDNAP) { const h = this.players.get(pl.holder); this.release(pl); if (h) { h.armCd = C.ARM_CD; this.say(h, 'Fahrgast abgesetzt. Länger trägt der Haken nicht.'); } }
      }
    }
    for (const p of this.players.values()) {
      if (p.ride >= 0) { const c = this.platePos(this.plates[p.ride]); p.x = c.x + p.rx; p.y = c.y + p.ry; continue; }
      if (p.state !== 'alive') continue;
      const cx = Math.floor(p.x), cy = Math.floor(p.y);
      if (!this.solid(cx, cy)) { this.tow(p); continue; }   // Sicherheitsnetz: sollte nicht vorkommen
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
    for (const p of this.players.values()) ps.push([p.id, +p.x.toFixed(2), +p.y.toFixed(2), p.face, p.state === 'alive' ? 0 : 2, p.ride, p.hold, +p.armCd.toFixed(1)]);
    return { t: 's', tl: +this.phaseT.toFixed(1), ps };
  }

  // ------------------------------------------------------------ Testbots (nur lokal, als BOT gekennzeichnet)
  addBots(n) { let k = 0; const names = ['Kalle', 'Uschi', 'Horst', 'Gabi', 'Manni', 'Elke', 'Rudi', 'Inge']; while (k < n && this.allowBots && this.addPlayer(names[this.players.size % names.length] + ' ' + (this.players.size + 1), { bot: true })) k++; return k; }
  think(p) {
    if (p.state !== 'alive' || this.frozen() || p.ride >= 0) { p.in.mx = p.in.my = 0; return; }
    let goal = this.map.gate, bd = 1e9;
    if (p.stamps !== 7) this.map.stations.forEach((s, i) => { const d = Math.abs(s.x + 0.5 - p.x) + Math.abs(s.y + 0.5 - p.y); if (!(p.stamps & (1 << i)) && d < bd) { bd = d; goal = s; } });
    // Kürzester Weg zum Ziel; fehlender Boden kostet mehr, weil dort erst eine Platte hin muss
    const N = W * H, cost = new Float32Array(N).fill(1e9), next = new Int16Array(N).fill(-1), open = [goal.y * W + goal.x];
    cost[open[0]] = 0; next[open[0]] = open[0];
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
      const cur = open.splice(bi, 1)[0], cx = cur % W, cy = (cur - cx) / W;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy; if (!this.inb(nx, ny)) continue;
        const j = ny * W + nx, c = cost[cur] + (this.solid(nx, ny) ? 1 : 7);
        if (c < cost[j]) { cost[j] = c; next[j] = cur; if (!open.includes(j)) open.push(j); }
      }
    }
    const sx = Math.floor(p.x), sy = Math.floor(p.y), here = sy * W + sx;
    const route = from => { const set = new Set(); for (let i = from, k = 0; k < 60 && next[i] !== i && next[i] >= 0; k++) { i = next[i]; set.add(i); } return set; };
    const dirTo = j => DIRS.findIndex(([dx, dy]) => (sy + dy) * W + sx + dx === j);
    const face = d => { p.in.mx = DIRS[d][0] * 0.6; p.in.my = DIRS[d][1] * 0.6; };       // gegen die Kante lenken dreht nur den Kran
    const drive = j => {                                                                // erst auf die Spurmitte, dann zum nächsten Feld
      const tx = (j % W) + 0.5, ty = Math.floor(j / W) + 0.5, ox = sx + 0.5 - p.x, oy = sy + 0.5 - p.y, horiz = Math.floor(ty) === sy;
      if (j === here) { p.in.mx = clamp(ox * 4, -1, 1); p.in.my = clamp(oy * 4, -1, 1); }
      else if (horiz && Math.abs(oy) > 0.12) { p.in.mx = 0; p.in.my = Math.sign(oy); }
      else if (!horiz && Math.abs(ox) > 0.12) { p.in.my = 0; p.in.mx = Math.sign(ox); }
      else { p.in.mx = clamp((tx - p.x) * 4, -1, 1); p.in.my = clamp((ty - p.y) * 4, -1, 1); }
    };
    const nxt = next[here];
    if (nxt < 0 || nxt === here) { drive(here); return; }
    const nx = nxt % W, ny = (nxt - nx) / W, holding = p.hold >= 0 && this.plates[p.hold].state === 'held';
    if (this.solid(nx, ny)) { drive(nxt); return; }
    if (p.hold >= 0 && !holding) { p.in.mx = p.in.my = 0; return; }                     // Arm fährt gerade aus
    if (holding) {                                                                       // Lücke vor mir: Platte hinlegen
      if (!this.free(nx, ny)) { p.in.mx = p.in.my = 0; return; }
      if (p.face === dirTo(nxt)) { p.in.mx = p.in.my = 0; this.act(p.id, 'grab'); } else face(dirTo(nxt));
      return;
    }
    // Ich brauche eine Platte, die nicht auf meinem weiteren Weg liegt
    const usable = (j, keep) => { const id = this.grid[j]; return id >= 0 && this.plates[id].state === 'ground' && !keep.has(j); };
    const ahead = route(here);
    for (let d = 0; d < 4; d++) {
      const ax = sx + DIRS[d][0], ay = sy + DIRS[d][1]; if (!this.inb(ax, ay) || !usable(ay * W + ax, ahead)) continue;
      if (p.face === d) { p.in.mx = p.in.my = 0; if (p.armCd <= 0) this.act(p.id, 'grab'); } else face(d);
      return;
    }
    // Keine in Reichweite: zum nächsten Feld fahren, neben dem eine brauchbare liegt
    const from = new Int16Array(N).fill(-1), q = [here]; from[here] = here;
    for (let h = 0; h < q.length; h++) {
      const cx = q[h] % W, cy = (q[h] - cx) / W;
      if (q[h] !== here) {
        const back = new Set(); for (let i = q[h]; i !== here; i = from[i]) back.add(i);
        if (DIRS.some(([dx, dy]) => this.inb(cx + dx, cy + dy) && usable((cy + dy) * W + cx + dx, back) && !ahead.has((cy + dy) * W + cx + dx))) {
          let step = q[h]; while (from[step] !== here) step = from[step];
          drive(step); return;
        }
      }
      for (const [dx, dy] of DIRS) { const ax = cx + dx, ay = cy + dy, j = ay * W + ax; if (this.solid(ax, ay) && from[j] < 0) { from[j] = q[h]; q.push(j); } }
    }
    p.botStuck = (p.botStuck || 0) + 1;                                                 // nichts zu holen: nach einer Weile heim
    if (p.botStuck > 60) { p.botStuck = 0; this.act(p.id, 'home'); }
    p.in.mx = p.in.my = 0;
  }
}

const api = { Game, C, W, H, DIRS, buildMap, rotMask };
if (typeof module === 'object' && module.exports) module.exports = api; else root.MGLogic = api;
})(typeof self !== 'undefined' ? self : this);
