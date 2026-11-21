// Utilitas murni untuk DataTable: format kolom, CSV aman, ambil semua halaman dari server, pilihan baris per halaman.
import { formatDate, formatNumber, formatPersen, formatRupiah, formatTime } from './format';

/** Format nilai kolom bawaan. Angka (`angka`, `rupiah`, `persen`) otomatis rata kanan. */
export type FormatKolom = 'teks' | 'angka' | 'rupiah' | 'persen' | 'tanggal' | 'tanggal-waktu' | 'status';

/** Nada lencana untuk kolom `status`. */
export type NadaStatus = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
/** Peta nilai status → label awam (+ nada lencana), mis. { lunas: { label: 'Lunas', tone: 'success' } }. */
export type PetaStatus = Record<string, string | { label: string; tone?: NadaStatus }>;

const KANAN: ReadonlySet<FormatKolom> = new Set(['angka', 'rupiah', 'persen']);

/** Perataan bawaan sebuah format: angka/uang/persen rata kanan. */
export function rataFormat(format: FormatKolom | undefined): 'end' | undefined {
  return format && KANAN.has(format) ? 'end' : undefined;
}

/** Ubah nilai mentah jadi angka bila bisa ('1500000', '12.5'); selain itu null. */
export function keAngka(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  return null;
}

/** Label dan nada status dari peta; tanpa peta, nilai mentah ditampilkan apa adanya. */
export function labelStatus(v: unknown, peta?: PetaStatus): { label: string; tone: NadaStatus } {
  if (v == null || v === '') return { label: '–', tone: 'neutral' };
  const e = peta?.[String(v)];
  if (e == null) return { label: String(v), tone: 'neutral' };
  return typeof e === 'string' ? { label: e, tone: 'neutral' } : { label: e.label, tone: e.tone ?? 'neutral' };
}

/** Teks tampilan sel berformat (tanpa elemen React). */
export function teksFormat(v: unknown, format: FormatKolom | undefined, peta?: PetaStatus): string {
  if (v == null || v === '') return '–';
  switch (format) {
    case 'angka': {
      const n = keAngka(v);
      return n == null ? String(v) : formatNumber(n);
    }
    case 'rupiah': {
      const n = keAngka(v);
      return n == null ? String(v) : formatRupiah(n);
    }
    case 'persen': {
      const n = keAngka(v);
      return n == null ? String(v) : formatPersen(n);
    }
    case 'tanggal':
      return formatDate(v as string);
    case 'tanggal-waktu': {
      const s = String(v);
      return `${formatDate(s)} ${formatTime(s.length === 10 ? s + 'T00:00:00' : s)}`;
    }
    case 'status':
      return labelStatus(v, peta).label;
    default:
      return String(v);
  }
}

/**
 * Nilai sel untuk berkas CSV. Angka dan uang tetap angka mentah (bisa dijumlah di lembar kerja, tanpa "Rp" dan titik
 * ribuan); tanggal tetap ISO; status memakai label awam.
 */
export function nilaiCsv(v: unknown, format: FormatKolom | undefined, peta?: PetaStatus): unknown {
  if (format === 'status') return v == null || v === '' ? '' : labelStatus(v, peta).label;
  if (format && KANAN.has(format)) return keAngka(v) ?? v;
  return v;
}

/**
 * Satu sel CSV: dikutip bila perlu, dan dinetralkan dari injeksi rumus (teks yang diawali = + - @ tab/CR dibuka
 * lembar kerja sebagai rumus). Angka negatif sungguhan (mis. -150000 pada data keuangan) tidak diubah.
 */
export function selCsv(v: unknown): string {
  let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s) && !/^[-+]?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Susun isi CSV dari judul dan baris nilai. */
export function susunCsv(judul: string[], baris: unknown[][]): string {
  return [judul.map(selCsv).join(','), ...baris.map((r) => r.map(selCsv).join(','))].join('\r\n');
}

/** Batas aman baris yang diambil untuk ekspor (sama dengan bawaan `all()` SDK). */
export const BATAS_EKSPOR = 10_000;

export interface HalamanServer<T> {
  data: T[] | null | undefined;
  meta?: { page?: number | null; per_page?: number | null; total?: number | null; total_pages?: number | null } | null;
}

export interface OpsiAmbilSemua<T> {
  /** Ambil satu halaman (mulai 1) dengan jumlah per halaman tertentu. */
  ambil: (page: number, perPage: number, signal: AbortSignal) => Promise<HalamanServer<T>>;
  signal: AbortSignal;
  /** Jumlah baris maksimum yang diambil (bawaan BATAS_EKSPOR). */
  batas?: number;
  /** Ukuran halaman yang diminta (bawaan 100, batas umum API SIAKAD). */
  perPage?: number;
  onProgress?: (terambil: number, total: number | null) => void;
}

export interface HasilAmbilSemua<T> {
  rows: T[];
  /** Total menurut server (null bila server tidak memberi). */
  total: number | null;
  /** true bila data dipotong oleh `batas`. */
  terpotong: boolean;
}

/**
 * Ambil semua baris sesuai saringan dengan paging berulang. Berhenti saat halaman kosong, jumlah mencapai `total`
 * server, halaman terakhir (`total_pages`), atau `batas`. Ukuran halaman mengikuti `meta.per_page` bila server
 * membatasinya (mis. minta 100, server memberi 50).
 */
export async function ambilSemuaHalaman<T>({ ambil, signal, batas = BATAS_EKSPOR, perPage = 100, onProgress }: OpsiAmbilSemua<T>): Promise<HasilAmbilSemua<T>> {
  const rows: T[] = [];
  let total: number | null = null;
  // Tiap putaran menambah ≥ 1 baris (halaman kosong menghentikan), jadi perulangan pasti berhenti di `batas`.
  for (let page = 1; ; page++) {
    if (signal.aborted) throw new DOMException('Dibatalkan', 'AbortError');
    const res = await ambil(page, perPage, signal);
    const data = Array.isArray(res.data) ? res.data : [];
    if (res.meta?.total != null) total = Number(res.meta.total);
    rows.push(...data);
    onProgress?.(Math.min(rows.length, batas), total);
    const per = Number(res.meta?.per_page) || perPage;
    const halamanTerakhir = res.meta?.total_pages != null && page >= Number(res.meta.total_pages);
    if (data.length === 0 || rows.length >= batas || (total != null && rows.length >= total) || halamanTerakhir) break;
    if (total == null && res.meta?.total_pages == null && data.length < per) break;
  }
  return { rows: rows.slice(0, batas), total, terpotong: rows.length > batas || (total != null && total > batas) };
}

/** Pilihan baris per halaman: bawaan + nilai yang sedang dipakai (mis. 25), terurut. */
export function opsiPerHalaman(pilihan: number[], sekarang: number): number[] {
  return [...new Set([...pilihan, sekarang])].filter((n) => n > 0).sort((a, b) => a - b);
}

/** Nama berkas CSV: tambahkan ".csv"; tandai "sebagian" bila data dipotong batas. */
export function namaBerkasCsv(nama: string, sebagian?: { diambil: number; total: number | null }): string {
  const dasar = nama.replace(/\.csv$/i, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'data';
  if (!sebagian) return `${dasar}.csv`;
  return `${dasar}-sebagian-${sebagian.diambil}${sebagian.total != null ? `-dari-${sebagian.total}` : ''}.csv`;
}
