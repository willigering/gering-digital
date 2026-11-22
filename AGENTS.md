# DAU TO PRO

Bei Arbeiten an Lernmodulen gelten die vollständige Projektanleitung
[`docs/modul-auftraege/README.md`](docs/modul-auftraege/README.md)
und der Redaktionsworkflow
[`docs/redaktion/SPRACHE-UND-HUMOR.md`](docs/redaktion/SPRACHE-UND-HUMOR.md).

Der Workflow gilt für neue und bestehende Module. Sprache zuerst verständlich
machen, Humor und Fachlichkeit getrennt prüfen. Sparsame, situationsbezogene
derbe Sprache ist erlaubt; Lernende nicht beschimpfen. IDs, Lösungen,
Fortschritt, XP und Konto-Anbindung bei reiner Redaktion erhalten.

Den Umfang einer Überarbeitung und ihre tatsächlichen Prüfergebnisse in
`docs/redaktion/STATUS.md` festhalten. Einen geplanten oder teilweise
bearbeiteten Durchlauf nicht als vollständig oder live geprüft darstellen.
Vorhandene Autorisierung für Merge und Veröffentlichung beachten; diese
Datei erweitert sie nicht.



### Willis verbindliche Ergänzung vom 03.11.2026

Bei der sprachlichen Überarbeitung bestehender Module **nur die Inhalte ändern, keine Überschriften**: Seitentitel, Modulname, Kapitel-/Stufentitel, Abschnitts- und Labortitel erhalten. Erklärungen, Fälle, Fragen, Hinweise, Lösungen und Rückmeldungen dürfen redigiert werden. Ausdrücklich beauftragte Darstellungsänderungen wie der Buchstabenabstand werden getrennt dokumentiert.

Die ausgelieferte HTML-Datei nach der unveränderten Hauptüberschrift benennen, bei B5 **`Port 80, bitte kommen.html`**. Technische Repository-Pfade und URL-Kürzel beibehalten, damit vorhandene Kontofortschritte und Installationen nicht ihre Zuordnung verlieren.


Für alle neuen und bestehenden Module gilt der gemeinsame Aufgabenfokus aus der Projektanleitung, Abschnitt „Aufgabenfokus“: Lernaufgaben stehen im zentrierten Dialog, der Hintergrund wird abgedunkelt und weichgezeichnet, die Rückkehr zur Lektion bleibt bedienbar. Die gemeinsame Umsetzung aus PR #76 ersetzt ältere, modulindividuelle B5-Fokuslösungen.


## Vereinfachter Entwicklungs- und Veröffentlichungsworkflow (04.11.2026)

- Ein Nutzerauftrag wird möglichst in einem zusammenhängenden Änderungsbranch und einem PR bearbeitet. Keine künstliche Aufteilung auf viele PRs.
- Die KI bearbeitet die vereinbarten Schritte einschließlich Tests, Fehlerbehebungen, Integration und Abschlussbericht selbstständig, soweit ihre Werkzeuge und Berechtigungen dies zulassen. Keine wiederholten „Weiter“-Aufforderungen einfordern.
- Standard: PR mit Tests, anschließend automatischer Merge, wenn GitHub dies zulässt und alle erforderlichen Prüfungen erfolgreich sind. Bei Fehlern nicht mergen; Probleme beheben und Tests erneut ausführen.
- Ein Push auf main veröffentlicht erst nach erfolgreichen Hauptseiten-, Moduldesign-, PHP-/Browser- und XP-Regressionstests über den wiederverwendbaren STRATO-Deploy-Workflow. Separate manuelle Veröffentlichung über workflow_dispatch bleibt als Notfallweg verfügbar.
- Bestehende Benutzerkonten, Lernstände, XP, Achievements und Serverdaten dürfen nicht überschrieben oder gelöscht werden. Änderungen müssen rückverfolgbar bleiben.
- Bei sicherheitsrelevanten, destruktiven oder unklaren Eingriffen keine unbeaufsichtigte Veröffentlichung.
- Eine Änderung gilt erst nach erfolgreichem Deployment und einer soweit technisch möglichen Liveprüfung als „live“; andernfalls den tatsächlichen Status melden.
