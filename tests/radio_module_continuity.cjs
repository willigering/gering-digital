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
    db()->exec("DELETE FROM html_pages");
    $q=db()->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES(?,?,?,'lernen',1)");
    $q->execute(['osi','Testmodul OSI','Modulwechsel testen']);
    $q->execute(['subnetsprint','Testmodul Subnet','Modulwechsel testen']);`;
  const r=spawnSync('php',['-r',code],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  fs.rmSync(testDir,{recursive:true,force:true});
  fs.mkdirSync(testDir,{recursive:true});
  fs.writeFileSync(path.join(testDir,'01_Test_Alpha.wav'),wav(24,150));
  fs.writeFileSync(path.join(testDir,'02_Test_Beta.wav'),wav(24,180));
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

  await page.locator('#module-grid a.module-card[href="../osi/"]').click();
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

  await page.locator('#module-grid a.module-card[href="../osi/"]').click();
  await page.locator('[data-module-shell]').waitFor({state:'visible'});
  assert.equal(await page.frameLocator('[data-module-frame]').locator('dtp-back').isVisible(),false,
    'Only the outer navigation remains visible in the learning view');
  await page.locator('[data-module-back]').click();
  await page.locator('[data-module-shell]').waitFor({state:'hidden'});
  assert.equal((await state()).state,'playing','Returning from the single navigation bar retains playback');
  // A directly opened module has no shell: its original navigation must remain.
  await page.goto(base+'/osi/',{waitUntil:'networkidle'});
  assert.ok(await page.locator('dtp-back #back-module').isVisible(),
    'Unframed modules keep their own Modulauswahl link');
  assert.deepEqual(errors,[],'No uncaught browser errors');
  console.log('PASS: NERD FM continues through module entry, switching, pause/resume and back navigation');
})().catch(err=>{console.error(err);process.exitCode=1}).finally(async()=>{
  try{await browser?.close()}catch{}
  try{server?.kill()}catch{}
  fs.rmSync(testDir,{recursive:true,force:true});
  fs.rmSync(scratch,{recursive:true,force:true});
});
