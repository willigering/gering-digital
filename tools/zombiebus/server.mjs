import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { addPlayer, createWorld, depart, MAX_CREW, placeRider, removePlayer, seedHorde, stand, tick, use } from './simulation.mjs';

const data = resolve(process.env.ZOMBIEBUS_DATA || 'runtime/zombiebus');
const origins = new Set((process.env.ZOMBIEBUS_ORIGINS || 'https://geringdigital.de,https://www.geringdigital.de').split(',').map(s => s.trim()));
const port = Number(process.env.PORT || 8787);
const local = process.env.ZOMBIEBUS_LOCAL === '1';
const rooms = new Map();
const idleInput = { dx: 0, dy: 0, angle: 0, fire: false };
const roomCode = /^[a-f0-9]{24}$/;
const tabCode = /^[a-f0-9]{32}$/;
const fileFor = code => resolve(data, code + '.json');

mkdirSync(data, { recursive: true, mode: 0o700 });

function save(room) {
  const { players, driver, shots, ...world } = room.world;
  const filename = fileFor(room.code);
  try {
    writeFileSync(filename + '.tmp', JSON.stringify({ version: 1, world }), { mode: 0o600 });
    renameSync(filename + '.tmp', filename);
  } catch (error) {
    console.error('Room checkpoint failed:', error.message);
    return false;
  }
  return true;
}

function loadRoom(code) {
  if (rooms.has(code)) return rooms.get(code);
  if (!existsSync(fileFor(code))) return null;
  const { version, world } = JSON.parse(readFileSync(fileFor(code), 'utf8'));
  if (version !== 1 || !world) throw new Error('Unknown save format');
  const room = { code, world: { ...world, players: {}, driver: null, shots: [] }, clients: new Map(), inputs: new Map() };
  rooms.set(code, room);
  return room;
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 128_000) ws.send(JSON.stringify(msg));
}

function broadcast(room) {
  const msg = JSON.stringify({ type: 'world', world: room.world });
  for (const peer of room.clients.values()) {
    if (peer.readyState === WebSocket.OPEN && peer.bufferedAmount < 128_000) peer.send(msg);
  }
}

function leave(ws) {
  const room = ws.room;
  if (!room) return;
  ws.room = null;
  room.clients.delete(ws.player.id);
  room.inputs.delete(ws.player.id);
  removePlayer(room.world, ws.player.id);
  if (room.clients.size) broadcast(room);
  else if (save(room)) rooms.delete(room.code);
}

function join(ws, msg) {
  const fail = message => send(ws, { type: 'error', message });
  if (typeof msg.name !== 'string' || !tabCode.test(msg.tab)) return fail('Bitte gib einen Namen ein.');
  const name = Array.from(msg.name.replace(/[\p{C}]/gu, '').trim()).slice(0, 18).join('');
  if (!name) return fail('Bitte gib einen Namen ein.');
  const now = Date.now();
  if (now - (ws.lastJoin ?? 0) < 850) return;
  ws.lastJoin = now;
  if (rooms.size >= 100 && !rooms.has(msg.room)) return fail('Gerade sind alle Busse unterwegs.');
  let room;
  let creating = false;
  try {
    if (roomCode.test(msg.room)) {
      room = loadRoom(msg.room);
      if (!room) return fail('Diese Einladung gehört zu keinem gespeicherten Bus.');
    } else if (msg.room === '') {
      const code = randomBytes(12).toString('hex');
      room = { code, world: createWorld(), clients: new Map(), inputs: new Map() };
      seedHorde(room.world);
      if (!save(room)) return fail('Der Bus konnte nicht gespeichert werden.');
      rooms.set(code, room);
      creating = true;
    } else {
      return fail('Dieser Einladungslink ist ungültig.');
    }
  } catch (error) {
    console.error('Room load failed:', error.message);
    return fail('Der gespeicherte Bus ist gerade nicht verfügbar.');
  }
  const previous = [...room.clients.values()].find(peer => peer.tab === msg.tab);
  if (!previous && Object.values(room.world.players).some(player => player.name === name)) {
    return fail('Dieser Name ist bereits an Bord. Nach einem Funkloch ist der Platz nach wenigen Sekunden wieder frei.');
  }
  if (previous) {
    leave(previous);
    previous.close(4001, 'Replaced');
    rooms.set(room.code, room);
  }
  if (room.clients.size >= MAX_CREW) return fail('Der Bus ist voll. Es gibt vier Plätze.');
  ws.room = room;
  ws.tab = msg.tab;
  ws.player = addPlayer(room.world, name);
  room.clients.set(ws.player.id, ws);
  room.inputs.set(ws.player.id, { ...idleInput });
  send(ws, { type: 'joined', code: room.code, id: ws.player.id, creating, world: room.world });
  broadcast(room);
}

