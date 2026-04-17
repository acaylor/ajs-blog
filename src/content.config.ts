import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    author: z.string().optional(),
    draft: z.boolean().optional().default(false),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    image: z.string().optional(),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
