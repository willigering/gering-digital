"""Baut CS1 „Compiler sagt nein“ (Einstieg in die Programmierung mit C#) aus der gemeinsamen Modul-Oberfläche.
Das bisherige C#-Modul ist als CS2 geparkt: tools/build-cs2.py."""
from pathlib import Path
import base64, json, re, sys
sys.path.insert(0, str(Path(__file__).parent))
from module_theme import apply_theme
import cs_content as cc

ROOT = Path(__file__).resolve().parents[1]
ACC, RGB = '#b794ff', '183,148,255'
shell = (ROOT / 'lernmodule/f2-kalkulation.html').read_text()


def between(s, start, end, value):
    a = s.index(start); b = s.index(end, a)
    return s[:a] + value + s[b:]


def sub(s, old, new):
    if old not in s:
        raise SystemExit('Vorlage geändert, Text fehlt: ' + old[:70])
    return s.replace(old, new)


shell = re.sub(r'<title>.*?</title>', '<title>C# · Compiler sagt nein · DAU TO PRO</title>', shell)
shell = re.sub(r'<meta name="description"[^>]+>', '<meta name="description" content="Einstieg in die Programmierung mit C#: Was ein Programm ist, Compiler und Interpreter, Datentypen, Variablen deklarieren und initialisieren, Umwandlung, Operatoren, Verzweigungen, Schleifen, Arrays und erste Methoden.">', shell)
bg = base64.b64encode((ROOT / 'assets/dau-backgrounds/circuit-signal-768.webp').read_bytes()).decode()
shell = re.sub(r'<script>/\* DTP-HINTERGRUND:.*?</script>', lambda m: '<script>/* DTP-HINTERGRUND: circuit-signal */\n(function(){var B=["data:image/webp;base64,' + bg + '"];document.documentElement.style.setProperty("--bg-tex",\'url("\'+B[0]+\'")\')})();</script>', shell, flags=re.S)

