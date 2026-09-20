// ============================================================
// data/toketa/index.js — とけた問題のディスパッチャ（全単元まとめ役）。
//  各章モジュールは統一インターフェース { has(unitId), gen(unitId), MISC } を持つ。
//  画面(SlowMode/StepUpSimple)は hasToketa/genToketa だけ呼べばよい。
//  単元IDは章ごとに接頭辞が別（正負u* 文字v* 方程式e* 比例h* 平面z* 空間k* データd*）
//  なので衝突しない。新章を足すときは import と MODS に1つ追加するだけ。
// ============================================================
import * as seisu from "./seisu.js";
import * as moji from "./moji.js";
import * as houteishiki from "./houteishiki.js";
import * as hirei from "./hirei.js";
import * as heimen from "./heimen.js";
import * as kukan from "./kukan.js";
import * as data from "./data.js";

const MODS = [seisu, moji, houteishiki, hirei, heimen, kukan, data];

/** その単元に toketa のヒント付き問題があるか */
export function hasToketa(unitId) {
  return MODS.some((m) => m.has && m.has(unitId));
}

/** math-labo 互換の toketa 問題を1問作る（無ければ null）。 */
export function genToketa(unitId) {
  for (const m of MODS) if (m.has && m.has(unitId)) return m.gen(unitId);
  return null;
}

// 全章の診断タグ辞書（label/coach）をまとめる。ToketaHint が引く。
export const MISC = Object.assign({}, ...MODS.map((m) => m.MISC || {}));
