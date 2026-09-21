#!/usr/bin/env python3
"""生成PNG(透過)を、ゲーム用の透過webpに整える。
使い方: python3 docs/enemy-work/process_png.py <生成PNG> <monsterId>
  -> src/third/assets/monsters/by-id/full/<id>.webp (512x512, 余白約6%) と small/<id>.webp (96x96) を出力
アルファ境界で被写体をトリム→最大450pxに収め→512pxの透明キャンバス中央へ。lossy(q=86, alpha無劣化)で1枚約50KB。"""
import sys, os
from PIL import Image
src, mid = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(__file__), "..", "..", "src", "third", "assets", "monsters", "by-id")
os.makedirs(os.path.join(root, "full"), exist_ok=True); os.makedirs(os.path.join(root, "small"), exist_ok=True)
im = Image.open(src).convert("RGBA")
a = im.split()[3]
bbox = a.point(lambda v: 255 if v > 8 else 0).getbbox()
if not bbox: sys.exit("透過アルファが見つからない(背景が不透明?): " + src)
im = im.crop(bbox)
w, h = im.size; s = min(450 / w, 450 / h)
im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
canvas.paste(im, ((512 - im.width) // 2, (512 - im.height) // 2), im)
canvas.save(os.path.join(root, "full", mid + ".webp"), "WEBP", quality=86, alpha_quality=100, method=6)
canvas.resize((96, 96), Image.LANCZOS).save(os.path.join(root, "small", mid + ".webp"), "WEBP", quality=88, alpha_quality=100, method=6)
print("ok", mid, os.path.getsize(os.path.join(root, "full", mid + ".webp")) // 1024, "KB")
