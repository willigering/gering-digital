"""NERD RADIO – Ghettoblaster in Blender bauen und für die Website rendern.

Aufruf (Blender 5.x, Cycles):
  blender -b --factory-startup --python tools/nerd-radio/build_boombox.py -- --out dau-to-pro/nerd-radio [--preview] [--only chassis|cones|keys]

Erzeugt WebP-Ebenen (Gehäuse ohne Leuchten, je eine additive Lichtebene für
Cyan und Gold, Membranen, Tasten je Platz und Zustand), layout.css und anchors.json mit den Bildpositionen aller
Bedienelemente. Die Website legt echte HTML-Tasten, Display und Regler darüber.
Im Gehäuse-Render sind deshalb keine Tasten und keine Anzeige enthalten.

Koordinaten: Entwurf im 1000 x 450 Layoutraster (x nach rechts, y nach unten),
1 Blender-Einheit = 100 Layoutpixel. Vorderseite des Korpus liegt bei Y = 0,
der Korpus reicht nach hinten (+Y). Kamera blickt von vorn (-Y) leicht von oben.
"""
import bpy, bmesh, math, json, os, sys
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = os.path.abspath(arg('--out', 'nerd-radio-out'))
PREVIEW = '--preview' in argv
ONLY = arg('--only')
os.makedirs(OUT, exist_ok=True)

FONTS = 'C:/Windows/Fonts/' if os.name == 'nt' else '/usr/share/fonts/'
def font(name):
    path = os.path.join(FONTS, name)
    return bpy.data.fonts.load(path) if os.path.exists(path) else None

# ---------------------------------------------------------------- Grundlagen
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def X(x): return (x - 500) / 100
def Z(y): return (225 - y) / 100
def P(x, y, d=0.0): return Vector((X(x), d, Z(y)))

def link(obj, coll='chassis'):
    c = bpy.data.collections.get(coll) or bpy.data.collections.new(coll)
    if c.name not in scene.collection.children: scene.collection.children.link(c)
    c.objects.link(obj)
    return obj

