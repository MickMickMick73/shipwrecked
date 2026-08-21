"""Build held tools: axe, cutlass, rod, hammer, paddle — UV'd for wood/iron skins."""
from __future__ import annotations

import math
import os

import bmesh
import bpy

OUT = "/workspace/public/models/pack"


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def mat(name, color, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    return m


def mesh_from_bm(name, bm, material, loc=(0, 0, 0)):
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


def apply_bevel(obj, width=0.004, segs=2):
    mod = obj.modifiers.new("bev", "BEVEL")
    mod.width = width
    mod.segments = segs
    mod.limit_method = "ANGLE"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)


def smooth(obj, ang=40):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(ang))
    except Exception:
        bpy.ops.object.shade_smooth()
    obj.select_set(False)


def smart_uv(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def cone(name, r1, r2, depth, segs, material, loc=(0, 0, 0), rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth)
    obj = mesh_from_bm(name, bm, material, loc)
    obj.rotation_euler = rot
    return obj


def WOOD():
    return mat("wood", (0.42, 0.27, 0.14), 0.84, 0.03)


def IRON():
    return mat("iron", (0.55, 0.56, 0.58), 0.32, 0.78)


def STEEL():
    return mat("steel", (0.72, 0.74, 0.76), 0.22, 0.86)


def BRASS():
    return mat("copper", (0.62, 0.42, 0.14), 0.38, 0.72)


def LEATHER():
    return mat("leather", (0.28, 0.16, 0.08), 0.9, 0.0)


def finish(objs):
    for o in objs:
        apply_bevel(o, 0.003, 2)
        smart_uv(o)
        smooth(o, 42)
    return objs


def make_axe():
    w, ir, st, le = WOOD(), IRON(), STEEL(), LEATHER()
    haft = cone("haft", 0.018, 0.026, 0.86, 10, w, (0, 0, 0.0))
    wrap = cone("wrap", 0.028, 0.03, 0.08, 10, le, (0, 0, 0.28))
    # axe head: wedge
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= 0.055
        v.co.y *= 0.09
        v.co.z *= 0.07
        if v.co.y > 0:
            v.co.x *= 0.35
            v.co.z *= 1.55
    head = mesh_from_bm("head", bm, ir, (0.01, 0, 0.38))
    bm2 = bmesh.new()
    bmesh.ops.create_cube(bm2, size=1.0)
    for v in bm2.verts:
        v.co.x *= 0.012
        v.co.y *= 0.11
        v.co.z *= 0.04
        if v.co.y > 0:
            v.co.x *= 0.2
    bit = mesh_from_bm("bit", bm2, st, (0.01, 0.09, 0.38))
    poll = cone("poll", 0.035, 0.04, 0.05, 8, ir, (0.01, -0.07, 0.38), (math.pi / 2, 0, 0))
    return finish([haft, wrap, head, bit, poll])


def make_cutlass():
    w, st, br, le = WOOD(), STEEL(), BRASS(), LEATHER()
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        t = max(0.0, min(1.0, (v.co.z + 0.5)))
        v.co.x *= 0.011 * (1.0 - t * 0.62)
        v.co.y *= 0.042 * (1.0 - t * 0.2)
        v.co.z *= 0.34
        v.co.y += t * t * 0.07
    blade = mesh_from_bm("blade", bm, st, (0, 0.015, 0.36))
    guard = cone("guard", 0.065, 0.068, 0.022, 14, br, (0, 0, 0.04), (math.pi / 2, 0, 0))
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.05,
        minor_radius=0.007,
        major_segments=18,
        minor_segments=6,
        location=(0, 0.035, -0.02),
        rotation=(math.pi / 2, 0.15, 0),
    )
    bow = bpy.context.active_object
    bow.name = "bow"
    bow.data.materials.append(br)
    grip = cone("grip", 0.017, 0.02, 0.14, 10, le, (0, 0, -0.05))
    pommel = cone("pommel", 0.024, 0.02, 0.028, 10, br, (0, 0, -0.135))
    objs = finish([blade, guard, bow, grip, pommel])
    for o in objs:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "cutlass"
    return [joined]


def make_rod():
    w, ir, br, le = WOOD(), IRON(), BRASS(), LEATHER()
    butt = cone("butt", 0.016, 0.018, 0.22, 10, le, (0, 0, 0.0))
    mid = cone("mid", 0.014, 0.01, 0.7, 10, w, (0, 0, 0.44))
    tip = cone("tip", 0.01, 0.004, 0.7, 8, w, (0, 0, 1.12))
    reel = cone("reel", 0.035, 0.035, 0.022, 12, br, (0.04, 0, 0.12), (0, math.pi / 2, 0))
    spool = cone("spool", 0.028, 0.028, 0.03, 12, ir, (0.055, 0, 0.12), (0, math.pi / 2, 0))
    guides = []
    for i, z in enumerate((0.55, 0.85, 1.15, 1.38)):
        g = cone(f"guide{i}", 0.012, 0.012, 0.004, 8, ir, (0, 0.016, z), (math.pi / 2, 0, 0))
        guides.append(g)
    return finish([butt, mid, tip, reel, spool, *guides])


def make_hammer():
    w, ir, le = WOOD(), IRON(), LEATHER()
    haft = cone("haft", 0.014, 0.018, 0.52, 10, w)
    wrap = cone("wrap", 0.02, 0.022, 0.06, 10, le, (0, 0, 0.16))
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= 0.08
        v.co.y *= 0.045
        v.co.z *= 0.045
    head = mesh_from_bm("head", bm, ir, (0, 0, 0.24))
    face = cone("face", 0.04, 0.042, 0.03, 12, ir, (0.09, 0, 0.24), (0, math.pi / 2, 0))
    peen = cone("peen", 0.028, 0.01, 0.05, 8, ir, (-0.09, 0, 0.24), (0, math.pi / 2, 0))
    return finish([haft, wrap, head, face, peen])


def make_paddle():
    w, le = WOOD(), LEATHER()
    shaft = cone("shaft", 0.014, 0.018, 0.85, 10, w)
    grip = cone("grip", 0.02, 0.018, 0.1, 10, le, (0, 0, -0.42))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.12)
    for v in bm.verts:
        v.co.x *= 0.95
        v.co.y *= 0.12
        v.co.z *= 1.55
    blade = mesh_from_bm("blade", bm, w, (0, 0, 0.55))
    spine = cone("spine", 0.012, 0.008, 0.32, 8, w, (0, 0.012, 0.55))
    return finish([shaft, grip, blade, spine])


def export_glb(path, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
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
    print("wrote", path, "objs", len(objs))


def main():
    jobs = [
        ("tool-axe.glb", make_axe),
        ("tool-cutlass.glb", make_cutlass),
        ("tool-rod.glb", make_rod),
        ("tool-hammer.glb", make_hammer),
        ("tool-paddle.glb", make_paddle),
    ]
    for fname, fn in jobs:
        nuke()
        objs = fn()
        export_glb(os.path.join(OUT, fname), objs)


if __name__ == "__main__":
    main()
