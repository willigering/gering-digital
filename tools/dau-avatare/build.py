#!/usr/bin/env python3
"""DAU TO PRO Avatare: WebP-Ableitungen aus den freigestellten 512er-PNGs erzeugen.

Die PNGs in assets/dau-avatare/ sind die Quelle (Basisporträt und
Zubehörteile je Figur, alle auf derselben 512 × 512-Leinwand). Dieses Skript erzeugt daraus
  avatar-NN-<teil>.webp      512 × 512, verlustfrei (Auswahlseite, große Vorschau)
  avatar-NN-<teil>-192.webp  192 × 192, verlustfrei (Highscore-Sechsecke, Profil, Konto)
Die Ebenen werden nicht verschoben oder beschnitten, damit sie im Browser exakt
übereinanderliegen.

Aufruf: python3 tools/dau-avatare/build.py [assets/dau-avatare/avatar-NN-*.png]
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'assets' / 'dau-avatare'


def main() -> None:
    pngs = [Path(arg) for arg in sys.argv[1:]] or sorted(DIR.glob('avatar-[01][0-9]-*.png'))
    for png in pngs:
        im = Image.open(png).convert('RGBA')
        if im.size != (512, 512):
            raise SystemExit(f'{png.name}: erwartet 512 × 512, ist {im.size}')
        im.save(png.with_suffix('.webp'), 'WEBP', lossless=True, quality=100, method=6, exact=False)
        resampling = Image.Resampling.LANCZOS if png.name[7:9] in {f'{i:02d}' for i in range(1,8)} else Image.Resampling.NEAREST
        im.resize((192, 192), resampling).save(
            png.with_name(png.stem + '-192.webp'), 'WEBP', lossless=True, quality=100, method=6)
    print(f'{len(pngs)} PNGs → WebP 512 und 192')


if __name__ == '__main__':
    main()
