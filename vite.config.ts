import { defineConfig } from 'vite';

// './' → relative asset URLs, works for GitHub project pages
// https://user.github.io/repo-name/
export default defineConfig({
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4188,
    strictPort: true,
  },
  css: {
    transformer: 'postcss',
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    cssMinify: false,
  },
});
