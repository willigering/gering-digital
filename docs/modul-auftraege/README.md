# DAU TO PRO: Auftrag für neue Lernmodule

Diese Datei ist der komplette Auftrag für eine KI (z. B. ChatGPT mit GitHub-Zugriff), die ein neues Lernmodul für DAU TO PRO baut. Alles, was du brauchst, liegt in diesem Repository. Lies diese Datei ganz, bevor du anfängst.

**Auftrag in einem Satz:** Baue das Modul, das Willi dir nennt (Kürzel aus der Tabelle unten, z. B. „D1“), als eine einzige HTML-Datei und gib sie im Chat als Datei aus. Du übernimmst eigenständig auch den vollständigen Einbau ins Repository: Konto-Anbindung, Fortschritt, XP, Achievements, Vorschaugrafik und Registrierung für die Hauptseite. Liefere alle Änderungen als vollständigen, prüfbaren Pull Request. Eine Übergabe an eine andere KI entfällt. Merge und Veröffentlichung erfolgen nur auf ausdrücklichen Auftrag; einen offenen PR nicht als bereits live eingebaut darstellen.

## 1. Was du aus dem Repository liest

| Was | Pfad | Wofür |
| --- | --- | --- |
| Diese Anleitung | `docs/modul-auftraege/README.md` | Auftrag, Regeln, Modulliste |
| Vorlage | `lernmodule/a1-zahlensysteme.html` | Aufbau, Design, CSS, Lernpfad-Logik, Statistik, Prüfungsmodus, Speicherlogik, Tooltips. **Vollständig lesen.** |
| Zweites Beispiel | `lernmodule/osi-sprint.html` | Wie ein anderes Thema mit derselben Vorlage aussieht |
| Hintergründe | `assets/dau-backgrounds/README.md`, `manifest.json` | Passendes Motiv selbst als Base64 einbetten |
| Achievements | `achievements_lib.php`, Funktion `ach_modules()` | Vorhandenen Katalog, Regeln und XP verwenden |
| Modulregistrierung | `lernmodule/manifest.json` | Modul für Hauptseite und Auswahl registrieren |
| Konto und Fortschritt | `dau-to-pro/sync.js`, `learner_lib.php` und bestehende Moduleinbindung | Vorhandene Synchronisierung und Konto-Anbindung wiederverwenden |
| Vorschaugrafiken | `assets/dau-previews/manifest.json`, `tools/dau-previews/README.md` | Bestehenden Stil und Vorschau-Erzeugung übernehmen |

Die Vorlage ist sehr groß (eingebettete Bilder als Base64). Lies den Code-Teil (CSS und `<script>`), die Base64-Zeichenketten kannst du überspringen.

## 2. Grundauftrag (gilt für jedes Modul)

DAU TO PRO ist eine Lernplattform für die Umschulung Fachinformatiker Systemintegration (IHK). Willi lernt selbst noch. Die Seite soll ihn wirklich durch die Prüfung bringen, kein Wohlfühl-Quiz.

**Vorlage übernehmen:** Aus `a1-zahlensysteme.html` übernimmst du 1:1 Seitenaufbau, Design, CSS-Variablen, Kacheln, Lernpfad-Logik, Statistik, Prüfungsmodus, Speicherlogik, Hintergrund-Einbindung und Tooltips. Neu schreibst du nur Inhalt, Aufgaben-Generatoren, Texte und Akzentfarbe. Keine Bibliotheken, kein Framework.

**Aufbau:** genau 4 Bereiche als Kacheln oben, keine Navigationsleiste, kein Logo oben.

1. **Lernpfad:** 10 Stufen, jede trainiert genau eine Fähigkeit. Ablauf je Stufe: erklären → vorrechnen → mit Hinweis üben → allein. Die ersten 3 Aufgaben einer Stufe zeigen automatisch einen Hinweis. Gemeistert bei 8 von den letzten 10 Aufgaben ohne Hilfe richtig, erst dann öffnet die nächste Stufe. Lektion und Aufgabe nie gleichzeitig sichtbar.
2. **Nachschlagwerk:** 10 Kapitel passend zu den 10 Stufen, mit Erklärung, Beispielen, mindestens einem interaktiven Lab pro Kapitel, Kurz-Check und Spickzettel „Typische Fallen“. Am Ende Quellen mit Link (Gesetze, BSI, Normen, Fachliteratur).
3. **Trainingsraum:** Frei üben mit Themenfilter, „Baustellen“ (schwächste Aufgabentypen), Zuordnen, Sprint 90 Sekunden (Tabwechsel beendet den Sprint).
4. **Prüfungsmodus:** 30, 60 oder 90 Minuten mit 20, 40 oder 60 Aufgaben, 100 Punkte, IHK-Notenschlüssel, Auswertung pro Teilthema, Rückblick mit Lösungsweg, Verlauf der letzten 8 Prüfungen. Seite verlassen gibt die Prüfung automatisch ab.

**Aufgaben:**

- Mindestens 45 verschiedene Aufgabentypen (Generatoren mit Zufallswerten oder große Fallpools), jeder mit fester, kurzer ID (z. B. `r_frist`).
- Echtes Verstehen: rechnen, Fall bewerten, Fehler finden, Reihenfolge, zuordnen, Freitext mit Schlüsselwörtern. Höchstens ein Drittel reines Multiple Choice.
- Fragen im IHK-Prüfungsstil. Direkt hinter jeder Frage ein eingekreistes „?“. Beim Darüberfahren (Handy: Antippen) zeigt ein Tooltip dieselbe Frage in einfachen Worten. Kein extra Button.
- Fachbegriffe in der Frage kurz erklären. Kurze Sätze, Alltagswörter. Schwer darf das Denken sein, nie die Formulierung.
- Jede Antwort bekommt eine Erklärung, bei Rechenaufgaben mit Rechenweg.
- Jede Aufgabe hat genau eine richtige Lösung. Zahlen tolerant einlesen (Komma/Punkt, Einheiten).

