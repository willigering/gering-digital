'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = fs.readFileSync(path.join(__dirname, '../dau-to-pro/feedback.js'), 'utf8');

function visit(roll, sent = '3', reducedMotion = false) {
  const handlers = {};
  const trigger = {
    style: {}, hidden: true,
    addEventListener(event, callback) { handlers[event] = callback; },
    matches() { return false; },
    getBoundingClientRect() {
      const offsets = (this.style.translate || '0px 0px').split(' ').map(parseFloat);
      return {left: 680 + offsets[0], top: 340 + offsets[1], width: 120, height: 48};
    }
  };
  const send = {disabled: false};
  const status = {textContent: ''};
  const form = {
    action: '/dau-to-pro/api/feedback.php',
    querySelector(query) { return query === '[type="submit"]' ? send : status; },
    addEventListener() {}
  };
  const dialog = {
    showModal() { this.opened = true; },
    close() {},
    querySelector(query) {
      if (query === 'form') return form;
      if (query === '#dtp-feedback-intro') return {textContent: ''};
      return {addEventListener() {}};
    }
  };
  const document = {
    documentElement: {clientWidth: 1100, clientHeight: 800},
    querySelector(query) {
      if (query === '.dtp-feedback-button') return trigger;
      if (query === '#dtp-feedback-dialog') return dialog;
      return null;
    }
  };
  const math = Object.create(Math);
  math.random = () => roll;
  vm.runInNewContext(code, {
    document, Math: math,
    localStorage: {getItem() {return sent;}, setItem() {}},
    window: {addEventListener() {}},
    matchMedia() {return {matches: reducedMotion};}
  }, {filename: 'feedback.js'});
  const hover = (pointerType = 'mouse') => handlers.pointerenter({pointerType, clientX: 690, clientY: 360});
  return {trigger, handlers, hover, dialog};
}

const normal = visit(0.9);
assert.equal(normal.trigger.hidden, false);
for (let i = 0; i < 10; i++) normal.hover();
assert.equal(normal.trigger.style.translate, undefined, 'No prank on 95% of eligible visits');
normal.handlers.click();
assert.equal(normal.dialog.opened, true, 'The normal feedback button still works');

const prank = visit(0.01);
prank.hover();
assert.match(prank.trigger.style.translate, /px/, 'First escape');
const first = prank.trigger.style.translate;
prank.hover();
assert.notEqual(prank.trigger.style.translate, first, 'Second escape');
prank.hover();
assert.equal(prank.trigger.style.translate, '', 'Third approach returns to start');
prank.hover();
assert.equal(prank.trigger.style.translate, '', 'No fourth escape');
prank.handlers.click();
assert.equal(prank.dialog.opened, true, 'Feedback remains possible after the prank');

const unqualified = visit(0.01, '2');
unqualified.hover();
assert.equal(unqualified.trigger.style.translate, undefined, 'Must send 3 messages first');
const reduced = visit(0.01, '3', true);
reduced.hover();
assert.equal(reduced.trigger.style.translate, undefined, 'Respect reduced-motion preference');
const touch = visit(0.01);
touch.hover('touch');
assert.equal(touch.trigger.style.translate, undefined, 'Touch does not trigger prank');
console.log('Feedback Easter egg tests passed');
