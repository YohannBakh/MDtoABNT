/* ------------------------------------------------------------------
 * MD2ABNT — Gerador PDF (pdfkit) com layout NBR 14724
 * - Motor de texto rico: justificado com negrito/itálico/sup/sub
 * - Duas passagens: sumário e listas com números de página reais
 * ------------------------------------------------------------------ */
import PDFDocument from "pdfkit";
import type {
  AbntDocument,
  Align,
  Block,
  HeadingBlock,
  InlineRun,
  TableBlock,
} from "./types";
import { fontFamilies, MONO_FONTS } from "./types";
import { fitImage, loadImage } from "./image";

type PdfFontMap = { regular: string; bold: string; italic: string; boldItalic: string };

interface Token {
  text: string;
  font: string;
  size: number;
  sup?: boolean;
  sub?: boolean;
  isSpace?: boolean;
  isBreak?: boolean;
}

const CM = 28.3465; // pt
const MT = 3 * CM;
const ML = 3 * CM;
const MB = 2 * CM;
const MR = 2 * CM;

function fontFor(r: InlineRun, f: PdfFontMap, mono: PdfFontMap): string {
  if (r.code) return r.bold ? mono.bold : mono.regular;
  if (r.bold && r.italic) return f.boldItalic;
  if (r.bold) return f.bold;
  if (r.italic) return f.italic;
  return f.regular;
}

function tokenize(runs: InlineRun[], f: PdfFontMap, mono: PdfFontMap, size: number): Token[] {
  const tokens: Token[] = [];
  for (const r of runs) {
    const font = fontFor(r, f, mono);
    const sz = (r.sup || r.sub ? 0.65 : 1) * (r.code ? size * 0.85 : size);
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (p.includes("\n")) tokens.push({ text: p, font, size: sz, sup: r.sup, sub: r.sub, isBreak: true });
        else tokens.push({ text: p, font, size: sz, sup: r.sup, sub: r.sub, isSpace: true });
      } else {
        tokens.push({ text: p, font, size: sz, sup: r.sup, sub: r.sub });
      }
    }
  }
  return tokens;
}

interface Line {
  items: { t: Token; w: number; spaceBefore: number }[];
  width: number;
  spaces: number;
  hardBreak: boolean;
}

