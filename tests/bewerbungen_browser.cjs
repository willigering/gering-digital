/* Browser wiring regression: private Bewerbungskompass e-mail composer.
   Uses only local HTTP stubs; never connects to mail.de or sends real mail.
   NODE_PATH=... node tests/bewerbungen_browser.cjs */
"use strict";
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {PDFDocument,PDFName,decodePDFRawStream}=require("pdf-lib");

const companies=[
 {id:"betrieb-lage",company:"Musterfirma Lage",city:"Lage",street:"Bahnhofstr. 10",postal:"32791",postCity:"Lage",recipient:"Personalabteilung",email:"lage@example.org",distanceKm:2,status:"beworben",appliedAt:"2026-11-10"},
 {id:"betrieb-detmold",company:"Musterfirma Detmold",city:"Detmold",street:"Testweg 7",postal:"32756",postCity:"Detmold",recipient:"Frau Beispiel",email:"detmold@example.org",distanceKm:9,status:"absage",appliedAt:""},
 {id:"betrieb-lemgo",company:"Musterfirma Lemgo",city:"Lemgo",street:"Kirchweg 8",postal:"32657",postCity:"Lemgo",recipient:"Personal",email:"lemgo@example.org",distanceKm:13,status:"nicht_beworben",appliedAt:""}
];
const cfg={
 senderName:"Willi Gering",senderStreet:"Musterallee 1",senderPostal:"32791",senderCity:"Lage",
 senderPhone:"",senderEmail:"willi.gering@mail.de",
 subjectTemplate:"Praktikum bei {FIRMA}",salutation:"Sehr geehrte Damen und Herren,",
 coverLetter:"Ich interessiere mich für {FIRMA} und den Zeitraum {ZEITRAUM}.",
 mailBody:"Guten Tag, anbei meine Bewerbung. Mit freundlichen Grüßen {ABSENDER}"
};
let calls={preview:0,send:0,raw:""};
let originalPresent=false;
let pdfOriginal=null;
let originalRequests=0;
async function makeSyntheticOriginal(){
 const master=await PDFDocument.create();
 for(let i=0;i<5;i++)master.addPage([595.32,841.92]);
 const context=master.context;
 const page=master.getPage(1);
 const code=c=>c.charCodeAt(0).toString(16).padStart(4,"0").toUpperCase();
 const entries=Array.from({length:95},(_,i)=>String.fromCharCode(i+32));
 const unicode=context.register(context.flateStream(
   "95 beginbfchar\n"+entries.map(c=>`<${code(c)}> <${code(c)}>`).join("\n")+"\nendbfchar"
 ));
 const font=context.obj({
   BaseFont:"CIDFont+F1", ToUnicode:unicode, DescendantFonts:[{W:[32,126,500]}]
 });
 page.node.set(PDFName.of("Resources"),context.obj({Font:{F1:font}}));
 const rows=[224.320007,243.679993,263.040009,282.399994,378.880005,475.519989];
 const lines=rows.map(y=>`/F1 14.720600 Tf\n1 0 0.000000 -1 94.559998 ${y} Tm\n[<0020>] TJ`);
 page.node.set(PDFName.of("Contents"),context.register(context.flateStream(lines.join("\n"))));
 return Buffer.from(await master.save({useObjectStreams:false}));
}
async function run(){
 pdfOriginal=await makeSyntheticOriginal();
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
     if(a==="state"){send(200,{config:cfg,senderAddress:"willi.gering@mail.de",smtpConfigured:true,cvStored:true,cvFilename:"Lebenslauf.pdf",originalStored:originalPresent,originalFilename:originalPresent?"Stadt_Lage.pdf":null,templateStored:true,templateFilename:"Blank_Vorlage.pdf",history:[]});return;}
     if(a==="original" && req.method==="GET"){
       originalRequests++;
       res.writeHead(200,{"Content-Type":"application/pdf","Cache-Control":"no-store"});
       res.end(pdfOriginal);return;
     }
     const chunks=[];for await(const chunk of req)chunks.push(chunk);
     const body=Buffer.concat(chunks).toString("utf8");
     if(a==="preview"){
       calls.preview++;
       assert(body.includes("betrieb-lemgo"),"Preview uses selected uncontacted company");
       const bytes=Buffer.from("%PDF-1.4\n"+' '.repeat(150)+"\n%%EOF");
       res.writeHead(200,{"Content-Type":"application/pdf","Cache-Control":"no-store",
         "X-Document-SHA256":"a".repeat(64)});
       res.end(bytes);return;
     }
     if(a==="send"){
       calls.send++;calls.raw=body;
       assert(body.includes("expectedPdfHash"),"Reviewed PDF hash required");
       assert(/expectedPdfHash[\s\S]{0,300}[a-f0-9]{64}/.test(body),"Exact preview PDF hash forwarded");
       assert(body.includes('"useFivePage":true'),"Five-page mode requested");
       assert(body.includes("Bewerbungsmappe.pdf"),"Whole five-page map attached");
       assert(body.includes("lemgo@example.org"),"Correct recipient forwarded");
       send(200,{sent:true,message:"SMTP accepted"});return;
     }
     if(a==="save-settings"){send(200,{config:cfg,smtpConfigured:true,cvStored:true,cvFilename:"Lebenslauf.pdf",originalStored:originalPresent,originalFilename:originalPresent?"Stadt_Lage.pdf":null,templateStored:true,templateFilename:"Blank_Vorlage.pdf",history:[]});return;}
     if(a==="upload-original"){originalPresent=true;send(200,{message:"Private upload OK"});return;}
     if(a==="remove-original"){originalPresent=false;send(200,{message:"Private removal OK"});return;}
     send(200,{message:"Test OK"});return;
   }
   const accepted={"/b.html":"b.html","/bewerbungen-mail-ui.js":"bewerbungen-mail-ui.js",
    "/bewerbungen-mail.css":"bewerbungen-mail.css","/bewerbungen-theme.css":"bewerbungen-theme.css",
    "/bewerbungen-five-page.js":"bewerbungen-five-page.js",
    "/assets/lib/pdf-lib.min.js":"assets/lib/pdf-lib.min.js",
    "/assets/dau-backgrounds/network-ports-1536.webp":"assets/dau-backgrounds/network-ports-1536.webp",
    "/assets/dau-backgrounds/network-ports-768.webp":"assets/dau-backgrounds/network-ports-768.webp"};
   const file=accepted[url.pathname];
   if(!file){res.writeHead(404);res.end();return;}
   const body=fs.readFileSync(path.join(__dirname,"..",file));
   const ext=path.extname(file);
   res.writeHead(200,{"Content-Type":ext===".js"?"text/javascript":ext===".css"?"text/css":ext===".webp"?"image/webp":"text/html; charset=utf-8"});
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
   assert.equal(await page.locator(".data-table tr[data-edit]").count(),3,"Three stub companies displayed");
   assert.equal((await page.locator("#overviewHeader h1").innerText()).trim(),"Praktikumsbewerbung","Only requested heading is shown");
   await page.locator('.nav-item[data-view="all"]').click();
   assert.equal(await page.locator('.data-table tr.row-applied').count(),1,"Already applied company gets green row");
   assert.equal(await page.locator('.data-table tr.row-rejected').count(),1,"Rejected company gets red row");
   assert.equal(await page.locator('.data-table tr[data-edit="betrieb-lemgo"].row-applied').count(),0,"Uncontacted company stays neutral");
   const desktopColors=await page.evaluate(() => ({
     green:getComputedStyle(document.querySelector(".data-table tr.row-applied td")).backgroundColor,
     red:getComputedStyle(document.querySelector(".data-table tr.row-rejected td")).backgroundColor,
     neutral:getComputedStyle(document.querySelector('.data-table tr[data-edit="betrieb-lemgo"] td')).backgroundColor,
     wallpaper:getComputedStyle(document.querySelector("#applicationBackdrop"),"::before").backgroundImage
   }));
   assert.equal(desktopColors.green,"rgba(66, 139, 115, 0.23)","Entire applied table row is muted green");
   assert.equal(desktopColors.red,"rgba(151, 81, 86, 0.23)","Entire rejected table row is muted red");
   assert.equal(desktopColors.neutral,"rgba(0, 0, 0, 0)","Not yet applied company is neutral");
   assert.match(desktopColors.wallpaper,/network-ports-1536\.webp/,"Uses the actual Unterrichtsmaterial background");
   assert.equal(await page.locator("#logoutTop").isVisible(),true,"Logout always visible in the top bar");
   await page.locator(".nav-item[data-view='settings']").click();
   await page.waitForSelector("#gdm-config-form");
   assert.equal(await page.locator("#gdm-original-status").innerText(),"Noch keine Originalbewerbung hinterlegt");
   assert.equal(await page.locator("#gdm-download-original").isVisible(),false,"Private original download hidden before upload");
   await page.locator("#gdm-original-input").setInputFiles({
     name:"Original.pdf",mimeType:"application/pdf",buffer:pdfOriginal
   });
   await page.waitForFunction(()=>document.querySelector("#gdm-original-status").textContent.includes("privat gespeichert"));
   assert.equal(await page.locator("#gdm-download-original").isVisible(),true,"Private original download shown after upload");
   await page.locator('.nav-item[data-view="overview"]').click();
   await page.locator(".gdm-top-button").click();
   await page.waitForSelector("#gdm-overlay:not([hidden])");
   assert.equal(await page.locator("#gdm-company option").count(),1,"Only companies without a sent application are selectable");
   assert.equal(await page.locator("#gdm-company").inputValue(),"betrieb-lemgo","Uncontacted company selected by default");
   assert.match(await page.locator("#gdm-address").innerText(),/Kirchweg 8/,"Uncontacted company address visible");
   
   
   assert.equal(await page.locator("#gdm-to").inputValue(),"lemgo@example.org","Mail recipient follows uncontacted company");
   assert.equal(await page.locator("#gdm-subject").inputValue(),"Praktikum bei Musterfirma Lemgo");
   assert.equal(await page.locator("#gdm-send").isDisabled(),true,"Cannot send without preview");
   await page.locator("#gdm-preview").click();
   await page.waitForFunction(()=>!document.querySelector("#gdm-send").disabled);
   assert.equal(calls.preview,0,"Five-page PDF preview is created locally, not as a separate one-page server PDF");
   assert.equal(originalRequests,1,"Preview requests the private original PDF");
   const generated=Buffer.from(await page.evaluate(async()=>{
     const url=document.querySelector("#gdm-pdf-download").href;
     return Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer()));
   }));
   const pdf=await PDFDocument.load(generated);
   assert.equal(pdf.getPageCount(),5);
   const content=pdf.getPage(1).node.lookup(PDFName.of("Contents"));
   const stream=Buffer.from(decodePDFRawStream(content).decode()).toString("ascii");
   const rows=[...stream.matchAll(/<([0-9A-F]+)> Tj/g)].map(m=>
     m[1].match(/.{4}/g).map(code=>String.fromCharCode(parseInt(code,16))).join(""));
   assert.deepEqual(rows.slice(0,4),["Musterfirma Lemgo","Personal","Kirchweg 8","32657 Lemgo"]);
   assert.match(rows[4],/^\d{2}\.\d{2}\.\d{4}$/);
   assert.equal(rows[5],"Sehr geehrte Damen und Herren,");
   await page.locator("#gdm-subject").fill("Geänderter E-Mail-Betreff.");
   assert.equal(await page.locator("#gdm-send").isDisabled(),true,"Editing invalidates preview");
   await page.locator("#gdm-preview").click();
   await page.waitForFunction(()=>!document.querySelector("#gdm-send").disabled);
   await page.locator("#gdm-send").click();
   await page.waitForFunction(()=>document.querySelector("#gdm-overlay").hidden);
   assert.equal(calls.preview,0,"No legacy single-page PDF generated");
   assert.equal(calls.send,1,"Exactly one explicit five-page send request");
   assert.equal(errors.length,0,"No browser page exceptions: "+errors.join(", "));
   await page.locator(".nav-item[data-view='settings']").click();
   await page.waitForSelector("#gdm-config-form");
   assert.equal(await page.locator("#gdm-senderName").inputValue(),"Willi Gering");
   assert.equal((await page.locator("#gdm-cv-status").textContent()).trim(),"Lebenslauf.pdf gespeichert");
   const importDoc={senderName:"Test Name",senderStreet:"Musterstr. 5",senderPostal:"32791",senderCity:"Teststadt",senderPhone:"",
      subjectTemplate:"Bewerbung bei {FIRMA}",salutation:"Sehr geehrte Damen und Herren,",
      coverLetter:"Test: kein personenbezogener Text in GitHub.",mailBody:"Hallo, anbei die Bewerbung."};
   await page.locator("#gdm-template-input").setInputFiles({
     name:"private-vorlage.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(importDoc))
   });
   await page.waitForFunction(()=>document.querySelector("#gdm-coverLetter").value.startsWith("Test:"));
   assert.equal(await page.locator("#gdm-senderStreet").inputValue(),"Musterstr. 5","Private JSON import pre-fills sender");
   assert.equal(await page.locator("#gdm-coverLetter").inputValue(),importDoc.coverLetter,"Private cover letter text is applied to form");
   assert.equal(await page.locator("#gdm-smtp-password").inputValue(),"","Private JSON import does not touch SMTP credentials");
   assert.equal(await page.locator("#gdm-download-original").getAttribute("href"),"bewerbungen-mail.php?action=original");
   await page.locator("#logoutTop").click();
   await page.waitForSelector("#authShell:not(.hidden)");
   assert.equal(await page.locator("#logoutTop").isVisible(),false,"Logout hidden after signing out");
   assert.equal(await page.locator("#authTitle").innerText(),"Willkommen zurück.","Password-only login restored");
   await page.close();

   const mobile=await browser.newPage({viewport:{width:390,height:844}});
   mobile.on("dialog",d=>d.accept());
   await mobile.goto(address,{waitUntil:"networkidle"});
   await mobile.waitForSelector(".mobile-card[data-edit]");
   assert.equal(await mobile.locator(".mobile-card[data-edit]").count(),3);
   const mobileColors=await mobile.evaluate(() => ({
     green:getComputedStyle(document.querySelector(".mobile-card.row-applied")).backgroundColor,
     red:getComputedStyle(document.querySelector(".mobile-card.row-rejected")).backgroundColor,
     neutral:getComputedStyle(document.querySelector('.mobile-card[data-edit="betrieb-lemgo"]')).backgroundColor,
     wallpaper:getComputedStyle(document.querySelector("#applicationBackdrop"),"::before").backgroundImage,
     overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth
   }));
   assert.equal(mobileColors.green,"rgba(66, 139, 115, 0.23)","Whole contacted mobile card gets muted green");
   assert.equal(mobileColors.red,"rgba(151, 81, 86, 0.23)","Whole rejected mobile card gets muted red");
   assert.match(mobileColors.neutral,/^rgba\(14, 27, 36, 0\.7/,"Not yet applied mobile card is neutral");
   assert.match(mobileColors.wallpaper,/network-ports-768\.webp/,"Mobile uses lightweight teaching wallpaper");
   assert.equal(mobileColors.overflow,false,"No horizontal mobile overflow");
   assert.equal(await mobile.locator("#logoutTop").isVisible(),true,"Logout visible on mobile");
   await mobile.locator(".mobile-card[data-edit='betrieb-lemgo'] [data-gdm-mail]").click();
   await mobile.waitForSelector("#gdm-overlay:not([hidden])");
   assert.match(await mobile.locator("#gdm-address").innerText(),/Kirchweg 8/);
   await mobile.close();
   console.log("Bewerbungskompass e-mail composer: desktop/mobile, PDF preview gate, company address, send & settings OK.");
 } finally {
   await browser.close();await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(err=>{console.error(err);process.exit(1)});
