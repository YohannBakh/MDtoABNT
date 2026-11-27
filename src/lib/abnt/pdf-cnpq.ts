/* ------------------------------------------------------------------
 * MD2ABNT — Gerador PDF no estilo Relatório CNPq (modelo IFC)
 * Mesma estrutura do DOCX: cabeçalho com logo IF + bloco ministerial
 * em todas as páginas, capa, RESUMO, corpo justificado 1,15, tabelas
 * com grade completa, referências à esquerda e formulário “Avaliação
 * Geral do Projeto” com respostas em caixas + linhas de assinatura.
 * ------------------------------------------------------------------ */
import PDFDocument from "pdfkit";
import type { AbntDocument, Block, HeadingBlock, InlineRun, TableBlock } from "./types";
import { CNPQ, fontFamilies, MONO_FONTS } from "./types";
import { fitImage, loadImage } from "./image";
import { LOGO_IF_BASE64 } from "./logos";

type PdfFontMap = { regular: string; bold: string; italic: string; boldItalic: string };

const CM = 28.3465; // pt por cm
const MT = CNPQ.margin.top * CM;
const MB = CNPQ.margin.bottom * CM;
const ML = CNPQ.margin.left * CM;
const MR = CNPQ.margin.right * CM;
const HDR_Y = CNPQ.headerTop * CM;
const IND_FIRST = CNPQ.firstLineIndent * CM;
const LINE_FACTOR = CNPQ.lineFactor;

interface Token {
  text: string;
  font: string;
  size: number;
  sup?: boolean;
  sub?: boolean;
  isSpace?: boolean;
  isBreak?: boolean;
}

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

