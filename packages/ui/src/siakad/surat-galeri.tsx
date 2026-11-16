'use client';
/**
 * Galeri templat surat: templat bawaan UNIPO (siap pakai tanpa disimpan dulu di server), templat unit, dan templat
 * bersama dari /v1/arsip/template. Dipakai EditorSuratKeluar untuk membuat surat dari templat: pilih templat,
 * isi isian (tanggal, data mahasiswa/dosen dari SIAKAD, dll.), lalu surat dibangkitkan di kertas lengkap dengan kop,
 * nomor otomatis, dan tanda tangan + QR verifikasi.
 */
import * as React from 'react';
import { BookCopy, Building2, FilePlus2, FileText, GraduationCap, Library, Megaphone, Search, Stamp, UserRound } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Dialog } from '../components/overlays';
import { isiTemplat, penandaIsian, tanggalSurat } from '../editor/dokumen/templat';
import { saringHtml } from '../editor/dokumen/saring';
import { useTemplatSurat, type JenisNaskah, type TemplatSurat } from './surat';

// ---------------------------------------------------------------- isian bertipe

/** Jenis isian penanda: menentukan kontrol di panel dan cara nilai ditulis di surat. */
export type TipeIsianSurat = 'teks' | 'paragraf' | 'tanggal' | 'hari_tanggal' | 'waktu' | 'angka';

export interface IsianSurat {
  nama: string;
  label: string;
  tipe?: TipeIsianSurat;
  /** Contoh nilai: placeholder di panel dan isi pratinjau galeri. */
  contoh?: string;
  petunjuk?: string;
}

/** Data SIAKAD yang bisa mengisi beberapa penanda sekaligus (pilih mahasiswa → nama, NIM, prodi terisi). */
export type SumberIsianSurat = 'mahasiswa' | 'dosen';

type Baris = Record<string, unknown>;
const teks = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const rapi = (s: string) => (s && s === s.toUpperCase() ? s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s);

/** Penanda yang diisi dari baris data per sumber. */
export const ISIAN_DARI_DATA: Record<SumberIsianSurat, { label: string; penanda: Record<string, (r: Baris) => string> }> = {
  mahasiswa: {
    label: 'Ambil dari data mahasiswa',
    penanda: {
      nama_mahasiswa: (r) => teks(r.nama),
      nim: (r) => teks(r.nim),
      program_studi: (r) => rapi(teks(r.nama_prodi)),
      angkatan: (r) => teks(r.tahun_masuk),
    },
  },
  dosen: {
    label: 'Ambil dari data dosen',
    penanda: {
      nama_dosen: (r) => teks(r.nama_lengkap || r.nama),
      nidn: (r) => teks(r.nidn),
      jabatan_dosen: (r) => teks(r.jabatan_akademik || r.jabatan) || 'Dosen',
      prodi_dosen: (r) => rapi(teks(r.nama_prodi)),
    },
  },
};

/** Sumber data yang relevan untuk daftar penanda (mis. ada `nim` → mahasiswa). */
export function sumberIsianDari(penanda: string[]): SumberIsianSurat[] {
  return (Object.keys(ISIAN_DARI_DATA) as SumberIsianSurat[]).filter((s) => penanda.some((p) => p in ISIAN_DARI_DATA[s].penanda));
}

/** Tebak tipe isian dari nama penanda untuk templat tanpa metadata (templat unit di server). */
export function tipeIsianDariNama(nama: string): TipeIsianSurat {
  if (/hari_tanggal|hari_tgl/.test(nama)) return 'hari_tanggal';
  if (/(^|_)(tanggal|tgl)(_|$)/.test(nama)) return 'tanggal';
  if (/(^|_)(waktu|jam|pukul)(_|$)/.test(nama)) return 'waktu';
  if (/(^|_)(jumlah|banyaknya|nominal)(_|$)/.test(nama)) return 'angka';
  if (/(^|_)(uraian|rincian|alasan|isi|hasil|menimbang|keterangan|latar_belakang)(_|$)/.test(nama)) return 'paragraf';
  return 'teks';
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
/** "2026-11-17" → "Selasa, 17 November 2026". */
export function hariTanggalSurat(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : `${HARI[d.getDay()]}, ${tanggalSurat(iso)}`;
}

/** Nilai isian siap tulis di surat: tanggal ISO diubah ke format surat. */
export function nilaiIsianSurat(data: Record<string, string>, isian: IsianSurat[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!v) continue;
    const tipe = isian.find((i) => i.nama === k)?.tipe ?? tipeIsianDariNama(k);
    out[k] = /^\d{4}-\d{2}-\d{2}$/.test(v) && tipe === 'hari_tanggal' ? hariTanggalSurat(v) : /^\d{4}-\d{2}-\d{2}$/.test(v) && tipe === 'tanggal' ? tanggalSurat(v) : v;
  }
  return out;
}

