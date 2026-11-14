// Data contoh untuk PilihEntitas (pengguna/orang, ormawa, unit) dan contoh galat server ber-request_id.
import { MAHASISWA, PEGAWAI, tambahRute } from './siakad';

const cocok = (q: string | null, ...vals: unknown[]) => !q || vals.some((v) => String(v ?? '').toLowerCase().includes(q.toLowerCase()));
const per = (u: URL) => Number(u.searchParams.get('per_page') ?? 20);

const ORANG = [
  ...MAHASISWA.slice(0, 20).map((m, i) => ({ id: 100 + i, nama: m.nama, username: m.nim, email: `${m.nim}@mhs.unipo.ac.id`, nik: `7505${String(41000000 + i * 7919).padStart(12, '0')}` })),
  ...PEGAWAI.map((p, i) => ({ id: 300 + i, nama: p.nama_lengkap, username: p.nidn ?? `pegawai${p.id}`, email: `pegawai${p.id}@unipo.ac.id`, nik: `7505${String(52000000 + i * 4111).padStart(12, '0')}` })),
];
const ORMAWA = [
  ['BEM', 'Badan Eksekutif Mahasiswa', 'eksekutif', 'Pemerintahan mahasiswa'],
  ['DPM', 'Dewan Perwakilan Mahasiswa', 'legislatif', 'Pemerintahan mahasiswa'],
  ['HMIF', 'Himpunan Mahasiswa Informatika', 'himpunan', 'Keilmuan'],
  ['HIMAKSI', 'Himpunan Mahasiswa Akuntansi', 'himpunan', 'Keilmuan'],
  ['MAPALA', 'Mahasiswa Pecinta Alam Tanjung Panjang', 'ukm', 'Minat dan bakat'],
  ['UKM-SB', 'UKM Seni dan Budaya', 'ukm', 'Seni'],
  ['UKM-OR', 'UKM Olahraga', 'ukm', 'Olahraga'],
  ['LDK', 'Lembaga Dakwah Kampus Al-Hikmah', 'ukm', 'Kerohanian'],
  ['PERS', 'Pers Mahasiswa Suara Pohuwato', 'ukm', 'Jurnalistik'],
].map(([kode, nama, jenis, bidang], i) => ({ id: i + 1, kode, nama, jenis, bidang, aktif: true }));

tambahRute(/\/v1\/induk\/orang\/\d+$/, (u) => {
  const o = ORANG.find((x) => x.id === Number(u.pathname.split('/').pop()));
  return o ? { data: o } : { __status: 404, error: { message: 'Orang tidak ditemukan.' } };
});
tambahRute(/\/v1\/induk\/orang$/, (u) => {
  const s = u.searchParams;
  const rows = ORANG.filter((o) => cocok(s.get('q'), o.nama, o.username, o.email, o.nik) && (!s.get('username') || o.username === s.get('username')) && (!s.get('nik') || o.nik === s.get('nik')));
  return { data: rows.slice(0, per(u)), meta: { total: rows.length } };
});
tambahRute(/\/v1\/kemahasiswaan\/ormawa\/\d+$/, (u) => {
  const o = ORMAWA.find((x) => x.id === Number(u.pathname.split('/').pop()));
  return o ? { data: o } : { __status: 404, error: { message: 'Ormawa tidak ditemukan.' } };
});
tambahRute(/\/v1\/kemahasiswaan\/ormawa$/, (u) => {
  const rows = ORMAWA.filter((o) => cocok(u.searchParams.get('q'), o.nama, o.kode, o.bidang));
  return { data: rows.slice(0, per(u)), meta: { total: rows.length } };
});
tambahRute(/\/v1\/sdm\/pegawai\/\d+$/, (u) => {
  const p = PEGAWAI.find((x) => x.id === Number(u.pathname.split('/').pop()));
  return p ? { data: p } : { __status: 404, error: { message: 'Pegawai tidak ditemukan.' } };
});
// Galat server untuk contoh kotak galat.
tambahRute(/\/v1\/contoh\/galat$/, () => ({
  __status: 500,
  error: { code: 'server_error', message: 'Terjadi galat di server. Sebutkan request_id ini saat melapor.' },
  request_id: 'req_7f3a92c1e4b8d065',
}));
