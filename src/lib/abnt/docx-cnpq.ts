/* ------------------------------------------------------------------
 * MD2ABNT — Gerador DOCX no estilo Relatório CNPq (modelo IFC)
 * Cabeçalho com logo IF + bloco ministerial em todas as páginas,
 * capa própria (instituição/campus/curso, título, autor, apresentação
 * com edital e orientador, cidade/mês-ano), RESUMO com PALAVRAS-CHAVE,
 * seções numeradas em negrito, referências à esquerda e o formulário
 * “Avaliação Geral do Projeto” com respostas em caixas + assinaturas.
 * ------------------------------------------------------------------ */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  Tab,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { AbntDocument, Align, Block, InlineRun, TableBlock } from "./types";
import { CNPQ, fontFamilies, MONO_FONTS } from "./types";
import { runsOf } from "./docx";
import { fitImage, loadImage } from "./image";
import { LOGO_IF_BASE64 } from "./logos";

const CM = 566.93;
const PAGE_W = 11906;
const PAGE_H = 16838;
const M_TOP = Math.round(CNPQ.margin.top * CM);
const M_BOTTOM = Math.round(CNPQ.margin.bottom * CM);
const M_LEFT = Math.round(CNPQ.margin.left * CM);
const M_RIGHT = Math.round(CNPQ.margin.right * CM);
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // ≈ 9638 twips (17 cm)
const LINE_115 = CNPQ.lineDocx;
const IND_FIRST = Math.round(CNPQ.firstLineIndent * CM);

const px = (twips: number) => Math.round((twips / 20) * (96 / 72));

const gridBorder = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const gridBorders = {
  top: gridBorder,
  bottom: gridBorder,
  left: gridBorder,
  right: gridBorder,
  insideHorizontal: gridBorder,
  insideVertical: gridBorder,
};
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const tableNoBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};

function mainFont(doc: AbntDocument) {
  return fontFamilies(doc.settings.font);
}

/* --------------- cabeçalho: logo IF + bloco ministerial --------------- */
function cnpqHeader(doc: AbntDocument): Header {
  const c = doc.settings.cnpq;
  const f = mainFont(doc);
  const logoBuf = Buffer.from(LOGO_IF_BASE64.slice(LOGO_IF_BASE64.indexOf(",") + 1), "base64");
  const logoW = px(Math.round(CNPQ.logoWidth * CM));
  const logoH = px(Math.round(CNPQ.logoHeight * CM));
  const line = (text: string, last: boolean) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: last ? 0 : 20, line: 220 },
      children: [new TextRun({ text, size: CNPQ.headerSize * 2, font: f.docx, bold: true })],
    });
  const leftW = Math.round(CONTENT_W * 0.38);
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [leftW, CONTENT_W - leftW],
        borders: tableNoBorders,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: leftW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                borders: tableNoBorders,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.LEFT,
                    spacing: { line: 220 },
                    children: [new ImageRun({ type: "png", data: logoBuf, transformation: { width: logoW, height: logoH } })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: CONTENT_W - leftW, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                borders: tableNoBorders,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                children: [line(c.ministry1, false), line(c.ministry2, false), line(doc.settings.institution, true)],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ----------------------------- capa ----------------------------- */

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { line: LINE_115 }, children: [] });
}

function coverCentered(text: string, doc: AbntDocument, opts: { caps?: boolean; bold?: boolean } = {}): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: LINE_115 },
    children: [new TextRun({ text: opts.caps !== false ? text.toUpperCase() : text, size: 24, font: f.docx, bold: opts.bold })],
  });
}

