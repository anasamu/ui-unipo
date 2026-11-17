// Data contoh untuk dasbor per unit kerja. Angka rekaan, bentuk mengikuti respons API SIAKAD.
import { PRODI, tambahRute } from './siakad';

const now = new Date();
const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
const hariLalu = (n: number, h = 0) => {
  const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, h, 0);
  return h ? `${iso(x)} ${String(h).padStart(2, '0')}:00:00` : iso(x);
};
// Acak yang stabil supaya tangkapan layar sama tiap kali.
let benih = 7;
const acak = () => ((benih = (benih * 16807) % 2147483647) - 1) / 2147483646;
const antara = (a: number, b: number) => Math.round(a + acak() * (b - a));

// ---------------------------------------------------------------- BAAK
const AKTIF = [612, 548, 734, 401, 288, 356, 497];
tambahRute(/\/v1\/dasbor\/ringkas$/, () => {
  const per_prodi = PRODI.map((p, i) => {
    const aktif = AKTIF[i]!;
    const krs = Math.round(aktif * (0.86 + (i % 3) * 0.04));
    const dosen = Math.round(aktif / (24 + i * 3));
    return {
      kode_prodi: p.kode_prodi,
      nama_prodi: p.nama_prodi,
      jenjang: p.kode_jenjang,
      mahasiswa_aktif: aktif,
      mengisi_krs: krs,
      dosen,
      rasio_dosen_mahasiswa: `1:${Math.round(aktif / dosen)}`,
      persen_krs: Math.round((krs / aktif) * 1000) / 10,
      rata_ipk_lulusan: 3.2 + (i % 4) * 0.07,
      rata_sks_krs: 19.4 + (i % 3) * 0.6,
    };
  });
  const sum = (k: 'mahasiswa_aktif' | 'mengisi_krs' | 'dosen') => per_prodi.reduce((a, x) => a + x[k], 0);
  return {
    data: {
      tahun_id: '20261',
      total: {
        mahasiswa_aktif: sum('mahasiswa_aktif'),
        status_aktif_semester: sum('mengisi_krs'),
        cuti: 84,
        nonaktif: 192,
        mengisi_krs: sum('mengisi_krs'),
        mahasiswa_baru: 912,
        lulusan: 486,
        dosen: sum('dosen'),
        ews_tinggi: 37,
      },
      per_prodi,
      modul: { ews: true },
    },
  };
});
tambahRute(/\/v1\/dasbor\/tren$/, () => ({
  data: ['20222', '20231', '20232', '20241', '20242', '20251', '20252', '20261'].map((t, i) => ({
    tahun_id: t,
    mengisi_krs: 2610 + i * 95 + (t.endsWith('2') ? -140 : 0),
    mahasiswa_baru: t.endsWith('1') ? 760 + i * 38 : 64 + i * 4,
    lulusan: t.endsWith('2') ? 410 + i * 12 : 120 + i * 6,
    rata_ips: 3.08 + i * 0.025,
  })),
}));

