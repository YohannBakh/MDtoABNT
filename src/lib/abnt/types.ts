/* ------------------------------------------------------------------
 * MD2ABNT — Modelo de documento e configurações
 * Conversão de anotações Markdown para os padrões ABNT
 * NBR 14724, NBR 6022, NBR 6023, NBR 6024, NBR 10520, NBR 6028
 * ------------------------------------------------------------------ */

/** Trecho de texto formatado (corrida tipográfica) */
export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean; // monoespaçada (código)
  sup?: boolean;
  sub?: boolean;
  /** corrida matemática — usa fonte com cobertura de símbolos no PDF */
  math?: boolean;
  href?: string;
}

export type Align = "left" | "center" | "right" | "justify";

/** Especialização de título sem numeração (elementos pós-textuais) */
export type SpecialHeading = "resumo" | "abstract" | "referencias" | null;

export interface HeadingBlock {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5;
  runs: InlineRun[];
  /** numeração gerada, ex.: "1.1" */
  number?: string;
  special?: SpecialHeading;
  /** título de referência/elementos sem numeração — centralizado (NBR 6024) */
  centered?: boolean;
}

export interface ParagraphBlock {
  type: "paragraph";
  runs: InlineRun[];
  align?: Align;
}

/** Citação longa — NBR 10520: recuo 4 cm, fonte menor, espaço simples, sem aspas */
export interface BlockquoteBlock {
  type: "blockquote";
  runs: InlineRun[];
}

export interface ListItem {
  runs: InlineRun[];
  subItems?: ListItem[];
}

export interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}

export interface CodeBlock {
  type: "code";
  text: string;
  lang?: string;
}

/** Figura — NBR 14724: identificação na parte superior, fonte na inferior */
export interface FigureBlock {
  type: "figure";
  src: string;
  caption?: string;
  sourceNote?: string;
  num?: number;
  /** preenchido no estágio de geração */
  page?: number;
}

export interface TableBlock {
  type: "table";
  caption?: string;
  sourceNote?: string;
  num?: number;
  header: InlineRun[][];
  rows: InlineRun[][][];
  align: Align[];
  /** preenchido no estágio de geração */
  page?: number;
}

/** Equação isolada (bloco $$...$$) — numerada no lado direito */
export interface EquationBlock {
  type: "equation";
  runs: InlineRun[];
  num?: number;
  page?: number;
}

