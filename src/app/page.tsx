"use client";

/* MD2ABNT — Conversor de anotações Markdown para os padrões ABNT */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { parseMarkdown } from "@/lib/abnt/parse";
import { DEFAULT_SETTINGS, type AbntSettings } from "@/lib/abnt/types";
import { SAMPLE_MARKDOWN, SAMPLE_REPORT_MARKDOWN, SAMPLE_CNPQ_MARKDOWN } from "@/lib/abnt/sample";
import { AbntPreview } from "@/components/abnt/preview";
import { SettingsPanel } from "@/components/abnt/settings-panel";
import { SyntaxGuide } from "@/components/abnt/guide";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, BookOpen, Bold, Code, Eraser, FileDown, FileText, FlaskConical, GraduationCap, ImagePlus, Italic, Loader2, NotebookPen, ScrollText, Sigma, Underline } from "lucide-react";

type Format = "docx" | "pdf";

/** chips de sintaxe: envolvem o texto selecionado com o recurso correspondente */
const ALIGN_CHIPS: { label: string; tag: string; title: string }[] = [
  { label: "Centralizar", tag: "center", title: "Envolve a seleção com ::: center … :::" },
  { label: "Esquerda", tag: "left", title: "Envolve a seleção com ::: left … :::" },
  { label: "Direita", tag: "right", title: "Envolve a seleção com ::: right … :::" },
  { label: "Justificar", tag: "justify", title: "Envolve a seleção com ::: justify … :::" },
];

/** botão do menu flutuante de formatação */
function SelBtn({ children, title, onClick }: { children: ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700/80 hover:text-white"
    >
      {children}
    </button>
  );
}

