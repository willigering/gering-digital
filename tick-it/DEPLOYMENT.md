# Tick-It: STRATO-Erstinstallation

Die Anwendung liegt unter `https://geringdigital.de/tick-it/` in einem eigenen Unterverzeichnis.
Der SFTP-Workflow lädt nur Dateien von `tick-it/` hoch und löscht keine Remote-Dateien.

## Installation: geschützter Assistent

1. Melde dich im STRATO Kunden-Login an und wähle das zugehörige Hosting-Paket.
2. Öffne **Datenbanken und Webspace → Datenbankverwaltung** und lege eine **neue, leere MySQL/MariaDB-Datenbank ausschließlich für Tick-It** an. Nutze **nicht** die bestehende Gering-Digital- oder DAU-to-Pro-Datenbank. Kopiere den STRATO-Datenbankserver, Datenbanknamen und Datenbankbenutzer und merke dir das Datenbankpasswort.
3. Öffne `https://geringdigital.de/tick-it/setup.php` ausschließlich über HTTPS.
4. Trage den **privat mitgeteilten einmaligen Einrichtungscode** ein. Der Code selbst ist nicht im GitHub-Repository vorhanden, dort liegt nur ein SHA-256-Prüfwert.
5. Trage deine **separaten** STRATO-Datenbankdaten und selbst gewählten Dozenten-Benutzernamen und Dozentenpasswort ein (mind. 14 Zeichen).
6. Klicke **„Tick-It sicher installieren“**. Der Server prüft die Verbindung, verweigert belegte Datenbanken, importiert `database/schema.sql`, erstellt den Admin und schreibt ausschließlich auf dem Server `config.local.php` mit Dateimodus 0600.
7. Nach erfolgreicher Installation leitet die Anwendung auf `https://geringdigital.de/tick-it/` weiter. Melde dich als Dozent an. `setup.php` ist ab dann nicht mehr verfügbar (404).

**Passwörter niemals in GitHub oder im Chat teilen.** Die HTTPS-Einrichtung leitet sie direkt an deinen eigenen STRATO-Webspace weiter. Setup ist ausschließlich mit deinem zufälligen Einrichtungscode möglich. `config.local.php` und Datenbanksicherungen gehören niemals ins Repository.

**Sicherheitsanforderung:** Prüfe, dass `/tick-it/app/bootstrap.php`, `/tick-it/config.local.php`, `/tick-it/database/schema.sql` und `/tick-it/setup.key.php` extern HTTP 403/404 liefern. Ohne funktionierende `.htaccess` darf die Anwendung nicht online gehen.

## Fehler / Grenzen

- Wenn `setup.php` mit 403 antwortet: HTTPS-Weiterleitung/SSL des Webspace prüfen.
- Wenn `setup.php` mit 503 antwortet: Bei STRATO `PDO MySQL` und PHP-Version prüfen.
- Datenbankhost ist normalerweise **nicht** `localhost`; STRATO zeigt einen Hostnamen in der Datenbankverwaltung an.
- Falls der Schemaimport mittendrin scheitert, werden die bereits angelegten Tabellen *nicht automatisch gelöscht*. Wähle für den nächsten Versuch eine **neue leere Datenbank**; keine destruktiven Aktionen an bestehenden Datenbanken.
- Die Anwendung ist für Unterrichtszwecke entworfen; die Belastbarkeit mit 50 parallelen Teilnehmern muss auf STRATO noch getestet werden.
- Nach erfolgreichem Import Administrationsfunktion, Gastzugänge, atomare Ticketübernahme, PM und geschützte Anhänge mit mehreren Browsern prüfen, bevor die gesamte Klasse eingeladen wird.

## Erweiterung: automatischer Anfrage-Strom

Nach der Anmeldung als Dozent unter **Schulungsfälle** automatisch initialisieren lassen. Die ergänzenden Tabellen werden durch `database/generator-migration.sql` idempotent angelegt; keine manuelle Änderung an vorhandenen Tabellen erforderlich. Es werden 900 rein synthetische Anfragetexte in 11 geschützten JSON-Dateien unter `app/generator-data/` bereitgestellt.

Ohne Cronjob werden fällige Ticket-Wellen bei neuen, authentifizierten Seitenabfragen verarbeitet. Für eine minutengetreue Freigabe optional in STRATO einen Cronjob mit **CLI-PHP** jede Minute für `tick-it/bin/generator-cron.php` anlegen; Paketverfügbarkeit und tatsächlichen absoluten Pfad prüfen. Das Skript enthält keine Web-Tokens oder Zugangsdaten. Die lokalen Dateien `config.local.php`, `storage/` und bestehende Daten werden beim Deploy nicht überschrieben.

Weitere Details und fachliche Quellen: `GESCHAEFTSFAELLE.md`.

## Nicht-destruktive Updates und Benachrichtigung

**Wichtig: Ein Code-Update ist niemals ein Daten-Reset.** Der separate GitHub-Workflow
überträgt ausschließlich freigegebene Dateien unter `tick-it/`; er führt weder SQL
noch Lösch-/Resetoperationen auf dem Server aus. `config.local.php`, `storage/`,
`uploads/`, `data/`, `runtime/`, `sessions/`, `backups/` und lokale
Datenbanken werden ausgeschlossen und bleiben auf dem Server bestehen.

- Übernommene/zugewiesene Tickets, laufende Bearbeitungen, Tickets im Pool,
  Kunden- und Supporternachrichten, interne Notizen, Bewertungen,
  Ticket- und Auditverläufe sowie aktuelle Übungsläufe liegen weiterhin in
  der **bestehenden Tick-It-Datenbank**.
- Keine DB-Initialisierung bei Updates und **keine** destruktive Migration.
  Sollte eine zukünftige Änderung eine Datenbankmigration benötigen, muss
  diese separat und nicht-destruktiv geprüft und mit Backup abgesichert werden.
- Dateien werden nach Möglichkeit einzeln atomar übertragen. Erst wenn
  alle Code-Dateien vollständig auf STRATO liegen, aktiviert das Deployment
  atomar die neue `release.json` mit der Git-Revision. Die Datei ist über
  `.htaccess` von direktem Abruf ausgeschlossen.
- Ein offener Browser fragt `version.php` alle 60 Sekunden und bei
  Wiederaktivierung des Tabs ab. Erst bei abweichender Revision wird die
  persistent sichtbare Benachrichtigung angezeigt. **Es gibt keinen
  automatischen Reload.** Offene/ungespeicherte Formulare blockieren den
  „Jetzt aktualisieren“-Button, bis ihre Eingaben gesichert sind.
- Das Neuladen des Browsers ändert keine Datenbankeinträge und beendet keine
  gültigen Gast-/Dozentensitzungen. Für Browserdaten gilt weiterhin:
  Bei einem **manuellen Löschen der Cookies** kann ein Gast ohne Passwort
  nicht durch seinen Anzeigenamen wiederhergestellt werden.
- Vor größeren Upgrades reguläres STRATO-Datenbankbackup erstellen;
  einen Wiederherstellungstest separat durchführen. Live-End-to-End- und
  echte Backup-Wiederherstellungstests sind nicht durch bloßes SFTP-Deployment bewiesen.
