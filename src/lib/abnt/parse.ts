/* ------------------------------------------------------------------
 * MD2ABNT — Parser: Markdown → modelo ABNT
 * Suporta: front matter YAML simples, títulos numerados (NBR 6024),
 * citações autor-data (NBR 10520), referências (NBR 6023),
 * tabelas/figuras com legenda e fonte (NBR 14724/IBGE),
 * citações longas, equações e código.
 * ------------------------------------------------------------------ */
import { marked, type Token, type Tokens } from "marked";
import type {
  AbntDocument,
  AbntSettings,
  Align,
  Block,
  FigureBlock,
  HeadingBlock,
  InlineRun,
  ListItem,
  SpecialHeading,
  TableBlock,
} from "./types";
import { DEFAULT_SETTINGS } from "./types";

/* ------------------------- utilidades ------------------------- */

function deaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isEmptyRuns(runs: InlineRun[]): boolean {
  return runs.every((r) => r.text.trim() === "");
}

function runsToText(runs: InlineRun[]): string {
  return runs.map((r) => r.text).join("");
}

/* ------------------- citações (NBR 10520) --------------------- */

interface CitationPart {
  author: string;
  year: string;
  rest?: string;
}

function parseCitationKey(item: string): CitationPart | null {
  // Formatos aceitos: @silva2023 | silva2023 | @silva2023, p. 15 | @silva2023 l. 20-30
  const m = item.trim().match(/^@?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-\. ]*?)(\d{4}[a-z]?)?\s*(?:,\s*(.+))?$/);
  if (!m) return null;
  const name = (m[1] || "").trim();
  if (!name) return null;
  const year = m[2] || "[s.d.]";
  return { author: name.toUpperCase(), year, rest: m[3]?.trim() };
}

function joinCitation(parts: CitationPart[]): string {
  const inner = parts
    .map((p) => {
      let s = `${p.author}, ${p.year}`;
      if (p.rest) s += `, ${p.rest}`;
      return s;
    })
    .join("; ");
  return `(${inner})`;
}

/**
 * Converte as chaves de citação em texto no padrão autor-data:
 *  [@silva2023]              → (SILVA, 2023)
 *  [@silva2023, p. 15]       → (SILVA, 2023, p. 15)
 *  [@a2020; @b2021]          → (A, 2020; B, 2021)
 *  No início de frase @silva2023 → Silva (2023)
 */
export function convertCitations(text: string): string {
  if (!text.includes("@")) return text;
  let out = text.replace(/\[@([^\]\n]+)\]/g, (_all, inner: string) => {
    const parts = inner
      .split(";")
      .map((s) => parseCitationKey(s))
      .filter((p): p is CitationPart => p !== null);
    if (parts.length === 0) return _all;
    return joinCitation(parts);
  });
  // forma narrativa: no início, após espaço/(/[ seguido de @chave e limite de palavra
  out = out.replace(/(^|[\s(\[])(@)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-\w]*?)(\d{4}[a-z]?)?(?=[\s,.;:!?)\]]|$)/g, (_a, pre, _at, name: string, year?: string) => {
    if (!year) return `${pre}@${name}`;
    const pretty = name
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join("-");
    return `${pre}${pretty} (${year})`;
  });
  return out;
}

/* -------------------- equações (LaTeX leve) -------------------- */

const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ",
  Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

const OPS: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", leq: "≤", geq: "≥", neq: "≠",
  approx: "≈", equiv: "≡", infty: "∞", sum: "∑", prod: "∏", int: "∫", partial: "∂",
  nabla: "∇", in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cup: "∪", cap: "∩",
  forall: "∀", exists: "∃", rightarrow: "→", to: "→", leftarrow: "←", Rightarrow: "⇒",
  leftrightarrow: "↔", propto: "∝", degree: "°", perp: "⊥", angle: "∠", ell: "ℓ",
  ldots: "…", cdots: "⋯", prime: "′", ast: "∗", emptyset: "∅", aleph: "ℵ",
};

