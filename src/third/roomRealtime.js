// ============================================================
// roomRealtime.js — マルチプレイの部屋の変化を、参加者の画面へ即座に届ける（Supabase Realtime）。
//  ・third_rooms の自分の部屋の行が変わったら、その内容(room)を受け取る（RLSで参加者だけが読める）。
//  ・Presence で「いまつながっている人」を配る（第2段階の「落ちたら飛ばす」の土台）。
//  ・Realtime が届かない環境のために、定期的に取り直す(poll)もあわせて行う。
// ============================================================
import { supabase } from "../auth/supabase.js";

/**
 * @param {{code:string, userId:string, onRoom:(room:object)=>void, onOnline:(ids:string[])=>void, poll:()=>Promise<void>, pollMs?:number}} o
 * @returns {() => void} 購読の解除
 */
export function watchRoom({ code, userId, onRoom, onOnline, poll, pollMs = 4000 }) {
  let stopped = false;
  const channel = supabase.channel(`third-room:${code}`, { config: { presence: { key: userId } } });
  channel.on("postgres_changes", { event: "*", schema: "public", table: "third_rooms", filter: `code=eq.${code}` }, (p) => {
    if (!stopped && p.new?.room) onRoom(p.new.room);
  });
  channel.on("presence", { event: "sync" }, () => { if (!stopped) onOnline(Object.keys(channel.presenceState())); });
  channel.subscribe((status) => { if (status === "SUBSCRIBED") channel.track({ at: Date.now() }); });
  const timer = setInterval(() => { if (!stopped) poll(); }, pollMs);
  return () => { stopped = true; clearInterval(timer); supabase.removeChannel(channel); };
}
