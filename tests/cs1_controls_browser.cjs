'use strict';
// Every CS1 type must be answerable using visible controls, including exam navigation.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{answer}=require('./support/cs1-answer.cjs');
(async()=>{
 const browser=await chromium.launch();try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../lernmodule/cs1-csharp.html')).href);
  await page.locator('#tab-train').click();
  const ids=await page.evaluate(()=>CS1START_TEST.SUBS.map(s=>s.id));
  for(const id of ids){
   for(const right of [true,false]){
    await page.evaluate(id=>{const t=genTask(id);renderTask(document.getElementById('trainTask'),t,{noRef:true,noNext:true})},id);
    assert.equal(await page.locator('#trainTask input,#trainTask textarea').count(),0,id+': no free text');
    await answer(page,'#trainTask',right);
    assert.equal(await page.locator('#trainTask .result').evaluate(e=>e.classList.contains('bad')),!right,id+': correct grading');
    assert.ok(await page.locator('#trainTask .why').innerText(),id+': explanation');
   }
  }
  // Pointer drag as well as the keyboard/touch buttons checked by answer().
  await page.evaluate(()=>renderTask(document.getElementById('trainTask'),genTask('w_algo'),{noRef:true,noNext:true}));
  const before=await page.locator('#trainTask [data-row] code').allTextContents();
  await page.locator('#trainTask [data-row="0"]').dragTo(page.locator('#trainTask [data-row="1"]'));
  assert.notDeepEqual(await page.locator('#trainTask [data-row] code').allTextContents(),before,'drag reorders cards');
  await page.locator('#tab-exam').click();await page.locator('#examStart').click();
  for(const kind of ['code','cloze','order','set']){
   const index=await page.evaluate(kind=>{const e=CS1START_TEST.exam();let i=e.tasks.findIndex(t=>t.kind===kind);if(i<0){const id=kind==='code'?'g_fix':kind==='cloze'?'w_frei':kind==='order'?'w_algo':'w_sprache';e.tasks[0]={...genTask(id),pts:5};i=0}e.cur=i;renderExamQ();renderExamNav();return i},kind);
   const t=await page.evaluate(()=>CS1START_TEST.exam().tasks[CS1START_TEST.exam().cur]);
   if(t.slots){await page.locator('#examQ [data-slot="0"]').click();await page.locator('#examQ [data-term="'+t.bank.indexOf(t.slots[0])+'"]').click()}
   await page.locator('#examNav [data-q="'+((index+1)%20)+'"]').click();await page.locator('#examNav [data-q="'+index+'"]').click();
   if(t.slots)assert.ok((await page.locator('#examQ [data-slot="0"]').innerText()).includes(t.slots[0]),'partial selection restored: '+kind);
   await answer(page,'#examQ',true,t);
   assert.equal(await page.evaluate(()=>{const e=CS1START_TEST.exam(),t=e.tasks[e.cur];return CS1START_TEST.parseAnswer(t,e.ans[e.cur]).ok}),true,kind+': exam answer');
   assert.equal(await page.locator('#examQ .result').count(),0,'no answer revealed in exam');
  }
  for(const width of [390,360]){
   await page.setViewportSize({width,height:800});
   for(const id of ['w_algo','w_frei','g_fix','w_sprache','l_off']){
    await page.evaluate(id=>{const e=CS1START_TEST.exam();e.tasks[e.cur]={...genTask(id),pts:5};renderExamQ()},id);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+id+': no overflow');
   }
  }
  assert.deepEqual(errors,[]);console.log('CS1: 95 types graded right/wrong through visible controls; drag, partial exam answers, 360/390 px passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
