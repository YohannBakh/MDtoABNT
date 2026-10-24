/* ------------------------------------------------------------------
 * MD2ABNT — Gerador DOCX (NBR 14724 / 6022 / 6024 / 10520 / 6023)
 * ------------------------------------------------------------------ */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  NumberFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  SequentialIdentifier,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  Tab,
  WidthType,
} from "docx";
import type {
  AbntDocument,
  Block,
  HeadingBlock,
  InlineRun,
  TableBlock,
} from "./types";
import { fontFamilies, MONO_FONTS } from "./types";
import { fitImage, loadImage } from "./image";

/* medidas em twips (1 cm = 566.93 twips) */
const CM = 566.93;
const PAGE_W = 11906;
const PAGE_H = 16838;
const M_TOP = Math.round(3 * CM);
const M_LEFT = Math.round(3 * CM);
const M_BOTTOM = Math.round(2 * CM);
const M_RIGHT = Math.round(2 * CM);
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // ≈ 9071
const IND_FIRST = Math.round(1.25 * CM); // recuo de primeira linha
const IND_QUOTE = Math.round(4 * CM); // citação longa
const LINE_15 = 360; // 1,5 linha
const LINE_10 = 240; // simples

const px = (twips: number) => Math.round((twips / 20) * (96 / 72)); // twips → px@96dpi

function mainFont(doc: AbntDocument) {
  return fontFamilies(doc.settings.font);
}

/* ------------------------- corridas ------------------------- */

function tr(r: InlineRun, size: number, font: string, mono: string, boldOverride?: boolean): TextRun {
  const opts = {
    text: r.text,
    size: r.code ? 20 : size,
    font: r.code ? mono : font,
    ...(r.bold || boldOverride ? { bold: true } : {}),
    ...(r.italic ? { italics: true } : {}),
    ...(r.underline ? { underline: {} } : {}),
    ...(r.sup ? { superScript: true } : {}),
    ...(r.sub ? { subScript: true } : {}),
  } as ConstructorParameters<typeof TextRun>[0];
  return new TextRun(opts);
}

function runsOf(runs: InlineRun[], size: number, font: string, mono: string, boldOverride?: boolean): TextRun[] {
  return runs.map((r) => tr(r, size, font, mono, boldOverride));
}

function emptyLine(): Paragraph {
  return new Paragraph({ children: [] });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

/* ------------------------- blocos --------------------------- */

function headingParas(h: HeadingBlock, doc: AbntDocument): Paragraph[] {
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;
  const label = h.number ? `${h.number} ` : "";
  const headingLevel =
    h.level === 1 ? HeadingLevel.HEADING_1 : h.level === 2 ? HeadingLevel.HEADING_2 : h.level === 3 ? HeadingLevel.HEADING_3 : h.level === 4 ? HeadingLevel.HEADING_4 : HeadingLevel.HEADING_5;
  const centered = h.centered || !h.number; // elementos especiais centralizados
  const caps = h.level <= 2;
  const bold = h.level === 1 || h.level === 3;
  const italic = h.level === 4 || h.level === 5;
  const p = new Paragraph({
    heading: centered && h.special === null ? undefined : headingLevel,
    alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: h.level === 1 ? 480 : 360, after: h.level === 1 ? 360 : 240, line: LINE_10 },
    keepNext: true,
    children: [
      new TextRun({
        text: `${label}${h.runs.map((r) => r.text).join("")}`,
        size: 24,
        font: f.docx,
        bold,
        italics: italic,
        allCaps: caps,
      }),
    ],
  });
  return [p];
}

function bodyPara(runs: InlineRun[], doc: AbntDocument, opts: { size?: number; indentFirst?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; line?: number; left?: number; after?: number; keepNext?: boolean } = {}): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: opts.align ?? AlignmentType.JUSTIFIED,
    indent: opts.indentFirst ? { firstLine: IND_FIRST } : opts.left !== undefined ? { left: opts.left } : undefined,
    spacing: { line: opts.line ?? LINE_15, after: opts.after ?? 0 },
    keepNext: opts.keepNext,
    children: runsOf(runs, opts.size ?? 24, f.docx, MONO_FONTS.docx),
  });
}

