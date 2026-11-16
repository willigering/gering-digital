export const WIDTH = 800;
export const HEIGHT = 450;
export const DOOR = { x: 332, y: 319 };
export const SEAT = { x: 353, y: 286 };
export const BUS = { x: 119, y: 253, w: 250, h: 70 };
export const TRAVEL = 6;
export const FARE = 32;

export const STOPS = [
  {
    name: 'Döner-Eck', destination: 'Gewerbehof', sign: 'DÖNER', garage: 'WASCHSTRASSE',
    colors: ['#f77b77', '#54dce4'], wash: true,
    lots: [[373, 58, 179, 96], [579, 50, 167, 115], [20, 61, 248, 84]],
    loot: [['fuel', 672, 148], ['ammo', 470, 176], ['aid', 218, 174], ['fuel', 697, 350], ['ammo', 519, 380]]
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

export const WASH = { x: 655, y: 128, panel: { x: 582, y: 158 } };
export const SUPPLIES = { fuel: 'Kanister', ammo: 'Munition', aid: 'Verbandskasten' };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function interaction(world, player) {
  if (world.phase !== 'stop') return null;
  if (player.id === world.driver) return { action: 'dispatch', point: SEAT };
  if (player.inside) {
    if (!world.driver && distance(player, SEAT) < 23) return { action: 'seat', point: SEAT };
    if (distance(player, DOOR) < 23) return { action: 'exit', point: DOOR };
    return null;
  }
  if (distance(player, DOOR) < 25) return { action: player.cargo ? 'deliver' : 'board', point: DOOR };
  if (STOPS[world.stop].wash && distance(player, WASH.panel) < 25) return { action: 'wash', point: WASH.panel };
  if (!player.cargo) {
    const item = world.items.filter(item => distance(player, item) < 22)
      .sort((a, b) => distance(player, a) - distance(player, b))[0];
    if (item) return { action: 'pick', point: item };
  }
  return null;
}

export function blocked(stop, x, y) {
  if (x > BUS.x - 4 && x < BUS.x + BUS.w + 4 && y > BUS.y - 4 && y < BUS.y + BUS.h + 4) return true;
  return STOPS[stop].lots.some(([left, top, w, h], index) => {
    if (STOPS[stop].wash && index === 1 && x > 609 && x < 714 && y > 101) return false;
    return x > left - 3 && x < left + w + 3 && y > top - 3 && y < top + h + 3;
  });
}
