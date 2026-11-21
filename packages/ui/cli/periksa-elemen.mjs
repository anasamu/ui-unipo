// Pemeriksa elemen bawaan: menolak <input>, <select>, <table>, <button> polos, window.confirm/prompt, dll. di halaman
// aplikasi agar semua isian, pemilih, tabel, dan tombol memakai komponen unipo-ui.
//
//   npx unipo-ui periksa-elemen                       periksa halaman (folder pages/ atau halaman/ di src, frontend/src)
//   npx unipo-ui periksa-elemen --semua               periksa seluruh src (termasuk komponen lokal)
//   npx unipo-ui periksa-elemen --src src/fitur       folder lain (boleh dipisah koma)
//   npx unipo-ui periksa-elemen --tulis-dasar .unipo-ui-dasar.json   catat pelanggaran yang ada sekarang (migrasi bertahap)
//   npx unipo-ui periksa-elemen --dasar .unipo-ui-dasar.json         gagal hanya bila pelanggaran BERTAMBAH
//   npx unipo-ui periksa-elemen --json                hasil dalam JSON
//
// Pengecualian tertulis (alasan wajib):
//   - komentar di baris yang sama atau baris sebelumnya:  {/* unipo-ui-izinkan tabel-bawaan: tata letak cetak kwitansi */}
//   - berkas unipo-ui-periksa.json di akar proyek:
//       { "abaikan": ["src/halaman/cetak/"], "pengecualian": [{ "berkas": "src/halaman/X.tsx", "aturan": "tabel-bawaan", "alasan": "..." }] }
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const TAG = (nama, syarat = '') => new RegExp(`<${nama}\\b(?:=>|[^>])*?${syarat}`, 'g');
const TIPE = (tipe) => `\\btype=\\{?["'](?:${tipe})["']`;