/** Daftar isian lengkap untuk HTML templat: metadata templat bila ada, sisanya ditebak dari nama penanda. */
export function isianTemplat(html: string, meta: IsianSurat[] = []): IsianSurat[] {
  return penandaIsian(html).map((p) => meta.find((m) => m.nama === p.nama) ?? { nama: p.nama, label: p.label, tipe: tipeIsianDariNama(p.nama) });
}

/**
 * Ganti penanda yang sudah punya nilai dengan teks biasa di HTML pengolah (chip `span.ub-penanda` atau `{{nama}}`),
 * sehingga surat yang dibangkitkan bisa langsung disunting. Penanda tanpa nilai tetap menjadi chip.
 */
export function terapkanIsian(html: string, nilai: Record<string, string>): string {
  const ada = (n: string) => Object.prototype.hasOwnProperty.call(nilai, n) && nilai[n] !== '';
  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<span class="ub-penanda">\{\{\s*([a-z0-9_]+)\s*\}\}<\/span>/gi, (m, n: string) => (ada(n) ? esc(nilai[n]) : m))
      .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, n: string) => (ada(n) ? esc(nilai[n]) : m));
  }
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.body.querySelectorAll('.ub-penanda').forEach((el) => {
    const n = (el.textContent ?? '').replace(/[{}\s]/g, '');
    if (ada(n)) el.replaceWith(doc.createTextNode(nilai[n]));
  });
  const jalan = doc.createTreeWalker(doc.body, 4);
  for (let t = jalan.nextNode() as Text | null; t; t = jalan.nextNode() as Text | null) {
    if (t.data.includes('{{')) t.data = t.data.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, n: string) => (ada(n) ? nilai[n] : m));
  }
  return doc.body.innerHTML;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------- templat bawaan

export type KategoriTemplatSurat = 'umum' | 'akademik' | 'kepegawaian' | 'keputusan';

export const KATEGORI_TEMPLAT_SURAT: { value: KategoriTemplatSurat; label: string; ikon: React.ReactNode }[] = [
  { value: 'umum', label: 'Umum', ikon: <Megaphone aria-hidden /> },
  { value: 'akademik', label: 'Mahasiswa', ikon: <GraduationCap aria-hidden /> },
  { value: 'kepegawaian', label: 'Dosen & pegawai', ikon: <UserRound aria-hidden /> },
  { value: 'keputusan', label: 'Keputusan & edaran', ikon: <Stamp aria-hidden /> },
];

export interface TemplatSuratBawaan {
  kode: string;
  nama: string;
  kategori: KategoriTemplatSurat;
  /** Kode jenis naskah arsip (SK, ST, UND, SKET, ...): dipakai memilih jenis_id dan format nomor. */
  jenis_kode: string;
  perihal: string;
  deskripsi: string;
  isi: string;
  isian: IsianSurat[];
}

const baris = (label: string, nilai: string) => `<tr><td><p>${label}</p></td><td colspan="3"><p>: ${nilai}</p></td></tr>`;
const tabel = (...b: string[]) => `<table class="ub-tabel-polos"><tbody>${b.join('')}</tbody></table>`;
const par = (s: string, kelas = 'ub-rata-penuh') => `<p class="${kelas}">${s}</p>`;
const awal = (s: string) => par(s, 'ub-rata-penuh ub-inden-awal');
const PENUTUP = awal('Demikian surat ini dibuat untuk dipergunakan sebagaimana mestinya.');

