// scripts/fetch-fonts.mjs — one-shot: self-host the three variable fonts.
// Pulls the per-subset woff2 from Fontsource (via jsDelivr, OFL licensed),
// mirrors Google's unicode-range subsetting, and writes css/fonts.css.
// Uses curl (with retries) instead of undici fetch — curl handles IPv6-first
// networks reliably, where node's fetch can ETIMEDOUT.
// Run: node scripts/fetch-fonts.mjs
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = 'https://cdn.jsdelivr.net/npm/@fontsource-variable';
const FAMILIES = [
  { id: 'inter', name: 'Inter' },
  { id: 'jetbrains-mono', name: 'JetBrains Mono' },
  { id: 'space-grotesk', name: 'Space Grotesk' },
];
const SUBSETS = new Set(['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext']);

function curl(url, { binary = false, tries = 4 } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const args = ['-s', '-m', '30', '--retry', '2', '-f', '-L', url];
      if (!binary) args.push('-H', 'Accept: text/css');
      return execFileSync('curl', args, {
        maxBuffer: 20 * 1024 * 1024,
        encoding: binary ? 'buffer' : 'utf8',
      });
    } catch (e) {
      if (i === tries) throw e;
    }
  }
}

fs.mkdirSync('assets/fonts', { recursive: true });

const out = [
  '/* Self-hosted variable fonts (Fontsource via jsDelivr, OFL licensed).',
  ' * Replaces the fonts.googleapis.com stylesheet: identical unicode-range',
  ' * on-demand subsetting, but same-origin - no third-party DNS/TLS round-trips,',
  ' * no render-blocking external CSS, fully preloaded + cacheable.',
  ' * Regenerate with: node scripts/fetch-fonts.mjs */',
];

let total = 0;
const files = [];

for (const fam of FAMILIES) {
  // index.css holds every unicode-range subset of the variable font in one file:
  //   /* inter-latin-wght-normal */ @font-face { ... src: url(./files/inter-...woff2) ... }
  const cssUrl = `${BASE}/${fam.id}@5/index.css`;
  let css;
  try {
    css = curl(cssUrl);
  } catch (e) {
    console.log('ERR css', cssUrl, String(e).slice(0, 60));
    continue;
  }

  const blockRe = /\/\*\s*([a-z0-9-]+)-wght-(normal|italic)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = blockRe.exec(css)) !== null) {
    // comment format: "{family}-{subset}-wght-{style}" → strip the family prefix
    const subset = m[1].slice(fam.id.length + 1),
      style = m[2],
      body = m[3];
    if (!SUBSETS.has(subset) || style !== 'normal') continue;

    const ur = (body.match(/unicode-range:\s*([^;]+);/) || [])[1];
    const weight = (body.match(/font-weight:\s*([^;]+);/) || [])[1];
    const fileRef = (body.match(/src:\s*url\(([^)]+)\)/) || [])[1];
    if (!ur || !fileRef) {
      console.log('MISS parse', fam.id, subset);
      continue;
    }

    const fileUrl = `${BASE}/${fam.id}@5/${fileRef.replace(/^\.\//, '')}`;
    const local = `${fam.id}-${subset}.woff2`;
    let buf;
    try {
      buf = curl(fileUrl, { binary: true });
    } catch (e) {
      console.log('ERR bin', fileUrl, String(e).slice(0, 60));
      continue;
    }

    if (buf.length < 1000 || buf.slice(0, 4).toString() !== 'wOF2') {
      console.log('BAD bin', fileUrl, buf.length);
      continue;
    }

    fs.writeFileSync('assets/fonts/' + local, buf);
    total += buf.length;
    files.push(`${local} ${Math.round(buf.length / 1024)}KB`);
    out.push(
      '',
      `/* ${fam.name} - ${subset} */`,
      '@font-face {',
      `  font-family: '${fam.name}';`,
      '  font-style: normal;',
      `  font-weight: ${weight || '400 700'};`,
      '  font-display: swap;',
      `  src: url(../assets/fonts/${local}) format('woff2-variations');`,
      `  unicode-range: ${ur};`,
      '}'
    );
    // Write incrementally: a killed run keeps the progress it already made.
    fs.writeFileSync('css/fonts.css', out.join('\n') + '\n');
  }
}

fs.writeFileSync('css/fonts.css', out.join('\n') + '\n');
console.log(`DONE files=${files.length} totalKB=${Math.round(total / 1024)}`);
console.log(files.join('\n'));
