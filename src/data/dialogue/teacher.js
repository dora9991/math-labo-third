// ============================================================
// teacher.js — 対話授業の「AI先生」エンジン（試作）
//
// 設計思想：先生の発問モデルをそのままコード化する。
//   レベル0：本発問（核心は言わない・次の一段へ）
//   レベル1〜：補助発問（スモールステップ。詰まったら降りる）
//   最後：定義・説明は普通に教える（reveal）
//
// いまは台本ベースの決定論エンジン。将来 askTeacher() の中身を
// Claude API 呼び出しに差し替えれば、同じ画面のまま本物のAIになる。
// （画面は engine が返す {say, board, done} だけを見ているので疎結合）
// ============================================================

// ── 答え合わせのヘルパー ──────────────────────────────
const Z2H = (s) =>
  String(s ?? "")
    .replace(/[０-９]/g, (c) => "0123456789"[c.charCodeAt(0) - 0xff10])
    .replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));

// 文中から最初の整数を取り出して数値一致を見る（「16本」「16ぼん」等も拾う）
export function numEq(input, target) {
  const m = Z2H(input).match(/-?\d+/);
  if (!m) return false;
  return Number(m[0]) === target;
}

// 式の正規化（空白・×・･・カッコ全角などを吸収して候補集合と照合）
function normExpr(s) {
  return Z2H(s)
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/[×✕✖*・]/g, "*")
    .replace(/[（）]/g, (c) => (c === "（" ? "(" : ")"))
    .replace(/[＋]/g, "+")
    .replace(/[－ー−]/g, "-")
    .replace(/本|個|まい|枚|です|だよ|かな|と思う/g, "");
}
export function exprIn(input, candidates) {
  const n = normExpr(input);
  return candidates.some((c) => n.includes(normExpr(c)));
}

// 「わからない／ヒント／ギブ」系か？（＝補助発問を出してほしい合図）
export function isGiveUp(input) {
  return /わからない|わかんない|ヒント|教えて|むずかしい|難しい|ギブ|？$|^\?$/.test(
    Z2H(input).trim()
  );
}

// ── レッスン台本 ───────────────────────────────────────
// step は次のどちらか：
//  { ask, boardOnAsk?, accept(input), onCorrect:{say, board?}, hints:[..], reveal:{say, board?} }
//  { say, board? }  … 先生が説明するだけ（定義など）。入力を待たずに「次へ」で進む
//
// board 行: { text, kind: 'problem'|'work'|'student'|'result'|'goal', mark? }

export const SCRIPTED = {
  // ★ 看板レッスン：マッチ棒（文字式の必要性）
  "c2-1": {
    // 導入の語り（問題を提示するまで）。このあと自分で考える時間に入る。
    intro:
      "今日はマッチ棒で正方形をつくっていくよ。図を見てね。マッチ棒を並べて、正方形を横にずらっとつなげていく。",
    // 自分で考えるときに黒板に出しておく「本問題」
    problem: "正方形が5個のとき、マッチ棒は何本いるだろう？",
    board: [
      { text: "【問題】マッチ棒で正方形をならべる", kind: "problem" },
      { text: "正方形が5個のとき、マッチ棒は何本？", kind: "problem" },
    ],
    steps: [
      {
        ask: "まず、正方形を1個つくるのに、マッチ棒は何本いるかな？",
        accept: (i) => numEq(i, 4),
        onCorrect: { say: "そう、4本！ いいスタートだね。", board: { text: "正方形1個 … 4本", kind: "work" } },
        hints: [
          "正方形って、辺は何本あったかな？",
          "正方形は4つの辺でできているね。辺1本にマッチ棒1本だよ。",
        ],
        reveal: { say: "正方形は4辺だから、マッチ棒は4本だね。", board: { text: "正方形1個 … 4本", kind: "work" } },
      },
      {
        ask: "じゃあ2個めをつくるとき、新しく何本たせばいい？（全部数え直さないでね）",
        boardOnAsk: { text: "□□ ← 2個めをくっつける", kind: "problem" },
        accept: (i) => numEq(i, 3),
        onCorrect: { say: "するどい！ 3本だね。1本は前の正方形と共有できる。", board: { text: "2個めから … +3本ずつ", kind: "work" } },
        hints: [
          "2個めの正方形、4本いる？ となりの正方形と重なっている辺はない？",
          "左の1辺はもうあるよね。だから新しくいるのは…何本？",
        ],
        reveal: { say: "となりと1辺を共有するから、増えるのは3本ずつなんだ。", board: { text: "2個めから … +3本ずつ", kind: "work" } },
      },
      {
        ask: "ここまでをまとめると、正方形5個だと全部で何本になる？",
        accept: (i) => numEq(i, 16),
        onCorrect: { say: "正解、16本！ ちゃんと数えずに出せたね。", board: { text: "5個 → 4 + 3×4 = 16本", kind: "result", mark: "◎" } },
        hints: [
          "最初の4本＋（3本ずつ）だね。3本を何回たす？",
          "正方形は5個。1個めは4本、残り4個ぶんが3本ずつ。式にすると 4 + 3×□ の□は？",
        ],
        reveal: { say: "4 + 3×4 = 16本。最初の1個が4本、残り4個が3本ずつだね。", board: { text: "5個 → 4 + 3×4 = 16本", kind: "result", mark: "◎" } },
      },
      {
        ask: "ここが今日のクライマックス。正方形を x 個にしたら、マッチ棒は何本？ 式で表してみよう。",
        boardOnAsk: { text: "正方形 x 個 → ？本", kind: "problem" },
        accept: (i) => exprIn(i, ["3x+1", "4+3(x-1)", "1+3x", "x*3+1", "3*x+1"]),
        onCorrect: {
          say: "すごい！ それで全部の場合が1つの式で言える。これが文字を使うよさだね。",
          board: { text: "x 個 → 3x + 1（本）", kind: "result", mark: "★" },
        },
        hints: [
          "5個のときは 4 + 3×4 だったね。この『4』は、5とくらべて何が違う？",
          "『3をかける回数』は、正方形の数より1少なかった。x 個なら何回？ → (x−1) 回。",
          "4 + 3×(x−1) を整理すると？ かっこを外してごらん。",
        ],
        reveal: {
          say: "4 + 3(x−1) = 3x + 1。x にどんな数を入れても本数が出せる、魔法の式だね。",
          board: { text: "x 個 → 3x + 1（本）", kind: "result", mark: "★" },
        },
      },
    ],
    outro:
      "今日のゴールは『数量を文字で表すよさを知る』ことだったね。バラバラの数を1本の式にまとめられた——これが文字のちから。よくがんばった！",
    goalBoard: { text: "まとめ：場合の数を 3x+1 のように文字で表せる", kind: "goal" },
  },
};