function coverParas(doc: AbntDocument): (Paragraph | Table)[] {
  const s = doc.settings;
  const c = s.cnpq;
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [];

  // bloco institucional
  out.push(coverCentered(s.institution, doc, { bold: true }));
  out.push(coverCentered(c.campus, doc, { bold: true }));
  if (s.department.trim()) out.push(coverCentered(s.department, doc, { bold: true }));

  // título
  for (let i = 0; i < 7; i++) out.push(emptyLine());
  out.push(coverCentered(s.title, doc, { bold: true }));
  if (s.subtitle.trim()) out.push(coverCentered(s.subtitle, doc, { bold: false }));

  // autores
  for (let i = 0; i < 4; i++) out.push(emptyLine());
  for (const a of s.authors.filter((x) => x.trim())) out.push(coverCentered(a, doc, { bold: true, caps: false }));

  // apresentação + orientador (bloco recuado à direita, justificado)
  for (let i = 0; i < 5; i++) out.push(emptyLine());
  const indent = { left: Math.round(CNPQ.presentIndent * CM) };
  const edital = c.edital.trim() ? ` em cumprimento à exigência do Edital ${c.edital.trim()}` : "";
  const apresentacao = `${c.reportKind} apresentado ao ${s.institution}${edital}.`;
  out.push(
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      indent,
      spacing: { line: LINE_115 },
      children: [new TextRun({ text: apresentacao, size: 24, font: f.docx })],
    })
  );
  out.push(emptyLine());
  if (s.advisor.trim()) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent,
        spacing: { line: LINE_115 },
        children: [new TextRun({ text: `${s.advisorRole}: ${s.advisor.trim()}.`, size: 24, font: f.docx })],
      })
    );
  }
  if (s.coadvisor.trim()) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent,
        spacing: { line: LINE_115 },
        children: [new TextRun({ text: `Coorientador: ${s.coadvisor.trim()}.`, size: 24, font: f.docx })],
      })
    );
  }

  // cidade + mês/ano no rodapé da capa
  for (let i = 0; i < 9; i++) out.push(emptyLine());
  out.push(coverCentered(s.city, doc, { bold: true }));
  if (c.monthYear.trim()) out.push(coverCentered(c.monthYear, doc, { bold: true }));
  else if (s.year.trim()) out.push(coverCentered(s.year, doc, { bold: true }));
  return out;
}

/* --------------------------- resumo --------------------------- */

function resumoParas(doc: AbntDocument): (Paragraph | Table)[] {
  const resumo = doc.resumo;
  if (!resumo || (!resumo.text.trim() && !(resumo.keywords ?? doc.settings.keywords).length)) return [];
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 200, line: LINE_115 },
      children: [new TextRun({ text: "RESUMO", size: 24, font: f.docx, bold: true })],
    }),
  ];
  if (resumo.text.trim()) {
    for (const par of resumo.text.split(/\n\n+/).filter((p) => p.trim())) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { firstLine: IND_FIRST },
          spacing: { line: LINE_115 },
          children: [new TextRun({ text: par, size: 24, font: f.docx })],
        })
      );
    }
  }
  const kws = (resumo.keywords ?? doc.settings.keywords).filter((k) => k.trim());
  if (kws.length) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 200, line: LINE_115 },
        children: [
          new TextRun({ text: "PALAVRAS-CHAVE: ", size: 24, font: f.docx, bold: true }),
          new TextRun({ text: `${kws.map((k) => k.replace(/\.$/, "")).join(", ")}.`, size: 24, font: f.docx }),
        ],
      })
    );
  }
  return out;
}

/* ----------------------------- blocos ----------------------------- */

function headingPara(h: Extract<Block, { type: "heading" }>, doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const label = h.number ? (h.level === 1 ? `${h.number}. ` : `${h.number} `) : "";
  const text = h.runs.map((r) => r.text).join("");
  const caps = h.level <= 2;
  return new Paragraph({
    alignment: h.centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 240, after: 60, line: LINE_115 },
    keepNext: true,
    children: [
      ...(label ? [new TextRun({ text: label, size: 24, font: f.docx, bold: true })] : []),
      new TextRun({ text: caps ? text.toUpperCase() : text, size: 24, font: f.docx, bold: true }),
    ],
  });
}

function bodyPara(runs: InlineRun[], doc: AbntDocument, align?: Align): Paragraph {
  const f = mainFont(doc);
  const alignment =
    align === "center"
      ? AlignmentType.CENTER
      : align === "right"
        ? AlignmentType.RIGHT
        : align === "left"
          ? AlignmentType.LEFT
          : AlignmentType.JUSTIFIED;
  const noIndent = align === "center" || align === "right";
  return new Paragraph({
    alignment,
    indent: noIndent ? undefined : { firstLine: IND_FIRST },
    spacing: { line: LINE_115 },
    children: runsOf(runs, 24, f.docx, MONO_FONTS.docx),
  });
}

function blockquotePara(runs: InlineRun[], doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: Math.round(4 * CM) },
    spacing: { line: LINE_115, after: 120 },
    children: runsOf(runs, 24, f.docx, MONO_FONTS.docx),
  });
}

