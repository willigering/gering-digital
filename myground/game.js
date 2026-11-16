'use strict';
// „Der Boden ist gekündigt“ – Browser-Client.
// Standard (wie bei Rüdiger): Der Browser, der eine Baustelle eröffnet, ist der Host. Er rechnet das
// Spiel mit logic.js, alle anderen verbinden sich per WebRTC nur mit ihm (Stern, kein Vollmesh).
// Die Anmeldung läuft über api.php. Ist in config.js ein Spielserver eingetragen, übernimmt der die Host-Rolle.
(() => {
  const $ = id => document.getElementById(id);
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const REACH = 0.4, DROP = 0.3, K = 0.76, THICK = 0.2;
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
    try { if (!localStorage.getItem('myground-help')) { show('help', true); localStorage.setItem('myground-help', '1'); } } catch { }
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
      else if (m.t === 'act' && ['grab', 'rot', 'jump'].includes(m.k)) game.act(pid, m.k);
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
    $('startHint').textContent = meta.size < 2 ? 'Es fehlt ein zweiter Kran. Allein kündigt sich kein Boden.' : 'Bis dahin: freies Fahren. Die Platten funktionieren schon.';
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
    else if (e.code === 'KeyR' || e.code === 'KeyQ') act('rot');
    else if (e.code === 'Space') { act('jump'); e.preventDefault(); }
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
  for (const [id, k] of [['tGrab', 'grab'], ['tRot', 'rot'], ['tJump', 'jump']]) $(id).addEventListener('pointerdown', e => { e.preventDefault(); act(k); });
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
  const cv = $('arena'), g = cv.getContext('2d');
  let cw = 0, ch = 0, T = 40, cam = { x: 10.5, y: 6.5 }, follow = false;
  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    cw = innerWidth; ch = innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const Wd = map ? map.W : 21, Hd = map ? map.H : 13, side = cw > 900 ? 230 : 0;
    const f = Math.min((cw - side - 16) / (Wd + 1.7), (ch - 70) / ((Hd + 2) * K));
    follow = f < 30; T = follow ? 36 : Math.min(f, 74);
    if (!follow) cam = { x: Wd / 2 - side / T / 2, y: Hd / 2 - 0.35 / K };
  }
  addEventListener('resize', fit); fit();
  const P = (x, y, z = 0) => [(x - cam.x) * T + cw / 2, (y - cam.y) * T * K + ch / 2 - z * T];
  function rr(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  function tile(x, y, z, top, edge, front, fixed, hot) {
    const [sx, sy] = P(x, y, z), w = T, h = T * K, d = THICK * T;
    g.fillStyle = '#0b0f14'; rr(sx - 1, sy - 1, w + 2, h + d + 2, 5); g.fill();          // dicke dunkle Kante
    g.fillStyle = front; rr(sx + 1, sy + h - 4, w - 2, d + 3, 4); g.fill();
    g.fillStyle = edge; rr(sx + 1, sy + 1, w - 2, h - 2, 4); g.fill();
    g.fillStyle = top; rr(sx + 4, sy + 3, w - 8, h - 8, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.34)'; rr(sx + 6, sy + 5, w - 12, Math.max(2, h * 0.14), 2); g.fill(); // Lackglanz
    if (fixed) { g.fillStyle = 'rgba(20,28,36,.55)'; for (const [ax, ay] of [[9, 8], [w - 9, 8], [9, h - 9], [w - 9, h - 9]]) { g.beginPath(); g.arc(sx + ax, sy + ay, Math.max(1.4, T * 0.035), 0, 7); g.fill(); } }
    if (hot) { g.strokeStyle = hot; g.lineWidth = 3; rr(sx + 2, sy + 2, w - 4, h - 4, 4); g.stroke(); }
  }
  function rails(x, y, z, mask) {
    if (!mask) return;
    const [sx, sy] = P(x, y, z), w = T, h = T * K, b = Math.max(4, T * 0.12), up = T * 0.16;
    const bar = (x0, y0, x1, y1) => {
      g.lineCap = 'round';
      g.strokeStyle = '#0b0f14'; g.lineWidth = b + 4; g.beginPath(); g.moveTo(x0, y0 - up); g.lineTo(x1, y1 - up); g.stroke();
      g.strokeStyle = '#0b0f14'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y0 - up); g.moveTo(x1, y1); g.lineTo(x1, y1 - up); g.stroke();
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
    const [sx, sy] = P(s.x + 0.5, s.y + 0.5), have = (meta.get(myId) || {}).st & (1 << i), r = T * 0.3;
    g.fillStyle = '#fff'; g.strokeStyle = '#0b0f14'; g.lineWidth = 3; g.beginPath(); g.ellipse(sx, sy, T * 0.4, T * 0.4 * K, 0, 0, 7); g.fill(); g.stroke();
    g.save(); g.translate(sx, sy); g.scale(1, K); g.fillStyle = STC[i]; g.globalAlpha = have ? 0.3 : 1; stampShape(i, 0, 0, r * 0.8); g.fill(); g.restore();
    if (have || phase === 'lobby') return;
    const bob = Math.sin(now / 300 + i * 2) * T * 0.05, y = sy - T * 0.75 + bob;                    // schwebender Stempel
    g.fillStyle = '#0b0f14'; rr(sx - T * 0.2, y - 2, T * 0.4, T * 0.18 + 4, 4); g.fill();
    g.fillStyle = STC[i]; rr(sx - T * 0.2 + 2, y, T * 0.4 - 4, T * 0.18, 3); g.fill();
    g.fillStyle = '#0b0f14'; rr(sx - T * 0.08 - 2, y - T * 0.26, T * 0.16 + 4, T * 0.28, 4); g.fill();
    g.fillStyle = '#c9905a'; rr(sx - T * 0.08, y - T * 0.26 + 2, T * 0.16, T * 0.24, 3); g.fill();
  }
  function gate(s, now) {
    const [sx, sy] = P(s.x + 0.5, s.y + 0.5), open = (meta.get(myId) || {}).st === 7, w = T * 0.44, h = T * 0.95;
    g.fillStyle = open ? 'rgba(55,200,113,' + (0.5 + 0.3 * Math.sin(now / 150)) + ')' : 'rgba(16,22,29,.5)'; g.beginPath(); g.ellipse(sx, sy, T * 0.42, T * 0.42 * K, 0, 0, 7); g.fill();
    for (const k of [-1, 1]) { g.fillStyle = '#0b0f14'; rr(sx + k * w - 5, sy - h, 10, h + 3, 3); g.fill(); g.fillStyle = '#ffc21a'; rr(sx + k * w - 3, sy - h + 2, 6, h - 1, 2); g.fill(); }
    g.fillStyle = '#0b0f14'; rr(sx - w - 6, sy - h - T * 0.26, w * 2 + 12, T * 0.3, 4); g.fill();
    const n = 6, bw = (w * 2 + 8) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#0b0f14' : '#f4f1e8'; g.fillRect(sx - w - 4 + i * bw, sy - h - T * 0.26 + 2 + j * (T * 0.13 - 2), bw, T * 0.13 - 2); }
    g.font = '900 ' + Math.max(9, T * 0.2) + 'px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center'; g.fillStyle = '#f4f1e8'; g.strokeStyle = '#0b0f14'; g.lineWidth = 3;
    g.strokeText('AUSGANG', sx, sy - h - T * 0.34); g.fillText('AUSGANG', sx, sy - h - T * 0.34);
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
    if (!fallen) { g.fillStyle = 'rgba(0,0,0,.34)'; g.beginPath(); g.ellipse(gx, gy + T * 0.05, T * 0.32 * (1 - jump * 0.4), T * 0.2 * (1 - jump * 0.4), 0, 0, 7); g.fill(); }
    if (mine && !fallen) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash([6, 5]); g.lineDashOffset = -now / 40; g.beginPath(); g.ellipse(gx, gy + T * 0.04, T * 0.43, T * 0.3, 0, 0, 7); g.stroke(); g.setLineDash([]); }
    if (e.ride >= 0 && plates[e.ride] && meta.get(plates[e.ride].holder)) { g.strokeStyle = col(meta.get(plates[e.ride].holder).c); g.lineWidth = 4; g.beginPath(); g.ellipse(gx, gy + T * 0.04, T * 0.36, T * 0.24, 0, 0, 7); g.stroke(); }
    g.save(); g.translate(sx, sy0); g.scale(sc, sc);
    const u = T, wob = Math.sin(now / 55 + id) * Math.min(1, e.wob) * u * 0.035, tilt = Math.sin(now / 80 + id * 2) * Math.min(1, e.wob) * 0.07;
    g.fillStyle = '#0b0f14';                                                   // dicke Gummiräder
    for (const [wx, wy] of [[-0.27, -0.1], [0.27, -0.1], [-0.27, 0.14], [0.27, 0.14]]) { rr(wx * u - u * 0.1, wy * u - u * 0.09, u * 0.2, u * 0.2, u * 0.07); g.fill(); }
    g.fillStyle = '#8b96a1'; for (const [wx, wy] of [[-0.27, 0.14], [0.27, 0.14]]) { g.beginPath(); g.arc(wx * u, wy * u + u * 0.01, u * 0.04, 0, 7); g.fill(); }
    g.fillStyle = '#0b0f14'; rr(-u * 0.27, -u * 0.26, u * 0.54, u * 0.36, u * 0.07); g.fill();   // Fahrgestell
    g.fillStyle = col(c, 40); rr(-u * 0.27 + 2, -u * 0.26 + 2, u * 0.54 - 4, u * 0.36 - 4, u * 0.06); g.fill();
    g.save(); g.translate(wob, -u * 0.3 - Math.abs(wob) * 0.5); g.rotate(tilt);                    // wackelnde Kabine
    g.fillStyle = '#0b0f14'; rr(-u * 0.2, -u * 0.22, u * 0.4, u * 0.36, u * 0.08); g.fill();
    g.fillStyle = col(c, 56); rr(-u * 0.2 + 2, -u * 0.22 + 2, u * 0.4 - 4, u * 0.36 - 4, u * 0.07); g.fill();
    g.fillStyle = 'rgba(255,255,255,.4)'; rr(-u * 0.16, -u * 0.19, u * 0.32, u * 0.06, 2); g.fill();
    const d = DIRS[e.face || 0];
    g.fillStyle = '#0b0f14'; rr(-u * 0.12 + d[0] * u * 0.05, -u * 0.12 + (d[1] > 0 ? u * 0.05 : d[1] < 0 ? -u * 0.03 : 0), u * 0.24, u * 0.15, 3); g.fill();
    g.fillStyle = d[1] < 0 ? col(c, 30) : '#bfe6ff'; rr(-u * 0.12 + d[0] * u * 0.05 + 2, -u * 0.12 + (d[1] > 0 ? u * 0.05 : d[1] < 0 ? -u * 0.03 : 0) + 2, u * 0.24 - 4, u * 0.15 - 4, 2); g.fill();
    g.fillStyle = '#0b0f14'; g.beginPath(); g.arc(0, -u * 0.24, u * 0.07, 0, 7); g.fill();          // Rundumleuchte
    g.fillStyle = Math.sin(now / 120 + id) > 0 ? '#fff3a8' : col(c, 62, 95); g.beginPath(); g.arc(0, -u * 0.24, u * 0.045, 0, 7); g.fill();
    g.restore();
    g.restore();
    // Ausleger: zeigt in Blickrichtung, bei gegriffener Platte bis über die Platte
    const pl = e.hold >= 0 ? plates[e.hold] : null;
    let tipX = sx + d[0] * T * 0.42, tipY = sy0 - T * 0.55 + d[1] * T * 0.42 * K, hookY = tipY + T * 0.16;
    if (pl && !fallen) { const k = pl.state === 'reach' ? Math.min(1, (now - pl.since) / (REACH * 1000)) : 1, [qx, qy] = P(pl.px, pl.py, pl.z); tipX = sx + (qx - sx) * k; tipY = sy0 - T * 0.55 + (qy - T * 0.55 - (sy0 - T * 0.55)) * k; hookY = tipY + (qy - tipY) * k; }
    if (!fallen) {
      g.lineCap = 'round';
      g.strokeStyle = '#0b0f14'; g.lineWidth = Math.max(5, T * 0.13); g.beginPath(); g.moveTo(sx, sy0 - T * 0.5); g.lineTo(tipX, tipY); g.stroke();
      g.strokeStyle = col(c, 62); g.lineWidth = Math.max(2.5, T * 0.07); g.beginPath(); g.moveTo(sx, sy0 - T * 0.5); g.lineTo(tipX, tipY); g.stroke();
      g.strokeStyle = '#0b0f14'; g.lineWidth = 2; g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX, hookY); g.stroke();
      if (pl && pl.state !== 'reach') { const [qx, qy] = P(pl.px, pl.py, pl.z); for (const [ox, oy] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) { g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(qx + ox * T, qy + oy * T * K); g.stroke(); } }
      else { g.fillStyle = '#0b0f14'; g.beginPath(); g.arc(tipX, hookY, 3.5, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    if (fallen) return;
    const fs = Math.max(10, Math.min(14, T * 0.24)), label = (mine ? '▼ ' : '') + m.name;
    g.font = '700 ' + fs + 'px ' + getComputedStyle(document.body).fontFamily; g.textAlign = 'center';
    const tw = g.measureText(label).width + 10, ly = sy0 - T * 0.95;
    g.fillStyle = mine ? '#fff' : '#0b0f14'; rr(sx - tw / 2, ly - fs, tw, fs + 5, 5); g.fill();
    g.fillStyle = col(c, 50); g.fillRect(sx - tw / 2 + 2, ly + 2, tw - 4, 2);
    g.fillStyle = mine ? '#0b0f14' : '#f4f1e8'; g.fillText(label, sx, ly);
    if (e.ride >= 0) { g.font = '700 ' + (fs - 1) + 'px sans-serif'; g.fillStyle = '#ffc21a'; g.strokeStyle = '#0b0f14'; g.lineWidth = 3; g.strokeText('fährt mit', sx, ly - fs - 3); g.fillText('fährt mit', sx, ly - fs - 3); }
  }

  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
    pumpInput(now);
    g.fillStyle = '#18212b'; g.fillRect(0, 0, cw, ch);
    if (!map) { requestAnimationFrame(frame); return; }
    const k = 1 - Math.exp(-dt * 16);
    for (const e of ents.values()) { const mv = Math.hypot(e.tx - e.x, e.ty - e.y); e.wob += ((mv > 0.02 ? 1 : 0) - e.wob) * 0.15; e.x += (e.tx - e.x) * k; e.y += (e.ty - e.y) * k; }
    const me = ents.get(myId);
    if (follow && me) { cam.x += (me.x - cam.x) * 0.12; cam.y += (me.y - cam.y) * 0.12; }
    for (const pl of plates) { // Plattenposition aus Zustand ableiten
      let tx = pl.cx + 0.5, ty = pl.cy + 0.5, tz = 0;
      const h = ents.get(pl.holder);
      if (pl.state === 'held' && h) { tx = h.x + DIRS[h.face][0]; ty = h.y + DIRS[h.face][1]; tz = 0.62; }
      else if (pl.state === 'drop') { const q = Math.min(1, (now - pl.since) / (DROP * 1000)); tx = pl.fx + (pl.tx + 0.5 - pl.fx) * q; ty = pl.fy + (pl.ty + 0.5 - pl.fy) * q; tz = 0.62 * (1 - q); pl.px = tx; pl.py = ty; }
      const kk = pl.state === 'held' ? 1 - Math.exp(-dt * 22) : 1;
      pl.px += (tx - pl.px) * kk; pl.py += (ty - pl.py) * kk; pl.z += (tz - pl.z) * (1 - Math.exp(-dt * 18)); pl.spin *= Math.exp(-dt * 12);
    }
    // Baugrube
    const [x0, y0] = P(-0.6, -0.6), [x1, y1] = P(map.W + 0.6, map.H + 0.9);
    g.fillStyle = '#0d1319'; rr(x0, y0, x1 - x0, y1 - y0, 18); g.fill();
    g.strokeStyle = '#ffc21a'; g.lineWidth = 4; g.setLineDash([16, 12]); rr(x0, y0, x1 - x0, y1 - y0, 18); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= map.W; x++) { const [a, b] = P(x, 0), [c2, d2] = P(x, map.H); g.moveTo(a, b + T * 0.3); g.lineTo(c2, d2 + T * 0.3); }
    for (let y = 0; y <= map.H; y++) { const [a, b] = P(0, y), [c2, d2] = P(map.W, y); g.moveTo(a, b + T * 0.3); g.lineTo(c2, d2 + T * 0.3); }
    g.stroke();
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
      if (map.fixed[i]) tile(x, y, 0, '#cfd6dd', '#7d8894', '#4a545e', true);
      else if (grid[i] >= 0) {
        const pl = plates[grid[i]], hc = pl.state === 'reach' && meta.get(pl.holder) ? col(meta.get(pl.holder).c, 58) : null;
        tile(x, y, 0, pl.id % 3 ? '#ffb22e' : '#ffa01a', '#b86a05', '#8f4f00', false, hc || (hot === pl.id ? myCol : null));
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
    // markante Schatten unter angehobenen Platten
    for (const pl of plates) if (pl.z > 0.03) { const [sx, sy] = P(pl.px - 0.5, pl.py - 0.5); g.fillStyle = 'rgba(0,0,0,' + (0.2 + 0.3 * Math.min(1, pl.z / 0.6)) + ')'; rr(sx + 2, sy + T * 0.16, T - 4, T * K - 2, 8); g.fill(); }
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
        tile(pl.px - 0.5, pl.py - 0.5, pl.z, '#ffc04d', '#b86a05', '#8f4f00', false, hm ? col(hm.c, 58) : '#fff');
        rails(pl.px - 0.5, pl.py - 0.5, pl.z, rotMask(pl.rails, pl.rot));
        g.restore();
      } else crane(it.id, it.e, now);
    }
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
