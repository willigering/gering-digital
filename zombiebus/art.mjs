import { BLOCK, BUS, DEPOT, DOOR, HEIGHT, STOPS, WASH, WIDTH, busPoint, cameraFor } from './world.mjs';

export const PALETTES = ['#fbc55d', '#62d8cb', '#fd8eae', '#acc2ff'];
const SPRITE_HEIGHT = 43;

function asset(file) {
  const img = new Image();
  img.src = new URL('./media/' + file, import.meta.url);
  return img;
}

function rect(g, color, x, y, w, h) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function polygon(g, color, coords) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(coords[0], coords[1]);
  for (let i = 2; i < coords.length; i += 2) g.lineTo(coords[i], coords[i + 1]);
  g.closePath();
  g.fill();
}

function glow(g, x, y, radius, color) {
  const light = g.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color);
  light.addColorStop(1, 'transparent');
  rect(g, light, x - radius, y - radius, radius * 2, radius * 2);
}

function shade(g, x, y, w, h = 4) {
  g.fillStyle = '#0d132897';
  g.beginPath();
  g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
  g.fill();
}

function loadDistrict(map, index) {
  const img = asset(map.image);
  const layer = document.createElement('canvas');
  layer.width = WIDTH;
  layer.height = HEIGHT;
  img.addEventListener('load', () => {
    const g = layer.getContext('2d');
    g.drawImage(img, 0, 0, WIDTH, HEIGHT);
    if (index === 0) return;
    const blend = g.createLinearGradient(0, 0, WIDTH - BLOCK, 0);
    blend.addColorStop(0, '#0000');
    blend.addColorStop(1, '#000');
    g.globalCompositeOperation = 'destination-in';
    rect(g, blend, 0, 0, WIDTH, HEIGHT);
  });
  return layer;
}

function atlasRegions(img) {
  const layer = document.createElement('canvas');
  layer.width = img.naturalWidth;
  layer.height = img.naturalHeight;
  const g = layer.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, layer.width, layer.height);
  return Array.from({ length: 8 }, (_, cell) => {
    const x = cell % 4;
    const y = Math.floor(cell / 4);
    let left = width;
    let top = height;
    let right = 0;
    let bottom = 0;
    for (let py = Math.floor(y * height / 2); py < Math.floor((y + 1) * height / 2); py++) {
      for (let px = Math.floor(x * width / 4); px < Math.floor((x + 1) * width / 4); px++) {
        if (data[(py * width + px) * 4 + 3] < 85) continue;
        left = Math.min(left, px);
        right = Math.max(right, px);
        top = Math.min(top, py);
        bottom = Math.max(bottom, py);
      }
    }
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  });
}

function drawSupply(g, kind, x, y, lit = true) {
  if (lit) {
    shade(g, x, y, 10);
    glow(g, x, y - 5, 17, '#ffc57b6e');
    rect(g, '#f9cea5b9', x - 11, y + 3, 22, 1);
  }
  rect(g, '#272435', x - 6, y - 11, 12, 11);
  if (kind === 'fuel') {
    rect(g, '#cd6853', x - 5, y - 10, 10, 9);
    rect(g, '#ffd790', x - 4, y - 12, 5, 2);
    rect(g, '#ed9f78', x - 3, y - 8, 2, 6);
  } else if (kind === 'ammo') {
    rect(g, '#749b77', x - 5, y - 8, 10, 7);
    for (let i = -3; i < 5; i += 3) rect(g, '#f0cb76', x + i, y - 7, 1, 4);
  } else {
    rect(g, '#f2cfb7', x - 5, y - 8, 10, 7);
    rect(g, '#c05b65', x - 1, y - 7, 2, 5);
    rect(g, '#c05b65', x - 3, y - 5, 6, 1);
  }
}

