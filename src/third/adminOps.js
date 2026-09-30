// ============================================================
// adminOps.js — 管理者が生徒（自分のテスト用アカウントなど）の状態を調整する操作（純関数）。
//  サーバー(third-api の admin_grant)と、ローカル開発モードが同じこれを使う。
//  ★合言葉(TEACHER_PASS)を知っている管理者だけが呼べる。普通の生徒のブラウザからは変えられない。
// ============================================================
import { SPECIALIST_ROSTER } from "./specialistRoster.js";
import { GACHA, MEDAL } from "./gachaConfig.js";
import { STARTER_PARTY } from "./gachaConfig.js";
import { initialThirdState, normalizeThirdState, haichiKeyForUnit } from "./core.js";
import { GRADES } from "../data/index.js";
import { getGrade, getChapter } from "./data/storyMap.js";
import { labUnitIdForBattle } from "./link.js";

const ROSTER_IDS = new Set(SPECIALIST_ROSTER.map((c) => c.id));
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

export const ADMIN_OPS = ["setCrystals", "addCrystals", "setCoins", "clearAllMedals", "clearAllBosses", "clearUnitMedals", "grantCompanions", "setCompanionGrowth", "resetCompanions", "resetAll"];

/** @returns {{ok:boolean, error?:string, state?:object, message?:string}} */
export function applyAdminOp(state, op, args = {}) {
  const s = structuredClone(normalizeThirdState(state));
  switch (op) {
    case "setCrystals": s.crystals = clampInt(args.n, 0, 99999); return { ok: true, state: s, message: `クリスタルを ${s.crystals} 個にしました` };
    case "addCrystals": s.crystals = clampInt(s.crystals + Number(args.n || 0), 0, 99999); return { ok: true, state: s, message: `クリスタルは ${s.crystals} 個になりました` };
    case "setCoins": s.coins = clampInt(args.n, 0, 99999999); return { ok: true, state: s, message: `コインを ${s.coins} にしました` };
    case "clearAllMedals": {
      let n = 0;
      for (const g of Object.keys(GRADES)) for (const ch of GRADES[g]) for (const u of ch.units || []) {
        s.medals.practiceN[u.id] = MEDAL.practiceTarget;
        s.medals.haichi[haichiKeyForUnit(u.id)] = "admin";
        s.medals.battle[u.id] = "admin";
        n++; // ※管理者の全クリアではクリスタルは付かない（初クリア報酬の対象外）
      }
      return { ok: true, state: s, message: `${n}小単元のメダル（はいち・れんしゅう・バトル）を全部そろえました` };
    }
    case "clearAllBosses": { // 章ボスを全部クリアしたことにする（学年ごと or 全学年）。小単元のバトル・章クリア・章ボス・学年クリアが付き、裏ボスが出てくる。クリスタルは付かない
      const grades = args.grade && args.grade !== "all" ? [Number(args.grade)] : [1, 2, 3];
      if (grades.some((g) => ![1, 2, 3].includes(g))) return { ok: false, error: "bad-grade" };
      const now = Date.now(); let chapters = 0;
      for (const g of grades) {
        for (const ch of GRADES[g] || []) for (const u of ch.units || []) s.medals.battle[u.id] ||= "admin";
        for (const c of getGrade(g).chapters) {
          const chap = getChapter(g, c.chapterId);
          for (const su of chap?.subUnits || []) {
            s.cleared[`${g}:${c.chapterId}:${su.id}`] ||= { first: now, count: 1 };
            const uid = labUnitIdForBattle({ grade: g, chapterId: c.chapterId, subUnitId: su.id });
            if (uid) s.medals.battle[uid] ||= "admin";
          }
          s.chapterDone[`${g}:${c.chapterId}`] ||= now; s.bossDone[`${g}:${c.chapterId}`] ||= now; chapters++;
        }
        s.gradeDone[g] ||= now;
      }
      return { ok: true, state: s, message: `${grades.map((g) => `中${g}`).join("・")}の章ボスを全部クリアしました（${chapters}章）。裏ボスが出てきます` };
    }
    case "clearUnitMedals": {
      const id = String(args.unitId || "");
      if (!id) return { ok: false, error: "no-unit" };
      s.medals.practiceN[id] = MEDAL.practiceTarget;
      s.medals.haichi[haichiKeyForUnit(id)] = "admin";
      s.medals.battle[id] = "admin";
      return { ok: true, state: s, message: `${id} のメダルをそろえました` };
    }
    case "grantCompanions": {
      let ids = [];
      if (args.mode === "all") ids = [...ROSTER_IDS];
      else if (args.mode === "rarity") ids = SPECIALIST_ROSTER.filter((c) => c.rarity === args.rarity).map((c) => c.id);
      else if (Array.isArray(args.ids)) ids = args.ids.filter((id) => ROSTER_IDS.has(id));
      let added = 0;
      for (const id of ids) if (!s.owned[id]) { s.owned[id] = { exp: 0, exp2: 0, exp3: 0, breaks: 0, n: ++s.acqSeq }; added++; }
      return { ok: true, state: s, message: `仲間を ${added} 体追加しました（いま ${Object.keys(s.owned).length} 体）` };
    }
    case "setCompanionGrowth": { // 所持している仲間全員の経験値・限界突破数をそろえる（強さの確認用）
      const exp = args.exp == null ? null : clampInt(args.exp, 0, 99999999);
      const breaks = args.breaks == null ? null : clampInt(args.breaks, 0, GACHA.maxBreaks);
      for (const o of Object.values(s.owned)) { if (exp != null) { o.exp = exp; o.exp2 = exp; o.exp3 = exp; } if (breaks != null) o.breaks = breaks; }
      return { ok: true, state: s, message: `仲間全員の${exp != null ? ` 経験値=${exp}` : ""}${breaks != null ? ` 限界突破=${breaks}` : ""} に設定しました` };
    }
    case "resetCompanions": {
      const base = initialThirdState();
      s.owned = base.owned; s.acqSeq = base.acqSeq; s.party = [...STARTER_PARTY]; s.pity = base.pity;
      return { ok: true, state: s, message: "仲間を最初の5体に戻しました" };
    }
    case "resetAll": return { ok: true, state: initialThirdState(), message: "この生徒のゲーム状態を最初に戻しました" };
    default: return { ok: false, error: "unknown-op" };
  }
}
