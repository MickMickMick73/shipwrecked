"""Build camp GLBs in Blender 4.2: barrel, fireplace, fish rack, crate, stump, firewood."""
from __future__ import annotations

import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Vector

OUT = "/workspace/public/models/pack"
SEED = 17
rng = random.Random(SEED)


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def mat(name: str, color, rough=0.72, metal=0.0, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit and "Emission Strength" in p.inputs:
        p.inputs["Emission Color"].default_value = (color[0], color[1], color[2], 1.0)
        p.inputs["Emission Strength"].default_value = emit
    return m


WOOD = None
CHAR = None
STONE = None
IRON = None
COPPER = None
FISH = None
ROPE = None
ASH = None
LEAF = None


def mats():
    global WOOD, CHAR, STONE, IRON, COPPER, FISH, ROPE, ASH, LEAF
    WOOD = mat("wood", (0.42, 0.27, 0.14), 0.78, 0.02)
    CHAR = mat("char", (0.07, 0.05, 0.04), 0.9, 0.0, emit=0.04)
    STONE = mat("stone", (0.36, 0.34, 0.30), 0.92)
    IRON = mat("iron", (0.12, 0.11, 0.10), 0.42, 0.72)
    COPPER = mat("copper", (0.48, 0.24, 0.08), 0.38, 0.78)
    FISH = mat("fish", (0.62, 0.55, 0.38), 0.45, 0.08)
    ROPE = mat("rope", (0.48, 0.40, 0.26), 0.85)
    ASH = mat("ash", (0.14, 0.12, 0.10), 1.0)
    LEAF = mat("leaf", (0.18, 0.32, 0.10), 0.8)


def mesh_from_bm(name: str, bm: bmesh.types.BMesh, material, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    if material:
        obj.data.materials.append(material)
    return obj


def bevel(obj, width=0.006, segs=2):
    mod = obj.modifiers.new("bev", "BEVEL")
    mod.width = width
    mod.segments = segs
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(30)


def smooth(obj, angle=45):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(angle))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def apply_mods(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception:
            pass
    obj.select_set(False)


def cylinder(name, r, depth, segs, material, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=r[0] if isinstance(r, tuple) else r,
        radius2=r[1] if isinstance(r, tuple) else r,
        depth=depth,
    )
    obj = mesh_from_bm(name, bm, material, loc)
    obj.rotation_euler = rot
    return obj


def torus(name, major, minor, material, loc=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=major, segments=28)
    # fallback torus via primitive
    bm.free()
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=28,
        minor_segments=8,
        location=loc,
        rotation=(math.pi / 2, 0, 0),
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def make_barrel(name="barrel"):
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=24, radius1=0.30, radius2=0.30, depth=0.78
    )
    for v in bm.verts:
        t = (v.co.z + 0.39) / 0.78
        bulge = 1.0 + 0.14 * math.sin(max(0.0, min(1.0, t)) * math.pi)
        v.co.x *= bulge
        v.co.y *= bulge
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = mesh_from_bm(f"{name}_body", bm, WOOD)
    bevel(body, 0.004, 2)
    smooth(body, 35)

    hoops = []
    for i, z in enumerate((-0.28, -0.12, 0.12, 0.28)):
        # scale hoop to local bulge
        t = (z + 0.39) / 0.78
        bulge = 1.0 + 0.14 * math.sin(t * math.pi)
        h = torus(f"{name}_hoop{i}", 0.31 * bulge, 0.014, IRON, (0, 0, z))
        hoops.append(h)

    lid = cylinder(f"{name}_lid", 0.29, 0.03, 24, WOOD, (0, 0, 0.40))
    bung = cylinder(f"{name}_bung", 0.035, 0.04, 10, WOOD, (0.0, 0.08, 0.42))
    for o in (body, lid, bung, *hoops):
        apply_mods(o)
        smooth(o, 40)
    return [body, lid, bung, *hoops]


def displace_icosphere(subdiv, radius, seed):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    r = random.Random(seed)
    for v in bm.verts:
        n = v.co.normalized()
        jitter = 1.0 + (r.random() - 0.5) * 0.42
        squash = 0.62 + r.random() * 0.22
        v.co.x *= jitter
        v.co.y *= jitter
        v.co.z *= squash * jitter
    return bm


def make_fireplace():
    objs = []
    ash = cylinder("ash", (0.52, 0.58), 0.06, 16, ASH, (0, 0, 0.03))
    objs.append(ash)
    for i in range(12):
        a = i / 12 * math.tau + rng.random() * 0.08
        rad = 0.58 + rng.random() * 0.08
        bm = displace_icosphere(2, 0.16 + rng.random() * 0.07, 100 + i)
        st = mesh_from_bm(f"stone{i}", bm, STONE, (math.cos(a) * rad, math.sin(a) * rad, 0.12))
        st.rotation_euler = (rng.random() * 0.6, rng.random() * 6, rng.random() * 0.5)
        st.scale = (1.1 + rng.random() * 0.4, 0.7 + rng.random() * 0.35, 0.9 + rng.random() * 0.3)
        bevel(st, 0.008, 1)
        objs.append(st)
    for i in range(5):
        log = cylinder(
            f"log{i}",
            (0.045 + rng.random() * 0.02, 0.055),
            0.55 + rng.random() * 0.2,
            8,
            CHAR,
            (rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.12), 0.12 + i * 0.03),
            (rng.uniform(0.8, 1.4), rng.random() * 6, rng.uniform(-0.4, 0.4)),
        )
        objs.append(log)
    # iron grate
    for i in range(5):
        x = -0.18 + i * 0.09
        bar = cylinder("grate", 0.01, 0.42, 6, IRON, (x, 0, 0.22), (math.pi / 2, 0, 0))
        objs.append(bar)
    for i in range(3):
        y = -0.12 + i * 0.12
        bar = cylinder("grate2", 0.009, 0.38, 6, IRON, (0, y, 0.24), (0, math.pi / 2, 0))
        objs.append(bar)
    # tripod + pot
    for i in range(3):
        a = i / 3 * math.tau
        leg = cylinder(
            f"tripod{i}",
            (0.012, 0.016),
            0.72,
            6,
            IRON,
            (math.cos(a) * 0.22, math.sin(a) * 0.22, 0.38),
            (0.45, 0, a),
        )
        objs.append(leg)
    pot = cylinder("pot", (0.13, 0.16), 0.18, 16, COPPER, (0, 0, 0.62))
    rim = torus("pot_rim", 0.16, 0.012, COPPER, (0, 0, 0.71))
    handle = torus("pot_handle", 0.07, 0.008, IRON, (0.16, 0, 0.68))
    handle.rotation_euler = (0, math.pi / 2, 0)
    objs.extend([pot, rim, handle])
    ember = cylinder("ember", 0.08, 0.04, 8, mat("ember", (1.0, 0.35, 0.08), 0.4, 0.0, emit=3.2), (0.04, -0.03, 0.1))
    objs.append(ember)
    for o in objs:
        apply_mods(o)
        smooth(o, 50)
    return objs


