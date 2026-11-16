/* Chen-Notation: Entity – relationship – entity, with connected attributes. */
const ER_CASES=[
 ['Schule','Dozierende unterrichten Fächer. Die Personalnummer identifiziert den Dozenten, der Fachcode das Fach. Das Fach hat außerdem eine Bezeichnung.',
  ['Dozent','unterrichtet','Fach','Personalnummer','Fachcode','Fachbezeichnung']],
 ['Bibliothek','Mitglieder leihen Exemplare aus. Die Mitgliedsnummer identifiziert das Mitglied, der Barcode das Exemplar. Am Exemplar ist der Zustand erfasst.',
  ['Mitglied','leiht aus','Exemplar','Mitgliedsnummer','Barcode','Zustand']],
 ['Helpdesk','Teams bearbeiten Tickets. Der Teamcode identifiziert das Team, die Ticketnummer das Ticket. Jedes Ticket hat einen Betreff.',
  ['Team','bearbeitet','Ticket','Teamcode','Ticketnummer','Betreff']],
 ['Werkstatt','Mechaniker betreuen Fahrzeuge. Die Personalnummer identifiziert den Mechaniker, die Fahrgestellnummer das Fahrzeug. Beim Fahrzeug wird das Baujahr erfasst.',
  ['Mechaniker','betreut','Fahrzeug','Personalnummer','Fahrgestellnummer','Baujahr']],
 ['Musikschule','Schüler belegen Kurse. Die Schülernummer identifiziert den Schüler, die Kursnummer den Kurs. Für den Kurs wird auch der Raum erfasst.',
  ['Schüler','belegt','Kurs','Schülernummer','Kursnummer','Raum']],
 ['Gärtnerei','Betriebe liefern Pflanzen. Die Betriebsnummer identifiziert den Betrieb, die Pflanzen-ID die Pflanze. Zu jeder Pflanze wird die Blütezeit erfasst.',
  ['Betrieb','liefert','Pflanze','Betriebsnummer','Pflanzen-ID','Blütezeit']],
];
const ER_SLOTS=[
 ['entity','Entität links'],['relation','Beziehung'],['entity','Entität rechts'],
 ['key','Schlüssel links'],['key','Schlüssel rechts'],['attribute','Attribut rechts'],
];
let erOrder=[],erCase,erRound=0,erSelected=null,erGiven=[],erDone=false;
const erBoard=$('erBoard'),erBank=$('erBank'),erFeedback=$('erFeedback');
function erRender(){
 const [, , terms]=erCase;
 erBank.querySelectorAll('button').forEach(b=>{
  const i=Number(b.dataset.term);
  b.disabled=erDone||erGiven.includes(i);
  b.setAttribute('aria-pressed',String(erSelected===i));
 });
 erBoard.querySelectorAll('button').forEach((b,i)=>{
  const word=erGiven[i]!==undefined?terms[erGiven[i]]:'';
  b.querySelector('span').textContent=word||ER_SLOTS[i][1];
  b.setAttribute('aria-label',ER_SLOTS[i][1]+(word?', '+word:''));
  b.disabled=erDone;
  b.dataset.grade=erDone?(erGiven[i]===i?'right':'wrong'):'';
 });
 $('erCheck').disabled=erDone||erGiven.filter(x=>x!==undefined).length!==ER_SLOTS.length;
}
function erNew(){
 if(!erOrder.length){
  erOrder=shuffle(ER_CASES);
  if(erOrder[0]===erCase)erOrder.push(erOrder.shift());
 }
 erCase=erOrder.shift();
 erGiven=[];erSelected=null;erDone=false;
 $('trainNo').textContent='RUNDE '+(++erRound);
 $('erCase').textContent=erCase[0]+' – '+erCase[1];
 erFeedback.textContent='';
 erBank.innerHTML=shuffle(erCase[2].map((_,i)=>i)).map(i=>'<button type="button" class="btn ghost" data-term="'+i+'">'+esc(erCase[2][i])+'</button>').join('');
 erRender();
}
erBank.addEventListener('click',event=>{
 const b=event.target.closest('[data-term]');if(!b||b.disabled||erDone)return;
 const index=Number(b.dataset.term);
 erSelected=erSelected===index?null:index;
 erFeedback.textContent=erSelected===null?'Auswahl aufgehoben.':'Gewählt: '+erCase[2][erSelected]+'. Wähle jetzt eine Form.';
 erRender();
});
erBoard.addEventListener('click',event=>{
 const b=event.target.closest('[data-slot]');if(!b||erDone)return;
 const i=Number(b.dataset.slot);
 if(erSelected===null){
  if(erGiven[i]===undefined){erFeedback.textContent='Wähle zuerst einen Begriff.';return;}
  delete erGiven[i];erFeedback.textContent='Begriff zurückgelegt.';
 }else{
  erGiven[i]=erSelected;erSelected=null;
  erFeedback.textContent='Begriff eingesetzt. Tipp: Antippen legt ihn zurück.';
 }
 erRender();
});
$('erCheck').addEventListener('click',()=>{
 if(erDone||$('erCheck').disabled)return;
 erDone=true;
 const terms=erCase[2],correct=erGiven.filter((v,i)=>v===i).length;
 // Diagram slots are a separate practice activity and do not change the scored question pool.
 const feedback=ER_SLOTS.map(([,label],i)=>'<li><strong>'+esc(label)+'</strong> – '+(erGiven[i]===i?'✓ '+esc(terms[i]):'✗ '+esc(terms[erGiven[i]])+' → '+esc(terms[i]))+'</li>').join('');
 erFeedback.innerHTML='<strong>'+correct+' von '+terms.length+' richtig.</strong><ul>'+feedback+'</ul>';
 erRender();
});
$('erNext').addEventListener('click',()=>{erNew();erBank.querySelector('button').focus()});
