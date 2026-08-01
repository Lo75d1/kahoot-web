import { createQuizWithAi } from "@/lib/aiQuiz";
import { createHash } from "node:crypto";
import { checkRateLimit, requestClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const clientKey = requestClientKey(request);
    const rate = checkRateLimit(`ai:${clientKey}`, 5, 10 * 60_000);
    if (!rate.allowed) {
      return Response.json(
        { error: "Bạn thao tác AI quá nhanh. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }
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
    const safetyIdentifier = createHash("sha256")
      .update(`kashot:${clientKey}`)
      .digest("hex")
      .slice(0, 64);
    return Response.json(
      await createQuizWithAi({
        source: body.source,
        mode,
        count,
        safetyIdentifier,
        apiKey: request.headers.get("x-openai-api-key") || undefined,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không tạo được đề.";
    const missingKey = message.includes("OPENAI_API_KEY");
    return Response.json(
      { error: message, code: missingKey ? "AI_NOT_CONFIGURED" : "AI_FAILED" },
      { status: missingKey ? 503 : 400 },
    );
  }
}
