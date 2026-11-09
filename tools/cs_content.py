"""Lerninhalte von CS1 „Compiler sagt nein“. Jeder Codeblock wird in tests/cs_verify.cjs mit dem echten C#-Compiler geprüft.
Kapitel 7 bis 9 stammen aus dem bisherigen C#-Modul (jetzt geparkt als CS2, tools/cs2_content.py)."""
from cs_content_base import SNIPPETS, C, B, T, hl
from cs_lessons_new import L_WELT, L_UEBERSETZEN, L_GRUND, L_TYPEN, L_DATEN, L_UMWANDELN, L_LISTE

_OLD = [
{
 'title': 'Operatoren und Berechnungen', 'cat': 'rechnen', 'goal': 'Du rechnest Ausdrücke so aus, wie C# sie ausrechnet.',
 'intro': '<p>Ein Backup hat 10 GB, drei Festplatten sollen es sich teilen. <code>10 / 3</code> ergibt in C# <strong>3</strong>. Kein Bug: Zwei <code>int</code>-Werte ergeben eine <strong>Integerdivision</strong>, und der Nachkommateil wird abgeschnitten. Niemand hat dich gefragt, ob du den Rest noch brauchst.</p>',
 'visual': '<div class="calc">+  −  *  /   Rechnen\n%            Rest der Division (Modulo)\n== != &lt; &gt; &lt;= &gt;=   Vergleichen, Ergebnis ist bool\n&amp;&amp;  ||  !     und, oder, nicht\n=  +=  -=  ++  --   Zuweisen und Ändern</div>',
 'memo': 'Sind beide Werte <code>int</code>, ist das Ergebnis <code>int</code>. Ist einer <code>double</code>, gibt es Nachkommastellen. Punkt vor Strich gilt auch hier, Klammern gehen vor.',
 'example': 'Wie viele volle 3er-Pakete passen in 10 Geräte, und wie viele bleiben übrig?' + C('''
    int geraete = 10;
    Console.WriteLine(geraete / 3);
    Console.WriteLine(geraete % 3);
    Console.WriteLine(geraete / 3.0 > 3);
    ''', out='3 1 True'),
 'steps': ['<code>10 / 3</code>: beide <code>int</code>, also 3 mit abgeschnittenem Rest.', '<code>10 % 3</code>: 3 × 3 = 9, es bleibt 1. Modulo liefert genau diesen Rest.', '<code>3.0</code> ist ein <code>double</code>, also wird echt geteilt: etwa 3,33.', '3,33 ist größer als 3. Der Vergleich ergibt <code>True</code>.'],
 'detail': '<h4>Abkürzungen beim Zuweisen</h4><p><code>x += 5</code> bedeutet <code>x = x + 5</code>. <code>x++</code> erhöht um 1. Steht das <code>++</code> hinter der Variablen, liefert der Ausdruck noch den alten Wert. Steht es davor, den neuen.</p>' + C('''
    int x = 5;
    Console.WriteLine(x++);
    Console.WriteLine(x);
    Console.WriteLine(++x);
    ''', out='5 6 7') + '<h4>Logik</h4><p><code>&amp;&amp;</code> ist nur wahr, wenn beide Seiten wahr sind. <code>||</code> reicht eine wahre Seite. <code>!</code> dreht um. <code>&amp;&amp;</code> wird vor <code>||</code> ausgewertet.</p>' + C('''
    bool online = true;
    bool wartung = false;
    Console.WriteLine(online && !wartung);
    ''', out='True') + '<h4>Rangfolge</h4><p>Reihenfolge von oben nach unten: Klammern, dann <code>* / %</code>, dann <code>+ -</code>, dann Vergleiche, dann <code>&amp;&amp;</code>, dann <code>||</code>, zuletzt die Zuweisung.</p>',
 'trap': '<code>double d = 10 / 4;</code> ergibt 2, nicht 2,5. Rechts wird zuerst mit <code>int</code> gerechnet, erst danach landet die 2 im <code>double</code>. Die Variable kann nichts dafür.',
 'labTitle': 'RECHNUNG IN ZEITLUPE',
 'trace': T('''
    int a = 7;
    int b = 2;
    int c = a / b;
    int r = a % b;
    a += r;
    Console.WriteLine(c + " " + a);
    ''', [[1, {'a': '7'}, '', 'a enthält 7.'], [2, {'a': '7', 'b': '2'}, '', 'b enthält 2.'], [3, {'a': '7', 'b': '2', 'c': '3'}, '', '7 / 2 mit zwei int-Werten ergibt 3. Der Rest wird abgeschnitten.'], [4, {'a': '7', 'b': '2', 'c': '3', 'r': '1'}, '', '7 % 2 liefert den Rest: 1.'], [5, {'a': '8', 'b': '2', 'c': '3', 'r': '1'}, '', 'a += r heißt a = a + r, also 8.'], [6, {'a': '8', 'b': '2', 'c': '3', 'r': '1'}, '3 8', 'Ausgabe von c, Leerzeichen und a.']]),
 'home': ['Lies eine Zahl ein und gib aus, ob sie gerade ist. Tipp: Modulo.', C('''
    int zahl = int.Parse(Console.ReadLine()!);
    Console.WriteLine(zahl % 2 == 0);
    ''', input='14', out='True')],
 'types': [['o_int', 'Integerdivision'], ['o_mod', 'Modulo'], ['o_double', 'Division mit double'], ['o_rang', 'Rangfolge'], ['o_inkr', 'Inkrement'], ['o_vergl', 'Wahre Vergleiche finden'], ['o_logik', 'Logische Operatoren'], ['o_zuw', 'Zuweisung abkürzen'], ['o_gerade', 'Ausdruck schreiben'], ['o_operator', 'Operator nennen'], ['o_klammer', 'Klammern setzen'], ['o_fehler', 'Warum kommt 2 heraus?']],
},
{
 'title': 'Verzweigungen', 'cat': 'wenn', 'goal': 'Du sagst vorher, welcher Zweig eines Programms läuft.',
 'intro': '<p>Freier Plattenplatz unter 10 %? Dann Warnung. Sonst alles gut. Genau das macht <code>if</code>: Es prüft einen Ausdruck, der <code>true</code> oder <code>false</code> ergibt, und entscheidet, welcher Block läuft.</p>',
 'visual': '<div class="calc">if (Bedingung) → true → erster Block\n               → false → else-Block\nDanach läuft das Programm normal weiter.</div>',
 'memo': 'Die Bedingung steht in runden Klammern und muss ein <code>bool</code> ergeben. Vergleichen heißt <code>==</code>, nicht <code>=</code>. Bei <code>else if</code> läuft nur der erste passende Zweig.',
 'example': 'Der Türsteher des Serverraums:' + C('''
    int alter = 17;

    if (alter >= 18)
    {
        Console.WriteLine("Zutritt erlaubt.");
    }
    else
    {
        Console.WriteLine("Nö. Erst erwachsen werden.");
    }
    ''', out='Nö. Erst erwachsen werden.'),
 'steps': ['<code>alter</code> enthält 17.', 'Das Programm prüft <code>17 &gt;= 18</code>. Das ist <code>false</code>.', 'Der erste Block wird übersprungen, der <code>else</code>-Block läuft.', 'Danach geht es unter der letzten Klammer weiter. Hier ist das Programm zu Ende.'],
 'detail': '<h4><code>else if</code></h4><p>Die Zweige werden von oben geprüft. Der erste Treffer gewinnt, der Rest wird nicht mehr angesehen. Die Reihenfolge entscheidet also mit.</p>' + C('''
    int frei = 8;
    if (frei < 5)
    {
        Console.WriteLine("Kritisch");
    }
    else if (frei < 10)
    {
        Console.WriteLine("Warnung");
    }
    else
    {
        Console.WriteLine("OK");
    }
    ''', out='Warnung') + '<h4><code>switch</code></h4><p>Passt, wenn ein einziger Wert mit festen Möglichkeiten verglichen wird, etwa ein Menü. <code>break</code> beendet den Fall, <code>default</code> fängt alles andere auf.</p>' + C('''
    string wahl = "2";
    switch (wahl)
    {
        case "1":
            Console.WriteLine("Neues Gerät");
            break;
        case "2":
            Console.WriteLine("Liste anzeigen");
            break;
        default:
            Console.WriteLine("Unbekannt");
            break;
    }
    ''', out='Liste anzeigen') + '<h4>Der Klassiker</h4><p><code>=</code> weist zu, <code>==</code> vergleicht. C# fängt die Verwechslung hier ab, weil das Ergebnis kein <code>bool</code> ist:</p>' + B('''
    int x = 5;
    if (x = 5)
    {
        Console.WriteLine("fünf");
    }
    '''),
 'trap': 'Text vergleichst du mit <code>==</code> exakt: <code>"Ja" == "ja"</code> ist <code>false</code>. Und wer <code>wert &lt; 10</code> vor <code>wert &lt; 5</code> prüft, sieht den Zweig „Kritisch“ nie.',
 'labTitle': 'ENTSCHEIDUNG IN ZEITLUPE',
 'trace': T('''
    int frei = 7;
    string status;
    if (frei < 5)
    {
        status = "Kritisch";
    }
    else if (frei < 10)
    {
        status = "Warnung";
    }
    else
    {
        status = "OK";
    }
    Console.WriteLine(status);
    ''', [[1, {'frei': '7'}, '', 'frei enthält 7.'], [2, {'frei': '7', 'status': '(leer)'}, '', 'status ist angelegt, hat aber noch keinen Wert.'], [3, {'frei': '7', 'status': '(leer)'}, '', '7 &lt; 5 ist false. Der Block wird übersprungen.'], [7, {'frei': '7', 'status': '(leer)'}, '', '7 &lt; 10 ist true. Treffer.'], [9, {'frei': '7', 'status': '"Warnung"'}, '', 'status bekommt seinen Wert. Der else-Zweig wird nicht mehr angesehen.'], [15, {'frei': '7', 'status': '"Warnung"'}, 'Warnung', 'Nach dem gesamten if geht es hier weiter.']]),
 'home': ['Lies einen Akkustand ein: unter 20 „Laden“, unter 80 „OK“, sonst „Voll“.', C('''
    int akku = int.Parse(Console.ReadLine()!);
    if (akku < 20)
    {
        Console.WriteLine("Laden");
    }
    else if (akku < 80)
    {
        Console.WriteLine("OK");
    }
    else
    {
        Console.WriteLine("Voll");
    }
    ''', input='55', out='OK')],
 'types': [['i_zweig', 'if und else verfolgen'], ['i_elseif', 'else if verfolgen'], ['i_switch', 'switch verfolgen'], ['i_op', 'Bedingung ergänzen'], ['i_gleich', '= statt =='], ['i_nest', 'Verschachtelung'], ['i_logik', 'Verknüpfte Bedingung'], ['i_text', 'Text exakt vergleichen'], ['i_werte', 'Bei welchen Werten?'], ['i_order', 'Verzweigung bauen'], ['i_wort', 'Schlüsselwort nennen']],
},
{
 'title': 'Schleifen', 'cat': 'schleife', 'goal': 'Du sagst genau, wie oft eine Schleife läuft und warum.',
 'intro': '<p>Zehn Geräte anpingen, zehnmal dieselbe Zeile schreiben? Spätestens bei 500 Geräten kündigst du. Eine <strong>Schleife</strong> wiederholt einen Block, solange eine Bedingung gilt.</p>',
 'visual': '<div class="calc">for (Start; Bedingung; Schritt)\n1. Start läuft einmal\n2. Bedingung true? Sonst Ende\n3. Block läuft\n4. Schritt läuft, weiter bei 2</div>',
 'memo': 'Durchläufe zählst du, indem du die Werte der Zählvariablen aufschreibst. Bei <code>i &lt; 10</code> mit Start 0 sind es zehn, bei <code>i &lt;= 10</code> elf.',
 'example': 'Eine Meldung für drei Ports:' + C('''
    for (int i = 1; i <= 3; i++)
    {
        Console.WriteLine("Port " + i);
    }
    ''', out='Port 1 Port 2 Port 3'),
 'steps': ['<code>int i = 1</code> läuft genau einmal.', '<code>1 &lt;= 3</code> ist wahr, also läuft der Block: „Port 1“.', '<code>i++</code> macht aus 1 eine 2. Dann wieder prüfen.', 'Das passiert noch für 2 und 3. Danach ist <code>i</code> 4, und <code>4 &lt;= 3</code> ist falsch. Schluss.'],
 'detail': '<h4><code>while</code> und <code>do while</code></h4><p><code>while</code> prüft vor dem Block und läuft vielleicht nie. <code>do while</code> prüft danach und läuft mindestens einmal.</p>' + C('''
    int n = 5;
    while (n < 3)
    {
        Console.WriteLine("while");
        n++;
    }
    do
    {
        Console.WriteLine("do");
        n++;
    } while (n < 3);
    ''', out='do') + '<h4><code>foreach</code></h4><p>Geht jedes Element einer Sammlung durch. Ohne Zähler, ohne Indexfehler, ohne Drama.</p>' + C('''
    string[] geraete = { "Router", "Switch" };
    foreach (string g in geraete)
    {
        Console.WriteLine(g);
    }
    ''', out='Router Switch') + '<h4><code>break</code> und <code>continue</code></h4><p><code>break</code> verlässt die Schleife ganz. <code>continue</code> springt direkt zum nächsten Durchlauf.</p>' + C('''
    for (int i = 1; i <= 5; i++)
    {
        if (i == 2) continue;
        if (i == 4) break;
        Console.WriteLine(i);
    }
    ''', out='1 3') + '<h4>Endlosschleifen</h4><p>Ändert sich die Bedingung nie, läuft die Schleife bis zum Abbruch. Im Terminal stoppt <code>Strg+C</code> das Programm. Der Lüfter dankt.</p>',
 'trap': 'Off-by-one: <code>&lt;=</code> statt <code>&lt;</code> liefert einen Durchlauf zu viel. Und bei <code>while</code> das Hochzählen zu vergessen, ist die häufigste Art, eine CPU zu heizen.',
 'labTitle': 'SCHLEIFE IN ZEITLUPE',
 'trace': T('''
    int summe = 0;
    for (int i = 1; i <= 3; i++)
    {
        summe += i;
    }
    Console.WriteLine(summe);
    ''', [[1, {'summe': '0'}, '', 'Die Summe startet bei 0.'], [2, {'summe': '0', 'i': '1'}, '', 'Start: i ist 1. 1 &lt;= 3 ist true.'], [4, {'summe': '1', 'i': '1'}, '', '0 + 1 = 1.'], [2, {'summe': '1', 'i': '2'}, '', 'i++ macht 2. 2 &lt;= 3 ist true.'], [4, {'summe': '3', 'i': '2'}, '', '1 + 2 = 3.'], [2, {'summe': '3', 'i': '3'}, '', 'i++ macht 3. 3 &lt;= 3 ist true.'], [4, {'summe': '6', 'i': '3'}, '', '3 + 3 = 6.'], [2, {'summe': '6', 'i': '4'}, '', 'i++ macht 4. 4 &lt;= 3 ist false. Schleife beendet.'], [6, {'summe': '6'}, '6', 'i existiert hier nicht mehr. Die Summe wird ausgegeben.']]),
 'home': ['Gib die Zahlen von 1 bis 10 aus. Danach versuche es mit <code>while</code> statt <code>for</code>.', C('''
    for (int i = 1; i <= 10; i++)
    {
        Console.WriteLine(i);
    }
    ''', out='1 2 3 4 5 6 7 8 9 10')],
 'types': [['l_anzahl', 'Durchläufe zählen'], ['l_summe', 'Summe verfolgen'], ['l_while', 'while verfolgen'], ['l_do', 'do while oder while'], ['l_foreach', 'foreach verfolgen'], ['l_break', 'break und continue'], ['l_endlos', 'Endlosschleife finden'], ['l_off', 'Off-by-one'], ['l_kopf', 'Schleifenkopf schreiben'], ['l_welche', 'Passende Schleife wählen'], ['l_order', 'Schleife zusammensetzen']],
},]

