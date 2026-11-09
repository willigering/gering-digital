'use strict';
// IT VI.01: Themenreiter 02 muss dasselbe Sticky-Überlappen nutzen wie Reiter 01.
// Die echten BG-Dateien dürfen nur hinter den Karten liegen, niemals in einer Karte.
const assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const file=pathToFileURL(path.join(root,'dau-to-pro/unterricht/it-vi-01.html')).href;
const out=process.env.DTP_SCREENSHOT_DIR;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(file,{waitUntil:'load'});
  await delay(120);
  assert.equal(await page.locator('.itvi-backdrop').count(),1,'Eine globale Hintergrundebene');
  for(const [topic,ids,bg] of [
    ['support',['kap1','kap2','kap3','kap4'],'network-ports'],
    ['sla',['kap5','kap6','kap7','kap8'],'circuit-signal']
  ]){
    await page.locator('.lf6-topic-link[data-topic="'+topic+'"]').click();
    await delay(200);
    const state=await page.evaluate(ids=>{
      const visible=[...document.querySelectorAll('#lf6-flow>.lf6-full-chapter')]
        .filter(c=>getComputedStyle(c).display!=='none');
      return {
        ids:visible.map(c=>c.id),
        cards:visible.map(c=>({pos:getComputedStyle(c).position,z:Number(getComputedStyle(c).zIndex),
          bg:getComputedStyle(c).backgroundImage})),
        bodyTopic:document.body.dataset.activeTopic,
        wall:getComputedStyle(document.querySelector('.itvi-backdrop'),'::before').backgroundImage
      }
    },ids);
    assert.deepEqual(state.ids,ids,'Falsche Kapitel bei Themenreiter '+topic);
    assert.equal(state.bodyTopic,topic);
    assert.ok(state.wall.includes(bg),topic+': falsches Hintergrundbild');
    assert.ok(state.cards.every(c=>c.pos==='sticky'),'Alle vier Karten müssen sticky bleiben: '+topic);
    assert.ok(state.cards.every(c=>!c.bg.includes('url(')),'BG-Bilder in Textkarten bei '+topic);
    assert.ok(state.cards[1].z>state.cards[0].z,'Folgekapitel liegt über Vorgänger bei '+topic);
    await page.evaluate(()=>{
      const flow=document.querySelector('#lf6-flow');
      const nav=document.querySelector('.lf6-topic-navigation').getBoundingClientRect().height;
      const header=document.querySelector('header').getBoundingClientRect().height;
      scrollTo({top:flow.getBoundingClientRect().top+scrollY-header-nav-20,behavior:'instant'});
    });
    await delay(100);
    let overlapped=false,observations=[];
    for(let i=0;i<95;i++){
      const sample=await page.evaluate(([a,b])=>{
        const r1=document.getElementById(a).getBoundingClientRect();
        const r2=document.getElementById(b).getBoundingClientRect();
        return {top1:r1.top,bottom1:r1.bottom,top2:r2.top,bottom2:r2.bottom,height:innerHeight}
      },ids);
      observations.push(sample);
      if(sample.top2<sample.height*.78&&sample.top2>sample.height*.22
          &&sample.bottom1>sample.top2+25){overlapped=true;break}
      await page.evaluate(()=>scrollBy({top:140,behavior:'instant'}));
    }
    assert.ok(overlapped,'Sticky-Kapitelüberlappung fehlt im Reiter '+topic+'; '+JSON.stringify(observations.slice(-4)));
    if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,'unterricht-'+topic+'-desktop.png')});}
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.lf6-topic-link[data-topic="sla"]').click();
  await delay(120);
  const mobile=await page.evaluate(()=>({
    pos:getComputedStyle(document.querySelector('#kap5')).position,
    bg:getComputedStyle(document.querySelector('#kap5')).backgroundImage,
    active:document.body.dataset.activeTopic
  }));
  assert.equal(mobile.active,'sla');
  assert.equal(mobile.pos,'relative','Mobil keine Sticky-Überdeckung für lange Kapitel');
  assert.ok(!mobile.bg.includes('url('));
  assert.deepEqual(errors,[],'JavaScript errors: '+errors.join('; '));
  console.log('Unterrichtsmaterial: Reiter 01 und 02 haben echte Kartenüberlagerung; BG hinter den Textkarten; Mobilansicht okay.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
