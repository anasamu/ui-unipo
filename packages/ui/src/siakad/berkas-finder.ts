/**
 * Aturan murni tampilan Kelola berkas bergaya Finder: golongan & nama jenis awam, urut per kolom, kelompok
 * (jenis, tanggal, ukuran, pemilik), dan preferensi tampilan yang diingat di peramban. Tanpa React supaya bisa diuji.
 */

export type JenisBerkas = 'gambar' | 'pdf' | 'dokumen' | 'spreadsheet' | 'presentasi' | 'arsip' | 'video' | 'audio';
/** Kelompok jenis untuk filter `jenis` di GET /v1/berkas (sama dengan BerkasController::JENIS). */
export const JENIS_BERKAS: Record<JenisBerkas, { label: string; ekstensi: string[] }> = {
  gambar: { label: 'Gambar', ekstensi: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'tif', 'tiff'] },
  pdf: { label: 'PDF', ekstensi: ['pdf'] },
  dokumen: { label: 'Dokumen', ekstensi: ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'] },
  spreadsheet: { label: 'Spreadsheet', ekstensi: ['xls', 'xlsx', 'ods', 'csv'] },
  presentasi: { label: 'Presentasi', ekstensi: ['ppt', 'pptx', 'odp'] },
  arsip: { label: 'Arsip (zip)', ekstensi: ['zip', 'rar', '7z', 'tar', 'gz'] },
  video: { label: 'Video', ekstensi: ['mp4', 'webm', 'mov', 'mkv', 'avi'] },
  audio: { label: 'Audio', ekstensi: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'] },
};

type BerkasJenis = { ekstensi?: string | null; mime?: string | null; nama?: string };

const ekstensiDari = (b: BerkasJenis) => String(b.ekstensi || (b.nama?.includes('.') ? b.nama.split('.').pop() : '') || '').toLowerCase();

/** Golongan berkas (gambar, pdf, dokumen, lembar kerja, presentasi, arsip, video, audio, atau lain) dari ekstensi atau MIME, untuk ikon dan pratinjau. */
export function jenisBerkas(b: BerkasJenis): JenisBerkas | 'lain' {
  const ext = ekstensiDari(b);
  for (const [k, v] of Object.entries(JENIS_BERKAS)) if (v.ekstensi.includes(ext)) return k as JenisBerkas;
  if (b.mime?.startsWith('image/')) return 'gambar';
  if (b.mime?.startsWith('video/')) return 'video';
  if (b.mime?.startsWith('audio/')) return 'audio';
  return 'lain';
}

/** Nama jenis untuk orang awam per ekstensi (kolom "Jenis" ala Finder). */
const NAMA_EKSTENSI: Record<string, string> = {
  pdf: 'Dokumen PDF',
  doc: 'Dokumen Word',
  docx: 'Dokumen Word',
  odt: 'Dokumen OpenDocument',
  rtf: 'Dokumen RTF',
  txt: 'Teks',
  md: 'Teks Markdown',
  xls: 'Spreadsheet Excel',
  xlsx: 'Spreadsheet Excel',
  ods: 'Spreadsheet OpenDocument',
  csv: 'Tabel CSV',
  ppt: 'Presentasi PowerPoint',
  pptx: 'Presentasi PowerPoint',
  odp: 'Presentasi OpenDocument',
  zip: 'Arsip ZIP',
  rar: 'Arsip RAR',
  '7z': 'Arsip 7-Zip',
  tar: 'Arsip TAR',
  gz: 'Arsip GZip',
  mp4: 'Video MP4',
  webm: 'Video WebM',
  mov: 'Video QuickTime',
  mkv: 'Video MKV',
  avi: 'Video AVI',
  mp3: 'Audio MP3',
  wav: 'Audio WAV',
  ogg: 'Audio OGG',
  m4a: 'Audio M4A',
  aac: 'Audio AAC',
  flac: 'Audio FLAC',
  svg: 'Gambar SVG',
  heic: 'Foto HEIC',
};

/** "Gambar PNG", "Dokumen PDF", "Spreadsheet Excel", "Dokumen Word", "Teks", "Arsip ZIP", atau "Berkas XYZ". */
export function jenisAwam(b: BerkasJenis): string {
  const ext = ekstensiDari(b);
  if (NAMA_EKSTENSI[ext]) return NAMA_EKSTENSI[ext];
  const j = jenisBerkas(b);
  if (j === 'gambar') return ext ? `Gambar ${ext === 'jpeg' ? 'JPG' : ext.toUpperCase()}` : 'Gambar';
  if (j === 'video') return 'Video';
  if (j === 'audio') return 'Audio';
  return ext ? `Berkas ${ext.toUpperCase()}` : 'Berkas';
}

/** Judul kelompok jenis (lebih umum dari jenisAwam): "Gambar", "Dokumen PDF", "Spreadsheet", ... */
export const KELOMPOK_JENIS: Record<JenisBerkas | 'lain', string> = {
  gambar: 'Gambar',
  pdf: 'Dokumen PDF',
  dokumen: 'Dokumen',
  spreadsheet: 'Spreadsheet',
  presentasi: 'Presentasi',
  arsip: 'Arsip',
  video: 'Video',
  audio: 'Audio',
  lain: 'Lainnya',
};
const URUTAN_JENIS: Array<JenisBerkas | 'lain'> = ['dokumen', 'pdf', 'spreadsheet', 'presentasi', 'gambar', 'video', 'audio', 'arsip', 'lain'];

// ---------------------------------------------------------------- urut

export type TampilanBerkas = 'ikon' | 'daftar' | 'kolom' | 'galeri';
export type KunciUrut = 'nama' | 'tanggal' | 'ukuran' | 'jenis';
export interface UrutKolom {
  kunci: KunciUrut;
  arah: 'naik' | 'turun';
}
export type KelompokBerkas = 'tidak' | 'jenis' | 'tanggal' | 'ukuran' | 'pemilik';
/** Nilai `urut` yang dipahami GET /v1/berkas. */
export type UrutServer = 'baru' | 'lama' | 'nama' | '-nama' | 'ukuran' | '-ukuran';

export const LABEL_URUT: Record<KunciUrut, string> = { nama: 'Nama', tanggal: 'Tanggal diubah', ukuran: 'Ukuran', jenis: 'Jenis' };
export const LABEL_KELOMPOK: Record<KelompokBerkas, string> = { tidak: 'Tidak ada', jenis: 'Jenis', tanggal: 'Tanggal diubah', ukuran: 'Ukuran', pemilik: 'Pemilik' };
export const LABEL_TAMPILAN: Record<TampilanBerkas, string> = { ikon: 'Ikon', daftar: 'Daftar', kolom: 'Kolom', galeri: 'Galeri' };

/** Arah bawaan saat kolom pertama kali diklik: tanggal & ukuran terbesar/terbaru dulu, nama & jenis A-Z. */
export const arahAwal = (k: KunciUrut): UrutKolom['arah'] => (k === 'tanggal' || k === 'ukuran' ? 'turun' : 'naik');

/** Klik judul kolom: kolom yang sama membalik arah, kolom lain memakai arah bawaannya. */
export function klikKolom(u: UrutKolom, k: KunciUrut): UrutKolom {
  return u.kunci === k ? { kunci: k, arah: u.arah === 'naik' ? 'turun' : 'naik' } : { kunci: k, arah: arahAwal(k) };
}

/** Urutan yang diminta ke server (halaman pertama sudah benar); jenis diurutkan di sisi peramban di atas urutan nama. */
export function urutKeServer(u: UrutKolom): UrutServer {
  const turun = u.arah === 'turun';
  if (u.kunci === 'tanggal') return turun ? 'baru' : 'lama';
  if (u.kunci === 'ukuran') return turun ? '-ukuran' : 'ukuran';
  if (u.kunci === 'nama') return turun ? '-nama' : 'nama';
  return 'nama';
}

/** Kebalikan urutKeServer untuk nilai lama (prop/preferensi versi sebelumnya). */
export function urutDariServer(s: string | null | undefined): UrutKolom {
  switch (s) {
    case 'lama':
      return { kunci: 'tanggal', arah: 'naik' };
    case 'nama':
      return { kunci: 'nama', arah: 'naik' };
    case '-nama':
      return { kunci: 'nama', arah: 'turun' };
    case 'ukuran':
      return { kunci: 'ukuran', arah: 'naik' };
    case '-ukuran':
      return { kunci: 'ukuran', arah: 'turun' };
    default:
      return { kunci: 'tanggal', arah: 'turun' };
  }
}

const bandingNama = (a: string, b: string) => a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });

