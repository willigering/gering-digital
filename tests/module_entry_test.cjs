/* Regression tests for a fresh module entry (no test framework required). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools/module-entry.js'), 'utf8');

function openModule(options = {}) {
  const entries = new Map(Object.entries(options.storage || {}));
  const handlers = {};
  const rafs = [];
  const scrolls = [];
  let reloads = 0;
  const location = { pathname: '/osi-sprint/', search: '?training=1', hash: options.hash || '',
    reload() { reloads++; } };
  const history = { scrollRestoration: 'auto', state: { x: 1 },
    replaceState(state, title, url) {
      assert.equal(url, '/osi-sprint/?training=1');
      location.hash = '';
    } };
  const localStorage = {
    get length() { return entries.size; },
    key(i) { return [...entries.keys()][i] || null; },
    getItem(k) { return entries.get(k) ?? null; },
    removeItem(k) { entries.delete(k); },
  };
  const window = {
    addEventListener(name, handler) { handlers[name] = handler; },
    scrollTo(x, y) { scrolls.push([x, y]); },
  };
  vm.runInNewContext(source, { window, history, location, localStorage,
    requestAnimationFrame(callback) { rafs.push(callback); } });
  function runFrames() {
    while (rafs.length) rafs.shift()();
  }
  return { entries, location, history, handlers, scrolls, runFrames,
    get reloads() { return reloads; } };
}

// Module tab memory resets, not solved tasks, grades, achievements or unrelated keys.
const page = openModule({
  hash: '#examTop',
  storage: {
    'osi-sprint-tab-v1': 'exam',
    'b5-dienste-tab-v1': '"train"',
    'osi-sprint-path-v1': '{"stage":4,"st":{"0":{"mastered":true}}}',
    'osi-sprint-exams-v1': '[{"p":85}]',
    'dtp-sync:owner': '17',
    'custom-tab-setting': 'preserved'
  }
});
assert.equal(page.history.scrollRestoration, 'manual');
assert.equal(page.location.hash, '');
assert.equal(page.entries.has('osi-sprint-tab-v1'), false);
assert.equal(page.entries.has('b5-dienste-tab-v1'), false);
assert.equal(page.entries.get('osi-sprint-path-v1'), '{"stage":4,"st":{"0":{"mastered":true}}}');
assert.equal(page.entries.get('osi-sprint-exams-v1'), '[{"p":85}]');
assert.equal(page.entries.get('dtp-sync:owner'), '17');
assert.equal(page.entries.get('custom-tab-setting'), 'preserved');
page.handlers.pageshow({ persisted: false });
page.runFrames();
assert.deepEqual(page.scrolls, [[0, 0], [0, 0], [0, 0]]);
assert.equal(page.reloads, 0);

// Browser back/forward cache must not reopen the frozen exam or old scroll.
const back = openModule({ storage: { 'a1-bits-tab-v1': 'learn' } });
back.handlers.pageshow({ persisted: true });
assert.equal(back.reloads, 1);
assert.equal(back.entries.has('a1-bits-tab-v1'), false);

// Works with blocked localStorage, e.g. privacy settings, without crashing.
vm.runInNewContext(source, {
  window: { addEventListener() {}, scrollTo() {} },
  history: { scrollRestoration: 'auto', state: null, replaceState() {} },
  location: { hash: '' },
  localStorage: { get length() { throw new Error('blocked'); } },
  requestAnimationFrame() {}
});

// Every built-in module includes the identical startup implementation.
const manifest = JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'), 'utf8'));
const start = '<!-- DTP-MODULEINSTIEG START -->';
for (const m of manifest.modules) {
  const html = fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');
  assert.equal(html.split(start).length - 1, 1, m.file + ': marker missing/duplicated');
  assert.ok(html.includes(source.trimEnd()), m.file + ': startup differs from shared source');
}
console.log('Module entry: Lernpfad, scroll reset, BFCache, progress retention, all bundled modules OK');
