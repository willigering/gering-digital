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
`php tests/dau_lib_test.php`, `php tests/admin_http_test.php` (startet PHPs eingebauten Server mit einer temporären Datenbank), `node tests/dau_card_hover.js`, `node tests/dau_parallax.js`, `node tests/dau_exam_finder.js`, `php tests/html_project_paths.php`, `php tests/learner_lib_test.php`, `php tests/learner_http_test.php`, `node tests/learner_sync.js`, `php tests/achievements_test.php`, Browser: `node tests/achievements_browser.js`. Die produktive Datenbank wird dabei nie verwendet: `GD_DB_PATH` wirkt nur in der Kommandozeile und im eingebauten Testserver.

## DAU TO PRO: kompakte Hauptseite

Der Einstieg zeigt Text und Originalgrafik nebeneinander, darunter folgen Prüfungsfinder und Lernmodule. Das Raster passt sich an die sichtbaren Treffer an; Filter erscheinen nur für vorhandene Themen. Bestehende eigene Vorschaubilder und Einpass-Einstellungen gelten weiterhin. Alte Platzhalter wie „Easy OSI“ bekommen bei der Ausgabe ein konkretes Lernziel; aussagekräftige eigene Beschreibungen und die gespeicherten Daten bleiben unverändert.

Die Navigation bleibt erreichbar und führt zu den Lernangeboten; Gering Digital ist weiterhin über Mobilmenü und Footer erreichbar. Der vollständige Hinweis steht in einer nativen, aufklappbaren Box. Parallax bleibt begrenzt, läuft auf kleinen Geräten zurückhaltender und wird bei reduzierter Bewegung vollständig deaktiviert. Der Pixelpilz samt Video bleibt erhalten. Alle Texte und eigene Hero-Uploads können weiter im Admin bearbeitet werden.

**STRATO-Update für diese Überarbeitung (gemeinsam übertragen):**

- `dau_lib.php`
- `dau-to-pro/index.php`, `dau-to-pro/style.css`, `dau-to-pro/site.js`
- neu: `dau-to-pro/hero-fx.css`
- neu: `assets/dau-to-pro-hero-768.webp`, `assets/dau-to-pro-hero-1448.webp`

