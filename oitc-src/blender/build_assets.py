# LAST ROUND – Asset-Generator fuer Blender 4.x/5.x
# Blender -> Scripting -> Neu -> Einfuegen -> Skript ausfuehren (Alt+P).
# Exportiert GLB-Modelle nach OUT und speichert eine .blend-Uebersicht.
# Konvention: Vorwaerts = +Y (Blender) -> -Z in three.js, Einheiten = Meter.
import bpy, bmesh, math, os, traceback
from mathutils import Matrix, Euler, Vector

OUT = r"D:\Coding\LastRound\assets\models"
BLEND = r"D:\Coding\LastRound\blend"
os.makedirs(OUT, exist_ok=True); os.makedirs(BLEND, exist_ok=True)
LOG = []; _made = []; _mats = {}

if bpy.context.object and bpy.context.object.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
for me in list(bpy.data.meshes): bpy.data.meshes.remove(me)

def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def M(name, hx, metal=0.0, rough=0.6, emit=0.0):
    if name in _mats: return _mats[name]
    hx = hx.lstrip('#'); r, g, b = [lin(int(hx[i:i + 2], 16)) for i in (0, 2, 4)]
    m = bpy.data.materials.new(name); m.use_nodes = True
    bs = m.node_tree.nodes["Principled BSDF"]
    bs.inputs["Base Color"].default_value = (r, g, b, 1)
    bs.inputs["Metallic"].default_value = metal; bs.inputs["Roughness"].default_value = rough
    if emit:
        try: bs.inputs["Emission Color"].default_value = (r, g, b, 1); bs.inputs["Emission Strength"].default_value = emit
        except Exception: pass
    _mats[name] = m; return m

def empty(name, loc=(0, 0, 0), parent=None):
    o = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(o)
    o.location = loc; o.parent = parent; _made.append(o); return o

