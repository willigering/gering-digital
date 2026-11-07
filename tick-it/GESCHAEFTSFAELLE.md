# Tick-It: 900 realistische IT-Support-Anfragen

## Umfang

Die Vorlagenbibliothek enthält **60 typische IT-Probleme**, jeweils **15 eigenständige Nachrichtenformulierungen**: insgesamt **900 eindeutige Texte**. Die Sprache variiert zwischen **Umgangssprache (240)**, **offiziell (240)**, **höflich (240)** und **verärgert (180)**. Jede Anfrage enthält ein Symptom, eine Auswirkung und meistens einen bisherigen Versuch oder eine konkrete Beobachtung. Vorlagen enthalten bewusst **keine Namen, E-Mail-Adressen oder Kennwörter**. Für jedes Thema ist eine nur für den Dozenten sichtbare Prüf- bzw. Lösungsskizze enthalten.

**Kategorien:** Benutzerkonten/MFA, Netzwerk/WLAN/DNS/VPN, E-Mail und Kalender, Software/Lizenzen, Drucker, Hardware, Berechtigungen sowie Windows/Betriebssystem.

## Herkunft und Abgrenzung

Die Problemklassen wurden anhand öffentlich dokumentierter ITSM-Fallarten und Helpdesk-Auswertungen ausgewählt. Die Nachrichtentexte und Namen sind **fiktiv und neu erstellt**, keine Abschriften realer Kundenanfragen. Die Kategoriegewichtung ist eine didaktische Annäherung, **keine behauptete exakte Verteilung für jedes Unternehmen**.

- Atlassian, ITSM-Arbeitskategorien (Incidents, Service Requests): https://support.atlassian.com/jira-service-management-cloud/docs/what-are-ticket-categories/
- ControlUp, Analyse von >1 Mio. Helpdesk-Tickets, 21.10.2026: https://www.controlup.com/press/controlup-research-sign-in-issues-account-for-up-to-53-of-help-desk-tickets/
- Fixify, 2026 Help Desk Benchmark Report: https://www.fixify.com/it-help-desk-benchmark-report-2026
- InvGate, typische Helpdesk-Tickets: https://blog.invgate.com/common-help-desk-tickets
- STRATO, Cronjobs einrichten (Paketabhängigkeit): https://www.strato.de/faq/hosting/so-einfach-richten-sie-ihre-cron-jobs-ein/

## So funktioniert der Generator

1. Als **Dozent** anmelden und **Schulungsfälle** öffnen. Nur dieser Benutzer darf Läufe erzeugen oder die Regler verändern.
2. **Sofort zum Start:** 0–100 Tickets (Voreinstellung **100**). Diese erscheinen direkt im allgemeinen Ticketpool und können atomar von Supportern übernommen werden.
3. **Tickets pro Welle:** 1–30 (Voreinstellung 5). **Abstand:** 1–60 Minuten (Voreinstellung 5). **Gesamtlimit:** 100–5000 Tickets pro Lauf.
4. **Pausieren, fortsetzen, stoppen**. Stoppen entfernt keine bereits veröffentlichten Übungsfälle. Ein neuer Lauf beginnt mit neuer Laufnummer.
5. Die Textauswahl sperrt nach Möglichkeit die **600 zuletzt ausgegebenen Formulierungen** und vermeidet gleiche Probleme in sieben direkt aufeinanderfolgenden Ausgaben. Falls alle 900 bereits verwendet wurden, werden zuerst besonders lange nicht genutzte Vorlagen wieder freigegeben.
6. Der Name des Kunden wird **erst bei der Veröffentlichung, unabhängig vom Falltext**, zufällig aus zwei Namenspools gezogen (>16.000 Kombinationen). Auch die letzten 250 Absendernamen werden nach Möglichkeit nicht erneut verwendet. Die Namen sind nicht als echte Identitäten verifiziert; zu synthetischen Kunden existieren keine Anmeldesitzungen.
7. Die Übungstickets sind gekennzeichnet und besitzen eine nur für den Dozenten sichtbare Musterlösung. **Automatische Rückantworten** der simulierten Kunden sind **nicht** Teil dieser Funktion.

## Zeitsteuerung auf STRATO

### Variante A – Ohne Cronjob (sofort nutzbar)

Aktive Nutzer rufen `api.php` regelmäßig auf. Sobald ein Intervall abgelaufen ist, stellt Tick-It **einmalig die nächste Welle** zu. Die Auslieferung wird in MySQL atomar gesperrt: auch bei 50 gleichzeitigen Anfragen wird die Welle nicht doppelt erzeugt. Ist die Website zwischenzeitlich unbesucht, wird die nächste Welle **erst beim folgenden Website-Aufruf** erzeugt. Verpasste Zeitfenster werden nicht als plötzliche Flut nachgeholt.

### Variante B – Mit STRATO-Cronjob (empfohlen)

Falls dein STRATO-Paket Cronjobs unterstützt, richte im STRATO-Kundenbereich einen Cronjob **jede Minute** ein, der `tick-it/bin/generator-cron.php` als **CLI-PHP** startet (üblicherweise `php -f /absoluter/webspace/pfad/tick-it/bin/generator-cron.php`). Den tatsächlichen absoluten Pfad und das PHP-Kommando zeigt dein Paket bzw. deine Hosting-Verwaltung an. **Keine Passwörter oder Tokens im Cron-Kommando** hinterlegen. Skript und Datenbankkonfiguration liegen serverseitig. Die Anfragewellen werden in der eingestellten Frequenz ausgeliefert; die nächste Welle ist frühestens nach einer Minute möglich.

## Bestehende Installation

Die Erweiterung legt die drei neuen, namensräumlich abgegrenzten Tabellen `generator_control`, `generator_usage`, `generator_issued` **idempotent** erst beim ersten Aufruf der Dozentenansicht an. Es wird **keine bestehende Ticket-Tabelle geändert oder gelöscht**. Die bestehenden `tickets`, `guests`, `ticket_messages`, `ticket_history` werden weiterverwendet. „Übungsdaten zurücksetzen“ stoppt aktive Läufe, entfernt Übungstickets und die zugehörigen synthetischen Absender, behält aber die historische Wiederholungssperre. Echte Kundentickets werden nicht gelöscht.

## Tests und Grenzen

Automatischer PHP-Katalogtest: 900 eindeutige IDs und Texte, 60 Themen, vier Stile, vollständige Musterlösungen, 600er-Sperre, Themenabstand und Fallback bei erschöpftem Katalog. Syntax: `php -l` für PHP und `node --check` für JavaScript.

**Noch erforderlich nach Veröffentlichung:** Test auf der echten STRATO-MySQL-Datenbank mit zwei parallelen Supportern, 100 Tickets sofort, Cronintervall/Polling, Pausieren, Stoppen, Reset, 50 simulierten Nutzersitzungen und Browsern mit unterschiedlichen Rollen. Das ist ohne Datenbankzugriff nicht als bestanden ausgewiesen.
