// Garante que o check-site.mjs realmente falha para cada violação de CSP/metadados.
// Cada caso copia dist/ e check-site.mjs para uma pasta temporária, altera uma página e roda o script lá.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function rodar(pagina, alterar) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbsc-check-'));
  try {
    fs.cpSync(path.join(raiz, 'dist'), path.join(tmp, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(raiz, 'check-site.mjs'), path.join(tmp, 'check-site.mjs'));
    if (pagina) {
      const arquivo = path.join(tmp, 'dist', pagina);
      fs.writeFileSync(arquivo, alterar(fs.readFileSync(arquivo, 'utf8')));
    }
    return spawnSync(process.execPath, ['check-site.mjs'], { cwd: tmp, encoding: 'utf8' });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test('o site atual passa no check-site', () => {
  const r = rodar(null);
  assert.equal(r.status, 0, r.stderr);
});

const casos = [
  ['script inline sem src', 'calculadora-margem-ponto-equilibrio.html', h => h.replace('</body>', '<script>alert(1)</script></body>'), /Inline <script>/],
  ['script externo', 'conversa-gratuita.html', h => h.replace('</body>', '<script src="https://exemplo.com/a.js" defer></script></body>'), /External script src/],
  ['script local sem defer', 'checklist-rotinas-restaurante.html', h => h.replace('checklist.js" defer', 'checklist.js"'), /without defer/],
  ['atributo on*=', 'privacidade.html', h => h.replace('<main', '<main onclick="x()"'), /event handler/],
  ['style inline', 'autodiagnostico-restaurante.html', h => h.replace('<main', '<main style="color:red"'), /style="\.\.\."/],
  ['imagem externa', 'index.html', h => h.replace('src="assets/logo.webp"', 'src="https://exemplo.com/logo.webp"'), /External or data:/],
  ['css externo', 'index.html', h => h.replace('href="styles.css"', 'href="https://exemplo.com/styles.css"'), /External <link>/],
  ['formulário', 'index.html', h => h.replace('</main>', '<form action="/x"></form></main>'), /Form\/iframe/],
  ['título com mais de 60 caracteres', 'privacidade.html', h => h.replace('<title>Privacidade — GastroBSC</title>', '<title>' + 'x'.repeat(61) + '</title>'), /Title over 60/],
  ['descrição com mais de 155 caracteres', 'privacidade.html', h => h.replace(/(<meta name="description" content=")[^"]*"/, '$1' + 'x'.repeat(156) + '"'), /Description over 155/],
  ['dois H1', 'privacidade.html', h => h.replace('</main>', '<h1>Outro</h1></main>'), /exactly one h1/],
  ['canonical errado', 'conversa-gratuita.html', h => h.replace('rel="canonical" href="https://gastrobsc.com.br/conversa-gratuita.html"', 'rel="canonical" href="https://gastrobsc.com.br/outra.html"'), /Canonical of/],
];

for (const [nome, pagina, alterar, erro] of casos) {
  test('check-site falha: ' + nome, () => {
    const r = rodar(pagina, alterar);
    assert.notEqual(r.status, 0, 'deveria falhar');
    assert.match(r.stderr, erro);
  });
}

test('check-site falha quando uma página indexável sai do sitemap', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gbsc-check-'));
  try {
    fs.cpSync(path.join(raiz, 'dist'), path.join(tmp, 'dist'), { recursive: true });
    fs.copyFileSync(path.join(raiz, 'check-site.mjs'), path.join(tmp, 'check-site.mjs'));
    const mapa = path.join(tmp, 'dist', 'sitemap.xml');
    fs.writeFileSync(mapa, fs.readFileSync(mapa, 'utf8').replace(/\s*<url>\s*<loc>https:\/\/gastrobsc\.com\.br\/conversa-gratuita\.html<\/loc>[\s\S]*?<\/url>/, ''));
    const r = spawnSync(process.execPath, ['check-site.mjs'], { cwd: tmp, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /missing from sitemap/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
