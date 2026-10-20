// ============================================================
// enemyFx.js — スキルで敵・パーティにかかる効果の状態（純関数）。ThirdBattle が ref に持って使う。2026-09-26。
//  敵側：ねむり・しびれ（行動不能）／どく／呪い（攻撃力ダウン）／あせり（空振り）。ボスには効きにくい（行動不能は1回だけ・毒は半分）。
//  パーティ側：バリア・みがわり・状態異常封じ・自己再生・次の一撃の強化。
// ============================================================
import { isBossKind } from "./enemyMoves.js";

export const newEnemyFx = () => ({});
const of = (map, id) => (map[id] ||= { skip: 0, skipKind: null, poison: null, atkDown: null, miss: null });
const boss = (e) => isBossKind(e?.kind);

export function applySkip(map, e, turns, kind) { const f = of(map, e.instanceId); f.skip = Math.max(f.skip, boss(e) ? 1 : turns); f.skipKind = kind; }
export function applyPoison(map, e, frac, cycles) { of(map, e.instanceId).poison = { n: cycles, frac: boss(e) ? frac / 2 : frac }; }
export function applyCurse(map, e, mul, cycles) { of(map, e.instanceId).atkDown = { n: cycles, mul }; }
export function applyPanic(map, e, cycles, p) { of(map, e.instanceId).miss = { n: cycles, p }; }

/** その敵の行動の直前に呼ぶ。毒のダメージ・行動不能・攻撃力ダウン・空振りを決めて、ターン数を進める。 */
export function tickEnemyTurn(map, e, rand = Math.random) {
  const f = map[e.instanceId];
  const out = { poisonDamage: 0, skip: false, skipKind: null, atkMul: 1, miss: false };
  if (!f) return out;
  if (f.poison) { out.poisonDamage = Math.max(1, Math.round(e.maxHp * f.poison.frac)); if (--f.poison.n <= 0) f.poison = null; }
  if (f.skip > 0) { f.skip -= 1; out.skip = true; out.skipKind = f.skipKind; }
  if (f.atkDown) { out.atkMul = f.atkDown.mul; if (--f.atkDown.n <= 0) f.atkDown = null; }
  if (f.miss) { out.miss = rand() < f.miss.p; if (--f.miss.n <= 0) f.miss = null; }
  return out;
}
/** 画面に出す短いタグ（敵の名前の下） */
export function enemyFxTags(map, e) {
  const f = map[e.instanceId]; if (!f) return [];
  const t = [];
  if (f.skip > 0) t.push(f.skipKind === "stun" ? "⚡しびれ" : "💤ねむり");
  if (f.poison) t.push(`☠どく${f.poison.n}`);
  if (f.atkDown) t.push(`💀呪い${f.atkDown.n}`);
  if (f.miss) t.push(`😵あせり${f.miss.n}`);
  return t;
}

// ---- パーティ側 ----
export const newPartyFx = () => ({ shield: 0, decoy: 0, silence: 0, regen: null, nextMul: 1 });
/** 敵1回の攻撃ダメージを、みがわり→バリアの順で減らす。 { dmg, note } を返す */
export function absorbDamage(px, dmg) {
  if (dmg <= 0) return { dmg: 0, note: null };
  if (px.decoy > 0) { px.decoy -= 1; return { dmg: 0, note: "みがわり！" }; }
  if (px.shield > 0) { const a = Math.min(px.shield, dmg); px.shield -= a; return { dmg: dmg - a, note: a >= dmg ? "バリアで防いだ！" : "バリアが割れた！" }; }
  return { dmg, note: null };
}
export function partyFxChips(px) {
  const c = [];
  if (px.shield > 0) c.push(`🔰バリア${Math.round(px.shield)}`);
  if (px.decoy > 0) c.push(`🎎みがわり×${px.decoy}`);
  if (px.silence > 0) c.push(`🔇状態異常封じ${px.silence}`);
  if (px.regen) c.push(`♻再生${px.regen.n}`);
  if (px.nextMul > 1) c.push(`🔥次の一撃×${px.nextMul}`);
  return c;
}