// ---------------------------------------------------------------- Keuangan
const UNIT = ['Rektorat', 'Fakultas Ilmu Komputer', 'Fakultas Ekonomi', 'Fakultas Pertanian', 'Fakultas Hukum', 'Fakultas Keguruan', 'LPPM', 'Pustikom'];
const AKUN = [
  ['5.1.01', 'Belanja pegawai'],
  ['5.1.02', 'Belanja barang habis pakai'],
  ['5.1.03', 'Belanja jasa'],
  ['5.1.04', 'Belanja perjalanan dinas'],
  ['5.2.01', 'Belanja modal peralatan'],
  ['5.2.02', 'Belanja modal gedung'],
  ['5.1.05', 'Belanja pemeliharaan'],
  ['5.1.06', 'Beasiswa dan bantuan mahasiswa'],
  ['5.1.07', 'Belanja kegiatan akademik'],
];
const hitung = (anggaran: number, real: number, proses: number) => ({
  anggaran,
  realisasi: real,
  dalam_proses: proses,
  sisa: anggaran - real - proses,
  persen: Math.round((real / anggaran) * 10000) / 100,
});
tambahRute(/\/v1\/keu\/serapan$/, () => {
  benih = 11;
  const per_unit = UNIT.map((u, i) => {
    const a = [4.2e9, 1.35e9, 1.1e9, 8.6e8, 6.4e8, 9.8e8, 1.25e9, 7.2e8][i]!;
    return { unit_id: i + 1, unit: u, ...hitung(a, Math.round(a * (0.38 + acak() * 0.45)), Math.round(a * acak() * 0.08)) };
  });
  const per_akun = AKUN.map(([kode, nama], i) => {
    const a = [5.1e9, 9.4e8, 1.2e9, 6.1e8, 1.4e9, 1.1e9, 4.2e8, 7.5e8, 5.2e8][i]!;
    return { akun_id: i + 1, akun_kode: kode, akun_nama: nama, ...hitung(a, Math.round(a * (0.3 + acak() * 0.55)), Math.round(a * acak() * 0.06)) };
  });
  const anggaran = per_unit.reduce((a, x) => a + x.anggaran, 0);
  const realisasi = per_unit.reduce((a, x) => a + x.realisasi, 0);
  return {
    data: {
      periode: { id: 3, kode: 'TA2026', nama: 'Tahun anggaran 2026', mulai: '2026-01-01', selesai: '2026-12-31', status: 'berjalan' },
      anggaran,
      realisasi,
      persen: Math.round((realisasi / anggaran) * 10000) / 100,
      penerimaan_lain: 1.84e9,
      per_unit,
      per_akun,
    },
  };
});

// ---------------------------------------------------------------- Kepegawaian
tambahRute(/\/v1\/sdm\/laporan\/ringkasan$/, () => ({
  data: {
    total: 412,
    per_jenis: { dosen: 268, tendik: 144 },
    per_kategori: { dosen_tetap: 221, dosen_tidak_tetap: 47, tendik_tetap: 118, tendik_kontrak: 26 },
    per_status_aktif: { aktif: 398, tugas_belajar: 14 },
    per_status_kepegawaian: { tetap_yayasan: 286, kontrak: 73, honorer: 31, dpk: 22 },
    per_jenis_kelamin: { L: 219, P: 193 },
    per_pendidikan: { S3: 41, S2: 236, S1: 92, D3: 18, SMA: 25 },
    per_golongan: { 'III/a': 64, 'III/b': 72, 'III/c': 58, 'III/d': 41, 'IV/a': 26, 'IV/b': 11, 'IV/c': 4, belum_diisi: 136 },
    per_kelompok_usia: { '<30': 58, '30-39': 141, '40-49': 117, '50-59': 76, '60+': 20 },
    dosen: {
      per_jabatan_akademik: { 'Asisten Ahli': 92, Lektor: 81, 'Lektor Kepala': 29, 'Guru Besar': 6, belum_diisi: 60 },
      per_pendidikan: { S3: 41, S2: 222, S1: 5 },
      serdos: { sudah: 148, belum: 73 },
      per_prodi: Object.fromEntries(PRODI.map((p, i) => [p.kode_prodi, 22 + i * 4])),
    },
    tendik: { per_jenis_tendik: { administrasi: 71, pustakawan: 9, laboran: 17, pranata_komputer: 12, keuangan: 15, keamanan_kebersihan: 20 } },
    catatan: 'Hanya pegawai berstatus aktif/tugas belajar.',
  },
}));

