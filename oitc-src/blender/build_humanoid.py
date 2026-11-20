# LAST ROUND - Menschliche Figur (T-Pose) fuer Mixamo / ActionForge
# Blickrichtung -Y (Blender-Front) = +Z in glTF/FBX. Ursprung = Fuesse.
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
    def __init__(s): s.bm = bmesh.new(); s.mi = 0
    def _add(s, fn, loc, rot):
        before = set(s.bm.verts); bf = set(s.bm.faces); fn()
        new = [v for v in s.bm.verts if v not in before]
        for fc in s.bm.faces:
            if fc not in bf: fc.material_index = s.mi
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
    def loft(s, secs, n=14, loc=(0, 0, 0), rot=(0, 0, 0)):
        def f():
            rings = [[s.bm.verts.new((cx + rx * math.cos(2 * math.pi * i / n), cy + ry * math.sin(2 * math.pi * i / n), z)) for i in range(n)] for z, cx, cy, rx, ry in secs]
            for a, b in zip(rings, rings[1:]):
                for i in range(n): s.bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
            s.bm.faces.new(rings[0][::-1]); s.bm.faces.new(rings[-1])
        return s._add(f, loc, rot)
    def build(s, name, material, loc=(0, 0, 0), parent=None, smooth=False):
        bmesh.ops.recalc_face_normals(s.bm, faces=s.bm.faces[:])
        bmesh.ops.triangulate(s.bm, faces=s.bm.faces[:], quad_method='BEAUTY', ngon_method='EAR_CLIP')
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        for p in me.polygons: p.use_smooth = smooth
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        o.location = loc; o.parent = parent
        for m in (material if isinstance(material, (list, tuple)) else [material]):
            if m: me.materials.append(m)
        _made.append(o); return o


def humanoid(team='#d9534f'):
    mats = [M('Skin', '#d9a98a', 0, 0.75), M('Cloth', '#4a5240', 0, 0.9), M('Pants', '#3a3f4a', 0, 0.9), M('Boots', '#1c1c1e', 0, 0.8),
            M('TeamColor', team, 0, 0.6), M('Gear', '#26282d', 0.3, 0.6), M('Glove', '#1f2329', 0, 0.9)]
    SKIN, CLOTH, PANTS, BOOTS, TEAM, GEAR, GLOVE = range(7)
    b = B(); P = math.pi
    b.mi = CLOTH; b.loft([(0.90, 0, 0, .17, .11), (1.0, 0, 0, .165, .105), (1.10, 0, 0, .145, .095), (1.25, 0, 0, .17, .115), (1.38, 0, 0, .185, .115), (1.46, 0, 0, .17, .095), (1.52, 0, 0, .06, .06)])
    b.mi = SKIN; b.loft([(1.48, 0, 0, .055, .058), (1.6, 0, -0.005, .045, .05)])
    b.sph((0, -0.01, 1.68), 1, sc=(.085, .1, .11), seg=16); b.box((0, -0.1, 1.665), (.02, .03, .04), bevel=0.005)
    for sx in (-1, 1): b.sph((sx * .088, 0, 1.68), 1, sc=(.012, .02, .03), seg=8)
    b.mi = TEAM; b.sph((0, 0.005, 1.695), 1, sc=(.1, .115, .105), seg=16, dome=True)
    b.loft([(1.08, 0, 0, .165, .12), (1.25, 0, 0, .18, .128), (1.40, 0, 0, .185, .122), (1.45, 0, 0, .15, .1)])
    b.mi = GEAR; b.box((0, -0.095, 1.685), (.17, .03, .04), bevel=0.01); b.box((0, 0.15, 1.2), (.26, .11, .32), bevel=0.02)
    b.loft([(0.93, 0, 0, .178, .118), (0.99, 0, 0, .178, .118)])
    for sx in (-1, 1):
        b.mi = PANTS; b.loft([(0.10, 0, 0.005, .045, .052), (0.2, 0, 0, .048, .055), (0.38, 0, 0, .062, .07), (0.5, 0, 0, .058, .066), (0.62, 0, 0, .083, .09), (0.8, 0, 0, .098, .108), (0.93, 0, 0, .105, .115)], loc=(sx * 0.095, 0, 0))
        b.mi = BOOTS; b.loft([(0.0, 0, 0, .05, .058), (0.2, 0, 0, .056, .062)], loc=(sx * 0.095, 0, 0)); b.box((sx * 0.095, -0.065, 0.04), (.095, .26, .08), bevel=0.02)
        b.mi = GEAR; b.box((sx * 0.095, -0.075, 0.5), (.1, .03, .12), bevel=0.01)
        rot = (0, sx * P / 2, 0)
        b.mi = SKIN; b.loft([(0.17, 0, 0, .05, .055), (0.30, 0, 0, .045, .048), (0.46, 0, 0, .038, .042), (0.60, 0, 0, .032, .036), (0.70, 0, 0, .028, .034)], loc=(0, 0, 1.44), rot=rot)
        b.mi = CLOTH; b.loft([(0.17, 0, 0, .06, .065), (0.30, 0, 0, .054, .057), (0.46, 0, 0, .047, .05)], loc=(0, 0, 1.44), rot=rot)
        b.mi = GLOVE; b.loft([(0.70, 0, 0, .024, .034), (0.76, 0, 0, .014, .044), (0.82, 0, 0, .012, .042)], loc=(0, 0, 1.44), rot=rot)
        for yo in (-0.027, -0.009, 0.009, 0.027): b.cap((sx * 0.865, yo, 1.44), 0.0075, 0.07, rot=(0, P / 2, 0), seg=8)
        b.cap((sx * 0.78, -0.05, 1.44), 0.009, 0.05, rot=(0, P / 2, 0), seg=8)
    b.mi = GEAR; b.box((0.17, -0.01, 0.78), (.035, .07, .16), bevel=0.01)
    o = b.build('Soldier', mats, smooth=True)
    return o

_made.clear(); o = humanoid(); _made.append(o)
bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, 'humanoid_tpose.glb'), export_format='GLB', use_selection=True)
bpy.ops.export_scene.fbx(filepath=os.path.join(OUT, 'humanoid_tpose.fbx'), use_selection=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BLEND, 'humanoid.blend'))
print('FERTIG: humanoid_tpose.glb / .fbx')