export interface BerkasUrut extends BerkasJenis {
  nama: string;
  ukuran: number;
  dibuat_at?: string | null;
  diubah_at?: string | null;
  pemilik?: string | null;
  pemilik_nama?: string | null;
}

/** Waktu ubah terakhir (diubah_at, kalau tidak ada dibuat_at) dalam milidetik; 0 bila tidak diketahui. */
export function waktuBerkas(b: { dibuat_at?: string | null; diubah_at?: string | null }): number {
  const s = b.diubah_at || b.dibuat_at;
  if (!s) return 0;
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T'));
  return Number.isNaN(t) ? 0 : t;
}

/** Urutkan berkas di peramban (stabil). Jenis: menurut golongan, lalu nama jenis awam, lalu nama berkas. */
export function urutkanBerkas<T extends BerkasUrut>(daftar: readonly T[], u: UrutKolom): T[] {
  const arah = u.arah === 'turun' ? -1 : 1;
  const banding = (a: T, b: T): number => {
    switch (u.kunci) {
      case 'tanggal':
        return waktuBerkas(a) - waktuBerkas(b) || bandingNama(a.nama, b.nama);
      case 'ukuran':
        return a.ukuran - b.ukuran || bandingNama(a.nama, b.nama);
      case 'jenis':
        return URUTAN_JENIS.indexOf(jenisBerkas(a)) - URUTAN_JENIS.indexOf(jenisBerkas(b)) || bandingNama(jenisAwam(a), jenisAwam(b)) || bandingNama(a.nama, b.nama);
      default:
        return bandingNama(a.nama, b.nama);
    }
  };
  return daftar
    .map((x, i) => [x, i] as const)
    .sort(([a, i], [b, j]) => arah * banding(a, b) || i - j)
    .map(([x]) => x);
}

