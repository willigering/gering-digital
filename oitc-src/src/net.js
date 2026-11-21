// Mehrspieler-Netzwerk: Lobby-Liste und Verbindungsaufbau über api.php (PHP-Webspace),
// danach laufen alle Spieldaten per WebRTC direkt zwischen den Browsern.
// Stern-Topologie: Der Lobby-Ersteller (Host, pid 0) ist mit jedem Gast verbunden und leitet
// Nachrichten weiter. Jede weitergeleitete Nachricht trägt den Absender in `p`.
export const MAXP = 4;
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }] };
const tok = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const API = new URL('api.php', location.href).href;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const api = (a, body) => fetch(API + '?a=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', body: JSON.stringify(Object.assign({ tok }, body)) }).then((r) => r.json());
let iceReady = null;
const loadIce = () => iceReady || (iceReady = Promise.race([api('ice', {}).then((r) => { if (r && Array.isArray(r.ice) && r.ice.length) ICE.iceServers = ICE.iceServers.concat(r.ice); }).catch(() => {}), sleep(4000)]));
const iceDone = (pc) => new Promise((res) => {
  if (pc.iceGatheringState === 'complete') return res();
  const t = setTimeout(res, 2500);
  pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } });
});
const plainSdp = (d) => ({ sdp: { type: d.type, sdp: d.sdp } });

export const Net = {
  role: null,          // null | 'host' | 'client'
  pid: -1, lobby: null, roster: [], running: false,
  onRoster: null, onMsg: null, onStart: null, onLeft: null, onClosed: null,
  async list() { const r = await api('list', {}); return r.ls || []; },
};
let peers = new Map();   // Host: from -> { pc, r, u, pid, name }
let link = null;         // Gast: { pc, r, u }
let pollT = 0;
let busy = false;

function rosterMsg() { return { t: 'roster', list: Net.roster.map((p) => ({ pid: p.pid, name: p.name })) }; }
function hostBroadcast(m, except = null, unrel = false) {
  const s = JSON.stringify(m);
  for (const p of peers.values()) {
    if (p === except || p.pid < 0) continue;
    const ch = unrel && p.u && p.u.readyState === 'open' ? p.u : p.r;
    if (ch && ch.readyState === 'open') try { ch.send(s); } catch (e) { /* Kanal schließt gerade */ }
  }
}

// Nachricht an alle anderen Spieler (Gast -> Host -> alle, Host -> alle)
Net.send = (m, unrel = false) => {
  if (Net.role === 'host') { m.p = 0; hostBroadcast(m, null, unrel); return; }
  if (Net.role === 'client' && link) {
    const ch = unrel && link.u.readyState === 'open' ? link.u : link.r;
    if (ch.readyState === 'open') try { ch.send(JSON.stringify(m)); } catch (e) { /* ignorieren */ }
  }
};

function clientMsg(m) {
  if (m.t === 'hi') { Net.pid = m.pid; Net.roster = m.list || []; if (Net.onRoster) Net.onRoster(Net.roster); return; }
  if (m.t === 'roster') { Net.roster = m.list || []; if (Net.onRoster) Net.onRoster(Net.roster); return; }
  if (m.t === 'start') { Net.running = true; Net.roster = m.list || Net.roster; if (Net.onStart) Net.onStart(m.list || Net.roster); return; }
  if (m.t === 'left') { if (Net.onLeft) Net.onLeft(m.pid); return; }
  if (Net.onMsg) Net.onMsg(m);
}

// ---- Gast ----
Net.join = async (id, name) => {
  if (busy || Net.role) throw new Error('Du bist schon in einer Lobby.');
  busy = true; let pc;
  try {
    await loadIce();
    pc = new RTCPeerConnection(ICE);
    const r = pc.createDataChannel('r'), u = pc.createDataChannel('u', { ordered: false, maxRetransmits: 0 });
    let open = false; r.onopen = () => { open = true; };
    r.onmessage = u.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } clientMsg(m); };
    await pc.setLocalDescription(await pc.createOffer()); await iceDone(pc);
    const s = await api('signal', { id, to: 'host', data: plainSdp(pc.localDescription) });
    if (s.gone) throw new Error('Diese Lobby gibt es nicht mehr.');
    if (s.err) throw new Error(s.err);
    for (let i = 0; i < 30 && !open; i++) {
      await sleep(600);
      if (open || pc.remoteDescription) continue;
      const p = await api('poll', { id });
      if (p.gone) throw new Error('Diese Lobby gibt es nicht mehr.');
      for (const m of p.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'answer' && !pc.remoteDescription) await pc.setRemoteDescription(m.data.sdp);
    }
    for (let i = 0; i < 20 && !open && pc.remoteDescription; i++) await sleep(300);
    if (!open) throw new Error(pc.remoteDescription ? 'Verbindung fehlgeschlagen – Netzwerk blockiert die Verbindung (WLAN statt Mobilfunk probieren).' : 'Der Host antwortet nicht.');
    link = { pc, r, u }; Net.role = 'client'; Net.lobby = { id }; Net.running = false;
    const lost = () => { if (link && link.pc === pc) { Net.leave(); if (Net.onClosed) Net.onClosed('Verbindung zum Host verloren.'); } };
    r.onclose = lost; pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') lost(); };
    r.send(JSON.stringify({ t: 'j', name }));
  } catch (e) { try { if (pc) pc.close(); } catch (x) { /* ignorieren */ } busy = false; throw e; }
  busy = false;
};

