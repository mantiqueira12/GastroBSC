import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Rodar com: node --test tests/   (em 08_site_landing/github_site_v1/)
// Os scripts do site são clássicos (sem export). Aqui eles rodam num contexto isolado com node:vm.

const dist = new URL('../dist/', import.meta.url);
const lerDist = (caminho) => fs.readFileSync(fileURLToPath(new URL(caminho, dist)), 'utf8');

const contexto = {};
vm.createContext(contexto);
for (const arquivo of ['assets/js/autodiagnostico-textos.js', 'assets/js/autodiagnostico-calc.js']) {
  vm.runInContext(lerDist(arquivo), contexto, { filename: arquivo });
}
const api = contexto.GBSC_Autodiag;
const textos = contexto.GBSC_AutodiagTextos;

// Objetos criados dentro do vm têm protótipos de outro realm: normaliza antes de comparar.
const plano = (valor) => JSON.parse(JSON.stringify(valor));

// Tira só os nomes das tags (h2 tem um 2); texto e valores de atributos continuam na verificação.
const semNomesDeTag = (html) => html.replace(/<\/?[a-z][a-z0-9]*/gi, '<');

const parseCodigo = (codigo) => codigo.split('-').map(Number);
const IDS_AREAS = ['financas', 'cardapio', 'equipe', 'gestao'];
const NOMES = {
  financas: 'Finanças e custos',
  cardapio: 'Cardápio e vendas',
  equipe: 'Equipe e rotinas',
  gestao: 'Gestão e tempo do dono'
};
const PREFIXO_URL = 'https://wa.me/5512997710040?text=';

// Conjuntos V1..V5 da seção 9 de 11_mvp_site_captacao/conteudo/autodiagnostico.md (Revisão 2).
const VERIFICACAO = [
  {
    nome: 'V1 tudo zero',
    codigo: '0-0-0-0-0-0-0-0-0-0',
    faixas: ['atencao', 'atencao', 'atencao', 'atencao'],
    pior: 'financas',
    todasOrganizado: false,
    mensagem: 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; a área que mais pesou foi Finanças e custos. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: 0-0-0-0-0-0-0-0-0-0',
    url: 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Fiz%20o%20autodiagn%C3%B3stico%20no%20site%20da%20GastroBSC%3B%20a%20%C3%A1rea%20que%20mais%20pesou%20foi%20Finan%C3%A7as%20e%20custos.%20Quero%20receber%20minha%20nota%20por%20%C3%A1rea%20e%20a%20leitura%20do%20meu%20caso.%20Minhas%20respostas%3A%200-0-0-0-0-0-0-0-0-0'
  },
  {
    nome: 'V2 tudo dois (variante todas Organizado)',
    codigo: '2-2-2-2-2-2-2-2-2-2',
    faixas: ['organizado', 'organizado', 'organizado', 'organizado'],
    pior: 'financas',
    todasOrganizado: true,
    mensagem: 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; todas as áreas ficaram Organizado. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: 2-2-2-2-2-2-2-2-2-2',
    url: 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Fiz%20o%20autodiagn%C3%B3stico%20no%20site%20da%20GastroBSC%3B%20todas%20as%20%C3%A1reas%20ficaram%20Organizado.%20Quero%20receber%20minha%20nota%20por%20%C3%A1rea%20e%20a%20leitura%20do%20meu%20caso.%20Minhas%20respostas%3A%202-2-2-2-2-2-2-2-2-2'
  },
  {
    nome: 'V3 misto, sem empate',
    codigo: '2-1-1-2-2-1-0-1-1-0',
    faixas: ['evolucao', 'organizado', 'atencao', 'atencao'],
    pior: 'gestao',
    todasOrganizado: false,
    mensagem: 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; a área que mais pesou foi Gestão e tempo do dono. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: 2-1-1-2-2-1-0-1-1-0',
    url: 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Fiz%20o%20autodiagn%C3%B3stico%20no%20site%20da%20GastroBSC%3B%20a%20%C3%A1rea%20que%20mais%20pesou%20foi%20Gest%C3%A3o%20e%20tempo%20do%20dono.%20Quero%20receber%20minha%20nota%20por%20%C3%A1rea%20e%20a%20leitura%20do%20meu%20caso.%20Minhas%20respostas%3A%202-1-1-2-2-1-0-1-1-0'
  },
  {
    nome: 'V4 empate na pior nota',
    codigo: '2-0-0-1-1-2-0-0-2-1',
    faixas: ['atencao', 'evolucao', 'atencao', 'organizado'],
    pior: 'financas',
    todasOrganizado: false,
    mensagem: 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; a área que mais pesou foi Finanças e custos. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: 2-0-0-1-1-2-0-0-2-1',
    url: 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Fiz%20o%20autodiagn%C3%B3stico%20no%20site%20da%20GastroBSC%3B%20a%20%C3%A1rea%20que%20mais%20pesou%20foi%20Finan%C3%A7as%20e%20custos.%20Quero%20receber%20minha%20nota%20por%20%C3%A1rea%20e%20a%20leitura%20do%20meu%20caso.%20Minhas%20respostas%3A%202-0-0-1-1-2-0-0-2-1'
  },
  {
    nome: 'V5 pior área em faixa intermediária',
    codigo: '2-2-1-2-1-1-2-1-2-2',
    faixas: ['organizado', 'organizado', 'evolucao', 'organizado'],
    pior: 'equipe',
    todasOrganizado: false,
    mensagem: 'Olá, Rafael. Fiz o autodiagnóstico no site da GastroBSC; a área que mais pesou foi Equipe e rotinas. Quero receber minha nota por área e a leitura do meu caso. Minhas respostas: 2-2-1-2-1-1-2-1-2-2',
    url: 'https://wa.me/5512997710040?text=Ol%C3%A1%2C%20Rafael.%20Fiz%20o%20autodiagn%C3%B3stico%20no%20site%20da%20GastroBSC%3B%20a%20%C3%A1rea%20que%20mais%20pesou%20foi%20Equipe%20e%20rotinas.%20Quero%20receber%20minha%20nota%20por%20%C3%A1rea%20e%20a%20leitura%20do%20meu%20caso.%20Minhas%20respostas%3A%202-2-1-2-1-1-2-1-2-2'
  }
];

