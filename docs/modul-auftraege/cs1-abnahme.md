# CS1 – Compiler sagt nein · Abnahme v2.0

Neuaufbau am 09.11.2026 auf Willis Wunsch: Das Modul soll wie ein Einstieg in die Programmierwelt wirken (Was sind Datentypen, wie deklariert und initialisiert man, Compiler gegen Interpreter) und im Lernpfad vielseitige Fragen statt derselben Frage mit anderen Werten stellen. Titel von Willi gewählt: „Compiler sagt nein“.

Wie bisher führt das Modul keinen Nutzercode aus. Eigener Code entsteht lokal mit dem .NET SDK.

## Aufbau

| Stufe | Kapitel | Typen | Formen |
| --- | --- | --- | --- |
| 1 | Was ist Programmieren? | 8 | mc, set, order, word, free |
| 2 | Compiler, Interpreter und .NET | 8 | mc, set, order, word, free |
| 3 | Aufbau eines C#-Programms | 8 | out, fix, gap, order, mc, set |
| 4 | Datentypen | 8 | mc, word, set, out, fix |
| 5 | Variablen deklarieren und initialisieren | 9 | mc, set, write, out, order |
| 6 | Typumwandlung, Ein- und Ausgabe | 8 | write, out, set, word |
| 7 | Operatoren und Berechnungen | 12 | out, set, write, word, fix, mc |
| 8 | Verzweigungen | 11 | out, gap, fix, set, order, word |
| 9 | Schleifen | 11 | out, mc, fix, write, word, order |
| 10 | Arrays und erste Methoden | 12 | out, mc, set, write, fix, word |

Vollständige Liste: `cs1-aufgabentypen.md` (wird vom Build erzeugt). Neue Formen: `set` (mehrere richtige Buchstaben) und `free` (Freitext mit Schlüsselwörtern).

## Speicher, Achievements, XP

- Neuer Präfix `cs1-start`, Testhaken `CS1START_TEST`. Alte C#-Lernstände (`cs-code-*`) bleiben unverändert und gehören zum geparkten CS2.
- Zehn neue Achievements `cs1.*` (2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige zu `w_html`, `u_nein`, `t_ueberlauf`).
- CS2 ist auf Willis Wunsch vom 09.11.2026 **vollständig ausgeblendet** (`'hidden'=>true` im Katalog): keine Kachel, keine Gruppe in der Achievement-Übersicht, nicht in Vitrine, Vitrinen-Auswahl, Rangliste oder „zuletzt freigeschaltet“. Freigeschaltete `cs.*`-Achievements und ihre XP bleiben gespeichert und zählen weiter.
- XP über die bestehende Logik (Aufgaben, Stufen, Prüfungsbestwerte). Die Balance-Referenz bleibt unverändert (`tools/xp-balance.php`).
- Spielmodus wie in A1 (Serie, Rekord, Leuchten) in Modulfarbe. Eigener Rekord unter `dtp-game-best-cs1`, wie in A1.

## Veröffentlichung

Die Adresse `cs1-csharp` bleibt. Beim Deploy übernimmt `module_release_sync` einmalig Titel, Fach und Beschreibung aus dem Manifest und veröffentlicht das Modul, aber nur, solange in der Datenbank noch der alte Standardtitel „Der Compiler hat immer recht“ steht (`MODULE_RELEASE_REPLACED`). Ein eigener Admin-Titel und dessen Offline-Status bleiben unangetastet (`tests/cs1_release_test.php`).

## Geprüft (lokal, 09.11.2026)

- `tests/cs_verify.cjs` mit .NET 8 SDK: alle 55 Codeblöcke, alle Abläufe in Zeitlupe, Stichproben aller 95 Typen. Ausgaben, Musterlösungen und jede Behauptung über Compilerfehler, Ausnahmen und gültige Zeilen werden vom echten Compiler bestätigt.
- Vielfaltsmessung je Stufe (400 Lernpfad-Aufgaben): direkte Wiederholung von Typ und Form 0 %, 7–9 Typen und 4–6 Formen je 10 Aufgaben, häufigste Form 26–42 %.
- `tests/cs_browser.cjs`: Sperre, Hinweise, 8 von 10, Rückweg aus dem Nachschlagwerk, alle sieben Eingabearten, Zuordnen, Prüfung, Tabwechsel, Speicherpräfix, Spielmodus, Breiten 1280/768/390/360.
- `tests/cs_platform.cjs`: Konto-Sync über die echte PHP-API, zehn CS1-Achievements ohne Doppelvergabe, keine Auswirkung auf alte `cs.*`, Wiederherstellung auf zweitem Gerät, Modulkarte mit neuem Vorschaubild.
- Gesamte PHP- und Browser-Testsuite der Plattform.

## Bewusste Grenzen

- Code-Aufgaben vergleichen gegen eine Liste korrekter Schreibweisen. Eine ungewöhnliche, aber richtige Lösung kann als falsch gelten. Freitext wertet Schlüsselwörter, keine Bedeutung.
- Die zehn Achievement-Symbole sind per Skript gezeichnete Pixel-Art (`tools/cs1-icons.py`), schlichter als die generierten Symbole anderer Module. Austausch jederzeit möglich, Dateinamen bleiben.
- Willis Humor-Abnahme steht aus. Nicht live.