class B:
    def __init__(s): s.bm = bmesh.new()
    def _add(s, fn, loc, rot):
        before = set(s.bm.verts); fn()
        new = [v for v in s.bm.verts if v not in before]
        m = Matrix.Translation(loc) @ Euler(rot, 'XYZ').to_matrix().to_4x4()
        bmesh.ops.transform(s.bm, matrix=m, verts=new); return s
    def box(s, loc, size, rot=(0, 0, 0), bevel=0):
        def f():
            r = bmesh.ops.create_cube(s.bm, size=1.0)
            bmesh.ops.scale(s.bm, vec=Vector(size), verts=r['verts'])
            if bevel > 0:
                es = list({e for v in r['verts'] for e in v.link_edges})
                bmesh.ops.bevel(s.bm, geom=es, offset=bevel, segments=2, affect='EDGES')
        return s._add(f, loc, rot)
    def cyl(s, loc, r, d, rot=(0, 0, 0), seg=16, r2=None):
        def f(): bmesh.ops.create_cone(s.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=d)
        return s._add(f, loc, rot)
    def _sphere(s, r, seg):
        return bmesh.ops.create_uvsphere(s.bm, u_segments=seg, v_segments=max(4, seg // 2), radius=r)
    def sph(s, loc, r, sc=(1, 1, 1), seg=12, dome=False):
        def f():
            res = s._sphere(r, seg); bmesh.ops.scale(s.bm, vec=Vector(sc), verts=res['verts'])
            if dome: bmesh.ops.delete(s.bm, geom=[v for v in res['verts'] if v.co.z < -0.002], context='VERTS')
        return s._add(f, loc, (0, 0, 0))
    def cap(s, loc, r, length, rot=(0, 0, 0), seg=10, sc=(1, 1, 1)):
        def f():
            c = bmesh.ops.create_cone(s.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=length)['verts']
            for z in (length / 2, -length / 2):
                sp = s._sphere(r, seg)['verts']; bmesh.ops.translate(s.bm, vec=(0, 0, z), verts=sp); c += sp
            bmesh.ops.scale(s.bm, vec=Vector(sc), verts=c)
        return s._add(f, loc, rot)
    def prof(s, pts, t, loc=(0, 0, 0), rot=(0, 0, 0)):
        def f():
            vs = [s.bm.verts.new((-t / 2, y, z)) for y, z in pts]; face = s.bm.faces.new(vs)
            ret = bmesh.ops.extrude_face_region(s.bm, geom=[face])
            ex = [g for g in ret['geom'] if isinstance(g, bmesh.types.BMVert)]
            bmesh.ops.translate(s.bm, vec=(t, 0, 0), verts=ex)
        return s._add(f, loc, rot)
    def build(s, name, material, loc=(0, 0, 0), parent=None, smooth=False):
        bmesh.ops.recalc_face_normals(s.bm, faces=s.bm.faces[:])
        bmesh.ops.triangulate(s.bm, faces=s.bm.faces[:], quad_method='BEAUTY', ngon_method='EAR_CLIP')
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = smooth
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        o.location = loc; o.parent = parent
        if material: me.materials.append(material)
        _made.append(o); return o

def aim(v):  # Euler, das +Z auf Richtung v dreht
    return Vector((0, 0, 1)).rotation_difference(Vector(v).normalized()).to_euler()

# ---------------------------------------------------------------- Pistole
def pistol():
    root = empty('Pistol')
    poly = M('polymer', '#1d1f23', 0.1, 0.6); steel = M('steel', '#8a9099', 0.9, 0.3); dsteel = M('dark_steel', '#17191c', 0.8, 0.4)
    wood = M('walnut', '#5b3b24', 0, 0.55); glove = M('glove', '#1f2329', 0, 0.9); sleeve = M('sleeve', '#3b4636', 0, 0.9)
    white = M('sight_dot', '#f5f5e8', 0, 0.5, emit=1.5); brass = M('brass', '#d9a93a', 0.9, 0.25)
    fr = [(-0.08, -0.022), (0.2, -0.022), (0.235, -0.035), (0.235, -0.052), (0.105, -0.052), (0.05, -0.052), (0.02, -0.056),
          (0.012, -0.075), (-0.004, -0.176), (-0.092, -0.178), (-0.106, -0.04), (-0.1, -0.026)]
    b = B().prof(fr, 0.03)
    b.box((0, 0.104, -0.071), (0.022, 0.008, 0.04), bevel=0.001)       # Abzugsbuegel vorn
    b.box((0, 0.067, -0.09), (0.022, 0.082, 0.008), bevel=0.001)       # Abzugsbuegel unten
    b.box((0, -0.049, -0.184), (0.032, 0.074, 0.012), bevel=0.002)     # Magazinboden
    b.box((0, 0.17, -0.056), (0.012, 0.05, 0.008))                     # Schiene
    b.build('Frame', poly, parent=root)
    sl = [(-0.08, -0.026), (-0.08, 0.02), (-0.066, 0.034), (0.23, 0.034), (0.262, 0.026), (0.262, -0.014), (0.245, -0.026)]
    s = B().prof(sl, 0.034)
    for i in range(6):
        for sx in (-0.0172, 0.0172): s.box((sx, -0.062 + i * 0.0065, 0.006), (0.0016, 0.003, 0.03))
    s.box((0, 0.245, 0.04), (0.008, 0.012, 0.012)); s.box((-0.0085, -0.062, 0.04), (0.007, 0.012, 0.012)); s.box((0.0085, -0.062, 0.04), (0.007, 0.012, 0.012))
    s.cyl((0, 0.268, 0.004), 0.0075, 0.03, rot=(math.pi / 2, 0, 0))
    slide = s.build('Slide', steel, parent=root)
    d = B().box((0.0171, 0.07, 0.012), (0.002, 0.052, 0.016)); d.box((-0.0171, 0.07, 0.012), (0.002, 0.052, 0.016))
    d.build('SlidePorts', dsteel, parent=slide)
    w = B().box((0, 0.2385, 0.0425), (0.0032, 0.001, 0.0032)); w.box((-0.0085, -0.0685, 0.0425), (0.0032, 0.001, 0.0032)); w.box((0.0085, -0.0685, 0.0425), (0.0032, 0.001, 0.0032))
    w.build('SightDots', white, parent=slide)
    B().box((0, 0, 0.01), (0.009, 0.012, 0.02), bevel=0.001).build('Hammer', dsteel, loc=(0, -0.086, 0.012), parent=root)
    B().box((0, 0, -0.012), (0.006, 0.008, 0.024)).build('Trigger', dsteel, loc=(0, 0.058, -0.056), parent=root)
    gp = [(-0.098, -0.045), (-0.012, -0.075), (-0.013, -0.168), (-0.09, -0.17)]
    for sx, n in ((0.0165, 'GripR'), (-0.0165, 'GripL')): B().prof(gp, 0.004).build(n, wood, loc=(sx, 0, 0), parent=root)
    B().cyl((0, 0, 0), 0.0045, 0.022, rot=(math.pi / 2, 0, 0), seg=10).build('Round', brass, loc=(0.0176, 0.062, 0.012), parent=slide)
    h = B().box((0.034, -0.06, -0.095), (0.03, 0.075, 0.085), bevel=0.008)
    h.box((0.012, -0.104, -0.07), (0.04, 0.012, 0.05), bevel=0.004)
    for z, y in ((-0.094, 0.02), (-0.119, 0.016), (-0.144, 0.012)): h.cap((-0.004, y, z), 0.0108, 0.034, rot=(0, math.pi / 2, 0))
    h.cap((-0.026, 0.01, -0.038), 0.0105, 0.05, rot=(math.pi / 2, 0, 0))
    h.cap((-0.021, 0.07, -0.062), 0.0095, 0.05, rot=(math.pi / 2, 0, 0))
    wr = Vector((0.03, -0.12, -0.1)); da = Vector((0.3, -0.89, -0.35)).normalized()
    h.cyl(wr + da * 0.03, 0.04, 0.05, rot=aim(da))
    h.build('Hand', glove, parent=root, smooth=True)
    B().cap(wr + da * 0.2, 0.036, 0.32, rot=aim(da), seg=12).build('Sleeve', sleeve, parent=root, smooth=True)

def casing():
    B().cyl((0, 0, 0), 0.0045, 0.019, seg=10).cyl((0, 0, 0.0105), 0.0035, 0.004, seg=10).build('Casing', M('brass', '#d9a93a', 0.9, 0.25), smooth=True)
def bullet():
    br = M('brass', '#d9a93a', 0.9, 0.25)
    root = empty('Round'); B().cyl((0, 0, 0.0095), 0.0045, 0.019, seg=10).build('RoundCase', br, parent=root, smooth=True)
    B().sph((0, 0, 0.022), 0.0042, sc=(1, 1, 1.5), seg=10).build('RoundTip', M('copper', '#b87333', 0.8, 0.35), parent=root, smooth=True)

# ---------------------------------------------------------------- Bot
def bot(hx):
    col = M('bot_' + hx, '#' + hx, 0, 0.6); dark = M('bot_dark', '#2b2d33', 0, 0.7); cloth = M('bot_cloth', '#3d4350', 0, 0.8)
    skin = M('bot_skin', '#e0b89a', 0, 0.7); visor = M('bot_visor', '#0c0f14', 0.8, 0.15); gm = M('bot_gun', '#8c929c', 0.8, 0.35)
    root = empty('Bot')
    to = B().cap((0, 0, 0.2), 0.19, 0.36, seg=12, sc=(1.15, 0.75, 1)).build('Torso', cloth, loc=(0, 0, 0.95), parent=root, smooth=True)
    B().box((0, 0, 0.25), (0.5, 0.3, 0.42), bevel=0.04).build('Vest', col, parent=to)
    B().box((0, -0.2, 0.21), (0.34, 0.14, 0.4), bevel=0.02).build('Pack', dark, parent=to)
    B().box((0, 0, 0), (0.34, 0.22, 0.2), bevel=0.02).build('Belt', dark, parent=to)
    hd = B().sph((0, 0, 0.16), 0.135, seg=14).build('Head', skin, loc=(0, 0, 1.5), parent=root, smooth=True)
    B().sph((0, 0, 0.18), 0.175, seg=14, dome=True).build('Helmet', col, parent=hd, smooth=True)
    B().box((0, 0.13, 0.17), (0.24, 0.06, 0.07), bevel=0.01).build('Visor', visor, parent=hd)
    for sx, n in ((-1, 'L'), (1, 'R')):
        th = B().cap((0, 0, -0.215), 0.08, 0.27).build('Thigh' + n, dark, loc=(sx * 0.12, 0, 0.92), parent=root, smooth=True)
        sh = B().cap((0, 0, -0.22), 0.065, 0.31).box((0, 0.05, -0.46), (0.15, 0.27, 0.09), bevel=0.02).build('Shin' + n, dark, loc=(0, 0, -0.43), parent=th, smooth=True)
        ua = B().cap((0, 0, -0.15), 0.052, 0.2).build('UpperArm' + n, col, loc=(sx * 0.3, 0, 1.38), parent=root, smooth=True)
        fa = B().cap((0, 0, -0.135), 0.044, 0.18).build('ForeArm' + n, cloth, loc=(0, 0, -0.3), parent=ua, smooth=True)
        B().sph((0, 0, -0.29), 0.05).build('Hand' + n, skin, parent=fa, smooth=True)
        if n == 'R':
            g = B().box((0, 0.02, -0.37), (0.034, 0.04, 0.18), bevel=0.004).box((0, -0.012, -0.31), (0.03, 0.04, 0.07), bevel=0.004)
            g.build('Gun', gm, parent=fa)

# ---------------------------------------------------------------- Props
def crate():
    root = empty('Crate'); wood = M('crate_wood', '#8a5a33', 0, 0.8); dk = M('crate_beam', '#5a3920', 0, 0.85)
    B().box((0, 0, 0.6), (1.16, 1.16, 1.16)).build('CrateBody', wood, parent=root)
    b = B()
    for sx in (-1, 1):
        for sy in (-1, 1): b.box((sx * 0.55, sy * 0.55, 0.6), (0.1, 0.1, 1.2))
    for z in (0.05, 1.15):
        for s in (-1, 1): b.box((0, s * 0.55, z), (1.2, 0.1, 0.1)); b.box((s * 0.55, 0, z), (0.1, 1.2, 0.1))
    for s in (-1, 1):
        b.box((0, s * 0.585, 0.6), (0.09, 0.03, 1.45), rot=(0, math.pi / 4, 0))
        b.box((s * 0.585, 0, 0.6), (0.03, 0.09, 1.45), rot=(math.pi / 4, 0, 0))
    b.build('CrateFrame', dk, parent=root)

def barrel(hx, name):
    root = empty(name); body = M('barrel_' + hx, '#' + hx, 0.4, 0.5); rib = M('barrel_rib', '#2f3236', 0.6, 0.5)
    B().cyl((0, 0, 0.45), 0.29, 0.9, seg=20).build('BarrelBody', body, parent=root)
    b = B()
    for z in (0.18, 0.45, 0.72): b.cyl((0, 0, z), 0.305, 0.035, seg=20)
    b.cyl((0, 0, 0.9), 0.3, 0.03, seg=20); b.cyl((0.12, 0.1, 0.92), 0.04, 0.03, seg=10); b.cyl((0, 0, 0.0), 0.3, 0.03, seg=20)
    b.build('BarrelRibs', rib, parent=root)

def barrier():
    pts = [(-0.3, 0), (0.3, 0), (0.3, 0.08), (0.2, 0.3), (0.12, 0.8), (-0.12, 0.8), (-0.2, 0.3), (-0.3, 0.08)]
    B().prof(pts, 3.0).build('Barrier', M('concrete', '#9a9a96', 0, 0.95))
    B().box((0, 0, 0.81), (3.0, 0.26, 0.02)).build('BarrierCap', M('hazard', '#e8b923', 0, 0.7))

def pillar():
    root = empty('Pillar'); c = M('concrete', '#9a9a96', 0, 0.95)
    b = B().box((0, 0, 1.6), (1.2, 1.2, 3.2)); b.box((0, 0, 0.15), (1.4, 1.4, 0.3), bevel=0.03); b.box((0, 0, 3.25), (1.4, 1.4, 0.2), bevel=0.03)
    b.build('PillarBody', c, parent=root)
    B().box((0, 0, 0.8), (1.22, 1.22, 0.1)).build('PillarStripe', M('hazard', '#e8b923', 0, 0.7), parent=root)

def dumpster():
    root = empty('Dumpster')
    B().prof([(-0.55, 0.3), (-0.55, 1.2), (0.55, 1.2), (0.5, 0.3)], 2.2).build('DumpsterBody', M('dumpster', '#2f5d3a', 0.2, 0.7), parent=root)
    B().box((0, 0, 1.24), (2.26, 1.16, 0.07), bevel=0.01).build('DumpsterLid', M('dumpster_dark', '#1e2a22', 0.2, 0.7), parent=root)
    w = B()
    for sx in (-1, 1):
        for sy in (-0.4, 0.4): w.cyl((sx * 0.95, sy, 0.12), 0.12, 0.06, rot=(0, math.pi / 2, 0))
    w.box((0, 0, 0.27), (2.0, 0.9, 0.1)); w.build('DumpsterWheels', M('rubber', '#18181a', 0, 0.9), parent=root)

def lamp():
    root = empty('Lamp'); dk = M('lamp_dark', '#202226', 0.6, 0.5)
    b = B().cyl((0, 0, 2.25), 0.06, 4.5).cyl((0, 0, 0.1), 0.15, 0.2); b.box((0, 0.4, 4.45), (0.08, 0.9, 0.08)); b.box((0, 0.85, 4.4), (0.35, 0.7, 0.1), bevel=0.02)
    b.build('LampPole', dk, parent=root)
    B().box((0, 0.85, 4.34), (0.3, 0.6, 0.02)).build('LampLight', M('lamp_light', '#fff2c9', 0, 0.5, emit=6.0), parent=root)

def sandbags():
    root = empty('Sandbags'); b = B()
    for layer in range(2):
        for i in range(3): b.box(((i - 1) * 0.58 + layer * 0.29, 0, 0.1 + layer * 0.2), (0.56, 0.34, 0.2), bevel=0.06)
    b.build('SandbagStack', M('sand', '#8b7f5c', 0, 1.0), parent=root, smooth=True)

# ---------------------------------------------------------------- Export + Layout
x_off = 0.0
def export(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in _made: o.select_set(True)
    bpy.context.view_layer.objects.active = _made[0]
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', use_selection=True)

def asset(name, fn, gap=3.0):
    global x_off
    _made.clear()
    try:
        fn(); export(name); LOG.append('OK   ' + name)
    except Exception:
        LOG.append('FAIL ' + name + '\n' + traceback.format_exc())
    for o in _made:
        if o.parent is None: o.location.x += x_off
    x_off += gap

asset('pistol', pistol, 1.0); asset('casing', casing, 0.5); asset('round', bullet, 0.5)
for n, hx in (('red', 'd9534f'), ('blue', '4cb5e0'), ('orange', 'f0a93a'), ('purple', '9b59b6')):
    asset('bot_' + n, lambda hx=hx: bot(hx), 1.5)
asset('crate', crate, 2.0); asset('barrel_red', lambda: barrel('b03a2e', 'BarrelRed'), 1.5); asset('barrel_yellow', lambda: barrel('d9a521', 'BarrelYellow'), 1.5)
asset('barrier', barrier, 4.0); asset('pillar', pillar, 2.5); asset('dumpster', dumpster, 3.5); asset('lamp', lamp, 2.0); asset('sandbags', sandbags, 2.0)

with open(os.path.join(BLEND, 'build_log.txt'), 'w', encoding='utf-8') as f: f.write('\n'.join(LOG))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND, 'last_round_assets.blend'))
print('\n'.join(LOG))
