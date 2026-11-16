// Contoh /v1/akademik/jadwal/bentrok, /cek, /otomatis, /otomatis/simpan. Nama dosen dan data fiktif.
import { tambahRute } from './siakad';

const sesi = (id: number | null, prodi: string, nama_prodi: string, kode_mk: string, nama_mk: string, semester: string, kelas: string, hari: string, mulai: string, sampai: string, ruang: string, kampus: string, dosen: string[]) => ({
  id, prodi, nama_prodi, kode_mk, nama_mk, semester, kelas, hari, jamke: 1, mulai, sampai, ruang, kampus, dosen,
});
const IF = ['55201', 'S1 Informatika'] as const;
const SI = ['57201', 'S1 Sistem Informasi'] as const;
const HK = ['74201', 'S1 Ilmu Hukum'] as const;

const TEMUAN = [
  { jenis: 'ruang', tingkat: 'bentrok', hari: '1', nama_hari: 'Senin', pesan: 'Ruang 053 (D) dipakai dua kelas pada jam yang sama.', detail: null,
    a: sesi(101, ...IF, '3PNT125', 'Pemrograman Web', '5', '06', '1', '18:30', '20:00', '053', '02', ['Rahmat Hasan, M.Kom']),
    b: sesi(201, ...HK, '3KBIH107', 'Hukum Perdata', '3', '04', '1', '18:30', '20:00', '053', '02', ['Siti Pakaya, S.H., M.H.']) },
  { jenis: 'dosen', tingkat: 'bentrok', hari: '3', nama_hari: 'Rabu', pesan: 'Dewi Lamato, M.Pd mengajar dua kelas pada jam yang sama.', detail: { nidn: '0901017001', dosen: 'Dewi Lamato, M.Pd' },
    a: sesi(102, ...IF, '2SKT106', 'Bahasa Inggris', '1', '01', '3', '10:10', '11:50', '016', '01', ['Dewi Lamato, M.Pd']),
    b: sesi(301, '88203', 'S1 Pendidikan Bahasa Inggris', '2IGKK17', 'Speaking', '3', '01', '3', '09:20', '11:00', '036', '01', ['Dewi Lamato, M.Pd']) },
  { jenis: 'kelas', tingkat: 'bentrok', hari: '4', nama_hari: 'Kamis', pesan: 'Mahasiswa semester 5 kelas 05 (REGULER A/B) punya dua mata kuliah pada jam yang sama.', detail: null,
    a: sesi(103, ...IF, '2PNT124', 'Kecerdasan Buatan', '5', '05', '4', '20:00', '21:30', '019', '01', ['Fajar Saputra, M.Kom']),
    b: sesi(104, ...IF, '3KKT102', 'Jaringan Komputer', '5', '05', '4', '20:30', '22:10', '020', '01', ['Nur Dai, M.T.']) },
  { jenis: 'mahasiswa', tingkat: 'bentrok', hari: '1', nama_hari: 'Senin', pesan: '3 mahasiswa mengambil kedua kelas ini di KRS.', detail: { jumlah_mahasiswa: 3 },
    a: sesi(105, ...IF, '2KUT110', 'Statistika', '3', '01', '1', '07:30', '09:10', '016', '01', ['Andi Kadir, M.Si']),
    b: sesi(106, ...IF, '3PNT109', 'Struktur Data', '1', '01', '1', '07:30', '10:00', '019', '01', ['Fajar Saputra, M.Kom']) },
  { jenis: 'pindah_kampus', tingkat: 'peringatan', hari: '2', nama_hari: 'Selasa', pesan: 'Rahmat Hasan, M.Kom berpindah dari kampus 1 ke kampus 2 dengan jeda 10 menit (minimal 30 menit).', detail: { jeda_menit: 10 },
    a: sesi(107, ...IF, '2PNT113', 'Komputer Aplikasi', '1', '01', '2', '07:30', '09:10', '019', '01', ['Rahmat Hasan, M.Kom']),
    b: sesi(202, ...SI, '3KK57107', 'Basis Data', '3', '06', '2', '09:20', '11:50', '061', '02', ['Rahmat Hasan, M.Kom']) },
  { jenis: 'kampus_ruang', tingkat: 'peringatan', hari: '6', nama_hari: 'Sabtu', pesan: 'Kelas 05 (REGULER A/B) terdaftar di kampus 1, tetapi ruang 050 ada di kampus 2.', detail: null,
    a: sesi(108, ...IF, '2KUT110', 'Statistika', '3', '05', '6', '09:00', '10:40', '050', '02', ['Andi Kadir, M.Si']), b: null },
];

