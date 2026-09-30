// 単元特化キャラ140体を、新しい状態異常と耐性・スキル数値にそろえる（2026-09-26・一度だけ実行）。
//  ・耐性：計算＝毒・方程式＝麻痺・関数＝眠り・図形＝石化・統計＝混乱が100（かからない）。複合特化は2分野ぶん100。
//    それ以外は、レア度で決まる（N=10・R=20・SR=30・UR=40）。封印・スローは廃止。
//  ・全体ダメージ：N2倍・R3倍・SR4倍・UR5倍。 回復：Nは6問で5%・Rは8問で10%・SRは10問で15%・URは12問で20%。
//    状態異常回復：Nは12・Rは10・SRは8・URは6問で、味方全員のすべての状態異常を治す。
//  ・表示の「データ」は「統計」に。
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SPECIALIST_ROSTER as R } from "../src/third/specialistRoster.js";

const OWN = { calc: "poison", eq: "paralysis", func: "sleep", geo: "petrification", data: "confusion" };
const BASE = { N: 10, R: 20, SR: 30, UR: 40 };
const TIER = { N: 0, R: 1, SR: 2, UR: 3 };
const ALL = ["poison", "paralysis", "sleep", "petrification", "confusion"];
const subjectsOf = (c) => {
  const m = c.id.match(/^sp2?_([a-z]+)(?:_([a-z]+))?_[a-z]_(?:n|r|sr|ur)$/);
  const a = c.id.startsWith("sp2_") ? [m[1], m[2]] : [m?.[1]];
  return a.filter((x) => OWN[x]);
};
const fixText = (s) => (typeof s === "string" ? s.replaceAll("データ", "統計") : s);
const dump = (v) => (Array.isArray(v) ? "[" + v.map(dump).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${dump(x)}`).join(", ") + "}" : JSON.stringify(v));
const path = fileURLToPath(new URL("../src/third/specialistRoster.js", import.meta.url));
let src = fs.readFileSync(path, "utf8"), n = 0;
for (const c of R) {
  const subs = subjectsOf(c);
  if (!subs.length) throw new Error("分野が読めない: " + c.id);
  const resistances = Object.fromEntries(ALL.map((k) => [k, BASE[c.rarity]]));
  for (const s of subs) resistances[OWN[s]] = 100;
  const t = TIER[c.rarity];
  let skill = { ...c.skill, name: fixText(c.skill.name), desc: fixText(c.skill.desc) };
  if (skill.category === "aoeDamage") { const m = [2, 3, 4, 5][t]; skill = { ...skill, multiplier: m, desc: `敵全体に通常の${m}倍のダメージ` }; }
  if (skill.category === "heal") { const pct = [5, 10, 15, 20][t]; skill = { id: `heal_${t + 1}`, name: `癒しの光${["・小", "・中", "・大", "・極"][t]}`, icon: "💖", category: "heal", tier: t + 1, target: "partyAll", mode: "instant", percent: pct / 100, gauge: [6, 8, 10, 12][t], desc: `味方全員の最大HPの${pct}%ぶん回復` }; }
  if (skill.category === "cure") { skill = { id: `cure_${t + 1}`, name: "状態異常回復", icon: "💊", category: "cure", tier: t + 1, target: "partyAll", cures: ALL, gauge: [12, 10, 8, 6][t], desc: "味方全員のすべての状態異常を治す" }; }
  const next = { ...c, name: c.name, theme: fixText(c.theme), roleTag: fixText(c.roleTag), skill, resistances };
  const re = new RegExp(`^  \\{"id": "${c.id}",.*\\},$`, "m");
  if (!re.test(src)) throw new Error("見つからない: " + c.id);
  src = src.replace(re, "  " + dump(next) + ","); n++;
}
fs.writeFileSync(path, src);
console.log("書き換え:", n, "体");
