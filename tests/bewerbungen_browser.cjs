/* Browser wiring regression: private Bewerbungskompass e-mail composer.
   Uses only local HTTP stubs; never connects to mail.de or sends real mail.
   NODE_PATH=... node tests/bewerbungen_browser.cjs */
"use strict";
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");

const companies=[
 {id:"betrieb-lage",company:"Musterfirma Lage",city:"Lage",street:"Bahnhofstr. 10",postal:"32791",postCity:"Lage",recipient:"Personalabteilung",email:"lage@example.org",distanceKm:2,status:"nicht_beworben",appliedAt:""},
 {id:"betrieb-detmold",company:"Musterfirma Detmold",city:"Detmold",street:"Testweg 7",postal:"32756",postCity:"Detmold",recipient:"Frau Beispiel",email:"detmold@example.org",distanceKm:9,status:"absage",appliedAt:""}
];
const cfg={
 senderName:"Willi Gering",senderStreet:"Musterallee 1",senderPostal:"32791",senderCity:"Lage",
 senderPhone:"",senderEmail:"willi.gering@mail.de",
 subjectTemplate:"Praktikum bei {FIRMA}",salutation:"Sehr geehrte Damen und Herren,",
 coverLetter:"Ich interessiere mich für {FIRMA} und den Zeitraum {ZEITRAUM}.",
 mailBody:"Guten Tag, anbei meine Bewerbung. Mit freundlichen Grüßen {ABSENDER}"
};
let calls={preview:0,send:0,raw:""};
async function run(){
 const server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,"http://localhost");
   const send=(status,body,headers={})=>{
     res.writeHead(status,{"Content-Type":"application/json;charset=utf-8","Cache-Control":"no-store",...headers});
     res.end(JSON.stringify(body));
   };
   if(url.pathname==="/bewerbungen-api.php"){
     send(200,{mode:"ready",csrf:"ci-csrf-token",items:companies});return;
   }
   if(url.pathname==="/bewerbungen-mail.php"){
     const a=url.searchParams.get("action");
     if(a==="state"){send(200,{config:cfg,senderAddress:"willi.gering@mail.de",smtpConfigured:true,cvStored:true,history:[]});return;}
     const chunks=[];for await(const chunk of req)chunks.push(chunk);
     const body=Buffer.concat(chunks).toString("utf8");
     if(a==="preview"){
       calls.preview++;
       assert(body.includes("betrieb-detmold"),"Preview uses selected company");
       const bytes=Buffer.from("%PDF-1.4\n"+' '.repeat(150)+"\n%%EOF");
       res.writeHead(200,{"Content-Type":"application/pdf","Cache-Control":"no-store",
         "X-Document-SHA256":"a".repeat(64)});
       res.end(bytes);return;
     }
     if(a==="send"){
       calls.send++;calls.raw=body;
       assert(body.includes("expectedPdfHash"),"Reviewed PDF hash required");
       assert(body.includes("a".repeat(64)),"Expected PDF hash forwarded");
       assert(body.includes("detmold@example.org"),"Correct recipient forwarded");
       send(200,{sent:true,message:"SMTP accepted"});return;
     }
     if(a==="save-settings"){send(200,{config:cfg,smtpConfigured:true,cvStored:true,history:[]});return;}
     send(200,{message:"Test OK"});return;
   }
   const accepted={"/b.html":"b.html","/bewerbungen-mail-ui.js":"bewerbungen-mail-ui.js",
    "/bewerbungen-mail.css":"bewerbungen-mail.css"};
   const file=accepted[url.pathname];
   if(!file){res.writeHead(404);res.end();return;}
   const body=fs.readFileSync(path.join(__dirname,"..",file));
   const ext=path.extname(file);
   res.writeHead(200,{"Content-Type":ext===".js"?"text/javascript":ext===".css"?"text/css":"text/html; charset=utf-8"});
   res.end(body);
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const address="http://127.0.0.1:"+server.address().port+"/b.html";
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try{
   const page=await browser.newPage({viewport:{width:1365,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",d=>d.accept());
   await page.goto(address,{waitUntil:"networkidle"});
   await page.waitForSelector(".data-table tr[data-edit]");
   assert.equal(await page.locator(".data-table tr[data-edit]").count(),2,"Two stub companies displayed");
   assert.equal((await page.locator("#overviewHeader h1").innerText()).trim(),"Praktikumsbewerbung","Only requested heading is shown");
   await page.locator('.nav-item[data-view="all"]').click();
   assert.equal(await page.locator('.data-table tr.row-open').count(),1,"Open company gets row tint");
   assert.equal(await page.locator('.data-table tr.row-rejected').count(),1,"Rejected company gets row tint");
   const desktopColors=await page.evaluate(() => ({
     green:getComputedStyle(document.querySelector(".data-table tr.row-open td")).backgroundColor,
     red:getComputedStyle(document.querySelector(".data-table tr.row-rejected td")).backgroundColor
   }));
   assert.equal(desktopColors.green,"rgba(88, 138, 108, 0.17)","Entire open table row is muted green");
   assert.equal(desktopColors.red,"rgba(145, 86, 89, 0.19)","Entire rejected table row is muted red");
   await page.locator('.nav-item[data-view="overview"]').click();
   await page.locator(".gdm-top-button").click();
   await page.waitForSelector("#gdm-overlay:not([hidden])");
   assert.match(await page.locator("#gdm-address").innerText(),/Bahnhofstr. 10/,"First address visible");
   await page.locator("#gdm-company").selectOption("betrieb-detmold");
   assert.match(await page.locator("#gdm-address").innerText(),/Testweg 7/,"Switch adjusts PDF recipient address");
   assert.equal(await page.locator("#gdm-to").inputValue(),"detmold@example.org","Mail recipient follows company");
   assert.equal(await page.locator("#gdm-subject").inputValue(),"Praktikum bei Musterfirma Detmold");
   assert.equal(await page.locator("#gdm-send").isDisabled(),true,"Cannot send without preview");
   await page.locator("#gdm-preview").click();
   await page.waitForFunction(()=>!document.querySelector("#gdm-send").disabled);
   assert.equal(calls.preview,1,"Preview API called once");
   await page.locator("#gdm-letter").fill("Geänderter Anschreibenstext.");
   assert.equal(await page.locator("#gdm-send").isDisabled(),true,"Editing invalidates preview");
   await page.locator("#gdm-preview").click();
   await page.waitForFunction(()=>!document.querySelector("#gdm-send").disabled);
   await page.locator("#gdm-send").click();
   await page.waitForFunction(()=>document.querySelector("#gdm-overlay").hidden);
   assert.equal(calls.send,1,"One explicit send request");
   assert.equal(errors.length,0,"No browser page exceptions: "+errors.join(", "));
   await page.locator(".nav-item[data-view='settings']").click();
   await page.waitForSelector("#gdm-config-form");
   assert.equal(await page.locator("#gdm-senderName").inputValue(),"Willi Gering");
   assert.equal(await page.locator("#gdm-cv-status").innerText(),"Lebenslauf.pdf gespeichert");
   await page.close();

   const mobile=await browser.newPage({viewport:{width:390,height:844}});
   mobile.on("dialog",d=>d.accept());
   await mobile.goto(address,{waitUntil:"networkidle"});
   await mobile.waitForSelector(".mobile-card[data-edit]");
   assert.equal(await mobile.locator(".mobile-card[data-edit]").count(),2);
   const mobileColors=await mobile.evaluate(() => ({
     green:getComputedStyle(document.querySelector(".mobile-card.row-open")).backgroundColor,
     red:getComputedStyle(document.querySelector(".mobile-card.row-rejected")).backgroundColor
   }));
   assert.equal(mobileColors.green,"rgba(88, 138, 108, 0.17)","Whole mobile card gets muted green");
   assert.equal(mobileColors.red,"rgba(145, 86, 89, 0.19)","Whole rejected mobile card gets muted red");
   await mobile.locator(".mobile-card[data-edit='betrieb-detmold'] [data-gdm-mail]").click();
   await mobile.waitForSelector("#gdm-overlay:not([hidden])");
   assert.match(await mobile.locator("#gdm-address").innerText(),/Testweg 7/);
   await mobile.close();
   console.log("Bewerbungskompass e-mail composer: desktop/mobile, PDF preview gate, company address, send & settings OK.");
 } finally {
   await browser.close();await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(err=>{console.error(err);process.exit(1)});