def prism(name, pts, front, depth, mat=None, bevel=0.03, segs=3, coll='chassis'):
    """Polygon im Layoutraster, von Y=front nach hinten um depth extrudiert."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((X(x), front, Z(y))) for x, y in pts]
    f = bm.faces.new(vs)
    if f.normal.y > 0: f.normal_flip()
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(0, depth, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me), coll)
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = segs
        m.limit_method = 'ANGLE'; m.harden_normals = False
    if mat: ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def rect(x0, y0, x1, y1, cut=0):
    if not cut: return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    return [(x0 + cut, y0), (x1 - cut, y0), (x1, y0 + cut), (x1, y1 - cut), (x1 - cut, y1), (x0 + cut, y1), (x0, y1 - cut), (x0, y0 + cut)]

def cyl(name, x, y, r, front, depth, mat=None, verts=96, coll='chassis', bevel=0.02):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r / 100, depth=depth, location=(X(x), front + depth / 2, Z(y)), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    for c in ob.users_collection: c.objects.unlink(ob)
    link(ob, coll); ob.name = name
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 3; m.limit_method = 'ANGLE'
    if mat: ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def torus(name, x, y, R, r, d, mat, coll='chassis'):
    bpy.ops.mesh.primitive_torus_add(major_radius=R / 100, minor_radius=r / 100, major_segments=128, minor_segments=16, location=(X(x), d, Z(y)), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    for c in ob.users_collection: c.objects.unlink(ob)
    link(ob, coll); ob.name = name; ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def tube(name, pts, d, radius, mat, coll='chassis'):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, (x, y) in enumerate(pts): sp.points[i].co = (X(x), d, Z(y), 1)
    cu.bevel_depth = radius; cu.bevel_resolution = 4; cu.use_fill_caps = True
    ob = link(bpy.data.objects.new(name, cu), coll); ob.data.materials.append(mat)
    return ob

def cutter(name, pts, front, depth):
    ob = prism(name, pts, front, depth, bevel=0, coll='cutters')
    ob.hide_render = True; ob.display_type = 'WIRE'
    return ob

def subtract(target, *cutters):
    for c in cutters:
        m = target.modifiers.new('cut_' + c.name, 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = c; m.solver = 'EXACT'
    # Fase nach dem Ausschnitt, damit auch die Kanten der Vertiefungen Licht fangen
    bev = target.modifiers.get('bevel')
    if bev:
        w, s = bev.width, bev.segments; target.modifiers.remove(bev)
        b = target.modifiers.new('bevel', 'BEVEL'); b.width = w; b.segments = s; b.limit_method = 'ANGLE'

# ---------------------------------------------------------------- Materialien
def nodes(mat):
    mat.use_nodes = True; nt = mat.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    return nt

def sock(node, ident):
    for s in list(node.inputs) + list(node.outputs):
        if s.identifier == ident: return s
    raise KeyError(ident)

def principled(nt, **kw):
    b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    for k, v in kw.items(): b.inputs[k].default_value = v
    out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(b.outputs[0], out.inputs[0])
    return b

def math_node(nt, op, a=None, b=None, clamp=False):
    n = nt.nodes.new('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None: continue
        if isinstance(v, (int, float)): n.inputs[i].default_value = v
        else: nt.links.new(v, n.inputs[i])
    return n.outputs[0]

def mix_color(nt, fac, a, b):
    n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'
    for ident, v in (('Factor_Float', fac), ('A_Color', a), ('B_Color', b)):
        s = sock(n, ident)
        if isinstance(v, (int, float, tuple)): s.default_value = v if not isinstance(v, tuple) else (*v[:3], 1)
        else: nt.links.new(v, s)
    return sock(n, 'Result_Color')

def ramp(nt, src, stops):
    r = nt.nodes.new('ShaderNodeValToRGB'); nt.links.new(src, r.inputs[0])
    el = r.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
    el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]: e = el.new(p); e.color = (*c, 1)
    return r.outputs[0]

def noise(nt, scale, detail=6, rough=0.55, vec=None, stretch=None):
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale
    n.inputs['Detail'].default_value = detail; n.inputs['Roughness'].default_value = rough
    if stretch:
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = stretch; nt.links.new(tc.outputs['Object'], mp.inputs[0]); nt.links.new(mp.outputs[0], n.inputs['Vector'])
    elif vec is not None: nt.links.new(vec, n.inputs['Vector'])
    return n

def edge_mask(nt, radius=0.012, gain=7.0):
    bev = nt.nodes.new('ShaderNodeBevel'); bev.inputs['Radius'].default_value = radius; bev.samples = 8
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    nt.links.new(bev.outputs['Normal'], dot.inputs[0]); nt.links.new(geo.outputs['Normal'], dot.inputs[1])
    inv = math_node(nt, 'SUBTRACT', 1.0, dot.outputs['Value'])
    return math_node(nt, 'MULTIPLY', inv, gain, clamp=True)

def mat_metal(name, base=(0.05, 0.06, 0.07), rust=0.55, wear=1.0, rough=0.42):
    """Dunkles Gunmetal mit Kantenabrieb, Kratzern, Schmutz und Rostflecken."""
    m = bpy.data.materials.new(name); nt = nodes(m)
    b = principled(nt, **{'Metallic': 1.0, 'Roughness': rough})
    grime = noise(nt, 6, 8, 0.6).outputs['Fac']
    col = mix_color(nt, ramp(nt, grime, [(0.3, (0, 0, 0)), (0.75, (1, 1, 1))]), base, tuple(c * 1.25 for c in base))
    # Rost: großflächige Flecken, bevorzugt an Rändern und in Vertiefungen
    rn = noise(nt, 2.2, 10, 0.7).outputs['Fac']
    rmask = ramp(nt, rn, [(0.58 - 0.12 * rust, (0, 0, 0)), (0.66 - 0.1 * rust, (1, 1, 1))])
    rmask = math_node(nt, 'MULTIPLY', ramp(nt, noise(nt, 18, 4).outputs['Fac'], [(0.4, (0.2, 0.2, 0.2)), (0.6, (1, 1, 1))]), rmask)
    rmask = math_node(nt, 'MULTIPLY', rmask, rust)
    rustc = mix_color(nt, noise(nt, 30, 3).outputs['Fac'], (0.16, 0.06, 0.02), (0.38, 0.17, 0.05))
    col = mix_color(nt, rmask, col, rustc)
    # Kantenabrieb: blankes, helleres Metall an allen Fasen
    em = math_node(nt, 'MULTIPLY', edge_mask(nt), wear)
    em = math_node(nt, 'MULTIPLY', em, ramp(nt, noise(nt, 40, 2).outputs['Fac'], [(0.35, (0.25, 0.25, 0.25)), (0.55, (1, 1, 1))]))
    col = mix_color(nt, em, col, (0.42, 0.44, 0.46))
    nt.links.new(col, b.inputs['Base Color'])
    metal = math_node(nt, 'SUBTRACT', 1.0, rmask)
    nt.links.new(metal, b.inputs['Metallic'])
    scratches = noise(nt, 60, 2, 0.5, stretch=(1, 1, 40)).outputs['Fac']
    r = ramp(nt, scratches, [(0.45, (rough + 0.12,) * 3), (0.62, (rough - 0.18,) * 3)])
    r = math_node(nt, 'MAXIMUM', r, math_node(nt, 'MULTIPLY', rmask, 0.95))
    r = math_node(nt, 'SUBTRACT', r, math_node(nt, 'MULTIPLY', em, 0.18))
    nt.links.new(r, b.inputs['Roughness'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.18
    nt.links.new(math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', scratches, 0.4), math_node(nt, 'MULTIPLY', rmask, 1.2)), bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def mat_simple(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0, coat=0.0):
    m = bpy.data.materials.new(name); nt = nodes(m)
    kw = {'Base Color': (*color, 1), 'Metallic': metal, 'Roughness': rough, 'Coat Weight': coat}
    if emit: kw.update({'Emission Color': (*emit, 1), 'Emission Strength': strength})
    principled(nt, **kw); return m

def mat_hazard(name):
    m = bpy.data.materials.new(name); nt = nodes(m)
    b = principled(nt, **{'Roughness': 0.5})
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    s = math_node(nt, 'ADD', sep.outputs['X'], sep.outputs['Z'])
    s = math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', s, 7.0))
    s = math_node(nt, 'GREATER_THAN', s, 0.5)
    worn = ramp(nt, noise(nt, 14, 6).outputs['Fac'], [(0.6, (0, 0, 0)), (0.7, (1, 1, 1))])
    col = mix_color(nt, s, (0.012, 0.012, 0.012), (1.0, 0.55, 0.02))
    col = mix_color(nt, math_node(nt, 'MULTIPLY', worn, 0.85), col, (0.2, 0.2, 0.2))
    nt.links.new(col, b.inputs['Base Color']); return m

def mat_grille(name):
    """Lautsprechergitter: Lochblech mit Wabenmuster, Löcher tief dunkel."""
    m = bpy.data.materials.new(name); nt = nodes(m)
    b = principled(nt, **{'Metallic': 0.9, 'Roughness': 0.38})
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    k = 13.0; h = 0.866
    u = math_node(nt, 'MULTIPLY', sep.outputs['X'], k); v = math_node(nt, 'MULTIPLY', sep.outputs['Y'], k)
    row = math_node(nt, 'FLOOR', math_node(nt, 'DIVIDE', v, h))
    uo = math_node(nt, 'ADD', u, math_node(nt, 'MULTIPLY', math_node(nt, 'MODULO', row, 2.0), 0.5))
    du = math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', uo), 0.5)
    dv = math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', math_node(nt, 'FRACT', math_node(nt, 'DIVIDE', v, h)), 0.5), h)
    d = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', du, du), math_node(nt, 'MULTIPLY', dv, dv)))
    hole = math_node(nt, 'LESS_THAN', d, 0.33)
    col = mix_color(nt, hole, (0.16, 0.17, 0.18), (0.003, 0.004, 0.005))
    nt.links.new(col, b.inputs['Base Color'])
    nt.links.new(math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', hole, 0.5), 0.35), b.inputs['Roughness'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6; bump.invert = True
    nt.links.new(hole, bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

def mat_card(name):
    m = bpy.data.materials.new(name); nt = nodes(m)
    b = principled(nt, **{'Roughness': 0.85})
    n = noise(nt, 40, 8, 0.7).outputs['Fac']
    col = mix_color(nt, n, (0.42, 0.28, 0.13), (0.62, 0.45, 0.24))
    col = mix_color(nt, ramp(nt, noise(nt, 4, 6).outputs['Fac'], [(0.55, (0, 0, 0)), (0.75, (1, 1, 1))]), col, (0.3, 0.19, 0.08))
    nt.links.new(col, b.inputs['Base Color'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25
    nt.links.new(n, bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

CYAN, GOLD, ORANGE = (0.0, 0.62, 1.0), (1.0, 0.42, 0.0), (1.0, 0.22, 0.0)
GLASS = (0.035, 0.04, 0.045)
M = {
    # Ruhiges, sauberes Gunmetal: nur leichter Kantenabrieb, kaum Rost (wirkt weniger nach CGI-Effekt)
    'body': mat_metal('body', (0.04, 0.046, 0.054), rust=0.06, wear=0.6, rough=0.38),
    'panel': mat_metal('panel', (0.055, 0.062, 0.072), rust=0.04, wear=0.6, rough=0.34),
    'dark': mat_metal('dark', (0.026, 0.03, 0.035), rust=0.0, wear=0.3, rough=0.48),
    'handle': mat_metal('handle', (0.045, 0.05, 0.058), rust=0.04, wear=0.6, rough=0.32),
    'badge': mat_metal('badge', (0.07, 0.076, 0.084), rust=0.0, wear=0.5, rough=0.28),
    'chrome': mat_simple('chrome', (0.85, 0.88, 0.9), 1.0, 0.12),
    'goldmetal': mat_simple('goldmetal', (1.0, 0.68, 0.18), 1.0, 0.22),
    # Leuchtmittel: ausgeschaltet dunkles Glas (kein farbiger Schein ohne Musik), Farbe nur über die Emission
    'neon_c': mat_simple('neon_c', GLASS, rough=0.2, emit=CYAN, strength=2.6),
    'neon_g': mat_simple('neon_g', GLASS, rough=0.2, emit=GOLD, strength=2.6),
    'ring_g': mat_simple('ring_g', GLASS, rough=0.2, emit=GOLD, strength=2.0),
    'pixel_c': mat_simple('pixel_c', GLASS, rough=0.3, emit=CYAN, strength=2.2),
    'hazard': mat_hazard('hazard'),
    'grille': mat_grille('grille'),
    'card': mat_card('card'),
    'ink': mat_simple('ink', (0.02, 0.015, 0.01), rough=0.6),
    'heart': mat_simple('heart', (0.8, 0.03, 0.03), rough=0.4, emit=(1, 0.05, 0.05), strength=0.6),
    'bolt': mat_simple('bolt', (0.5, 0.52, 0.55), 1.0, 0.3),
    'void': mat_simple('void', (0.004, 0.005, 0.006), rough=0.9),
    'lcdwell': mat_simple('lcdwell', (0.004, 0.012, 0.016), rough=0.7),
    'tray': mat_metal('tray', (0.018, 0.02, 0.024), rust=0.1, wear=0.4, rough=0.55),
    'keycap': mat_metal('keycap', (0.022, 0.026, 0.031), rust=0.0, wear=0.9, rough=0.42),
}

# ---------------------------------------------------------------- Geometrie
SIL = [(20, 168), (58, 128), (100, 96), (900, 96), (942, 128), (980, 168), (980, 392), (950, 424), (50, 424), (20, 392)]
FACE = [(40, 176), (72, 146), (110, 116), (890, 116), (928, 146), (960, 176), (960, 386), (940, 406), (60, 406), (40, 386)]
SPK = [(150, 276), (850, 276)]
DISPLAY = (276, 144, 724, 266)          # Glasfläche (HTML-Display liegt darauf)
TRAY = (288, 280, 712, 346)             # Wanne der Transporttasten
KEYS = {                                # Tastenkappen (Layout), Reihenfolge wie im HTML
    'prev': (296, 289, 368, 337), 'stop': (376, 289, 448, 337), 'play': (456, 289, 544, 337),
    'next': (552, 289, 624, 337), 'shuffle': (632, 289, 704, 337),
    'mode': (250, 352, 304, 406), 'list': (696, 352, 750, 406)}
VOLUME = (316, 356, 684, 402)

body = prism('body', SIL, 0.0, 1.7, M['body'], bevel=0.06, segs=4)
face = prism('face', FACE, -0.07, 0.2, M['panel'], bevel=0.035)
lip = prism('lip', [(50, 420), (950, 420), (930, 446), (70, 446)], -0.03, 1.6, M['dark'], bevel=0.02)

# Vertiefungen: Display, Tastenwanne, Lautstärke, Lautsprecheröffnungen
cut_d = cutter('cut_display', rect(DISPLAY[0] - 10, DISPLAY[1] - 10, DISPLAY[2] + 10, DISPLAY[3] + 10, 16), -0.5, 0.62)
cut_t = cutter('cut_tray', rect(*TRAY, 12), -0.5, 0.6)
cut_v = cutter('cut_vol', rect(*VOLUME, 14), -0.5, 0.58)
cut_m = cutter('cut_mode', rect(*KEYS['mode'], 14), -0.5, 0.58)
cut_l = cutter('cut_list', rect(*KEYS['list'], 14), -0.5, 0.58)
subtract(face, cut_d, cut_t, cut_v, cut_m, cut_l)
subtract(body, cut_d, cut_t, cut_v, cut_m, cut_l)
# Böden der Vertiefungen
prism('display_well', rect(DISPLAY[0] - 10, DISPLAY[1] - 10, DISPLAY[2] + 10, DISPLAY[3] + 10, 16), 0.1, 0.05, M['lcdwell'], bevel=0)
prism('tray_floor', rect(*TRAY, 12), 0.06, 0.05, M['tray'], bevel=0)
prism('vol_floor', rect(*VOLUME, 14), 0.1, 0.05, M['void'], bevel=0)
prism('mode_floor', rect(*KEYS['mode'], 14), 0.1, 0.05, M['void'], bevel=0)
prism('list_floor', rect(*KEYS['list'], 14), 0.1, 0.05, M['void'], bevel=0)
# Display-Rahmen mit Neonkante
tube('display_neon', [(DISPLAY[0] - 4 + 14, DISPLAY[1] - 4), (DISPLAY[2] + 4 - 14, DISPLAY[1] - 4), (DISPLAY[2] + 4, DISPLAY[1] - 4 + 14), (DISPLAY[2] + 4, DISPLAY[3] + 4 - 14),
     (DISPLAY[2] + 4 - 14, DISPLAY[3] + 4), (DISPLAY[0] - 4 + 14, DISPLAY[3] + 4), (DISPLAY[0] - 4, DISPLAY[3] + 4 - 14), (DISPLAY[0] - 4, DISPLAY[1] - 4 + 14), (DISPLAY[0] - 4 + 14, DISPLAY[1] - 4)], 0.06, 0.012, M['neon_c'])

# Lautsprecher: Gehäusering, Goldring, Innenring (Gitter und Pilz kommen in die Ebene "cones")
for i, (x, y) in enumerate(SPK):
    housing = cyl(f'spk_housing{i}', x, y, 116, -0.16, 0.3, M['panel'], bevel=0.05)
    cut_s = cutter(f'cut_spk{i}', [(x + 100 * math.cos(a / 48 * 2 * math.pi), y + 100 * math.sin(a / 48 * 2 * math.pi)) for a in range(48)], -0.6, 0.8)
    subtract(housing, cut_s); subtract(face, cut_s); subtract(body, cut_s)
    cyl(f'spk_back{i}', x, y, 100, 0.15, 0.1, M['void'], bevel=0)
    torus(f'spk_gold{i}', x, y, 103, 3.4, -0.17, M['ring_g'])
    torus(f'spk_rim{i}', x, y, 112, 4.5, -0.15, M['dark'])
    for a in (45, 135, 225, 315):
        r = math.radians(a)
        cyl(f'spk_bolt{i}_{a}', x + 110 * math.cos(r), y + 110 * math.sin(r), 5.5, -0.2, 0.06, M['bolt'], verts=24, bevel=0.01)

# Lautsprecher-Membran (eigene Ebene, wird auf der Website zum Bass bewegt)
SHROOM = ['......XXXX......', '....XX....XX....', '...X........X...', '..X..........X..', '.X............X.', '.X............X.', 'X..............X',
          'X..............X', 'X..XXXXXXXXXX..X', '.XX..........XX.', '..X..X....X..X..', '..X..X....X..X..', '..X..........X..', '...X........X...', '....XXXXXXXX....']
for i, (x, y) in enumerate(SPK):
    g = cyl(f'cone_grille{i}', x, y, 96, 0.04, 0.2, M['grille'], coll='cones', bevel=0.03)
    torus(f'cone_ring{i}', x, y, 92, 4, 0.04, M['panel'], coll='cones')
    px = 4.2
    for r, line in enumerate(SHROOM):
        for c, ch in enumerate(line):
            if ch == 'X':
                bpy.ops.mesh.primitive_cube_add(size=1, location=(X(x + (c - 7.5) * px), 0.02, Z(y + (r - 7) * px)))
                ob = bpy.context.object; ob.scale = (px / 100 * 0.92, 0.02, px / 100 * 0.92)
                for cc in ob.users_collection: cc.objects.unlink(ob)
                link(ob, 'cones'); ob.data.materials.append(M['pixel_c']); ob.name = f'cone_px{i}'

# Tragegriff: Kastenprofil entlang eines umgedrehten U
prof = bpy.data.curves.new('handle_profile', 'CURVE'); sp = prof.splines.new('POLY'); pts = [(-0.2, -0.26), (0.2, -0.26), (0.2, 0.26), (-0.2, 0.26)]
sp.points.add(3)
for k, (a, b2) in enumerate(pts): sp.points[k].co = (a, b2, 0, 1)
sp.use_cyclic_u = True
prof_ob = bpy.data.objects.new('handle_profile', prof); scene.collection.objects.link(prof_ob); prof_ob.hide_render = True
hc = bpy.data.curves.new('handle', 'CURVE'); hc.dimensions = '3D'; hs = hc.splines.new('POLY')
hp = [(270, 110), (270, 50), (302, 22), (698, 22), (730, 50), (730, 110)]
hs.points.add(len(hp) - 1)
for k, (x, y) in enumerate(hp): hs.points[k].co = (X(x), 0.75, Z(y), 1)
hc.bevel_mode = 'OBJECT'; hc.bevel_object = prof_ob; hc.use_fill_caps = True
handle = link(bpy.data.objects.new('handle', hc)); handle.data.materials.append(M['handle'])
hb = handle.modifiers.new('bevel', 'BEVEL'); hb.width = 0.03; hb.segments = 3; hb.limit_method = 'ANGLE'
prism('handle_grip', rect(380, 14, 620, 32, 6), 0.46, 0.4, M['dark'], bevel=0.02)
for x0 in (296, 652):
    prism(f'handle_hazard{x0}', rect(x0, 13, x0 + 52, 33, 0), 0.47, 0.05, M['hazard'], bevel=0)

# Typenschild mit Schriftzug
badge = prism('badge', [(330, 66), (352, 48), (648, 48), (670, 66), (670, 116), (650, 134), (350, 134), (330, 116)], -0.16, 0.5, M['badge'], bevel=0.035)
tube('badge_neon', [(352, 126), (648, 126)], -0.17, 0.01, M['neon_c'])
def text(body_txt, x, y, size, mat, fnt, d=-0.19, shear=0.18, extrude=0.03, coll='chassis', align='CENTER'):
    cu = bpy.data.curves.new('txt', 'FONT'); cu.body = body_txt; cu.size = size
    if fnt: cu.font = fnt
    cu.align_x = align; cu.align_y = 'BOTTOM'; cu.shear = shear; cu.extrude = extrude; cu.bevel_depth = 0.006
    ob = link(bpy.data.objects.new('txt_' + body_txt, cu), coll); ob.location = (X(x), d, Z(y)); ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.data.materials.append(mat); return ob
blk = font('ariblk.ttf')
text('DAU', 440, 116, 0.5, M['chrome'], blk)
text('TO', 506, 114, 0.3, M['chrome'], blk)
text('PRO', 578, 116, 0.5, M['goldmetal'], blk)

# Warnstreifen, Neon, Schrauben, Lüftung
for pts in ([(118, 124), (206, 124), (194, 140), (106, 140)], [(882, 124), (794, 124), (806, 140), (894, 140)],
            [(292, 106), (330, 106), (322, 120), (284, 120)], [(670, 106), (708, 106), (716, 120), (678, 120)]):
    prism('hazard', pts, -0.09, 0.05, M['hazard'], bevel=0.004)
tube('neon_back_l', [(52, 140), (106, 74), (318, 74)], 0.5, 0.02, M['neon_c'])
tube('neon_back_r', [(948, 140), (894, 74), (682, 74)], 0.5, 0.02, M['neon_c'])
tube('neon_side_l', [(14, 190), (14, 372)], 0.4, 0.018, M['neon_c'])
tube('neon_side_r', [(986, 190), (986, 372)], 0.4, 0.018, M['neon_c'])
tube('neon_shoulder_l', [(26, 176), (62, 136)], -0.02, 0.016, M['neon_g'])
tube('neon_shoulder_r', [(974, 176), (938, 136)], -0.02, 0.016, M['neon_g'])
tube('neon_corner_l', [(26, 300), (26, 384)], -0.02, 0.014, M['neon_g'])
tube('neon_corner_r', [(974, 300), (974, 384)], -0.02, 0.014, M['neon_g'])
tube('neon_bottom', [(420, 428), (580, 428)], -0.05, 0.014, M['neon_g'])
tube('neon_bottom_l', [(64, 428), (96, 428)], -0.05, 0.012, M['neon_c'])
tube('neon_bottom_r', [(904, 428), (936, 428)], -0.05, 0.012, M['neon_c'])
for x, y in [(56, 186), (944, 186), (60, 394), (940, 394), (346, 62), (654, 62), (346, 124), (654, 124), (276, 140), (724, 140), (276, 272), (724, 272)]:
    cyl('bolt', x, y, 6, -0.11, 0.06, M['bolt'], verts=24, bevel=0.012)
for x0 in list(range(100, 230, 20)) + list(range(780, 910, 20)):
    prism('vent', rect(x0, 430, x0 + 12, 438, 2), -0.05, 0.03, M['void'], bevel=0.003)
for k in range(5):
    prism('vent_side', rect(912, 200 + k * 12, 944, 206 + k * 12, 2), -0.08, 0.03, M['void'], bevel=0.003)
    prism('vent_side', rect(56, 200 + k * 12, 88, 206 + k * 12, 2), -0.08, 0.03, M['void'], bevel=0.003)

# Aufkleber "NERD MUSIC" mit Pixelherz
card = prism('sticker', [(744, 84), (860, 78), (866, 152), (748, 160)], -0.2, 0.012, M['card'], bevel=0.003)
pv = Vector((X(806), 0, Z(120)))
sticker_parts = [card]
print_font = font('segoeprb.ttf') or font('segoepr.ttf')
sticker_parts.append(text('NERD', 800, 114, 0.27, M['ink'], print_font, d=-0.215, shear=0, extrude=0.002))
sticker_parts.append(text('MUSIC', 800, 146, 0.25, M['ink'], print_font, d=-0.215, shear=0, extrude=0.002))
HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
for r, line in enumerate(HEART):
    for c, ch in enumerate(line):
        if ch == 'X':
            bpy.ops.mesh.primitive_cube_add(size=1, location=(X(838 + c * 3.2), -0.215, Z(94 + r * 3.2)))
            ob = bpy.context.object; ob.scale = (0.03, 0.006, 0.03)
            for cc in ob.users_collection: cc.objects.unlink(ob)
            link(ob); ob.data.materials.append(M['heart']); sticker_parts.append(ob)
pivot = bpy.data.objects.new("sticker_pivot", None); scene.collection.objects.link(pivot); pivot.location = pv
bpy.context.view_layer.update()
for ob in sticker_parts:
    ob.parent = pivot; ob.matrix_parent_inverse = pivot.matrix_world.inverted()
pivot.rotation_euler.y = math.radians(-12)   # gegen den Uhrzeigersinn, wie in der Referenz


# Rechte Gehäuseseite (durch die schräge Kamera sichtbar): Lüftung, Gold-Neon, Logo-Ring
def box3(name, center, size, mat, coll='chassis', bevel=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.object; ob.scale = size
    for cc in ob.users_collection: cc.objects.unlink(ob)
    link(ob, coll); ob.name = name; ob.data.materials.append(mat)
    if bevel:
        m = ob.modifiers.new('bevel', 'BEVEL'); m.width = bevel; m.segments = 2
    return ob
def tube3(name, pts, radius, mat, coll='chassis'):
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (*p, 1)
    cu.bevel_depth = radius; cu.bevel_resolution = 4; cu.use_fill_caps = True
    ob = link(bpy.data.objects.new(name, cu), coll); ob.data.materials.append(mat)
    return ob
SX = X(980)
box3('side_plate', (SX + 0.03, 0.85, Z(282)), (0.06, 1.3, 2.0), M['panel'], bevel=0.02)
for k in range(6):
    box3('side_vent', (SX + 0.065, 0.42 + k * 0.035 * 0 + 0.0, Z(206 + k * 11)), (0.02, 0.62, 0.05), M['void'])
    box3('side_vent', (SX + 0.065, 1.26, Z(206 + k * 11)), (0.02, 0.42, 0.05), M['void'])
tube3('side_neon_g', [(SX + 0.08, 0.2, Z(176)), (SX + 0.08, 0.2, Z(392))], 0.014, M['neon_g'])
tube3('side_neon_c', [(SX + 0.08, 1.52, Z(190)), (SX + 0.08, 1.52, Z(380))], 0.012, M['neon_c'])
bpy.ops.mesh.primitive_torus_add(major_radius=0.17, minor_radius=0.022, major_segments=64, minor_segments=12, location=(SX + 0.08, 0.85, Z(320)), rotation=(0, math.pi / 2, 0))
logo = bpy.context.object
for cc in logo.users_collection: cc.objects.unlink(logo)
link(logo); logo.name = 'side_logo'; logo.data.materials.append(M['neon_g'])
box3('side_logo_bar', (SX + 0.08, 0.85, Z(320)), (0.03, 0.04, 0.26), M['neon_g'], bevel=0.01)

# ---------------------------------------------------------------- Tasten (eigene Ebene)
def key(name, box, rim_mat, depth_front, cut=12):
    x0, y0, x1, y1 = box
    base = prism(f'key_{name}_rim', rect(x0, y0, x1, y1, cut), depth_front + 0.035, 0.12, rim_mat, bevel=0.01, coll='keys')
    cap = prism(f'key_{name}_cap', rect(x0 + 3.5, y0 + 3.5, x1 - 3.5, y1 - 3.5, cut - 2), depth_front, 0.16, M['keycap'], bevel=0.025, segs=4, coll='keys')
    return base, cap
# Tastensymbole als leuchtende Geometrie auf der Kappe: sitzen perspektivisch exakt (24er-Raster wie die SVG-Icons)
def bezier(p0, p1, p2, p3, n=14):
    return [tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d for a, b, c, d in zip(p0, p1, p2, p3))
            for t in (i / n for i in range(n + 1))]
ICONS = {
    'prev': {'polys': [[(4, 5), (6.6, 5), (6.6, 19), (4, 19)], [(14, 5), (14, 19), (7.4, 12)], [(21.5, 5), (21.5, 19), (15, 12)]]},
    'next': {'polys': [[(20, 5), (17.4, 5), (17.4, 19), (20, 19)], [(10, 5), (16.6, 12), (10, 19)], [(2.5, 5), (9, 12), (2.5, 19)]]},
    'stop': {'polys': [[(5.5, 5.5), (18.5, 5.5), (18.5, 18.5), (5.5, 18.5)]]},
    'play': {'polys': [[(7, 4.5), (19.5, 12), (7, 19.5)]]},
    'pause': {'polys': [[(6, 4.5), (10.4, 4.5), (10.4, 19.5), (6, 19.5)], [(13.6, 4.5), (18, 4.5), (18, 19.5), (13.6, 19.5)]]},
    'shuffle': {'polys': [[(18, 3.2), (22.2, 7), (18, 10.8)], [(18, 13.2), (22.2, 17), (18, 20.8)]],
                'strokes': [[(3, 7)] + bezier((6.5, 7), (11, 7), (13, 17), (17.5, 17)) + [(19, 17)],
                            [(3, 17)] + bezier((6.5, 17), (8.3, 17), (9.5, 15.4), (10.5, 13.6)),
                            bezier((13.5, 9.4), (14.5, 7.8), (15.7, 7), (17.5, 7)) + [(19, 7)]], 'width': 2.6},
    'mode': {'rings': [(5.4, 1.4)],
             'polys': [[(12 + r * math.cos(a), 12 + r * math.sin(a)) for r, a in
                        [(6.5, k * math.pi / 4 + t * 0.39 / 4) for t in range(5)] + [(9.9, k * math.pi / 4 + t * 0.39 / 4) for t in range(4, -1, -1)]]
                       for k in range(8)]},
    'list': {'dots': [(4.5, 6, 2), (4.5, 12, 2), (4.5, 18, 2)],
             'polys': [[(9, y), (21, y), (21, y + 2.6), (9, y + 2.6)] for y in (4.8, 10.8, 16.8)]},
}
def key_icon(icon, box, front, mat, round_key):
    x0, y0, x1, y1 = box; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    size = (x1 - x0) * 0.44 if round_key else (y1 - y0) * 0.38
    sc = size / 24
    pt = lambda u, v: (cx + (u - 12) * sc, cy + (v - 12) * sc)
    f, d = front - 0.01, 0.014
    spec = ICONS[icon]
    for i, poly in enumerate(spec.get('polys', [])):
        prism(f'icon_{icon}_{i}', [pt(u, v) for u, v in poly], f, d, mat, bevel=0.002, segs=1, coll='keys')
    for i, stroke in enumerate(spec.get('strokes', [])):
        tube(f'icon_{icon}_s{i}', [pt(u, v) for u, v in stroke], f + d / 2, spec['width'] / 2 * sc / 100, mat, coll='keys')
    for i, (r, w) in enumerate(spec.get('rings', [])):
        torus(f'icon_{icon}_r{i}', *pt(12, 12), r * sc, w * sc, f + d / 2, mat, coll='keys')
    for i, (u, v, r) in enumerate(spec.get('dots', [])):
        cyl(f'icon_{icon}_d{i}', *pt(u, v), r * sc, f, d, mat, verts=32, coll='keys', bevel=0)
ICON_MAT = {'white': mat_simple('icon_w', (0.85, 0.97, 1.0), emit=(0.75, 0.95, 1.0), strength=1.4),
            'gold': mat_simple('icon_g', (1.0, 0.75, 0.3), emit=(1.0, 0.62, 0.15), strength=1.6)}

RIM = {'cyan': mat_simple('rim_c', CYAN, emit=CYAN, strength=0.75), 'orange': mat_simple('rim_o', ORANGE, emit=ORANGE, strength=1.1),
       'gold': mat_simple('rim_g', GOLD, emit=GOLD, strength=0.75)}

# ---------------------------------------------------------------- Licht, Kamera, Welt
world = bpy.data.worlds.new('w'); scene.world = world; wn = nodes(world)
bg = wn.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.012, 0.016, 0.022, 1); bg.inputs['Strength'].default_value = 1.0
wo = wn.nodes.new('ShaderNodeOutputWorld'); wn.links.new(bg.outputs[0], wo.inputs[0])
# Studiolicht als Grundlicht (Gerät bleibt auch ohne Musik gut sichtbar); Akzente setzen die eigenen Leuchten
STUDIO = 0.6
def light(name, loc, power, size, color=(1, 1, 1), target=(0, 0, 0)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = power * STUDIO; ld.size = size; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False; ob.visible_glossy = True
    return ob
light('key', (-5, -6, 7), 1300, 3)
light('top', (0, -0.5, 8), 650, 7, (0.85, 0.92, 1.0))
light('rim_c', (-8, 4, 3.5), 3200, 3, (0.8, 0.9, 1.0))   # neutrale Kantenlichter: Farbe kommt nur von den Leuchten
light('rim_o', (8, 4, 3.5), 2600, 3, (1.0, 0.94, 0.86))
light('fill', (3, -8, -1), 160, 8, (0.6, 0.8, 1.0))
light('graze', (-9, -1.2, 1.2), 2600, 1.2, (0.9, 0.95, 1.0), target=(2, 0, 0.3))
light('sheen', (2.5, -9, 4.5), 900, 2.5, (1.0, 0.9, 0.8))
light('kick', (0, -4, -4), 160, 6, (0.75, 0.85, 1.0), target=(0, 0, -1.5))

floor = None
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 2, Z(447)))
floor = bpy.context.object; floor.name = 'floor_unused'; floor.hide_render = True  # Bodenschatten macht die Website

# Leicht schräg: das Gerät ist um die senkrechte Achse gedreht, die vordere rechte Ecke
# ist näher an der Kamera als die linke (rechter Lautsprecher wirkt größer).
# Normalbrennweite aus der Nähe, damit die Perspektive sichtbar ist; kaum Aufsicht.
cam_d = bpy.data.cameras.new('cam'); cam_d.lens = 50; cam_d.sensor_width = 36
cam = bpy.data.objects.new('cam', cam_d); scene.collection.objects.link(cam); scene.camera = cam
tilt = math.radians(4)
dist = 16.5
yaw = math.radians(34)
roll = 0.0
cam.location = (dist * math.cos(tilt) * math.sin(yaw), -dist * math.cos(tilt) * math.cos(yaw), dist * math.sin(tilt) + 0.15)
cam.rotation_euler = (math.pi / 2 - tilt, roll, yaw)
# Gerät leicht nach hinten gekippt (Oberkante weiter weg): Kamera um die Querachse des Geräts schwenken
lean = math.radians(7)
cam.matrix_world = Matrix.Rotation(lean, 4, 'X') @ Matrix.Translation(cam.location) @ cam.rotation_euler.to_matrix().to_4x4()
W, H = (1100, 560) if PREVIEW else (2200, 1120)
scene.render.resolution_x, scene.render.resolution_y = W, H
cam_d.sensor_fit = 'HORIZONTAL'

scene.render.engine = 'CYCLES'
prefs = bpy.context.preferences.addons['cycles'].preferences
try:
    prefs.compute_device_type = 'OPTIX'; prefs.get_devices()
    for d in prefs.devices: d.use = d.type == 'OPTIX'
    scene.cycles.device = 'GPU'
except Exception:
    scene.cycles.device = 'CPU'
scene.cycles.samples = 96 if PREVIEW else 512
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0.1
# Bloom: Neon strahlt, und der Schein bleibt im transparenten Bild erhalten
try:
    tree = bpy.data.node_groups.new('bloom', 'CompositorNodeTree')
    if hasattr(scene, 'compositing_node_group'): scene.compositing_node_group = tree
    else: scene.use_nodes = True; tree = scene.node_tree
    tree.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = tree.nodes.new('CompositorNodeRLayers')
    gl = tree.nodes.new('CompositorNodeGlare')
    for k, v in (('glare_type', 'BLOOM'), ('quality', 'HIGH')):
        try: setattr(gl, k, v)
        except Exception: pass
    for name, val in (('Type', 'Bloom'), ('Threshold', 1.2), ('Strength', 0.5), ('Size', 0.55), ('Quality', 'High')):
        s = gl.inputs.get(name)
        if s is not None:
            try: s.default_value = val
            except Exception: pass
    tree.links.new(rl.outputs['Image'], gl.inputs['Image'])
    go = tree.nodes.new('NodeGroupOutput'); tree.links.new(gl.outputs['Image'], go.inputs[0])
    print('BLOOM ok', [s.name for s in gl.inputs], [s.name for s in gl.outputs])
except Exception as e:
    print('BLOOM failed', e)
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'

# ---------------------------------------------------------------- Rendern
def proj(x, y, d):
    co = world_to_camera_view(scene, cam, P(x, y, d))
    return co.x, 1 - co.y   # 0..1, y von oben

def bbox(x0, y0, x1, y1, d, pad=0):
    pad = pad * W / 1100   # Rand in Vorschau-Pixeln, skaliert mit der Auflösung
    pts = [proj(x, y, d) for x in (x0, x1) for y in (y0, y1)]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return [min(xs) - pad / W, min(ys) - pad / H, max(xs) + pad / W, max(ys) + pad / H]

def visible(*colls):
    for c in bpy.data.collections:
        c.hide_render = c.name not in colls

def render(path, border=None):
    r = scene.render
    r.use_border = border is not None; r.use_crop_to_border = border is not None
    if border:
        x0, y0, x1, y1 = border
        r.border_min_x, r.border_max_x = max(0, x0), min(1, x1)
        r.border_min_y, r.border_max_y = max(0, 1 - y1), min(1, 1 - y0)
    r.filepath = path
    bpy.ops.render.render(write_still=True)
    print('RENDERED', path)

# Leuchtgruppen: werden für die Lichtebenen einzeln ein- und ausgeschaltet
GROUPS = {'cyan': [M['neon_c'], M['pixel_c']], 'gold': [M['neon_g'], M['ring_g']]}
BASE_EMIT = {m.name: m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value for g in GROUPS.values() for m in g}
def emit(group_factors):
    for g, mats in GROUPS.items():
        for m in mats:
            m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = BASE_EMIT[m.name] * group_factors.get(g, 0)
# Lichtquellen an den Röhren: werfen das Neonlicht sichtbar auf Metall, Gitter und Kanten
def glow_lamp(name, loc, power, radius, color, group):
    ld = bpy.data.lights.new(name, 'POINT'); ld.energy = power * 1.8; ld.shadow_soft_size = radius; ld.color = color
    ob = bpy.data.objects.new(name, ld); scene.collection.objects.link(ob); ob.location = loc; ob.visible_camera = False
    ob['group'] = group; return ob
for i, (x, y) in enumerate(SPK):
    glow_lamp(f'gl_spk{i}', (X(x), -0.55, Z(y)), 150, 0.9, GOLD, 'gold')
glow_lamp('gl_bottom', (0, -0.45, Z(432)), 70, 0.6, GOLD, 'gold')
glow_lamp('gl_side_g', (X(980) + 0.45, 0.3, Z(285)), 90, 0.6, GOLD, 'gold')
glow_lamp('gl_shoulders_l', (X(40), -0.4, Z(160)), 40, 0.4, GOLD, 'gold')
glow_lamp('gl_shoulders_r', (X(960), -0.4, Z(160)), 40, 0.4, GOLD, 'gold')
glow_lamp('gl_top_l', (X(200), 0.55, Z(62)), 160, 0.8, CYAN, 'cyan')
glow_lamp('gl_top_r', (X(800), 0.55, Z(62)), 160, 0.8, CYAN, 'cyan')
glow_lamp('gl_display', (0, -0.7, Z(205)), 90, 1.2, CYAN, 'cyan')
glow_lamp('gl_side_c', (X(980) + 0.45, 1.5, Z(285)), 70, 0.6, CYAN, 'cyan')
for i, (x, y) in enumerate(SPK):
    glow_lamp(f'gl_px{i}', (X(x), -0.35, Z(y)), 25, 0.3, CYAN, 'cyan')
LAMPS = [o for o in scene.objects if o.type == 'LIGHT' and 'group' not in o]
GLOW = [o for o in scene.objects if o.type == 'LIGHT' and 'group' in o]
STATIC_EMIT = [M['heart']]
def lamps(on, group=None):
    for o in LAMPS: o.hide_render = not on
    for o in GLOW: o.hide_render = o['group'] != group
    bg.inputs['Strength'].default_value = 1.0 if on else 0.0
    for m in STATIC_EMIT:
        m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.6 if on else 0.0
def compositing(on):
    scene.render.use_compositing = on

bpy.context.view_layer.update()
RAW = os.path.join(OUT, '_raw'); os.makedirs(RAW, exist_ok=True)
def union(*boxes):
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]
# Bildausschnitt: Korpus inkl. sichtbarer Rückseite/Seite, Griff und Neon-Rückrahmen, plus Rand für den Lichtschein
CHASSIS = union(bbox(0, 60, 1000, 452, 0.0, pad=26), bbox(260, 6, 740, 40, 0.5, pad=26), bbox(260, 6, 740, 40, 1.0, pad=26),
                bbox(40, 70, 960, 100, 0.5, pad=26), bbox(0, 96, 1000, 446, 1.7, pad=26))
CHASSIS = [max(0, CHASSIS[0]), max(0, CHASSIS[1]), min(1, CHASSIS[2]), min(1, CHASSIS[3])]
def rel(b):
    cx0, cy0, cx1, cy1 = CHASSIS; w, h = cx1 - cx0, cy1 - cy0
    return [(b[0] - cx0) / w, (b[1] - cy0) / h, (b[2] - cx0) / w, (b[3] - cy0) / h]
def relp(p):
    cx0, cy0, cx1, cy1 = CHASSIS
    return [(p[0] - cx0) / (cx1 - cx0), (p[1] - cy0) / (cy1 - cy0)]

FACE_D = 0.08   # Ebene, auf der Display und Lautstärkeregler liegen
anchors = {'keys': {name: bbox(*box, -0.13, pad=10) for name, box in KEYS.items()},
           'cones': [bbox(x - 100, y - 100, x + 100, y + 100, 0.04, pad=4) for x, y in SPK],
           'face': [relp(proj(x, y, FACE_D)) for x, y in ((0, 0), (1000, 0), (1000, 450), (0, 450))]}

ims = scene.render.image_settings
def png(alpha=True):
    ims.file_format = 'PNG'; ims.color_mode = 'RGBA' if alpha else 'RGB'; ims.color_management = 'FOLLOW_SCENE'

if ONLY in (None, 'chassis'):
    # Grundgehäuse: alle Leuchten aus (Neonröhren als dunkles Glas), nur Studiolicht
    visible('chassis'); emit({}); lamps(True); compositing(False); scene.render.film_transparent = True; png(True)
    render(os.path.join(RAW, 'base.png'), CHASSIS)
    # Lichtebenen: nur eine Leuchtgruppe, kein Studiolicht, schwarzer Hintergrund.
    # Enthalten die Röhren selbst, ihren Schein und das Licht, das auf Metall, Gitter und Kanten fällt.
    visible('chassis', 'cones'); lamps(False); compositing(True); scene.render.film_transparent = False; png(False)
    for g in GROUPS:
        lamps(False, g); emit({g: 2.2}); render(os.path.join(RAW, f'light-{g}.png'), CHASSIS)
    emit({g: 1.0 for g in GROUPS}); lamps(True); compositing(False); scene.render.film_transparent = True; png(True)

if ONLY in (None, 'cones'):
    visible('cones'); emit({}); lamps(True); compositing(False); png(True)
    for i, b in enumerate(anchors['cones']):
        render(os.path.join(RAW, f'cone-{i}.png'), b)

if ONLY in (None, 'keys'):
    # Jede Taste an ihrem Platz, weil die Perspektive links und rechts verschieden ist
    # (Platz, Rahmenfarbe, Dateizusatz, Symbol, Symbolfarbe)
    variants = [(s, 'cyan', '', s, 'white') for s in ('prev', 'stop', 'next')] + [('shuffle', 'cyan', '', 'shuffle', 'gold'),
                ('play', 'cyan', '', 'play', 'white'), ('play', 'orange', '-on', 'pause', 'gold'),
                ('mode', 'cyan', '', 'mode', 'white'), ('mode', 'gold', '-on', 'mode', 'gold'), ('list', 'gold', '', 'list', 'gold')]
    visible('keys'); emit({}); lamps(True); compositing(False); png(True)
    for slot, rim, suffix, icon, icol in variants:
        for state, front in (('up', -0.13), ('down', -0.06)):
            if 'keys' in bpy.data.collections:
                for ob in list(bpy.data.collections['keys'].objects): bpy.data.objects.remove(ob, do_unlink=True)
            key(slot, KEYS[slot], RIM[rim], front, 16 if slot in ('mode', 'list') else 12)
            key_icon(icon, KEYS[slot], front, ICON_MAT[icol], slot in ('mode', 'list'))
            strength = RIM[rim].node_tree.nodes['Principled BSDF'].inputs['Emission Strength']
            base = strength.default_value
            if state == 'down': strength.default_value = base * 1.8
            visible('keys')
            render(os.path.join(RAW, f'key-{slot}{suffix}-{state}.png'), anchors['keys'][slot])
            strength.default_value = base

# WebP für die Website; Gehäuse und Lichtebenen zusätzlich in halber Größe für kleine Bildschirme
def webp(name, half=False, alpha=True):
    src = os.path.join(RAW, name + '.png')
    if not os.path.exists(src): return
    ims.file_format = 'WEBP'; ims.color_mode = 'RGBA' if alpha else 'RGB'; ims.quality = 84
    ims.color_management = 'OVERRIDE'; ims.view_settings.view_transform = 'Standard'; ims.view_settings.look = 'None'; ims.view_settings.exposure = 0
    img = bpy.data.images.load(src)
    if name.startswith('light-'):
        # Licht auf Schwarz -> Licht mit Transparenz: Deckkraft = Helligkeit, Farbe = Licht / Deckkraft.
        # Über dem dunklen Gehäuse entspricht das nahezu additivem Licht, ohne Blend-Modes im Browser.
        import numpy as np
        px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4)
        w, h = img.size
        a = np.clip(px[:, :3].max(axis=1), 0, 1)
        def blur(arr, rad):                   # Boxfilter (zweimal = annähernd Gauß), getrennt nach Achsen
            for _ in range(2):
                for ax in (0, 1):
                    cs = np.cumsum(np.pad(arr, [(rad + 1, rad) if i == ax else (0, 0) for i in range(arr.ndim)], mode='edge'), axis=ax)
                    arr = (np.take(cs, range(2 * rad + 1, cs.shape[ax]), axis=ax) - np.take(cs, range(0, cs.shape[ax] - 2 * rad - 1), axis=ax)) / (2 * rad + 1)
            return arr
        rgb = px[:, :3].reshape(h, w, 3); rad = max(2, w // 200)
        # Farbton aus weichgezeichnetem Licht: Licht ändert die Farbe nur langsam, das Bild komprimiert gut
        col = blur(rgb, rad) / np.maximum(blur(a.reshape(h, w, 1), rad), 1e-4)
        col = np.clip(col.reshape(-1, 3), 0, 1)
        # Schwaches Streulicht: geglättet und in Stufen (Alpha wird verlustfrei gespeichert)
        soft = blur(a.reshape(h, w, 1), max(1, rad // 2)).reshape(-1)
        dim = a < 0.4
        a = np.where(dim, np.round(soft * 48) / 48, a)
        a = np.where(a < 0.03, 0, a)
        px[:, :3] = col; px[:, 3] = a
        img.pixels[:] = px.ravel()
        ims.color_mode = 'RGBA'
    img.save_render(os.path.join(OUT, name + '.webp'), scene=scene)
    if half:
        img.scale(img.size[0] // 2, img.size[1] // 2)
        img.save_render(os.path.join(OUT, name + '-half.webp'), scene=scene)
    print('WEBP', name, os.path.getsize(os.path.join(OUT, name + '.webp')))
webp('base', half=True)
webp('light-cyan', half=True, alpha=False); webp('light-gold', half=True, alpha=False)
for i in range(2): webp(f'cone-{i}')
for f in sorted(os.listdir(RAW)):
    if f.startswith('key-') and f.endswith('.png'): webp(f[:-4])

# Positionen relativ zum Gehäusebild
pct = lambda v: f'{v * 100:.3f}%'
def place(b):
    r = rel(b)
    return f'left:{pct(r[0])};top:{pct(r[1])};width:{pct(r[2] - r[0])};height:{pct(r[3] - r[1])}'
cw, ch = (CHASSIS[2] - CHASSIS[0]) * W, (CHASSIS[3] - CHASSIS[1]) * H
quad = ' '.join(f'{v:.5f}' for p in anchors['face'] for v in p)
lines = ['/* Generiert von tools/nerd-radio/build_boombox.py – nicht von Hand ändern. */',
         f'.nr-device{{aspect-ratio:{round(cw)}/{round(ch)};--nr-face:"{quad}"}}']
for i, side in enumerate(('l', 'r')):
    lines.append(f'.nr-speaker--{side}{{{place(anchors["cones"][i])}}}')
    lines.append(f'.nr-speaker--{side} .nr-speaker__cone{{background-image:url(cone-{i}.webp)}}')
for slot in KEYS:
    sel = f'.nr-key[data-radio-{slot}]'
    up, down = (f'key-{slot}-up.webp', f'key-{slot}-down.webp')
    lines.append(f'{sel}{{{place(anchors["keys"][slot])};background-image:url({up})}}')
    lines.append(f'{sel}:active,{sel}.is-down{{background-image:url({down})}}')
lines += ['.nr-device[data-state=playing] .nr-key[data-radio-play]{background-image:url(key-play-on-up.webp)}',
          '.nr-device[data-state=playing] .nr-key[data-radio-play]:active,.nr-device[data-state=playing] .nr-key[data-radio-play].is-down{background-image:url(key-play-on-down.webp)}',
          '.nr-key[data-radio-mode][aria-pressed=true]{background-image:url(key-mode-on-up.webp)}',
          '.nr-key[data-radio-mode][aria-pressed=true]:active{background-image:url(key-mode-on-down.webp)}',
          '.nr-key[data-radio-list][aria-expanded=true]{background-image:url(key-list-down.webp)}']
with open(os.path.join(OUT, 'layout.css'), 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')
with open(os.path.join(OUT, 'anchors.json'), 'w') as f:
    json.dump({'chassis': CHASSIS, 'resolution': [W, H], **anchors}, f, indent=1)
print('LAYOUT', '\n'.join(lines))
if '--save-blend' in argv: bpy.ops.wm.save_as_mainfile(filepath=os.path.join(RAW, 'boombox.blend'))
