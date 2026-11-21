import { blokBaru, idBlok, normalisasiDokumen, type BlokLanding, type DokumenLanding, type GayaBlok, type IsiBlok, type TipeBlok } from './landing-skema';

/**
 * Kit pembangun halaman landing: templat halaman utuh per aplikasi (isi bawaan setara landing yang ada sebelum
 * pembangun halaman) dan potongan bagian siap pakai. Templat disalin ke draf (tidak tertaut), jadi mengubah kit di
 * unipo-ui tidak mengubah halaman yang sudah disunting.
 */

const b = (tipe: TipeBlok, isi: IsiBlok, gaya: GayaBlok = {}): BlokLanding => ({ id: idBlok(), tipe, isi, gaya });

export interface TemplatLanding {
  kunci: string;
  nama: string;
  keterangan: string;
  /** Aplikasi yang memakai templat ini sebagai isi bawaan. */
  aplikasi?: string[];
  buat: () => DokumenLanding;
}

const KAKI_UMUM = (teks = 'Dikelola Pustikom Universitas Pohuwato.') =>
  b('kaki', { teks, tampilan: 'ringkas', logo: true, tautan: [{ label: 'Universitas Pohuwato', url: 'https://unipo.ac.id' }, { label: 'SIAKAD', url: 'https://siakad.unipo.ac.id' }] }, { jarak: 'tanpa', lebar: 'penuh' });

