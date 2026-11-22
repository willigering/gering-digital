'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../lernmodule/e2-sql.html'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const script of scripts)new vm.Script(script);
const engine=scripts.find(s=>s.includes('window.E2SQL_TEST'));
const part=(a,b)=>engine.slice(engine.indexOf(a),engine.indexOf(b,engine.indexOf(a)));
const domain=[
 part('const rnd=','const V='),
 part('function mc(prompt','/* Topic content'),
 part('/* Topic content','function showAnswer'),
 part('const DATA=','$(\'bitwall\').innerHTML'),
 'const EXAM_PLAN=CATS.map(([c])=>[c,2,5]);',
 part('function buildExam(k){','function gradeOf(')
];
const scope={structuredClone};
vm.createContext(scope);
vm.runInContext(domain.join('\n')+'\nglobalThis.api={SUBS,LESSONS,CATS,genTask,labSql,parseAnswer,buildExam};',scope);
const api=scope.api;
const clean=x=>JSON.parse(JSON.stringify(x));

assert.equal(api.SUBS.length,60);
assert.equal(new Set(api.SUBS.map(t=>t.id)).size,60);
assert.equal(api.LESSONS.length,10);
for(const [cat] of api.CATS){
 const recent=[], batch=Array.from({length:400},()=>api.genTask(cat,2,recent));
 for(let i=0;i<batch.length-9;i++){
  const round=batch.slice(i,i+10);
  assert.equal(new Set(round.map(t=>t.sub)).size,6,cat);
  const byForm={};
  for(const t of round)byForm[t.form]=(byForm[t.form]??0)+1;
  assert.ok(Object.keys(byForm).length>=4,cat);
  assert.ok(Math.max(...Object.values(byForm))<=4,cat);
 }
 assert.ok(batch.slice(1).every((t,i)=>t.form!==batch[i].form&&t.sub!==batch[i].sub),cat);
}
for(const type of api.SUBS){
 for(let i=0;i<1000;i++){
  const t=api.genTask(type.id);
  assert.ok(t.scenario&&t.prompt&&t.plain&&t.why&&!/\{\w+\}/.test(t.scenario+t.prompt+t.plain+t.answer),type.id);
  if(t.kind==='mc')assert.equal(new Set(t.options).size,4,type.id);
  else assert.equal(api.parseAnswer(t,t.answer).ok,true,type.id);
  if(t.sub==='sel_out'){
   const [a,b]=Array.from(t.scenario.matchAll(/hat (\d+) Minuten/g),m=>Number(m[1]));
   assert.equal(t.answer,a>b?'1':'2');
  }
 }
}
for(const k of [1,2,3]){
 const exam=api.buildExam(k);
 assert.equal(exam.length,20*k);
 assert.equal(new Set(exam.map(x=>x.sub)).size,20*k);
 assert.ok(Math.abs(exam.reduce((sum,x)=>sum+x.pts,0)-100)<1e-9);
}
const run=s=>clean(api.labSql(s));
assert.deepEqual(run("SELECT id FROM ticket WHERE status = 'offen' ORDER BY minuten DESC;").rows,[[2],[1]]);
assert.deepEqual(run('SELECT COUNT(*), COUNT(minuten), SUM(minuten) FROM ticket').rows,[[4,3,80]]);
assert.deepEqual(run('SELECT COUNT(*), AVG(minuten) FROM ticket WHERE id = 999').rows,[[0,null]]);
assert.deepEqual(run('SELECT titel FROM ticket WHERE minuten IS NULL').rows,[['VPN']]);
assert.deepEqual(run('SELECT id FROM ticket WHERE minuten = NULL').rows,[]);
assert.deepEqual(run("SELECT team_id, COUNT(*) FROM ticket WHERE status = 'offen' GROUP BY team_id HAVING COUNT(*) >= 2").rows,[[10,2]]);
assert.deepEqual(run("SELECT team.name, COUNT(ticket.id) FROM team LEFT JOIN ticket ON team.id = ticket.team_id AND ticket.status = 'offen' GROUP BY team.name ORDER BY team.name").rows,[['Backup',0],['Clients',0],['Netzwerk',2]]);
assert.equal(run('SELECT team.name, ticket.id FROM team INNER JOIN ticket ON team.id = ticket.team_id').rows.length,4);
assert.equal(run('SELECT team.name, ticket.id FROM team LEFT JOIN ticket ON team.id = ticket.team_id').rows.length,5);
assert.equal(run("UPDATE ticket SET status = 'zu' WHERE id = 2").rows[1][3],'zu');
assert.equal(run('DELETE FROM ticket').rows.length,0);
assert.equal(run('SELECT * FROM ticket').rows.length,4);
assert.equal(run("INSERT INTO ticket (id, titel, team_id) VALUES (7, 'NAS im Keller', 30)").rows.at(-1)[1],'NAS im Keller');
assert.throws(()=>run("INSERT INTO ticket (id, titel, team_id) VALUES (7, 'NAS', 99)"),/vorhandene Team-ID/);
assert.throws(()=>run('SELECT * FROM ticket; DELETE FROM ticket'),/unterstützt/);
assert.throws(()=>run('SELECT id FROM team JOIN ticket ON team.id = ticket.team_id'),/mehrdeutige Spalte/);
console.log('E2: 60 Aufgabentypen × 1.000, zehn Stufen × 400, drei 100-Punkte-Prüfungen und SQL-Labor geprüft.');
