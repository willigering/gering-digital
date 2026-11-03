# Private OpenAI API bridge for Gering Digital

## Sicherheitsprinzip
- Endpoint: **POST https://geringdigital.de/api/ai.php**
- OpenAI-Schlüssel ist **niemals** in GitHub, HTML, Tampermonkey oder Client-Apps.
- Auf STRATO liegt der Schlüssel in `data/ai-bridge.php` – **manuell per SFTP hochladen**. Die vorhandene `data/.htaccess` blockiert HTTP-Zugriff, und der GitHub-Deploy lädt `data/` nicht hoch.
- Falls SFTP einen Ordner **außerhalb** des Webroots bereitstellt, ist dies noch besser; die PHP-Datei ist aktuell auf den geschützten `data/`-Pfad eingestellt.
- Alle Clients nutzen stattdessen einen **separaten zufälligen Zugriffstoken**, den der Server **nur gehasht** speichert. Der Client-Token hat Zugriff auf kostenpflichtige Anfragen: also ebenfalls geheim halten!
- Keine CORS-Freigabe; Tampermonkey benutzt `GM_xmlhttpRequest` mit `@connect geringdigital.de`.
- Endpoint bleibt ohne korrekte Konfiguration **geschlossen (503)**.
- Nur `gpt-5.4-mini`, nur Text; maximal 8000 Bytes Prompt, 2000 Bytes Instruktionen und 1000 Ausgabetokens.
- Default: 5 Anfragen pro Minute und 40 pro UTC-Tag. Die Quoten werden **vor** dem OpenAI-Aufruf in einer privaten SQLite-Datei reserviert. Bei defekter Quoten-DB wird die Anfrage verweigert.
- Das ist **kein harter Euro-/Dollar-Kostendeckel**. Für zusätzliches Kostenmanagement das OpenAI-Budget überwachen und Auto-Recharge deaktivieren.

## Einmalig auf dem Windows-PC einrichten

1. Repository `willigering/gering-digital` lokal klonen oder als ZIP entpacken.
2. Das Skript `tools/setup-ai-bridge.ps1` lokal in PowerShell starten:
   `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\setup-ai-bridge.ps1`
3. Den schon gekauften **OpenAI API-Key** im lokalen, verdeckten Eingabefeld eingeben.
4. Das Skript erzeugt **lokal** `data/ai-bridge.php` und zeigt den **anderen**, zufälligen 64-stelligen Client-Zugangstoken einmalig an.
5. Den Client-Zugangstoken im Passwortmanager ablegen. **Nicht** in Chat, GitHub, öffentlichen Skripten oder Screenshots zeigen.
6. Via FileZilla/SFTP **nur** `data/ai-bridge.php` in den gleichnamigen `data/`-Ordner der STRATO-Webseite kopieren (neben `index.php`, **nicht** in `api/`). Die vorhandene `data/.htaccess` **nicht löschen**.
7. Vor der ersten KI-Abfrage prüfen, ob `https://geringdigital.de/data/ai-bridge.php` **HTTP 403** liefert. Bei anderem Status **nicht aktiv verwenden**: erst Webserver-Verzeichnisschutz reparieren oder Konfiguration außerhalb des Webroots ablegen.
8. Lokal im Tampermonkey das Beispiel `tools/ai-bridge-tampermonkey.user.js` installieren. Über das Tampermonkey-Menü **„KI-Zugangstoken einrichten/ändern“** den separaten Token speichern. Nicht den OpenAI-Schlüssel dort hineinkopieren.
9. Text auf der Supportia-Seite markieren und den Menüeintrag **„Markierten Text mit KI erklären“** ausführen.

**Kein erneuter GitHub-Merge oder STRATO-Deploy ist bei einem Token-Wechsel erforderlich:** nur die private Datei austauschen und den Client-Token aktualisieren. Eine bestehende Konfiguration wird durch das Setup-Skript absichtlich nicht überschrieben.

## API-Beispiel für andere lokale Skripte

Methode: `POST`

Headers:
- `Content-Type: application/json`
- `X-GD-AI-Token: <dein separater Client-Zugangstoken>`

JSON-Anfrage:

```json
{
  "prompt": "Was ist ein DHCP-Server?",
  "instructions": "Erkläre es in drei kurzen Sätzen auf Deutsch.",
  "max_output_tokens": 350
}
```

Erfolgreiche Antwort:

```json
{
  "ok": true,
  "text": "Ein DHCP-Server ...",
  "model": "gpt-5.4-mini",
  "usage": {"input_tokens": 25, "output_tokens": 61}
}
```

Kein persistentes Speichern von Prompts oder Ergebnissen im Bridge-Code. Die OpenAI-Anfrage setzt `store: false`. Die private SQLite-Datei `data/ai-bridge.sqlite` speichert ausschließlich Zeitstempel zur Durchsetzung der Anfragelimits. OpenAI hat eigene API-Datenaufbewahrungsregeln.

## Fehler / Diagnose

- `405`: Nur POST erlaubt.
- `403`: HTTPS ist erforderlich.
- `503` „noch nicht eingerichtet“: STRATO-Datei fehlt oder hat ungültige Werte.
- `401`: Falscher oder fehlender separater Zugriffstoken.
- `400`: JSON, Prompt, Modell oder Ausgabelimit ungültig.
- `429`: Tages-/Minutenlimit oder OpenAI-Rate-Limit erreicht.
- `502`: OpenAI nicht erreichbar, ungültiger Schlüssel oder zu wenig Guthaben. Status und Guthaben im OpenAI-Dashboard prüfen; keine Schlüssel im Support-Chat schicken.

**Sicherheit bei Verlust:** Sofort den Client-Token wechseln (`client_token_hash` im privaten PHP-Config und gespeicherte Token auf Geräten), bei kompromittiertem OpenAI-Key diesen auf der Platform widerrufen/rotieren.

## Tests

`php tests/ai_bridge_test.php` testet Anmeldung, Eingabebeschränkungen, Antwortformat und Quoten **ohne kostenpflichtige OpenAI-Aufrufe**. Das GitHub-Deployment verändert die SFTP-Konfigurationsdatei nicht.
