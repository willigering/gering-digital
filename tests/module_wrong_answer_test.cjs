'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'tools/module-wrong-answer.js'),'utf8');
const context={window:{},Math};vm.createContext(context);vm.runInContext(source,context);
let previous;
for(let round=0;round<100;round++){
 const bag=Array.from({length:135},()=>context.window.DTPWrongAnswer.next());
 assert.equal(new Set(bag).size,135,'All 135 quips appear before any repeat');
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
// All new quips are active.
const pending=JSON.parse(source.match(/const newQuips = (\[[\s\S]*?\]);/)[1]);
assert.equal(pending.length,85,'85 new quips prepared');assert.equal(new Set(pending).size,85,'New quips are unique');
assert.ok(source.includes('const NEW_QUIPS_LIVE = true;'),'New quips are live');
const liveContext={window:{},Math};vm.createContext(liveContext);vm.runInContext(source,liveContext);
const liveBag=new Set(Array.from({length:135},()=>liveContext.window.DTPWrongAnswer.next()));
assert.equal(liveBag.size,135,'Activated pool: 135 different quips before any repeat');for(const q of pending)assert.ok(liveBag.has(q),q);
// Correct-answer quips extend each module's own list.
const right=JSON.parse(source.match(/const newRightQuips = (\[[\s\S]*?\]);/)[1]);
assert.equal(right.length,33,'33 new correct-answer quips prepared');assert.equal(new Set(right).size,33,'Correct-answer quips are unique');
const seen=new Set(Array.from({length:5000},()=>liveContext.window.DTPRightAnswer.next(['eigen'])));
assert.equal(seen.size,34,'Activated: own plus all new correct-answer quips');
for(const m of JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules){const html=fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');assert.ok(html.includes('window.DTPRightAnswer.next(Q_OK)')||html.includes('window.DTPRightAnswer.next(quips)'),m.slug+': correct renderer uses switch');}
console.log('Wrong-answer quips: 100 complete bags, no boundary repeats, reinjection and all ten modules passed.');
