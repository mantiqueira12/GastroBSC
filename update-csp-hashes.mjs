import fs from 'node:fs';
import crypto from 'node:crypto';

// Recalcula os hashes sha256 dos blocos JSON-LD de dist/*.html e grava na CSP de dist/_headers.
// Rode depois de alterar qualquer <script type="application/ld+json">: node update-csp-hashes.mjs
const hashes = new Set();
for (const page of fs.readdirSync('dist').filter(file => file.endsWith('.html')).sort()) {
  const content = fs.readFileSync('dist/' + page, 'utf8');
  for (const match of content.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.parse(match[1]);
    hashes.add("'sha256-" + crypto.createHash('sha256').update(match[1]).digest('base64') + "'");
  }
}
if (!hashes.size) throw new Error('Nenhum JSON-LD encontrado');
const headers = fs.readFileSync('dist/_headers', 'utf8');
const updated = headers.replace(/script-src 'self'(?: 'sha256-[^']+')*/, "script-src 'self' " + [...hashes].join(' '));
if (updated === headers && ![...hashes].every(hash => headers.includes(hash))) throw new Error('script-src não encontrado em dist/_headers');
fs.writeFileSync('dist/_headers', updated);
console.log('CSP atualizada com ' + hashes.size + ' hash(es) de JSON-LD.');