def make_fish(name, loc, yaw):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.12)
    for v in bm.verts:
        v.co.x *= 1.85
        v.co.y *= 0.55
        v.co.z *= 0.7
        if v.co.x > 0.12:
            v.co.x *= 1.15
    body = mesh_from_bm(f"{name}_body", bm, FISH, loc)
    body.rotation_euler = (0.15, 0, yaw)
    tail = cylinder(f"{name}_tail", (0.01, 0.07), 0.1, 4, FISH, (loc[0] - 0.22, loc[1], loc[2] + 0.02), (0, math.pi / 2, yaw))
    fin = cylinder(f"{name}_fin", (0.004, 0.05), 0.08, 4, FISH, (loc[0], loc[1], loc[2] + 0.08), (0.6, 0, yaw))
    return [body, tail, fin]


def make_rack():
    objs = []
    # two A-frames along X
    for side in (-0.55, 0.55):
        for sign in (-1, 1):
            pole = cylinder(
                "leg",
                (0.028, 0.034),
                1.55,
                8,
                WOOD,
                (side + sign * 0.02, sign * 0.22, 0.72),
                (sign * 0.22, 0, 0),
            )
            objs.append(pole)
        join = cylinder("join", 0.022, 0.55, 8, WOOD, (side, 0, 1.28), (math.pi / 2, 0, 0))
        objs.append(join)
    for z, y in ((1.38, 0.0), (1.05, 0.0)):
        bar = cylinder("bar", 0.022, 1.25, 8, WOOD, (0, y, z), (0, math.pi / 2, 0))
        objs.append(bar)
    # lashings
    for x in (-0.55, 0.55):
        las = torus("lash", 0.045, 0.008, ROPE, (x, 0, 1.28))
        objs.append(las)
    # hanging fish
    objs += make_fish("fishA", (-0.22, 0.0, 1.18), 0.15)
    objs += make_fish("fishB", (0.18, 0.04, 1.16), -0.2)
    objs += make_fish("fishC", (0.0, -0.02, 0.86), 0.4)
    for o in objs:
        apply_mods(o)
        smooth(o, 40)
    return objs


