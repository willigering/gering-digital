# Der Boden ist gekündigt (`/myground`)

Jeder gegen jeden im Greifkran. Drei verschiedene Stempel holen, dann zum Tor. Jeder Kran kann gelbe
Bodenplatten greifen, um 90° drehen und woanders ablegen. Wer draufsteht, fährt mit.

## Aufbau

| Teil | Ort | läuft wo |
| --- | --- | --- |
| Client (statisch) | `myground/index.html`, `game.js`, `style.css`, `config.js` | STRATO-Webspace, über den normalen Deploy |
| Spielserver | `myground/server/` (Node, `node-datachannel`) | eigener Host, getrennt start- und deploybar |

Der Webspace kann nur PHP. Rüdiger (`speed/`) löst das mit einem Browser als Host. Hier entscheidet
ein zentraler Spielserver über Bewegung, Reichweiten, Plattenbesitz, Mitfahrer, Stempel und Sieg.
Jeder Browser hält genau eine WebRTC-Verbindung zum Server (Stern, kein Vollmesh).

## Verbindungsaufbau

1. `POST /session {name}`: Der Spielserver legt die Gastsitzung an und liefert `iceServers`.
2. Der Browser baut `RTCPeerConnection(iceServers)` mit zwei Datenkanälen (`r` zuverlässig, `u` für Positionen)
   und schickt sein Angebot an `POST /offer`. Die Antwort enthält die Kandidaten des Servers.
3. Erst wenn der Kanal `r` offen ist und der Server `welcome` gesendet hat, zeigt der Client „Verbunden“.
   Scheitert die direkte Verbindung, nimmt ICE automatisch den TURN-Umweg.

### TURN

Es wird der vorhandene Cloudflare-TURN-Dienst benutzt, dieselben kurzlebigen Zugangsdaten wie bei Rüdiger:

- Standard: Der Spielserver holt sie über die bestehende Ausgabestelle `speed/api.php?a=ice`
  (`ICE_ISSUER_URL`). Dafür braucht der Spielserver kein eigenes Geheimnis.
- Alternativ `CF_TURN_ID` und `CF_TURN_KEY` als Umgebungsvariablen des Spielservers: dann erzeugt er die
  Zugangsdaten selbst bei Cloudflare (`ICE_TTL`, Standard 2 Stunden).

Schlüssel stehen nie im Repo und nie im Client. Der Browser bekommt nur befristete Zugangsdaten.
`?relay=1` an der Adresse erzwingt zur Diagnose eine reine Relay-Verbindung; die Statusanzeige nennt die Art
(„Direkt“ oder „Relay“).

## Spielserver starten

```bash
cd myground/server
npm ci
ALLOW_BOTS=1 npm start        # http://localhost:8787/myground/ liefert lokal auch den Client aus
```

Produktion: `server/Dockerfile` oder `npm ci --omit=dev && node server.js` hinter einem HTTPS-Proxy.
Benötigt werden ein HTTPS-Endpunkt für `/session` und `/offer` sowie eingehendes UDP
(`UDP_PORT_MIN`/`UDP_PORT_MAX` für die Firewall). Erlaubt der Host kein eingehendes UDP: `SERVER_TURN=1`.
Danach die Adresse in `myground/config.js` eintragen (`window.MYGROUND_SERVER = 'https://…'`) und nach `main`
mergen. Weitere Variablen stehen oben in `server/server.js`. Testbots gibt es nur mit `ALLOW_BOTS=1`; sie
heißen „BOT …“ und tragen in Lobby und Ergebnis das Schild BOT.

## Tests

```bash
npm test                                     # Regeln: 14 Tests, ohne Netzwerk
node test/load.js                            # 48 echte WebRTC-Clients gegen den laufenden Server
NODE_PATH=<playwright> PW_CHANNEL=chrome node test/browser.js           # 2 Browser, komplette Runde
NODE_PATH=<playwright> PW_CHANNEL=chrome RELAY=1 node test/browser.js   # dasselbe, nur über TURN-Relay
```

### Stand 16.11.2026 (lokal, Windows, Spielserver auf dem Entwicklungsrechner)

- Regeln: 14/14. Gleichzeitiges Greifen, Mitfahren, Drehen, Ablegen, Ab- und Aufspringen, Absturz und Respawn,
  Leitplanken, Zeitlimit, Gleichstand, Losentscheid ohne Stempel, Abbruch mit Platte am Haken (beim Ausfahren,
  beim Tragen, beim Ablegen), 48er-Grenze, Bots.
- Zwei unabhängige Chrome-Sitzungen, direkte Verbindung (host/udp): Gastbeitritt, Rundenstart, Greifen, Drehen,
  Ablegen, Springen, drei Stempel, Sieg am Tor, Wiedereinstieg, Abbruch.
- Dieselbe Runde mit erzwungenem Relay: ausgewähltes Kandidatenpaar bei beiden Gästen lokal `relay`
  über `turn.cloudflare.com:3478` (einmal UDP, einmal TCP zum Relay), Gegenstelle `srflx`.
  Gast A: rund 40 kB gesendet und 133 kB empfangen über das Relay.
- Last: 48 gleichzeitige WebRTC-Clients (node-datachannel, direkte Verbindung über Host-Kandidaten auf demselben
  Rechner). Alle verbunden, Runde gestartet, 16 bis 17 Zustände je Sekunde bei jedem Client, rund 190 kbit/s je Client,
  der 49. Gast wird mit 503 abgewiesen, harte Trennung von 24 Clients wird sauber verarbeitet.
- Nicht getestet: 48 Clients über Relay, 48 echte Browser, Betrieb auf einem öffentlichen Host.
