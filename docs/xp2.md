# XP 2.0 — Balanceversion 2

## Verbindliche Planung und Referenz

`xp-config.json` ist der feste, versionierte Snapshot. Quelle: die vier ursprünglichen Module A1/B1/B2/B3 plus die **36** Zeilen in `docs/modul-auftraege/README.md`, insgesamt **40**. Die neun bereits registrierten Achievement-Kataloge bleiben unverändert. Die übrigen Module haben bereits generische XP-Unterstützung über ihre geplanten Präfixe, aber keine vorgetäuschten fertigen Achievements. Diese werden beim Modulbau wie bisher registriert.

Ein Modul ist ein Generator mit unbegrenzt vielen Varianten. Ein mathematisches Maximum für beliebig langes „erstes“ Üben existiert deshalb nicht. Für den ersten Erwerbsdurchlauf gilt die **konservative obere Referenzhülle** von bis zu 1.000 richtigen Aufgaben pro Modul (mehr als die 100 Lernpfad-Antworten, 450 Antworten für 45 Typen à zehn und 120 Prüfungsantworten der Standardvorlage zusammen). Lernpfad-/Prüfungsantworten sind darin bereits enthalten und werden nicht nochmals als Aufgaben addiert. Nach 1.000 Antworten sind weitere Aufgaben ausdrücklich Wiederholungslernen. Kalender- und wiederholbare Übungsbelohnungen sind kein einmaliges Katalogpotenzial.

| Quelle | Erster Erwerbsdurchlauf |
| --- | ---: |
| Aufgaben: 40 × 1.000 × 2 | 80.000 XP |
| Lernpfade: 40 × 10 × 75 | 30.000 XP |
| Prüfungsbestwerte: 39 × 1.200 + D1 400 | 47.200 XP |
| Modul-Achievements: 40 × 590 (inkl. noch geplanter) | 23.600 XP |
| Alle einmaligen globalen Achievements, konservativ vollständig | 2.250 XP |
| **Referenz** | **183.050 XP** |
| **Level 50 / PRO = 2 × Referenz** | **366.100 XP** |

Die Prüfungsformel bleibt 200 XP pro 30 Minuten bei 100 %. Gezählt wird nur der beste Prozentwert je zulässiger Länge. D1 hat 10/20/30 Minuten. Noch nicht fertig ausgestaltete Prüfungssimulationen sind mit der Standardhülle budgetiert: Werden beim Modulbau weitere Längen benötigt, muss die Balanceprüfung vor einer neuen Version diese ausdrücklich berücksichtigen. Neue Präfixe/Kataloge verändern die Levelgrenzen niemals automatisch.

Kurve: `round(366100 × (L−1) × L / (49 × 50))`. Der erste vollständige Referenzdurchlauf führt etwa zu Level 35, nicht zu PRO. Die nachfolgende Tabelle ist verbindlich für Version 2.

| Level | Gesamt-XP |
| ---: | ---: |
| 1 | 0 |
| 2 | 299 |
| 3 | 897 |
| 4 | 1.793 |
| 5 | 2.989 |
| 6 | 4.483 |
| 7 | 6.276 |
| 8 | 8.368 |
| 9 | 10.759 |
| 10 | 13.449 |
| 11 | 16.437 |
| 12 | 19.725 |
| 13 | 23.311 |
| 14 | 27.196 |
| 15 | 31.380 |
| 16 | 35.863 |
| 17 | 40.645 |
| 18 | 45.725 |
| 19 | 51.105 |
| 20 | 56.783 |
| 21 | 62.760 |
| 22 | 69.036 |
| 23 | 75.611 |
| 24 | 82.485 |
| 25 | 89.657 |
| 26 | 97.129 |
| 27 | 104.899 |
| 28 | 112.968 |
| 29 | 121.336 |
| 30 | 130.003 |
| 31 | 138.969 |
| 32 | 148.233 |
| 33 | 157.797 |
| 34 | 167.659 |
| 35 | 177.820 |
| 36 | 188.280 |
| 37 | 199.039 |
| 38 | 210.097 |
| 39 | 221.453 |
| 40 | 233.109 |
| 41 | 245.063 |
| 42 | 257.316 |
| 43 | 269.868 |
| 44 | 282.719 |
| 45 | 295.869 |
| 46 | 309.317 |
| 47 | 323.065 |
| 48 | 337.111 |
| 49 | 351.456 |
| 50 | 366.100 |

## Wiederholung und Tagesziele

Die bisherigen 2 XP für die ersten 1.000 richtigen Antworten pro Modul bleiben erhalten. Danach weiterhin 2 XP je neu gezählter richtiger Antwort, höchstens **50 pro Modul und Berliner Kalendertag**, insgesamt **100 pro Konto/Tag**. Der Server öffnet ein Anfangsbudget von fünf Antworten und danach einen Platz alle acht Sekunden. Nicht vergütete Überschüsse werden nicht beim nächsten Reload nachträglich ausgezahlt. Übermittelte Zähler müssen den bisherigen Höchststand übersteigen; alte Daten, Löschungen, zweite Tabs und identische Synchronisationen zählen nicht neu. Das begrenzt auch triviale Dauerwiederholungen auf maximal 100 XP pro Modul/Tag. Unbegrenztes Weiterlernen bleibt über erneuerte Tagesbudgets möglich.

