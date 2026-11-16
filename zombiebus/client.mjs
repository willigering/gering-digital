import { makeRenderer, PALETTES } from './art.mjs';
import { makeSound } from './sound.mjs';
import { FARE, HEIGHT, STOPS, SUPPLIES, WIDTH, interaction } from './world.mjs';

const $ = id => document.getElementById(id);
const scene = $('scene');
const stage = $('game');
const render = makeRenderer(scene);
const sound = makeSound($('music'), $('effects'));
const keys = new Set();
const movement = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const invitation = new URL(location.href);
const originalCode = invitation.searchParams.get('raum') || '';
let code = originalCode;
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
const tab = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
let world = {
  phase: 'stop', stop: 0, cargo: {}, players: {}, shots: [], wash: 0,
  zombies: [[546, 224], [632, 285], [708, 333], [552, 363], [760, 224], [255, 207]]
    .map(([x, y], kind) => ({ x, y, kind: kind % 5, angle: kind % 2 ? 3 : 0, moving: true })),
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
let settingsFromGame = false;
let serverError = false;
let lastShot;

function status(id, text) {
  $(id).textContent = text;
  $(id).hidden = !text;
}

function setBusy(value) {
  for (const id of ['start', 'join-button']) $(id).disabled = value;
  $('gate').setAttribute('aria-busy', String(value));
}

function showJoin(open, focus = true) {
  $('join-panel').hidden = !open;
  $('main-menu').hidden = open;
  status('status', '');
  if (focus) $(open ? ($('room').value ? 'name' : 'room') : 'open-join').focus();
}

function setGameMenu(open, moveFocus = true) {
  $('in-game-menu').hidden = !open;
  $('game-menu').setAttribute('aria-expanded', String(open));
  status('notice', '');
  resetControls();
  if (moveFocus) {
    if (open) $('invite').focus();
    else stage.focus({ preventScroll: true });
  }
}

function showSettings(open, inGame = settingsFromGame) {
  settingsFromGame = inGame;
  $('settings').hidden = !open;
  status('settings-status', '');
  if (inGame) {
    $('in-game-menu').hidden = open;
  } else {
    $('main-menu').hidden = open;
  }
  resetControls();
  $(open ? 'music' : inGame ? 'game-settings' : 'open-settings').focus();
}

function parseRoom(value) {
  const trimmed = value.trim();
  if (/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed.toLowerCase();
  try {
    const room = new URL(trimmed, invitation).searchParams.get('raum');
    return /^[a-f0-9]{24}$/i.test(room ?? '') ? room.toLowerCase() : '';
  } catch {
    return '';
  }
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

try { $('name').value = localStorage.getItem('zombiebus-name') || ''; } catch {}
if (originalCode) {
  $('room').value = originalCode;
  showJoin(true);
}

function begin(room, rider) {
  if (active) return;
  code = room;
  name = rider;
  active = true;
  connect();
}

$('start').addEventListener('click', () => begin('', $('name').value.trim() || 'Fahrgast ' + tab.slice(0, 4)));
$('open-join').addEventListener('click', () => showJoin(true));
$('join-back').addEventListener('click', () => {
  active = false;
  socket?.close();
  setBusy(false);
  showJoin(false);
});
$('open-settings').addEventListener('click', () => showSettings(true, false));
$('game-settings').addEventListener('click', () => showSettings(true, true));
$('settings-back').addEventListener('click', () => showSettings(false));
$('game-menu').addEventListener('click', () => setGameMenu($('in-game-menu').hidden));
$('resume').addEventListener('click', () => setGameMenu(false));
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch {
    status('settings-status', 'Vollbild ist in diesem Browser gerade nicht verfügbar.');
  }
});
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').textContent = document.fullscreenElement ? 'Vollbild beenden' : 'Vollbild';
});
document.addEventListener('click', event => { if (event.target.closest('button')) sound.click(); });

$('join').addEventListener('submit', event => {
  event.preventDefault();
  const rider = $('name').value.trim();
  if (!rider) return;
  const room = parseRoom($('room').value);
  if (!room) {
    status('status', 'Der Raumcode oder Einladungslink ist ungültig.');
    $('room').focus();
    return;
  }
  try { localStorage.setItem('zombiebus-name', rider); } catch {}
  begin(room, rider);
});

