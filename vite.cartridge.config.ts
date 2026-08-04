import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM config (package.json "type":"module") — derive the dir from import.meta so
// the CJS build of Vite's Node API is no longer loaded (silences its deprecation
// warning), and __dirname stays available for absolute path resolution.
const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './', // Vital for custom protocols (mnemo-plugin://) — assets must resolve relative to the entry html
  resolve: { alias: { '@': resolve(rootDir, 'src/renderer/src') } },
  root: 'src/renderer',
  build: { outDir: resolve(rootDir, 'dist'), emptyOutDir: true },
  server: { port: 5201, strictPort: true, host: '127.0.0.1', cors: true },
});
