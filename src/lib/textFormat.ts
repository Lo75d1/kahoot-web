// Parse tài liệu -> Quiz, chạy ngay trên trang (không cần AI/server).
// Hai định dạng: "đánh dấu" (* đúng / - sai) và CSV/Excel.
// Cả hai đều đi qua parseQuiz() để kiểm tra hợp lệ + báo lỗi thống nhất.

import type { Quiz } from "./types";
import { parseQuiz } from "./parser";

const DEFAULT_TIME = 20;
const DEFAULT_POINTS = 1000;

interface RawQ {
  text: string;
  timeLimit: number;
  points: number;
  answers: { text: string; correct: boolean }[];
}

/** Định dạng đánh dấu: #tên, >mô tả, * đúng, - sai, [time=..][points=..] */
export function parseMarkerText(text: string): Quiz {
  let title = "";
  let description = "";
  const questions: RawQ[] = [];
  let cur: RawQ | null = null;
  const flush = () => {
    if (cur) questions.push(cur);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      title = line.replace(/^#+/, "").trim();
      continue;
    }
    if (line.startsWith(">")) {
      description = line.replace(/^>+/, "").trim();
      continue;
    }
    if (line[0] === "*" || line[0] === "+" || line[0] === "-") {
      if (!cur)
        throw new Error("Có đáp án trước khi có câu hỏi — kiểm tra định dạng.");
      cur.answers.push({
        text: line.slice(1).trim(),
        correct: line[0] !== "-",
      });
      continue;
    }

    // câu hỏi mới
    flush();
    let time = DEFAULT_TIME;
    let points = DEFAULT_POINTS;
    const t = line.match(/\[time=(\d+)\]/);
    if (t) time = Number(t[1]);
    const p = line.match(/\[points=(\d+)\]/);
    if (p) points = Number(p[1]);
    cur = {
      text: line.replace(/\[(time|points)=\d+\]/g, "").trim(),
      timeLimit: time,
      points,
      answers: [],
    };
  }
  flush();

  return parseQuiz({ title: title || undefined, description, questions });
}

/** Tách CSV có xử lý ô trong ngoặc kép. */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuote = false;
      } else field += c;
    } else if (c === '"') inQuote = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const LETTER: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, "1": 0, "2": 1, "3": 2, "4": 3,
};

/**
 * CSV/Excel. Mỗi dòng: cột đầu = câu hỏi, các cột sau = đáp án.
 * Đánh dấu đáp án đúng theo 1 trong 2 cách:
 *   - ô đáp án đúng bắt đầu bằng dấu *  (VD: *Hà Nội)
 *   - HOẶC cột cuối là chữ cái đáp án đúng: A/B/C/D (hoặc 1-4)
 */
export function parseCsv(text: string): Quiz {
  const rows = splitCsv(text);
  if (rows.length === 0) throw new Error("CSV trống.");

  // Bỏ dòng tiêu đề nếu có
  const head = rows[0].map((x) => x.toLowerCase());
  const start = head.some(
    (x) => x.includes("câu hỏi") || x.includes("cau hoi") || x.includes("question"),
  )
    ? 1
    : 0;

  const questions: RawQ[] = rows.slice(start).map((cells) => {
    const qtext = (cells[0] || "").trim();
    let answers = cells.slice(1).map((c) => c.trim());
    let correctIdx = answers.findIndex((c) => c.startsWith("*") || c.startsWith("+"));

    if (correctIdx >= 0) {
      answers = answers.map((c) => c.replace(/^[*+]\s*/, ""));
    } else {
      const last = (answers[answers.length - 1] || "").toUpperCase();
      if (last in LETTER) {
        correctIdx = LETTER[last];
        answers = answers.slice(0, -1);
      }
    }
    while (answers.length && answers[answers.length - 1] === "") answers.pop();

    return {
      text: qtext,
      timeLimit: DEFAULT_TIME,
      points: DEFAULT_POINTS,
      answers: answers.map((t, i) => ({ text: t, correct: i === correctIdx })),
    };
  });

  return parseQuiz({ title: "Bộ đề từ CSV", description: "", questions });
}
