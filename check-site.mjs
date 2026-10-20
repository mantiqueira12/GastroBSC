import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const html = fs.readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if (!script) throw new Error('Organization JSON-LD missing');
JSON.parse(script);
const hash = 'sha256-' + crypto.createHash('sha256').update(script).digest('base64');
const currentHeaders = fs.readFileSync('dist/_headers', 'utf8');
if (!/'sha256-[^']+'/.test(currentHeaders)) throw new Error('CSP hash slot missing');
if (!currentHeaders.includes("'" + hash + "'")) throw new Error('Organization JSON-LD hash differs from CSP');
const pages = fs.readdirSync('dist').filter(file => file.endsWith('.html'));
for (const page of pages) {
  const content = fs.readFileSync('dist/' + page, 'utf8');
  for (const match of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue;
    const target = new URL(value, 'https://local.invalid/' + page);
    const relativePath = decodeURIComponent(target.pathname).replace(/^\//, '') || 'index.html';
    const targetFile = path.resolve('dist', relativePath);
    if (!targetFile.startsWith(path.resolve('dist') + path.sep)) throw new Error('Path outside dist: ' + value);
    if (!fs.existsSync(targetFile)) throw new Error('Missing asset in ' + page + ': ' + value);
    if (target.hash) {
      const anchor = decodeURIComponent(target.hash.slice(1));
      const ids = [...fs.readFileSync(targetFile, 'utf8').matchAll(/id="([^"]+)"/g)].map(item => item[1]);
      if (!ids.includes(anchor)) throw new Error('Missing anchor in ' + page + ': ' + value);
    }
  }
  if (/PLACEHOLDER|XXXXXXXX|\[REQUER/.test(content)) throw new Error('Placeholder in ' + page);
}
const guide = fs.readFileSync('dist/ficha-tecnica-prato-custo-cmv.html', 'utf8');
if ((guide.match(/<h1\b/g) || []).length !== 1) throw new Error('Guide must have one h1');
if (!guide.includes('name="robots" content="index,follow"')) throw new Error('Approved guide must allow indexing');
if (!guide.includes('rel="canonical" href="https://gastrobsc.com.br/ficha-tecnica-prato-custo-cmv.html"')) throw new Error('Guide canonical missing');
if (/Rascunho em revisão editorial/.test(guide)) throw new Error('Draft notice remains in approved guide');
if (!fs.readFileSync('dist/sitemap.xml', 'utf8').includes('https://gastrobsc.com.br/ficha-tecnica-prato-custo-cmv.html')) throw new Error('Approved guide missing from sitemap');
if (/<script\b|\sstyle=|\son\w+=/i.test(guide)) throw new Error('Inline script/style/handler in guide');
if (/Controle editorial|autoria_sugerida|rascunho_para_revisao_de_Rafael/.test(guide)) throw new Error('Private editorial metadata leaked');
if (!html.includes('href="ficha-tecnica-prato-custo-cmv.html"')) throw new Error('Landing guide link missing');
if ((html.match(/<h1>/g) || []).length !== 1) throw new Error('Expected one h1');
if (!html.includes('5512997710040')) throw new Error('WhatsApp missing');
if (!html.includes('rel="canonical" href="https://gastrobsc.com.br/"')) throw new Error('Canonical must use primary domain');
for (const file of ['index.html', 'sitemap.xml', 'robots.txt']) {
  if (fs.readFileSync('dist/' + file, 'utf8').includes('https://www.gastrobsc.com.br')) throw new Error('Redirected hostname in ' + file);
}
console.log(JSON.stringify({ organizationJson: 'parseable', localAssets: 'valid', placeholders: 'none', bytes: Buffer.byteLength(html), cspHash: hash }));