function captionPara(kind: "Figura" | "Tabela", caption: string, doc: AbntDocument, useSeq: boolean, pageBreakBefore = false): Paragraph {
  const f = mainFont(doc);
  const children: (TextRun | SequentialIdentifier)[] = [
    new TextRun({ text: `${kind} `, size: 24, font: f.docx }),
  ];
  if (useSeq) children.push(new SequentialIdentifier(kind));
  children.push(new TextRun({ text: ` – ${caption}`, size: 24, font: f.docx }));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120, line: LINE_10 },
    keepNext: true,
    pageBreakBefore,
    children,
  });
}

function sourcePara(text: string, doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 240, line: LINE_10 },
    children: [new TextRun({ text: text.startsWith("Fonte") ? text : `Fonte: ${text}`, size: 20, font: f.docx })],
  });
}

function tableBlockToDocx(tb: TableBlock, doc: AbntDocument): (Paragraph | Table)[] {
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;
  const out: (Paragraph | Table)[] = [];
  if (tb.caption) out.push(captionPara("Tabela", tb.caption, doc, true));
  const ncols = tb.header.length;
  const colW = Math.floor(CONTENT_W / ncols);
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const hLine = { style: BorderStyle.SINGLE, size: 6, color: "000000" };

  const mkCell = (runs: InlineRun[], align: string, bold: boolean, bottomBorder: boolean) =>
    new TableCell({
      width: { size: colW, type: WidthType.DXA },
      margins: { top: 57, bottom: 57, left: 57, right: 57 },
      borders: { bottom: bottomBorder ? hLine : noBorder },
      children: [
        new Paragraph({
          alignment: align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { line: LINE_10 },
          children: runsOf(runs, 20, f.docx, mono, bold),
        }),
      ],
    });

  const headerRow = new TableRow({
    tableHeader: true,
    children: tb.header.map((c, i) => mkCell(c, "center", true, true)),
  });
  const rows = tb.rows.map(
    (row) =>
      new TableRow({
        children: tb.header.map((_, i) => mkCell(row[i] ?? [], tb.align[i] ?? "left", false, false)),
      })
  );
  out.push(
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: Array(ncols).fill(colW),
      borders: { top: hLine, bottom: hLine, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder },
      rows: [headerRow, ...rows],
    })
  );
  out.push(sourcePara(tb.sourceNote || doc.settings.sourceNote, doc));
  return out;
}

function figureBlocksToDocx(buf: Buffer, kind: "png" | "jpg" | "gif", w: number, h: number, caption: string | undefined, source: string | undefined, doc: AbntDocument): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  if (caption) out.push(captionPara("Figura", caption, doc, true));
  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 120, line: LINE_10 },
      children: [new ImageRun({ type: kind, data: buf, transformation: { width: w, height: h } })],
    })
  );
  out.push(sourcePara(source || doc.settings.sourceNote, doc));
  return out;
}

function listToParas(b: Extract<Block, { type: "list" }>, doc: AbntDocument): Paragraph[] {
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;
  const paras: Paragraph[] = [];
  const alpha = (i: number): string => {
    let s = "";
    let n = i;
    do {
      s = String.fromCharCode(97 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  };
  b.items.forEach((item, idx) => {
    const marker = b.ordered ? `${alpha(idx)}) ` : "– ";
    paras.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { left: 1418, hanging: 709 },
        spacing: { line: LINE_15, after: 60 },
        children: [new TextRun({ text: marker, size: 24, font: f.docx }), ...runsOf(item.runs, 24, f.docx, mono)],
      })
    );
    (item.subItems ?? []).forEach((sub, j) => {
      const smarker = b.ordered ? `${alpha(j + 1)}) ` : "– ";
      paras.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 2126, hanging: 709 },
          spacing: { line: LINE_15, after: 60 },
          children: [new TextRun({ text: smarker, size: 24, font: f.docx }), ...runsOf(sub.runs, 24, f.docx, mono)],
        })
      );
    });
  });
  return paras;
}

function equationPara(runs: InlineRun[], num: number | undefined, doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;
  const children: TextRun[] = [...runsOf(runs, 24, f.docx, mono)];
  if (num !== undefined) {
    children.push(new TextRun({ children: [new Tab(), `(${num})`], size: 24, font: f.docx }));
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    tabStops: num !== undefined ? [{ type: TabStopType.RIGHT, position: CONTENT_W }] : undefined,
    spacing: { before: 120, after: 120, line: LINE_15 },
    children,
  });
}

function codeParas(text: string, doc: AbntDocument): Paragraph[] {
  const f = MONO_FONTS.docx;
  return text.replace(/\t/g, "    ").split("\n").map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_10 },
        children: [new TextRun({ text: line.length ? line : " ", size: 20, font: f })],
      })
  );
}

