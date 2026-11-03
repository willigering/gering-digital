# F2 – Rechnet sich das? · Abnahme v1.0

## Umfang

10 Lernstufen, 10 passende Nachschlagekapitel mit je einem veränderbaren Rechenlabor und Kurz-Check, 50 stabile Aufgabentypen, vier Trainingsmodi und 30/60/90 Minuten Prüfung mit 20/40/60 Aufgaben. Die Aufgabenpunkte ergeben bei jeder Länge 100 Punkte; die Themen haben jeweils 10 Gesamtpunkte. In langen Prüfungen werden Aufgabenpunkte mit zwei Dezimalstellen angezeigt, intern wird ungerundet gerechnet.

Alle zehn Inhalte des Steckbriefs sind abgedeckt: Angebotsvergleich, Bezugskalkulation, Angebotskalkulation, Nutzwertanalyse, Kauf/Miete/Leasing, lineare Abschreibung, statische Amortisation, Break-even, Stundensatz und Make or Buy. 100 unterschiedliche Rückmeldungen begleiten richtige und falsche Antworten sowie gemeisterte Stufen.

## Geprüft

- [x] Eine HTML-Datei, offline lauffähig, eingebetteter Hintergrund `circuit-copper`, Akzent `#f6c177`, Footer v1.0.
- [x] Vier Bereichskacheln, keine obere Navigation, kein oberes Logo und keine sichtbaren Warnstreifen.
- [x] Konkrete Einführung, erklärte Fachbegriffe, gelöstes Beispiel und Schrittfolge pro Stufe.
- [x] Ausgangslage und genau eine bewertete Frage sichtbar getrennt. Zuordnungszeilen zählen einzeln.
- [x] Einfachere Fragefassung am eingekreisten Fragezeichen, auch in der Prüfung.
- [x] Die ersten drei beantworteten Aufgaben haben Hinweise und zählen nicht zur Freischaltung. Erst zehn Antworten ohne Hilfe, davon mindestens acht richtig, schalten die nächste Stufe frei.
- [x] Antworten im Lernpfad, Training, Kurz-Check, Zuordnen und Prüfung aktualisieren Statistik und Typverlauf. Hilfen werden für die Stufenfreischaltung ausgeschlossen.
- [x] Alle 50 Generatoren je 1.000-mal mit wechselnden Schwierigkeitswerten: 50.000 fehlerfreie Erzeugungen mit plausibler Struktur, richtiger Eingabe akzeptiert und falscher Zahl abgelehnt.
- [x] 26 unabhängig festgelegte Rechenergebnisse als zusätzliche Regressionen, darunter Skonto nach Rabatt, negative Gewinne, Monats-AfA und Aufrunden der Gewinnschwelle.
- [x] 20 richtige Antworten durch die Trainingsoberfläche, vollständige Erklärungen; 13 Lernpfad-Antworten bis zur ersten Freischaltung.
- [x] Alle drei Prüfungsgrößen bis zur Auswertung bedient; Note, Themenpunkte, eigene Antwort, richtige Antwort und Lösungsweg kontrolliert.
- [x] Tabwechsel und Verlassen geben Prüfungen als „Seite verlassen“ ab. Tabwechsel beendet den Sprint; Moduswechsel kann seine Sperre nicht umgehen.
- [x] 390 und 1280 px: alle vier Bereiche ohne seitliches Scrollen; keine JavaScript-Fehler.
- [x] Offline nur die sechs vereinbarten JSON-Schlüssel mit Präfix `f2-kalk`; Testhaken `window.F2KALK_TEST`.
- [x] Erste Lektion, Aufgaben über alle zehn Themen und anspruchsvolle Fälle zu Skonto, Rückwärtskalkulation, AfA, Amortisation und Make or Buy inhaltlich gelesen. Rechenmodelle und Grenzen ausdrücklich genannt.
- [x] Bestehende PHP-Einbindung und `sync.js` speichern eine wirklich beantwortete Aufgabe über die echte Fortschritts-API in einer temporären SQLite-Datenbank.
- [x] Frischer Browser übernimmt den Kontostand; zentraler Rückweg und Achievement-Popup vorhanden.
- [x] Zehn F2-Achievements erreichbar: 2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige. Präfix, Typ-IDs, Stufen und Prüfungsdauer stimmen überein. Wiederholte Auswertung erzeugt keine doppelten Belohnungen und keine zusätzlichen XP.
- [x] Registrierung im Modulmanifest, eigenes Motiv in beiden Vorschaugrößen, Themengruppe und Hauptseitenfilter „Wirtschaft & Projekte“.
- [x] Die tatsächlich mit `dtp_module_card()` gerenderte Karte wurde in einer Auswahl mit den übrigen Modulen auf Desktop und Handy geprüft.
- [x] Bestehender Achievement-Regressionstest: 219 Prüfungen bestanden. PHP-Syntax der geänderten zentralen Dateien geprüft.

## Grenzen und Veröffentlichung

Die Prüfungen liefen lokal mit Chromium und einer temporären PHP/SQLite-Installation. Ein produktives Konto und die STRATO-Seite wurden nicht verändert. Manifest-Einträge werden vom bestehenden Admin-Ablauf als Entwurf übernommen; Veröffentlichung bleibt eine eigene Handlung.

Der zusätzliche vollständige `tests/dau_lib_test.php`-Lauf konnte in der reduzierten lokalen Quellkopie nicht abgeschlossen werden: alte Hero-Dateien und PHP-GD fehlen. Die F2-Karte, Zuordnung, Bildgrößen und Konto-Anbindung wurden deshalb zusätzlich gezielt mit den tatsächlichen zentralen Funktionen geprüft. Dies ist kein bestandener Gesamttest des gesamten Repositories.

Steuerliche Regeln ersetzen keine Beratung. Aufgaben geben Nutzungsdauer, Satz, Zeitpunkt und Rechenmodell ausdrücklich vor. Quellen stehen im Modul, Stand 03.11.2026.

## Wiederholen

```sh
python tools/build-f2.py
node tools/dau-previews/render.mjs kalkulation
node tests/f2_browser.cjs
node tests/f2_platform.cjs
php tests/achievements_test.php
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` und `PHP_BINARY` können vorhandene lokale Laufzeiten auswählen. Bei einer eigenen PHP-Konfiguration kann zusätzlich `PHPRC` gesetzt werden. Testdaten werden verworfen; der Plattformtest erzeugt und entfernt nur eine zufällige lokale HTML-Version.
