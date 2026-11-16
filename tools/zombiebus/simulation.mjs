import { randomBytes } from 'node:crypto';
import { BUS, CITY_WIDTH, DEPOT, DOOR, HEIGHT, SEAT, START_FUEL, STOPS, WASH, WIDTH, BLOCK, blocked, busCenter, busPoint, canDrive, clamp, distance, districtAt, interaction, terrainBlocked } from '../../zombiebus/world.mjs';

export const MAX_CREW = 4;
const entry = { x: 315, y: 292 };

export function createWorld({ stop = 0, fuel = START_FUEL, kills = 0, cargo = {}, phase = 'stop' } = {}) {
  return {
    stop, fuel, kills, cargo, phase, age: 0, driver: null, wash: 0, nextSpawn: 9,
    bus: { x: BUS.x + stop * BLOCK, y: BUS.y, face: 1, moving: false },
    players: {}, shots: [], zombies: [],
    items: STOPS.flatMap((district, i) => district.loot.map(([kind, x, y], index) => ({ id: i + '-' + index, kind, x: x + i * BLOCK, y })))
  };
}

export function restoreWorld(world) {
  if (!world.bus) {
    const restored = createWorld({
      stop: world.stop, fuel: world.fuel, kills: world.kills, cargo: world.cargo,
      phase: world.phase === 'complete' ? 'complete' : 'stop'
    });
    const oldItems = new Map(world.items.map(item => [item.id, item.kind]));
    restored.items = restored.items.filter(item => {
      const [district, index] = item.id.split('-');
      return Number(district) !== world.stop || oldItems.get(index) === item.kind;
    });
    seedHorde(restored);
    return restored;
  }
  return { ...world, phase: world.phase === 'travel' ? 'stop' : world.phase, bus: { ...world.bus, moving: false }, players: {}, driver: null, shots: [] };
}

export function addPlayer(world, name) {
  const id = randomBytes(8).toString('hex');
  const color = [0, 1, 2, 3].find(candidate => !Object.values(world.players).some(p => p.color === candidate));
  const player = { id, name, color, angle: 0, inside: true };
  resetRider(player);
  world.players[id] = player;
  return player;
}

export function resetRider(player) {
  Object.assign(player, entry, {
    x: entry.x - player.color * 16, inside: true, hp: 3, ammo: 18,
    cargo: null, cooldown: 0, hurt: 0, moving: false
  });
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
  if (world.driver === id) park(world);
}

