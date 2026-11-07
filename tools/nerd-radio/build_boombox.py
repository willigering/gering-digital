"""NERD RADIO – 3D-Ghettoblaster aus dem Grafikpaket bauen und für die Website rendern.

Vorher: python tools/nerd-radio/prepare_pack.py --pack <nerd-radio-pack>   (erzeugt .work/front.png und .work/pack.json)
Aufruf (Blender 5.x, Cycles):
  blender -b --factory-startup --python tools/nerd-radio/build_boombox.py -- --out dau-to-pro/nerd-radio [--work tools/nerd-radio/.work] [--preview]

Modell: Die gemalte Paket-Front (Leuchten aus) liegt als Textur auf einem Korpus, der aus ihrer Silhouette
extrudiert wird. Korpus und Logo-Schild haben volle Tiefe, der Griff sitzt zurückversetzt. Die Front wird
unverändert wiedergegeben (Farben 1:1 aus dem Paket). Seiten, Ober-/Unterseite und Rückwand tragen die Flächen
aus dem Ergänzungspaket (nerd-radio-surfaces, per prepare_pack.py --surfaces), Projektion je Flächenrichtung;
ohne sie bleibt es bei schlichtem dunklem Metall.
Die Kamera schaut leicht schräg: rechte vordere Ecke näher, Gerät leicht nach hinten gekippt.

Ausgabe: base.webp / base-half.webp (Gehäuse) und layout.css (Seitenverhältnis, Eckpunkte der Frontebene
und Positionen aller Bedienelemente in Paket-Koordinaten). Tasten, Display, Regler und die Lichtebenen
(Ringe und Pilze) legt die Website per matrix3d perspektivisch exakt auf die Front.
"""
import bpy, bmesh, math, json, os, sys
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(arg('--out', 'nerd-radio-out'))
WORK = os.path.abspath(arg('--work', os.path.join(HERE, '.work')))
PREVIEW = '--preview' in argv
os.makedirs(OUT, exist_ok=True)
PACK = json.load(open(os.path.join(WORK, 'pack.json')))
CW, CH = PACK['canvas']

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- Maßstab
U = 10 / CW                              # Gerät 10 Einheiten breit
def X(px): return (px - CW / 2) * U
def Z(py): return (CH / 2 - py) * U
k = CW / 1400                            # Messraster der Vorschau (siehe prepare_pack.py)
BODY_TOP = 116 * k                       # Oberkante Korpus; darüber Griff und Logo-Schild
PLATE = (440 * k, 80 * k, 970 * k)       # Logo-Schild: x0, Oberkante, x1
DEPTH, HANDLE_FRONT, HANDLE_DEPTH = 1.7, 0.55, 0.5
SURF = PACK.get('surfaces')
if SURF:
    DEPTH = SURF['depth'] * U             # Tiefe passend zu den Gehäuseflächen (432 px bei 2910 px Breite)

# ---------------------------------------------------------------- Materialien
def nodes(mat):
    mat.use_nodes = True; nt = mat.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    return nt

