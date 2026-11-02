# Gering Digital

PHP-/SQLite-Website mit originaler blau-schwarzer Gold-Farbwelt und Smartphone-Gestaltung, überarbeiteter App-Präsentation und abgestimmten Interaktionen.

## Voraussetzungen
PHP mit PDO SQLite und Fileinfo. Produktive Inhalte, Nutzer und Anfragen liegen in data/site.sqlite und sind bewusst nicht im Repository enthalten. Bei einer leeren Installation legt lib.php die Tabellen und einen initialen App-Katalog an; dies ist kein Ersatz für die bestehenden produktiven Inhalte.

## Bestehende STRATO-Installation aktualisieren
Nur die Dateien des separat gelieferten Gering-Digital-STRATO-Update.zip übertragen. data/, vorhandene Uploads und Admin-Einrichtung beibehalten. Die produktive Datenbank nie durch eine lokale Datenbank ersetzen. Noch keine Veröffentlichung auf STRATO erfolgt.

## Lokal testen
Nur mit einer Kopie der Datenbank. GD_LOCAL_PREVIEW=1 setzen und mail() auf PHP-Ebene deaktivieren. PHPs eingebauter Server berücksichtigt .htaccess nicht: data/ muss über einen lokalen Router gesperrt werden. Keine Testanfragen an reale Empfänger senden.

## Funktionen
Dynamischer App-Katalog, Admin-Verwaltung mit Login/CSRF, Kontaktformular, Impressum und Datenschutz. Maus- und Scroll-Parallax nutzen getrennte Variablen; reduzierte Bewegung und Touch werden berücksichtigt. App-Icons nutzen optimierte WebP-Vorschauen mit Rückfall auf das Originalbild für neue Uploads.

## Prüfung
Chrome bei 1440, 390 und 320 Pixel Breite; kein horizontaler Überlauf oder JavaScript-Fehler. Smartphone-Tabs mit Hover-/Fokuslicht, Details per Klick/Enter, mobile Navigation per Escape, reduzierte Bewegung, Kontakt-Speicherung und Admin-Bearbeitung/Reihenfolge lokal geprüft.

Keine Datenbank, Zugangsdaten, lokale Laufzeit oder start.bat enthalten.

## Projektkategorien
Der öffentliche Katalog enthält die Filter **Alle**, **Apps**, **DAU to Pro**, **Windows-Apps**, **Spiele** und **Sonstiges**. Die Kategorien erscheinen unabhängig davon, ob bereits Projekte vorhanden sind. Die Auswahl filtert direkt in der Seite; bei leeren Rubriken erscheint ein Hinweis.

Im Admin-Dashboard können Kategorien beim Anlegen und Bearbeiten von Projekten gesetzt werden. Die Datenbankmigration ergänzt beim nächsten Aufruf nur die Spalte `apps.category` mit dem Standardwert `apps`; bestehende Produkte, Reihenfolge, Uploads und die produktive SQLite-Datei bleiben erhalten. Die übrigen Status- und Store-Link-Funktionen sind unverändert.


## HTML-Projektmanager (Admin)

