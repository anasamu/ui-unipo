// Menyusun kode contoh galeri menjadi beberapa berkas (tab di "Lihat kode"): berkas contoh dengan impornya, lalu bila
// komponennya mengambil data, siakad.ts (klien SDK UNIPO), main.tsx (UnipoProvider), dan sdk.ts (panggilan SDK yang
// dijalankan komponen). Dipakai galeri ini dan skrip referensi api_unipo (scripts/referensi-library.mjs), jadi ditulis
// sebagai JavaScript biasa tanpa dependensi.

/** Impor bernama dari teks sumber: [{ dari, nama: [{ asli, lokal, tipe }], bawaan, ns, tipe }]. */
export function uraiImpor(src) {
  const hasil = [];
  for (const m of src.matchAll(/^import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?\s*$/gm)) {
    const [, semuaTipe, klausa, dari] = m;
    const imp = { dari, nama: [], bawaan: null, ns: null, tipe: !!semuaTipe };
    let sisa = klausa.trim();
    const ns = sisa.match(/\*\s+as\s+(\w+)/);
    if (ns) imp.ns = ns[1];
    const kurung = sisa.match(/\{([\s\S]*)\}/);
    if (kurung) {
      for (const bagian of kurung[1]
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)) {
        const t = /^type\s+/.test(bagian);
        const [asli, lokal] = bagian.replace(/^type\s+/, '').split(/\s+as\s+/);
        imp.nama.push({ asli, lokal: lokal ?? asli, tipe: t || imp.tipe });
      }
      sisa = sisa.replace(kurung[0], '');
    }
    const bawaan = sisa
      .replace(/\*\s+as\s+\w+/, '')
      .replace(/,/g, '')
      .trim();
    if (bawaan) imp.bawaan = bawaan;
    hasil.push(imp);
  }
  return hasil;
}

const dipakai = (kode, nama) => new RegExp(`(?<![\\w.])${nama}\\b`).test(kode);

/** Baris impor yang benar-benar dipakai `kode` (impor galeri seperti ../registry dibuang). */
export function imporUntuk(src, kode) {
  const baris = [];
  const ui = [];
  for (const imp of uraiImpor(src)) {
    if (/registry$/.test(imp.dari)) continue;
    const nama = imp.nama.filter((n) => dipakai(kode, n.lokal));
    const ns = imp.ns && kode.includes(`${imp.ns}.`) ? imp.ns : null;
    const bawaan = imp.bawaan && dipakai(kode, imp.bawaan) ? imp.bawaan : null;
    if (!nama.length && !ns && !bawaan) continue;
    if (/^unipo-ui/.test(imp.dari)) for (const n of nama) if (!n.tipe) ui.push({ nama: n.asli, dari: imp.dari });
    const daftar = nama.map((n) => (n.tipe && !imp.tipe ? 'type ' : '') + (n.asli === n.lokal ? n.asli : `${n.asli} as ${n.lokal}`));
    const bagian = [bawaan, ns ? `* as ${ns}` : null, daftar.length ? `{ ${daftar.join(', ')} }` : null].filter(Boolean).join(', ');
    const relatif = imp.dari.startsWith('.');
    baris.push({ teks: `import ${imp.tipe ? 'type ' : ''}${bagian} from '${imp.dari}';`, relatif });
  }
  const teks = [
    ...baris.filter((b) => !b.relatif).map((b) => b.teks),
    ...(baris.some((b) => b.relatif) ? ['// Data contoh khusus galeri; ganti dengan data Anda.', ...baris.filter((b) => b.relatif).map((b) => b.teks)] : []),
  ].join('\n');
  return { teks, ui };
}

const SIAKAD_TS = `import { Siakad } from 'unipo-siakad-sdk';

// Klien SDK UNIPO. Di browser, arahkan ke BFF aplikasi Anda (client_secret tidak pernah ada di browser);
// BFF meneruskan ke api.unipo.ac.id dengan token pengguna dari SSO.
export const siakad = new Siakad({
  baseUrl: '/bff/api',
  accessToken: sesi.accessToken, // token pengguna dari login SSO
});
`;

const mainTsx = (nama) => `import { createRoot } from 'react-dom/client';
import { UnipoProvider } from 'unipo-ui/siakad';
import 'unipo-ui/css';
import { siakad } from './siakad';
import { ${nama} } from './${nama}';

// Komponen unipo-ui/siakad mengambil data lewat SDK dari UnipoProvider.
createRoot(document.getElementById('root')!).render(
  <UnipoProvider siakad={siakad}>
    <${nama} />
  </UnipoProvider>,
);
`;

/** "GET /v1/keuangan/mahasiswa/{nim}" atau "SDK dasbor.getRingkas" → satu baris kode SDK. */
export function barisSdk(ep) {
  if (ep.startsWith('SDK ')) {
    const [modul, metode] = ep.slice(4).split('.');
    return `await siakad.${modul}.${metode}({ /* query */ });`;
  }
  const [method, path] = ep.split(' ');
  const param = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const p = param.length ? '`' + path.replace(/\{(\w+)\}/g, '${$1}') + '`' : `'${path}'`;
  const body = method === 'GET' || method === 'DELETE' ? '' : ', body: { /* … */ }';
  return `await siakad.request({ method: '${method}', path: ${p}${body} });`;
}

/** Isi sdk.ts: panggilan SDK per komponen yang dipakai contoh. */
export function sdkTs(perKomponen) {
  const bagian = Object.entries(perKomponen).map(([nama, eps]) => `// ${nama}\n${eps.map(barisSdk).join('\n')}`);
  return `// Panggilan SDK UNIPO (unipo-siakad-sdk) yang dijalankan komponen di contoh ini.
// Komponen sudah memanggilnya sendiri lewat <UnipoProvider>; pakai baris yang sama bila
// Anda butuh datanya di kode sendiri (mis. di BFF atau hook buatan sendiri).
import { siakad } from './siakad';

${bagian.join('\n\n')}
`;
}

/**
 * Berkas-berkas untuk satu contoh.
 * @param {string} src  Teks sumber berkas demo.
 * @param {string} nama Nama fungsi demo (ekspor).
 * @param {string} kode Teks fungsi demo.
 * @param {Record<string, string[]>} petaSdk Nama ekspor unipo-ui → endpoint/metode SDK (scripts/peta-sdk.mjs).
 * @returns {{ nama: string; bahasa: string; kode: string }[]}
 */
export function berkasContoh(src, nama, kode, petaSdk) {
  const { teks, ui } = imporUntuk(src, kode);
  const berkas = [{ nama: `${nama}.tsx`, bahasa: 'tsx', kode: `${teks ? teks + '\n\n' : ''}${kode.trim()}\n` }];
  const perKomponen = {};
  for (const u of ui) if (petaSdk[u.nama]?.length) perKomponen[u.nama] = petaSdk[u.nama];
  const pakaiSiakad = ui.some((u) => u.dari === 'unipo-ui/siakad');
  if (pakaiSiakad || Object.keys(perKomponen).length) {
    berkas.push({ nama: 'main.tsx', bahasa: 'tsx', kode: mainTsx(nama) });
    berkas.push({ nama: 'siakad.ts', bahasa: 'ts', kode: SIAKAD_TS });
    if (Object.keys(perKomponen).length) berkas.push({ nama: 'sdk.ts', bahasa: 'ts', kode: sdkTs(perKomponen) });
  }
  return berkas;
}
