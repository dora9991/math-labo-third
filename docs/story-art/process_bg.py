#!/usr/bin/env python3
"""背景PNG→ src/third/assets/story/backgrounds/<id>.webp (16:9 に中央クロップ・幅1600)。使い方: python3 docs/story-art/process_bg.py <PNG> <id>"""
import sys, os
from PIL import Image
src, bid = sys.argv[1], sys.argv[2]
root = os.path.join(os.path.dirname(__file__), "..", "..", "src", "third", "assets", "story", "backgrounds")
os.makedirs(root, exist_ok=True)
im = Image.open(src).convert("RGB"); w, h = im.size
tw, th = (w, round(w * 9 / 16)) if w / h < 16 / 9 else (round(h * 16 / 9), h)
l, t = (w - tw) // 2, (h - th) // 2; im = im.crop((l, t, l + tw, t + th))
im = im.resize((1600, 900), Image.LANCZOS)
p = os.path.join(root, bid + ".webp"); im.save(p, "WEBP", quality=84, method=6)
print("ok", bid, os.path.getsize(p) // 1024, "KB")
