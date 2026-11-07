# Tick-It – Aktuelle STRATO-Installation

**Bevorzugter Weg:** Einmaligen geschützten Installationsassistenten unter `https://geringdigital.de/tick-it/setup.php` nutzen. Bitte `DEPLOYMENT.md` beachten. Er verbindet die neue, leere eigene MySQL-Datenbank, importiert das SQL-Schema und richtet den Dozentenzugang mit deinem selbst gewählten Passwort ein. Ein privater, zufälliger Einrichtungscode ist dafür erforderlich; im öffentlichen Repository liegt nur dessen Hash.

Die folgenden ursprünglichen manuellen Schritte bleiben als technische Referenz erhalten.

---

# IT Support – Ticketsystem für die FISI-Schulung

**Stand:** 7. November 2026 · eigenständiges PHP/MySQL-Webprojekt

Ein vollständiger Projektentwurf mit echten PHP-Endpunkten und SQL-Datenhaltung, drei Benutzerrollen, Ticketpool, Kommunikation, Bewertungs- und Trainingsfunktionen. Die Oberfläche verwendet Dark Mode mit Türkis-Akzenten, kompakte Karten und einen strukturierten Ticketverlauf.

> **Wichtiger Statushinweis:** Der Code wurde syntaktisch geprüft. Er ist **nicht** auf einer echten STRATO-/MySQL-Installation integriert oder für 50 gleichzeitige Benutzer erfolgreich lastgetestet worden. Die beigefügten Testskripte erlauben diese Überprüfung nach Installation. Behandle dieses Paket bis dahin als **unabgenommenen Implementierungsstand**, nicht als nachweislich produktionsreifes System.

## Voraussetzungen

- PHP 8.2 oder höher mit **PDO MySQL**, `fileinfo`, `openssl` / sicherem Zufallszahlengenerator und Argon2id-Passworthashing. `mbstring` ist empfehlenswert, aber Fallbacks sind vorhanden.
- MySQL 8.0+ oder MariaDB 10.5+ mit InnoDB (unterstützt CHECK-Constraints).
- HTTPS-Zertifikat und Webspace, dessen **Document Root auf `public/`** gesetzt werden kann.
- Ein privates Verzeichnis **außerhalb des öffentlich erreichbaren Webroots** für Konfiguration, Programmcode und Anhänge.
- Für das Anlegen des Dozentenzugangs **CLI-Zugang zu PHP** oder ein eigener sicherer, ausschließlich vom Betreiber kontrollierter Initialisierungsschritt. Es existiert absichtlich **keine webbasierte Ersteinrichtung**.

## Installation – Schritt für Schritt

