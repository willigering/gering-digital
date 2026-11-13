(() => {
'use strict';
// ---------------------------------------------------------------- Konstanten
const T = 32, VW = 1600, VH = 900, MH = 28, F = 26, START_X = 12 * T, STEP = 1 / 120;
const COLORS = ['#ff4d5a', '#3fa9ff', '#ffd23f', '#5be37d', '#c77dff', '#ff9f43'];
const THEMES = [
  { name: 'Neonhafen', sky: ['#1b1040', '#6b2f7e'], far: '#2c1b5a', near: '#1d1140', tile: '#120d24', edge: '#ff4fd8', hook: '#ffe66d' },
  { name: 'Dachgarten', sky: ['#0d3b4f', '#f2a65a'], far: '#17566b', near: '#0e3a49', tile: '#0a222c', edge: '#7dffb0', hook: '#fff3b0' },
  { name: 'Schrottplatz', sky: ['#2b1d14', '#b55f2e'], far: '#4f301c', near: '#301c10', tile: '#1a110a', edge: '#ffb347', hook: '#e8f7ff' },
];
const ITEMS = { rocket: '🚀', crate: '📦', shock: '💥', lasso: '🧲', turbo: '⚡' };
const ITEM_NAMES = { rocket: 'Rakete', crate: 'Kiste', shock: 'Schockwelle', lasso: 'Magnet', turbo: 'Turbo' };
const fl = Math.floor, clamp = (v, a, b) => v < a ? a : v > b ? b : v, mod = (a, n) => ((a % n) + n) % n;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

// ---------------------------------------------------------------- Strecken
// Bausteine: b.r(x,y,w,h,typ) Rechteck, b.s(x,y,typ) Einzelfeld. '#' fest, 'H' Hakendecke,
// '^' Stacheln, '>' Boostfeld, 'T' Trampolin, '?' Itembox. Rückgabe = Breite in Feldern.
const M = {
  flat: (b, x, n = 20) => { b.s(x + (n >> 1), F - 3, '?'); return n; },
  hurdles: (b, x) => { b.r(x + 6, F - 1, 2, 1); b.r(x + 14, F - 2, 2, 2); b.r(x + 22, F - 1, 2, 1); b.s(x + 18, F - 6, '?'); return 30; },
  gate: (b, x) => { b.r(x + 8, F - 6, 6, 5); b.s(x + 11, F - 9, '?'); b.s(x + 16, F - 1, '>'); return 24; },
  plateau: (b, x) => { b.s(x + 6, F - 1, 'T'); b.r(x + 10, F - 7, 12, 7); b.s(x + 15, F - 8, '>'); b.s(x + 19, F - 10, '?'); return 30; },
  hookpit: (b, x) => { b.r(x + 8, F - 1, 22, 1, '^'); b.r(x + 6, F - 14, 26, 2); b.r(x + 6, F - 12, 26, 1, 'H'); b.r(x + 14, F - 4, 3, 1); b.r(x + 23, F - 4, 3, 1); b.s(x + 19, F - 7, '?'); return 38; },
  upper: (b, x) => { b.r(x + 3, F - 3, 3, 1); b.r(x + 9, F - 6, 26, 1); b.s(x + 13, F - 7, '>'); b.s(x + 24, F - 7, '>'); b.s(x + 19, F - 9, '?'); b.r(x + 16, F - 1, 2, 1); b.r(x + 24, F - 1, 3, 1, '^'); b.s(x + 31, F - 2, '?'); return 42; },
  tunnel: (b, x) => { b.r(x + 6, F - 12, 20, 9); b.r(x + 11, F - 3, 2, 2); b.r(x + 19, F - 3, 2, 2); b.s(x + 15, F - 2, '?'); b.s(x + 23, F - 1, '>'); return 32; },
  big: (b, x) => { b.s(x + 4, F - 1, 'T'); b.r(x + 8, F - 5, 26, 5); b.r(x + 17, F - 6, 2, 1); b.r(x + 22, F - 6, 4, 1, '^'); b.r(x + 12, F - 18, 18, 2); b.r(x + 12, F - 16, 18, 1, 'H'); b.s(x + 30, F - 8, '?'); return 40; },
  items: (b, x) => { b.s(x + 8, F - 2, '?'); b.s(x + 8, F - 5, '?'); b.s(x + 8, F - 8, '?'); return 16; },
  boost: (b, x) => { b.s(x + 3, F - 1, '>'); b.s(x + 6, F - 1, '>'); b.r(x + 12, F - 1, 13, 1, '^'); b.r(x + 15, F - 5, 6, 1); b.s(x + 18, F - 7, '?'); return 34; },
};
const SEQS = [
  [['flat', 24], 'hurdles', 'gate', 'hookpit', 'items', 'upper', 'plateau', 'boost', 'tunnel', 'big', ['flat', 12]],
  [['flat', 24], 'boost', 'big', 'items', 'tunnel', 'hookpit', 'plateau', 'hurdles', 'upper', 'gate', 'hookpit', ['flat', 12]],
  [['flat', 24], 'upper', 'hookpit', 'gate', 'items', 'hurdles', 'tunnel', 'boost', 'plateau', 'big', 'gate', ['flat', 12]],
];
function build(seq) {
  const cells = []; let W = 0;
  const b = { s: (x, y, c) => cells.push([x, y, c]), r: (x, y, w, h, c = '#') => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) cells.push([x + i, y + j, c]); } };
  for (const m of seq) { const [n, a] = Array.isArray(m) ? m : [m]; W += M[n](b, W, a); }
  const g = []; for (let y = 0; y < MH; y++) g.push(new Array(W).fill(y === 0 || y >= F ? '#' : ' '));
  const boxes = [], bi = {};
  for (const [x, y, c] of cells) { g[y][x] = c; if (c === '?') { bi[x + ',' + y] = boxes.length; boxes.push({ tx: x, ty: y, t: 0 }); } }
  return { W, g, boxes, bi };
}
let map = build(SEQS[0]), theme = THEMES[0];
const tile = (tx, ty) => ty < 0 || ty >= MH ? '#' : map.g[ty][mod(tx, map.W)];
const solid = (tx, ty) => { const c = tile(tx, ty); return c === '#' || c === 'H'; };
function hitRect(x, y, w, h) {
  const x0 = fl(x / T), x1 = fl((x + w - 0.001) / T), y0 = fl(y / T), y1 = fl((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}

// ---------------------------------------------------------------- Zustand
let myId = 0, lobby = null, phase = 'menu', goAt = 0, solo = false, roundNo = 0;
let camX = START_X, camT = START_X, kill = 800, shake = 0, banner = null, uid = 1;
const remotes = new Map();           // id -> {name,color,score,alive,buf[],rx,ry,...}
let rockets = [], crates = [], parts = [], fx = [];
const me = {};
function resetMe(slot) {
  Object.assign(me, { x: START_X - slot * 34, y: F * T, vx: 0, vy: 0, face: 1, ground: true, wall: 0, slide: false, hook: null,
    stun: 0, inv: 0, boost: 1, turbo: 0, item: null, jumps: 0, coy: 0, buf: 0, padCd: 0, launch: false, boosting: false, alive: true, miss: 0 });
}
resetMe(0); me.alive = false;

// ---------------------------------------------------------------- Ton
let ac;
function initAudio() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { } }
function beep(f, d = 0.1, type = 'square', v = 0.05, to) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(ac.destination); o.start(); o.stop(t + d);
}
const boomSfx = () => { beep(160, 0.35, 'sawtooth', 0.09, 30); beep(90, 0.3, 'square', 0.06, 25); };

