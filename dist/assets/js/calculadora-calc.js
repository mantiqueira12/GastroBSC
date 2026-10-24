/*
 * Lógica pura da calculadora "Meu restaurante dá lucro?".
 * Especificação: 11_mvp_site_captacao/conteudo/calculadora.md (seções 4 e 10).
 * Script clássico (sem módulos): expõe globalThis.GBSC_Calc = { parseNumeroBR, calcular }.
 * Sem DOM, sem rede, sem cookies, sem armazenamento. Calcula com a precisão total;
 * quem exibe é que arredonda.
 */
(function (global) {
  'use strict';

  function invalido() {
    return { ok: false, vazio: false, valor: NaN };
  }

  /*
   * Converte texto no formato brasileiro em número.
   * Devolve { ok, vazio, valor }. Campo vazio vale 0 e nunca é erro.
   * A faixa (mínimo, máximo, inteiro) é validada fora daqui.
   */
  function parseNumeroBR(texto) {
    var s = texto === null || texto === undefined ? '' : String(texto);
    s = s.replace(/R\$/gi, '').replace(/%/g, '').replace(/[\s ]/g, '');
    if (s === '') return { ok: true, vazio: true, valor: 0 };
    if (!/^[0-9.,]+$/.test(s)) return invalido();

    var inteiro;
    var fracao = '';
    if (s.indexOf(',') !== -1) {
      var partes = s.split(',');
      if (partes.length !== 2) return invalido();
      inteiro = partes[0];
      fracao = partes[1];
      if (!/^(\d{1,3}(\.\d{3})+|\d*)$/.test(inteiro)) return invalido();
      if (!/^\d*$/.test(fracao)) return invalido();
      if (inteiro === '' && fracao === '') return invalido();
      inteiro = inteiro.replace(/\./g, '');
    } else if (/^\d+$/.test(s)) {
      inteiro = s;
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s) && s.indexOf('0.') !== 0) {
      inteiro = s.replace(/\./g, '');
    } else if (/^\d+\.\d+$/.test(s)) {
      var decimais = s.split('.');
      inteiro = decimais[0];
      fracao = decimais[1];
    } else {
      return invalido();
    }

    var valor = Number((inteiro || '0') + (fracao ? '.' + fracao : ''));
    if (!isFinite(valor)) return invalido();
    return { ok: true, vazio: false, valor: valor };
  }

  function numero(x) {
    var n = Number(x);
    return isFinite(n) ? n : 0;
  }

  /*
   * entrada: { faturamento, cmvModo: 'valor' | 'percentual', cmv,
   *            aluguel, folha, contas, prolabore, outrosFixos,
   *            taxas, embalagens, impostos, dias }  (números já convertidos)
   */
  function calcular(entrada) {
    var e = entrada || {};
    var F = numero(e.faturamento);
    if (!(F > 0)) return { status: 'sem_faturamento' };

    var c = numero(e.cmv);
    var cmvValor = e.cmvModo === 'percentual' ? (F * c) / 100 : c;
    var pVar = numero(e.taxas) + numero(e.embalagens) + numero(e.impostos);
    var variaveisValor = (F * pVar) / 100;
    var mc = F - cmvValor - variaveisValor;
    var prolabore = numero(e.prolabore);
    var fixos = numero(e.aluguel) + numero(e.folha) + numero(e.contas) + prolabore + numero(e.outrosFixos);
    var resultado = mc - fixos;

    var saida = {
      status: 'ok',
      cmvValor: cmvValor,
      cmvPct: (cmvValor / F) * 100,
      variaveisValor: variaveisValor,
      mc: mc,
      mcPct: (mc / F) * 100,
      fixos: fixos,
      resultado: resultado,
      resultadoPct: (resultado / F) * 100,
      situacao: null,
      prolaboreVazio: prolabore === 0
    };

    if (!(mc > 0)) {
      saida.status = 'margem_nao_positiva';
      return saida;
    }

    var dias = numero(e.dias);
    var pe = (fixos * F) / mc;
    saida.situacao = Math.abs(resultado) <= 0.05 * F + 0.005 ? 'empate' : resultado < 0 ? 'prejuizo' : 'lucro';
    saida.pe = pe;
    saida.falta = pe > F ? pe - F : 0;
    saida.peDia = dias > 0 ? pe / dias : null;
    saida.semFixos = fixos === 0;
    return saida;
  }

  global.GBSC_Calc = { parseNumeroBR: parseNumeroBR, calcular: calcular };
})(globalThis);
