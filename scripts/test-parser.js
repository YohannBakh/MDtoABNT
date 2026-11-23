/* Teste rápido do parser: containers, quebras de linha, pagebreak */
const { parseMarkdown } = require("/tmp/parsetest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/parsetest/types.js");

const md = `# Título

::: center
Texto centralizado com **negrito**.

::: right
Direita aqui
:::

Linha um
linha dois
linha três

Fim do bloco centralizado
:::

Parágrafo normal depois do container.

<!-- pagebreak -->

# Outra seção

::: centro
Centralizado com acento
:::
`;

const settings = { ...DEFAULT_SETTINGS, style: "relatorio", toggles: { ...DEFAULT_SETTINGS.toggles } };
const doc = parseMarkdown(md, settings);

console.log("=== blocos ===");
for (const b of doc.body) {
  if (b.type === "paragraph") {
    console.log(`paragraph align=${b.align ?? "-"} runs=${JSON.stringify(b.runs)}`);
  } else if (b.type === "heading") {
    console.log(`heading L${b.level} centered=${b.centered} runs=${JSON.stringify(b.runs.map(r=>r.text))}`);
  } else {
    console.log(b.type);
  }
}

/* testes extras */
const md2 = "calc line\noutra calc = 2 / 3 = 0,66";
const doc2 = parseMarkdown(md2, settings);
console.log("\n=== quebra de linha (ligada) ===");
console.log(JSON.stringify(doc2.body[0].runs));

const off = { ...settings, toggles: { ...settings.toggles, lineBreaks: false } };
const doc3 = parseMarkdown("linha um\nlinha dois", off);
console.log("=== quebra de linha (desligada) ===");
console.log(JSON.stringify(doc3.body[0].runs));
