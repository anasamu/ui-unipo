/**
 * Pengelompokan tag OpenAPI SIAKAD menjadi grup dan modul fitur di unipo-ui/katalog.
 *
 * - tags: nama tag persis, atau awalan yang diakhiri ":" (mis. "RBAC:" cocok dengan "RBAC: Aplikasi").
 * - icon: nama ikon lucide-react (dipetakan di src/katalog/ikon.tsx).
 * Tag yang tidak cocok dilaporkan saat katalog dibuat.
 */
export const GRUP = [
  { key: 'sistem', title: 'Sistem & Akses', icon: 'ShieldCheck' },
  { key: 'referensi', title: 'Referensi', icon: 'Database' },
  { key: 'akademik', title: 'Akademik', icon: 'GraduationCap' },
  { key: 'kemahasiswaan', title: 'Kemahasiswaan', icon: 'Users' },
  { key: 'alumni', title: 'Alumni', icon: 'Compass' },
  { key: 'kelembagaan', title: 'Kelembagaan', icon: 'Landmark' },
  { key: 'layanan', title: 'Layanan', icon: 'FileCheck2' },
  { key: 'sarana', title: 'Sarana', icon: 'Warehouse' },
  { key: 'humas', title: 'Humas', icon: 'Megaphone' },
];

