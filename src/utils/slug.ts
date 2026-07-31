/**
 * Slugify a taxonomy term (tag or category) into a URL path segment.
 *
 * Deliberately mirrors Hugo's `MakePathSanitized`, which is what generated the
 * tag/category URLs before the April 2026 Astro migration: lowercase, runs of
 * whitespace collapsed to `-`, and everything outside `[a-z0-9._~-]` dropped.
 *
 * The migration switched these routes to the raw frontmatter string, which
 * silently changed every URL with a capital letter or a space (`/categories/kubernetes/`
 * became `/categories/Kubernetes/`, `/tags/developer-tools/` became
 * `/tags/developer%20tools/`) and 404'd ~58 URLs Google had already indexed.
 * Keeping the Hugo rules here restores them.
 *
 * Preserving `.` and `_` matters for `acme.sh`, `netboot.xyz`, `three.js`,
 * and `blog_meta` — Hugo kept those characters, so those URLs never broke.
 */
export function slugify(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._~-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}
