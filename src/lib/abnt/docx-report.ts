/* ------------------------------------------------------------------
 * MD2ABNT — Gerador DOCX no estilo Relatório Técnico de Experimento
 * Layout do modelo do curso (IFC Luzerna): cabeçalho institucional de
 * texto em todas as páginas, título + tabela de identificação na 1ª
 * página seguidos imediatamente do texto, margens 3/3/2,5/2,5 cm,
 * Times 12, espaçamento 1,15, seções numeradas em negrito.
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
import { REPORT, fontFamilies, MONO_FONTS } from "./types";
import { runsOf } from "./docx";
import { fitImage, loadImage } from "./image";

const CM = 566.93;
const PAGE_W = 11906;
const PAGE_H = 16838;
const M_TOP = Math.round(REPORT.margin.top * CM);
const M_BOTTOM = Math.round(REPORT.margin.bottom * CM);
const M_LEFT = Math.round(REPORT.margin.left * CM);
const M_RIGHT = Math.round(REPORT.margin.right * CM);
const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT; // ≈ 8504 twips (15 cm)
const LINE_115 = REPORT.lineDocx; // 276 = 1,15 linha
const IND_FIRST = Math.round(REPORT.firstLineIndent * CM); // 720 twips
const IND_SEC = Math.round(REPORT.sectionIndent * CM);
const IND_SEC_HANG = Math.round(REPORT.sectionHanging * CM);

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

function mainFont(doc: AbntDocument) {
  return fontFamilies(doc.settings.font);
}

/* ---------- heurística: linha de cálculo (ex.: "i = 2 / 2846,71 = 0,702mA") ---------- */
function looksLikeCalculation(text: string): boolean {
  const t = text.trim();
  if (t.length === 0 || t.length > 60 || t.includes("\n")) return false;
  if (/^(para|onde|com|sendo| logo|assim)\b/i.test(t)) return false;
  return /=/.test(t) && /\d/.test(t);
}

/* --------------- cabeçalho institucional de texto (2 linhas + régua) --------------- */
function textHeader(doc: AbntDocument): Header {
  const rc = doc.settings.report;
  const f = mainFont(doc);
  const green = REPORT.headerGreen;
  const gray = REPORT.headerGray;
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, line: LINE_115 },
        children: [new TextRun({ text: rc.headerInstitution, size: 24, font: f.docx, bold: true, color: green })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60, line: LINE_115 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: green, space: 3 } },
        children: [new TextRun({ text: rc.course, size: 18, font: f.docx, color: gray })],
      }),
    ],
  });
}

/* ---------------- título + tabela de identificação (1ª página) ---------------- */

function coverTitle(doc: AbntDocument): Paragraph {
  const rc = doc.settings.report;
  const f = mainFont(doc);
  const num = rc.activityNumber.trim();
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100, line: LINE_115 },
    children: [new TextRun({ text: `${rc.activityLabel}${num ? ` Nº ${num}` : ""}`, size: 32, font: f.docx, bold: true })],
  });
}

function coverTable(doc: AbntDocument): Table {
  const s = doc.settings.report;
  const f = mainFont(doc);
  const colW = Math.floor(CONTENT_W / 2);
  const mk = (children: (Paragraph | undefined)[]) =>
    new TableCell({
      width: { size: colW, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: children.filter((p): p is Paragraph => p !== undefined),
    });

  const num = s.activityNumber.trim();
  const authors = doc.settings.authors.filter((a) => a.trim()).join("; ");
  const val = (label: string, value: string) =>
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: LINE_115 },
      children: [
        new TextRun({ text: `${label}: `, size: 24, font: f.docx, bold: true }),
        new TextRun({ text: value, size: 24, font: f.docx }),
      ],
    });

  const row = (cells: TableCell[], height?: number) =>
    new TableRow({
      children: cells,
      height: height ? { value: height, rule: "atLeast" } : undefined,
    });

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [colW, colW],
    borders: gridBorders,
    rows: [
      row([mk([val("Disciplina", s.disciplina)]), mk([val("Turma", s.turma)])], 340),
      row([mk([val("Professor", s.professor)]), mk([val("Período", s.periodo)])], 340),
      row([mk([val("Aluno(s)", authors)]), mk([val("Data da atividade", s.dataAtividade)])], 340),
    ],
  });
}

/* ----------------------------- blocos ----------------------------- */

function headingPara(h: Extract<Block, { type: "heading" }>, doc: AbntDocument): Paragraph {
  const f = mainFont(doc);
  const label = h.number ? (h.level === 1 ? `${h.number}. ` : `${h.number} `) : "";
  const left = h.level === 1 ? IND_SEC : Math.round(IND_SEC + (h.level - 1) * 567);
  return new Paragraph({
    alignment: h.centered ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: h.centered ? undefined : { left, hanging: IND_SEC_HANG },
    spacing: { before: 240, line: LINE_115 },
    keepNext: true,
    children: [
      ...(label ? [new TextRun({ text: label, size: 24, font: f.docx, bold: true })] : []),
      ...runsOf(h.runs, 24, f.docx, MONO_FONTS.docx, true),
    ],
  });
}

