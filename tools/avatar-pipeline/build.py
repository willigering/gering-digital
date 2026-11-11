"""Build every DAU-to-PRO avatar layer onto the shared 1024x1024 canvas.

Inputs: raw generations in ../raw (chroma green mannequin on magenta, or VFX on black).
Outputs: <repo>/assets/avatars/<category>/<id>.png (1024 master) + <id>.webp (512) + <id>-192.webp.
"""
import json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from keying import *

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', 'raw')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'out')
TOP, CX = 110, 510                      # canonical skull top / head centre of the template camera
EYE0, MOUTH0, CHIN0, CX0, FW0 = 385, 530, 655, 511, 385   # template face frame
BASES = ['m1', 'm2', 'm3', 'f1', 'f2', 'f3']
# Manually measured on the raw generations (before normalisation): mouth centre y, chin y, optional eye override
FACE = {
    'm1': dict(mouth=492, chin=645),
    'm2': dict(mouth=500, chin=688),
    'm3': dict(mouth=505, chin=630, eyes=[(495, 342), (640, 350)]),
    'f1': dict(mouth=515, chin=635),
    'f2': dict(mouth=494, chin=632),
    'f3': dict(mouth=514, chin=612),
}
written = []

def raw(name):
    for ext in ('.jpg', '.png'):
        p = os.path.join(RAW, name + ext)
        if os.path.exists(p):
            return p
    raise FileNotFoundError(name)

def save(img, cat, ident):
    d = os.path.join(OUT, cat)
    os.makedirs(d, exist_ok=True)
    img = img.convert('RGBA')
    assert img.size == (1024, 1024)
    # fully transparent pixels carry no colour (smaller files, no fringes)
    a = np.array(img); a[a[..., 3] == 0, :3] = 0; img = Image.fromarray(a, 'RGBA')
    img.save(os.path.join(d, ident + '.png'), compress_level=9)
    img.resize((512, 512), Image.LANCZOS).save(os.path.join(d, ident + '.webp'), 'WEBP', quality=88, method=6)
    img.resize((192, 192), Image.LANCZOS).save(os.path.join(d, ident + '-192.webp'), 'WEBP', quality=86, method=6)
    written.append(f'{cat}/{ident}')

