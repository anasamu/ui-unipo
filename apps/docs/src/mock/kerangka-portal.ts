// Data contoh untuk kerangka portal (footer, pita, popup, pengumuman). Diimpor terakhir: rute yang didaftarkan
// belakangan diperiksa lebih dulu. Bentuk mengikuti /v1/portal SIAKAD (portal_situs, portal_menu, portal_tautan, portal_banner, portal_pengumuman).
import { MENU_UTAMA } from './akademik';
import { tambahRute } from './siakad';

const now = new Date();
const d = (n: number, h?: number) => {
  const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h ?? 0, 0);
  const s = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return h == null ? s : `${s} ${String(h).padStart(2, '0')}:00:00`;
};
const halaman = <T>(u: URL, rows: T[]) => {
  const per = Number(u.searchParams.get('per_page') ?? 12);
  return { data: rows.slice(0, per), meta: { page: 1, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
};

const UNIV = {
  id: 1,
  kode: 'univ',
  jenis: 'universitas',
  nama: 'Universitas Pohuwato',
  singkatan: 'UNIPO',
  tagline: 'Unggul, Berkarakter, Berdaya Saing',
  domain: 'unipo.ac.id',
  logo: null,
  alamat: 'Jl. Trans Sulawesi No. 147, Desa Palopo, Kec. Marisa, Kab. Pohuwato, Gorontalo 96266',
  telepon: '(0443) 210 2026',
  email: 'humas@unipo.ac.id',
  whatsapp: '0812 4400 2026',
  lintang: 0.4733,
  bujur: 121.9354,
  meta_deskripsi: 'Kampus negeri-swasta di ujung barat Gorontalo dengan dua belas program studi yang dekat dengan pertanian, pesisir, dan pemerintahan desa.',
  media_sosial: {
    instagram: 'https://instagram.com/unipo.official',
    youtube: 'https://youtube.com/@unipo',
    facebook: 'https://facebook.com/unipo.official',
    tiktok: 'https://tiktok.com/@unipo',
    linkedin: 'https://linkedin.com/school/unipo',
  },
  pengaturan: {
    jam_layanan: 'Senin–Jumat, 08.00–16.00 WITA',
    sambutan: '<p>Assalamualaikum warahmatullahi wabarakatuh. Selamat datang di laman resmi Universitas Pohuwato.</p>',
  },
  siakad: { pimpinan: [{ jabatan: 'Rektor', nidn: '0912037801', nama: 'Dr. Rahmat Hidayat, M.Pd.' }] },
  anak: [],
};
tambahRute(/\/v1\/portal\/situs\/univ$/, () => ({ data: UNIV }));

let id = 900;
const mn = (lokasi: string, label: string, url?: string, anak: unknown[] = [], tab_baru = 0) => ({ id: ++id, lokasi, label, tipe: 'url', url: url ?? null, tab_baru, anak });
const MENU_ATAS = [
  mn('atas', 'SIAKAD', 'https://siakad.unipo.ac.id', [], 1),
  mn('atas', 'E-learning', 'https://e-learning.unipo.ac.id', [], 1),
  mn('atas', 'PPID', '/ppid'),
  mn('atas', 'Karier', '/karier'),
];
const MENU_FOOTER = [
  mn('footer', 'Tentang', undefined, [
    mn('footer', 'Sejarah', '/profil/sejarah'),
    mn('footer', 'Visi dan misi', '/profil/visi-misi'),
    mn('footer', 'Pimpinan', '/profil/pimpinan'),
    mn('footer', 'Akreditasi', '/profil/akreditasi'),
  ]),
  mn('footer', 'Akademik', undefined, [
    mn('footer', 'Fakultas dan prodi', '/akademik/prodi'),
    mn('footer', 'Kalender akademik', '/kalender'),
    mn('footer', 'Beasiswa', '/beasiswa'),
    mn('footer', 'Penerimaan mahasiswa baru', 'https://pmb.unipo.ac.id', [], 1),
  ]),
  mn('footer', 'Kebijakan privasi', '/privasi'),
  mn('footer', 'Peta situs', '/peta-situs'),
  mn('footer', 'Hubungi kami', '/kontak'),
];
// Rute menu yang menghormati ?lokasi=; menu utama sama dengan mock akademik.
tambahRute(/\/v1\/portal\/situs\/univ\/menu$/, (u) => {
  const semua: Record<string, unknown[]> = { utama: MENU_UTAMA, atas: MENU_ATAS, footer: MENU_FOOTER };
  const l = u.searchParams.get('lokasi');
  return { data: l ? { [l]: semua[l] ?? [] } : semua };
});

const TAUTAN = [
  ['layanan', 'SIAKAD', 'https://siakad.unipo.ac.id'],
  ['layanan', 'E-learning', 'https://e-learning.unipo.ac.id'],
  ['layanan', 'PMB online', 'https://pmb.unipo.ac.id'],
  ['layanan', 'Tracer study', 'https://alumni.unipo.ac.id'],
  ['layanan', 'Portal pengembang API', 'https://api.unipo.ac.id'],
  ['terkait', 'Kemdiktisaintek', 'https://kemdiktisaintek.go.id'],
  ['terkait', 'PDDikti', 'https://pddikti.kemdiktisaintek.go.id'],
  ['terkait', 'LLDikti Wilayah XVI', 'https://lldikti16.kemdiktisaintek.go.id'],
].map(([grup, nama, url], i) => ({ id: i + 1, grup, nama, url, ikon: null, urutan: i }));
tambahRute(/\/v1\/portal\/tautan$/, (u) => {
  const g = u.searchParams.get('grup');
  return halaman(u, g ? TAUTAN.filter((t) => t.grup === g) : TAUTAN);
});

const brosur = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><circle cx="660" cy="90" r="160" fill="#fff" fill-opacity=".07"/><circle cx="120" cy="460" r="200" fill="#fff" fill-opacity=".05"/><text x="60" y="170" font-family="sans-serif" font-size="30" fill="#fde68a" font-weight="700">PMB 2027/2028</text><text x="60" y="240" font-family="sans-serif" font-size="56" fill="#fff" font-weight="800">Gelombang 1</text><text x="60" y="305" font-family="sans-serif" font-size="56" fill="#fff" font-weight="800">sudah dibuka</text><text x="60" y="380" font-family="sans-serif" font-size="24" fill="#e2e8f0">Potongan biaya pendaftaran 50% sampai 31 Januari</text></svg>`,
)}`;
const BANNER = [
  { id: 1, posisi: 'pita', judul: 'PMB 2027/2028 gelombang 1 dibuka', keterangan: 'Potongan biaya pendaftaran 50%', tautan: 'https://pmb.unipo.ac.id', teks_tombol: 'Daftar' },
  {
    id: 2,
    posisi: 'popup',
    judul: 'Penerimaan mahasiswa baru 2027/2028',
    keterangan: 'Daftar di gelombang 1 sebelum 31 Januari untuk potongan biaya pendaftaran.',
    tautan: 'https://pmb.unipo.ac.id',
    teks_tombol: 'Daftar sekarang',
    media: { id: 77, jenis: 'gambar', url: brosur, alt: 'Brosur PMB 2027/2028 gelombang 1' },
  },
];
tambahRute(/\/v1\/portal\/banner$/, (u) => {
  const p = u.searchParams.get('posisi');
  return halaman(u, p ? BANNER.filter((b) => b.posisi === p) : BANNER);
});

const KAT = {
  akd: { id: 11, slug: 'akademik', nama: 'Akademik', warna: '#1d4ed8' },
  keu: { id: 12, slug: 'keuangan', nama: 'Keuangan', warna: '#047857' },
  tik: { id: 13, slug: 'layanan-tik', nama: 'Layanan TIK', warna: '#7c3aed' },
  mhs: { id: 14, slug: 'kemahasiswaan', nama: 'Kemahasiswaan', warna: '#b45309' },
};
const FIKOM = { id: 3, kode: 'fikom', jenis: 'fakultas', nama: 'Fakultas Ilmu Komputer', singkatan: 'FIKOM' };
const PENGUMUMAN = [
  [
    'Pemeliharaan server SIAKAD Sabtu malam',
    'darurat',
    KAT.tik,
    1,
    0,
    true,
    'SIAKAD, e-learning, dan SSO tidak dapat diakses Sabtu pukul 22.00 sampai Minggu 04.00 WITA. Simpan pekerjaan Anda sebelum waktu itu.',
    false,
    null,
  ],
  ['Jadwal ujian akhir semester ganjil 2026/2027', 'penting', KAT.akd, 6, 0, false, 'UAS dimulai Senin pekan depan. Kartu ujian bisa dicetak di SIAKAD setelah tagihan semester lunas.', true, null],
  [
    'Perpanjangan batas pembayaran UKT',
    'penting',
    KAT.keu,
    10,
    1,
    false,
    'Batas pembayaran UKT semester ganjil diperpanjang sampai akhir bulan. Mahasiswa yang belum membayar tetap bisa mengisi KRS.',
    false,
    null,
  ],
  ['Pengisian EDOM sebelum melihat nilai', 'biasa', KAT.akd, 12, 3, false, 'Isi evaluasi dosen oleh mahasiswa untuk semua mata kuliah agar nilai semester dapat dilihat di KHS.', false, null],
  ['Beasiswa Bank Indonesia untuk mahasiswa semester 3–5', 'biasa', KAT.mhs, 20, 4, false, 'Syarat IPK minimal 3,25 dan aktif berorganisasi. Berkas diunggah lewat layanan akademik.', true, null],
  ['Praktikum basis data pindah ke Lab Komputer 2', 'biasa', KAT.akd, 7, 5, false, 'Mulai pekan ini, praktikum basis data kelas A dan B dilaksanakan di Lab Komputer 2 lantai dua.', false, FIKOM],
  ['Pengambilan toga wisuda periode II', 'biasa', KAT.mhs, 15, 9, false, 'Toga diambil di BAAK dengan membawa bukti pendaftaran wisuda dan kartu mahasiswa.', false, null],
  ['Libur semester dan jadwal registrasi ulang', 'biasa', KAT.akd, 40, 16, false, 'Registrasi ulang semester genap dibuka dua pekan sebelum perkuliahan dimulai.', false, null],
].map(([judul, prioritas, kategori, hari, lalu, sematkan, ringkasan, lampiran, situs], i) => ({
  id: i + 1,
  slug: `pengumuman-${i + 1}`,
  nomor: `${120 + i}/UNIPO/BAAK/XI/2026`,
  judul,
  prioritas,
  kategori,
  ringkasan,
  berlaku_sampai: d(Number(hari)),
  sematkan,
  terbit_pada: d(-Number(lalu), 8 + i),
  dilihat: 120 + i * 40,
  lampiran: lampiran ? { id: 300 + i, jenis: 'dokumen', url: '#', nama: `${String(judul).split(' ').slice(0, 3).join('-').toLowerCase()}.pdf`, ukuran: 284_000 + i * 51_000 } : null,
  situs: situs ?? { id: 1, kode: 'univ', jenis: 'universitas', nama: 'Universitas Pohuwato', singkatan: 'UNIPO' },
}));
tambahRute(/\/v1\/portal\/pengumuman\/[^/]+$/, (u) => {
  const k = decodeURIComponent(u.pathname.split('/').pop()!);
  const p = PENGUMUMAN.find((x) => String(x.id) === k || x.slug === k);
  if (!p) return { __status: 404, error: { code: 'tidak_ditemukan', message: 'Pengumuman tidak ditemukan atau sudah dihapus.' }, request_id: 'req_7a01c3e5d2' };
  return {
    data: {
      ...p,
      isi: `<p>${p.ringkasan}</p><p>Hal-hal yang perlu diperhatikan:</p><ol><li>Pantau SIAKAD dan email kampus untuk perubahan jadwal.</li><li>Hubungi BAAK lewat layanan akademik bila ada kendala.</li><li>Pengumuman ini berlaku untuk seluruh mahasiswa aktif.</li></ol><p>Terima kasih atas perhatiannya.</p>`,
    },
  };
});
tambahRute(/\/v1\/portal\/pengumuman\/saya$/, (u) => halaman(u, PENGUMUMAN.slice(0, 6)));
tambahRute(/\/v1\/portal\/pengumuman$/, (u) => {
  const pr = u.searchParams.get('prioritas');
  const rows = [...PENGUMUMAN].filter((p) => !pr || p.prioritas === pr).sort((a, b) => Number(b.sematkan) - Number(a.sematkan) || b.terbit_pada.localeCompare(a.terbit_pada));
  return halaman(u, rows);
});
