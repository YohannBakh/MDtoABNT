# Conversor ABNT — Markdown para Formato Acadêmico

Aplicação web que converte notas em **Markdown** para documentos acadêmicos no padrão **ABNT**, gerando arquivos **DOCX** e **PDF** prontos para entrega.

## Funcionalidades

- **Editor Markdown** com pré-visualização em tempo real (estilo ABNT)
- **Formatação NBR 14724**: A4, margens 3 cm (esquerda/superior) e 2 cm (direita/inferior), Times New Roman ou Arial 12 pt, espaçamento 1,5
- **Estrutura completa gerada automaticamente**: capa, folha de rosto, folha de aprovação, resumo, listas de ilustrações/tabelas e sumário
- **Numeração automática de seções** (NBR 6024) e citações autor-data (NBR 10520): `[@silva2023]` → `(SILVA, 2023)`
- **Citações longas** (NBR 10705): recuo de 4 cm, fonte menor, sem aspas
- **Tabelas e figuras** com título, fonte e numeração sequencial (IBGE/NBR 14724)
- **Sumário com página real** no PDF e campo TOC nativo no Word
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
