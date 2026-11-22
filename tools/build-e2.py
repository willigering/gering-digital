"""Build the offline E2 module with the shared production learning shell."""
import base64
from html import escape
import json
from pathlib import Path
import re

from e2_content import LABELS, LESSONS, SOURCES, TASKS
from module_theme import apply_theme

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / 'tools'
TITLE = 'Und jetzt zur Blitzrunde: Wer hat noch ein Backup?'
DESCRIPTION = 'Modelliere den Helpdesk, filtere Tickets mit SQL und finde heraus, warum ein DELETE ohne WHERE den Nachmittag ruiniert.'

def between(html, start, stop, value):
    a = html.index(start)
    b = html.index(stop, a)
    return html[:a] + value + '\n' + html[b:]

def sub(html, old, new):
    if old not in html:
        raise ValueError('Vorlage geändert: ' + old)
    return html.replace(old, new)

def options(pairs):
    return ''.join(f'<option value="{escape(value)}" data-result="{escape(result)}">{escape(label)}</option>'
                   for value, label, result in pairs)

CHOICES = {
    'system': [('App','Sendet die Anfrage und verarbeitet das Ergebnis.'), ('DBMS','Plant und verarbeitet die Abfrage und greift auf die Daten zu.'), ('Datenträger','Speichert unter anderem Dateien mit Daten und Protokollen.')],
    'model': [('Inventar-App lokal','SQLite passt als eingebettetes SQL-System.'), ('Viele Beziehungspfade','Ein Graphmodell macht Pfadabfragen zum unmittelbaren Bestandteil des Modells.'), ('Standardbericht für Tickets','Ein relationales DBMS kann Beziehungen und Datenregeln sichern und bietet SQL für Berichte.')],
    'keys': [('team_id = 10','Zulässig: Team 10 existiert.'), ('team_id = 99','Abgelehnt: Team 99 existiert nicht.'), ('team_id = NULL','Abgelehnt: NOT NULL erzwingt die Zuordnung.')],
    'er': [('Team → Ticket','1:n. Der Fremdschlüssel steht in ticket.'), ('Ticket → Abnahmeprotokoll','1:0..1. Der Verweis im Protokoll braucht UNIQUE.'), ('Ticket ↔ Tag','n:m. Eine Zwischentabelle speichert jeweils ein gültiges Paar.')],
    'norm': [('Tag-IDs als Liste','1NF: Pro Zuordnungszeile eine Tag-ID speichern.'), ('betreff hängt nur von ticket_id ab','2NF: betreff aus der Zuordnung in ticket verschieben.'), ('teamname hängt über team_id von ticket_id ab','3NF: teamname in team pflegen.')],
    'schema': [('Neue Spalte','ALTER TABLE ändert das Schema. Altzeilen vor neuen Pflichtregeln berücksichtigen.'), ('Langsame Abfrage','Ausführungsplan ansehen und einen passenden Index messen.'), ('Irrtümlich gelöschte Zeilen','Wiederherstellung aus Backup und gegebenenfalls Transaktionslogs testen.')],
}
QUERIES = {
    'select': ["SELECT id, titel FROM ticket WHERE status = 'offen' ORDER BY minuten DESC",
               'SELECT titel FROM ticket WHERE minuten IS NULL', 'SELECT * FROM ticket ORDER BY id'],
    'group': ["SELECT team_id, COUNT(*) FROM ticket WHERE status = 'offen' GROUP BY team_id HAVING COUNT(*) >= 2",
              'SELECT COUNT(*), COUNT(minuten), AVG(minuten) FROM ticket', 'SELECT team_id, SUM(minuten) FROM ticket GROUP BY team_id ORDER BY team_id'],
    'join': ['SELECT team.name, ticket.titel FROM team INNER JOIN ticket ON team.id = ticket.team_id',
             'SELECT team.name, ticket.titel FROM team LEFT JOIN ticket ON team.id = ticket.team_id',
             "SELECT team.name, COUNT(ticket.id) FROM team LEFT JOIN ticket ON team.id = ticket.team_id AND ticket.status = 'offen' GROUP BY team.name ORDER BY team.name"],
    'write': ["UPDATE ticket SET status = 'zu' WHERE id = 2", 'DELETE FROM ticket WHERE id = 2',
              'DELETE FROM ticket', "INSERT INTO ticket (id, titel, team_id) VALUES (7, 'NAS', 30)"],
}

