// Chuyển tài liệu câu hỏi (định dạng chữ ngắn) -> JSON bộ đề cho kahoot-web.
//
// Cách dùng:
//   node convert_to_quiz.mjs de.txt            # in ra màn hình
//   node convert_to_quiz.mjs de.txt de.json    # ghi ra file de.json
//
// Định dạng nguồn & quy tắc: xem convert_to_quiz.py (giống hệt).

import { readFileSync, writeFileSync } from "fs";

const DEFAULT_TIME = 20; // giây / câu
const DEFAULT_POINTS = 1000; // điểm / câu

function parse(text) {
  let title = "Bộ đề không tên";
  let description = "";
  const questions = [];
  let cur = null;

  const flush = () => {
    if (cur) questions.push(cur);
  };

  const lines = text.split(/\r?\n/);
  lines.forEach((raw, idx) => {
    const lineno = idx + 1;
    const line = raw.trim();
    if (!line) return;

    if (line.startsWith("#")) {
      title = line.replace(/^#+/, "").trim() || title;
      return;
    }
    if (line.startsWith(">")) {
      description = line.replace(/^>+/, "").trim();
      return;
    }

    if ("*+-".includes(line[0])) {
      if (!cur) throw new Error(`Dòng ${lineno}: đáp án nhưng chưa có câu hỏi.`);
      const correct = line[0] === "*" || line[0] === "+";
      const atext = line.slice(1).trim();
      if (!atext) throw new Error(`Dòng ${lineno}: đáp án rỗng.`);
      cur.answers.push({ text: atext, correct });
      return;
    }

    // câu hỏi mới
    flush();
    let time = DEFAULT_TIME;
    let points = DEFAULT_POINTS;
    const t = line.match(/\[time=(\d+)\]/);
    if (t) time = Number(t[1]);
    const p = line.match(/\[points=(\d+)\]/);
    if (p) points = Number(p[1]);
    const qtext = line.replace(/\[(time|points)=\d+\]/g, "").trim();
    cur = { text: qtext, timeLimit: time, points, answers: [] };
  });

  flush();

  if (questions.length === 0) throw new Error("Không tìm thấy câu hỏi nào.");
  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.text) throw new Error(`Câu ${n}: thiếu nội dung.`);
    if (q.answers.length < 2)
      throw new Error(`Câu ${n} ('${q.text.slice(0, 30)}'): cần ít nhất 2 đáp án.`);
    if (!q.answers.some((a) => a.correct))
      throw new Error(`Câu ${n} ('${q.text.slice(0, 30)}'): chưa đánh dấu đáp án đúng (dùng *).`);
  });

  return { title, description, questions };
}

const [, , src, out] = process.argv;
if (!src) {
  console.error("Dùng: node convert_to_quiz.mjs <nguồn.txt> [ra.json]");
  process.exit(1);
}

const quiz = parse(readFileSync(src, "utf8"));
const json = JSON.stringify(quiz, null, 2);
if (out) {
  writeFileSync(out, json, "utf8");
  console.log(`✓ Đã ghi ${out} — ${quiz.questions.length} câu.`);
} else {
  console.log(json);
}
