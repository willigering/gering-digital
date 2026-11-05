'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const acceptance=require('./kv_browser_acceptance.cjs');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../lernmodule/klausurvorbereitung-061126.html'));
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
 try{
  for(const width of [1280,390,360]){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/');
   if(width<500)await acceptance.mobile(page,width);else await acceptance.focus(page,{width,height:900});
   assert.deepEqual(errors,[],'No script errors at '+width);await context.close();
  }
  console.log('KV desktop and mobile 390/360: real focus controls, return, no false XP, input sizes, tap hints and sticky exam timer passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