def lab(cat):
    if cat in QUERIES:
        queries = options((sql, sql, '') for sql in QUERIES[cat])
        fields = f'''<label>Beispiel<select>{queries}</select></label>
<label>SQL-Anweisung<textarea rows="3" maxlength="400" spellcheck="false" autocapitalize="off"></textarea></label>
<button type="button" class="btn primary">Ausführen</button>
<p class="subtle">Mini-Interpreter für die Tabellen <code>team(id, name)</code> und <code>ticket(id, titel, team_id, status, minuten)</code>.
Eigene Varianten der Beispiele sind möglich. Jeder Lauf startet mit denselben Beispieldaten.</p>'''
    else:
        choices = options((str(i), label, result) for i, (label, result) in enumerate(CHOICES[cat]))
        fields = f'<label>Fall auswählen<select>{choices}</select></label>'
    return f'<div class="lab sql-lab" data-e2-lab><div class="lab-head"><strong>LABOR</strong></div>{fields}<div class="lab-out" role="status" aria-live="polite"></div></div>'

def steps(text):
    return [s.strip() for s in re.split(r'(?<=\.) (?=[A-ZÄÖÜ])', text)]

def graphic(parts):
    values = re.split(r' → | \| ', parts)
    return '<ul class="sql-flow" aria-label="Fachgrafik">' + ''.join('<li>'+escape(p)+'</li>' for p in values) + '</ul>'

def survey():
    names = [('PostgreSQL',57.9),('SQLite',42.1),('MySQL',35.1),('Redis',28.3),('SQL Server',27.1),('MariaDB',20.3),('MongoDB',19.0)]
    bars = ''.join(f'<li><span>{n}</span><meter min="0" max="100" value="{v}" aria-label="{n}"></meter><b>{v:.1f} %</b></li>'.replace(f'{v:.1f} %',f'{v:.1f} %'.replace('.',',')) for n,v in names)
    return f'''<figure class="sql-survey"><figcaption><b>Datenbanken in der Praxis · Stack Overflow Developer Survey 2026</b>
<p>Auswahl aus 12.061 Befragten, die diese Frage beantwortet haben. Gefragt war nach umfangreicher Arbeit mit den Systemen im vergangenen Jahr. Mehrfachnennungen waren möglich. Die Werte sind Befragungsanteile und keine Marktanteile.</p></figcaption>
<ul>{bars}</ul></figure>'''

task_rows=[line.split('|') for line in TASKS.splitlines()]
assert len(task_rows)==len(LABELS)==60 and len({r[0] for r in task_rows})==60
content=[]
chapters=[]
for i,(cat,title,goal,intro,memo,detail,example,trap) in enumerate(LESSONS,1):
    content.append(dict(cat=cat,title=title,goal=goal,intro=f'<p>{escape(intro)}</p><p>{escape(detail)}</p>',
                        memo=memo,example=example,steps=[memo,trap]))
    visual=graphic(memo)
    if cat=='er':
        visual='<figure class="sql-er"><figcaption>ER-Skizze für Team, Ticket und Tag</figcaption><div><b>TEAM</b><span>1 ↔ 0..n</span><b>TICKET</b></div><div><b>TICKET</b><span>1 ↔ 0..n</span><b>TICKET_TAG</b><span>0..n ↔ 1</span><b>TAG</b></div></figure>'
    if cat=='system':
        visual+=graphic('1968 · IMS → 1970 · Codd → 1970er · System R → 1986 · SQL-Standard → 2006 · Bigtable')
    if cat=='model':
        visual+=survey()
    chapters.append(f'''<section id="ch{i}" class="panel cy"><div class="chapter-head"><span class="ch-no">{i:02}</span><div><h3>{escape(title)}</h3><p>{escape(goal)}</p></div></div>
<p>{escape(intro)}</p><p>{escape(detail)}</p>{visual}
<div class="example"><div class="lbl">GELÖSTES BEISPIEL</div><p>{escape(example)}</p></div>{lab(cat)}
<div class="trap"><strong>Typische Fallen</strong><p>{escape(trap)}</p></div>
<div class="lab"><div class="lab-head"><strong>KURZ-CHECK</strong></div><div class="mini-check" data-cat="{cat}"></div></div>
<a class="backtop" href="#learnTop">↑ Kapitelübersicht</a></section>''')

