# 3件の依頼: (1)敵の行動時間 (2)パーティ編成のドラッグ表示バグ (3)メニューの演出と画面遷移

依頼者の評価: 「今のバトルは爽快感もテンポ感もいい。この感じを維持したまま進めたい」。
→ テンポ・爽快感を損なう変更は禁止。既存の演出/操作感は維持する。

## (1) 小単元ごとの「敵の行動までの時間」＋ 間違いでメーター半分減る
現状: src/third/balance.js に GAUGE_SECONDS=30（全単元共通）、WRONG_PENALTY_SECONDS=10。
src/third/screens/ThirdBattle.jsx が gaugeRef/gaugeSec でメーターを管理（「敵の行動まで」バー、`mw-gauge`）。
新仕様:
- **基本時間**: 「じっくり解いて2回解答できるくらい」の秒数。目安は基本45秒（1問あたり約20秒＋余裕）。
- **小単元ごとに変える**: 小単元(unit)の特性で係数を掛ける。例: 暗算で済む単元は短め(0.8倍)、
  多段の計算・図・文章題は長め(1.3〜1.6倍)。全小単元(中1〜中3、src/data/index.js の chaptersForGrade / units)を洗い出し、
  **設定表を1ファイルにまとめる**（例: src/third/gaugeTime.js。unitIdまたは単元/章単位の係数と、既定値、根拠の一言コメント）。
  未定義の小単元は基本時間。先生が後から数値を調整しやすい形にする。
- **不正解ペナルティ = メーター満タン時間の半分**（その小単元のメーター全体の50%）。現在値から引く（0未満なら敵行動）。
  ペナルティ表示「−◯秒！」も新しい値にする。
- バトル画面に現在の小単元のunitId等が渡っているか確認し、渡っていなければ ThirdBattle への受け渡しを最小限で追加する
  （link.js は編集禁止。渡し方が足りない場合は ThirdBattle 側で params から取れる範囲で対応し、無理なら報告）。
- balance.js の GAUGE_SECONDS / WRONG_PENALTY_SECONDS は「既定値」として残し、他が参照しても壊れないようにする。
- 難易度ボタン(簡単×0.6/普通×1/難しい×1.8/鬼×3)は攻撃倍率のはず。時間とは独立のままにする。確認して変えないこと。
- danger表示（残り8秒以下）は、メーター比率（例: 残り25%以下）に変える。
- 変更した数値と全小単元の係数表を変更記録に載せる。

## (2) パーティ編成: ドラッグ時に「◯」が変な位置から出るバグ
src/third/screens/PartyFormation.jsx の dragGhost（`.mw-drag-ghost`, position:fixed, left/top=clientX/Y）。
控え(bench)から編成枠へドラッグするとき、丸いゴースト(◯)がポインタと違う位置に現れる。
- 原因を特定して直す。有力: 祖先要素の transform / filter / backdrop-filter / animation(transform) / contain により
  position:fixed の基準が viewport でなくなっている（メニュー統一のCSSで発生した可能性）。
  対策: ゴーストを React Portal で document.body 直下に描画する、ポインタ座標との差を補正、ゴースト中心をポインタに合わせる(translate(-50%,-50%))。
- 控え→編成、編成→編成、編成→控えの全てで、指(ポインタ)の真下にゴーストが出て追従すること。
  ドラッグ開始時のちらつき、ページスクロール中のズレ、タッチ端末(pointer events, touch-action)も確認。
- 動作に影響するドラッグ判定ロジックは変えず、表示位置の修正に留める。

## (3) メニュー画面の演出変更と画面切り替え
- **「キラン」を廃止**: メニュー画面(ThirdMenu、単元えらび等、GameButton、タイル)にある星のきらめき/スパークル
  （例: game-btn__spark, tapSpark, タイル上の光の粒、菱形/星の点滅アニメ）を全て取り除く。
- **カーソルが重なっている(hover/focus)コマンド**: 「ホワンホワン」と大きくなったり小さくなったりするふくらみアニメ。
  約1.0〜1.2秒周期でゆるやかに scale 1.0 ↔ 1.06（イージングは柔らかく）。カーソルが外れたら滑らかに元へ。
  キーボードfocus-visibleでも同様。斜めタイルは skew を保ったまま scale する（transform の合成順に注意）。
- **タップ**: タップした瞬間にポンと大きくなる（scale 1.10程度、0.15秒で膨らみ、遷移へ）。hoverの無いタッチ端末でも動く
  （:active と pointerdown ベース。hover専用に頼らない）。
- 対象は「メニューのコマンド全般」: メインの4タイル、単元/章/小単元リスト、学ぶ/練習/バトル/ボス、設定・記録内の主要ボタン、戻るボタン。
  バトル中の選択肢ボタンには入れない（テンポと誤タップ防止）。
- **画面切り替え**: 短く気持ちいい遷移を付ける（250〜350ms以内。テンポ最優先）。
  例: 旧画面がわずかに暗転しつつ縮小フェード → 新画面が斜めのスライド/ズームで登場、細い光の帯がさっと走る、など。
  タイトル→メニュー、メニュー→サブ画面、サブ→戻る、メニュー→バトルでそれぞれ自然に。
  戻る時は逆方向。演出スピード設定(src/engine/fxSpeed.js: ふつう/はやい/オフ)に連動（オフ=即切替、はやい=半分）。prefers-reduced-motion は即切替。
  実装は各画面ルートへのCSS入場アニメ、または共通コンポーネント(例: ScreenTransition)。
  src/App.jsx は別セッションが編集中のため**原則触らない**。どうしても必要な場合のみ、画面描画部分に key 付きラッパーを
  最小行数で追加し、追加した行を変更記録に正確に書く。App.jsx以外で実現できる方法を優先。
- 「爽快感・テンポ感」を維持。遷移中に操作不能な時間を作らない（入力を溜めない/二重遷移を起こさない）。

## 守ること
- 編集は数学ラボ3フォルダ内のみ。ブランチ design-v2、コミット不要。
- 編集禁止（別セッションがメダルのサーバー化を作業中）: src/third/medals.js, thirdApi.js, link.js, problemSource.js, problemVersion.js,
  core.js, seeded.js, ThirdContext.jsx, battleEngine.js, growthCurve.js, expCurve.js, gachaConfig.js, specialistRoster.js, src/third/data/**,
  supabase/, scripts/, package.json, package-lock.json, docs/THIRD_SERVER.md, docs/supabase_third_setup.sql。
  balance.js は「既定値の維持」だけで、値の書き換えはしない。
- 上記以外のロジック（ダメージ計算・ターン進行・出題・HP・API）は変えない。全ボタン・全機能を維持。
- 最後に npm run build を通し、docs/DESIGN_CHANGELOG_TEMPO_DRAG_MENUFX.md に、(1)全小単元の時間係数表と根拠、(2)ドラッグ不具合の原因と修正、
  (3)変更した画面/部品、変更したファイルと行、判断が必要な点を日本語で記載。