// ---- Host ----
function hostHandle(peer, m) {
  if (m.t === 'j') {
    peer.name = String(m.name || 'Soldat').replace(/[\x00-\x1f<>]/g, '').slice(0, 14) || 'Soldat';
    const e = Net.roster.find((p) => p.pid === peer.pid);
    if (e) e.name = peer.name; else Net.roster.push({ pid: peer.pid, name: peer.name });
    hostBroadcast(rosterMsg());
    if (Net.onRoster) Net.onRoster(Net.roster);
    return;
  }
  m.p = peer.pid;
  hostBroadcast(m, peer, m.t === 's');
  if (Net.onMsg) Net.onMsg(m);
}
function dropPeer(from, peer) {
  if (peers.get(from) !== peer) return;
  peers.delete(from);
  try { peer.pc.close(); } catch (e) { /* ignorieren */ }
  if (peer.pid >= 0) {
    Net.roster = Net.roster.filter((p) => p.pid !== peer.pid);
    hostBroadcast({ t: 'left', pid: peer.pid }); hostBroadcast(rosterMsg());
    if (Net.onLeft) Net.onLeft(peer.pid);
    if (Net.onRoster) Net.onRoster(Net.roster);
  }
}
async function onOffer(from, sdp) {
  if (Net.running) return;
  if (peers.has(from)) { try { peers.get(from).pc.close(); } catch (e) { /* ignorieren */ } peers.delete(from); }
  const used = new Set(Net.roster.map((p) => p.pid));
  let pid = -1; for (let i = 1; i < MAXP; i++) if (!used.has(i)) { pid = i; break; }
  if (pid < 0) return;
  const pc = new RTCPeerConnection(ICE), peer = { pc, r: null, u: null, pid: -1, name: '' };
  peers.set(from, peer);
  const drop = () => dropPeer(from, peer);
  pc.ondatachannel = (e) => {
    const ch = e.channel;
    ch.onmessage = (ev) => { if (peer.pid < 0 || typeof ev.data !== 'string' || ev.data.length > 1500) return; let m; try { m = JSON.parse(ev.data); } catch (x) { return; } hostHandle(peer, m); };
    if (ch.label === 'u') { peer.u = ch; return; }
    peer.r = ch;
    const up = () => {
      if (peer.pid >= 0) return;
      if (Net.running || Net.roster.length >= MAXP) { try { pc.close(); } catch (x) { /* ignorieren */ } return; }
      peer.pid = pid; Net.roster.push({ pid, name: 'Soldat' });
      ch.send(JSON.stringify({ t: 'hi', pid, list: Net.roster }));
    };
    ch.onopen = up; ch.onclose = drop; if (ch.readyState === 'open') up();
  };
  pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed' || pc.connectionState === 'closed') drop(); };
  try {
    await pc.setRemoteDescription(sdp); await pc.setLocalDescription(await pc.createAnswer()); await iceDone(pc);
    if (Net.role === 'host') await api('signal', { id: Net.lobby.id, to: from, data: plainSdp(pc.localDescription) });
  } catch (e) { drop(); }
}
function hostPoll() {
  if (Net.role !== 'host') return;
  const id = Net.lobby.id;
  api('poll', { id, n: Net.roster.length, run: Net.running }).then(async (r) => {
    if (Net.role !== 'host' || Net.lobby.id !== id) return;
    if (r.gone) { const c = await api('create', { name: Net.roster[0].name }); if (Net.role === 'host' && c.id) { Net.lobby = { id: c.id, name: c.name }; } return; }
    for (const m of r.msgs || []) if (m.data && m.data.sdp && m.data.sdp.type === 'offer') onOffer(m.from, m.data.sdp);
  }).catch(() => {});
}
Net.host = async (name) => {
  if (busy || Net.role) throw new Error('Du bist schon in einer Lobby.');
  busy = true;
  try {
    loadIce();
    const r = await api('create', { name });
    if (!r.id) throw new Error(r.err || 'Lobby konnte nicht erstellt werden.');
    Net.role = 'host'; Net.pid = 0; Net.lobby = { id: r.id, name: r.name }; Net.running = false;
    Net.roster = [{ pid: 0, name }];
    peers = new Map(); pollT = setInterval(hostPoll, 1200);
  } finally { busy = false; }
  if (Net.onRoster) Net.onRoster(Net.roster);
};
Net.start = () => {
  if (Net.role !== 'host' || Net.running || Net.roster.length < 2) return false;
  Net.running = true;
  hostBroadcast({ t: 'start', list: Net.roster.map((p) => ({ pid: p.pid, name: p.name })) });
  if (Net.onStart) Net.onStart(Net.roster);
  hostPoll();
  return true;
};
Net.leave = () => {
  clearInterval(pollT);
  if (Net.role === 'host') {
    try { fetch(API + '?a=close', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tok, id: Net.lobby.id }) }).catch(() => {}); } catch (e) { /* ignorieren */ }
    for (const p of peers.values()) { try { p.pc.close(); } catch (e) { /* ignorieren */ } }
    peers = new Map();
  }
  if (link) { const l = link; link = null; try { l.pc.close(); } catch (e) { /* ignorieren */ } }
  Net.role = null; Net.pid = -1; Net.lobby = null; Net.roster = []; Net.running = false;
};
