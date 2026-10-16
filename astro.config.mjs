import { defineConfig } from 'astro/config';

// SITE_URL is only set when a publication target is chosen (none yet).
export default defineConfig({
  site: process.env.SITE_URL,
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    // Never inline fonts as data: URIs (the 2 KB wordmark font would be): the CSP allows
    // fonts from 'self' only.
    build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
  },
});
