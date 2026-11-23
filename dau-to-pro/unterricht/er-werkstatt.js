
(()=>{'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const board=$('ew-board'), nodesGroup=$('ew-nodes'), linesGroup=$('ew-lines');
if(!board||!$('ew-labels'))return;
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
const docScenarios=[{"id":"bib-ausweis","level":"hard","title":"Bibliotheksverwaltung · Mitgliedsausweis","a":"Mitglied","b":"Mitgliedsausweis","verb":"besitzt","card":["1","1"],"aAttrs":[["MitgliedsNr",1],["Name",0]],"bAttrs":[["AusweisNr",1]],"rAttrs":[],"story":"Jedes Mitglied besitzt genau einen Mitgliedsausweis; jeder Ausweis gehört zu genau einem Mitglied."},{"id":"bib-verlag","level":"hard","title":"Bibliotheksverwaltung · Verlag","a":"Verlag","b":"Buch","verb":"veröffentlicht","card":["1","n"],"aAttrs":[["VerlagsNr",1],["Name",0]],"bAttrs":[["ISBN",1],["Titel",0]],"rAttrs":[],"story":"Ein Verlag veröffentlicht mehrere Bücher. Jedes Buch wird von genau einem Verlag veröffentlicht."},{"id":"bib-autoren","level":"hard","title":"Bibliotheksverwaltung · Autoren","a":"Autor","b":"Buch","verb":"schreibt","card":["m","n"],"aAttrs":[["AutorNr",1],["Name",0]],"bAttrs":[["ISBN",1],["Titel",0]],"rAttrs":[],"story":"Ein Autor kann mehrere Bücher schreiben; ein Buch kann mehrere Autoren haben."},{"id":"bib-ausleihe","level":"hard","title":"Bibliotheksverwaltung · Ausleihen","a":"Mitglied","b":"Exemplar","verb":"leiht aus","card":["m","n"],"aAttrs":[["MitgliedsNr",1],["Name",0]],"bAttrs":[["ExemplarNr",1]],"rAttrs":[["Ausleihdatum",0],["Rückgabedatum",0]],"story":"Ein Mitglied kann mehrere Exemplare ausleihen; ein Exemplar kann im Laufe der Zeit von verschiedenen Mitgliedern ausgeliehen werden. Zu jeder Ausleihe werden Ausleihdatum und Rückgabedatum gespeichert. Für wiederholte Ausleihen desselben Paares braucht das relationale Modell zusätzlich eine eindeutige Ausleih-ID oder einen geeigneten zusammengesetzten Schlüssel."},{"id":"bib-exemplare","level":"hard","title":"Bibliotheksverwaltung · Buchbestand","a":"Buch","b":"Exemplar","verb":"hat","card":["1","n"],"aAttrs":[["ISBN",1],["Titel",0]],"bAttrs":[["ExemplarNr",1],["Zustand",0]],"rAttrs":[],"story":"Jedes Buch liegt in mehreren Exemplaren vor; jedes Exemplar gehört genau einem Buch."},{"id":"bib-regal","level":"hard","title":"Bibliotheksverwaltung · Regale","a":"Regal","b":"Exemplar","verb":"enthält","card":["1","n"],"aAttrs":[["RegalNr",1],["Standort",0]],"bAttrs":[["ExemplarNr",1]],"rAttrs":[],"story":"Jedes Exemplar steht in genau einem Regal; ein Regal enthält mehrere Exemplare."},{"id":"schule-klasse-doc","level":"hard","title":"Schulverwaltung · Klassen","a":"Klasse","b":"Schüler","verb":"enthält","card":["1","n"],"aAttrs":[["KlassenNr",1],["Bezeichnung",0]],"bAttrs":[["SchülerNr",1],["Name",0]],"rAttrs":[],"story":"Jeder Schüler gehört genau einer Klasse; eine Klasse hat mehrere Schüler."},{"id":"schule-spind","level":"hard","title":"Schulverwaltung · Spinde","a":"Schüler","b":"Spind","verb":"nutzt","card":["1","1"],"aAttrs":[["SchülerNr",1],["Name",0]],"bAttrs":[["SpindNr",1]],"rAttrs":[],"story":"Jeder Schüler besitzt genau einen Spind; jeder Spind wird von genau einem Schüler genutzt."},{"id":"schule-lehrer","level":"hard","title":"Schulverwaltung · Klassenlehrer","a":"Lehrer","b":"Klasse","verb":"leitet","card":["1","n"],"aAttrs":[["LehrerNr",1],["Name",0]],"bAttrs":[["KlassenNr",1]],"rAttrs":[],"story":"Jede Klasse hat genau einen Klassenlehrer; ein Lehrer kann Klassenlehrer mehrerer Klassen sein."},{"id":"schule-faecher","level":"hard","title":"Schulverwaltung · Unterricht","a":"Lehrer","b":"Fach","verb":"unterrichtet","card":["m","n"],"aAttrs":[["LehrerNr",1],["Name",0]],"bAttrs":[["FachNr",1],["Fachname",0]],"rAttrs":[],"story":"Ein Lehrer kann mehrere Fächer unterrichten; jedes Fach kann von mehreren Lehrern unterrichtet werden."},{"id":"schule-noten","level":"hard","title":"Schulverwaltung · Noten","a":"Schüler","b":"Fach","verb":"erhält Note in","card":["m","n"],"aAttrs":[["SchülerNr",1],["Name",0]],"bAttrs":[["FachNr",1],["Fachname",0]],"rAttrs":[["Notenwert",0],["Datum",0]],"story":"Schüler erhalten in mehreren Fächern Noten. Zu jeder Note gehören Notenwert und Datum. Mehrere Noten pro Schüler/Fach sind möglich; im relationalen Modell braucht jede Note eine eindeutige Identifikation."},{"id":"fit-vertrag","level":"hard","title":"Fitnessstudio · Verträge","a":"Kunde","b":"Mitgliedsvertrag","verb":"besitzt","card":["1","1"],"aAttrs":[["KundenNr",1],["Name",0]],"bAttrs":[["VertragsNr",1],["Beginn",0]],"rAttrs":[],"story":"Jeder Kunde besitzt genau einen Mitgliedsvertrag, jeder Vertrag gehört genau einem Kunden."},{"id":"fit-standort","level":"hard","title":"Fitnessstudio · Standorte","a":"Standort","b":"Trainer","verb":"beschäftigt","card":["1","n"],"aAttrs":[["StandortNr",1],["Adresse",0]],"bAttrs":[["TrainerNr",1],["Name",0]],"rAttrs":[],"story":"Ein Standort beschäftigt mehrere Trainer; jeder Trainer arbeitet an genau einem Standort."},{"id":"fit-trainer","level":"hard","title":"Fitnessstudio · Kursleitung","a":"Trainer","b":"Kurs","verb":"leitet","card":["m","n"],"aAttrs":[["TrainerNr",1],["Name",0]],"bAttrs":[["KursNr",1],["Titel",0]],"rAttrs":[],"story":"Ein Trainer kann mehrere Kurse leiten; ein Kurs kann von mehreren Trainern geleitet werden."},{"id":"fit-teilnahme","level":"hard","title":"Fitnessstudio · Teilnahme","a":"Kunde","b":"Kurstermin","verb":"nimmt teil an","card":["m","n"],"aAttrs":[["KundenNr",1],["Name",0]],"bAttrs":[["TerminNr",1],["Datum",0]],"rAttrs":[["Anmeldezeit",0],["Anwesenheitsstatus",0]],"story":"Kunden nehmen an Kursterminen teil. Jede Teilnahme speichert Anmeldezeit und Anwesenheitsstatus."},{"id":"fit-termine","level":"hard","title":"Fitnessstudio · Kurstermine","a":"Kurs","b":"Kurstermin","verb":"hat","card":["1","n"],"aAttrs":[["KursNr",1],["Titel",0]],"bAttrs":[["TerminNr",1],["Datum",0]],"rAttrs":[],"story":"Jeder Kurs hat mehrere Kurstermine; jeder Kurstermin gehört zu genau einem Kurs."},{"id":"fit-raeume","level":"hard","title":"Fitnessstudio · Räume","a":"Raum","b":"Kurstermin","verb":"beherbergt","card":["1","n"],"aAttrs":[["RaumNr",1],["Bezeichnung",0]],"bAttrs":[["TerminNr",1],["Datum",0]],"rAttrs":[],"story":"Jeder Kurstermin findet in genau einem Raum statt; ein Raum beherbergt viele Termine über die Zeit."},{"id":"auto-personal","level":"hard","title":"Autovermietung · Filialen","a":"Filiale","b":"Mitarbeiter","verb":"beschäftigt","card":["1","n"],"aAttrs":[["FilialNr",1],["Ort",0]],"bAttrs":[["PersonalNr",1],["Name",0]],"rAttrs":[],"story":"Jede Filiale beschäftigt mehrere Mitarbeiter; jeder Mitarbeiter gehört genau zu einer Filiale."},{"id":"auto-vorgesetzt","level":"hard","title":"Autovermietung · Vorgesetzte","a":"Mitarbeiter (Vorgesetzter)","b":"Mitarbeiter (Unterstellter)","verb":"ist vorgesetzt","card":["1","n"],"aAttrs":[["VorgesetztenNr",1],["Name",0]],"bAttrs":[["PersonalNr",1],["Name",0]],"rAttrs":[],"story":"Rekursive Beziehung auf dem Entitätstyp Mitarbeiter: Jeder Mitarbeiter hat höchstens einen Vorgesetzten, kann aber mehrere Mitarbeitende führen. Die zwei Rollen hier dienen nur zur Übung der rekursiven Beziehung; im Gesamtmodell ist es ein einziger Entitätstyp."},{"id":"auto-kategorie","level":"hard","title":"Autovermietung · Fahrzeugkategorien","a":"Fahrzeugkategorie","b":"Fahrzeug","verb":"enthält","card":["1","n"],"aAttrs":[["KategorieNr",1],["Bezeichnung",0]],"bAttrs":[["FahrzeugNr",1],["Kennzeichen",0]],"rAttrs":[],"story":"Jedes Fahrzeug gehört zu einer Fahrzeugkategorie; zu einer Kategorie gehören mehrere Fahrzeuge."},{"id":"auto-schein","level":"hard","title":"Autovermietung · Fahrzeugschein","a":"Fahrzeug","b":"Fahrzeugschein","verb":"besitzt","card":["1","1"],"aAttrs":[["FahrzeugNr",1],["Kennzeichen",0]],"bAttrs":[["ScheinNr",1]],"rAttrs":[],"story":"Jedes Fahrzeug besitzt genau einen Fahrzeugschein; dieser gehört zu genau einem Fahrzeug."},{"id":"auto-miete-kunde","level":"hard","title":"Autovermietung · Mieten/Kunden","a":"Kunde","b":"Miete","verb":"schließt ab","card":["1","n"],"aAttrs":[["KundenNr",1],["Name",0]],"bAttrs":[["MietNr",1],["Mietbeginn",0]],"rAttrs":[],"story":"Jede Miete wird von genau einem Kunden abgeschlossen. Ein Kunde kann mehrere Mieten haben. Miete ist eine eigenständige Entität mit Mietbeginn, Mietende und Gesamtpreis."},{"id":"auto-miete-fahrzeug","level":"hard","title":"Autovermietung · Mieten/Fahrzeuge","a":"Fahrzeug","b":"Miete","verb":"betrifft","card":["1","n"],"aAttrs":[["FahrzeugNr",1],["Kennzeichen",0]],"bAttrs":[["MietNr",1],["Mietende",0]],"rAttrs":[],"story":"Jede Miete betrifft genau ein Fahrzeug; ein Fahrzeug kommt in mehreren Mieten vor."},{"id":"auto-miete-personal","level":"hard","title":"Autovermietung · Mietbearbeitung","a":"Mitarbeiter","b":"Miete","verb":"bearbeitet","card":["1","n"],"aAttrs":[["PersonalNr",1],["Name",0]],"bAttrs":[["MietNr",1],["Gesamtpreis",0]],"rAttrs":[],"story":"Jede Miete wird von genau einem Mitarbeiter bearbeitet; Mitarbeiter bearbeiten viele Mieten."},{"id":"auto-extra","level":"hard","title":"Autovermietung · Zusatzleistungen","a":"Miete","b":"Zusatzleistung","verb":"bucht","card":["m","n"],"aAttrs":[["MietNr",1],["Mietbeginn",0]],"bAttrs":[["LeistungsNr",1],["Bezeichnung",0]],"rAttrs":[["Menge",0]],"story":"Zu einer Miete können mehrere Zusatzleistungen gebucht werden. Dieselbe Zusatzleistung kann zu vielen Mieten gehören. Die gebuchte Menge ist ein Attribut der Buchung."},{"id":"auto-schaden","level":"hard","title":"Autovermietung · Schäden","a":"Fahrzeug","b":"Schaden","verb":"hat","card":["1","n"],"aAttrs":[["FahrzeugNr",1],["Kennzeichen",0]],"bAttrs":[["SchadensNr",1],["Beschreibung",0]],"rAttrs":[],"story":"Schaden ist eine schwache Entität: Die SchadensNr ist nur innerhalb eines Fahrzeugs eindeutig. Im relationalen Modell ist der zusammengesetzte Primärschlüssel (FahrzeugNr, SchadensNr). Die derzeitige Werkstatt visualisiert die Beziehung, aber noch keine doppelt umrandete schwache Entität."}];
scenarios.push(...docScenarios);
const storeKey='dtp-er-werkstatt-v2-'+String(window.__EW_ACCOUNT__||'session');
let task=null, placed=[], edges=[], picked=null, selectedEdge=null, connectStart=null, history=[], drag=null, validated=false;
let customTerms=[];
const isCustom=id=>customTerms.some(t=>t.id===id);
const currentById=id=>task?.terms.find(t=>t.id===id)||customTerms.find(t=>t.id===id), nodeById=id=>placed.find(n=>n.id===id);
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
function persist(){try{localStorage.setItem(storeKey,JSON.stringify({taskId:task.id,level:$('ew-level').value,placed,edges,customTerms}))}catch(e){}}
function snapshot(){history.push({placed:structuredClone(placed),edges:structuredClone(edges),customTerms:structuredClone(customTerms)});if(history.length>60)history.shift()}
function change(){validated=false;$('ew-solution-button').disabled=true;$('ew-solution').hidden=true;$('ew-feedback').hidden=true;persist();render()}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function seedMissing(){
 const grid=Array.from({length:9},(_,i)=>({x:150+i%3*300,y:85+Math.floor(i/3)*165}));
 for(let i=grid.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[grid[i],grid[j]]=[grid[j],grid[i]]}
 for(const t of [...task.terms,...customTerms]){
  if(nodeById(t.id))continue;
  const distance=p=>placed.length?Math.min(...placed.map(n=>Math.hypot(p.x-n.x,p.y-n.y))):999;
  grid.sort((a,b)=>distance(b)-distance(a));
  const point=grid.shift();
  placed.push({id:t.id,...point,shape:'none',underline:false});
 }
}
function restore(){try{const val=JSON.parse(localStorage.getItem(storeKey)||'null');if(!val)return false;const s=scenarios.find(x=>x.id===val.taskId);if(!s)return false;task=model(s);$('ew-level').value=s.level;if($('ew-doc-task'))$('ew-doc-task').value=docScenarios.some(t=>t.id===s.id)?s.id:'';
customTerms=Array.isArray(val.customTerms)?val.customTerms.filter(t=>t&&typeof t.id==='string'&&/^custom-\d+$/.test(t.id)&&typeof t.label==='string'&&t.label.trim().length>0).slice(0,35).map(t=>({id:t.id,label:t.label.slice(0,45),kind:'custom'})):[];
if(Array.isArray(val.placed))placed=val.placed.filter(n=>currentById(n.id)&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&['none','entity','relationship','attribute'].includes(n.shape)).slice(0,55).map(n=>({id:n.id,x:Math.max(85,Math.min(815,n.x)),y:Math.max(55,Math.min(445,n.y)),shape:n.shape,underline:!!n.underline}));
seedMissing();
if(Array.isArray(val.edges))edges=val.edges.filter(e=>nodeById(e.a)&&nodeById(e.b)&&e.a!==e.b&&['','1','n','m'].includes(e.card)).slice(0,100).map(e=>({a:e.a,b:e.b,card:e.card}));return true}catch(e){return false}}
function newTask(){let level=$('ew-level').value;let selected=$('ew-doc-task')?.value||'';let exact=scenarios.find(t=>t.id===selected);if(exact){task=model(exact);placed=[];edges=[];customTerms=[];seedMissing();picked=null;selectedEdge=null;connectStart=null;history=[];change();message('Aufgabe aus dem Arbeitsblatt geladen.');return;}let options=scenarios.filter(t=>t.level===level&&!docScenarios.includes(t)&&(!task||t.id!==task.id));if(!options.length)options=scenarios.filter(t=>t.level===level);const sample=options[Math.floor(Math.random()*options.length)];
task=model(sample);placed=[];edges=[];customTerms=[];seedMissing();picked=null;selectedEdge=null;connectStart=null;history=[];change();message('Wähle einen Begriff und gib ihm eine Form. Ziehe von Begriff zu Begriff, um eine Linie zu setzen.')}
function coords(ev){const c=board.createSVGPoint();c.x=ev.clientX;c.y=ev.clientY;const m=board.getScreenCTM();return m?c.matrixTransform(m.inverse()):{x:450,y:250}}
function render(){if(!task)return;$('ew-title').textContent=task.title;$('ew-story').textContent=task.story;renderBoard();renderTools();$('ew-undo').disabled=!history.length}
function renderTools(){const n=nodeById(picked);$('ew-toolbar').hidden=!!selectedEdge;$('ew-line-toolbar').hidden=!selectedEdge;
$('ew-selection-label').textContent=n?'„'+currentById(n.id).label+'“ bearbeiten':'Wähle einen Begriff auf dem Blatt';
for(const b of document.querySelectorAll('[data-ew-shape]')){b.disabled=!n;b.setAttribute('aria-pressed',String(!!n&&n.shape===b.dataset.ewShape))}
$('ew-underline').disabled=!n||n.shape!=='attribute';$('ew-underline').setAttribute('aria-pressed',String(!!n&&n.underline));
$('ew-connect').disabled=!n;$('ew-connect').classList.toggle('is-active',!!connectStart);$('ew-connect').textContent=connectStart?'Ziel anklicken …':'Verbinden';
$('ew-delete').disabled=!n||n.shape==='none';
const edge=edges.find(e=>canonical(e.a,e.b)===selectedEdge);
for(const b of document.querySelectorAll('[data-ew-card]')){b.setAttribute('aria-pressed',String(!!edge&&b.dataset.ewCard===edge.card));b.disabled=!edge} $('ew-delete-line').disabled=!edge}
function edgePoints(a,b){
 const dx=b.x-a.x,dy=b.y-a.y;
 const ratio=(n)=>{
  const d=n.shape==='relationship'?Math.abs(dx)/103+Math.abs(dy)/42:
   n.shape==='attribute'?Math.hypot(dx/93,dy/34):
   Math.max(Math.abs(dx)/91,Math.abs(dy)/(n.shape==='none'?31:34));
  return d?1/d:0;
 };
 const ra=ratio(a),rb=ratio(b),visible=ra+rb<1;
 const start=visible?ra:0,end=visible?1-rb:1;
 return {x1:a.x+start*dx,y1:a.y+start*dy,x2:a.x+end*dx,y2:a.y+end*dy};
}
function cardinality(labelGroup,points,card,edge){
 if(!card)return;
 const x=(points.x1+points.x2)/2,y=(points.y1+points.y2)/2;
 const badge=svgEl('g',edge?{'data-edge':edge,class:'ew-card-badge'}:{class:'ew-card-badge'});
 badge.append(svgEl('circle',{cx:x,cy:y,r:13,class:'ew-card-bg'}),svgEl('text',{x,y,'text-anchor':'middle','dominant-baseline':'central',class:'ew-link-label'},card));
 labelGroup.appendChild(badge);
}
function renderBoard(){
 nodesGroup.replaceChildren();linesGroup.replaceChildren();
 const labels=$('ew-labels');labels.replaceChildren();
 for(const e of edges){
  const a=nodeById(e.a),b=nodeById(e.b);if(!a||!b)continue;
  const key=canonical(e.a,e.b),active=selectedEdge===key,points=edgePoints(a,b);
  const group=svgEl('g',{'data-edge':key,role:'button',tabindex:0,'aria-label':'Verbindung '+currentById(e.a).label+' zu '+currentById(e.b).label+(e.card?', '+e.card:'')});
  group.append(svgEl('line',{...points,class:'ew-link'+(active?' is-selected':'')}),svgEl('line',{...points,stroke:'transparent','stroke-width':20}));
  group.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectEdge(key)}});
  linesGroup.appendChild(group);
  cardinality(labels,points,e.card,key);
 }
 if(drag?.active){
  const a=nodeById(drag.id);
  linesGroup.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:drag.point.x,y2:drag.point.y,class:'ew-link ew-link-preview'}));
 }
