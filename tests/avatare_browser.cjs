'use strict';
// DAU TO PRO Avatare im echten Browser (Desktop + Smartphone): Startseiten-Highscore als Gast mit zusammengesetzten
// Avataren in den Sechsecken, Auswahlseite als Gast und angemeldet (Live-Vorschau, Zubehör an/aus, Speichern),
// Konto-Karte und Profil-Dialog. Keine JavaScript-Fehler, alle Ebenen laden, Ebenen liegen deckungsgleich.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'dtp-avatare-'));
const env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(scratch,'site.sqlite')};
const port=24000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const shots=process.env.DTP_SCREENSHOT_DIR||'';
if(shots)fs.mkdirSync(shots,{recursive:true});
const php=code=>{
  const r=spawnSync('php',['-r',`require ${JSON.stringify(root+'/achievements_lib.php')}; require ${JSON.stringify(root+'/avatare_lib.php')}; ${code}`],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;
};
// Fünf öffentliche Konten: drei mit Avatar (einer davon im Runner-Bereich), zwei ohne.
php(`
$mk=function($name,$xp){db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute([$name,password_hash('ein-langes-passwort',PASSWORD_DEFAULT)]);$id=(int)db()->lastInsertId();ach_stats_row($id);
db()->prepare('UPDATE learner_stats SET xp=?,level=?,highscore_visible=1 WHERE learner_id=?')->execute([$xp,ach_level($xp),$id]);
db()->prepare("INSERT INTO learner_prefs(learner_id,pref_key,value) VALUES(?,'highscore_public','1')")->execute([$id]);return $id;};
$a=$mk('anna',ach_xp_for_level(31));$b=$mk('bert',ach_xp_for_level(12));$c=$mk('cleo',ach_xp_for_level(6));$d=$mk('dora',ach_xp_for_level(3));$e=$mk('emil',ach_xp_for_level(2));
dtp_avatar_save($a,dtp_avatar_full('avatar-03'));
dtp_avatar_save($b,['id'=>'avatar-06','parts'=>['jacke','kopfhoerer','schlaefenklammer']]);
dtp_avatar_save($d,['id'=>'avatar-07','parts'=>['brille']]);
`);
const server=spawn('php',['-S',`127.0.0.1:${port}`,'-t',root,path.join(__dirname,'support/router.php')],{env,stdio:'ignore'});
const wait=async()=>{for(let i=0;i<60;i++){try{await fetch(base+'/dau-to-pro/');return;}catch{await new Promise(r=>setTimeout(r,100));}}throw new Error('Server startet nicht');};
function watch(page,errors){
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon/.test(m.text()))errors.push('console: '+m.text());});
  page.on('response',r=>{if(/dau-avatare|avatare/.test(r.url())&&r.status()>=400)errors.push('http '+r.status()+': '+r.url());});
}
async function imagesLoaded(page,selector){
  return page.$$eval(selector,imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.complete&&img.naturalWidth?img:new Promise(r=>{img.onload=img.onerror=()=>r(img);setTimeout(()=>r(img),4000);});})).then(list=>list.filter(i=>!i.naturalWidth).map(i=>i.src)));
}
async function sameBoxes(page,selector){
  return page.$$eval(selector,stacks=>stacks.every(s=>{const boxes=[...s.querySelectorAll('img')].map(i=>i.getBoundingClientRect());return boxes.every(b=>Math.abs(b.x-boxes[0].x)<.5&&Math.abs(b.y-boxes[0].y)<.5&&Math.abs(b.width-boxes[0].width)<.5);}));
}
(async()=>{
  await wait();
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
  try{
    for(const view of [{name:'desktop',viewport:{width:1366,height:900}},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
      // --- Gast: Highscore auf der Startseite
      const guest=await browser.newContext({viewport:view.viewport,isMobile:view.isMobile,hasTouch:view.hasTouch});
      const page=await guest.newPage();const errors=[];watch(page,errors);
      await page.goto(base+'/dau-to-pro/#highscore');
      await page.locator('.arcade-champions').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.arcade-champions .arcade-avatar').count(),3,'Drei Hex-Fassungen');
      assert.equal(await page.locator('.arcade-champion.rank-1 .arcade-avatar.has-avatar img').count(),4,'Platz 1: Basis + drei Teile');
      assert.equal(await page.locator('.arcade-champion.rank-3 .arcade-avatar.has-avatar').count(),0,'Ohne Avatar: bisheriger Platzhalter');
      assert.deepEqual(await imagesLoaded(page,'.arcade-avatar img'),[],'Alle Avatar-Ebenen laden');
      assert.ok(await sameBoxes(page,'.arcade-avatar .dtp-avatar'),'Ebenen liegen deckungsgleich');
      const hex=await page.locator('.arcade-champion.rank-1 .arcade-avatar').boundingBox();
      const art=await page.locator('.arcade-champion.rank-1 .arcade-avatar .dtp-avatar').boundingBox();
      assert.ok(hex.width>20 && Math.abs(art.width-(hex.width-4))<1.5 && Math.abs(art.x-(hex.x+2))<1,'Avatar füllt die Sechseck-Fassung innen');
      const clip=await page.$eval('.arcade-champion.rank-1 .arcade-avatar',n=>getComputedStyle(n).clipPath);
      assert.match(clip,/polygon\(50% 0(px|%)?, 98% 25%, 98% 75%, 50% 100%, 2% 75%, 2% 25%\)/,'Sechseck-Kontur');
      if(shots)await page.locator('.arcade-stage').screenshot({path:path.join(shots,`highscore-${view.name}.png`)});
      // --- Gast: Auswahlseite
      await page.goto(base+'/dau-to-pro/avatare.php');
      assert.equal(await page.locator('input[name="avatar"]').count(),10,'Zehn Arcade-Figuren');
      assert.equal(await page.locator('.avatare-parts:visible').count(),1,'Nur das Zubehör der gewählten Figur ist sichtbar');
      await page.locator('.avatare-figure').nth(9).click();
      assert.equal(await page.locator('[data-avatare-preview="512"] .dtp-avatar').getAttribute('data-avatar'),'avatar-17','Vorschau wechselt die Figur');
      assert.equal(await page.locator('[data-avatare-preview="192"] img').count(),1,'Basisporträt in der 96er-Vorschau');
      assert.equal(await page.locator('[data-parts-for="avatar-17"] input:disabled').count(),2,'Zubehör ist für Gäste gesperrt');
      assert.equal(await page.getByRole('link',{name:'Weiter lernen',exact:true}).getAttribute('href'),'./#lernmodule');
      assert.equal(await page.locator('.avatare-navigation').getByRole('link',{name:'Mein Konto',exact:true}).getAttribute('href'),'konto.php');
      assert.equal(await page.getByText('Anmelden zum Speichern').count(),1,'Gäste sehen den Hinweis zum Anmelden');
      assert.deepEqual(errors,[],`Keine Fehler (Gast, ${view.name})`);
      await guest.close();
    }
    // --- Angemeldet: wählen, speichern, Konto und Profil
    const ctx=await browser.newContext({viewport:{width:1366,height:900}});
    const page=await ctx.newPage();const errors=[];watch(page,errors);
    await page.goto(base+'/dau-to-pro/konto.php');
    await page.fill('input[name="username"]','cleo');
    await page.fill('input[name="password"]','ein-langes-passwort');
    await Promise.all([page.waitForNavigation(),page.locator('form:has(input[name="action"][value="login"]) [type="submit"]').first().click()]);
    await page.goto(base+'/dau-to-pro/konto.php');
    assert.equal(await page.locator('.konto-avatar').getByText('Avatar wählen').count(),1,'Konto verlinkt die Auswahl');
    await page.goto(base+'/dau-to-pro/avatare.php');
    assert.equal(await page.locator('input[name="avatar"][value=""]').isChecked(),true,'Noch kein Avatar gewählt');
    await page.locator('.avatare-figure').nth(0).click();
    await page.locator('[data-parts-for="avatar-08"] input[value="nachtjacke"]').check();
    await page.locator('[data-parts-for="avatar-08"] input[value="ohrclip"]').check();
    await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Avatar speichern'}).click()]);
    assert.equal(await page.locator('.konto-alert.is-ok').count(),1,'Gespeichert');
    assert.deepEqual(await page.$$eval('[data-avatare-preview="512"] img',l=>l.map(i=>i.dataset.part)),['basis','nachtjacke','ohrclip'],'Gespeicherte Teile');
    assert.deepEqual(await imagesLoaded(page,'[data-avatare-preview] img, .avatare-figure img'),[],'Alle Ebenen laden (Auswahl)');
    assert.ok(await sameBoxes(page,'[data-avatare-preview] .dtp-avatar'),'Vorschau-Ebenen liegen deckungsgleich');
    const big=await page.locator('[data-avatare-preview="512"] .dtp-avatar').boundingBox();
    assert.ok(big && big.width>200,'Große Vorschau ist sichtbar');
    if(shots)await page.screenshot({path:path.join(shots,'auswahl-desktop.png'),fullPage:true});
    await page.goto(base+'/dau-to-pro/highscore.php');
    assert.equal(await page.locator('.arcade-champion.rank-3 .arcade-avatar.has-avatar img').count(),3,'Eigener Avatar sofort im Highscore');
    assert.deepEqual(await imagesLoaded(page,'.arcade-avatar img'),[],'Alle Ebenen laden (Highscore)');
    await page.locator('.arcade-champion.rank-1 [data-profile]').click();
    await page.locator('#learner-profile .profile-avatar img').first().waitFor();
    assert.equal(await page.locator('#learner-profile .profile-avatar img').count(),4,'Profil-Dialog zeigt den Avatar');
    if(shots)await page.locator('#learner-profile').screenshot({path:path.join(shots,'profil.png')});
    await page.keyboard.press('Escape');
    await page.locator('.arcade-champion.rank-3 [data-profile]').click();
    await page.locator('#learner-profile .profile-avatar img[src*="avatar-08-basis"]').waitFor();
    assert.equal(await page.locator('#learner-profile .profile-avatar img').count(),3,'Profil zeigt die neuen Ebenen');
    assert.deepEqual(await imagesLoaded(page,'#learner-profile .profile-avatar img'),[],'Die neuen Profilbilder laden');
    assert.deepEqual(errors,[],'Keine Fehler (angemeldet)');
    await ctx.close();
    console.log('Avatare im Browser: alle Prüfungen bestanden');
  }finally{
    await browser.close();server.kill();fs.rmSync(scratch,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);server.kill();process.exit(1);});
