'use strict';
// Spielserver für „Der Boden ist gekündigt“.
// HTTP: Gastsitzung + ICE-Konfiguration ausgeben, SDP-Angebot annehmen. Danach läuft alles über
// WebRTC-Datenkanäle zwischen Browser und diesem Server (Stern, kein Vollmesh).
//
// Umgebungsvariablen (alle optional):
//   PORT              HTTP-Port (Standard 8787)
//   ALLOWED_ORIGINS   kommagetrennte Liste erlaubter Herkünfte (Standard: geringdigital.de + localhost)
//   CF_TURN_ID / CF_TURN_KEY  Cloudflare-TURN-Schlüssel: Server erzeugt selbst kurzlebige Zugangsdaten
//   ICE_ISSUER_URL    sonst: bestehende Ausgabestelle kurzlebiger Zugangsdaten (Standard: speed/api.php?a=ice)
//   ICE_TTL           Gültigkeit der selbst erzeugten Zugangsdaten in Sekunden (Standard 7200)
//   SERVER_TURN=1     Server nutzt selbst TURN (nur nötig, wenn der Host kein eingehendes UDP erlaubt)
//   UDP_PORT_MIN/MAX  UDP-Portbereich für WebRTC (für Firewall-Freigaben)
//   ALLOW_BOTS=1      lokale Testbots erlauben
//   SERVE_CLIENT=0    Client-Dateien nicht mit ausliefern (Standard: ausliefern, praktisch für lokale Tests)

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ndc = require('node-datachannel');
const { Game, C } = require('./game');

const PORT = +(process.env.PORT || 8787);
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://geringdigital.de,https://www.geringdigital.de').split(',').map(s => s.trim()).filter(Boolean);
const ISSUER = process.env.ICE_ISSUER_URL == null ? 'https://geringdigital.de/speed/api.php?a=ice' : process.env.ICE_ISSUER_URL;
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ------------------------------------------------------------------ kurzlebige TURN-Zugangsdaten
// Geheimnisse (CF_TURN_KEY) bleiben auf dem Server; der Browser bekommt nur befristete Zugangsdaten.
let iceCache = { t: 0, servers: null };
async function fetchIce() {
  const keepPorts = u => typeof u === 'string' && !/:53(\?|$)/.test(u); // Port 53 blockieren Browser
  const tidy = list => (Array.isArray(list) ? list : []).map(s => ({ urls: [].concat(s && s.urls || []).filter(keepPorts), username: s.username, credential: s.credential })).filter(s => s.urls.length);
  const opt = { method: 'POST', signal: AbortSignal.timeout(6000) };
  if (process.env.CF_TURN_ID && process.env.CF_TURN_KEY) {
    const r = await fetch('https://rtc.live.cloudflare.com/v1/turn/keys/' + encodeURIComponent(process.env.CF_TURN_ID) + '/credentials/generate-ice-servers',
      { ...opt, headers: { Authorization: 'Bearer ' + process.env.CF_TURN_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: +(process.env.ICE_TTL || 7200) }) });
    return tidy((await r.json()).iceServers);
  }
  if (ISSUER) {
    const r = await fetch(ISSUER, { ...opt, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tok: crypto.randomBytes(16).toString('hex') }) });
    return tidy((await r.json()).ice);
  }
  return [];
}
async function iceServers() {
  if (iceCache.servers && Date.now() - iceCache.t < 20 * 60e3) return iceCache.servers;
  try {
    const s = await fetchIce();
    if (s.some(x => x.username)) { iceCache = { t: Date.now(), servers: s }; return s; }
    log('TURN: Ausgabestelle lieferte keine Zugangsdaten, nur STUN.');
  } catch (e) { log('TURN: Abruf fehlgeschlagen:', e.message); }
  return STUN;
}
// Format für die Serverseite (libdatachannel)
function serverIce(list) {
  const out = ['stun:stun.cloudflare.com:3478'];
  if (process.env.SERVER_TURN === '1') for (const s of list) for (const u of s.urls) {
    const m = /^turn:([^:?]+):(\d+)\?transport=udp$/.exec(u);
    if (m && s.username) out.push({ hostname: m[1], port: +m[2], username: s.username, password: s.credential, relayType: 'TurnUdp' });
  }
  return out;
}

