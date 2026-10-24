import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

// Verificação do site estático. Roda no build do Netlify (netlify.toml) e localmente: node check-site.mjs
// Regras: CSP rígida (sem script inline, sem handler on*=, sem style="", sem recurso externo carregado),
// metadados por página (título, descrição, canonical, Open Graph, 1 H1), links internos e sitemap.

const fail = message => { throw new Error(message); };
const decode = text => text.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const isExternal = value => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value.trim());

const html = fs.readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if (!script) fail('Organization JSON-LD missing');
JSON.parse(script);
const hash = 'sha256-' + crypto.createHash('sha256').update(script).digest('base64');
const currentHeaders = fs.readFileSync('dist/_headers', 'utf8');
if (!/'sha256-[^']+'/.test(currentHeaders)) fail('CSP hash slot missing');
if (!currentHeaders.includes("'" + hash + "'")) fail('Organization JSON-LD hash differs from CSP');

const pages = fs.readdirSync('dist').filter(file => file.endsWith('.html'));
const seenTitles = new Map();
const seenDescriptions = new Map();
const indexablePages = [];

for (const page of pages) {
  const content = fs.readFileSync('dist/' + page, 'utf8');

  // Links e recursos internos existem (arquivo e âncora).
  for (const match of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (isExternal(value)) continue;
    const target = new URL(value, 'https://local.invalid/' + page);
    const relativePath = decodeURIComponent(target.pathname).replace(/^\//, '') || 'index.html';
    const targetFile = path.resolve('dist', relativePath);
    if (!targetFile.startsWith(path.resolve('dist') + path.sep)) fail('Path outside dist: ' + value);
    if (!fs.existsSync(targetFile)) fail('Missing asset in ' + page + ': ' + value);
    if (target.hash) {
      const anchor = decodeURIComponent(target.hash.slice(1));
      const ids = [...fs.readFileSync(targetFile, 'utf8').matchAll(/id="([^"]+)"/g)].map(item => item[1]);
      if (!ids.includes(anchor)) fail('Missing anchor in ' + page + ': ' + value);
    }
  }
  if (/PLACEHOLDER|XXXXXXXX|\[REQUER/.test(content)) fail('Placeholder in ' + page);

  // CSP: scripts. Só <script src="local" defer>; o único inline permitido é o JSON-LD da home (hash conferido acima).
  let ldJsonCount = 0;
  for (const match of content.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    const src = attrs.match(/\bsrc\s*=\s*"([^"]*)"/i)?.[1];
    if (src !== undefined) {
      if (isExternal(src) || src.startsWith('data:')) fail('External script src in ' + page + ': ' + src);
      if (!/\bdefer\b/i.test(attrs)) fail('Script without defer in ' + page + ': ' + src);
      if (match[2].trim()) fail('Script with src and inline body in ' + page);
    } else if (page === 'index.html' && /type="application\/ld\+json"/i.test(attrs)) {
      ldJsonCount += 1;
    } else {
      fail('Inline <script> without src in ' + page);
    }
  }
  if (ldJsonCount > 1 || (ldJsonCount === 1 && page !== 'index.html')) fail('Unexpected JSON-LD in ' + page);
  if ((content.match(/<script\b/gi) || []).length !== (content.match(/<\/script>/gi) || []).length) fail('Unbalanced <script> in ' + page);

  // CSP: tags e atributos (fora de comentários e do conteúdo de <script>).
  const markup = content.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script>');
  if (/<style\b/i.test(markup)) fail('Inline <style> in ' + page);
  if (/<(?:form|iframe|object|embed|base)\b/i.test(markup)) fail('Form/iframe/object/embed/base tag in ' + page);
  for (const tag of markup.matchAll(/<([a-z][a-z0-9-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/gi)) {
    const name = tag[1].toLowerCase();
    const attrs = new Map();
    for (const attr of tag[2].matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs.set(attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    for (const attrName of attrs.keys()) {
      if (/^on[a-z]+$/.test(attrName)) fail('Inline event handler ' + attrName + ' in ' + page);
      if (attrName === 'style') fail('Inline style="..." in ' + page + ' (<' + name + '>)');
    }
    for (const attrName of ['src', 'srcset', 'poster', 'data']) {
      const value = attrs.get(attrName);
      if (value !== undefined && (isExternal(value) || /^\s*data:/i.test(value))) fail('External or data: resource ' + attrName + '=' + value + ' in ' + page);
    }
    if (name === 'link' && /\b(?:stylesheet|icon|preload|prefetch|modulepreload|manifest|apple-touch-icon|preconnect|dns-prefetch)\b/i.test(attrs.get('rel') || '')) {
      const href = attrs.get('href') || '';
      if (isExternal(href)) fail('External <link> resource in ' + page + ': ' + href);
    }
  }

  // Metadados.
  const title = decode(content.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
  const description = decode(content.match(/<meta name="description" content="([^"]*)"/)?.[1] || '').trim();
  const robots = content.match(/<meta name="robots" content="([^"]*)"/)?.[1] || 'index,follow';
  const canonical = content.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const ogTitle = decode(content.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || '').trim();
  const ogDescription = decode(content.match(/<meta property="og:description" content="([^"]*)"/)?.[1] || '').trim();
  const ogUrl = content.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
  if (!title) fail('Missing <title> in ' + page);
  if ([...title].length > 60) fail('Title over 60 characters in ' + page + ' (' + [...title].length + ')');
  if (!description) fail('Missing meta description in ' + page);
  if ([...description].length > 155) fail('Description over 155 characters in ' + page + ' (' + [...description].length + ')');
  if (seenTitles.has(title)) fail('Duplicate title in ' + page + ' and ' + seenTitles.get(title));
  if (seenDescriptions.has(description)) fail('Duplicate description in ' + page + ' and ' + seenDescriptions.get(description));
  seenTitles.set(title, page);
  seenDescriptions.set(description, page);
  if ((content.match(/<h1\b/g) || []).length !== 1) fail('Expected exactly one h1 in ' + page);
  if (/noindex/i.test(robots)) continue;
  const expectedUrl = page === 'index.html' ? 'https://gastrobsc.com.br/' : 'https://gastrobsc.com.br/' + page;
  if (canonical !== expectedUrl) fail('Canonical of ' + page + ' must be ' + expectedUrl);
  if (ogUrl !== expectedUrl) fail('og:url of ' + page + ' must be ' + expectedUrl);
  if (ogTitle !== title) fail('og:title differs from title in ' + page);
  if (ogDescription !== description) fail('og:description differs from description in ' + page);
  if (!/<meta property="og:image" content="https:\/\/gastrobsc\.com\.br\/[^"]+"/.test(content)) fail('og:image missing in ' + page);
  indexablePages.push(expectedUrl);
}

// Sitemap: todas as páginas indexáveis, só elas, com lastmod em AAAA-MM-DD.
const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)];
for (const [, loc, lastmod] of sitemapUrls) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) fail('Invalid lastmod for ' + loc);
  if (!indexablePages.includes(loc)) fail('Sitemap URL without indexable page: ' + loc);
}
for (const url of indexablePages) {
  if (!sitemapUrls.some(item => item[1] === url)) fail('Indexable page missing from sitemap: ' + url);
}

// Arquivos de apoio: sem rede, sem módulos ES, sem URL externa em CSS.
const jsDir = 'dist/assets/js';
if (fs.existsSync(jsDir)) {
  for (const file of fs.readdirSync(jsDir).filter(item => item.endsWith('.js'))) {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    if (/^\s*(?:import|export)\s/m.test(code)) fail('ES module syntax in ' + file);
    if (/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\b|\beval\s*\(|new\s+Function\s*\(|\bimport\s*\(/.test(code)) fail('Network or dynamic-code API in ' + file);
    if (/https?:\/\/(?!wa\.me\/)/.test(code)) fail('External URL in ' + file);
  }
}
const cssFiles = ['dist/styles.css', 'dist/guia-cmv.css', ...(fs.existsSync('dist/assets/css') ? fs.readdirSync('dist/assets/css').filter(item => item.endsWith('.css')).map(item => 'dist/assets/css/' + item) : [])];
for (const file of cssFiles) {
  if (/@import|url\(\s*["']?(?:https?:)?\/\//i.test(fs.readFileSync(file, 'utf8'))) fail('External resource in ' + file);
}

// Guia CMV.
const guide = fs.readFileSync('dist/ficha-tecnica-prato-custo-cmv.html', 'utf8');
if (!guide.includes('name="robots" content="index,follow"')) fail('Approved guide must allow indexing');
if (!guide.includes('rel="canonical" href="https://gastrobsc.com.br/ficha-tecnica-prato-custo-cmv.html"')) fail('Guide canonical missing');
if (/Rascunho em revisão editorial/.test(guide)) fail('Draft notice remains in approved guide');
if (!sitemap.includes('https://gastrobsc.com.br/ficha-tecnica-prato-custo-cmv.html')) fail('Approved guide missing from sitemap');
if (/Controle editorial|autoria_sugerida|rascunho_para_revisao_de_Rafael/.test(guide)) fail('Private editorial metadata leaked');

// Home.
if (!html.includes('href="ficha-tecnica-prato-custo-cmv.html"')) fail('Landing guide link missing');
if (!html.includes('5512997710040')) fail('WhatsApp missing');
if (!html.includes('id="contato"')) fail('Home anchor #contato missing');
if (!html.includes('rel="canonical" href="https://gastrobsc.com.br/"')) fail('Canonical must use primary domain');
for (const file of ['index.html', 'sitemap.xml', 'robots.txt']) {
  if (fs.readFileSync('dist/' + file, 'utf8').includes('https://www.gastrobsc.com.br')) fail('Redirected hostname in ' + file);
}
console.log(JSON.stringify({ organizationJson: 'parseable', localAssets: 'valid', placeholders: 'none', csp: 'no inline script/style/handlers, no external resources', metadata: 'ok', pages: pages.length, sitemapUrls: sitemapUrls.length, bytes: Buffer.byteLength(html), cspHash: hash }));
