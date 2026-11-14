// esbuild membuang direktif 'use client' saat bundling; tambahkan lagi di awal setiap berkas JS hasil build
// supaya komponen bisa diimpor langsung dari Server Component Next.js.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
for (const f of readdirSync('dist')) {
  if (!/\.(c?js)$/.test(f)) continue;
  const p = `dist/${f}`;
  const src = readFileSync(p, 'utf8');
  if (!src.startsWith("'use client'")) writeFileSync(p, `'use client';\n${src}`);
}
