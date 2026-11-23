#!/usr/bin/env python3
"""Analisa a formatação dos relatórios 'Experimento N.docx'."""
from docx import Document
from docx.shared import Pt, Cm
import sys

def fmt_cm(v):
    return f"{v.cm:.2f}cm" if v is not None else "?"

def analyze(path):
    doc = Document(path)
    print("=" * 78)
    print("ARQUIVO:", path)
    print("=" * 78)

    # Página / margens
    for i, s in enumerate(doc.sections):
        print(f"\n[Seção {i}] página {fmt_cm(s.page_width)}x{fmt_cm(s.page_height)} | "
              f"margens: sup {fmt_cm(s.top_margin)} inf {fmt_cm(s.bottom_margin)} "
              f"esq {fmt_cm(s.left_margin)} dir {fmt_cm(s.right_margin)}")
        # cabeçalho/rodapé
        hdr = s.header
        ftr = s.footer
        htxt = " | ".join(p.text for p in hdr.paragraphs if p.text.strip())
        ftxt = " | ".join(p.text for p in ftr.paragraphs if p.text.strip())
        print(f"  header vinculado={hdr.is_linked_to_previous} texto: {htxt[:100]!r}")
        print(f"  footer vinculado={ftr.is_linked_to_previous} texto: {ftxt[:100]!r}")

    # Estilos usados
    styles_used = {}
    for p in doc.paragraphs:
        st = p.style.name if p.style else "?"
        styles_used.setdefault(st, 0)
        styles_used[st] += 1
    print("\n[Estilos de parágrafo usados]", styles_used)

    # Primeiros parágrafos com formatação
    print("\n[Primeiros 45 parágrafos]")
    count = 0
    for p in doc.paragraphs:
        t = p.text.strip()
        if not t:
            continue
        count += 1
        if count > 45:
            break
        runs = p.runs
        fonts = set()
        sizes = set()
        bold = False
        for r in runs:
            if r.font.name: fonts.add(r.font.name)
            if r.font.size: sizes.add(r.font.size.pt)
            if r.font.bold: bold = True
        ls = p.paragraph_format.line_spacing
        before = p.paragraph_format.space_before
        after = p.paragraph_format.space_after
        align = p.alignment
        ind = p.paragraph_format.left_indent
        first = p.paragraph_format.first_line_indent
        print(f"  [{p.style.name[:18]:18}] al={str(align).split('.')[-1][:6]:6} ls={ls} "
              f"ant={before.pt if before else 0:.0f} dep={after.pt if after else 0:.0f} "
              f"recE={fmt_cm(ind) if ind else '-'} rec1a={fmt_cm(first) if first else '-'} "
              f"font={sorted(fonts)} sz={sorted(sizes)} b={bold}")
        print(f"      {t[:90]!r}")

    # Tabelas
    print(f"\n[Tabelas] total: {len(doc.tables)}")
    for i, tb in enumerate(doc.tables[:3]):
        try:
            first_row = " | ".join(c.text.strip()[:18] for c in tb.rows[0].cells)
        except Exception:
            first_row = "?"
        print(f"  T{i}: {len(tb.rows)}x{len(tb.columns)} estilo={tb.style.name if tb.style else '?'} 1ªlinha: {first_row[:80]}")

n = sys.argv[1] if len(sys.argv) > 1 else "Experimento 3"
analyze(f"/home/z/my-project/upload/{n}.docx")
