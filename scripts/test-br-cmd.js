/* Teste do comando de quebra de linha \\ */
const { parseMarkdown } = require("/tmp/parsetest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/parsetest/types.js");

const base = { ...DEFAULT_SETTINGS, style: "relatorio" };

const md = `Calculos com comando:

i = 12 / 3200 = 3,75 mA \\
VR1 = 1000 × 3,75 mA = 3,75 V \\
VR2 = 12 − 3,75 = 8,25 V

Texto antes \\
depois do comando.

Linha com barra unica: C:\\Users\\teste nao deve quebrar.
`;

console.log("=== ENTER LIGADO (padrão) ===");
const d1 = parseMarkdown(md, base);
const p1 = d1.body.find((b) => b.type === "paragraph" && b.runs.some((r) => r.text.includes("i = 12")));
console.log(JSON.stringify(p1.runs));

console.log("=== ENTER DESLIGADO ===");
const off = { ...base, toggles: { ...base.toggles, lineBreaks: false } };
const d2 = parseMarkdown(md, off);
const p2 = d2.body.find((b) => b.type === "paragraph" && b.runs.some((r) => r.text.includes("i = 12")));
console.log(JSON.stringify(p2.runs));

console.log("=== barra unica (path Windows) ===");
const p3 = d1.body.find((b) => b.type === "paragraph" && b.runs.some((r) => r.text.includes("Users")));
console.log(JSON.stringify(p3.runs));
