// Data contoh LMS mahasiswa (/v1/lms) untuk komponen lms-belajar. Bentuk mengikuti respons API SIAKAD; isi rekaan.
import { MAHASISWA, tambahRute } from './siakad';

const L = '/v1/lms';
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
const jam = (h: number) => fmt(new Date(Date.now() + h * 3_600_000));
const hariKe = (hari: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  d.setHours(h, m, 0, 0);
  return fmt(d);
};
const tgl = (hari: number) => hariKe(hari, 0).slice(0, 10);
const idDari = (u: URL, dariAkhir = 1) => Number(u.pathname.split('/').at(-dariAkhir));
const body = (init?: RequestInit) => JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;

const PDF = { id: 1, nama: 'Modul 4 - Normalisasi.pdf', mime: 'application/pdf', ukuran: 1_482_331, url: '/v1/lms/file/1' };
const PPT = { id: 2, nama: 'Slide pertemuan 4.pptx', mime: 'application/vnd.ms-powerpoint', ukuran: 3_204_118, url: '/v1/lms/file/2' };
const XLS = { id: 3, nama: 'Data latihan.xlsx', mime: 'application/vnd.ms-excel', ukuran: 48_220, url: '/v1/lms/file/3' };

const KELAS = {
  id: 41,
  idj: 9041,
  tahun_id: '20251',
  kode_prodi: '55201',
  kode_mk: 'IF301',
  kelas: 'A',
  judul: 'Basis Data - Kelas A',
  ringkasan: '<p>Konsep basis data relasional, pemodelan ER, normalisasi, SQL, transaksi, dan indeks.</p>',
  format: 'mingguan',
  status: 'aktif',
  mulai: tgl(-60),
  selesai: tgl(60),
  sampul_url: null,
  peran: 'mahasiswa',
  pengajar: 'Dr. Rahmat Hidayat, M.Kom.',
  jumlah_peserta: 38,
  jadwal: { idj: 9041, hari: 'Senin', jamke: 2, ruang: 'R.301', kode_mk: 'IF301', nama_mk: 'Basis Data', sks: 3, semester: 5, nama_dosen: 'Dr. Rahmat Hidayat, M.Kom.' },
  jumlah: { materi: 14, tugas: 4, kuis: 3, forum: 2 },
};

const MATERI = [
  {
    id: 501,
    kelas_id: 41,
    topik_id: 4,
    jenis: 'berkas',
    judul: 'Modul normalisasi 1NF sampai BCNF',
    konten: '<p>Baca modul berikut sebelum pertemuan.</p>',
    lampiran: [PDF, PPT],
    wajib_selesai: true,
    progres: { dilihat_at: jam(-30), selesai_at: jam(-29) },
  },
  {
    id: 502,
    kelas_id: 41,
    topik_id: 4,
    jenis: 'video',
    judul: 'Video: dekomposisi tanpa kehilangan',
    url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8',
    konten: null,
    wajib_selesai: true,
    progres: { dilihat_at: jam(-5), selesai_at: null },
  },
  {
    id: 503,
    kelas_id: 41,
    topik_id: 4,
    jenis: 'konferensi',
    judul: 'Kelas daring pertemuan 4',
    url: 'https://zoom.us/j/81234567890',
    mulai: jam(-0.2),
    selesai: jam(1.4),
    wajib_selesai: false,
    progres: null,
  },
  {
    id: 504,
    kelas_id: 41,
    topik_id: 5,
    jenis: 'tautan',
    judul: 'Dokumentasi PostgreSQL: CREATE INDEX',
    url: 'https://www.postgresql.org/docs/current/sql-createindex.html',
    wajib_selesai: false,
    progres: null,
  },
  {
    id: 505,
    kelas_id: 41,
    topik_id: 5,
    jenis: 'teks',
    judul: 'Ringkasan: indeks B-tree dan hash',
    konten: '<h3>Kapan memakai indeks?</h3><p>Indeks mempercepat <strong>pencarian</strong> tetapi memperlambat penulisan.</p><ul><li>B-tree: rentang dan urutan</li><li>Hash: kesamaan saja</li></ul>',
    wajib_selesai: true,
    progres: null,
  },
  {
    id: 506,
    kelas_id: 41,
    topik_id: 6,
    jenis: 'konferensi',
    judul: 'Kelas daring pertemuan 6',
    url: 'https://meet.google.com/abc-defg-hij',
    mulai: hariKe(2, 9, 0),
    selesai: hariKe(2, 10, 40),
    wajib_selesai: false,
    progres: null,
  },
];

