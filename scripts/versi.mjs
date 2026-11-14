#!/usr/bin/env node
// Naikkan versi unipo-ui dan unipo-ui-tokens bersama-sama, lalu siapkan judul CHANGELOG.
//   npm run versi -- patch      (1.0.2 -> 1.0.3)
//   npm run versi -- minor      (1.0.2 -> 1.1.0)
//   npm run versi -- 2.0.0
// Setelah PR berisi perubahan versi ini di-merge ke main, workflow Rilis menerbitkan ke npm,
// membuat tag vX.Y.Z, dan GitHub Release secara otomatis.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const arg = process.argv[2];
const baca = (f) => JSON.parse(readFileSync(f, 'utf8'));

const ui = baca('packages/ui/package.json');
const lama = ui.version;
const [ma, mi, pa] = lama.split('.').map(Number);
const baru =
  arg === 'patch' ? `${ma}.${mi}.${pa + 1}` :
  arg === 'minor' ? `${ma}.${mi + 1}.0` :
  arg === 'major' ? `${ma + 1}.0.0` :
  /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(arg ?? '') ? arg : null;
if (!baru) {
  console.error('Pakai: npm run versi -- patch | minor | major | X.Y.Z');
  process.exit(1);
}

for (const f of ['package.json', 'packages/tokens/package.json', 'packages/ui/package.json']) {
  // Ganti teks saja agar format file tidak berubah.
  const isi = readFileSync(f, 'utf8')
    .replace(/("version":\s*")[^"]+"/, `$1${baru}"`)
    .replace(/("unipo-ui-tokens":\s*")[^"]+"/, `$1${baru}"`);
  writeFileSync(f, isi);
}
execSync('npm install --package-lock-only --no-audit --no-fund --ignore-scripts', { stdio: 'inherit' });

const log = readFileSync('CHANGELOG.md', 'utf8');
if (!log.includes(`## ${baru} `)) {
  const tgl = new Date().toISOString().slice(0, 10);
  writeFileSync('CHANGELOG.md', log.replace(/\n## /, `\n## ${baru} (${tgl})\n\n- \n\n## `));
}
console.log(`Versi ${lama} -> ${baru}. Isi catatan di CHANGELOG.md, commit, lalu buka PR ke main.`);
