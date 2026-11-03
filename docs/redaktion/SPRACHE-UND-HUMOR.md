# DAU TO PRO: Redaktionsworkflow für Sprache und Humor

## Ziel und Geltungsbereich

Viel Wissen, verständlich erklärt, mit Willis trockenem, leicht frechem Humor. Gilt für neue **und bereits vorhandene/veröffentlichte Module**. Fachliche Anforderungen bleiben anspruchsvoll; die Sprache stellt keine zusätzliche Hürde auf. Diese Vorgabe ergänzt `../modul-auftraege/README.md`.

Der Workflow wird durch einen Auftrag wie „Redaktionsdurchlauf B5“ oder „Redaktionsdurchlauf aller vorhandenen Module“ gestartet. Er ist ein Arbeitsablauf für den bearbeitenden Menschen oder KI-Assistenten. Er startet keine Hintergrund-KI und benötigt keine neue API. Eine GitHub-Prüfung kann Syntax, Aufgaben und Speicherung prüfen; ob ein Witz verständlich und passend ist, muss zusätzlich inhaltlich beurteilt werden.

## Verbindliche Reihenfolge je Modul

### 1. Bestand aufnehmen

- Aktuellen Repository-Stand und Projektanleitung lesen. Modul aus `lernmodule/manifest.json` auswählen. Eine ältere Download-Datei nicht ungeprüft als aktuellen Stand verwenden.
- Prüfen, welche Version die öffentliche Seite tatsächlich ausliefert, soweit zugänglich. Ein Manifest-Eintrag allein beweist keine Veröffentlichung.
- Alle Textbereiche erfassen: Einstieg, zehn Lektionen, Nachschlagwerk, Labs, Situationen, Fragen, vereinfachte Tooltips, Hinweise, Lösungswege, Feedback, Prüfungsauswertung, Achievement-Texte, Vorschau und Beschreibung.
- Technischen Ausgangsstand sichern: Typ-IDs, Lösungsschlüssel, Zahlen/Formeln, Quellen, Speicherpräfixe, Stufen, Prüfungspläne, Fortschritt und XP-Regeln.
- Modulstatus in `STATUS.md` festhalten. „Geplant“, „teilweise redigiert“, „inhaltlich geprüft“, „technisch geprüft“, „gemergt“ und „live geprüft“ sind verschiedene Zustände.

### 2. Zuerst ohne Witz verständlich erklären

Jeden Abschnitt zuerst sachlich und einfach formulieren:

1. Konkrete Situation: Wer tut was, an welchem Gerät, mit welchen Daten?
2. Fachbegriff ausschreiben und erklären, bevor er benötigt wird.
3. Regel in kurzen Sätzen erklären. Pro Satz möglichst eine Aussage.
4. Ein vollständig gelöstes Beispiel zeigen.
5. Typische Verwechslung klarstellen.

Keine Wörter wie „Datagramm“, „Lease“ oder „autorisieren“ voraussetzen, bevor sie erklärt wurden. Keine künstlich kindliche Sprache. Nicht lediglich einen abstrakten Begriff durch einen anderen ersetzen. Vereinfachung darf keine wichtige Bedingung oder Ausnahme entfernen.

### 3. Humor gezielt hinzufügen

**Erst Erklärung, dann Pointe.** Die Fachinformation muss auch ohne den Witz vollständig und verständlich bleiben. Humor darf in Überschriften, Alltagssituationen, Merksätzen und Rückmeldungen vorkommen. Fragen und Lösungsschritte müssen eindeutig bleiben.

Passend sind kurze, trockene Beobachtungen über typische IT-Situationen: Passwort auf dem Monitor, fehlendes Backup, ungeprüfte Einstellungen, unnötige Meetings, das Kabel, das wieder keiner geprüft hat. Über den gemeinsamen Arbeitsalltag lachen. Niemanden wegen einer falschen Antwort kleinmachen.

Vermeiden:

- Zufällige IT-Begriffe als Pointe: Ein „gültiges Lease im Kopf“ erklärt nichts.
- Vermenschlichte Technik ohne klaren Witz: Der Kabelsalat muss nicht applaudieren.
- Lange Vergleiche, deren Zusammenhang erst erklärt werden muss.
- Mehrere Pointen in einem Satz oder eine Pointe nach jedem Fachsatz.
- Technisch falsche Bilder oder Sprüche, die als Regel missverstanden werden können.
- Wiederholte Standardwitze an jeder Ecke. Keine Mindestzahl an Sprüchen; eine klare Erklärung ohne Witz ist besser als ein schlechter Witz.
- Herablassendes Feedback wie „Selbst ein Hub hätte das gekonnt“. Der Fehler ist das Thema, nicht der Wert des Lernenden.

