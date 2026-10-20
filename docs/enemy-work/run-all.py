#!/usr/bin/env python3
"""章ごとに Codex を並行(既定3並列)で起動して敵画像を生成する。使い方: python3 docs/enemy-work/run-all.py [章ID ...]  (省略で全章)"""
import json, os, subprocess, sys, concurrent.futures as cf
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
M = [m for m in json.load(open("docs/enemy-work/manifest.json")) if m["inNewBattle"]]
ACCENT = {  # 章ごとのアクセント色（被り回避）
 "c1":"白黒の二極＋古金","c2":"エメラルド緑","c3":"琥珀・橙","c4":"サファイア青(星)","c5":"青緑銅(ティール＋銅)","c6":"アメジスト紫","c7":"薔薇石英ピンク",
 "g2c1":"深紅","g2c2":"翡翠","g2c3":"黄金・レモン","g2c4":"銀青","g2c5":"青銅・赤銅","g2c6":"マゼンタ",
 "g3c1":"黒曜赤(溶岩の筋)","g3c2":"海緑","g3c3":"炎橙","g3c4":"氷シアン","g3c5":"ライム(黄緑)","g3c6":"真珠白","g3c7":"藍紫(インディゴ)","g3c8":"黄土・茶",
}
ORDER = list(ACCENT.keys())
chapters = sys.argv[1:] or ORDER
def run(ch):
    items = [m for m in M if m["chapterId"] == ch]
    kinds = os.environ.get("ONLY_KINDS")  # 例: ONLY_KINDS=unitSmallBoss,chapterBoss,unitBoss（ボスだけ生成）
    if kinds: items_f = [m for m in items if m["kind"] in kinds.split(",")]
    else: items_f = items
    todo = [m for m in items_f if not os.path.exists(f"src/third/assets/monsters/by-id/full/{m['id']}.webp")]
    if not todo: return ch, "skip(全完成)"
    kindjp = {"unit":"unit(雑魚)","unitSmallBoss":"unitSmallBoss(小単元ボス)","unitBoss":"unitBoss(試練・最終段)","chapterBoss":"chapterBoss(章の主)"}
    rows = "\n".join(f"- {m['id']} | {kindjp.get(m['kind'],m['kind'])} | 名前:{m['name']} | 単元テーマ:{m['theme']}" for m in todo)
    g, name = items[0]["grade"], items[0]["chapterName"]
    prompt = f"""docs/enemy-work/BRIEF_CHAPTER.md を読み、その通りに実行してください（計画だけで終わらず、画像生成から処理・コンタクトシート・台帳まで完了すること）。
対象: 中{g}「{name}」章（章ID: {ch}）。この章のアクセント色: {ACCENT[ch]}。
生成するID（既存はスキップ済み。これら全部）:
{rows}
添付画像 docs/enemy-work/pilot-sheet.png が絵柄の基準です。"""
    log = f"docs/enemy-work/logs/{ch}.log"
    with open(log, "w") as f:
        r = subprocess.run(["codex","exec","--sandbox","workspace-write","-C",ROOT,"-i","docs/enemy-work/pilot-sheet.png","-"], input=prompt, text=True, stdout=f, stderr=subprocess.STDOUT)
    ok = sum(os.path.exists(f"src/third/assets/monsters/by-id/full/{m['id']}.webp") for m in todo)
    return ch, f"exit={r.returncode} {ok}/{len(todo)}"
with cf.ThreadPoolExecutor(max_workers=3) as ex:
    for ch, res in ex.map(run, chapters):
        print(ch, res, flush=True)
