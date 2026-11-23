/* API de conversão MD → ABNT / Relatório Técnico (DOCX / PDF) */
import { parseMarkdown } from "@/lib/abnt/parse";
import { DEFAULT_SETTINGS, type AbntSettings } from "@/lib/abnt/types";
import { buildDocxBlob } from "@/lib/abnt/docx";
import { buildReportDocxBlob } from "@/lib/abnt/docx-report";
import { buildPdfBuffer } from "@/lib/abnt/pdf";
import { buildReportPdfBuffer } from "@/lib/abnt/pdf-report";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ConvertBody {
  markdown?: string;
  settings?: Partial<AbntSettings>;
  format?: "docx" | "pdf";
}

function sanitizeFileName(name: string): string {
  const clean = (name || "documento-abnt")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return clean || "documento-abnt";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConvertBody;
    const markdown = body.markdown ?? "";
    const settings: AbntSettings = {
      ...DEFAULT_SETTINGS,
      ...(body.settings ?? {}),
      toggles: { ...DEFAULT_SETTINGS.toggles, ...(body.settings?.toggles ?? {}) },
      report: { ...DEFAULT_SETTINGS.report, ...(body.settings?.report ?? {}) },
    };
    const format = body.format === "pdf" ? "pdf" : "docx";

    if (!markdown.trim()) {
      return Response.json({ error: "Informe o conteúdo em Markdown." }, { status: 400 });
    }

    const doc = parseMarkdown(markdown, settings);
    const base = sanitizeFileName(doc.settings.fileName);

    if (format === "pdf") {
      const buf = settings.style === "relatorio" ? await buildReportPdfBuffer(doc) : await buildPdfBuffer(doc);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${base}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buf = settings.style === "relatorio" ? await buildReportDocxBlob(doc) : await buildDocxBlob(doc);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${base}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[convert] erro:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha ao converter o documento." },
      { status: 500 }
    );
  }
}
