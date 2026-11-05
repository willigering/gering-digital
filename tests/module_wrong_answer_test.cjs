'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'tools/module-wrong-answer.js'),'utf8');
const context={window:{},Math};vm.createContext(context);vm.runInContext(source,context);
let previous;
for(let round=0;round<100;round++){
 const bag=Array.from({length:50},()=>context.window.DTPWrongAnswer.next());
 assert.equal(new Set(bag).size,50,'All 50 quips appear before any repeat');
 assert.notEqual(bag[0],previous,'No repeat across bag boundaries');previous=bag.at(-1);
}
const api=context.window.DTPWrongAnswer;vm.runInContext(source,context);assert.equal(context.window.DTPWrongAnswer,api,'Reinjection preserves the bag');
for(const m of JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules){
 const html=fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');
 assert.equal((html.match(/<!-- DTP-FEHLERSPRUECHE START -->/g)||[]).length,1,m.slug);
 assert.ok(html.includes(source.trim()),m.slug+': current shared quips embedded');
 assert.ok(html.includes('return window.DTPWrongAnswer.next()')||html.includes('qBad=()=>window.DTPWrongAnswer.next()'),m.slug+': renderer calls shared pool');
 let i=0;for(const s of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(s[1],{filename:m.file+'#'+(++i)});
}
// New quips stay dormant until the switch is flipped; flipping activates all of them.
const pending=JSON.parse(source.match(/const newQuips = (\[[\s\S]*?\]);/)[1]);
assert.equal(pending.length,30,'30 new quips prepared');assert.equal(new Set(pending).size,30,'New quips are unique');
assert.ok(source.includes('const NEW_QUIPS_LIVE = false;'),'New quips are not live yet');
const liveContext={window:{},Math};vm.createContext(liveContext);vm.runInContext(source.replace('const NEW_QUIPS_LIVE = false;','const NEW_QUIPS_LIVE = true;'),liveContext);
const liveBag=new Set(Array.from({length:80},()=>liveContext.window.DTPWrongAnswer.next()));
assert.equal(liveBag.size,80,'Activated pool: 80 different quips before any repeat');for(const q of pending)assert.ok(liveBag.has(q),q);
console.log('Wrong-answer quips: 100 complete bags, no boundary repeats, reinjection and all ten modules passed.');
