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
