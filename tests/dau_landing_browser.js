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
    const geometry=await page.evaluate(()=>{
      const r=document.querySelector('.hero-actions .primary-action').getBoundingClientRect();
      const grid=getComputedStyle(document.querySelector('.module-grid'));
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,ctaBottom:r.bottom,columns:grid.gridTemplateColumns.split(' ').filter(track=>parseFloat(track)>0).length,
        modulesY:document.querySelector('.module-grid').getBoundingClientRect().top,
        overflow:[...document.querySelectorAll('.hero-copy,.hero-actions,.exam-input-row,.module-card,.step')].filter(e=>{const b=e.getBoundingClientRect();return b.left<-.5||b.right>innerWidth+.5}).map(e=>e.className)};
    });
    if(screenshots&&[1440,390,320].includes(width))await page.screenshot({path:path.join(screenshots,`desktop-${width}.png`),fullPage:true});
    assert.ok(geometry.scrollWidth<=width,`No page overflow at ${width}: ${JSON.stringify(geometry)}`);
    assert.deepEqual(geometry.overflow,[],`No clipped controls at ${width}`);
    if(width>=1024||width<=610)assert.ok(geometry.ctaBottom<height,`Learning action visible on first screen at ${width}: ${geometry.ctaBottom}`);
    if(width>=1024){assert.equal(geometry.columns,2,'Two modules use two columns');assert.ok(geometry.modulesY<1400,'Modules no longer start below 2500px')}
    await page.getByLabel('WELCHE THEMEN KOMMEN DRAN?',{exact:true}).fill('OSI');
    await page.getByRole('button',{name:'Module finden',exact:false}).click();
    assert.equal(await page.locator('.module-card:visible').count(),1,'Search submission shows one result');
    assert.equal(await page.locator('#module-grid').getAttribute('data-count'),'1');
    await page.getByRole('button',{name:'Suche zurücksetzen',exact:false}).click();
    assert.equal(await page.locator('.module-card:visible').count(),2);
    await page.getByLabel('WELCHE THEMEN KOMMEN DRAN?',{exact:true}).fill('Nichtvorhanden');
    assert.ok(await page.locator('#search-empty').isVisible(),'No-result state visible');
    await page.getByRole('button',{name:'Suche zurücksetzen',exact:false}).click();
    await page.locator('.filter-btn[data-filter="subnet"]').click();
    assert.equal(await page.locator('.module-card:visible').count(),1,'Topic filter works');
    await page.locator('.filter-btn[data-filter="alle"]').click();
    if(width<=860){
      await page.getByRole('button',{name:'Menü öffnen',exact:true}).click();
      assert.ok(await page.locator('#dtp-mobile-menu').isVisible());
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#dtp-mobile-menu').isHidden());
    }
    await page.locator('.disclaimer-shell summary').click();
    assert.ok(await page.locator('.disclaimer-body').isVisible(),'Full disclaimer can be opened');
    await page.getByRole('button',{name:'Pixelpilz',exact:true}).click();
    assert.equal(await page.locator('.fx-count').textContent(),'1x','Easter egg still responds');
    console.log(`${width}×${height}: layout, search, filters, navigation and mushroom passed; modules y=${Math.round(geometry.modulesY)}`);
    await context.close();
  }
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/dau-to-pro/',{waitUntil:'networkidle'});
  const originalHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
  await page.evaluate(()=>scrollTo(0,300));await pause(150);
  assert.notEqual(await page.locator('.dtp-world-texture').evaluate(e=>getComputedStyle(e).translate),'none','Background parallax runs');
  assert.notEqual(await page.locator('.hero-art-wrap').evaluate(e=>getComputedStyle(e).translate),'none','Hero has independent depth');
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
  assert.equal(await page.locator('.module-card').count(),1,'Single-module catalogue');
  php(`db()->exec("DELETE FROM html_pages");`);
  await page.reload();
  assert.ok(await page.locator('.empty-state').isVisible(),'Empty catalogue works');
  assert.equal(await page.locator('.filterbar').count(),0,'No empty category navigation');
  seed();
  await context.close();
  // Shared navigation/styles also need to work on the account page.
  const session=php(`db()->prepare('INSERT INTO learners(username,password_hash) VALUES(?,?)')->execute(['layout-tester',password_hash('test-password-for-layout',PASSWORD_DEFAULT)]); learner_start_session(learner_by_id((int)db()->lastInsertId()),false); echo session_name().'='.session_id(); session_write_close();`).trim();
  const [cookieName,cookieValue]=session.split('=');
  for(const width of [1440,320]){
    const accountContext=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await accountContext.addCookies([{name:cookieName,value:cookieValue,url:base}]);
    const accountPage=await accountContext.newPage();accountPage.on('pageerror',e=>errors.push(e.message));
    await accountPage.goto(base+'/dau-to-pro/');
    if(width>860){
      await accountPage.getByRole('button',{name:'Mein Konto',exact:false}).click();
      assert.ok(await accountPage.locator('#dtp-account-panel').isVisible(),'Account dropdown opens');
      await accountPage.keyboard.press('Escape');
      assert.ok(await accountPage.locator('#dtp-account-panel').isHidden(),'Escape closes account dropdown');
      await accountPage.getByRole('button',{name:'Mein Konto',exact:false}).click();
    }else await accountPage.getByRole('button',{name:'Menü öffnen',exact:true}).click();
    await accountPage.getByRole('link',{name:'Konto-Einstellungen',exact:true}).click();
    assert.ok(await accountPage.getByRole('heading',{name:'Konto-Einstellungen',exact:true}).isVisible());
    assert.ok(await accountPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Account page has no overflow');
    await accountContext.close();
  }
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const staticPage=await noJs.newPage();await staticPage.goto(base+'/dau-to-pro/');
  assert.equal(await staticPage.locator('.module-card:visible').count(),2,'Modules remain visible without effects');
  await staticPage.locator('.disclaimer-shell summary').click();
  assert.ok(await staticPage.locator('.disclaimer-body').isVisible(),'Native disclosure works without JS');
  await noJs.close();
  assert.deepEqual(errors,[],'No browser JavaScript errors');
  console.log('Parallax, reduced motion, one/zero modules, deep links and no-JS passed');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{
  if(browser)await browser.close();if(server)server.kill();fs.rmSync(scratch,{recursive:true,force:true});
});