/** Urutkan folder: nama, tanggal isi terakhir, atau ukuran total. Jenis = nama (semua folder sejenis). */
export function urutkanFolder<T extends { nama: string; total_ukuran?: number; terakhir_isi_at?: string | null; dibuat_at?: string | null }>(daftar: readonly T[], u: UrutKolom): T[] {
  const arah = u.arah === 'turun' ? -1 : 1;
  const nama = u.kunci === 'jenis' ? 1 : arah;
  return [...daftar].sort((a, b) => {
    if (u.kunci === 'ukuran') return arah * ((a.total_ukuran ?? 0) - (b.total_ukuran ?? 0)) || bandingNama(a.nama, b.nama);
    if (u.kunci === 'tanggal') return arah * (waktuBerkas({ dibuat_at: a.terakhir_isi_at ?? a.dibuat_at }) - waktuBerkas({ dibuat_at: b.terakhir_isi_at ?? b.dibuat_at })) || bandingNama(a.nama, b.nama);
    return nama * bandingNama(a.nama, b.nama);
  });
}

// ---------------------------------------------------------------- kelompok

export interface KelompokIsi<T> {
  kunci: string;
  label: string;
  isi: T[];
}

const MB = 1024 * 1024;
const awalHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Kunci & label kelompok satu berkas. `sekarang` disuntikkan supaya bisa diuji. */
export function kelompokDari(b: BerkasUrut, k: KelompokBerkas, sekarang: Date = new Date()): { kunci: string; label: string; urutan: number } {
  if (k === 'jenis') {
    const j = jenisBerkas(b);
    return { kunci: j, label: KELOMPOK_JENIS[j], urutan: URUTAN_JENIS.indexOf(j) };
  }
  if (k === 'ukuran') {
    if (b.ukuran >= 100 * MB) return { kunci: 'raksasa', label: 'Sangat besar (di atas 100 MB)', urutan: 0 };
    if (b.ukuran >= 10 * MB) return { kunci: 'besar', label: 'Besar (10–100 MB)', urutan: 1 };
    if (b.ukuran >= MB) return { kunci: 'sedang', label: 'Sedang (1–10 MB)', urutan: 2 };
    if (b.ukuran >= 100 * 1024) return { kunci: 'kecil', label: 'Kecil (100 KB–1 MB)', urutan: 3 };
    return { kunci: 'mini', label: 'Sangat kecil (di bawah 100 KB)', urutan: 4 };
  }
  if (k === 'pemilik') {
    const p = (b.pemilik ?? '').trim();
    return p ? { kunci: `p:${p}`, label: (b.pemilik_nama ?? '').trim() || p, urutan: 0 } : { kunci: 'tanpa', label: 'Tanpa keterangan pemilik', urutan: 1 };
  }
  if (k === 'tanggal') {
    const t = waktuBerkas(b);
    if (!t) return { kunci: 'tanpa', label: 'Tanpa tanggal', urutan: 1e9 };
    const hari = awalHari(sekarang);
    const selisih = Math.floor((hari - awalHari(new Date(t))) / 86_400_000);
    if (selisih <= 0) return { kunci: 'hari-ini', label: 'Hari ini', urutan: 0 };
    if (selisih === 1) return { kunci: 'kemarin', label: 'Kemarin', urutan: 1 };
    if (selisih < 7) return { kunci: '7-hari', label: '7 hari terakhir', urutan: 2 };
    if (selisih < 30) return { kunci: '30-hari', label: '30 hari terakhir', urutan: 3 };
    const d = new Date(t);
    const bln = d.getFullYear() * 12 + d.getMonth();
    const lbl = d.getFullYear() === sekarang.getFullYear() ? BULAN[d.getMonth()] : `${BULAN[d.getMonth()]} ${d.getFullYear()}`;
    return { kunci: `b:${bln}`, label: lbl, urutan: 10 + (sekarang.getFullYear() * 12 + sekarang.getMonth() - bln) };
  }
  return { kunci: 'semua', label: '', urutan: 0 };
}

