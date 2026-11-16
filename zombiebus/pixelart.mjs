import { HEIGHT, PIXEL_BUS, WASH, WIDTH, layout } from './world.mjs';

const variants = ['jacket', 'beanie', 'plaid'];
const clips = { idle: [2, 4], walk: [4, 8], aim: [1, 1], shoot: [3, 10], carry: [4, 8], hit: [2, 8] };
const items = { fuel: 'canister', ammo: 'ammo_crate', aid: 'medkit' };
const files = [
  'map/background', 'map/props_overlay', 'map/sign_doener', 'props/brushes',
  'bus/door_se', 'bus/dachshund', 'bus/driver',
  'bus/se', 'bus/lights_head_se', 'bus/lights_interior_se', 'bus/lights_tail_se',
  ...['idle', 'walk', 'aim', 'shoot', 'carry'].map(clip => 'player/' + clip),
  ...variants.flatMap(kind => ['idle', 'walk', 'hit'].map(clip => 'zombies/' + kind + '_' + clip)),
  ...Object.values(items).map(kind => 'items/' + kind),
];
const anchor = { x: 57, y: 66 };

export function makePixelart(g, palettes) {
  const art = new Map(files.map(path => {
    const image = new Image();
    image.src = new URL('./assets/pixelart/' + path + '.png', import.meta.url);
    return [path, image];
  }));
  const ready = (path) => art.get(path)?.naturalWidth > 0;
  function draw(path, ...args) {
    if (ready(path)) g.drawImage(art.get(path), ...args);
  }
  function glow(x, y, radius, color, flatten = 1) {
    g.save();
    g.translate(x, y);
    g.scale(1, flatten);
    const light = g.createRadialGradient(0, 0, 0, 0, 0, radius);
    light.addColorStop(0, color);
    light.addColorStop(1, '#00000000');
    g.fillStyle = light;
    g.fillRect(-radius, -radius, radius * 2, radius * 2);
    g.restore();
  }
  const mapped = (x, y, w, h) => [x, y, w, h, x * 1.25, y * 1.25, w * 1.25, h * 1.25];
  function sign(t) {
    const unstable = (t % 13) > 12.15;
    g.globalAlpha = unstable ? .24 + .76 * Number(Math.floor(t * 19) % 3 > 0) : 1;
    draw('map/sign_doener', 0, 0, WIDTH, HEIGHT);
    glow(552, 124, 53, '#f24b8141', .31);
    g.globalAlpha = 1;
  }

  function bus(t, offset = 0, door = 3, menu = false) {
    const x = PIXEL_BUS.x + offset;
    const y = PIXEL_BUS.y;
    const s = PIXEL_BUS.scale;
    const w = 300 * s;
    const h = 180 * s;
    const beamX = x + 325 + Math.sin(t * 1.9) * 13;
    if (door > 0) {
      glow(x + 239, y + 206, 64, '#ffbb6180', .42);
      for (let i = 0; i < 10; i++) {
        g.fillStyle = i % 2 ? '#ffd38b40' : '#f2b66528';
        g.fillRect(Math.round(x + 213 + (i * 7) % 38 + Math.sin(t * 4 + i) * 3), y + 207 + i * 3, 14 - i % 6, 1);
      }
    }
    glow(beamX + 75, y + 206, 158, '#fff2cd48', .28);
    glow(beamX + 20, y + 198, 89, '#f4c87e46', .33);
    draw('bus/se', x, y, w, h);
    draw('bus/lights_interior_se', x, y, w, h);
    draw('bus/lights_head_se', x, y, w, h);
    draw('bus/lights_tail_se', x, y, w, h);
    draw('bus/door_se', door * 300, 0, 300, 180, x, y, w, h);
    if (door === 3) {
      g.fillStyle = '#ffce7e';
      g.fillRect(x + 215, y + 189, 29, 2);
      glow(x + 232, y + 190, 30, '#ffe0a078', .65);
    }
    if (menu) {
      draw('bus/dachshund', x + 228 * s, y + 114 * s, 23 * s, 16 * s);
      draw('bus/driver', x + 248 * s, y + 96 * s, 25 * s, 28 * s);
    }
  }

  function entity(p, t, zombie, own, shot) {
    const angle = p.angle ?? 0;
    const angleRow = (Math.sin(angle) < -.16 ? 2 : 0) + Number(Math.cos(angle) < 0);
    const clip = zombie ? (p.flash > 0 ? 'hit' : p.moving || p.spinning ? 'walk' : 'idle')
      : shot ? 'shoot' : p.cargo ? 'carry' : p.moving ? 'walk' : p.inside ? 'idle' : 'aim';
    const [frames, fps] = clips[clip];
    const frame = clip === 'shoot' ? 1 : Math.floor(t * (zombie && clip === 'walk' ? 6 : fps)) % frames;
    const sheet = zombie ? 'zombies/' + variants[p.kind % variants.length] + '_' + clip : 'player/' + clip;
    const s = p.inside ? .47 : .68;
    g.fillStyle = '#06091688';
    g.beginPath();
    g.ellipse(p.x, p.y + 1, 10, 3, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    if (p.spinning) {
      g.translate(p.x, p.y);
      g.rotate(Math.sin(t * 7 + angle) * .25);
      g.translate(-p.x, -p.y);
    }
    draw(sheet, frame * 114, angleRow * 69, 114, 69,
      Math.round(p.x - anchor.x * s), Math.round(p.y - anchor.y * s), 114 * s, 69 * s);
    g.restore();
    if (!zombie) {
      g.font = 'bold 11px monospace';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = '#12182b';
      g.fillStyle = own ? '#fff4d6' : palettes[p.color][0];
      g.strokeText(p.name, p.x, p.y - 69 * s);
      g.fillText(p.name, p.x, p.y - 69 * s);
      g.fillRect(p.x - 6, p.y + 4, 12, 2);
    }
  }

  let wasTravel = false;
  let doorSince = -10;
  return {
    ready: () => ready('map/background') && ready('bus/se'),
    draw(world, id, t, offset) {
      const travel = world.phase === 'travel';
      if (travel !== wasTravel) doorSince = t;
      wasTravel = travel;
      const door = travel ? Math.max(0, 3 - Math.floor((t - doorSince) * 10)) :
        Math.min(3, Math.max(0, Math.floor((t - doorSince) * 10)));
      if (travel) {
        bus(t, offset, door);
        return;
      }
      draw('map/background', 0, 0, WIDTH, HEIGHT);
      sign(t);
      const layers = [];
      const layer = (y, paint) => layers.push({ y, paint });
      const overlay = (area, y) => layer(y, () => draw('map/props_overlay', ...mapped(...area)));
      overlay([391, 57, 87, 46], 136);
      overlay([8, 188, 126, 130], 380);
      overlay([7, 318, 91, 31], 433);
      overlay([132, 284, 31, 55], 420);
      overlay([559, 249, 70, 62], 387);
      const brushFrame = world.wash > 0 ? Math.floor(t * 8) % 4 : 0;
      const brushes = (left, width) => draw('props/brushes',
        brushFrame * 91 + left, 0, width, 78, (528 + left) * 1.25, 62 * 1.25, width * 1.25, 78 * 1.25);
      glow(WASH.x, WASH.y + 25, 66, world.wash > 0 ? '#41fce278' : '#39d4ed32', .47);
      layer(126, () => brushes(0, 91));
      for (const z of world.zombies) layer(z.spinning ? 143 : z.y, () => entity(z, t, true, false));
      if (world.wash > 0) layer(144, () => brushes(50, 41));
      for (const item of world.items) layer(item.y, () => {
        glow(item.x, item.y, 24, '#ffdb8058', .58);
        const path = 'items/' + items[item.kind];
        if (!ready(path)) return;
        const img = art.get(path);
        const w = img.naturalWidth * .58;
        draw(path, item.x - w / 2, item.y - 18, w, 18);
      });
      const { door: entrance, seat } = layout(0);
      for (const p of Object.values(world.players)) {
        if (!p.inside) {
          const shot = world.shots.some(s => s.owner === p.id);
          layer(p.y, () => entity(p, t, false, p.id === id, shot));
        }
      }
      layer(375, () => {
        bus(t, 0, door, !id);
        if (!id) return;
        const marker = (p, color) => {
          g.fillStyle = '#172134';
          g.fillRect(p.x - 8, p.y - 3, 16, 6);
          g.fillStyle = color;
          g.fillRect(p.x - 6, p.y - 1, 12, 2);
        };
        marker(entrance, '#ffe2a1');
        marker(seat, world.driver ? '#a27561' : '#ffcf89');
        for (const p of Object.values(world.players).filter(p => p.inside)) entity(p, t, false, id === p.id);
      });
      layers.sort((a, b) => a.y - b.y);
      for (const { paint } of layers) paint();
    }
  };
}
