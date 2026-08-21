"""Smart-UV camp/sculpt GLBs so three.js can bind albedo skins."""
from __future__ import annotations

import math
import os

import bpy

PACK = "/workspace/public/models/pack"

FILES = [
    "camp-barrel.glb",
    "camp-bucket.glb",
    "camp-crate.glb",
    "camp-fireplace.glb",
    "camp-firewood.glb",
    "camp-rack.glb",
    "camp-stump.glb",
    "sculpt-rock-a.glb",
    "sculpt-rock-b.glb",
    "sculpt-rock-c.glb",
    "sculpt-rock-d.glb",
    "sculpt-drift-a.glb",
    "sculpt-drift-b.glb",
    "sculpt-drift-c.glb",
    "sculpt-drift-d.glb",
]


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def smart_uv(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if obj.type != "MESH":
        return
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    obj.select_set(False)


def skin_file(fname: str):
    nuke()
    src = os.path.join(PACK, fname)
    bpy.ops.import_scene.gltf(filepath=src)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for obj in meshes:
        smart_uv(obj)
        # keep material names for runtime skinning
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=src,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    print("uv'd", fname, "meshes", len(meshes))


def main():
    for f in FILES:
        path = os.path.join(PACK, f)
        if os.path.exists(path):
            skin_file(f)


if __name__ == "__main__":
    main()
