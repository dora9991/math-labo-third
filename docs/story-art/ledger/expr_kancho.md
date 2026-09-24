# 館長 表情差分

基準: `docs/story-art/base/kancho.png`。すべて透明背景・全身・1体・床影なし。生成した表情を顔領域のみ基準立ち絵に反映し、衣装・髪型・体つき・手を組むポーズ・カメラ・全身フレーミングは基準のまま固定した。

| ID | 狙い | 結果 |
| --- | --- | --- |
| `kancho_happy` | 心からの明るい、口を開いた笑顔 | 完了 |
| `kancho_sad` | 下がった眉と伏せ気味の目による、静かな悲しみ・後悔 | 完了 |
| `kancho_surprised` | 見開いた目と小さく開いた口による驚き | 完了 |
| `kancho_angry` | 眉をひそめ、まっすぐ見つめる厳しい決意 | 完了 |

検品: `docs/story-art/sheets/expr_kancho.png` に基準＋4差分を横並びで収録。全差分は生成PNGを `process_expr.py` で処理し、`src/third/assets/story/characters/kancho_<表情>.webp` に出力済み。顔以外が変わらないことを優先し、最終PNGでは生成結果の表情領域のみを基準画像に合成した。
