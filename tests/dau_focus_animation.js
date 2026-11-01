'use strict';
// Hover-Fokus der Lernmodule: Zeiten im CSS und Zustandslogik in site.js (ohne Browser).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const css=fs.readFileSync(path.join(__dirname,'../dau-to-pro/style.css'),'utf8');

// --- CSS-Zeiten ---
const rule=(selector)=>{const i=css.indexOf(selector+'{');assert.ok(i>=0,selector+' fehlt');return css.slice(i,css.indexOf('}',i));};
const seconds=(block,prop)=>{const m=block.match(new RegExp(prop+'\\s+([\\d.]+)s\\s+cubic-bezier\\(([^)]+)\\)'));assert.ok(m,prop+' ohne Dauer/Kurve');return [parseFloat(m[1]),m[2].split(',').map(Number)];};
const [inDur,inCurve]=seconds(rule('.dtp-focus-overlay.is-active'),'opacity');
const [outDur,outCurve]=seconds(rule('.dtp-focus-overlay'),'opacity');
assert.ok(inDur>=2.5&&inDur<=3,'Einblenden 2,5–3 s, ist '+inDur);
assert.ok(outDur>=0.6&&outDur<=0.8,'Ausblenden 0,6–0,8 s, ist '+outDur);
// Kubische Bézierkurve auswerten: anfangs kaum wahrnehmbar, keine abrupte Beschleunigung.
const bezier=([x1,y1,x2,y2])=>t=>{
  const f=(a,b,s)=>3*a*s*(1-s)**2+3*b*s*s*(1-s)+s**3;
  let lo=0,hi=1;for(let i=0;i<60;i++){const m=(lo+hi)/2;f(x1,x2,m)<t?lo=m:hi=m;}return f(y1,y2,(lo+hi)/2);
};
const ease=bezier(inCurve);
assert.ok(ease(0.1)<0.04,'Nach 10 % der Zeit noch kaum sichtbar ('+ease(0.1).toFixed(3)+')');
let maxStep=0;for(let i=1;i<=100;i++)maxStep=Math.max(maxStep,ease(i/100)-ease((i-1)/100));
assert.ok(maxStep<0.025,'Gleichmäßiger Anstieg ohne Sprung (max. '+maxStep.toFixed(3)+' pro 1 %)');
const out=bezier(outCurve);
let outStep=0;for(let i=1;i<=100;i++)outStep=Math.max(outStep,out(i/100)-out((i-1)/100));
assert.ok(outStep<0.03,'Ausblenden ohne sichtbare Sprünge');
assert.ok(/visibility 0s linear \.7s/.test(rule('.dtp-focus-overlay')),'Sichtbarkeit endet erst nach dem Ausblenden');
assert.ok(/@media\(hover:none\),\(pointer:coarse\),\(prefers-reduced-motion:reduce\)\{\.dtp-focus-overlay\{display:none!important\}\}/.test(css),'Kein Effekt auf Touchgeräten/bei reduzierter Bewegung');
assert.ok(/backdrop-filter:blur\(5px\) brightness\(\.70\)/.test(css),'Umgebung wird abgedunkelt und weichgezeichnet');

// --- Zustandslogik mit simuliertem DOM und Uhr ---
let now=0;const timers=[];
const setTimeout_=(fn,ms)=>{const t={fn,at:now+ms,id:timers.length+1};timers.push(t);return t.id;};
const clearTimeout_=id=>{const t=timers.find(x=>x.id===id);if(t)t.fn=null;};
const advance=ms=>{const end=now+ms;for(;;){const next=timers.filter(t=>t.fn&&t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!next)break;now=next.at;const fn=next.fn;next.fn=null;fn();}now=end;};
const classList=()=>{const s=new Set();return {add:c=>s.add(c),remove:c=>s.delete(c),contains:c=>s.has(c),toggle:(c,f)=>{(f??!s.has(c))?s.add(c):s.delete(c)}};};
let overlay=null;
const card=(left)=>{const listeners={};return {listeners,classList:classList(),addEventListener:(t,f)=>listeners[t]=f,getBoundingClientRect:()=>({top:100,bottom:400,left,right:left+360})};};
const cards=[card(40),card(460)];
const document={
  body:{append:el=>{overlay=el}},
  createElement:()=>({classList:classList(),style:{vars:{},setProperty(k,v){this.vars[k]=v}},setAttribute(){},set className(v){this.classList.add(v)},set innerHTML(v){}}),
  querySelectorAll:q=>q==='.module-card'?cards:[],
  querySelector:q=>q==='.nav-toggle'?{setAttribute(){},getAttribute(){return 'false'},addEventListener(){}}:null,
  getElementById:id=>id==='dtp-mobile-menu'?{querySelectorAll:()=>[],hidden:true}:null,
  addEventListener(){},hidden:false,readyState:'complete'
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dau-to-pro/site.js'),'utf8'),{
  document,matchMedia:q=>({matches:q.includes('hover:hover'),addEventListener(){}}),
  addEventListener(){},innerWidth:1366,innerHeight:900,performance:{now:()=>now},
  setTimeout:setTimeout_,clearTimeout:clearTimeout_,requestAnimationFrame:()=>0,console
});
assert.ok(overlay,'Overlay wird bei Maus-Hover erzeugt');
const mouse={pointerType:'mouse'};
cards[0].listeners.pointerenter(mouse);
assert.ok(cards[0].classList.contains('is-focus-target'),'Ausgewähltes Modul bleibt scharf (Aussparung)');
assert.equal(overlay.style.vars['--focus-x'],'31px','Aussparung um die Karte berechnet');
advance(200);assert.ok(overlay.classList.contains('is-active'),'Abdunkeln startet');
// Schneller Wechsel: Fokus bleibt aktiv und gleitet zur neuen Karte.
cards[0].listeners.pointerleave(mouse);advance(30);cards[1].listeners.pointerenter(mouse);
assert.ok(overlay.classList.contains('is-active'),'Beim Wechsel kein Neustart des Abdunkelns');
assert.ok(overlay.classList.contains('is-moving'),'Aussparung gleitet zur neuen Karte');
assert.ok(!cards[0].classList.contains('is-focus-target')&&cards[1].classList.contains('is-focus-target'),'Fokus wechselt sofort');
assert.equal(overlay.style.vars['--focus-x'],'451px');
advance(500);assert.ok(!overlay.classList.contains('is-moving'),'Gleiten endet');
// Verlassen: Ausblenden, Wiedereintritt während des Ausblendens setzt fort statt neu zu starten.
cards[1].listeners.pointerleave(mouse);advance(100);
assert.ok(!overlay.classList.contains('is-active'),'Ausblenden beginnt nach kurzer Toleranz');
advance(200);cards[0].listeners.pointerenter(mouse);
assert.ok(overlay.classList.contains('is-active')&&overlay.classList.contains('is-moving'),'Wiedereintritt während des Ausblendens: sofort zurück, ohne Sprung');
// Touch-Ereignisse lösen nichts aus.
cards[0].listeners.pointerleave(mouse);advance(2000);
cards[1].listeners.pointerenter({pointerType:'touch'});advance(1000);
assert.ok(!overlay.classList.contains('is-active'),'Touch löst keinen Fokus aus');
console.log('Hover focus animation tests passed');
