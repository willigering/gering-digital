"""Rebuild the standalone F2 module from the shared A1 shell and F2 content."""
from pathlib import Path
from module_theme import apply_theme
import re, json, base64
ROOT=Path(__file__).resolve().parents[1]
shell=(ROOT/'lernmodule/a1-zahlensysteme.html').read_text()
content=json.loads((ROOT/'tools/f2-content.json').read_text())
js=(ROOT/'tools/f2-generators.js').read_text().replace('__CONTENT__',json.dumps(content,ensure_ascii=False))
def replace_between(s,start,end,value):
 a=s.index(start); b=s.index(end,a); return s[:a]+value+s[b:]
shell=re.sub(r'<title>.*?</title>','<title>Kalkulation &amp; Beschaffung · Rechnet sich das? · DAU TO PRO</title>',shell)
shell=re.sub(r'<meta name="description"[^>]+>','<meta name="description" content="F2: Angebote, Bezugspreis, Verkaufskalkulation, Nutzwert, Kauf/Miete/Leasing, lineare Abschreibung, Amortisation, Break-even, Stundensatz und Make or Buy verständlich trainieren.">',shell)
bg=base64.b64encode((ROOT/'assets/dau-backgrounds/circuit-copper-768.webp').read_bytes()).decode()
shell=re.sub(r'<script>\(function\(\)\{var B=.*?</script>','<script>/* DTP-HINTERGRUND: circuit-copper */\n(function(){var B=["data:image/webp;base64,'+bg+'"];document.documentElement.style.setProperty("--bg-tex",\'url("\'+B[0]+\'")\')})();</script>',shell,flags=re.S)
shell=shell.replace('MODUL A1','MODUL F2').replace('ZAHLENSYSTEME</div>','KALKULATION &amp; BESCHAFFUNG</div>')
shell=shell.replace('Bits zum <span>bitteren Ende.</span>','Rechnet <span>sich das?</span>')
shell=re.sub(r'<p class="hero-lead">.*?</p>','<p class="hero-lead">Rabatt, Skonto und eine kleine Rate. Das Angebot sieht gut aus, bis du den Rest der Rechnung liest. Hier rechnest du aus, was wirklich auf dem Konto landet oder davon abgeht.</p>',shell)
shell=shell.replace('<span>Offline · ohne Login</span>','<span>Rechenwege statt Bauchgefühl</span>')
shell=shell.replace('Von Null Plan <span>zu Null und Eins.</span>','Vom Preisschild <span>zum Durchblick.</span>').replace('Alles zum Nachlesen. <span>Bit für Bit.</span>','Alles zum Nachrechnen. <span>Cent für Cent.</span>')
shell=shell.replace('Fünf Zahlen, drei Systeme, ein Durcheinander','Begriffe und Formeln sicher verbinden').replace('Welche Darstellung gehört zusammen?','Welcher Begriff gehört zur Beschreibung?').replace('Wähle für jede Zeile die passende Zahl. Zwei Antworten im Auswahlmenü sind Lockvögel.','Jede Zeile wird einzeln bewertet. Jede Zuordnung ist eine eigene Aufgabe.')
shell=shell.replace('Umrechnen auf Zeit.','Kalkulieren auf Zeit.').replace('Wer die Bits versteht, versteht auch Subnetting, IPv6 und jede Downloadzeit.','Wer die Bezugsgröße kennt, fällt auf schöne Prozentzahlen nicht mehr herein.')
shell=re.sub(r'Modul A1 · Zahlensysteme · Bits zum bitteren Ende · Version 2\.4','Modul F2 · Kalkulation &amp; Beschaffung · Rechnet sich das? · v1.0',shell)
shell=re.sub(r"(window\.dtpMountCalculator\?\.\([^;]*),'zahlen'\);", r"\1,'f2');", shell)
shell=shell.replace('a1-bits','f2-kalk').replace('window.A1_TEST','window.F2KALK_TEST')
# Match the fixed module accent throughout the inherited CSS, including translucent variants.
for old in ['#6ee78c','#a6f05a']: shell=shell.replace(old,'#f6c177')
for old in ['110,231,140','166,240,90','0,202,216','0,220,232']: shell=shell.replace(old,'246,193,119')
for old,new in {'#080e0b':'#100d09','#111b15':'#201910','#0d1912':'#1b150f','#192920':'#2b2116','#090f0c':'#110e0a','rgba(8,14,11,':'rgba(16,13,9,','rgba(12,19,15,':'rgba(22,17,12,','rgba(11,18,14,':'rgba(19,15,11,'}.items():shell=shell.replace(old,new)
extra='''<style>
/* F2: copper accent and clear scenario/question separation. */
.scenario{border-left:3px solid var(--cyan);padding:10px 14px;margin:0 0 12px;background:#17130f;overflow-wrap:anywhere}.scenario strong{display:block;color:var(--cyan);font-size:11px;letter-spacing:.15em}.task-prompt{overflow-wrap:anywhere}.bitwall{grid-template-columns:1fr;gap:12px}.bitwall .cash{font:900 38px var(--mono);color:var(--gold)}.bitwall p{margin:0;color:var(--muted);font-size:13px}.match-row .val{white-space:normal;font-family:inherit;overflow-wrap:anywhere}.table-wrap{max-width:100%;overflow-x:auto}.catbar{grid-template-columns:minmax(90px,180px) 1fr 100px}.qtip{overflow-wrap:anywhere}.lab input{max-width:100%}.review .task-prompt{margin-top:12px}body:after{background-image:linear-gradient(#100d09bb,#100d09df),var(--bg-tex,none)}
@media(max-width:610px){.catbar{grid-template-columns:95px 1fr 85px}.hero{padding-top:28px}.match-row{grid-template-columns:1fr;gap:6px}.qnav{gap:5px}.hero h1{font-size:48px}.grade{grid-template-columns:1fr}.bitwall .cash{font-size:30px}}
</style>'''
shell=shell.replace('</head>',extra+'</head>')
chapters='<nav class="chapter-grid" aria-label="Kapitel">'+''.join(f'<a class="ch-tile" href="#ch{i+1}"><span>{i+1:02}</span><strong>{c["title"]}</strong><small>{c["goal"]}</small></a>' for i,c in enumerate(content))+'</nav>'
for i,c in enumerate(content):
 chapters+=f'''<section id="ch{i+1}" class="panel cy"><div class="chapter-head"><span class="ch-no">{i+1:02}</span><div><h3>{c['title']}</h3><p>{c['goal']}</p></div></div>{c['intro']}<div class="memo">{c['memo']}</div><div class="example"><div class="lbl">DURCHGERECHNET</div><p>{c['example']}</p><ol class="steps-list">{''.join('<li>'+s+'</li>' for s in c['steps'])}</ol></div>{c['detail']}<div class="lab" data-lab="{i}"><div class="lab-head"><strong>{c['labTitle']}</strong><span class="subtle">Werte ändern und den Zusammenhang beobachten.</span></div><div class="field-row">{''.join(f'<label>{f[0]}<br><input type="text" inputmode="decimal" data-field="{j}" value="{f[1]}" aria-label="{f[0]}"></label>' for j,f in enumerate(c['fields']))}</div><div class="calc lab-out" role="status" aria-live="polite"></div></div><div class="trap"><strong>Typische Fallen:</strong> {c['trap']}</div><div class="lab"><div class="lab-head"><strong>KURZ-CHECK</strong></div><div class="mini-check" data-cat="{c['cat']}"></div></div><a class="backtop" href="#learnTop">↑ Kapitelübersicht</a></section>'''
