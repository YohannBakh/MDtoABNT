"use client";

/* Painel de configurações do documento ABNT */

import type { AbntSettings } from "@/lib/abnt/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  settings: AbntSettings;
  onChange: (patch: Partial<AbntSettings>) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide text-neutral-700 uppercase dark:text-neutral-300">{title}</h3>
      {children}
      <Separator />
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-600 dark:text-neutral-400">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-neutral-400 dark:text-neutral-500">{hint}</p> : null}
    </div>
  );
}

export function SettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof AbntSettings>(key: K, value: AbntSettings[K]) => onChange({ [key]: value } as Partial<AbntSettings>);
  const tg = settings.toggles;
  const toggle = (key: keyof AbntSettings["toggles"], value: boolean) =>
    onChange({ toggles: { ...tg, [key]: value } });

  return (
    <ScrollArea className="h-[calc(100vh-220px)] pr-3">
      <div className="space-y-5 pb-8">
        <Section title="Documento">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fonte do texto">
              <Select value={settings.font} onValueChange={(v) => set("font", v as AbntSettings["font"])}>
                <SelectTrigger aria-label="Fonte do texto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="times">Times New Roman 12</SelectItem>
                  <SelectItem value="arial">Arial 12</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Nome do arquivo">
              <Input value={settings.fileName} onChange={(e) => set("fileName", e.target.value)} placeholder="artigo-abnt" />
            </Field>
          </div>
          <Field label="Nota de fonte padrão (tabelas e figuras)">
            <Input value={settings.sourceNote} onChange={(e) => set("sourceNote", e.target.value)} placeholder="Fonte: elaborado pelo autor (2025)." />
          </Field>
        </Section>

        <Section title="Identificação">
          <Field label="Título">
            <Input value={settings.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field label="Subtítulo">
            <Input value={settings.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>
          <Field label="Autores (um por linha)" hint="Também aceito no front matter do Markdown (authors:)">
            <Textarea
              className="min-h-20"
              value={settings.authors.join("\n")}
              onChange={(e) => set("authors", e.target.value.split("\n").filter((x) => x.trim() !== ""))}
            />
          </Field>
        </Section>

        <Section title="Institucional">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Instituição">
              <Input value={settings.institution} onChange={(e) => set("institution", e.target.value)} />
            </Field>
            <Field label="Faculdade / curso">
              <Input value={settings.department} onChange={(e) => set("department", e.target.value)} />
            </Field>
            <Field label="Cidade">
              <Input value={settings.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Ano">
              <Input value={settings.year} onChange={(e) => set("year", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Orientação e banca">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Orientador(a)">
                <Input value={settings.advisor} onChange={(e) => set("advisor", e.target.value)} />
              </Field>
            </div>
            <Field label="Função">
              <Select value={settings.advisorRole} onValueChange={(v) => set("advisorRole", v as AbntSettings["advisorRole"])}>
                <SelectTrigger aria-label="Função do orientador">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Orientador">Orientador</SelectItem>
                  <SelectItem value="Orientadora">Orientadora</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Coorientador(a) (opcional)">
            <Input value={settings.coadvisor} onChange={(e) => set("coadvisor", e.target.value)} />
          </Field>
          <Field label="Banca examinadora (um membro por linha)">
            <Textarea
              className="min-h-20"
              value={settings.committee.join("\n")}
              onChange={(e) => set("committee", e.target.value.split("\n"))}
            />
          </Field>
          <Field label="Data de aprovação">
            <Input value={settings.approvalDate} onChange={(e) => set("approvalDate", e.target.value)} placeholder="15 de outubro de 2025" />
          </Field>
        </Section>

        <Section title="Palavras-chave">
          <Field label="Palavras-chave (separadas por vírgula)" hint="Se o Markdown tiver seção '## Resumo' com 'Palavras-chave:', ela tem prioridade.">
            <Input value={settings.keywords.join(", ")} onChange={(e) => set("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="Keywords em inglês (opcional, separadas por vírgula)">
            <Input value={settings.keywordsEn.join(", ")} onChange={(e) => set("keywordsEn", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
        </Section>

        <Section title="Elementos do documento">
          <div className="grid grid-cols-1 gap-2.5">
            {(
              [
                ["capa", "Capa (NBR 14724)"],
                ["folhaRosto", "Folha de rosto"],
                ["aprovacao", "Folha de aprovação"],
                ["resumo", "Página de resumo (usa palavras-chave acima)"],
                ["sumario", "Sumário automático"],
                ["listaFiguras", "Lista de figuras"],
                ["listaTabelas", "Lista de tabelas"],
                ["numberSections", "Numerar seções (NBR 6024)"],
                ["numberEquations", "Numerar equações"],
                ["pageNumberAll", "Numerar todas as páginas (se desligado, numera só a parte textual)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800">
                <Label htmlFor={`tg-${key}`} className="text-xs font-normal text-neutral-700 dark:text-neutral-300">
                  {label}
                </Label>
                <Switch id={`tg-${key}`} checked={tg[key]} onCheckedChange={(v) => toggle(key, v)} />
              </div>
            ))}
          </div>
        </Section>
      </div>
    </ScrollArea>
  );
}