// ---------------------------------------------------------------- Eingabe
const keys = {}, touch = {}, I = { l: 0, r: 0, jump: 0, down: 0, hook: 0, item: 0, boost: 0, jumpP: false, itemP: false, hookP: false };
const prev = { jump: false, item: false, hook: false };
addEventListener('keydown', e => {
  initAudio();
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (phase === 'game' && /^(Space|Arrow|Key[WASD])/.test(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('pointerdown', initAudio);
for (const b of document.querySelectorAll('#touch button')) {
  const k = b.dataset.k, set = v => e => { e.preventDefault(); touch[k] = v; b.classList.toggle('dn', v); };
  b.addEventListener('pointerdown', set(true)); b.addEventListener('pointerup', set(false));
  b.addEventListener('pointercancel', set(false)); b.addEventListener('pointerleave', set(false));
}
function readInput() {
  const g = (navigator.getGamepads ? navigator.getGamepads() : [])[0], gb = i => !!(g && g.buttons[i] && g.buttons[i].pressed), ax = g ? g.axes[0] || 0 : 0, ay = g ? g.axes[1] || 0 : 0;
  I.l = keys.KeyA || keys.ArrowLeft || touch.l || gb(14) || ax < -0.4;
  I.r = keys.KeyD || keys.ArrowRight || touch.r || gb(15) || ax > 0.4;
  I.jump = keys.Space || keys.KeyW || keys.ArrowUp || touch.jump || gb(0);
  I.down = keys.KeyS || keys.ArrowDown || touch.down || gb(13) || ay > 0.6;
  I.hook = keys.KeyJ || keys.ShiftLeft || keys.ShiftRight || keys.KeyX || touch.hook || gb(2) || gb(4);
  I.item = keys.KeyK || keys.KeyE || keys.KeyC || touch.item || gb(1) || gb(3);
  I.boost = keys.KeyL || keys.KeyQ || keys.KeyV || touch.boost || gb(5) || gb(7);
  if (I.jump && !prev.jump) I.jumpP = true;
  if (I.item && !prev.item) I.itemP = true;
  if (I.hook && !prev.hook) I.hookP = true;
  prev.jump = !!I.jump; prev.item = !!I.item; prev.hook = !!I.hook;
}

// ---------------------------------------------------------------- Physik (eigener Läufer)
const ph = p => p.slide ? 20 : 40;
function moveX(p, dx) {
  p.x += dx; const h = ph(p);
  if (!hitRect(p.x - 11, p.y - h, 22, h)) return false;
  if (dx > 0) p.x = fl((p.x + 11) / T) * T - 11 - 0.001; else p.x = fl((p.x - 11) / T) * T + T + 11;
  return true;
}
function moveY(p, dy) {
  p.y += dy; const h = ph(p);
  if (!hitRect(p.x - 11, p.y - h, 22, h)) return false;
  if (dy > 0) p.y = fl((p.y - 0.001) / T) * T; else p.y = fl((p.y - h) / T) * T + T + h;
  return true;
}
function dust(x, y, n, col = '#fff', sp = 160) {
  for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * sp, vy: (Math.random() - 0.8) * sp, l: 0.3 + Math.random() * 0.3, c: col, s: 3 + Math.random() * 4 });
}
function boom(x, y) {
  for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, s = 100 + Math.random() * 420; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: 0.3 + Math.random() * 0.4, c: i % 2 ? '#ffd23f' : '#ff6b3f', s: 5 + Math.random() * 7 }); }
  fx.push({ k: 'ring', x, y, t: 0, r: 120 });
  boomSfx();
}
function hurt(stun, vxMul, vy) {
  if (me.inv > 0 || !me.alive) return false;
  me.stun = stun; me.vx *= vxMul; me.vy = vy; me.inv = stun + 1.1; me.hook = null; me.turbo = 0;
  shake = 12; beep(220, 0.25, 'sawtooth', 0.08, 60);
  dust(me.x, me.y - 20, 10, '#ff5a5a', 300);
  return true;
}
function tryHook(p) {
  for (const deg of [45, 35, 55, 25, 65]) {
    const a = deg * Math.PI / 180, dx = Math.cos(a) * p.face, dy = -Math.sin(a), ox = p.x, oy = p.y - 30;
    for (let s = 16; s < 580; s += 6) {
      const px = ox + dx * s, py = oy + dy * s, c = tile(fl(px / T), fl(py / T));
      if (c === 'H') {
        const L = Math.hypot(px - p.x, py - (p.y - 20));
        p.hook = { ax: px, ay: py, L, min: Math.min(L, 230) }; p.slide = p.slide && hitRect(p.x - 11, p.y - 40, 22, 20);
        beep(700, 0.08, 'square', 0.05, 1200); return;
      }
      if (c === '#') break;
    }
  }
  p.miss = 0.15; beep(200, 0.06, 'square', 0.03);
}
function releaseHook(p) {
  p.hook = null; p.vx = clamp(p.vx * 1.08, -1050, 1050); if (p.vy > -200) p.vy -= 150; p.jumps = 1;
  beep(500, 0.08, 'triangle', 0.04, 300);
}
function rollItem() {
  let ahead = 0, n = 0; for (const r of remotes.values()) if (r.alive) { n++; if (r.rx > me.x) ahead++; }
  const pool = n && !ahead ? ['crate', 'crate', 'shock', 'turbo'] : ['rocket', 'rocket', 'lasso', 'turbo', 'shock', 'crate'];
  return pool[fl(Math.random() * pool.length)];
}
function nearestAhead(maxD) {
  let best = 0, bd = maxD; for (const [id, r] of remotes) if (r.alive && r.rx > me.x && r.rx - me.x < bd) { bd = r.rx - me.x; best = id; }
  return best;
}
function useItem(p) {
  const k = p.item; p.item = null;
  if (k === 'rocket') { const m = { t: 'ev', k: 'rk', r: myId * 1e5 + uid++, x: Math.round(p.x + p.face * 24), y: Math.round(p.y - 24), a: p.face > 0 ? 0 : Math.PI, tg: nearestAhead(2500) }; send(m); m.id = myId; onEv(m); }
  else if (k === 'crate') { const m = { t: 'ev', k: 'cr', c: myId * 1e5 + uid++, x: Math.round(p.x - p.face * 34), y: Math.round(p.y - 4) }; send(m); m.id = myId; onEv(m); }
  else if (k === 'shock') { const m = { t: 'ev', k: 'sh', x: Math.round(p.x), y: Math.round(p.y - 20) }; send(m); m.id = myId; onEv(m); }
  else if (k === 'lasso') { const m = { t: 'ev', k: 'ls', tg: nearestAhead(1200) }; send(m); m.id = myId; onEv(m); p.vx = Math.min(1050, Math.max(p.vx, 300) + 420); p.vy = Math.min(p.vy, -220); }
  else if (k === 'turbo') { p.turbo = 1.8; p.boost = 1; beep(300, 0.4, 'sawtooth', 0.06, 1200); }
}
function stepMe(dt, now) {
  const p = me;
  p.inv = Math.max(0, p.inv - dt); p.padCd -= dt; p.miss -= dt;
  let dir = (I.r ? 1 : 0) - (I.l ? 1 : 0);
  const ctrl = p.stun <= 0;
  if (!ctrl) { p.stun -= dt; dir = 0; }
  if (dir && !p.hook && !p.slide) p.face = dir;
  if (I.jumpP) p.buf = 0.12; else p.buf -= dt;
  p.coy = p.ground ? 0.1 : p.coy - dt;
  let boosting = false;
  if (ctrl && I.boost && p.boost > 0.02 && dir) { boosting = true; p.boost -= dt / 1.6; } else if (!I.boost) p.boost = Math.min(1, p.boost + dt * 0.07);
  if (p.turbo > 0) { p.turbo -= dt; boosting = true; }
  p.boosting = boosting;
  const max = boosting ? 880 : 580;
  // Rutschen
  if (p.ground && ctrl && I.down && !p.slide && !p.hook) { p.slide = true; if (Math.abs(p.vx) < 320) p.vx = p.face * 320; beep(180, 0.12, 'sawtooth', 0.03, 90); }
  if (p.slide) {
    if (hitRect(p.x - 11, p.y - 40, 22, 20)) { if (Math.abs(p.vx) < 260) p.vx = p.face * 260; }
    else if (!I.down || Math.abs(p.vx) < 120 || !p.ground) p.slide = false;
  }
  // Haken
  if (ctrl && I.hookP && !p.hook) tryHook(p);
  if (p.hook && (!I.hook || !ctrl)) releaseHook(p);
  // Horizontal
  if (p.hook) {
    const h = p.hook; h.L = Math.max(h.min, h.L - 320 * dt);
    const dx = p.x - h.ax, dy = p.y - 20 - h.ay, len = Math.hypot(dx, dy) || 1;
    p.vx += dy / len * p.face * 520 * dt; p.vy += -dx / len * p.face * 520 * dt;
    if (dir) p.vx += dir * 200 * dt;
  } else if (p.slide) p.vx = approach(p.vx, 0, 220 * dt);
  else if (p.ground) {
    if (dir) { if (Math.sign(p.vx) === dir && Math.abs(p.vx) > max) p.vx = approach(p.vx, dir * max, 400 * dt); else p.vx = approach(p.vx, dir * max, (boosting ? 3200 : 2200) * dt); }
    else p.vx = approach(p.vx, 0, (ctrl ? 2600 : 900) * dt);
  } else {
    if (dir) { if (Math.sign(p.vx) === dir && Math.abs(p.vx) > max) p.vx = approach(p.vx, dir * max, 100 * dt); else p.vx = approach(p.vx, dir * max, (boosting ? 2200 : 1500) * dt); }
    else p.vx = approach(p.vx, 0, 250 * dt);
  }
  // Springen
  if (ctrl && p.buf > 0 && !p.hook) {
    const blocked = p.slide && hitRect(p.x - 11, p.y - 40, 22, 20);
    if (p.coy > 0 && !blocked) { p.vy = -820; p.coy = 0; p.buf = 0; p.jumps = 1; p.slide = false; p.launch = false; dust(p.x, p.y, 5); beep(380, 0.1, 'square', 0.04, 620); }
    else if (p.wall && !p.ground) { p.vy = -780; p.vx = -p.wall * 560; p.face = -p.wall; p.jumps = 1; p.buf = 0; p.launch = false; dust(p.x + p.wall * 11, p.y - 20, 5); beep(440, 0.1, 'square', 0.04, 760); }
    else if (p.jumps < 2 && !p.ground && !blocked) { p.vy = -720; p.jumps = 2; p.buf = 0; p.launch = false; dust(p.x, p.y, 6, '#bfe9ff'); beep(520, 0.1, 'square', 0.04, 880); }
  }
  if (!I.jump && p.vy < -300 && !p.launch && !p.hook) p.vy += 3000 * dt;
  p.vy += 2400 * dt;
  if (p.wall && !p.ground && p.vy > 170 && dir === p.wall && !p.hook) p.vy = 170;
  p.vx = clamp(p.vx, -1100, 1100); p.vy = clamp(p.vy, -1500, 1500);
  // Bewegen
  if (moveX(p, p.vx * dt)) { p.vx = 0; if (p.hook) releaseHook(p); }
  const vy0 = p.vy;
  if (moveY(p, p.vy * dt)) { if (vy0 > 700) dust(p.x, p.y, 6); p.vy = 0; }
  if (p.hook) {
    const h = p.hook, dx = p.x - h.ax, dy = p.y - 20 - h.ay, len = Math.hypot(dx, dy) || 1, nx = dx / len, ny = dy / len;
    if (len > h.L) {
      const k = h.L - len; moveX(p, nx * k); moveY(p, ny * k);
      const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx; p.vy -= vr * ny; }
    }
    if (dy < 24 || nx * p.face > 0.8) releaseHook(p);
  }
  const h = ph(p);
  p.ground = p.vy >= 0 && hitRect(p.x - 11, p.y, 22, 1);
  if (p.ground) { p.jumps = 0; p.launch = false; }
  p.wall = p.ground ? 0 : hitRect(p.x + 11, p.y - h + 4, 2, h - 8) ? 1 : hitRect(p.x - 13, p.y - h + 4, 2, h - 8) ? -1 : 0;
  // Felder
  const x0 = fl((p.x - 11) / T), x1 = fl((p.x + 11) / T), y0 = fl((p.y - h) / T), y1 = fl((p.y - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tile(tx, ty);
    if (c === '^') { if (p.y > ty * T + 14) hurt(0.5, 0.3, -380); }
    else if (c === '>') { if (p.ground && p.padCd <= 0) { p.vx = Math.max(p.vx, 980); p.boost = Math.min(1, p.boost + 0.25); p.padCd = 0.3; beep(260, 0.25, 'sawtooth', 0.05, 900); } }
    else if (c === 'T') { if (p.vy >= 0 && p.y > ty * T + 12) { p.vy = -1180; p.launch = true; p.jumps = 1; p.ground = false; p.slide = false; beep(200, 0.25, 'sine', 0.09, 800); dust(p.x, p.y, 8, '#7dffb0'); } }
    else if (c === '?') {
      const i = map.bi[mod(tx, map.W) + ',' + ty], b = map.boxes[i];
      if (b && now >= b.t && !p.item) { b.t = now + 6000; p.item = rollItem(); send({ t: 'ev', k: 'box', i }); beep(660, 0.08, 'square', 0.05); setTimeout(() => beep(990, 0.12, 'square', 0.05), 80); dust(tx * T + 16, ty * T + 16, 10, '#ffd23f', 260); }
    }
  }
  if (ctrl && I.itemP && p.item) useItem(p);
  if (boosting && Math.random() < 0.6) parts.push({ x: p.x - p.face * 10, y: p.y - 8 - Math.random() * 20, vx: -p.vx * 0.2, vy: (Math.random() - 0.5) * 60, l: 0.25, c: p.turbo > 0 ? '#7df9ff' : '#ffb347', s: 5 });
}