function listParas(b: Extract<Block, { type: "list" }>, doc: AbntDocument): Paragraph[] {
  const f = mainFont(doc);
  const paras: Paragraph[] = [];
  b.items.forEach((item, idx) => {
    const marker = b.ordered ? `${idx + 1}. ` : "– ";
    paras.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        indent: { left: IND_FIRST, hanging: Math.round(0.64 * CM) },
        spacing: { line: LINE_115, after: 60 },
        children: [new TextRun({ text: marker, size: 24, font: f.docx }), ...runsOf(item.runs, 24, f.docx, MONO_FONTS.docx)],
      })
    );
    (item.subItems ?? []).forEach((sub) => {
      paras.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: IND_FIRST + 567, hanging: Math.round(0.64 * CM) },
          spacing: { line: LINE_115, after: 60 },
          children: [new TextRun({ text: "– ", size: 24, font: f.docx }), ...runsOf(sub.runs, 24, f.docx, MONO_FONTS.docx)],
        })
      );
    });
  });
  return paras;
}

function codeParas(text: string, doc: AbntDocument): Paragraph[] {
  const f = MONO_FONTS.docx;
  return text
    .replace(/\t/g, "    ")
    .split("\n")
    .map(
      (line) =>
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: Math.round(1.25 * CM) },
          spacing: { line: LINE_115 },
          children: [new TextRun({ text: line.length ? line : " ", size: 20, font: f })],
        })
    );
}

function equationPara(runs: InlineRun[], num: number | undefined, doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const children: TextRun[] = [...runsOf(runs, 24, f.docx, MONO_FONTS.docx)];
  if (num !== undefined) {
    children.push(new TextRun({ children: [new Tab(), `(${num})`], size: 24, font: f.docx }));
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    tabStops: num !== undefined ? [{ type: TabStopType.RIGHT, position: CONTENT_W }] : undefined,
    spacing: { before: 120, after: 120, line: LINE_115 },
    children,
  });
}

/* figuras: legenda ACIMA (padrão CNPq/NBR), fonte abaixo */
function figureBlocks(buf: Buffer, kind: "png" | "jpg" | "gif", w: number, h: number, caption: string | undefined, num: number | undefined, source: string | undefined, doc: AbntDocument, align?: Align): (Paragraph | Table)[] {
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [];
  if (caption) {
    const label = num !== undefined ? `Figura ${num} - ${caption}` : caption;
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, line: LINE_115 },
        keepNext: true,
        children: [new TextRun({ text: label, size: 24, font: f.docx })],
      })
    );
  }
  out.push(
    new Paragraph({
      alignment: align === "left" ? AlignmentType.LEFT : align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER,
      spacing: { after: source ? 40 : 120, line: LINE_115 },
      children: [new ImageRun({ type: kind, data: buf, transformation: { width: w, height: h } })],
    })
  );
  if (source) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120, line: LINE_115 },
        children: [new TextRun({ text: source.startsWith("Fonte") ? source : `Fonte: ${source}`, size: 24, font: f.docx })],
      })
    );
  }
  return out;
}

/* tabelas: grade completa, legenda acima, fonte abaixo */
function tableBlocks(tb: TableBlock, doc: AbntDocument): (Paragraph | Table)[] {
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [];
  if (tb.caption) {
    const label = tb.num !== undefined ? `Tabela ${tb.num} - ${tb.caption}` : tb.caption;
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 60, line: LINE_115 },
        keepNext: true,
        children: [new TextRun({ text: label, size: 24, font: f.docx })],
      })
    );
  }
  const ncols = Math.max(tb.header.length, ...tb.rows.map((r) => r.length));
  const colW = Math.floor(CONTENT_W / ncols);
  const mkCell = (runs: InlineRun[], align: string, header: boolean) =>
    new TableCell({
      width: { size: colW, type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: header || align === "center" ? AlignmentType.CENTER : align === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          spacing: { line: LINE_115 },
          children: runsOf(runs, 24, f.docx, MONO_FONTS.docx, header),
        }),
      ],
    });
  const rows = [
    new TableRow({
      tableHeader: true,
      children: tb.header.map((c) => mkCell(c, "center", true)),
    }),
    ...tb.rows.map(
      (row) =>
        new TableRow({
          children: tb.header.map((_, i) => mkCell(row[i] ?? [], tb.align[i] ?? "left", false)),
        })
    ),
  ];
  out.push(
    new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: Array(ncols).fill(colW),
      borders: gridBorders,
      rows,
    })
  );
  if (tb.sourceNote) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, line: LINE_115 },
        children: [new TextRun({ text: tb.sourceNote.startsWith("Fonte") ? tb.sourceNote : `Fonte: ${tb.sourceNote}`, size: 24, font: f.docx })],
      })
    );
  }
  return out;
}

