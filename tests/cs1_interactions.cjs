'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../lernmodule/cs1-csharp.html'),'utf8');
const script=html.slice(html.indexOf('/* CS1 pilot: bounded answers'),html.indexOf('/* ================= Antwort prüfen'));
const parser=fs.readFileSync(require('node:path').join(__dirname,'../tools/cs-parser.js'),'utf8');
const ctx=vm.createContext({console});
vm.runInContext(`const window={};const rnd=n=>Math.floor(Math.random()*n),rint=(a,b)=>a+rnd(b-a+1),pick=a=>a[rnd(a.length)];const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const shuffle=a=>a.slice().sort(()=>Math.random()-.5);function mc(prompt,right,wrongs,why,extra){const options=shuffle([right,...shuffle(wrongs).slice(0,3)]);return {kind:'mc',prompt,options,answer:options.indexOf(right),show:esc(right),why,...extra}}\n`+script+'\n'+parser+`;this.api={SUBS,genTask,parseAnswer,interactionHtml};`,ctx);
let count=0;const kinds=new Set();
for(const sub of ctx.api.SUBS)for(let i=0;i<1000;i++){
 const t=ctx.api.genTask(sub.id,1+i%3);count++;kinds.add(t.kind);
 assert.notEqual(t.kind,'free');assert.ok(t.scenario&&t.prompt&&t.plain&&t.why,sub.id);
 if(t.kind==='mc')continue;
 assert.ok(!/<input|<textarea/.test(ctx.api.interactionHtml(t,'probe',false)),sub.id+': no free text');
 assert.ok(ctx.api.parseAnswer(t,String(t.answer)).ok,sub.id+': reference accepted');
 if(t.slots){
  assert.ok(t.slots.length>0,sub.id);assert.ok(t.slots.every(v=>t.bank.includes(v)),sub.id+': all terms available');
  assert.ok(t.bank.some(v=>!t.slots.includes(v)),sub.id+': distractor available');
  const reconstructed=t.kind==='cloze'?JSON.stringify(t.slots):['out','text'].includes(t.kind)?t.slots[0]:t.sentence.replace(/\{(\d+)\}/g,(_,i)=>t.slots[i]);
  assert.ok(ctx.api.parseAnswer(t,reconstructed).ok,sub.id+': UI reconstruction scored');
 }else assert.ok(t.items&&t.items.length>=2,sub.id+': sortable or selectable items');
}
console.log(JSON.stringify({types:ctx.api.SUBS.length,tasks:count,kinds:[...kinds],noFreeText:true,referenceAndReconstruction:true}));
