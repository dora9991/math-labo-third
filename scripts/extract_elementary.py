#!/usr/bin/env python3
# ============================================================
# extract_elementary.py — 小4〜小6の「学び直し」用バンクを取り出す
#
#  ねらい：中学でつまずく前提（小数の乗除・分数の四則・わり算・割合 等）に
#          戻れるよう、小4-6の問題DBから "自動採点できる計算系" だけを抽出し、
#          このアプリの静的バンク(problem_bank.json)と同じ形に整える。
#
#  ソース : ../../math-labo4/data/problem_bank_grade{4,5,6}.json
#  出力   : ../src/data/elementaryBank.json
#
#  採点互換：アプリの parseAnswer は "1/6"(分数)・"-5"(負)・小数を数値化できる。
#            なので answer が「整数 / 小数 / 単純分数（符号可）」の問題だけ残す。
#            比 "2:3"・単位 "20km/h"・割合 "20%"・文字「真分数」は採点不可で除外。
# ============================================================
import json, os, re, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.normpath(os.path.join(HERE, "..", "..", "math-labo4", "data"))
OUT = os.path.normpath(os.path.join(HERE, "..", "src", "data", "elementaryBank.json"))

# 学び直し直結の単元だけに絞る（計算の幹＋割合/比/速さ＝中学の前提）。
#  図形・作図・データ・大きな数・そろばん・立体・縮図・並べ方などは
#  手採点が多く「学び直しドリル」に向かないので今回は入れない。
KEEP_UNITS = {
    "grade4": ["わり算の筆算", "小数の計算", "分数の基礎", "計算のきまり"],
    "grade5": ["整数の性質", "小数の乗除", "分数の加減", "割合", "単位量あたり"],
    "grade6": ["分数の乗除", "比例・反比例", "速さ"],
}
GRADE_LABEL = {"grade4": "小4", "grade5": "小5", "grade6": "小6"}
GRADE_NUM = {"grade4": 4, "grade5": 5, "grade6": 6}

# answer が「アプリで自動採点できる純粋な数値/分数」かどうか
#   整数 / 小数 / 単純分数（いずれも先頭マイナス可）のみ許可
NUM_RE = re.compile(r"^-?\d+(?:\.\d+)?$")
FRAC_RE = re.compile(r"^-?\d+/\d+$")


def to_numeric(ans):
    """アプリの parseAnswer 相当。採点不可なら None。"""
    s = str(ans).strip().replace(" ", "")
    s = s.replace("ー", "-").replace("−", "-").replace("―", "-").replace("／", "/")
    if FRAC_RE.match(s):
        n, d = s.split("/")
        d = float(d)
        return float(n) / d if d else None
    if NUM_RE.match(s):
        return float(s)
    return None


def slug(unit):
    table = {
        "わり算の筆算": "warizan", "小数の計算": "shosu4", "分数の基礎": "bunsu4",
        "計算のきまり": "kimari", "整数の性質": "seisu", "小数の乗除": "shosu5",
        "分数の加減": "bunsu_add", "割合": "wariai", "単位量あたり": "tani",
        "分数の乗除": "bunsu_mul", "比例・反比例": "hirei", "速さ": "hayasa",
    }
    return table.get(unit, unit)


def main():
    out = []
    stats = collections.Counter()
    per_unit = collections.Counter()
    for gkey, units in KEEP_UNITS.items():
        data = json.load(open(os.path.join(SRC_DIR, f"problem_bank_{gkey}.json")))
        for p in data:
            unit = p.get("unit")
            if unit not in units:
                continue
            stats[f"{gkey}:candidate"] += 1
            if not p.get("autoGradable"):
                stats[f"{gkey}:drop_notauto"] += 1
                continue
            num = to_numeric(p.get("answer"))
            if num is None:
                stats[f"{gkey}:drop_nonnumeric"] += 1
                continue
            err = p.get("error_types") or []
            misconception = (err[0].get("description") if err else "") or ""
            diff = p.get("difficulty") or 1
            level = diff if diff in (1, 2, 3) else 1
            out.append({
                "id": p.get("id"),
                "grade": GRADE_LABEL[gkey],
                "gradeNum": GRADE_NUM[gkey],
                "unit": unit,
                "unitId": slug(unit),
                "subunit": p.get("subunit", ""),
                "q": p.get("q", ""),
                "answer": str(p.get("answer")).strip(),
                "answerNumeric": num,
                "autoGradable": True,
                "level": level,
                "difficultyLabel": p.get("exam_level", ""),
                "format": p.get("format", ""),
                "misconception": misconception,
                "skillTags": p.get("skill_ids", []),
                "prereqTags": p.get("prerequisite_skills", []),
                "source": "小学算数DB",
            })
            per_unit[f"{GRADE_LABEL[gkey]} {unit}"] += 1

    out.sort(key=lambda r: (r["gradeNum"], r["unitId"], r["id"]))
    json.dump(out, open(OUT, "w"), ensure_ascii=False, indent=1)

    print(f"== wrote {len(out)} problems -> {OUT}")
    print("-- per unit --")
    for k, v in per_unit.items():
        print(f"   {v:4d}  {k}")
    print("-- drops --")
    for k, v in sorted(stats.items()):
        print(f"   {k} = {v}")


if __name__ == "__main__":
    main()