// ---------------------------------------------------------------- Welt (Items, Effekte)
function posOf(id) {
  if (id === myId) return me.alive ? { x: me.x, y: me.y - 20 } : null;
  const r = remotes.get(id); return r && r.alive && r.rx != null ? { x: r.rx, y: r.ry - 20 } : null;
}
function onEv(m) {
  const k = m.k, now = performance.now();
  if (k === 'box') { const b = map.boxes[m.i]; if (b) b.t = now + 6000; }
  else if (k === 'rk') { rockets.push({ id: m.r, x: +m.x, y: +m.y, a: +m.a, tg: m.tg, o: m.id, t: 0 }); beep(900, 0.3, 'sawtooth', 0.05, 200); }
  else if (k === 'rx') { const i = rockets.findIndex(r => r.id === m.r); if (i >= 0) { boom(rockets[i].x, rockets[i].y); rockets.splice(i, 1); } }
  else if (k === 'cr') crates.push({ id: m.c, x: +m.x, y: +m.y, vy: 0, o: m.id, t: 0 });
  else if (k === 'cx') { const i = crates.findIndex(c => c.id === m.c); if (i >= 0) { dust(crates[i].x, crates[i].y - 16, 14, '#c98a4b', 320); crates.splice(i, 1); beep(140, 0.15, 'square', 0.06, 60); } }
  else if (k === 'sh') {
    fx.push({ k: 'ring', x: +m.x, y: +m.y, t: 0, r: 300 }); boomSfx();
    if (m.id !== myId && me.alive && Math.hypot(me.x - m.x, me.y - 20 - m.y) < 300 && hurt(0.7, 0.2, -420)) me.vx += Math.sign(me.x - m.x || 1) * 260;
  }
  else if (k === 'ls') {
    fx.push({ k: 'line', a: m.id, b: m.tg, t: 0 }); beep(1200, 0.2, 'sine', 0.06, 300);
    if (m.tg === myId && me.alive && me.inv <= 0) { me.vx *= 0.35; me.stun = 0.35; shake = 8; }
  }
}
function stepWorld(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; r.t += dt;
    const tp = r.tg ? posOf(r.tg) : null;
    if (tp) { let d = Math.atan2(tp.y - r.y, tp.x - r.x) - r.a; d = Math.atan2(Math.sin(d), Math.cos(d)); r.a += clamp(d, -4 * dt, 4 * dt); }
    r.x += Math.cos(r.a) * 950 * dt; r.y += Math.sin(r.a) * 950 * dt;
    parts.push({ x: r.x, y: r.y, vx: 0, vy: 0, l: 0.25, c: '#ffb347', s: 6 });
    if (me.alive && r.o !== myId && Math.hypot(me.x - r.x, me.y - 20 - r.y) < 34 && hurt(0.9, 0.15, -450)) { send({ t: 'ev', k: 'rx', r: r.id }); boom(r.x, r.y); rockets.splice(i, 1); continue; }
    if (r.t > 4 || solid(fl(r.x / T), fl(r.y / T))) { boom(r.x, r.y); rockets.splice(i, 1); }
  }
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i]; c.t += dt;
    if (!solid(fl(c.x / T), fl((c.y + 1) / T))) { c.vy += 2400 * dt; c.y += c.vy * dt; if (solid(fl(c.x / T), fl(c.y / T))) { c.y = fl(c.y / T) * T; c.vy = 0; } }
    if (me.alive && (c.o !== myId || c.t > 0.7) && Math.abs(me.x - c.x) < 28 && me.y > c.y - 34 && me.y - ph(me) < c.y && hurt(0.6, 0.2, -300)) { send({ t: 'ev', k: 'cx', c: c.id }); onEv({ k: 'cx', c: c.id }); continue; }
    if (c.t > 20) crates.splice(i, 1);
  }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.l -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.l <= 0) parts.splice(i, 1); }
  for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 0.35) fx.splice(i, 1); }
  if (parts.length > 500) parts.splice(0, parts.length - 500);
}
function interp(r, now) {
  const b = r.buf; if (!b.length) return null;
  const t = now - 90; let i = b.length - 1; while (i > 0 && b[i].t > t) i--;
  const a = b[i], c = b[i + 1];
  if (c && c.t > a.t) { const k = clamp((t - a.t) / (c.t - a.t), 0, 1); return { s: c.s, x: a.s[0] + (c.s[0] - a.s[0]) * k, y: a.s[1] + (c.s[1] - a.s[1]) * k }; }
  const e = clamp((t - a.t) / 1000, 0, 0.12); return { s: a.s, x: a.s[0] + a.s[2] * e, y: a.s[1] };
}