export async function buildCnpqPdfBuffer(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;
  const c = s.cnpq;
  const f = fontFamilies(s.font).pdf;
  const mono = MONO_FONTS.pdf;

  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: MT, left: ML, bottom: MB, right: MR },
    bufferPages: true,
    info: { Title: `${c.reportKind} — ${s.title}`, Author: s.authors.join(", "), Creator: "MD2ABNT" },
  });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
  });

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

  const lineH12 = LINE_FACTOR * 12 * 1.15;
  const spacer = (nLines: number): void => {
    y += nLines * lineH12;
  };

  /* --------------------------- capa --------------------------- */

  const caps = (text: string) => text.toUpperCase();
  const centeredBold = (text: string, opts: { caps?: boolean; size?: number } = {}): void => {
    paragraph([{ text: opts.caps !== false ? caps(text) : text, bold: true }], {
      align: "center",
      size: opts.size ?? 12,
    });
  };

  if (c.showCover) {
    centeredBold(s.institution);
    centeredBold(c.campus);
    if (s.department.trim()) centeredBold(s.department);

    spacer(6);
    centeredBold(s.title);
    if (s.subtitle.trim()) centeredBold(s.subtitle, { caps: false });

    spacer(4);
    for (const a of s.authors.filter((x) => x.trim())) centeredBold(a, { caps: false });

    spacer(5);
    const edital = c.edital.trim() ? ` em cumprimento à exigência do Edital ${c.edital.trim()}` : "";
    paragraph([{ text: `${c.reportKind} apresentado ao ${s.institution}${edital}.` }], {
      align: "justify",
      left: CNPQ.presentIndent * CM,
    });
    spacer(1);
    if (s.advisor.trim()) {
      paragraph([{ text: `${s.advisorRole}: ${s.advisor.trim()}.` }], { align: "left", left: CNPQ.presentIndent * CM });
    }
    if (s.coadvisor.trim()) {
      paragraph([{ text: `Coorientador: ${s.coadvisor.trim()}.` }], { align: "left", left: CNPQ.presentIndent * CM });
    }

    spacer(8);
    centeredBold(s.city);
    if (c.monthYear.trim()) centeredBold(c.monthYear);
    else if (s.year.trim()) centeredBold(s.year);
    pdf.addPage();
    y = MT;
  }

  /* --------------------------- resumo --------------------------- */

  const resumo = doc.resumo;
  const kws = (resumo?.keywords ?? s.keywords).filter((k) => k.trim());
  if (resumo && (resumo.text.trim() || kws.length)) {
    paragraph([{ text: "RESUMO", bold: true }], { align: "left", gapAfter: 10 });
    for (const par of resumo.text.split(/\n\n+/).filter((p) => p.trim())) {
      paragraph([{ text: par.trim() }], { align: "justify", firstIndent: IND_FIRST });
    }
    if (kws.length) {
      paragraph(
        [{ text: "PALAVRAS-CHAVE: ", bold: true }, { text: `${kws.map((k) => k.replace(/\.$/, "")).join(", ")}.` }],
        { align: "justify", gapBefore: 10 }
      );
    }
    if (c.showCover) {
      pdf.addPage();
      y = MT;
    } else {
      spacer(1);
    }
  }

  /* --------------------------- corpo --------------------------- */

  const renderHeading = (h: HeadingBlock): void => {
    ensureSpace(3 * lineH12);
    const text = h.runs.map((r) => r.text).join("");
    const label = h.number ? (h.level === 1 ? `${h.number}. ` : `${h.number} `) : "";
    const display = `${label}${h.level <= 2 ? text.toUpperCase() : text}`;
    y += 6;
    paragraph([{ text: display, bold: true }], { align: h.centered ? "center" : "left", gapAfter: 4 });
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
    for (let col = 0; col < ncols; col++) {
      natural[col] = Math.max(natural[col], maxOf(tb.header[col] ?? []) + 2 * pad);
      for (const row of tb.rows) natural[col] = Math.max(natural[col], maxOf(row[col] ?? []) + 2 * pad);
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
      for (let col = 0; col < ncols; col++) {
        const wAvail = colW[col] - 2 * pad;
        const runs = (row[col] ?? []).map((r) => (header ? { ...r, bold: true } : { ...r }));
        const toks = tokenize(runs, f, mono, fs);
        const lines = assembleLines(toks, wAvail);
        linesPerCol.push(lines);
        maxLines = Math.max(maxLines, lines.length);
      }
      const rowH = maxLines * lineH + 2 * pad;
      rowTops.push(y);
      let cy = y + pad;
      for (let col = 0; col < ncols; col++) {
        const cx = ML + colW.slice(0, col).reduce((a, b) => a + b, 0) + pad;
        for (const line of linesPerCol[col]) {
          const free = colW[col] - 2 * pad - line.width;
          const alignCol = header || (tb.align[col] ?? "left") === "center" ? "center" : (tb.align[col] ?? "left") === "right" ? "right" : "left";
          const sx = alignCol === "center" ? cx + free / 2 : alignCol === "right" ? cx + free : cx;
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
    for (let col = 0; col < ncols - 1; col++) {
      acc += colW[col];
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
        const a = b.align;
        const align = a === "center" ? "center" : a === "right" ? "right" : a === "left" ? "left" : "justify";
        paragraph(b.runs, { align, firstIndent: a === "center" || a === "right" ? 0 : IND_FIRST });
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
          const marker = b.ordered ? `${idx + 1}. ` : "– ";
          const markerW = measure(marker, f.regular, 12);
          const firstBaseline = y + baselineOf(12);
          paragraph(item.runs, { align: "left", left: IND_FIRST + markerW, firstIndent: 0 });
          pdf.font(f.regular).fontSize(12).fillColor("#000000");
          pdf.text(marker, ML + IND_FIRST, firstBaseline, { lineBreak: false, baseline: 0 });
          (item.subItems ?? []).forEach((sub) => {
            ensureSpace(2 * 20);
            const fb = y + baselineOf(12);
            paragraph(sub.runs, { align: "left", left: IND_FIRST + 0.5 * CM + markerW, firstIndent: 0 });
            pdf.font(f.regular).fontSize(12).fillColor("#000000");
            pdf.text("– ", ML + IND_FIRST + 0.5 * CM, fb, { lineBreak: false, baseline: 0 });
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
          pdf.text(line.length ? line : " ", ML + 1.25 * CM, y + baselineOf(10), { lineBreak: false, baseline: 0 });
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
        if (b.caption) {
          ensureSpace(60);
          paragraph([{ text: num !== undefined ? `Figura ${num} - ${b.caption}` : b.caption }], {
            align: "center",
            size: 12,
            gapBefore: 8,
          });
        }
        if (img) {
          const { width, height } = fitImage(img, maxW, maxH);
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
    paragraph([{ text: "REFERÊNCIAS", bold: true }], { align: "left", size: 12, gapAfter: 12 });
    for (const entry of doc.references) {
      paragraph(entry, { align: "left", size: 12, gapAfter: 10 });
    }
  }

  /* ------------- Avaliação Geral do Projeto (formulário) ------------- */

  const av = c.avaliacao;
  if (Object.values(av).some((v) => v.trim())) {
    ensureSpace(120);
    y += 24;
    paragraph([{ text: "AVALIAÇÃO GERAL DO PROJETO", bold: true }], { align: "center", size: 12, gapAfter: 14 });

    const question = (parts: { text: string; bold?: boolean }[], opts: { gapBefore?: number } = {}): void => {
      paragraph(parts.map((p) => ({ text: p.text, bold: p.bold })), { align: "justify", gapBefore: opts.gapBefore ?? 10, gapAfter: 4 });
    };

    /** resposta em caixa: desenha o texto e uma moldura em volta */
    const answerBox = (answer: string): void => {
      const paras = answer
        .split(/\n\n+/)
        .filter((p) => p.trim())
        .map((p) => p.trim());
      const boxTop = y - 2;
      if (!paras.length) {
        y += lineH12;
      } else {
        for (const p of paras) {
          paragraph([{ text: p }], { align: "justify", firstIndent: IND_FIRST });
        }
      }
      y += 2;
      pdf.rect(ML, boxTop, CW, y - boxTop).lineWidth(0.8).strokeColor("#000000").stroke();
      y += 6;
    };

    question([{ text: "1. Descreva os principais obstáculos e dificuldades encontrados na pesquisa:", bold: true }]);
    answerBox(av.obstaculos);

    question([{ text: "2. Preencha os campos abaixo se a pesquisa envolver os itens relacionados:", bold: true }], { gapBefore: 14 });
    question([{ text: "2.1. Material químico ou genético:", bold: true }, { text: " discrimine a quantidade utilizada e a forma de descarte do material ao término da pesquisa." }]);
    answerBox(av.materialQuimico);
    question([{ text: "2.2. Meio ambiente:", bold: true }, { text: " descreva se, durante o desenvolvimento do trabalho, houve algum tipo de agressão ou violação do equilíbrio ecológico e ambiental." }]);
    answerBox(av.meioAmbiente);

    question([{ text: "3. Descreva se houve contribuições da pesquisa para:", bold: true }], { gapBefore: 14 });
    question([{ text: "3.1. O desenvolvimento científico e tecnológico" }], { gapBefore: 6 });
    answerBox(av.devCientifico);
    question([{ text: "3.2. A capacitação de recursos humanos e sua fixação na área do projeto" }], { gapBefore: 6 });
    answerBox(av.capacitacao);
    question([{ text: "3.3. A transferência de conhecimentos ou geração de novos produtos, tecnologias ou patentes" }], { gapBefore: 6 });
    answerBox(av.transferencia);

    question(
      [
        { text: "4. Parecer do coordenador", bold: true },
        { text: " Relato das atividades desenvolvidas pelo aluno e seu rendimento acadêmico." },
      ],
      { gapBefore: 14 }
    );
    answerBox(av.parecerCoordenador);

    /** linha de assinatura centralizada + rótulo abaixo */
    const signature = (label: string): void => {
      ensureSpace(90);
      y += 34;
      const lineW = 9.4 * CM;
      const x1 = ML + (CW - lineW) / 2;
      pdf.moveTo(x1, y).lineTo(x1 + lineW, y).lineWidth(0.8).strokeColor("#000000").stroke();
      y += 14;
      paragraph([{ text: label }], { align: "center", size: 12 });
    };
    signature("Assinatura do Coordenador do Projeto");
    signature("Assinatura do Bolsista");
    signature("Assinatura do Coordenador de Pesquisa do campus");
  }

  /* -------- cabeçalho: logo IF + bloco ministerial em todas as páginas -------- */

  const logoBuf = Buffer.from(LOGO_IF_BASE64.slice(LOGO_IF_BASE64.indexOf(",") + 1), "base64");
  const logoW = CNPQ.logoWidth * CM;
  const logoH = CNPQ.logoHeight * CM;
  const ministery: string[] = [c.ministry1, c.ministry2, s.institution].map((l) => l.toUpperCase());
  const minZoneX = ML + logoW + 0.8 * CM;
  const minZoneW = ML + CW - minZoneX;

  const total = pdf.bufferedPageRange().count;
  for (let i = 0; i < total; i++) {
    pdf.switchToPage(i);
    try {
      pdf.image(logoBuf, ML + 0.2 * CM, HDR_Y, { width: logoW, height: logoH });
    } catch {
      /* ignora falha de imagem */
    }
    pdf.font(f.bold).fontSize(CNPQ.headerSize).fillColor("#000000");
    let hy = HDR_Y + 2;
    for (const line of ministery) {
      const lw = measure(line, f.bold, CNPQ.headerSize);
      pdf.text(line, minZoneX + (minZoneW - lw) / 2, hy, { lineBreak: false, baseline: 0 });
      hy += 12;
    }
  }

  pdf.flushPages?.();
  pdf.end();
  return finished;
}
