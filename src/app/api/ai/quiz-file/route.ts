import { createHash } from "node:crypto";
import { createQuizFromFileWithAi } from "@/lib/aiQuiz";
import { checkRateLimit, requestClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const clientKey = requestClientKey(request);
    const rate = checkRateLimit(`ai-file:${clientKey}`, 3, 10 * 60_000);
    if (!rate.allowed) {
      return Response.json({ error: "Bạn thao tác AI quá nhanh. Vui lòng thử lại sau." }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Chưa có tệp để xử lý." }, { status: 400 });
    if (!ALLOWED.has(file.type)) return Response.json({ error: "AI chỉ nhận PDF, PNG, JPG, WEBP hoặc GIF." }, { status: 415 });
    if (file.size === 0 || file.size > MAX_BYTES) return Response.json({ error: "Tệp phải nhỏ hơn 12 MB." }, { status: 413 });
    const rawMode = form.get("mode");
    const mode = rawMode === "generate" || rawMode === "outline" ? rawMode : "extract";
    const rawCount = Number(form.get("count"));
    const safetyIdentifier = createHash("sha256").update(`kashot:${clientKey}`).digest("hex").slice(0, 64);
    const bytes = Buffer.from(await file.arrayBuffer());
    return Response.json(await createQuizFromFileWithAi({
      fileDataUrl: `data:${file.type};base64,${bytes.toString("base64")}`,
      filename: file.name,
      mimeType: file.type,
      mode,
      count: Number.isFinite(rawCount) ? rawCount : undefined,
      safetyIdentifier,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không xử lý được tệp.";
    const missingKey = message.includes("OPENAI_API_KEY");
    return Response.json({ error: message, code: missingKey ? "AI_NOT_CONFIGURED" : "AI_FAILED" }, {
      status: missingKey ? 503 : 400,
    });
  }
}
