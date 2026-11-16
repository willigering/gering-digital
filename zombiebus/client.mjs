import { makeRenderer, PALETTES } from './art.mjs';
import { BUS, CITY_WIDTH, DEPOT, HEIGHT, STOPS, SUPPLIES, WIDTH, busCenter, cameraFor, distance, districtAt, interaction } from './world.mjs';

const $ = id => document.getElementById(id);
const scene = $('scene');
const render = makeRenderer(scene);
const keys = new Set();
const movement = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const invitation = new URL(location.href);
let code = invitation.searchParams.get('raum') || '';
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const tab = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
let world = {
  phase: 'stop', stop: 0, cargo: {}, players: {}, shots: [], wash: 0, bus: { ...BUS },
  zombies: [[546, 243], [632, 285], [710, 355], [528, 378], [760, 244], [421, 204]]
    .map(([x, y], kind) => ({ x, y, kind: kind % 4, angle: kind % 2 ? 3 : 0, moving: true })),
  items: STOPS[0].loot.map(([kind, x, y]) => ({ kind, x, y }))
};
let previous = world;
let receivedAt = 0;
let socket;
let id;
let name;
let aim;
let fire = false;
let joined = false;
let active = false;
let dispatchOpen = false;
let retry = 0;
let timer;
let roster = '';

function message(text) {
  $('status').textContent = text;
}

async function serverUrl() {
  if (isLocal) {
    const port = invitation.searchParams.get('server');
    return 'ws://127.0.0.1:' + (/^\d{2,5}$/.test(port) ? port : '8787') + '/ws';
  }
  const response = await fetch('./server-config.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Für diesen Bus ist noch kein Spielserver eingerichtet.');
  const { endpoint } = await response.json();
  if (!/^wss:\/\/[\w.-]+(?::\d+)?\/ws$/.test(endpoint)) throw new Error('Die Serveradresse ist ungültig.');
  return endpoint;
}

if (code) {
  $('gate-title').textContent = 'Dein Nachtbus wartet.';
  $('gate-copy').textContent = 'Du steigst direkt in den laufenden Bus ein.';
  $('join-button').firstChild.textContent = 'Einsteigen ';
}
try { $('name').value = localStorage.getItem('zombiebus-name') || ''; } catch {}

$('join').addEventListener('submit', event => {
  event.preventDefault();
  name = $('name').value.trim();
  if (!name) return;
  try { localStorage.setItem('zombiebus-name', name); } catch {}
  active = true;
  connect();
});

function send(msg) {
  if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 16_000) socket.send(JSON.stringify(msg));
}

function loseConnection() {
  id = undefined;
  resetControls();
  dispatchOpen = false;
  updateUI();
  if (active && joined) {
    $('join-button').disabled = true;
    message('Verbindung unterbrochen. Wiedereinstieg läuft …');
    const delay = Math.min(5000, 500 * 2 ** retry++);
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
  } else {
    active = false;
    $('join-button').disabled = false;
    message('Spielserver nicht erreichbar. Bitte versuche es erneut.');
  }
}

async function connect() {
  $('join-button').disabled = true;
  message('Verbindung wird aufgebaut …');
  try {
    const endpoint = await serverUrl();
    if (!active) return;
    const peer = new WebSocket(endpoint);
    socket = peer;
    peer.addEventListener('open', () => send({ type: 'join', room: code, name, tab }));
    peer.addEventListener('message', event => {
      const data = JSON.parse(event.data);
      if (data.type === 'error') {
        active = false;
        $('join-button').disabled = false;
        message(data.message);
        peer.close();
        return;
      }
      if (data.type === 'joined') {
        id = data.id;
        code = data.code;
        invitation.searchParams.set('raum', code);
        history.replaceState(null, '', invitation);
        joined = true;
        retry = 0;
        message('');
      }
      if (data.world) {
        if (data.world.driver === id && world.driver !== id) dispatchOpen = true;
        previous = world;
        world = data.world;
        receivedAt = performance.now();
        updateUI();
      }
    });
    peer.addEventListener('close', event => {
      if (socket !== peer || !active) return;
      if (event.code === 4001) active = false;
      loseConnection();
    });
  } catch (error) {
    if (joined) loseConnection();
    else {
      active = false;
      $('join-button').disabled = false;
      message(error.message);
    }
  }
}

$('invite').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(invitation.href);
    $('notice').textContent = 'Einladungslink kopiert.';
  } catch {
    $('notice').textContent = 'Einladungslink aus der Adressleiste kopieren.';
  }
});
$('depart').addEventListener('click', () => {
  $('depart').blur();
  dispatchOpen = false;
  resetControls();
  send({ type: 'depart' });
});
$('finish-route').addEventListener('click', () => send({ type: 'finish' }));
$('stand').addEventListener('click', () => {
  dispatchOpen = false;
  send({ type: 'stand' });
});
$('restart').addEventListener('click', () => send({ type: 'restart' }));

