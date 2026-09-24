#!/usr/bin/env python3
"""表情差分。使い方: python3 docs/story-art/run-expr.py <キャラID>"""
import os, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
cid = sys.argv[1]
EXPR = {
 "happy": "心からの明るい笑顔（口を開いて笑う／ミラとノクスは嬉しそうな顔）",
 "sad": "悲しみ・後悔・さびしさ（眉が下がり、目を伏せるか潤ませる。泣き叫ぶ表情にはしない）",
 "surprised": "驚き（目を見開き、口が小さく開く）",
 "angry": "真剣・厳しい・決意の表情（眉をひそめ、まっすぐ見つめる。憎しみや怒鳴る表情にはしない）",
}
keys = ["happy", "sad"] if cid in ("mira", "noctus") else list(EXPR)
todo = [k for k in keys if not os.path.exists(f"src/third/assets/story/characters/{cid}_{k}.webp")]
if not todo: print(cid, "skip"); sys.exit(0)
rows = "\n".join(f"- {cid}_{k} : {EXPR[k]}" for k in todo)
prompt = f"""docs/story-art/BRIEF.md を読み、さらに次の【表情差分】ルールに従って実行してください（計画だけで終わらず、生成→処理まで完了）。
基準画像（添付）= docs/story-art/base/{cid}.png 。同じキャラクターの表情差分を作る。
【表情差分ルール】
- **衣装・髪型・体つき・ポーズ・カメラ・全身のフレーミングは基準画像と完全に同じ**にする。変えてよいのは顔の表情（目・眉・口）だけ。少なくとも顔以外の絵はほぼ同一に見えること。
- 透明背景・全身・1体のみ・文字なし・床影なし。
- 生成物ごとに `python3 docs/story-art/process_expr.py <生成PNG> {cid} <表情キー>` を実行（キーは happy/sad/surprised/angry）。出力は src/third/assets/story/characters/{cid}_<キー>.webp。
- 全て完了したら基準＋差分を横に並べたコンタクトシート docs/story-art/sheets/expr_{cid}.png を作り、顔以外が変わってしまった/表情が弱い物は作り直す（最大2回）。
- 台帳 docs/story-art/ledger/expr_{cid}.md に結果を書く。編集してよいのは docs/story-art/ と src/third/assets/story/ だけ。
生成する表情:
{rows}"""
with open(f"docs/story-art/logs/expr_{cid}.log", "w") as f:
    r = subprocess.run(["codex","exec","--sandbox","workspace-write","-C",ROOT,"-i",f"docs/story-art/base/{cid}.png","-"], input=prompt, text=True, stdout=f, stderr=subprocess.STDOUT)
ok = sum(os.path.exists(f"src/third/assets/story/characters/{cid}_{k}.webp") for k in todo)
print(cid, f"exit={r.returncode} {ok}/{len(todo)}", flush=True)
