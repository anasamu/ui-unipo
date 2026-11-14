// Data contoh untuk widget fitur (kalender, portal, LMS, CBT, PMB). Bentuknya mengikuti respons API SIAKAD.
import { tambahRute } from "./siakad";

const now = new Date();
const d = (n: number, h?: number) => {
  const x = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + n,
    h ?? 0,
    0,
  );
  const s = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  return h == null ? s : `${s} ${String(h).padStart(2, "0")}:00:00`;
};
const awal = (n: number) => d(n - now.getDate() + 1);

// ---------------------------------------------------------------- Kalender terpadu
const KALENDER = [
  {
    sumber: "tahun",
    jenis: "perkuliahan",
    judul: "Perkuliahan semester ganjil 2026/2027",
    mulai: awal(-60),
    selesai: awal(45),
  },
  {
    sumber: "tahun",
    jenis: "ujian",
    judul: "Ujian tengah semester",
    mulai: d(-9),
    selesai: d(-4),
  },
  {
    sumber: "batas",
    jenis: "nilai",
    judul: "Batas input nilai UTS",
    mulai: d(2),
    selesai: null,
  },
  {
    sumber: "kalender",
    jenis: "akademik",
    judul: "Rapat senat akademik",
    mulai: d(3),
    selesai: null,
    lokasi: "Ruang Senat, Gedung Rektorat",
  },
  {
    sumber: "kalender",
    jenis: "kemahasiswaan",
    judul: "Pekan olahraga mahasiswa",
    mulai: d(5),
    selesai: d(9),
    lokasi: "GOR Marisa",
  },
  {
    sumber: "libur",
    jenis: "libur",
    judul: "Libur nasional",
    mulai: d(11),
    selesai: null,
    libur: true,
  },
  {
    sumber: "portal",
    jenis: "lainnya",
    judul: "Seminar nasional teknologi pertanian",
    mulai: d(12),
    selesai: null,
    lokasi: "Aula UNIPO",
  },
  {
    sumber: "pmb",
    jenis: "pmb",
    judul: "PMB Gelombang I: pendaftaran",
    mulai: d(14),
    selesai: d(40),
  },
  {
    sumber: "kalender",
    jenis: "keuangan",
    judul: "Batas pembayaran UKT semester genap",
    mulai: d(18),
    selesai: null,
  },
  {
    sumber: "kalender",
    jenis: "rapat",
    judul: "Rapat koordinasi prodi",
    mulai: d(3),
    selesai: null,
    lokasi: "Daring (Zoom)",
  },
  {
    sumber: "kalender",
    jenis: "wisuda",
    judul: "Gladi wisuda periode II",
    mulai: d(21),
    selesai: null,
  },
  {
    sumber: "kalender",
    jenis: "wisuda",
    judul: "Wisuda sarjana periode II",
    mulai: d(22),
    selesai: null,
    lokasi: "Gedung Serbaguna Pohuwato",
  },
  {
    sumber: "batas",
    jenis: "krs",
    judul: "Pengisian KRS semester genap",
    mulai: d(30),
    selesai: d(37),
  },
  {
    sumber: "tahun",
    jenis: "ujian",
    judul: "Ujian akhir semester",
    mulai: d(44),
    selesai: d(52),
  },
  {
    sumber: "kalender",
    jenis: "akademik",
    judul: "Yudisium fakultas",
    mulai: d(-2),
    selesai: null,
  },
  {
    sumber: "kalender",
    jenis: "kemahasiswaan",
    judul: "Pelatihan kepemimpinan BEM",
    mulai: d(-14),
    selesai: d(-12),
  },
].map((k, i) => ({ id: i + 1, ...k }));
tambahRute(/\/v1\/kalender\/terpadu$/, (u) => {
  const a = u.searchParams.get("dari") ?? "0000";
  const b = u.searchParams.get("sampai") ?? "9999";
  return {
    data: KALENDER.filter(
      (k) => (k.selesai ?? k.mulai) >= a && k.mulai <= b,
    ).sort((x, y) => x.mulai.localeCompare(y.mulai)),
  };
});

