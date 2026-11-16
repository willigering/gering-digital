import { randomBytes } from 'node:crypto';
import { BUS, DOOR, FARE, HEIGHT, SEAT, STOPS, TRAVEL, WASH, WIDTH, blocked, clamp, distance, interaction } from '../../zombiebus/world.mjs';

export const MAX_CREW = 4;
const entry = { x: 317, y: 294 };

export function createWorld({ stop = 0, fuel = 16, kills = 0, cargo = {}, phase = 'stop' } = {}) {
  return {
    stop, fuel, kills, cargo, phase, age: 0, trip: 0, driver: null, wash: 0, nextSpawn: 7,
    players: {}, shots: [], zombies: [],
    items: STOPS[stop].loot.map(([kind, x, y], index) => ({ id: String(index), kind, x, y }))
  };
}

export function addPlayer(world, name) {
  const id = randomBytes(8).toString('hex');
  const palette = [0, 1, 2, 3].find(color => !Object.values(world.players).some(p => p.color === color));
  world.players[id] = {
    id, name, color: palette, ...entry, x: entry.x - palette * 17, angle: 0, inside: true, hp: 3, ammo: 18,
    cargo: null, cooldown: 0, hurt: 0, moving: false
  };
  return world.players[id];
}

function drop(world, player) {
  if (!player.cargo) return;
  world.items.push({ id: randomBytes(5).toString('hex'), kind: player.cargo, x: player.x, y: player.y });
  player.cargo = null;
}

export function removePlayer(world, id) {
  const player = world.players[id];
  if (!player) return;
  drop(world, player);
  delete world.players[id];
  if (world.driver === id) world.driver = null;
}

export function use(world, player) {
  const target = interaction(world, player);
  switch (target?.action) {
    case 'seat':
      world.driver = player.id;
      Object.assign(player, SEAT);
      break;
    case 'exit':
      Object.assign(player, { x: DOOR.x, y: DOOR.y + 14, inside: false });
      break;
    case 'board':
      Object.assign(player, entry, { inside: true });
      break;
    case 'deliver': {
      const kind = player.cargo;
      world.cargo[kind] = (world.cargo[kind] ?? 0) + 1;
      player.cargo = null;
      if (kind === 'fuel') world.fuel = Math.min(100, world.fuel + 40);
      if (kind === 'ammo') {
        for (const rider of Object.values(world.players)) rider.ammo = Math.min(60, rider.ammo + 16);
      }
      if (kind === 'aid') {
        for (const rider of Object.values(world.players)) rider.hp = 3;
      }
      break;
    }
    case 'pick':
      player.cargo = target.point.kind;
      world.items = world.items.filter(item => item.id !== target.point.id);
      break;
    case 'wash':
      world.wash = world.wash > 0 ? 0 : 18;
      if (world.wash && !world.zombies.some(z => distance(z, WASH) < 120) && world.zombies.length < 28) {
        spawn(world, WASH.x, WASH.y + 30);
      }
      break;
  }
}

export function stand(world, player) {
  if (world.driver !== player.id || world.phase !== 'stop') return;
  world.driver = null;
  player.x -= 21;
}

export function depart(world, player) {
  if (world.phase !== 'stop' || world.driver !== player.id) return;
  if (world.fuel < FARE || Object.values(world.players).some(rider => !rider.inside)) return;
  world.fuel -= FARE;
  world.phase = 'travel';
  world.trip = 0;
  world.shots = [];
}

function moveOutside(world, actor, dx, dy) {
  const x = clamp(actor.x + dx, 9, WIDTH - 9);
  const y = clamp(actor.y + dy, 38, HEIGHT - 10);
  if (!blocked(world.stop, x, actor.y)) actor.x = x;
  if (!blocked(world.stop, actor.x, y)) actor.y = y;
}

function movePlayer(world, p, input, dt) {
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.angle = input.angle;
  const length = Math.hypot(input.dx, input.dy) || 1;
  p.moving = (input.dx !== 0 || input.dy !== 0) && world.driver !== p.id;
  if (p.moving) {
    const speed = p.cargo ? 91 : 112;
    const dx = input.dx / length * speed * dt;
    const dy = input.dy / length * speed * dt;
    if (p.inside) {
      p.x = clamp(p.x + dx, BUS.x + 16, BUS.x + BUS.w - 13);
      p.y = clamp(p.y + dy, BUS.y + 21, BUS.y + BUS.h - 5);
    } else {
      moveOutside(world, p, dx, dy);
    }
  }
  if (input.fire && !p.inside && p.cooldown <= 0 && p.ammo > 0) shoot(world, p);
}