/* ------------- Avaliação Geral do Projeto (formulário CNPq) ------------- */

const boxLine = (text: string, doc: AbntDocument): Paragraph => {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: IND_FIRST },
    spacing: { line: LINE_115 },
    children: [new TextRun({ text, size: 24, font: f.docx })],
  });
};

function answerBox(answer: string, doc: AbntDocument): Table {
  const paras = answer
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => boxLine(p.trim(), doc));
  if (!paras.length) {
    paras.push(
      new Paragraph({
        spacing: { line: LINE_115 },
        children: [new TextRun({ text: " ", size: 24, font: mainFont(doc).docx })],
      })
    );
  }
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    borders: gridBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: paras,
          }),
        ],
      }),
    ],
  });
}

function questionLine(runs: { text: string; bold?: boolean }[], doc: AbntDocument, opts: { before?: number; after?: number; indent?: boolean } = {}): Paragraph {
  const f = mainFont(doc);
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: opts.indent ? { firstLine: IND_FIRST } : undefined,
    spacing: { before: opts.before ?? 160, after: opts.after ?? 60, line: LINE_115 },
    children: runs.map((r) => new TextRun({ text: r.text, size: 24, font: f.docx, bold: r.bold })),
  });
}

function avaliacaoBlocks(doc: AbntDocument): (Paragraph | Table)[] {
  const av = doc.settings.cnpq.avaliacao;
  const filled = Object.values(av).some((v) => v.trim());
  if (!filled) return [];
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [];

  out.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 240, line: LINE_115 },
      keepNext: true,
      children: [new TextRun({ text: "AVALIAÇÃO GERAL DO PROJETO", size: 24, font: f.docx, bold: true })],
    })
  );

  // 1. Obstáculos e dificuldades
  out.push(questionLine([{ text: "1. Descreva os principais obstáculos e dificuldades encontrados na pesquisa:", bold: true }], doc));
  out.push(answerBox(av.obstaculos, doc));

  // 2. Itens relacionados
  out.push(questionLine([{ text: "2. Preencha os campos abaixo se a pesquisa envolver os itens relacionados:", bold: true }], doc, { before: 240 }));
  out.push(
    questionLine(
      [
        { text: "2.1. Material químico ou genético:", bold: true },
        { text: " discrimine a quantidade utilizada e a forma de descarte do material ao término da pesquisa." },
      ],
      doc
    )
  );
  out.push(answerBox(av.materialQuimico, doc));
  out.push(
    questionLine(
      [
        { text: "2.2. Meio ambiente:", bold: true },
        { text: " descreva se, durante o desenvolvimento do trabalho, houve algum tipo de agressão ou violação do equilíbrio ecológico e ambiental." },
      ],
      doc
    )
  );
  out.push(answerBox(av.meioAmbiente, doc));

  // 3. Contribuições da pesquisa
  out.push(questionLine([{ text: "3. Descreva se houve contribuições da pesquisa para:", bold: true }], doc, { before: 240 }));
  out.push(questionLine([{ text: "3.1. O desenvolvimento científico e tecnológico" }], doc, { before: 120 }));
  out.push(answerBox(av.devCientifico, doc));
  out.push(questionLine([{ text: "3.2. A capacitação de recursos humanos e sua fixação na área do projeto" }], doc, { before: 120 }));
  out.push(answerBox(av.capacitacao, doc));
  out.push(questionLine([{ text: "3.3. A transferência de conhecimentos ou geração de novos produtos, tecnologias ou patentes" }], doc, { before: 120 }));
  out.push(answerBox(av.transferencia, doc));

  // 4. Parecer do coordenador
  out.push(
    questionLine(
      [
        { text: "4. Parecer do coordenador", bold: true },
        { text: " Relato das atividades desenvolvidas pelo aluno e seu rendimento acadêmico." },
      ],
      doc,
      { before: 240 }
    )
  );
  out.push(answerBox(av.parecerCoordenador, doc));

  // assinaturas
  const signature = (label: string): (Paragraph | Table)[] => [
    new Paragraph({
      spacing: { before: 480, line: LINE_115 },
      indent: { left: Math.round(3.8 * CM), right: Math.round(3.8 * CM) },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
      children: [],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, line: LINE_115 },
      children: [new TextRun({ text: label, size: 24, font: f.docx })],
    }),
  ];
  out.push(...signature("Assinatura do Coordenador do Projeto"));
  out.push(...signature("Assinatura do Bolsista"));
  out.push(...signature("Assinatura do Coordenador de Pesquisa do campus"));
  return out;
}

