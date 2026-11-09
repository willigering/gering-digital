'use strict';
// Gering Digital V3: real PHP render, responsive portfolio, immutable original phone.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'gd-home-v3-'));
const env={...process.env,GD_DB_PATH:path.join(scratch,'site.sqlite')};
const port=24000+Math.floor(Math.random()*500);
const base='http://127.0.0.1:'+port;
const pause=n=>new Promise(r=>setTimeout(r,n));
let phpServer,browser;
const phpInit=spawnSync('php',['-r',
  'require '+JSON.stringify(path.join(root,'lib.php'))+'; '+
  '$q=db()->prepare("INSERT INTO apps(name,short_description,icon,category,status,published,sort_order) VALUES(?,?,?,?,?,1,1)");'+
  '$q->execute(["Test-App","Beispiel-App für die Layoutprüfung","assets/gering-digital-logo-icon.png","apps","entwicklung"]);'
],{env,encoding:'utf8'});
assert.equal(phpInit.status,0,phpInit.stderr||phpInit.stdout);
const src=fs.readFileSync(path.join(root,'index.php'),'utf8');
const begin=src.indexOf('    <div class="hero-stage">');
const end=src.indexOf('  <div class="scroll-hint">',begin);
assert.ok(begin>0&&end>begin,'Smartphone source markers not found');
const phoneBlock=src.slice(begin,end);
let hash=2166136261;for(let i=0;i<phoneBlock.length;i++){hash^=phoneBlock.charCodeAt(i);hash=Math.imul(hash,16777619);}
assert.equal((hash>>>0).toString(16).padStart(8,'0'),'f12a3f4a','Original phone markup must remain byte-for-byte unchanged');
assert.match(src,/assets\/home-v3\.css/);
assert.match(src,/assets\/home-v3\.js/);
assert.match(src,/foreach\(\$apps as \$app\)/,'All database apps must remain dynamic');
(async()=>{
  phpServer=spawn('php',['-S','127.0.0.1:'+port,'-t',root,path.join(root,'tests/support/router.php')],{env,stdio:'ignore'});
  for(let i=0;i<60;i++){try{if((await fetch(base+'/')).ok)break;}catch{}
    if(i===59)throw Error('Local PHP preview server unavailable');
    await pause(100);
  }
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const screenshots=process.env.DTP_SCREENSHOT_DIR;
  if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
  for(const [width,height] of [[1440,900],[820,920],[390,844],[320,680]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/',{waitUntil:'networkidle'});
    assert.match(await page.locator('.gdv3-hero-title').innerText(),/AUS NEUGIER/);
    assert.equal(await page.locator('.hero-stage .phone.phone-locked').count(),1,'Original interactive phone missing');
    assert.equal(await page.locator('#phone-digital-clock').count(),1,'Original phone clock missing');
    assert.equal(await page.locator('.phone-spin-control').count(),1,'Original phone drag control missing');
    assert.equal(await page.locator('.dtp-portal-card').isVisible(),true,'DAU TO PRO should be visible on initial load');
    assert.ok(await page.locator('#apps .app-card:visible').count()>=2,'Default project view must show all projects');
    assert.equal(await page.locator('.catalog-filter.is-active').getAttribute('data-category'),'alle');
    const details=await page.evaluate(()=>{
      const grid=document.querySelector('.gdv3-project-grid');
      const featured=document.querySelector('.dtp-portal-card');
      const other=document.querySelector('#apps .app-card:not(.dtp-portal-card)');
      const heading=document.querySelector('.gdv3-hero-title');
      return {
        overflow:document.documentElement.scrollWidth-innerWidth,
        gridCols:getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length,
        featuredX:featured.getBoundingClientRect().x,otherX:other.getBoundingClientRect().x,
        headingOverflows:heading.scrollWidth-heading.clientWidth,
        world:!!document.querySelector('.gdv3-world'),
        about:!!document.querySelector('.gdv3-timeline'),
        process:document.querySelectorAll('.gdv3-step').length
      };
    });
    assert.ok(details.overflow<=2,'Horizontal overflow '+width+'px: '+JSON.stringify(details));
    assert.ok(details.headingOverflows<=2,'Hero title clipped at '+width);
    assert.equal(details.about,true);assert.equal(details.process,3);assert.equal(details.world,true);
    if(width>=1101){
      assert.equal(details.gridCols,3,'Three-column project layout on desktop');
      assert.ok(details.otherX>details.featuredX,'Project cards side by side desktop');
    }else if(width<=600){
      assert.equal(details.gridCols,1,'One-column readable cards on narrow mobile');
    }
    await page.locator('.catalog-filter[data-category="apps"]').click();
    assert.equal(await page.locator('.dtp-portal-card').isVisible(),false,'Category filter should still work');
    await page.locator('.catalog-filter[data-category="alle"]').click();
    assert.equal(await page.locator('.dtp-portal-card').isVisible(),true,'All filter restores featured project');
    if(width>=1101){
      await page.locator('.phone-spin-control').click();
      await pause(100);
    }
    if(screenshots)await page.screenshot({path:path.join(screenshots,'homepage-v3-'+width+'.png'),fullPage:true});
    assert.deepEqual(errors,[],'JS errors at '+width+': '+errors.join(' / '));
    await context.close();
  }
  console.log('Gering Digital homepage V3: original phone unchanged, responsive grid and all filters verified.');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();
  if(phpServer)phpServer.kill();
  fs.rmSync(scratch,{recursive:true,force:true});
});