const TUGAS = [
  {
    id: 301,
    kelas_id: 41,
    topik_id: 4,
    judul: 'Rancangan ERD sistem perpustakaan',
    instruksi: '<p>Buat ERD lengkap untuk sistem perpustakaan kampus, sertakan kardinalitas dan atribut kunci. Unggah dalam format PDF.</p>',
    jenis_pengumpulan: 'keduanya',
    maks_file: 3,
    ekstensi: ['pdf', 'png', 'jpg'],
    mulai: jam(-72),
    tenggat: jam(5),
    batas_akhir: jam(29),
    terima_terlambat: true,
    nilai_maks: 100,
    rubrik: [
      { kriteria: 'Kelengkapan entitas', deskripsi: 'Semua entitas utama dan relasi ada', skor_maks: 40 },
      { kriteria: 'Kardinalitas', deskripsi: 'Kardinalitas tepat dan konsisten', skor_maks: 30 },
      { kriteria: 'Kerapian', skor_maks: 30 },
    ],
    lampiran: [PDF],
    jawaban_saya: { status: 'draf' },
  },
  {
    id: 302,
    kelas_id: 41,
    topik_id: 3,
    judul: 'Latihan aljabar relasional',
    instruksi: '<p>Kerjakan soal 1-10.</p>',
    jenis_pengumpulan: 'teks',
    tenggat: jam(-80),
    nilai_maks: 100,
    rubrik: null,
    lampiran: [],
    jawaban_saya: { status: 'dinilai', nilai: 88 },
  },
  {
    id: 303,
    kelas_id: 41,
    topik_id: 5,
    judul: 'Analisis indeks query laporan',
    instruksi: '<p>Gunakan EXPLAIN untuk tiga query berikut.</p>',
    jenis_pengumpulan: 'file',
    tenggat: hariKe(6, 23, 59),
    nilai_maks: 100,
    lampiran: [XLS],
    jawaban_saya: null,
  },
];

const SOAL = [
  {
    nomor: 1,
    soal_id: 1,
    jenis: 'pilihan_ganda',
    pertanyaan: '<p>Bentuk normal yang menghilangkan ketergantungan parsial adalah…</p>',
    opsi: [
      { id: 'a', teks: '1NF' },
      { id: 'b', teks: '2NF' },
      { id: 'c', teks: '3NF' },
      { id: 'd', teks: 'BCNF' },
    ],
    poin_maks: 10,
    jawaban: null,
  },
  { nomor: 2, soal_id: 2, jenis: 'benar_salah', pertanyaan: '<p>Setiap relasi dalam BCNF juga berada dalam 3NF.</p>', opsi: null, poin_maks: 5, jawaban: null },
  {
    nomor: 3,
    soal_id: 3,
    jenis: 'pilihan_ganda_banyak',
    pertanyaan: '<p>Pilih semua anomali yang dicegah normalisasi.</p>',
    opsi: [
      { id: 'a', teks: 'Anomali sisip' },
      { id: 'b', teks: 'Anomali hapus' },
      { id: 'c', teks: 'Anomali ubah' },
      { id: 'd', teks: 'Anomali indeks' },
    ],
    poin_maks: 10,
    jawaban: null,
  },
  { nomor: 4, soal_id: 4, jenis: 'isian_singkat', pertanyaan: '<p>Singkatan dari bentuk normal Boyce-Codd adalah…</p>', opsi: null, poin_maks: 5, jawaban: null },
  { nomor: 5, soal_id: 5, jenis: 'esai', pertanyaan: '<p>Jelaskan perbedaan dekomposisi <em>lossless</em> dan <em>dependency preserving</em>.</p>', opsi: null, poin_maks: 20, jawaban: null },
];
const KUNCI: Record<number, unknown> = { 1: 'b', 2: true, 3: ['a', 'b', 'c'], 4: ['BCNF'] };

