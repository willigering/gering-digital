# Tick-It unter geringdigital.de/tick-it/

Die Anwendung liegt isoliert in `tick-it/`. Bei STRATO kann das Projekt nicht komplett außerhalb des Webroots liegen; deshalb blockiert `tick-it/.htaccess` alle Zugriffe bis auf `index.php`, `api.php` und die beiden UI-Assets. **Vor der Aktivierung unbedingt nachprüfen, dass STRATO diese Apache-Regeln berücksichtigt**.

Benötigt eigene MySQL/MariaDB-Datenbank: `database/schema.sql` in eine **leere separate** Datenbank importieren (die SQL wird nicht per SFTP verteilt), `config.example.php` zu **`tick-it/config.local.php`** kopieren und DB-Zugangsdaten **nur privat auf STRATO** hinterlegen (nie GitHub!). Dozentenzugang mit dem im README dokumentierten CLI-/phpMyAdmin-Verfahren einrichten. Ohne private Konfiguration zeigt die Anwendung absichtlich HTTP 503.

WICHTIG: Der separate Tick-It-Deployment-Workflow lädt **ausschließlich neue Dateien unter `tick-it/`** hoch, löscht aber nichts auf dem Server. Datenbank und `storage/uploads` bleiben auf dem Server. `tick-it/app` und `tick-it/bin` sind durch die separate `.htaccess` gesperrt. Kein produktiver Einsatz ohne Funktions-, Sicherheits- und 50-Nutzer-Test.
