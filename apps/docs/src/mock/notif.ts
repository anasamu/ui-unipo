// Kotak masuk notifikasi tiruan (/v1/notif) untuk TombolNotifikasi dan KerangkaAplikasi. Semua isi fiktif.
import { tambahRute } from './siakad';

const menit = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const KOTAK = [
  { id: 9, modul: 'krs', judul: 'KRS Anda disetujui dosen wali', isi: 'Dr. Hendra Pakaya menyetujui 21 SKS untuk semester Ganjil 2026/2027.', tautan: '/krs', dibaca_pada: null, created_at: menit(4) },
  { id: 8, modul: 'keuangan', judul: 'Tagihan UKT semester ganjil terbit', isi: 'Rp3.250.000, jatuh tempo 30 November 2026. Bayar lewat virtual account BSI.', tautan: '/tagihan', dibaca_pada: null, created_at: menit(52) },
  { id: 7, modul: 'surat', judul: 'Surat keterangan aktif kuliah siap diunduh', isi: 'Nomor 412/UNIPO/BAAK/XI/2026, ditandatangani secara elektronik.', tautan: '/surat', dibaca_pada: null, created_at: menit(60 * 5) },
  { id: 6, modul: 'lms', judul: 'Tugas baru: Laporan praktikum basis data', isi: 'Kelas Basis Data A, tenggat Jumat 20 November pukul 23.59.', tautan: '/kelas', dibaca_pada: menit(60 * 20), created_at: menit(60 * 26) },
  { id: 5, modul: 'spmi', judul: 'Survei kepuasan layanan akademik dibuka', isi: 'Isi sebelum 25 November; jawaban anonim.', tautan: 'https://spmi.unipo.ac.id/survei', dibaca_pada: menit(60 * 40), created_at: menit(60 * 50) },
  { id: 4, modul: 'notif', judul: 'Pemeliharaan server SIAKAD Sabtu malam', isi: 'Layanan tidak tersedia pukul 22.00 sampai 23.30 WITA.', tautan: null, dibaca_pada: menit(60 * 90), created_at: menit(60 * 96) },
].map((x) => ({ ...x, username: 'demo', entitas: null, entitas_id: null }));

const belum = () => KOTAK.filter((x) => !x.dibaca_pada).length;

tambahRute(/^\/v1\/notif\/ringkas$/, () => ({ data: { belum_dibaca: belum() } }));
tambahRute(/^\/v1\/notif\/kotak\/baca-semua$/, () => {
  const kini = new Date().toISOString();
  let n = 0;
  for (const x of KOTAK) if (!x.dibaca_pada) (x.dibaca_pada = kini), n++;
  return { data: { ditandai: n } };
});
tambahRute(/^\/v1\/notif\/kotak\/\d+\/baca$/, (u) => {
  const id = Number(u.pathname.split('/')[4]);
  const x = KOTAK.find((k) => k.id === id);
  if (x && !x.dibaca_pada) x.dibaca_pada = new Date().toISOString();
  return { data: x ?? null };
});
tambahRute(/^\/v1\/notif\/kotak$/, (u) => {
  const per = Number(u.searchParams.get('per_page') ?? 20);
  const daftar = u.searchParams.get('belum') === '1' ? KOTAK.filter((x) => !x.dibaca_pada) : KOTAK;
  return { data: daftar.slice(0, per), meta: { total: daftar.length } };
});
