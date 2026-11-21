// Jalur API SIAKAD yang dipanggil komponen unipo-ui, diturunkan langsung dari sumber paket (src/ ikut terbit).
//
// Dipakai BFF tiap aplikasi React: BFF hanya meneruskan awalan /v1 yang diizinkan, sehingga komponen bersama
// (mis. StrukturUnit -> /v1/kemahasiswaan/struktur, KelolaPengumuman -> /v1/rbac/peran) dijawab 400 invalid_path
// bila daftar izin aplikasi tertinggal. Modul ini menelusuri komponen yang DIIMPOR aplikasi (beserta semua
// deklarasi yang dirujuknya, lintas berkas) dan mengumpulkan literal path /v1 di dalamnya menjadi pola izin.
//
//   import { jalurAplikasi, cocokPola } from 'unipo-ui/jalur-api';
//   const { pola } = jalurAplikasi('src');            // ['/v1/kemahasiswaan/struktur', '/v1/pedoman/versi/*/pdf', ...]
//   npx unipo-ui jalur-bff --tulis bff/lib/izin-komponen.json   (lihat cli/index.mjs)
//
// Pola: segmen dipisah "/", "*" di dalam segmen = karakter apa saja selain "/", segmen "*" utuh = satu segmen,
// segmen terakhir "**" = sisa path apa saja (termasuk kosong). Pencocokan yang sama ada di BFF (IzinKomponen.php).
// Hak sebenarnya tetap diperiksa API SIAKAD; daftar ini hanya mencegah BFF menolak jalur yang memang dipakai.
//
// Batas yang disengaja: katalog sumber (unipo-ui/katalog: FormulirSumber/TabelSumber dengan id sumber) tidak
// ditelusuri karena path-nya dipilih dari data saat jalan, dan path yang seluruh awalannya datang dari props
// aplikasi tidak bisa diketahui di sini (masuk daftar `tidakTerpetakan`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR_PAKET = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Folder src unipo-ui (ikut terbit di paket npm). */
export const SRC_UI = join(AKAR_PAKET, 'src');

/** Entri paket -> berkas indeks di src. */
const ENTRI = { 'unipo-ui': 'index.ts', 'unipo-ui/siakad': 'siakad/index.ts', 'unipo-ui/editor': 'editor/index.ts' };
/** Folder yang tidak ditelusuri: katalog berisi ratusan path data sumber yang dipilih saat jalan (lihat catatan di atas). */
const LEWATI = /(^|\/)(katalog|ikon|tema)(\/|$)/;

