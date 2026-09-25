#!/usr/bin/env python3
"""ガチャ用の絵を整える。使い方: python3 docs/gacha-art/process.py <PNG> <id> <bg|sprite>
 bg    → 16:9に中央クロップ・幅1600のwebp（不透明）
 sprite→ 透過の被写体をトリムして最大1024pxのwebp（透過）"""
import sys, os
from PIL import Image
src, gid, kind = sys.argv[1], sys.argv[2], sys.argv[3]
root = os.path.join(os.path.dirname(__file__), "..", "..", "src", "third", "assets", "gacha")
os.makedirs(root, exist_ok=True)
out = os.path.join(root, gid + ".webp")
if kind == "bg":
    im = Image.open(src).convert("RGB"); w, h = im.size
    tw, th = (w, round(w * 9 / 16)) if w / h < 16 / 9 else (round(h * 16 / 9), h)
    l, t = (w - tw) // 2, (h - th) // 2; im = im.crop((l, t, l + tw, t + th)).resize((1600, 900), Image.LANCZOS)
    im.save(out, "WEBP", quality=84, method=6)
else:
    im = Image.open(src).convert("RGBA")
    bb = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bb: sys.exit("透過アルファが無い: " + src)
    im = im.crop(bb); s = min(1.0, 1024 / max(im.size)); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    im.save(out, "WEBP", quality=88, alpha_quality=100, method=6)
print("ok", gid, os.path.getsize(out) // 1024, "KB")
