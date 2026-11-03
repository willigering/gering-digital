'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function element(id){
  const events={};
  const classes=new Set();
  return {id,events,hidden:false,dataset:{},textContent:'',
    setAttribute(name,value){this[name]=value},
    getAttribute(name){return this[name]||'false'},
    addEventListener(type,fn){events[type]=fn},
    querySelectorAll(){return []},
    classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},toggle(c,on){if(on)classes.add(c);else classes.delete(c)}},
    focus(){},scrollIntoView(){}};
}
const empty=element('search-empty'),toggle=element('toggle'),menu=element('menu'),grid=element('module-grid');
const cards=[
  {topic:'netzwerk'},
  {topic:'sicherheit'},
  {topic:'subnet'},
  {topic:'subnet'}
].map(({topic})=>Object.assign(element('card'),{dataset:{topic}}));
const filters=['alle','subnet','wirtschaft'].map(topic=>Object.assign(element('filter-'+topic),{dataset:{filter:topic}}));
const byId={'search-empty':empty,'dtp-mobile-menu':menu,'module-grid':grid};
const document={
  querySelector(q){return q==='.nav-toggle'?toggle:null},
  getElementById(id){return byId[id]??null},
  querySelectorAll(q){return q==='.module-card'?cards:q==='[data-filter]'?filters:[]},
  addEventListener(){}
};
const sandbox={document,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},innerWidth:1440,innerHeight:900,clearTimeout,setTimeout,console};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../dau-to-pro/site.js'),'utf8'),sandbox);
const visible=()=>cards.filter(c=>!c.hidden);
assert.equal(visible().length,4,'Alle Module sind beim Laden sichtbar');
assert.equal(grid.dataset.count,'4','Raster meldet vier Module');
filters[1].events.click();
assert.equal(visible().length,2,'Subnetting-Tab zeigt zwei passende Module');
assert.equal(grid.dataset.count,'2','Raster aktualisiert Anzahl');
assert.equal(filters[1]['aria-pressed'],'true','Aktiver Tab ist barrierefrei ausgezeichnet');
filters[2].events.click();
assert.equal(visible().length,0,'Leeres Thema zeigt keine fremden Module');
assert.equal(empty.hidden,false,'Leerer Themenbereich zeigt Hinweis');
filters[0].events.click();
assert.equal(visible().length,4,'Alle Module setzt den Filter zurück');
assert.equal(empty.hidden,true,'Leermeldung wird entfernt');
assert.equal(filters[0]['aria-pressed'],'true','Alle Module ist aktiv');
const html=fs.readFileSync(require('node:path').join(__dirname,'../dau-to-pro/index.php'),'utf8');
const lib=fs.readFileSync(require('node:path').join(__dirname,'../dau_lib.php'),'utf8');
assert.ok(!html.includes('id="pruefungsfinder"'),'Prüfungsfinder-Abschnitt entfernt');
assert.ok(!html.includes('id="exam-form"'),'Prüfungsfinder-Eingabe entfernt');
assert.ok(!lib.includes("'Prüfungsfinder' =>"),'Prüfungsfinder im Admineditor entfernt');
assert.ok(!lib.includes('#pruefungsfinder'),'Prüfungsfinder in Navigation entfernt');
console.log('Topic tabs and removed finder smoke tests passed');
