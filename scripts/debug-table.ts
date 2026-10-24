/* simula renderTable com logs de y */
import { parseMarkdown } from "../src/lib/abnt/parse";
import { DEFAULT_SETTINGS } from "../src/lib/abnt/types";
import { SAMPLE_MARKDOWN } from "../src/lib/abnt/sample";
import PDFDocument from "pdfkit";

const doc = parseMarkdown(SAMPLE_MARKDOWN, DEFAULT_SETTINGS);
const tb = doc.tables[0];
const pdf = new PDFDocument({ size: "A4", margins: { top: 85.04, left: 85.04, bottom: 56.69, right: 56.69 } });
pdf.font("Times-Roman").fontSize(12);
const CW = pdf.page.width - 85.04 - 56.69;
const measure = (t: string) => pdf.widthOfString(t);

const fs = 10, pad = 4;
const ncols = tb.header.length;
const natural: number[] = Array(ncols).fill(40);
// larguras por coluna: usa tokens das células (aproximação: largura da string)
const cellsW = (runs: { text: string }[]) => Math.max(0, ...runs.map(r => measure(r.text)));
for (let c = 0; c < ncols; c++) {
  natural[c] = Math.max(natural[c], cellsW(tb.header[c]) + 2*pad);
  for (const row of tb.rows) natural[c] = Math.max(natural[c], cellsW(row[c] ?? []) + 2*pad);
}
console.log("natural por coluna:", natural.map(n => n.toFixed(0)).join(", "));
const capped = natural.map(w => Math.min(w, CW*0.55));
const total = capped.reduce((a,b)=>a+b,0);
const scale = CW/total;
const colW = capped.map(w => w*scale);
console.log("colW:", colW.map(n=>n.toFixed(0)).join(", "), "| soma:", colW.reduce((a,b)=>a+b,0).toFixed(1));

// monta linhas de cada célula do cabeçalho
const lineH = fs*1.15;
for (let c = 0; c < ncols; c++) {
  const text = tb.header[c].map(r=>r.text).join("");
  const avail = colW[c]-2*pad;
  const w = measure(text);
  const lines = Math.ceil(w/avail);
  console.log(`header[${c}] "${text}" w=${w.toFixed(0)} avail=${avail.toFixed(0)} linhas=${lines}`);
}
for (let r = 0; r < tb.rows.length; r++) {
  const row = tb.rows[r];
  let maxLines = 1;
  const det: string[] = [];
  for (let c = 0; c < ncols; c++) {
    const text = (row[c] ?? []).map(x=>x.text).join("");
    const avail = colW[c]-2*pad;
    const w = measure(text);
    const lines = Math.ceil(w/avail);
    maxLines = Math.max(maxLines, lines);
    det.push(`${text}:${lines}`);
  }
  console.log(`linha ${r}: maxLines=${maxLines} rowH=${(maxLines*lineH+2*pad).toFixed(1)} [${det.join(" | ")}]`);
}
