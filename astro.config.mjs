import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  site: 'https://ramintavakoli82-spec.github.io',
  base: '/artphase-website',

  integrations: [
    mdx(),
    sitemap()
  ],

  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex]
  },

  vite: {
    optimizeDeps: {
      noDiscovery: true
    }
  }
});