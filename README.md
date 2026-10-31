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
