#!/usr/bin/env node
/**
 * Validate amplify-redirects.json against the built site.
 *
 * The redirect list exists because the April 2026 Hugo->Astro migration changed
 * taxonomy URLs (see docs/astro-migration.md). It is a closed historical set — new
 * posts and new tags never need an entry, because terms are slugified from birth and
 * new pagination pages are just new files in dist/.
 *
 * What can still rot is the other direction: a rule pointing at a page that no longer
 * gets built. That happens when post counts fall below a pagination boundary, or when
 * a term is renamed or removed in frontmatter. Search Console is a terrible place to
 * find that out three months later, so check it at build time instead.
 *
 * Run after `npm run build`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const RULES = 'amplify-redirects.json';

const rules = JSON.parse(readFileSync(RULES, 'utf8'));
const errors = [];
const warnings = [];

/**
 * `/tags/foo/3/` — a pagination page. Whether page 3 exists depends on how many posts
 * currently carry the term, so it can legitimately come and go as the blog grows. Worth
 * reporting, not worth failing a build over.
 */
const isPaginated = (p) => /^\/(tags|categories)\/[^/]+\/\d+\/$/.test(p);

/** Does `dist/` contain something to serve at this path? */
function built(urlPath) {
  const p = decodeURIComponent(urlPath).replace(/^\/+/, '').replace(/\/+$/, '');
  if (p === '') return existsSync(join(DIST, 'index.html'));
  // A concrete file (/rss.xml, /404.html) or a directory index (/tags/foo/).
  return existsSync(join(DIST, p)) || existsSync(join(DIST, p, 'index.html'));
}

const isPattern = (s) => s.startsWith('<') || s.includes('<*>');

for (const { source, target, status } of rules) {
  const where = `${status} ${source} -> ${target}`;

  if (source === target) {
    errors.push(`self-redirect: ${where}`);
    continue;
  }

  // Only 301/302 targets have to be real pages. The catch-all's target is the 404
  // page, which is checked separately below.
  if (status === '301' || status === '302') {
    if (!isPattern(target) && !built(target)) {
      (isPaginated(target) ? warnings : errors).push(`target is not built: ${where}`);
    }
    // A source that also exists as a real page means the rule shadows live content:
    // visitors and crawlers get a redirect instead of the page sitting right there.
    if (!isPattern(source) && built(source)) {
      errors.push(`source shadows a built page: ${where}`);
    }
  }
}

// The catch-all must serve a page that exists, with a status that actually returns 404.
// Amplify's `404` performs a redirect; only `404-200` rewrites in place. Getting this
// wrong turns every dead URL into a soft 404, which is the thing this file exists to stop.
const catchAll = rules.at(-1);
if (!catchAll || !/^404/.test(catchAll.status)) {
  errors.push('last rule is not a 404 catch-all');
} else {
  if (catchAll.status !== '404-200') {
    errors.push(
      `catch-all status is "${catchAll.status}", expected "404-200" (a plain "404" redirects, producing a soft 404)`,
    );
  }
  if (!built(catchAll.target)) errors.push(`catch-all target is not built: ${catchAll.target}`);
}

// Sources with a space must be percent-encoded: Amplify matches the raw request path,
// so a literal space silently never matches. nginx.conf is the opposite and wants the
// literal space — the two files legitimately differ here.
for (const { source } of rules) {
  if (!isPattern(source) && / /.test(source)) {
    errors.push(`source has a literal space, needs %20: ${source}`);
  }
}

if (warnings.length) {
  console.warn(`\n${warnings.length} pagination target(s) not currently built:\n`);
  for (const w of warnings) console.warn(`  ${w}`);
  console.warn(
    '\nThese redirect to a page that does not exist right now, so they 301 into a 404.\n' +
      'Expected if the term is below a pagination boundary and you are about to publish\n' +
      'more posts under it. If that is not the case, retarget the rule at the term root.\n',
  );
}

if (errors.length) {
  console.error(`\n${errors.length} redirect problem(s):\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error('');
  process.exit(1);
}

console.log(
  `amplify-redirects.json: ${rules.length} rules ok` +
    (warnings.length ? `, ${warnings.length} pagination warning(s)` : ''),
);