**Ton:** frech und witzig wie die Vorlage („Für den Computer gibt es nur 0 und 1. Für dich gibt es ab heute keine Ausreden mehr.“). Witz in Überschriften, Rückmeldungen und Erfolgsbannern, Fachliches immer korrekt und klar. Keine Beleidigungen.

**Design:**

- Wie die Vorlage: dunkle Basis, Creme-Text, schräge Kacheln und Kartenraster. Zweifarbige Titel bleiben Creme/Weiß plus jeweilige Modul-Akzentfarbe; kein pauschales Gold für den farbigen Titelteil. Kacheln, Buttons und Zierlinien greifen dieselbe Modulfarbe auf. Gold bleibt nur dort, wo es eine fachliche Unterscheidung trägt (z. B. Hostanteil gegenüber Netzanteil).
- Die Akzentfarbe des Moduls (Tabelle unten) ersetzt das Cyan der Vorlage überall (`--cyan` und alle `rgba(0,220,232,…)`). Dunkle Flächen leicht in dieser Farbe tönen.
- Hero: kleines Etikett „MODUL D1 // DATENSCHUTZ“, darunter der witzige Titel groß, zweite Zeile in der Akzentfarbe des Moduls. Browser-Tab: „Thema · Titel“.
- Muss auf dem Handy (390 px breit) ohne seitliches Scrollen funktionieren.
- **Kein altes Logo im Fußbereich:** Das Markenbild aus `.foot-brand` der Vorlage nicht übernehmen. Im Footer bleiben nur der Text DAU to PRO, Modulname, Version, Rückweg und Bedienelemente. Auch bestehende Module erhalten kein altes Footer-Logo.
- **Verboten:** orange-schwarze Warnstreifen, obere Navigationsleiste, Logo oben, das Wort „Sprint“ im Modulnamen, `<form>`-Submit, `confirm()`, `alert()`, `prompt()`, externe Skripte oder Schriften, Cookies, Tracking.

### Verständliche Sprache und konkrete Beispiele (verbindlich)

**Schwierig darf das Denken sein, nicht die Formulierung.** Willi lernt die Inhalte noch. Ein Modul muss ihn vom ersten verständlichen Beispiel bis zum selbstständigen Lösen führen. Fachbegriffe gehören zum Lernziel; unnötig abstrakte Sätze sind kein Prüfungsniveau.

- **Erst Alltagssituation, dann Fachregel:** Neue Inhalte mit einem konkreten, anschaulichen Fall einführen (z. B. Firmenlaptop, Kundenliste, Personalakte, verlorener USB-Stick). Zeige: Wer tut was? Welche Daten oder Geräte sind betroffen? Was soll entschieden werden?
- **Fachbegriffe vor der ersten Anwendung erklären:** In einfachen Worten und direkt an der betreffenden Stelle, nicht erst im Nachschlagwerk. Beispiel: „Auftragsverarbeiter — ein Dienstleister, der Daten nach den Anweisungen einer Firma verarbeitet“. Abkürzungen beim ersten Auftreten ausschreiben.
- **Kurze Sätze, eine Aussage pro Satz:** Aktive Verben und bekannte Wörter verwenden. Nominalketten, doppelte Verneinungen und verschachtelte Bedingungen vermeiden. Statt „nach dokumentierter Prüfung“ beispielsweise „Die Firma hat den Vorfall geprüft und das Ergebnis festgehalten“.
- **Jede Aufgabe enthält die nötigen Tatsachen:** Keine ungenannten Voraussetzungen erraten lassen. Rechtlich wichtige Bedingungen und Ausnahmen erhalten, aber verständlich formulieren. Zum Beispiel bedeutet eine verschlüsselte Datei allein noch nicht, dass keine Meldung nötig ist.
- **Eine klare Frage stellen:** Genau sagen, was gesucht wird und in welcher Form geantwortet werden soll. Keine unklaren Sammelfragen oder unnötigen juristischen Zusätze.
- **Schrittweise aufbauen:** erklären → vollständig gelöstes Beispiel → ähnlicher Fall mit passendem Hinweis → selbstständig lösen. Spätere Aufgaben dürfen mehrere gelernte Schritte verbinden. Die Sprache bleibt auch im Prüfungsmodus verständlich.
- **Lösungen erklären den Zusammenhang:** Nicht nur Artikelnummer und richtige Antwort nennen. Zeige: entscheidende Tatsache → passende Regel → Anwendung auf den Fall → Ergebnis. Bei einer falschen Antwort auch die typische Verwechslung erklären.
- **Tooltip ist eine zweite Erklärung:** Die Frage wirklich anders und einfacher ausdrücken. Nicht lediglich den Wortlaut kopieren. Alle entscheidenden Angaben müssen bereits in der sichtbaren Aufgabe stehen; das Fragezeichen darf keine versteckte Voraussetzung und keine Lösung liefern.
- **„IHK-Prüfungsstil“ meint fachliche Anforderungen und Anwendung:** Fachlich anspruchsvolle Fälle, begründete Entscheidungen und saubere Rechenwege. Künstlich komplizierte Sprache ist kein Qualitätsmerkmal. Eigene Aufgaben nicht als offizielle oder nachweislich typische IHK-Formulierungen ausgeben.

#### Muster: Datenschutz verständlich erklären

**Zu abstrakt:**

> Eine Datenschutzverletzung liegt vor. Nach dokumentierter Prüfung ist ein Risiko für Rechte und Freiheiten unwahrscheinlich. Besteht eine Meldepflicht nach Art. 33 DSGVO?

**So soll die Aufgabe aussehen:**

