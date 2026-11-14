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
const STATUS = [['A', 'Aktif'], ['A', 'Aktif'], ['A', 'Aktif'], ['C', 'Cuti'], ['L', 'Lulus'], ['N', 'Non-aktif'], ['A', 'Aktif'], ['D', 'Drop out']];
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
];
const MK_NAMA = ['Algoritma dan Pemrograman', 'Basis Data', 'Struktur Data', 'Pemrograman Web', 'Jaringan Komputer', 'Kecerdasan Buatan', 'Rekayasa Perangkat Lunak', 'Sistem Operasi', 'Statistika', 'Pengantar Manajemen', 'Akuntansi Dasar', 'Hukum Perdata', 'Bahasa Indonesia', 'Pendidikan Pancasila', 'Kewirausahaan', 'Metodologi Penelitian'];
const MATA_KULIAH = MK_NAMA.map((n, i) => ({ id: i + 1, kode_mk: `${['INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'INF', 'MKU', 'MNJ', 'AKT', 'HKM', 'MKU', 'MKU', 'MKU', 'MKU'][i]}${100 + i * 7}`, nama_mk: n, sks_mk: [3, 3, 3, 3, 2, 3, 3, 2, 2, 3, 3, 2, 2, 2, 2, 3][i], semester: (i % 8) + 1, kode_prodi: i < 9 ? '55201' : PRODI[i % PRODI.length].kode_prodi, sifat: i % 5 === 4 ? 'P' : 'W' }));
const SEKOLAH = [
  ['20500101', 'SMA Negeri 1 Marisa', 'Pohuwato', 'SMA'], ['20500102', 'SMA Negeri 1 Paguat', 'Pohuwato', 'SMA'], ['20500103', 'SMK Negeri 1 Marisa', 'Pohuwato', 'SMK'],
  ['20500104', 'MA Negeri 1 Pohuwato', 'Pohuwato', 'MA'], ['20500105', 'SMA Negeri 1 Popayato', 'Pohuwato', 'SMA'], ['20500106', 'SMK Negeri 1 Taluditi', 'Pohuwato', 'SMK'],
  ['20500201', 'SMA Negeri 1 Gorontalo', 'Kota Gorontalo', 'SMA'], ['20500202', 'SMA Negeri 3 Gorontalo', 'Kota Gorontalo', 'SMA'], ['20500203', 'SMK Negeri 1 Gorontalo', 'Kota Gorontalo', 'SMK'],
  ['20500301', 'SMA Negeri 1 Limboto', 'Kab. Gorontalo', 'SMA'], ['20500401', 'SMA Negeri 1 Tilamuta', 'Boalemo', 'SMA'], ['20500501', 'MA Al-Khairaat Marisa', 'Pohuwato', 'MA'],
].map(([kode, nama, kota, jenis]) => ({ kode, nama, kota, jenis }));
const MITRA = ['Universitas Negeri Gorontalo', 'Universitas Gorontalo', 'Universitas Muhammadiyah Gorontalo', 'Universitas Hasanuddin', 'Universitas Sam Ratulangi', 'Institut Teknologi Bandung', 'Universitas Gadjah Mada', 'Universitas Indonesia', 'Universitas Tadulako', 'Universitas Halu Oleo'].map((nama, i) => ({ id: i + 1, nama, kota: ['Gorontalo', 'Gorontalo', 'Gorontalo', 'Makassar', 'Manado', 'Bandung', 'Yogyakarta', 'Depok', 'Palu', 'Kendari'][i] }));
const PROVINSI = [['75', 'Gorontalo'], ['71', 'Sulawesi Utara'], ['72', 'Sulawesi Tengah'], ['73', 'Sulawesi Selatan'], ['74', 'Sulawesi Tenggara'], ['76', 'Sulawesi Barat'], ['31', 'DKI Jakarta'], ['32', 'Jawa Barat'], ['35', 'Jawa Timur'], ['64', 'Kalimantan Timur']].map(([kode, nama]) => ({ kode, nama }));
const KABUPATEN: Record<string, Array<{ kode: string; nama: string }>> = {
  '75': [['7501', 'Kab. Gorontalo'], ['7502', 'Kab. Boalemo'], ['7503', 'Kab. Bone Bolango'], ['7504', 'Kab. Pohuwato'], ['7505', 'Kab. Gorontalo Utara'], ['7571', 'Kota Gorontalo']].map(([kode, nama]) => ({ kode, nama })),
};
const TAHUN = ['20251', '20242', '20241', '20232', '20231'].map((t, i) => ({ tahun_id: t, nama_tahun: `${t.slice(0, 4)}/${Number(t.slice(0, 4)) + 1} ${t.endsWith('1') ? 'Ganjil' : 'Genap'}`, buka: i === 0 ? 'Y' : 'N' }));