def make_crate():
    box = cylinder  # noqa
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=0.56)
    for v in bm.verts:
        v.co.z *= 0.72
    crate = mesh_from_bm("crate", bm, WOOD)
    bevel(crate, 0.01, 2)
    band1 = cylinder("band", (0.0, 0.0), 0.02, 4, IRON)
    # iron straps as thin cubes
    bm2 = bmesh.new()
    bmesh.ops.create_cube(bm2, size=1.0)
    for v in bm2.verts:
        v.co.x *= 0.29
        v.co.y *= 0.29
        v.co.z *= 0.025
    s1 = mesh_from_bm("strap1", bm2, IRON, (0, 0, 0.12))
    bm3 = bmesh.new()
    bmesh.ops.create_cube(bm3, size=1.0)
    for v in bm3.verts:
        v.co.x *= 0.29
        v.co.y *= 0.29
        v.co.z *= 0.025
    s2 = mesh_from_bm("strap2", bm3, IRON, (0, 0, -0.08))
    for o in (crate, s1, s2):
        apply_mods(o)
        smooth(o, 35)
    bpy.data.objects.remove(band1, do_unlink=True)
    return [crate, s1, s2]


def make_stump():
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12, radius1=0.22, radius2=0.18, depth=0.38)
    for v in bm.verts:
        j = 1 + (rng.random() - 0.5) * 0.12
        v.co.x *= j
        v.co.y *= j
    stump = mesh_from_bm("stump", bm, WOOD, (0, 0, 0.19))
    bevel(stump, 0.012, 2)
    apply_mods(stump)
    smooth(stump, 50)
    return [stump]


def make_firewood():
    objs = []
    for i in range(9):
        log = cylinder(
            f"fw{i}",
            (0.035 + rng.random() * 0.02, 0.04),
            0.55 + rng.random() * 0.25,
            7,
            WOOD,
            (rng.uniform(-0.16, 0.16), rng.uniform(-0.14, 0.14), 0.06 + (i % 3) * 0.07),
            (math.pi / 2 + rng.uniform(-0.2, 0.2), rng.random() * 6, rng.uniform(-0.2, 0.2)),
        )
        objs.append(log)
    for o in objs:
        apply_mods(o)
        smooth(o, 40)
    return objs


def make_bucket():
    body = cylinder("bucket", (0.13, 0.16), 0.28, 16, WOOD, (0, 0, 0.14))
    hoop = torus("bhoop", 0.155, 0.01, IRON, (0, 0, 0.22))
    handle = torus("bhandle", 0.14, 0.008, IRON, (0, 0, 0.30))
    handle.rotation_euler = (math.pi / 2, 0, 0)
    for o in (body, hoop, handle):
        apply_mods(o)
        smooth(o, 40)
    return [body, hoop, handle]


def export_glb(path: str, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    print("wrote", path, "objs", len(objects))


def build():
    nuke()
    mats()
    jobs = [
        ("camp-barrel.glb", make_barrel),
        ("camp-fireplace.glb", make_fireplace),
        ("camp-rack.glb", make_rack),
        ("camp-crate.glb", make_crate),
        ("camp-stump.glb", make_stump),
        ("camp-firewood.glb", make_firewood),
        ("camp-bucket.glb", make_bucket),
    ]
    for fname, fn in jobs:
        nuke()
        mats()
        objs = fn()
        export_glb(os.path.join(OUT, fname), objs)


if __name__ == "__main__":
    try:
        build()
    except Exception as e:
        print("BUILD FAILED", e, file=sys.stderr)
        raise