> Ein verschlüsselter Firmenlaptop wurde gestohlen. Der Schlüssel ist sicher. Die Firma hat den Vorfall geprüft. Es ist sehr unwahrscheinlich, dass jemand die Daten lesen oder dass den betroffenen Menschen ein anderer Schaden entstehen kann. Die Firma hält diese Einschätzung fest. Muss sie den Vorfall der zuständigen Datenschutzbehörde melden? Antworte mit „ja“ oder „nein“.

**Tooltip:**

> Die Firma hat geprüft: Durch den Diebstahl sind Nachteile für die Menschen sehr unwahrscheinlich. Muss sie die Datenschutzbehörde trotzdem informieren?

**Lösung mit Begründung:**

> Nein, im beschriebenen Fall ist keine Meldung an die Datenschutzbehörde nötig. Die Firma hat geprüft, dass ein Risiko für die betroffenen Menschen sehr unwahrscheinlich ist. Dafür sieht Art. 33 Abs. 1 DSGVO eine Ausnahme vor. Trotzdem muss die Firma den Vorfall, seine Auswirkungen und die ergriffenen Maßnahmen festhalten (Art. 33 Abs. 5). Wichtig: „verschlüsselt“ allein reicht für diese Entscheidung nicht — die Bewertung hängt vom konkreten Fall ab.

Das Beispiel zeigt das gewünschte Sprachniveau für **alle Module**, nicht nur Datenschutz. Bei anderen Themen entsprechend mit konkreten Netzwerk-, Hardware-, Programmier- oder Arbeitsalltagsfällen arbeiten.

Die gemeinsame Farbgestaltung liegt in `tools/module-theme.css`. `python tools/module_theme.py` bettet sie in alle Modul-HTMLs ein; für einzelne Builder steht `apply_theme(html)` bereit. Der eingebettete Block gehört ans Ende von `<head>`, damit auch modulbezogene Ergänzungen die Titelfarben nicht wieder überschreiben. Die Offline-Datei benötigt weiterhin keine externe CSS-Datei. Die vorhandenen Akzentfarben der Module bleiben eindeutig.

## 3. Technischer Vertrag (nicht verhandelbar)

Davon hängen Fortschritt im Konto, XP, Level und Achievements ab. Weicht ein Schlüssel oder Format ab, zählt das Modul nicht.

Speicher nur `localStorage`, Werte als JSON, alle Schlüssel mit dem **Präfix** aus der Tabelle:

| Schlüssel | Inhalt |
| --- | --- |
| `<präfix>-path-v1` | `{"stage": 0-9, "st": {"0": {"hist": [true,false,…], "solved": n, "mastered": true/false}, …}}`. `hist` = letzte 30 Antworten ohne Hilfe. `mastered` wird bei 8 von 10 `true` und nie wieder `false`. |
| `<präfix>-stats-v1` | `{"solved": n, "correct": n, "streak": n, "best": n}`. Jede Antwort in Lernpfad, Training und Prüfung zählt `solved`+1, richtige zusätzlich `correct`+1. |
| `<präfix>-subs-v1` | `{"<typ-id>": [1,0,1,…]}`. 1 = richtig, 0 = falsch, nur die letzten 12, zeitlich sortiert, bei jeder Antwort überall aktualisiert. |
| `<präfix>-exam-v1` | Liste der letzten 8: `{"d": "02.11.26, 14:05", "m": 30/60/90, "p": 0-100 ganzzahlig, "g": Note 1-6, "r": "Zeit abgelaufen" / "Abgegeben" / "Seite verlassen"}`. Bei Abgabe durch Tabwechsel exakt `"Seite verlassen"`. |
| `<präfix>-tab-v1`, `<präfix>-examlen-v1` | zuletzt offener Bereich, gewählte Prüfungslänge |

Keine anderen Schlüssel, keine ohne Präfix.

- **Aufgabentypen:** Liste `SUBS` mit `{id, cat, label, min}` (Teilthema, deutscher Name, ab Stufe). IDs bleiben für immer gleich.
- **Testhaken:** `window.<KURZ>_TEST = {last, exam, SUBS, genTask, parseAnswer, showAnswer, CATS, STAGES, EXAM_PLAN, buildExam, gradeOf}` wie in der Vorlage (`KURZ` = Präfix groß ohne Bindestrich, z. B. `D1DSGVO_TEST`). `genTask(subId, level)` liefert für jeden Typ 1.000-mal hintereinander fehlerfrei eine lösbare Aufgabe.
- **Hintergrund:** Bette das passende Repository-Bild selbst als Base64-Data-URL im Array `B` ein, wie in der Vorlage. Direkt darüber steht `/* DTP-HINTERGRUND: <motiv-id> */` mit dem Motiv aus der Tabelle. Dunkle Überlagerung verwenden; kein Lesetext direkt auf dem Bild. Die dunkle Grundfarbe bleibt auch bei fehlendem Bild lesbar.
- **Verboten:** `fetch`/XHR, externe URLs außer Quellenlinks, `eval`, Formular-Submit, `confirm`/`alert`/`prompt`, `document.cookie`, `sessionStorage` für Fortschritt.
- **Einbau selbst übernehmen:** Rückweg zur Modulauswahl, Speicher-Synchronisierung, Konto-Fortschritt, XP, Achievements und Hauptseiten-Vorschau gehören zum Auftrag. Die vorhandenen zentralen Komponenten und Einbindungswege wiederverwenden. Keine zweite Login-, Sync- oder Achievement-Lösung bauen. Die einzelne HTML-Datei bleibt offline lauffähig; die Plattform-Anbindung erfolgt über die bestehende Architektur. Keine Werbung mit „ohne Login“: Die Plattform hat bereits eine Login-Funktion.
- **Vertrag durchgehend prüfen:** Präfix, Testhaken, Typ-IDs, Stufenindizes und Prüfungsdauer müssen zwischen Modul und zentraler Auswertung zusammenpassen. Bestehende Fortschritte bei nötigen Änderungen kompatibel übernehmen. Willis ausdrückliche Vorgaben gelten vor den Standardwerten dieser Anleitung. Für D1 sind 10/20/30 Minuten bei 20/40/60 Aufgaben vereinbart; auch die zentrale Prüfungs- und Achievement-Auswertung muss diese Zeiten unterstützen.