// ------------------------------------------------------------------ Spiel und Verbindungen
const conns = new Map();     // Spieler-ID -> Verbindung
const sessions = new Map();  // Sitzungs-ID -> { token, name, t, conn }
const send = (c, ch, msg) => { try { if (c[ch] && c[ch].isOpen()) c[ch].sendMessage(typeof msg === 'string' ? msg : JSON.stringify(msg)); } catch { } };
const game = new Game({
  allowBots: process.env.ALLOW_BOTS === '1',
  emit(msg, to) {
    const s = JSON.stringify(msg);
    if (to != null) { const c = conns.get(to); if (c) send(c, 'r', s); return; }
    for (const c of conns.values()) send(c, 'r', s);
  },
});
let tickN = 0, last = Date.now(), acc = 0;
setInterval(() => {
  const now = Date.now();
  acc = Math.min(acc + (now - last) / 1000, 0.25); last = now;
  while (acc >= C.TICK) { game.step(C.TICK); acc -= C.TICK; tickN++; }
  if (conns.size) {
    const snap = JSON.stringify(game.snapshot());
    for (const c of conns.values()) {
      if (now - c.seen > 8000) { drop(c, 'Zeitüberschreitung'); continue; }
      send(c, c.u && c.u.isOpen() ? 'u' : 'r', snap);
    }
  }
  for (const [sid, s] of sessions) if (!s.conn && now - s.t > 30000) sessions.delete(sid);
}, 50);

function drop(c, why) {
  if (c.gone) return;
  c.gone = true;
  if (c.pid) { conns.delete(c.pid); game.removePlayer(c.pid); log('−', c.name, '(' + why + ')', conns.size, 'verbunden'); }
  sessions.delete(c.sid);
  setTimeout(() => { try { c.pc.close(); } catch { } }, 0);
}
function onMessage(c, raw) {
  if (typeof raw !== 'string' || raw.length > 300 || !c.pid) return;
  let m; try { m = JSON.parse(raw); } catch { return; }
  c.seen = Date.now();
  if (m.t === 'in') game.setInput(c.pid, +m.x, +m.y);
  else if (m.t === 'act' && ['grab', 'rot', 'jump'].includes(m.k)) game.act(c.pid, m.k);
  else if (m.t === 'start') game.start(c.pid);
  else if (m.t === 'bots' && game.allowBots) { if (m.n > 0) game.addBots(Math.min(46, m.n | 0)); else for (const p of [...game.players.values()]) if (p.bot) game.removePlayer(p.id); }
  else if (m.t === 'ping') send(c, 'r', { t: 'pong', n: m.n });
}

async function accept(sess, sdp) {
  const ice = await iceServers();
  const cfg = { iceServers: serverIce(ice) };
  if (process.env.UDP_PORT_MIN) { cfg.portRangeBegin = +process.env.UDP_PORT_MIN; cfg.portRangeEnd = +(process.env.UDP_PORT_MAX || process.env.UDP_PORT_MIN); }
  const pc = new ndc.PeerConnection('g' + sess.sid.slice(0, 6), cfg);
  const c = { pc, sid: sess.sid, name: sess.name, r: null, u: null, pid: 0, seen: Date.now(), gone: false };
  sess.conn = c;
  pc.onStateChange(st => { if (st === 'failed' || st === 'closed' || st === 'disconnected') drop(c, st); });
  pc.onDataChannel(dc => {
    const label = dc.getLabel();
    if (label !== 'r' && label !== 'u') return;
    c[label] = dc;
    dc.onMessage(msg => onMessage(c, msg));
    dc.onClosed(() => drop(c, 'Kanal zu'));
    if (label !== 'r') return;
    const open = () => { // erst jetzt gilt der Gast als verbunden
      if (c.pid || c.gone) return;
      const p = game.addPlayer(c.name);
      if (!p) { send(c, 'r', { t: 'full' }); return drop(c, 'voll'); }
      c.pid = p.id; conns.set(p.id, c);
      let pair = null; try { pair = pc.getSelectedCandidatePair(); } catch { }
      log('+', p.name, pair ? 'Gast-Kandidat: ' + pair.remote.type + '/' + pair.remote.transportType : '', conns.size, 'verbunden');
      send(c, 'r', { t: 'welcome', id: p.id, name: p.name, max: C.MAX });
      send(c, 'r', game.roundMsg());
      send(c, 'r', game.roster());
      if (game.result && game.phase === 'result') send(c, 'r', game.result);
    };
    if (dc.isOpen()) open(); else dc.onOpen(open);
  });
  const done = new Promise(res => { const t = setTimeout(res, 4000); pc.onGatheringStateChange(st => { if (st === 'complete') { clearTimeout(t); res(); } }); });
  pc.setRemoteDescription(sdp, 'offer');
  await done;
  const local = pc.localDescription();
  if (!local || !local.sdp) throw new Error('keine Antwort erzeugt');
  setTimeout(() => { if (!c.pid) drop(c, 'kein Kanal'); }, 25000);
  return { type: 'answer', sdp: local.sdp };
}

