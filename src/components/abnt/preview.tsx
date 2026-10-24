"use client";

/* Prévia HTML aproximando o layout ABNT (A4) */

import type { AbntDocument, Block, InlineRun } from "@/lib/abnt/types";
import { fontFamilies, MONO_FONTS } from "@/lib/abnt/types";
import { Fragment, type CSSProperties, type ReactNode } from "react";

function Runs({ runs }: { runs: InlineRun[] }): ReactNode {
  return (
    <>
      {runs.map((r, i) => {
        if (r.text === "\n") return <br key={i} />;
        const style: CSSProperties = {};
        if (r.bold) style.fontWeight = 700;
        if (r.italic) style.fontStyle = "italic";
        if (r.underline) style.textDecoration = "underline";
        if (r.code) style.fontFamily = MONO_FONTS.css;
        if (r.math) style.fontFamily = "'DejaVu Serif', Georgia, serif";
        if (r.sup) style.verticalAlign = "super";
        if (r.sub) style.verticalAlign = "sub";
        if (r.sup || r.sub) style.fontSize = "0.7em";
        if (r.href) style.borderBottom = "1px dotted currentColor";
        return (
          <span key={i} style={style} title={r.href}>
            {r.text}
          </span>
        );
      })}
    </>
  );
}

const runsText = (runs: InlineRun[]): string => runs.map((r) => r.text).join("");

function DottedLine(): ReactNode {
  return <span className="mx-1 flex-1 border-b border-dotted border-neutral-500/70" style={{ transform: "translateY(-3px)" }} />;
}

function TocEntry({ text, level }: { text: string; level: number }): ReactNode {
  const caps = level <= 2;
  return (
    <div className="flex items-baseline" style={{ marginLeft: `${(level - 1) * 0.9}cm` }}>
      <span style={{ fontWeight: level === 1 || level === 3 ? 700 : 400 }}>{caps ? text.toUpperCase() : text}</span>
      <DottedLine />
      <span />
    </div>
  );
}

