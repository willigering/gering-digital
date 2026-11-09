'use strict';
// Lernablauf, Bewertung, Rückweg aus dem Nachschlagwerk, Prüfung und Darstellung von CS1 „Compiler sagt nein“.
const {chromium}=require('playwright');
const path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../lernmodule/cs1-csharp.html')).href;
const answer=async(page,host,right=true)=>{const t=await page.evaluate(()=>{const t=CS1START_TEST.last();return {kind:t.kind,answer:t.answer,n:t.options?t.options.length:0}});
 if(t.kind==='mc'){await page.locator(host+` .opt[data-v="${right?t.answer:(t.answer+1)%t.n}"]`).click()}
 else{const wrong=t.kind==='order'?String(t.answer).split('').reverse().join(''):t.kind==='set'?(String(t.answer).includes('A')?String(t.answer).replace('A','')||'B':'A'+t.answer):'falsch falsch';await page.locator(host+' input').fill(right?String(t.answer):wrong);await page.locator(host+' [data-r="check"]').click()}};
(async()=>{const browser=await chromium.launch();const r={};try{
 const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/ERR_FILE_NOT_FOUND|Failed to load/.test(m.text()))errors.push(m.text())});
 await page.goto(url);
 assert.equal(await page.locator('.kicker').innerText().then(s=>s.includes('PROGRAMMIEREN MIT C#')),true);
 assert.match(await page.title(),/Compiler sagt nein/);
 // Stufe 2 gesperrt
 await page.locator('.stage-tile[data-stage="1"]').click({force:true});assert.match(await page.locator('#stageBanner').innerText(),/gesperrt/);
 // Ablauf in Zeitlupe
 await page.locator('#tab-learn').click();const lab=page.locator('[data-trace="0"]');for(let i=0;i<3;i++)await lab.locator('[data-a="next"]').click();assert.match(await lab.locator('[data-o]').innerText(),/16384 MB/);
 await page.locator('#tab-path').click();
 // Ersten drei Aufgaben mit Hinweis, Eingabe übersteht den Rückweg
 await page.locator('#practiceGo').click();await page.waitForSelector('dialog.dtp-practice-dialog[open]');
 assert.equal(await page.locator('#practiceTask [data-r="hint"]').isVisible(),true);
 while((await page.evaluate(()=>CS1START_TEST.last().kind))==='mc'){await answer(page,'#practiceTask');await page.locator('#practiceTask [data-r="next"]').click()}
 await page.locator('#practiceTask input').fill('Mein halber Gedanke');
 await page.locator('#practiceTask [data-r="ref"]').click();await page.waitForFunction(()=>!document.getElementById('learnView').hidden);
 await page.locator('#backToTask').waitFor();assert.match(await page.locator('#backToTask').innerText(),/ZURÜCK ZUR AUFGABE/);
 await page.waitForFunction(()=>!document.querySelector('dialog.dtp-practice-dialog[open]'));
 await page.locator('#backToTask').click();await page.waitForSelector('dialog.dtp-practice-dialog[open]');
 assert.equal(await page.locator('#practiceTask input').inputValue(),'Mein halber Gedanke');r.refReturn=true;
 // Falsche Antwort: Spruch und Erklärung
 await answer(page,'#practiceTask',false);const bad=await page.locator('#practiceTask [data-r="res"]').innerText();assert.match(bad,/Richtig ist/);assert.doesNotMatch(bad,/Noch nicht/);assert.ok((await page.locator('#practiceTask .why').innerText()).length>10);
 // Mit Nachschlagen zählt die Aufgabe nicht für die 8 von 10
 const hist=await page.evaluate(()=>JSON.parse(localStorage.getItem('cs1-start-path-v1')).st[0].hist.length);assert.equal(hist,0);
 // Meistern: 3 Aufgaben mit Hinweis zählen nicht, danach 8 von 10
 for(let i=0;i<25;i++){await page.locator('#practiceTask [data-r="next"]').click();await answer(page,'#practiceTask',true);const m=await page.evaluate(()=>JSON.parse(localStorage.getItem('cs1-start-path-v1')).st[0]);if(m.mastered){r.masteredAfter=i+1;assert.ok(m.hist.length===10);break}}
 assert.ok(r.masteredAfter);
 await page.locator('#backToLesson').click();await page.waitForFunction(()=>!document.querySelector('dialog.dtp-practice-dialog[open]'));
 await page.locator('.stage-tile[data-stage="1"]').click();assert.match(await page.locator('#stageTitle').innerText(),/Compiler/);
 // Training und alle Aufgabentypen rendern
 await page.locator('#tab-train').click();const kinds=await page.evaluate(()=>[...new Set(CS1START_TEST.SUBS.map(s=>CS1START_TEST.genTask(s.id,2).kind))]);assert.deepEqual(kinds.sort(),['code','free','mc','order','out','set','text']);
 // Zuordnen
 await page.locator('[data-mode="match"]').click();for(let i=0;i<5;i++)await page.locator('#ms'+i).selectOption({index:1});await page.locator('#matchCheck').click();assert.match(await page.locator('#matchResult').innerText(),/von 5 richtig/);
 await page.locator('[data-mode="free"]').click();
 // Prüfung: Punkte, eigene Antwort, Lösung
 await page.locator('#tab-exam').click();await page.locator('.exam-len [data-len="1"]').click();await page.locator('#examStart').click();
 await page.evaluate(()=>{const e=CS1START_TEST.exam();e.tasks.forEach((t,i)=>{e.ans[i]=t.kind==='mc'?t.answer:(i===0?'MEINE ABGABE':String(t.answer))})});
 await page.locator('#examSubmit').click();await page.locator('#examYes').click();
 const res=await page.locator('#examResult').innerText();const firstKind=await page.evaluate(()=>CS1START_TEST.exam().tasks[0].kind);
 assert.match(res,/von 100 Punkten/);if(firstKind!=='mc')assert.match(await page.locator('#examResult').evaluate(e=>e.textContent),/MEINE ABGABE|ungültiges/);
 const ex=await page.evaluate(()=>JSON.parse(localStorage.getItem('cs1-start-exam-v1')));assert.equal(ex.length,1);assert.equal(ex[0].m,30);r.examPercent=ex[0].p;
 // Prüfung bei Tabwechsel
 await page.locator('#examAgain').click();await page.locator('#examStart').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))});
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('cs1-start-exam-v1')).pop().r),'Seite verlassen');
 await page.evaluate(()=>{delete document.hidden});
 // Nur Schlüssel mit Präfix
 const keys=await page.evaluate(()=>Object.keys(localStorage));assert.ok(keys.every(k=>k.startsWith('cs1-start-')||k==='dtp-game-best-cs1'),keys.join());
 assert.ok(await page.evaluate(()=>!!window.dtpGame),'Spielmodus fehlt');
 // Kein seitliches Scrollen, auch mit langem Code
 for(const width of [1280,768,390,360]){const p=await ctx.newPage();await p.setViewportSize({width,height:800});await p.goto(url);for(const tab of ['learn','path','train','exam']){await p.locator('#tab-'+tab).click();const o=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(o<=1,`${width} ${tab}: ${o}px`)}await p.close()}
 assert.deepEqual(errors,[]);console.log(JSON.stringify(r));console.log('OK');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