/* --------------------------- referências --------------------------- */

function referenciasBlocks(doc: AbntDocument): (Paragraph | Table)[] {
  if (!doc.references.length) return [];
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 360, after: 160, line: LINE_115 },
      keepNext: true,
      children: [new TextRun({ text: "REFERÊNCIAS", size: 24, font: f.docx, bold: true })],
    }),
  ];
  for (const entry of doc.references) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: LINE_115, after: 200 },
        children: runsOf(entry, 24, f.docx, MONO_FONTS.docx),
      })
    );
  }
  return out;
}

/* --------------------------- montagem --------------------------- */

export async function buildCnpqDocxBlob(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;

  const pre: (Paragraph | Table)[] = [];
  if (s.cnpq.showCover) {
    pre.push(...coverParas(doc));
    pre.push(new Paragraph({ children: [new PageBreak()] }));
    const resumo = resumoParas(doc);
    if (resumo.length) {
      pre.push(...resumo);
      pre.push(new Paragraph({ children: [new PageBreak()] }));
    }
  } else {
    // sem capa: resumo e corpo começam direto sob o cabeçalho
    pre.push(...resumoParas(doc));
    if (pre.length) pre.push(emptyLine());
  }

  const bodyChildren: (Paragraph | Table)[] = [];
  let eqNum = 0;

  for (const b of doc.body) {
    switch (b.type) {
      case "heading":
        if (b.special) continue;
        bodyChildren.push(headingPara(b, doc));
        break;
      case "paragraph":
        bodyChildren.push(bodyPara(b.runs, doc, b.align));
        break;
      case "pagebreak":
        bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      case "blockquote":
        bodyChildren.push(blockquotePara(b.runs, doc));
        break;
      case "list":
        bodyChildren.push(...listParas(b, doc));
        break;
      case "code":
        bodyChildren.push(...codeParas(b.text, doc));
        break;
      case "equation":
        if (t.numberEquations) eqNum++;
        bodyChildren.push(equationPara(b.runs, t.numberEquations ? eqNum : undefined, doc));
        break;
      case "table":
        bodyChildren.push(...tableBlocks(b, doc));
        break;
      case "figure": {
        const img = await loadImage(b.src);
        const maxW = px(CONTENT_W);
        const maxH = px(PAGE_H - M_TOP - M_BOTTOM) - 300;
        const k = (b.widthPct ?? 100) / 100;
        if (img) {
          const { width, height } = fitImage(img, maxW * k, maxH * k);
          bodyChildren.push(...figureBlocks(img.buf, img.kind, width, height, b.caption, b.num, b.sourceNote, doc, b.align));
        } else {
          if (b.caption) {
            bodyChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120, line: LINE_115 },
                keepNext: true,
                children: [new TextRun({ text: `Figura ${b.num ?? ""} - ${b.caption}`, size: 24, font: mainFont(doc).docx })],
              })
            );
          }
          bodyChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 120, line: LINE_115 },
              children: [new TextRun({ text: `[ imagem não disponível: ${b.src.slice(0, 60)} ]`, size: 20, font: MONO_FONTS.docx, italics: true })],
            })
          );
        }
        break;
      }
      default:
        break;
    }
  }

  const tail: (Paragraph | Table)[] = [...referenciasBlocks(doc), ...avaliacaoBlocks(doc)];

  const document = new Document({
    creator: "MD2ABNT",
    title: s.title || "Relatório CNPq",
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: M_TOP, bottom: M_BOTTOM, left: M_LEFT, right: M_RIGHT, header: Math.round(CNPQ.headerTop * CM), footer: 400 },
          },
        },
        headers: { default: cnpqHeader(doc) },
        children: [...pre, ...bodyChildren, ...tail],
      },
    ],
  });

  return Packer.toBuffer(document);
}
