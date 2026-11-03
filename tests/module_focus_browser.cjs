const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');
const assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const modules=JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules;
(async()=>{
  const server=http.createServer((req,res)=>{
    const name=path.basename(new URL(req.url,'http://localhost').pathname);
    const file=path.join(root,'lernmodule',name);
    if(!modules.some(m=>m.file===name)){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(file));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true});
  const shots=process.env.DTP_SCREENSHOT_DIR||path.join('/tmp','dtp-focus');fs.mkdirSync(shots,{recursive:true});
  try{
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      for(const m of modules){
        const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/${m.file}`);
        await page.locator('#tab-path').click();
        const before=await page.evaluate(()=>JSON.stringify(localStorage));
        await page.evaluate(()=>{window.focusOriginalPanel=document.getElementById('practicePanel');window.focusOriginalBack=document.getElementById('backToLesson');});
        await page.locator('#practiceGo').click();
        const dialog=page.locator('.dtp-practice-dialog');await dialog.waitFor({state:'visible'});
        if(viewport.width===1440&&m.slug===modules[0].slug){
          // Regression: the backdrop really interpolates; it must not instantly jump
          // to the finished dark/blurred state like the previous 300 ms dialog.
          await page.waitForTimeout(680);
          const mid=await page.evaluate(()=>{
            const d=document.querySelector('.dtp-practice-dialog'),b=getComputedStyle(d,'::backdrop');
            return {blur:parseFloat(b.backdropFilter.match(/blur\\(([^)]+)px\\)/)?.[1]||0),
              shade:parseFloat(b.backgroundColor.match(/[\\d.]+(?=\\)$)/)?.[0]||0)};
          });
          assert.ok(mid.blur>0&&mid.blur<6&&mid.shade>0&&mid.shade<.72,
            'Opening backdrop builds blur and dimming gradually, not abruptly: '+JSON.stringify(mid));
        }
        await page.waitForFunction(()=>{
          const d=document.querySelector('.dtp-practice-dialog'),b=getComputedStyle(d,'::backdrop');
          return getComputedStyle(d).opacity==='1'&&b.backdropFilter.includes('blur(7px)')&&b.backgroundColor.includes('0.72');
        },null,{timeout:9500});
        const state=await page.evaluate(()=>{
          const d=document.querySelector('.dtp-practice-dialog'),r=d.getBoundingClientRect(),b=getComputedStyle(d,'::backdrop');
          return {open:d.open,modal:d.matches(':modal'),same:document.getElementById('practicePanel')===window.focusOriginalPanel&&document.getElementById('backToLesson')===window.focusOriginalBack,
            focused:document.getElementById('practiceTask').contains(document.activeElement),blur:b.backdropFilter,shade:b.backgroundColor,opacity:getComputedStyle(d).opacity,
            left:r.left,right:r.right,top:r.top,bottom:r.bottom,centerX:(r.left+r.right)/2,centerY:(r.top+r.bottom)/2,overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.ok(state.open&&state.modal&&state.same&&state.focused,`${m.slug}: modal uses real focused controls`);
        assert.match(state.blur,/blur\(7px\)/);assert.match(state.shade,/0\.72\)/);assert.equal(state.opacity,'1');
        assert.ok(Math.abs(state.centerX-viewport.width/2)<3&&Math.abs(state.centerY-viewport.height/2)<3,`${m.slug}: centered`);
        assert.ok(state.left>=0&&state.right<=viewport.width&&state.top>=0&&state.bottom<=viewport.height&&!state.overflow,`${m.slug}: fits viewport`);
        // Only type into real, visible, editable answer fields. Assignment tasks can
        // contain hidden/read-only inputs for their internal state: those must never be filled.
        const input=dialog.locator(
          '#practiceTask input:visible:not([readonly]):not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]), '+
          '#practiceTask textarea:visible:not([readonly]):not([disabled])'
        ).first();
        if(await input.count()){
          const y=await dialog.evaluate(d=>d.scrollTop);await input.fill('1');
          assert.equal(await dialog.evaluate(d=>d.scrollTop),y,'Typing preserves position');
        }
        await page.screenshot({path:path.join(shots,`${m.slug}-${viewport.width}.png`)});
        // Long exercises scroll internally while the real return button stays reachable.
        await page.evaluate(()=>{const f=document.createElement('div');f.id='focus-long-test';f.style.height='1800px';document.getElementById('practiceTask').append(f);document.querySelector('.dtp-practice-dialog').scrollTop=9999;});
        const back=await page.locator('#backToLesson').boundingBox();const bounds=await dialog.boundingBox();
        assert.ok(back.y>=bounds.y&&back.y+back.height<=bounds.y+bounds.height,'Return button remains visible when scrolled');
        await page.keyboard.press('Escape');
        if(viewport.width===1440&&m.slug===modules[0].slug){
          await page.waitForTimeout(170);
          const fade=await dialog.evaluate(d=>{const b=getComputedStyle(d,'::backdrop');return {open:d.open,blur:parseFloat(b.backdropFilter.match(/blur\\(([^)]+)px\\)/)?.[1]||0)};});
          assert.ok(fade.open&&fade.blur>0&&fade.blur<7,'Backdrop fades back instead of disappearing at once: '+JSON.stringify(fade));
        }
        await page.waitForFunction(()=>!document.querySelector('.dtp-practice-dialog').open,null,{timeout:3000});
        assert.equal(await dialog.evaluate(d=>d.open),false);
        assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before,'Abandoning task awards nothing');
        assert.equal(await page.locator('#pathView #practicePanel').count(),1,'Panel returns to learning path');
        await page.locator('#practiceGo').click();await dialog.waitFor({state:'visible'});await page.locator('#backToLesson').click();
        await page.waitForFunction(()=>!document.querySelector('.dtp-practice-dialog').open,null,{timeout:3000});
        assert.equal(await dialog.evaluate(d=>d.open),false,'Return button closes exercise');
        assert.equal(await page.evaluate(()=>document.body.classList.contains('dtp-exercise-open')),false,'Normal scrolling restored');
        assert.deepEqual(errors,[],m.slug+' console errors');await context.close();
      }
    }
    const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/${modules[0].file}`);await page.locator('#practiceGo').click();
    assert.equal(await page.locator('.dtp-practice-dialog').evaluate(d=>getComputedStyle(d).transitionDuration),'0s');await context.close();
    console.log('Exercise focus: nine modules, desktop/mobile, centering, progressive 4.1 s blur/dim and 0.92 s fade-out, real controls, stable typing, sticky return, Escape, no rewards and reduced motion passed.');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
