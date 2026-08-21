"""Sculpt sun-bleached driftwood: long Grab block, remesh, bark, broken ends."""
from __future__ import annotations

import math
import os
import random

import bmesh
import bpy

OUT = "/workspace/public/models/pack"


def nuke():
    bpy.ops.wm.read_settings(use_empty=True) if False else None
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def wood_mat():
    m = bpy.data.materials.new("drift_wood")
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Roughness"].default_value = 0.9
    p.inputs["Metallic"].default_value = 0.0
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 11.0
    noise.inputs["Detail"].default_value = 10.0
    noise.inputs["Roughness"].default_value = 0.65
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.28, 0.22, 0.15, 1)
    ramp.color_ramp.elements[1].color = (0.55, 0.48, 0.36, 1)
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.28
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


def apply_mod(obj, name):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=name)


def voxel_remesh(obj, voxel):
    mod = obj.modifiers.new("vremesh", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = voxel
    apply_mod(obj, mod.name)


def displace(obj, kind, strength, scale, seed):
    tex = bpy.data.textures.new(f"t{kind}{seed}", kind)
    tex.noise_scale = scale
    if kind == "MUSGRAVE":
        tex.musgrave_type = "FBM"
        tex.octaves = 5
        tex.dimension_max = 0.9
        tex.lacunarity = 2.1
    elif kind == "VORONOI":
        tex.distance_metric = "DISTANCE"
        tex.color_mode = "INTENSITY"
    elif kind == "CLOUDS":
        tex.noise_depth = 4
        tex.noise_type = "HARD_NOISE"
    mod = obj.modifiers.new(f"d{kind}", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    mod.texture_coords = "LOCAL"
    apply_mod(obj, mod.name)


def smooth(obj, repeat=6, factor=0.5):
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.vertices_smooth(factor=factor, repeat=repeat)
    bpy.ops.object.mode_set(mode="OBJECT")


def decimate(obj, ratio):
    mod = obj.modifiers.new("game", "DECIMATE")
    mod.ratio = ratio
    apply_mod(obj, mod.name)


def block_log(rng: random.Random, forked: bool):
    """Grab pass: a tapered, bent stick — never a straight cylinder."""
    length = 1.7 + rng.random() * 0.5
    r1 = 0.13 + rng.random() * 0.05
    r2 = 0.07 + rng.random() * 0.03
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=8, radius1=r1, radius2=r2, depth=length
    )
    # lie along X (Grab the mass into a log)
    for v in bm.verts:
        x, y, z = v.co.z, v.co.x, v.co.y
        v.co.x, v.co.y, v.co.z = x, y, z
    bend = 0.12 + rng.random() * 0.16
    twist = 0.05 + rng.random() * 0.08
    xmin = min(v.co.x for v in bm.verts)
    xmax = max(v.co.x for v in bm.verts)
    span = max(0.001, xmax - xmin)
    for v in bm.verts:
        t = (v.co.x - xmin) / span
        v.co.z += math.sin(t * math.pi) * bend
        v.co.y += math.sin(t * math.pi * 2.0 + rng.random()) * twist
        # oval section, not round
        v.co.y *= 0.78 + rng.random() * 0.08
    if forked:
        bmesh.ops.create_cone(
            bm, cap_ends=True, cap_tris=False, segments=6,
            radius1=r1 * 0.55, radius2=r2 * 0.7, depth=length * 0.42,
        )
        # last verts of second cone are the newest — rotate into a branch
        # simpler: offset all verts that are still at origin-ish after second cone
        # The second cone is centered at 0 along Z. Transform those around mid.
        mid = xmin + span * (0.55 + rng.random() * 0.2)
        ang = 0.7 + rng.random() * 0.5
        for v in bm.verts:
            # crude: verts with |x|<0.2 and created in second cone sit near 0,0
            if abs(v.co.x) < length * 0.22 and abs(v.co.z) < 0.05:
                # skip — mixed. We'll add branch as a separate object and join.
                pass
        # skip inline fork; handled after mesh
    me = bpy.data.meshes.new("log")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("drift", me)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if forked:
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=r1 * 0.5, radius2=r2 * 0.65, depth=length * 0.45,
            location=(mid, 0.02, 0.04),
        )
        br = bpy.context.active_object
        br.rotation_euler = (0.15, ang, 0.4)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.select_set(True)
        br.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.join()
        obj = bpy.context.active_object
    return obj


def scrape_ends_and_belly(obj):
    """Broken ends + a bleached sitting face (Scrape)."""
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    xs = [v.co.x for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    xmin, xmax = min(xs), max(xs)
    zmin = min(zs)
    span = max(0.001, xmax - xmin)
    for v in bm.verts:
        t = (v.co.x - xmin) / span
        if t < 0.08 or t > 0.92:
            # chew the ends, not a saw cut
            v.co.x += (0.5 - t) * 0.04
            v.co.z += 0.01 if (hash(v.co.y) % 3) else -0.02
        if v.co.z < zmin + 0.04:
            v.co.z = zmin + (v.co.z - zmin) * 0.25
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")


def origin_base(obj):
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    minz = min((obj.matrix_world @ v.co).z for v in obj.data.vertices)
    obj.location.z -= minz


def sculpt(seed: int, forked: bool, name: str):
    rng = random.Random(seed)
    obj = block_log(rng, forked)
    voxel_remesh(obj, 0.018)
    displace(obj, "MUSGRAVE", 0.038, 3.1, seed)
    voxel_remesh(obj, 0.014)
    displace(obj, "VORONOI", 0.022, 6.2, seed + 3)
    displace(obj, "CLOUDS", 0.014, 4.0, seed + 5)
    scrape_ends_and_belly(obj)
    smooth(obj, 4, 0.4)
    voxel_remesh(obj, 0.013)
    smooth(obj, 2, 0.28)
    decimate(obj, 0.28)
    obj.data.materials.append(wood_mat())
    origin_base(obj)
    obj.name = name
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(38))
    except Exception:
        bpy.ops.object.shade_smooth()
    return obj


def export_glb(obj, path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    print("wrote", path, "verts", len(obj.data.vertices))


def main():
    specs = [
        (11, False, "sculpt-drift-a.glb"),
        (29, True, "sculpt-drift-b.glb"),
        (43, False, "sculpt-drift-c.glb"),
        (67, True, "sculpt-drift-d.glb"),
    ]
    for seed, fork, fname in specs:
        nuke()
        obj = sculpt(seed, fork, fname.replace(".glb", ""))
        export_glb(obj, os.path.join(OUT, fname))


if __name__ == "__main__":
    main()
