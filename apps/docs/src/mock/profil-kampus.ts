import { tambahRute } from './siakad';

/**
 * Struktur organisasi portal (/v1/portal/struktur) dan testimoni landing PMB (/v1/pmb/info/landing) untuk demo
 * SambutanPortal, StrukturPortal, dan TestimoniPmb. Nama dan isi rekaan.
 */
const foto = (n: number) => ({ url: `contoh/potret-${n}.svg`, alt: null });
const SAMBUTAN_REKTOR = [
  'Assalamualaikum warahmatullahi wabarakatuh. Puji syukur kita panjatkan ke hadirat Tuhan Yang Maha Esa, karena atas rahmat-Nya Universitas Pohuwato terus tumbuh sebagai kampus yang unggul, berkarakter, dan berdaya saing di kawasan Teluk Tomini.',
  'Kami percaya pendidikan tinggi harus dekat dengan kebutuhan masyarakat. Karena itu kurikulum kami disusun bersama mitra industri dan pemerintah daerah, dengan pembelajaran berbasis proyek, magang, dan kegiatan Merdeka Belajar yang membuka pengalaman nyata bagi mahasiswa.',
  'Dalam tiga tahun terakhir, akreditasi program studi terus meningkat, jumlah penelitian dosen yang didanai bertambah, dan layanan akademik sudah sepenuhnya daring melalui SIAKAD, e-learning, dan layanan mandiri mahasiswa.',
  'Kepada calon mahasiswa, kami mengundang Anda bergabung dan tumbuh bersama. Kepada alumni dan mitra, terima kasih atas dukungan yang terus menguatkan langkah kami.',
  'Mari bersama membangun Pohuwato dan Indonesia melalui ilmu pengetahuan. Wassalamualaikum warahmatullahi wabarakatuh.',
]
  .map((p) => `<p>${p}</p>`)
  .join('');

const s = (id: number, jabatan: string, nama: string | null, grup: string, urutan: number, f?: number, extra: Record<string, unknown> = {}) => ({
  id,
  jabatan,
  jabatan_en: null,
  grup,
  nidn: null,
  nama,
  foto: f ? foto(f) : null,
  sambutan: null,
  periode_mulai: '2024-03-01',
  periode_selesai: '2028-02-28',
  urutan,
  aktif: true,
  ...extra,
});

const STRUKTUR: Record<string, ReturnType<typeof s>[]> = {
  univ: [
    s(1, 'Rektor', 'Dr. Rahmat Hidayat, M.Pd.', 'Pimpinan', 1, 1, { sambutan: SAMBUTAN_REKTOR, nidn: '0912037801' }),
    s(2, 'Wakil Rektor I Bidang Akademik', 'Dr. Nurhayati Lamato, M.Si.', 'Pimpinan', 2, 2),
    s(3, 'Wakil Rektor II Bidang Keuangan dan Umum', 'Irwan Mokodompit, S.E., M.M.', 'Pimpinan', 3, 3),
    s(4, 'Wakil Rektor III Bidang Kemahasiswaan', 'Dr. Fadli Hasan, M.Kom.', 'Pimpinan', 4, 4),
    s(10, 'Dekan Fakultas Ilmu Komputer', 'Dr. Sri Wahyuni Pakaya, M.T.', 'Fakultas', 10, 5),
    s(11, 'Dekan Fakultas Ekonomi', 'Dr. Yusuf Abdullah, M.Ak.', 'Fakultas', 11),
    s(12, 'Dekan Fakultas Hukum', 'Hasanuddin Ali, S.H., M.H.', 'Fakultas', 12, 6),
    s(13, 'Dekan Fakultas Pertanian', null, 'Fakultas', 13),
    s(20, 'Kepala LPPM', 'Dr. Ratna Dewi Usman, M.P.', 'Lembaga', 20),
    s(21, 'Kepala LPM', 'Moh. Arif Rahman, M.Pd.', 'Lembaga', 21),
    s(22, 'Kepala Pustikom', 'Anwar Djafar, M.Kom.', 'Lembaga', 22),
    s(30, 'Kepala Biro Akademik dan Kemahasiswaan', 'Siti Aisyah Monoarfa, S.Kom.', 'Biro', 30),
    s(31, 'Kepala Biro Keuangan', 'Rudi Hartono Kadir, S.E.', 'Biro', 31),
  ],
};

