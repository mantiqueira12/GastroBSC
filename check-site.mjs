import fs from 'node:fs';
import crypto from 'node:crypto';
const html = fs.readFileSync('dist/index.html', 'utf8');
const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
JSON.parse(script);
const hash = 'sha256-' + crypto.createHash('sha256').update(script).digest('base64');
const headers = fs.readFileSync('dist/_headers', 'utf8').replace('sha256-PLACEHOLDER', hash);
fs.writeFileSync('dist/_headers', headers);
for (const page of ['index.html', 'privacidade.html']) {
  const content = fs.readFileSync('dist/' + page, 'utf8');
  for (const match of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const value = match[1];
    if (!value.startsWith('#') && !value.startsWith('http') && !value.startsWith('mailto:') && value !== '/') {
      if (!fs.existsSync('dist/' + value)) throw new Error('Missing asset: ' + value);
    }
  }
  if (/PLACEHOLDER|XXXXXXXX|\[REQUER/.test(content)) throw new Error('Placeholder in ' + page);
}
if ((html.match(/<h1>/g) || []).length !== 1) throw new Error('Expected one h1');
if (!html.includes('5512997710040')) throw new Error('WhatsApp missing');
console.log(JSON.stringify({ schema: 'valid', localAssets: 'valid', placeholders: 'none', bytes: Buffer.byteLength(html), cspHash: hash }));
