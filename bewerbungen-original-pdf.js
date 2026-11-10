/* Bewerbungskompass: insert a company-addressed letter as page 2 of a private five-page PDF.
 * Other four pages are copied without altering their visual contents.
 * The original PDF stays within the authenticated same-origin browser session.
 */
(function(){
"use strict";
let loading=null;
async function library(){
  if(window.PDFLib)return window.PDFLib;
  if(!loading)loading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    script.crossOrigin="anonymous";
    script.onload=()=>window.PDFLib?resolve(window.PDFLib):reject(new Error("PDF-Bibliothek konnte nicht geladen werden."));
    script.onerror=()=>reject(new Error("Die PDF-Bibliothek ist nicht erreichbar. Prüfe die Internetverbindung."));
    document.head.appendChild(script);
  });
  return loading;
}
function sanitize(text){
  return String(text||"").replace(/[\u00ad\u200b\u200e\u200f]/g,"")
    .replace(/[‐‑‒−]/g,"-").replace(/\u202f/g," ")
    .replace(/\u2028|\u2029/g,"\n");
}
function wrap(text,font,size,maxWidth){
  const result=[];
  for(const paragraph of sanitize(text).replace(/\r\n?/g,"\n").split("\n")){
    if(!paragraph.trim()){result.push("");continue}
    let line="";
    for(const word of paragraph.split(/\s+/).filter(Boolean)){
      const proposed=line?line+" "+word:word;
      if(font.widthOfTextAtSize(proposed,size)<=maxWidth){line=proposed;continue}
      if(line){result.push(line);line=word}
      if(font.widthOfTextAtSize(line,size)>maxWidth)throw new Error("Ein Wort im Anschreiben ist zu lang für die Druckseite.");
    }
    result.push(line);
  }
  return result;
}
function writeLine(page,font,text,x,y,size,color){
  page.drawText(sanitize(text),{x,y,size,font,color});
}
async function create(bytes,details){
  const lib=await library();
  const original=await lib.PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});
  if(original.getPageCount()!==5)throw new Error("Die archivierte Originalmappe muss genau fünf Seiten enthalten (Deckblatt, Anschreiben, Lebenslauf, Zeugnis 1 und 2).");
  const old=original.getPage(1), w=old.getWidth(),h=old.getHeight();
  if(w<580||w>610||h<830||h>855)throw new Error("Die Originalmappe hat auf Seite 2 kein A4-Format.");
  original.removePage(1);
  const page=original.insertPage(1,[w,h]);
  const regular=await original.embedFont(lib.StandardFonts.Helvetica);
  const bold=await original.embedFont(lib.StandardFonts.HelveticaBold);
  const signature=await original.embedFont(lib.StandardFonts.HelveticaOblique);
  const ink=lib.rgb(0.32,0.34,0.36);
  const dark=lib.rgb(0.29,0.30,0.32);
  page.drawRectangle({x:0,y:0,width:50.2,height:h, color:lib.rgb(.92549,.92549,.92549)});
  page.drawRectangle({x:0,y:h-57,width:w,height:42.48,color:lib.rgb(.32549,.43529,.47451)});
  const sender=details.sender||{};
  const company=details.company||{};
  const right=(s,y,size=10.5)=>{
    s=sanitize(s);writeLine(page,regular,s,w-40-regular.widthOfTextAtSize(s,size),y,size,ink);
  };
  const name=sanitize(sender.name||"");
  const address=sanitize(sender.street||"");
  const zip=sanitize((sender.postal||"")+" "+(sender.city||""));
  const phone=sender.phone?"Mobil: "+sender.phone:"";
  const email=sender.email?"E-Mail: "+sender.email:"";
  if(!name||!address||!sender.postal||!sender.city)throw new Error("Bitte zuerst deine Absenderanschrift in den E-Mail-Einstellungen vervollständigen.");
  [name,address,zip,phone,email].filter(Boolean).forEach((line,i)=>right(line,h-(97+i*14.5)));
  const recipient=[
    company.company,
    company.recipient||company.contact||"",
    company.street,
    [company.postal,company.postCity||company.city].filter(Boolean).join(" ")
  ].filter(Boolean);
  if(!company.company||!company.street||!company.postal||!(company.postCity||company.city))
    throw new Error("Die Firmenanschrift ist unvollständig. Bitte den Betrieb zuerst bearbeiten.");
  recipient.forEach((line,i)=>writeLine(page,regular,line,70.9,h-(170+i*14.5),10.5,ink));
  const date=sanitize(details.date||"");
  right(date,h-285);
  const subject=sanitize(details.subject||"").trim();
  const greeting=sanitize(details.salutation||"").trim();
  const letter=sanitize(details.letter||"").trim();
  if(!subject||!greeting||!letter)throw new Error("Betreff, Anrede und Anschreiben dürfen nicht leer sein.");
  const startX=70.9,width=w-111;
  let y=h-315;
  // Allow a two-line subject in the same style as the original document.
  for(const line of wrap(subject,bold,10.5,width)){
    if(!line)continue;
    writeLine(page,bold,line,startX,y,10.5,dark);y-=14.5;
    if(y<h-360)throw new Error("Der Betreff ist zu lang für das Original-Layout.");
  }
  y-=15;
  for(const line of wrap(greeting,regular,10.5,width)){
    if(!line)continue;
    writeLine(page,regular,line,startX,y,10.5,dark);y-=14.5;
  }
  y-=14.5;
  // Keep original-like typography; shrink gently only if essential.
  let size=10.5,leading=14.35,wrapped=[];
  const lastY=82;
  for(;size>=9.2;size-=0.2){
    leading=size*1.37;
    wrapped=wrap(letter,regular,size,width);
    const expected=y-wrapped.length*leading-(wrapped.filter(x=>x==="").length*5)-37;
    if(expected>=lastY)break;
  }
  if(size<9.2)throw new Error("Dieses Anschreiben passt nicht auf die zweite Seite der Originalmappe. Bitte Text etwas kürzen.");
  for(const line of wrapped){
    if(!line){y-=5;continue}
    writeLine(page,regular,line,startX,y,size,dark);
    y-=leading;
  }
  y-=16;
  writeLine(page,regular,"Mit freundlichen Grüßen",startX,y,10.5,dark);
  y-=25;
  writeLine(page,signature,name,startX,y,11,dark);
  if(y<28)throw new Error("Anschreiben passt nicht vollständig auf Seite 2.");
  const output=await original.save({useObjectStreams:false});
  if(output.length>12*1024*1024)throw new Error("Die fertige Bewerbungsmappe überschreitet 12 MB.");
  return new Blob([output],{type:"application/pdf"});
}
window.GDMOriginalPDF={create,library};
})();