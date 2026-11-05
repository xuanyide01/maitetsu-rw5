"""Crop the original 二六 SD04_02 CG and apply an antialiased circular mask."""
import argparse
from pathlib import Path

from PIL import Image, ImageDraw

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('cg', type=Path)
args = parser.parse_args()

root = Path(__file__).resolve().parents[1]
size = 128
scale = 4
with Image.open(args.cg) as cg:
    if cg.size != (906, 648):
        parser.error('Expected the original 906 × 648 SD04_02 CG')
    icon = cg.crop((306, 40, 822, 556)).resize((size, size), Image.Resampling.LANCZOS).convert('RGBA')

mask = Image.new('L', (size * scale, size * scale))
ImageDraw.Draw(mask).ellipse((scale, scale, (size - 1) * scale - 1, (size - 1) * scale - 1), fill=255)
icon.putalpha(mask.resize((size, size), Image.Resampling.LANCZOS))
icon.save(root / 'src/common/logo.png', optimize=True)
