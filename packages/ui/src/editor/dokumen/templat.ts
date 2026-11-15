/**
 * Templat surat: penanda `{{nama}}` dan pengisiannya, cermin `Arsip\Services\SuratService::isiTemplat` di SIAKAD.
 * Penanda bawaan diisi server dari unit dan surat; penanda lain dari `data_templat`. Nilai di-escape, penanda yang
 * tidak punya nilai dibiarkan apa adanya.
 */

export interface PenandaTemplat {
  nama: string;
  label: string;
  /** Diisi otomatis oleh server (tidak perlu ditanyakan ke pengguna). */
  bawaan?: boolean;
  contoh?: string;
}

/** Penanda yang selalu tersedia di templat surat arsip. */
export const PENANDA_BAWAAN: PenandaTemplat[] = [
  { nama: 'unit', label: 'Nama unit pengirim', bawaan: true, contoh: 'Fakultas Teknik' },
  { nama: 'unit_singkatan', label: 'Singkatan unit', bawaan: true, contoh: 'FT' },
  { nama: 'tanggal', label: 'Tanggal surat', bawaan: true, contoh: '15 November 2026' },
  { nama: 'perihal', label: 'Perihal', bawaan: true, contoh: 'Undangan rapat' },
  { nama: 'lampiran', label: 'Lampiran', bawaan: true, contoh: '1 (satu) berkas' },
];

const POLA = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Nama penanda di dalam teks/HTML, urut kemunculan, tanpa duplikat. */
export function penandaDi(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(POLA)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Penanda yang perlu diisi pengguna (bukan bawaan), dengan label dari nama: `nama_mahasiswa` → "Nama mahasiswa". */
export function penandaIsian(html: string): PenandaTemplat[] {
  const bawaan = new Set(PENANDA_BAWAAN.map((p) => p.nama));
  return penandaDi(html)
    .filter((n) => !bawaan.has(n))
    .map((nama) => ({ nama, label: nama.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) }));
}

/** "2026-11-15" → "15 November 2026" (format tanggal surat di server). */
export function tanggalSurat(tanggal?: string | Date | null): string {
  const d = tanggal instanceof Date ? tanggal : tanggal ? new Date(`${String(tanggal).slice(0, 10)}T00:00:00`) : new Date();
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  return `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}`;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export interface KonteksTemplat {
  unit?: { nama?: string | null; singkatan?: string | null } | null;
  surat?: { tanggal_surat?: string | null; perihal?: string | null; lampiran?: string | null } | null;
  /** Bungkus penanda yang belum terisi dengan `<mark class="ub-penanda">` (untuk pratinjau). */
  tandaiKosong?: boolean;
}

/** Isi penanda `{{nama}}` dengan data. Sama dengan isiTemplat di server, plus opsi menandai penanda kosong. */
export function isiTemplat(html: string, data: Record<string, unknown> = {}, k: KonteksTemplat = {}): string {
  const bawaan: Record<string, string> = {
    unit: k.unit?.nama ?? '',
    unit_singkatan: k.unit?.singkatan ?? '',
    tanggal: tanggalSurat(k.surat?.tanggal_surat),
    perihal: k.surat?.perihal ?? '',
    lampiran: k.surat?.lampiran ?? '',
  };
  const nilai: Record<string, string> = { ...bawaan };
  for (const [kunci, v] of Object.entries(data)) if (v !== null && v !== undefined && typeof v !== 'object') nilai[kunci] = String(v);
  return html.replace(POLA, (asli, nama: string) => {
    if (Object.prototype.hasOwnProperty.call(nilai, nama) && (!k.tandaiKosong || nilai[nama] !== '')) return escape(nilai[nama]);
    return k.tandaiKosong ? `<mark class="ub-penanda">${escape(asli)}</mark>` : asli;
  });
}