// ---------------------------------------------------------------- SPMI
const capaian = (kunci: string, total: number, terisi: number, mel: number, ter: number, tidak: number) => ({
  kunci,
  total,
  tercapai: ter,
  melampaui: mel,
  tidak_tercapai: tidak,
  belum: total - mel - ter - tidak,
  diverifikasi: Math.round(terisi * 0.7),
  terisi,
  persen_terpenuhi: Math.round(((mel + ter) / (mel + ter + tidak)) * 1000) / 10,
  persen_terisi: Math.round((terisi / total) * 1000) / 10,
});
// periode_id=999: belum ada periode SPMI (API menjawab 404).
tambahRute(/\/v1\/spmi\/dasbor$/, (u) => u.searchParams.get('periode_id') === '999' ? { __status: 404, error: { code: 'not_found', message: 'Data tidak ditemukan.' } } : ({
  data: {
    periode: { id: 2, nama: '2026', tahun: 2026 },
    unit_id: null,
    ppepp: {
      penetapan: { terpenuhi: true, bukti: { kebijakan_disahkan: 1, manual_disahkan: 4, standar_berlaku: 32 } },
      pelaksanaan: { terpenuhi: true, bukti: { capaian_terisi_persen: 84.6, kegiatan_selesai: 12 } },
      evaluasi: { terpenuhi: true, bukti: { auditee_ami_selesai: 14, kegiatan_evaluasi_selesai: 3 } },
      pengendalian: { terpenuhi: true, bukti: { temuan_ditutup: 19, temuan_terbuka: 23, rtm: [{ status: 'selesai', n: 1 }] } },
      peningkatan: { terpenuhi: false, bukti: { keputusan_peningkatan_standar: 0, kegiatan_peningkatan_selesai: 0 } },
    },
    capaian: capaian('semua', 286, 242, 41, 148, 37),
    capaian_per_bidang: [
      capaian('pendidikan', 118, 106, 18, 66, 14),
      capaian('penelitian', 52, 41, 7, 25, 6),
      capaian('pengabdian', 38, 30, 5, 19, 4),
      capaian('tata_kelola', 46, 40, 6, 24, 8),
      capaian('kemahasiswaan', 32, 25, 5, 14, 5),
    ],
    ami: [
      { status: 'selesai', n: 14 },
      { status: 'berjalan', n: 4 },
      { status: 'dijadwalkan', n: 3 },
    ],
    temuan: { total: 42, terbuka: 23, kts_mayor: 5, kts_minor: 21, observasi: 16, terlambat: 6, ditutup: 19 },
    survei: [{ status: 'dibuka', n: 3 }],
    risiko_tinggi_terbuka: 4,
    akreditasi: { kedaluwarsa: 1, segera_ajukan: 2, belum_ada_data: 1, aman: 9 },
    pelaporan: { butir: 64, dilaporkan: 51, valid: 44 },
  },
}));

