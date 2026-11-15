// SDK tiruan untuk situs dokumentasi: instans Siakad asli dengan `fetch` palsu yang membalas data contoh.
// Semua nama dan nomor di sini fiktif.
import { Siakad } from 'unipo-siakad-sdk';

const PRODI = [
  { kode_prodi: '55201', nama_prodi: 'Informatika', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Ilmu Komputer' },
  { kode_prodi: '57201', nama_prodi: 'Sistem Informasi', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Ilmu Komputer' },
  { kode_prodi: '61201', nama_prodi: 'Manajemen', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Ekonomi' },
  { kode_prodi: '62201', nama_prodi: 'Akuntansi', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Ekonomi' },
  { kode_prodi: '54211', nama_prodi: 'Agroteknologi', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Pertanian' },
  { kode_prodi: '74201', nama_prodi: 'Ilmu Hukum', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Hukum' },
  { kode_prodi: '86206', nama_prodi: 'Pendidikan Guru SD', kode_jenjang: 'S1', nama_fakultas: 'Fakultas Keguruan' },
];
const prodiNama = (k: string) => PRODI.find((p) => p.kode_prodi === k)?.nama_prodi ?? '';

const DEPAN = ['Ahmad', 'Siti', 'Rizky', 'Nur', 'Fadli', 'Dewi', 'Moh.', 'Sri', 'Andi', 'Putri', 'Rahmat', 'Wulan', 'Yusuf', 'Indah', 'Fajar', 'Nadia'];
const BELAKANG = ['Hasan', 'Rahmawati', 'Saputra', 'Lamato', 'Dai', 'Pakaya', 'Mohamad', 'Kadir', 'Ismail', 'Daud', 'Puluhulawa', 'Usman', 'Gobel', 'Hulopi'];
const STATUS = [
  ['A', 'Aktif'],
  ['A', 'Aktif'],
  ['A', 'Aktif'],
  ['C', 'Cuti'],
  ['L', 'Lulus'],
  ['N', 'Non-aktif'],
  ['A', 'Aktif'],
  ['D', 'Drop out'],
];
const MAHASISWA = Array.from({ length: 64 }, (_, i) => {
  const p = PRODI[i % PRODI.length];
  const th = String(2025 - (i % 6));
  const [s, sl] = STATUS[i % STATUS.length];
  return {
    nim: `${th.slice(2)}${p.kode_prodi.slice(0, 3)}${String(101 + i).padStart(4, '0')}`,
    nama: `${DEPAN[i % DEPAN.length]} ${BELAKANG[(i * 3) % BELAKANG.length]}`,
    kode_prodi: p.kode_prodi,
    nama_prodi: p.nama_prodi,
    tahun_masuk: th,
    status_aktif: s,
    status_aktif_label: sl,
    kelas: ['R', 'K', 'R', 'D'][i % 4],
    ipk: Math.round((2.6 + ((i * 37) % 140) / 100) * 100) / 100,
    sks_lulus: 20 + ((i * 13) % 120),
  };
});
const JABATAN = ['Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Tenaga pengajar', 'Guru Besar'];
const DOSEN = Array.from({ length: 24 }, (_, i) => {
  const p = PRODI[i % PRODI.length];
  return {
    nidn: `09${String(10 + i).padStart(2, '0')}0${(i * 7) % 10}8${(i * 3) % 10}0${i % 10}`,
    nama: `${DEPAN[(i + 5) % DEPAN.length]} ${BELAKANG[(i * 5 + 2) % BELAKANG.length]}`,
    nama_lengkap: `${i % 3 === 0 ? 'Dr. ' : ''}${DEPAN[(i + 5) % DEPAN.length]} ${BELAKANG[(i * 5 + 2) % BELAKANG.length]}, ${['S.Kom., M.Kom.', 'S.E., M.M.', 'S.H., M.H.', 'S.P., M.Si.'][i % 4]}`,
    kode_prodi: p.kode_prodi,
    nama_prodi: p.nama_prodi,
    jabatan_akademik: JABATAN[i % JABATAN.length],
    status: i % 9 === 4 ? 'T' : 'A',
  };
});
const PEGAWAI = [
  ...DOSEN.slice(0, 10).map((d, i) => ({ id: i + 1, nama: d.nama, nama_lengkap: d.nama_lengkap, jenis: 'dosen', nidn: d.nidn, nip: null, unit_nama: `Prodi ${d.nama_prodi}` })),
  ...['Biro Akademik', 'Biro Keuangan', 'Pustikom', 'Perpustakaan', 'Biro Umum', 'LPPM'].map((u, i) => ({
    id: 20 + i,
    nama: `${DEPAN[(i + 9) % DEPAN.length]} ${BELAKANG[(i * 2 + 1) % BELAKANG.length]}`,
    nama_lengkap: `${DEPAN[(i + 9) % DEPAN.length]} ${BELAKANG[(i * 2 + 1) % BELAKANG.length]}, ${['S.Kom.', 'S.E.', 'A.Md.', 'S.IP.'][i % 4]}`,
    jenis: 'tendik',
    nidn: null,
    nip: `19${80 + i}0${i + 1}1220${10 + i}0${i}100${i}`,
    unit_nama: u,
  })),
].map((p, i) => ({
  ...p,
  kategori: i % 5 === 3 ? 'tidak_tetap' : 'tetap',
  status_aktif: ['aktif', 'aktif', 'aktif', 'cuti', 'aktif', 'tugas_belajar', 'aktif', 'pensiun'][i % 8],
  golongan: ['III/a', 'III/b', 'III/c', 'IV/a'][i % 4],
  serdos: p.jenis === 'dosen' && i % 3 !== 1,
  kode_prodi: p.jenis === 'dosen' ? DOSEN[i]?.kode_prodi : null,
}));
const MK_NAMA = [
  'Algoritma dan Pemrograman',
  'Basis Data',
  'Struktur Data',
  'Pemrograman Web',
  'Jaringan Komputer',
  'Kecerdasan Buatan',
  'Rekayasa Perangkat Lunak',
  'Sistem Operasi',
  'Statistika',
  'Pengantar Manajemen',
  'Akuntansi Dasar',
  'Hukum Perdata',
  'Bahasa Indonesia',
  'Pendidikan Pancasila',
  'Kewirausahaan',
  'Metodologi Penelitian',
];
const MATA_KULIAH = MK_NAMA.map((n, i) => ({
  id: i + 1,
  kode_mk: `${['INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'MKU', 'MNJ', 'AKT', 'HKM', 'MKU', 'MKU', 'MKU', 'MKU'][i]}${100 + i * 7}`,
  nama_mk: n,
  sks_mk: [3, 3, 3, 3, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 3][i],
  semester: (i % 8) + 1,
  kode_prodi: i < 9 ? '55201' : PRODI[i % PRODI.length].kode_prodi,
  sifat: i % 5 === 4 ? 'P' : 'W',
}));
const SEKOLAH = [
  ['20500101', 'SMA Negeri 1 Marisa', 'Pohuwato', 'SMA'],
  ['20500102', 'SMA Negeri 1 Paguat', 'Pohuwato', 'SMA'],
  ['20500103', 'SMK Negeri 1 Marisa', 'Pohuwato', 'SMK'],
  ['20500104', 'MA Negeri 1 Pohuwato', 'Pohuwato', 'MA'],
  ['20500105', 'SMA Negeri 1 Popayato', 'Pohuwato', 'SMA'],
  ['20500106', 'SMK Negeri 1 Taluditi', 'Pohuwato', 'SMK'],
  ['20500201', 'SMA Negeri 1 Gorontalo', 'Kota Gorontalo', 'SMA'],
  ['20500202', 'SMA Negeri 3 Gorontalo', 'Kota Gorontalo', 'SMA'],
  ['20500203', 'SMK Negeri 1 Gorontalo', 'Kota Gorontalo', 'SMK'],
  ['20500301', 'SMA Negeri 1 Limboto', 'Kab. Gorontalo', 'SMA'],
  ['20500401', 'SMA Negeri 1 Tilamuta', 'Boalemo', 'SMA'],
  ['20500501', 'MA Al-Khairaat Marisa', 'Pohuwato', 'MA'],
].map(([kode, nama, kota, jenis]) => ({ kode, nama, kota, jenis }));
const MITRA = [
  'Universitas Negeri Gorontalo',
  'Universitas Gorontalo',
  'Universitas Muhammadiyah Gorontalo',
  'Universitas Hasanuddin',
  'Universitas Sam Ratulangi',
  'Institut Teknologi Bandung',
  'Universitas Gadjah Mada',
  'Universitas Indonesia',
  'Universitas Tadulako',
  'Universitas Halu Oleo',
].map((nama, i) => ({ id: i + 1, nama, kota: ['Gorontalo', 'Gorontalo', 'Gorontalo', 'Makassar', 'Manado', 'Bandung', 'Yogyakarta', 'Depok', 'Palu', 'Kendari'][i] }));
const PT = [
  ['001001', 'Universitas Negeri Gorontalo', 'UNG', 'Gorontalo'],
  ['001002', 'Universitas Gorontalo', 'UG', 'Gorontalo'],
  ['001003', 'Universitas Muhammadiyah Gorontalo', 'UMGo', 'Gorontalo'],
  ['001004', 'Universitas Ichsan Gorontalo', 'UNISAN', 'Gorontalo'],
  ['001005', 'IAIN Sultan Amai Gorontalo', 'IAIN', 'Gorontalo'],
  ['001006', 'Politeknik Gorontalo', 'Poligon', 'Gorontalo'],
  ['001007', 'Universitas Hasanuddin', 'UNHAS', 'Makassar'],
  ['001008', 'Universitas Sam Ratulangi', 'UNSRAT', 'Manado'],
  ['001009', 'Universitas Tadulako', 'UNTAD', 'Palu'],
  ['001010', 'Universitas Gadjah Mada', 'UGM', 'Yogyakarta'],
  ['001011', 'Institut Teknologi Bandung', 'ITB', 'Bandung'],
  ['001012', 'Universitas Indonesia', 'UI', 'Depok'],
].map(([kode, nama, singkatan, kota]) => ({ kode, nama, singkatan, kota, jenis: 'U' }));
const PROVINSI = [
  ['75', 'Gorontalo'],
  ['71', 'Sulawesi Utara'],
  ['72', 'Sulawesi Tengah'],
  ['73', 'Sulawesi Selatan'],
  ['74', 'Sulawesi Tenggara'],
  ['76', 'Sulawesi Barat'],
  ['31', 'DKI Jakarta'],
  ['32', 'Jawa Barat'],
  ['35', 'Jawa Timur'],
  ['64', 'Kalimantan Timur'],
].map(([kode, nama]) => ({ kode, nama }));
const KABUPATEN: Record<string, Array<{ kode: string; nama: string }>> = {
  '75': [
    ['7501', 'Kab. Gorontalo'],
    ['7502', 'Kab. Boalemo'],
    ['7503', 'Kab. Bone Bolango'],
    ['7504', 'Kab. Pohuwato'],
    ['7505', 'Kab. Gorontalo Utara'],
    ['7571', 'Kota Gorontalo'],
  ].map(([kode, nama]) => ({ kode, nama })),
};
const TAHUN = ['20251', '20242', '20241', '20232', '20231'].map((t, i) => ({
  tahun_id: t,
  nama_tahun: `${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1} ${t.endsWith('1') ? 'Ganjil' : 'Genap'}`,
  buka: i === 0 ? 'Y' : 'N',
}));

function cocok(q: string | null, ...vals: unknown[]) {
  if (!q) return true;
  const s = q.toLowerCase();
  return vals.some((v) =>
    String(v ?? '')
      .toLowerCase()
      .includes(s),
  );
}
function halaman<T>(rows: T[], u: URL) {
  const per = Number(u.searchParams.get('per_page') ?? 20);
  const page = Number(u.searchParams.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
}
function eq(u: URL, key: string, val: unknown) {
  const v = u.searchParams.get(key);
  return !v || v.split(',').includes(String(val));
}

// ---------------------------------------------------------------- Arsip
const PERIHAL = [
  'Undangan rapat koordinasi akreditasi',
  'Permohonan data lulusan 2025',
  'Pemberitahuan jadwal monev hibah',
  'Penawaran kerja sama magang',
  'Surat edaran libur semester',
  'Permohonan narasumber seminar nasional',
  'Laporan hasil audit mutu internal',
  'Pengajuan cuti akademik',
  'Undangan wisuda periode II',
  'Permintaan verifikasi ijazah alumni',
  'Pemberitahuan pemadaman listrik',
  'Usulan kenaikan jabatan fungsional',
];
const PENGIRIM = [
  ['Kepala LLDIKTI Wilayah XVI', 'LLDIKTI XVI'],
  ['Dinas Pendidikan Provinsi', 'Pemprov Gorontalo'],
  ['PT Telkom Indonesia', 'Telkom Witel Gorontalo'],
  ['Rektor', 'Universitas Negeri Gorontalo'],
  ['Bupati Pohuwato', 'Pemkab Pohuwato'],
  ['Ketua LPPM', 'Universitas Pohuwato'],
];
const tgl = (n: number) => {
  const d = new Date(2026, 10, 14 - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const STATUS_MASUK = ['baru', 'didisposisi', 'diproses', 'selesai', 'baru', 'diarsipkan', 'didisposisi', 'selesai'];
const STATUS_KELUAR = ['draf', 'review', 'revisi', 'disetujui', 'terkirim', 'terkirim', 'diarsipkan', 'terkirim'];
const SIFAT = ['biasa', 'penting', 'segera', 'biasa', 'sangat_segera', 'biasa', 'penting'];
const SURAT_MASUK = Array.from({ length: 36 }, (_, i) => ({
  id: i + 1,
  uuid: `sm-${i + 1}`,
  arah: 'masuk',
  nomor_agenda: `SM/${String(240 - i).padStart(4, '0')}`,
  nomor_surat: `${100 + i}/UN47/KP/${2026}`,
  tanggal_surat: tgl(i),
  tanggal_diterima: tgl(i),
  perihal: PERIHAL[i % PERIHAL.length],
  pengirim_nama: PENGIRIM[i % PENGIRIM.length][0],
  pengirim_instansi: PENGIRIM[i % PENGIRIM.length][1],
  sifat: SIFAT[i % SIFAT.length],
  keamanan: i % 6 === 5 ? 'terbatas' : 'biasa',
  status: STATUS_MASUK[i % STATUS_MASUK.length],
  batas_waktu: i % 3 === 0 ? tgl(i - 5) : null,
  jumlah_file: i % 4,
}));
const TUJUAN = ['Dekan Fakultas Ilmu Komputer', 'Seluruh dosen tetap', 'Mahasiswa angkatan 2025', 'Kepala LLDIKTI XVI', 'PT Bank Sulutgo', 'Ketua program studi'];
const SURAT_KELUAR = Array.from({ length: 22 }, (_, i) => ({
  id: 100 + i,
  uuid: `sk-${i + 1}`,
  arah: 'keluar',
  nomor_surat: STATUS_KELUAR[i % 8] === 'draf' || STATUS_KELUAR[i % 8] === 'review' ? null : `${300 + i}/UNIPO/R/XI/2026`,
  tanggal_surat: tgl(i * 2),
  perihal: PERIHAL[(i + 4) % PERIHAL.length],
  tujuan_ringkas: TUJUAN[i % TUJUAN.length],
  sifat: SIFAT[(i + 2) % SIFAT.length],
  status: STATUS_KELUAR[i % STATUS_KELUAR.length],
  jumlah_file: (i + 1) % 3,
}));
const JENIS_DOK = ['Ijazah', 'Transkrip nilai', 'SK pengangkatan', 'Sertifikat pendidik', 'Kontrak kerja', 'SK mengajar', 'Sertifikat kompetensi'];
const VERIF = ['terverifikasi', 'diajukan', 'terverifikasi', 'ditolak', 'tidak_perlu', 'terverifikasi'];
const DOKUMEN = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  uuid: `dok-${i + 1}`,
  judul: `${JENIS_DOK[i % JENIS_DOK.length]} ${[...DOSEN, ...DOSEN][i].nama}`,
  jenis_nama: JENIS_DOK[i % JENIS_DOK.length],
  nomor: i % 3 ? `${800 + i}/SK/UNIPO/2026` : null,
  pemilik_jenis: i % 4 === 0 ? 'unit' : 'dosen',
  pemilik_nama: i % 4 === 0 ? 'Biro Kepegawaian' : [...DOSEN, ...DOSEN][i].nama_lengkap,
  tanggal_dokumen: tgl(i * 31),
  berlaku_sampai: i % 5 === 1 ? tgl(-40 - i) : i % 5 === 2 ? tgl(20) : i % 5 === 3 ? tgl(-800) : null,
  akses: ['internal', 'terbatas', 'publik', 'rahasia'][i % 4],
  status_verifikasi: VERIF[i % VERIF.length],
  status_arsip: i % 7 === 6 ? 'inaktif' : 'aktif',
}));
const BERKAS = [
  'Akreditasi Prodi Informatika',
  'Kerja sama dengan Pemkab Pohuwato',
  'Penerimaan mahasiswa baru 2026',
  'Hibah penelitian dosen pemula',
  'Pengadaan laboratorium komputer',
  'Wisuda periode I',
  'Audit mutu internal',
  'Rekrutmen dosen tetap',
].map((judul, i) => ({
  id: i + 1,
  nomor_berkas: `B-${String(i + 1).padStart(3, '0')}/2026`,
  judul,
  uraian: ['Dokumen borang, LKPS, dan bukti pendukung', 'MoU, PKS, dan laporan pelaksanaan', 'SK panitia dan laporan hasil seleksi', null][i % 4],
  tahun_awal: 2026 - (i % 3),
  tahun_akhir: 2026,
  status: i % 3 === 2 ? 'ditutup' : 'terbuka',
  status_arsip: i % 4 === 3 ? 'inaktif' : 'aktif',
  jumlah_surat: 3 + i * 2,
  jumlah_dokumen: i + 1,
}));
const antara = (u: URL, v?: string | null) =>
  (!u.searchParams.get('dari') || (v ?? '') >= u.searchParams.get('dari')!) && (!u.searchParams.get('sampai') || (v ?? '') <= u.searchParams.get('sampai')!);

const ROUTES: Array<[RegExp, (u: URL, init?: RequestInit) => unknown]> = [
  [
    /\/v1\/infra\/status$/,
    () => ({
      data: {
        status: 'sebagian_terganggu',
        diperbarui_at: new Date().toISOString(),
        layanan: [
          { kode: 'siakad', nama: 'SIAKAD', jenis: 'monolith', status: 'sehat', latensi_ms: 182, diperiksa_at: '2026-11-15 13:40:00', berubah_at: '2026-11-10 08:00:00', uptime_24j: 100 },
          { kode: 'sso', nama: 'Login SSO', jenis: 'layanan', status: 'sehat', latensi_ms: 95, diperiksa_at: '2026-11-15 13:40:00', berubah_at: '2026-11-12 21:15:00', uptime_24j: 99.7 },
          { kode: 'lms', nama: 'LMS e-learning', jenis: 'layanan', status: 'terganggu', latensi_ms: 2350, diperiksa_at: '2026-11-15 13:40:00', berubah_at: '2026-11-15 13:20:00', uptime_24j: 98.6 },
          { kode: 'pmb', nama: 'PMB online', jenis: 'frontend', status: 'sehat', latensi_ms: 140, diperiksa_at: '2026-11-15 13:40:00', berubah_at: '2026-11-14 07:30:00', uptime_24j: 100 },
        ],
      },
    }),
  ],
  [/\/v1\/health$/, () => ({ data: { status: 'ok', database: 'ok', waktu_server: new Date().toISOString() } })],
  [
    /\/v1\/integrasi\/status$/,
    () => ({
      data: {
        captcha: { aktif: true, penyedia: 'turnstile', driver: 'turnstile' },
        pembayaran: { aktif: true, penyedia: 'midtrans', driver: 'midtrans', mode: 'sandbox' },
        penyimpanan: null,
        cache: { aktif: true, penyedia: 'redis', driver: 'redis' },
        email: { aktif: true, penyedia: 'smtp', driver: 'smtp' },
        whatsapp: null,
        rapat: null,
      },
    }),
  ],
  [/\/v1\/referensi\/prodi$/, () => ({ data: PRODI })],
  [/\/v1\/referensi\/tahun-akademik$/, () => ({ data: TAHUN })],
  [
    /\/v1\/mahasiswa$/,
    (u) =>
      halaman(
        MAHASISWA.filter(
          (m) => cocok(u.searchParams.get('q'), m.nim, m.nama) && eq(u, 'prodi', m.kode_prodi) && eq(u, 'angkatan', m.tahun_masuk) && eq(u, 'status', m.status_aktif) && eq(u, 'kelas', m.kelas),
        ),
        u,
      ),
  ],
  [
    /\/v1\/dosen$/,
    (u) =>
      halaman(
        DOSEN.filter((d) => cocok(u.searchParams.get('q'), d.nidn, d.nama) && eq(u, 'prodi', d.kode_prodi) && eq(u, 'status', d.status)),
        u,
      ),
  ],
  [
    /\/v1\/sdm\/pegawai$/,
    (u) =>
      halaman(
        PEGAWAI.filter(
          (p) =>
            cocok(u.searchParams.get('q'), p.nama, p.nip, p.nidn) &&
            eq(u, 'jenis', p.jenis) &&
            eq(u, 'kategori', p.kategori) &&
            eq(u, 'status_aktif', p.status_aktif) &&
            eq(u, 'kode_prodi', p.kode_prodi) &&
            (!u.searchParams.get('serdos') || p.serdos),
        ),
        u,
      ),
  ],
  [
    /\/v1\/arsip\/surat-masuk$/,
    (u) =>
      halaman(
        SURAT_MASUK.filter(
          (r) =>
            cocok(u.searchParams.get('q'), r.perihal, r.nomor_surat, r.pengirim_nama) &&
            eq(u, 'status', r.status) &&
            eq(u, 'sifat', r.sifat) &&
            eq(u, 'keamanan', r.keamanan) &&
            antara(u, r.tanggal_surat) &&
            (!u.searchParams.get('perlu_tindakan') || ['baru', 'didisposisi'].includes(r.status)) &&
            (!u.searchParams.get('lewat_batas') || (r.batas_waktu != null && r.batas_waktu < tgl(0))),
        ),
        u,
      ),
  ],
  [
    /\/v1\/arsip\/surat-keluar$/,
    (u, init) =>
      init?.method === 'POST'
        ? (() => {
            // Konsep surat baru dari wizard BuatSuratDariTemplat (isi dari templat sudah diisi di browser).
            const b = JSON.parse(String(init.body ?? '{}'));
            return { __status: 201, data: { id: 900 + Math.floor(Math.random() * 99), uuid: crypto.randomUUID(), status: 'draf', nomor_surat: null, ...b } };
          })()
        : halaman(
            SURAT_KELUAR.filter(
              (r) =>
                cocok(u.searchParams.get('q'), r.perihal, r.nomor_surat, r.tujuan_ringkas) &&
                eq(u, 'status', r.status) &&
                eq(u, 'sifat', r.sifat) &&
                antara(u, r.tanggal_surat) &&
                (!u.searchParams.get('perlu_tindakan') || r.status === 'review'),
            ),
            u,
          ),
  ],
  [
    /\/v1\/arsip\/dokumen$/,
    (u) =>
      halaman(
        DOKUMEN.filter(
          (r) =>
            cocok(u.searchParams.get('q'), r.judul, r.nomor) &&
            eq(u, 'pemilik_jenis', r.pemilik_jenis) &&
            eq(u, 'status_verifikasi', r.status_verifikasi) &&
            eq(u, 'status_arsip', r.status_arsip) &&
            eq(u, 'akses', r.akses),
        ),
        u,
      ),
  ],
  [
    /\/v1\/arsip\/berkas$/,
    (u) =>
      halaman(
        BERKAS.filter((r) => cocok(u.searchParams.get('q'), r.judul, r.nomor_berkas) && eq(u, 'status', r.status) && eq(u, 'status_arsip', r.status_arsip) && eq(u, 'tahun', r.tahun_awal)),
        u,
      ),
  ],
  [
    /\/v1\/mata-kuliah$/,
    (u) =>
      halaman(
        MATA_KULIAH.filter((m) => cocok(u.searchParams.get('q'), m.kode_mk, m.nama_mk) && eq(u, 'prodi', m.kode_prodi) && eq(u, 'semester', m.semester)),
        u,
      ),
  ],
  [/\/v1\/pmb\/info\/sekolah$/, (u) => ({ data: SEKOLAH.filter((s) => cocok(u.searchParams.get('q'), s.nama, s.kota)).slice(0, 10) })],
  [/\/v1\/pmb\/info\/perguruan-tinggi$/, (u) => ({ data: PT.filter((p) => cocok(u.searchParams.get('q'), p.nama, p.singkatan, p.kode)).slice(0, 20) })],
  [
    /\/v1\/kerjasama\/mitra$/,
    (u) =>
      halaman(
        MITRA.filter((m) => cocok(u.searchParams.get('q'), m.nama, m.kota)),
        u,
      ),
  ],
  [/\/v1\/tracer\/referensi\/wilayah$/, (u) => ({ data: u.searchParams.get('propinsi') ? (KABUPATEN[u.searchParams.get('propinsi')!] ?? []) : PROVINSI })],
];

/** Rute tambahan dari halaman demo lain (tabel, status layanan, kalender, …). */
export function tambahRute(pola: RegExp, balas: (u: URL, init?: RequestInit) => unknown) {
  ROUTES.unshift([pola, balas]);
}
/** Balasan untuk path yang tidak punya rute khusus (mis. server tiruan dari katalog). */
let cadangan: ((u: URL, init?: RequestInit) => unknown) | null = null;
export function setelCadangan(fn: (u: URL, init?: RequestInit) => unknown) {
  cadangan = fn;
}
export { MAHASISWA, DOSEN, PEGAWAI, MATA_KULIAH, PRODI };

export const mockFetch: typeof fetch = async (input, init) => {
  const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
  if (init?.signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
  const route = ROUTES.find(([re]) => re.test(u.pathname));
  const balas = route?.[1] ?? cadangan;
  if (!balas) return new Response(JSON.stringify({ error: { message: `Contoh belum ada untuk ${u.pathname}` } }), { status: 404, headers: { 'content-type': 'application/json' } });
  const out = (await balas(u, init)) as { __status?: number; __mentah?: Uint8Array<ArrayBuffer> } & Record<string, unknown>;
  if (out?.__mentah) return new Response(out.__mentah, { status: 200, headers: { 'content-type': 'application/octet-stream' } });
  const { __status = 200, ...body } = out ?? {};
  return new Response(JSON.stringify(body), { status: __status, headers: { 'content-type': 'application/json' } });
};

export const siakadDemo = new Siakad({ baseUrl: 'https://api.unipo.ac.id', accessToken: 'token-demo', fetch: mockFetch });
