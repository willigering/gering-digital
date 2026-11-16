export const WIDTH = 800;
export const HEIGHT = 450;
export const BLOCK = 768;
export const CITY_WIDTH = BLOCK * 2 + WIDTH;
export const BUS = { x: 140, y: 258, w: 270, h: 50, face: 1 };
export const DOOR = { x: 296, y: 302 };
export const SEAT = { x: 364, y: 279 };
export const START_FUEL = 38;
export const DEPOT = { x: BLOCK * 2 + 540, y: 328 };

export const STOPS = [
  {
    name: 'Döner-Eck', image: 'doener-eck.webp',
    loot: [['fuel', 744, 162], ['ammo', 499, 197], ['aid', 242, 196], ['fuel', 705, 340], ['ammo', 546, 394]]
  },
  {
    name: 'Gewerbehof', image: 'gewerbehof.webp',
    loot: [['fuel', 641, 250], ['ammo', 278, 251], ['aid', 194, 315], ['fuel', 485, 372], ['ammo', 746, 309]]
  },
  {
    name: 'Busdepot', image: 'busdepot.webp',
    loot: [['aid', 360, 261], ['ammo', 519, 267]]
  }
];

export const WASH = { x: 728, y: 159, panel: { x: 645, y: 196 } };
export const SUPPLIES = { fuel: 'Kanister', ammo: 'Munition', aid: 'Verbandskasten' };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const districtAt = x => clamp(Math.floor((x - (WIDTH - BLOCK) / 2) / BLOCK), 0, STOPS.length - 1);
export const busCenter = bus => ({ x: bus.x + BUS.w / 2, y: bus.y + BUS.h / 2 });

export function busPoint(bus, point) {
  const dx = point.x - BUS.x;
  return { x: bus.x + (bus.face < 0 ? BUS.w - dx : dx), y: bus.y + point.y - BUS.y };
}

export function cameraFor(bus, player) {
  const focus = player && !player.inside ? player : busCenter(bus);
  return { x: clamp(focus.x - WIDTH / 2, 0, CITY_WIDTH - WIDTH), y: 0 };
}

export function interaction(world, player) {
  if (world.phase !== 'stop') return null;
  const door = busPoint(world.bus, DOOR);
  const seat = busPoint(world.bus, SEAT);
  if (player.id === world.driver) return { action: 'dispatch', point: seat };
  if (player.inside) {
    if (!world.driver && distance(player, SEAT) < 25) return { action: 'seat', point: seat };
    if (distance(player, DOOR) < 26) return { action: 'exit', point: door };
    return null;
  }
  if (distance(player, door) < 26) return { action: player.cargo ? 'deliver' : 'board', point: door };
  if (distance(player, WASH.panel) < 23) return { action: 'wash', point: WASH.panel };
  if (!player.cargo) {
    const item = world.items.filter(item => distance(player, item) < 23)
      .sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (item) return { action: 'pick', point: item };
  }
  return null;
}

export function terrainBlocked(x, y) {
  if (x < 10 || x > CITY_WIDTH - 10 || y > HEIGHT - 12) return true;
  const district = districtAt(x);
  if (district !== 0) return y < 222;
  if (x < 144 && y > 228) return true;
  if (x < 216) return y < 199 - x * 0.17;
  if (x < 338) return y < 170 - (x - 216) * 0.3;
  if (x < 432) return y < 116;
  if (x < 480) return y < 161;
  if (x < 686) return y < 174 + (x - 480) * .16;
  if (x >= 699 && x <= 764) return y < 143;
  return y < 219;
}

export function blocked(world, x, y) {
  const bus = world.bus;
  return terrainBlocked(x, y) || (x > bus.x - 3 && x < bus.x + BUS.w + 3 && y > bus.y - 4 && y < bus.y + BUS.h + 3);
}

export function canDrive(x, y) {
  if (x < 137 || x + BUS.w > CITY_WIDTH - 25 || y > 356) return false;
  return [8, BUS.w / 2, BUS.w - 8].every(dx => !terrainBlocked(x + dx, y + 7) && !terrainBlocked(x + dx, y + BUS.h + 23));
}
