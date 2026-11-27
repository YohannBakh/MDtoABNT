/* POST /api/upload — recebe imagem do editor (multipart "file") e salva em uploads/ */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { IMAGE_EXT, uploadsDir } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo no campo 'file'." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem muito grande — o máximo é 8 MB." }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!IMAGE_EXT.includes(ext as never)) {
      return NextResponse.json({ error: "Formato não suportado — use PNG, JPG ou GIF." }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length === 0) {
      return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
    }
    const base =
      path
        .basename(file.name)
        .replace(/\.[^.]*$/, "")
        .replace(/[^A-Za-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "imagem";
    const name = `${Date.now()}-${base}.${ext === "jpeg" ? "jpg" : ext}`;
    await mkdir(uploadsDir(), { recursive: true });
    await writeFile(path.join(uploadsDir(), name), buf);
    return NextResponse.json({ url: `/api/uploads/${name}` });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Falha no upload." }, { status: 500 });
  }
}