LESSONS = [L_WELT, L_UEBERSETZEN, L_GRUND, L_TYPEN, L_DATEN, L_UMWANDELN, *_OLD, L_LISTE]

ADVANCED = [
 ('Klassen und Objekte', 'Eine Klasse ist ein Bauplan, etwa für einen Router mit IP-Adresse und Status. Mit <code>new</code> entstehen daraus beliebig viele Objekte. Das ist das Kernthema des Folgemoduls.', C('''
    Router r = new Router();
    r.Ip = "10.0.0.1";
    Console.WriteLine(r.Ip);

    class Router
    {
        public string Ip = "";
    }
    ''', out='10.0.0.1')),
 ('Fehler abfangen', 'Mit <code>try</code> und <code>catch</code> fängst du Laufzeitfehler ab, statt das Programm abstürzen zu lassen. <code>TryParse</code> aus Kapitel 6 ist die freundliche Variante für Eingaben.', C('''
    try
    {
        int z = int.Parse("zwölf");
        Console.WriteLine(z);
    }
    catch (FormatException)
    {
        Console.WriteLine("Bitte Ziffern verwenden.");
    }
    ''', out='Bitte Ziffern verwenden.')),
 ('Dictionary', 'Ein <code>Dictionary</code> speichert Paare aus Schlüssel und Wert, etwa Dienstname und Port. Nachschlagen per Schlüssel statt per Index.', C('''
    Dictionary<string, int> ports = new Dictionary<string, int>();
    ports["HTTPS"] = 443;
    ports["SSH"] = 22;
    Console.WriteLine(ports["SSH"]);
    ''', out='22')),
 ('Namespaces und using', 'Ein Namespace sortiert Klassen wie ein Ordner. <code>Console</code> liegt in <code>System</code>. Neue Projekte binden die häufigsten Namespaces automatisch ein, darum siehst du in den Beispielen kein <code>using System;</code>.', ''),
 ('NuGet', 'NuGet ist der Paketmanager von .NET. <code>dotnet add package NAME</code> holt eine Bibliothek ins Projekt. Vorher prüfen, wer sie pflegt: Fremdcode bleibt Fremdcode.', ''),
 ('Visual Studio und VS Code', 'Visual Studio ist eine große Entwicklungsumgebung für Windows, VS Code ein leichter Editor mit C#-Erweiterung. Beide markieren Compilerfehler schon beim Tippen und haben einen Debugger, mit dem du ein Programm Zeile für Zeile ausführst.', ''),
 ('.NET SDK und Projektstruktur', 'Ein Konsolenprojekt besteht im Kern aus <code>Program.cs</code> und einer <code>.csproj</code>-Datei mit den Einstellungen. Die Ordner <code>bin</code> und <code>obj</code> erzeugt der Build. Die gehören nicht ins Git, so wenig wie Passwörter in den Quelltext.', ''),
]

