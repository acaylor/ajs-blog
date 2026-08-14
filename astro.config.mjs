import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? process.env.URL ?? 'https://blog.ayjc.net';

export default defineConfig({
  site,
  compressHTML: true,
  // Production (AWS Amplify / S3+CloudFront) serves directory-format output
  // and 301s the no-slash form. Astro's default ('ignore') lets the dev
  // server accept both, which is how no-slash internal links drifted in
  // unnoticed. 'always' makes dev fail the same way production redirects,
  // so bad internal links surface locally.
  trailingSlash: 'always',
  integrations: [sitemap()],
  server: {
    host: true,
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: 'solarized-light',
        dark: 'monokai',
      },
    },
  },
});