### 4. Derbe Sprache: ausdrücklich erlaubt, sparsam einsetzen

Ausdrücke wie **„So eine Scheiße“**, **„Was soll der Scheiß?“** oder **„nackt rumlaufen“** sind im passenden Zusammenhang erlaubt. Sie sind kein Pflichtprogramm und kein pauschales Tabu.

- Der Frust richtet sich gegen die Situation oder eine unvernünftige Konfiguration, nicht gegen Lernende oder reale Personen.
- In einem längeren Kapitel höchstens eine deutlich derbe Pointe als redaktionelle Obergrenze, nicht als Ziel. Nicht in aufeinanderfolgenden Rückmeldungen. Im allgemeinen Zufallsfeedback besser keine derben Sprüche: Dort fehlt der situative Zusammenhang, und die Wiederholung ist unkontrollierbar.
- Nicht in der eigentlichen Prüfungsfrage, einer gesetzlichen Definition oder einem notwendigen Rechenschritt. Bei Rechts- und Sicherheitsthemen nie die Ernsthaftigkeit der Folgen weglachen.
- „Nackt“ darf eine harmlose Metapher für fehlenden Schutz sein. Die genaue technische Aussage muss davor stehen. Keine sexualisierte Beschreibung von Personen.
- Keine persönlichen Beschimpfungen, diskriminierenden Witze oder Spott über Krankheit, Herkunft, Behinderung oder Opfer eines Vorfalls.

**Beispiel: Telnet**

> Eine ungeschützte Telnet-Verbindung überträgt auch das Passwort im Klartext. Wer den Verkehr mitlesen kann, kann es sehen. „Was soll der Scheiß?“ ist eine nachvollziehbare Reaktion, aber noch keine Schutzmaßnahme. Für geschützten Fernzugriff verwenden wir korrekt eingerichtetes SSH.

Fachlicher Kern: ungeschütztes Telnet, Klartext, mögliche Mitleser, geschützter Fernzugriff über SSH. Die Pointe ersetzt keinen dieser Punkte.

### 5. Witzprüfung in einem getrennten Durchgang

Jeden Spruch nach dem Schreiben noch einmal ohne Autorenbonus lesen:

| Prüffrage | Bei Nein |
| --- | --- |
| Versteht man den Witz beim ersten Lesen? | Kürzen oder streichen. Nicht den Witz erklären. |
| Passt er genau zur beschriebenen Situation? | Durch eine passende Beobachtung ersetzen oder streichen. |
| Ist die Fachinformation unabhängig davon klar? | Zuerst die Erklärung reparieren. |
| Bleiben Voraussetzungen, Grenzen und richtige Lösung erhalten? | Fassung verwerfen. Fachlichkeit hat Vorrang. |
| Klingt er kurz, trocken und natürlich? | Umständliche Vergleiche und gestapelte Pointen entfernen. |
| Lachen wir über die Situation, ohne den Lernenden abzuwerten? | Umformulieren. |
| Ist er an dieser Stelle noch frisch statt der fünfte gleiche Spruch? | Wiederholung entfernen. |

„Hat IT-Begriffe“ und „enthält ein Schimpfwort“ sind keine Qualitätskriterien. Humor bleibt Geschmackssache. Willis konkrete Rückmeldung entscheidet über strittige Pointen.

### 6. Fachprüfung separat durchführen

Den neuen Text gegen das gesicherte Original und bei Bedarf gegen Primärquellen prüfen. Nicht darauf vertrauen, dass eine lustige Formulierung schon stimmen wird.

- Haben sich Fachbehauptungen, Bedingungen, Ausnahmen, Zahlen, Einheiten oder Rechenwege geändert?
- Stimmen sichtbare Frage, Tooltip, erwartete Antwort und Erklärung noch überein? Ein Tooltip darf keine Lösung verraten oder Voraussetzung nachreichen.
- Sind Aufgabe und Lösung eindeutig? Weiterhin ein Fall, eine Frage und eine gewertete Antwort.
- Können Metaphern eine falsche Regel nahelegen, z. B. TCP verschlüssele oder jede Anwendung über UDP müsse unzuverlässig sein?
- Eine fachlich nötige Korrektur getrennt dokumentieren und fachlich testen. Nicht als bloße Sprachänderung verstecken.

