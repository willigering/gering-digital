# CS1 – Der Compiler hat immer recht · Abnahme v1.0

Willis Entscheidung vom 06.11.2026: Der C#-Simulator aus dem Auftrag entfällt. Das Modul führt keinen Nutzercode aus. Stattdessen: Ausgabe vorhersagen, Code ergänzen und reparieren, Zeilen sortieren, Fehler finden, Abläufe in Zeitlupe und eigene Programme lokal mit dem .NET SDK.

## Geprüft

- `tests/cs_verify.cjs`: alle Codeblöcke der Lektionen, alle Abläufe und Stichproben aller Aufgabentypen mit dem echten C#-Compiler und .NET 8. Ausgaben, Musterlösungen, behauptete Compilerfehler und Ausnahmen stimmen.
- `tests/cs_browser.cjs`: Sperre, Hinweise, 8 von 10, Rückweg aus dem Nachschlagwerk mit erhaltener Eingabe, Zuordnen, Prüfung, Tabwechsel, Speicherpräfix, Breiten 1280/768/390/360.
- `tests/cs_platform.cjs`: Konto-Sync, zehn Achievements ohne Doppelvergabe, Modulkarte.
- Gemeinsame Modultests für Fehlersprüche, Aufgabenfokus, Einstieg, Handy und Design.

## Bewusste Grenzen

- Eigener Code wird nicht automatisch bewertet. Stufe 10 und „Auf deinem Rechner ausprobieren“ arbeiten mit Musterlösung und Selbstkontrolle.
- Code-Aufgaben vergleichen gegen eine Liste korrekter Schreibweisen. Eine ungewöhnliche, aber richtige Lösung kann als falsch gelten.
- Die zehn Achievement-Symbole sind vorläufig aus vorhandenen Symbolen kopiert.
- Willis Humor-Abnahme steht aus. Live-Prüfung steht aus.