function updateUI() {
  const player = world.players[id];
  $('gate').hidden = !!player;
  $('invite').hidden = !player;
  $('hud').hidden = !player;
  $('crew-box').hidden = !player;
  $('dispatch').hidden = !player || world.driver !== id || !dispatchOpen || world.phase !== 'stop';
  $('route-map').hidden = !player;
  $('finished').hidden = !player || world.phase !== 'complete';
  $('objective').hidden = !player || world.phase === 'complete';
  if (!player) {
    $('prompt').hidden = true;
    return;
  }
  const center = busCenter(world.bus);
  const district = player.inside ? world.stop : districtAt(player.x);
  const stop = STOPS[district];
  $('phase').textContent = world.phase === 'travel' ? 'UNTERWEGS' : 'STADTVIERTEL';
  $('stop').textContent = stop.name;
  $('health').textContent = '♥'.repeat(player.hp) + '♡'.repeat(3 - player.hp);
  $('health').setAttribute('aria-label', player.hp + ' von 3 Leben');
  $('ammo').textContent = player.ammo;
  $('fuel').textContent = Math.ceil(world.fuel) + ' %';
  $('fuel-meter').value = world.fuel;
  $('route-map').style.setProperty('--route-position', 100 * center.x / CITY_WIDTH + '%');
  const players = Object.values(world.players);
  const currentRoster = players.map(rider => [rider.id, rider.inside, rider.id === world.driver].join(' ')).join('|');
  if (currentRoster !== roster) {
    roster = currentRoster;
    $('crew').replaceChildren(...players.map(rider => {
      const li = document.createElement('li');
      li.style.setProperty('--rider', PALETTES[rider.color]);
      li.textContent = rider.name + (rider.id === world.driver ? ' · am Steuer' : rider.inside ? ' · im Bus' : ' · draußen');
      return li;
    }));
  }
  const outside = players.filter(rider => !rider.inside).map(rider => rider.name);
  if (!$('dispatch').hidden) {
    $('passenger-status').textContent = outside.length ? 'Noch draußen · ' + outside.join(', ') : 'Alle sind an Bord.';
    $('fuel-status').textContent = world.fuel > 0 ? 'Mit WASD lenken · E zum Anhalten.' : 'Tank leer. Bringt einen Kanister zur Bustür.';
    $('depart').disabled = outside.length > 0 || world.fuel <= 0;
    $('finish-route').hidden = distance(center, DEPOT) > 112;
    $('finish-route').disabled = outside.length > 0;
  }
  if (world.phase === 'complete') {
    $('result').textContent = world.kills + ' Zombies erledigt · ' + Object.values(world.cargo).reduce((a, b) => a + b, 0) + ' Vorräte gerettet';
  }
  $('objective').textContent = world.phase === 'travel' ? (world.driver === id ? 'WASD fahren · E anhalten' : 'Der Bus fährt.') :
    player.cargo ? SUPPLIES[player.cargo] + ' zur Bustür bringen' :
    world.fuel < 15 ? 'Kanister finden und zur Bustür bringen' :
    'Halte, wo du Vorräte siehst. Am Depot endet die Runde.';
  const target = interaction(world, player);
  const prompt = $('prompt');
  prompt.hidden = !target || !$('dispatch').hidden;
  if (!prompt.hidden) {
    const labels = { pick: SUPPLIES[target.point.kind] + ' nehmen', wash: world.wash ? 'Waschstraße stoppen' : 'Waschstraße starten',
      seat: 'Ans Steuer', board: 'Einsteigen', exit: 'Aussteigen', deliver: 'Vorrat ablegen', dispatch: 'Abfahrt prüfen' };
    prompt.querySelector('span').textContent = labels[target.action];
    prompt.style.left = 100 * (target.point.x - cameraFor(world.bus, player).x) / WIDTH + '%';
    prompt.style.top = 100 * (target.point.y - 30) / HEIGHT + '%';
  }
}

function resetControls() {
  keys.clear();
  fire = false;
}
function useKey(event) {
  if (!id || event.target.matches('input, textarea, button') || event.altKey || event.metaKey || event.ctrlKey) return;
  if (movement.includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  if (event.code === 'Escape') {
    dispatchOpen = false;
    updateUI();
  }
  if (event.code !== 'KeyE' || event.repeat) return;
  event.preventDefault();
  if (world.phase === 'travel' && world.driver === id) {
    resetControls();
    send({ type: 'use' });
    return;
  }
  if (world.driver === id) {
    dispatchOpen = !dispatchOpen;
    updateUI();
  } else {
    send({ type: 'use' });
  }
}
window.addEventListener('keydown', useKey);
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', resetControls);
window.addEventListener('pagehide', () => {
  active = false;
  clearTimeout(timer);
  socket?.close(1000, 'Tab closed');
});
window.addEventListener('pageshow', event => {
  if (event.persisted && joined) {
    active = true;
    loseConnection();
  }
});

function setAim(event) {
  const rect = scene.getBoundingClientRect();
  aim = { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT };
}
scene.addEventListener('pointermove', setAim);
scene.addEventListener('pointerleave', () => { aim = null; fire = false; });
scene.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !id) return;
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  setAim(event);
  fire = true;
  sendInput();
});
window.addEventListener('pointerup', () => { fire = false; });
window.addEventListener('pointercancel', () => { fire = false; });
function sendInput() {
  const p = world.players[id];
  if (!p) return;
  send({
    type: 'input',
    dx: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
    dy: Number(keys.has('KeyS')) - Number(keys.has('KeyW')),
    angle: aim ? Math.atan2(aim.y + 15 - p.y, aim.x + cameraFor(world.bus, p).x - p.x) : p.angle,
    fire
  });
}
setInterval(sendInput, 1000 / 30);

function frame(now) {
  let display = world;
  if (id && world.phase === previous.phase) {
    const alpha = Math.min(1, (now - receivedAt) / 55);
    const interpolate = (a, b) => {
      if (!b || a.inside !== b.inside || Math.hypot(a.x - b.x, a.y - b.y) > 25) return a;
      return { ...a, x: b.x + (a.x - b.x) * alpha, y: b.y + (a.y - b.y) * alpha };
    };
    display = {
      ...world,
      bus: interpolate(world.bus, previous.bus),
      players: Object.fromEntries(Object.entries(world.players).map(([key, p]) => [key, interpolate(p, previous.players[key])])),
      zombies: world.zombies.map(z => interpolate(z, previous.zombies.find(p => p.id === z.id)))
    };
  }
  render(display, id, now / 1000, aim);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