// ---------------------------------------------------------------- Portal
// Gambar: gradasi SVG polos (tanpa foto orang), supaya contoh tidak memuat data pribadi.
const gambar = (hue: number, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 42%)"/><stop offset="1" stop-color="hsl(${hue + 30} 60% 26%)"/></linearGradient><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="white" fill-opacity=".14"/></pattern></defs><rect width="800" height="450" fill="url(#g)"/><rect width="800" height="450" fill="url(#p)"/><text x="48" y="400" font-family="Arial" font-size="30" font-weight="700" fill="white" fill-opacity=".55">${label}</text></svg>`)}`;
const KATEGORI = [
  { id: 1, slug: "akademik", nama: "Akademik", warna: "#1d4ed8" },
  { id: 2, slug: "prestasi", nama: "Prestasi", warna: "#b45309" },
  { id: 3, slug: "penelitian", nama: "Penelitian", warna: "#0f766e" },
  { id: 4, slug: "kampus", nama: "Kampus", warna: "#7c3aed" },
];
const JUDUL = [
  [
    "Mahasiswa Agroteknologi UNIPO juara 1 lomba inovasi pertanian tingkat nasional",
    2,
    "Tim beranggotakan tiga mahasiswa mengembangkan sistem irigasi tetes berbasis sensor kelembapan tanah untuk lahan jagung di Pohuwato.",
  ],
  [
    "UNIPO buka pendaftaran mahasiswa baru gelombang I tahun akademik 2027/2028",
    1,
    "Pendaftaran dibuka untuk 12 program studi dengan jalur reguler, prestasi, dan KIP Kuliah. Seluruh proses dilakukan secara daring.",
  ],
  [
    "Dosen Informatika raih hibah penelitian dosen pemula dari Kemdiktisaintek",
    3,
    "Penelitian tentang deteksi penyakit daun kakao berbasis citra akan dilaksanakan bersama kelompok tani di Kecamatan Paguat.",
  ],
  [
    "Kuliah umum: transformasi digital pemerintahan desa",
    1,
    "Kuliah umum menghadirkan praktisi dari Kementerian Desa dan diikuti lebih dari 400 mahasiswa secara luring dan daring.",
  ],
  [
    "Laboratorium komputer baru resmi digunakan untuk perkuliahan",
    4,
    "Laboratorium berkapasitas 40 unit ini juga dipakai untuk ujian berbasis komputer dan pelatihan sertifikasi.",
  ],
  [
    "UNIPO dan Pemkab Pohuwato tanda tangani kerja sama pengembangan SDM",
    4,
    "Kerja sama meliputi beasiswa, magang mahasiswa, dan pendampingan perencanaan pembangunan daerah.",
  ],
  [
    "Tim debat Fakultas Hukum lolos ke babak final NUDC regional",
    2,
    "Tim akan berkompetisi di babak final regional Sulawesi bulan depan.",
  ],
  [
    "Pengabdian masyarakat: pelatihan pembukuan UMKM di Marisa",
    3,
    "Dosen dan mahasiswa Fakultas Ekonomi mendampingi 35 pelaku UMKM menyusun laporan keuangan sederhana.",
  ],
] as const;
const BERITA = JUDUL.map(([judul, kat, ringkasan], i) => ({
  id: i + 1,
  jenis: i === 0 || i === 6 ? "prestasi" : "berita",
  slug: judul
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60),
  judul,
  ringkasan,
  kategori: KATEGORI[kat - 1],
  gambar: { url: gambar(200 + i * 37, KATEGORI[kat - 1]!.nama), alt: judul },
  penulis_tampil: [
    "Humas UNIPO",
    "Redaksi Fakultas Pertanian",
    "Humas UNIPO",
    "Fakultas Ilmu Sosial",
  ][i % 4],
  unggulan: i < 2,
  dilihat: [1840, 3210, 652, 488, 920, 1104, 377, 214][i],
  terbit_pada: d(-i * 2 - (i > 3 ? 3 : 0), 9 + i),
}));
tambahRute(/\/v1\/portal\/berita$/, (u) => {
  let r = [...BERITA];
  if (u.searchParams.get("unggulan") === "1") r = r.filter((b) => b.unggulan);
  if (u.searchParams.get("urut") === "populer")
    r.sort((a, b) => b.dilihat - a.dilihat);
  const k = u.searchParams.get("kategori");
  if (k) r = r.filter((b) => b.kategori?.slug === k);
  const per = Number(u.searchParams.get("per_page") ?? 12);
  return {
    data: r.slice(0, per),
    meta: {
      page: 1,
      per_page: per,
      total: r.length,
      total_pages: Math.ceil(r.length / per),
    },
  };
});
const PENGUMUMAN = [
  ["Jadwal ujian akhir semester ganjil 2026/2027", "penting", 3],
  ["Pemeliharaan server SIAKAD Sabtu malam", "darurat", 1],
  ["Perpanjangan batas pembayaran UKT", "penting", 10],
  ["Beasiswa Bank Indonesia untuk mahasiswa semester 3–5", "biasa", 20],
  ["Pengambilan toga wisuda periode II", "biasa", 15],
].map(([judul, prioritas, hari], i) => ({
  id: i + 1,
  slug: `pengumuman-${i + 1}`,
  nomor: `${120 + i}/UNIPO/BAAK/XI/2026`,
  judul,
  prioritas,
  berlaku_sampai: d(Number(hari)),
  sematkan: i === 1,
  terbit_pada: d(-i, 8 + i),
  dilihat: 120 + i * 40,
}));
tambahRute(/\/v1\/portal\/pengumuman$/, () => ({
  data: PENGUMUMAN,
  meta: { page: 1, per_page: 12, total: PENGUMUMAN.length, total_pages: 1 },
}));
const AGENDA = [
  [
    "Seminar nasional teknologi pertanian",
    12,
    "luring",
    "Aula UNIPO",
    "Fakultas Pertanian",
  ],
  ["Webinar penulisan artikel jurnal bereputasi", 6, "daring", "Zoom", "LPPM"],
  ["Pekan olahraga mahasiswa", 5, "luring", "GOR Marisa", "BEM Universitas"],
  [
    "Pelatihan Neo Feeder untuk operator prodi",
    16,
    "hibrida",
    "Lab Komputer 2",
    "Pustikom",
  ],
  [
    "Wisuda sarjana periode II",
    22,
    "luring",
    "Gedung Serbaguna Pohuwato",
    "BAAK",
  ],
].map(([judul, hari, mode, lokasi, penyelenggara], i) => ({
  id: i + 1,
  slug: `agenda-${i + 1}`,
  judul,
  mulai: d(Number(hari), 9),
  selesai: Number(hari) === 5 ? d(9, 16) : d(Number(hari), 12),
  sepanjang_hari: false,
  mode,
  lokasi,
  penyelenggara,
  pendaftaran: i % 2 === 0,
  gambar: { url: gambar(160 + i * 50, "Agenda") },
}));
tambahRute(/\/v1\/portal\/agenda$/, () => ({
  data: [...AGENDA].sort((a, b) => a.mulai.localeCompare(b.mulai)),
  meta: { page: 1, per_page: 12, total: AGENDA.length, total_pages: 1 },
}));

