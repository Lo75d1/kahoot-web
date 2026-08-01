import "server-only";

import { parseQuiz } from "./parser";
import type { Quiz } from "./types";

const quizSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "version", "tags", "questions"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    version: { type: "integer", const: 1 },
    tags: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type", "text", "timeLimit", "points", "answers", "explanation",
          "hint", "hintDelaySeconds", "difficulty", "topics", "status", "origin", "confidence",
          "sourceRefs",
        ],
        properties: {
          type: {
            type: "string",
            enum: [
              "single_choice", "multiple_choice", "true_false",
              "short_answer", "fill_blank", "essay",
            ],
          },
          text: { type: "string" },
          timeLimit: { type: "integer", minimum: 5, maximum: 120 },
          points: { type: "integer", minimum: 100, maximum: 5000 },
          answers: {
            type: "array",
            minItems: 0,
            maxItems: 8,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "correct"],
              properties: {
                text: { type: "string" },
                correct: { type: "boolean" },
              },
            },
          },
          explanation: { type: "string" },
          hint: { type: "string" },
          hintDelaySeconds: { type: "integer", minimum: 0, maximum: 120 },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          topics: { type: "array", items: { type: "string" } },
          status: {
            type: "string",
            enum: ["needs_review", "approved"],
          },
          origin: { type: "string", enum: ["imported", "ai_generated"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          sourceRefs: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export async function createQuizWithAi(input: {
  source: string;
  mode: "extract" | "generate" | "outline";
  count?: number;
  safetyIdentifier?: string;
  apiKey?: string;
}): Promise<Quiz> {
  return createQuizFromContent({
    ...input,
    userContent: `${buildTask(input.mode, input.count)}\n\nNGUỒN:\n${input.source.slice(0, 450_000)}`,
  });
}

export async function createQuizFromFileWithAi(input: {
  fileDataUrl: string;
  filename: string;
  mimeType: string;
  mode: "extract" | "generate" | "outline";
  count?: number;
  safetyIdentifier?: string;
  apiKey?: string;
}): Promise<Quiz> {
  const media = input.mimeType === "application/pdf"
    ? { type: "input_file" as const, filename: input.filename, file_data: input.fileDataUrl }
    : { type: "input_image" as const, image_url: input.fileDataUrl, detail: "high" as const };
  return createQuizFromContent({
    ...input,
    userContent: [
      { type: "input_text" as const, text: `${buildTask(input.mode, input.count)}\nĐọc toàn bộ nội dung nhìn thấy trong tệp. Giữ nguyên tiếng Việt và tham chiếu trang/vùng khi có thể.` },
      media,
    ],
  });
}

function buildTask(mode: "extract" | "generate" | "outline", requestedCount?: number) {
  const count = Math.min(100, Math.max(1, requestedCount ?? 20));
  return mode === "extract"
    ? "Giữ nguyên các câu hỏi và đáp án có sẵn. Không tự bịa đáp án. Nếu bằng chứng đáp án yếu, đặt status=needs_review và confidence thấp."
    : mode === "outline"
      ? "Tạo bộ câu hỏi bao phủ các ý quan trọng như một đề cương ôn tập."
      : `Tạo khoảng ${count} câu hỏi chất lượng từ tài liệu.`;
}

async function createQuizFromContent(input: {
  userContent: string | Array<Record<string, unknown>>;
  mode: "extract" | "generate" | "outline";
  count?: number;
  safetyIdentifier?: string;
  apiKey?: string;
}): Promise<Quiz> {
  const apiKey = input.apiKey?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Máy chủ chưa cấu hình OPENAI_API_KEY.");
  const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      safety_identifier: input.safetyIdentifier,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "kashot_quiz",
          strict: true,
          schema: quizSchema,
        },
      },
      input: [
        {
          role: "developer",
          content:
            "Bạn là bộ trích xuất đề thi tiếng Việt. Chỉ dùng nội dung nguồn. Mỗi câu phải có đáp án hợp lệ, lời giải ngắn, chủ đề, độ khó, độ tin cậy và tham chiếu trang/đoạn nếu có. Câu chưa chắc chắn phải needs_review.",
        },
        {
          role: "user",
          content: input.userContent,
        },
      ],
    }),
  });

  const payload = (await response.json()) as {
    output_text?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || "Dịch vụ AI chưa phản hồi.");
  }
  if (!payload.output_text) throw new Error("AI không trả về bộ đề.");
  const quiz = parseQuiz(payload.output_text);
  return {
    ...quiz,
    questions: quiz.questions.map((question) => ({
      ...question,
      status: "needs_review",
    })),
  };
}
