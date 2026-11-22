'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/homework-workbook.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/homework-workbook.css'),'utf8');
function markup(config){return '<!doctype html><html><head><title>Arbeitsblatt Test</title><style>'+css+'</style></head><body><h1>Aufgaben</h1><label>Antwort<textarea id="antwort"></textarea></label><label><input type="checkbox" id="check">Auswahl</label><label>Wahl<select id="wahl"><option value="">Auswählen</option><option value="b">Antwort B</option></select></label><div id="notizen" contenteditable="true">Notizen</div><script id="hw-workbook-config" type="application/json">'+JSON.stringify(config).replace(/</g,'\\u003c')+'</script><script id="hw-workbook-runtime">'+js+'</script></body></html>';}
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(markup({id:'hw-test-worksheet',fields:{},revision:0,standalone:false,blank:false}));});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});let fields={},revision=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/homework-api.php?*',async route=>{
    const action=new URL(route.request().url()).searchParams.get('action');const body=route.request().postDataJSON()||{};
    let status=200,result={ok:true,csrf:'test-token',fields,revision};
    if(action==='save-workbook'){
     if(body.revision!==revision){status=409;result={error:'Konflikt'};}
     else{fields=body.fields;revision++;result={ok:true,csrf:'test-token',revision};}
    }
    await route.fulfill({status,json:result});
   });
   await page.goto(base);await page.waitForTimeout(350);
   const answer=Array.from({length:100},(_,i)=>'Antwortzeile '+i+' mit Umlauten äöü und vollständigem Text.').join('\n');
   await page.locator('#antwort').fill(answer);await page.locator('#check').check();await page.locator('#wahl').selectOption('b');await page.locator('#notizen').fill('Eigene Notizen');
   await page.getByRole('button',{name:'Jetzt speichern'}).click();
   await page.waitForFunction(()=>document.querySelector('#hw-save-state').textContent==='Gespeichert');
   assert.equal(fields['id:antwort:0'].value,answer);assert.equal(fields['id:check:0'].checked,true);assert.deepEqual(fields['id:wahl:0'].values,['b']);
   await page.reload();await page.waitForFunction(()=>document.querySelector('#antwort').value.startsWith('Antwortzeile 0'));
   assert.equal(await page.locator('#antwort').inputValue(),answer);assert.equal(await page.locator('#check').isChecked(),true);
   await page.emulateMedia({media:'print'});
   const pdf=await page.pdf({format:'A4',printBackground:true});assert.equal(pdf.subarray(0,4).toString(),'%PDF');
   await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   assert.ok((await page.locator('.hw-answer-print').first().innerText()).includes('Antwortzeile 99'),'Long answer must print without textarea clipping');
   await page.emulateMedia({media:'screen'});
   // Standalone blank exports clear all interactive answers, including existing defaults.
   await page.route('**/blank-export',route=>route.fulfill({contentType:'text/html',body:markup({id:'hw-test-worksheet',fields:{},revision:0,standalone:true,blank:true,exportToken:'test-export'})}));
   await page.goto(base+'/blank-export');await page.waitForTimeout(350);
   assert.equal(await page.locator('#antwort').inputValue(),'');assert.equal(await page.locator('#check').isChecked(),false);assert.equal(await page.locator('#notizen').innerText(),'');
   assert.deepEqual(errors,[]);await page.close();
  }
  // Imported cloze markup: duplicated first sentence and later numbered items.
  const page=await browser.newPage({viewport:{width:390,height:900}});
  let saved={'id:answer-1:0':{kind:'text',value:'Alte Notiz'}},rev=0;
  await page.route('**/homework-api.php?*',async route=>{
   const body=route.request().postDataJSON();
   if(body){saved=body.fields;rev++;}
   await route.fulfill({json:{csrf:'test',fields:saved,revision:rev}});
  });
  const fixture=markup({id:'cloze',fields:{},revision:0}).replace('<h1>Aufgaben</h1>',
   '<h1>Ethernet Lückentext</h1><p class="intro">Alt</p><section class="question"><h2>1 Ethernet ist ein ____ Netzwerk.</h2><div class="question-text">1 Ethernet ist ein ____ Netzwerk.</div><label for="answer-1">Deine Antwort</label><textarea id="answer-1"></textarea></section><section class="question"><h2>2 Der Frame hat ____________</h2><div class="question-text">Byte.\n3Die Adresse ist ____.\nWortliste: MAC • 6</div><label for="answer-2">Deine Antwort</label><textarea id="answer-2"></textarea></section>');
  await page.route('**/cloze',route=>route.fulfill({contentType:'text/html',body:fixture}));
  await page.goto(base+'/cloze');await page.waitForFunction(()=>document.querySelector('#answer-1').value==='Alte Notiz');
  assert.equal(await page.locator('.hw-cloze-gap').count(),3);
  assert.equal((await page.locator('.hw-cloze-text').first().innerText()).replace(/\s+/g,' '),'1 Ethernet ist ein Netzwerk.');
  assert.equal(await page.locator('.hw-cloze-legacy').first().isVisible(),true);
  assert.equal(await page.locator('.hw-cloze-legacy').last().isVisible(),false);
  await page.locator('#hw-gap-answer-1-1').fill('lokales');
  await page.getByRole('button',{name:'Jetzt speichern',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#hw-save-state').textContent==='Gespeichert');
  assert.equal(saved['id:hw-gap-answer-1-1:0'].value,'lokales');
  assert.equal(saved['id:answer-1:0'].value,'Alte Notiz');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#hw-gap-answer-1-1').value==='lokales');
  assert.equal(await page.locator('.hw-cloze-gap').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.locator('.hw-cloze-print').first().textContent(),'lokales');
  await page.close();
  console.log('HomeWork answer persistence, checkboxes, select, editable text, complete PDF print and blank HTML PASSED');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
