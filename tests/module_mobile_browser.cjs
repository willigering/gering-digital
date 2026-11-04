'use strict';
// Handy-Abnahme für alle mitgelieferten Lernmodule (Block DTP-HANDY, tools/module-mobile.*):
// kein seitliches Scrollen bei 360/390 px, Übung öffnet im Antwortfeld statt im ?-Tipp,
// ?-Tipp per Fingertipp auf und zu, Eingaben ohne iOS-Zoom, Prüfungsleiste mit Restzeit bleibt sichtbar.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const modules=JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules;
(async()=>{
 const browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const m of modules){
   const html=fs.readFileSync(path.join(root,'lernmodule',m.file),'utf8');
   assert.equal((html.match(/<!-- DTP-HANDY START -->/g)||[]).length,1,m.slug+': phone block embedded once');
   for(const width of [360,390]){
    const context=await browser.newContext({viewport:{width,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'lernmodule',m.file)).href);
    for(const tab of ['path','learn','train','exam']){
     await page.locator('#tab-'+tab).click();
     const state=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,vw:innerWidth,
      small:[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]),select,textarea')]
       .filter(e=>e.offsetParent&&parseFloat(getComputedStyle(e).fontSize)<16).length}));
     assert.ok(state.doc<=state.vw,`${m.slug} ${width} ${tab}: no sideways scrolling (${state.doc}>${state.vw})`);
     assert.equal(state.small,0,`${m.slug} ${width} ${tab}: inputs at least 16 px`);
    }
    // Lernpfad-Übung: Fokus im Antwortfeld, Tipp zu; ? öffnet und schließt per Fingertipp.
    await page.locator('#tab-path').click();await page.locator('#practiceGo').tap();await page.waitForTimeout(150);
    const tipOpen=()=>page.evaluate(()=>[...document.querySelectorAll('#practiceTask .qtip')].some(t=>t.getBoundingClientRect().height>0));
    assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('qhelp')),false,m.slug+': exercise does not focus the ? tip');
    assert.equal(await tipOpen(),false,m.slug+': tip closed when the exercise opens');
    const mark=await page.locator('#practiceTask .qmark').first().boundingBox();
    await page.touchscreen.tap(mark.x+mark.width/2,mark.y+mark.height/2);await page.waitForTimeout(50);
    assert.equal(await tipOpen(),true,m.slug+': tap opens the tip');
    await page.touchscreen.tap(mark.x+mark.width/2,mark.y+mark.height/2);await page.waitForTimeout(50);
    assert.equal(await tipOpen(),false,m.slug+': second tap closes the tip');
    await page.keyboard.press('Escape');await page.waitForTimeout(50);
    // Prüfungsmodus: Restzeit bleibt beim Scrollen unter der Kopfzeile sichtbar.
    await page.locator('#tab-exam').click();await page.locator('#examStart').click();
    await page.locator('#examQ').scrollIntoViewIfNeeded();await page.evaluate(()=>scrollBy(0,250));
    const top=await page.locator('#examTimer').evaluate(e=>e.getBoundingClientRect().top);
    assert.ok(top>=0&&top<120,`${m.slug} ${width}: exam timer stays visible (${top})`);
    assert.deepEqual(errors,[],m.slug+': no script errors');
    await context.close();
   }
  }
  console.log('Mobile: nine modules at 360/390 px, no sideways scrolling, 16 px inputs, answer-field focus, tap-to-toggle tips and sticky exam timer passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
