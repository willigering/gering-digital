# D1 Datenschutz – Abnahme und Aufgabentypen

Version v1.8. Einzeldatei: `lernmodule/d1-datenschutz.html`.

67 Aufgabentypen; vier Bereiche; zehn Stufen und Kapitel. Jede Zuordnung wird als einzelner Fall bewertet. Die bestätigte Stufenreihenfolge bleibt erhalten.

## Plattform-Anbindung

- Präfix `d1-dsgvo`; frühere lokale Werte unter `d1-datenschutz-` werden übernommen.
- Testhaken `D1DSGVO_TEST`; `genTask(subId, level)` sowie vorhandene interne Aufrufe.
- Konto-Sync und Rückweg über die vorhandene zentrale Einbindung, keine zweite Anmeldung.
- Zehn registrierte Achievements mit eigenen Pixel-Symbolen (PNG 512, WebP 96/192, editierbare SVG-Quellen).
- Eigenes Vorschau-Motiv `datenschutz`, Desktop 1280 × 720 und Mobil 640 × 360, automatisch der Hauptseitenkarte zugeordnet.
- D1-Prüfungen 10/20/30 Minuten mit 20/40/60 Aufgaben und je 100 Punkten. Andere Module behalten ihre bisherigen Zeiten.
- Prüfungsrückblick mit eigener Eingabe und Lösung; letzte acht Prüfungen. Nur dieser D1-Speichereintrag darf bis 1 MiB statt 256 KiB groß werden. Die Kontogrenze von 5 MiB bleibt bestehen.

## Geprüft

- 67 × 1.000 Generator-Durchläufe; eindeutige IDs, gültige Musterantworten, höchstens ein Drittel reine MC-Typen.
- Erste drei Lernpfad-Aufgaben mit Hinweis; Lektion beim Üben ausgeblendet; Freischaltung nach acht von zehn.
- Alle drei Prüfungsgrößen mit insgesamt 100 Punkten. Ein Fehler kostet nur die Punkte der betreffenden Aufgabe.
- Sichtbare Eingaben und Erklärungen nach Abgabe; automatische Abgabe beim Tabwechsel.
- Echte Anmeldung, Training und Prüfung über die PHP-API gespeichert und in einem leeren Browser-Kontext wiederhergestellt.
- Hauptseitenkarte mit korrektem Bild; alle vier Modulbereiche bei 390 px ohne Überbreite.
- PHP-Integration: zehn Achievement-Regeln einschließlich Wiederholung ohne doppelte XP; 10/20/30-Minuten-Verläufe; größere Rückblicke.
- Zentrale Achievement-, Lernkonto- und Sync-Regressionen.

Die automatischen Prüfungen stehen in `tests/d1_browser.js`, `tests/d1_account_browser.js` und `tests/d1_integration_test.php` und sind in CI eingebunden. Mindestens 24 Aufgaben quer durch die Themen wurden zusätzlich sprachlich und fachlich gelesen.

## Inhaltliche Ergänzungen

Cookies/TDDDG, Videoüberwachung, Beschäftigtendaten, klassische TOM-Kontrollen, Bußgeldstufen mit Rechenweg, Haftung und automatisierte Entscheidungen sind im Nachschlagwerk und Lernpfad ergänzt. Die zugrunde liegenden Aufgaben führen Situation und Frage getrennt. Freitext wird lokal anhand fester Begriffe geprüft; dies ist keine umfassende semantische Bewertung beliebiger Begründungen.

## Installation auf dem Webserver

Nach Übernahme des PR die geänderten Dateien und Assets hochladen. Bestehende Datenbank und Uploads behalten. Im Admin unter HTML-Projekte → mitgelieferte Lernmodule D1 installieren; der bestehende Installationsweg übernimmt HTML, Thema, Titel, Beschreibung und Vorschaubild und veröffentlicht das Modul. Der Repository-Einbau allein ändert keine laufende STRATO-Installation.

## Alle Aufgabentypen

