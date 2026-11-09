"""Neue Einstiegskapitel für CS1 „Compiler sagt nein“. Wird von tools/cs_content.py eingebunden."""
from cs_content_base import C, B, T

L_WELT = {
 'title': 'Was ist Programmieren?', 'cat': 'welt', 'goal': 'Erklären, was ein Programm ist und wie aus einer Idee Anweisungen werden.',
 'intro': '<p>Ein Computer ist unfassbar schnell und unfassbar dumm. Er macht exakt, was dasteht. Nicht das, was du gemeint hast. <strong>Programmieren</strong> heißt deshalb: eine Aufgabe so genau in Schritte zerlegen, dass selbst eine Maschine ohne Fantasie sie richtig erledigt.</p><p>Diese Schritte schreibst du als <strong>Quelltext</strong> in einer <strong>Programmiersprache</strong> auf, zum Beispiel C#. Der Quelltext ist für Menschen lesbar. Daraus entsteht später ein <strong>Programm</strong>, das der Computer ausführt.</p><p>Eine genaue Schrittfolge zur Lösung einer Aufgabe heißt <strong>Algorithmus</strong>. Das Wort klingt nach Mathe-Olymp. Gemeint ist aber nur ein sehr gründliches Rezept.</p>',
 'visual': '<div class="calc">Idee → Algorithmus (Schritte) → Quelltext (C#) → Programm → Ausführung\n\nEVA-Prinzip:\nEingabe      → Verarbeitung  → Ausgabe\nTastatur,      Rechnen,         Bildschirm,\nDatei, Sensor  Prüfen, Sortieren Datei, Drucker</div>',
 'memo': 'Fast jedes Programm folgt dem <strong>EVA-Prinzip</strong>: Eingabe, Verarbeitung, Ausgabe. Die CPU versteht nur <strong>Maschinensprache</strong> (Nullen und Einsen). Menschen schreiben in einer <strong>Hochsprache</strong> wie C#.',
 'example': 'Ein Mini-Programm, an dem du alle drei EVA-Teile siehst:' + C('''
    Console.WriteLine("Wie viele Ports hat der Switch?");
    int ports = int.Parse(Console.ReadLine()!);
    int frei = ports - 2;
    Console.WriteLine("Freie Ports: " + frei);
    ''', input='24', out='Wie viele Ports hat der Switch? Freie Ports: 22'),
 'steps': ['<strong>Eingabe:</strong> Das Programm fragt und liest die Antwort von der Tastatur.', '<strong>Verarbeitung:</strong> Es rechnet 24 − 2, weil zwei Ports für den Uplink reserviert sind.', '<strong>Ausgabe:</strong> Das Ergebnis erscheint im Konsolenfenster.', 'Jeder Schritt steht in einer eigenen Zeile. Der Computer arbeitet sie von oben nach unten ab, ohne zu fragen, ob das sinnvoll ist.'],
 'detail': '<h4>Hochsprache und Maschinensprache</h4><p>Die CPU kennt nur sehr einfache Befehle als Bitmuster, etwa „lade Wert“, „addiere“, „springe“. Das ist <strong>Maschinensprache</strong>. Kein Mensch will darin eine Gerätedatenbank schreiben. Darum gibt es <strong>Hochsprachen</strong> wie C#, Python oder Java. Sie sind lesbarer und müssen vor oder während der Ausführung übersetzt werden. Wie genau, klärt Kapitel 2.</p><h4>Ein Algorithmus aus dem Alltag</h4><p>„Drucker einrichten“ als Schrittfolge: Treiber herunterladen, Treiber installieren, Drucker anschließen, Testseite drucken. Vertauschst du zwei Schritte, wird es spannend. Genauso ist es im Code: Die Reihenfolge ist Teil der Lösung.</p><h4>Syntax und Semantik</h4><p>Die <strong>Syntax</strong> ist die Rechtschreibung einer Sprache: Wo steht das Semikolon, welche Klammer gehört wohin. Die <strong>Semantik</strong> ist die Bedeutung: Was passiert, wenn die Zeile läuft. Ein Programm kann syntaktisch perfekt sein und trotzdem Unsinn tun. Der Computer merkt das nicht. Du hoffentlich schon.</p><h4>Wo dir Programme als Systemintegrator begegnen</h4><p>Skripte, die Benutzer anlegen. Tools, die Logdateien durchsuchen. Monitoring, das bei vollem Speicher Alarm schlägt. Du musst kein Softwareentwickler werden. Aber wer Code lesen kann, muss nicht jedes Mal hoffen, dass das Skript aus dem Forum schon passen wird.</p>',
 'trap': '„Der Computer weiß doch, was ich meine.“ Nein. Er weiß nur, was dasteht. Und <strong>HTML</strong> ist eine Auszeichnungssprache, keine Programmiersprache: Es beschreibt, wie etwas aussieht, aber es rechnet und entscheidet nichts.',
 'labTitle': 'EVA IN ZEITLUPE',
 'trace': T('''
    Console.WriteLine("Speicher in GB?");
    int gb = int.Parse(Console.ReadLine()!);
    int mb = gb * 1024;
    Console.WriteLine(mb + " MB");
    ''', [[1, {}, 'Speicher in GB?', '<strong>Ausgabe</strong> einer Frage. Der Benutzer soll wissen, was er eintippen soll.'], [2, {'gb': '16'}, '', '<strong>Eingabe:</strong> Das Programm wartet, bis 16 und Enter kommen. Der Wert landet in gb.'], [3, {'gb': '16', 'mb': '16384'}, '', '<strong>Verarbeitung:</strong> 16 × 1024 = 16384.'], [4, {'gb': '16', 'mb': '16384'}, '16384 MB', '<strong>Ausgabe</strong> des Ergebnisses. Fertig ist das EVA-Prinzip im Kleinformat.']], input='16'),
 'home': ['Schreibe in normalen deutschen Sätzen einen Algorithmus für „Passwort zurücksetzen“ mit mindestens fünf Schritten. Markiere, was Eingabe, Verarbeitung und Ausgabe ist.', '<ol class="steps-list"><li>Benutzer gibt seinen Anmeldenamen ein. <em>(Eingabe)</em></li><li>System prüft, ob es den Namen gibt. <em>(Verarbeitung)</em></li><li>System erzeugt einen einmaligen Code. <em>(Verarbeitung)</em></li><li>System schickt den Code per E-Mail. <em>(Ausgabe)</em></li><li>Benutzer gibt Code und neues Passwort ein. <em>(Eingabe)</em></li><li>System prüft Code und Passwortregeln und meldet Erfolg oder Fehler. <em>(Verarbeitung, Ausgabe)</em></li></ol>'],
 'types': [['w_begriff', 'Grundbegriffe zuordnen'], ['w_eva', 'EVA erkennen'], ['w_algo', 'Algorithmus sortieren'], ['w_name', 'Fachbegriff nennen'], ['w_sprache', 'Programmiersprache erkennen'], ['w_genau', 'Der Computer denkt nicht mit'], ['w_frei', 'EVA erklären'], ['w_html', 'HTML ist keine Programmiersprache']],
}