## 4. Lieferung

1. Eine einzige HTML-Datei, UTF-8, offline lauffähig, Dateiname laut Tabelle, Version im Footer (`v1.0`). Bei Platzproblemen in Etappen bauen (Lernpfad + Nachschlagwerk, dann Trainingsraum, dann Prüfungsmodus), am Ende die komplette Datei als Download.
2. Dazu eine Liste aller Aufgabentyp-IDs mit deutschem Namen, Teilthema und Stufe.
3. Zehn passende Modul-Achievements vollständig im bestehenden System registrieren: 2 Bronze, 2 Silber, 2 Gold, 1 Platin und 3 witzige, entsprechend dem vorhandenen Katalog. Stabile IDs, echte Aufgabentyp-IDs und korrekte Stufenindizes verwenden. Bedingungen müssen erreichbar sein und mit Lernpfad, Statistik und Prüfungsdauer übereinstimmen. Für die drei witzigen Achievements je einen passenden Fehlertyp und einen Rätseltext wählen. Bestehende XP- und Rangregeln übernehmen; Auslösung und Schutz vor doppelter Vergabe prüfen. Reine Namensvorschläge reichen nicht.
4. Eine passende Vorschaugrafik für die Modulkarte der Hauptseite erstellen, im bestehenden Vorschau-System registrieren und dem Modul zuweisen. Thema, Titel, Stil und Zuschnitt müssen zur Plattform passen. Die tatsächlich eingebundene Karte auf Desktop und Handy prüfen. Ein unreferenziertes Bild oder ein alter HTML-Screenshot ist keine fertige Vorschau.
5. Moduldatei, Manifest, zentrale Integration und benötigte Assets gemeinsam als vollständigen Pull Request liefern. Bestehende Komponenten selbst anpassen, soweit für das Modul nötig. Keine Restaufgaben für eine andere KI hinterlassen. Im PR erklären, was geändert und wie es geprüft wurde; verbleibende Grenzen ehrlich nennen.
6. Die Abnahme-Checkliste (Abschnitt 7) selbst durchgehen und Ergebnis nennen. Erst als vollständig bezeichnen, wenn sowohl Lernmodul als auch Plattform-Anbindung geprüft sind.

## 5. Modulliste mit festen Werten

Reihenfolge = Bau-Reihenfolge. Titel sind Vorschläge, du darfst witzigere finden. Farbe, Präfix, Dateiname und Hintergrund sind fest.

