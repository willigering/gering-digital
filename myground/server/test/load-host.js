'use strict';
// Lasttest für das Host-Modell: Ein echter Browser eröffnet die Baustelle und rechnet das Spiel,
// N WebRTC-Clients (node-datachannel) treten über api.php bei, fahren herum und greifen nach Platten.
//   php -S localhost:8788 -t <Repo-Wurzel>
//   node test/load-host.js                 47 Gäste + Host = 48 Kräne, 20 Sekunden, direkte Verbindung
//   RELAY=1 node test/load-host.js         der Host-Browser erzwingt iceTransportPolicy "relay": alle Gäste laufen über TURN
//   N=47 SECS=20 MG_URL=http://localhost:8788 PW_CHANNEL=chrome
const assert = require('node:assert');
const crypto = require('node:crypto');
const ndc = require('node-datachannel');
const { chromium } = require('playwright');

const BASE = (process.env.MG_URL || 'http://localhost:8788') + '/myground/', N = +(process.env.N || 47), SECS = +(process.env.SECS || 20);
const RELAY = process.env.RELAY === '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = async (a, tok, body) => (await fetch(BASE + 'api.php?a=' + a, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tok, ...body }) })).json();

async function client(i, room, ice) {
  const tok = crypto.randomBytes(16).toString('hex');
  const pc = new ndc.PeerConnection('c' + i, { iceServers: ice });
  const c = { i, pc, id: 0, snaps: 0, bytes: 0, held: 0, phase: '', full: false, closed: false, r: null, u: null };
  const offer = new Promise(res => { const t = setTimeout(res, 6000); pc.onGatheringStateChange(st => { if (st === 'complete') { clearTimeout(t); res(); } }); });
  c.r = pc.createDataChannel('r'); c.u = pc.createDataChannel('u', { unordered: true, maxRetransmits: 0 });
  const welcome = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('kein Willkommen für Client ' + i)), 40000);
    const on = raw => {
      c.bytes += raw.length; const m = JSON.parse(raw);
      if (m.t === 's') { c.snaps++; c.players = m.ps.length; const me = m.ps.find(p => p[0] === c.id); if (me && me[6] >= 0) c.held++; }
      else if (m.t === 'welcome') { c.id = m.id; clearTimeout(t); res(); }
      else if (m.t === 'full') { c.full = true; clearTimeout(t); res(); }
      else if (m.t === 'roster') c.phase = m.phase;
    };
    c.r.onMessage(on); c.u.onMessage(on);
  });
  c.r.onOpen(() => c.r.sendMessage(JSON.stringify({ t: 'hello', name: 'Last ' + (i + 1) })));
  c.r.onClosed(() => { c.closed = true; clearInterval(c.ping); });
  c.ping = setInterval(() => { try { if (c.r.isOpen()) c.r.sendMessage('{"t":"ping"}'); } catch { } }, 2000);   // Lebenszeichen wie der Browser-Client
  await offer;
  const s = await api('signal', tok, { id: room, to: 'host', data: { sdp: { type: 'offer', sdp: pc.localDescription().sdp } } });
  assert.ok(s.ok, 'Angebot ' + i + ': ' + JSON.stringify(s));
  let answer = null;
  for (const end = Date.now() + 30000; !answer && Date.now() < end;) {
    await sleep(500);
    for (const m of (await api('poll', tok, { id: room })).msgs || []) if (m.data.sdp.type === 'answer') answer = m.data.sdp.sdp;
  }
  assert.ok(answer, 'Antwort des Hosts für Client ' + i);
  pc.setRemoteDescription(answer, 'answer');
  await welcome;
  try { c.pair = pc.getSelectedCandidatePair(); } catch { }
  return c;
}