L_UEBERSETZEN = {
 'title': 'Compiler, Interpreter und .NET', 'cat': 'uebersetzen', 'goal': 'Compiler und Interpreter unterscheiden und den Weg eines C#-Programms erklären.',
 'intro': '<p>Die CPU versteht nur Maschinensprache. Dein Quelltext muss also übersetzt werden. Dafür gibt es zwei Grundideen.</p><p>Ein <strong>Compiler</strong> übersetzt das <em>ganze</em> Programm, <em>bevor</em> es startet. Findet er einen Fehler, startet gar nichts. Er ist der Kollege, der den kompletten Bericht liest, bevor er unterschreibt.</p><p>Ein <strong>Interpreter</strong> liest das Programm <em>während</em> der Ausführung Anweisung für Anweisung und führt sie sofort aus. Ein Fehler in Zeile 50 fällt erst auf, wenn Zeile 50 dran ist. Bis dahin lief alles prima. Vielleicht sogar beim Kunden.</p>',
 'visual': '<div class="table-wrap"><table class="t"><thead><tr><th></th><th>Compiler</th><th>Interpreter</th></tr></thead><tbody><tr><td>Wann wird übersetzt?</td><td>vorher, alles auf einmal</td><td>während der Ausführung, Schritt für Schritt</td></tr><tr><td>Syntaxfehler</td><td>vor dem Start, nichts läuft</td><td>erst, wenn die Zeile dran ist</td></tr><tr><td>Ergebnis</td><td>ausführbare Datei</td><td>keine eigene Datei, Quelltext + Interpreter nötig</td></tr><tr><td>Tempo beim Ausführen</td><td>meist schneller</td><td>meist langsamer</td></tr><tr><td>Typische Sprachen</td><td>C, C++, Go, Rust</td><td>Python, PowerShell, Bash, JavaScript (klassisch)</td></tr></tbody></table></div>',
 'memo': '<strong>Compiler:</strong> erst alles übersetzen, dann starten. <strong>Interpreter:</strong> Zeile lesen, ausführen, nächste Zeile. <strong>C#</strong> nutzt beides nacheinander: Der C#-Compiler erzeugt Zwischencode (<strong>IL</strong>), und beim Start übersetzt der <strong>JIT-Compiler</strong> der .NET-Laufzeit ihn in Maschinencode.',
 'example': 'Was passiert, wenn in Zeile 3 ein Semikolon fehlt?' + B('''
    Console.WriteLine("Backup startet");
    Console.WriteLine("Kopiere Dateien");
    Console.WriteLine("Fertig")
    '''),
 'steps': ['Der C#-Compiler liest das <em>ganze</em> Programm, bevor irgendetwas läuft.', 'In Zeile 3 fehlt das Semikolon. Er meldet <code>CS1002: ; erwartet</code>.', 'Es entsteht kein Programm. Die Konsole zeigt <strong>gar nichts</strong>, auch nicht die ersten beiden Zeilen.', 'Ein Interpreter hätte „Backup startet“ und „Kopiere Dateien“ noch ausgegeben und wäre erst in Zeile 3 gestolpert.'],
 'detail': '<h4>Der Weg eines C#-Programms</h4><div class="calc">Program.cs  →  C#-Compiler (Roslyn)  →  .dll mit IL-Code\n                                          ↓ beim Start\n        CPU  ←  Maschinencode  ←  JIT-Compiler in der CLR (.NET-Laufzeit)</div><p><strong>IL</strong> (Intermediate Language) ist ein Zwischencode, der auf jeder Plattform mit .NET läuft. Die <strong>CLR</strong> (Common Language Runtime) ist die Laufzeitumgebung: Sie lädt das Programm, verwaltet den Speicher und räumt hinter dir auf. Der <strong>JIT-Compiler</strong> (Just in Time) übersetzt den IL-Code erst beim Ausführen in Maschinencode für genau diese CPU.</p><h4>C#, .NET und das SDK</h4><p><strong>C#</strong> ist die Sprache. <strong>.NET</strong> ist die Plattform darunter: Laufzeit plus riesige Bibliothek fertiger Bausteine wie <code>Console</code>. Das <strong>SDK</strong> (Software Development Kit) brauchst du zum Entwickeln, es enthält den Compiler. Zum reinen Ausführen reicht die <strong>Runtime</strong>.</p><h4>Und welche Variante ist besser?</h4><p>Keine. Kompilierte Programme sind meist schneller und melden Tippfehler früh. Interpretierte Skripte änderst du einfach und startest sie sofort neu, ideal für schnelle Admin-Aufgaben. Darum schreibst du PowerShell-Skripte und keine C#-Programme, um mal eben 30 Benutzer anzulegen.</p><h4>Fehlerarten im Vorgriff</h4><p>Ein <strong>Syntaxfehler</strong> verletzt die Regeln der Sprache. Den findet der Compiler. Ein <strong>Laufzeitfehler</strong> tritt erst beim Ausführen auf, etwa wenn jemand „abc“ eintippt, wo eine Zahl erwartet wird. Ein <strong>logischer Fehler</strong> rechnet einfach falsch, ohne dass irgendwer meckert. Der Compiler sagt bei vielem nein. Bei Logik sagt er leider gar nichts.</p>',
 'trap': '„C# ist eine interpretierte Sprache, weil da ein JIT drin ist.“ Nicht ganz: C# wird <em>kompiliert</em>, zweimal sogar. Erst in IL, beim Start dann per JIT in Maschinencode. Ein Syntaxfehler stoppt das Programm deshalb immer vor dem Start.',
 'labTitle': 'START IN ZEITLUPE',
 'trace': T('''
    Console.WriteLine("Kompiliert.");
    int dateien = 3;
    Console.WriteLine(dateien + " Dateien kopiert.");
    ''', [[1, {}, 'Kompiliert.', 'Vorher hat der Compiler das ganze Programm geprüft und in IL übersetzt. Erst jetzt startet es. Die CLR lädt es, der JIT übersetzt die Zeilen in Maschinencode.'], [2, {'dateien': '3'}, '', 'Die Variable entsteht. Ihr Typ int stand schon beim Kompilieren fest.'], [3, {'dateien': '3'}, '3 Dateien kopiert.', 'Ausgabe. Hätte irgendwo ein Semikolon gefehlt, wärst du nie bis hierhin gekommen.']]),
 'home': ['Lege mit <code>dotnet new console -o Test</code> ein Projekt an. Lösche in <code>Program.cs</code> ein Semikolon und starte mit <code>dotnet run</code>. Lies die Fehlermeldung: Welche Datei, welche Zeile, welcher Code?', '<p>Die Meldung sieht etwa so aus: <code>Program.cs(1,34): error CS1002: ; erwartet</code>. Datei <code>Program.cs</code>, Zeile 1, Spalte 34, Fehlercode CS1002. Ausgegeben wird nichts, denn der Compiler hat nein gesagt.</p>'],
 'types': [['u_wer', 'Compiler oder Interpreter'], ['u_eigen', 'Eigenschaften zuordnen'], ['u_weg', 'Weg des C#-Programms'], ['u_begriff', 'IL, CLR, JIT und SDK'], ['u_nein', 'Compiler sagt nein'], ['u_sprache', 'Sprache und Übersetzung'], ['u_frei', 'Vorteil begründen'], ['u_fehlerart', 'Wann fällt es auf?']],
}