def shift_rgba(img, dx, dy):
    a = np.array(img).astype(np.float32)
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    rgb = cv2.warpAffine(a[..., :3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    al = cv2.warpAffine(a[..., 3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    if dy < 0:  # body continues below the frame: extend the last rows
        h = int(np.ceil(-dy)) + 1
        al[-h:] = a[-1:, :, 3].repeat(h, 0) if dx == 0 else al[-h - 1:-h].repeat(h, 0)
    return Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), 'RGBA')

def detect_eyes(img):
    a = np.array(img.convert('RGB')).astype(np.float32)
    h, s, v = hsv(a)
    m = np.zeros(a.shape[:2], bool)
    m[280:440, 380:720] = ((v > 0.78) & (s < 0.25))[280:440, 380:720]
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    idx = sorted(range(1, n), key=lambda i: -st[i, 4])[:2]
    return sorted([tuple(cen[i]) for i in idx]), lab, idx

# ------------------------------------------------------------------ bases
anchors = {}
base_imgs = {}
for b in BASES:
    im = extract_character(raw('base-' + b))
    al = np.array(im)[..., 3] > 128
    top = np.where(al.any(1))[0][0]
    xs = np.where(al[top + 120])[0]
    dx, dy = CX - (xs[0] + xs[-1]) / 2, TOP - top
    im = shift_rgba(im, round(dx), round(dy))
    base_imgs[b] = im
    save(im, 'bases', b)
    f = FACE[b]
    eyes = [(x + dx, y + dy) for x, y in f['eyes']] if 'eyes' in f else detect_eyes(im)[0]
    eye_y = (eyes[0][1] + eyes[1][1]) / 2
    al = np.array(im)[..., 3] > 128
    row = np.where(al[int(eye_y - 70)])[0]
    anchors[b] = dict(eyes=[[round(x), round(y)] for x, y in eyes], eye_y=round(eye_y), cx=round((eyes[0][0] + eyes[1][0]) / 2),
                      mouth=round(f['mouth'] + dy), chin=round(f['chin'] + dy), fw=int(row[-1] - row[0]))
print(json.dumps(anchors))

# ------------------------------------------------------------------ helpers for item layers
def fill_enclosed(img):
    """Garment interiors (behind the neck) that showed background: paint them as dark fabric."""
    a = np.array(img).astype(np.float32)
    al = a[..., 3] > 30
    inv = (~al).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(inv, 4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
    hole = np.zeros(al.shape, bool)
    for i in range(1, n):
        if i not in border and st[i, cv2.CC_STAT_TOP] > 450:
            hole |= lab == i
    if hole.any():
        rgb = a[..., :3].astype(np.uint8)
        filled = cv2.inpaint(rgb, hole.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA).astype(np.float32) * 0.45
        a[hole, :3] = filled[hole]
        a[hole, 3] = 255
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

def item(name, **kw):
    img, _ = extract_item_registered(raw(name), **kw)
    return img

def affine(img, M):
    a = np.array(img).astype(np.float32)
    rgb = cv2.warpAffine(a[..., :3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    al = cv2.warpAffine(a[..., 3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    return Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), 'RGBA')

def fit_upper(img, b):
    """Glasses / visor: uniform scale by face width, anchored on the eye line."""
    A = anchors[b]; s = A['fw'] / FW0
    return affine(img, np.float32([[s, 0, A['cx'] - CX0 * s], [0, s, A['eye_y'] - EYE0 * s]]))

def fit_lower(img, b):
    """Beards / masks: x by face width around the eye midpoint, y from mouth to chin."""
    A = anchors[b]; sx = A['fw'] / FW0; sy = (A['chin'] - A['mouth']) / (CHIN0 - MOUTH0)
    sy = (sy + sx) / 2 if sy > sx else sy
    return affine(img, np.float32([[sx, 0, A['cx'] - CX0 * sx], [0, sy, A['mouth'] - MOUTH0 * sy]]))

# ------------------------------------------------------------------ hair (+ colours)
HAIR = ['undercut', 'afro', 'bob', 'long', 'mohawk', 'buns']
COLOURS = {  # gradient maps: shadow, mid, highlight
    'braun': None,
    'schwarz': [(10, 10, 14), (38, 36, 42), (120, 118, 130)],
    'blond': [(92, 62, 28), (214, 170, 92), (255, 236, 178)],
    'kupfer': [(70, 22, 10), (176, 72, 30), (255, 168, 104)],
    'cyan': [(6, 46, 66), (24, 182, 214), (190, 252, 255)],
}
def recolour(img, ramp):
    if ramp is None:
        return img
    a = np.array(img).astype(np.float32)
    lum = (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]) / 255
    lo, hi = np.percentile(lum[a[..., 3] > 200], [3, 98])
    t = np.clip((lum - lo) / max(1e-3, hi - lo), 0, 1)
    c = np.array(ramp, np.float32)
    out = np.where(t[..., None] < 0.5, c[0] + (c[1] - c[0]) * (t[..., None] * 2), c[1] + (c[2] - c[1]) * ((t[..., None] - 0.5) * 2))
    a[..., :3] = out
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

for h in HAIR:
    src = item('hair-' + h)
    for col, ramp in COLOURS.items():
        save(recolour(src, ramp), 'hair', f'{h}-{col}')

# ------------------------------------------------------------------ clothes, headwear, accessories
for c in ['hoodie', 'tee-pilz', 'tee-circuit', 'jacket', 'armor', 'armor-pro']:
    save(fill_enclosed(item('clothes-' + c)), 'clothes', c)
for c in ['cap', 'helmet', 'crown', 'beanie', 'pilz']:
    save(item('head-' + c), 'headwear', c)
save(item('acc-headset'), 'accessories', 'headset')
visor = item('acc-visor'); mask = item('acc-mask')
for b in BASES:
    save(fit_upper(visor, b), 'accessories', f'visor--{b}')
    save(fit_lower(mask, b), 'accessories', f'mask--{b}')

# ------------------------------------------------------------------ face: beards, glasses (fitted per base)
def clip_to_base(img, b, grow=3):
    """Facial hair may never float outside the head silhouette of the base it was fitted to."""
    a = np.array(img).astype(np.float32)
    ba = (np.array(base_imgs[b])[..., 3] > 128).astype(np.uint8)
    ba = cv2.erode(ba, np.ones((5, 5), np.uint8)) if grow < 0 else cv2.dilate(ba, np.ones((grow * 2 + 1,) * 2, np.uint8))
    a[..., 3] *= cv2.GaussianBlur(ba.astype(np.float32), (0, 0), 1.2)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')

for f in ['beard-full', 'beard-short', 'mustache']:
    src = item('face-' + f)
    for b in BASES:
        save(clip_to_base(fit_lower(src, b), b, grow=-1), 'face', f'{f}--{b}')
def trim_glasses(img):
    """Drop temple arms / stray rim pieces hanging below the lenses."""
    a = np.array(img)
    al = a[..., 3] > 128
    width = al.sum(1)
    rows = np.where(width > 0.35 * width.max())[0]
    bottom = rows.max() + 14
    a[bottom:, :, 3] = 0
    return Image.fromarray(a, 'RGBA')

for f in ['glasses-nerd', 'glasses-round', 'shades']:
    src = trim_glasses(item('face-' + f))
    for b in BASES:
        save(fit_upper(src, b), 'face', f'{f}--{b}')

# ------------------------------------------------------------------ face: eyes + brows, derived from each base's own pixels
def eye_layer(b, colour):
    """Recolours the base's own irises (found between the eye whites) and adds a soft neon halo."""
    im = base_imgs[b]
    a = np.array(im.convert('RGB')).astype(np.float32)
    h, s, v = hsv(a)
    out = np.zeros((1024, 1024, 4), np.float32)
    iris = np.zeros(a.shape[:2], bool)
    for x, y in anchors[b]['eyes']:
        region = np.zeros(a.shape[:2], bool)
        region[int(y) - 30:int(y) + 30, int(x) - 62:int(x) + 62] = True
        whites = region & (v > 0.68) & (s < 0.32)
        pts = np.argwhere(whites)[:, ::-1].astype(np.int32)
        if len(pts) < 30:
            continue
        opening = np.zeros(a.shape[:2], np.uint8)
        cv2.fillConvexPoly(opening, cv2.convexHull(pts), 1)
        opening = cv2.erode(opening, np.ones((3, 3), np.uint8)).astype(bool)
        iris |= opening & (v < 0.55) & ~whites
    iris = cv2.morphologyEx(iris.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    lum = v[..., None]
    col = np.array(colour, np.float32)
    glowcol = col * (0.55 + 0.9 * lum) + 60 * (lum > 0.8)
    out[iris, :3] = glowcol[iris]
    out[iris, 3] = 225
    halo = cv2.GaussianBlur(iris.astype(np.float32), (0, 0), 7) * 0.5
    keep = ~iris & (halo > 0.02)
    out[keep, :3] = col
    out[keep, 3] = halo[keep] * 255
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')

def brow_layer(b):
    im = base_imgs[b]
    a = np.array(im.convert('RGB')).astype(np.float32)
    h, s, v = hsv(a)
    (x, y), _ = anchors[b]['eyes'][0], None
    region = np.zeros(a.shape[:2], bool); region[int(y) - 90:int(y) - 18, int(x) - 70:int(x) + 70] = True
    skin = np.median(a[int(y) - 125:int(y) - 100, int(x) - 30:int(x) + 30].reshape(-1, 3), 0)
    lum_skin = skin.mean() / 255
    brow = region & (v < lum_skin * 0.62)
    brow = cv2.morphologyEx(brow.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(bool)
    ys, xs = np.where(brow)
    out = np.zeros((1024, 1024, 4), np.uint8)
    if len(xs) < 50:
        return Image.fromarray(out, 'RGBA')
    cx = int(np.percentile(xs, 62))
    stripes = np.zeros(a.shape[:2], np.uint8)
    for off in (0, 17):
        cv2.line(stripes, (cx + off - 9, int(ys.max()) + 8), (cx + off + 9, int(ys.min()) - 8), 1, 6)
    cut = stripes.astype(bool) & cv2.dilate(brow.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    shade = a[int(y) - 120:int(y) - 95, int(x) - 30:int(x) + 30].reshape(-1, 3).mean(0) * 0.94
    out[cut, :3] = shade.astype(np.uint8); out[cut, 3] = 255
    o = Image.fromarray(out, 'RGBA').filter(ImageFilter.GaussianBlur(0.7))
    return o

for b in BASES:
    save(eye_layer(b, (40, 226, 255)), 'face', f'eyes-neon--{b}')
    save(eye_layer(b, (240, 184, 74)), 'face', f'eyes-gold--{b}')
    save(brow_layer(b), 'face', f'brow-cut--{b}')

# ------------------------------------------------------------------ effects (VFX on black -> alpha)
def vfx(name, cut_silhouette=True, gain=1.0):
    a = load(raw(name))
    sil = (np.abs(a - np.array([38, 44, 52], np.float32)).max(-1) < 14)
    sil = cv2.morphologyEx(sil.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    m = a.max(-1)
    al = np.clip((m - 18) / 210 * gain, 0, 1)
    if cut_silhouette:
        al[cv2.dilate(sil.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)] = 0
    rgb = np.where(al[..., None] > 0.004, np.clip(a / np.maximum(al[..., None], 1e-3) * 0.92, 0, 255), 0)
    rgb = np.minimum(rgb, 255)
    return to_rgba(rgb, al)
save(vfx('fx-aura', gain=1.25), 'effects', 'aura')
save(vfx('fx-lightning', gain=1.15), 'effects', 'lightning')
save(vfx('fx-flames', gain=1.1), 'effects', 'flames')
save(vfx('fx-gold', gain=1.2), 'effects', 'gold')

# ------------------------------------------------------------------ frames: exact hexagon of the scoreboard clip-path
HEX = [(0.50, 0.0), (0.98, 0.25), (0.98, 0.75), (0.50, 1.0), (0.02, 0.75), (0.02, 0.25)]
FRAMES = {
    'standard': dict(stops=[(60, 78, 90), (150, 176, 188), (40, 56, 66)], inner=(80, 220, 240), glow=0.0),
    'bronze': dict(stops=[(92, 46, 22), (232, 152, 96), (120, 62, 30)], inner=(255, 196, 150), glow=0.0),
    'silber': dict(stops=[(98, 112, 124), (238, 246, 252), (120, 134, 146)], inner=(200, 240, 255), glow=0.15),
    'gold': dict(stops=[(130, 82, 16), (255, 222, 132), (160, 104, 22)], inner=(255, 236, 170), glow=0.3),
    'pro': dict(stops=[(150, 98, 20), (255, 232, 150), (176, 116, 26)], inner=(78, 232, 255), glow=0.75),
}
def hex_poly(S, inset):
    c = S / 2
    pts = []
    for x, y in HEX:
        px, py = x * S, y * S
        vx, vy = px - c, py - c
        d = (vx * vx + vy * vy) ** 0.5
        pts.append((px - vx / d * inset, py - vy / d * inset))
    return pts
def frame(spec, pro=False):
    S = 2048  # supersampled
    ring = Image.new('L', (S, S), 0); d = ImageDraw.Draw(ring)
    d.polygon(hex_poly(S, 0), fill=255); d.polygon(hex_poly(S, 64), fill=0)
    ring = np.array(ring).astype(np.float32) / 255
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    t = np.clip(0.5 + 0.5 * np.sin((xx * 0.7 + yy * 1.3) * np.pi * 1.6), 0, 1)
    st = np.array(spec['stops'], np.float32)
    col = np.where(t[..., None] < 0.5, st[0] + (st[1] - st[0]) * t[..., None] * 2, st[1] + (st[2] - st[1]) * (t[..., None] - 0.5) * 2)
    # bevel: lighten outer edge, darken inner edge
    dist = cv2.distanceTransform((ring > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    bevel = np.clip(dist / 32, 0, 1)
    col = col * (0.78 + 0.35 * (1 - np.abs(bevel - 0.45) * 1.6)[..., None])
    rgba = np.zeros((S, S, 4), np.float32)
    rgba[..., :3] = col; rgba[..., 3] = ring * 255
    # dark separating contour + inner neon line
    cont = Image.new('L', (S, S), 0); dc = ImageDraw.Draw(cont)
    dc.polygon(hex_poly(S, 2), outline=255, width=8); dc.polygon(hex_poly(S, 64), outline=255, width=10)
    cont = np.array(cont).astype(bool)
    rgba[cont, :3] = (6, 12, 16); rgba[cont, 3] = 255
    inner = Image.new('L', (S, S), 0); di = ImageDraw.Draw(inner)
    di.polygon(hex_poly(S, 80), outline=255, width=7)
    inner = np.array(inner).astype(np.float32) / 255
    glow = cv2.GaussianBlur(inner, (0, 0), 14) * (0.5 + spec['glow'])
    ic = np.array(spec['inner'], np.float32)
    a_in = np.clip(inner * 0.95 + glow * 0.8, 0, 1)
    rgba[..., :3] = np.where(a_in[..., None] > 0, (rgba[..., :3] * (rgba[..., 3:] / 255) * (1 - a_in[..., None]) + ic * a_in[..., None]) / np.maximum(1e-3, (rgba[..., 3:] / 255) * (1 - a_in[..., None]) + a_in[..., None]), rgba[..., :3])
    rgba[..., 3] = np.maximum(rgba[..., 3], a_in * 255)
    # corner rivets / PRO studs
    rv = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dr = ImageDraw.Draw(rv)
    for (x, y) in hex_poly(S, 32):
        r = 22 if not pro else 28
        dr.ellipse([x - r, y - r, x + r, y + r], fill=(*[int(v) for v in st[1]], 255), outline=(6, 12, 16, 255), width=6)
        if pro:
            dr.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(78, 232, 255, 255))
    base = Image.fromarray(rgba.clip(0, 255).astype(np.uint8), 'RGBA')
    base.alpha_composite(rv)
    if pro:
        # cyan circuit ticks along the long edges
        tk = Image.new('RGBA', (S, S), (0, 0, 0, 0)); dt = ImageDraw.Draw(tk)
        for fy in (0.38, 0.5, 0.62):
            for x0 in (0.02 * S + 18, 0.98 * S - 46):
                dt.rectangle([x0, fy * S - 6, x0 + 28, fy * S + 6], fill=(78, 232, 255, 255))
        base.alpha_composite(tk)
    return base.resize((1024, 1024), Image.LANCZOS)
for k, spec in FRAMES.items():
    save(frame(spec, pro=(k == 'pro')), 'frames', k)

json.dump(anchors, open(os.path.join(OUT, 'anchors.json'), 'w'), indent=1)
print('wrote', len(written), 'layers')