| Nr | Kürzel | Thema | Titel-Vorschlag | Dateiname | Präfix | Farbe | Hintergrund |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | D1 | Datenschutz | Meine Daten, deine Daten, DSGVO | d1-datenschutz.html | d1-dsgvo | #ff8fa3 | server |
| 2 | D2 | IT-Sicherheit & Schutzbedarf | Passwort123 ist kein Konzept | d2-it-sicherheit.html | d2-sec | #ff6b6b | circuit-sockets |
| 3 | B5 | Netzwerkdienste & Protokolle | Port 80, bitte kommen | b5-netzwerkdienste.html | b5-dienste | #7ad0ff | cables-fiber |
| 4 | B4 | IPv6 | Doppelpunkt, Doppelpunkt, Durchblick | b4-ipv6.html | b4-ipv6 | #4fd1c5 | cables-braided |
| 5 | F2 | Kalkulation & Beschaffung | Rechnet sich das? | f2-kalkulation.html | f2-kalk | #f6c177 | circuit-copper |
| 6 | F1 | Projektmanagement | Kritischer Pfad, kritische Laune | f1-projektmanagement.html | f1-pm | #e8a87c | circuit-micro |
| 7 | W1 | Ausbildung & Arbeitsrecht | Probezeit ist keine Spielzeit | w1-arbeitsrecht.html | w1-arbeit | #c3e88d | server |
| 8 | W2 | Sozialversicherung, Steuern & Entgelt | Brutto ist nicht Netto | w2-sozialversicherung.html | w2-sozial | #9ece6a | hardware-memory |
| 9 | W3 | Mitbestimmung & Tarif | Betriebsrat statt Bauchgefühl | w3-mitbestimmung.html | w3-tarif | #b4f9f8 | cables |
| 10 | W4 | Unternehmen & Organisation | GmbH, AG oder Garage? | w4-unternehmen.html | w4-unternehmen | #d4b8ff | circuit |
| 11 | W5 | Wirtschaft, Markt & Verträge | Angebot, Nachfrage, Panik | w5-wirtschaft.html | w5-markt | #ffd580 | hardware-connectors |
| 12 | A2 | Hardware & Energie | RAID, aber bitte mit Sinn | a2-hardware.html | a2-hw | #6fe3c1 | hardware-memory |
| 13 | A3 | Betriebssysteme & Terminal | sudo mach mal | a3-betriebssysteme.html | a3-os | #8bd5ca | circuit-micro |
| 14 | E1 | Programmierung & Algorithmen | Schleife, bis es klickt | e1-programmierung.html | e1-prog | #a0a8ff | circuit-signal |
| 15 | E2 | Datenbanken & SQL | SELECT * FROM Durchblick | e2-sql.html | e2-sql | #89b4fa | server |
| 16 | C1 | Virtualisierung & Cloud | Alles nur geliehen | c1-virtualisierung.html | c1-virt | #74c7ec | cables-fiber |
| 17 | C2 | Server & Verzeichnisdienste | AGDLP und andere Zaubersprüche | c2-server.html | c2-ad | #94e2d5 | server |
| 18 | C3 | Backup, Monitoring & Verfügbarkeit | Kein Backup, kein Mitleid | c3-backup.html | c3-backup | #a6e3a1 | hardware-connectors |
| 19 | D3 | Kryptografie | Geheim, aber richtig | d3-kryptografie.html | d3-krypto | #f5a97f | circuit-copper |
| 20 | B6 | Switching, Routing & VLAN | Wer routet, gewinnt nicht immer | b6-routing.html | b6-routing | #7dc4e4 | network-ports |
| 21 | E3 | Skripting & Web | Bash me if you can | e3-skripting.html | e3-script | #c6a0f6 | circuit-signal |
| 22 | F3 | IT-Service & Kundenberatung | Haben Sie es schon neu gestartet? | f3-it-service.html | f3-service | #f0c6c6 | cables-patch |
| 23 | F4 | Qualität, Ergonomie & Nachhaltigkeit | Green IT statt grauer Theorie | f4-qualitaet.html | f4-qm | #a6da95 | circuit |
| 24 | A4 | Abkürzungen & Fachbegriffe | WTF heißt eigentlich … | a4-fachbegriffe.html | a4-glossar | #b9c4d0 | circuit-micro |
| 25 | H1 | Programmieren in der Sandbox | Hallo Welt, tschüss Angst | h1-sandbox.html | h1-code | #82aaff | circuit-signal |
| 26 | H2 | Algorithmen & Datenstrukturen | Sortier dich mal | h2-algorithmen.html | h2-algo | #c792ea | circuit-micro |
| 27 | H3 | Objektorientierung & UML | Klasse statt Masse | h3-oop.html | h3-oop | #ffcb6b | circuit |
| 28 | H4 | Pseudocode & Struktogramm | Erst denken, dann tippen | h4-pseudocode.html | h4-pseudo | #f78c6c | circuit-copper |
| 29 | H5 | SQL in der Praxis | JOIN the dark side | h5-sql.html | h5-sql | #89ddff | server |
| 30 | H6 | Testen & Versionskontrolle | git push und beten | h6-testen.html | h6-test | #c3e88d | hardware-connectors |
| 31 | H7 | Web, APIs & sichere Programmierung | Little Bobby Tables | h7-web.html | h7-web | #ff5370 | cables-fiber |
| 32 | H8 | Software-Entwurf | Muster mit Mehrwert | h8-entwurf.html | h8-entwurf | #b2ccd6 | server |
| 33 | G3 | Fehleranalyse & Troubleshooting | Ping, Pong, Problem | g3-troubleshooting.html | g3-trouble | #ed8796 | network-ports |
| 34 | G1 | Abschlussprüfung Teil 1 | 90 Minuten Wahrheit | g1-ap1.html | g1-ap1 | #7aa2ff | circuit |
| 35 | G2 | Abschlussprüfung Teil 2 | Endgegner FISI | g2-ap2.html | g2-ap2 | #5b8cff | server |
| 36 | W6 | WiSo-Simulation | 60 Minuten WiSo-Wahnsinn | w6-wiso-simulation.html | w6-wiso | #e5c890 | cables |

Fertig sind schon: A1 Zahlensysteme, B1 OSI, B2 Netzwerke, B3 Subnetting. Die baust du nicht neu.

## 6. Steckbriefe (die 10 Stufen und Aufgaben-Schwerpunkte)

Die Stufen sind die Kapitel des Nachschlagwerks. Formuliere sie fachlich aus und erweitere die Aufgaben auf mindestens 45 Typen. Für die drei witzigen Momente legst du je einen eigenen Aufgabentyp an.

### D1 Datenschutz (Ausführlich, Muster für alle anderen)

Ziel AP1-Niveau: personenbezogene Daten erkennen, Rechtsgrundlage prüfen, Rechte der Betroffenen kennen, TOM zuordnen, Datenpanne richtig behandeln.

1. Personenbezogene Daten: Begriff, Beispiele, besondere Kategorien (Art. 9), anonym vs. pseudonym
2. Grundsätze (Art. 5): Rechtmäßigkeit, Zweckbindung, Datenminimierung, Richtigkeit, Speicherbegrenzung, Integrität/Vertraulichkeit, Rechenschaft
3. Rechtsgrundlagen (Art. 6) und Anforderungen an eine Einwilligung
4. Rechte der Betroffenen (Art. 12–22), Frist 1 Monat
5. Rollen: Verantwortlicher, Auftragsverarbeiter (Art. 28), Datenschutzbeauftragter (§ 38 BDSG: ab 20 Personen), Aufsichtsbehörde
6. TOM (Art. 32): Zutritts-, Zugangs-, Zugriffs-, Weitergabe-, Eingabe-, Auftrags-, Verfügbarkeitskontrolle, Trennungsgebot; Pseudonymisierung, Verschlüsselung
7. Privacy by Design/Default (Art. 25), Verzeichnis von Verarbeitungstätigkeiten (Art. 30), Datenschutz-Folgenabschätzung (Art. 35)
8. Datenpanne (Art. 33/34): 72 Stunden, wann Betroffene informieren, Dokumentation
9. Besondere Fälle: Beschäftigtendaten (§ 26 BDSG), Videoüberwachung, Cookies (TDDDG), Drittländer
10. Bußgelder und Haftung (Art. 82/83: bis 20 Mio. € oder 4 % Jahresumsatz, der höhere Wert), Datenschutz vs. Datensicherheit vs. IT-Sicherheit