function shoot(world, player) {
  player.ammo--;
  player.cooldown = 0.25;
  const dx = Math.cos(player.angle);
  const dy = Math.sin(player.angle);
  let range = 248;
  for (let step = 6; step < range; step += 4) {
    if (blocked(world.stop, player.x + dx * step, player.y + dy * step)) range = step;
  }
  let hit;
  for (const zombie of world.zombies) {
    const zx = zombie.x - player.x;
    const zy = zombie.y - player.y;
    const along = zx * dx + zy * dy;
    if (along > 0 && along < range && Math.abs(zx * dy - zy * dx) < 10) {
      range = along;
      hit = zombie;
    }
  }
  if (hit) {
    hit.hp--;
    hit.flash = 0.15;
    if (hit.hp === 0) world.kills++;
  }
  world.shots.push({ x: player.x, y: player.y - 7, tx: player.x + dx * range, ty: player.y + dy * range - 7, life: 0.11 });
}

function spawn(world, x, y) {
  const points = [[788, 216], [773, 420], [27, 416], [313, 56], [10, 193]];
  const [px, py] = points[Math.floor(Math.random() * points.length)];
  world.zombies.push({
    id: randomBytes(4).toString('hex'), x: x ?? px, y: y ?? py, hp: 2,
    speed: 24 + Math.random() * 13 + Math.min(world.age / 15, 12), flash: 0,
    kind: Math.floor(Math.random() * 5), angle: 0, spinning: false, moving: true
  });
}

export function seedHorde(world) {
  if (world.phase !== 'stop' || world.zombies.length || world.age > 0) return;
  for (const [x, y] of [[538, 215], [700, 228], [590, 391], [104, 189]]) spawn(world, x, y);
}

function stepZombie(world, z, outside, dt) {
  z.flash = Math.max(0, z.flash - dt);
  if (world.wash > 0 && distance(z, WASH) < 60) {
    const a = world.age * 5 + (Number.parseInt(z.id.slice(0, 3), 16) / 100);
    z.x = WASH.x + Math.cos(a) * 26;
    z.y = WASH.y + Math.sin(a) * 17;
    z.angle = a;
    z.spinning = true;
    return;
  }
  z.spinning = false;
  const closest = outside.reduce((near, p) => !near || distance(z, p) < distance(z, near) ? p : near, null);
  const target = closest && distance(z, closest) < 230 ? closest : { x: DOOR.x + 4, y: DOOR.y + 34 };
  const d = distance(z, target);
  z.angle = Math.atan2(target.y - z.y, target.x - z.x);
  z.moving = d > 8;
  if (z.moving) {
    let angle = z.angle;
    for (const other of world.zombies) {
      if (other !== z && distance(z, other) < 13) {
        angle += Math.sin(angle - Math.atan2(other.y - z.y, other.x - z.x)) * 0.45;
      }
    }
    const x = z.x;
    const y = z.y;
    moveOutside(world, z, Math.cos(angle) * z.speed * dt, Math.sin(angle) * z.speed * dt);
    if (distance(z, { x, y }) < 0.1) {
      const detourY = y < BUS.y + BUS.h / 2 ? y - 20 : y + 20;
      moveOutside(world, z, Math.sign(target.x - x) * z.speed * dt, Math.sign(detourY - y) * z.speed * dt);
    }
  }
  if (!closest || distance(z, closest) > 13 || closest.hurt > 0 || closest.inside) return;
  closest.hp--;
  closest.hurt = 1.35;
  if (closest.hp > 0) return;
  drop(world, closest);
  Object.assign(closest, entry, { inside: true, hp: 3, ammo: Math.max(8, closest.ammo) });
}

export function tick(world, inputs, dt) {
  if (world.phase === 'complete') return;
  if (world.phase === 'travel') {
    world.trip += dt;
    if (world.trip >= TRAVEL) {
      const stop = world.stop + 1;
      const players = world.players;
      Object.assign(world, createWorld({
        stop, fuel: world.fuel, kills: world.kills, cargo: world.cargo,
        phase: stop === STOPS.length - 1 ? 'complete' : 'stop'
      }), { players });
      for (const [i, player] of Object.values(players).entries()) {
        Object.assign(player, entry, { x: entry.x - i * 19, moving: false });
      }
      seedHorde(world);
    }
    return;
  }
  world.age += dt;
  world.wash = Math.max(0, world.wash - dt);
  if (world.age > world.nextSpawn) {
    if (world.zombies.length < 28) spawn(world);
    world.nextSpawn = world.age + Math.max(2.6, 10 - world.age / 24);
  }
  world.shots = world.shots.filter(shot => (shot.life -= dt) > 0);
  for (const player of Object.values(world.players)) movePlayer(world, player, inputs.get(player.id), dt);
  world.zombies = world.zombies.filter(z => z.hp > 0);
  const outside = Object.values(world.players).filter(p => !p.inside);
  for (const zombie of world.zombies) stepZombie(world, zombie, outside, dt);
}