html=(ROOT/'lernmodule/f2-kalkulation.html').read_text()
html=re.sub(r'<title>.*?</title>',f'<title>Datenbanken &amp; SQL · {TITLE} · DAU TO PRO</title>',html)
html=re.sub(r'<meta name="description"[^>]+>',f'<meta name="description" content="{DESCRIPTION}">',html)
bg=base64.b64encode((ROOT/'assets/dau-backgrounds/server-768.webp').read_bytes()).decode()
html=re.sub(r'<script>/\* DTP-HINTERGRUND:.*?</script>',lambda _:f'''<script>/* DTP-HINTERGRUND: server */
(function(){{var B=["data:image/webp;base64,{bg}"];document.documentElement.style.setProperty("--bg-tex",'url("'+B[0]+'")')}})();</script>''',html,flags=re.S)
links='<ul class="sources">'+''.join(f'<li><a href="{url}" rel="noopener noreferrer">{escape(label)}</a></li>' for label,url in SOURCES)+'</ul>'
nav='<nav class="chapter-grid" aria-label="Kapitel">'+''.join(f'<a class="ch-tile" href="#ch{i}"><span>{i:02}</span><strong>{escape(row[1])}</strong><small>{escape(row[2])}</small></a>' for i,row in enumerate(LESSONS,1))+'</nav>'
html=between(html,'<nav class="chapter-grid"','<!-- ================= TRAININGSRAUM',nav+'\n'+'\n'.join(chapters)+f'''<section class="panel go"><h3>Quellen und Vertiefung</h3>
<p>Recherchestand 16.11.2026. Die SQL-Beispiele orientieren sich an PostgreSQL. Andere Systeme haben teils abweichende Syntax und Regeln. Das Labor bildet einen kleinen SQL-Ausschnitt ab. Die Übungsfragen wurden für DAU TO PRO geschrieben.</p>
<p><a href="/dau-to-pro/cheat-sheet.html?thema=datenbanken">Spickzettel Datenbanken &amp; SQL öffnen ↗</a></p>{links}</section></section>''')
tasks=(TOOLS/'e2-tasks.js').read_text().replace('__LESSONS__',json.dumps(content,ensure_ascii=False)).replace('__TASKS__',json.dumps(task_rows,ensure_ascii=False)).replace('__LABELS__',json.dumps(LABELS,ensure_ascii=False))
html=between(html,'/* Topic content only','function showAnswer(t)',tasks)
html=between(html,'// Hero: a visible purchase','/* Kurz-Checks */',(TOOLS/'e2-labs.js').read_text())
match=[
 ('DBMS','Verarbeitet Abfragen und verwaltet Zugriffe'),
 ('Primärschlüssel','Identifiziert eine Tabellenzeile eindeutig'),
 ('Fremdschlüssel','Erzwingt einen zulässigen Verweis'),
 ('Zwischentabelle','Löst eine n:m-Beziehung in zwei 1:n-Beziehungen auf'),
 ('WHERE','Filtert einzelne Zeilen vor der Gruppierung'),
 ('HAVING','Filtert gebildete Gruppen'),
 ('LEFT JOIN','Behält linke Zeilen ohne rechten Treffer'),
 ('ROLLBACK','Verwirft Änderungen einer noch offenen Transaktion'),
 ('Index','Unterstützt einen passenden Suchzugriff'),
 ('ALTER TABLE','Ändert die Struktur einer vorhandenen Tabelle'),
]
match_js=between((TOOLS/'f2-match.js').read_text(),'const MATCH_BANK=','function matchNew()', 'const MATCH_BANK='+json.dumps(match,ensure_ascii=False)+';')
html=between(html,'let match=[],','/* ================= Prüfungsmodus',match_js)
er_slots = [('entity','Entität links'),('relation','Beziehung'),('entity','Entität rechts'),
            ('key','Schlüssel links'),('key','Schlüssel rechts'),('attribute','Attribut rechts')]
