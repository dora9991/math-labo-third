#!/usr/bin/env python3
"""使い方: python3 docs/story-art/run-story.py <バッチ名> <characters|backgrounds> <開始> <終了>   (manifestのその種別の [開始:終了) )"""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
batch, kind, a, b = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
items = json.load(open("docs/story-art/manifest.json"))[kind][a:b]
d = "characters" if kind == "characters" else "backgrounds"
todo = [m for m in items if not os.path.exists(f"src/third/assets/story/{d}/{m['id']}.webp")]
if not todo: print(batch, "skip"); sys.exit(0)
rows = "\n".join(f"- {m['id']} | {m['name']} | {m['brief']}" for m in todo)
prompt = f"""docs/story-art/BRIEF.md を読み、その通りに実行してください（計画だけで終わらず、画像生成→処理→コンタクトシート→台帳まで完了）。
バッチ名: {batch}　種別: {'立ち絵(characters)' if kind=='characters' else '背景(backgrounds)'}
生成するID（これら全部）:
{rows}
添付画像: docs/story-art/style/ally_*.png は画風（デフォルメ調のゲームキャラ）の基準、public/astral/menu-academy.png は世界観の色の基準です。立ち絵は BRIEF.md の改訂後の画風（3〜4頭身のデフォルメ寄りアニメ調）で描く。"""
ref = ["-i", "public/astral/menu-academy.png", "-i", "public/astral/title-sky-kingdom.png"]
if kind == "characters":
    ref = [x for n in ("sp093","sp111","sp053","sp022") for x in ("-i", f"docs/story-art/style/ally_{n}.png")] + ["-i", "public/astral/menu-academy.png"]
with open(f"docs/story-art/logs/{batch}.log", "w") as f:
    r = subprocess.run(["codex","exec","--sandbox","workspace-write","-C",ROOT,*ref,"-"], input=prompt, text=True, stdout=f, stderr=subprocess.STDOUT)
ok = sum(os.path.exists(f"src/third/assets/story/{d}/{m['id']}.webp") for m in todo)
print(batch, f"exit={r.returncode} {ok}/{len(todo)}", flush=True)
