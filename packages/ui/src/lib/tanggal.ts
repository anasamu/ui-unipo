// Pengurai & pemformat tanggal untuk isian ketik (DatePicker, DateRangePicker). Tanpa dependensi, zona waktu lokal.

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
/** Nama bulan (Indonesia & Inggris, lengkap/singkat) → indeks 0–11. Pencocokan berdasarkan awalan ≥ 3 huruf. */
const NAMA: Array<[string, number]> = [
  ...BULAN.map((b, i) => [b.toLowerCase(), i] as [string, number]),
  ['january', 0],
  ['february', 1],
  ['march', 2],
  ['may', 4],
  ['june', 5],
  ['july', 6],
  ['august', 7],
  ['agt', 7],
  ['ags', 7],
  ['sept', 8],
  ['october', 9],
  ['december', 11],
  ['des', 11],
  ['peb', 1],
  ['pebruari', 1],
  ['nop', 10],
  ['nopember', 10],
];

/** Indeks bulan (0–11) dari nama "jul", "Juli", "agt", "Oct"; -1 bila tidak dikenal. */
export function indeksBulan(nama: string): number {
  const n = nama.toLowerCase().replace(/\.$/, '');
  if (n.length < 3) return -1;
  for (const [k, i] of NAMA) if (k === n || (n.length >= 3 && k.startsWith(n))) return i;
  return -1;
}

/** Nama bulan Indonesia (0 = Januari). */
export const namaBulan = (i: number) => BULAN[((i % 12) + 12) % 12]!;

/** Tanggal → "20/07/2018" (format isian Indonesia). */
export function formatIsianTanggal(d: Date | null | undefined): string {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Tanggal → "20 Juli 2018". */
export const formatPanjangTanggal = (d: Date) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

export type HasilUraiTanggal = { ok: true; tanggal: Date } | { ok: false; pesan: string };

export interface OpsiUraiTanggal {
  min?: Date | null;
  max?: Date | null;
  /** Acuan tahun dua digit (bawaan: tahun ini). "yy" ≤ acuan+10 → 20yy, selainnya 19yy. */
  kini?: Date;
}

const awalHari = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Urai teks tanggal ketikan. Menerima `dd/mm/yyyy`, `dd-mm-yyyy`, `dd.mm.yyyy`, `d/m/yy`, `ddmmyyyy`,
 * `yyyy-mm-dd`, dan nama bulan ("20 jul 2018", "20 Juli 2018", "20-Agt-18").
 * Kosong → `null`. Tanggal yang tidak ada (30/02) atau di luar min/max → `{ ok: false, pesan }`.
 */
export function uraiTanggal(teks: string, opsi: OpsiUraiTanggal = {}): HasilUraiTanggal | null {
  // Rapikan spasi: "20 / 07 / 2018" → "20/07/2018".
  const s = teks.trim().replace(/\s+/g, ' ').replace(/\s*([-/.])\s*/g, '$1');
  if (!s) return null;
  let h: number, b: number, t: number;
  let tahun2 = false;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) {
    [t, b, h] = [+m[1]!, +m[2]!, +m[3]!];
  } else if ((m = s.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4}|\d{2})$/))) {
    [h, b, t] = [+m[1]!, +m[2]!, +m[3]!];
    tahun2 = m[3]!.length === 2;
  } else if ((m = s.match(/^(\d{2})(\d{2})(\d{4})$/))) {
    [h, b, t] = [+m[1]!, +m[2]!, +m[3]!];
  } else if ((m = s.match(/^(\d{1,2})[-/. ,]*([a-z]+)\.?[-/. ,]*(\d{4}|\d{2})$/i))) {
    const i = indeksBulan(m[2]!);
    if (i < 0) return { ok: false, pesan: `Nama bulan "${m[2]}" tidak dikenal.` };
    [h, b, t] = [+m[1]!, i + 1, +m[3]!];
    tahun2 = m[3]!.length === 2;
  } else {
    return { ok: false, pesan: 'Format tanggal tidak dikenali. Contoh: 20/07/2018.' };
  }
  if (tahun2) {
    const kini = (opsi.kini ?? new Date()).getFullYear();
    t = 2000 + t > kini + 10 ? 1900 + t : 2000 + t;
  }
  if (b < 1 || b > 12) return { ok: false, pesan: `Bulan ${b} tidak ada (1–12).` };
  if (t < 1000 || t > 9999) return { ok: false, pesan: 'Tahun harus 4 digit.' };
  const hariMaks = new Date(t, b, 0).getDate();
  if (h < 1 || h > hariMaks) return { ok: false, pesan: `Tanggal ${h} ${BULAN[b - 1]} ${t} tidak ada.` };
  const d = new Date(t, b - 1, h);
  if (opsi.min && d < awalHari(opsi.min)) return { ok: false, pesan: `Paling awal ${formatPanjangTanggal(opsi.min)}.` };
  if (opsi.max && d > awalHari(opsi.max)) return { ok: false, pesan: `Paling akhir ${formatPanjangTanggal(opsi.max)}.` };
  return { ok: true, tanggal: d };
}

/**
 * Masker ringan saat mengetik angka: "200" → "20/0", "20072018" → "20/07/2018".
 * Hanya bila pengguna menambah karakter dan teks berisi angka & "/" saja; "2/7/18" (garis miring diketik sendiri)
 * dibiarkan. Mengetik "-" setelah 4 angka ("20/18-") dikembalikan ke format ISO ("2018-").
 */
export function maskerTanggal(baru: string, lama: string): string {
  if (baru.length <= lama.length) return baru;
  const iso = baru.match(/^(\d{2})\/(\d{2})-(.*)$/);
  if (iso) return `${iso[1]}${iso[2]}-${iso[3]}`;
  if (!/^[\d/]*$/.test(baru)) return baru;
  // Garis miring diketik sendiri pada posisi tak baku (mis. "2/7/18"): biarkan.
  if (/^\d\//.test(baru) || /^\d{2}\/\d\//.test(baru)) return baru;
  const angka = baru.replace(/\//g, '');
  if (angka.length > 8) return lama;
  if (angka.length <= 2) return baru.endsWith('/') && angka.length === 2 ? `${angka}/` : angka;
  const out = `${angka.slice(0, 2)}/${angka.slice(2, 4)}${angka.length > 4 ? '/' + angka.slice(4) : ''}`;
  return baru.endsWith('/') && angka.length === 4 ? `${out}/` : out;
}
