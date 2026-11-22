/* Topic content. The shared module supplies rendering, progress and exams. */
const LESSONS=__LESSONS__;
const CATS=LESSONS.map(c=>[c.cat,c.title]);
const CATNAME=Object.fromEntries(CATS);
const HINT=Object.fromEntries(LESSONS.map(c=>[c.cat,c.memo]));
const STAGES=LESSONS.map((c,i)=>({...c,ch:'ch'+(i+1)}));
const FMT={text:'Groß- und Kleinschreibung spielt bei Begriffen keine Rolle.',sql:'SQL eingeben. Groß- und Kleinschreibung in Schlüsselwörtern ist egal.',order:'Gib die Buchstaben in der richtigen Reihenfolge ein, etwa CADB.'};
const PH={text:'Deine Antwort',sql:'Dein SQL',order:'z. B. CADB'};
const sqlTokens=s=>String(s).trim().replace(/;$/,'').match(/'(?:''|[^'])*'|[a-zA-Z_][a-zA-Z_0-9]*|\d+|>=|<=|<>|\S/g)?.map(x=>x.startsWith("'")?x:x.toLowerCase()).join(' ');
const fold=s=>String(s).trim().toLowerCase().replaceAll('ä','ae').replaceAll('ö','oe').replaceAll('ü','ue').replaceAll('ß','ss').replace(/\s+/g,' ').replace(/[.!?]$/,'');
function parseAnswer(t,raw){
 const given=String(raw??'').trim();
 if(!given)return {valid:false,msg:'Erst eine Antwort eingeben. Nichts wurde gewertet.'};
 if(t.kind==='order'){
  const v=given.toUpperCase().replace(/[\s,;\-]/g,'');
  const expected='ABCDE'.slice(0,t.answer.length);
  if([...v].sort().join('')!==expected)return {valid:false,msg:'Verwende jeden angebotenen Buchstaben genau einmal.'};
  return {valid:true,ok:v===t.answer,given:v};
 }
 if(t.kind==='sql')return {valid:true,ok:sqlTokens(given)===sqlTokens(t.answer),given};
 const expected=t.accept??[t.answer];
 const key=s=>fold(s).replace(/^(der|die|das) /,'').replace(/^(erste|zweite|dritte) normalform$/,x=>({'erste normalform':'1nf','zweite normalform':'2nf','dritte normalform':'3nf'}[x])).replace(/^(\d+)\s*,\s*(\d+)$/,'$1.$2').replace(/\s*:\s*/g,':');
 return {valid:true,ok:expected.some(x=>key(given)===key(x)),given};
}
function toTask(row){
 const [id,form,scene,question,simple,solution,why,wrongs]=row;
 const a=rint(2,12),b=a===2?1:rint(1,a-1);
 const values={a,b,avg:(a+b)/2,winner:rnd(2)+1,plus:a+1};
 // Vary the higher ticket ID independently of its duration.
 if(id==='sel_out'&&values.winner===2){values.a=b;values.b=a}
 const fill=s=>s.replace(/\{(\w+)\}/g,(_,k)=>String(values[k]));
 const scenario=fill(scene);
 const prompt=fill(question), plain=fill(simple);
 const answer=fill(solution);
 const common={scenario,prompt,plain,why:fill(why),form,key:id+'|'+scenario};
 if(form==='mc')return {...mc(prompt,answer,wrongs.split('>'),why),...common};
 if(form==='order'){
  const steps=solution.split('>'), letters='ABCDE';
  const indexes=shuffle(steps.map((_,i)=>i));
  return {...common,kind:'order',answer:steps.map((_,i)=>letters[indexes.indexOf(i)]).join(''),
   scenario:scenario+'<ol class="sql-order">'+indexes.map((i,n)=>'<li><b>'+letters[n]+'</b> '+steps[i]+'</li>').join('')+'</ol>'};
 }
 const kind=['write','fix'].includes(form)?'sql':'text';
 const accept=id==='norm_3'?[answer,'transitive Abhängigkeit']:undefined;
 return {...common,kind,answer,accept};
}
const TASK_LABELS=__LABELS__;
const SUBS=__TASKS__.map((row,i)=>({id:row[0],form:row[1],cat:LESSONS[Math.floor(i/6)].cat,
 label:TASK_LABELS[i], min:Math.floor(i/6)+1,f:()=>toTask(row)}));
const recentRuns=new WeakMap();
function genTask(cat,level=2,recent,subId){
 if(SUBS.some(s=>s.id===cat)){subId=cat;cat=null}
 const eligible=SUBS.filter(s=>subId?s.id===subId:!cat||cat==='mix'||cat==='all'||s.cat===cat);
 if(!eligible.length)throw new Error('Unbekannter Aufgabentyp: '+(subId||cat));
 let type=pick(eligible);
 if(recent&& !subId){
  let runs=recentRuns.get(recent);
  if(!runs){runs=new Map();recentRuns.set(recent,runs)}
  const key=cat||'all';
  if(!runs.has(key)){
   // Build a circular order with different forms next to each other.
   let queue;
   do {
    const pool=shuffle(eligible);
    queue=[];
    while(pool.length){
     const i=pool.findIndex(t=>t.form!==queue.at(-1)?.form);
     if(i<0)break;
     queue.push(pool.splice(i,1)[0]);
    }
   } while(queue.length!==eligible.length||queue[0].form===queue.at(-1).form);
   runs.set(key,queue);
  }
  const queue=runs.get(key);
  type=queue.shift();
  queue.push(type);
 }
 return {...type.f(level),cat:type.cat,sub:type.id,subLabel:type.label};
}
function scenarioHtml(t){return '<div class="scenario"><strong>AUSGANGSLAGE</strong>'+t.scenario+'</div>'}
function helpHtml(t,id){return ' <span class="qhelp" tabindex="0" role="button" aria-label="Frage einfach erklärt" aria-describedby="'+id+'"><span class="qmark" aria-hidden="true">?</span><span class="qtip" role="tooltip" id="'+id+'"><strong>Einfach gesagt:</strong> '+t.plain+'</span></span>'}
const Q_OK=['Richtig. Das Ticket darf zu.','Passt. Die Tabellen kommen miteinander klar.','Sauber. Das hätte im Wochenbericht gestimmt.','Treffer. Die richtige Zeile hat es erwischt.'];
const Q_MASTER=['Stufe gemeistert. Die nächste ist freigeschaltet.','Acht von zehn ohne Hilfe. Kannst du so ins Ticket schreiben.'];
const qOk=()=>window.DTPRightAnswer.next(Q_OK),qBad=()=>window.DTPWrongAnswer.next();