chapters+='''<section class="panel go"><h3>Quellen &amp; Modellgrenzen</h3><p>Eigene Übungsaufgaben, keine offiziellen IHK-Aufgaben. Geldbeträge netto, sofern nicht anders angegeben. Beispiel-Steuersätze stehen in der jeweiligen Aufgabe. Kauf, Miete und Leasing werden bei gleicher Leistung und Laufzeit ohne Abzinsung verglichen. Die statische Rechnung ersetzt keine Vertragsprüfung.</p><ul class="sources"><li><a href="https://www.arbeitsagentur.de/vor-ort/datei/publ-selbststaendig-werden-sh_ba078847.pdf" rel="noopener">Bundesagentur für Arbeit: Selbstständig werden – Kalkulation und Preisbildung</a></li><li><a href="https://kultus.hessen.de/sites/kultus.hessen.de/files/2026-05/web_handreichung_bs_rlp_industriekaufleute.pdf" rel="noopener">Hessisches Kultusministerium: Handreichung Industriekaufleute, Angebotsvergleich</a></li><li><a href="https://www.gesetze-im-internet.de/estg/__7.html" rel="noopener">§ 7 EStG – lineare Absetzung für Abnutzung</a></li><li><a href="https://grsth.bundesfinanzministerium.de/esth/2022/C-Anhaenge/Anhang-01/V/inhalt.html" rel="noopener">BMF vom 22.02.2022 – Nutzungsdauer bestimmter Computerhardware und Software</a></li></ul><p class="subtle">Recherchestand: 03.11.2026. In den Aufgaben gilt die ausdrücklich vorgegebene wirtschaftliche Nutzungsdauer. Sie ist keine Behauptung über eine steuerlich zwingende PC-Nutzungsdauer. Steuerliche Sonderregeln werden nicht berechnet.</p></section>'''
shell=replace_between(shell,'    <nav class="chapter-grid"','  <!-- ================= TRAININGSRAUM',chapters+'\n</section>\n\n')
# Keep the complete A1 UI engine; exchange only the topic-dependent layers.
shell=replace_between(shell,'const SYS=','/* ================= Sprüche',js+'\n\n')
shell=replace_between(shell,'/* ================= Sprüche','/* ================= Antwort prüfen',(ROOT/'tools/f2-quips.js').read_text()+'\n')
# Replace answer parser: half-cent precision; text keywords use explicit accepted forms.
shell=replace_between(shell,'const FMT=','function showAnswer(t)',(ROOT/'tools/f2-parser.js').read_text()+'\n')
shell=shell.replace("if(t.show)return t.show;","if(t.show)return t.show;\n if(t.kind==='text')return esc(t.answer);")
shell=shell.replace("let h='<p class=\"task-prompt\">'+t.prompt", "let h=scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt")
shell=shell.replace("t.kind==='hex'?'text':t.kind==='num'?'decimal':'numeric'","t.kind==='text'?'text':t.kind==='num'?'decimal':'numeric'")
shell=shell.replace("+'<span class=\"quip\">'+(ok?qOk():qBad())+'</span>'+(o.short?'':'<div class=\"why\">'+t.why+'</div>')", "+'<span class=\"quip\">'+(ok?qOk():qBad())+'</span>'+'<div class=\"why\">'+t.why+'</div>'")
shell=shell.replace("localStorage.setItem(TAB_STORE,tab)","store(TAB_STORE,tab)")
shell=shell.replace("t=localStorage.getItem(TAB_STORE)","t=load(TAB_STORE)")
shell=shell.replace("  countSub(ok,tt.sub);\n  if(hinted&&!auto)","  count(ok,tt.sub);\n  st.solved++;\n  if(hinted)")
shell=shell.replace("{renderPracticeStatus();$('practiceTask')", "{savePath();renderPracticeStatus();$('practiceTask')")
shell=shell.replace("if(ok)st.solved++;","")
shell=shell.replace("!st.mastered&&last10(i).c>=8","!st.mastered&&last10(i).n===10&&last10(i).c>=8")
shell=re.sub(r"const SPRINT_SUBS=\[.*?\];","const SPRINT_SUBS=['a_rabatt','b_ziel','v_gewinn','n_teil','k_miete','d_jahr','m_rueck','e_db','s_preis','o_fremd'];",shell)
shell=shell.replace("document.querySelectorAll('.mode-tile').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));","document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(!sprint.running)setMode(b.dataset.mode)}));")
shell=shell.replace("document.querySelectorAll('.mode-tile').forEach(b=>{const on=b.dataset.mode===m;","document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===m;")
shell=shell.replace("if(sprint.running)stopSprint();mode=m;","if(sprint.running)return;mode=m;")
shell=shell.replace("ZUORDNEN · 5 ZAHLEN","ZUORDNEN · BEGRIFFE")
shell=replace_between(shell,'let match=[],','/* ================= Prüfungsmodus',(ROOT/'tools/f2-match.js').read_text()+'\n\n')
shell=re.sub(r'const EXAM_PLAN=\[.*?\];',"const EXAM_PLAN=CATS.map(([c])=>[c,2,5]);",shell)
shell=shell.replace("t.pts=p;out.push(t)","t.pts=5/k;out.push(t)")
shell=shell.replace("+' · '+t.pts+' PUNKTE'","+' · '+fd(t.pts,2)+' PUNKTE'")
shell=shell.replace("let h=scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt+'</p>';", "let h=scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt+helpHtml(t,'exTip')+'</p>';")
shell=shell.replace("stats.solved++;if(ok)stats.correct++;countSub(ok,t.sub);","count(ok,t.sub);")
shell=shell.replace("'+x.g+'/'+x.t+'","'+fd(x.g,2)+' / '+fd(x.t,2)+'")
shell=shell.replace('<h4>Ergebnis pro Thema</h4>','<h4>Gesamtpunkte pro Thema</h4>')
shell=shell.replace("(r.ok?r.t.pts:0)+'/'+r.t.pts","fd(r.ok?r.t.pts:0,2)+'/'+fd(r.t.pts,2)")
shell=shell.replace("+' Punkte</summary><p class=\"task-prompt\" style=\"font-size:15.5px;margin-top:10px\">'+r.t.prompt","+' Aufgabenpunkte</summary>'+scenarioHtml(r.t)+'<p class=\"task-prompt\" style=\"font-size:15.5px;margin-top:10px\">'+r.t.prompt")
shell=shell.replace("window.addEventListener('beforeunload',e=>{if(exam.running){e.preventDefault();e.returnValue=''}});", "window.addEventListener('pagehide',()=>{if(sprint.running)finishSprint(true);if(exam.running)submitExam('Seite verlassen')});\nwindow.addEventListener('beforeunload',()=>{if(exam.running)submitExam('Seite verlassen')});")
shell=replace_between(shell,'// Hero-Bitwand','/* Kurz-Checks */',(ROOT/'tools/f2-labs.js').read_text()+'\n\n')
shell=shell.replace("onAnswer:(ok,h,tt)=>countSub(ok,tt.sub)","onAnswer:(ok,h,tt)=>count(ok,tt.sub)")
# API expected by central progress checks: keep inherited four-argument form too.
shell=shell.replace('window.F2KALK_TEST={last:', 'window.F2KALK_TEST={last:')
shell=shell.replace('Erste eine Antwort','Erst eine Antwort')
shell=shell.replace("Ein paar Bits wackeln noch, aber das Fundament steht.","Ein paar Nachkommastellen wackeln noch, aber das Fundament steht.")
shell=shell.replace("Sehr gut! Du bist offiziell kein DAU mehr. Höchstens noch ein DAU mit Root-Rechten.","Sehr gut! Deine Rechnung hält sogar einer Buchhaltungsbesprechung stand. Fast schade um die schönen Ausreden.")
(ROOT/'lernmodule/f2-kalkulation.html').write_text(apply_theme(shell))
rows=['# F2 – Kalkulation & Beschaffung','', '| ID | Name | Teilthema | Stufe |','| --- | --- | --- | --- |']
# The JS registry is also exported during the browser tests; use its explicit metadata here.
for i,c in enumerate(content):
 for id,label in c['types']:rows.append(f'| `{id}` | {label} | {c["title"]} | {i+1} |')
(ROOT/'docs/modul-auftraege').mkdir(parents=True,exist_ok=True)
(ROOT/'docs/modul-auftraege/f2-aufgabentypen.md').write_text('\n'.join(rows)+'\n')
print('F2 rebuilt:',len(shell),'characters')

