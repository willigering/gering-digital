(() => {
'use strict';
// ---------------------------------------------------------------- Konstanten
const T = 32, VW = 1600, VH = 900, MH = 28, F = 26, START_X = 12 * T, STEP = 1 / 120;
const COLORS = ['#ff4d5a', '#3fa9ff', '#ffd23f', '#5be37d', '#c77dff', '#ff9f43', '#ff6fb5', '#2fe0d0', '#a3e635', '#f97316',
  '#818cf8', '#f43f5e', '#22d3ee', '#facc15', '#e879f9', '#84cc16', '#fb7185', '#60a5fa', '#fbbf24', '#ffffff'];
// deco: Art der Verzierung (Hintergrund, Kanten, Lampen, Pflanzen …), sun: Sonne/Mond, fx: Teilchen in der Luft
const THEMES = [
  { name: 'Neonhafen', sky: ['#1b1040', '#6b2f7e'], far: '#2c1b5a', near: '#1d1140', tile: '#1a1330', edge: '#ff4fd8', hook: '#ffe66d', deco: 'neon', sun: '#ffd6f5', fx: 'stars' },
  { name: 'Dachgarten', sky: ['#0d3b4f', '#f2a65a'], far: '#17566b', near: '#0e3a49', tile: '#123240', edge: '#7dffb0', hook: '#fff3b0', deco: 'garden', sun: '#ffd27a', fx: 'flies' },
  { name: 'Schrottplatz', sky: ['#2b1d14', '#c46a32'], far: '#5a361f', near: '#3a2213', tile: '#2a1a0f', edge: '#ffb347', hook: '#e8f7ff', deco: 'junk', sun: '#ff9b3d', fx: 'dust' },
  { name: 'Eiswerk (rutschig!)', sky: ['#0b2a4a', '#7fc8f8'], far: '#24507a', near: '#163a5c', tile: '#17324f', edge: '#bff4ff', hook: '#ffe66d', ice: true, deco: 'ice', sun: '#f0fbff', fx: 'snow' },
  { name: 'Vulkan', sky: ['#1a0505', '#d1451b'], far: '#4a1208', near: '#2e0a04', tile: '#241008', edge: '#ff7b2e', hook: '#fff3b0', deco: 'lava', sun: '#ff5a1f', fx: 'embers' },
  { rain: true, name: 'Dschungel', sky: ['#062b1a', '#58a65c'], far: '#0f4a2c', near: '#0a3420', tile: '#13291a', edge: '#c6ff5e', hook: '#ffe66d', deco: 'jungle', sun: '#fff2b0', fx: 'leaves' },
  { name: 'Lagerhaus ⇄ (Wasser steigt)', sky: ['#2a160c', '#a5562a'], far: '#4f2c17', near: '#3a2012', tile: '#2b1910', edge: '#ffa53a', hook: '#ffe66d', vert: 11, deco: 'ware', sun: '#ffb04a', fx: 'dust' },
  { name: 'Kristallmine', sky: ['#160a2e', '#7a3fb0'], far: '#2e1755', near: '#1f0f3d', tile: '#1e1038', edge: '#f39cff', hook: '#fff3b0', deco: 'crystal', sun: '#e9c8ff', fx: 'stars' },
  { name: 'Seilbahn-Werft (Haken!)', sky: ['#0f2f3a', '#e0a35a'], far: '#1f4a55', near: '#15343d', tile: '#1b2e33', edge: '#ffd166', hook: '#ffffff', deco: 'rope', sun: '#ffe2a8', fx: 'flies' },
  // Breite Etagen: lange Strecke nach rechts, Kletterschacht nach oben, oben nach links. Kamera fährt mit.
  { name: 'Skipiste (Rutschen!)', sky: ['#4f8fd6', '#dff1ff'], far: '#a9cbea', near: '#86aed6', tile: '#2f4d6e', edge: '#ffffff', hook: '#ffe66d', deco: 'ice', sun: '#fff6d5', fx: 'snow' },
  { name: 'Wüste', sky: ['#2d4f7c', '#f4b46a'], far: '#c98b52', near: '#a8683a', tile: '#5a3a22', edge: '#ffd27a', hook: '#fff3d0', deco: 'desert', sun: '#ffe08a', fx: 'sand' },
  { grav: 0.8, name: 'Mars', sky: ['#1c0a08', '#b9482a'], far: '#6e2a1a', near: '#4e1c12', tile: '#3a1610', edge: '#ff8a50', hook: '#ffe2c8', deco: 'mars', sun: '#ffe0c0', fx: 'dust' },
  { name: 'Weltall ⇄ (wenig Schwerkraft)', sky: ['#03040c', '#141a3d'], far: '#262e63', near: '#151a3a', tile: '#1e2433', edge: '#8fd3ff', hook: '#ffe66d', vert: 59, cols: 110, fh: 9, rate: 0.55, deco: 'space', sun: '#c9d4ff', fx: 'stars', grav: 0.6 },
  { grav: 0.5, name: 'Mond (halbe Schwerkraft)', sky: ['#05060c', '#1a1d2b'], far: '#3a3d48', near: '#2a2c35', tile: '#4a4d57', edge: '#d9dde6', hook: '#ffe66d', deco: 'moon', sun: '#3f86ff', fx: 'stars' },
];
const NMAPS = THEMES.length, ROCKET_V = 1500;
const DANCES = ['KUSSHAND', 'ZENSIERT', 'PO ZEIGEN'];
const POSES_ON = true; // Siegergesten an
const DANCE_POSE = [6, 7, 8]; // Gesten (siehe gesture); 0–5 sind die alten Posen, derzeit aus
const VCOLS = 50, FH = 7, VROWS = FH * 8, VFLOOR = VROWS; // Zickzack-Etagen: 50 Felder breit, 7 Reihen je Etage, Muster wiederholt sich alle 8 Etagen
const ITEMS = { rocket: '🚀', crate: '📦', shock: '💥', lasso: '🧲', turbo: '⚡', snow: '❄️' };
const ITEM_NAMES = { rocket: 'Rakete', crate: 'Kiste', shock: 'Schockwelle', lasso: 'Magnet', turbo: 'Turbo', snow: 'Schneeball' };
const fl = Math.floor, clamp = (v, a, b) => v < a ? a : v > b ? b : v, mod = (a, n) => ((a % n) + n) % n;
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);

// ---------------------------------------------------------------- Strecken
// Bausteine: b.r(x,y,w,h,typ) Rechteck, b.s(x,y,typ) Einzelfeld. '#' fest, 'H' Hakendecke, '=' Plattform (von unten durchspringbar),
// '^' Stacheln, 'O' Kreissäge, '~' Lava/Säure (im Boden eingelassen), '>' Boostfeld nach rechts, '<' nach links, 'T' Trampolin, '?' Itembox. Rückgabe = Breite in Feldern.
// Trampoline stehen immer mit mindestens 7 Feldern Abstand vor einer Kante, damit man nicht dagegen geschleudert wird.
// Schrägen: '/' steil hoch, '\\' steil runter, '1''2' flach hoch (zwei Felder je Reihe), '3''4' flach runter.
const SLOPE = { '/': u => T - u, '\\': u => u, '1': u => T - u / 2, '2': u => T / 2 - u / 2, '3': u => u / 2, '4': u => T / 2 + u / 2 };
const SLOPE_K = { '/': -1, '\\': 1, '1': -0.5, '2': -0.5, '3': 0.5, '4': 0.5 }; // Steigung: + = bergab nach rechts
// Rampe ab Höhe h0 (Reihen über dem Boden) um dh Reihen hoch (+) oder runter (−); darunter wird aufgefüllt.
const ramp = (b, x, h0, dh, gentle) => {
  let c = 0; const up = dh > 0;
  for (let i = 0; i < Math.abs(dh); i++) {
    const hh = up ? h0 + i : h0 - i - 1, y = F - hh - 1, ts = up ? (gentle ? ['1', '2'] : ['/']) : (gentle ? ['3', '4'] : ['\\']);
    for (const ch of ts) { b.s(x + c, y, ch); if (F - y - 1 > 0) b.r(x + c, y + 1, 1, F - y - 1); c++; }
  }
  return c;
};
const plat = (b, x, h, n) => { if (h > 0) b.r(x, F - h, n, h); return n; };
const hookBar = (b, x, y, w) => { b.r(x, y - 2, w, 2); b.r(x, y, w, 1, 'H'); };
// Jeder Baustein würfelt Höhen, Längen, Anzahl und Abstände (b.R(a, z) = ganze Zahl a..z, b.ch(p) = mit Wahrscheinlichkeit p).
// Der Zufall hängt nur von der Strecke ab, damit alle Spieler dieselbe Strecke bekommen.
const M = {
  // Kamin: zwei Wände dicht beieinander. Unten rein, mit Wandsprüngen hin und her nach oben, oben rüber und per Rutsche runter.
  chimney: (b, x, h) => {
    h = Math.min(21, b.H(h || b.R(12, 16)));
    b.r(x + 4, F - h - 3, 2, h + 1);        // hintere (linke) Wand: 3 Felder höher als die rechte, unten nur 2 Felder offen zum Reinlaufen
    b.r(x + 10, F - h, 2, h);               // rechte Wand bis zum Boden
    b.s(x + 7 + b.R(0, 1), F - h + b.R(2, 5), '?');
    const m = fl(h / 2) + b.R(-1, 1);
    let c = 12; c += plat(b, x + c, h, b.R(2, 4)); c += ramp(b, x + c, h, -(h - m), b.ch(0.4)); c += plat(b, x + c, m, b.R(1, 4)); c += ramp(b, x + c, m, -m, b.ch(0.6));
    return c + b.R(2, 5);
  },
  shortcut: (b, x) => {
    const L = b.R(36, 48), rx = x + 12, gap = rx + fl(L / 2) - 2;
    b.s(x + 2, F - 1, 'T');                                         // Trampolin hoch auf die Schiene
    b.r(rx, F - 8, L, 1);                                           // Schiene (Höhe 8), unten drunter der langsame Weg
    for (let i = 0; i < 4; i++) b.s(gap + i, F - 8, ' ');           // Lücke in der Schiene …
    hookBar(b, gap - 1, F - 13, 6);                                 // … mit Hakenbalken darüber
    b.s(gap + 7, F - 9, '>');              // Boostfelder auf der Schiene
    b.s(rx + L - 4, F - 11, '?');
    let c = 14; while (c < L + 8) { const k = b.R(0, 2); if (k === 0) b.r(x + c, F - b.R(1, 2), 1, 2, '#'); else if (k === 1) b.s(x + c, F - 1, 'O'); else b.r(x + c, F - 1, 2, 1, '^'); c += b.R(4, 6); }
    return 12 + L + 6;
  },
  chimneys: (b, x) => { let c = M.chimney(b, x, b.R(9, 11)); c += M.chimney(b, x + c, b.R(11, 13)); return c; },
  hills: (b, x) => {
    let c = 2; const h1 = b.R(2, 4), h2 = b.R(1, 3);
    c += ramp(b, x + c, 0, h1, b.ch(0.5)); const p = b.R(2, 5); c += plat(b, x + c, h1, p); if (b.ch(0.7)) b.s(x + c - 1 - b.R(0, p - 1), F - h1 - 3, '?');
    c += ramp(b, x + c, h1, -h1, b.ch(0.6)); c += b.R(2, 6);
    c += ramp(b, x + c, 0, h2, b.ch(0.5)); c += plat(b, x + c, h2, b.R(1, 4)); c += ramp(b, x + c, h2, -h2, b.ch(0.5)); return c + b.R(2, 4);
  },
  bigslide: (b, x) => {
    let c = 2; const h = b.R(6, 9), h2 = b.R(3, 5);
    c += ramp(b, x + c, 0, h, true); const p = b.R(2, 5); c += plat(b, x + c, h, p); b.s(x + c - 1 - b.R(0, p - 1), F - h - 3, '?');
    c += ramp(b, x + c, h, -h, true); if (b.ch(0.7)) b.s(x + c, F - 1, '>'); c += b.R(4, 7);
    c += ramp(b, x + c, 0, h2, b.ch(0.6)); c += plat(b, x + c, h2, b.R(1, 3)); c += ramp(b, x + c, h2, -h2, b.ch(0.4)); return c + b.R(2, 4);
  },
  mogul: (b, x) => { let c = 2; const n = b.R(3, 6); for (let i = 0; i < n; i++) { const h = b.R(1, 2); c += ramp(b, x + c, 0, h, true); c += ramp(b, x + c, h, -h, true); if (b.ch(0.4)) { const s = b.R(1, 3); b.r(x + c, F - 1, s, 1, '^'); c += s; } c += b.R(1, 3); } return c + 2; },
  descent: (b, x) => {
    let c = 2; const s2 = b.H(2), st = Math.min(b.R(4, 6), fl(20 / s2)), top = st * s2;
    for (let s = 1; s <= st; s++) { b.r(x + c, F - s * s2, 2, s * s2); c += 2; }
    c += plat(b, x + c, top, b.R(2, 4)); const m = fl(top / 2) + b.R(-1, 1);
    c += ramp(b, x + c, top, -(top - m), b.ch(0.4)); c += plat(b, x + c, m, b.R(2, 4)); c += ramp(b, x + c, m, -m, true); return c + b.R(3, 5);
  },
  flat: (b, x, n = 20) => { if (n > 6 && b.ch(0.6)) b.s(x + b.R(2, n - 3), F - b.R(2, 4), '?'); return n; },
  hurdles: (b, x) => { let c = b.R(3, 6); const n = b.R(2, 4); for (let i = 0; i < n; i++) { const h = b.H(b.R(1, 2)), w = b.R(1, 2); b.r(x + c, F - h, w, h); if (i === 1 && b.ch(0.6)) b.s(x + c, F - h - 4, '?'); c += w + b.R(5, 9); } return c; },
  gate: (b, x) => { const w = b.R(4, 8), h = Math.min(18, b.H(b.R(4, 7))); b.r(x + 8, F - 1 - h, w, h); b.s(x + 8 + fl(w / 2), F - h - 4, '?'); if (b.ch(0.6)) b.s(x + 9 + w + b.R(0, 2), F - 1, '>'); return 14 + w + b.R(2, 5); },
  plateau: (b, x) => { const h = b.R(5, 7), w = b.R(8, 14); b.s(x + 2, F - 1, 'T'); b.r(x + 10, F - h, w, h); if (b.ch(0.6)) b.s(x + 12 + b.R(0, w - 4), F - h - 1, '>'); b.s(x + 10 + b.R(1, w - 2), F - h - 3, '?'); return 12 + w + b.R(3, 7); },
  hookpit: (b, x) => {
    const L = b.R(16, 24), hy = F - b.R(11, 13);
    b.r(x + 8, F - 1, L, 1, '^'); b.r(x + 6, hy - 2, L + 4, 2); b.r(x + 6, hy, L + 4, 1, 'H');
    const k = b.R(1, 2); for (let i = 1; i <= k; i++) b.r(x + 8 + fl(L * i / (k + 1)) - 1, F - b.R(3, 5), b.R(2, 3), 1);
    b.s(x + 8 + b.R(4, L - 4), hy + 4, '?'); return L + 16;
  },
  upper: (b, x) => {
    const L = b.R(18, 28), h = b.R(5, 6); b.r(x + 3, F - 3, 3, 1); b.r(x + 9, F - h, L, 1);
    b.s(x + 11 + b.R(0, L - 6), F - h - 1, '>');
    b.s(x + 9 + b.R(2, L - 3), F - h - 3, '?'); let c = 10; while (c < L) { if (b.ch(0.5)) b.r(x + c, F - 1, b.R(1, 3), 1, b.ch(0.5) ? '^' : '#'); c += b.R(5, 8); }
    return L + 14;
  },
  tunnel: (b, x) => { const L = b.R(12, 22); b.r(x + 6, F - 12, L, 9); let c = 5; while (c < L - 4) { if (b.ch(0.6)) b.r(x + 6 + c, F - 3, 2, 2); c += b.R(5, 8); } b.s(x + 6 + b.R(2, L - 3), F - 2, '?'); if (b.ch(0.6)) b.s(x + 9 + L, F - 1, '>'); return L + 12; },
  big: (b, x) => { const L = b.R(18, 28), h = b.R(4, 5); b.s(x + 1, F - 1, 'T'); b.r(x + 8, F - h, L, h); const s = b.R(6, L - 6); b.r(x + 8 + s, F - h - 1, b.R(2, 4), 1, '^'); b.r(x + 12, F - 18, L - 8, 2); b.r(x + 12, F - 16, L - 8, 1, 'H'); b.s(x + 8 + b.R(2, L - 2), F - h - 3, '?'); return L + 14; },
  items: (b, x) => { const n = b.R(2, 3), cx = x + b.R(5, 10); for (let i = 0; i < n; i++) b.s(cx + b.R(-1, 1), F - 2 - i * 3, '?'); return b.R(14, 18); },
  boost: (b, x) => { const n = 1; for (let i = 0; i < n; i++) b.s(x + 3 + i * 3, F - 1, '>'); const s = 6 + n * 3, L = b.R(8, 14); b.r(x + s, F - 1, L, 1, '^'); const p = b.R(4, 7); b.r(x + s + fl(L / 2) - fl(p / 2), F - b.R(4, 5), p, 1); b.s(x + s + fl(L / 2), F - 7, '?'); return s + L + b.R(5, 9); },
  stairs: (b, x) => {
    const s2 = b.H(2), n = Math.min(b.R(3, 5), fl(20 / s2)), sw = b.R(3, 4); let c = 4;
    for (let i = 1; i <= n; i++) { b.r(x + c, F - i * s2, sw, i * s2); c += sw; }
    const tw = b.R(4, 8); b.r(x + c, F - n * s2, tw, n * s2); b.s(x + c + 1, F - n * s2 - 1, '>'); b.s(x + c + fl(tw / 2), F - n * s2 - 3, '?'); c += tw;
    if (b.ch(0.5)) for (let i = n - 1; i >= 1; i--) { b.r(x + c, F - i * s2, sw, i * s2); c += sw; }
    return c + b.R(3, 6);
  },
  pillars: (b, x) => { let c = b.R(4, 7); const n = b.R(3, 6); for (let i = 0; i < n; i++) { const h = Math.min(18, b.H(b.R(2, 5))); b.r(x + c, F - h, 2, h); if (b.ch(0.25)) b.s(x + c, F - h - 3, '?'); c += 2 + b.R(5, 8); } return c; },
  hookchain: (b, x) => {
    const L = b.R(24, 36), hy = F - b.R(11, 13); b.r(x + 6, F - 1, L, 1, '^'); b.r(x + 4, hy - 2, L + 4, 2); b.r(x + 4, hy, L + 4, 1, 'H');
    let c = b.R(5, 8); while (c < L - 3) { b.r(x + 6 + c, F - b.R(3, 5), 2, 1); c += b.R(7, 10); }
    b.s(x + 6 + b.R(4, L - 4), hy + 5, '?'); return L + 10;
  },
  spikes: (b, x) => { const a = b.R(6, 10), z = b.R(5, 9); b.s(x + 3, F - 1, 'T'); b.r(x + 7, F - 1, a, 1, '^'); const p = b.R(3, 5); b.r(x + 9 + a, F - b.R(3, 4), p, 1); b.r(x + 12 + a + p, F - 1, z, 1, '^'); b.s(x + 9 + a + fl(p / 2), F - 6, '?'); return 16 + a + p + z; },
  saws: (b, x) => {
    let c = b.R(4, 7); const n = b.R(2, 4);
    for (let i = 0; i < n; i++) {
      if (i === 1 && b.ch(0.6)) { b.r(x + c, F - 7, 2, 5); b.r(x + c, F - 2, 2, 1, 'O'); c += 2; } // Pfeiler mit Säge: drunter durchrutschen
      else b.s(x + c, F - b.R(1, 2), 'O');
      c += b.R(6, 9);
    }
    if (b.ch(0.6)) { b.r(x + c, F - 4, b.R(4, 6), 1, '='); b.s(x + c + 2, F - 6, '?'); c += 8; }
    return c;
  },
  lava: (b, x) => { const L = b.R(10, 18); b.r(x + 5, F, L, 1, '~'); const k = Math.ceil(L / 7); for (let i = 0; i < k; i++) b.r(x + 6 + fl((L - 3) * (i + 0.5) / k), F - b.R(3, 4), b.R(2, 3), 1, '='); b.s(x + 5 + b.R(2, L - 2), F - 6, '?'); return L + 10; },
  trampchain: (b, x) => { b.s(x + 2, F - 1, 'T'); b.r(x + 8, F - 1, 26, 1, '^'); b.r(x + 17, F - 2, 5, 2); b.s(x + 19, F - 3, 'T'); b.s(x + 18 + b.R(0, 4), F - b.R(9, 11), '?'); return 40; },
  wallshaft: (b, x) => { const h = Math.min(18, b.H(b.R(6, 8))); b.r(x + 4, F - 14, 2, 9); b.r(x + 10, F - h, 2, h); b.r(x + 12, F - h, b.R(5, 8), 1, '='); b.s(x + 14, F - h - 2, '?'); return 24; },
  swing: (b, x) => {
    const n = b.R(4, 7), sp = b.R(7, 9), L = n * sp + 4;
    b.r(x + 4, F - 1, L, 1, '^');
    for (let i = 0; i < n; i++) hookBar(b, x + 2 + i * sp, F - b.R(10, 13), b.R(3, 5));
    const m = x + 4 + b.R(fl(L / 3), fl(L * 2 / 3)); b.r(m, F - 4, 3, 1, '='); b.s(m + 1, F - 6, '?'); return L + 8;
  },
  hookforest: (b, x) => {
    const n = b.R(5, 8), L = n * 6 + 2;
    b.r(x + 3, F - 1, L, 1, '^');
    for (let i = 0; i < n; i++) hookBar(b, x + 3 + i * 6, F - b.R(9, 13), 2);
    for (let i = 0; i < b.R(1, 3); i++) b.s(x + 8 + b.R(0, L - 10), F - b.R(5, 7), 'O');
    return L + 6;
  },
};
const SEQS = [
  [['flat', 24], 'hurdles', 'gate', 'saws', 'hookpit', 'chimney', 'items', 'shortcut', 'upper', 'lava', 'plateau', 'boost', 'tunnel', 'wallshaft', 'big', ['flat', 12]],
  [['flat', 24], 'boost', 'hills', 'trampchain', 'big', 'items', 'shortcut', 'tunnel', 'hookpit', 'bigslide', 'saws', 'plateau', 'hurdles', 'upper', 'mogul', 'gate', 'hookpit', ['flat', 12]],
  [['flat', 24], 'upper', 'hookpit', 'saws', 'gate', 'items', 'wallshaft', 'chimneys', 'hurdles', 'tunnel', 'boost', 'plateau', 'big', 'lava', 'gate', ['flat', 12]],
  [['flat', 24], 'stairs', 'pillars', 'hookchain', 'items', 'shortcut', 'trampchain', 'chimney', 'spikes', 'tunnel', 'upper', 'saws', 'boost', 'plateau', ['flat', 12]],
  [['flat', 24], 'spikes', 'lava', 'gate', 'pillars', 'hookpit', 'items', 'lava', 'boost', 'big', 'chimneys', 'stairs', 'wallshaft', 'hookchain', ['flat', 12]],
  [['flat', 24], 'pillars', 'descent', 'upper', 'hookchain', 'shortcut', 'items', 'chimney', 'trampchain', 'hills', 'plateau', 'stairs', 'saws', 'bigslide', 'spikes', 'tunnel', 'gate', 'big', ['flat', 12]],
  null, // Lagerhaus: Etagen, siehe buildV
  [['flat', 24], 'stairs', 'hookchain', 'saws', 'items', 'shortcut', 'pillars', 'lava', 'upper', 'chimneys', 'hills', 'wallshaft', 'boost', 'tunnel', 'big', ['flat', 12]], // Kristallmine
  [['flat', 24], 'swing', 'items', 'hookforest', 'hookchain', 'swing', 'items', 'hookpit', 'hookforest', 'big', 'swing', 'hookchain', 'items', 'hookforest', ['flat', 12]],
  [['flat', 20], 'hills', 'items', 'bigslide', 'mogul', 'hurdles', 'descent', 'items', 'hills', 'mogul', 'spikes', 'bigslide', 'descent', ['flat', 12]], // Skipiste
  [['flat', 24], 'hills', 'hurdles', 'lava', 'items', 'shortcut', 'bigslide', 'spikes', 'chimney', 'pillars', 'saws', 'mogul', 'gate', 'plateau', ['flat', 12]], // Wüste
  [['flat', 24], 'descent', 'pillars', 'lava', 'items', 'shortcut', 'trampchain', 'hills', 'saws', 'chimneys', 'upper', 'stairs', 'spikes', 'big', ['flat', 12]], // Mars
  null, // Weltall: breite Etagen, siehe buildV
  [['flat', 24], 'hills', 'pillars', 'descent', 'items', 'shortcut', 'mogul', 'chimney', 'spikes', 'bigslide', 'stairs', 'saws', 'hurdles', ['flat', 12]], // Mond
];
// Zickzack-Etagen: Auf jeder Etage läuft man bis zur Wand, ein Trampolin schießt durch die Luke ('=' von unten
// durchspringbar) nach oben, dort geht es in die Gegenrichtung weiter. Gerade Etagen nach rechts, ungerade nach links.
function buildV(seed, cols = VCOLS, fh = FH) {
  const floors = cols > VCOLS ? 12 : 8, rows = fh * floors, wide = cols > VCOLS, hw = 10; // hw: Breite der Luke zur nächsten Etage
  let r = seed * 7919; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const g = []; for (let y = 0; y < rows; y++) g.push(new Array(cols).fill(' '));
  const put = (x, y, c) => { if (x >= 0 && x < cols) g[mod(y, rows)][x] = c; }, signs = [];
  const flip = (k, x) => k % 2 ? cols - 1 - x : x; // ungerade Etagen laufen nach links
  for (let k = 0; k < floors; k++) {
    const fy = rows - fh * k, cy = fy - fh; // fy: Boden dieser Etage, cy: Decke = Boden der nächsten
    const P = (x, y, c) => put(flip(k, x), y, k % 2 && c === '>' ? '<' : c); // nach links laufende Etage: Boostfeld nach links
    for (let x = 0; x < cols; x++) P(x, cy, x >= cols - hw ? '=' : '#');
    signs.push({ x: flip(k, wide ? cols - hw - 2 : cols - 9) + 0.5, y: fy - (wide ? 5 : 4) }); // Neon-Pfeil: hier geht es hoch
    if (wide) { // Kletterschacht: versetzte Plattformen alle 3 Reihen bis zur Luke
      for (let y = fy - 3, j = 0; y > cy + 1; y -= 3, j++) for (let i = 0; i < 4; i++) P(j % 2 ? cols - 5 + i : cols - hw + 1 + i, y, '=');
    } else P(cols - 6, fy - 1, 'T'); // schmale Etage: Trampolin mittig unter der Luke
    // Hindernisse in Laufrichtung, bis kurz vor den Aufstieg. Meist leicht zu überspringen; „harte“ Stellen
    // (Tunnel, niedriger Balken, hohe Hürde, Hakengrube), an denen man hängen bleiben kann, nur 1–2 pro Etage.
    let x = 10 + fl(rnd() * 4), hard = 0; const end = cols - hw - 4, maxHard = wide ? 2 : 1;
    const gap = () => 4 + fl(rnd() * 5); // Laufstrecke zwischen zwei Hindernissen
    while (x < end) {
      const e = rnd(), canHard = hard < maxHard && x < end - 12;
      if (e < 0.2) { P(x, fy - 1, '#'); x += 2 + gap(); }                                                                  // niedrige Hürde
      else if (e < 0.34) { const n = 2 + fl(rnd() * 2); for (let i = 0; i < n; i++) P(x + i, fy - 1, '^'); x += n + gap(); } // kurze Stacheln
      else if (e < 0.44) { P(x, fy - 1, '>'); x += 1 + gap(); }                                                            // Boostfeld
      else if (e < 0.5) { P(x, fy - 1, 'O'); x += 1 + gap(); }                                                             // Säge
      else if (e < 0.6) { P(x + 1, fy - 3, '?'); x += 3 + gap(); }                                                         // Itemkugel
      else if (e < 0.66 && wide && x < end - 10) { for (let i = 0; i < 3; i++) for (let j = 0; j <= i; j++) P(x + i, fy - 1 - j, '#'); for (let i = 0; i < 3; i++) for (let j = 0; j <= 2 - i; j++) P(x + 4 + i, fy - 1 - j, '#'); x += 7 + gap(); } // Treppe hoch und runter
      else if (e < 0.71 && wide && x < end - 10) { for (let i = 0; i < 7; i++) P(x + i, fy - 4, '='); for (let i = 1; i < 6; i++) P(x + i, fy - 1, '^'); P(x + 3, fy - 6, '?'); x += 7 + gap(); } // Steg über Stacheln
      else if (e < 0.75 && wide && x < end - 8) { for (let i = 0; i < 3; i++) { P(x + i, fy, '~'); P(x + i, fy + 1, '#'); } x += 3 + gap(); } // kleine Lavagrube
      else if (e < 0.8 && canHard) { // eine harte Stelle
        const h = rnd(); hard++;
        if (h < 0.3) { for (let i = 0; i < 5; i++) for (let j = 1; j <= fh - 3; j++) P(x + i, cy + j, '#'); P(x + 2, fy - 1, '?'); x += 5 + gap(); } // Tunnel: rutschen
        else if (h < 0.55) { P(x, fy - 1, '#'); P(x, fy - 2, '#'); x += 2 + gap(); }                                        // hohe Hürde
        else if (h < 0.75 && wide) { for (let i = 0; i < 3; i++) P(x + i, fy - 2, '#'); x += 3 + gap(); }                   // niedriger Balken: rutschen
        else { for (let i = 0; i < 6; i++) P(x + i, fy - 1, '^'); for (let i = 1; i < 5; i++) P(x + i, cy + 1, 'H'); x += 6 + gap(); } // Hakengrube
      }
      else x += gap();                                                                                                     // freie Strecke
    }
  }
  thinPads(g);
  const boxes = [], bi = {};
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (g[y][x] === '?') { bi[x + ',' + y] = boxes.length; boxes.push({ tx: x, ty: y, t: 0 }); }
  return { W: cols, H: rows, g, boxes, bi, vert: true, floor: rows, fh, wide, signs };
}
// Waagerechte Strecken: feste Folge plus zwei gemischte Durchgänge mit kurzen Pausen dazwischen.
// Die Mischung hängt nur von der Kartennummer ab, damit alle Spieler dieselbe Strecke bekommen.
function longSeq(i) {
  // Feste Anfangsfolge der Strecke, danach weitere Bausteine aus ihrem Vorrat – zufällig gezogen, aber nie einer
  // der letzten drei, und mit kurzen Pausen dazwischen. Jeder Baustein würfelt beim Bauen selbst noch seine Form.
  const base = SEQS[i], pool = base.filter(m => !Array.isArray(m)); let r = (i + 1) * 9973;
  const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647, out = base.slice(0, -1), last = [];
  for (let k = 0; k < pool.length * 2; k++) {
    let m, tries = 0; do { m = pool[fl(rnd() * pool.length)]; } while (last.includes(m) && ++tries < 20);
    out.push(m); last.push(m); if (last.length > 3) last.shift();
    if (rnd() < 0.4) out.push(['flat', 3 + fl(rnd() * 9)]);
  }
  out.push(base[base.length - 1]); return out;
}
const buildMap = i => THEMES[i].vert ? buildV(THEMES[i].vert, THEMES[i].cols, THEMES[i].fh) : build(longSeq(i), i + 1, 1 / (THEMES[i].grav || 1)); // wenig Schwerkraft: höhere Hindernisse
const vFloor = i => (THEMES[i].fh || FH) * (THEMES[i].cols ? 12 : 8); // Bodenreihe einer Etagen-Map
const startPos = slot => map.vert ? { x: map.wide ? (3 + (slot % 10) * 0.9) * T + 11 : VCOLS * T / 2 + (slot - 9.5) * 40, y: map.floor * T } : { x: START_X - slot * 17, y: F * T };
// Zickzack: Strecke = Etagen × Breite + Weg auf der aktuellen Etage
const progress = (x, y) => map.vert ? zigProg(x, y) : (x - START_X) / T; // Meter (1 Feld = 1 m)
function zigProg(x, y) { const W = map.W, k = Math.max(0, fl((map.floor * T - y) / (map.fh * T) + 0.05)), a = x / T; return k * W + (k % 2 ? W - a : a) - (map.wide ? 3 : W / 2); }
// Boostfelder entzerren: in jeder Reihe höchstens eins pro 12 Felder (doppelte hintereinander bringen nichts)
function thinPads(g) {
  for (const row of g) { let last = -99; for (let x = 0; x < row.length; x++) if (row[x] === '>' || row[x] === '<') { if (x - last < 12) row[x] = ' '; else last = x; } }
}
function build(seq, seed = 1, hs = 1) {
  const cells = []; let W = 0; let rs = seed * 48271 % 2147483647 || 1;
  const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const b = { rnd, R: (a, z) => a + fl(rnd() * (z - a + 1)), ch: p => rnd() < p, H: n => Math.max(1, Math.round(n * hs)), // H: Höhe passend zur Schwerkraft
    s: (x, y, c) => cells.push([x, y, c]), r: (x, y, w, h, c = '#') => { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) cells.push([x + i, y + j, c]); } };
  for (const m of seq) { const [n, a] = Array.isArray(m) ? m : [m]; W += M[n](b, W, a); }
  const g = []; for (let y = 0; y < MH; y++) g.push(new Array(W).fill(y === 0 || y >= F ? '#' : ' '));
  const boxes = [], bi = {};
  for (const [x, y, c] of cells) { g[y][x] = c; if (c === '?') { bi[x + ',' + y] = boxes.length; boxes.push({ tx: x, ty: y, t: 0 }); } }
  thinPads(g);
  return { W, g, boxes, bi };
}
let map = build(SEQS[0]), theme = THEMES[0];
// cutX: Levelende auf waagerechten Strecken. Links davon ist alles zerfallen – kein Boden, keine Wände.
let cutX = -1e9;
const tile = (tx, ty) => map.vert
  ? (tx < 0 || tx >= map.W || ty >= map.floor ? '#' : map.g[mod(ty, map.H)][tx])
  : (tx * T + T / 2 < cutX ? ' ' : ty < 0 || ty >= MH ? '#' : map.g[ty][mod(tx, map.W)]);
