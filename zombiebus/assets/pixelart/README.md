# ZomBUS Pixelart

Spielgrafiken für die Haltestelle. Eine Datei-Pixel entspricht einer Pixelart-Zelle. Die Karte ist 640×360. `preview.png` zeigt dieselbe Karte zweifach vergrößert, nur aus diesen Dateien, ohne Regen, Lichtkegel oder Mündungsfeuer.

Kameraperspektive ist die schräge Draufsicht der Referenz. Die vier Blickrichtungen stehen in jeder Figur-Tabelle von oben nach unten:

| Zeile | Richtung | Blick |
| --- | --- | --- |
| 0 | `se` | schräg nach rechts unten, Gesicht sichtbar |
| 1 | `sw` | schräg nach links unten, Spiegelung von `se` |
| 2 | `ne` | schräg nach rechts oben, Rücken |
| 3 | `nw` | schräg nach links oben, Spiegelung von `ne` |

Der Fußpunkt ist in jeder Zelle derselbe. Frames einer Animation liegen von links nach rechts. Nichts ragt aus der Zelle.

## Gemeinsame Figurenzelle

- Zellgröße: 114×69
- Anker: (57, 66), das ist der Fußpunkt
- Spieler und Zombies teilen diese Zelle

| Datei | Frames | Ablauf | fps |
| --- | --- | --- | --- |
| `player/idle.png` | 2 | Stand, kurze Anhebung | 4, Loop |
| `player/walk.png` | 4 | Auftakt, Passgang, Gegenauftakt, Passgang | 8, Loop |
| `player/aim.png` | 1 | Zielen mit Pistole | gehalten |
| `player/shoot.png` | 3 | Zielen, Rückstoß, Zielen | 10, einmal |
| `player/carry.png` | 4 | Laufen mit Vorratskiste | 8, Loop |
| `player/portrait.png` | 1 | HUD-Porträt, 48×48 | — |
| `zombies/<variante>_idle.png` | 2 | Stand, kurze Anhebung | 4, Loop |
| `zombies/<variante>_walk.png` | 4 | Schlurfen | 6, Loop |
| `zombies/<variante>_attack.png` | 3 | Ausholen, Schlag, Zurück | 8, einmal |
| `zombies/<variante>_hit.png` | 2 | Stand, Zusammenzucken | 8, einmal |
| `zombies/<variante>_fall.png` | 4 | Zucken, Knien, Kippen, Liegen | 8, einmal, kein Loop |

Varianten: `jacket` (Alltagsjacke), `beanie` (Mütze), `plaid` (kariertes Hemd).

Beim Beanie bleibt die letzte Fallstufe die Kipp-Pose, damit die Mütze nicht in ein anderes Outfit wechselt. Der Rückstoß der Pistole enthält keinen Mündungsblitz.

## Karte

| Datei | Inhalt |
| --- | --- |
| `map/background.png` | 640×360, Straße, Gehwege, Fachwerk, Dönerladen, Waschanlage. Ohne Bus, Figuren, Häuschen, Schild, Markise, Tonne, Büsche, Bürsten, DÖNER-Schrift, Regen und Scheinwerferkegel |
| `map/props_overlay.png` | dieselben 640×360, transparente Ebene mit Häuschen, Haltestellenschild, Markise, Tonne, beiden Büschen und Bürstenframe 0 an ihrer Kartenposition |
| `map/sign_doener.png` | 640×360, nur die leuchtende DÖNER-Schrift. Ein- und Ausblenden lässt sie flackern |
| `preview.png` | 1280×720, zweifache Nächste-Nachbar-Vergrößerung der zusammengesetzten Karte |

Lose Teile liegen zusätzlich in `props/`. Die Bürstenanimation `props/brushes.png` hat vier gleich große Frames nebeneinander, Zelle 91×78, von links nach rechts eine Umdrehung, 8 fps, Loop. Frame 0 liegt auch auf der Overlay-Ebene.

## Bus

Die Haltansicht ist `bus/se.png`, 300×180. Die Türanimation gilt nur für diese Ansicht. `se.png` zeigt den Bus mit geöffnetem Einstieg, unbeleuchtet, mit der Anzeige `13 NACHTBUS`.

`bus/door_se.png` hat vier Frames in derselben Canvasgröße, von links nach rechts: zu, halb offen, fast offen, offen. Offen ist leer, weil der Einstieg schon in `se.png` steht. Zeichnen: zuerst `se.png`, danach das Türframe an derselben Position.

Fahransichten mit geschlossener Tür: `bus/sw.png`, `bus/ne.png`, `bus/nw.png`. `sw` trägt ebenfalls die Zielanzeige.

Lichtebenen, gleiche Größe wie der jeweilige Bus, sonst transparent:

- `bus/lights_head_<richtung>.png`
- `bus/lights_tail_<richtung>.png`
- `bus/lights_interior_<richtung>.png`

`bus/driver.png` und `bus/dachshund.png` sitzen in der Haltansicht hinter der Frontscheibe. In der Vorschau liegen sie bei Busposition plus (248, 96) und (228, 114).

## Vorräte und HUD

Einzeldateien in `items/`: `canister.png`, `ammo_crate.png`, `supply_crate.png`, `medkit.png`, jeweils etwa 32 Pixel hoch.

HUD-Symbole in `hud/`, 16×16: `heart.png`, `ammo.png`, `fuel.png`. Zahlen und Balken zeichnet das Spiel.
