// Salinan katalog titik penerapan dan indikator dari SIAKAD (app/Modules/Aturan/Data/titik.php, indikator.php).
type Contoh = { judul: string; keterangan?: string; jenis: string; mode?: string; kondisi?: unknown; parameter?: unknown };
export const TITIK_ATURAN: Record<
  string,
  {
    judul: string;
    keterangan: string;
    kategori: string[];
    subjek: string;
    jenis: string[];
    konteks: string[];
    lama: string | null;
    penerapan: string[];
    unit?: string;
    kelompok?: string;
    contoh?: Contoh[];
    aktif?: boolean;
    kustom?: boolean;
  }
> = {
  'krs.ambil': {
    judul: 'Ambil/ubah KRS oleh mahasiswa (kontrak KRS)',
    keterangan: 'Mahasiswa memilih mata kuliah. Contoh aturan: masa kontrak KRS, batas SKS menurut IPS, minimal bayar sebelum KRS, status aktif.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu', 'batas_nilai'],
    konteks: ['sks_diambil', 'jumlah_mk'],
    lama: 'krs_mhs',
    penerapan: ['GET /v1/mahasiswa/{nim}/krs/penawaran (boleh_ambil, batas_sks)', 'POST /v1/mahasiswa/{nim}/krs (SKS setelah perubahan)', 'tulis-tembus batas waktu ke m_bataskrs_mhs'],
  },
  'krs.input.operator': {
    judul: 'Input KRS oleh operator/prodi',
    keterangan: 'Operator atau admin prodi mengisi KRS mahasiswa.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu', 'batas_nilai'],
    konteks: ['sks_diambil', 'jumlah_mk'],
    lama: 'krs',
    penerapan: ['tulis-tembus batas waktu ke m_bataskrs (halaman KRS operator/prodi)'],
  },
  'krs.input.dosen': {
    judul: 'Input KRS oleh dosen PA',
    keterangan: 'Dosen penasihat akademik mengisi KRS mahasiswa bimbingannya.',
    kategori: ['akademik'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu', 'batas_nilai'],
    konteks: ['sks_diambil', 'jumlah_mk'],
    lama: 'krs_dosen',
    penerapan: ['tulis-tembus batas waktu ke m_bataskrs_dosen (halaman KRS dosen PA)'],
  },
  'krs.setujui': {
    judul: 'Persetujuan KRS',
    keterangan: 'Dosen PA atau prodi menyetujui KRS. Contoh aturan: SKS disetujui tidak melebihi batas, wajib lunas sebelum disetujui.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu', 'batas_nilai'],
    konteks: ['sks_diambil', 'jumlah_mk'],
    lama: null,
    penerapan: ['POST /v1/akademik/krs/persetujuan/{nim} dan /persetujuan (banyak)', 'POST /v1/fakultas/{kode}/krs/persetujuan/{nim} dan /persetujuan (banyak)'],
  },
  'nilai.input.dosen': {
    judul: 'Input nilai oleh dosen pengampu',
    keterangan: 'Batas waktu input nilai dosen per periode dan prodi (setara menu Batas Waktu Input Nilai Dosen).',
    kategori: ['akademik'],
    subjek: 'kelas',
    jenis: ['batas_waktu', 'syarat'],
    konteks: [],
    lama: 'nilai_dosen',
    penerapan: [
      'GET/POST /v1/akademik/nilai/kelas/{idj} (dosen pengampu)',
      'GET/POST /v1/fakultas/{kode}/nilai/kelas/{idj} (dosen pengampu)',
      'POST /v1/lms/kelas/{id}/siakad/nilai/impor (dosen)',
      'tulis-tembus batas waktu ke m_batas_inputnilai_dosen',
    ],
  },
  'nilai.input.prodi': {
    judul: 'Input nilai selain dosen (prodi, operator, BAAK)',
    keterangan: 'Batas waktu input nilai oleh pengelola prodi/BAAK.',
    kategori: ['akademik'],
    subjek: 'kelas',
    jenis: ['batas_waktu', 'syarat'],
    konteks: [],
    lama: 'nilai',
    penerapan: [
      'GET/POST /v1/akademik/nilai/kelas/{idj} (pengelola)',
      'GET/POST /v1/fakultas/{kode}/nilai/kelas/{idj} (pengelola)',
      'POST /v1/lms/kelas/{id}/siakad/nilai/impor (pengelola)',
      'GET/POST /v1/cbt/ujian/{id}/nilai-siakad',
      'tulis-tembus batas waktu ke m_batas_inputnilai',
    ],
  },
  'ujian.uts': {
    judul: 'Ikut UTS / cetak kartu UTS',
    keterangan: 'Syarat ikut ujian tengah semester: minimal bayar, kehadiran, status aktif.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: ['presensi_persen'],
    lama: null,
    penerapan: ['GET /v1/akademik/mahasiswa/{nim}/kartu-ujian (boleh_cetak UTS)'],
  },
  'ujian.uas': {
    judul: 'Ikut UAS / cetak kartu UAS',
    keterangan: 'Syarat ikut ujian akhir semester: minimal bayar, kehadiran, status aktif.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: ['presensi_persen'],
    lama: null,
    penerapan: ['GET /v1/akademik/mahasiswa/{nim}/kartu-ujian (boleh_cetak UAS)'],
  },
  'ta.ajukan': {
    judul: 'Pengajuan judul tugas akhir/skripsi',
    keterangan: 'Contoh aturan: SKS lulus minimal, IPK minimal, masa pengajuan.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: 'ta',
    penerapan: ['tulis-tembus batas waktu ke m_batas_input_ta (pengajuan judul di halaman web)'],
  },
  'ta.ujian': {
    judul: 'Pendaftaran ujian tugas akhir/skripsi',
    keterangan: 'Contoh aturan: semua mata kuliah selain TA lulus, bebas tunggakan, masa pendaftaran.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: 'uji_ta',
    penerapan: ['tulis-tembus batas waktu ke m_batas_daftar_uji_ta (pendaftaran ujian di halaman web)'],
  },
  'kkn.daftar': {
    judul: 'Pendaftaran KKN',
    keterangan: 'Contoh aturan: SKS lulus minimal 100, IPK minimal 2.00, lulus mata kuliah tertentu, minimal bayar.',
    kategori: ['kemahasiswaan', 'akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['POST /v1/lppm/kkn/periode/{id}/daftar'],
  },
  'cuti.ajukan': {
    judul: 'Pengajuan cuti akademik',
    keterangan: 'Contoh aturan: paling banyak cuti N semester, bukan semester pertama, masa pengajuan.',
    kategori: ['akademik', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['POST /v1/akademik/pengajuan (jenis cuti)'],
  },
  'yudisium.tetapkan': {
    judul: 'Penetapan lulus (yudisium)',
    keterangan: 'Syarat yudisium: IPK/SKS minimal, nilai D/E, tugas akhir lulus, bebas tunggakan, bebas pustaka, poin kegiatan.',
    kategori: ['kelulusan', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['GET /v1/kelulusan/mahasiswa/{nim}/syarat (boleh_yudisium)', 'POST /v1/kelulusan/yudisium (mahasiswa dilewati)'],
  },
  'wisuda.daftar': {
    judul: 'Pendaftaran wisuda',
    keterangan: 'Syarat daftar wisuda: sudah yudisium, bebas tunggakan, bebas pustaka, dan syarat lain.',
    kategori: ['kelulusan', 'keuangan'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['GET /v1/kelulusan/mahasiswa/{nim}/syarat (boleh_wisuda)', 'GET /v1/kelulusan/wisuda/saya', 'POST /v1/kelulusan/wisuda/daftar'],
  },
  'sdm.cuti.ajukan': {
    judul: 'Pengajuan cuti/izin pegawai',
    keterangan: 'Dosen/tendik mengajukan cuti. Contoh aturan: masa kerja minimal 1 tahun untuk cuti tahunan, cuti besar hanya untuk pegawai tetap.',
    kategori: ['kepegawaian'],
    subjek: 'pegawai',
    jenis: ['syarat', 'batas_waktu', 'batas_nilai'],
    konteks: ['lama_cuti_hari', 'jenis_cuti'],
    lama: null,
    penerapan: ['POST /v1/sdm/cuti'],
  },
  'sdm.usulan.ajukan': {
    judul: 'Pengajuan usulan kenaikan jabatan, pangkat, studi lanjut',
    keterangan: 'Contoh aturan kampus: studi lanjut minimal masa kerja 2 tahun dan BKD terakhir memenuhi.',
    kategori: ['kepegawaian'],
    subjek: 'pegawai',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['POST /v1/sdm/usulan/{id}/ajukan'],
  },
  'pmb.daftar_ulang': {
    judul: 'Daftar ulang calon mahasiswa baru',
    keterangan: 'Pendaftar yang lulus seleksi melakukan daftar ulang. Contoh aturan: biaya daftar ulang lunas, berkas lengkap.',
    kategori: ['umum', 'keuangan'],
    subjek: 'pendaftar',
    jenis: ['syarat', 'batas_waktu'],
    konteks: [],
    lama: null,
    penerapan: ['POST /v1/pmb/pendaftaran/{id}/daftar-ulang'],
  },
  'akun.buat': {
    judul: 'Pembuatan akun pengguna',
    keterangan: 'Akun SSO baru dibuat oleh admin atau otomatis. Contoh aturan: akun mahasiswa hanya untuk status aktif.',
    kategori: ['umum'],
    subjek: 'akun',
    jenis: ['syarat'],
    konteks: ['peran_akun'],
    lama: null,
    penerapan: ['POST /v1/akun'],
  },
  'perpus.pinjam': {
    judul: 'Peminjaman buku perpustakaan',
    keterangan: 'Anggota meminjam buku di perpustakaan.',
    kategori: ['umum'],
    subjek: 'mahasiswa',
    jenis: ['syarat', 'batas_nilai'],
    konteks: [],
    lama: null,
    penerapan: [],
    aktif: false,
  },
};
export const INDIKATOR_ATURAN: Record<
  string,
  { judul: string; tipe: string; subjek: string; sumber: string; keterangan: string; kelompok?: string; satuan?: string; opsi?: Array<{ nilai: string; label: string }> }
> = {
  ipk: { judul: 'IPK', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'IPK kumulatif sampai periode (perhitungan IPK SIAKAD, nilai_ipk)' },
  sks_lulus: { judul: 'SKS lulus', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Jumlah SKS kumulatif yang dihitung di IPK' },
  ips_lalu: { judul: 'IPS semester lalu', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'IPS periode sebelum periode aturan' },
  semester_ke: { judul: 'Semester berjalan', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Dihitung dari semester masuk sampai periode aturan (ganjil/genap)' },
  angkatan: { judul: 'Angkatan (semester masuk)', tipe: 'teks', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'm_mahasiswa.semester_masuk, mis. 20231' },
  status_aktif: { judul: 'Status mahasiswa', tipe: 'teks', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'A aktif, C cuti, N non-aktif, L lulus, D DO, K keluar, ...' },
  jumlah_nilai_d: {
    judul: 'Jumlah mata kuliah bernilai D',
    tipe: 'angka',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Per mata kuliah (nilai terbaik), sama dengan pemeriksaan Pendaftaran Wisuda',
  },
  jumlah_nilai_e: { judul: 'Jumlah mata kuliah bernilai E', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Per mata kuliah' },
  ta_lulus: { judul: 'Tugas akhir/skripsi lulus', tipe: 'benar_salah', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Ada KRS mata kuliah jenis skripsi (S) yang lulus' },
  mk_lulus: {
    judul: 'Mata kuliah yang sudah lulus',
    tipe: 'daftar',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Kode mata kuliah berstatus lulus di KRS. Pakai operator memuat, mis. {"indikator": "mk_lulus", "op": "memuat", "nilai": "MKU101"}',
  },
  jumlah_cuti: { judul: 'Jumlah semester cuti', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Periode berstatus C di riwayat status mahasiswa' },
  poin_kegiatan: { judul: 'Poin kegiatan kemahasiswaan', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Total poin terverifikasi (/v1/kelulusan/mahasiswa/{nim}/poin)' },
  bebas_pustaka: { judul: 'Bebas pustaka', tipe: 'benar_salah', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Tidak ada pinjaman aktif di perpustakaan SIAKAD (dan SLiMS bila tersambung)' },
  tunggakan: { judul: 'Tunggakan (rupiah)', tipe: 'angka', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Sisa tagihan semua periode (tagihan - pembayaran)' },
  bayar_syarat_krs: {
    judul: 'Syarat bayar KRS terpenuhi',
    tipe: 'benar_salah',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Pembayaran tiap item biaya sudah mencapai persen minimal untuk KRS di master biaya (cek_spp_persen, periode aturan)',
  },
  bayar_syarat_ujian: {
    judul: 'Syarat bayar ujian terpenuhi',
    tipe: 'benar_salah',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Pembayaran sudah mencapai persen minimal untuk cetak kartu ujian di master biaya (cek_spp_persen_ujian)',
  },
  persen_bayar_periode: {
    judul: 'Persen bayar tagihan periode',
    tipe: 'angka',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Jumlah bayar dibagi jumlah tagihan periode aturan x 100 (100 bila tidak ada tagihan)',
  },
  tagihan_periode_lunas: { judul: 'Tagihan periode lunas', tipe: 'benar_salah', subjek: 'mahasiswa', sumber: 'siakad', keterangan: 'Semua tagihan periode aturan sudah dibayar penuh' },
  dispensasi_keuangan: {
    judul: 'Punya dispensasi keuangan',
    tipe: 'benar_salah',
    subjek: 'mahasiswa',
    sumber: 'siakad',
    keterangan: 'Dispensasi pembayaran periode itu yang disetujui dan belum lewat janji bayar (/v1/keuangan dispensasi)',
  },
  sks_diambil: {
    judul: 'SKS yang diambil',
    tipe: 'angka',
    subjek: 'mahasiswa',
    sumber: 'konteks',
    keterangan: 'Total SKS KRS setelah perubahan; dikirim titik krs.*. Bila tidak dikirim, dihitung dari KRS periode itu',
  },
  jumlah_mk: { judul: 'Jumlah mata kuliah diambil', tipe: 'angka', subjek: 'mahasiswa', sumber: 'konteks', keterangan: 'Dikirim titik krs.*. Bila tidak dikirim, dihitung dari KRS periode itu' },
  presensi_persen: { judul: 'Persentase kehadiran', tipe: 'angka', subjek: 'mahasiswa', sumber: 'konteks', keterangan: 'Kehadiran mata kuliah yang diujikan; dikirim titik ujian.*' },
  hari: { judul: 'Hari (1 = Senin ... 7 = Minggu)', tipe: 'angka', subjek: 'umum', sumber: 'siakad', keterangan: 'Hari saat pemeriksaan' },
  jenis_pegawai: {
    judul: 'Jenis pegawai',
    tipe: 'pilihan',
    subjek: 'pegawai',
    sumber: 'siakad',
    keterangan: 'Dosen atau tenaga kependidikan',
    opsi: [
      { nilai: 'dosen', label: 'Dosen' },
      { nilai: 'tendik', label: 'Tendik' },
    ],
  },
  status_kepegawaian: {
    judul: 'Status kepegawaian',
    tipe: 'pilihan',
    subjek: 'pegawai',
    sumber: 'siakad',
    keterangan: 'Status ikatan kerja pegawai',
    opsi: [
      { nilai: 'pns', label: 'PNS' },
      { nilai: 'pppk', label: 'PPPK' },
      { nilai: 'tetap_yayasan', label: 'Tetap yayasan' },
      { nilai: 'kontrak', label: 'Kontrak' },
      { nilai: 'honorer', label: 'Honorer' },
    ],
  },
  masa_kerja_tahun: { judul: 'Masa kerja', tipe: 'angka', satuan: 'tahun', subjek: 'pegawai', sumber: 'siakad', keterangan: 'Dari TMT masuk sampai hari pemeriksaan (pecahan, mis. 1,5)' },
  tmt_masuk: { judul: 'Tanggal mulai bekerja', tipe: 'tanggal', subjek: 'pegawai', sumber: 'siakad', keterangan: 'TMT masuk di data kepegawaian' },
  serdos: { judul: 'Punya sertifikat pendidik', tipe: 'benar_salah', subjek: 'pegawai', sumber: 'siakad', keterangan: 'Sertifikasi dosen (serdos) tercatat' },
  bkd_terakhir_memenuhi: { judul: 'BKD terakhir memenuhi', tipe: 'benar_salah', subjek: 'pegawai', sumber: 'siakad', keterangan: 'Laporan BKD terakhir berkesimpulan memenuhi' },
  sedang_disiplin: { judul: 'Sedang menjalani hukuman disiplin', tipe: 'benar_salah', subjek: 'pegawai', sumber: 'siakad', keterangan: 'Ada hukuman disiplin yang masih berlaku hari ini' },
  hari_cuti_tahun_ini: { judul: 'Hari cuti tahun ini', tipe: 'angka', satuan: 'hari', subjek: 'pegawai', sumber: 'siakad', keterangan: 'Jumlah hari cuti yang diajukan/disetujui tahun berjalan' },
  lama_cuti_hari: { judul: 'Lama cuti diajukan', tipe: 'angka', satuan: 'hari', subjek: 'pegawai', sumber: 'konteks', keterangan: 'Dikirim saat pegawai mengajukan cuti' },
  jenis_cuti: {
    judul: 'Jenis cuti',
    tipe: 'pilihan',
    subjek: 'pegawai',
    sumber: 'konteks',
    keterangan: 'Jenis cuti yang diajukan',
    opsi: [
      { nilai: 'TAHUNAN', label: 'Cuti tahunan' },
      { nilai: 'SAKIT', label: 'Cuti sakit' },
      { nilai: 'BESAR', label: 'Cuti besar' },
      { nilai: 'MELAHIRKAN', label: 'Cuti melahirkan' },
    ],
  },
  gelombang_pmb: {
    judul: 'Gelombang pendaftaran',
    tipe: 'pilihan',
    subjek: 'pendaftar',
    sumber: 'siakad',
    keterangan: 'Gelombang PMB tempat pendaftar diterima',
    opsi: [
      { nilai: '1', label: 'Gelombang 1' },
      { nilai: '2', label: 'Gelombang 2' },
      { nilai: '3', label: 'Gelombang 3' },
    ],
  },
  daftar_ulang_lunas: { judul: 'Biaya daftar ulang lunas', tipe: 'benar_salah', subjek: 'pendaftar', sumber: 'siakad', keterangan: 'Tagihan daftar ulang sudah dibayar penuh' },
  berkas_pmb_lengkap: { judul: 'Berkas pendaftaran lengkap', tipe: 'benar_salah', subjek: 'pendaftar', sumber: 'siakad', keterangan: 'Semua berkas wajib PMB sudah diverifikasi' },
  nilai_tes: { judul: 'Nilai tes masuk', tipe: 'angka', subjek: 'pendaftar', sumber: 'siakad', keterangan: 'Nilai tes seleksi (0–100)' },
  peran_akun: {
    judul: 'Jenis akun',
    tipe: 'pilihan',
    subjek: 'akun',
    sumber: 'konteks',
    keterangan: 'Jenis akun yang dibuat',
    opsi: [
      { nilai: 'mahasiswa', label: 'Mahasiswa' },
      { nilai: 'dosen', label: 'Dosen' },
      { nilai: 'tendik', label: 'Tendik' },
      { nilai: 'alumni', label: 'Alumni' },
    ],
  },
};

// Kelompok, unit, satuan, dan contoh (kontrak katalog SIAKAD terbaru).
const UNIT: Record<string, [string, string]> = {
  krs: ['baak', 'Akademik'],
  nilai: ['baak', 'Akademik'],
  ujian: ['baak', 'Akademik'],
  ta: ['fakultas', 'Akademik'],
  kkn: ['lppm', 'Kemahasiswaan'],
  cuti: ['baak', 'Akademik'],
  yudisium: ['baak', 'Kelulusan'],
  wisuda: ['baak', 'Kelulusan'],
  sdm: ['sdm', 'Kepegawaian'],
  pmb: ['pmb', 'PMB'],
  akun: ['pustikom', 'Akun'],
  perpus: ['perpustakaan', 'Umum'],
};
for (const [kode, t] of Object.entries(TITIK_ATURAN)) {
  const [unit, kelompok] = UNIT[kode.split('.')[0]!] ?? ['baak', 'Akademik'];
  t.unit ??= unit;
  t.kelompok ??= kelompok;
}
const KELOMPOK_IND: Record<string, string> = {
  tunggakan: 'Keuangan',
  bayar_syarat_krs: 'Keuangan',
  bayar_syarat_ujian: 'Keuangan',
  persen_bayar_periode: 'Keuangan',
  tagihan_periode_lunas: 'Keuangan',
  dispensasi_keuangan: 'Keuangan',
};
const SATUAN: Record<string, string> = { sks_lulus: 'SKS', sks_diambil: 'SKS', tunggakan: 'Rp', persen_bayar_periode: '%', presensi_persen: '%', poin_kegiatan: 'poin', jumlah_cuti: 'semester' };
for (const [kode, i] of Object.entries(INDIKATOR_ATURAN)) {
  i.kelompok ??=
    i.sumber === 'konteks' ? 'Data dari langkah ini' : (KELOMPOK_IND[kode] ?? { mahasiswa: 'Akademik', pegawai: 'Kepegawaian', pendaftar: 'PMB', akun: 'Akun', umum: 'Umum' }[i.subjek] ?? 'Umum');
  if (SATUAN[kode]) i.satuan ??= SATUAN[kode];
}
INDIKATOR_ATURAN.status_aktif!.tipe = 'pilihan';
INDIKATOR_ATURAN.status_aktif!.opsi = [
  { nilai: 'A', label: 'Aktif' },
  { nilai: 'C', label: 'Cuti' },
  { nilai: 'N', label: 'Non-aktif' },
  { nilai: 'L', label: 'Lulus' },
];
TITIK_ATURAN['kkn.daftar']!.contoh = [
  {
    judul: 'SKS lulus minimal 100 untuk KKN',
    keterangan: 'Mahasiswa sudah menempuh sebagian besar mata kuliah.',
    jenis: 'syarat',
    mode: 'blokir',
    kondisi: {
      semua: [
        { indikator: 'sks_lulus', op: '>=', nilai: 100 },
        { indikator: 'status_aktif', op: '=', nilai: 'A' },
      ],
    },
  },
  { judul: 'Pendaftaran KKN dua minggu', jenis: 'batas_waktu', mode: 'blokir', parameter: { mulai: '2026-12-01', selesai: '2026-12-14' } },
];
TITIK_ATURAN['krs.ambil']!.contoh = [
  {
    judul: 'Batas SKS menurut IPS',
    keterangan: '24 SKS bila IPS ≥ 3,00; 21 bila ≥ 2,50; selain itu 18.',
    jenis: 'batas_nilai',
    mode: 'blokir',
    parameter: {
      target: 'sks_diambil',
      op: '<=',
      tabel: [
        { jika: { semua: [{ indikator: 'ips_lalu', op: '>=', nilai: 3 }] }, nilai: 24 },
        { jika: { semua: [{ indikator: 'ips_lalu', op: '>=', nilai: 2.5 }] }, nilai: 21 },
      ],
      nilai: 18,
    },
  },
  {
    judul: 'Wajib bayar sebelum KRS',
    jenis: 'syarat',
    mode: 'blokir',
    kondisi: {
      salah_satu: [
        { indikator: 'bayar_syarat_krs', op: 'benar' },
        { indikator: 'dispensasi_keuangan', op: 'benar' },
      ],
    },
  },
  { judul: 'Masa kontrak KRS', jenis: 'batas_waktu', mode: 'blokir', parameter: { mulai: '2027-02-01', selesai: '2027-02-14 23:59' } },
];
TITIK_ATURAN['sdm.cuti.ajukan']!.contoh = [
  {
    judul: 'Cuti tahunan minimal masa kerja 1 tahun',
    jenis: 'syarat',
    mode: 'blokir',
    kondisi: {
      semua: [
        { indikator: 'jenis_pegawai', op: '=', nilai: 'dosen' },
        { indikator: 'masa_kerja_tahun', op: '>=', nilai: 1 },
      ],
    },
  },
  { judul: 'Cuti paling lama 12 hari', jenis: 'batas_nilai', mode: 'peringatan', parameter: { target: 'lama_cuti_hari', op: '<=', nilai: 12 } },
];
