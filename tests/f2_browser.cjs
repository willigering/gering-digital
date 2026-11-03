/* Run: node tests/f2_browser.cjs. Optional PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),url='file://'+root+'/lernmodule/f2-kalkulation.html';
(async()=>{
 const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);assert.equal(await page.locator('.area-tab').count(),4);
 const generated=await page.evaluate(()=>{
  const t=F2KALK_TEST;let n=0;
  const savedRandom=Math.random;Math.random=()=>0;
  const expected={a_stueck:1510,a_rabatt:25,b_ziel:475,b_bar:490,b_bezug:485.5,b_skonto:465.5,v_selbst:525,v_gewinn:25,v_ziel:500,v_liste:500,n_summe:1,n_gewicht:70,k_kauf:600,k_miete:1300,d_jahr:500,d_monat:1100,m_zeit:2,m_rueck:1000,m_kumul:2.5,e_menge:21,e_gewinn:-600,s_preis:42,s_auftrag:45,o_eigen:900,o_fremd:400,o_krit:50};
  for(const [id,answer] of Object.entries(expected)){const q=t.genTask(id,3);if(Math.abs(q.answer-answer)>1e-8)throw Error('Independent arithmetic fixture '+id);}
  Math.random=savedRandom;
  for(const s of t.SUBS)for(let i=0;i<1000;i++){
   const q=t.genTask(s.id,1+i%3);
   if(q.sub!==s.id||!q.scenario||!q.prompt||!q.plain||q.plain===q.prompt||!q.why)throw Error('Incomplete '+s.id);
   if(q.kind==='mc'){if(q.options.length!==new Set(q.options).size||!q.options[q.answer])throw Error('Ambiguous MC '+s.id);}
   else{const raw=String(q.answer).replace('.',',')+(q.kind==='num'?' '+q.unit:'');const r=t.parseAnswer(q,raw);if(!r.valid||!r.ok)throw Error('Correct rejected '+s.id+' '+JSON.stringify({q,r}));
    if(q.kind==='num'&&t.parseAnswer(q,String(q.answer+1).replace('.',',')).ok)throw Error('Wrong accepted '+s.id);}
   n++;
  }
  for(const k of [1,2,3]){const qs=t.buildExam(k);if(qs.length!==20*k||Math.abs(qs.reduce((a,q)=>a+q.pts,0)-100)>1e-8)throw Error('Exam weights');if(new Set(qs.map(q=>q.cat)).size!==10)throw Error('Missing category');}
  if(t.SUBS.filter(s=>s.f(2).kind==='mc').length>t.SUBS.length/3)throw Error('Too much MC');
  const q={kind:'num',answer:1234.56,d:2};for(const raw of ['1234,56','1234.56','1.234,56 €','1 234,56 EUR'])if(!t.parseAnswer(q,raw).ok)throw Error('Money parser '+raw);
  for(const raw of ['1235,56','1234,99','1234+0.56','Infinity'])if(t.parseAnswer(q,raw).ok)throw Error('False positive '+raw);
  for(const [points,g] of [[100,1],[92,1],[91,2],[81,2],[80,3],[67,3],[66,4],[50,4],[49,5],[30,5],[29,6]])if(t.gradeOf(points)!==g)throw Error('Grade');
  return {tasks:n,types:t.SUBS.length,chapters:document.querySelectorAll('[data-lab]').length};
 });
 async function answer(host,wrong=false){const t=await page.evaluate(()=>F2KALK_TEST.last());if(t.kind==='mc')await page.locator(host+' [data-v="'+(wrong?(t.answer+1)%t.options.length:t.answer)+'"]').click();else{await page.locator(host+' input').fill(wrong?'99999999':String(t.answer).replace('.',','));await page.locator(host+' [data-r="check"]').click();}}
 // 20 actual UI answers, not a parser-only test.
 await page.locator('#tab-train').click();for(let i=0;i<20;i++){await answer('#trainTask');assert.match(await page.locator('#trainTask .result').innerText(),/Richtig/);await page.locator('#trainTask [data-r="next"]').click();}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-stats-v1')).correct),20);
 // Hint-assisted answers count for statistics but cannot unlock a stage.
 await page.locator('#tab-path').click();await page.locator('#practiceGo').click();
 for(let i=0;i<3;i++){assert.equal(await page.locator('#practiceTask [data-r="hint"]').isVisible(),true);await answer('#practiceTask');await page.locator('#practiceTask [data-r="next"]').click();}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-path-v1')).st[0].hist.length),0);
 for(let i=0;i<9;i++){await answer('#practiceTask');assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true');await page.locator('#practiceTask [data-r="next"]').click();}
 await answer('#practiceTask');assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),null);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-path-v1')).st[0]);assert.equal(state.solved,13);assert.equal(state.hist.length,10);assert.equal(state.mastered,true);
await page.locator('#backToLesson').click();await page.locator('.dtp-practice-dialog').waitFor({state:'hidden'});
 // All labs react to invalid and changed input without console failures.
 await page.locator('#tab-learn').click();for(let i=0;i<10;i++){const lab=page.locator('[data-lab="'+i+'"]');const input=lab.locator('input').first();await input.fill('oops');assert.match(await lab.locator('.lab-out').innerText(),/gültige/);await input.fill('2000');assert.doesNotMatch(await lab.locator('.lab-out').innerText(),/NaN|Infinity/);}
 // Matching awards each row separately, with one deliberately wrong row.
 await page.locator('#tab-train').click();await page.locator('[data-mode="match"]').click();let before=await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-stats-v1')));
 const bank={'Nachlass vom Listenpreis':'Rabatt','Nachlass für fristgerechte schnelle Zahlung':'Skonto','Bareinkaufspreis plus Bezugskosten':'Bezugspreis','Bezugspreis plus Handlungskosten':'Selbstkosten','Summe der gewichteten Bewertungspunkte':'Nutzwert','Verteilung des Wertverbrauchs über die Nutzungsdauer':'Abschreibung','Zeit bis Rückflüsse die Investition decken':'Amortisationsdauer','Erlös minus variable Kosten':'Deckungsbeitrag','Jahreskosten geteilt durch abrechenbare Stunden':'Kosten-Stundensatz','Eigenleistung oder Fremdbezug entscheiden':'Make or Buy'};
 for(let i=0;i<5;i++){const label=await page.locator('#ms'+i).getAttribute('aria-label');const right=bank[label.slice('Begriff für '.length)];assert.ok(right);await page.locator('#ms'+i).selectOption(i===0?(right==='Rabatt'?'Skonto':'Rabatt'):right);}
 await page.locator('#matchCheck').click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-stats-v1')));assert.equal(after.solved-before.solved,5);assert.equal(after.correct-before.correct,4);
 // Complete every examination length through the public UI. Exactly one wrong answer.
 for(const len of [1,2,3]){
  await page.locator('#tab-exam').click();await page.locator('[data-len="'+len+'"]').click();await page.locator('#examStart').click();
  assert.equal(await page.locator('#examQ .qhelp').count(),1);
  await page.evaluate(()=>{const e=F2KALK_TEST.exam();e.ans=e.tasks.map((t,i)=>i===0?(t.kind==='mc'?(t.answer+1)%t.options.length:'99999999'):t.kind==='mc'?t.answer:String(t.answer).replace('.',','));});
  await page.locator('#examSubmit').click();await page.locator('#examYes').click();assert.equal(await page.locator('#examResult .review').count(),20*len);
  const h=await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-exam-v1')).at(-1));assert.equal(h.m,30*len);assert.equal(h.p,Math.round((100-5/len)));assert.equal(h.r,'Abgegeben');assert.match(await page.locator('#examResult').innerText(),/Gesamtpunkte pro Thema/);
  await page.locator('#examResult .review').first().click();assert.match(await page.locator('#examResult .review').first().innerText(),/Deine Antwort:.*\nRichtig:/);
  await page.locator('#examAgain').click();
 }
 // Visibility and navigation both terminate exams; sprint cannot be bypassed by mode changes.
 await page.locator('#examStart').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('f2-kalk-exam-v1')).at(-1).r),'Seite verlassen');
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await page.locator('#examAgain').click();await page.locator('#examStart').click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('#examRun').isVisible(),false);
 await page.locator('#tab-train').click();await page.locator('[data-mode="sprint"]').click();await page.locator('#sprintGo').click();await page.locator('[data-mode="free"]').click();assert.equal(await page.locator('#tab-path').getAttribute('aria-disabled'),'true');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.match(await page.locator('#sprintEnd').innerText(),/Seite verlassen/);
 assert.ok((await page.evaluate(()=>Object.keys(localStorage))).every(k=>k.startsWith('f2-kalk-')));
 for(const width of [390,1280]){await page.setViewportSize({width,height:844});for(const tab of ['path','learn','train','exam']){await page.locator('#tab-'+tab).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width+' '+tab);}}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...generated,training:20,stageMastery:true,exams:[30,60,90],visibility:true,matchPartialCredit:true,mobile:true,errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