er_shapes = ''.join(f'<button type="button" class="er-shape er-{shape}" data-slot="{i}"><span>{label}</span></button>'
                    for i,(shape,label) in enumerate(er_slots))
er_board = f'''<div id="erBox" hidden>
  <h3>ER-Diagramm zuordnen</h3>
  <p id="erCase"></p>
  <p class="subtle">Wähle zuerst einen Begriff und danach seine Form. Tippe eine belegte Form ohne Auswahl an, um den Begriff zurückzulegen.</p>
  <div id="erBank" role="group" aria-label="Begriffe"></div>
  <div id="erBoard" role="group" aria-label="ER-Diagramm in Chen-Notation">
    <svg viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true"><path d="M100 120H500M100 35V120M500 35V205"/></svg>
    {er_shapes}
  </div>
  <p class="subtle">Rechteck = Entität · Raute = Beziehung · Oval = Attribut · Unterstrichen = Schlüsselattribut</p>
  <div class="actions"><button type="button" class="btn primary" id="erCheck" disabled>Zuordnung prüfen</button><button type="button" class="btn secondary" id="erNext">Neuer Fall →</button></div>
  <div id="erFeedback" class="result" role="status" aria-live="polite"></div>
</div>'''
html=sub(html,'<div id="sprintEnd"',er_board+'\n        <div id="sprintEnd"')
html=sub(html,'<button type="button" class="mode-tile" data-mode="sprint"', '<button type="button" class="mode-tile" data-mode="er" aria-pressed="false"><span class="sym">◇</span><b>ER-Diagramm</b><span>Begriffe den Formen im Diagramm zuordnen</span></button>\n      <button type="button" class="mode-tile" data-mode="sprint"')
html=sub(html,"$('trainTask').hidden=m==='match';","$('trainTask').hidden=m==='match'||m==='er';$('erBox').hidden=m!=='er';")
html=sub(html,"else if(m==='match')", "else if(m==='er'){$('trainKicker').textContent='ZUORDNEN · ER-DIAGRAMM';erNew()}\n else if(m==='match')")
html=html.replace('/* ================= Prüfungsmodus', (TOOLS/'e2-er.js').read_text()+'\n/* ================= Prüfungsmodus',1)
html=re.sub(r"const SPRINT_SUBS=\[.*?\];","const SPRINT_SUBS=SUBS.filter(t=>['word','out','mc'].includes(t.form)).map(t=>t.id);",html)
html=re.sub(r"\s*window\.dtpMountCalculator\?\.\([^;]*\);","",html)
for old,new in {
 'WIRTSCHAFT &amp; PROJEKTE <b>//</b> KALKULATION &amp; BESCHAFFUNG <b>//</b> MODUL F2':'GRUNDLAGEN <b>//</b> DATENBANKEN &amp; SQL <b>//</b> MODUL E2',
 'Rechnet <span>sich das?</span>':'Und jetzt zur Blitzrunde: <span>Wer hat noch ein Backup?</span>',
 'Rabatt, Skonto und eine kleine Rate. Das Angebot sieht gut aus, bis du den Rest der Rechnung liest. Hier rechnest du aus, was wirklich auf dem Konto landet oder davon abgeht.':'Das Publikum darf helfen. Außer Sven. Sven hat uns hier reingeritten.',
 'Rechenwege statt Bauchgefühl':'Daten nach Plan',
 'Vom Preisschild <span>zum Durchblick.</span>':'Vom ersten Ticket <span>zur eigenen Abfrage.</span>',
 'Alles zum Nachrechnen. <span>Cent für Cent.</span>':'Alles zum Nachschlagen. <span>Zeile für Zeile.</span>',
 'Modul F2 · Kalkulation &amp; Beschaffung · Rechnet sich das? · v1.0':'Modul E2 · Datenbanken &amp; SQL · Und jetzt zur Blitzrunde: Wer hat noch ein Backup? · v1.0',
 'f2-kalk':'e2-sql','F2KALK_TEST':'E2SQL_TEST',
 "if(t.kind==='text')return esc(t.answer);":"if(t.kind!=='mc')return esc(t.answer);",
 "(t.kind==='text'?'text':t.kind==='num'?'decimal':'numeric')":"'text'",
 "genTask(cat==='all'?pick(CATS)[0]:cat,2,trRecent)":"genTask(cat,2,trRecent)",
 "EXAM_PLAN,buildExam,gradeOf":"EXAM_PLAN,buildExam,gradeOf,labSql",
 'Kurze Umrechnungen aus allen Themen.':'Kurze Fälle aus allen Themen.',
 'Kalkulieren auf Zeit.':'SQL und Datenmodelle auf Zeit.',
 'Zuordnen (Darstellungen)':'Zuordnen (Fachbegriffe)',
 'Begriffe und Formeln sicher verbinden':'Begriffe und Aufgaben sicher verbinden',
}.items():
    html=sub(html,old,new)
