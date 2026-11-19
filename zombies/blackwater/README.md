# Blackwater Fair – neue Karte für „Are You Dead Yet?“

Verlassener Freizeitpark an einer felsigen Küste bei Nacht. Die Karte ist etwa doppelt so groß wie die Kleinstadt (2640 × 1300 px statt 1400 × 1000) und hat vier Bereiche. Küstenpromenade, Kraftwerk und Leuchtturm sind vorerst gestrichen (Willi, 19.11.2026); das Meer liegt jetzt südlich von Eingang und Spielhalle.

## Starten

* Im Menü unter **SPIELEN → KARTE: ◀ … ▶** wechseln. Die Wahl wird gespeichert (`localStorage dew_map`).
* Alternativ direkt über die URL: `index.html?map=fair` (bzw. `?map=town`).
* **Multiplayer:** Es gilt immer die Karte des Hosts. Ein Gast mit einer anderen Karte lädt automatisch die richtige Karte und tritt danach von selbst wieder bei. Das gilt auch für Spieler, die später dazukommen.

Lokal testen (Windows, im Ordner `zombies`):

```
python -m http.server 8000
```

Danach `http://localhost:8000/index.html?map=fair` öffnen. Für Online-Multiplayer braucht man `api.php`, also PHP (z. B. `php -S localhost:8000`) oder wie bisher `server.js` auf Port 8811.

## Aufbau

| Bereich | Name | Zugang | Preis |
|---|---|---|---|
| A | Eingang & Parkplatz | Start | – |
| B | Festzelt & Imbissmeile | A→B verschütteter Durchgang (Schutt) | 750 |
| D | Spielhalle (Upgrade-Automat) | B→D Metallrolltor | 1.250 |
| E | Riesenrad & Achterbahn (Generator-Hof mit Hauptschalter) | B→E Wartungszugang | 1.500 |
| – | Servicetor Spielhalle ↔ Achterbahn | D↔E | 1.750 |

Mit dem Servicetor entsteht der große Rundweg B-D-E-B. Es gibt keine feste Reihenfolge: E ist über B oder über D erreichbar.

**Alle Preise stehen zentral in `data.js` → `BW_PRICES`.** Dort stehen auch der Upgrade-Preis (5000 × Stufe) und die Perk-Preise (2500 + 500 je Perk).

## Spielmechanik

* **Zugänge:** Der Text lautet z. B. `CLEAR DEBRIS – 750 POINTS [E]`. Jeder Zugang wird einmal bezahlt und bleibt für alle Spieler bis zum Ende der Sitzung offen. Jeder Typ hat einen eigenen Effekt: Schutt fliegt mit Staub weg, ein Tor schwingt auf, das Rolltor rattert hoch, eine Brücke wird Brett für Brett repariert, die Wartungstür fährt mit Funken auf. Kollision und Zombie-Wegfindung (`rebuildArea`) werden sofort aktualisiert. Unsichtbare Wände gibt es nicht.
* **Strom:** Der Park startet ohne Strom. Perk-Automaten und der Upgrade-Automat sind sichtbar, aber dunkel, und zeigen „OFF“ bzw. „NO POWER“. Viele Lampen und Neonschilder sind aus. Der Hauptschalter steht im Generator-Hof ganz im Osten von Bereich E (zwischen zwei Trafos, Schild „BLACKWATER POWER CO.“). Beim Umlegen fährt der Generator hörbar hoch, danach gehen die Lichter wellenförmig vom Generator aus an, die Schilder flackern an, und zum Schluss ertönt ein Signal. Der Strom gilt für alle. Spätere Spieler bekommen ihn ohne Animation.
* **Perks (vorhandenes System):** Thicc Biscuit (Imbissmeile), Panic Popcorn (Vorplatz am Eingang), Trigger Twixx (Achterbahn), Reload Ravioli (Spielhalle), Brain Crunch (neben der Geisterbahn). Jeder Kauf hat eine Animation: Der Automat blitzt auf und eine Dose fällt heraus.
* **Upgrade-Automat** in der Spielhalle, eine Mischung aus Arcade- und Industriegerät. Er nutzt die vorhandene Pack-a-Punch-Logik und kostet 5000 × Stufe. Er braucht Strom. Während des Upgrades drehen sich die Zahnräder und die Waffe schwebt im Bildschirm.
* **Spawns:** Zombies erscheinen nur in Bereichen, die schon geöffnet sind, bevorzugt 150–650 px von den Spielern entfernt und nie näher als 120 px.
* **Endlos:** Es gibt kein Ende, die Wellen laufen einfach weiter.
* **[M]** blendet eine Minikarte ein: Bereiche (offen oder gesperrt), Zugänge (grün offen, rot zu), Automaten und Spieler.

## Dateien

* `data.js`: Grundriss, Bereiche, Mauern, Gebäude, Requisiten, Stationen, Spawns, Zugänge und Preise.
* `art.js`: Pixel-Art. Alles wird per Code gezeichnet (keine Bilddateien): Boden, Mauern mit Graffiti, Zeltdach, Riesenrad, Karussell, Achterbahn, Clownstor, Neonschilder und Zugänge.
* `logic.js`: Zugänge öffnen, Strom, Interaktion, Sync, Spawns, Licht und Glühen, HUD und Minikarte, Upgrade-Automat und Hauptschalter.
* In `index.html` sind alle Einhängepunkte mit `FAIR` abgesichert. Ohne die Karte verhält sich das Spiel wie vorher.

## Technik

* Host-autoritativ wie bisher. Der Snapshot enthält zusätzlich `mp` (Karten-ID) und `bw` (`{o:[offene Zugänge], p:Strom}`), also nur ein paar Bytes.
* Kollision: Mauern und Tore blocken auch Kugeln. Wasser und Zäune blocken nur Bewegung.
* Der Code für Brücken/Stege (`bwDrawBridge`, Zugangstyp `bridge`) ist noch vorhanden, falls Promenade oder Leuchtturm später zurückkommen.
* Die Zombie-Wegfindung ist geprüft (Test mit Playwright): Vor dem ersten Kauf ist nur A erreichbar. Wenn alles offen ist, sind alle begehbaren Zellen aller 4 Bereiche erreichbar. Alle Spawns und Stationen sind erreichbar, und es gibt keine Sackgassen.
* Leistung: Die Mauern und die Achterbahn werden einmal vorgerendert, alles wird außerhalb des Bildes ausgeblendet, und es entstehen keine DOM-Objekte. Headless Chromium läuft mit 60 fps.

## Was fehlt / Ideen

* **Sounds:** Generator, Brummen und Signal werden per WebAudio erzeugt. Alles andere nutzt vorhandene Dateien (`door_break`, `pipe_hit`, `wood_impact` …). Schöner wären echte Aufnahmen: `bw_generator_start.mp3`, `bw_power_hum_loop.mp3`, `bw_pa_chime.mp3`, `bw_shutter_roll.mp3`, `bw_gate_creak.mp3`, `bw_sea_loop.mp3` und Möwen. Sie würden in `sfx/` liegen und in `SFX_FILES` eingetragen.
* **Musik:** Bisher die vorhandenen Tracks. Eine verstimmte Jahrmarkt-Orgel für die Karte wäre ein Plus.
* Die Lobbyliste im Menü zeigt die Karte noch nicht an. In der Lobby selbst steht sie.
