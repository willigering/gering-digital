"""Rebuild the standalone W4 module from the shared A1 shell and W4 content."""
from pathlib import Path
from module_theme import apply_theme
import re, json, base64
ROOT=Path(__file__).resolve().parents[1]
shell=(ROOT/'lernmodule/a1-zahlensysteme.html').read_text()
content=json.loads((ROOT/'tools/w4-content.json').read_text())
js=(ROOT/'tools/w4-generators.js').read_text().replace('__CONTENT__',json.dumps(content,ensure_ascii=False))
ACCENT='#d4b8ff'; ACCENT_RGB='212,184,255'

def replace_between(s,start,end,value):
 a=s.index(start); b=s.index(end,a); return s[:a]+value+s[b:]
def must(s,old,new):
 if old not in s: raise SystemExit('Anchor missing in A1 shell: '+old[:80])
 return s.replace(old,new)

shell=re.sub(r'<title>.*?</title>','<title>Unternehmensformen &amp; Märkte · Garage, Gewinn, Gerichtsvollzieher · DAU TO PRO</title>',shell)
shell=re.sub(r'<meta name="description"[^>]+>','<meta name="description" content="W4: Wirtschaftssektoren, Märkte, Marktformen, Einzelunternehmen, GbR, OHG, KG, GmbH, UG, AG, eG, Handelsregister, Prokura und Rechtsformwahl verständlich trainieren.">',shell)
shell=shell.replace('data-game-id="a1"','data-game-id="w4"')
bg=base64.b64encode((ROOT/'assets/dau-backgrounds/circuit-768.webp').read_bytes()).decode()
shell=re.sub(r'<script>\(function\(\)\{var B=.*?</script>','<script>/* DTP-HINTERGRUND: circuit */\n(function(){var B=["data:image/webp;base64,'+bg+'"];document.documentElement.style.setProperty("--bg-tex",\'url("\'+B[0]+\'")\')})();</script>',shell,flags=re.S)
shell=must(shell,'GRUNDLAGEN <b>//</b> ZAHLENSYSTEME <b>//</b> MODUL A1','WIRTSCHAFT &amp; PROJEKTE <b>//</b> UNTERNEHMEN &amp; MÄRKTE <b>//</b> MODUL W4')
shell=must(shell,'Bits zum <span>bitteren Ende.</span>','Garage, Gewinn, <span>Gerichts&shy;vollzieher</span>')
shell=re.sub(r'<p class="hero-lead">.*?</p>','<p class="hero-lead">Jede Firma fängt irgendwo an. Manchmal in der Garage. Dann kommt der Gewinn, und manchmal kommt der Gerichtsvollzieher. Hier lernst du, wer bei welcher Rechtsform haftet, wer mitreden darf, wie Märkte funktionieren und warum „e.V.“ noch lange nicht „gemeinnützig“ heißt.</p>',shell,count=1,flags=re.S)
shell=must(shell,'Von Null Plan <span>zu Null und Eins.</span>','Von der Garage <span>zur Holding.</span>')
shell=shell.replace('Erst erklärt, dann vorgerechnet, dann rechnest du.','Erst erklärt, dann vorgemacht, dann bist du dran.')
shell=must(shell,'Alles zum Nachlesen. <span>Bit für Bit.</span>','Alles zum Nachlesen. <span>Paragraf für Paragraf.</span>')
shell=must(shell,'Fünf Zahlen, drei Systeme, ein Durcheinander','Fachbegriffe sicher zuordnen')
shell=must(shell,'Welche Darstellung gehört zusammen?','Welcher Begriff gehört zur Beschreibung?')
shell=must(shell,'Wähle für jede Zeile die passende Zahl. Zwei Antworten im Auswahlmenü sind Lockvögel.','Jede Zeile wird einzeln bewertet. Im Auswahlmenü stehen mehr Begriffe als nötig.')
shell=must(shell,'Umrechnen auf Zeit.','Einordnen auf Zeit.')
shell=must(shell,'Wer die Bits versteht, versteht auch Subnetting, IPv6 und jede Downloadzeit.','Wer die Haftung versteht, liest jeden Gesellschaftsvertrag mit anderen Augen.')
shell=must(shell,'Modul A1 · Zahlensysteme · Bits zum bitteren Ende · Version 2.4','Modul W4 · Unternehmensformen &amp; Märkte · Garage, Gewinn, Gerichtsvollzieher · v1.0')
shell=re.sub(r"(window\.dtpMountCalculator\?\.\([^;]*),'zahlen'\);", r"\1,'w4');", shell)
shell=shell.replace('a1-bits','w4-unternehmen').replace('window.A1_TEST','window.W4UNTERNEHMEN_TEST')
# Module accent everywhere, including translucent variants and the A1 game block.
for old in ['#6ee78c','#a6f05a']: shell=shell.replace(old,ACCENT)
for old in ['110,231,140','166,240,90','0,202,216','0,220,232']: shell=shell.replace(old,ACCENT_RGB)
for old,new in {'#080e0b':'#0d0b12','#111b15':'#1a1624','#0d1912':'#15121d','#192920':'#251f33','#090f0c':'#0e0c13','#0e1b13':'#17131f','#0b1810':'#141120','#08120c':'#0f0d16','#09110c':'#0f0d16','#101a14':'#17121a','#121c16':'#1a1524','rgba(8,14,11,':'rgba(13,11,18,','rgba(12,19,15,':'rgba(19,16,26,','rgba(11,18,14,':'rgba(17,14,23,','#07110bf2':'#0d0b12f2','#07110bf5':'#0d0b12f5'}.items():shell=shell.replace(old,new)
extra='''<style>
/* W4: lilac accent and clear scenario/question separation. */
.scenario{border-left:3px solid var(--cyan);padding:10px 14px;margin:0 0 12px;background:#18141f;overflow-wrap:anywhere}.scenario strong{display:block;color:var(--cyan);font-size:11px;letter-spacing:.15em}.scenario ol{margin:8px 0 0;padding-left:20px}.task-prompt{overflow-wrap:anywhere}.bitwall{grid-template-columns:1fr;gap:12px}.bitwall .cash{font:900 38px var(--mono);color:var(--gold)}.bitwall p{margin:0;color:var(--muted);font-size:13px;line-height:1.6}.match-row .val{white-space:normal;font-family:inherit;overflow-wrap:anywhere}.table-wrap{max-width:100%;overflow-x:auto}.catbar{grid-template-columns:minmax(90px,180px) 1fr 100px}.qtip{overflow-wrap:anywhere}.lab input{max-width:100%}.review .task-prompt{margin-top:12px}body:after{background-image:linear-gradient(#0d0b12bb,#0d0b12df),var(--bg-tex,none)}
.panel td,.panel th{overflow-wrap:normal}\n.hero h1{font-size:clamp(36px,5.4vw,70px);hyphens:manual}
@media(max-width:610px){.catbar{grid-template-columns:95px 1fr 85px}.hero{padding-top:28px}.match-row{grid-template-columns:1fr;gap:6px}.qnav{gap:5px}.hero h1{font-size:44px}.grade{grid-template-columns:1fr}.bitwall .cash{font-size:30px}}
</style>'''
shell=shell.replace('</head>',extra+'</head>')
chapters='<nav class="chapter-grid" aria-label="Kapitel">'+''.join(f'<a class="ch-tile" href="#ch{i+1}"><span>{i+1:02}</span><strong>{c["title"]}</strong><small>{c["goal"]}</small></a>' for i,c in enumerate(content))+'</nav>'
for i,c in enumerate(content):
 chapters+=f'''<section id="ch{i+1}" class="panel cy"><div class="chapter-head"><span class="ch-no">{i+1:02}</span><div><h3>{c['title']}</h3><p>{c['goal']}</p></div></div>{c['intro']}{c['visual']}<div class="memo">{c['memo']}</div><div class="example"><div class="lbl">DURCHGESPIELT</div><p>{c['example']}</p><ol class="steps-list">{''.join('<li>'+s+'</li>' for s in c['steps'])}</ol></div>{c['detail']}<div class="lab" data-lab="{i}"><div class="lab-head"><strong>{c['labTitle']}</strong><span class="subtle">Werte ändern und den Zusammenhang beobachten.</span></div><div class="field-row">{''.join(f'<label>{f[0]}<br><input type="text" inputmode="decimal" data-field="{j}" value="{str(f[1]).replace(".",",")}" aria-label="{f[0]}"></label>' for j,f in enumerate(c['fields']))}</div><div class="calc lab-out" role="status" aria-live="polite"></div></div><div class="trap"><strong>Typische Fallen:</strong> {c['trap']}</div><div class="lab"><div class="lab-head"><strong>KURZ-CHECK</strong></div><div class="mini-check" data-cat="{c['cat']}"></div></div><a class="backtop" href="#learnTop">↑ Kapitelübersicht</a></section>'''
