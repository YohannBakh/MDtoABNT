/* Testa figuras ponta a ponta nos 3 estilos: imagem de /api/uploads, título acima, fonte abaixo */
const { parseMarkdown } = require("/home/z/my-project/.gentest/abnt/parse.js");
const { DEFAULT_SETTINGS } = require("/home/z/my-project/.gentest/abnt/types.js");
const { buildDocxBlob } = require("/home/z/my-project/.gentest/abnt/docx.js");
const { buildReportDocxBlob } = require("/home/z/my-project/.gentest/abnt/docx-report.js");
const { buildCnpqDocxBlob } = require("/home/z/my-project/.gentest/abnt/docx-cnpq.js");
const { buildPdfBuffer } = require("/home/z/my-project/.gentest/abnt/pdf.js");
const { buildReportPdfBuffer } = require("/home/z/my-project/.gentest/abnt/pdf-report.js");
const { buildCnpqPdfBuffer } = require("/home/z/my-project/.gentest/abnt/pdf-cnpq.js");
const fs = require("fs");
const { execSync } = require("child_process");

// fluxo do usuário: imagem acima da linha de título, fonte personalizada na 2ª figura
const md = [
  "## Resultados",
  "",
  "![Montagem do circuito](/api/uploads/test-fig.png)",
  "",
  "Figura 1 – Montagem do circuito",
  "",
  "A Figura 1 mostra a montagem.",
  "",
  "![Gráfico](/api/uploads/test-fig.png)",
  "",
  "Figura 2 – Tensão no capacitor",
  "",
  "Fonte: dados do experimento (2025).",
  "",
  "![Sem título](/api/uploads/test-fig.png)",
].join("\n");

(async () => {
  for (const [style, docFn, pdfFn, base] of [
    ["abnt", buildDocxBlob, buildPdfBuffer, "fig-abnt"],
    ["relatorio", buildReportDocxBlob, buildReportPdfBuffer, "fig-rel"],
    ["cnpq", buildCnpqDocxBlob, buildCnpqPdfBuffer, "fig-cnpq"],
  ]) {
    const settings = { ...DEFAULT_SETTINGS, style, fileName: base };
    const doc = parseMarkdown(md, settings);
    console.log(style, "figs:", JSON.stringify(doc.figures.map((f) => ({ num: f.num, cap: f.caption, fonte: f.sourceNote }))));
    fs.writeFileSync(`/home/z/my-project/.gentest/out/${base}.docx`, await docFn(doc));
    const pdf = await pdfFn(doc);
    fs.writeFileSync(`/home/z/my-project/.gentest/out/${base}.pdf`, pdf);
    execSync(`cd /home/z/my-project/.gentest/out && rm -rf x && mkdir x && cd x && unzip -qo ../${base}.docx word/document.xml`);
    const xml = fs.readFileSync("/home/z/my-project/.gentest/out/x/word/document.xml", "utf8");
    const drawings = (xml.match(/<w:drawing>/g) || []).length;
    const capIdx = xml.indexOf("Figura 1 – Montagem do circuito");
    const drawIdx = xml.indexOf("<w:drawing>");
    const fonteIdx = xml.indexOf("Fonte: dados do experimento");
    console.log(style, "| drawings:", drawings, "| título antes da 1ª imagem:", capIdx > -1 && capIdx < drawIdx, "| fonte presente:", fonteIdx > -1, "| pdf bytes:", pdf.length);
  }
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
