# Du kranst mich mal (`/myground`)

Brückenbau-Rennen im Greifkran, jeder gegen jeden. Die Papp-Inseln sind nicht verbunden: Wer zu den drei Stempeln und danach
zum Ausgang will, legt sich mit gelben Platten Brücken. Platten sind knapp, jede liegende darf jeder Kran wegheben,
auch aus fremden Brücken. Wer draufsteht, fährt mit (höchstens sechs Sekunden). Kräne fahren nur auf Boden und bleiben
an jeder Kante stehen; es gibt kein Runterfallen, keinen Sprung und keine Planken. Wer festsitzt, lässt sich mit R zum
Start schleppen.

## Aufbau

Gleiches Modell wie Rüdiger (`speed/`): Der STRATO-Webspace kann nur PHP, deshalb hostet ein Browser die Runde.

| Teil | Dateien | Aufgabe |
| --- | --- | --- |
| Client | `index.html`, `game.js`, `style.css`, `config.js`, `tick.js` | Zeichnen, Eingabe, Verbindung; beim Host zusätzlich das Spiel |
| Spiellogik | `logic.js` | Bewegung, Reichweiten, Plattenbesitz, Mitfahrer, Stempel, Sieg. Läuft im Browser des Hosts, im Node-Server und in den Tests |
| Anmeldung | `api.php`, `data/` (entsteht zur Laufzeit, gesperrt) | Raumliste, Zustellung von Angebot und Antwort, befristete TURN-Zugangsdaten |
| Optionaler Spielserver | `server/` (Node, `node-datachannel`) | Übernimmt die Host-Rolle, wenn in `config.js` eine Adresse steht |

Wer „Baustelle eröffnen“ drückt, ist Host. Sein Browser rechnet das Spiel und entscheidet alles; die anderen
verbinden sich per WebRTC nur mit ihm (Stern, kein Vollmesh). Die Runde hängt damit am Host: Schließt er das
Fenster, bekommen alle Gäste eine Störungsmeldung. Der Takt des Hosts läuft in einem Worker (`tick.js`),
damit ein Fenster im Hintergrund das Spiel nicht ausbremst.

## Verbindungsaufbau

1. Host: `api.php?a=create` liefert einen Raumcode (vier Buchstaben). Der Host fragt einmal je Sekunde `poll` ab.
2. Gast: wählt die Baustelle aus der Liste oder kommt über den Einladungslink `?raum=CODE`, holt mit `ice`
   die ICE-Konfiguration, baut zwei Datenkanäle auf (`r` zuverlässig, `u` für Positionen) und gibt sein Angebot
   mit `signal` ab. Der Host antwortet auf demselben Weg.
3. Erst wenn der Kanal `r` offen ist und der Host `welcome` geschickt hat, zeigt der Gast „Verbunden“ und
   erscheint in der Lobby. Scheitert die direkte Verbindung, nimmt ICE den TURN-Umweg.

Gäste dürfen über `api.php` nur dem Host schreiben, nur der Host den Gästen. Kein Login, keine Cookies.

### TURN

Es wird der vorhandene Cloudflare-TURN-Dienst benutzt. `api.php?a=ice` liest den dauerhaften Schlüssel
serverseitig aus `speed/data/turn.php` (den schreibt das Deployment aus den Secrets `CF_TURN_ID` und
`CF_TURN_KEY`; ein eigener `myground/data/turn.php` hätte Vorrang) und gibt nur befristete Zugangsdaten aus
(6 Stunden gültig, je Satz höchstens 1 Stunde lang weitergegeben). Schlüssel stehen nie im Repo und nie im Client.

`?relay=1` an der Adresse erzwingt zur Diagnose eine reine Relay-Verbindung. Die Statusanzeige nennt die Art
(„Direkt“ oder „Relay“).

## Lokal starten

```bash
php -d extension=openssl -S localhost:8788 -t .      # in der Repo-Wurzel; dann http://localhost:8788/myground/
```

Lokal gibt es keinen TURN-Schlüssel. Für Relay-Tests kann `MYGROUND_ICE_ISSUER` auf eine andere Ausgabestelle
befristeter Zugangsdaten zeigen (z. B. `https://geringdigital.de/speed/api.php?a=ice`). Testbots gibt es nur
lokal oder mit `?bots=1` beim Host; sie heißen „BOT …“ und tragen in Lobby und Ergebnis das Schild BOT.

