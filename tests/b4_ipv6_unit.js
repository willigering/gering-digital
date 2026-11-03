// Domain tests run without a browser. The independent URL parser checks IPv6 equivalence.
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(__dirname+'/../lernmodule/b4-ipv6.html','utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
const helpers=script.slice(script.indexOf('const rnd='),script.indexOf('/* B4:'));
const domain=script.slice(script.indexOf('/* B4:'),script.indexOf('/* ================= Sprüche'));
const parse=script.slice(script.indexOf('function parseAnswer('),script.indexOf('/* ================= Aufgabe anzeigen'));
const exam=script.match(/function buildExam\(k\)\{[\s\S]*?\n\}/)[0];
const ctx={console,URL};vm.createContext(ctx);
vm.runInContext(helpers+domain+parse+'\nconst EXAM_LEN=1,EXAM_PLAN=CATS.map(([c])=>[c,2,5]);\n'+exam+'\nthis.T={SUBS,CATS,STAGES,genTask,parseAnswer,showAnswer,buildExam,ipWords,short,net,iid};',ctx);
const T=ctx.T;
assert.equal(T.SUBS.length,50);assert.equal(new Set(T.SUBS.map(s=>s.id)).size,50);assert.equal(T.STAGES.length,10);
let generated=0;
for(const sub of T.SUBS)for(let j=0;j<1000;j++){
 const t=T.genTask(sub.id,1+j%3);assert(t.context&&t.prompt&&t.plain&&t.why,t.sub);assert.equal(t.sub,sub.id);
 const p=T.parseAnswer(t,String(t.answer));assert(p.valid&&p.ok,t.sub+' rejected its answer '+t.answer);assert(!T.parseAnswer(t,'this is deliberately wrong').ok);
 if(t.kind==='ip'){
  const canonical=new URL('http://['+t.answer+']/').hostname.slice(1,-1);
  assert.equal(T.short(T.ipWords(t.answer)),canonical,'Independent IPv6 parser mismatch');
 }
 generated++;
}
for(const [input,want] of [['2001:0DB8:0:0:1:0:0:1','2001:db8::1:0:0:1'],['0:0:0:0:0:0:0:0','::'],['0:0:0:0:0:0:0:1','::1'],['2001:db8:0:1:1:1:1:1','2001:db8:0:1:1:1:1:1']])assert.equal(T.short(T.ipWords(input)),want);
for(const bad of ['2001::1::2','1:2:3:4:5:6:7','1:2:3:4:5:6:7:8:9','::g','12345::1',':::1'])assert.equal(T.ipWords(bad),null,bad);
assert.equal(T.iid('00:11:22:33:44:55'),'0211:22ff:fe33:4455');assert.equal(T.iid('02:11:22:33:44:55'),'0011:22ff:fe33:4455');
assert.equal(T.short(T.net(T.ipWords('2001:db8:12:abcf::7'),60)),'2001:db8:12:abc0::');
for(const k of [1,2,3]){const a=T.buildExam(k);assert.equal(a.length,k*20);assert.equal(a.reduce((n,t)=>n+t.pts,0),100);assert.equal(new Set(a.map(t=>t.cat)).size,10)}
const canonical={kind:'ip',answer:'2001:db8::1',ipMode:'canonical'};
assert(!T.parseAnswer(canonical,'2001:0db8::1').ok);assert(T.parseAnswer({...canonical,ipMode:'equiv'},'2001:0DB8:0:0:0:0:0:1').ok);
assert(!T.parseAnswer({...canonical,ipMode:'full'},'2001:db8::1').ok);
const doc='# B4 IPv6 – Aufgabentypen\n\n50 stabile IDs. Jede Aufgabe bewertet eine Antwort. Stufe zählt ab 1. `min` im Modul bezeichnet die minimale Generator-Schwierigkeit.\n\n| ID | Name | Teilthema | Stufe |\n| --- | --- | --- | --- |\n'+T.SUBS.map(s=>'| `'+s.id+'` | '+s.label+' | '+T.CATS.find(c=>c[0]===s.cat)[1]+' | '+(T.CATS.findIndex(c=>c[0]===s.cat)+1)+' |').join('\n')+'\n';
fs.writeFileSync(__dirname+'/../docs/modul-auftraege/b4-aufgabentypen.md',doc);
console.log('B4: '+generated+' generated and assessed cases, independent IPv6 checks, EUI-64, prefix masking, 20/40/60-task exams passed.');
