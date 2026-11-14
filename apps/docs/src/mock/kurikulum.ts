// Data contoh Kurikulum OBE (/v1/kurikulum-obe). Bentuk mengikuti respons API SIAKAD; isi rekaan.
import { PRODI, tambahRute } from './siakad';

const K = '/v1/kurikulum-obe';
let statusKur = 'diajukan';

const MK: Array<[string, string, number, number | null, string]> = [
  ['IF101', 'Algoritma dan Pemrograman', 4, 1, 'A'],
  ['IF102', 'Matematika Diskrit', 3, 1, 'A'],
  ['IF103', 'Pengantar Teknologi Informasi', 2, 1, 'A'],
  ['MKU01', 'Pendidikan Agama', 2, 1, 'W'],
  ['MKU02', 'Pancasila', 2, 1, 'W'],
  ['IF104', 'Kalkulus', 3, 1, 'A'],
  ['IF201', 'Struktur Data', 4, 2, 'A'],
  ['IF202', 'Sistem Digital', 3, 2, 'A'],
  ['IF203', 'Aljabar Linear', 3, 2, 'A'],
  ['MKU03', 'Kewarganegaraan', 2, 2, 'W'],
  ['MKU04', 'Bahasa Indonesia', 2, 2, 'W'],
  ['IF204', 'Statistika', 3, 2, 'A'],
  ['IF301', 'Basis Data', 4, 3, 'A'],
  ['IF302', 'Pemrograman Berorientasi Objek', 4, 3, 'A'],
  ['IF303', 'Arsitektur Komputer', 3, 3, 'A'],
  ['IF304', 'Interaksi Manusia dan Komputer', 3, 3, 'A'],
  ['IF305', 'Probabilitas', 3, 3, 'A'],
  ['IF306', 'Etika Profesi', 2, 3, 'A'],
  ['IF307', 'Bahasa Inggris Teknik', 2, 3, 'A'],
  ['IF308', 'Komputasi Numerik', 3, 3, 'A'],
  ['IF401', 'Rekayasa Perangkat Lunak', 3, 4, 'A'],
  ['IF402', 'Jaringan Komputer', 4, 4, 'A'],
  ['IF403', 'Sistem Operasi', 3, 4, 'A'],
  ['IF404', 'Kecerdasan Buatan', 3, 4, 'A'],
  ['IF501', 'Pemrograman Web', 4, 5, 'A'],
  ['IF502', 'Pembelajaran Mesin', 3, 5, 'C'],
  ['IF503', 'Keamanan Informasi', 3, 5, 'A'],
  ['IF601', 'Pemrograman Perangkat Bergerak', 3, 6, 'C'],
  ['IF602', 'Metodologi Penelitian', 2, 6, 'A'],
  ['IF701', 'Kerja Praktik / Magang', 4, 7, 'A'],
  ['IF702', 'Kuliah Kerja Nyata', 4, 7, 'A'],
  ['IF801', 'Skripsi', 6, 8, 'S'],
  ['IFP01', 'Komputasi Awan', 3, null, 'B'],
  ['IFP02', 'Visualisasi Data', 3, null, 'B'],
  ['IFP03', 'Internet of Things', 3, null, 'B'],
];
const CPL: Array<[string, string, string]> = [
  ['CPL1', 'sikap', 'Bertakwa kepada Tuhan Yang Maha Esa dan menunjukkan sikap religius'],
  ['CPL2', 'sikap', 'Menginternalisasi nilai, norma, dan etika akademik serta profesi'],
  ['CPL3', 'pengetahuan', 'Menguasai konsep teoretis matematika diskrit, algoritma, dan struktur data'],
  ['CPL4', 'pengetahuan', 'Menguasai konsep arsitektur komputer, sistem operasi, dan jaringan'],
  ['CPL5', 'pengetahuan', 'Menguasai prinsip rekayasa perangkat lunak dan basis data'],
  ['CPL6', 'keterampilan_umum', 'Mampu menerapkan pemikiran logis, kritis, dan sistematis dalam konteks keilmuan'],
  ['CPL7', 'keterampilan_umum', 'Mampu bekerja sama dan mengomunikasikan hasil kerja secara lisan dan tertulis'],
  ['CPL8', 'keterampilan_khusus', 'Mampu merancang dan membangun perangkat lunak yang andal dan aman'],
  ['CPL9', 'keterampilan_khusus', 'Mampu menerapkan kecerdasan buatan dan analisis data untuk masalah nyata'],
  ['CPL10', 'keterampilan_khusus', 'Mampu merancang dan mengelola infrastruktur jaringan dan komputasi awan'],
];
const PROFIL = [
  { id: 1, kode: 'PL1', nama: 'Pengembang perangkat lunak', deskripsi: 'Merancang, membangun, dan memelihara aplikasi web dan bergerak.' },
  { id: 2, kode: 'PL2', nama: 'Analis data', deskripsi: 'Mengolah data menjadi informasi dan model prediksi.' },
  { id: 3, kode: 'PL3', nama: 'Administrator jaringan', deskripsi: 'Mengelola infrastruktur jaringan dan layanan awan.' },
  { id: 4, kode: 'PL4', nama: 'Wirausaha teknologi', deskripsi: 'Membangun usaha rintisan berbasis teknologi informasi.' },
];
const BK = ['Algoritma & pemrograman', 'Matematika komputasi', 'Sistem & jaringan', 'Rekayasa perangkat lunak', 'Data & kecerdasan', 'Etika & profesi'].map((nama, i) => ({
  id: 21 + i,
  kode: `BK${i + 1}`,
  nama,
}));

