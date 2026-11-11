#!/usr/bin/env python3
"""DAU TO PRO Avatare: WebP-Ableitungen aus den freigestellten 512er-PNGs erzeugen.

Die PNGs in assets/dau-avatare/ sind die Quelle (Referenz-Look, Basisporträt und drei
Zubehörteile je Figur, alle auf derselben 512 × 512-Leinwand). Dieses Skript erzeugt daraus
  avatar-0N-<teil>.webp      512 × 512, verlustfrei (Auswahlseite, große Vorschau)
  avatar-0N-<teil>-192.webp  192 × 192, verlustfrei (Highscore-Sechsecke, Profil, Konto)
Die Ebenen werden nicht verschoben oder beschnitten, damit sie im Browser exakt
übereinanderliegen.

Aufruf: python3 tools/dau-avatare/build.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'assets' / 'dau-avatare'


def main() -> None:
    pngs = sorted(DIR.glob('avatar-0[1-7]-*.png'))
    if len(pngs) != 35:
        raise SystemExit(f'Erwartet 35 PNGs, gefunden {len(pngs)}')
    for png in pngs:
        im = Image.open(png).convert('RGBA')
        if im.size != (512, 512):
            raise SystemExit(f'{png.name}: erwartet 512 × 512, ist {im.size}')
        im.save(png.with_suffix('.webp'), 'WEBP', lossless=True, quality=100, method=6, exact=False)
        im.resize((192, 192), Image.Resampling.LANCZOS).save(
            png.with_name(png.stem + '-192.webp'), 'WEBP', lossless=True, quality=100, method=6)
    print(f'{len(pngs)} PNGs → WebP 512 und 192')


if __name__ == '__main__':
    main()
