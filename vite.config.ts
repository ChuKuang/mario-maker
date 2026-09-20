import { defineConfig } from 'vite';

// BASE_PATH: GitHub project pages need './' or '/repo-name/'
// Relative './' works for both local preview and Pages.
export default defineConfig({
  base: process.env.BASE_PATH || './',
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