export async function buildPdfBuffer(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;
  const f = fontFamilies(s.font).pdf;
  const mono = MONO_FONTS.pdf;

  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: MT, left: ML, bottom: MB, right: MR },
    bufferPages: true,
    info: { Title: s.title, Author: s.authors.join(", "), Creator: "MD2ABNT" },
  });
  const chunks: Buffer[] = [];
  pdf.on("data", (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // contador físico de páginas (a 1ª página é criada no construtor, sem evento)
  let pageCount = 1;
  pdf.on("pageAdded", () => {
    pageCount++;
  });
  const currentPdfPage = (): number => pageCount;

  const W = pdf.page.width;
  const H = pdf.page.height;
  const CW = W - ML - MR;
  const BOTTOM = H - MB;

  const measure = (text: string, font: string, size: number): number => {
    pdf.font(font).fontSize(size);
    return pdf.widthOfString(text);
  };

  let y = MT;
  let eqNum = 0;
  let bodyPhysicalStart = 1; // 1-based
  let capaEnabled = t.capa;

  /* -------------------- registro p/ sumário -------------------- */
  interface TocEntry {
    text: string;
    level: number;
    page: number;
  }
  const tocEntries: TocEntry[] = [];
  const figEntries: { text: string; page: number }[] = [];
  const tabEntries: { text: string; page: number }[] = [];

  const displayPage = (phys: number): number => (t.pageNumberAll ? phys : phys - bodyPhysicalStart + 1);

  /* -------------------- desenho de parágrafos ------------------ */

  const assembleLines = (tokens: Token[], avail: number): Line[] => {
    const lines: Line[] = [];
    let cur: Line = { items: [], width: 0, spaces: 0, hardBreak: false };
    let pendingSpaceW = 0;
    let pendingSpaces = 0;
    const pushWord = (tk: Token, w: number): void => {
      if (cur.items.length) {
        cur.width += pendingSpaceW;
        cur.spaces += pendingSpaces;
        cur.items.push({ t: tk, w, spaceBefore: pendingSpaceW });
        pendingSpaceW = 0;
        pendingSpaces = 0;
      } else {
        cur.items.push({ t: tk, w, spaceBefore: 0 });
      }
      cur.width += w;
    };
    for (const tk of tokens) {
      if (tk.isBreak) {
        cur.hardBreak = true;
        lines.push(cur);
        cur = { items: [], width: 0, spaces: 0, hardBreak: false };
        pendingSpaceW = 0;
        pendingSpaces = 0;
        continue;
      }
      if (tk.isSpace) {
        pendingSpaceW += measure(" ", tk.font, tk.size);
        pendingSpaces++;
        continue;
      }
      const w = measure(tk.text, tk.font, tk.size);
      if (cur.items.length && cur.width + pendingSpaceW + w > avail) {
        lines.push(cur);
        cur = { items: [], width: 0, spaces: 0, hardBreak: false };
        pendingSpaceW = 0;
        pendingSpaces = 0;
      }
      pushWord(tk, w);
    }
    if (cur.items.length) lines.push(cur);
    return lines;
  };

  const baselineOf = (size: number): number => size * 0.92;

  /** desenha linhas já montadas; retorna y final */
  const drawLines = (
    lines: Line[],
    o: {
      x: number;
      width: number;
      align: Align;
      leading: number;
      firstIndent: number;
      size: number;
      justifyLast?: boolean;
    }
  ): void => {
    lines.forEach((line, idx) => {
      const last = idx === lines.length - 1;
      const canJustify = o.align === "justify" && !last && !line.hardBreak && line.spaces > 0;
      let startX = o.x + (idx === 0 ? o.firstIndent : 0);
      const free = o.width - (idx === 0 ? o.firstIndent : 0) - line.width;
      if (o.align === "center" || (o.align === "justify" && last && !o.justifyLast)) startX = o.x + free / 2;
      else if (o.align === "right") startX = o.x + free;
      const perSpace = canJustify ? Math.max(0, free) / Math.max(line.spaces, 1) : 0;
      // garante página
      const lineH = o.leading;
      if (y + lineH > BOTTOM && idx === 0) {
        pdf.addPage();
        y = MT;
      } else if (y + lineH > BOTTOM) {
        pdf.addPage();
        y = MT;
      }
      const baseline = y + baselineOf(o.size);
      let cx = startX;
      for (const it of line.items) {
        if (it.spaceBefore) cx += it.spaceBefore + perSpace;
        const dy = it.t.sup ? -0.32 * o.size : it.t.sub ? 0.18 * o.size : 0;
        pdf.font(it.t.font).fontSize(it.t.size).fillColor("#000000");
        pdf.text(it.t.text, cx, baseline + dy, { lineBreak: false });
        cx += it.w;
      }
      y += lineH;
    });
  };

  const paragraph = (
    runs: InlineRun[],
    o: {
      size?: number;
      lineFactor?: number; // 1.5 → corpo
      align?: Align;
      firstIndent?: number;
      left?: number;
      width?: number;
      gapBefore?: number;
      gapAfter?: number;
      fontMap?: PdfFontMap;
    } = {}
  ): void => {
    const size = o.size ?? 12;
    const leading = (o.lineFactor ?? 1.5) * size * 1.15;
    const left = o.left ?? 0;
    const width = o.width ?? CW - left;
    if (o.gapBefore) y += o.gapBefore;
    const tokens = tokenize(runs, o.fontMap ?? f, mono, size);
    if (!tokens.length) {
      y += leading;
      if (o.gapAfter) y += o.gapAfter;
      return;
    }
    const lines = assembleLines(tokens, width);
    drawLines(lines, {
      x: ML + left,
      width,
      align: o.align ?? "justify",
      leading,
      firstIndent: o.firstIndent ?? 0,
      size,
    });
    if (o.gapAfter) y += o.gapAfter;
  };

  const ensureSpace = (h: number): void => {
    if (y + h > BOTTOM) {
      pdf.addPage();
      y = MT;
    }
  };

  /* ------------------------- utilidades ------------------------- */

  const emptyLines = (n: number): void => {
    y += n * 12 * 1.5;
  };

  const centeredText = (text: string, opts: { size?: number; bold?: boolean; caps?: boolean; gapAfter?: number; lineFactor?: number } = {}): void => {
    const size = opts.size ?? 12;
    const runs: InlineRun[] = [{ text: opts.caps ? text.toUpperCase() : text, bold: opts.bold }];
    paragraph(runs, { align: "center", size, lineFactor: opts.lineFactor ?? 1.5, gapAfter: opts.gapAfter ?? 0 });
  };

  /* ---------------------- pré-textuais -------------------------- */

  const newPage = (): void => {
    pdf.addPage();
    y = MT;
  };

  if (t.capa) {
    if (s.institution) centeredText(s.institution, { bold: true, caps: true });
    if (s.department) centeredText(s.department, { caps: true });
    emptyLines(6);
    for (const a of s.authors) centeredText(a);
    emptyLines(5);
    centeredText(s.title, { bold: true, caps: true, size: 14 });
    if (s.subtitle) centeredText(s.subtitle);
    emptyLines(6);
    centeredText(s.city);
    centeredText(s.year);
    newPage();
  }

  if (t.folhaRosto) {
    if (s.institution) centeredText(s.institution, { bold: true, caps: true });
    if (s.department) centeredText(s.department, { caps: true });
    emptyLines(5);
    for (const a of s.authors) centeredText(a);
    emptyLines(4);
    centeredText(s.title, { bold: true, caps: true, size: 14 });
    if (s.subtitle) centeredText(s.subtitle);
    emptyLines(3);
    // nota de natureza — bloco à direita
    const natureza = `Artigo apresentado ao ${s.department || "curso"} da ${s.institution || "instituição"}, como requisito parcial para a obtenção de nota.`;
    paragraph([{ text: natureza }], { align: "left", left: CW / 2, size: 12, lineFactor: 1 });
    emptyLines(4);
    if (s.advisor) centeredText(`${s.advisorRole}: ${s.advisor}`);
    if (s.coadvisor) centeredText(`Coorientador: ${s.coadvisor}`);
    emptyLines(2);
    centeredText(s.city);
    centeredText(s.year);
    newPage();
  }

  if (t.aprovacao) {
    for (const a of s.authors) centeredText(a, { bold: true, gapAfter: 4 });
    centeredText(s.title, { bold: true, caps: true, gapAfter: 4 });
    if (s.subtitle) centeredText(s.subtitle, { gapAfter: 8 });
    emptyLines(3);
    centeredText(s.approvalDate ? `Aprovado em ${s.approvalDate}.` : "Artigo aprovado pela banca examinadora.", { gapAfter: 8 });
    centeredText("BANCA EXAMINADORA", { bold: true, gapAfter: 10 });
    for (const m of s.committee) {
      if (!m.trim()) continue;
      centeredText(m, { gapAfter: 2 });
      emptyLines(1);
    }
    newPage();
  }

  // RESUMO (NBR 6028)
  const resumo = doc.resumo ?? (t.resumo ? { text: "", keywords: s.keywords } : null);
  const hasResumo = !!(doc.resumo || (t.resumo && s.keywords.length));
  if (hasResumo && resumo) {
    centeredText("RESUMO", { bold: true, gapAfter: 12 });
    if (resumo.text.trim()) {
      for (const par of resumo.text.split(/\n\n+/)) {
        paragraph([{ text: par }], { align: "justify", size: 12, lineFactor: 1 });
      }
    }
    const kws = resumo.keywords ?? s.keywords;
    if (kws?.length) {
      y += 6;
      paragraph([{ text: "Palavras-chave: ", bold: true }, { text: kws.map((k) => k.replace(/\.$/, "")).join(". ") + "." }], {
        align: "left",
        size: 12,
        lineFactor: 1,
      });
    }
    newPage();
  }

  // ABSTRACT
  if (doc.abstractEn) {
    centeredText("ABSTRACT", { bold: true, gapAfter: 12 });
    for (const par of doc.abstractEn.text.split(/\n\n+/)) {
      paragraph([{ text: par }], { align: "justify", size: 12, lineFactor: 1 });
    }
    if (doc.abstractEn.keywords?.length) {
      y += 6;
      paragraph([{ text: "Keywords: ", bold: true }, { text: doc.abstractEn.keywords.map((k) => k.replace(/\.$/, "")).join(". ") + "." }], {
        align: "left",
        size: 12,
        lineFactor: 1,
      });
    }
    newPage();
  }

  /* --------- páginas reservadas: listas e sumário --------- */
  const entryLeading = 15;
  const reserveListPages = (title: string, count: number): { firstIdx: number; pages: number; titleBottom: number } => {
    if (y > MT + 0.5) {
      // página atual já tem conteúdo → reserva página nova
      pdf.addPage();
      y = MT;
    }
    // índice (0-based) da página atual — a reserva reutiliza página em branco quando possível
    const firstIdx = pdf.bufferedPageRange().count - 1;
    centeredText(title, { bold: true, caps: true, gapAfter: 16 });
    const titleBottom = y;
    const avail = BOTTOM - titleBottom;
    const perPage = Math.max(1, Math.floor(avail / entryLeading));
    const pages = Math.max(1, Math.ceil(count / perPage));
    for (let p = 1; p < pages; p++) pdf.addPage();
    return { firstIdx, pages, titleBottom };
  };

  const listFigPages = t.listaFiguras && doc.figures.length ? reserveListPages("Lista de Figuras", doc.figures.length) : null;
  const listTabPages = t.listaTabelas && doc.tables.length ? reserveListPages("Lista de Tabelas", doc.tables.length) : null;
  const headingCount = doc.body.filter((b): b is HeadingBlock => b.type === "heading" && !b.special).length;
  const tocCount = headingCount + (doc.references.length ? 1 : 0);
  const tocPages = t.sumario && tocCount > 0 ? reserveListPages("Sumário", tocCount) : null;

  /* --------------------------- corpo ---------------------------- */

  if (y > MT + 0.5) {
    pdf.addPage();
    y = MT;
  }
  bodyPhysicalStart = currentPdfPage();

  const headingDisplay = (h: HeadingBlock): string => {
    const text = h.runs.map((r) => r.text).join("");
    return h.number ? `${h.number} ${text}` : text;
  };

  const renderHeading = (h: HeadingBlock): void => {
    const display = headingDisplay(h);
    const caps = h.level <= 2;
    const bold = h.level === 1 || h.level === 3;
    const italic = h.level === 4 || h.level === 5;
    const leading = 12 * 1.15;
    ensureSpace(leading * 4);
    y += h.level === 1 ? 24 : 16;
    const runs: InlineRun[] = [{ text: caps ? display.toUpperCase() : display, bold, italic }];
    paragraph(runs, { align: h.centered ? "center" : "left", size: 12, lineFactor: 1, gapAfter: h.level === 1 ? 12 : 8 });
    tocEntries.push({ text: display, level: h.level, page: currentPdfPage() });
  };

  const renderTable = (tb: TableBlock): void => {
    const fs = 10;
    const pad = 4;
    const ncols = tb.header.length;
    // larguras naturais por coluna
    const natural: number[] = Array(ncols).fill(40);
    const maxOf = (runs: InlineRun[]): number => {
      const toks = tokenize(runs, f, mono, fs);
      return toks.filter((tk) => !tk.isSpace && !tk.isBreak).reduce((acc, tk) => Math.max(acc, measure(tk.text, tk.font, tk.size)), 0);
    };
    for (let c = 0; c < ncols; c++) {
      natural[c] = Math.max(natural[c], maxOf(tb.header[c] ?? []) + 2 * pad);
      for (const row of tb.rows) natural[c] = Math.max(natural[c], maxOf(row[c] ?? []) + 2 * pad);
    }
    const capped = natural.map((w) => Math.min(w, CW * 0.55));
    const total = capped.reduce((a, b) => a + b, 0);
    const scale = CW / total;
    const colW = capped.map((w) => w * scale);

    // legenda
    if (tb.caption) {
      const num = tb.num ?? 0;
      ensureSpace(30);
      y += 8;
      paragraph([{ text: `Tabela ${num} – ${tb.caption}` }], { align: "center", size: 12, lineFactor: 1, gapAfter: 4 });
      tabEntries.push({ text: `Tabela ${num} – ${tb.caption}`, page: currentPdfPage() });
    }

    const drawHLine = (yy: number): void => {
      pdf.moveTo(ML, yy).lineTo(ML + CW, yy).lineWidth(0.8).strokeColor("#000000").stroke();
    };

    ensureSpace(fs * 1.15 * 3);
    const tableTop = y - 4;
    drawHLine(tableTop);

    const renderRow = (row: InlineRun[][], bold: boolean, align: Align[]): { height: number; linesPerCol: Line[][] } => {
      const linesPerCol: Line[][] = [];
      let maxLines = 1;
      for (let c = 0; c < ncols; c++) {
        const wAvail = colW[c] - 2 * pad;
        const runs = (row[c] ?? []).map((r) => (bold ? { ...r, bold: true } : { ...r }));
        const toks = tokenize(runs, f, mono, fs);
        const lines = assembleLines(toks, wAvail);
        linesPerCol.push(lines);
        maxLines = Math.max(maxLines, lines.length);
      }
      const rowH = maxLines * (fs * 1.15) + 2 * pad;
      let cy = y + pad;
      for (let c = 0; c < ncols; c++) {
        const cx = ML + colW.slice(0, c).reduce((a, b) => a + b, 0) + pad;
        const colAlign = bold ? "center" : align[c] ?? "left";
        const lineH = fs * 1.15;
        for (const line of linesPerCol[c]) {
          const free = colW[c] - 2 * pad - line.width;
          let sx = cx;
          if (colAlign === "center") sx = cx + free / 2;
          else if (colAlign === "right") sx = cx + free;
          const baseline = cy + baselineOf(fs);
          let px2 = sx;
          for (const it of line.items) {
            if (it.spaceBefore) px2 += it.spaceBefore;
            pdf.font(it.t.font).fontSize(it.t.size).fillColor("#000000");
            pdf.text(it.t.text, px2, baseline, { lineBreak: false });
            px2 += it.w;
          }
          cy += lineH;
        }
        cy = y + pad;
      }
      y += rowH;
      return { height: rowH, linesPerCol };
    };

    // cabeçalho
    renderRow(tb.header, true, tb.align);
    drawHLine(y);

    for (const row of tb.rows) {
      ensureSpace(fs * 1.15 * 3);
      renderRow(row, false, tb.align);
    }
    drawHLine(y);
    y += 6;
    paragraph([{ text: tb.sourceNote || s.sourceNote }], { align: "center", size: 10, lineFactor: 1, gapAfter: 12 });
  };

  for (const b of doc.body) {
    switch (b.type) {
      case "heading":
        if (b.special) continue;
        renderHeading(b);
        break;
      case "paragraph":
        paragraph(b.runs, { align: "justify", firstIndent: 1.25 * CM });
        break;
      case "blockquote":
        paragraph(b.runs, { align: "justify", size: 10, left: 4 * CM, lineFactor: 1, gapAfter: 8 });
        break;
      case "list": {
        const alpha = (i: number): string => {
          let str = "";
          let n = i;
          do {
            str = String.fromCharCode(97 + (n % 26)) + str;
            n = Math.floor(n / 26) - 1;
          } while (n >= 0);
          return str;
        };
        const markerX = ML + 1.25 * CM;
        b.items.forEach((item, idx) => {
          ensureSpace(2 * 20);
          const marker = b.ordered ? `${alpha(idx)})` : "–";
          const markerW = measure(marker, f.regular, 12);
          const firstBaseline = y + baselineOf(12);
          paragraph(item.runs, { align: "justify", left: 1.25 * CM + markerW + 6, firstIndent: 0 });
          pdf.font(f.regular).fontSize(12).fillColor("#000000");
          pdf.text(marker, markerX, firstBaseline, { lineBreak: false });
          (item.subItems ?? []).forEach((sub, j) => {
            ensureSpace(2 * 20);
            const sm = b.ordered ? `${alpha(j + 1)})` : "–";
            const smW = measure(sm, f.regular, 12);
            const fb = y + baselineOf(12);
            paragraph(sub.runs, { align: "justify", left: 1.25 * CM + 12 + smW + 6, firstIndent: 0 });
            pdf.font(f.regular).fontSize(12).fillColor("#000000");
            pdf.text(sm, markerX + 12, fb, { lineBreak: false });
          });
        });
        y += 4;
        break;
      }
      case "code": {
        const lines = b.text.replace(/\t/g, "    ").split("\n");
        for (const line of lines) {
          ensureSpace(14);
          pdf.font(mono.regular).fontSize(10).fillColor("#000000");
          pdf.text(line.length ? line : " ", ML, y + baselineOf(10), { lineBreak: false });
          y += 12;
        }
        y += 8;
        break;
      }
      case "equation": {
        if (t.numberEquations) eqNum++;
        const toks = tokenize(b.runs, f, mono, 12);
        const totalW = toks.filter((tk) => !tk.isSpace).reduce((acc, tk) => acc + measure(tk.text, tk.font, tk.size), 0);
        const numW = t.numberEquations ? measure(`(${eqNum})`, f.regular, 12) + 8 : 0;
        ensureSpace(28);
        y += 6;
        const baseline = y + baselineOf(12);
        let sx = totalW + numW > CW ? ML : ML + (CW - totalW - numW) / 2;
        for (const tk of toks) {
          const dy = tk.sup ? -0.32 * 12 : tk.sub ? 0.18 * 12 : 0;
          pdf.font(tk.font).fontSize(tk.size).fillColor("#000000");
          pdf.text(tk.text, sx, baseline + dy, { lineBreak: false });
          sx += tk.isSpace ? measure(" ", tk.font, tk.size) : measure(tk.text, tk.font, tk.size);
        }
        if (t.numberEquations) {
          pdf.font(f.regular).fontSize(12).fillColor("#000000");
          pdf.text(`(${eqNum})`, ML + CW - numW + 8, baseline, { lineBreak: false, width: numW, align: "right" });
        }
        y += 24;
        break;
      }
      case "figure": {
        const num = b.num ?? 0;
        if (b.caption) {
          ensureSpace(40);
          y += 8;
          paragraph([{ text: `Figura ${num} – ${b.caption}` }], { align: "center", size: 12, lineFactor: 1, gapAfter: 4 });
          figEntries.push({ text: `Figura ${num} – ${b.caption}`, page: currentPdfPage() });
        }
        const img = await loadImage(b.src);
        const maxW = CW;
        const maxH = BOTTOM - MT - 90;
        if (img) {
          const { width, height } = fitImage(img, maxW, maxH);
          ensureSpace(height + 30);
          const ix = ML + (CW - width) / 2;
          try {
            pdf.image(img.buf, ix, y, { width, height });
          } catch {
            pdf.rect(ix, y, Math.min(width, CW), Math.min(height, 120)).lineWidth(0.8).stroke();
            pdf.font(f.italic).fontSize(10).text("imagem não disponível", ix, y + 40, { width, align: "center", lineBreak: false });
          }
          y += height + 8;
        } else {
          const ph = 100;
          ensureSpace(ph + 20);
          pdf.rect(ML, y, CW, ph).lineWidth(0.8).stroke();
          pdf.font(mono.regular).fontSize(9).fillColor("#444444");
          pdf.text(`[ imagem não disponível: ${b.src.slice(0, 70)} ]`, ML + 8, y + ph / 2 - 6, { width: CW - 16, align: "center", lineBreak: false });
          y += ph + 8;
        }
        paragraph([{ text: b.sourceNote || s.sourceNote }], { align: "center", size: 10, lineFactor: 1, gapAfter: 12 });
        break;
      }
      case "table":
        renderTable(b as TableBlock);
        break;
      default:
        break;
    }
  }

  /* ------------------------ referências ------------------------- */
  if (doc.references.length) {
    ensureSpace(80);
    y += 24;
    centeredText("REFERÊNCIAS", { bold: true, caps: true, gapAfter: 16 });
    tocEntries.push({ text: "REFERÊNCIAS", level: 1, page: currentPdfPage() });
    for (const entry of doc.references) {
      const tokens = tokenize(entry, f, mono, 12);
      if (!tokens.length) continue;
      paragraph(entry, { align: "left", size: 12, lineFactor: 1, gapAfter: 10 });
    }
  }

  /* ------------- preencher listas e sumário (passagem 2) -------- */

  const drawTocLine = (text: string, level: number, physPage: number, x: number, width: number, lineY: number): void => {
    const pageNum = String(displayPage(physPage));
    const caps = level <= 2;
    const bold = level === 1 || level === 3;
    const font = bold ? f.bold : f.regular;
    const shown = caps ? text.toUpperCase() : text;
    const indent = level > 1 ? (level - 1) * 18 : 0;
    pdf.font(font).fontSize(12).fillColor("#000000");
    const textW = measure(shown, font, 12);
    pdf.text(shown, x + indent, lineY, { lineBreak: false });
    const numW = measure(pageNum, f.regular, 12);
    const dotW = measure(".", f.regular, 12);
    const dotsStart = x + indent + textW + 6;
    const dotsEnd = x + width - numW - 6;
    if (dotsEnd > dotsStart && dotsEnd - dotsStart > dotW) {
      const nDots = Math.floor((dotsEnd - dotsStart) / dotW);
      pdf.font(f.regular).fontSize(12).fillColor("#000000");
      pdf.text(".".repeat(nDots), dotsStart, lineY, { lineBreak: false });
    }
    pdf.font(f.regular).fontSize(12).fillColor("#000000");
    pdf.text(pageNum, x + width - numW, lineY, { lineBreak: false });
  };

  const fillList = (
    reserved: { firstIdx: number; pages: number; titleBottom: number },
    entries: { text: string; page: number }[]
  ): void => {
    if (!entries.length) return;
    const avail = BOTTOM - reserved.titleBottom;
    const perPage = Math.max(1, Math.floor(avail / entryLeading));
    entries.forEach((e, i) => {
      const relPage = Math.floor(i / perPage);
      const pageIdx = reserved.firstIdx + relPage;
      const lineY = (relPage === 0 ? reserved.titleBottom : MT) + (i % perPage) * entryLeading;
      pdf.switchToPage(pageIdx);
      drawTocLine(e.text, 3, e.page, ML, CW, lineY);
    });
  };

  if (listFigPages) fillList(listFigPages, figEntries);
  if (listTabPages) fillList(listTabPages, tabEntries);

  if (tocPages) {
    const avail = BOTTOM - tocPages.titleBottom;
    const perPage = Math.max(1, Math.floor(avail / entryLeading));
    tocEntries.forEach((e, i) => {
      const relPage = Math.floor(i / perPage);
      const pageIdx = tocPages.firstIdx + relPage;
      const lineY = (relPage === 0 ? tocPages.titleBottom : MT) + (i % perPage) * entryLeading;
      pdf.switchToPage(pageIdx);
      drawTocLine(e.text, e.level, e.page, ML, CW, lineY);
    });
  }

  /* ------------------- numeração de páginas --------------------- */

  const total = pdf.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    pdf.switchToPage(i);
    const phys = i + 1;
    let show = false;
    let value = 0;
    if (t.pageNumberAll) {
      show = phys >= 2; // capa sem número
      value = phys;
    } else {
      show = phys >= bodyPhysicalStart;
      value = phys - bodyPhysicalStart + 1;
    }
    if (!show) continue;
    pdf.font(f.regular).fontSize(12).fillColor("#000000");
    pdf.text(String(value), W - MR, 30, { width: MR - 14, align: "right", lineBreak: false });
  }

  pdf.flushPages?.();
  pdf.end();
  return finished;
}