export const MODUL = [
  // Sistem & Akses
  { key: 'akses', group: 'sistem', title: 'Aplikasi & Hak Akses', icon: 'ShieldCheck', desc: 'Aplikasi terdaftar, peran, izin, penugasan pengguna, klien API, dan lingkungan data live/development.', tags: ['RBAC:', 'Lingkungan data'] },
  { key: 'portal-api', group: 'sistem', title: 'Portal Pengembang API', icon: 'KeyRound', desc: 'Pengajuan akses API dari api.unipo.ac.id, aplikasi pengembang, dan tinjauan Pustikom.', tags: ['Portal API:'] },
  { key: 'profil', group: 'sistem', title: 'Profil Pengguna', icon: 'UserRound', desc: 'Profil semua peran, verifikasi, riwayat, dokumen, dan permohonan perubahan data.', tags: ['Profil:'] },
  { key: 'notifikasi', group: 'sistem', title: 'Notifikasi', icon: 'Bell', desc: 'Pengumuman, kotak masuk, antrean kirim, dan preferensi notifikasi.', tags: ['Notifikasi:'] },
  { key: 'integrasi', group: 'sistem', title: 'Integrasi Pihak Ketiga', icon: 'Plug', desc: 'AI, tanda tangan elektronik BSrE, captcha, payment gateway, penyimpanan berkas, cache, email & WhatsApp, rapat daring, webhook.', tags: ['Integrasi:'] },
  { key: 'pddikti', group: 'sistem', title: 'PDDikti', icon: 'Send', desc: 'Pelaporan PDDikti/Neo Feeder: kirim, sinkronisasi otomatis, dan evaluasi data.', tags: ['PDDikti:'] },
  { key: 'dasbor', group: 'sistem', title: 'Dasbor & Peringatan Dini', icon: 'Gauge', desc: 'Ringkasan data dan early warning system mahasiswa.', tags: ['Dasbor:'] },

  // Referensi
  { key: 'referensi', group: 'referensi', title: 'Referensi Akademik', icon: 'ListTree', desc: 'Fakultas, prodi, tahun akademik, ruang, wilayah, dan referensi lain, serta kelengkapan data.', tags: ['Referensi', 'Kelengkapan data'] },
  { key: 'master', group: 'referensi', title: 'Data Master', icon: 'Database', desc: 'Struktur akademik, data induk mahasiswa dan dosen, serta format dokumen akademik.', tags: ['Data master:'] },
  { key: 'induk', group: 'referensi', title: 'Organisasi & Pejabat', icon: 'Building2', desc: 'Unit organisasi, orang, jabatan, pejabat, peran modul, dan log audit.', tags: ['Induk:'] },

  // Akademik
  { key: 'akademik', group: 'akademik', title: 'Perkuliahan', icon: 'GraduationCap', desc: 'Mahasiswa, dosen, jadwal dan kelas, KRS, nilai, presensi, pengajuan status, dokumen, dan lulusan.', tags: ['Mahasiswa', 'Dosen', 'Akademik', 'Akademik:', 'Jadwal', 'KRS', 'Nilai', 'Presensi', 'Keuangan', 'Lulusan'] },
  { key: 'kurikulum', group: 'akademik', title: 'Kurikulum OBE', icon: 'BookOpen', desc: 'Profil lulusan, CPL, bahan kajian, mata kuliah, CPMK, RPS, dan evaluasi capaian.', tags: ['Kurikulum OBE', 'Kurikulum OBE:'] },
  { key: 'kalender', group: 'akademik', title: 'Kalender Akademik', icon: 'CalendarDays', desc: 'Kegiatan, hari kerja, dan kalender terpadu.', tags: ['Kalender:'] },
  { key: 'admisi', group: 'akademik', title: 'Admisi', icon: 'DoorOpen', desc: 'Penerimaan, seleksi, KIP Kuliah dan UKT, pendaftar, program studi, chat, dan laporan.', tags: ['Admisi:'] },
  { key: 'pmb', group: 'akademik', title: 'PMB', icon: 'UserPlus', desc: 'Penerimaan mahasiswa baru: periode, jalur, pendaftar, seleksi, dan pembayaran.', tags: ['PMB', 'PMB Admin', 'PMB Akun', 'PMB Keuangan', 'PMB Pendaftar', 'PMB Publik'] },
  { key: 'lms', group: 'akademik', title: 'LMS', icon: 'MonitorPlay', desc: 'Kelas daring, konten, tugas, kuis, forum, nilai, presensi, dan impor ke SIAKAD.', tags: ['LMS:'] },
  { key: 'cbt', group: 'akademik', title: 'Ujian CBT', icon: 'ClipboardCheck', desc: 'Bank soal, ujian, sesi, peserta, koreksi, dan kirim nilai ke SIAKAD.', tags: ['CBT:'] },
  { key: 'edom', group: 'akademik', title: 'EDOM', icon: 'MessageSquareText', desc: 'Evaluasi dosen oleh mahasiswa: soal, pengisian, dan hasil.', tags: ['EDOM:'] },
  { key: 'mbkm', group: 'akademik', title: 'MBKM', icon: 'Route', desc: 'Program Merdeka Belajar, peserta, logbook, dan konversi nilai.', tags: ['MBKM:'] },
  { key: 'rpl', group: 'akademik', title: 'RPL', icon: 'Repeat', desc: 'Rekognisi pembelajaran lampau: pemohon, asesmen, pengajuan, dan master.', tags: ['RPL:'] },
  { key: 'kelulusan', group: 'akademik', title: 'Kelulusan & Wisuda', icon: 'Award', desc: 'Yudisium, syarat lulus, wisuda, ijazah dan sertifikat, poin dan SKPI.', tags: ['Kelulusan:'] },

  // Kemahasiswaan
  { key: 'kemahasiswaan', group: 'kemahasiswaan', title: 'Kemahasiswaan', icon: 'Users', desc: 'Organisasi, prestasi, beasiswa, konseling, dan pelanggaran.', tags: ['Kemahasiswaan:'] },

  // Alumni
  { key: 'tracer', group: 'alumni', title: 'Tracer Study', icon: 'Compass', desc: 'Alumni, periode, kuesioner, responden, publikasi, dan referensi karier.', tags: ['Tracer Study:'] },
  { key: 'karier', group: 'alumni', title: 'Pusat Karier', icon: 'Briefcase', desc: 'Mitra, lowongan, acara, profil dan CV, lamaran, dan rekomendasi.', tags: ['Karier:'] },

  // Kelembagaan
  { key: 'fakultas', group: 'kelembagaan', title: 'Fakultas', icon: 'Landmark', desc: 'Portal dan dasbor fakultas, termasuk kelola akademik di tingkat fakultas.', tags: ['Fakultas', 'Fakultas:'] },
  { key: 'sdm', group: 'kelembagaan', title: 'Kepegawaian', icon: 'IdCard', desc: 'Pegawai, riwayat, presensi, cuti, kinerja, usulan, PAK, honor, dan SISTER.', tags: ['SDM:'] },
  { key: 'keu', group: 'kelembagaan', title: 'Keuangan', icon: 'Wallet', desc: 'Anggaran, realisasi, penerimaan, tagihan dan tarif mahasiswa, UKT, dispensasi, cicilan, kasir, dan virtual account.', tags: ['Keuangan:'] },
  { key: 'lppm', group: 'kelembagaan', title: 'LPPM', icon: 'FlaskConical', desc: 'Penelitian, pengabdian, KKN, review, luaran, publikasi, dan rekap.', tags: ['LPPM:'] },
  { key: 'spmi', group: 'kelembagaan', title: 'SPMI', icon: 'BadgeCheck', desc: 'Penjaminan mutu: penetapan, pelaksanaan, AMI, pengendalian, peningkatan, survei, akreditasi.', tags: ['SPMI:'] },
  { key: 'iku', group: 'kelembagaan', title: 'IKU', icon: 'Target', desc: 'Indikator kinerja utama: dasbor, pengaturan, dan bukti.', tags: ['IKU:'] },
  { key: 'kerjasama', group: 'kelembagaan', title: 'Kerja Sama', icon: 'Handshake', desc: 'Mitra, dokumen MoU/MoA/IA, kegiatan, dan evaluasi.', tags: ['Kerja sama:'] },

  // Layanan
  { key: 'layanan', group: 'layanan', title: 'Layanan Administrasi', icon: 'FileCheck2', desc: 'Katalog layanan, permohonan surat/dokumen, dan verifikasi dokumen (QR).', tags: ['Layanan:'] },
  { key: 'arsip', group: 'layanan', title: 'Arsip & Persuratan', icon: 'Archive', desc: 'Surat masuk/keluar, disposisi, dokumen, berkas, berbagi, peminjaman, dan penyusutan.', tags: ['Arsip:'] },
  { key: 'helpdesk', group: 'layanan', title: 'Helpdesk', icon: 'LifeBuoy', desc: 'Tiket bantuan, kategori, dan laporan.', tags: ['Helpdesk:'] },

  // Sarana
  { key: 'sarpras', group: 'sarana', title: 'Sarana Prasarana', icon: 'Warehouse', desc: 'Gedung, ruang, aset, pemeliharaan, dan peminjaman.', tags: ['Sarpras:'] },
  { key: 'perpustakaan', group: 'sarana', title: 'Perpustakaan', icon: 'BookMarked', desc: 'Katalog, pengelolaan koleksi, sirkulasi, layanan anggota, dan laporan.', tags: ['Perpustakaan:'] },
  { key: 'repositori', group: 'sarana', title: 'Repositori', icon: 'Library', desc: 'Karya ilmiah, koleksi, dan OAI-PMH.', tags: ['Repositori:'] },

  // Humas
  { key: 'humas', group: 'humas', title: 'Ruang Redaksi', icon: 'Megaphone', desc: 'Rilis, liputan, agenda redaksi, dan umpan berita untuk aplikasi lain.', tags: ['Humas', 'Humas:'] },
  { key: 'portal', group: 'humas', title: 'Portal & Berita', icon: 'Newspaper', desc: 'Situs universitas, fakultas, dan prodi: berita, agenda, halaman, galeri, menu.', tags: ['Portal', 'Portal:'] },
  { key: 'crm', group: 'humas', title: 'CRM Calon Mahasiswa', icon: 'Contact', desc: 'Prospek, skor, dan segmen calon mahasiswa untuk promosi.', tags: ['CRM:'] },
];

/** Tag yang tidak ditampilkan (autentikasi dan info sistem ditangani aplikasi sendiri). */
export const TAG_DISEMBUNYIKAN = ['Autentikasi', 'Sistem'];
