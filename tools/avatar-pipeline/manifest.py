"""Writes assets/avatars/manifest.json: ids, files, layer order, slots and unlock rules of the DAU-TO-PRO avatar system.
Unlock rules: {"level": n} | {"achievement": "code"} | {"achievements": n} | {"any": [rule, ...]}; missing = free.
"""
import json, os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '../../assets/avatars')
BASES = [
    ('m1', 'Kante', 'm'), ('m2', 'Brummbär', 'm'), ('m3', 'Skeptiker', 'm'),
    ('f1', 'Strahlefrau', 'f'), ('f2', 'Sonnenschein', 'f'), ('f3', 'Diva', 'f'),
]
L = lambda n: {'level': n}
A = lambda c: {'achievement': c}
N = lambda n: {'achievements': n}
ANY = lambda *r: {'any': list(r)}
def it(i, label, file=None, unlock=None, **kw):
    d = {'id': i, 'label': label}
    if file: d['file'] = file
    if unlock: d['unlock'] = unlock
    d.update(kw)
    return d
slots = {
    'base': {'label': 'Typ', 'layer': 'base', 'required': True, 'items': [
        it(b, name, f'bases/{b}', presentation=p) for b, name, p in BASES]},
    'hair': {'label': 'Frisur', 'layer': 'hair', 'items': [
        it('none', 'Glatze'),
        it('undercut', 'Undercut', 'hair/undercut-{hairColor}'),
        it('bob', 'Bob', 'hair/bob-{hairColor}'),
        it('long', 'Lange Mähne', 'hair/long-{hairColor}'),
        it('afro', 'Afro', 'hair/afro-{hairColor}'),
        it('buns', 'Space Buns', 'hair/buns-{hairColor}'),
        it('mohawk', 'Iro', 'hair/mohawk-{hairColor}', unlock=L(5)),
    ]},
    'hairColor': {'label': 'Haarfarbe', 'layer': None, 'required': True, 'items': [
        it('braun', 'Braun', swatch='#5a3a22'), it('schwarz', 'Schwarz', swatch='#26242a'),
        it('blond', 'Blond', swatch='#d6aa5c'), it('kupfer', 'Kupfer', swatch='#b0481e', unlock=L(3)),
        it('cyan', 'Neon-Cyan', swatch='#18b6d6', unlock=ANY(L(10), N(12))),
    ]},
    'eyes': {'label': 'Augen', 'layer': 'eyes', 'items': [
        it('none', 'Natürlich'),
        it('neon', 'Neon-Augen', 'face/eyes-neon--{base}', unlock=L(8)),
        it('gold', 'Goldblick', 'face/eyes-gold--{base}', unlock=ANY(L(20), N(20))),
    ]},
    'brows': {'label': 'Brauen', 'layer': 'brows', 'items': [
        it('none', 'Natürlich'), it('cut', 'Brauen-Cut', 'face/brow-cut--{base}', unlock=L(2)),
    ]},
    'beard': {'label': 'Bart', 'layer': 'beard', 'items': [
        it('none', 'Ohne'), it('mustache', 'Schnauzer', 'face/mustache--{base}'),
        it('short', 'Kurzbart', 'face/beard-short--{base}'), it('full', 'Vollbart', 'face/beard-full--{base}', unlock=L(2)),
    ]},
    'glasses': {'label': 'Brille', 'layer': 'glasses', 'items': [
        it('none', 'Ohne'), it('nerd', 'Nerdbrille', 'face/glasses-nerd--{base}'),
        it('round', 'Rundbrille', 'face/glasses-round--{base}', unlock=L(3)),
        it('shades', 'PRO-Shades', 'face/shades--{base}', unlock=ANY(L(10), A('g.nachteule'))),
    ]},
    'clothes': {'label': 'Outfit', 'layer': 'clothes', 'required': True, 'items': [
        it('tee-pilz', 'Pilz-Shirt', 'clothes/tee-pilz'), it('tee-circuit', 'Platinen-Shirt', 'clothes/tee-circuit'),
        it('hoodie', 'Neon-Hoodie', 'clothes/hoodie', unlock=L(2)),
        it('jacket', 'Tech-Jacke', 'clothes/jacket', unlock=ANY(L(5), A('g.7tage'))),
        it('armor', 'Cyber-Rüstung', 'clothes/armor', unlock=L(15)),
        it('armor-pro', 'PRO-Rüstung', 'clothes/armor-pro', unlock=ANY(L(30), A('g.komplett'))),
    ]},
    'headwear': {'label': 'Kopf', 'layer': 'headwear', 'items': [
        it('none', 'Ohne'), it('cap', 'Cap', 'headwear/cap'),
        it('beanie', 'Beanie', 'headwear/beanie', unlock=L(3), hidesHair=True),
        it('helmet', 'Gaming-Helm', 'headwear/helmet', unlock=L(12), hidesHair=True),
        it('pilz', 'Pilzhut', 'headwear/pilz', unlock=A('g.easteregg'), hidesHair=True),
        it('crown', 'Krone', 'headwear/crown', unlock=ANY(L(40), A('g.10000'))),
    ]},
    'accessory': {'label': 'Extra', 'layer': 'accessory', 'items': [
        it('none', 'Ohne'),
        it('headset', 'Headset', 'accessories/headset', unlock=ANY(L(4), A('g.rampensau'))),
        it('visor', 'Cyber-Visor', 'accessories/visor--{base}', unlock=L(18), conflicts={'glasses': 'none'}),
        it('mask', 'LED-Maske', 'accessories/mask--{base}', unlock=ANY(L(22), A('g.30tage')), conflicts={'beard': 'none'}),
    ]},
    'effect': {'label': 'Effekt', 'layer': 'effect', 'items': [
        it('none', 'Ohne'),
        it('aura', 'Neon-Aura', 'effects/aura', unlock=L(10), layer='effectBack'),
        it('lightning', 'Blitze', 'effects/lightning', unlock=L(20), layer='effectBack'),
        it('flames', 'Flammen', 'effects/flames', unlock=ANY(L(30), A('g.30tage')), layer='effectBack'),
        it('gold', 'Goldregen', 'effects/gold', unlock=ANY(L(50), A('g.komplett')), layer='effectFront'),
    ]},
    'frame': {'label': 'Rahmen', 'layer': 'frame', 'required': True, 'items': [
        it('standard', 'Standard', 'frames/standard'), it('bronze', 'Bronze', 'frames/bronze', unlock=L(5)),
        it('silber', 'Silber', 'frames/silber', unlock=L(15)), it('gold', 'Gold', 'frames/gold', unlock=L(30)),
        it('pro', 'PRO', 'frames/pro', unlock=ANY(L(50), A('g.komplett'))),
    ]},
}
manifest = {
    'version': 1,
    'canvas': 1024,
    'crop': {'x': 152, 'y': 40, 'size': 720},
    'formats': {'png': '{file}.png', 'webp': '{file}.webp', 'thumb': '{file}-192.webp'},
    'layerOrder': ['effectBack', 'base', 'clothes', 'beard', 'eyes', 'brows', 'hair', 'glasses', 'accessory', 'headwear', 'effectFront', 'frame'],
    'categories': [
        {'id': 'typ', 'label': 'Typ', 'slots': ['base']},
        {'id': 'haare', 'label': 'Haare', 'slots': ['hair', 'hairColor']},
        {'id': 'gesicht', 'label': 'Gesicht', 'slots': ['eyes', 'brows', 'beard', 'glasses']},
        {'id': 'outfit', 'label': 'Outfit', 'slots': ['clothes']},
        {'id': 'kopf', 'label': 'Kopf', 'slots': ['headwear']},
        {'id': 'extras', 'label': 'Extras', 'slots': ['accessory']},
        {'id': 'effekte', 'label': 'Effekte', 'slots': ['effect']},
        {'id': 'rahmen', 'label': 'Rahmen', 'slots': ['frame']},
    ],
    'slots': slots,
    'default': {'base': 'm1', 'hair': 'undercut', 'hairColor': 'braun', 'eyes': 'none', 'brows': 'none', 'beard': 'none',
                'glasses': 'none', 'clothes': 'tee-pilz', 'headwear': 'none', 'accessory': 'none', 'effect': 'none', 'frame': 'standard'},
    'baseDefaults': {'m1': {'hair': 'undercut'}, 'm2': {'hair': 'afro', 'hairColor': 'schwarz'}, 'm3': {'hair': 'undercut', 'hairColor': 'schwarz'},
                     'f1': {'hair': 'long', 'hairColor': 'schwarz'}, 'f2': {'hair': 'bob', 'hairColor': 'blond'}, 'f3': {'hair': 'buns', 'hairColor': 'schwarz'}},
}
os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
    f.write('\n')
print('manifest', sum(len(s['items']) for s in slots.values()), 'items')