for old, new in {
 'WIRTSCHAFT &amp; PROJEKTE <b>//</b> KALKULATION &amp; BESCHAFFUNG <b>//</b> MODUL F2': 'GRUNDLAGEN <b>//</b> PROGRAMMIEREN MIT C#',
 'Rechnet <span>sich das?</span>': 'Compiler <span>sagt nein.</span>',
 'Rabatt, Skonto und eine kleine Rate. Das Angebot sieht gut aus, bis du den Rest der Rechnung liest. Hier rechnest du aus, was wirklich auf dem Konto landet oder davon abgeht.': 'Dein Einstieg in die Programmierwelt: was ein Programm überhaupt ist, warum Compiler und Interpreter sich nicht mögen, welcher Datentyp in welche Schublade gehört und wie man eine Variable deklariert, ohne dass jemand nein sagt. Am Ende liest du Schleifen, Arrays und erste Methoden. Der Compiler bleibt unerbittlich, aber wenigstens ehrlich.',
 'Rechenwege statt Bauchgefühl': 'Code lesen statt raten',
 'Vom Preisschild <span>zum Durchblick.</span>': 'Von „Was ist ein Programm?“ <span>bis zur ersten Methode.</span>',
 'Alles zum Nachrechnen. <span>Cent für Cent.</span>': 'Alles zum Nachschlagen. <span>Zeile für Zeile.</span>',
 'Erst erklärt, dann vorgerechnet, dann rechnest du.': 'Erst erklärt, dann vorgemacht, dann bist du dran.',
 '② Vorgerechnet': '② Vorgemacht', '① VERSTEHEN · ② VORGERECHNET': '① VERSTEHEN · ② VORGEMACHT',
 'WIR RECHNEN ES GEMEINSAM DURCH': 'WIR GEHEN ES GEMEINSAM DURCH',
 'Sonst rechnet die Lektion für dich, und das bringt dir in der Prüfung genau nichts.': 'Sonst liest die Lektion für dich, und das bringt dir in der Prüfung genau nichts.',
 'Zehn Kapitel mit Erklärungen, Rechenwegen, interaktiven Laboren und einem Kurz-Check am Ende. Die Labore rechnen für dich, darum sind sie im Sprint und in der Prüfung gesperrt.': 'Zehn Kapitel vom ersten Algorithmus bis zur ersten Methode, mit Beispielen, Abläufen in Zeitlupe und einem Kurz-Check. Der Code in diesem Modul läuft nicht im Browser, sondern wurde vorab mit dem echten C#-Compiler geprüft. Im Sprint und in der Prüfung ist das Nachschlagwerk gesperrt.',
 'Nach jeder Antwort siehst du den vollständigen Rechenweg.': 'Nach jeder Antwort siehst du die Erklärung.',
 'Thema wählen, in Ruhe rechnen, Hinweis bei Bedarf': 'Thema wählen, in Ruhe lösen, Hinweis bei Bedarf',
 'Kalkulieren auf Zeit. Ohne Hilfe, ohne Tab-Wechsel': 'Code lesen auf Zeit. Ohne Hilfe, ohne Tab-Wechsel',
 'Begriffe und Formeln sicher verbinden': 'Begriffe und Bedeutungen sicher verbinden',
 '<b>0</b><span>Hinweise. Taschenrechner erlaubt</span>': '<b>0</b><span>Hinweise, kein Nachschlagwerk</span>',
 'Ein Taschenrechner ist erlaubt, ein Umrechner im Netz nicht. Ehrensache.': 'Ein Compiler im Nebenfenster wäre geschummelt. Ehrensache.',
 'Weniger Raten.<br><em>Mehr Rechnen.</em>': 'Weniger Raten.<br><em>Mehr Kompilieren.</em>',
 'Wer die Bezugsgröße kennt, fällt auf schöne Prozentzahlen nicht mehr herein.': 'Wer Code lesen kann, muss Fehlermeldungen nicht mehr persönlich nehmen.',
 'Modul F2 · Kalkulation &amp; Beschaffung · Rechnet sich das? · v1.0': 'Programmieren mit C# · Compiler sagt nein · v2.0',
 'Stufe wird geladen …': 'Stufe wird geladen …',
 'Lernpfad, Nachschlagwerk und Training sind bis zur Abgabe gesperrt.': 'Lernpfad, Nachschlagwerk und Training sind bis zur Abgabe gesperrt.',
 'Erst fertig rechnen, dann nachschlagen.': 'Erst fertig lösen, dann nachschlagen.',
 'Kurze Umrechnungen aus allen Themen.': 'Kurze Aufgaben aus allen Themen.',
 'Du rechnest schon schneller als ein Pentium II.': 'Du liest schon schneller als der Kollege mit dem Code-Review.',
 'Bist du sicher, dass du kein Taschenrechner bist?': 'Bist du sicher, dass du kein Compiler bist?',
 'Deine Rechnung hält sogar einer Buchhaltungsbesprechung stand. Fast schade um die schönen Ausreden.': 'Dein Code würde sogar das Review am Freitagnachmittag überstehen. Fast schade um die schönen Ausreden.',
 'Ein paar Nachkommastellen wackeln noch, aber das Fundament steht.': 'Ein paar Warnungen bleiben, aber es baut.',
 'Der Rechner sagt: Neustart erforderlich.': 'Der Compiler meldet: viele Fehler, wenig Hoffnung, aber behebbar.',
 'Alle Aufgaben mit Lösungsweg': 'Alle Aufgaben mit Erklärung',
}.items():
    shell = sub(shell, old, new)
shell = shell.replace('Null Punkte. Immerhin binär korrekt dargestellt.', 'Null Punkte. Immerhin keine Ausnahme geworfen.')
shell = shell.replace("'zahlen'", "'cs'") if False else shell

# Akzentfarbe und violett getönte dunkle Flächen
shell = shell.replace('#f6c177', ACC).replace('246,193,119', RGB)
for old, new in {'#100d09': '#0e0b14', '#201910': '#1a1526', '#1b150f': '#161223', '#2b2116': '#241c33', '#110e0a': '#0f0c16', '#17130f': '#14101e', 'rgba(16,13,9,': 'rgba(14,11,20,', 'rgba(22,17,12,': 'rgba(19,15,28,', 'rgba(19,15,11,': 'rgba(17,13,25,'}.items():
    shell = shell.replace(old, new)
