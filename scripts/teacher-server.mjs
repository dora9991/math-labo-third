// ============================================================
// teacher-server.mjs — AI先生の中継サーバー（ローカル用）
//
// なぜ必要？ APIキーはブラウザ（公開サイト）に置けない。
// このNodeサーバーがキーを持ち、ブラウザの代わりにClaudeを呼ぶ。
//
// 起動： npm run teacher       （事前に .env.local に APIキーを書く）
// 公開時はこの中身を Cloudflare Workers / Supabase Edge Function に移植する。
//
// 発問モデル（核心は言わない／まず反応→半歩先の問い／詰まったら補助発問）は
// 下の SYSTEM プロンプトに全部書いてある。ここがこの授業の“先生”の頭脳。
// 生徒の手書きは画像としてClaudeに渡す（vision）＝本当に読み取って反応する。
// ============================================================
import { createServer } from "node:http";
import Anthropic from "@anthropic-ai/sdk";

const PORT = process.env.TEACHER_PORT || 8787;
const MODEL = "claude-opus-4-8"; // コスト/速度を優先するなら "claude-sonnet-4-6" / "claude-haiku-4-5" に変更可
const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

const SYSTEM = `あなたは中学1年生に数学を教える、経験豊富で温かい先生です。生徒は今、ある課題に取り組んでいます。
あなたの仕事は「教えること」ではなく「問いかけて、生徒自身に考えさせること」です。

# 絶対のルール
1. 答えや核心（式変形の結果・結論）を、あなたから先に言ってはいけません。必ず生徒自身に言わせます。
2. 生徒が何か答えるたびに、まず短い感情的な反応を返します。例:「なるほど！」「いいね！」「おお、するどい！」「惜しい！」「その発想いいね」「うんうん」。
   そのあとで、次の“半歩先”の問いを一つだけ出します。
3. 一度に出す問いは一つだけ。長く説明しない。1〜3文で、中1に伝わるやさしい言葉で。
4. 生徒が詰まったり間違えたら、もっと小さな問い（補助発問）に降ります。すでに習ったこととつなげます（例:「前にやった〇〇、使えないかな？」）。間違いは否定せず「その考えでいくとどうなる？」と前に進める材料にします。
5. 定義・約束事・記号など『覚えるしかないこと』は、問いかけずに普通に教えてかまいません。
6. 生徒が正解しても、ときどき軽くゆさぶります（「本当に？ 数が変わってもそう言える？」）。
7. つねに「ねらい（ゴール）」に向かって一歩ずつ導きます。ゴールに到達したと判断したら done=true にして、温かくひとことでまとめます。

# 手書きについて
生徒が手書きの画像を見せてきたら、その内容をしっかり読み取り、具体的に反応してください（「この式の3を引いたところ、いいね」など）。読み取れない場合は「ここ、もう一度書いてみてくれる？」とやさしく聞き返します。

# 出力（必ずこのJSON形式）
- reaction: 最初の短い感情的反応（例「なるほど！」「惜しい！」）。1フレーズ。
- message: そのあとの問いかけ本体（reactionは含めない）。1〜3文。
- board_add: 黒板に書き残す価値がある短い一行があれば書く（式や要点。なければ空文字 ""）。生徒が言った答えを板書するイメージ。
- done: 今日のねらいを達成したら true、まだなら false。`;

const SCHEMA = {
  type: "object",
  properties: {
    reaction: { type: "string" },
    message: { type: "string" },
    board_add: { type: "string" },
    done: { type: "boolean" },
  },
  required: ["reaction", "message", "board_add", "done"],
  additionalProperties: false,
};

// ブラウザ(別オリジン)から呼べるようにCORSを許可
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
}

// 生徒の1ターンを、Claudeへの user メッセージ（テキスト＋手書き画像）に組み立てる
function buildUserContent(d) {
  const lesson = d.lesson || {};
  const board = (d.board || []).join("\n") || "（まだ何も書かれていない）";
  const history = (d.history || [])
    .map((m) => (m.role === "teacher" ? "先生" : "生徒") + "：" + m.text)
    .join("\n") || "（まだやりとりなし）";
  const latest = d.studentImage
    ? "（生徒が手書きで考えを見せました。画像を読み取って反応してください）"
    : "生徒の答え：" + (d.studentText || "");

  // 発問の木（指導案）があれば、中心発問・期待される答え・想定誤答・補助発問を渡す
  let planText = "";
  if (d.plan && Array.isArray(d.plan.central) && d.plan.central.length) {
    const steps = d.plan.central.map((c, i) => {
      const mis = (c.misconceptions || []).map((m) => `${m.wrong}（誤概念:${m.concept}）`).join(" / ");
      const aids = (c.aids || []).map((a) => `${a.step}:${a.prompt}${a.choices ? "［" + a.choices.join("/") + "］" : ""}`).join(" → ");
      return `中心発問${i + 1}: ${c.prompt}\n  期待: ${(c.expected || []).join(" / ")}\n  飛ばし条件: ${c.skipIf || "なし"}\n  想定誤答: ${mis || "なし"}\n  補助発問(階段): ${aids || "なし"}`;
    }).join("\n");
    planText =
      `\n\n【この授業の指導案（あなたの発問の木。これに沿って進める）】\n${steps}\n` +
      `※生徒の答えを「期待」と照らして判定し、reactionで率直に返す（合えば「正解！」、近ければ「惜しい！」）。` +
      `つまずいたら「補助発問(階段)」を上から1段ずつ降ろす。できている子は「飛ばし条件」で次の中心発問へ飛ばす。`;
  }

  const text =
    `【単元】${lesson.shosetsu || ""}\n` +
    `【今日の課題（生徒に出した発問）】${lesson.hatsumon || ""}\n` +
    `【ねらい（あなたが導くゴール）】${lesson.nerai || ""}\n` +
    planText + `\n\n` +
    `【黒板の現在の状態】\n${board}\n\n` +
    `【これまでのやりとり】\n${history}\n\n` +
    `【今の場面】\n${latest}`;

  const content = [{ type: "text", text }];
  if (d.studentImage) {
    const m = String(d.studentImage).match(/^data:(image\/\w+);base64,(.+)$/s);
    if (m) content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
  }
  return content;
}

createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // 健康チェック：キーが無ければ ok:false を返し、ブラウザは台本モードに自動フォールバック
  if (req.method === "GET" && req.url === "/health") {
    const ok = !!process.env.ANTHROPIC_API_KEY;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok, model: ok ? MODEL : null }));
    return;
  }

  if (req.method !== "POST") { res.writeHead(404); res.end(); return; }

  let body = "";
  for await (const chunk of req) body += chunk;
  let data;
  try { data = JSON.parse(body); } catch { res.writeHead(400); res.end('{"error":"bad json"}'); return; }

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserContent(data) }],
    });
    const textBlock = msg.content.find((b) => b.type === "text");
    const out = JSON.parse(textBlock?.text || "{}");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(out));
  } catch (e) {
    console.error("Claude呼び出しエラー:", e?.message || e);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
}).listen(PORT, () => {
  const keyed = !!process.env.ANTHROPIC_API_KEY;
  console.log(`🧑‍🏫 AI先生リレー起動: http://localhost:${PORT}  model=${MODEL}`);
  if (!keyed) console.log("⚠️  ANTHROPIC_API_KEY が未設定です。.env.local に書いて再起動してください（今は台本モードにフォールバックします）。");
});
