// Tạo prompt chuẩn cho AI ngoài + bóc JSON từ kết quả AI trả về.

export interface AiConfig {
  source: string; // chủ đề hoặc tài liệu dán vào
  count: number; // số câu
  answers: number; // số đáp án mỗi câu
  difficulty: string; // dễ | trung bình | khó
  language: string;
  timeLimit: number;
  points: number;
  notes: string;
}

export function buildPrompt(c: AiConfig): string {
  const lang = c.language || "Tiếng Việt";
  return `Bạn là công cụ tạo bộ câu hỏi trắc nghiệm. Hãy tạo một bộ đề theo yêu cầu bên dưới và TRẢ VỀ DUY NHẤT một JSON hợp lệ đúng cấu trúc, KHÔNG kèm giải thích, KHÔNG dùng dấu \`\`\`.

# Yêu cầu
- Ngôn ngữ: ${lang}
- Số câu hỏi: đúng ${c.count} câu
- Mỗi câu có ${c.answers} đáp án, CHỈ 1 đáp án đúng (correct: true), còn lại correct: false
- Độ khó: ${c.difficulty}
- timeLimit = ${c.timeLimit} (giây) và points = ${c.points} cho mỗi câu
${c.notes ? `- Ghi chú thêm: ${c.notes}\n` : ""}
# Nguồn nội dung / chủ đề
${c.source}

# Cấu trúc JSON bắt buộc
{
  "title": "tên bộ đề ngắn gọn",
  "description": "mô tả 1 dòng",
  "questions": [
    {
      "text": "nội dung câu hỏi?",
      "timeLimit": ${c.timeLimit},
      "points": ${c.points},
      "answers": [
        { "text": "đáp án A", "correct": true },
        { "text": "đáp án B", "correct": false }
      ]
    }
  ]
}

# Quy tắc bắt buộc
- Trả về JSON thuần: bắt đầu bằng { và kết thúc bằng }.
- Mảng "questions" có đúng ${c.count} phần tử.
- Mỗi "answers" có đúng ${c.answers} phần tử, đúng 1 phần tử correct=true.
- Câu hỏi & đáp án chính xác, rõ ràng, phù hợp độ khó "${c.difficulty}".`;
}

/** Bóc JSON ra khỏi kết quả AI (bỏ ```json fences, chữ thừa quanh JSON). */
export function extractJson(text: string): string {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return t;
}