/** E-Learning: setara landing e-learning.unipo.ac.id sebelum pembangun halaman. */
function templatLms(): DokumenLanding {
  return {
    versi: 1,
    halaman: { judul: 'E-Learning UNIPO', deskripsi: 'Materi, tugas, kuis, forum, presensi, kelas daring, dan nilai mata kuliah Universitas Pohuwato, terhubung langsung dengan SIAKAD.' },
    blok: [
      b(
        'hero',
        {
          lencana: 'Semester ganjil 2026/2027 sudah berjalan',
          judul: 'Belajar lebih teratur, di kelas maupun dari rumah.',
          deskripsi: 'Semua mata kuliah di KRS Anda otomatis hadir di sini: materi, tugas, kuis, forum, presensi, kelas daring, dan nilai, terhubung langsung dengan SIAKAD.',
          tombol: [
            { label: 'Masuk dengan SSO UNIPO', url: 'aksi:masuk', gaya: 'utama' },
            { label: 'Lihat kelas terbuka', url: '#kelas-terbuka', gaya: 'garis' },
          ],
          tata: 'belah',
          media: 'ilustrasi',
          ilustrasi: 'lms',
          angka: [
            { nilai: 'KRS', label: 'Kelas otomatis dari KRS' },
            { nilai: 'SSO', label: 'Satu akun SIAKAD' },
            { nilai: '24/7', label: 'Akses materi' },
          ],
        },
        { jarak: 'lega' },
      ),
      b(
        'fitur',
        {
          eyebrow: 'Fitur',
          judul: 'Satu tempat untuk seluruh kegiatan belajar',
          deskripsi: 'Dibangun di atas data SIAKAD, jadi kelas, jadwal, dan nilai selalu sama dengan data resmi kampus.',
          kolom: 3,
          tampilan: 'kartu',
          butir: [
            { ikon: 'buku', judul: 'Materi tiap pertemuan', teks: 'Slide, modul PDF, video, dan tautan bacaan dari dosen pengampu, tersusun per pertemuan.' },
            { ikon: 'tugas', judul: 'Tugas dengan rubrik', teks: 'Unggah jawaban, simpan draf, kumpulkan sebelum tenggat, lalu lihat nilai dan umpan balik.' },
            { ikon: 'toga', judul: 'Kuis daring', teks: 'Jawaban tersimpan otomatis, tandai ragu-ragu, peta soal, dan hasil lengkap dengan pembahasan.' },
            { ikon: 'video', judul: 'Kelas daring', teks: 'Masuk ke Zoom atau Google Meet langsung dari jadwal kelas, 15 menit sebelum mulai.' },
            { ikon: 'diskusi', judul: 'Forum diskusi', teks: 'Tanya jawab dengan dosen dan teman sekelas, balasan bertingkat, dan pengumuman kelas.' },
            { ikon: 'hadir', judul: 'Presensi dan nilai', teks: 'Isi presensi dengan kode dari dosen, pantau kehadiran, perkiraan nilai, dan KHS SIAKAD.' },
            { ikon: 'kalender', judul: 'Kalender terpadu', teks: 'Tenggat tugas, kuis, pertemuan, dan kelas daring bersama kalender akademik kampus.' },
            { ikon: 'lonceng', judul: 'Notifikasi', teks: 'Kabar tugas dinilai, kuis dibuka, dan balasan forum tanpa perlu memeriksa satu per satu.' },
            { ikon: 'perangkat', judul: 'Nyaman di ponsel', teks: 'Tampilan menyesuaikan layar, dengan menu bawah di ponsel dan mode gelap.' },
          ],
        },
        { rata: 'tengah', jangkar: 'fitur', menu: 'Fitur' },
      ),
      b(
        'slot',
        { kunci: 'kelas-terbuka', eyebrow: 'Kelas terbuka', judul: 'Ikuti kelas di luar KRS', deskripsi: 'Kelas pengayaan yang terbuka untuk semua mahasiswa UNIPO. Tekan Ikuti kelas, lalu masuk dengan akun SSO.' },
        { rata: 'tengah', latar: 'lembut', jangkar: 'kelas-terbuka', menu: 'Kelas terbuka' },
      ),
      b(
        'langkah',
        {
          eyebrow: 'Cara mulai',
          judul: 'Tiga langkah, langsung belajar',
          tampilan: 'alur',
          butir: [
            { judul: 'Masuk dengan SSO UNIPO', teks: 'Gunakan NIM dan password SIAKAD.' },
            { judul: 'Kelas muncul dari KRS', teks: 'Mata kuliah yang disetujui otomatis jadi kelas.' },
            { judul: 'Mulai belajar', teks: 'Buka materi, kumpulkan tugas, dan ikuti kuis.' },
          ],
        },
        { rata: 'tengah', jangkar: 'mulai', menu: 'Cara mulai' },
      ),
      b(
        'faq',
        {
          eyebrow: 'FAQ',
          judul: 'Pertanyaan yang sering diajukan',
          tampilan: 'kartu',
          butir: [
            { tanya: 'Siapa yang bisa memakai E-Learning UNIPO?', jawab: 'Semua mahasiswa aktif Universitas Pohuwato. Masuk dengan akun SSO UNIPO, yaitu NIM dan password SIAKAD Anda.' },
            { tanya: 'Apakah saya perlu mendaftar kelas satu per satu?', jawab: 'Tidak. Mata kuliah di KRS yang sudah disetujui otomatis muncul sebagai kelas. Kelas tambahan (mis. pengayaan) bisa diikuti dengan kode dari dosen.' },
            { tanya: 'Bagaimana kalau koneksi terputus saat mengerjakan kuis?', jawab: 'Jawaban disimpan otomatis setiap kali Anda memilih atau mengetik, dan dikirim ulang saat koneksi kembali. Waktu kuis tetap berjalan, jadi segera buka lagi halaman kuisnya.' },
            { tanya: 'Apakah nilai di E-Learning sama dengan nilai di KHS?', jawab: 'Nilai di E-Learning adalah perkiraan dari tugas dan kuis. Nilai huruf resmi muncul di KHS SIAKAD setelah dosen mengirim nilai akhir.' },
            { tanya: 'Saya dosen, bagaimana mengelola kelas?', jawab: 'Dosen mengelola kelas, materi, tugas, kuis, dan penilaian lewat dasbor fakultas. E-Learning ini khusus untuk mahasiswa.' },
            { tanya: 'Lupa password?', jawab: 'Pakai tautan "Lupa password" di halaman SSO UNIPO. Password baru berlaku untuk SIAKAD dan semua aplikasi kampus.' },
          ],
        },
        { rata: 'tengah', lebar: 'sempit', jangkar: 'faq', menu: 'FAQ' },
      ),
      b('ajakan', { judul: 'Siap mulai belajar?', deskripsi: 'Masuk dengan akun SSO UNIPO untuk membuka semua kelas Anda.', tombol: [{ label: 'Masuk', url: 'aksi:masuk', gaya: 'aksen' }], nada: 'utama' }),
      KAKI_UMUM(),
    ],
  };
}