function actor(g, atlas, regions, p, t, zombie, own, height = SPRITE_HEIGHT) {
  const frame = regions[(zombie ? 4 : 0) + (zombie ? p.kind : p.color)];
  if (!frame || frame.w < 1 || frame.h < 1) return;
  const { x, y } = p;
  const step = p.moving ? Math.sin(t * (zombie ? 13 : 23) + x * .061) : 0;
  const width = Math.round(height * frame.w / frame.h);
  if (!p.inside) shade(g, x, y, width * .42);
  if (own && !zombie && !p.inside) rect(g, '#ffd98c', x - 9, y + 5, 18, 2);
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (p.spinning) g.rotate(Math.sin(t * 11 + x) * .48);
  g.scale(Math.cos(p.angle) < 0 ? -1 : 1, 1);
  if (p.hurt > .8 && Math.floor(t * 13) % 2) g.globalAlpha = .45;
  if (p.flash > 0) g.filter = 'brightness(1.7)';
  const legs = Math.round(frame.h * .31);
  const stride = Math.round(step * 3);
  const hips = Math.round(height * .31);
  const bodyHeight = height - hips;
  g.drawImage(atlas, frame.x, frame.y, frame.w, frame.h - legs,
    Math.round(-width / 2), -height + Math.abs(stride) - 2, width, bodyHeight);
  g.drawImage(atlas, frame.x, frame.y + frame.h - legs, frame.w, legs,
    Math.round(-width / 2 + stride), -hips + Math.abs(stride) - 2, width - Math.abs(stride), hips - Math.abs(stride) + 2);
  g.restore();
  if (zombie || p.inside) return;
  if (p.cargo) drawSupply(g, p.cargo, x + Math.sign(Math.cos(p.angle)) * 15, y - 15, false);
  else {
    const aimX = Math.cos(p.angle);
    const aimY = Math.sin(p.angle);
    for (let i = 5; i < 20; i++) rect(g, i > 13 ? '#aab1bd' : '#292330', x + aimX * i, y - 16 + aimY * i, 3, 3);
  }
  g.font = 'bold 10px monospace';
  const nameWidth = g.measureText(p.name).width + 8;
  rect(g, '#141525df', x - nameWidth / 2, y - height - 14, nameWidth, 12);
  g.textAlign = 'center';
  g.fillStyle = own ? '#ffe1a7' : '#fffbec';
  g.fillText(p.name, Math.round(x), Math.round(y - height - 5));
}

function drawBus(g, sprite, atlas, regions, world, t, own) {
  const bus = world.bus;
  g.save();
  g.translate(Math.round(bus.x + (bus.face < 0 ? BUS.w : 0)), Math.round(bus.y));
  g.scale(bus.face, 1);
  const beam = g.createLinearGradient(225, 47, 395, 112);
  beam.addColorStop(0, '#ffe0a578');
  beam.addColorStop(1, '#ffdc9700');
  const sway = bus.moving ? Math.sin(t * 8) * 8 : 0;
  polygon(g, beam, [190, 35, 338, 54 + sway, 394, 120 + sway, 197, 49]);
  polygon(g, beam, [247, 30, 385, 45 + sway, 438, 98 + sway, 254, 39]);
  shade(g, BUS.w / 2, BUS.h - 4, BUS.w / 2, 19);
  if (sprite.naturalWidth) g.drawImage(sprite, -6, -104 - (bus.moving ? Math.round(t * 12) % 2 : 0), BUS.w + 12, 159);
  if (world.phase === 'stop') {
    const door = DOOR.x - BUS.x;
    glow(g, door, BUS.h, 44, '#ffbe6f85');
    polygon(g, '#ffd18a41', [door - 15, 37, door + 12, 43, door + 30, 67, door - 16, 65]);
    rect(g, '#ffe1a6', door - 10, 44, 21, 2);
  }
  for (const passenger of Object.values(world.players)) {
    if (!passenger.inside) continue;
    const x = passenger.x - BUS.x;
    const y = x > 178 ? 19 : -26 + x * .23;
    actor(g, atlas, regions, { ...passenger, x, y, angle: 0 }, t, false, passenger.id === own, 21);
  }
  for (const [i, kind] of ['fuel', 'ammo', 'aid'].entries()) {
    if (world.cargo[kind]) drawSupply(g, kind, 59 + i * 16, -10 + i * 4, false);
  }
  const dogX = 198;
  const bob = Math.floor(t * (bus.moving ? 10 : 3)) % 2;
  rect(g, '#65494b', dogX - 6, 15, 14, 3);
  rect(g, '#d88b59', dogX - 5, 12, 9, 4);
  rect(g, '#f4ba7d', dogX + 3, 8 - bob, 4, 6);
  rect(g, '#7b4940', dogX + 3, 10 - bob, 2, 6);
  rect(g, '#31243a', dogX + 7, 10 - bob, 2, 2);
  g.restore();
}

