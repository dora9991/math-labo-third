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
import { loginKid, registerKid, schoolId } from "../auth/kidAuth.js";
import { getRememberedId, setRememberedId, getAutoLogin, setAutoLogin } from "../auth/loginPrefs.js";

// 学校コードから作るIDの選択肢（例：E-101236 ＝ 学校コードE・コード番号10・1年・2組・36号）
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUM99 = Array.from({ length: 99 }, (_, i) => String(i + 1));
const YEARS = ["1", "2", "3"];
const CLASSES = Array.from({ length: 9 }, (_, i) => String(i + 1));

export default function Login({ onDone, onGuest }) {
  const remembered = getRememberedId();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [id, setId] = useState(remembered);
  const [pin, setPin] = useState("");
  const [autoLogin, setAutoLoginState] = useState(() => getAutoLogin());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isRegister = mode === "register";
  // 新規登録の方法：「学校コードを通して登録」（プルダウンでIDを作る。例：E-101236）／「個別にIDを作って登録」（自由に決める）
  const [regType, setRegType] = useState("school"); // "school" | "custom"
  const [sel, setSel] = useState({ code: "", num: "", year: "", cls: "", no: "" });
  const bySchool = isRegister && regType === "school";
  const schoolReady = Object.values(sel).every((v) => v !== "");
  const effId = bySchool ? (schoolReady ? schoolId(sel.code, Number(sel.num), sel.year, sel.cls, Number(sel.no)) : "") : id.trim();
  const ready = !!effId && /^\d{4}$/.test(pin);

  async function submit(e) {
    e?.preventDefault();
    if (!ready || busy) return;
    setBusy(true); setErr("");
    try {
      const { uid } = isRegister
        ? await registerKid(effId, pin, effId) // ニックネームの初期値はID（あとで設定変更可）
        : await loginKid(effId, pin);
      setRememberedId(effId);
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
    if (next === "register") { setId(""); setRegType("school"); setSel({ code: "", num: "", year: "", cls: "", no: "" }); } // 登録は新しいIDを決めるので空にする
    else setId(remembered);
  }

  const inp = {
    width: "100%", padding: "13px 14px", borderRadius: 12, fontSize: 16, fontWeight: 700,
    border: "1.5px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.06)", color: "#fff",
    fontFamily: "inherit", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, fontWeight: 800, color: "#c7d2fe", margin: "0 0 5px 2px" };

  return (
    <div className="app legacy-auth" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 20 }}>
      <form onSubmit={submit} className="glass" style={{ width: "100%", maxWidth: 360, padding: "26px 22px", textAlign: "center" }}>
        <div style={{ fontSize: 30 }}>📐</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: "2px 0 2px" }}>数学ラボ3</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 18 }}>
          {isRegister ? "新規登録：新規IDと合言葉を決めよう" : remembered ? "おかえりなさい！" : "ログインして はじめよう"}
        </div>

        {isRegister && (
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <div style={lbl}>とうろくの方法</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[["school", "🏫 学校コードを通して登録"], ["custom", "✏️ 個別にIDを作って登録"]].map(([k, label]) => (
                <button key={k} type="button" data-sfx="none" onClick={() => setRegType(k)} style={{
                  flex: 1, padding: "10px 6px", borderRadius: 12, fontSize: 12.5, fontWeight: 800, cursor: "pointer", lineHeight: 1.4, fontFamily: "inherit",
                  color: "#fff", border: regType === k ? "2px solid #a5b4fc" : "1px solid rgba(255,255,255,.2)",
                  background: regType === k ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.05)",
                }}>{label}</button>
              ))}
            </div>
          </div>
        )}

        {bySchool ? (
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <div style={lbl}>新規ID（学校コードから作ります）</div>
            {[
              [[["code", "学校コード", LETTERS, ""], ["num", "コード番号", NUM99, ""]]],
              [[["year", "年", YEARS, "年"], ["cls", "組", CLASSES, "組"], ["no", "号", NUM99, "号"]]],
            ].map(([row], ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 8, marginBottom: 8 }}>
                {row.map(([k, label, opts, unit]) => (
                  <label key={k} style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, color: "rgba(255,255,255,.6)", margin: "0 0 3px 2px" }}>{label}</span>
                    <select value={sel[k]} onChange={(e) => setSel((o) => ({ ...o, [k]: e.target.value }))} style={{ ...inp, padding: "11px 8px", fontSize: 15 }}>
                      <option value="">えらぶ</option>
                      {opts.map((o) => <option key={o} value={o}>{o}{unit}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            ))}
            <div style={{ textAlign: "center", padding: "10px 8px", borderRadius: 12, background: "rgba(255,255,255,.06)", border: "1px dashed rgba(255,255,255,.25)" }}>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.55)" }}>あなたのID</div>
              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, color: effId ? "#fde68a" : "rgba(255,255,255,.3)" }}>{effId || "E-101236 のように できます"}</div>
              {effId && <div style={{ fontSize: 10.5, color: "#fcd34d", marginTop: 2 }}>ログインの時も このIDを入れるよ。メモしておいてね</div>}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "left", marginBottom: 12 }}>
            <div style={lbl}>{isRegister ? "新規ID" : "ID"}</div>
            <input style={inp} value={id} onChange={(e) => setId(e.target.value)}
              placeholder={isRegister ? "すきなIDを決めてね（例：taro2025）" : "IDを入れてください。（例：1204、E-101236）"}
              autoCapitalize="off" autoCorrect="off" />
          </div>
        )}

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

        {onGuest && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.12)" }}>
            <button type="button" onClick={onGuest} data-sfx="none" style={{
              width: "100%", padding: "12px", borderRadius: 13, cursor: "pointer", fontSize: 14.5, fontWeight: 800, color: "#e2e8f0",
              background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.25)",
            }}>👤 ゲストで遊ぶ</button>
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", marginTop: 6, lineHeight: 1.6 }}>
              ログインしなくても すぐ遊べるよ。<b>データは のこりません</b>（とじると きえます）。
            </div>
          </div>
        )}

        <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.4)", marginTop: 14, lineHeight: 1.6 }}>
          {isRegister
            ? <>{regType === "school" ? <>学校のクラスの人は「学校コードを通して登録」を選んでね。小テストと同じ形のIDになるよ。<br /></> : null}IDと合言葉は わすれないようにメモしておいてね！<br />ニックネーム（呼び名）は はじめはIDと同じ。あとから「🎨キャラクター」でいつでも変えられるよ。</>
            : <>ID・合言葉を わすれた人は先生に相談してね。</>}
        </div>
      </form>
    </div>
  );
}
