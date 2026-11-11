"""Hand-measured face landmarks on the normalised 1024 canvas, plus fits from m1.

Auto-detected sclera often latches onto forehead highlights or teeth, so visors
and glasses landed too high and too narrow on the rounder faces (m2, f2).
These coordinates were measured on the production bases after normalisation.
"""
from pathlib import Path
import numpy as np, cv2
from PIL import Image

BASES = ['m1', 'm2', 'm3', 'f1', 'f2', 'f3']

# Pupils (left, right), mouth mid-line, chin tip — post-normalisation 1024 canvas.
MEASURED = {
    'm1': dict(eyes=[(456, 342), (626, 341)], mouth=508, chin=648),
    'm2': dict(eyes=[(452, 356), (638, 356)], mouth=488, chin=638),
    'm3': dict(eyes=[(456, 358), (626, 357)], mouth=502, chin=622),
    'f1': dict(eyes=[(458, 368), (630, 368)], mouth=504, chin=636),
    'f2': dict(eyes=[(450, 342), (640, 344)], mouth=478, chin=630),
    'f3': dict(eyes=[(462, 358), (644, 358)], mouth=504, chin=600),
}

def eye_stats(b):
    (x1, y1), (x2, y2) = MEASURED[b]['eyes']
    return (x1 + x2) / 2, (y1 + y2) / 2, abs(x2 - x1)

def affine(img, M):
    a = np.array(img.convert('RGBA')).astype(np.float32)
    rgb = cv2.warpAffine(a[..., :3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    al = cv2.warpAffine(a[..., 3], M, (1024, 1024), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    return Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), 'RGBA')

def _width_at(alpha, y):
    y = int(np.clip(round(y), 0, 1023))
    xs = np.where(alpha[y])[0]
    if len(xs) == 0:
        return 0
    return int(xs[-1] - xs[0])

def load_alpha(base_img):
    return np.array(base_img.convert('RGBA'))[..., 3] > 128

def fit_upper_from_m1(img_m1, b):
    """Glasses / visor: scale by inter-pupil distance, pin the eye line."""
    if b == 'm1':
        return img_m1
    cx0, ey0, ipd0 = eye_stats('m1')
    cx, ey, ipd = eye_stats(b)
    s = ipd / ipd0
    return affine(img_m1, np.float32([[s, 0, cx - cx0 * s], [0, s, ey - ey0 * s]]))

def fit_lower_from_m1(img_m1, b, alpha_m1, alpha_b):
    """Masks: mid-face width (nose + a softened mouth width), nearly uniform scale, mouth-anchored."""
    if b == 'm1':
        return img_m1
    cx0, ey0, ipd0 = eye_stats('m1')
    cx, ey, ipd = eye_stats(b)
    m0, c0 = MEASURED['m1']['mouth'], MEASURED['m1']['chin']
    m, c = MEASURED[b]['mouth'], MEASURED[b]['chin']
    n0 = ey0 + (m0 - ey0) * 0.45
    n = ey + (m - ey) * 0.45
    w_nose = _width_at(alpha_b, n) / max(_width_at(alpha_m1, n0), 1)
    w_mouth = _width_at(alpha_b, m) / max(_width_at(alpha_m1, m0), 1)
    w_ipd = ipd / ipd0
    sx = max(w_nose, 0.65 * w_mouth + 0.35 * w_ipd)
    sy_raw = (c - m) / max(c0 - m0, 1)
    sy = 0.7 * sx + 0.3 * sy_raw
    sy = min(max(sy, sx * 0.92), sx * 1.12)
    return affine(img_m1, np.float32([[sx, 0, cx - cx0 * sx], [0, sy, m - m0 * sy]]))

def fit_headset_from_m1(img_m1, b, alpha_m1, alpha_b):
    """Scale around the crown so the headband stays put and the cups follow ear width."""
    if b == 'm1':
        return img_m1
    cx0, _, _ = eye_stats('m1')
    cx, _, _ = eye_stats(b)
    w0 = _width_at(alpha_m1, 360)
    w = _width_at(alpha_b, 360)
    s = 1 + (w / max(w0, 1) - 1) * 0.85
    crown_y = 130
    return affine(img_m1, np.float32([[s, 0, cx - cx0 * s], [0, s, crown_y - crown_y * s]]))

def save_layer(img, dest_dir, ident):
    dest_dir = Path(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    img = img.convert('RGBA')
    a = np.array(img)
    a[a[..., 3] == 0, :3] = 0
    img = Image.fromarray(a, 'RGBA')
    img.save(dest_dir / f'{ident}.png', compress_level=9)
    img.resize((512, 512), Image.LANCZOS).save(dest_dir / f'{ident}.webp', 'WEBP', quality=88, method=6)
    img.resize((192, 192), Image.LANCZOS).save(dest_dir / f'{ident}-192.webp', 'WEBP', quality=86, method=6)
    return f'{dest_dir.name}/{ident}'

def refit_output(out_dir, written=None):
    """Rebuild per-base visor, glasses, shades, mask and headset from the m1 layers in out_dir."""
    out_dir = Path(out_dir)
    written = list(written or [])
    bases = {b: Image.open(out_dir / 'bases' / f'{b}.png') for b in BASES}
    alphas = {b: load_alpha(bases[b]) for b in BASES}

    def grab(cat, ident):
        p = out_dir / cat / f'{ident}.png'
        if not p.exists():
            raise FileNotFoundError(p)
        return Image.open(p).convert('RGBA')

    upper = {
        ('accessories', 'visor'): grab('accessories', 'visor--m1'),
        ('face', 'glasses-nerd'): grab('face', 'glasses-nerd--m1'),
        ('face', 'glasses-round'): grab('face', 'glasses-round--m1'),
        ('face', 'shades'): grab('face', 'shades--m1'),
    }
    mask_m1 = grab('accessories', 'mask--m1')
    headset_src = out_dir / 'accessories' / 'headset--m1.png'
    if not headset_src.exists():
        headset_src = out_dir / 'accessories' / 'headset.png'
    headset_m1 = Image.open(headset_src).convert('RGBA')

    for b in BASES:
        for (cat, name), src in upper.items():
            ident = f'{name}--{b}'
            ident_written = save_layer(fit_upper_from_m1(src, b), out_dir / cat, ident)
            if ident_written not in written:
                written.append(ident_written)
        ident_written = save_layer(fit_lower_from_m1(mask_m1, b, alphas['m1'], alphas[b]), out_dir / 'accessories', f'mask--{b}')
        if ident_written not in written:
            written.append(ident_written)
        ident_written = save_layer(fit_headset_from_m1(headset_m1, b, alphas['m1'], alphas[b]), out_dir / 'accessories', f'headset--{b}')
        if ident_written not in written:
            written.append(ident_written)

    # shared headset is replaced by per-base layers
    for ext in ('.png', '.webp', '-192.webp'):
        p = out_dir / 'accessories' / f'headset{ext}'
        if p.exists():
            p.unlink()
    written[:] = [w for w in written if w != 'accessories/headset']
    return written