const RE_DEKL = /^(?:export\s+)?(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

/** Buang komentar (blok dan baris) tanpa menyentuh isi string seperti "https://". Baris tetap sama. */
function buangKomentar(t) {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
}

function cariBerkas(dasar) {
  for (const k of [dasar, dasar + '.tsx', dasar + '.ts', join(dasar, 'index.ts'), join(dasar, 'index.tsx')]) {
    if (existsSync(k) && statSync(k).isFile()) return k;
  }
  return null;
}

/** Analisis satu berkas: deklarasi top-level (rentang baris), impor/ekspor ulang, konstanta path. */
function muatBerkas(cache, berkas) {
  if (cache.has(berkas)) return cache.get(berkas);
  const asli = readFileSync(berkas, 'utf8');
  const teks = buangKomentar(asli);
  const baris = teks.split('\n');
  const tops = [];
  baris.forEach((l, i) => {
    const m = l.match(RE_DEKL);
    if (m) tops.push([m[1], i]);
  });
  const dekl = new Map();
  tops.forEach(([nama, a], k) => {
    const b = k + 1 < tops.length ? tops[k + 1][1] : baris.length;
    if (!dekl.has(nama)) dekl.set(nama, { berkas, nama, isi: baris.slice(a, b).join('\n') });
  });
  const impor = new Map(); // nama lokal -> { dari, nama asli }
  const eksporUlang = new Map(); // nama ekspor -> { dari, nama asli }
  const eksporSemua = [];
  const rel = (s) => cariBerkas(resolve(dirname(berkas), s));
  for (const m of teks.matchAll(/import\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const dari = rel(m[2]);
    if (!dari) continue;
    for (const bag of m[1].split(',')) {
      const [asal, alias] = bag.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      if (asal) impor.set((alias || asal).trim(), { dari, nama: asal.trim() });
    }
  }
  for (const m of teks.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const dari = rel(m[2]);
    if (!dari) continue;
    for (const bag of m[1].split(',')) {
      const [asal, alias] = bag.trim().replace(/^type\s+/, '').split(/\s+as\s+/);
      if (asal) eksporUlang.set((alias || asal).trim(), { dari, nama: asal.trim() });
    }
  }
  for (const m of teks.matchAll(/export\s+\*\s+from\s*['"](\.[^'"]+)['"]/g)) {
    const dari = rel(m[1]);
    if (dari) eksporSemua.push(dari);
  }
  // Konstanta path top-level: const P = '/v1/ta';
  const konstanta = new Map();
  for (const m of teks.matchAll(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::\s*string)?\s*=\s*(['"`])(\/v1\/[^'"`\n]*)\2/gm)) konstanta.set(m[1], m[3]);
  const info = { berkas, dekl, impor, eksporUlang, eksporSemua, konstanta };
  cache.set(berkas, info);
  return info;
}

/** Cari deklarasi `nama` yang tampak dari `berkas` (deklarasi sendiri, impor, atau ekspor ulang). */
function temukan(cache, berkas, nama, jejak = new Set()) {
  const kunci = berkas + '#' + nama;
  if (jejak.has(kunci) || LEWATI.test(relative(SRC_UI, berkas))) return null;
  jejak.add(kunci);
  const f = muatBerkas(cache, berkas);
  if (f.dekl.has(nama)) return f.dekl.get(nama);
  const lewat = f.impor.get(nama) ?? f.eksporUlang.get(nama);
  if (lewat) return temukan(cache, lewat.dari, lewat.nama, jejak);
  for (const dari of f.eksporSemua) {
    const d = temukan(cache, dari, nama, jejak);
    if (d) return d;
  }
  return null;
}

/** Isi ${...} yang pasti satu segmen path: encodeURIComponent(..), String(..), Number(..), atau nama id/kode/nim/... */
const SATU_SEGMEN = /^(?:encodeURIComponent|String|Number)\(|^[\w$.?!]*?(?:^|\.|\b)(?:[a-z]*(?:Id|ID)|id|ids?|nim|nidn|nip|kode|uuid|username|slug|token|nomor|tahun|kodeProdi|kode_prodi)\)?$/;

/** Ubah satu literal path (sudah tanpa kutip) menjadi pola izin, atau null bila awalannya tidak diketahui. */
export function polaDariPath(mentah, ekor = false) {
  // Penanda: \u0001 = nilai satu segmen (id, kode, encodeURIComponent(..)); \u0000 = nilai yang mungkin berisi "/".
  let s = mentah.replace(/^\/bff\/api(?=\/v1)/, '').replace(/^\/api(?=\/v1)/, '');
  s = s.replace(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, x) => (SATU_SEGMEN.test(x.trim()) ? '\u0001' : '\u0000'));
  // Parameter gaya OpenAPI/router di dalam literal (/v1/mahasiswa/{id}, /v1/x/:id) selalu satu segmen.
  s = s.replace(/\{[A-Za-z_]\w*\}/g, '\u0001').replace(/\/:[A-Za-z_]\w*(?=\/|$)/g, '/\u0001');
  // ${ yang terpotong (template bersarang) -> ekor dinamis.
  const potong = s.indexOf('${');
  if (potong >= 0) s = s.slice(0, potong) + '\u0000';
  for (const c of ['?', '#']) {
    const i = s.indexOf(c);
    if (i >= 0) s = s.slice(0, i);
  }
  if (s.endsWith('/')) {
    ekor = true;
    s = s.replace(/\/+$/, '');
  }
  // Literal yang langsung disambung nilai di ujung (`/v1/keu${path}`, `/v1/x${qs}`): nilai itu diawali "/" atau "?".
  if (/[^/\u0000\u0001][\u0000\u0001]+$/.test(s)) {
    s = s.replace(/[\u0000\u0001]+$/, '');
    ekor = true;
  }
  const seg = s.split('/').filter(Boolean);
  if (seg[0] !== 'v1' || !seg[1] || !/^[a-z][a-z0-9-]*$/.test(seg[1])) return null;
  const akhir = seg[seg.length - 1];
  // Segmen terakhir yang seluruhnya nilai yang mungkin berisi "/" (mis. ${path}) menjadi "**".
  if (seg.length > 2 && /^\u0000+$/.test(akhir)) {
    seg.pop();
    ekor = true;
  }
  const hasil = seg.map((x) => x.replace(/[\u0000\u0001]+/g, '*'));
  if (hasil.some((x) => !/^[A-Za-z0-9._~%*-]+$/.test(x))) return null;
  if (ekor) hasil.push('**');
  return '/' + hasil.join('/');
}

/** Ekspresi reguler untuk satu pola (sama persis dengan IzinKomponen::cocok di BFF). */
export function regexPola(pola) {
  const seg = pola.split('/').filter(Boolean);
  let re = '';
  for (const x of seg) {
    if (x === '**') re += '(?:/.*)?';
    else if (x === '*') re += '/[^/]+';
    else re += '/' + x.split('*').map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*');
  }
  return new RegExp('^' + re + '/?$');
}

/** Apakah `path` (/v1/..., tanpa query) diizinkan salah satu pola. */
export function cocokPola(daftarPola, path) {
  return daftarPola.some((p) => regexPola(p).test(path));
}

const RE_LITERAL = /(['"`])((?:\/bff\/api|\/api)?\/v1(?:\/(?:(?!\1)[^\n\\]|\\.)*?)?)\1/g;

/** Literal path /v1 di dalam isi deklarasi, dengan substitusi konstanta (`${P}/x`, `P + '/x'`). */
function literalDalam(isi, konstantaBerkas) {
  const lokal = new Map();
  for (const m of isi.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*string)?\s*=\s*(?:[^;\n]*?\?\s*)?(['"`])(\/v1\/(?:(?!\2)[^\n\\]|\\.)*?)\2/g)) lokal.set(m[1], m[3]);
  const nilai = (n) => lokal.get(n) ?? konstantaBerkas.get(n);
  const out = [];
  for (const m of isi.matchAll(RE_LITERAL)) {
    const sesudah = isi.slice(m.index + m[0].length, m.index + m[0].length + 4);
    out.push({ path: m[2], ekor: /^\s*\+/.test(sesudah) });
  }
  // `${P}/sisa` dan P + '/sisa' dengan P konstanta path
  for (const m of isi.matchAll(/`\$\{([A-Za-z_$][\w$]*)\}((?:[^`\\]|\\.)*)`/g)) {
    const v = nilai(m[1]);
    if (v) out.push({ path: v + m[2], ekor: false });
  }
  for (const m of isi.matchAll(/\b([A-Za-z_$][\w$]*)\s*\+\s*(['"`])([^'"`\n]*)\2/g)) {
    const v = nilai(m[1]);
    if (v) {
      const sesudah = isi.slice(m.index + m[0].length, m.index + m[0].length + 4);
      out.push({ path: v + m[3], ekor: /^\s*\+/.test(sesudah) });
    }
  }
  // Konstanta yang dipakai langsung sebagai argumen (path: P, fungsi(P, ...)) tetap tertangkap lewat literal deklarasinya.
  return out;
}

/**
 * Peta metode SDK -> path dari deklarasi tipe unipo-siakad-sdk (index.d.ts; tiap metode punya JSDoc "`GET /v1/...`").
 * Hasil: Map<getter Siakad (mis. "lms"), Map<nama metode, path[]>>.
 */
export function petaSdk(berkasDts) {
  const t = readFileSync(berkasDts, 'utf8');
  const kelas = new Map();
  for (const m of t.matchAll(/^declare class (\w+Resource) \{\n([\s\S]*?)^\}/gm)) {
    const metode = new Map();
    const re = /`(GET|POST|PUT|PATCH|DELETE) (\/v1\/[^`\s]*)`[\s\S]*?\*\/\n {4}(?:async )?([A-Za-z_$][\w$]*)\s*[(<]/g;
    for (const x of m[2].matchAll(re)) {
      if (!metode.has(x[3])) metode.set(x[3], []);
      // {param} dibiarkan: di router SIAKAD selalu tepat satu segmen, jadi polaDariPath menjadikannya "*".
      metode.get(x[3]).push(x[2]);
    }
    kelas.set(m[1], metode);
  }
  const peta = new Map();
  const siakad = t.match(/^declare class Siakad extends SiakadCore \{\n([\s\S]*?)^\}/m);
  for (const g of siakad?.[1].matchAll(/^ {4}get (\w+)\(\): (\w+Resource);/gm) ?? []) if (kelas.has(g[2])) peta.set(g[1], kelas.get(g[2]));
  return peta;
}

/** Lokasi index.d.ts unipo-siakad-sdk yang terpasang untuk aplikasi (atau untuk paket ini), null bila tidak ada. */
export function cariSdkDts(dariFolder) {
  for (const dasar of [join(dariFolder, 'package.json'), join(AKAR_PAKET, 'package.json')]) {
    try {
      const utama = createRequire(dasar).resolve('unipo-siakad-sdk');
      const d = join(dirname(utama), 'index.d.ts');
      if (existsSync(d)) return d;
    } catch {
      /* coba berikutnya */
    }
  }
  return null;
}

/** Semua komponen yang diimpor dari unipo-ui di folder sumber aplikasi: [{ nama, entri, pemakai }]. */
export function imporAplikasi(srcAplikasi) {
  const hasil = [];
  const jalan = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (!/^(node_modules|dist|\.)/.test(e.name)) jalan(p);
      } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
        const t = buangKomentar(readFileSync(p, 'utf8'));
        for (const m of t.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](unipo-ui(?:\/[a-z]+)?)['"]/g)) {
          if (!ENTRI[m[2]]) continue;
          for (const bag of m[1].split(',')) {
            const nama = bag.trim();
            if (!nama || nama.startsWith('type ')) continue;
            hasil.push({ nama: nama.split(/\s+as\s+/)[0].trim(), entri: m[2], pemakai: relative(srcAplikasi, p) });
          }
        }
      }
    }
  };
  jalan(srcAplikasi);
  return hasil;
}

/**
 * Pola izin BFF untuk aplikasi di `srcAplikasi` (folder src aplikasi React).
 * @returns {{ pola: string[], komponen: string[], rinci: Record<string, string[]>, tidakTerpetakan: string[] }}
 */
export function jalurAplikasi(srcAplikasi, { sdkDts = cariSdkDts(resolve(srcAplikasi, '..')) } = {}) {
  const sdk = sdkDts ? petaSdk(sdkDts) : null;
  const cache = new Map();
  const komponen = new Set();
  const rinci = new Map(); // pola -> Set komponen
  const tidak = new Set();
  const dikunjungi = new Set();
  for (const imp of imporAplikasi(srcAplikasi)) {
    const akar = temukan(cache, join(SRC_UI, ENTRI[imp.entri]), imp.nama);
    if (!akar) continue;
    komponen.add(imp.nama);
    const tumpuk = [akar];
    while (tumpuk.length) {
      const d = tumpuk.pop();
      const kunci = d.berkas + '#' + d.nama;
      if (dikunjungi.has(kunci)) {
        continue;
      }
      dikunjungi.add(kunci);
      const f = muatBerkas(cache, d.berkas);
      const literal = literalDalam(d.isi, f.konstanta);
      // Panggilan metode SDK: siakad.lms.getSaya(...) -> path dari JSDoc SDK.
      for (const m of d.isi.matchAll(/\.([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)\s*(?:<[^>()]*>)?\(/g)) {
        for (const p of sdk?.get(m[1])?.get(m[2]) ?? []) literal.push({ path: p, ekor: false });
      }
      for (const { path, ekor } of literal) {
        const p = polaDariPath(path, ekor);
        const asal = relative(SRC_UI, d.berkas) + ':' + d.nama;
        if (!p) {
          if (path.replace(/^\/(bff\/)?api/, '') !== '/v1' && !/^\/v1\/?$/.test(path)) tidak.add(path + ' (' + asal + ')');
          continue;
        }
        if (!rinci.has(p)) rinci.set(p, new Set());
        rinci.get(p).add(asal);
      }
      const id = new Set(d.isi.match(/[A-Za-z_$][\w$]*/g) ?? []);
      for (const n of id) {
        if (n === d.nama) continue;
        let t = null;
        if (f.dekl.has(n)) t = f.dekl.get(n);
        else if (f.impor.has(n)) {
          const i = f.impor.get(n);
          t = temukan(cache, i.dari, i.nama);
        }
        if (t) tumpuk.push(t);
      }
    }
  }
  const pola = [...rinci.keys()].sort();
  return {
    pola,
    komponen: [...komponen].sort(),
    rinci: Object.fromEntries(pola.map((p) => [p, [...rinci.get(p)].sort()])),
    tidakTerpetakan: [...tidak].sort(),
    sdk: sdkDts,
  };
}

/**
 * Isi berkas izin-komponen.json untuk BFF. Hanya pola (tanpa tanggal, versi, atau daftar komponen) supaya berkas
 * hanya berubah bila jalur yang dipanggil berubah, bukan setiap kali aplikasi mengimpor komponen tampilan baru.
 */
export function isiBerkasIzin(srcAplikasi, opsi) {
  const { pola } = jalurAplikasi(srcAplikasi, opsi);
  const keterangan =
    'Dibuat otomatis oleh `npx unipo-ui jalur-bff --tulis` dari komponen unipo-ui yang diimpor aplikasi (jangan diubah tangan). ' +
    'BFF meneruskan jalur yang cocok dengan pola ini selain daftar izin miliknya; hak tetap diperiksa API SIAKAD.';
  return JSON.stringify({ keterangan, pola }, null, 1) + '\n';
}
