import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const projectRoot = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: resolve(projectRoot, 'src/renderer'),
  base: './',
  build: { outDir: resolve(projectRoot, 'dist/renderer'), emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