## Optional: eigener Spielserver

Für Runden, die nicht an einem Browser hängen sollen:

```bash
cd myground/server && npm ci && ALLOW_BOTS=1 npm start     # http://localhost:8787/myground/
```

Produktion: `server/Dockerfile` oder `node server.js` hinter einem HTTPS-Proxy, dazu eingehendes UDP
(`UDP_PORT_MIN`/`UDP_PORT_MAX`) oder `SERVER_TURN=1`. Adresse in `config.js` eintragen. Variablen stehen oben in
`server/server.js`. Der Docker-Build und `SERVER_TURN=1` sind ungetestet.

## Tests

```bash
cd myground/server
npm test                                  # Regeln (14) und PHP-Signalisierung (4), ohne Browser
# mit laufendem PHP-Server auf Port 8788 und Playwright (NODE_PATH), PW_CHANNEL=chrome:
node test/browser.js                      # Host + Gast, komplette Runde, Raumliste, Host weg
RELAY=1 node test/browser.js              # Gast nur über TURN; RELAY=2: Host und Gast
node test/load-host.js                    # 1 Chrome als Host + 47 WebRTC-Gäste = 48 Kräne
RELAY=1 node test/load-host.js            # dasselbe, Host erzwingt das Relay
# gegen den optionalen Node-Server: MODE=server node test/browser.js, node test/load.js
```

### Stand 16.11.2026 (lokal, Windows, alles auf einem Rechner, Anmeldung über lokalen PHP-Server)

- Regeln 16/16 (Stand Brückenbau-Rennen, nur `node --test test/rules.test.js`): Karte und Lückenlänge, kein Runterfallen,
  Brücke bauen, gleichzeitiges Greifen, Ablegen, Mitfahren, Tragezeit mit Fahrgast, Zurück zum Start, Stempel und Sieg,
  Zeitlimit und Los, Abbruch mit Platte am Haken, Plattenmenge je Kranzahl, 48er-Grenze, Bots bauen Brücken.
  Die folgenden Browser-, Relay- und Lastläufe stammen vom alten Regelstand und sind seit dem Umbau nicht wiederholt.
- Zwei unabhängige Chrome-Sitzungen (Host und Gast), direkt (host/udp): Eröffnen, Beitritt per Link, Rundenstart,
  Greifen, Drehen, Ablegen, Springen, drei Stempel, Sieg am Tor, Wiedereinstieg, Abbruch des Gasts, Beitritt einer
  dritten Sitzung über die Raumliste, Host weg mit Störungsmeldung beim Gast.
- Dieselbe Runde mit erzwungenem Relay beim Gast: ausgewähltes Kandidatenpaar lokal `relay` über
  `turn.cloudflare.com:3478` (UDP), Gegenstelle `srflx`; rund 44 kB gesendet und 105 kB empfangen über das Relay.
  Mit Relay auf beiden Seiten: `relay` zu `relay`, ebenfalls komplette Runde.
- Last, direkt: 1 Chrome (headless) als Host, 47 Gäste (node-datachannel), also 48 Kräne. Alle verbunden, Runde
  läuft, 20 Zustände je Sekunde bei jedem Gast, rund 218 kbit/s je Gast, der 49. Kran wird abgewiesen, harte
  Trennung von 23 Gästen wird sauber verarbeitet.
- Last, über TURN: dasselbe mit erzwungenem Relay beim Host. Alle 47 Verbindungen des Hosts lokal `relay`
  (43 UDP, 4 TCP zum Relay), 20 Zustände je Sekunde, Beitritt aller Gäste in 43 Sekunden.
- Optionaler Node-Server: Zwei-Browser-Runde weiterhin bestanden.
- Nicht getestet: 48 echte Browser auf getrennten Rechnern und Leitungen, Host auf einem Handy, Host-Fenster
  wirklich im Hintergrund (das Testwerkzeug hält Seiten immer sichtbar), Upload des Hosts über eine
  Heimleitung (48 Kräne brauchen rund 10 Mbit/s).
