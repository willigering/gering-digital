'use strict';
// Visual acceptance for the standalone files: module colours, readable titles,
// mobile navigation and the existing Subnetting exercise/storage contract.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=process.env.DTP_SCREENSHOT_DIR;
const modules=JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules;
(async()=>{
 const browser=await chromium.launch();
 try{
  const colours=new Map(),overflows=[];
  for(const m of modules){
   const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,'lernmodule',m.file)).href);
   const design=await page.evaluate(()=>{
    const h=document.querySelector('.hero h1'),span=h.querySelector('span');
    const probe=document.createElement('i');probe.style.color='var(--cyan)';document.body.append(probe);
    const accent=getComputedStyle(probe).color;probe.remove();
    return {lead:getComputedStyle(h).color,title:getComputedStyle(span).color,accent,
     button:getComputedStyle(document.querySelector('#practiceGo')).backgroundImage,
     tabs:document.querySelectorAll('.area-tab').length};
   });
   assert.equal(design.title,design.accent,m.slug+': title uses the module accent');
   assert.notEqual(design.lead,design.title,m.slug+': white and coloured title remain distinct');
   assert.equal(design.tabs,4,m.slug+': four original areas');
   assert.ok(!colours.has(design.accent),m.slug+': unique accent (already used by '+colours.get(design.accent)+')');
   colours.set(design.accent,m.slug);
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    for(const tab of ['path','learn','train','exam']){
     await page.locator('#tab-'+tab).click();
     const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,items:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+1}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,70),width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right}))}));
     if(overflow.width>width){overflows.push({module:m.slug,tab,...overflow});console.log('OVERFLOW '+JSON.stringify(overflows.at(-1)));}
    }
    await page.locator('#tab-path').click();await page.evaluate(()=>scrollTo(0,0));
    assert.ok(await page.locator('.hero h1').evaluate(h=>h.scrollWidth<=h.clientWidth+1),m.slug+': title fits '+width);
    if(out){fs.mkdirSync(out,{recursive:true});await page.screenshot({path:path.join(out,m.slug+'-'+width+'.png')});}
   }
   if(m.slug==='subnet-sprint'){
    // Use the public UI and checker to verify the restyled exercise still works.
    await page.locator('#tab-train').click();await page.locator('[data-mode="free"]').click();
    for(let i=0;i<20;i++){
     const response=await page.evaluate(()=>{const T=SUBNET_TEST,t=T.last();if(t.kind==='mc')return {kind:t.kind,answer:t.answer};
      const shown=String(T.showAnswer(t)).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ');
      const candidates=[shown,String(t.answer),shown.split(' ')[0]];
      if(typeof t.answer==='number')candidates.push(t.answer.toString(2),t.answer.toString(16),t.answer.toString(8));
      const answer=candidates.find(a=>{const p=T.parseAnswer(t,a);return p.valid&&p.ok});
      if(answer===undefined)throw Error('No accepted answer for '+t.sub);return {kind:t.kind,answer};});
     if(response.kind==='mc')await page.locator('#trainTask [data-v="'+response.answer+'"]').click();
     else{await page.locator('#trainTask input').fill(response.answer);await page.locator('#trainTask [data-r="check"]').click();}
     assert.match(await page.locator('#trainTask [data-r="res"]').innerText(),/Richtig/);
     await page.locator('#trainTask [data-r="next"]').click();
    }
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('subnet-sprint-stats-v1')).correct),20);
    await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('subnet-sprint-stats-v1')).correct),20);
    await page.locator('#tab-learn').click();
    const distinction=await page.locator('.iprow .oct i.h.on').first().evaluate(e=>getComputedStyle(e).backgroundColor).catch(()=>null);
    if(distinction)assert.notEqual(distinction,design.accent,'Host and network bits keep separate colours');
    if(out){await page.evaluate(()=>scrollTo(0,document.querySelector('#learnTop').getBoundingClientRect().top+scrollY));await page.screenshot({path:path.join(out,'subnetting-learn-390.png')});}
   }
   assert.deepEqual(errors,[],m.slug+': no JavaScript errors');
   console.log(m.slug+': '+design.accent+', desktop/mobile, four areas passed');
   await page.close();
  }
  assert.deepEqual(overflows,[],'No horizontal overflow in any module area');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