const server = createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ ok: req.url === '/health' }));
});
const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on('upgrade', (req, socket, head) => {
  const allowed = origins.has(req.headers.origin) || (local && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.origin ?? ''));
  if (req.url !== '/ws' || !allowed || sockets.clients.size >= 450) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  sockets.handleUpgrade(req, socket, head, ws => sockets.emit('connection', ws));
});

sockets.on('connection', ws => {
  ws.lastPong = Date.now();
  ws.connected = ws.lastPong;
  ws.on('pong', () => { ws.lastPong = Date.now(); });
  ws.on('close', () => leave(ws));
  ws.on('error', () => ws.terminate());
  ws.on('message', (data, binary) => {
    const now = Date.now();
    if (now - (ws.window ?? 0) >= 1000) {
      ws.window = now;
      ws.messages = 0;
    }
    if (++ws.messages > 65) return ws.close(1008, 'Message limit');
    if (binary) return ws.close(1003, 'Text only');
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    if (!ws.room) {
      if (msg.type === 'join') join(ws, msg);
      return;
    }
    const { world, inputs } = ws.room;
    const player = ws.player;
    if (msg.type === 'input') {
      const axis = value => value === -1 || value === 1 ? value : 0;
      const angle = Number.isFinite(msg.angle) ? msg.angle % (2 * Math.PI) : player.angle;
      inputs.set(player.id, { dx: axis(msg.dx), dy: axis(msg.dy), angle, fire: msg.fire === true, seen: now });
      return;
    }
    if (msg.type === 'use') use(world, player);
    if (msg.type === 'stand') stand(world, player);
    if (msg.type === 'depart') depart(world, player);
    if (msg.type === 'restart' && world.phase === 'complete') {
      Object.assign(world, createWorld(), { players: world.players });
      seedHorde(world);
      for (const rider of Object.values(world.players)) {
        placeRider(world, rider, rider.color);
        Object.assign(rider, { hp: 3, ammo: 18, hurt: 0, cargo: null });
      }
    }
    broadcast(ws.room);
  });
});

let lastTick = performance.now();
let frame = 0;
setInterval(() => {
  const now = performance.now();
  const dt = Math.min(0.15, (now - lastTick) / 1000);
  lastTick = now;
  frame++;
  for (const room of rooms.values()) {
    if (!room.clients.size) continue;
    for (const [id, input] of room.inputs) {
      if (input.seen && Date.now() - input.seen > 400) room.inputs.set(id, { ...idleInput, angle: input.angle });
    }
    tick(room.world, room.inputs, dt);
    if (frame % 2 === 0) broadcast(room);
  }
}, 1000 / 30);

setInterval(() => {
  const now = Date.now();
  for (const ws of sockets.clients) {
    if (now - ws.lastPong >= 6500 || (!ws.room && now - ws.connected > 15000)) {
      leave(ws);
      ws.terminate();
    } else {
      ws.ping();
    }
  }
}, 2000);
setInterval(() => {
  for (const room of rooms.values()) if (save(room) && !room.clients.size) rooms.delete(room.code);
}, 15000);

function shutdown() {
  for (const ws of sockets.clients) {
    leave(ws);
    ws.terminate();
  }
  for (const room of rooms.values()) save(room);
  server.close(() => process.exit());
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
server.listen(port, local ? '127.0.0.1' : '0.0.0.0', () => console.log('Nachtbus listening on ' + port));
