// ============================================================
// kidAuth.js — 子ども向けログイン（メール不要）。
//  ログインの識別は「ID」1つだけ（自分で決める）。ニックネームは表示名にすぎず、
//  ログインには一切関係しない＝いつ変えてもログインが変わらない。
//   ・email：ID の決定論ハッシュ ＠mathlabo.local
//     → 同じIDなら必ず同じメール＝再ログインできる。日本語のIDでもOK（ハッシュ化）。
//   ・password：あいことば（パスワード）を prefix でパディング。
//  登録（registerKid）とログイン（loginKid）は別の関数（2026-08-04〜：以前は
//  「サインイン失敗→自動で新規作成」という一体型(signInKid)だったが、存在しないIDでも
//  勝手にアカウントができてしまい紛らわしいため分離。登録済みIDでの登録はエラーに、
//  存在しないIDでのログインもエラーにする（自動生成しない））。
//  ※ Supabase 側で「Confirm email」を OFF にしておくこと（.local メールは確認できないため）。
// ============================================================
import { supabase } from "./supabase.js";

function hash36(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
/**
 * 学校コード形式のID（例：E-101236）は、全角・小文字で入れられても「E-101236」にそろえる（ログインで迷わないように）。
 * それ以外の自由なIDは、これまでどおり前後の空白を除くだけ（既存のアカウントのIDは変わらない）。
 */
export function normalizeId(id) {
  const raw = String(id || "").trim();
  const t = raw.normalize("NFKC").replace(/[‐‑‒–—―−ー]/g, "-");
  return /^[A-Za-z]-\d{6}$/.test(t) ? t.toUpperCase() : raw;
}
/** 学校コード形式のIDを作る。例：("E", 10, 1, 2, 36) → "E-101236"（学校コード-コード番号2桁＋年1桁＋組1桁＋号2桁）。小テストの学籍番号との連携用。 */
export function schoolId(code, num, year, cls, no) {
  const p2 = (n) => String(n).padStart(2, "0");
  return `${code}-${p2(num)}${year}${cls}${p2(no)}`;
}
export function emailFor(id) {
  const h = hash36(normalizeId(id));
  return `id-${h}@mathlabo.local`;
}
function passwordFor(pin) { return "mlpw-" + String(pin || "").trim(); }

/** 現在のログインユーザー（未ログイン/認証OFFは null） */
export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

/**
 * 新規登録専用。そのIDが既に使われていれば分かりやすいメッセージで失敗する（自動ログインはしない）。
 * @param {string} id       これから使うID（本人が決める）
 * @param {string} pin      あいことば（パスワード・すうじ4つ）
 * @param {string} nickname 表示名の初期値（あとでキャラクター設定から変更可）
 */
export async function registerKid(id, pin, nickname = "") {
  if (!supabase) throw new Error("ログイン機能はまだ準備中です（Supabase未設定）。");
  const email = emailFor(id);
  const password = passwordFor(pin);

  const su = await supabase.auth.signUp({ email, password, options: { data: { display_name: nickname } } });
  if (su.error) {
    const msg = String(su.error.message || "");
    if (/already registered|already exists|already been registered/i.test(msg)) {
      throw new Error("そのIDは すでに使われています。ちがうIDを ためしてね。");
    }
    throw new Error("とうろくできませんでした：" + msg);
  }
  // Supabaseの仕様：メール確認OFFでも、既に使われているメールへのsignUpが
  // 表面上エラーにならず「identities が空配列」で返ってくることがある（重複の別サイン）。
  const identities = su.data?.user?.identities;
  if (Array.isArray(identities) && identities.length === 0) {
    throw new Error("そのIDは すでに使われています。ちがうIDを ためしてね。");
  }
  const uid = su.data?.user?.id;
  if (!uid) throw new Error("アカウント作成に失敗しました。しばらくして もう一度ためしてね。");
  await upsertStudent(uid, nickname, normalizeId(id));
  return { uid };
}

/**
 * ログイン専用。存在しないID・まちがったパスワードはどちらも同じメッセージで失敗する
 * （どちらが原因か教えない＝IDの実在をあてずっぽうで探られないようにするため）。自動登録はしない。
 * @param {string} id  登録ずみのID
 * @param {string} pin あいことば（パスワード・すうじ4つ）
 */
export async function loginKid(id, pin) {
  if (!supabase) throw new Error("ログイン機能はまだ準備中です（Supabase未設定）。");
  const email = emailFor(id);
  const password = passwordFor(pin);

  const si = await supabase.auth.signInWithPassword({ email, password });
  if (si.error || !si.data?.user) throw new Error("IDまたはパスワードが ちがいます。");
  return { uid: si.data.user.id };
}

export async function signOutKid() { if (supabase) await supabase.auth.signOut(); }

/** ログインのたびに students.last_login を更新する（＝ログイン履歴。何も解かずに終わっても痕跡が残る）。失敗しても致命的ではない。 */
export async function touchLastLogin(uid) {
  if (!supabase || !uid) return;
  try {
    await supabase.from("students").update({ last_login: new Date().toISOString() }).eq("id", uid);
    // ログイン履歴（日付がわかるように1回ぶん追加。同じ開き直しで何度も増えないよう、このタブでは1回だけ）
    const k = "ml3_login_logged_" + uid;
    if (!sessionStorage.getItem(k)) {
      sessionStorage.setItem(k, "1");
      await supabase.from("third_login_log").insert({ student_id: uid }); // 表がまだ無い場合はエラーになるだけ（無視）
    }
  } catch { /* noop */ }
}

/** ログイン中の生徒の登録ID（students.class_code＝本人が決めたID）を取得。quiz連携などID突合に使う。取れなければnull。 */
export async function getMyClassCode() {
  if (!supabase) return null;
  try {
    const { data: ud } = await supabase.auth.getUser();
    const uid = ud?.user?.id;
    if (!uid) return null;
    const { data } = await supabase.from("students").select("class_code").eq("id", uid).single();
    return data?.class_code || null;
  } catch {
    return null;
  }
}

// students テーブルに名前・IDを記録（表示と教師ダッシュボード用）。RLS：本人のみ。
//  ※ class_code 列は元は「クラスコード」用だったが、今はログインIDをそのまま入れる。
async function upsertStudent(uid, name, loginId) {
  try {
    await supabase.from("students").upsert(
      { id: uid, name: String(name || "").trim(), class_code: String(loginId || "").trim() },
      { onConflict: "id" }
    );
  } catch { /* students テーブル未作成でもログイン自体は通す */ }
}

/** ニックネーム変更をサーバー(students.name)にも反映する。失敗しても致命的ではない（ローカルは別途更新済み）。 */
export async function updateNickname(name) {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;
    await supabase.from("students").update({ name: String(name || "").trim() }).eq("id", uid);
  } catch { /* noop */ }
}

/** ご意見箱：生徒の意見をサーバー(feedback)に送る。失敗しても致命的ではない（ローカルには別途保存済み）。 */
export async function submitFeedback({ message, category = "", name = "", loginId = "" }) {
  if (!supabase) return { ok: false };
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return { ok: false };
    const { error } = await supabase.from("feedback").insert({
      student_id: uid, name: String(name || "").trim(), login_id: String(loginId || "").trim(),
      category, message: String(message || "").trim(),
    });
    return { ok: !error };
  } catch { return { ok: false }; }
}
