const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
await page.goto('file://'+path.resolve(__dirname,'../lernmodule/b5-netzwerkdienste.html'));
await page.waitForFunction(()=>window.B5DIENSTE_TEST);
const result=await page.evaluate(()=>{
 const h=window.B5DIENSTE_TEST;let n=0;const ids=new Set();
 for(const s of h.SUBS){if(ids.has(s.id))throw Error('Doppelte ID');ids.add(s.id);for(let i=0;i<1000;i++){const t=h.genTask(s.id,(i%3)+1);if(!t.scene||!t.prompt||!t.plain||!t.why||t.prompt===t.plain)throw Error('Inhalt fehlt '+s.id);const a=h.parseAnswer(t,String(t.answer));if(!a.valid||!a.ok)throw Error('Lösung abgewiesen '+s.id+' '+JSON.stringify(t));if(h.parseAnswer(t,'FALSCH999999999').ok)throw Error('Falsche Antwort akzeptiert');n++}}
 for(const k of [1,2,3]){const ts=h.buildExam(k);if(ts.length!==20*k||Math.abs(ts.reduce((a,t)=>a+t.pts,0)-100)>1e-8)throw Error('Prüfungsplan');if(new Set(ts.map(t=>t.cat)).size!==10)throw Error('Themen fehlen')}
 if(h.gradeOf(92)!==1||h.gradeOf(81)!==2||h.gradeOf(67)!==3||h.gradeOf(50)!==4||h.gradeOf(30)!==5||h.gradeOf(29)!==6)throw Error('Notenschlüssel');
 return {types:h.SUBS.length,generated:n,ids:[...ids],stages:h.STAGES.map(s=>({title:s.title,cat:s.cat}))};});
assert.equal(result.types,50);assert.equal(await page.locator('.area-tab').count(),4);assert.equal(await page.locator('.stage-tile[aria-disabled=true]').count(),9);
await page.locator('#practiceGo').click();
for(let i=0;i<13;i++){const answer=await page.evaluate(()=>String(B5DIENSTE_TEST.last().answer));await page.locator('#practiceTask input').fill(answer);await page.locator('#practiceTask [data-r=check]').click();if(i<12)await page.locator('#practiceTask [data-r=next]').click();if(i===2){const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('b5-dienste-path-v1')));assert.equal(p.st[0].hist.length,0)}if(i===10){const p=await page.evaluate(()=>JSON.parse(localStorage.getItem('b5-dienste-path-v1')));assert.equal(p.st[0].mastered,false)}}
let state=await page.evaluate(()=>({path:JSON.parse(localStorage.getItem('b5-dienste-path-v1')),stats:JSON.parse(localStorage.getItem('b5-dienste-stats-v1'))}));assert.equal(state.path.st[0].mastered,true);assert.equal(state.path.st[0].hist.length,10);assert.equal(state.stats.solved,13);assert.equal(state.stats.correct,13);
assert.equal(await page.locator('#lessonBody').isVisible(),false);
await page.locator('#backToLesson').click();await page.locator('.dtp-practice-dialog').waitFor({state:'hidden'});
await page.locator('#tab-train').click();await page.locator('[data-mode=free]').click();
for(let i=0;i<20;i++){const t=await page.evaluate(()=>({a:String(B5DIENSTE_TEST.last().answer),scene:B5DIENSTE_TEST.last().scene}));await page.locator('#trainTask input').fill(t.a);await page.locator('#trainTask [data-r=check]').click();assert.match(await page.locator('#trainTask .result').innerText(),/Richtig/);await page.locator('#trainTask [data-r=next]').click()}
await page.locator('#tab-learn').click();assert.equal(await page.locator('[data-lab]').count(),10);for(const el of await page.locator('[data-lab]').all()){assert.ok((await el.locator('.lab-out').innerText()).length>30)}
await page.locator('#tab-exam').click();
for(const k of [1,2,3]){
 await page.locator('[data-len="'+k+'"]').click();await page.locator('#examStart').click();
 const count=20*k;
 for(let i=0;i<count;i++){const ans=await page.evaluate(()=>{const ex=B5DIENSTE_TEST.exam();return String(ex.tasks[ex.cur].answer)});await page.locator('#exIn').fill(ans);if(i<count-1)await page.locator('#examNext').click()}
 await page.locator('#examSubmit').click();await page.locator('#examYes').click();assert.match(await page.locator('#examResult').innerText(),/100 von 100 Punkten/);assert.equal(await page.locator('#examResult .review').count(),count);await page.locator('#examResult .review').first().locator('summary').click();assert.equal(await page.locator('#examResult .review').first().locator('.task-scene').count(),1);await page.locator('#examAgain').click();
}
await page.locator('#examStart').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});assert.match(await page.locator('#examResult').innerText(),/automatisch abgegeben/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('b5-dienste-exam-v1')).at(-1).r),'Seite verlassen');
await page.locator('#tab-train').click();await page.locator('[data-mode=free]').click();await page.locator('[data-mode=sprint]').click();await page.locator('#sprintGo').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false})});assert.match(await page.locator('#sprintEnd').innerText(),/Seite verlassen/);
assert.ok((await page.evaluate(()=>Object.keys(localStorage))).every(k=>k.startsWith('b5-dienste-')));assert.ok((await page.evaluate(()=>Object.values(localStorage))).every(v=>{try{JSON.parse(v);return true}catch{return false}}));
for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});for(const tab of ['path','learn','train','exam']){await page.locator('#tab-'+tab).click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Überlauf '+width+' '+tab)}await page.locator('#tab-path').click();await page.screenshot({path:'/tmp/b5-'+width+'.png',fullPage:true})}
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
fs.writeFileSync('/tmp/b5-test-result.json',JSON.stringify(result,null,2));console.log('B5 browser PASS:',result.generated,'Generatoren-Aufrufe; 20 Trainingsantworten; 3 vollständige Prüfungen; Lernpfad, Tabwechsel, 1440/390/320px.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
