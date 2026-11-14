import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const ui = fileURLToPath(new URL('../../packages/ui', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
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
