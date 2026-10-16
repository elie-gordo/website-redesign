"""Build the site's web fonts: trim the Fontsource variable fonts to what the design uses.

Usage (from the repo root): python tools/fonts/build_fonts.py
Needs fonttools and brotli (pip install fonttools brotli). Writes src/fonts/*.woff2.

- Archivo: width 72-100 % (condensed titles to normal text), weight 300-700.
- Azeret Mono: weight 400-500 (labels, figures).
- Inter: weight 300-500, and only the letters of the TENSIL wordmark (the face engraved on
  the lamp base); it draws nothing else on the site.
"""
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "node_modules" / "@fontsource-variable"
OUT = ROOT / "src" / "fonts"

FONTS = [
    ("archivo/files/archivo-latin-wdth-normal.woff2", "archivo.woff2", {"wdth": (72, 100), "wght": (300, 700)}, None),
    ("azeret-mono/files/azeret-mono-latin-wght-normal.woff2", "azeret-mono.woff2", {"wght": (400, 500)}, None),
    ("inter/files/inter-latin-wght-normal.woff2", "inter-wordmark.woff2", {"wght": (300, 500)}, "TENSIL"),
]


def build(source: str, target: str, axes: dict, text: str | None) -> None:
    font = instantiateVariableFont(TTFont(SRC / source, lazy=False), axes)
    # Round-trip through bytes: the subsetter needs the instanced tables fully rebuilt.
    buffer = BytesIO()
    font.save(buffer)
    buffer.seek(0)
    font = TTFont(buffer)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    if text:
        subsetter.populate(text=text)
    else:
        subsetter.populate(unicodes=font.getBestCmap().keys())
    subsetter.subset(font)
    font.flavor = "woff2"
    path = OUT / target
    font.save(path)
    before = (SRC / source).stat().st_size / 1024
    print(f"{target}: {before:.0f} KB -> {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for args in FONTS:
        build(*args)
