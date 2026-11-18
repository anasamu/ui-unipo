'use client';
import * as React from 'react';
import {
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  FileText,
  GraduationCap,
  KeyRound,
  LifeBuoy,
  LogIn,
  MessagesSquare,
  Moon,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../components/actions';
import { Alert } from '../components/display';
import { LogoAplikasi } from '../components/identity';
import { HalamanPemeliharaan } from '../components/pemeliharaan';
import { Ilustrasi } from '../ikon/ilustrasi';
import { terapkanModeTampilan, type DataTemaAplikasi } from '../tema';
import { PengumumanTampil } from './pengumuman-lintas';
import { useOptionalSiakad, useSiakadQuery } from './provider';

// ---------------------------------------------------------------- Tipe dan pilihan

/** Posisi panel masuk: kiri/kanan (sisi visual di seberangnya), belah 50/50, kartu di tengah, atau minimal tanpa visual. */
export type TataLetakMasuk = 'kiri' | 'kanan' | 'belah' | 'tengah' | 'minimal';
/** Isi sisi visual. */
export type LatarMasuk = 'ilustrasi' | 'gambar' | 'slider' | 'gradien' | 'pola' | 'polos' | 'fitur';
export type FokusGambarMasuk = 'tengah' | 'atas' | 'bawah' | 'kiri' | 'kanan';
export type LapisanGambarMasuk = 'tanpa' | 'gelap' | 'gradien' | 'utama';
export type TransisiSlideMasuk = 'pudar' | 'geser' | 'zoom';
export type IkonPoinMasuk = 'perisai' | 'pengguna' | 'grafik' | 'buku' | 'kalender' | 'dokumen' | 'dompet' | 'toga' | 'kunci' | 'pesan' | 'lencana' | 'gedung' | 'bantuan' | 'kilau';

export interface SlideMasuk {
  /** URL gambar (https://… atau /…) atau `berkas:<uuid>` dari unggahan berkas publik. */
  gambar: string;
  judul?: string;
  teks?: string;
}

export interface PoinMasuk {
  ikon?: IkonPoinMasuk;
  judul: string;
  teks?: string;
}

/** Pengaturan halaman masuk (disimpan di `tata` tema aplikasi: objek `masuk`, daftar `masuk_slide` dan `masuk_poin`). */
export interface TataMasuk {
  tata: TataLetakMasuk;
  latar: LatarMasuk;
  /** Kunci adegan <Ilustrasi>. */
  ilustrasi: string;
  /** Ilustrasi sendiri (SVG/PNG); bila diisi menggantikan `ilustrasi`. */
  ilustrasiGambar: string;
  gambar: string;
  fokus: FokusGambarMasuk;
  lapisan: LapisanGambarMasuk;
  slide: SlideMasuk[];
  /** Detik per slide. */
  interval: number;
  transisi: TransisiSlideMasuk;
  /** Animasi latar (gradien, pola, ilustrasi melayang, slider otomatis). Selalu mati bila pengguna memilih kurangi gerakan. */
  gerak: boolean;
  /** Warna latar sisi visual (hex); kosong = warna utama tema. */
  warna: string;
  judul: string;
  keterangan: string;
  /** Teks kecil di bawah tombol. Tautan: [teks](/alamat). */
  catatan: string;
  /** Judul dan teks sambutan di sisi visual. */
  slogan: string;
  sloganTeks: string;
  bantuanLabel: string;
  bantuanUrl: string;
  poin: PoinMasuk[];
  /** Tampilkan pengumuman lintas aplikasi (sasaran publik) di panel masuk. */
  pengumuman: boolean;
  /** Tombol terang/gelap di pojok panel. */
  pilihMode: boolean;
  /** Teks kontak di halaman pemeliharaan. */
  kontak: string;
}

export const PILIHAN_TATA_MASUK: Array<{ value: TataLetakMasuk; label: string; keterangan: string }> = [
  { value: 'kiri', label: 'Panel kiri', keterangan: 'Panel masuk di kiri, visual di kanan.' },
  { value: 'kanan', label: 'Panel kanan', keterangan: 'Visual di kiri, panel masuk di kanan.' },
  { value: 'belah', label: 'Terbelah', keterangan: 'Dua sisi sama lebar.' },
  { value: 'tengah', label: 'Kartu tengah', keterangan: 'Kartu mengambang di atas latar penuh.' },
  { value: 'minimal', label: 'Minimal', keterangan: 'Tanpa sisi visual, fokus ke tombol masuk.' },
];

export const PILIHAN_LATAR_MASUK: Array<{ value: LatarMasuk; label: string; keterangan: string }> = [
  { value: 'ilustrasi', label: 'Ilustrasi', keterangan: 'Ilustrasi vektor bawaan atau gambar SVG/PNG sendiri.' },
  { value: 'gambar', label: 'Foto', keterangan: 'Satu foto dengan lapisan gelap atau gradasi.' },
  { value: 'slider', label: 'Slider', keterangan: 'Beberapa foto bergantian, masing-masing dengan judul.' },
  { value: 'gradien', label: 'Gradien bergerak', keterangan: 'Warna tema yang bergerak pelan.' },
  { value: 'pola', label: 'Pola geometris', keterangan: 'Pola titik dan garis yang bergeser pelan.' },
  { value: 'polos', label: 'Warna polos', keterangan: 'Satu warna dengan teks sambutan.' },
  { value: 'fitur', label: 'Daftar fitur', keterangan: 'Poin-poin fitur aplikasi dengan ikon.' },
];

export const PILIHAN_FOKUS_MASUK: Array<{ value: FokusGambarMasuk; label: string }> = [
  { value: 'tengah', label: 'Tengah' },
  { value: 'atas', label: 'Atas' },
  { value: 'bawah', label: 'Bawah' },
  { value: 'kiri', label: 'Kiri' },
  { value: 'kanan', label: 'Kanan' },
];

export const PILIHAN_LAPISAN_MASUK: Array<{ value: LapisanGambarMasuk; label: string }> = [
  { value: 'gradien', label: 'Gradasi' },
  { value: 'gelap', label: 'Gelap' },
  { value: 'utama', label: 'Warna utama' },
  { value: 'tanpa', label: 'Tanpa' },
];

export const PILIHAN_TRANSISI_MASUK: Array<{ value: TransisiSlideMasuk; label: string }> = [
  { value: 'pudar', label: 'Pudar' },
  { value: 'geser', label: 'Geser' },
  { value: 'zoom', label: 'Perbesar pelan' },
];

/** Ilustrasi bawaan bertema kampus yang cocok untuk halaman masuk. */
export const ILUSTRASI_MASUK: Array<{ value: string; label: string }> = [
  { value: 'selamat-datang', label: 'Selamat datang' },
  { value: 'maba', label: 'Mahasiswa baru' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'tendik', label: 'Tenaga kependidikan' },
  { value: 'wisuda', label: 'Wisuda' },
  { value: 'e-learning', label: 'Belajar daring' },
  { value: 'bimbingan', label: 'Bimbingan' },
  { value: 'keamanan', label: 'Keamanan akun' },
  { value: 'krs', label: 'Akademik (KRS)' },
  { value: 'keu', label: 'Keuangan' },
  { value: 'sdm', label: 'Kepegawaian' },
  { value: 'spmi', label: 'Penjaminan mutu' },
  { value: 'lppm', label: 'Penelitian' },
  { value: 'dasbor', label: 'Dasbor' },
  { value: 'perpustakaan', label: 'Perpustakaan' },
  { value: 'humas', label: 'Humas' },
  { value: 'pmb', label: 'Pendaftaran' },
  { value: 'tracer', label: 'Alumni' },
  { value: 'profil', label: 'Profil' },
  { value: 'portal-api', label: 'Integrasi API' },
  { value: 'akses', label: 'Hak akses' },
  { value: 'fakultas', label: 'Fakultas' },
];

export const IKON_POIN_MASUK: Record<IkonPoinMasuk, { label: string; ikon: React.ComponentType }> = {
  perisai: { label: 'Perisai', ikon: ShieldCheck },
  pengguna: { label: 'Pengguna', ikon: Users },
  grafik: { label: 'Grafik', ikon: BarChart3 },
  buku: { label: 'Buku', ikon: BookOpen },
  kalender: { label: 'Kalender', ikon: CalendarCheck },
  dokumen: { label: 'Dokumen', ikon: FileText },
  dompet: { label: 'Dompet', ikon: Wallet },
  toga: { label: 'Toga', ikon: GraduationCap },
  kunci: { label: 'Kunci', ikon: KeyRound },
  pesan: { label: 'Pesan', ikon: MessagesSquare },
  lencana: { label: 'Lencana', ikon: BadgeCheck },
  gedung: { label: 'Gedung', ikon: Building2 },
  bantuan: { label: 'Bantuan', ikon: LifeBuoy },
  kilau: { label: 'Kilau', ikon: Sparkles },
};

/** Bawaan semua aplikasi bila tema dan aplikasi tidak mengatur apa pun. `{nama}` diganti nama aplikasi. */
export const BAWAAN_MASUK: TataMasuk = {
  tata: 'kiri',
  latar: 'ilustrasi',
  ilustrasi: 'selamat-datang',
  ilustrasiGambar: '',
  gambar: '',
  fokus: 'tengah',
  lapisan: 'gradien',
  slide: [],
  interval: 6,
  transisi: 'pudar',
  gerak: true,
  warna: '',
  judul: 'Masuk',
  keterangan: 'Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
  catatan: '',
  slogan: 'Satu akun untuk semua layanan kampus.',
  sloganTeks: '{nama} terhubung dengan SIAKAD dan SSO UNIPO, jadi Anda cukup mengingat satu akun.',
  bantuanLabel: '',
  bantuanUrl: '',
  poin: [],
  pengumuman: false,
  pilihMode: true,
  kontak: 'Butuh bantuan? Hubungi Pustikom UNIPO.',
};

/**
 * Bawaan per aplikasi bawaan UNIPO (kode tema aplikasi). Admin bisa mengganti semuanya lewat pengaturan tema
 * (bagian Halaman masuk); nilai di sini hanya titik awal.
 */
export const BAWAAN_MASUK_APLIKASI: Record<string, Partial<TataMasuk>> = {
  dashboard: {
    keterangan: 'Ruang kerja rektor, wakil rektor, dan direktur. Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
    catatan: 'Khusus pimpinan yang jabatannya sudah dipetakan ke bidang pimpinan. Belum bisa masuk? Hubungi Pustikom.',
    ilustrasi: 'dasbor',
    slogan: 'Satu tempat untuk memantau, menelusuri, dan memutuskan.',
    sloganTeks: 'Akademik, mutu, keuangan, SDM, sarana prasarana, kemahasiswaan, kerja sama, serta penelitian dan pengabdian, sesuai bidang yang Anda pegang.',
  },
  baak: {
    keterangan: 'Ruang kerja Biro Administrasi Akademik. Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
    catatan: 'Khusus petugas BAAK dan admin. Mahasiswa dan dosen memakai SIAKAD, E-Learning, atau dasbor fakultas. Cek keaslian dokumen akademik di [halaman verifikasi](/verifikasi).',
    ilustrasi: 'krs',
    slogan: 'Semua urusan akademik kampus, dari jadwal sampai pelaporan PDDikti.',
    sloganTeks: 'Perkuliahan, KRS, nilai, status mahasiswa, dokumen ber-QR, kelulusan, dan Neo Feeder dalam satu tempat.',
  },
  bauk: {
    keterangan: 'Ruang kerja Biro Administrasi Umum dan Keuangan. Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
    catatan: 'Khusus petugas BAUK, kasir, bendahara, dan admin. Mahasiswa membayar lewat SIAKAD. Cek keaslian slip gaji di [halaman verifikasi slip](/verifikasi/slip).',
    ilustrasi: 'keu',
    slogan: 'Keuangan kampus yang rapi, transparan, dan bisa dipertanggungjawabkan.',
    sloganTeks: 'UKT dan pembayaran mahasiswa, keringanan, payroll dosen dan tendik, kas per unit, buku besar, laporan keuangan, dan aset dalam satu tempat.',
  },
  lms: {
    keterangan: 'Gunakan akun SSO UNIPO: NIM dan password SIAKAD Anda.',
    catatan: 'E-Learning ini khusus mahasiswa. Dosen mengelola kelas, materi, dan penilaian lewat dasbor fakultas. Lupa password? Pakai tautan "Lupa password" di halaman SSO.',
    ilustrasi: 'e-learning',
    slogan: 'Belajar lebih teratur, di kelas maupun dari rumah.',
    sloganTeks: 'Materi, tugas, kuis, forum, presensi, dan nilai dalam satu tempat.',
  },
  lp2m: {
    keterangan: 'Penelitian, pengabdian kepada masyarakat, dan KKN Universitas Pohuwato. Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
    catatan: 'Untuk dosen, mahasiswa, reviewer, dan tim LP2M. Kolaborator luar kampus cukup membuka tautan undangan dari ketua. Cek keaslian dokumen di [halaman verifikasi](/verifikasi).',
    ilustrasi: 'lppm',
    slogan: 'Dari usulan hibah sampai luaran terverifikasi, dalam satu alur.',
    sloganTeks: 'Usulan, review, kontrak, pencairan, logbook, laporan, publikasi, HKI, KKN, dan rekap LKPS akreditasi.',
  },
  spmi: {
    keterangan: 'Sistem Penjaminan Mutu Internal Universitas Pohuwato. Gunakan akun SSO UNIPO (username dan password SIAKAD Anda).',
    catatan: 'LPM, pengelola mutu fakultas dan prodi (GKM/UJM), pimpinan unit, auditor, serta dosen, tendik, dan mahasiswa yang mengisi survei. Dokumen mutu dan status akreditasi terbuka untuk umum di [halaman transparansi mutu](/publik).',
    ilustrasi: 'spmi',
    slogan: 'Siklus PPEPP dari penetapan standar sampai peningkatan, untuk setiap unit kerja.',
    sloganTeks: 'Capaian indikator, audit mutu internal, temuan dan PTK, survei kepuasan, risiko, RTM, akreditasi, dan pelaporan SPMI dalam satu tempat.',
  },
  profile: {
    judul: 'Satu profil untuk semua layanan kampus',
    keterangan: 'Perbarui data pribadi, riwayat pendidikan dan pekerjaan, prestasi, serta simpan dokumen penting seperti KTP, ijazah, dan transkrip.',
    catatan: 'Gunakan akun SIAKAD Anda: NIM untuk mahasiswa dan alumni, NIDN untuk dosen, atau NIK pegawai untuk tendik.',
    latar: 'fitur',
    ilustrasi: 'profil',
    slogan: 'Data Anda, rapi di satu tempat.',
    sloganTeks: 'Untuk mahasiswa, alumni, dosen, dan tenaga kependidikan Universitas Pohuwato.',
    poin: [
      { ikon: 'pengguna', judul: 'Data pribadi', teks: 'Kontak, alamat, dan data keluarga langsung tersimpan ke SIAKAD dan PDDikti.' },
      { ikon: 'lencana', judul: 'Riwayat dan prestasi', teks: 'Pendidikan, pekerjaan, sertifikasi, dan organisasi lengkap dengan bukti.' },
      { ikon: 'dokumen', judul: 'Dokumen pribadi', teks: 'KTP, KK, NPWP, ijazah, transkrip, CV: tersimpan aman dan bisa diverifikasi petugas.' },
      { ikon: 'perisai', judul: 'Akun dan keamanan', teks: 'Ganti password dan aktifkan login dua langkah untuk SIAKAD dan semua aplikasi SSO.' },
    ],
  },
  sdm: {
    judul: 'Semua urusan kepegawaian di satu tempat',
    keterangan: 'Presensi, cuti, riwayat kepegawaian, kenaikan pangkat dan KGB ber-SK, BKD dan SKP, usulan kenaikan jabatan, serta data SISTER untuk dosen dan tenaga kependidikan.',
    catatan: 'Gunakan akun SIAKAD Anda: NIDN untuk dosen atau NIK pegawai untuk tendik.',
    latar: 'fitur',
    ilustrasi: 'sdm',
    slogan: 'Kepegawaian yang tertib dan terbuka.',
    sloganTeks: 'Untuk dosen dan tenaga kependidikan Universitas Pohuwato.',
    poin: [
      { ikon: 'kalender', judul: 'Presensi dan cuti', teks: 'Presensi kerja lewat QR di kiosk, pengajuan cuti dengan saldo dan persetujuan berjenjang.' },
      { ikon: 'buku', judul: 'BKD dan SKP', teks: 'Kegiatan mengajar terisi otomatis dari SIAKAD, dinilai asesor, lalu disahkan pimpinan.' },
      { ikon: 'lencana', judul: 'Aturan yang jelas', teks: 'Syarat cuti, kenaikan jabatan, dan presensi tampil sebelum Anda mengajukan, sesuai SK yang berlaku.' },
      { ikon: 'gedung', judul: 'Tersambung ke SISTER', teks: 'Riwayat jabatan, pangkat, pendidikan, dan sertifikasi diselaraskan dengan SISTER Kemdiktisaintek.' },
    ],
  },
  pustikom: {
    tata: 'kanan',
    latar: 'pola',
    judul: 'Masuk ke Pustikom',
    keterangan: 'Gunakan akun SIAKAD Anda melalui SSO UNIPO. Hak akses mengikuti level dan peran Anda.',
    catatan: 'Password tidak pernah melewati aplikasi ini; login ditangani SSO. Setiap perubahan tercatat di log API SIAKAD atas nama Anda.',
    ilustrasi: 'akses',
    slogan: 'Satu pintu untuk mengelola seluruh layanan kampus.',
    sloganTeks: 'Aplikasi, pengguna, hak akses, akademik, kepegawaian, portal, LPPM, LMS, PMB, SPMI, dan modul lainnya. Semuanya terhubung ke SIAKAD sebagai pusat data.',
  },
  'api-portal': {
    tata: 'tengah',
    latar: 'pola',
    judul: 'Masuk ke konsol pengembang',
    keterangan: 'Gunakan akun SIAKAD Anda (NIM, NIDN, atau NIK) lewat SSO UNIPO untuk mengajukan akses API dan mengelola aplikasi.',
    catatan: '[Dokumentasi API](/docs) bisa dibaca tanpa login. [Kembali ke beranda](/).',
    ilustrasi: 'portal-api',
    slogan: 'API UNIPO untuk pengembang kampus.',
    sloganTeks: 'Ajukan akses, kelola klien, dan pantau pemakaian API SIAKAD.',
  },
  fakultas: {
    tata: 'kanan',
    latar: 'gradien',
    judul: 'Masuk ke dasbor',
    keterangan: 'Gunakan akun SIAKAD Anda melalui SSO UNIPO.',
    catatan: 'Dekan, wakil dekan, kaprodi, sekprodi, dosen, dan tendik melihat menu sesuai perannya. [Kembali ke portal](/).',
    ilustrasi: 'fakultas',
    slogan: 'Dasbor kerja {nama}',
    sloganTeks: 'Pantau mahasiswa, perkuliahan, KRS, nilai, tugas akhir, wisuda, PMB, surat, dan mutu dalam satu tempat. Menu menyesuaikan jabatan dan peran Anda.',
  },
  humas: {
    judul: 'Masuk ruang redaksi',
    keterangan: 'Tulis dan terbitkan kabar kampus: berita universitas, fakultas, prodi, BEM, dan UKM.',
    catatan: 'Untuk tim humas, pengelola situs fakultas/prodi, dan pengurus BEM/UKM. Belum terdaftar sebagai penulis? Minta tim humas menambahkan akun Anda. [Kembali ke situs](/).',
    ilustrasi: 'humas',
    slogan: 'Tulis dan terbitkan kabar kampus.',
    sloganTeks: 'Editor blok dengan foto, galeri, video, dan tabel. Pengurus BEM/UKM menulis draf, tim humas menyunting dan menerbitkan.',
  },
  tracer: {
    judul: 'Masuk ke tracer study',
    keterangan: 'Alumni mengisi kuesioner dan memperbarui riwayat karier. Dosen, kaprodi, dan pengelola melihat dasbor sesuai perannya di SIAKAD.',
    catatan: 'Mendapat tautan undangan lewat email atau WhatsApp? Buka tautan itu langsung, tidak perlu masuk. [Kembali ke beranda](/).',
    ilustrasi: 'wisuda',
    slogan: 'Jejak alumni, bahan perbaikan kampus.',
    sloganTeks: 'Jawaban Anda hanya dilaporkan dalam bentuk angka gabungan. Data kontak tidak ditampilkan ke dosen.',
  },
  pmb: {
    judul: 'Masuk panitia PMB',
    keterangan: 'Gunakan akun SIAKAD/SSO kampus. Hanya pengguna dengan peran Panitia PMB yang bisa masuk.',
    catatan: 'Password tidak pernah dimasukkan di aplikasi ini. Anda diarahkan ke SSO lalu kembali otomatis. [Kembali ke beranda](/).',
    ilustrasi: 'pmb',
    slogan: 'Satu akun untuk seluruh proses pendaftaran.',
    sloganTeks: 'Daftar kapan saja, pantau status dan hasil seleksi, bayar online, dan ikuti ujian seleksi berbasis komputer.',
  },
};

// ---------------------------------------------------------------- Baca dan tulis pengaturan

const pilih = <T extends string>(v: unknown, daftar: ReadonlyArray<{ value: T }>): T | undefined => (typeof v === 'string' && daftar.some((d) => d.value === v) ? (v as T) : undefined);
const teks = (v: unknown, maks = 500): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, maks) : undefined);
const ya = (v: unknown): boolean | undefined => (v === true || v === 'ya' ? true : v === false || v === 'tidak' ? false : undefined);
const hex = (v: unknown): string | undefined => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toLowerCase() : undefined);
const daftarObjek = (v: unknown): Array<Record<string, unknown>> => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)) : []);