// ---------------------------------------------------------------- LPPM
tambahRute(/\/v1\/lppm\/rekap\/dasbor$/, (u) => ({
  data: {
    tahun: u.searchParams.get('tahun') ?? '2026',
    kode_prodi: null,
    kegiatan_per_status: [
      { jenis: 'penelitian', status: 'berjalan', jumlah: 38, dana_usulan: 1.2e9, dana_disetujui: 9.8e8 },
      { jenis: 'pkm', status: 'berjalan', jumlah: 24, dana_usulan: 4.6e8, dana_disetujui: 3.9e8 },
      { jenis: 'penelitian', status: 'selesai', jumlah: 21, dana_usulan: 6.4e8, dana_disetujui: 5.7e8 },
      { jenis: 'pkm', status: 'selesai', jumlah: 17, dana_usulan: 2.8e8, dana_disetujui: 2.4e8 },
      { jenis: 'penelitian', status: 'direview', jumlah: 14, dana_usulan: 4.2e8, dana_disetujui: 0 },
      { jenis: 'pkm', status: 'diajukan', jumlah: 9, dana_usulan: 1.5e8, dana_disetujui: 0 },
      { jenis: 'penelitian', status: 'ditolak', jumlah: 6, dana_usulan: 1.9e8, dana_disetujui: 0 },
    ],
    kegiatan_per_sumber_dana: [
      { jenis: 'penelitian', sumber_dana: 'internal', jumlah: 41, dana: 7.2e8 },
      { jenis: 'penelitian', sumber_dana: 'kemdiktisaintek', jumlah: 12, dana: 8.1e8 },
      { jenis: 'pkm', sumber_dana: 'internal', jumlah: 33, dana: 3.6e8 },
      { jenis: 'pkm', sumber_dana: 'pemerintah_daerah', jumlah: 6, dana: 2.1e8 },
      { jenis: 'penelitian', sumber_dana: 'mitra_industri', jumlah: 4, dana: 1.4e8 },
    ],
    kegiatan_per_skema: [
      { kode: 'PDP', nama: 'Penelitian Dosen Pemula', jenis: 'penelitian', jumlah: 29, didanai: 18 },
      { kode: 'PF', nama: 'Penelitian Fundamental', jenis: 'penelitian', jumlah: 16, didanai: 9 },
      { kode: 'PT', nama: 'Penelitian Terapan', jenis: 'penelitian', jumlah: 11, didanai: 6 },
      { kode: 'PKM-M', nama: 'PkM Pemberdayaan Masyarakat', jenis: 'pkm', jumlah: 22, didanai: 15 },
      { kode: 'PKM-D', nama: 'PkM Desa Binaan', jenis: 'pkm', jumlah: 13, didanai: 8 },
      { kode: 'KKN-T', nama: 'KKN Tematik', jenis: 'pkm', jumlah: 9, didanai: 9 },
    ],
    kegiatan_per_prodi: [],
    luaran_per_jenis: [
      { kategori: 'publikasi', kode: 'JN-S', nama: 'Jurnal nasional terakreditasi SINTA', jumlah: 64, terverifikasi: 51 },
      { kategori: 'publikasi', kode: 'JI', nama: 'Jurnal internasional bereputasi', jumlah: 12, terverifikasi: 9 },
      { kategori: 'publikasi', kode: 'PRO', nama: 'Prosiding seminar', jumlah: 37, terverifikasi: 30 },
      { kategori: 'hki', kode: 'HC', nama: 'Hak cipta', jumlah: 28, terverifikasi: 26 },
      { kategori: 'hki', kode: 'PS', nama: 'Paten sederhana', jumlah: 3, terverifikasi: 2 },
      { kategori: 'lain', kode: 'BK', nama: 'Buku ber-ISBN', jumlah: 9, terverifikasi: 7 },
      { kategori: 'lain', kode: 'TTG', nama: 'Teknologi tepat guna', jumlah: 6, terverifikasi: 4 },
    ],
    dosen_terlibat: 187,
    mahasiswa_terlibat: 342,
    tugas_pengelola: { usulan_menunggu_review: 9, usulan_menunggu_penetapan: 4, laporan_menunggu: 7, luaran_menunggu_verifikasi: 15, pencairan_diajukan: 0 },
  },
}));

// ---------------------------------------------------------------- Arsip
tambahRute(/\/v1\/arsip\/laporan\/ringkasan$/, () => {
  benih = 23;
  const bulanIni = now.getMonth() + 1;
  return {
    data: {
      unit_id: null,
      tahun: now.getFullYear(),
      surat_per_bulan: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1, masuk: i < bulanIni ? antara(48, 96) : 0, keluar: i < bulanIni ? antara(30, 72) : 0 })),
      surat_per_status: [
        { arah: 'masuk', status: 'selesai', jumlah: 512 },
        { arah: 'masuk', status: 'didisposisi', jumlah: 64 },
        { arah: 'masuk', status: 'baru', jumlah: 18 },
        { arah: 'keluar', status: 'terkirim', jumlah: 401 },
        { arah: 'keluar', status: 'draf', jumlah: 22 },
        { arah: 'keluar', status: 'menunggu_tanda_tangan', jumlah: 11 },
      ],
      surat_per_klasifikasi: [
        { kode: 'PP', nama: 'Pendidikan dan pengajaran', jumlah: 214 },
        { kode: 'KP', nama: 'Kepegawaian', jumlah: 156 },
        { kode: 'KU', nama: 'Keuangan', jumlah: 133 },
        { kode: 'KM', nama: 'Kemahasiswaan', jumlah: 98 },
        { kode: 'PL', nama: 'Penelitian', jumlah: 72 },
        { kode: 'HM', nama: 'Kehumasan', jumlah: 41 },
        { kode: 'OT', nama: 'Organisasi dan tata laksana', jumlah: 33 },
      ],
      disposisi: { total: 388, aktif: 46, lewat_batas: 7, selesai: 342, rata_jam_selesai: 31.5 },
      dokumen: { total: 1240, kedaluwarsa: 3, akan_kedaluwarsa_90_hari: 12 },
      retensi_jatuh_tempo: { pemindahan: 128, pemusnahan_penyerahan: 0 },
      peminjaman_aktif: 5,
    },
  };
});