shell = shell.replace('/* F2: copper accent and clear scenario/question separation. */', '/* CS1: Code, Abläufe und klare Trennung von Ausgangslage und Frage. */')
shell = shell.replace('.bitwall .cash{font:900 38px var(--mono)', '.bitwall .cash{font:900 30px var(--mono)')
extra = '''<style>
pre.cs{margin:10px 0;padding:12px 14px;background:#0b0912;border:1px solid #b794ff44;border-radius:6px;color:#e8e3f5;font:13.5px/1.55 var(--mono);white-space:pre;overflow-x:auto;max-width:100%;tab-size:4}
pre.cs.bad{border-color:#ff7b8a88}pre.cs:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.t-kw{color:#c7a6ff;font-weight:700}.t-str{color:#9be58f}.t-num{color:#ffc27a}.t-com{color:#8f8aa3;font-style:italic}.t-typ{color:#7fd6ff}
.cs-lab .trace-code{list-style:decimal;margin:0;padding:12px 12px 12px 44px;background:#0b0912;border:1px solid #b794ff44;border-radius:6px;overflow-x:auto;color:#8f8aa3;font:13px/1.6 var(--mono)}
.trace-code li{white-space:pre}.trace-code code{background:none;border:0;padding:0;color:#e8e3f5;font:inherit}.trace-code li.cur{background:#b794ff33;box-shadow:-44px 0 0 #b794ff33}
.trace-side{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.trace-side b{font-size:11px;letter-spacing:.15em;color:var(--cyan)}.trace-side pre{margin:6px 0 0;padding:8px 10px;min-height:44px;background:#05040a;border:1px solid #ffffff22;border-radius:6px;color:#9be58f;font:13px/1.5 var(--mono);white-space:pre-wrap;overflow-wrap:anywhere}
.trace-var{display:flex;justify-content:space-between;gap:10px;font:13px var(--mono);border-bottom:1px solid #ffffff14;padding:4px 0;overflow-wrap:anywhere}.trace-var strong{color:#ffc27a;text-align:right}.trace-note{min-height:3em;margin:0}
.home-task{border-left:3px solid var(--cyan);padding:2px 14px;margin:16px 0}.adv{border:1px dashed #b794ff66}.adv-tag{display:inline-block;font-size:11px;letter-spacing:.15em;color:var(--cyan);margin-bottom:6px}
#backToTask{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:60;box-shadow:0 8px 28px #000a}
.task-prompt{overflow-wrap:anywhere}.result .why,.review{overflow-wrap:anywhere}.opt span:last-child{overflow-wrap:anywhere}
@media(max-width:610px){.trace-side{grid-template-columns:1fr}pre.cs{font-size:12.5px;padding:10px}}
</style>'''
extra = extra.replace('</style>', '''.set-list{white-space:pre-wrap;overflow-wrap:anywhere}@media(max-width:610px){.set-list{font-size:12.5px;line-height:1.4;margin:6px 0}.scenario{font-size:15px;line-height:1.45;padding:8px 12px}}.set-why{margin:10px 0 0;padding-left:18px}.set-why li{margin:3px 0;overflow-wrap:anywhere}.set-why b{color:var(--cyan)}
</style>''', 1)
shell = shell.replace('</head>', extra + '</head>', 1)

# Nachschlagwerk
ch = '<nav class="chapter-grid" aria-label="Kapitel">' + ''.join(f'<a class="ch-tile" href="#ch{i+1}"><span>{i+1:02}</span><strong>{c["title"]}</strong><small>{c["goal"]}</small></a>' for i, c in enumerate(cc.LESSONS)) + '<a class="ch-tile" href="#ch11"><span>+</span><strong>Weiterführendes</strong><small>Überblick, was nach den Grundlagen kommt.</small></a></nav>'
for i, c in enumerate(cc.LESSONS):
    steps = ''.join('<li>' + s + '</li>' for s in c['steps'])
    ch += f'''<section id="ch{i+1}" class="panel cy"><div class="chapter-head"><span class="ch-no">{i+1:02}</span><div><h3>{c['title']}</h3><p>{c['goal']}</p></div></div>{c['intro']}{c['visual']}<div class="memo">{c['memo']}</div><div class="example"><div class="lbl">VORGEMACHT</div><div>{c['example']}</div><ol class="steps-list">{steps}</ol></div>{c['detail']}<div class="lab cs-lab"><div class="lab-head"><strong>{c['labTitle']}</strong><span class="subtle">Klicke dich Zeile für Zeile durch das Programm.</span></div><div data-trace="{i}"></div></div><div class="trap"><strong>Typische Fallen:</strong> {c['trap']}</div><div class="home-task"><h4>Auf deinem Rechner ausprobieren</h4><p>{c['home'][0]}</p><details><summary>Musterlösung ansehen</summary>{c['home'][1]}</details></div><div class="lab"><div class="lab-head"><strong>KURZ-CHECK</strong></div><div class="mini-check" data-cat="{c['cat']}"></div></div><a class="backtop" href="#learnTop">↑ Kapitelübersicht</a></section>'''
