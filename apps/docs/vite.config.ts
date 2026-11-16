import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { buatPetaSdk } from './scripts/peta-sdk.mjs';

const ui = fileURLToPath(new URL('../../packages/ui', import.meta.url));
const versi: string = JSON.parse(readFileSync(`${ui}/package.json`, 'utf8')).version;

// virtual:peta-sdk = nama ekspor unipo-ui → endpoint/metode SDK yang dipanggilnya (tab sdk.ts di "Lihat kode").
const ID_PETA = '\0virtual:peta-sdk';
const petaSdk = () => ({
  name: 'peta-sdk',
  resolveId: (id: string) => (id === 'virtual:peta-sdk' ? ID_PETA : null),
  load: (id: string) => (id === ID_PETA ? `export default ${JSON.stringify(buatPetaSdk(`${ui}/src`))};` : null),
});

export default defineConfig({
  base: './',
  plugins: [react(), petaSdk()],
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