// ---------------------------------------------------------------- Humas
tambahRute(/\/v1\/humas\/ringkasan$/, (u) => {
  benih = 5;
  const hari = Number(u.searchParams.get('hari') ?? 30);
  const seri = Array.from({ length: hari }, (_, i) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (hari - 1 - i));
    const akhirPekan = t.getDay() === 0 || t.getDay() === 6;
    return { tanggal: iso(t), tayang: Math.round((akhirPekan ? 420 : 760) + i * 9 + acak() * 260 + (i === hari - 9 ? 1400 : 0)) };
  });
  return {
    data: {
      jumlah: { berita: { draf: 6, review: 3, terbit: 214, arsip: 40 }, pengumuman: { draf: 2, review: 1, terbit: 96, arsip: 31 }, agenda: { draf: 1, review: 0, terbit: 58, arsip: 12 } },
      terjadwal: 4,
      pesan_baru: 7,
      antrean_review: [
        { jenis: 'berita', id: 301, situs: 'Universitas', judul: 'Tim robotik UNIPO juara 2 KRI regional', updated_at: hariLalu(0, 9) },
        { jenis: 'berita', id: 299, situs: 'Fakultas Pertanian', judul: 'Panen raya jagung di kebun percobaan', updated_at: hariLalu(1, 15) },
        { jenis: 'pengumuman', id: 88, situs: 'Universitas', judul: 'Jadwal pembayaran UKT semester genap', updated_at: hariLalu(2, 10) },
      ],
      terjadwal_daftar: [
        { jenis: 'berita', id: 305, judul: 'Wisuda periode II tahun 2026', terbit_pada: hariLalu(-2, 8) },
        { jenis: 'agenda', id: 61, judul: 'Seminar nasional ketahanan pangan', terbit_pada: hariLalu(-4, 7) },
        { jenis: 'pengumuman', id: 90, judul: 'Libur akhir tahun', terbit_pada: hariLalu(-12, 8) },
      ],
      tayang_harian: seri,
      tayang_total: seri.reduce((a, x) => a + x.tayang, 0),
      populer: [
        { jenis: 'pengumuman', id: 81, judul: 'Hasil seleksi PMB gelombang 2', tayang: 4820 },
        { jenis: 'berita', id: 288, judul: 'UNIPO raih akreditasi Baik Sekali', tayang: 3104 },
        { jenis: 'berita', id: 292, judul: 'Mahasiswa Informatika lolos magang luar negeri', tayang: 1987 },
        { jenis: 'agenda', id: 58, judul: 'Pekan olahraga mahasiswa 2026', tayang: 1412 },
        { jenis: 'berita', id: 295, judul: 'Kuliah umum literasi digital', tayang: 966 },
      ],
      aktivitas: [
        { jenis: 'berita', id: 301, judul: 'Tim robotik UNIPO juara 2 KRI regional', aksi: 'review', username: 'nurhayati', waktu: hariLalu(0, 9) },
        { jenis: 'agenda', id: 61, judul: 'Seminar nasional ketahanan pangan', aksi: 'ubah', username: 'humas.fp', waktu: hariLalu(0, 8) },
        { jenis: 'berita', id: 298, judul: 'Penandatanganan MoU dengan Pemprov', aksi: 'terbit', username: 'admin.humas', waktu: hariLalu(1, 14) },
        { jenis: 'pengumuman', id: 89, judul: 'Perpanjangan masa KRS', aksi: 'terbit', username: 'admin.humas', waktu: hariLalu(2, 11) },
      ],
      agenda_mendatang: [],
      topik: [],
    },
  };
});

