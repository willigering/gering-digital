'use strict';
// Simulierter Browser: Ein Update darf nie ohne Zustimmung nachladen; offene Formulare bleiben geschützt.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const code = fs.readFileSync(__dirname + '/../assets/update-notice.js', 'utf8');
const oldVersion = 'a'.repeat(40);
const newVersion = 'b'.repeat(40);
function bootstrap({stored, fetched = newVersion, dirty = false} = {}) {
  const handlers = {};
  const values = new Map(stored ? [['tickit:update:acknowledged:v1', stored]] : []);
  const elements = [];
  const body = {
    dataset:{releaseVersion:oldVersion},
    append: el => elements.push(el)
  };
  let reloads = 0;
  const document = {
    body, hidden: false,
    addEventListener: (type, fn) => (handlers[type] ||= []).push(fn),
    createElement: tag => ({tag, props:[], children:[], setAttribute(){},append(...nodes){this.children.push(...nodes)},addEventListener(type,fn){this.handlers ||= {};this.handlers[type] = fn}}),
    querySelector: () => dirty ? {} : null
  };
  const ctx = {document, window:{location:{reload(){reloads++}}},
    location:{reload(){reloads++}},
    localStorage:{getItem:k=>values.get(k) ?? null,setItem:(k,v)=>values.set(k,v)},
    fetch:async()=>({ok:true,json:async()=>({revision:fetched})}),
    setInterval:()=>{}, Date, console};
  vm.runInNewContext(code, ctx);
  return {elements, handlers,values,get reloads(){return reloads}};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
(async()=>{
  const a=bootstrap({stored:oldVersion});await flush();
  assert.equal(a.reloads,0,'Version poll must not reload itself');
  assert.equal(a.elements.length,1,'Update must be shown');
  assert.equal(a.values.get('tickit:update:acknowledged:v1'),oldVersion);
  a.elements[0].children[2].handlers.click();
  assert.equal(a.reloads,1,'Explicit update click should reload');
  assert.equal(a.values.get('tickit:update:acknowledged:v1'),newVersion);
  const b=bootstrap({stored:oldVersion,dirty:true});await flush();
  assert.equal(b.elements.length,1);
  b.elements[0].children[2].handlers.click();
  assert.equal(b.reloads,0,'Unsaved form must prevent reload');
  assert.equal(b.values.get('tickit:update:acknowledged:v1'),oldVersion,'Acknowledgement must not persist before safe reload');
  const c=bootstrap({fetched:oldVersion});await flush();
  assert.equal(c.elements.length,0,'First visit must not show an old update');
  const d=bootstrap({stored:'c'.repeat(40),fetched:oldVersion});await flush();
  assert.equal(d.elements.length,1,'Unacknowledged update must remain visible after manual reload');
  const e=bootstrap({stored:oldVersion,fetched:oldVersion});await flush();
  assert.equal(e.elements.length,0,'Acknowledged update must not repeat');
  console.log('Tick-It update-notice: 5 browser-simulation tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
