# 旧デザイン統一 第2弾（実画面を確認して見つかった残り）

前提: docs/BRIEF_START_TITLE_LEGACY.md と docs/DESIGN_CHANGELOG_START_TITLE_LEGACY.md を読むこと。
第1弾は主にCSSだけで統一したが、実画面（1024×768）を確認すると、まだ「前の数学ラボ」の見た目が残っている。
今回は**JSXのマークアップやclassNameの変更も含めて**、確実に統一する。

## 実画面で確認した残り（具体的な不具合）
1. **れんしゅうモードの問題画面**（src/screens/SlowMode.jsx, StepUpSimple.jsx ほか）:
   - 問題カードが真っ白な角丸の箱のまま。→ 象牙〜淡い羊皮紙色(#f4efe2 付近)＋金の細枠＋角のフィリグリー、文字は濃い藍〜黒でセリフ/明朝は使わず読みやすいゴシック(Noto Sans JP)。
     世界観に馴染ませつつ、問題文と数式(MathText/KaTeX)のコントラストは高く保つ。
   - 「💡ヒントを見る」「🤔わからない」が淡い水色のパステルチップで、小さく、無効時は読めない。→ 統一の切り欠きボタン(GameButton系)にし、44px以上、無効時も文字が読める。絵文字はやめSVG線画に。
   - 上部の進捗バー(できた！の かいだん ✨0/5)と吹き出し(「毎日続けるのが一番！」)も、統一デザインに。
2. **はいちモード**（src/screens/HaichiMode.jsx, HaichiStudio.jsx）:
   - 操作バー（◀前/次▶、動画＋プリント/動画/プリント、縦/横/入れ替え、操作/書く、ペン色・太さ、消しゴム、全消し、別タブ）が丸いピル型の水色ボタンの寄せ集め。
     → 統一の切り欠き/斜めのボタン群にし、セグメント切替(選択中は金縁で光る)として整理。ペン色の丸は維持。動画・プリントの表示自体は変えない。
   - 「確認クリア済み！もう一度ためす／復習に」等の表示(バッジ・ボタン)も統一。
3. **確認問題**（はいちモードの確認問題、src/screens 内のもの）、**ボスと対決**（Challenge.jsx）、**学び直し**（Relearn.jsx）、
   **結果/ふりかえり画面**、**Login.jsx**、**Transfer.jsx**、**HowTo.jsx**、**Character.jsx**、**ミニテスト**（UnitTest*.jsx）、**診断**（Diagnose.jsx）:
   実際にコードを読み、旧クラス・inline style(丸ゴシック、旧グラデ、絵文字の見出し、パステルチップ、白い箱)が残っていれば全て統一。
   「触れなかった/到達不能」と判断したものは、その理由を変更記録に書く。
4. 共通部品: src/components/ の QuestionText, 数字/文字式キーボード(Keypad系), 入力欄, ヒント枠(ToketaHint), 結果カード, ResultReview, モーダル,
   トースト, Avatar/CharBubble(吹き出し) の見た目を統一デザインに。吹き出しはセリフ体の落ち着いたデザインの切り欠き吹き出し。
5. grep で旧デザインの取りこぼしを洗い出す: 'M PLUS Rounded' 'Zen Maru' 'Nunito' 'rounded' の丸ゴシック指定、パステル色の直書き(#e0f2ff, #dbeafe, #eef 等)、
   `border-radius:999px` のピル型、`linear-gradient(135deg,#4` 系の旧グラデ、絵文字を見出しに使っている箇所。

## 仕様（既存の世界観）
黒曜石/深藍、象牙・淡金・淡シアン、見出しはセリフ体(Cinzel / Shippori Mincho / Noto Serif JP)、本文は Noto Sans JP、斜めの切り欠きボタン、金の細線。
意味色（正解=緑、不正解=赤、ヒント=琥珀など）は維持しつつ彩度を落として統一。
メニューのコマンドの「ホワンホワン(hover)/タップ拡大」演出はボタン類に適用（解答中の選択肢とバトルには入れない）。

## 守ること
- 編集は数学ラボ3フォルダ内のみ。ブランチ design-v2、コミット不要。
- 編集禁止（別セッションがメダルのサーバー化を作業中）: src/third/medals.js, thirdApi.js, link.js, problemSource.js, problemVersion.js, core.js, seeded.js,
  ThirdContext.jsx, battleEngine.js, balance.js, gaugeTime.js, growthCurve.js, expCurve.js, gachaConfig.js, specialistRoster.js, src/third/data/**,
  src/App.jsx, supabase/, scripts/, package.json, package-lock.json, docs/THIRD_SERVER.md, docs/supabase_third_setup.sql, src/data/**（問題データ）。
- ロジック・データ・props・ハンドラ・保存キー・採点・API・画面遷移は変えない。全ボタン・全機能を維持。マークアップは見た目に必要な範囲で変更してよい。
- 最後に npm run build を通し、docs/DESIGN_CHANGELOG_LEGACY_PASS2.md に、確認した全画面の一覧(統一した/触れなかった+理由)、変更ファイル、判断が必要な点を日本語で記載。