/** Alumni (tracer study): setara beranda alumni.unipo.ac.id sebelum pembangun halaman. Navbar dan kaki dari tata letak aplikasi. */
function templatTracer(): DokumenLanding {
  return {
    versi: 1,
    halaman: { judul: 'Tracer Study & Karier Alumni UNIPO', deskripsi: 'Tracer study, profil karier, lowongan, dan hasil keterserapan lulusan Universitas Pohuwato.' },
    blok: [
      b(
        'hero',
        {
          judul: 'Jejak karier lulusan Universitas Pohuwato',
          deskripsi: 'Tracer study menelusuri apa yang dilakukan alumni setelah lulus: bekerja, berwirausaha, atau melanjutkan studi. Jawaban Anda menjadi dasar perbaikan kurikulum, akreditasi program studi, dan laporan IKU kampus.',
          tombol: [
            { label: 'Isi kuesioner alumni', url: '/masuk', gaya: 'utama' },
            { label: 'Lihat hasil tracer', url: '/hasil', gaya: 'garis' },
          ],
          catatan: 'Alumni masuk dengan akun SIAKAD, atau cukup NIM, tanggal lahir, dan NIK.',
          tata: 'belah',
          media: 'slot',
          slot: 'ringkasan',
        },
        { jarak: 'lega' },
      ),
      b('slot', { kunci: 'sorotan' }, { jarak: 'tanpa', jangkar: 'hasil', menu: 'Hasil' }),
      b(
        'fitur',
        {
          eyebrow: 'Untuk siapa',
          judul: 'Satu aplikasi, fitur sesuai peran',
          deskripsi: 'Setelah masuk, menu yang tampil mengikuti peran Anda di SIAKAD.',
          kolom: 4,
          tampilan: 'kartu',
          butir: [
            { ikon: 'toga', judul: 'Alumni', teks: 'Isi kuesioner tracer, perbarui riwayat pekerjaan dan studi lanjut, lihat lowongan, dan temukan sesama alumni di direktori.', url: '/masuk' },
            { ikon: 'grafik', judul: 'Dosen dan kaprodi', teks: 'Pantau keterserapan lulusan prodi, tingkat respons, dan karier alumni bimbingan (PA dan tugas akhir) tanpa membuka data pribadi.', url: '/masuk' },
            { ikon: 'gedung', judul: 'Pengguna lulusan', teks: 'Atasan atau HRD tempat alumni bekerja menilai kinerja lulusan melalui tautan undangan, tanpa perlu membuat akun.', url: '/panduan#pengguna' },
            { ikon: 'aman', judul: 'Pengelola tracer', teks: 'Atur periode survei, undang alumni lewat email dan WhatsApp, pantau respons, impor data tracer nasional, dan ekspor laporan.', url: '/masuk' },
          ],
        },
        { jangkar: 'peran', menu: 'Untuk siapa' },
      ),
      b(
        'langkah',
        {
          eyebrow: 'Cara mengisi',
          judul: 'Tiga langkah untuk alumni',
          tampilan: 'kartu',
          butir: [
            { judul: 'Masuk', teks: 'Pakai akun SIAKAD lewat SSO UNIPO. Bila akun sudah tidak aktif, masukkan NIM, tanggal lahir, dan NIK.' },
            { judul: 'Isi kuesioner', teks: 'Sekitar 10 menit. Pertanyaan menyesuaikan jawaban Anda, dan draf tersimpan otomatis sehingga bisa dilanjutkan nanti.' },
            { judul: 'Perbarui profil karier', teks: 'Tambahkan riwayat pekerjaan atau studi lanjut, atur apakah Anda mau tampil di direktori alumni, dan lihat lowongan terbaru.' },
          ],
        },
        { latar: 'lembut', jangkar: 'cara', menu: 'Cara mengisi' },
      ),
      b('slot', { kunci: 'lowongan', eyebrow: 'Info karier', judul: 'Lowongan untuk alumni', deskripsi: 'Dihimpun pusat karier dari instansi mitra.' }),
      b('slot', { kunci: 'kabar-karier', eyebrow: 'Kabar kampus', judul: 'Kabar karier dan alumni', deskripsi: 'Dari Humas Universitas: lowongan, job fair, pelatihan, dan kegiatan alumni.' }),
      b(
        'faq',
        {
          eyebrow: 'Tanya jawab',
          judul: 'Yang sering ditanyakan',
          tampilan: 'garis',
          butir: [
            { tanya: 'Siapa yang perlu mengisi tracer study?', jawab: 'Semua lulusan, terutama yang lulus satu sampai dua tahun lalu sesuai periode yang sedang dibuka. Lulusan lama tetap boleh memperbarui profil kariernya kapan saja.' },
            { tanya: 'Akun SIAKAD saya sudah tidak aktif atau lupa password. Bagaimana masuk?', jawab: 'Pilih "Masuk dengan NIM" lalu isi NIM dan tanggal lahir. Kode masuk dikirim ke email atau nomor WhatsApp yang tercatat di kampus. Bila kontak itu sudah berubah, hubungi pusat karier untuk memperbaruinya.' },
            { tanya: 'Saya sudah mengisi di situs tracer study Kemdiktisaintek. Perlu mengisi lagi?', jawab: 'Tidak perlu. Pusat karier mengimpor jawaban dari situs nasional ke sistem kampus. Anda cukup memastikan profil karier di sini tetap terbaru.' },
            { tanya: 'Apakah data saya aman?', jawab: 'Kontak dan jawaban Anda hanya bisa dilihat petugas tracer. Dosen dan kaprodi hanya melihat data ringkas tanpa email atau nomor HP. Anda sendiri yang memilih tampil atau tidak di direktori alumni.' },
            { tanya: 'Berapa lama mengisi kuesioner?', jawab: 'Sekitar 10 menit. Jawaban tersimpan otomatis sebagai draf, jadi Anda bisa berhenti dan melanjutkan nanti.' },
          ],
        },
        { latar: 'lembut', lebar: 'sempit', jangkar: 'faq', menu: 'Tanya jawab' },
      ),
      b('ajakan', {
        judul: 'Sudah lulus dari UNIPO?',
        deskripsi: 'Sepuluh menit dari Anda membantu adik tingkat mendapat kurikulum yang lebih sesuai dengan dunia kerja.',
        tombol: [{ label: 'Isi kuesioner sekarang', url: '/masuk', gaya: 'aksen' }],
        nada: 'utama',
      }),
    ],
  };
}

