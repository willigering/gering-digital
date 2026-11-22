// Behaviour tests for dau-to-pro/sync.js in a simulated browser (node:vm, no network).
'use strict';
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync(__dirname + '/../dau-to-pro/sync.js', 'utf8');

function browser(cfg, initial) {
  class Storage {
    constructor() { Object.defineProperty(this, '_m', { value: new Map(), enumerable: false }); }
    get length() { return this._m.size; }
    key(i) { return [...this._m.keys()][i] ?? null; }
    getItem(k) { k = String(k); return this._m.has(k) ? this._m.get(k) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(String(k)); }
    clear() { this._m.clear(); }
  }
  const ls = new Storage();
  for (const [k, v] of Object.entries(initial || {})) ls.setItem(k, v);
  const timers = [], intervals = [], requests = [], listeners = {};
  let respond = () => ({ status: 200, body: { ok: true } });
  const ctx = {
    Storage, localStorage: ls, URL, JSON, Object, Array, String, Math, Promise,
    location: { href: 'https://example.test/osi-sprint/', origin: 'https://example.test', pathname: '/osi-sprint/' },
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; },
    setInterval: (fn) => { intervals.push(fn); return 1; },
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    document: { readyState: 'loading', addEventListener: () => {}, visibilityState: 'visible' },
    fetch: (url, opts) => {
      requests.push({ url, opts, body: JSON.parse(opts.body) });
      if (opts.keepalive) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      const r = respond(requests[requests.length - 1]);
      if (r === 'offline') return Promise.reject(new Error('offline'));
      return Promise.resolve({ ok: r.status < 300, status: r.status, json: () => Promise.resolve(r.body) });
    }
  };
  ctx.window = ctx;
  ctx.__DTP_SYNC__ = cfg;
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  const raw = () => Object.fromEntries(ls._m);
  const runTimers = async () => {
    for (let round = 0; round < 5; round++) {
      const due = timers.splice(0).filter(t => t.fn);
      due.forEach(t => t.fn());
      await new Promise(r => setImmediate(r));
      await new Promise(r => setImmediate(r));
    }
  };
  return { ctx, ls, raw, requests, intervals, listeners, runTimers, setRespond: (f) => { respond = f; }, status: () => ctx.__dtpSyncStatus() };
}
const user = (data, extra) => Object.assign({ v: 1, slug: 'osi-sprint', api: '../dau-to-pro/api/progress.php', account: '../dau-to-pro/konto.php?weiter=osi-sprint', user: 'anna', uid: '7', csrf: 'tok', data }, extra || {});

