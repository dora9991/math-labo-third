// ============================================================
// main.jsx — アプリの入口。React を起動して App を画面に描く。
// 基本的にここは触らない。
// ============================================================
import React from "react";
import ReactDOM from "react-dom/client";
import AuthGate from "./auth/AuthGate.jsx"; // 認証OFF(Supabase未設定)なら中身はそのまま App（従来どおり）
import "./styles/theme.css";
import "./styles/battle.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate />
  </React.StrictMode>
);
