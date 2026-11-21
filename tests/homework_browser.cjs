'use strict';
// Real-browser coverage of the redesigned library using isolated API fixtures.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const categories=['I','II','III','IV','V','VI'].map((r,i)=>({id:'it-'+(i+1),name:'IT '+r,is_default:1}));
const titles=['C# – Schleifen','IPv4 & Subnetting','Datenbanken','IPv6 Grundlagen','IT-Service & ITIL','Zahlensysteme'];
const initial=titles.map((title,i)=>({id:'hw-test-'+i,title,topic:'Übungen und Unterrichtsmaterial',date:'2026-11-21',status:['offen','bearbeitung','fertig'][i%3],category_id:'it-'+(i+1)}));
const server=http.createServer((req,res)=>{
  const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'HA.html';
  const file=path.resolve(root,relative);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'text/html');
  fs.createReadStream(file).pipe(res);
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [1440,820,390,320]){
      const context=await browser.newContext({viewport:{width,height:900}});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      let modules=structuredClone(initial),saved=[];
      await page.route('**/homework-api.php?*',async route=>{
        const action=new URL(route.request().url()).searchParams.get('action');
        const body=route.request().postDataJSON()||{};
        let result={ok:true,csrf:'test-only'};
        if(action==='state')result={...result,mode:'ready',categories,modules};
        if(action==='rename-module'){
          saved.push(body);Object.assign(modules.find(m=>m.id===body.id),{title:body.title,topic:body.topic});
        }
        if(action==='save-status')modules.find(m=>m.id===body.id).status=body.status;
        await route.fulfill({json:result});
      });
      await page.goto(base+'/HA.html',{waitUntil:'networkidle'});
      assert.equal(await page.locator('.module-card').count(),6);
      const layout=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth-innerWidth,
        radius:getComputedStyle(document.querySelector('.module-card')).borderRadius,
        ratio:(()=>{const r=document.querySelector('.module-art').getBoundingClientRect();return r.width/r.height;})(),
        columns:getComputedStyle(document.querySelector('.module-grid')).gridTemplateColumns.split(' ').length,
        backgrounds:[...document.querySelectorAll('.module-art')].map(el=>getComputedStyle(el).backgroundImage)
      }));
      assert.ok(layout.overflow<=1,'Horizontal overflow at '+width+': '+layout.overflow);
      assert.equal(layout.radius,'18px');
      assert.ok(Math.abs(layout.ratio-16/9)<.02,'Artwork must remain 16:9');
      assert.equal(layout.columns,width===1440?3:width===820?2:1);
      for(const bg of layout.backgrounds){
        const image=bg.match(/url\("?([^"\)]+)/)?.[1];
        assert.ok(image,'Category image missing');
        assert.equal((await page.request.get(image)).status(),200,'Broken category artwork');
      }
      await page.locator('#statusFilter').selectOption('fertig');
      assert.equal(await page.locator('.module-card').count(),2);
      await page.locator('#statusFilter').selectOption('all');
      await page.locator('#search').fill('Subnetting');
      assert.equal(await page.locator('.module-card').count(),1);
      await page.locator('#search').fill('');
      await page.locator('.category-choice[data-category="it-1"]').click();
      assert.equal(await page.locator('.module-card').count(),1);
      await page.locator('.category-choice[data-category="all"]').click();
      const first=page.locator('.module-card').first();
      await first.locator('summary').click();
      await first.getByRole('button',{name:'Umbenennen / zuweisen'}).click();
      await page.locator('#editTitle').fill('Überarbeitet');
      await page.locator('#editTopic').fill('Bearbeitbare Beschreibung');
      await page.locator('#saveEdit').click();
      await page.getByRole('heading',{name:'Überarbeitet',exact:true}).waitFor();
      assert.equal(saved[0].topic,'Bearbeitbare Beschreibung');
      await first.locator('summary').click();
      await first.getByRole('button',{name:'Fertig',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.module-card').dataset.status==='fertig');
      await page.locator('#toggleUpload').click();
      await page.locator('#file').setInputFiles({name:'test.html',mimeType:'text/html',buffer:Buffer.from('<!doctype html><title>Titel &amp; Test</title><meta name="description" content="Beschreibung aus HTML"><script>throw Error("must not run")</script><h1>Alternative</h1>')});
      await page.waitForFunction(()=>document.querySelector('#title').value==='Titel & Test');
      assert.equal(await page.locator('#topic').inputValue(),'Beschreibung aus HTML');
      await page.locator('#toggleUpload').click();
      await page.evaluate(()=>window.scrollTo(0,600));
      await page.waitForFunction(()=>parseFloat(document.querySelector('.homework-scene').style.getPropertyValue('--desk-y'))>0||innerWidth<=760);
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.waitForFunction(()=>document.querySelector('.homework-scene').style.getPropertyValue('--desk-y')==='0px');
      assert.equal(await page.locator('.module-art').first().evaluate(el=>getComputedStyle(el).aspectRatio),'16 / 9');
      await page.locator('.module-card').first().locator('a').evaluate(el=>{
        if(!el.getAttribute('href').startsWith('homework-module.php?id='))throw Error('Module navigation changed');
      });
      const screenshots=process.env.DTP_SCREENSHOT_DIR;
      if(screenshots){fs.mkdirSync(screenshots,{recursive:true});await page.screenshot({path:path.join(screenshots,'homework-'+width+'.png'),fullPage:true});}
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('HomeWork desktop/mobile, motifs, filters, editing, status, metadata and reduced motion PASSED');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
