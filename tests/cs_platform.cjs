/* Actual PHP sync API + temporary SQLite database; nothing is published externally. */
const {chromium}=require('playwright');
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),scratch=fs.mkdtempSync(path.join(os.tmpdir(),'cs-platform-'));
const php=process.env.PHP_BINARY||'php',env={...process.env,GD_DB_PATH:path.join(scratch,'site.sqlite')};
function run(code){const r=spawnSync(php,['-r',`require ${JSON.stringify(root+'/achievements_lib.php')};require_once ${JSON.stringify(root+'/dau_lib.php')};${code}`],{env,encoding:'utf8'});assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
const fixture=run(`$b=hp_bundles()['cs1-csharp'];if($b['preview']!=='csharp')throw new Exception('Preview');$v=hp_import_local($b['path'],$b['slug']);db()->prepare('INSERT INTO html_pages(slug,title,subject,description,category,published,live_version,preview_image) VALUES(?,?,?,?,?,?,?,?)')->execute([$b['slug'],$b['title'],$b['subject'],$b['description'],'lernen',1,$v,hp_bundle_preview($b)]);db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute(['cslearner',password_hash('F2-local-fixture-password',PASSWORD_DEFAULT)]);echo json_encode(['version'=>$v,'id'=>(int)db()->lastInsertId()]);`);
const {version,id}=JSON.parse(fixture);let browser,server;
const router=path.join(scratch,'router.php');
fs.writeFileSync(router,`<?php
$root=${JSON.stringify(root)};
$p=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if($p==='/fixture-login'){require $root.'/learner_lib.php';learner_start_session(learner_find('cslearner'),false);echo 'ok';return;}
if($p==='/cs1-csharp/'){$_GET['slug']='cs1-csharp';require $root.'/html_project.php';return;}
if($p==='/fixture-card'){require $root.'/dau_lib.php';$m=db()->query("SELECT * FROM html_pages WHERE slug='cs1-csharp'")->fetch(PDO::FETCH_ASSOC);echo '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dau-to-pro/style.css"><body class="dtp-landing"><main class="wrap"><div class="module-grid" data-count="5">';foreach(json_decode(file_get_contents($root.'/lernmodule/manifest.json'),true)['modules'] as $card)echo dtp_module_card($card,'/');echo '</div></main></body>';return;}
if(is_file($root.$p))return false;
http_response_code(404);`);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const port=25000+Math.floor(Math.random()*5000),base='http://127.0.0.1:'+port;
 server=spawn(php,['-S','127.0.0.1:'+port,'-t',root,router],{env,stdio:'ignore'});
 browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(let i=0;i<30;i++){try{await page.goto(base+'/fixture-login');break;}catch{await pause(100);}}
 const replies=[];page.on('response',async r=>{if(r.url().endsWith('/api/progress.php'))replies.push(await r.json());});
 await page.goto(base+'/cs1-csharp/');await page.locator('dtp-back').waitFor();assert.equal(await page.locator('dtp-back').count(),1);
 // Solve an actual module question; the injected sync, not a hand-written request, saves it.
 await page.locator('#tab-train').click();const t=await page.evaluate(()=>CS1START_TEST.last());if(t.kind==='mc')await page.locator('#trainTask [data-v="'+t.answer+'"]').click();else{await page.locator('#trainTask input').fill(String(t.answer));await page.locator('#trainTask [data-r="check"]').click();}
 await page.waitForFunction(()=>document.querySelector('dtp-back'));await pause(1500);
 assert.equal(JSON.parse(run(`echo json_encode(learner_progress_state(${id})['values']);`))['cs1-start-stats-v1']!==undefined,true);
 const saved=JSON.parse(run(`echo json_encode(learner_progress_state(${id})['values']);`));assert.equal(JSON.parse(saved['cs1-start-stats-v1']).correct,1);
 // Central rules receive real module IDs and the exact contract shape.
 await page.evaluate(()=>{
  const st={};for(let i=0;i<10;i++)st[i]={hist:Array(10).fill(true),solved:13,mastered:true};
  localStorage.setItem('cs1-start-path-v1',JSON.stringify({stage:9,st}));
  localStorage.setItem('cs1-start-subs-v1',JSON.stringify({g_fix:Array(10).fill(1),t_literal:Array(10).fill(1),v_fix:Array(10).fill(1),u_wer:Array(10).fill(1),u_fehlerart:Array(10).fill(1),w_html:[0,0,0],u_nein:[0,0,0],t_ueberlauf:[0,0,0]}));
  localStorage.setItem('cs1-start-exam-v1',JSON.stringify([{d:'03.11.26, 08:00',m:90,p:90,g:2,r:'Abgegeben'}]));
 });await pause(1600);
 const awards=JSON.parse(run(`echo json_encode(array_keys(ach_unlocked(${id})));`));assert.equal(awards.filter(s=>s.startsWith('cs1.')).length,10);assert.equal(awards.filter(s=>s.startsWith('cs.')).length,0,'Altes C# (CS2) darf durch CS1 nichts freischalten');
 const before=JSON.parse(run(`echo json_encode(ach_stats(${id})['level']);`));
 const twice=JSON.parse(run(`echo json_encode(ach_evaluate(${id}));`));assert.equal(twice.new.length,0);const after=JSON.parse(run(`echo json_encode(ach_stats(${id})['level']);`));assert.equal(after.xp,before.xp);
 assert.ok(replies.length>0&&replies.every(r=>r.ok===true));assert.equal(await page.locator('dtp-achievement').count(),1);
 // Restore server-side data on a fresh browser device.
 const context=await browser.newContext();const other=await context.newPage();await other.goto(base+'/fixture-login');await other.goto(base+'/cs1-csharp/');assert.equal(await other.evaluate(()=>JSON.parse(localStorage.getItem('cs1-start-path-v1')).st[9].mastered),true);
 // Actual central card renderer, with the real image and responsive source set.
 for(const width of [1280,390]){await other.setViewportSize({width,height:844});await other.goto(base+'/fixture-card');const card=other.locator('.module-card[href="/cs1-csharp/"]');await card.waitFor();assert.equal(await card.getAttribute('data-topic'),'sonstiges');assert.match(await card.locator('img').getAttribute('src'),/csharp.webp/);for(const img of await other.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await other.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));assert.ok(await other.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(process.env.DTP_SCREENSHOT_DIR){fs.mkdirSync(process.env.DTP_SCREENSHOT_DIR,{recursive:true});await card.screenshot({path:path.join(process.env.DTP_SCREENSHOT_DIR,'f2-card-'+width+'.png')});}}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({sync:true,restore:true,achievements:10,idempotent:true,popup:true,cardWidths:[1280,390],errors}));
}finally{if(browser)await browser.close();if(server)server.kill();run(`hp_delete_tree(hp_version_dir('cs1-csharp',${JSON.stringify(version)}));`);fs.rmSync(scratch,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exit(1)});