function bersih<T extends object>(o: { [K in keyof T]?: T[K] | undefined }): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * Ambil pengaturan halaman masuk dari `tata` tema (objek `masuk`, daftar `masuk_slide`, `masuk_poin`) tanpa bawaan:
 * hanya kolom yang benar-benar diatur. Nilai tidak dikenal dibuang.
 */
export function ambilTataMasuk(tata: Record<string, unknown> | null | undefined): Partial<TataMasuk> {
  const m = (tata?.masuk && typeof tata.masuk === 'object' && !Array.isArray(tata.masuk) ? tata.masuk : {}) as Record<string, unknown>;
  const slide = daftarObjek(tata?.masuk_slide)
    .map((s) => ({ gambar: teks(s.gambar) ?? '', judul: teks(s.judul, 160), teks: teks(s.teks, 300) }))
    .filter((s) => s.gambar)
    .slice(0, 8);
  const poin = daftarObjek(tata?.masuk_poin)
    .map((p) => ({ ikon: typeof p.ikon === 'string' && p.ikon in IKON_POIN_MASUK ? (p.ikon as IkonPoinMasuk) : undefined, judul: teks(p.judul, 120) ?? '', teks: teks(p.teks, 300) }))
    .filter((p) => p.judul)
    .slice(0, 8);
  const interval = typeof m.interval === 'number' && Number.isFinite(m.interval) ? Math.min(30, Math.max(3, Math.round(m.interval))) : undefined;
  return bersih<TataMasuk>({
    tata: pilih(m.tata, PILIHAN_TATA_MASUK),
    latar: pilih(m.latar, PILIHAN_LATAR_MASUK),
    ilustrasi: teks(m.ilustrasi, 40),
    ilustrasiGambar: teks(m.ilustrasi_gambar),
    gambar: teks(m.gambar),
    fokus: pilih(m.fokus, PILIHAN_FOKUS_MASUK),
    lapisan: pilih(m.lapisan, PILIHAN_LAPISAN_MASUK),
    slide: slide.length ? slide.map((s) => bersih(s) as SlideMasuk) : undefined,
    interval,
    transisi: pilih(m.transisi, PILIHAN_TRANSISI_MASUK),
    gerak: ya(m.gerak),
    warna: hex(m.warna),
    judul: teks(m.judul, 160),
    keterangan: teks(m.keterangan),
    catatan: teks(m.catatan),
    slogan: teks(m.slogan, 200),
    sloganTeks: teks(m.slogan_teks),
    bantuanLabel: teks(m.bantuan_label, 80),
    bantuanUrl: teks(m.bantuan_url),
    poin: poin.length ? poin.map((p) => bersih(p) as PoinMasuk) : undefined,
    pengumuman: ya(m.pengumuman),
    pilihMode: ya(m.pilih_mode),
    kontak: teks(m.kontak, 300),
  });
}

