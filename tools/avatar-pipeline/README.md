# DAU-TO-PRO Avatar-Pipeline

Erzeugt die Ebenen unter `assets/avatars/` (1024×1024 PNG mit Transparenz, 512er WebP, 192er Thumb) und das Manifest.

- `keying.py` – Chroma-Key (Magenta-Hintergrund, grüner Dummy), Despill, Registrierung jedes Teils auf die feste Dummy-Zeichenfläche.
- `build.py` – baut alle Ebenen: Basen, Haare (Gradient-Map-Farben), Kleidung, Kopfbedeckungen, Accessoires,
  gesichtsgebundene Teile je Basis (Bart, Brillen, Visier, Maske, Augen, Brauen), Effekte und Hex-Rahmen.
  Aufruf: `python3 build.py <ausgabeordner>`; erwartet die Rohbilder in `../raw` relativ zum Arbeitsordner (siehe `raw()` in build.py).
- `compose.py` – setzt Ebenen zu Kontrollbildern zusammen.
- `manifest.py` – schreibt `assets/avatars/manifest.json` (IDs, Dateien, Ebenen-Reihenfolge, Kategorien, Freischalt-Regeln, Standard-Avatar).

Abhängigkeiten: Python 3, Pillow, NumPy, OpenCV.