const KUIS = [
  {
    id: 71,
    kelas_id: 41,
    topik_id: 4,
    judul: 'Kuis 3: Normalisasi',
    deskripsi: '<p>Kuis mencakup materi pertemuan 3 dan 4.</p>',
    mulai: jam(-20),
    selesai: jam(28),
    durasi_menit: 30,
    maks_percobaan: 2,
    metode_nilai: 'tertinggi',
    tampil_hasil: 'segera',
    nilai_maks: 100,
    berkata_sandi: false,
    jumlah_soal: SOAL.length,
    percobaan_saya: [{ nilai: 72.5, status: 'selesai' }],
  },
  {
    id: 73,
    kelas_id: 41,
    topik_id: 2,
    judul: 'Kuis 1: Model relasional',
    mulai: jam(-400),
    selesai: jam(-300),
    durasi_menit: 20,
    maks_percobaan: 1,
    nilai_maks: 100,
    jumlah_soal: 10,
    percobaan_saya: [{ nilai: 90, status: 'selesai' }],
  },
  {
    id: 74,
    kelas_id: 41,
    topik_id: 6,
    judul: 'Kuis 4: Indeks dan transaksi',
    mulai: hariKe(5, 8, 0),
    selesai: hariKe(5, 22, 0),
    durasi_menit: 25,
    maks_percobaan: 1,
    nilai_maks: 100,
    berkata_sandi: true,
    jumlah_soal: 8,
    percobaan_saya: [],
  },
];

const PERCOBAAN_LAMA = {
  id: 801,
  kuis_id: 71,
  judul: 'Kuis 3: Normalisasi',
  percobaan_ke: 1,
  status: 'selesai',
  mulai_at: jam(-26),
  selesai_at: jam(-25.6),
  skor: 36,
  skor_maks: 50,
  nilai: 72.5,
  perlu_koreksi: false,
  hasil_terbuka: true,
  soal: SOAL.map((s) => ({
    ...s,
    jawaban:
      { 1: 'b', 2: false, 3: ['a', 'b'], 4: 'BCNF', 5: 'Lossless menjamin join kembali tanpa tupel palsu; dependency preserving menjaga semua FD tetap bisa dicek per relasi.' }[s.soal_id] ?? null,
    poin: { 1: 10, 2: 0, 3: 6, 4: 5, 5: 15 }[s.soal_id] ?? 0,
    benar: { 1: true, 2: false, 3: null, 4: true, 5: null }[s.soal_id] ?? null,
    kunci: KUNCI[s.soal_id],
    pembahasan: s.soal_id === 2 ? '<p>BCNF lebih ketat dari 3NF, jadi pernyataan ini <strong>benar</strong>.</p>' : null,
    umpan_balik: s.soal_id === 5 ? 'Jawaban baik, tambahkan contoh.' : null,
  })),
};
let percobaanBaru: { id: number; batas: number; jawaban: Record<number, unknown> } | null = null;

const PESERTA_UMUM = (n: number) => ({ username: MAHASISWA[n]!.nim, nama: MAHASISWA[n]!.nama, level: 'MAHASISWA', foto: null });
const DOSEN = { username: '0412038801', nama: 'Dr. Rahmat Hidayat, M.Kom.', level: 'DOSEN', foto: null };

const UTAS = [
  {
    id: 901,
    induk_id: null,
    judul: 'Bedanya 3NF dan BCNF di soal nomor 2?',
    isi: '<p>Saya masih bingung kapan relasi 3NF belum BCNF. Ada contoh sederhana?</p>',
    disematkan: false,
    penulis: PESERTA_UMUM(1),
    jumlah_balasan: 3,
    created_at: jam(-6),
  },
  {
    id: 902,
    induk_id: null,
    judul: 'Kelompok tugas ERD',
    isi: '<p>Yang belum dapat kelompok silakan tulis nama di sini.</p>',
    disematkan: true,
    penulis: DOSEN,
    jumlah_balasan: 12,
    created_at: jam(-50),
  },
];
const BALASAN = [
  {
    id: 911,
    induk_id: 901,
    isi: '<p>Contoh klasik: R(Mahasiswa, MK, Dosen) dengan Dosen → MK. Relasi 3NF tetapi Dosen bukan superkey.</p>',
    penulis: DOSEN,
    created_at: jam(-5),
    balasan: [{ id: 912, induk_id: 911, isi: '<p>Terima kasih Pak, jadi dekomposisi menjadi (Dosen, MK) dan (Mahasiswa, Dosen)?</p>', penulis: PESERTA_UMUM(1), created_at: jam(-4.5), balasan: [] }],
  },
  { id: 913, induk_id: 901, isi: '<p>Saya juga baru paham setelah lihat video pertemuan 4.</p>', penulis: PESERTA_UMUM(4), created_at: jam(-3), balasan: [] },
];
const FORUM = [
  { id: 61, kelas_id: 41, jenis: 'pengumuman', judul: 'Pengumuman kelas', deskripsi: 'Informasi resmi dari dosen pengampu.', terkunci: true, jumlah_utas: 4, post_terakhir: jam(-50) },
  { id: 62, kelas_id: 41, jenis: 'diskusi', judul: 'Diskusi materi', deskripsi: 'Tanya jawab materi setiap pertemuan.', terkunci: false, jumlah_utas: 9, post_terakhir: jam(-3) },
];

