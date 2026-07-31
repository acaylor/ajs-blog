import type { CollectionEntry } from 'astro:content';
import { slugify } from './slug';

type BlogPost = CollectionEntry<'blog'>;
type TaxonomyKey = 'tags' | 'categories';

export interface TaxonomyGroup {
  /** URL path segment, e.g. `developer-tools`. */
  slug: string;
  /** Human-readable label — the spelling used by the most posts. */
  display: string;
  /** Every post whose term slugifies to `slug`, newest first. */
  posts: BlogPost[];
}

/**
 * Group posts by slugified taxonomy term.
 *
 * Terms that differ only by case or separator collapse into one group, so
 * `macOS`/`macos` and `claude code`/`claude-code` each resolve to a single
 * route containing every matching post rather than fragmenting across two.
 * The displayed label is whichever spelling the most posts use, ties broken
 * alphabetically for a stable build.
 */
export function groupBySlug(posts: BlogPost[], key: TaxonomyKey): TaxonomyGroup[] {
  const groups = new Map<string, { spellings: Map<string, number>; posts: BlogPost[] }>();

  for (const post of posts) {
    // A post carrying both `macOS` and `macos` must only be counted once per group.
    const seen = new Set<string>();
    for (const term of post.data[key] ?? []) {
      const slug = slugify(term);
      if (!slug) continue;

      let group = groups.get(slug);
      if (!group) {
        group = { spellings: new Map(), posts: [] };
        groups.set(slug, group);
      }
      group.spellings.set(term, (group.spellings.get(term) ?? 0) + 1);
      if (!seen.has(slug)) {
        seen.add(slug);
        group.posts.push(post);
      }
    }
  }

  return [...groups.entries()]
    .map(([slug, { spellings, posts: grouped }]) => ({
      slug,
      display: [...spellings.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      )[0][0],
      posts: grouped.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()),
    }))
    .sort((a, b) => b.posts.length - a.posts.length || a.display.localeCompare(b.display));
}
