/* Documento demonstrativo — exemplo completo de anotações Markdown → ABNT */

export const SAMPLE_MARKDOWN = `---
title: Anotações digitais e aprendizagem ativa
subtitle: Um estudo experimental com estudantes universitários
authors:
  - Maria Eduarda Ferreira Silva
  - João Pedro Camargo Lopes
institution: UNIVERSIDADE FEDERAL EXEMPLO
department: Faculdade de Educação — Curso de Pedagogia
city: São Paulo
year: 2025
advisor: Prof. Dr. Carlos Henrique Monteiro
advisorRole: Orientador
committee:
  - Prof. Dr. Carlos Henrique Monteiro — Universidade Federal Exemplo
  - Profa. Dra. Ana Beatriz Rocha — Universidade Estadual Exemplo
  - Prof. Dr. Rafael Nogueira — Universidade Federal Exemplo
approvalDate: 15 de outubro de 2025
fileName: artigo-abnt-exemplo
---

## Resumo

Este artigo investiga o impacto das anotações digitais na aprendizagem ativa de estudantes universitários. A pesquisa, de natureza experimental, acompanhou dois grupos de graduação durante seis semanas, comparando o desempenho de quem utilizou anotações manuscritas e de quem utilizou ferramentas digitais com suporte à colaboração. Os resultados indicam ganhos estatisticamente significativos no grupo que combinou anotações digitais com revisões colaborativas semanais, sobretudo nas dimensões de retenção e transferência de conhecimento.

Palavras-chave: aprendizagem ativa. anotações digitais. ensino superior. tecnologia educacional.

## Abstract

This article investigates the impact of digital note-taking on active learning among undergraduate students. The experimental study followed two groups for six weeks, comparing the performance of students using handwritten notes and students using collaborative digital tools. Results indicate statistically significant gains for the group that combined digital notes with weekly collaborative reviews.

Keywords: active learning. digital notes. higher education. educational technology.

# Introdução

As práticas de anotação ocupam papel central nos processos de estudo e na construção autônoma do conhecimento. Segundo [@mendes2021], a qualidade das anotações está diretamente associada ao desempenho acadêmico em disciplinas de alta densidade conceitual. @oliveira2022 observa, porém, que a transição do papel para o ambiente digital altera não apenas o suporte, mas a própria estratégia cognitiva do estudante.

A literatura recente aponta três dimensões relevantes para a análise: a modalidade do registro, a possibilidade de colaboração e a integração com materiais de referência [@mendes2021; @souza2020, p. 25]. Nesta pesquisa, essas dimensões foram operacionalizadas em um desenho experimental com dois grupos e medições semanais.

# Referencial teórico

## Teorias da aprendizagem ativa

A aprendizagem ativa parte do princípio de que o estudante constrói conhecimento quando manipula, organiza e discute a informação, e não quando apenas a recebe. Como sintetiza [@almeida2019, p. 112]:

> A anotação deixa de ser cópia e passa a ser reconstrução: o estudante que reformula o conteúdo com suas próprias palavras, questiona e conecta ideias desenvolve estruturas cognitivas mais resistentes ao esquecimento e mais disponíveis para uso em situações novas.

## Anotações digitais e metacognição

Ferramentas digitais de anotação oferecem recursos de busca, vinculação e revisão espaçada que favorecem processos metacognitivos [@lima2023]. A possibilidade de compartilhar cadernos entre pares amplia o feedback e cria oportunidades de autorregulação. Ainda assim, @oliveira2022 adverte que o excesso de recursos pode fragmentar a atenção e reduzir a profundidade do processamento.

# Método

Adotou-se delineamento quase-experimental com dois grupos intatos de graduação, acompanhados por seis semanas. O grupo experimental utilizou cadernos digitais colaborativos com revisões semanais mediadas; o grupo controle manteve sua rotina habitual de anotações em papel. O desempenho foi medido por testes semanais de retenção e por uma tarefa de transferência ao final do período.

A evolução comparada dos grupos é apresentada na Figura 1.

![Figura 1 – Evolução do desempenho médio por grupo ao longo das seis semanas de acompanhamento](/sample-figure.png)

Fonte: elaborado pelos autores (2025).

A Tabela 1 sintetiza os resultados da tarefa de transferência.

Tabela 1 – Desempenho na tarefa de transferência por grupo

| Dimensão avaliada | Grupo experimental | Grupo controle | Valor p |
| :--- | :---: | :---: | ---: |
| Retenção imediata | 78,4 | 71,2 | 0,013 |
| Retenção tardia | 74,1 | 65,8 | 0,004 |
| Transferência near | 81,6 | 68,3 | <0,001 |
| Transferência far | 69,7 | 61,5 | 0,021 |

Fonte: dados da pesquisa (2025).

# Resultados e discussão

Os resultados confirmam a hipótese central: a combinação de anotações digitais com revisões colaborativas produziu ganhos médios de 9,8 pontos na retenção tardia e de 13,3 pontos na transferência near em relação ao grupo controle. Esses achados convergem com [@lima2023] e estendem [@mendes2021] ao contexto de disciplinas de formação inicial.

Dois pontos merecem destaque. Primeiro, o efeito foi mais acentuado entre estudantes com repertório digital prévio mais organizado, o que sugere mediação pela qualidade do sistema pessoal de anotações. Segundo, a diferença na dimensão de transferência far foi positiva, porém menor, indicando que a revisão colaborativa favorece sobretudo a aplicação em contextos próximos ao originalmente estudado [@almeida2019].

O modelo de crescimento observado pode ser aproximado pela expressão

$$D(t) = D_0 + \\alpha \\cdot \\sqrt{t}$$

em que $D(t)$ representa o desempenho esperado na semana $t$ e $\\alpha$ o coeficiente de ganho atribuível à revisão colaborativa.

# Considerações finais

O estudo demonstra que o valor das anotações digitais não está no suporte em si, mas no desenho pedagógico que o atravessa: estruturação dos cadernos, ritmo de revisão e interação entre pares. Para futuras investigações, recomenda-se acompanhar os mesmos grupos por um período semestral e examinar a persistência dos ganhos após a interrupção das mediações.

# Referências

ALMEIDA, Fernanda Rodrigues de. **Aprendizagem ativa e reconstrução do conhecimento**. São Paulo: Editora Acadêmica, 2019.

LIMA, Rafael Costa; SOUZA, Marina Duarte. Cadernos digitais colaborativos e metacognição no ensino superior. *Educação e Tecnologia*, v. 18, n. 2, p. 45-63, 2023.

MENDES, Paula Aparecida. Anotações de estudo e desempenho acadêmico: uma revisão sistemática. **Cadernos de Pesquisa Universitária**, v. 29, n. 1, p. 12-34, 2021.

OLIVEIRA, Thiago Nunes de. Do papel à tela: estratégias cognitivas de estudantes universitários. *Revista Brasileira de Educação*, v. 27, p. 1-22, 2022.

SOUZA, Marina Duarte. **Métodos de estudo na universidade**. 3. ed. Campinas: Editora Universitária, 2020.
`;

export const SAMPLE_SETTINGS_OVERRIDES = {
  title: "Anotações digitais e aprendizagem ativa",
  subtitle: "Um estudo experimental com estudantes universitários",
};