// ---------------------------------------------------------------- Netz
// Der Webspace kann nur PHP: api.php führt die Lobbyliste und vermittelt den Verbindungsaufbau.
// Danach laufen alle Spieldaten per WebRTC direkt zwischen den Browsern. Der Lobby-Ersteller
// ist der Host: Sein Browser führt die Rundenlogik (Host unten) und verteilt die Positionen.
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
const tok = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const api = (a, body) => fetch('api.php?a=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(Object.assign({ tok }, body)) }).then(r => r.json());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const iceDone = pc => new Promise(res => {
  if (pc.iceGatheringState === 'complete') return res();
  const t = setTimeout(res, 2500);
  pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
});
const plainSdp = d => ({ sdp: { type: d.type, sdp: d.sdp } });
let link = null, hosting = false, busy = false;   // link: Verbindung eines Gastes zum Host
const $ = id => document.getElementById(id);
function status(msg, good) { $('status').style.color = good ? '#7dffb0' : '#ff8a8a'; $('status').textContent = msg || ''; }
function show(s) {
  phase = s;
  $('menu').classList.toggle('on', s === 'menu'); $('lobby').classList.toggle('on', s === 'lobby');
  document.body.classList.toggle('game', s === 'game');
}
function send(o) {
  if (hosting) return Host.handle(Host.local, JSON.parse(JSON.stringify(o)));
  if (!link) return;
  const ch = o.t === 's' && link.u.readyState === 'open' ? link.u : link.r;
  if (ch.readyState === 'open') ch.send(JSON.stringify(o));
}
function toMenu(msg) {
  if (link) { const l = link; link = null; try { l.pc.close(); } catch { } }
  lobby = null; remotes.clear(); history.replaceState(null, '', location.pathname); show('menu'); status(msg); refreshList();
}
async function joinLobby(id) {
  if (busy || hosting || link) return;
  busy = true; status('Verbinde mit Lobby ' + id + ' …', true);
  const name = myName();
  let pc;
  try {
    pc = new RTCPeerConnection(ICE);
    const r = pc.createDataChannel('r'), u = pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 }), lk = { pc, r, u };
    let open = false; r.onopen = () => { open = true; };
    r.onmessage = u.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
    await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc);
    const s = await api('signal', { id, to: 'host', data: plainSdp(pc.localDescription) });
    if (s.gone) throw new Error('Diese Lobby gibt es nicht mehr.');
    if (s.err) throw new Error(s.err);
    for (let i = 0; i < 30 && !open; i++) {
      await sleep(600);
      if (open || pc.remoteDescription) continue;
      const p = await api('poll', { id });
      if (p.gone) throw new Error('Diese Lobby gibt es nicht mehr.');
      for (const m of p.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'answer' && !pc.remoteDescription) await pc.setRemoteDescription(m.data.sdp);
    }
    if (!open) throw new Error('Verbindung fehlgeschlagen – dein Netzwerk oder das des Hosts lässt keine Direktverbindung zu.');
    link = lk; status('');
    r.onclose = () => { if (link === lk) toMenu('Verbindung zum Host verloren.'); };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' && link === lk) toMenu('Verbindung zum Host verloren.'); };
    send({ t: 'join', name });
  } catch (e) {
    try { if (pc) pc.close(); } catch { }
    history.replaceState(null, '', location.pathname); status(e && e.message ? e.message : 'Verbindung fehlgeschlagen.');
  }
  busy = false;
}
async function createLobby() {
  if (busy || hosting || link) return;
  busy = true; status('Erstelle Lobby …', true);
  try { await Host.open(myName()); status(''); } catch (e) { status(e && e.message ? e.message : 'Lobby konnte nicht erstellt werden.'); }
  busy = false;
}
let listT = 0;
function refreshList() {
  listT = performance.now();
  return api('list').then(r => { if (r.ls) renderList(r.ls); if (phase === 'menu' && !busy && $('status').textContent.startsWith('Keine Verbindung')) status(''); return r.ls || []; })
    .catch(() => { if (phase === 'menu' && !busy) status('Keine Verbindung zum Server.'); return []; });
}
setInterval(() => { if (phase === 'menu' && !document.hidden && performance.now() - listT > 3500) refreshList(); }, 1000);

