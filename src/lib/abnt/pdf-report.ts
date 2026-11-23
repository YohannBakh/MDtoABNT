/* ------------------------------------------------------------------
 * MD2ABNT — Gerador PDF no estilo Relatório Técnico de Experimento
 * Réplica da formatação dos relatórios "Experimento 3/4/5.docx":
 * margens 3/3/2,5/2,5 cm, Times 12, espaçamento 1,15, seções numeradas
 * sem negrito, capa em tabela com grade, logos institucionais no
 * cabeçalho de todas as páginas, sem numeração de página.
 * ------------------------------------------------------------------ */
import PDFDocument from "pdfkit";
import type { AbntDocument, Block, HeadingBlock, InlineRun, TableBlock } from "./types";
import { REPORT, fontFamilies, MONO_FONTS } from "./types";
import { fitImage, loadImage } from "./image";
import { LOGO_DIREITA_BASE64, LOGO_ESQUERDA_BASE64 } from "./logos";

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
const MT = 2.9 * CM; // conteúdo começa abaixo das logos
const ML = REPORT.margin.left * CM;
const MB = REPORT.margin.bottom * CM;
const MR = REPORT.margin.right * CM;
const LOGO_Y = 0.85 * CM; // posição vertical da faixa de logos
const IND_FIRST = REPORT.firstLineIndent * CM;
const IND_SEC = REPORT.sectionIndent * CM;
const IND_HANG = REPORT.sectionHanging * CM;
const LINE_FACTOR = REPORT.lineFactor; // 1,15

const b64 = (dataUri: string) => Buffer.from(dataUri.split(",")[1], "base64");

function fontFor(r: InlineRun, f: PdfFontMap, mono: PdfFontMap, mathMap: PdfFontMap | null): string {
  if (r.math && mathMap) return r.bold ? mathMap.bold : mathMap.regular;
  if (r.code) return r.bold ? mono.bold : mono.regular;
  if (r.bold && r.italic) return f.boldItalic;
  if (r.bold) return f.bold;
  if (r.italic) return f.italic;
  return f.regular;
}

let mathMapRef: PdfFontMap | null = null;

