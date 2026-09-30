// スキルを4種類に絞る（2026-09-26 kazu指定）：全体ダメージ・単体ダメージ・回復・状態異常回復。
//  攻撃力バフ・防御バフ・みがわり・バリアなど、それ以外のスキルは一旦廃止。該当の仲間は、この4種類に振り分ける。
//  （各レア度35体：全体9・単体9・回復9・状態異常回復8。廃止するスキルの仲間17体は、回復5・全体4・単体4・状態異常回復4に）
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SPECIALIST_ROSTER as R } from "../src/third/specialistRoster.js";

const KEEP = new Set(["aoeDamage", "singleDamage", "heal", "cure"]);
const TIER = { N: 0, R: 1, SR: 2, UR: 3 };
const LABEL = { calc: "計算", eq: "方程式", func: "関数", geo: "図形", data: "統計" };
const ALL = ["poison", "paralysis", "sleep", "petrification", "confusion"];
const PATTERN = ["heal", "aoe", "single", "cure", "heal", "aoe", "single", "cure", "heal", "aoe", "single", "cure", "heal", "aoe", "single", "cure", "heal"];
const subjectsOf = (c) => { const m = c.id.match(/^sp2?_([a-z]+)(?:_([a-z]+))?_[a-z]_(?:n|r|sr|ur)$/); return (c.id.startsWith("sp2_") ? [m[1], m[2]] : [m[1]]).filter((x) => LABEL[x]); };
const subjName = (c) => subjectsOf(c).map((s) => LABEL[s]).join("×");
const SUF = ["・小", "・中", "・大", "・極"];
const build = { // 種類 → { skill, label, roleTag }
  aoe: (c, t) => ({ skill: { id: `aoe_dmg_${t + 1}`, name: `${subjName(c)}の全体波動${SUF[t]}`, icon: "🌪️", category: "aoeDamage", tier: t + 1, target: "all", multiplier: [2, 3, 4, 5][t], desc: `敵全体に通常の${[2, 3, 4, 5][t]}倍のダメージ` }, label: "全体ダメージ型", roleTag: "全体アタッカー" }),
  single: (c, t) => ({ skill: { id: `single_dmg_${t + 1}`, name: `${subjName(c)}の一点集中${SUF[t]}`, icon: "🎯", category: "singleDamage", tier: t + 1, target: "single", multiplier: [3, 4.5, 6, 7.5][t], desc: `敵単体に通常の${[3, 4.5, 6, 7.5][t]}倍のダメージ` }, label: "単体ダメージ型", roleTag: "単体アタッカー" }),
  heal: (c, t) => ({ skill: { id: `heal_${t + 1}`, name: `癒しの光${SUF[t]}`, icon: "💖", category: "heal", tier: t + 1, target: "partyAll", mode: "instant", percent: [5, 10, 15, 20][t] / 100, gauge: [6, 8, 10, 12][t], desc: `味方全員の最大HPの${[5, 10, 15, 20][t]}%ぶん回復` }, label: "HP回復型", roleTag: "サポート(HP回復)" }),
  cure: (c, t) => ({ skill: { id: `cure_${t + 1}`, name: "状態異常回復", icon: "💊", category: "cure", tier: t + 1, target: "partyAll", cures: ALL, gauge: [12, 10, 8, 6][t], desc: "味方全員のすべての状態異常を治す" }, label: "状態異常回復型", roleTag: "サポート(回復)" }),
};
const dump = (v) => (Array.isArray(v) ? "[" + v.map(dump).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${dump(x)}`).join(", ") + "}" : JSON.stringify(v));
const path = fileURLToPath(new URL("../src/third/specialistRoster.js", import.meta.url));
let src = fs.readFileSync(path, "utf8"), n = 0;
for (const rar of ["N", "R", "SR", "UR"]) {
  const drop = R.filter((c) => c.rarity === rar && !KEEP.has(c.skill.category));
  if (drop.length !== PATTERN.length) throw new Error(`${rar}: 廃止対象が${drop.length}体（想定${PATTERN.length}）`);
  drop.forEach((c, k) => {
    const b = build[PATTERN[k]](c, TIER[rar]);
    const next = { ...c, theme: c.theme.replace(/（[^）]*型）\s*$/, `（${b.label}）`), roleTag: b.roleTag, skill: b.skill };
    const re = new RegExp(`^  \\{"id": "${c.id}",.*\\},$`, "m");
    if (!re.test(src)) throw new Error("見つからない: " + c.id);
    src = src.replace(re, "  " + dump(next) + ","); n++;
  });
}
fs.writeFileSync(path, src);
console.log("書き換え:", n, "体");
