import { getCollection } from 'astro:content';

interface BlogStats {
  postCount: number;
  uptimeDays: number;
  firstPostYmd: string;
}

let cached: BlogStats | null = null;

export async function getBlogStats(): Promise<BlogStats> {
  if (cached) return cached;
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const first = posts.reduce((min, p) => Math.min(min, p.data.date.valueOf()), Date.now());
  cached = {
    postCount: posts.length,
    uptimeDays: Math.floor((Date.now() - first) / 86_400_000),
    firstPostYmd: new Date(first).toISOString().slice(0, 10),
  };
  return cached;
}