const SESI = Array.from({ length: 8 }, (_, i) => {
  const ke = i + 1;
  const hari = (ke - 6) * 7;
  return {
    id: 700 + ke,
    topik_id: ke,
    pertemuan_ke: ke,
    tanggal: tgl(hari),
    jam_mulai: '08:00:00',
    jam_selesai: '10:30:00',
    metode: 'kode',
    bahasan: ['Pengantar basis data', 'Model relasional', 'Aljabar relasional', 'Normalisasi', 'Indeks', 'Transaksi', 'Konkurensi', 'Review UTS'][i],
    terbuka: ke === 6,
    presensi_saya: ke < 6 ? { status: ke === 3 ? 'S' : 'H', waktu: hariKe(hari, 8, 5) } : null,
  };
});

const TOPIK = [1, 2, 3, 4, 5, 6].map((ke) => ({
  id: ke,
  judul: SESI[ke - 1]!.bahasan,
  deskripsi: ke === 4 ? '<p>Bentuk normal 1NF sampai BCNF dan dekomposisi.</p>' : null,
  pertemuan_ke: ke,
  tanggal: SESI[ke - 1]!.tanggal,
  urutan: ke,
  item: [
    ...MATERI.filter((m) => m.topik_id === ke).map((m) => ({ tipe: 'materi', ...m })),
    ...TUGAS.filter((t) => t.topik_id === ke).map((t) => ({ tipe: 'tugas', ...t })),
    ...KUIS.filter((k) => k.topik_id === ke).map((k) => ({ tipe: 'kuis', ...k })),
  ],
  presensi: [SESI[ke - 1]],
}));

const NILAI = {
  item: [
    { id: 1, sumber: 'kuis', sumber_id: 73, nama: 'Kuis 1: Model relasional', komponen: 'Harian', nilai_maks: 100, bobot: 1 },
    { id: 2, sumber: 'tugas', sumber_id: 302, nama: 'Latihan aljabar relasional', komponen: 'Tugas', nilai_maks: 100, bobot: 1 },
    { id: 3, sumber: 'kuis', sumber_id: 71, nama: 'Kuis 3: Normalisasi', komponen: 'Harian', nilai_maks: 100, bobot: 1 },
    { id: 4, sumber: 'tugas', sumber_id: 301, nama: 'Rancangan ERD sistem perpustakaan', komponen: 'Tugas', nilai_maks: 100, bobot: 2 },
    { id: 5, sumber: 'manual', sumber_id: null, nama: 'Keaktifan diskusi', komponen: 'Harian', nilai_maks: 100, bobot: 1 },
  ],
  persen_siakad: { Harian: 15, Tugas: 20, HDR: 10, UTS: 25, UAS: 30 },
  mahasiswa: {
    nim: MAHASISWA[0]!.nim,
    nama: MAHASISWA[0]!.nama,
    nilai: [
      { item_id: 1, nilai: 90, catatan: null },
      { item_id: 2, nilai: 88, catatan: 'Rapi' },
      { item_id: 3, nilai: 72.5, catatan: null },
      { item_id: 4, nilai: null, catatan: null },
      { item_id: 5, nilai: 80, catatan: null },
    ],
    komponen: { Harian: 80.8, Tugas: 88, HDR: 93.3 },
    nilai_akhir_perkiraan: 85.1,
  },
};

