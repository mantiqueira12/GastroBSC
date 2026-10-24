/*
 * Textos, formatação e validação de campos da calculadora.
 * Especificação: 11_mvp_site_captacao/conteudo/calculadora.md (seções 3.1, 4.6, 5 e 6).
 * Script clássico (sem módulos): expõe globalThis.GBSC_CalcTextos.
 * Depende de globalThis.GBSC_Calc (calculadora-calc.js), que deve carregar antes.
 * Sem DOM, sem rede, sem cookies, sem armazenamento. Todo valor que entra no HTML
 * é número formatado por Intl ou texto fixo deste arquivo; nada digitado vira HTML.
 */
(function (global) {
  'use strict';

  var Calc = global.GBSC_Calc;
  var formatoBrl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var formatoPct = new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Evita "-R$ 0,00" quando só sobra ruído de ponto flutuante.
  function zerar(n) {
    return Math.abs(n) < 0.005 ? 0 : n;
  }

  function brl(n) {
    return formatoBrl.format(zerar(n));
  }

  // pct vem em pontos percentuais: 3,75 vira "3,75%".
  function pct(n) {
    return formatoPct.format(zerar(n) / 100);
  }

  var MSG = {
    numero: 'Digite só números, por exemplo 12.500,00.',
    valorAlto: 'Valor muito alto. Confira o número digitado.',
    percentual: 'Digite um percentual entre 0 e 100.',
    dias: 'Digite um número inteiro de 0 a 31.',
    corrija: 'Corrija os campos indicados para ver o resultado.',
    semFaturamento: 'Informe o faturamento do mês para ver o resultado.',
    semFaturamentoConvite:
      'Não sabe qual número usar? Na conversa de diagnóstico gratuita (30 min, online), eu ajudo você a levantar os números do seu mês.',
    semFixos:
      'Você não informou custos fixos. Preencha aluguel, folha, contas, pró-labore e outros para calcular o ponto de equilíbrio.',
    prolabore:
      'Você deixou o pró-labore em branco. Se você retira dinheiro da empresa para viver, inclua esse valor: sem ele, o resultado parece melhor do que é.'
  };

  var LIMITE_REAIS = 999999999.99;
  var TIPOS = {
    faturamento: 'reais',
    cmv: 'cmv',
    aluguel: 'reais',
    folha: 'reais',
    contas: 'reais',
    prolabore: 'reais',
    outrosFixos: 'reais',
    taxas: 'percentual',
    embalagens: 'percentual',
    impostos: 'percentual',
    dias: 'dias'
  };

  /*
   * textos: { id: 'o que a pessoa digitou' }; modo: 'valor' | 'percentual' (modo do CMV).
   * Devolve { ok, erros: { id: mensagem }, valores: { id: número } }.
   * Campo vazio vale 0 e nunca é erro.
   */
  function validar(textos, modo) {
    var erros = {};
    var valores = {};
    var ids = Object.keys(TIPOS);
    for (var i = 0; i < ids.length; i += 1) {
      var id = ids[i];
      var tipo = TIPOS[id];
      if (tipo === 'cmv') tipo = modo === 'percentual' ? 'percentual' : 'reais';
      var lido = Calc.parseNumeroBR(textos ? textos[id] : '');
      if (!lido.ok) {
        erros[id] = MSG.numero;
        continue;
      }
      var valor = lido.valor;
      if (tipo === 'reais' && valor > LIMITE_REAIS) {
        erros[id] = MSG.valorAlto;
      } else if (tipo === 'percentual' && valor > 100) {
        erros[id] = MSG.percentual;
      } else if (tipo === 'dias' && (valor > 31 || Math.floor(valor) !== valor)) {
        erros[id] = MSG.dias;
      }
      valores[id] = valor;
    }
    return { ok: Object.keys(erros).length === 0, erros: erros, valores: valores };
  }

  // ---------- interpretação por situação (seção 6) ----------

  var LINK_GUIA = { href: 'ficha-tecnica-prato-custo-cmv.html', rotulo: 'Ler o guia de ficha técnica e CMV' };
  var LINK_AUTODIAG = { href: 'autodiagnostico-restaurante.html', rotulo: 'Fazer o autodiagnóstico do restaurante' };

  function interpretacao(r, faturamento) {
    if (r.status === 'margem_nao_positiva') {
      return {
        titulo: 'Cada venda dá prejuízo antes dos custos fixos',
        texto:
          'Com esses números, cada venda dá prejuízo antes dos custos fixos. Depois de pagar o CMV e os custos que variam com a venda, não sobra nada para cobrir aluguel, equipe e os demais custos fixos. Por isso não dá para calcular o ponto de equilíbrio: vender mais não resolve enquanto a conta de cada venda for essa. O resultado do mês foi ' +
          brl(r.resultado) +
          '.',
        decide:
          'Aqui, a ordem importa mais ainda. O que decide é saber qual alavanca mexer primeiro (preço, CMV, taxas, desperdício) e quanto cada uma muda. Esta conta não mostra isso.',
        passo:
          'Revise o CMV, as taxas e os impostos que você informou (um erro de digitação aqui muda tudo) e o custo de cada prato.',
        link: LINK_GUIA
      };
    }
    if (r.situacao === 'prejuizo') {
      return {
        titulo: 'O mês fechou no prejuízo',
        texto:
          'Pelos números informados, as vendas não cobriram os custos do mês: o resultado foi ' +
          brl(r.resultado) +
          ' (' +
          pct(r.resultadoPct) +
          ').' +
          (r.semFixos
            ? ''
            : ' Com essa mesma estrutura de custos, o ponto de equilíbrio é ' +
              brl(r.pe) +
              ' por mês. Faltaram ' +
              brl(r.falta) +
              ' de faturamento para empatar.'),
        decide:
          'Vender mais é só uma das saídas, e nem sempre a mais fácil. Preço, CMV, custos fixos, equipe e desperdício mexem no resultado em tamanhos diferentes. O que decide é saber qual alavanca mexer primeiro e quanto cada uma muda, e esta conta não mostra isso.',
        passo:
          'Confira o número em que você tem menos segurança. Se for o CMV, o guia mostra como calcular o custo de cada prato e o CMV do período.',
        link: LINK_GUIA
      };
    }
    if (r.situacao === 'empate') {
      return {
        titulo: 'Você está perto do equilíbrio',
        texto:
          'Pelos números informados, o mês ficou perto do zero a zero: o resultado foi ' +
          brl(r.resultado) +
          ' (' +
          pct(r.resultadoPct) +
          ').' +
          (r.semFixos ? '' : ' O ponto de equilíbrio é ' + brl(r.pe) + ' por mês.') +
          ' Nesta calculadora, "perto" significa até 5% do faturamento, para mais ou para menos; é uma faixa nossa para facilitar a leitura, não uma referência de mercado. Uma pequena mudança nas vendas ou nos custos pode virar o sinal do resultado.',
        decide:
          'Quando o mês está assim, cada ajuste pesa. Por isso o que decide é saber qual alavanca mexer primeiro (preço, CMV, custos fixos, equipe ou desperdício) e quanto cada uma muda. Esta conta não mostra isso.',
        passo:
          'Descubra em que parte da operação você está travando. O autodiagnóstico tem 10 perguntas e mostra uma nota por área.',
        link: LINK_AUTODIAG
      };
    }
    var equilibrio = r.semFixos
      ? ''
      : ' O ponto de equilíbrio é ' + brl(r.pe) + ' por mês, e o faturamento do mês está ' + brl(faturamento - r.pe) + ' acima dele.';
    return {
      titulo: 'O mês fechou com lucro',
      texto:
        'Pelos números informados, sobraram ' +
        brl(r.resultado) +
        ' (' +
        pct(r.resultadoPct) +
        ') depois de pagar todos os custos informados.' +
        equilibrio +
        ' Resultado no papel não é a mesma coisa que dinheiro no caixa: vale conferir se os custos que você informou estão completos.',
      decide:
        'Ter lucro no mês não diz de onde ele veio nem o quanto ele aguenta. O que decide o quanto sobra é saber qual alavanca mexer primeiro (preço, CMV, custos fixos, equipe ou desperdício) e quanto cada uma muda. Esta conta não mostra isso.',
      passo: 'Veja onde a operação ainda depende só de você, com o autodiagnóstico.',
      link: LINK_AUTODIAG
    };
  }

  function htmlInterpretacao(r, faturamento) {
    var t = interpretacao(r, faturamento);
    return (
      '<section class="tool-highlight calc-interp" aria-labelledby="calc-interp-titulo">' +
      '<h3 id="calc-interp-titulo">' + t.titulo + '</h3>' +
      '<p>' + t.texto + '</p>' +
      '<p><strong>O que decide o resultado:</strong> ' + t.decide + '</p>' +
      '<p><strong>Primeiro passo:</strong> ' + t.passo + '</p>' +
      '<p class="calc-interp-link"><a href="' + t.link.href + '">' + t.link.rotulo + '</a></p>' +
      '</section>'
    );
  }

  // ---------- cartões (seção 5.1) ----------

  function cartao(rotulo, valor, pctTexto, apoio, tag) {
    return (
      '<li class="calc-card">' +
      '<p class="calc-card-label">' + rotulo + '</p>' +
      '<p class="calc-card-value">' + valor +
      (pctTexto ? ' <span class="calc-card-pct">(' + pctTexto + ')</span>' : '') +
      (tag ? ' <span class="calc-card-tag">' + tag + '</span>' : '') +
      '</p>' +
      (apoio ? '<p class="calc-card-help">' + apoio + '</p>' : '') +
      '</li>'
    );
  }

  function rotuloResultado(r) {
    if (r.status !== 'ok') return '';
    if (Math.abs(r.resultado) < 0.005) return 'Zero a zero';
    return r.resultado > 0 ? 'Lucro' : 'Prejuízo';
  }

  function htmlCartoes(r, faturamento) {
    var itens = [
      cartao(
        'Margem de contribuição',
        brl(r.mc),
        pct(r.mcPct),
        'O que sobra das vendas depois do CMV e dos custos que variam com a venda. Paga os custos fixos e o lucro.'
      ),
      cartao('Resultado do mês', brl(r.resultado), pct(r.resultadoPct), '', rotuloResultado(r))
    ];
    // Sem custos fixos informados (semFixos), o ponto de equilíbrio (R$ 0,00) não é mostrado.
    if (r.status === 'ok' && !r.semFixos) {
      itens.push(
        cartao(
          'Ponto de equilíbrio do mês',
          brl(r.pe),
          '',
          'Faturamento mensal em que o resultado é zero, com os mesmos custos e a mesma margem.'
        )
      );
      if (r.peDia !== null) {
        itens.push(
          cartao(
            'Ponto de equilíbrio por dia aberto',
            brl(r.peDia),
            '',
            'Média por dia aberto: o ponto de equilíbrio do mês dividido pelos dias informados.'
          )
        );
      }
      if (r.falta > 0) {
        itens.push(
          cartao(
            'Diferença para o faturamento atual',
            brl(r.falta),
            '',
            'Quanto o faturamento do mês precisaria subir, com os mesmos custos e a mesma margem, para o resultado ser zero.',
            'Faltam para o equilíbrio'
          )
        );
      } else {
        itens.push(
          cartao(
            'Diferença para o faturamento atual',
            brl(Math.max(0, faturamento - r.pe)),
            '',
            'Quanto o faturamento do mês está acima do ponto de equilíbrio: a folga antes de o resultado ficar negativo, se os custos e a margem forem os mesmos.',
            'Acima do equilíbrio'
          )
        );
      }
    }
    return '<ul class="calc-cards">' + itens.join('') + '</ul>';
  }

  // ---------- frase principal (seções 5.2 e 5.3) ----------

  function htmlFrasePrincipal(r) {
    if (r.status !== 'ok') return '';
    if (r.semFixos) return '<p class="calc-headline">' + MSG.semFixos + '</p>';
    if (r.peDia !== null) {
      return '<p class="calc-headline"><strong>Você precisa vender ' + brl(r.peDia) + ' por dia para empatar.</strong></p>';
    }
    return (
      '<p class="calc-headline"><strong>Você precisa vender ' + brl(r.pe) + ' por mês para empatar.</strong> ' +
      'Informe os dias abertos para ver quanto isso dá por dia.</p>'
    );
  }

  /*
   * Conteúdo da região aria-live para um resultado de GBSC_Calc.calcular.
   * faturamento: o número já convertido (usado só na subtração de exibição F - pe).
   */
  function htmlResultado(r, faturamento) {
    if (r.status === 'sem_faturamento') {
      return '<p class="calc-orient">' + MSG.semFaturamento + '</p><p class="calc-orient-convite">' + MSG.semFaturamentoConvite + '</p>';
    }
    return (
      '<h2 class="calc-result-title">Seu resultado</h2>' +
      htmlCartoes(r, faturamento) +
      htmlFrasePrincipal(r) +
      htmlInterpretacao(r, faturamento) +
      (r.prolaboreVazio ? '<p class="tool-alert calc-prolabore">' + MSG.prolabore + '</p>' : '')
    );
  }

  function htmlCorrija() {
    return '<p class="calc-orient">' + MSG.corrija + '</p>';
  }

  global.GBSC_CalcTextos = {
    MSG: MSG,
    brl: brl,
    pct: pct,
    validar: validar,
    htmlResultado: htmlResultado,
    htmlCorrija: htmlCorrija
  };
})(globalThis);
