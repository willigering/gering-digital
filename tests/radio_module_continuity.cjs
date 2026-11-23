'use strict';
// Regression: An actual WAV keeps playing in the original NERD-FM AudioContext
// while published module URLs are displayed in a persistent same-origin frame.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'dtp-module-radio-'));
const testDir = path.join(root, 'dau-to-pro/audio/nerd-radio-test');
const port = 25000 + Math.floor(Math.random() * 1500);
const base = 'http://127.0.0.1:' + port;
const env = {...process.env, GD_ROOT:root, GD_DB_PATH:path.join(scratch,'site.sqlite'), NERD_RADIO_AUDIO:'audio/nerd-radio-test'};
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));

function wav(seconds, frequency) {
  const sampleRate=22050,n=Math.round(sampleRate*seconds),b=Buffer.alloc(44+n*2);
  b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(sampleRate,24);
  b.writeUInt32LE(sampleRate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);
  b.write('data',36);b.writeUInt32LE(n*2,40);
  for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(2*Math.PI*frequency*i/sampleRate)*8200),44+i*2);
  return b;
}
function setup() {
  const code=`require ${JSON.stringify(root+'/dau_lib.php')};
    require_once ${JSON.stringify(root+'/learner_lib.php')};
    learner_register('RadioTest','Fixture-radio!982','Fixture-radio!982');
    db()->exec("DELETE FROM html_pages");
    $q=db()->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES(?,?,?,'lernen',1)");
    $q->execute(['osi','Testmodul OSI','Modulwechsel testen']);
    $q->execute(['subnetsprint','Testmodul Subnet','Modulwechsel testen']);`;
  const r=spawnSync('php',['-r',code],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  fs.rmSync(testDir,{recursive:true,force:true});
  fs.mkdirSync(testDir,{recursive:true});
  fs.writeFileSync(path.join(testDir,'01_Test_Alpha.wav'),wav(60,150));
  fs.writeFileSync(path.join(testDir,'02_Test_Beta.wav'),wav(60,180));
}
function probe() {
  return new Promise(resolve=>{
    const q=http.get(base+'/dau-to-pro/',r=>{r.resume();resolve(r.statusCode===200)});
    q.on('error',()=>resolve(false));
    q.setTimeout(1500,()=>{q.destroy();resolve(false)});
  });
}
function seconds(str) {
  const p=str.split(':').map(Number);
  return p[0]*60+p[1];
}
let server,browser;
(async()=>{
  setup();
  server=spawn('php',['-S','127.0.0.1:'+port,'-t',root,path.join(__dirname,'support/radio_module_router.php')],{env,stdio:'ignore'});
  let ready=false;
  for(let i=0;i<60;i++){if(await probe()){ready=true;break}await sleep(100)}
  assert.ok(ready,'PHP fixture server starts');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(base+'/dau-to-pro/konto.php?material=1#unterrichtszugang');
  const login=page.locator('form:has(input[name="action"][value="login"])');
  await login.locator('[name="username"]').fill('RadioTest');
  await login.locator('[name="password"]').fill('Fixture-radio!982');
  await login.locator('button[type="submit"]').click();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
  const radioStart = await page.evaluate(() => ({
    hasRadio: !!document.querySelector('[data-nerd-radio]'),
    hasInstance: !!document.querySelector('[data-nerd-radio]')?.nerdRadio,
    tracks: document.querySelectorAll('.nr-playlist__play').length,
    dataset: document.querySelector('[data-nerd-radio]')?.dataset.tracks?.slice(0,240)
  }));
  assert.ok(radioStart.hasInstance && radioStart.tracks > 0,
    'NERD FM initialization failed: '+JSON.stringify({radioStart, errors}));
  // No playback started: module links MUST use their regular page navigation,
  // without the persistent-radio shell or a second navigation toolbar.
  assert.equal(await page.locator('[data-nerd-radio]').getAttribute('data-state'), 'stopped');
  await page.locator('#module-grid .module-card[href="../osi/"], #module-grid .module-card a[href="../osi/"]').click();
  await page.waitForURL(base+'/osi/');
  assert.equal(await page.locator('[data-module-shell]').count(),0,
    'Inactive radio must not insert its module-shell toolbar');
  assert.ok(await page.locator('dtp-back #back-module').isVisible(),
    'Native module keeps its one standard back link');

  // Deep links to the shell parameter must also resolve to a native module
  // when the radio was not active before the new page was loaded.
  await page.goto(base+'/dau-to-pro/?modul=osi');
  await page.waitForURL(base+'/osi/');
  assert.ok(await page.locator('dtp-back #back-module').isVisible());
  await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-nerd-radio]').getAttribute('data-state'), 'stopped');

  const state=()=>page.evaluate(()=>{
    const radio=document.querySelector('[data-nerd-radio]');
    const r=radio.nerdRadio;
    return {state:r.state,track:r.track,contexts:r.contexts,
      elapsed:radio.querySelector('[data-radio-elapsed]').textContent,
      title:radio.querySelector('[data-radio-title]').textContent};
  });
  await page.locator('[data-radio-list]').click();
  await page.locator('.nr-playlist__play').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-nerd-radio]').nerdRadio.state==='playing');
  await sleep(1150);
  const before=await state();
  assert.equal(before.state,'playing');
  assert.equal(before.contexts,1);
  assert.ok(seconds(before.elapsed)>=1);

  await page.locator('#module-grid .module-card[href="../osi/"], #module-grid .module-card a[href="../osi/"]').click();
  await page.locator('[data-module-shell]').waitFor({state:'visible'});
  await page.frameLocator('[data-module-frame]').locator('h1').waitFor();
  assert.equal(await page.frameLocator('[data-module-frame]').locator('dtp-back').isVisible(),false,
    'Embedded module must not show a second Modulauswahl header');
  assert.equal(new URL(page.url()).searchParams.get('modul'),'osi');
  await sleep(1600);
  const opened=await state();
  assert.equal(opened.state,'playing','Playback continues in module');
  assert.equal(opened.contexts,1,'Only one original AudioContext');
  assert.equal(opened.track,before.track,'No track reset while opening module');
  assert.ok(seconds(opened.elapsed)>seconds(before.elapsed),'Time advances during module');

  await page.locator('[data-module-radio-play]').click();
  assert.equal((await state()).state,'paused','Mini-controls pause original radio');
  await sleep(250);
  const paused=(await state()).elapsed;
  await sleep(1100);
  assert.equal((await state()).elapsed,paused,'No progress while paused');
  await page.locator('[data-module-radio-play]').click();
  await page.waitForFunction(()=>document.querySelector('[data-nerd-radio]').nerdRadio.state==='playing');
  await page.frameLocator('[data-module-frame]').locator('#next-module').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('modul')==='subnetsprint');
  await page.frameLocator('[data-module-frame]').locator('h1').waitFor();
  assert.equal((await state()).state,'playing','Music survives module-to-module navigation');

  await page.locator('[data-module-back]').click();
  await page.locator('[data-module-shell]').waitFor({state:'hidden'});
  assert.equal((await state()).state,'playing','Music survives return to overview');
  assert.ok(!new URL(page.url()).searchParams.has('modul'));

  await page.locator('#module-grid .module-card[href="../osi/"], #module-grid .module-card a[href="../osi/"]').click();
  await page.locator('[data-module-shell]').waitFor({state:'visible'});
  assert.equal(await page.frameLocator('[data-module-frame]').locator('dtp-back').isVisible(),false,
    'Only the outer navigation remains visible in the learning view');
  await page.locator('[data-module-back]').click();
  await page.locator('[data-module-shell]').waitFor({state:'hidden'});
  assert.equal((await state()).state,'playing','Returning from the single navigation bar retains playback');
  const learningFrame=page.frameLocator('[data-module-frame]');
  await page.locator('#cheat-sheets a.cheat-mini[href$="thema=csharp"]').click();
  const method=learningFrame.locator('#sheet-jump a', {hasText:'Methoden und Rückgabe'});
  await method.click();
  assert.equal(await method.getAttribute('aria-current'),'true');
  assert.equal(await method.evaluate(tab=>{
    const bar=tab.parentElement.getBoundingClientRect(),rect=tab.getBoundingClientRect();
    return rect.left>=bar.left-1 && rect.right<=bar.right+1;
  }),true,'The active desktop tab is fully visible');

  await page.setViewportSize({width:390,height:844});
  await method.click();
  assert.equal(await method.evaluate(tab=>{
    const bar=tab.parentElement.getBoundingClientRect(),rect=tab.getBoundingClientRect();
    return rect.left>=bar.left+11 && rect.right<=bar.right-11;
  }),true,'The active mobile tab stays clear of the faded edges');
  await page.setViewportSize({width:1440,height:900});

  await learningFrame.getByRole('link',{name:/C# BEFEHLE/}).click();
  await page.waitForURL(url=>url.searchParams.get('modul')==='/dau-to-pro/csharp-befehle.html');
  assert.equal((await state()).track,before.track,'Music survives switching from a cheat sheet to its C# reference');
  await page.locator('[data-module-back]').click();
  await page.locator('[data-module-shell]').waitFor({state:'hidden'});

  if (!(await page.locator('#unterrichtsmaterial').evaluate(el=>el.open))) await page.locator('#unterrichtsmaterial summary').click();
  await page.locator('#unterrichtsmaterial a[href="unterricht/csharp-aufgaben.html"]').click();
  await page.waitForURL(url=>url.searchParams.get('modul')==='/dau-to-pro/unterricht/csharp-aufgaben.html');
  await learningFrame.locator('.dtp-top a[href$="#unterrichtsmaterial"]').click();
  await page.locator('[data-module-shell]').waitFor({state:'hidden'});

  const workshop=page.locator('#werkstatt');
  assert.ok(await workshop.locator('a[href="unterricht/er-diagramme-bauen.php"]').isVisible());
  assert.match(await workshop.locator('article.is-coming-soon').textContent(), /Finde den Fehler/);
  const afterLearning=await state();
  assert.equal(afterLearning.state,'playing','Music survives cheat sheets and classroom materials');
  assert.equal(afterLearning.track,before.track);
  assert.equal(afterLearning.contexts,1);

  // A directly opened module has no shell: its original navigation must remain.
  await page.goto(base+'/osi/',{waitUntil:'networkidle'});
  assert.ok(await page.locator('dtp-back #back-module').isVisible(),
    'Unframed modules keep their own Modulauswahl link');
  await page.goto(base+'/dau-to-pro/unterricht/er-diagramme-bauen.php');
  const board=page.locator('#canvas');
  await board.waitFor();
  assert.equal(await page.locator('#taskSelect option').count(),4,'Four original tasks');
  assert.equal(await page.locator('#nodes .node').count(),0,'New account starts with a blank diagram');
  const rect=await board.boundingBox();
  async function place(type,x,y){
    await page.locator('[data-shape="'+type+'"]').click();
    assert.ok(await page.locator('#placementGhost svg').isVisible(),'Picked-up shape is visible');
    await page.mouse.click(rect.x+x,rect.y+y);
    assert.equal(await page.locator('#placementGhost').isVisible(),false);
  }
  await place('entity',220,260);await place('relation',650,260);
  assert.equal(await page.locator('#nodes .node').count(),2);
  assert.equal(await page.locator('#nodes .portControl').count(),8,'Four ports on each shape');
  assert.equal(await page.locator('.selectionOutline').count(),0,'No rectangular selection frame');
  const firstId=await page.locator('#nodes .node').first().getAttribute('data-id');
  const secondId=await page.locator('#nodes .node').last().getAttribute('data-id');
  const first=()=>page.locator('#nodes .node[data-id="'+firstId+'"]');
  const second=()=>page.locator('#nodes .node[data-id="'+secondId+'"]');
  await first().locator('.body').dblclick();
  assert.equal(await page.locator('#inlineEditor').evaluate(el=>el.closest('.node')?.dataset.id),firstId,'Edit label inside the shape');
  await page.locator('#inlineEditor').fill('Mitglied');await page.locator('#inlineEditor').press('Enter');
  assert.equal(await first().locator('.caption').textContent(),'Mitglied');
  await first().locator('.body').click();
  const portBox=await first().locator('.portControl').first().boundingBox();
  const targetBox=await second().locator('.body').boundingBox();
  await page.mouse.move(portBox.x+portBox.width/2,portBox.y+portBox.height/2);await page.mouse.down();
  await page.mouse.move(targetBox.x+targetBox.width/2,targetBox.y+targetBox.height/2,{steps:10});
  assert.ok(await page.locator('.connectTarget').count(),'Target form is highlighted');await page.mouse.up();
  assert.equal(await page.locator('#lines .connection').count(),1);
  const edgePoint=await page.locator('#lines .connection path:not(.hit)').evaluate(el=>{const p=el.getPointAtLength(el.getTotalLength()/2),v=new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM());return{x:v.x,y:v.y}});
  await page.mouse.click(edgePoint.x,edgePoint.y,{button:'right'});
  assert.ok(await page.locator('.connection.selected .selectionHalo').count());
  const cards=page.locator('#editorContext select');await cards.nth(0).selectOption('1');await cards.nth(1).selectOption('n');
  await page.keyboard.press('Escape');
  const positions=await page.locator('.cardinality').evaluateAll(els=>els.map(el=>Number(el.getAttribute('y'))));
  assert.equal(positions[0],positions[1],'Horizontal cardinalities share the same side');
  await page.keyboard.press('Delete');assert.equal(await page.locator('#lines .connection').count(),0);
  await page.keyboard.press('Control+z');assert.equal(await page.locator('#lines .connection').count(),1);
  for(const task of ['schule','fitness','auto']){await page.locator('#taskSelect').selectOption(task);assert.equal(await page.locator('#nodes .node').count(),0)}
  await page.locator('#taskSelect').selectOption('bibliothek');assert.equal(await page.locator('#nodes .node').count(),2);
  async function exported(button,suffix){const [file]=await Promise.all([page.waitForEvent('download'),page.locator(button).click()]);assert.ok(file.suggestedFilename().endsWith(suffix));const name=await file.path();assert.ok(name);return name}
  const jsonPath=await exported('#exportJson','.json'),project=JSON.parse(fs.readFileSync(jsonPath,'utf8'));
  assert.equal(project.state.documents.bibliothek.nodes.length,2);
  assert.equal(Object.keys(project.state.documents).length,4);
  const svgPath=await exported('#exportSvg','.svg');assert.match(fs.readFileSync(svgPath,'utf8'),/Mitglied/);
  const pngPath=await exported('#exportPng','.png');assert.equal(fs.readFileSync(pngPath).subarray(1,4).toString(),'PNG');
  const pdfPath=await exported('#exportPdf','.pdf');assert.equal(fs.readFileSync(pdfPath).subarray(0,5).toString(),'%PDF-');
  await board.focus();await page.keyboard.press('Control+a');await page.keyboard.press('Delete');assert.equal(await page.locator('#nodes .node').count(),0);
  await page.locator('#fileInput').setInputFiles(jsonPath);await page.waitForFunction(()=>document.querySelectorAll('#nodes .node').length===2);
  await page.reload();assert.equal(await page.locator('#nodes .node').count(),2,'Account autosave survives reload');
  assert.ok(await page.getByRole('link',{name:'Zur Werkstatt',exact:true}).isVisible());
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS: NERD FM continues through module entry, switching, pause/resume and back navigation');
})().catch(err=>{console.error(err);process.exitCode=1}).finally(async()=>{
  try{await browser?.close()}catch{}
  try{server?.kill()}catch{}
  fs.rmSync(testDir,{recursive:true,force:true});
  fs.rmSync(scratch,{recursive:true,force:true});
});