function cocok(q: string | null, ...vals: unknown[]) {
  if (!q) return true;
  const s = q.toLowerCase();
  return vals.some((v) => String(v ?? '').toLowerCase().includes(s));
}
function halaman<T>(rows: T[], u: URL) {
  const per = Number(u.searchParams.get('per_page') ?? 20);
  const page = Number(u.searchParams.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / per)) } };
}
function eq(u: URL, key: string, val: unknown) {
  const v = u.searchParams.get(key);
  return !v || v.split(',').includes(String(val));
}

const ROUTES: Array<[RegExp, (u: URL, init?: RequestInit) => unknown]> = [
  [/\/v1\/referensi\/prodi$/, () => ({ data: PRODI })],
  [/\/v1\/referensi\/tahun-akademik$/, () => ({ data: TAHUN })],
  [/\/v1\/mahasiswa$/, (u) => halaman(MAHASISWA.filter((m) => cocok(u.searchParams.get('q'), m.nim, m.nama) && eq(u, 'prodi', m.kode_prodi) && eq(u, 'angkatan', m.tahun_masuk) && eq(u, 'status', m.status_aktif) && eq(u, 'kelas', m.kelas)), u)],
  [/\/v1\/dosen$/, (u) => halaman(DOSEN.filter((d) => cocok(u.searchParams.get('q'), d.nidn, d.nama) && eq(u, 'prodi', d.kode_prodi) && eq(u, 'status', d.status)), u)],
  [/\/v1\/sdm\/pegawai$/, (u) => halaman(PEGAWAI.filter((p) => cocok(u.searchParams.get('q'), p.nama, p.nip, p.nidn) && eq(u, 'jenis', p.jenis)), u)],
  [/\/v1\/mata-kuliah$/, (u) => halaman(MATA_KULIAH.filter((m) => cocok(u.searchParams.get('q'), m.kode_mk, m.nama_mk) && eq(u, 'prodi', m.kode_prodi) && eq(u, 'semester', m.semester)), u)],
  [/\/v1\/pmb\/info\/sekolah$/, (u) => ({ data: SEKOLAH.filter((s) => cocok(u.searchParams.get('q'), s.nama, s.kota)).slice(0, 10) })],
  [/\/v1\/kerjasama\/mitra$/, (u) => halaman(MITRA.filter((m) => cocok(u.searchParams.get('q'), m.nama, m.kota)), u)],
  [/\/v1\/tracer\/referensi\/wilayah$/, (u) => ({ data: u.searchParams.get('propinsi') ? (KABUPATEN[u.searchParams.get('propinsi')!] ?? []) : PROVINSI })],
];

/** Rute tambahan dari halaman demo lain (tabel, status layanan, kalender, …). */
export function tambahRute(pola: RegExp, balas: (u: URL, init?: RequestInit) => unknown) {
  ROUTES.unshift([pola, balas]);
}
export { MAHASISWA, DOSEN, PEGAWAI, MATA_KULIAH, PRODI };

const mockFetch: typeof fetch = async (input, init) => {
  const u = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 220));
  if (init?.signal?.aborted) throw new DOMException('Dibatalkan', 'AbortError');
  const route = ROUTES.find(([re]) => re.test(u.pathname));
  if (!route) return new Response(JSON.stringify({ error: { message: `Contoh belum ada untuk ${u.pathname}` } }), { status: 404, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify(await route[1](u, init)), { status: 200, headers: { 'content-type': 'application/json' } });
};

export const siakadDemo = new Siakad({ baseUrl: 'https://api.unipo.ac.id', accessToken: 'token-demo', fetch: mockFetch });