/** PMB: kerangka promosi pendaftaran (angka, keunggulan, alur, kabar, testimoni). */
function templatPmb(): DokumenLanding {
  return {
    versi: 1,
    halaman: { judul: 'Penerimaan Mahasiswa Baru UNIPO' },
    blok: [
      b('hero', { lencana: 'Pendaftaran gelombang I dibuka', judul: 'Kuliah di Universitas Pohuwato,', sorot: 'mulai dari sini.', deskripsi: 'Daftar daring tanpa datang ke kampus, pilih program studi, unggah berkas, dan pantau hasil seleksi dari ponsel.', tombol: [{ label: 'Daftar sekarang', url: 'aksi:daftar', gaya: 'utama' }, { label: 'Lihat biaya kuliah', url: '#biaya', gaya: 'garis' }], tata: 'belah', media: 'ilustrasi', ilustrasi: 'pmb' }, { jarak: 'lega' }),
      b('statistik', { sumber: 'kampus', tampilan: 'papan' }, { jarak: 'rapat' }),
      b('fitur', { eyebrow: 'Kenapa UNIPO', judul: 'Alasan memilih kampus kami', kolom: 3, tampilan: 'kartu', butir: [{ ikon: 'terverifikasi', judul: 'Terakreditasi', teks: 'Program studi terakreditasi BAN-PT dan LAM.' }, { ikon: 'dompet', judul: 'Biaya terjangkau', teks: 'Cicilan per semester dan beragam beasiswa.' }, { ikon: 'karier', judul: 'Siap kerja', teks: 'Magang, MBKM, dan pusat karier alumni.' }] }, { rata: 'tengah' }),
      b('langkah', { eyebrow: 'Alur pendaftaran', judul: 'Empat langkah menjadi mahasiswa', tampilan: 'alur', butir: [{ judul: 'Buat akun', teks: 'Dengan email atau nomor WhatsApp.' }, { judul: 'Isi formulir', teks: 'Pilih jalur dan program studi.' }, { judul: 'Bayar formulir', teks: 'Lewat bank atau loket kampus.' }, { judul: 'Ikuti seleksi', teks: 'Hasil diumumkan di akun Anda.' }] }, { latar: 'lembut', rata: 'tengah' }),
      b('kabar', { eyebrow: 'Kabar PMB', judul: 'Pengumuman terbaru', jenis: 'pengumuman', jumlah: 3, tampilan: 'kisi' }),
      b('testimoni', { eyebrow: 'Kata mahasiswa', judul: 'Cerita mereka', butir: [{ kutipan: 'Pendaftarannya mudah, semua bisa dari ponsel.', nama: 'Mahasiswa baru', peran: 'Angkatan 2026', bintang: 5 }] }, { rata: 'tengah' }),
      b('ajakan', { judul: 'Kuota terbatas tiap gelombang', deskripsi: 'Amankan kursi Anda sebelum gelombang ini ditutup.', tombol: [{ label: 'Daftar sekarang', url: 'aksi:daftar', gaya: 'aksen' }], nada: 'gelap' }),
    ],
  };
}

