// Real-browser acceptance: offline UI, path gating, single-answer scoring, exams and 390px layout.
'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const {pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),out=process.env.DTP_SCREENSHOT_DIR||path.join(os.tmpdir(),'b4-qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'lernmodule/b4-ipv6.html')).href);
 await page.waitForFunction(()=>!!window.B4IPV6_TEST);
 assert.equal(await page.locator('.area-tab').count(),4);assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true');
 await page.screenshot({path:path.join(out,'b4-desktop.png'),fullPage:true});
 await page.locator('#practiceGo').click();
 for(let i=0;i<13;i++){
  const answer=await page.evaluate(()=>String(B4IPV6_TEST.last().answer));
  await page.locator('#practiceTask input').fill(answer);await page.locator('#practiceTask [data-r="check"]').click();
  if(i===2)assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),'true','Hinted tasks do not unlock');
  if(i<12)await page.locator('#practiceTask [data-r="next"]').click();
 }
 assert.equal(await page.locator('[data-stage="1"]').getAttribute('aria-disabled'),null);
 const state=await page.evaluate(()=>({path:JSON.parse(localStorage.getItem('b4-ipv6-path-v1')),stats:JSON.parse(localStorage.getItem('b4-ipv6-stats-v1'))}));
 assert.equal(state.path.st[0].hist.length,10);assert.equal(state.stats.solved,13);assert.equal(state.stats.correct,13);
 await page.locator('#tab-train').click();
 for(let i=0;i<20;i++){
  const t=await page.evaluate(()=>B4IPV6_TEST.last());await page.locator('#trainTask input').fill(String(t.answer));await page.locator('#trainTask [data-r="check"]').click();
  assert.match(await page.locator('#trainTask [data-r="res"]').innerText(),/Richtig/);assert(await page.locator('#trainTask .why').innerText());
  if(i<19)await page.locator('#trainTask [data-r="next"]').click();
 }
 await page.locator('#tab-learn').click();await page.locator('#lab1').fill('2001:0db8:0000:0000:0000:0000:0000:0002');
 assert.match(await page.locator('[data-lab="short"] [role="status"]').innerText(),/2001:db8::2/);
 for(const k of [1,2,3]){
  await page.locator('#tab-exam').click();await page.locator('[data-len="'+k+'"]').click();await page.locator('#examStart').click();
  assert.equal(await page.locator('#examNav button').count(),k*20);
  await page.locator('#exIn').fill(await page.evaluate(()=>String(B4IPV6_TEST.exam().tasks[0].answer)));
  await page.locator('#examSubmit').click();await page.locator('#examYes').click();
  await page.locator('#examResult details').first().locator('summary').click();
  assert.match(await page.locator('#examResult').innerText(),/Deine Antwort:/);assert.match(await page.locator('#examResult').innerText(),/Richtig:/);
  const last=await page.evaluate(()=>JSON.parse(localStorage.getItem('b4-ipv6-exam-v1')).at(-1));assert.equal(last.m,k*30);assert.equal(last.r,'Abgegeben');
  await page.locator('#examAgain').click();
 }
 await page.locator('#examStart').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('b4-ipv6-exam-v1')).at(-1).r),'Seite verlassen');
 await page.locator('#tab-train').click();await page.locator('[data-mode="sprint"]').click();await page.locator('#sprintGo').click();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});
 assert.match(await page.locator('#sprintEnd').innerText(),/verlassen|beendet|vorbei/i);
 await page.setViewportSize({width:390,height:844});
 for(const tab of ['path','learn','train','exam']){
  await page.locator('#tab-'+tab).click();
  await page.screenshot({path:path.join(out,'b4-mobile-'+tab+'.png'),fullPage:true});
  const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>391).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,80)}))}));
  assert(overflow.width<=390,'No overflow in '+tab+': '+JSON.stringify(overflow));
 }
 await page.locator('#tab-path').click();await page.screenshot({path:path.join(out,'b4-mobile.png'),fullPage:true});
 assert(await page.evaluate(()=>Object.keys(localStorage).every(k=>k.startsWith('b4-ipv6-'))));assert.deepEqual(errors,[]);
 await context.close();
 // Existing server injection and real shared progress API, on an isolated fixture account.
 const {spawn}=require('child_process'),net=require('net');
 const port=await new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'b4-platform-'));
 const router=path.join(temp,'router.php');
 fs.writeFileSync(router,`<?php
 $root=${JSON.stringify(root)};
 $uri=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
 if(is_file($root.$uri))return false;
 require_once $root.'/achievements_lib.php';
 require_once $root.'/dau_lib.php';
 if($uri==='/fixture/'){
 db()->exec("INSERT OR IGNORE INTO html_pages(slug,title,subject,category,published,live_version) VALUES('b4-ipv6','Doppelpunkt, Doppelpunkt, Durchblick','IPv6','lernen',1,'aaaaaaaaaaaaaaaaaaaaaaaa')");
 db()->exec("INSERT OR IGNORE INTO learners(username,password_hash) VALUES('b4-browser','unused')");
 $u=db()->query("SELECT * FROM learners WHERE username='b4-browser'")->fetch(PDO::FETCH_ASSOC);learner_start_session($u);
 echo learner_inject_sync(file_get_contents($root.'/lernmodule/b4-ipv6.html'),'b4-ipv6','index.html');exit;
 }
 if($uri==='/card'){
 echo '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/dau-to-pro/style.css"><main class="module-grid" style="max-width:1100px;margin:30px auto">';
 echo dtp_module_card(['slug'=>'b4-ipv6','title'=>'Doppelpunkt, Doppelpunkt, Durchblick','subject'=>'IPv6','description'=>'Adressen, Präfixe, SLAAC und Subnetting.'],'/');echo '</main>';exit;
 }
 http_response_code(404);`);
 const server=spawn('php',['-S','127.0.0.1:'+port,'-t',root,router],{env:{...process.env,GD_DB_PATH:path.join(temp,'test.sqlite')},stdio:'ignore'});
 try{
  const web=await browser.newContext(),p=await web.newPage();
  let ready=false;for(let i=0;i<50;i++){try{await p.goto('http://127.0.0.1:'+port+'/fixture/');ready=true;break}catch(e){await new Promise(r=>setTimeout(r,100))}}assert(ready,'PHP fixture started');
  await p.waitForFunction(()=>!!window.B4IPV6_TEST);
  await p.locator('#tab-train').click();await p.locator('#trainTask input').fill(await p.evaluate(()=>String(B4IPV6_TEST.last().answer)));
  const persisted=p.waitForResponse(r=>r.url().includes('/api/progress.php')&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').set?.['b4-ipv6-stats-v1']&&r.status()===200);
  await p.locator('#trainTask [data-r="check"]').click();await persisted;
  await p.waitForFunction(()=>typeof window.__dtpSyncStatus==='function'&&window.__dtpSyncStatus().state==='saved');
  await p.reload();assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('b4-ipv6-stats-v1')).correct),1);
  for(const width of [1440,390]){await p.setViewportSize({width,height:1000});await p.goto('http://127.0.0.1:'+port+'/card');await p.locator('.module-art img').waitFor();
   assert(await p.locator('.module-art img').evaluate(i=>i.complete&&i.naturalWidth>0));assert.match(await p.locator('.module-art img').getAttribute('src'),/ipv6.webp/);
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:path.join(out,'b4-card-'+width+'.png'),fullPage:true});
  }
  await web.close();
 }finally{server.kill();fs.rmSync(temp,{recursive:true,force:true})}
 await browser.close();console.log('B4 browser acceptance passed.');
})().catch(e=>{console.error(e);process.exit(1)});
