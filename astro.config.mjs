import { defineConfig } from 'astro/config';

// SITE_URL is only set when a publication target is chosen (none yet).
export default defineConfig({
  site: process.env.SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file' },
});