MATCH_BANK = [
 ['Algorithmus', 'genaue Schrittfolge zur Lösung einer Aufgabe', 'w_name'],
 ['Quelltext', 'für Menschen lesbare Anweisungen in einer Programmiersprache', 'w_name'],
 ['Maschinensprache', 'Bitmuster, die die CPU direkt ausführen kann', 'w_name'],
 ['Syntax', 'Schreibregeln einer Programmiersprache', 'w_name'],
 ['EVA-Prinzip', 'Eingabe, Verarbeitung, Ausgabe', 'w_eva'],
 ['Compiler', 'übersetzt das ganze Programm vor dem Start und meldet Syntaxfehler', 'u_wer'],
 ['Interpreter', 'liest und führt ein Programm Anweisung für Anweisung während der Laufzeit aus', 'u_wer'],
 ['IL', 'Zwischencode, den der C#-Compiler erzeugt', 'u_begriff'],
 ['JIT-Compiler', 'übersetzt Zwischencode beim Start in Maschinencode', 'u_begriff'],
 ['CLR', 'Laufzeitumgebung von .NET, die Programme lädt und Speicher verwaltet', 'u_begriff'],
 ['SDK', 'Werkzeugpaket zum Entwickeln, enthält den Compiler', 'u_begriff'],
 ['Anweisung', 'einzelner Befehl, der in C# mit einem Semikolon endet', 'g_teile'],
 ['Block', 'Anweisungen in geschweiften Klammern', 'g_teile'],
 ['Kommentar', 'Text hinter //, den der Compiler ignoriert', 'g_kommentar'],
 ['int', 'Datentyp für ganze Zahlen mit 32 Bit', 'v_typ'],
 ['long', 'Datentyp für große ganze Zahlen mit 64 Bit', 'v_typ'],
 ['decimal', 'Datentyp für exakte Dezimalzahlen wie Geldbeträge', 'v_typ'],
 ['double', 'Datentyp für Kommazahlen, die nicht immer exakt sind', 'v_typ'],
 ['bool', 'Datentyp mit genau zwei möglichen Werten', 'v_typ'],
 ['char', 'Datentyp für genau ein Zeichen', 'v_typ'],
 ['string', 'Datentyp für Text', 'v_typ'],
 ['Überlauf', 'eine Zahl wird zu groß für ihren Typ und springt ans andere Ende', 't_ueberlauf'],
 ['Deklaration', 'eine Variable mit Typ und Namen anlegen', 'd_erkennen'],
 ['Initialisierung', 'einer Variablen ihren ersten Wert geben', 'd_erkennen'],
 ['Zuweisung', 'einer bestehenden Variablen einen neuen Wert geben', 'd_erkennen'],
 ['const', 'Wert, der nach dem Festlegen nicht mehr geändert werden darf', 'v_konst'],
 ['Cast', 'ausdrückliche Typumwandlung mit dem Zieltyp in Klammern', 'v_cast'],
 ['int.Parse', 'wandelt Text in eine ganze Zahl um', 'v_parse'],
 ['String-Interpolation', 'Werte mit $ und { } direkt in Text einsetzen', 'a_interp'],
 ['Modulo', 'liefert den Rest einer Division', 'o_mod'],
 ['else', 'Zweig, der läuft, wenn die if-Bedingung falsch ist', 'i_zweig'],
 ['default', 'Fall im switch für alle übrigen Werte', 'i_switch'],
 ['foreach', 'Schleife über alle Elemente einer Sammlung', 'l_foreach'],
 ['break', 'verlässt eine Schleife sofort', 'l_break'],
 ['Index', 'Position eines Elements, beginnt bei 0', 'a_index'],
 ['Parameter', 'Platzhalter für einen Wert, den eine Methode erhält', 'm_param'],
 ['Rückgabewert', 'Ergebnis, das eine Methode mit return liefert', 'm_return'],
 ['void', 'kennzeichnet eine Methode ohne Rückgabewert', 'm_teile'],
]
