import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ui = fileURLToPath(new URL('../../packages/ui', import.meta.url));
const versi: string = JSON.parse(readFileSync(`${ui}/package.json`, 'utf8')).version;

export default defineConfig({
  base: './',
  plugins: [react()],
  // Lencana versi di bilah atas mengikuti packages/ui/package.json (dinaikkan oleh npm run versi).
  define: { __VERSI_UI__: JSON.stringify(versi) },
  resolve: {
    alias: [
      { find: /^unipo-ui\/scss$/, replacement: `${ui}/scss/index.scss` },
      { find: /^unipo-ui\/(.*)$/, replacement: `${ui}/src/$1/index.ts` },
      { find: /^unipo-ui$/, replacement: `${ui}/src/index.ts` },
    ],
  },
  css: { preprocessorOptions: { scss: { api: 'modern-compiler', silenceDeprecations: ['global-builtin'] } } },
  server: { port: 5180 },
});
