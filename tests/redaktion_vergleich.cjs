'use strict';
// Compares an edited module with a git ref: headings, task answers, IDs and scoring must not change.
// Usage: node tests/redaktion_vergleich.cjs <git-ref> <module-file-stem> [tasks-per-type]
const {chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const [ref,stem,nArg]=process.argv.slice(2),N=Number(nArg||200),root=path.resolve(__dirname,'..'),file=path.join(root,'lernmodule',stem+'.html');
const TEXT=new Set(['prompt','plain','why','scene','scenario','context','situation','question','rowQuestions']);
const old=execFileSync('git',['-C',root,'show',ref+':lernmodule/'+stem+'.html'],{maxBuffer:1<<28}).toString();
const tmp=path.join(os.tmpdir(),'dtp-vgl-'+process.pid+'.html');fs.writeFileSync(tmp,old);
const strip=h=>h.replace(/<style[\s\S]*?<\/style>/g,'').replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g,'');
const heads=h=>[...strip(h).matchAll(/<(h[1-6]|title)\b[^>]*>([\s\S]*?)<\/\1>/g)].map(m=>m[1]+':'+m[2].replace(/\s+/g,' ').trim());
assert.deepEqual(heads(fs.readFileSync(file,'utf8')),heads(old),'Überschriften verändert');
async function run(browser,url){
 const p=await browser.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.addInitScript(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};});
 await p.goto(url);
 const data=await p.evaluate(({N,text})=>{
  const H=Object.entries(window).find(([k,v])=>/_TEST$/.test(k)&&v&&v.genTask)[1];
  const clean=t=>JSON.parse(JSON.stringify(t,(k,v)=>text.includes(k)?undefined:(typeof v==='function'?undefined:v)));
  const out={subs:H.SUBS.map(s=>[s.id,s.cat,s.label,s.stage]),cats:H.CATS,stages:H.STAGES.map(s=>[s.id,s.title,s.name,s.cat,s.cats,s.need]),plan:H.EXAM_PLAN,tasks:{},opts:{}};
  for(const s of H.SUBS){out.tasks[s.id]=[];for(let i=0;i<N;i++){const t=H.genTask(s.cat,(i%3)+1,[],s.id);const c=clean(t);delete c.options;if(typeof c.key==='string'&&/\s/.test(c.key))delete c.key;out.tasks[s.id].push(c);out.opts[s.id]=(out.opts[s.id]||0)+((t.options||[]).length);const a=H.showAnswer(t);out.tasks[s.id].push(a);}}
  return out;},{N,text:[...TEXT]});
 await p.close();assert.deepEqual(errs,[],'JS-Fehler');return data;
}
(async()=>{const b=await chromium.launch();try{
 const A=await run(b,'file://'+tmp),B=await run(b,'file://'+file);
 for(const k of ['subs','cats','stages','plan','opts'])assert.deepEqual(B[k],A[k],k+' verändert');
 let n=0;for(const id of Object.keys(A.tasks)){assert.deepEqual(B.tasks[id],A.tasks[id],'Aufgabe '+id);n+=A.tasks[id].length/2;}
 console.log(stem+': Überschriften gleich, '+Object.keys(A.tasks).length+' Typen, '+n+' Aufgaben mit gleichem Schlüssel und gleicher Antwort.');
}finally{await b.close();fs.unlinkSync(tmp);}})().catch(e=>{console.error(String(e.message||e).slice(0,1500));process.exit(1)});
