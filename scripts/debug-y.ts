import { parseMarkdown } from "../src/lib/abnt/parse";
import { DEFAULT_SETTINGS } from "../src/lib/abnt/types";
import { SAMPLE_MARKDOWN } from "../src/lib/abnt/sample";
import PDFDocument from "pdfkit";

const doc = parseMarkdown(SAMPLE_MARKDOWN, DEFAULT_SETTINGS);
// imprime legendas detectadas
for (const t of doc.tables) console.log("tabela:", t.num, JSON.stringify(t.caption));
for (const f of doc.figures) console.log("figura:", f.num, JSON.stringify(f.caption));
console.log("---");

// simula montagem de linhas da legenda da tabela
const pdf = new PDFDocument({ size: "A4" });
const caption = `Tabela 1 – ${doc.tables[0].caption}`;
console.log("largura legenda tabela @12pt:", pdf.font("Times-Roman").fontSize(12).widthOfString(caption), "pt | CW =", 595.28 - 85.04 - 56.69);
const figCap = `Figura 1 – ${doc.figures[0].caption}`;
console.log("largura legenda figura @12pt:", pdf.widthOfString(figCap));