html=re.sub(r'(const GRADE_QUIP=)[^\n]+',r"\1{1:'Sehr gut. Der Wochenbericht kann raus.',2:'Gut. Ein paar Abfragen brauchen noch Feinschliff.',3:'Bestanden. Die Aufschlüsselung zeigt dir, wo du noch üben kannst.',4:'Bestanden. Schau dir die Fälle mit Punktverlust an.',5:'Geh die schwächsten Themen im Lernpfad durch.',6:'Fang mit den ersten Stufen an und mach danach einen neuen Versuch.'};",html)
html=re.sub(r"function sprintQuip\(p\)\{[^\n]+","function sprintQuip(p){return p>8?'Stark. Die Warteschlange wird kürzer.':'Nächster Versuch? Die Tickets laufen nicht weg.'}",html)
for old,new in {
 'Erst erklärt, dann vorgerechnet, dann rechnest du.':'Erst erklärt, dann gezeigt, dann bist du dran.',
 'VORGERECHNET':'VORGEMACHT','Vorgerechnet':'Vorgemacht',
 'WIR RECHNEN ES GEMEINSAM DURCH':'WIR GEHEN ES GEMEINSAM DURCH',
 'Sonst rechnet die Lektion für dich':'Sonst verrät die Lektion dir die Lösung',
 'Weniger Raten.<br><em>Mehr Rechnen.</em>':'Weniger Raten.<br><em>Mehr Durchblick.</em>',
 'Wer die Bezugsgröße kennt, fällt auf schöne Prozentzahlen nicht mehr herein.':'Der Bericht kann raus, sobald die Abfrage stimmt.',
 'Thema wählen, in Ruhe rechnen, Hinweis bei Bedarf':'Thema wählen, in Ruhe lösen, Hinweis bei Bedarf',
 'Nach jeder Antwort siehst du den vollständigen Rechenweg.':'Nach jeder Antwort siehst du die Erklärung.',
 'Erst fertig rechnen, dann nachschlagen.':'Erst fertig lösen, dann nachschlagen.',
 'Erklärungen, Rechenwegen':'Erklärungen, Beispielen',
 'Die Labore rechnen für dich':'Die Labore zeigen dir das Ergebnis',
 'Ein Taschenrechner ist erlaubt, ein Umrechner im Netz nicht. Ehrensache.':'Im Prüfungsmodus sind die Labore gesperrt.',
 'Hinweise. Taschenrechner erlaubt':'Hinweise oder SQL-Labore',
 '#f6c177':'#89b4fa','246,193,119':'137,180,250',
 '#100d09':'#0b101c','#201910':'#161e31','#1b150f':'#131b2a','#2b2116':'#25324b',
 '#110e0a':'#0e1521','#17130f':'#111b2e',
 'rgba(16,13,9,':'rgba(11,16,28,','rgba(22,17,12,':'rgba(16,23,38,','rgba(19,15,11,':'rgba(15,22,36,',
 '/* F2: copper accent and clear scenario/question separation. */':'/* E2: scenario and question layout. */',
}.items():
    html=html.replace(old,new)
