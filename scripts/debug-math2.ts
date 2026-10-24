// teste direto da mathToRuns copiando a lógica principal
const GREEK: Record<string, string> = { alpha: "α", Delta: "Δ" };
const OPS: Record<string, string> = { cdot: "·", sqrt: "√" };

function mathToRuns(tex: string): { text: string; sup?: boolean; sub?: boolean }[] {
  const runs: { text: string; sup?: boolean; sub?: boolean }[] = [];
  let buf = "";
  const flush = () => { if (buf) { runs.push({ text: buf }); buf = ""; } };
  let i = 0;
  const s = tex.trim();
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      const m = s.slice(i).match(/^\\([A-Za-z]+)/);
      if (m) {
        const cmd = m[1];
        i += m[0].length;
        if (cmd === "sqrt") {
          while (s[i] === " ") i++;
          // readGroup simples
          if (s[i] === "{") {
            let depth = 0, j = i;
            for (; j < s.length; j++) { if (s[j] === "{") depth++; else if (s[j] === "}") { depth--; if (!depth) break; } }
            const content = s.slice(i+1, j);
            i = j + 1;
            buf += `√(${content})`;
            continue;
          }
          buf += "√";
          continue;
        }
        const sym = GREEK[cmd] ?? OPS[cmd];
        if (sym) buf += sym; else buf += cmd;
        continue;
      }
      buf += c; i++; continue;
    }
    if (c === "_" || c === "^") {
      i++;
      while (s[i] === " ") i++;
      if (s[i] === "{") {
        let depth = 0, j = i;
        for (; j < s.length; j++) { if (s[j] === "{") depth++; else if (s[j] === "}") { depth--; if (!depth) break; } }
        const content = s.slice(i+1, j);
        i = j + 1;
        flush();
        runs.push({ text: content, sub: c === "_" ? true : undefined, sup: c === "^" ? true : undefined });
        continue;
      }
      const content = s[i] ?? "";
      i++;
      flush();
      runs.push({ text: content, sub: c === "_" ? true : undefined });
      continue;
    }
    buf += c; i++;
  }
  flush();
  return runs;
}
console.log(JSON.stringify(mathToRuns("D(t) = D_0 + \\alpha \\cdot \\sqrt{t}")));
