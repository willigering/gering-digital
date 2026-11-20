# LAST ROUND

Browser-Ego-Shooter im **One-in-the-Chamber**-Modus, gebaut mit [Three.js](https://threejs.org).
Aktueller Stand: spielbarer Prototyp gegen 3 Bots (kein Multiplayer, keine eigenen Modelle).

## Spielregeln
- Jeder startet mit **1 Kugel** und **3 Leben**.
- Ein Kill gibt **eine Kugel** dazu. Ohne Kugel bleibt nur der Nahkampf.
- Wer zuletzt noch Leben hat, gewinnt.

## Steuerung
| Taste | Aktion |
|---|---|
| `W A S D` | laufen |
| `Leertaste` | springen (über die Kisten aufs Bunker-Dach) |
| `Shift` | sprinten (nur vorwärts) |
| Linksklick | schießen |
| Rechtsklick halten | Kimme & Korn (Zoom, langsamer, ruhiger) |
| `Q` (oder `V`) | Nahkampf |
| `T` | Waffe prüfen (Inspect) |
| `M` | Maus-Modus umschalten: Erfassung (Pointer-Lock) ↔ freier Cursor |
| `P` | Schatten an/aus (bei Ruckeln) |
| Pfeiltasten | Umsehen (alternativ) |

**Maus:** Klick ins Spiel erfasst die Maus. Wenn das nicht geht (z. B. in einer Vorschau), steuert der
frei bewegliche Cursor: Richtung Bildrand = drehen, im Kreis in der Mitte = ruhig.

## Entwickeln
```bash
npm install
npm run dev     # http://localhost:8080, baut bei jeder Änderung neu
npm run build   # dist/index.html – das ganze Spiel als EINE Datei
npm run release # baut und kopiert nach ../oitc/index.html (= geringdigital.de/oitc)
```
`dist/index.html` lässt sich per Doppelklick öffnen oder auf jeden Webspace legen (z. B. Strato).

**Im Repo gering-digital** liegt der Quellcode in `oitc-src/` (Befehle dort ausführen), die ausgelieferte Datei in `oitc/index.html`.
Veröffentlichen: `npm run release`, dann `oitc/index.html` committen und per PR nach `main` – der Deploy läuft über den STRATO-Workflow.

## Projektstruktur
```
src/main.js        gesamte Spiellogik (Szene, Texturen, Bots, Waffe, HUD)
src/template.html  HTML/CSS (HUD, Menü)
build.mjs          Build-Skript (esbuild)
assets/            hier kommen Blender-Exporte (.glb) hin
```

## Nächste Schritte
1. **Blender-Modelle einbauen** (siehe unten): Pistole (Ansicht), Bot-Figur, Props, Arena.
2. **Multiplayer:** Node.js-Server (z. B. Colyseus/WebSockets), der Treffer und Kugeln entscheidet
   (server-autoritativ). Der Server braucht einen VPS / Fly.io / Railway; Strato-Webspace reicht dafür nicht.
3. Mehr Karten, Waffen-Animationen, Sounds.

## Blender → Spiel (glTF/GLB)
Export in Blender: *File → Export → glTF 2.0 (.glb)*, „Apply Modifiers“ an, Animationen mitexportieren.
Richtwerte fürs Web: Karte und Waffen unter einigen 10.000 Dreiecken, Texturen ≤ 1024 px,
mit Draco-Kompression ausliefern. Datei nach `assets/` legen (Dev-Server liefert sie unter `assets/…` aus).

Laden in `src/main.js`:
```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
new GLTFLoader().load('assets/pistole.glb', (gltf) => {
  const m = gltf.scene;
  m.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  gun.add(m);            // statt der Box-Pistole (Ansicht)
});
```
Hinweis: Das Laden von Dateien klappt nur über den Dev-Server oder einen Webserver, nicht per `file://`.
Maßstab: 1 Blender-Einheit = 1 Meter. Eine Figur ist ca. 1,8 m hoch, die Füße stehen auf y = 0.