L_GRUND = {
 'title': 'Aufbau eines C#-Programms', 'cat': 'grund', 'goal': 'Ein kleines Programm lesen und jedes Zeichen darin erklären.',
 'intro': '<p>Jetzt wird es konkret. Ein C#-Programm besteht aus <strong>Anweisungen</strong>. Jede Anweisung ist ein Befehl, zum Beispiel „schreibe diese Zeile“. Am Ende jeder Anweisung steht ein <strong>Semikolon</strong>. Es ist der Punkt am Satzende. Fehlt er, hat der Compiler Redebedarf.</p><p>Mehrere Anweisungen kannst du in geschweiften Klammern <code>{ }</code> zu einem <strong>Block</strong> zusammenfassen. Alles hinter <code>//</code> ist ein <strong>Kommentar</strong>: Der Compiler ignoriert ihn, dein Kollege in sechs Monaten zum Glück nicht.</p>',
 'visual': '<div class="calc">Console.WriteLine("Hallo Welt!");\n   │    │     │       │        └ Semikolon: Anweisung zu Ende\n   │    │     │       └ Text in doppelten Anführungszeichen\n   │    │     └ Methode: „schreibe eine Zeile“\n   │    └ Punkt: greift auf etwas zu, das zu Console gehört\n   └ Klasse aus .NET für das Konsolenfenster</div>',
 'memo': 'Jede Anweisung endet mit <code>;</code>. Text steht in doppelten Anführungszeichen. Groß- und Kleinschreibung zählt: <code>console</code> ist nicht <code>Console</code>.',
 'example': 'Wir zerlegen die berühmteste Zeile der Programmierwelt:' + C('Console.WriteLine("Hallo Welt!");', out='Hallo Welt!'),
 'steps': ['<code>Console</code> ist das Konsolenfenster, genauer: eine fertige Klasse aus .NET.', 'Der Punkt heißt „gehe in“. Du greifst damit auf etwas zu, das zu <code>Console</code> gehört.', '<code>WriteLine</code> ist eine Methode, also ein Befehl mit Namen. Sie schreibt eine Zeile und springt danach in die nächste.', 'Die runden Klammern übergeben, womit die Methode arbeiten soll. Hier ist es der Text <code>"Hallo Welt!"</code>.', 'Das Semikolon beendet die Anweisung.'],
 'detail': '<h4>Lesen, schreiben, kommentieren</h4><p><code>Console.ReadLine()</code> wartet, bis jemand etwas tippt und Enter drückt, und liefert den Text zurück. <code>Console.Write()</code> schreibt ohne Zeilenumbruch.</p>' + C('''
    // Fragt nach dem Namen und begrüßt
    Console.Write("Name: ");
    string? name = Console.ReadLine();
    Console.WriteLine("Hallo " + name);
    ''', input='Ada', out='Name: Hallo Ada') + '<h4>Zwei Formen desselben Programms</h4><p>Neue .NET-Projekte erlauben „Top-Level-Anweisungen“: Du schreibst die Befehle direkt in die Datei. In älteren Büchern und in vielen Prüfungsaufgaben steht drumherum noch eine Klasse mit der Methode <code>Main</code>. Dort beginnt das Programm. Das ist dasselbe Programm mit mehr Verpackung.</p>' + C('''
    class Program
    {
        static void Main()
        {
            Console.WriteLine("Hallo Welt!");
        }
    }
    ''') + '<h4>Auf deinem Rechner ausprobieren</h4><p>Dieses Modul führt keinen Code im Browser aus. Dafür brauchst du nur das kostenlose .NET SDK und einen Editor wie VS Code. Im Terminal:</p><pre class="cs plain" tabindex="0">dotnet new console -o MeinTool\ncd MeinTool\ndotnet run</pre><p>Dein Code gehört in die Datei <code>Program.cs</code>.</p>',
 'trap': '<code>WriteLine</code> falsch geschrieben, Anführungszeichen vergessen, Semikolon vergessen. Drei Fehler, die jeder macht. Nur dass der Compiler sie jedes Mal wieder persönlich nimmt.',
 'labTitle': 'PROGRAMM IN ZEITLUPE',
 'trace': T('''
    Console.Write("Gerät: ");
    string? geraet = Console.ReadLine();
    Console.WriteLine("Erfasst: " + geraet);
    ''', [[1, {}, 'Gerät:', 'Write schreibt den Text. Der Cursor bleibt in derselben Zeile.'], [2, {'geraet': '"Switch-07"'}, '', 'ReadLine wartet auf die Eingabe. Wir tippen Switch-07, und der Text landet in der Variablen.'], [3, {'geraet': '"Switch-07"'}, 'Erfasst: Switch-07', 'Text und Variable werden zusammengesetzt und ausgegeben.']], input='Switch-07'),
 'home': ['Schreibe ein Programm, das nach einem Raum fragt und „Ticket für Raum … erfasst.“ ausgibt.', C('''
    Console.WriteLine("Raum?");
    string? raum = Console.ReadLine();
    Console.WriteLine("Ticket für Raum " + raum + " erfasst.");
    ''', input='B12', out='Raum? Ticket für Raum B12 erfasst.')],
 'types': [['g_ausgabe', 'Ausgabe vorhersagen'], ['g_write', 'Write oder WriteLine'], ['g_fix', 'Zeile reparieren'], ['g_luecke', 'Methode ergänzen'], ['g_order', 'Programm sortieren'], ['g_kommentar', 'Kommentar erkennen'], ['g_semikolon', 'Das Semikolon war unschuldig'], ['g_teile', 'Programmteile benennen']],
}