const I = {
  hari_tanggal: { nama: 'hari_tanggal', label: 'Hari/tanggal', tipe: 'hari_tanggal', contoh: 'Selasa, 18 November 2026' },
  waktu: { nama: 'waktu', label: 'Waktu', tipe: 'waktu', contoh: '09.00 WITA s.d. selesai' },
  tempat: { nama: 'tempat', label: 'Tempat', contoh: 'Ruang Rapat Fakultas' },
  nama_mahasiswa: { nama: 'nama_mahasiswa', label: 'Nama mahasiswa', contoh: 'Siti Rahmawati Daud' },
  nim: { nama: 'nim', label: 'NIM', contoh: '2023101045' },
  program_studi: { nama: 'program_studi', label: 'Program studi', contoh: 'Informatika' },
  nama_dosen: { nama: 'nama_dosen', label: 'Nama dosen/pegawai', contoh: 'Dr. Rahmat Hasan, M.Kom.' },
  nidn: { nama: 'nidn', label: 'NIDN/NIP', contoh: '0912038801' },
  jabatan_dosen: { nama: 'jabatan_dosen', label: 'Jabatan', contoh: 'Lektor' },
  tahun_akademik: { nama: 'tahun_akademik', label: 'Tahun akademik', contoh: '2026/2027 Ganjil' },
} satisfies Record<string, IsianSurat>;

