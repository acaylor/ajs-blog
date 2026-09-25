import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

/** Whole-list facts for the journalctl header and per-year separators. */
export interface JournalSummary {
  first: string;
  last: string;
  total: number;
  /** entries per year, e.g. { "2025": 41 } */
  years: Record<string, number>;
}

export function journalSummary(posts: BlogPost[]): JournalSummary {
  const times = posts.map((p) => p.data.date.valueOf());
  const years: Record<string, number> = {};
  for (const p of posts) {
    const y = String(p.data.date.getUTCFullYear());
    years[y] = (years[y] ?? 0) + 1;
  }
  return {
    first: new Date(Math.min(...times)).toISOString().slice(0, 10),
    last: new Date(Math.max(...times)).toISOString().slice(0, 10),
    total: posts.length,
    years,
  };
}