function send(msg) {
  if (socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 16_000) socket.send(JSON.stringify(msg));
}

function loseConnection() {
  id = undefined;
  resetControls();
  dispatchOpen = false;
  setGameMenu(false, false);
  $('settings').hidden = true;
  updateUI();
  if (code) {
    $('room').value = code;
    showJoin(true, false);
  }
  if (active && joined) {
    setBusy(true);
    status('status', 'Verbindung unterbrochen. Wiedereinstieg läuft …');
    const delay = Math.min(5000, 500 * 2 ** retry++);
    clearTimeout(timer);
    timer = setTimeout(connect, delay);
  } else {
    active = false;
    setBusy(false);
    status('status', 'Spielserver nicht erreichbar. Bitte versuche es erneut.');
  }
}

async function connect() {
  serverError = false;
  setBusy(true);
  status('status', 'Verbindung wird aufgebaut …');
  try {
    const endpoint = await serverUrl();
    if (!active) return;
    const peer = new WebSocket(endpoint);
    socket = peer;
    peer.addEventListener('open', () => { if (socket === peer && active) send({ type: 'join', room: code, name, tab }); });
    peer.addEventListener('message', event => {
      if (socket !== peer || !active) return;
      const data = JSON.parse(event.data);
      if (data.type === 'error') {
        serverError = true;
        active = false;
        setBusy(false);
        status('status', data.message);
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
        status('status', '');
        setBusy(false);
        stage.classList.remove('boarding');
        requestAnimationFrame(() => stage.classList.add('boarding'));
      }
      if (data.world) {
        if (data.world.driver === id && world.driver !== id) dispatchOpen = true;
        previous = world;
        world = data.world;
        receivedAt = performance.now();
        updateUI();
        if (data.type === 'joined') stage.focus({ preventScroll: true });
        const shot = world.shots.find(s => s.owner === id);
        if (shot && shot.time !== lastShot) sound.shot();
        lastShot = shot?.time;
      }
    });
    peer.addEventListener('close', event => {
      if (socket !== peer || !active || serverError) return;
      if (event.code === 4001) active = false;
      loseConnection();
    });
  } catch (error) {
    if (joined) loseConnection();
    else {
      active = false;
      setBusy(false);
      status('status', error.message);
    }
  }
}

$('invite').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(invitation.href);
    status('notice', 'Einladungslink kopiert.');
  } catch {
    status('notice', 'Einladungslink aus der Adressleiste kopieren.');
  }
});
$('depart').addEventListener('click', () => send({ type: 'depart' }));
$('stand').addEventListener('click', () => {
  dispatchOpen = false;
  send({ type: 'stand' });
});
$('restart').addEventListener('click', () => send({ type: 'restart' }));

