# 数学ラボ2 — サーバ移行とチート対策 手順書（Step0〜5）

中学生が localStorage を書き換えてレベル/クリスタル/装備を盛る問題への対策。
「クライアントを信じない（never trust the client）」＝**報酬に関わる状態はサーバが正**にする。

設計メモ（Obsidian）: `設計_サーバ移行とチート対策_2026-06-28`

---

## 全体像（何を作ったか）

| Step | 中身 | 状態 |
|---|---|---|
| 0 | 認証（クラスコード＋なまえ＋PIN）／記録を本人uidに紐づけ | ✅コード済・機能フラグ制 |
| 1 | 進捗ルールを純関数に一元化 `engine/progress.js` | ✅完了・テスト済 |
| 2 | 問題の決定的シード化（seedから同じq/ans） `engine/seed.js`/`grade.js` | ✅完了・**Nodeテスト済**（3480テンプレ再現一致・採点348/348） |
| 3 | 解答受付 Edge Function＋player_state（サーバ権威） `supabase/functions/attempt` | ⚠️コード済・**要デプロイ**（中核 `engine/applyAttempt.js` はNodeテスト済） |
| 4 | クライアント同期層 `sync/serverSync.js`（送信/読込） | ⚠️コード済・機能フラグ制。ホットパス接続は下記で有効化 |
| 5 | 影運用→切替（サーバを正に） | 📋この手順書 |

**機能フラグ**：`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` が無ければ全部OFF＝今まで通りローカルのみで動く（何も壊れない）。

---

## なぜこれでチートが効かなくなるか

1. **player_state は RLS でクライアント書き込み禁止**（`docs/supabase_setup.sql`）。生徒は自分の行を「読む」だけ。書けるのは Edge Function（service_role）だけ。
   → localStorage を書き換えても、サーバ上のレベル/クリスタル/石は変わらない。
2. **解答は自己申告を信じない**。クライアントは `seed` を送り、サーバは `engine/grade.js` で seed から**問題を作り直して**採点する（`gradeAttempt`）。
   → 「正解した」と嘘をつく改造をしても、サーバが実際に解き直して弾く。
3. サーバの状態更新は `engine/applyAttempt.js`（＝ App.jsx の `bumpCycle` と同じ `progress.js` ルール）。クリア=クリスタル+1・レベル+1、復習=石、応用初クリア=石。

### 正直な限界（把握しておくこと）
- **答え(ans)は JS バンドル内**にある。本気の改造者はバンドルを読めば答え自体は分かる（＝「全問正解の見た目」は作れる）。ただし報酬はサーバが**実際に解き直して**認めた分だけなので、`seed` を送って正しい答えを返す＝結局“解けている”状態しか得しない。**盛り（未学習なのに高レベル）は防げる**。
- なおす(naosu)の「間違いが残っているか」はクライアントの間違いノートで管理。サーバは苦手ノートを持たないため、`applyAttempt` では `unitHasMistakes=false`（＝サーバは naosu を厳しくしない）。クリア報酬は「講義OK＋ためす15正解」が実質条件。
- 教科書DB問題（`problem_bank.json`、固定q/ans）は seed 無し。サーバ採点の対象外（`seed:null`）。手続き生成問題だけがサーバ権威で採れる。

---

## セットアップ（1回だけ）

1. Supabase プロジェクト作成（membership-site とは**別の専用プロジェクト推奨**）。
2. SQL Editor で `docs/supabase_setup.sql` を実行（students / player_state / attempts＋RLS）。
3. Authentication → **Confirm email を OFF**（子どもがメール確認できないため必須）。
4. `.env.local` に URL と anon key を設定（`.env.local.example` 参照）。本番ビルド環境（Cloudflare/GitHub Pages）にも同じ2つを設定。

### Edge Function のデプロイ（Step3を使うとき）
```bash
# Supabase CLI を入れてプロジェクトにリンク後：
supabase functions deploy attempt
# SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY は Supabase が自動注入。
```
関数は `src/engine/{grade,applyAttempt}.js` と `src/data/index.js` を相対 import する。
これらは **JSON を読まない純ESM**なので Deno でバンドルできる（`generator.js` は DB(JSON) を含むので import しない）。

---

## 影(shadow)運用 → 切替（Step5）

### A. 影運用（ローカルが正のまま、裏でサーバにも送って一致確認）
目的：本番の子どもの進捗を壊さずに、サーバ集計が正しいか観察する。

有効化に必要な配線（2箇所・小さい）:
1. **seed を出題に乗せる**：れんしゅう/バトルの出題を `genProblem` →`genProblemSeeded`（返り値 `p.seed`）に替え、`onAttempt` の payload に `seed, templateId, unitId, level` を含める。
2. **裏で送信**：`recordStepAttempt` の中で
   ```js
   import { submitAttempt, serverActive } from "./sync/serverSync.js";
   if (serverActive() && a.seed != null) submitAttempt({ ...a, mode: "practice" }); // fire-and-forget
   ```
観察：Supabase の `attempts`（毎解答ログ）と `player_state`（サーバ集計）を見て、ローカル表示と一致するか確認。

### B. 切替（サーバを“正”に）
一致を確認できたら:
1. 起動時に `loadServerState()` を読み、`player` の**権威フィールド（cycle/crystals/coins/worldCleared/gear）をサーバ値で上書き**（表示もサーバ値に）。
2. これらのフィールドの**ローカル書き込みをやめる**（`bumpCycle` はサーバ結果の反映だけに）。
3. 既存ローカル進捗のある子は、初回ログイン時に1回だけローカル→サーバへ移送（管理者操作 or 移送関数）。

### ロールバック
`.env` の Supabase 変数を外せば即ローカル運用に戻る（データはローカルにも残っている）。

---

## 数学ラボ2の通常アップデートへの影響
- Step2 のシード化・grade.js・applyAttempt.js は**純追加**。既存の出題/採点の見た目は不変（`buildFromSeed` は `genProblem` と同じ skip ロジック）。
- Step3/4 は機能フラグOFFなら存在しないのと同じ。**envを入れるまで通常開発に一切影響しない**。
