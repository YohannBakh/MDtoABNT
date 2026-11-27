/* Testa sublinhado ponta a ponta: DOCX (w:u no XML) e PDF (não quebra) */
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

const md = "Texto com <u>termo sublinhado</u> e **negrito** no corpo.\n\n::: center\n<u>Equação centralizada: $v = i \\cdot r$</u>\n:::\n\n| <u>Campo</u> | Valor |\n| --- | --- |\n| Tensão | <u>127 V</u> |\n";

(async () => {
  for (const [style, docFn, pdfFn, base] of [
    ["abnt", buildDocxBlob, buildPdfBuffer, "u-abnt"],
    ["relatorio", buildReportDocxBlob, buildReportPdfBuffer, "u-rel"],
    ["cnpq", buildCnpqDocxBlob, buildCnpqPdfBuffer, "u-cnpq"],
  ]) {
    const settings = { ...DEFAULT_SETTINGS, style, fileName: base };
    const doc = parseMarkdown(md, settings);
    fs.writeFileSync(`/tmp/brtest/${base}.docx`, await docFn(doc));
    const pdfBuf = await pdfFn(doc);
    fs.writeFileSync(`/tmp/brtest/${base}.pdf`, pdfBuf);
    execSync(`cd /tmp/brtest && rm -rf x && mkdir x && cd x && unzip -q ../${base}.docx word/document.xml`);
    const xml = fs.readFileSync("/tmp/brtest/x/word/document.xml", "utf8");
    const wu = (xml.match(/<w:u /g) || []).length;
    console.log(style, "| DOCX <w:u>:", wu, "| PDF bytes:", pdfBuf.length, "| início:", pdfBuf.slice(0, 5).toString());
  }
  console.log("OK: 3 estilos geraram DOCX e PDF com sublinhado");
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
