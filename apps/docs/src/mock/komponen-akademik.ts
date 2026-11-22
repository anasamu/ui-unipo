// Data contoh untuk galeri komponen akademik: skala nilai (m_nilai), predikat (m_predikat), tahapan periode
// (kalender terpadu sumber tahun/batas), jadwal mahasiswa satu minggu, dan syarat berkas. Isi rekaan.
import { LEWATI, MAHASISWA, tambahRute } from './siakad';

/** Mahasiswa contoh galeri komponen akademik (rute jadwal di bawah hanya menjawab NIM ini). */
export const NIM_AKADEMIK = MAHASISWA[1]!.nim;

const NILAI: Array<[string, number, boolean, number, number]> = [
  ['A', 4, true, 85, 100],
  ['A-', 3.75, true, 80, 84.99],
  ['B+', 3.5, true, 75, 79.99],
  ['B', 3, true, 70, 74.99],
  ['B-', 2.75, true, 65, 69.99],
  ['C+', 2.5, true, 60, 64.99],
  ['C', 2, true, 55, 59.99],
  ['D', 1, false, 45, 54.99],
  ['E', 0, false, 0, 44.99],
];
tambahRute(/\/v1\/referensi\/skala-nilai$/, (u) => ({
  data: NILAI.map(([nilai, bobot, lulus, min, max], i) => ({ idn: i + 1, kode_prodi: u.searchParams.get('prodi') ?? '', kode_jenjang: 'C', tahun_id: '20231', nilai, bobot, lulus: lulus ? 1 : 0, nilai_min: min, nilai_max: max })),
}));

tambahRute(/\/v1\/kelulusan\/predikat$/, () => ({
  data: [
    { predikat: 'Dengan pujian', kode_jenjang: 'C', bobot_min: 3.51, bobot_max: 4 },
    { predikat: 'Sangat memuaskan', kode_jenjang: 'C', bobot_min: 3.01, bobot_max: 3.5 },
    { predikat: 'Memuaskan', kode_jenjang: 'C', bobot_min: 2.76, bobot_max: 3 },
  ],
}));

const iso = (selisih: number) => {
  const d = new Date();
  d.setDate(d.getDate() + selisih);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const TAHAPAN_CONTOH = [
  { sumber: 'tahun', jenis: 'krs', judul: 'Pengisian KRS online', mulai: iso(-6), selesai: iso(3) },
  { sumber: 'batas', jenis: 'krs', judul: 'Persetujuan KRS oleh dosen PA', mulai: iso(-4), selesai: iso(6) },
  { sumber: 'tahun', jenis: 'perkuliahan', judul: 'Perkuliahan', mulai: iso(8), selesai: iso(120) },
  { sumber: 'tahun', jenis: 'ujian', judul: 'Ujian tengah semester', mulai: iso(57), selesai: iso(63) },
  { sumber: 'tahun', jenis: 'ujian', judul: 'Ujian akhir semester', mulai: iso(122), selesai: iso(130) },
  { sumber: 'batas', jenis: 'nilai', judul: 'Input nilai dosen', mulai: iso(124), selesai: iso(140) },
  { sumber: 'tahun', jenis: 'akademik', judul: 'Pengisian EDOM', mulai: iso(-30), selesai: iso(-20) },
].map((k, i) => ({ id: 900 + i, ...k }));

// Kalender terpadu: hanya permintaan tahapan (sumber tahun/batas) yang dijawab di sini; sisanya ke rute kalender umum.
tambahRute(/\/v1\/kalender\/terpadu$/, (u) => {
  const s = (u.searchParams.get('sumber') ?? '').split(',').filter(Boolean);
  if (!s.length || s.some((x) => x !== 'tahun' && x !== 'batas')) return LEWATI;
  return { data: TAHAPAN_CONTOH.filter((k) => s.includes(k.sumber)) };
});

// Jadwal satu minggu untuk mahasiswa contoh (termasuk dua kelas yang waktunya bertumpuk dan satu kelas tanpa jam).
const hariIni = String(((new Date().getDay() + 6) % 7) + 1);
export const JADWAL_MINGGU = [
  { idj: 1, hari: '1', jam_mulai: '07:30:00', jam_selesai: '10:00:00', kode_mk: 'INF301', nama_mk: 'Pemrograman Berorientasi Objek', sks: 3, kelas: 'A', nama_ruang: 'Lab Komputer 1', dosen: { nama: 'Dr. Rahmat Hidayat, M.Kom.' } },
  { idj: 2, hari: '1', jam_mulai: '13:00:00', jam_selesai: '14:40:00', kode_mk: 'MKU301', nama_mk: 'Kewirausahaan', sks: 2, kelas: 'A', nama_ruang: 'R.204', dosen: { nama: 'Nurul Fadilah, S.E., M.M.' } },
  { idj: 3, hari: '2', jam_mulai: '08:00:00', jam_selesai: '10:30:00', kode_mk: 'INF302', nama_mk: 'Sistem Operasi', sks: 3, kelas: 'A', nama_ruang: 'R.301', dosen: { nama: 'Andi Saputra, M.T.' } },
  { idj: 4, hari: '3', jam_mulai: '10:00:00', jam_selesai: '12:30:00', kode_mk: 'INF303', nama_mk: 'Jaringan Komputer', sks: 3, kelas: 'B', nama_ruang: 'Lab Jaringan', dosen: { nama: 'Siti Aminah, M.T.' } },
  { idj: 5, hari: '3', jam_mulai: '11:00:00', jam_selesai: '12:40:00', kode_mk: 'INF390', nama_mk: 'Praktikum Jaringan', sks: 1, kelas: 'B', nama_ruang: 'Lab Jaringan', dosen: { nama: 'Siti Aminah, M.T.' } },
  { idj: 6, hari: '4', jam_mulai: '13:00:00', jam_selesai: '15:30:00', kode_mk: 'INF304', nama_mk: 'Interaksi Manusia dan Komputer', sks: 3, kelas: 'A', nama_ruang: 'R.302', dosen: { nama: 'Moh. Yusuf, M.Kom.' } },
  { idj: 7, hari: '5', jam_mulai: '08:00:00', jam_selesai: '10:30:00', kode_mk: 'INF305', nama_mk: 'Analisis dan Desain Algoritma', sks: 3, kelas: 'A', nama_ruang: 'R.301', dosen: { nama: 'Dr. Rahmat Hidayat, M.Kom.' } },
  { idj: 8, hari: hariIni, jam_mulai: '15:45:00', jam_selesai: '17:25:00', kode_mk: 'INF306', nama_mk: 'Etika Profesi', sks: 2, kelas: 'A', nama_ruang: 'R.204', dosen: { nama: 'Nurul Fadilah, S.E., M.M.' } },
  { idj: 9, hari: '6', jam_ke: 2, kode_mk: 'INF399', nama_mk: 'Kuliah Kerja Lapangan (terjadwal prodi)', sks: 2, kelas: 'A' },
];
tambahRute(/\/v1\/mahasiswa\/[^/]+\/jadwal$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[3]!);
  return nim === NIM_AKADEMIK ? { data: { nim, tahun_id: '20261', jadwal: JADWAL_MINGGU } } : LEWATI;
});