/** Templat surat siap pakai. Kepala (nomor, sifat, lampiran, hal, tujuan) dan tanda tangan diisi editor. */
export const TEMPLAT_SURAT_BAWAAN: TemplatSuratBawaan[] = [
  {
    kode: 'undangan-rapat',
    nama: 'Undangan rapat/kegiatan',
    kategori: 'umum',
    jenis_kode: 'UND',
    perihal: 'Undangan rapat',
    deskripsi: 'Mengundang pihak terkait menghadiri rapat atau kegiatan, lengkap dengan hari, waktu, tempat, dan agenda.',
    isian: [{ nama: 'acara', label: 'Nama acara', contoh: 'rapat koordinasi persiapan UTS' }, I.hari_tanggal, I.waktu, I.tempat, { nama: 'agenda', label: 'Agenda', contoh: 'Evaluasi perkuliahan dan jadwal ujian' }],
    isi:
      par('Dengan hormat,') +
      awal('Bersama ini kami mengundang Bapak/Ibu untuk menghadiri {{acara}} yang akan dilaksanakan pada:') +
      tabel(baris('Hari/tanggal', '{{hari_tanggal}}'), baris('Waktu', '{{waktu}}'), baris('Tempat', '{{tempat}}'), baris('Agenda', '{{agenda}}')) +
      awal('Mengingat pentingnya acara tersebut, kami mengharapkan kehadiran Bapak/Ibu tepat waktu. Atas perhatian dan kehadirannya kami ucapkan terima kasih.'),
  },
  {
    kode: 'pemberitahuan',
    nama: 'Surat pemberitahuan',
    kategori: 'umum',
    jenis_kode: 'SD',
    perihal: 'Pemberitahuan',
    deskripsi: 'Menyampaikan informasi resmi kepada pihak tertentu, mis. perubahan jadwal atau libur layanan.',
    isian: [{ nama: 'hal_diberitahukan', label: 'Hal yang diberitahukan', contoh: 'perubahan jadwal layanan administrasi' }, { nama: 'uraian', label: 'Uraian', tipe: 'paragraf', contoh: 'Layanan administrasi fakultas ditutup sementara pada tanggal 24–26 Desember 2026 dan dibuka kembali pada 29 Desember 2026.' }],
    isi: par('Dengan hormat,') + awal('Bersama ini kami sampaikan pemberitahuan mengenai {{hal_diberitahukan}}, sebagai berikut:') + awal('{{uraian}}') + awal('Atas perhatian Bapak/Ibu kami ucapkan terima kasih.'),
  },
  {
    kode: 'permohonan',
    nama: 'Surat permohonan',
    kategori: 'umum',
    jenis_kode: 'SPER',
    perihal: 'Permohonan',
    deskripsi: 'Mengajukan permohonan kepada pimpinan atau instansi lain, mis. peminjaman tempat, narasumber, atau bantuan.',
    isian: [{ nama: 'latar_belakang', label: 'Latar belakang', tipe: 'paragraf', contoh: 'rencana pelaksanaan seminar nasional teknologi informasi' }, { nama: 'permohonan', label: 'Yang dimohonkan', contoh: 'kesediaan Bapak/Ibu menjadi narasumber' }, I.hari_tanggal, I.tempat],
    isi:
      par('Dengan hormat,') +
      awal('Sehubungan dengan {{latar_belakang}}, dengan ini kami mengajukan permohonan {{permohonan}} yang direncanakan pada {{hari_tanggal}} bertempat di {{tempat}}.') +
      awal('Demikian permohonan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu kami ucapkan terima kasih.'),
  },
  {
    kode: 'pengantar',
    nama: 'Surat pengantar',
    kategori: 'umum',
    jenis_kode: 'SP',
    perihal: 'Pengantar',
    deskripsi: 'Mengantar naskah atau berkas yang dikirim, dengan tabel jumlah dan keterangan.',
    isian: [{ nama: 'naskah', label: 'Naskah yang dikirim', contoh: 'Laporan evaluasi diri program studi' }, { nama: 'banyaknya', label: 'Banyaknya', tipe: 'angka', contoh: '1 (satu) eksemplar' }, { nama: 'keterangan', label: 'Keterangan', contoh: 'Untuk diketahui dan ditindaklanjuti' }],
    isi:
      par('Dengan hormat,') +
      awal('Bersama ini kami kirimkan naskah sebagaimana tercantum di bawah ini:') +
      `<table class="ub-tabel-garis"><tbody><tr><th><p>No.</p></th><th colspan="4"><p>Naskah yang dikirim</p></th><th colspan="2"><p>Banyaknya</p></th><th colspan="3"><p>Keterangan</p></th></tr><tr><td><p>1.</p></td><td colspan="4"><p>{{naskah}}</p></td><td colspan="2"><p>{{banyaknya}}</p></td><td colspan="3"><p>{{keterangan}}</p></td></tr></tbody></table>` +
      awal('Atas perhatian Bapak/Ibu kami ucapkan terima kasih.'),
  },
  {
    kode: 'berita-acara',
    nama: 'Berita acara',
    kategori: 'umum',
    jenis_kode: 'BA',
    perihal: 'Berita acara',
    deskripsi: 'Mencatat pelaksanaan kegiatan beserta hasilnya, mis. ujian, serah terima, atau rapat.',
    isian: [I.hari_tanggal, I.tempat, { nama: 'kegiatan', label: 'Kegiatan', contoh: 'serah terima inventaris laboratorium' }, { nama: 'hasil', label: 'Hasil kegiatan', tipe: 'paragraf', contoh: 'Seluruh inventaris diserahterimakan dalam keadaan baik sesuai daftar terlampir.' }],
    isi:
      awal('Pada hari ini {{hari_tanggal}}, bertempat di {{tempat}}, telah dilaksanakan {{kegiatan}} dengan hasil sebagai berikut:') +
      awal('{{hasil}}') +
      awal('Demikian berita acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.'),
  },
  {
    kode: 'keterangan-aktif-kuliah',
    nama: 'Keterangan aktif kuliah',
    kategori: 'akademik',
    jenis_kode: 'SKET',
    perihal: 'Surat keterangan aktif kuliah',
    deskripsi: 'Menerangkan mahasiswa terdaftar dan aktif kuliah, mis. untuk tunjangan orang tua atau beasiswa.',
    isian: [I.nama_mahasiswa, I.nim, I.program_studi, { nama: 'semester', label: 'Semester', contoh: '5 (lima)' }, I.tahun_akademik, { nama: 'keperluan', label: 'Keperluan', contoh: 'pengurusan tunjangan anak orang tua' }],
    isi:
      par('Yang bertanda tangan di bawah ini menerangkan bahwa:') +
      tabel(baris('Nama', '<strong>{{nama_mahasiswa}}</strong>'), baris('NIM', '{{nim}}'), baris('Program studi', '{{program_studi}}'), baris('Semester', '{{semester}}')) +
      awal('adalah benar mahasiswa {{unit}} Universitas Pohuwato yang terdaftar dan aktif mengikuti perkuliahan pada tahun akademik {{tahun_akademik}}. Surat keterangan ini diberikan untuk keperluan {{keperluan}}.') +
      PENUTUP,
  },
  {
    kode: 'rekomendasi-mahasiswa',
    nama: 'Rekomendasi mahasiswa',
    kategori: 'akademik',
    jenis_kode: 'REK',
    perihal: 'Surat rekomendasi',
    deskripsi: 'Merekomendasikan mahasiswa untuk beasiswa, lomba, magang, atau program pertukaran.',
    isian: [I.nama_mahasiswa, I.nim, I.program_studi, { nama: 'program', label: 'Program yang dituju', contoh: 'Program Beasiswa Indonesia Maju' }, { nama: 'alasan', label: 'Alasan rekomendasi', tipe: 'paragraf', contoh: 'Yang bersangkutan memiliki prestasi akademik yang baik, aktif berorganisasi, dan berperilaku baik selama menempuh pendidikan.' }],
    isi:
      par('Yang bertanda tangan di bawah ini memberikan rekomendasi kepada:') +
      tabel(baris('Nama', '<strong>{{nama_mahasiswa}}</strong>'), baris('NIM', '{{nim}}'), baris('Program studi', '{{program_studi}}')) +
      awal('untuk mengikuti {{program}}. {{alasan}}') +
      awal('Demikian surat rekomendasi ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.'),
  },
  {
    kode: 'izin-penelitian',
    nama: 'Permohonan izin penelitian',
    kategori: 'akademik',
    jenis_kode: 'SPER',
    perihal: 'Permohonan izin penelitian',
    deskripsi: 'Pengantar mahasiswa yang akan melakukan penelitian/pengambilan data untuk tugas akhir di instansi lain.',
    isian: [I.nama_mahasiswa, I.nim, I.program_studi, { nama: 'judul_penelitian', label: 'Judul penelitian', contoh: 'Sistem Informasi Layanan Desa Berbasis Web di Kabupaten Pohuwato' }, { nama: 'lokasi_penelitian', label: 'Lokasi penelitian', contoh: 'Kantor Desa Marisa Utara' }, { nama: 'waktu_penelitian', label: 'Waktu penelitian', contoh: 'November s.d. Desember 2026' }],
    isi:
      par('Dengan hormat,') +
      awal('Dalam rangka penyusunan tugas akhir, dengan ini kami mohon kesediaan Bapak/Ibu memberikan izin penelitian kepada mahasiswa kami:') +
      tabel(baris('Nama', '<strong>{{nama_mahasiswa}}</strong>'), baris('NIM', '{{nim}}'), baris('Program studi', '{{program_studi}}'), baris('Judul', '{{judul_penelitian}}'), baris('Lokasi', '{{lokasi_penelitian}}'), baris('Waktu', '{{waktu_penelitian}}')) +
      awal('Data yang diperoleh hanya digunakan untuk kepentingan akademik. Atas perhatian dan kerja sama Bapak/Ibu kami ucapkan terima kasih.'),
  },
  {
    kode: 'surat-tugas',
    nama: 'Surat tugas',
    kategori: 'kepegawaian',
    jenis_kode: 'ST',
    perihal: 'Surat tugas',
    deskripsi: 'Menugaskan dosen atau pegawai untuk kegiatan tertentu (narasumber, rapat, pendampingan, perjalanan dinas).',
    isian: [I.nama_dosen, I.nidn, I.jabatan_dosen, { nama: 'tugas', label: 'Tugas', contoh: 'menjadi narasumber pada Workshop Kurikulum OBE' }, I.hari_tanggal, I.tempat],
    isi:
      par('Yang bertanda tangan di bawah ini, pimpinan {{unit}} Universitas Pohuwato, dengan ini menugaskan kepada:') +
      tabel(baris('Nama', '<strong>{{nama_dosen}}</strong>'), baris('NIDN/NIP', '{{nidn}}'), baris('Jabatan', '{{jabatan_dosen}}')) +
      awal('untuk {{tugas}} yang dilaksanakan pada {{hari_tanggal}} bertempat di {{tempat}}.') +
      awal('Setelah melaksanakan tugas, yang bersangkutan agar menyampaikan laporan tertulis kepada pimpinan. Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.'),
  },
  {
    kode: 'keterangan-pegawai',
    nama: 'Keterangan dosen/pegawai',
    kategori: 'kepegawaian',
    jenis_kode: 'SKET',
    perihal: 'Surat keterangan',
    deskripsi: 'Menerangkan status dosen atau pegawai, mis. masih aktif bekerja, untuk keperluan administrasi.',
    isian: [I.nama_dosen, I.nidn, I.jabatan_dosen, { nama: 'keterangan', label: 'Yang diterangkan', tipe: 'paragraf', contoh: 'masih aktif sebagai dosen tetap dan melaksanakan tri dharma perguruan tinggi' }, { nama: 'keperluan', label: 'Keperluan', contoh: 'pengajuan kredit perumahan' }],
    isi:
      par('Yang bertanda tangan di bawah ini menerangkan bahwa:') +
      tabel(baris('Nama', '<strong>{{nama_dosen}}</strong>'), baris('NIDN/NIP', '{{nidn}}'), baris('Jabatan', '{{jabatan_dosen}}'), baris('Unit kerja', '{{unit}}')) +
      awal('adalah benar {{keterangan}} di Universitas Pohuwato. Surat keterangan ini diberikan untuk keperluan {{keperluan}}.') +
      PENUTUP,
  },
  {
    kode: 'surat-keputusan',
    nama: 'Surat keputusan (SK)',
    kategori: 'keputusan',
    jenis_kode: 'SK',
    perihal: 'Keputusan',
    deskripsi: 'Kerangka SK lengkap: judul, menimbang, mengingat, dan diktum memutuskan.',
    isian: [
      { nama: 'pejabat', label: 'Pejabat penetap', contoh: 'DEKAN FAKULTAS ILMU KOMPUTER', petunjuk: 'Huruf kapital, mis. DEKAN FAKULTAS ILMU KOMPUTER' },
      { nama: 'tentang', label: 'Tentang', contoh: 'PANITIA UJIAN AKHIR SEMESTER GANJIL 2026/2027' },
      { nama: 'menimbang', label: 'Menimbang', tipe: 'paragraf', contoh: 'bahwa untuk kelancaran pelaksanaan ujian akhir semester perlu dibentuk panitia yang ditetapkan dengan keputusan' },
      { nama: 'diktum_kesatu', label: 'Diktum KESATU', tipe: 'paragraf', contoh: 'Membentuk panitia ujian akhir semester dengan susunan sebagaimana tercantum dalam lampiran keputusan ini.' },
      { nama: 'diktum_kedua', label: 'Diktum KEDUA', tipe: 'paragraf', contoh: 'Panitia bertugas menyiapkan, melaksanakan, dan melaporkan pelaksanaan ujian.' },
    ],
    isi:
      par('<strong>KEPUTUSAN {{pejabat}} UNIVERSITAS POHUWATO</strong>', 'ub-rata-tengah') +
      par('<strong>TENTANG</strong>', 'ub-rata-tengah') +
      par('<strong>{{tentang}}</strong>', 'ub-rata-tengah') +
      par('<strong>{{pejabat}} UNIVERSITAS POHUWATO,</strong>', 'ub-rata-tengah') +
      tabel(baris('Menimbang', '{{menimbang}};'), baris('Mengingat', '1. Undang-Undang Nomor 12 Tahun 2012 tentang Pendidikan Tinggi; 2. Statuta Universitas Pohuwato;')) +
      par('<strong>MEMUTUSKAN:</strong>', 'ub-rata-tengah') +
      tabel(
        baris('Menetapkan', 'KEPUTUSAN {{pejabat}} UNIVERSITAS POHUWATO TENTANG {{tentang}}.'),
        baris('KESATU', '{{diktum_kesatu}}'),
        baris('KEDUA', '{{diktum_kedua}}'),
        baris('KETIGA', 'Keputusan ini berlaku sejak tanggal ditetapkan, dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.'),
      ),
  },
  {
    kode: 'surat-edaran',
    nama: 'Surat edaran',
    kategori: 'keputusan',
    jenis_kode: 'SE',
    perihal: 'Edaran',
    deskripsi: 'Menyampaikan ketentuan atau imbauan kepada seluruh sivitas di lingkungan unit.',
    isian: [{ nama: 'latar_belakang', label: 'Dalam rangka', tipe: 'paragraf', contoh: 'tertib administrasi perkuliahan semester ganjil' }, { nama: 'sasaran', label: 'Ditujukan kepada', contoh: 'seluruh dosen dan mahasiswa' }, { nama: 'butir_1', label: 'Ketentuan 1', tipe: 'paragraf', contoh: 'Perkuliahan dimulai tepat waktu sesuai jadwal.' }, { nama: 'butir_2', label: 'Ketentuan 2', tipe: 'paragraf', contoh: 'Presensi dilakukan melalui QR di aplikasi.' }],
    isi:
      awal('Dalam rangka {{latar_belakang}}, dengan ini disampaikan kepada {{sasaran}} di lingkungan {{unit}} hal-hal sebagai berikut:') +
      '<ol><li><p>{{butir_1}}</p></li><li><p>{{butir_2}}</p></li></ol>' +
      awal('Demikian surat edaran ini disampaikan untuk dilaksanakan dengan penuh tanggung jawab.'),
  },
];

