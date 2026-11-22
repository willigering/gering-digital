"""NERD RADIO – Grafikpaket (nerd-radio-pack) für das 3D-Modell und die Website aufbereiten.

Aufruf (Python 3 mit Pillow, NumPy, SciPy):
  python tools/nerd-radio/prepare_pack.py --pack <Ordner mit nerd-radio-pack> [--web dau-to-pro/nerd-radio] [--work tools/nerd-radio/.work]
         [--surfaces <Ordner mit nerd-radio-surfaces>] --speakers <Ordner mit nerd-radio-speaker-layers>

Schritte:
- Front-Textur für Blender (work/front.png, 2910 x 1242, Paket-Koordinaten): modulare Hülle mit
  ausgeschalteten Leuchten. Leuchtstreifen, Seitenschlitze und Neonlinien zum Griff werden abgedunkelt bzw.
  entfernt. In die Aussparungen kommen Lautsprecher (Gitter + Rand, Ring aus) und das leere Display-Glas.
- Lichtebenen für die Website, je Lautsprecher zugeschnitten, in voller Paketauflösung, Positionen in pack.json:
  light-gold-*/light-cyan-* = scharfer Kern (Ring bzw. Pixelpilz, Pilz verlustfrei), light-gold-halo-*/light-cyan-halo-*
  = weicher Schein. Kern und Schein sind getrennt, damit der Kern beim Pulsieren hell und scharf bleibt. Nur diese beiden leuchten, ihre Helligkeit folgt der Musik.
- Lautsprecher aus dem Ebenenpaket „nerd-radio-speaker-layers“ (rechts geliefert, links gespiegelt):
  Membran (cone-l/r.webp, schwingt mit dem Bass), stehendes Gitter mit eingesetztem Pilz (grille-l/r.webp,
  Löcher durchsichtig), Pilz-LEDs und Pilzschein als Lichtebenen. Rand und Goldring bleiben aus dem Grafikpaket.
- RGB-Licht fällt in der Website auf die Membran und ist so nur durch die Gitterlöcher sichtbar.
- Kantenlicht (light-gold-edge-*, light-cyan-edge-*): Lichtfall der Ringe auf Gehäusekanten bzw. des Pilzes aufs
  Gitter, aus Helligkeit und Hochpass der Front berechnet, mit Abfall zur Lichtquelle.
- Tasten (normal / hover / gedrückt) und Lautstärkeregler als WebP.
- Gehäuseflächen (optional, Paket „nerd-radio-surfaces“): Seiten, Ober-/Unterseite und Rückwand mit
  ausgeschalteten Lämpchen als work/surfaces/*.png für build_boombox.py.
- work/pack.json mit allen Platzierungen (Paket-Koordinaten) für build_boombox.py.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument('--pack', required=True)
ap.add_argument('--web', default='dau-to-pro/nerd-radio')
ap.add_argument('--work', default='tools/nerd-radio/.work')
ap.add_argument('--surfaces')
ap.add_argument('--speakers', required=True, help='Ordner mit nerd-radio-speaker-layers (Membran, Gitter, Pilz-LEDs)')
args = ap.parse_args()
PACK = args.pack if os.path.isdir(os.path.join(args.pack, 'assets')) else os.path.join(args.pack, 'nerd-radio-pack')
A = lambda p: os.path.join(PACK, 'assets', p)
os.makedirs(args.web, exist_ok=True); os.makedirs(args.work, exist_ok=True)
manifest = json.load(open(os.path.join(PACK, 'manifest.json'), encoding='utf-8'))
CW, CH = manifest['layout']['canvas']

def load(p):
    return np.asarray(Image.open(A(p)).convert('RGBA')).astype(np.float32) / 255

def hsv(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1); d = np.maximum(mx - mn, 1e-4)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / np.maximum(mx, 1e-4), mx

def lights_off(img, keep=()):
    """Leuchtende Amber-/Cyan-Flächen samt Schein abdunkeln (ausgeschaltetes Leuchtmittel)."""
    rgb, a = img[..., :3], img[..., 3]
    h, s, v = hsv(rgb)
    hue = ((h >= 12) & (h <= 72)) | ((h >= 160) & (h <= 210))
    core = (hue & (s > 0.45) & (v > 0.3)) | (hue & (s > 0.2) & (v > 0.8))   # inkl. weißglühendem Kern
    halo = hue & (s > 0.22) & (v > 0.12)
    m = np.maximum(core.astype(np.float32), ndimage.gaussian_filter(core.astype(np.float32), 5) * 2.5 * halo)
    m = np.clip(ndimage.gaussian_filter(m, 1.2), 0, 1)
    for x0, y0, x1, y1 in keep:            # lackierte Flächen (Warnstreifen, „PRO“) bleiben
        m[y0:y1, x0:x1] = 0
    gray = (rgb @ np.array([0.3, 0.55, 0.15], np.float32))[..., None]
    off = np.clip(gray * 0.32, 0, 0.09) * np.array([0.92, 0.98, 1.06], np.float32) + 0.012
    out = img.copy(); out[..., :3] = rgb * (1 - m[..., None]) + off * m[..., None]
    return out

def over(dst, src, x, y):
    """src (RGBA, gerade Alpha) an Position x,y über dst legen."""
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; d = dst[y0:y1, x0:x1]
    sa = s[..., 3:4]; da = d[..., 3:4]
    oa = sa + da * (1 - sa)
    d[..., :3] = (s[..., :3] * sa + d[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-5)
    d[..., 3:4] = oa

def under(dst, src, x, y):
    """src unter dst legen (füllt Aussparungen)."""
    h, w = src.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(dst.shape[1], x + w), min(dst.shape[0], y + h)
    s = src[y0 - y:y1 - y, x0 - x:x1 - x]; d = dst[y0:y1, x0:x1]
    da = d[..., 3:4]; sa = s[..., 3:4]
    oa = da + sa * (1 - da)
    d[..., :3] = (d[..., :3] * da + s[..., :3] * sa * (1 - da)) / np.maximum(oa, 1e-5)
    d[..., 3:4] = oa

def resize(img, w, h):
    # vorgewichtet skalieren, damit an Kanten keine dunklen Säume entstehen
    pm = img.copy(); pm[..., :3] *= pm[..., 3:4]
    out = np.stack([np.asarray(Image.fromarray(pm[..., c]).resize((w, h), Image.LANCZOS)) for c in range(4)], -1)
    out = np.clip(out, 0, 1); out[..., :3] /= np.maximum(out[..., 3:4], 1e-5)
    return np.clip(out, 0, 1)

def save(img, path, quality=86, lossless=False):
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=quality, method=6, lossless=lossless)
    print('WEB', os.path.basename(path), os.path.getsize(path))

# ---------------------------------------------------------------- Hülle
shell = load('chassis/chassis-modular.png')
k = CW / 1400   # Messungen wurden auf einer 1400 px breiten Vorschau gemacht
box = lambda x0, y0, x1, y1: (int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k))
# Neonlinien links/rechts zum Griff entfernen (liegen außerhalb des Korpus), samt Resten am Griffansatz
shell[:int(114 * k), :int(378 * k), 3] = 0
shell[:int(114 * k), int(1022 * k):, 3] = 0
hh, ss, vv = hsv(shell[..., :3])
neon = (hh >= 150) & (hh <= 215) & (ss > 0.12) & (vv > 0.08)
neon = ndimage.binary_dilation(neon, iterations=3)
top = int(114 * k); shell[:top, :, 3] *= ~neon[:top]
PAINTED = [box(440, 0, 990, 48), box(190, 140, 340, 186), box(1092, 140, 1242, 186), box(540, 90, 900, 160)]
shell = lights_off(shell, PAINTED)
alpha = shell[..., 3]

# ---------------------------------------------------------------- Aussparungen messen
hole = alpha < 0.04
def hole_bbox(x0, y0, x1, y1):
    # nur die zusammenhängende Öffnung um die Mitte des Suchfensters (keine durchsichtigen Nachbarpixel)
    lab, _ = ndimage.label(hole[y0:y1, x0:x1])
    sub = lab == lab[(y1 - y0) // 2, (x1 - x0) // 2]; ys, xs = np.nonzero(sub)
    return [int(xs.min() + x0), int(ys.min() + y0), int(xs.max() + x0 + 1), int(ys.max() + y0 + 1)]
spk_rects = manifest['layout']['speakers']
SPK = {}
for side, (x, y, w, h) in spk_rects.items():
    SPK[side] = hole_bbox(x - 30, y - 30, x + w + 30, y + h + 30)
dx, dy, dw, dh = manifest['layout']['display']
DISP = hole_bbox(dx - 20, dy - 20, dx + dw + 20, dy + dh + 20)

front = shell.copy()
# Höhenkarte der Front (für das Relief in Blender): 0 = Öffnungen (Display, Lautsprecher, Tastenmulden),
# 1 = Gehäuserahmen, 1.6 = Lautsprecherränder. Weiche Übergänge = abgeschrägte Stufen.
HEIGHT = (alpha > 0.5).astype(np.float32)

# Display-Glas in die Aussparung (Inhalt kommt live aus HTML)
x0, y0, x1, y1 = DISP
glass = resize(load('display/display-empty.png'), x1 - x0 + 16, y1 - y0 + 16)
glass = lights_off(glass)
under(front, glass, x0 - 8, y0 - 8)

# Lautsprecher: Gitter + Rand mit ausgeschaltetem Ring, dazu ausgeschaltete Pixelpilze
# Pilzmitte und -größe aus der integrierten Hülle des Pakets gemessen
# Pilz links gemessen; rechts gespiegelt an der Lautsprechermitte, damit beide Seiten gleich sitzen
SL = args.speakers if os.path.isdir(os.path.join(args.speakers, 'optional-alpha')) else os.path.join(args.speakers, 'nerd-radio-speaker-layers')
def sl_rgba(name):
    return np.asarray(Image.open(os.path.join(SL, name)).convert('RGBA')).astype(np.float32) / 255
def sl_light(name):
    """Lichtebene auf Schwarz -> RGBA (Deckkraft = hellster Kanal, Farbe entmultipliziert)."""
    rgb = np.asarray(Image.open(os.path.join(SL, name)).convert('RGB')).astype(np.float32) / 255
    a = rgb.max(-1); out = np.zeros(rgb.shape[:2] + (4,), np.float32)
    out[..., :3] = rgb / np.maximum(a, 1e-4)[..., None]; out[..., 3] = a
    return out
SP = {'cone': sl_rgba('optional-alpha/01-woofer-cone-alpha.png'), 'grille': sl_rgba('optional-alpha/02-grille-led-off-alpha.png'),
      'led': sl_light('03-mushroom-led-on-black.png'), 'glow': sl_light('04-mushroom-glow-black.png')}
GRILLES = {}
LAYERS = {n: np.zeros((CH, CW, 4), np.float32) for n in ('gold-halo', 'gold', 'cyan-halo', 'cyan')}
layout_spk = {}
CONE = {}
for side in ('left', 'right'):
    x0, y0, x1, y1 = SPK[side]
    # Lautsprecherbild genau in das Rechteck aus dem Manifest (wie in der Paketvorschau): der Rand sitzt dann mit
    # Abstand im Rahmen. Den Rand auf die Öffnung zu ziehen machte beide Lautsprecher ~8 % zu groß.
    ox, oy, W, H = spk_rects[side]
    flip = (lambda a: a[:, ::-1]) if side == 'left' else (lambda a: a)   # Ebenen sind für rechts gebaut
    rim = resize(lights_off(load(f'speakers/rim-{side}.png')), W, H)
    cone_img = resize(flip(SP['cone']), W, H); grille = resize(flip(SP['grille']), W, H)
    cone_img[..., :3] *= 0.72; grille[..., :3] *= 0.85        # an das dunkle Gehäuse angleichen
    # Innenfläche des Randes = sichtbarer Bereich von Membran und Gitter
    lab, _ = ndimage.label(rim[..., 3] < 0.5)
    inner = (lab == lab[H // 2, W // 2]).astype(np.float32)
    inner = np.clip(ndimage.gaussian_filter(ndimage.binary_erosion(inner > 0, iterations=2).astype(np.float32), 0.8), 0, 1)
    spk = cone_img.copy(); over(spk, grille, 0, 0); over(spk, rim, 0, 0)
    under(front, spk, ox, oy)
    # Lichtebenen in gleicher Lage
    over(LAYERS['gold-halo'], resize(load(f'speakers/glow-amber-{side}.png'), W, H), ox, oy)
    over(LAYERS['gold'], resize(load(f'speakers/ring-amber-{side}.png'), W, H), ox, oy)
    over(LAYERS['cyan-halo'], resize(flip(SP['glow']), W, H), ox, oy)
    over(LAYERS['cyan'], resize(flip(SP['led']), W, H), ox, oy)
    layout_spk[side] = [ox, oy, W, H]
    reg = HEIGHT[oy:oy + H, ox:ox + W]
    reg[:] = np.maximum(reg, (rim[..., 3] > 0.5) * 1.6)
    iy, ix = np.nonzero(inner > 0.5)
    bx0, by0, bx1, by1 = int(ix.min()), int(iy.min()), int(ix.max() + 1), int(iy.max() + 1)
    cone_img[..., 3] *= inner; grille[..., 3] *= inner
    GRILLES[side] = (cone_img[by0:by1, bx0:bx1], grille[by0:by1, bx0:bx1])
    CONE[side] = (bx0 + ox, by0 + oy, bx1 - bx0, by1 - by0)

# Höhenkarte mit leicht abgeschrägten Stufen speichern (Paket-Koordinaten, float32)
# Rahmen zusätzlich leicht gewölbt nach Helligkeit (helle Paneele und Grate erhaben, dunkle Fugen vertieft)
lum_s = ndimage.gaussian_filter((shell[..., :3] @ np.array([0.3, 0.55, 0.15], np.float32)), 5)
lum_s = (lum_s - np.percentile(lum_s[alpha > 0.5], 5)) / (np.percentile(lum_s[alpha > 0.5], 95) - np.percentile(lum_s[alpha > 0.5], 5) + 1e-6)
HEIGHT += np.clip(lum_s, 0, 1) * 0.45 * (alpha > 0.5) * (HEIGHT < 1.5)
np.save(os.path.join(args.work, 'height.npy'), ndimage.gaussian_filter(HEIGHT, 2.0).astype(np.float32))

# Front für Blender (verlustfrei, volle Auflösung)
Image.fromarray((np.clip(front, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(args.work, 'front.png'))
print('FRONT', front.shape)

# ---------------------------------------------------------------- Membranen und Kantenlicht
yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
lum = (front[..., :3] @ np.array([0.3, 0.55, 0.15], np.float32)) * front[..., 3]
hp = np.clip(lum - ndimage.gaussian_filter(lum, 5), 0, None)          # Kanten und Grate, die Licht fangen
catch = np.clip(lum * 0.7 + hp * 12, 0, 1)
CONES = {}
for side, (x0, y0, w, h) in CONE.items():
    s = side[0]
    cx, cy = x0 + w / 2, y0 + h / 2; r = min(w, h) / 2
    mcx, mcy = cx, cy                                                    # Pilz sitzt mittig im Gitter
    d = np.hypot(xx - cx, yy - cy)
    disc = np.zeros((CH, CW), np.float32)
    disc[y0:y0 + h, x0:x0 + w] = GRILLES[side][1][..., 3] > 0           # nur Gitterstege fangen Licht
    cone_img, grille = GRILLES[side]
    save(resize(cone_img, w // 2, h // 2), os.path.join(args.web, f'cone-{s}.webp'), quality=90)
    save(grille, os.path.join(args.web, f'grille-{s}.webp'), quality=84)
    CONES[s] = {'rect': [x0, y0, w, h], 'center': [mcx, mcy]}
    # Gold: Ringlicht fällt auf die Gehäusekanten rund um den Lautsprecher (nicht auf die Membran)
    fall = np.exp(-np.clip(d - r * 1.08, 0, None) / (r * 0.3)) * (d > r * 1.0)
    for name, a, col in (('gold-edge', np.clip(catch * fall * 0.8, 0, 1), (1.0, 0.72, 0.28)),
                         ('cyan-edge', np.clip(catch * np.exp(-np.hypot(xx - mcx, yy - mcy) / (r * 0.45)) * disc * 1.3, 0, 1), (0.25, 0.9, 1.0))):
        ys_, xs_ = np.nonzero(a > 0.015)
        bx0, by0, bx1, by1 = int(xs_.min()), int(ys_.min()), int(xs_.max() + 1), int(ys_.max() + 1)
        lay = np.zeros((by1 - by0, bx1 - bx0, 4), np.float32); lay[..., :3] = col; lay[..., 3] = a[by0:by1, bx0:bx1]
        lay[lay[..., 3] < 0.004] = 0
        save(resize(lay, (bx1 - bx0) // 2, (by1 - by0) // 2), os.path.join(args.web, f'light-{name}-{s}.webp'), quality=85)
        CONES[s][name] = [bx0, by0, bx1 - bx0, by1 - by0]

# ---------------------------------------------------------------- Website-Ebenen
LIGHTS = {}
for name, layer in LAYERS.items():
    for side, (x0, x1) in (('l', (0, CW // 2)), ('r', (CW // 2, CW))):
        ys_, xs_ = np.nonzero(layer[:, x0:x1, 3] > 0.004)
        bx0, by0, bx1, by1 = int(xs_.min() + x0), int(ys_.min()), int(xs_.max() + x0 + 1), int(ys_.max() + 1)
        crop = layer[by0:by1, bx0:bx1]
        crop[crop[..., 3] < 0.004] = 0      # transparente Pixel ohne Farbe -> kleinere Datei
        # Pilz verlustfrei (feine Pixellinien, sonst verschmiert die Farbunterabtastung), Ring in hoher Qualität, Schein komprimiert
        save(crop, os.path.join(args.web, f'light-{name}-{side}.webp'), quality=(94 if name == 'gold' else 88), lossless=(name == 'cyan'))
        LIGHTS[f'{name}-{side}'] = [bx0, by0, bx1 - bx0, by1 - by0]

KEY_W = 200   # Tasten: 416 x 320 im Paket -> 200 px breit (reicht für 2x bei max. Gerätegröße)
KEYS = ['previous', 'play', 'pause', 'stop', 'next', 'shuffle', 'settings', 'playlist']
for name in KEYS:
    for state in ('normal', 'hover', 'pressed'):
        img = load(f'buttons/{name}-{state}.png')
        save(resize(img, KEY_W, round(KEY_W * img.shape[0] / img.shape[1])), os.path.join(args.web, f'key-{name}-{state}.webp'))
for src, dst, w in (('volume/volume-track.png', 'vol-track.webp', 512), ('volume/volume-fill.png', 'vol-fill.webp', 512),
                    ('volume/slider-handle.png', 'vol-knob.webp', 96)):
    img = load(src); save(resize(img, w, round(w * img.shape[0] / img.shape[1])), os.path.join(args.web, dst))

# ---------------------------------------------------------------- Gehäuseflächen (Ergänzungspaket)
SURF = None
if args.surfaces:
    sdir = args.surfaces if os.path.isdir(os.path.join(args.surfaces, 'assets')) else os.path.join(args.surfaces, 'nerd-radio-surfaces')
    smani = json.load(open(os.path.join(sdir, 'manifest.json'), encoding='utf-8'))
    os.makedirs(os.path.join(args.work, 'surfaces'), exist_ok=True)
    for name in ('side-left', 'side-right', 'top', 'bottom', 'rear'):
        img = np.asarray(Image.open(os.path.join(sdir, 'assets', f'{name}.png')).convert('RGBA')).astype(np.float32) / 255
        img = lights_off(img)              # Lämpchen an den Seiten bleiben aus: nur Ringe und Pilze leuchten
        Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(args.work, 'surfaces', f'{name}.png'))
    b = smani['body']
    SURF = {'body_top': b['bodyTopOnFront'], 'body_bottom': b['bodyBottomOnFront'], 'depth': b['depth']}

json.dump({'canvas': [CW, CH], 'surfaces': SURF, 'cones': CONES, 'display': manifest['layout']['display'], 'display_hole': DISP,
           'controls': manifest['layout']['controls'], 'volume': manifest['layout']['volume'], 'speakers': layout_spk, 'lights': LIGHTS},
          open(os.path.join(args.work, 'pack.json'), 'w'), indent=1)
print('PACK', json.dumps(layout_spk), DISP)