const solid = (tx, ty) => { const c = tile(tx, ty); return c === '#' || c === 'H'; };
const stand = (tx, ty) => solid(tx, ty) || tile(tx, ty) === '=';
const boxAt = (tx, ty) => map.boxes[map.bi[map.vert ? tx + ',' + mod(ty, map.H) : mod(tx, map.W) + ',' + ty]];
function onPlat(x, row) { for (let tx = fl((x - 11) / T); tx <= fl((x + 11 - 0.001) / T); tx++) if (tile(tx, row) === '=') return true; return false; }
function hitRect(x, y, w, h) {
  const x0 = fl(x / T), x1 = fl((x + w - 0.001) / T), y0 = fl(y / T), y1 = fl((y + h - 0.001) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) return true;
  return false;
}

// ---------------------------------------------------------------- Zustand
let myId = 0, lobby = null, phase = 'menu', goAt = 0, solo = false, roundNo = 0;
let camX = START_X, camT = START_X, camY = VH / 2 - 2, zoom = 1, kill = 800, shake = 0, banner = null, uid = 1;
let cele = null; // Siegerfeier: { id, dance, t0 }
const remotes = new Map();           // id -> {name,color,score,alive,buf[],rx,ry,...}
let rockets = [], crates = [], parts = [], fx = [], snowballs = [];
const me = {};
function resetMe(slot) {
  const s = startPos(slot);
  Object.assign(me, { x: s.x, y: s.y, vx: 0, vy: 0, face: 1, ground: true, wall: 0, slide: false, hook: null,
    stun: 0, inv: 0, boost: 0, turbo: 0, item: null, jumps: 0, coy: 0, buf: 0, padCd: 0, launch: false, boosting: false, alive: true, miss: 0, drop: 0, coast: false, sc: false });
}
resetMe(0); me.alive = false;

