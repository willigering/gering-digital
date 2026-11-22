const DATA={
 team:[{id:10,name:'Netzwerk'},{id:20,name:'Clients'},{id:30,name:'Backup'}],
 ticket:[
  {id:1,titel:'WLAN',team_id:10,status:'offen',minuten:15},
  {id:2,titel:'Switch',team_id:10,status:'offen',minuten:45},
  {id:3,titel:'Drucker',team_id:20,status:'zu',minuten:20},
  {id:4,titel:'VPN',team_id:10,status:'zu',minuten:null}
 ]
};
const COLUMNS={team:Object.keys(DATA.team[0]),ticket:Object.keys(DATA.ticket[0])};
const sqlTable=(headers,rows)=>'<div class="table-wrap"><table class="t"><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x??'NULL')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
function labSql(input){
 const tokens=(sqlTokens(input)||'').match(/'(?:''|[^'])*'|\S+/g)||[];
 let at=0;
 const take=x=>tokens[at]===x&&(at++,true);
 const need=x=>{if(!take(x))throw Error('Erwartet: '+x.toUpperCase())};
 const id=()=>{const v=tokens[at++];if(!/^[a-z_][a-z_0-9]*$/.test(v??''))throw Error('Hier fehlt ein Name.');return v};
 const column=()=>{const a=id();return take('.')?a+'.'+id():a};
 const expr=()=>{
  if(take('*'))return {key:'*'};
  const op=tokens[at];
  if(!['count','sum','avg'].includes(op)||tokens[at+1]!=='(')return {key:column()};
  at+=2;
  const key=take('*')?'*':column();
  if(key==='*'&&op!=='count')throw Error('Nur COUNT akzeptiert *.');
  need(')');
  return {op,key};
 };
 const list=fn=>{const a=[fn()];while(take(','))a.push(fn());return a};
 const table=()=>{const name=id();if(!Object.hasOwn(DATA,name))throw Error('Die Tabelle '+name+' gibt es hier nicht.');return name};
 const literal=()=>{
  const v=tokens[at++];
  if(v==='null')return null;
  if(/^'(?:''|[^'])*'$/.test(v??''))return v.slice(1,-1).replaceAll("''","'");
  if(/^\d+$/.test(v??''))return Number(v);
  throw Error('Hier wird eine ganze Zahl, NULL oder Text in einfachen Anführungszeichen erwartet.');
 };
 const condition=(lhs,columnsOnly=false)=>{
  const left=lhs();
  if(take('is')){const negate=take('not');need('null');return rows=>(left(rows)!==null)===negate}
  const op=tokens[at++];
  const compare={'=':(a,b)=>a===b,'<>':(a,b)=>a!==b,'>':(a,b)=>a>b,'<':(a,b)=>a<b,'>=':(a,b)=>a>=b,'<=':(a,b)=>a<=b}[op];
  if(!compare)throw Error('Unbekannter Vergleich.');
  const v=tokens[at]??'';
  const right=columnsOnly||(/^[a-z_]/.test(v)&&v!=='null')?lhs():((x)=>()=>x)(literal());
  return rows=>{const a=left(rows),b=right(rows);return a!==null&&b!==null&&typeof a===typeof b&&compare(a,b)};
 };
 const finish=()=>{if(at!==tokens.length)throw Error('Das Labor unterstützt diesen Teil der Abfrage nicht: '+tokens[at])};
 if(!take('select')){
  const db=structuredClone(DATA);
  const action=tokens[at++];
  if(!['insert','update','delete'].includes(action))throw Error('Erlaubt sind SELECT, INSERT, UPDATE und DELETE im Übungsdatensatz.');
  if(action==='insert'){
   need('into');need('ticket');need('(');
   const fields=list(id);need(')');need('values');need('(');
   const values=list(literal);need(')');finish();
   if(fields.length!==values.length||new Set(fields).size!==fields.length||fields.some(x=>!COLUMNS.ticket.includes(x)))throw Error('Spalten und Werte passen nicht zusammen.');
   const row=Object.assign({status:'offen',minuten:null},Object.fromEntries(fields.map((f,i)=>[f,values[i]])));
   if(!Number.isSafeInteger(row.id)||row.id<1||db.ticket.some(t=>t.id===row.id))throw Error('id muss ganzzahlig, positiv und eindeutig sein.');
   if(!db.team.some(t=>t.id===row.team_id)||typeof row.titel!=='string')throw Error('Ein Ticket benötigt einen Titel und eine vorhandene Team-ID.');
   if(!['offen','zu'].includes(row.status)||(row.minuten!==null&&(!Number.isSafeInteger(row.minuten)||row.minuten<0)))throw Error('Erlaubt sind offen oder zu sowie eine nichtnegative Dauer oder NULL.');
   db.ticket.push(row);
   return {headers:COLUMNS.ticket,rows:db.ticket.map(r=>COLUMNS.ticket.map(c=>r[c])),note:'1 Zeile eingefügt. Der Startdatensatz bleibt erhalten.'};
  }
  if(action==='delete')need('from');
  need('ticket');
  let status;
  if(action==='update'){need('set');need('status');need('=');status=literal();if(!['offen','zu'].includes(status))throw Error("Erlaubte Statuswerte sind 'offen' und 'zu'.")}
  let predicate=()=>true;
  if(take('where')){need('id');need('=');const target=literal();if(!Number.isSafeInteger(target))throw Error('Für id wird eine ganze Zahl benötigt.');predicate=row=>row.id===target}
  finish();
  const count=db.ticket.filter(predicate).length;
  if(action==='update')db.ticket.forEach(row=>{if(predicate(row))row.status=status});
  else db.ticket=db.ticket.filter(row=>!predicate(row));
  return {headers:COLUMNS.ticket,rows:db.ticket.map(r=>COLUMNS.ticket.map(c=>r[c])),note:count+' betroffene Zeile(n). Der Startdatensatz bleibt erhalten.'};
 }
 const select=list(expr);need('from');
 const first=table(), names=[first];
 const resolve=key=>{
  const parts=key.split('.');
  const candidates=parts.length===2?names.filter(n=>n===parts[0]&&COLUMNS[n].includes(parts[1])):names.filter(n=>COLUMNS[n].includes(key));
  if(candidates.length!==1)throw Error('Unbekannte oder mehrdeutige Spalte: '+key);
  const col=candidates[0]+'.'+parts.at(-1);
  return row=>row[col];
 };
 const flatten=(name,row)=>Object.fromEntries(COLUMNS[name].map(k=>[name+'.'+k,row?.[k]??null]));
 let rows=DATA[first].map(row=>flatten(first,row));
 const joinType=take('left')?'left':take('inner')?'inner':null;
 if(joinType||tokens[at]==='join'){
  need('join');const second=table();if(first===second)throw Error('Das Labor unterstützt Joins zwischen team und ticket.');
  names.push(second);need('on');
  const joinTerms=[condition(()=>{const get=resolve(column());return group=>get(group[0])},true)];
  while(take('and'))joinTerms.push(condition(()=>{const get=resolve(column());return group=>get(group[0])}));
  rows=rows.flatMap(row=>{
   const matches=DATA[second].map(r=>({...row,...flatten(second,r)})).filter(r=>joinTerms.every(test=>test([r])));
   return matches.length||joinType!=='left'?matches:[{...row,...flatten(second,null)}];
  });
 }
 const valueOf=({key,op})=>{
  const get=key==='*'?()=>1:resolve(key);
  if(!op)return group=>get(group[0]);
  return group=>{
   const values=group.map(get).filter(v=>v!==null);
   if(op==='count')return values.length;
   if(values.some(v=>typeof v!=='number'))throw Error('SUM und AVG brauchen eine Zahlenspalte.');
   if(!values.length)return null;
   const sum=values.reduce((a,b)=>a+b,0);
   return op==='avg'?sum/values.length:sum;
  };
 };
 if(take('where')){
  const test=condition(()=>{const get=resolve(column());return group=>get(group[0])});
  rows=rows.filter(r=>test([r]));
 }
 const keys=take('group')?(need('by'),list(column)):[];
 const keyReaders=keys.map(resolve);
 const having=take('having')?condition(()=>valueOf(expr())):null;
 if(having&&!keys.length&&!select.some(e=>e.op))throw Error('HAVING benötigt hier eine Gruppierung oder ein Aggregat.');
 const sorting=take('order')?(need('by'),list(()=>{
  const key=column(),desc=take('desc');
  if(!desc)take('asc');
  return {key,desc};
 })) : [];

 finish();
 const fields=select.flatMap(e=>e.key==='*'&&!e.op?names.flatMap(n=>COLUMNS[n].map(k=>({key:n+'.'+k}))):[e]);
 const readers=fields.map(valueOf);
 const isAggregate=keys.length||fields.some(e=>e.op)||having;
 if(isAggregate&&fields.some(e=>!e.op&&!keys.includes(e.key)))throw Error('Ausgabespalten ohne Aggregat müssen genauso in GROUP BY stehen.');
 const order=sorting.map(s=>({...s,read:resolve(s.key)}));
 if(isAggregate&&order.some(s=>!keys.includes(s.key)))throw Error('In gruppierten Abfragen sortiert das Labor nach Gruppenspalten.');
 let groups;
 if(keys.length){
  const map=new Map();
  rows.forEach(row=>{
   const key=JSON.stringify(keyReaders.map(read=>read(row)));
   if(!map.has(key))map.set(key,[]);
   map.get(key).push(row);
  });
  groups=[...map.values()];
 }else groups=isAggregate?[rows]:rows.map(row=>[row]);
 if(having)groups=groups.filter(having);
 if(order.length)groups.sort((a,b)=>{
  for(const {read,desc} of order){
   const x=read(a[0]),y=read(b[0]);
   if(x===y)continue;
   if(x===null)return desc?-1:1;
   if(y===null)return desc?1:-1;
   return (x<y?-1:1)*(desc?-1:1);
  }
  return 0;
 });
 return {headers:fields.map(e=>e.op?e.op.toUpperCase()+'('+e.key+')':e.key),rows:groups.map(g=>readers.map(read=>read(g)))};
}

$('bitwall').innerHTML='<p>TEAM <span aria-hidden="true">⟷</span> TICKET</p>'+sqlTable(['id','titel','team_id'],[[1,'WLAN',10],[2,'Switch',10],[3,'Drucker',20]]);
document.querySelectorAll('[data-e2-lab]').forEach(lab=>{
 const select=lab.querySelector('select'),out=lab.querySelector('.lab-out'),input=lab.querySelector('textarea');
 if(input){
  const run=()=>{
   try{
    const result=labSql(input.value);
    out.innerHTML='<p>'+esc(result.note||result.rows.length+' Ergebniszeile(n)')+'</p>'+sqlTable(result.headers,result.rows);
   }catch(error){out.textContent=error.message}
  };
  select.addEventListener('change',()=>{input.value=select.value;run()});
  lab.querySelector('button').addEventListener('click',run);
  input.value=select.value;
  run();
 }else{
  const render=()=>{out.textContent=select.selectedOptions[0].dataset.result};
  select.addEventListener('change',render);
  render();
 }
});
