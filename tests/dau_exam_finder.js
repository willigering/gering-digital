'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const handlers=new Map();
function element(id){
  const events={};
  return {id,events,value:'',hidden:false,dataset:{},textContent:'',
    setAttribute(){},getAttribute(){return 'false'},
    addEventListener(type,fn){events[type]=fn},
    querySelectorAll(){return []},
    classList:{add(){},remove(){},toggle(){}},
    focus(){},scrollIntoView(){}};
}
const input=element('exam-topics'),form=element('exam-form'),indicator=element('result-indicator');
const reset=element('exam-reset'),empty=element('search-empty');
const toggle=element('toggle'),menu=element('menu');
const cards=[
 {dataset:{topic:'netzwerk',search:'OSI Sprint sieben Schichten OSI-Modell'}},
 {dataset:{topic:'sicherheit',search:'Datenschutz DSGVO Verschlüsselung Hashverfahren'}},
 {dataset:{topic:'subnet',search:'IPv4 Subnetting CIDR'}},
 {dataset:{topic:'subnet',search:'Bits zum bitteren Ende binär hexadezimal'}}
].map(c=>Object.assign(element('card'),c));
const byId={'exam-topics':input,'exam-form':form,'result-indicator':indicator,'exam-reset':reset,
 'search-empty':empty,'dtp-mobile-menu':menu,'module-grid':element('module-grid')};
const filter=element('filter');filter.dataset.filter='alle';
const document={
 querySelector(q){return q==='.nav-toggle'?toggle:null},
 getElementById(id){return byId[id]??null},
 querySelectorAll(q){return q==='.module-card'?cards:q==='[data-filter]'?[filter]:[]},
 addEventListener(){}
};
const sandbox={
 document,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},innerWidth:1440,innerHeight:900,
 clearTimeout,setTimeout,console
};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dau-to-pro/site.js'),'utf8'),sandbox);
const visible=()=>cards.filter(c=>!c.hidden).map(c=>c.dataset.search);
assert.equal(visible().length,4,'Anfangs alle Module sichtbar');
input.value='OSI, Datenschutz'; input.events.input();
assert.equal(visible().length,2,'Mehrere Themen liefern die Vereinigung, nicht einen wörtlichen Treffer');
input.value='IPv4, Binär'; input.events.input();
assert.equal(visible().length,2,'Subnetting und Binär finden beide Lernmodule');
input.value='Nichtvorhanden'; input.events.input();
assert.equal(visible().length,0,'Unbekannte Themen zeigen keine falschen Treffer');
assert.equal(empty.hidden,false,'Leerer Trefferhinweis wird angezeigt');
reset.events.click();
assert.equal(visible().length,4,'Zurücksetzen stellt alle Module wieder her');
input.value='OSI';
let prevented=false;
form.events.submit({preventDefault(){prevented=true}});
assert.equal(prevented,true,'Suchformular navigiert nicht von der Seite weg');
assert.equal(visible().length,1,'Absenden filtert auf das passende Lernmodul');
assert.equal(byId['module-grid'].dataset.count,'1','Ein Suchtreffer erhält eine passende Rasterbreite');
console.log('Exam finder smoke tests passed');

