/*
 * Checklist de rotinas: marcações salvas neste navegador, contador do bloco de regularização,
 * botões Imprimir e Limpar marcações. Script clássico (sem módulos), com defer.
 * Sem rede, sem cookies. localStorage só dentro de try/catch: sem ele, a página segue funcionando
 * e as marcações valem até recarregar.
 * Funções puras expostas em globalThis.GBSC_Checklist (testadas em tests/checklist.test.mjs).
 */
(function () {
  'use strict';

  var CHAVE = 'gbsc-checklist-marcacoes-v1';
  var TOTAL_RG = 15;
  var LIMITE_BAIXO = 12;

  var TEXTO_BAIXO = 'Se você não soube responder vários itens deste bloco, vale conversar. É comum o dono descobrir aqui o que está faltando.';
  var TEXTO_ALTO = 'Boa parte está em ordem. Guarde os comprovantes à mão e revise os prazos com frequência. Se algum item ficou em dúvida, vale conversar.';
  var MENSAGEM_LIMPAR = 'Limpar todas as marcações deste checklist neste aparelho?';

  // Conta quantos ids do bloco estão entre os marcados. Ids fora do bloco são ignorados.
  function contarMarcados(idsDoBloco, idsMarcados) {
    var marcados = {};
    for (var i = 0; i < idsMarcados.length; i += 1) marcados[idsMarcados[i]] = true;
    var total = 0;
    for (var j = 0; j < idsDoBloco.length; j += 1) {
      if (marcados[idsDoBloco[j]] === true) total += 1;
    }
    return total;
  }

  // Mini-resultado do bloco de regularização: linha de contagem e um de dois textos. Sem nota, sem nível.
  function resultadoRg(marcados, total) {
    var n = total === undefined ? TOTAL_RG : total;
    return {
      linha: 'Você marcou ' + marcados + ' de ' + n + ' itens deste bloco.',
      texto: marcados <= LIMITE_BAIXO ? TEXTO_BAIXO : TEXTO_ALTO
    };
  }

  // Recebe a função de confirmação (window.confirm) e diz se pode limpar. Se ela falhar ou não existir, conta como confirmado.
  function podeLimpar(confirmar) {
    if (typeof confirmar !== 'function') return true;
    try {
      return !!confirmar(MENSAGEM_LIMPAR);
    } catch (erro) {
      return true;
    }
  }

  globalThis.GBSC_Checklist = {
    contarMarcados: contarMarcados,
    resultadoRg: resultadoRg,
    podeLimpar: podeLimpar,
    TOTAL_RG: TOTAL_RG,
    LIMITE_BAIXO: LIMITE_BAIXO,
    TEXTO_BAIXO: TEXTO_BAIXO,
    TEXTO_ALTO: TEXTO_ALTO,
    MENSAGEM_LIMPAR: MENSAGEM_LIMPAR,
    CHAVE: CHAVE
  };

  var doc = globalThis.document;
  if (!doc) return;

  var caixas = doc.querySelectorAll('input.ck-box');
  var caixasRg = doc.querySelectorAll('#bloco-rg input.ck-box');
  var contagemEl = doc.getElementById('rg-contagem');
  var textoEl = doc.getElementById('rg-texto');
  var ferramentas = doc.getElementById('ck-ferramentas');
  var botaoImprimir = doc.getElementById('ck-imprimir');
  var botaoLimpar = doc.getElementById('ck-limpar');

  if (!caixas.length || !contagemEl || !textoEl || !ferramentas || !botaoImprimir || !botaoLimpar) return;

  function idsDeLista(lista) {
    var ids = [];
    for (var i = 0; i < lista.length; i += 1) {
      if (lista[i].checked) ids.push(lista[i].id);
    }
    return ids;
  }

  function idsDaLista(lista) {
    var ids = [];
    for (var i = 0; i < lista.length; i += 1) ids.push(lista[i].id);
    return ids;
  }

  function lerMarcacoes() {
    try {
      var bruto = globalThis.localStorage.getItem(CHAVE);
      var lista = bruto ? JSON.parse(bruto) : [];
      if (!Array.isArray(lista)) return [];
      return lista.filter(function (id) { return typeof id === 'string'; });
    } catch (erro) {
      return [];
    }
  }

  function gravarMarcacoes(ids) {
    try {
      globalThis.localStorage.setItem(CHAVE, JSON.stringify(ids));
    } catch (erro) {
      // Storage indisponível (navegação privada, dados bloqueados): a página segue sem salvar.
    }
  }

  function apagarMarcacoes() {
    try {
      globalThis.localStorage.removeItem(CHAVE);
    } catch (erro) {
      // Sem storage não há o que apagar.
    }
  }

  function atualizarRg() {
    var marcados = contarMarcados(idsDaLista(caixasRg), idsDeLista(caixas));
    var resultado = resultadoRg(marcados, caixasRg.length);
    contagemEl.textContent = resultado.linha;
    textoEl.textContent = resultado.texto;
  }

  function aplicarMarcacoes(ids) {
    for (var i = 0; i < caixas.length; i += 1) {
      caixas[i].checked = ids.indexOf(caixas[i].id) !== -1;
    }
  }

  function restaurar() {
    aplicarMarcacoes(lerMarcacoes());
    atualizarRg();
  }

  doc.addEventListener('change', function (evento) {
    var alvo = evento.target;
    if (!alvo || !alvo.classList || !alvo.classList.contains('ck-box')) return;
    gravarMarcacoes(idsDeLista(caixas));
    atualizarRg();
  });

  botaoLimpar.addEventListener('click', function () {
    // Sem confirm disponível, a chamada lança erro e podeLimpar trata como confirmado.
    if (!podeLimpar(function (mensagem) { return globalThis.confirm(mensagem); })) return;
    for (var i = 0; i < caixas.length; i += 1) caixas[i].checked = false;
    apagarMarcacoes();
    atualizarRg();
  });

  botaoImprimir.addEventListener('click', function () {
    globalThis.print();
  });

  // Navegadores podem restaurar o estado dos campos ao recarregar ou voltar; a fonte da verdade é o storage.
  globalThis.addEventListener('pageshow', restaurar);
  restaurar();
  ferramentas.hidden = false;
})();
