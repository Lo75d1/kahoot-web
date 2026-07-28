// Parser "theo quy tắc": AI đọc tài liệu -> xuất QUY TẮC (nhỏ gọn) mô tả cách
// tài liệu sắp xếp; web dùng quy tắc đó parse tài liệu (chạy trên trang, không cụt token).
//
// Quy tắc là regex có "named group":
//   questionRegex  -> group (?<text>...) : nội dung câu hỏi (mỗi dòng khớp = 1 câu mới)
//   answerRegex    -> group (?<text>...) bắt buộc, (?<label>...) tuỳ chọn (A/B/C/D)
//   correctMode    -> "marker" | "key"
//     marker: dòng đáp án đúng khớp correctMarkerRegex
//     key   : trong khối câu hỏi có 1 dòng khớp correctKeyRegex -> (?<label>...) là đáp án đúng

import type { Quiz } from "./types";
import { parseQuiz } from "./parser";

export interface Rules {
  title?: string;
  description?: string;
  questionRegex: string;
  answerRegex: string;
  correctMode: "marker" | "key";
  correctMarkerRegex?: string;
  correctKeyRegex?: string;
  defaultTime?: number;
  defaultPoints?: number;
}

export const DEFAULT_RULES: Rules = {
  title: "Bộ đề",
  description: "",
  questionRegex: "^\\s*\\d+[.)]\\s*(?<text>.+)$",
  answerRegex: "^\\s*(?<label>[A-Da-d])[.)]\\s*(?<text>.+)$",
  correctMode: "key",
  correctKeyRegex: "\\u0110\\u00e1p\\s*\\u00e1n\\s*[:.]?\\s*(?<label>[A-Da-d])",
  defaultTime: 20,
  defaultPoints: 1000,
};

function re(pattern: string | undefined, where: string): RegExp | null {
  if (!pattern) return null;
  try {
    return new RegExp(pattern);
  } catch {
    throw new Error(`Quy tắc "${where}" không phải regex hợp lệ.`);
  }
}

export function parseByRules(text: string, rulesInput: string | Rules): Quiz {
  let rules: Rules;
  if (typeof rulesInput === "string") {
    try {
      rules = JSON.parse(rulesInput);
    } catch {
      throw new Error("Quy tắc không phải JSON hợp lệ.");
    }
  } else {
    rules = rulesInput;
  }

  const qRe = re(rules.questionRegex, "questionRegex");
  const aRe = re(rules.answerRegex, "answerRegex");
  if (!qRe || !aRe)
    throw new Error("Thiếu questionRegex hoặc answerRegex trong quy tắc.");
  const markerRe = re(rules.correctMarkerRegex, "correctMarkerRegex");
  const keyRe = re(rules.correctKeyRegex, "correctKeyRegex");
  const time = rules.defaultTime ?? 20;
  const points = rules.defaultPoints ?? 1000;

  const lines = text.split(/\r?\n/);
  if (lines.length > 50000) throw new Error("Tài liệu quá lớn.");

  // vị trí các dòng bắt đầu câu hỏi
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (qRe.test(l)) starts.push(i);
  });
  if (starts.length === 0)
    throw new Error("Không tìm thấy câu hỏi nào khớp questionRegex.");

  const questions = starts.map((qi, idx) => {
    const end = idx + 1 < starts.length ? starts[idx + 1] : lines.length;
    const qm = qRe.exec(lines[qi]);
    const qText = (qm?.groups?.text ?? lines[qi]).trim();

    const answers: { text: string; label?: string; correct: boolean }[] = [];
    let keyLabel: string | null = null;

    for (let j = qi + 1; j < end; j++) {
      const line = lines[j];
      if (rules.correctMode === "key" && keyRe && keyRe.test(line)) {
        keyLabel = (keyRe.exec(line)?.groups?.label ?? "").trim().toUpperCase();
        continue;
      }
      const am = aRe.exec(line);
      if (am && am.groups?.text) {
        answers.push({
          text: am.groups.text.trim(),
          label: am.groups.label?.trim().toUpperCase(),
          correct: rules.correctMode === "marker" ? !!markerRe?.test(line) : false,
        });
      }
    }

    if (rules.correctMode === "key" && keyLabel) {
      for (const a of answers) if (a.label === keyLabel) a.correct = true;
    }

    return {
      text: qText,
      timeLimit: time,
      points,
      answers: answers.map((a) => ({ text: a.text, correct: a.correct })),
    };
  });

  return parseQuiz({
    title: rules.title || undefined,
    description: rules.description ?? "",
    questions,
  });
}

/** Prompt để user đưa cho ChatGPT/Gemini kèm FILE -> AI trả về quy tắc JSON. */
export function buildRulesPrompt(): string {
  return `Tôi có một tài liệu câu hỏi trắc nghiệm (đính kèm). Hãy ĐỌC tài liệu và TRẢ VỀ DUY NHẤT một JSON "quy tắc" mô tả cách tài liệu sắp xếp, để phần mềm của tôi tự tách câu hỏi. KHÔNG trả về nội dung câu hỏi, KHÔNG giải thích, KHÔNG dùng \`\`\`.

Quy tắc dùng regex có NAMED GROUP. Cấu trúc bắt buộc:
{
  "title": "tên bộ đề (bạn tự đặt từ tài liệu)",
  "questionRegex": "regex khớp DÒNG bắt đầu câu hỏi, có (?<text>...) là nội dung câu hỏi",
  "answerRegex": "regex khớp DÒNG đáp án, có (?<text>...) là nội dung đáp án; nếu có nhãn A/B/C/D thì thêm (?<label>...)",
  "correctMode": "marker" HOẶC "key",
  "correctMarkerRegex": "(chỉ khi marker) regex; DÒNG đáp án đúng sẽ khớp cái này",
  "correctKeyRegex": "(chỉ khi key) regex khớp dòng chỉ đáp án đúng, có (?<label>...) là chữ cái đúng",
  "defaultTime": 20,
  "defaultPoints": 1000
}

Quy tắc chọn correctMode:
- Dùng "key" nếu đáp án đúng được ghi riêng (VD dòng "Đáp án: B", hoặc bảng đáp án). correctKeyRegex bắt chữ cái đúng.
- Dùng "marker" nếu đáp án đúng được đánh dấu ngay tại đáp án (in đậm/gạch chân thường mất khi copy — hãy dựa vào ký tự thấy được như *, (Đ), ✓...). correctMarkerRegex khớp dòng đó.

Yêu cầu:
- Regex phải khớp ĐÚNG định dạng THỰC TẾ trong tài liệu (xem vài câu đầu để suy ra).
- Nhớ escape dấu \\ đúng chuẩn JSON (VD \\d, \\s).
- Chỉ in JSON, bắt đầu bằng { kết thúc bằng }.`;
}
