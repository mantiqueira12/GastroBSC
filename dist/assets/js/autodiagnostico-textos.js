/*
 * Textos do autodiagnóstico (fonte: 11_mvp_site_captacao/conteudo/autodiagnostico.md, Revisão 2).
 * Script clássico: expõe globalThis.GBSC_AutodiagTextos. Sem rede, sem armazenamento.
 * Regra: nenhum texto deste arquivo que apareça no resultado ou no destaque pode ter dígito,
 * "%" ou "de 100" (a nota numérica nunca é exibida). Números escritos por extenso.
 * Os links para ferramentas ainda inexistentes ficam só aqui, como dados (T06 e T08 criam as páginas).
 */
(function (g) {
  'use strict';

  var FERRAMENTAS = {
    cmv: { texto: 'Guia de ficha técnica e CMV', href: 'ficha-tecnica-prato-custo-cmv.html' },
    calculadora: { texto: 'Calculadora de margem e ponto de equilíbrio', href: 'calculadora-margem-ponto-equilibrio.html' },
    checklist: { texto: 'Checklist de rotinas do restaurante', href: 'checklist-rotinas-restaurante.html' }
  };

  g.GBSC_AutodiagTextos = {
    tituloResultado: 'Seu resultado por área',
    avisoResultado: 'Esta é uma leitura rápida, feita só com o que você respondeu. Não é um diagnóstico completo do restaurante. A nota de cada área e a leitura do seu caso vêm na conversa.',
    faltamRespostas: 'Faltam respostas. Responda as 10 perguntas para ver o resultado.',

    tituloDestaque: 'A área que mais pesou: ',
    tituloDestaqueOrganizado: 'Tudo organizado. A área com menos folga: ',
    rotulosDestaque: {
      acontece: 'O que costuma acontecer',
      passo: 'Primeiro passo (grátis)',
      ferramenta: 'Ferramenta gratuita',
      conversa: 'O que fica para a conversa'
    },

    cta: {
      titulo: 'Receba sua nota por área e a leitura do seu caso no WhatsApp',
      tituloOrganizado: 'Receba sua nota por área e o próximo passo do seu caso no WhatsApp',
      frasePiorArea: {
        financas: 'Como Finanças e custos foi a área que mais pesou, começo por aí: custo dos pratos, caixa e o que sobra no mês.',
        cardapio: 'Como Cardápio e vendas foi a área que mais pesou, começo por aí: o que vende, o que deixa lucro e como os preços são definidos.',
        equipe: 'Como Equipe e rotinas foi a área que mais pesou, começo por aí: como o dia a dia funciona sem você precisar estar em cima.',
        gestao: 'Como Gestão e tempo do dono foi a área que mais pesou, começo por aí: para onde vai o seu tempo e quanto a casa depende de você.'
      },
      textoBase: 'Mande suas respostas pelo WhatsApp que eu calculo a nota de cada uma das quatro áreas e devolvo, na conversa, a leitura do seu caso. Se fizer sentido, marcamos a conversa de diagnóstico gratuita (30 min, online). Sem compromisso.',
      textoOrganizado: 'Suas quatro áreas ficaram Organizado. Mesmo assim, a leitura do caso mostra o que um questionário curto não enxerga. Mande suas respostas pelo WhatsApp que eu calculo a nota de cada área e conversamos sobre o próximo passo. Se fizer sentido, marcamos a conversa de diagnóstico gratuita (30 min, online). Sem compromisso.',
      botao: 'Quero receber minha nota no WhatsApp',
      privacidade: 'Suas respostas ficam no seu aparelho. Elas só chegam a mim se você clicar no botão e enviar a mensagem pelo WhatsApp. Você vê o texto antes de enviar.'
    },

    refazer: 'Refazer o autodiagnóstico',

    destaques: {
      financas: {
        atencao: {
          acontece: 'As contas ficam mais na cabeça do dono do que no papel, e o mês fecha sem a certeza de quanto sobrou. Aí é difícil saber se um mês cheio virou dinheiro de verdade.',
          passo: 'Escolha o prato que mais sai e calcule o custo dele, ingrediente por ingrediente, com balança e o preço da última nota de compra.',
          ferramenta: FERRAMENTAS.cmv,
          conversa: 'Um prato é só uma peça. A leitura completa do seu caso depende de olhar juntos o custo dos pratos, os custos fixos e o que sobra no mês.'
        },
        evolucao: {
          acontece: 'Parte dos números já existe, mas alguns ainda são estimativa. É comum o custo dos pratos, os custos fixos e o resultado do mês ficarem em lugares diferentes, sem se encontrar.',
          passo: 'Some os custos fixos de um mês (aluguel, folha, energia, contador e o que mais se repete) e divida pelos dias em que a casa abre. Esse é o custo fixo de cada dia, ponto de partida para saber quanto precisa vender.',
          ferramenta: FERRAMENTAS.calculadora,
          conversa: 'Ligar essas peças num quadro só, com os seus números, é o que mostra por onde começar. A leitura completa depende de ver tudo junto.'
        },
        organizado: {
          acontece: 'Quando custo, caixa e ponto de equilíbrio estão em dia, decidir fica mais calmo. O risco passa a ser o número ficar parado enquanto a casa muda.',
          passo: 'Teste um cenário antes de decidir. E se o aluguel, um ingrediente importante ou o movimento mudar? Veja o efeito na margem.',
          ferramenta: FERRAMENTAS.calculadora,
          conversa: 'Quais cenários valem testar no seu caso depende dos seus números, olhados juntos.'
        }
      },
      cardapio: {
        atencao: {
          acontece: 'Cardápio e preços seguem mais o costume do que os números. O prato que mais vende nem sempre é o que mais deixa, e o melhor pode ficar escondido no meio do cardápio.',
          passo: 'Liste os cinco pratos mais vendidos do último mês (o caixa ou o caderno de pedidos mostra) e escreva ao lado de cada um o custo da porção.',
          ferramenta: FERRAMENTAS.cmv,
          conversa: 'Saber qual prato empurrar e qual repensar depende de cruzar vendas, custo e preço do seu cardápio, olhando os números juntos.'
        },
        evolucao: {
          acontece: 'Já se olha o que vende, mas os preços ainda não se apoiam totalmente em custo e margem. Vendas e margem costumam ficar em listas separadas.',
          passo: 'Para cada um dos cinco pratos mais vendidos, calcule a margem (preço de venda menos custo) e marque os que vendem muito e deixam pouco.',
          ferramenta: FERRAMENTAS.calculadora,
          conversa: 'O que fazer com cada prato marcado (preço, porção ou posição no cardápio) depende do conjunto. A leitura completa vem de olhar os números juntos.'
        },
        organizado: {
          acontece: 'Usar custo, margem e vendas para decidir ajuda a notar cedo um prato que deixou de compensar. O desafio é manter o ritmo de revisão.',
          passo: 'Marque na agenda a próxima revisão de preços e simule o ajuste de um prato antes de mexer no cardápio.',
          ferramenta: FERRAMENTAS.calculadora,
          conversa: 'Onde ainda há espaço para ganhar no seu cardápio só aparece olhando os seus números juntos.'
        }
      },
      equipe: {
        atencao: {
          acontece: 'A rotina vive na memória das pessoas e no olho do dono. Quando cada um faz do seu jeito, o padrão oscila, e uma falta ou uma saída desorganiza o turno.',
          passo: 'Escreva numa folha o que precisa acontecer na abertura, na ordem em que acontece, e cole na cozinha. Comece só pela abertura.',
          ferramenta: FERRAMENTAS.checklist,
          conversa: 'Quais rotinas escrever primeiro, e com quem, depende de como o seu turno funciona hoje. A leitura completa pede olhar o seu caso inteiro.'
        },
        evolucao: {
          acontece: 'Existem combinados, mas parte deles não está escrita ou não é seguida por todos. A rotina funciona enquanto o dono está olhando.',
          passo: 'Pegue o checklist de abertura ou de fechamento, adapte à sua casa e peça que o responsável do turno marque cada item durante uma semana.',
          ferramenta: FERRAMENTAS.checklist,
          conversa: 'O que travou nessa semana de teste e como ajustar depende do seu caso. A leitura completa vem de olhar tudo junto.'
        },
        organizado: {
          acontece: 'A equipe conhece as funções, a escala é combinada e as rotinas se repetem. O risco é o papel ficar velho enquanto a casa muda.',
          passo: 'Peça a quem executa cada rotina que aponte o que deixou de fazer sentido no checklist, e atualize o papel.',
          ferramenta: FERRAMENTAS.checklist,
          conversa: 'Onde a equipe ainda depende de você, mesmo com tudo combinado, só aparece olhando o conjunto do seu caso.'
        }
      },
      gestao: {
        atencao: {
          acontece: 'Decisões, dúvidas e problemas passam todos pelo dono, e sobra pouco espaço para olhar o negócio de fora. Esse cansaço costuma aparecer antes de aparecer nos números.',
          passo: 'Anote durante uma semana as vezes em que te perguntaram algo. Escolha uma pergunta que se repete e escreva a resposta como regra para a equipe.',
          ferramenta: FERRAMENTAS.checklist,
          conversa: 'Quais decisões passar adiante primeiro depende da sua equipe e do seu turno. A leitura completa pede olhar o seu caso inteiro.'
        },
        evolucao: {
          acontece: 'Parte das decisões já não passa pelo dono, mas ainda chegam coisas que o turno poderia resolver. Falta definir quem decide o quê e até onde.',
          passo: 'Defina três situações que a equipe pode resolver sem te ligar (por exemplo, trocar um turno, oferecer uma cortesia pequena ou substituir um item em falta) e avise todos numa reunião curta.',
          ferramenta: FERRAMENTAS.checklist,
          conversa: 'Até onde dar autonomia a cada pessoa depende da equipe que você tem. A leitura completa vem de olhar o seu caso junto.'
        },
        organizado: {
          acontece: 'A casa funciona sem depender do dono a cada decisão, e sobra espaço para olhar o negócio de fora. Esse espaço rende mais quando vira hábito.',
          passo: 'Use esse espaço para manter, toda semana, um horário fixo para olhar os números. Ver os números com frequência ajuda a perceber mudanças mais cedo.',
          ferramenta: FERRAMENTAS.calculadora,
          conversa: 'O que fazer com esse tempo livre depende dos números da sua casa, olhados juntos.'
        }
      }
    }
  };
})(globalThis);