/** Halaman layanan unit (LPPM, SPMI, Humas, fakultas): profil, angka, kabar, kontak. */
function templatUnit(): DokumenLanding {
  return {
    versi: 1,
    halaman: {},
    blok: [
      b('hero', { judul: 'Nama unit layanan', deskripsi: 'Satu kalimat tentang tugas unit dan siapa yang dilayani.', tombol: [{ label: 'Masuk', url: 'aksi:masuk', gaya: 'utama' }, { label: 'Hubungi kami', url: '#kontak', gaya: 'garis' }], tata: 'tengah' }, { jarak: 'lega', latar: 'lembut', rata: 'tengah' }),
      b('media', { eyebrow: 'Tentang', judul: 'Apa yang kami kerjakan', isi: 'Ceritakan layanan utama unit ini.', poin: [{ teks: 'Layanan pertama' }, { teks: 'Layanan kedua' }, { teks: 'Layanan ketiga' }], posisi: 'kanan' }),
      b('statistik', { sumber: 'kampus', tampilan: 'kartu', judul: 'Kampus dalam angka' }, { rata: 'tengah' }),
      b('kabar', { eyebrow: 'Kabar', judul: 'Pengumuman terbaru', jenis: 'pengumuman', jumlah: 3, tampilan: 'daftar' }),
      b('kontak', { eyebrow: 'Kontak', judul: 'Hubungi kami', alamat: 'Jl. Trans Sulawesi No. 147, Marisa, Pohuwato, Gorontalo', jam: 'Senin–Jumat, 08.00–16.00 WITA', lintang: 0.4719, bujur: 121.9372 }, { latar: 'lembut', jangkar: 'kontak', menu: 'Kontak' }),
      KAKI_UMUM(),
    ],
  };
}

/** Templat umum untuk aplikasi yang belum punya templat sendiri. */
function templatUmum(): DokumenLanding {
  return {
    versi: 1,
    halaman: {},
    blok: [
      blokBaru('hero'),
      { ...blokBaru('fitur'), gaya: { rata: 'tengah', jangkar: 'fitur', menu: 'Fitur' } },
      blokBaru('langkah'),
      { ...blokBaru('faq'), gaya: { rata: 'tengah', lebar: 'sempit', jangkar: 'faq', menu: 'FAQ' } },
      blokBaru('ajakan'),
      KAKI_UMUM(),
    ],
  };
}

export const TEMPLAT_LANDING: TemplatLanding[] = [
  { kunci: 'lms', nama: 'E-Learning', keterangan: 'Hero, fitur, kelas terbuka, cara mulai, FAQ, ajakan.', aplikasi: ['lms'], buat: templatLms },
  { kunci: 'tracer', nama: 'Alumni & tracer study', keterangan: 'Hero dengan ringkasan data, hasil, peran, langkah, lowongan, kabar, FAQ.', aplikasi: ['tracer'], buat: templatTracer },
  { kunci: 'pmb', nama: 'Penerimaan mahasiswa baru', keterangan: 'Hero pendaftaran, angka kampus, keunggulan, alur, pengumuman, testimoni.', aplikasi: ['pmb'], buat: templatPmb },
  { kunci: 'unit', nama: 'Layanan unit', keterangan: 'Profil unit, angka kampus, pengumuman, kontak dan peta.', aplikasi: ['lp2m', 'lppm', 'spmi', 'humas', 'fakultas', 'sdm', 'baak', 'keuangan'], buat: templatUnit },
  { kunci: 'umum', nama: 'Umum', keterangan: 'Kerangka sederhana: hero, fitur, langkah, FAQ, ajakan.', buat: templatUmum },
];

/** Templat bawaan untuk aplikasi (kunci templat atau kode aplikasi); jatuh ke templat umum. */
export function templatLanding(kunci?: string | null): TemplatLanding {
  return TEMPLAT_LANDING.find((t) => t.kunci === kunci) ?? TEMPLAT_LANDING.find((t) => kunci && t.aplikasi?.includes(kunci)) ?? TEMPLAT_LANDING[TEMPLAT_LANDING.length - 1]!;
}

