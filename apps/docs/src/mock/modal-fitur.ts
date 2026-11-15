// Data contoh untuk modal per fitur: katalog + permohonan layanan, syarat kelulusan. Isi rekaan.
import { tambahRute } from './siakad';

const badan = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Record<string, any>;

const JENIS = [
  {
    id: 1,
    kode: 'SKAK',
    nama: 'Surat keterangan aktif kuliah',
    kategori: 'akademik',
    untuk: 'MAHASISWA',
    keterangan: 'Untuk beasiswa, tunjangan orang tua (PNS/TNI/Polri), atau keperluan lain yang meminta bukti masih kuliah.',
    syarat: 'Status aktif pada semester berjalan.\nSudah mengisi KRS semester ini.',
    isian: [
      { nama: 'semester', label: 'Semester', wajib: true, tipe: 'pilihan', opsi: ['Ganjil 2026/2027', 'Genap 2025/2026'] },
      { nama: 'instansi_ortu', label: 'Instansi orang tua', tipe: 'teks', keterangan: 'Isi bila untuk tunjangan orang tua.' },
    ],
    biaya: 0,
    sla_hari: 2,
    wajib_berkas: false,
    terbitkan_dokumen: true,
    aktif: true,
  },
  {
    id: 2,
    kode: 'LEG',
    nama: 'Legalisir ijazah dan transkrip',
    kategori: 'akademik',
    untuk: 'ALUMNI,MAHASISWA',
    keterangan: 'Legalisir cetak, diambil di BAAK atau dikirim.',
    syarat: 'Unggah pindaian ijazah dan transkrip.',
    isian: [{ nama: 'jumlah', label: 'Jumlah rangkap', wajib: true, tipe: 'angka' }],
    biaya: 25000,
    sla_hari: 3,
    wajib_berkas: true,
    terbitkan_dokumen: false,
    aktif: true,
  },
  {
    id: 3,
    kode: 'CUTI',
    nama: 'Cuti akademik',
    kategori: 'akademik',
    untuk: 'MAHASISWA',
    keterangan: 'Berhenti sementara paling lama dua semester.',
    syarat: 'Tidak sedang menerima beasiswa.\nTidak ada tunggakan.',
    isian: [{ nama: 'alasan', label: 'Alasan cuti', wajib: true, tipe: 'panjang' }],
    biaya: 0,
    sla_hari: 5,
    wajib_berkas: false,
    terbitkan_dokumen: true,
    aktif: true,
  },
  {
    id: 4,
    kode: 'DISP',
    nama: 'Dispensasi pembayaran UKT',
    kategori: 'keuangan',
    untuk: 'MAHASISWA',
    keterangan: 'Penundaan pembayaran UKT dengan janji bayar.',
    syarat: null,
    isian: [{ nama: 'janji_bayar', label: 'Tanggal janji bayar', wajib: true, tipe: 'tanggal' }],
    biaya: 0,
    sla_hari: 3,
    wajib_berkas: false,
    terbitkan_dokumen: false,
    aktif: true,
  },
  {
    id: 5,
    kode: 'SKBB',
    nama: 'Surat bebas pustaka',
    kategori: 'umum',
    untuk: '',
    keterangan: 'Syarat yudisium dan wisuda.',
    syarat: null,
    isian: [],
    biaya: 0,
    sla_hari: 1,
    wajib_berkas: false,
    terbitkan_dokumen: true,
    aktif: true,
  },
];
tambahRute(/^\/v1\/layanan\/jenis$/, (u) => {
  const k = u.searchParams.get('kategori');
  return { data: JENIS.filter((j) => !k || j.kategori === k), meta: { total: JENIS.length } };
});
tambahRute(/^\/v1\/layanan\/permohonan$/, (_u, init) => {
  const b = badan(init);
  const j = JENIS.find((x) => x.id === b.jenis_id);
  if (j?.kode === 'CUTI') return { __status: 409, error: { code: 'conflict', message: 'Masa pengajuan cuti semester ini sudah ditutup (contoh galat).' }, request_id: 'req_7f3a91c2d4' };
  return { __status: 201, data: { id: 501, nomor: 'LYN261115-4F2A9C', status: 'diajukan', tenggat: '2026-11-18', jenis_id: b.jenis_id, ...b } };
});

tambahRute(/^\/v1\/kelulusan\/mahasiswa\/[^/]+\/syarat$/, () => ({
  data: {
    nim: '2304110001',
    nama: 'Nurul Aini Hasan',
    kode_prodi: '55201',
    tahun_id: '20261',
    status_aktif: 'A',
    sks: 138,
    ipk: 3.62,
    predikat: 'Dengan pujian',
    akademik: { boleh: false, alasan: 'SKS lulus 138 kurang dari batas prodi 144. Tugas akhir belum dinilai.', sks_lulus_prodi: 144, sks: 138, ipk: 3.62 },
    wisuda: {
      boleh_daftar: false,
      syarat: [
        { kode: 'ta_lulus', nama: 'Tugas akhir/skripsi lulus', terpenuhi: false },
        { kode: 'sks', nama: 'SKS minimal 144', terpenuhi: false, nilai: 138 },
        { kode: 'status_aktif', nama: 'Status mahasiswa aktif (A)', terpenuhi: true, nilai: 'A' },
        { kode: 'nilai_d', nama: 'Mata kuliah bernilai D paling banyak 3', terpenuhi: true },
        { kode: 'nilai_e', nama: 'Tidak ada mata kuliah bernilai E', terpenuhi: true },
      ],
      pendaftaran: null,
      status_pendaftaran: null,
    },
    tambahan: [
      { id: 1, kode: 'skpi', nama: 'Poin SKPI minimal 100', untuk: 'keduanya', jenis: 'poin', wajib: true, terpenuhi: true, nilai: 120, minimal: 100 },
      { id: 2, kode: 'pustaka', nama: 'Bebas pinjaman perpustakaan', untuk: 'wisuda', jenis: 'pustaka', wajib: true, terpenuhi: false },
      { id: 3, kode: 'keu', nama: 'Tidak ada tunggakan keuangan', untuk: 'keduanya', jenis: 'keuangan', wajib: true, terpenuhi: true, nilai: 0 },
    ],
    boleh_yudisium: false,
    boleh_wisuda: false,
    kurang: { yudisium: [], wisuda: ['Bebas pinjaman perpustakaan'] },
    status_akhir: null,
  },
}));