1. **Eigenen Unterordner/Subdomain verwenden:** Projektverzeichnis beispielsweise `/home/.../it-support/`. Alle bestehenden Webseiten und Datenbanken bleiben unangetastet. Subdomain wie `support.example.de` auf `/home/.../it-support/public` zeigen lassen. **Niemals das ganze Projektverzeichnis als Document Root verwenden.**
2. **Leere Datenbank anlegen:** Zum Beispiel `it_support` (eigener Benutzer, nur benötigte Rechte). Zeichensatz `utf8mb4`. Datei `database/schema.sql` **in diese Datenbank importieren** (phpMyAdmin oder MySQL-Konsole). Diese SQL-Datei löscht keine bestehenden Tabellen; bei Namensgleichheit bricht sie ab.
3. `config.example.php` **kopieren zu `config.local.php`** im Projekt-Stammverzeichnis. Datenbank-DSN, Benutzer und Passwort eintragen. `https_required` muss im Internet auf `true` bleiben.
4. `storage/uploads/` muss für den PHP-Benutzer schreibbar sein, ist aber **nicht öffentlich erreichbar**. Für Beispielordner mit Zugriffsrechten arbeitet man bevorzugt mit Besitzer-/Gruppenrechten (keine pauschalen `777`). Upload-Limit in `php.ini`/Hosting mindestens 5 MB plus Overhead (`upload_max_filesize`, `post_max_size`).
5. **Dozenten-Konto lokal/über SSH erstellen:** `php bin/create-admin.php` – Benutzernamen frei vergeben und ein Passwort mit mindestens 14 Zeichen zweimal eingeben. Das Skript lässt nur die erste Anlage zu und schreibt **keine Zugangsdaten in öffentliche Dateien**. Unter Unix versucht es, die Passworteingabe auszublenden. Unter Windows kann die Eingabe sichtbar sein: dort einen sicheren Terminal verwenden. **Ohne SSH beim Hoster:** `php bin/generate-admin-sql.php` auf deinem *eigenen Rechner* ausführen; die ausgegebene `INSERT ... SELECT ... WHERE NOT EXISTS`-Anweisung einmalig über ein abgesichertes phpMyAdmin in der leeren Systemdatenbank ausführen. Sie enthält nur einen **Argon2id-Passworthash**, kein Klartextkennwort. Die ausgegebene SQL-Anweisung nicht speichern/veröffentlichen; sie gewährt bei Datenbankzugriff Zugang zum Konto. **Keinen öffentlichen Web-Installer verwenden.**
6. Aufruf per `https://support.example.de/`. Gast tritt mit Anzeigenamen und Rolle Kunde/Supporter bei. Dozent verwendet den separaten Link im Loginformular.
7. `config.local.php` niemals committen oder öffentlich machen. `.gitignore` schützt lokale Konfigurationsdatei und Uploads – **Git-Historie dennoch kontrollieren**. Eigene Datenbank-Zugangsdaten nicht in Actions-Logs ausgeben.
8. **Vor Unterrichtsbeginn testen:** `bash tests/lint.sh` sowie `python3 tests/integration.py https://test.example.de/` (erzeugt Testdaten). Details siehe unten.

### Ordnerstruktur

```text
it-support-ticketsystem/
├── app/
│   ├── bootstrap.php        # PDO, Sicherheitsprüfungen, Sitzungen, Rechte
│   └── actions.php          # Alle Geschäftsprozesse
├── bin/create-admin.php     # Einmalige geschützte Erstanlage per CLI
├── bin/generate-admin-sql.php  # Alternative: lokales SQL für phpMyAdmin
├── database/schema.sql      # Relationale Datenbank / Constraints / Indizes
├── public/                  # EINZIGER öffentlich erreichbarer Ordner
│   ├── index.php            # Anwendung und CSP
│   ├── api.php              # JSON-API und gesicherte Downloads
│   └── assets/{app.js,styles.css}
├── storage/uploads/         # Dateien außerhalb des Webroots
├── tests/{lint.sh,pure.php,integration.py,ui_smoke.py}
├── config.example.php       # Platzhalter ohne Geheimnisse
└── config.local.php         # Lokal selbst anlegen, niemals veröffentlichen
```

## Bedienung

**Kunde:** Gastname + Rolle → eigenes Ticket anlegen, Kategorie/Priorität wählen, Status verfolgen, Nachrichten und Dateien senden, Rückfragen beantworten, geschlossenes Ticket wieder öffnen, nach Lösung 1× bewerten, Dozenten-PMs empfangen/senden. Andere Kunden und interne Notizen sind nicht zugänglich.

**Supporter:** Anmelden ohne Registrierung → Tickets im gemeinsamen Pool → **Übernehmen**. Die Zuweisung ist ein bedingtes `UPDATE` in einer InnoDB-Transaktion; die Datenbank erlaubt nur einem Supporter die erfolgreiche Übernahme. Danach Ticket in „Meine Tickets“ bearbeiten, öffentlich antworten oder interne Notiz hinterlegen, Status/Priorität/Kategorie anpassen, an andere Supporter übergeben, lösen/schließen/freigeben. Persönliche Statistiken.