export interface HrBlock {
  type: "hr";
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | BlockquoteBlock
  | ListBlock
  | CodeBlock
  | FigureBlock
  | TableBlock
  | EquationBlock
  | HrBlock;

/* ------------------------- Configurações ------------------------- */

/** Estilo do documento: artigo ABNT ou relatório técnico de experimento */
export type DocStyle = "abnt" | "relatorio";

/** Campos da capa do relatório técnico (tabela institucional) */
export interface ReportCover {
  /** ex.: "CURSO SUPERIOR EM ENGENHARIA DE CONTROLE E AUTOMAÇÃO" */
  course: string;
  /** ex.: "RELATÓRIO TÉCNICO – ATIVIDADE EXPERIMENTAL" */
  activityLabel: string;
  /** número da atividade (opcional, exibido após o rótulo acima) */
  activityNumber: string;
  disciplina: string;
  turma: string;
  professor: string;
  /** ex.: "2026 / 2º Semestre" */
  periodo: string;
  /** ex.: "14/09/2026" */
  dataAtividade: string;
}

export interface AbntToggles {
  capa: boolean;
  folhaRosto: boolean;
  aprovacao: boolean;
  resumo: boolean;
  sumario: boolean;
  listaFiguras: boolean;
  listaTabelas: boolean;
  numberSections: boolean;
  numberEquations: boolean;
  /** numerar todas as páginas (se OFF, numera apenas a parte textual) */
  pageNumberAll: boolean;
}

export interface AbntSettings {
  /** estilo geral do documento */
  style: DocStyle;
  font: "times" | "arial";
  title: string;
  subtitle: string;
  authors: string[];
  authorNote: string; // nota dos autores (ex.: e-mails, filiação)
  institution: string;
  department: string;
  city: string;
  year: string;
  advisor: string;
  advisorRole: "Orientador" | "Orientadora";
  coadvisor: string;
  committee: string[];
  approvalDate: string;
  keywords: string[];
  keywordsEn: string[];
  sourceNote: string; // "Fonte: elaborado pelo autor (2025)."
  fileName: string;
  /** campos da capa no estilo Relatório Técnico */
  report: ReportCover;
  toggles: AbntToggles;
}

/** Documento pronto para geração */
export interface AbntDocument {
  settings: AbntSettings;
  /** resumo extraído do Markdown (sobrepõe o campo de configurações se existir) */
  resumo: { text: string; keywords?: string[] } | null;
  abstractEn: { text: string; keywords?: string[] } | null;
  body: Block[];
  references: InlineRun[][];
  /** figuras/tabelas detectadas (para as listas automáticas) */
  figures: FigureBlock[];
  tables: TableBlock[];
}

export const DEFAULT_SETTINGS: AbntSettings = {
  style: "abnt",
  font: "times",
  title: "Título do trabalho",
  subtitle: "",
  authors: ["Autora Aluna Sobrenome"],
  authorNote: "",
  institution: "UNIVERSIDADE EXEMPLO",
  department: "Faculdade de Exatas e Tecnologia — Curso de Exemplo",
  city: "Cidade",
  year: String(new Date().getFullYear()),
  advisor: "Prof. Dr. Orientador Sobrenome",
  advisorRole: "Orientador",
  coadvisor: "",
  committee: ["Prof. Dr. Membro 1 — Universidade Exemplo", "Profa. Dra. Membro 2 — Universidade Exemplo"],
  approvalDate: "",
  keywords: ["palavra-chave 1", "palavra-chave 2", "palavra-chave 3"],
  keywordsEn: [],
  sourceNote: "Fonte: elaborado pelo autor.",
  fileName: "artigo-abnt",
  /** campos da capa do estilo Relatório Técnico */
  report: {
    course: "CURSO SUPERIOR EM ENGENHARIA DE CONTROLE E AUTOMAÇÃO",
    activityLabel: "RELATÓRIO TÉCNICO – ATIVIDADE EXPERIMENTAL",
    activityNumber: "",
    disciplina: "",
    turma: "ECA 2025",
    professor: "",
    periodo: "2026 / 2º Semestre",
    dataAtividade: "",
  },
  toggles: {
    capa: true,
    folhaRosto: true,
    aprovacao: true,
    resumo: true,
    sumario: true,
    listaFiguras: true,
    listaTabelas: true,
    numberSections: true,
    numberEquations: true,
    pageNumberAll: true,
  },
};

/* --------------------------- Constantes --------------------------- */

/** Medidas NBR 14724 (cm) */
export const ABNT = {
  margin: { top: 3, left: 3, bottom: 2, right: 2 },
  /** recuo de primeira linha do parágrafo */
  firstLineIndent: 1.25,
  /** recuo da citação longa */
  longQuoteIndent: 4,
  /** corpo do texto */
  bodySize: 12,
  /** citações longas e notas */
  smallSize: 10,
} as const;

/** Medidas do estilo Relatório Técnico (medidas dos relatórios do curso) */
export const REPORT = {
  margin: { top: 2.5, left: 3, bottom: 2.5, right: 3 },
  /** espaçamento 1,15 (docx: 240 × 1,15) */
  lineDocx: 276,
  lineFactor: 1.15,
  /** recuo de primeira linha */
  firstLineIndent: 1.27,
  /** recuo do número da seção (lista: esquerda 1,27, deslocado 0,64) */
  sectionIndent: 1.27,
  sectionHanging: 0.64,
  bodySize: 12,
} as const;

/** Fontes por escolha do usuário */
export function fontFamilies(font: "times" | "arial") {
  return font === "times"
    ? {
        docx: "Times New Roman",
        css: "'Times New Roman', 'Liberation Serif', Georgia, serif",
        pdf: { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic", boldItalic: "Times-BoldItalic" },
      }
    : {
        docx: "Arial",
        css: "Arial, 'Liberation Sans', Helvetica, sans-serif",
        pdf: { regular: "Helvetica", bold: "Helvetica-Bold", italic: "Helvetica-Oblique", boldItalic: "Helvetica-BoldOblique" },
      };
}

export const MONO_FONTS = {
  docx: "Courier New",
  css: "'Courier New', 'Liberation Mono', monospace",
  pdf: { regular: "Courier", bold: "Courier-Bold", italic: "Courier-Oblique", boldItalic: "Courier-BoldOblique" },
};
