import { BUS, DOOR, HEIGHT, SEAT, STOPS, TRAVEL, WASH, WIDTH } from './world.mjs';
import { makePixelart } from './pixelart.mjs';

export const PALETTES = [
  ['#fbc55d', '#a96136', '#ffd0a0', '#583a51'],
  ['#62d8cb', '#348391', '#e8a482', '#343354'],
  ['#fd8eae', '#a54c81', '#ffd4a1', '#603a47'],
  ['#acc2ff', '#5666ad', '#b97d6d', '#3d354e']
];
const coats = ['#784f66', '#877957', '#58667f', '#8f4a4f', '#6c5a86'];

function random(seed) {
  return () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
}
function rect(g, color, x, y, w, h) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(g, color, coords) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(coords[0], coords[1]);
  for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
  g.closePath();
  g.fill();
}
function text(g, words, x, y, color, size = 10, align = 'left') {
  g.font = 'bold ' + size + 'px monospace';
  g.textAlign = align;
  g.fillStyle = color;
  g.fillText(words, Math.round(x), Math.round(y));
}
function glow(g, x, y, radius, color) {
  const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  g.fillStyle = gradient;
  g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function shadow(g, x, y, w = 12) {
  rect(g, '#121527a5', x - w / 2, y - 1, w, 4);
  rect(g, '#111627aa', x - w / 2 + 2, y - 2, w - 4, 6);
}

function reflection(g, x, y, color, rng, width = 52, length = 67) {
  for (let i = 0; i < 150; i++) {
    const down = rng() * length;
    g.globalAlpha = (1 - down / length) * (.06 + rng() * .37);
    rect(g, color, x + (rng() - .5) * width * (0.55 + down / length), y + down, 1 + rng() * 8, rng() < .22 ? 2 : 1);
  }
  g.globalAlpha = 1;
}

function street(g, rng) {
  rect(g, '#22233e', 0, 0, WIDTH, HEIGHT);
  poly(g, '#2e2e4c', [0, 171, 322, 131, 800, 168, 800, 450, 0, 450]);
  poly(g, '#343451', [0, 238, 424, 171, 800, 198, 800, 206, 430, 181, 0, 251]);
  poly(g, '#3e3c5b', [0, 438, 441, 407, 800, 440, 800, 450, 0, 450]);
  poly(g, '#282a45', [0, 0, 324, 0, 296, 91, 401, 140, 355, 160, 227, 84, 0, 118]);
  for (let i = 0; i < 6500; i++) {
    const x = rng() * WIDTH;
    const y = rng() * HEIGHT;
    rect(g, ['#4a4b712e', '#12182e26', '#77749b26', '#6f668d27'][i % 4], x, y, rng() * 4 + 1, 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = 10 + rng() * 780;
    const y = 175 + rng() * 270;
    const w = 8 + rng() * 38;
    rect(g, '#424465', x + 4, y - 1, w - 7, 2);
    rect(g, '#282c4a', x, y + 1, w, 4);
    rect(g, '#52557b', x + 10, y + 5, w / 2, 1);
  }
  for (let i = 0; i < 9; i++) {
    const x = i * 104 - 28;
    const y = 357 - Math.min(i, 4) * 5 + Math.max(0, i - 4) * 7;
    poly(g, '#7773917a', [x, y + 4, x + 47, y, x + 45, y + 3, x - 1, y + 7]);
  }
  for (let i = 0; i < 8; i++) {
    rect(g, '#8c869d4d', 746 + i * 5, 213 + i * 4, 16, 2);
  }
  g.fillStyle = '#181b32';
  g.beginPath();
  g.ellipse(489, 323, 18, 8, 0, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 5; i++) rect(g, '#5b5575', 476 + i * 5, 320, 2, 6);
}

function pane(g, x, y, w, h, lit) {
  rect(g, '#181b2f', x - 2, y - 2, w + 4, h + 4);
  rect(g, lit ? '#e4a274' : '#44496c', x, y, w, h);
  rect(g, lit ? '#c37a66' : '#353655', x + 1, y + 2, w - 2, h - 2);
  rect(g, '#665066', x + w / 2, y, 2, h);
  rect(g, '#665066', x, y + h / 2, w, 2);
  rect(g, lit ? '#ffc984' : '#74769a', x, y + h + 1, w, 2);
}

function townhouse(g, [x, y, w, h], stop) {
  const bottom = y + h;
  poly(g, '#16192c', [x - 8, bottom - 4, x + w + 14, bottom - 4, x + w + 26, bottom + 11, x + 5, bottom + 14]);
  for (let i = 0; i < 3; i++) {
    const left = x + i * w / 3;
    const span = Math.ceil(w / 3);
    const wall = stop ? ['#5b546d', '#6d5868', '#585675'][i] : ['#615675', '#70566b', '#50526f'][i];
    rect(g, wall, left, y + 17, span - 2, h - 17);
    rect(g, '#2a283d', left, bottom - 7, span - 2, 7);
    poly(g, '#25233e', [left - 5, y + 20, left + 18, y - 17 - i * 4, left + span - 17, y - 17 - i * 4, left + span + 2, y + 20]);
    for (let row = 0; row < 6; row++) rect(g, '#514569', left + 12 - row * 2, y - 12 + row * 5 - i * 4, span - 25 + row * 4, 1);
    rect(g, '#9e7791', left, y + 20, span - 1, 2);
    for (const off of [12, span - 31]) pane(g, left + off, y + 34, 15, 19, (i + off + stop) % 3 !== 0);
    rect(g, '#312a44', left + span / 2 - 8, bottom - 25, 16, 25);
    rect(g, '#ad826e', left + span / 2 + 3, bottom - 14, 2, 2);
    for (let b = 0; b < 7; b++) {
      rect(g, '#49405d', left + (b * 22) % span, bottom - 10 - b * 3, 8, 1);
    }
  }
}

function warehouse(g, [x, y, w, h], stop) {
  const bottom = y + h;
  poly(g, '#191c31', [x, bottom - 3, x + w + 6, bottom - 3, x + w + 32, bottom + 11, x + 12, bottom + 14]);
  rect(g, '#45475d', x, y + 25, w, h - 25);
  for (let i = 0; i < 3; i++) {
    const left = x + i * w / 3;
    const span = Math.ceil(w / 3);
    poly(g, '#292b45', [left - 3, y + 26, left + 3, y + 4, left + span - 10, y - 3, left + span, y + 26]);
    poly(g, '#555372', [left + 2, y + 21, left + span - 7, y + 15, left + span - 4, y + 21, left, y + 27]);
    rect(g, '#24263e', left + 5, y + 41, span - 9, h - 43);
    rect(g, '#68637b', left + 9, y + 43, span - 17, 2);
    for (let j = 1; j < 11; j++) rect(g, '#42465d', left + 11, y + 44 + j * 4, span - 22, 1);
    rect(g, '#706273', left + 13, bottom - 9, span - 24, 3);
    rect(g, '#ba9176', left + 14, y + 35, 9, 3);
    if (i === 1) {
      text(g, stop === 1 ? 'ANLIEFERUNG' : 'BETRIEBSHOF', left + span / 2, y + 35, '#cab9b8', 7, 'center');
    }
  }
}

function shop(g, [x, y, w, h], stop, rng) {
  const { sign, colors } = STOPS[stop];
  const bottom = y + h;
  poly(g, '#191c31', [x - 13, bottom, x + w + 13, bottom - 3, x + w + 25, bottom + 15, x - 8, bottom + 18]);
  rect(g, stop === 0 ? '#985968' : '#57586d', x, y + 21, w, h - 21);
  poly(g, '#24283f', [x - 6, y + 21, x + 6, y - 6, x + w - 1, y - 6, x + w + 10, y + 21]);
  for (let i = 0; i < 5; i++) rect(g, '#494563', x + 6 - i, y - 4 + i * 5, w - 7 + i * 3, 1);
  rect(g, '#452b42', x + 10, y + 20, w - 20, 24);
  rect(g, colors[0], x + 12, y + 22, w - 24, 1);
  glow(g, x + w / 2, y + 32, 70, colors[0] + '52');
  text(g, sign, x + w / 2, y + 38, '#fff0bf', 17, 'center');
  rect(g, '#543c50', x + 6, y + 58, w - 12, h - 62);
  rect(g, '#ffd18b', x + 16, y + 60, w - 48, h - 67);
  for (let i = 0; i < 3; i++) {
    const left = x + 19 + i * (w - 47) / 3;
    rect(g, '#c18061', left, y + 63, 3, h - 72);
    rect(g, '#ad6f57', left + 4, bottom - 13, (w - 48) / 3 - 7, 4);
    rect(g, '#ffe4aa', left + 9, bottom - 21, 7, 8);
  }
  rect(g, '#573644', x + w - 27, y + 63, 16, h - 63);
  rect(g, '#f6cf89', x + w - 23, y + 66, 9, 13);
  for (let i = 0; i < 14; i++) {
    const left = x + i * w / 14;
    const span = Math.ceil(w / 14);
    poly(g, i % 2 === 0 ? '#ef9f84' : '#b55f73', [left + 4, y + 44, left + 4 + span, y + 44, left + span, y + 55, left, y + 55]);
    rect(g, i % 2 === 0 ? '#b66c71' : '#76475c', left, y + 55, span, 4);
  }
  for (const left of [x + 12, x + w - 12]) {
    rect(g, '#473645', left - 4, bottom - 2, 9, 8);
    for (let i = 0; i < 30; i++) rect(g, i % 5 ? '#527866' : '#ff9b88', left + rng() * 13 - 7, bottom - 12 + rng() * 12, 2, 2);
  }
}

function garage(g, [x, y, w, h], stop) {
  const { garage, colors, wash } = STOPS[stop];
  const bottom = y + h;
  poly(g, '#1b253b', [x - 10, bottom, x + w + 9, bottom, x + w + 28, bottom + 13, x - 8, bottom + 14]);
  rect(g, '#53637b', x, y + 19, w, h - 19);
  poly(g, '#293954', [x - 5, y + 20, x + 11, y - 1, x + w - 6, y - 1, x + w + 7, y + 20]);
  rect(g, '#63768d', x + 12, y + 19, w - 17, 2);
  rect(g, '#233248', x + 8, y + 24, w - 16, 21);
  rect(g, colors[1], x + 10, y + 25, w - 20, 1);
  rect(g, colors[1], x + 10, y + 42, w - 20, 1);
  text(g, garage, x + w / 2, y + 38, '#c8f6ff', 13, 'center');
  rect(g, '#141f33', x + 22, y + 48, w - 44, h - 48);
  rect(g, '#253e53', x + 27, y + 53, w - 54, h - 53);
  for (let i = 0; i < 8; i++) rect(g, '#485c72', x + 30, y + 55 + i * 6, w - 60, 1);
  rect(g, colors[1], x + 27, y + 51, w - 54, 3);
  if (wash) {
    rect(g, '#142333', x - 5, bottom - 15, 15, 19);
    rect(g, '#8df1ed', x - 1, bottom - 11, 7, 4);
    rect(g, '#c46677', x, bottom - 4, 5, 3);
  }
}

function shelter(g) {
  const x = 44;
  const y = 304;
  rect(g, '#ffbd7825', x + 8, y + 24, 61, 28);
  rect(g, '#242a41', x + 7, y + 20, 3, 32);
  rect(g, '#242a41', x + 59, y + 20, 3, 32);
  rect(g, '#242a41', x + 19, y + 10, 3, 32);
  rect(g, '#b68b75', x + 16, y + 33, 36, 4);
  rect(g, '#2d2b46', x + 15, y + 37, 3, 10);
  rect(g, '#2d2b46', x + 49, y + 37, 3, 10);
  poly(g, '#3b4367', [x, y + 17, x + 17, y + 4, x + 81, y + 4, x + 66, y + 17]);
  rect(g, '#657397', x, y + 17, 66, 2);
  rect(g, '#fcd092', x + 12, y + 21, 47, 2);
  rect(g, '#282a45', x + 35, y + 26, 2, 19);
  rect(g, '#788a9f', x + 81, y + 8, 2, 41);
  rect(g, '#e7bc73', x + 74, y + 1, 16, 16);
  text(g, 'H', x + 82, y + 13, '#333f52', 12, 'center');
}

function tree(g, x, y, rng) {
  rect(g, '#45354b', x - 3, y - 25, 6, 26);
  rect(g, '#68526a', x - 3, y - 23, 2, 21);
  for (let i = 0; i < 95; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    rect(g, ['#282d43', '#313d53', '#3c475b', '#454963'][i % 4], x + Math.cos(a) * r * 24 - 4, y - 31 + Math.sin(a) * r * 22, 5 + rng() * 12, 2 + rng() * 7);
  }
}

function lamp(g, x, y) {
  rect(g, '#15182a', x, y - 60, 4, 62);
  rect(g, '#777188', x, y - 60, 1, 60);
  rect(g, '#423947', x, y - 60, 14, 4);
  rect(g, '#ffd594', x + 7, y - 56, 9, 2);
  glow(g, x + 11, y - 54, 34, '#ffc37965');
  const gradient = g.createLinearGradient(x, y - 56, x, y + 5);
  gradient.addColorStop(0, '#ffd68349');
  gradient.addColorStop(1, '#ffc77900');
  poly(g, gradient, [x + 8, y - 55, x + 16, y - 55, x + 38, y + 6, x - 12, y + 9]);
}

function makeMap(stop) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const g = canvas.getContext('2d');
  const rng = random(5741 + stop * 100);
  const map = STOPS[stop];
  street(g, rng);
  for (const [i, lot] of map.lots.entries()) {
    if (i === 2 && stop === 0) townhouse(g, lot, stop);
    else if (i === 2) warehouse(g, lot, stop);
    else if (i === 0) shop(g, lot, stop, rng);
    else garage(g, lot, stop);
    reflection(g, lot[0] + lot[2] / 2, lot[1] + lot[3] + 2, map.colors[i % 2], rng, 56 + i * 11);
  }
  if (stop === 0) {
    tree(g, 292, 134, rng);
    tree(g, 764, 198, rng);
  } else {
    const color = stop === 1 ? '#969282' : '#aa8c78';
    for (let i = 0; i < 6; i++) {
      const x = 44 + i * 24;
      poly(g, color, [x, 212, x + 20, 190, x + 22, 190, x + 3, 212]);
      rect(g, color, x, 212, 19, 1);
    }
    for (let x = 248; x < 377; x += 12) {
      rect(g, '#24283d', x, 61, 2, 34);
      rect(g, '#67617b', x, 62, 1, 32);
    }
    rect(g, '#595a70', 248, 66, 127, 2);
    rect(g, '#595a70', 248, 86, 127, 2);
  }
  tree(g, 13, 432, rng);
  tree(g, 782, 450, rng);
  lamp(g, 299, 154);
  lamp(g, 562, 195);
  shelter(g);
  reflection(g, 81, 356, '#fbc486', rng, 66, 41);
  reflection(g, 309, 145, '#f4bf93', rng, 32, 51);
  reflection(g, 566, 190, '#d8a47f', rng, 36, 53);
  return canvas;
}

function brush(g, x, y, t, active) {
  rect(g, '#09243a', x - 11, y - 6, 25, 47);
  rect(g, '#91b9c8', x - 3, y - 8, 6, 53);
  for (let row = 0; row < 9; row++) {
    const shift = active ? (row * 3 + Math.floor(t * 68)) % 7 - 3 : row % 3 - 1;
    rect(g, '#215b91', x - 13 + shift, y + row * 5, 27, 5);
    rect(g, '#357db5', x - 12 + shift, y + row * 5, 26, 2);
    rect(g, '#66c4e3', x - 5 - shift, y + row * 5, 8, 3);
  }
}

function bus(g, t, offset, driving, doorOpen, cargo) {
  const { x, y, w, h } = BUS;
  g.save();
  g.translate(Math.round(offset), driving ? Math.floor(t * 12) % 2 : 0);
  const bottom = y + h;
  const beams = g.createLinearGradient(x + w - 4, bottom, x + w + 170, bottom);
  beams.addColorStop(0, '#ffdb915e');
  beams.addColorStop(1, '#ffdc9700');
  const sway = driving ? Math.sin(t * 7) * 12 : 0;
  poly(g, beams, [x + w - 5, bottom - 13, x + w + 150, bottom - 9 + sway, x + w + 165, bottom + 51 + sway, x + w - 3, bottom - 5]);
  poly(g, beams, [x + w - 3, bottom + 4, x + w + 100, bottom + 23 + sway, x + w + 120, bottom + 64 + sway, x + w - 3, bottom + 6]);
  poly(g, '#121728', [x - 4, bottom - 16, x + w + 7, bottom - 12, x + w + 16, bottom + 14, x + 19, bottom + 14]);
  for (const wx of [x + 38, x + w - 44]) {
    rect(g, '#141626', wx - 9, bottom - 17, 20, 25);
    rect(g, '#423c51', wx - 6, bottom - 12, 13, 15);
    rect(g, '#74758b', wx - 3, bottom - 8, 6, 7);
    if (driving) rect(g, '#b1a7a4', wx - 1, bottom - 7 + Math.floor(t * 28) % 6, 3, 2);
  }
  poly(g, '#edcaa6', [x, y + 19, x + 13, y + 5, x + w - 13, y + 5, x + w + 2, y + 18, x + w + 5, bottom - 4, x + w - 7, bottom + 3, x, bottom - 3]);
  poly(g, '#9b8190', [x, y + 18, x + 14, y + 5, x + w - 13, y + 5, x + w + 2, y + 18, x + w - 7, y + 23, x + 3, y + 23]);
  rect(g, '#cfafa9', x + 17, y + 6, w - 37, 2);
  rect(g, '#c08376', x + 67, y + 10, 42, 6);
  for (let i = 0; i < 7; i++) rect(g, '#776176', x + 69 + i * 5, y + 12, 3, 2);
  rect(g, '#3b293d', x + 6, y + 23, w - 18, 36);
  rect(g, '#e09a60', x + 9, y + 26, w - 24, 29);
  rect(g, '#ffd58b', x + 10, y + 27, w - 26, 3);
  rect(g, '#a96348', x + 10, y + 47, w - 27, 8);
  for (let i = 0; i < 6; i++) {
    const left = x + 14 + i * 29;
    rect(g, '#693e42', left, y + 31, 18, 12);
    rect(g, '#f3b47a', left + 2, y + 32, 14, 8);
    rect(g, '#ffd48d', left + 3, y + 33, 12, 2);
    rect(g, '#65464b', left + 19, y + 25, 2, 23);
    rect(g, '#ffdc95', left + 22, y + 26, 1, 18);
  }
  rect(g, '#be673e', x + 3, bottom - 13, w - 4, 9);
  rect(g, '#eb8f50', x + 5, bottom - 13, w - 11, 2);
  rect(g, '#303247', x + w - 18, y + 22, 17, 33);
  rect(g, '#85809a', x + w - 12, y + 24, 8, 26);
  rect(g, '#d6c0a9', x + w - 10, y + 25, 2, 23);
  poly(g, '#b17e72', [x + w, y + 21, x + w + 9, y + 29, x + w + 9, bottom - 3, x + w, bottom + 1]);
  poly(g, '#4f4e68', [x + w, y + 23, x + w + 7, y + 30, x + w + 7, y + 47, x + w, y + 44]);
  rect(g, '#b86248', x + w, bottom - 12, 9, 5);
  rect(g, '#242533', x + w - 85, y + 12, 70, 12);
  text(g, '13 NACHTBUS', x + w - 50, y + 21, '#ffd078', 8, 'center');
  rect(g, '#fff4bd', x + w - 6, bottom - 16, 8, 5);
  rect(g, '#ffe0a0', x + w - 3, bottom - 5, 7, 4);
  rect(g, '#e28a79', x + 1, bottom - 14, 4, 7);
  rect(g, doorOpen ? '#ffe09a' : '#a08272', DOOR.x - 8, y + 28, 17, h - 28);
  rect(g, doorOpen ? '#e7ac67' : '#735872', DOOR.x - 6, y + 30, 12, h - 36);
  rect(g, '#ffe7ac', DOOR.x - 8, bottom - 7, 16, 3);
  rect(g, '#ecca8b', DOOR.x - 7, bottom - 2, 16, 2);
  if (doorOpen) glow(g, DOOR.x, bottom, 39, '#ffcb7672');
  const dogX = x + w - 22;
  const dogY = y + 37;
  rect(g, '#39283d', dogX - 9, dogY + 3, 15, 4);
  rect(g, '#c98962', dogX - 8, dogY, 12, 4);
  rect(g, '#ab6c51', dogX - 7, dogY + 3, 2, 2);
  const bob = Math.floor(t * (driving ? 12 : 3)) % 2;
  rect(g, '#f0b680', dogX + 1, dogY - 4 - bob, 6, 5);
  rect(g, '#764d49', dogX, dogY - 2 - bob, 2, 6);
  rect(g, '#38263b', dogX + 5, dogY - 1 - bob, 2, 2);
  for (const [i, kind] of ['fuel', 'ammo', 'aid'].entries()) {
    for (let j = 0; j < Math.min(cargo[kind] ?? 0, 3); j++) supply(g, kind, x + 20 + i * 15 + j * 5, y + 58 - j * 2, false);
  }
  g.restore();
}

function actor(g, p, t, zombie = false, own = false) {
  const { x, y } = p;
  const anim = p.moving ? Math.floor(t * (zombie ? 6 : 12) + x * .17) % 4 : 0;
  const feet = anim < 2 ? anim : 2 - anim;
  const face = Math.cos(p.angle) < 0 ? -1 : 1;
  const [coat, shade, skin, shoes] = zombie
    ? [coats[p.kind], '#48384c', '#909877', '#2b283c'] : PALETTES[p.color];
  shadow(g, x, y, 18);
  if (own) {
    rect(g, '#ffdf916e', x - 11, y + 3, 22, 1);
    rect(g, '#ffdf91', x - 3, y + 3, 6, 1);
  }
  if (p.hurt > .8 && Math.floor(t * 13) % 2) g.globalAlpha = .48;
  const dy = Math.abs(feet);
  const top = y - 25 - dy;
  rect(g, shoes, x - 6, y - 8, 5, 8 - feet);
  rect(g, shoes, x + 2, y - 8, 5, 8 + feet);
  rect(g, '#161827', x - 7, y - feet - 2, 7, 3);
  rect(g, '#161827', x + 1, y + feet - 2, 8, 3);
  rect(g, '#202034', x - 7, top + 10, 14, 13);
  rect(g, shade, x - 6, top + 10, 12, 12);
  rect(g, p.flash ? '#fff0b9' : coat, x - 5, top + 10, 10, 8);
  rect(g, zombie ? '#323446' : '#eed1a2', x - 1, top + 11, 2, 7);
  rect(g, '#212031', x - 6, top - 1, 12, 12);
  rect(g, skin, x - 5, top, 10, 9);
  rect(g, zombie ? '#515b5a' : coat, x - 6, top, 11, 3);
  if (!zombie) rect(g, coat, x - 4, top - 2, 8, 2);
  rect(g, zombie ? '#fbef80' : '#3c2c38', x + face * 3 - 1, top + 4, 2, 2);
  if (zombie) {
    rect(g, skin, x + face * 7 - 2, top + 13 + feet, 6, 3);
    rect(g, '#463046', x + face * 2 - 1, top + 7, 3, 2);
    if (p.kind === 2) rect(g, '#c05f75', x - 6, top - 2, 12, 3);
    if (p.kind === 3) {
      rect(g, '#bd6862', x - 4, top + 12, 8, 1);
      rect(g, '#bd6862', x - 4, top + 15, 8, 1);
    }
    if (p.spinning) text(g, '✧', x + 8, top - 4, '#a9ffeb', 10);
  } else if (!p.inside) {
    rect(g, '#68504d', x - face * 6 - 2, top + 12, 4, 8);
    if (p.cargo) supply(g, p.cargo, x + face * 9, y - 9, false);
    else {
      const dx = Math.cos(p.angle);
      const dy = Math.sin(p.angle);
      for (let i = 3; i < 14; i++) rect(g, i > 10 ? '#888597' : '#292537', x + dx * i, y - 10 + dy * i, 3, 2);
    }
  }
  g.globalAlpha = 1;
  if (!zombie) {
    const width = Math.min(p.name.length * 6 + 7, 114);
    rect(g, '#131625d9', x - width / 2, top - 15, width, 12);
    text(g, p.name, x, top - 6, own ? '#ffe1a7' : '#fff8e3', 9, 'center');
  }
}

function supply(g, kind, x, y, beacon) {
  if (beacon) {
    shadow(g, x, y, 18);
    glow(g, x, y - 4, 19, '#ffd59169');
    rect(g, '#f9cea589', x - 10, y + 2, 20, 1);
  }
  rect(g, '#272435', x - 6, y - 10, 12, 10);
  if (kind === 'fuel') {
    rect(g, '#c66759', x - 5, y - 9, 10, 8);
    rect(g, '#ffd790', x - 4, y - 11, 5, 2);
    rect(g, '#e59170', x - 2, y - 7, 2, 5);
  } else if (kind === 'ammo') {
    rect(g, '#687e69', x - 5, y - 8, 10, 7);
    for (let i = -3; i < 5; i += 3) rect(g, '#f0cb76', x + i, y - 7, 1, 4);
  } else {
    rect(g, '#dbb7a1', x - 5, y - 8, 10, 7);
    rect(g, '#c05b65', x - 1, y - 7, 2, 5);
    rect(g, '#c05b65', x - 3, y - 5, 6, 1);
  }
}

function road(g, t) {
  rect(g, '#22263d', 0, 0, WIDTH, HEIGHT);
  rect(g, '#353951', 0, 173, WIDTH, 203);
  rect(g, '#555473', 0, 175, WIDTH, 3);
  rect(g, '#6e667e', 0, 375, WIDTH, 3);
  const shift = (t * 166) % 112;
  for (let i = -1; i < 9; i++) {
    rect(g, '#8a829b', i * 112 - shift, 280, 51, 4);
    rect(g, '#464963', i * 112 - shift, 226, 64, 1);
    rect(g, '#494667', i * 112 - shift + 27, 338, 40, 3);
    lamp(g, i * 224 - ((t * 166) % 224), 169);
  }
}

export function makeRenderer(canvas) {
  const g = canvas.getContext('2d', { alpha: false });
  g.imageSmoothingEnabled = false;
  const pixelart = makePixelart(g, PALETTES);
  const maps = STOPS.map((_, index) => makeMap(index));
  const rng = random(154);
  const drops = Array.from({ length: 185 }, () => [rng() * WIDTH, rng() * HEIGHT, 70 + rng() * 130, 4 + rng() * 8]);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return (world, id, time, aim) => {
    const t = reduced.matches ? 0 : time;
    const travelling = world.phase === 'travel';
    const offset = travelling ? 60 + Math.min(1, world.trip / TRAVEL) * 232 : 0;
    if (world.stop === 0 && pixelart.ready()) {
      if (travelling) road(g, world.trip);
      pixelart.draw(world, id, t, offset - (travelling ? 60 : 0));
    } else {
    if (travelling) road(g, world.trip);
    else g.drawImage(maps[world.stop], 0, 0);
    if (!travelling && STOPS[world.stop].wash) {
      glow(g, WASH.x, WASH.y + 4, 53, world.wash ? '#50fff278' : '#50e8ef42');
      brush(g, WASH.x - 34, WASH.y - 17, t, world.wash);
      brush(g, WASH.x + 36, WASH.y - 17, -t, world.wash);
      if (world.wash) {
        for (let i = 0; i < 30; i++) {
          const angle = i * 1.5 + t * 7;
          const radius = 12 + (i * 4 + t * 43) % 43;
          rect(g, '#bef9ffb9', WASH.x + Math.cos(angle) * radius, WASH.y + Math.sin(angle) * radius / 2, 2, 1);
        }
      }
    }
    const actors = [...world.zombies.map(p => ({ p, zombie: true })), ...Object.values(world.players).filter(p => !p.inside).map(p => ({ p }))];
    for (const item of world.items) {
      if (!travelling) supply(g, item.kind, item.x, item.y, true);
    }
    actors.sort((a, b) => a.p.y - b.p.y);
    for (const { p, zombie } of actors.filter(({ p }) => p.y < BUS.y + BUS.h)) actor(g, p, t, zombie, p.id === id);
    bus(g, t, offset, travelling, world.phase === 'stop', world.cargo);
    if (world.phase === 'stop') {
      rect(g, world.driver ? '#6b5148' : '#ffda9c', SEAT.x - 3, SEAT.y + 3, 6, 2);
    }
    for (const p of Object.values(world.players).filter(p => p.inside)) actor(g, { ...p, x: p.x + offset }, t, false, p.id === id);
    for (const { p, zombie } of actors.filter(({ p }) => p.y >= BUS.y + BUS.h)) actor(g, p, t, zombie, p.id === id);
    }
    for (const shot of world.shots) {
      if (travelling) break;
      g.strokeStyle = '#ffdc8bd4';
      g.beginPath();
      g.moveTo(shot.x, shot.y);
      g.lineTo(shot.tx, shot.ty);
      g.stroke();
      const angle = Math.atan2(shot.ty - shot.y, shot.tx - shot.x);
      const flashX = shot.x + Math.cos(angle) * 15;
      const flashY = shot.y + Math.sin(angle) * 15;
      glow(g, flashX, flashY, 20, '#ffe399a0');
      rect(g, '#fff5cc', flashX - 2, flashY - 2, 5, 5);
    }
    if (!reduced.matches) {
      for (const [x, y, speed, length] of drops) {
        const ry = (y + t * speed) % HEIGHT;
        const rx = (x - t * speed * .18 % WIDTH + WIDTH) % WIDTH;
        g.strokeStyle = speed > 145 ? '#c3d6ff4d' : '#9aafe332';
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx - 2, ry + length);
        g.stroke();
        if (ry % 43 < 1) rect(g, '#b9c7ee75', rx - 4, ry + 1, 5, 1);
      }
    }
    if (aim && id && !world.players[id]?.inside) {
      for (const d of [-7, 4]) {
        rect(g, '#fff4ca', aim.x + d, aim.y, 3, 1);
        rect(g, '#fff4ca', aim.x, aim.y + d, 1, 3);
      }
    }
  };
}