// ---------------------------------------------------------------- Host: Lobby- und Rundenlogik
const Host = (() => {
  const MAXP = 6, WIN = 3, H = { local: null }, peers = new Map();
  let L = null, nextId = 1, worker = null, iv = 0, lastPoll = 0;
  const bc = (o, except) => { const s = JSON.stringify(o), u = o.t === 's'; for (const p of L.players) if (p !== except) p.sendRaw(s, u); };
  const clean = n => String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Flitzer' + (10 + fl(Math.random() * 90));
  const mk = (sendRaw, close) => ({ id: nextId++, name: '', color: 0, score: 0, alive: false, s: null, in: false, sendRaw, close });
  const later = (ms, fn) => { L.at = Date.now() + ms; L.fn = fn; };
  function sendLobby() {
    bc({ t: 'lobby', id: L.id, name: L.name, state: L.state === 'lobby' ? 'lobby' : 'game', map: L.map, host: L.host.id, ps: L.players.map(p => ({ id: p.id, name: p.name, c: p.color, sc: p.score })) });
  }
  function join(c, name) {
    if (c.in) return;
    if (L.players.length >= MAXP) { c.sendRaw(JSON.stringify({ t: 'err', m: 'Lobby ist voll (max. 6).' })); return c.close(); }
    c.in = true; c.name = clean(name); c.score = 0; c.alive = false; c.s = null;
    for (let i = 0; i < MAXP; i++) if (!L.players.some(p => p.color === i)) { c.color = i; break; }
    L.players.push(c); sendLobby();
    if (L.state !== 'lobby') {
      if (L.solo) { for (const p of L.players) p.score = 0; L.round = 0; startRound(); }
      else c.sendRaw(JSON.stringify({ t: 'round', map: L.curMap, in: Math.max(0, L.tGo - Date.now()), order: L.order, round: L.round, solo: false, spec: true }));
    }
    lastPoll = 0;
  }
  function leave(c) {
    if (!c.in || !L) return;
    c.in = false; L.players.splice(L.players.indexOf(c), 1);
    bc({ t: 'gone', id: c.id }); sendLobby(); checkEnd(); lastPoll = 0;
  }
  function startRound() {
    L.fn = null; L.state = 'countdown'; L.round++;
    L.order = L.players.map(p => p.id).sort(() => Math.random() - 0.5);
    for (const p of L.players) { p.alive = true; p.s = null; }
    L.solo = L.players.length === 1; L.cam = START_X + 100; L.kill = 800; L.tGo = Date.now() + 3600;
    bc({ t: 'round', map: L.curMap, in: 3600, order: L.order, round: L.round, solo: L.solo });
  }
  function toLobby() { L.fn = null; L.state = 'lobby'; L.round = 0; for (const p of L.players) p.score = 0; sendLobby(); lastPoll = 0; }
  function checkEnd(fallback) {
    if (L.state !== 'race' || L.solo) return;
    const alive = L.players.filter(p => p.alive);
    if (alive.length > 1) return;
    const w = alive[0] || (fallback && fallback.in ? fallback : null);
    if (w) w.score++;
    L.state = 'end';
    const sc = {}; for (const p of L.players) sc[p.id] = p.score;
    const match = !!(w && w.score >= WIN);
    bc({ t: 'roundEnd', w: w ? w.id : 0, sc, match });
    later(match ? 7000 : 3500, match ? toLobby : startRound);
  }
  function tick() {
    if (!L) return;
    const now = Date.now();
    if (L.fn && now >= L.at) { const f = L.fn; L.fn = null; f(); }
    if (now - lastPoll > (L.state === 'lobby' ? 1500 : 3000)) { lastPoll = now; poll(); }
    if (L.state === 'lobby') return;
    if (L.state === 'countdown' && now >= L.tGo) L.state = 'race';
    if (L.state !== 'countdown') {
      const rt = (now - L.tGo) / 1000;
      let lead = -1e9;
      for (const p of L.players) if (p.alive && p.s) lead = Math.max(lead, p.s[0]);
      if (lead > -1e9) L.cam += (lead + 100 - L.cam) * 0.2;
      if (!L.solo && L.state === 'race') {
        L.kill = rt > 16 ? Math.max(150, 800 - (rt - 16) * 26) : 800;
        if (rt > 1.2) {
          const px = p => p.s ? p.s[0] : START_X; // wer nie etwas sendet (Tab im Hintergrund), steht am Start
          const out = L.players.filter(p => p.alive && px(p) < L.cam - L.kill - 14).sort((a, b) => px(a) - px(b));
          let aliveN = L.players.filter(p => p.alive).length, last = null;
          for (const p of out) { if (aliveN <= 1) break; p.alive = false; aliveN--; last = p; bc({ t: 'elim', id: p.id }); }
          if (last) checkEnd(last);
        }
      }
    }
    const ps = {};
    for (const p of L.players) if (p.alive && p.s) ps[p.id] = p.s;
    bc({ t: 's', c: Math.round(L.cam), k: Math.round(L.kill), ps });
  }
  H.handle = (c, m) => {
    if (!L || !m || typeof m !== 'object') return;
    if (m.t === 'join') return join(c, m.name);
    if (!c.in) return;
    switch (m.t) {
      case 's': if (Array.isArray(m.s) && m.s.length <= 9) c.s = m.s.map(v => +v || 0); break;
      case 'ev': if (c.alive && L.state !== 'lobby') { m.id = c.id; bc(m, c); } break;
      case 'leave': if (c === H.local) H.close(); else { leave(c); c.close(); } break;
      case 'map': if (c === L.host && L.state === 'lobby') { const i = fl(+m.i); L.map = i >= 0 && i < SEQS.length ? i : -1; sendLobby(); } break;
      case 'start':
        if (c === L.host && L.state === 'lobby') {
          L.curMap = L.map < 0 ? fl(Math.random() * SEQS.length) : L.map;
          for (const p of L.players) p.score = 0;
          L.round = 0; startRound(); lastPoll = 0;
        }
        break;
      case 'stop': if (c === L.host && L.state !== 'lobby') toLobby(); break;
    }
  };
  // Verbindungswunsch eines Gastes annehmen
  async function onOffer(from, sdp) {
    if (peers.size >= 10 && !peers.has(from)) return;
    if (peers.has(from)) { try { peers.get(from).pc.close(); } catch { } }
    const pc = new RTCPeerConnection(ICE), peer = { pc, r: null, u: null, conn: null };
    peers.set(from, peer);
    const drop = () => { if (peers.get(from) === peer) peers.delete(from); if (peer.conn) leave(peer.conn); try { pc.close(); } catch { } };
    const onm = e => { if (!peer.conn || typeof e.data !== 'string' || e.data.length > 600) return; let m; try { m = JSON.parse(e.data); } catch { return; } H.handle(peer.conn, m); };
    pc.ondatachannel = e => {
      const ch = e.channel; ch.onmessage = onm;
      if (ch.label === 'u') { peer.u = ch; return; }
      peer.r = ch;
      const up = () => {
        if (peer.conn) return;
        peer.conn = mk((s, unrel) => { const c = unrel && peer.u && peer.u.readyState === 'open' ? peer.u : ch; if (c.readyState === 'open') try { c.send(s); } catch { } }, () => setTimeout(drop, 300));
        peer.conn.sendRaw(JSON.stringify({ t: 'hi', id: peer.conn.id }));
      };
      ch.onopen = up; ch.onclose = drop; if (ch.readyState === 'open') up();
    };
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(); };
    try {
      await pc.setRemoteDescription(sdp); await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
      if (L) await api('signal', { id: L.id, to: from, data: plainSdp(pc.localDescription) });
    } catch { drop(); }
  }
  function poll() {
    const id = L.id;
    api('poll', { id, n: L.players.length, run: L.state !== 'lobby' }).then(async r => {
      if (!L || L.id !== id) return;
      if (r.gone) { // Lobby war zu lange ohne Lebenszeichen und wurde ausgetragen: neu anmelden
        const c = await api('create', { name: L.host.name });
        if (L && c.id) { L.id = c.id; L.name = c.name; sendLobby(); }
        return;
      }
      for (const m of r.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'offer') onOffer(m.from, m.data.sdp);
    }).catch(() => { });
  }
  H.open = async name => {
    const r = await api('create', { name });
    if (!r.id) throw new Error(r.err || 'Lobby konnte nicht erstellt werden.');
    H.local = mk(s => onMsg(JSON.parse(s)), () => { });
    L = { id: r.id, name: r.name, players: [], host: H.local, state: 'lobby', map: -1, curMap: 0, cam: 0, kill: 800, tGo: 0, round: 0, solo: false, order: [], at: 0, fn: null };
    hosting = true; lastPoll = Date.now();
    onMsg({ t: 'hi', id: H.local.id }); join(H.local, name);
    // Taktgeber im Worker: läuft auch weiter, wenn der Tab des Hosts im Hintergrund ist.
    try { worker = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'], { type: 'text/javascript' }))); worker.onmessage = tick; }
    catch { iv = setInterval(tick, 33); }
  };
  H.close = () => {
    if (worker) { worker.terminate(); worker = null; } clearInterval(iv);
    for (const p of peers.values()) { try { p.pc.close(); } catch { } } peers.clear();
    if (L) { try { fetch('api.php?a=close', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tok, id: L.id }) }).catch(() => { }); } catch { } }
    L = null; hosting = false; H.local = null;
  };
  return H;
})();
addEventListener('pagehide', () => { if (hosting) Host.close(); });
const myName = () => { const n = $('name').value.trim(); try { localStorage.setItem('hj_name', n); } catch { } return n; };
function onMsg(m) {
  const now = performance.now();
  switch (m.t) {
    case 'hi': myId = m.id; break;
    case 'err': toMenu(m.m); break;
    case 'lobby': {
      lobby = m;
      const ids = new Set();
      for (const p of m.ps) {
        ids.add(p.id); if (p.id === myId) continue;
        let r = remotes.get(p.id); if (!r) { r = { buf: [], alive: false, rx: null, ry: null }; remotes.set(p.id, r); }
        r.name = p.name; r.color = p.c; r.score = p.sc;
      }
      for (const id of [...remotes.keys()]) if (!ids.has(id)) remotes.delete(id);
      history.replaceState(null, '', '#' + m.id);
      if (m.state === 'lobby') { show('lobby'); renderLobby(); }
      break;
    }
    case 'round': {
      map = build(SEQS[m.map]); theme = THEMES[m.map]; solo = m.solo; roundNo = m.round;
      rockets = []; crates = []; parts = []; fx = []; banner = null; kill = 800;
      const slot = Math.max(0, m.order.indexOf(myId));
      resetMe(slot); me.alive = !m.spec && m.order.includes(myId);
      for (const [id, r] of remotes) { r.alive = m.order.includes(id); r.buf = []; r.rx = null; }
      camX = camT = START_X + 100; goAt = now + m.in; lastCount = 4;
      show('game');
      if (m.spec) banner = { text: 'Zuschauer', sub: 'Du bist in der nächsten Runde dabei', until: now + 3000, col: '#fff' };
      break;
    }
    case 's':
      camT = m.c; kill = m.k;
      for (const id in m.ps) { const r = remotes.get(+id); if (r) { r.buf.push({ t: now, s: m.ps[id] }); if (r.buf.length > 12) r.buf.shift(); } }
      break;
    case 'ev': onEv(m); break;
    case 'elim': {
      const p = posOf(m.id); if (p) boom(p.x, p.y);
      if (m.id === myId) { me.alive = false; me.hook = null; banner = { text: 'RAUS!', sub: 'Zu langsam …', until: now + 1800, col: '#ff5a5a' }; shake = 20; }
      else { const r = remotes.get(m.id); if (r) r.alive = false; }
      break;
    }
    case 'gone': { const r = remotes.get(m.id); if (r) r.alive = false; break; }
    case 'roundEnd': {
      if (lobby) for (const p of lobby.ps) if (m.sc[p.id] != null) p.sc = m.sc[p.id];
      const w = lobby && lobby.ps.find(p => p.id === m.w), nm = w ? (w.id === myId ? 'Du' : w.name) : 'Niemand';
      banner = m.match ? { text: (w && w.id === myId ? 'DU GEWINNST' : nm + ' GEWINNT') + ' DAS MATCH!', sub: '🏆 Gleich geht es zurück in die Lobby', until: now + 7000, col: w ? COLORS[w.c] : '#fff' }
        : { text: nm + (w && w.id === myId ? ' gewinnst' : ' gewinnt') + ' die Runde!', sub: 'Nächste Runde startet …', until: now + 3500, col: w ? COLORS[w.c] : '#fff' };
      beep(523, 0.15, 'square', 0.06); setTimeout(() => beep(659, 0.15, 'square', 0.06), 150); setTimeout(() => beep(784, 0.3, 'square', 0.06), 300);
      break;
    }
  }
}
// ---------------------------------------------------------------- Menü / Lobby (DOM)
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function renderList(ls) {
  $('list').innerHTML = ls.length ? ls.map(l => `<div class="lob"><b>${esc(l.name)}</b><small>${l.n}/6 · ${l.run ? 'läuft' : 'wartet'}</small><button data-id="${esc(l.id)}" ${l.n >= 6 ? 'disabled' : ''}>Beitreten</button></div>`).join('')
    : '<div class="empty">Noch keine offenen Lobbys – erstelle eine und lade Freunde per Link ein!</div>';
}
function renderLobby() {
  const L = lobby, host = L.host === myId;
  $('lname').textContent = L.name; $('lcode').textContent = L.id; $('err').textContent = '';
  let h = ''; for (let i = 0; i < 6; i++) { const p = L.ps[i]; h += p ? `<div class="pl"><i style="background:${COLORS[p.c]}"></i>${esc(p.name)}${p.id === L.host ? ' 👑' : ''}${p.id === myId ? ' (du)' : ''}</div>` : '<div class="pl free"><i style="background:#3a2c66"></i>frei</div>'; }
  $('players').innerHTML = h;
  $('map').innerHTML = `<option value="-1">Zufällig</option>` + THEMES.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
  $('map').value = L.map; $('map').disabled = !host;
  $('start').disabled = !host; $('start').textContent = host ? (L.ps.length > 1 ? 'Start!' : 'Solo-Training starten') : 'Warte auf Host …';
}
$('list').addEventListener('click', e => { const id = e.target.dataset && e.target.dataset.id; if (id) joinLobby(id); });
$('quick').onclick = async () => {
  if (busy) return;
  const ls = (await refreshList()).filter(l => l.n < 6), l = ls.find(x => !x.run) || ls[0];
  if (l) joinLobby(l.id); else createLobby();
};
$('create').onclick = createLobby;
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') $('quick').click(); });
$('start').onclick = () => send({ t: 'start' });
$('map').onchange = () => send({ t: 'map', i: +$('map').value });
const leaveLobby = () => { send({ t: 'leave' }); if (link) { const l = link; link = null; setTimeout(() => { try { l.pc.close(); } catch { } }, 200); } toMenu(''); };
$('leave').onclick = leaveLobby; $('quit').onclick = leaveLobby;
$('copy').onclick = () => { const u = location.origin + location.pathname + '#' + lobby.id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $('err').style.color = '#7dffb0'; $('err').textContent = 'Link kopiert!'; }, () => { $('err').textContent = u; }); };
try { $('name').value = localStorage.getItem('hj_name') || ''; } catch { }