/** Converte um subconjunto comum de LaTeX em corridas tipográficas (com sup/sub) */
export function mathToRuns(tex: string, italic = true): InlineRun[] {
  const runs: InlineRun[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      runs.push({ text: buf, italic, math: true });
      buf = "";
    }
  };
  let i = 0;
  const s = tex.trim();
  const readGroup = (start: number): { content: string; end: number } | null => {
    if (s[start] !== "{") {
      // grupo de um único caractere ou comando
      if (s[start] === "\\") {
        const m = s.slice(start).match(/^\\[A-Za-z]+/);
        if (m) return { content: m[0], end: start + m[0].length };
      }
      return { content: s[start] ?? "", end: start + 1 };
    }
    let depth = 0;
    for (let j = start; j < s.length; j++) {
      if (s[j] === "{") depth++;
      else if (s[j] === "}") {
        depth--;
        if (depth === 0) return { content: s.slice(start + 1, j), end: j + 1 };
      }
    }
    return { content: s.slice(start + 1), end: s.length };
  };
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const m = s.slice(i).match(/^\\([A-Za-z]+)/);
      if (m) {
        const cmd = m[1];
        i += m[0].length;
        if (cmd === "frac") {
          while (s[i] === " ") i++;
          const num = readGroup(i);
          if (num) {
            i = num.end;
            while (s[i] === " ") i++;
            const den = readGroup(i);
            if (den) {
              i = den.end;
              buf += `(${num.content})/(${den.content})`;
              continue;
            }
          }
          buf += "frac";
          continue;
        }
        if (cmd === "sqrt") {
          while (s[i] === " ") i++;
          const arg = readGroup(i);
          if (arg) {
            i = arg.end;
            buf += `√(${arg.content})`;
            continue;
          }
          buf += "√";
          continue;
        }
        if (cmd === "text" || cmd === "mathrm") {
          while (s[i] === " ") i++;
          const arg = readGroup(i);
          if (arg) {
            i = arg.end;
            flush();
            runs.push({ text: arg.content });
            continue;
          }
        }
        const sym = GREEK[cmd] ?? OPS[cmd];
        if (sym) buf += sym;
        else buf += cmd;
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (c === "^" || c === "_") {
      i++;
      while (s[i] === " ") i++;
      const g = readGroup(i);
      if (g) {
        i = g.end;
        flush();
        const inner = mathToRuns(g.content, italic);
        for (const r of inner) {
          runs.push({ ...r, math: true, italic: r.italic || italic, sup: c === "^" ? true : undefined, sub: c === "_" ? true : undefined });
        }
        continue;
      }
      continue;
    }
    buf += c;
    i++;
  }
  flush();
  return runs.length ? runs : [{ text: s, italic, math: true }];
}

/* ------------------- corridas tipográficas -------------------- */

interface WalkCtx {
  inCode: boolean;
}

function inlineRuns(tokens: Token[] | undefined, base: Partial<InlineRun> = {}, ctx: WalkCtx = { inCode: false }): InlineRun[] {
  if (!tokens) return [];
  const runs: InlineRun[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "strong":
        runs.push(...inlineRuns((t as Tokens.Strong).tokens, { ...base, bold: true }, ctx));
        break;
      case "em":
        runs.push(...inlineRuns((t as Tokens.Em).tokens, { ...base, italic: true }, ctx));
        break;
      case "del":
        runs.push(...inlineRuns((t as Tokens.Del).tokens, { ...base }, ctx));
        break;
      case "codespan": {
        const cs = t as Tokens.Codespan;
        runs.push({ text: convertCitations(cs.text.replace(/\n/g, " ")), code: true });
        break;
      }
      case "br":
        runs.push({ text: "\n" });
        break;
      case "escape":
        runs.push({ ...base, text: convertCitations((t as Tokens.Escape).text) });
        break;
      case "link": {
        const lk = t as Tokens.Link;
        const inner = inlineRuns(lk.tokens, base, ctx);
        if (inner.length) runs.push(...inner.map((r) => ({ ...r, href: lk.href })));
        else runs.push({ ...base, text: convertCitations(lk.href), href: lk.href });
        break;
      }
      case "image": {
        const img = t as Tokens.Image;
        // dentro de parágrafo a imagem é tratada no nível do bloco;
        // aqui apenas marcamos um espaço reservado
        runs.push({ ...base, text: `[imagem: ${img.text || img.href}]` });
        break;
      }
      case "html": {
        const h = t as Tokens.HTML;
        runs.push({ ...base, text: h.raw.replace(/<[^>]*>/g, " ") });
        break;
      }
      case "text": {
        const tx = t as Tokens.Text & { tokens?: Token[] };
        if (tx.tokens && tx.tokens.length) {
          runs.push(...inlineRuns(tx.tokens, base, ctx));
        } else {
          runs.push({ ...base, text: convertCitations(tx.text) });
        }
        break;
      }
      default: {
        const raw = (t as { raw?: string }).raw ?? (t as { text?: string }).text ?? "";
        if (raw) runs.push({ ...base, text: convertCitations(raw) });
        break;
      }
    }
  }
  // remove corridas vazias contíguas e colapsa \n
  const cleaned: InlineRun[] = [];
  for (const r of runs) {
    if (!r.text) continue;
    const prev = cleaned[cleaned.length - 1];
    if (prev && sameStyle(prev, r)) prev.text += r.text;
    else cleaned.push({ ...r });
  }
  return cleaned;
}

