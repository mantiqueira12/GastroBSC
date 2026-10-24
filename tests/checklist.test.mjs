import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Rodar com: node --test  (em 08_site_landing/github_site_v1/)
// O script do checklist é clássico (sem export). Aqui ele roda num contexto isolado com node:vm, sem DOM.

const dist = new URL('../dist/', import.meta.url);
const lerDist = (caminho) => fs.readFileSync(fileURLToPath(new URL(caminho, dist)), 'utf8');

const contexto = {};
vm.createContext(contexto);
vm.runInContext(lerDist('assets/js/checklist.js'), contexto, { filename: 'assets/js/checklist.js' });
const api = contexto.GBSC_Checklist;

const html = lerDist('checklist-rotinas-restaurante.html');

test('contarMarcados conta só os ids do bloco', () => {
  const bloco = ['rg01', 'rg02', 'rg03'];
  assert.equal(api.contarMarcados(bloco, ['rg01', 'ab01', 'rg03', 'xx99']), 2);
  assert.equal(api.contarMarcados(bloco, []), 0);
});

test('resultadoRg usa o texto baixo de 0 a 12 marcados', () => {
  for (const marcados of [0, 12]) {
    const r = api.resultadoRg(marcados, 15);
    assert.equal(r.linha, `Você marcou ${marcados} de 15 itens deste bloco.`);
    assert.equal(r.texto, api.TEXTO_BAIXO);
  }
});

test('resultadoRg usa o texto alto de 13 a 15 marcados', () => {
  for (const marcados of [13, 15]) {
    const r = api.resultadoRg(marcados, 15);
    assert.equal(r.linha, `Você marcou ${marcados} de 15 itens deste bloco.`);
    assert.equal(r.texto, api.TEXTO_ALTO);
  }
});

test('o bloco rg tem 15 caixas com ids rg01 a rg15 e a página tem 64 itens', () => {
  const ids = [...html.matchAll(/<input class="ck-box" type="checkbox" id="([a-z]{2}\d{2})"/g)].map((m) => m[1]);
  assert.equal(ids.length, 64);
  assert.equal(new Set(ids).size, 64);
  const rg = ids.filter((id) => id.startsWith('rg'));
  assert.deepEqual(rg, Array.from({ length: 15 }, (_, i) => 'rg' + String(i + 1).padStart(2, '0')));
});

test('os links de WhatsApp decodificam para as mensagens A e B da T07', () => {
  const hrefs = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map((m) => m[1]);
  const textos = hrefs.map((href) => decodeURIComponent(href.split('?text=')[1]));
  assert.equal(hrefs.length, 2);
  assert.ok(textos.includes(
    'Olá, Rafael. Usei o Checklist de rotinas no site da GastroBSC e quero adaptar as rotinas ao meu restaurante. Podemos fazer a conversa de diagnóstico gratuita?'
  ));
  assert.ok(textos.includes(
    'Olá, Rafael. Usei o Checklist de rotinas no site da GastroBSC e quero ajuda para regularizar a parte sanitária e de documentos do meu restaurante. Podemos fazer a conversa de diagnóstico gratuita?'
  ));
});

test('podeLimpar pede a confirmação com a mensagem exata e só limpa se o visitante confirmar', () => {
  const perguntas = [];
  const confirmaSim = (m) => { perguntas.push(m); return true; };
  const confirmaNao = (m) => { perguntas.push(m); return false; };
  assert.equal(api.podeLimpar(confirmaSim), true);
  assert.equal(api.podeLimpar(confirmaNao), false);
  assert.deepEqual(perguntas, [
    'Limpar todas as marcações deste checklist neste aparelho?',
    'Limpar todas as marcações deste checklist neste aparelho?'
  ]);
});

test('podeLimpar trata confirm indisponível ou com erro como confirmado', () => {
  assert.equal(api.podeLimpar(undefined), true);
  assert.equal(api.podeLimpar(() => { throw new TypeError('confirm indisponível'); }), true);
});

test('a página não tem style inline, script inline nem handlers inline (CSP)', () => {
  assert.equal(/\sstyle=/i.test(html), false);
  assert.equal(/<script(?![^>]*\bsrc=)/i.test(html), false);
  assert.equal(/\son[a-z]+=/i.test(html), false);
});
