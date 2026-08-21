"""Copy warrior mesh + export animation-only clips from Meshy sentinel GLBs."""
from __future__ import annotations

import os
import shutil

import bpy

SRC = "/tmp/sentinel"
MESH_OUT = "/workspace/public/models/warrior.glb"
CLIP_OUT = "/workspace/public/models/clips"

FILES = [
    ("Walking", "sentinel-walk.glb"),
    ("Running", "sentinel-run.glb"),
    ("run_fast_7_inplace", "sentinel-runfast.glb"),
    ("Sneaky_Walk_inplace", "sentinel-sneak.glb"),
    ("Punch_Combo", "sentinel-punch.glb"),
    ("Reaping_Swing", "sentinel-swing.glb"),
    ("Sit_Cross_Legged_on_Floor", "sentinel-sit.glb"),
    ("Sleep_Normally", "sentinel-sleep.glb"),
    ("Swim_Idle", "sentinel-swim.glb"),
    ("swimming_to_edge", "sentinel-swimedge.glb"),
    ("01a0184c", "sentinel-extra-a.glb"),
    ("01a02142", "sentinel-extra-b.glb"),
]


def nuke():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)


def find_src(token: str) -> str:
    for name in os.listdir(SRC):
        if token in name and name.endswith(".glb"):
            return os.path.join(SRC, name)
    raise FileNotFoundError(token)


def extract_clip(src: str, dest: str):
    nuke()
    bpy.ops.import_scene.gltf(filepath=src)
    anims = [a.name for a in bpy.data.actions]
    print("imported", os.path.basename(src), "actions", anims, "len", [round(a.frame_range[1] - a.frame_range[0], 1) for a in bpy.data.actions])
    for obj in list(bpy.data.objects):
        if obj.type == "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action="SELECT")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=dest,
        export_format="GLB",
        use_selection=False,
        export_animations=True,
        export_nla_strips=True,
        export_skins=True,
        export_morph=False,
        export_materials="NONE",
        export_texcoords=False,
        export_normals=False,
        export_yup=True,
    )
    print("clip", dest, os.path.getsize(dest))


def main():
    walk = find_src("Walking")
    shutil.copy2(walk, MESH_OUT)
    print("warrior mesh", MESH_OUT, os.path.getsize(MESH_OUT))
    for token, out in FILES:
        extract_clip(find_src(token), os.path.join(CLIP_OUT, out))


if __name__ == "__main__":
    main()
