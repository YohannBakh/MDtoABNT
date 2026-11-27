/* Armazenamento de imagens enviadas pelo editor — ficam fora de public/ (next standalone não
 * serve arquivos adicionados em runtime) e são entregues pela rota GET /api/uploads/[name] */

import path from "node:path";

export const IMAGE_EXT = ["png", "jpg", "jpeg", "gif"] as const;

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

/** valida o nome do arquivo: sem caminho e com extensão de imagem permitida */
export function safeUploadName(name: string): string | null {
  const base = path.basename(name);
  if (base !== name || base.startsWith(".")) return null;
  const ext = base.split(".").pop()?.toLowerCase() ?? "";
  if (!IMAGE_EXT.includes(ext as never)) return null;
  return base;
}

/** lê uma imagem enviada pelo nome (retorna null se inválida/inexistente) */
export async function readUpload(name: string): Promise<Buffer | null> {
  const safe = safeUploadName(name);
  if (!safe) return null;
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(path.join(uploadsDir(), safe));
  } catch {
    return null;
  }
}
