'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,spawnSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'xp2-browser-')),env={...process.env,GD_ROOT:root,GD_DB_PATH:path.join(temp,'test.sqlite')};
function php(code){const r=spawnSync('php',['-r',`require ${JSON.stringify(root+'/achievements_lib.php')};${code}`],{env,encoding:'utf8'});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
const id=Number(php(`db()->exec("INSERT INTO learners(username,password_hash) VALUES('Willi',".db()->quote(password_hash('test-password',PASSWORD_DEFAULT)).")");$id=(int)db()->lastInsertId();db()->prepare("INSERT INTO learner_progress(learner_id,storage_key,module_slug,value) VALUES(?,'osi-sprint-stats-v1','osi-sprint',?)")->execute([$id,json_encode(['solved'=>1,'correct'=>1])]);ach_evaluate($id);ach_evaluate($id,['egg'=>true]);db()->prepare("INSERT INTO learner_achievements(learner_id,code) VALUES(?,'osi.kabel')")->execute([$id]);ach_set_visible($id,true);xp_set_showcase($id,['osi.kabel','g.easteregg','g.willkommen']);db()->exec("INSERT INTO html_pages(slug,title,subject,published,category) VALUES('osi-sprint','Easy OSI for FISI','OSI-Schichten',1,'lernen')");echo $id;`));
const port=23200+Math.floor(Math.random()*500),base='http://127.0.0.1:'+port;
const server=spawn('php',['-S','127.0.0.1:'+port,'-t',root,path.join(root,'tests/support/router.php')],{env,stdio:'ignore'});
(async()=>{let browser;try{
 for(let i=0;i<50;i++){try{if((await fetch(base+'/dau-to-pro/konto.php')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/dau-to-pro/konto.php');await page.fill('[name=username]','Willi');await page.fill('[name=password]','test-password');await Promise.all([page.waitForNavigation(),page.click('.auth-form button[type=submit]')]);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.goto(base+'/dau-to-pro/konto.php');
  await page.getByRole('heading',{name:'Kürzlich freigeschaltet'}).waitFor();assert.equal(await page.locator('.recent-grid .ach-item').count(),4);
  assert.equal(await page.locator('.showcase-slots select').count(),3);assert.equal(await page.locator('.learning-week li').count(),7);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`account no overflow ${width}`);
  await page.selectOption('[name="slots[0]"]','g.easteregg');await page.selectOption('[name="slots[1]"]','osi.kabel');await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Vitrine speichern'}).click()]);
  assert.equal(await page.locator('[name="slots[0]"]').inputValue(),'g.easteregg');
  await page.goto(base+'/dau-to-pro/highscore.php');assert.equal(await page.locator('.showcase-inline img').count(),3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`highscore no overflow ${width}`);
  await page.locator('.showcase-inline button').first().focus();assert.equal(await page.locator('.showcase-inline [role=tooltip]').first().isVisible(),true);
  await page.locator('[data-profile]').click();await page.getByRole('dialog').waitFor();await page.locator('#profile-content .ach-grid .ach-item').first().waitFor();
  assert.equal(await page.locator('#profile-content .ach-item').count(),22);assert.ok(await page.locator('#profile-content .ach-item:not(.is-on)').count()>0);
  for(const value of ['module','rarity','recent'])await page.locator('#profile-content select').selectOption(value);
  assert.ok(await page.locator('#learner-profile').evaluate(n=>n.scrollWidth<=n.clientWidth),`modal no overflow ${width}`);
  await page.waitForTimeout(300);await page.screenshot({path:path.join(temp,'profile-'+width+'.png')});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('dialog').isVisible(),false);assert.equal(await page.locator('[data-profile]').evaluate(n=>n===document.activeElement),true);
 }
 // Private profile authorization is checked on every fetch, not cached into the highscore HTML.
 php(`ach_set_visible(${id},false);`);const response=await page.request.get(base+'/dau-to-pro/api/profile.php?id='+id);assert.equal(response.status(),404);
 const anonymous=await browser.newContext();assert.equal((await anonymous.request.get(base+'/dau-to-pro/api/profile.php?id='+id)).status(),401);
 assert.deepEqual(errors,[]);console.log('XP 2.0 browser: desktop 1440, mobile 390/320; showcase, profile, sort, privacy, focus and overflow passed. Screenshots: '+temp);
}finally{if(browser)await browser.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