Tagesziel: fünf zusätzlich gezählte richtige Antworten (auch Wiederholungsaufgaben) oder eine neu gemeisterte Stufe. +10 XP Tagesziel, +5 XP pro aktivem Serientag, +40 XP bei jedem vollen 7er-Meilenstein, +150 XP bei jedem vollen 30er-Meilenstein. An gemeinsamen Meilensteinen addieren sich beide Boni. Ein ausgelassener Tag beendet die aktive Serie, der Rekord bleibt. Zeitzone Europe/Berlin mit echten Kalendertagen; Sommer-/Winterzeit wird nicht über 86.400-Sekunden-Abstände angenähert.

Ausgehend von der Referenz fehlen 183.050 XP. 100 tägliche Wiederholungsantworten über mindestens zwei Module plus Tages-/Serienboni bringen langfristig ca. 226 XP/Tag: rund 811 weitere aktive Tage, ohne zusätzliche neue Inhalte. Schon tägliche Ziele allein bleiben unbegrenzt vergütbar. Level 50 ist damit kein endlicher, unerreichbarer Zählerdeckel.

## Umstellung und Datenintegrität

Neue Tabellen werden automatisch additiv erstellt. Beim ersten Auswerten eines Kontos bucht eine atomare Migration die vorhandenen XP **genau einmal** nach tatsächlichen Bestwerten und vorhandenen Achievements ins Journal. Nicht rekonstruierbare Restbeträge stehen transparent als „Übernommene bisherige XP“; keine erfundenen Quelldaten oder historischen Ereigniszeitpunkte. Die Buchung trägt den Übernahmezeitpunkt, ursprüngliche Achievement-Daten bleiben erhalten. Historische Daten erzeugen keine Tages-/Serien-/Wiederholungsboni. XP bleiben erhalten, Level werden nach der neuen Kurve berechnet; es gibt keinen Level-up durch die reine Umstellung. Frühere Level werden nicht eingefroren.

`BEGIN IMMEDIATE` serialisiert Auswertung, Freischaltung, Journal und Bestwerte auch über unabhängige Sitzungen. Freischaltungen besitzen weiterhin den eindeutigen Schlüssel (Konto, Code), das Journal zusätzlich (Konto, Ereignis). Nur der erfolgreiche neue Insert liefert ein Popup-Ereignis. Ein zweiter Browser oder ein erneut abgespieltes Video erhält kein altes Ereignis. Es gibt keine clientseitigen XP-Beträge. Ein verlorener HTTP-Response wird nicht nochmals als neue Freischaltung ausgespielt; die Errungenschaft ist zuverlässig in „Kürzlich freigeschaltet“ sichtbar.

Grenze der bestehenden Architektur: Die Lernmodule bewerten Antworten lokal und synchronisieren Fortschrittszähler. Das System verhindert Replay und begrenzt Wiederholungsfarming; es ist keine serverseitige Prüfung jeder einzelnen Antwort gegen signierte Aufgaben. Vollständiger Schutz gegen absichtlich gefälschte Lernstände würde eine gesonderte Umstellung der Lernmodule auf serverseitige Aufgabenbewertung benötigen.

„Alles auf null“ bleibt eine ausdrückliche, passwortgeschützte Neuanfangsfunktion und löscht auch Journal, Streaks und Vitrine. Eine normale Löschung von Modulfortschritt löscht keine XP oder Achievements. Kontolöschung entfernt die neuen Tabellen über Fremdschlüssel.

Vitrine: drei unabhängig leere Slots, Reihenfolge über Platzwahl, nur eigene freigeschaltete Codes, keine Duplikate; POST mit bestehendem CSRF-Schutz. Profile: angemeldete Betrachter, erneute Sichtbarkeits- und Admin-Sperrprüfung bei jeder GET-Anfrage, nur erlaubte öffentliche Felder. Geheimbedingungen werden bei gesperrten Erfolgen maskiert. Kein fremdes Bearbeitungs-API.

## Wartung und Tests

`php tools/xp-balance.php` reproduziert die Referenz ohne Datenbankzugriff. Neue Module tragen Katalog/Präfix wie bisher zentral ein; Aufgaben, Pfade, Prüfungsbestwerte, Tagesziele und Wiederholung brauchen keine eigene XP-Implementierung. Geplante Präfixe sind schon hinterlegt. Änderungen am eingefrorenen Plan erfordern eine bewusst versionierte Balanceänderung mit erneutem Referenztest, niemals automatische Neuberechnung pro Seitenaufruf.

Regression: `php tests/xp2_test.php`, `php tests/achievements_test.php`, `php tests/learner_lib_test.php`, `php tests/learner_http_test.php`, `node tests/learner_sync.js`, `node tests/xp2_browser.cjs`. Der neue GitHub-Workflow führt diese Checks ebenfalls aus. Die Browserprüfung verwendet 1440, 390 und 320 px, echte Anmeldung/Formulare, drei Grafikslots, Tooltips, Sortierung, Modal, Fokus/Escape, Privatsphäre und Überlauf. Sämtliche Tests verwenden temporäre Datenbanken.