const USULAN = [
  { kunci: 'u101', id: 101, asal_id: 101, kode_mk: '3PNT125', nama_mk: 'Pemrograman Web', sks: 3, semester: '5', kelas: '06', nama_kelas: 'REG PAGI/SORE', nidn: '0902', dosen: 'Rahmat Hasan, M.Kom', tim: [], kapasitas: 35,
    hari: '1', nama_hari: 'Senin', jamke: 13, mulai: '13:00', sampai: '15:30', ruang: '052', nama_ruang: 'C', kampus: '02',
    asal: { hari: '1', nama_hari: 'Senin', jamke: 20, mulai: '18:30', sampai: '20:00', ruang: '053' }, catatan: ['Dipindah dari Senin 18:30.', 'Ruang 053 diganti 052.'] },
  { kunci: 'u104', id: 104, asal_id: 104, kode_mk: '3KKT102', nama_mk: 'Jaringan Komputer', sks: 3, semester: '5', kelas: '05', nama_kelas: 'REGULER A/B', nidn: '0903', dosen: 'Nur Dai, M.T.', tim: [{ nidn: '0904', nama: 'Yusuf Gobel, M.Kom' }], kapasitas: 35,
    hari: '5', nama_hari: 'Jumat', jamke: 9, mulai: '13:30', sampai: '16:00', ruang: '020', nama_ruang: 'Lab Komputer B', kampus: '01',
    asal: { hari: '4', nama_hari: 'Kamis', jamke: 30, mulai: '20:30', sampai: '22:10', ruang: '020' }, catatan: ['Dipindah dari Kamis 20:30.', '12 mahasiswa sudah mengambil kelas ini di KRS; beri tahu perubahannya.'] },
  { kunci: 'u102', id: 102, asal_id: 102, kode_mk: '2SKT106', nama_mk: 'Bahasa Inggris', sks: 2, semester: '1', kelas: '01', nama_kelas: 'REGULER PAGI', nidn: '0901017001', dosen: 'Dewi Lamato, M.Pd', tim: [], kapasitas: 35,
    hari: '2', nama_hari: 'Selasa', jamke: 4, mulai: '09:20', sampai: '11:00', ruang: '016', nama_ruang: 'Ruang 16', kampus: '01',
    asal: { hari: '3', nama_hari: 'Rabu', jamke: 5, mulai: '10:10', sampai: '11:50', ruang: '016' }, catatan: ['Dipindah dari Rabu 10:10.'] },
];

let tersimpan = false;
tambahRute(/\/v1\/akademik\/jadwal\/bentrok$/, () => {
  const data = tersimpan ? TEMUAN.filter((t) => t.tingkat === 'peringatan') : TEMUAN;
  const bentrok = data.filter((t) => t.tingkat === 'bentrok').length;
  const per: Record<string, number> = {};
  data.forEach((t) => (per[t.jenis] = (per[t.jenis] ?? 0) + 1));
  return { data: { prodi: '55201', tahun_id: '20261', jeda_kampus: 30, ringkasan: { jadwal: 118, jadwal_bentrok: tersimpan ? 0 : 7, bentrok, peringatan: data.length - bentrok, per_jenis: per }, id_bentrok: [], data } };
});
tambahRute(/\/v1\/akademik\/jadwal\/cek$/, (_u, init) => {
  const b = JSON.parse(String(init?.body ?? '{}'));
  const bentrok = b.hari === '1' && b.ruang === '053';
  return {
    data: {
      aman: !bentrok,
      jadwal: sesi(null, ...IF, b.kode_mk, 'Pemrograman Web', '5', b.kelas, b.hari, '18:30', '20:00', b.ruang, '02', ['Rahmat Hasan, M.Kom']),
      data: bentrok ? [TEMUAN[0]] : [],
    },
  };
});
tambahRute(/\/v1\/akademik\/jadwal\/otomatis$/, (_u, init) => {
  const b = JSON.parse(String(init?.body ?? '{}'));
  return {
    data: {
      prodi: '55201', tahun_id: '20261', opsi: { jeda_kampus: 30, menit_per_sks: 50, batas_sore: '15:00', ...b },
      ringkasan: { diminta: 4, terjadwal: 3, tidak_terjadwal: 1 },
      usulan: USULAN,
      tidak_terjadwal: [{ asal_id: 103, kode_mk: '2PNT124', nama_mk: 'Kecerdasan Buatan', sks: 2, semester: '5', kelas: '05', nidn: '0905', dosen: 'Fajar Saputra, M.Kom', alasan: 'Dosen sudah penuh di semua jam yang cocok.' }],
    },
  };
});
tambahRute(/\/v1\/akademik\/jadwal\/otomatis\/simpan$/, (_u, init) => {
  const b = JSON.parse(String(init?.body ?? '{}')) as { usulan: Array<{ kunci: string; id: number }> };
  tersimpan = true;
  return { data: { tersimpan: b.usulan.map((u, i) => ({ urut: i, kunci: u.kunci, id: u.id })), gagal: [] } };
});
