// ============================================================
// make-sample-worksheet.mjs — 試作用のダミー・ワークシートPDFを作る
//  ・著作物（葉一さんのプリント）を同梱しないための「差し替え用サンプル」。
//  ・許可が取れたら public/worksheets/<unit>.pdf を本物に置き換えるだけで動く。
//  実行: node scripts/make-sample-worksheet.mjs
// ============================================================
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";

const doc = await PDFDocument.create();
const page = doc.addPage([595, 842]); // A4 (pt)
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const { width } = page.getSize();

const ink = rgb(0.12, 0.12, 0.28);
const gray = rgb(0.6, 0.6, 0.65);

page.drawText("Sample Worksheet", { x: 40, y: 790, size: 22, font: bold, color: ink });
page.drawText("Positive & Negative Numbers (replace with the licensed PDF)", { x: 40, y: 766, size: 11, font, color: gray });
page.drawText("Name: ____________________", { x: 40, y: 738, size: 12, font, color: ink });

const problems = [
  "(1)  (-3) + (+5) =",
  "(2)  (+8) - (+12) =",
  "(3)  (-7) - (-4) =",
  "(4)  (-2) x (+6) =",
  "(5)  (+20) / (-5) =",
  "(6)  (-3) x (-3) =",
  "(7)  |-9| =",
  "(8)  (-1) + (-1) + (-1) =",
  "(9)  (+15) - (-5) =",
  "(10) (-24) / (+6) =",
];
let y = 700;
for (const p of problems) {
  page.drawText(p, { x: 48, y, size: 14, font, color: ink });
  // 解答用の下線
  page.drawLine({ start: { x: 300, y: y - 2 }, end: { x: 540, y: y - 2 }, thickness: 0.8, color: gray });
  y -= 46;
}

page.drawText("* This is a placeholder. Put a worksheet you have permission to use here.", {
  x: 40, y: 60, size: 9, font, color: gray,
});

const bytes = await doc.save();
mkdirSync("public/worksheets", { recursive: true });
writeFileSync("public/worksheets/u1.pdf", bytes);
console.log("wrote public/worksheets/u1.pdf", bytes.length, "bytes");
