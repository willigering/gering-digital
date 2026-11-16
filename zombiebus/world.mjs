export const WIDTH = 800;
export const HEIGHT = 450;
export const DOOR = { x: 332, y: 319 };
export const SEAT = { x: 353, y: 286 };
export const BUS = { x: 119, y: 253, w: 250, h: 70 };
export const PIXEL_BUS = { x: 60, y: 165, scale: 1.25 };
export const FIRST_STOP = {
  door: { x: 294, y: 365 },
  seat: { x: 386, y: 326 },
  entry: { x: 310, y: 350 },
  cabin: { left: 117, right: 397, top: 303, bottom: 365 }
};
const legacy = {
  door: DOOR, seat: SEAT, entry: { x: 317, y: 294 },
  cabin: { left: BUS.x + 16, right: BUS.x + BUS.w - 13, top: BUS.y + 21, bottom: BUS.y + BUS.h - 5 }
};
export const layout = stop => stop === 0 ? FIRST_STOP : legacy;
export const TRAVEL = 6;
export const FARE = 32;

export const STOPS = [
  {
    name: 'Döner-Eck', destination: 'Gewerbehof', sign: 'DÖNER', garage: 'WASCHSTRASSE',
    colors: ['#f77b77', '#54dce4'], wash: true,
    lots: [[438, 0, 195, 155], [640, 0, 160, 174], [0, 0, 205, 164]],
    loot: [['fuel', 697, 202], ['ammo', 551, 206], ['aid', 224, 178], ['fuel', 635, 362], ['ammo', 491, 382]]
  },
  {
    name: 'Gewerbehof', destination: 'Endstation', sign: 'SPÄTI', garage: 'WERKSTATT',
    colors: ['#94d388', '#be91ff'], wash: false,
    lots: [[397, 53, 150, 101], [581, 54, 174, 111], [29, 47, 213, 115]],
    loot: [['fuel', 698, 191], ['ammo', 406, 177], ['aid', 241, 187], ['fuel', 538, 371], ['ammo', 752, 299]]
  },
  {
    name: 'Endstation', destination: '', sign: 'LINIE 13', garage: 'DEPOT',
    colors: ['#ffcf88', '#8ebfff'], wash: false,
    lots: [[390, 53, 171, 106], [595, 44, 176, 113], [20, 43, 250, 104]],
    loot: []
  }
];

export const WASH = { x: 716, y: 148, panel: { x: 652, y: 185 } };
export const SUPPLIES = { fuel: 'Kanister', ammo: 'Munition', aid: 'Verbandskasten' };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function interaction(world, player) {
  if (world.phase !== 'stop') return null;
  const { door, seat } = layout(world.stop);
  if (player.id === world.driver) return { action: 'dispatch', point: seat };
  if (player.inside) {
    if (!world.driver && distance(player, seat) < 23) return { action: 'seat', point: seat };
    if (distance(player, door) < 23) return { action: 'exit', point: door };
    return null;
  }
  if (distance(player, door) < 25) return { action: player.cargo ? 'deliver' : 'board', point: door };
  if (STOPS[world.stop].wash && distance(player, WASH.panel) < 25) return { action: 'wash', point: WASH.panel };
  if (!player.cargo) {
    const item = world.items.filter(item => distance(player, item) < 22)
      .sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (item) return { action: 'pick', point: item };
  }
  return null;
}

export function blocked(stop, x, y) {
  if (stop === 0) {
    const side = 282 + (x - PIXEL_BUS.x) * .327;
    const front = 371 - (x - 336) * .24;
    if (x > 55 && x < 431 && y > side - 72 && y < Math.min(side + 5, front + 5)) return true;
    if ((x < 126 && y > 292 && y < 384) || (x > 163 && x < 204 && y > 381 && y < 420)) return true;
  } else if (x > BUS.x - 4 && x < BUS.x + BUS.w + 4 && y > BUS.y - 4 && y < BUS.y + BUS.h + 4) return true;
  return STOPS[stop].lots.some(([left, top, w, h], index) => {
    if (STOPS[stop].wash && index === 1 && x > 675 && x < 760 && y > 129) return false;
    return x > left - 3 && x < left + w + 3 && y > top - 3 && y < top + h + 3;
  });
}
