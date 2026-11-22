/* CS1 pilot: bounded answers, shared by every task renderer. Internal IDs and scoring remain. */
const CLOZE_FACTS=[
 ['EVA steht für {0}, {1} und {2}.',['Eingabe','Verarbeitung','Ausgabe'],['Speicherung','Übersetzung','Deklaration']],
 ['Ein Algorithmus ist eine {0} von Schritten zur {1} einer Aufgabe.',['eindeutige Folge','Lösung'],['zufällige Auswahl','Speicherung','Übersetzung']],
 ['Die {0} beschreibt die Schreibregeln. Die {1} beschreibt die Bedeutung von Anweisungen.',['Syntax','Semantik'],['Deklaration','Initialisierung','Kompilierung']],
 ['Die CPU führt {0} aus. C#-Quelltext muss deshalb zunächst {1} werden.',['Maschinencode','übersetzt'],['Quelltext','IL-Code','formatiert','kommentiert']],
 ['Ein Compiler kann {0} bereits {1} erkennen.',['Syntaxfehler','vor der Ausführung'],['logische Fehler','während der Ausführung','nach der Ausgabe']],
 ['Mit einem Interpreter lassen sich Änderungen {0} testen; ein eigener {1} ist dafür nicht erforderlich.',['direkt','Build-Schritt'],['erst nach dem Kompilieren','Programmlauf','Quelltext']],
 ['Der C#-Compiler prüft den Quelltext {0}. Ein Syntaxfehler verhindert {1}.',['vor dem Programmstart','einen erfolgreichen Build'],['nach dem Programmstart','die Texteingabe','die Speicherung des Quelltexts']]
];
const TERM_BANK={welt:['Algorithmus','Programm','Programmiersprache','Maschinencode','Syntax','Semantik','Eingabe','Verarbeitung','Ausgabe'],uebersetzen:['Compiler','Interpreter','JIT','CLR','IL','SDK','Runtime','Quelltext','Maschinencode'],grund:['WriteLine','Write','ReadLine','Console','Kommentar','Anweisung','Semikolon'],typen:['int','double','decimal','string','char','bool','float','long'],daten:['Deklaration','Initialisierung','Zuweisung','Konstante','Variable','int','string'],umwandeln:['Parse','TryParse','Convert.ToInt32','ToString','int','double'],rechnen:['&&','||','!','==','!=','<','>','<=','>=','%','/','*','+','-'],wenn:['if','else','switch','case','break','true','false'],schleife:['for','while','do','foreach','break','continue'],liste:['Length','Count','return','void','int','static','Add','Remove']};
function tokenAlternatives(token){
 const comparisons={'<':['<=','>'],'<=':['<','>'],'>':['>=','<'],'>=':['>','<'],'==':['=','!='],'!=':['==','=']};
 if(comparisons[token])return comparisons[token];
 const sets=[['int','double','decimal','string','char','bool','long'],['WriteLine','Write','ReadLine'],['Length','Count','Capacity'],['if','while','for','foreach','switch'],['return','break','continue','void'],['true','false','null'],['==','!=','<=','>=','<','>'],['+','-','*','/','%'],['&&','||','!'],['=','==','+=','-='],['//','/*','*/',';'],['Parse','TryParse','ToString'],['Console','console','CONSOLE'],['(',')','[',']'],[';',':',',']];
 if(/^".*"$/.test(token))return [token.slice(1,-1),"'"+token.slice(1,-1)+"'",'null'];
 if(/^\d+(\.\d+)?$/.test(token))return [String(Number(token)+1),String(Number(token)-1),'0','1'];
 return sets.find(g=>g.includes(token))?.filter(x=>x!==token)||[];
}
function prepareInteraction(id,t){
 // No scenario jokes are injected. Free explanations become reviewed sentence templates.
 if(t.kind==='free'){
  const pool=id==='w_frei'?W_FREI:U_FREI,ix=pool.findIndex(r=>r[0]===t.prompt)+(id==='u_frei'?4:0);
  const [sentence,answers,wrong]=CLOZE_FACTS[ix];
  t={...t,kind:'cloze',prompt:'Ergänze den Fachtext mit den passenden Begriffen.',plain:'Setze die Begriffe in die Lücken. Einige Begriffe bleiben übrig.',answer:JSON.stringify(answers),sentence,slots:answers,bank:shuffle([...answers,...wrong]),show:esc(sentence.replace(/\{(\d+)\}/g,(_,n)=>answers[n]))};
 }else if(t.kind==='code'){
  // Replace up to three distinct tokens; reconstruction still uses the original compiler-checked answer.
  const lex=s=>[...String(s).matchAll(/"(?:\\.|[^"\\])*"|\b[A-Za-z_]\w*\b|\d+(?:\.\d+)?|==|!=|<=|>=|&&|\|\||[+*/%<>!=;()]/g)].map(m=>m[0]);
  const tokens=lex(t.answer),original=lex(t.snippet||'');
  const priorities={l_off:['<','<='],a_laenge:['Count','Length'],m_return:['return'],o_klammer:['(',')'],g_fix:['Console','WriteLine','"Hallo"',';'],o_zuw:['+','-','*','='],k_cast:['int'],l_kopf:['<','<=','0','1']};
  const changed=t.snippet&&!t.snippet.includes('____')?tokens.filter(x=>!original.includes(x)):[];
  const ordered=[...changed,...(priorities[id]||[]).filter(x=>tokens.includes(x)),...tokens];
  const selected=[...new Set(changed.length?changed:priorities[id]?.some(x=>tokens.includes(x))?priorities[id].filter(x=>tokens.includes(x)):ordered)].filter(x=>tokenAlternatives(x).length).slice(0,3);
  if(!selected.length)selected.push(...[...new Set(ordered)].filter(x=>tokenAlternatives(x).length).slice(0,3));
  if(!selected.length)selected.push(String(t.answer));
  let sentence=String(t.answer),slots=[],bank=[];
  // Use literal pieces rather than replacing placeholders again.
  const re=new RegExp(selected.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length).join('|'),'g');
  sentence=sentence.replace(re,(token,offset,source)=>{
   if(/[A-Za-z0-9_]/.test(token[0])&&(/[A-Za-z0-9_]/.test(source[offset-1]||'')||/[A-Za-z0-9_]/.test(source[offset+token.length]||'')))return token;
   if(slots.length>=3)return token;
   const n=slots.length;slots.push(token);bank.push(token,...tokenAlternatives(token).slice(0,2));return '{'+n+'}';
  });
  if(!slots.length){sentence='{0}';slots=[String(t.answer)];bank=[String(t.answer),...tokenAlternatives(String(t.answer))]}
  Object.assign(t,{sentence,slots,bank:shuffle([...new Set(bank)]),prompt:'Ergänze den C#-Code mit den passenden Bausteinen.',plain:'Wähle die Bausteine und setze sie in die Lücken des Lösungscodes.'});
 }else if(t.kind==='text'||t.kind==='out'){
  const a=String(t.answer);let wrong=[];
  if(t.kind==='out'){
   if(/^(true|false)$/i.test(a))wrong=[a.toLowerCase()==='true'?(a==='True'?'False':'false'):(a==='False'?'True':'true'),'0','1'];
   else if(/^-?\d+(?:[.,]\d+)?$/.test(a)){const n=Number(a.replace(',','.'));wrong=[String(n+1),String(n-1),String(n*2),String(n===0?2:0)]}
   else {const parts=a.split(' ');wrong=[parts.slice().reverse().join(' '),parts.slice(0,-1).join(' '),a.replace(/ /g,''),a+' '+a];if(parts.length===1)wrong=[a+' Ende','Start '+a,a+' '+a,'Keine Ausgabe']}
  }else {
   if(/^-?\d+(?:[.,]\d+)?$/.test(a)){const n=Number(a.replace(',','.'));wrong=[String(n+1),String(n-1),String(n*2),'0','1']}
   else if(/^(ja|nein)$/i.test(a))wrong=['ja','nein'];
   else if(id==='u_sprache')wrong=['kompiliert','interpretiert'];
   else if(id==='i_wort')wrong=['else','if','else if','default','break','continue','true','false'];
   else if(id==='l_welche')wrong=['for','while','do while','foreach'];
   else if(id==='k_wann')wrong=['beim Kompilieren','beim Ausführen','gar nicht'];
   else if(id==='k_methode')wrong=['int.Parse','double.Parse','Console.ReadLine','Console.WriteLine','ToString','Math.Round'];
   else if(id==='o_operator')wrong=['%','/','*','+','==','!=','&&','||','!','++','--'].sort(()=>Math.random()-.5);
   else if(id==='m_teile')wrong=['int','void','bool','double','string'].includes(a)?['int','void','bool','double','string']:['port','name','text','Gruss','IstAktiv','Summe','Mittel'];
   else wrong=TERM_BANK[t.cat]||Object.values(TERM_BANK).flat();
  }
  wrong=[...new Set(wrong)].filter(x=>x&&x!==a&&!parseAnswer(t,x).ok).slice(0,4);
  Object.assign(t,{sentence:t.kind==='out'?'Konsolenausgabe: {0}':'Antwort: {0}',slots:[a],bank:shuffle([a,...wrong])});
 }
 if(t.kind==='order'){t.show=t.answer.split('').map((key,i)=>(i+1)+'. '+esc(t.items[LETTERS.indexOf(key)])).join('<br>');t.prompt='Bringe die Schritte in die fachlich richtige Reihenfolge.';t.plain='Verschiebe die Karten. Der erste Schritt steht oben.'}
 if(t.kind==='set'){t.show=t.answer.split('').map(key=>esc(t.items[LETTERS.indexOf(key)])).join('<br>');t.plain='Wähle alle fachlich zutreffenden Aussagen aus.'}
 return t;
}
function interactionInstruction(t,exam=false){const end=exam?' Änderungen werden automatisch für diese Prüfung gespeichert. Bewertet wird erst bei Abgabe.':' Anschließend „Antwort prüfen“ wählen.';return (t.kind==='order'?'Karten ziehen oder mit „Hoch“ und „Runter“ verschieben.':t.kind==='set'?'Wähle alle zutreffenden Aussagen.':'Begriff ziehen oder erst eine Lücke, dann einen Begriff anklicken. Begriffe können mehrfach verwendet werden; Ablenker bleiben übrig.')+end}
function interactionHtml(t,id,exam){return '<section class="answer-section"'+(exam?'':' data-r="form"')+'><strong class="task-label">Deine Antwort</strong><p class="fmt"'+(exam?' id="exFmt"':'')+'>'+interactionInstruction(t,exam)+'</p><div class="bounded-answer" id="'+id+'" data-answer'+(exam?' data-exam':'')+' tabindex="-1"></div>'+(exam?'':'<button type="button" class="btn primary" data-r="check">Antwort prüfen</button>')+'</section>'}
function mountInteraction(host,t,saved){
 const el=host.querySelector('[data-answer]');if(!el)return;
 let values=t.kind==='order'?(saved?String(saved).split(''):t.items.map((_,i)=>LETTERS[i])):t.kind==='set'?(saved?String(saved).split(''):[]):Array(t.slots.length).fill(null);
 if(saved&&t.slots){if(t.kind==='cloze'){try{values=JSON.parse(saved)}catch(_){}}else if(t.kind==='code'){
  // Encode selected slots in memory on the task; persisted exam answer is the reconstructed source.
  values=t._slotValues?.slice()||values;
 }else values=[String(saved)]}
 if(t.slots&&t._slotValues)values=t._slotValues.slice();
 let active=0,dragged=null;
 const raw=()=>t.kind==='order'?values.join(''):t.kind==='set'?values.slice().sort().join(''):values.some(x=>x==null)?'':t.kind==='cloze'?JSON.stringify(values):(t.kind==='text'||t.kind==='out')?values[0]:t.sentence.replace(/\{(\d+)\}/g,(_,i)=>values[i]);
 function emit(){el.value=raw();if(t.slots)t._slotValues=values.slice();el.dispatchEvent(new Event('input',{bubbles:true}))}
 function move(from,to){if(el.disabled||from===to||to<0||to>=values.length)return;values.splice(to,0,values.splice(from,1)[0]);draw();emit();el.querySelector('[data-row="'+to+'"] button')?.focus({preventScroll:true})}
 function put(i,value){if(el.disabled)return;values[i]=value;active=Math.min(i+1,values.length-1);draw();emit()}
 function draw(){
  if(t.kind==='order')el.innerHTML='<ol class="sort-cards">'+values.map((key,i)=>'<li draggable="true" data-row="'+i+'"><span class="sort-number">'+(i+1)+'</span><code>'+esc(t.items[LETTERS.indexOf(key)])+'</code><span class="sort-controls"><button type="button" data-move="'+i+'" data-dir="-1" aria-label="Schritt '+(i+1)+' hoch" '+(i===0?'disabled':'')+'>Hoch</button><button type="button" data-move="'+i+'" data-dir="1" aria-label="Schritt '+(i+1)+' runter" '+(i===values.length-1?'disabled':'')+'>Runter</button></span></li>').join('')+'</ol>';
  else if(t.kind==='set')el.innerHTML='<div class="statement-list">'+t.items.map((x,i)=>'<button type="button" data-statement="'+LETTERS[i]+'" aria-pressed="'+values.includes(LETTERS[i])+'"><span aria-hidden="true">'+(values.includes(LETTERS[i])?'☑':'☐')+'</span><span>'+esc(x)+'</span></button>').join('')+'</div>';
  else el.innerHTML='<div class="cloze-text'+(t.kind==='code'?' cloze-code':'')+'">'+t.sentence.split(/(\{\d+\})/).map(part=>{const m=/^\{(\d+)\}$/.exec(part);return m?'<button type="button" data-slot="'+m[1]+'" class="gap-slot'+(Number(m[1])===active?' active':'')+'" aria-label="Lücke '+(Number(m[1])+1)+': '+esc(values[m[1]]||'leer')+'">'+esc(values[m[1]]??('Lücke '+(Number(m[1])+1)))+'</button>':esc(part)}).join('')+'</div><div class="word-bank" role="group" aria-label="Verfügbare Begriffe">'+t.bank.map((x,i)=>'<button type="button" draggable="true" data-term="'+i+'">'+esc(x)+'</button>').join('')+'</div>';
 }
 el.addEventListener('click',e=>{if(el.disabled)return;const b=e.target.closest('button');if(!b)return;
  if(b.dataset.move!=null)move(Number(b.dataset.move),Number(b.dataset.move)+Number(b.dataset.dir));
  if(b.dataset.statement){const v=b.dataset.statement;values=values.includes(v)?values.filter(x=>x!==v):[...values,v];draw();emit();el.querySelector('[data-statement="'+v+'"]')?.focus({preventScroll:true})}
  if(b.dataset.slot!=null){active=Number(b.dataset.slot);draw();el.querySelector('[data-slot="'+active+'"]')?.focus({preventScroll:true})}
  if(b.dataset.term!=null){put(active,t.bank[Number(b.dataset.term)]);el.querySelector('[data-slot="'+active+'"]')?.focus({preventScroll:true})}
 });
 el.addEventListener('dragstart',e=>{if(el.disabled){e.preventDefault();return}const term=e.target.closest('[data-term]'),row=e.target.closest('[data-row]');dragged=term?{term:Number(term.dataset.term)}:row?{row:Number(row.dataset.row)}:null;if(dragged)e.dataTransfer.setData('text/plain',JSON.stringify(dragged))});
 el.addEventListener('dragover',e=>{if(!el.disabled&&e.target.closest('[data-slot],[data-row]'))e.preventDefault()});
 el.addEventListener('drop',e=>{if(el.disabled||!dragged)return;e.preventDefault();const slot=e.target.closest('[data-slot]'),row=e.target.closest('[data-row]');if(slot&&dragged.term!=null)put(Number(slot.dataset.slot),t.bank[dragged.term]);if(row&&dragged.row!=null)move(dragged.row,Number(row.dataset.row));dragged=null});
 el.addEventListener('dragend',()=>{dragged=null});draw();el.value=saved||(t.kind==='order'&&!el.hasAttribute('data-exam')?raw():'');
}

function readableGiven(t,given){
 if(t.kind==='order'||t.kind==='set')return String(given).split('').map(k=>t.items[LETTERS.indexOf(k)]||k).join(' → ');
 if(t.kind==='cloze'){try{const a=JSON.parse(given);return t.sentence.replace(/\{(\d+)\}/g,(_,i)=>a[i])}catch(_){return String(given)}}
 return String(given);
}