/**
 * Kelompokkan berkas (yang sudah diurutkan) ala Finder. Urutan di dalam kelompok dipertahankan; kelompok tersusun
 * menurut urutan alaminya (jenis: dokumen dulu; tanggal: terbaru dulu; ukuran: terbesar dulu). "tidak" = satu kelompok.
 */
export function kelompokkanBerkas<T extends BerkasUrut>(daftar: readonly T[], k: KelompokBerkas, sekarang: Date = new Date()): Array<KelompokIsi<T>> {
  if (k === 'tidak') return daftar.length ? [{ kunci: 'semua', label: '', isi: [...daftar] }] : [];
  const peta = new Map<string, KelompokIsi<T> & { urutan: number }>();
  for (const b of daftar) {
    const g = kelompokDari(b, k, sekarang);
    const ada = peta.get(g.kunci);
    if (ada) ada.isi.push(b);
    else peta.set(g.kunci, { kunci: g.kunci, label: g.label, urutan: g.urutan, isi: [b] });
  }
  return [...peta.values()].sort((a, b) => a.urutan - b.urutan || bandingNama(a.label, b.label)).map(({ kunci, label, isi }) => ({ kunci, label, isi }));
}

// ---------------------------------------------------------------- preferensi (localStorage)

export interface PrefBerkas {
  tampilan: TampilanBerkas;
  urut: UrutKolom;
  kelompok: KelompokBerkas;
  /** Sidebar: penuh, ikon saja, atau tersembunyi. */
  samping: 'penuh' | 'ikon' | 'tutup';
  /** Lebar sidebar (px). */
  lebar: number;
  /** Panel info di kanan terbuka. */
  info: boolean;
}

export const KUNCI_PREF_BERKAS = 'unipo-ui:kelola-berkas';
export const PREF_BERKAS_BAWAAN: PrefBerkas = { tampilan: 'ikon', urut: { kunci: 'tanggal', arah: 'turun' }, kelompok: 'tidak', samping: 'penuh', lebar: 256, info: false };

const TAMPILAN: TampilanBerkas[] = ['ikon', 'daftar', 'kolom', 'galeri'];
const KELOMPOK: KelompokBerkas[] = ['tidak', 'jenis', 'tanggal', 'ukuran', 'pemilik'];
const KUNCI: KunciUrut[] = ['nama', 'tanggal', 'ukuran', 'jenis'];

/** Rapikan preferensi tersimpan (nilai rusak/lama diabaikan). */
export function rapikanPref(x: unknown): Partial<PrefBerkas> {
  if (!x || typeof x !== 'object') return {};
  const o = x as Record<string, unknown>;
  const r: Partial<PrefBerkas> = {};
  if (TAMPILAN.includes(o.tampilan as TampilanBerkas)) r.tampilan = o.tampilan as TampilanBerkas;
  const u = o.urut as Record<string, unknown> | undefined;
  if (u && KUNCI.includes(u.kunci as KunciUrut) && (u.arah === 'naik' || u.arah === 'turun')) r.urut = { kunci: u.kunci as KunciUrut, arah: u.arah };
  if (KELOMPOK.includes(o.kelompok as KelompokBerkas)) r.kelompok = o.kelompok as KelompokBerkas;
  if (o.samping === 'penuh' || o.samping === 'ikon' || o.samping === 'tutup') r.samping = o.samping;
  if (typeof o.lebar === 'number' && o.lebar >= 180 && o.lebar <= 420) r.lebar = Math.round(o.lebar);
  if (typeof o.info === 'boolean') r.info = o.info;
  return r;
}

/** Baca preferensi; localStorage bisa tidak ada atau melempar (mode privat, iframe terblokir). */
export function bacaPrefBerkas(kunci = KUNCI_PREF_BERKAS): Partial<PrefBerkas> {
  try {
    if (typeof localStorage === 'undefined') return {};
    return rapikanPref(JSON.parse(localStorage.getItem(kunci) ?? 'null'));
  } catch {
    return {};
  }
}

export function simpanPrefBerkas(p: Partial<PrefBerkas>, kunci = KUNCI_PREF_BERKAS): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(kunci, JSON.stringify({ ...bacaPrefBerkas(kunci), ...p }));
  } catch {
    /* penyimpanan peramban tidak tersedia: preferensi hanya berlaku di sesi ini */
  }
}
