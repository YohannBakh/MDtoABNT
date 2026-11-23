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
  const rep = settings.report;
  const setRep = (patch: Partial<AbntSettings["report"]>) => onChange({ report: { ...rep, ...patch } });
  const isReport = settings.style === "relatorio";

  /** ao trocar de estilo, ajusta também o nome de arquivo padrão */
  const changeStyle = (style: AbntSettings["style"]) => {
    const wasAbntDefault = settings.fileName === "artigo-abnt" || settings.fileName === "";
    const wasReportDefault = settings.fileName === "relatorio-tecnico" || settings.fileName === "";
    const fileName =
      style === "relatorio"
        ? wasAbntDefault
          ? "relatorio-tecnico"
          : settings.fileName
        : wasReportDefault
          ? "artigo-abnt"
          : settings.fileName;
    onChange({ style, fileName });
  };

  return (
    <ScrollArea className="h-[calc(100vh-220px)] pr-3">
      <div className="space-y-5 pb-8">
        <Section title="Estilo do documento">
          <Select value={settings.style} onValueChange={(v) => changeStyle(v as AbntSettings["style"])}>
            <SelectTrigger aria-label="Estilo do documento">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="abnt">Artigo ABNT (NBR 14724 / 6022)</SelectItem>
              <SelectItem value="relatorio">Relatório Técnico (Experimento)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            {isReport
              ? "Modelo do curso: cabeçalho institucional em todas as páginas, título e tabela de identificação na 1ª página e o texto começando logo em seguida — sem gastar página com capa."
              : "Formato acadêmico completo: capa, folha de rosto, aprovação, resumo, sumário e referências NBR."}
          </p>
        </Section>

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
              <Input value={settings.fileName} onChange={(e) => set("fileName", e.target.value)} placeholder="documento" />
            </Field>
          </div>
          {!isReport && (
            <Field label="Nota de fonte padrão (tabelas e figuras)">
              <Input value={settings.sourceNote} onChange={(e) => set("sourceNote", e.target.value)} placeholder="Fonte: elaborado pelo autor (2025)." />
            </Field>
          )}
        </Section>

        {isReport && (
          <Section title="Cabeçalho institucional">
            <Field label="Instituição (1ª linha do cabeçalho)">
              <Input value={rep.headerInstitution} onChange={(e) => setRep({ headerInstitution: e.target.value })} />
            </Field>
            <Field label="Curso (2ª linha do cabeçalho)">
              <Input value={rep.course} onChange={(e) => setRep({ course: e.target.value })} />
            </Field>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Aparece no topo de todas as páginas, com a régua verde — igual ao modelo do curso.
            </p>
          </Section>
        )}

        {isReport && (
          <Section title="Identificação da atividade">
            <div className="flex items-center justify-between gap-4 rounded-md border border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <Label htmlFor="rep-showcover" className="text-xs font-normal text-neutral-700 dark:text-neutral-300">
                Exibir título e tabela antes do texto
              </Label>
              <Switch id="rep-showcover" checked={rep.showCover} onCheckedChange={(v) => setRep({ showCover: v })} />
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Ligado (padrão): o título “Relatório Técnico…” e a tabela de identificação ficam na 1ª página e o texto começa logo depois — tudo junto, sem quebra de página.
            </p>
            {rep.showCover && (
              <>
                <Field label="Título do relatório">
                  <Input value={rep.activityLabel} onChange={(e) => setRep({ activityLabel: e.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nº da atividade (opcional)">
                    <Input value={rep.activityNumber} onChange={(e) => setRep({ activityNumber: e.target.value })} placeholder="5" />
                  </Field>
                  <Field label="Data da atividade">
                    <Input value={rep.dataAtividade} onChange={(e) => setRep({ dataAtividade: e.target.value })} placeholder="14/09/2026" />
                  </Field>
                  <Field label="Disciplina">
                    <Input value={rep.disciplina} onChange={(e) => setRep({ disciplina: e.target.value })} />
                  </Field>
                  <Field label="Turma">
                    <Input value={rep.turma} onChange={(e) => setRep({ turma: e.target.value })} />
                  </Field>
                  <Field label="Professor">
                    <Input value={rep.professor} onChange={(e) => setRep({ professor: e.target.value })} />
                  </Field>
                  <Field label="Período">
                    <Input value={rep.periodo} onChange={(e) => setRep({ periodo: e.target.value })} />
                  </Field>
                </div>
                <Field label="Alunos (um por linha)" hint="Exibidos na linha “Aluno(s)” da tabela, separados por ponto e vírgula.">
                  <Textarea
                    className="min-h-20"
                    value={settings.authors.join("\n")}
                    onChange={(e) => set("authors", e.target.value.split("\n").filter((x) => x.trim() !== ""))}
                  />
                </Field>
              </>
            )}
          </Section>
        )}

        {!isReport && (
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
        )}

        {!isReport && (
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
        )}

        {!isReport && (
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
        )}

        {!isReport && (
          <Section title="Palavras-chave">
            <Field label="Palavras-chave (separadas por vírgula)" hint="Se o Markdown tiver seção '## Resumo' com 'Palavras-chave:', ela tem prioridade.">
              <Input value={settings.keywords.join(", ")} onChange={(e) => set("keywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            </Field>
            <Field label="Keywords em inglês (opcional, separadas por vírgula)">
              <Input value={settings.keywordsEn.join(", ")} onChange={(e) => set("keywordsEn", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
            </Field>
          </Section>
        )}

        <Section title="Elementos do documento">
          <div className="grid grid-cols-1 gap-2.5">
            {(
              (
                isReport
                  ? ([
                      ["lineBreaks", "Enter cria quebra de linha (pular linha)"],
                      ["numberSections", "Numerar seções (1., 1.1, 1.1.1 …)"],
                      ["numberEquations", "Numerar equações"],
                    ] as const)
                  : ([
                      ["lineBreaks", "Enter cria quebra de linha (pular linha)"],
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
                    ] as const)
              ) as readonly (readonly [keyof AbntSettings["toggles"], string])[]
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
