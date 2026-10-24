/*
 * Interface da calculadora: lê os campos, valida, chama GBSC_Calc e mostra o resultado.
 * Script clássico (sem módulos). Sem rede, sem cookies, sem localStorage e sem console.
 * Nada digitado sai da página nem fica guardado. O WhatsApp é um link estático no HTML,
 * sem nenhum número, resultado ou situação na mensagem.
 */
(function (doc) {
  'use strict';

  var calc = globalThis.GBSC_Calc;
  var textos = globalThis.GBSC_CalcTextos;
  var raiz = doc.getElementById('calculadora');
  var resultadoEl = doc.getElementById('resultado');
  var acoesEl = doc.getElementById('calc-acoes');
  var botaoCalcular = doc.getElementById('calc-calcular');
  var botaoLimpar = doc.getElementById('calc-limpar');

  if (!calc || !textos || !raiz || !resultadoEl || !acoesEl || !botaoCalcular || !botaoLimpar) return;

  var IDS = ['faturamento', 'cmv', 'aluguel', 'folha', 'contas', 'prolabore', 'outrosFixos', 'taxas', 'embalagens', 'impostos', 'dias'];
  var ESPERA_DIGITACAO = 400;
  var temporizador = null;
  // Só depois do primeiro "Calcular" (clique ou Enter) a página recalcula ao digitar ou sair do campo.
  var calculouUmaVez = false;

  function campo(id) {
    return doc.getElementById(id);
  }

  function modoCmv() {
    var marcado = raiz.querySelector('input[name="cmvModo"]:checked');
    return marcado && marcado.value === 'percentual' ? 'percentual' : 'valor';
  }

  function lerTextos() {
    var lidos = {};
    for (var i = 0; i < IDS.length; i += 1) lidos[IDS[i]] = campo(IDS[i]).value;
    return lidos;
  }

  function mostrarErros(erros) {
    var primeiro = null;
    for (var i = 0; i < IDS.length; i += 1) {
      var id = IDS[i];
      var entrada = campo(id);
      var aviso = doc.getElementById('erro-' + id);
      var mensagem = erros[id];
      if (mensagem) {
        entrada.setAttribute('aria-invalid', 'true');
        aviso.textContent = mensagem;
        aviso.hidden = false;
        if (!primeiro) primeiro = entrada;
      } else {
        entrada.removeAttribute('aria-invalid');
        aviso.textContent = '';
        aviso.hidden = true;
      }
    }
    return primeiro;
  }

  function atualizar(rolar) {
    if (temporizador !== null) {
      globalThis.clearTimeout(temporizador);
      temporizador = null;
    }
    var modo = modoCmv();
    var lido = textos.validar(lerTextos(), modo);
    var primeiroComErro = mostrarErros(lido.erros);
    if (!lido.ok) {
      resultadoEl.innerHTML = textos.htmlCorrija();
      if (rolar && primeiroComErro) primeiroComErro.focus();
      return;
    }
    var v = lido.valores;
    var entrada = {
      faturamento: v.faturamento,
      cmvModo: modo,
      cmv: v.cmv,
      aluguel: v.aluguel,
      folha: v.folha,
      contas: v.contas,
      prolabore: v.prolabore,
      outrosFixos: v.outrosFixos,
      taxas: v.taxas,
      embalagens: v.embalagens,
      impostos: v.impostos,
      dias: v.dias
    };
    resultadoEl.innerHTML = textos.htmlResultado(calc.calcular(entrada), entrada.faturamento);
    if (rolar) resultadoEl.scrollIntoView();
  }

  function agendar() {
    if (!calculouUmaVez) return;
    if (temporizador !== null) globalThis.clearTimeout(temporizador);
    temporizador = globalThis.setTimeout(function () {
      atualizar(false);
    }, ESPERA_DIGITACAO);
  }

  function ajustarModo() {
    var percentual = modoCmv() === 'percentual';
    doc.getElementById('cmv-rotulo').textContent = percentual ? 'CMV do mês (% do faturamento)' : 'CMV do mês (R$)';
    doc.getElementById('cmv-unidade-reais').hidden = percentual;
    doc.getElementById('cmv-unidade-pct').hidden = !percentual;
    doc.getElementById('cmv-leitor').textContent = percentual ? ' (em % do faturamento)' : ' (em reais)';
  }

  function aoMudarModo() {
    // O valor digitado em R$ não serve como percentual (e o contrário): esvazia o campo.
    campo('cmv').value = '';
    ajustarModo();
    if (calculouUmaVez) atualizar(false);
    else mostrarErros({});
  }

  function limpar() {
    if (temporizador !== null) {
      globalThis.clearTimeout(temporizador);
      temporizador = null;
    }
    for (var i = 0; i < IDS.length; i += 1) campo(IDS[i]).value = '';
    var padrao = doc.getElementById('cmv-modo-valor');
    if (padrao) padrao.checked = true;
    ajustarModo();
    mostrarErros({});
    resultadoEl.textContent = '';
    calculouUmaVez = false;
    campo('faturamento').focus();
  }

  raiz.addEventListener('input', function (evento) {
    var alvo = evento.target;
    if (alvo && alvo.type === 'text') agendar();
  });

  raiz.addEventListener('change', function (evento) {
    var alvo = evento.target;
    if (!alvo) return;
    if (alvo.name === 'cmvModo') aoMudarModo();
    else if (alvo.type === 'text' && calculouUmaVez) atualizar(false);
  });

  raiz.addEventListener('keydown', function (evento) {
    var alvo = evento.target;
    if (evento.key === 'Enter' && alvo && alvo.type === 'text') {
      evento.preventDefault();
      calculouUmaVez = true;
      atualizar(true);
    }
  });

  botaoCalcular.addEventListener('click', function () {
    calculouUmaVez = true;
    atualizar(true);
  });
  botaoLimpar.addEventListener('click', limpar);

  // Navegadores podem restaurar o que foi digitado ao recarregar ou voltar na página.
  // A página promete que nada fica guardado, então começa sempre vazia.
  function zerar() {
    for (var i = 0; i < IDS.length; i += 1) campo(IDS[i]).value = '';
    var padrao = doc.getElementById('cmv-modo-valor');
    if (padrao) padrao.checked = true;
    ajustarModo();
    mostrarErros({});
    resultadoEl.textContent = '';
    calculouUmaVez = false;
    if (temporizador !== null) {
      globalThis.clearTimeout(temporizador);
      temporizador = null;
    }
  }
  zerar();
  globalThis.addEventListener('pageshow', function (evento) {
    if (evento.persisted) zerar();
  });

  acoesEl.hidden = false;
})(document);
