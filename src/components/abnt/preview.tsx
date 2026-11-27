"use client";

/* Prévia HTML aproximando o layout ABNT (A4) */

import type { AbntDocument, Block, InlineRun } from "@/lib/abnt/types";
import { REPORT, fontFamilies, MONO_FONTS } from "@/lib/abnt/types";
import { LOGO_IF_BASE64 } from "@/lib/abnt/logos";
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

/** Título + tabela de identificação do relatório, no topo da 1ª página (texto continua na sequência) */
function ReportCoverBlock({ doc }: { doc: AbntDocument }): ReactNode {
  const rc = doc.settings.report;
  const num = rc.activityNumber.trim();
  const authors = doc.settings.authors.filter((a) => a.trim()).join("; ");
  const cellBase: CSSProperties = { border: "1px solid #000", padding: "3px 8px", verticalAlign: "middle", lineHeight: 1.15 };
  const fieldCell = (label: string, value: string, key: string): ReactNode => (
    <td key={key} style={cellBase}>
      <b>{label}: </b>
      {value}
    </td>
  );
  return (
    <div style={{ marginBottom: "10pt" }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: "16pt", lineHeight: 1.15, margin: "4pt 0 8pt" }}>
        {`${rc.activityLabel}${num ? ` Nº ${num}` : ""}`}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12pt" }}>
        <tbody>
          <tr style={{ height: "0.6cm" }}>
            {fieldCell("Disciplina", rc.disciplina, "d")}
            {fieldCell("Turma", rc.turma, "t")}
          </tr>
          <tr style={{ height: "0.6cm" }}>
            {fieldCell("Professor", rc.professor, "p")}
            {fieldCell("Período", rc.periodo, "per")}
          </tr>
          <tr style={{ height: "0.6cm" }}>
            {fieldCell("Aluno(s)", authors, "a")}
            {fieldCell("Data da atividade", rc.dataAtividade, "dt")}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function AbntPreview({ doc }: { doc: AbntDocument }) {
  const s = doc.settings;
  const t = s.toggles;
  const fontCss = fontFamilies(s.font).css;
  const monoCss = MONO_FONTS.css;
  const isReport = s.style === "relatorio";
  const isCnpq = s.style === "cnpq";
  const isAbnt = s.style === "abnt";

  const pageStyle: CSSProperties = {
    width: "21cm",
    minHeight: "29.7cm",
    padding: isCnpq ? "4.3cm 2cm 2cm 2cm" : isReport ? "2.9cm 3cm 2.5cm 3cm" : "3cm 2cm 2cm 3cm",
    background: "#ffffff",
    color: "#000000",
    fontFamily: fontCss,
    fontSize: "12pt",
    lineHeight: isCnpq || isReport ? 1.15 : 1.5,
    margin: "0 auto 24px",
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    position: "relative",
  };

  /** cabeçalho institucional de texto: 2 linhas + régua verde (zona do header do DOCX/PDF) */
  const textHeader = isReport ? (
    <div style={{ textAlign: "center", marginBottom: "6pt" }}>
      <div style={{ fontWeight: 700, color: `#${REPORT.headerGreen}`, fontSize: "12pt", lineHeight: 1.15 }}>{s.report.headerInstitution}</div>
      <div style={{ color: `#${REPORT.headerGray}`, fontSize: "9pt", lineHeight: 1.15 }}>{s.report.course}</div>
      <div style={{ borderBottom: `1pt solid #${REPORT.headerGreen}`, marginTop: "2pt" }} />
    </div>
  ) : null;

  /** cabeçalho CNPq: logo IF + bloco ministerial (aparece em todas as páginas da prévia) */
  const cnpqHeader = isCnpq ? (
    <div style={{ display: "flex", alignItems: "center", gap: "0.8cm", marginBottom: "10pt" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_IF_BASE64} alt="Logo IF Catarinense" style={{ width: "4.9cm", height: "1.63cm", objectFit: "contain" }} />
      <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: "8pt", lineHeight: 1.35 }}>
        <div>{s.cnpq.ministry1}</div>
        <div>{s.cnpq.ministry2}</div>
        <div>{s.institution}</div>
      </div>
    </div>
  ) : null;

  const bodyPara: CSSProperties = isCnpq
    ? { textAlign: "justify", textIndent: "1.25cm", margin: 0, lineHeight: 1.15 }
    : isReport
      ? { textAlign: "justify", textIndent: "1.27cm", margin: 0, lineHeight: 1.15 }
      : { textAlign: "justify", textIndent: "1.25cm", margin: 0 };
  const centered = (extra: CSSProperties = {}): CSSProperties => ({ textAlign: "center", ...extra });

  const headingStyle = (level: number, hasNumber: boolean): CSSProperties =>
    isCnpq
      ? {
          fontWeight: 700,
          fontSize: "12pt",
          textAlign: "left",
          margin: "12pt 0 4pt",
          lineHeight: 1.15,
          textTransform: level <= 2 ? "uppercase" : "none",
        }
      : isReport
        ? {
            fontWeight: 700,
            fontSize: "12pt",
            textAlign: "left",
            margin: "10pt 0 2pt",
            lineHeight: 1.15,
            marginLeft: `${0.64 + (level - 1) * 0.5}cm`,
            textIndent: "-0.64cm",
          }
        : {
            fontWeight: level === 1 || level === 3 ? 700 : 400,
            textTransform: level <= 2 ? "uppercase" : "none",
            fontStyle: level >= 4 ? "italic" : "normal",
            fontSize: "12pt",
            textAlign: hasNumber ? "left" : "center",
            margin: level === 1 ? "18pt 0 12pt" : "12pt 0 8pt",
            lineHeight: 1.15,
          };

  /** linha de cálculo: curta, com "=" e dígitos — sem recuo (padrão dos relatórios) */
  const isCalc = (runs: InlineRun[]): boolean => {
    const tx = runsText(runs).trim();
    if (tx.length === 0 || tx.length > 60 || tx.includes("\n")) return false;
    if (/^(para|onde|com|sendo|logo|assim)\b/i.test(tx)) return false;
    return /=/.test(tx) && /\d/.test(tx);
  };

  /* ---------- páginas pré-textuais ---------- */
  const pages: ReactNode[] = [];

  if (isCnpq && s.cnpq.showCover) {
    const c = s.cnpq;
    const edital = c.edital.trim() ? ` em cumprimento à exigência do Edital ${c.edital.trim()}` : "";
    pages.push(
      <div style={pageStyle} key="cnpq-capa">
        {cnpqHeader}
        <div style={{ height: "1.4cm" }} />
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", lineHeight: 1.15 })}>{s.institution}</div>
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", lineHeight: 1.15 })}>{c.campus}</div>
        {s.department.trim() ? <div style={centered({ fontWeight: 700, textTransform: "uppercase", lineHeight: 1.15 })}>{s.department}</div> : null}
        <div style={{ height: "3.4cm" }} />
        <div style={centered({ fontWeight: 700, textTransform: "uppercase", lineHeight: 1.15 })}>{s.title}</div>
        {s.subtitle.trim() ? <div style={centered({ lineHeight: 1.15 })}>{s.subtitle}</div> : null}
        <div style={{ height: "2cm" }} />
        {s.authors.filter((a) => a.trim()).map((a, i) => (
          <div key={i} style={centered({ fontWeight: 700, lineHeight: 1.15 })}>
            {a}
          </div>
        ))}
        <div style={{ height: "2.4cm" }} />
        <div style={{ marginLeft: "9.3cm", textAlign: "justify", lineHeight: 1.15 }}>
          {`${c.reportKind} apresentado ao ${s.institution}${edital}.`}
        </div>
        <div style={{ height: "0.5cm" }} />
        {s.advisor.trim() ? (
          <div style={{ marginLeft: "9.3cm", textAlign: "left", lineHeight: 1.15 }}>{`${s.advisorRole}: ${s.advisor.trim()}.`}</div>
        ) : null}
        {s.coadvisor.trim() ? (
          <div style={{ marginLeft: "9.3cm", textAlign: "left", lineHeight: 1.15 }}>{`Coorientador: ${s.coadvisor.trim()}.`}</div>
        ) : null}
        <div style={{ height: "4.4cm" }} />
        <div style={centered({ fontWeight: 700, lineHeight: 1.15 })}>{s.city}</div>
        {c.monthYear.trim() ? <div style={centered({ fontWeight: 700, lineHeight: 1.15 })}>{c.monthYear}</div> : null}
      </div>
    );
  }

  if (isCnpq && doc.resumo) {
    const kws = doc.resumo.keywords ?? s.keywords;
    pages.push(
      <div style={pageStyle} key="cnpq-resumo">
        {cnpqHeader}
        <div style={{ fontWeight: 700, marginBottom: "10pt" }}>RESUMO</div>
        {doc.resumo.text
          .split(/\n\n+/)
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i} style={{ textAlign: "justify", textIndent: "1.25cm", lineHeight: 1.15, margin: 0 }}>
              {p.trim()}
            </p>
          ))}
        {kws.length ? (
          <p style={{ lineHeight: 1.15, marginTop: "10pt", textAlign: "justify" }}>
            <b>PALAVRAS-CHAVE:</b> {kws.map((k) => k.replace(/\.$/, "")).join(", ")}.
          </p>
        ) : null}
      </div>
    );
  }

  if (isAbnt && t.capa) {
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

  if (isAbnt && t.folhaRosto) {
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

  if (isAbnt && t.aprovacao) {
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
  if (isAbnt && hasResumo && resumo) {
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

  if (isAbnt && doc.abstractEn) {
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

  if (isAbnt && t.listaFiguras && doc.figures.length) {
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

  if (isAbnt && t.listaTabelas && doc.tables.length) {
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

  if (isAbnt && t.sumario) {
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
        const numLabel = (isReport || isCnpq) && b.number && b.level === 1 ? `${b.number}. ` : b.number ? `${b.number} ` : "";
        const hs = headingStyle(b.level, hasNumber);
        const hStyle: CSSProperties = b.centered
          ? { ...hs, textAlign: "center", marginLeft: 0, textIndent: 0 }
          : hs;
        return (
          <div key={i} style={hStyle}>
            {numLabel}
            <Runs runs={b.runs} />
          </div>
        );
      }
      case "paragraph": {
        const a = b.align;
        const baseStyle: CSSProperties = isReport && isCalc(b.runs) ? { ...bodyPara, textIndent: 0 } : bodyPara;
        const pStyle: CSSProperties = a
          ? {
              ...baseStyle,
              textAlign: a,
              ...(a === "center" || a === "right" ? { textIndent: 0 } : {}),
            }
          : baseStyle;
        return (
          <p key={i} style={pStyle}>
            <Runs runs={b.runs} />
          </p>
        );
      }
      case "pagebreak":
        return (
          <div
            key={i}
            style={{
              borderTop: "2px dashed #a3a3a3",
              margin: "18pt 0",
              paddingTop: "4pt",
              textAlign: "center",
              fontSize: "9pt",
              color: "#888",
              fontFamily: monoCss,
            }}
          >
            quebra de página
          </div>
        );
      case "blockquote":
        return (
          <p
            key={i}
            style={{
              margin: "6pt 0 6pt 4cm",
              fontSize: isReport ? "12pt" : "10pt",
              lineHeight: 1.15,
              textAlign: isReport ? "left" : "justify",
            }}
          >
            <Runs runs={b.runs} />
          </p>
        );
      case "list":
        return (
          <div key={i} style={{ margin: "4pt 0" }}>
            {b.items.map((it, j) => (
              <Fragment key={j}>
                <div style={{ paddingLeft: isReport ? "1.27cm" : "1.25cm", textAlign: isReport || isCnpq ? "left" : "justify", lineHeight: 1.15 }}>
                  {b.ordered ? (
                    <span>{isReport || isCnpq ? `${j + 1}. ` : `${String.fromCharCode(97 + (j % 26))}) `}</span>
                  ) : (
                    <span>– </span>
                  )}
                  <Runs runs={it.runs} />
                </div>
                {(it.subItems ?? []).map((sub, k) => (
                  <div key={k} style={{ paddingLeft: isReport ? "1.8cm" : "1.8cm", textAlign: isReport || isCnpq ? "left" : "justify", lineHeight: 1.15 }}>
                    <span>{(isReport || isCnpq) && b.ordered ? `${j + 1}.${k + 1} ` : "– "}</span>
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
              margin: isCnpq ? "6pt 0 6pt 1.25cm" : "6pt 0",
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
        if (isCnpq) {
          return (
            <div key={i} style={{ margin: "10pt 0" }}>
              {b.caption ? <div style={centered({ marginBottom: 4 })}>{`Figura ${b.num ?? ""} - ${b.caption}`}</div> : null}
              <img
                src={b.src}
                alt={b.caption ?? "Figura"}
                style={{
                  maxWidth: b.widthPct ? `${b.widthPct}%` : "100%",
                  maxHeight: "14cm",
                  display: "block",
                  ...(b.align === "left" ? { marginRight: "auto" } : b.align === "right" ? { marginLeft: "auto" } : { margin: "0 auto" }),
                }}
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
              {b.sourceNote ? (
                <div style={centered({ marginTop: 4, marginBottom: 10 })}>{b.sourceNote.startsWith("Fonte") ? b.sourceNote : `Fonte: ${b.sourceNote}`}</div>
              ) : null}
            </div>
          );
        }
        return (
          <div key={i} style={{ margin: "10pt 0" }}>
            {b.caption ? (
              <div style={centered({ marginBottom: 4 })}>{`Figura ${b.num ?? ""} ${isReport ? "-" : "–"} ${b.caption}`}</div>
            ) : null}
            <img
              src={b.src}
              alt={b.caption ?? "Figura"}
              style={{
                maxWidth: b.widthPct ? `${b.widthPct}%` : "100%",
                maxHeight: isReport ? "14cm" : "16cm",
                display: "block",
                ...(b.align === "left" ? { marginRight: "auto" } : b.align === "right" ? { marginLeft: "auto" } : { margin: "0 auto" }),
              }}
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
            {b.sourceNote || s.sourceNote ? (
              <div style={centered({ fontSize: "10pt", marginTop: 4, marginBottom: 12 })}>{b.sourceNote || s.sourceNote}</div>
            ) : null}
          </div>
        );
      case "table":
        return (
          <div key={i} style={{ margin: "10pt 0", breakInside: "avoid" }}>
            {b.caption ? (
              <div style={centered({ marginBottom: 6 })}>{isReport || isCnpq ? `Tabela ${b.num ?? ""} - ${b.caption}` : `Tabela ${b.num ?? ""} – ${b.caption}`}</div>
            ) : null}
            <table
              style={{
                width: "100%",
                borderCollapse: isReport || isCnpq ? "collapse" : "separate",
                fontSize: isReport || isCnpq ? "12pt" : "10pt",
                lineHeight: 1.15,
              }}
            >
              <thead>
                <tr>
                  {b.header.map((cell, c) => (
                    <th
                      key={c}
                      style={isCnpq
                        ? { fontWeight: 700, textAlign: "center", border: "1px solid #000", padding: "3px 6px" }
                        : isReport
                          ? { fontWeight: 400, textAlign: "center", border: "1px solid #000", padding: "3px 6px" }
                          : {
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
                        style={isReport
                          ? { border: "1px solid #000", padding: "3px 6px", textAlign: "center" }
                          : isCnpq
                            ? { border: "1px solid #000", padding: "3px 6px", textAlign: b.align[c] === "center" ? "center" : b.align[c] === "right" ? "right" : "left" }
                            : {
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
            {isReport || isCnpq ? (
              b.sourceNote ? (
                <div style={centered({ marginTop: 4, marginBottom: 10 })}>{b.sourceNote.startsWith("Fonte") ? b.sourceNote : `Fonte: ${b.sourceNote}`}</div>
              ) : null
            ) : (
              <>
                <div style={{ width: "100%", borderTop: "1px solid #000", marginBottom: 4 }} />
                <div style={centered({ fontSize: "10pt", marginBottom: 10 })}>{b.sourceNote || s.sourceNote}</div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const av = s.cnpq.avaliacao;
  const hasAvaliacao = isCnpq && Object.values(av).some((v) => v.trim());
  const cnpqAvaliacao: ReactNode = hasAvaliacao ? (
    <>
      <div style={centered({ fontWeight: 700, margin: "20pt 0 10pt" })}>AVALIAÇÃO GERAL DO PROJETO</div>
      {(
        [
          { parts: [{ text: "1. Descreva os principais obstáculos e dificuldades encontrados na pesquisa:", bold: true }], answer: av.obstaculos, before: "10pt" },
          { parts: [{ text: "2. Preencha os campos abaixo se a pesquisa envolver os itens relacionados:", bold: true }], before: "14pt" },
          {
            parts: [
              { text: "2.1. Material químico ou genético:", bold: true },
              { text: " discrimine a quantidade utilizada e a forma de descarte do material ao término da pesquisa." },
            ],
            answer: av.materialQuimico,
          },
          {
            parts: [
              { text: "2.2. Meio ambiente:", bold: true },
              { text: " descreva se, durante o desenvolvimento do trabalho, houve algum tipo de agressão ou violação do equilíbrio ecológico e ambiental." },
            ],
            answer: av.meioAmbiente,
          },
          { parts: [{ text: "3. Descreva se houve contribuições da pesquisa para:", bold: true }], before: "14pt" },
          { parts: [{ text: "3.1. O desenvolvimento científico e tecnológico" }], answer: av.devCientifico, before: "8pt" },
          { parts: [{ text: "3.2. A capacitação de recursos humanos e sua fixação na área do projeto" }], answer: av.capacitacao, before: "8pt" },
          { parts: [{ text: "3.3. A transferência de conhecimentos ou geração de novos produtos, tecnologias ou patentes" }], answer: av.transferencia, before: "8pt" },
          {
            parts: [
              { text: "4. Parecer do coordenador", bold: true },
              { text: " Relato das atividades desenvolvidas pelo aluno e seu rendimento acadêmico." },
            ],
            answer: av.parecerCoordenador,
            before: "14pt",
          },
        ] as { parts: { text: string; bold?: boolean }[]; answer?: string; before?: string }[]
      ).map((q, i) => (
        <Fragment key={i}>
          <p style={{ textAlign: "justify", lineHeight: 1.15, margin: `${q.before ?? "6pt"} 0 4pt` }}>
            {q.parts.map((p, j) => (p.bold ? <b key={j}>{p.text}</b> : <span key={j}>{p.text}</span>))}
          </p>
          {q.answer !== undefined ? (
            <div style={{ border: "1px solid #000", padding: "6pt 8pt" }}>
              {q.answer
                .split(/\n\n+/)
                .filter((p) => p.trim())
                .map((p, j) => (
                  <p key={j} style={{ textAlign: "justify", textIndent: "1.25cm", lineHeight: 1.15, margin: 0 }}>
                    {p.trim()}
                  </p>
                ))}
            </div>
          ) : null}
        </Fragment>
      ))}
      {["Assinatura do Coordenador do Projeto", "Assinatura do Bolsista", "Assinatura do Coordenador de Pesquisa do campus"].map((label, i) => (
        <div key={i} style={{ margin: "26pt auto 0", width: "60%" }}>
          <div style={{ borderTop: "1px solid #000" }} />
          <div style={centered({ marginTop: 4 })}>{label}</div>
        </div>
      ))}
    </>
  ) : null;

  pages.push(
    <div style={pageStyle} key="corpo">
      {cnpqHeader}
      {textHeader}
      {isReport && s.report.showCover ? <ReportCoverBlock doc={doc} /> : null}
      {doc.body.map(renderBlock)}
      {doc.references.length ? (
        <>
          <div style={isCnpq ? { fontWeight: 700, margin: "20pt 0 10pt" } : isReport ? centered({ marginTop: "18pt" }) : headingStyle(1, false)}>REFERÊNCIAS</div>
          {doc.references.map((entry, i) => (
            <p key={i} style={{ textAlign: "left", lineHeight: 1.15, margin: "0 0 12pt" }}>
              <Runs runs={entry} />
            </p>
          ))}
        </>
      ) : null}
      {cnpqAvaliacao}
    </div>
  );

  return (
    <div className="abnt-preview" style={{ background: "transparent" }}>
      {pages}
    </div>
  );
}