const NOTIF = [
  {
    id: 1,
    jenis: 'tugas.dinilai',
    judul: 'Tugas "Latihan aljabar relasional" dinilai',
    isi: 'Nilai Anda 88. Lihat umpan balik dosen.',
    tautan: '/v1/lms/tugas/302',
    kelas_id: 41,
    dibaca_at: null,
    created_at: jam(-2),
  },
  {
    id: 2,
    jenis: 'forum.balasan',
    judul: 'Balasan baru di utas Anda',
    isi: 'Dr. Rahmat Hidayat membalas "Bedanya 3NF dan BCNF".',
    tautan: '/v1/lms/forum/post/901',
    kelas_id: 41,
    dibaca_at: null,
    created_at: jam(-5),
  },
  { id: 3, jenis: 'konferensi', judul: 'Kelas daring dimulai', isi: 'Basis Data pertemuan 4 sedang berlangsung.', tautan: '/v1/lms/materi/503', kelas_id: 41, dibaca_at: null, created_at: jam(-0.2) },
  { id: 4, jenis: 'kuis.dibuka', judul: 'Kuis 3: Normalisasi dibuka', tautan: '/v1/lms/kuis/71', kelas_id: 41, dibaca_at: jam(-19), created_at: jam(-20) },
  { id: 5, jenis: 'presensi', judul: 'Presensi pertemuan 6 dibuka', tautan: '/v1/lms/presensi/706', kelas_id: 41, dibaca_at: jam(-30), created_at: jam(-31) },
];

const TERBUKA = [
  {
    id: 801,
    judul: 'Literasi Data untuk Semua',
    ringkasan: 'Dasar membaca grafik, statistik deskriptif, dan berpikir kritis terhadap data.',
    kode_prodi: null,
    pengajar: 'Tim Pustikom',
    mulai: tgl(-10),
    selesai: tgl(80),
    topik: 8,
    materi: 24,
    peserta: 1240,
  },
  {
    id: 802,
    judul: 'Menulis Ilmiah Populer',
    ringkasan: 'Teknik menulis artikel ilmiah populer untuk media massa dan blog kampus.',
    kode_prodi: null,
    pengajar: 'Humas UNIPO',
    mulai: tgl(-3),
    selesai: tgl(50),
    topik: 6,
    materi: 15,
    peserta: 486,
  },
  {
    id: 803,
    judul: 'Pengantar Pemrograman Python',
    ringkasan: 'Belajar dari nol: variabel, perulangan, fungsi, dan proyek kecil.',
    kode_prodi: '55201',
    pengajar: 'Prodi Informatika',
    mulai: tgl(0),
    selesai: tgl(90),
    topik: 12,
    materi: 40,
    peserta: 2105,
  },
];

