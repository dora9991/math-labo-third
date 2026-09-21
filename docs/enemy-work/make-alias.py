#!/usr/bin/env python3
"""ID専用画像が未作成の敵に、作成済みの別の敵の絵を「色違い」で割り当てる表(src/third/data/enemyAlias.js)を生成する。
・同じ種類(kind)の絵から、別の章のものを選ぶ（同章内で同じ絵が重ならない／全体での使用回数が少ないものを優先）。
・色相は「元の絵の支配的な色 → その章のアクセント色」になるよう hue-rotate 角を計算する。
使い方: python3 docs/enemy-work/make-alias.py   (画像を追加生成したら再実行すれば、作成済みの敵は自動でaliasから外れる)"""
import json, os, math, colorsys, hashlib, collections
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
M = [m for m in json.load(open("docs/enemy-work/manifest.json")) if m["inNewBattle"]]
D = "src/third/assets/monsters/by-id/full/"
have = {m["id"] for m in M if os.path.exists(D + m["id"] + ".webp")}
# 章アクセント色の色相(度)。彩度の低い色(真珠白など)は近い色相＋そのままで代用。
TARGET_HUE = {"g2c5":30,"g2c6":320,"g3c1":355,"g3c2":160,"g3c3":22,"g3c4":190,"g3c5":85,"g3c6":205,"g3c7":250,"g3c8":38,
              "g2c1":350,"g2c2":150,"g2c3":52,"g2c4":215,"c1":45,"c2":140,"c3":35,"c4":220,"c5":175,"c6":275,"c7":330}
_dom = {}
def dominant_hue(mid):
    if mid in _dom: return _dom[mid]
    im = Image.open(D + mid + ".webp").convert("RGBA").resize((96, 96))
    x = y = w = 0.0
    for r, g, b, a in im.getdata():
        if a < 128: continue
        h, s, v = colorsys.rgb_to_hsv(r/255, g/255, b/255)
        if s < 0.35 or v < 0.3: continue
        wt = s * v
        x += math.cos(h*2*math.pi) * wt; y += math.sin(h*2*math.pi) * wt; w += wt
    hue = (math.degrees(math.atan2(y, x)) % 360) if w > 0 else 0.0
    _dom[mid] = hue; return hue
def hsh(s): return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)
missing = [m for m in M if m["id"] not in have]
pool = collections.defaultdict(list)
for m in M:
    if m["id"] in have: pool[m["kind"]].append(m)
usage = collections.Counter(); used_in_ch = collections.defaultdict(set); alias = {}
for m in sorted(missing, key=lambda m: (m["grade"], m["chapterId"], m["id"])):
    cands = [p for p in pool[m["kind"]] if p["chapterId"] != m["chapterId"] and p["id"] not in used_in_ch[m["chapterId"]]]
    if not cands: cands = [p for p in pool[m["kind"]] if p["id"] not in used_in_ch[m["chapterId"]]] or pool[m["kind"]]
    # 使用回数が少ない順→別学年優先→IDハッシュで安定的に選ぶ
    cands.sort(key=lambda p: (usage[p["id"]], p["grade"] == m["grade"], hsh(m["id"] + p["id"])))
    b = cands[0]
    hue = round((TARGET_HUE.get(m["chapterId"], 0) - dominant_hue(b["id"])) % 360)
    if hue < 25 or hue > 335: hue = (hue + 40) % 360  # ほぼ同色にならないよう最低限ずらす
    alias[m["id"]] = {"base": b["id"], "hue": hue}
    usage[b["id"]] += 1; used_in_ch[m["chapterId"]].add(b["id"])
lines = ["// 自動生成: docs/enemy-work/make-alias.py（手で編集しない。画像を追加生成したら再実行）",
         "// ID専用画像が未作成の敵 → 作成済みの別の敵の絵を色違い(hue-rotate)で使う対応表。",
         "export const ENEMY_ALIAS = {"]
for k, v in alias.items(): lines.append(f'  {json.dumps(k)}: {{ base: {json.dumps(v["base"])}, hue: {v["hue"]} }},')
lines.append("};"); lines.append("")
open("src/third/data/enemyAlias.js", "w", encoding="utf-8").write("\n".join(lines))
print("alias", len(alias), "kinds", collections.Counter(m["kind"] for m in missing))