adv = ''.join(f'<h4>{t}</h4><p>{d}</p>{code}' for t, d, code in cc.ADVANCED)
ch += f'''<section id="ch11" class="panel adv"><span class="adv-tag">WEITERFÜHRENDES WISSEN · NICHT PRÜFUNGSSTOFF DIESES MODULS</span><h3>Was nach den Grundlagen kommt</h3><p>Kurze Einführungen, damit du weißt, was es gibt und wonach du suchen kannst.</p>{adv}<a class="backtop" href="#learnTop">↑ Kapitelübersicht</a></section>
<section class="panel go"><h3>Quellen &amp; Grenzen</h3><p>Eigene Übungsaufgaben, keine offiziellen IHK-Aufgaben. Ausgaben sind für das Verhalten von C# unter .NET 8 geprüft. Kommazahlen erscheinen auf einem deutschen System mit Komma. Dieses Modul führt deinen Code nicht aus: Eigene Programme schreibst und startest du auf deinem Rechner.</p><ul class="sources"><li><a href="https://learn.microsoft.com/de-de/dotnet/csharp/" rel="noopener">Microsoft Learn: C#-Dokumentation</a></li><li><a href="https://learn.microsoft.com/de-de/dotnet/csharp/language-reference/" rel="noopener">Microsoft Learn: C#-Referenz</a></li><li><a href="https://learn.microsoft.com/de-de/dotnet/core/tutorials/with-visual-studio-code" rel="noopener">Microsoft Learn: Konsolenanwendung mit Visual Studio Code</a></li></ul></section>'''
shell = between(shell, '<nav class="chapter-grid"', '<!-- ================= TRAININGSRAUM', ch + '\n</section>\n\n  ')
shell = sub(shell, '</main>', '</main>\n<button type="button" class="btn primary" id="backToTask" hidden>ZURÜCK ZUR AUFGABE ↩</button>')

# Inhalte und Aufgaben
lessons = [{k: v for k, v in c.items() if k != 'home'} for c in cc.LESSONS]
gen = (ROOT / 'tools/cs-generators.js').read_text().replace('__CONTENT__', json.dumps(lessons, ensure_ascii=False))
shell = between(shell, '/* Topic content only', '/* ================= Antwort prüfen', gen + '\n')
shell = between(shell, 'const FMT=', 'function showAnswer(t)', (ROOT / 'tools/cs-parser.js').read_text() + '\n')
shell = between(shell, 'let match=[],', '/* ================= Prüfungsmodus', (ROOT / 'tools/cs-match.js').read_text().replace('__MATCH__', json.dumps(cc.MATCH_BANK, ensure_ascii=False)) + '\n')
shell = between(shell, '// Hero: a visible purchase', '/* Kurz-Checks */', (ROOT / 'tools/cs-ui.js').read_text() + '\n')
shell = re.sub(r"const SPRINT_SUBS=\[.*?\];", "const SPRINT_SUBS=['w_name','u_begriff','g_write','t_passt','v_wert','v_concat','o_int','o_mod','i_zweig','l_anzahl','a_index','m_aufruf'];", shell)
shell = sub(shell, 'SUBLABEL.match=\'Zuordnen (Darstellungen)\'', "SUBLABEL.match='Zuordnen (Begriffe)'")