style='''<style>
.sql-flow,.sql-survey ul,.sql-order{list-style:none;margin:12px 0;padding:0}
.sql-flow,.sql-er div{display:flex;gap:7px;flex-wrap:wrap;align-items:center}
.sql-flow li,.sql-er b{border:1px solid var(--cyan);background:#101a31;padding:6px 10px;border-radius:5px;overflow-wrap:anywhere}
.sql-er,.sql-survey{margin:16px 0}
.sql-er div{margin-top:8px}
.sql-survey li{display:grid;grid-template-columns:minmax(92px,112px) minmax(40px,1fr) 61px;gap:8px;align-items:center;margin:5px 0}
.sql-survey meter{width:100%;accent-color:var(--cyan)}
.sql-order li{padding:3px 0;overflow-wrap:anywhere}
.sql-order b{color:var(--cyan);margin-right:6px}
.sql-lab label{display:block;margin:12px 0}
.sql-lab :is(select,textarea){display:block;width:100%;max-width:100%;font-size:16px;box-sizing:border-box}
.sql-lab textarea{font-family:var(--mono);background:#0b101c;color:#eee;border:1px solid var(--cyan);padding:8px;resize:vertical}
.sql-lab .lab-out{margin-top:12px}
.bitwall{display:block}.bitwall .t{margin-top:8px}
#erBank{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
#erBank button{min-height:44px}
#erBank button[aria-pressed="true"]{outline:2px solid var(--cyan);outline-offset:2px}
#erBoard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(3,80px);position:relative;align-items:center;justify-items:center;background-color:#101a2c;background-image:linear-gradient(#89b4fa18 1px,transparent 1px),linear-gradient(90deg,#89b4fa18 1px,transparent 1px);background-size:16px 16px;border:1px solid #89b4fa60;border-radius:8px}
#erBoard svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
#erBoard path{fill:none;stroke:#89b4fa;stroke-width:2;vector-effect:non-scaling-stroke}
.er-shape{position:relative;width:94%;min-height:48px;padding:3px;border:1px solid var(--cyan);background:#172641;color:#f3f6ff;font-family:inherit;font-weight:650;font-size:clamp(12px,2.6vw,15px);line-height:1.15;overflow-wrap:anywhere;cursor:pointer}
#trainView .mode-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr))}
.er-shape:focus-visible{outline:2px solid #fff;outline-offset:2px}
.er-shape[data-slot="0"]{grid-area:2/1}.er-shape[data-slot="1"]{grid-area:2/2}.er-shape[data-slot="2"]{grid-area:2/3}
.er-shape[data-slot="3"]{grid-area:1/1}.er-shape[data-slot="4"]{grid-area:1/3}.er-shape[data-slot="5"]{grid-area:3/3}
.er-key,.er-attribute{border-radius:50%}
.er-key span{text-decoration:underline}
.er-relation{isolation:isolate;border:0;background:transparent;min-height:70px;padding-inline:14%}
.er-relation:before,.er-relation:after{content:"";position:absolute;inset:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);z-index:-1;background:var(--cyan);pointer-events:none}
.er-relation:after{inset:2px;background:#172641}
.er-shape[data-grade="right"]{box-shadow:inset 0 0 0 2px #78dc9a}
.er-shape[data-grade="wrong"]{box-shadow:inset 0 0 0 2px #ff879b}
.er-relation[data-grade="right"]:before{background:#78dc9a}
.er-relation[data-grade="wrong"]:before{background:#ff879b}
#erFeedback li{padding:3px 0}

</style>'''
html=html.replace('</head>',style+'</head>',1)
built = apply_theme(html)
(ROOT/'lernmodule/e2-sql.html').write_text('\n'.join(line.rstrip() for line in built.splitlines()).rstrip() + '\n')

rows = ['# E2 · Datenbanken & SQL', '', '| ID | Aufgabentyp | Form | Stufe |', '| --- | --- | --- | --- |']
for i, (label, row) in enumerate(zip(LABELS, task_rows)):
    stage = i // 6
    rows.append(f'| `{row[0]}` | {label} | `{row[1]}` | {stage + 1} · {LESSONS[stage][1]} |')
(ROOT / 'docs/modul-auftraege/e2-aufgabentypen.md').write_text('\n'.join(rows) + '\n')
