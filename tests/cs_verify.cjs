'use strict';
// Prüft alle Codeblöcke und Aufgaben von CS1 „Compiler sagt nein“ mit dem echten C#-Compiler (.NET SDK nötig).
const {chromium}=require('playwright');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),N=Number(process.env.CS_SAMPLES||60);
const dotnetBase=spawnSync('dotnet',['--list-sdks'],{encoding:'utf8'}).stdout.trim().split('\n').pop();
const m=/^(\S+) \[(.+)\]$/.exec(dotnetBase);const sdk=path.join(m[2],m[1]);
const csc=path.join(sdk,'Roslyn/bincore/csc.dll');
const rtBase=path.join(m[2],'..','shared/Microsoft.NETCore.App');const rtVer=fs.readdirSync(rtBase).sort().pop();const rt=path.join(rtBase,rtVer);
const refs=fs.readdirSync(rt).filter(f=>/^(System\..*|System|Microsoft\.CSharp|netstandard|mscorlib)\.dll$/.test(f)).map(f=>'-r:'+path.join(rt,f));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cs-verify-'));
const USINGS='global using System;global using System.IO;global using System.Linq;global using System.Collections.Generic;global using System.Threading.Tasks;\n';
const usingsFile=path.join(tmp,'usings.cs');fs.writeFileSync(usingsFile,USINGS);
function compile(files,out,kind='exe'){const r=spawnSync('dotnet',[csc,'-nologo','-nullable:enable','-langversion:12','-nowarn:CS0219,CS8321,CS0168,CS0162,CS8600,CS8602,CS8604,CS8618,CS1591','-t:'+kind,...refs,'-out:'+out,usingsFile,...files],{encoding:'utf8',maxBuffer:1<<28});return {ok:r.status===0,text:r.stdout+r.stderr}}
function run(dll,input=''){fs.writeFileSync(dll.replace(/\.dll$/,'.runtimeconfig.json'),JSON.stringify({runtimeOptions:{tfm:'net8.0',framework:{name:'Microsoft.NETCore.App',version:rtVer}}}));return spawnSync('dotnet',[dll],{input,encoding:'utf8',cwd:tmp,timeout:20000,maxBuffer:1<<28,env:{...process.env,DOTNET_SYSTEM_GLOBALIZATION_INVARIANT:'1'}})}
const norm=s=>String(s).trim().replace(/\s+/g,' ');
const squeeze=s=>{let o='',q=false;s=String(s);for(let i=0;i<s.length;i++){const c=s[i];if(c==='"')q=!q;if(q||!/\s/.test(c))o+=c}return o};
const fails=[];let checks=0;
function snippets(){
 const list=JSON.parse(fs.readFileSync(path.join(root,'tests/support/cs-snippets.json')));
 list.forEach((s,i)=>{checks++;const f=path.join(tmp,`snip${i}.cs`),dll=path.join(tmp,`snip${i}.dll`);fs.writeFileSync(f,s.code+'\n');
  if(s.bad){if(compile([f],dll).ok)fails.push(`Block ${i} sollte nicht kompilieren:\n${s.code}`);return}
  if(s.out==null){const c=compile([f],dll,'library');if(!c.ok)fails.push(`Block ${i}: ${c.text}\n${s.code}`);return}
  const c=compile([f],dll);if(!c.ok){fails.push(`Block ${i}: ${c.text}\n${s.code}`);return}
  const r=run(dll,s.input?s.input+'\n':'');if(norm(r.stdout)!==norm(s.out))fails.push(`Block ${i} Ausgabe: erwartet "${norm(s.out)}", real "${norm(r.stdout)}" ${r.stderr||''}`);
 });
 return list.length;
}
(async()=>{
 const count=snippets();
 const browser=await chromium.launch();const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'lernmodule/cs1-csharp.html')).href);
 const data=await page.evaluate(n=>{const T=window.CS1START_TEST,tasks=[];const div=document.createElement('div');
  for(const s of T.SUBS)for(let i=0;i<n;i++){const t=T.genTask(s.id,1+i%3);div.innerHTML=t.scenario;const pre=div.querySelector('pre');
   tasks.push({sub:s.id,cat:s.cat,kind:t.kind,answer:t.answer,accept:t.accept,options:t.options,prompt:t.prompt,plain:t.plain,why:t.why,fmt:t.fmt,key:t.key,scenario:t.scenario,v:t.v,pre:pre?pre.textContent:'',form:t.form,checks:t.v&&t.v.checks,groups:t.groups,need:t.need,shown:T.showAnswer(t),ok:T.parseAnswer(t,t.kind==='mc'?'x':String(t.answer)).ok})}
  const pl={};for(const s of T.SUBS)pl[s.cat]=(pl[s.cat]||0)+1;return {tasks,subs:T.SUBS.map(s=>({id:s.id,cat:s.cat,label:s.label})),per:pl,exam:[1,2,3].map(k=>{const e=T.buildExam(k);return {n:e.length,pts:e.reduce((a,t)=>a+t.pts,0)}})}},N);
 const seen=new Set(),runCases=new Map(),codeCases=new Map(),distinct=new Set();
 for(const t of data.tasks){checks++;distinct.add(t.key);
  if(!t.prompt||!t.plain||!t.why)fails.push(`${t.sub}: Text fehlt`);if(t.plain===t.prompt)fails.push(`${t.sub}: Tooltip gleich Frage`);
  if(t.kind!=='mc'&&!t.ok)fails.push(`${t.sub}: Musterlösung wird abgelehnt: ${t.answer}`);
  if(t.kind==='mc'&&(new Set(t.options).size!==t.options.length||t.options.length<2||t.answer<0))fails.push(`${t.sub}: Optionen ungültig`);
  if(t.kind==='code'&&squeeze(t.pre).includes(squeeze(t.answer)))fails.push(`${t.sub}: Lösung steht in der Aufgabe: ${t.answer}`);
  if(t.v&&t.v.body!==undefined){const k=t.v.cls+'|'+t.v.body+'|'+t.v.input;if(!runCases.has(k))runCases.set(k,[]);runCases.get(k).push(t)}
  if(t.v&&t.v.tpl!==undefined)for(const a of t.v.accept){const k=t.v.cls+'|'+t.v.tpl.replace('@@',()=>a);codeCases.set(k,{t,src:t.v.tpl.replace('@@',()=>a),cls:t.v.cls})}
 }
 // Behauptungen aus Aufgaben ohne Ausgabeprüfung (Mehrfachauswahl, Fehlerzeitpunkt, Namen): out/exc/ok laufen im Sammelprogramm, bad einzeln.
 const checkRuns=new Map(),checkBad=new Set();
 for(const t of data.tasks)for(const c of (t.checks||[])){if(c.bad)checkBad.add(c.code);else checkRuns.set(c.code+'|'+(c.out??'')+'|'+(c.exc??''),{c,sub:t.sub})}
 // Ein gemeinsames Programm mit je einem Namespace pro Fall.
 const cases=[...runCases.entries()];let src='';
 const extra=[...checkRuns.values()];
 const wrap=(i,cls,body)=>`namespace C${i} {\n${cls}\nstatic class P { public static void Run() {\n${body}\n} } }\n`;
 const files=[];cases.forEach(([k,ts],i)=>{const f=path.join(tmp,`run${i}.cs`);fs.writeFileSync(f,wrap(i,ts[0].v.cls||'',ts[0].v.body));files.push(f)});
 extra.forEach((x,i)=>{const f=path.join(tmp,`chk${i}.cs`);fs.writeFileSync(f,`namespace X${i} {\nstatic class P { public static void Run() {\n${x.c.code}\n} } }\n`);files.push(f)});
 [...codeCases.values()].forEach((c,i)=>{const f=path.join(tmp,`code${i}.cs`);fs.writeFileSync(f,`namespace K${i} {\n${c.cls}\nstatic class P { public static void Run() {\n${c.src}\n} } }\n`);files.push(f)});
 const main=path.join(tmp,'main.cs');fs.writeFileSync(main,'static class H { static void Main(){ var inv=System.Globalization.CultureInfo.InvariantCulture;System.Globalization.CultureInfo.DefaultThreadCurrentCulture=inv;var real=Console.Out;var ins=File.ReadAllLines("inputs.json");\n'+cases.map((_,i)=>`{var w=new StringWriter();Console.SetOut(w);Console.SetIn(new StringReader(ins[${i}].Replace("\\\\n","\\n")));try{C${i}.P.Run();}catch(Exception e){w.Write(" EXC:"+e.GetType().Name);}real.WriteLine(w.ToString().Replace("\\r","").Replace("\\n"," "));}`).join('\n')+'\n'+extra.map((_,i)=>`{var w=new StringWriter();Console.SetOut(w);try{X${i}.P.Run();}catch(Exception e){w.Write(" EXC:"+e.GetType().Name);}real.WriteLine(w.ToString().Replace("\\r","").Replace("\\n"," "));}`).join('\n')+'\n}}\n');
 fs.writeFileSync(path.join(tmp,'inputs.json'),cases.map(([,ts])=>(ts[0].v.input||'').replace(/\n/g,'\\n')).join('\n')+'\n');
 const big=path.join(tmp,'all.dll');const c=compile([main,...files],big);
 if(!c.ok){const lines=c.text.split('\n').filter(l=>/error/.test(l)).slice(0,25);for(const l of lines){const f=/(run|code)(\d+)\.cs/.exec(l);fails.push(l+(f?'\n'+fs.readFileSync(path.join(tmp,f[0]),'utf8'):''))}}
 else{const r=run(big);const outs=r.stdout.split('\n');cases.forEach(([k,ts],i)=>{const real=norm(outs[i]);for(const t of ts){const ok=(t.accept||[t.answer]).some(a=>norm(a)===real);
    if(t.kind==='order'){if(/EXC:/.test(real))fails.push(`${t.sub}: Lösung wirft ${real}`);continue}
    if(!ok){fails.push(`${t.sub}: erwartet "${t.answer}", C# liefert "${real}"\n${t.v.body}`);break}}});
  extra.forEach((x,i)=>{checks++;const real=norm(outs[cases.length+i]);if(x.c.ok||(x.c.out===undefined&&!x.c.exc))return;const want=norm(((x.c.out??'')+(x.c.exc?' EXC:'+x.c.exc:'')));if(real!==want)fails.push(`${x.sub}: Behauptung "${want}", C# liefert "${real}"\n${x.c.code}`)})}
 // Behauptete Compilerfehler und Ausnahmen
 const seenBad=new Set();let bi=0;
 const expectBad=code=>{if(seenBad.has(code))return;seenBad.add(code);checks++;const f=path.join(tmp,`bad${bi}.cs`);fs.writeFileSync(f,code+'\n');if(compile([f],path.join(tmp,`bad${bi++}.dll`)).ok)fails.push('Sollte nicht kompilieren:\n'+code)};
 const expectExc=(code,name)=>{const k=code+name;if(seenBad.has(k))return;seenBad.add(k);checks++;const f=path.join(tmp,`ex${bi}.cs`),d=path.join(tmp,`ex${bi++}.dll`);fs.writeFileSync(f,code+'\n');const c=compile([f],d);if(!c.ok){fails.push('Kompiliert nicht:\n'+code+c.text);return}const r=run(d);if(!(r.stderr||'').includes(name))fails.push(`Erwartet ${name}:\n${code}\n${r.stderr}`)};
 for(const code of checkBad)expectBad(code);
 const forms={};for(const t of data.tasks){forms[t.sub]=forms[t.sub]||new Set();forms[t.sub].add(t.form)}
 for(const [sub,f] of Object.entries(forms))if(f.size!==1||!f.values().next().value)fails.push(`${sub}: Form nicht eindeutig: ${[...f]}`);
 for(const t of data.tasks){const right=t.options?t.options[t.answer]:'';
  if(['v_konst','m_void','m_scope'].includes(t.sub))expectBad(t.pre.replace(/^(static void Melde[\s\S]*?\}\n\n)(.*)$/,'$2\n$1'));
  if(t.sub==='g_semikolon')expectBad(t.pre.replace(/^\d  /gm,''));
  if(t.sub==='e_ausnahme')expectExc(t.pre,right);
  if(t.sub==='a_grenze')expectExc(t.pre,'IndexOutOfRangeException');
  if(t.sub==='e_art'&&right==='Laufzeitfehler')expectExc(t.pre,'Exception');
  if(t.sub==='e_art'&&right==='Compilerfehler')expectBad(t.pre);
 }
 expectBad('Konto k = new Konto();\nk.versuche = 5;\nclass Konto\n{\n    private int versuche = 0;\n}');
 expectBad('IPing p = new IPing();\ninterface IPing { string Ping(); }');
 expectBad('class Server : IPing\n{\n}\ninterface IPing { string Ping(); }');
 expectBad('string w = "1";\nswitch (w)\n{\ncase "1":\n    Console.WriteLine("Neu");\ncase "2":\n    Console.WriteLine("Liste");\n    break;\n}');
 const perType=Object.fromEntries(data.subs.map(s=>[s.id,0]));for(const t of data.tasks)perType[t.sub]++;
 console.log(JSON.stringify({codeBlocks:count,types:data.subs.length,perCat:data.per,distinctTasks:distinct.size,compiledRun:cases.length,compiledCode:codeCases.size,exam:data.exam,pageErrors:errors,checks}));
 if(distinct.size<100)fails.push('Weniger als 100 unterschiedliche Aufgaben');
 if(data.subs.length<45)fails.push('Weniger als 45 Typen');
 for(const e of data.exam)if(Math.abs(e.pts-100)>1e-6)fails.push('Prüfung ergibt nicht 100 Punkte');
 if(errors.length)fails.push(...errors);
 await browser.close();fs.rmSync(tmp,{recursive:true,force:true});
 if(fails.length){console.error(fails.slice(0,40).join('\n---\n'));console.error('FEHLER:',fails.length);process.exit(1)}
 console.log('OK');
})();
