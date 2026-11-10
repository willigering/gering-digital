/*
 * Private five-page application composer, pdf-lib 1.17.1.
 * Only page two of the user's pre-sanitized template is filled.
 * The original cover, CV, work references and handwritten signature are untouched.
 * Never send document bytes to a third-party service.
 */
(function(){
"use strict";
const TEMPLATE_MARKER="GD_Bewerbung_Seite2_Leer_V1";
const PERIOD="vom 09.08.2027 - 24.03.2028";
const PAGE_COUNT=5;
function clean(text){
  return String(text??"").replace(/\r/g,"").replace(/[\u00a0\u202f]/g," ")
    .replace(/[\u2010-\u2015]/g,"-").replace(/\u2026/g,"...")
    .replace(/[^\x09\x0a\x20-\u00ff\u0152\u0153\u0160\u0161\u0178\u2018-\u201e\u2020\u2021\u20ac]/g,"");
}
function wrapped(text,font,size,maxWidth){
  const words=clean(text).replace(/[ \t]+/g," ").trim().split(" ");
  const rows=[];let line="";
  for(const word of words){
    if(!word)continue;
    const next=line?line+" "+word:word;
    if(font.widthOfTextAtSize(next,size)<=maxWidth){line=next;continue;}
    if(line){rows.push(line);line="";}
    if(font.widthOfTextAtSize(word,size)<=maxWidth){line=word;continue;}
    // Break unusually long unspaced words without overflowing the A4 page.
    for(const character of [...word]){
      if(line&&font.widthOfTextAtSize(line+character,size)>maxWidth){rows.push(line);line="";}
      line+=character;
    }
  }
  if(line)rows.push(line);
  return rows;
}
function layout(body,font,size,availableHeight,width){
  const lineHeight=14.48*(size/10.5);
  const lines=[];
  for(const paragraph of clean(body).split(/\n\s*\n/)){
    if(!paragraph.trim())continue;
    if(lines.length)lines.push("");
    lines.push(...wrapped(paragraph.replace(/\n/g," "),font,size,width));
  }
  if(lines.length*lineHeight>availableHeight)return null;
  return {lines,lineHeight};
}
async function make(templateBytes,{company,recipient,street,postal,city,date,subject,salutation,letter}){
  if(!window.PDFLib)throw new Error("Der lokale PDF-Editor konnte nicht geladen werden. Bitte die Seite neu laden.");
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const doc=await PDFDocument.load(templateBytes,{ignoreEncryption:false});
  if(doc.getPageCount()!==PAGE_COUNT)throw new Error("Die Vorlage muss genau fünf Seiten enthalten.");
  if(!String(doc.getKeywords()||"").includes(TEMPLATE_MARKER)){
    throw new Error("Bitte die vorbereitete Datei „Bewerbungsmappe_Editierbare_Vorlage.pdf“ hochladen. Die Original-PDF enthält noch das alte Anschreiben.");
  }
  const p=doc.getPage(1);
  const width=p.getWidth(),height=p.getHeight();
  if(Math.abs(width-595.32)>3||Math.abs(height-841.92)>3)throw new Error("Die Briefseite muss A4 groß sein.");
  const font=await doc.embedFont(StandardFonts.Helvetica);
  const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const ink=rgb(.28,.28,.28);
  const x=70.9,maxWidth=472;
  const fitLine=(txt,startSize,f,max=472,min=8.7)=>{
    let size=startSize;
    while(size>min&&f.widthOfTextAtSize(txt,size)>max)size-=.15;
    if(f.widthOfTextAtSize(txt,size)>max)throw new Error("Ein Textfeld ist für die Briefseite zu lang.");
    return size;
  };
  const address=[
    clean(company).trim(),clean(recipient).trim(),clean(street).trim(),
    clean(postal+" "+city).trim()
  ].filter(Boolean);
  if(!address[0]||!address.some(v=>/\d/.test(v)))throw new Error("Die Firmenanschrift ist unvollständig.");
  if(address.length>4)throw new Error("Die Firmenanschrift ist zu lang.");
  address.forEach((line,i)=>p.drawText(line,{x,y:height-(168+i*14.48),size:fitLine(line,11,font,maxWidth),font,color:ink}));
  const dateText=clean(date);
  const dateSize=fitLine(dateText,11,font,160);
  p.drawText(dateText,{x:554-font.widthOfTextAtSize(dateText,dateSize),y:height-283.5,size:dateSize,font,color:ink});
  // The e-mail subject may already include the period. On the original PDF it
  // has its own fixed second line: avoid duplicating the period in the first.
  const title=clean(subject).trim()
    .replace(/\s+vom\s+09\.08\.2027\s*(?:-|bis)\s*24\.03\.2028\.?$/i,"").trim();
  if(!title)throw new Error("Ein Betreff fehlt.");
  const titleSize=fitLine(title,10.65,bold,maxWidth,8.6);
  p.drawText(title,{x,y:height-312,size:titleSize,font:bold,color:ink});
  p.drawText(PERIOD,{x,y:height-326,size:10.5,font:bold,color:ink});
  const greeting=clean(salutation).trim();
  if(!greeting)throw new Error("Die Anrede fehlt.");
  p.drawText(greeting,{x,y:height-356,size:fitLine(greeting,11,font,maxWidth),font,color:ink});
  const content=clean(letter).trim();
  if(!content)throw new Error("Der Anschreibentext fehlt.");
  let block=null,bodySize=10.5;
  for(const size of [10.5,10.3,10.1,9.9,9.7,9.5,9.3,9.1,9]){
    const candidate=layout(content,font,size,384,maxWidth);
    if(candidate){block=candidate;bodySize=size;break}
  }
  if(!block)throw new Error("Der Text passt nicht auf Seite 2. Bitte das Anschreiben etwas kürzen; Deckblatt und Lebenslauf bleiben unverändert.");
  const top=height-385;
  block.lines.forEach((line,i)=>{
    if(line)p.drawText(line,{x,y:top-i*block.lineHeight,size:bodySize,font,color:ink});
  });
  doc.setTitle("Bewerbung um ein Praktikum – "+clean(company).trim());
  doc.setSubject("Praktikum Fachinformatiker Systemintegration 09.08.2027–24.03.2028");
  const output=await doc.save({useObjectStreams:false,updateFieldAppearances:false});
  return new Blob([output],{type:"application/pdf"});
}
window.GDMFivePage={make};
})();