tambahRute(/\/v1\/portal\/struktur$/, (u) => {
  const situs = u.searchParams.get('situs') ?? 'univ';
  const grup = u.searchParams.get('grup');
  const d = (STRUKTUR[situs] ?? []).filter((x) => !grup || x.grup === grup);
  return { data: d, meta: { total: d.length, page: 1, per_page: 100 } };
});

const t = (id: number, nama: string, peran: string, nama_prodi: string, isi: string, rating: number, f?: number, video_url: string | null = null) => ({
  id,
  nama,
  peran,
  kode_prodi: null,
  nama_prodi,
  foto: f ? `contoh/potret-${f}.svg` : null,
  isi,
  rating,
  video_url,
});

export const TESTIMONI_PMB = [
  t(
    1,
    'Nadia Putri Hulopi',
    'Alumni 2022 · Software Engineer',
    'S1 Informatika',
    'Proyek akhir saya dibimbing langsung bersama mitra industri. Saat lulus saya sudah punya portofolio dan langsung diterima bekerja di perusahaan teknologi di Makassar.',
    5,
    2,
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  ),
  t(
    2,
    'Rizky Pratama Daud',
    'Mahasiswa semester 5',
    'S1 Sistem Informasi',
    'Dosennya mudah ditemui dan kelasnya banyak praktik. Lewat program magang saya bisa membantu digitalisasi UMKM di desa sendiri.',
    5,
    1,
  ),
  t(
    3,
    'Fitriani Ismail',
    'Alumni 2021 · ASN Pemda Pohuwato',
    'S1 Manajemen',
    'Ilmu manajemen keuangan daerah yang saya pelajari di UNIPO benar-benar terpakai di pekerjaan. Jejaring alumninya juga kuat.',
    4,
    5,
  ),
  t(
    4,
    'Bapak Hamzah Lasimpala',
    'Orang tua mahasiswa',
    'S1 Agroteknologi',
    'Biaya kuliah terjangkau dan kampusnya dekat. Anak saya bisa kuliah sambil membantu kebun keluarga dan tetap lulus tepat waktu.',
    5,
  ),
  t(5, 'Dewi Kartika Bumulo', 'Mahasiswa semester 3', 'S1 Ilmu Hukum', 'Klinik hukum kampus membuat saya berani tampil. Saya sudah ikut dua kali lomba peradilan semu tingkat nasional.', 4, 2),
  t(6, 'Andi Saputra Gobel', 'Alumni 2023 · Wirausaha', 'S1 Akuntansi', 'Inkubator bisnis kampus membantu saya mendirikan usaha jasa pembukuan untuk UMKM. Sekarang sudah punya enam karyawan.', 5, 3),
  t(7, 'PT Teluk Tomini Agro', 'Mitra industri', 'Kerja sama magang', 'Mahasiswa magang dari UNIPO disiplin dan cepat belajar. Tiga di antaranya kami rekrut menjadi karyawan tetap.', 4),
  t(8, 'Sarah Mokoginta', 'Mahasiswa semester 7', 'S1 Informatika', 'Fasilitas lab cukup lengkap dan ada komunitas pemrograman yang aktif. Semua layanan akademik sudah bisa lewat aplikasi.', 4, 6),
];

tambahRute(/\/v1\/pmb\/info\/landing$/, () => ({ data: { pengaturan: {}, testimoni: TESTIMONI_PMB, faq: [], prodi: [] } }));
