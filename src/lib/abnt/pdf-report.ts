/* ------------------------------------------------------------------
 * MD2ABNT — Gerador PDF no estilo Relatório Técnico de Experimento
 * Layout do modelo do curso (IFC Luzerna): cabeçalho institucional de
 * texto em todas as páginas, título + tabela de identificação na 1ª
 * página seguidos direto do texto, margens 3/3/2,5/2,5 cm, Times 12,
 * espaçamento 1,15, seções numeradas em negrito, sem numeração de página.
 * ------------------------------------------------------------------ */
import PDFDocument from "pdfkit";
import type { AbntDocument, Block, HeadingBlock, InlineRun, TableBlock } from "./types";
import { REPORT, fontFamilies, MONO_FONTS } from "./types";
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
const MT = 2.9 * CM; // conteúdo começa abaixo do cabeçalho institucional
const ML = REPORT.margin.left * CM;
const MB = REPORT.margin.bottom * CM;
const MR = REPORT.margin.right * CM;
const HDR_Y = 0.75 * CM; // topo da 1ª linha do cabeçalho
const IND_FIRST = REPORT.firstLineIndent * CM;
const IND_SEC = REPORT.sectionIndent * CM;
const IND_HANG = REPORT.sectionHanging * CM;
const LINE_FACTOR = REPORT.lineFactor; // 1,15

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
    o: { x: number; width: number; align: "left" | "center" | "right" | "justify"; leading: number; firstIndent: number; size: number }
  ): void => {
    lines.forEach((line, idx) => {
      const last = idx === lines.length - 1;
      const canJustify = o.align === "justify" && !last && !line.hardBreak && line.spaces > 0;
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
      const perSpace = canJustify ? Math.max(0, free) / Math.max(line.spaces, 1) : 0;
      let cx = startX;
      for (const it of line.items) {
        if (it.spaceBefore) cx += it.spaceBefore + perSpace;
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
    o: { size?: number; align?: "left" | "center" | "right" | "justify"; firstIndent?: number; left?: number; gapBefore?: number; gapAfter?: number } = {}
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

  /* ------------- título + tabela de identificação (1ª página) ------------- */

  if (s.report.showCover) {
    const rc = s.report;
    const colW = CW / 2;
    const rowHMin = 0.6 * CM;
    const padX = 6;
    const cellLineH = 13.8;
    const num = rc.activityNumber.trim();
    const authors = s.authors.filter((a) => a.trim()).join("; ");
    const title = `${rc.activityLabel}${num ? ` Nº ${num}` : ""}`;

    // título centralizado e em negrito (16pt), fora da tabela
    paragraph([{ text: title, bold: true }], { align: "center", size: 16, gapAfter: 6 });

    /** quebra o valor em linhas que caibam na largura disponível */
    const wrapWords = (text: string, font: string, size: number, maxWidth: number): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      if (!words.length) return [];
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const cand = cur ? `${cur} ${w}` : w;
        if (!cur || measure(cand, font, size) <= maxWidth) cur = cand;
        else {
          lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    const rowsText: { cells: { label: string; value: string }[] }[] = [
      { cells: [{ label: "Disciplina:", value: rc.disciplina }, { label: "Turma:", value: rc.turma }] },
      { cells: [{ label: "Professor:", value: rc.professor }, { label: "Período:", value: rc.periodo }] },
      { cells: [{ label: "Aluno(s):", value: authors }, { label: "Data da atividade:", value: rc.dataAtividade }] },
    ];

    const tableTop = y;
    let cy = y;
    for (const row of rowsText) {
      // pré-cálculo das linhas de cada célula (rótulo na 1ª linha, valor quebrado ao lado)
      const cellLayout = row.cells.map((c) => {
        const labelW = measure(c.label, f.bold, 12);
        const availFirst = colW - 2 * padX - labelW - 3;
        const availNext = colW - 2 * padX;
        const vLines = wrapWords(c.value, f.regular, 12, availNext);
        // distribui a 1ª palavra na linha do rótulo quando couber
        const lines: string[] = [];
        if (vLines.length) {
          let rest = vLines;
          if (measure(vLines[0], f.regular, 12) <= availFirst) {
            lines.push(vLines[0]);
            rest = vLines.slice(1);
          } else {
            lines.push("");
            rest = vLines;
          }
          // quebra o restante nas larguras corretas
          for (const ln of rest) {
            if (!lines[lines.length - 1]) lines[lines.length - 1] = ln;
            else if (measure(`${lines[lines.length - 1]} ${ln}`, f.regular, 12) <= availNext && lines[lines.length - 1]) {
              lines[lines.length - 1] = `${lines[lines.length - 1]} ${ln}`;
            } else lines.push(ln);
          }
        }
        return { label: c.label, valueLines: lines, labelW };
      });
      const nLines = Math.max(1, ...cellLayout.map((c) => Math.max(1, c.valueLines.length)));
      const rowH = Math.max(rowHMin, nLines * cellLineH + 6);

      for (let i = 0; i < 2; i++) {
        const cell = cellLayout[i];
        const cx = ML + i * colW + padX;
        const firstBaseline = cy + 12.8;
        pdf.font(f.bold).fontSize(12).fillColor("#000000");
        pdf.text(cell.label, cx, firstBaseline, { lineBreak: false, baseline: 0 });
        pdf.font(f.regular).fontSize(12).fillColor("#000000");
        cell.valueLines.forEach((ln, li) => {
          const bx = li === 0 ? cx + cell.labelW + 3 : cx;
          pdf.text(ln, bx, firstBaseline + li * cellLineH, { lineBreak: false, baseline: 0 });
        });
      }
      cy += rowH;
      // linha horizontal após a row
      pdf.moveTo(ML, cy).lineTo(ML + CW, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    }
    // borda externa + divisória central
    pdf.moveTo(ML, tableTop).lineTo(ML + CW, tableTop).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML, tableTop).lineTo(ML, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML + CW, tableTop).lineTo(ML + CW, cy).lineWidth(0.7).strokeColor("#000000").stroke();
    pdf.moveTo(ML + colW, tableTop).lineTo(ML + colW, cy).lineWidth(0.7).strokeColor("#000000").stroke();

    y = cy + 10;
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
    const left = h.centered ? 0 : h.level === 1 ? IND_SEC : IND_SEC + (h.level - 1) * 0.5 * CM;
    if (!h.centered) y += 6; // respiro antes da seção, como no modelo
    paragraph([{ text: display, bold: true }], {
      align: h.centered ? "center" : "left",
      size: 12,
      left,
      firstIndent: h.centered ? 0 : -IND_HANG,
      gapAfter: 2,
    });
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
        const a = b.align;
        const align = a === "center" ? "center" : a === "right" ? "right" : a === "left" ? "left" : "justify";
        paragraph(b.runs, { align, firstIndent: isCalc || a === "center" || a === "right" ? 0 : IND_FIRST });
        break;
      }
      case "pagebreak":
        pdf.addPage();
        y = MT;
        break;
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
        const k = (b.widthPct ?? 100) / 100;
        const imgH = img ? fitImage(img, maxW * k, maxH * k).height : 100;
        // NBR 14724: identificação da figura na parte superior
        if (b.caption) {
          // reserva espaço para a legenda + começo da imagem (evita legenda órfã no fim da página)
          ensureSpace(48 + Math.min(imgH + 40, 240));
          paragraph([{ text: num !== undefined ? `Figura ${num} - ${b.caption}` : b.caption }], { align: "center", size: 12 });
        }
        if (img) {
          const { width, height } = fitImage(img, maxW * k, maxH * k);
          ensureSpace(height + 60);
          const ix = b.align === "left" ? ML : b.align === "right" ? ML + CW - width : ML + (CW - width) / 2;
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
        const fonte = b.sourceNote || s.sourceNote;
        if (fonte) {
          paragraph([{ text: fonte.startsWith("Fonte") ? fonte : `Fonte: ${fonte}` }], {
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

  /* -------- cabeçalho institucional de texto em todas as páginas -------- */

  const green = `#${REPORT.headerGreen}`;
  const gray = `#${REPORT.headerGray}`;

  const total = pdf.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    pdf.switchToPage(i);
    // 1ª linha: instituição — verde, negrito, centralizada
    pdf.font(f.bold).fontSize(12).fillColor(green);
    const w1 = measure(s.report.headerInstitution, f.bold, 12);
    pdf.text(s.report.headerInstitution, ML + (CW - w1) / 2, HDR_Y, { lineBreak: false, baseline: 0 });
    // 2ª linha: curso — cinza, menor, centralizada
    pdf.font(f.regular).fontSize(9).fillColor(gray);
    const w2 = measure(s.report.course, f.regular, 9);
    pdf.text(s.report.course, ML + (CW - w2) / 2, HDR_Y + 17, { lineBreak: false, baseline: 0 });
    // régua verde
    pdf.moveTo(ML, HDR_Y + 30).lineTo(ML + CW, HDR_Y + 30).lineWidth(0.9).strokeColor(green).stroke();
  }

  pdf.flushPages?.();
  pdf.end();
  return finished;
}
