import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths: works at any host path
  server: { port: 5180, strictPort: false, open: false },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
});
