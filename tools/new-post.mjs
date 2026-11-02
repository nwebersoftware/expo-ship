#!/usr/bin/env node
// Add a post to booleanbuild.com and keep the four places in sync.
//
//   node tools/new-post.mjs post.json     # write the post + update index, feed, sitemap
//   node tools/new-post.mjs --check       # verify the four places agree with posts/
//
// post.json:
//   { "slug": "foo-bar", "title": "...", "description": "...", "date": "2026-10-30",
//     "body": "<p>...</p><h2>...</h2><p>...</p>", "ogImage": "/assets/og/default.png" }
//
// The site has no build step, so a post lives in four files: the HTML, the card in index.html,
// an <item> in feed.xml and a <url> in sitemap.xml. Hand-editing four places is how a blog ends up
// with posts nobody can find; this script is the one path.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------------------------------------------------------------- check mode
if (process.argv.includes('--check')) {
  const posts = readdirSync(join(ROOT, 'posts')).filter((f) => f.endsWith('.html'));
  const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const feed = readFileSync(join(ROOT, 'feed.xml'), 'utf8');
  const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
  let bad = 0;
  for (const p of posts) {
    const missing = [];
    if (!index.includes(`posts/${p}`)) missing.push('index.html');
    if (!feed.includes(`posts/${p}`)) missing.push('feed.xml');
    if (!sitemap.includes(`posts/${p}`)) missing.push('sitemap.xml');
    if (missing.length) { bad++; console.log(`✗ ${p} missing from ${missing.join(', ')}`); }
  }
  console.log(bad ? `\n${bad} post(s) out of sync` : `✓ ${posts.length} posts, all four places in sync`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- write mode
const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error('usage: new-post.mjs <post.json> | --check');
  process.exit(1);
}
const p = JSON.parse(readFileSync(file, 'utf8'));
for (const k of ['slug', 'title', 'description', 'date', 'body']) {
  if (!p[k]) { console.error(`post.json missing "${k}"`); process.exit(1); }
}
if (!/^[a-z0-9-]+$/.test(p.slug)) { console.error('slug must be lowercase letters, digits, dashes'); process.exit(1); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) { console.error('date must be YYYY-MM-DD'); process.exit(1); }

const url = `https://booleanbuild.com/posts/${p.slug}.html`;
const ogImage = p.ogImage || '/assets/og/default.png';
const ogImageAbs = ogImage.startsWith('http') ? ogImage : `https://booleanbuild.com${ogImage}`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(p.title)}</title>
  <meta name="description" content="${esc(p.description)}" />
  <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${esc(p.title)}" />
  <meta property="og:description" content="${esc(p.description)}" />
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BlogPosting","headline":"${esc(p.title)}","datePublished":"${p.date}","author":{"@type":"Organization","name":"Boolean Build"},"publisher":{"@type":"Organization","name":"Boolean Build","url":"https://booleanbuild.com/","parentOrganization":{"@type":"Organization","name":"Boolean Bros LLC","url":"https://booleanbros.com/"},"sameAs":["https://booleanbros.com/"]},"mainEntityOfPage":"${url}"}
  </script>
  <link rel="stylesheet" href="../style.css" />
  <meta property="og:image" content="${ogImageAbs}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <script>window.goatcounter = { path: function (p) { return "/build" + p; } };</script>
  <script data-goatcounter="https://booleanbros.goatcounter.com/count" async src="/assets/js/goatcounter-count.js"></script>
</head>
<body>
  <div class="wrap">
    <header>
      <a class="brand" href="../">Boolean <span>Build</span></a>
      <nav><a href="../#posts">Posts</a><a href="../tools.html">Tools</a><a href="../products.html">Products</a><a href="../#subscribe">Subscribe</a><a href="../about.html">About</a><a href="https://github.com/nwebersoftware" rel="me">GitHub</a></nav>
    </header>

    <main>

      <h1>${esc(p.title)}</h1>

${p.body.trim().split('\n').map((l) => '      ' + l).join('\n')}

    </main>

    <footer>© 2026 Boolean Build — a <a href="https://booleanbros.com/">Boolean Bros</a> project.</footer>
  </div>
</body>
</html>
`;

const postPath = join(ROOT, 'posts', `${p.slug}.html`);
if (existsSync(postPath)) { console.error(`posts/${p.slug}.html already exists`); process.exit(1); }
writeFileSync(postPath, html);

// index.html: newest first, inside <ul class="post-list">
const indexPath = join(ROOT, 'index.html');
let index = readFileSync(indexPath, 'utf8');
const card = `        <li>
          <h3><a href="posts/${p.slug}.html">${esc(p.title)}</a></h3>
          <p class="lead" style="font-size:16px">${esc(p.description)}</p>
        </li>
`;
const listAnchor = index.indexOf('<ul class="post-list">');
if (listAnchor === -1) { console.error('index.html: <ul class="post-list"> not found'); process.exit(1); }
const insertAt = listAnchor + '<ul class="post-list">'.length;
index = index.slice(0, insertAt) + '\n' + card + index.slice(insertAt).replace(/^\n/, '');
writeFileSync(indexPath, index);

// feed.xml: newest first
const feedPath = join(ROOT, 'feed.xml');
let feed = readFileSync(feedPath, 'utf8');
const d = new Date(`${p.date}T18:30:00-05:00`);
const rfc822 = d.toUTCString().replace('GMT', '-0500');
const item = `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${rfc822}</pubDate>
      <description>${esc(p.description)}</description>
    </item>
`;
const channelAnchor = feed.indexOf('<item>');
if (channelAnchor === -1) { console.error('feed.xml: no <item> to anchor on'); process.exit(1); }
feed = feed.slice(0, channelAnchor) + item + feed.slice(channelAnchor);
writeFileSync(feedPath, feed);

// sitemap.xml: append before </urlset>
const sitemapPath = join(ROOT, 'sitemap.xml');
let sitemap = readFileSync(sitemapPath, 'utf8');
const entry = `  <url><loc>${url}</loc><lastmod>${p.date}</lastmod></url>\n`;
sitemap = sitemap.replace('</urlset>', entry + '</urlset>');
writeFileSync(sitemapPath, sitemap);

console.log(`✓ posts/${p.slug}.html`);
console.log('✓ index.html card, feed.xml item, sitemap.xml entry');
console.log(`  ${url}`);