export default function Home() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [settings, setSettings] = useState<AbntSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<Format | null>(null);
  const [rightTab, setRightTab] = useState("preview");
  const [mobileTab, setMobileTab] = useState("editor");
  const [selMenu, setSelMenu] = useState<{ top: number; left: number } | null>(null);
  const [figBtns, setFigBtns] = useState<{ line: number; top: number }[]>([]);
  const [figDialog, setFigDialog] = useState<{ line: number; alt: string } | null>(null);
  const [figFile, setFigFile] = useState<File | null>(null);
  const [figThumb, setFigThumb] = useState<string | null>(null);
  const [figUrl, setFigUrl] = useState("");
  const [figWidth, setFigWidth] = useState("100");
  const [figUploading, setFigUploading] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const figInnerRef = useRef<HTMLDivElement>(null);
  const figFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const doc = useMemo(() => parseMarkdown(markdown, settings), [markdown, settings]);

  const words = useMemo(() => markdown.trim().split(/\s+/).filter(Boolean).length, [markdown]);

  const patchSettings = (patch: Partial<AbntSettings>) => setSettings((s) => ({ ...s, ...patch }));

  /** envolve a seleção atual com marcadores. block=true envolve em bloco próprio (containers :::);
   *  inline envolve no meio da linha (negrito, itálico…). Se a seleção já estiver exatamente
   *  envolvida pelos mesmos marcadores, eles são removidos (toggle). */
  function wrapSel(before: string, after: string, block = false) {
    const ta = taRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? start;
    const sel = markdown.slice(start, end) || "texto";
    const beforeHit = markdown.slice(Math.max(0, start - before.length), start);
    const afterHit = markdown.slice(end, end + after.length);
    if (beforeHit === before && afterHit === after) {
      const ns = Math.max(0, start - before.length);
      setMarkdown(markdown.slice(0, ns) + sel + markdown.slice(end + after.length));
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(ns, ns + sel.length);
        showSelectionMenu();
      });
      return;
    }
    const pre = block && start !== 0 && markdown[start - 1] !== "\n" ? "\n" : "";
    const rest = markdown.slice(end);
    const post = block ? (rest.startsWith("\n") || rest === "" ? "\n\n" : "\n") : "";
    setMarkdown(markdown.slice(0, start) + pre + before + sel + after + post + rest);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + pre.length + before.length, start + pre.length + before.length + sel.length);
      showSelectionMenu();
    });
  }

  /** mede a posição da seleção no textarea (div espelho) e posiciona o menu flutuante; esconde se não há seleção */
  function showSelectionMenu() {
    const ta = taRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd || !ta.value.slice(ta.selectionStart, ta.selectionEnd).trim()) {
      setSelMenu(null);
      return;
    }
    const wrap = ta.parentElement;
    if (!wrap) return;
    const div = document.createElement("div");
    const cs = getComputedStyle(ta);
    Object.assign(div.style, {
      position: "absolute",
      top: "0px",
      left: "0px",
      visibility: "hidden",
      width: `${ta.clientWidth}px`,
      boxSizing: cs.boxSizing,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      tabSize: cs.tabSize,
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
      overflowWrap: "break-word",
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      border: "none",
      margin: "0px",
    });
    div.textContent = ta.value.slice(0, ta.selectionStart);
    const span = document.createElement("span");
    span.textContent = ta.value.slice(ta.selectionStart, ta.selectionEnd) || ".";
    div.appendChild(span);
    wrap.appendChild(div);
    const top0 = span.offsetTop - ta.scrollTop;
    const left0 = span.offsetLeft;
    const lineH = parseFloat(cs.lineHeight) || 24;
    div.remove();
    const menuW = Math.min(452, ta.clientWidth - 8);
    const menuH = 44;
    const fitsAbove = top0 >= menuH + 4;
    const top = fitsAbove
      ? top0 - menuH - 4
      : Math.min(top0 + lineH + 6, Math.max(4, ta.clientHeight - menuH - 4));
    const left = Math.min(Math.max(4, left0 - 24), Math.max(4, ta.clientWidth - menuW - 4));
    setSelMenu({ top, left });
  }

  /** fecha o menu flutuante quando o clique cai fora do editor e do menu */
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || taRef.current?.contains(t)) return;
      setSelMenu(null);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  /** mede (div espelho) as linhas que citam "Figura" sem imagem para posicionar os botões de inserir figura;
   *  top é a posição visual da linha (considera quebra automática de linha longa) */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    const measure = () => {
      const value = ta.value;
      const lines = value.split("\n");
      const targets: { line: number; start: number }[] = [];
      let off = 0;
      for (let i = 0; i < lines.length; i++) {
        if (/\bfigura\b/i.test(lines[i]) && !lines[i].includes("![") && lines[i].trim() !== "") targets.push({ line: i, start: off });
        off += lines[i].length + 1;
      }
      if (!targets.length) {
        setFigBtns([]);
        return;
      }
      const div = document.createElement("div");
      const cs = getComputedStyle(ta);
      Object.assign(div.style, {
        position: "absolute",
        top: "0px",
        left: "0px",
        visibility: "hidden",
        width: `${ta.clientWidth}px`,
        boxSizing: cs.boxSizing,
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        whiteSpace: "pre-wrap",
        wordWrap: "break-word",
        overflowWrap: "break-word",
        paddingTop: cs.paddingTop,
        paddingRight: cs.paddingRight,
        paddingBottom: cs.paddingBottom,
        paddingLeft: cs.paddingLeft,
        border: "none",
        margin: "0px",
      });
      let pos = 0;
      const spans: HTMLSpanElement[] = [];
      for (const t of targets) {
        div.appendChild(document.createTextNode(value.slice(pos, t.start)));
        const sp = document.createElement("span");
        sp.textContent = value[t.start] ?? "";
        div.appendChild(sp);
        spans.push(sp);
        pos = t.start + 1;
      }
      div.appendChild(document.createTextNode(value.slice(pos)));
      const wrap = ta.parentElement;
      if (!wrap) return;
      wrap.appendChild(div);
      const tops = spans.map((sp) => sp.offsetTop);
      div.remove();
      setFigBtns(targets.map((t, i) => ({ line: t.line, top: tops[i] })));
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(ta);
    return () => ro.disconnect();
  }, [markdown]);

  /** abre o diálogo de figura para a linha de título indicada (alt sugerido a partir do título) */
  function openFigDialog(line: number) {
    const titleLine = markdown.split("\n")[line] ?? "";
    const alt = titleLine.replace(/^#+\s*/, "").replace(/^figura\s*\d*\s*[–\-—:]?\s*/i, "").trim() || "Figura";
    setFigFile(null);
    if (figThumb) URL.revokeObjectURL(figThumb);
    setFigThumb(null);
    setFigUrl("");
    setFigWidth("100");
    setFigDialog({ line, alt });
  }

  function onFigFile(f: File | null) {
    setFigFile(f);
    if (figThumb) URL.revokeObjectURL(figThumb);
    setFigThumb(f ? URL.createObjectURL(f) : null);
  }

  /** insere a imagem (upload ou URL) acima da linha de título escolhida */
  async function confirmFigInsert() {
    if (!figDialog || figUploading) return;
    setFigUploading(true);
    try {
      let src = figUrl.trim();
      if (figFile) {
        const fd = new FormData();
        fd.append("file", figFile);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!res.ok || !j.url) throw new Error(j.error ?? "Falha no upload");
        src = j.url;
      }
      if (!src || (!/^https?:\/\//i.test(src) && !src.startsWith("/api/uploads/"))) {
        toast({ title: "Informe a imagem", description: "Escolha um arquivo do computador ou cole uma URL http(s).", variant: "destructive" });
        return;
      }
      const lines = markdown.split("\n");
      // largura em % da largura útil (title do link de imagem); 100 = não grava nada
      const wRaw = parseInt(figWidth, 10);
      const w = Number.isFinite(wRaw) ? Math.min(100, Math.max(5, wRaw)) : 100;
      const wTitle = w < 100 ? ` "${w}%"` : "";
      lines.splice(figDialog.line, 0, `![${figDialog.alt || "Figura"}](${src}${wTitle})`, "");
      setMarkdown(lines.join("\n"));
      setFigDialog(null);
      toast({
        title: "Figura inserida",
        description: "Imagem adicionada acima do título — no documento gerado, o título “Figura…” fica acima da imagem e a fonte abaixo (ABNT).",
      });
    } catch (e) {
      toast({ title: "Erro ao inserir figura", description: e instanceof Error ? e.message : "Tente novamente.", variant: "destructive" });
    } finally {
      setFigUploading(false);
    }
  }

  /** insere uma linha independente no cursor (ex.: <!-- pagebreak -->) */
  function insertLine(text: string) {
    const ta = taRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? markdown.length;
    const pre = pos === 0 || markdown[pos - 1] === "\n" ? "" : "\n";
    const snippet = `${pre}${text}\n\n`;
    setMarkdown(markdown.slice(0, pos) + snippet + markdown.slice(pos));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos + snippet.length, pos + snippet.length);
    });
  }

  /** carrega o template de relatório e alterna para o estilo Relatório Técnico */
  function loadReportTemplate() {
    setMarkdown(SAMPLE_REPORT_MARKDOWN);
    setSettings((s) => ({
      ...s,
      style: "relatorio",
      report: { ...DEFAULT_SETTINGS.report, ...s.report },
      fileName: s.fileName === "artigo-abnt" || s.fileName === "" ? "relatorio-tecnico" : s.fileName,
    }));
  }

  /** carrega o template CNPq e alterna para o estilo Relatório CNPq */
  function loadCnpqTemplate() {
    setMarkdown(SAMPLE_CNPQ_MARKDOWN);
    setSettings((s) => ({
      ...s,
      style: "cnpq",
      font: "arial",
      cnpq: { ...DEFAULT_SETTINGS.cnpq, ...s.cnpq },
      fileName: s.fileName === "artigo-abnt" || s.fileName === "relatorio-tecnico" || s.fileName === "" ? "relatorio-cnpq" : s.fileName,
    }));
  }

  async function generate(format: Format) {
    if (!markdown.trim()) {
      toast({ title: "Nada para converter", description: "Escreva ou cole suas anotações em Markdown.", variant: "destructive" });
      return;
    }
    setLoading(format);
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, settings, format }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Falha HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename="(.+)"/);
      const name = m?.[1] ?? `${settings.fileName || "documento-abnt"}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({
        title: format === "docx" ? "DOCX gerado com sucesso" : "PDF gerado com sucesso",
        description: `${name} — ${doc.figures.length} figura(s), ${doc.tables.length} tabela(s), ${doc.references.length} referência(s).`,
      });
    } catch (err) {
      toast({
        title: "Erro na conversão",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  const editorCard = (
    <div className="flex h-full min-h-0 flex-col rounded-xl border bg-white shadow-sm dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          <NotebookPen className="h-4 w-4" />
          Anotações em Markdown
        </div>
        <div className="flex items-center gap-3 text-[11px] text-neutral-400 dark:text-neutral-500">
          <span>{words} palavras</span>
          <span>{doc.figures.length} fig.</span>
          <span>{doc.tables.length} tab.</span>
          <span>{doc.references.length} ref.</span>
          <button
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            onClick={() => setMarkdown("")}
            aria-label="Limpar editor"
            title="Limpar editor"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div className="relative w-7 shrink-0 border-r border-neutral-100 bg-neutral-50/60 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div ref={figInnerRef} className="absolute inset-x-0 top-0">
            {figBtns.map((b) => (
              <button
                key={`${b.line}-${b.top}`}
                type="button"
                title="Inserir imagem acima desta linha de título (upload ou URL)"
                onClick={() => openFigDialog(b.line)}
                className="absolute left-0.5 flex h-6 w-6 items-center justify-center rounded-md text-teal-700 transition-colors hover:bg-teal-100 hover:text-teal-900 dark:text-teal-400 dark:hover:bg-teal-950/60"
                style={{ top: b.top + 2 }}
              >
                <ImagePlus className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
        <Textarea
          ref={taRef}
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setSelMenu(null);
          }}
          onSelect={() => showSelectionMenu()}
          onScroll={() => {
            setSelMenu(null);
            if (figInnerRef.current) figInnerRef.current.style.transform = `translateY(${-(taRef.current?.scrollTop ?? 0)}px)`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelMenu(null);
          }}
          placeholder="# Cole aqui suas anotações em Markdown..."
          className="h-full w-full resize-none rounded-none border-0 bg-[repeating-linear-gradient(transparent,transparent_35px,rgba(0,0,0,0.03)_35px,rgba(0,0,0,0.03)_36px)] p-4 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0 dark:bg-[repeating-linear-gradient(transparent,transparent_35px,rgba(255,255,255,0.04)_35px,rgba(255,255,255,0.04)_36px)]"
          aria-label="Editor de Markdown"
          spellCheck={false}
        />
        {selMenu && (
          <div
            ref={menuRef}
            className="absolute z-30 flex max-w-[calc(100%-8px)] flex-wrap items-center gap-0.5 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
            style={{ top: selMenu.top, left: selMenu.left }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <SelBtn title="Negrito — envolve com ** … **" onClick={() => wrapSel("**", "**")}>
              <Bold className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Itálico — envolve com * … *" onClick={() => wrapSel("*", "*")}>
              <Italic className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Sublinhado — envolve com <u> … </u>" onClick={() => wrapSel("<u>", "</u>")}>
              <Underline className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Código — envolve com ` … `" onClick={() => wrapSel("`", "`")}>
              <Code className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Equação — envolve com $ … $" onClick={() => wrapSel("$", "$")}>
              <Sigma className="h-4 w-4" />
            </SelBtn>
            <span className="mx-0.5 h-5 w-px bg-neutral-700" aria-hidden />
            <SelBtn title="Alinhar à esquerda — envolve com ::: left … :::" onClick={() => wrapSel("::: left\n", "\n:::", true)}>
              <AlignLeft className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Centralizar — envolve com ::: center … :::" onClick={() => wrapSel("::: center\n", "\n:::", true)}>
              <AlignCenter className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Alinhar à direita — envolve com ::: right … :::" onClick={() => wrapSel("::: right\n", "\n:::", true)}>
              <AlignRight className="h-4 w-4" />
            </SelBtn>
            <SelBtn title="Justificar — envolve com ::: justify … :::" onClick={() => wrapSel("::: justify\n", "\n:::", true)}>
              <AlignJustify className="h-4 w-4" />
            </SelBtn>
          </div>
        )}
      </div>
      <div className="border-t px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">Dicas rápidas:</span>
          <span
            className="rounded border border-dashed border-neutral-300 bg-neutral-50 px-2 py-1 text-[11px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-400"
            title="Com “Enter cria quebra de linha” ligado, pressionar Enter quebra a linha no documento"
          >
            Enter = quebra de linha
          </span>
          {ALIGN_CHIPS.map((chip) => (
            <button
              key={chip.tag}
              type="button"
              onClick={() => wrapSel(`::: ${chip.tag}\n`, "\n:::", true)}
              title={`${chip.title} — aplica ao texto selecionado`}
              className="rounded border border-teal-700/40 bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-800 transition-colors hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/40"
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => insertLine("<!-- pagebreak -->")}
            title="Insere <!-- pagebreak --> no cursor para começar uma nova página"
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            Quebra de página
          </button>
          <button
            type="button"
            onClick={() => (isMobile ? setMobileTab("guide") : setRightTab("guide"))}
            className="ml-auto flex items-center gap-1 text-[11px] font-medium text-teal-700 underline-offset-2 transition-colors hover:underline dark:text-teal-400"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Guia completo
          </button>
        </div>
      </div>
      <Dialog open={figDialog !== null} onOpenChange={(o) => !o && setFigDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir figura</DialogTitle>
            <DialogDescription>
              A imagem entra acima da linha de título no editor; no documento gerado o título “Figura…” fica acima da imagem e a fonte abaixo (ABNT).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Do computador</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={figFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  className="hidden"
                  onChange={(e) => onFigFile(e.target.files?.[0] ?? null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => figFileRef.current?.click()}>
                  <ImagePlus className="mr-1.5 h-4 w-4" />
                  Escolher arquivo…
                </Button>
                <span className="truncate text-xs text-neutral-500">{figFile ? figFile.name : "PNG, JPG ou GIF até 8 MB"}</span>
              </div>
              {figThumb ? <img src={figThumb} alt="Pré-visualização" className="max-h-28 rounded border" /> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fig-url">Ou de uma URL</Label>
              <Input
                id="fig-url"
                placeholder="https://exemplo.com/imagem.png"
                value={figUrl}
                onChange={(e) => setFigUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fig-alt">Legenda alternativa (alt)</Label>
              <Input
                id="fig-alt"
                value={figDialog?.alt ?? ""}
                onChange={(e) => setFigDialog((d) => (d ? { ...d, alt: e.target.value } : d))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fig-width">Largura da imagem (% da largura útil)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="fig-width"
                  type="number"
                  min={5}
                  max={100}
                  value={figWidth}
                  onChange={(e) => setFigWidth(e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-neutral-500">100 = largura total do texto; ex.: 60 deixa a figura com 60% da largura</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setFigDialog(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={confirmFigInsert} disabled={figUploading} className="bg-teal-700 text-white hover:bg-teal-800">
              {figUploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-1.5 h-4 w-4" />}
              Inserir figura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const rightTabs = (
    <Tabs value={rightTab} onValueChange={setRightTab} className="flex h-full min-h-0 flex-col">
      <TabsList className="grid w-full grid-cols-3 rounded-lg bg-white p-1 shadow-sm dark:bg-neutral-900">
        <TabsTrigger value="preview" className="text-xs">
          <ScrollText className="mr-1.5 h-3.5 w-3.5" />
          Prévia ABNT
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-xs">
          Configurações
        </TabsTrigger>
        <TabsTrigger value="guide" className="text-xs">
          Dicas de sintaxe
        </TabsTrigger>
      </TabsList>
      <TabsContent value="preview" className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl bg-neutral-200/70 p-4 dark:bg-neutral-800/60">
        <AbntPreview doc={doc} />
      </TabsContent>
      <TabsContent value="settings" className="mt-3 min-h-0 flex-1 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <SettingsPanel settings={settings} onChange={patchSettings} />
      </TabsContent>
      <TabsContent value="guide" className="mt-3 min-h-0 flex-1 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
        <SyntaxGuide />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 dark:bg-neutral-950">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur dark:bg-neutral-900/95">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo MD2ABNT"
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-xl object-cover shadow-sm ring-1 ring-border"
            />
            <div>
              <h1 className="text-lg font-bold leading-tight text-neutral-900 dark:text-neutral-50">MD2ABNT</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Anotações em Markdown → artigo nos padrões ABNT (NBR 14724 · 6022 · 6024 · 10520 · 6023 · 6028)
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => setMarkdown(SAMPLE_MARKDOWN)}>
              <FileText className="mr-1.5 h-4 w-4" />
              Carregar exemplo
            </Button>
            <Button variant="ghost" size="sm" onClick={loadReportTemplate} title="Carrega o esqueleto de relatório técnico (Experimento)">
              <FlaskConical className="mr-1.5 h-4 w-4" />
              Template de relatório
            </Button>
            <Button variant="ghost" size="sm" onClick={loadCnpqTemplate} title="Carrega o esqueleto de Relatório CNPq (modelo IFC)">
              <GraduationCap className="mr-1.5 h-4 w-4" />
              Template CNPq
            </Button>
            <Button
              size="sm"
              onClick={() => generate("docx")}
              disabled={loading !== null}
              className="bg-teal-700 text-white hover:bg-teal-800"
            >
              {loading === "docx" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
              Gerar DOCX
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generate("pdf")}
              disabled={loading !== null}
              className="border-teal-700 text-teal-800 hover:bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:hover:bg-teal-950/40"
            >
              {loading === "pdf" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
              Gerar PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4 sm:px-6">
        {isMobile ? (
          <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col">
            <TabsList className="grid w-full grid-cols-4 rounded-lg bg-white p-1 shadow-sm dark:bg-neutral-900">
              <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Prévia</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Ajustes</TabsTrigger>
              <TabsTrigger value="guide" className="text-xs">Dicas</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-3 min-h-0 flex-1">
              {editorCard}
            </TabsContent>
            <TabsContent value="preview" className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl bg-neutral-200/70 p-3 dark:bg-neutral-800/60">
              <AbntPreview doc={doc} />
            </TabsContent>
            <TabsContent value="settings" className="mt-3 min-h-0 flex-1 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
              <SettingsPanel settings={settings} onChange={patchSettings} />
            </TabsContent>
            <TabsContent value="guide" className="mt-3 min-h-0 flex-1 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
              <SyntaxGuide />
            </TabsContent>
          </Tabs>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-130px)] min-h-[520px] gap-0">
            <ResizablePanel defaultSize={38} minSize={24}>
              <div className="h-full pr-2">{editorCard}</div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={62} minSize={40}>
              <div className="h-full pl-2">{rightTabs}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </main>

      <footer className="mt-auto border-t bg-white dark:bg-neutral-900">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-1.5 px-4 py-3 text-[11px] text-neutral-400 sm:flex-row sm:px-6 dark:text-neutral-500">
          <p className="text-center sm:text-left">
            MD2ABNT — conversor de anotações Markdown para ABNT · No Word, pressione Ctrl+T e escolha “Atualizar todo o índice”
            para preencher sumário e listas · Verifique sempre as normas específicas da sua instituição.
          </p>
          <a
            href="https://github.com/YohannBakh"
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 italic transition-colors hover:text-teal-700 dark:hover:text-teal-400"
            title="made by Henry"
          >
            <Image src="/logo.png" alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover ring-1 ring-border" />
            made by Henry
          </a>
        </div>
      </footer>
    </div>
  );
}
