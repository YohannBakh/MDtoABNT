"use client";

/* MD2ABNT — Conversor de anotações Markdown para os padrões ABNT */

import Image from "next/image";
import { useMemo, useState } from "react";
import { parseMarkdown } from "@/lib/abnt/parse";
import { DEFAULT_SETTINGS, type AbntSettings } from "@/lib/abnt/types";
import { SAMPLE_MARKDOWN } from "@/lib/abnt/sample";
import { AbntPreview } from "@/components/abnt/preview";
import { SettingsPanel } from "@/components/abnt/settings-panel";
import { SyntaxGuide } from "@/components/abnt/guide";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Eraser, FileDown, FileText, Loader2, NotebookPen, ScrollText } from "lucide-react";

type Format = "docx" | "pdf";

export default function Home() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [settings, setSettings] = useState<AbntSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<Format | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const doc = useMemo(() => parseMarkdown(markdown, settings), [markdown, settings]);

  const words = useMemo(() => markdown.trim().split(/\s+/).filter(Boolean).length, [markdown]);

  const patchSettings = (patch: Partial<AbntSettings>) => setSettings((s) => ({ ...s, ...patch }));

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
      <Textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        placeholder="# Cole aqui suas anotações em Markdown..."
        className="flex-1 resize-none rounded-none border-0 bg-[repeating-linear-gradient(transparent,transparent_35px,rgba(0,0,0,0.03)_35px,rgba(0,0,0,0.03)_36px)] p-4 font-mono text-[13px] leading-6 shadow-none focus-visible:ring-0 dark:bg-[repeating-linear-gradient(transparent,transparent_35px,rgba(255,255,255,0.04)_35px,rgba(255,255,255,0.04)_36px)]"
        aria-label="Editor de Markdown"
        spellCheck={false}
      />
    </div>
  );

  const rightTabs = (
    <Tabs defaultValue="preview" className="flex h-full min-h-0 flex-col">
      <TabsList className="grid w-full grid-cols-3 rounded-lg bg-white p-1 shadow-sm dark:bg-neutral-900">
        <TabsTrigger value="preview" className="text-xs">
          <ScrollText className="mr-1.5 h-3.5 w-3.5" />
          Prévia ABNT
        </TabsTrigger>
        <TabsTrigger value="settings" className="text-xs">
          Configurações
        </TabsTrigger>
        <TabsTrigger value="guide" className="text-xs">
          Guia
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
          <Tabs defaultValue="editor" className="flex h-[calc(100vh-140px)] min-h-[560px] flex-col">
            <TabsList className="grid w-full grid-cols-4 rounded-lg bg-white p-1 shadow-sm dark:bg-neutral-900">
              <TabsTrigger value="editor" className="text-xs">Editor</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Prévia</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Ajustes</TabsTrigger>
              <TabsTrigger value="guide" className="text-xs">Guia</TabsTrigger>
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