/** Contoh nilai seluruh isian (untuk pratinjau galeri). */
export function contohIsian(t: { isian?: IsianSurat[] }): Record<string, string> {
  return Object.fromEntries((t.isian ?? []).filter((i) => i.contoh).map((i) => [i.nama, i.contoh as string]));
}

// ---------------------------------------------------------------- pilih templat

/** Templat yang dipilih untuk surat: dari server (unit/bersama) atau bawaan. */
export interface TemplatTerpilih {
  sumber: 'unit' | 'bersama' | 'bawaan';
  /** id /v1/arsip/template (server). */
  id?: number;
  /** kode TEMPLAT_SURAT_BAWAAN. */
  kode?: string;
  nama: string;
  perihal?: string | null;
  isi: string;
  jenis_id?: number | null;
  jenis_kode?: string;
  isian: IsianSurat[];
}

/** Ubah templat server / bawaan ke bentuk TemplatTerpilih. */
export function templatTerpilih(t: TemplatSurat | TemplatSuratBawaan): TemplatTerpilih {
  if ('kode' in t && 'kategori' in t) return { sumber: 'bawaan', kode: t.kode, nama: t.nama, perihal: t.perihal, isi: t.isi, jenis_kode: t.jenis_kode, isian: isianTemplat(t.isi, t.isian) };
  const s = t as TemplatSurat;
  return { sumber: s.unit_id ? 'unit' : 'bersama', id: s.id, nama: s.nama, perihal: s.perihal, isi: s.isi, jenis_id: s.jenis_id ?? null, isian: isianTemplat(s.isi) };
}