const mkId = (i: number) => 1001 + i;
const cplId = (i: number) => 101 + i;
// Pemetaan CPL → MK (indeks MK). CPL1 sengaja hanya MK umum.
const CPL_MK: number[][] = [[3], [17, 4, 9], [0, 1, 6, 8], [7, 14, 21, 22], [12, 13, 20], [0, 1, 11, 16, 19], [18, 28, 29, 30], [12, 13, 20, 24, 27, 26], [23, 25, 11, 33], [21, 32, 34]];
const cplMk = CPL_MK.flatMap((mks, c) => mks.map((m) => ({ cpl_id: cplId(c), mk_id: mkId(m), bobot: 1 })));
const RPS_DISAHKAN = new Set([0, 1, 2, 6, 7, 12, 13, 20, 21, 24]);

const daftarMk = () =>
  MK.map(([kode, nama, sks, semester, jenis], i) => ({
    id: mkId(i),
    kurikulum_id: 12,
    kode_mk: kode,
    nama,
    sks,
    semester,
    jenis,
    jumlah_cpmk: RPS_DISAHKAN.has(i) ? 3 : i % 3,
    cpl: cplMk.filter((x) => x.mk_id === mkId(i)).map((x) => CPL[x.cpl_id - 101]![0]),
    prasyarat: i === 6 ? ['IF101'] : [],
    deskripsi: i === 12 ? 'Mata kuliah ini membahas perancangan basis data relasional, normalisasi, SQL, transaksi, dan pengenalan basis data NoSQL.' : null,
    status_rps: RPS_DISAHKAN.has(i) ? 'disahkan' : i % 4 === 0 ? 'draf' : null,
  }));

const KURIKULUM = [
  {
    id: 12,
    kode_prodi: '55201',
    nama_prodi: 'Informatika',
    kode_jenjang: 'C',
    kode: 'K2025',
    nama: 'Kurikulum OBE Informatika 2025',
    versi: 1,
    sumber: 'migrasi',
    tahun_berlaku: 2025,
    tahun_id_mulai: '20251',
    sks_lulus: 144,
    jumlah_mk: MK.length,
    total_sks_mk: MK.reduce((a, m) => a + m[2], 0),
    jumlah_cpl: CPL.length,
  },
  {
    id: 9,
    kode_prodi: '55201',
    nama_prodi: 'Informatika',
    kode_jenjang: 'C',
    kode: 'K2020',
    nama: 'Kurikulum Informatika 2020 (MBKM)',
    versi: 2,
    sumber: 'migrasi',
    tahun_berlaku: 2020,
    status: 'berlaku',
    sks_lulus: 144,
    jumlah_mk: 58,
    total_sks_mk: 146,
    jumlah_cpl: 9,
  },
  {
    id: 14,
    kode_prodi: '57201',
    nama_prodi: 'Sistem Informasi',
    kode_jenjang: 'C',
    kode: 'K2025',
    nama: 'Kurikulum OBE Sistem Informasi 2025',
    versi: 1,
    sumber: 'baru',
    tahun_berlaku: 2025,
    status: 'draf',
    sks_lulus: 144,
    jumlah_mk: 21,
    total_sks_mk: 63,
    jumlah_cpl: 6,
  },
];

