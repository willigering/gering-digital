# B4 IPv6 – Abnahme und Einbau

## Umfang

`lernmodule/b4-ipv6.html`, v1.0: vier Bereiche, zehn Stufen, zehn passende Kapitel mit veränderbaren Laboren und Kurz-Checks, 50 stabile Aufgabentypen. Akzent #4fd1c5, eingebettetes Repository-Motiv cables-braided. Ausgangslage und Frage sind getrennt. Jede Aufgabe bewertet genau eine Antwort. Zuordnen bewertet einen Fall pro Runde.

Die ersten drei Lernpfad-Aufgaben zeigen Hinweise. Antworten mit Hinweis zählen zur Gesamtstatistik, nicht zur Meisterschaft. Erst nach zehn Antworten ohne Hilfe und mindestens acht richtigen wird die nächste Stufe freigeschaltet. Statistik, Teilthemenverlauf und Prüfungsverlauf nutzen ausschließlich b4-ipv6-Schlüssel. Die Prüfung umfasst 20/40/60 Aufgaben bei 30/60/90 Minuten und in jeder Länge exakt 100 Aufgabenpunkte, davon zehn je Teilthema.

## Plattform

- Registrierung im vorhandenen Bundle-Manifest. Wie die bisherigen Module wird B4 im Admin als Entwurf übernommen und von dort veröffentlicht.
- Die vorhandene serverseitige `learner_inject_sync()` bindet Kontozugang, Rückweg, Fortschrittsspeicherung und Achievement-Popups ein. Keine zweite Login- oder Sync-Lösung.
- Zehn Achievements in `ach_modules()['b4']`: zwei Bronze, zwei Silber, zwei Gold, ein Platin und drei witzige. Echte SUBS-IDs, Stufen 0–9, Platin bei 90 Minuten ab 81 Prozent. Bestehende XP-Regeln und doppelte-Vergabe-Schutz bleiben zentral.
- Eigenes Vorschau-Motiv `ipv6`, SVG-Quelle und WebP 1280×720 / 640×360. Slug-Zuordnung und Modulakzent im bestehenden Vorschaukatalog. Der IPv4-Keyword-Fallback beansprucht „ipv6“ nicht mehr.
- Kein Merge und keine Veröffentlichung Bestandteil dieses PRs.

## Prüfungen

Lokal bestanden: JavaScript-Syntax; 50.000 erzeugte und bewertete Aufgaben (1.000 je Typ); Vergleich mit unabhängigem WHATWG-IPv6-Parser; feste Grenzfälle für Nullfolgen, /60-Maskierung, EUI-64 mit gesetztem und gelöschtem U/L-Bit; Aufbau aller drei Prüfungsgrößen und exakt 100 Punkte. Die erste Lektion und Aufgaben aller 50 Typen wurden auf Fall, Sprache, Tooltip und Lösungsbegründung gelesen.

Zusätzliche automatisierte Abnahme in GitHub Actions:

- `node tests/b4_ipv6_unit.js`
- `php tests/b4_ipv6_integration.php`: Fortschrittsübernahme, Erreichbarkeit aller zehn Achievements, XP, wiederholte Auswertung ohne doppelte Vergabe, Vorschau und echte Sync-Injektion.
- `node tests/b4_ipv6_browser.js`: vier Bereiche, Stufensperre, drei Hinweise ohne Freischaltung, 20 Trainingsantworten, interaktives Labor, drei Prüfungsgrößen, eigene/richtige Antwort im Rückblick, Tabwechsel-Abgabe, Sprint-Abbruch, 390-px-Ansicht; anschließend vorhandene Sync/API gegen isoliertes Testkonto und echte Modulkarte auf Desktop/Handy. Screenshots im Workflow-Artefakt.

Der lokale Ausführungscontainer hat kein PHP und erlaubt keinen Chromium-Start (Socket-Systemaufruf gesperrt). Deshalb sind die PHP- und visuellen Browserprüfungen erst dann als bestanden zu behandeln, wenn die entsprechenden CI-Schritte erfolgreich sind. Die Live-STRATO-Installation wird durch den PR nicht verändert.

## Fachquellen

Im Modul direkt verlinkt: RFC 4291, 5952, 4861, 4862, 8064, 8981, 9915, 8106, 4213, 6146, 6147, 8201. DHCPv6-Quellenstand berücksichtigt RFC 9915 (Januar 2026, ersetzt RFC 8415). EUI-64 wird ausdrücklich als vorgegebene Übungsmethode behandelt, nicht als allgemeine Empfehlung für moderne Hosts.