Aufgaben: personenbezogen ja/nein und besondere Kategorie (Fallgenerator), Rechtsgrundlage zum Fall, verletzter Grundsatz, Betroffenenrecht zum Anliegen plus Antwortfrist berechnen, TOM zur Maßnahme, TOM für Szenario, Meldefrist Datenpanne aus Datum und Uhrzeit, meldepflichtig ja/nein, DSB-Pflicht, Bußgeld-Obergrenze rechnen, anonym/pseudonym, Verantwortlicher/Auftragsverarbeiter, Freitext „zwei Anforderungen an eine Einwilligung“, Fehler in Einwilligungstext finden.
Witzige Momente: „Cookie-Monster“ (Cookie-Einwilligung), „Ich hab nichts zu verbergen“ (personenbezogen ja/nein), „72 Stunden sind lang“ (Meldefrist).
Quellen: dsgvo-gesetz.de, gesetze-im-internet.de (BDSG, TDDDG), BfDI, Kurzpapiere der Datenschutzkonferenz. Footer: „Keine Rechtsberatung.“

### Weitere Module

| Kürzel | Die 10 Stufen | Aufgaben-Schwerpunkte | Witzige Momente |
| --- | --- | --- | --- |
| D2 | Schutzziele CIA+; Bedrohung, Schwachstelle, Risiko; BSI IT-Grundschutz; Schutzbedarfsfeststellung (Maximumprinzip, Kumulation); Schadsoftware; Angriffsarten; Social Engineering; Passwörter und MFA; Firewall, DMZ, IDS/IPS; Notfallmanagement | Schutzbedarf vererben, Angriff am Fall erkennen, Maßnahme zuordnen, Passwort-Entropie rechnen, Risiko = Eintritt × Schaden | Passwort123; Der Prinz aus Nigeria; USB-Stick vom Parkplatz |
| B5 | TCP vs. UDP; Ports; Handshake und Abbau; DHCP (DORA); DNS und Record-Typen; NAT/PAT; ARP; ICMP; HTTP/HTTPS; Mail, FTP, SSH, Telnet | Port ↔ Dienst, Ablauf sortieren, Mitschnitt lesen, Record-Typ wählen, NAT-Tabelle ausfüllen | It's always DNS; Telnet im Jahr 2026; DHCP-Server im Urlaub |
| B4 | 128 Bit und Hex-Blöcke; Kürzen nach RFC 5952; Erweitern; Präfix und Interface-ID; Adresstypen; EUI-64; SLAAC; DHCPv6; Subnetting /48 → /64; Dual Stack | Kürzen/Erweitern, Typ bestimmen, Anzahl /64-Netze, n-tes Subnetz, EUI-64 aus MAC | Doppelter Doppelpunkt; fe80 ist kein Router; Zu viele Nullen |
| F2 | Angebotsvergleich; Bezugskalkulation; Angebotskalkulation; Nutzwertanalyse; Kauf/Miete/Leasing; lineare AfA; Amortisation; Break-even; Stundensatz; Make or Buy | Kalkulationsschemata mit Zufallswerten und Rechenweg, Nutzwertanalyse, Leasing vs. Kauf, Break-even-Menge | Skonto vergessen; Leasing klingt billiger; Nutzwert 0 |
| F1 | Projektmerkmale und Phasen; Lasten- vs. Pflichtenheft; Stakeholder; Netzplan (FAZ/FEZ/SAZ/SEZ); Puffer, kritischer Pfad; Gantt; Wasserfall/V-Modell; Scrum; Kanban; Risiko und Abschluss | Netzplan-Generator, Puffer, kritischen Pfad markieren, Scrum-Rolle zuordnen | Daily dauert 2 Stunden; Puffer negativ; Lastenheft? Nie gesehen |
| W1 | BBiG und Umschulungsvertrag; Rechte und Pflichten; Probezeit; Arbeitsvertrag; Kündigung und Fristen (§ 622 BGB); Kündigungsschutz; Zeugnis; ArbZG und Pausen; Urlaub; Arbeits-, Mutter-, Jugendschutz | Fristenrechner, Kündigung wirksam?, Pausen nach Arbeitszeit, anteiliger Urlaub | Kündigung per WhatsApp; 14 Stunden am Stück; Probezeit-Panik |
| W2 | Fünf Säulen; Träger; Beitragssätze AG/AN; Beitragsbemessungsgrenze; Steuerklassen; Brutto-Netto; Arbeitslosengeld; Kranken- und Unfallversicherung; Rente; private Vorsorge | Brutto-Netto mit aktuellen Sätzen (Stand nennen), Versicherung zum Fall, Steuerklasse wählen | Netto ist nur ein Gerücht; Arbeitsunfall auf dem Sofa; Steuerklasse 6 aus Versehen |
| W3 | BetrVG; Betriebsrat (Größe, Wahl); JAV; Mitbestimmung/Mitwirkung/Information; Betriebsvereinbarung; Gewerkschaft und Arbeitgeberverband; Tarifvertrag; Tarifautonomie; Streik und Aussperrung; Schlichtung | Recht des Betriebsrats zum Fall, BR-Größe, Tarifverhandlung sortieren | Streik wegen Kaffeemaschine; JAV mit 30; Betriebsrat? Haben wir nicht |
| W4 | Unternehmensziele; Einzelunternehmen; GbR, OHG, KG; GmbH, UG; AG; Haftung und Gründung; Handelsregister; Prokura und Handlungsvollmacht; Aufbauorganisation; Ablauforganisation | Rechtsform zum Fall, Haftung, Organigramm-Typ, reicht die Vollmacht? | UG mit 1 €; Prokurist kauft Firma; Matrix ohne Neo |
| W5 | Soziale Marktwirtschaft; Angebot und Nachfrage; Wirtschaftskreislauf; Konjunktur; Geschäftsfähigkeit; Kaufvertrag; Werk- und Dienstvertrag; Mängel und Gewährleistung; Zahlungsverzug; Verbraucherschutz und Widerruf | Marktgleichgewicht rechnen, Vertragsart erkennen, Gewährleistung anwenden, Widerrufsfrist | Taschengeldparagraf; Mangel? Ist ein Feature; Widerruf nach 3 Monaten |
| A2 | CPU; RAM; Mainboard und Busse; Schnittstellen; HDD/SSD/NVMe; RAID 0/1/5/6/10; Netzteil und Effizienz; USV; Stromkosten; Green IT | RAID-Kapazität und Ausfalltoleranz, Stromkosten pro Jahr, USV-Laufzeit, Bauteil zuordnen | RAID 0 ist ein Backup; Steckdosenleiste als USV; Mehr RGB = mehr FPS |
| A3 | Aufgaben eines OS; Windows vs. Linux; Dateisysteme; Pfade; Benutzer und Gruppen; Rechte (chmod, NTFS); Prozesse und Dienste; Bootvorgang; Befehle (cmd, PowerShell, Bash); Pakete und Updates | Befehl zur Aufgabe, chmod-Umrechnung, Pfad auflösen, Terminal-Simulation | rm -rf /; Haben Sie neu gestartet?; sudo vergessen |
| E1 | Variablen und Datentypen; Operatoren; Verzweigung; Schleifen; Arrays; Funktionen; Pseudocode; Struktogramm; PAP; Sortieren und Suchen | Ausgabe vorhersagen, Pseudocode ergänzen, Schreibtischtest, Fehler finden | Endlosschleife; Off-by-one; = statt == |
| E2 | Relationales Modell; Schlüssel; ER-Modell und Kardinalitäten; Normalformen 1–3; SELECT/WHERE; ORDER BY und Aggregation; GROUP BY/HAVING; JOIN; INSERT/UPDATE/DELETE; CREATE/ALTER | SQL gegen eine kleine eingebaute Beispiel-DB (eigener Mini-Interpreter, keine externe Bibliothek), normalisieren, Kardinalität | DELETE ohne WHERE; SELECT *; NULL ist nicht 0 |
| C1 | Gründe für Virtualisierung; Hypervisor Typ 1/2; VM-Ressourcen; Snapshot vs. Backup; Container; IaaS/PaaS/SaaS; Cloud-Modelle; Hochverfügbarkeit; Lizenzen; Dimensionierung | Szenario → Modell, Host-Ressourcen rechnen, Shared Responsibility | Snapshot ist mein Backup; Die Cloud ist nur ein fremder Rechner; 128 GB für den Druckserver |
| C2 | Serverrollen; Active Directory; Domäne, Baum, Gesamtstruktur; OU; Benutzer und Gruppen; AGDLP; GPO (LSDOU); Freigabe- vs. NTFS-Rechte; effektive Rechte; Datei- und Druckserver | Effektive Rechte, AGDLP aufbauen, GPO-Reihenfolge | Domänen-Admin für alle; Verweigern schlägt alles; Drucker offline |
| C3 | Sicherungsarten; Generationenprinzip; 3-2-1; RPO/RTO; Speicherbedarf; Sicherungsdauer; Wiederherstellung; Verfügbarkeit in Prozent; Monitoring und SNMP; Logging | Speicher und Dauer von Voll/inkrementell/differenziell, Wiederherstellungsreihenfolge, 99,9 % → Minuten pro Jahr | Kein Backup, kein Mitleid; Backup nie getestet; Five Nines am Montag |
| D3 | Grundbegriffe; symmetrisch (AES); asymmetrisch (RSA); hybrid; Hash; Signatur; Zertifikat und PKI; TLS-Handshake; VPN/IPsec; Schlüsselaustausch | Welcher Schlüssel wofür, Ablauf sortieren, Schlüsselanzahl für n Teilnehmer | Mit dem öffentlichen Schlüssel signiert; MD5 ist sicher; Zertifikat abgelaufen |
| B6 | Switch und MAC-Tabelle; Broadcast-Domäne; VLAN und 802.1Q; Trunk; STP; Router und Routingtabelle; statisches Routing; Default-Route; längster Präfix; ACL und VPN | MAC-Tabelle füllen, Paketweg verfolgen, Routingtabelle, nächster Hop | Schleife ohne STP; VLAN 1 für alles; Default-Route ins Nichts |
| E3 | Bash; PowerShell; Variablen und Schleifen im Skript; Pipes und Filter; HTML; CSS; HTTP-Methoden und Statuscodes; REST; JSON; XML | Skriptausgabe vorhersagen, Skript ergänzen, Statuscode zuordnen, JSON auslesen | 418 I'm a teapot; chmod 777 löst alles; Fehlende Klammer |
| F3 | ITIL; Incident/Problem/Change; SLA; Ticket und Priorität; Kommunikation (4-Ohren-Modell); Kundengespräch; Beschwerden; Schulung; Barrierefreiheit; Dokumentation | SLA-Fristen mit Geschäftszeiten, Priorität aus Auswirkung × Dringlichkeit, Gesprächsantwort bewerten | Haben Sie es neu gestartet?; Ticket ohne Beschreibung; Der König ist wütend |
| F4 | Qualitätsbegriff; PDCA; ISO 9001; Normen und Zertifizierung; Bildschirmarbeitsplatz; Ergonomie Hard- und Software; Green IT; Energieverbrauch; Entsorgung (ElektroG); Lebenszyklus | Maßnahme zur PDCA-Phase, Ergonomie-Fehler finden, Energieeinsparung rechnen | Monitor auf dem Karton; Alte Rechner in den Hausmüll; Qualität ist Glückssache |
| A4 | Abkürzungen nach Bereichen: Hardware, Netz, Protokolle, Sicherheit, Datenschutz, Software, Datenbank, Projekt, Wirtschaft, Service | Abkürzung ↔ Langform ↔ Erklärung in beide Richtungen, mindestens 400 Begriffe, Wiederholbox | TLA; PEBKAC; Layer 8 |
| G3 | Vorgehen bottom-up nach OSI; Ausschlussverfahren; ping; tracert/traceroute; ipconfig/ip; nslookup/dig; netstat/ss; arp; Logs lesen; Dokumentation | Störungsfall mit Werkzeugausgaben lösen, nächsten Schritt wählen | Kabel war nicht drin; ping 127.0.0.1 klappt, also geht das Internet; Es liegt am WLAN |

