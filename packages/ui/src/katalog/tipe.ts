/**
 * Bentuk data katalog fitur (dibuat scripts/katalog/buat.mjs dari OpenAPI API SIAKAD).
 * Kunci dibuat pendek supaya katalog 2.700+ operasi tetap ringan.
 */

/** Skema ringkas satu nilai. */
export interface Skema {
  /** type */
  t?: string;
  /** nullable */
  n?: 1;
  /** format: date, date-time, email, uri, binary, ... */
  f?: string;
  /** enum */
  e?: (string | number | boolean | null)[];
  /** maxLength */
  max?: number;
  /** minimum */
  min?: number;
  /** maximum */
  mx?: number;
  /** pattern */
  p?: string;
  /** default */
  d?: unknown;
  /** deskripsi */
  ds?: string;
  /** hanya baca */
  ro?: 1;
  ex?: string | number | boolean;
  /** items (array) */
  i?: Skema;
  /** properties (object) */
  pr?: Record<string, Skema>;
  /** required */
  rq?: string[];
  /** Isian berisi kunci data lain: tampil sebagai pilih-dengan-cari. */
  rf?: Acuan;
}

/**
 * Sumber pilihan untuk isian referensi.
 * l = path daftar ('pengguna' = akun SIAKAD), k = kolom nilai, d = path detail, q = 0 bila daftar tanpa pencarian server.
 */
export interface Acuan {
  l: string;
  k: string;
  d?: string;
  q?: 0;
}

export interface Parameter {
  nm: string;
  in: 'query' | 'path' | 'header';
  s: Skema;
  rq?: 1;
  ds?: string;
}

export type Metode = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
/** Pelaku aksi menurut backend (PusatData\Aksi::$siapa). */
export type PelakuAksi = 'pengelola' | 'pemilik' | 'admin' | 'pemilik_atau_pengelola';

export interface Operasi {
  id: string;
  m: Metode;
  path: string;
  tag: string;
  /** Ringkasan, biasanya "Sumber: aksi". */
  sum: string;
  ds?: string;
  /** Scope OAuth yang dibutuhkan. */
  sc?: string[];
  /** Endpoint publik (tanpa token). */
  pub?: 1;
  /** Alur status: aksi hanya sah bila status baris salah satu `dari`, lalu menjadi `ke`. */
  tr?: { dari: string[]; ke?: string };
  oleh?: PelakuAksi;
  pa?: Parameter[];
  b?: { ct: string; ref: string | null; s: Skema; rq?: 1 };
  /** Bentuk respons: daftar, satu objek, mentah, atau kosong (204). */
  r: 'list' | 'object' | 'raw' | 'none';
  /** Nama skema baris hasil. */
  it?: string;
}

/** Sumber data (koleksi) beserta operasi CRUD, aksi, dan sumber anak. */
export interface Sumber {
  id: string;
  tag: string;
  title: string;
  base: string;
  item?: string;
  key?: string;
  list?: string;
  create?: string;
  get?: string;
  update?: string;
  del?: string;
  actions: string[];
  children: string[];
  extra?: string[];
  parent?: string;
}

export interface ModulKatalog {
  key: string;
  resources: Sumber[];
  ops: Record<string, Operasi>;
  /** Operasi yang tidak melekat ke sumber data mana pun (laporan, sinkronisasi, impor). */
  mandiri: string[];
  skema: Record<string, Skema>;
}

export interface GrupIndeks {
  key: string;
  title: string;
  icon: string;
}

export interface ModulIndeks {
  key: string;
  group: string;
  title: string;
  icon: string;
  desc: string;
  jumlahOperasi: number;
  scope?: string[];
  sumber: { id: string; title: string; tag: string; sc?: string[] }[];
  operasi: { id: string; title: string; tag: string; m: string; sc?: string[] }[];
}

export interface IndeksKatalog {
  versi: string;
  grup: GrupIndeks[];
  modul: ModulIndeks[];
  /** Path sumber -> kunci modul. */
  peta: Record<string, string>;
}

export type Baris = Record<string, any>;
