// ============================================================
// skillDefs.js — 新しいスキルの定義（2026-09-26 kazu指定：math-world に載せる予定だったスキルを追加）。
//  既存の6系統（全体攻撃・単体攻撃・攻撃バフ・防御バフ・回復・状態異常回復）に加えて、16種類。
//  レア度（tier 1〜4＝N・R・SR・UR）で効果が強くなる。ゲージ（発動に必要な正解数）は既存と同じ：6・9・12・15問。
//  効果の中身は ThirdBattle.jsx の resolveSkillAfterCutIn が category で読む。
// ============================================================
const T = (arr, tier) => arr[Math.min(arr.length, Math.max(1, tier)) - 1];

/** 16種類。params(tier) は、その段階の数値。 desc(p) は説明文。 */
export const NEW_SKILL_TYPES = {
  sleep: { name: "ねむりの呪文", icon: "💤", target: "single", roleTag: "妨害（ねむり）", label: "ねむり型", params: (t) => ({ turns: T([1, 1, 2, 2], t) }), desc: (p) => `敵1体をねむらせて、${p.turns}回ぶん行動できなくする（ボスは1回だけ）` },
  stunHit: { name: "しびれの一撃", icon: "⚡", target: "single", roleTag: "妨害（しびれ）", label: "しびれ型", params: (t) => ({ multiplier: T([1.5, 2, 2.5, 3], t), turns: T([1, 1, 1, 2], t) }), desc: (p) => `敵単体に通常の${p.multiplier}倍のダメージ＋${p.turns}回ぶん行動不能（ボスは1回だけ）` },
  poisonEnemy: { name: "どくの牙", icon: "☠️", target: "single", roleTag: "妨害（どく）", label: "どく型", params: (t) => ({ frac: T([0.03, 0.04, 0.05, 0.06], t), cycles: 3 }), desc: (p) => `敵1体を毒にする。3回の行動のあいだ、そのたびに最大HPの${Math.round(p.frac * 100)}%のダメージ（ボスは半分）` },
  curseHit: { name: "呪いの一撃", icon: "💀", target: "single", roleTag: "妨害（呪い）", label: "呪い型", params: (t) => ({ multiplier: T([1.5, 1.5, 2, 2], t), atkMul: T([0.85, 0.8, 0.7, 0.6], t), cycles: 3 }), desc: (p) => `敵単体に通常の${p.multiplier}倍のダメージ＋その敵の攻撃力が3回ぶん×${p.atkMul}` },
  timeSteal: { name: "時間どろぼう", icon: "⏳", target: "enemyGauge", roleTag: "妨害（時間）", label: "時間かせぎ型", params: (t) => ({ seconds: T([4, 6, 8, 10], t) }), desc: (p) => `敵が行動するまでの時間を${p.seconds}秒のばす` },
  timeJam: { name: "時間妨害", icon: "⏱️", target: "enemyGauge", roleTag: "妨害（時間停止）", label: "時間停止型", params: (t) => ({ seconds: T([4, 5, 6, 8], t) }), desc: (p) => `敵の行動ゲージを${p.seconds}秒のあいだ止める` },
  dispel: { name: "バフ消し", icon: "✖️", target: "single", roleTag: "妨害（ため消し）", label: "ため消し型", params: (t) => ({ multiplier: T([1.5, 2, 2.5, 3], t) }), desc: (p) => `敵単体に通常の${p.multiplier}倍のダメージ。ボスが「ため」ている大技を、ふつうの攻撃にしてしまう` },
  silence: { name: "封印の呪縛", icon: "🔇", target: "enemyAll", roleTag: "妨害（状態異常封じ）", label: "状態異常封じ型", params: (t) => ({ cycles: T([1, 2, 2, 3], t) }), desc: (p) => `敵全体の状態異常攻撃を、${p.cycles}回の行動ぶん封じる` },
  panic: { name: "あせりの波動", icon: "😵", target: "enemyAll", roleTag: "妨害（空振り）", label: "空振り型", params: (t) => ({ cycles: T([2, 2, 3, 3], t), missChance: T([0.4, 0.5, 0.5, 0.6], t) }), desc: (p) => `敵全体があわてて、${p.cycles}回の行動ぶん、${Math.round(p.missChance * 100)}%の確率で攻撃が空振りする` },
  spDrain: { name: "SP吸収", icon: "🌀", target: "party", roleTag: "サポート（ゲージ）", label: "ゲージ吸収型", params: (t) => ({ gain: T([2, 3, 4, 5], t) }), desc: (p) => `味方全員のスキルゲージが、+${p.gain}たまる` },
  decoy: { name: "みがわり", icon: "🎎", target: "party", roleTag: "サポート（みがわり）", label: "みがわり型", params: (t) => ({ times: T([1, 1, 2, 2], t) }), desc: (p) => `次に受ける敵の攻撃を、${p.times}回ぶん無効にする` },
  barrier: { name: "身を守るバリア", icon: "🔰", target: "party", roleTag: "サポート（バリア）", label: "バリア型", params: (t) => ({ frac: T([0.1, 0.15, 0.2, 0.3], t) }), desc: (p) => `味方全員に、最大HPの${Math.round(p.frac * 100)}%ぶんのバリア（ダメージを先に受けとめる）` },
  regen: { name: "自己再生", icon: "♻️", target: "party", roleTag: "サポート（じわじわ回復）", label: "再生型", params: (t) => ({ frac: T([0.05, 0.07, 0.09, 0.12], t), cycles: 3 }), desc: (p) => `3回の敵の行動のあいだ、そのたびに味方全員の最大HPの${Math.round(p.frac * 100)}%ぶん回復` },
  multiHit: { name: "連続攻撃", icon: "👊", target: "single", roleTag: "単体アタッカー（連続）", label: "連続攻撃型", params: (t) => ({ hits: 3, multiplier: T([1.0, 1.2, 1.4, 1.6], t) }), desc: (p) => `敵単体に、通常の${p.multiplier}倍のダメージを${p.hits}回つづけて` },
  pierceHit: { name: "防御貫通", icon: "🗡️", target: "single", roleTag: "単体アタッカー（貫通）", label: "貫通型", params: (t) => ({ multiplier: T([2, 2.5, 3, 3.5], t), capFrac: 0.6 }), desc: (p) => `敵単体に通常の${p.multiplier}倍のダメージ。1回で削れる上限（最大HPの35%）を無視して、最大60%まで` },
  chargeNext: { name: "ためて大技", icon: "🔥", target: "party", roleTag: "アタッカー（ため）", label: "ため大技型", params: (t) => ({ multiplier: T([3, 4, 5, 6], t) }), desc: (p) => `力をためる。次の正解の攻撃が、通常の${p.multiplier}倍になる` },
};
export const NEW_SKILL_KEYS = Object.keys(NEW_SKILL_TYPES);

/** そのスキルの実体（レア度の段階 tier=1〜4）。 category は種類のキー */
export function buildSkill(key, tier) {
  const def = NEW_SKILL_TYPES[key];
  const p = def.params(tier);
  return { id: `${key}_${tier}`, name: def.name, icon: def.icon, category: key, tier, target: def.target, ...p, desc: def.desc(p) };
}
