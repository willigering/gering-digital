const fs=require('fs'),vm=require('vm'),assert=require('assert');
const mem={};const element=()=>({hidden:true,textContent:'',classList:{toggle(){}},querySelector(){return null;}});
const context={window:{},console,localStorage:{getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v},document:{getElementById:()=>element(),querySelector:()=>null},setTimeout:()=>0,clearTimeout(){},Date,Math};vm.createContext(context);
const html=fs.readFileSync(require('path').join(__dirname,'../lernmodule/klausurvorbereitung-061126.html'),'utf8');
let app=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const CATS='));
app=app.slice(0,app.indexOf("\ndocument.querySelectorAll('[data-view]')"));
vm.runInContext(app+'\nglobalThis.T={BANK,CORE_BANK,ACH,correct,parseNumber,buildExam,ipv4Number,maskFor,record,unlock,fresh,get:()=>state,set:s=>state=s};',context);
const t=context.T;assert.equal(t.get().xp,0);assert.equal(t.get().badges.length,0);
const q=t.BANK[0];assert.equal(t.record(q,false),0);assert.equal(t.get().xp,0);assert.equal(t.record(q,true),2);const once=t.get().xp;assert.equal(t.record(q,true),0);assert.equal(t.get().xp,once);assert.equal(t.get().unique.length,1);
t.set(t.fresh());for(const q of t.BANK)t.record(q,true);assert.equal(t.get().unique.length,t.BANK.length);assert.equal(t.get().badges.length,8);assert(!t.get().badges.includes('exam'));assert(!t.get().badges.includes('master'));
t.get().exams=[{n:20,p:100}];t.unlock();assert.equal(t.get().badges.length,8);
t.get().exams=[{n:40,p:92}];t.unlock();assert.equal(t.get().badges.length,10);const total=t.get().xp;assert.equal(total,t.BANK.length*2+t.ACH.reduce((n,a)=>n+a.xp,0));t.unlock();for(const q of t.BANK)t.record(q,true);assert.equal(t.get().xp,total);assert.equal(new Set(t.get().badges).size,10);
console.log(JSON.stringify({xpAndAchievements:'passed',allTenConditionsReachable:true,noDuplicateXP:true,totalPossibleXP:total}));

for(const q of t.BANK){assert(t.correct(q,q.answer),q.id);assert(!t.correct(q,q.type==='order'?[]:'invalid'),q.id);if(['choice','select'].includes(q.type))assert(q.options.includes(q.answer),q.id);}
for(const s of ['', '256.0.0.1','1.2.3','1.2.3.4.5','-1.2.3.4'])assert.equal(t.ipv4Number(s),null);
for(let p=1;p<=30;p++)assert.equal(t.ipv4Number(t.maskFor(p)),4294967296-2**(32-p));
for(const n of [20,40,60])for(let i=0;i<100;i++){const e=t.buildExam(n);assert.equal(e.length,n);assert.equal(new Set(e.map(q=>q.id)).size,n);for(let c=0;c<7;c++)assert(e.filter(q=>q.c===c).length>=Math.floor(n/7));}
console.log('All registered solutions, input validation, masks and 300 balanced exams passed.');

assert.equal(t.CORE_BANK.length,300);assert.equal(t.BANK.length,459);
assert(t.BANK.every(q=>q.type!=='terms'),'No free-text question type');
assert(!html.includes('term-input'),'No free-text answer fields');
for(const q of t.BANK.filter(q=>Number(q.id.slice(3))>=416&&Number(q.id.slice(3))<=433)){assert.equal(q.type,'choice');assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);}
for(let i=0;i<30;i++)assert(t.buildExam(40).every(q=>t.CORE_BANK.some(c=>c.id===q.id)),'Exam only uses relevant core');
console.log('Core pool and replacement choices passed; no free-text fields.');
