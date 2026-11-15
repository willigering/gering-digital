'use strict';
// Lasttest: N echte WebRTC-Clients (node-datachannel) gegen den laufenden Spielserver.
//   node test/load.js            48 Clients, 20 Sekunden
//   N=48 SECS=30 MG_URL=http://localhost:8787 node test/load.js
// Jeder Client holt eine Gastsitzung, baut zwei Datenkanäle auf, fährt herum und greift nach Platten.
const assert = require('node:assert');
const ndc = require('node-datachannel');

const BASE = process.env.MG_URL || 'http://localhost:8787', N = +(process.env.N || 48), SECS = +(process.env.SECS || 20);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const post = async (path, body) => { const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, json: await r.json() }; };

async function client(i) {
  const s = await post('/session', { name: 'Last ' + (i + 1) });
  assert.strictEqual(s.status, 200, 'Sitzung ' + i);
  const pc = new ndc.PeerConnection('c' + i, { iceServers: [] });   // nur Host-Kandidaten: direkte Verbindung
  const c = { i, pc, id: 0, snaps: 0, bytes: 0, msgs: 0, held: 0, roster: 0, phase: '', result: null, closed: false, r: null, u: null };
  const offer = new Promise(res => pc.onGatheringStateChange(st => { if (st === 'complete') res(); }));
  c.r = pc.createDataChannel('r'); c.u = pc.createDataChannel('u', { unordered: true, maxRetransmits: 0 });
  const welcome = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('kein Willkommen für Client ' + i)), 20000);
    const on = raw => {
      c.bytes += raw.length; const m = JSON.parse(raw);
      if (m.t === 's') { c.snaps++; c.players = m.ps.length; const me = m.ps.find(p => p[0] === c.id); if (me && me[6] >= 0) c.held++; }
      else if (m.t === 'welcome') { c.id = m.id; clearTimeout(t); res(); }
      else if (m.t === 'roster') { c.roster = m.ps.length; c.phase = m.phase; }
      else if (m.t === 'result') c.result = m;
      else if (m.t === 'msg') c.msgs++;
    };
    c.r.onMessage(on); c.u.onMessage(on);
  });
  c.r.onClosed(() => { c.closed = true; });
  await offer;
  const a = await post('/offer', { sid: s.json.sid, token: s.json.token, sdp: pc.localDescription().sdp });
  assert.strictEqual(a.status, 200, 'Angebot ' + i);
  pc.setRemoteDescription(a.json.answer.sdp, 'answer');
  await welcome;
  try { c.pair = pc.getSelectedCandidatePair(); } catch { }
  return c;
}

(async () => {
  const t0 = Date.now(), clients = [];
  for (let i = 0; i < N; i += 8) clients.push(...await Promise.all(Array.from({ length: Math.min(8, N - i) }, (_, k) => client(i + k))));
  const joinMs = Date.now() - t0;
  await sleep(500);
  const health = await (await fetch(BASE + '/health')).json();
  assert.strictEqual(health.humans, N, 'alle Clients gelten serverseitig als verbunden');
  let extra = null;
  if (N >= 48) { extra = await post('/session', { name: 'zu viel' }); assert.strictEqual(extra.status, 503, 'der 49. Gast wird abgewiesen'); }
  clients[0].r.sendMessage(JSON.stringify({ t: 'start' }));
  for (const c of clients) { c.snaps = 0; c.bytes = 0; }
  const t1 = Date.now();
  const iv = setInterval(() => {
    for (const c of clients) {
      if (c.closed) continue;
      const ch = c.u.isOpen() ? c.u : c.r;
      ch.sendMessage(JSON.stringify({ t: 'in', x: +(Math.random() * 2 - 1).toFixed(2), y: +(Math.random() * 2 - 1).toFixed(2) }));
      if (Math.random() < 0.25) c.r.sendMessage(JSON.stringify({ t: 'act', k: ['grab', 'grab', 'rot', 'jump'][Math.floor(Math.random() * 4)] }));
    }
  }, 100);
  await sleep(SECS * 1000);
  clearInterval(iv);
  const dur = (Date.now() - t1) / 1000, rates = clients.map(c => c.snaps / dur).sort((a, b) => a - b);
  const types = {};
  for (const c of clients) { const k = c.pair ? c.pair.local.type + '→' + c.pair.remote.type + '/' + c.pair.local.transportType : 'unbekannt'; types[k] = (types[k] || 0) + 1; }
  const out = {
    clients: N, verbunden: clients.filter(c => !c.closed && c.id).length, beitrittMs: joinMs, verbindungsart: types,
    rundeGestartet: clients.every(c => c.phase === 'play' || c.phase === 'countdown' || c.phase === 'result'),
    spielerImSnapshot: clients[0].players, snapshotsProSekunde: { min: +rates[0].toFixed(1), median: +rates[rates.length >> 1].toFixed(1), max: +rates[rates.length - 1].toFixed(1) },
    kBitProSekundeJeClient: +(clients.reduce((a, c) => a + c.bytes, 0) * 8 / 1000 / dur / N).toFixed(1),
    clientsMitPlatteAmHaken: clients.filter(c => c.held > 0).length, neunundvierzigster: extra ? extra.status + ' ' + extra.json.err : 'nicht geprüft',
  };
  console.log(JSON.stringify(out, null, 1));
  assert.strictEqual(out.verbunden, N); assert.ok(out.rundeGestartet); assert.strictEqual(out.spielerImSnapshot, N);
  assert.ok(rates[0] > 14, 'jeder Client bekommt flüssig Zustände (min ' + rates[0] + '/s)');
  assert.ok(out.clientsMitPlatteAmHaken > 0);
  // Abbruchwelle: die Hälfte trennt hart, der Server muss alle Platten wieder gültig ablegen und weiterlaufen
  for (const c of clients.slice(0, N >> 1)) { c.closed = true; c.pc.close(); }
  await sleep(1500);
  const h2 = await (await fetch(BASE + '/health')).json();
  assert.strictEqual(h2.humans, N - (N >> 1), 'getrennte Clients sind ausgetragen');
  console.log('nach Abbruchwelle:', JSON.stringify(h2));
  for (const c of clients) if (!c.closed) c.pc.close();
  await sleep(300); ndc.cleanup();
  console.log('LASTTEST OK');
  process.exit(0);
})().catch(e => { console.error('LASTTEST FEHLGESCHLAGEN:', e); process.exit(1); });
