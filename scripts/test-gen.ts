/* Teste rápido do núcleo MD2ABNT (executar com: bun scripts/test-gen.ts) */
import { parseMarkdown } from "../src/lib/abnt/parse";
import { DEFAULT_SETTINGS } from "../src/lib/abnt/types";
import { buildDocxBlob } from "../src/lib/abnt/docx";
import { buildPdfBuffer } from "../src/lib/abnt/pdf";
import { SAMPLE_MARKDOWN } from "../src/lib/abnt/sample";
import { writeFileSync, mkdirSync } from "node:fs";

const doc = parseMarkdown(SAMPLE_MARKDOWN, DEFAULT_SETTINGS);

console.log("== MODELO ==");
console.log("título:", doc.settings.title);
console.log("autores:", doc.settings.authors.length);
console.log("resumo:", doc.resumo ? `${doc.resumo.text.length} chars, kws=${doc.resumo.keywords?.join(", ")}` : "—");
console.log("abstract:", doc.abstractEn ? "ok" : "—");
console.log("body blocks:", doc.body.length);
const kinds: Record<string, number> = {};
for (const b of doc.body) kinds[b.type] = (kinds[b.type] ?? 0) + 1;
console.log("tipos:", JSON.stringify(kinds));
console.log("figuras:", doc.figures.length, "| tabelas:", doc.tables.length);
console.log("referências:", doc.references.length);
const headings = doc.body.filter((b) => b.type === "heading") as { number?: string; runs: { text: string }[]; special?: string }[];
for (const h of headings) console.log(`  H ${h.number ?? "-"} ${h.special ?? ""} ${h.runs.map((r) => r.text).join("")}`);

mkdirSync("scripts/out", { recursive: true });

const docxBuf = await buildDocxBlob(doc);
writeFileSync("scripts/out/teste.docx", docxBuf);
console.log("DOCX:", docxBuf.length, "bytes");

const pdfBuf = await buildPdfBuffer(doc);
writeFileSync("scripts/out/teste.pdf", pdfBuf);
console.log("PDF:", pdfBuf.length, "bytes");
