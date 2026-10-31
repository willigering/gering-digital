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