export function use(world, player) {
  if (world.phase === 'travel' && world.driver === player.id) {
    park(world);
    return;
  }
  const target = interaction(world, player);
  switch (target?.action) {
    case 'seat':
      world.driver = player.id;
      Object.assign(player, SEAT);
      break;
    case 'exit': {
      const door = busPoint(world.bus, DOOR);
      Object.assign(player, { x: door.x, y: door.y + 15, inside: false });
      break;
    }
    case 'board':
      Object.assign(player, entry, { inside: true });
      break;
    case 'deliver': {
      const kind = player.cargo;
      world.cargo[kind] = (world.cargo[kind] ?? 0) + 1;
      player.cargo = null;
      if (kind === 'fuel') world.fuel = Math.min(100, world.fuel + 35);
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
      if (world.wash && !world.zombies.some(z => distance(z, WASH) < 80) && world.zombies.length < 36) {
        spawn(world, WASH.x, WASH.y + 25);
      }
      break;
  }
}

function park(world) {
  if (world.phase === 'travel') world.phase = 'stop';
  world.driver = null;
  world.bus.moving = false;
}

export function stand(world, player) {
  if (world.driver !== player.id || world.phase !== 'stop') return;
  world.driver = null;
  player.x -= 22;
}

export function depart(world, player) {
  if (world.phase !== 'stop' || world.driver !== player.id) return;
  if (world.fuel <= 0 || Object.values(world.players).some(rider => !rider.inside)) return;
  world.phase = 'travel';
}

export function finish(world, player) {
  if (world.phase !== 'stop' || world.driver !== player.id || distance(busCenter(world.bus), DEPOT) > 112) return;
  if (Object.values(world.players).some(rider => !rider.inside)) return;
  park(world);
  world.phase = 'complete';
}

function drive(world, input, dt) {
  if (!input || world.fuel <= 0) {
    park(world);
    return;
  }
  const length = Math.hypot(input.dx, input.dy);
  const bus = world.bus;
  bus.moving = false;
  if (!length) return;
  const dx = input.dx * 165 * dt / length;
  const dy = input.dy * 124 * dt / length;
  const before = { x: bus.x, y: bus.y };
  if (canDrive(bus.x + dx, bus.y)) bus.x += dx;
  if (canDrive(bus.x, bus.y + dy)) bus.y += dy;
  if (Math.abs(bus.x - before.x) > 0.1) bus.face = Math.sign(dx);
  const moved = distance(bus, before);
  bus.moving = moved > 0.1;
  world.fuel = Math.max(0, world.fuel - moved / 36);
  world.stop = districtAt(busCenter(bus).x);
  if (world.fuel <= 0) park(world);
}

function moveOutside(world, actor, dx, dy) {
  const x = clamp(actor.x + dx, 10, CITY_WIDTH - 10);
  const y = clamp(actor.y + dy, 40, HEIGHT - 12);
  if (!blocked(world, x, actor.y)) actor.x = x;
  if (!blocked(world, actor.x, y)) actor.y = y;
}

function movePlayer(world, p, input, dt) {
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.hurt = Math.max(0, p.hurt - dt);
  p.angle = input.angle;
  const length = Math.hypot(input.dx, input.dy) || 1;
  p.moving = (input.dx !== 0 || input.dy !== 0) && world.driver !== p.id;
  if (p.moving) {
    const speed = p.cargo ? 98 : 120;
    const dx = input.dx / length * speed * dt;
    const dy = input.dy / length * speed * dt;
    if (p.inside) {
      p.x = clamp(p.x + dx * world.bus.face, BUS.x + 16, BUS.x + BUS.w - 13);
      p.y = clamp(p.y + dy, BUS.y + 10, BUS.y + BUS.h - 3);
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
    if (blocked(world, player.x + dx * step, player.y + dy * step)) range = step;
  }
  let hit;
  for (const zombie of world.zombies) {
    const zx = zombie.x - player.x;
    const zy = zombie.y - player.y;
    const along = zx * dx + zy * dy;
    if (zombie.hp > 0 && along > 0 && along < range && Math.abs(zx * dy - zy * dx) < 12) {
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
  world.zombies.push({
    id: randomBytes(4).toString('hex'), x, y, hp: 2,
    speed: 24 + Math.random() * 11 + Math.min(world.age / 20, 10), flash: 0,
    kind: Math.floor(Math.random() * 4), angle: Math.PI, spinning: false, moving: true
  });
}

export function seedHorde(world) {
  if (world.phase !== 'stop' || world.zombies.length || world.age > 0) return;
  for (const i of [0, 1, 2]) {
    for (const [x, y] of [[547, 255], [705, 280], [599, 389], [213, 231]]) spawn(world, x + i * BLOCK, y);
  }
}

function spawnNearby(world) {
  const center = busCenter(world.bus);
  const x = clamp(center.x + (Math.random() < .5 ? -1 : 1) * (215 + Math.random() * 120), 155, CITY_WIDTH - 15);
  const y = 248 + Math.random() * 171;
  if (!blocked(world, x, y)) spawn(world, x, y);
}

function recoverFuel(world) {
  if (world.fuel > 0 || world.items.some(item => item.kind === 'fuel')) return;
  if (Object.values(world.players).some(player => player.cargo === 'fuel')) return;
  const door = busPoint(world.bus, DOOR);
  const x = clamp(door.x + (door.x > CITY_WIDTH - 270 ? -175 : 175), 157, CITY_WIDTH - 15);
  const y = clamp(door.y + 42, 316, HEIGHT - 20);
  world.items.push({ id: randomBytes(5).toString('hex'), kind: 'fuel', x, y });
}

function stepZombie(world, z, outside, dt) {
  z.flash = Math.max(0, z.flash - dt);
  if (world.wash > 0 && distance(z, WASH) < 48) {
    const a = world.age * 5 + (Number.parseInt(z.id.slice(0, 3), 16) / 100);
    z.x = WASH.x + Math.cos(a) * 22;
    z.y = WASH.y + Math.sin(a) * 13;
    z.angle = a;
    z.spinning = true;
    return;
  }
  z.spinning = false;
  const closest = outside.reduce((near, p) => !near || distance(z, p) < distance(z, near) ? p : near, null);
  const door = busPoint(world.bus, DOOR);
  const target = closest && distance(z, closest) < 225 ? closest : { x: door.x, y: door.y + 34 };
  const d = distance(z, target);
  z.angle = Math.atan2(target.y - z.y, target.x - z.x);
  z.moving = d > 9 && d < 540;
  if (z.moving) {
    let angle = z.angle;
    for (const other of world.zombies) {
      if (other !== z && distance(z, other) < 15) {
        angle += Math.sin(angle - Math.atan2(other.y - z.y, other.x - z.x)) * 0.4;
      }
    }
    const before = { x: z.x, y: z.y };
    moveOutside(world, z, Math.cos(angle) * z.speed * dt, Math.sin(angle) * z.speed * dt);
    if (distance(z, before) < 0.1) {
      const bypass = z.y < world.bus.y + BUS.h / 2 ? -1 : 1;
      moveOutside(world, z, Math.sign(target.x - z.x) * z.speed * dt, bypass * z.speed * dt);
    }
  }
  if (!closest || distance(z, closest) > 14 || closest.hurt > 0 || closest.inside) return;
  closest.hp--;
  closest.hurt = 1.35;
  if (closest.hp > 0) return;
  drop(world, closest);
  Object.assign(closest, entry, { inside: true, hp: 3, ammo: Math.max(8, closest.ammo) });
}

export function tick(world, inputs, dt) {
  if (world.phase === 'complete') return;
  if (world.phase === 'travel') drive(world, inputs.get(world.driver), dt);
  world.age += dt;
  world.wash = Math.max(0, world.wash - dt);
  if (world.phase === 'stop') recoverFuel(world);
  if (world.age > world.nextSpawn) {
    if (world.zombies.length < 36 && world.phase === 'stop') spawnNearby(world);
    world.nextSpawn = world.age + Math.max(4, 11 - world.age / 28);
  }
  world.shots = world.shots.filter(shot => (shot.life -= dt) > 0);
  for (const player of Object.values(world.players)) movePlayer(world, player, inputs.get(player.id), dt);
  world.zombies = world.zombies.filter(z => z.hp > 0);
  const outside = Object.values(world.players).filter(p => !p.inside);
  for (const zombie of world.zombies) stepZombie(world, zombie, outside, dt);
}