function updateUI() {
  const player = world.players[id];
  $('gate').hidden = !!player;
  $('game-menu').hidden = !player;
  $('hud').hidden = !player;
  $('crew-box').hidden = !player;
  $('dispatch').hidden = !player || world.driver !== id || !dispatchOpen || world.phase !== 'stop';
  $('trip').hidden = !player || world.phase !== 'travel';
  $('finished').hidden = !player || world.phase !== 'complete';
  $('objective').hidden = !player || world.phase !== 'stop';
  if (!player) {
    $('prompt').hidden = true;
    return;
  }
  const stop = STOPS[world.stop];
  $('phase').textContent = world.phase === 'travel' ? 'UNTERWEGS' : 'HALTESTELLE ' + String(world.stop + 1).padStart(2, '0');
  $('stop').textContent = stop.name;
  $('health').textContent = '♥'.repeat(player.hp) + '♡'.repeat(3 - player.hp);
  $('health').setAttribute('aria-label', player.hp + ' von 3 Leben');
  $('ammo').textContent = player.ammo;
  $('fuel').textContent = world.fuel + ' %';
  $('fuel-meter').value = world.fuel;
  const players = Object.values(world.players);
  const currentRoster = players.map(rider => [rider.id, rider.inside, rider.id === world.driver].join(' ')).join('|');
  if (currentRoster !== roster) {
    roster = currentRoster;
    $('crew').replaceChildren(...players.map(rider => {
      const li = document.createElement('li');
      li.style.setProperty('--rider', PALETTES[rider.color][0]);
      li.textContent = rider.name + (rider.id === world.driver ? ' · am Steuer' : rider.inside ? ' · im Bus' : ' · draußen');
      return li;
    }));
  }
  const outside = players.filter(rider => !rider.inside).map(rider => rider.name);
  if (!$('dispatch').hidden) {
    $('passenger-status').textContent = outside.length ? 'Noch draußen · ' + outside.join(', ') : 'Alle sind an Bord.';
    $('fuel-status').textContent = world.fuel >= FARE ? 'Nächster Halt · ' + stop.destination : 'Für die Abfahrt braucht ihr ' + FARE + ' % Tankfüllung.';
    $('depart').disabled = outside.length > 0 || world.fuel < FARE;
  }
  if (world.phase === 'travel') {
    $('trip').querySelector('strong').textContent = stop.destination;
    $('trip').querySelector('progress').value = world.trip;
  }
  if (world.phase === 'complete') {
    $('result').textContent = world.kills + ' Zombies erledigt · ' + Object.values(world.cargo).reduce((a, b) => a + b, 0) + ' Vorräte gerettet';
  }
  $('objective').textContent = player.cargo ? SUPPLIES[player.cargo] + ' zur Bustür bringen' :
    world.fuel < FARE ? 'Kanister finden und zur Bustür bringen' :
    'Vorräte sammeln oder nach ' + stop.destination + ' weiterfahren';
  const target = interaction(world, player);
  const prompt = $('prompt');
  prompt.hidden = !target || !$('dispatch').hidden;
  if (!prompt.hidden) {
    const labels = { pick: SUPPLIES[target.point.kind] + ' nehmen', wash: world.wash ? 'Waschstraße stoppen' : 'Waschstraße starten',
      seat: 'Ans Steuer', board: 'Einsteigen', exit: 'Aussteigen', deliver: 'Vorrat ablegen', dispatch: 'Abfahrt prüfen' };
    prompt.querySelector('span').textContent = labels[target.action];
    prompt.style.left = 100 * target.point.x / WIDTH + '%';
    prompt.style.top = 100 * (target.point.y - 30) / HEIGHT + '%';
  }
}

function resetControls() {
  keys.clear();
  fire = false;
}
function useKey(event) {
  if (event.code === 'Escape' && !event.repeat) {
    if (!$('settings').hidden) showSettings(false);
    else if (!$('in-game-menu').hidden) setGameMenu(false);
    else if (!$('join-panel').hidden && !id) $('join-back').click();
    else if (id && !dispatchOpen) setGameMenu(true);
    else if (id) {
      dispatchOpen = false;
      updateUI();
    }
    return;
  }
  if (!$('settings').hidden || !$('in-game-menu').hidden) return;
  if (!id || event.target.matches('input, textarea, button') || event.altKey || event.metaKey || event.ctrlKey) return;
  if (movement.includes(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
  if (event.code !== 'KeyE' || event.repeat) return;
  event.preventDefault();
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
  if (event.button !== 0 || !id || !$('settings').hidden || !$('in-game-menu').hidden) return;
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
    angle: aim ? Math.atan2(aim.y + 7 - p.y, aim.x - p.x) : p.angle,
    fire
  });
}
setInterval(sendInput, 1000 / 30);

function frame(now) {
  let display = world;
  if (id && world.phase === previous.phase && world.stop === previous.stop) {
    const alpha = Math.min(1, (now - receivedAt) / 55);
    const interpolate = (a, b) => {
      if (!b || a.inside !== b.inside || Math.hypot(a.x - b.x, a.y - b.y) > 25) return a;
      return { ...a, x: b.x + (a.x - b.x) * alpha, y: b.y + (a.y - b.y) * alpha };
    };
    display = {
      ...world,
      trip: world.trip === undefined ? 0 : (previous.trip ?? world.trip) + (world.trip - (previous.trip ?? world.trip)) * alpha,
      players: Object.fromEntries(Object.entries(world.players).map(([key, p]) => [key, interpolate(p, previous.players[key])])),
      zombies: world.zombies.map(z => interpolate(z, previous.zombies.find(p => p.id === z.id)))
    };
  }
  render(display, id, now / 1000, aim);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