function sameStyle(a: InlineRun, b: InlineRun): boolean {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.underline === !!b.underline && !!a.code === !!b.code && !!a.sup === !!b.sup && !!a.sub === !!b.sub;
}

/** converte matemática inline ($...$ e $$...$$) em corridas tipográficas */
function processInlineMath(runs: InlineRun[]): InlineRun[] {
  const out: InlineRun[] = [];
  for (const r of runs) {
    if (r.code || !r.text.includes("$")) {
      out.push(r);
      continue;
    }
    const parts = r.text.split(/(\$\$[^$]+\$\$|\$[^$\n]+?\$)/g);
    if (parts.length === 1) {
      out.push(r);
      continue;
    }
    for (const p of parts) {
      if (!p) continue;
      const dm = p.match(/^\$\$([\s\S]+)\$\$$/);
      const im = p.match(/^\$([^$\n]+)\$$/);
      if (dm) out.push(...mathToRuns(dm[1], true));
      else if (im) out.push(...mathToRuns(im[1], true));
      else out.push({ ...r, text: p });
    }
  }
  return out;
}

/* ---------------------- front matter YAML --------------------- */

export interface FrontMatter {
  [k: string]: string | string[];
}

export function extractFrontMatter(md: string): { front: FrontMatter; body: string } {
  const m = md.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { front: {}, body: md };
  const front: FrontMatter = {};
  const lines = m[1].split(/\r?\n/);
  let currentKey: string | null = null;
  let currentList: string[] | null = null;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentKey) {
      currentList!.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^([A-Za-zÀ-ÿ_-]+)\s*:\s*(.*)$/);
    if (kv) {
      if (currentList && currentKey) front[currentKey] = currentList;
      currentKey = kv[1].toLowerCase();
      currentList = null;
      const val = kv[2].trim();
      if (val === "") {
        currentList = [];
      } else if (/^\[.*\]$/.test(val)) {
        front[currentKey] = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      } else {
        front[currentKey] = val.replace(/^["']|["']$/g, "");
      }
    }
  }
  if (currentList && currentKey && currentList.length) front[currentKey] = currentList;
  return { front, body: md.slice(m[0].length) };
}

function asList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return v
    .split(/\s*[;,]\s*/)
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
}

/* -------------------------- parser ---------------------------- */

const CAPTION_RE = /^(tabela|quadro|figura)\s*(\d+)?\s*[–\-—:]?\s*(.*)$/i;
const SOURCE_RE = /^fonte\s*:/i;

/** remove prefixo "Figura N – " já embutido na legenda (ex.: alt de imagem) */
function normalizeCaption(caption: string): string {
  return caption.replace(/^(figura|tabela|quadro)\s*\d+\s*[–\-—:]\s*/i, "").trim();
}

/** próximo token significativo (ignora espaços em branco) */
function nextMeaningful(tokens: Token[], from: number): Token | null {
  for (let i = from; i < tokens.length; i++) {
    if (tokens[i].type === "space") continue;
    return tokens[i];
  }
  return null;
}