// ---------------------------------------------------------------- LMS
const KELAS = [
  ["Pemrograman Web Lanjut", "IF305", "A", 72, 210],
  ["Basis Data", "IF204", "B", 45, 160],
  ["Statistika Pertanian", "AG212", "A", 90, 30],
  ["Etika Profesi", "IF110", "A", 18, 280],
].map(([judul, kode_mk, kelas, progres, hue], i) => ({
  id: i + 1,
  judul,
  kode_mk,
  kelas,
  tahun_id: "20261",
  status: "aktif",
  peran: "mahasiswa",
  progres,
  sampul_url: gambar(Number(hue), String(kode_mk)),
  jumlah: {
    materi: 12 + i,
    tugas: 4 + (i % 3),
    kuis: 2 + (i % 2),
    forum: 1,
    anggota: 32 + i * 5,
  },
  pengajar: [
    {
      nama: [
        "Rahmat Hidayat, M.Kom",
        "Siti Aisyah Pakaya, M.T",
        "Ir. Yusuf Mohamad, M.Si",
        "Dewi Lestari Daud, M.Pd",
      ][i],
    },
  ],
}));
tambahRute(/\/v1\/lms\/kelas$/, () => ({ data: KELAS }));
tambahRute(/\/v1\/lms\/saya$/, () => ({
  data: {
    pengguna: {
      username: "2023010045",
      nama: "Mahasiswa Contoh",
      level: "mahasiswa",
    },
    jumlah_kelas: KELAS.length,
    notifikasi_belum_dibaca: 3,
    tugas_mendatang: [
      {
        id: 11,
        kelas_id: 1,
        kelas: "Pemrograman Web Lanjut",
        judul: "Proyek akhir: aplikasi CRUD dengan React",
        tenggat: d(0, 23),
        status_jawaban: null,
      },
      {
        id: 12,
        kelas_id: 2,
        kelas: "Basis Data",
        judul: "Normalisasi skema perpustakaan",
        tenggat: d(2, 23),
        status_jawaban: "draf",
      },
      {
        id: 13,
        kelas_id: 4,
        kelas: "Etika Profesi",
        judul: "Esai studi kasus kebocoran data",
        tenggat: d(6, 17),
        status_jawaban: null,
      },
      {
        id: 14,
        kelas_id: 3,
        kelas: "Statistika Pertanian",
        judul: "Laporan praktikum regresi",
        tenggat: d(-1, 23),
        status_jawaban: "dikumpulkan",
      },
    ],
    kuis_terbuka: [
      {
        id: 21,
        kelas_id: 2,
        kelas: "Basis Data",
        judul: "Kuis 3: SQL join",
        mulai: d(-1, 8),
        selesai: d(1, 23),
      },
    ],
  },
}));

