#!/usr/bin/env node
/**
 * Catch internal links that cost a redirect hop, or that point nowhere at all.
 *
 * lychee checks that links resolve, but a link that resolves via a 301 still resolves —
 * it just costs a round trip on every crawl and every click. Two ways that happens here:
 *
 *   1. A root-relative link with no trailing slash and no file extension. Amplify 301s
 *      every such path to the slash-terminated form (see nginx.conf / amplify.yml), so
 *      `/posts/foo` always redirects to `/posts/foo/` even though the page itself is fine.
 *   2. A link that happens to match a `source` in amplify-redirects.json — i.e. it targets
 *      one of the historical Hugo-era URLs on purpose or by copy-paste, and will 301 to
 *      the current URL instead of linking straight to it.
 *
 * Anything that isn't one of those but still doesn't exist in dist/ is just a broken link;
 * report it too since it's the same class of problem for this script's purposes (lychee will
 * catch it too, but this is cheaper to run and gives clearer file attribution).
 *
 * Run after `npm run build`.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const REDIRECTS = 'amplify-redirects.json';
const MAX_FILES_SHOWN = 5;

if (!existsSync(DIST)) {
  console.error(`\n${DIST}/ not found. Run \`npm run build\` first.\n`);
  process.exit(1);
}

/** Same test as check-redirects.mjs: wildcard (`<*>`) and regex (`</.../>`) sources aren't
 * literal paths, so they can't be compared against a link with string equality. */
const isPattern = (s) => s.startsWith('<') || s.includes('<*>');

const redirectRules = JSON.parse(readFileSync(REDIRECTS, 'utf8'));
const literalSources = new Map(); // decoded source path -> { target, status }
for (const rule of redirectRules) {
  if (isPattern(rule.source)) continue;
  literalSources.set(decodeURIComponent(rule.source), rule);
}

/** Recursively collect every .html file under dir, relative to the repo root. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile() && p.endsWith('.html')) out.push(p);
  }
  return out;
}

// href="..." / src="..." — the build output is Astro-generated HTML, always
// double-quoted, so this simple attribute scan is enough; no need for a full parser.
const ATTR_RE = /\b(?:href|src)="([^"]*)"/g;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/; // http:, https:, mailto:, tel:, data:, ...

function isInScope(url) {
  if (url === '') return false;
  if (url.startsWith('#')) return false; // pure in-page fragment
  if (url.startsWith('//')) return false; // protocol-relative
  if (SCHEME_RE.test(url)) return false; // has a scheme
  return url.startsWith('/'); // only root-relative internal links are ours to check
}

/** dist/-relative filesystem path for a decoded, leading-slash-stripped URL path. */
const distPath = (p) => decodeURIComponent(p).replace(/^\/+/, '');

// Collect every distinct link path -> the dist/ files it was found in. A Set, because
// the same link usually appears several times in one page (nav, body, footer) and the
// failure report should count pages to fix, not raw occurrences.
const linkFiles = new Map();
for (const file of walk(DIST)) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(ATTR_RE)) {
    const url = match[1];
    if (!isInScope(url)) continue;
    const path = url.split('#')[0].split('?')[0];
    if (!linkFiles.has(path)) linkFiles.set(path, new Set());
    linkFiles.get(path).add(file);
  }
}

const errors = [];

function formatFiles(files) {
  if (files.length <= MAX_FILES_SHOWN) return files.join(', ');
  const shown = files.slice(0, MAX_FILES_SHOWN).join(', ');
  return `${shown}, … and ${files.length - MAX_FILES_SHOWN} more`;
}

for (const path of [...linkFiles.keys()].sort()) {
  const files = [...linkFiles.get(path)].sort();
  const where = `${path} (${files.length} file${files.length === 1 ? '' : 's'}: ${formatFiles(files)})`;

  const decoded = decodeURIComponent(path);
  const redirect = literalSources.get(decoded);
  if (redirect) {
    errors.push(
      `redirect source: ${where} matches amplify-redirects.json and 301s to ${redirect.target} — link directly to the target instead`,
    );
    continue;
  }

  if (path === '/' || path.endsWith('/')) {
    if (!existsSync(join(DIST, distPath(path), 'index.html'))) {
      errors.push(`missing: ${where} has no matching page in dist/`);
    }
    continue;
  }

  const lastSegment = path.slice(path.lastIndexOf('/') + 1);
  if (lastSegment.includes('.')) {
    if (!existsSync(join(DIST, distPath(path)))) {
      errors.push(`missing: ${where} has no matching file in dist/`);
    }
    continue;
  }

  // No trailing slash, no extension: this is a page URL, but not the one Amplify serves
  // without a hop.
  errors.push(`redirect hop: ${where} has no trailing slash — link to ${path}/ instead`);
}

if (errors.length) {
  console.error(`\n${errors.length} link problem(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`check-links: ${linkFiles.size} distinct internal link(s) ok`);
