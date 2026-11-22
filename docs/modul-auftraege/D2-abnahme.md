# D2 – IT-Sicherheit & Schutzbedarf

**Titel:** Passwort123 ist kein Konzept · **Version:** v1.0  
**Datei:** `lernmodule/d2-it-sicherheit.html` · **Präfix:** `d2-sec`  
**Motiv:** `d2-it-sicherheit` · **Akzent:** `#ff6b6b` · **Hintergrund:** `circuit-sockets`

## Umfang

Zehn Lernstufen und zehn zugehörige Kapitel mit je einer interaktiven Simulation, Beispiel, Lösung und Fallen-Spickzettel. 51 Aufgabentypen: zehn reine Multiple-Choice-Typen, neun numerische Typen und 32 Fachbegriffs-/Falltypen mit deterministischer Synonymerkennung. Fallpools sind endlich; Zufallswerte variieren Rechenaufgaben. Keine KI-Bewertung freier Begründungstexte.

Genau eine bewertete Antwort pro Aufgabe. Auch beim Zuordnen wird jede Zeile einzeln geprüft. Ausgangslage und Frage stehen getrennt. Im Lernpfad zählen die ersten drei angeleiteten Antworten zur Statistik, aber nicht zur Freischaltung. Erst bei zehn selbstständigen Antworten und mindestens acht richtigen ist die nächste Stufe offen.

Prüfungen: 30/60/90 Minuten mit 20/40/60 Aufgaben. Je zehn Themenpunkte, insgesamt immer exakt 100. Aufgabenpunkte und Themenpunkte sind getrennt beschriftet. Eigene Eingabe, Musterantwort und Begründung stehen im Rückblick. Tabwechsel oder Verlassen gibt ab.

## Plattform-Einbau

- Registrierung im Modulmanifest; nach Bereitstellung im bestehenden Admin als Entwurf übernehmen und ausdrücklich veröffentlichen.
- Eigene Vorschau in 1280×720 und 640×360, Motivmanifest und reproduzierbare SVG-Erzeugung im vorhandenen System.
- Bestehende `learner_inject_sync()`-Architektur übernimmt Konto, Speicherung, Rückweg und Achievement-Popups; keine zweite Anmeldung oder Synchronisierung.
- Zehn zentrale Achievements: zwei Bronze, zwei Silber, zwei Gold, ein Platin und drei witzige. Vorhandene XP- und Vergaberegeln bleiben erhalten.
- D1 und sein Fortschritt werden nicht verändert. Diese Änderung veröffentlicht kein Modul automatisch und ersetzt keine Produktionsdaten.

## Abnahme und Ergebnisse

- 51.000 Generatoraufrufe: je Typ 1.000; Aufgaben vollständig, Musterantworten und Synonyme akzeptiert, falsche Antworten zurückgewiesen.
- 20 Antworten im freien Training über die Browseroberfläche mit korrekter Bewertung und Begründung.
- Drei angeleitete und zehn selbstständige Lernpfadantworten; keine verfrühte Freischaltung, Statistik und Neuladen geprüft.
- 30/60/90-Minuten-Prüfungen mit 20/40/60 Aufgaben und 100 Punkten; vollständige richtige Antworten ergeben jeweils Note 1. Tabwechsel wird als „Seite verlassen“ gespeichert.
- Sprintende beim Tabwechsel und Einzelwertung beim Zuordnen geprüft.
- Offline-HTML ohne Konsolenfehler, alle vier Bereiche bei 390 px ohne seitliches Scrollen. Zehn Labore vorhanden und im Prüfungs-/Sprintmodus gesperrt.
- 38 gezielte PHP-Integrationsprüfungen; alle zehn Achievement-Regeln erreichbar, Untergrenzen und doppelte Vergabe geprüft.
- Bestehende Achievement-Suite: 219 Prüfungen bestanden. Bestehende Sync-Suite: alle Prüfungen bestanden.
- Lokaler Plattformtest mit echtem zentralem API-POST und Wiederherstellung in zweitem Browserkontext; Kontoanzeige und Rückweg vorhanden.
- Tatsächlich vom zentralen Renderer erzeugte Modulkarte mit geladenem Bild, Link und `srcset` bei 1365 und 390 px geprüft.
- Erste Lektion und alle Fallpools redaktionell gelesen; Rechenannahmen ausdrücklich genannt. Klassische BSI-200-x-Methodik, keine Aussage zum aktuellen Umstellungsstand anderer Grundschutz-Verfahren.

Tests: `node tests/d2_browser.js` (Playwright/Chromium; optional `CHROMIUM_PATH`) und `php tests/d2_integration_test.php`. PHP benötigt PDO SQLite und mbstring. Die Integrationstests nutzen eine temporäre Datenbank; Browserartefakte landen standardmäßig im temporären Ordner.

## Feste Aufgabentyp-IDs

