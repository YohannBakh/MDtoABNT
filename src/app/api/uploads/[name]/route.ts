/* GET /api/uploads/[name] — serve a imagem enviada pelo editor */

import { NextRequest, NextResponse } from "next/server";
import { readUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const buf = await readUpload(name);
  if (!buf) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
