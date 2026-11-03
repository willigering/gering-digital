'use strict';
// Offline-Vertrag, Generatoren, Lernpfad, Prüfungsrückblick und mobile Darstellung.
// npm install --no-save playwright; npx playwright install chromium
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:process.env.CHROME_ARGS?JSON.parse(process.env.CHROME_ARGS):['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const moduleUrl=process.env.D1_MODULE_URL||'file://'+path.resolve(__dirname,'../lernmodule/d1-datenschutz.html');
 await page.goto(moduleUrl);
 const audit=await page.evaluate(()=>{
  const T=D1DSGVO_TEST,ids=new Set(),samples=[],kinds={};
  for(const s of T.SUBS){if(ids.has(s.id))throw Error('Doppelte ID: '+s.id);ids.add(s.id);
   for(let i=0;i<1000;i++){const t=T.genTask(s.id,3);if(!t.plain||!t.why||!t.prompt)throw Error('Unvollständig: '+s.id);
    if(t.kind==='mc'){if(t.answer<0||t.answer>=t.options.length||new Set(t.options).size!==t.options.length)throw Error('Auswahl: '+s.id)}
    else {const p=T.parseAnswer(t,t.answer);if(!p.valid||!p.ok)throw Error('Eigene Lösung abgelehnt: '+s.id)}
    if(t.kind==='match'&&(t.rows.length!==1||t.answer.includes(',')))throw Error('Mehrere Fragen: '+s.id);
    if(!i){kinds[t.kind]=(kinds[t.kind]||0)+1;samples.push({id:s.id,label:s.label,cat:s.cat,min:s.min,situation:t.situation||'',question:t.question||t.prompt,answer:T.showAnswer(t)});}
   }
  }
  const money=T.genTask('a_buss4',3);for(const raw of [String(money.answer),String(money.answer).replace('.',',')+' Millionen Euro'])if(!T.parseAnswer(money,raw).ok)throw Error('Zahlenschreibweise');
  return {types:T.SUBS.length,kinds,samples,stages:T.STAGES.map(s=>({title:s.title,cat:s.cat})),width:document.documentElement.scrollWidth};
 });
 assert(audit.types>=45);assert((audit.kinds.mc||0)<=audit.types/3);assert.equal(audit.width,390);
 if(process.env.D1_AUDIT_JSON)fs.writeFileSync(process.env.D1_AUDIT_JSON,JSON.stringify(audit,null,2));
 // Lernpfad: zuerst gesperrt, erste drei Hinweise, Lektion beim Üben ausgeblendet.
 assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true');
 await page.click('#practiceGo');assert(await page.locator('#lessonBody').isHidden());
 for(let i=0;i<11;i++){
  assert.equal(await page.locator('#practiceTask [data-r="hint"]').isVisible(),i<3);
  await page.evaluate(()=>{const t=D1DSGVO_TEST.last(),h=document.querySelector('#practiceTask');if(t.kind==='mc')h.querySelector('[data-v="'+t.answer+'"]').click();else{const input=h.querySelector('input');input.value=t.answer;input.dispatchEvent(new Event('input',{bubbles:true}));h.querySelector('[data-r="check"]').click()}});
  if(i<10)await page.locator('#practiceTask [data-r="next"]').click();
 }
 assert.notEqual(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true');
await page.locator('#backToLesson').click();await page.locator('.dtp-practice-dialog').waitFor({state:'hidden'});
 await page.click('#tab-exam');
 for(const k of [1,2,3]){
  await page.click('[data-len="'+k+'"]');await page.click('#examStart');
  const expected=await page.evaluate(()=>{const e=D1DSGVO_TEST.exam();e.ans=e.tasks.map(t=>t.answer);const t=e.tasks[0];e.ans[0]=String(Number(t.answer)%t.options.length+1);return {n:e.tasks.length,p:100-t.pts,total:e.tasks.reduce((s,t)=>s+t.pts,0)}});
  assert.equal(expected.total,100);assert.equal(expected.n,20*k);
  await page.click('#examSubmit');await page.click('#examYes');
  assert((await page.locator('.grade h3').innerText()).startsWith(expected.p+' von 100'));
  assert.equal(await page.locator('article.review').count(),20*k);
  assert((await page.locator('article.review').first().innerText()).includes('Deine Eingabe:'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('d1-dsgvo-exam-v1')).at(-1).m),10*k);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  await page.click('#examAgain');
 }
 // Automatische Abgabe bei Tabwechsel; keine nachträgliche Änderung möglich.
 await page.click('#examStart');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('d1-dsgvo-exam-v1')).at(-1).r),'Seite verlassen');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))});
 await page.click('#tab-learn');assert.equal(await page.locator('[id^="ch"].panel').count(),10);
 assert.equal(await page.locator('#labBuss').count(),1);assert((await page.locator('#fineOutput').innerText()).includes('32'));
 for(const tab of ['path','learn','train','exam']){await page.click('#tab-'+tab);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);}
 await page.setViewportSize({width:1366,height:900});await page.click('#tab-path');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1366);
 if(process.env.DTP_SCREENSHOT_DIR){fs.mkdirSync(process.env.DTP_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.DTP_SCREENSHOT_DIR,'d1-desktop.png')});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(process.env.DTP_SCREENSHOT_DIR,'d1-mobile.png')});}
 assert.deepEqual(errors,[]);console.log('D1: '+audit.types+' × 1.000 Generatoren, Lernpfad, 3 Prüfungsgrößen, Rückblick, Tabwechsel und 390 px bestanden');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