/** Pengaturan berlaku: tema (`tata`) menimpa bawaan aplikasi, yang menimpa bawaan unipo-ui. */
export function bacaTataMasuk(tata: Record<string, unknown> | null | undefined, aplikasi?: string, bawaan?: Partial<TataMasuk>): TataMasuk {
  return { ...BAWAAN_MASUK, ...(aplikasi ? BAWAAN_MASUK_APLIKASI[aplikasi] : undefined), ...bersih(bawaan ?? {}), ...ambilTataMasuk(tata) };
}

const sama = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Ubah pengaturan menjadi kolom `tata` tema (`masuk`, `masuk_slide`, `masuk_poin`). Kolom yang sama dengan `dasar`
 * (bawaan aplikasi) tidak disimpan, agar bawaan yang diperbarui kelak tetap berlaku. Nilai kosong = hapus kunci.
 */
export function tulisTataMasuk(t: TataMasuk, dasar: TataMasuk): { masuk?: Record<string, unknown>; masuk_slide?: SlideMasuk[]; masuk_poin?: PoinMasuk[] } {
  const m: Record<string, unknown> = {};
  const set = (k: keyof TataMasuk, kunci: string, nilai: unknown = t[k]) => {
    if (sama(t[k], dasar[k])) return;
    if (nilai === '' || nilai === undefined) {
      // String kosong dibuang server; simpan penanda agar "dikosongkan" berbeda dengan "ikut bawaan".
      if (typeof dasar[k] === 'string' && dasar[k]) m[kunci] = '-';
      return;
    }
    m[kunci] = nilai;
  };
  set('tata', 'tata');
  set('latar', 'latar');
  set('ilustrasi', 'ilustrasi');
  set('ilustrasiGambar', 'ilustrasi_gambar');
  set('gambar', 'gambar');
  set('fokus', 'fokus');
  set('lapisan', 'lapisan');
  set('interval', 'interval');
  set('transisi', 'transisi');
  set('gerak', 'gerak', t.gerak ? 'ya' : 'tidak');
  set('warna', 'warna');
  set('judul', 'judul');
  set('keterangan', 'keterangan');
  set('catatan', 'catatan');
  set('slogan', 'slogan');
  set('sloganTeks', 'slogan_teks');
  set('bantuanLabel', 'bantuan_label');
  set('bantuanUrl', 'bantuan_url');
  set('pengumuman', 'pengumuman', t.pengumuman ? 'ya' : 'tidak');
  set('pilihMode', 'pilih_mode', t.pilihMode ? 'ya' : 'tidak');
  set('kontak', 'kontak');
  const slide = t.slide.filter((s) => s.gambar).map((s) => bersih({ gambar: s.gambar, judul: s.judul || undefined, teks: s.teks || undefined }) as SlideMasuk);
  const poin = t.poin.filter((p) => p.judul).map((p) => bersih({ ikon: p.ikon, judul: p.judul, teks: p.teks || undefined }) as PoinMasuk);
  return {
    masuk: Object.keys(m).length ? m : undefined,
    masuk_slide: slide.length && !sama(slide, dasar.slide) ? slide : undefined,
    masuk_poin: poin.length && !sama(poin, dasar.poin) ? poin : undefined,
  };
}

