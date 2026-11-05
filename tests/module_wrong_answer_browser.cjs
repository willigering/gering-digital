'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),modules=JSON.parse(fs.readFileSync(path.join(root,'lernmodule/manifest.json'))).modules;
const quips=JSON.parse(fs.readFileSync(path.join(root,'tools/module-wrong-answer.js'),'utf8').match(/const quips = (\[[\s\S]*?\]);/)[1]);
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const m of modules.filter(m=>!process.env.DTP_TEST_MODULE||m.slug===process.env.DTP_TEST_MODULE))for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,'lernmodule',m.file)).href);
   if(m.entry==='mix'){
    await page.evaluate(()=>{const T=KV061126_TEST,box=[...document.querySelectorAll('.question')].find(b=>T.BANK.find(q=>q.id===b.dataset.id).type!=='order');if(!box)throw Error('No suitable question in round');const q=T.BANK.find(q=>q.id===box.dataset.id);if(q.type==='choice')[...box.querySelectorAll('[data-option]')].find(b=>b.dataset.option!==q.answer).click();else{const input=box.querySelector('input,select');input.value=q.type==='select'?[...input.options].find(o=>o.value&&o.value!==q.answer).value:q.type==='ipv4'?(q.answer==='0.0.0.0'?'0.0.0.1':'0.0.0.0'):q.type==='bits'?(q.answer==='00000000'?'11111111':'00000000'):(Number(q.answer)===0?'1':'0');input.dispatchEvent(new Event('input',{bubbles:true}));}box.querySelector('.check').click();});
    const result=page.locator('.result.bad').first();assert(quips.includes(await result.locator('b').first().innerText()));assert(await result.locator('.why').innerText());
   }else{
    await page.locator('#practiceGo').click();await page.locator('.dtp-practice-dialog[open]').waitFor();
    await page.evaluate(()=>{
     const hook=Object.entries(window).find(([k,v])=>/_TEST$/.test(k)&&v&&typeof v.last==='function')[1],t=hook.last(),box=document.querySelector('#practiceTask');
     if(t.kind==='layer'){box.querySelector('[data-v="'+(t.answer===1?2:1)+'"]').click();return;}
     if(t.kind==='mc'){box.querySelector('[data-v="'+((t.answer+1)%t.options.length)+'"]').click();return;}
     const input=box.querySelector('[data-r="form"] input');
     const selects=[...box.querySelectorAll('[data-r="form"] select')];
     let candidate;
     if(selects.length){candidate=selects.map((s)=>[...s.options].find(o=>o.value).value).join(',');if(hook.parseAnswer(t,candidate).ok)candidate=selects.map((s)=>[...s.options].filter(o=>o.value).at(-1).value).join(',');}
     else candidate=['0','1','2','-1','999','nein','ja','Falsch','::','::1','2001:db8::1','0.0.0.0'].find(raw=>{const p=hook.parseAnswer(t,raw);return p.valid&&!p.ok;});
     if(candidate===undefined)throw Error('No valid wrong answer for '+t.kind);
     if(selects.length)selects.forEach((s,i)=>{s.value=candidate.split(',')[i];s.dispatchEvent(new Event('change',{bubbles:true}));});
     else {input.value=candidate;input.dispatchEvent(new Event('input',{bubbles:true}));}
     box.querySelector('[data-r="check"]').click();
    });
    const result=page.locator('#practiceTask [data-r="res"]');assert(await result.evaluate(e=>e.classList.contains('bad')),m.slug+': wrong answer graded');
    assert(quips.includes(await result.locator('.quip').first().innerText()),m.slug+': shared quip shown');assert(await result.locator('.why').innerText(),m.slug+': explanation retained');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,m.slug+': no overflow');assert.deepEqual(errors,[],m.slug+': no JS errors');
   console.log(m.slug+' '+width+': wrong answer, shared quip and explanation passed');await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