(async () => {
  // 1. Gast: nichts wird verändert oder gesendet.
  {
    const b = browser({ v: 1, slug: 'osi-sprint', api: 'x', account: 'y', user: null }, { 'osi-score': '3' });
    b.ls.setItem('osi-score', '4');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 0, 'Gast sendet nichts');
    assert.deepStrictEqual(b.raw(), { 'osi-score': '4' }, 'Gast-Daten bleiben unverändert');
    assert.strictEqual(b.status().state, 'local');
    assert.strictEqual(b.ctx.__DTP_SYNC__, undefined, 'Konfiguration wird aus window entfernt');
  }
  // 2. Erste Anmeldung auf einem Gerät mit Gast-Fortschritt.
  {
    const b = browser(user({ values: { 'server-only': 'S', both: 'server' }, deleted: ['old'] }), { 'guest-only': 'G', both: 'local', old: 'x' });
    assert.strictEqual(b.ls.getItem('server-only'), 'S', 'Server-Stand ist vor dem Modul-Skript da');
    assert.strictEqual(b.ls.getItem('both'), 'server', 'Bei Konflikt gewinnt das Konto');
    assert.strictEqual(b.ls.getItem('old'), null, 'Auf anderem Gerät gelöschter Eintrag wird entfernt');
    assert.strictEqual(b.ls.getItem('dtp-sync:owner'), '7');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 1, 'Gast-Fortschritt wird hochgeladen');
    const req = b.requests[0];
    assert.deepStrictEqual(req.body, { slug: 'osi-sprint', set: { 'guest-only': 'G' }, delete: [] });
    assert.strictEqual(req.opts.headers['X-DTP-CSRF'], 'tok');
    assert.strictEqual(req.url, 'https://example.test/dau-to-pro/api/progress.php', 'API-Pfad relativ zur Modulseite');
    assert.strictEqual(b.status().state, 'saved');
    assert.strictEqual(b.ls.getItem('dtp-sync:dirty'), '{}', 'Bestätigte Einträge sind nicht mehr offen');
  }
  // 3. Änderungen im Modul: setItem, removeItem, direkte Zuweisung, clear.
  {
    const b = browser(user({ values: { a: '1', b: '2' }, deleted: [] }), {});
    await b.runTimers();
    assert.strictEqual(b.requests.length, 0, 'Ohne Änderung keine Anfrage');
    b.ls.setItem('a', '10'); b.ls.setItem('c', '3'); b.ls.removeItem('b');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 1, 'Mehrere Änderungen werden gebündelt');
    assert.deepStrictEqual(b.requests[0].body, { slug: 'osi-sprint', set: { a: '10', c: '3' }, delete: ['b'] });
    b.ls._m.set('direct', 'zuweisung'); // localStorage.direct = 'zuweisung' umgeht setItem
    b.intervals[0]();
    await b.runTimers();
    assert.deepStrictEqual(b.requests[1].body.set, { direct: 'zuweisung' }, 'Direkte Zuweisungen werden erkannt');
    b.ls.setItem('dtp-sync:pill', 'min');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 2, 'Eigene Hilfsschlüssel werden nie gesendet');
    b.ls.clear();
    assert.strictEqual(b.ls.getItem('dtp-sync:owner'), '7', 'clear() behält die Zuordnung zum Konto');
    await b.runTimers();
    assert.deepStrictEqual(b.requests[2].body.delete.sort(), ['a', 'c', 'direct'], 'clear() löscht im Konto');
    b.listeners.pagehide.forEach(f => f());
    assert.strictEqual(b.requests.length, 3, 'Beim Verlassen ohne Änderung nichts senden');
    b.ls._m.set('late', 'x');
    b.listeners.pagehide.forEach(f => f());
    assert.ok(b.requests[3].opts.keepalive, 'Letzte Änderung wird beim Verlassen mit keepalive gesendet');
  }
  // 4. Anderes Konto war auf diesem Gerät angemeldet.
  {
    const b = browser(user({ values: { mine: 'M' }, deleted: [] }), { 'dtp-sync:owner': '99', theirs: 'T', 'dtp-sync:dirty': '{"theirs":1}' });
    assert.strictEqual(b.ls.getItem('theirs'), null, 'Fremder Fortschritt wird nicht übernommen');
    assert.strictEqual(b.ls.getItem('mine'), 'M');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 0, 'Nichts vom anderen Konto wird hochgeladen');
  }
  // 5. Offline geänderter Stand desselben Kontos gewinnt; offline gelöschter wird gelöscht.
  {
    const b = browser(user({ values: { k: 'alt', gone: 'G', same: 'S' }, deleted: [] }), { 'dtp-sync:owner': '7', k: 'neu', same: 'lokal', 'dtp-sync:dirty': '{"k":1,"gone":1}' });
    assert.strictEqual(b.ls.getItem('k'), 'neu', 'Offline-Änderung bleibt erhalten');
    assert.strictEqual(b.ls.getItem('same'), 'S', 'Nicht markierte Abweichung: Konto gewinnt');
    assert.strictEqual(b.ls.getItem('gone'), null);
    await b.runTimers();
    assert.deepStrictEqual(b.requests[0].body, { slug: 'osi-sprint', set: { k: 'neu' }, delete: ['gone'] });
  }
  // 6. Netzwerkfehler und abgelaufene Sitzung.
  {
    const b = browser(user({ values: {}, deleted: [] }), {});
    b.setRespond(() => 'offline');
    b.ls.setItem('x', '1');
    await b.runTimers();
    assert.strictEqual(b.status().state, 'offline');
    assert.strictEqual(b.ls.getItem('dtp-sync:dirty'), '{"x":1}', 'Offen bleibt markiert für später');
    b.setRespond(() => ({ status: 200, body: { ok: true } }));
    await b.runTimers();
    assert.strictEqual(b.status().state, 'saved', 'Erneuter Versuch klappt');
    b.setRespond(() => ({ status: 401, body: { ok: false } }));
    b.ls.setItem('y', '2');
    await b.runTimers();
    assert.strictEqual(b.status().state, 'signedout', 'Abgelaufene Sitzung wird angezeigt');
    const n = b.requests.length;
    b.ls.setItem('z', '3');
    await b.runTimers();
    assert.strictEqual(b.requests.length, n, 'Danach keine weiteren Anfragen');
  }
  // 7. Ohne Konfiguration oder mit fremder Version passiert nichts.
  {
    const b = browser(undefined, { a: '1' });
    b.ls.setItem('a', '2');
    await b.runTimers();
    assert.strictEqual(b.requests.length, 0);
  }
  console.log('Lernfortschritt-Sync: alle Prüfungen bestanden');
})().catch(e => { console.error(e); process.exit(1); });