/** Aturan: id, pola, pesan awam, dan komponen pengganti. Urutan = prioritas (yang khusus lebih dulu). */
export const ATURAN = [
  { id: 'input-tanggal', pola: TAG('[Ii]nput', TIPE('date|month|week')), pesan: 'Isian tanggal bawaan peramban', ganti: 'DatePicker / IsianTanggal (terhubung kalender akademik)' },
  { id: 'input-waktu', pola: TAG('[Ii]nput', TIPE('datetime-local|time')), pesan: 'Isian tanggal-jam bawaan peramban', ganti: 'IsianTanggalWaktu / IsianJam' },
  { id: 'input-angka', pola: TAG('[Ii]nput', TIPE('number')), pesan: 'Isian angka bawaan (tanpa titik ribuan, bisa berubah saat digulir)', ganti: 'IsianAngka / IsianRupiah (uang) / NumberField' },
  { id: 'input-berkas', pola: TAG('[Ii]nput', TIPE('file')), pesan: 'Pilih berkas bawaan (tanpa batas ukuran/jenis dari kebijakan berkas)', ganti: 'UnggahBerkas / Dropzone / CariAtauUnggahDokumen' },
  { id: 'pilihan-bawaan', pola: TAG('input', TIPE('checkbox|radio')), pesan: 'Checkbox/radio bawaan', ganti: 'Checkbox / CheckboxGroup / RadioGroup (variant="card") / Switch / SwitchBaris / MultiPilih' },
  { id: 'input-bawaan', pola: /<input\b(?!(?:=>|[^>])*?\btype=["']hidden["'])/g, pesan: 'Elemen <input> polos', ganti: 'Input / InputGroup / komponen Isian* unipo-ui' },
  { id: 'select-bawaan', pola: /<select\b/g, pesan: 'Elemen <select> bawaan', ganti: 'Select (daftar pendek) / Combobox / PilihEntitas / MultiPilih' },
  { id: 'textarea-bawaan', pola: /<textarea\b/g, pesan: 'Elemen <textarea> polos', ganti: 'Textarea' },
  { id: 'tabel-bawaan', pola: /<table\b/g, pesan: 'Tabel HTML buatan sendiri', ganti: 'DataTable (+ useSiakadTable, FilterBar); cetakan memakai templat cetak' },
  { id: 'tabel-primitif', pola: /<Table\b/g, pesan: 'Table primitif unipo-ui dirakit sendiri di halaman', ganti: 'DataTable (urut, paging, kartu ponsel, kosong/galat)' },
  { id: 'tombol-bawaan', pola: /<button\b/g, pesan: 'Elemen <button> polos', ganti: 'Button / BilahAksi / MenuAksiBaris' },
  { id: 'dialog-peramban', pola: /(?<![\w.$])(?:window\.)?(?:confirm|prompt|alert)\s*\(/g, pesan: 'Dialog bawaan peramban (tidak bergaya, memblokir, tidak jalan di beberapa webview)', ganti: 'useKonfirmasi() → konfirmasi()/tanya(), KonfirmasiAksi, toast' },
];

const IZIN = /unipo-ui-izinkan\s+([\w-]+(?:\s*,\s*[\w-]+)*)\s*(?::\s*(.*?))?\s*(?:\*\/\s*\}?)?$/;

/** Kosongkan komentar blok/baris (tanpa mengubah jumlah baris) kecuali komentar pengecualian. */
function tanpaKomentar(teks) {
  return teks.replace(/\/\*[\s\S]*?\*\/|(^|[^:'"`\\])\/\/[^\n]*/g, (m, awal) => {
    if (m.includes('unipo-ui-izinkan')) return m;
    const isi = awal !== undefined && !m.startsWith('/*') ? m.slice(awal.length) : m;
    return (awal ?? '') + isi.replace(/[^\n]/g, ' ');
  });
}

/**
 * Periksa satu berkas. Mengembalikan pelanggaran { aturan, baris, kolom, potongan, pesan, ganti } dan pengecualian
 * yang dipakai. Satu lokasi hanya dihitung untuk aturan pertama yang cocok.
 */
export function periksaTeks(teks, berkas = '', opsi = {}) {
  const bersih = tanpaKomentar(teks);
  const barisAsli = teks.split('\n');
  const awalBaris = [0];
  for (let i = 0; i < bersih.length; i++) if (bersih[i] === '\n') awalBaris.push(i + 1);
  const keBaris = (idx) => {
    let lo = 0;
    let hi = awalBaris.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (awalBaris[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const izinDi = (b) => {
    for (const i of [b, b - 1]) {
      const m = i >= 0 ? IZIN.exec(barisAsli[i]?.trim() ?? '') : null;
      if (m) return { aturan: m[1].split(/\s*,\s*/), alasan: (m[2] ?? '').trim() };
    }
    return null;
  };
  const sudah = new Set();
  const hasil = [];
  const dipakai = [];
  const kecuali = (opsi.pengecualian ?? []).filter((p) => p.berkas === berkas);
  for (const a of opsi.aturan ?? ATURAN) {
    a.pola.lastIndex = 0;
    for (const m of bersih.matchAll(a.pola)) {
      if (sudah.has(m.index)) continue;
      sudah.add(m.index);
      const b = keBaris(m.index);
      const izin = izinDi(b);
      if (izin && (izin.aturan.includes(a.id) || izin.aturan.includes('semua'))) {
        if (izin.alasan) {
          dipakai.push({ aturan: a.id, baris: b + 1, alasan: izin.alasan });
          continue;
        }
        hasil.push({ aturan: a.id, baris: b + 1, kolom: m.index - awalBaris[b] + 1, potongan: barisAsli[b].trim().slice(0, 100), pesan: `${a.pesan}; pengecualian tanpa alasan tidak berlaku`, ganti: a.ganti });
        continue;
      }
      const k = kecuali.find((p) => p.aturan === a.id || p.aturan === 'semua');
      if (k?.alasan) {
        dipakai.push({ aturan: a.id, baris: b + 1, alasan: k.alasan });
        continue;
      }
      hasil.push({ aturan: a.id, baris: b + 1, kolom: m.index - awalBaris[b] + 1, potongan: barisAsli[b].trim().slice(0, 100), pesan: a.pesan, ganti: a.ganti });
    }
  }
  hasil.sort((x, y) => x.baris - y.baris || x.kolom - y.kolom);
  return { pelanggaran: hasil, pengecualian: dipakai };
}

const EKST = /\.(tsx|jsx|vue)$/;
function jelajah(dir, keluar = []) {
  if (!existsSync(dir)) return keluar;
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === 'dist' || n.startsWith('.')) continue;
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) jelajah(p, keluar);
    else if (EKST.test(n) && !/\.(test|spec|stories)\./.test(n)) keluar.push(p);
  }
  return keluar;
}

/** Berkas yang diperiksa: bawaan hanya halaman (`/pages/` atau `/halaman/`), `semua` = seluruh folder sumber. */
export function daftarBerkas(cwd, { src, semua } = {}) {
  const akar = (src ? String(src).split(',') : ['src', 'frontend/src']).map((d) => resolve(cwd, d.trim()));
  const semuaBerkas = akar.flatMap((d) => jelajah(d));
  const posix = (p) => relative(cwd, p).split(sep).join('/');
  return semuaBerkas.map(posix).filter((p) => semua || src || /(^|\/)(pages|halaman)\//.test(p));
}

export function periksaProyek(cwd, opsi = {}) {
  const cfgPath = join(cwd, 'unipo-ui-periksa.json');
  const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
  const abaikan = cfg.abaikan ?? [];
  const berkas = daftarBerkas(cwd, opsi).filter((b) => !abaikan.some((a) => b.startsWith(a)));
  const tanpaAlasan = (cfg.pengecualian ?? []).filter((p) => !p.alasan);
  const per = {};
  for (const b of berkas) {
    const r = periksaTeks(readFileSync(join(cwd, b), 'utf8'), b, { pengecualian: cfg.pengecualian });
    if (r.pelanggaran.length || r.pengecualian.length) per[b] = r;
  }
  return { berkas: berkas.length, per, tanpaAlasan };
}

/** Hitungan per berkas+aturan untuk berkas dasar (migrasi bertahap). */
export function hitungDasar(per) {
  const d = {};
  for (const [b, r] of Object.entries(per))
    for (const p of r.pelanggaran) {
      const k = `${b}#${p.aturan}`;
      d[k] = (d[k] ?? 0) + 1;
    }
  return Object.fromEntries(Object.entries(d).sort(([a], [b]) => a.localeCompare(b)));
}

/** Pelanggaran yang melebihi dasar: { kunci, dasar, kini }. */
export function bandingDasar(dasar, kini) {
  return Object.entries(kini)
    .filter(([k, n]) => n > (dasar[k] ?? 0))
    .map(([kunci, n]) => ({ kunci, dasar: dasar[kunci] ?? 0, kini: n }));
}

/** Jalankan dari CLI. Mengembalikan kode keluar (0 lulus, 1 ada pelanggaran/bertambah). */
export async function utama({ cwd, flags, c, ok, warn }) {
  const gagal = (s) => {
    console.error(`${c.r('✖')} ${s}`);
    return 1;
  };
  const r = periksaProyek(cwd, { src: typeof flags.src === 'string' ? flags.src : undefined, semua: Boolean(flags.semua) });
  const kini = hitungDasar(r.per);
  const total = Object.values(kini).reduce((a, b) => a + b, 0);
  if (flags.json) {
    console.log(JSON.stringify({ berkas: r.berkas, total, per: r.per }, null, 2));
    return 0;
  }
  if (typeof flags['tulis-dasar'] === 'string') {
    writeFileSync(resolve(cwd, flags['tulis-dasar']), JSON.stringify(kini, null, 2) + '\n');
    ok(`${total} pelanggaran di ${Object.keys(r.per).length} berkas dicatat sebagai dasar (${flags['tulis-dasar']}). Kurangi bertahap per menu.`);
    return 0;
  }
  for (const p of r.tanpaAlasan) warn(`unipo-ui-periksa.json: pengecualian ${p.berkas} (${p.aturan}) tanpa alasan diabaikan.`);
  const perAturan = {};
  for (const [b, h] of Object.entries(r.per)) {
    if (!h.pelanggaran.length) continue;
    console.log(c.b(b));
    for (const p of h.pelanggaran) {
      perAturan[p.aturan] = (perAturan[p.aturan] ?? 0) + 1;
      console.log(`  ${c.d(`${p.baris}:${p.kolom}`)}  ${c.y(p.aturan)}  ${p.pesan}\n      ${c.d(p.potongan)}\n      ${c.g('→')} ${p.ganti}`);
    }
  }
  const izin = Object.values(r.per).reduce((n, h) => n + h.pengecualian.length, 0);
  console.log(`\n${r.berkas} berkas diperiksa, ${total} pelanggaran${izin ? `, ${izin} pengecualian tertulis` : ''}.`);
  if (total) console.log(Object.entries(perAturan).map(([a, n]) => `  ${a}: ${n}`).join('\n'));
  if (typeof flags.dasar === 'string') {
    const p = resolve(cwd, flags.dasar);
    const dasar = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
    const naik = bandingDasar(dasar, kini);
    if (naik.length) return gagal(`Pelanggaran bertambah dibanding dasar:\n  ${naik.map((n) => `${n.kunci}: ${n.dasar} → ${n.kini}`).join('\n  ')}\nPakai komponen unipo-ui, atau tulis pengecualian beralasan.`);
    const turun = Object.entries(dasar).filter(([k, n]) => (kini[k] ?? 0) < n).length;
    ok(`Tidak ada pelanggaran baru.${turun ? ` ${turun} entri dasar sudah berkurang: perbarui dengan --tulis-dasar ${flags.dasar}.` : ''}`);
    return 0;
  }
  if (total) return gagal('Ganti elemen di atas dengan komponen unipo-ui, atau tulis pengecualian beralasan.');
  ok('Semua halaman memakai komponen unipo-ui.');
  return 0;
}
