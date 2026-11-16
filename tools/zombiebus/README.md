# ZomBUS!!!

## Lokaler Start

Im Wurzelverzeichnis des Repos mit Node.js ab Version 22 und PHP mit PDO SQLite:

1. `npm ci --prefix tools/zombiebus`
2. `ZOMBIEBUS_LOCAL=1 node tools/zombiebus/server.mjs`
3. `GD_ROOT="$PWD" GD_LOCAL_PREVIEW=1 php -S 127.0.0.1:8080 -t . tests/support/router.php`
4. `http://127.0.0.1:8080/zombiebus/` öffnen. Der Link zum Raum lässt sich in einem zweiten Browserprofil öffnen.

In PowerShell werden die Variablen vor dem jeweiligen Befehl mit `$env:ZOMBIEBUS_LOCAL='1'`, `$env:GD_ROOT=(Get-Location).Path` und `$env:GD_LOCAL_PREVIEW='1'` gesetzt. Für lokale Tests lässt sich die PHP-Datenbank über `GD_DB_PATH` auf eine separate SQLite-Datei legen.

Der Browser-Abnahmetest nutzt Playwright und temporäre Testserver. `node tests/zombiebus_browser.cjs` ausführen, nachdem Playwright und Chromium installiert sind. `ZOMBIEBUS_CHROMIUM` kann auf ein lokal installiertes Chromium oder Chrome zeigen.

## Veröffentlichung

- Auf einem Node-Dienst mit WebSocket-Unterstützung einmal `npm ci --prefix tools/zombiebus` und als Startbefehl `node tools/zombiebus/server.mjs` ausführen. Der Dienst unterstützt `PORT` und beantwortet `GET /health`. Die WebSocket-Verbindungen laufen über `/ws`.
- `ZOMBIEBUS_DATA` auf ein beschreibbares persistentes Volume setzen. Eine Serverinstanz betreiben, damit jeder Raum genau eine laufende Simulation hat. Der Prozess erlaubt standardmäßig beide HTTPS-Domains von Gering Digital. `ZOMBIEBUS_ORIGINS` kann die Liste bei Bedarf ersetzen.
- Den zugänglichen TLS-Endpunkt mit Pfad `/ws` als GitHub-Actions-Variable `ZOMBIEBUS_WS_URL` im Repo oder im Environment `production` setzen. Der vorhandene STRATO-Workflow schreibt die Adresse beim Upload in `zombiebus/server-config.json`.
- Nach den PR-Checks und dem Merge den STRATO-Workflow prüfen. Auf der öffentlichen Startseite die Kachel öffnen, einen Raum anlegen, den Einladungslink in einem zweiten Browserprofil öffnen und den Fahrer-Tab schließen.

Bei einem regulären WebSocket-Abbruch räumt der Server Figur und Sitz im Close-Handler auf. Ausbleibende Pongs lösen nach rund sieben bis neun Sekunden dieselbe Bereinigung aus. Beim letzten Ausstieg wird der gemeinsame Zustand gespeichert. Ohne Fahrgäste steht die Simulation still.