L_TYPEN = {
 'title': 'Datentypen', 'cat': 'typen', 'goal': 'Für jeden Wert den passenden Datentyp wählen und seine Grenzen kennen.',
 'intro': '<p>Im Speicher liegt alles als Nullen und Einsen. Das Bitmuster <code>01000001</code> kann die Zahl 65 sein oder der Buchstabe A. Woher weiß das Programm, was gemeint ist? Durch den <strong>Datentyp</strong>.</p><p>Der Datentyp legt drei Dinge fest: <strong>welche Werte</strong> erlaubt sind, <strong>wie viel Speicher</strong> dafür reserviert wird und <strong>was man damit tun kann</strong>. Mit Zahlen rechnest du, Texte hängst du aneinander. Andersherum wird es lustig, aber selten richtig.</p><p>C# ist <strong>streng typisiert</strong>: Jeder Wert hat einen festen Typ, und der Compiler prüft das. Text in eine Zahl stopfen? Compiler sagt nein.</p>',
 'visual': '<div class="table-wrap"><table class="t"><thead><tr><th>Typ</th><th>Inhalt</th><th>Größe</th><th>Beispiel</th></tr></thead><tbody><tr><td><code>int</code></td><td>ganze Zahl, ca. ±2,1 Milliarden</td><td>32 Bit</td><td><code>24</code></td></tr><tr><td><code>long</code></td><td>große ganze Zahl</td><td>64 Bit</td><td><code>8000000000L</code></td></tr><tr><td><code>double</code></td><td>Kommazahl, nicht immer exakt</td><td>64 Bit</td><td><code>3.5</code></td></tr><tr><td><code>decimal</code></td><td>exakte Dezimalzahl, etwa für Geld</td><td>128 Bit</td><td><code>19.99m</code></td></tr><tr><td><code>bool</code></td><td>wahr oder falsch</td><td>1 Byte</td><td><code>true</code></td></tr><tr><td><code>char</code></td><td>genau ein Zeichen</td><td>16 Bit</td><td><code>\'A\'</code></td></tr><tr><td><code>string</code></td><td>Text, beliebig lang</td><td>je nach Länge</td><td><code>"Router"</code></td></tr></tbody></table></div>',
 'memo': 'Ganze Zahl → <code>int</code>. Geld → <code>decimal</code> mit <code>m</code>. Messwert mit Komma → <code>double</code>. Ja/Nein → <code>bool</code>. Ein Zeichen in <code>\'…\'</code> → <code>char</code>. Text in <code>"…"</code> → <code>string</code>. Im Code steht das Komma als Punkt: <code>3.5</code>.',
 'example': 'Derselbe Inhalt, drei verschiedene Typen:' + C('''
    int zahl = 40;
    string text = "40";
    double komma = 40.0;
    Console.WriteLine(zahl + 2);
    Console.WriteLine(text + 2);
    Console.WriteLine(komma / 3);
    ''', out='42 402 13.333333333333334'),
 'steps': ['<code>zahl</code> ist ein <code>int</code>. Plus 2 wird gerechnet: 42.', '<code>text</code> ist ein <code>string</code>. Plus 2 wird angehängt: „402“. Der Typ entscheidet, was <code>+</code> bedeutet.', '<code>komma</code> ist ein <code>double</code>. Die Division liefert Nachkommastellen.', 'Ein deutsches Windows zeigt dabei ein Komma statt eines Punktes. Im Quelltext steht immer der Punkt.'],
 'detail': '<h4>Wertebereich und Überlauf</h4><p>Ein <code>int</code> hat 32 Bit. Damit passen Zahlen von −2.147.483.648 bis 2.147.483.647 hinein. Was passiert eine Zahl darüber? Standardmäßig springt C# ohne Warnung ans andere Ende. Das nennt man <strong>Überlauf</strong>.</p>' + C('''
    int maximum = int.MaxValue;
    maximum = maximum + 1;
    Console.WriteLine(maximum);
    ''', out='-2147483648') + '<p>Für größere Werte gibt es <code>long</code> mit 64 Bit. Dateigrößen in Byte oder Weltbevölkerung? <code>long</code>.</p><h4>Warum Geld <code>decimal</code> braucht</h4><p><code>double</code> speichert Zahlen binär. Viele Dezimalbrüche wie 0,1 lassen sich so nicht exakt darstellen. Für Messwerte ist der winzige Fehler egal. Für Rechnungen nicht.</p>' + C('''
    double d = 0.1 + 0.2;
    decimal m = 0.1m + 0.2m;
    Console.WriteLine(d == 0.3);
    Console.WriteLine(m == 0.3m);
    ''', out='False True') + '<h4><code>char</code> und <code>string</code></h4><p><code>\'A\'</code> in einfachen Anführungszeichen ist <em>ein</em> Zeichen. <code>"A"</code> in doppelten ist ein Text, der zufällig ein Zeichen lang ist. Für den Compiler zwei verschiedene Typen.</p>' + B('char zeichen = "A";') + '<h4>Wertetypen und Verweistypen</h4><p><code>int</code>, <code>double</code>, <code>bool</code> und <code>char</code> sind <strong>Wertetypen</strong>: Die Variable enthält den Wert selbst. <code>string</code> ist ein <strong>Verweistyp</strong>: Die Variable zeigt auf einen Text im Speicher. Für den Einstieg reicht: Beides funktioniert, wie du es erwartest. Der Unterschied wird später bei Objekten wichtig.</p>',
 'trap': '<code>decimal</code>-Werte brauchen das <code>m</code>: <code>19.99m</code>. Ohne Suffix ist <code>19.99</code> ein <code>double</code>, und der Compiler verweigert die Zuweisung. Und <code>int.MaxValue + 1</code> gibt keine Fehlermeldung, sondern eine sehr negative Überraschung.',
 'labTitle': 'TYPEN IN ZEITLUPE',
 'trace': T('''
    int ports = 48;
    double last = 0.5;
    bool online = true;
    char klasse = 'B';
    string text = klasse + "-" + ports;
    Console.WriteLine(text + " " + online);
    ''', [[1, {'ports': '48 (int)'}, '', 'Eine ganze Zahl: int reicht locker.'], [2, {'ports': '48 (int)', 'last': '0.5 (double)'}, '', 'Auslastung mit Nachkommastellen: double.'], [3, {'ports': '48 (int)', 'last': '0.5 (double)', 'online': 'true (bool)'}, '', 'Ja oder nein: bool.'], [4, {'ports': '48 (int)', 'last': '0.5 (double)', 'online': 'true (bool)', 'klasse': "'B' (char)"}, '', 'Ein einzelnes Zeichen in einfachen Anführungszeichen: char.'], [5, {'ports': '48 (int)', 'last': '0.5 (double)', 'online': 'true (bool)', 'klasse': "'B' (char)", 'text': '"B-48" (string)'}, '', 'Sobald ein string im Spiel ist, wird alles zu Text zusammengehängt.'], [6, {'ports': '48 (int)', 'last': '0.5 (double)', 'online': 'true (bool)', 'klasse': "'B' (char)", 'text': '"B-48" (string)'}, 'B-48 True', 'Ein bool erscheint als True mit großem T.']]),
 'home': ['Lege für einen Laptop sinnvolle Variablen an: Hersteller, Arbeitsspeicher in GB, Preis, Akkustand in Prozent mit Komma, verschlüsselt ja/nein. Gib alles aus.', C('''
    string hersteller = "Contoso";
    int ramGb = 16;
    decimal preis = 899.00m;
    double akku = 87.5;
    bool verschluesselt = true;
    Console.WriteLine(hersteller + " " + ramGb + " " + preis + " " + akku + " " + verschluesselt);
    ''', out='Contoso 16 899.00 87.5 True')],
 'types': [['v_typ', 'Typ zum Wert'], ['t_wahl', 'Typ zum Fall'], ['t_literal', 'Gültige Werte erkennen'], ['t_passt', 'Passt das in einen int?'], ['t_bits', 'Speichergröße'], ['t_ueberlauf', 'Überlauf: aus Plus wird Minus'], ['t_double', 'double gegen decimal'], ['v_fix', 'Falschen Typ reparieren']],
}