test('expõe a API esperada no objeto global do contexto', () => {
  assert.equal(typeof api, 'object');
  for (const nome of ['calcular', 'mensagemWhatsApp', 'urlWhatsApp', 'htmlResultado', 'htmlDestaque', 'htmlCta']) {
    assert.equal(typeof api[nome], 'function', nome);
  }
  assert.deepEqual(plano(api.AREAS.map((a) => a.id)), IDS_AREAS);
});

test('nota interna arredondada e faixa nos cortes (a nota não sai dessas funções)', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((p) => api.notaInterna(p, 6)), [0, 17, 33, 50, 67, 83, 100]);
  assert.deepEqual([0, 1, 2, 3, 4].map((p) => api.notaInterna(p, 4)), [0, 25, 50, 75, 100]);
  assert.equal(api.faixaDaNota(0), 'atencao');
  assert.equal(api.faixaDaNota(39), 'atencao');
  assert.equal(api.faixaDaNota(40), 'evolucao');
  assert.equal(api.faixaDaNota(69), 'evolucao');
  assert.equal(api.faixaDaNota(70), 'organizado');
  assert.equal(api.faixaDaNota(100), 'organizado');
});

for (const caso of VERIFICACAO) {
  test(`${caso.nome}: faixa por área, pior área, código, mensagem e URL`, () => {
    const r = api.calcular(parseCodigo(caso.codigo));
    assert.equal(r.ok, true);
    assert.deepEqual(plano(r.areas.map((a) => a.id)), IDS_AREAS);
    assert.deepEqual(plano(r.areas.map((a) => a.faixa)), caso.faixas);
    assert.equal(r.pior.id, caso.pior);
    assert.equal(r.pior.nome, NOMES[caso.pior]);
    assert.equal(r.todasOrganizado, caso.todasOrganizado);
    assert.equal(r.codigo, caso.codigo);
    assert.equal(r.codigo, parseCodigo(caso.codigo).join('-'));

    assert.equal(api.mensagemWhatsApp(r), caso.mensagem);
    const url = api.urlWhatsApp(r);
    assert.equal(url, caso.url);
    assert.ok(url.startsWith(PREFIXO_URL));
    assert.equal(decodeURIComponent(url.slice(PREFIXO_URL.length)), caso.mensagem);
  });
}

test('exemplo da seção 8: 2-0-1-1-2-0-1-2-1-0 tem Gestão como pior área', () => {
  const r = api.calcular(parseCodigo('2-0-1-1-2-0-1-2-1-0'));
  assert.deepEqual(plano(r.areas.map((a) => a.faixa)), ['evolucao', 'organizado', 'evolucao', 'atencao']);
  assert.equal(r.pior.id, 'gestao');
});

