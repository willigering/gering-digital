
(()=>{'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const board=$('ew-board'), nodesGroup=$('ew-nodes'), linesGroup=$('ew-lines');
if(!board||!$('ew-words'))return;
const scenarios=[
{id:'kunde-auftrag',level:'easy',title:'Kundenaufträge',a:'Kunde',b:'Auftrag',verb:'erteilt',card:['1','n'],aAttrs:[['KundenNr',1]],bAttrs:[['AuftragsNr',1]],story:'Ein Kunde kann mehrere Aufträge erteilen. Jeder Auftrag gehört genau zu einem Kunden. Beide Entitätstypen besitzen eine eindeutige Nummer.'},
{id:'abteilung-mitarbeiter',level:'easy',title:'Wer gehört wohin?',a:'Abteilung',b:'Mitarbeiter',verb:'beschäftigt',card:['1','n'],aAttrs:[['AbteilungsID',1]],bAttrs:[['PersonalNr',1]],story:'Eine Abteilung kann viele Mitarbeiter beschäftigen. Jeder Mitarbeiter gehört genau einer Abteilung an. Jede Seite besitzt eine eindeutige Nummer.'},
{id:'bibliothek-exemplar',level:'easy',title:'Bücher im Bestand',a:'Bibliothek',b:'Exemplar',verb:'verwahrt',card:['1','n'],aAttrs:[['BibliotheksNr',1]],bAttrs:[['ExemplarNr',1]],story:'Eine Bibliothek verwahrt mehrere einzelne Buchexemplare. Jedes Exemplar befindet sich genau in einer Bibliothek. Beide haben eindeutige Nummern.'},
{id:'mitarbeiter-ausweis',level:'easy',title:'Dienstausweise',a:'Mitarbeiter',b:'Dienstausweis',verb:'besitzt',card:['1','1'],aAttrs:[['PersonalNr',1]],bAttrs:[['AusweisNr',1]],story:'Jeder Mitarbeiter besitzt genau einen Dienstausweis; jeder Dienstausweis gehört genau einem Mitarbeiter. Beide haben eine eindeutige Nummer.'},
{id:'fahrzeug-papiere',level:'easy',title:'Fahrzeugakten',a:'Fahrzeug',b:'Fahrzeugakte',verb:'hat',card:['1','1'],aAttrs:[['FahrzeugID',1]],bAttrs:[['AktenID',1]],story:'Zu jedem Fahrzeug gibt es genau eine Fahrzeugakte, und jede Akte gehört zu genau einem Fahrzeug. Beide besitzen ihre eigene ID.'},
{id:'schule-klasse',level:'medium',title:'Schulverwaltung',a:'Schule',b:'Klasse',verb:'führt',card:['1','n'],aAttrs:[['SchulNr',1],['Schulname',0]],bAttrs:[['KlassenNr',1],['Raum',0]],story:'Eine Schule führt mehrere Klassen. Jede Klasse gehört genau einer Schule. Zur Schule gehören SchulNr und Schulname, zur Klasse KlassenNr und Raum. Die Nummern sind eindeutig.'},
{id:'lieferant-artikel',level:'medium',title:'Einkauf und Lager',a:'Lieferant',b:'Artikel',verb:'liefert',card:['m','n'],aAttrs:[['LieferantenNr',1],['Firmenname',0]],bAttrs:[['ArtikelNr',1],['Bezeichnung',0]],story:'Ein Lieferant kann viele Artikel liefern. Ein Artikel kann von mehreren Lieferanten stammen. Lieferanten besitzen LieferantenNr und Firmenname, Artikel besitzen ArtikelNr und Bezeichnung. Die Nummern sind Schlüssel.'},
{id:'mitarbeiter-projekt',level:'medium',title:'Projektverwaltung',a:'Mitarbeiter',b:'Projekt',verb:'arbeitet an',card:['m','n'],aAttrs:[['PersonalNr',1],['Rolle',0]],bAttrs:[['ProjektNr',1],['Projekttitel',0]],story:'Ein Mitarbeiter kann an mehreren Projekten arbeiten; ein Projekt kann viele Mitarbeiter haben. PersonalNr und ProjektNr identifizieren die Einträge. Rolle und Projekttitel sind zusätzliche Eigenschaften.'},
{id:'lernende-kurs',level:'medium',title:'Kursbelegung',a:'Lernender',b:'Kurs',verb:'belegt',card:['m','n'],aAttrs:[['LernendenID',1],['E-Mail',0]],bAttrs:[['KursID',1],['Kurstitel',0]],story:'Ein Lernender kann mehrere Kurse belegen, und ein Kurs kann mehrere Lernende haben. Beide besitzen eine eindeutige ID und ein weiteres Attribut.'},
{id:'gebauede-raum',level:'medium',title:'Raumverwaltung',a:'Gebäude',b:'Raum',verb:'enthält',card:['1','n'],aAttrs:[['GebäudeID',1],['Anschrift',0]],bAttrs:[['RaumID',1],['Etage',0]],story:'Jedes Gebäude enthält mehrere Räume. Ein Raum gehört genau zu einem Gebäude. GebäudeID und RaumID sind eindeutige Schlüssel; Anschrift und Etage sind Eigenschaften.'},
{id:'kunde-produkt',level:'hard',title:'Warenkorbmodell',a:'Kunde',b:'Produkt',verb:'bestellt',card:['m','n'],aAttrs:[['KundenNr',1],['Kontakt',0]],bAttrs:[['ProduktNr',1],['Preis',0]],rAttrs:[['Menge',0],['Bestelldatum',0]],story:'Ein Kunde kann mehrere Produkte bestellen; ein Produkt kann von mehreren Kunden bestellt werden. Kunde: KundenNr und Kontakt. Produkt: ProduktNr und Preis. Die Beziehung „bestellt“ besitzt Menge und Bestelldatum. Die Nummern sind Schlüssel. Für diese Übung wird pro Kunden-Produkt-Paar eine Bestellung modelliert.'},
{id:'projekt-stunden',level:'hard',title:'Projektstunden',a:'Mitarbeiter',b:'Projekt',verb:'arbeitet an',card:['m','n'],aAttrs:[['PersonalNr',1],['Funktion',0]],bAttrs:[['ProjektNr',1],['Titel',0]],rAttrs:[['Stunden',0],['Startdatum',0]],story:'Mitarbeiter arbeiten an mehreren Projekten; Projekte können viele Mitarbeiter haben. PersonalNr/Funktion gehören zu Mitarbeiter, ProjektNr/Titel zu Projekt. Die Beziehung „arbeitet an“ hat die Attribute Stunden und Startdatum. Die Nummern sind Schlüssel.'},
{id:'kurs-dozent',level:'hard',title:'Unterrichtsplanung',a:'Dozent',b:'Kurs',verb:'unterrichtet',card:['m','n'],aAttrs:[['PersonalNr',1],['Fachgebiet',0]],bAttrs:[['KursNr',1],['Kurstitel',0]],rAttrs:[['Beginn',0],['Wochenstunden',0]],story:'Ein Dozent kann viele Kurse unterrichten; ein Kurs kann mehrere Dozenten haben. Der Dozent besitzt PersonalNr/Fachgebiet, der Kurs KursNr/Kurstitel. Beginn und Wochenstunden beschreiben den jeweiligen Einsatz.'},
{id:'arzt-patient',level:'hard',title:'Behandlungstermine',a:'Arzt',b:'Patient',verb:'behandelt',card:['m','n'],aAttrs:[['ArztNr',1],['Fachrichtung',0]],bAttrs:[['PatientenNr',1],['Geburtsjahr',0]],rAttrs:[['Termin',0],['Behandlungsart',0]],story:'Ein Arzt kann mehrere Patienten behandeln und ein Patient kann mehrere Ärzte aufsuchen. ArztNr und PatientenNr sind Schlüssel. Fachrichtung und Geburtsjahr gehören zu den Entitätstypen. Termin und Behandlungsart gehören zur Beziehung „behandelt“. Vereinfachung: Ein Beziehungseintrag pro Arzt-Patient-Paar.'}
];
const storeKey='dtp-er-werkstatt-v1-'+String(window.__EW_ACCOUNT__||'session');
let task=null, placed=[], edges=[], picked=null, selectedEdge=null, connectStart=null, history=[], moving=null, chipDrag=null, skipClickUntil=0, validated=false;
const currentById=id=>task?.terms.find(t=>t.id===id), nodeById=id=>placed.find(n=>n.id===id);
const canonical=(a,b)=>[a,b].sort().join('|');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const svgEl=(tag,attrs={},label)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(label!==undefined)e.textContent=label;return e};
const message=s=>{$('ew-message').textContent=s};
function model(s){const terms=[
{id:'a',label:s.a,kind:'entity'},
{id:'r',label:s.verb,kind:'relationship'},
{id:'b',label:s.b,kind:'entity'}];
const required=[['a','r',s.card[0]],['b','r',s.card[1]]];
for(const [prefix,attrs] of [['a',s.aAttrs],['b',s.bAttrs],['r',s.rAttrs||[]]]){
attrs.forEach(([label,key],i)=>{const id=prefix+i;terms.push({id,label,kind:'attribute',key:!!key});required.push([id,prefix,''])});}
return {...s,terms,required}}
function persist(){try{localStorage.setItem(storeKey,JSON.stringify({taskId:task.id,level:$('ew-level').value,placed,edges}))}catch(e){}}
function snapshot(){history.push({placed:structuredClone(placed),edges:structuredClone(edges)});if(history.length>60)history.shift()}
function change(){validated=false;$('ew-solution-button').disabled=true;$('ew-solution').hidden=true;$('ew-feedback').hidden=true;persist();render()}
function restore(){try{const val=JSON.parse(localStorage.getItem(storeKey)||'null');if(!val)return false;const s=scenarios.find(x=>x.id===val.taskId);if(!s)return false;task=model(s);$('ew-level').value=s.level;
if(Array.isArray(val.placed))placed=val.placed.filter(n=>currentById(n.id)&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&['none','entity','relationship','attribute'].includes(n.shape)).slice(0,12).map(n=>({id:n.id,x:Math.max(85,Math.min(815,n.x)),y:Math.max(55,Math.min(445,n.y)),shape:n.shape,underline:!!n.underline}));
if(Array.isArray(val.edges))edges=val.edges.filter(e=>nodeById(e.a)&&nodeById(e.b)&&e.a!==e.b&&['','1','n','m'].includes(e.card)).slice(0,15).map(e=>({a:e.a,b:e.b,card:e.card}));return true}catch(e){return false}}
function newTask(){let level=$('ew-level').value;let options=scenarios.filter(t=>t.level===level&&(!task||t.id!==task.id));if(!options.length)options=scenarios.filter(t=>t.level===level);const sample=options[Math.floor(Math.random()*options.length)];
task=model(sample);placed=[];edges=[];picked=null;selectedEdge=null;connectStart=null;history=[];validated=false;$('ew-feedback').hidden=true;$('ew-solution').hidden=true;$('ew-solution-button').disabled=true;render();persist();message('Neue Aufgabe. Zieh die Begriffe ins Feld.')}
function renderWords(){const area=$('ew-words');area.replaceChildren();for(const word of task.terms.slice().sort((a,b)=>a.label.localeCompare(b.label,'de'))){if(nodeById(word.id))continue;const b=document.createElement('button');b.type='button';b.className='ew-word';b.textContent=word.label;b.dataset.id=word.id;b.setAttribute('aria-label',word.label+' auf die Zeichentafel setzen');
b.addEventListener('pointerdown',ev=>startChipDrag(ev,b,word.id));b.addEventListener('pointermove',moveChip);b.addEventListener('pointerup',endChip);b.addEventListener('pointercancel',endChip);
b.addEventListener('click',()=>{if(Date.now()<skipClickUntil)return;addWord(word.id,230+(placed.length%3)*200,145+Math.floor(placed.length/3)*100);message('„'+word.label+'“ eingesetzt. Jetzt Form wählen.');});area.appendChild(b)}
$('ew-count').textContent=placed.length+' / '+task.terms.length+' platziert'}
function startChipDrag(ev,el,id){if(ev.button!==undefined&&ev.button!==0)return;chipDrag={id,el,x:ev.clientX,y:ev.clientY,ghost:null,moved:false};try{el.setPointerCapture(ev.pointerId)}catch(e){}}
function moveChip(ev){if(!chipDrag)return;const d=chipDrag;if(!d.moved&&Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>9){d.moved=true;const ghost=document.createElement('div');ghost.className='ew-ghost';ghost.textContent=currentById(d.id).label;document.body.appendChild(ghost);d.ghost=ghost;d.el.classList.add('ew-dragging')}if(d.ghost){d.ghost.style.left=ev.clientX+'px';d.ghost.style.top=ev.clientY+'px'}}
function endChip(ev){if(!chipDrag)return;const d=chipDrag;chipDrag=null;if(d.ghost)d.ghost.remove();d.el.classList.remove('ew-dragging');if(!d.moved)return;skipClickUntil=Date.now()+500;const area=board.getBoundingClientRect();if(ev.clientX>=area.left&&ev.clientX<=area.right&&ev.clientY>=area.top&&ev.clientY<=area.bottom){const p=coords(ev);addWord(d.id,p.x,p.y);message('Begriff abgelegt. Klicke auf ihn und wähle Rechteck, Raute oder Oval.')}else message('Zieh den Begriff auf die Zeichenfläche. Alternativ kurz antippen.')}
function addWord(id,x,y){if(nodeById(id))return;snapshot();placed.push({id,x:Math.max(105,Math.min(795,x)),y:Math.max(54,Math.min(446,y)),shape:'none',underline:false});picked=id;selectedEdge=null;connectStart=null;change()}
function coords(ev){const c=board.createSVGPoint();c.x=ev.clientX;c.y=ev.clientY;const m=board.getScreenCTM();return m?c.matrixTransform(m.inverse()):{x:450,y:250}}
function render(){if(!task)return;$('ew-title').textContent=task.title;$('ew-story').textContent=task.story;renderWords();renderBoard();renderTools();$('ew-undo').disabled=!history.length}
function renderTools(){const n=nodeById(picked);$('ew-toolbar').hidden=!!selectedEdge;$('ew-line-toolbar').hidden=!selectedEdge;
$('ew-selection-label').textContent=n?'„'+currentById(n.id).label+'“ bearbeiten':'Wähle eine Form aus dem Diagramm';
for(const b of document.querySelectorAll('[data-ew-shape]')){b.disabled=!n;b.setAttribute('aria-pressed',String(!!n&&n.shape===b.dataset.ewShape))}
$('ew-underline').disabled=!n||n.shape!=='attribute';$('ew-underline').setAttribute('aria-pressed',String(!!n&&n.underline));
$('ew-connect').disabled=!n;$('ew-connect').classList.toggle('is-active',!!connectStart);$('ew-connect').textContent=connectStart?'Ziel anklicken …':'Verbinden';
$('ew-delete').disabled=!n;
const edge=edges.find(e=>canonical(e.a,e.b)===selectedEdge);
for(const b of document.querySelectorAll('[data-ew-card]')){b.setAttribute('aria-pressed',String(!!edge&&b.dataset.ewCard===edge.card));b.disabled=!edge} $('ew-delete-line').disabled=!edge}
function renderBoard(){nodesGroup.replaceChildren();linesGroup.replaceChildren();
$('ew-empty').style.display=placed.length?'none':'';$('ew-empty-sub').style.display=placed.length?'none':'';
for(const e of edges){const a=nodeById(e.a),b=nodeById(e.b);if(!a||!b)continue;const group=svgEl('g',{'data-edge':canonical(e.a,e.b),role:'button',tabindex:0,'aria-label':'Verbindung '+currentById(e.a).label+' zu '+currentById(e.b).label});const active=selectedEdge===canonical(e.a,e.b);
group.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'ew-link'+(active?' is-selected':'')}));
group.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':20}));
if(e.card){const entity=a.id==='a'||a.id==='b'?a:(b.id==='a'||b.id==='b'?b:a),other=entity===a?b:a;
group.appendChild(svgEl('text',{x:entity.x+(other.x-entity.x)*.23,y:entity.y+(other.y-entity.y)*.23-9,'text-anchor':'middle',class:'ew-link-label'},e.card))}
linesGroup.appendChild(group)}
for(const n of placed){const word=currentById(n.id);if(!word)continue;const g=svgEl('g',{'data-id':n.id,'data-shape':n.shape,role:'button',tabindex:0,'aria-label':word.label+(n.shape==='none'?' ohne Form':' als '+n.shape)+(n.underline?' unterstrichen':''),class:'ew-node'+(picked===n.id||connectStart===n.id?' is-selected':'')});const shape=n.shape;let geo;
if(shape==='entity')geo=svgEl('rect',{x:n.x-91,y:n.y-34,width:182,height:68,rx:4,class:'ew-shape'});
else if(shape==='relationship')geo=svgEl('polygon',{points:(n.x+103)+','+n.y+' '+n.x+','+(n.y+42)+' '+(n.x-103)+','+n.y+' '+n.x+','+(n.y-42),class:'ew-shape'});
else if(shape==='attribute')geo=svgEl('ellipse',{cx:n.x,cy:n.y,rx:93,ry:34,class:'ew-shape'});
else geo=svgEl('rect',{x:n.x-91,y:n.y-31,width:182,height:62,rx:9,fill:'#122831',stroke:'#749199','stroke-width':2,'stroke-dasharray':'6 5'});
const label=svgEl('text',{x:n.x,y:n.y+6,'text-anchor':'middle',class:n.underline?'is-underline':''},word.label);
if(word.label.length>15)label.style.fontSize='13px';else if(word.label.length>11)label.style.fontSize='15px';g.append(geo,label);
g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectNode(n.id)}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();snapshot();n.x+=ev.key==='ArrowRight'?10:ev.key==='ArrowLeft'?-10:0;n.y+=ev.key==='ArrowDown'?10:ev.key==='ArrowUp'?-10:0;n.x=Math.max(105,Math.min(795,n.x));n.y=Math.max(54,Math.min(446,n.y));change()}});
nodesGroup.appendChild(g)}
}
function selectNode(id){if(connectStart){if(id===connectStart){connectStart=null;render();message('Verbindung abgebrochen.');return}const a=connectStart,b=id;connectStart=null;if(edges.some(e=>canonical(e.a,e.b)===canonical(a,b))){message('Diese Verbindung gibt es schon.');render();return}snapshot();edges.push({a,b,card:''});picked=null;selectedEdge=canonical(a,b);change();message('Verbindung erstellt. Wähle bei Bedarf die Kardinalität 1, n oder m.');return}picked=id;selectedEdge=null;renderTools();renderBoard();message('„'+currentById(id).label+'“ markiert. Wähle nun eine Form oder Verbinden.')}
board.addEventListener('pointerdown',ev=>{const nodeEl=ev.target.closest('[data-id]');if(nodeEl){const id=nodeEl.getAttribute('data-id');selectNode(id);if(connectStart||selectedEdge)return;const n=nodeById(id);if(n){const p=coords(ev);moving={id,originX:n.x,originY:n.y,startX:p.x,startY:p.y,moved:false};try{board.setPointerCapture(ev.pointerId)}catch(e){}}return}
const lineEl=ev.target.closest('[data-edge]');if(lineEl){selectedEdge=lineEl.getAttribute('data-edge');picked=null;connectStart=null;renderTools();renderBoard();message('Linie markiert. Gib die Kardinalität an oder entferne die Linie.');return}
picked=null;selectedEdge=null;connectStart=null;renderTools();renderBoard()});
board.addEventListener('pointermove',ev=>{if(!moving)return;const n=nodeById(moving.id);if(!n)return;const p=coords(ev),dx=p.x-moving.startX,dy=p.y-moving.startY;if(!moving.moved&&Math.hypot(dx,dy)>5){moving.moved=true;snapshot()}if(moving.moved){n.x=Math.max(105,Math.min(795,moving.originX+dx));n.y=Math.max(54,Math.min(446,moving.originY+dy));renderBoard()}});
function stopMove(){if(moving?.moved)change();moving=null}
board.addEventListener('pointerup',stopMove);board.addEventListener('pointercancel',stopMove);
for(const b of document.querySelectorAll('[data-ew-shape]'))b.addEventListener('click',()=>{const n=nodeById(picked);if(!n)return;snapshot();n.shape=b.dataset.ewShape;if(n.shape!=='attribute')n.underline=false;change();message('Form gesetzt: '+b.textContent.trim()+'.')});
$('ew-underline').addEventListener('click',()=>{const n=nodeById(picked);if(!n||n.shape!=='attribute')return;snapshot();n.underline=!n.underline;change();message(n.underline?'Attribut unterstrichen.':'Unterstreichung entfernt.')});
$('ew-connect').addEventListener('click',()=>{if(!nodeById(picked))return;connectStart=picked;renderTools();renderBoard();message('Klicke auf den zweiten Begriff, um beide zu verbinden.')});
for(const b of document.querySelectorAll('[data-ew-card]'))b.addEventListener('click',()=>{const e=edges.find(e=>canonical(e.a,e.b)===selectedEdge);if(!e)return;snapshot();e.card=b.dataset.ewCard;change();message('Kardinalität gesetzt.')});
$('ew-delete').addEventListener('click',()=>{const n=nodeById(picked);if(!n)return;snapshot();placed=placed.filter(x=>x.id!==n.id);edges=edges.filter(e=>e.a!==n.id&&e.b!==n.id);picked=null;connectStart=null;change()});
$('ew-delete-line').addEventListener('click',()=>{if(!selectedEdge)return;snapshot();edges=edges.filter(e=>canonical(e.a,e.b)!==selectedEdge);selectedEdge=null;change()});
$('ew-undo').addEventListener('click',()=>{const old=history.pop();if(!old)return;placed=old.placed;edges=old.edges;picked=null;selectedEdge=null;connectStart=null;change();message('Letzter Schritt rückgängig gemacht.')});
$('ew-clear').addEventListener('click',()=>{if(placed.length&&!window.confirm('Zeichenblatt wirklich leeren?'))return;snapshot();placed=[];edges=[];picked=null;selectedEdge=null;connectStart=null;change();message('Zeichenblatt geleert.')});
$('ew-next').addEventListener('click',newTask);
$('ew-level').addEventListener('change',newTask);
function grade(){let done=0,max=0;const hints=[];
for(const t of task.terms){const n=nodeById(t.id);max+=2;if(n)done++;else hints.push('Begriff „'+t.label+'“ fehlt.');if(n&&n.shape===t.kind)done++;else if(n)hints.push('Form von „'+t.label+'“ prüfen.');
if(t.kind==='attribute'){max++;if(n&&n.shape==='attribute'&&n.underline===!!t.key)done++;else if(n)hints.push('Unterstreichung bei „'+t.label+'“ prüfen.')}}
const expected=new Set(task.required.map(([a,b])=>canonical(a,b)));
for(const [a,b,card] of task.required){max++;const e=edges.find(e=>canonical(e.a,e.b)===canonical(a,b));if(e)done++;else hints.push('Eine Verbindung fehlt. Prüfe die Linien.');if(card){max++;if(e&&e.card===card)done++;else hints.push('Kardinalität zwischen „'+currentById(a).label+'“ und „'+currentById(b).label+'“ prüfen.')}else if(e&&e.card)hints.push('Eine Attributlinie sollte keine Kardinalität tragen.')}
const extras=edges.filter(e=>!expected.has(canonical(e.a,e.b)));if(extras.length){max+=extras.length;hints.push('Es gibt '+extras.length+' überflüssige Verbindung(en).')}
if(edges.some(e=>{const x=task.required.find(r=>canonical(r[0],r[1])===canonical(e.a,e.b));return x&&!x[2]&&e.card})){max++;hints.push('An mindestens einer Attributlinie steht eine unnötige 1/n/m-Kardinalität.')}
const pct=Math.round(done/max*100),panel=$('ew-feedback');panel.hidden=false;panel.replaceChildren();const h=document.createElement('h3');h.textContent=pct+' % richtig · '+done+' / '+max+' Prüfpunkte';if(pct===100)h.classList.add('ew-perfect');panel.appendChild(h);
const p=document.createElement('p');p.textContent=pct===100?'Alles korrekt! Du hast die Aufgabe richtig modelliert.':'Prüfe die markierten Punkte und versuche es erneut. Die Position der Begriffe spielt für die Bewertung keine Rolle.';panel.appendChild(p);
if(hints.length){const ul=document.createElement('ul');for(const hint of [...new Set(hints)].slice(0,9)){const li=document.createElement('li');li.textContent=hint;ul.appendChild(li)}panel.appendChild(ul)}
validated=true;$('ew-solution-button').disabled=false;message('Diagramm geprüft: '+pct+' %. Du kannst weiter korrigieren.')}
$('ew-check').addEventListener('click',grade);
function showAnswer(){if(!validated)return;const svg=$('ew-solution-svg');svg.replaceChildren();const loc={a:{x:170,y:255},r:{x:450,y:255},b:{x:730,y:255},a0:{x:100,y:100},a1:{x:100,y:405},b0:{x:800,y:100},b1:{x:800,y:405},r0:{x:390,y:105},r1:{x:510,y:405}};
for(const [a,b,card]of task.required){const p=loc[a],q=loc[b];if(!p||!q)continue;svg.appendChild(svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:'#87c9c0','stroke-width':2}));if(card){const entity=(a==='a'||a==='b')?p:((b==='a'||b==='b')?q:p);const other=entity===p?q:p;svg.appendChild(svgEl('text',{x:entity.x+(other.x-entity.x)*.23,y:entity.y+(other.y-entity.y)*.23-10,'text-anchor':'middle',fill:'#eec77a','font-size':22,'font-weight':900},card))}}
for(const t of task.terms){const p=loc[t.id];if(!p)continue;let el;if(t.kind==='entity')el=svgEl('rect',{x:p.x-98,y:p.y-38,width:196,height:76,rx:3,fill:'#20464d',stroke:'#8fdfd2','stroke-width':2});
else if(t.kind==='relationship')el=svgEl('polygon',{points:(p.x+105)+','+p.y+' '+p.x+','+(p.y+45)+' '+(p.x-105)+','+p.y+' '+p.x+','+(p.y-45),fill:'#40382a',stroke:'#eabe77','stroke-width':2});
else el=svgEl('ellipse',{cx:p.x,cy:p.y,rx:96,ry:34,fill:'#202f43',stroke:'#a9c6dc','stroke-width':2});
svg.appendChild(el);const label=svgEl('text',{x:p.x,y:p.y+5,fill:'#f5fbf5','text-anchor':'middle','font-size':t.label.length>13?13:16},t.label);if(t.key)label.style.textDecoration='underline';svg.appendChild(label)}
$('ew-solution').hidden=false;$('ew-solution-button').disabled=true;message('Musterdiagramm eingeblendet.')}
$('ew-solution-button').addEventListener('click',showAnswer);
if(!restore()){const initial=scenarios.find(s=>s.level==='medium');task=model(initial)}render();
message(placed.length?'Letzte Zeichnung auf diesem Gerät wiederhergestellt.':'Begriffe auf die Fläche ziehen. Danach Form wählen.'); 
// Hook for deterministic UI regression tests; never contains personally identifying data.
window.__EW_INSPECT__=()=>({taskId:task.id,placed:placed.map(n=>({...n})),edges:edges.map(e=>({...e})),validated});
})();