/** Dokumen bawaan (salinan baru, id segar) untuk aplikasi. */
export function landingBawaan(kunci?: string | null): DokumenLanding {
  return normalisasiDokumen(templatLanding(kunci).buat());
}

export interface PotonganLanding {
  kunci: string;
  nama: string;
  tipe: TipeBlok;
  buat: () => BlokLanding;
}

/** Bagian siap pakai (variasi gaya) di panel Tambah blok. */
export const POTONGAN_LANDING: PotonganLanding[] = [
  { kunci: 'hero-foto', nama: 'Hero di atas foto', tipe: 'hero', buat: () => ({ ...blokBaru('hero', { tata: 'gambar', media: 'gambar' }), gaya: { jarak: 'normal' } }) },
  { kunci: 'hero-tengah', nama: 'Hero rata tengah', tipe: 'hero', buat: () => ({ ...blokBaru('hero', { tata: 'tengah' }), gaya: { jarak: 'lega', latar: 'lembut', rata: 'tengah' } }) },
  { kunci: 'angka-kampus', nama: 'Angka kampus otomatis', tipe: 'statistik', buat: () => blokBaru('statistik', { sumber: 'kampus', tampilan: 'kartu', judul: 'Kampus dalam angka' }) },
  { kunci: 'alur-garis', nama: 'Alur tegak bergaris', tipe: 'langkah', buat: () => ({ ...blokBaru('langkah', { tampilan: 'garis' }), gaya: { lebar: 'sempit' } }) },
  { kunci: 'faq-samping', nama: 'FAQ dengan judul di samping', tipe: 'faq', buat: () => ({ ...blokBaru('faq', { tampilan: 'dua' }), gaya: {} }) },
  { kunci: 'ajakan-gelap', nama: 'Ajakan gelap', tipe: 'ajakan', buat: () => blokBaru('ajakan', { nada: 'gelap' }) },
  { kunci: 'pengumuman', nama: 'Pengumuman portal', tipe: 'kabar', buat: () => blokBaru('kabar', { jenis: 'pengumuman', judul: 'Pengumuman terbaru', tampilan: 'daftar' }) },
  { kunci: 'kontak-peta', nama: 'Kontak dengan peta', tipe: 'kontak', buat: () => ({ ...blokBaru('kontak'), gaya: { latar: 'lembut', jangkar: 'kontak', menu: 'Kontak' } }) },
];

export interface LandingTerdaftar {
  /** Kunci templat bawaan. */
  bawaan: string;
  /** Bagian data milik aplikasi (label untuk penyunting; isi dipasang aplikasi lewat prop `slot`). */
  slot?: Record<string, { label: string; keterangan?: string }>;
  /** Aksi aplikasi untuk tombol `aksi:<kunci>` (label untuk penyunting; tujuan dipasang aplikasi lewat prop `aksi`). */
  aksi?: Record<string, { label: string }>;
}

/**
 * Aplikasi yang landing page-nya sudah memakai LandingAplikasi. PengaturanTema menampilkan bagian "Halaman depan"
 * untuk aplikasi ini (juga saat dibuka dari Pustikom), lengkap dengan nama bagian data dan aksinya.
 */
export const LANDING_APLIKASI: Record<string, LandingTerdaftar> = {
  lms: {
    bawaan: 'lms',
    slot: { 'kelas-terbuka': { label: 'Katalog kelas terbuka', keterangan: 'Kelas pengayaan dari dosen dan unit, dengan tombol Ikuti kelas.' } },
    aksi: { masuk: { label: 'Masuk SSO / buka beranda' } },
  },
  tracer: {
    bawaan: 'tracer',
    slot: {
      ringkasan: { label: 'Ringkasan data alumni', keterangan: 'Lulusan tercatat, persen terlacak, dan status alumni dari SIAKAD.' },
      sorotan: { label: 'Hasil tracer terbaru', keterangan: 'Angka indikator periode terbaru dan capaian per program studi.' },
      lowongan: { label: 'Lowongan untuk alumni', keterangan: 'Enam lowongan terbaru dari pusat karier. Tidak tampil bila kosong.' },
      'kabar-karier': { label: 'Kabar karier dari Humas', keterangan: 'Berita dan agenda topik karier. Tidak tampil bila kosong.' },
    },
  },
};
