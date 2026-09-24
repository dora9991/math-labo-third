#!/usr/bin/env python3
"""立ち絵PNG(透過)→ src/third/assets/story/characters/<id>.webp (高さ最大1024) と small/<id>.webp(高さ256)。使い方: python3 docs/story-art/process_char.py <PNG> <id>"""
import sys, os
from PIL import Image
src, cid = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(__file__), "..", "..", "src", "third", "assets", "story", "characters")
os.makedirs(os.path.join(root, "small"), exist_ok=True)
im = Image.open(src).convert("RGBA")
bbox = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
if not bbox: sys.exit("透過アルファが無い(背景が不透明?): " + src)
im = im.crop(bbox)
pad = round(max(im.size) * 0.03)
canvas = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0)); canvas.paste(im, (pad, pad), im)
def save(img, path, h):
    s = min(1.0, h / img.height); img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    img.save(path, "WEBP", quality=88, alpha_quality=100, method=6); return img.size
print("ok", cid, save(canvas, os.path.join(root, cid + ".webp"), 1024), os.path.getsize(os.path.join(root, cid + ".webp")) // 1024, "KB")
save(canvas, os.path.join(root, "small", cid + ".webp"), 256)
