"""NERD RADIO – Grafikpaket (nerd-radio-pack) für das 3D-Modell und die Website aufbereiten.

Aufruf (Python 3 mit Pillow, NumPy, SciPy):
  python tools/nerd-radio/prepare_pack.py --pack <Ordner mit nerd-radio-pack> [--web dau-to-pro/nerd-radio] [--work tools/nerd-radio/.work]

Schritte:
- Front-Textur für Blender (work/front.png, 2910 x 1242, Paket-Koordinaten): modulare Hülle mit
  ausgeschalteten Leuchten. Leuchtstreifen, Seitenschlitze und Neonlinien zum Griff werden abgedunkelt bzw.
  entfernt. In die Aussparungen kommen Lautsprecher (Gitter + Rand, Ring aus) und das leere Display-Glas.
- Lichtebenen für die Website (light-gold.webp = Lautsprecherringe + Schein, light-cyan.webp = Pixelpilze +
  Schein), deckungsgleich mit der Front. Nur diese beiden leuchten, ihre Helligkeit folgt der Musik.
- Tasten (normal / hover / gedrückt) und Lautstärkeregler als WebP.
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
args = ap.parse_args()
PACK = args.pack if os.path.isdir(os.path.join(args.pack, 'assets')) else os.path.join(args.pack, 'nerd-radio-pack')
A = lambda p: os.path.join(PACK, 'assets', p)
os.makedirs(args.web, exist_ok=True); os.makedirs(args.work, exist_ok=True)
manifest = json.load(open(os.path.join(PACK, 'manifest.json'), encoding='utf-8'))
CW, CH = manifest['layout']['canvas']
WEB_SCALE = 0.5   # Lichtebenen: halbe Paketauflösung reicht für max. 560 CSS-px Gerätebreite bei 2x

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

def save(img, path, quality=86):
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=quality, method=6)
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
    sub = hole[y0:y1, x0:x1]; ys, xs = np.nonzero(sub)
    return [int(xs.min() + x0), int(ys.min() + y0), int(xs.max() + x0 + 1), int(ys.max() + y0 + 1)]
spk_rects = manifest['layout']['speakers']
SPK = {}
for side, (x, y, w, h) in spk_rects.items():
    SPK[side] = hole_bbox(x - 30, y - 30, x + w + 30, y + h + 30)
dx, dy, dw, dh = manifest['layout']['display']
DISP = hole_bbox(dx - 20, dy - 20, dx + dw + 20, dy + dh + 20)

front = shell.copy()

# Display-Glas in die Aussparung (Inhalt kommt live aus HTML)
x0, y0, x1, y1 = DISP
glass = resize(load('display/display-empty.png'), x1 - x0 + 16, y1 - y0 + 16)
glass = lights_off(glass)
under(front, glass, x0 - 8, y0 - 8)

# Lautsprecher: Gitter + Rand mit ausgeschaltetem Ring, dazu ausgeschaltete Pixelpilze
# Pilzmitte und -größe aus der integrierten Hülle des Pakets gemessen
MUSH = {'left': (486.5, 764.5, 0.785), 'right': (2503.5, 772.0, 0.79)}
gold = np.zeros((CH, CW, 4), np.float32); cyan = np.zeros((CH, CW, 4), np.float32)
layout_spk = {}
for side in ('left', 'right'):
    x0, y0, x1, y1 = SPK[side]
    pad = 10   # Rand greift etwas unter die Hülle
    rim_bbox = (37, 37, 987, 991)          # sichtbarer Rand im 1024er Lautsprecherbild
    sx = (x1 - x0 + 2 * pad) / (rim_bbox[2] - rim_bbox[0]); sy = (y1 - y0 + 2 * pad) / (rim_bbox[3] - rim_bbox[1])
    W, H = round(1024 * sx), round(1024 * sy)
    ox, oy = round(x0 - pad - rim_bbox[0] * sx), round(y0 - pad - rim_bbox[1] * sy)
    spk = resize(lights_off(load(f'speakers/grille-{side}.png')), W, H)
    rim = resize(lights_off(load(f'speakers/rim-{side}.png')), W, H)
    over(spk, rim, 0, 0)
    mcx, mcy, ms = MUSH[side]
    m = load(f'speakers/mushroom-{side}.png'); mw, mh = round(m.shape[1] * ms), round(m.shape[0] * ms)
    m_off = m.copy(); g = m_off[..., :3].mean(-1, keepdims=True)
    m_off[..., :3] = g * np.array([0.16, 0.22, 0.24], np.float32); m_off[..., 3] *= 0.8   # LED-Pixel aus: dunkles Glas
    mx, my = round(mcx - mw / 2), round(mcy - mh / 2)
    over(spk, resize(m_off, mw, mh), mx - ox, my - oy)
    under(front, spk, ox, oy)
    # Lichtebenen in gleicher Lage
    over(gold, resize(load(f'speakers/glow-amber-{side}.png'), W, H), ox, oy)
    over(gold, resize(load(f'speakers/ring-amber-{side}.png'), W, H), ox, oy)
    g2 = load(f'speakers/mushroom-glow-{side}.png')
    over(cyan, resize(g2, round(g2.shape[1] * ms), round(g2.shape[0] * ms)), mx + round((m.shape[1] - g2.shape[1]) * ms / 2), my + round((m.shape[0] - g2.shape[0]) * ms / 2))
    over(cyan, resize(m, mw, mh), mx, my)
    layout_spk[side] = [ox, oy, W, H]

# Front für Blender (verlustfrei, volle Auflösung)
Image.fromarray((np.clip(front, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(os.path.join(args.work, 'front.png'))
print('FRONT', front.shape)

# ---------------------------------------------------------------- Website-Ebenen
lw, lh = round(CW * WEB_SCALE), round(CH * WEB_SCALE)
save(resize(gold, lw, lh), os.path.join(args.web, 'light-gold.webp'), 82)
save(resize(cyan, lw, lh), os.path.join(args.web, 'light-cyan.webp'), 82)

KEY_W = 200   # Tasten: 416 x 320 im Paket -> 200 px breit (reicht für 2x bei max. Gerätegröße)
KEYS = ['previous', 'play', 'pause', 'stop', 'next', 'shuffle', 'settings', 'playlist']
for name in KEYS:
    for state in ('normal', 'hover', 'pressed'):
        img = load(f'buttons/{name}-{state}.png')
        save(resize(img, KEY_W, round(KEY_W * img.shape[0] / img.shape[1])), os.path.join(args.web, f'key-{name}-{state}.webp'))
for src, dst, w in (('volume/volume-track.png', 'vol-track.webp', 512), ('volume/volume-fill.png', 'vol-fill.webp', 512),
                    ('volume/slider-handle.png', 'vol-knob.webp', 96)):
    img = load(src); save(resize(img, w, round(w * img.shape[0] / img.shape[1])), os.path.join(args.web, dst))

json.dump({'canvas': [CW, CH], 'display': manifest['layout']['display'], 'display_hole': DISP,
           'controls': manifest['layout']['controls'], 'volume': manifest['layout']['volume'], 'speakers': layout_spk},
          open(os.path.join(args.work, 'pack.json'), 'w'), indent=1)
print('PACK', json.dumps(layout_spk), DISP)
