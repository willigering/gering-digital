# DAU-TO-PRO Avatar-Pipeline

Erzeugt die Ebenen unter `assets/avatars/` (1024×1024 PNG mit Transparenz, 512er WebP, 192er Thumb) und das Manifest.

- `keying.py` – Chroma-Key (Magenta-Hintergrund, grüner Dummy), Despill, Registrierung jedes Teils auf die feste Dummy-Zeichenfläche.
- `build.py` – baut alle Ebenen: Basen, Haare (Gradient-Map-Farben), Kleidung, Kopfbedeckungen, Accessoires,
  gesichtsgebundene Teile je Basis (Bart, Brillen, Visier, Maske, Augen, Brauen), Effekte und Hex-Rahmen.
  Aufruf: `python3 build.py <ausgabeordner>`; erwartet die Rohbilder in `../raw` relativ zum Arbeitsordner (siehe `raw()` in build.py).
- `landmarks.py` – von Hand gemessene Pupillen-, Mund- und Kinnpositionen auf der normalisierten 1024er-Fläche. Nach dem Build werden Visor, Brillen, Maske und Headset von der gut sitzenden m1-Variante auf die anderen Typen übertragen (`refit_output`). Ein erneutes Ausrichten ohne Rohbilder: `python3 -c 'from landmarks import refit_output; refit_output("../../assets/avatars")'` im Pipeline-Ordner.
- `compose.py` – setzt Ebenen zu Kontrollbildern zusammen.
- `manifest.py` – schreibt `assets/avatars/manifest.json` (IDs, Dateien, Ebenen-Reihenfolge, Kategorien, Freischalt-Regeln, Standard-Avatar).

Abhängigkeiten: Python 3, Pillow, NumPy, OpenCV.