img = bpy.data.images.load(os.path.join(WORK, 'front.png'))
img.colorspace_settings.name = 'sRGB'; img.alpha_mode = 'STRAIGHT'
front_mat = bpy.data.materials.new('front'); nt = nodes(front_mat)
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = img; tex.interpolation = 'Cubic'
em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(tex.outputs['Color'], em.inputs['Color'])
tr = nt.nodes.new('ShaderNodeBsdfTransparent'); mix = nt.nodes.new('ShaderNodeMixShader')
nt.links.new(tex.outputs['Alpha'], mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(mix.outputs[0], out.inputs[0])

side_mat = bpy.data.materials.new('side'); nt = nodes(side_mat)
b = nt.nodes.new('ShaderNodeBsdfPrincipled')
b.inputs['Base Color'].default_value = (0.018, 0.02, 0.023, 1); b.inputs['Metallic'].default_value = 0.85
nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18; nz.inputs['Detail'].default_value = 8
rmp = nt.nodes.new('ShaderNodeMapRange'); rmp.inputs['To Min'].default_value = 0.32; rmp.inputs['To Max'].default_value = 0.58
nt.links.new(nz.outputs['Fac'], rmp.inputs['Value']); nt.links.new(rmp.outputs['Result'], b.inputs['Roughness'])
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08
nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(b.outputs[0], o.inputs[0])

# Gehäuseflächen: Farbtextur mit eingebrannter Materialbeleuchtung, wie die Front ungeschattet wiedergegeben
# (Studiolicht würde den dunklen Lack grau überstrahlen). Je Richtung etwas dunkler, damit der Körper plastisch wirkt.
SURF_NAMES = ['side-left', 'side-right', 'top', 'bottom', 'rear']
SURF_LEVEL = {'side-left': 0.8, 'side-right': 0.8, 'top': 0.92, 'bottom': 0.55, 'rear': 0.65}
surf_mats = []
for name in (SURF_NAMES if SURF else []):
    m = bpy.data.materials.new(name); nt = nodes(m)
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(WORK, 'surfaces', f'{name}.png'))
    t.image.colorspace_settings.name = 'sRGB'; t.interpolation = 'Cubic'; t.extension = 'EXTEND'
    e = nt.nodes.new('ShaderNodeEmission'); nt.links.new(t.outputs['Color'], e.inputs['Color']); e.inputs['Strength'].default_value = SURF_LEVEL[name]
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
    surf_mats.append(m)

def surface_uv(n, co):
    """Materialindex und UV einer Außenfläche nach ihrer Richtung (Bildorientierung laut README des Ergänzungspakets)."""
    u = (co.x / U + CW / 2) / CW                         # 0 = links, 1 = rechts (wie Front)
    d = min(1.0, max(0.0, co.y / DEPTH))                 # 0 = vorne, 1 = hinten
    zt, zb = Z(SURF['body_top']), Z(SURF['body_bottom'])
    v = (co.z - zb) / (zt - zb)                          # 0 = unten, 1 = Körperoberkante
    if abs(n.x) >= max(abs(n.y), abs(n.z)):
        return (2, (1 - d, v)) if n.x < 0 else (3, (d, v))   # links: vorne rechts im Bild; rechts: vorne links
    if abs(n.z) >= abs(n.y):
        return (4, (u, d)) if n.z > 0 else (5, (u, 1 - d))   # oben: hinten am oberen Bildrand; unten: vorne oben
    return 6, (1 - u, v)                                     # Rückwand von außen: links = Front rechts

# ---------------------------------------------------------------- Korpus aus der Silhouette
px = np.array(img.pixels[:], dtype=np.float32).reshape(CH, CW, 4)[::-1]   # Blender speichert von unten nach oben
CELL = 6 if PREVIEW else 3
gh, gw = CH // CELL, CW // CELL
cov = px[:gh * CELL, :gw * CELL, 3].reshape(gh, CELL, gw, CELL).mean(axis=(1, 3))
solid = cov > 0.5
ys = (np.arange(gh) + 0.5) * CELL; xs = (np.arange(gw) + 0.5) * CELL
upper = np.broadcast_to(ys[:, None] < BODY_TOP, solid.shape)
plate = upper & (ys[:, None] >= PLATE[1]) & (xs[None, :] >= PLATE[0]) & (xs[None, :] <= PLATE[2])
parts = {'body': solid & (~upper | plate), 'handle': solid & upper & ~plate}