/** Cari jenis naskah dari kode (SKET juga cocok dengan KET, dst.). */
export function jenisDariKode(jenis: JenisNaskah[] | undefined, kode?: string): number | null {
  if (!kode || !jenis?.length) return null;
  const k = kode.toUpperCase();
  return (jenis.find((j) => j.kode.toUpperCase() === k) ?? jenis.find((j) => k.endsWith(j.kode.toUpperCase()) || j.kode.toUpperCase().endsWith(k)))?.id ?? null;
}

export interface PilihTemplatSuratProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Unit pengirim: templat milik unit ini + templat bersama. */
  unitId?: number | null;
  /** Dipanggil dengan templat yang dipilih, atau null untuk mulai dari kertas kosong. */
  onPilih: (t: TemplatTerpilih | null) => void;
  /** Sembunyikan tombol "Mulai dari kertas kosong". */
  tanpaKosong?: boolean;
  judul?: React.ReactNode;
}

interface Item {
  kunci: string;
  grup: 'unit' | 'bersama' | 'bawaan';
  kategori?: KategoriTemplatSurat;
  nama: string;
  deskripsi?: string | null;
  t: TemplatTerpilih;
  contoh: Record<string, string>;
}

const GRUP: Record<Item['grup'], { label: string; ikon: React.ReactNode }> = {
  unit: { label: 'Templat unit', ikon: <Building2 aria-hidden /> },
  bersama: { label: 'Templat bersama', ikon: <Library aria-hidden /> },
  bawaan: { label: 'Galeri UNIPO', ikon: <BookCopy aria-hidden /> },
};