Die bestehenden Originalgrafiken, `dau-to-pro/hero-fx.js`, `assets/dau-to-pro-pixelpilz.png`, das Easter-Egg-Video und die Platinen-Hintergründe müssen weiterhin vorhanden sein (Hintergründe aus PR #25 mit übertragen). Keine Datenbank oder Uploadordner ersetzen. Nach Upload die Live-Seite neu laden: Suchformular absenden, Mobilmenü öffnen, Hinweis aufklappen und bei normaler Bewegung scrollen. Ein GitHub-Merge allein aktualisiert die STRATO-Dateien nicht.

**Browserprüfung:** `npm install --no-save --package-lock=false playwright@1.62.1`, `npx playwright install chromium`, dann `node tests/dau_landing_browser.js`. Optional `CHROME_PATH` für einen vorhandenen Chromium/Chrome setzen und `DTP_SCREENSHOT_DIR` für Screenshots. Der Test startet einen eigenen PHP-Server mit temporärer Datenbank und prüft 1440, 1366, 1024, 768, 390 und 320 Pixel Breite, Suchformular, Filter, Mobilmenü, Hinweis, Pixelpilz, Parallax, reduzierte Bewegung und leere Kataloge. CI stellt die Screenshots als Artefakt `dau-main-desktop-mobile` bereit.

### Hero als fertige Grafik

Der Hero ist ein einzelnes Bild: `assets/dau-to-pro-hero-v2-1770.webp` (1770 × 889) und `assets/dau-to-pro-hero-v2-885.webp` für kleine Bildschirme, mit Figuren, Schriftzug, Lernbalken samt Reflexion und Power-up. Die Ränder laufen per CSS-Maske in den Seitenhintergrund aus (`.hero-art-wrap[data-scene=flat]` in `dau-to-pro/style.css`); die Grafik bleibt auf jeder Bildschirmbreite im Fenster.

Der Pixelpilz-Effekt (`dau-to-pro/hero-fx.js`) legt sich über die Pilz-Position im Bild. Der Server übergibt sie als `data-fx-art` (Bildgröße) und `data-fx-box` (x, y, Breite, Höhe in Pixeln der Originaldatei, siehe `dtp_hero_fx_attrs()` in `dau_lib.php`). Eigene Hero-Uploads im Admin bleiben unverändert und ohne Effekt.

**Update:** `dau_lib.php`, `dau-to-pro/index.php`, `dau-to-pro/style.css`, `dau-to-pro/hero-fx.js` sowie die beiden neuen Hero-Bilder gemeinsam übertragen. `dau-to-pro/hero-scene.css` und die früheren Ebenen-Bilder (`dau-to-pro-people-clean-*`, `dau-to-pro-hero-768/1448`) werden nicht mehr benötigt.

### NERD FM: Playlist-Editor

Im geöffneten Playlist-Display schaltet ein Klick auf den Titel ihn an oder aus (Haken, abgewählte Titel sind durchgestrichen und werden bei Weiter, Zurück, Zufall, Mausrad und am Titelende übersprungen); die Nummer spielt den Titel ab. Mindestens ein Titel bleibt immer aktiv. Mit Lernkonto speichert `dau-to-pro/api/radio.php` die Auswahl in der neuen Tabelle `learner_prefs` (Schlüssel `nfm.off`, im Datenexport unter `einstellungen`), ohne Konto merkt sich der Browser sie lokal. Das Mausrad wechselt den Titel nur direkt über der Titelzeile; dort wird der Mauszeiger zum Mausrad-Symbol.

**Update:** `lib.php` (Tabelle `learner_prefs`, wird beim ersten Aufruf angelegt), `learner_lib.php`, `nerd_fm_lib.php`, `dau-to-pro/index.php`, `dau-to-pro/nerd-radio.js`, `dau-to-pro/nerd-radio.css` und neu `dau-to-pro/api/radio.php` gemeinsam übertragen. Bestehende Konten und Fortschritte bleiben unverändert.

### NERD FM: Musik läuft in Modulen und Spickzetteln weiter

Beim Verlassen der Startseite legt das Radio Titel und Position in `localStorage` (`dtp-nerd-radio-resume`, höchstens 30 Minuten gültig) ab. Module (über `learner_inject_sync()`) und `cheat-sheet.html` laden `dau-to-pro/nerd-miniplayer.js/.css`: Ist eine Übergabe da, holt der Mini-Player die aktive Playlist mit frischen Links von `dau-to-pro/api/radio-tracks.php` (nur GET), spult an die Position und spielt weiter. Er bietet Play/Pause, nächsten Titel und Beenden. Beim Seitenwechsel gibt es eine kurze Lücke, weil jede Seite neu lädt. Sperrt der Browser Autoplay, bleibt der Mini-Player sichtbar und pulsiert, bis einmal Play geklickt wird. Ohne Übergabe (nichts gespielt, Beenden geklickt, Musik läuft in einem anderen Tab) lädt er nichts und bleibt unsichtbar. Gespielt werden nur die Dateititel, nicht die Ersatz-Loops. Die Startseite wählt beim Zurückkommen den zuletzt gehörten Titel, startet aber nicht von allein.

**Update:** `nerd_fm_lib.php`, `learner_lib.php`, `dau-to-pro/index.php`, `dau-to-pro/nerd-radio.js`, `dau-to-pro/cheat-sheet.html` und neu `dau-to-pro/nerd-miniplayer.js`, `dau-to-pro/nerd-miniplayer.css`, `dau-to-pro/api/radio-tracks.php` gemeinsam übertragen. Keine Datenbankänderung.

**Alles auf null setzen (Konto-Einstellungen):** Lernende können ihren gesamten Lernstand zurücksetzen: Fortschritt aller Module (als Löschmarken, damit andere Geräte ihn ebenfalls entfernen), Achievements, XP, Level, Lerntage, Bestwerte und Highscore-Sichtbarkeit. Schutz: Warnhinweis, aktuelles Passwort, Eingabe „NULL“ und Rückfrage. Das Konto selbst bleibt. „Willkommen, DAU“ wird danach wie bei jedem neuen Konto wieder vergeben.

## Mitgelieferte Lernmodule (`lernmodule/`)

Fertige DAU-TO-PRO-Module liegen als einzelne HTML-Dateien in `lernmodule/` (Liste in `lernmodule/manifest.json`). Der Ordner ist per `.htaccess` gesperrt und wird nie direkt ausgeliefert. Im Admin unter **HTML-Projekte → Mitgelieferte Lernmodule** zeigt jede Datei, ob live schon dieselbe Version läuft. „Lernmodul installieren“ übernimmt Datei, Titel, Thema, Beschreibung und Vorschaubild in das gewählte Projekt, veröffentlicht sofort und entfernt alle alten Versionen dieses Projekts (bei bestehenden Projekten bleibt die URL und damit der gespeicherte Lernfortschritt erhalten). Ältere Projekte zum selben Thema mit anderem Kürzel werden darunter zum Löschen angeboten. Neues Modul: HTML-Datei nach `lernmodule/<kürzel>.html`, Eintrag in `manifest.json` mit `preview` (Motiv-ID aus `assets/dau-previews/manifest.json`), Vorschaubild-Motiv wie oben beschrieben. Beim Übernehmen bekommt ein neues Projekt dieses Motiv direkt; bei bestehenden Projekten ersetzt „Titel, Thema, Beschreibung und Vorschaubild übernehmen“ auch einen alten Screenshot.

**Deployment (zusätzlich):** Ordner `lernmodule/` (inkl. `.htaccess`), `html_project_lib.php`, `admin/html_projects.php`.

**Farbe und Hintergrund je Modul:** Jedes Modul hat eine eigene Akzentfarbe und ein eigenes Motiv aus `assets/dau-backgrounds/` (als Base64 eingebettet, damit die Datei offline läuft): A1 Zahlensysteme grün mit `circuit-signal`, B1 OSI violett mit `network-ports`, B3 Subnetting petrol mit `cables-patch`. Gold bleibt die gemeinsame Hausfarbe. Neue Module bekommen eine noch nicht vergebene Farbe und ein passendes Motiv.

**Zurück zur Modulauswahl:** `dau-to-pro/sync.js` blendet in jedem veröffentlichten Lernmodul oben links den Button „← Modulauswahl“ ein (Ziel `dau-to-pro/#lernmodule`, Pfad aus `learner_sync_config`). Beim Runterscrollen schrumpft er auf das Pfeilsymbol, beim Hochscrollen kommt der Text zurück. Die Moduldateien selbst brauchen dafür nichts.

## DAU TO PRO: Achievements, Level und Highscore

Jedes Lernmodul hat 10 eigene Achievements (2 Bronze, 2 Silber, 2 Gold, 1 Platin, 3 witzige = 590 XP), dazu kommen 12 modulübergreifende (u. a. das versteckte Easter-Egg-Achievement, 200 XP, nur mit Lernkonto). Katalog, XP- und Level-Berechnung stehen in `achievements_lib.php`. Ausgewertet wird serverseitig aus dem ohnehin synchronisierten Fortschritt (`<präfix>-path-v1`, `-stats-v1`, `-subs-v1`, `-exam-v1`); die Moduldateien bleiben dafür unverändert. Einmal freigeschaltete Achievements bleiben erhalten, auch wenn Fortschritt gelöscht wird. Level: versionierte XP-2.0-Kurve, Gesamt-XP für Level L = round(366100 · L · (L − 1) / 2450), höchstens Level 50. Details und Migrationsstrategie siehe `docs/xp2.md`.

**Highscore** (`dau-to-pro/highscore.php`): nur für angemeldete Lernende sichtbar, standardmäßig aus. Eingeschaltet wird er unter **Mein Fortschritt → Konto-Einstellungen → Sichtbarkeit im Highscore**. Der Admin kann Konten unter **Lernkonten** aus dem Highscore nehmen.

**Modulnamen:** Jedes Projekt hat zusätzlich ein formelles **Thema** (`html_pages.subject`, z. B. „OSI-Schichten“), das klein über dem witzigen Titel steht. Pflege im Admin unter HTML-Projekte; beim Übernehmen eines mitgelieferten Moduls können Titel, Thema und Beschreibung mit übernommen werden.

**Datenbank:** neue Tabellen `learner_achievements`, `learner_stats` und neue Spalte `html_pages.subject` (werden beim ersten Aufruf automatisch angelegt).

**Deployment (zusätzlich):** `lib.php`, `achievements_lib.php`, `learner_lib.php`, `dau_lib.php`, `html_project_lib.php`, `datenschutz.php`, `dau-to-pro/index.php`, `dau-to-pro/konto.php`, `dau-to-pro/konto.css`, `dau-to-pro/highscore.php`, `dau-to-pro/sync.js`, `dau-to-pro/hero-fx.js`, `dau-to-pro/api/progress.php`, `dau-to-pro/api/easteregg.php`, `admin/learners.php`, `admin/html_projects.php`, `admin/dau_card_preview.php`, Ordner `lernmodule/`. Danach im Admin die drei mitgelieferten Module übernehmen (Namen mit übernehmen) und veröffentlichen. Keine Datenbank und keine Uploads ersetzen.

## DAU TO PRO: Hintergrundpaket für Lernmodule

13 dezente IT-Motive (Platinen, Netzwerk- und Glasfaserkabel, Ports, Speichermodule, Steckverbindungen und Servertechnik) mit jeweils zwei WebP-Größen, optionalem CSS und Motivliste liegen in [`assets/dau-backgrounds/`](assets/dau-backgrounds/README.md). Claude und andere Modulautoren finden dort Einbauhinweise für gehostete Module und einzelne Offline-HTML-Dateien. Visuelle Auswahl: `assets/dau-backgrounds/preview.html`. Für gehostete Nutzung den neuen Ordner zusätzlich nach STRATO übertragen; ein GitHub-Merge allein stellt ihn nicht live bereit.


## XP 2.0 (Balanceversion 2)

Die zentrale Konfiguration `xp-config.json` setzt PRO auf **366.100 XP**, das Doppelte der konservativen Erstlauf-Referenz für alle 40 geplanten Module (**183.050 XP**). Vorhandene XP werden einmalig übernommen; Level folgen der neuen Kurve. Vitrine, letzte Erfolge, sortierbare Highscore-Profile und tägliche Lernserien sind kontobasiert. Ausführliche Berechnung, Leveltabelle, Migration, Wiederholungsbudgets und Tests: [docs/xp2.md](docs/xp2.md). Neue Tabellen werden additiv angelegt; produktive Datenbanken und Uploads niemals ersetzen. Der vorhandene SFTP-Workflow stellt die Codeänderungen nach dem Merge bereit.