def slab(name, cells, front, depth, surfaces=False):
    """Zellen der Silhouette als Fläche bei Y=front anlegen und nach hinten extrudieren."""
    vid = -np.ones((gh + 1, gw + 1), np.int64); verts = []
    rr, cc = np.nonzero(cells)
    for r, c in zip(rr, cc):
        for dr, dc in ((0, 0), (0, 1), (1, 1), (1, 0)):
            if vid[r + dr, c + dc] < 0:
                vid[r + dr, c + dc] = len(verts)
                verts.append((X((c + dc) * CELL), front, Z((r + dr) * CELL)))
    faces = [(int(vid[r, c]), int(vid[r + 1, c]), int(vid[r + 1, c + 1]), int(vid[r, c + 1])) for r, c in zip(rr, cc)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    me.materials.append(front_mat); me.materials.append(side_mat)
    for m in surf_mats: me.materials.append(m)
    bm = bmesh.new(); bm.from_mesh(me)
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for l in f.loops:
            co = l.vert.co; l[uv].uv = ((co.x / U + CW / 2) / CW, (co.z / U + CH / 2) / CH)
    fronts = set(bm.faces)
    ext = bmesh.ops.extrude_face_region(bm, geom=list(fronts))
    moved = [v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(0, depth, 0))
    for f in bm.faces: f.material_index = 0 if f in fronts else 1
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if surfaces and surf_mats:
        for f in bm.faces:
            if f in fronts: continue
            f.normal_update()
            for l in f.loops:
                f.material_index, l[uv].uv = surface_uv(f.normal, l.vert.co)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    return ob
slab('body', parts['body'], 0.0, DEPTH, surfaces=True)
slab('handle', parts['handle'], HANDLE_FRONT, HANDLE_DEPTH)

# ---------------------------------------------------------------- Licht, Kamera, Welt
world = bpy.data.worlds.new('w'); scene.world = world; wn = nodes(world)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.02, 0.025, 0.03, 1); bg.inputs['Strength'].default_value = 1.0
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(bg.outputs[0], wo.inputs[0])
def light(name, loc, power, size, color=(1, 1, 1), target=(0, 0, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = power; ld.size = size; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
light('key', (-5, -6, 7), 800, 3)
light('top', (0, 1, 8), 900, 7, (0.85, 0.92, 1.0))
light('side', (10, -2, 2.5), 450, 4, (0.9, 0.95, 1.0))
light('rim', (8, 6, 3), 700, 3, (1.0, 0.94, 0.86))

cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 50; cam_d.sensor_width = 36
cam = bpy.data.objects.new('cam', cam_d); scene.collection.objects.link(cam); scene.camera = cam
tilt, dist, yaw, lean = math.radians(4), 16.5, math.radians(34), math.radians(7)
cam.location = (dist * math.cos(tilt) * math.sin(yaw), -dist * math.cos(tilt) * math.cos(yaw), dist * math.sin(tilt) + 0.15)
cam.rotation_euler = (math.pi / 2 - tilt, 0, yaw)
# Gerät leicht nach hinten gekippt (Oberkante weiter weg): Kamera um die Querachse schwenken
cam.matrix_world = Matrix.Rotation(lean, 4, 'X') @ Matrix.Translation(cam.location) @ cam.rotation_euler.to_matrix().to_4x4()
W, H = (1100, 560) if PREVIEW else (2200, 1120)
scene.render.resolution_x, scene.render.resolution_y = W, H
cam_d.sensor_fit = 'HORIZONTAL'

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'
scene.cycles.samples = 64 if PREVIEW else 1024
# Kein Denoiser: er würde die feinen Strukturen der Front-Textur weichzeichnen (die Front ist rauschfrei)
scene.cycles.use_denoising = False
scene.cycles.transparent_max_bounces = 16
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'   # Front-Textur 1:1
scene.view_settings.look = 'None'

# ---------------------------------------------------------------- Rendern
bpy.context.view_layer.update()
def proj(x, y, d):
    co = world_to_camera_view(scene, cam, Vector((X(x), d, Z(y))))
    return co.x, 1 - co.y
pts = [proj(x, y, d) for x in (0, CW) for y in (0, CH) for d in (0, DEPTH)]
pad = 12 / W
CROP = [max(0, min(p[0] for p in pts) - pad), max(0, min(p[1] for p in pts) - pad), min(1, max(p[0] for p in pts) + pad), min(1, max(p[1] for p in pts) + pad)]
r = scene.render
r.use_border = r.use_crop_to_border = True
r.border_min_x, r.border_max_x = CROP[0], CROP[2]
r.border_min_y, r.border_max_y = 1 - CROP[3], 1 - CROP[1]
RAW = os.path.join(WORK, 'render'); os.makedirs(RAW, exist_ok=True)
ims = r.image_settings; ims.file_format = 'PNG'; ims.color_mode = 'RGBA'
r.filepath = os.path.join(RAW, 'base.png')
bpy.ops.render.render(write_still=True)

ims.file_format = 'WEBP'; ims.color_mode = 'RGBA'; ims.quality = 92
rimg = bpy.data.images.load(os.path.join(RAW, 'base.png'))
rimg.save_render(os.path.join(OUT, 'base.webp'), scene=scene)
rimg.scale(rimg.size[0] // 2, rimg.size[1] // 2)
rimg.save_render(os.path.join(OUT, 'base-half.webp'), scene=scene)
print('WEBP base', os.path.getsize(os.path.join(OUT, 'base.webp')))

# ---------------------------------------------------------------- layout.css
def relp(p):
    return ((p[0] - CROP[0]) / (CROP[2] - CROP[0]), (p[1] - CROP[1]) / (CROP[3] - CROP[1]))
quad = ' '.join(f'{v:.5f}' for c in ((0, 0), (CW, 0), (CW, CH), (0, CH)) for v in relp(proj(*c, 0)))
cw, ch = (CROP[2] - CROP[0]) * W, (CROP[3] - CROP[1]) * H
pct = lambda v, t: f'{v / t * 100:.3f}%'
def place(rect):
    x, y, w, h = rect
    return f'left:{pct(x, CW)};top:{pct(y, CH)};width:{pct(w, CW)};height:{pct(h, CH)}'
dx0, dy0, dx1, dy1 = PACK['display_hole']
inset = 14
lines = ['/* Generiert von tools/nerd-radio/build_boombox.py – nicht von Hand ändern. Positionen in Paket-Koordinaten. */',
         f'.nr-device{{aspect-ratio:{round(cw)}/{round(ch)};--nr-face:"{quad}"}}',
         f'.nr-face{{width:{CW}px;height:{CH}px}}',
         f'.nr-display{{{place((dx0 + inset, dy0 + inset, dx1 - dx0 - 2 * inset, dy1 - dy0 - 2 * inset))}}}',
         f'.nr-volume{{{place(PACK["volume"])}}}']
for key_, rect in PACK['lights'].items():
    lines.append(f'.nr-glow__{key_}{{{place(rect)}}}')
KEYMAP = {'prev': 'previous', 'play': 'play', 'pause': 'pause', 'stop': 'stop', 'next': 'next', 'shuffle': 'shuffle', 'mode': 'settings', 'list': 'playlist'}
PRESSED = {'play': '.nr-device[data-state=playing] {k}', 'pause': '.nr-device[data-state=paused] {k}',
           'mode': '{k}[aria-pressed=true]', 'list': '{k}[aria-expanded=true]'}
for slot, name in KEYMAP.items():
    sel = f'.nr-key[data-radio-{slot}]'
    # Bild-URLs direkt in dieser Datei, damit sie relativ zu nerd-radio/ aufgelöst werden
    lines.append(f'{sel}{{{place(PACK["controls"][name])};background-image:url(key-{name}-normal.webp)}}')
    lines.append(f'{sel}:hover{{background-image:url(key-{name}-hover.webp)}}')
    down = [f'{sel}:active', f'{sel}.is-down'] + ([PRESSED[slot].format(k=sel)] if slot in PRESSED else [])
    lines.append(f'{",".join(down)}{{background-image:url(key-{name}-pressed.webp)}}')
with open(os.path.join(OUT, 'layout.css'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')
print('LAYOUT', '\n'.join(lines))