**Dozent:** Geschützte Anmeldung → Übersicht inkl. Online-Teilnehmern, alle Ticketverläufe inkl. interne Notizen, Teilnehmer sperren/abmelden, private Nachrichten, Ticketzuweisung, Überwachung, Bewertungen und administrative Audit-Logs. Schulungsfälle mit einer **nur für Dozenten sichtbaren Musterlösung** als Entwurf speichern und einzeln/gesammelt veröffentlichen. Rücksetzen entfernt **ausschließlich Übungsfälle**.

**Benachrichtigung:** Browser fragt alle 20 Sekunden automatisch nach Änderungen (Polling, kein externer WebSocket-Dienst). Während eines aktiv bearbeiteten Formulars wird die Ansicht nicht ungefragt neu aufgebaut, um eingegebenen Text zu schützen. Eine Aktualisierung wird bei der nächsten geeigneten Gelegenheit nachgeholt.

### Gastidentität und Grenzen

- Ohne Passwort/Registrierung kann keine verifizierte Personenzuordnung garantiert werden. Zwei gleiche Anzeigenamen sind technisch über unterschiedliche zufällige Sitzungen getrennt.
- Löscht jemand Browser-Cookies oder wechselt das Gerät, kann das vorherige Gastkonto **nicht sicher per Anzeigename wiederhergestellt** werden. Dozent kann aber dessen existierende Tickets weiterhin einsehen.
- Ein Lehrer könnte Gastrollen wie Kunden/Supporter nachahmen; darum keine echten Passwörter oder vertrauliche Daten als Ticketinhalt verwenden. Für Unterrichtssimulation geeignet, nicht als reale Personal- oder Kundendaten-Verwaltung ohne separate Sicherheits-/DSGVO-Prüfung.
- Gast-Session gilt bis zum Logout, Sperrung oder Ablauf (serverseitig 7 Tage, browserseitig Sitzungs-Cookie). Admin-Sitzung läuft standardmäßig nach 30 Minuten Inaktivität ab.

## Sicherheit: Was umgesetzt ist, was geprüft werden muss

Umgesetzt: PDO Prepared Statements, Filterung aller Ticket-Endpunkte nach serverseitiger Identität, Login für Admin über `password_hash`/Argon2id, HttpOnly-/SameSite-Cookies und Secure im HTTPS-Betrieb, CSRF-Token bei schreibenden Aktionen, minimale Admin-Login-Rate-Limits, generische Fehlermeldungen, auditierte Admin-Eingriffe, begrenzte Uploads und MIME-Prüfung, CSP/X-Frame-Options, nicht öffentliches Dateilager, geschützte Downloads, Trennung interner Notizen.

**Vor öffentlicher Freigabe dringend prüfen:** reale Zugriffsrechte auf STRATO-Webroot, PDO-Treiber, Upload-/PHP-Limits, HTTPS, korrekte Datenbankrechte, Backups, Rate-Limit-Tauglichkeit bei Schul-NAT, sichere Server-Logs, Datenschutz-/Löschkonzept, fehlgeschlagene Loginversuche, Konfiguration der PHP-Session-Speicherung, Verhalten bei 50 parallelen Clients. Uploads sollten zusätzlich durch Server-AV geprüft werden, wenn außerhalb des Schulungsrahmens Dateien angenommen werden. Es sind kein Anti-Malware-Scanner, kein Mandantensystem und keine verifizierten Benutzeridentitäten eingebaut.

## Tests / Nachweis

**Bisher durchgeführt:** PHP-Lint, Node-JavaScript-Syntaxcheck und lokale Helfer-Tests. UI-Smoke-Test unter Chromium wurde vorbereitet, konnte in der hier verwendeten Laufzeit wegen gesperrtem lokalen Browserzugriff nicht ausgeführt werden. Es gibt in dieser Umgebung keinen PDO-MySQL-Treiber und keinen MySQL-Server – **kein Backend-End-to-End-Nachweis möglich**.