function washEffect(g, world, t) {
  if (!world.wash) return;
  glow(g, WASH.x, WASH.y, 55, '#50fff265');
  for (let i = 0; i < 47; i++) {
    const angle = i * 1.5 + t * 7;
    const radius = 12 + (i * 4 + t * 43) % 41;
    rect(g, i % 3 ? '#bef9ff9e' : '#78e9fa8a',
      WASH.x + Math.cos(angle) * radius, WASH.y + Math.sin(angle) * radius * .57, 2, 1);
  }
}

export function makeRenderer(canvas) {
  const g = canvas.getContext('2d', { alpha: false });
  const districts = STOPS.map(loadDistrict);
  const busSprite = asset('nachtbus.webp');
  const openedBus = asset('nachtbus-offen.webp');
  const sprites = asset('figuren.webp');
  let regions = [];
  sprites.addEventListener('load', () => { regions = atlasRegions(sprites); });
  const rain = Array.from({ length: 215 }, () => [Math.random() * WIDTH, Math.random() * HEIGHT, 79 + Math.random() * 145, 4 + Math.random() * 10]);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  return (world, id, time, aim) => {
    const t = reduced.matches ? 0 : time;
    const origin = cameraFor(world.bus, world.players[id]);
    const offset = Math.round(origin.x);
    rect(g, '#202239', 0, 0, WIDTH, HEIGHT);
    g.save();
    g.translate(-offset, 0);
    for (const [i, map] of districts.entries()) {
      if (i * BLOCK < offset + WIDTH && i * BLOCK + WIDTH > offset) g.drawImage(map, i * BLOCK, 0);
    }
    washEffect(g, world, t);
    for (const item of world.items) {
      if (item.x > offset - 22 && item.x < offset + WIDTH + 22) drawSupply(g, item.kind, item.x, item.y);
    }
    if (offset + WIDTH > DEPOT.x - 100) {
      const alpha = .65 + .15 * Math.sin(t * 3);
      g.globalAlpha = alpha;
      for (let i = -45; i < 45; i += 12) rect(g, '#bee9ef', DEPOT.x + i, DEPOT.y + 39, 8, 2);
      g.globalAlpha = 1;
    }
    const actors = [
      ...world.zombies.map(p => ({ p, zombie: true })),
      ...Object.values(world.players).filter(p => !p.inside).map(p => ({ p, zombie: false }))
    ].filter(({ p }) => p.x > offset - 35 && p.x < offset + WIDTH + 35);
    actors.sort((a, b) => a.p.y - b.p.y);
    const front = world.bus.y + BUS.h;
    for (const { p, zombie } of actors) if (p.y < front) actor(g, sprites, regions, p, t, zombie, p.id === id);
    const busWithDoor = world.phase === 'stop' && openedBus.naturalWidth ? openedBus : busSprite;
    drawBus(g, busWithDoor, sprites, regions, world, t, id);
    for (const { p, zombie } of actors) if (p.y >= front) actor(g, sprites, regions, p, t, zombie, p.id === id);
    for (const shot of world.shots) {
      g.strokeStyle = '#ffdc8be3';
      g.beginPath();
      g.moveTo(shot.x, shot.y - 8);
      g.lineTo(shot.tx, shot.ty - 8);
      g.stroke();
      glow(g, shot.x, shot.y - 8, 21, '#ffe399a0');
    }
    g.restore();
    if (!reduced.matches) {
      for (const [x, y, speed, length] of rain) {
        const ry = (y + t * speed) % HEIGHT;
        const rx = (x - (t * speed * .21) % WIDTH + WIDTH) % WIDTH;
        g.strokeStyle = speed > 150 ? '#c9d9ff83' : '#91a6e146';
        g.beginPath();
        g.moveTo(rx, ry);
        g.lineTo(rx - 2, ry + length);
        g.stroke();
        if (ry % 61 < 1) rect(g, '#dae3ff89', rx - 5, ry + 2, 7, 1);
      }
    }
    if (aim && id && !world.players[id]?.inside) {
      const x = aim.x;
      const y = aim.y;
      for (const d of [-7, 4]) {
        rect(g, '#fff4ca', x + d, y, 3, 1);
        rect(g, '#fff4ca', x, y + d, 1, 3);
      }
    }
  };
}