/** Teks "-" berarti sengaja dikosongkan. */
const isi = (v: string | undefined) => (v && v !== '-' ? v : '');

/**
 * Alamat tampil gambar dari pengaturan tema: URL https://…, alamat relatif /…, atau `berkas:<uuid>` yang
 * diterjemahkan lewat peta `berkas` dari GET /v1/tema. Selain itu (mis. javascript:) dikosongkan.
 */
export function urlGambarTema(nilai: string | undefined, peta?: Record<string, string> | null): string {
  const v = isi(nilai).trim();
  if (!v) return '';
  if (v.startsWith('berkas:')) return peta?.[v.slice(7).toLowerCase()] ?? '';
  if (/^https?:\/\//i.test(v) || (v.startsWith('/') && !v.startsWith('//'))) return v;
  return '';
}

/** Pengaturan halaman masuk yang berlaku untuk aplikasi (dari GET /v1/tema/{aplikasi}, publik). */
export function useTataMasuk(aplikasi: string, lingkup?: string, bawaan?: Partial<TataMasuk>) {
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<DataTemaAplikasi>(
    ['tema', aplikasi, lingkup ?? ''],
    (s, signal) => s.request<DataTemaAplikasi>({ method: 'GET', path: `/v1/tema/${encodeURIComponent(aplikasi)}`, query: lingkup ? { lingkup } : undefined, public: true }, { signal }),
    { staleTime: 60_000, enabled: !!siakad },
  );
  const kunciBawaan = JSON.stringify(bawaan ?? {});
  const tata = React.useMemo(() => bacaTataMasuk(q.data?.tata as Record<string, unknown> | undefined, aplikasi, bawaan), [q.data, aplikasi, kunciBawaan]); // eslint-disable-line react-hooks/exhaustive-deps
  return { tata, berkas: q.data?.berkas ?? null, memuat: !!siakad && q.loading && !q.data };
}

// ---------------------------------------------------------------- Bantu tampilan

function useKurangiGerak() {
  const [kurangi, setKurangi] = React.useState(false);
  React.useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const ubah = () => setKurangi(mq.matches);
    ubah();
    mq.addEventListener?.('change', ubah);
    return () => mq.removeEventListener?.('change', ubah);
  }, []);
  return kurangi;
}