| ID | Name | Teilthema | Stufe |
| --- | --- | --- | --- |
| `c_goal` | Schutzziel zum Vorfall | Schutzziele | 1 |
| `c_measure` | Schutzziel einer Maßnahme | Schutzziele | 1 |
| `c_auth` | Authentizität erkennen | Schutzziele | 1 |
| `c_account` | Minimalprinzip anwenden | Schutzziele | 1 |
| `c_nonrep` | Zusätzliche Schutzziele | Schutzziele | 1 |
| `r_term` | Bedrohung und Schwachstelle | Risiken | 2 |
| `r_score` | Risikowert berechnen | Risiken | 2 |
| `r_expect` | Erwarteten Jahresschaden berechnen | Risiken | 2 |
| `r_treat` | Risikobehandlung zuordnen | Risiken | 2 |
| `r_residual` | Restrisiko bewerten | Risiken | 2 |
| `b_standard` | BSI-Standard zuordnen | IT-Grundschutz | 3 |
| `b_step` | Arbeitsschritt erkennen | IT-Grundschutz | 3 |
| `b_scope` | Begriffe des Grundschutzes | IT-Grundschutz | 3 |
| `b_check` | Grundschutz richtig einordnen | IT-Grundschutz | 3 |
| `b_gap` | Anforderungsstatus zuordnen | IT-Grundschutz | 3 |
| `s_max` | Maximumprinzip anwenden | Schutzbedarf | 4 |
| `s_cumul` | Kumulation und Verteilung | Schutzbedarf | 4 |
| `s_category` | Schadensfolge einstufen | Schutzbedarf | 4 |
| `s_dim` | Schutzziele getrennt vererben | Schutzbedarf | 4 |
| `s_inherit` | Schutzbedarf begründen | Schutzbedarf | 4 |
| `m_type` | Schadsoftware am Verhalten erkennen | Schadsoftware | 5 |
| `m_spread` | Verbreitung und Steuerung | Schadsoftware | 5 |
| `m_action` | Erste Reaktion bei Malware | Schadsoftware | 5 |
| `m_worm` | Schutz in mehreren Schichten | Schadsoftware | 5 |
| `m_park` | USB-Stick vom Parkplatz | Schadsoftware | 5 |
| `a_attack` | Angriffsart am Fall erkennen | Angriffe | 6 |
| `a_detect` | Angriffsmuster unterscheiden | Angriffe | 6 |
| `a_brute` | Online-Versuche berechnen | Angriffe | 6 |
| `a_ddos` | DoS und DDoS unterscheiden | Angriffe | 6 |
| `a_prevent` | Passende Schutzmaßnahme nennen | Angriffe | 6 |
| `e_channel` | Phishing-Kanal benennen | Social Engineering | 7 |
| `e_trigger` | Psychologischen Hebel erkennen | Social Engineering | 7 |
| `e_action` | Sichere Reaktion auf Täuschung | Social Engineering | 7 |
| `e_prince` | Der Prinz aus Nigeria | Social Engineering | 7 |
| `e_verify` | Auftrag unabhängig prüfen | Social Engineering | 7 |
| `p_entropy` | Modell-Entropie berechnen | Passwort & MFA | 8 |
| `p_space` | Zufallsraum berechnen | Passwort & MFA | 8 |
| `p_time` | Ratezeit im Modell berechnen | Passwort & MFA | 8 |
| `p_factor` | Authentisierungsfaktor zuordnen | Passwort & MFA | 8 |
| `p_123` | Passwort123 ist kein Konzept | Passwort & MFA | 8 |
| `p_mfa` | Unabhängige Faktoren wählen | Passwort & MFA | 8 |
| `n_control` | Firewall, IDS und IPS | Netzschutz | 9 |
| `n_firewall` | Firewall-Grundregel zuordnen | Netzschutz | 9 |
| `n_rules` | Erste passende Firewall-Regel | Netzschutz | 9 |
| `n_dmz` | DMZ und Segmentierung | Netzschutz | 9 |
| `n_ids` | Grenzen des Netzschutzes | Netzschutz | 9 |
| `f_rto` | RTO-Frist berechnen | Notfallmanagement | 10 |
| `f_rpo` | RPO als Datenverlust-Zeitspanne | Notfallmanagement | 10 |
| `f_order` | Schritt im Notfallplan | Notfallmanagement | 10 |
| `f_plan` | Notfallbegriffe zuordnen | Notfallmanagement | 10 |
| `f_restore` | Wiederherstellung und Menschen | Notfallmanagement | 10 |

## Achievements

| Code | Rang | Name | Bedingung |
| --- | --- | --- | --- |
| `d2.cia` | Bronze | CIA ohne Geheimdienst | Stufe 1 gemeistert |
| `d2.risiko` | Bronze | Bauchgefühl mit Taschenrechner | `r_score` 10 × richtig in Folge |
| `d2.maximum` | Silber | Maximum statt Mittelmaß | Stufe 4 gemeistert |
| `d2.faktoren` | Silber | Doppelt hält verschieden | `p_factor` 10 × richtig in Folge |
| `d2.entropie` | Gold | Zufall mit System | `p_entropy`, `p_space` je 10 × richtig in Folge |
| `d2.lernpfad` | Gold | Konzept statt Hoffnung | Alle zehn Stufen gemeistert |
| `d2.marathon` | Platin | 90 Minuten ohne Datenpanne | 90 Minuten, mindestens 81 % |
| `d2.passwort123` | Witzig | Sonderzeichen retten alles? | `p_123` 3 × falsch in Folge |
| `d2.prinz` | Witzig | Erbe mit Bearbeitungsgebühr | `e_prince` 3 × falsch in Folge |
| `d2.usb` | Witzig | Parkplatz-Premiumstick | `m_park` 3 × falsch in Folge |

Die drei Rätseltexte sind im zentralen Katalog hinterlegt. Achievement-XP insgesamt: 590 nach vorhandener Staffelung. Regeln zur wiederholten Auswertung bleiben idempotent.