function alignFromCell(cell: Tokens.TableCell): Align {
  const raw = (cell as { raw?: string }).raw ?? "";
  if (/^:.*:$/.test(raw)) return "center";
  if (/^-+:$/.test(raw)) return "right";
  if (/^:-+$/.test(raw)) return "left";
  return "left";
}

export function parseMarkdown(md: string, settings: AbntSettings): AbntDocument {
  const { front, body } = extractFrontMatter(md);
  const doc: AbntDocument = {
    settings: applyFrontMatter(settings, front),
    resumo: null,
    abstractEn: null,
    body: [],
    references: [],
    figures: [],
    tables: [],
  };

  const tokens = marked.lexer(body) as Token[];
  const blocks: Block[] = [];

  let resumoParts: string[] = [];
  let resumoKeywords: string[] | undefined;
  let abstractParts: string[] = [];
  let abstractKeywords: string[] | undefined;
  let specialMode: SpecialHeading = null;

  let figCounter = 0;
  let tabCounter = 0;

  /** aplica legenda/fonte pendentes ao bloco anterior (figura/tabela) */
  const attachCaptionTo = (block: Block, caption: string, num?: number): void => {
    if (block.type === "figure") {
      block.caption = caption;
      if (num) block.num = num;
      else if (!block.num) block.num = ++figCounter;
    } else if (block.type === "table") {
      block.caption = caption;
      if (num) block.num = num;
      else if (!block.num) block.num = ++tabCounter;
    }
  };

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];

    if (t.type === "heading") {
      const h = t as Tokens.Heading;
      const runs = inlineRuns(h.tokens);
      const plain = deaccent(runsToText(runs).replace(/^\d+(\.\d+)*\s+/, ""));
      let special: SpecialHeading = null;
      if (plain === "resumo") special = "resumo";
      else if (plain === "abstract") special = "abstract";
      else if (plain === "referencias") special = "referencias";
      else if (plain === "sumario" || plain === "sumario automatico") continue; // gerado automaticamente

      if (special) {
        specialMode = special;
        blocks.push({ type: "heading", level: Math.min(h.depth, 5) as HeadingBlock["level"], runs, special, centered: true });
        continue;
      }
      specialMode = null;
      const hb: HeadingBlock = { type: "heading", level: Math.min(h.depth, 5) as HeadingBlock["level"], runs };
      blocks.push(hb);
      continue;
    }

    if (specialMode === "resumo" || specialMode === "abstract") {
      if (t.type === "paragraph") {
        const runs = inlineRuns((t as Tokens.Paragraph).tokens);
        const text = runsToText(runs).trim();
        const kw = text.match(/^(palavras?-chave|keywords?)\s*:\s*(.+)$/i);
        if (kw) {
          const kws = kw[2].split(/\s*[;.]\s*|\s*,\s*/).map((s) => s.trim()).filter(Boolean);
          if (specialMode === "resumo") resumoKeywords = kws;
          else abstractKeywords = kws;
        } else if (text) {
          (specialMode === "resumo" ? resumoParts : abstractParts).push(text);
        }
      } else if (t.type === "space") continue;
      else {
        // fim da seção especial por bloco não-parágrafo
        specialMode = null;
        if (t.type === "heading") ti--; // reprocessa o título
      }
      continue;
    }

    switch (t.type) {
      case "space":
        break;
      case "hr":
        blocks.push({ type: "hr" });
        break;
      case "paragraph": {
        const p = t as Tokens.Paragraph;
        // parágrafo só com imagem → figura
        const children = (p.tokens ?? []).filter((c) => !(c.type === "text" && (c as Tokens.Text).text.trim() === ""));
        if (children.length === 1 && children[0].type === "image") {
          const img = children[0] as Tokens.Image;
          const fb: FigureBlock = { type: "figure", src: img.href, caption: img.text ? normalizeCaption(img.text) : undefined };
          blocks.push(fb);
          doc.figures.push(fb);
          if (!fb.num) fb.num = ++figCounter;
          break;
        }
        const runs = inlineRuns(p.tokens);
        if (isEmptyRuns(runs)) break;
        const text = runsToText(runs);
        // nota de fonte para figura/tabela anterior
        if (SOURCE_RE.test(text.trim())) {
          const src = text.trim().replace(SOURCE_RE, "Fonte:");
          const last = blocks[blocks.length - 1];
          if (last && (last.type === "figure" || last.type === "table")) last.sourceNote = src;
          else blocks.push({ type: "paragraph", runs, align: "left" });
          break;
        }
        // legenda pendente: "Tabela 3 – ..." logo antes de tabela/figura
        const next = nextMeaningful(tokens, ti + 1);
        const capMatch = text.trim().match(CAPTION_RE);
        const nextIdx = next ? tokens.indexOf(next) : -1;
        if (capMatch && next && (next.type === "table" || (next.type === "paragraph" && hasSingleImage(next as Tokens.Paragraph)))) {
          const num = capMatch[2] ? parseInt(capMatch[2], 10) : undefined;
          if (next.type === "table") {
            const tb = tableFromToken(next as Tokens.Table);
            attachCaptionTo(tb, capMatch[3], num);
            blocks.push(tb);
            doc.tables.push(tb);
            ti = nextIdx;
            break;
          } else {
            const img = singleImage(next as Tokens.Paragraph)!;
            const fb: FigureBlock = { type: "figure", src: img.href, caption: capMatch[3], num: num ?? undefined };
            blocks.push(fb);
            doc.figures.push(fb);
            if (fb.num === undefined) fb.num = ++figCounter;
            ti = nextIdx;
            break;
          }
        }
        // equação em bloco $$ ... $$
        const eqOnly = text.trim().match(/^\$\$([\s\S]+)\$\$$/);
        if (eqOnly) {
          blocks.push({ type: "equation", runs: mathToRuns(eqOnly[1]) });
          break;
        }
        blocks.push({ type: "paragraph", runs: processInlineMath(runs), align: "justify" });
        break;
      }
      case "blockquote": {
        const bq = t as Tokens.Blockquote;
        const runs = inlineRuns(bq.tokens as unknown as Token[]);
        if (!isEmptyRuns(runs)) blocks.push({ type: "blockquote", runs });
        break;
      }
      case "code": {
        const c = t as Tokens.Code;
        blocks.push({ type: "code", text: c.text, lang: c.lang });
        break;
      }
      case "list": {
        const l = t as Tokens.List;
        const items: ListItem[] = [];
        for (const it of l.items) {
          const item: ListItem = { runs: [] };
          const subs: ListItem[] = [];
          for (const ct of it.tokens) {
            if (ct.type === "text" || ct.type === "paragraph") {
              const runs = inlineRuns((ct as Tokens.Text & { tokens?: Token[] }).tokens ?? [ct]);
              item.runs.push(...runs);
            } else if (ct.type === "list") {
              const nested = ct as Tokens.List;
              for (const nit of nested.items) {
                const nruns = inlineRuns((nit.tokens[0] as Tokens.Text & { tokens?: Token[] })?.tokens ?? []);
                subs.push({ runs: nruns });
              }
            }
          }
          if (subs.length) item.subItems = subs;
          items.push(item);
        }
        blocks.push({ type: "list", ordered: !!l.ordered, items });
        break;
      }
      case "table": {
        const tb = tableFromToken(t as Tokens.Table);
        // legenda embutida? mantém sem legenda
        blocks.push(tb);
        doc.tables.push(tb);
        if (!tb.num) tb.num = ++tabCounter;
        break;
      }
      default:
        break;
    }
  }

  if (resumoKeywords || resumoParts.length) {
    doc.resumo = { text: resumoParts.join("\n\n"), keywords: resumoKeywords };
  }
  if (abstractKeywords || abstractParts.length) {
    doc.abstractEn = { text: abstractParts.join("\n\n"), keywords: abstractKeywords };
  }

  /* --------- numeração de seções (NBR 6024) e referências --------- */
  if (doc.settings.toggles.numberSections) {
    const counters = [0, 0, 0, 0, 0];
    for (const b of blocks) {
      if (b.type !== "heading") continue;
      const lvl = b.level;
      counters[lvl - 1]++;
      for (let i = lvl; i < 5; i++) counters[i] = 0;
      b.number = counters.slice(0, lvl).join(".");
    }
  }

  const refIdx = blocks.findIndex((b) => b.type === "heading" && b.special === "referencias");
  const bodyBlocks: Block[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "heading") {
      const plain = deaccent(runsToText(b.runs));
      if (plain === "resumo") {
        b.special = "resumo";
        b.centered = true;
      } else if (plain === "abstract") {
        b.special = "abstract";
        b.centered = true;
      } else if (plain === "referencias") {
        b.special = "referencias";
        b.centered = true;
      } else {
        b.centered = false;
      }
    }
    if (i === refIdx) continue;
    if (refIdx >= 0 && i > refIdx && i < blocks.length) {
      // blocos após "Referências" → entradas de referência
      if (b.type === "paragraph" && !isEmptyRuns(b.runs)) doc.references.push(b.runs);
      else if (b.type === "list") for (const it of b.items) if (it.runs.length) doc.references.push(it.runs);
      continue;
    }
    // títulos especiais são marcadores estruturais — não vão para o corpo
    if (b.type === "heading" && b.special) continue;
    bodyBlocks.push(b);
  }
  doc.body = bodyBlocks;

  return doc;
}

