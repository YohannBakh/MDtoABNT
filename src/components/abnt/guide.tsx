"use client";

/* Guia de sintaxe Markdown suportada e normas aplicadas */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const snippets: { title: string; body: string; code: string }[] = [
  {
    title: "Metadados (front matter)",
    body: "Opcional, no topo do arquivo. Sobrepõe as configurações do painel.",
    code: `---
title: Título do trabalho
subtitle: Subtítulo
authors:
  - Maria Silva
  - João Lopes
institution: UNIVERSIDADE EXEMPLO
department: Curso de Exemplo
city: Cidade
year: 2025
advisor: Prof. Dr. Nome
committee:
  - Prof. Dr. Membro — Instituição
approvalDate: 15 de outubro de 2025
keywords: palavra 1, palavra 2
font: times
---`,
  },
  {
    title: "Resumo e abstract",
    body: "Seções especiais: viram páginas próprias com formatação NBR 6028 (espaço simples). As palavras-chave são separadas por ponto.",
    code: `## Resumo

Texto do resumo em parágrafo único...

Palavras-chave: palavra 1. palavra 2. palavra 3.

## Abstract

Abstract text...

Keywords: word 1. word 2.`,
  },
  {
    title: "Seções numeradas (NBR 6024)",
    body: "Os níveis de título ganham numeração e tipo automáticos: 1 CAIXA ALTA NEGRITO → 1.1 CAIXA ALTA → 1.1.1 Negrito → 1.1.1.1 Itálico.",
    code: `# Introdução
## Método (subseção)
### Participantes
### Instrumentos`,
  },
  {
    title: "Citações autor-data (NBR 10520)",
    body: "Chaves de citação viram chamadas no formato autor-data. O sobrenome é deduzido da chave.",
    code: `[@mendes2021] → (MENDES, 2021)
[@silva2020, p. 25] → (SILVA, 2020, p. 25)
[@a2020; @b2021] → (A, 2020; B, 2021)
Segundo @oliveira2022 → Segundo Oliveira (2022)`,
  },
  {
    title: "Citação longa",
    body: "Bloco citado (>) com mais de 3 linhas: recuo de 4 cm, fonte menor e espaço simples, sem aspas.",
    code: `> A anotação deixa de ser cópia e passa a ser
> reconstrução do conhecimento pelo estudante.`,
  },
  {
    title: "Tabelas e figuras (NBR 14724)",
    body: "Coloque a legenda em um parágrafo imediatamente antes (Tabela/Figura + número opcional) e a fonte em um parágrafo 'Fonte:' logo depois. Bordas: apenas superior, inferior e cabeçalho.",
    code: `Tabela 1 – Resultados da análise

| Grupo | Média |
| :--- | ---: |
| Experimental | 78,4 |
| Controle | 71,2 |

Fonte: dados da pesquisa (2025).

![Figura 2 – Fluxo do método](/figura.png)`,
  },
  {
    title: "Equações",
    body: "Bloco $$...$$ vira equação centralizada e numerada; $...$ vira matemática inline (α, ∑, √, ≤, ×...).",
    code: `$$D(t) = D_0 + \\alpha \\cdot \\sqrt{t}$$

em que $D(t)$ é o desempenho na semana $t$.`,
  },
  {
    title: "Listas e código",
    body: "Listas com marcador viram alíneas com travessão; listas numeradas viram alíneas a), b), c). Código sai em fonte monoespaçada 10.",
    code: `- primeira alínea
- segunda alínea
  - subalínea

1. procedimento um
2. procedimento dois`,
  },
];

const normas = [
  ["NBR 14724", "Apresentação de trabalhos acadêmicos: formato A4, margens 3/2 cm, fonte 12, espaçamento 1,5, recuo de parágrafo 1,25 cm, paginação no canto superior direito."],
  ["NBR 6022", "Artigo científico: estrutura com título, resumo, palavras-chave, seções e referências."],
  ["NBR 6024", "Numeração progressiva das seções e diferenciação tipográfica por nível."],
  ["NBR 10520", "Citações autor-data e citações longas com recuo de 4 cm, fonte menor e espaço simples."],
  ["NBR 6023", "Referências: alinhadas à esquerda, espaço simples, separadas por linha em branco."],
  ["NBR 6028", "Resumo: parágrafo único, espaço simples e palavras-chave separadas por ponto."],
];

export function SyntaxGuide() {
  return (
    <ScrollArea className="h-[calc(100vh-220px)] pr-3">
      <div className="space-y-4 pb-8">
        <p className="text-sm text-neutral-600">
          Escreva suas anotações em Markdown comum — o conversor aplica as normas automaticamente. Recursos especiais:
        </p>
        {snippets.map((sn) => (
          <Card key={sn.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{sn.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-neutral-600">{sn.body}</p>
              <pre className="overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-[11px] leading-relaxed text-neutral-800">
                {sn.code}
              </pre>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Normas aplicadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {normas.map(([nbr, desc]) => (
              <div key={nbr} className="text-xs text-neutral-600">
                <span className="font-semibold text-neutral-800">{nbr}</span> — {desc}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
