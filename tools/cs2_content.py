"""Lerninhalte des C#-Moduls. Jeder Codeblock wird in tests/cs_verify.cjs mit dem echten C#-Compiler geprüft."""
import html
import re
from textwrap import dedent

SNIPPETS = []
KW = r'\b(?:using|namespace|class|interface|public|private|protected|static|void|int|double|decimal|string|char|bool|var|const|new|return|if|else|switch|case|default|break|continue|for|foreach|in|while|do|try|catch|finally|throw|true|false|null|this|base|override|virtual|abstract|async|await|get|set)\b'
TOKEN = re.compile(r'(?P<com>//[^\n]*)|(?P<str>\$?"(?:\\.|[^"\\\n])*"|\'(?:\\.|[^\'\\])\')|(?P<kw>' + KW + r')|(?P<num>\b\d+(?:\.\d+)?[mMfF]?\b)|(?P<typ>\b[A-Z][A-Za-z0-9]*\b)')


def hl(code):
    out, last = [], 0
    for m in TOKEN.finditer(code):
        out.append(html.escape(code[last:m.start()], quote=False))
        out.append(f'<span class="t-{m.lastgroup}">{html.escape(m.group(), quote=False)}</span>')
        last = m.end()
    out.append(html.escape(code[last:], quote=False))
    return ''.join(out)


def _code(code, **meta):
    code = dedent(code).strip('\n')
    SNIPPETS.append({'code': code, **meta})
    return code


def C(code, input=None, out=None):
    """Lauffähiger Beispielcode. out=None prüft nur das Kompilieren."""
    return '<pre class="cs" tabindex="0">' + hl(_code(code, input=input, out=out)) + '</pre>'


def B(code):
    """Absichtlich fehlerhafter Code: Der Compiler muss ihn ablehnen."""
    return '<pre class="cs bad" tabindex="0">' + hl(_code(code, bad=True)) + '</pre>'


def T(code, steps, input=None):
    """Schritt-für-Schritt-Ablauf: [Zeile, Variablen, Ausgabe, Erklärung]."""
    code = _code(code, input=input, out=' '.join(s[2] for s in steps if s[2]))
    return {'code': code, 'html': [hl(l) for l in code.split('\n')], 'steps': steps}


