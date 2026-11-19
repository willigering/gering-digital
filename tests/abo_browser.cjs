/* Browser test for the private Abo-Übersicht (/abo) against PHP's built-in server
 * with temporary databases (never real data). Optional screenshots:
 *   ABO_SHOTS=/tmp/abo NODE_PATH=... node tests/abo_browser.cjs
 * Example values are labelled "Beispiel" and are NOT Willi's real plans. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawn,spawnSync}=require("node:child_process");
const {chromium}=require("playwright");

const root=path.resolve(__dirname,"..");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"gd-abo-browser-"));
const port=20000+Math.floor(Math.random()*900);
const base=`http://127.0.0.1:${port}`;
const PASSWORD="ein-langes-testpasswort";
const shots=process.env.ABO_SHOTS||"";
const outbox=path.join(dir,"outbox.jsonl"); // Testversand: nie echtes mail()/CallMeBot
const readOutbox=()=>fs.existsSync(outbox)?fs.readFileSync(outbox,"utf8").trim().split("\n").filter(Boolean).map(l=>JSON.parse(l)):[];
async function shotNotify(p,file){
  await p.evaluate(()=>window.scrollTo(0,0));
  const box=await p.evaluate(()=>{const h=document.getElementById("nStatus").closest(".section-head").getBoundingClientRect(),f=document.getElementById("notifyForm").getBoundingClientRect();
    return {x:0,y:h.top+window.scrollY-14,width:document.documentElement.clientWidth,height:f.bottom-h.top+28};});
  await p.screenshot({path:file,fullPage:true,clip:box});
}

function iso(offset){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}

(async()=>{
  // Bewerbungs-Zugang wie bewerbungen-api.php anlegen (nur in der Temp-DB).
  const setup=spawnSync("php",["-r",`$p=new PDO('sqlite:'.getenv('D').'/bewerbungen-private.sqlite');$p->exec('CREATE TABLE account (id INTEGER PRIMARY KEY CHECK(id = 1), password_hash TEXT NOT NULL, created_at TEXT NOT NULL)');$p->prepare('INSERT INTO account VALUES (1,?,?)')->execute([password_hash(getenv('P'),PASSWORD_DEFAULT),gmdate('c')]);`],{env:{...process.env,D:dir,P:PASSWORD},encoding:"utf8"});
  assert.equal(setup.status,0,setup.stderr);
  const server=spawn("php",["-S",`127.0.0.1:${port}`,"-t",root,path.join(__dirname,"support/router.php")],{env:{...process.env,GD_ROOT:root,GD_ABO_DATA_DIR:dir,GD_ABO_OUTBOX:outbox},stdio:"ignore"});
  const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
  try{
    for(let i=0;i<50;i++){try{await fetch(base+"/abo/");break}catch{await new Promise(r=>setTimeout(r,100))}}
    const ctx=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,locale:"de-DE",timezoneId:"Europe/Berlin"});
    const page=await ctx.newPage();
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(base+"/abo/");
    await page.waitForSelector("#auth:not(.hidden)");
    await page.fill("#authPassword","falsch-falsch-falsch");
    await page.click("#authSubmit");
    await page.waitForFunction(()=>document.getElementById("authError").textContent.includes("falsch"));
    await page.fill("#authPassword",PASSWORD);
    await page.click("#authSubmit");
    await page.waitForSelector("#auth.hidden",{state:"attached"});
    await page.waitForSelector(".abo");
    assert.equal(await page.locator(".abo").count(),5,"Fünf Start-Abos");
    assert.equal(await page.locator(".due-date.missing").count(),5,"Alle Start-Abos zeigen „Datum fehlt“");

    // Neues Abo über den Dialog anlegen, dann wieder löschen.
    await page.click("#newTop");
    await page.fill("#fName","Testabo");
    await page.fill("#fPreis","4,99");
    await page.fill("#fDatum",iso(3));
    await page.click("#saveEntry");
    await page.waitForSelector("#editor",{state:"hidden"});
    const first=page.locator(".abo").first();
    assert.equal(await first.locator(".abo-name").textContent(),"Testabo","Bald fälliges Abo steht oben");
    assert.ok(await first.evaluate(e=>e.classList.contains("u-soon")),"≤ 7 Tage wird als bald fällig markiert");
    page.once("dialog",d=>d.accept());
    await first.locator("[data-edit]").click();
    await page.click("#deleteEntry");
    await page.waitForFunction(()=>document.querySelectorAll(".abo").length===5);

    // Beispielwerte für die Vorschau (nur Temp-DB).
    const sample=[
      {id:"abo-chatgpt",name:"ChatGPT",preis:23,intervall:"monatlich",ablaufdatum:iso(5),kuendigungslink:"https://chatgpt.com/",notiz:"Beispielwerte – bitte echte Daten eintragen.",status:"aktiv"},
      {id:"abo-claude",name:"Claude",preis:214.2,intervall:"jaehrlich",ablaufdatum:iso(41),kuendigungslink:"https://claude.ai/",notiz:"Beispielwerte – bitte echte Daten eintragen.",status:"aktiv"},
      {id:"abo-grok",name:"Grok",preis:8,intervall:"monatlich",ablaufdatum:iso(-2),notiz:"Beispielwerte – bitte echte Daten eintragen.",status:"aktiv"},
    ];
    await page.evaluate(async items=>{
      const s=await (await fetch("api.php?action=state")).json();
      await fetch("api.php?action=import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({csrf:s.csrf,items})});
    },sample);
    await page.reload();
    await page.waitForSelector(".abo");
    const names=await page.locator(".abo-name").allTextContents();
    assert.deepEqual(names.slice(0,3),["Grok","ChatGPT","Claude"],"Sortierung nach Ablaufdatum");
    assert.ok(await page.locator(".abo.u-expired [data-renew]").count()===1,"Abgelaufenes Abo bietet +1 Monat an");
    const month=await page.textContent("#statMonth");
    assert.equal(month.replace(/\s/g," "),"48,85 €","Monatssumme inkl. Jahresabo ÷ 12");
    // Kantige Optik: keine runden Ecken an Karten, Kacheln, Buttons, Badges.
    const rounded=await page.evaluate(()=>[...document.querySelectorAll(".abo,.stat,.btn,.tag,.filter,.due,.count,.kicker")].filter(e=>getComputedStyle(e).borderTopLeftRadius!=="0px").length);
    assert.equal(rounded,0,"Keine abgerundeten Elemente");
    if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,"abo-preview.png"),fullPage:true});
      await page.click("[data-edit='abo-claude']");await page.waitForSelector("#editor",{state:"visible"});
      await page.screenshot({path:path.join(shots,"abo-preview-editor.png")});await page.click("#cancelEdit");}

    // Benachrichtigungen einrichten (Beispieldaten, Testversand in Datei).
    await page.locator("#notifyForm").scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.getElementById("nStatus").textContent.includes("Aus"));
    assert.equal(await page.inputValue("#nLead"),"7","Vorlauf standardmäßig 7 Tage");
    await page.fill("#nEmail","willi@example.org");
    await page.check("#nEmailOn");
    await page.check("#nWaOn");
    await page.click("#nSave");
    await page.waitForFunction(()=>document.getElementById("nError").textContent.includes("WhatsApp"));
    await page.fill("#nPhone","+49 170 1234567");
    await page.fill("#nApikey","987321");
    await page.click("#nSave");
    await page.waitForFunction(()=>document.getElementById("nKeyState").textContent.includes("gespeichert"));
    assert.equal(await page.inputValue("#nApikey"),"","Schlüsselfeld wird nach dem Speichern geleert");
    assert.ok(!(await page.content()).includes("987321"),"Voller Schlüssel steht nirgends auf der Seite");
    assert.ok((await page.textContent("#nStatus")).includes("E-Mail + WhatsApp"),"Status zeigt beide Kanäle");
    await page.click("#nTestEmail");
    await page.waitForFunction(()=>document.getElementById("toast").textContent.includes("Test-E-Mail"));
    assert.equal(readOutbox().filter(m=>m.channel==="email").length,1,"Test-E-Mail im Testpostfach");
    await page.click("#nToken");
    await page.waitForSelector("#nTokenBox:not(.hidden)");
    const token=await page.textContent("#nTokenValue");
    assert.match(token,/^abo_[a-f0-9]{64}$/,"Cron-Token wird einmal angezeigt");
    const run=await fetch(base+"/abo/notify.php",{method:"POST",headers:{"X-Abo-Token":token,"Content-Type":"application/json"},body:"{}"});
    const runData=await run.json();
    assert.equal(run.status,200);assert.equal(runData.sent,2,"ChatGPT (in 5 Tagen) per E-Mail und WhatsApp");
    assert.ok(readOutbox().some(m=>m.channel==="whatsapp"&&m.text.startsWith("⏰ Abo-Erinnerung: ChatGPT (monatlich, 23,00 €)")),"WhatsApp-Text");
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll("#nLog li:not(.empty-log)").length===2);
    assert.ok((await page.textContent("#nLastRun")).includes("2 Erinnerungen verschickt"),"Letzte Prüfung sichtbar");
    assert.ok((await page.textContent("#nCronState")).includes("Verbunden"),"Cron-Status verbunden");
    assert.ok((await page.textContent("#nPreview")).replace(/\s/g," ").startsWith("⏰ Abo-Erinnerung: ChatGPT (monatlich, 23,00 €) läuft am"),"Nachrichten-Vorschau mit dem nächsten Abo");
    const roundedN=await page.evaluate(()=>[...document.querySelectorAll(".npanel,.switch b,.switch b::before,.stepper,.lead-box,.cron,.help,.sentlist li,.sentlist .ch,#notifyForm .btn,#notifyForm input")].filter(e=>getComputedStyle(e).borderTopLeftRadius!=="0px").length);
    assert.equal(roundedN,0,"Benachrichtigungen ohne runde Ecken");
    if(shots){
      // Vorschau: Hilfe aufgeklappt, Token-Box als Beispiel sichtbar.
      await page.evaluate(t=>{document.querySelector("#nWaPanel .help").open=true;document.getElementById("nTokenValue").textContent=t;document.getElementById("nTokenBox").classList.remove("hidden");},token);
      await shotNotify(page,path.join(shots,"abo-notify-preview.png"));
    }

    // Mobil: nichts ragt seitlich heraus.
    // Für Vorschaubilder scharf (2×), mit derselben Sitzung.
    const mctx=shots?await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,locale:"de-DE",timezoneId:"Europe/Berlin",storageState:await ctx.storageState()}):ctx;
    const mobile=await mctx.newPage();
    await mobile.setViewportSize({width:390,height:844});
    await mobile.goto(base+"/abo/");
    await mobile.waitForSelector(".abo");
    const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow<=0,"Mobil kein horizontales Scrollen ("+overflow+"px)");
    if(shots)await mobile.screenshot({path:path.join(shots,"abo-preview-mobile.png"),fullPage:true});
    await mobile.waitForSelector("#nLog li:not(.empty-log)");
    if(shots){await mobile.evaluate(()=>{document.querySelector("#nWaPanel .help").open=true;});await shotNotify(mobile,path.join(shots,"abo-notify-preview-mobile.png"));}
    const overflow2=await mobile.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert.ok(overflow2<=0,"Mobil (Benachrichtigungen offen) kein horizontales Scrollen ("+overflow2+"px)");
    assert.deepEqual(errors,[],"Keine JS-Fehler");
    console.log("OK: Abo-Browsertest bestanden");
  }finally{
    await browser.close();server.kill();
    fs.rmSync(dir,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exit(1)});
