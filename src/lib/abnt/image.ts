/* Utilitário de imagens: carrega e detecta dimensões (PNG/JPEG/GIF) */

export interface LoadedImage {
  buf: Buffer;
  kind: "png" | "jpg" | "gif";
  width: number;
  height: number;
}

function sniffKind(buf: Buffer): "png" | "jpg" | "gif" | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 6 && buf.toString("ascii", 0, 3) === "GIF") return "gif";
  return null;
}

function dims(buf: Buffer, kind: "png" | "jpg" | "gif"): { width: number; height: number } {
  try {
    if (kind === "png" && buf.length >= 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (kind === "gif" && buf.length >= 10) {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (kind === "jpg") {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buf[off + 1];
        // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
        if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
          const height = buf.readUInt16BE(off + 5);
          const width = buf.readUInt16BE(off + 7);
          return { width, height };
        }
        const len = buf.readUInt16BE(off + 2);
        off += 2 + len;
      }
    }
  } catch {
    /* ignora */
  }
  return { width: 0, height: 0 };
}

/** Carrega imagem de data URI, URL http(s) ou caminho local (/arquivo.png em public/). Retorna null se indisponível. */
export async function loadImage(src: string): Promise<LoadedImage | null> {
  try {
    let buf: Buffer | null = null;
    if (src.startsWith("data:")) {
      const b64 = src.slice(src.indexOf(",") + 1);
      buf = Buffer.from(b64, "base64");
    } else if (/^https?:\/\//i.test(src)) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(src, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else if (src.startsWith("/")) {
      // arquivo servido de public/
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      const safe = path.basename(src);
      buf = await readFile(path.join(process.cwd(), "public", safe));
    } else {
      return null;
    }
    if (!buf || buf.length === 0) return null;
    const kind = sniffKind(buf);
    if (!kind) return null;
    const d = dims(buf, kind);
    return { buf, kind, width: d.width, height: d.height };
  } catch {
    return null;
  }
}

/** Dimensões de exibição respeitando a largura máxima (px @96dpi) */
export function fitImage(img: LoadedImage, maxWidthPx: number, maxHeightPx: number): { width: number; height: number } {
  let w = img.width > 0 ? img.width : 480;
  let h = img.height > 0 ? img.height : 360;
  const r = Math.min(maxWidthPx / w, maxHeightPx / h, 1);
  return { width: Math.round(w * r), height: Math.round(h * r) };
}