L_DATEN = {
 'title': 'Variablen deklarieren und initialisieren', 'cat': 'daten', 'goal': 'Deklaration, Initialisierung und Zuweisung sicher unterscheiden und schreiben.',
 'intro': '<p>Eine <strong>Variable</strong> ist eine beschriftete Schublade im Speicher. Der Datentyp sagt, was hineinpasst, der Name steht auf dem Etikett. Mit Variablen passieren drei verschiedene Dinge, und die Prüfung fragt gern genau danach:</p><ol class="steps-list"><li><strong>Deklarieren:</strong> Die Schublade wird angelegt. <code>int ports;</code> Typ und Name, sonst nichts.</li><li><strong>Initialisieren:</strong> Die Schublade bekommt ihren <em>ersten</em> Wert. <code>ports = 24;</code></li><li><strong>Zuweisen:</strong> Später kommt ein neuer Wert hinein, der alte fliegt raus. <code>ports = 48;</code></li></ol><p>Meist erledigst du die ersten beiden in einer Zeile: <code>int ports = 24;</code> Deklaration mit Initialisierung.</p>',
 'visual': '<div class="calc">int ports;          Deklaration          Schublade „ports“ für int, noch leer\nports = 24;         Initialisierung      erster Wert: 24\nports = 48;         Zuweisung            neuer Wert, 24 ist weg\nint vlan = 10;      Deklaration + Initialisierung in einer Zeile</div>',
 'memo': 'Steht ein <strong>Typ vorne</strong>, wird deklariert. Steht nur <strong>Name = Wert</strong>, wird zugewiesen. Lesen darfst du eine Variable erst, wenn sie einen Wert hat. Jeder Name darf im selben Bereich nur einmal deklariert werden.',
 'example': 'Die drei Schritte, einzeln und sauber:' + C('''
    int ports;
    ports = 24;
    Console.WriteLine(ports);
    ports = 48;
    Console.WriteLine(ports);
    ''', out='24 48'),
 'steps': ['<code>int ports;</code> deklariert die Variable. Sie hat noch keinen Wert, den man lesen dürfte.', '<code>ports = 24;</code> initialisiert sie mit dem ersten Wert.', 'Die Ausgabe zeigt 24.', '<code>ports = 48;</code> ist eine Zuweisung. Kein Typ davor, denn die Schublade gibt es schon.', 'Die zweite Ausgabe zeigt 48. Die 24 ist weg, ohne Abschiedsbrief.'],
 'detail': '<h4>Lesen vor dem ersten Wert</h4><p>C# lässt dich eine lokale Variable nicht lesen, bevor sie einen Wert hat. Der Compiler meldet <code>CS0165: Verwendung der nicht zugewiesenen lokalen Variable</code>. Er hat recht: In der Schublade liegt noch nichts Sinnvolles.</p>' + B('''
    int fehler;
    Console.WriteLine(fehler);
    ''') + '<h4>Doppelt deklariert</h4><p>Zweimal dieselbe Schublade anlegen geht nicht. Wer nur einen neuen Wert will, lässt den Typ weg.</p>' + B('''
    int vlan = 10;
    int vlan = 20;
    ''') + '<h4>Gute Namen</h4><p>Ein Name beginnt mit einem Buchstaben oder Unterstrich, danach dürfen Buchstaben, Ziffern und Unterstriche folgen. Keine Leerzeichen, keine Bindestriche, keine reservierten Wörter wie <code>class</code> oder <code>int</code>. Üblich ist <strong>camelCase</strong>: <code>freiePorts</code>, <code>anzahlGeraete</code>. Und bitte nicht <code>x2</code>, außer du willst dein zukünftiges Ich ärgern.</p><h4><code>var</code> und <code>const</code></h4><p>Bei <code>var</code> leitet der Compiler den Typ aus dem Startwert ab. Deshalb braucht <code>var</code> immer eine Initialisierung. Der Typ bleibt danach fest. <code>const</code> macht einen Wert unveränderlich, er muss sofort feststehen.</p>' + C('''
    var hersteller = "Contoso";
    const int MaxPorts = 48;
    Console.WriteLine(hersteller + " " + MaxPorts);
    ''', out='Contoso 48') + '<h4>Werte tauschen</h4><p>Zwei Variablen tauschen ihre Inhalte? Dafür brauchst du eine dritte Schublade als Zwischenablage. Sonst ist ein Wert verloren.</p>' + C('''
    int a = 1;
    int b = 2;
    int tmp = a;
    a = b;
    b = tmp;
    Console.WriteLine(a + " " + b);
    ''', out='2 1'),
 'trap': '<code>int ports = 24;</code> und später nochmal <code>int ports = 48;</code>? Doppelte Deklaration, Compiler sagt nein. Und <code>var x;</code> ohne Wert geht auch nicht: Woher soll der Compiler den Typ kennen? Raten ist nicht sein Ding.',
 'labTitle': 'SCHUBLADEN IN ZEITLUPE',
 'trace': T('''
    int ports;
    ports = 24;
    string name = "SW-1";
    ports = ports + 24;
    string text = name + ":" + ports;
    Console.WriteLine(text);
    ''', [[1, {'ports': '(deklariert, noch kein Wert)'}, '', '<strong>Deklaration:</strong> Die Schublade ports entsteht. Lesen wäre jetzt ein Compilerfehler.'], [2, {'ports': '24'}, '', '<strong>Initialisierung:</strong> Der erste Wert kommt hinein.'], [3, {'ports': '24', 'name': '"SW-1"'}, '', '<strong>Deklaration mit Initialisierung</strong> in einer Zeile.'], [4, {'ports': '48', 'name': '"SW-1"'}, '', '<strong>Zuweisung:</strong> Erst wird rechts gerechnet (24 + 24), dann ersetzt das Ergebnis den alten Wert.'], [5, {'ports': '48', 'name': '"SW-1"', 'text': '"SW-1:48"'}, '', 'Text plus Zahl ergibt Text.'], [6, {'ports': '48', 'name': '"SW-1"', 'text': '"SW-1:48"'}, 'SW-1:48', 'Die Variable text wird ausgegeben.']]),
 'home': ['Deklariere eine Variable für die Anzahl offener Tickets ohne Startwert. Initialisiere sie danach mit 5, erhöhe sie dann um 3 und gib sie aus.', C('''
    int offeneTickets;
    offeneTickets = 5;
    offeneTickets = offeneTickets + 3;
    Console.WriteLine(offeneTickets);
    ''', out='8')],
 'types': [['d_erkennen', 'Deklaration, Initialisierung oder Zuweisung'], ['d_markieren', 'Zeilen markieren'], ['v_decl', 'Variable anlegen'], ['d_split', 'Getrennt deklarieren und initialisieren'], ['v_wert', 'Neuen Wert verfolgen'], ['d_compiler', 'Was sagt der Compiler?'], ['d_name', 'Gültige Namen'], ['v_konst', 'var und const'], ['d_tausch', 'Werte tauschen']],
}

