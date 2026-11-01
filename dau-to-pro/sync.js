/*
 * DAU TO PRO · Fortschritt speichern
 * Wird vom Server direkt an den Anfang jedes veröffentlichten Lernmoduls gesetzt (vor allen Modul-Skripten).
 * Die Module speichern ihren Stand wie bisher in localStorage. Dieses Skript
 *  1. schreibt beim Laden den gespeicherten Stand des Kontos in localStorage (bevor das Modul ihn liest),
 *  2. erkennt danach jede Änderung (setItem, removeItem, clear oder direkte Zuweisung) und
 *  3. überträgt sie gebündelt an /dau-to-pro/api/progress.php.
 * Ohne Anmeldung bleibt alles wie bisher nur auf dem Gerät; ein kleiner Hinweis bietet die Anmeldung an.
 */
(function () {
  'use strict';
  var cfg = window.__DTP_SYNC__;
  try { delete window.__DTP_SYNC__; } catch (e) { window.__DTP_SYNC__ = undefined; }
  if (!cfg || cfg.v !== 1) return;

  var ls;
  try { ls = window.localStorage; ls.getItem('dtp-sync:probe'); } catch (e) { return; }
  if (!ls) return;

  var PREFIX = 'dtp-sync:';
  var OWNER = PREFIX + 'owner', DIRTY = PREFIX + 'dirty', PILL = PREFIX + 'pill';
  var proto = Object.getPrototypeOf(ls);
  var rawGet = proto.getItem, rawSet = proto.setItem, rawRemove = proto.removeItem, rawClear = proto.clear, rawKey = proto.key;
  var get = function (k) { return rawGet.call(ls, k); };
  var set = function (k, v) { try { rawSet.call(ls, k, v); return true; } catch (e) { return false; } };
  var remove = function (k) { rawRemove.call(ls, k); };
  var own = function (k) { return typeof k === 'string' && k.indexOf(PREFIX) === 0; };
  var has = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  function snapshot() {
    var out = {};
    for (var i = 0; i < ls.length; i++) {
      var k = rawKey.call(ls, i);
      if (k !== null && !own(k)) out[k] = get(k);
    }
    return out;
  }
  function readDirty() {
    try { var d = JSON.parse(get(DIRTY) || '{}'); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; } catch (e) { return {}; }
  }
  function abs(rel) { try { return new URL(rel, location.href).href; } catch (e) { return rel; } }

  var loggedIn = !!(cfg.user && cfg.uid);
  var state = 'local';          // local | saved | saving | offline | error | signedout
  var synced = {};               // last state known to be on the server
  var dirty = {};                // keys changed locally but not yet confirmed by the server

  if (loggedIn) {
    var server = (cfg.data && cfg.data.values) || {};
    var deleted = {};
    ((cfg.data && cfg.data.deleted) || []).forEach(function (k) { deleted[k] = true; });
    var owner = get(OWNER);
    var local = snapshot();
    var pending = owner === cfg.uid ? readDirty() : {};
    var k;
    if (owner && owner !== cfg.uid) {
      // Stand eines anderen Kontos auf diesem Gerät: entfernen (er liegt sicher auf dem Server).
      for (k in local) if (has(local, k)) remove(k);
      local = {};
    }
    for (k in local) {
      if (!has(local, k)) continue;
      // Offline geändert (Gerät gewinnt), nie angekommen oder Gast-Fortschritt vor der Anmeldung: hochladen.
      if (has(pending, k) || (!has(server, k) && !deleted[k])) dirty[k] = true;
    }
    // Keys removed offline (pending marks them with value null).
    for (k in pending) if (has(pending, k) && !has(local, k) && has(server, k)) dirty[k] = true;
    // Server-Stand übernehmen, sofern nicht lokal neuer.
    for (k in deleted) if (has(deleted, k) && !dirty[k] && has(local, k)) remove(k);
    for (k in server) {
      if (!has(server, k) || dirty[k]) continue;
      if (get(k) !== server[k]) set(k, server[k]);
      synced[k] = server[k];
    }
    set(OWNER, cfg.uid);
    state = 'saved';
  }

  // ------------------------------------------------------------------ Änderungen erkennen
  var timer = 0, inflight = false, retryMs = 0, stopped = !loggedIn;
  function schedule(delay) {
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(function () { flush(false); }, delay);
  }
  function diff() {
    var now = snapshot(), setMap = {}, del = [], n = 0, k;
    for (k in now) if (has(now, k) && (synced[k] !== now[k] || dirty[k])) { setMap[k] = now[k]; n++; }
    for (k in synced) if (has(synced, k) && !has(now, k)) { del.push(k); n++; }
    for (k in dirty) if (has(dirty, k) && !has(now, k) && !has(synced, k) && del.indexOf(k) < 0) { del.push(k); n++; }
    return { set: setMap, del: del, n: n };
  }
  function markDirty(changes) {
    var d = readDirty(), k;
    for (k in changes.set) if (has(changes.set, k)) d[k] = 1;
    changes.del.forEach(function (key) { d[key] = 1; });
    set(DIRTY, JSON.stringify(d));
  }
  function flush(leaving) {
    if (stopped || (inflight && !leaving)) return;
    var changes = diff();
    if (!changes.n) { if (state === 'saving') render('saved'); return; }
    markDirty(changes);
    var body = JSON.stringify({ slug: cfg.slug, set: changes.set, delete: changes.del });
    var opts = {
      method: 'POST', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-DTP-CSRF': cfg.csrf },
      body: body
    };
    if (leaving) {
      if (body.length < 60000) { opts.keepalive = true; try { fetch(abs(cfg.api), opts); } catch (e) {} }
      return;
    }
    inflight = true;
    render('saving');
    fetch(abs(cfg.api), opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) { return { res: res, json: json }; });
    }).then(function (r) {
      inflight = false;
      if (r.res.ok && r.json && r.json.ok) {
        var d = readDirty(), k, cur = snapshot();
        for (k in changes.set) if (has(changes.set, k)) { synced[k] = changes.set[k]; if (cur[k] === changes.set[k]) { delete dirty[k]; delete d[k]; } }
        changes.del.forEach(function (key) { delete synced[key]; if (!has(cur, key)) { delete dirty[key]; delete d[key]; } });
        set(DIRTY, JSON.stringify(d));
        retryMs = 0;
        render('saved');
        if (diff().n) schedule(400);
        return;
      }
      if (r.res.status === 401 || r.res.status === 403) { stopped = true; render('signedout'); return; }
      render('error', (r.json && r.json.error) || 'Speichern fehlgeschlagen.');
      if (r.res.status >= 500 || r.res.status === 429) retry();
    }).catch(function () { inflight = false; render('offline'); retry(); });
  }
  function retry() { retryMs = Math.min(retryMs ? retryMs * 2 : 4000, 60000); schedule(retryMs); }

  if (loggedIn) {
    proto.setItem = function (k, v) {
      var r = rawSet.apply(this, arguments);
      if (this === ls && !own(String(k))) schedule(1200);
      return r;
    };
    proto.removeItem = function (k) {
      var r = rawRemove.apply(this, arguments);
      if (this === ls && !own(String(k))) schedule(1200);
      return r;
    };
    proto.clear = function () {
      if (this !== ls) return rawClear.apply(this, arguments);
      // Eigene Verwaltungsdaten behalten, Modul-Daten wie gewünscht löschen.
      var keep = {}, k;
      [OWNER, DIRTY, PILL].forEach(function (key) { var v = get(key); if (v !== null) keep[key] = v; });
      rawClear.apply(this, arguments);
      for (k in keep) if (has(keep, k)) set(k, keep[k]);
      schedule(600);
    };
    // Direkte Zuweisungen (localStorage.x = 1) laufen an setItem vorbei: regelmäßig vergleichen.
    setInterval(function () { if (!inflight && diff().n) flush(false); }, 5000);
    addEventListener('pagehide', function () { flush(true); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
    addEventListener('online', function () { if (state === 'offline') flush(false); });
    // Änderungen aus einem anderen Tab desselben Geräts: der andere Tab überträgt sie selbst.
    addEventListener('storage', function (e) { if (e.storageArea === ls && e.key && !own(e.key)) { if (e.newValue === null) delete synced[e.key]; else synced[e.key] = e.newValue; } });
    if (Object.keys(dirty).length) schedule(800);
  }

  // ------------------------------------------------------------------ Statusanzeige
  var host, label, dot, link, box, closeBtn;
  var messages = {
    local: 'Fortschritt nur auf diesem Gerät',
    saved: 'Gespeichert als ',
    saving: 'Speichert …',
    offline: 'Offline · wird nachgeholt',
    error: '',
    signedout: 'Abgemeldet · nur auf diesem Gerät'
  };
  function render(next, detail) {
    state = next;
    if (!label) return;
    var collapsed = get(PILL) === 'min';
    box.className = 'pill s-' + state + (collapsed ? ' min' : '');
    label.textContent = state === 'saved' ? messages.saved + cfg.user : state === 'error' ? (detail || 'Speichern fehlgeschlagen') : messages[state];
    var needLogin = state === 'local' || state === 'signedout';
    link.hidden = !(needLogin || state === 'saved');
    link.textContent = needLogin ? 'Anmelden' : 'Mein Fortschritt';
    box.title = needLogin ? 'Melde dich an, damit dein Fortschritt im Konto gespeichert wird.' : (state === 'saved' ? 'Dein Fortschritt wird automatisch gespeichert.' : '');
    closeBtn.setAttribute('aria-label', collapsed ? 'Speicherstatus anzeigen' : 'Speicherstatus verkleinern');
    closeBtn.setAttribute('aria-expanded', String(!collapsed));
  }
  function mount() {
    if (host || !document.body) return;
    host = document.createElement('dtp-sync-status');
    host.setAttribute('style', 'all:initial;position:fixed;left:12px;bottom:12px;z-index:2147483000');
    var root = host.attachShadow ? host.attachShadow({ mode: 'closed' }) : host;
    var css = document.createElement('style');
    css.textContent = [
      ':host{all:initial}',
      '.pill{display:flex;align-items:center;gap:8px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:6px 6px 6px 11px;border-radius:999px;',
      'background:rgba(12,16,19,.92);border:1px solid rgba(234,180,72,.45);box-shadow:0 6px 22px rgba(0,0,0,.45);',
      'font:600 12px/1.25 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#f5f0df;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
      '.dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:#8c979b}',
      '.s-saved .dot{background:#5fd99a;box-shadow:0 0 8px #5fd99a88}.s-saving .dot{background:#eab448;animation:p 1s ease-in-out infinite}',
      '.s-offline .dot,.s-error .dot{background:#ff7f6e}.s-signedout .dot{background:#eab448}',
      '@keyframes p{50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.s-saving .dot{animation:none}}',
      '.label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}',
      'a{color:#130f07;background:linear-gradient(105deg,#fff1bb,#efc261 58%,#cc8f25);border-radius:999px;padding:4px 10px;text-decoration:none;font-weight:800;white-space:nowrap}',
      'a:focus-visible,button:focus-visible{outline:2px solid #00dce8;outline-offset:2px}',
      'button{all:unset;cursor:pointer;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#bbc5c7;font-size:15px;line-height:1}',
      'button:hover{background:rgba(255,255,255,.08);color:#fff}',
      '.pill{position:relative}.min{padding:7px}.min .label,.min a{display:none}',
      '.min button{position:absolute;inset:0;width:auto;height:auto;border-radius:999px;font-size:0}',
      '@media print{.pill{display:none}}'
    ].join('');
    box = document.createElement('div');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    dot = document.createElement('span'); dot.className = 'dot';
    label = document.createElement('span'); label.className = 'label';
    link = document.createElement('a'); link.href = abs(cfg.account);
    closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.textContent = '×';
    closeBtn.addEventListener('click', function () { set(PILL, get(PILL) === 'min' ? '' : 'min'); render(state); });
    box.appendChild(dot); box.appendChild(label); box.appendChild(link); box.appendChild(closeBtn);
    root.appendChild(css); root.appendChild(box);
    document.body.appendChild(host);
    render(state);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  // Für Tests und Fehlersuche (keine Daten, nur der Zustand).
  window.__dtpSyncStatus = function () { return { state: state, user: cfg.user || null, pending: Object.keys(dirty).length }; };
})();
