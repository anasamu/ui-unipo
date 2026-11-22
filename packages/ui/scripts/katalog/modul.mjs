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
  { key: 'akun', group: 'sistem', title: 'Akun Pengguna', icon: 'UserCog', desc: 'Akun masuk semua peran: daftar, buat akun untuk orang yang belum punya, kunci/buka, dan ringkasan.', tags: ['Akun pengguna'] },
  { key: 'log-sistem', group: 'sistem', title: 'Log & Tugas Terjadwal', icon: 'ScrollText', desc: 'Log terpadu semua proses dan penjadwal tugas SIAKAD untuk Pustikom.', tags: ['Sistem:'] },
  { key: 'infra', group: 'sistem', title: 'Infrastruktur', icon: 'Server', desc: 'Status layanan, gerbang API, rahasia aplikasi, dan antrean pesan.', tags: ['Infra:'] },
  { key: 'peristiwa', group: 'sistem', title: 'Event Domain', icon: 'Radio', desc: 'Katalog event dan pendengar, peta alur bisnis lintas modul, dan outbox pengantaran.', tags: ['Event domain'] },
  { key: 'tema', group: 'sistem', title: 'Tema & Halaman Landing', icon: 'Palette', desc: 'Tema tampilan per aplikasi dan halaman landing (draf dan terbit).', tags: ['Tema', 'Tema:'] },
  { key: 'surel', group: 'sistem', title: 'Templat Email', icon: 'Mail', desc: 'Templat dan tampilan email sistem, pratinjau, dan kirim email uji.', tags: ['Templat email'] },

  // Referensi
  { key: 'referensi', group: 'referensi', title: 'Referensi Akademik', icon: 'ListTree', desc: 'Fakultas, prodi, tahun akademik, ruang, wilayah, dan referensi lain, serta kelengkapan data.', tags: ['Referensi', 'Kelengkapan data'] },
  { key: 'master', group: 'referensi', title: 'Data Master', icon: 'Database', desc: 'Struktur akademik, data induk mahasiswa dan dosen, serta format dokumen akademik.', tags: ['Data master:'] },
  { key: 'induk', group: 'referensi', title: 'Organisasi & Pejabat', icon: 'Building2', desc: 'Unit organisasi, orang, jabatan, pejabat, peran modul, dan log audit.', tags: ['Induk:'] },
  { key: 'aturan', group: 'referensi', title: 'Aturan & Kebijakan', icon: 'Scale', desc: 'Aturan berversi ber-SK: titik penerapan, pengatur, persetujuan, pengecualian, templat kasus, dan bukti syarat.', tags: ['Aturan', 'Aturan:'] },

  // Akademik
  { key: 'akademik', group: 'akademik', title: 'Perkuliahan', icon: 'GraduationCap', desc: 'Mahasiswa, dosen, jadwal dan kelas, KRS, nilai, presensi, pengajuan status, dokumen, dan lulusan.', tags: ['Mahasiswa', 'Dosen', 'Akademik', 'Akademik:', 'Jadwal', 'KRS', 'Nilai', 'Presensi', 'Keuangan', 'Lulusan'] },
  { key: 'kurikulum', group: 'akademik', title: 'Kurikulum OBE', icon: 'BookOpen', desc: 'Profil lulusan, CPL, bahan kajian, mata kuliah, CPMK, RPS, dan evaluasi capaian.', tags: ['Kurikulum OBE', 'Kurikulum OBE:'] },
  { key: 'kurikulum-aturan', group: 'akademik', title: 'Aturan Kurikulum', icon: 'BookCheck', desc: 'Aturan kurikulum berversi, kerangka, perangkat MK, asesmen dan RPS, pengajuan dan validasi BAAK, evaluasi.', tags: ['Kurikulum:'] },
  { key: 'kalender', group: 'akademik', title: 'Kalender Akademik', icon: 'CalendarDays', desc: 'Kegiatan, hari kerja, dan kalender terpadu.', tags: ['Kalender:'] },
  { key: 'admisi', group: 'akademik', title: 'Admisi', icon: 'DoorOpen', desc: 'Penerimaan, seleksi, KIP Kuliah dan UKT, pendaftar, program studi, chat, dan laporan.', tags: ['Admisi:'] },
  { key: 'pmb', group: 'akademik', title: 'PMB', icon: 'UserPlus', desc: 'Penerimaan mahasiswa baru: periode, jalur, pendaftar, seleksi, dan pembayaran.', tags: ['PMB', 'PMB Admin', 'PMB Akun', 'PMB Keuangan', 'PMB Pendaftar', 'PMB Publik', 'PMB:'] },
  { key: 'lms', group: 'akademik', title: 'LMS', icon: 'MonitorPlay', desc: 'Kelas daring, konten, tugas, kuis, forum, nilai, presensi, dan impor ke SIAKAD.', tags: ['LMS:'] },
  { key: 'cbt', group: 'akademik', title: 'Ujian CBT', icon: 'ClipboardCheck', desc: 'Bank soal, ujian, sesi, peserta, koreksi, dan kirim nilai ke SIAKAD.', tags: ['CBT:'] },
  { key: 'edom', group: 'akademik', title: 'EDOM', icon: 'MessageSquareText', desc: 'Evaluasi dosen oleh mahasiswa: soal, pengisian, dan hasil.', tags: ['EDOM:'] },
  { key: 'mbkm', group: 'akademik', title: 'MBKM', icon: 'Route', desc: 'Program Merdeka Belajar, peserta, logbook, dan konversi nilai.', tags: ['MBKM:'] },
  { key: 'rpl', group: 'akademik', title: 'RPL', icon: 'Repeat', desc: 'Rekognisi pembelajaran lampau: pemohon, asesmen, pengajuan, dan master.', tags: ['RPL:'] },
  { key: 'kelulusan', group: 'akademik', title: 'Kelulusan & Wisuda', icon: 'Award', desc: 'Yudisium, syarat lulus, wisuda, ijazah dan sertifikat, poin dan SKPI.', tags: ['Kelulusan:'] },
  { key: 'wisuda', group: 'akademik', title: 'Acara Wisuda', icon: 'PartyPopper', desc: 'Penyelenggaraan acara wisuda dan pelaksanaan hari-H.', tags: ['Wisuda:'] },
  { key: 'ta', group: 'akademik', title: 'Tugas Akhir', icon: 'FileSignature', desc: 'Pengajuan judul, validasi, progres, serta kelayakan, jadwal, SK Dekan, dan hasil ujian tugas akhir.', tags: ['Tugas akhir:', 'Ujian TA:'] },
  { key: 'plagiasi', group: 'akademik', title: 'Cek Plagiasi', icon: 'ScanSearch', desc: 'Pengajuan cek plagiasi oleh mahasiswa/pembimbing dan antrean unit pemeriksa.', tags: ['Plagiasi:'] },
  { key: 'presensi-qr', group: 'akademik', title: 'Presensi QR', icon: 'ScanLine', desc: 'Sesi presensi berkode QR, pindai peserta, izin/sakit, dan titik presensi kerja.', tags: ['Presensi QR:'] },

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
  { key: 'pimpinan', group: 'kelembagaan', title: 'Pimpinan', icon: 'Crown', desc: 'Bidang pimpinan, arahan, dan pengesahan kurikulum.', tags: ['Pimpinan:'] },
  { key: 'sk', group: 'kelembagaan', title: 'Registri SK', icon: 'Stamp', desc: 'Registri SK tunggal: pencatatan, verifikasi, pencabutan, penerbit, dan penandatangan.', tags: ['SK:'] },
  { key: 'pedoman', group: 'kelembagaan', title: 'Pedoman & Peraturan', icon: 'BookText', desc: 'Pedoman dan peraturan kampus, termasuk yang terbit untuk publik.', tags: ['Pedoman & peraturan'] },
  { key: 'panitia', group: 'kelembagaan', title: 'Kepanitiaan', icon: 'UsersRound', desc: 'Jenis panitia, kepanitiaan dan anggotanya, serta persetujuan hak akses oleh Pustikom.', tags: ['Panitia:'] },
  { key: 'pemeriksa', group: 'kelembagaan', title: 'Alur Pemeriksa Usulan', icon: 'ListChecks', desc: 'Katalog alur pemeriksa per jenis usulan.', tags: ['Pemeriksa:'] },
  { key: 'gaji', group: 'kelembagaan', title: 'Gaji & Payroll', icon: 'HandCoins', desc: 'Master gaji, proses payroll, laporan, dan slip gaji pegawai.', tags: ['Gaji:'] },
  { key: 'biaya', group: 'kelembagaan', title: 'Aturan Biaya', icon: 'Calculator', desc: 'Aturan komponen biaya ber-SK, simulasi dan rekap pembagian pembayaran.', tags: ['Biaya:'] },
  { key: 'kasir', group: 'kelembagaan', title: 'Kasir', icon: 'Banknote', desc: 'Sesi kasir, penerimaan, laporan, pengaturan per unit, dan migrasi aplikasi lama.', tags: ['Kasir:'] },
  { key: 'kwitansi', group: 'kelembagaan', title: 'Kwitansi', icon: 'Receipt', desc: 'Pengaturan, penerbitan, dan verifikasi publik kwitansi.', tags: ['Kwitansi:'] },

  // Layanan
  { key: 'layanan', group: 'layanan', title: 'Layanan Administrasi', icon: 'FileCheck2', desc: 'Katalog layanan, permohonan surat/dokumen, dan verifikasi dokumen (QR).', tags: ['Layanan:'] },
  { key: 'arsip', group: 'layanan', title: 'Arsip & Persuratan', icon: 'Archive', desc: 'Surat masuk/keluar, disposisi, dokumen, berkas, berbagi, peminjaman, dan penyusutan.', tags: ['Arsip:'] },
  { key: 'helpdesk', group: 'layanan', title: 'Helpdesk', icon: 'LifeBuoy', desc: 'Tiket bantuan, kategori, dan laporan.', tags: ['Helpdesk:'] },
  { key: 'dokumen', group: 'layanan', title: 'Dokumen Terbit', icon: 'FileText', desc: 'Templat dokumen dan Word, desain KTM, penerbitan, arsip terbit, dan verifikasi publik.', tags: ['Dokumen:'] },
  { key: 'berkas', group: 'layanan', title: 'Berkas & Penyimpanan', icon: 'HardDrive', desc: 'Berkas dan folder, unggah bertahap, berbagi, enkripsi, serta kuota penyimpanan unit dan Pustikom.', tags: ['Berkas', 'Berkas:', 'Penyimpanan', 'Penyimpanan:'] },
  { key: 'obrolan', group: 'layanan', title: 'Obrolan', icon: 'MessagesSquare', desc: 'Ruang obrolan, pesan, privasi, serta perangkat dan kunci enkripsi.', tags: ['Obrolan', 'Obrolan:'] },
  { key: 'qr', group: 'layanan', title: 'Kode QR', icon: 'QrCode', desc: 'Pembuat kode QR dan gaya QR tersimpan.', tags: ['QR:'] },

  // Sarana
  { key: 'sarpras', group: 'sarana', title: 'Sarana Prasarana', icon: 'Warehouse', desc: 'Gedung, ruang, aset, pemeliharaan, dan peminjaman.', tags: ['Sarpras:'] },
  { key: 'perpustakaan', group: 'sarana', title: 'Perpustakaan', icon: 'BookMarked', desc: 'Katalog, pengelolaan koleksi, sirkulasi, layanan anggota, dan laporan.', tags: ['Perpustakaan:'] },
  { key: 'repositori', group: 'sarana', title: 'Repositori', icon: 'Library', desc: 'Karya ilmiah, koleksi, dan OAI-PMH.', tags: ['Repositori:'] },

  // Humas
  { key: 'humas', group: 'humas', title: 'Ruang Redaksi', icon: 'Megaphone', desc: 'Rilis, liputan, agenda redaksi, dan umpan berita untuk aplikasi lain.', tags: ['Humas', 'Humas:'] },
  { key: 'portal', group: 'humas', title: 'Portal & Berita', icon: 'Newspaper', desc: 'Situs universitas, fakultas, dan prodi: berita, agenda, halaman, galeri, menu.', tags: ['Portal', 'Portal:'] },
  { key: 'crm', group: 'humas', title: 'CRM Calon Mahasiswa', icon: 'Contact', desc: 'Prospek, skor, dan segmen calon mahasiswa untuk promosi.', tags: ['CRM:'] },
];

/** Tag yang tidak ditampilkan (autentikasi dan info sistem ditangani aplikasi sendiri). Hanya nama persis: "Sistem: ..." tetap tampil di modul log-sistem. */
export const TAG_DISEMBUNYIKAN = ['Autentikasi', 'Sistem'];