// ---------------------------------------------------------------- CBT
tambahRute(/\/v1\/cbt\/saya$/, () => ({
  data: [
    {
      id: 1,
      status: "terdaftar",
      nomor_peserta: "UAS-2026-0451",
      ujian_id: 3,
      kode: "UAS-IF305",
      ujian: "UAS Pemrograman Web Lanjut",
      jenis: "uas",
      kode_mk: "IF305",
      durasi_menit: 90,
      ujian_status: "siap",
      sesi_id: 7,
      sesi: "Sesi 2",
      mulai: d(0, 10),
      selesai: d(0, 12),
      sesi_status: "dibuka",
      bisa_mulai: true,
      sisa_detik: null,
    },
    {
      id: 2,
      status: "terdaftar",
      nomor_peserta: "UAS-2026-0451",
      ujian_id: 4,
      kode: "UAS-IF204",
      ujian: "UAS Basis Data",
      jenis: "uas",
      kode_mk: "IF204",
      durasi_menit: 100,
      ujian_status: "siap",
      sesi_id: 9,
      sesi: "Sesi 1",
      mulai: d(2, 8),
      selesai: d(2, 10),
      sesi_status: "terjadwal",
      bisa_mulai: false,
      sisa_detik: null,
    },
    {
      id: 3,
      status: "selesai",
      nomor_peserta: "UTS-2026-0451",
      ujian_id: 1,
      kode: "UTS-IF305",
      ujian: "UTS Pemrograman Web Lanjut",
      jenis: "uts",
      kode_mk: "IF305",
      durasi_menit: 90,
      ujian_status: "selesai",
      sesi_id: 2,
      sesi: "Sesi 1",
      mulai: d(-30, 8),
      selesai: d(-30, 10),
      sesi_status: "ditutup",
      bisa_mulai: false,
      sisa_detik: null,
    },
  ],
}));
const SOAL = [
  {
    jenis: "pilihan_ganda",
    pertanyaan:
      "Hook React yang dipakai untuk menyimpan nilai yang <b>tidak</b> memicu render ulang saat berubah adalah…",
    opsi: [
      { id: "a", teks: "useState" },
      { id: "b", teks: "useRef" },
      { id: "c", teks: "useMemo" },
      { id: "d", teks: "useReducer" },
    ],
    jawaban: "b",
  },
  {
    jenis: "pilihan_ganda_banyak",
    pertanyaan: "Pilih semua metode HTTP yang bersifat idempoten.",
    opsi: [
      { id: "a", teks: "GET" },
      { id: "b", teks: "POST" },
      { id: "c", teks: "PUT" },
      { id: "d", teks: "DELETE" },
    ],
    jawaban: ["a", "c"],
  },
  {
    jenis: "benar_salah",
    pertanyaan:
      "Atribut <code>key</code> pada daftar React harus unik di seluruh aplikasi.",
    opsi: null,
    jawaban: null,
  },
  {
    jenis: "isian_singkat",
    pertanyaan: 'Kode status HTTP untuk "Not Found" adalah…',
    opsi: null,
    jawaban: null,
  },
  {
    jenis: "esai",
    pertanyaan:
      "Jelaskan perbedaan render di sisi server (SSR) dan di sisi klien (CSR), beserta satu kelebihan masing-masing.",
    opsi: null,
    jawaban: null,
  },
];
const LEMBAR = {
  peserta_id: 1,
  ujian: {
    id: 3,
    kode: "UAS-IF305",
    nama: "UAS Pemrograman Web Lanjut",
    jenis: "uas",
    petunjuk: "Kerjakan secara mandiri. Jawaban tersimpan otomatis.",
    durasi_menit: 90,
    tampil_hasil: 0,
  },
  status: "mengerjakan",
  sisa_detik: 3725,
  soal: Array.from({ length: 30 }, (_, i) => ({
    nomor: i + 1,
    soal_id: 100 + i,
    poin: 2,
    ragu: i === 3 || i === 9,
    ...SOAL[i % SOAL.length],
    jawaban:
      i < 3 || (i > 5 && i < 12)
        ? (SOAL[i % SOAL.length]!.jawaban ?? (i % 5 === 2 ? true : "jawaban"))
        : null,
  })),
};
tambahRute(/\/v1\/cbt\/kerjakan\/\d+$/, () => ({ data: LEMBAR }));
tambahRute(/\/v1\/cbt\/kerjakan\/\d+\/jawab$/, () => ({
  data: { tersimpan: true, sisa_detik: 3700 },
}));