// ---------------------------------------------------------------- Rute
tambahRute(new RegExp(`${L}/terbuka$`), () => ({ data: TERBUKA, meta: { total: TERBUKA.length } }));
tambahRute(new RegExp(`${L}/terbuka/\\d+/gabung$`), (u) => ({ data: { ...KELAS, id: idDari(u, 2), judul: TERBUKA.find((x) => x.id === idDari(u, 2))?.judul ?? 'Kelas terbuka' } }));
tambahRute(new RegExp(`${L}/kelas/gabung$`), (_u, init) => {
  const kode = String(body(init).kode ?? '');
  if (kode !== 'BD2025') return { __status: 422, error: { code: 'validation_error', message: 'Kode kelas tidak ditemukan (contoh: BD2025).', fields: { kode: 'tidak ditemukan' } } };
  return { data: KELAS };
});
tambahRute(new RegExp(`${L}/kelas/\\d+$`), () => ({ data: KELAS }));
tambahRute(new RegExp(`${L}/kelas/\\d+/konten$`), () => ({
  data: {
    kelas: KELAS,
    peran: 'mahasiswa',
    umum: { id: null, judul: 'Umum', item: FORUM.map((f) => ({ tipe: 'forum', id: f.id, judul: f.judul, jenis: f.jenis, jumlah_utas: f.jumlah_utas })) },
    topik: TOPIK,
  },
}));
tambahRute(new RegExp(`${L}/materi/\\d+$`), (u) => ({ data: MATERI.find((m) => m.id === idDari(u)) ?? MATERI[0] }));
tambahRute(new RegExp(`${L}/materi/\\d+/selesai$`), () => ({ data: { selesai_at: jam(0) } }));
tambahRute(new RegExp(`${L}/materi/\\d+/rapat$`), (u) => {
  const m = MATERI.find((x) => x.id === idDari(u, 2));
  const zoom = m?.url?.includes('zoom');
  return {
    data: {
      id: zoom ? '81234567890' : 'abc-defg-hij',
      driver: zoom ? 'zoom' : 'google_meet',
      penyedia: zoom ? 'Zoom' : 'Google Meet',
      judul: m?.judul,
      mulai: m?.mulai,
      selesai: m?.selesai,
      durasi_menit: 100,
      zona_waktu: 'Asia/Jakarta',
      waktu: m?.mulai && new Date(m.mulai.replace(' ', 'T')).getTime() > Date.now() ? 'akan_datang' : 'berlangsung',
      url_gabung: m?.url,
      kata_sandi: zoom ? 'bd41' : null,
      id_rapat: zoom ? '812 3456 7890' : null,
    },
  };
});
tambahRute(new RegExp(`${L}/kelas/\\d+/tugas$`), () => ({ data: TUGAS }));
tambahRute(new RegExp(`${L}/tugas/\\d+$`), (u) => ({ data: TUGAS.find((t) => t.id === idDari(u)) ?? TUGAS[0] }));
tambahRute(new RegExp(`${L}/tugas/\\d+/jawaban$`), (u, init) => {
  const t = TUGAS.find((x) => x.id === idDari(u, 2));
  if (init?.method && init.method !== 'GET') {
    const b = body(init);
    return { data: { id: 1, tugas_id: t?.id, teks: b.teks ?? null, status: b.kumpulkan ? 'dikumpulkan' : 'draf', dikumpulkan_at: b.kumpulkan ? jam(0) : null, lampiran: [] } };
  }
  if (t?.id === 302)
    return {
      data: [
        {
          id: 2,
          tugas_id: 302,
          teks: '<p>Jawaban soal 1-10 terlampir.</p>',
          status: 'dinilai',
          dikumpulkan_at: jam(-90),
          terlambat: false,
          nilai: 88,
          umpan_balik: 'Bagus, perhatikan notasi proyeksi di soal 7.',
          dinilai_at: jam(-2),
          lampiran: [],
        },
      ],
    };
  return {
    data: [
      {
        id: 1,
        tugas_id: t?.id,
        teks: '<p>Draf ERD versi pertama.</p>',
        status: 'draf',
        dikumpulkan_at: null,
        lampiran: [{ id: 9, nama: 'erd-perpustakaan-v1.pdf', mime: 'application/pdf', ukuran: 380_112, url: '/v1/lms/file/9' }],
      },
    ],
  };
});
tambahRute(new RegExp(`${L}/file$`), () => ({ data: { id: Math.round(Math.random() * 1e6), nama: 'unggahan.pdf', mime: 'application/pdf', ukuran: 120_000, url: '/v1/lms/file/99' } }));

tambahRute(new RegExp(`${L}/kelas/\\d+/kuis$`), () => ({ data: KUIS }));
tambahRute(new RegExp(`${L}/kuis/\\d+$`), (u) => ({ data: KUIS.find((k) => k.id === idDari(u)) ?? KUIS[0] }));
tambahRute(new RegExp(`${L}/kuis/\\d+/percobaan$`), () => ({ data: [{ ...PERCOBAAN_LAMA, soal: undefined }] }));
tambahRute(new RegExp(`${L}/kuis/\\d+/mulai$`), (u) => {
  percobaanBaru ??= { id: 802, batas: Date.now() + 30 * 60_000, jawaban: {} };
  return {
    data: {
      id: percobaanBaru.id,
      kuis_id: idDari(u, 2),
      judul: 'Kuis 3: Normalisasi',
      percobaan_ke: 2,
      status: 'berlangsung',
      mulai_at: jam(0),
      batas_at: fmt(new Date(percobaanBaru.batas)),
      sisa_detik: Math.max(0, Math.round((percobaanBaru.batas - Date.now()) / 1000)),
      soal: SOAL.map((s) => ({ ...s, jawaban: percobaanBaru!.jawaban[s.soal_id] ?? null })),
    },
  };
});
tambahRute(new RegExp(`${L}/kuis/percobaan/\\d+/jawaban$`), (_u, init) => {
  const b = body(init) as { jawaban?: { soal_id: number; jawaban: unknown }[] };
  for (const j of b.jawaban ?? []) if (percobaanBaru) percobaanBaru.jawaban[j.soal_id] = j.jawaban;
  return { data: { tersimpan: (b.jawaban ?? []).length } };
});
tambahRute(new RegExp(`${L}/kuis/percobaan/\\d+/selesai$`), () => {
  percobaanBaru = null;
  return { data: { ...PERCOBAAN_LAMA, id: 802, percobaan_ke: 2, nilai: 81, skor: 40.5, perlu_koreksi: true, soal: undefined } };
});
tambahRute(new RegExp(`${L}/kuis/percobaan/\\d+$`), (u) => ({ data: idDari(u) === 802 ? { ...PERCOBAAN_LAMA, id: 802, percobaan_ke: 2, nilai: 81, perlu_koreksi: true } : PERCOBAAN_LAMA }));

