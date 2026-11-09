$('bitwall').innerHTML='<p>&gt; dotnet build</p><div class="cash">error CS1002</div><p>Ein Semikolon. Ein einziges.<br>Der Compiler sagt nein. Zu Recht.</p>';
/* Schritt-für-Schritt-Abläufe: fest geprüfte Daten, es wird kein Code ausgeführt. */
document.querySelectorAll('[data-trace]').forEach(el=>{
 const tr=STAGES[Number(el.dataset.trace)].trace;let i=0;
 el.innerHTML='<ol class="trace-code">'+tr.html.map(l=>'<li><code>'+(l||' ')+'</code></li>').join('')+'</ol><div class="trace-side"><div><b>VARIABLEN</b><div data-v></div></div><div><b>KONSOLE</b><pre data-o></pre></div></div><p class="trace-note" data-n role="status" aria-live="polite"></p><div class="actions"><button type="button" class="btn secondary" data-a="prev">← Zurück</button><button type="button" class="btn primary" data-a="next">Nächster Schritt →</button><button type="button" class="btn ghost" data-a="reset">Von vorn</button><span class="subtle" data-c></span></div>';
 const q=s=>el.querySelector(s),rows=[...el.querySelectorAll('.trace-code li')];
 function draw(){const s=tr.steps[i];rows.forEach((r,n)=>r.classList.toggle('cur',n===s[0]-1));
  const names=Object.keys(s[1]);q('[data-v]').innerHTML=names.length?names.map(k=>'<div class="trace-var"><span>'+esc(k)+'</span><strong>'+esc(s[1][k])+'</strong></div>').join(''):'<span class="subtle">noch keine</span>';
  q('[data-o]').textContent=tr.steps.slice(0,i+1).map(x=>x[2]).filter(Boolean).join('\n')||' ';q('[data-n]').innerHTML=s[3];q('[data-c]').textContent='Schritt '+(i+1)+' von '+tr.steps.length;
  q('[data-a="prev"]').disabled=i===0;q('[data-a="next"]').disabled=i===tr.steps.length-1;}
 el.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b)return;i=b.dataset.a==='next'?Math.min(i+1,tr.steps.length-1):b.dataset.a==='prev'?Math.max(i-1,0):0;draw()});
 draw();
});
/* Aus einer Aufgabe ins Nachschlagwerk und zurück: Die Aufgabe bleibt im DOM, Eingaben bleiben erhalten. */
let refReturn=null;
function openRef(t){
 refReturn={tab:currentTab(),y:window.scrollY};const i=LESSONS.findIndex(c=>c.cat===t.cat);
 if(showTab('learn')){$('backToTask').hidden=false;const e=$('ch'+(i+1));if(e)e.scrollIntoView({block:'start'})}
}
$('backToTask').addEventListener('click',()=>{if(!refReturn)return;const r=refReturn;refReturn=null;$('backToTask').hidden=true;showTab(r.tab);window.scrollTo(0,r.y)});
$('areaTabs').addEventListener('click',()=>{refReturn=null;$('backToTask').hidden=true});
