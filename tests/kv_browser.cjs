'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const acceptance=require('./kv_browser_acceptance.cjs');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../lernmodule/klausurvorbereitung-061126.html'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  for(const width of [1280,390,360]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/');
   if(width<500)await acceptance.mobile(page,width);else await acceptance.focus(page,{width,height:900});
   const lookupContext=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
   const lookupPage=await lookupContext.newPage();lookupPage.on('pageerror',e=>errors.push(e.message));
   await lookupPage.goto('http://127.0.0.1:'+server.address().port+'/');
   const question=lookupPage.locator('#questions .question').first();
   const id=await question.getAttribute('data-id');
   if(await question.locator('.opt').count())await question.locator('.opt').first().click();
   else if(await question.locator('input').count())await question.locator('input').first().fill('12');
   const answerState=()=>question.locator('.answer-box').evaluate(e=>({html:e.innerHTML,values:[...e.querySelectorAll('input,select')].map(i=>i.value)}));
   const before=await answerState();
   const ids=await lookupPage.locator('#questions .question').evaluateAll(es=>es.map(e=>e.dataset.id));
   await question.locator('.lookup').click();
   await lookupPage.getByRole('button',{name:'Zurück zur Frage',exact:false}).click();
   assert.equal(await question.getAttribute('data-id'),id);
   assert.deepEqual(await lookupPage.locator('#questions .question').evaluateAll(es=>es.map(e=>e.dataset.id)),ids);
   assert.deepEqual(await answerState(),before,'Unsubmitted answer survives the reference round trip');
   await question.locator('[data-focus-task]').click();
   await lookupPage.locator('.dtp-practice-dialog[open] .lookup').click();
   await lookupPage.getByRole('button',{name:'Zurück zur Frage',exact:false}).click();
   assert.deepEqual(await answerState(),before,'Focus-dialog lookup preserves the original answer');
   await lookupContext.close();
   // Exercise real short-answer inputs, synonym matching and repeated concepts.
   await page.evaluate(()=>{exam=null;view='mix';practice=[BANK.find(q=>q.sub==='topologie_nennen')];roundAnswers={};renderPractice();});
   const terms=page.locator('#questions .term-input');
   await terms.nth(0).fill('Sterntopologie');await terms.nth(1).fill('Ringtopologie');
   await page.locator('#questions .lookup').click();await page.getByRole('button',{name:'Zurück zur Frage',exact:false}).click();
   assert.equal(await terms.nth(0).inputValue(),'Sterntopologie');
   assert.equal(await terms.nth(1).inputValue(),'Ringtopologie');
   await page.locator('#questions .check').click();
   assert.ok(!(await page.locator('#questions .result').getAttribute('class')).includes('bad'),'Synonymous topology names accepted through real inputs');
   assert.deepEqual(errors,[],'No script errors at '+width);await context.close();
  }
  console.log('KV desktop and mobile 390/360: real focus controls, return, no false XP, input sizes, tap hints and sticky exam timer passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
