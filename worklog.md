# Worklog

---
Task ID: 1
Agent: main (Z.ai)
Task: Criar programa web que converte anotações em Markdown para documentos formatados nos padrões ABNT (DOCX + PDF)

Work Log:
- Esclarecimento com usuário: app web, saída DOCX+PDF, capa/rosto/aprovação/sumário/listas automáticas, citações autor-data, fonte escolhível (Times/Arial), uso principal = artigo (NBR 6022), UI em pt-BR.
- Inicializado ambiente fullstack (script init), instalados `docx@9`, `pdfkit@0.20`, `marked@18` (+ @types/pdfkit); `serverExternalPackages` configurado para pdfkit/fontkit.
- Núcleo ABNT em `src/lib/abnt/`:
  - `types.ts`: modelo de documento (blocos, corridas tipográficas, settings, medidas NBR 14724).
  - `parse.ts`: parser Markdown → modelo (marked lexer), front matter YAML simples, numeração de seções NBR 6024, citações `[@chave]`/`@chave` → autor-data (NBR 10520), citações longas (recuo 4 cm), legendas Tabela/Figura + "Fonte:", equações LaTeX leve → sup/sub/símbolos, extração de Resumo/Abstract/Referências.
  - `docx.ts`: gerador DOCX (A4, margens 3/2 cm, Times/Arial 12, 1,5 linhas, recuo 1,25 cm, citação longa 4 cm fonte 10 simples, TOC `\o "1-4"`, listas via `TOC \c` + legendas SEQ, referências NBR 6023, numeração de página no cabeçalho direito com seções/estimativa ABNT).
  - `pdf.ts`: gerador PDF (pdfkit) com motor tipográfico próprio (justificação com negrito/itálico/sup/sub), duas passagens para sumário/listas com números de página REAIS, tabelas com bordas ABNT (topo/cabeçalho/base), figuras com legenda/fonte, equações centralizadas numeradas, fallback DejaVu para símbolos matemáticos (α, √, ∑), `baseline: 0` em todas as chamadas de texto (pdfkit usa y como topo da linha).
  - `image.ts`: carregamento de imagens (data URI, http(s), arquivos de public/) com detecção de dimensões PNG/JPEG/GIF.
  - `sample.ts`: artigo de exemplo completo (front matter, resumo/abstract, citações, citação longa, tabela, figura `/sample-figure.png`, equação, referências NBR 6023).
- API `src/app/api/convert/route.ts`: POST {markdown, settings, format} → DOCX ou PDF com Content-Disposition; validação de markdown vazio (400).
- Frontend: `src/app/page.tsx` (header, editor com contadores, painéis redimensionáveis no desktop, 4 abas no mobile, downloads via blob + toasts), `components/abnt/preview.tsx` (prévia A4 fiel com tipografia ABNT), `settings-panel.tsx` (fonte, metadados, toggles de elementos), `guide.tsx` (guia de sintaxe + normas aplicadas); layout.tsx em pt-BR.
- Depuração com renders PNG do PDF (pdftoppm): corrigidos espaços entre palavras no motor de texto, `pdf.page.number` não confiável (contador próprio via pageAdded), reuso de página em branco nas reservas de listas, corpo iniciando em página nova, legenda duplicada (normalizeCaption), detecção de legenda ignorando tokens `space`, truncamento de entradas longas nas listas, espaçamento das bordas de tabela, overlap legenda×imagem (baseline: 0), WinAnsi sem gregos (DejaVu embutida), matemática inline ($...$/$$...$$).
- Validação: DOCX inspecionado (margens 1701/1134 twips, A4, line 360, firstLine 709, left 2268, TOC/SEQ/PAGEREF, caps), PDF inspecionado página a página (capa, rosto, aprovação, resumo, listas, sumário com números reais, corpo justificado com citações, tabela, figura, equação numerada, referências).
- Verificação no navegador (agent-browser): desktop e móvel (390px), abas Configurações/Guia/Prévia, troca de fonte Times↔Arial refletida na prévia, geração DOCX e PDF com toasts de sucesso, sem erros de console; lint limpo.

Stage Summary:
- App web MD2ABNT completo e verificado em / (única rota visível) + API /api/convert.
- Artefatos de teste: scripts/test-gen.ts, scripts/out/teste.docx|teste.pdf, capturas em scripts/out/.
- Decisões: front matter YAML sobrepõe o painel (documento reprodutível); numeração "só parte textual" no DOCX é estimada (limitação do formato — PDF é exato); sumário/listas do DOCX usam campos nativos do Word (atualizar com Ctrl+T).