(async () => {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined, headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), host = await ctx.newPage();
    host.on('pageerror', e => { throw e; });
    await host.goto(BASE + (RELAY ? '?relay=1' : ''));
    await host.fill('#name', 'Host');
    await host.click('#createBtn');
    await host.waitForFunction(() => window.__mg.state.connected);
    const room = (await host.evaluate(() => window.__mg.state)).room;
    const ice = RELAY ? ['stun:stun.cloudflare.com:3478'] : [];   // über das Relay erreicht der Host nur öffentliche Adressen der Gäste
    const t0 = Date.now(), clients = [];
    for (let i = 0; i < N; i += 8) clients.push(...await Promise.all(Array.from({ length: Math.min(8, N - i) }, (_, k) => client(i + k, room, ice))));
    const joinMs = Date.now() - t0;
    await sleep(800);
    assert.strictEqual((await host.evaluate(() => window.__mg.state)).peers, N, 'alle Gäste gelten beim Host als verbunden');
    let extra = null;
    if (N >= 47) { extra = await client(N, room, ice); assert.ok(extra.full, 'der 49. Kran wird abgewiesen'); extra.pc.close(); }
    clients[0].r.sendMessage(JSON.stringify({ t: 'start' }));
    await sleep(300);
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
    const hs = await host.evaluate(() => ({ s: window.__mg.state })), hp = await host.evaluate(() => window.__mg.hostPairs()), hostTypes = {};
    for (const x of hp) { const k = x ? x.local + '→' + x.remote + '/' + (x.relayProtocol || x.protocol) : 'unbekannt'; hostTypes[k] = (hostTypes[k] || 0) + 1; }
    if (RELAY) assert.ok(hp.length === N && hp.every(x => x && x.local === 'relay' && x.bytesSent > 50000), 'der Host sendet an alle Gäste über das Relay');
    const out = {
      host: 'Chrome (headless)' + (RELAY ? ', Relay erzwungen' : ''), gaeste: N, kraeneGesamt: hs.s.players, verbunden: clients.filter(c => !c.closed && c.id).length,
      beitrittMs: joinMs, verbindungsartHost: hostTypes, verbindungsartGaeste: types, phaseBeimHost: hs.s.phase, spielerImSnapshot: clients[0].players,
      snapshotsProSekunde: { min: +rates[0].toFixed(1), median: +rates[rates.length >> 1].toFixed(1), max: +rates[rates.length - 1].toFixed(1) },
      kBitProSekundeJeGast: +(clients.reduce((a, c) => a + c.bytes, 0) * 8 / 1000 / dur / N).toFixed(1),
      gaesteMitPlatteAmHaken: clients.filter(c => c.held > 0).length, neunundvierzigster: extra ? 'abgewiesen (voll)' : 'nicht geprüft',
    };
    console.log(JSON.stringify(out, null, 1));
    assert.strictEqual(out.verbunden, N); assert.strictEqual(out.spielerImSnapshot, N + 1); assert.notStrictEqual(hs.s.phase, 'lobby');
    assert.ok(rates[0] > 14, 'jeder Gast bekommt flüssig Zustände (min ' + rates[0] + '/s)');
    assert.ok(out.gaesteMitPlatteAmHaken > 0);
    // Abbruchwelle: die Hälfte trennt hart, der Host muss alle Platten wieder gültig ablegen und weiterlaufen
    const half = N >> 1;
    for (const c of clients.slice(0, half)) { c.closed = true; clearInterval(c.ping); c.pc.close(); }
    await host.waitForFunction(n => window.__mg.state.peers === n, N - half, { timeout: 15000 });
    console.log('nach Abbruchwelle: ' + (N - half) + ' Gäste verbunden, Host läuft weiter');
    for (const c of clients) { clearInterval(c.ping); if (!c.closed) c.pc.close(); }
    await sleep(300);
    console.log('LASTTEST HOST OK');
  } finally { await browser.close(); ndc.cleanup(); }
  process.exit(0);
})().catch(e => { console.error('LASTTEST HOST FEHLGESCHLAGEN:', e); process.exit(1); });
