/*
 * Lógica pura do autodiagnóstico (sem DOM, sem rede, sem armazenamento).
 * Script clássico: expõe globalThis.GBSC_Autodiag. Depende de GBSC_AutodiagTextos
 * (autodiagnostico-textos.js) apenas nas funções html*.
 *
 * A nota numérica por área existe só dentro deste arquivo, para decidir a faixa e a pior área.
 * Ela nunca sai das funções: nenhum retorno, texto, atributo, console ou URL a contém.
 * Fonte das regras: 11_mvp_site_captacao/conteudo/autodiagnostico.md (Revisão 2), seções 5, 7 e 10.
 */
(function (g) {
  'use strict';

  var WHATSAPP_BASE = 'https://wa.me/5512997710040?text=';
  var EMAIL = 'rafael.jacob@gastrobsc.com.br';
  var TOTAL_PERGUNTAS = 10;

  // Perguntas são numeradas de 1 a 10 (q1..q10), na ordem da página.
  var AREAS = [
    { id: 'financas', nome: 'Finanças e custos', perguntas: [1, 2, 3] },
    { id: 'cardapio', nome: 'Cardápio e vendas', perguntas: [4, 5] },
    { id: 'equipe', nome: 'Equipe e rotinas', perguntas: [6, 7, 8] },
    { id: 'gestao', nome: 'Gestão e tempo do dono', perguntas: [9, 10] }
  ];

  var FAIXAS = {
    atencao: { rotulo: 'Atenção', apoio: 'Aqui está o maior espaço para ganhar clareza.' },
    evolucao: { rotulo: 'Em evolução', apoio: 'Há uma base, e ainda falta firmar.' },
    organizado: { rotulo: 'Organizado', apoio: 'Esta área está sob controle; vale manter o hábito.' }
  };

  function notaInterna(pontos, maximo) {
    return Math.round(pontos * 100 / maximo);
  }

  function faixaDaNota(nota) {
    if (nota >= 70) return 'organizado';
    if (nota >= 40) return 'evolucao';
    return 'atencao';
  }

  function respostaValida(valor) {
    return valor === 0 || valor === 1 || valor === 2;
  }

  function esc(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /*
   * respostas: array de 10 números (0, 1 ou 2), na ordem q1..q10.
   * Sem as 10 respostas válidas: { ok: false, faltam: [números das perguntas] }.
   * Com elas: { ok: true, codigo, areas: [{ id, nome, faixa, rotulo, apoio }], pior: { id, nome, faixa }, todasOrganizado }.
   */
  function calcular(respostas) {
    var lista = Array.isArray(respostas) ? respostas : [];
    var faltam = [];
    var i;
    for (i = 0; i < TOTAL_PERGUNTAS; i += 1) {
      if (!respostaValida(lista[i])) faltam.push(i + 1);
    }
    if (faltam.length > 0 || lista.length !== TOTAL_PERGUNTAS) {
      return { ok: false, faltam: faltam };
    }

    var areas = [];
    var piorIndice = 0;
    var piorNota = Infinity;
    AREAS.forEach(function (area, indice) {
      var pontos = 0;
      area.perguntas.forEach(function (numero) {
        pontos += lista[numero - 1];
      });
      var nota = notaInterna(pontos, area.perguntas.length * 2);
      var faixa = faixaDaNota(nota);
      areas.push({
        id: area.id,
        nome: area.nome,
        faixa: faixa,
        rotulo: FAIXAS[faixa].rotulo,
        apoio: FAIXAS[faixa].apoio
      });
      // Menor nota vence; em empate vale a ordem das áreas (a primeira fica).
      if (nota < piorNota) {
        piorNota = nota;
        piorIndice = indice;
      }
    });

    var pior = areas[piorIndice];
    return {
      ok: true,
      codigo: lista.join('-'),
      areas: areas,
      pior: { id: pior.id, nome: pior.nome, faixa: pior.faixa },
      todasOrganizado: faixaDaNota(piorNota) === 'organizado'
    };
  }

  function mensagemWhatsApp(resultado) {
    var meio = resultado.todasOrganizado
      ? 'todas as áreas ficaram Organizado'
      : 'a área que mais pesou foi ' + resultado.pior.nome;
    return 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; ' + meio +
      '. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: ' + resultado.codigo;
  }

  function urlWhatsApp(resultado) {
    return WHATSAPP_BASE + encodeURIComponent(mensagemWhatsApp(resultado));
  }

  function textos() {
    return g.GBSC_AutodiagTextos;
  }

  function htmlResultado(resultado) {
    var t = textos();
    var itens = resultado.areas.map(function (area) {
      return '<li class="tool-area is-' + area.faixa + '">' +
        '<p class="tool-area-line"><span class="tool-area-name">' + esc(area.nome) + '</span>' +
        '<span class="tool-sr">: </span>' +
        '<span class="tool-badge is-' + area.faixa + '">' + esc(area.rotulo) + '</span>' +
        '<span class="tool-level is-' + area.faixa + '" aria-hidden="true">' +
        '<span class="tool-mark"></span><span class="tool-mark"></span><span class="tool-mark"></span></span></p>' +
        '<p class="tool-area-note">' + esc(area.apoio) + '</p></li>';
    }).join('');
    return '<section class="tool-block" aria-labelledby="autodiag-resultado-titulo">' +
      '<h2 id="autodiag-resultado-titulo">' + esc(t.tituloResultado) + '</h2>' +
      '<ul class="tool-areas">' + itens + '</ul>' +
      '<p class="tool-note">' + esc(t.avisoResultado) + '</p></section>';
  }

  function htmlDestaque(resultado) {
    var t = textos();
    var d = t.destaques[resultado.pior.id][resultado.pior.faixa];
    var r = t.rotulosDestaque;
    var titulo = (resultado.todasOrganizado ? t.tituloDestaqueOrganizado : t.tituloDestaque) + resultado.pior.nome;
    return '<section class="tool-block tool-highlight" aria-labelledby="autodiag-destaque-titulo">' +
      '<h2 id="autodiag-destaque-titulo">' + esc(titulo) + '</h2>' +
      '<dl class="tool-facts">' +
      '<div class="tool-fact"><dt>' + esc(r.acontece) + '</dt><dd>' + esc(d.acontece) + '</dd></div>' +
      '<div class="tool-fact"><dt>' + esc(r.passo) + '</dt><dd>' + esc(d.passo) + '</dd></div>' +
      '<div class="tool-fact"><dt>' + esc(r.ferramenta) + '</dt><dd><a href="' + esc(d.ferramenta.href) + '">' + esc(d.ferramenta.texto) + '</a></dd></div>' +
      '<div class="tool-fact"><dt>' + esc(r.conversa) + '</dt><dd>' + esc(d.conversa) + '</dd></div>' +
      '</dl></section>';
  }

  function textoCta(resultado) {
    var cta = textos().cta;
    if (resultado.todasOrganizado) return cta.textoOrganizado;
    return cta.frasePiorArea[resultado.pior.id] + ' ' + cta.textoBase;
  }

  function htmlCta(resultado) {
    var cta = textos().cta;
    var titulo = resultado.todasOrganizado ? cta.tituloOrganizado : cta.titulo;
    return '<div class="cta-box">' +
      '<h2 class="cta-title">' + esc(titulo) + '</h2>' +
      '<p class="cta-text">' + esc(textoCta(resultado)) + '</p>' +
      '<div class="cta-actions"><a class="button primary" href="' + esc(urlWhatsApp(resultado)) + '" target="_blank" rel="noopener noreferrer">' +
      esc(cta.botao) + ' <span aria-hidden="true">↗</span></a></div>' +
      '<p class="tool-cta-privacy">' + esc(cta.privacidade) + '</p>' +
      '<p class="cta-alt">ou escreva para <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></p></div>';
  }

  function htmlRefazer() {
    return '<p class="tool-restart"><button type="button" class="button tool-button-secondary" id="autodiag-refazer">' +
      esc(textos().refazer) + '</button></p>';
  }

  g.GBSC_Autodiag = {
    TOTAL_PERGUNTAS: TOTAL_PERGUNTAS,
    AREAS: AREAS,
    FAIXAS: FAIXAS,
    notaInterna: notaInterna, // uso interno e de teste; a interface nunca chama
    faixaDaNota: faixaDaNota,
    calcular: calcular,
    mensagemWhatsApp: mensagemWhatsApp,
    urlWhatsApp: urlWhatsApp,
    htmlResultado: htmlResultado,
    htmlDestaque: htmlDestaque,
    htmlCta: htmlCta,
    htmlRefazer: htmlRefazer
  };
})(globalThis);
