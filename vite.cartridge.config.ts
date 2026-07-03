import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './', // Vital for custom protocols (mnemo-plugin://) — assets must resolve relative to the entry html
  resolve: { alias: { '@': resolve(__dirname, 'src/renderer/src') } },
  root: 'src/renderer',
  build: { outDir: resolve(__dirname, 'dist'), emptyOutDir: true },
  server: { port: 5201, strictPort: true, host: '127.0.0.1', cors: true },
});
