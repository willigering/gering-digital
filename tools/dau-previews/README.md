# DAU TO PRO – Vorschaubilder

Jedes Lernmodul zeigt auf `/dau-to-pro/` (und im Projektkatalog der Startseite) ein 16:9-Vorschaubild.
Die Bilder werden **auf dem Entwicklungsrechner** als Vektorgrafik erzeugt und als WebP ins Repository gelegt.
Der Webserver braucht dafür keine Bildgenerierung, keinen externen Dienst und kein Node.

## Dateien

| Pfad | Inhalt |
| --- | --- |
| `motifs.mjs` | Ein Motiv pro Thema (SVG-Code) plus gemeinsamer DAU-TO-PRO-Rahmen |
| `render.mjs` | Rendert alle oder einzelne Motive mit Chromium nach WebP |
| `svg/<id>.svg` | Erzeugte SVG-Quelle (zur Kontrolle, wird nicht ausgeliefert) |
| `../../assets/dau-previews/<id>.webp` | 1280 × 720, wird auf großen Bildschirmen geladen |
| `../../assets/dau-previews/<id>-640.webp` | 640 × 360, für Smartphones (`srcset`) |
| `../../assets/dau-previews/manifest.json` | Motiv-Liste: Bezeichnung, zugehörige URL-Kürzel, Stichwörter |

## Neues Lernmodul = neues Motiv (Ablauf für Claude)

1. In `motifs.mjs` eine neue Funktion `function <thema>(id) { … }` schreiben und in `motifs` eintragen
   (`id` in Kleinbuchstaben mit Bindestrichen, z. B. `routing-switching`). Gestaltung:
   dunkler Hintergrund kommt aus `frame()`, Hauptakzent Orange/Gold, Cyan nur dezent, ein klares Motiv in der Mitte,
   Ecken oben links (Nummer) und unten rechts (Warnstreifen) frei lassen, keine Wasserzeichen, Schrift mindestens 20 px.
2. `node tools/dau-previews/render.mjs <id>` ausführen und beide WebP-Dateien ansehen (auch in 640 px Breite).
3. In `manifest.json` einen Eintrag ergänzen. Das URL-Kürzel des Moduls in `slugs` eintragen – damit wird das Bild
   dem Modul automatisch zugeordnet, ohne Datenbankänderung. Die Reihenfolge der Einträge ist die Priorität.
4. `php tests/dau_lib_test.php` ausführen (prüft Format, Größe, Eindeutigkeit und Zuordnung).

Im Admin (HTML-Projekte → Projekt bearbeiten) kann jedes Modul stattdessen ein Motiv fest zugeordnet bekommen
oder ein eigenes Bild hochladen; Ausschnitt und „Einpassen/Ausfüllen“ werden in den vorhandenen Feldern
`preview_image`, `preview_fit`, `preview_x` und `preview_y` gespeichert.

## Zuordnung

`dtp_preview_resolve()` in `dau_lib.php`:

1. Eigenes hochgeladenes Bild oder fest gewähltes Motiv aus `preview_image`.
2. Sonst automatisch: URL-Kürzel in `slugs`, dann Stichwörter in Titel/URL, dann in der Beschreibung.
3. Sonst das Standardmotiv (`default` im Manifest).
