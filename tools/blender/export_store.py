"""Export the TENSIL lamp as a clean GLB for the store's 360° viewer.

Reuses the lamp project's scripts (blender-studio-object) without modifying
them, and only changes what the store needs:
  - short cable ending in a plug, so the model stays compact and centred;
  - opaque bulb (no transmission pass, cheaper on mobile GPUs);
  - constant roughness on brushed metals (noise roughness does not export);
  - lacquer kept as its own material (MAT_Lacquer) so the page can recolour it;
  - colorways written to JSON from the same values as the Blender materials.

Usage:
  blender -b --factory-startup --python tools/blender/export_store.py -- \
      --lamp-scripts ../blender-studio-object/blender/scripts \
      --out tools/blender/out/tensil_store_raw.glb \
      --colorways src/data/colorways.json
Then optimise with glTF-Transform (command in the project README).
"""
import argparse
import json
import os
import sys

import bpy


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--lamp-scripts", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--colorways", required=True)
    return p.parse_args(argv)


def short_cable(coll, mats):
    """Cable leaving the base, curving to the side and ending in a small plug."""
    from common import bevel, box, curve_to_mesh_object, mesh_object

    curve = bpy.data.curves.new("CRV_Cable", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.0024
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    end = (0.13, 0.20, 0.0024)
    pts = [(0, 0.114, 0.012), (0, 0.15, 0.0024), (0.05, 0.215, 0.0024), end]
    spline.bezier_points.add(len(pts) - 1)
    for bp, co in zip(spline.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new("TMP_Cable", curve)
    coll.objects.link(obj)
    curve_to_mesh_object("Base_Cable", obj, coll, mats["rubber"])

    plug = mesh_object("Base_Plug", box((0.034, 0.016, 0.012), (0, 0, 0.006)), coll, mats["rubber"],
                       location=(end[0] + 0.012, end[1] - 0.004, 0))
    plug.rotation_euler.z = -0.32
    bevel(plug, 0.0025, 3)


def flatten_roughness(mat, value):
    """Procedural (noise) roughness does not export to glTF; use a constant instead."""
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    for link in list(bsdf.inputs["Roughness"].links):
        mat.node_tree.links.remove(link)
    bsdf.inputs["Roughness"].default_value = value


def bake_springs():
    """Stretch-To constraints are not part of glTF: keep their evaluated transforms."""
    dg = bpy.context.evaluated_depsgraph_get()
    for o in [o for o in bpy.data.objects if o.name.startswith("Spring_")]:
        world = o.evaluated_get(dg).matrix_world.copy()
        o.constraints.clear()
        o.matrix_world = world
    for o in [o for o in bpy.data.objects if o.type == "EMPTY" and o.name.startswith("ANC_")]:
        for child in o.children:
            mw = child.matrix_world.copy()
            child.parent = o.parent
            child.matrix_world = mw
        bpy.data.objects.remove(o)


def main():
    args = parse_args()
    sys.path.insert(0, os.path.abspath(args.lamp_scripts))
    import lamp
    import materials
    from common import collection

    bpy.ops.wm.read_factory_settings(use_empty=True)
    lamp._cable = short_cable
    mats = materials.build_all("graphite")
    mats["bulb"].node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 0.0
    flatten_roughness(mats["metal"], 0.28)
    flatten_roughness(mats["brass"], 0.32)
    for name in ("backdrop", "clay"):
        bpy.data.materials.remove(mats.pop(name))

    rig = lamp.build(mats, collection("Lamp"))
    bpy.data.objects.remove(rig.pop("bulb_light"))
    lamp.set_pose(rig, "work")
    bpy.context.view_layer.update()
    bake_springs()

    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out, export_format="GLB", export_apply=True, export_animations=False,
        export_lights=False, export_cameras=False, export_yup=True,
    )

    colorways = {name: [round(c, 4) for c in rgb] for name, rgb in materials.COLORWAYS.items()}
    os.makedirs(os.path.dirname(os.path.abspath(args.colorways)), exist_ok=True)
    with open(args.colorways, "w", encoding="utf-8") as f:
        json.dump({"material": "MAT_Lacquer", "space": "linear-srgb", "colorways": colorways}, f, indent=2)
        f.write("\n")
    print(f"[store] exported {out} ({os.path.getsize(out) / 1024:.0f} KiB) + {args.colorways}")


if __name__ == "__main__":
    main()
