"""Decimate the 563k-vert Meshy coconut into a game-ready tree, keep UVs + textures."""
from __future__ import annotations

import os
import shutil

import bpy

SRC = "/workspace/public/models/pack/coconut-tree.glb"
BAK = "/tmp/coconut-tree-hi.glb"
OUT = "/workspace/public/models/pack/coconut-tree.glb"
TARGET_FACES = 9000


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def main():
    if not os.path.exists(BAK):
        shutil.copy2(SRC, BAK)
    nuke()
    bpy.ops.import_scene.gltf(filepath=BAK)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    for obj in meshes:
        me = obj.data
        faces = len(me.polygons)
        verts = len(me.vertices)
        print("before", obj.name, "verts", verts, "faces", faces)
        if faces <= TARGET_FACES:
            continue
        ratio = max(0.004, TARGET_FACES / max(1, faces))
        mod = obj.modifiers.new(name="game_decimate", type="DECIMATE")
        mod.decimate_type = "COLLAPSE"
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier="game_decimate")
        print("after", obj.name, "verts", len(obj.data.vertices), "faces", len(obj.data.polygons), "ratio", ratio)
        obj.select_set(False)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=OUT,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
        export_animations=False,
    )
    print("wrote", OUT, "bytes", os.path.getsize(OUT))


if __name__ == "__main__":
    main()
