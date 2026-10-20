#!/usr/bin/env python3
"""使い方: python3 docs/raid-art/run.py <バッチ名> <開始> <終了>"""
import json, os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
batch, a, b = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = [m for m in json.load(open("docs/raid-art/manifest.json"))[a:b] if not os.path.exists(f"src/third/assets/monsters/by-id/full/{m['id']}.webp")]
if not items: print(batch, "skip"); sys.exit(0)
rows = "\n".join(f"- {m['id']} | 名前:{m['name']} | 説明:{m['desc']} | 章ID:{m['chapterId']}(中{m['grade']}) | アクセント色:{m['accent']}" for m in items)
prompt = f"""docs/raid-art/BRIEF.md を読み、その通りに実行してください（計画だけで終わらず、生成→処理→コンタクトシート）。バッチ名: {batch}
生成するID（これら全部）:
{rows}
添付画像 docs/enemy-work/pilot-sheet.png が絵柄の基準です。"""
with open(f"docs/raid-art/logs/{batch}.log", "w") as f:
    r = subprocess.run(["codex","exec","--sandbox","workspace-write","-C",ROOT,"-i","docs/enemy-work/pilot-sheet.png","-"], input=prompt, text=True, stdout=f, stderr=subprocess.STDOUT)
print(batch, f"exit={r.returncode}", sum(os.path.exists(f"src/third/assets/monsters/by-id/full/{m['id']}.webp") for m in items), "/", len(items), flush=True)
