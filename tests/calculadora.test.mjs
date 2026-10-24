import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Rodar com: node --test   (em 08_site_landing/github_site_v1/; no Node 24, "node --test tests/" não funciona)
// Os scripts do site são clássicos (sem export). Aqui eles rodam num contexto isolado com node:vm.
// Casos e números: 11_mvp_site_captacao/conteudo/calculadora.md (seções 9 e 10).

const dist = new URL('../dist/', import.meta.url);
const lerDist = (caminho) => fs.readFileSync(fileURLToPath(new URL(caminho, dist)), 'utf8');

// Código sem comentários: os comentários dos arquivos citam as proibições ("sem localStorage") de propósito.
const semComentarios = (codigo) => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const ARQUIVOS_JS = ['assets/js/calculadora-calc.js', 'assets/js/calculadora-textos.js', 'assets/js/calculadora.js'];

const contexto = {};
vm.createContext(contexto);
vm.runInContext(lerDist(ARQUIVOS_JS[0]), contexto, { filename: ARQUIVOS_JS[0] });
const Calc = contexto.GBSC_Calc;
vm.runInContext(lerDist(ARQUIVOS_JS[1]), contexto, { filename: ARQUIVOS_JS[1] });
const T = contexto.GBSC_CalcTextos;

// Objetos criados dentro do vm têm protótipos de outro realm: normaliza antes de comparar.
const plano = (valor) => JSON.parse(JSON.stringify(valor));
// O Intl põe espaço sem quebra entre "R$" e o número; os testes normalizam para espaço comum.
const norm = (texto) => String(texto).replace(/[  ]/g, ' ');
const brl = (n) => norm(T.brl(n));
const pct = (n) => norm(T.pct(n));
const semTags = (html) => norm(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

const VAZIO = {
  faturamento: '', cmv: '', aluguel: '', folha: '', contas: '', prolabore: '', outrosFixos: '',
  taxas: '', embalagens: '', impostos: '', dias: ''
};

// Roda o caminho completo da página: texto digitado -> validação -> cálculo -> HTML do resultado.
function rodar(digitado, modo = 'valor') {
  const textos = { ...VAZIO, ...digitado };
  const lido = T.validar(textos, modo);
  assert.equal(lido.ok, true, 'campos devem ser válidos: ' + JSON.stringify(plano(lido.erros)));
  const v = lido.valores;
  const entrada = {
    faturamento: v.faturamento, cmvModo: modo, cmv: v.cmv, aluguel: v.aluguel, folha: v.folha,
    contas: v.contas, prolabore: v.prolabore, outrosFixos: v.outrosFixos,
    taxas: v.taxas, embalagens: v.embalagens, impostos: v.impostos, dias: v.dias
  };
  const r = plano(Calc.calcular(entrada));
  const html = T.htmlResultado(r, entrada.faturamento);
  return { r, html, texto: semTags(html), entrada };
}

// ---------- conversor de número brasileiro (30 entradas da seção 10) ----------

const TABELA_CONVERSOR = [
  ['12.500,00', 12500], ['12500,5', 12500.5], ['12500', 12500], ['12.500', 12500], ['12500.5', 12500.5],
  ['0,5', 0.5], [',5', 0.5], ['5,', 5], ['R$ 1.234,56', 1234.56], ['30%', 30], ['7,5 %', 7.5],
  ['0.500', 0.5], ['1.234.567,89', 1234567.89], ['1.234.567', 1234567], ['12.5', 12.5], ['0', 0],
  ['', 'vazio'], ['   ', 'vazio'], [null, 'vazio'], [undefined, 'vazio'],
  ['-5', 'invalido'], ['abc', 'invalido'], ['1,2,3', 'invalido'], ['1.2.3', 'invalido'], ['1.23.456', 'invalido'],
  ['1,234.56', 'invalido'], [',', 'invalido'], ['12a', 'invalido'], ['1e3', 'invalido'], ['+5', 'invalido']
];

test('o módulo expõe GBSC_Calc = { parseNumeroBR, calcular } e nada mais', () => {
  assert.deepEqual(Object.keys(Calc).sort(), ['calcular', 'parseNumeroBR']);
  assert.equal(typeof Calc.parseNumeroBR, 'function');
  assert.equal(typeof Calc.calcular, 'function');
});

test('conversor: tabela de 30 entradas', () => {
  assert.equal(TABELA_CONVERSOR.length, 30);
  for (const [entrada, esperado] of TABELA_CONVERSOR) {
    const r = plano(Calc.parseNumeroBR(entrada));
    const rotulo = JSON.stringify(entrada) + ' -> ' + JSON.stringify(r);
    if (esperado === 'vazio') {
      assert.deepEqual(r, { ok: true, vazio: true, valor: 0 }, rotulo);
    } else if (esperado === 'invalido') {
      assert.equal(r.ok, false, rotulo);
      assert.equal(r.vazio, false, rotulo);
    } else {
      assert.equal(r.ok, true, rotulo);
      assert.equal(r.vazio, false, rotulo);
      assert.ok(Math.abs(r.valor - esperado) < 1e-9, rotulo);
    }
  }
});

test('conversor: espaço sem quebra, R$ e % são ignorados; número muito grande é inválido', () => {
  assert.equal(Calc.parseNumeroBR('R$ 1.234,56').valor, 1234.56);
  assert.equal(Calc.parseNumeroBR('  12,5 % ').valor, 12.5);
  assert.equal(Calc.parseNumeroBR('9'.repeat(400)).ok, false);
});

// ---------- os 5 casos principais (seção 9.0) ----------

test('Caso 1: lucro, CMV em R$, dias informados', () => {
  const { r, texto, entrada } = rodar({
    faturamento: '100.000,00', cmv: '32.000,00', aluguel: '8.000,00', folha: '28.000,00', contas: '3.000,00',
    prolabore: '6.000,00', outrosFixos: '2.000,00', taxas: '4', embalagens: '2', impostos: '6', dias: '26'
  });
  assert.equal(r.status, 'ok');
  assert.equal(pct(r.cmvPct), '32,00%');
  assert.equal(brl(r.variaveisValor), 'R$ 12.000,00');
  assert.equal(brl(r.mc), 'R$ 56.000,00');
  assert.equal(pct(r.mcPct), '56,00%');
  assert.equal(brl(r.fixos), 'R$ 47.000,00');
  assert.equal(brl(r.resultado), 'R$ 9.000,00');
  assert.equal(pct(r.resultadoPct), '9,00%');
  assert.equal(r.situacao, 'lucro');
  assert.equal(brl(r.pe), 'R$ 83.928,57');
  assert.equal(brl(r.peDia), 'R$ 3.228,02');
  assert.equal(brl(r.falta), 'R$ 0,00');
  assert.equal(r.semFixos, false);
  assert.equal(r.prolaboreVazio, false);
  assert.ok(texto.includes('Você precisa vender R$ 3.228,02 por dia para empatar.'));
  assert.ok(texto.includes('Acima do equilíbrio'));
  assert.equal(brl(entrada.faturamento - r.pe), 'R$ 16.071,43');
  assert.ok(texto.includes('R$ 16.071,43'));
  assert.ok(texto.includes('O mês fechou com lucro'));
  assert.ok(texto.includes('o faturamento do mês está R$ 16.071,43 acima dele'));
  assert.ok(!texto.includes('pró-labore em branco'));
});

test('Caso 2: prejuízo, CMV em %, dias informados', () => {
  const { r, texto } = rodar({
    faturamento: '60.000,00', cmv: '35', aluguel: '6.000,00', folha: '24.000,00', contas: '2.500,00',
    prolabore: '5.000,00', outrosFixos: '1.500,00', taxas: '5', embalagens: '3', impostos: '4', dias: '25'
  }, 'percentual');
  assert.equal(r.status, 'ok');
  assert.equal(brl(r.cmvValor), 'R$ 21.000,00');
  assert.equal(pct(r.cmvPct), '35,00%');
  assert.equal(brl(r.variaveisValor), 'R$ 7.200,00');
  assert.equal(brl(r.mc), 'R$ 31.800,00');
  assert.equal(pct(r.mcPct), '53,00%');
  assert.equal(brl(r.fixos), 'R$ 39.000,00');
  assert.equal(brl(r.resultado), '-R$ 7.200,00');
  assert.equal(pct(r.resultadoPct), '-12,00%');
  assert.equal(r.situacao, 'prejuizo');
  assert.equal(brl(r.pe), 'R$ 73.584,91');
  assert.equal(brl(r.peDia), 'R$ 2.943,40');
  assert.equal(brl(r.falta), 'R$ 13.584,91');
  assert.ok(texto.includes('Você precisa vender R$ 2.943,40 por dia para empatar.'));
  assert.ok(texto.includes('Faltam para o equilíbrio'));
  assert.ok(texto.includes('R$ 13.584,91'));
  assert.ok(texto.includes('O mês fechou no prejuízo'));
  assert.ok(texto.includes('Faltaram R$ 13.584,91 de faturamento para empatar.'));
});

test('Caso 3: perto do equilíbrio (3,75%)', () => {
  const { r, texto, entrada } = rodar({
    faturamento: '80.000,00', cmv: '28.000,00', aluguel: '7.000,00', folha: '26.000,00', contas: '2.000,00',
    prolabore: '5.000,00', outrosFixos: '1.000,00', taxas: '4', embalagens: '2', impostos: '4', dias: '28'
  });
  assert.equal(pct(r.cmvPct), '35,00%');
  assert.equal(brl(r.variaveisValor), 'R$ 8.000,00');
  assert.equal(brl(r.mc), 'R$ 44.000,00');
  assert.equal(pct(r.mcPct), '55,00%');
  assert.equal(brl(r.fixos), 'R$ 41.000,00');
  assert.equal(brl(r.resultado), 'R$ 3.000,00');
  assert.equal(pct(r.resultadoPct), '3,75%');
  assert.equal(r.situacao, 'empate');
  assert.equal(brl(r.pe), 'R$ 74.545,45');
  assert.equal(brl(r.peDia), 'R$ 2.662,34');
  assert.equal(brl(r.falta), 'R$ 0,00');
  assert.equal(brl(entrada.faturamento - r.pe), 'R$ 5.454,55');
  assert.ok(texto.includes('Você está perto do equilíbrio'));
  assert.ok(texto.includes('R$ 5.454,55'));
});

test('Caso 4: margem de contribuição negativa (sem ponto de equilíbrio)', () => {
  const { r, texto, html } = rodar({
    faturamento: '40.000,00', cmv: '32.000,00', aluguel: '5.000,00', folha: '15.000,00', contas: '1.500,00',
    prolabore: '3.000,00', outrosFixos: '500,00', taxas: '10', embalagens: '5', impostos: '8', dias: '24'
  });
  assert.equal(r.status, 'margem_nao_positiva');
  assert.equal(pct(r.cmvPct), '80,00%');
  assert.equal(brl(r.variaveisValor), 'R$ 9.200,00');
  assert.equal(brl(r.mc), '-R$ 1.200,00');
  assert.equal(pct(r.mcPct), '-3,00%');
  assert.equal(brl(r.fixos), 'R$ 25.000,00');
  assert.equal(brl(r.resultado), '-R$ 26.200,00');
  assert.equal(pct(r.resultadoPct), '-65,50%');
  assert.equal(r.situacao, null);
  for (const nome of ['pe', 'peDia', 'falta', 'semFixos']) assert.ok(!(nome in r), nome + ' não deve existir');
  assert.ok(texto.includes('Com esses números, cada venda dá prejuízo antes dos custos fixos.'));
  assert.ok(texto.includes('O resultado do mês foi -R$ 26.200,00.'));
  for (const proibido of ['Ponto de equilíbrio', 'Você precisa vender', 'Faltam para', 'Acima do equilíbrio', 'por dia', 'perto do equilíbrio']) {
    assert.ok(!texto.includes(proibido), 'não pode aparecer: ' + proibido);
  }
  // Sem classificação nem rótulo auxiliar de lucro/prejuízo nos cartões.
  assert.ok(!html.includes('calc-card-tag'));
  assert.ok(!texto.includes('O mês fechou'));
});

test('Caso 5: campos vazios contam como 0, CMV em %, dias vazio', () => {
  const { r, texto } = rodar({
    faturamento: '50.000,00', cmv: '30', aluguel: '4.000,00', folha: '12.000,00', taxas: '3'
  }, 'percentual');
  assert.equal(r.status, 'ok');
  assert.equal(brl(r.cmvValor), 'R$ 15.000,00');
  assert.equal(pct(r.cmvPct), '30,00%');
  assert.equal(brl(r.variaveisValor), 'R$ 1.500,00');
  assert.equal(brl(r.mc), 'R$ 33.500,00');
  assert.equal(pct(r.mcPct), '67,00%');
  assert.equal(brl(r.fixos), 'R$ 16.000,00');
  assert.equal(brl(r.resultado), 'R$ 17.500,00');
  assert.equal(pct(r.resultadoPct), '35,00%');
  assert.equal(r.situacao, 'lucro');
  assert.equal(brl(r.pe), 'R$ 23.880,60');
  assert.equal(r.peDia, null);
  assert.equal(r.prolaboreVazio, true);
  assert.ok(texto.includes('Você precisa vender R$ 23.880,60 por mês para empatar. Informe os dias abertos para ver quanto isso dá por dia.'));
  assert.ok(!texto.includes('Ponto de equilíbrio por dia aberto'));
  assert.ok(texto.includes('Você deixou o pró-labore em branco. Se você retira dinheiro da empresa para viver, inclua esse valor: sem ele, o resultado parece melhor do que é.'));
  assert.ok(texto.includes('R$ 26.119,40'));
});

// ---------- os 7 casos de borda (seção 9.1) ----------

test('B1: faturamento 0 não calcula nada e convida à conversa', () => {
  const { r, texto, html } = rodar({ faturamento: '0', cmv: '1.000,00', aluguel: '5.000,00', dias: '20' });
  assert.deepEqual(r, { status: 'sem_faturamento' });
  assert.ok(texto.startsWith('Informe o faturamento do mês para ver o resultado.'));
  assert.ok(texto.includes('Na conversa de diagnóstico gratuita (30 min, online), eu ajudo você a levantar os números do seu mês.'));
  assert.ok(!html.includes('calc-card'));
  assert.ok(!/lucro|prejuízo/i.test(texto));
  assert.ok(!texto.includes('R$'));
});

test('B1b: tudo vazio e CMV em % também dão sem_faturamento', () => {
  assert.equal(rodar({}).r.status, 'sem_faturamento');
  assert.equal(rodar({ cmv: '30', aluguel: '1.000' }, 'percentual').r.status, 'sem_faturamento');
});

test('B2: margem de contribuição exatamente 0', () => {
  const { r, texto } = rodar({ faturamento: '10.000,00', cmv: '60', taxas: '40', aluguel: '1.000,00' }, 'percentual');
  assert.equal(r.status, 'margem_nao_positiva');
  assert.equal(brl(r.mc), 'R$ 0,00');
  assert.equal(pct(r.mcPct), '0,00%');
  assert.equal(brl(r.resultado), '-R$ 1.000,00');
  assert.equal(pct(r.resultadoPct), '-10,00%');
  assert.ok(!('pe' in r));
  assert.ok(texto.includes('Cada venda dá prejuízo antes dos custos fixos'));
});

test('B3: resultado exatamente +5% é empate; B4: exatamente -5% é empate; B5: -5,01% é prejuízo', () => {
  const b3 = rodar({ faturamento: '10.000,00', cmv: '40', aluguel: '5.500,00', dias: '20' }, 'percentual').r;
  assert.equal(brl(b3.mc), 'R$ 6.000,00');
  assert.equal(brl(b3.resultado), 'R$ 500,00');
  assert.equal(pct(b3.resultadoPct), '5,00%');
  assert.equal(b3.situacao, 'empate');
  assert.equal(brl(b3.pe), 'R$ 9.166,67');
  assert.equal(brl(b3.peDia), 'R$ 458,33');

  const b4 = rodar({ faturamento: '10.000,00', cmv: '40', aluguel: '6.500,00' }, 'percentual').r;
  assert.equal(brl(b4.resultado), '-R$ 500,00');
  assert.equal(pct(b4.resultadoPct), '-5,00%');
  assert.equal(b4.situacao, 'empate');
  assert.equal(brl(b4.pe), 'R$ 10.833,33');
  assert.equal(brl(b4.falta), 'R$ 833,33');

  const b5 = rodar({ faturamento: '10.000,00', cmv: '40', aluguel: '6.501,00' }, 'percentual').r;
  assert.equal(brl(b5.resultado), '-R$ 501,00');
  assert.equal(pct(b5.resultadoPct), '-5,01%');
  assert.equal(b5.situacao, 'prejuizo');
  assert.equal(brl(b5.pe), 'R$ 10.835,00');
});

test('B6: sem custos fixos não mostra "Você precisa vender" e mostra a mensagem de custos fixos', () => {
  const { r, texto, html } = rodar({ faturamento: '20.000,00', cmv: '6.000,00', taxas: '5' });
  assert.equal(r.status, 'ok');
  assert.equal(brl(r.mc), 'R$ 13.000,00');
  assert.equal(pct(r.mcPct), '65,00%');
  assert.equal(brl(r.resultado), 'R$ 13.000,00');
  assert.equal(r.semFixos, true);
  assert.equal(brl(r.pe), 'R$ 0,00');
  assert.ok(!texto.includes('Você precisa vender'));
  assert.ok(texto.includes('Você não informou custos fixos. Preencha aluguel, folha, contas, pró-labore e outros para calcular o ponto de equilíbrio.'));
  // O cartão de diferença não aparece, e o texto de lucro omite o trecho da folga.
  assert.ok(!texto.includes('Diferença para o faturamento atual'));
  assert.ok(!texto.includes('acima dele'));
  assert.ok(html.includes('calc-card'));
});

test('B7: CMV em R$ maior que o faturamento leva a margem não positiva', () => {
  const { r } = rodar({ faturamento: '10.000,00', cmv: '12.000,00', aluguel: '3.000,00' });
  assert.equal(r.status, 'margem_nao_positiva');
  assert.equal(pct(r.cmvPct), '120,00%');
  assert.equal(brl(r.mc), '-R$ 2.000,00');
  assert.equal(pct(r.mcPct), '-20,00%');
  assert.equal(brl(r.resultado), '-R$ 5.000,00');
  assert.equal(pct(r.resultadoPct), '-50,00%');
});

test('situação usa o valor sem arredondar (limite de 5% com meio centavo de folga)', () => {
  const base = { cmvModo: 'percentual', cmv: 40, aluguel: 0, folha: 0, contas: 0, prolabore: 0, outrosFixos: 0, taxas: 0, embalagens: 0, impostos: 0, dias: 0, faturamento: 10000 };
  assert.equal(Calc.calcular({ ...base, aluguel: 6500 }).situacao, 'empate');
  assert.equal(Calc.calcular({ ...base, aluguel: 6500.004 }).situacao, 'empate');
  assert.equal(Calc.calcular({ ...base, aluguel: 6500.01 }).situacao, 'prejuizo');
  assert.equal(Calc.calcular({ ...base, aluguel: 5500.004 }).situacao, 'empate');
  assert.equal(Calc.calcular({ ...base, aluguel: 5499.99 }).situacao, 'lucro');
});

// ---------- validação dos campos (seção 3.1) ----------

test('validação: mensagens por situação e campo vazio nunca é erro', () => {
  const erros = (texto, id = 'faturamento', modo = 'valor') => plano(T.validar({ ...VAZIO, [id]: texto }, modo).erros);
  assert.deepEqual(erros('abc'), { faturamento: 'Digite só números, por exemplo 12.500,00.' });
  assert.deepEqual(erros('-5', 'aluguel'), { aluguel: 'Digite só números, por exemplo 12.500,00.' });
  assert.deepEqual(erros('1,2,3', 'folha'), { folha: 'Digite só números, por exemplo 12.500,00.' });
  assert.deepEqual(erros('1.000.000.000,00'), { faturamento: 'Valor muito alto. Confira o número digitado.' });
  assert.deepEqual(erros('999.999.999,99'), {});
  assert.deepEqual(erros('100,01', 'taxas'), { taxas: 'Digite um percentual entre 0 e 100.' });
  assert.deepEqual(erros('100', 'impostos'), {});
  assert.deepEqual(erros('101', 'cmv', 'percentual'), { cmv: 'Digite um percentual entre 0 e 100.' });
  assert.deepEqual(erros('32.000,00', 'cmv', 'valor'), {});
  assert.deepEqual(erros('32.000', 'cmv', 'percentual'), { cmv: 'Digite um percentual entre 0 e 100.' });
  assert.deepEqual(erros('32', 'dias'), { dias: 'Digite um número inteiro de 0 a 31.' });
  assert.deepEqual(erros('26,5', 'dias'), { dias: 'Digite um número inteiro de 0 a 31.' });
  assert.deepEqual(erros('31', 'dias'), {});
  assert.deepEqual(erros('0', 'dias'), {});
  const vazio = T.validar(VAZIO, 'valor');
  assert.equal(vazio.ok, true);
  assert.deepEqual(plano(vazio.erros), {});
  assert.ok(Object.values(plano(vazio.valores)).every((v) => v === 0));
});

test('validação: vários erros juntos e mensagem de correção, sem número no HTML', () => {
  const lido = T.validar({ ...VAZIO, faturamento: 'x', dias: '99' }, 'valor');
  assert.equal(lido.ok, false);
  assert.deepEqual(Object.keys(plano(lido.erros)).sort(), ['dias', 'faturamento']);
  assert.equal(semTags(T.htmlCorrija()), 'Corrija os campos indicados para ver o resultado.');
});

test('formato: moeda e porcentagem em pt-BR', () => {
  assert.equal(brl(0), 'R$ 0,00');
  assert.equal(brl(-0.0000001), 'R$ 0,00');
  assert.equal(brl(1234567.891), 'R$ 1.234.567,89');
  assert.equal(brl(-7200), '-R$ 7.200,00');
  assert.equal(pct(3.75), '3,75%');
  assert.equal(pct(-12), '-12,00%');
  assert.equal(pct(0), '0,00%');
});

// ---------- interpretação (seção 6) ----------

test('cada situação mostra título, "O que decide o resultado", "Primeiro passo" e um link permitido', () => {
  const permitidos = ['ficha-tecnica-prato-custo-cmv.html', 'autodiagnostico-restaurante.html'];
  const casos = [
    [{ faturamento: '60.000,00', cmv: '35', aluguel: '6.000,00', folha: '24.000,00', contas: '2.500,00', prolabore: '5.000,00', outrosFixos: '1.500,00', taxas: '5', embalagens: '3', impostos: '4' }, 'percentual', 'O mês fechou no prejuízo', 'ficha-tecnica-prato-custo-cmv.html'],
    [{ faturamento: '80.000,00', cmv: '28.000,00', aluguel: '7.000,00', folha: '26.000,00', contas: '2.000,00', prolabore: '5.000,00', outrosFixos: '1.000,00', taxas: '4', embalagens: '2', impostos: '4' }, 'valor', 'Você está perto do equilíbrio', 'autodiagnostico-restaurante.html'],
    [{ faturamento: '100.000,00', cmv: '32.000,00', aluguel: '8.000,00', folha: '28.000,00', contas: '3.000,00', prolabore: '6.000,00', outrosFixos: '2.000,00', taxas: '4', embalagens: '2', impostos: '6' }, 'valor', 'O mês fechou com lucro', 'autodiagnostico-restaurante.html'],
    [{ faturamento: '40.000,00', cmv: '32.000,00', aluguel: '5.000,00', taxas: '10', embalagens: '5', impostos: '8' }, 'valor', 'Cada venda dá prejuízo antes dos custos fixos', 'ficha-tecnica-prato-custo-cmv.html']
  ];
  for (const [digitado, modo, titulo, link] of casos) {
    const { html, texto } = rodar(digitado, modo);
    assert.ok(texto.includes(titulo), titulo);
    assert.ok(texto.includes('O que decide o resultado:'), titulo);
    assert.ok(texto.includes('esta conta não mostra isso') || texto.includes('Esta conta não mostra isso'), titulo);
    assert.ok(texto.includes('Primeiro passo:'), titulo);
    const links = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(links, [link], titulo);
    assert.ok(links.every((l) => permitidos.includes(l)));
    assert.ok(!/vermelh|red/i.test(html));
  }
});

test('o texto de "perto do equilíbrio" avisa que a faixa de 5% é da calculadora e não de mercado', () => {
  const { texto } = rodar({ faturamento: '80.000,00', cmv: '28.000,00', aluguel: '7.000,00', folha: '26.000,00', contas: '2.000,00', prolabore: '5.000,00', outrosFixos: '1.000,00', taxas: '4', embalagens: '2', impostos: '4' });
  assert.ok(texto.includes('"perto" significa até 5% do faturamento, para mais ou para menos; é uma faixa nossa para facilitar a leitura, não uma referência de mercado.'));
});

test('aviso do pró-labore aparece em qualquer situação com faturamento, e some quando informado', () => {
  const comPro = rodar({ faturamento: '10.000,00', cmv: '40', aluguel: '6.500,00', prolabore: '1.000,00' }, 'percentual');
  assert.ok(!comPro.texto.includes('pró-labore em branco'));
  const semPro = rodar({ faturamento: '10.000,00', cmv: '40', aluguel: '6.500,00' }, 'percentual');
  assert.ok(semPro.texto.includes('Você deixou o pró-labore em branco.'));
  const margemNeg = rodar({ faturamento: '10.000,00', cmv: '12.000,00' });
  assert.ok(margemNeg.texto.includes('Você deixou o pró-labore em branco.'));
  assert.ok(!rodar({}).texto.includes('pró-labore'));
});

test('ordem do resultado: cartões, frase principal, interpretação, aviso do pró-labore', () => {
  const { html } = rodar({ faturamento: '100.000,00', cmv: '32.000,00', aluguel: '8.000,00', folha: '28.000,00', contas: '3.000,00', outrosFixos: '2.000,00', taxas: '4', embalagens: '2', impostos: '6', dias: '26' });
  const posicoes = ['calc-cards', 'calc-headline', 'calc-interp', 'calc-prolabore'].map((c) => html.indexOf(c));
  assert.ok(posicoes.every((p) => p >= 0), JSON.stringify(posicoes));
  assert.deepEqual([...posicoes].sort((a, b) => a - b), posicoes);
});

test('o HTML do resultado não leva atributo style, script, evento nem placeholder', () => {
  for (const digitado of [
    { faturamento: '100.000,00', cmv: '32.000,00', aluguel: '47.000,00', dias: '26' },
    { faturamento: '40.000,00', cmv: '32.000,00', taxas: '10', embalagens: '5', impostos: '8' },
    {}
  ]) {
    const { html } = rodar(digitado);
    assert.ok(!/\sstyle=|<script|\son\w+=|javascript:/i.test(html));
  }
});

// ---------- página estática ----------

const pagina = lerDist('calculadora-margem-ponto-equilibrio.html');
const NUMERO = '5512997710040';
const MENSAGEM_ORIGEM = 'Olá, Rafael. Usei a calculadora de lucro no site da GastroBSC e quero entender o que posso ajustar no meu restaurante. Podemos fazer a conversa de diagnóstico gratuita?';
const URL_ORIGEM = 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Usei%20a%20calculadora%20de%20lucro%20no%20site%20da%20GastroBSC%20e%20quero%20entender%20o%20que%20posso%20ajustar%20no%20meu%20restaurante.%20Podemos%20fazer%20a%20conversa%20de%20diagn%C3%B3stico%20gratuita%3F';

test('WhatsApp: a mensagem é a da origem, o botão aparece 2 vezes e a URL só tem os dígitos do telefone', () => {
  const urls = [...pagina.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map((m) => m[1]);
  assert.equal(urls.length, 2);
  for (const url of urls) {
    assert.equal(url, URL_ORIGEM);
    assert.equal(url, 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(MENSAGEM_ORIGEM));
    const decodificada = decodeURIComponent(url.split('?text=')[1]);
    assert.equal(decodificada, MENSAGEM_ORIGEM);
    // Nenhum número digitado, resultado ou situação: a mensagem não tem dígito algum.
    assert.ok(!/\d/.test(decodificada), 'a mensagem não pode ter dígitos');
    // Na URL inteira, os únicos dígitos fora de sequências %XX são os do telefone.
    const semEscapes = url.replace(/%[0-9A-F]{2}/gi, '');
    assert.equal(semEscapes.replace(/\D/g, ''), NUMERO);
    assert.ok(!/prejuízo|lucro,|equilíbrio|R\$/i.test(decodificada.replace('calculadora de lucro', '')));
  }
});

test('o JS do site não monta link de WhatsApp nem recebe valor digitado para URL', () => {
  for (const arquivo of ARQUIVOS_JS) assert.ok(!/wa\.me|whatsapp|location\.|\.href\s*=|setAttribute\(\s*['"]href/i.test(semComentarios(lerDist(arquivo))), arquivo);
});

test('página: CSP (sem script inline, style, evento ou formulário) e scripts com defer', () => {
  assert.ok(!/\sstyle=/i.test(pagina), 'style=""');
  assert.ok(!/\son\w+=/i.test(pagina), 'handler inline');
  assert.ok(!/<form\b/i.test(pagina), 'form');
  assert.ok(!/<(iframe|object|embed)\b/i.test(pagina));
  const scripts = [...pagina.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
  assert.deepEqual(scripts, ARQUIVOS_JS.map((a) => `<script src="${a}" defer>`));
  assert.ok(!/<script\b[^>]*>\s*\S/.test(pagina.replace(/<script\b[^>]*><\/script>/g, '')));
  for (const href of [...pagina.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])) {
    if (/^(https:\/\/wa\.me\/|mailto:|https:\/\/gastrobsc\.com\.br\/)/.test(href)) continue;
    assert.ok(!/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href), 'recurso externo: ' + href);
  }
});

test('SEO: título, descrição, canonical, Open Graph e um único H1', () => {
  const titulo = 'Ponto de equilíbrio de restaurante: calculadora | GastroBSC';
  const descricao = 'Calcule o ponto de equilíbrio do seu restaurante: informe faturamento, CMV e custos e veja a margem, o resultado do mês e quanto vender por dia.';
  const url = 'https://gastrobsc.com.br/calculadora-margem-ponto-equilibrio.html';
  assert.equal(titulo.length, 59);
  assert.equal(descricao.length, 144);
  assert.ok(pagina.includes(`<title>${titulo}</title>`));
  assert.ok(pagina.includes(`<meta name="description" content="${descricao}">`));
  assert.ok(pagina.includes(`<link rel="canonical" href="${url}">`));
  for (const meta of [
    `property="og:title" content="${titulo}"`, `property="og:description" content="${descricao}"`,
    `property="og:url" content="${url}"`, 'property="og:type" content="website"',
    `name="twitter:title" content="${titulo}"`, `name="twitter:description" content="${descricao}"`,
    'property="og:image" content="https://gastrobsc.com.br/assets/social.png"', 'name="robots" content="index,follow"'
  ]) assert.ok(pagina.includes(meta), meta);
  assert.equal((pagina.match(/<h1\b/g) || []).length, 1);
  assert.ok(pagina.includes('>Meu restaurante dá lucro? Calcule o ponto de equilíbrio do restaurante</h1>'));
  assert.ok(!/application\/ld\+json/.test(pagina), 'sem JSON-LD');
  assert.ok(pagina.includes('Ferramenta gratuita · Os cálculos acontecem no seu aparelho e nada é enviado ou guardado.'));
});

test('formulário: 11 campos de texto vazios, rótulo, ajuda e erro ligados por id, modo do CMV em R$', () => {
  const campos = [...pagina.matchAll(/<input type="text"[^>]*>/g)].map((m) => m[0]);
  assert.equal(campos.length, 11);
  const ids = ['faturamento', 'cmv', 'aluguel', 'folha', 'contas', 'prolabore', 'outrosFixos', 'taxas', 'embalagens', 'impostos', 'dias'];
  assert.deepEqual(campos.map((c) => c.match(/id="([^"]+)"/)[1]), ids);
  for (const campo of campos) {
    const id = campo.match(/id="([^"]+)"/)[1];
    assert.ok(campo.includes('inputmode="decimal"'), id);
    assert.ok(campo.includes('autocomplete="off"'), id);
    assert.ok(!/\svalue=/.test(campo), id + ' deve começar vazio');
    assert.ok(campo.includes(`aria-describedby="ajuda-${id} erro-${id}"`), id);
    assert.ok(pagina.includes(`for="${id}"`), 'label de ' + id);
    assert.ok(pagina.includes(`id="ajuda-${id}"`), 'ajuda de ' + id);
    assert.match(pagina, new RegExp(`id="erro-${id}" hidden>`), 'erro de ' + id);
  }
  assert.match(pagina, /<input type="radio" name="cmvModo" id="cmv-modo-valor" value="valor" checked/);
  assert.match(pagina, /<input type="radio" name="cmvModo" id="cmv-modo-percentual" value="percentual"/);
  assert.equal((pagina.match(/<fieldset\b/g) || []).length, 5);
  assert.equal((pagina.match(/<legend>/g) || []).length, 5);
  for (const legenda of ['Vendas', 'Custo das mercadorias (CMV)', 'Custos fixos do mês', 'Custos que variam com a venda', 'Funcionamento']) {
    assert.ok(pagina.includes(`<legend>${legenda}</legend>`), legenda);
  }
  for (const [ordem, texto] of [['Calcular', 'calc-calcular'], ['Limpar', 'calc-limpar']]) {
    assert.match(pagina, new RegExp(`id="${texto}">${ordem}</button>`));
  }
});

test('região de resultado: uma só aria-live="polite", vazia; aviso, bloco 7.1 e CTA são HTML estático fora dela', () => {
  assert.equal((pagina.match(/aria-live=/g) || []).length, 1);
  assert.match(pagina, /<div id="resultado" class="tool-result calc-result" aria-live="polite"><\/div>/);
  const iResultado = pagina.indexOf('aria-live="polite"');
  const iAviso = pagina.indexOf('<p class="calc-disclaimer">Estimativa simplificada; não substitui a contabilidade.</p>');
  const iNaoMostra = pagina.indexOf('<h2 id="nao-mostra">O que esta conta não mostra</h2>');
  const iCta1 = pagina.indexOf('<div class="cta-box">');
  const iCta2 = pagina.lastIndexOf('<div class="cta-box">');
  const iComoE = pagina.indexOf('id="como-a-conta-e-feita"');
  const iLeia = pagina.indexOf('id="leia-tambem"');
  assert.ok(iResultado < iAviso && iAviso < iNaoMostra && iNaoMostra < iCta1, 'ordem: resultado, aviso, 7.1, CTA');
  assert.ok(iCta1 < iComoE, 'o primeiro CTA vem logo abaixo do 7.1, antes do texto explicativo');
  assert.ok(iCta2 > iCta1 && iCta2 < iLeia, 'o segundo CTA fica antes do "Leia também"');
  assert.equal((pagina.match(/<div class="cta-box">/g) || []).length, 2);
  assert.equal((pagina.match(/O que esta conta não mostra<\/h2>/g) || []).length, 1);
  // Região do 7.1 e do CTA: texto exato.
  assert.ok(pagina.includes('<p class="calc-limits-close">É isso que eu monto com você na conversa de diagnóstico gratuita (30 min, online).</p>'));
  assert.ok(pagina.includes('<h2 class="cta-title">Vamos descobrir qual ajuste mexer primeiro no seu restaurante?</h2>'));
  assert.ok(pagina.includes('Na conversa de diagnóstico gratuita (30 min, online), eu olho os seus números com você, mostro qual custo pesa mais e por onde começar. Sem compromisso.'));
  assert.ok(pagina.includes('Começar a conversa no WhatsApp <span aria-hidden="true">↗</span></a>'));
  assert.ok(pagina.includes('Base em Campos do Jordão/SP · atendimento num raio de ~100 km e online.'));
});

test('página: header "Conversa gratuita", rodapé com região, links permitidos e sem preço', () => {
  assert.ok(pagina.includes('<a class="nav-contact" href="index.html#contato">Conversa gratuita <span aria-hidden="true">↗</span></a>'));
  assert.ok(pagina.includes('<p class="footer-region">Base em Campos do Jordão/SP · atendimento num raio de ~100 km e online</p>'));
  const internos = new Set([...pagina.matchAll(/href="([^"#:]+\.html)(?:#[^"]*)?"/g)].map((m) => m[1]));
  assert.deepEqual([...internos].sort(), ['autodiagnostico-restaurante.html', 'checklist-rotinas-restaurante.html', 'ficha-tecnica-prato-custo-cmv.html', 'index.html', 'privacidade.html']);
  assert.ok(!/R\$ ?\d[\d.]*,\d\d[^.]*(por mês|\/mês) de (assinatura|plano)/i.test(pagina));
  assert.ok(!/vitalício|benchmark|média do mercado/i.test(pagina));
});

test('páginas e scripts: sem armazenamento, rede, cookies nem módulos ES', () => {
  for (const arquivo of ARQUIVOS_JS) {
    const codigo = semComentarios(lerDist(arquivo));
    assert.ok(!/^\s*(import|export)\s/m.test(codigo), arquivo + ': import/export');
    assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\./.test(codigo), arquivo);
    assert.ok(!/console\./.test(codigo), arquivo + ': console');
    assert.ok(!/\.style\.|eval\s*\(|new Function/.test(codigo), arquivo);
  }
  assert.ok(/globalThis/.test(lerDist(ARQUIVOS_JS[0])));
});

test('CSS próprio: sem vermelho e sem importar recurso externo', () => {
  const css = lerDist('assets/css/calculadora.css');
  assert.ok(!/\bred\b|#f00\b|#ff0000|rgb\(\s*2[0-5]\d\s*,\s*[0-4]?\d\s*,\s*[0-4]?\d\s*\)|crimson|tomato/i.test(css));
  assert.ok(!/@import|url\(\s*['"]?https?:/i.test(css));
});

// ---------- Ajustes de 24/10 (Rafael) ----------

// (a) Nada calcula antes do primeiro "Calcular". A interface (calculadora.js) roda num DOM falso, com timers manuais.
function criarPagina() {
  const ctx = {};
  vm.createContext(ctx);
  const campos = ['faturamento', 'cmv', 'aluguel', 'folha', 'contas', 'prolabore', 'outrosFixos', 'taxas', 'embalagens', 'impostos', 'dias'];
  const els = {};
  const novo = (id, extra = {}) => {
    const el = {
      id, value: '', hidden: false, type: 'text', _html: '', attrs: {}, focado: false,
      setAttribute(k, v) { this.attrs[k] = v; },
      removeAttribute(k) { delete this.attrs[k]; },
      focus() { this.focado = true; },
      scrollIntoView() {},
      ...extra
    };
    Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
    Object.defineProperty(el, 'textContent', { get() { return this._html; }, set(v) { this._html = v; } });
    els[id] = el;
    return el;
  };
  campos.forEach((id) => { novo(id); novo('erro-' + id, { hidden: true, type: 'p' }); });
  ['calc-calcular', 'calc-limpar', 'cmv-rotulo', 'cmv-unidade-reais', 'cmv-unidade-pct', 'cmv-leitor'].forEach((id) => novo(id, { type: 'button' }));
  novo('calc-acoes', { hidden: true, type: 'div' });
  novo('resultado', { type: 'div' });
  const radio = novo('cmv-modo-valor', { type: 'radio', name: 'cmvModo', value: 'valor', checked: true });
  const ouvintes = {};
  novo('calculadora', {
    type: 'div',
    addEventListener(tipo, fn) { (ouvintes[tipo] = ouvintes[tipo] || []).push(fn); },
    querySelector() { return radio.checked ? radio : null; }
  });
  const cliques = {};
  els['calc-calcular'].addEventListener = (t, fn) => { cliques.calcular = fn; };
  els['calc-limpar'].addEventListener = (t, fn) => { cliques.limpar = fn; };
  let timers = [];
  ctx.document = { getElementById: (id) => els[id] || null };
  ctx.addEventListener = () => {};
  ctx.setTimeout = (fn) => { timers.push(fn); return timers.length; };
  ctx.clearTimeout = () => { timers = []; };
  for (const arq of ARQUIVOS_JS) vm.runInContext(lerDist(arq), ctx, { filename: arq });
  const disparar = (tipo, alvo, extra = {}) => (ouvintes[tipo] || []).forEach((fn) => fn({ target: alvo, preventDefault() {}, ...extra }));
  return {
    els,
    digitar(id, valor) { els[id].value = valor; disparar('input', els[id]); },
    sair(id) { disparar('change', els[id]); },
    enter(id) { disparar('keydown', els[id], { key: 'Enter' }); },
    trocarModoCmv() { radio.value = 'percentual'; disparar('change', radio); },
    calcular() { cliques.calcular(); },
    limpar() { cliques.limpar(); },
    pendentes: () => timers.length,
    passarTempo() { const fila = timers; timers = []; fila.forEach((fn) => fn()); },
    resultado: () => els.resultado.innerHTML
  };
}

test('ajuste 1: antes do primeiro "Calcular" nada calcula ao digitar nem ao sair do campo', () => {
  const p = criarPagina();
  assert.equal(p.els['calc-acoes'].hidden, false, 'a interface subiu');
  assert.equal(p.resultado(), '');
  p.digitar('faturamento', '100.000,00');
  assert.equal(p.pendentes(), 0, 'digitar não agenda cálculo');
  p.passarTempo();
  p.sair('faturamento');
  p.digitar('aluguel', 'abc');
  p.sair('aluguel');
  assert.equal(p.resultado(), '', 'sem resultado e sem aviso de erro antes do primeiro Calcular');
  assert.equal(p.els['erro-aluguel'].hidden, true);
  assert.equal(p.els.aluguel.attrs['aria-invalid'], undefined);
});

test('ajuste 1: trocar o modo do CMV antes do primeiro "Calcular" também não calcula', () => {
  const p = criarPagina();
  p.digitar('faturamento', '100.000,00');
  p.trocarModoCmv();
  assert.equal(p.resultado(), '');
  assert.equal(p.pendentes(), 0);
});

test('ajuste 1: depois do primeiro "Calcular" (clique), digitar e sair do campo recalculam', () => {
  const p = criarPagina();
  p.digitar('faturamento', '100.000,00');
  p.calcular();
  assert.ok(p.resultado().includes('Seu resultado'));
  p.digitar('cmv', '32.000,00');
  assert.equal(p.pendentes(), 1, 'digitar agenda o recálculo (debounce)');
  const antes = p.resultado();
  p.passarTempo();
  assert.notEqual(p.resultado(), antes);
  p.digitar('aluguel', '90.000,00');
  p.sair('aluguel');
  assert.ok(p.resultado().includes('prejuízo'), 'sair do campo recalcula');
});

test('ajuste 1: o primeiro "Calcular" também vale por Enter', () => {
  const p = criarPagina();
  p.digitar('faturamento', '50.000,00');
  p.enter('faturamento');
  assert.ok(p.resultado().includes('Seu resultado'));
  p.digitar('faturamento', '');
  p.passarTempo();
  assert.ok(p.resultado().includes('Informe o faturamento do mês'), 'recalcula depois do Enter');
});

test('ajuste 1: "Limpar" volta ao estado inicial, sem recálculo até novo "Calcular"', () => {
  const p = criarPagina();
  p.digitar('faturamento', '100.000,00');
  p.calcular();
  assert.notEqual(p.resultado(), '');
  p.limpar();
  assert.equal(p.resultado(), '');
  assert.equal(p.els.faturamento.value, '');
  p.digitar('faturamento', '80.000,00');
  p.sair('faturamento');
  assert.equal(p.pendentes(), 0);
  assert.equal(p.resultado(), '', 'continua vazio depois do Limpar');
  p.calcular();
  assert.ok(p.resultado().includes('Seu resultado'));
});

// (b) Sem custos fixos (semFixos) o ponto de equilíbrio não aparece em nenhuma das interpretações.
const PROIBIDO_SEM_FIXOS = [
  'Ponto de equilíbrio do mês', 'Ponto de equilíbrio por dia aberto', 'Diferença para o faturamento atual',
  'Você precisa vender', 'O ponto de equilíbrio é', 'por mês', 'acima dele', 'Faltaram', 'R$ 0,00 por'
];

function conferirSemPontoDeEquilibrio(texto, html, rotulo) {
  for (const trecho of PROIBIDO_SEM_FIXOS) assert.ok(!texto.includes(trecho), `${rotulo}: não deve conter "${trecho}"`);
  assert.ok(!/ponto de equilíbrio é/i.test(texto), rotulo);
  assert.ok(texto.includes('Você não informou custos fixos. Preencha aluguel, folha, contas, pró-labore e outros para calcular o ponto de equilíbrio.'), rotulo + ': mantém a 5.3');
  assert.ok(texto.includes('Margem de contribuição') && texto.includes('Resultado do mês'), rotulo + ': mantém os demais cartões');
  assert.equal((html.match(/class="calc-card"/g) || []).length, 2, rotulo + ': só margem e resultado');
}

test('ajuste 2: semFixos + lucro (6.3) não mostra cartões, frase nem trecho do ponto de equilíbrio', () => {
  for (const dias of ['', '26']) {
    const { r, texto, html } = rodar({ faturamento: '20.000,00', cmv: '6.000,00', taxas: '5', dias });
    assert.equal(r.situacao, 'lucro');
    assert.equal(r.semFixos, true);
    assert.equal(brl(r.pe), 'R$ 0,00', 'o contrato numérico não muda');
    assert.ok(texto.includes('O mês fechou com lucro'));
    assert.ok(texto.includes('sobraram R$ 13.000,00 (65,00%) depois de pagar todos os custos informados. Resultado no papel'));
    conferirSemPontoDeEquilibrio(texto, html, 'lucro, dias=' + dias);
  }
});

test('ajuste 2: semFixos + perto do equilíbrio (6.2) omite o trecho e mantém o resto', () => {
  const { r, texto, html } = rodar({ faturamento: '10.000,00', cmv: '9.700,00', dias: '20' });
  assert.equal(r.semFixos, true);
  assert.equal(r.situacao, 'empate');
  assert.ok(texto.includes('Você está perto do equilíbrio'));
  assert.ok(texto.includes('o resultado foi R$ 300,00 (3,00%). Nesta calculadora, "perto" significa até 5% do faturamento'));
  assert.ok(texto.includes('O que decide o resultado:') && texto.includes('Primeiro passo:'));
  conferirSemPontoDeEquilibrio(texto, html, 'empate');
});

test('ajuste 2: semFixos + prejuízo (6.1, situação que a conta não produz sem fixos) também omite o trecho', () => {
  const base = plano(rodar({ faturamento: '20.000,00', cmv: '6.000,00', taxas: '5', dias: '26' }).r);
  const r = { ...base, situacao: 'prejuizo', resultado: -800, resultadoPct: -4, falta: 0 };
  const html = T.htmlResultado(r, 20000);
  const texto = semTags(html);
  assert.ok(texto.includes('O mês fechou no prejuízo'));
  assert.ok(texto.includes('o resultado foi -R$ 800,00 (-4,00%).'));
  assert.ok(texto.includes('O que decide o resultado:') && texto.includes('Primeiro passo:'));
  conferirSemPontoDeEquilibrio(texto, html, 'prejuízo');
});

test('ajuste 2: com custos fixos informados o ponto de equilíbrio continua aparecendo', () => {
  const { texto } = rodar({ faturamento: '100.000,00', cmv: '32.000,00', aluguel: '8.000,00', folha: '28.000,00', contas: '3.000,00', prolabore: '6.000,00', outrosFixos: '2.000,00', taxas: '4', embalagens: '2', impostos: '6', dias: '26' });
  for (const trecho of ['Ponto de equilíbrio do mês', 'Ponto de equilíbrio por dia aberto', 'Diferença para o faturamento atual', 'O ponto de equilíbrio é R$ 83.928,57 por mês, e o faturamento do mês está R$ 16.071,43 acima dele.']) {
    assert.ok(texto.includes(trecho), trecho);
  }
  const prej = rodar({ faturamento: '60.000,00', cmv: '35', aluguel: '6.000,00', folha: '24.000,00', contas: '2.500,00', prolabore: '5.000,00', outrosFixos: '1.500,00', taxas: '5', embalagens: '3', impostos: '4', dias: '25' }, 'percentual');
  assert.ok(prej.texto.includes('Com essa mesma estrutura de custos, o ponto de equilíbrio é R$ 73.584,91 por mês. Faltaram R$ 13.584,91 de faturamento para empatar.'));
});

// (c) A linha da região fica só no 1º CTA (e no rodapé do site).
test('ajuste 3: a linha da região está no 1º CTA, não no 2º, e continua no rodapé', () => {
  const linha = 'Base em Campos do Jordão/SP · atendimento num raio de ~100 km e online';
  const blocos = [...pagina.matchAll(/<div class="cta-box">[\s\S]*?<\/div>\r?\n<section/g)].map((m) => m[0]);
  assert.equal(blocos.length, 2, 'dois CTAs');
  assert.ok(blocos[0].includes(linha + '.'), 'o 1º CTA tem a linha');
  assert.ok(!blocos[1].includes('Base em Campos'), 'o 2º CTA não tem a linha');
  assert.ok(!blocos[1].includes('Campos do Jordão'), 'nem parte dela');
  assert.ok(blocos[1].includes('Começar a conversa no WhatsApp'), 'o 2º CTA mantém o botão');
  assert.ok(blocos[1].includes('rafael.jacob@gastrobsc.com.br'), 'e a alternativa por e-mail');
  assert.equal(pagina.split('Campos do Jordão').length - 1, 2, 'a linha existe só no 1º CTA e no rodapé');
  assert.ok(pagina.includes(`<p class="footer-region">${linha}</p>`));
});