/**
 * Galeri templat surat: cari, saring kategori, pratinjau isi dengan contoh data, lalu pakai. Templat unit dan bersama
 * diambil dari /v1/arsip/template; templat bawaan UNIPO selalu tersedia walau unit belum membuat templat sendiri.
 */
export function PilihTemplatSurat({ open, onOpenChange, unitId, onPilih, tanpaKosong, judul = 'Buat surat dari templat' }: PilihTemplatSuratProps) {
  const server = useTemplatSurat({ unit_id: unitId ?? null, aktif: true });
  const [q, setQ] = React.useState('');
  const [kat, setKat] = React.useState<KategoriTemplatSurat | 'semua' | 'unit'>('semua');
  const [pilih, setPilih] = React.useState<string | null>(null);

  const semua = React.useMemo<Item[]>(() => {
    const dariServer: Item[] = (server.data ?? []).map((s) => {
      const t = templatTerpilih(s);
      return { kunci: `s:${s.id}`, grup: t.sumber as Item['grup'], nama: s.nama, deskripsi: s.keterangan || s.perihal, t, contoh: {} };
    });
    const bawaan: Item[] = TEMPLAT_SURAT_BAWAAN.map((b) => ({ kunci: `b:${b.kode}`, grup: 'bawaan', kategori: b.kategori, nama: b.nama, deskripsi: b.deskripsi, t: templatTerpilih(b), contoh: contohIsian(b) }));
    return [...dariServer, ...bawaan];
  }, [server.data]);

  const cocok = (i: Item) => {
    const kata = q.trim().toLowerCase();
    if (kata && !`${i.nama} ${i.deskripsi ?? ''} ${i.t.perihal ?? ''}`.toLowerCase().includes(kata)) return false;
    if (kat === 'unit') return i.grup !== 'bawaan';
    return kat === 'semua' || i.kategori === kat;
  };
  const tampil = semua.filter(cocok);
  const aktif = tampil.find((i) => i.kunci === pilih) ?? tampil[0] ?? null;
  const adaServer = (server.data ?? []).length > 0;

  React.useEffect(() => {
    if (open) {
      setQ('');
      setPilih(null);
    }
  }, [open]);

  const pratinjau = React.useMemo(() => (aktif ? saringHtml(isiTemplat(aktif.t.isi, nilaiIsianSurat(aktif.contoh, aktif.t.isian), { unit: { nama: 'Fakultas Ilmu Komputer', singkatan: 'FIKOM' }, tandaiKosong: true })) : ''), [aktif]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={judul}
      description="Pilih templat, lalu isi datanya di panel kanan editor. Kop, nomor surat, dan tanda tangan + QR verifikasi ditambahkan otomatis."
      className="u-tgs-dialog"
      footer={
        <>
          {!tanpaKosong && (
            <Button variant="ghost" onClick={() => onPilih(null)}>
              <FilePlus2 />
              Mulai dari kertas kosong
            </Button>
          )}
          <Button disabled={!aktif} onClick={() => aktif && onPilih(aktif.t)}>
            <FileText />
            Pakai templat ini
          </Button>
        </>
      }
    >
      <div className="u-tgs">
        <div className="u-tgs-daftar">
          <div className="u-surat-cari">
            <Search aria-hidden />
            <input type="search" value={q} placeholder="Cari templat, mis. undangan, tugas, keterangan" aria-label="Cari templat" onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="u-tgs-kategori" role="tablist" aria-label="Kategori templat">
            {[{ value: 'semua' as const, label: 'Semua', ikon: null }, ...(adaServer ? [{ value: 'unit' as const, label: 'Milik unit', ikon: <Building2 aria-hidden /> }] : []), ...KATEGORI_TEMPLAT_SURAT].map((k) => (
              <button key={k.value} type="button" role="tab" aria-selected={kat === k.value} data-aktif={kat === k.value || undefined} onClick={() => setKat(k.value)}>
                {k.ikon}
                {k.label}
              </button>
            ))}
          </div>
          {server.loading && !server.data && <Skeleton height={56} />}
          {tampil.length === 0 ? (
            <Empty icon={<FileText />} title="Tidak ada templat yang cocok" description="Coba kata lain atau pilih kategori Semua." />
          ) : (
            (['unit', 'bersama', 'bawaan'] as const).map((g) => {
              const isi = tampil.filter((i) => i.grup === g);
              if (!isi.length) return null;
              return (
                <section key={g} className="u-tgs-grup">
                  <h3>
                    {GRUP[g].ikon}
                    {GRUP[g].label}
                  </h3>
                  <ul>
                    {isi.map((i) => (
                      <li key={i.kunci}>
                        <button type="button" data-aktif={aktif?.kunci === i.kunci || undefined} onClick={() => setPilih(i.kunci)} onDoubleClick={() => onPilih(i.t)}>
                          <span className="u-tgs-nama">{i.nama}</span>
                          {i.deskripsi && <span className="u-tgs-desk">{i.deskripsi}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}
        </div>
        <div className="u-tgs-pratinjau" aria-live="polite">
          {aktif ? (
            <>
              <div className="u-tgs-pratinjau-kepala">
                <div>
                  <p className="u-tgs-pratinjau-judul">{aktif.nama}</p>
                  <p className="u-psr-redup">
                    {aktif.t.isian.length ? `${aktif.t.isian.length} isian: ${aktif.t.isian.map((x) => x.label.toLowerCase()).join(', ')}` : 'Tanpa isian tambahan'}
                  </p>
                </div>
                <Badge variant={aktif.grup === 'bawaan' ? 'info' : 'neutral'}>{GRUP[aktif.grup].label}</Badge>
              </div>
              <div className="u-tgs-kertas">
                <div className="u-tgs-kop" aria-hidden>
                  <span />
                  <span />
                </div>
                <div className="ub-dokumen" dangerouslySetInnerHTML={{ __html: pratinjau }} />
                <div className="u-tgs-ttd" aria-hidden>
                  <span>Penandatangan,</span>
                  <span className="u-tgs-qr">QR</span>
                  <span>Nama penandatangan</span>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}
