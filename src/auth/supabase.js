// ============================================================
// supabase.js — Supabase クライアント（環境変数があるときだけ有効）。
//  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY を .env.local に入れると認証ON。
//  未設定なら AUTH_ENABLED=false ＝ 今まで通りローカルのみで動く（何も壊れない）。
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const AUTH_ENABLED = !!(url && key);
export const supabase = AUTH_ENABLED
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