LESSONS = [
{
 'title': 'Willkommen in C#', 'cat': 'grund', 'goal': 'Ein kleines Programm lesen und jedes Zeichen darin erklären.',
 'intro': '<p>Dein Chef will ein kleines Tool, das Geräte erfasst. Du tippst dafür Text in eine Datei, und am Ende läuft ein Programm. Dazwischen sitzt jemand, der sehr genau liest: der <strong>Compiler</strong>. Er übersetzt deinen Quelltext in eine Form, die .NET ausführen kann. Findet er einen Fehler, bricht er ab und nennt dir die Stelle.</p><p><strong>C#</strong> ist die Sprache, in der du schreibst. <strong>.NET</strong> ist die Plattform darunter: Sie führt das Programm aus und bringt fertige Bausteine wie <code>Console</code> mit. Vergleich gefällig? C# ist die Sprache, in der du die Bestellung aufgibst. .NET ist die Küche samt Personal.</p><p>Man baut damit Windows-Tools, Webserver, Spiele und Automatisierungen. Auch als Systemintegrator triffst du es: Wer ein Admin-Tool anpassen muss, sollte es wenigstens lesen können.</p>',
 'visual': '<div class="calc">Quelltext (.cs) → Compiler → Programm → .NET führt es aus → Ausgabe in der Konsole</div>',
 'memo': 'Jede Anweisung endet mit <code>;</code>. Text steht in doppelten Anführungszeichen. Groß- und Kleinschreibung zählt: <code>console</code> ist nicht <code>Console</code>.',
 'example': 'Wir zerlegen die berühmteste Zeile der Programmierwelt:' + C('Console.WriteLine("Hallo Welt!");', out='Hallo Welt!'),
 'steps': ['<code>Console</code> ist das Konsolenfenster, genauer: eine fertige Klasse aus .NET.', 'Der Punkt heißt „gehe in“. Du greifst damit auf etwas zu, das zu <code>Console</code> gehört.', '<code>WriteLine</code> ist eine Methode, also ein Befehl mit Namen. Sie schreibt eine Zeile und springt danach in die nächste.', 'Die runden Klammern übergeben, womit die Methode arbeiten soll. Hier ist es der Text <code>"Hallo Welt!"</code>.', 'Das Semikolon beendet die Anweisung. Ohne dieses Zeichen hat der Compiler sofort Redebedarf.'],
 'detail': '<h4>Lesen, schreiben, kommentieren</h4><p><code>Console.ReadLine()</code> wartet, bis jemand etwas tippt und Enter drückt, und liefert den Text zurück. <code>Console.Write()</code> schreibt ohne Zeilenumbruch. Alles hinter <code>//</code> ist ein Kommentar: Der Compiler ignoriert ihn, dein Kollege in sechs Monaten nicht.</p>' + C('''
    // Fragt nach dem Namen und begrüßt
    Console.Write("Name: ");
    string? name = Console.ReadLine();
    Console.WriteLine("Hallo " + name);
    ''', input='Ada', out='Name: Hallo Ada') + '<h4>Zwei Formen desselben Programms</h4><p>Neue .NET-Projekte erlauben „Top-Level-Anweisungen“: Du schreibst die Befehle direkt in die Datei. In älteren Büchern steht drumherum noch eine Klasse mit <code>Main</code>. Das ist dasselbe Programm mit mehr Verpackung.</p>' + C('''
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
 'types': [['g_begriff', 'C#, .NET und Compiler'], ['g_ausgabe', 'Ausgabe vorhersagen'], ['g_write', 'Write oder WriteLine'], ['g_fix', 'Zeile reparieren'], ['g_luecke', 'Methode ergänzen'], ['g_order', 'Programm sortieren'], ['g_kommentar', 'Kommentar erkennen'], ['g_semikolon', 'Das Semikolon war unschuldig']],
},
{
 'title': 'Variablen und Datentypen', 'cat': 'daten', 'goal': 'Für jeden Wert den passenden Datentyp wählen.',
 'intro': '<p>Dein Tool soll sich merken, dass Switch-07 genau 24 Ports hat. Dafür brauchst du eine <strong>Variable</strong>: eine beschriftete Schublade für einen Wert. Der <strong>Datentyp</strong> legt fest, was hineindarf.</p><p>C# achtet streng darauf. Versuch mal, einen Text in eine Schublade für ganze Zahlen zu stopfen. Das Programm startet dann gar nicht erst.</p>',
 'visual': '<div class="table-wrap"><table class="t"><thead><tr><th>Typ</th><th>Inhalt</th><th>Beispiel</th></tr></thead><tbody><tr><td><code>int</code></td><td>ganze Zahl</td><td><code>24</code></td></tr><tr><td><code>double</code></td><td>Kommazahl, nicht immer exakt</td><td><code>3.5</code></td></tr><tr><td><code>decimal</code></td><td>exakte Dezimalzahl, etwa für Geld</td><td><code>19.99m</code></td></tr><tr><td><code>string</code></td><td>Text</td><td><code>"Router"</code></td></tr><tr><td><code>char</code></td><td>genau ein Zeichen</td><td><code>\'A\'</code></td></tr><tr><td><code>bool</code></td><td>wahr oder falsch</td><td><code>true</code></td></tr></tbody></table></div>',
 'memo': 'Aufbau: <code>Typ name = Wert;</code>. Text in <code>"…"</code>, ein Zeichen in <code>\'…\'</code>, Kommazahlen mit Punkt. <code>"40"</code> ist Text, <code>40</code> ist eine Zahl.',
 'example': 'Drei Schubladen, drei Inhalte. Danach ändern wir eine davon:' + C('''
    int ports = 24;
    string name = "Switch-07";
    bool aktiv = true;
    ports = 48;
    Console.WriteLine(name + " hat " + ports + " Ports. Aktiv: " + aktiv);
    ''', out='Switch-07 hat 48 Ports. Aktiv: True'),
 'steps': ['<code>int ports = 24;</code> legt die Variable an (<strong>Deklaration</strong>) und füllt sie gleich (<strong>Initialisierung</strong>).', 'Bei <code>ports = 48;</code> steht kein Typ mehr. Die Schublade gibt es schon, der alte Inhalt fliegt raus.', 'Das <code>+</code> zwischen Text und Zahl hängt beides zu einem Text zusammen.', 'Ein <code>bool</code> erscheint in der Ausgabe als <code>True</code> oder <code>False</code>, mit großem Anfangsbuchstaben.'],
 'detail': '<h4>Warum 40 nicht „40“ ist</h4><p><code>40 + 2</code> ergibt 42. <code>"40" + "2"</code> ergibt <code>402</code>. Bei Text bedeutet <code>+</code> Aneinanderhängen. Und das hier scheitert schon beim Kompilieren:</p>' + B('int alter = "40";') + '<h4><code>var</code> und <code>const</code></h4><p>Bei <code>var</code> leitet der Compiler den Typ aus dem Wert ab. Die Variable bleibt trotzdem fest typisiert. <code>const</code> macht einen Wert unveränderlich.</p>' + C('''
    var hersteller = "Contoso"; // ist ein string
    const int MaxPorts = 48;
    Console.WriteLine(hersteller + " " + MaxPorts);
    ''', out='Contoso 48') + '<h4>Eingaben umwandeln</h4><p><code>ReadLine()</code> liefert immer Text, auch wenn jemand <code>42</code> tippt. Rechnen kannst du erst nach dem Umwandeln. Beim Umwandeln einer Kommazahl in <code>int</code> mit <code>(int)</code> wird abgeschnitten, nicht gerundet.</p>' + C('''
    string eingabe = "42";
    int zahl = int.Parse(eingabe);
    Console.WriteLine(zahl + 1);
    Console.WriteLine((int)3.9);
    ''', out='43 3'),
 'trap': '<code>decimal</code>-Werte brauchen das <code>m</code>: <code>19.99m</code>. Ohne das Suffix ist die Zahl ein <code>double</code>, und der Compiler verweigert die Zuweisung.',
 'labTitle': 'SCHUBLADEN IN ZEITLUPE',
 'trace': T('''
    int ports = 24;
    string name = "SW-1";
    ports = ports + 24;
    string text = name + ":" + ports;
    Console.WriteLine(text);
    ''', [[1, {'ports': '24'}, '', 'Eine Schublade namens ports entsteht und enthält 24.'], [2, {'ports': '24', 'name': '"SW-1"'}, '', 'Zweite Schublade, diesmal für Text.'], [3, {'ports': '48', 'name': '"SW-1"'}, '', 'Erst wird rechts gerechnet: 24 + 24. Das Ergebnis ersetzt den alten Wert.'], [4, {'ports': '48', 'name': '"SW-1"', 'text': '"SW-1:48"'}, '', 'Text plus Zahl ergibt Text.'], [5, {'ports': '48', 'name': '"SW-1"', 'text': '"SW-1:48"'}, 'SW-1:48', 'Die Variable text wird ausgegeben.']]),
 'home': ['Lies eine Portanzahl ein, wandle sie um und gib die doppelte Anzahl aus.', C('''
    Console.WriteLine("Ports?");
    int ports = int.Parse(Console.ReadLine()!);
    Console.WriteLine(ports * 2);
    ''', input='24', out='Ports? 48')],
 'types': [['v_typ', 'Datentyp wählen'], ['v_decl', 'Variable anlegen'], ['v_fix', 'Falschen Typ reparieren'], ['v_parse', 'Eingabe umwandeln'], ['v_wert', 'Neuen Wert verfolgen'], ['v_concat', 'Text oder Zahl'], ['v_cast', 'Kommazahl umwandeln'], ['v_konst', 'var und const']],
},
{
 'title': 'Operatoren und Berechnungen', 'cat': 'rechnen', 'goal': 'Ausdrücke so auswerten, wie C# sie auswertet.',
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
 'types': [['o_int', 'Integerdivision'], ['o_mod', 'Modulo'], ['o_double', 'Division mit double'], ['o_rang', 'Rangfolge'], ['o_inkr', 'Inkrement'], ['o_vergl', 'Vergleich'], ['o_logik', 'Logische Operatoren'], ['o_zuw', 'Zuweisungsoperatoren']],
},
{
 'title': 'Bedingungen und Entscheidungen', 'cat': 'wenn', 'goal': 'Vorhersagen, welcher Zweig eines Programms läuft.',
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
 'types': [['i_zweig', 'if und else verfolgen'], ['i_elseif', 'else if verfolgen'], ['i_switch', 'switch verfolgen'], ['i_op', 'Bedingung ergänzen'], ['i_gleich', '= statt =='], ['i_nest', 'Verschachtelung'], ['i_logik', 'Verknüpfte Bedingung'], ['i_text', 'Text vergleichen']],
},
{
 'title': 'Schleifen', 'cat': 'schleife', 'goal': 'Genau sagen, wie oft eine Schleife läuft und warum.',
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
 'types': [['l_anzahl', 'Durchläufe zählen'], ['l_summe', 'Summe verfolgen'], ['l_while', 'while verfolgen'], ['l_do', 'do while'], ['l_foreach', 'foreach verfolgen'], ['l_break', 'break und continue'], ['l_endlos', 'Endlosschleife finden'], ['l_off', 'Off-by-one'], ['l_kopf', 'Schleifenkopf schreiben']],
},
{
 'title': 'Arrays, Listen und Zeichenketten', 'cat': 'liste', 'goal': 'Auf Elemente von Sammlungen sicher zugreifen.',
 'intro': '<p>Für 200 Geräte willst du keine 200 Variablen. Ein <strong>Array</strong> hält mehrere Werte gleichen Typs mit fester Größe. Eine <strong>Liste</strong> kann wachsen und schrumpfen. Beide nummerieren ihre Elemente mit einem <strong>Index</strong>, und der beginnt bei 0.</p><p>Warum bei 0? Der Index sagt, wie weit das Element vom Anfang entfernt ist. Das erste ist 0 Schritte entfernt. Klingt nach Informatikerlogik, ist es auch.</p>',
 'visual': '<div class="calc">namen   "Router"  "Switch"  "Firewall"\nIndex      0         1          2\nLength = 3, letzter gültiger Index = 2</div>',
 'memo': 'Letzter Index = Anzahl − 1. Arrays nennen die Anzahl <code>Length</code>, Listen <code>Count</code>. Beides ohne Klammern.',
 'example': 'Warum steht hier „Switch“?' + C('''
    string[] namen = { "Router", "Switch", "Firewall" };

    Console.WriteLine(namen[1]);
    ''', out='Switch'),
 'steps': ['Das Array enthält drei Texte.', 'Index 0 ist Router, Index 1 ist Switch, Index 2 ist Firewall.', '<code>namen[1]</code> liefert also das zweite Element.', '<code>namen[3]</code> gäbe es nicht. Das Programm würde mit einer <code>IndexOutOfRangeException</code> abstürzen.'],
 'detail': '<h4>Listen</h4><p><code>List&lt;string&gt;</code> ist eine Liste von Texten. Das <code>T</code> in <code>List&lt;T&gt;</code> steht für den Elementtyp. <code>Add</code> hängt an, <code>Remove</code> entfernt das erste passende Element.</p>' + C('''
    List<string> geraete = new List<string>();
    geraete.Add("Router");
    geraete.Add("Switch");
    geraete.Remove("Router");
    Console.WriteLine(geraete.Count);
    Console.WriteLine(geraete[0]);
    ''', out='1 Switch') + '<h4>Zeichenketten</h4><p>Ein <code>string</code> kennt nützliche Methoden. Sie verändern den Text nicht, sondern liefern einen neuen. Mit dem <code>$</code> vor dem Text setzt du Werte direkt ein: <strong>String-Interpolation</strong>.</p>' + C('''
    string name = "Switch";
    int ports = 24;
    Console.WriteLine(name.Length);
    Console.WriteLine(name.ToUpper());
    Console.WriteLine(name.Contains("wit"));
    Console.WriteLine(name.Substring(0, 2));
    Console.WriteLine($"{name}: {ports} Ports");
    ''', out='6 SWITCH True Sw Switch: 24 Ports') + '<h4>Größe ändern?</h4><p>Ein Array behält seine Größe. Weißt du vorher nicht, wie viele Elemente kommen, nimm eine Liste.</p>',
 'trap': 'Eine Schleife mit <code>i &lt;= namen.Length</code> greift am Ende auf einen Index zu, den es nicht gibt. Und <code>name.ToUpper();</code> allein bringt nichts: Das Ergebnis wird weggeworfen.',
 'labTitle': 'LISTE IN ZEITLUPE',
 'trace': T('''
    List<string> geraete = new List<string>();
    geraete.Add("Router");
    geraete.Add("Switch");
    geraete.Add("NAS");
    geraete.Remove("Switch");
    Console.WriteLine(geraete[1]);
    Console.WriteLine(geraete.Count);
    ''', [[1, {'geraete': '[ ]'}, '', 'Eine leere Liste entsteht.'], [2, {'geraete': '[Router]'}, '', 'Router bekommt Index 0.'], [3, {'geraete': '[Router, Switch]'}, '', 'Switch bekommt Index 1.'], [4, {'geraete': '[Router, Switch, NAS]'}, '', 'NAS bekommt Index 2.'], [5, {'geraete': '[Router, NAS]'}, '', 'Switch fliegt raus. NAS rückt auf Index 1 nach.'], [6, {'geraete': '[Router, NAS]'}, 'NAS', 'Index 1 ist jetzt NAS.'], [7, {'geraete': '[Router, NAS]'}, '2', 'Es sind noch zwei Elemente.']]),
 'home': ['Lege eine Liste mit drei Geräten an und gib sie nummeriert aus, beginnend bei 1.', C('''
    List<string> geraete = new List<string> { "Router", "Switch", "NAS" };
    for (int i = 0; i < geraete.Count; i++)
    {
        Console.WriteLine($"{i + 1}: {geraete[i]}");
    }
    ''', out='1: Router 2: Switch 3: NAS')],
 'types': [['a_index', 'Index lesen'], ['a_letzt', 'Letztes Element'], ['a_grenze', 'Index außerhalb'], ['a_schreib', 'Array-Zugriff schreiben'], ['a_liste', 'Liste verfolgen'], ['a_summe', 'Sammlung durchlaufen'], ['a_laenge', 'Length oder Count'], ['a_interp', 'String-Interpolation'], ['a_text', 'String-Methoden']],
},
{
 'title': 'Methoden', 'cat': 'methode', 'goal': 'Methoden schreiben, aufrufen und ihren Rückgabewert verwenden.',
 'intro': '<p>Dieselbe Prüfung an fünf Stellen kopiert heißt: Beim nächsten Fehler reparierst du fünfmal und vergisst eine. Eine <strong>Methode</strong> ist ein benannter Codeblock, den du beliebig oft aufrufst. Einmal reparieren, überall behoben.</p>',
 'visual': '<div class="calc">static int  Addieren (int a, int b)\n  │     │      │          └ Parameter: was hineinkommt\n  │     │      └ Name\n  │     └ Rückgabetyp: was herauskommt\n  └ gehört nicht zu einem einzelnen Objekt</div>',
 'memo': '<code>void</code> heißt: gibt nichts zurück. Jeder andere Rückgabetyp verlangt ein <code>return</code> mit passendem Wert. <code>return</code> beendet die Methode sofort.',
 'example': 'Eine Methode addiert, der Aufrufer entscheidet, was mit dem Ergebnis passiert:' + C('''
    static int Addieren(int a, int b)
    {
        return a + b;
    }

    int ergebnis = Addieren(2, 3);
    Console.WriteLine(ergebnis * 10);
    ''', out='50'),
 'steps': ['Der Aufruf übergibt 2 und 3. In der Methode heißen sie <code>a</code> und <code>b</code>.', '<code>return a + b;</code> schickt 5 an die Aufrufstelle.', 'Der Aufruf wird durch diese 5 ersetzt und in <code>ergebnis</code> gespeichert.', '5 × 10 = 50 wird ausgegeben.'],
 'detail': '<h4><code>void</code> gegen <code>return</code></h4><p>Eine <code>void</code>-Methode tut etwas, etwa eine Meldung ausgeben. Eine Methode mit Rückgabetyp liefert einen Wert, mit dem du weiterarbeitest. „Ausgeben“ und „Zurückgeben“ sind zwei verschiedene Dinge.</p>' + C('''
    static void Melde(string text)
    {
        Console.WriteLine("Hinweis: " + text);
    }

    static bool IstGerade(int zahl)
    {
        return zahl % 2 == 0;
    }

    Melde("Backup fertig");
    Console.WriteLine(IstGerade(7));
    ''', out='Hinweis: Backup fertig False') + '<h4>Gültigkeitsbereich</h4><p>Eine Variable lebt in dem Block aus <code>{ }</code>, in dem sie angelegt wurde. Außerhalb kennt sie niemand.</p>' + B('''
    static void Test()
    {
        int nurHier = 1;
    }

    Console.WriteLine(nurHier);
    ''') + '<h4>Kopien</h4><p>Wird ein <code>int</code> übergeben, bekommt die Methode eine Kopie. Ändert sie den Parameter, bleibt das Original beim Aufrufer gleich.</p>' + C('''
    static void Erhoehe(int wert)
    {
        wert++;
    }

    int zahl = 5;
    Erhoehe(zahl);
    Console.WriteLine(zahl);
    ''', out='5'),
 'trap': 'Eine Methode, die ihr Ergebnis nur mit <code>WriteLine</code> ausgibt, liefert dem Aufrufer nichts zum Weiterrechnen. Und <code>Addieren(2, 3);</code> ohne Zuweisung wirft das Ergebnis direkt weg.',
 'labTitle': 'METHODENAUFRUF IN ZEITLUPE',
 'trace': T('''
    static int Doppelt(int x)
    {
        return x * 2;
    }

    int wert = 4;
    int neu = Doppelt(wert) + 1;
    Console.WriteLine(neu);
    ''', [[6, {'wert': '4'}, '', 'Das Programm startet hier. Die Methode oben wird erst beim Aufruf ausgeführt.'], [7, {'wert': '4'}, '', 'Doppelt(wert) wird aufgerufen. Der Wert 4 wird übergeben.'], [3, {'x': '4'}, '', 'In der Methode heißt die Kopie x. Zurück geht 8.'], [7, {'wert': '4', 'neu': '9'}, '', 'Der Aufruf wird zu 8. Dazu kommt 1.'], [8, {'wert': '4', 'neu': '9'}, '9', 'Ausgabe.']]),
 'home': ['Schreibe eine Methode, die zwei Zahlen entgegennimmt und die größere zurückgibt.', C('''
    static int Groesser(int a, int b)
    {
        if (a > b)
        {
            return a;
        }
        return b;
    }

    Console.WriteLine(Groesser(3, 9));
    ''', out='9')],
 'types': [['m_aufruf', 'Aufruf verfolgen'], ['m_param', 'Parameter zuordnen'], ['m_return', 'return ergänzen'], ['m_void', 'void oder Rückgabe'], ['m_scope', 'Gültigkeitsbereich'], ['m_kopf', 'Methodenkopf schreiben'], ['m_kopie', 'Parameter als Kopie'], ['m_kette', 'Aufrufe verketten']],
},
{
 'title': 'Objektorientierte Programmierung', 'cat': 'oop', 'goal': 'Klassen lesen und Objekte daraus verwenden.',
 'intro': '<p>Ein Router hat Hersteller, IP-Adresse und Status. Dafür schreibst du eine <strong>Klasse</strong>: den Bauplan. Daraus entstehen mit <code>new</code> beliebig viele <strong>Objekte</strong>, auch <strong>Instanzen</strong> genannt. Der Bauplan routet noch nichts. Genau wie der Netzwerkplan an der Wand.</p>',
 'visual': '<div class="calc">Klasse Router (Bauplan)\n  ├─ Objekt r1: Ip = "10.0.0.1", Online = true\n  └─ Objekt r2: Ip = "10.0.0.2", Online = false</div>',
 'memo': 'Eine Klasse beschreibt Daten und Verhalten. <code>new</code> erzeugt ein Objekt. Der <strong>Konstruktor</strong> heißt wie die Klasse und läuft beim Erzeugen. Der Punkt greift auf Mitglieder des Objekts zu.',
 'example': 'Ein Router mit Eigenschaft, Konstruktor und Methode:' + C('''
    Router r1 = new Router("10.0.0.1");
    r1.Online = true;
    Console.WriteLine(r1.Status());

    class Router
    {
        public string Ip { get; set; }
        public bool Online { get; set; }

        public Router(string ip)
        {
            Ip = ip;
        }

        public string Status()
        {
            return Ip + (Online ? " online" : " offline");
        }
    }
    ''', out='10.0.0.1 online'),
 'steps': ['<code>new Router("10.0.0.1")</code> erzeugt ein Objekt und ruft den Konstruktor auf.', 'Der Konstruktor speichert den Text in der Eigenschaft <code>Ip</code>.', '<code>r1.Online = true;</code> setzt eine Eigenschaft genau dieses Objekts.', '<code>r1.Status()</code> ruft die Methode auf. Der Ausdruck mit <code>?</code> und <code>:</code> wählt je nach <code>Online</code> einen von zwei Texten.'],
 'detail': '<h4>Felder, Eigenschaften und Kapselung</h4><p>Ein <strong>Feld</strong> ist eine Variable in der Klasse. Eine <strong>Eigenschaft</strong> mit <code>get</code> und <code>set</code> regelt den Zugriff von außen. <code>public</code> darf jeder benutzen, <code>private</code> nur die Klasse selbst. <strong>Kapselung</strong> heißt: Interna verstecken, damit niemand den Zähler auf −3 setzt.</p>' + C('''
    class Zaehler
    {
        private int wert;
        public static int Gesamt = 0;

        public void Plus()
        {
            wert++;
            Gesamt++;
        }

        public int Wert()
        {
            return wert;
        }
    }
    ''') + '<p><code>static</code> gehört zur Klasse statt zu einem Objekt. <code>Gesamt</code> gibt es deshalb nur einmal, <code>wert</code> pro Objekt.</p><h4>Vererbung</h4><p>Eine abgeleitete Klasse übernimmt alles von ihrer Basisklasse und kann es mit <code>override</code> ändern, sofern die Basis es mit <code>virtual</code> erlaubt.</p>' + C('''
    Geraet g = new Drucker();
    Console.WriteLine(g.Typ());

    class Geraet
    {
        public virtual string Typ()
        {
            return "Gerät";
        }
    }

    class Drucker : Geraet
    {
        public override string Typ()
        {
            return "Drucker";
        }
    }
    ''', out='Drucker') + '<h4>Interfaces</h4><p>Ein <strong>Interface</strong> ist ein Vertrag: Es sagt, welche Methoden es geben muss, und die Klasse liefert die Umsetzung.</p>' + C('''
    IPingbar p = new Server();
    Console.WriteLine(p.Ping());

    interface IPingbar
    {
        string Ping();
    }

    class Server : IPingbar
    {
        public string Ping()
        {
            return "Antwort";
        }
    }
    ''', out='Antwort'),
 'trap': '<code>Router r2 = r1;</code> kopiert kein Objekt. Beide Variablen zeigen danach auf dasselbe Gerät. Ändert sich etwas über <code>r2</code>, sieht <code>r1</code> es auch.',
 'labTitle': 'OBJEKTE IN ZEITLUPE',
 'trace': T('''
    Geraet a = new Geraet();
    a.Name = "NAS";
    Geraet b = a;
    b.Name = "Backup";
    Console.WriteLine(a.Name);

    class Geraet
    {
        public string Name = "";
    }
    ''', [[1, {'a': '→ Objekt 1 (Name: "")'}, '', 'new erzeugt ein Objekt. a zeigt darauf.'], [2, {'a': '→ Objekt 1 (Name: "NAS")'}, '', 'Der Name des Objekts wird gesetzt.'], [3, {'a': '→ Objekt 1', 'b': '→ Objekt 1'}, '', 'b zeigt auf dasselbe Objekt. Es gibt keine Kopie.'], [4, {'a': '→ Objekt 1 (Name: "Backup")', 'b': '→ Objekt 1'}, '', 'Änderung über b, am selben Objekt.'], [5, {'a': '→ Objekt 1 (Name: "Backup")', 'b': '→ Objekt 1'}, 'Backup', 'a zeigt ja immer noch auf dasselbe Objekt.']]),
 'home': ['Schreibe eine Klasse <code>Ticket</code> mit Nummer und Text sowie einer Methode, die beides als Zeile zurückgibt.', C('''
    Ticket t = new Ticket(42, "Drucker offline");
    Console.WriteLine(t.Zeile());

    class Ticket
    {
        public int Nummer { get; set; }
        public string Text { get; set; }

        public Ticket(int nummer, string text)
        {
            Nummer = nummer;
            Text = text;
        }

        public string Zeile()
        {
            return $"#{Nummer}: {Text}";
        }
    }
    ''', out='#42: Drucker offline')],
 'types': [['c_begriff', 'Klasse, Objekt, Konstruktor'], ['c_objekt', 'Objekte unterscheiden'], ['c_ctor', 'Konstruktor verfolgen'], ['c_ref', 'Zwei Variablen, ein Objekt'], ['c_private', 'private von außen'], ['c_static', 'static verfolgen'], ['c_erbe', 'Vererbung verfolgen'], ['c_iface', 'Interface'], ['c_new', 'Objekt erzeugen schreiben']],
},
{
 'title': 'Fehler erkennen und behandeln', 'cat': 'fehler', 'goal': 'Fehlerarten unterscheiden und fehlerhaften Code reparieren.',
 'intro': '<p>Es gibt drei Sorten Ärger. Ein <strong>Compilerfehler</strong> verhindert den Start, dazu gehören Syntaxfehler. Ein <strong>Laufzeitfehler</strong> tritt erst beim Ausführen auf, etwa wenn jemand „abc“ eintippt und du eine Zahl erwartest. Ein <strong>logischer Fehler</strong> ist die gemeinste Sorte: Das Programm läuft fröhlich und liefert Unsinn.</p>',
 'visual': '<div class="calc">Compilerfehler  → Programm startet nicht\nLaufzeitfehler  → Programm startet, Ausnahme beim Ausführen\nLogischer Fehler → Programm läuft, Ergebnis falsch</div>',
 'memo': 'Fehlermeldung von vorn lesen: Datei, Zeile, Fehlercode, Text. Der erste Fehler zuerst, viele weitere sind oft nur Folgen davon. Ausnahmen fängst du mit <code>try</code> und <code>catch</code>.',
 'example': 'Eine Eingabe, die keine Zahl ist, ohne dass das Programm abstürzt:' + C('''
    try
    {
        int zahl = int.Parse("abc");
        Console.WriteLine("Zahl: " + zahl);
    }
    catch (FormatException)
    {
        Console.WriteLine("Das war keine Zahl.");
    }
    finally
    {
        Console.WriteLine("Fertig.");
    }
    ''', out='Das war keine Zahl. Fertig.'),
 'steps': ['<code>int.Parse("abc")</code> löst eine <code>FormatException</code> aus.', 'Der Rest des <code>try</code>-Blocks wird übersprungen.', 'Der passende <code>catch</code>-Block läuft.', '<code>finally</code> läuft immer, ob mit oder ohne Fehler.'],
 'detail': '<h4>Prüfen statt abstürzen</h4><p>Bei Benutzereingaben ist <code>int.TryParse</code> oft besser: Es liefert <code>true</code> oder <code>false</code> und legt die Zahl im <code>out</code>-Parameter ab. Falsche Eingaben sind schließlich kein Ausnahmefall, sondern Dienstag.</p>' + C('''
    string eingabe = "24";
    if (int.TryParse(eingabe, out int ports))
    {
        Console.WriteLine(ports + 1);
    }
    else
    {
        Console.WriteLine("Bitte eine Zahl.");
    }
    ''', out='25') + '<h4>Null</h4><p><code>null</code> heißt: Hier ist gar kein Objekt. Rufst du darauf eine Methode auf, gibt es eine <code>NullReferenceException</code>. Also vorher prüfen.</p>' + C('''
    string? name = null;
    if (name != null)
    {
        Console.WriteLine(name.Length);
    }
    else
    {
        Console.WriteLine("Kein Name");
    }
    ''', out='Kein Name') + '<h4>Häufige Ausnahmen</h4><div class="table-wrap"><table class="t"><tbody><tr><td><code>FormatException</code></td><td>Text lässt sich nicht umwandeln</td></tr><tr><td><code>IndexOutOfRangeException</code></td><td>Index gibt es im Array nicht</td></tr><tr><td><code>NullReferenceException</code></td><td>Zugriff auf <code>null</code></td></tr><tr><td><code>DivideByZeroException</code></td><td>Ganzzahlige Division durch 0</td></tr></tbody></table></div><h4>Debugging</h4><p>Ein <strong>Debugger</strong> hält das Programm an einem <strong>Haltepunkt</strong> an. Dann gehst du Zeile für Zeile weiter und siehst alle Variablen, genau wie in den Abläufen dieses Moduls. Das schlägt zwanzig eingestreute <code>WriteLine("hier")</code> deutlich.</p>',
 'trap': 'Ein leerer <code>catch</code>-Block macht aus einem sichtbaren Fehler einen unsichtbaren. Der Fehler ist nicht weg, er hat nur Hausverbot in deinem Log.',
 'labTitle': 'AUSNAHME IN ZEITLUPE',
 'trace': T('''
    int[] werte = { 1, 2 };
    try
    {
        Console.WriteLine(werte[0]);
        Console.WriteLine(werte[5]);
        Console.WriteLine("nie");
    }
    catch (IndexOutOfRangeException)
    {
        Console.WriteLine("Index falsch");
    }
    Console.WriteLine("weiter");
    ''', [[1, {'werte': '[1, 2]'}, '', 'Ein Array mit zwei Elementen: Index 0 und 1.'], [4, {'werte': '[1, 2]'}, '1', 'Index 0 gibt es.'], [5, {'werte': '[1, 2]'}, '', 'Index 5 gibt es nicht. Die Ausnahme fliegt.'], [10, {'werte': '[1, 2]'}, 'Index falsch', 'Der Rest des try-Blocks wird übersprungen. Der catch-Block läuft.'], [12, {'werte': '[1, 2]'}, 'weiter', 'Nach dem catch läuft das Programm normal weiter.']]),
 'home': ['Lies eine Zahl ein. Ist die Eingabe ungültig, frage so lange neu, bis sie passt.', C('''
    int zahl;
    Console.WriteLine("Zahl?");
    while (!int.TryParse(Console.ReadLine(), out zahl))
    {
        Console.WriteLine("Nochmal:");
    }
    Console.WriteLine(zahl);
    ''', input='x\n7', out='Zahl? Nochmal: 7')],
 'types': [['e_art', 'Fehlerart bestimmen'], ['e_try', 'try und catch verfolgen'], ['e_finally', 'finally verfolgen'], ['e_tryparse', 'TryParse verfolgen'], ['e_null', 'null prüfen'], ['e_ausnahme', 'Ausnahme benennen'], ['e_fix', 'Fehler reparieren'], ['e_logik', 'Logischen Fehler finden'], ['e_debug', 'Debugging']],
},
{
 'title': 'Dein erstes eigenes Programm', 'cat': 'projekt', 'goal': 'Die Bausteine zu einem kleinen Gerätemanager verbinden.',
 'intro': '<p>Jetzt kommt alles zusammen: ein <strong>IT-Gerätemanager</strong> für die Konsole. Er zeigt ein Menü, nimmt Geräte auf, listet sie und überlebt Fehleingaben. Kein Weltraumprogramm, aber dein Programm.</p><p>Die Aufgaben dieser Stufe bauen es Stück für Stück auf. Den fertigen Code findest du unten zum Abtippen. Abtippen ist hier ausdrücklich erlaubt: Dabei fallen dir die Fehler auf, die beim Lesen unsichtbar bleiben.</p>',
 'visual': '<div class="calc">Klasse Geraet       speichert Name und Typ\nList&lt;Geraet&gt;        speichert alle Geräte\nwhile-Schleife      hält das Menü am Leben\nswitch              wertet die Auswahl aus\nMethoden            halten den Code lesbar\nif + Prüfung        fängt leere Eingaben ab</div>',
 'memo': 'Große Programme baut man klein: erst das Menü, dann ein Punkt, dann der nächste. Nach jedem Schritt starten. So weißt du, welche Änderung es war.',
 'example': 'Der Kern des Menüs. Die Schleife läuft, bis jemand „0“ wählt:' + C('''
    string? wahl = "";
    while (wahl != "0")
    {
        Console.WriteLine("1 = Anzeigen, 0 = Ende");
        wahl = Console.ReadLine();
    }
    Console.WriteLine("Tschüss");
    ''', input='1\n0', out='1 = Anzeigen, 0 = Ende 1 = Anzeigen, 0 = Ende Tschüss'),
 'steps': ['<code>wahl</code> startet leer, die Bedingung ist also wahr.', 'Das Menü erscheint und das Programm wartet auf eine Eingabe.', 'Bei „1“ bleibt die Bedingung wahr, das Menü kommt wieder.', 'Bei „0“ endet die Schleife, und das Programm verabschiedet sich.'],
 'detail': '<h4>Der komplette Gerätemanager</h4><p>Lege ein Projekt mit <code>dotnet new console</code> an und schreibe das in <code>Program.cs</code>. Starte es mit <code>dotnet run</code>.</p>' + C('''
    List<Geraet> geraete = new List<Geraet>();
    string? wahl = "";

    while (wahl != "0")
    {
        Console.WriteLine("1 = Hinzufügen, 2 = Liste, 0 = Ende");
        wahl = Console.ReadLine();

        switch (wahl)
        {
            case "1":
                Hinzufuegen(geraete);
                break;
            case "2":
                Anzeigen(geraete);
                break;
            case "0":
                Console.WriteLine("Tschüss");
                break;
            default:
                Console.WriteLine("Unbekannte Auswahl");
                break;
        }
    }

    static void Hinzufuegen(List<Geraet> liste)
    {
        Console.WriteLine("Name?");
        string? name = Console.ReadLine();
        Console.WriteLine("Typ?");
        string? typ = Console.ReadLine();

        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(typ))
        {
            Console.WriteLine("Name und Typ dürfen nicht leer sein.");
            return;
        }

        liste.Add(new Geraet(name, typ));
    }

    static void Anzeigen(List<Geraet> liste)
    {
        if (liste.Count == 0)
        {
            Console.WriteLine("Noch keine Geräte.");
        }

        foreach (Geraet g in liste)
        {
            Console.WriteLine(g.Zeile());
        }
    }

    class Geraet
    {
        public string Name { get; }
        public string Typ { get; }

        public Geraet(string name, string typ)
        {
            Name = name;
            Typ = typ;
        }

        public string Zeile()
        {
            return $"{Name} ({Typ})";
        }
    }
    ''', input='2\n1\nSW-1\nSwitch\n1\n\nRouter\n2\n9\n0', out='1 = Hinzufügen, 2 = Liste, 0 = Ende Noch keine Geräte. 1 = Hinzufügen, 2 = Liste, 0 = Ende Name? Typ? 1 = Hinzufügen, 2 = Liste, 0 = Ende Name? Typ? Name und Typ dürfen nicht leer sein. 1 = Hinzufügen, 2 = Liste, 0 = Ende SW-1 (Switch) 1 = Hinzufügen, 2 = Liste, 0 = Ende Unbekannte Auswahl 1 = Hinzufügen, 2 = Liste, 0 = Ende Tschüss') + '<h4>Selbstkontrolle</h4><ul><li>Startet das Programm mit <code>dotnet run</code>?</li><li>Führt eine leere Liste zu einer sinnvollen Meldung?</li><li>Bleibt das Programm bei leerem Namen und falscher Menüauswahl stabil?</li><li>Kannst du jede Zeile erklären?</li></ul><p>Wenn ja: Du verstehst C#, kannst kleine Programme schreiben und weißt wenigstens, warum dein Code schon wieder nicht kompiliert.</p>',
 'trap': 'Alles auf einmal schreiben und erst am Ende starten. Dann sind es 14 Fehler, und jeder zeigt auf den anderen. Lieber klein anfangen und oft ausführen.',
 'labTitle': 'GERÄTEMANAGER IN ZEITLUPE',
 'trace': T('''
    List<string> geraete = new List<string>();
    string[] eingaben = { "1", "2", "0" };
    foreach (string wahl in eingaben)
    {
        if (wahl == "1")
        {
            geraete.Add("Switch");
        }
        else if (wahl == "2")
        {
            Console.WriteLine(geraete.Count);
        }
    }
    ''', [[1, {'geraete': '[ ]'}, '', 'Die Geräteliste ist leer.'], [2, {'geraete': '[ ]', 'eingaben': '[1, 2, 0]'}, '', 'Statt Tastatureingaben nutzen wir hier feste Werte.'], [3, {'geraete': '[ ]', 'wahl': '"1"'}, '', 'Erste Auswahl: 1.'], [7, {'geraete': '[Switch]', 'wahl': '"1"'}, '', 'Das Gerät landet in der Liste.'], [3, {'geraete': '[Switch]', 'wahl': '"2"'}, '', 'Zweite Auswahl: 2.'], [11, {'geraete': '[Switch]', 'wahl': '"2"'}, '1', 'Die Anzahl wird ausgegeben.'], [3, {'geraete': '[Switch]', 'wahl': '"0"'}, '', 'Für 0 passt kein Zweig, und die Eingaben sind zu Ende.']]),
 'home': ['Erweitere den Gerätemanager um einen Menüpunkt, der die Anzahl der Geräte ausgibt.', C('''
    List<string> geraete = new List<string> { "Router", "NAS" };
    Console.WriteLine($"{geraete.Count} Geräte erfasst.");
    ''', out='2 Geräte erfasst.')],
 'types': [['p_menue', 'Menü verfolgen'], ['p_klasse', 'Gerät anlegen'], ['p_liste', 'Geräte ausgeben'], ['p_pruefen', 'Eingabe prüfen'], ['p_order', 'Programmteile sortieren'], ['p_methode', 'Methode aufrufen'], ['p_bug', 'Fehler im Manager finden'], ['p_schleife', 'Menüschleife'], ['p_lauf', 'Gesamtlauf vorhersagen']],
},
]

ADVANCED = [
 ('Generics', 'Die spitzen Klammern in <code>List&lt;int&gt;</code> machen eine Klasse für viele Typen nutzbar, ohne dass die Typprüfung verloren geht.', C('''
    List<int> zahlen = new List<int> { 1, 2 };
    Dictionary<string, int> ports = new Dictionary<string, int>();
    ports["HTTPS"] = 443;
    Console.WriteLine(zahlen.Count + " " + ports["HTTPS"]);
    ''', out='2 443')),
 ('Interfaces im Alltag', 'Viele .NET-Bausteine arbeiten mit Interfaces. <code>IEnumerable&lt;T&gt;</code> sagt etwa nur: Das kann man durchlaufen. Deshalb klappt <code>foreach</code> mit Arrays und Listen gleichermaßen.', ''),
 ('Namespaces', 'Ein Namespace sortiert Klassen wie ein Ordner. <code>Console</code> liegt in <code>System</code>. Mit <code>using</code> sparst du dir den langen Namen. Neue Projekte binden die häufigsten Namespaces automatisch ein.', C('''
    using System.Text;

    StringBuilder sb = new StringBuilder();
    sb.Append("Log");
    Console.WriteLine(sb.ToString());
    ''', out='Log')),
 ('LINQ', 'LINQ filtert und sortiert Sammlungen in wenigen Zeilen. <code>x =&gt; x &gt; 2</code> ist eine kleine Funktion ohne Namen.', C('''
    using System.Linq;

    int[] werte = { 1, 3, 5 };
    Console.WriteLine(werte.Where(x => x > 2).Count());
    ''', out='2')),
 ('Dateiverarbeitung', '<code>File</code> liest und schreibt Dateien. Dabei können Ausnahmen auftreten, etwa wenn die Datei fehlt oder Rechte fehlen.', C('''
    File.WriteAllText("log.txt", "Start");
    Console.WriteLine(File.ReadAllText("log.txt"));
    File.Delete("log.txt");
    ''', out='Start')),
 ('Asynchrone Programmierung', 'Mit <code>async</code> und <code>await</code> wartet ein Programm etwa auf Netzwerk, ohne die Oberfläche oder einen Thread zu blockieren. Wichtig bei Servern und Apps. Für den Einstieg reicht es, den Zweck zu kennen.', C('''
    static async Task<int> LadeAsync()
    {
        await Task.Delay(10);
        return 42;
    }

    Console.WriteLine(await LadeAsync());
    ''', out='42')),
 ('APIs', 'Eine API ist die vereinbarte Schnittstelle eines Dienstes. Mit <code>HttpClient</code> fragst du Web-APIs ab und bekommst meist JSON zurück. Für Admins praktisch: Viele Cloud- und Netzwerkgeräte lassen sich so steuern.', ''),
 ('NuGet', 'NuGet ist der Paketmanager von .NET. <code>dotnet add package NAME</code> holt eine Bibliothek ins Projekt. Vorher prüfen, wer sie pflegt: Fremdcode bleibt Fremdcode.', ''),
 ('Visual Studio und VS Code', 'Visual Studio ist eine große Entwicklungsumgebung für Windows, VS Code ein leichter Editor mit C#-Erweiterung. Beide bieten Debugger und Fehlerhinweise. Für dieses Modul reicht VS Code völlig.', ''),
 ('.NET SDK und Projektstruktur', 'Das SDK enthält Compiler und das Werkzeug <code>dotnet</code>. Ein Konsolenprojekt besteht im Kern aus <code>Program.cs</code> und einer <code>.csproj</code>-Datei mit den Einstellungen. Die Ordner <code>bin</code> und <code>obj</code> erzeugt der Build, die gehören nicht ins Git.', ''),
]

MATCH_BANK = [
 ['Compiler', 'übersetzt den Quelltext und meldet Fehler vor dem Start', 'g_begriff'], ['.NET', 'Plattform, die das Programm ausführt und Bausteine mitbringt', 'g_begriff'], ['int', 'Datentyp für ganze Zahlen', 'v_typ'], ['decimal', 'Datentyp für exakte Dezimalzahlen wie Geldbeträge', 'v_typ'], ['bool', 'Datentyp mit genau zwei möglichen Werten', 'v_typ'], ['Modulo', 'liefert den Rest einer ganzzahligen Division', 'o_mod'], ['switch', 'vergleicht einen Wert mit mehreren festen Fällen', 'i_switch'], ['do while', 'Schleife, die mindestens einmal läuft', 'l_do'], ['foreach', 'läuft durch alle Elemente einer Sammlung', 'l_foreach'], ['Index', 'Position eines Elements, beginnt bei 0', 'a_index'], ['List&lt;T&gt;', 'Sammlung, die wachsen und schrumpfen kann', 'a_liste'], ['void', 'Methode gibt keinen Wert zurück', 'm_void'], ['Parameter', 'Wert, den eine Methode beim Aufruf entgegennimmt', 'm_param'], ['Konstruktor', 'läuft automatisch beim Erzeugen eines Objekts', 'c_ctor'], ['Klasse', 'Bauplan für Objekte', 'c_begriff'], ['Interface', 'Vertrag über vorhandene Methoden', 'c_iface'], ['try', 'Block, in dem Ausnahmen auftreten können', 'e_try'], ['finally', 'läuft mit und ohne Ausnahme', 'e_finally'], ['null', 'Hier ist gar kein Objekt', 'e_null'], ['Haltepunkt', 'stoppt das Programm im Debugger an einer Zeile', 'e_debug'],
]