**Nach Installation selbst ausführen:**

```bash
bash tests/lint.sh
python3 -m pip install requests
python3 tests/integration.py https://test.support.example.de/
# optional, mit Lehrerkonto für zusätzliche Admin-/PM-Tests:
IT_TRAINER_USER='MeinDozent' IT_TRAINER_PASS='...' python3 tests/integration.py https://test.support.example.de/
```

Das Testskript öffnet 50 unabhängige Gastsitzungen (25 Kunden und 25 Supporter), erstellt Testtickets, prüft die **Race Condition** bei gleichzeitiger Ticketübernahme, Kundenschutz, Admin-Rechteabgrenzung, Nachrichtensichtbarkeit und Doppelbewertung. Die Dauer der 50 Anmeldungsvorgänge wird protokolliert; für Aussagekraft zur wirklichen **Dauerlast / Antwortzeit / Ressourcenverbrauch** zusätzliche Lastmessung und Monitoring des Zielservers durchführen. Gegen eine separate **Testdatenbank** ausführen, nicht im Unterrichts-/Produktivsystem.

## Bekannte Einschränkungen & nächste Arbeiten

- Keine Einbindung in GitHub oder STRATO vorgenommen. Bestehende Repositories nicht verändert.
- Keine anbieterbezogene Installation, Lastmessung oder MySQL-Integration in dieser Laufzeit; Ergebnisse noch abzunehmen.
- Vor echtem produktiven Datenschutzbetrieb: Löschfristen und Löschfunktion für Gäste/Kundentickets ergänzen, Retention für Session- und Rate-Limit-Daten operativ automatisieren, Datensicherung und Wiederherstellung testen, Pflichttexte und Zugriffsprotokollierung klären.
- Keine E-Mail-Benachrichtigungen, SSO, SLA-/Eskalationsregeln oder umfangreiche Berichtsexporte. Diese wurden nicht als zwingender Schulungsablauf beschrieben.
- Optionaler Dozenten-Zusatztest benötigt manuell eingerichtetes Administratorkonto.

## Automatischer Anfrage-Strom (900 Übungstickets)

Im Dozentenbereich unter **Schulungsfälle** befindet sich ein Regler-gesteuerter Generator:
100 sofortige Übungstickets (änderbar auf 0–100), weitere 1–30 pro Welle im Abstand von 1–60 Minuten, Gesamtlimit 100–5000. Stoppen, pausieren und fortsetzen sind möglich. Kundennamen und Texte werden unabhängig gezogen. Die vergangenen 600 Formulierungen werden nach Möglichkeit gesperrt. Für bestehende Datenbanken werden nur drei neue, eigenständige Tabellen angelegt. Eine Datenbankmigration erfolgt automatisch beim ersten Aufruf der Dozentenansicht, ohne die bestehenden Tabellen zu verändern.

Siehe [`GESCHAEFTSFAELLE.md`](GESCHAEFTSFAELLE.md) für Quellen, Technik, Einrichtung eines optionalen STRATO-Cronjobs und Testgrenzen.

## Updatebenachrichtigung / Datenerhalt

Nach jedem erfolgreichen Tick-It-Code-Deployment schreibt GitHub Actions **zuletzt**
eine atomare Revisionsmarkierung. Offene Tabs prüfen bei aktiver Nutzung etwa
jede Minute `version.php` und zeigen ein gut sichtbares Update-Fenster im
DAU-to-Pro-Stil. Es verschwindet erst nach bewusster Aktualisierung, niemals
automatisch. Offene Formulare werden vor einem Reload abgefangen.
Das Deployment löscht **keine** Datenbankeinträge, Tickets, Notizen, Bewertungen,
Kunden- und Supporterdaten und setzt **keine** Generatorläufe zurück.
Weitere Regeln und Testgrenzen: `DEPLOYMENT.md`.