L_UMWANDELN = {
 'title': 'Typumwandlung, Ein- und Ausgabe', 'cat': 'umwandeln', 'goal': 'Eingaben in den richtigen Typ bringen und Werte sauber ausgeben.',
 'intro': '<p>Die Tastatur liefert immer Text. Tippt jemand <code>42</code>, bekommst du den <code>string</code> „42“, nicht die Zahl 42. Rechnen willst du aber mit Zahlen. Also musst du <strong>umwandeln</strong>.</p><p>Manche Umwandlungen macht C# von selbst, weil dabei nichts verloren geht: <strong>implizit</strong>. Eine kleine Zahl passt immer in eine große Schublade. Bei anderen könnte etwas verloren gehen. Die musst du <strong>explizit</strong> verlangen, damit klar ist: Du weißt, was du tust. Zumindest offiziell.</p>',
 'visual': '<div class="calc">implizit (automatisch, sicher)    int → long → double     int → decimal\nexplizit (Cast, kann abschneiden)  (int)3.9  → 3\nText → Zahl                        int.Parse("42")   double.Parse("3.5")\nText → Zahl, ohne Absturz          int.TryParse(text, out int zahl)\nZahl → Text                        zahl.ToString()   oder  $"{zahl}"</div>',
 'memo': '<code>Console.ReadLine()</code> liefert <code>string</code>. Mit <code>int.Parse</code> wird Text zur Zahl. <code>(int)</code> vor einem <code>double</code> schneidet ab, statt zu runden. <code>$"…{wert}…"</code> setzt Werte in Text ein.',
 'example': 'Eingabe lesen, umwandeln, rechnen, ausgeben:' + C('''
    Console.WriteLine("Wie viele Geräte?");
    string eingabe = Console.ReadLine()!;
    int anzahl = int.Parse(eingabe);
    double proRaum = anzahl / 4.0;
    Console.WriteLine($"{anzahl} Geräte, {(int)proRaum} volle pro Raum");
    ''', input='10', out='Wie viele Geräte? 10 Geräte, 2 volle pro Raum'),
 'steps': ['<code>ReadLine</code> liefert den Text „10“.', '<code>int.Parse</code> macht daraus die Zahl 10.', '<code>10 / 4.0</code> ist wegen <code>4.0</code> eine double-Division: 2,5.', '<code>(int)proRaum</code> schneidet ab: 2. Gerundet wird nicht.', 'Das <code>$</code> vor dem Text erlaubt Platzhalter in <code>{ }</code>. Das heißt <strong>String-Interpolation</strong>.'],
 'detail': '<h4>Implizit und explizit</h4><p>Von <code>int</code> nach <code>long</code> oder <code>double</code> geht nichts verloren, das passiert automatisch. Umgekehrt muss ein <strong>Cast</strong> her: der Zieltyp in runden Klammern.</p>' + C('''
    int klein = 7;
    long gross = klein;
    double kommazahl = klein;
    double messung = 9.99;
    int abgeschnitten = (int)messung;
    Console.WriteLine(gross + " " + kommazahl + " " + abgeschnitten);
    ''', out='7 7 9') + B('''
    double messung = 9.99;
    int wert = messung;
    ''') + '<h4>Parse und TryParse</h4><p><code>int.Parse("abc")</code> kompiliert problemlos und stürzt beim Ausführen mit einer <code>FormatException</code> ab. Ein klassischer Laufzeitfehler. <code>int.TryParse</code> versucht es höflicher: Es liefert <code>true</code> oder <code>false</code> und legt die Zahl bei Erfolg in die <code>out</code>-Variable.</p>' + C('''
    string eingabe = "abc";
    if (int.TryParse(eingabe, out int zahl))
    {
        Console.WriteLine(zahl * 2);
    }
    else
    {
        Console.WriteLine("Das ist keine Zahl.");
    }
    ''', out='Das ist keine Zahl.') + '<h4>Text zusammensetzen</h4><p>Drei Wege führen zum selben Ergebnis. Interpolation ist meist am lesbarsten.</p>' + C('''
    string name = "NAS-3";
    int frei = 512;
    Console.WriteLine(name + ": " + frei + " GB frei");
    Console.WriteLine($"{name}: {frei} GB frei");
    Console.WriteLine(name + ": " + frei.ToString() + " GB frei");
    ''', out='NAS-3: 512 GB frei NAS-3: 512 GB frei NAS-3: 512 GB frei') + '<p>Achtung bei <code>+</code>: C# arbeitet von links nach rechts. <code>"Summe: " + 2 + 3</code> ergibt „Summe: 23“, weil links schon Text steht. <code>"Summe: " + (2 + 3)</code> ergibt „Summe: 5“.</p>',
 'trap': '<code>(int)9.99</code> ist 9, nicht 10. Abschneiden ist kein Runden. Und <code>int.Parse</code> auf eine Benutzereingabe ohne Prüfung ist eine Wette darauf, dass niemand „zwölf“ tippt. Diese Wette verlierst du.',
 'labTitle': 'UMWANDLUNG IN ZEITLUPE',
 'trace': T('''
    string eingabe = Console.ReadLine()!;
    int gb = int.Parse(eingabe);
    double tb = gb / 1024.0;
    int ganz = (int)tb;
    Console.WriteLine($"{gb} GB = {ganz} volle TB");
    ''', [[1, {'eingabe': '"2500"'}, '', 'Getippt wurde 2500. ReadLine liefert trotzdem Text.'], [2, {'eingabe': '"2500"', 'gb': '2500'}, '', 'int.Parse wandelt den Text in die Zahl 2500.'], [3, {'eingabe': '"2500"', 'gb': '2500', 'tb': '2.44140625'}, '', 'Wegen 1024.0 wird als double geteilt.'], [4, {'eingabe': '"2500"', 'gb': '2500', 'tb': '2.44140625', 'ganz': '2'}, '', 'Der Cast (int) schneidet die Nachkommastellen ab.'], [5, {'eingabe': '"2500"', 'gb': '2500', 'tb': '2.44140625', 'ganz': '2'}, '2500 GB = 2 volle TB', 'Interpolation setzt die Werte in den Text.']], input='2500'),
 'home': ['Lies einen Preis mit Komma ein (z. B. 19,99), wandle ihn in <code>decimal</code> um und gib den Preis inklusive 19 % Mehrwertsteuer aus. Fang eine ungültige Eingabe mit TryParse ab.', C('''
    string eingabe = Console.ReadLine()!;
    if (decimal.TryParse(eingabe, out decimal netto))
    {
        decimal brutto = netto * 1.19m;
        Console.WriteLine($"Brutto: {brutto:0.00}");
    }
    else
    {
        Console.WriteLine("Ungültiger Preis.");
    }
    ''', input='10', out='Brutto: 11.90')],
 'types': [['v_parse', 'Eingabe umwandeln'], ['v_cast', 'Kommazahl umwandeln'], ['v_concat', 'Text oder Zahl'], ['a_interp', 'String-Interpolation'], ['k_implizit', 'Implizit oder Cast nötig?'], ['k_tryparse', 'TryParse verfolgen'], ['k_methode', 'Passende Umwandlung nennen'], ['k_wann', 'Abbruch beim Kompilieren oder Ausführen?']],
}