# Eingabe: immer Text. Rückweg ins Nachschlagwerk, das zählt als Hilfe.
shell = shell.replace("(t.kind==='text'?'text':t.kind==='num'?'decimal':'numeric')", "'text'")
shell = sub(shell, "if(t.kind==='num')return fd(t.answer,t.d||0)+(t.unit?' '+t.unit:'');", "")
shell = sub(shell, "if(t.kind==='text')return esc(t.answer);", "if(t.kind!=='mc')return esc(t.answer);")
shell = sub(shell, "'>Hinweis anzeigen</button>')", "'>Hinweis anzeigen</button><button type=\"button\" class=\"btn ghost\" data-r=\"ref\">Im Nachschlagwerk nachsehen</button>')")
shell = sub(shell, "const next=q('next');if(next)next.addEventListener", "const ref=q('ref');if(ref){if(o.noRef)ref.hidden=true;else ref.addEventListener('click',()=>{usedHint=true;openRef(t)})}\n const next=q('next');if(next)next.addEventListener")
shell = sub(shell, "if(tip)tip.hidden=true;\n  o.onAnswer", "if(tip)tip.hidden=true;if(ref)ref.hidden=true;\n  o.onAnswer")
shell = sub(shell, "renderTask(el,t,{focus:f,noFocus:!f,", "renderTask(el,t,{noRef:true,focus:f,noFocus:!f,")
shell = re.sub(r"window\.dtpMountCalculator\?\.\([^;]*\);", "", shell)
shell = shell.replace('f2-kalk', 'cs1-start').replace('window.F2KALK_TEST', 'window.CS1START_TEST')
shell = shell.replace('<html lang="de"', '<html lang="de" data-game-id="cs1"', 1)
shell = sub(shell, "$('backToTask')" if False else "/* Start */", "/* Start */")

html = apply_theme(shell)
# Spielmodus wie in A1: Serie, Rekord, Leuchteffekte. Farbe auf den Modulakzent umgestellt.
game_css = (ROOT / 'tools/module-game.css').read_text().replace('166,240,90', RGB).replace('#a6f05a', ACC)
game_js = (ROOT / 'tools/module-game.js').read_text()
html = html.replace('</head>', '<!-- DTP-SPIEL START -->\n<style>\n' + game_css.rstrip() + '\n</style>\n<script>\n' + game_js.rstrip() + '\n</script>\n<!-- DTP-SPIEL END -->\n</head>', 1)
html = html.replace("  const res=q('res');res.className='result'+(ok?'':' bad');\n", "  const res=q('res');res.className='result'+(ok?'':' bad');\n  window.dtpGame?.answer(ok,host);\n", 1)
if 'dtpGame?.answer' not in html:
    raise SystemExit('Spielmodus-Haken nicht gesetzt')
for bad in ['F2', 'Kalkul', 'Rabatt', 'Skonto']:
    hits = [m.start() for m in re.finditer(bad, re.sub(r'base64,[A-Za-z0-9+/=]+', '', html))]
    if hits:
        clean = re.sub(r'base64,[A-Za-z0-9+/=]+', '', html)
        raise SystemExit(f'Reste aus der Vorlage: {bad}: ' + clean[hits[0]-60:hits[0]+60])
(ROOT / 'lernmodule/cs1-csharp.html').write_text(html)
(ROOT / 'tests/support').mkdir(exist_ok=True)
(ROOT / 'tests/support/cs-snippets.json').write_text(json.dumps(cc.SNIPPETS, ensure_ascii=False, indent=0))
FORMS = dict(re.findall(r"^S\('\w+','(\w+)','(\w+)'", (ROOT / 'tools/cs-generators.js').read_text(), re.M))
rows = ['# CS1 – Compiler sagt nein', '', '| ID | Name | Form | Teilthema | Stufe |', '| --- | --- | --- | --- | --- |']
for i, c in enumerate(cc.LESSONS):
    rows += [f'| `{a}` | {b} | {FORMS.get(a, "")} | {c["title"]} | {i+1} |' for a, b in c['types']]
(ROOT / 'docs/modul-auftraege/cs1-aufgabentypen.md').write_text('\n'.join(rows) + '\n')
print('CS1 gebaut:', len(html), 'Zeichen,', len(cc.SNIPPETS), 'Codeblöcke')