tambahRute(new RegExp(`${L}/kelas/\\d+/forum$`), () => ({ data: FORUM }));
tambahRute(new RegExp(`${L}/forum/\\d+/post$`), (u, init) => {
  if (init?.method === 'POST') {
    const b = body(init);
    return { data: { id: 990, induk_id: b.induk_id ?? null, judul: b.judul ?? null, isi: b.isi, penulis: PESERTA_UMUM(0), created_at: jam(0), balasan: [] } };
  }
  return { data: idDari(u, 2) === 61 ? UTAS.filter((x) => x.disematkan) : UTAS };
});
tambahRute(new RegExp(`${L}/forum/post/\\d+$`), (u) => ({ data: { forum: FORUM[1], utas: UTAS.find((x) => x.id === idDari(u)) ?? UTAS[0], balasan: BALASAN } }));

tambahRute(new RegExp(`${L}/kelas/\\d+/presensi$`), () => ({ data: { sesi: SESI, rekap: { H: 4, I: 0, S: 1, A: 0, belum: 3, persen_hadir: 93.3 } } }));
tambahRute(new RegExp(`${L}/presensi/\\d+/hadir$`), (_u, init) => {
  if (String(body(init).kode ?? '').toUpperCase() !== 'K7Q2') return { __status: 422, error: { code: 'validation_error', message: 'Kode presensi salah (contoh: K7Q2).', fields: { kode: 'salah' } } };
  return { data: { status: 'H', waktu: jam(0) } };
});
tambahRute(new RegExp(`${L}/kelas/\\d+/nilai$`), () => ({ data: NILAI }));
tambahRute(new RegExp(`${L}/kelas/\\d+/peserta$`), () => ({
  data: [
    { username: DOSEN.username, nama: DOSEN.nama, peran: 'pengajar' },
    { username: '0413099002', nama: 'Siti Aminah, M.T.', peran: 'asisten' },
    ...MAHASISWA.slice(0, 16).map((m) => ({ username: m.nim, nama: m.nama, peran: 'mahasiswa' })),
  ],
}));
tambahRute(new RegExp(`${L}/notifikasi$`), () => ({ data: NOTIF }));
tambahRute(new RegExp(`${L}/notifikasi/baca$`), () => ({ data: { dibaca: NOTIF.length } }));
tambahRute(new RegExp(`/v1/mahasiswa/[^/]+/jadwal$`), () => ({
  data: {
    nim: MAHASISWA[0]!.nim,
    tahun_id: '20251',
    jadwal: [
      {
        idj: 9041,
        kode_mk: 'IF301',
        nama_mk: 'Basis Data',
        sks: 3,
        hari: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()],
        jam_mulai: '08:00:00',
        jam_selesai: '10:30:00',
        ruang: 'R301',
        nama_ruang: 'R.301 Gedung A',
        kelas: 'A',
        dosen: { nidn: '0412038801', nama: 'Dr. Rahmat Hidayat' },
      },
      {
        idj: 9042,
        kode_mk: 'IF302',
        nama_mk: 'Pemrograman Berorientasi Objek',
        sks: 3,
        hari: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()],
        jam_mulai: '13:00:00',
        jam_selesai: '15:30:00',
        ruang: 'LAB1',
        nama_ruang: 'Lab Komputer 1',
        kelas: 'A',
        dosen: { nidn: '0420078502', nama: 'Andi Saputra, M.Kom.' },
      },
    ],
  },
}));
