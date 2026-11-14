// Data contoh LMS (/v1/lms) dan CBT (/v1/cbt). Bentuk mengikuti respons API SIAKAD; isi rekaan.
import { MAHASISWA, tambahRute } from './siakad';

const L = '/v1/lms';
const jam = (h: number, menit = 0) => {
  const d = new Date(Date.now() + h * 3_600_000);
  d.setMinutes(menit, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
};
const hariKe = (hari: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  d.setHours(h, m, 0, 0);
  return jam((d.getTime() - Date.now()) / 3_600_000, m);
};

const KELAS = [
  { id: 41, kode_mk: 'IF301', kelas: 'A', judul: 'Basis Data', tahun_id: '20251', status: 'aktif', peran: 'mahasiswa', persen: 72 },
  { id: 42, kode_mk: 'IF302', kelas: 'A', judul: 'Pemrograman Berorientasi Objek', tahun_id: '20251', status: 'aktif', peran: 'mahasiswa', persen: 45 },
  { id: 43, kode_mk: 'IF303', kelas: 'B', judul: 'Arsitektur Komputer', tahun_id: '20251', status: 'aktif', peran: 'mahasiswa', persen: 100 },
  { id: 44, kode_mk: 'IF304', kelas: 'A', judul: 'Interaksi Manusia dan Komputer', tahun_id: '20251', status: 'aktif', peran: 'mahasiswa', persen: 18 },
  { id: 45, kode_mk: 'IF306', kelas: 'A', judul: 'Etika Profesi', tahun_id: '20251', status: 'aktif', peran: 'asisten', persen: null },
  { id: 46, kode_mk: 'IF308', kelas: 'C', judul: 'Komputasi Numerik', tahun_id: '20251', status: 'aktif', peran: 'mahasiswa', persen: 60 },
];

tambahRute(new RegExp(`${L}/saya$`), () => ({
  data: {
    pengguna: { username: '2023550101', nama: 'Nurul Fadilah', level: 'MAHASISWA' },
    jumlah_kelas: KELAS.length,
    notifikasi_belum_dibaca: 3,
    tugas_mendatang: [
      { id: 301, kelas_id: 41, kelas: 'Basis Data', judul: 'Rancangan ERD sistem perpustakaan', tenggat: jam(5, 59), status_jawaban: 'draf' },
      { id: 302, kelas_id: 42, kelas: 'Pemrograman Berorientasi Objek', judul: 'Implementasi pola Strategy', tenggat: hariKe(1, 23, 59), status_jawaban: null },
      { id: 303, kelas_id: 44, kelas: 'Interaksi Manusia dan Komputer', judul: 'Laporan uji kegunaan (5 responden)', tenggat: hariKe(3, 17, 0), status_jawaban: 'dikembalikan' },
      { id: 304, kelas_id: 46, kelas: 'Komputasi Numerik', judul: 'Metode Newton-Raphson', tenggat: hariKe(6, 23, 59), status_jawaban: 'dikumpulkan' },
      { id: 305, kelas_id: 43, kelas: 'Arsitektur Komputer', judul: 'Simulasi pipeline 5 tahap', tenggat: hariKe(9, 12, 0), status_jawaban: null },
    ],
    kuis_terbuka: [
      { id: 71, kelas_id: 41, kelas: 'Basis Data', judul: 'Kuis 3: Normalisasi', mulai: jam(-20), selesai: jam(28) },
      { id: 72, kelas_id: 46, kelas: 'Komputasi Numerik', judul: 'Kuis galat dan pembulatan', mulai: jam(-2), selesai: jam(3) },
    ],
    perlu_dinilai: null,
  },
}));

tambahRute(new RegExp(`${L}/kelas$`), () => ({
  data: KELAS.map(({ persen: _p, ...k }) => ({ ...k, kode_prodi: '55201', format: 'mingguan', sampul_url: null, idj: 9000 + k.id })),
  meta: { total: KELAS.length },
}));

// Kelas 900: tampilan pengajar (semua peserta). Kelas lain: tampilan mahasiswa (satu baris).
const PESERTA = MAHASISWA.slice(0, 18);
tambahRute(new RegExp(`${L}/kelas/\\d+/progres$`), (u) => {
  const id = Number(u.pathname.split('/').at(-2));
  const tot = { materi_wajib: 12, tugas: 5, kuis: 3 };
  const total = tot.materi_wajib + tot.tugas + tot.kuis;
  if (id === 900) {
    return {
      data: {
        total_aktivitas: tot,
        mahasiswa: PESERTA.map((m, i) => {
          const materi = Math.min(12, (i * 7) % 13);
          const tugas = Math.min(5, (i * 3) % 6);
          const kuis = Math.min(3, (i * 2) % 4);
          const s = materi + tugas + kuis;
          return { nim: m.nim, materi_selesai: materi, tugas_dikumpulkan: tugas, kuis_dikerjakan: kuis, selesai: s, total, persen: Math.round((s / total) * 1000) / 10 };
        }),
      },
    };
  }
  const k = KELAS.find((x) => x.id === id);
  const persen = k?.persen ?? 64;
  const s = Math.round((persen / 100) * total);
  return {
    data: {
      total_aktivitas: tot,
      mahasiswa: [
        {
          nim: '2023550101',
          materi_selesai: Math.min(12, Math.round(s * 0.6)),
          tugas_dikumpulkan: Math.min(5, Math.round(s * 0.25)),
          kuis_dikerjakan: Math.min(3, s - Math.min(12, Math.round(s * 0.6)) - Math.min(5, Math.round(s * 0.25))),
          selesai: s,
          total,
          persen,
        },
      ],
    },
  };
});
tambahRute(new RegExp(`${L}/kelas/\\d+/peserta$`), () => ({
  data: [{ username: '0412088501', nama: 'Rahmat Hidayat, M.Kom', peran: 'pengajar' }, ...PESERTA.map((m) => ({ username: m.nim, nama: m.nama, peran: 'mahasiswa' }))],
}));

tambahRute(new RegExp(`${L}/kalender$`), () => ({
  data: [
    { jenis: 'presensi', id: 811, kelas_id: 41, kelas: 'Basis Data', judul: 'Pertemuan 9', waktu: hariKe(0, 8, 0), selesai: hariKe(0, 9, 40) },
    { jenis: 'tugas', id: 301, kelas_id: 41, kelas: 'Basis Data', judul: 'Rancangan ERD sistem perpustakaan', waktu: jam(5, 59) },
    { jenis: 'konferensi', id: 551, kelas_id: 44, kelas: 'Interaksi Manusia dan Komputer', judul: 'Diskusi prototipe (daring)', waktu: hariKe(1, 13, 0), selesai: hariKe(1, 14, 30) },
    { jenis: 'tugas', id: 302, kelas_id: 42, kelas: 'Pemrograman Berorientasi Objek', judul: 'Implementasi pola Strategy', waktu: hariKe(1, 23, 59) },
    { jenis: 'kuis', id: 73, kelas_id: 42, kelas: 'Pemrograman Berorientasi Objek', judul: 'Kuis 4: Pewarisan dan polimorfisme', waktu: hariKe(2, 10, 0), selesai: hariKe(2, 11, 0) },
    { jenis: 'presensi', id: 812, kelas_id: 46, kelas: 'Komputasi Numerik', judul: 'Pertemuan 9', waktu: hariKe(2, 13, 0), selesai: hariKe(2, 15, 30) },
    { jenis: 'tugas', id: 303, kelas_id: 44, kelas: 'Interaksi Manusia dan Komputer', judul: 'Laporan uji kegunaan (5 responden)', waktu: hariKe(3, 17, 0) },
  ].sort((a, b) => a.waktu.localeCompare(b.waktu)),
}));

// ================================================================ CBT
const C = '/v1/cbt';
type Soal = { soal_id: number; jenis: string; pertanyaan: string; opsi: unknown; poin: number; jawaban: unknown; ragu: boolean };
const SOAL: Soal[] = [
  {
    soal_id: 1,
    jenis: 'pilihan_ganda',
    pertanyaan: '<p>Bentuk normal yang menghilangkan <b>ketergantungan parsial</b> terhadap kunci primer komposit adalah…</p>',
    opsi: [
      { id: 'a', teks: '1NF' },
      { id: 'b', teks: '2NF' },
      { id: 'c', teks: '3NF' },
      { id: 'd', teks: 'BCNF' },
    ],
    poin: 2,
    jawaban: 'b',
    ragu: false,
  },
  {
    soal_id: 2,
    jenis: 'pilihan_ganda_banyak',
    pertanyaan: '<p>Manakah yang termasuk perintah <i>Data Manipulation Language</i> (DML)? Pilih semua yang benar.</p>',
    opsi: [
      { id: 'a', teks: '<code>SELECT</code>' },
      { id: 'b', teks: '<code>CREATE TABLE</code>' },
      { id: 'c', teks: '<code>UPDATE</code>' },
      { id: 'd', teks: '<code>DELETE</code>' },
      { id: 'e', teks: '<code>GRANT</code>' },
    ],
    poin: 3,
    jawaban: ['a', 'c'],
    ragu: true,
  },
  { soal_id: 3, jenis: 'benar_salah', pertanyaan: '<p>Indeks selalu mempercepat operasi <code>INSERT</code> pada tabel.</p>', opsi: null, poin: 1, jawaban: null, ragu: false },
  {
    soal_id: 4,
    jenis: 'isian_singkat',
    pertanyaan: '<p>Sifat transaksi yang menjamin perubahan tetap ada setelah <i>commit</i> walaupun sistem mati disebut…</p>',
    opsi: null,
    poin: 2,
    jawaban: null,
    ragu: false,
  },
  {
    soal_id: 5,
    jenis: 'menjodohkan',
    pertanyaan: '<p>Pasangkan tingkat isolasi dengan anomali yang <b>masih mungkin</b> terjadi.</p>',
    opsi: {
      kiri: [
        { id: 'k1', teks: 'Read uncommitted' },
        { id: 'k2', teks: 'Read committed' },
        { id: 'k3', teks: 'Repeatable read' },
      ],
      kanan: [
        { id: 'r1', teks: 'Dirty read' },
        { id: 'r2', teks: 'Non-repeatable read' },
        { id: 'r3', teks: 'Phantom read' },
      ],
    },
    poin: 3,
    jawaban: null,
    ragu: false,
  },
  {
    soal_id: 6,
    jenis: 'esai',
    pertanyaan: '<p>Jelaskan perbedaan <i>clustered</i> dan <i>non-clustered index</i>, lalu beri satu contoh kapan masing-masing tepat dipakai.</p>',
    opsi: null,
    poin: 9,
    jawaban: null,
    ragu: false,
  },
];
for (let i = 7; i <= 25; i++) {
  SOAL.push({
    soal_id: i,
    jenis: 'pilihan_ganda',
    pertanyaan: `<p>Soal latihan nomor ${i}: kueri mana yang mengembalikan jumlah mahasiswa per prodi?</p>`,
    opsi: [
      { id: 'a', teks: '<code>SELECT prodi, COUNT(*) FROM mhs GROUP BY prodi</code>' },
      { id: 'b', teks: '<code>SELECT prodi, SUM(*) FROM mhs</code>' },
      { id: 'c', teks: '<code>SELECT COUNT(prodi) FROM mhs ORDER BY prodi</code>' },
      { id: 'd', teks: '<code>SELECT DISTINCT prodi FROM mhs</code>' },
    ],
    poin: 1,
    jawaban: i % 3 === 0 ? null : i % 4 === 0 ? 'c' : 'a',
    ragu: i === 11,
  });
}
let statusPeserta = 'mengerjakan';
let batas = Date.now() + 47 * 60_000;
const lembar = () => ({
  peserta_id: 9001,
  ujian: { id: 31, kode: 'UTS-IF301', nama: 'UTS Basis Data', jenis: 'uts', petunjuk: null, durasi_menit: 90, tampil_hasil: 1 },
  status: statusPeserta,
  mulai_pada: jam(-0.7),
  batas_waktu: jam((batas - Date.now()) / 3_600_000),
  sisa_detik: statusPeserta === 'mengerjakan' ? Math.max(0, Math.round((batas - Date.now()) / 1000)) : 0,
  ...(statusPeserta === 'mengerjakan'
    ? { soal: SOAL.map((s, i) => ({ nomor: i + 1, ...s })), terjawab: SOAL.filter((s) => s.jawaban != null).length }
    : { hasil: { skor: 31.5, skor_maks: 39, nilai: 80.8, lulus: true, perlu_koreksi: true } }),
});

tambahRute(new RegExp(`${C}/saya$`), () => ({
  data: [
    {
      id: 9001,
      status: 'mengerjakan',
      nomor_peserta: 'IF-031-017',
      mulai_pada: jam(-0.7),
      batas_waktu: jam(0.8),
      selesai_pada: null,
      ujian_id: 31,
      kode: 'UTS-IF301',
      ujian: 'UTS Basis Data',
      jenis: 'uts',
      kode_mk: 'IF301',
      durasi_menit: 90,
      petunjuk: null,
      ujian_status: 'siap',
      sesi_id: 1,
      sesi: 'Sesi 1 · Lab Komputer 2',
      mulai: jam(-1, 0),
      selesai: jam(1, 0),
      ruang_id: 'LAB2',
      sesi_status: 'dibuka',
      sisa_detik: 2820,
      bisa_mulai: true,
    },
    {
      id: 9002,
      status: 'terdaftar',
      nomor_peserta: 'IF-032-017',
      mulai_pada: null,
      batas_waktu: null,
      selesai_pada: null,
      ujian_id: 32,
      kode: 'UTS-IF302',
      ujian: 'UTS Pemrograman Berorientasi Objek',
      jenis: 'uts',
      kode_mk: 'IF302',
      durasi_menit: 100,
      petunjuk: null,
      ujian_status: 'siap',
      sesi_id: 4,
      sesi: 'Sesi 2 · Lab Komputer 1',
      mulai: jam(1.5, 0),
      selesai: jam(3.5, 0),
      ruang_id: 'LAB1',
      sesi_status: 'dibuka',
      sisa_detik: null,
      bisa_mulai: true,
    },
    {
      id: 9003,
      status: 'terdaftar',
      nomor_peserta: 'IF-033-017',
      mulai_pada: null,
      batas_waktu: null,
      selesai_pada: null,
      ujian_id: 33,
      kode: 'TOEFL-PRED',
      ujian: 'Tes Prediksi TOEFL',
      jenis: 'bahasa',
      kode_mk: null,
      durasi_menit: 120,
      petunjuk: null,
      ujian_status: 'siap',
      sesi_id: 7,
      sesi: 'Sesi pagi · Aula',
      mulai: hariKe(3, 8, 0),
      selesai: hariKe(3, 10, 30),
      ruang_id: 'AULA',
      sesi_status: 'terjadwal',
      sisa_detik: null,
      bisa_mulai: false,
    },
    {
      id: 8990,
      status: 'selesai',
      nomor_peserta: 'IF-020-017',
      mulai_pada: hariKe(-6, 8, 2),
      batas_waktu: hariKe(-6, 9, 32),
      selesai_pada: hariKe(-6, 9, 18),
      ujian_id: 20,
      kode: 'KUIS-IF303',
      ujian: 'Kuis Arsitektur Komputer',
      jenis: 'kuis',
      kode_mk: 'IF303',
      durasi_menit: 60,
      petunjuk: null,
      ujian_status: 'selesai',
      sesi_id: 2,
      sesi: 'Sesi 1',
      mulai: hariKe(-6, 8, 0),
      selesai: hariKe(-6, 9, 30),
      ruang_id: null,
      sesi_status: 'ditutup',
      sisa_detik: null,
      bisa_mulai: false,
    },
  ],
}));
tambahRute(new RegExp(`${C}/kerjakan/\\d+$`), () => ({ data: lembar() }));
tambahRute(new RegExp(`${C}/kerjakan/\\d+/mulai$`), (_u, init) => {
  const b = JSON.parse(String(init?.body ?? '{}')) as { token?: string };
  if (b.token !== undefined && b.token !== 'UNIPO7')
    return { __status: 422, error: { code: 'validation_error', message: 'Token salah. Minta token terbaru ke pengawas (contoh: UNIPO7).', fields: { token: 'token salah' } } };
  statusPeserta = 'mengerjakan';
  batas = Date.now() + 47 * 60_000;
  return { data: lembar() };
});
tambahRute(new RegExp(`${C}/kerjakan/\\d+/jawab$`), (_u, init) => {
  const b = JSON.parse(String(init?.body ?? '{}')) as { soal_id: number; jawaban: unknown; ragu?: boolean };
  const s = SOAL.find((x) => x.soal_id === b.soal_id);
  if (s) Object.assign(s, { jawaban: b.jawaban ?? null, ragu: !!b.ragu });
  return { data: { soal_id: b.soal_id, tersimpan: jam(0), sisa_detik: Math.max(0, Math.round((batas - Date.now()) / 1000)) } };
});
tambahRute(new RegExp(`${C}/kerjakan/\\d+/selesai$`), () => {
  statusPeserta = 'selesai';
  const out = { data: lembar() };
  // Contoh dibuka lagi setelah beberapa detik agar demo bisa dicoba ulang.
  setTimeout(() => (statusPeserta = 'mengerjakan'), 4000);
  return out;
});
