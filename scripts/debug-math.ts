import { marked } from "marked";

const md = "$$D(t) = D_0 + \\alpha \\cdot \\sqrt{t}$$";
const tokens = marked.lexer(md) as any[];
for (const t of tokens) {
  console.log("tipo:", t.type);
  if (t.type === "paragraph") {
    for (const c of t.tokens ?? []) {
      console.log("  inline:", c.type, JSON.stringify(c.raw ?? c.text));
    }
  }
}
