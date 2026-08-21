"""
Sculpting practice: volcanic beach boulder for the island.

Maps to the real Sculpt Mode passes:
  1. Block-in     - stretched cube (Grab / silhouette)
  2. Voxel remesh - even clay (Ctrl+R remesh)
  3. Clay strips  - large Musgrave displacement
  4. Crease       - sharp Voronoi ridges
  5. Scrape       - flatten the top sitting plane
  6. Smooth       - polish
  7. Decimate     - game export
"""
from __future__ import annotations

import math
import os
import random

import bmesh
import bpy
from mathutils import Vector, noise as mathnoise

OUT = "/workspace/public/models/pack"
PREV = "/workspace/public/sculpt-preview.png"
SEED = 23


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def mat_stone():
    m = bpy.data.materials.new("sculpt_stone")
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (0.34, 0.31, 0.27, 1)
    p.inputs["Roughness"].default_value = 0.88
    p.inputs["Metallic"].default_value = 0.02
    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = 7.5
    tex.inputs["Detail"].default_value = 8.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.22, 0.20, 0.17, 1)
    ramp.color_ramp.elements[1].color = (0.48, 0.44, 0.36, 1)
    nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(tex.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    return m


def block_in(rng: random.Random):
    """Pass 1 — Grab: a chunk, not a ball."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= 1.15 + rng.random() * 0.25
        v.co.y *= 0.85 + rng.random() * 0.2
        v.co.z *= 0.55 + rng.random() * 0.18
        v.co.z += 0.08
    me = bpy.data.meshes.new("block")
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new("sculpt_rock", me)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    return obj


def voxel_remesh(obj, voxel=0.045):
    """Pass 2 — Ctrl+R voxel remesh: even clay, no stretched faces."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mod = obj.modifiers.new("vremesh", "REMESH")
    mod.mode = "VOXEL"
    mod.voxel_size = voxel
    bpy.ops.object.modifier_apply(modifier=mod.name)


def displace_pass(obj, kind: str, strength: float, scale: float, seed: int):
    """Clay Strips / Crease using procedural height — same idea as a brush pass."""
    tex = bpy.data.textures.new(f"tex_{kind}_{seed}", kind)
    if kind == "MUSGRAVE":
        tex.musgrave_type = "FBM"
        tex.noise_scale = scale
        tex.dimension_max = 0.85
        tex.lacunarity = 2.2
        tex.octaves = 5
    elif kind == "VORONOI":
        tex.noise_scale = scale
        tex.distance_metric = "DISTANCE"
        tex.color_mode = "INTENSITY"
    elif kind == "CLOUDS":
        tex.noise_scale = scale
        tex.noise_depth = 3
    mod = obj.modifiers.new(f"disp_{kind}", "DISPLACE")
    mod.texture = tex
    mod.strength = strength
    mod.mid_level = 0.5
    mod.texture_coords = "LOCAL"
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def scrape_top(obj, flatten=0.42):
    """Pass 5 — Scrape/Flatten: a sitting plane so it plants on sand."""
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(obj.data)
    zs = [v.co.z for v in bm.verts]
    zmin, zmax = min(zs), max(zs)
    cut = zmin + (zmax - zmin) * 0.18
    for v in bm.verts:
        if v.co.z < cut:
            v.co.z = zmin + (v.co.z - zmin) * 0.15
        # flatten a facet near the top
        if v.co.z > zmax - 0.12:
            v.co.z = zmax - flatten * (v.co.z - (zmax - 0.12))
    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode="OBJECT")


def smooth_pass(obj, repeat=8, factor=0.55):
    """Pass 6 — Shift+Smooth. Half of sculpting is this."""
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.vertices_smooth(factor=factor, repeat=repeat)
    bpy.ops.object.mode_set(mode="OBJECT")


def decimate(obj, ratio=0.22):
    """Game mesh: keep the silhouette, dump the inner verts."""
    mod = obj.modifiers.new("game", "DECIMATE")
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def origin_to_base(obj):
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    minz = min((obj.matrix_world @ v.co).z for v in obj.data.vertices)
    obj.location.z -= minz


def sculpt_one(seed: int, name: str):
    rng = random.Random(seed)
    obj = block_in(rng)
    voxel_remesh(obj, 0.05)
    displace_pass(obj, "MUSGRAVE", 0.16 + rng.random() * 0.05, 1.6, seed)
    voxel_remesh(obj, 0.038)
    displace_pass(obj, "VORONOI", 0.07, 3.4 + rng.random(), seed + 1)
    displace_pass(obj, "CLOUDS", 0.035, 2.8, seed + 2)
    scrape_top(obj, 0.35 + rng.random() * 0.15)
    smooth_pass(obj, 6, 0.5)
    voxel_remesh(obj, 0.032)
    smooth_pass(obj, 3, 0.35)
    decimate(obj, 0.18)
    obj.data.materials.append(mat_stone())
    origin_to_base(obj)
    obj.name = name
    try:
        bpy.ops.object.shade_auto_smooth(angle=math.radians(42))
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


def studio_preview(obj, path):
    cam = bpy.data.cameras.new("cam")
    cam_o = bpy.data.objects.new("cam", cam)
    bpy.context.collection.objects.link(cam_o)
    cam_o.location = (2.4, -2.6, 1.5)
    cam_o.rotation_euler = (math.radians(68), 0, math.radians(42))
    bpy.context.scene.camera = cam_o
    light = bpy.data.lights.new("key", "AREA")
    light.energy = 250
    light.size = 2.4
    key = bpy.data.objects.new("key", light)
    key.location = (1.6, -1.2, 2.8)
    bpy.context.collection.objects.link(key)
    fill = bpy.data.lights.new("fill", "AREA")
    fill.energy = 80
    fill_o = bpy.data.objects.new("fill", fill)
    fill_o.location = (-2.0, 1.4, 1.4)
    bpy.context.collection.objects.link(fill_o)
    world = bpy.data.worlds.new("world")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.08, 0.09, 0.10, 1)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.resolution_x = 1024
    sc.render.resolution_y = 1024
    sc.render.filepath = path
    sc.render.film_transparent = False
    bpy.ops.render.render(write_still=True)
    print("preview", path)


def main():
    nuke()
    rock = sculpt_one(SEED, "sculpt_rock_a")
    export_glb(rock, os.path.join(OUT, "sculpt-rock-a.glb"))
    for i, seed in enumerate((31, 47, 61), start=1):
        nuke()
        r = sculpt_one(seed, f"sculpt_rock_{i}")
        export_glb(r, os.path.join(OUT, f"sculpt-rock-{chr(97 + i)}.glb"))


if __name__ == "__main__":
    main()