/* ------------------- elementos pré-textuais ------------------- */

function centered(text: string, doc: AbntDocument, opts: { bold?: boolean; caps?: boolean; size?: number; after?: number } = {}): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: opts.after ?? 0, line: LINE_15 },
    children: [
      new TextRun({
        text: opts.caps ? text.toUpperCase() : text,
        size: opts.size ?? 24,
        font: f.docx,
        bold: opts.bold,
        allCaps: opts.caps,
      }),
    ],
  });
}

function naturezaBlock(doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const kind = doc.settings.department ? `apresentado ao ${doc.settings.department}` : "apresentado à instituição";
  const txt = `Artigo ${kind} da ${doc.settings.institution || "instituição"}, como requisito parcial para a obtenção de nota.`;
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: Math.round(CONTENT_W / 2) },
    spacing: { line: LINE_10 },
    children: [new TextRun({ text: txt, size: 24, font: f.docx })],
  });
}

function keywordsPara(label: string, kws: string[], doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const joined = kws.map((k) => k.replace(/\.$/, "")).join(". ") + (kws.length ? "." : "");
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, line: LINE_10 },
    children: [
      new TextRun({ text: `${label}: `, size: 24, font: f.docx, bold: true }),
      new TextRun({ text: joined, size: 24, font: f.docx }),
    ],
  });
}

function listTitleParas(title: string, doc: AbntDocument): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360, line: LINE_15 },
      children: [new TextRun({ text: title, size: 24, font: mainFont(doc).docx, bold: true, allCaps: true })],
    }),
  ];
}

/* ------------------------- montagem -------------------------- */

