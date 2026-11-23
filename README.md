# MD2ABNT — Markdown para ABNT e Relatórios Técnicos

Aplicação web que converte notas em **Markdown** para documentos acadêmicos no padrão **ABNT** e para **Relatórios Técnicos de Experimento**, gerando arquivos **DOCX** e **PDF** prontos para entrega.

## Funcionalidades

- **Dois estilos de documento** no seletor do painel: **Artigo ABNT** (NBR 14724/6022) e **Relatório Técnico** (réplica dos relatórios "Experimento" do curso de Engenharia de Controle e Automação — IFC Campus Luzerna)
- **Editor Markdown** com pré-visualização em tempo real (estilo ABNT ou relatório)
- **Formatação NBR 14724** (estilo ABNT): A4, margens 3 cm (esquerda/superior) e 2 cm (direita/inferior), Times New Roman ou Arial 12 pt, espaçamento 1,5
- **Formatação do Relatório Técnico**: margens 3/3/2,5/2,5 cm, Times 12, espaçamento 1,15, cabeçalho institucional de texto (instituição + curso + régua verde) em todas as páginas, seções numeradas em negrito, corpo justificado, linhas de cálculo sem recuo, tabelas com grade completa e sem numeração de página. Título + tabela de identificação ficam na 1ª página e o texto começa logo em seguida — tudo junto, sem quebra de página
- **Template de relatório** pronto: botão "Template de relatório" carrega o esqueleto (1. Descrição da atividade → 2. Análise Teórica → 3. Metodologia → 4. Resultados → 5. Conclusão)
- **Quebra de linha com Enter** (pular linha): ajustável nas Configurações — desligado, linhas consecutivas viram um parágrafo contínuo
- **Alinhamento livre**: blocos `::: center` / `::: left` / `::: right` / `::: justify` (aceita centro, esquerda, direita, justificado) aplicam posicionamento a parágrafos, títulos e imagens — com o mesmo resultado no DOCX, no PDF e na prévia
- **Quebra de página manual**: escreva `<!-- pagebreak -->` (ou `<!-- quebra de página -->`) para iniciar uma nova página onde quiser
- **Estrutura ABNT gerada automaticamente**: capa, folha de rosto, folha de aprovação, resumo, listas de ilustrações/tabelas e sumário
- **Numeração automática de seções** (NBR 6024) e citações autor-data (NBR 10520): `[@silva2023]` → `(SILVA, 2023)`
- **Citações longas** (NBR 10705): recuo de 4 cm, fonte menor, sem aspas
- **Tabelas e figuras** com título, fonte e numeração sequencial (IBGE/NBR 14724)
- **Sumário com página real** no PDF e campo TOC nativo no Word
- **Tema claro e escuro** com preferência salva no navegador
- **Download** em DOCX (editável no Word/Google Docs) e PDF

## Como usar

```bash
# instalar dependências
bun install   # ou npm install

# rodar em desenvolvimento
bun dev       # ou npm run dev
```

Abra `http://localhost:3000`, escreva ou cole seu Markdown no editor e clique em **Baixar DOCX** ou **Baixar PDF**.

### Front matter suportado

```yaml
---
title: Título do Trabalho
author: Nome do Autor
institution: Universidade
city: Cidade
year: 2026
advisor: Prof. Dr. Orientador
font: times        # times | arial
---
```

## Stack

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · marked · docx · pdfkit

## Estrutura

```
src/
├── app/api/convert/   # API de conversão (POST → DOCX/PDF)
├── components/abnt/   # Editor, preview, painel de configurações e guia
└── lib/abnt/          # Parser Markdown + geradores DOCX/PDF
```