function bodyPara(runs: InlineRun[], doc: AbntDocument, align?: Align): Paragraph {
  const text = runs.map((r) => r.text).join("");
  const isCalc = looksLikeCalculation(text);
  const f = mainFont(doc);
  const alignment =
    align === "center"
      ? AlignmentType.CENTER
      : align === "right"
        ? AlignmentType.RIGHT
        : align === "left"
          ? AlignmentType.LEFT
          : AlignmentType.JUSTIFIED;
  const noIndent = isCalc || align === "center" || align === "right";
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
        indent: { left: IND_SEC, hanging: IND_SEC_HANG },
        spacing: { line: LINE_115, after: 60 },
        children: [new TextRun({ text: marker, size: 24, font: f.docx }), ...runsOf(item.runs, 24, f.docx, MONO_FONTS.docx)],
      })
    );
    (item.subItems ?? []).forEach((sub, j) => {
      const smarker = b.ordered ? `${idx + 1}.${j + 1} ` : "– ";
      paras.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          indent: { left: IND_SEC + 720, hanging: IND_SEC_HANG },
          spacing: { line: LINE_115, after: 60 },
          children: [new TextRun({ text: smarker, size: 24, font: f.docx }), ...runsOf(sub.runs, 24, f.docx, MONO_FONTS.docx)],
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

/* figuras: legenda e fonte ABAIXO (padrão dos relatórios), ambas 12pt centradas */
function figureBlocks(buf: Buffer, kind: "png" | "jpg" | "gif", w: number, h: number, caption: string | undefined, num: number | undefined, source: string | undefined, doc: AbntDocument, align?: Align): (Paragraph | Table)[] {
  const f = mainFont(doc);
  const out: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: align === "left" ? AlignmentType.LEFT : align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER,
      spacing: { before: 120, after: 60, line: LINE_115 },
      children: [new ImageRun({ type: kind, data: buf, transformation: { width: w, height: h } })],
    }),
  ];
  if (caption) {
    const label = num !== undefined ? `Figura ${num} - ${caption}` : caption;
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_115 },
        children: [new TextRun({ text: label, size: 24, font: f.docx })],
      })
    );
  }
  if (source) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: LINE_115, after: 120 },
        children: [new TextRun({ text: source.startsWith("Fonte") ? source : `Fonte: ${source}`, size: 24, font: f.docx })],
      })
    );
  }
  return out;
}

/* tabelas: grade completa, legenda acima (se houver), fonte abaixo (se houver) */
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
          children: runsOf(runs, 24, f.docx, MONO_FONTS.docx, false),
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
  const source = tb.sourceNote;
  if (source) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, line: LINE_115 },
        children: [new TextRun({ text: source.startsWith("Fonte") ? source : `Fonte: ${source}`, size: 24, font: f.docx })],
      })
    );
  }
  return out;
}

/* --------------------------- montagem --------------------------- */

export async function buildReportDocxBlob(doc: AbntDocument): Promise<Buffer> {
  const s = doc.settings;
  const t = s.toggles;
  const f = mainFont(doc);
  const mono = MONO_FONTS.docx;

  /* pré-textual: título + tabela de identificação, seguidos direto do corpo */
  const pre: (Paragraph | Table)[] = [];
  if (s.report.showCover) {
    pre.push(coverTitle(doc));
    pre.push(coverTable(doc));
    pre.push(new Paragraph({ spacing: { after: 120, line: LINE_115 }, children: [] }));
  }

  /* corpo */
  const bodyChildren: (Paragraph | Table)[] = [];
  let figNum = 0;
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
        if (img) {
          const { width, height } = fitImage(img, maxW, maxH);
          bodyChildren.push(...figureBlocks(img.buf, img.kind, width, height, b.caption, b.num, b.sourceNote, doc, b.align));
        } else {
          bodyChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 60, line: LINE_115 },
              children: [new TextRun({ text: `[ imagem não disponível: ${b.src.slice(0, 60)} ]`, size: 20, font: mono, italics: true })],
            })
          );
          if (b.caption) {
            bodyChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { line: LINE_115 },
                children: [new TextRun({ text: `Figura ${b.num ?? ""} - ${b.caption}`, size: 24, font: f.docx })],
              })
            );
          }
        }
        break;
      }
      default:
        break;
    }
  }

  /* REFERÊNCIAS (se o usuário incluir) */
  if (doc.references.length) {
    bodyChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120, line: LINE_115 },
        keepNext: true,
        children: [new TextRun({ text: "REFERÊNCIAS", size: 24, font: f.docx })],
      })
    );
    for (const entry of doc.references) {
      bodyChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { line: LINE_115, after: 200 },
          children: runsOf(entry, 24, f.docx, mono),
        })
      );
    }
  }

  const logos = textHeader(doc);

  const document = new Document({
    creator: "MD2ABNT",
    title: s.title || "Relatório Técnico",
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_W, height: PAGE_H },
            margin: { top: M_TOP, bottom: M_BOTTOM, left: M_LEFT, right: M_RIGHT, header: 709, footer: 400 },
          },
        },
        // logos institucionais em todas as páginas, como nos relatórios originais
        headers: { default: logos },
        children: [...pre, ...bodyChildren],
      },
    ],
  });

  return Packer.toBuffer(document);
}