tambahRute(new RegExp(`${K}/kurikulum$`), () => ({ data: KURIKULUM.map((k) => ({ ...k, status: k.id === 12 ? statusKur : (k.status ?? 'draf') })), meta: { total: KURIKULUM.length } }));
tambahRute(new RegExp(`${K}/kurikulum/\\d+$`), () => {
  const mk = daftarMk();
  return {
    data: {
      ...KURIKULUM[0],
      status: statusKur,
      regulasi: 'Permendiktisaintek No. 39 Tahun 2025',
      no_sk: statusKur === 'disahkan' || statusKur === 'berlaku' ? '112/UNIPO/SK/XI/2026' : null,
      masa_tempuh: 8,
      jenjang: { nama: 'S1/Sarjana', sks_min: 144, masa_tempuh: 8, batas_semester: true },
      ringkasan: {
        profil_lulusan: PROFIL.length,
        cpl: CPL.length,
        bahan_kajian: BK.length,
        mata_kuliah: mk.length,
        sks_wajib_mk: mk.filter((m) => !['B', 'D'].includes(m.jenis)).reduce((a, m) => a + m.sks, 0),
        sks_pilihan_mk: mk.filter((m) => ['B', 'D'].includes(m.jenis)).reduce((a, m) => a + m.sks, 0),
        cpmk: 64,
        mk_dengan_rps_disahkan: RPS_DISAHKAN.size,
      },
      angkatan: [2025, 2026],
      transisi_status: { draf: ['diajukan'], diajukan: ['draf', 'disahkan'], disahkan: ['berlaku', 'draf'], berlaku: ['arsip'], arsip: [] }[statusKur],
    },
  };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+/status$`), (_u, init) => {
  statusKur = (JSON.parse(String(init?.body ?? '{}')) as { status: string }).status;
  return { data: { ...KURIKULUM[0], status: statusKur } };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+/mk$`), () => ({ data: daftarMk() }));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/cpl$`), () => ({
  data: CPL.map(([kode, ranah, deskripsi], i) => ({
    id: cplId(i),
    kurikulum_id: 12,
    kode,
    ranah,
    deskripsi,
    target: 70,
    sumber: i < 2 ? 'sn_dikti' : i > 6 ? 'asosiasi' : 'prodi',
    mata_kuliah: cplMk.filter((x) => x.cpl_id === cplId(i)).map((x) => ({ mk_id: x.mk_id, kode_mk: MK[x.mk_id - 1001]![0], nama: MK[x.mk_id - 1001]![1], bobot: 1 })),
  })),
}));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/profil-lulusan$`), () => ({ data: PROFIL }));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/bahan-kajian$`), () => ({ data: BK }));
const matriks: Record<'profil-cpl' | 'cpl-bk' | 'cpl-mk' | 'bk-mk', Array<Record<string, number>>> = {
  'profil-cpl': [
    [1, [1, 2, 3, 5, 6, 7, 8]],
    [2, [1, 2, 3, 6, 7, 9]],
    [3, [1, 2, 4, 6, 7, 10]],
    [4, [1, 2, 6, 7, 8]],
  ].flatMap(([p, cs]) => (cs as number[]).map((c) => ({ profil_id: p as number, cpl_id: cplId(c - 1) }))),
  'cpl-bk': [
    [3, [1, 2]],
    [4, [3]],
    [5, [4]],
    [6, [1, 2]],
    [8, [1, 4]],
    [9, [5]],
    [10, [3]],
    [2, [6]],
  ].flatMap(([c, bs]) => (bs as number[]).map((b) => ({ cpl_id: cplId((c as number) - 1), bk_id: 20 + b }))),
  'cpl-mk': cplMk,
  'bk-mk': [],
};
tambahRute(new RegExp(`${K}/kurikulum/\\d+/matriks$`), () => ({ data: matriks }));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/matriks/[a-z-]+$`), (u, init) => {
  const nama = u.pathname.split('/').pop() as keyof typeof matriks;
  const body = JSON.parse(String(init?.body ?? '{}')) as { tambah?: Array<Record<string, number>>; hapus?: Array<Record<string, number>> };
  const sama = (a: Record<string, number>, b: Record<string, number>) => Object.keys(b).every((k) => a[k] === b[k]);
  matriks[nama] = [...matriks[nama].filter((x) => !(body.hapus ?? []).some((h) => sama(x, h))), ...(body.tambah ?? [])];
  return { data: matriks[nama] };
});
tambahRute(new RegExp(`${K}/kurikulum/\\d+/validasi$`), () => ({
  data: {
    ringkasan: {
      galat: 1,
      peringatan: 3,
      info: 2,
      regulasi: 'Permendiktisaintek No. 39 Tahun 2025',
      jenjang: 'S1/Sarjana',
      sks_wajib_mk: 98,
      sks_pilihan_mk: 9,
      jumlah_mk: MK.length,
      jumlah_cpl: CPL.length,
      kelengkapan_persen: 82,
      siap_disahkan: false,
    },
    temuan: [
      { tingkat: 'galat', kode: 'SKS_KURANG', pesan: 'Total SKS wajib dan pilihan (107) kurang dari SKS minimal jenjang S1 (144).', pasal: 'Pasal 18 ayat (2)' },
      { tingkat: 'peringatan', kode: 'RPS_BELUM', pesan: '25 mata kuliah belum punya RPS yang disahkan.', pasal: 'Pasal 12' },
      { tingkat: 'peringatan', kode: 'MK_TANPA_CPL', pesan: 'MK IF103, MKU02, MKU04 belum dipetakan ke CPL mana pun.', pasal: null },
      { tingkat: 'peringatan', kode: 'BK_MK_KOSONG', pesan: 'Matriks bahan kajian × mata kuliah belum diisi.', pasal: null },
      { tingkat: 'info', kode: 'TA_ADA', pesan: 'Tugas akhir (IF801 Skripsi, 6 SKS) tersedia.', pasal: 'Pasal 18 ayat (4)' },
      { tingkat: 'info', kode: 'MAGANG', pesan: 'Kerja praktik/magang dapat ditempuh di luar prodi.', pasal: 'Pasal 15' },
    ],
  },
}));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/capaian$`), (u) => ({
  data: {
    kurikulum_id: 12,
    angkatan: Number(u.searchParams.get('angkatan') ?? 2022),
    metode: 'rata_rata_berbobot',
    cpl: CPL.map(([kode, ranah, deskripsi], i) => {
      const r = [84, 79, 72.5, 64.8, 71.2, 76.4, 81.3, 68.9, 62.1, 73.6][i]!;
      return {
        cpl_id: cplId(i),
        kode,
        ranah,
        deskripsi,
        target: 70,
        jumlah_mk: CPL_MK[i]!.length,
        jumlah_mahasiswa: 148,
        rata_rata: r,
        persen_tercapai: Math.round(Math.min(98, r + 6 - (70 - r) * 0.8)),
      };
    }),
  },
}));
tambahRute(new RegExp(`${K}/capaian/mahasiswa/[^/]+$`), (u) => ({
  data: {
    mahasiswa: { nim: decodeURIComponent(u.pathname.split('/').pop()!), nama: 'Nurul Fadilah', kode_prodi: '55201', angkatan: 2023 },
    kurikulum: { id: 12, kode: 'K2025', nama: 'Kurikulum OBE Informatika 2025', status: 'berlaku' },
    cpl: CPL.map(([kode, ranah, deskripsi], i) => {
      const nilai = i === 9 ? null : [88, 85, 78.5, 66, 74, 81, 86, 72.5, 64][i]!;
      const mk = CPL_MK[i]!.map((m, j) => ({
        mk_id: mkId(m),
        kode_mk: MK[m]![0],
        nama: MK[m]![1],
        bobot: 1,
        nilai: MK[m]![3] && MK[m]![3]! <= 6 && j < 3 && nilai != null ? Math.round(nilai + (j - 1) * 4) : null,
      }));
      return {
        cpl_id: cplId(i),
        kode,
        ranah,
        deskripsi,
        target: 70,
        nilai,
        tercapai: nilai == null ? null : nilai >= 70,
        mk_sudah_dinilai: mk.filter((x) => x.nilai != null).length,
        mk_total: mk.length,
        mata_kuliah: mk,
      };
    }),
  },
}));
tambahRute(new RegExp(`${K}/mk/\\d+$`), (u) => ({
  data: {
    ...(daftarMk().find((m) => String(m.id) === u.pathname.split('/').pop()) ?? daftarMk()[12]),
    modalitas: 'bauran',
    cpmk: [
      {
        id: 301,
        kode: 'CPMK1',
        deskripsi: 'Mampu merancang model data konseptual dan logis dari kebutuhan bisnis',
        cpl: [
          { cpl_id: 105, kode: 'CPL5', bobot: 0.6 },
          { cpl_id: 108, kode: 'CPL8', bobot: 0.4 },
        ],
        sub_cpmk: [
          { id: 401, kode: 'Sub-CPMK1.1', deskripsi: 'Menyusun diagram ER dari studi kasus', indikator: 'Entitas, relasi, kardinalitas tepat' },
          { id: 402, kode: 'Sub-CPMK1.2', deskripsi: 'Mentransformasi diagram ER ke skema relasional' },
        ],
      },
      {
        id: 302,
        kode: 'CPMK2',
        deskripsi: 'Mampu menormalisasi skema hingga bentuk normal ketiga',
        cpl: [{ cpl_id: 105, kode: 'CPL5', bobot: 1 }],
        sub_cpmk: [{ id: 403, kode: 'Sub-CPMK2.1', deskripsi: 'Mengidentifikasi ketergantungan fungsional' }],
      },
      {
        id: 303,
        kode: 'CPMK3',
        deskripsi: 'Mampu menulis kueri SQL dan mengelola transaksi',
        cpl: [{ cpl_id: 108, kode: 'CPL8', bobot: 1 }],
        sub_cpmk: [
          { id: 404, kode: 'Sub-CPMK3.1', deskripsi: 'Menulis kueri gabungan, agregasi, dan subkueri' },
          { id: 405, kode: 'Sub-CPMK3.2', deskripsi: 'Menerapkan transaksi dan indeks' },
        ],
      },
    ],
  },
}));
tambahRute(new RegExp(`${K}/rps/\\d+$`), () => ({
  data: {
    id: 501,
    mk_id: 1013,
    versi: 2,
    status: 'disahkan',
    disahkan_at: '2026-08-12 10:00:00',
    tahun_id: '20261',
    deskripsi: 'Perancangan dan implementasi basis data relasional untuk sistem informasi, dari pemodelan hingga kueri dan transaksi.',
    dosen_pengampu: ['Rahmat Hidayat, M.Kom', 'Sri Wahyuni, M.T.'],
    pustaka_utama: ['Elmasri & Navathe. Fundamentals of Database Systems, 7th ed.', 'Silberschatz dkk. Database System Concepts, 7th ed.'],
    mata_kuliah: { kode_mk: 'IF301', nama: 'Basis Data', sks: 4, semester: 3 },
    cpmk: [
      {
        id: 301,
        kode: 'CPMK1',
        deskripsi: 'Merancang model data konseptual dan logis',
        sub_cpmk: [
          { id: 401, kode: 'S1.1', deskripsi: '' },
          { id: 402, kode: 'S1.2', deskripsi: '' },
        ],
      },
      { id: 302, kode: 'CPMK2', deskripsi: 'Menormalisasi skema hingga 3NF', sub_cpmk: [{ id: 403, kode: 'S2.1', deskripsi: '' }] },
      {
        id: 303,
        kode: 'CPMK3',
        deskripsi: 'Menulis kueri SQL dan mengelola transaksi',
        sub_cpmk: [
          { id: 404, kode: 'S3.1', deskripsi: '' },
          { id: 405, kode: 'S3.2', deskripsi: '' },
        ],
      },
    ],
    pertemuan: [
      { pertemuan_ke: 1, sub_cpmk_id: 401, materi: 'Konsep basis data dan DBMS', metode: 'Kuliah, diskusi', modalitas: 'luring' },
      { pertemuan_ke: 2, sampai_ke: 3, sub_cpmk_id: 401, materi: 'Diagram ER', indikator: 'Entitas, relasi, kardinalitas tepat', metode: 'Studi kasus', modalitas: 'luring', bobot: 5 },
      { pertemuan_ke: 4, sub_cpmk_id: 402, materi: 'Transformasi ER ke relasional', metode: 'Praktikum', modalitas: 'luring', bobot: 5 },
      { pertemuan_ke: 5, sampai_ke: 6, sub_cpmk_id: 403, materi: 'Ketergantungan fungsional dan normalisasi', metode: 'Kuliah, latihan', modalitas: 'bauran', bobot: 10 },
      { pertemuan_ke: 7, sub_cpmk_id: 403, materi: 'Proyek perancangan (tahap 1)', metode: 'Proyek kelompok', modalitas: 'daring', bobot: 10 },
      { pertemuan_ke: 8, materi: 'Ujian tengah semester', ujian: true, bobot: 20 },
      { pertemuan_ke: 9, sampai_ke: 11, sub_cpmk_id: 404, materi: 'SQL: DDL, DML, join, agregasi, subkueri', metode: 'Praktikum', modalitas: 'luring', bobot: 10 },
      { pertemuan_ke: 12, sampai_ke: 13, sub_cpmk_id: 405, materi: 'Transaksi, konkurensi, dan indeks', metode: 'Kuliah, praktikum', modalitas: 'luring', bobot: 5 },
      { pertemuan_ke: 14, sampai_ke: 15, sub_cpmk_id: 405, materi: 'Proyek perancangan (tahap 2) dan presentasi', metode: 'Proyek kelompok', modalitas: 'bauran', bobot: 10 },
      { pertemuan_ke: 16, materi: 'Ujian akhir semester', ujian: true, bobot: 25 },
    ],
    evaluasi: [
      { jenis_evaluasi: 1, nama: 'Partisipasi', bobot: 10, komponen_siakad: 'Harian' },
      { jenis_evaluasi: 2, nama: 'Proyek', bobot: 25, komponen_siakad: 'Tugas' },
      { jenis_evaluasi: 3, nama: 'Tugas & kuis', bobot: 20, komponen_siakad: 'HDR' },
      { jenis_evaluasi: 4, nama: 'UTS', bobot: 20, komponen_siakad: 'UTS' },
      { jenis_evaluasi: 4, nama: 'UAS', bobot: 25, komponen_siakad: 'UAS' },
    ],
    total_bobot_evaluasi: 100,
  },
}));
tambahRute(new RegExp(`${K}/migrasi/status$`), () => ({
  data: PRODI.map((p, i) => ({
    kode_prodi: p.kode_prodi,
    nama_prodi: p.nama_prodi,
    jenjang: 'S1/Sarjana',
    tahap: (['4_diterbitkan', '2_dilengkapi', '3_disahkan', '2_dilengkapi', '1_belum', '3_disahkan', '1_belum'] as const)[i],
    lama: { jumlah_semester: 14 - i, semester_terakhir: '20252', mk_semester_terakhir: 58 - i * 3 },
    impor_terakhir: i === 4 || i === 6 ? null : { tahun_id: '20252', waktu: '2026-11-10 09:00:00' },
    terbit_terakhir: i === 0 ? { tahun_id: '20261', waktu: '2026-11-12 14:00:00' } : null,
  })),
}));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/ekuivalensi$`), () => ({
  data: [
    { id: 1, kode_mk_lama: 'TI101', nama_mk_lama: 'Algoritma Pemrograman I', sks_lama: 3, kode_mk: 'IF101', nama_mk: 'Algoritma dan Pemrograman', sks_mk: 4, jenis: 'gabung' },
    { id: 2, kode_mk_lama: 'TI102', nama_mk_lama: 'Algoritma Pemrograman II', sks_lama: 3, kode_mk: 'IF101', nama_mk: 'Algoritma dan Pemrograman', sks_mk: 4, jenis: 'gabung' },
    { id: 3, kode_mk_lama: 'TI210', nama_mk_lama: 'Basis Data', sks_lama: 4, kode_mk: 'IF301', nama_mk: 'Basis Data', sks_mk: 4, jenis: 'setara' },
    { id: 4, kode_mk_lama: 'TI305', nama_mk_lama: 'Pemrograman Web dan Mobile', sks_lama: 6, kode_mk: 'IF501', nama_mk: 'Pemrograman Web', sks_mk: 4, jenis: 'pecah' },
    { id: 5, kode_mk_lama: 'TI305', nama_mk_lama: 'Pemrograman Web dan Mobile', sks_lama: 6, kode_mk: 'IF601', nama_mk: 'Pemrograman Perangkat Bergerak', sks_mk: 3, jenis: 'pecah' },
    { id: 6, kode_mk_lama: 'TI150', nama_mk_lama: 'Aplikasi Perkantoran', sks_lama: 2, kode_mk: null, nama_mk: null, sks_mk: null, jenis: 'dihapus', catatan: 'Materi masuk ke IF103' },
  ],
}));
tambahRute(new RegExp(`${K}/kurikulum/\\d+/peninjauan$`), () => ({
  data: [
    { id: 3, jenis: 'masukan_pemangku', judul: 'Lokakarya bersama mitra industri dan alumni', tanggal: '2026-10-21', pelaksana: 'Prodi Informatika', status: 'selesai' },
    { id: 2, jenis: 'audit_mutu', judul: 'AMI 2026: kesesuaian CPL dan RPS', tanggal: '2026-08-14', pelaksana: 'LPM', status: 'selesai' },
    { id: 4, jenis: 'peninjauan', judul: 'Peninjauan kurikulum 4 tahunan', tanggal: '2027-06-01', pelaksana: 'Tim kurikulum', status: 'rencana' },
  ],
}));
