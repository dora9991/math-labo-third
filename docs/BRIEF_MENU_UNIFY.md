# メニュー画面の一新 ＋ メニュー内の全画面のデザイン統一

参考画像: docs/reference-ui/ref-menu.png（斜めタイル中心のメニュー）、docs/reference-ui/ref-title.webp（重厚なロゴ）。
※ 構成と雰囲気だけ参考。原作のロゴ・アイコン・文言・素材はそのまま使わずオリジナルにする。
直前に完成したタイトル画面（src/screens/TitleScreen.jsx と src/styles/theme.css 内の title 用スタイル。
銀メタルのセリフ体ロゴ、淡いシアンの発光文字、ルーン/魔法陣、Cinzel＋Shippori Mincho/Noto Serif JP）と世界観・書体を必ず揃える。

## 依頼者の要望
- **メニュー画面を一新**（今は「幅いっぱいの角丸ピル型ボタンが4つ縦に並ぶだけ」で平凡）。
  参考(右)のように、**斜めに切った平行四辺形のタイル**、**主役を大きく**、下段に補助の小さなボタン。
- **ファンタジー要素を強く**。文字は**ポップすぎない、ちょっと大人な感じ**（セリフ体・明朝系・字間広め。丸ゴシック/太いポップ体は使わない）。
- **メニューから入る全ての画面を、同じデザイン言語に統一**する。

## 対象画面（必ず全部を洗い出して統一）
現在の構成: ThirdMenu(メイン: 学習を始める／学習の記録／パーティ編成／設定) から入る画面群:
- src/third/menu/ThirdMenu.jsx（メイン、および内部の単元えらび・メダル画面など）
- src/third/menu/RecordScreen.jsx（学習の記録）
- src/third/menu/SettingsScreen.jsx（設定）
- src/third/menu/AlarmOverlay.jsx（アラーム）
- src/third/MedalCase.jsx（メダルケース。ロジック/データは触らない。**JSXの編集は避け、CSSで装飾する**。どうしても必要なら className の追加だけ）
- src/components/UnitCycle.jsx、Header.jsx、GameButton.jsx など、メニューから使う共通部品
- パーティ編成など src/third/screens/ 配下でメニューから入る画面: DOM/CSSで見た目を触れる部分のみ統一。
  pixi.js の描画やバトル本体（src/third/fx, battleEngine 等）は触らない。触れないものは報告に書く。
- 旧 src/screens/Home.jsx は現在使われていないので触らない。

## デザイン仕様
- 共通トークンを定義（色: 黒曜石/深藍、象牙、淡金、淡シアン、アクセント(琥珀・青緑・紫・ローズ)。影、角の切り欠き、金の細線）。
- **メイン**: 上に斜めの見出しタブ（例「ASTRA ACADEMY ── 冒険の書」）。
  「学習を始める」を最大の注目タイル（金〜琥珀の縁取り＋内側の光＋ルーン紋様/魔法陣が透ける背景）、
  「学習の記録」「パーティ編成」「設定」は黒曜石質感の斜めタイル。金または単色のSVGアイコン(絵文字は使わない)。
  タイルは選択/ホバー/押下で縁が光り、光の粒が舞う。文字とアイコンは傾けない。
- **サブ画面共通**: ヘッダー（斜めタブの画面タイトル＋戻るボタンは切り欠き形）、
  パネルは「黒曜石＋金の細い枠＋角のフィリグリー」、見出しはセリフ体、通貨/レベルは金属プレート風、
  ボタンは GameButton を統一デザインに更新して全画面で使う、リスト/カード/入力/スイッチ/タブの見た目も揃える。
- 背景: 空中学園の画像（public/astral/menu-academy.png）が**縞状に繰り返し表示される不具合が現状ある**。
  background-size: cover・no-repeat・position center で1枚として表示し、暗い帯で文字を読みやすくする。遠くに魔法陣とルーンがゆっくり回る（控えめ）。
- 小中学生が読める大きさ・44px以上のタップ領域・高コントラスト。iPhone横(844x390)/iPad/PCで崩れない。prefers-reduced-motion対応。

## 守ること（重要）
- 編集は数学ラボ3フォルダ内のみ。他のフォルダは読むだけ。ブランチ design-v2 上。コミット不要。
- **別セッションが「メダルのサーバー化」を作業中**。以下は絶対に編集しない:
  src/third/medals.js, src/third/thirdApi.js, src/third/link.js, src/third/problemSource.js, src/third/problemVersion.js,
  src/third/core.js, src/third/seeded.js, src/third/ThirdContext.jsx, src/App.jsx, supabase/ 配下, scripts/ 配下,
  docs/THIRD_SERVER.md, docs/supabase_third_setup.sql, package.json, package-lock.json。
- 触ってよいのは見た目に関するファイル（上記の対象画面のJSXの見た目部分、CSS、共通UI部品、public/内の画像、フォント）。
  ロジック・データ・props・ハンドラ・保存キー・API呼び出し・条件分岐は変えない。全ボタン・全機能を維持する。
- 変更前後で挙動が変わらないこと。最後に npm run build を通し、docs/DESIGN_CHANGELOG_MENU_UNIFY.md に
  変更した画面・共通部品・触らなかったもの・判断が必要な点を日本語で記載。