**H1–H8 (Anwendungsentwicklung, Zusatz):** jedes Modul zusätzlich mit Programmier-Sandbox: Editor (Textarea mit Zeilennummern), Ausführen-Knopf, Ausgabe, automatische Tests pro Aufgabe. JavaScript läuft in einem Web Worker mit Zeitlimit (Endlosschleifen abbrechen). Kein Pyodide und kein sql.js ohne Willis Zustimmung. Eine Sandbox-Aufgabe ist richtig, wenn alle Tests grün sind, und zählt im Speicher wie jede andere Aufgabe. Schwerpunkte: H1 Variablen bis Funktionen selbst schreiben; H2 Suchen, Sortieren, Rekursion, Stack/Queue, O-Notation mit Ablauf-Animation; H3 Klassen nach UML, Vererbung, Interfaces; H4 IHK-Pseudocode ergänzen und in JS übersetzen; H5 Unterabfragen, Views, Transaktionen, GRANT; H6 Testfälle mit Grenzwerten, Bugs finden, Git im Simulator; H7 JSON verarbeiten, SQL-Injection und XSS beheben; H8 MVC, Schichten, Entwurfsmuster, Clean Code.

**G1, G2, W6 (Prüfungssimulationen):** kommen zum Schluss. Lernpfad = Ablauf, Bewertung, Zeitplanung und Aufgabentypen der Prüfung. Hauptteil ist der Prüfungsmodus (G1 90 Minuten, G2 Fachteile mit Zeitvorgabe, W6 60 Minuten mit 30 gebundenen Aufgaben). Du kombinierst selbst die Generatoren der fertigen Module und lieferst Oberfläche, neue Fallaufgaben und vollständige Plattform-Anbindung.

