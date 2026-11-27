/* Testa o fluxo de figuras: imagem acima/abaixo do título, numeração híbrida, fonte */
const { parseMarkdown } = require("/home/z/my-project/.gentest/abnt/parse.js");
const { DEFAULT_SETTINGS } = require("/home/z/my-project/.gentest/abnt/types.js");

function figs(md, style = "abnt") {
  const doc = parseMarkdown(md, { ...DEFAULT_SETTINGS, style });
  return {
    figures: doc.figures.map((f) => ({ num: f.num, caption: f.caption, src: f.src, fonte: f.sourceNote, pct: f.widthPct })),
    strayParas: doc.body
      .filter((b) => b.type === "paragraph")
      .map((b) => b.runs.map((r) => r.text).join(""))
      .filter((t) => /figura/i.test(t)),
  };
}

const S = "/api/uploads/foto.png";

// T1 — fluxo do botão: imagem inserida ACIMA da linha de título
let r = figs(`Intro antes.\n\n![Circuito](${S})\n\nFigura 1 – Circuito montado\n\nFonte: autor (2025).\n`);
console.log("T1 figs:", JSON.stringify(r.figures), "| parágrafos soltos com 'figura':", JSON.stringify(r.strayParas));

// T2 — fluxo antigo: título antes da imagem, número explícito 3 (híbrido mantém)
r = figs(`Figura 3 – Gráfico de tensão\n\n![](${S})\n`);
console.log("T2 figs:", JSON.stringify(r.figures), "| soltos:", JSON.stringify(r.strayParas));

// T3 — título sem número → numeração automática
r = figs(`Figura – Gráfico sem número\n\n![](${S})\n`);
console.log("T3 figs:", JSON.stringify(r.figures));

// T4 — imagem com alt e SEM linha de título → caption do alt, numeração automática
r = figs(`![Figura 2 – Fluxo do método](/figura.png)\n`);
console.log("T4 figs:", JSON.stringify(r.figures));

// T5 — frase comum começando com "Figura" não vira legenda quando não há figura antes
r = figs(`Figura mostra o comportamento do sistema em regime permanente.\n`);
console.log("T5 figs:", JSON.stringify(r.figures), "| soltos:", JSON.stringify(r.strayParas));

// T6 — numeração sequencial com híbridos misturados
r = figs(`Figura 7 – Sete\n\n![](${S})\n\nFigura – Oito automática\n\n![](${S})\n`);
console.log("T6 figs:", JSON.stringify(r.figures));

// T7 — largura "60%" no title (fluxo do botão e fluxo antigo)
r = figs(`![Circuito](${S} "60%")\n\nFigura 1 – Circuito reduzido\n`);
console.log("T7 figs:", JSON.stringify(r.figures));
r = figs(`Figura 2 – Metade\n\n![](${S} "50%")\n`);
console.log("T7b figs:", JSON.stringify(r.figures));

// T8 — larguras inválidas/fora do intervalo são ignoradas
r = figs(`![](${S} "150%")\n\n![](${S} "abc%")\n\n![](${S} "8%")\n`);
console.log("T8 figs:", JSON.stringify(r.figures));