// ── エンジン本体 ───────────────────────────────────────
// 画面が使う関数：startLesson / respond（文字・音声）/ showWork（手書きを見せる）
// 中身を将来 Claude API に差し替えてもOK（画面は state の {messages, board, phase, done} だけ見る）。

// 「まず自分で考えてみよう」の誘い文句（手書き提出を促す）
const SELF_THINK =
  "この問題について、少し時間をとるよ。まずは自分で考えてみよう！ 数えてもいいし、図をかいてもいい。" +
  "考えがまとまったら、下のノートに手書きで書いて、「✏️ 見せる」で先生に見せてね。";

// 手書き／考えを見せてくれたあとの受け止め（ここから一緒に確認＝補助発問へ）
const ACK_WORK =
  "見せてくれてありがとう！ じっくり考えた跡があるね。いいぞ。じゃあ、ここから一緒に確かめていこう。";

export function startLesson(lesson) {
  const script = SCRIPTED[lesson.id];
  if (script) {
    return {
      mode: "scripted",
      lessonId: lesson.id,
      phase: "think",       // think（自分で考える）→ guided（補助発問）→ done
      stepIndex: 0,
      hintIndex: 0,
      board: [...script.board],
      // 問題提示 → 自分で考える時間。発問の核心はまだ言わない。
      messages: [{ who: "teacher", text: script.intro + "\n\n" + script.problem + "\n\n" + SELF_THINK }],
    };
  }
  // 台本がないレッスン：発問を提示 → 自分で考える → 軽く対話する汎用モード
  return {
    mode: "generic",
    lessonId: lesson.id,
    phase: "think",
    turn: 0,
    board: [{ text: lesson.hatsumon, kind: "problem" }],
    messages: [{ who: "teacher", text: lesson.hatsumon + "\n\n" + SELF_THINK }],
  };
}

// 手書き（または「考えを見せる」）を受け取る。dataUrl は手書き画像、無ければ省略可。
export function showWork(state, lesson, dataUrl) {
  const board = [...state.board];
  if (dataUrl) board.push({ image: dataUrl, kind: "student", label: "あなたの考え" });
  const messages = [...state.messages, { who: "student", text: "（手書きを見せた）", image: dataUrl }];

  // まだ「自分で考える」段階なら、受け止めて補助発問フェーズへ進む
  if (state.phase === "think") {
    messages.push({ who: "teacher", text: ACK_WORK });
    if (state.mode === "generic") {
      return { ...state, phase: "talk", board, messages };
    }
    return enterFirstStep(state, lesson, board, messages);
  }
  // 途中（guided/talk）に見せてくれたとき＝スクラッチとして受け止めるだけ（進行は文字の答えで）
  messages.push({ who: "teacher", text: "なるほど、書いてくれたんだね。その調子。続きを言葉でも教えて。" });
  return { ...state, board, messages };
}