export async function buildDocxBlob(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;

  /* ---------- pré-textuais ---------- */

  // CAPA
  const capa: Paragraph[] = [];
  if (t.capa) {
    if (s.institution) capa.push(centered(s.institution, doc, { bold: true, caps: true }));
    if (s.department) capa.push(centered(s.department, doc, { caps: true }));
    for (let i = 0; i < 7; i++) capa.push(emptyLine());
    for (const a of s.authors) capa.push(centered(a, doc));
    for (let i = 0; i < 6; i++) capa.push(emptyLine());
    capa.push(centered(s.title, doc, { bold: true, caps: true, size: 28 }));
    if (s.subtitle) capa.push(centered(s.subtitle, doc, { size: 24 }));
    for (let i = 0; i < 7; i++) capa.push(emptyLine());
    capa.push(centered(s.city, doc));
    capa.push(centered(s.year, doc));
  }

  // FOLHA DE ROSTO
  const rosto: Paragraph[] = [];
  if (t.folhaRosto) {
    if (s.institution) rosto.push(centered(s.institution, doc, { bold: true, caps: true }));
    if (s.department) rosto.push(centered(s.department, doc, { caps: true }));
    for (let i = 0; i < 6; i++) rosto.push(emptyLine());
    for (const a of s.authors) rosto.push(centered(a, doc));
    for (let i = 0; i < 5; i++) rosto.push(emptyLine());
    rosto.push(centered(s.title, doc, { bold: true, caps: true, size: 28 }));
    if (s.subtitle) rosto.push(centered(s.subtitle, doc, { size: 24 }));
    for (let i = 0; i < 4; i++) rosto.push(emptyLine());
    rosto.push(naturezaBlock(doc));
    for (let i = 0; i < 5; i++) rosto.push(emptyLine());
    if (s.advisor) rosto.push(centered(`${s.advisorRole}: ${s.advisor}`, doc));
    if (s.coadvisor) rosto.push(centered(`Coorientador: ${s.coadvisor}`, doc));
    for (let i = 0; i < 3; i++) rosto.push(emptyLine());
    rosto.push(centered(s.city, doc));
    rosto.push(centered(s.year, doc));
  }

  // FOLHA DE APROVAÇÃO
  const aprov: Paragraph[] = [];
  if (t.aprovacao) {
    for (const a of s.authors) aprov.push(centered(a, doc, { bold: true, after: 120 }));
    aprov.push(centered(s.title, doc, { bold: true, caps: true, after: 120 }));
    if (s.subtitle) aprov.push(centered(s.subtitle, doc, { after: 240 }));
    for (let i = 0; i < 4; i++) aprov.push(emptyLine());
    if (s.approvalDate) {
      aprov.push(centered(`Aprovado em ${s.approvalDate}.`, doc, { after: 240 }));
    } else {
      aprov.push(centered("Artigo aprovado pela banca examinadora.", doc, { after: 240 }));
    }
    aprov.push(centered("BANCA EXAMINADORA", doc, { bold: true, after: 240 }));
    for (const m of s.committee) {
      if (!m.trim()) continue;
      aprov.push(centered(m, doc, { after: 60 }));
      aprov.push(emptyLine());
    }
  }

  // RESUMO (NBR 6028)
  const resumo = doc.resumo ?? (t.resumo ? { text: "", keywords: s.keywords } : null);
  const resumoParas: Paragraph[] = [];
  if (resumo && (doc.resumo || (t.resumo && s.keywords.length))) {
    resumoParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240, line: LINE_15 },
        children: [new TextRun({ text: "RESUMO", size: 24, font: f.docx, bold: true, allCaps: true })],
      })
    );
    const text = doc.resumo?.text || "";
    if (text.trim()) {
      for (const par of text.split(/\n\n+/)) {
        resumoParas.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: LINE_10 },
            children: [new TextRun({ text: par, size: 24, font: f.docx })],
          })
        );
      }
    }
    const kws = doc.resumo?.keywords ?? s.keywords;
    if (kws?.length) resumoParas.push(keywordsPara("Palavras-chave", kws, doc));
  }

  // ABSTRACT
  const abstractParas: Paragraph[] = [];
  if (doc.abstractEn) {
    abstractParas.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240, line: LINE_15 },
        children: [new TextRun({ text: "ABSTRACT", size: 24, font: f.docx, bold: true, allCaps: true })],
      })
    );
    for (const par of doc.abstractEn.text.split(/\n\n+/)) {
      abstractParas.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: LINE_10 },
          children: [new TextRun({ text: par, size: 24, font: f.docx })],
        })
      );
    }
    if (doc.abstractEn.keywords?.length) abstractParas.push(keywordsPara("Keywords", doc.abstractEn.keywords, doc));
  }

  /* ---------- corpo ---------- */
  const bodyChildren: (Paragraph | Table)[] = [];
  let eqNum = 0;

  const pushAll = (items: (Paragraph | Table)[]) => {
    bodyChildren.push(...items);
  };

  for (const b of doc.body) {
    switch (b.type) {
      case "heading":
        if (b.special) continue; // resumo/abstract/referências têm páginas próprias
        pushAll(headingParas(b, doc));
        break;
      case "paragraph":
        pushAll([bodyPara(b.runs, doc, { indentFirst: true, align: AlignmentType.JUSTIFIED })]);
        break;
      case "blockquote":
        pushAll([
          bodyPara(b.runs, doc, { size: 20, left: IND_QUOTE, align: AlignmentType.JUSTIFIED, line: LINE_10, after: 120 }),
        ]);
        break;
      case "list":
        pushAll(listToParas(b, doc));
        break;
      case "code":
        pushAll(codeParas(b.text, doc));
        break;
      case "equation":
        if (s.toggles.numberEquations) eqNum++;
        pushAll([equationPara(b.runs, s.toggles.numberEquations ? eqNum : undefined, doc)]);
        break;
      case "table": {
        const items = tableBlockToDocx(b, doc);
        pushAll(items);
        break;
      }
      case "figure": {
        const img = await loadImage(b.src);
        const maxW = px(CONTENT_W);
        const maxH = px(PAGE_H - M_TOP - M_BOTTOM) - 200;
        if (img) {
          const { width, height } = fitImage(img, maxW, maxH);
          pushAll(figureBlocksToDocx(img.buf, img.kind, width, height, b.caption, b.sourceNote, doc));
        } else {
          // espaço reservado
          if (b.caption) pushAll([captionPara("Figura", b.caption, doc, true)]);
          pushAll([
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 120, line: LINE_10 },
              children: [
                new TextRun({
                  text: `[ imagem não disponível: ${b.src.slice(0, 60)} ]`,
                  size: 20,
                  font: mono,
                  italics: true,
                }),
              ],
            }),
          ]);
          pushAll([sourcePara(b.sourceNote || s.sourceNote, doc)]);
        }
        break;
      }
      default:
        break;
    }
  }

  // REFERÊNCIAS (NBR 6023)
  if (doc.references.length) {
    bodyChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 360, line: LINE_10 },
        keepNext: true,
        children: [new TextRun({ text: "REFERÊNCIAS", size: 24, font: f.docx, bold: true, allCaps: true })],
      })
    );
    for (const entry of doc.references) {
      bodyChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_10, after: 240 },
          children: runsOf(entry, 24, f.docx, mono),
        })
      );
    }
  }

  /* ---------- numeração estimada da parte textual ---------- */
  // ABNT: a folha de rosto conta como página 1; a capa não é contada.
  const countedPre =
    (t.folhaRosto ? 1 : 0) +
    (t.aprovacao ? 1 : 0) +
    (resumoParas.length ? 1 : 0) +
    (abstractParas.length ? 1 : 0) +
    (t.listaFiguras && doc.figures.length ? 1 : 0) +
    (t.listaTabelas && doc.tables.length ? 1 : 0) +
    (t.sumario ? 1 : 0);

  const pageNumHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: [PageNumber.CURRENT], size: 24, font: f.docx })],
      }),
    ],
  });
  const emptyHeader = new Header({ children: [new Paragraph({ children: [] })] });

  const pageProps = {
    page: {
      size: { width: PAGE_W, height: 16838 },
      margin: { top: M_TOP, right: M_RIGHT, bottom: M_BOTTOM, left: M_LEFT, header: Math.round(2 * CM), footer: 709 },
    },
  };

  /* ---------- seções ---------- */
  const allPre: Paragraph[] = [];
  const preBlocks = [capa, rosto, aprov, resumoParas, abstractParas];
  for (const blk of preBlocks) {
    if (!blk.length) continue;
    if (allPre.length) allPre.push(pageBreak());
    allPre.push(...blk);
  }
  // listas de figuras/tabelas + sumário
  const endPre: (Paragraph | TableOfContents)[] = [];
  if (t.listaFiguras && doc.figures.length) {
    endPre.push(...listTitleParas("Lista de Figuras", doc));
    endPre.push(
      new TableOfContents("Figuras", { captionLabelIncludingNumbers: "Figura", hyperlink: true })
    );
  }
  if (t.listaTabelas && doc.tables.length) {
    if (endPre.length) endPre.push(pageBreak());
    endPre.push(...listTitleParas("Lista de Tabelas", doc));
    endPre.push(
      new TableOfContents("Tabelas", { captionLabelIncludingNumbers: "Tabela", hyperlink: true })
    );
  }
  if (t.sumario) {
    if (endPre.length) endPre.push(pageBreak());
    endPre.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 360, line: LINE_15 },
        children: [new TextRun({ text: "SUMÁRIO", size: 24, font: f.docx, bold: true, allCaps: true })],
      })
    );
    endPre.push(new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-4" }));
  }

  const styles = {
    default: {
      document: {
        run: { font: f.docx, size: 24, color: "000000" },
        paragraph: { spacing: { line: LINE_15 } },
      },
      heading1: { run: { font: f.docx, size: 24, bold: true, color: "000000" } },
      heading2: { run: { font: f.docx, size: 24, color: "000000" } },
      heading3: { run: { font: f.docx, size: 24, bold: true, color: "000000" } },
      heading4: { run: { font: f.docx, size: 24, italics: true, color: "000000" } },
      heading5: { run: { font: f.docx, size: 24, color: "000000" } },
    },
  };

  const docProps = {
    creator: "MD2ABNT",
    title: s.title,
    description: "Documento gerado automaticamente nos padrões ABNT",
    styles,
  };

  if (t.pageNumberAll) {
    // numeração física em todas as páginas, oculta na capa
    const document = new Document({
      ...docProps,
      sections: [
        {
          properties: { ...pageProps, titlePage: true },
          headers: { default: pageNumHeader, first: emptyHeader },
          children: [...allPre, ...endPre, ...bodyChildren],
        },
      ],
    });
    return Packer.toBuffer(document);
  }

  // numeração exibida apenas na parte textual (contando a folha de rosto como 1)
  const bodyStart = countedPre + 1;
  const document = new Document({
    ...docProps,
    sections: [
      {
        properties: { ...pageProps },
        headers: { default: emptyHeader },
        children: [...allPre, ...endPre],
      },
      {
        properties: { ...pageProps, page: { ...pageProps.page, pageNumbers: { start: bodyStart, formatType: NumberFormat.DECIMAL } } },
        headers: { default: pageNumHeader },
        children: bodyChildren,
      },
    ],
  });
  return Packer.toBuffer(document);
}
