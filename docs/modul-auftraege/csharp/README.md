# C# für FISI

Erster Entwicklungsstand für ein eigenständiges DAU-TO-PRO-Modul. Die erste Lektion ist für den Lernpfad geschrieben. Zum Üben genügt ein Browser.

## Stufe 1 · Das erste Support-Ticket

### Erklären

Du schreibst ein kleines Programm für den IT-Support. Es fragt nach einer Ticketnummer und bestätigt, welche Nummer es erfasst hat. So fällt ein Zahlendreher auf, bevor sich jemand um den falschen Drucker kümmert.

- `Console.WriteLine(...)` zeigt etwas in der Konsole an und beginnt danach eine neue Zeile.
- `Console.ReadLine()` liest eine Zeile ein. Im Terminal schickst du sie mit Enter ab.
- `string? ticket` speichert den eingelesenen Text unter dem Namen `ticket`. Das Fragezeichen lässt auch `null` zu. Den Wert liefert `ReadLine()`, wenn der Eingabestrom endet und keine weitere Zeile da ist. In dieser Aufgabe bekommt das Programm immer eine nicht leere Zeile.

Eine Ticketnummer wie `0042` bleibt Text. Die führenden Nullen gehören zur Nummer. Wir wollen das Ticket finden und damit keine Mathearbeit schreiben.

### Vormachen

```csharp
using System;

Console.WriteLine("Gerätename?");
string? geraet = Console.ReadLine();
Console.WriteLine($"Gerät {geraet} gefunden.");
```

Gibst du `PC-07` ein, erscheint anschließend `Gerät PC-07 gefunden.`. Das Dollarzeichen vor den Anführungszeichen erlaubt Platzhalter. Beim Ausgeben setzt C# für `{geraet}` den eingelesenen Text ein.

### Mit Hinweis üben

Öffne den [Ticket-Simulator](simulator.html). Die Frage nach der Ticketnummer und das Einlesen sind schon eingebaut. Ergänze die Ausgabe so, dass bei der Eingabe `0042` als zweite Ausgabezeile exakt `Ticket 0042 erfasst.` erscheint. Bei anderen Ticketnummern soll dieselbe Zeile mit der jeweiligen Nummer erscheinen.

**Hinweis**

Schau im Beispiel mit dem Gerätenamen nach, wie der gespeicherte Text in der Ausgabe landet. Im Startcode heißt die Variable `ticket`.

Prüfe deine Zeile im Simulator und probiere anschließend die Ticketnummer `SRV-17` aus.

### Allein lösen

Ein Inventurprogramm fragt `Inventarnummer?`, liest eine Zeile und bestätigt sie. Schreibe das Programm von Grund auf. Bei der Eingabe `INV-007` lautet die zweite Ausgabezeile `Inventar INV-007 erfasst.`. Prüfe deinen Code zusätzlich mit `NB-310`.

## Lernpfad für den Ausbau

| Stufe | Fähigkeit | Praxisfall |
| --- | --- | --- |
| 1 | Konsolenein- und -ausgabe | Ticket bestätigen |
| 2 | Datentypen passend wählen | Inventarnummer und Stückzahl getrennt speichern |
| 3 | Mit Zahlen rechnen | Speicherbedarf eines Backups berechnen |
| 4 | Mit `if` und `else` entscheiden | Freien Plattenplatz bewerten |
| 5 | Eingaben mit `TryParse` prüfen | Stückzahl aus einer Benutzereingabe übernehmen |
| 6 | Mit Schleifen wiederholen | Mehrere Messwerte einlesen |
| 7 | Arrays und Listen verarbeiten | Fehlgeschlagene Prüfungen zählen |
| 8 | Methoden schreiben | Dieselbe Speicherprüfung für mehrere Geräte nutzen |
| 9 | Klassen und Objekte einsetzen | Ein Support-Ticket modellieren |
| 10 | Programm testen und Fehler eingrenzen | Ticketwerkzeug mit Grenzfällen prüfen |

## Aufgabensimulator

Der [erste Simulator](simulator.html) öffnet sich als lokale HTML-Datei. Er stellt ausschließlich den Ablauf dieser Ticketaufgabe nach. Das Eingabefeld nimmt die fehlende C#-Zeile entgegen und vergleicht sie mit der in der Aufgabe geübten Schreibweise. Die Ausgabe wird aus der Ticketnummer erzeugt. Der Simulator kompiliert und interpretiert keinen eingegebenen C#-Code. Er benötigt weder Netzwerkzugriff noch ein Backend.

Weitere Aufgaben erhalten eigene Eingabefelder, erwartete Antworten und Rückmeldungen. Der Simulator kennzeichnet die geübte Schreibweise ausdrücklich, weil C# dieselbe Ausgabe auch auf anderen Wegen erzeugen kann. Für den Ausbau folgen zusätzliche Aufgabentypen und die Anbindung an Lernpfad, Fortschritt, XP und Achievements.

[Microsoft Learn · Eine .NET-Konsolenanwendung erstellen](https://learn.microsoft.com/de-de/dotnet/core/tutorials/create-console-app)
