'use strict';
// DAU TO PRO Avatare im echten Browser (Desktop + Smartphone): Startseiten-Highscore als Gast, Editor als Gast und angemeldet,
// Live-Vorschau, Schlösser mit Regel, Speichern, Konto und Profil-Dialog. Keine JavaScript-Fehler, alle Ebenen laden.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'dtp-avatar-'));
const env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(scratch,'site.sqlite')};
const port=23000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const shots=process.env.DTP_SCREENSHOT_DIR||'';
if(shots)fs.mkdirSync(shots,{recursive:true});
const php=code=>{
  const r=spawnSync('php',['-r',`require ${JSON.stringify(root+'/avatar_lib.php')}; ${code}`],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;
};
// Vier öffentliche Konten: zwei mit Avatar, eines ohne (Maskottchen), eines im Runner-Bereich.
php(`
$mk=function($name,$xp){db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$name,password_hash('ein-langes-passwort',PASSWORD_DEFAULT)]);$id=(int)db()->lastInsertId();ach_stats_row($id);
db()->prepare('UPDATE learner_stats SET xp=?,level=?,highscore_visible=1 WHERE learner_id=?')->execute([$xp,ach_level($xp),$id]);
db()->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'highscore_public','1')")->execute([$id]);return $id;};
$a=$mk('anna',ach_xp_for_level(31));$b=$mk('bert',ach_xp_for_level(12));$c=$mk('cleo',ach_xp_for_level(6));$d=$mk('dora',ach_xp_for_level(3));
avatar_save($a,['base'=>'f3','hair'=>'long','hairColor'=>'cyan','clothes'=>'armor-pro','accessory'=>'headset','effect'=>'flames','frame'=>'gold']);
avatar_save($b,['base'=>'m2','clothes'=>'hoodie','headwear'=>'helmet','glasses'=>'shades','frame'=>'bronze']);
avatar_save($d,['base'=>'m3','hair'=>'afro','clothes'=>'tee-circuit']);
`);
const server=spawn('php',['-S',`127.0.0.1:${port}`,'-t',root,path.join(__dirname,'support/router.php')],{env,stdio:'ignore'});
const wait=async()=>{for(let i=0;i<60;i++){try{await fetch(base+'/dau-to-pro/');return;}catch{await new Promise(r=>setTimeout(r,100));}}throw new Error('Server startet nicht');};
function watch(page,errors){
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon/.test(m.text()))errors.push('console: '+m.text());});
  page.on('requestfailed',r=>{if(/assets\/avatars|avatar/.test(r.url()))errors.push('requestfailed: '+r.url());});
  page.on('response',r=>{if(/assets\/avatars/.test(r.url())&&r.status()>=400)errors.push('http '+r.status()+': '+r.url());});
}
async function imagesLoaded(page,selector){
  return page.$$eval(selector,imgs=>Promise.all(imgs.map(img=>img.complete?img:new Promise(r=>{img.onload=img.onerror=()=>r(img);}))).then(list=>list.filter(i=>!i.naturalWidth).map(i=>i.src)));
}
(async()=>{
  await wait();
  const browser=await chromium.launch();
  try{
    for(const view of [{name:'desktop',viewport:{width:1366,height:900}},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
      // --- Gast: Highscore auf der Startseite
      const guest=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch});
      const page=await guest.newPage();const errors=[];watch(page,errors);
      await page.goto(base+'/dau-to-pro/#highscore');
      await page.locator('.arcade-champions').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.arcade-champions .arcade-avatar').count(),3,'Drei Hex-Fassungen');
      assert.equal(await page.locator('.arcade-champion.rank-1 .arcade-avatar.has-avatar').count(),1,'Platz 1 zeigt den Avatar (Gast)');
      assert.equal(await page.locator('.arcade-champion.rank-3 .arcade-avatar.has-mascot').count(),1,'Ohne Avatar: Maskottchen');
      await page.waitForTimeout(300);
      for(const img of await page.locator('.arcade-avatar img').all())await img.scrollIntoViewIfNeeded().catch(()=>{});
      assert.deepEqual(await imagesLoaded(page,'.arcade-avatar img'),[],'Alle Avatar-Ebenen laden');
      const box=await page.locator('.arcade-champion.rank-1 .arcade-avatar').boundingBox();
      const layer=await page.locator('.arcade-champion.rank-1 .arcade-avatar .dtp-avatar').boundingBox();
      assert.ok(layer.width>box.width-6 && layer.width<=box.width,'Stapel füllt die Hex-Fassung');
      if(shots)await page.locator('.arcade-stage').screenshot({path:path.join(shots,`highscore-${view.name}.png`)});
      // --- Gast: Editor
      await page.goto(base+'/dau-to-pro/avatar.php');
      await page.waitForSelector('.avatar-tile');
      assert.ok(await page.locator('a.primary-action[href="konto.php"]').isVisible(),'Gast: Anmelden zum Speichern');
      assert.equal(await page.locator('[data-avatar-save]').count(),0,'Gast: kein Speichern-Knopf');
      await page.locator('.avatar-tab',{hasText:'Outfit'}).click();
      const lockedTile=page.locator('.avatar-tile.is-locked',{hasText:'PRO-Rüstung'});
      assert.ok(await lockedTile.locator('.avatar-lock').isVisible(),'Schloss sichtbar');
      assert.match(await lockedTile.locator('.avatar-rule').textContent(),/Ab Level 30/,'Regel sichtbar');
      await lockedTile.click();
      assert.match(await page.locator('[data-avatar-status]').textContent(),/Gesperrt/,'Gesperrtes Teil wird nicht gewählt');
      await page.locator('.avatar-tile',{hasText:'Platinen-Shirt'}).click();
      assert.ok(await page.locator('[data-avatar-preview] img[src*="clothes/tee-circuit"]').count()===1,'Live-Vorschau übernimmt das Outfit');
      if(view.name==='mobile'){
        const width=await page.evaluate(()=>document.documentElement.scrollWidth);
        assert.ok(width<=391,'Mobil: kein horizontales Scrollen ('+width+')');
      }
      assert.deepEqual(errors,[],'Gast ohne JS-Fehler: '+errors.join('\n'));
      await guest.close();

      // --- Angemeldet: Editor, Speichern, Konto, Profil
      const ctx=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch});
      const p=await ctx.newPage();const errs=[];watch(p,errs);
      await p.goto(base+'/dau-to-pro/konto.php');
      await p.fill('input[name=username]','bert');await p.fill('input[name=password]','ein-langes-passwort');
      await Promise.all([p.waitForNavigation(),p.click('.auth-form button[type=submit]')]);
      await p.goto(base+'/dau-to-pro/konto.php');
      await p.waitForSelector('.konto-avatar');
      assert.ok(await p.locator('.konto-avatar img[src*="bases/m2"]').count()===1,'Konto zeigt den eigenen Avatar');
      await p.locator('.konto-avatar a[href="avatar.php"]').click();
      await p.waitForSelector('.avatar-tile');
      assert.ok(await p.locator('[data-avatar-preview] img[src*="headwear/helmet"]').count()===1,'Editor lädt den gespeicherten Avatar');
      assert.ok(await p.locator('[data-avatar-save]').isDisabled(),'Ohne Änderung nichts zu speichern');
      await p.locator('.avatar-tab',{hasText:'Typ'}).click();
      await p.locator('.avatar-tile',{hasText:'Diva'}).click();
      await p.locator('.avatar-tab',{hasText:'Kopf'}).click();
      await p.locator('.avatar-tile',{hasText:'Cap'}).click();
      await p.locator('.avatar-tab',{hasText:'Extras'}).click();
      await p.locator('.avatar-tile',{hasText:'Cyber-Visor'}).click().catch(()=>{});
      assert.ok(await p.locator('.avatar-tile.is-locked',{hasText:'Cyber-Visor'}).count()===1,'Level 12: Visor noch gesperrt');
      await p.locator('.avatar-tile',{hasText:'Headset'}).click();
      assert.ok(await p.locator('[data-avatar-preview] img[src*="bases/f3"]').count()===1 && await p.locator('[data-avatar-preview] img[src*="accessories/headset"]').count()===1,'Vorschau live');
      await p.locator('[data-avatar-save]').click();
      await p.waitForFunction(()=>document.querySelector('[data-avatar-status]').classList.contains('is-ok'));
      const saved=JSON.parse(php(`echo json_encode(avatar_get((int)learner_find('bert')['id']));`));
      assert.equal(saved.base,'f3');assert.equal(saved.headwear,'cap');assert.equal(saved.accessory,'headset');
      assert.deepEqual(await imagesLoaded(p,'.avatar-tile img, [data-avatar-preview] img'),[],'Alle Kachel- und Vorschau-Ebenen laden');
      if(shots)await p.screenshot({path:path.join(shots,`editor-${view.name}.png`),fullPage:view.name==='mobile'});
      await p.reload();await p.waitForSelector('.avatar-tile');
      assert.ok(await p.locator('[data-avatar-preview] img[src*="bases/f3"]').count()===1,'Nach Neuladen gespeichert');
      await p.goto(base+'/dau-to-pro/highscore.php');
      assert.ok(await p.locator('.arcade-avatar.has-avatar img[src*="bases/f3"]').count()>=1,'Highscore zeigt den neuen Avatar');
      await p.locator('.arcade-champion.rank-1 .profile-open').click();
      await p.waitForSelector('#profile-content .profile-avatar img');
      assert.deepEqual(await imagesLoaded(p,'.arcade-avatar img, .profile-avatar img'),[],'Highscore- und Profil-Ebenen laden');
      if(shots)await p.screenshot({path:path.join(shots,`profile-${view.name}.png`)});
      assert.deepEqual(errs,[],'Angemeldet ohne JS-Fehler: '+errs.join('\n'));
      // Zurück auf den ursprünglichen Avatar für die zweite Ansicht.
      php(`avatar_save((int)learner_find('bert')['id'],['base'=>'m2','clothes'=>'hoodie','headwear'=>'helmet','glasses'=>'shades','frame'=>'bronze']);`);
      await ctx.close();
    }
    console.log('Avatar-Browsertest: Desktop und Smartphone OK');
  } finally {
    await browser.close();server.kill();fs.rmSync(scratch,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);server.kill();process.exit(1);});
