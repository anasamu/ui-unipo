import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: false,
  treeshake: true,
  splitting: true,
  external: ['react', 'react-dom', 'unipo-siakad-sdk'],
  // Semua komponen interaktif: aman dipakai langsung di Next.js App Router.
  // 'use client' ditambahkan oleh add-use-client.mjs setelah build.
});
