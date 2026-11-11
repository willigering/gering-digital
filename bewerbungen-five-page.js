/* Update the original application using the Calibri glyphs already embedded in it. */
(function(){
"use strict";

const SALUTATION="Sehr geehrte Damen und Herren,";
const ADDRESS_ROWS=[224.320007,243.679993,263.040009,282.399994];
const DATE_ROW=378.880005;
const SALUTATION_ROW=475.519989;
const LEFT=94.559998;
const RIGHT=740.266667;
const FONT_SIZE=14.720600;
const LAYOUT_ERROR="Diese PDF entspricht nicht der fünfseitigen Originalbewerbung. Bitte die vollständige Original-PDF hochladen.";

async function make(originalBytes,{company,recipient,street,postal,city,date}){
  if(!window.PDFLib)throw new Error("Der lokale PDF-Editor konnte nicht geladen werden. Bitte die Seite neu laden.");
  const {PDFDocument,PDFName,PDFRawStream,PDFRef,PDFArray,decodePDFRawStream}=window.PDFLib;
  const key=PDFName.of;
  const doc=await PDFDocument.load(originalBytes,{updateMetadata:false});
  if(doc.getPageCount()!==5)throw new Error(LAYOUT_ERROR);
  const pages=doc.getPages();
  const page=pages[1];
  const contentRefs=target=>{
    const content=target.node.get(key("Contents"));
    return content instanceof PDFArray?content.asArray():[content];
  };
  const [ref,...additionalStreams]=contentRefs(page);
  if(!(ref instanceof PDFRef)||additionalStreams.length||
      pages.some((other,i)=>i!==1&&contentRefs(other).includes(ref))){
    throw new Error(LAYOUT_ERROR);
  }
  const decode=stream=>new TextDecoder("iso-8859-1").decode(decodePDFRawStream(stream).decode());
  const stream=doc.context.lookup(ref);
  if(!(stream instanceof PDFRawStream))throw new Error(LAYOUT_ERROR);
  const source=decode(stream);
  if(!/^[\x09\x0a\x0d\x20-\x7e]*$/.test(source))throw new Error(LAYOUT_ERROR);
  const font=page.node.Resources()?.lookup(key("Font"))?.lookup(key("F1"));
  const unicode=font?.lookup(key("ToUnicode"));
  const widths=font?.lookup(key("DescendantFonts"))?.lookup(0)?.lookup(key("W"));
  if(!(unicode instanceof PDFRawStream)||!(widths instanceof PDFArray)||String(font.get(key("BaseFont")))!=="/CIDFont+F1"){
    throw new Error(LAYOUT_ERROR);
  }
  const glyphs=new Map();
  for(const block of decode(unicode).matchAll(/beginbfchar([\s\S]*?)endbfchar/g)){
    for(const [,cid,value] of block[1].matchAll(/<([0-9a-f]{4})>\s*<([0-9a-f]{4})>/gi)){
      glyphs.set(String.fromCharCode(parseInt(value,16)),cid);
    }
  }
  const advances=new Map();
  for(let i=0;i<widths.size();i++){
    const first=widths.lookup(i).asNumber();
    const range=widths.lookup(++i);
    if(range instanceof PDFArray){
      for(let j=0;j<range.size();j++)advances.set(first+j,range.lookup(j).asNumber());
    }else{
      const advance=widths.lookup(++i).asNumber();
      for(let cid=first;cid<=range.asNumber();cid++)advances.set(cid,advance);
    }
  }

  const clean=value=>String(value??"").normalize("NFC").replace(/\s+/g," ").trim();
  const address=[clean(company),clean(recipient),clean(street),[clean(postal),clean(city)].join(" ")].filter(Boolean);
  if(![company,street,postal,city].every(value=>clean(value)))throw new Error("Die Firmenanschrift ist unvollständig.");
  if(!/^\d{2}\.\d{2}\.\d{4}$/.test(date))throw new Error("Das Datum muss im Format TT.MM.JJJJ vorliegen.");
  const rows=new Map(ADDRESS_ROWS.map((y,i)=>[y,address[i]||""]));
  rows.set(DATE_ROW,date);
  rows.set(SALUTATION_ROW,SALUTATION);

  const replaced=new Set();
  const pattern=/(\/F1 14\.720600 Tf\s+1 0 0\.000000 -1 )([\d.]+) ([\d.]+) Tm\s*\[[^\]]*\] TJ/g;
  const updated=source.replace(pattern,(match,prefix,x,y)=>{
    const baseline=Number(y);
    if(!rows.has(baseline))return match;
    if(replaced.has(baseline)||(baseline!==DATE_ROW&&Number(x)!==LEFT))throw new Error(LAYOUT_ERROR);
    replaced.add(baseline);
    const text=rows.get(baseline);
    let hex="",width=0;
    for(const char of text){
      const cid=glyphs.get(char);
      if(!cid)throw new Error("Das Zeichen „"+char+"“ fehlt in der eingebetteten Originalschrift. Die Vorschau wurde nicht erstellt.");
      hex+=cid;
      width+=(advances.get(parseInt(cid,16))??1000)*FONT_SIZE/1000;
    }
    if(width>RIGHT-LEFT)throw new Error("Eine Zeile der Firmenanschrift ist zu lang für das Originalanschreiben.");
    const start=baseline===DATE_ROW?(RIGHT-width).toFixed(6):x;
    return prefix+start+" "+y+" Tm\n<"+hex+"> Tj";
  });
  if(replaced.size!==rows.size)throw new Error(LAYOUT_ERROR);

  // Replace the stream itself so the former address is absent from the export.
  doc.context.assign(ref,doc.context.flateStream(updated));
  const output=await doc.save({useObjectStreams:false,updateFieldAppearances:false});
  return new Blob([output],{type:"application/pdf"});
}
window.GDMFivePage={make};
})();
