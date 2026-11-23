/* Gera documentos de teste: relatório sem capa (novo padrão) e com capa,
 * exercitando quebras de linha, containers de alinhamento e pagebreak */
const { parseMarkdown } = require("/tmp/gentest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/gentest/types.js");
const { buildReportDocxBlob } = require("/tmp/gentest/docx-report.js");
const { buildReportPdfBuffer } = require("/tmp/gentest/pdf-report.js");
const { buildDocxBlob } = require("/tmp/gentest/docx.js");
const fs = require("fs");

const MD = `# Descrição da atividade

O experimento teve como objetivo comparar os valores medidos com os calculados pelos métodos teóricos estudados em aula, verificando a consistência do circuito montado em protoboard.

# Resultados

As correntes e tensões foram obtidas conforme os cálculos a seguir:

1000 + 2200 = 3200
i = 12 / 3200 = 3,75 mA
VR1 = 1000 × 3,75 mA = 3,75 V
VR2 = 12 − 3,75 = 8,25 V

::: center
Este parágrafo está centralizado pelo bloco :::.
:::

::: right
Tabela de apoio à direita.
:::

# Medições

A imagem abaixo ilustra o circuito montado:

![Figura 1 – Circuito montado em protoboard](/sample-figure.png)

Fonte: elaborada pelo autor.

<!-- pagebreak -->

# Conclusão

Os desvios observados ficaram abaixo de 1,5%, validando os conceitos aplicados.

::: center
**Relatório encerrado — ECA 2025**
:::
`;

(async () => {
  const base = { ...DEFAULT_SETTINGS, style: "relatorio" };
  base.report = { ...base.report, showCover: false };

  // 1) relatório sem capa (novo padrão) — DOCX
  const doc1 = parseMarkdown(MD, base);
  fs.writeFileSync("/tmp/test-report-nocapa.docx", await buildReportDocxBlob(doc1));

  // 2) relatório sem capa — PDF
  fs.writeFileSync("/tmp/test-report-nocapa.pdf", await buildReportPdfBuffer(doc1));

  // 3) relatório COM capa — DOCX (toggle ligado)
  const s2 = { ...base, report: { ...base.report, showCover: true } };
  const doc2 = parseMarkdown(MD, s2);
  fs.writeFileSync("/tmp/test-report-capa.docx", await buildReportDocxBlob(doc2));

  // 4) ABNT com alinhamento + pagebreak — PDF
  const sabnt = { ...DEFAULT_SETTINGS, style: "abnt" };
  const mdAbnt = `# Introdução

Parágrafo justificado normal para comparar o comportamento da última linha do parágrafo, que agora deve permanecer alinhado à esquerda como manda a norma, e não mais centralizado como acontecia antes da correção feita nesta versão do gerador.

::: center
Parágrafo centralizado via container.
:::

<!-- pagebreak -->

# Metodologia

Texto após quebra de página manual.
`;
  const doc3 = parseMarkdown(mdAbnt, sabnt);
  fs.writeFileSync("/tmp/test-abnt.pdf", await require("/tmp/gentest/pdf.js").buildPdfBuffer(doc3));
  fs.writeFileSync("/tmp/test-abnt.docx", await buildDocxBlob(doc3));

  console.log("ok — documentos gerados");
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