// ---------------------------------------------------------------- PMB
tambahRute(/\/v1\/pmb\/admin\/statistik$/, () => {
  benih = 3;
  const harian = Array.from({ length: 30 }, (_, i) => {
    const akun = Math.round(18 + i * 0.9 + acak() * 14 + (i > 22 ? 12 : 0));
    return { tanggal: hariLalu(29 - i), akun_mulai: akun, diajukan: Math.round(akun * (0.45 + acak() * 0.2)) };
  });
  return {
    data: {
      akun_terdaftar: 1846,
      corong: { pendaftaran: 1412, draf: 214, diajukan: 1198, perlu_perbaikan: 43, terverifikasi: 1102, ditolak: 12, mengundurkan_diri: 9, bayar_formulir: 1086, lulus: 968, daftar_ulang: 812 },
      per_prodi: PRODI.map((p, i) => ({
        kode_prodi: p.kode_prodi,
        nama_prodi: p.nama_prodi,
        peminat: [486, 312, 402, 228, 145, 266, 359][i],
        pilihan_pertama: [301, 176, 248, 131, 82, 171, 224][i],
        lulus: 0,
        daftar_ulang: 0,
      })),
      per_sumber_informasi: [
        { sumber: 'Media sosial', jumlah: 538, diajukan: 461 },
        { sumber: 'Teman/keluarga', jumlah: 402, diajukan: 352 },
        { sumber: 'Sosialisasi sekolah', jumlah: 287, diajukan: 251 },
        { sumber: 'Situs web', jumlah: 121, diajukan: 92 },
        { sumber: 'Brosur', jumlah: 64, diajukan: 42 },
      ],
      per_referal: [
        { kode: 'SMAN1GTO', nama: 'SMA Negeri 1 Gorontalo', jenis: 'sekolah', jumlah: 64, diajukan: 58 },
        { kode: 'ALM-RZK', nama: 'Rizky Saputra (alumni)', jenis: 'alumni', jumlah: 21, diajukan: 17 },
        { kode: 'SMKN2', nama: 'SMK Negeri 2 Gorontalo', jenis: 'sekolah', jumlah: 19, diajukan: 15 },
      ],
      harian_30_hari: harian,
    },
  };
});

// ---------------------------------------------------------------- Tracer
tambahRute(/\/v1\/tracer\/statistik$/, () => ({
  data: {
    filter_prodi: null,
    alumni: 4380,
    terlacak: 2214,
    persen_terlacak: 50.5,
    per_status: [
      { status: '1', label: 'Bekerja', jumlah: 1286 },
      { status: '3', label: 'Wiraswasta', jumlah: 318 },
      { status: '4', label: 'Melanjutkan pendidikan', jumlah: 142 },
      { status: '5', label: 'Mencari kerja', jumlah: 361 },
      { status: '2', label: 'Belum memungkinkan bekerja', jumlah: 107 },
      { status: null, label: 'Belum mengisi', jumlah: 2166 },
    ],
    per_tahun_lulus: [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((t, i) => ({ tahun: t, jumlah: 540 + i * 32, terlacak: Math.round((540 + i * 32) * (0.32 + i * 0.05)) })),
    per_prodi: PRODI.map((p, i) => ({
      kode_prodi: p.kode_prodi,
      nama_prodi: p.nama_prodi,
      jumlah: [820, 610, 790, 540, 380, 470, 770][i],
      terlacak: [512, 322, 401, 288, 141, 206, 344][i],
      bekerja_wirausaha_studi: [430, 260, 318, 231, 98, 160, 249][i],
    })),
    instansi_teratas: [
      { instansi: 'Pemerintah Provinsi Gorontalo', jumlah: 96 },
      { instansi: 'Bank Rakyat Indonesia', jumlah: 54 },
      { instansi: 'Dinas Pendidikan Kab. Gorontalo', jumlah: 47 },
      { instansi: 'PT Telkom Indonesia', jumlah: 31 },
      { instansi: 'Bank SulutGo', jumlah: 28 },
      { instansi: 'Usaha sendiri', jumlah: 25 },
    ],
    lowongan_aktif: 18,
  },
}));
