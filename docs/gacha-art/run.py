#!/usr/bin/env python3
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
items = [m for m in json.load(open("docs/gacha-art/manifest.json")) if not os.path.exists(f"src/third/assets/gacha/{m['id']}.webp")]
if not items: print("skip"); sys.exit(0)
rows = "\n".join(f"- {m['id']} ({m['kind']}) : {m['brief']}" for m in items)
prompt = f"""ガチャ画面用の絵を生成してください（計画だけで終わらず、生成→処理まで完了）。世界観は添付の public/astral/*.png（空に浮かぶ星空の学園。深い藍・淡いシアン・古金・すみれ色）に合わせる。画像内に文字・数字・ロゴ・透かしは入れない。
各IDについて、組み込みの画像生成機能で生成し、次のコマンドで処理する:
  python3 docs/gacha-art/process.py <生成PNG> <ID> <bg|sprite>
  （bg は不透明の背景。sprite は透明背景・被写体1つ）
生成物が不透明背景(sprite)・文字混入・崩れなら作り直す（最大2回）。作ったら docs/gacha-art/sheets/gacha.png に全部を並べたコンタクトシートを作って見比べる。
編集してよいのは docs/gacha-art/ と src/third/assets/gacha/ だけ。
生成するID:
{rows}"""
with open("docs/gacha-art/logs/gacha.log", "w") as f:
    r = subprocess.run(["codex","exec","--sandbox","workspace-write","-C",ROOT,"-i","public/astral/menu-academy.png","-i","public/astral/title-sky-kingdom.png","-"], input=prompt, text=True, stdout=f, stderr=subprocess.STDOUT)
print("exit", r.returncode, sum(os.path.exists(f"src/third/assets/gacha/{m['id']}.webp") for m in items), "/", len(items), flush=True)
