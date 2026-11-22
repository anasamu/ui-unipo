// periksa-katalog: setiap sumber katalog yang dipasang aplikasi harus ada di katalog unipo-ui yang terpasang.
//
// Tanpa pemeriksaan ini, <KelolaSumber sumber="/v1/spmi/alur"> baru gagal saat halaman dibuka di produksi
// ("Katalog tidak dapat dimuat — Sumber "/v1/spmi/alur" tidak ada di katalog.") bila katalog unipo-ui dibuat dari
// OpenAPI SIAKAD yang lebih lama daripada endpoint yang dipakai aplikasi.
//
//   npx unipo-ui periksa-katalog            pindai src/ (kode 1 bila ada sumber yang tidak ada di katalog)
//   npx unipo-ui periksa-katalog src lain   folder lain
//   npx unipo-ui periksa-katalog --json     keluaran mesin
//   --indeks <indeks.json>                  katalog lain (bawaan: katalog paket unipo-ui ini)
//
// Yang dipindai: sumber="/v1/..", sumber={'/v1/..'}, sumber={`/v1/..`}, sumber: '/v1/..', useSumber('/v1/..'), dan
// <HalamanModul modul="..">. Literal templat (`/v1/lppm/${x}`) dicocokkan sebagai pola satu segmen; yang tidak bisa
// dipastikan dilaporkan sebagai "dinamis" (tidak menggagalkan).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR_PAKET = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const INDEKS_BAWAAN = join(AKAR_PAKET, 'src', 'katalog', 'data', 'indeks.json');

const EKSTENSI = /\.(tsx?|jsx?|mdx)$/;
const LEWATI = /^(node_modules|dist|build|vendor|\.git|coverage)$/;

const POLA_SUMBER = [
  /\bsumber\s*=\s*\{?\s*(["'`])(\/v1\/[^"'`]*)\1/g,
  /\bsumber\s*:\s*(["'`])(\/v1\/[^"'`]*)\1/g,
  /\buseSumber\(\s*(["'`])(\/v1\/[^"'`]*)\1/g,
];
const POLA_MODUL = /<HalamanModul\b[^>]*?\bmodul\s*=\s*\{?\s*(["'`])([^"'`]+)\1/g;

/** Path dengan parameter diseragamkan: {id}, ${x}, dan angka menjadi {}. */
export const normalPath = (p) => p.replace(/\$\{[^}]*\}/g, '{}').replace(/\{[^}]*\}/g, '{}').replace(/\/\d+(?=\/|$)/g, '/{}');

/** Buang komentar (blok dan baris) tanpa menyentuh "https://" di dalam string; nomor baris tetap. */
function buangKomentar(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}

/** Pemakaian katalog dalam satu teks sumber (komentar diabaikan): [{ jenis: 'sumber'|'modul', nilai, baris }]. */
export function pindaiTeks(teksAsli) {
  const teks = buangKomentar(teksAsli);
  const hasil = [];
  const baris = (i) => teks.slice(0, i).split('\n').length;
  for (const re of POLA_SUMBER) for (const m of teks.matchAll(re)) hasil.push({ jenis: 'sumber', nilai: m[2], baris: baris(m.index) });
  for (const m of teks.matchAll(POLA_MODUL)) hasil.push({ jenis: 'modul', nilai: m[2], baris: baris(m.index) });
  return hasil.sort((a, b) => a.baris - b.baris);
}

/**
 * Status satu pemakaian terhadap indeks katalog: 'ada' | 'hilang' | 'dinamis'.
 * Sama dengan modulUntukSumber() di src/katalog/katalog.tsx: cocok persis, atau cocok setelah parameter diseragamkan.
 */
export function statusPemakaian(p, indeks, petaNormal = buatPetaNormal(indeks)) {
  if (p.jenis === 'modul') {
    if (p.nilai.includes('${')) return 'dinamis';
    return indeks.modul.some((m) => m.key === p.nilai) ? 'ada' : 'hilang';
  }
  if (indeks.peta[p.nilai] || petaNormal.has(normalPath(p.nilai))) return 'ada';
  if (!p.nilai.includes('${')) return 'hilang';
  // `/v1/lppm/${s.value}`: bagian tetap di depan templat harus menjadi awalan sumber yang ada.
  const awal = p.nilai.slice(0, p.nilai.indexOf('${'));
  return Object.keys(indeks.peta).some((k) => k.startsWith(awal)) ? 'dinamis' : 'hilang';
}

function buatPetaNormal(indeks) {
  return new Set(Object.keys(indeks.peta).map(normalPath));
}

function* berkasDi(dir) {
  for (const n of readdirSync(dir)) {
    if (LEWATI.test(n)) continue;
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) yield* berkasDi(p);
    else if (EKSTENSI.test(n)) yield p;
  }
}

/** Pindai folder; kembalikan semua pemakaian beserta statusnya. */
export function periksaKatalog({ folder = ['src'], cwd = process.cwd(), indeks }) {
  const petaNormal = buatPetaNormal(indeks);
  const hasil = [];
  for (const f of folder) {
    const akar = resolve(cwd, f);
    if (!existsSync(akar)) continue;
    for (const berkas of statSync(akar).isDirectory() ? berkasDi(akar) : [akar]) {
      const teks = readFileSync(berkas, 'utf8');
      if (!/sumber|HalamanModul/.test(teks)) continue;
      for (const p of pindaiTeks(teks)) hasil.push({ ...p, berkas: relative(cwd, berkas), status: statusPemakaian(p, indeks, petaNormal) });
    }
  }
  return hasil;
}

export async function utama({ cwd, flags, rest, c, ok, warn }) {
  const indeksPath = flags.indeks ? resolve(cwd, flags.indeks) : INDEKS_BAWAAN;
  if (!existsSync(indeksPath)) {
    console.error(`Indeks katalog tidak ditemukan: ${indeksPath}`);
    return 1;
  }
  const indeks = JSON.parse(readFileSync(indeksPath, 'utf8'));
  const hasil = periksaKatalog({ folder: rest.length ? rest : ['src'], cwd, indeks });
  const hilang = hasil.filter((h) => h.status === 'hilang');
  const dinamis = hasil.filter((h) => h.status === 'dinamis');
  if (flags.json) {
    console.log(JSON.stringify({ indeks: indeksPath, versi: indeks.versi, jumlah: hasil.length, hilang, dinamis }, null, 2));
    return hilang.length ? 1 : 0;
  }
  for (const h of dinamis) console.log(c.d(`  dinamis ${h.berkas}:${h.baris} ${h.nilai}`));
  if (!hilang.length) {
    ok(`${hasil.length} pemakaian katalog (${new Set(hasil.map((h) => h.nilai)).size} sumber/modul) ada di katalog unipo-ui.`);
    return 0;
  }
  for (const h of hilang) console.error(`${c.r('✖')} ${h.berkas}:${h.baris} ${h.jenis === 'modul' ? 'modul' : 'sumber'} "${h.nilai}" tidak ada di katalog`);
  warn(
    `${hilang.length} pemakaian tidak ada di katalog unipo-ui ${indeks.versi ? `(API ${indeks.versi})` : ''}. Bila endpoint sudah ada di SIAKAD main, ` +
      'katalog unipo-ui basi: perbarui dengan npm run katalog -w unipo-ui -- <openapi.json> di repo ui-unipo.',
  );
  return 1;
}
