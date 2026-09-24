#!/usr/bin/env python3
"""表情差分PNG(透過)を、基準の立ち絵(<id>.webp)と同じ高さ・足元中央そろえで書き出す。
使い方: python3 docs/story-art/process_expr.py <PNG> <id> <expr>   -> src/third/assets/story/characters/<id>_<expr>.webp"""
import sys, os
from PIL import Image
src, cid, expr = sys.argv[1], sys.argv[2], sys.argv[3]
root = os.path.join(os.path.dirname(__file__), "..", "..", "src", "third", "assets", "story", "characters")
base = Image.open(os.path.join(root, cid + ".webp")).convert("RGBA")
bb = base.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
bw, bh = bb[2] - bb[0], bb[3] - bb[1]
im = Image.open(src).convert("RGBA")
b = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
if not b: sys.exit("透過アルファが無い: " + src)
im = im.crop(b)
s = bh / im.height
im = im.resize((max(1, round(im.width * s)), bh), Image.LANCZOS)
canvas = Image.new("RGBA", base.size, (0, 0, 0, 0))
cx = (bb[0] + bb[2]) // 2
canvas.paste(im, (cx - im.width // 2, bb[3] - bh), im)
out = os.path.join(root, f"{cid}_{expr}.webp")
canvas.save(out, "WEBP", quality=88, alpha_quality=100, method=6)
print("ok", cid, expr, os.path.getsize(out) // 1024, "KB")
