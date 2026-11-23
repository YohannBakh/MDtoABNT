/* Testa o comando \\ de quebra de linha em DOCX + PDF (estilo relatório),
 * com o ajuste de Enter ligado e desligado. Saída em /tmp e imagens em /tmp/render */
const { parseMarkdown } = require("/tmp/gentest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/gentest/types.js");
const { buildReportDocxBlob } = require("/tmp/gentest/docx-report.js");
const { buildReportPdfBuffer } = require("/tmp/gentest/pdf-report.js");
const fs = require("fs");

const MD = `# Resultados e cálculos

As correntes e tensões foram obtidas conforme os cálculos a seguir, com o comando de quebra de linha:

1000 + 2200 = 3200
i = 12 / 3200 = 3,75 mA \\\\
VR1 = 1000 × 3,75 mA = 3,75 V \\\\
VR2 = 12 − 3,75 = 8,25 V

Parágrafo normal após os cálculos, apenas para conferir o espaçamento entre blocos e o recuo de primeira linha do estilo relatório técnico de experimento.

::: center
**Relatório de teste — comando \\\\ no fim da linha**
:::
`;

(async () => {
  const base = { ...DEFAULT_SETTINGS, style: "relatorio" };
  base.report = { ...base.report, showCover: false };

  for (const [tag, toggles] of [
    ["on", { ...base.toggles }],
    ["off", { ...base.toggles, lineBreaks: false }],
  ]) {
    const s = { ...base, toggles };
    const doc = parseMarkdown(MD, s);
    fs.writeFileSync(`/tmp/test-br-${tag}.docx`, await buildReportDocxBlob(doc));
    fs.writeFileSync(`/tmp/test-br-${tag}.pdf`, await buildReportPdfBuffer(doc));
    console.log(`ok: /tmp/test-br-${tag}.docx /tmp/test-br-${tag}.pdf`);
  }
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