export function AbntPreview({ doc }: { doc: AbntDocument }) {
  const s = doc.settings;
  const t = s.toggles;
  const fontCss = fontFamilies(s.font).css;
  const monoCss = MONO_FONTS.css;

  const pageStyle: CSSProperties = {
    width: "21cm",
    minHeight: "29.7cm",
    padding: "3cm 2cm 2cm 3cm",
    background: "#ffffff",
    color: "#000000",
    fontFamily: fontCss,
    fontSize: "12pt",
    lineHeight: 1.5,
    margin: "0 auto 24px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    position: "relative",
  };

  const bodyPara: CSSProperties = { textAlign: "justify", textIndent: "1.25cm", margin: 0 };
  const centered = (extra: CSSProperties = {}): CSSProperties => ({ textAlign: "center", ...extra });

  const headingStyle = (level: number, hasNumber: boolean): CSSProperties => ({
    fontWeight: level === 1 || level === 3 ? 700 : 400,
    textTransform: level <= 2 ? "uppercase" : "none",
    fontStyle: level >= 4 ? "italic" : "normal",
    fontSize: "12pt",
    textAlign: hasNumber ? "left" : "center",
    margin: level === 1 ? "18pt 0 12pt" : "12pt 0 8pt",
    lineHeight: 1.15,
  });

  /* ---------- páginas pré-textuais ---------- */
  const pages: ReactNode[] = [];

  if (t.capa) {
    pages.push(
      <div style={pageStyle} key="capa">
        <div style={centered({ fontWeight: 700, textTransform: "uppercase" })}>{s.institution}</div>
        {s.department ? <div style={centered({ textTransform: "uppercase" })}>{s.department}</div> : null}
        <div style={{ height: "5.2cm" }} />
        {s.authors.map((a, i) => (
          <div key={i} style={centered()}>
            {a}
          </div>
        ))}
        <div style={{ height: "4.6cm" }} />
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", fontSize: "14pt" })}>{s.title}</div>
        {s.subtitle ? <div style={centered()}>{s.subtitle}</div> : null}
        <div style={{ height: "6.4cm" }} />
        <div style={centered()}>{s.city}</div>
        <div style={centered()}>{s.year}</div>
      </div>
    );
  }

  if (t.folhaRosto) {
    pages.push(
      <div style={pageStyle} key="rosto">
        <div style={centered({ fontWeight: 700, textTransform: "uppercase" })}>{s.institution}</div>
        {s.department ? <div style={centered({ textTransform: "uppercase" })}>{s.department}</div> : null}
        <div style={{ height: "4.6cm" }} />
        {s.authors.map((a, i) => (
          <div key={i} style={centered()}>
            {a}
          </div>
        ))}
        <div style={{ height: "3.6cm" }} />
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", fontSize: "14pt" })}>{s.title}</div>
        {s.subtitle ? <div style={centered()}>{s.subtitle}</div> : null}
        <div style={{ height: "2.4cm" }} />
        <div style={{ marginLeft: "50%", textAlign: "left", lineHeight: 1.15 }}>
          Artigo apresentado ao {s.department || "curso"} da {s.institution || "instituição"}, como requisito parcial para a obtenção de nota.
        </div>
        <div style={{ height: "3.4cm" }} />
        {s.advisor ? <div style={centered()}>{`${s.advisorRole}: ${s.advisor}`}</div> : null}
        {s.coadvisor ? <div style={centered()}>{`Coorientador: ${s.coadvisor}`}</div> : null}
        <div style={{ height: "2.2cm" }} />
        <div style={centered()}>{s.city}</div>
        <div style={centered()}>{s.year}</div>
      </div>
    );
  }

  if (t.aprovacao) {
    pages.push(
      <div style={pageStyle} key="aprovacao">
        {s.authors.map((a, i) => (
          <div key={i} style={centered({ fontWeight: 700, marginBottom: 6 })}>
            {a}
          </div>
        ))}
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", marginBottom: 6 })}>{s.title}</div>
        {s.subtitle ? <div style={centered({ marginBottom: 12 })}>{s.subtitle}</div> : null}
        <div style={{ height: "3cm" }} />
        <div style={centered({ marginBottom: 12 })}>
          {s.approvalDate ? `Aprovado em ${s.approvalDate}.` : "Artigo aprovado pela banca examinadora."}
        </div>
        <div style={centered({ fontWeight: 700, marginBottom: 14 })}>BANCA EXAMINADORA</div>
        {s.committee.filter((m) => m.trim()).map((m, i) => (
          <div key={i} style={centered({ marginBottom: 18 })}>
            {m}
          </div>
        ))}
      </div>
    );
  }

  const resumo = doc.resumo ?? (t.resumo ? { text: "", keywords: s.keywords } : null);
  const hasResumo = !!(doc.resumo || (t.resumo && s.keywords.length));
  if (hasResumo && resumo) {
    const kws = resumo.keywords ?? s.keywords;
    pages.push(
      <div style={pageStyle} key="resumo">
        <div style={centered({ fontWeight: 700, marginBottom: 18 })}>RESUMO</div>
        {resumo.text
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i} style={{ textAlign: "justify", lineHeight: 1.15, margin: 0 }}>
              {p}
            </p>
          ))}
        {kws?.length ? (
          <p style={{ lineHeight: 1.15, marginTop: 14 }}>
            <b>Palavras-chave:</b> {kws.map((k) => k.replace(/\.$/, "")).join(". ")}.
          </p>
        ) : null}
      </div>
    );
  }

  if (doc.abstractEn) {
    pages.push(
      <div style={pageStyle} key="abstract">
        <div style={centered({ fontWeight: 700, marginBottom: 18 })}>ABSTRACT</div>
        {doc.abstractEn.text
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i} style={{ textAlign: "justify", lineHeight: 1.15, margin: 0 }}>
              {p}
            </p>
          ))}
        {doc.abstractEn.keywords?.length ? (
          <p style={{ lineHeight: 1.15, marginTop: 14 }}>
            <b>Keywords:</b> {doc.abstractEn.keywords.map((k) => k.replace(/\.$/, "")).join(". ")}.
          </p>
        ) : null}
      </div>
    );
  }

  if (t.listaFiguras && doc.figures.length) {
    pages.push(
      <div style={pageStyle} key="listafig">
        <div style={centered({ fontWeight: 700, marginBottom: 24 })}>LISTA DE FIGURAS</div>
        {doc.figures.map((f, i) => (
          <div className="flex items-baseline" key={i}>
            <span>{`Figura ${f.num ?? i + 1} – ${f.caption ?? ""}`}</span>
            <DottedLine />
            <span />
          </div>
        ))}
      </div>
    );
  }

  if (t.listaTabelas && doc.tables.length) {
    pages.push(
      <div style={pageStyle} key="listatab">
        <div style={centered({ fontWeight: 700, marginBottom: 24 })}>LISTA DE TABELAS</div>
        {doc.tables.map((tb, i) => (
          <div className="flex items-baseline" key={i}>
            <span>{`Tabela ${tb.num ?? i + 1} – ${tb.caption ?? ""}`}</span>
            <DottedLine />
            <span />
          </div>
        ))}
      </div>
    );
  }

  if (t.sumario) {
    const headings = doc.body.filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading" && !b.special);
    pages.push(
      <div style={pageStyle} key="sumario">
        <div style={centered({ fontWeight: 700, marginBottom: 24 })}>SUMÁRIO</div>
        {headings.map((h, i) => (
          <div key={i} style={{ marginBottom: 2 }}>
            <TocEntry text={`${h.number ? `${h.number} ` : ""}${runsText(h.runs)}`} level={h.level} />
          </div>
        ))}
        {doc.references.length ? <div style={{ marginBottom: 2 }}><TocEntry text="REFERÊNCIAS" level={1} /></div> : null}
        <div style={{ marginTop: 18, fontSize: "9pt", color: "#666", fontStyle: "italic" }}>
          Os números de página do sumário e das listas são gravados nos arquivos DOCX (após atualizar campos no Word) e PDF.
        </div>
      </div>
    );
  }

  /* ---------- corpo ---------- */
  const renderBlock = (b: Block, i: number): ReactNode => {
    switch (b.type) {
      case "heading": {
        if (b.special) return null;
        const hasNumber = !!b.number;
        return (
          <div key={i} style={headingStyle(b.level, hasNumber)}>
            {b.number ? `${b.number} ` : ""}
            <Runs runs={b.runs} />
          </div>
        );
      }
      case "paragraph":
        return (
          <p key={i} style={bodyPara}>
            <Runs runs={b.runs} />
          </p>
        );
      case "blockquote":
        return (
          <p key={i} style={{ margin: "6pt 0 6pt 4cm", fontSize: "10pt", lineHeight: 1.15, textAlign: "justify" }}>
            <Runs runs={b.runs} />
          </p>
        );
      case "list":
        return (
          <div key={i} style={{ margin: "4pt 0" }}>
            {b.items.map((it, j) => (
              <Fragment key={j}>
                <div style={{ paddingLeft: "1.25cm", textAlign: "justify" }}>
                  {b.ordered ? (
                    <span>
                      {String.fromCharCode(97 + (j % 26))}
                      {") "}
                    </span>
                  ) : (
                    <span>– </span>
                  )}
                  <Runs runs={it.runs} />
                </div>
                {(it.subItems ?? []).map((sub, k) => (
                  <div key={k} style={{ paddingLeft: "1.8cm", textAlign: "justify" }}>
                    <span>– </span>
                    <Runs runs={sub.runs} />
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        );
      case "code":
        return (
          <pre
            key={i}
            style={{
              fontFamily: monoCss,
              fontSize: "10pt",
              lineHeight: 1.15,
              whiteSpace: "pre-wrap",
              margin: "6pt 0",
            }}
          >
            {b.text}
          </pre>
        );
      case "equation": {
        const num = t.numberEquations ? doc.body.slice(0, i + 1).filter((x) => x.type === "equation").length : null;
        return (
          <div key={i} style={{ position: "relative", margin: "8pt 0", textAlign: "center", fontStyle: "italic" }}>
            <Runs runs={b.runs} />
            {num !== null ? <span style={{ position: "absolute", right: 0, fontStyle: "normal" }}>({num})</span> : null}
          </div>
        );
      }
      case "figure":
        return (
          <div key={i} style={{ margin: "10pt 0" }}>
            {b.caption ? (
              <div style={centered({ marginBottom: 4 })}>{`Figura ${b.num ?? ""} – ${b.caption}`}</div>
            ) : null}
            <img
              src={b.src}
              alt={b.caption ?? "Figura"}
              style={{ maxWidth: "100%", maxHeight: "16cm", display: "block", margin: "0 auto" }}
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                const ph = el.nextElementSibling as HTMLElement | null;
                if (ph) ph.style.display = "flex";
              }}
            />
            <div
              style={{
                display: "none",
                height: "4cm",
                border: "1px solid #999",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: monoCss,
                fontSize: "9pt",
                color: "#555",
              }}
            >
              {`[ imagem não disponível: ${b.src.slice(0, 60)} ]`}
            </div>
            <div style={centered({ fontSize: "10pt", marginTop: 4, marginBottom: 12 })}>
              {b.sourceNote || s.sourceNote}
            </div>
          </div>
        );
      case "table":
        return (
          <div key={i} style={{ margin: "10pt 0", breakInside: "avoid" }}>
            {b.caption ? <div style={centered({ marginBottom: 6 })}>{`Tabela ${b.num ?? ""} – ${b.caption}`}</div> : null}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt", lineHeight: 1.15 }}>
              <thead>
                <tr>
                  {b.header.map((cell, c) => (
                    <th
                      key={c}
                      style={{
                        fontWeight: 700,
                        textAlign: "center",
                        borderTop: "1px solid #000",
                        borderBottom: "1px solid #000",
                        padding: "3px 5px",
                      }}
                    >
                      <Runs runs={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r}>
                    {b.header.map((_, c) => (
                      <td
                        key={c}
                        style={{
                          padding: "3px 5px",
                          textAlign: b.align[c] === "center" ? "center" : b.align[c] === "right" ? "right" : "left",
                        }}
                      >
                        <Runs runs={row[c] ?? []} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ width: "100%", borderTop: "1px solid #000", marginBottom: 4 }} />
            <div style={centered({ fontSize: "10pt", marginBottom: 10 })}>{b.sourceNote || s.sourceNote}</div>
          </div>
        );
      default:
        return null;
    }
  };

  pages.push(
    <div style={pageStyle} key="corpo">
      {doc.body.map(renderBlock)}
      {doc.references.length ? (
        <>
          <div style={headingStyle(1, false)}>REFERÊNCIAS</div>
          {doc.references.map((entry, i) => (
            <p key={i} style={{ textAlign: "left", lineHeight: 1.15, margin: "0 0 12pt" }}>
              <Runs runs={entry} />
            </p>
          ))}
        </>
      ) : null}
    </div>
  );

  return (
    <div className="abnt-preview" style={{ background: "transparent" }}>
      {pages}
    </div>
  );
}
