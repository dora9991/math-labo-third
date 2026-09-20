// ============================================================
// Login.jsx — 子ども向けログイン画面（メール不要）。
//  2026-08-04改修：「ログイン」と「新規登録」を別の画面（モード）に分離。
//   ・ログイン（既定）：登録ずみのID・合言葉を入れる。存在しないID／まちがった合言葉は
//     どちらも「IDまたはパスワードが ちがいます」で失敗する（自動でアカウントは作らない）。
//   ・新規登録：ボタンから切りかえ、ID・合言葉を自分で決めて登録する。
//     そのIDが既に使われていれば「そのIDは すでに使われています」と表示する。
//  「自動ログイン」にチェックすると、次回はそれすら省略して直接入れる
//  （共有の端末では毎回チェックを外すことをすすめる）。
//  認証ON（Supabase設定済み）のときだけ AuthGate から表示される。
// ============================================================
import { useState } from "react";
import { loginKid, registerKid } from "../auth/kidAuth.js";
import { getRememberedId, setRememberedId, getAutoLogin, setAutoLogin } from "../auth/loginPrefs.js";

export default function Login({ onDone }) {
  const remembered = getRememberedId();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [id, setId] = useState(remembered);
  const [pin, setPin] = useState("");
  const [autoLogin, setAutoLoginState] = useState(() => getAutoLogin());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isRegister = mode === "register";
  const ready = id.trim() && /^\d{4}$/.test(pin);

  async function submit(e) {
    e?.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setErr("");
    try {
      const { uid } = isRegister
        ? await registerKid(id, pin, id) // ニックネームの初期値はID（あとで設定変更可）
        : await loginKid(id, pin);
      setRememberedId(id);
      setAutoLogin(autoLogin);
      onDone?.(uid);
    } catch (e2) {
      setErr(e2.message || (isRegister ? "とうろくできませんでした。" : "ログインできませんでした。"));
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setPin("");
    setErr("");
    if (next === "register") setId(""); // 登録は新しいIDを決めるので空にする
    else setId(remembered);
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
    border: "1.5px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", color: "#fff",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, fontWeight: 800, color: "#c7d2fe", margin: "0 0 5px 2px" };

  return (
    <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 20 }}>
      <form onSubmit={submit} className="glass" style={{ width: "100%", maxWidth: 360, padding: "26px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 30 }}>📐</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "2px 0 2px" }}>数学ラボ2</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 18 }}>
          {isRegister ? "新規登録：IDと合言葉を決めよう" : remembered ? "おかえりなさい！" : "ログインして はじめよう"}
        </div>

        <div style={{ textAlign: "left", marginBottom: 12 }}>
          <div style={lbl}>ID</div>
          <input style={inp} value={id} onChange={(e) => setId(e.target.value)}
            placeholder={isRegister ? "例：E-101236（小テストと同じIDだと連携できるよ）" : "IDを入れてください。（例：1204）"}
            autoCapitalize="off" autoCorrect="off" />
        </div>

        <div style={{ textAlign: "left", marginBottom: 10 }}>
          <div style={lbl}>合言葉（パスワード・すうじ4つ）</div>
          <input style={{ ...inp, letterSpacing: 6, textAlign: "center" }} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric" placeholder="１２３４" />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", fontSize: 12.5, fontWeight: 700, color: "rgba(255,255,255,.75)", margin: "4px 0 2px", cursor: "pointer" }}>
          <input type="checkbox" checked={autoLogin} onChange={(e) => setAutoLoginState(e.target.checked)} style={{ width: 16, height: 16 }} />
          🔓 自動ログイン（次からパスワード入力なしで入れる）
        </label>
        {autoLogin && (
          <div style={{ fontSize: 10.5, color: "#fcd34d", marginTop: 3, textAlign: "left", lineHeight: 1.5 }}>
            ⚠️ みんなで使うパソコンでは チェックしないでね
          </div>
        )}

        <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")} data-sfx="none"
          style={{ marginTop: 10, background: "none", border: "none", color: "#7dd3fc", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>
          {isRegister ? "🔁 もう登録した人はこちら（ログイン）" : "🆕 はじめての人はこちら（新規登録）"}
        </button>

        {err && <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fca5a5", margin: "10px 0 0", lineHeight: 1.5 }}>⚠️ {err}</div>}

        <button type="submit" disabled={!ready || busy} data-sfx="none" style={{
          width: "100%", marginTop: 16, padding: "14px", borderRadius: 13, border: "none",
          cursor: ready && !busy ? "pointer" : "not-allowed", fontSize: 16, fontWeight: 900, color: "#fff",
          background: ready && !busy ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,.12)",
        }}>{busy ? "…" : isRegister ? "▶ とうろくする" : "▶ ログイン"}</button>

        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", marginTop: 14, lineHeight: 1.6 }}>
          {isRegister
            ? <>IDと合言葉は自分で決めよう。わすれないようにメモしておいてね！<br />ニックネーム（呼び名）は はじめはIDと同じ。あとから「🎨キャラクター」でいつでも変えられるよ。<br />小テストアプリを使っているクラスは、そちらと同じIDにすると先生が名寄せしやすいよ。</>
            : <>ID・合言葉を わすれた人は先生に相談してね。</>}
        </div>
      </form>
    </div>
  );
}
