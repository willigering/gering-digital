/* Run: node tests/w4_browser.cjs. Optional PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH. */
const {chromium}=require('playwright');
const path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),url='file://'+root+'/lernmodule/w4-unternehmen.html';
const PREFIX='w4-unternehmen-',GAME_KEY='dtp-game-best-w4';
(async()=>{
 const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{});
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);assert.equal(await page.locator('.area-tab').count(),4);
 assert.match(await page.locator('.kicker').first().innerText(),/WIRTSCHAFT & PROJEKTE\s*\/\/\s*UNTERNEHMEN & MÄRKTE\s*$/);
 assert.equal(await page.evaluate(()=>/\bW4\b|MODUL W4/.test(document.body.innerText)),false,'No module code visible');
 assert.match((await page.locator('h1').first().textContent()).replace(/\u00ad/g,''),/Garage, Gewinn, Gerichtsvollzieher/);
 const generated=await page.evaluate(()=>{
  const t=W4UNTERNEHMEN_TEST;let n=0;
  // Independently checked results for Math.random()=0 (first pool entry, smallest range values).
  const savedRandom=Math.random;Math.random=()=>0;
  const expected={s_zaehl:0,m_zaehl:4,e_privat:5000,e_sofa:5000,g_haft:10000,g_anteil:4000,g_kopf:1200,k_rest:10000,k_voll:20000,h_einzahl:12500,h_ruecklage:100,h_euro:300,h_gewinn:400,h_stimmen:2500,h_privat:2500,a_aktien:50000,a_dividende:10,a_quote:1,a_eg:30,a_gruender:1,w_risiko:4};
  for(const [id,answer] of Object.entries(expected)){const q=t.genTask(id,3);if(Math.abs(q.answer-answer)>1e-8)throw Error('Independent fixture '+id+': '+q.answer);}
  const textFixtures={s_sektor:'primär',m_markt:'Beschaffungsmarkt',f_name:'zweiseitiges Monopol',f_case:'Angebotsmonopol',e_zusatz:'e.K.',g_form:'GbR',k_co:'Personengesellschaft',a_organ:'Vorstand',r_abteil:'HRA',r_verkauf:'nein',w_wahl:'Einzelunternehmen'};
  for(const [id,answer] of Object.entries(textFixtures)){const q=t.genTask(id,3);if(q.answer!==answer)throw Error('Text fixture '+id+': '+q.answer);}
  Math.random=savedRandom;
  // Legal rules that must hold for every random draw.
  for(let i=0;i<300;i++){
   const e=t.genTask('h_einzahl',3),sk=Number(e.scenario.match(/mit ([\d.]+) €/)[1].replace(/\./g,''));if(e.answer!==Math.max(sk/4,12500))throw Error('GmbH payment rule');
   const r=t.genTask('k_rest',3);const hs=[...r.scenario.matchAll(/([\d.]+) €/g)].map(m=>Number(m[1].replace(/\./g,'')));if(r.answer!==hs[0]-hs[1]||r.answer<0)throw Error('KG limited liability rule');
  }
  for(const s of t.SUBS)for(let i=0;i<1000;i++){
   const q=t.genTask(s.id,1+i%3);
   if(q.sub!==s.id||!q.scenario||!q.prompt||!q.plain||q.plain===q.prompt||!q.why)throw Error('Incomplete '+s.id);
   if(/undefined|NaN|\[object/.test(q.scenario+q.prompt+q.why+(q.options||[]).join('')))throw Error('Broken text '+s.id+' '+q.scenario);
   if(q.kind==='mc'){if(q.options.length!==4||q.options.length!==new Set(q.options).size||!q.options[q.answer])throw Error('Ambiguous MC '+s.id);}
   else if(q.kind==='text'){const r=t.parseAnswer(q,q.answer);if(!r.valid||!r.ok)throw Error('Correct text rejected '+s.id+' '+q.answer);if(t.parseAnswer(q,'Quatsch mit Soße').ok)throw Error('Wrong text accepted '+s.id);for(const a of q.accept)if(!t.parseAnswer(q,a).ok)throw Error('Accept variant '+s.id+' '+a);}
   else{const raw=String(q.answer).replace('.',',')+' '+q.unit;const r=t.parseAnswer(q,raw);if(!r.valid||!r.ok)throw Error('Correct rejected '+s.id+' '+JSON.stringify({q,r}));
    if(t.parseAnswer(q,String(q.answer+1).replace('.',',')).ok)throw Error('Wrong accepted '+s.id);}
   n++;
  }
  // Mutually exclusive text answers: the other legal options must be rejected.
  const pairs=[['s_sektor',['primär','sekundär','tertiär']],['g_form',['GbR','OHG']],['k_rolle',['Komplementär','Kommanditist']],['w_art',['Personengesellschaft','Kapitalgesellschaft']],['r_prokura',['ja','nein']]];
  for(const [id,opts] of pairs)for(let i=0;i<200;i++){const q=t.genTask(id,2);const ok=opts.filter(o=>t.parseAnswer(q,o).ok);if(ok.length!==1)throw Error('Not exactly one valid option '+id+' '+ok);}
  for(const k of [1,2,3]){const qs=t.buildExam(k);if(qs.length!==20*k||Math.abs(qs.reduce((a,q)=>a+q.pts,0)-100)>1e-8)throw Error('Exam weights');if(new Set(qs.map(q=>q.cat)).size!==10)throw Error('Missing category');}
  const mcCount=t.SUBS.filter(s=>s.f(2).kind==='mc').length;if(mcCount>t.SUBS.length/3)throw Error('Too much MC');
  const q={kind:'num',answer:12500,d:0};for(const raw of ['12500','12.500','12.500 €','12500,00','12 500 EUR'])if(!t.parseAnswer(q,raw).ok)throw Error('Money parser '+raw);
  for(const raw of ['12501','1250','12500+0','Infinity'])if(t.parseAnswer(q,raw).ok)throw Error('False positive '+raw);
  for(const [raw,exp] of [['UG haftungsbeschraenkt','UG (haftungsbeschränkt)'],['e. K.','e.K.'],['GmbH und Co. KG','GmbH & Co. KG'],['tertiaer','tertiär']]){if(!t.parseAnswer({kind:'text',answer:exp,accept:[exp]},raw).ok)throw Error('Text parser '+raw);}
  for(const [points,g] of [[100,1],[92,1],[91,2],[81,2],[80,3],[67,3],[66,4],[50,4],[49,5],[30,5],[29,6]])if(t.gradeOf(points)!==g)throw Error('Grade');
  return {tasks:n,types:t.SUBS.length,mc:mcCount,chapters:document.querySelectorAll('[data-lab]').length};
 });
 assert.equal(generated.types,55);assert.equal(generated.chapters,10);
 async function answer(host,wrong=false){const t=await page.evaluate(()=>W4UNTERNEHMEN_TEST.last());if(t.kind==='mc')await page.locator(host+' [data-v="'+(wrong?(t.answer+1)%t.options.length:t.answer)+'"]').click();else{await page.locator(host+' input').fill(wrong?(t.kind==='text'?'Quatsch':'99999999'):String(t.answer).replace('.',','));await page.locator(host+' [data-r="check"]').click();}}
 // 20 actual UI answers, not a parser-only test.
 await page.locator('#tab-train').click();for(let i=0;i<20;i++){await answer('#trainTask');assert.match(await page.locator('#trainTask .result').innerText(),/Richtig|Treffer|Korrekt|Stimmt|Sauber|Genau|Exakt|Volltreffer/);assert.ok((await page.locator('#trainTask .why').innerText()).length>20);await page.locator('#trainTask [data-r="next"]').click();}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-stats-v1')).correct),20);
 // A wrong answer shows the right solution and an explanation.
 await answer('#trainTask',true);const wrongText=await page.locator('#trainTask .result').innerText();assert.match(wrongText,/Richtig ist/);await page.locator('#trainTask [data-r="next"]').click();
 // Hint-assisted answers count for statistics but cannot unlock a stage.
 await page.locator('#tab-path').click();await page.locator('#practiceGo').click();
 for(let i=0;i<3;i++){assert.equal(await page.locator('#practiceTask [data-r="hint"]').isVisible(),true);await answer('#practiceTask');await page.locator('#practiceTask [data-r="next"]').click();}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-path-v1')).st[0].hist.length),0);
 for(let i=0;i<9;i++){await answer('#practiceTask');assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true');await page.locator('#practiceTask [data-r="next"]').click();}
 await answer('#practiceTask');assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),null);
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-path-v1')).st[0]);assert.equal(state.solved,13);assert.equal(state.hist.length,10);assert.equal(state.mastered,true);
 await page.locator('#backToLesson').click();await page.locator('.dtp-practice-dialog').waitFor({state:'hidden'});
 // All labs react to invalid and changed input without console failures.
 await page.locator('#tab-learn').click();for(let i=0;i<10;i++){const lab=page.locator('[data-lab="'+i+'"]');const out=await lab.locator('.lab-out').innerText();assert.doesNotMatch(out,/NaN|Infinity|undefined|gültige/,'lab default '+i);const input=lab.locator('input').first();await input.fill('oops');assert.match(await lab.locator('.lab-out').innerText(),/gültige/);await input.fill('2000');assert.doesNotMatch(await lab.locator('.lab-out').innerText(),/NaN|Infinity|undefined/);}
 const lab=page.locator('[data-lab="2"]');await lab.locator('input').nth(0).fill('30');await lab.locator('input').nth(1).fill('1');assert.match(await lab.locator('.lab-out').innerText(),/Nachfragemonopol/);
 // Matching awards each row separately, with one deliberately wrong row.
 await page.locator('#tab-train').click();await page.locator('[data-mode="match"]').click();let before=await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-stats-v1')));
 const bank=Object.fromEntries(Function('return '+require('node:fs').readFileSync(path.join(root,'tools/w4-match.js'),'utf8').match(/const MATCH_BANK=(\[[\s\S]*?\n\]);/)[1])().map(r=>[r[1],r[0]]));
 for(let i=0;i<5;i++){const label=await page.locator('#ms'+i).getAttribute('aria-label');const right=bank[label.slice('Begriff für '.length)];assert.ok(right,label);await page.locator('#ms'+i).selectOption(i===0?(right==='Polypol'?'Kapitalmarkt':'Polypol'):right);}
 await page.locator('#matchCheck').click();const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-stats-v1')));assert.equal(after.solved-before.solved,5);assert.equal(after.correct-before.correct,4);
 // Complete every examination length through the public UI. Exactly one wrong answer.
 for(const len of [1,2,3]){
  await page.locator('#tab-exam').click();await page.locator('[data-len="'+len+'"]').click();await page.locator('#examStart').click();
  assert.equal(await page.locator('#examQ .qhelp').count(),1);
  await page.evaluate(()=>{const e=W4UNTERNEHMEN_TEST.exam();e.ans=e.tasks.map((t,i)=>i===0?(t.kind==='mc'?(t.answer+1)%t.options.length:t.kind==='text'?'Quatsch':'99999999'):t.kind==='mc'?t.answer:String(t.answer).replace('.',','));});
  await page.locator('#examSubmit').click();await page.locator('#examYes').click();assert.equal(await page.locator('#examResult .review').count(),20*len);
  const h=await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-exam-v1')).at(-1));assert.equal(h.m,30*len);assert.equal(h.p,Math.round((100-5/len)));assert.equal(h.r,'Abgegeben');assert.match(await page.locator('#examResult').innerText(),/Gesamtpunkte pro Thema/);
  await page.locator('#examResult .review').first().click();assert.match(await page.locator('#examResult .review').first().innerText(),/Deine Antwort:.*\nRichtig:/);
  await page.locator('#examAgain').click();
 }
 // Visibility and navigation both terminate exams; sprint cannot be bypassed by mode changes.
 await page.locator('#examStart').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('w4-unternehmen-exam-v1')).at(-1).r),'Seite verlassen');
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));await page.locator('#examAgain').click();await page.locator('#examStart').click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('#examRun').isVisible(),false);
 await page.locator('#tab-train').click();await page.locator('[data-mode="sprint"]').click();await page.locator('#sprintGo').click();await page.locator('[data-mode="free"]').click();assert.equal(await page.locator('#tab-path').getAttribute('aria-disabled'),'true');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.match(await page.locator('#sprintEnd').innerText(),/Seite verlassen/);
 // Learning data only under the module prefix; the shared game block keeps only its own record.
 const keys=await page.evaluate(()=>Object.keys(localStorage));assert.ok(keys.every(k=>k.startsWith(PREFIX)||k===GAME_KEY),keys.join(','));
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 for(const width of [360,390,1280]){await page.setViewportSize({width,height:844});for(const tab of ['path','learn','train','exam']){await page.locator('#tab-'+tab).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+width+' '+tab);}
  if(process.env.DTP_SCREENSHOT_DIR){require('node:fs').mkdirSync(process.env.DTP_SCREENSHOT_DIR,{recursive:true});await page.locator('#tab-path').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(process.env.DTP_SCREENSHOT_DIR,'w4-hero-'+width+'.png')});}}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...generated,training:20,stageMastery:true,exams:[30,60,90],visibility:true,matchPartialCredit:true,mobile:[360,390],errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
