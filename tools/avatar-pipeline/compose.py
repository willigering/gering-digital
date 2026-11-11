import os, sys
from PIL import Image
O = sys.argv[1] if len(sys.argv) > 1 else 'out'
ORDER = ['effects-back', 'bases', 'clothes', 'face-beard', 'face-eyes', 'face-brow', 'hair', 'face-glasses', 'acc', 'headwear', 'effects-front', 'frames']
cache = {}
def L(path):
    if path not in cache:
        cache[path] = Image.open(os.path.join(O, path + '.png')).convert('RGBA')
    return cache[path]
def compose(layers, bg=(10, 18, 24, 255)):
    im = Image.new('RGBA', (1024, 1024), bg)
    for p in layers:
        if p: im.alpha_composite(L(p))
    return im
