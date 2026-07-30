import { createQuizWithAi } from "@/lib/aiQuiz";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      source?: unknown;
      mode?: unknown;
      count?: unknown;
    };
    if (typeof body.source !== "string" || body.source.trim().length < 10) {
      return Response.json({ error: "Nội dung nguồn quá ngắn." }, { status: 400 });
    }
    if (body.source.length > 500_000) {
      return Response.json({ error: "Nội dung nguồn quá dài." }, { status: 413 });
    }
    const mode =
      body.mode === "generate" || body.mode === "outline" ? body.mode : "extract";
    const count = typeof body.count === "number" ? body.count : undefined;
    return Response.json(await createQuizWithAi({ source: body.source, mode, count }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tạo được đề.";
    const missingKey = message.includes("OPENAI_API_KEY");
    return Response.json(
      { error: message, code: missingKey ? "AI_NOT_CONFIGURED" : "AI_FAILED" },
      { status: missingKey ? 503 : 400 },
    );
  }
}
