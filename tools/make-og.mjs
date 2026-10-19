#!/usr/bin/env node
/**
 * Generates 1200x630 social cards for every post + the homepage, writes them to
 * assets/og/, and injects og:image / twitter:card meta into each page.
 *
 * Run: node tools/make-og.mjs   (requires Chrome on :9333)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'og');
mkdirSync(OUT, { recursive: true });

const pages = [
  { file: 'index.html', slug: 'home', title: 'Shipping Expo & React Native apps', kicker: 'Boolean Build' },
  ...readdirSync(join(ROOT, 'posts'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => ({ file: `posts/${f}`, slug: basename(f, '.html') })),
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card({ kicker, title, date }) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#0a0c14;color:#f5f7ff;position:relative;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    background-image:radial-gradient(900px 480px at 82% -12%, rgba(56,225,255,.18), transparent 62%),radial-gradient(700px 420px at -8% 110%, rgba(46,230,166,.12), transparent 60%);}
  .frame{position:absolute;inset:36px;border:1px solid #232c44}
  .kicker{position:absolute;top:78px;left:80px;font-family:ui-monospace,Menlo,monospace;font-size:17px;
    letter-spacing:.28em;text-transform:uppercase;color:#38e1ff}
  h1{position:absolute;top:150px;left:74px;right:86px;font-size:${title.length > 62 ? 62 : title.length > 40 ? 74 : 88}px;
    line-height:1.06;letter-spacing:-2.2px;font-weight:800}
  .date{position:absolute;bottom:78px;left:80px;font-family:ui-monospace,Menlo,monospace;font-size:16px;
    letter-spacing:.22em;text-transform:uppercase;color:#93a0c0}
  .brand{position:absolute;bottom:72px;right:80px;font-size:24px;font-weight:800;letter-spacing:-.4px}
  .brand span{color:#38e1ff}
  </style></head><body>
  <div class="frame"></div>
  <div class="kicker">${esc(kicker)}</div>
  <h1>${esc(title)}</h1>
  <div class="date">${esc(date || 'booleanbuild.com')}</div>
  <div class="brand">Boolean <span>Build</span></div>
  </body></html>`;
}

const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const t = list.find((x) => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const p = new Map(); const ev = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && p.has(m.id)) { const q = p.get(m.id); p.delete(m.id); m.error ? q.rej(new Error(JSON.stringify(m.error))) : q.res(m.result); }
  else if (m.method && ev.has(m.method)) { ev.get(m.method)(); ev.delete(m.method); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; p.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const wait = (n) => new Promise((r) => ev.set(n, r));

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });

let made = 0;
for (const page of pages) {
  const html = readFileSync(join(ROOT, page.file), 'utf8');
  const title = page.title || (html.match(/<title>([^<]*)<\/title>/) || [])[1] || 'Boolean Build';
  const date = (html.match(/"datePublished":"([^"]+)"/) || [])[1] || '';
  const tmp = '/tmp/og-card.html';
  writeFileSync(tmp, card({ kicker: page.slug === 'home' ? 'Boolean Build' : 'Boolean Build · Notes', title: title.split(' — ')[0], date }));

  const loaded = wait('Page.loadEventFired');
  await send('Page.navigate', { url: `file://${tmp}` });
  await loaded;
  await new Promise((r) => setTimeout(r, 220));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${page.slug}.png`), Buffer.from(shot.data, 'base64'));
  made++;

  // inject meta if missing
  let src = html;
  if (!src.includes('og:image')) {
    const url = `https://booleanbuild.com/assets/og/${page.slug}.png`;
    src = src.replace(
      /<\/head>/,
      `  <meta property="og:image" content="${url}" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta name="twitter:card" content="summary_large_image" />\n</head>`
    );
    writeFileSync(join(ROOT, page.file), src);
  }
}
console.log(`generated ${made} cards, meta injected where missing`);
ws.close();
process.exit(0);
