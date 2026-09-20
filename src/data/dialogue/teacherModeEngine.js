// ============================================================
// teacherModeEngine.js — 「教師モード」ノードグラフ(誤答駆動)を駆動するエンジン
//
//  問題DB再生成パイプライン(math-dialogue/pipeline)が1139問ぶん生成した
//  teacher_mode データを再生する。仮想生徒10人の実際の誤答から作った
//  「説明→確認クイズ→(誤答なら再説明して同じクイズに戻る)→…」の対話。
//
//  データ形状:
//   { start: "n1", nodes: [
//     { id, type:"explain", text, next },
//     { id, type:"check", question, choices:[...], correct, onCorrect, onWrong },
//   ]}
//
//  state は treeTeacher.js と同様の形（board が育つだけのシンプルな設計）。
//  判定ロジックは check ノードの choices[correct] と比較するだけ（4択ではなく2〜4択）。
// ============================================================

export function findNode(teacherMode, id) {
  if (!teacherMode || id == null) return null;
  return (teacherMode.nodes || []).find((n) => n.id === id) || null;
}

export function currentNode(teacherMode, state) {
  return findNode(teacherMode, state.nodeId);
}

// 板書は「端的に式・要点のみ」。説明の全文は右側パネル＋音声で読み上げる（画面側）。
//  node.board があればそれを板書に、無ければ node.text の要点だけを短く抜き出す。
//   要点抽出：最初の1文（。/！/？で区切る）→ さらに「〜は」「〜のは」等の前置きを落として、
//   長ければ末尾を … で丸める。式（=,+,−,×,÷ を含む句）があればそれを優先。
function concisePoint(text) {
  if (!text) return "";
  const s = String(text).trim();
  // 式を含む句があれば最優先で拾う
  const mathClause = s.split(/[。！？、]/).map((t) => t.trim()).find((t) => t && /[=＝+＋\-−×÷…]|[0-9]\s*[+\-×÷]/.test(t));
  let point = mathClause || s.split(/[。！？]/)[0].trim();
  point = point.replace(/^(まず|だから|つまり|そして|でも|ここで|大事なのは|ポイントは|今日は)、?/, "");
  if (point.length > 30) point = point.slice(0, 29) + "…";
  return point;
}

const boardLineFor = (node, kind) => {
  if (!node) return null;
  if (node.type === "explain") return { text: node.board || concisePoint(node.text), kind };
  if (node.type === "check") return { text: node.question, kind: "problem" };
  return null;
};

// 対話を開始（最初のノードを板書に載せる）
export function startTeacherMode(teacherMode) {
  const first = findNode(teacherMode, teacherMode?.start);
  const board = [];
  const line = boardLineFor(first, "work");
  if (line) board.push(line);
  return { nodeId: teacherMode?.start, board, done: false, lastCorrect: null, wrongCounts: {} };
}

// explain ノードで「次へ」を押したとき（next="end" なら終了）
export function advanceExplain(teacherMode, state) {
  const node = currentNode(teacherMode, state);
  if (!node || node.type !== "explain") return state;
  if (!node.next || node.next === "end") return { ...state, done: true };
  const next = findNode(teacherMode, node.next);
  const board = [...state.board];
  const line = boardLineFor(next, "work");
  if (line) board.push(line);
  return { ...state, nodeId: node.next, board };
}

// check ノードで選択肢(index)を選んだとき。
//  同じcheckノードで2回目の誤答をすると、無限ループ（誤答→再説明→同じcheck…）で
//  心が折れないよう、正解と理由を板書に見せてから先（onCorrect）へ進める。
//  戻り値の forcedPass=true は「この問題は理解できずに進んだ＝学び直しノートへ」の合図。
export function answerCheck(teacherMode, state, choiceIndex) {
  const node = currentNode(teacherMode, state);
  if (!node || node.type !== "check") return state;
  const correct = choiceIndex === node.correct;
  const wrongCounts = { ...(state.wrongCounts || {}) };
  const board = [...state.board, { text: String(node.choices[choiceIndex]), kind: "student" }];

  if (!correct) {
    wrongCounts[node.id] = (wrongCounts[node.id] || 0) + 1;
    if (wrongCounts[node.id] >= 2) {
      board.push({ text: `正解は「${node.choices[node.correct]}」だよ。`, kind: "result" });
      const targetId = node.onCorrect;
      if (!targetId || targetId === "end") {
        return { ...state, done: true, lastCorrect: false, board, wrongCounts, forcedPass: true };
      }
      const next = findNode(teacherMode, targetId);
      const line = boardLineFor(next, "work");
      if (line) board.push(line);
      return { ...state, nodeId: targetId, board, lastCorrect: false, wrongCounts, forcedPass: true };
    }
  }

  const targetId = correct ? node.onCorrect : node.onWrong;
  if (!targetId || targetId === "end") {
    return { ...state, done: true, lastCorrect: correct, board, wrongCounts };
  }
  const next = findNode(teacherMode, targetId);
  const line = boardLineFor(next, correct ? "result" : "work");
  if (line) board.push(line);
  return { ...state, nodeId: targetId, board, lastCorrect: correct, wrongCounts };
}
