// ============================================================
// AuthGate.jsx — 認証の入口。
//  ・認証OFF（Supabase未設定）：そのまま <App/>（今まで通り・ローカルのみ）。
//  ・認証ON：セッションを見て、未ログインなら <Login/>、ログイン済みなら <App/>。
//    ログイン中は setActiveUid でユーザーidを共有し、保存(localStore)や記録がそのuidで分かれる。
//    App は key={uid} で作り直す＝ユーザーが変わればそのユーザーの保存を読む。
// ============================================================
import { useEffect, useState } from "react";
import App from "../App.jsx";
import Login from "../screens/Login.jsx";
import { AUTH_ENABLED, supabase } from "./supabase.js";
import { setActiveUid, getActiveUid } from "./session.js";
import { getAutoLogin, setAutoLogin, setRememberedId } from "./loginPrefs.js";
import { touchLastLogin } from "./kidAuth.js";

export default function AuthGate() {
  if (!AUTH_ENABLED) return <App />; // 認証OFF＝従来どおり

  const [user, setUser] = useState(undefined); // undefined=判定中 / null=未ログイン / obj=ログイン中

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      let u = data?.session?.user || null;
      // 「自動ログイン」がOFFなら、次に開いたときは毎回ログインし直させる
      //  （共有のパソコンで前の生徒のログインが残らないようにするため）。
      //  ※ ページを開いた直後の一度だけの判定。使用中に勝手にログアウトすることはない。
      if (u && !getAutoLogin()) {
        await supabase.auth.signOut();
        u = null;
      }
      setActiveUid(u?.id || null);
      setUser(u);
      if (u) touchLastLogin(u.id); // ログイン履歴：開いただけでも痕跡を残す（何も解かなくても記録される）
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setActiveUid(u?.id || null);
      setUser(u);
      if (u) touchLastLogin(u.id);
    });
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  if (user === undefined) {
    return <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", color: "rgba(255,255,255,.6)" }}>よみこみ中…</div>;
  }
  if (!user) return <Login onDone={() => { /* onAuthStateChange が拾う */ }} />;

  return (
    <>
      <App key={user.id} />
      <button data-sfx="none" onClick={() => {
        setActiveUid(null);
        setAutoLogin(false); setRememberedId(""); // 明示的なログアウト＝この端末の記憶も消す（共有端末対策）
        supabase.auth.signOut();
      }}
        title="ログアウト"
        style={{ position: "fixed", top: 8, right: 8, zIndex: 300, width: 34, height: 34, borderRadius: 999,
          border: "1px solid rgba(255,255,255,.2)", background: "rgba(0,0,0,.45)", color: "#fff", cursor: "pointer", fontSize: 15 }}>
        🚪
      </button>
    </>
  );
}
