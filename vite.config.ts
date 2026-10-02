import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so it works at /Dhakar-Rasta/ on GitHub Pages
  server: { port: 5180, strictPort: false, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