Bei rechtlichen, zeitabhängigen oder unsicheren Aussagen die aktuelle zuständige Primärquelle prüfen. Rein redaktionelle Änderungen müssen nicht unnötig neu recherchiert werden.

### 7. Funktion und Darstellung prüfen

IDs, Lösungsschlüssel, Berechnung, Speicherung, Konto-Sync und Achievements nicht wegen einer Pointe ändern. Browserkonsole und Skriptsyntax prüfen; bei geänderten Aufgabentexten die zugehörigen Generatoren und Referenzantworten testen. Bestehende Modulprüfungen verwenden.

Auf Desktop und 390 px lesen: Passen Überschriften, Feedback und Tooltips? Kein abgeschnittener Text, keine seitliche Überbreite. Neue Textlängen können Darstellung verändern, auch wenn das CSS gleich bleibt.

### 8. Abschluss und Übernahme

- Änderungen und **tatsächlich geprüfte** Textbereiche im Modulprotokoll festhalten. Ein neuer Einstieg ist keine vollständige Überarbeitung eines Moduls.
- Pull Request mit Umfang, Beispiel vorher/nachher, inhaltlicher Prüfung, technischen Ergebnissen und verbleibenden Grenzen erstellen.
- Bestehende Freigaben für Merge/Deployment beachten. Ein Workflow-Dokument erteilt keine neue Veröffentlichungsberechtigung.
- Eine GitHub-Änderung ist nicht automatisch die bereits im Admin installierte Modulversion. Den vorhandenen Installations-/Aktualisierungsweg verwenden. Auf der öffentlichen Modul-URL kontrollieren, welche Fassung ausgeliefert wird, bevor „live“ behauptet wird.
- Downloads mit bestehender Dateiidentität aktualisieren, wenn sie Teil der Lieferung sind.

## Verbindliches Muster: Datei und Telefonat

**Erst sachlich verständlich:**

> Du schickst einer Kollegin eine Datei. Damit sie die Datei öffnen und benutzen kann, müssen alle Daten vollständig ankommen. Fehlt etwas, wird es erneut gesendet. Dafür darf die Übertragung etwas länger dauern.
>
> Bei einem Telefonat über das Internet muss die Sprache rechtzeitig ankommen. Fehlen kurz Daten, hörst du vielleicht einen kleinen Aussetzer. Würde das Gespräch auf jedes fehlende Stück warten, würde die Verzögerung immer größer. Deshalb können verspätete Sprachdaten verworfen werden, statt sie nachträglich abzuspielen.

**Eine mögliche kurze Pointe nach dem Datei-Absatz:**

> Eine halbe Excel-Tabelle ist schließlich keine Teilzeitlösung.

Diese Pointe ist ein Vorschlag, kein Spruch, der in jedem Modul wiederholt werden soll. Kein nachträglich eingespieltes „Hallo“ als Behauptung über reale Telefoniesoftware: Gerade solche verspäteten Daten werden typischerweise verworfen.

## Arbeitsauftrag für den nächsten Durchlauf

> Lies diesen Workflow und die aktuelle Modul-Anleitung. Wähle das beauftragte Modul oder das nächste offene Modul aus STATUS.md. Lies alle dort genannten Textbereiche, vereinfache zuerst die Erklärung und füge dann nur passende, verständliche Pointen hinzu. Derbe Sprache ist sparsam und situationsbezogen erlaubt. Prüfe Humor und Fachlichkeit getrennt, bewahre Aufgabenbewertung und gespeicherten Fortschritt. Teste die tatsächlich betroffenen Funktionen und die Textdarstellung. Dokumentiere den Umfang ehrlich und liefere einen prüfbaren PR. Veröffentliche nur im Rahmen der vorhandenen Autorisierung.



### Willis verbindliche Ergänzung vom 03.11.2026

Bei der sprachlichen Überarbeitung bestehender Module **nur die Inhalte ändern, keine Überschriften**: Seitentitel, Modulname, Kapitel-/Stufentitel, Abschnitts- und Labortitel erhalten. Erklärungen, Fälle, Fragen, Hinweise, Lösungen und Rückmeldungen dürfen redigiert werden. Ausdrücklich beauftragte Darstellungsänderungen wie der Buchstabenabstand werden getrennt dokumentiert.

Die ausgelieferte HTML-Datei nach der unveränderten Hauptüberschrift benennen, bei B5 **`Port 80, bitte kommen.html`**. Technische Repository-Pfade und URL-Kürzel beibehalten, damit vorhandene Kontofortschritte und Installationen nicht ihre Zuordnung verlieren.
