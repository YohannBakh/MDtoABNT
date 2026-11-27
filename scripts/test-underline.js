/* Testa a sintaxe <u> (sublinhado) e o comportamento de containers/quebras */
const { parseMarkdown } = require("/tmp/gentest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/gentest/types.js");
const BS = String.fromCharCode(92);

// 1. sublinhado <u> em parágrafo, com negrito dentro
let doc = parseMarkdown("texto com <u>termo **importante**</u> no meio", { ...DEFAULT_SETTINGS, style: "abnt" });
let p = doc.body.find((b) => b.type === "paragraph");
console.log("T1 runs:", p.runs.map((r) => `${r.text}${r.underline ? "[U]" : ""}${r.bold ? "[B]" : ""}`).join(" | "));

// 2. <u> dentro de ::: center
doc = parseMarkdown("::: center\n<u>centrado e sublinhado</u>\n:::", { ...DEFAULT_SETTINGS, style: "abnt" });
p = doc.body.find((b) => b.type === "paragraph");
console.log("T2 runs:", p.runs.map((r) => `${r.text}${r.underline ? "[U]" : ""}`).join(" | "), "| centered:", p.centered);

// 3. regressão do bug anterior: quebra \\ antes de ::: center
doc = parseMarkdown("fim do parágrafo:\n" + BS + "\n::: center\ntítulo\n:::", { ...DEFAULT_SETTINGS, style: "abnt" });
console.log("T3 runs:", doc.body.filter((b) => b.type === "paragraph").map((b) => JSON.stringify(b.runs.map((r) => r.text).join("|"))).join("  ·  "));

// 4. <u> multilinha e html <sub> continuam virando texto limpo
doc = parseMarkdown("linha <u>sub\nlin</u> e <sub>i</sub> fim", { ...DEFAULT_SETTINGS, style: "abnt" });
p = doc.body.find((b) => b.type === "paragraph");
console.log("T4 runs:", p.runs.map((r) => `${r.text}${r.underline ? "[U]" : ""}`).join(" | "));
