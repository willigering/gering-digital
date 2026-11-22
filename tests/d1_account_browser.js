'use strict';
// Konto-Sync über die echte PHP-API und Wiederherstellung in einem leeren Browser-Kontext.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dtp-d1-account-'));
const env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(tmp,'site.sqlite')};
const port=26000+Math.floor(Math.random()*1000),base='http://127.0.0.1:'+port;
const php=process.env.PHP_BINARY||'php';
function run(code){const r=spawnSync(php,['-r',code],{env,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let server,browser,version;
 try {
  version=run(`require ${JSON.stringify(root+'/achievements_lib.php')};require_once ${JSON.stringify(root+'/dau_lib.php')};$b=hp_bundles()['d1-datenschutz'];$v=hp_import_local($b['path'],$b['slug']);db()->prepare("INSERT INTO html_pages(slug,title,subject,description,category,live_version,published) VALUES(?,?,?,?,'lernen',?,1)")->execute([$b['slug'],$b['title'],$b['subject'],$b['description'],$v]);db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute(['d1learner',password_hash('Testpasswort-123!',PASSWORD_DEFAULT)]);echo $v;`).trim();
  server=spawn(php,['-S','127.0.0.1:'+port,'-t',root,path.join(root,'tests/support/router.php')],{env,stdio:'ignore'});
  for(let i=0;i<50;i++){try{if((await fetch(base+'/dau-to-pro/konto.php')).ok)break}catch{}await pause(100)}
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:process.env.CHROME_ARGS?JSON.parse(process.env.CHROME_ARGS):['--no-sandbox']});
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dau-to-pro/konto.php?weiter=d1-datenschutz');
  await page.fill('input[name=username]','d1learner');await page.fill('input[name=password]','Testpasswort-123!');
  await Promise.all([page.waitForURL('**/d1-datenschutz/'),page.click('.auth-form button[type=submit]')]);
  await page.waitForFunction(()=>!!window.D1DSGVO_TEST&&!!window.__dtpSyncStatus);
  assert.equal(await page.locator('dtp-back').count(),1);
  // Eine echte Trainingseingabe löst die serverseitige Speicherung aus.
  await page.click('#tab-train');await page.evaluate(()=>{const t=D1DSGVO_TEST.last(),box=document.querySelector('#trainTask');if(t.kind==='mc')box.querySelector('[data-v="'+t.answer+'"]').click();else{const input=box.querySelector('input');input.value=t.answer;input.dispatchEvent(new Event('input',{bubbles:true}));box.querySelector('[data-r=check]').click()}});
  await page.waitForFunction(()=>__dtpSyncStatus().state==='saved'&&__dtpSyncStatus().pending===0);await pause(1800);
  await page.click('#tab-exam');await page.click('#examStart');
  await page.evaluate(()=>{const e=D1DSGVO_TEST.exam();e.ans=e.tasks.map(t=>t.answer)});
  await page.click('#examSubmit');await page.click('#examYes');await pause(1800);
  await page.waitForFunction(()=>__dtpSyncStatus().state==='saved'&&__dtpSyncStatus().pending===0);
  const saved=JSON.parse(run(`require ${JSON.stringify(root+'/achievements_lib.php')};echo json_encode(learner_progress_state(1));`));
  const history=JSON.parse(saved.values['d1-dsgvo-exam-v1']);assert.equal(history[0].p,100);assert.equal(history[0].m,10);assert.equal(history[0].review.rows.length,20);
  // Auf einem neuen Gerät: nur Sitzung übernehmen, keinerlei localStorage.
  const ctx2=await browser.newContext({storageState:{cookies:await ctx.cookies(),origins:[]},viewport:{width:390,height:844}}),page2=await ctx2.newPage();
  await page2.goto(base+'/d1-datenschutz/');await page2.click('#tab-exam');await page2.locator('[data-review="0"]').click();
  assert.equal(await page2.locator('article.review').count(),20);assert((await page2.locator('.grade h3').innerText()).startsWith('100 von 100'));
  assert((await page2.locator('article.review').first().innerText()).includes('Deine Eingabe:'));
  await page2.goto(base+'/dau-to-pro/');const card=page2.locator('.module-card').filter({hasText:'Deine Daten sind kein Buffet.'});assert.equal(await card.count(),1);assert((await card.locator('img').getAttribute('src')).includes('datenschutz.webp'));
  if(process.env.DTP_SCREENSHOT_DIR){fs.mkdirSync(process.env.DTP_SCREENSHOT_DIR,{recursive:true});await card.screenshot({path:path.join(process.env.DTP_SCREENSHOT_DIR,'d1-main-card-mobile.png')});}
  assert.deepEqual(errors,[]);console.log('D1-Konto: echte Anmeldung, Training, Prüfung, API-Speicherung, Wiederherstellung und Hauptseitenkarte bestanden');
 } finally {
  if(browser)await browser.close();if(server)server.kill();
  if(version&&/^[a-f0-9]{24}$/.test(version))fs.rmSync(path.join(root,'data/html-pages/d1-datenschutz',version),{recursive:true,force:true});fs.rmSync(tmp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exit(1)});