## 7. Abnahme-Checkliste

- [ ] Eine HTML-Datei, öffnet ohne Internet und ohne Konsolenfehler.
- [ ] Oben nur Etikett, Titel und die 4 Kacheln. Keine Navigationsleiste, kein Logo oben, keine Warnstreifen.
- [ ] Akzentfarbe laut Tabelle, Kommentar `DTP-HINTERGRUND` mit dem richtigen Motiv.
- [ ] Stufe 2 gesperrt, bis Stufe 1 mit 8 von 10 gemeistert ist. Die ersten 3 Aufgaben zeigen einen Hinweis.
- [ ] Jede Frage hat das eingekreiste ? mit einer tatsächlich einfacheren Erklärung; keine bloße Wiederholung und keine versteckten Voraussetzungen.
- [ ] Verständlichkeitsprüfung: Die erste Lektion und mindestens 20 Aufgaben quer durch die Themen (einschließlich der schwersten) wurden inhaltlich gelesen, nicht nur technisch getestet. Jede ist ohne Vorwissen außerhalb der erklärten Grundlagen verständlich.
- [ ] Jedes neue Konzept beginnt mit einem konkreten Beispiel; Fachbegriffe sind vor der ersten Anwendung erklärt. Lösungen zeigen Tatsache → Regel → Anwendung → Ergebnis.
- [ ] Schwierigkeit entsteht durch die fachliche Entscheidung, nicht durch abstrakte Sprache. Das Laptop-Beispiel dient als Maßstab.
- [ ] 20 Aufgaben im freien Training: keine falsch bewertete Antwort, jede mit Erklärung.
- [ ] Sprint endet beim Tabwechsel. Prüfung wird beim Tabwechsel abgegeben und steht als „Seite verlassen“ im Verlauf.
- [ ] 30/60/90-Minuten-Prüfung mit Note, Teilthemen und Lösungswegen.
- [ ] 390 px breit: kein seitliches Scrollen.
- [ ] Im localStorage nur Schlüssel mit dem Präfix des Moduls.
- [ ] `genTask` für jeden Typ 1.000-mal ohne Fehler.

### Zusätzliche Abnahme für den vollständigen Einbau

- [ ] Alle Inhalte des Modul-Steckbriefs sind abgedeckt; Auslassungen nicht als vollständiges Modul ausgeben.
- [ ] Eine Aufgabe enthält genau einen Fall, eine Frage und eine bewertete Antwort. Keine Alles-oder-nichts-Bewertung mehrerer unabhängiger Fragen. Anspruch entsteht durch Anwendung und passende Fachbegriffe statt bloß offensichtlicher Wortzuordnung.
- [ ] Ausgangslage und eigentliche Frage sind sichtbar getrennt. Einleitende Tatsachen stehen bei der Ausgangslage, nicht im Fragetext.
- [ ] Nach Prüfungsabgabe sind eigene Eingabe, richtige Antwort und Lösungsweg pro Aufgabe sichtbar. Aufgabenpunkte und aufsummierte Themenpunkte sind eindeutig beschriftet.
- [ ] Modul ist im Manifest und auf der Hauptseite mit passender, tatsächlich eingebundener Vorschaugrafik erreichbar.
- [ ] Konto-Synchronisierung, Fortschritt, XP und Rückweg funktionieren über die vorhandenen zentralen Komponenten.
- [ ] Zehn passende Achievements sind registriert; Regeln, Typ-IDs, Stufen und Prüfungslängen wurden gegen das Modul geprüft. Wiederholte Vergabe erzeugt keine doppelten Belohnungen.
- [ ] Offline-Datei und Plattform-Einbindung wurden getrennt geprüft; der PR enthält sämtliche notwendigen Dateien und nennt die tatsächlichen Prüfergebnisse.