// think → guided：最初の補助発問を提示する
function enterFirstStep(state, lesson, board, messages) {
  const script = SCRIPTED[lesson.id];
  const first = script.steps[0];
  const b = [...board];
  if (first.boardOnAsk) b.push({ ...first.boardOnAsk });
  messages.push({ who: "teacher", text: first.ask });
  return { ...state, phase: "guided", stepIndex: 0, hintIndex: 0, board: b, messages };
}

// 生徒の入力を処理して、新しい state を返す
export function respond(state, lesson, input) {
  if (state.mode === "generic") return respondGeneric(state, lesson, input);

  // 「自分で考える」段階で文字でも答えてきたら、見せてくれたものとして受け止め補助発問へ
  if (state.phase === "think") {
    const board = [...state.board, { text: "あなたの考え：" + input.slice(0, 28), kind: "student" }];
    const messages = [...state.messages, { who: "student", text: input }, { who: "teacher", text: ACK_WORK }];
    return enterFirstStep(state, lesson, board, messages);
  }

  const script = SCRIPTED[lesson.id];
  const step = script.steps[state.stepIndex];
  const board = [...state.board];
  const messages = [...state.messages, { who: "student", text: input }];

  const giveUp = isGiveUp(input);
  const correct = !giveUp && step.accept(input);

  if (correct) {
    if (step.onCorrect.board) board.push({ ...step.onCorrect.board, student: true });
    messages.push({ who: "teacher", text: step.onCorrect.say });
    return advance(state, lesson, script, board, messages);
  }

  // 不正解 or わからない → 補助発問（スモールステップ）を1つ降ろす
  if (state.hintIndex < step.hints.length) {
    messages.push({ who: "teacher", text: "（補助）" + step.hints[state.hintIndex] });
    return { ...state, board, messages, hintIndex: state.hintIndex + 1 };
  }

  // 補助発問も尽きた → ここは説明する（定義・結論は教える）
  if (step.reveal.board) board.push({ ...step.reveal.board });
  messages.push({ who: "teacher", text: step.reveal.say });
  return advance(state, lesson, script, board, messages);
}

function advance(state, lesson, script, board, messages) {
  const nextIndex = state.stepIndex + 1;
  const next = script.steps[nextIndex];
  if (next) {
    if (next.boardOnAsk) board.push({ ...next.boardOnAsk });
    messages.push({ who: "teacher", text: next.ask });
    return { ...state, stepIndex: nextIndex, hintIndex: 0, board, messages, pendingAsk: false };
  }
  // 最後まで到達 → まとめ
  if (script.goalBoard) board.push({ ...script.goalBoard });
  messages.push({ who: "teacher", text: script.outro });
  return { ...state, stepIndex: nextIndex, board, messages, done: true };
}

// 汎用モード（台本なし）：ねらいを羅針盤に、軽い往復で締める
function respondGeneric(state, lesson, input) {
  const board = [...state.board];
  const messages = [...state.messages, { who: "student", text: input }];
  // 「自分で考える」段階で文字で答えてきた → 受け止めて対話へ
  if (state.phase === "think") {
    board.push({ text: "あなたの考え：" + input.slice(0, 28), kind: "student" });
    messages.push({ who: "teacher", text: ACK_WORK + " なぜそうなると思う？ 根拠も言えるかな？" });
    return { ...state, phase: "talk", turn: 1, board, messages };
  }
  const turn = (state.turn || 0) + 1;
  if (turn === 1) {
    board.push({ text: "きみの考え：" + input.slice(0, 24), kind: "student" });
    messages.push({
      who: "teacher",
      text: "なるほど、その見方いいね。もう一歩——なぜそうなると思う？ 根拠も言えるかな？",
    });
    return { ...state, board, messages, turn };
  }
  // まとめ（このレッスンのねらいを学習のゴールとして提示）
  const nerai = (lesson.nerai || "").split("／")[0];
  board.push({ text: "今日のゴール：" + nerai, kind: "goal" });
  messages.push({
    who: "teacher",
    text: "いい対話だったね。今日のねらいは『" + nerai + "』。きみの考えはそこにつながっているよ。",
  });
  return { ...state, board, messages, turn, done: true };
}

// この問題で「対話レッスン」が作り込まれているか（picker表示用）
export const isScripted = (id) => !!SCRIPTED[id];