| ID | Name | Stufe | Teilthema |
| --- | --- | --- | --- |
| `b_person` | Personenbezug im Kontext | 1 | Personenbezug erkennen |
| `b_scope` | Anwendungsbereich | 1 | Personenbezug erkennen |
| `b_art9` | Besondere Kategorien | 1 | Personenbezug erkennen |
| `b_process` | Verarbeitung erkennen | 1 | Personenbezug erkennen |
| `b_ziel` | Schutzgegenstand abgrenzen | 1 | Personenbezug erkennen |
| `g_min` | Datenminimierung | 2 | Grundsätze anwenden |
| `g_zweck` | Zweckbindung | 2 | Grundsätze anwenden |
| `g_fehl` | Grundsatzfehler finden | 2 | Grundsätze anwenden |
| `g_felder` | Datenumfang reduzieren | 2 | Grundsätze anwenden |
| `g_pruef` | Zweckprüfung strukturieren | 2 | Grundsätze anwenden |
| `r_basis` | Art.-6-Grundlagen zuordnen | 3 | Rechtsgrundlagen prüfen |
| `r_consent` | Einwilligungsfehler finden | 3 | Rechtsgrundlagen prüfen |
| `r_widerruf` | Widerruf beurteilen | 3 | Rechtsgrundlagen prüfen |
| `r_art9` | Art. 6 und 9 kombinieren | 3 | Rechtsgrundlagen prüfen |
| `r_interesse` | Interessenabwägung aufbauen | 3 | Rechtsgrundlagen prüfen |
| `o_rolle` | Rollen am Fall erkennen | 4 | Verantwortung zuordnen |
| `o_weisung` | Weisungsabweichung bewerten | 4 | Verantwortung zuordnen |
| `o_av` | Auftragsverarbeitung prüfen | 4 | Verantwortung zuordnen |
| `o_dsb` | DSB-Aufgabe abgrenzen | 4 | Verantwortung zuordnen |
| `o_personen` | DSB-Schwelle rechnen | 4 | Verantwortung zuordnen |
| `e_recht` | Betroffenenrechte zuordnen | 5 | Betroffenenrechte bearbeiten |
| `e_monat` | Auskunftsfrist bestimmen | 5 | Betroffenenrechte bearbeiten |
| `e_ausnahme` | Löschbegehren prüfen | 5 | Betroffenenrechte bearbeiten |
| `e_ident` | Identität angemessen prüfen | 5 | Betroffenenrechte bearbeiten |
| `e_ablauf` | Rechteantrag bearbeiten | 5 | Betroffenenrechte bearbeiten |
| `t_ziel` | Schutzziele zuordnen | 6 | Schutzmaßnahmen wählen |
| `t_mass` | Passende TOM benennen | 6 | Schutzmaßnahmen wählen |
| `t_risiko` | Risikoangemessenheit | 6 | Schutzmaßnahmen wählen |
| `t_rechte` | Überflüssige Zugriffe zählen | 6 | Schutzmaßnahmen wählen |
| `t_offboard` | Zugriffsentzug planen | 6 | Schutzmaßnahmen wählen |
| `p_status` | Anonym oder pseudonym | 7 | Identifizierbarkeit bewerten |
| `p_hash` | Hash-Falle bewerten | 7 | Identifizierbarkeit bewerten |
| `p_technik` | Schutzverfahren unterscheiden | 7 | Identifizierbarkeit bewerten |
| `p_gruppe` | Kleine Gruppen erkennen | 7 | Identifizierbarkeit bewerten |
| `p_key` | Zuordnungstabelle schützen | 7 | Identifizierbarkeit bewerten |
| `v_schwelle` | Meldeschwelle unterscheiden | 8 | Datenpannen bearbeiten |
| `v_stunden` | 72-Stunden-Fenster | 8 | Datenpannen bearbeiten |
| `v_verzug` | Verspätung berechnen | 8 | Datenpannen bearbeiten |
| `v_adressat` | Meldewege unterscheiden | 8 | Datenpannen bearbeiten |
| `v_ablauf` | Vorfallbearbeitung strukturieren | 8 | Datenpannen bearbeiten |
| `n_instrument` | Nachweisinstrument wählen | 9 | Nachweise planen |
| `n_design` | Design oder Default | 9 | Nachweise planen |
| `n_klein` | 250er-Ausnahme richtig lesen | 9 | Nachweise planen |
| `n_luecke` | Dokumentationslücken zählen | 9 | Nachweise planen |
| `n_dsfa` | DSFA-Ablauf verstehen | 9 | Nachweise planen |
| `a_lifecycle` | Daten am Lebensende behandeln | 10 | Lebenszyklus steuern |
| `a_mail` | Empfängerfehler vermeiden | 10 | Lebenszyklus steuern |
| `a_dritt` | Drittlandtransfer prüfen | 10 | Lebenszyklus steuern |
| `a_kopien` | Löschumfang erfassen | 10 | Lebenszyklus steuern |
| `a_start` | Datenschutzgerechten Start planen | 10 | Lebenszyklus steuern |
| `a_cookie` | Cookie-Zweck prüfen | 10 | Lebenszyklus steuern |
| `a_video` | Videoüberwachung begrenzen | 10 | Lebenszyklus steuern |
| `a_arbeit` | Beschäftigtendaten beurteilen | 10 | Lebenszyklus steuern |
| `a_haftung` | Bußgeld und Schadensersatz trennen | 10 | Lebenszyklus steuern |
| `a_buss4` | Bußgeldobergrenze 4 % | 10 | Lebenszyklus steuern |
| `a_buss2` | Bußgeldobergrenze 2 % | 10 | Lebenszyklus steuern |
| `t_kontrolle` | Klassische TOM-Kontrolle | 6 | Schutzmaßnahmen wählen |
| `bezug_fall` | Fälle anwenden: Personenbezug erkennen | 1 | Personenbezug erkennen |
| `grund_fall` | Fälle anwenden: Grundsätze anwenden | 2 | Grundsätze anwenden |
| `recht_fall` | Fälle anwenden: Rechtsgrundlagen prüfen | 3 | Rechtsgrundlagen prüfen |
| `rollen_fall` | Fälle anwenden: Verantwortung zuordnen | 4 | Verantwortung zuordnen |
| `rechte_fall` | Fälle anwenden: Betroffenenrechte bearbeiten | 5 | Betroffenenrechte bearbeiten |
| `tom_fall` | Fälle anwenden: Schutzmaßnahmen wählen | 6 | Schutzmaßnahmen wählen |
| `pseudo_fall` | Fälle anwenden: Identifizierbarkeit bewerten | 7 | Identifizierbarkeit bewerten |
| `panne_fall` | Fälle anwenden: Datenpannen bearbeiten | 8 | Datenpannen bearbeiten |
| `orga_fall` | Fälle anwenden: Nachweise planen | 9 | Nachweise planen |
| `praxis_fall` | Fälle anwenden: Lebenszyklus steuern | 10 | Lebenszyklus steuern |