// ---------------------------------------------------------------- Ton
let ac;
// Hintergrundmusik spielt music-player.js (Playlist aus music/). Hier nur der Anschluss für Taste M.
const Music = { start() { }, mode() { }, toggle() { if (window.hjMusic) window.hjMusic.toggle(); }, get info() { return null; } };
function initAudio() {
  if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  Music.start();
}
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
  if (phase === 'game' && /^(Space|Arrow|Key[WASD]|NumpadAdd|NumpadSubtract)/.test(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('pointerdown', initAudio);
addEventListener('click', initAudio);
addEventListener('touchend', initAudio);
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
  I.item = keys.KeyK || keys.KeyE || keys.KeyC || keys.NumpadSubtract || touch.item || gb(1) || gb(3);
  I.boost = keys.KeyL || keys.KeyQ || keys.KeyV || keys.NumpadAdd || touch.boost || gb(5) || gb(7);
  if (I.jump && !prev.jump) I.jumpP = true;
  if (I.item && !prev.item) I.itemP = true;
  if (I.hook && !prev.hook) I.hookP = true;
  prev.jump = !!I.jump; prev.item = !!I.item; prev.hook = !!I.hook;
}

// ---------------------------------------------------------------- Physik (eigener Läufer)
const ph = p => p.slide ? 20 : 40;
function slopeAt(x, y) { // Oberfläche einer Schräge in der Nähe der Füße: { y, k } oder null
  const tx = fl(x / T); let best = null;
  for (let ty = fl((y - 26) / T); ty <= fl((y + 14) / T); ty++) {
    const c = tile(tx, ty), f = SLOPE[c]; if (!f) continue;
    const sy = ty * T + f(x - tx * T);
    if (sy >= y - 26 && sy <= y + 14 && (!best || Math.abs(sy - y) < Math.abs(best.y - y))) best = { y: sy, k: SLOPE_K[c] };
  }
  return best;
}
function moveX(p, dx) {
  p.x += dx; const h = ph(p), lift = p.wasG ? 14 : 0; // am Boden: kleine Stufen (Schrägen-Übergänge) nicht als Wand werten
  if (!hitRect(p.x - 11, p.y - h, 22, h - lift)) return false;
  if (dx > 0) p.x = fl((p.x + 11) / T) * T - 11 - 0.001; else p.x = fl((p.x - 11) / T) * T + T + 11;
  return true;
}
function moveY(p, dy) {
  const y0 = p.y; p.y += dy; const h = ph(p);
  if (hitRect(p.x - 11, p.y - h, 22, h)) {
    if (dy > 0) p.y = fl((p.y - 0.001) / T) * T; else p.y = fl((p.y - h) / T) * T + T + h;
    return true;
  }
  // Plattformen '=' tragen nur von oben: Landen, wenn die Füße die Oberkante von oben kreuzen
  if (dy > 0 && !(p.drop > 0)) { const row = Math.ceil(y0 / T - 1e-6); if (row * T < p.y && onPlat(p.x, row)) { p.y = row * T; return true; } }
  return false;
}
const onPlatAt = p => !(p.drop > 0) && Math.abs(p.y - Math.round(p.y / T) * T) < 0.01 && onPlat(p.x, Math.round(p.y / T));
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
// Sucht einen Hakenpunkt ('H') schräg vor/über dem Läufer. Steile Winkel zuerst, dann flachere und fast senkrechte.
function findHook(p) {
  for (const deg of [45, 35, 55, 25, 65, 75, 15, 85]) {
    const a = deg * Math.PI / 180, dx = Math.cos(a) * p.face, dy = -Math.sin(a), ox = p.x, oy = p.y - 30;
    for (let s = 16; s < 640; s += 6) {
      const px = ox + dx * s, py = oy + dy * s, c = tile(fl(px / T), fl(py / T));
      if (c === 'H') return { x: px, y: py };
      if (c === '#') break;
    }
  }
  return null;
}
function tryHook(p) {
  const h = findHook(p);
  if (h) {
    const L = Math.hypot(h.x - p.x, h.y - (p.y - 20));
    p.hook = { ax: h.x, ay: h.y, L, min: Math.min(L, 230) }; p.slide = p.slide && hitRect(p.x - 11, p.y - 40, 22, 20);
    // Ruck nach oben, damit man auch vom Boden aus sofort schwingt
    p.hook.L = L * 0.9; p.vy = Math.min(p.vy, -420); p.ground = false; p.jumps = 1;
    beep(700, 0.08, 'square', 0.05, 1200); return;
  }
  p.miss = 0.15; beep(200, 0.06, 'square', 0.03);
}
function releaseHook(p) {
  p.hook = null; p.vx = clamp(p.vx * 1.08, -1050, 1050); if (p.vy > -200) p.vy -= 150; p.jumps = 1;
  beep(500, 0.08, 'triangle', 0.04, 300);
}
function rollItem() {
  let ahead = 0, n = 0; for (const r of remotes.values()) if (r.alive) { n++; if (r.rx > me.x) ahead++; }
  const pool = n && !ahead ? ['crate', 'crate', 'shock', 'turbo'] : ['rocket', 'rocket', 'lasso', 'turbo', 'shock', 'crate', 'snow', 'snow'];
  return pool[fl(Math.random() * pool.length)];
}
function nearestAhead(maxD) {
  let best = 0, bd = maxD; for (const [id, r] of remotes) if (r.alive && r.rx > me.x && r.rx - me.x < bd) { bd = r.rx - me.x; best = id; }
  return best;
}
function useItem(p) {
  const k = p.item; p.item = null;
  if (k === 'rocket') { const m = { t: 'ev', k: 'rk', r: myId * 1e5 + uid++, x: Math.round(p.x + p.face * 24), y: Math.round(p.y - 24), d: p.face }; send(m); m.id = myId; onEv(m); }
  else if (k === 'crate') { const m = { t: 'ev', k: 'cr', c: myId * 1e5 + uid++, x: Math.round(p.x - p.face * 34), y: Math.round(p.y - 4) }; send(m); m.id = myId; onEv(m); }
  else if (k === 'shock') { const m = { t: 'ev', k: 'sh', x: Math.round(p.x), y: Math.round(p.y - 20) }; send(m); m.id = myId; onEv(m); }
  else if (k === 'lasso') { const m = { t: 'ev', k: 'ls', tg: nearestAhead(1200) }; send(m); m.id = myId; onEv(m); p.vx = Math.min(1050, Math.max(p.vx, 300) + 420); p.vy = Math.min(p.vy, -220); }
  else if (k === 'snow') { const m = { t: 'ev', k: 'sb', r: myId * 1e5 + uid++, x: Math.round(p.x + p.face * 18), y: Math.round(p.y - 34), vx: Math.round(p.face * 950 + p.vx * 0.5), vy: -420 }; send(m); m.id = myId; onEv(m); }
  else if (k === 'turbo') { p.turbo = 1.8; p.boost = 1; beep(300, 0.4, 'sawtooth', 0.06, 1200); }
}
// Wind: Böen im Wechsel nach rechts und links, Stärke je Welt (0 = kein Wind)
function windAt(now) {
  const k = theme.wind; if (!k || phase !== 'game') return 0;
  const t = Math.max(0, now - goAt) / 7000, ph = t % 1; if (ph < 0.3 || ph > 0.7) return 0;
  return k * Math.sin(Math.PI * (ph - 0.3) / 0.4) * (fl(t) % 2 ? -1 : 1);
}
function stepMe(dt, now) {
  const p = me;
  p.inv = Math.max(0, p.inv - dt); p.padCd -= dt; p.miss -= dt; p.drop -= dt;
  let dir = (I.r ? 1 : 0) - (I.l ? 1 : 0);
  const ctrl = p.stun <= 0;
  if (!ctrl) { p.stun -= dt; dir = 0; }
  if (dir && !p.hook && !p.slide) p.face = dir;
  if (I.jumpP) p.buf = 0.12; else p.buf -= dt;
  p.coy = p.ground ? 0.1 : p.coy - dt;
  // Grundtempo wie in Version 1; Boost hält ~1,6 s.
  let boosting = false;
  if (ctrl && I.boost && p.boost > 0.02 && dir) { boosting = true; p.boost -= dt / 1.6; } else if (!I.boost) p.boost = Math.min(1, p.boost + dt * 0.07);
  if (p.turbo > 0) { p.turbo -= dt; boosting = true; }
  p.boosting = boosting;
  p.slow = Math.max(0, (p.slow || 0) - dt); p.roll = Math.max(0, (p.roll || 0) - dt);
  const max = (boosting ? 880 : 580) * (p.slow > 0 ? 0.45 : 1); // vom Schneeball getroffen: kurz langsamer
  // Durch eine Plattform nach unten fallen lassen
  if (p.ground && ctrl && I.down && !p.slide && !p.hook && onPlatAt(p) && !hitRect(p.x - 11, p.y, 22, 1)) { p.drop = 0.22; p.ground = false; p.y += 1; }
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
    const h = p.hook; h.L = Math.max(h.min, h.L - 480 * dt);
    const dx = p.x - h.ax, dy = p.y - 20 - h.ay, len = Math.hypot(dx, dy) || 1;
    p.vx += dy / len * p.face * 520 * dt; p.vy += -dx / len * p.face * 520 * dt;
    if (dir) p.vx += dir * 200 * dt;
  } else if (p.slide) { if (p.onS) p.vx += Math.sign(p.slopeK) * 1800 * Math.abs(p.slopeK) * dt; else p.vx = approach(p.vx, 0, 220 * dt); } // bergab rutschen: immer schneller
  else if (p.ground) {
    const ia = theme.ice ? 0.45 : 1, ib = theme.ice ? 0.18 : 1; // Eis: träge beim Anlaufen, kaum Bremsen
    const mx = p.onS && dir ? max * (Math.sign(p.slopeK) === dir ? 1 + 0.3 * Math.abs(p.slopeK) : 1 - 0.25 * Math.abs(p.slopeK)) : max; // Schräge: bergab schneller, bergauf langsamer
    if (dir) { if (Math.sign(p.vx) === dir && Math.abs(p.vx) > mx) p.vx = approach(p.vx, dir * mx, 400 * ib * dt); else p.vx = approach(p.vx, dir * mx, (boosting ? 3200 : 2200) * (Math.sign(p.vx) === -dir ? ib * 2 : ia) * dt); }
    else p.vx = approach(p.vx, 0, (p.coast ? 380 : ctrl ? 2600 * ib : 900 * ib) * dt); // Sieger läuft langsam aus
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
  p.vy += 2400 * (theme.grav || 1) * dt; // Weltall: weniger Schwerkraft
  if (p.wall && !p.ground && p.vy > 170 && dir === p.wall && !p.hook) p.vy = 170;
  const w = windAt(now); if (w) p.vx += w * (p.ground ? 500 : 750) * dt; // Wind schiebt, in der Luft stärker
  p.dustT = (p.dustT || 0) - dt; if (p.ground && !p.slide && Math.abs(p.vx) > 450 && p.dustT <= 0) { p.dustT = 0.07; parts.push({ x: p.x - Math.sign(p.vx) * 10, y: p.y - 3, vx: -Math.sign(p.vx) * (40 + Math.random() * 60), vy: -30 - Math.random() * 40, l: 0.35, c: 'rgba(235,225,205,.75)', s: 4 + Math.random() * 4 }); }
  p.vx = clamp(p.vx, -1100, 1100); p.vy = clamp(p.vy, -1500, 1500);
  // Bewegen
  if (moveX(p, p.vx * dt)) { p.vx = 0; if (p.hook) releaseHook(p); }
  const vy0 = p.vy;
  if (moveY(p, p.vy * dt)) { if (vy0 > 700) dust(p.x, p.y, 6); p.vy = 0; }
  // Schrägen: Füße auf die Oberfläche setzen; wer schon am Boden war, bleibt auch bergab am Boden
  p.onS = false;
  if (!p.hook && p.vy >= 0) { const s = slopeAt(p.x, p.y); if (s && (p.y >= s.y - 1 || (p.wasG && p.y >= s.y - 14))) { p.y = s.y; p.vy = 0; p.onS = true; p.slopeK = s.k; } }
  if (p.hook) {
    const h = p.hook, dx = p.x - h.ax, dy = p.y - 20 - h.ay, len = Math.hypot(dx, dy) || 1, nx = dx / len, ny = dy / len;
    if (len > h.L) {
      const k = h.L - len; moveX(p, nx * k); moveY(p, ny * k);
      const vr = p.vx * nx + p.vy * ny; if (vr > 0) { p.vx -= vr * nx; p.vy -= vr * ny; }
    }
    if (dy < 24 || nx * p.face > 0.8) releaseHook(p);
  }
  const h = ph(p);
  p.ground = p.vy >= 0 && (hitRect(p.x - 11, p.y, 22, 1) || onPlatAt(p) || p.onS);
  p.wasG = p.ground;
  if (p.ground) { p.jumps = 0; p.launch = false; }
  p.wall = p.ground ? 0 : hitRect(p.x + 11, p.y - h + 4, 2, h - 8) ? 1 : hitRect(p.x - 13, p.y - h + 4, 2, h - 8) ? -1 : 0;
  // Felder
  const x0 = fl((p.x - 11) / T), x1 = fl((p.x + 11) / T), y0 = fl((p.y - h) / T), y1 = fl((p.y - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tile(tx, ty);
    if (c === '^') { if (p.y > ty * T + 14) hurt(0.5, 0.3, -380); }
    else if (c === 'O') { if (Math.hypot(p.x - tx * T - 16, p.y - h / 2 - ty * T - 16) < 26) hurt(0.5, 0.3, -460); }
    else if (c === '<') { if (p.ground && p.padCd <= 0) { p.vx = Math.min(p.vx, -1000); p.boost = Math.min(1, p.boost + 0.25); p.padCd = 0.3; beep(260, 0.25, 'sawtooth', 0.05, 900); } }
    else if (c === '~') { if (p.y > ty * T + 10) hurt(0.5, 0.3, -520); }
    else if (c === '>') { if (p.ground && p.padCd <= 0) { p.vx = Math.max(p.vx, 1000); p.boost = Math.min(1, p.boost + 0.25); p.padCd = 0.3; beep(260, 0.25, 'sawtooth', 0.05, 900); } }
    else if (c === 'T') { if (p.vy >= 0 && p.y > ty * T + 12) { p.vy = -1180; p.launch = true; p.jumps = 1; p.ground = false; p.slide = false; beep(200, 0.25, 'sine', 0.09, 800); dust(p.x, p.y, 8, '#7dffb0'); } }
    else if (c === '?') {
      const b = boxAt(tx, ty), i = map.boxes.indexOf(b);
      if (b && now >= b.t && !p.item) { b.t = now + 6000; p.item = rollItem(); p.roll = 0.9; send({ t: 'ev', k: 'box', i }); beep(660, 0.08, 'square', 0.05); setTimeout(() => beep(990, 0.12, 'square', 0.05), 80); dust(tx * T + 16, ty * T + 16, 10, '#ffd23f', 260); }
    }
  }
  if (ctrl && I.itemP && p.item && !(p.roll > 0)) useItem(p); // erst wenn die Item-Auswahl fertig gedreht hat
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
  else if (k === 'rk') { rockets.push({ id: m.r, x: +m.x, y: +m.y, d: m.d < 0 ? -1 : 1, o: m.id, t: 0 }); beep(900, 0.3, 'sawtooth', 0.05, 200); }
  else if (k === 'rx') { const i = rockets.findIndex(r => r.id === m.r); if (i >= 0) { boom(rockets[i].x, rockets[i].y); rockets.splice(i, 1); } }
  else if (k === 'sb') { snowballs.push({ id: m.r, x: +m.x, y: +m.y, vx: +m.vx, vy: +m.vy, o: m.id, t: 0 }); beep(500, 0.12, 'triangle', 0.05, 300); }
  else if (k === 'sx') { const i = snowballs.findIndex(s => s.id === m.r); if (i >= 0) { splat(snowballs[i].x, snowballs[i].y); snowballs.splice(i, 1); } }
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
function splat(x, y) { for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 260; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, l: 0.4 + Math.random() * 0.4, c: i % 3 ? '#ffffff' : '#bfe9ff', s: 3 + Math.random() * 5 }); } beep(260, 0.15, 'triangle', 0.05, 120); }
function stepWorld(dt) {
  // Schneebälle fliegen im Bogen; ein Treffer bremst kurz (kein Umfallen)
  for (let i = snowballs.length - 1; i >= 0; i--) {
    const s = snowballs[i]; s.t += dt; s.vy += 1500 * (theme.grav || 1) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (me.alive && s.o !== myId && Math.hypot(me.x - s.x, me.y - 22 - s.y) < 30) {
      me.slow = 1.3; me.turbo = 0; shake = 6; send({ t: 'ev', k: 'sx', r: s.id }); splat(s.x, s.y); snowballs.splice(i, 1);
      banner = { text: 'EINGESCHNEIT!', sub: 'Kurz langsamer …', until: performance.now() + 1100, col: '#bfe9ff' }; continue;
    }
    if (s.t > 3 || solid(fl(s.x / T), fl(s.y / T))) { splat(s.x, s.y); snowballs.splice(i, 1); }
  }
  for (let i = rockets.length - 1; i >= 0; i--) {
    // Rakete fliegt stur geradeaus, schneller als jeder Läufer
    const r = rockets[i]; r.t += dt; r.x += r.d * ROCKET_V * dt;
    parts.push({ x: r.x - r.d * 14, y: r.y + (Math.random() - 0.5) * 6, vx: -r.d * 120, vy: (Math.random() - 0.5) * 40, l: 0.3, c: Math.random() < 0.5 ? '#ffb347' : '#ff6b3f', s: 6 });
    // Eine Kiste fängt die Rakete ab: beide gehen kaputt
    const ci = crates.findIndex(c => Math.abs(c.x - r.x) < 26 && r.y > c.y - 40 && r.y < c.y + 6);
    if (ci >= 0) {
      const cid = crates[ci].id;
      if (r.o === myId) { send({ t: 'ev', k: 'rx', r: r.id }); send({ t: 'ev', k: 'cx', c: cid }); }
      boom(r.x, r.y); rockets.splice(i, 1); onEv({ k: 'cx', c: cid }); continue;
    }
    if (me.alive && r.o !== myId && Math.hypot(me.x - r.x, me.y - 20 - r.y) < 34 && hurt(0.9, 0.15, -450)) { send({ t: 'ev', k: 'rx', r: r.id }); boom(r.x, r.y); rockets.splice(i, 1); continue; }
    if (r.t > 4 || solid(fl(r.x / T), fl(r.y / T))) { boom(r.x, r.y); rockets.splice(i, 1); }
  }
  for (let i = crates.length - 1; i >= 0; i--) {
    const c = crates[i]; c.t += dt;
    if (!stand(fl(c.x / T), fl((c.y + 1) / T))) { c.vy += 2400 * dt; c.y += c.vy * dt; if (stand(fl(c.x / T), fl(c.y / T))) { c.y = fl(c.y / T) * T; c.vy = 0; } }
    if (me.alive && (c.o !== myId || c.t > 0.7) && Math.abs(me.x - c.x) < 28 && me.y > c.y - 34 && me.y - ph(me) < c.y && hurt(0.6, 0.2, -300)) { send({ t: 'ev', k: 'cx', c: c.id }); onEv({ k: 'cx', c: c.id }); continue; }
    if (c.t > 20 || (!map.vert && c.y > MH * T + 600)) crates.splice(i, 1);
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
  if (s !== 'game' && phase === 'game') endRun();
  phase = s;
  if (s !== 'game') Music.mode('menu');
  $('menu').classList.toggle('on', s === 'menu'); $('lobby').classList.toggle('on', s === 'lobby');
  document.body.classList.toggle('game', s === 'game');
  document.body.classList.toggle('lobbyview', s === 'lobby'); // Lobby: Bühne ohne Startknöpfe
}
function send(o) {
  if (hosting) return Host.handle(Host.local, JSON.parse(JSON.stringify(o)));
  if (!link) return;
  const ch = o.t === 's' && link.u.readyState === 'open' ? link.u : link.r;
  if (ch.readyState === 'open') ch.send(JSON.stringify(o));
}
function toMenu(msg) {
  if (link) { const l = link; link = null; try { l.pc.close(); } catch { } }
  lobby = null; remotes.clear(); $('home').hidden = false; $('play').hidden = true; history.replaceState(null, '', location.pathname); show('menu'); status(msg); refreshList();
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
let topT = -1e9;
const fmtM = m => m < 1000 ? m + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
function renderTop(r) {
  const col = (title, icon, rows, val) => `<div class="hsc"><h3><span>${icon}</span>${title}</h3>${rows.length ? rows.slice(0, 5).map((x, i) => `<div class="hrow"><i class="medal m${i + 1}">${i + 1}</i><b>${esc(x.n)}</b><em>${val(x)}</em></div>`).join('') : '<div class="empty">Noch keine Einträge – spielt eine Runde!</div>'}</div>`;
  const h = col('Meiste Siege', '🏆', r.wins, x => `${x.m} Match${x.m === 1 ? '' : 'es'}`) + col('Weiteste Strecke', '🏃', r.dist, x => fmtM(x.b));
  for (const el of document.querySelectorAll('.hs')) el.innerHTML = h;
  // Startbildschirm: eine Tafel, Top 3 nach Siegen
  $('hs1').innerHTML = r.wins.slice(0, 3).map(x => `<div class="hsr"><b>${esc(x.n)}</b><span>${x.m} ${x.m === 1 ? 'Sieg' : 'Siege'}</span></div>`).join(''); // Namen in die Highscore-Grafik
}
function refreshTop() { topT = performance.now(); api('top').then(r => { if (r.wins) renderTop(r); }).catch(() => { }); }
let listT = 0;
function refreshList() {
  listT = performance.now();
  if (listT - topT > 15000) refreshTop();
  return api('list').then(r => { if (r.ls) renderList(r.ls); if (phase === 'menu' && !busy && $('status').textContent.startsWith('Keine Verbindung')) status(''); return r.ls || []; })
    .catch(() => { if (phase === 'menu' && !busy) status('Keine Verbindung zum Server.'); return []; });
}
setInterval(() => { if (phase === 'menu' && !document.hidden && performance.now() - listT > 3500) refreshList(); }, 1000);

// ---------------------------------------------------------------- Host: Lobby- und Rundenlogik
const Host = (() => {
  const MAXP = 20, WIN = 3, H = { local: null }, peers = new Map();
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
    if (L.players.length >= MAXP) { c.sendRaw(JSON.stringify({ t: 'err', m: 'Lobby ist voll (max. 20).' })); return c.close(); }
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
    L.fn = null; L.state = 'countdown';
    if (L.map < 0 && L.round > 0) L.curMap = fl(Math.random() * NMAPS); // „Zufällig“: jede Runde eine neue Strecke
    L.round++;
    L.order = L.players.map(p => p.id).sort(() => Math.random() - 0.5);
    for (const p of L.players) { p.alive = true; p.s = null; p.best = 0; }
    const V = !!THEMES[L.curMap].vert;
    // Waagerecht: cam = x-Mitte, kill = Abstand der Abbruchkante. Senkrecht: cam = y-Mitte, kill = Wasserspiegel (y).
    L.solo = L.players.length === 1; L.cam = V ? vFloor(L.curMap) * T - 140 : START_X + 100; L.kill = V ? vFloor(L.curMap) * T + 300 : 800; L.tGo = Date.now() + 3600;
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
    bc({ t: 'roundEnd', w: w ? w.id : 0, sc, match, dance: fl(Math.random() * DANCES.length) });
    later(match ? 7500 : 5000, match ? toLobby : startRound);
    // Bestenliste: Rundensieg, Matchsieg und zurückgelegte Meter jedes Teilnehmers melden
    const ps = L.players.filter(p => L.order.includes(p.id)).map(p => ({ name: p.name, m: Math.max(0, Math.round(p.best || 0)), win: p === w, match: match && p === w }));
    if (ps.length >= 2) api('score', { id: L.id, ps }).catch(() => { });
  }
  function tick() {
    if (!L) return;
    const now = Date.now();
    if (L.fn && now >= L.at) { const f = L.fn; L.fn = null; f(); }
    if (now - lastPoll > (L.state === 'lobby' ? 1500 : 3000)) { lastPoll = now; poll(); }
    if (L.state === 'lobby') return;
    if (L.state === 'countdown' && now >= L.tGo) L.state = 'race';
    if (L.state !== 'countdown') {
      const rt = (now - L.tGo) / 1000, V = !!THEMES[L.curMap].vert;
      let lead = V ? 1e9 : -1e9;
      for (const p of L.players) if (p.alive && p.s) lead = V ? Math.min(lead, p.s[1]) : Math.max(lead, p.s[0]);
      if (Math.abs(lead) < 1e9) L.cam += ((V ? lead - (THEMES[L.curMap].cols ? 190 : 120) : lead + 100) - L.cam) * 0.2;
      if (!L.solo && L.state === 'race') {
        let out = [];
        if (V) {
          // Wasser steigt nach 3 s, immer schneller, und nie tiefer als der untere Bildrand
          if (rt > 60) L.kill -= (16 + Math.min(rt - 60, 60) * 0.8) * 0.033 * (THEMES[L.curMap].rate || 1); // Wasser steigt erst ab 1 Minute
          L.kill = Math.min(L.kill, L.cam + VH / 2 - 30);
          const py = p => p.s ? p.s[1] : vFloor(L.curMap) * T;
          if (rt > 1.2) out = L.players.filter(p => p.alive && py(p) - 18 > L.kill).sort((a, b) => py(b) - py(a));
        } else {
          L.kill = rt > 60 ? Math.max(150, 800 - (rt - 60) * 26) : 800; // Zerfallen erst ab 1 Minute
          // Links der Abbruchkante ist der Boden zerfallen: Wer dort ist, stürzt ab und ist raus, sobald er unten aus der Welt fällt.
          // Rückfallnetz: wer weit links hängt oder nie etwas sendet (Tab im Hintergrund, steht am Start), fliegt ebenfalls.
          const px = p => p.s ? p.s[0] : START_X, py = p => p.s ? p.s[1] : F * T;
          if (rt > 1.2) out = L.players.filter(p => p.alive && (py(p) > MH * T + 150 || px(p) < L.cam - Math.min(L.kill, 800) - 400)).sort((a, b) => px(a) - px(b));
        }
        {
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
      case 's': if (Array.isArray(m.s) && m.s.length <= 9) { c.s = m.s.map(v => +v || 0); if (c.alive && L.state === 'race') c.best = Math.max(c.best || 0, progress(c.s[0], c.s[1])); } break;
      case 'ev': if (c.alive && L.state !== 'lobby') { m.id = c.id; bc(m, c); } break;
      case 'leave': if (c === H.local) H.close(); else { leave(c); c.close(); } break;
      case 'map': if (c === L.host && L.state === 'lobby') { const i = fl(+m.i); L.map = i >= 0 && i < NMAPS ? i : -1; sendLobby(); } break;
      case 'start':
        if (c === L.host && L.state === 'lobby') {
          L.curMap = L.map < 0 ? fl(Math.random() * NMAPS) : L.map;
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
      if (m.state === 'lobby') { show('lobby'); renderLobby(); if (performance.now() - topT > 4000) { topT = performance.now(); setTimeout(refreshTop, 1500); } }
      break;
    }
    case 'round': {
      if (!THEMES[m.map]) break;
      endRun(); cutX = -1e9; map = buildMap(m.map); theme = THEMES[m.map]; solo = m.solo; roundNo = m.round; startRun(m.map);
      rockets = []; crates = []; parts = []; fx = []; snowballs = []; banner = null; cele = null;
      const slot = Math.max(0, m.order.indexOf(myId));
      resetMe(slot); me.alive = !m.spec && m.order.includes(myId);
      for (const [id, r] of remotes) { r.alive = m.order.includes(id); r.buf = []; r.rx = null; }
      if (map.vert) { camX = map.wide ? VW / 2 : map.W * T / 2; camY = camT = map.floor * T - 140; kill = map.floor * T + 300; }
      else { camX = camT = START_X + 100; camY = VH / 2 - 2; kill = 800; }
      goAt = now + m.in; lastCount = 4;
      Music.mode('race', m.map);
      show('game');
      if (m.spec) banner = { text: 'Zuschauer', sub: 'Du bist in der nächsten Runde dabei', until: now + 3000, col: '#fff' };
      break;
    }
    case 's':
      camT = m.c; kill = m.k; cutX = solo || map.vert ? -1e9 : m.c - Math.min(m.k, 800);
      for (const id in m.ps) { const r = remotes.get(+id); if (r) { r.buf.push({ t: now, s: m.ps[id] }); if (r.buf.length > 12) r.buf.shift(); } }
      break;
    case 'ev': onEv(m); break;
    case 'elim': {
      const p = posOf(m.id); if (p) boom(p.x, p.y);
      if (m.id === myId) { me.alive = false; me.hook = null; banner = map.vert ? { text: 'ABGESOFFEN!', sub: 'Das Wasser war schneller …', until: now + 1800, col: '#7fc8f8' } : { text: 'ABGESTÜRZT!', sub: 'Rüdiger, nicht so langsam!', until: now + 1800, col: '#ff5a5a' }; shake = 20; }
      else { const r = remotes.get(m.id); if (r) r.alive = false; }
      break;
    }
    case 'gone': { const r = remotes.get(m.id); if (r) r.alive = false; break; }
    case 'roundEnd': {
      if (lobby) for (const p of lobby.ps) if (m.sc[p.id] != null) p.sc = m.sc[p.id];
      const w = lobby && lobby.ps.find(p => p.id === m.w), nm = w ? (w.id === myId ? 'Du' : w.name) : 'Niemand';
      const md = Math.round(progress(me.x, me.y)), myDist = md > 0 ? ` · Deine Strecke: ${md} m` : '';
      cele = m.w ? { id: m.w, dance: (m.dance | 0) % DANCES.length, t0: now } : null;
      if (m.w === myId) me.coast = true; // Sieger läuft aus und tanzt
      banner = m.match ? { text: (w && w.id === myId ? 'DU GEWINNST' : nm + ' GEWINNT') + ' DAS MATCH!', sub: '🏆 Gleich geht es zurück in die Lobby' + myDist, until: now + 7000, col: w ? COLORS[w.c] : '#fff' }
        : { text: nm + (w && w.id === myId ? ' gewinnst' : ' gewinnt') + ' die Runde!', sub: 'Nächste Runde startet …' + myDist, until: now + 3500, col: w ? COLORS[w.c] : '#fff' };
      beep(523, 0.15, 'square', 0.06); setTimeout(() => beep(659, 0.15, 'square', 0.06), 150); setTimeout(() => beep(784, 0.3, 'square', 0.06), 300);
      break;
    }
  }
}
// ---------------------------------------------------------------- Menü / Lobby (DOM)
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function renderList(ls) {
  $('lobs').hidden = !ls.length; // leere Liste nicht anzeigen
  $('list').innerHTML = ls.length ? ls.map(l => `<div class="lob"><b>${esc(l.name)}</b><small>${l.n}/20 · ${l.run ? 'läuft' : 'wartet'}</small><button data-id="${esc(l.id)}" ${l.n >= 20 ? 'disabled' : ''}>Beitreten</button></div>`).join('')
    : '<div class="empty">Noch keine offenen Lobbys – erstelle eine und lade Freunde per Link ein!</div>';
}
function renderLobby() {
  const L = lobby, host = L.host === myId;
  $('lname').textContent = L.name; $('lcode').textContent = L.id; $('err').textContent = '';
  let h = ''; for (let i = 0; i < Math.max(8, Math.min(20, L.ps.length + 2)); i++) { const p = L.ps[i]; h += p ? `<div class="pl"><i style="background:${COLORS[p.c]}"></i>${esc(p.name)}${p.id === L.host ? ' 👑' : ''}${p.id === myId ? ' (du)' : ''}</div>` : '<div class="pl free"><i></i>frei</div>'; }
  $('players').innerHTML = h;
  $('map').innerHTML = `<option value="-1">Zufällig</option>` + THEMES.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
  $('map').value = L.map; $('map').disabled = !host;
  $('start').disabled = !host; $('start').textContent = host ? (L.ps.length > 1 ? 'Start!' : 'Solo-Training starten') : 'Warte auf Host …';
}
$('list').addEventListener('click', e => { const id = e.target.dataset && e.target.dataset.id; if (id) joinLobby(id); });
$('quick').onclick = async () => {
  if (busy) return;
  const ls = (await refreshList()).filter(l => l.n < 20), l = ls.find(x => !x.run) || ls[0];
  if (l) joinLobby(l.id); else createLobby();
};
$('create').onclick = createLobby;
// Startbildschirm ↔ Spielauswahl
const home = on => { $('home').hidden = !on; $('play').hidden = on; if (!on) setTimeout(() => $('name').focus(), 50); };
$('go').onclick = () => home(false); $('back').onclick = () => home(true);
// Alleine üben: Lobby anlegen und sofort starten
$('solo').onclick = async () => { await createLobby(); if (hosting && lobby) send({ t: 'start' }); };
$('name').addEventListener('keydown', e => { if (e.key === 'Enter') $('quick').click(); });
$('start').onclick = () => send({ t: 'start' });
$('map').onchange = () => send({ t: 'map', i: +$('map').value });
const leaveLobby = () => { send({ t: 'leave' }); if (link) { const l = link; link = null; setTimeout(() => { try { l.pc.close(); } catch { } }, 200); } toMenu(''); };
$('leave').onclick = leaveLobby; $('quit').onclick = leaveLobby;
$('copy').onclick = () => { const u = location.origin + location.pathname + '#' + lobby.id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => { $('err').style.color = '#7dffb0'; $('err').textContent = 'Link kopiert!'; }, () => { $('err').textContent = u; }); };
try { $('name').value = localStorage.getItem('hj_name') || ''; } catch { }

// ---------------------------------------------------------------- Zeichnen
const cv = $('cv'), mainCtx = cv.getContext('2d'); let ctx = mainCtx;
// Anzeigen (HUD) liegen bei aktiven Effekten auf einer eigenen Ebene über dem Effektbild, damit sie nicht mitleuchten
const hud = document.createElement('canvas'); hud.id = 'hudcv'; hud.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:none;pointer-events:none'; const hudCtx = hud.getContext('2d');
let scale = 1, offX = 0, offY = 0;
// ---------------------------------------------------------------- Grafik-Effekte (WebGL-Nachbearbeitung)
// Das fertige Spielbild (Canvas 2D) wird in WebGL übernommen und bekommt Bloom (helle Stellen leuchten über),
// Dunst/Nebel und eine Farbstimmung je Welt. Abschaltbar in den Optionen; ohne WebGL läuft das Spiel wie bisher.
const FX = { on: (() => { try { return localStorage.getItem('hj_fx') !== '0'; } catch { return true; } })(), ok: false };
// Stärke je Welt: bloom = Leuchten, thr = ab welcher Helligkeit, fog = Dunst, sat/con = Sättigung/Kontrast, tint = Farbstich
const FX_LOOK = {
  neon: { bloom: 1.1, thr: 0.55, fog: 0.10, sat: 1.12, con: 1.06, tint: [1.0, 0.96, 1.06] },
  garden: { bloom: 0.6, thr: 0.62, fog: 0.10, sat: 1.06, con: 1.04, tint: [1.03, 1.0, 0.96] },
  junk: { bloom: 0.7, thr: 0.6, fog: 0.14, sat: 1.05, con: 1.06, tint: [1.05, 0.98, 0.92] },
  ice: { bloom: 0.6, thr: 0.68, fog: 0.16, sat: 0.98, con: 1.02, tint: [0.96, 1.0, 1.06] },
  lava: { bloom: 1.2, thr: 0.5, fog: 0.14, sat: 1.12, con: 1.08, tint: [1.08, 0.97, 0.9] },
  jungle: { bloom: 0.6, thr: 0.62, fog: 0.18, sat: 1.06, con: 1.04, tint: [0.98, 1.04, 0.96] },
  ware: { bloom: 0.8, thr: 0.58, fog: 0.14, sat: 1.05, con: 1.06, tint: [1.05, 0.99, 0.92] },
  crystal: { bloom: 1.1, thr: 0.55, fog: 0.12, sat: 1.1, con: 1.05, tint: [1.02, 0.96, 1.08] },
  rope: { bloom: 0.7, thr: 0.6, fog: 0.12, sat: 1.06, con: 1.04, tint: [1.03, 1.0, 0.96] },
  desert: { bloom: 0.7, thr: 0.65, fog: 0.16, sat: 1.06, con: 1.04, tint: [1.06, 1.0, 0.92] },
  mars: { bloom: 0.8, thr: 0.6, fog: 0.18, sat: 1.06, con: 1.06, tint: [1.08, 0.96, 0.9] },
  space: { bloom: 1.0, thr: 0.55, fog: 0.06, sat: 1.08, con: 1.06, tint: [0.97, 0.99, 1.06] },
  moon: { bloom: 0.9, thr: 0.6, fog: 0.05, sat: 0.95, con: 1.08, tint: [0.98, 1.0, 1.05] },
};
function fxInit() {
  const c = document.createElement('canvas'); c.id = 'fxcv';
  c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:none;pointer-events:none';
  cv.after(c); c.after(hud);
  const gl = c.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return;
  const VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
  const FS = {
    bright: 'precision mediump float;varying vec2 uv;uniform sampler2D t;uniform float thr;void main(){vec3 c=texture2D(t,uv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(thr,1.,l),1.);}',
    blur: 'precision mediump float;varying vec2 uv;uniform sampler2D t;uniform vec2 d;void main(){vec3 s=texture2D(t,uv).rgb*.227;s+=(texture2D(t,uv+d*1.38).rgb+texture2D(t,uv-d*1.38).rgb)*.316;s+=(texture2D(t,uv+d*3.23).rgb+texture2D(t,uv-d*3.23).rgb)*.07;gl_FragColor=vec4(s,1.);}',
    comp: 'precision mediump float;varying vec2 uv;uniform sampler2D s,b;uniform float bk,fk,sat,con;uniform vec3 fc,tint;void main(){vec3 c=texture2D(s,uv).rgb+texture2D(b,uv).rgb*bk;' +
      'float h=fk*(.35+.65*smoothstep(.75,.05,uv.y));c=mix(c,fc,h*.55)+fc*h*.12;' + // Dunst: unten dichter
      'float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);c=(c-.5)*con+.5;c*=tint;gl_FragColor=vec4(c,1.);}',
  };
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
  const prog = fs => { const p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, fs); if (!v || !f) return null; gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
  const P = { bright: prog(FS.bright), blur: prog(FS.blur), comp: prog(FS.comp) };
  if (!P.bright || !P.blur || !P.comp) return;
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  const target = () => { const t = tex(), f = gl.createFramebuffer(); return { t, f, w: 0, h: 0 }; };
  Object.assign(FX, { c, gl, P, scene: tex(), A: target(), B: target(), ok: true });
}
function fxTarget(T2, w, h) {
  const gl = FX.gl; if (T2.w === w && T2.h === h) return;
  gl.bindTexture(gl.TEXTURE_2D, T2.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, T2.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T2.t, 0); T2.w = w; T2.h = h;
}
function fxRender() {
  const { gl, P, c } = FX, w = cv.width, h = cv.height, bw = Math.max(1, Math.ceil(w / 4)), bh = Math.max(1, Math.ceil(h / 4));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const L = FX_LOOK[theme.deco] || FX_LOOK.neon, sky = parseInt(theme.sky[1].slice(1), 16), fc = [(sky >> 16) / 255, ((sky >> 8) & 255) / 255, (sky & 255) / 255];
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FX.scene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  fxTarget(FX.A, bw, bh); fxTarget(FX.B, bw, bh);
  const pass = (p, out, w2, h2) => { gl.useProgram(p); gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null); gl.viewport(0, 0, w2, h2); };
  // 1) helle Stellen, 2+3) zweimal weichzeichnen (waagerecht/senkrecht)
  pass(P.bright, FX.A, bw, bh); gl.uniform1i(gl.getUniformLocation(P.bright, 't'), 0); gl.uniform1f(gl.getUniformLocation(P.bright, 'thr'), Math.min(0.9, L.thr + 0.08)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  for (let i = 0; i < 2; i++) {
    pass(P.blur, FX.B, bw, bh); gl.bindTexture(gl.TEXTURE_2D, FX.A.t); gl.uniform1i(gl.getUniformLocation(P.blur, 't'), 0); gl.uniform2f(gl.getUniformLocation(P.blur, 'd'), (1 + i) / bw, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    pass(P.blur, FX.A, bw, bh); gl.bindTexture(gl.TEXTURE_2D, FX.B.t); gl.uniform2f(gl.getUniformLocation(P.blur, 'd'), 0, (1 + i) / bh); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // 4) zusammensetzen: Bild + Leuchten, Dunst, Farbstimmung
  pass(P.comp, null, w, h);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FX.scene); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, FX.A.t); gl.activeTexture(gl.TEXTURE0);
  const u = n => gl.getUniformLocation(P.comp, n);
  gl.uniform1i(u('s'), 0); gl.uniform1i(u('b'), 1); gl.uniform1f(u('bk'), L.bloom * 0.7); /* insgesamt dezenter */ gl.uniform1f(u('fk'), L.fog); gl.uniform1f(u('sat'), L.sat); gl.uniform1f(u('con'), L.con);
  gl.uniform3f(u('fc'), fc[0], fc[1], fc[2]); gl.uniform3f(u('tint'), L.tint[0], L.tint[1], L.tint[2]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function fxShow(on) { if (FX.c) FX.c.style.display = on ? 'block' : 'none'; hud.style.display = on ? 'block' : 'none'; }
function resize() {
  // mit Effekten etwas niedrigere Auflösung, damit es flüssig bleibt
  const d = Math.min(FX.on ? 1.25 : 2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d;
  scale = Math.min(cv.width / VW, cv.height / VH); offX = (cv.width - VW * scale) / 2; offY = (cv.height - VH * scale) / 2;
}
addEventListener('resize', resize); resize(); try { fxInit(); } catch { FX.ok = false; }
if ($('fxtoggle')) { $('fxtoggle').checked = FX.on; $('fxtoggle').onchange = () => { FX.on = $('fxtoggle').checked; try { localStorage.setItem('hj_fx', FX.on ? '1' : '0'); } catch { } resize(); if (!FX.on) fxShow(false); }; }
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); ctx.fill(); }
const hash = i => { const s = Math.sin(i * 127.1) * 43758.5453; return s - Math.floor(s); };
// Sieger von vorn: schaut in die Kamera. back = Rückansicht (kein Auge, kein Mund). Füße bei y=0.
// Sieger als runder Körper, der sich um die Hochachse dreht. a = Drehwinkel: 0 = schaut in die Kamera, π = Rücken zur Kamera.
// Auge, Mund und Schnalle wandern auf der Rundung zur Seite und verschwinden hinten, der Knoten des Stirnbands taucht auf.
function frontBody(col, a, drop, t) {
  const band = shade(col, -0.38), sn = Math.sin(a), cs = Math.cos(a), R = 12;
  const onBody = (fn) => { ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-13, -47, 26, 39, [13, 13, 6, 6]); else ctx.rect(-13, -47, 26, 39); ctx.clip(); fn(); ctx.restore(); };
  // Beine rücken in der Seitenansicht zusammen
  const lx = 6 * Math.abs(cs) + 1.5;
  ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-lx, -10); ctx.lineTo(-lx - 1, -3); ctx.moveTo(lx, -10); ctx.lineTo(lx + 1, -3); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-lx - 2, -2.5, 6, 3.6, 0, 0, 7); ctx.ellipse(lx + 2, -2.5, 6, 3.6, 0, 0, 7); ctx.fill();
  // Körper
  ctx.fillStyle = col; capsule(-13, -47, 26, 39, 13, 6);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; capsule(-10, -44, 5, 14, 3, 3);
  if (cs < -0.6 && drop > 0) { ctx.fillStyle = shade(col, -0.06); ctx.beginPath(); ctx.arc(-5.5, -12, 6.5, 0, 7); ctx.arc(5.5, -12, 6.5, 0, 7); ctx.fill(); }
  // Hose mit Gürtel
  ctx.fillStyle = INK; capsule(-13, -17 + drop, 26, 9, 0, 5);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(-13, -14 + drop, 26, 1.5);
  onBody(() => {
    const vis = clamp(cs + 0.25, 0, 1), fx = R * sn; // Vorderseite: sichtbar, solange sie zur Kamera zeigt
    if (vis > 0) { ctx.fillStyle = '#ffc928'; ctx.fillRect(fx - 3 * (0.4 + 0.6 * vis), -17 + drop, 6 * (0.4 + 0.6 * vis), 5); }
    ctx.fillStyle = band; ctx.fillRect(-14, -41, 28, 7);
    if (vis > 0) {
      const w = 13 * (0.35 + 0.65 * vis);
      ctx.fillStyle = '#fff'; rr(fx - w / 2, -43, w, 11, 3.5);
      ctx.fillStyle = INK; rr(fx - 2.2 * (0.5 + 0.5 * vis) + 1.5 * sn, -40.5, 4.5 * (0.5 + 0.5 * vis), 6, 1);
      ctx.beginPath(); ctx.ellipse(fx, -26, 3.6 * (0.4 + 0.6 * vis), 3.6, 0, 0, Math.PI); ctx.fill();
    }
    const back = clamp(-cs + 0.25, 0, 1), bx = -R * sn; // Knoten hinten
    if (back > 0) { ctx.fillStyle = shade(col, -0.45); ctx.beginPath(); ctx.ellipse(bx, -37.5, 4 * (0.4 + 0.6 * back), 4, 0, 0, 7); ctx.fill(); }
  });
}
// Arm von vorn: Schulter → Ellbogen → Hand, ohne schwarzen Rand
function farm(sx, sy, ex, ey, hx, hy, col) {
  for (const [w, c] of [[6.5, shade(col, -0.14)], [5, col]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 3.8, 0, 7); ctx.fill();
}
function drawFront(col, t, g) {
  const ease = v => v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, -1, 15, 3, 0, 0, 7); ctx.fill();
  if (g === 0) { // Kusshand: rechte Hand zum Mund, dann zur Kamera werfen – das Herz fliegt auf uns zu
    const k = (t % 2200) / 2200, m = ease(k / 0.25), o = ease((k - 0.42) / 0.12);
    frontBody(col, 0, 0, t);
    farm(-12, -19, -15, -13, -15, -8, col);
    farm(12, -19, 16 - 4 * m + 6 * o, -15 - 3 * m - 6 * o, 15 - 14 * m + 12 * o, -9 - 16 * m - 6 * o, col);
    if (k > 0.42) { // Herz wächst, als käme es auf uns zu, und verblasst
      const h = (k - 0.42) / 0.58, s = 4 + h * 16, hx = 6 + h * 10, hy = -30 - h * 18;
      ctx.globalAlpha = 1 - h * h; ctx.fillStyle = '#ff4d7a'; ctx.beginPath();
      ctx.arc(hx - s / 2, hy, s / 2 + 0.5, 0, 7); ctx.arc(hx + s / 2, hy, s / 2 + 0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - s - 0.5, hy + 0.8); ctx.lineTo(hx, hy + s * 1.35); ctx.lineTo(hx + s + 0.5, hy + 0.8); ctx.fill(); ctx.globalAlpha = 1;
    }
  } else if (g === 1) { // Zensiert: rechter Arm hoch, Hand verpixelt, linke Hand in der Hüfte
    const k = (t % 2400) / 2400, u = ease(k / 0.18) * (1 - ease((k - 0.85) / 0.15));
    frontBody(col, 0, 0, t);
    farm(-12, -19, -19, -16, -13, -12, col);
    const hx = 15 + 2 * u, hy = -9 - 44 * u;
    farm(12, -19, 17 + 3 * u, -15 - 17 * u, hx, hy, col);
    if (u > 0.6) { mosaic(hx - 8, hy - 9, 16, 16, t, col); text('PIEP!', hx + 22, hy - 4, 9, '#fff', 'center', true); }
  } else { // Po zeigen: dreht sich um, Hose runter (verpixelt), Po wackelt seitlich, Hose hoch, dreht sich zurück
    const k = (t % 3400) / 3400, tw = k < 0.16 ? k / 0.16 : k > 0.84 ? (1 - k) / 0.16 : 1; // 0 = vorn, 1 = hinten
    const an = Math.PI * ease(tw), cs = Math.cos(an), sh = 4 + 8 * Math.abs(cs); // stufenlose Drehung
    const drop = ease((k - 0.22) / 0.1) * (1 - ease((k - 0.68) / 0.1)) * 9, wig = drop > 5 ? Math.sin(t / 70) * 0.09 : 0;
    ctx.save(); ctx.rotate(wig);
    frontBody(col, an, drop, t);
    farm(-sh, -19, -sh - 3, -13, -sh, -8 + drop, col); farm(sh, -19, sh + 3, -13, sh, -8 + drop, col);
    if (cs < -0.8 && drop > 5) mosaic(-12, -19, 24, 12, t, col);
    ctx.restore();
  }
}
// Gesten des Siegers (alte Seitenansicht, derzeit ungenutzt). Armziele werden in echten Körperkoordinaten angegeben (wo Ellbogen und Hand landen sollen)
// und hier in die Werte umgerechnet, die drawRunner erwartet (Arme dort um 70 % verkürzt und versetzt).
const armTo = (sx, ex, ey, hx, hy) => { const f = (px, py) => [(px - sx) / 0.7 + sx + 5, (py + 18) / 0.7 - 18 - 7]; return [...f(ex, ey), ...f(hx, hy)]; };
const FA = (ex, ey, hx, hy) => armTo(1, ex, ey, hx, hy), BA = (ex, ey, hx, hy) => armTo(-9, ex, ey, hx, hy);
function gesture(d, t, P) {
  const ease = v => v < 0 ? 0 : v > 1 ? 1 : v * v * (3 - 2 * v);
  P.ba = BA(-11, -12, -10, -6);
  if (d === 6) { // Kusshand: Hand zum Mund, Kuss werfen, Herz fliegt
    const k = (t % 2200) / 2200, toMouth = ease(k / 0.25), out = ease((k - 0.42) / 0.12);
    const hx = 6 + (9 - 6) * toMouth + 13 * out, hy = -12 + (-25 + 12) * toMouth - 10 * out;
    P.fa = FA(8 + 4 * out, -16 - 6 * out, hx, hy);
    if (k > 0.42) P.heart = (k - 0.42) / 0.58;
    P.rot = -0.06 * toMouth + 0.08 * out;
  } else if (d === 7) { // Stinkefinger, zensiert: Arm hoch, Hand verpixelt
    const k = (t % 2400) / 2400, up = ease(k / 0.18) * (1 - ease((k - 0.85) / 0.15));
    P.fa = FA(6 + 6 * up, -14 - 16 * up, 7 + 7 * up, -8 - 40 * up);
    if (up > 0.6) { P.censor = [7 + 7 * up, -8 - 40 * up]; P.piep = up; }
    P.rot = -0.05 * up;
  } else { // Po zeigen: umdrehen, Hose runter (verpixelt), wackeln, Hose hoch
    const k = (t % 3200) / 3200, turned = k > 0.08 && k < 0.92;
    P.flip = turned ? -1 : 1;
    const drop = ease((k - 0.16) / 0.12) * (1 - ease((k - 0.74) / 0.12));
    P.pants = drop * 9; P.rot = 0.12 * drop; P.y = 2 * drop;
    if (drop > 0.5) { P.moon = Math.sin(t / 60) * 2.5; }
    P.fa = FA(8, -12, 7, -8 + P.pants); P.ba = BA(-11, -12, -9, -8 + P.pants);
  }
  return P;
}
// grobes Pixel-Mosaik als Zensur
function mosaic(x, y, w, h, t, col) {
  const c = 4, pal = [col, shade(col, -0.3), '#f3c9a1', '#d9a07a', INK];
  for (let i = 0; i < w / c; i++) for (let j = 0; j < h / c; j++) { ctx.fillStyle = pal[fl(hash(i * 7 + j * 13 + fl(t / 140)) * pal.length)]; ctx.fillRect(x + i * c, y + j * c, c + 0.3, c + 0.3); }
}
// Siegerposen im Stil der Figurenvorlage. Körperkoordinaten: Füße bei y=0, Blick nach +x.
// fa/ba = vorderer/hinterer Arm als [Ellbogen x,y, Hand x,y]; Schultern bei (3,-23) und (-3,-23).
function dancePose(d, t) {
  const s = Math.sin(t / 45);
  const P = { x: 0, y: 0, rot: 0, sx: 1, sy: 1, flip: 1, lf: [-7, -1], rf: [7, -1], fa: [10, -18, 8, -12], ba: [-10, -18, -8, -12], butt: null };
  if (d >= 6) return gesture(d, t, P);
  if (d === 0) { // Cool: Arme verschränkt, lässiges Nicken
    P.sy = 1 + Math.abs(Math.sin(t / 260)) * 0.03; P.rot = Math.sin(t / 520) * 0.04;
    P.fa = [11, -21, -5, -20]; P.ba = [-9, -20, 9, -22];
  } else if (d === 1) { // Twerk seitlich: vorgebeugt, Hände an der Hüfte
    P.rot = 0.32; P.y = 5; P.lf = [-12, -1]; P.rf = [11, -1]; P.butt = s * 4;
    P.fa = [13, -21, 8, -15]; P.ba = [-13, -21, -8, -15];
  } else if (d === 2) { // Po-Wackler: Rücken zum Publikum
    P.flip = -1; P.rot = 0.14; P.y = 4; P.butt = Math.sin(t / 55) * 6; P.lf = [-11, -1]; P.rf = [10, -1];
    P.fa = [14, -21, 9, -15]; P.ba = [-14, -21, -9, -15];
  } else if (d === 3) { // Handstand, Beine im V
    const w = Math.sin(t / 260) * 3; P.rot = Math.PI; P.y = -2;
    P.lf = [-13 + w, 6]; P.rf = [13 - w, 6]; P.fa = [9, -50, 11, -65]; P.ba = [-9, -50, -11, -65]; // Hände reichen bis zum Boden
  } else if (d === 4) { // Moonwalk: gleitet rückwärts, Arme pendeln
    const b = t / 1000 * Math.PI * 2 * 2.1, k = Math.sin(b);
    P.x = Math.sin(b / 4) * 34; P.flip = Math.cos(b / 4) > 0 ? -1 : 1; P.rot = -0.08;
    P.lf = [-6 + k * 8, -1 - Math.max(0, k) * 4]; P.rf = [6 - k * 8, -1 - Math.max(0, -k) * 4];
    P.fa = [6 + k * 4, -15, 8 + k * 9, -9]; P.ba = [-6 - k * 4, -15, -8 - k * 9, -9];
  } else { // Jubel: hüpfen und winken
    const h = Math.abs(Math.sin(t / 250)); P.y = -h * 16;
    P.lf = [-6, -1 - h * 5]; P.rf = [7, -1 - h * 3];
    P.fa = [13, -36, 14 + Math.sin(t / 110) * 7, -51]; P.ba = [-10, -18, -14, -11];
  }
  return P;
}
function shade(hex, k) { // Farbe aufhellen (k>0) oder abdunkeln (k<0)
  const n = parseInt(hex.slice(1), 16), f = v => clamp(Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)), 0, 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const INK = '#16121f';
// Arm: Schulter → Ellbogen → Hand, mit dunklem Rand, damit er sich vom gleichfarbigen Körper abhebt
function limb(sx, sy, q, col, edge) {
  // Arm kürzer als die Posenwerte (70 %), ohne schwarzen Rand: nur ein Hauch dunkler als der Körper, wie in der Vorlage
  const k = 0.7, ex = sx + (q[0] - sx) * k, ey = sy + (q[1] - sy) * k, hx = sx + (q[2] - sx) * k, hy = sy + (q[3] - sy) * k;
  for (const [w, c] of [[6.5, edge], [5, col]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke(); }
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, 7); ctx.fill();
}
function capsule(x, y, w, h, rt, rb) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, [rt, rt, rb, rb]); else ctx.rect(x, y, w, h); ctx.fill(); }
// Spielfigur: runder Körper, Auge im Stirnband, Stirnband-Zipfel, schwarze Hose mit Gürtelschnalle, Arme und Füße.
function drawRunner(x, y, vx, st, face, col, t, blink, boosting, dance = -1) {
  ctx.save(); ctx.translate(x, y);
  const sp = Math.abs(vx), dz = POSES_ON && dance >= 0 && sp < 70 && st !== 2 && st !== 4;
  if (dz) { drawFront(col, t, dance % DANCES.length); ctx.restore(); return; } // Sieger schaut frontal in die Kamera
  const P = dz ? dancePose(DANCE_POSE[dance % DANCES.length], t) : null;
  if (P) { ctx.translate(P.x, P.y); face = (face || 1) * P.flip; }
  if (blink && fl(t / 70) % 2) ctx.globalAlpha = 0.35;
  ctx.scale(face || 1, 1);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, -1 - (P ? P.y : 0), 13, 3, 0, 0, 7); ctx.fill();
  const dk = shade(col, -0.3), band = shade(col, -0.38);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (st === 2) { // Rutschen: liegt auf dem Rücken, Füße voraus
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(20, -4); ctx.moveTo(8, -12); ctx.lineTo(19, -10); ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(22, -4, 5, 3.5, 0, 0, 7); ctx.ellipse(21, -10, 5, 3.5, 0, 0, 7); ctx.fill();
    limb(-6, -14, [-14, -12, -22, -10], col, shade(col, -0.14));
    ctx.fillStyle = col; capsule(-20, -21, 30, 19, 9, 9);
    ctx.fillStyle = INK; capsule(2, -21, 10, 19, 0, 9); ctx.fillStyle = '#ffd23f'; ctx.fillRect(2, -11, 4, 5);
    ctx.fillStyle = band; ctx.fillRect(-20, -20, 6, 10); ctx.fillStyle = '#fff'; rr(-18, -21, 9, 10, 3); ctx.fillStyle = INK; ctx.fillRect(-15, -19, 4, 5);
    ctx.restore(); return;
  }
  if (P) { ctx.translate(0, -22); ctx.rotate(P.rot); ctx.scale(P.sx, P.sy); ctx.translate(0, 22); }
  else ctx.rotate(st === 4 ? Math.sin(t / 45) * 0.6 : clamp(vx * (face || 1) / 900, -0.2, 0.34));
  const air = st === 1 || st === 3 || st === 5, a = sp > 40 && !air ? Math.sin(x * 0.07) : 0;
  const lf = P ? P.lf : air ? [-9, -4] : [-4 + a * 10, -1 - Math.max(0, -a) * 3], rf = P ? P.rf : air ? [8, -7] : [4 - a * 10, -1 - Math.max(0, a) * 3];
  let fa, ba;
  if (P) { fa = P.fa; ba = P.ba; }
  else if (st === 3) { fa = [10, -34, 12, -50]; ba = [-8, -28, -13, -34]; }                       // Haken: Hand greift nach oben ans Seil
  else if (st === 5) { fa = [12, -27, 15, -34]; ba = [-10, -22, -14, -26]; }                      // an der Wand
  else if (st === 4) { const w = Math.sin(t / 40) * 6; fa = [12, -32 + w, 17, -42]; ba = [-12, -30, -18, -40 - w]; } // benommen, fuchtelt
  else if (air) { fa = [11, -30, 15, -39]; ba = [-11, -27, -17, -32]; }                          // Sprung: Arme hoch
  else { fa = [5 + a * 7, -16, 7 + a * 13, -11]; ba = [-5 - a * 7, -16, -7 - a * 13, -11]; }    // Laufen: Arme pendeln gegen die Beine
  // hinterer Arm und Beine
  const lo = q => [q[0] - 5, q[1] + 7, q[2] - 5, q[3] + 7]; // Arme tiefer und weiter hinten, weg vom Mund
  limb(-9, -18, lo(ba), dk, shade(col, -0.4));
  ctx.strokeStyle = INK; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(lf[0], lf[1] - 2); ctx.moveTo(4, -10); ctx.lineTo(rf[0], rf[1] - 2); ctx.stroke();
  ctx.fillStyle = INK; for (const f of [lf, rf]) { ctx.beginPath(); ctx.ellipse(f[0] + 2, f[1] - 2, 6, 3.6, 0, 0, 7); ctx.fill(); }
  // Körper
  ctx.fillStyle = col; capsule(-11, -45, 22, 37, 11, 6);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; capsule(-8, -42, 5, 14, 3, 3);
  // Hose mit Gürtel und Schnalle
  const pd = P && P.pants || 0; // heruntergelassene Hose
  if (pd > 0) { ctx.fillStyle = shade(col, -0.05); ctx.beginPath(); ctx.arc(-5, -12 + (P.moon || 0), 7.5, 0, 7); ctx.fill(); }
  ctx.fillStyle = INK; capsule(-11, -17 + pd, 22, 9, 0, 5);
  if (P && P.butt != null) { ctx.beginPath(); ctx.arc(-9, -12 + P.butt, 10, 0, 7); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(-11, -14 + pd, 22, 1.5);
  ctx.fillStyle = '#ffc928'; ctx.fillRect(1, -17 + pd, 6, 5);
  if (pd > 4) mosaic(-14, -20 + (P.moon || 0), 16, 12, t, col);
  // Stirnband, Auge, Mund
  ctx.save(); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-11, -45, 22, 37, [11, 11, 6, 6]); else ctx.rect(-11, -45, 22, 37); ctx.clip();
  ctx.fillStyle = band; ctx.fillRect(-12, -39, 14, 7); ctx.restore();
  ctx.fillStyle = '#fff'; rr(1, -41, 12, 11, 3.5); ctx.fillStyle = INK; rr(6, -38.5, 4.5, 6, 1);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(6, -26, 3.4, 0, Math.PI); ctx.fill();
  // vorderer Arm
  limb(1, -18, lo(fa), col, shade(col, -0.14));
  if (P && P.censor) { mosaic(P.censor[0] - 7, P.censor[1] - 9, 14, 14, t, col); }
  if (P && P.heart != null) { const h = P.heart, hx = 18 + h * 30, hy = -34 - h * 34, r = 3 + h * 4; ctx.globalAlpha = 1 - h; ctx.fillStyle = '#ff4d7a'; ctx.beginPath(); ctx.arc(hx - r / 2, hy, r / 2 + 0.6, 0, 7); ctx.arc(hx + r / 2, hy, r / 2 + 0.6, 0, 7); ctx.moveTo(hx - r - 0.6, hy + 0.5); ctx.lineTo(hx, hy + r * 1.3); ctx.lineTo(hx + r + 0.6, hy + 0.5); ctx.fill(); ctx.globalAlpha = 1; }
  if (boosting) { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(-11, -30); ctx.lineTo(-26 - Math.random() * 12, -24); ctx.lineTo(-11, -16); ctx.fill(); }
  ctx.restore();
}

