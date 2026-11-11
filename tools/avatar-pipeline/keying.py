"""Chroma-key helpers for DAU-to-PRO avatar layers.
Background: magenta (#ff00ff). Mannequin body (item layers): chroma green."""
import numpy as np, cv2
from PIL import Image

def load(path):
    im = Image.open(path).convert('RGB')
    if im.size != (1024, 1024):
        im = im.resize((1024, 1024), Image.LANCZOS)
    return np.array(im).astype(np.float32)

def hsv(a):
    h = cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    return h[..., 0] * 360 / 256, h[..., 1] / 255, h[..., 2] / 255

def magenta_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h, s, v = hsv(a)
    return ((h > 280) & (h < 335) & (s > 0.45) & (v > 0.35)) | ((r > 150) & (b > 120) & (g < 0.55 * np.minimum(r, b)))

def green_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    h, s, v = hsv(a)
    return (h > 85) & (h < 160) & (s > 0.42) & (g > 1.25 * np.maximum(r, b))

def despill(a):
    out = a.copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    # magenta spill: r and b both far above g
    m = np.minimum(r, b)
    spill = np.clip(m - np.maximum(g, 0) - 40, 0, None)
    pink = (r > g + 50) & (b > g + 50)
    out[..., 0] = np.where(pink, r - spill * 0.8, r)
    out[..., 2] = np.where(pink, b - spill * 0.8, b)
    return out

def alpha_from_keep(keep, erode=1, feather=1.2, min_area=600):
    k = keep.astype(np.uint8)
    k = cv2.morphologyEx(k, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(k, 8)
    clean = np.zeros_like(k)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            clean[lab == i] = 1
    # fill small holes
    inv = 1 - clean
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, 4)
    for i in range(1, n2):
        if st2[i, cv2.CC_STAT_AREA] < 250:
            clean[lab2 == i] = 1
    if erode:
        clean = cv2.erode(clean, np.ones((3, 3), np.uint8), iterations=erode)
    al = cv2.GaussianBlur(clean.astype(np.float32), (0, 0), feather)
    return np.clip(al * 1.15, 0, 1)

def to_rgba(a, alpha):
    rgba = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')

def extract_character(path):
    a = load(path)
    keep = ~magenta_mask(a)
    return to_rgba(despill(a), alpha_from_keep(keep, min_area=5000))

def extract_item(path, min_area=400, extra_drop=None):
    a = load(path)
    keep = ~(magenta_mask(a) | green_mask(a))
    if extra_drop is not None:
        keep &= ~extra_drop(a)
    a2 = despill(a)
    # green spill on item edges
    r, g, b = a2[..., 0], a2[..., 1], a2[..., 2]
    gs = g > np.maximum(r, b) + 25
    a2[..., 1] = np.where(gs, np.maximum(r, b) + 25, g)
    return to_rgba(a2, alpha_from_keep(keep, min_area=min_area))

_TEMPLATE = None
def template_mask():
    global _TEMPLATE
    if _TEMPLATE is None:
        import os
        a = load(os.path.join(os.path.dirname(__file__), '..', 'raw', 'mannequin.jpg'))
        bg = (a[..., 1] > 180) & (a[..., 0] < 120) & (a[..., 2] < 120)
        _TEMPLATE = (~bg).astype(np.float32)
    return _TEMPLATE

def register_item(a, item_keep):
    """Similarity transform (scale about canvas centre + shift) mapping template coords -> input coords.
    Brute-force fit of this generation's green mannequin onto the template mannequin, ignoring item pixels."""
    body = green_mask(a)
    tmpl = template_mask() > 0.5
    valid = cv2.dilate(item_keep.astype(np.uint8), np.ones((21, 21), np.uint8)) == 0
    def at(res):
        f = res / 1024
        rs = lambda m: cv2.resize(m.astype(np.uint8), (res, res), interpolation=cv2.INTER_NEAREST).astype(bool)
        return rs(body), rs(tmpl), rs(valid), f
    def score(B, T, V, sc, dx, dy, res):
        c = res / 2
        M = np.float32([[sc, 0, c - sc * c + dx], [0, sc, c - sc * c + dy]])  # template->input
        Tw = cv2.warpAffine(T.astype(np.uint8), M, (res, res), flags=cv2.INTER_NEAREST).astype(bool)
        return np.count_nonzero((Tw ^ B) & V) / V.size + abs(sc - 1) * 1e-4 + (abs(dx) + abs(dy)) / res * 1e-4
    B, T, V, f = at(256)
    best = (9, 1, 0, 0)
    for sc in np.linspace(0.86, 1.06, 11):
        for dx in range(-16, 17):
            for dy in range(-6, 30):
                s = score(B, T, V, sc, dx, dy, 256)
                if s < best[0]: best = (s, sc, dx, dy)
    _, sc, dx, dy = best
    B, T, V, f = at(512)
    best2 = (9, sc, dx * 2, dy * 2)
    for sc2 in np.linspace(sc - 0.02, sc + 0.02, 5):
        for ddx in range(-2, 3):
            for ddy in range(-2, 3):
                s = score(B, T, V, sc2, dx * 2 + ddx, dy * 2 + ddy, 512)
                if s < best2[0]: best2 = (s, sc2, dx * 2 + ddx, dy * 2 + ddy)
    s, sc, dx, dy = best2
    dx *= 2; dy *= 2
    c = 512
    return np.float32([[sc, 0, c - sc * c + dx], [0, sc, c - sc * c + dy]]), s

def extract_item_registered(path, min_area=400, register=True):
    a = load(path)
    mag = magenta_mask(a); grn = green_mask(a)
    keep = ~(mag | grn)
    # rim-light lines that the renderer drew along the mannequin outline (cyan left / yellow-green right)
    h, s, v = hsv(a)
    near = lambda m, r: cv2.dilate(m.astype(np.uint8), np.ones((r, r), np.uint8)).astype(bool)
    rim = near(grn, 25) & near(mag, 25) & (h > 40) & (h < 215) & (s > 0.25)
    keep &= ~rim
    a2 = despill(a)
    r, g, b = a2[..., 0], a2[..., 1], a2[..., 2]
    gs = g > np.maximum(r, b) + 25
    a2[..., 1] = np.where(gs, np.maximum(r, b) + 25, g)
    al = alpha_from_keep(keep, min_area=min_area)
    warp, err = register_item(a, keep) if register else (np.eye(2, 3, dtype=np.float32), 0)
    print('  reg', np.round(warp, 3).tolist(), 'err', round(float(err), 4))
    flags = cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP
    a3 = cv2.warpAffine(a2, warp, (1024, 1024), flags=flags, borderMode=cv2.BORDER_REPLICATE)
    al3 = cv2.warpAffine(al, warp, (1024, 1024), flags=flags, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    return to_rgba(a3, al3), warp
