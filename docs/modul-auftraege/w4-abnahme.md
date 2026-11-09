# W4 – Garage, Gewinn, Gerichtsvollzieher · Abnahme v1.1

## Umfang

10 Lernstufen, 10 passende Nachschlagekapitel mit je einem Labor und Kurz-Check, 55 stabile Aufgabentypen (14 Multiple Choice, also unter einem Drittel), Zuordnen mit 16 Begriffen, Sprint und 30/60/90 Minuten Prüfung mit 20/40/60 Aufgaben. Jedes Thema hat in jeder Prüfungslänge 10 Gesamtpunkte.

Inhalt nach Willis Vorgabe (09.11.2026): Schwerpunkt Unternehmensformen und Marktformen, aufbauend auf ITUM IT.I.04.08 und der Rechtsformen-Übersicht von J. Quickels und N. Böing:

1. Sektoren & Betriebsziele
2. Märkte & Produktpalette
3. Marktformen
4. Einzelunternehmen & Kaufmann
5. GbR & OHG
6. KG & GmbH & Co. KG
7. GmbH & UG
8. AG, KGaA & Genossenschaft
9. Register, Firma & Vollmachten (Handelsregister, Rechtsformzusatz, Prokura, Handlungsvollmacht)
10. Rechtsform wählen & Prüfungsfallen

Abweichung vom Steckbrief W4: Aufbau- und Ablauforganisation sind **nicht** enthalten. Marktformen, Märkte und Sektoren stammen aus dem Unterrichtsmodul IT.I.04.08 und sind auf Willis Wunsch hier statt in W5. Der witzige Moment „Matrix ohne Neo“ entfällt deshalb; stattdessen „Gerichtsvollzieher auf dem Sofa“.

Ältere Lehrbuchangaben wurden auf den Rechtsstand 2026 gebracht: AG und KGaA ohne Mindestzahl von fünf Gründern, Gewinn- und Stimmverteilung bei GbR/OHG nach § 709 Abs. 3 BGB statt 4-%-Regel, rechtsfähige GbR und eGbR seit MoPeG, Einzelvertretung in der OHG.

## Geprüft (lokal, 09.11.2026)

- [x] Eine HTML-Datei, offline lauffähig, eingebetteter Hintergrund `circuit`, Akzent `#ff9a3c` (Orange; ursprünglich geplantes Lila war zu nah an C# und Klausurvorbereitung), Footer v1.1, keine Konsolenfehler.
- [x] Hero-Kicker „WIRTSCHAFT & PROJEKTE // UNTERNEHMEN & MÄRKTE“ ohne sichtbares Modulkürzel (Willis Vorgabe vom 09.11.2026), Hauptüberschrift in derselben Größe wie die übrigen Module, vier Bereichskacheln, keine Warnstreifen.
- [x] Alle 55 Generatoren je 1.000-mal mit wechselnden Stufen: 55.000 Aufgaben mit Ausgangslage, Frage, eigener einfacher Tooltip-Fassung und Erklärung. Richtige Antworten und alle akzeptierten Schreibweisen werden angenommen, falsche abgelehnt.
- [x] 21 Rechenaufgaben und 11 Begriffsaufgaben mit unabhängig festgelegten Ergebnissen; Rechtsregeln (GmbH-Mindesteinzahlung, Resthaftung Kommanditist) 300-mal zufällig gegengeprüft.
- [x] Sich ausschließende Begriffe (primär/sekundär/tertiär, GbR/OHG, Komplementär/Kommanditist, Personen-/Kapitalgesellschaft, ja/nein) ergeben je Aufgabe genau eine gültige Antwort.
- [x] Ausgangslage im Aufgabendialog, im Training und in der Prüfungsauswertung sichtbar. Der Tooltip zeigt keine Beispiele mehr, damit er keine Lösung verrät.
- [x] 20 richtige Antworten über die Trainingsoberfläche; falsche Antwort zeigt richtige Lösung und Erklärung.
- [x] Die ersten drei Lernpfad-Antworten mit Hinweis zählen nicht; nach 10 Antworten ohne Hilfe, davon mindestens 8 richtig, öffnet Stufe 2.
- [x] Alle zehn Labore reagieren auf ungültige und geänderte Eingaben.
- [x] Zuordnen bewertet jede Zeile einzeln.
- [x] 30/60/90-Minuten-Prüfung mit Note, Themenpunkten, eigener und richtiger Antwort und Lösungsweg. Tabwechsel und Verlassen geben als „Seite verlassen“ ab; Sprint endet beim Tabwechsel.
- [x] 360, 390 und 1280 px ohne seitliches Scrollen. Gemeinsame Tests für Design, Fokus-Dialog, Handy, Moduleinstieg und Falsch-Sprüche schließen W4 ein.
- [x] Lernstände nur unter `w4-unternehmen-…`. Einziger weiterer Schlüssel ist `dtp-game-best-w4` des gemeinsamen Spielmodus-Bausteins aus A1 (Serien-Rekord, keine Lernstände).
- [x] PHP-Plattform mit temporärer SQLite-Datenbank: echte Antwort wird über `sync.js` gespeichert, auf frischem Gerät wiederhergestellt, alle 10 W4-Achievements erreichbar, zweite Auswertung ohne doppelte XP, Achievement-Popup vorhanden.
- [x] Modulkarte über `dtp_module_card()` mit Vorschaubild `unternehmen` auf 1280 und 390 px, Themengruppe „Wirtschaft & Projekte“.
- [x] Bestehende Tests: achievements_test (438), dau_lib_test (113), xp2_test (198), learner_lib/http, admin_http, module_release, bundled_module_delivery, nerd_fm, d1/d2-Integration, f2_browser sowie alle gemeinsamen Browsertests bestanden.

## Grenzen

- Humor-Abnahme durch Willi steht aus.
- Die Liveseite wurde nicht verändert. Veröffentlichung erst nach Merge über den bestehenden Deploy-Workflow; danach Liveprüfung unter `/dau-to-pro/`.
- Lernmodell im Marktform-Labor: 1 = einer, 2–9 = wenige, ab 10 = viele. Aufgaben nennen die Stufe immer ausdrücklich.
- Vereinfachte Lernfälle, keine Rechts- oder Steuerberatung.

## Wiederholen

```sh
python tools/build-w4.py
node tools/dau-previews/render.mjs unternehmen
node tests/w4_browser.cjs
node tests/w4_platform.cjs
php tests/achievements_test.php
```