// ---------------------------------------------------------------- Zeichnen
const cv = $('cv'), ctx = cv.getContext('2d');
let scale = 1, offX = 0, offY = 0;
function resize() {
  const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d;
  scale = Math.min(cv.width / VW, cv.height / VH); offX = (cv.width - VW * scale) / 2; offY = (cv.height - VH * scale) / 2;
}
addEventListener('resize', resize); resize();
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
const hash = i => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };
function drawRunner(x, y, vx, st, face, col, t, blink, boosting) {
  ctx.save(); ctx.translate(x, y);
  if (blink && fl(t / 70) % 2) ctx.globalAlpha = 0.35;
  ctx.scale(face || 1, 1);
  const sp = Math.abs(vx);
  if (st === 2) {
    ctx.fillStyle = col; rr(-19, -19, 36, 19, 9);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(4, -19, 6, 19);
    ctx.fillStyle = '#fff'; rr(8, -15, 9, 7, 3); ctx.fillStyle = '#111'; ctx.fillRect(13, -13, 3, 4);
  } else {
    ctx.rotate(st === 4 ? Math.sin(t / 45) * 0.6 : clamp(vx * (face || 1) / 900, -0.2, 0.34));
    const air = st === 1 || st === 3 || st === 5, a = sp > 40 && !air ? Math.sin(x * 0.07) * 10 : 0;
    ctx.strokeStyle = '#0b0716'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, -11); ctx.lineTo(air ? -10 : -4 + a, air ? -3 : -1); ctx.moveTo(4, -11); ctx.lineTo(air ? 9 : 4 - a, air ? -6 : -1); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    const len = 10 + Math.min(30, sp / 22); ctx.beginPath(); ctx.moveTo(-10, -30);
    ctx.quadraticCurveTo(-10 - len / 2, -30 + Math.sin(t / 60) * 6, -10 - len, -28 + Math.cos(t / 80) * 5); ctx.stroke();
    ctx.fillStyle = col; rr(-11, -40, 22, 31, 9);
    ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.fillRect(-11, -34, 22, 6);
    ctx.fillStyle = '#fff'; rr(0, -35, 11, 9, 3); ctx.fillStyle = '#111'; ctx.fillRect(6, -33, 4, 5);
    if (boosting) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-11, -28); ctx.lineTo(-26 - Math.random() * 12, -22); ctx.lineTo(-11, -14); ctx.fill(); }
  }
  ctx.restore();
}
function text(s, x, y, size, col, align = 'center', stroke = true) {
  ctx.font = `900 italic ${size}px system-ui,"Segoe UI",sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = 'rgba(8,4,20,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
let lastCount = 4;
function render(now, dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  // Parallax-Silhouetten
  for (const [f, col, bw, hh] of [[0.15, theme.far, 150, 380], [0.4, theme.near, 110, 260]]) {
    const o = camX * f; ctx.fillStyle = col;
    for (let i = fl(o / bw) - 1; i < (o + VW) / bw + 1; i++) { const h = 120 + hash(i + f * 100) * hh; ctx.fillRect(i * bw - o, VH - 60 - h, bw - 8, h + 60); }
  }
  shake = Math.max(0, shake - dt * 40);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  ctx.translate(VW / 2 - camX + sx, 2 + sy);
  const tx0 = fl((camX - VW / 2) / T) - 1, tx1 = tx0 + VW / T + 3;
  for (let ty = 0; ty < MH; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = tile(tx, ty); if (c === ' ') continue;
    const x = tx * T, y = ty * T;
    if (c === '#' || c === 'H') {
      ctx.fillStyle = theme.tile; ctx.fillRect(x, y, T + 0.5, T + 0.5);
      if (!solid(tx, ty - 1)) { ctx.fillStyle = theme.edge; ctx.fillRect(x, y, T + 0.5, 4); }
      if (c === 'H' && !solid(tx, ty + 1)) { ctx.fillStyle = theme.hook; ctx.fillRect(x, y + T - 8, T + 0.5, 8); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 12, y + T - 8, 8, 8); }
    } else if (c === '^') { ctx.fillStyle = '#e9eef5'; ctx.beginPath(); for (let i = 0; i < 2; i++) { ctx.moveTo(x + i * 16, y + T); ctx.lineTo(x + i * 16 + 8, y + 10); ctx.lineTo(x + i * 16 + 16, y + T); } ctx.fill(); }
    else if (c === '>') { ctx.fillStyle = '#ffd23f'; ctx.fillRect(x, y + T - 6, T, 6); ctx.fillStyle = `rgba(255,210,63,${0.5 + 0.5 * Math.sin(now / 90 - tx)})`; const o = (now / 12) % 16; ctx.beginPath(); ctx.moveTo(x + o, y + 10); ctx.lineTo(x + o + 12, y + 18); ctx.lineTo(x + o, y + 26); ctx.fill(); }
    else if (c === 'T') { ctx.fillStyle = '#7dffb0'; rr(x - 2, y + T - 12, T + 4, 8, 4); ctx.fillStyle = '#2a6b4a'; ctx.fillRect(x + 4, y + T - 4, 5, 4); ctx.fillRect(x + T - 9, y + T - 4, 5, 4); }
    else if (c === '?') {
      const b = map.boxes[map.bi[mod(tx, map.W) + ',' + ty]];
      if (b && now >= b.t) { const bob = Math.sin(now / 250 + tx) * 3; ctx.fillStyle = '#ffd23f'; rr(x + 2, y + 2 + bob, T - 4, T - 4, 7); ctx.fillStyle = '#7a4b00'; ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x + 16, y + 17 + bob); }
    }
  }
  // Kisten, Raketen
  for (const c of crates) { ctx.fillStyle = '#b5773a'; rr(c.x - 17, c.y - 34, 34, 34, 4); ctx.strokeStyle = '#6e4218'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(c.x - 12, c.y - 29); ctx.lineTo(c.x + 12, c.y - 5); ctx.moveTo(c.x + 12, c.y - 29); ctx.lineTo(c.x - 12, c.y - 5); ctx.stroke(); }
  for (const r of rockets) { ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a); ctx.fillStyle = '#f2f2f2'; rr(-14, -6, 24, 12, 5); ctx.fillStyle = '#ff4d5a'; ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(20, 0); ctx.lineTo(10, 6); ctx.fill(); ctx.restore(); }
  // Mitspieler
  for (const [id, r] of remotes) {
    if (!r.alive) continue; const p = interp(r, now); if (!p) continue;
    r.rx = p.x; r.ry = p.y; const s = p.s;
    if (s[4] === 3) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y - 24); ctx.lineTo(s[6], s[7]); ctx.stroke(); }
    drawRunner(p.x, p.y, s[2], s[4], s[5], COLORS[r.color], now, false, s[8]);
    text(r.name, p.x, p.y - 56, 17, COLORS[r.color]);
  }
  if (me.alive) {
    if (me.hook) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(me.x, me.y - 24); ctx.lineTo(me.hook.ax, me.hook.ay); ctx.stroke(); ctx.fillStyle = theme.hook; ctx.beginPath(); ctx.arc(me.hook.ax, me.hook.ay, 6, 0, 7); ctx.fill(); }
    else if (me.miss > 0) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(me.x, me.y - 24); ctx.lineTo(me.x + me.face * 90, me.y - 114); ctx.stroke(); }
    const mc = lobby ? COLORS[(lobby.ps.find(p => p.id === myId) || { c: 0 }).c] : COLORS[0];
    drawRunner(me.x, me.y, me.vx, myState(), me.face, mc, now, me.inv > 0 && me.stun <= 0, me.boosting);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(me.x - 7, me.y - 62); ctx.lineTo(me.x + 7, me.y - 62); ctx.lineTo(me.x, me.y - 52); ctx.fill();
  }
  for (const p of parts) { ctx.globalAlpha = clamp(p.l * 3, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  for (const f of fx) {
    const k = f.t / 0.35;
    if (f.k === 'ring') { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 10 * (1 - k) + 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, 7); ctx.stroke(); }
    else { const a = posOf(f.a), b = posOf(f.b); if (a && b) { ctx.strokeStyle = `rgba(125,249,255,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  }
  // Todeszone links
  if (!solo && kill < 800) {
    const kx = camX - kill, lx = camX - VW / 2 - 20;
    ctx.fillStyle = 'rgba(255,40,60,.32)'; ctx.fillRect(lx, 0, kx - lx, VH);
    ctx.fillStyle = `rgba(255,80,90,${0.7 + 0.3 * Math.sin(now / 80)})`; ctx.fillRect(kx - 6, 0, 6, VH);
  }
  ctx.restore();
  // ------------------------------------------------ HUD
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  if (me.alive && !solo) { const d = me.x - (camX - kill); if (d < 260) { const a = clamp(1 - d / 260, 0, 1) * 0.55; const gg = ctx.createLinearGradient(0, 0, 300, 0); gg.addColorStop(0, `rgba(255,30,50,${a})`); gg.addColorStop(1, 'rgba(255,30,50,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, 300, VH); } }
  if (lobby) {
    let y = 34;
    for (const p of lobby.ps) {
      const alive = p.id === myId ? me.alive : (remotes.get(p.id) || {}).alive;
      ctx.globalAlpha = alive ? 1 : 0.4; ctx.fillStyle = COLORS[p.c]; rr(22, y - 11, 22, 22, 6);
      text(p.name, 54, y + 1, 20, '#fff', 'left');
      const w = ctx.measureText(p.name).width;
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i < p.sc ? '#ffd23f' : 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(54 + w + 20 + i * 20, y, 7, 0, 7); ctx.fill(); }
      y += 32;
    }
    ctx.globalAlpha = 1;
    text(solo ? 'Solo-Training · Link teilen, um Mitspieler zu holen' : `Runde ${roundNo} · ${theme.name}`, VW / 2, 30, 22, '#fff');
  }
  if (me.alive) {
    ctx.fillStyle = 'rgba(10,6,24,.7)'; rr(24, VH - 110, 86, 86, 14);
    ctx.strokeStyle = me.item ? '#ffd23f' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 4; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(24, VH - 110, 86, 86, 14); else ctx.rect(24, VH - 110, 86, 86); ctx.stroke();
    if (me.item) { ctx.font = '48px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(ITEMS[me.item], 67, VH - 64); text(ITEM_NAMES[me.item] + ' [K]', 124, VH - 92, 20, '#ffd23f', 'left'); }
    ctx.fillStyle = 'rgba(10,6,24,.7)'; rr(124, VH - 60, 260, 26, 13);
    ctx.fillStyle = me.turbo > 0 ? '#7df9ff' : '#ffb347'; rr(128, VH - 56, Math.max(8, 252 * me.boost), 18, 9);
    text('BOOST [L]', 254, VH - 46, 14, '#1a1235', 'center', false);
  }
  const cd = (goAt - now) / 1000;
  if (cd > 0 && cd < 3.2) { const n = Math.ceil(cd); if (n !== lastCount) { lastCount = n; beep(440, 0.12, 'square', 0.06); } text(String(n), VW / 2, VH / 2 - 60, 220 - (n - cd) * 60, '#ffd23f'); }
  else if (cd <= 0 && cd > -0.8) { if (lastCount !== 0) { lastCount = 0; beep(880, 0.4, 'square', 0.07); } text('LOS!', VW / 2, VH / 2 - 60, 200, '#7dffb0'); }
  if (banner && now < banner.until) { ctx.fillStyle = 'rgba(8,4,20,.6)'; ctx.fillRect(0, VH / 2 - 110, VW, 190); text(banner.text, VW / 2, VH / 2 - 40, 84, banner.col); text(banner.sub, VW / 2, VH / 2 + 40, 30, '#fff'); }
  ctx.restore();
}
const myState = () => me.stun > 0 ? 4 : me.hook ? 3 : me.slide ? 2 : !me.ground ? (me.wall ? 5 : 1) : 0;

// ---------------------------------------------------------------- Hauptschleife
let last = performance.now(), acc = 0, sendT = 0;
function sendState() {
  const h = me.hook;
  send({ t: 's', s: [Math.round(me.x), Math.round(me.y), Math.round(me.vx), Math.round(me.vy), myState(), me.face, h ? Math.round(h.ax) : 0, h ? Math.round(h.ay) : 0, me.boosting ? 1 : 0] });
}
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (phase === 'game') {
    readInput(); acc += dt;
    while (acc >= STEP) {
      if (me.alive && now >= goAt) stepMe(STEP, now);
      I.jumpP = I.itemP = I.hookP = false; acc -= STEP;
    }
    stepWorld(dt);
    if (me.alive && now - sendT > 33) { sendT = now; sendState(); }
    camX += (camT - camX) * Math.min(1, dt * 10);
    render(now, dt);
  }
  requestAnimationFrame(frame);
}
addEventListener('keydown', e => { if (e.code === 'Escape' && phase === 'game' && lobby && lobby.host === myId) send({ t: 'stop' }); });
refreshList();
if (/^#[A-Za-z]{4}$/.test(location.hash) && $('name').value.trim()) joinLobby(location.hash.slice(1).toUpperCase());
requestAnimationFrame(frame);
window.__hj = { me, remotes, get phase() { return phase; }, get lobby() { return lobby; }, keys, I, tile, F,
  get W() { return map.W; }, get banner() { return banner; }, sync: () => sendState(),
  step(n, inp) { for (let i = 0; i < n; i++) { if (typeof inp === 'function') inp(me, I, i); else if (inp) Object.assign(I, inp); stepMe(STEP, performance.now() + 1e7); I.jumpP = I.itemP = I.hookP = false; } },
  view() { camX = camT = me.x + 100; render(performance.now(), 0.016); } };
})();
