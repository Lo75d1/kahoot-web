import { extractDocument } from "@/lib/documentExtract";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