test('variante "todas Organizado": a mensagem não cita área', () => {
  const r = api.calcular(parseCodigo('2-2-2-2-2-2-2-2-2-2'));
  const mensagem = api.mensagemWhatsApp(r);
  assert.ok(mensagem.includes('todas as áreas ficaram Organizado'));
  assert.ok(!mensagem.includes('a área que mais pesou'));
  for (const nome of Object.values(NOMES)) assert.ok(!mensagem.includes(nome), nome);
});

test('menos de 10 respostas ou valores inválidos: não calcula e não monta código', () => {
  const incompletos = [
    [],
    [0, 1, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, null],
    [2, 2, undefined, 2, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 3, 2, 2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2, '1', 2, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 1.5, 2, 2, 2],
    [2, 2, 2, 2, 2, 2, 2, NaN, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    null,
    undefined,
    'abc'
  ];
  for (const respostas of incompletos) {
    const r = api.calcular(respostas);
    assert.equal(r.ok, false, JSON.stringify(respostas));
    assert.equal(r.codigo, undefined);
    assert.equal(r.pior, undefined);
    assert.equal(r.areas, undefined);
  }
  assert.deepEqual(plano(api.calcular([2, 2, 2, 2, 2, 2, 2, 2, 2, null]).faltam), [10]);
  assert.deepEqual(plano(api.calcular([0, 1, 2]).faltam), [4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(plano(api.calcular([2, 2, undefined, 2, 2, 2, 2, 2, 2, 7]).faltam), [3, 10]);
});

test('as 59.049 combinações: pior área é uma das 4, código tem 10 valores 0/1/2, faixas coerentes', () => {
  let total = 0;
  const vistos = new Set();
  const respostas = new Array(10).fill(0);
  const faixasValidas = new Set(['atencao', 'evolucao', 'organizado']);
  for (let n = 0; n < 3 ** 10; n += 1) {
    let resto = n;
    for (let i = 9; i >= 0; i -= 1) {
      respostas[i] = resto % 3;
      resto = Math.floor(resto / 3);
    }
    const r = api.calcular(respostas.slice());
    assert.equal(r.ok, true);
    assert.ok(IDS_AREAS.includes(r.pior.id));
    const partes = r.codigo.split('-');
    assert.equal(partes.length, 10);
    assert.ok(partes.every((p) => p === '0' || p === '1' || p === '2'));
    assert.equal(r.codigo, respostas.join('-'));
    assert.equal(r.areas.length, 4);
    assert.ok(r.areas.every((a) => faixasValidas.has(a.faixa)));
    // A pior área nunca está numa faixa melhor que a de outra área.
    const ordem = { atencao: 0, evolucao: 1, organizado: 2 };
    assert.ok(r.areas.every((a) => ordem[r.pior.faixa] <= ordem[a.faixa]));
    assert.equal(r.todasOrganizado, r.areas.every((a) => a.faixa === 'organizado'));
    // Em empate de faixa com menor nota, a área escolhida não pode ter outra anterior na mesma faixa pior.
    const primeiraNaFaixa = r.areas.find((a) => a.faixa === r.pior.faixa);
    assert.ok(IDS_AREAS.indexOf(r.pior.id) >= IDS_AREAS.indexOf(primeiraNaFaixa.id));
    vistos.add(`${r.pior.id}|${r.pior.faixa}|${r.todasOrganizado}`);
    total += 1;
  }
  assert.equal(total, 59049);
  // Todas as 4 áreas aparecem como pior em alguma combinação.
  for (const id of IDS_AREAS) assert.ok([...vistos].some((v) => v.startsWith(id + '|')), id);
});

test('textos: 12 destaques completos, só com links permitidos, e frase de CTA para cada área', () => {
  const permitidos = new Set([
    'ficha-tecnica-prato-custo-cmv.html',
    'calculadora-margem-ponto-equilibrio.html',
    'checklist-rotinas-restaurante.html'
  ]);
  let contagem = 0;
  for (const area of IDS_AREAS) {
    assert.ok(textos.cta.frasePiorArea[area], area);
    assert.ok(textos.cta.frasePiorArea[area].includes(NOMES[area]));
    for (const faixa of ['atencao', 'evolucao', 'organizado']) {
      const d = textos.destaques[area][faixa];
      for (const campo of ['acontece', 'passo', 'conversa']) assert.ok(d[campo].length > 20, `${area} ${faixa} ${campo}`);
      assert.ok(permitidos.has(d.ferramenta.href), `${area} ${faixa}: ${d.ferramenta.href}`);
      assert.ok(d.ferramenta.texto.length > 5);
      contagem += 1;
    }
  }
  assert.equal(contagem, 12);
});

test('a nota não vaza: resultado e destaque sem dígito, "%" nem "de 100"; URL só com dígitos do telefone e do código', () => {
  const combinacoes = new Map();
  for (const caso of VERIFICACAO) {
    combinacoes.set(caso.codigo, api.calcular(parseCodigo(caso.codigo)));
  }
  // Também cada combinação pior área x faixa x variante que existir nas 59.049 respostas.
  const respostas = new Array(10).fill(0);
  for (let n = 0; n < 3 ** 10; n += 1) {
    let resto = n;
    for (let i = 9; i >= 0; i -= 1) {
      respostas[i] = resto % 3;
      resto = Math.floor(resto / 3);
    }
    const r = api.calcular(respostas.slice());
    const chave = `${r.pior.id}|${r.pior.faixa}|${r.todasOrganizado}|${r.areas.map((a) => a.faixa).join()}`;
    if (!combinacoes.has(chave)) combinacoes.set(chave, r);
  }
  assert.ok(combinacoes.size >= 12);

  for (const [chave, r] of combinacoes) {
    for (const [parte, html] of [['resultado', api.htmlResultado(r)], ['destaque', api.htmlDestaque(r)]]) {
      assert.ok(!/\d/.test(semNomesDeTag(html)), `${chave} ${parte}: tem dígito`);
      assert.ok(!html.includes('%'), `${chave} ${parte}: tem %`);
      assert.ok(!/de 100/i.test(html), `${chave} ${parte}: tem "de 100"`);
      assert.ok(!/<meter|<progress|\sstyle=|<script|\son\w+=/i.test(html), `${chave} ${parte}: marcação proibida`);
    }
    // Atributos data-*, aria-* e title do resultado também não carregam número (já coberto pela regra de dígitos).
    const resultado = api.htmlResultado(r);
    assert.ok(!/\sdata-|\stitle=/i.test(resultado));

    const cta = api.htmlCta(r);
    const href = cta.match(/href="(https:\/\/wa\.me\/[^"]+)"/)[1];
    assert.equal(href, api.urlWhatsApp(r));
    assert.ok(href.startsWith(PREFIXO_URL));
    const mensagem = decodeURIComponent(href.slice(PREFIXO_URL.length));
    // Tirando o código das respostas, a mensagem não pode ter nenhum dígito.
    assert.ok(!/\d/.test(mensagem.replace(r.codigo, '')), `${chave}: dígito fora do código na mensagem`);
    assert.ok(mensagem.endsWith('Minhas respostas: ' + r.codigo));
    assert.ok(!mensagem.includes('%'));
    // Na URL crua, a parte antes de "text=" só tem o telefone como dígitos.
    assert.ok(!/\d/.test(PREFIXO_URL.replace('5512997710040', '')));
    // Texto visível do CTA: título e parágrafo não têm nota; "30 min" é o único número permitido.
    const textoCta = cta.replace(/<[^>]+>/g, ' ').replace(/https:\/\/\S+/g, '');
    const numeros = textoCta.match(/\d+/g) || [];
    assert.ok(!textoCta.includes('%'), `${chave}: % no texto do CTA`);
    assert.ok(!/de 100/i.test(textoCta));
    assert.ok(!textoCta.includes('%'), `${chave}: % no texto do CTA`);
    assert.ok(!/de 100/i.test(textoCta));
    assert.ok(numeros.every((n) => n === '30'), `${chave}: número inesperado no CTA: ${numeros}`);
  }
});

test('o CTA usa o rótulo e o texto da Revisão 2 (primeira pessoa)', () => {
  const normal = api.htmlCta(api.calcular(parseCodigo('2-1-1-2-2-1-0-1-1-0')));
  assert.ok(normal.includes('Receba sua nota por área e a leitura do seu caso no WhatsApp'));
  assert.ok(normal.includes('Como Gestão e tempo do dono foi a área que mais pesou, começo por aí:'));
  assert.ok(normal.includes('Quero receber minha nota no WhatsApp <span aria-hidden="true">↗</span>'));
  assert.ok(normal.includes('Suas respostas ficam no seu aparelho. Elas só chegam a mim se você clicar no botão e enviar a mensagem pelo WhatsApp. Você vê o texto antes de enviar.'));
  assert.ok(normal.includes('target="_blank" rel="noopener noreferrer"'));

  const variante = api.htmlCta(api.calcular(parseCodigo('2-2-2-2-2-2-2-2-2-2')));
  assert.ok(variante.includes('Receba sua nota por área e o próximo passo do seu caso no WhatsApp'));
  assert.ok(variante.includes('Suas quatro áreas ficaram Organizado.'));
  assert.ok(!variante.includes('a área que mais pesou'));
});

test('destaque: título normal e da variante "todas Organizado"; links só nos dados', () => {
  const v3 = api.htmlDestaque(api.calcular(parseCodigo('2-1-1-2-2-1-0-1-1-0')));
  assert.ok(v3.includes('A área que mais pesou: Gestão e tempo do dono'));
  assert.ok(v3.includes('href="checklist-rotinas-restaurante.html"'));
  const v2 = api.htmlDestaque(api.calcular(parseCodigo('2-2-2-2-2-2-2-2-2-2')));
  assert.ok(v2.includes('Tudo organizado. A área com menos folga: Finanças e custos'));
  assert.ok(v2.includes('href="calculadora-margem-ponto-equilibrio.html"'));
  const v1 = api.htmlDestaque(api.calcular(parseCodigo('0-0-0-0-0-0-0-0-0-0')));
  assert.ok(v1.includes('href="ficha-tecnica-prato-custo-cmv.html"'));
  for (const rotulo of ['O que costuma acontecer', 'Primeiro passo (grátis)', 'Ferramenta gratuita', 'O que fica para a conversa']) {
    assert.ok(v1.includes(rotulo), rotulo);
  }
});

test('resultado: uma linha por área com rótulo da faixa em texto e indicador por classe', () => {
  const html = api.htmlResultado(api.calcular(parseCodigo('2-1-1-2-2-1-0-1-1-0')));
  assert.ok(html.includes('Seu resultado por área'));
  for (const nome of Object.values(NOMES)) assert.ok(html.includes(nome), nome);
  for (const rotulo of ['Em evolução', 'Organizado', 'Atenção']) assert.ok(html.includes(`>${rotulo}</span>`), rotulo);
  assert.equal((html.match(/class="tool-mark"/g) || []).length, 12);
  assert.ok(html.includes('Esta é uma leitura rápida, feita só com o que você respondeu.'));
});

test('HTML estático: perguntas, acessibilidade e regras de CSP', () => {
  const html = lerDist('autodiagnostico-restaurante.html');
  assert.equal((html.match(/<fieldset\b/g) || []).length, 10);
  assert.equal((html.match(/<legend>/g) || []).length, 10);
  assert.equal((html.match(/<input type="radio"/g) || []).length, 30);
  for (let q = 1; q <= 10; q += 1) {
    assert.equal((html.match(new RegExp(`name="q${q}"`, 'g')) || []).length, 3, `q${q}`);
  }
  assert.equal((html.match(/<label class="tool-option">/g) || []).length, 30);
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/.test(html));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.ok(html.includes('<link rel="canonical" href="https://gastrobsc.com.br/autodiagnostico-restaurante.html">'));
  assert.ok(html.includes('<title>Diagnóstico de restaurante grátis em 3 minutos | GastroBSC</title>'));
  assert.ok(html.includes('<a class="nav-contact" href="index.html#contato">Conversa gratuita'));
  // CSP: nada inline.
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'script inline');
  assert.ok(!/\sstyle=/i.test(html), 'style inline');
  assert.ok(!/\son\w+=/i.test(html), 'manipulador inline');
  assert.ok(!/<form\b|<meter|<progress/i.test(html));
  // T09: as outras ferramentas existem e o bloco "Outras ferramentas" liga a elas.
  assert.ok(html.includes('calculadora-margem-ponto-equilibrio.html'));
  assert.ok(html.includes('checklist-rotinas-restaurante.html'));
  // Ordem dos scripts: textos, cálculo, interface.
  const ordem = [...html.matchAll(/<script src="assets\/js\/([^"]+)" defer><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(ordem, ['autodiagnostico-textos.js', 'autodiagnostico-calc.js', 'autodiagnostico.js']);
});

test('os arquivos JS do site são scripts clássicos, sem rede, armazenamento nem console', () => {
  for (const arquivo of ['autodiagnostico-textos.js', 'autodiagnostico-calc.js', 'autodiagnostico.js']) {
    const codigo = lerDist('assets/js/' + arquivo)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/^\s*(import|export)\s/m.test(codigo), `${arquivo}: módulo ES`);
    assert.ok(!/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.sendBeacon|WebSocket)\b/.test(codigo), `${arquivo}: rede ou armazenamento`);
    assert.ok(!/\bconsole\./.test(codigo), `${arquivo}: console`);
    assert.ok(!/\beval\s*\(|new Function/.test(codigo), `${arquivo}: eval`);
  }
});
