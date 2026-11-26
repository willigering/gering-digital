'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'tools/module-wrong-answer.js'),'utf8');
const context={window:{},Math};vm.createContext(context);vm.runInContext(source,context);
let previous;
for(let round=0;round<100;round++){
 const bag=Array.from({length:135},()=>context.window.DTPWrongAnswer.nextJoke());
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
const liveBag=new Set(Array.from({length:135},()=>liveContext.window.DTPWrongAnswer.nextJoke()));
assert.equal(liveBag.size,135,'Activated pool: 135 different quips before any repeat');for(const q of pending)assert.ok(liveBag.has(q),q);
// Correct-answer quips are always the shared list.
const right=JSON.parse(source.match(/const newRightQuips = (\[[\s\S]*?\]);/)[1]);
assert.equal(right.length,33,'33 new correct-answer quips prepared');assert.equal(new Set(right).size,33,'Correct-answer quips are unique');
const seen=new Set(Array.from({length:5000},()=>liveContext.window.DTPRightAnswer.next(['eigen'],true)));
assert.equal(seen.size,33,'Activated: exactly the shared correct-answer quips');
for(const m of JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules){const html=fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');assert.ok(html.includes('window.DTPRightAnswer.next(Q_OK)')||html.includes('window.DTPRightAnswer.next(quips)'),m.slug+': correct renderer uses switch');}
for(const m of JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules){const html=fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');assert.ok(!/\?'':'<span class="quip">/.test(html),m.slug+': review and matching also praise right answers');}
// Frequency: witty quips only about 1 in 5 answers, otherwise a short plain line.
{
 const jokes=new Set([...JSON.parse(source.match(/const quips = (\[[\s\S]*?\]);/)[1]),...pending,...right]);
 for(const [name,fn] of [['wrong',()=>liveContext.window.DTPWrongAnswer.next()],['right',()=>liveContext.window.DTPRightAnswer.next(['eigen'])]]){
  const n=20000;let hits=0;for(let i=0;i<n;i++)if(jokes.has(fn()))hits++;
  const share=hits/n;assert.ok(share>0.17&&share<0.23,name+' joke share about 20%, got '+share);
 }
 let prev;for(let i=0;i<500;i++){const r=liveContext.window.DTPWrongAnswer.next();if(!jokes.has(r)&&!jokes.has(prev)){assert.notEqual(r,prev,'no identical plain line twice in a row');}prev=r;}
}
console.log('Wrong-answer quips: 100 complete bags, no boundary repeats, reinjection and all ten modules passed.');
