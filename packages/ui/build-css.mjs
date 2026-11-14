// Kompilasi SCSS ke CSS siap pakai + salin sumber SCSS untuk kustomisasi saat build.
import * as sass from 'sass';
import { cpSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';

// Selalu pakai token terbaru dari paket @unipo/tokens.
copyFileSync('../tokens/dist/_tokens.scss', 'scss/_tokens.scss');
mkdirSync('dist', { recursive: true });
for (const style of ['expanded', 'compressed']) {
  const r = sass.compile('scss/index.scss', { style, silenceDeprecations: ['global-builtin'] });
  writeFileSync(style === 'compressed' ? 'dist/ui-unipo.min.css' : 'dist/ui-unipo.css', r.css);
}
cpSync('scss', 'dist/scss', { recursive: true });
console.log('@unipo/ui: dist/ui-unipo.css, dist/ui-unipo.min.css, dist/scss/');
