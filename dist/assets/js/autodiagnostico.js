/*
 * Interface do autodiagnóstico: lê os radios, chama GBSC_Autodiag e mostra o resultado.
 * Script clássico (sem módulos). Sem rede, sem cookies, sem localStorage, sem console.
 * As respostas existem só na memória da página; nada é enviado a menos que o visitante
 * clique no botão do WhatsApp (o link é montado em autodiagnostico-calc.js).
 */
(function (doc) {
  'use strict';

  var api = globalThis.GBSC_Autodiag;
  var raiz = doc.getElementById('autodiag');
  var resultadoEl = doc.getElementById('resultado');
  var avisoEl = doc.getElementById('autodiag-aviso');
  var acoesEl = doc.getElementById('autodiag-acoes');
  var botaoVer = doc.getElementById('autodiag-ver');
  var textos = globalThis.GBSC_AutodiagTextos;

  if (!api || !raiz || !resultadoEl || !avisoEl || !acoesEl || !botaoVer || !textos) return;

  var total = api.TOTAL_PERGUNTAS;

  function radios(numero) {
    return raiz.querySelectorAll('input[name="q' + numero + '"]');
  }

  function lerRespostas() {
    var respostas = [];
    for (var numero = 1; numero <= total; numero += 1) {
      var marcado = raiz.querySelector('input[name="q' + numero + '"]:checked');
      respostas.push(marcado ? Number(marcado.value) : null);
    }
    return respostas;
  }

  function perguntaEl(numero) {
    return doc.getElementById('pergunta-q' + numero);
  }

  function marcarFaltando(numero, faltando) {
    var el = perguntaEl(numero);
    var dica = doc.getElementById('aviso-q' + numero);
    if (el) el.classList.toggle('is-missing', faltando);
    if (dica) dica.hidden = !faltando;
  }

  function limparFaltando() {
    for (var numero = 1; numero <= total; numero += 1) marcarFaltando(numero, false);
    avisoEl.hidden = true;
    avisoEl.textContent = '';
  }

  function limparResultado() {
    resultadoEl.textContent = '';
  }

  function listaFaltantes(faltam) {
    if (faltam.length === 1) return 'Pergunta sem resposta: ' + faltam[0] + '.';
    return 'Perguntas sem resposta: ' + faltam.join(', ') + '.';
  }

  function mostrarAviso(faltam) {
    limparResultado();
    for (var numero = 1; numero <= total; numero += 1) {
      marcarFaltando(numero, faltam.indexOf(numero) !== -1);
    }
    avisoEl.textContent = textos.faltamRespostas + ' ' + listaFaltantes(faltam);
    avisoEl.hidden = false;
    var primeiro = radios(faltam[0])[0];
    if (primeiro) primeiro.focus();
  }

  function mostrarResultado(resultado) {
    limparFaltando();
    resultadoEl.innerHTML = api.htmlResultado(resultado) +
      api.htmlDestaque(resultado) +
      api.htmlCta(resultado) +
      api.htmlRefazer();
    // O contêiner tem tabindex fixo no HTML estático (sem número no conteúdo do resultado).
    resultadoEl.focus({ preventScroll: true });
    resultadoEl.scrollIntoView();
  }

  function aoVerResultado() {
    var resultado = api.calcular(lerRespostas());
    if (!resultado.ok) {
      mostrarAviso(resultado.faltam);
      return;
    }
    mostrarResultado(resultado);
  }

  function zerarRespostas() {
    var todos = raiz.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < todos.length; i += 1) todos[i].checked = false;
  }

  function refazer() {
    zerarRespostas();
    limparFaltando();
    limparResultado();
    var primeiro = radios(1)[0];
    var etapa = doc.getElementById('perguntas');
    if (etapa) etapa.scrollIntoView();
    if (primeiro) primeiro.focus();
  }

  raiz.addEventListener('change', function (evento) {
    var alvo = evento.target;
    if (!alvo || alvo.type !== 'radio') return;
    // Mudou uma resposta: o resultado mostrado deixa de valer e some.
    if (resultadoEl.firstChild) limparResultado();
    var numero = Number(String(alvo.name).slice(1));
    marcarFaltando(numero, false);
    if (!avisoEl.hidden) {
      // Atualiza a lista de perguntas que ainda faltam; some quando todas foram respondidas.
      var estado = api.calcular(lerRespostas());
      if (estado.ok) {
        avisoEl.hidden = true;
        avisoEl.textContent = '';
      } else {
        avisoEl.textContent = textos.faltamRespostas + ' ' + listaFaltantes(estado.faltam);
      }
    }
  });

  botaoVer.addEventListener('click', aoVerResultado);

  resultadoEl.addEventListener('click', function (evento) {
    var alvo = evento.target;
    if (alvo && alvo.closest && alvo.closest('#autodiag-refazer')) refazer();
  });

  // Navegadores podem restaurar radios marcados ao recarregar ou voltar na página.
  // A página promete que as respostas se perdem nesses casos, então zera.
  zerarRespostas();
  globalThis.addEventListener('pageshow', function (evento) {
    if (evento.persisted) {
      zerarRespostas();
      limparFaltando();
      limparResultado();
    }
  });

  acoesEl.hidden = false;
})(document);