// ---------------------------------------------------------------- PMB
const REF = (xs: string[]) =>
  xs.map((nama, i) => ({ kode: String(i + 1), nama }));
tambahRute(/\/v1\/pmb\/info\/referensi-formulir$/, () => ({
  data: {
    jenis_kelamin: [
      { kode: "L", nama: "Laki-laki" },
      { kode: "P", nama: "Perempuan" },
    ],
    agama: REF(["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"]),
    warga_negara: [
      { kode: "WNI", nama: "WNI" },
      { kode: "WNA", nama: "WNA" },
    ],
    status_sipil: REF(["Belum menikah", "Menikah"]),
    hidup: [
      { kode: "Y", nama: "Masih hidup" },
      { kode: "T", nama: "Sudah meninggal" },
    ],
    status_masuk: [
      { kode: "B", nama: "Mahasiswa baru" },
      { kode: "P", nama: "Pindahan" },
    ],
    asal_jenjang: REF(["D3", "D4", "S1"]),
    pendidikan: REF([
      "Tidak sekolah",
      "SD",
      "SMP",
      "SMA/SMK",
      "D3",
      "S1",
      "S2",
      "S3",
    ]),
    pekerjaan: REF([
      "Petani",
      "Nelayan",
      "Wiraswasta",
      "PNS/TNI/Polri",
      "Karyawan swasta",
      "Guru/Dosen",
      "Lainnya",
    ]),
    penghasilan: REF([
      "< Rp1 juta",
      "Rp1–2 juta",
      "Rp2–5 juta",
      "Rp5–10 juta",
      "> Rp10 juta",
    ]),
    sumber_informasi: [
      "website",
      "media_sosial",
      "brosur",
      "sekolah",
      "teman_keluarga",
    ].map((s) => ({ kode: s, nama: s.replace("_", " ") })),
  },
}));
const PRODI_PMB = [
  ["55201", "Informatika", "S1", "FIKOM"],
  ["54211", "Agroteknologi", "S1", "FAPERTA"],
  ["61201", "Manajemen", "S1", "FEB"],
  ["74201", "Ilmu Hukum", "S1", "FH"],
  ["63201", "Ilmu Pemerintahan", "S1", "FISIP"],
  ["54231", "Peternakan", "S1", "FAPERTA"],
].map(([kode_prodi, nama_prodi, jenjang, kode_fakultas], i) => ({
  kode_prodi,
  nama_prodi,
  jenjang,
  kode_fakultas,
  kuota: 80 - i * 10,
  jumlah_peminat: [142, 61, 98, 54, 37, 22][i],
}));
tambahRute(/\/v1\/pmb\/info\/gelombang\/\d+$/, () => ({
  data: {
    id: 1,
    nama: "Gelombang I",
    jalur_nama: "Reguler",
    maks_pilihan: 2,
    tgl_mulai: d(-10),
    tgl_selesai: d(40),
    prodi: PRODI_PMB,
  },
}));
let FORMULIR: Record<string, unknown> = {
  pribadi: { nama: "Nurul Fadilah", jenis_kelamin: "P" },
  pilihan: [],
};
tambahRute(/\/v1\/pmb\/saya\/pendaftaran\/[\w-]+$/, (_u, init) => {
  if (init?.method === "PATCH" && init.body) {
    const b = JSON.parse(String(init.body)) as Record<string, unknown>;
    for (const [k, v] of Object.entries(b))
      FORMULIR[k] = Array.isArray(v)
        ? v
        : { ...((FORMULIR[k] as object) ?? {}), ...(v as object) };
  }
  return {
    data: {
      id: "pmb-demo",
      no_pmb: null,
      status: "draf",
      tahap: "mengisi_formulir",
      gelombang: { id: 1, nama: "Gelombang I", jalur: "Reguler" },
      formulir: FORMULIR,
      pilihan: ((FORMULIR.pilihan as string[]) ?? []).map((k, i) => ({
        urut: i + 1,
        kode_prodi: k,
        nama_prodi: PRODI_PMB.find((p) => p.kode_prodi === k)?.nama_prodi ?? k,
      })),
      kelengkapan: {},
    },
  };
});
tambahRute(/\/v1\/pmb\/saya\/pendaftaran\/[\w-]+\/ajukan$/, () => ({
  data: { status: "diajukan", no_pmb: "2027100123" },
}));
export const resetFormulirPmb = () =>
  (FORMULIR = {
    pribadi: { nama: "Nurul Fadilah", jenis_kelamin: "P" },
    pilihan: [],
  });