Im Admin-Dashboard auf **HTML-Projekte verwalten** klicken. Titel, URL-Kürzel (beispielsweise \`subnet-sprint\`), Beschreibung, Kategorie und eine \`.html\`- oder \`.zip\`-Datei angeben. Eine einzelne HTML-Datei wird als \`index.html\` gespeichert. ZIP-Projekte brauchen eine \`index.html\` im Hauptordner oder in einem einzigen gemeinsamen Wrapper-Ordner. CSS, JavaScript, Fonts, Medien und Bilder können im ZIP enthalten sein; ausführbare Serverdateien wie PHP sind ausgeschlossen.

1. **Entwurf speichern:** Version in \`data/html-pages/<slug>/<version>/\` ablegen; noch nicht öffentlich.
2. **Vorschau ansehen:** Isolierte Vorschau unter \`/__preview/<slug>/\`. Hier können unter anderem localStorage und serverbasierte APIs eingeschränkt sein. Auf der öffentlichen Seite muss die Funktion ebenfalls geprüft werden.
3. **Veröffentlichen:** Aktuelle Entwurfsversion zur öffentlichen Version machen, beispielsweise \`https://geringdigital.de/subnet-sprint/\`. Eine neue Uploadversion überschreibt die live geschaltete Version nicht vor ausdrücklicher Veröffentlichung.
4. **Offline schalten:** Öffentliche URL liefert 404; Uploads bleiben für spätere Wiederveröffentlichung erhalten. **Löschen:** Projekt mitsamt Uploadversionen entfernen.

Veröffentlichte HTML-Projekte erscheinen im Projektkatalog samt Kategorie und dem Button **Im Browser öffnen**. Es werden keine Einträge des bestehenden App-Katalogs überschrieben.

**STRATO-Bereitstellung:** PHP >= 8.0 mit PDO SQLite, Fileinfo und für ZIP \`ZipArchive\`, außerdem Apache \`mod_rewrite\` und erlaubte \`.htaccess\`-Regeln vorausgesetzt. Neue \`.htaccess\`-Rewrite-Regeln mit bereits vorhandenen Hosting-Regeln zusammenführen, nicht blind überschreiben. Die vorhandene Datei \`data/.htaccess\` muss direkte Zugriffe auf \`data/\` vollständig blockieren. Der \`data/\`-Ordner muss für PHP beschreibbar sein. Bei sicherer Vorschau gilt: Tests nur in einer vom Live-System getrennten Umgebung und mit einer Datenbankkopie.

**Sicherheit:** Nur eigenständig erstellte oder sorgfältig geprüfte HTML-Dateien und ZIP-Archive hochladen. Öffentlich auf demselben Domainursprung ausgeführtes JavaScript kann auf denselben Ursprung zugreifen. Die Admin-Vorschau ist per Sandbox isoliert; die öffentliche URL ist das nicht. Für fremde oder nicht vertrauenswürdige HTML-Uploads unbedingt einen getrennten Domainursprung/Subdomain verwenden. Kein öffentlicher Upload-Endpunkt. Größenlimits: 20 MB Upload, maximal 250 Dateien und 60 MB entpackt.


## Vorschaubilder für HTML-Projekte
Im Admin bei **HTML-Projekte verwalten** kann jedem Projekt ein echtes Screenshot-Vorschaubild (PNG, JPG oder WebP) zugeordnet werden. Empfohlen sind **1280 × 720 Pixel (16:9)**, maximal 5 MB und 4096 Pixel Kantenlänge. Das Bild erscheint auf der Projektkarte statt des bisherigen `</>`-Platzhalters. Die HTML-Dateien selbst werden dadurch nicht verändert. Beim Bearbeiten reicht es, ausschließlich ein neues Bild hochzuladen; die bisher veröffentlichte HTML-Version bleibt aktiv. Es gibt auch eine Option, das Vorschaubild wieder zu entfernen.

Bestandsprojekte behalten ihre Inhalte. Die Datenbank erweitert sich nur um die optionale Spalte `html_pages.preview_image`. Bilddateien werden nach strenger MIME- und Bildprüfung mit zufälligen Dateinamen unter `assets/uploads/html-preview-....jpg/png/webp` gespeichert. Bei einem Austausch oder dem Löschen eines Projekts wird das jeweilige alte Vorschaubild entfernt. Bei STRATO müssen **`assets/uploads/` beschreibbar** sein und bestehende Uploads erhalten bleiben. Die Projekt-Kategoriefilter sind mittig ausgerichtet.

## Startseite: vereinfachte Navigation und Karten
Die öffentliche Startseite zeigt vorübergehend **kein Kontaktformular**. Die Kontaktlinks wurden aus Desktop-/Mobilnavigation und aus der Smartphone-Visualisierung entfernt und durch Projektlinks ersetzt; `send.php` und bestehende Anfragen bleiben für eine mögliche spätere Reaktivierung erhalten.

**Meine Projekte** ist auf Desktop und Mobil wieder ein einfacher Ankerlink; die bisherigen Kategoriechips im Projektbereich bleiben erhalten. Die Kategorie `apps` heißt nach außen **Android-Apps** (intern bleibt `apps`, Datenbankeinträge bleiben unberührt). Die Lesetexte unter den Inhaltsabschnitten haben breitere Spalten und etwas kompaktere Abstände, ohne die Formulierungen zu ändern.

**HTML-Projektkarten** sind vollständig als Link klickbar und per Tastatur erreichbar. Der bisher separate „Im Browser öffnen“-Link entfällt, die Beschriftung bleibt als visuelle Handlungsaufforderung erhalten. Normale App-Karten samt Detailbutton und Play-Store-Links funktionieren weiter wie zuvor.

Deployment auf STRATO: `index.php`, `lib.php`, `html_project_lib.php`, `assets/personal.css` und `assets/site.js` aktualisieren, **keine Datenbank oder Uploadordner ersetzen**.


## DAU TO PRO: Oberseiten-Editor (Admin 2.0)
Im Admin unter **Oberseite bearbeiten** (`admin/dau_page.php`) lassen sich Titel, Untertitel, Beschreibung, Buttons, Hinweisbox, Prüfungsfinder, „Dein Weg“, Abschlussbereich sowie Seitentitel und Meta-Beschreibung bearbeiten. **Vorschau** zeigt die Seite ungespeichert in einem neuen Tab; **Speichern & veröffentlichen** übernimmt die Texte sofort. In Textfeldern ist nur `**fett**` als Formatierung erlaubt, alles andere wird als Text ausgegeben. Die Texte liegen in der vorhandenen Tabelle `settings` (Schlüssel `dtp.*`); es werden **keine neuen Tabellen oder Spalten** angelegt. Ohne gespeicherte Werte gelten die bisherigen Texte.

Die **Hero-Grafik** kann im selben Editor ausgetauscht werden (PNG/WebP mit Transparenz empfohlen, max. 8 MB). Sie wird unter `assets/uploads/dtp-hero-<zufall>.<ext>` gespeichert, transparente Ränder werden beim Upload gemessen, damit die Grafik vollständig und ohne Beschnitt erscheint. „Originalgrafik wiederherstellen“ entfernt die eigene Datei wieder.

## DAU TO PRO: Vorschaubilder der Lernmodule
Alle Modulkarten haben einheitlich 16:9. Mitgelieferte Motive liegen in `assets/dau-previews/` (WebP 1280 × 720 und 640 × 360) und werden Modulen ohne eigenes Bild automatisch thematisch zugeordnet – auch bestehenden Modulen, ohne Datenbankänderung. In **HTML-Projekte → Projekt bearbeiten** gibt es die Bildquelle (automatisch / Motiv fest zuordnen / eigenes Bild), Hochladen, Ersetzen, Löschen (zurück zur automatischen Zuordnung), Ausschnitt, Einpassen/Ausfüllen und eine Live-Vorschau, die serverseitig mit derselben Funktion und demselben Stylesheet wie `/dau-to-pro/` gerendert wird. Erzeugung neuer Motive: `tools/dau-previews/README.md`.

**Deployment (zusätzlich):** `dau_lib.php`, `admin/admin2_layout.php`, `admin/dau_page.php`, `admin/dau_card_preview.php`, geänderte `admin/index.php`, `admin/html_projects.php`, `index.php`, `lib.php`, `dau-to-pro/*` sowie den Ordner `assets/dau-previews/` hochladen. `tools/` und `tests/` werden auf dem Server nicht benötigt. Keine Datenbank und keine Uploads ersetzen.

## DAU TO PRO: Lernkonten und Fortschritt speichern
Lernende können unter `/dau-to-pro/konto.php` ein kostenloses Konto anlegen: **nur Benutzername und Passwort, keine E-Mail**. Bei der Registrierung erscheint einmalig ein **Wiederherstellungscode** (`DTP-XXXX-XXXX-XXXX`), mit dem sich ein vergessenes Passwort selbst zurücksetzen lässt; danach gibt es einen neuen Code. Sind Passwort und Code verloren, setzt der Admin unter **Admin 2.0 → Lernkonten** (`admin/learners.php`) ein neues Einmal-Passwort.

**Speichern:** Veröffentlichte Module der Kategorie *DAU to Pro* bekommen beim Ausliefern automatisch `dau-to-pro/sync.js` vorangestellt (die Moduldateien selbst bleiben unverändert). Die Module speichern wie bisher in `localStorage`; das Skript lädt beim Öffnen den Kontostand in `localStorage` (bevor das Modul startet), erkennt danach jede Änderung und überträgt sie an `dau-to-pro/api/progress.php`. Fortschritt, der vorher ohne Konto auf dem Gerät entstanden ist, wird beim ersten angemeldeten Öffnen übernommen. Beim Abmelden wird der Stand vom Gerät entfernt. Unten links im Modul zeigt ein kleiner, einklappbarer Hinweis den Status. **Mein Fortschritt** listet je Modul den Stand mit Weiterlernen, Fortschritt löschen, Datenexport, Passwort ändern, neuem Code und Konto löschen.

**Sicherheit & Spamschutz (ohne Captcha, ohne externe Dienste):** verstecktes Feld und signierter Zeitstempel (mind. 3 s) bei Registrierung/Wiederherstellung, max. 5 Registrierungen pro Stunde und Anschluss, Sperre nach 8 Fehlversuchen pro Name bzw. 20 pro Anschluss (15 min). IP-Adressen werden dafür nur als HMAC-Hash max. 24 h gespeichert. Passwörter und Codes mit `password_hash`, CSRF-Schutz und Herkunftsprüfung für die API, Sitzungs-Cookie `HttpOnly`/`SameSite=Lax` (`Secure` unter HTTPS), „Angemeldet bleiben“ 30 Tage mit rotierendem Token. Grenzen: 256 KB pro Eintrag, 2000 Einträge und 5 MB pro Konto.

**Datenbank:** neue Tabellen `learners`, `learner_progress`, `learner_tokens`, `learner_attempts` (werden beim ersten Aufruf automatisch angelegt; bestehende Tabellen bleiben unverändert).

**Deployment (zusätzlich):** `learner_lib.php`, `lib.php`, `html_project.php`, `html_project_lib.php`, `dau_lib.php`, `dau-to-pro/index.php`, `dau-to-pro/konto.php`, `dau-to-pro/konto.css`, `dau-to-pro/sync.js`, `dau-to-pro/api/progress.php`, `admin/learners.php`, `admin/admin2_layout.php`, `datenschutz.php` (neuer Abschnitt 8 „DAU TO PRO Lernkonten“).

## Tests
`php tests/dau_lib_test.php`, `php tests/admin_http_test.php` (startet PHPs eingebauten Server mit einer temporären Datenbank), `node tests/dau_card_hover.js`, `node tests/dau_parallax.js`, `node tests/dau_exam_finder.js`, `php tests/html_project_paths.php`, `php tests/learner_lib_test.php`, `php tests/learner_http_test.php`, `node tests/learner_sync.js`. Die produktive Datenbank wird dabei nie verwendet: `GD_DB_PATH` wirkt nur in der Kommandozeile und im eingebauten Testserver.
