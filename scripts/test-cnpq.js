/* Gera DOCX + PDF de teste no estilo CNPq e renderiza páginas para conferência */
const { parseMarkdown } = require("/tmp/gentest/parse.js");
const { DEFAULT_SETTINGS } = require("/tmp/gentest/types.js");
const { buildCnpqDocxBlob } = require("/tmp/gentest/docx-cnpq.js");
const { buildCnpqPdfBuffer } = require("/tmp/gentest/pdf-cnpq.js");
const fs = require("fs");

const MD = `---
title: Drone para fiscalização termográfica em redes de distribuição de energia elétrica: desenvolvimento de uma interface de comunicação e controle para o Parrot AR.Drone 2.0
authors:
  - Isaac Estevan Geuster
institution: INSTITUTO FEDERAL CATARINENSE
department: CURSO DE ENGENHARIA DE CONTROLE E AUTOMAÇÃO
city: Luzerna
year: 2026
advisor: Prof. Antonio Ribas Neto
fileName: relatorio-cnpq
---

## Resumo

Este trabalho apresenta o desenvolvimento de uma interface de comunicação e controle para o quadricóptero Parrot AR.Drone 2.0. O desenvolvimento foi realizado por meio de diferentes abordagens, inicialmente utilizando uma biblioteca em Node.js para comunicar com o equipamento e realização de testes de voo, incluindo tentativas de voo autônomo.

Palavras-chave: Drones, comunicação, controle, telemetria

# Introdução

Os drones constituem sistemas que integram diferentes áreas da computação e da engenharia, envolvendo sistemas embarcados, sensores, comunicação, controle e processamento de dados. Para que um veículo aéreo possa ser controlado por um sistema externo, é necessário estabelecer mecanismos de comunicação capazes de transmitir comandos e receber informações sobre o estado do equipamento.

Nesse contexto, o Parrot AR.Drone 2.0 foi utilizado como plataforma experimental para o desenvolvimento de métodos de comunicação e controle.

## Materiais e métodos

### Plataforma utilizada

O equipamento utilizado no desenvolvimento foi o Parrot AR.Drone 2.0, empregado como plataforma experimental para os testes de comunicação e controle.

O equipamento possui uma interface de comunicação através de sua rede sem fio, possibilitando que aplicações externas enviem comandos e recebam informações relacionadas ao seu funcionamento.

## Primeira abordagem: Node.js

A primeira etapa prática do desenvolvimento utilizou uma biblioteca em Node.js destinada à comunicação com o AR.Drone 2.0. Segue um exemplo de código em Node.js:

    var arDrone = require('ar-drone');
    var client  = arDrone.createClient();
    client.takeoff();

## Comandos do equipamento

Entre os comandos trabalhados durante o desenvolvimento estavam:

Tabela 1 - Comandos do AR Drone 2.0

| Comando | Finalidade |
| --- | --- |
| AT\\*REF | Controle de estados como decolagem e pouso |
| AT\\*PCMD | Controle de movimentação |
| AT\\*CONFIG | Configuração do equipamento |

# Considerações finais

O desenvolvimento demonstrou a existência de diferentes níveis de dificuldade na comunicação com um sistema embarcado. A implementação em Python apresentou um equilíbrio diferente, permitindo trabalhar diretamente com sockets e comandos do protocolo.

## Referências

ARDRONE2WINDOWS. **AR.Drone 2.0 SDK**. GitHub, [s. d.]. Disponível em: https://github.com/ARDrone2Windows/SDK. Acesso em: 28 ago. 2026.

PAPARAZZI UAV. **AR Drone 2: AT Commands**. [S. l.], [s. d.]. Disponível em: https://wiki.paparazziuav.org/wiki/AR_Drone_2/AT_Commands. Acesso em: 30 ago. 2026.
`;

(async () => {
  const base = { ...DEFAULT_SETTINGS, style: "cnpq", font: "arial" };
  base.cnpq = {
    ...base.cnpq,
    monthYear: "08/2026",
    avaliacao: {
      obstaculos:
        "Durante o desenvolvimento da pesquisa, foram encontrados obstáculos relacionados principalmente à complexidade da comunicação com o AR.Drone 2.0 e às limitações impostas pelas condições do equipamento.\n\nPosteriormente, foi estudada a possibilidade de desenvolver uma alternativa em C, mas a complexidade da adaptação do código existente tornou essa abordagem inviável dentro das condições do projeto.",
      materialQuimico: "A pesquisa não envolveu a utilização de materiais químicos ou genéticos que necessitassem de procedimentos específicos de descarte.",
      meioAmbiente: "Durante o desenvolvimento do trabalho não foram realizadas atividades que provocassem agressão ou violação significativa do equilíbrio ecológico e ambiental.",
      devCientifico:
        "Apesar de o projeto não ter sido concluído integralmente, a pesquisa proporcionou o estudo prático da comunicação entre um computador e um veículo aéreo não tripulado, incluindo protocolos de comunicação em rede.",
      capacitacao:
        "O desenvolvimento da pesquisa contribuiu para a formação técnica dos participantes por meio do contato com programação em diferentes linguagens, comunicação de dispositivos por redes de computadores, protocolos TCP e UDP.",
      transferencia:
        "Não foram gerados produtos comerciais, patentes ou tecnologias prontas para transferência durante o período da pesquisa.",
      parecerCoordenador:
        "Com o objetivo de contribuir com o desenvolvimento de drones para a realização de inspeções termográficas em redes de distribuição de energia elétrica, este projeto propunha a adequação de um drone para o desenvolvimento de inspeção termográfica de pontos de calor em redes de energia.\n\nO fator relacionado ao rendimento acadêmico não deixou de ser notável, uma vez que o bolsista possui rendimento acadêmico considerável e demonstra responsabilidade e comprometimento.",
    },
  };

  const doc = parseMarkdown(MD, base);
  fs.writeFileSync("/tmp/test-cnpq.docx", await buildCnpqDocxBlob(doc));
  fs.writeFileSync("/tmp/test-cnpq.pdf", await buildCnpqPdfBuffer(doc));
  console.log("ok: /tmp/test-cnpq.docx /tmp/test-cnpq.pdf");
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
