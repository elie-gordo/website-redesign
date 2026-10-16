"""Render the store's product shots: every colorway, transparent background.

The cyclorama becomes a shadow catcher, so each WebP keeps the lamp and its
contact shadow on an alpha channel and sits on the page's own background.
Reuses the lamp project's scripts (blender-studio-object) without modifying them.

Usage:
  blender -b --factory-startup --python tools/blender/render_store.py -- \
      --lamp-scripts ../blender-studio-object/blender/scripts \
      --out src/assets/lamp [--samples 128] [--scale 100] [--colorway sage]
  # only re-apply the edge fade to existing renders (no rendering):
  blender -b --factory-startup --python tools/blender/render_store.py -- \
      --lamp-scripts ../blender-studio-object/blender/scripts --out src/assets/lamp --fade-only
"""
import argparse
import os
import sys

import bpy

RES = (1600, 2000)  # 4:5 portrait, the store's product frame
# name: (camera, yaw, focal mm, aim point)
SHOTS = {
    "hero": ("CAM_Hero", -20, 80, (-0.10, -0.12, 0.25)),
    "profile": ("CAM_Profile", 90, 80, (0.17, 0.03, 0.25)),
    "detail": ("CAM_Detail", -20, 70, (0.0, 0.01, 0.12)),
}
DEFAULT_SHOTS = ("hero", "profile")  # "detail" is only needed for graphite (anatomy section)
ALPHA_FLOOR = 0.04  # residual shadow-catcher haze below this is cleared to 0
EDGE_FADE = 0.08  # fraction of width/height over which alpha fades to 0 at the frame edges


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--lamp-scripts", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--samples", type=int, default=128)
    p.add_argument("--scale", type=int, default=100)
    p.add_argument("--colorway", action="append", help="limit to these colorways (default: all)")
    p.add_argument("--shot", action="append", choices=sorted(SHOTS), help="limit to these shots (default: hero, profile)")
    p.add_argument("--fade-only", action="store_true", help="only apply the edge fade to existing files")
    return p.parse_args(argv)


def setup_output(scene, scale):
    scene.render.resolution_x, scene.render.resolution_y = RES
    scene.render.resolution_percentage = scale
    scene.render.film_transparent = True
    settings = scene.render.image_settings
    settings.file_format = "WEBP"
    settings.color_mode = "RGBA"
    settings.quality = 82


def edit_alpha(path, clear_haze=True, fade_edges=True):
    """Post-process a render's alpha in place.

    clear_haze: remap alpha so the faint haze from the shadow catcher becomes transparent.
    fade_edges: fade alpha to 0 near the frame, so the wide soft floor shadow never ends on a
    hard edge once the image sits on the page background.
    """
    import numpy as np

    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)
    if clear_haze:
        px[..., 3] = np.clip((px[..., 3] - ALPHA_FLOOR) / (1 - ALPHA_FLOOR), 0, 1)
    if fade_edges:
        def ramp(n):
            d = np.minimum(np.arange(n), np.arange(n)[::-1]) / (n * EDGE_FADE)
            t = np.clip(d, 0, 1)
            return t * t * (3 - 2 * t)  # smoothstep

        px[..., 3] *= ramp(h)[:, None] * ramp(w)[None, :]
    img.pixels.foreach_set(px.ravel())
    img.file_format = "WEBP"
    img.save(filepath=path, quality=82)
    bpy.data.images.remove(img)


def main():
    args = parse_args()
    sys.path.insert(0, os.path.abspath(args.lamp_scripts))
    import lamp
    import materials
    import studio
    from common import collection

    out_dir = os.path.abspath(args.out)
    colorways = args.colorway or list(materials.COLORWAYS)
    shots = args.shot or list(DEFAULT_SHOTS)
    if args.fade_only:
        for colorway in colorways:
            for shot in shots:
                path = os.path.join(out_dir, f"{colorway}-{shot}.webp")
                edit_alpha(path, clear_haze=False)
                print(f"[store] faded edges of {path}")
        return

    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = materials.build_all("graphite")
    rig = lamp.build(mats, collection("Lamp"))
    studio.build(mats, collection("Studio"))
    bpy.data.objects["Studio_Cyclorama"].is_shadow_catcher = True
    for light in ("LGT_Key", "LGT_Fill", "LGT_Rim"):
        bpy.data.objects[light].visible_camera = False

    scene = bpy.context.scene
    scene.cycles.samples = args.samples
    setup_output(scene, args.scale)

    lacquer = mats["lacquer"].node_tree.nodes["Principled BSDF"].inputs["Base Color"]
    for colorway in colorways:
        lacquer.default_value = (*materials.COLORWAYS[colorway], 1)
        for shot in shots:
            cam, yaw, focal, aim_at = SHOTS[shot]
            angles = list(lamp.POSES["work"])
            angles[0] = yaw
            lamp.set_pose(rig, angles)
            studio.aim(cam, aim_at)
            scene.camera = bpy.data.objects[cam]
            scene.camera.data.lens = focal
            scene.render.filepath = os.path.join(out_dir, f"{colorway}-{shot}.webp")
            bpy.ops.render.render(write_still=True)
            # The close-up fills its panel edge to edge: a hard crop reads better than a fade.
            edit_alpha(scene.render.filepath, fade_edges=shot != "detail")
            print(f"[store] rendered {scene.render.filepath}")


if __name__ == "__main__":
    main()
