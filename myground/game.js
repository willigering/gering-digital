'use strict';
// „Du kranst mich mal“ – Browser-Client.
// Standard (wie bei Rüdiger): Der Browser, der eine Baustelle eröffnet, ist der Host. Er rechnet das
// Spiel mit logic.js, alle anderen verbinden sich per WebRTC nur mit ihm (Stern, kein Vollmesh).
// Die Anmeldung läuft über api.php. Ist in config.js ein Spielserver eingetragen, übernimmt der die Host-Rolle.
(() => {
  const $ = id => document.getElementById(id);
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const REACH = 0.4, DROP = 0.3, K = 0.76, THICK = 0.28;
  const qs = new URLSearchParams(location.search);
  const FORCE_RELAY = qs.get('relay') === '1'; // Diagnose: Verbindung nur über TURN zulassen
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const SERVER = String(window.MYGROUND_SERVER || '').replace(/\/+$/, '');
  const HOSTED = !SERVER;                                  // ein Browser hostet, kein Spielserver
  const BOTS_OK = local || qs.get('bots') === '1';         // Testbots nur lokal oder ausdrücklich
  const STUN = [{ urls: ['stun:stun.cloudflare.com:3478'] }];
  const tok = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
  let room = /^[A-Za-z]{4}$/.test(qs.get('raum') || '') ? qs.get('raum').toUpperCase() : '';

  // ---------------------------------------------------------------- Zustand
  let host = null, lastSnap = 0;
  let pc = null, chR = null, chU = null, myId = 0, connected = false, connecting = false, route = '';
  let map = null, plates = [], grid = null, phase = 'lobby', timeLeft = 0, botsAllowed = false, result = null;
  const meta = new Map();   // id -> { name, bot, c, st }
  const ents = new Map();   // id -> gezeichneter Kran
  const input = { x: 0, y: 0 }, keys = new Set();
  let lastSent = '', lastSentAt = 0;

  const setStatus = (text, state) => { $('status').textContent = text; $('status').dataset.state = state; };
  const joinMsg = (text, err) => { $('joinStatus').textContent = text; $('joinStatus').classList.toggle('err', !!err); };
  const show = (id, on) => $(id).classList.toggle('on', on);
  function toast(text) { const p = document.createElement('p'); p.textContent = text; $('toasts').append(p); while ($('toasts').children.length > 3) $('toasts').firstChild.remove(); setTimeout(() => p.remove(), 3300); }

  // ---------------------------------------------------------------- Verbindung
  // 1. Gastsitzung beim Spielserver holen (liefert die ICE-Konfiguration samt kurzlebigem TURN-Zugang)
  // 2. WebRTC-Angebot schicken, Antwort setzen
  // 3. „Verbunden“ erst, wenn der Spielkanal offen ist und der Server begrüßt hat
  const post = async (path, body) => {
    let r;
    try { r = await fetch(SERVER + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(body) }); }
    catch { throw new Error('Der Spielserver ist nicht erreichbar.'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.err || 'Der Spielserver hat abgelehnt (' + r.status + ').');
    return j;
  };
  const api = async (a, body) => {
    let r;
    try { r = await fetch('api.php?a=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify({ tok, ...body }) }); }
    catch { throw new Error('Die Anmeldung ist nicht erreichbar.'); }
    const j = await r.json().catch(() => null);
    if (!j) throw new Error('Die Anmeldung antwortet nicht richtig (' + r.status + ').');
    if (j.err) throw new Error(j.err);
    return j;
  };
  // Befristete TURN-Zugangsdaten von api.php; der dauerhafte Schlüssel bleibt auf dem Server.
  let iceCache = { t: 0, list: null };
  async function getIce() {
    if (iceCache.list && Date.now() - iceCache.t < 30 * 60e3) return iceCache.list;
    try { const j = await api('ice', {}); if (Array.isArray(j.ice) && j.ice.length) { iceCache = { t: Date.now(), list: STUN.concat(j.ice) }; return iceCache.list; } } catch { }
    return STUN;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // Gast: Angebot beim Host abgeben und auf dessen Antwort warten
  async function viaHost(sdp) {
    const gone = () => new Error('Diese Baustelle gibt es nicht mehr.');
    if ((await api('signal', { id: room, to: 'host', data: { sdp: { type: 'offer', sdp } } })).gone) throw gone();
    for (const end = Date.now() + 20000; Date.now() < end;) {
      await sleep(500);
      const j = await api('poll', { id: room });
      if (j.gone) throw gone();
      for (const m of j.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'answer') return m.data.sdp;
    }
    throw new Error('Der Host hat nicht geantwortet.');
  }
  const gathered = (p, ms) => new Promise(res => {
    if (p.iceGatheringState === 'complete') return res();
    const t = setTimeout(res, ms);
    p.addEventListener('icegatheringstatechange', () => { if (p.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
  });
  function entered(label) {
    connected = true; lastSnap = performance.now();
    setStatus(label, 'on'); joinMsg('');
    show('join', false); $('hud').hidden = false; $('roster').hidden = false;
    $('roomRow').hidden = !HOSTED; $('roomCode').textContent = room;
    if (matchMedia('(pointer: coarse)').matches) $('touch').hidden = false;
    try { if (!localStorage.getItem('myground-help2')) { show('help', true); localStorage.setItem('myground-help2', '1'); } } catch { }
  }
  function closeLink() { connected = false; const p = pc; pc = chR = chU = null; if (p) { p.onconnectionstatechange = null; try { p.close(); } catch { } } }
  function lost(why) {
    if (!connected) return;
    closeLink(); setStatus('Getrennt', 'err');
    $('lostWhy').textContent = why; show('result', false); show('lost', true);
  }
  const busy = on => { connecting = on; for (const b of document.querySelectorAll('#joinBtn, #createBtn, #roomList button')) b.disabled = on; };
  function myName() { const name = $('name').value.trim(); try { localStorage.setItem('myground-name', name); } catch { } return name; }
  async function connect() {
    if (connecting || connected) return;
    if (HOSTED && !room) return createRoom();
    const name = myName();
    busy(true); $('retry').hidden = true; show('lost', false); show('join', true);
    setStatus('Verbinde …', 'wait'); joinMsg(HOSTED ? 'Baustelle ' + room + ' wird gesucht …' : 'Gastsitzung wird angelegt …');
    try {
      const s = HOSTED ? { iceServers: await getIce() } : await post('/session', { name });
      botsAllowed = !!s.bots;
      joinMsg(FORCE_RELAY ? 'Verbindung über Relay wird aufgebaut …' : 'Verbindung wird aufgebaut …');
      const p = pc = new RTCPeerConnection({ iceServers: s.iceServers || [], iceTransportPolicy: FORCE_RELAY ? 'relay' : 'all' });
      const r = chR = p.createDataChannel('r');
      if (HOSTED) r.onopen = () => r.send(JSON.stringify({ t: 'hello', name }));
      const u = chU = p.createDataChannel('u', { ordered: false, maxRetransmits: 0 });
      const welcome = new Promise((res, rej) => {
        const t = setTimeout(() => rej(new Error(FORCE_RELAY ? 'Über das Relay kam keine Verbindung zustande.' : 'Keine Verbindung zustande gekommen. Dein Netz blockiert vermutlich auch den Umweg über das Relay.')), 20000);
        r.onmessage = u.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } if (m.t === 'welcome') { clearTimeout(t); res(m); } else if (m.t === 'full') { clearTimeout(t); rej(new Error('Der Raum ist voll.')); } else onMsg(m); };
        p.onconnectionstatechange = () => { if (p.connectionState === 'failed') { clearTimeout(t); rej(new Error('Verbindungsaufbau gescheitert, auch über das Relay.')); } };
      });
      welcome.catch(() => { });
      await p.setLocalDescription(await p.createOffer());
      await gathered(p, FORCE_RELAY ? 6000 : 2500);
      await p.setRemoteDescription(HOSTED ? await viaHost(p.localDescription.sdp) : (await post('/offer', { sid: s.sid, token: s.token, sdp: p.localDescription.sdp })).answer);
      const w = await welcome;
      myId = w.id;
      r.onclose = () => { if (pc === p) lost(HOSTED ? 'Der Host hat die Baustelle geschlossen. Dein Kran wurde abgestellt.' : 'Der Spielkanal wurde geschlossen. Dein Kran wurde abgestellt.'); };
      p.onconnectionstatechange = () => { if (pc === p && (p.connectionState === 'failed' || p.connectionState === 'closed')) lost('Die Verbindung ist abgerissen.'); };
      entered('Verbunden');
      selectedPair().then(x => { if (x && pc === p) { route = x.local === 'relay' || x.remote === 'relay' ? 'Relay' : 'Direkt'; setStatus('Verbunden · ' + route, 'on'); } });
    } catch (e) {
      closeLink();
      setStatus('Getrennt', 'err'); joinMsg(e.message || 'Verbindung fehlgeschlagen.', true); $('retry').hidden = false;
    }
    busy(false);
  }
  // Baustelle eröffnen: dieser Browser wird Host und rechnet das Spiel.
  async function createRoom() {
    if (connecting || connected) return;
    const name = myName();
    busy(true); $('retry').hidden = true; show('lost', false); show('join', true);
    setStatus('Eröffne …', 'wait'); joinMsg('Baustelle wird eröffnet …');
    try {
      room = (await api('create', { name })).id;
      getIce();
      host = startHost(name);
      entered('Host');
      route = 'Host';
    } catch (e) { host = null; setStatus('Getrennt', 'err'); joinMsg(e.message || 'Eröffnen fehlgeschlagen.', true); }
    busy(false);
  }
  setInterval(() => { if (connected && !host && performance.now() - lastSnap > 7000) lost(HOSTED ? 'Der Host antwortet nicht mehr. Vermutlich ist sein Fenster zu.' : 'Der Spielserver antwortet nicht mehr.'); }, 1000);

  // ---------------------------------------------------------------- Host: Spiel rechnen, Gäste annehmen
  function startHost(name) {
    const L = window.MGLogic, peers = new Map(), byPlayer = new Map();   // Anmelde-ID -> Verbindung, Spieler-ID -> Verbindung
    const tx = (c, ch, s) => { const d = c[ch]; try { if (d && d.readyState === 'open' && d.bufferedAmount < 262144) d.send(s); } catch { } };
    const game = new L.Game({
      allowBots: BOTS_OK,
      emit(msg, to) {
        const s = JSON.stringify(msg);
        if (to == null) { onMsg(JSON.parse(s)); for (const c of byPlayer.values()) tx(c, 'r', s); }
        else if (to === myId) onMsg(JSON.parse(s));
        else if (byPlayer.has(to)) tx(byPlayer.get(to), 'r', s);
      },
    });
    const me = game.addPlayer(name);
    myId = me.id;
    onMsg(JSON.parse(JSON.stringify(game.roundMsg()))); onMsg(JSON.parse(JSON.stringify(game.roster())));
    function handle(pid, m) {
      if (m.t === 'in') game.setInput(pid, +m.x, +m.y);
      else if (m.t === 'act' && ['grab', 'home'].includes(m.k)) game.act(pid, m.k);
      else if (m.t === 'start') game.start(pid);
      else if (m.t === 'bots' && game.allowBots) { if (m.n > 0) game.addBots(Math.min(46, m.n | 0)); else for (const p of [...game.players.values()]) if (p.bot) game.removePlayer(p.id); }
    }
    function drop(c) {
      if (c.gone) return;
      c.gone = true;
      if (peers.get(c.from) === c) peers.delete(c.from);
      if (c.pid) { byPlayer.delete(c.pid); game.removePlayer(c.pid); }   // legt eine Platte am Haken gültig ab
      try { c.p.close(); } catch { }
    }
    function fromPeer(c, raw) {
      if (typeof raw !== 'string' || raw.length > 300 || c.gone) return;
      let m; try { m = JSON.parse(raw); } catch { return; }
      c.seen = Date.now();
      if (c.pid) { if (m.t === 'ping') tx(c, 'r', '{"t":"pong"}'); else handle(c.pid, m); return; }
      if (m.t !== 'hello') return;
      const p = game.addPlayer(m.name);          // erst jetzt, mit offenem Spielkanal, zählt der Gast als verbunden
      if (!p) { tx(c, 'r', '{"t":"full"}'); return setTimeout(() => drop(c), 500); }
      c.pid = p.id; byPlayer.set(p.id, c);
      for (const o of [{ t: 'welcome', id: p.id, name: p.name, max: L.C.MAX }, game.roundMsg(), game.roster()]) tx(c, 'r', JSON.stringify(o));
      if (game.result && game.phase === 'result') tx(c, 'r', JSON.stringify(game.result));
    }
    async function accept(from, sdp) {
      const old = peers.get(from); if (old) drop(old);
      const p = new RTCPeerConnection({ iceServers: await getIce(), iceTransportPolicy: FORCE_RELAY ? 'relay' : 'all' });
      const c = { from, p, r: null, u: null, pid: 0, seen: Date.now(), gone: false };
      peers.set(from, c);
      p.ondatachannel = e => {
        const dc = e.channel; if (dc.label !== 'r' && dc.label !== 'u') return;
        c[dc.label] = dc; dc.onmessage = ev => fromPeer(c, ev.data);
        if (dc.label === 'r') dc.onclose = () => drop(c);
      };
      p.onconnectionstatechange = () => { if (p.connectionState === 'failed' || p.connectionState === 'closed') drop(c); };
      try {
        await p.setRemoteDescription(sdp);
        await p.setLocalDescription(await p.createAnswer());
        await gathered(p, FORCE_RELAY ? 6000 : 2500);
        await api('signal', { id: room, to: from, data: { sdp: { type: 'answer', sdp: p.localDescription.sdp } } });
        setTimeout(() => { if (!c.pid) drop(c); }, 25000);
      } catch { drop(c); }
    }
    let polling = false, lastPoll = 0;
    async function poll() {
      if (polling) return; polling = true;
      try {
        const j = await api('poll', { id: room, n: game.players.size, run: game.phase !== 'lobby' });
        if (j.gone) { room = (await api('create', { name })).id; $('roomCode').textContent = room; toast('Die Baustelle hat einen neuen Code: ' + room); }
        for (const m of j.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'offer' && /^[a-f0-9]{12}$/.test(m.from)) accept(m.from, m.data.sdp);
      } catch { }
      polling = false;
    }
    let last = performance.now(), acc = 0;
    function tick() {
      const now = performance.now();
      acc = Math.min(acc + (now - last) / 1000, 0.25); last = now;
      let stepped = false;
      while (acc >= L.C.TICK) { game.step(L.C.TICK); acc -= L.C.TICK; stepped = true; }
      if (stepped) {
        const s = JSON.stringify(game.snapshot()), t = Date.now();
        onMsg(JSON.parse(s));
        for (const c of [...peers.values()]) {
          if (c.pid && t - c.seen > 8000) { drop(c); continue; }
          if (c.pid) tx(c, c.u && c.u.readyState === 'open' ? 'u' : 'r', s);
        }
      }
      if (now - lastPoll > 1000) { lastPoll = now; poll(); }
    }
    // Taktgeber im Worker: läuft weiter, wenn das Fenster des Hosts im Hintergrund liegt.
    let worker = null, timer = 0;
    try { worker = new Worker('tick.js'); worker.onmessage = tick; worker.onerror = () => { worker = null; timer = setInterval(tick, 50); }; }
    catch { timer = setInterval(tick, 50); }
    addEventListener('pagehide', () => {
      try { navigator.sendBeacon('api.php?a=close', JSON.stringify({ tok, id: room })); } catch { }
      for (const c of peers.values()) try { c.p.close(); } catch { }
    });
    const pairs = () => Promise.all([...byPlayer.values()].map(c => selectedPair(c.p)));
    return { game, handle, pairs, input: (x, y) => game.setInput(myId, x, y), get peers() { return byPlayer.size; }, stop() { if (worker) worker.terminate(); clearInterval(timer); } };
  }
  // Ausgewähltes ICE-Kandidatenpaar: zeigt, ob wirklich über TURN (relay) gesendet wird
  async function selectedPair(conn = pc) {
    if (!conn) return null;
    const stats = await conn.getStats(); let pair = null;
    stats.forEach(s => { if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId); });
    if (!pair) stats.forEach(s => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') pair = s; });
    if (!pair) return null;
    const l = stats.get(pair.localCandidateId) || {}, r = stats.get(pair.remoteCandidateId) || {};
    return { local: l.candidateType, remote: r.candidateType, protocol: l.protocol, relayProtocol: l.relayProtocol || null, url: l.url || null, bytesSent: pair.bytesSent, bytesReceived: pair.bytesReceived };
  }
  const sendR = o => { if (host) host.handle(myId, o); else if (chR && chR.readyState === 'open') chR.send(JSON.stringify(o)); };
  setInterval(() => { if (connected && !host) sendR({ t: 'ping', n: 0 }); }, 2000); // Lebenszeichen, auch wenn der Tab im Hintergrund nicht zeichnet
  const act = k => { if (connected && !document.querySelector('.overlay.on')) sendR({ t: 'act', k }); };

  // ---------------------------------------------------------------- Nachrichten vom Server
  const plateFrom = (a, old) => ({ id: a[0], state: a[1], holder: a[2], cx: a[3], cy: a[4], rot: a[5], tx: a[6], ty: a[7], fx: a[8], fy: a[9], rails: a.length > 10 ? a[10] : old.rails, since: performance.now(),
    px: old ? old.px : a[3] + 0.5, py: old ? old.py : a[4] + 0.5, z: old ? old.z : 0, spin: old && old.rot !== a[5] ? 1 : old ? old.spin : 0 });
  function regrid() { grid = new Int16Array(map.W * map.H).fill(-1); for (const pl of plates) if (pl.state === 'ground' || pl.state === 'reach') grid[pl.cy * map.W + pl.cx] = pl.id; }
  function onMsg(m) {
    if (m.t === 's') {
      timeLeft = m.tl; lastSnap = performance.now();
      const seen = new Set();
      for (const a of m.ps) {
        seen.add(a[0]);
        let e = ents.get(a[0]);
        if (!e) { e = { x: a[1], y: a[2], z: 0, wob: 0, sink: 0 }; ents.set(a[0], e); }
        if (Math.hypot(a[1] - e.x, a[2] - e.y) > 3 || (e.st === 2 && a[4] !== 2)) { e.x = a[1]; e.y = a[2]; }
        if (a[4] === 1 && e.st !== 1) e.air = performance.now();
        e.tx = a[1]; e.ty = a[2]; e.face = a[3]; e.st = a[4]; e.ride = a[5]; e.hold = a[6]; e.cd = a[7];
      }
      for (const id of ents.keys()) if (!seen.has(id)) ents.delete(id);
    } else if (m.t === 'p') {
      const old = plates[m.p[0]]; if (!old) return;
      plates[m.p[0]] = plateFrom(m.p, old); regrid();
    } else if (m.t === 'round') {
      map = m.map; map.fixed = Uint8Array.from(m.map.fixed, c => +c);
      plates = []; for (const a of m.plates) plates[a[0]] = plateFrom(a, null);
      regrid(); phase = m.phase; fit();
    } else if (m.t === 'roster') {
      const before = phase;
      phase = m.phase; botsAllowed = m.bots;
      meta.clear(); for (const p of m.ps) meta.set(p.id, p);
      if (phase !== 'result' && before === 'result') show('result', false);
      if (phase === 'countdown') show('result', false);
      renderRoster();
    } else if (m.t === 'msg') toast(m.text);
    else if (m.t === 'result') { result = m; renderResult(); }
    else if (m.t === 'pong') lastSnap = performance.now();
  }
  const col = (c, l = 54, s = 82) => 'hsl(' + ((c * 137.5) % 360).toFixed(0) + ' ' + s + '% ' + l + '%)';
  const stampTxt = st => ['●', '■', '▲'].map((ch, i) => (st & (1 << i) ? ch : '·')).join('');
  function renderRoster() {
    document.body.classList.toggle('playing', phase === 'play' || phase === 'countdown');
    $('rosterTitle').textContent = phase === 'lobby' ? 'Lobby · ' + meta.size + '/48' : 'Kräne · ' + meta.size;
    const list = [...meta.values()].sort((a, b) => (b.id === myId) - (a.id === myId) || a.id - b.id);
    $('players').replaceChildren(...list.map(p => {
      const li = document.createElement('li'); if (p.id === myId) li.className = 'me';
      const b = document.createElement('b'); b.style.background = col(p.c);
      const s = document.createElement('span'); s.textContent = p.name + (p.id === myId ? ' (du)' : '');
      li.append(b, s);
      if (p.bot) { const e = document.createElement('em'); e.textContent = 'BOT'; li.append(e); }
      if (phase !== 'lobby') { const sm = document.createElement('small'); sm.textContent = stampTxt(p.st); li.append(sm); }
      return li;
    }));
    const me = meta.get(myId), st = me ? me.st : 0;
    document.querySelectorAll('#stamps i').forEach((el, i) => el.classList.toggle('has', !!(st & (1 << i))));
    $('start').disabled = meta.size < 2;
    $('startHint').textContent = meta.size < 2 ? 'Es fehlt ein zweiter Kran. Allein ist das kein Rennen.' : 'Bis dahin: freies Fahren. Brücken bauen geht schon.';
    $('botRow').hidden = !botsAllowed;
  }
  function renderResult() {
    const w = result.rank[0], mine = result.winner === myId;
    $('resTitle').textContent = mine ? 'Du bist raus. Im guten Sinn.' : w.name + ' gewinnt';
    $('resWhy').textContent = { tor: w.name + ' hat drei Stempel und den Ausgang gefunden.', zeit: 'Zeit abgelaufen. ' + w.name + ' hat die meisten Stempel.', los: 'Niemand hat gestempelt. Das Los vom Rundenstart entscheidet: ' + w.name + '.', allein: 'Alle anderen sind weg. ' + w.name + ' gewinnt mangels Konkurrenz.' }[result.reason] || '';
    $('resRank').replaceChildren(...result.rank.map(p => { const li = document.createElement('li'); li.textContent = p.name + '  ' + stampTxt(p.st); if (p.bot) { const e = document.createElement('em'); e.textContent = 'BOT'; li.append(e); } return li; }));
    show('result', true);
  }

  // ---------------------------------------------------------------- Eingabe
  const KEYMAP = { KeyW: 'u', ArrowUp: 'u', KeyS: 'd', ArrowDown: 'd', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Enter') act('grab');
    else if (e.code === 'Space') { act('grab'); e.preventDefault(); }
    else if (e.code === 'KeyR') act('home');
    else if (e.code === 'KeyH') show('help', !$('help').classList.contains('on'));
    else if (e.code === 'Escape') show('help', false);
  });
  addEventListener('keyup', e => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
  addEventListener('blur', () => keys.clear());
  const stick = { on: false, id: -1, x: 0, y: 0 };
  function stickMove(e) {
    const r = $('stick').getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), m = r.width / 2 - 20, len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / m);
    stick.x = dx / len * k; stick.y = dy / len * k;
    $('stick').firstElementChild.style.transform = 'translate(' + stick.x * m + 'px,' + stick.y * m + 'px)';
  }
  $('stick').addEventListener('pointerdown', e => { stick.on = true; stick.id = e.pointerId; $('stick').setPointerCapture(e.pointerId); stickMove(e); e.preventDefault(); });
  $('stick').addEventListener('pointermove', e => { if (stick.on && e.pointerId === stick.id) stickMove(e); });
  const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.on = false; stick.x = stick.y = 0; $('stick').firstElementChild.style.transform = ''; };
  $('stick').addEventListener('pointerup', stickEnd); $('stick').addEventListener('pointercancel', stickEnd);
  for (const [id, k] of [['tGrab', 'grab'], ['tHome', 'home']]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); act(k); });
  addEventListener('touchstart', () => { if (connected) $('touch').hidden = false; }, { passive: true });
  function pumpInput(now) {
    let x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0), y = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0);
    if (stick.on) { x = Math.abs(stick.x) > 0.2 ? stick.x : 0; y = Math.abs(stick.y) > 0.2 ? stick.y : 0; }
    if (document.querySelector('.overlay.on')) x = y = 0;
    input.x = x; input.y = y;
    const s = x.toFixed(2) + ',' + y.toFixed(2);
    if (!connected || (s === lastSent && now - lastSentAt < 400) || now - lastSentAt < 45) return;
    lastSent = s; lastSentAt = now;
    if (host) return host.input(+x.toFixed(2), +y.toFixed(2));
    const msg = JSON.stringify({ t: 'in', x: +x.toFixed(2), y: +y.toFixed(2) });
    if (chU && chU.readyState === 'open') chU.send(msg); else if (chR && chR.readyState === 'open') chR.send(msg);
  }

  $('joinForm').addEventListener('submit', e => { e.preventDefault(); connect(); });
  $('retry').onclick = connect; $('reconnect').onclick = connect;
  $('createBtn').onclick = createRoom;
  $('copyLink').onclick = async () => { const url = location.origin + location.pathname + '?raum=' + room; try { await navigator.clipboard.writeText(url); toast('Einladungslink kopiert.'); } catch { prompt('Einladungslink:', url); } };
  // Beitrittsseite: im Host-Modell offene Baustellen zeigen
  $('createBtn').hidden = !HOSTED; $('rooms').hidden = !HOSTED;
  $('joinBtn').hidden = HOSTED && !room;
  if (HOSTED && room) $('joinBtn').textContent = 'Baustelle ' + room + ' beitreten';
  async function listRooms() {
    if (!HOSTED || connected || connecting || document.hidden) return;
    let j; try { j = await api('list', {}); } catch { return; }
    const ls = j.ls || [];
    $('noRooms').hidden = ls.length > 0;
    $('roomList').replaceChildren(...ls.map(l => {
      const li = document.createElement('li'), s = document.createElement('span'), b = document.createElement('button');
      s.textContent = l.name + ' · ' + l.id + ' · ' + l.n + '/' + (j.max || 48) + (l.run ? ' · läuft' : '');
      b.type = 'button'; b.textContent = l.n >= (j.max || 48) ? 'Voll' : 'Beitreten'; b.disabled = l.n >= (j.max || 48); b.dataset.room = l.id;
      b.onclick = () => { room = l.id; connect(); };
      li.append(s, b); return li;
    }));
  }
  listRooms(); setInterval(listRooms, 3000);
  $('start').onclick = () => sendR({ t: 'start' }); $('again').onclick = () => sendR({ t: 'start' });
  $('toLobby').onclick = () => show('result', false);
  $('botsAdd').onclick = () => sendR({ t: 'bots', n: 3 }); $('botsOff').onclick = () => sendR({ t: 'bots', n: 0 });
  $('helpBtn').onclick = () => show('help', true); $('helpClose').onclick = () => show('help', false);
  try { $('name').value = localStorage.getItem('myground-name') || ''; } catch { }

  // ---------------------------------------------------------------- Zeichnen
  const cv = $('arena'), g = cv.getContext('2d'), FONT = getComputedStyle(document.body).fontFamily;
  let cw = 0, ch = 0, T = 40, cam = { x: 10.5, y: 6.5 }, follow = false;
  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cw = innerWidth; ch = innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Wd = map ? map.W : 21, Hd = map ? map.H : 13, side = cw > 900 ? 230 : 0;
    const f = Math.min((cw - side - 16) / (Wd + 1.7), (ch - 70) / ((Hd + 2) * K));
    follow = f < 30; T = follow ? 36 : Math.floor(Math.min(f, 74));   // ganze Pixel: Platten schließen sauber aneinander
    if (!follow) cam = { x: Wd / 2 - side / T / 2, y: Hd / 2 - 0.35 / K };
    DPR = dpr; sprites.clear();
    vignette = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, cw / 2, ch / 2, Math.hypot(cw, ch) * 0.62);
    vignette.addColorStop(0, 'rgba(6,12,48,0)'); vignette.addColorStop(1, 'rgba(6,12,48,.4)');
  }
  // Platten, Schatten und Muster werden einmal je Größe vorgezeichnet und danach nur noch kopiert.
  let DPR = 1, vignette = null;
  const sprites = new Map();
  function sprite(key, w, h, draw) {
    let c = sprites.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR);
      const x = c.getContext('2d'); x.scale(DPR, DPR); draw(x, w, h); c.w = c.width / DPR; c.h = c.height / DPR; sprites.set(key, c);
    }
    return c;
  }
  const rng = a => () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const snap = v => Math.round(v * DPR) / DPR;
  addEventListener('resize', fit); fit();
  const P = (x, y, z = 0) => [(x - cam.x) * T + cw / 2, (y - cam.y) * T * K + ch / 2 - z * T];
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  const INK = '#3a2718';
  // Bastelkarton: feste Platten naturbraun, bewegliche gelb gestrichen mit roten Anschlagpunkten; die Kante zeigt Wellpappe.
  const PAL = {
    fix: ['#e0b486', '#d6a878', '#e6bd92', '#cf9f6f'],
    plate: ['#f6bf3c', '#f1b22c', '#f9c84e'],
    held: ['#ffd564', '#ffcf54', '#ffdc78'],
  };
  // Gemalte Sprites (myground/img). Bis sie geladen sind, gilt die gezeichnete Ersatzdarstellung.
  const IMG = {}; let imgReady = false;
  {
    const names = ['kran_s', 'kran_f', 'kran_b', 'platte_fix', 'platte_gelb', 'planke', 'planke_s', 'tor', 'fahne', 'stempel0', 'stempel1', 'stempel2']; let left = names.length;
    for (const n of names) { const i = new Image(); i.onload = () => { if (!--left) { imgReady = true; sprites.clear(); } }; i.src = 'img/' + n + '.webp'; IMG[n] = i; }
  }
  // Kran-Ansichten: Aufstandspunkt (ax, ay) und Seilpunkt (tx, ty) im Bild; KPPU Bildpunkte entsprechen einer Plattenbreite
  const KRAN = { s: { img: 'kran_s', ax: 130.8, ay: 264, tx: 307.6, ty: 42 }, f: { img: 'kran_f', ax: 93.2, ay: 282.8, tx: 94.4, ty: 184.8 }, b: { img: 'kran_b', ax: 94.4, ay: 282.8, tx: 94.4, ty: 12.8 } }, KPPU = 226, LIFT = 0.3;
  function tileSprite(kind, v) {
    const w = T, h = T * K, d = THICK * T;
    if (imgReady) return sprite('i' + kind + v, w + 2, h + d + 3, x => {
      const im = IMG[kind === 'fix' ? 'platte_fix' : 'platte_gelb'];
      x.translate(1, 1);
      x.save(); if (v & 1) { x.translate(w, 0); x.scale(-1, 1); } x.drawImage(im, 0, 0, w, h + d); x.restore();   // jede zweite gespiegelt, damit es nicht gestempelt aussieht
      x.fillStyle = kind === 'held' ? 'rgba(255,255,255,.2)' : ['rgba(255,255,255,.07)', 'rgba(60,30,0,.07)', 'rgba(255,255,255,0)', 'rgba(60,30,0,.04)'][v % 4]; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(60,35,15,.45)'; x.lineWidth = 1; x.strokeRect(0.5, 0.5, w - 1, h - 1);                                   // Fuge
      x.strokeStyle = 'rgba(255,246,228,.35)'; x.beginPath(); x.moveTo(1.5, h - 2); x.lineTo(1.5, 1.5); x.lineTo(w - 2, 1.5); x.stroke();
    });
    return sprite(kind + v, w + 2, h + d + 3, x => {
      const rnd = rng(v * 977 + kind.length * 131 + 7), raw = kind === 'fix', base = PAL[kind][v % PAL[kind].length];
      const R = (a, b, c, e, r) => { x.beginPath(); x.roundRect(a, b, c, e, r); };
      x.translate(1, 1); x.lineCap = 'round';
      // Kante: zwei Lagen Wellpappe mit Welle und Deckpapier
      x.fillStyle = '#8f5f38'; R(0, h - 5, w, d + 5, 3); x.fill();
      x.save(); R(0, h - 3, w, d + 3, 3); x.clip();
      const gr = x.createLinearGradient(0, h, 0, h + d); gr.addColorStop(0, '#c48e5b'); gr.addColorStop(1, '#93613a');
      x.fillStyle = gr; x.fillRect(0, h - 3, w, d + 3);
      const lh = d / 2, amp = lh * 0.26, wl = T * 0.12, paper = Math.max(1.5, lh * 0.22);
      for (let l = 0; l < 2; l++) {
        const y0 = h + l * lh;
        x.strokeStyle = 'rgba(74,44,20,.7)'; x.lineWidth = Math.max(1, T * 0.022); x.beginPath();
        for (let a = 0; a <= w; a++) { const yy = y0 + (lh - paper) * 0.5 + Math.sin(a / wl * Math.PI * 2) * amp; if (a) x.lineTo(a, yy); else x.moveTo(a, yy); }
        x.stroke();
        x.fillStyle = l ? '#b98352' : '#dcae7d'; x.fillRect(0, y0 + lh - paper, w, paper);
      }
      x.fillStyle = 'rgba(40,20,5,.22)'; x.fillRect(0, h - 3, w, 4);                              // Schatten unter der Deckfläche
      x.restore();
      // Deckfläche: Licht von links oben, Papierfasern
      x.fillStyle = base; R(0, 0, w, h, 3); x.fill();
      x.save(); R(0, 0, w, h, 3); x.clip();
      const lg = x.createLinearGradient(0, 0, w, h); lg.addColorStop(0, 'rgba(255,255,255,.18)'); lg.addColorStop(1, 'rgba(90,50,10,.14)');
      x.fillStyle = lg; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        const ax = rnd() * w, ay = rnd() * h, l = 1 + rnd() * T * 0.07;
        x.strokeStyle = rnd() < 0.6 ? 'rgba(110,70,30,' + (0.08 + rnd() * 0.16) + ')' : 'rgba(255,244,222,' + (0.18 + rnd() * 0.28) + ')';
        x.lineWidth = 0.6 + rnd() * 0.8; x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + l, ay + (rnd() - 0.5) * 1.6); x.stroke();
      }
      if (!raw) {                                                                                  // abgewetzte Farbe: am Rand scheint die Pappe durch
        x.fillStyle = 'rgba(216,170,122,.8)';
        for (let i = 0; i < 9; i++) { const e = rnd() * 4 | 0, t = rnd(), ax = e === 1 ? w - 1 : e === 3 ? 1 : t * w, ay = e === 0 ? 1 : e === 2 ? h - 1 : t * h; x.beginPath(); x.ellipse(ax, ay, 1.5 + rnd() * T * 0.07, 1 + rnd() * T * 0.035, 0, 0, 7); x.fill(); }
      }
      x.restore();
      x.strokeStyle = 'rgba(52,62,128,.4)'; x.lineWidth = 1; R(0.5, 0.5, w - 1, h - 1, 3); x.stroke();                           // Bleistiftfuge
      x.strokeStyle = 'rgba(255,246,228,.6)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(1.6, h - 3); x.lineTo(1.6, 2.6); x.lineTo(w - 3, 1.6); x.stroke();   // Lichtkante
      if (!raw) {                                                                                  // rote Anschlagpunkte für die Seile
        const m = Math.max(5, T * 0.15), r = Math.max(2.5, T * 0.085);
        for (const [ax, ay] of [[m, m * K], [w - m, m * K], [m, h - m * K], [w - m, h - m * K]]) {
          x.fillStyle = 'rgba(90,40,10,.35)'; x.beginPath(); x.ellipse(ax + 0.8, ay + 1.4, r, r * K, 0, 0, 7); x.fill();
          x.fillStyle = '#d8432f'; x.beginPath(); x.ellipse(ax, ay, r, r * K, 0, 0, 7); x.fill();
          x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(ax - r * 0.25, ay - r * 0.3, r * 0.4, r * 0.25, 0, 0, 7); x.fill();
          x.fillStyle = '#7a1f12'; x.beginPath(); x.ellipse(ax, ay, r * 0.36, r * 0.36 * K, 0, 0, 7); x.fill();
        }
      }
    });
  }
  function tile(x, y, z, kind, v, hot) {
    const [px, py] = P(x, y, z), sx = snap(px), sy = snap(py), s = tileSprite(kind, v);
    g.drawImage(s, sx - 1, sy - 1, s.w, s.h);
    if (hot) { g.strokeStyle = INK; g.lineWidth = 6; rr(sx + 2, sy + 2, T - 4, T * K - 4, 4); g.stroke(); g.strokeStyle = hot; g.lineWidth = 3; g.stroke(); }
  }
  // Blaupause als Untergrund: feines Raster, das mit der Kamera wandert, dazu ein paar Konstruktionslinien
  function blueprint() {
    const cell = Math.max(9, Math.round(T / 3)), n = 5, s = sprite('bp', cell * n, cell * n, (x, w) => {
      x.fillStyle = '#27418f'; x.fillRect(0, 0, w, w);
      x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1; x.beginPath();
      for (let i = 1; i < n; i++) { x.moveTo(i * cell + 0.5, 0); x.lineTo(i * cell + 0.5, w); x.moveTo(0, i * cell + 0.5); x.lineTo(w, i * cell + 0.5); }
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.17)'; x.beginPath(); x.moveTo(0.5, 0); x.lineTo(0.5, w); x.moveTo(0, 0.5); x.lineTo(w, 0.5); x.stroke();
    });
    if (!s.pat) s.pat = g.createPattern(s, 'repeat');
    const [ox, oy] = P(0, 0);
    s.pat.setTransform(new DOMMatrix().translate(Math.round(ox), Math.round(oy)).scale(1 / DPR));
    g.fillStyle = s.pat; g.fillRect(0, 0, cw, ch);
    if (!map) return;
    g.strokeStyle = 'rgba(255,255,255,.26)'; g.lineWidth = 1.5; g.setLineDash([7, 6]);
    for (const [wx, wy, r] of [[-2.6, 1.2, 1.7], [map.W + 2.6, 2.4, 1.3], [map.W + 2.2, map.H - 0.5, 2], [-2.2, map.H + 0.4, 1.4]]) {
      const [sx, sy] = P(wx, wy);
      g.beginPath(); g.arc(sx, sy, r * T, 0, 7); g.moveTo(sx - r * T * 1.25, sy); g.lineTo(sx + r * T * 1.25, sy); g.moveTo(sx, sy - r * T * 1.25); g.lineTo(sx, sy + r * T * 1.25); g.stroke();
    }
    const [x0, y0] = P(-0.45, -0.45), [x1, y1] = P(map.W + 0.45, map.H + 0.45 + THICK / K);
    g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.setLineDash([]);                                    // Baufeld mit Maßlinie
    g.beginPath(); g.moveTo(x0, y1 + 14); g.lineTo(x1, y1 + 14); for (const a of [x0, x1]) { g.moveTo(a, y1 + 8); g.lineTo(a, y1 + 20); } g.stroke();
    g.font = '700 ' + Math.max(10, T * 0.22) + 'px ' + FONT; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.4)'; g.fillText(map.W + ' × ' + map.H, (x0 + x1) / 2, y1 + 14 + Math.max(13, T * 0.3));
  }
  // Weiche Schatten aller liegenden Platten auf dem Papier. Erst in eine eigene Ebene, damit sich Nachbarn nicht doppelt abdunkeln.
  let shLayer = null;
  function shadows() {
    if (!shLayer || shLayer.width !== cv.width || shLayer.height !== cv.height) { shLayer = document.createElement('canvas'); shLayer.width = cv.width; shLayer.height = cv.height; }
    const c = shLayer.getContext('2d'); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, cw, ch);
    const pad = Math.ceil(T * 0.3), s = sprite('sh', T + pad * 2, T * K + pad * 2, x => { x.filter = 'blur(' + (T * 0.08 * DPR).toFixed(1) + 'px)'; x.fillStyle = '#070d33'; x.fillRect(pad, pad, T, T * K); });
    const ox = T * 0.2 - pad, oy = THICK * T + T * 0.2 - pad;
    for (let y = 0; y < map.H; y++) for (let x = 0; x < map.W; x++) if (map.fixed[y * map.W + x] || grid[y * map.W + x] >= 0) { const [px, py] = P(x, y); c.drawImage(s, px + ox, py + oy, s.w, s.h); }
    g.globalAlpha = 0.55; g.drawImage(shLayer, 0, 0, cw, ch); g.globalAlpha = 1;
  }
  function rails(x, y, z, mask) {
    if (!mask) return;
    if (imgReady) {
      const [px, py] = P(x, y, z), w = T, h = T * K, a = IMG.planke, bw = w * 0.96, bh = bw * a.height / a.width, q = IMG.planke_s, sh = h + T * 0.3, sw = sh * q.width / q.height;
      if (mask & 1) g.drawImage(a, px + (w - bw) / 2, py + T * 0.1 - bh, bw, bh);
      if (mask & 8) g.drawImage(q, px - sw * 0.25, py + h - sh, sw, sh);
      if (mask & 2) g.drawImage(q, px + w - sw * 0.75, py + h - sh, sw, sh);
      if (mask & 4) g.drawImage(a, px + (w - bw) / 2, py + h - bh, bw, bh);
      return;
    }
    const [sx, sy] = P(x, y, z), w = T, h = T * K, b = Math.max(4, T * 0.12), up = T * 0.16;
    const bar = (x0, y0, x1, y1) => {
      g.lineCap = 'round';
      g.strokeStyle = INK; g.lineWidth = b + 4; g.beginPath(); g.moveTo(x0, y0 - up); g.lineTo(x1, y1 - up); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y0 - up); g.moveTo(x1, y1); g.lineTo(x1, y1 - up); g.stroke();
      g.strokeStyle = '#f4f1e8'; g.lineWidth = b; g.beginPath(); g.moveTo(x0, y0 - up); g.lineTo(x1, y1 - up); g.stroke();
      g.strokeStyle = '#e23d2e'; g.setLineDash([b * 1.3, b * 1.3]); g.lineCap = 'butt'; g.beginPath(); g.moveTo(x0, y0 - up); g.lineTo(x1, y1 - up); g.stroke(); g.setLineDash([]);
    };
    if (mask & 1) bar(sx + 6, sy + 4, sx + w - 6, sy + 4);
    if (mask & 8) bar(sx + 4, sy + 6, sx + 4, sy + h - 6);
    if (mask & 2) bar(sx + w - 4, sy + 6, sx + w - 4, sy + h - 6);
    if (mask & 4) bar(sx + 6, sy + h - 4, sx + w - 6, sy + h - 4);
  }
  const rotMask = (m, r) => ((m << r) | (m >> (4 - r))) & 15;
  const STC = ['#e23d2e', '#2b6fe0', '#1f9d55'];
  function stampShape(i, cx, cy, r) {
    g.beginPath();
    if (i === 0) g.arc(cx, cy, r, 0, 7); else if (i === 1) g.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7); else { g.moveTo(cx, cy - r); g.lineTo(cx + r, cy + r * 0.8); g.lineTo(cx - r, cy + r * 0.8); g.closePath(); }
  }
  function station(i, s, now) {
    const [sx, sy] = P(s.x + 0.5, s.y + 0.5), have = (meta.get(myId) || {}).st & (1 << i), r = T * 0.3, live = !have && phase !== 'lobby';
    const ell = (rx, oy = 0) => { g.beginPath(); g.ellipse(sx, sy + oy, rx, rx * K, 0, 0, 7); };
    if (live) { const q = (now / 1100 + i * 0.33) % 1; g.strokeStyle = STC[i]; g.globalAlpha = 0.7 * (1 - q); g.lineWidth = 3; ell(T * (0.42 + 0.3 * q)); g.stroke(); g.globalAlpha = 1; }   // Signalring
    if (imgReady) { const im = IMG['stempel' + i], w = T * 0.9, h = w * im.height / im.width; g.globalAlpha = have ? 0.45 : 1; g.drawImage(im, sx - w / 2, sy - h * 0.45, w, h); g.globalAlpha = 1; }
    else {
    g.fillStyle = INK; ell(T * 0.44, 2); g.fill();
    g.fillStyle = '#f7f4ea'; ell(T * 0.4); g.fill();
    g.strokeStyle = STC[i]; g.globalAlpha = have ? 0.3 : 1; g.lineWidth = Math.max(2, T * 0.055); ell(T * 0.33); g.stroke();
    g.save(); g.translate(sx, sy); g.scale(1, K); g.fillStyle = STC[i]; stampShape(i, 0, 0, r * 0.62); g.fill(); g.restore(); g.globalAlpha = 1;
    }
    if (!live) return;
    const u = T * 1.3, bob = Math.sin(now / 300 + i * 2) * u * 0.05, y = sy - u * 0.72 + bob;        // schwebender Stempel
    g.fillStyle = 'rgba(0,0,0,.28)'; ell(T * 0.2 - bob * 0.5); g.fill();
    g.fillStyle = INK; rr(sx - u * 0.2, y - 2, u * 0.4, u * 0.18 + 4, 5); g.fill();
    g.fillStyle = STC[i]; rr(sx - u * 0.2 + 2, y, u * 0.4 - 4, u * 0.18, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; rr(sx - u * 0.2 + 4, y + 2, u * 0.4 - 8, u * 0.045, 2); g.fill();
    g.fillStyle = INK; rr(sx - u * 0.08 - 2, y - u * 0.26, u * 0.16 + 4, u * 0.28, 5); g.fill();
    g.fillStyle = '#c9905a'; rr(sx - u * 0.08, y - u * 0.26 + 2, u * 0.16, u * 0.24, 4); g.fill();
    g.fillStyle = 'rgba(255,255,255,.3)'; rr(sx - u * 0.06, y - u * 0.26 + 4, u * 0.04, u * 0.18, 2); g.fill();
  }
  function gate(s, now) {
    const [sx, sy] = P(s.x + 0.5, s.y + 0.5), open = (meta.get(myId) || {}).st === 7, w = T * 0.5, h = T * 1.2, pw = Math.max(8, T * 0.16);
    g.fillStyle = open ? 'rgba(55,200,113,' + (0.5 + 0.3 * Math.sin(now / 150)) + ')' : 'rgba(16,22,29,.5)'; g.beginPath(); g.ellipse(sx, sy, T * 0.46, T * 0.46 * K, 0, 0, 7); g.fill();
    if (open) { const gr = g.createLinearGradient(0, sy - h, 0, sy); gr.addColorStop(0, 'rgba(55,200,113,0)'); gr.addColorStop(1, 'rgba(55,200,113,.5)'); g.fillStyle = gr; g.fillRect(sx - w, sy - h, w * 2, h); }   // Lichtschleuse
    if (imgReady) {
      const im = IMG.tor, iw = T * 1.3, ih = iw * im.height / im.width, top = sy + T * 0.26 - ih;
      g.drawImage(im, sx - iw / 2, top, iw, ih);
      g.font = '900 ' + Math.max(10, T * 0.24) + 'px ' + FONT; g.textAlign = 'center'; g.fillStyle = open ? '#7dffb0' : '#f4f1e8'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
      g.strokeText('AUSGANG', sx, top - T * 0.08); g.fillText('AUSGANG', sx, top - T * 0.08);
      return;
    }
    for (const k of [-1, 1]) {
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(sx + k * w, sy + 2, pw * 0.9, pw * 0.45, 0, 0, 7); g.fill();
      g.fillStyle = INK; rr(sx + k * w - pw / 2, sy - h, pw, h + 3, 4); g.fill();
      g.fillStyle = '#ffc21a'; rr(sx + k * w - pw / 2 + 2, sy - h + 2, pw - 4, h - 1, 3); g.fill();
      g.fillStyle = INK; for (let j = 1; j < 5; j += 2) g.fillRect(sx + k * w - pw / 2 + 2, sy - h + 2 + (h - 1) * j / 5, pw - 4, (h - 1) / 5);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(sx + k * w - pw / 2 + 3, sy - h + 3, 2, h - 4);
    }
    g.fillStyle = INK; rr(sx - w - pw / 2 - 2, sy - h - T * 0.3, w * 2 + pw + 4, T * 0.34, 5); g.fill();
    const n = 6, bw = (w * 2 + pw) / n, bh = (T * 0.34 - 4) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? INK : '#f4f1e8'; g.fillRect(sx - w - pw / 2 + i * bw, sy - h - T * 0.3 + 2 + j * bh, bw, bh); }
    g.font = '900 ' + Math.max(10, T * 0.24) + 'px ' + FONT; g.textAlign = 'center'; g.fillStyle = open ? '#7dffb0' : '#f4f1e8'; g.strokeStyle = INK; g.lineWidth = 4; g.lineJoin = 'round';
    g.strokeText('AUSGANG', sx, sy - h - T * 0.4); g.fillText('AUSGANG', sx, sy - h - T * 0.4);
  }
  function crane(id, e, now) {
    const m = meta.get(id) || { name: '?', c: 0 }, mine = id === myId, c = m.c;
    const fallen = e.st === 2;
    e.sink = fallen ? Math.min(1, e.sink + 0.04) : 0;
    const jump = e.st === 1 ? Math.sin(Math.min(1, (now - (e.air || now)) / 420) * Math.PI) * 0.55 : 0;
    const rideZ = e.ride >= 0 && plates[e.ride] ? plates[e.ride].z + 0.02 : 0;
    const z = jump + rideZ - e.sink * 1.4, sc = 1 - e.sink * 0.6;
    const [gx, gy] = P(e.x, e.y, Math.max(0, rideZ)), [sx, sy0] = P(e.x, e.y, z);
    if (e.sink >= 1) return;
    g.globalAlpha = 1 - e.sink * 0.7;
    const u = T * 1.2, mv = Math.min(1, e.wob);
    if (!fallen) { g.fillStyle = 'rgba(40,20,5,.38)'; g.beginPath(); g.ellipse(gx, gy + u * 0.07, u * 0.4 * (1 - jump * 0.4), u * 0.24 * (1 - jump * 0.4), 0, 0, 7); g.fill(); }
    if (mine && !fallen) { g.lineWidth = 5; g.strokeStyle = INK; g.beginPath(); g.ellipse(gx, gy + u * 0.05, u * 0.47, u * 0.32, 0, 0, 7); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 5]); g.lineDashOffset = -now / 40; g.stroke(); g.setLineDash([]); }
    if (e.ride >= 0 && plates[e.ride] && meta.get(plates[e.ride].holder)) { g.strokeStyle = col(meta.get(plates[e.ride].holder).c); g.lineWidth = 4; g.beginPath(); g.ellipse(gx, gy + u * 0.05, u * 0.4, u * 0.26, 0, 0, 7); g.stroke(); }
    const d = DIRS[e.face || 0], V = e.face === 0 ? KRAN.b : e.face === 2 ? KRAN.f : KRAN.s, flip = e.face === 3 ? -1 : 1, ks = T / KPPU * 1.05;
    let tipX = sx + d[0] * T * 0.5, tipY = sy0 - T;
    if (imgReady) {
      const im = IMG[V.img], sp = sprite('k' + V.img + c, im.width * ks, im.height * ks, (x, w, h) => {      // weißer Pappkran, in der Spielerfarbe eingefärbt
        x.drawImage(im, 0, 0, w, h); x.globalCompositeOperation = 'multiply'; x.fillStyle = col(c, 62, 88); x.fillRect(0, 0, w, h);
        x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0, w, h);
      });
      const hop = Math.abs(Math.sin(now / 70 + id)) * mv * T * 0.025;                                         // rumpelt beim Fahren
      g.save(); g.translate(sx, sy0 - hop); g.scale(sc * flip, sc); g.rotate(Math.sin(now / 80 + id * 2) * mv * 0.025);
      g.drawImage(sp, -V.ax * ks, -V.ay * ks, im.width * ks, im.height * ks); g.restore();
      tipX = sx + flip * (V.tx - V.ax) * ks; tipY = sy0 + (V.ty - V.ay) * ks;
    }
    // Seil: hängt vom Ausleger, bei gegriffener Platte an deren vier Ecken
    const pl = e.hold >= 0 ? plates[e.hold] : null;
    if (!fallen) {
      g.lineCap = 'round';
      const rope = (ax, ay, bx, by2) => { g.strokeStyle = INK; g.lineWidth = Math.max(3.5, u * 0.075); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by2); g.stroke(); g.strokeStyle = '#ecdcb4'; g.lineWidth = Math.max(1.8, u * 0.04); g.stroke(); };   // Kordel
      if (pl) {
        const [qx, qy] = P(pl.px, pl.py, pl.z);
        if (pl.state === 'reach') { const k = Math.min(1, (now - pl.since) / (REACH * 1000)); rope(tipX, tipY, tipX + (qx - tipX) * k, tipY + (qy - tipY) * k); }
        else for (const [ox, oy] of [[-0.38, -0.36], [0.38, -0.36], [-0.38, 0.36], [0.38, 0.36]]) rope(tipX, tipY, qx + ox * T, qy + oy * T * K);
      } else if (V === KRAN.s) {                                                                              // leerer Haken (Vorder- und Rückansicht bringen ihren mit)
        const hy = tipY + T * 0.4; rope(tipX, tipY, tipX, hy);
        g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.arc(tipX, hy + u * 0.05, u * 0.055, -Math.PI / 2, Math.PI); g.stroke(); g.strokeStyle = '#ffc21a'; g.lineWidth = 2.5; g.stroke();
      }
    }
    g.globalAlpha = 1;
    if (fallen) return;
    const fs = Math.max(10, Math.min(14, T * 0.24)), label = (mine ? '▼ ' : '') + m.name;
    g.font = '700 ' + fs + 'px ' + FONT; g.textAlign = 'center';
    const tw = g.measureText(label).width + 10, ly = sy0 - T * 1.42;
    g.fillStyle = mine ? '#fff' : INK; rr(sx - tw / 2, ly - fs, tw, fs + 5, 5); g.fill();
    g.fillStyle = col(c, 50); g.fillRect(sx - tw / 2 + 2, ly + 2, tw - 4, 2);
    g.fillStyle = mine ? INK : '#f4f1e8'; g.fillText(label, sx, ly);
    if (e.ride >= 0) { g.font = '700 ' + (fs - 1) + 'px sans-serif'; g.fillStyle = '#ffc21a'; g.strokeStyle = INK; g.lineWidth = 3; g.strokeText('fährt mit', sx, ly - fs - 3); g.fillText('fährt mit', sx, ly - fs - 3); }
  }

  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
    pumpInput(now);
    blueprint();
    if (!map) { requestAnimationFrame(frame); return; }
    const k = 1 - Math.exp(-dt * 16);
    for (const e of ents.values()) { const mv = Math.hypot(e.tx - e.x, e.ty - e.y); e.wob += ((mv > 0.02 ? 1 : 0) - e.wob) * 0.15; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
    const me = ents.get(myId);
    if (follow && me) { cam.x += (me.x - cam.x) * 0.12; cam.y += (me.y - cam.y) * 0.12; }
    for (const pl of plates) { // Plattenposition aus Zustand ableiten
      let tx = pl.cx + 0.5, ty = pl.cy + 0.5, tz = 0;
      const h = ents.get(pl.holder);
      if (pl.state === 'held' && h) { tx = h.x + DIRS[h.face][0]; ty = h.y + DIRS[h.face][1]; tz = LIFT; }
      else if (pl.state === 'drop') { const q = Math.min(1, (now - pl.since) / (DROP * 1000)); tx = pl.fx + (pl.tx + 0.5 - pl.fx) * q; ty = pl.fy + (pl.ty + 0.5 - pl.fy) * q; tz = LIFT * (1 - q); pl.px = tx; pl.py = ty; }
      const kk = pl.state === 'held' ? 1 - Math.exp(-dt * 22) : 1;
      pl.px += (tx - pl.px) * kk; pl.py += (ty - pl.py) * kk; pl.z += (tz - pl.z) * (1 - Math.exp(-dt * 18)); pl.spin *= Math.exp(-dt * 12);
    }
    shadows();
    // Vorschau: welche Platte würde ich greifen, wo würde ich ablegen
    let hot = -1, dropCell = null, dropOk = false;
    if (me && me.st === 0 && me.ride < 0 && (phase === 'play' || phase === 'lobby')) {
      const cx = Math.floor(me.tx) + DIRS[me.face][0], cy = Math.floor(me.ty) + DIRS[me.face][1], inb = cx >= 0 && cy >= 0 && cx < map.W && cy < map.H;
      if (me.hold >= 0 && plates[me.hold] && plates[me.hold].state === 'held') { dropCell = [cx, cy]; dropOk = inb && !map.fixed[cy * map.W + cx] && grid[cy * map.W + cx] < 0 && !plates.some(p => p.state === 'drop' && p.tx === cx && p.ty === cy); }
      else if (me.hold < 0 && inb && grid[cy * map.W + cx] >= 0 && plates[grid[cy * map.W + cx]].state === 'ground' && !(me.cd > 0)) hot = grid[cy * map.W + cx];
    }
    const myCol = col((meta.get(myId) || { c: 0 }).c, 60);
    for (let y = 0; y < map.H; y++) for (let x = 0; x < map.W; x++) {
      const i = y * map.W + x;
      if (map.fixed[i]) { tile(x, y, 0, 'fix', (x * 7 + y * 13) % 4); }
      else if (grid[i] >= 0) {
        const pl = plates[grid[i]], hc = pl.state === 'reach' && meta.get(pl.holder) ? col(meta.get(pl.holder).c, 58) : null;
        tile(x, y, 0, 'plate', pl.id % 3, hc || (hot === pl.id ? myCol : null));
        rails(x, y, 0, rotMask(pl.rails, pl.rot));
        if (hc && Math.sin(now / 50) > 0) { const [sx, sy] = P(x, y); g.strokeStyle = '#fff'; g.lineWidth = 2; rr(sx + 5, sy + 5, T - 10, T * K - 10, 3); g.stroke(); }
      }
      if (dropCell && dropCell[0] === x && dropCell[1] === y) { // Ablageort
        const [sx, sy] = P(x, y);
        g.strokeStyle = dropOk ? '#37c871' : '#e23d2e'; g.fillStyle = dropOk ? 'rgba(55,200,113,.22)' : 'rgba(226,61,46,.2)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.lineDashOffset = -now / 40;
        rr(sx + 3, sy + 3, T - 6, T * K - 6, 5); g.fill(); g.stroke(); g.setLineDash([]);
        if (dropOk) { g.globalAlpha = 0.55; rails(x, y, 0, rotMask(plates[me.hold].rails, plates[me.hold].rot)); g.globalAlpha = 1; }
        else { g.beginPath(); g.moveTo(sx + T * 0.3, sy + T * K * 0.3); g.lineTo(sx + T * 0.7, sy + T * K * 0.7); g.moveTo(sx + T * 0.7, sy + T * K * 0.3); g.lineTo(sx + T * 0.3, sy + T * K * 0.7); g.stroke(); }
      }
    }
    map.stations.forEach((s, i) => station(i, s, now));
    if (imgReady) for (const fx of [1.4, map.W - 1.6]) { const im = IMG.fahne, [ax, ay] = P(fx, 0.4), fh = T * 0.95, fw = fh * im.width / im.height; g.drawImage(im, ax - fw * 0.08, ay - fh, fw, fh); }
    // markante Schatten unter angehobenen Platten
    for (const pl of plates) if (pl.z > 0.03) { const [sx, sy] = P(pl.px - 0.5, pl.py - 0.5); g.fillStyle = 'rgba(7,13,51,' + (0.25 + 0.25 * Math.min(1, pl.z / 0.6)) + ')'; rr(sx + T * 0.2, sy + THICK * T + T * 0.2, T, T * K, 6); g.fill(); }
    const list = [];
    for (const pl of plates) if (pl.state === 'held' || pl.state === 'drop') list.push({ k: pl.py + 0.44, pl });
    for (const [id, e] of ents) list.push({ k: e.ride >= 0 && plates[e.ride] ? plates[e.ride].py + 0.45 + (e.y - plates[e.ride].py) * 0.01 : e.y, id, e });
    list.push({ k: map.gate.y + 0.5, gate: 1 });
    list.sort((a, b) => a.k - b.k);
    for (const it of list) {
      if (it.gate) gate(map.gate, now);
      else if (it.pl) {
        const pl = it.pl, hm = meta.get(pl.holder);
        g.save();
        if (pl.spin > 0.01) { const [mx, my] = P(pl.px, pl.py, pl.z); g.translate(mx, my); g.rotate(-pl.spin * Math.PI / 2); g.translate(-mx, -my); }
        tile(pl.px - 0.5, pl.py - 0.5, pl.z, 'held', pl.id % 3, hm ? col(hm.c, 58) : '#fff');
        rails(pl.px - 0.5, pl.py - 0.5, pl.z, rotMask(pl.rails, pl.rot));
        g.restore();
      } else crane(it.id, it.e, now);
    }
    if (vignette) { g.fillStyle = vignette; g.fillRect(0, 0, cw, ch); }
    // Uhr und Countdown
    const tm = $('timer');
    if (phase === 'play') { const s = Math.max(0, Math.ceil(timeLeft)); tm.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); tm.classList.toggle('late', s <= 30); }
    else { tm.textContent = phase === 'lobby' ? 'Lobby' : phase === 'result' ? 'Ergebnis' : 'Gleich'; tm.classList.remove('late'); }
    $('count').hidden = phase !== 'countdown';
    if (phase === 'countdown') $('count').textContent = Math.max(1, Math.ceil(timeLeft));
    if (me) $('tGrab').textContent = me.hold >= 0 ? 'Ablegen' : 'Greifen';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Für automatische Tests und Diagnose
  window.__mg = { hostPairs: () => host ? host.pairs() : Promise.resolve([]), get state() { return { connected, myId, phase, room, hosting: !!host, peers: host ? host.peers : 0, timeLeft, route, players: meta.size, me: ents.get(myId) || null, stamps: (meta.get(myId) || {}).st || 0, result, plates: plates.map(p => ({ id: p.id, state: p.state, holder: p.holder, cx: p.cx, cy: p.cy, rot: p.rot })) }; }, selectedPair, map: () => map, ents: () => [...ents].map(([id, e]) => ({ id, x: e.tx, y: e.ty, st: e.st, ride: e.ride, hold: e.hold, face: e.face })) };
})();
