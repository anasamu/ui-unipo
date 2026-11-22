/**
 * Aturan yang sama dengan backend SIAKAD, dibaca dari katalog OpenAPI:
 *
 * - validasi isian = PusatData\Aturan::bersihkan (teks:N, kode:N, enum, bool, int:min:max, angka, tanggal, waktu,
 *   jam, email, url, telepon, json, ref) dan penanda `wajib`, dengan pesan galat yang sama;
 * - alur status aksi = PusatData\Crud::aksi (aksi hanya sah bila status baris salah satu `dari`, lalu menjadi `ke`);
 * - scope = Principal::requireScope (semua scope operasi harus dimiliki token, cocok persis).
 *
 * Validasi di browser mencegah kiriman yang pasti ditolak; server tetap memeriksa ulang (kunci tabel lama
 * harus ada, nilai unik, hak pengelola), dan galat 422 dari server dipetakan ke isian yang sama.
 */
import type { Acuan, Baris, Operasi, Parameter, Skema } from './tipe';

// ================================================================ Label dan teks
const KHUSUS: Record<string, string> = {
  nim: 'NIM',
  nidn: 'NIDN',
  nik: 'NIK',
  nip: 'NIP',
  nuptk: 'NUPTK',
  npwp: 'NPWP',
  url: 'URL',
  id: 'ID',
  uuid: 'UUID',
  ipk: 'IPK',
  ips: 'IPS',
  sks: 'SKS',
  email: 'Email',
  kode_prodi: 'Program studi',
  kode_fakultas: 'Fakultas',
  tahun_id: 'Tahun akademik',
  tahun_id_mulai: 'Tahun akademik mulai',
  tahun_id_selesai: 'Tahun akademik selesai',
  tahun_id_awal: 'Tahun akademik awal',
  tahun_id_akhir: 'Tahun akademik akhir',
  nik_karyawan: 'Karyawan',
  username: 'Pengguna',
  created_at: 'Dibuat',
  updated_at: 'Diperbarui',
};