const ganti = (s: string, nama: string) => s.replace(/\{nama\}/g, nama);

/** Teks dengan tautan sederhana [teks](/alamat) atau [teks](https://…). Tautan lain ditampilkan sebagai teks. */
function TeksTautan({ children, nama }: { children: string; nama: string }) {
  const bagian: React.ReactNode[] = [];
  const re = /\[([^\]]{1,120})\]\(([^)\s]{1,300})\)/g;
  const s = ganti(children, nama);
  let akhir = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > akhir) bagian.push(s.slice(akhir, m.index));
    const url = m[2]!;
    const aman = (url.startsWith('/') && !url.startsWith('//')) || /^https?:\/\//i.test(url) || /^mailto:/i.test(url);
    bagian.push(
      aman ? (
        <a key={m.index} href={url} {...(/^https?:/i.test(url) ? { target: '_blank', rel: 'noreferrer' } : {})}>
          {m[1]}
        </a>
      ) : (
        m[1]
      ),
    );
    akhir = m.index + m[0].length;
  }
  if (akhir < s.length) bagian.push(s.slice(akhir));
  return <>{bagian}</>;
}

function TombolMode({ kunci }: { kunci: string }) {
  const [gelap, setGelap] = React.useState(false);
  React.useEffect(() => {
    setGelap(document.documentElement.classList.contains('dark'));
  }, []);
  return (
    <Button
      variant="ghost"
      size="sm"
      iconOnly
      aria-label={gelap ? 'Pakai mode terang' : 'Pakai mode gelap'}
      title={gelap ? 'Mode terang' : 'Mode gelap'}
      onClick={() => {
        const baru = gelap ? 'terang' : 'gelap';
        try {
          localStorage.setItem(kunci, baru);
        } catch {
          /* penyimpanan diblokir */
        }
        terapkanModeTampilan(baru);
        setGelap(!gelap);
      }}
    >
      {gelap ? <Sun /> : <Moon />}
    </Button>
  );
}

