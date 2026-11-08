'use strict';
// Real PHP output and browser interactions, isolated from production data.
// npm install --no-save playwright@1.62.1; npx playwright install chromium
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'dtp-layout-'));
const env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(scratch,'site.sqlite')};
const port=21000+Math.floor(Math.random()*1000);
const base=`http://127.0.0.1:${port}`;
const php=code=>{
  const r=spawnSync('php',['-r',`require ${JSON.stringify(root+'/dau_lib.php')}; require_once ${JSON.stringify(root+'/learner_lib.php')}; ${code}`],{env,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;
};
const seed=()=>php(`db()->exec("DELETE FROM html_pages"); $q=db()->prepare("INSERT INTO html_pages(slug,title,description,category,published) VALUES(?,?,?,'lernen',1)"); $q->execute(['osi','OSI-Schichten','Easy OSI']); $q->execute(['subnetsprint','Subnet Sprint','Subnetting, Subnetting, Subnetting...']);`);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Pilz-Effektebene gegen die Soll-Position im Hero-Bild (1770 × 889: x 1353, y 473, 181 × 171) messen.
const pilzBox=page=>page.evaluate(()=>{
  const i=document.querySelector('.hero-art-wrap img.hero-logo').getBoundingClientRect(),l=document.querySelector('.hero-art-wrap > .fx-layer').getBoundingClientRect();
  return {ex:i.left+i.width*1353/1770,ey:i.top+i.height*473/889,ew:i.width*181/1770,eh:i.height*171/889,x:l.left,y:l.top,w:l.width,h:l.height};
});
let server,browser;
(async()=>{
  seed();
  server=spawn('php',['-S',`127.0.0.1:${port}`,'-t',root,path.join(__dirname,'support/router.php')],{env,stdio:'ignore'});
  for(let n=0;n<60;n++){try{if((await fetch(base+'/dau-to-pro/')).ok)break}catch{} if(n===59)throw Error('PHP preview server unavailable');await pause(100)}
  browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
  const errors=[];
  const screenshots=process.env.DTP_SCREENSHOT_DIR;
  if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
  for(const [width,height] of [[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[320,568]]){
    const context=await browser.newContext({viewport:{width,height},isMobile:width<=610,hasTouch:width<=610,reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('h1').count(),1,'One clear page heading');
    assert.equal(await page.locator('.hero-plane').count(),0,'Hero is one finished artwork, not stacked layers');
    const hero=await page.locator('.hero-art-wrap[data-scene=flat] img.hero-logo').evaluate(e=>({src:e.currentSrc,loaded:e.complete&&e.naturalWidth>0,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left,view:document.documentElement.clientWidth}));
    assert.match(hero.src,/dau-to-pro-hero-v2-(885|1770)\.webp/,'Hero uses the new artwork');
    assert.ok(hero.loaded,'Hero artwork loads');
    assert.ok(hero.left>=0&&hero.right<=hero.view+0.5,`Hero artwork stays inside the window (${hero.left}..${hero.right} of ${hero.view})`);
    assert.equal(await page.locator('.hero-art-wrap > .fx-layer').count(),1,'Mushroom interaction sits over the artwork');
    const pilz=await pilzBox(page);
    for(const axis of ['x','y','w','h'])assert.ok(Math.abs(pilz[axis]-pilz['e'+axis])<1.5,`Mushroom layer matches the artwork position (${axis})`);
    const geometry=await page.evaluate(()=>{
      const r=document.querySelector('.hero-actions .secondary-action').getBoundingClientRect();
      const grid=getComputedStyle(document.querySelector('.module-grid'));
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,ctaBottom:r.bottom,columns:grid.gridTemplateColumns.split(' ').filter(track=>parseFloat(track)>0).length,
        cardWidth:document.querySelector('.module-card').getBoundingClientRect().width,modulesY:document.querySelector('.module-grid').getBoundingClientRect().top,
        overflow:[...document.querySelectorAll('.hero-copy,.hero-actions,.module-card,.step')].filter(e=>{const b=e.getBoundingClientRect();return b.left<-.5||b.right>innerWidth+.5}).map(e=>e.className)};
    });
    if(screenshots&&[1440,390,320].includes(width))await page.screenshot({path:path.join(screenshots,`desktop-${width}.png`),fullPage:true});
    assert.ok(geometry.scrollWidth<=width,`No page overflow at ${width}: ${JSON.stringify(geometry)}`);
    assert.deepEqual(geometry.overflow,[],`No clipped controls at ${width}`);
    if(width>=1024||width<=610)assert.ok(geometry.ctaBottom<height,`Information action visible on first screen at ${width}: ${geometry.ctaBottom}`);
    if(width>=1024){assert.ok(geometry.columns>=2,'Desktop retains a stable multi-column grid');assert.ok(geometry.modulesY<1400,'Modules no longer start below 2500px')}
    assert.equal(await page.locator('#pruefungsfinder').count(),0,'Prüfungsfinder was removed');
    assert.equal(await page.locator('#exam-form').count(),0,'No exam search field remains');
    assert.equal(await page.locator('.module-card:visible').count(),2,'All modules initially visible');
    assert.deepEqual(await page.locator('.filterbar [data-filter]').evaluateAll(options=>options.map(option=>option.dataset.filter)),['alle','subnet','netzwerk','sicherheit','pruefung','sonstiges','wirtschaft'],'All modules followed by all six topics');
    await page.locator('[data-filter="subnet"]').click();
    assert.equal(await page.locator('.module-card:visible').count(),1,'Topic filter works without exam finder');
    assert.equal(await page.locator('#module-grid').getAttribute('data-count'),'1','Visible module count updates');
    assert.ok(Math.abs(await page.locator('.module-card:visible').evaluate(n=>n.getBoundingClientRect().width)-geometry.cardWidth)<1,'Filtered cards retain their width');
    await page.locator('[data-filter="wirtschaft"]').click();
    assert.ok(await page.locator('#search-empty').isVisible(),'Empty topic state is visible');
    await page.locator('[data-filter="alle"]').click();
    assert.equal(await page.locator('.module-card:visible').count(),2,'All modules restored');
    assert.ok(await page.locator('#search-empty').isHidden(),'Empty topic state dismissed');
    if(width<=860){
      await page.getByRole('button',{name:'Mein Konto',exact:true}).click();
      assert.ok(await page.locator('#dtp-mobile-menu').isVisible());
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#dtp-mobile-menu').isHidden());
    }
    await page.locator('.disclaimer-shell summary').click();
    assert.ok(await page.locator('.disclaimer-body').isVisible(),'Full disclaimer can be opened');
    await page.getByRole('button',{name:'Pixelpilz',exact:true}).click();
    assert.equal(await page.locator('.fx-count').textContent(),'1x','Easter egg still responds');
    console.log(`${width}×${height}: layout, topic tabs, navigation and mushroom passed; modules y=${Math.round(geometry.modulesY)}`);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
  const originalHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  await page.evaluate(()=>scrollTo(0,300));await pause(150);
  assert.notEqual(await page.locator('.dtp-world-texture').evaluate(e=>getComputedStyle(e).translate),'none','Background parallax runs');
  assert.equal(await page.locator('.hero-art-wrap').evaluate(e=>getComputedStyle(e).translate),'none','Hero stays fixed while scrolling');
  await page.locator('.hero-visual').hover();await pause(300);
  const moved=await pilzBox(page);
  for(const axis of ['x','y','w','h'])assert.ok(Math.abs(moved[axis]-moved['e'+axis])<1.5,'Pilz stays aligned after scroll and pointer motion');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await pause(150);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight),originalHeight,'Effects do not extend the document');
  await page.emulateMedia({reducedMotion:'reduce'});await pause(100);
  assert.equal(await page.locator('.hero-art-wrap').evaluate(e=>getComputedStyle(e).translate),'none','Reduced motion stops the artwork');
  assert.equal(await page.locator('.dtp-world-texture').evaluate(e=>getComputedStyle(e).translate),'none','Reduced motion stops the backdrop');
  await page.goto(base+'/dau-to-pro/#hinweis');
  assert.ok(await page.locator('.disclaimer-shell').evaluate(e=>e.open),'Footer deep link opens full notice');
  await page.locator('.disclaimer-shell summary').click();
  await page.getByRole('link',{name:'Wichtiger Hinweis',exact:true}).click();
  assert.ok(await page.locator('.disclaimer-shell').evaluate(e=>e.open),'Notice link also reopens an unchanged hash');
  php(`db()->exec("DELETE FROM html_pages WHERE slug='subnetsprint'");`);
  await page.goto(base+'/dau-to-pro/');
  assert.equal(await page.locator('#module-grid .module-card').count(),1,'Single-module catalogue');
  php(`db()->exec("DELETE FROM html_pages");`);
  await page.reload();
  assert.ok(await page.locator('.empty-state').isVisible(),'Empty catalogue works');
  assert.equal(await page.locator('.filterbar').count(),0,'No empty category navigation');
  seed();
  await context.close();
  // Shared navigation/styles also need to work on the account page.
  const session=php(`db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute(['layout-tester',password_hash('test-password-for-layout',PASSWORD_DEFAULT)]); learner_start_session(learner_by_id((int)db()->lastInsertId()),false); echo session_name().'='.session_id(); session_write_close();`).trim();
  const [cookieName,cookieValue]=session.split('=');
  php(`require_once ${JSON.stringify(root+'/achievements_lib.php')}; $id=(int)db()->query("SELECT id FROM learners WHERE username='layout-tester'")->fetchColumn(); ach_set_visible($id,true);`);
  php(`$id=(int)db()->query("SELECT id FROM learners WHERE username='layout-tester'")->fetchColumn(); db()->prepare("INSERT INTO learner_progress(learner_id,storage_key,module_slug,value) VALUES(?,'osi-sprint-path-v1','osi-sprint',?)")->execute([$id,json_encode(['st'=>[['mastered'=>true]]])]); db()->exec("UPDATE html_pages SET title='Wer teilt, gewinnt',subject='Subnetting' WHERE slug='subnetsprint'"); db()->prepare("INSERT INTO learner_progress(learner_id,storage_key,module_slug,value) VALUES(?,'subnet-sprint-path-v1','subnetsprint',?)")->execute([$id,json_encode(['st'=>[['mastered'=>true],['mastered'=>true]]])]);`);
  for(const width of [1440,320]){
    const accountContext=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await accountContext.addCookies([{name:cookieName,value:cookieValue,url:base}]);
    const accountPage=await accountContext.newPage();accountPage.on('pageerror',e=>errors.push(e.message));
    await accountPage.goto(base+'/dau-to-pro/');
    const progressCard=accountPage.locator('article.module-card').filter({hasText:'OSI-Schichten'});
    const details=progressCard.locator('.module-progress');
    const subnetCard=accountPage.locator('article.module-card').filter({hasText:'Wer teilt, gewinnt'});
    assert.match(await subnetCard.locator('summary').innerText(),/2 \/ 10 Stufen/,'Legacy Subnetting URL shows saved stages');
    assert.match(await details.locator('summary').innerText(),/1 \/ 10 Stufen/,'Historic stage is shown for the signed-in learner');
    assert.equal(await details.evaluate(n=>n.open),false,'Progress details start compact');
    await details.locator('summary').click();
    assert.equal(await details.evaluate(n=>n.open),true,'Details open without navigating to the module');
    assert.equal(await progressCard.locator('.is-mastered').count(),1,'The mastered stage is marked');
    assert.equal(await progressCard.locator('.module-open').getAttribute('href'),'../osi/','Opening the module remains independent');
    await details.locator('summary').press('Enter');
    assert.equal(await details.evaluate(n=>n.open),false,'Details close with the keyboard');
    if(width>860){
      await accountPage.getByRole('button',{name:'Mein Konto',exact:false}).click();
      assert.ok(await accountPage.locator('#dtp-account-panel').isVisible(),'Account dropdown opens');
      await accountPage.keyboard.press('Escape');
      assert.ok(await accountPage.locator('#dtp-account-panel').isHidden(),'Escape closes account dropdown');
      await accountPage.getByRole('button',{name:'Mein Konto',exact:false}).click();
    }else await accountPage.getByRole('button',{name:'Mein Konto',exact:true}).click();
    await accountPage.getByRole('link',{name:'Konto-Einstellungen',exact:true}).click();
    assert.ok(await accountPage.getByRole('heading',{name:'Konto-Einstellungen',exact:true}).isVisible());
    assert.ok(await accountPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Account page has no overflow');
    const backToModules=accountPage.getByRole('link',{name:'Zu den Modulen'});
    assert.ok(await accountPage.locator('.konto-recent').getByRole('link',{name:'Zu den Modulen'}).isVisible(),'Module link sits in the recent achievements section');
    await backToModules.click();
    assert.equal(new URL(accountPage.url()).pathname+new URL(accountPage.url()).hash,'/dau-to-pro/#lernmodule');
    await accountPage.goto(base+'/dau-to-pro/highscore.php');
    const opener=accountPage.locator('[data-profile]').first();
    const profileId=await opener.getAttribute('data-profile');
    assert.ok(!(await accountPage.locator('#learner-profile').isVisible()),'Profile initially closed');
    await opener.click();
    await accountPage.locator('#profile-content .ach-item').first().waitFor();
    assert.ok(await accountPage.locator('#profile-content .ach-item.is-on').count()>0,'Person has readable unlocked achievements');
    assert.ok(await accountPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Highscore profile has no page overflow');
    await accountPage.goto(base+'/dau-to-pro/highscore.php?profil='+profileId);
    await accountPage.locator('#profile-content .ach-item').first().waitFor();
    assert.ok(await accountPage.locator('#learner-profile').isVisible(),'Achievement deep link opens person');
    await accountContext.close();
  }
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const staticPage=await noJs.newPage();await staticPage.goto(base+'/dau-to-pro/');
  assert.equal(await staticPage.locator('.module-card:visible').count(),2,'Modules remain visible without effects');
  await staticPage.locator('.disclaimer-shell summary').click();
  assert.ok(await staticPage.locator('.disclaimer-body').isVisible(),'Native disclosure works without JS');
  await noJs.close();
  // Full five-step sequence, including the existing video and XP conclusion.
  for(const reduced of [false,true]){
    const eggContext=await browser.newContext({viewport:reduced?{width:390,height:844}:{width:1440,height:900},isMobile:reduced,hasTouch:reduced,reducedMotion:reduced?'reduce':'no-preference'});
    const egg=await eggContext.newPage();egg.on('pageerror',e=>errors.push(e.message));
    await egg.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
    const mushroom=egg.getByRole('button',{name:'Pixelpilz',exact:true});
    await mushroom.focus();
    for(let n=1;n<=4;n++){
      await mushroom.press('Enter');
      assert.equal(await egg.locator('.fx-count').textContent(),`${n}x`,'Every click advances the counter');
    }
    assert.ok(await egg.locator('.fx-shroom').evaluate(e=>Number(e.style.getPropertyValue('--fx-scale'))>1.3),'Mushroom still grows');
    const started=Date.now();
    await mushroom.press('Enter');
    const levelup=egg.locator('.fx-levelup-card');
    await levelup.waitFor({state:'visible',timeout:1000});
    const geometry=await levelup.boundingBox();
    assert.ok(geometry.width<=370&&geometry.height<=130,'Easter egg shows a compact Level-up card, not a giant bolt');
    assert.ok(await levelup.getByText('EASTER EGG ENTDECKT').isVisible(),'Level-up explains the Easter egg');
    await egg.locator('.fx-video.is-open').waitFor({state:'visible',timeout:2500});
    assert.ok(Date.now()-started<1600,'Easter egg transitions into its video in under 1.6 seconds');
    await egg.locator('.fx-video-player').waitFor({state:'attached',timeout:7000});
    assert.ok((await egg.locator('.fx-video-player').getAttribute('src')).includes('dau-to-pro-easteregg.mp4'),'Existing Easter egg video is loaded');
    await egg.keyboard.press('Escape');
    await egg.locator('.fx-video').waitFor({state:'hidden'});
    await egg.waitForTimeout(300);
    assert.equal(await egg.locator('dtp-achievement').count(),0,'Guest video never pretends to unlock an account achievement');
    assert.equal(await egg.locator('.fx-xp').count(),0,'Guest video creates neither a large XP window nor an achievement popup');
    assert.equal(await egg.evaluate(()=>document.documentElement.classList.contains('fx-locked')),false,'Closing the egg restores scrolling');
    await eggContext.close();
  }
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log('Parallax, reduced motion, one/zero modules, deep links and no-JS passed');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
  if(browser)await browser.close();if(server)server.kill();fs.rmSync(scratch,{recursive:true,force:true});
});