function tokenize(runs: InlineRun[], f: PdfFontMap, mono: PdfFontMap, size: number): Token[] {
  const tokens: Token[] = [];
  for (const r of runs) {
    const font = fontFor(r, f, mono, mathMapRef);
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

/** linha de cálculo: curta, com "=" e dígitos — sem recuo (padrão dos originais) */
function looksLikeCalculation(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.length > 60 || t.includes("\n")) return false;
  if (/^(para|onde|com|sendo|logo|assim)\b/i.test(t)) return false;
  return /=/.test(t) && /\d/.test(t);
}

export async function buildReportPdfBuffer(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;
  const f = fontFamilies(s.font).pdf;
  const mono = MONO_FONTS.pdf;

  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: MT, left: ML, bottom: MB, right: MR },
    bufferPages: true,
    info: { Title: s.report.activityLabel || "Relatório Técnico", Author: s.authors.join(", "), Creator: "MD2ABNT" },
  });
  const chunks: Buffer[] = [];
  pdf.on("data", (c: Buffer) => chunks.push(c));
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });

  try {
    pdf.registerFont("MDMath", "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf");
    pdf.registerFont("MDMathBold", "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf");
    mathMapRef = { regular: "MDMath", bold: "MDMathBold", italic: "MDMath", boldItalic: "MDMathBold" };
  } catch {
    mathMapRef = null;
  }

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

  const drawLines = (
    lines: Line[],
    o: { x: number; width: number; align: "left" | "center" | "right"; leading: number; firstIndent: number; size: number }
  ): void => {
    lines.forEach((line, idx) => {
      const lineH = o.leading;
      if (y + lineH > BOTTOM) {
        pdf.addPage();
        y = MT;
      }
      const baseline = y + baselineOf(o.size);
      let startX = o.x + (idx === 0 ? o.firstIndent : 0);
      const free = o.width - (idx === 0 ? o.firstIndent : 0) - line.width;
      if (o.align === "center") startX = o.x + free / 2;
      else if (o.align === "right") startX = o.x + free;
      let cx = startX;
      for (const it of line.items) {
        if (it.spaceBefore) cx += it.spaceBefore;
        const dy = it.t.sup ? -0.32 * o.size : it.t.sub ? 0.18 * o.size : 0;
        pdf.font(it.t.font).fontSize(it.t.size).fillColor("#000000");
        pdf.text(it.t.text, cx, baseline + dy, { lineBreak: false, baseline: 0 });
        cx += it.w;
      }
      y += lineH;
    });
  };

  const paragraph = (
    runs: InlineRun[],
    o: { size?: number; align?: "left" | "center" | "right"; firstIndent?: number; left?: number; gapBefore?: number; gapAfter?: number } = {}
  ): void => {
    const size = o.size ?? 12;
    const leading = LINE_FACTOR * size * 1.15;
    const left = o.left ?? 0;
    const width = CW - left;
    if (o.gapBefore) y += o.gapBefore;
    const tokens = tokenize(runs, f, mono, size);
    if (!tokens.length) {
      y += leading;
      if (o.gapAfter) y += o.gapAfter;
      return;
    }
    const lines = assembleLines(tokens, width);
    drawLines(lines, { x: ML + left, width, align: o.align ?? "left", leading, firstIndent: o.firstIndent ?? 0, size });
    if (o.gapAfter) y += o.gapAfter;
  };

  const ensureSpace = (h: number): void => {
    if (y + h > BOTTOM) {
      pdf.addPage();
      y = MT;
    }
  };

  /* --------------------- capa em tabela --------------------- */

  if (t.capa) {
    const rc = s.report;
    const colW = CW / 2;
    const rowH = [1.17 * CM, 0.74 * CM, 0.6 * CM, 0.6 * CM, 0.6 * CM];
    const num = rc.activityNumber.trim();
    const authors = s.authors.filter((a) => a.trim()).join("; ");
    const rowsText: { cells: { label: string; value: string; center?: boolean; bold?: boolean }[]; heights: number }[] = [
      { cells: [{ label: rc.course, value: "", center: true, bold: true }], heights: rowH[0] },
      { cells: [{ label: `${rc.activityLabel}${num ? ` Nº ${num}` : ""}`, value: "", center: true, bold: true }], heights: rowH[1] },
      { cells: [{ label: "Disciplina:", value: rc.disciplina }, { label: "Turma:", value: rc.turma }], heights: rowH[2] },
      { cells: [{ label: "Professor:", value: rc.professor }, { label: "Período:", value: rc.periodo }], heights: rowH[3] },
      { cells: [{ label: "Aluno(s):", value: authors }, { label: "Data da atividade:", value: rc.dataAtividade }], heights: rowH[4] },
    ];

    let cy = y;
    const tableTop = cy;
    for (const row of rowsText) {
      const rh = row.heights;
      if (row.cells.length === 1) {
        // linha mesclada — texto centralizado
        const c = row.cells[0];
        pdf.font(c.bold ? f.bold : f.regular).fontSize(12).fillColor("#000000");
        const txt = c.label;
        const tw = measure(txt, c.bold ? f.bold : f.regular, 12);
        pdf.text(txt, ML + (CW - tw) / 2, cy + (rh - 12) / 2 + 2, { lineBreak: false, baseline: 0 });
      } else {
        for (let i = 0; i < 2; i++) {
          const c = row.cells[i];
          const cx = ML + i * colW + 6;
          pdf.font(f.bold).fontSize(12).fillColor("#000000");
          const lw = measure(c.label, f.bold, 12);
          pdf.text(c.label, cx, cy + (rh - 12) / 2 + 2, { lineBreak: false, baseline: 0 });
          if (c.value) {
            pdf.font(f.regular).fontSize(12).fillColor("#000000");
            pdf.text(c.value, cx + lw + 3, cy + (rh - 12) / 2 + 2, { lineBreak: false, baseline: 0 });
          }
        }
      }
      cy += rh;
      // linha horizontal após a row
      pdf.moveTo(ML, cy).lineTo(ML + CW, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    }
    // borda externa + divisória central (só nas linhas de campos, abaixo das mescladas)
    const dividerTop = tableTop + rowH[0] + rowH[1];
    pdf.moveTo(ML, tableTop).lineTo(ML + CW, tableTop).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML, tableTop).lineTo(ML, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML + CW, tableTop).lineTo(ML + CW, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML + colW, dividerTop).lineTo(ML + colW, cy).lineWidth(0.7).strokeColor("#000000").stroke();

    y = cy + 14;
  }

  /* --------------------------- corpo --------------------------- */

  const headingDisplay = (h: HeadingBlock): string => {
    const text = h.runs.map((r) => r.text).join("");
    if (!h.number) return text;
    return h.level === 1 ? `${h.number}. ${text}` : `${h.number} ${text}`;
  };

  const renderHeading = (h: HeadingBlock): void => {
    const display = headingDisplay(h);
    ensureSpace(2 * LINE_FACTOR * 12 * 1.15);
    const left = h.level === 1 ? IND_SEC : IND_SEC + (h.level - 1) * 0.5 * CM;
    paragraph([{ text: display }], { align: "left", size: 12, left, firstIndent: -IND_HANG, gapAfter: 2 });
  };

  const renderTable = (tb: TableBlock): void => {
    const fs = 12;
    const pad = 5;
    const ncols = Math.max(tb.header.length, ...tb.rows.map((r) => r.length));
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

    if (tb.caption) {
      ensureSpace(40);
      paragraph([{ text: tb.num !== undefined ? `Tabela ${tb.num} - ${tb.caption}` : tb.caption }], {
        align: "center",
        size: 12,
        gapBefore: 8,
        gapAfter: 4,
      });
    }

    const lineH = fs * 1.15;
    const rowTops: number[] = [];
    const drawRow = (row: InlineRun[][], header: boolean): void => {
      const linesPerCol: Line[][] = [];
      let maxLines = 1;
      for (let c = 0; c < ncols; c++) {
        const wAvail = colW[c] - 2 * pad;
        const runs = (row[c] ?? []).map((r) => (header ? { ...r, bold: true } : { ...r }));
        const toks = tokenize(runs, f, mono, fs);
        const lines = assembleLines(toks, wAvail);
        linesPerCol.push(lines);
        maxLines = Math.max(maxLines, lines.length);
      }
      const rowH = maxLines * lineH + 2 * pad;
      rowTops.push(y);
      let cy = y + pad;
      for (let c = 0; c < ncols; c++) {
        const cx = ML + colW.slice(0, c).reduce((a, b) => a + b, 0) + pad;
        for (const line of linesPerCol[c]) {
          const free = colW[c] - 2 * pad - line.width;
          const sx = cx + free / 2; // células centralizadas, como nos relatórios
          const baseline = cy + baselineOf(fs);
          let px2 = sx;
          for (const it of line.items) {
            if (it.spaceBefore) px2 += it.spaceBefore;
            pdf.font(it.t.font).fontSize(it.t.size).fillColor("#000000");
            pdf.text(it.t.text, px2, baseline, { lineBreak: false, baseline: 0 });
            px2 += it.w;
          }
          cy += lineH;
        }
        cy = y + pad;
      }
      y += rowH;
    };

    ensureSpace(lineH * 3);
    drawRow(tb.header, true);
    for (const row of tb.rows) {
      ensureSpace(lineH * 3);
      drawRow(row, false);
    }
    const tableBottom = y;

    // grade completa (padrão dos relatórios): topo, base, laterais, todas as linhas e colunas
    const top = rowTops[0] ?? y;
    const hLine = (yy: number): void => {
      pdf.moveTo(ML, yy).lineTo(ML + CW, yy).lineWidth(0.7).strokeColor("#000000").stroke();
    };
    hLine(top);
    hLine(tableBottom);
    for (const rt of rowTops) hLine(rt);
    pdf.moveTo(ML, top).lineTo(ML, tableBottom).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML + CW, top).lineTo(ML + CW, tableBottom).lineWidth(0.7).strokeColor("#000000").stroke();
    let acc = 0;
    for (let c = 0; c < ncols - 1; c++) {
      acc += colW[c];
      pdf.moveTo(ML + acc, top).lineTo(ML + acc, tableBottom).lineWidth(0.7).strokeColor("#000000").stroke();
    }
    y += 8;

    if (tb.sourceNote) {
      paragraph([{ text: tb.sourceNote.startsWith("Fonte") ? tb.sourceNote : `Fonte: ${tb.sourceNote}` }], {
        align: "center",
        size: 12,
        gapAfter: 10,
      });
    }
  };

  for (const b of doc.body) {
    switch (b.type) {
      case "heading":
        if (b.special) continue;
        renderHeading(b);
        break;
      case "paragraph": {
        const text = b.runs.map((r) => r.text).join("");
        const isCalc = looksLikeCalculation(text);
        paragraph(b.runs, { align: "left", firstIndent: isCalc ? 0 : IND_FIRST });
        break;
      }
      case "blockquote":
        paragraph(b.runs, { align: "left", left: 4 * CM, gapAfter: 8 });
        break;
      case "list": {
        b.items.forEach((item, idx) => {
          ensureSpace(2 * 20);
          const marker = b.ordered ? `${idx + 1}.` : "–";
          const markerW = measure(marker, f.regular, 12);
          const firstBaseline = y + baselineOf(12);
          paragraph(item.runs, { align: "left", left: IND_SEC + markerW + 6, firstIndent: 0 });
          pdf.font(f.regular).fontSize(12).fillColor("#000000");
          pdf.text(marker, ML + IND_SEC - IND_HANG, firstBaseline, { lineBreak: false, baseline: 0 });
          (item.subItems ?? []).forEach((sub, j) => {
            ensureSpace(2 * 20);
            const sm = b.ordered ? `${idx + 1}.${j + 1}` : "–";
            const smW = measure(sm, f.regular, 12);
            const fb = y + baselineOf(12);
            paragraph(sub.runs, { align: "left", left: IND_SEC + 0.5 * CM + smW + 6, firstIndent: 0 });
            pdf.font(f.regular).fontSize(12).fillColor("#000000");
            pdf.text(sm, ML + IND_SEC + 0.5 * CM - IND_HANG, fb, { lineBreak: false, baseline: 0 });
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
          pdf.text(line.length ? line : " ", ML, y + baselineOf(10), { lineBreak: false, baseline: 0 });
          y += 13;
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
          pdf.text(tk.text, sx, baseline + dy, { lineBreak: false, baseline: 0 });
          sx += tk.isSpace ? measure(" ", tk.font, tk.size) : measure(tk.text, tk.font, tk.size);
        }
        if (t.numberEquations) {
          pdf.font(f.regular).fontSize(12).fillColor("#000000");
          pdf.text(`(${eqNum})`, ML + CW - numW + 8, baseline, { lineBreak: false, baseline: 0, width: numW, align: "right" });
        }
        y += 24;
        break;
      }
      case "figure": {
        const num = b.num;
        const img = await loadImage(b.src);
        const maxW = CW;
        const maxH = BOTTOM - MT - 60;
        if (img) {
          const { width, height } = fitImage(img, maxW, maxH);
          ensureSpace(height + 60);
          const ix = ML + (CW - width) / 2;
          try {
            pdf.image(img.buf, ix, y, { width, height });
          } catch {
            pdf.rect(ix, y, Math.min(width, CW), Math.min(height, 120)).lineWidth(0.8).stroke();
          }
          y += height + 8;
        } else {
          const ph = 100;
          ensureSpace(ph + 20);
          pdf.rect(ML, y, CW, ph).lineWidth(0.8).stroke();
          pdf.font(mono.regular).fontSize(9).fillColor("#444444");
          pdf.text(`[ imagem não disponível: ${b.src.slice(0, 70)} ]`, ML + 8, y + ph / 2 - 6, { width: CW - 16, align: "center", lineBreak: false, baseline: 0 });
          y += ph + 8;
        }
        if (b.caption) {
          paragraph([{ text: num !== undefined ? `Figura ${num} - ${b.caption}` : b.caption }], { align: "center", size: 12 });
        }
        if (b.sourceNote) {
          paragraph([{ text: b.sourceNote.startsWith("Fonte") ? b.sourceNote : `Fonte: ${b.sourceNote}` }], {
            align: "center",
            size: 12,
            gapAfter: 12,
          });
        } else {
          y += 6;
        }
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
    paragraph([{ text: "REFERÊNCIAS" }], { align: "center", size: 12, gapAfter: 12 });
    for (const entry of doc.references) {
      paragraph(entry, { align: "left", size: 12, gapAfter: 10 });
    }
  }

  /* ------------- logos institucionais em todas as páginas -------- */

  const logoLeft = b64(LOGO_ESQUERDA_BASE64);
  const logoRight = b64(LOGO_DIREITA_BASE64);
  const wLeft = 5.5 * CM;
  const hLeft = wLeft / 4.153;
  const wRight = 4.8 * CM;
  const hRight = wRight / 3.011;

  const total = pdf.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    pdf.switchToPage(i);
    try {
      pdf.image(logoLeft, ML, LOGO_Y, { width: wLeft, height: hLeft });
      pdf.image(logoRight, ML + CW - wRight, LOGO_Y, { width: wRight, height: hRight });
    } catch {
      /* logos opcionais — falha silenciosa */
    }
  }

  pdf.flushPages?.();
  pdf.end();
  return finished;
}