function Slider({ slide, interval, transisi, jalan, peta, nama, pratinjau }: { slide: SlideMasuk[]; interval: number; transisi: TransisiSlideMasuk; jalan: boolean; peta: Record<string, string> | null; nama: string; pratinjau?: boolean }) {
  const [aktif, setAktif] = React.useState(0);
  const [jeda, setJeda] = React.useState(false);
  const n = slide.length;
  React.useEffect(() => {
    if (aktif >= n) setAktif(0);
  }, [aktif, n]);
  React.useEffect(() => {
    if (!jalan || jeda || n < 2) return;
    const t = setInterval(() => setAktif((i) => (i + 1) % n), Math.max(3, interval) * 1000);
    return () => clearInterval(t);
  }, [jalan, jeda, n, interval]);
  const s = slide[aktif] ?? slide[0];
  return (
    <div className="u-masuk-slider" data-transisi={transisi} onMouseEnter={() => setJeda(true)} onMouseLeave={() => setJeda(false)} onFocus={() => setJeda(true)} onBlur={() => setJeda(false)}>
      {slide.map((x, i) => {
        const u = urlGambarTema(x.gambar, peta);
        return (
          <div key={i} className="u-masuk-slide" data-aktif={i === aktif || undefined} aria-hidden={i !== aktif}>
            {u ? <img src={u} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async" /> : <span className="u-masuk-slide-kosong" />}
          </div>
        );
      })}
      {s && (s.judul || s.teks) && (
        <div className="u-masuk-sambutan" key={aktif} aria-live={jeda ? 'polite' : 'off'}>
          {s.judul && <h2>{ganti(s.judul, nama)}</h2>}
          {s.teks && <p>{ganti(s.teks, nama)}</p>}
        </div>
      )}
      {n > 1 && (
        <div className="u-masuk-slider-kendali" role="group" aria-label="Kendali slide">
          {jalan && (
            <button type="button" className="u-masuk-slider-jeda" onClick={() => setJeda((j) => !j)} aria-label={jeda ? 'Putar slide' : 'Jeda slide'} tabIndex={pratinjau ? -1 : undefined}>
              {jeda ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
          )}
          {slide.map((_, i) => (
            <button key={i} type="button" className="u-masuk-slider-titik" aria-label={`Slide ${i + 1} dari ${n}`} aria-current={i === aktif || undefined} onClick={() => setAktif(i)} tabIndex={pratinjau ? -1 : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function Poin({ poin, nama }: { poin: PoinMasuk[]; nama: string }) {
  return (
    <ul className="u-masuk-poin">
      {poin.map((p, i) => {
        const I = IKON_POIN_MASUK[p.ikon ?? 'kilau']?.ikon ?? Sparkles;
        return (
          <li key={i}>
            <span className="u-masuk-poin-ikon" aria-hidden>
              <I />
            </span>
            <div>
              <strong>{ganti(p.judul, nama)}</strong>
              {p.teks && <span>{ganti(p.teks, nama)}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function GambarIlustrasi({ t, peta, lebar }: { t: TataMasuk; peta: Record<string, string> | null; lebar: number | string }) {
  const u = urlGambarTema(t.ilustrasiGambar, peta);
  if (u) return <img className="u-masuk-ilustrasi-gambar" src={u} alt="" decoding="async" style={{ width: lebar }} />;
  return <Ilustrasi nama={t.ilustrasi || 'selamat-datang'} lebar={lebar} bergerak={t.gerak} />;
}

// ---------------------------------------------------------------- HalamanMasuk

export interface HalamanMasukProps {
  /** Kode tema aplikasi (dashboard, baak, bauk, lms, ...): pengaturan dibaca dari GET /v1/tema/{aplikasi}. */
  aplikasi: string;
  /** Lingkup tema (mis. kode fakultas). */
  lingkup?: string;
  /** Nama aplikasi untuk `{nama}` di teks dan logo bawaan. */
  nama?: string;
  /** Logo aplikasi. Bawaan <LogoAplikasi kode={aplikasi} />. */
  logo?: React.ReactNode;
  /** Bawaan khusus aplikasi (mis. teks dengan nama fakultas). Pengaturan tema tetap menimpanya. */
  bawaan?: Partial<TataMasuk>;
  /** Pakai pengaturan ini, bukan dari server (untuk pratinjau di pengaturan tema). */
  tata?: TataMasuk;
  /** Peta `berkas:<uuid>` → URL untuk gambar unggahan (bersama `tata`). */
  berkas?: Record<string, string> | null;
  /** Alamat masuk SSO lewat BFF, mis. `/bff/masuk?kembali=/`. Tidak dipakai bila `children` diisi. */
  hrefMasuk?: string;
  labelMasuk?: React.ReactNode;
  /** Pesan galat (dari BFF atau ?galat=). */
  galat?: React.ReactNode;
  /** Galat berupa penolakan akses (nada peringatan). */
  ditolak?: boolean;
  /** Tampilkan "Anda sudah keluar". */
  keluar?: boolean;
  /**
   * Konfigurasi aplikasi belum lengkap (mis. isian SSO/API di .env BFF masih kosong): tampilkan halaman pemeliharaan.
   * Nama isian tidak pernah ditampilkan ke pengunjung; BFF mencatatnya di log server.
   */
  pemeliharaan?: boolean;
  /** Cara masuk lain yang sudah didukung aplikasi (mis. NIM + NIK), tampil di bawah tombol SSO. */
  opsiLain?: React.ReactNode;
  /** Ganti seluruh bagian tombol (mis. formulir akun pendaftar PMB). */
  children?: React.ReactNode;
  /** Isi di atas judul (mis. tautan kembali). */
  atas?: React.ReactNode;
  /** Judul dan keterangan khusus halaman ini (mis. "Daftar akun"), menimpa pengaturan tema. */
  judul?: React.ReactNode;
  keterangan?: React.ReactNode;
  /** Catatan di bawah tombol khusus halaman ini; null = sembunyikan. */
  catatan?: React.ReactNode;
  /** Kunci localStorage pilihan terang/gelap aplikasi (sama dengan kunciMode <TemaAplikasi>). Tanpa ini tombol mode disembunyikan. */
  kunciMode?: string;
  /** Mode pratinjau: tinggi mengikuti wadah, tautan dan tombol tidak aktif. */
  pratinjau?: boolean;
  className?: string;
}

/**
 * Halaman masuk baku aplikasi UNIPO, diatur penuh dari pengaturan tema (bagian Halaman masuk) tanpa deploy ulang:
 * posisi panel (kiri, kanan, terbelah, kartu tengah, minimal), sisi visual (ilustrasi, foto, slider, gradien
 * bergerak, pola, warna polos, daftar fitur), dan semua teks. Responsif lewat container query (ikut lebar wadahnya),
 * mode gelap, dan menghormati prefers-reduced-motion. Bila `pemeliharaan`, yang tampil HalamanPemeliharaan.
 *
 *   <HalamanMasuk aplikasi="dashboard" logo={<Logo />} hrefMasuk={masukUrl(kembali)} galat={galat} pemeliharaan={!lengkap} kunciMode="dashboard.tema" />
 */
export function HalamanMasuk({
  aplikasi,
  lingkup,
  nama: namaProp,
  logo,
  bawaan,
  tata: tataProp,
  berkas: berkasProp,
  hrefMasuk,
  labelMasuk = 'Masuk dengan SSO UNIPO',
  galat,
  ditolak,
  keluar,
  pemeliharaan,
  opsiLain,
  children,
  atas,
  judul: judulProp,
  keterangan: keteranganProp,
  catatan: catatanProp,
  kunciMode,
  pratinjau,
  className,
}: HalamanMasukProps) {
  const dariServer = useTataMasuk(aplikasi, lingkup, bawaan);
  const t = tataProp ?? dariServer.tata;
  const peta = tataProp ? (berkasProp ?? null) : dariServer.berkas;
  const kurangiGerak = useKurangiGerak();
  const nama = namaProp ?? aplikasi.toUpperCase();
  const logoNode = logo ?? <LogoAplikasi kode={aplikasi} name={namaProp} />;
  const akar = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // Pratinjau tidak bisa difokus atau diklik (atribut inert; React 18 belum mengenal prop-nya).
    akar.current?.toggleAttribute('inert', !!pratinjau);
  }, [pratinjau]);

  if (pemeliharaan) return <HalamanPemeliharaan logo={logoNode} kontak={isi(t.kontak) ? <TeksTautan nama={nama}>{t.kontak}</TeksTautan> : undefined} />;

  const latarDiPanel = t.tata === 'tengah' || t.tata === 'minimal';
  const gerak = t.gerak && !kurangiGerak;
  const slogan = isi(t.slogan);
  const sloganTeks = isi(t.sloganTeks);
  const gambar = urlGambarTema(t.gambar, peta);
  const slide = t.slide.filter((s) => urlGambarTema(s.gambar, peta));
  const latar: LatarMasuk = t.latar === 'gambar' && !gambar ? 'gradien' : t.latar === 'slider' && !slide.length ? (gambar ? 'gambar' : 'gradien') : t.latar === 'fitur' && !t.poin.length ? 'ilustrasi' : t.latar;
  const gaya = { ...(t.warna ? { '--u-masuk-warna': t.warna } : {}), '--u-masuk-fokus': { tengah: 'center', atas: 'center top', bawah: 'center bottom', kiri: 'left center', kanan: 'right center' }[t.fokus] } as React.CSSProperties;
  const sambutan =
    slogan || sloganTeks ? (
      <div className="u-masuk-sambutan">
        {slogan && <h2>{ganti(slogan, nama)}</h2>}
        {sloganTeks && <p>{ganti(sloganTeks, nama)}</p>}
      </div>
    ) : null;

  const visual = t.tata === 'minimal' ? null : (
    <div className="u-masuk-visual" data-latar={latar} data-lapisan={t.lapisan} aria-hidden={latar === 'slider' ? undefined : true}>
      {latar === 'ilustrasi' &&
        (latarDiPanel ? (
          <span className="u-masuk-bentuk" />
        ) : (
          <div className="u-masuk-ilustrasi">
            <GambarIlustrasi t={{ ...t, gerak }} peta={peta} lebar="min(26rem, 82%)" />
            {sambutan}
          </div>
        ))}
      {latar === 'gambar' && (
        <>
          <img className="u-masuk-foto" src={gambar} alt="" decoding="async" />
          {sambutan}
        </>
      )}
      {latar === 'slider' && <Slider slide={slide} interval={t.interval} transisi={t.transisi} jalan={gerak} peta={peta} nama={nama} pratinjau={pratinjau} />}
      {(latar === 'gradien' || latar === 'pola' || latar === 'polos') && (
        <>
          {latar === 'gradien' && (
            <span className="u-masuk-gumpal" aria-hidden>
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
          {latar === 'pola' && <span className="u-masuk-pola" aria-hidden />}
          {sambutan}
        </>
      )}
      {latar === 'fitur' && !latarDiPanel && (
        <div className="u-masuk-fitur">
          {sambutan}
          <Poin poin={t.poin} nama={nama} />
        </div>
      )}
    </div>
  );

  const catatan = isi(t.catatan);
  const bantuanUrl = urlGambarTema(t.bantuanUrl) || (/^mailto:/i.test(t.bantuanUrl) ? t.bantuanUrl : '');
  return (
    <div ref={akar} className={cn('u-masuk', className)} data-pratinjau={pratinjau || undefined}>
      <div className="u-masuk-bingkai" data-tata={t.tata} data-latar={latar} data-gerak={gerak ? 'ya' : 'tidak'} data-memuat={(!tataProp && dariServer.memuat) || undefined} style={gaya}>
        {visual}
        <main className="u-masuk-panel">
          <div className="u-masuk-kartu">
            <div className="u-masuk-kepala">
              <div className="u-masuk-logo">{logoNode}</div>
              {kunciMode && t.pilihMode && <TombolMode kunci={kunciMode} />}
            </div>
            {atas}
            {latarDiPanel && latar === 'ilustrasi' && (
              <div className="u-masuk-ilustrasi-kecil">
                <GambarIlustrasi t={{ ...t, gerak }} peta={peta} lebar="min(15rem, 70%)" />
              </div>
            )}
            <div className="u-masuk-teks">
              <h1>{judulProp ?? ganti(isi(t.judul) || 'Masuk', nama)}</h1>
              {keteranganProp !== undefined ? keteranganProp && <p>{keteranganProp}</p> : isi(t.keterangan) && <p>{ganti(t.keterangan, nama)}</p>}
            </div>
            {galat ? (
              <Alert variant={ditolak ? 'warning' : 'danger'} title={ditolak ? 'Akses ditolak' : 'Belum bisa masuk'}>
                {galat}
              </Alert>
            ) : null}
            {keluar && !galat ? <Alert variant="success">Anda sudah keluar. Sampai jumpa lagi.</Alert> : null}
            {t.pengumuman && !pratinjau && <PengumumanTampil aplikasi={aplikasi} bagian={['isi']} className="u-masuk-pengumuman" />}
            {children ?? (
              <div className="u-masuk-aksi">
                <Button size="lg" fullWidth render={<a href={hrefMasuk ?? '/bff/masuk'} />}>
                  <LogIn /> {labelMasuk}
                </Button>
                {opsiLain}
              </div>
            )}
            {latarDiPanel && latar === 'fitur' && <Poin poin={t.poin} nama={nama} />}
            {catatanProp !== undefined
              ? catatanProp && <div className="u-masuk-catatan">{catatanProp}</div>
              : catatan && (
                  <p className="u-masuk-catatan">
                    <TeksTautan nama={nama}>{catatan}</TeksTautan>
                  </p>
                )}
            {isi(t.bantuanLabel) && bantuanUrl && (
              <a className="u-masuk-bantuan" href={bantuanUrl} {...(/^https?:/i.test(bantuanUrl) ? { target: '_blank', rel: 'noreferrer' } : {})}>
                <LifeBuoy aria-hidden /> {ganti(t.bantuanLabel, nama)}
              </a>
            )}
          </div>
          <p className="u-masuk-kaki">© {new Date().getFullYear()} Universitas Pohuwato</p>
        </main>
      </div>
    </div>
  );
}