chapters+='''<section class="panel go"><h3>Quellen &amp; Grenzen</h3><p>Eigene Übungsaufgaben nach dem Unterrichtsstoff, keine offiziellen IHK-Aufgaben. Rechtsstand November 2026, einschließlich des Personengesellschaftsrechts-Modernisierungsgesetzes (MoPeG) seit 1.1.2024. Vereinfachte Lernfälle ersetzen keine Rechts- oder Steuerberatung.</p><ul class="sources"><li><a href="https://www.gesetze-im-internet.de/hgb/" rel="noopener">Handelsgesetzbuch (HGB): Kaufmann, Firma, OHG, KG, Prokura, Handlungsvollmacht</a></li><li><a href="https://www.gesetze-im-internet.de/bgb/" rel="noopener">Bürgerliches Gesetzbuch (BGB): GbR §§ 705 ff., Verein §§ 21 ff.</a></li><li><a href="https://www.gesetze-im-internet.de/gmbhg/" rel="noopener">GmbH-Gesetz (GmbHG), inkl. § 5a UG</a></li><li><a href="https://www.gesetze-im-internet.de/aktg/" rel="noopener">Aktiengesetz (AktG), inkl. KGaA §§ 278 ff.</a></li><li><a href="https://www.gesetze-im-internet.de/geng/" rel="noopener">Genossenschaftsgesetz (GenG)</a></li><li><a href="https://www.gesetze-im-internet.de/ao_1977/" rel="noopener">Abgabenordnung (AO) §§ 51–68: steuerbegünstigte Zwecke</a></li><li><a href="https://www.roedl.com/insights/auswirkungen-neues-personengesellschaftsrecht-auf-ergebnisverteilung-rechte-der-gesellschafter/" rel="noopener">Rödl &amp; Partner: Neues Personengesellschaftsrecht und Ergebnisverteilung</a></li><li><a href="https://www.frankfurt-main.ihk.de/recht/recht-und-steuern-aktuell/reform-der-gesellschaft-buergerlichen-rechts-5819660" rel="noopener">IHK Frankfurt am Main: Reform der GbR</a></li><li><a href="https://gruenderplattform.de/rechtsformen/kapitalgesellschaft" rel="noopener">Gründerplattform: Kapitalgesellschaften</a></li></ul><p class="subtle">Grundlage im Unterricht: Rechtsformen-Übersicht von J. Quickels und N. Böing (nboeing.de) sowie ITUM-Material IT.I.04.08. Ältere Angaben (AG mit fünf Gründern, 4-%-Regel bei OHG/KG, nicht rechtsfähige GbR) sind hier auf den aktuellen Rechtsstand gebracht.</p></section>'''
shell=replace_between(shell,'    <nav class="chapter-grid"','  <!-- ================= TRAININGSRAUM',chapters+'\n</section>\n\n')
shell=replace_between(shell,'const SYS=','/* ================= Sprüche',js+'\n\n')
shell=replace_between(shell,'/* ================= Sprüche','/* ================= Antwort prüfen','/* ================= Sprüche ================= */\n'+(ROOT/'tools/w4-quips.js').read_text()+'\n')
shell=replace_between(shell,'const FMT=','function showAnswer(t)',(ROOT/'tools/w4-parser.js').read_text()+'\n')
shell=shell.replace("if(t.show)return t.show;","if(t.show)return t.show;\n if(t.kind==='text')return esc(t.answer);")
shell=shell.replace("let h='<p class=\"task-prompt\">'+t.prompt", "let h=scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt")
# Current A1 shell: show the scenario above every question; the tooltip stays a plain rewording without examples.
shell=must(shell,"let h=(t.scene&&!o.short?'<p class=\"task-scene\">'+t.scene+'</p>':'')+'<p class=\"task-prompt\">'+t.prompt","let h=(t.scene&&!o.short?'<p class=\"task-scene\">'+t.scene+'</p>':'')+scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt")
shell=must(shell,"+(EXAMPLES[t.sub]?'<span class=\"qex\"><strong>Beispiel:</strong> '+EXAMPLES[t.sub]+'</span>':'')+'</span></span>'","+'</span></span>'")
shell=must(shell,"let h=(t.scene?'<p class=\"task-scene\">'+t.scene+'</p>':'')+'<p class=\"task-prompt\">'+t.prompt+'</p>';","let h=(t.scene?'<p class=\"task-scene\">'+t.scene+'</p>':'')+scenarioHtml(t)+'<p class=\"task-prompt\">'+t.prompt+helpHtml(t,'exTip')+'</p>';")
shell=shell.replace("t.kind==='hex'?'text':t.kind==='num'?'decimal':'numeric'","t.kind==='text'?'text':t.kind==='num'?'decimal':'numeric'")
shell=shell.replace("+'<span class=\"quip\">'+(ok?qOk():qBad())+'</span>'+(o.short?'':'<div class=\"why\">'+t.why+'</div>')", "+'<span class=\"quip\">'+(ok?qOk():qBad())+'</span>'+'<div class=\"why\">'+t.why+'</div>'")
shell=shell.replace("localStorage.setItem(TAB_STORE,tab)","store(TAB_STORE,tab)")
shell=shell.replace("t=localStorage.getItem(TAB_STORE)","t=load(TAB_STORE)")
shell=shell.replace("  countSub(ok,tt.sub);\n  if(hinted&&!auto)","  count(ok,tt.sub);\n  st.solved++;\n  if(hinted)")
shell=shell.replace("{renderPracticeStatus();$('practiceTask')", "{savePath();renderPracticeStatus();$('practiceTask')")
shell=shell.replace("if(ok)st.solved++;","")
shell=shell.replace("!st.mastered&&last10(i).c>=8","!st.mastered&&last10(i).n===10&&last10(i).c>=8")
shell=re.sub(r"const SPRINT_SUBS=\[.*?\];","const SPRINT_SUBS=['s_sektor','m_markt','f_name','e_privat','g_haft','k_rest','h_einzahl','a_dividende','r_abteil','w_art'];",shell)
shell=shell.replace("document.querySelectorAll('.mode-tile').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));","document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{if(!sprint.running)setMode(b.dataset.mode)}));")
shell=shell.replace("document.querySelectorAll('.mode-tile').forEach(b=>{const on=b.dataset.mode===m;","document.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===m;")
shell=shell.replace("if(sprint.running)stopSprint();mode=m;","if(sprint.running)return;mode=m;")
shell=must(shell,"ZUORDNEN · 5 ZAHLEN","ZUORDNEN · BEGRIFFE")
shell=replace_between(shell,'let match=[],','/* ================= Prüfungsmodus',(ROOT/'tools/w4-match.js').read_text()+'\n\n')
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
shell=replace_between(shell,'// Hero-Bitwand','/* Kurz-Checks */',(ROOT/'tools/w4-labs.js').read_text()+'\n\n')
shell=shell.replace("onAnswer:(ok,h,tt)=>countSub(ok,tt.sub)","onAnswer:(ok,h,tt)=>count(ok,tt.sub)")
shell=shell.replace('Erste eine Antwort','Erst eine Antwort')
shell=must(shell,"Ein paar Bits wackeln noch, aber das Fundament steht.","Ein paar Paragrafen wackeln noch, aber das Fundament steht.")
shell=must(shell,"Sehr gut! Du bist offiziell kein DAU mehr. Höchstens noch ein DAU mit Root-Rechten.","Sehr gut! Du könntest jetzt eine Firma gründen. Und wüsstest sogar, wer am Ende zahlt.")
for leftover in ['a1-bits','A1_TEST','Zahlensysteme · Bits']:
 if leftover in shell: raise SystemExit('Leftover from A1: '+leftover)
# Remaining dark green surfaces of the A1 template become dark lilac (only #rrggbb colours; base64 never contains '#').
def lilac(m):
 h=m.group(1);r,g,b=int(h[0:2],16),int(h[2:4],16),int(h[4:6],16)
 if max(r,g,b)<0x40 and g>r+6 and g>=b-2:return '#%02x%02x%02x'%((r+g)//2,r,min(255,round(g*1.15)))
 return m.group(0)
shell=re.sub(r'#([0-9a-fA-F]{6})\b',lilac,shell)
(ROOT/'lernmodule/w4-unternehmen.html').write_text(apply_theme(shell))
rows=['# W4 – Unternehmensformen & Märkte','','| ID | Name | Teilthema | Stufe |','| --- | --- | --- | --- |']
for i,c in enumerate(content):
 for id,label in c['types']:rows.append(f'| `{id}` | {label} | {c["title"]} | {i+1} |')
(ROOT/'docs/modul-auftraege/w4-aufgabentypen.md').write_text('\n'.join(rows)+'\n')
print('W4 built:',len(shell),'characters,',sum(len(c['types']) for c in content),'task types')
