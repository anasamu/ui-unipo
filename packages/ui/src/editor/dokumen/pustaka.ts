/**
 * Daftar pustaka dan sitasi gaya APA edisi 7 (bawaan pedoman skripsi di banyak prodi). Penulis ditulis
 * "Nama belakang, Inisial." dipisah titik koma, mis. "Santoso, B.; Wijaya, A. R.". Nama lembaga tulis apa adanya.
 */

export type JenisPustaka = 'buku' | 'jurnal' | 'prosiding' | 'skripsi' | 'web' | 'lainnya';

export interface PustakaSkripsi {
  id: string;
  jenis: JenisPustaka;
  /** "Santoso, B.; Wijaya, A. R." */
  penulis: string;
  tahun: string;
  judul: string;
  /** Nama jurnal, prosiding, atau penerbit (buku), atau nama situs (web), atau perguruan tinggi (skripsi). */
  sumber?: string;
  volume?: string;
  nomor?: string;
  halaman?: string;
  /** Kota terbit (buku). APA 7 tidak memakainya, tapi sebagian pedoman lokal masih meminta. */
  kota?: string;
  doi?: string;
  url?: string;
  /** Tanggal akses (web), YYYY-MM-DD. */
  diakses?: string;
}

export const JENIS_PUSTAKA: Array<{ value: JenisPustaka; label: string; sumber: string }> = [
  { value: 'jurnal', label: 'Artikel jurnal', sumber: 'Nama jurnal' },
  { value: 'buku', label: 'Buku', sumber: 'Penerbit' },
  { value: 'prosiding', label: 'Prosiding', sumber: 'Nama prosiding' },
  { value: 'skripsi', label: 'Skripsi / tesis', sumber: 'Perguruan tinggi' },
  { value: 'web', label: 'Laman web', sumber: 'Nama situs' },
  { value: 'lainnya', label: 'Lainnya', sumber: 'Sumber' },
];

const daftarPenulis = (p: string) =>
  p
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);

const namaBelakang = (penulis: string) => penulis.split(',')[0].trim();

/** Sitasi dalam teks: (Santoso, 2020), (Santoso & Wijaya, 2020), (Santoso et al., 2020). */
export function sitasi(p: Pick<PustakaSkripsi, 'penulis' | 'tahun'>, opsi: { naratif?: boolean; halaman?: string } = {}): string {
  const a = daftarPenulis(p.penulis).map(namaBelakang);
  const nama = a.length === 0 ? 'Anonim' : a.length === 1 ? a[0] : a.length === 2 ? `${a[0]} ${opsi.naratif ? 'dan' : '&'} ${a[1]}` : `${a[0]} et al.`;
  const tahun = p.tahun?.trim() || 't.t.';
  const hal = opsi.halaman ? `, hlm. ${opsi.halaman}` : '';
  return opsi.naratif ? `${nama} (${tahun}${hal})` : `(${nama}, ${tahun}${hal})`;
}

const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const titik = (s: string) => (/[.?!]$/.test(s) ? s : `${s}.`);

function penulisApa(p: string): string {
  const a = daftarPenulis(p);
  if (!a.length) return '';
  if (a.length === 1) return a[0];
  if (a.length <= 20) return `${a.slice(0, -1).join(', ')}, & ${a[a.length - 1]}`;
  return `${a.slice(0, 19).join(', ')}, … ${a[a.length - 1]}`;
}

/** Satu entri daftar pustaka APA 7 sebagai HTML (judul/jurnal miring dengan <em>). */
export function entriApa(p: PustakaSkripsi): string {
  const penulis = penulisApa(p.penulis);
  const tahun = `(${p.tahun?.trim() || 't.t.'}).`;
  const kepala = penulis ? `${e(titik(penulis))} ${tahun}` : '';
  const judul = p.judul.trim();
  const tautan = p.doi ? ` https://doi.org/${e(p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))}` : p.url ? ` ${e(p.url)}` : '';
  const sumber = p.sumber?.trim() ?? '';
  let isi: string;
  switch (p.jenis) {
    case 'jurnal': {
      const vol = p.volume ? `, <em>${e(p.volume)}</em>${p.nomor ? `(${e(p.nomor)})` : ''}` : '';
      const hal = p.halaman ? `, ${e(p.halaman)}` : '';
      isi = `${e(titik(judul))} <em>${e(sumber)}</em>${vol}${hal}.`;
      break;
    }
    case 'buku':
      isi = `<em>${e(titik(judul))}</em> ${p.kota ? `${e(p.kota)}: ` : ''}${sumber ? e(titik(sumber)) : ''}`;
      break;
    case 'prosiding':
      isi = `${e(titik(judul))} <em>${e(sumber)}</em>${p.halaman ? `, ${e(p.halaman)}` : ''}.`;
      break;
    case 'skripsi':
      isi = `<em>${e(judul)}</em> [Skripsi${sumber ? `, ${e(sumber)}` : ''}].`;
      break;
    case 'web':
      isi = `<em>${e(titik(judul))}</em> ${sumber ? e(titik(sumber)) : ''}${p.diakses ? ` Diakses ${e(p.diakses)}.` : ''}`;
      break;
    default:
      isi = `${e(titik(judul))} ${sumber ? e(titik(sumber)) : ''}`;
  }
  return `${kepala} ${isi}${tautan}`.replace(/\s+/g, ' ').trim();
}

/** Urutkan pustaka sesuai APA: abjad nama belakang penulis pertama, lalu tahun. */
export function urutPustaka(daftar: PustakaSkripsi[]): PustakaSkripsi[] {
  return [...daftar].sort((a, b) => {
    const x = (a.penulis || a.judul).localeCompare(b.penulis || b.judul, 'id', { sensitivity: 'base' });
    return x || (a.tahun ?? '').localeCompare(b.tahun ?? '');
  });
}

/** Apakah pustaka ini dikutip di teks (mencari "Nama, tahun" atau "Nama (tahun"). */
export function dikutip(p: PustakaSkripsi, teks: string): boolean {
  const a = daftarPenulis(p.penulis).map(namaBelakang);
  if (!a.length || !p.tahun) return false;
  const nama = a[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${nama}[^()]{0,40}?(,\\s*|\\()${p.tahun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(teks);
}

/** Pustaka yang wajib lengkap sebelum dicetak. */
export function pustakaLengkap(p: PustakaSkripsi): boolean {
  return Boolean(p.judul.trim() && p.tahun.trim() && (p.penulis.trim() || p.sumber?.trim()));
}