// ---------------------------------------------------------------- Welt-Optik
// Gebäude, Bäume, Berge im Hintergrund – je nach Thema, mit Fenstern, Antennen, Schornsteinen, Neonschildern …
function drawBld(x, y, w, h, col, sd, lit, near, now) {
  const d = theme.deco, r = k => hash(sd * 3.7 + k);
  ctx.fillStyle = col;
  if (d === 'jungle' || (d === 'garden' && !near && r(1) < 0.4)) { // Bäume
    ctx.fillRect(x + w / 2 - 6, y + h * 0.35, 12, h); const cx = x + w / 2, cy = y + h * 0.3;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx + (r(i) - 0.5) * w * 0.8, cy + (r(i + 5) - 0.5) * 50, 28 + r(i + 9) * 34, 0, 7); ctx.fill(); }
    if (d === 'jungle' && near) { ctx.strokeStyle = col; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const vx = x + r(i + 20) * w; ctx.beginPath(); ctx.moveTo(vx, cy); ctx.quadraticCurveTo(vx + Math.sin(now / 900 + i) * 10, cy + 80, vx, cy + 150 + r(i) * 80); ctx.stroke(); } }
    return;
  }
  if ((d === 'ice' || d === 'lava') && !near) { // Berge / Vulkan
    ctx.beginPath(); ctx.moveTo(x - w * 0.6, y + h); ctx.lineTo(x + w / 2 - (d === 'lava' ? 24 : 0), y); ctx.lineTo(x + w / 2 + (d === 'lava' ? 24 : 0), y); ctx.lineTo(x + w * 1.6, y + h); ctx.fill();
    if (d === 'ice') { ctx.fillStyle = 'rgba(240,250,255,.55)'; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2 - 40, y + 60); ctx.lineTo(x + w / 2 - 10, y + 48); ctx.lineTo(x + w / 2 + 14, y + 66); ctx.lineTo(x + w / 2 + 40, y + 60); ctx.fill(); }
    else { ctx.fillStyle = `rgba(255,120,40,${0.35 + 0.2 * Math.sin(now / 400 + sd)})`; ctx.fillRect(x + w / 2 - 22, y, 44, 6); for (let i = 0; i < 4; i++) { const k = ((now / 2600 + r(i)) % 1); ctx.fillStyle = `rgba(60,30,30,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + w / 2 + Math.sin(k * 5 + i) * 20, y - k * 160, 14 + k * 30, 0, 7); ctx.fill(); } }
    return;
  }
  if (d === 'desert') {
    if (!near) { ctx.beginPath(); ctx.moveTo(x - w * 0.3, y + h); ctx.lineTo(x + w / 2, y + h * 0.3); ctx.lineTo(x + w * 1.3, y + h); ctx.fill(); ctx.fillStyle = shade(col, -0.12); ctx.beginPath(); ctx.moveTo(x + w / 2, y + h * 0.3); ctx.lineTo(x + w * 1.3, y + h); ctx.lineTo(x + w * 0.62, y + h); ctx.fill(); }
    else { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h, w * 0.95, h * 0.42, 0, Math.PI, 0); ctx.fill();
      if (r(1) < 0.5) { const cx = x + w * 0.35, cy = y + h * 0.6; ctx.fillRect(cx - 6, cy - 60, 12, 62); ctx.fillRect(cx - 22, cy - 40, 8, 20); ctx.fillRect(cx - 22, cy - 26, 18, 7); ctx.fillRect(cx + 14, cy - 48, 8, 22); ctx.fillRect(cx + 4, cy - 30, 18, 7); } }
    return;
  }
  if (d === 'mars' || d === 'moon') {
    if (!near) { ctx.beginPath(); ctx.moveTo(x - w * 0.5, y + h); ctx.lineTo(x + w * 0.4, y + h * 0.15); ctx.lineTo(x + w * 0.6, y + h * 0.2); ctx.lineTo(x + w * 1.5, y + h); ctx.fill(); ctx.fillStyle = shade(col, -0.2); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + w * (0.2 + r(i + 3) * 0.6), y + h * (0.55 + r(i + 6) * 0.3), 10 + r(i) * 14, 4 + r(i) * 4, 0, 0, 7); ctx.fill(); } }
    else { ctx.beginPath(); ctx.moveTo(x - 20, y + h); ctx.lineTo(x + 10, y + h * 0.35); ctx.lineTo(x + w - 10, y + h * 0.35); ctx.lineTo(x + w + 20, y + h); ctx.fill();
      if (r(1) < 0.3) { ctx.strokeStyle = 'rgba(255,230,210,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.35, 34, Math.PI, 0); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,180,.18)'; ctx.fill(); } }
    return;
  }
  if (d === 'space') {
    if (!near) { if (r(1) < 0.35) { const cx = x + w / 2, cy = y + h * 0.3, rad = 22 + r(2) * 40; ctx.fillStyle = shade(theme.edge, -0.55 + r(3) * 0.2); ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.6, 0, 7); ctx.fill(); if (r(4) < 0.5) { ctx.strokeStyle = 'rgba(200,220,255,.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, rad * 1.7, rad * 0.4, -0.3, 0, 7); ctx.stroke(); } } }
    else { rr(x, y + h * 0.4, w, h * 0.35, 12); ctx.fillRect(x + w / 2 - 4, y + h * 0.75, 8, h * 0.25); ctx.fillStyle = 'rgba(160,200,255,.18)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 18 + i * (w - 36) / 3, y + h * 0.57, 5, 0, 7); ctx.fill(); } ctx.fillStyle = col; ctx.fillRect(x + w * 0.7, y + h * 0.4 - 30, 3, 30); }
    return;
  }
  ctx.fillRect(x, y, w, h);
  // Dachaufbauten
  const rf = r(2);
  if (rf < 0.3) { ctx.fillRect(x + w * 0.2, y - 18, w * 0.35, 18); }
  else if (rf < 0.5) { ctx.fillRect(x + w * 0.7, y - 46, 4, 46); ctx.fillStyle = 'rgba(255,90,70,.35)'; ctx.fillRect(x + w * 0.7 - 1, y - 50, 6, 6); ctx.fillStyle = col; }
  else if (rf < 0.7) { // Schornstein mit Rauch
    const sx = x + w * 0.3; ctx.fillRect(sx, y - 34, 14, 34);
    for (let i = 0; i < 4; i++) { const k = (now / 3000 + i / 4 + r(3)) % 1; ctx.fillStyle = `rgba(200,190,180,${0.18 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx + 7 + k * 30, y - 40 - k * 90, 8 + k * 18, 0, 7); ctx.fill(); }
    ctx.fillStyle = col;
  } else if (rf < 0.85) { const tx = x + w * 0.55; ctx.fillRect(tx, y - 30, 30, 20); ctx.fillRect(tx + 3, y - 10, 3, 10); ctx.fillRect(tx + 24, y - 10, 3, 10); }
  // Fenster
  const cw = near ? 20 : 16, chh = near ? 26 : 22;
  for (let wy = y + 14; wy < y + h - 20; wy += chh) for (let wx = x + 8; wx < x + w - 12; wx += cw) {
    const k = hash(fl((wx - x) / cw + 0.25) * 7.31 + fl((wy - y) / chh + 0.25) * 19.7 + sd * 3.3); // feste Fensternummer, nicht Bildschirmposition – sonst flackert es beim Scrollen
    if (k > 1 - lit) { ctx.fillStyle = theme.hook; ctx.globalAlpha = near ? 0.22 : 0.14; ctx.fillRect(wx, wy, cw - 8, chh - 12); ctx.globalAlpha = 1; }
    else if (k < 0.4) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(wx, wy, cw - 8, chh - 12); }
  }
  if (near) {
    if ((d === 'junk' || d === 'ware') && r(4) < 0.5) { // Rohre
      ctx.strokeStyle = shade(col, 0.12); ctx.lineWidth = 10; ctx.beginPath(); const px = x + w * (0.2 + r(5) * 0.6);
      ctx.moveTo(px, y + h); ctx.lineTo(px, y + h * 0.4); ctx.lineTo(px + 40, y + h * 0.4); ctx.stroke();
      ctx.fillStyle = shade(col, 0.2); ctx.fillRect(px - 8, y + h * 0.6, 16, 6);
    }
    if ((d === 'junk' || d === 'ware') && r(6) < 0.35) gear(x + w * 0.5, y + h * 0.5, 34, now / 3000 * (r(7) < 0.5 ? 1 : -1), shade(col, 0.08));
    if (d === 'neon' && r(4) < 0.6) { // flackerndes Neonschild
      const on = true; ctx.strokeStyle = r(5) < 0.5 ? theme.edge : '#5ef2ff'; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.25; ctx.strokeRect(x + 12, y + 30, w - 24, 26); ctx.globalAlpha = 1;
    }
    if (d === 'garden') { ctx.fillStyle = '#2f7a4a'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 10 + i * (w - 20) / 3, y - 4, 12 + r(i + 30) * 8, Math.PI, 0); ctx.fill(); } }
    if (d === 'crystal') { ctx.fillStyle = shade(col, 0.25); for (let i = 0; i < 3; i++) { const cx = x + r(i + 40) * w; ctx.beginPath(); ctx.moveTo(cx - 10, y); ctx.lineTo(cx, y - 30 - r(i) * 30); ctx.lineTo(cx + 10, y); ctx.fill(); } }
  }
}
function gear(x, y, rad, a, col) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill();
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -rad - 8, 12, 12); }
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(0, 0, rad * 0.4, 0, 7); ctx.fill(); ctx.restore();
}
function drawBackdrop(now) {
  const fx = theme.fx;
  if (fx === 'stars') for (let i = 0; i < 80; i++) { ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(now / 900 + i * 7.3)); ctx.fillStyle = '#fff'; ctx.fillRect(hash(i) * VW, hash(i + 99) * VH * 0.6, 2, 2); }
  ctx.globalAlpha = 1;
  // Sonne / Mond mit Schein
  const sx = VW * 0.76, sy = 210, sg = ctx.createRadialGradient(sx, sy, 40, sx, sy, 320);
  sg.addColorStop(0, theme.sun); sg.addColorStop(0.25, theme.sun + '55'); sg.addColorStop(1, theme.sun + '00');
  ctx.fillStyle = sg; ctx.fillRect(sx - 320, sy - 320, 640, 640);
  ctx.fillStyle = theme.sun; ctx.beginPath(); ctx.arc(sx, sy, 86, 0, 7); ctx.fill();
  if (theme.deco === 'moon') { // Erde: Kontinente und Wolken, rechts im Schatten
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, 86, 0, 7); ctx.clip(); ctx.fillStyle = '#4fae5a';
    for (const [ex, ey, rx, ry, a] of [[-30, -20, 34, 22, 0.5], [20, 25, 26, 34, -0.3], [40, -40, 18, 12, 0.2], [-45, 40, 16, 10, 0]]) { ctx.beginPath(); ctx.ellipse(sx + ex, sy + ey, rx, ry, a, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; for (const [ex, ey, rx] of [[-10, -50, 30], [30, 0, 22], [-50, 10, 18]]) { ctx.beginPath(); ctx.ellipse(sx + ex, sy + ey, rx, 6, 0.2, 0, 7); ctx.fill(); }
    const sh = ctx.createLinearGradient(sx - 86, 0, sx + 86, 0); sh.addColorStop(0.45, 'rgba(5,6,12,0)'); sh.addColorStop(1, 'rgba(5,6,12,.75)'); ctx.fillStyle = sh; ctx.fillRect(sx - 90, sy - 90, 180, 180); ctx.restore();
  }
  // Wolken
  for (let i = 0; i < (theme.deco === 'moon' || theme.deco === 'space' ? 0 : 7); i++) { // keine Wolken auf Mond und im Weltall
    const cx = mod(hash(i) * 2400 - camX * 0.05 + now * 0.012 * (1 + hash(i + 9)), 2400) - 300, cy = 70 + hash(i + 3) * 240;
    ctx.fillStyle = theme.deco === 'lava' ? 'rgba(20,5,5,.25)' : 'rgba(255,255,255,.08)';
    for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(cx + j * 46, cy - (j % 2) * 18, 60, 30, 0, 0, 7); ctx.fill(); }
  }
  // Seilbahn: Seile mit fahrenden Gondeln
  if (theme.deco === 'rope') for (let k = 0; k < 2; k++) {
    const y0 = 150 + k * 90, sag = x => y0 + Math.sin((x / VW) * Math.PI) * 50;
    ctx.strokeStyle = 'rgba(20,30,35,.6)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = 0; x <= VW; x += 40) ctx.lineTo(x, sag(x)); ctx.stroke();
    for (let i = 0; i < 3; i++) { const gx = mod(now * (k ? -0.04 : 0.05) + i * 560 - camX * 0.1, VW + 200) - 100, gy = sag(gx); ctx.fillStyle = k ? '#c0392b' : '#f1c40f'; ctx.fillRect(gx - 1, gy, 2, 16); rr(gx - 16, gy + 14, 32, 24, 5); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(gx - 11, gy + 18, 22, 8); }
  }
  const layers = [[0.15, theme.far, 170, 380, 0.1, false], [0.4, theme.near, 120, 260, 0.08, true]];
  if (map.vert) {
    const fhT = map.fh * T, oy = VH / 2 - camY; // Bildschirm-y = Welt-y + oy
    for (const [f, col, , , lit, near] of layers) {
      const k0 = fl((map.floor * T - (camY + VH / 2)) / fhT) - 1, k1 = k0 + Math.ceil(VH / fhT) + 2, step = near ? 150 : 210;
      for (let k = k0; k <= k1; k++) {
        const base = map.floor * T - k * fhT + oy, room = fhT - T, o = camX * f + k * 173;
        for (let i = fl(o / step) - 1; i < (o + VW) / step + 1; i++) {
          const hs = hash(i * 3.1 + k * 7.7 + f * 100); if (hs < 0.3) continue;
          const h = room * (near ? 0.3 + hs * 0.35 : 0.5 + hs * 0.4), w = 60 + hs * 100;
          drawBld(i * step - o + hash(i + k * 5) * 50, base - h, w, h, col, i * 31 + k * 7 + f * 100, lit, near, now);
        }
      }
    }
  } else {
    for (const [f, col, bw, hh, lit, near] of layers) {
      const o = camX * f;
      for (let i = fl(o / bw) - 2; i < (o + VW) / bw + 1; i++) { const h = 120 + hash(i + f * 100) * hh; drawBld(i * bw - o, VH - 60 - h, bw - 8, h + 60, col, i + f * 100, lit, near, now); }
    }
  }
  // Dunst über dem Boden
  const hz = ctx.createLinearGradient(0, VH * 0.55, 0, VH); hz.addColorStop(0, 'rgba(0,0,0,0)'); hz.addColorStop(1, theme.sky[1] + '33');
  ctx.fillStyle = hz; ctx.fillRect(0, VH * 0.55, VW, VH * 0.45);
}
// Teilchen in der Luft (Schnee, Glut, Blätter, Glühwürmchen, Staub) – zustandslos aus der Zeit berechnet
function drawAmbient(now) {
  const fx = theme.fx, n = 46;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 1.7), h2 = hash(i * 3.1 + 5), sp = 0.5 + h2;
    if (fx === 'snow') { const x = mod(h1 * VW + Math.sin(now / 1100 + i) * 30 - camX * 0.3, VW), y = mod(h2 * VH + now * 0.05 * sp, VH); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + h2 * 2, 0, 7); ctx.fill(); }
    else if (fx === 'embers') { const x = mod(h1 * VW + Math.sin(now / 700 + i) * 20 - camX * 0.3, VW), y = VH - mod(h2 * VH + now * 0.07 * sp, VH); ctx.fillStyle = `rgba(255,${120 + fl(h1 * 100)},40,${0.4 + 0.5 * Math.abs(Math.sin(now / 200 + i))})`; ctx.fillRect(x, y, 3, 3); }
    else if (fx === 'leaves') { if (i > 22) break; const x = mod(h1 * VW + now * 0.03 * sp - camX * 0.4, VW), y = mod(h2 * VH + now * 0.04 * sp, VH); ctx.save(); ctx.translate(x, y); ctx.rotate(now / 600 * sp + i); ctx.fillStyle = i % 3 ? '#7cc85a' : '#c6e05e'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, 7); ctx.fill(); ctx.restore(); }
    else if (fx === 'flies') { if (i > 24) break; const x = mod(h1 * VW + Math.sin(now / 1500 * sp + i) * 60 - camX * 0.2, VW), y = 200 + h2 * 600 + Math.cos(now / 1300 * sp + i) * 40; ctx.fillStyle = `rgba(255,240,140,${0.3 + 0.6 * Math.abs(Math.sin(now / 400 + i))})`; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
    else if (fx === 'sand') { if (i > 36) break; const x = mod(h1 * VW + now * 0.09 * sp - camX * 0.3, VW), y = mod(h2 * VH + Math.sin(now / 900 + i) * 20, VH); ctx.fillStyle = 'rgba(255,224,170,.3)'; ctx.fillRect(x, y, 2 + h1 * 2, 1.5); }
    else if (fx === 'dust') { if (i > 30) break; const x = mod(h1 * VW + now * 0.012 * sp - camX * 0.25, VW), y = mod(h2 * VH + Math.sin(now / 2000 + i) * 40, VH); ctx.fillStyle = 'rgba(255,225,180,.22)'; ctx.beginPath(); ctx.arc(x, y, 1.5 + h1 * 2, 0, 7); ctx.fill(); }
  }
  // Regen (Dschungel)
  if (theme.rain) { ctx.strokeStyle = 'rgba(190,220,255,.32)'; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 110; i++) { const x = mod(hash(i * 2.3) * VW + now * 0.25 - camX * 0.6, VW), y = mod(hash(i * 5.1) * VH + now * 1.1, VH); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 22); } ctx.stroke(); }
  // Windstreifen
  { const w = windAt(now); if (Math.abs(w) > 0.1) { ctx.strokeStyle = `rgba(255,255,255,${0.12 + Math.abs(w) * 0.15})`; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 26; i++) { const x = mod(hash(i * 3.7) * VW + now * 1.4 * Math.sign(w), VW), y = hash(i * 9.1) * VH, len = 40 + hash(i) * 80; ctx.moveTo(x, y); ctx.lineTo(x - Math.sign(w) * len, y); } ctx.stroke(); } }
  // Vignette
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
}
const isAir = (tx, ty) => { const c = tile(tx, ty); return c === ' ' || c === '?' || c === 'T' || c === '>' || c === '<' || c === 'O' || c === '~'; };
function drawTile(c, tx, ty, x, y, now) {
  const d = theme.deco, h1 = hash(tx * 13.7 + ty * 71.3);
  if (c === '#' || c === 'H') {
    ctx.fillStyle = theme.tile; ctx.fillRect(x, y, T + 0.5, T + 0.5);
    ctx.fillStyle = `rgba(255,255,255,${0.012 + h1 * 0.03})`; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    if (d === 'ware' || d === 'junk' || d === 'rope' || d === 'space') { ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x + 4, y + 4, 3, 3); ctx.fillRect(x + T - 7, y + 4, 3, 3); ctx.fillRect(x + 4, y + T - 7, 3, 3); ctx.fillRect(x + T - 7, y + T - 7, 3, 3); }
    else if (d === 'ice') { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.beginPath(); ctx.moveTo(x + 4, y + T); ctx.lineTo(x + 14, y); ctx.lineTo(x + 20, y); ctx.lineTo(x + 10, y + T); ctx.fill(); }
    else { ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x + (ty % 2 ? 8 : 24), y, 2, 15); ctx.fillRect(x + (ty % 2 ? 24 : 8), y + 17, 2, 15); }
    const up = isAir(tx, ty - 1) && tile(tx, ty - 1) !== '=', dn = isAir(tx, ty + 1), lf = isAir(tx - 1, ty), rt = isAir(tx + 1, ty);
    ctx.fillStyle = theme.edge;
    ctx.globalAlpha = 0.55; if (lf) ctx.fillRect(x, y, 3, T); if (rt) ctx.fillRect(x + T - 3, y, 3, T); if (dn && c !== 'H') ctx.fillRect(x, y + T - 3, T + 0.5, 3); ctx.globalAlpha = 1;
    if (up) {
      ctx.globalAlpha = 0.14; ctx.fillRect(x, y - 7, T + 0.5, 7); ctx.globalAlpha = 1;
      ctx.fillRect(x, y, T + 0.5, 5); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x, y, T + 0.5, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + T - 1, y + 1, 1.5, 4);
      topDeco(d, tx, ty, x, y, h1, now);
    }
    if (c === 'H' && dn) {
      ctx.fillStyle = theme.hook; ctx.fillRect(x, y + T - 8, T + 0.5, 8); ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x + 12, y + T - 8, 8, 8);
      ctx.strokeStyle = theme.hook; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x + 16, y + T + 4, 4, 0, 7); ctx.stroke();
    } else if (dn && isAir(tx, ty + 2)) bottomDeco(d, tx, ty, x, y, h1, now);
  } else if (SLOPE[c]) {
    const f = SLOPE[c];
    ctx.fillStyle = theme.tile; ctx.beginPath(); ctx.moveTo(x, y + f(0)); ctx.lineTo(x + T + 0.5, y + f(T)); ctx.lineTo(x + T + 0.5, y + T + 0.5); ctx.lineTo(x, y + T + 0.5); ctx.fill();
    ctx.strokeStyle = theme.edge; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 0.5, y + f(0) + 2.5); ctx.lineTo(x + T + 0.5, y + f(T) + 2.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 0.5, y + f(0) + 0.8); ctx.lineTo(x + T + 0.5, y + f(T) + 0.8); ctx.stroke();
  } else if (c === '=') {
    ctx.fillStyle = theme.tile; ctx.fillRect(x, y, T + 0.5, 12); ctx.fillStyle = theme.edge; ctx.fillRect(x, y, T + 0.5, 4);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y, T, 1.5); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + T - 1, y + 4, 1.5, 8);
    if (mod(tx, 3) === 0) { ctx.fillStyle = theme.tile; ctx.beginPath(); ctx.moveTo(x + 6, y + 12); ctx.lineTo(x + 26, y + 12); ctx.lineTo(x + 16, y + 22); ctx.fill(); }
  } else if (c === '^') {
    ctx.fillStyle = '#3a3f4a'; ctx.fillRect(x, y + T - 5, T, 5);
    for (let i = 0; i < 2; i++) { const bx = x + i * 16; ctx.fillStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(bx, y + T - 4); ctx.lineTo(bx + 8, y + 8); ctx.lineTo(bx + 8, y + T - 4); ctx.fill(); ctx.fillStyle = '#aab3c2'; ctx.beginPath(); ctx.moveTo(bx + 8, y + 8); ctx.lineTo(bx + 16, y + T - 4); ctx.lineTo(bx + 8, y + T - 4); ctx.fill(); }
  } else if (c === 'O') {
    const cx = x + 16, cy = y + 16; ctx.save(); ctx.translate(cx, cy); ctx.rotate(now / 70);
    ctx.fillStyle = '#d6dde6'; ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); ctx.lineTo(Math.cos(a + 0.26) * 12, Math.sin(a + 0.26) * 12); } ctx.fill();
    ctx.fillStyle = '#9aa4b2'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#e8454f'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-1, -14, 2, 8); ctx.restore();
    if (!isAir(tx, ty + 1)) { ctx.fillStyle = '#2b2f38'; ctx.fillRect(x + 4, y + T - 6, T - 8, 6); }
  } else if (c === '~') {
    const hot = d === 'lava' || d === 'junk' || d === 'ware' || d === 'desert' || d === 'mars', top = y + 8 + Math.sin(now / 300 + tx) * 2;
    const lg = ctx.createLinearGradient(0, top, 0, y + T); lg.addColorStop(0, hot ? '#ffcf4a' : '#c8ff6a'); lg.addColorStop(1, hot ? '#e2401c' : '#2f9e3a');
    ctx.fillStyle = lg; ctx.fillRect(x, top, T + 0.5, y + T - top);
    const k = (now / 900 + h1) % 1; ctx.fillStyle = hot ? 'rgba(255,240,180,.8)' : 'rgba(230,255,200,.8)'; ctx.beginPath(); ctx.arc(x + 8 + h1 * 16, top + 14 - k * 14, 2 + k * 3, 0, 7); ctx.fill();
    ctx.fillStyle = hot ? 'rgba(255,140,40,.18)' : 'rgba(150,255,90,.15)'; ctx.fillRect(x, top - 26, T + 0.5, 26);
  } else if (c === '>' || c === '<') { // Boostfeld: cyan leuchtende Bodenplatte, darüber ein schwebender Doppelpfeil in Laufrichtung
    if (c === '<') { ctx.save(); ctx.translate(x * 2 + T, 0); ctx.scale(-1, 1); } // nach links: gespiegelt
    const pulse = 0.5 + 0.5 * Math.sin(now / 180 + tx), by = y + T;
    const gl = ctx.createRadialGradient(x + 16, by - 4, 2, x + 16, by - 4, 30); gl.addColorStop(0, `rgba(62,240,255,${0.35 + 0.2 * pulse})`); gl.addColorStop(1, 'rgba(62,240,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(x - 14, by - 34, T + 28, 40);
    ctx.fillStyle = '#0b1f27'; path(x, by - 8, T, 8, 3); ctx.fill();
    ctx.fillStyle = `rgba(120,248,255,${0.75 + 0.25 * pulse})`; path(x + 3, by - 6, T - 6, 3, 1.5); ctx.fill();
    const o = ((now / 9) % 10) - 5, cy = by - 20 - Math.sin(now / 260 + tx) * 1.5;
    for (const [w, col] of [[7, 'rgba(62,240,255,.35)'], [4, '#3ef0ff'], [1.6, '#ffffff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      for (const dx of [0, 10]) { ctx.moveTo(x + 7 + dx + o, cy - 7); ctx.lineTo(x + 14 + dx + o, cy); ctx.lineTo(x + 7 + dx + o, cy + 7); }
      ctx.stroke();
    }
    if (c === '<') ctx.restore();
  } else if (c === 'T') {
    ctx.fillStyle = '#2b2f38'; rr(x + 2, y + T - 5, T - 4, 5, 2);
    ctx.strokeStyle = '#c7ced8'; ctx.lineWidth = 2.5; ctx.beginPath(); for (let i = 0; i <= 5; i++) ctx.lineTo(x + 8 + (i % 2) * 16, y + T - 6 - i * 2.4); ctx.stroke();
    ctx.fillStyle = '#5be37d'; rr(x - 3, y + T - 24, T + 6, 9, 4.5); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x + 2, y + T - 22, T - 8, 2);
    ctx.fillStyle = `rgba(125,255,176,${0.25 + 0.2 * Math.sin(now / 200 + tx)})`; ctx.fillRect(x + 6, y + T - 34, 3, 6); ctx.fillRect(x + 15, y + T - 38, 3, 8); ctx.fillRect(x + 24, y + T - 34, 3, 6);
  } else if (c === '?') {
    const b = boxAt(tx, ty);
    if (b && now >= b.t) {
      // Item-Kugel: schwebende Glaskugel mit drehendem Stern (bewusst kein „?“-Block)
      const cx = x + 16, cy = y + 16 + Math.sin(now / 300 + tx) * 3, a = now / 600 + tx;
      ctx.fillStyle = 'rgba(125,240,255,.14)'; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill();
      const gl = ctx.createRadialGradient(cx - 4, cy - 5, 2, cx, cy, 14); gl.addColorStop(0, '#e9fdff'); gl.addColorStop(0.45, '#7de3f2'); gl.addColorStop(1, '#3a62c9');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.stroke();
      { const ks = Object.keys(ITEMS), it = ks[fl(now / 450 + tx * 1.7) % ks.length]; ctx.globalAlpha = 0.9; ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ITEMS[it], cx, cy + 1); ctx.globalAlpha = 1; } // Inhalt wechselt: zufällig
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(cx - 5, cy - 7, 3.5, 2, -0.6, 0, 7); ctx.fill();
    }
  }
}
function topDeco(d, tx, ty, x, y, h1, now) {
  if (d === 'garden' || d === 'jungle') {
    if (h1 < 0.5) { ctx.fillStyle = d === 'jungle' ? '#4fae4a' : '#5bd17a'; for (let i = 0; i < 3; i++) { const gx = x + 4 + i * 10 + h1 * 6, sw = Math.sin(now / 500 + tx + i) * 2; ctx.beginPath(); ctx.moveTo(gx - 3, y); ctx.lineTo(gx + sw, y - 7 - i % 2 * 3); ctx.lineTo(gx + 3, y); ctx.fill(); } }
    if (h1 < 0.1) { ctx.fillStyle = '#3c8a3f'; ctx.fillRect(x + 15, y - 12, 2, 12); ctx.fillStyle = ['#ff6fb5', '#ffd23f', '#fff', '#ff8a3f'][fl(h1 * 40) % 4]; ctx.beginPath(); ctx.arc(x + 16, y - 13, 4, 0, 7); ctx.fill(); }
  } else if (d === 'ice') { ctx.fillStyle = '#f2fbff'; ctx.beginPath(); ctx.ellipse(x + 16, y + 1, 18, 5 + h1 * 3, 0, Math.PI, 0); ctx.fill(); }
  else if (d === 'lava') { if (h1 < 0.35) { ctx.strokeStyle = `rgba(255,${100 + fl(h1 * 200)},40,${0.4 + 0.4 * Math.sin(now / 350 + tx)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x + 10, y + 22); ctx.stroke(); } }
  else if (d === 'crystal') { if (h1 < 0.22) { ctx.fillStyle = h1 < 0.11 ? '#f39cff' : '#8fe3ff'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 12, y - 16); ctx.lineTo(x + 16, y); ctx.moveTo(x + 14, y); ctx.lineTo(x + 20, y - 10); ctx.lineTo(x + 24, y); ctx.fill(); ctx.globalAlpha = 1; } }
  else if (d === 'desert') { if (h1 < 0.05) { ctx.fillStyle = '#4f8a3c'; ctx.fillRect(x + 14, y - 16, 5, 16); ctx.fillRect(x + 9, y - 11, 5, 3); ctx.fillRect(x + 9, y - 14, 3, 5); } else if (h1 < 0.1) { ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(x + 16, y - 2, 6, 3, 0, Math.PI, 0); ctx.fill(); } }
  else if (d === 'moon') { if (h1 < 0.14) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 8 + h1 * 90, y + 3, 5 + h1 * 20, 2.5, 0, 0, 7); ctx.fill(); } }
  else if (d === 'mars') { if (h1 < 0.12) { ctx.fillStyle = '#5a2418'; ctx.beginPath(); ctx.ellipse(x + 8 + h1 * 90, y - 1, 4 + h1 * 20, 3, 0, Math.PI, 0); ctx.fill(); } }
  else if (d === 'neon') { if (h1 < 0.08) { ctx.fillStyle = `rgba(94,242,255,${0.6 + 0.4 * Math.sin(now / 150 + tx)})`; ctx.fillRect(x + 6, y - 4, 20, 3); } }
  else if (d === 'ware' || d === 'junk' || d === 'rope') {
    if (h1 < 0.05) { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x + 6, y - 16, 18, 16); ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 2; ctx.strokeRect(x + 6, y - 16, 18, 16); ctx.beginPath(); ctx.moveTo(x + 6, y - 16); ctx.lineTo(x + 24, y); ctx.stroke(); }
    else if (h1 < 0.09) { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(x + 10, y); ctx.lineTo(x + 16, y - 16); ctx.lineTo(x + 22, y); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x + 13, y - 8, 6, 3); }
    else if (h1 < 0.12 && d !== 'ware') { ctx.fillStyle = '#1e1e1e'; ctx.beginPath(); ctx.arc(x + 16, y - 9, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(x + 16, y - 9, 4, 0, 7); ctx.fill(); }
  }
}
function bottomDeco(d, tx, ty, x, y, h1, now) {
  const yb = y + T;
  if (d === 'ice') { if (h1 < 0.6) { ctx.fillStyle = 'rgba(220,245,255,.85)'; ctx.beginPath(); ctx.moveTo(x + 4 + h1 * 10, yb); ctx.lineTo(x + 8 + h1 * 10, yb + 8 + h1 * 22); ctx.lineTo(x + 12 + h1 * 10, yb); ctx.fill(); } return; }
  if (d === 'jungle' || d === 'garden') {
    if (h1 < 0.3) { const len = 30 + h1 * 120, sw = Math.sin(now / 800 + tx) * 6; ctx.strokeStyle = '#3c8a3f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + 16, yb); ctx.quadraticCurveTo(x + 16 + sw, yb + len / 2, x + 16 + sw * 1.5, yb + len); ctx.stroke(); ctx.fillStyle = '#5bd17a'; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + 16 + sw * k / 3 + (k % 2 ? 4 : -4), yb + len * k / 4, 5, 2.5, k % 2 ? 0.6 : -0.6, 0, 7); ctx.fill(); } }
    return;
  }
  if (d === 'desert' || d === 'mars' || d === 'moon') return;
  if (mod(tx, 7) !== 3) return;
  // Hängelampe mit Lichtkegel
  ctx.fillStyle = '#111'; ctx.fillRect(x + 15, yb, 2, 10);
  const lc = d === 'crystal' ? '#e9b8ff' : d === 'neon' ? '#9ff3ff' : '#ffd38a';
  const cone = ctx.createLinearGradient(0, yb + 14, 0, yb + 190); cone.addColorStop(0, lc + '40'); cone.addColorStop(1, lc + '00');
  ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(x + 6, yb + 16); ctx.lineTo(x + 26, yb + 16); ctx.lineTo(x + 70, yb + 190); ctx.lineTo(x - 38, yb + 190); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.moveTo(x + 8, yb + 16); ctx.lineTo(x + 12, yb + 9); ctx.lineTo(x + 20, yb + 9); ctx.lineTo(x + 24, yb + 16); ctx.fill();
  ctx.fillStyle = lc; ctx.fillRect(x + 7, yb + 15, 18, 4);
}
// Tanz-Vorschau (Adresse mit ?taenze): alle Siegertänze groß nebeneinander
const GALLERY = POSES_ON && /[?&]taenze/.test(location.search);
if (GALLERY) for (const id of ["menu", "lobby"]) document.getElementById(id).style.display = "none";
function drawGallery(now) {
  ctx.fillStyle = 'rgba(25,10,4,.92)'; ctx.fillRect(0, 0, VW, VH);
  text('Siegerfeier', VW / 2, 70, 56, '#ffd23f');
  DANCES.forEach((n, i) => {
    const x = 200 + (i % 3) * 600 - (i % 3) * 0, cx = 270 + (i % 3) * 530, cy = i < 3 ? 400 : 800;
    ctx.fillStyle = 'rgba(255,195,31,.12)'; rr(cx - 220, cy - 300, 440, 330, 24);
    ctx.save(); ctx.translate(cx, cy + 15); ctx.scale(5, 5); drawRunner(0, 0, 0, 0, 1, COLORS[i], now, false, false, i); ctx.restore();
    text(n, cx, cy - 270, 34, '#fff1d6');
  });
}
// Große Figuren am Bildrand des Startbildschirms (rennen, springen, fuchteln, liegen benommen)
const HEROES = [[230, 330, 4, 1, 1, 0.9], [420, 470, 1, 1, 1, 0.8], [270, 790, 0, 0, 1, 1.25], [1380, 330, 5, 0, -1, 0.9], [1190, 530, 3, 1, -1, 0.9], [1430, 640, 6, 4, -1, 0.85]];
function drawHeroes(now) {
  for (const [x, y, c, st, face, sc] of HEROES) {
    const bob = 0; // Figuren stehen still im Bild
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(sc * 3, sc * 3);
    drawRunner(0, 0, st === 4 ? 0 : 160, st, face, COLORS[c], 1000 + c * 300, false, false); // feste Pose
    ctx.restore();
    if (st === 4) for (let i = 0; i < 3; i++) { const a = now / 300 + i * 2.1; text('★', x + Math.cos(a) * 50, y - 120 + Math.sin(a) * 14, 26, '#ffd23f', 'center', false); }
    if (st === 0) for (let i = 0; i < 3; i++) { const k = (now / 500 + i / 3) % 1; ctx.fillStyle = 'rgba(255,240,220,' + (0.7 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(x - 70 * face - k * 60 * face, y - 10 - k * 20, 10 + k * 14, 0, 7); ctx.fill(); }
  }
}
// Menü-Hintergrund: eine Demo-Strecke, auf der bunte Läufer rennen und hüpfen
let demo = null;
function stepDemo(dt) {
  if (!demo) demo = { map: build([['flat', 30], 'hurdles', ['flat', 16], 'stairs', ['flat', 24], 'items', 'hurdles', ['flat', 20]]), cam: START_X, rs: COLORS.slice(0, 8).map((c, i) => ({ c, x: START_X + (i - 4) * 150, y: F * T, vy: 0, g: true, sp: 330 + i * 17 % 70, d: (i * 3) % 6 })) };
  return; // Menü-Hintergrund steht still: keine Kamerafahrt, keine kleinen Läufer
  for (const r of demo.rs) {
    const tx = fl(r.x / T), ty = fl((r.y - 1) / T);
    if (r.g) { let blk = false; for (let k = 1; k <= 3; k++) { const c = tile(tx + k, ty); if (c === '#' || c === '^') blk = true; } if (blk || Math.random() < dt * 0.5) { r.vy = -820; r.g = false; } }
    r.x += r.sp * dt; if (hitRect(r.x - 11, r.y - 40, 22, 40)) r.x -= r.sp * dt;
    r.vy += 2400 * dt; r.y += r.vy * dt;
    if (r.vy > 0 && hitRect(r.x - 11, r.y - 2, 22, 2)) { r.y = fl(r.y / T) * T; r.vy = 0; r.g = true; }
    if (r.x < demo.cam - VW / 2 - 80) { r.x = demo.cam + VW / 2 + 40; r.y = F * T - 220; r.g = false; }
    if (r.x > demo.cam + VW / 2 + 120) r.x = demo.cam - VW / 2 - 40;
  }
}
const INK2 = '#2a1206', GOLD = '#ffc31f', CREAM = '#fff1d6';
if (document.fonts && document.fonts.load) document.fonts.load('30px "Lilita One"').catch(() => { });
function text(s, x, y, size, col, align = 'center', stroke = true) {
  ctx.font = `400 ${size}px "Lilita One",system-ui,sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 4.5); ctx.strokeStyle = INK2; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y + 1); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function path(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
// Tafel wie im Menü: dunkles Braun, Goldrand, dunkle Außenkante, Schatten
function panel(x, y, w, h, r = 14, border = GOLD) {
  ctx.fillStyle = 'rgba(20,6,0,.35)'; path(x, y + 6, w, h, r); ctx.fill();
  ctx.fillStyle = INK2; path(x - 3, y - 3, w + 6, h + 6, r + 3); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#4a2410'); gr.addColorStop(1, '#2c1306');
  ctx.fillStyle = gr; path(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 3.5; path(x + 2, y + 2, w - 4, h - 4, r - 2); ctx.stroke();
}
// gelbe Plakette wie der Start-Knopf
function goldPill(x, y, w, h) {
  ctx.fillStyle = 'rgba(20,6,0,.35)'; path(x, y + 5, w, h, h / 2); ctx.fill();
  ctx.fillStyle = INK2; path(x - 3, y - 3, w + 6, h + 6, h / 2 + 3); ctx.fill();
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffe56a'); gr.addColorStop(0.5, '#ffc31f'); gr.addColorStop(1, '#ff9a0e');
  ctx.fillStyle = gr; path(x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; path(x + h / 2, y + 4, w - h, h * 0.22, h * 0.11); ctx.fill();
}
let lastCount = 4;
function render(now, dt, menu = false) {
  ctx = mainCtx;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
  // Im Menü füllt die Szene den ganzen Bildschirm (cover), im Spiel wird eingepasst (contain)
  const sc = menu ? Math.max(cv.width / VW, cv.height / VH) : scale;
  ctx.setTransform(sc, 0, 0, sc, (cv.width - VW * sc) / 2, (cv.height - VH * sc) / 2);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, theme.sky[0]); g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  drawBackdrop(now);
  // Levelende (waagerechte Strecken): links von kx ist alles zerfallen, auch Himmel und Hintergrund – nur noch Leere
  const dissolve = !solo && !map.vert && cutX > -1e8, kx = dissolve ? cutX : -1e9;
  if (dissolve) {
    const sc = VW / 2 + (kx - camX) * zoom;
    if (sc > -60) {
      ctx.fillStyle = '#05030c'; ctx.fillRect(0, 0, Math.max(0, sc), VH);
      const gg = ctx.createLinearGradient(sc, 0, sc + 70, 0); gg.addColorStop(0, 'rgba(5,3,12,.85)'); gg.addColorStop(1, 'rgba(5,3,12,0)');
      ctx.fillStyle = gg; ctx.fillRect(sc, 0, 70, VH);
    }
  }
  shake = Math.max(0, shake - dt * 40);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  ctx.translate(VW / 2 + sx, VH / 2 + sy); ctx.scale(zoom, zoom); ctx.translate(-camX, -camY);
  if (dissolve) {
    // Hintergrund zerbröselt an der Kante über die ganze Bildhöhe
    const bgc = [theme.far, theme.near, theme.sky[0], theme.sky[1]];
    for (let i = 0; i < 7; i++) parts.push({ x: kx + Math.random() * 30, y: camY - VH / 2 + Math.random() * VH, vx: -40 - Math.random() * 150, vy: -20 - Math.random() * 90, l: 0.6 + Math.random() * 0.9, c: bgc[fl(Math.random() * 4)], s: 5 + Math.random() * 9 });
    // Spielfelder zerfallen an der Kante
    for (let i = 0; i < 6; i++) {
      const ty = fl(Math.random() * MH), tx = fl((kx + Math.random() * T * 1.5) / T), c = tile(tx, ty);
      if (c !== ' ' && c !== '?') parts.push({ x: tx * T + Math.random() * T, y: ty * T + Math.random() * T, vx: -60 - Math.random() * 180, vy: -30 - Math.random() * 140, l: 0.5 + Math.random() * 0.8, c: Math.random() < 0.55 ? theme.edge : theme.hook, s: 3 + Math.random() * 6 });
    }
  }
  const tx0 = map.vert ? Math.max(0, fl((camX - VW / 2) / T) - 1) : fl((camX - VW / 2) / T) - 1, tx1 = map.vert ? Math.min(map.W - 1, tx0 + VW / T + 3) : tx0 + VW / T + 3;
  const ty0 = map.vert ? fl((camY - VH / 2) / T) - 1 : 0, ty1 = map.vert ? ty0 + VH / T + 3 : MH - 1;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const c = tile(tx, ty); if (c === ' ') continue;
    const x = tx * T, y = ty * T;
    if (x + T <= kx) continue;
    const fade = x < kx + T * 2; if (fade) { ctx.save(); ctx.globalAlpha = clamp((x + T - kx) / (T * 3), 0.15, 1); ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4); }
    drawTile(c, tx, ty, x, y, now);
    if (fade) ctx.restore();
  }
  // Neon-Pfeilschilder (Etagen-Maps): ruhig leuchtend, Pfeil nach oben, „HOCH“
  if (map.vert && map.signs) for (const s of map.signs) {
    const rowsT = map.H * T, wx = s.x * T, base = s.y * T, n = Math.round((camY - base) / rowsT), wy = base + n * rowsT;
    if (Math.abs(wy - camY) > VH || wy > map.floor * T) continue; // nicht unter der untersten Etage im Boden
    const p = 0.85 + 0.15 * Math.sin(now / 400), bob = Math.sin(now / 300) * 3;
    ctx.fillStyle = 'rgba(8,10,18,.82)'; path(wx - 28, wy - 40, 56, 76, 10); ctx.fill();
    for (const [w, col] of [[9, `rgba(93,255,138,${0.18 * p})`], [3.5, `rgba(93,255,138,${p})`]]) { ctx.strokeStyle = col; ctx.lineWidth = w; path(wx - 28, wy - 40, 56, 76, 10); ctx.stroke(); }
    for (const [w, col] of [[11, `rgba(93,255,138,${0.25 * p})`], [6, `rgba(93,255,138,${p})`], [2, '#eafff0']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(wx, wy + 14 + bob); ctx.lineTo(wx, wy - 26 + bob); ctx.moveTo(wx - 13, wy - 13 + bob); ctx.lineTo(wx, wy - 26 + bob); ctx.lineTo(wx + 13, wy - 13 + bob); ctx.stroke();
    }
    text('HOCH', wx, wy + 26, 13, '#eafff0', 'center', false);
  }
  // Kisten, Raketen
  for (const s of snowballs) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#cfe9f7'; ctx.beginPath(); ctx.arc(s.x + 2.5, s.y + 3, 5, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(120,170,200,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, 7); ctx.stroke(); }
  if (me.alive && me.slow > 0) { for (let i = 0; i < 6; i++) { const a = performance.now() / 300 + i; ctx.fillStyle = 'rgba(230,245,255,.85)'; ctx.beginPath(); ctx.arc(me.x + Math.cos(a) * 18, me.y - 24 + Math.sin(a * 1.3) * 18, 2.5, 0, 7); ctx.fill(); } }
  for (const c of crates) { ctx.fillStyle = '#b5773a'; rr(c.x - 17, c.y - 34, 34, 34, 4); ctx.strokeStyle = '#6e4218'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(c.x - 12, c.y - 29); ctx.lineTo(c.x + 12, c.y - 5); ctx.moveTo(c.x + 12, c.y - 29); ctx.lineTo(c.x - 12, c.y - 5); ctx.stroke(); }
  for (const r of rockets) { ctx.save(); ctx.translate(r.x, r.y); ctx.scale(r.d, 1); ctx.fillStyle = '#f2f2f2'; rr(-14, -6, 24, 12, 5); ctx.fillStyle = '#ff4d5a'; ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(20, 0); ctx.lineTo(10, 6); ctx.fill(); ctx.restore(); }
  // Menü-Läufer
  if (menu && false) for (const r of demo.rs) drawRunner(r.x, r.y, r.sp, r.g ? 0 : 1, 1, r.c, now, false, false);
  if (!menu) drawGhost(now);
  // Mitspieler
  for (const [id, r] of remotes) {
    if (!r.alive || menu) continue; const p = interp(r, now); if (!p) continue;
    r.rx = p.x; r.ry = p.y; const s = p.s;
    if (s[4] === 3) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y - 24); ctx.lineTo(s[6], s[7]); ctx.stroke(); }
    drawRunner(p.x, p.y, s[2], s[4], s[5], COLORS[r.color], now, false, s[8], cele && cele.id === id ? cele.dance : -1);
    text(r.name, p.x, p.y - 58, 17, COLORS[r.color]);
  }
  // Wurfbahn: wohin der Schneeball fliegt (gleiche Physik wie beim Wurf)
  if (me.alive && !menu && me.item === 'snow' && !(me.roll > 0)) {
    let x = me.x + me.face * 18, y = me.y - 34, vx = me.face * 950 + me.vx * 0.5, vy = -420; const gr = 1500 * (theme.grav || 1), dt = 1 / 60;
    ctx.fillStyle = 'rgba(230,245,255,.85)';
    for (let i = 0; i < 100; i++) { vy += gr * dt; x += vx * dt; y += vy * dt; if (solid(fl(x / T), fl(y / T))) { ctx.strokeStyle = 'rgba(230,245,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 7, y - 7); ctx.lineTo(x + 7, y + 7); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x - 7, y + 7); ctx.stroke(); break; } if (i % 4 === 0) { ctx.beginPath(); ctx.arc(x, y, 3.2 - i / 60, 0, 7); ctx.fill(); } }
  }
  // Speed-Linien hinter dem eigenen Läufer bei hohem Tempo
  if (me.alive && !menu && (Math.abs(me.vx) > 720 || me.boosting)) {
    const a = clamp((Math.abs(me.vx) - 600) / 500, 0.25, 0.8), sd = -Math.sign(me.vx || me.face);
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const h = hash(fl(now / 45) * 7 + i), yy = me.y - 8 - h * 36, x0 = me.x + sd * (18 + h * 10), len = 30 + h * 60; ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + sd * len, yy); ctx.stroke(); }
  }
  // Hakenziel anzeigen
  if (me.alive && !menu && !me.hook && now >= goAt) { const hp = findHook(me); if (hp) { const k = 0.6 + 0.4 * Math.sin(now / 120); ctx.strokeStyle = theme.hook; ctx.globalAlpha = k; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hp.x, hp.y, 9, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(hp.x - 14, hp.y); ctx.lineTo(hp.x - 5, hp.y); ctx.moveTo(hp.x + 5, hp.y); ctx.lineTo(hp.x + 14, hp.y); ctx.stroke(); ctx.globalAlpha = 1; } }
  if (me.alive && !menu) {
    if (me.hook) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(me.x, me.y - 24); ctx.lineTo(me.hook.ax, me.hook.ay); ctx.stroke(); ctx.fillStyle = theme.hook; ctx.beginPath(); ctx.arc(me.hook.ax, me.hook.ay, 6, 0, 7); ctx.fill(); }
    else if (me.miss > 0) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(me.x, me.y - 24); ctx.lineTo(me.x + me.face * 90, me.y - 114); ctx.stroke(); }
    const mc = lobby ? COLORS[(lobby.ps.find(p => p.id === myId) || { c: 0 }).c] : COLORS[0];
    drawRunner(me.x, me.y, me.vx, myState(), me.face, mc, now, me.inv > 0 && me.stun <= 0, me.boosting, cele && cele.id === myId ? cele.dance : -1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(me.x - 7, me.y - 62); ctx.lineTo(me.x + 7, me.y - 62); ctx.lineTo(me.x, me.y - 52); ctx.fill();
  }
  // Name des Siegertanzes und Noten
  if (POSES_ON && cele && !menu && now - cele.t0 > 400) { const wp = posOf(cele.id); if (wp) {
    text('♪ ' + DANCES[cele.dance] + ' ♪', wp.x, wp.y - 84, 15, '#ffd23f');
    for (let i = 0; i < 4; i++) { const k = ((now - cele.t0) / 1400 + i / 4) % 1; ctx.globalAlpha = 1 - k; text(i % 2 ? '♪' : '♫', wp.x + Math.sin(k * 6 + i) * 30 + (i - 1.5) * 16, wp.y - 50 - k * 50, 14, COLORS[(i * 3) % COLORS.length], 'center', false); }
    ctx.globalAlpha = 1; } }
  for (const p of parts) { ctx.globalAlpha = clamp(p.l * 3, 0, 1); ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
  ctx.globalAlpha = 1;
  for (const f of fx) {
    const k = f.t / 0.35;
    if (f.k === 'ring') { ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 10 * (1 - k) + 2; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * k, 0, 7); ctx.stroke(); }
    else { const a = posOf(f.a), b = posOf(f.b); if (a && b) { ctx.strokeStyle = `rgba(125,249,255,${1 - k})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
  }
  // Steigendes Wasser (vertikale Türme)
  if (map.vert && !solo) {
    const wy = kill, x0 = -40, x1 = map.W * T + 40, surf = x => wy + Math.sin(x / 70 + now / 280) * 7 + Math.sin(x / 23 - now / 190) * 3;
    ctx.beginPath(); ctx.moveTo(x0, wy + 3000); for (let x = x0; x <= x1; x += 32) ctx.lineTo(x, surf(x)); ctx.lineTo(x1, wy + 3000); ctx.closePath();
    ctx.fillStyle = 'rgba(30,120,255,.45)'; ctx.fill();
    ctx.beginPath(); for (let x = x0; x <= x1; x += 32) ctx.lineTo(x, surf(x)); ctx.strokeStyle = 'rgba(200,240,255,.85)'; ctx.lineWidth = 4; ctx.stroke();
    if (Math.random() < 0.6) parts.push({ x: Math.random() * x1, y: wy + 20 + Math.random() * 300, vx: 0, vy: -60 - Math.random() * 60, l: 0.9, c: 'rgba(200,240,255,.7)', s: 4 });
  }
  ctx.restore();
  if (menu) drawHeroes(now);
  drawAmbient(now);
  if (GALLERY) drawGallery(now);
  if (menu) return;
  if (FX.on && FX.ok) { // HUD auf die eigene Ebene zeichnen
    if (hud.width !== cv.width || hud.height !== cv.height) { hud.width = cv.width; hud.height = cv.height; }
    hudCtx.setTransform(1, 0, 0, 1, 0, 0); hudCtx.clearRect(0, 0, hud.width, hud.height);
    ctx = hudCtx; ctx.setTransform(scale, 0, 0, scale, offX, offY);
  }
  // ------------------------------------------------ HUD
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  if (me.alive && !solo && !cele) {
    if (map.vert) { const d = kill - me.y; if (d < 260) { const a = clamp(1 - d / 260, 0, 1) * 0.5; const gg = ctx.createLinearGradient(0, VH, 0, VH - 300); gg.addColorStop(0, `rgba(30,120,255,${a})`); gg.addColorStop(1, 'rgba(30,120,255,0)'); ctx.fillStyle = gg; ctx.fillRect(0, VH - 300, VW, 300); } }
    else { const d = me.x - (camX - Math.min(kill, 800)); if (d < 260) { const a = clamp(1 - d / 260, 0, 1) * 0.5; const gg = ctx.createLinearGradient(0, 0, 300, 0); gg.addColorStop(0, `rgba(5,3,12,${a + 0.2})`); gg.addColorStop(1, 'rgba(5,3,12,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, 300, VH); } }
  }
  if (lobby) {
    // Spielerliste oben links
    const many = lobby.ps.length > 8, rh = many ? 24 : 32, fs = many ? 16 : 20;
    ctx.font = `400 ${fs}px "Lilita One",system-ui`; let nw = 0; for (const p of lobby.ps) nw = Math.max(nw, ctx.measureText(p.name).width);
    const pw = 70 + nw + 70; panel(16, 14, pw, lobby.ps.length * rh + 14, 14);
    let y = 21 + rh / 2;
    for (const p of lobby.ps) {
      const alive = p.id === myId ? me.alive : (remotes.get(p.id) || {}).alive;
      ctx.globalAlpha = alive ? 1 : 0.4;
      ctx.fillStyle = INK2; path(28, y - rh / 2 + 3, rh - 6, rh - 6, 6); ctx.fill(); ctx.fillStyle = COLORS[p.c]; path(30, y - rh / 2 + 5, rh - 10, rh - 10, 5); ctx.fill();
      text(p.name, 34 + rh, y, fs, p.id === myId ? '#ffe56a' : CREAM, 'left');
      for (let i = 0; i < 3; i++) { const cx = 16 + pw - 56 + i * 18; ctx.fillStyle = INK2; ctx.beginPath(); ctx.arc(cx, y, 7.5, 0, 7); ctx.fill(); ctx.fillStyle = i < p.sc ? GOLD : '#5a3a26'; ctx.beginPath(); ctx.arc(cx, y, 5.5, 0, 7); ctx.fill(); }
      y += rh;
    }
    ctx.globalAlpha = 1;
    // Titel und Meter oben in der Mitte
    const title = solo ? 'Solo-Training · Link teilen, um Mitspieler zu holen' : `Runde ${roundNo} · ${theme.name}`;
    ctx.font = '400 20px "Lilita One",system-ui'; const tw = ctx.measureText(title).width + 40;
    panel(VW / 2 - tw / 2, 12, tw, 36, 12); text(title, VW / 2, 31, 20, CREAM);
    if (me.alive) { const mt = Math.max(0, Math.round(progress(me.x, me.y))) + ' m'; goldPill(VW / 2 - 70, 58, 140, 40); text(mt, VW / 2, 79, 28, INK2, 'center', false); const rec = bestOf(curMap), cur = run ? run.best : 0; if (rec > 0 || cur > 0) text(cur > rec ? 'Rekord!' : 'Rekord ' + rec + ' m', VW / 2, 114, 16, cur > rec ? '#7dffb0' : CREAM); }
  }
  { const w = windAt(now); if (Math.abs(w) > 0.15) { panel(VW - 210, 70, 180, 40, 12); text((w > 0 ? 'WIND →' : '← WIND'), VW - 120, 90, 22, '#bfe9ff'); } }
  if (me.alive) {
    // Item-Fach unten links
    const sx = 26, sy = VH - 116; panel(sx, sy, 92, 92, 18, me.item ? GOLD : '#8a5a35');
    ctx.fillStyle = 'rgba(0,0,0,.35)'; path(sx + 10, sy + 10, 72, 72, 12); ctx.fill();
    if (me.item) {
      const ks = Object.keys(ITEMS), rolling = me.roll > 0, show = rolling ? ks[fl(now / 70) % ks.length] : me.item;
      ctx.font = '50px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(ITEMS[show], sx + 46, sy + 49);
      text(rolling ? 'Wird ausgelost …' : ITEM_NAMES[me.item], sx + 112, sy + 18, 24, rolling ? CREAM : '#ffe56a', 'left');
      if (!rolling) text('Taste K', sx + 112, sy + 44, 15, CREAM, 'left');
    }
    // Boost-Leiste
    const bx = sx + 112, by = VH - 56, bw = 280, bh = 30; panel(bx, by, bw, bh, 15);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; path(bx + 6, by + 6, bw - 12, bh - 12, 9); ctx.fill();
    const fw = Math.max(0, (bw - 12) * me.boost);
    if (fw > 4) { const gr = ctx.createLinearGradient(0, by + 6, 0, by + bh - 6); if (me.turbo > 0) { gr.addColorStop(0, '#c9fbff'); gr.addColorStop(1, '#3fc7e0'); } else { gr.addColorStop(0, '#ffe56a'); gr.addColorStop(1, '#ff8a0e'); } ctx.fillStyle = gr; path(bx + 6, by + 6, fw, bh - 12, 9); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; path(bx + 10, by + 8, Math.max(0, fw - 8), 4, 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; for (let i = 1; i < 5; i++) { const lx = bx + 6 + (bw - 12) * i / 5; ctx.beginPath(); ctx.moveTo(lx, by + 7); ctx.lineTo(lx, by + bh - 7); ctx.stroke(); }
    text(me.boost < 0.05 && !me.turbo ? 'BOOST LÄDT …' : 'BOOST · L', bx + bw / 2, by + bh / 2, 16, CREAM);
  }
  const cd = (goAt - now) / 1000;
  if (cd > 0 && cd < 3.2) { const n = Math.ceil(cd); if (n !== lastCount) { lastCount = n; beep(440, 0.12, 'square', 0.06); } text(String(n), VW / 2, VH / 2 - 60, 220 - (n - cd) * 60, '#ffd23f'); }
  else if (cd <= 0 && cd > -0.8) { if (lastCount !== 0) { lastCount = 0; beep(880, 0.4, 'square', 0.07); } text('LOS!', VW / 2, VH / 2 - 60, 200, '#7dffb0'); }
  // Banner oben, damit der Siegertanz in der Bildmitte zu sehen ist
  if (banner && now < banner.until) { // Banner: rotes Band wie im Logo, darunter eine Tafel
    ctx.font = '400 58px "Lilita One",system-ui'; const bw = Math.min(VW - 80, ctx.measureText(banner.text).width + 90);
    ctx.save(); ctx.translate(VW / 2, 150); ctx.rotate(-0.025);
    ctx.fillStyle = 'rgba(20,6,0,.35)'; path(-bw / 2, -40, bw, 92, 14); ctx.fill();
    ctx.fillStyle = INK2; path(-bw / 2 - 5, -47, bw + 10, 94, 16); ctx.fill(); ctx.fillStyle = '#e6392f'; path(-bw / 2, -42, bw, 84, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)'; path(-bw / 2 + 14, -36, bw - 28, 10, 5); ctx.fill();
    text(banner.text, 0, 0, 58, banner.col === '#fff' ? CREAM : banner.col); ctx.restore();
    if (banner.sub) { ctx.font = '400 24px "Lilita One",system-ui'; const sw = ctx.measureText(banner.sub).width + 40; panel(VW / 2 - sw / 2, 212, sw, 40, 12); text(banner.sub, VW / 2, 233, 24, CREAM); }
  }
  ctx.restore();
}
const myState = () => me.stun > 0 ? 4 : me.hook ? 3 : me.slide ? 2 : !me.ground ? (me.wall ? 5 : 1) : 0;

// ---------------------------------------------------------------- Bestzeiten und Geister-Rennen
// Rekord je Strecke (weiteste Strecke in Metern) und im Solo-Training der beste Lauf als Geist.
const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };
let curMap = -1, run = null, ghost = null, recordShown = false;
const bestOf = i => (store.get('hj_best_' + i) || 0);
function startRun(i) {
  curMap = i; recordShown = false;
  run = { best: 0, solo, frames: [], last: 0 };
  const gd = solo ? store.get('hj_ghost_' + i) : null; ghost = gd && gd.f && gd.f.length ? gd : null;
}
function recordRun(now) {
  if (!run || !me.alive || now < goAt) return;
  const d = progress(me.x, me.y); if (d > run.best) run.best = d;
  if (run.solo && now - run.last >= 50 && run.frames.length < 3600) { run.last = now; run.frames.push([Math.round(me.x), Math.round(me.y), myState(), me.face, Math.round(me.vx)]); }
  const rec = bestOf(curMap);
  if (!recordShown && rec > 50 && d > rec) { recordShown = true; banner = { text: 'NEUER REKORD!', sub: 'Weiter als je zuvor auf dieser Strecke', until: now + 1800, col: '#7dffb0' }; beep(660, 0.12, 'square', 0.05); setTimeout(() => beep(990, 0.2, 'square', 0.05), 120); }
}
function endRun() {
  if (!run || curMap < 0) return;
  const d = Math.round(run.best);
  if (d > bestOf(curMap)) store.set('hj_best_' + curMap, d);
  if (run.solo && run.frames.length > 40) { const old = store.get('hj_ghost_' + curMap); if (!old || d > old.d) store.set('hj_ghost_' + curMap, { d, f: run.frames }); }
  run = null;
}
function drawGhost(now) {
  if (!ghost || !solo || now < goAt) return;
  const i = fl((now - goAt) / 50), f = ghost.f[Math.min(i, ghost.f.length - 1)]; if (!f) return;
  ctx.save(); ctx.globalAlpha = i < ghost.f.length ? 0.38 : 0.18;
  drawRunner(f[0], f[1], f[4], f[2], f[3], '#dfe7ff', now, false, false);
  ctx.restore();
  ctx.globalAlpha = 0.6; text('Geist · ' + ghost.d + ' m', f[0], f[1] - 58, 14, '#dfe7ff'); ctx.globalAlpha = 1;
}
// ---------------------------------------------------------------- Zweite Chance
// Wer kurz vorm Ausscheiden ist (Abbruchkante bzw. Wasser direkt hinter einem), bekommt einmal pro Runde automatisch einen Turbo-Schub.
function secondChance(now) {
  if (me.sc || !me.alive || solo || cele || now < goAt + 1500) return;
  const danger = map.vert ? kill - me.y < 110 : me.x - (camT - Math.min(kill, 800)) < 130;
  if (!danger) return;
  me.sc = true; me.turbo = 2.5; me.boost = 1; me.inv = Math.max(me.inv, 1.5); me.stun = 0; me.hook = null;
  if (map.vert) { me.vy = -1250; me.launch = true; me.ground = false; }
  else { me.face = 1; me.vx = Math.max(me.vx, 1050); me.vy = Math.min(me.vy, -650); me.ground = false; me.launch = true; }
  banner = { text: 'ZWEITE CHANCE!', sub: 'Turbo-Schub – gib Gas!', until: now + 1600, col: '#7df9ff' };
  shake = 10; dust(me.x, me.y - 20, 18, '#7df9ff', 420); beep(300, 0.5, 'sawtooth', 0.07, 1400);
}
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
    if (me.coast) { I.l = I.r = I.jump = I.down = I.hook = I.item = I.boost = 0; I.jumpP = I.itemP = I.hookP = false; }
    while (acc >= STEP) {
      if (me.alive && now >= goAt) stepMe(STEP, now);
      I.jumpP = I.itemP = I.hookP = false; acc -= STEP;
    }
    secondChance(now); recordRun(now);
    stepWorld(dt);
    if (me.alive && now - sendT > 33) { sendT = now; sendState(); }
    // Kamera: folgt dem Feld; bei der Siegerfeier sanft auf den Sieger mit leichtem Zoom
    const wp = cele && now - cele.t0 > 250 ? posOf(cele.id) : null, k = Math.min(1, dt * (wp ? 3 : 10));
    zoom += ((wp ? 2 : 1) - zoom) * Math.min(1, dt * 2.2);
    if (wp) { camX += (wp.x - camX) * k; camY += (wp.y - 30 - camY) * k; }
    else if (map.vert) { const wx = map.W * T; camX = wx <= VW ? wx / 2 : camX + (clamp(me.alive ? me.x : camX, VW / 2, wx - VW / 2) - camX) * k; camY += (camT - camY) * k; } // breite Etagen: Kamera fährt seitlich mit
    else { camX += (camT - camX) * k; camY += (VH / 2 - 2 - camY) * k; }
    if (!map.vert) camY = Math.min(camY, MH * T + 2 - VH / (2 * zoom));
    render(now, dt);
    if (FX.on && FX.ok) { try { fxRender(); fxShow(true); } catch { FX.ok = false; fxShow(false); } } else fxShow(false);
  } else {
    fxShow(false);
    // Menü / Lobby: animierte Demo-Strecke hinter dem Menü
    if (!demo || map !== demo.map) { stepDemo(0); map = demo.map; theme = THEMES[2]; cutX = -1e9; zoom = 1; camY = VH / 2 - 2; cele = null; banner = null; }
    stepDemo(Math.min(dt, 0.05)); camX = demo.cam; camY = VH / 2 - 2;
    render(now, dt, true);
  }
  requestAnimationFrame(frame);
}
addEventListener('keydown', e => { if (e.code === 'Escape' && phase === 'game' && lobby && lobby.host === myId) send({ t: 'stop' }); });
addEventListener('keydown', e => { if (e.code === 'KeyM' && e.target.tagName !== 'INPUT') Music.toggle(); });
initAudio(); // startet sofort, falls der Browser es schon erlaubt; sonst beim ersten Klick/Tastendruck
refreshList();
if (/^#[A-Za-z]{4}$/.test(location.hash) && $('name').value.trim()) joinLobby(location.hash.slice(1).toUpperCase());
requestAnimationFrame(frame);
window.__hj = { me, remotes, get phase() { return phase; }, get lobby() { return lobby; }, keys, I, tile, F, findHook: p => findHook(p), get run() { return run; }, get ghost() { return ghost; }, recordRun: n => recordRun(n), endRun: () => endRun(), dance: n => { cele = { id: myId, dance: n, t0: performance.now() }; },
  get W() { return map.W; }, get map() { return map; }, get banner() { return banner; }, get cele() { return cele; }, get zoom() { return zoom; }, get kill() { return kill; },
  get rockets() { return rockets; }, get crates() { return crates; }, onEv: m => onEv(m), stepWorld: dt => stepWorld(dt), sync: () => sendState(),
  secondChance: n => secondChance(n), step(n, inp) { for (let i = 0; i < n; i++) { if (typeof inp === 'function') inp(me, I, i); else if (inp) Object.assign(I, inp); stepMe(STEP, performance.now() + 1e7); I.jumpP = I.itemP = I.hookP = false; } },
  view() { if (map.vert) { camX = map.wide ? clamp(me.x, VW / 2, map.W * T - VW / 2) : map.W * T / 2; camY = camT = me.y - 140; } else { camX = camT = me.x + 100; } render(performance.now(), 0.016); } };
})();
