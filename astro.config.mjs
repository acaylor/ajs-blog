import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? process.env.URL ?? 'https://blog.ayjc.net';

export default defineConfig({
  site,
  integrations: [sitemap()],
  server: {
    host: true,
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
