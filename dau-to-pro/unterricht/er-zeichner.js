
(()=>{'use strict';
const root=document.getElementById('er-workshop');
if(!root)return;
const ns='http://www.w3.org/2000/svg', svg=document.getElementById('er-draw-canvas');
const cases=[
{id:'auftrag',title:'01 · Kunde und Auftrag',story:'Ein Kunde kann beliebig viele Aufträge erteilen. Jeder Auftrag stammt von genau einem Kunden. Zu Kunden gehören KundenNr und Kundenname; zu Aufträgen gehören AuftragsNr und Bestelldatum. Kennzeichne die eindeutigen Nummern als Schlüssel.',
terms:[
{id:'kunde',label:'Kunde',kind:'entity'},
{id:'auftrag',label:'Auftrag',kind:'entity'},
{id:'erteilt',label:'erteilt',kind:'relationship'},
{id:'kundennr',label:'KundenNr',kind:'attribute',key:true},
{id:'kundenname',label:'Kundenname',kind:'attribute'},
{id:'auftragsnr',label:'AuftragsNr',kind:'attribute',key:true},
{id:'bestelldatum',label:'Bestelldatum',kind:'attribute'}],
edges:[['kunde','erteilt','1'],['auftrag','erteilt','n'],['kundennr','kunde',''],['kundenname','kunde',''],['auftragsnr','auftrag',''],['bestelldatum','auftrag','']]},
{id:'projekt',title:'02 · Mitarbeiter und Projekte',story:'Ein Mitarbeiter kann an mehreren Projekten arbeiten. Jedes Projekt kann mehrere Mitarbeiter haben. Ein Mitarbeiter besitzt eine eindeutige PersonalNr und eine Stellenbezeichnung; ein Projekt eine eindeutige ProjektNr und einen Projektnamen. Die Beziehung heißt „arbeitet an“.',
terms:[
{id:'mitarbeiter',label:'Mitarbeiter',kind:'entity'},
{id:'projekt',label:'Projekt',kind:'entity'},
{id:'arbeitet',label:'arbeitet an',kind:'relationship'},
{id:'personalnr',label:'PersonalNr',kind:'attribute',key:true},
{id:'stelle',label:'Stellenbezeichnung',kind:'attribute'},
{id:'projektnr',label:'ProjektNr',kind:'attribute',key:true},
{id:'projektname',label:'Projektname',kind:'attribute'}],
edges:[['mitarbeiter','arbeitet','m'],['projekt','arbeitet','n'],['personalnr','mitarbeiter',''],['stelle','mitarbeiter',''],['projektnr','projekt',''],['projektname','projekt']]},
{id:'zoo',title:'03 · Der Zoo',story:'Jedes Tier gehört zu genau einer Tiergattung; eine Tiergattung kann viele Tiere haben. Jeder Tierpfleger versorgt mehrere Tiere; für jedes Tier ist genau ein Tierpfleger verantwortlich. Alle drei Entitätstypen haben eine eindeutige Nummer und jeweils eine beschreibende Eigenschaft.',
terms:[
{id:'tiergattung',label:'Tiergattung',kind:'entity'},
{id:'tier',label:'Tier',kind:'entity'},
{id:'pfleger',label:'Tierpfleger',kind:'entity'},
{id:'gehoert',label:'gehört zu',kind:'relationship'},
{id:'versorgt',label:'versorgt',kind:'relationship'},
{id:'gattungnr',label:'GattungsNr',kind:'attribute',key:true},
{id:'bezeichnung',label:'Bezeichnung',kind:'attribute'},
{id:'tiernr',label:'TierNr',kind:'attribute',key:true},
{id:'tierart',label:'Rufname',kind:'attribute'},
{id:'pflegernr',label:'PflegerNr',kind:'attribute',key:true},
{id:'bereich',label:'Dienstbereich',kind:'attribute'}],
edges:[['tiergattung','gehoert','1'],['tier','gehoert','n'],['pfleger','versorgt','1'],['tier','versorgt','n'],['gattungnr','tiergattung',''],['bezeichnung','tiergattung',''],['tiernr','tier',''],['tierart','tier',''],['pflegernr','pfleger',''],['bereich','pfleger','']]}];
const byId=id=>document.getElementById(id);
const exercise=byId('er-exercise'),termList=byId('er-word-bank'),shapeBtns=[...root.querySelectorAll('[data-er-shape]')];
const shapeSelect=byId('er-node-shape'),underline=byId('er-underline'),inspector=byId('er-inspector');
const cardSelect=byId('er-cardinality'),out=byId('er-editor-status'),feedback=byId('er-result');
let current=cases[0],nodes=[],edges=[],term=null,kind='entity',selected=null,linkStart=null,connecting=false,history=[],drag=null,validated=false;
const storageKey=id=>'dtp-er-editor-v2:'+id;
function send(msg){out.textContent=msg}
function lookup(id){return current.terms.find(t=>t.id===id)}
function node(id){return nodes.find(n=>n.id===id)}
function shapeWidth(n){return n.kind==='attribute'?178:188}
function shapeHeight(n){return n.kind==='attribute'?66:78}
function safeState(){return {nodes:nodes.map(n=>({...n})),edges:edges.map(e=>({...e}))}}
function save(){validated=false;feedback.hidden=true;byId('er-show-solution').disabled=true;byId('er-solution').hidden=true;try{localStorage.setItem(storageKey(current.id),JSON.stringify(safeState()))}catch(e){}}
function snapshot(){history.push(safeState());if(history.length>40)history.shift();byId('er-undo').disabled=false}
function readState(){nodes=[];edges=[];try{const raw=JSON.parse(localStorage.getItem(storageKey(current.id))||'null');if(!raw||!Array.isArray(raw.nodes)||!Array.isArray(raw.edges))return;for(const n of raw.nodes){if(!lookup(n.id)||nodes.some(other=>other.id===n.id)||!['entity','relationship','attribute'].includes(n.kind)||!Number.isFinite(n.x)||!Number.isFinite(n.y))continue;nodes.push({id:n.id,kind:n.kind,key:!!n.key,x:Math.max(102,Math.min(798,n.x)),y:Math.max(55,Math.min(474,n.y))})}for(const e of raw.edges){if(!node(e.a)||!node(e.b)||e.a===e.b||edges.some(old=>sameEdge(old,e))||!['','1','n','m'].includes(e.card))continue;edges.push({a:e.a,b:e.b,card:e.card})}}catch(e){}}
function sameEdge(a,b){return (a.a===b.a&&a.b===b.b)||(a.a===b.b&&a.b===b.a)}
function canonical(a,b){return [a,b].sort().join('|')}
function s(tag,attrs={},label){const el=document.createElementNS(ns,tag);for(const [key,val]of Object.entries(attrs))el.setAttribute(key,String(val));if(label!==undefined)el.textContent=label;return el}
function point(ev){const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const m=svg.getScreenCTM();if(!m)return{x:450,y:265};return pt.matrixTransform(m.inverse())}
function clear(el){while(el.firstChild)el.removeChild(el.firstChild)}
function renderTerms(){clear(termList);for(const word of current.terms){const button=document.createElement('button');button.type='button';button.className='er-term';button.textContent=word.label;button.disabled=!!node(word.id);button.setAttribute('aria-pressed',String(term===word.id));button.addEventListener('click',()=>{term=word.id;selected=null;linkStart=null;connecting=false;render();send('Wort „'+word.label+'“ ausgewählt. Wähle eine Form und tippe auf die Zeichenfläche oder „Einsetzen“.')});termList.appendChild(button)}}
function setShape(v){kind=v;shapeBtns.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.erShape===kind)))}
function inspect(){const n=node(selected);inspector.hidden=!n;if(!n)return;byId('er-selected-term').textContent=lookup(n.id).label;shapeSelect.value=n.kind;underline.checked=!!n.key;underline.disabled=n.kind!=='attribute';byId('er-delete').disabled=false}
function render(){renderTerms();inspect();byId('er-connect').setAttribute('aria-pressed',String(connecting));byId('er-connect').textContent=connecting?(linkStart?'Ziel auswählen …':'Verbinden: erstes Element wählen'):'Verbinden';byId('er-undo').disabled=history.length===0;byId('er-count').textContent=nodes.length+' / '+current.terms.length+' Begriffe eingesetzt · '+edges.length+' Verbindungen';const lines=byId('er-editor-lines'),dots=byId('er-editor-nodes');clear(lines);clear(dots);
for(const e of edges){const a=node(e.a),b=node(e.b);if(!a||!b)continue;const active=selected===canonical(a.id,b.id);const group=s('g',{'data-er-edge':canonical(a.id,b.id),tabindex:'0',role:'button','aria-label':'Verbindung '+lookup(a.id).label+' zu '+lookup(b.id).label+(e.card?' mit Kardinalität '+e.card:'')});
const line=s('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'er-link'+(active?' is-active':'')});const hit=s('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':20});group.append(line,hit);if(e.card){const entity=lookup(a.id)?.kind==='entity'?a:b;const other=entity===a?b:a;const fraction=.23;const label=s('text',{x:entity.x+(other.x-entity.x)*fraction,y:entity.y+(other.y-entity.y)*fraction-9,'text-anchor':'middle',class:'er-link-label'},e.card);group.appendChild(label)}
group.addEventListener('click',ev=>{ev.stopPropagation();selected=canonical(a.id,b.id);term=null;linkStart=null;connecting=false;render();send('Verbindung markiert: Kardinalität im Feld unten ändern oder Verbindung löschen.')} );
group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();group.dispatchEvent(new MouseEvent('click'))}});lines.appendChild(group)}
for(const n of nodes){const w=shapeWidth(n),h=shapeHeight(n),termObj=lookup(n.id);if(!termObj)continue;const group=s('g',{'data-er-node':n.id,tabindex:'0',role:'button','aria-label':termObj.label+', '+(n.kind==='entity'?'Rechteck':n.kind==='relationship'?'Raute':'Oval')+(n.key?', unterstrichen':''),class:'er-node'+(selected===n.id||linkStart===n.id?' is-selected':'')});let geom;
if(n.kind==='entity')geom=s('rect',{x:n.x-w/2,y:n.y-h/2,width:w,height:h,rx:6,class:'er-geometry'});
else if(n.kind==='relationship')geom=s('polygon',{points:[n.x+103+','+n.y,n.x+','+(n.y+45),n.x-103+','+n.y,n.x+','+(n.y-45)].join(' '),class:'er-geometry'});
else geom=s('ellipse',{cx:n.x,cy:n.y,rx:w/2,ry:h/2,class:'er-geometry'});
const fontSize=termObj.label.length>16?13:termObj.label.length>12?14:16;
const label=s('text',{x:n.x,y:n.y+5,'text-anchor':'middle','font-size':fontSize,class:'er-text'+(n.key?' is-underlined':'')},termObj.label);if(fontSize<16)label.style.fontSize=fontSize+'px';group.append(geom,label);group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choose(n.id)}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();snapshot();n.x+=ev.key==='ArrowRight'?10:ev.key==='ArrowLeft'?-10:0;n.y+=ev.key==='ArrowDown'?10:ev.key==='ArrowUp'?-10:0;n.x=Math.max(102,Math.min(798,n.x));n.y=Math.max(55,Math.min(474,n.y));save();render()}});dots.appendChild(group)}
if(!nodes.length){const hint=s('text',{x:450,y:240,class:'er-placeholder'},'Noch leer: Wort + Form wählen');const sub=s('text',{x:450,y:273,class:'er-placeholder','font-size':14},'Dann in die Fläche klicken.');sub.style.fontSize='14px';dots.append(hint,sub)}
const edge=edges.find(e=>canonical(e.a,e.b)===selected);byId('er-edge-inspector').hidden=!edge;if(edge){byId('er-edge-label').textContent=lookup(edge.a).label+' ↔ '+lookup(edge.b).label;cardSelect.value=edge.card}
}
function choose(id){if(connecting){if(!linkStart){linkStart=id;render();send('Start ausgewählt: '+lookup(id).label+'. Jetzt das zweite Element anklicken.');return}if(linkStart===id){linkStart=null;render();send('Start aufgehoben.');return}const a=linkStart,b=id;linkStart=null;if(edges.some(e=>sameEdge(e,{a,b}))){render();send('Diese Verbindung gibt es bereits.');return}snapshot();let card='';const aa=node(a),bb=node(b);if((aa?.kind==='entity'&&bb?.kind==='relationship')||(aa?.kind==='relationship'&&bb?.kind==='entity'))card=byId('er-new-card').value;edges.push({a,b,card});save();render();send('Verbindung erstellt: '+lookup(a).label+' ↔ '+lookup(b).label+'.'+(card?' Kardinalität '+card+'.':''));return}selected=id;term=null;render();send('„'+lookup(id).label+'“ markiert. Du kannst die Form ändern, unterstreichen oder das Element verschieben.')}
function addAt(x,y){if(!term){send('Zuerst einen Begriff links auswählen.');return}if(node(term)){send('Dieser Begriff wurde bereits eingesetzt.');return}snapshot();const name=lookup(term).label;const n={id:term,kind,key:false,x:Math.max(105,Math.min(795,x)),y:Math.max(55,Math.min(475,y))};nodes.push(n);selected=n.id;term=null;save();render();send('„'+name+'“ eingesetzt. Jetzt weitere Formen ergänzen oder Elemente verbinden.')}
function addAutomatic(){const index=nodes.length;addAt(180+(index%3)*265,110+Math.floor(index/3)*95)}
svg.addEventListener('pointerdown',ev=>{const el=ev.target.closest('[data-er-node]');if(el){const id=el.getAttribute('data-er-node');if(connecting){choose(id);return}choose(id);const n=node(id);drag={id,start:point(ev),x:n.x,y:n.y,moved:false};try{svg.setPointerCapture(ev.pointerId)}catch(e){}return}if(ev.target.closest('[data-er-edge]'))return;const p=point(ev);if(term){addAt(p.x,p.y)}else{selected=null;render();send('Wort links auswählen, dann Form wählen und auf die Fläche tippen.')}});
svg.addEventListener('pointermove',ev=>{if(!drag)return;const n=node(drag.id);if(!n)return;const p=point(ev);const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)>4){snapshot();drag.moved=true}if(drag.moved){n.x=Math.max(105,Math.min(795,drag.x+dx));n.y=Math.max(55,Math.min(475,drag.y+dy));render();}});
function endDrag(){if(drag?.moved)save();drag=null}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);window.addEventListener('pointerup',endDrag);
root.querySelectorAll('[data-er-shape]').forEach(b=>b.addEventListener('click',()=>{setShape(b.dataset.erShape);send('Form ausgewählt. Wähle jetzt ein Wort, falls noch keines markiert ist.')}));
byId('er-insert').onclick=addAutomatic;
byId('er-connect').onclick=()=>{connecting=!connecting;linkStart=null;selected=null;render();send(connecting?'Verbindungsmodus: Klicke nacheinander zwei Objekte. Bei Entität–Beziehung vorher Kardinalität wählen.':'Verbindungsmodus beendet.')};
byId('er-undo').onclick=()=>{if(!history.length)return;const old=history.pop();nodes=old.nodes;edges=old.edges;selected=null;linkStart=null;connecting=false;save();render();send('Letzten Arbeitsschritt zurückgenommen.')};
byId('er-node-shape').addEventListener('change',ev=>{const n=node(selected);if(!n)return;snapshot();n.kind=ev.target.value;if(n.kind!=='attribute')n.key=false;save();render();send('Form geändert. Die Überprüfung unterscheidet Rechteck, Raute und Oval.')});
byId('er-underline').addEventListener('change',ev=>{const n=node(selected);if(!n||n.kind!=='attribute')return;snapshot();n.key=ev.target.checked;save();render();send(n.key?'Attribut unterstrichen.':'Unterstreichung entfernt.')});
byId('er-edge-cardinality').addEventListener('change',ev=>{const e=edges.find(e=>canonical(e.a,e.b)===selected);if(!e)return;snapshot();e.card=ev.target.value;save();render();send('Kardinalität geändert.')});
byId('er-delete').onclick=()=>{if(!selected)return;snapshot();const e=edges.find(e=>canonical(e.a,e.b)===selected);if(e)edges=edges.filter(x=>x!==e);else{nodes=nodes.filter(n=>n.id!==selected);edges=edges.filter(e=>e.a!==selected&&e.b!==selected)}selected=null;save();render();send('Markiertes Element oder Verbindung entfernt.')};
function reset(){nodes=[];edges=[];term=null;selected=null;linkStart=null;connecting=false;validated=false;history=[];feedback.hidden=true;byId('er-show-solution').disabled=true;byId('er-solution').hidden=true;save();render()}
byId('er-reset').onclick=()=>{if(nodes.length&&!confirm('Das aktuelle Diagramm wirklich leeren?'))return;reset();send('Diagramm geleert. Du kannst erneut beginnen.')};
byId('er-exercise').onchange=ev=>{const next=cases.find(c=>c.id===ev.target.value);if(!next)return;current=next;history=[];selected=null;linkStart=null;term=null;connecting=false;feedback.hidden=true;byId('er-show-solution').disabled=true;byId('er-solution').hidden=true;readState();renderStory();render();send(nodes.length?'Gespeicherten Stand dieser Aufgabe wiederhergestellt.':'Neue Aufgabe. Lies den Fall und baue dein Diagramm.')};
function renderStory(){byId('er-story').textContent=current.story;byId('er-exercise-title').textContent=current.title}
function grade(){const msgs=[];let correct=0;const max=current.terms.length+current.terms.filter(t=>t.kind==='attribute').length+current.edges.length+current.edges.filter(e=>e[2]).length;
for(const expected of current.terms){const placed=node(expected.id);if(placed&&placed.kind===expected.kind)correct++;else msgs.push(!placed?'„'+expected.label+'“ fehlt noch.':'Prüfe die Form von „'+expected.label+'“.');if(expected.kind==='attribute'){if(placed&&placed.kind==='attribute'&&placed.key===!!expected.key)correct++;else if(placed)msgs.push('Prüfe, ob „'+expected.label+'“ ein Schlüsselattribut ist und unterstrichen sein muss.')}}
for(const [a,b,c]of current.edges){const e=edges.find(x=>canonical(x.a,x.b)===canonical(a,b));if(e)correct++;else msgs.push('Eine notwendige Verbindung fehlt – prüfe die Linien zwischen Attributen, Beziehungen und Entitätstypen.');if(c){if(e&&e.card===c)correct++;else msgs.push('Prüfe die Kardinalität an der Verbindung von „'+lookup(a).label+'“ und „'+lookup(b).label+'“.')}}
const expectedEdges=new Set(current.edges.map(e=>canonical(e[0],e[1]))),extra=edges.filter(e=>!expectedEdges.has(canonical(e.a,e.b)));if(extra.length){correct=Math.max(0,correct-extra.length);msgs.push('Entferne '+extra.length+' überflüssige Verbindung(en).')}
const percent=Math.round(100*correct/max);feedback.hidden=false;clear(feedback);
const h=document.createElement('h3');h.textContent=percent+' % · '+correct+' von '+max+' Prüfpunkten';h.className=correct===max?'er-good':'';feedback.appendChild(h);
const p=document.createElement('p');p.textContent=correct===max?'Sehr gut! Formen, Schlüsselattribute, Verbindungen und Kardinalitäten stimmen.': 'Fast? Hier sind Hinweise auf die Stellen, die du noch prüfen solltest. Die Lösung bleibt verborgen, bis du sie selbst öffnest.';feedback.appendChild(p);
const ul=document.createElement('ul');for(const msg of [...new Set(msgs)].slice(0,12)){const li=document.createElement('li');li.textContent=msg;ul.appendChild(li)}if(ul.children.length)feedback.appendChild(ul);
validated=true;byId('er-show-solution').disabled=false;feedback.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});send('Diagramm geprüft: '+correct+' von '+max+' Punkten.')}
byId('er-check').onclick=grade;
function renderSolution(){const target=byId('er-solution-svg');clear(target);
const t=current.terms,locations={};
const e=t.filter(x=>x.kind==='entity'),r=t.filter(x=>x.kind==='relationship'),a=t.filter(x=>x.kind==='attribute');
e.forEach((x,i)=>locations[x.id]={x:150+i*(620/Math.max(e.length-1,1)),y:220});
r.forEach((x,i)=>locations[x.id]={x:350+i*200,y:220});
if(r.length===1)locations[r[0].id]={x:460,y:220};
a.forEach((x,i)=>{const ent=current.edges.find(edge=>edge[0]===x.id||edge[1]===x.id);const parent=ent?(ent[0]===x.id?ent[1]:ent[0]):e[0].id;const attached=a.filter(y=>current.edges.some(edge=>canonical(edge[0],edge[1])===canonical(y.id,parent)));const ix=attached.findIndex(y=>y.id===x.id);const p=locations[parent]||{x:450,y:220};locations[x.id]={x:p.x+(ix%2?-68:68),y:ix<2?72:365}});
if(e.length===3){e.forEach((x,i)=>locations[x.id]={x:115+i*325,y:245});r.forEach((x,i)=>locations[x.id]={x:275+i*340,y:245});a.forEach((x,i)=>{const edge=current.edges.find(edge=>edge[0]===x.id||edge[1]===x.id);const parent=edge?(edge[0]===x.id?edge[1]:edge[0]):e[0].id;const related=a.filter(y=>current.edges.some(z=>canonical(z[0],z[1])===canonical(y.id,parent)));const ix=related.findIndex(y=>y.id===x.id);const p=locations[parent];locations[x.id]={x:p.x+(ix%2?75:-75),y:ix<2?70:406}})}
for(const [aId,bId,card]of current.edges){const p=locations[aId],q=locations[bId];target.appendChild(s('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'#8db8bd','stroke-width':2}));if(card){const ent=lookup(aId).kind==='entity'?p:q,other=ent===p?q:p;target.appendChild(s('text',{x:ent.x+(other.x-ent.x)*.2,y:ent.y+(other.y-ent.y)*.2-10,fill:'#f2c47a','font-size':18,'font-weight':900,'text-anchor':'middle'},card))}}
for(const word of t){const p=locations[word.id],g=s('g');if(word.kind==='entity')g.appendChild(s('rect',{x:p.x-94,y:p.y-36,width:188,height:72,rx:5,fill:'#183940',stroke:'#a6e1d4','stroke-width':2}));else if(word.kind==='relationship')g.appendChild(s('polygon',{points:(p.x+97)+','+p.y+' '+p.x+','+(p.y+44)+' '+(p.x-97)+','+p.y+' '+p.x+','+(p.y-44),fill:'#403626',stroke:'#eec779','stroke-width':2}));else g.appendChild(s('ellipse',{cx:p.x,cy:p.y,rx:93,ry:33,fill:'#182e3f',stroke:'#a4c0d3','stroke-width':2}));const label=s('text',{x:p.x,y:p.y+5,fill:'#f5f6ee','font-size':word.label.length>16?12:15,'text-anchor':'middle'},word.label);if(word.key)label.style.textDecoration='underline';g.appendChild(label);target.appendChild(g)}
}
byId('er-show-solution').onclick=()=>{if(!validated)return;byId('er-solution').hidden=false;renderSolution();byId('er-show-solution').disabled=true;send('Musterlösung eingeblendet. Du kannst dein Diagramm weiterhin ändern.')};
byId('er-new-card').addEventListener('change',()=>{});
exercise.value=current.id;readState();renderStory();render();setShape('entity');send(nodes.length?'Dein lokaler Übungsstand ist geladen.':'Wähle links ein Wort, entscheide über seine Form und setze es auf die Fläche.');
})();
