'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const PDFLib=require('pdf-lib');
const {PDFDocument,PDFName,decodePDFRawStream}=PDFLib;
const fixture=fs.readFileSync('tests/bewerbungen_browser.cjs','utf8').split('async function makeSyntheticOriginal(){')[1].split('\nasync function run(){')[0];
const makeOriginal=new Function('PDFDocument','PDFName','return async function(){'+fixture)(PDFDocument,PDFName);
const window={PDFLib};
vm.runInNewContext(fs.readFileSync('bewerbungen-five-page.js','utf8'),{window,TextDecoder,Blob});
(async()=>{
 const original=await makeOriginal();
 const input={company:'Musterfirma',recipient:'Personal',street:'Neuer Weg 12',postal:'32791',city:'Lage',date:'22.11.2026'};
 const decode=doc=>Buffer.from(decodePDFRawStream(doc.getPage(1).node.lookup(PDFName.of('Contents'))).decode()).toString('ascii');
 for(const company of ['Musterfirma','Müller & Söhne']){
  const blob=await window.GDMFivePage.make(original,{...input,company});
  const doc=await PDFDocument.load(await blob.arrayBuffer());
  assert.equal(doc.getPageCount(),5);
  const stream=decode(doc);
  assert(stream.toLowerCase().includes(company==='Musterfirma'?'004e00650075006500720020005700650067002000310032':'/gdmaddress '));
  const untouched=await PDFDocument.load(original);
  for(const i of [0,2,3,4])assert.equal(String(doc.getPage(i).node.get(PDFName.of('Contents'))),String(untouched.getPage(i).node.get(PDFName.of('Contents'))));
 }
 await assert.rejects(()=>window.GDMFivePage.make(original,{...input,street:''}),/unvollständig/);
 console.log('PDF: edited address, missing-glyph fallback, five pages and validation OK');
})().catch(e=>{console.error(e);process.exit(1)});
