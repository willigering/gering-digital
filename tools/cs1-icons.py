"""Zeichnet die zehn Achievement-Symbole für CS1 „Compiler sagt nein“ als Pixel-Art (64 × 64 Raster, 8-fach vergrößert).
Stil wie achievement-icons/README.md: einzelnes Motiv, dunkle Kontur, Gold und Türkis, transparenter Rand, kein Text außer Motivzeichen.
Aufruf: python3 tools/cs1-icons.py  → achievement-icons/cs1.*.png (512 px) und assets/achievement-icons/cs1.*.webp (96/192 px)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
N = 64
GOLD, GOLD_D, GOLD_L = (232, 184, 74, 255), (176, 122, 34, 255), (255, 226, 140, 255)
TEAL, TEAL_D, TEAL_L = (44, 190, 190, 255), (20, 112, 120, 255), (140, 240, 230, 255)
VIOLET, VIOLET_D = (183, 148, 255, 255), (112, 78, 190, 255)
RED, RED_D = (238, 70, 70, 255), (150, 30, 40, 255)
CREAM, GREY, DARK = (246, 238, 214, 255), (120, 126, 140, 255), (26, 22, 36, 255)
SCREEN = (16, 34, 44, 255)

FONT = {  # 3 × 5 Pixelschrift, nur Zeichen, die ein Motiv braucht
    '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'],
    '4': ['101', '101', '111', '001', '001'], '9': ['111', '101', '111', '001', '111'], 'H': ['101', '101', '111', '101', '101'],
    'I': ['111', '010', '010', '010', '111'], '>': ['100', '010', '001', '010', '100'], '_': ['000', '000', '000', '000', '111'],
    '<': ['001', '010', '100', '010', '001'], '/': ['001', '001', '010', '100', '100'], '{': ['011', '010', '110', '010', '011'],
    '}': ['110', '010', '011', '010', '110'], ';': ['000', '010', '000', '010', '100'], '?': ['111', '001', '011', '000', '010'],
    '-': ['000', '000', '111', '000', '000'], '+': ['000', '010', '111', '010', '000'],
}


def text(d, x, y, s, col, scale=1):
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    d.rectangle([x + c * scale, y + r * scale, x + c * scale + scale - 1, y + r * scale + scale - 1], fill=col)
        x += 4 * scale


def box(d, x0, y0, x1, y1, base, dark, light):
    d.rectangle([x0, y0, x1, y1], fill=base)
    d.line([x0, y1, x1, y1], fill=dark); d.line([x1, y0, x1, y1], fill=dark)
    d.line([x0, y0, x1 - 1, y0], fill=light); d.line([x0, y0, x0, y1 - 1], fill=light)


def sparkle(d, x, y, col=TEAL_L):
    d.point([(x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)], fill=col)
    d.point([(x - 2, y), (x + 2, y), (x, y - 2), (x, y + 2)], fill=(col[0], col[1], col[2], 150))


def outline(img):
    """Dunkle, ein Pixel breite Kontur um das Motiv."""
    a = img.split()[3].point(lambda v: 255 if v > 0 else 0)
    grown = a.filter(ImageFilter.MaxFilter(3))
    ring = Image.new('RGBA', img.size, DARK)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(ring, (0, 0), grown)
    out.alpha_composite(img)
    return out


def hallo(d):  # Monitor mit Eingabeaufforderung und „HI“
    box(d, 10, 12, 53, 43, GOLD, GOLD_D, GOLD_L)
    d.rectangle([14, 16, 49, 39], fill=SCREEN)
    text(d, 17, 20, '>', TEAL_L, 2); text(d, 27, 20, 'HI', CREAM, 2); d.rectangle([17, 33, 22, 34], fill=TEAL_L)
    d.rectangle([27, 44, 36, 48], fill=GOLD_D); box(d, 20, 49, 43, 52, GOLD, GOLD_D, GOLD_L)
    sparkle(d, 55, 10); sparkle(d, 8, 50, GOLD_L)


def semikolon(d):  # großes goldenes Semikolon auf Kachel
    box(d, 14, 10, 49, 53, TEAL_D, (12, 70, 76, 255), TEAL)
    box(d, 27, 17, 36, 26, GOLD, GOLD_D, GOLD_L)
    box(d, 27, 33, 36, 42, GOLD, GOLD_D, GOLD_L)
    d.polygon([(30, 43), (36, 43), (31, 51), (27, 51)], fill=GOLD); d.line([(31, 51), (36, 43)], fill=GOLD_D)
    sparkle(d, 45, 14, GOLD_L); sparkle(d, 18, 48)


def schublade(d):  # Schrank mit offener Schublade, darin „24“
    box(d, 12, 8, 51, 55, GOLD_D, (120, 80, 20, 255), GOLD)
    for y in (12, 25):
        box(d, 16, y, 47, y + 10, GOLD, GOLD_D, GOLD_L); d.rectangle([28, y + 4, 35, y + 6], fill=DARK)
    box(d, 8, 38, 55, 52, GOLD, GOLD_D, GOLD_L)
    d.rectangle([12, 40, 51, 46], fill=SCREEN)
    box(d, 22, 33, 41, 44, TEAL, TEAL_D, TEAL_L); text(d, 26, 36, '24', CREAM)
    sparkle(d, 50, 32)


def typsicher(d):  # Schild mit Haken
    pts = [(14, 10), (49, 10), (49, 32), (42, 46), (31, 54), (21, 46), (14, 32)]
    d.polygon(pts, fill=GOLD)
    d.polygon([(18, 14), (45, 14), (45, 31), (39, 43), (31, 49), (24, 43), (18, 31)], fill=TEAL_D)
    d.line([(14, 10), (49, 10)], fill=GOLD_L); d.line([(49, 10), (49, 32), (42, 46), (31, 54)], fill=GOLD_D)
    for i, (x, y) in enumerate([(22, 30), (23, 31), (24, 32), (25, 33), (26, 34), (27, 35)] + [(28, 34), (30, 32), (32, 30), (34, 28), (36, 26), (38, 24), (40, 22)]):
        d.rectangle([x, y, x + 2, y + 2], fill=TEAL_L)
    sparkle(d, 53, 12, GOLD_L)


def uebersetzer(d):  # zwei Sprechblasen: Code und Bits
    box(d, 6, 8, 33, 27, CREAM, GREY, (255, 255, 255, 255)); d.polygon([(12, 28), (18, 28), (11, 34)], fill=CREAM)
    text(d, 10, 13, '{', VIOLET_D, 2); text(d, 22, 13, '}', VIOLET_D, 2)
    box(d, 28, 32, 57, 52, TEAL, TEAL_D, TEAL_L); d.polygon([(49, 53), (54, 53), (55, 58)], fill=TEAL)
    text(d, 32, 37, '0', CREAM, 2); text(d, 44, 37, '1', CREAM, 2)
    for x in range(36, 44, 2):
        d.point((x, 30), fill=GOLD_L)
    d.polygon([(42, 26), (46, 30), (42, 34)], fill=GOLD)


def lernpfad(d):  # Treppe aus zehn Stufen mit Fahne
    for i in range(10):
        x0 = 6 + i * 5; y0 = 52 - i * 4
        box(d, x0, y0, x0 + 5, 56, GOLD if i % 2 == 0 else GOLD_L, GOLD_D, GOLD_L)
    d.rectangle([53, 6, 54, 16], fill=GREY)
    d.polygon([(55, 6), (62, 9), (55, 12)], fill=TEAL)
    sparkle(d, 20, 14); sparkle(d, 36, 8, GOLD_L)


def marathon(d):  # Stoppuhr mit 90
    d.rectangle([28, 4, 35, 8], fill=GOLD_D); d.rectangle([30, 8, 33, 11], fill=GOLD_D)
    d.ellipse([10, 11, 53, 54], fill=GOLD); d.ellipse([10, 11, 52, 53], fill=GOLD_L); d.ellipse([11, 12, 53, 54], fill=GOLD)
    d.ellipse([15, 16, 48, 49], fill=SCREEN)
    text(d, 21, 26, '90', TEAL_L, 3)
    d.rectangle([46, 12, 51, 15], fill=GOLD_D)
    sparkle(d, 56, 22)


def html(d):  # spitze Klammern mit verwirrtem Fragezeichen
    box(d, 8, 20, 55, 48, VIOLET_D, (70, 46, 130, 255), VIOLET)
    text(d, 12, 25, '<', CREAM, 4); text(d, 26, 25, '/', CREAM, 4); text(d, 40, 25, '>', CREAM, 4)
    box(d, 40, 4, 57, 19, GOLD, GOLD_D, GOLD_L); text(d, 45, 7, '?', DARK, 2)


def nein(d):  # Stoppschild mit Semikolon
    pts = [(22, 6), (41, 6), (55, 20), (55, 39), (41, 53), (22, 53), (8, 39), (8, 20)]
    d.polygon(pts, fill=RED)
    d.polygon([(23, 9), (40, 9), (52, 21), (52, 38), (40, 50), (23, 50), (11, 38), (11, 21)], fill=(205, 48, 52, 255))
    d.line([(22, 6), (41, 6)], fill=(255, 140, 140, 255)); d.line([(55, 39), (41, 53), (22, 53)], fill=RED_D)
    text(d, 23, 17, ';', CREAM, 5)
    sparkle(d, 58, 8, GOLD_L)


def ueberlauf(d):  # Messbalken randvoll, Pfeil springt nach unten ins Minus
    box(d, 20, 6, 33, 57, GREY, (70, 74, 86, 255), (170, 176, 190, 255))
    d.rectangle([23, 9, 30, 54], fill=SCREEN)
    for i, y in enumerate(range(10, 54, 4)):
        d.rectangle([24, y, 29, y + 2], fill=GOLD if i > 2 else RED)
    for (x, y) in [(36, 8), (40, 8), (44, 10), (47, 14), (48, 20), (48, 28), (48, 36), (48, 44), (46, 49), (42, 52)]:
        d.rectangle([x, y, x + 2, y + 2], fill=TEAL_L)
    d.polygon([(42, 48), (42, 57), (36, 52)], fill=TEAL_L)
    box(d, 50, 48, 61, 59, RED, RED_D, (255, 140, 140, 255)); text(d, 54, 52, '-', CREAM)
    sparkle(d, 12, 8, GOLD_L)


MOTIFS = {'hallo': hallo, 'semikolon': semikolon, 'schublade': schublade, 'typsicher': typsicher, 'uebersetzer': uebersetzer,
          'lernpfad': lernpfad, 'marathon': marathon, 'html': html, 'nein': nein, 'ueberlauf': ueberlauf}

if __name__ == '__main__':
    (ROOT / 'assets/achievement-icons').mkdir(exist_ok=True)
    for name, draw in MOTIFS.items():
        img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
        draw(ImageDraw.Draw(img))
        img = outline(img)
        big = img.resize((512, 512), Image.NEAREST)
        big.save(ROOT / f'achievement-icons/cs1.{name}.png')
        for size, suffix in ((96, ''), (192, '-192')):
            big.resize((size, size), Image.NEAREST).save(ROOT / f'assets/achievement-icons/cs1.{name}{suffix}.webp', lossless=True)
    print('Symbole erzeugt:', ', '.join(MOTIFS))