function hasSingleImage(p: Tokens.Paragraph): boolean {
  return singleImage(p) !== null;
}

function singleImage(p: Tokens.Paragraph): Tokens.Image | null {
  const children = (p.tokens ?? []).filter((c) => !(c.type === "text" && (c as Tokens.Text).text.trim() === ""));
  if (children.length === 1 && children[0].type === "image") return children[0] as Tokens.Image;
  return null;
}

function tableFromToken(tok: Tokens.Table): TableBlock {
  const header = tok.header.map((c) => inlineRuns(c.tokens));
  const rows = tok.rows.map((row) => row.map((c) => inlineRuns(c.tokens)));
  const align = tok.align.map((a, i) => {
    if (a === "center") return "center" as Align;
    if (a === "right") return "right" as Align;
    return (alignFromCell(tok.header[i]) ?? "left") as Align;
  });
  return { type: "table", header, rows, align };
}

function applyFrontMatter(settings: AbntSettings, front: FrontMatter): AbntSettings {
  const s: AbntSettings = { ...settings, toggles: { ...settings.toggles } };
  const get = (k: string) => front[k];
  const str = (k: string): string | undefined => {
    const v = get(k);
    if (typeof v === "string") return v;
    return undefined;
  };
  const lst = (k: string): string[] | undefined => {
    const v = get(k);
    if (v === undefined) return undefined;
    return asList(v);
  };
  if (str("title")) s.title = str("title")!;
  if (str("subtitle")) s.subtitle = str("subtitle")!;
  const authors = lst("authors") ?? lst("author");
  if (authors && authors.length) s.authors = authors;
  if (str("institution")) s.institution = str("institution")!;
  if (str("department")) s.department = str("department")!;
  if (str("city")) s.city = str("city")!;
  if (str("year")) s.year = str("year")!;
  if (str("advisor")) s.advisor = str("advisor")!;
  if (str("coadvisor")) s.coadvisor = str("coadvisor")!;
  const committee = lst("committee") ?? lst("banca");
  if (committee && committee.length) s.committee = committee;
  if (str("approvaldate") || str("aprovacao")) s.approvalDate = str("approvaldate") ?? str("aprovacao")!;
  const kw = lst("keywords") ?? lst("palavras-chave") ?? lst("palavraschave");
  if (kw && kw.length) s.keywords = kw;
  const kwe = lst("keywords-en") ?? lst("keywordsen");
  if (kwe && kwe.length) s.keywordsEn = kwe;
  if (str("sourcenote") || str("fonte")) s.sourceNote = str("sourcenote") ?? str("fonte")!;
  if (str("filename")) s.fileName = str("filename")!;
  if (str("font")) s.font = str("font") === "arial" ? "arial" : "times";
  // autores: se veio string única com ";"
  if (typeof get("authors") === "string") s.authors = asList(get("authors") as string);
  return s;
}