/** Label manusiawi dari nama kolom: `tanggal_mulai` → "Tanggal mulai", `mitra_id` → "Mitra". */
export function labelKolom(nama: string): string {
  const k = KHUSUS[nama.toLowerCase()];
  if (k) return k;
  const t = nama
    .replace(/_/g, ' ')
    .replace(/\s+id$/i, '')
    .replace(/^id\s+/i, '')
    .replace(/\b(nim|nidn|nik|nip|ipk|ips|sks|url|uuid|cpl|cpmk|rps|ukt|kip|va|qr|pt|sk)\b/gi, (m) => m.toUpperCase())
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Label nilai enum: `kip_kuliah` → "Kip kuliah", `pemilik_atau_pengelola` → "Pemilik atau pengelola". */
export function labelNilai(v: unknown): string {
  if (v === null || v === undefined || v === '') return '–';
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  const s = String(v);
  if (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(s) && s.length > 1) {
    const t = s.replace(/_/g, ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return s;
}

/** Judul aksi tanpa awalan sumber: "Program beasiswa: Buka pendaftaran" → "Buka pendaftaran". */
export function judulOperasi(o: Pick<Operasi, 'sum' | 'path'>): string {
  const s = o.sum.includes(':') ? o.sum.split(':').slice(1).join(':').trim() : o.sum;
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : o.path;
}

/** Keterangan isian tanpa nama tabel/kolom teknis (m_mahasiswa.NIM, ID di kmhs_ormawa, "(unik)"). */
export function keteranganIsian(s: Skema): string | undefined {
  let t = s.ds ?? '';
  t = t
    .replace(/\((hanya baca|hanya pengelola|unik)(, (hanya baca|hanya pengelola|unik))*\)/g, '')
    .replace(/\bID (di )?[a-z]+_[a-z_]+\b/g, '')
    .replace(/\b[a-z_]+\.[A-Za-z_]+\b/g, '')
    .replace(/^[\s;:,()-]+|[\s;:,()-]+$/g, '')
    .trim();
  // Keterangan yang hanya "ID indikator" / "ID unit" tidak berguna di pemilih bercari (nama sudah tampil di pilihan).
  if (/^ID( [a-z]+){1,3}$/.test(t)) return undefined;
  return t || undefined;
}

/** Penanda kolom dari keterangan backend: unik, hanya pengelola, hanya baca. */
export function penandaKolom(s: Skema): { unik: boolean; kelola: boolean; baca: boolean } {
  const ds = s.ds ?? '';
  return { unik: /\bunik\b/.test(ds), kelola: /hanya pengelola/.test(ds), baca: Boolean(s.ro) || /hanya baca/.test(ds) };
}

// ================================================================ Path
/** Isi `{param}` di path. */
export function isiPath(path: string, nilai: Record<string, unknown>): string {
  return path.replace(/\{([^}]+)\}/g, (_, n: string) => encodeURIComponent(String(nilai[n] ?? '')));
}
export function paramPath(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
}

// ================================================================ Jenis isian
export type JenisIsian =
  | 'file'
  | 'berkas'
  | 'boolean'
  | 'enum'
  | 'bulat'
  | 'angka'
  | 'tanggal'
  | 'waktu'
  | 'jam'
  | 'email'
  | 'url'
  | 'telepon'
  | 'kode'
  | 'teks-panjang'
  | 'daftar'
  | 'json'
  | 'acuan'
  | 'teks';

const PANJANG =
  /(^isi|konten|deskripsi|keterangan|catatan|uraian|ringkasan|abstrak|alamat|tujuan|alasan|pesan|komentar|saran|tanggapan|_html$|teks|body|narasi|temuan|rekomendasi|syarat|ketentuan|kronologi|tindak_lanjut|hasil)/i;
const TELEPON = /^(telepon|telp|hp|no_hp|nomor_hp|no_telp|whatsapp|wa|no_wa|kontak_hp|telepon_.+|hp_.+)$/i;
export const POLA_KODE = '^[A-Za-z0-9._\\-/]+$';
const POLA_JAM = '^\\d{2}:\\d{2}$';

/**
 * Acuan isian: dari skema (`rf`), atau tersirat dari nama kolom bila backend belum menandainya. Kolom `tahun_id`,
 * `tahun_id_mulai`/`_selesai`/`_awal`/`_akhir` selalu kode tahun akademik SIAKAD (mis. 20251), jadi dipilih dari daftar
 * tahun akademik, bukan diketik.
 */
export function acuanIsian(nama: string, s: Skema): Acuan | undefined {
  if (s.rf) return s.rf;
  if (/^tahun_id(_(mulai|selesai|awal|akhir))?$/i.test(nama) && (!s.t || s.t === 'string' || s.t === 'integer') && !(s.e && s.e.length)) {
    return { l: '/v1/referensi/tahun-akademik', k: 'tahun_id', q: 0 };
  }
  return undefined;
}

/** Jenis isian untuk satu properti skema; menentukan kontrol dan aturan validasi. */
export function jenisIsian(nama: string, s: Skema): JenisIsian {
  if (berkasPusat(nama, s)) return 'berkas';
  if (s.f === 'binary' || (s.t === 'array' && s.i?.f === 'binary')) return 'file';
  if (acuanIsian(nama, s) && (!s.t || s.t === 'string' || s.t === 'integer')) return 'acuan';
  if (s.t === 'boolean') return 'boolean';
  if (s.e && s.e.length) return 'enum';
  if (s.t === 'integer') return 'bulat';
  if (s.t === 'number') return 'angka';
  if (s.t === 'array') return s.i && s.i.t !== 'object' && s.i.t !== 'array' ? 'daftar' : 'json';
  if (s.t === 'object' || (!s.t && /JSON/i.test(s.ds ?? ''))) return 'json';
  if (s.f === 'date') return 'tanggal';
  if (s.f === 'date-time') return 'waktu';
  if (s.f === 'time' || s.p === POLA_JAM) return 'jam';
  if (s.f === 'email') return 'email';
  if (s.f === 'uri') return 'url';
  if (s.p === POLA_KODE) return 'kode';
  if (!s.p && TELEPON.test(nama)) return 'telepon';
  if ((s.max && s.max > 300) || (!s.max && PANJANG.test(nama))) return 'teks-panjang';
  return 'teks';
}

/** Properti yang bisa diisi (bukan hanya baca), urut seperti di skema. */
export function isianSkema(skema: Skema | undefined): Array<[string, Skema]> {
  const semua = Object.entries(skema?.pr ?? {}).filter(([, s]) => !penandaKolom(s).baca);
  // Unggahan dengan alternatif `berkas_id`: cukup satu isian berkas (unggah bertahap ke /v1/berkas atau pilih
  // dari "Berkas saya"); field file mentah, base64, dan nama file disembunyikan.
  return punyaBerkasPusat(skema) ? semua.filter(([k, s]) => !(s.f === 'binary' || (s.t === 'array' && s.i?.f === 'binary') || ALT_BERKAS.includes(k))) : semua;
}

/** `berkas_id` berisi UUID berkas terpusat /v1/berkas (bukan berkas modul lain seperti /v1/integrasi/berkas). */
export function berkasPusat(nama: string, s: Skema): boolean {
  return nama === 'berkas_id' && s.f === 'uuid' && /\/v1\/berkas\b/.test(s.ds ?? '');
}
const ALT_BERKAS = ['berkas_base64', 'file_base64', 'nama_file'];
const punyaBerkasPusat = (skema: Skema | undefined) => Object.entries(skema?.pr ?? {}).some(([k, s]) => berkasPusat(k, s));
/** Endpoint unggah: berkas mentah ada di skema, jadi `berkas_id` wajib diisi bila memakai berkas terpusat. */
export const unggahWajib = (skema: Skema | undefined) => punyaBerkasPusat(skema) && Object.values(skema?.pr ?? {}).some((s) => s.f === 'binary' || (s.t === 'array' && s.i?.f === 'binary'));

// ================================================================ Validasi (cermin PusatData\Aturan)
const kosong = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (typeof FileList !== 'undefined' && v instanceof FileList && v.length === 0) || (Array.isArray(v) && v.length === 0);

function tanggalSah(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const buangTag = (s: string) => s.replace(/<[^>]*>/g, '');

/**
 * Periksa satu nilai seperti backend. Kembalikan pesan galat (huruf kecil, sama dengan respons 422) atau null.
 * Nilai kosong selalu lolos di sini; wajib-isi diperiksa {@link validasiBody}.
 */
export function validasiNilai(nama: string, s: Skema, v: unknown): string | null {
  if (kosong(v)) return null;
  const j = jenisIsian(nama, s);
  const teks = typeof v === 'string' ? v.trim() : String(v);
  switch (j) {
    case 'teks':
    case 'teks-panjang': {
      const maks = s.max ?? (j === 'teks-panjang' ? 65000 : undefined);
      if (maks && buangTag(teks).length > maks) return `maksimal ${maks} karakter`;
      if (s.p && !new RegExp(s.p).test(teks)) return 'format tidak valid';
      return null;
    }
    case 'kode':
      if (!new RegExp(POLA_KODE).test(teks) || (s.max && teks.length > s.max)) return `hanya huruf, angka, titik, garis bawah, strip, garis miring; maksimal ${s.max ?? 50} karakter`;
      return null;
    case 'enum':
      return s.e!.some((x) => String(x) === teks) ? null : `harus salah satu: ${s.e!.filter((x) => x !== null).join(', ')}`;
    case 'boolean':
      return [true, false, 1, 0, '1', '0', 'true', 'false'].includes(v as never) ? null : 'harus true atau false';
    case 'bulat':
    case 'acuan':
      if (j === 'acuan' && s.t !== 'integer') return teks.length > 50 ? 'tidak valid' : null;
      if (!/^-?\d{1,10}$/.test(teks)) return j === 'acuan' || /\bID di\b/.test(s.ds ?? '') ? 'harus ID angka' : 'harus bilangan bulat';
      return rentang(Number(teks), s);
    case 'angka':
      if (teks === '' || Number.isNaN(Number(teks))) return 'harus angka';
      return rentang(Number(teks), s);
    case 'tanggal':
      return tanggalSah(teks) ? null : 'format YYYY-MM-DD';
    case 'waktu':
      if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(teks)) return 'format YYYY-MM-DD HH:MM:SS';
      return tanggalSah(teks.slice(0, 10)) ? null : 'waktu tidak valid';
    case 'jam':
      return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(teks) ? null : 'format HH:MM';
    case 'email':
      return EMAIL.test(teks) && teks.length <= 150 ? null : 'email tidak valid';
    case 'url':
      return /^https?:\/\/[^\s]+\.[^\s]+/i.test(teks) && teks.length <= 500 ? null : 'harus URL http/https';
    case 'telepon':
      return /^\+?[0-9 ()-]{5,25}$/.test(teks) ? null : 'nomor telepon tidak valid';
    case 'json':
      if (typeof v === 'string') {
        try {
          const x = JSON.parse(v);
          if (x === null || typeof x !== 'object') return 'harus objek atau array';
        } catch {
          return 'harus JSON';
        }
      } else if (typeof v !== 'object') return 'harus objek atau array';
      return JSON.stringify(v).length > 60000 ? 'terlalu besar' : null;
    default:
      return null;
  }
}

function rentang(n: number, s: Skema): string | null {
  if (s.min !== undefined && s.mx !== undefined && (n < s.min || n > s.mx)) return `harus ${s.min} sampai ${s.mx}`;
  if (s.min !== undefined && s.mx === undefined && n < s.min) return `minimal ${s.min}`;
  if (s.mx !== undefined && s.min === undefined && n > s.mx) return `maksimal ${s.mx}`;
  return null;
}

/** Huruf besar di awal dan titik di akhir, untuk menampilkan galat backend/frontend dengan gaya yang sama. */
export function rapikanGalat(pesan: string): string {
  const t = pesan.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? '' : '.');
}

export type NilaiForm = Record<string, unknown>;
export type GalatForm = Record<string, string>;

/** Nilai JSON sebagai data; teks JSON dari server diurai dulu. */
export function uraiJson(v: unknown): unknown {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

/** Nilai awal formulir dari baris yang ada (ubah) atau nilai bawaan skema (tambah). */
export function nilaiAwal(skema: Skema | undefined, data?: Baris | null): NilaiForm {
  const hasil: NilaiForm = {};
  for (const [k, s] of isianSkema(skema)) {
    const j = jenisIsian(k, s);
    let v = data ? data[k] : s.d;
    if (j === 'boolean') v = v === true || v === 1 || v === '1' || v === 'Y' || v === 'true';
    else if (j === 'json') v = uraiJson(v);
    else if (j === 'daftar') v = Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? v.split(',').map((x) => x.trim()) : [];
    else if (j === 'waktu' && typeof v === 'string') v = v.replace(' ', 'T').slice(0, 16);
    else if (j === 'tanggal' && typeof v === 'string') v = v.slice(0, 10);
    else if (j === 'jam' && typeof v === 'string') v = v.slice(0, 5);
    else if (j === 'file') v = undefined;
    else v = v === null || v === undefined ? '' : String(v);
    hasil[k] = v;
  }
  return hasil;
}

const sama = (a: unknown, b: unknown) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

export interface OpsiBody {
  /** Mode ubah (PUT/PATCH): hanya kolom yang berubah yang dikirim; wajib tidak boleh dikosongkan. */
  ubah?: boolean;
  /** Nilai awal (mode ubah) untuk menghitung perubahan. */
  awal?: NilaiForm;
  /** Kirim sebagai multipart (ada berkas). */
  multipart?: boolean;
}

/**
 * Periksa semua isian dan bentuk body permintaan, seperti PusatData\Crud::tambah/ubah:
 * - tambah: kolom wajib harus terisi; isian kosong tidak dikirim;
 * - ubah: hanya kolom yang berubah dikirim; mengosongkan kolom wajib ditolak ("wajib diisi"),
 *   kolom lain yang dikosongkan dikirim null.
 */
export function validasiBody(skema: Skema | undefined, nilai: NilaiForm, opsi: OpsiBody = {}): { body: Record<string, unknown> | FormData; galat: GalatForm; berubah: string[] } {
  const { ubah = false, awal, multipart = false } = opsi;
  const galat: GalatForm = {};
  const wajib = new Set(skema?.rq ?? []);
  if (!ubah && unggahWajib(skema)) wajib.add('berkas_id');
  const out: Record<string, unknown> = {};
  const berubah: string[] = [];
  for (const [k, s] of isianSkema(skema)) {
    const j = jenisIsian(k, s);
    const v = nilai[k];
    if (ubah && awal && sama(v, awal[k]) && j !== 'file') continue;
    if (kosong(v) || (j === 'json' && v !== null && typeof v === 'object' && Object.keys(v as object).length === 0)) {
      if (wajib.has(k) && (!ubah || (awal && !kosong(awal[k])))) galat[k] = 'wajib diisi';
      else if (ubah && j !== 'file') {
        out[k] = null;
        berubah.push(k);
      }
      continue;
    }
    const g = validasiNilai(k, s, v);
    if (g) {
      galat[k] = g;
      continue;
    }
    out[k] = keNilaiApi(j, s, v);
    berubah.push(k);
  }
  if (!multipart) return { body: out, galat, berubah };
  const fd = new FormData();
  for (const [k, v] of Object.entries(out)) {
    if (typeof FileList !== 'undefined' && v instanceof FileList) Array.from(v).forEach((f) => fd.append(skema?.pr?.[k]?.t === 'array' ? `${k}[]` : k, f));
    else if (v instanceof Blob) fd.append(k, v);
    else if (Array.isArray(v)) v.forEach((x) => fd.append(`${k}[]`, String(x)));
    else if (typeof v === 'boolean') fd.append(k, v ? '1' : '0');
    else if (v !== null && typeof v === 'object') fd.append(k, JSON.stringify(v));
    else if (v !== null) fd.append(k, String(v));
  }
  return { body: fd, galat, berubah };
}

/** Nilai formulir → nilai yang dikirim ke API. */
export function keNilaiApi(j: JenisIsian, s: Skema, v: unknown): unknown {
  switch (j) {
    case 'bulat':
      return Number(v);
    case 'angka':
      return Number(v);
    case 'acuan':
      return s.t === 'integer' ? Number(v) : String(v).trim();
    case 'boolean':
      return v === true || v === 1 || v === '1' || v === 'true';
    case 'json':
      return typeof v === 'string' ? JSON.parse(v) : v;
    case 'daftar': {
      const arr = Array.isArray(v) ? v : String(v).split(',');
      return arr
        .map((x) => String(x).trim())
        .filter(Boolean)
        .map((x) => (s.i?.t === 'integer' || s.i?.t === 'number' ? Number(x) : x));
    }
    case 'waktu': {
      const t = String(v).replace('T', ' ');
      return t.length === 16 ? `${t}:00` : t;
    }
    case 'jam':
      return String(v).slice(0, 5);
    case 'file':
      return v;
    default:
      return typeof v === 'string' ? v.trim() : v;
  }
}

/** Galat 422 dari server (`details`: { kolom: pesan }) → galat per isian. */
export function galatDariServer(e: unknown): GalatForm | null {
  const err = e as { status?: number; details?: unknown; code?: string } | null;
  if (!err || (err.status !== 422 && err.code !== 'validation_failed')) return null;
  const d = err.details as Record<string, unknown> | undefined;
  if (!d || typeof d !== 'object') return null;
  const out: GalatForm = {};
  for (const [k, v] of Object.entries(d)) out[k] = Array.isArray(v) ? v.join('; ') : String(v);
  return Object.keys(out).length ? out : null;
}

// ================================================================ Parameter query
/** Periksa parameter (query/path) seperti body. */
export function validasiParameter(pa: Parameter[] | undefined, nilai: NilaiForm): GalatForm {
  const galat: GalatForm = {};
  for (const p of pa ?? []) {
    const v = nilai[p.nm];
    if (kosong(v)) {
      if (p.rq) galat[p.nm] = 'wajib diisi';
      continue;
    }
    const g = validasiNilai(p.nm, p.s, v);
    if (g) galat[p.nm] = g;
  }
  return galat;
}

// ================================================================ Alur status (cermin PusatData\Crud::aksi)
/** Kolom status yang dipakai aksi: `status` bila ada, atau kolom enum yang memuat semua status asal. */
export function kolomStatus(skemaBaris: Skema | undefined, tr: Operasi['tr'], baris?: Baris | null): string {
  const pr = skemaBaris?.pr ?? {};
  if (!tr) return 'status';
  const cocok = (k: string) => {
    const e = pr[k]?.e?.map(String);
    return Boolean(e && tr.dari.every((d) => e.includes(d)));
  };
  if (cocok('status')) return 'status';
  const lain = Object.keys(pr).find(cocok);
  if (lain) return lain;
  if (baris) {
    const kb = Object.keys(baris).find((k) => /status/.test(k) && tr.dari.includes(String(baris[k])));
    if (kb) return kb;
  }
  return 'status';
}

export interface KeabsahanAksi {
  boleh: boolean;
  /** Alasan bila tidak boleh (teks sama dengan respons 409 backend). */
  alasan?: string;
}

/**
 * Apakah aksi boleh dijalankan untuk baris ini menurut alur status.
 * Hak pelaku (pengelola/pemilik) tetap diperiksa server; di sini hanya status dan scope.
 */
export function keabsahanAksi(op: Operasi, baris: Baris | null | undefined, skemaBaris?: Skema, scopes?: readonly string[] | null): KeabsahanAksi {
  if (!punyaScope(op, scopes)) return { boleh: false, alasan: `Butuh izin ${op.sc!.filter((s) => !scopes!.includes(s)).join(', ')}.` };
  if (!op.tr || !baris) return { boleh: true };
  const k = kolomStatus(skemaBaris, op.tr, baris);
  const sekarang = baris[k] == null ? '' : String(baris[k]);
  if (op.tr.dari.includes(sekarang)) return { boleh: true };
  return { boleh: false, alasan: `${judulOperasi(op)} hanya bisa dilakukan bila status ${op.tr.dari.join('/')} (sekarang: ${sekarang || '-'}).` };
}

/** Semua scope operasi harus dimiliki token (Principal::requireScope). `scopes` tidak diisi = tidak diperiksa. */
export function punyaScope(op: Pick<Operasi, 'sc' | 'pub'>, scopes?: readonly string[] | null): boolean {
  if (!scopes || op.pub || !op.sc?.length) return true;
  return op.sc.every((s) => scopes.includes(s));
}

/** Urutan status dari alur aksi: [{ dari, ke, aksi }], untuk diagram alur. */
export function alurStatus(ops: Operasi[]): Array<{ dari: string[]; ke?: string; op: Operasi }> {
  return ops.filter((o) => o.tr).map((o) => ({ dari: o.tr!.dari, ke: o.tr!.ke, op: o }));
}

// ================================================================ Kolom tabel
const PRIORITAS = [
  /^(kode|nim|nidn|nik|nip|username|no|nomor)(_|$)/i,
  /^(nama|judul|title|subjek|perihal)(_|$)/i,
  /(nama|judul)/i,
  /^(jenis|tipe|kategori|level)(_|$)/i,
  /(prodi|fakultas|unit|periode|tahun)/i,
  /(tanggal|tgl|mulai|selesai|batas)/i,
  /(status|aktif)/i,
];
const ABAIKAN =
  /(^uuid$|password|secret|hash|token|_html$|^isi$|^isi_|^konten|^body$|^blok|deskripsi|keterangan|catatan|^meta|created_by|updated_by|diubah_oleh|dibuat_oleh|deleted|^syarat|^updated_at$)/i;

/** Pilih kolom tabel dari skema dan isi baris: kunci/nama dulu, lalu jenis, unit, tanggal, status. */
export function pilihKolom(skema: Skema | undefined, baris: Baris[] = [], maks = 6): { semua: string[]; awal: string[] } {
  const dariSkema = skema?.pr ? Object.keys(skema.pr) : [];
  const dariData = baris.length ? Object.keys(baris[0]) : [];
  const semua = dariData.length ? [...new Set([...dariSkema.filter((k) => dariData.includes(k)), ...dariData])] : dariSkema;
  const skor = (k: string) => {
    if (ABAIKAN.test(k)) return 100;
    const i = PRIORITAS.findIndex((r) => r.test(k));
    const contoh = baris[0]?.[k];
    const tipe = skema?.pr?.[k]?.t;
    const berat = (contoh !== null && typeof contoh === 'object') || tipe === 'object' || tipe === 'array' ? 50 : 0;
    return (i === -1 ? 20 : i) + berat;
  };
  const urut = semua.filter((k) => k !== 'id' || semua.length <= 2).sort((a, b) => skor(a) - skor(b));
  let awal = urut.filter((k) => skor(k) < 50).slice(0, maks);
  if (!awal.length) awal = semua.slice(0, maks);
  awal = semua.filter((k) => awal.includes(k));
  return { semua, awal };
}

/** Judul satu baris untuk panel detail dan konfirmasi. */
export function judulBaris(b: Baris | null | undefined, kunci?: string): string {
  if (!b) return '';
  for (const k of ['nama', 'judul', 'title', 'nama_lengkap', 'perihal', 'subjek', 'pernyataan', 'uraian', 'nama_prodi', 'nama_fakultas', 'nama_mk', 'nomor']) {
    if (typeof b[k] === 'string' && b[k]) return b[k];
  }
  const kn = Object.keys(b).find((k) => /^(nama|judul)/.test(k) && typeof b[k] === 'string' && b[k]);
  if (kn) return String(b[kn]);
  return String(b.kode ?? b[kunci ?? 'id'] ?? b.id ?? '');
}

/** Nilai kunci baris untuk path item ({id}, {kode}, {nim}). */
export function nilaiKunci(b: Baris, kunci = 'id'): string | undefined {
  const v = b[kunci] ?? b[kunci.toLowerCase()] ?? b[kunci.toUpperCase()] ?? b.id ?? b.uuid;
  return v === undefined || v === null ? undefined : String(v);
}

type Nada = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
const NADA: Array<[RegExp, Nada]> = [
  [
    /^(aktif|a|buka|disetujui|setuju|terverifikasi|valid|lulus|selesai|terbit|diterbitkan|lunas|publik|published|diterima|tersedia|hadir|h|berlaku|sah|ditetapkan|sukses|berhasil|dibayar|tervalidasi|approved|done|ok)$/i,
    'success',
  ],
  [/^(draf|draft|baru|diajukan|menunggu|pending|review|diproses|proses|seleksi|berjalan|dijadwalkan|terjadwal|dipinjam|antre|antrean|cuti|c|izin|i|sakit|s|revisi|perbaikan|verifikasi)$/i, 'warning'],
  [
    /^(ditolak|tolak|batal|dibatalkan|gagal|kedaluwarsa|expired|nonaktif|non-aktif|n|d|do|drop out|keluar|hilang|rusak|alpa|blokir|diblokir|dicabut|ditutup|tutup|terlambat|denda|failed|rejected)$/i,
    'danger',
  ],
  [/^(arsip|diarsipkan|inaktif|nonaktif sementara|dihapus|musnah|l)$/i, 'neutral'],
];
/** Warna lencana untuk nilai status yang umum dipakai API SIAKAD. */
export function nadaStatus(v: unknown): Nada {
  const s = String(v ?? '').trim();
  for (const [re, n] of NADA) if (re.test(s)) return n;
  return 'info';
}