L_LISTE = {
 'title': 'Arrays und erste Methoden', 'cat': 'liste', 'goal': 'Auf Elemente eines Arrays zugreifen und kleine Methoden aufrufen.',
 'intro': '<p>Für 200 Geräte willst du keine 200 Variablen. Ein <strong>Array</strong> hält mehrere Werte gleichen Typs mit fester Größe. Eine <strong>Liste</strong> kann wachsen und schrumpfen. Beide nummerieren ihre Elemente mit einem <strong>Index</strong>, und der beginnt bei 0. Nicht bei 1. Nie. Auch nicht montags.</p><p>Und wenn du dieselbe Berechnung an fünf Stellen brauchst, schreibst du sie einmal als <strong>Methode</strong>: ein benannter Codeblock, den du beliebig oft aufrufst. Einmal reparieren, überall behoben. Damit hast du alle Bausteine für ein erstes kleines Tool.</p>',
 'visual': '<div class="calc">namen   "Router"  "Switch"  "Firewall"\nIndex      0         1          2\nLength = 3, letzter gültiger Index = 2\n\nstatic int  Doppelt (int x)\n  │     │      │        └ Parameter: was hineinkommt\n  │     │      └ Name\n  │     └ Rückgabetyp: was herauskommt\n  └ gehört zum Programm, nicht zu einem Objekt</div>',
 'memo': 'Letzter Index = Anzahl − 1. Arrays nennen die Anzahl <code>Length</code>, Listen <code>Count</code>. Eine Methode mit Rückgabetyp braucht <code>return</code>. <code>void</code> heißt: gibt nichts zurück.',
 'example': 'Ein Array, eine Schleife und eine Methode arbeiten zusammen:' + C('''
    static bool IstVoll(int belegt, int ports)
    {
        return belegt >= ports;
    }

    string[] namen = { "SW-1", "SW-2", "SW-3" };
    int[] belegt = { 24, 18, 24 };
    for (int i = 0; i < namen.Length; i++)
    {
        if (IstVoll(belegt[i], 24))
        {
            Console.WriteLine(namen[i] + " ist voll");
        }
    }
    ''', out='SW-1 ist voll SW-3 ist voll'),
 'steps': ['Zwei Arrays: Index 0 gehört zu SW-1, Index 1 zu SW-2, Index 2 zu SW-3.', 'Die Schleife läuft von 0 bis <code>Length − 1</code>, also bis 2.', 'Bei jedem Durchlauf wird <code>IstVoll</code> aufgerufen. Die Werte landen in den Parametern <code>belegt</code> und <code>ports</code>.', '<code>return</code> liefert <code>true</code> oder <code>false</code> an die Aufrufstelle zurück.', 'Nur bei <code>true</code> erscheint eine Meldung: SW-1 und SW-3.'],
 'detail': '<h4>Arrays anlegen</h4><p>Mit festen Werten oder mit einer Größe. Neue <code>int</code>-Elemente enthalten 0, neue <code>string</code>-Elemente <code>null</code>.</p>' + C('''
    int[] werte = new int[3];
    werte[0] = 5;
    werte[2] = 7;
    Console.WriteLine(werte[0] + werte[1] + werte[2]);
    Console.WriteLine(werte.Length);
    ''', out='12 3') + '<p>Ein Zugriff auf <code>werte[3]</code> kompiliert, stürzt aber beim Ausführen mit einer <code>IndexOutOfRangeException</code> ab.</p><h4>Listen</h4><p><code>List&lt;string&gt;</code> ist eine Liste von Texten. <code>Add</code> hängt an, <code>Remove</code> entfernt das erste passende Element.</p>' + C('''
    List<string> geraete = new List<string>();
    geraete.Add("Router");
    geraete.Add("Switch");
    geraete.Remove("Router");
    Console.WriteLine(geraete.Count);
    Console.WriteLine(geraete[0]);
    ''', out='1 Switch') + '<h4>Methoden: Ausgeben ist nicht Zurückgeben</h4><p>Eine <code>void</code>-Methode tut etwas, etwa eine Meldung ausgeben. Eine Methode mit Rückgabetyp liefert einen Wert, mit dem du weiterarbeitest.</p>' + C('''
    static void Melde(string text)
    {
        Console.WriteLine("Hinweis: " + text);
    }

    static int Summe(int a, int b)
    {
        return a + b;
    }

    Melde("Backup fertig");
    Console.WriteLine(Summe(2, 3) * 10);
    ''', out='Hinweis: Backup fertig 50') + '<p>Die Werte beim Aufruf heißen <strong>Argumente</strong>, die Platzhalter in der Methode <strong>Parameter</strong>. Die Zuordnung erfolgt über die Reihenfolge, nicht über den Namen.</p><h4>Wie es weitergeht</h4><p>Klassen, Objekte, Fehlerbehandlung mit <code>try</code> und <code>catch</code> und ein eigenes Projekt kommen in einem eigenen Folgemodul. Mit diesem Modul kannst du sie lesen, ohne in Panik zu geraten.</p>',
 'trap': 'Eine Schleife mit <code>i &lt;= namen.Length</code> greift am Ende auf einen Index zu, den es nicht gibt. Und eine Methode, die ihr Ergebnis nur mit <code>WriteLine</code> ausgibt, liefert dem Aufrufer nichts zum Weiterrechnen.',
 'labTitle': 'AUFRUF IN ZEITLUPE',
 'trace': T('''
    static int Doppelt(int x)
    {
        return x * 2;
    }

    int[] werte = { 3, 5 };
    int neu = Doppelt(werte[1]) + 1;
    Console.WriteLine(neu);
    ''', [[6, {'werte': '{ 3, 5 }'}, '', 'Das Programm startet hier. Die Methode oben läuft erst, wenn sie aufgerufen wird.'], [7, {'werte': '{ 3, 5 }'}, '', 'werte[1] ist das zweite Element: 5. Damit wird Doppelt aufgerufen.'], [3, {'x': '5'}, '', 'In der Methode heißt der Wert x. return liefert 10 zurück.'], [7, {'werte': '{ 3, 5 }', 'neu': '11'}, '', 'Der Aufruf wird durch 10 ersetzt. Plus 1 ergibt 11.'], [8, {'werte': '{ 3, 5 }', 'neu': '11'}, '11', 'Ausgabe.']]),
 'home': ['Lege ein Array mit vier Ping-Zeiten in Millisekunden an. Schreibe eine Methode <code>Mittelwert</code>, die das Array bekommt und den Durchschnitt als <code>double</code> zurückgibt. Gib ihn aus.', C('''
    static double Mittelwert(int[] werte)
    {
        int summe = 0;
        foreach (int w in werte)
        {
            summe += w;
        }
        return (double)summe / werte.Length;
    }

    int[] ping = { 12, 15, 9, 14 };
    Console.WriteLine(Mittelwert(ping));
    ''', out='12.5')],
 'types': [['a_index', 'Index lesen'], ['a_letzt', 'Letztes Element'], ['a_grenze', 'Index außerhalb'], ['a_gueltig', 'Gültige Zugriffe'], ['a_schreib', 'Array-Zugriff schreiben'], ['a_liste', 'Liste verfolgen'], ['a_laenge', 'Length oder Count'], ['m_aufruf', 'Methode aufrufen'], ['m_param', 'Parameter zuordnen'], ['m_return', 'return ergänzen'], ['m_teile', 'Teile einer Methode'], ['m_kopf', 'Methodenkopf schreiben']],
}
