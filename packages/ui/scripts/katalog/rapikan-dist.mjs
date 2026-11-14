// Potongan katalog per modul (dist/<modul>-HASH.js) hanya berisi JSON: buang sourcemap-nya supaya paket tetap ringan.
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const modul = JSON.parse(readFileSync('src/katalog/data/indeks.json', 'utf8')).modul.map((m) => m.key);
const pola = new RegExp(`^(${modul.map((k) => k.replace(/[-]/g, '\\-')).join('|')})-[A-Z0-9]{8}\\.(c?js)$`);
let n = 0;
for (const f of readdirSync('dist')) {
  if (!pola.test(f)) continue;
  const p = join('dist', f);
  writeFileSync(p, readFileSync(p, 'utf8').replace(/\n\/\/# sourceMappingURL=.*$/m, ''));
  rmSync(`${p}.map`, { force: true });
  n++;
}
console.log(`katalog: ${n} potongan modul tanpa sourcemap`);
