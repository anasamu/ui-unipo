// Bangun dist/registry.json: peta ekspor → berkas sumber dan dependensi tiap berkas.
// Dipakai CLI `npx unipo-ui add` untuk menyalin sumber komponen beserta dependensinya.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';

const root = 'src';
const files = {};
const exportsMap = {};
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|ts)$/.test(f) && !/index\.ts$/.test(f)) scan(p);
  }
}
function scan(p) {
  const rel = relative(root, p).split('\\').join('/');
  const src = readFileSync(p, 'utf8');
  const ex = [...src.matchAll(/^export (?:declare )?(?:function|const|class|interface|type|enum) (\w+)/gm)].map((m) => m[1]);
  const imports = [...src.matchAll(/^import [^;]*? from '([^']+)';/gm)].map((m) => m[1]);
  const local = imports.filter((i) => i.startsWith('.')).map((i) => {
    const r = posix.normalize(posix.join(posix.dirname(rel), i));
    for (const ext of ['.tsx', '.ts']) {
      try { statSync(join(root, r + ext)); return r + ext; } catch {}
    }
    return r;
  });
  const npm = [...new Set(imports.filter((i) => !i.startsWith('.')).map((i) => (i.startsWith('@') ? i.split('/').slice(0, 2).join('/') : i.split('/')[0])))];
  files[rel] = { exports: ex, local, npm };
  for (const e of ex) exportsMap[e] = rel;
}
walk(root);
mkdirSync('dist', { recursive: true });
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const versions = { ...pkg.devDependencies, ...pkg.dependencies };
writeFileSync('dist/registry.json', JSON.stringify({ version: pkg.version, versions, files, exports: exportsMap }, null, 1));
console.log(`registry: ${Object.keys(files).length} berkas, ${Object.keys(exportsMap).length} ekspor`);
