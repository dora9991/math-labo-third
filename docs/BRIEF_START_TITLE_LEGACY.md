# 起動画面/タイトル演出/旧デザインの残りを全て「今の世界観」に統一

## 世界観（既に確立）
空中学園「ASTRA ACADEMY」: 黒曜石/深藍、象牙・淡金・淡シアン、セリフ体(Cinzel / Shippori Mincho / Noto Serif JP)、
斜めに切ったタイルと切り欠き形ボタン、金の細線、魔法陣/ルーン。参考にする既存実装:
- タイトル: src/screens/TitleScreen.jsx（銀メタルロゴ）と src/styles/theme.css
- メニュー: src/third/menu/ThirdMenu.jsx、src/third/third.css、src/components/GameButton.jsx、Header.jsx
- 記録: docs/DESIGN_CHANGELOG_*.md の各変更記録も読むこと
丸ゴシック・ポップ体・派手なグラデの旧デザイン（「前の数学ラボ」）は全て置き換える。

## 1. 最初のボタン画面（src/screens/StartScreen.jsx「▶ ゲームスタート」）
- 今の世界観に統一（背景は暗い星空＋魔法陣、中央に控えめな紋章/ロゴ、金縁の切り欠き形の「START」ボタン or 光る文字メニュー）。
  このボタンは音声再生解禁のための最初のタップなので必ず残す。「TAP TO START」等の英字＋日本語の小さな補足。
- オープニング映像は廃止済み（App.jsx で start→title/transfer へ直行させた。Opening.jsx とその動画は使われない。参照は残してよい）。
  Opening.jsx を触る必要はない。

## 2. タイトル画面の登場演出（src/screens/TitleScreen.jsx）
- 画面表示の瞬間**ホワイトアウト**（全面が白）から始まり、白がゆっくり引いて（約0.9〜1.2秒）空中学園の背景が現れる。
- その後、順に登場:
  ① ロゴ「MATH LABO」: 文字が光の中から結晶化するように現れる（ぼかし→くっきり、scale、上から光のスイープ、金属の反射が一度走る）＋魔法陣が回転しながら展開
  ② 「数学ラボ３」と装飾ライン: 左右から線が伸びて文字が浮かぶ
  ③ メニュー「はじめる / 遊び方 / キャラ」: 1つずつ間を置いて、光の粒が集まる/下からふわっと浮かぶように登場（スタガー）。
  最後に光がふわっと収まり、待機状態（既存のロゴの呼吸/光沢のループ）へ。
- 全体で約2.5〜3秒。**画面タップでスキップ**（即、完成状態）。演出スピード設定(src/engine/fxSpeed.js: ふつう/はやい/オフ)に連動。
  prefers-reduced-motion は白フラッシュ無し・短いフェードのみ。
- 隠しコマンド(タイトル文字の5連続タップ/長押し)・BGM開始・音量ボタンは維持。演出中でも押せる。
- ホワイトアウトが目に刺激的にならない（一瞬の強いフリッカーにしない。ゆっくり引く）。

## 3. 旧デザインが残っている画面を全て統一
以下を含め、数学ラボ3のメニューから到達できる**全画面**をコードを読んで洗い出し、旧デザインのまま残っているものを全て新世界観へ:
- **はいちモード**（src/screens/HaichiMode.jsx, HaichiStudio.jsx ほか）、動画レッスンと**確認問題**
- **れんしゅうモード**（src/screens/SlowMode.jsx。4択・ヒントつき）、StepUpSimple.jsx、StepUp.jsx、Lesson.jsx
- **ボスと対決**（Challenge.jsx）、まちがい学び直し(Relearn.jsx)、ミニテスト(UnitTest*.jsx)、診断(Diagnose.jsx)、
  ふりかえり/結果画面、Login.jsx、Transfer.jsx（引き継ぎ）、HowTo.jsx（遊び方）、Character.jsx、Items/Loadout/Shop等で
  メニューやバトルから到達できるもの
- 共通部品: 問題表示(QuestionText)、数字/文字式キーボード、入力欄、ヒント枠、正解/不正解フィードバック、進捗バー、
  結果カード、モーダル/ダイアログ、トースト、ローディング。
- 統一の中身: 背景（空中学園＋暗い帯、繰り返さない）、パネル(黒曜石＋金の細枠)、見出し(セリフ体)、
  ボタン(GameButton の切り欠き/斜め)、リスト/タブ/チップ/バッジ、色(ハート緑/赤などの意味色は維持しつつ落ち着いた彩度に)。
- 「問題を解く画面」は読みやすさ最優先: 問題文は高コントラスト・大きめ、選択肢は44px以上。派手すぎる装飾を避ける。
  数式(KaTeX/MathText)の表示は壊さない。
- メニューのコマンドの「ホワンホワン(hover)/タップ拡大」演出は、ボタン類の統一デザインに合わせて同じものを適用。
  ただしバトル中や問題解答中の選択肢には入れない。
- 統一後の見落とし確認: `.app` `.content` `.glass` `.chap-card` `.mode-card` `.lv-card` `.nb-*` など旧クラスの見た目が
  残っていないか src/styles/theme.css と各画面の inline style（旧グラデ・丸ゴシック・絵文字だらけの見出し）を grep で洗い出す。

## 守ること
- 編集は数学ラボ3フォルダ内のみ。ブランチ design-v2、コミット不要。
- 編集禁止（別セッションがメダルのサーバー化を作業中）: src/third/medals.js, thirdApi.js, link.js, problemSource.js, problemVersion.js,
  core.js, seeded.js, ThirdContext.jsx, battleEngine.js, balance.js, gaugeTime.js, growthCurve.js, expCurve.js, gachaConfig.js,
  specialistRoster.js, src/third/data/**, src/App.jsx（オープニング廃止の1行は私が編集済み。それ以外は触らない）, supabase/, scripts/,
  package.json, package-lock.json, docs/THIRD_SERVER.md, docs/supabase_third_setup.sql, src/data/**（問題データ）。
- ロジック・データ・props・ハンドラ・保存キー・採点・API・画面遷移は変えない。全ボタン・全機能を維持。見た目と構造のマークアップのみ。
- 最後に npm run build を通し、docs/DESIGN_CHANGELOG_START_TITLE_LEGACY.md に、
  洗い出した全画面の一覧(統一した/触れなかった)、変更ファイル、判断が必要な点を日本語で記載。
