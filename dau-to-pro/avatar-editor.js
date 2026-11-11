// DAU TO PRO: Avatar-Editor. Setzt die Ebenen live zusammen, speichert über api/avatar.php.
(function () {
  'use strict';
  var root = document.querySelector('[data-avatar-editor]');
  var dataNode = document.getElementById('avatar-data');
  if (!root || !dataNode) return;
  var D = JSON.parse(dataNode.textContent);
  var M = D.manifest, unlocks = D.unlocks;
  var cfg = Object.assign({}, D.config), savedCfg = JSON.stringify(D.saved ? D.config : null);
  var preview = root.querySelector('[data-avatar-preview]');
  var tabs = root.querySelector('[data-avatar-tabs]');
  var slotsBox = root.querySelector('[data-avatar-slots]');
  var status = root.querySelector('[data-avatar-status]');
  var saveBtn = root.querySelector('[data-avatar-save]');
  var FACE = { eyes: 1, brows: 1, beard: 1, glasses: 1 };
  var activeCat = M.categories[0].id;

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function item(slot, id) { var list = M.slots[slot].items; for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function ok(slot, id) { return !!(unlocks[slot] && unlocks[slot][id] && unlocks[slot][id].ok); }
  function url(file, fmt) { return D.assets + M.formats[fmt].replace('{file}', file) + (D.version ? '?v=' + D.version : ''); }
  function fill(file, c) { return file.replace('{base}', c.base).replace('{hairColor}', c.hairColor); }
  function layers(c) {
    var byLayer = {}, hw = item('headwear', c.headwear), hide = hw && hw.hidesHair;
    Object.keys(M.slots).forEach(function (slot) {
      var it = item(slot, c[slot]);
      if (!it || !it.file || (slot === 'hair' && hide)) return;
      var layer = it.layer || M.slots[slot].layer;
      (byLayer[layer] = byLayer[layer] || []).push({ slot: slot, file: fill(it.file, c) });
    });
    var out = [];
    M.layerOrder.forEach(function (l) { (byLayer[l] || []).forEach(function (x) { out.push(x); }); });
    return out;
  }
  function stack(c, fmt, only) {
    var s = el('span', 'dtp-avatar');
    layers(c).forEach(function (l) {
      if (only && only.indexOf(l.slot) < 0) return;
      var img = el('img', 'dtp-avatar-layer is-' + l.slot); img.alt = ''; img.decoding = 'async'; img.src = url(l.file, fmt);
      s.append(img);
    });
    return s;
  }
  // Konflikte wie auf dem Server: z. B. Visier erzwingt „ohne Brille“.
  function choose(slot, id) {
    cfg[slot] = id;
    var chosen = item(slot, id);
    if (chosen && chosen.conflicts) Object.keys(chosen.conflicts).forEach(function (o) { cfg[o] = chosen.conflicts[o]; });
    Object.keys(M.slots).forEach(function (other) {
      var it = item(other, cfg[other]);
      if (other !== slot && it && it.conflicts && it.conflicts[slot] !== undefined && it.conflicts[slot] !== id) cfg[other] = 'none';
    });
  }
  function renderPreview() {
    preview.replaceChildren(stack(cfg, 'webp'));
    var dirty = JSON.stringify(cfg) !== savedCfg;
    if (saveBtn) saveBtn.disabled = !dirty;
    if (dirty && D.canSave) setStatus('Ungespeicherte Änderungen.', '');
  }
  function setStatus(text, kind) { status.textContent = text; status.className = 'avatar-status' + (kind ? ' is-' + kind : ''); }
  function tile(slot, it) {
    var unlocked = ok(slot, it.id), on = cfg[slot] === it.id;
    var b = el('button', 'avatar-tile' + (on ? ' is-on' : '') + (unlocked ? '' : ' is-locked'));
    b.type = 'button';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var rule = unlocks[slot] && unlocks[slot][it.id] ? unlocks[slot][it.id].rule : '';
    b.setAttribute('aria-label', it.label + (unlocked ? '' : ', gesperrt: ' + rule));
    var art = el('span', 'avatar-tile-art' + (FACE[slot] || (slot === 'accessory' && it.id !== 'headset') ? ' is-face' : '') + (slot === 'frame' ? ' is-frame' : ''));
    if (slot === 'hairColor') {
      var sw = el('span', 'avatar-swatch'); sw.style.background = it.swatch; art.append(sw);
    } else if (!it.file) {
      art.append(el('span', 'avatar-none', '∅'));
    } else {
      var c = Object.assign({}, cfg); c[slot] = it.id;
      if (slot === 'base') { c = Object.assign({}, c, M.baseDefaults[it.id] || {}); c.base = it.id; }
      var only = slot === 'base' ? ['base', 'hair', 'clothes'] : slot === 'frame' ? ['frame'] : ['base', slot];
      if (slot === 'hair') c.headwear = 'none';
      art.append(stack(c, 'thumb', only));
      if (slot !== 'base' && slot !== 'frame') art.classList.add('is-item');
    }
    b.append(art, el('span', 'avatar-tile-name', it.label));
    if (!unlocked) {
      var lock = el('span', 'avatar-lock'); lock.setAttribute('aria-hidden', 'true');
      lock.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 1 0-4 0z"/></svg>';
      b.append(lock, el('span', 'avatar-rule', rule));
    }
    b.addEventListener('click', function () {
      if (!ok(slot, it.id)) { setStatus('Gesperrt: ' + rule + '.', 'locked'); return; }
      choose(slot, it.id); renderPreview(); renderSlots();
    });
    return b;
  }
  function renderTabs() {
    tabs.replaceChildren();
    M.categories.forEach(function (cat) {
      var t = el('button', 'avatar-tab', cat.label);
      t.type = 'button'; t.setAttribute('role', 'tab'); t.id = 'avatar-tab-' + cat.id;
      t.setAttribute('aria-selected', cat.id === activeCat ? 'true' : 'false');
      t.setAttribute('aria-controls', 'avatar-slots');
      t.tabIndex = cat.id === activeCat ? 0 : -1;
      t.addEventListener('click', function () { activeCat = cat.id; renderTabs(); renderSlots(); });
      t.addEventListener('keydown', function (e) {
        var i = M.categories.indexOf(cat), n = M.categories.length;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); activeCat = M.categories[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n].id;
          renderTabs(); renderSlots(); tabs.querySelector('[aria-selected=true]').focus();
        }
      });
      tabs.append(t);
    });
  }
  function renderSlots() {
    slotsBox.replaceChildren();
    slotsBox.id = 'avatar-slots'; slotsBox.setAttribute('role', 'tabpanel'); slotsBox.setAttribute('aria-labelledby', 'avatar-tab-' + activeCat);
    var cat = M.categories.filter(function (c) { return c.id === activeCat; })[0];
    cat.slots.forEach(function (slot) {
      var box = el('div', 'avatar-slot');
      var head = el('h2', 'avatar-slot-title', M.slots[slot].label);
      var hw = item('headwear', cfg.headwear);
      if ((slot === 'hair' || slot === 'hairColor') && hw && hw.hidesHair) head.append(el('small', '', ' · unter „' + hw.label + '“ verborgen'));
      var grid = el('div', 'avatar-tiles');
      M.slots[slot].items.forEach(function (it) { grid.append(tile(slot, it)); });
      box.append(head, grid); slotsBox.append(box);
    });
  }
  function randomize() {
    Object.keys(M.slots).forEach(function (slot) {
      var free = M.slots[slot].items.filter(function (it) { return ok(slot, it.id); });
      var weighted = M.slots[slot].required ? free : free.concat(free.filter(function (it) { return it.id === 'none'; }));
      if (weighted.length) choose(slot, weighted[Math.floor(Math.random() * weighted.length)].id);
    });
  }
  root.querySelector('[data-avatar-random]').addEventListener('click', function () { randomize(); renderPreview(); renderSlots(); });
  root.querySelector('[data-avatar-reset]').addEventListener('click', function () {
    cfg = Object.assign({}, savedCfg !== 'null' ? JSON.parse(savedCfg) : M['default']);
    renderPreview(); renderSlots();
  });
  if (saveBtn) saveBtn.addEventListener('click', async function () {
    saveBtn.disabled = true; setStatus('Speichere …', '');
    try {
      var r = await fetch(D.api, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-DTP-CSRF': D.csrf }, body: JSON.stringify({ config: cfg }) });
      var p = await r.json().catch(function () { return {}; });
      if (!r.ok || !p.ok) throw new Error(p.error || 'Speichern fehlgeschlagen.');
      cfg = p.config; savedCfg = JSON.stringify(cfg);
      renderPreview(); renderSlots();
      setStatus('Gespeichert. Dein Avatar erscheint jetzt im Highscore und im Profil.', 'ok');
    } catch (e) {
      setStatus(e.message, 'error'); saveBtn.disabled = false;
    }
  });
  renderTabs(); renderSlots(); renderPreview();
  if (D.canSave) setStatus(D.saved ? 'Dein gespeicherter Avatar.' : 'Noch nicht gespeichert: Das ist der Standard-Avatar.', '');
})();
