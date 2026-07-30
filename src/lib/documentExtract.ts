import "server-only";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_CHARS = 500_000;

export interface ExtractedDocument {
  text: string;
  kind: "text" | "pdf" | "docx";
  pages?: number;
  truncated: boolean;
}

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  if (file.size === 0) throw new Error("Tệp trống.");
  if (file.size > MAX_BYTES) throw new Error("Tệp vượt quá giới hạn 12 MB.");

  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  let kind: ExtractedDocument["kind"] = "text";
  let pages: number | undefined;

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText({
        pageJoiner: "\n\n--- Trang {page_number}/{total_number} ---\n\n",
      });
      text = result.text;
      pages = result.total;
      kind = "pdf";
    } finally {
      await parser.destroy();
    }
  } else if (
    name.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    text = result.value;
    kind = "docx";
  } else if (
    /\.(txt|csv|tsv|md)$/.test(name) ||
    file.type.startsWith("text/")
  ) {
    text = new TextDecoder("utf-8").decode(bytes);
  } else {
    throw new Error("Chưa hỗ trợ loại tệp này. Dùng PDF, DOCX, CSV hoặc TXT.");
  }

  text = text.replace(/\u0000/g, "").trim();
  if (!text) {
    throw new Error(
      "Không tìm thấy chữ trong tệp. PDF scan/ảnh cần dùng chế độ AI thị giác.",
    );
  }
  const truncated = text.length > MAX_TEXT_CHARS;
  return {
    text: truncated ? text.slice(0, MAX_TEXT_CHARS) : text,
    kind,
    pages,
    truncated,
  };
}
