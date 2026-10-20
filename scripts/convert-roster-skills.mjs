// 単元特化キャラ140体のスキルを組み替える（2026-09-26・一度だけ実行）：状態異常回復を増やし、math-world用だった新スキル16種を入れる。
//  各レア度(35体)：全体攻撃10→5・単体攻撃10→5・攻撃バフ5→3・防御バフ5→4・回復4・状態異常回復1→4・新スキル10。
//  使い方: node scripts/convert-roster-skills.mjs  （src/third/specialistRoster.js を書き換える）
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { SPECIALIST_ROSTER as R } from "../src/third/specialistRoster.js";
import { NEW_SKILL_KEYS, NEW_SKILL_TYPES, buildSkill } from "../src/third/skillDefs.js";

const TIER = { N: 1, R: 2, SR: 3, UR: 4 };
const CURE = Object.fromEntries(R.filter((c) => c.skill.category === "cure").map((c) => [c.rarity, c.skill]));
const changes = new Map(); // id → { skill, label, roleTag }
["N", "R", "SR", "UR"].forEach((rar, ri) => {
  const of = (cat) => R.filter((c) => c.rarity === rar && c.skill.category === cat);
  const picked = [...of("aoeDamage").slice(-5), ...of("singleDamage").slice(-5), ...of("buffAtk").slice(-2), ...of("buffGuard").slice(-1)];
  picked.forEach((c, k) => {
    if (k < 3) changes.set(c.id, { skill: CURE[rar], label: "状態異常回復型", roleTag: "状態異常回復" });
    else { const key = NEW_SKILL_KEYS[(ri * 4 + (k - 3)) % NEW_SKILL_KEYS.length]; const d = NEW_SKILL_TYPES[key]; changes.set(c.id, { skill: buildSkill(key, TIER[rar]), label: d.label, roleTag: d.roleTag }); }
  });
});
// python の json.dumps と同じ体裁（": " と ", "）で1行にする
const dump = (v) => (Array.isArray(v) ? "[" + v.map(dump).join(", ") + "]" : v && typeof v === "object" ? "{" + Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${dump(x)}`).join(", ") + "}" : JSON.stringify(v));
const path = fileURLToPath(new URL("../src/third/specialistRoster.js", import.meta.url));
let src = fs.readFileSync(path, "utf8"), n = 0;
for (const c of R) {
  const ch = changes.get(c.id); if (!ch) continue;
  const next = { ...c, theme: c.theme.replace(/（[^）]*型）\s*$/, `（${ch.label}）`), roleTag: ch.roleTag, skill: ch.skill };
  const re = new RegExp(`^  \\{"id": "${c.id}",.*\\},$`, "m");
  if (!re.test(src)) throw new Error("見つからない: " + c.id);
  src = src.replace(re, "  " + dump(next) + ","); n++;
}
fs.writeFileSync(path, src);
console.log("書き換え:", n, "体");
