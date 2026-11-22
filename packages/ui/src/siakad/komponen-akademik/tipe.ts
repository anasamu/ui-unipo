/*
 * Bentuk data komponen akademik = respons API SIAKAD /v1 apa adanya (lihat unipo-sdk/openapi.json), supaya aplikasi
 * cukup meneruskan `data` dari SDK tanpa memetakan ulang. Kolom tambahan dibiarkan.
 */

type Angka = number | string | null | undefined;

/** Baris `mata_kuliah` dari GET /v1/mahasiswa/{nim}/krs. */
export interface BarisKrs {
  idkrs?: number | null;
  tahun_id?: string | null;
  semester?: number | null;
  kode_mk?: string | null;
  nama_mk?: string | null;
  sks?: Angka;
  kelas?: string | null;
  idj?: number | null;
  status_krs?: string | null;
  disetujui?: boolean | null;
  hari?: string | null;
  jam_ke?: number | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  ruang?: string | null;
  nama_ruang?: string | null;
  nidn_dosen?: string | null;
  nama_dosen?: string | null;
}

/** GET /v1/mahasiswa/{nim}/krs. */
export interface DataKrs {
  nim?: string | null;
  tahun_id?: string | null;
  jumlah_sks?: Angka;
  mata_kuliah?: BarisKrs[] | null;
}

/** Baris nilai satu mata kuliah (KHS, transkrip). */
export interface BarisNilaiMk {
  kode_mk?: string | null;
  nama_mk?: string | null;
  tahun_id?: string | null;
  semester?: number | null;
  kelas?: string | null;
  sks?: Angka;
  nilai_huruf?: string | null;
  bobot?: Angka;
  mutu?: Angka;
  /** false = nilai belum dirilis (semester berjalan). */
  nilai_ditampilkan?: boolean;
}

export interface IndeksPrestasi {
  sks?: Angka;
  nilai?: Angka;
}

/** Satu periode GET /v1/mahasiswa/{nim}/khs. */
export interface PeriodeKhs {
  nim?: string | null;
  tahun_id?: string | null;
  mata_kuliah?: BarisNilaiMk[] | null;
  jumlah_sks?: Angka;
  ips?: IndeksPrestasi | null;
  ipk?: IndeksPrestasi | null;
}

/** GET /v1/mahasiswa/{nim}/transkrip (atau bagian nilai dari /v1/akademik/mahasiswa/{nim}/transkrip-sementara). */
export interface DataTranskrip {
  nim?: string | null;
  nama?: string | null;
  kode_prodi?: string | null;
  mata_kuliah?: BarisNilaiMk[] | null;
  jumlah_sks?: Angka;
  jumlah_mutu?: Angka;
  ipk?: IndeksPrestasi | null;
  /** Dari transkrip-sementara: predikat menurut m_predikat. */
  predikat_sementara?: string | null;
}

/** Baris jadwal dari GET /v1/mahasiswa/{nim}/jadwal (`jadwal[]`), GET /v1/dosen/{nidn}/jadwal, atau GET /v1/jadwal. */
export interface SesiKuliah {
  idj?: number | null;
  tahun_id?: string | null;
  kode_prodi?: string | null;
  semester?: number | null;
  kelas?: string | null;
  kode_mk?: string | null;
  nama_mk?: string | null;
  sks?: Angka;
  /** Kode hari SIAKAD "1" (Senin) … "7" (Minggu), atau nama hari. */
  hari?: string | null;
  jam_ke?: number | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  ruang?: string | null;
  nama_ruang?: string | null;
  kapasitas?: number | null;
  dosen?: { nidn?: string | null; nama?: string | null } | string | null;
  tim_pengajar?: Array<{ nidn?: string | null; nama?: string | null }> | null;
}

/** Identitas pemilik dokumen untuk kepala KHS/transkrip dan versi cetak. Nama, bukan kode. */
export interface IdentitasAkademik {
  nama?: string | null;
  nim?: string | null;
  prodi?: string | null;
  fakultas?: string | null;
  jenjang?: string | null;
  angkatan?: string | number | null;
  dosenPa?: string | null;
}

export const angka = (v: Angka): number => {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const adaAngka = (v: Angka) => v != null && v !== '' && Number.isFinite(Number(v));
export const duaDesimal = (v: Angka) => (adaAngka(v) ? Number(v).toFixed(2) : '–');

const NAMA_HARI = ['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
/** Nomor hari 1 (Senin) … 7 (Minggu) dari kode SIAKAD atau nama hari; 0 bila tidak dikenali. */
export function nomorHari(h: string | number | null | undefined): number {
  if (h == null || h === '') return 0;
  const s = String(h).trim();
  if (/^\d$/.test(s)) return Number(s) >= 1 && Number(s) <= 7 ? Number(s) : 0;
  const i = NAMA_HARI.findIndex((x) => x && x.toLowerCase() === s.toLowerCase());
  return i > 0 ? i : 0;
}
export const namaHari = (h: string | number | null | undefined) => NAMA_HARI[nomorHari(h)] || (h ? String(h) : '');
/** Nomor hari ISO (1 Senin … 7 Minggu) untuk tanggal. */
export const hariDari = (d: Date) => ((d.getDay() + 6) % 7) + 1;

/** "07:30:00" → menit sejak 00:00 (null bila kosong/tidak valid). */
export function menitDari(jam: string | null | undefined): number | null {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(String(jam ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
export const jamPendek = (jam: string | null | undefined) => {
  const m = menitDari(jam);
  return m == null ? '' : `${String(Math.floor(m / 60)).padStart(2, '0')}.${String(m % 60).padStart(2, '0')}`;
};

export const namaDosenSesi = (s: Pick<SesiKuliah, 'dosen' | 'tim_pengajar'>): string => {
  const utama = typeof s.dosen === 'string' ? s.dosen : (s.dosen?.nama ?? '');
  const tim = (s.tim_pengajar ?? []).map((t) => t.nama).filter((n): n is string => !!n && n !== utama);
  return [utama, ...tim].filter(Boolean).join(', ');
};

/** Status persetujuan baris KRS: `disetujui` bila dikirim, selain itu status_krs 'T'/'1'. */
export const krsDisetujui = (m: Pick<BarisKrs, 'disetujui' | 'status_krs'>) => (m.disetujui != null ? !!m.disetujui : m.status_krs === 'T' || m.status_krs === '1');