for(const n of placed){const word=currentById(n.id);if(!word)continue;const g=svgEl('g',{'data-id':n.id,'data-shape':n.shape,role:'button',tabindex:0,'aria-label':word.label+(n.shape==='none'?' ohne Form':' als '+n.shape)+(n.underline?' unterstrichen':''),class:'ew-node'+(picked===n.id||connectStart===n.id?' is-selected':'')});const shape=n.shape;let geo;
if(shape==='entity')geo=svgEl('rect',{x:n.x-91,y:n.y-34,width:182,height:68,rx:4,class:'ew-shape'});
else if(shape==='relationship')geo=svgEl('polygon',{points:(n.x+103)+','+n.y+' '+n.x+','+(n.y+42)+' '+(n.x-103)+','+n.y+' '+n.x+','+(n.y-42),class:'ew-shape'});
else if(shape==='attribute')geo=svgEl('ellipse',{cx:n.x,cy:n.y,rx:93,ry:34,class:'ew-shape'});
else geo=svgEl('rect',{x:n.x-91,y:n.y-31,width:182,height:62,rx:9,class:'ew-shape','stroke-dasharray':'6 5'});
const label=svgEl('text',{x:n.x,y:n.y+6,'text-anchor':'middle',class:n.underline?'is-underline':''},word.label);
if(word.label.length>15)label.style.fontSize='13px';else if(word.label.length>11)label.style.fontSize='15px';g.append(geo,label);
g.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectNode(n.id)}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();snapshot();n.x+=ev.key==='ArrowRight'?10:ev.key==='ArrowLeft'?-10:0;n.y+=ev.key==='ArrowDown'?10:ev.key==='ArrowUp'?-10:0;n.x=Math.max(105,Math.min(795,n.x));n.y=Math.max(54,Math.min(446,n.y));change()}});
nodesGroup.appendChild(g)}
}
function selectEdge(key){
 selectedEdge=key;picked=null;connectStart=null;renderTools();renderBoard();
 message('Linie markiert. Wähle 1, n oder m, falls die Linie eine Kardinalität braucht.');
}
function connectNodes(a,b){
 if(a===b)return;
 const key=canonical(a,b);
 connectStart=null;
 if(edges.some(e=>canonical(e.a,e.b)===key)){selectEdge(key);return}
 snapshot();edges.push({a,b,card:''});picked=null;selectedEdge=key;
 change();message('Verbindung erstellt. Wähle bei Bedarf 1, n oder m.');
}
function selectNode(id){
 if(connectStart){
  if(id===connectStart){connectStart=null;render();message('Verbindung abgebrochen.');return}
  connectNodes(connectStart,id);return;
 }
 picked=id;selectedEdge=null;renderTools();renderBoard();
 message('„'+currentById(id).label+'“ markiert. Wähle eine Form.');
}
board.addEventListener('pointerdown',ev=>{
 if(drag||ev.button!==0)return;
 const edge=ev.target.closest('[data-edge]');
 if(edge){selectEdge(edge.dataset.edge);return}
 const node=ev.target.closest('[data-id]');
 if(node){
  if(connectStart){selectNode(node.dataset.id);return}
  const point=coords(ev);
  drag={id:node.dataset.id,pointerId:ev.pointerId,start:point,point,active:false};
  selectNode(drag.id);
  board.setPointerCapture(ev.pointerId);return;
 }
 picked=null;selectedEdge=null;connectStart=null;renderTools();renderBoard();
});
board.addEventListener('pointermove',ev=>{
 if(!drag||ev.pointerId!==drag.pointerId)return;
 drag.point=coords(ev);
 if(Math.hypot(drag.point.x-drag.start.x,drag.point.y-drag.start.y)>6)drag.active=true;
 if(drag.active)renderBoard();
});
board.addEventListener('pointerup',ev=>{
 if(!drag||ev.pointerId!==drag.pointerId)return;
 const started=drag;drag=null;
 if(!started.active)return;
 const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('#ew-nodes [data-id]');
 if(target&&target.dataset.id!==started.id){connectNodes(started.id,target.dataset.id);return}
 if(!target&&board.contains(document.elementFromPoint(ev.clientX,ev.clientY))){
  const n=nodeById(started.id),p=coords(ev);
  snapshot();n.x=clamp(n.x+p.x-started.start.x,105,795);n.y=clamp(n.y+p.y-started.start.y,54,446);
  change();message('Begriff verschoben. Zum Verbinden auf einem anderen Begriff loslassen.');return;
 }
 renderBoard();
});
function cancelDrag(ev){if(drag?.pointerId===ev.pointerId){drag=null;renderBoard()}}
board.addEventListener('pointercancel',cancelDrag);
board.addEventListener('lostpointercapture',cancelDrag);
for(const b of document.querySelectorAll('[data-ew-shape]'))b.addEventListener('click',()=>{const n=nodeById(picked);if(!n)return;snapshot();n.shape=b.dataset.ewShape;if(n.shape!=='attribute')n.underline=false;change();message('Form gesetzt: '+b.textContent.trim()+'.')});
$('ew-underline').addEventListener('click',()=>{const n=nodeById(picked);if(!n||n.shape!=='attribute')return;snapshot();n.underline=!n.underline;change();message(n.underline?'Attribut unterstrichen.':'Unterstreichung entfernt.')});
$('ew-connect').addEventListener('click',()=>{if(!nodeById(picked))return;connectStart=picked;renderTools();renderBoard();message('Klicke auf den zweiten Begriff, um beide zu verbinden.')});
for(const b of document.querySelectorAll('[data-ew-card]'))b.addEventListener('click',()=>{const e=edges.find(e=>canonical(e.a,e.b)===selectedEdge);if(!e)return;snapshot();e.card=b.dataset.ewCard;change();message('Kardinalität gesetzt.')});
$('ew-delete').addEventListener('click',()=>{const n=nodeById(picked);if(!n||n.shape==='none')return;snapshot();n.shape='none';n.underline=false;change()});
$('ew-delete-line').addEventListener('click',()=>{if(!selectedEdge)return;snapshot();edges=edges.filter(e=>canonical(e.a,e.b)!==selectedEdge);selectedEdge=null;change()});
$('ew-undo').addEventListener('click',()=>{const old=history.pop();if(!old)return;placed=old.placed;edges=old.edges;customTerms=old.customTerms||[];picked=null;selectedEdge=null;connectStart=null;change();message('Letzter Schritt rückgängig gemacht.')});
$('ew-clear').addEventListener('click',()=>{if(!window.confirm('Formen und Verbindungen zurücksetzen?'))return;snapshot();placed=placed.map(n=>({...n,shape:'none',underline:false}));edges=[];picked=null;selectedEdge=null;connectStart=null;change();message('Formen und Verbindungen zurückgesetzt.')});
$('ew-custom-form').addEventListener('submit',ev=>{ev.preventDefault();const field=$('ew-custom-term'),label=field.value.trim().replace(/\s+/g,' ');if(!label)return;if(customTerms.length>=35){message('Maximal 35 eigene Begriffe pro Aufgabe möglich.');return;}snapshot();const id='custom-'+Date.now();customTerms.push({id,label:label.slice(0,45),kind:'custom'});const i=customTerms.length-1;const x=clamp(170+(i%4)*175,105,795),y=clamp(80+(Math.floor(i/4)%5)*85,54,446);placed.push({id,x,y,shape:'none',underline:false});picked=id;selectedEdge=null;connectStart=null;field.value='';change();message('Eigener Begriff „'+label+'“ hinzugefügt. Wähle jetzt Rechteck, Raute oder Oval.');});
const docSelect=$('ew-doc-task');if(docSelect){const sections=[['bib-','Bibliotheksverwaltung'],['schule-','Schulverwaltung'],['fit-','Fitnessstudio'],['auto-','Autovermietung']];for(const [prefix,label] of sections){const group=document.createElement('optgroup');group.label=label;for(const t of docScenarios.filter(s=>s.id.startsWith(prefix))){const option=document.createElement('option');option.value=t.id;option.textContent=t.title.split(' · ')[1]||t.title;group.append(option)}docSelect.append(group)}docSelect.addEventListener('change',()=>{if(docSelect.value)newTask()});}
$('ew-next').addEventListener('click',()=>{if(docSelect)docSelect.value='';newTask()});
$('ew-level').addEventListener('change',newTask);
function grade(){let done=0,max=0;const hints=[];
for(const t of task.terms){const n=nodeById(t.id);max+=2;if(n)done++;else hints.push('Begriff „'+t.label+'“ fehlt.');if(n&&n.shape===t.kind)done++;else if(n)hints.push('Form von „'+t.label+'“ prüfen.');
if(t.kind==='attribute'){max++;if(n&&n.shape==='attribute'&&n.underline===!!t.key)done++;else if(n)hints.push('Unterstreichung bei „'+t.label+'“ prüfen.')}}
const expected=new Set(task.required.map(([a,b])=>canonical(a,b)));
for(const [a,b,card] of task.required){max++;const e=edges.find(e=>canonical(e.a,e.b)===canonical(a,b));if(e)done++;else hints.push('Eine Verbindung fehlt. Prüfe die Linien.');if(card){max++;if(e&&e.card===card)done++;else hints.push('Kardinalität zwischen „'+currentById(a).label+'“ und „'+currentById(b).label+'“ prüfen.')}else if(e&&e.card)hints.push('Eine Attributlinie sollte keine Kardinalität tragen.')}
const extras=edges.filter(e=>!isCustom(e.a)&&!isCustom(e.b)&&!expected.has(canonical(e.a,e.b)));if(extras.length){max+=extras.length;hints.push('Es gibt '+extras.length+' überflüssige Verbindung(en).')}
if(edges.some(e=>{const x=task.required.find(r=>canonical(r[0],r[1])===canonical(e.a,e.b));return x&&!x[2]&&e.card})){max++;hints.push('An mindestens einer Attributlinie steht eine unnötige 1/n/m-Kardinalität.')}
const pct=Math.round(done/max*100),panel=$('ew-feedback');panel.hidden=false;panel.replaceChildren();const h=document.createElement('h3');h.textContent=pct+' % richtig · '+done+' / '+max+' Prüfpunkte';if(pct===100)h.classList.add('ew-perfect');panel.appendChild(h);
const p=document.createElement('p');p.textContent=pct===100?'Alles korrekt! Du hast die Aufgabe richtig modelliert.':'Prüfe die markierten Punkte und versuche es erneut. Die Position der Begriffe spielt für die Bewertung keine Rolle.';panel.appendChild(p);
if(hints.length){const ul=document.createElement('ul');for(const hint of [...new Set(hints)].slice(0,9)){const li=document.createElement('li');li.textContent=hint;ul.appendChild(li)}panel.appendChild(ul)}
validated=true;$('ew-solution-button').disabled=false;message('Diagramm geprüft: '+pct+' %. Du kannst weiter korrigieren.')}
$('ew-check').addEventListener('click',grade);
function showAnswer(){if(!validated)return;const svg=$('ew-solution-svg');svg.replaceChildren();const loc={a:{x:170,y:255},r:{x:450,y:255},b:{x:730,y:255},a0:{x:100,y:100},a1:{x:100,y:405},b0:{x:800,y:100},b1:{x:800,y:405},r0:{x:390,y:105},r1:{x:510,y:405}};
const labels=svgEl('g');
for(const [a,b,card]of task.required){
 const p=loc[a],q=loc[b];if(!p||!q)continue;
 const points=edgePoints({...p,shape:currentById(a).kind},{...q,shape:currentById(b).kind});
 svg.appendChild(svgEl('line',{...points,stroke:'#87c9c0','stroke-width':2}));
 cardinality(labels,points,card);
}
for(const t of task.terms){const p=loc[t.id];if(!p)continue;let el;if(t.kind==='entity')el=svgEl('rect',{x:p.x-98,y:p.y-38,width:196,height:76,rx:3,fill:'#20464d',stroke:'#8fdfd2','stroke-width':2});
else if(t.kind==='relationship')el=svgEl('polygon',{points:(p.x+105)+','+p.y+' '+p.x+','+(p.y+45)+' '+(p.x-105)+','+p.y+' '+p.x+','+(p.y-45),fill:'#40382a',stroke:'#eabe77','stroke-width':2});
else el=svgEl('ellipse',{cx:p.x,cy:p.y,rx:96,ry:34,fill:'#202f43',stroke:'#a9c6dc','stroke-width':2});
svg.appendChild(el);const label=svgEl('text',{x:p.x,y:p.y+5,fill:'#f5fbf5','text-anchor':'middle','font-size':t.label.length>13?13:16},t.label);if(t.key)label.style.textDecoration='underline';svg.appendChild(label)}
svg.appendChild(labels);
$('ew-solution').hidden=false;$('ew-solution-button').disabled=true;message('Musterdiagramm eingeblendet.')}
$('ew-solution-button').addEventListener('click',showAnswer);
if(!restore()){const initial=scenarios.find(s=>s.level==='medium');task=model(initial);seedMissing();persist()}render();
message('Wähle einen Begriff und gib ihm eine Form. Ziehe zum Verbinden von Begriff zu Begriff.'); 
// Hook for deterministic UI regression tests; never contains personally identifying data.
window.__EW_INSPECT__=()=>({taskId:task.id,placed:placed.map(n=>({...n})),edges:edges.map(e=>({...e})),validated});
})();