// ------------------------------------------------------------------ HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const CLIENT = path.resolve(__dirname, '..');
const localOrigin = o => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o);
function body(req) {
  return new Promise((res, rej) => { let s = ''; req.on('data', d => { s += d; if (s.length > 24000) { rej(new Error('zu groß')); req.destroy(); } }); req.on('end', () => { try { res(JSON.parse(s || '{}')); } catch (e) { rej(e); } }); req.on('error', rej); });
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  if (origin && (ORIGINS.includes(origin) || localOrigin(origin))) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS'); }
  else if (origin && req.method !== 'GET') return json(403, { err: 'Herkunft nicht erlaubt.' });
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/health') return json(200, { ok: true, players: game.players.size, humans: conns.size, phase: game.phase, max: C.MAX });
    if (req.method === 'POST' && url.pathname === '/session') { // Gastsitzung: Name rein, Sitzung + ICE-Konfiguration raus
      const b = await body(req);
      if (conns.size >= C.MAX || game.players.size - [...game.players.values()].filter(p => p.bot).length >= C.MAX) return json(503, { err: 'Der Raum ist voll (48 Kräne).' });
      if (sessions.size > 400) return json(503, { err: 'Gerade ist zu viel los. Bitte gleich noch einmal.' });
      const sid = crypto.randomBytes(12).toString('hex'), token = crypto.randomBytes(18).toString('hex');
      const name = String(b.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14);
      sessions.set(sid, { sid, token, name, t: Date.now(), conn: null });
      return json(200, { sid, token, name, iceServers: await iceServers(), bots: game.allowBots });
    }
    if (req.method === 'POST' && url.pathname === '/offer') {
      const b = await body(req), s = sessions.get(String(b.sid || ''));
      if (!s || s.conn || typeof b.token !== 'string' || b.token.length !== s.token.length || !crypto.timingSafeEqual(Buffer.from(b.token), Buffer.from(s.token))) return json(403, { err: 'Sitzung ungültig oder abgelaufen.' });
      if (typeof b.sdp !== 'string' || b.sdp.length > 12000) return json(400, { err: 'Ungültiges Angebot.' });
      return json(200, { answer: await accept(s, b.sdp) });
    }
    if (req.method === 'GET' && process.env.SERVE_CLIENT !== '0') {
      let rel = decodeURIComponent(url.pathname).replace(/^\/myground/, '');
      if (rel === '' || rel === '/') rel = '/index.html';
      if (rel === '/config.js') { res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-store' }); return res.end('window.MYGROUND_SERVER = location.origin;'); } // lokal: dieser Server ist der Host
      const file = path.join(CLIENT, rel);
      if (file.startsWith(CLIENT + path.sep) && !rel.startsWith('/server') && MIME[path.extname(file)] && fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)], 'Cache-Control': 'no-store' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    json(404, { err: 'Nicht gefunden.' });
  } catch (e) { log('HTTP-Fehler', url.pathname, e.message); if (!res.headersSent) json(500, { err: 'Serverfehler.' }); }
});
server.listen(PORT, () => log('Spielserver läuft auf Port', PORT, game.allowBots ? '(Testbots erlaubt)' : ''));
process.on('SIGTERM', () => { server.close(); for (const c of conns.values()) drop(c, 'Server stoppt'); setTimeout(() => { ndc.cleanup(); process.exit(0); }, 200); });
