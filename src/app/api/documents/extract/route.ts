import { extractDocument } from "@/lib/documentExtract";
import { checkRateLimit, requestClientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(
      `extract:${requestClientKey(request)}`,
      20,
      10 * 60_000,
    );
    if (!rate.allowed) {
      return Response.json(
        { error: "Bạn tải tài liệu quá nhanh. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSeconds) },
        },
      );
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Thiếu tệp tải lên." }, { status: 400 });
    }
    return Response.json(await extractDocument(file));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không đọc được tài liệu.";
    return Response.json({ error: message }, { status: 400 });
  }
}
