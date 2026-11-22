'use strict';
// Regression: Highscore vor Spickzetteln; Unterrichtskarten mit dauerhaftem
// Themenwechsel, BG nur hinter den Karten und mobiler Lesbarkeit.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'dau-to-pro/index.php'),'utf8');
const positions=['id="module-grid"','id="highscore"','id="cheat-sheets"','id="unterrichtsmaterial"','id="konzept"'].map(x=>index.indexOf(x));
assert.ok(positions.every(n=>n>=0) && positions.every((n,i)=>!i || n>positions[i-1]),'Highscore muss zwischen Modulen und Spickzetteln erscheinen.');
assert.equal(index.match(/id="highscore"/g)?.length,1,'Highscore darf nicht doppelt vorkommen.');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(pathToFileURL(path.join(root,'dau-to-pro/support-serviceanfragen.html')).href,{waitUntil:'load'});
  assert.equal(await page.evaluate(()=>window.__SUPPORT_GUIDE_READY__ === true),true,
    'Support-Navigation wurde nicht geladen: '+errors.join('; '));
  for(const [topic,ids,bg] of [
   ['intake',['annehmen','sla'],'network-ports-1536'],
   ['diagnose',['diagnose','beheben'],'server-1536'],
   ['abschluss',['abschluss','qualitaet'],'circuit-signal-1536']
  ]) {
   await page.locator('.jump[data-topic="'+topic+'"]').click();
   await page.waitForTimeout(650);
   const state=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.support-flow>.chapter:not([hidden])')];
    return {
     ids:cards.map(c=>c.id),
     cards:cards.map(c=>({pos:getComputedStyle(c).position,z:+getComputedStyle(c).zIndex,bg:getComputedStyle(c).backgroundImage})),
     wall:getComputedStyle(document.querySelector('.support-backdrop'),'::before').backgroundImage,
     active:document.body.dataset.activeTopic,
     tabVisible:document.querySelector('.map').getBoundingClientRect().top
    };
   });
   assert.deepEqual(state.ids,ids,'Falsche Kapitel in Reiter '+topic);
   assert.equal(state.active,topic);
   assert.ok(state.wall.includes(bg),'BG-Motiv fehlt im Reiter '+topic);
   assert.ok(state.cards.every(c=>c.pos==='sticky'),'Keine Sticky-Kapitel im Reiter '+topic);
   assert.ok(state.cards.every(c=>!c.bg.includes('url(')),'BG in Textkarte! '+topic);
   assert.ok(state.cards[1].z>state.cards[0].z,'Kapitel-Z-Ebenen vertauscht: '+JSON.stringify(state.cards));
   assert.ok(state.tabVisible<130&&state.tabVisible>=0,'Reiter sind nicht mehr oben erreichbar');
  }
  await page.locator('.jump[data-topic="intake"]').click();
  const qa=page.locator('#annehmen details.qa').first();
  await qa.locator('summary').click();
  assert.equal(await qa.getAttribute('open'),'','Wissensantwort muss sich öffnen');
  await page.locator('#topic-search').fill('PDCA');
  assert.equal(await page.locator('.chapter:not([hidden])').count(),1,'Die Suche soll themenübergreifend filtern');
  assert.equal(await page.locator('#qualitaet').isVisible(),true);
  await page.locator('.jump[data-topic="diagnose"]').click();
  assert.equal(await page.locator('#topic-search').inputValue(),'','Themenwechsel setzt die Suche zurück');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.jump[data-topic="abschluss"]').click();
  const mobile=await page.evaluate(()=>({
   pos:getComputedStyle(document.querySelector('#abschluss')).position,
   hidden:[...document.querySelectorAll('.support-flow>.chapter:not([hidden])')].map(x=>x.id),
   scrollWidth:document.documentElement.scrollWidth,
   innerWidth:innerWidth
  }));
  assert.equal(mobile.pos,'relative','Mobil keine Sticky-Überdeckung langer Kapitel');
  assert.deepEqual(mobile.hidden,['abschluss','qualitaet']);
  assert.ok(mobile.scrollWidth<=mobile.innerWidth+2,'Horizontales Überlaufen auf Smartphone');
  assert.deepEqual(errors,[],'Browserfehler: '+errors.join('; '));
  console.log('Unterrichts-Stapel und Highscore-Reihenfolge: Desktop, Reiter, BG, Suche, Mobile OK');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
