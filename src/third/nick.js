// ============================================================
// nick.js — 仲間（ガチャで集めた子）ごとの「ニックネーム」。
//  サーバーもブラウザも同じ規則で整える（core.js の setNick / normalizeThirdState と、画面の入力欄）。
//  ・ニックネームは本人の仲間(owned[id].nick)にだけ付く。他の人には見せない（部屋の仲間にも出さない）。
//  ・長さは NICK_MAX 文字まで（見た目の1文字ずつ。絵文字も1文字と数える）。
// ============================================================
export const NICK_MAX = 8;

const SEGMENTER = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("ja", { granularity: "grapheme" }) : null;
const chars = (s) => (SEGMENTER ? Array.from(SEGMENTER.segment(s), (x) => x.segment) : Array.from(s));

/** 文字数（見た目の1文字ずつ） */
export const nickLength = (s) => chars(String(s ?? "")).length;

/**
 * 入力を整える：前後の空白を取る／改行や目に見えない制御文字を除く／連続した空白を1つに／NICK_MAX 文字までに切る。
 * 文字列以外・空になったら "" を返す（＝ニックネームなし）。
 */
export function cleanNick(raw) {
  if (typeof raw !== "string") return "";
  const s = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, " ") // 制御文字・ゼロ幅・向きを変える文字
    .replace(/\s+/g, " ") // 全角の空白も \s に含まれる
    .trim();
  return chars(s).slice(0, NICK_MAX).join("").trim();
}

/** 入力欄用：打っている途中なので前後の空白は残し、NICK_MAX 文字だけに切る */
export const clipNick = (raw) => chars(String(raw ?? "").replace(/[\r\n]+/g, " ")).slice(0, NICK_MAX).join("");

/** 画面に出す名前：ニックネームがあればそれ、なければ元の名前 */
export const displayName = (c) => (c && (c.nick || c.name)) || "";
