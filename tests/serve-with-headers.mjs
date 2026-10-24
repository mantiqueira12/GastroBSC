// Servidor estático mínimo para o QA: serve dist/ e aplica os cabeçalhos de dist/_headers (CSP real).
// Uso (na pasta github_site_v1): node tests/serve-with-headers.mjs [porta]   (padrão 8080)
// Não é testado pelo `node --test` (não termina .test.mjs) e não vai para o deploy (fica fora de dist/).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(raiz, 'dist');
const porta = Number(process.argv[2] || process.env.PORT || 8080);

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

// Formato do Netlify: linha sem recuo = padrão de caminho; linhas recuadas "Nome: valor" = cabeçalhos.
function lerRegras(texto) {
  const regras = [];
  let atual = null;
  for (const linha of texto.split(/\r?\n/)) {
    if (!linha.trim() || linha.trim().startsWith('#')) continue;
    if (!/^\s/.test(linha)) {
      atual = { padrao: linha.trim(), cabecalhos: [] };
      regras.push(atual);
    } else if (atual) {
      const i = linha.indexOf(':');
      if (i > 0) atual.cabecalhos.push([linha.slice(0, i).trim(), linha.slice(i + 1).trim()]);
    }
  }
  return regras;
}

function paraRegex(padrao) {
  const fonte = padrao.split('*').map(parte => parte.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + fonte + '$');
}

function cabecalhosPara(caminho, regras) {
  const resultado = {};
  for (const regra of regras) {
    if (paraRegex(regra.padrao).test(caminho)) {
      for (const [nome, valor] of regra.cabecalhos) resultado[nome] = resultado[nome] ? resultado[nome] + ', ' + valor : valor;
    }
  }
  return resultado;
}

const servidor = http.createServer((req, res) => {
  // Relê o _headers a cada requisição: o QA vê a CSP atual depois de uma edição.
  const regras = lerRegras(fs.readFileSync(path.join(dist, '_headers'), 'utf8'));
  let caminho;
  try {
    caminho = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Requisição inválida');
    return;
  }
  const relativo = caminho.endsWith('/') ? caminho + 'index.html' : caminho;
  const arquivo = path.resolve(dist, '.' + relativo);
  if (arquivo !== dist && !arquivo.startsWith(dist + path.sep)) {
    res.writeHead(403).end('Fora de dist');
    return;
  }
  const cabecalhos = cabecalhosPara(caminho, regras);
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) {
      res.writeHead(404, { ...cabecalhos, 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
      return;
    }
    res.writeHead(200, { ...cabecalhos, 'Content-Type': tipos[path.extname(arquivo).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(dados);
  });
});

servidor.listen(porta, '127.0.0.1', () => {
  console.log('dist/ com cabeçalhos de _headers em http://127.0.0.1:' + porta + '/');
});
