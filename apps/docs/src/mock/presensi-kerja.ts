// Presensi kerja berbasis lokasi (/v1/sdm/presensi): server tiruan di memori. Area Kampus 1 dan 2, jadwal reguler +
// shift malam, penugasan, perangkat, percobaan presensi (diterima/ditinjau/ditolak), koreksi. Nama dan titik rekaan.
import { PEGAWAI, tambahRute } from './siakad';

type Baris = Record<string, any>;
const badan = (init?: RequestInit) => (init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}) as Baris;
const metode = (init?: RequestInit) => (init?.method ?? 'GET').toUpperCase();
const galat = (status: number, code: string, message: string, details?: unknown) => ({ __status: status, error: { code, message, details } });
const pad = (n: number) => String(n).padStart(2, '0');
const tgl = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const waktu = (d: Date) => `${tgl(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const hariIni = () => tgl(new Date());
const jamIni = (j: string) => `${hariIni()} ${j}:00`;
let urut = 1;
const uuid = () => `7a11e000-0000-4000-8000-${String(urut++).padStart(12, '0')}`;

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
const jarak = (a: Baris, b: Baris): number => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// ---------------------------------------------------------------- Data
const AREA: Baris[] = [
  { id: 1, uuid: uuid(), kode: 'kampus-1', nama: 'Kampus 1', jenis: 'kampus', kampus: 'Kampus 1', unit_id: null, unit_nama: null, alamat: 'Jl. Trans Sulawesi, Marisa', lat: 0.4743, lng: 121.9378, radius_m: 150, poligon: null, ada_jaringan: true, jaringan: '103.10.20.0/24', aktif: true, keterangan: null },
  {
    id: 2,
    uuid: uuid(),
    kode: 'kampus-2',
    nama: 'Kampus 2',
    jenis: 'kampus',
    kampus: 'Kampus 2',
    unit_id: null,
    unit_nama: null,
    alamat: null,
    lat: 0.48015,
    lng: 121.94525,
    radius_m: 100,
    poligon: [
      [0.4808, 121.9445],
      [0.4809, 121.946],
      [0.4795, 121.9461],
      [0.4794, 121.9446],
    ],
    ada_jaringan: false,
    jaringan: null,
    aktif: true,
    keterangan: null,
  },
  { id: 3, uuid: uuid(), kode: 'rektorat', nama: 'Gedung Rektorat', jenis: 'gedung', kampus: 'Kampus 1', unit_id: 3, unit_nama: 'Biro Umum', alamat: null, lat: 0.4752, lng: 121.9391, radius_m: 60, poligon: null, ada_jaringan: false, jaringan: null, aktif: true, keterangan: 'Satpam dan biro umum' },
];
const hariKerja = (masuk: string, pulang: string, jumat = pulang) => ({ 1: { masuk, pulang }, 2: { masuk, pulang }, 3: { masuk, pulang }, 4: { masuk, pulang }, 5: { masuk, pulang: jumat } });
const JADWAL: Baris[] = [
  { id: null, uuid: null, kode: 'bawaan', nama: 'Jam kerja bawaan (Pengaturan)', jenis: 'tetap', hari: hariKerja('07:30', '16:00', '16:30'), toleransi_terlambat_menit: 15, buka_masuk_menit: 120, batas_pulang_menit: 360, min_kerja_menit: null, lintas_hari: false, ikut_libur: true, wajib_lokasi: true, wajib_foto: false, aktif: true, dipakai: null, bawaan: true },
  { id: 1, uuid: uuid(), kode: 'reguler', nama: 'Jam kerja reguler', jenis: 'tetap', hari: hariKerja('07:30', '16:00', '16:30'), toleransi_terlambat_menit: 15, buka_masuk_menit: 120, batas_pulang_menit: 360, min_kerja_menit: null, lintas_hari: false, ikut_libur: true, wajib_lokasi: true, wajib_foto: false, aktif: true, keterangan: null, dipakai: 1, bawaan: false },
  {
    id: 2,
    uuid: uuid(),
    kode: 'shift-malam',
    nama: 'Shift malam satpam',
    jenis: 'shift',
    hari: { ...hariKerja('20:00', '06:00'), 6: { masuk: '20:00', pulang: '06:00' }, 7: { masuk: '20:00', pulang: '06:00' } },
    toleransi_terlambat_menit: 10,
    buka_masuk_menit: 120,
    batas_pulang_menit: 360,
    min_kerja_menit: null,
    lintas_hari: true,
    ikut_libur: false,
    wajib_lokasi: true,
    wajib_foto: true,
    aktif: true,
    keterangan: null,
    dipakai: 1,
    bawaan: false,
  },
  { id: 3, uuid: uuid(), kode: 'dosen-fleksibel', nama: 'Dosen fleksibel', jenis: 'fleksibel', hari: hariKerja('08:00', '16:00'), toleransi_terlambat_menit: 0, buka_masuk_menit: 120, batas_pulang_menit: 360, min_kerja_menit: 360, lintas_hari: false, ikut_libur: true, wajib_lokasi: true, wajib_foto: false, aktif: true, keterangan: null, dipakai: 1, bawaan: false },
];
const PENUGASAN: Baris[] = [
  { id: 1, sasaran: 'semua', jenis_pegawai: null, unit_id: null, pegawai_id: null, jadwal_id: 1, mode_lokasi: 'area', lokasi_ids: null, mulai: '2026-11-01', selesai: null, keterangan: null },
  { id: 2, sasaran: 'jenis', jenis_pegawai: 'dosen', unit_id: null, pegawai_id: null, jadwal_id: 3, mode_lokasi: 'area', lokasi_ids: [1, 2], mulai: '2026-11-01', selesai: null, keterangan: null },
  { id: 3, sasaran: 'unit', jenis_pegawai: null, unit_id: 3, pegawai_id: null, jadwal_id: 2, mode_lokasi: 'area', lokasi_ids: [3], mulai: '2026-11-01', selesai: null, keterangan: 'Satpam' },
  { id: 4, sasaran: 'pegawai', jenis_pegawai: null, unit_id: null, pegawai_id: 22, jadwal_id: 1, mode_lokasi: 'bebas', lokasi_ids: null, mulai: '2026-11-10', selesai: '2026-12-31', keterangan: 'Tugas belajar, kerja jarak jauh' },
];
const pegawai = (id: number) => PEGAWAI.find((p) => p.id === id);
const bentukPenugasan = (p: Baris) => {
  const j = JADWAL.find((x) => x.id === p.jadwal_id);
  return { ...p, jadwal_nama: j?.nama ?? null, jadwal_uuid: j?.uuid ?? null, unit_nama: p.unit_id === 3 ? 'Biro Umum' : null, pegawai_nama: p.pegawai_id ? (pegawai(p.pegawai_id)?.nama_lengkap ?? null) : null, lokasi_nama: p.lokasi_ids ? p.lokasi_ids.map((i: number) => AREA.find((a) => a.id === i)?.nama) : null };
};

const SAYA = 1;
const PERANGKAT: Baris[] = [
  { id: 1, pegawai_id: SAYA, perangkat: 'demo-perangkat', nama: 'Samsung A54', platform: 'android', versi_app: '1.0.0', status: 'aktif', terakhir_at: waktu(new Date(Date.now() - 86_400_000)), terakhir_ip: '103.10.20.15', created_at: '2026-11-10 07:20:00', dipakai_pegawai: 1 },
  { id: 2, pegawai_id: 2, perangkat: 'p-2', nama: 'iPhone 13', platform: 'ios', versi_app: '1.0.0', status: 'aktif', terakhir_at: jamIni('07:21'), terakhir_ip: '103.10.20.16', created_at: '2026-11-10 07:20:00', dipakai_pegawai: 2 },
  { id: 3, pegawai_id: 21, perangkat: 'p-3', nama: 'Redmi Note 12', platform: 'android', versi_app: '1.0.0', status: 'menunggu', terakhir_at: jamIni('07:40'), terakhir_ip: '114.5.1.9', created_at: jamIni('07:40'), dipakai_pegawai: 1 },
];

const LABEL_TANDA: Record<string, string> = { luar_area: 'Di luar area presensi', akurasi_rendah: 'Akurasi lokasi rendah', lokasi_palsu: 'Lokasi palsu', perangkat_baru: 'Perangkat baru', perangkat_bersama: 'Perangkat dipakai pegawai lain', selisih_waktu: 'Jam perangkat berbeda', lompat_lokasi: 'Perpindahan tidak wajar', hari_libur: 'Hari libur' };
function kejadian(p: Baris): Baris {
  const pg = pegawai(p.pegawai_id);
  const area = p.lat != null ? AREA.reduce((m, a) => (jarak(p, a) - a.radius_m < jarak(p, m) - m.radius_m ? a : m), AREA[0]!) : null;
  const j = area ? Math.max(0, Math.round(jarak(p, area) - area.radius_m)) : null;
  const tanda: string[] = p.tanda ?? (j && j > 0 ? ['luar_area'] : []);
  return {
    id: uuid(),
    pegawai_nama: pg?.nama_lengkap ?? null,
    pegawai_jenis: pg?.jenis ?? null,
    tanggal: hariIni(),
    waktu_perangkat: null,
    lat: null,
    lng: null,
    akurasi_m: null,
    lokasi: area ? { id: area.id, nama: area.nama } : null,
    jarak_m: j,
    di_area: j === 0,
    sumber: 'mobile',
    platform: 'android',
    perangkat_id: null,
    lokasi_palsu: false,
    foto_berkas_id: null,
    alasan: null,
    catatan: null,
    ditinjau_oleh: null,
    ditinjau_at: null,
    catatan_tinjau: null,
    skor_risiko: tanda.includes('luar_area') ? 60 : tanda.length * 20,
    ...p,
    tanda,
    tanda_label: tanda.map((t) => LABEL_TANDA[t] ?? t),
  };
}
const KEJADIAN: Baris[] = [
  kejadian({ pegawai_id: 2, aksi: 'masuk', waktu: jamIni('07:21'), lat: 0.4745, lng: 121.938, akurasi_m: 9, status: 'diterima' }),
  kejadian({ pegawai_id: 3, aksi: 'masuk', waktu: jamIni('07:26'), lat: 0.4801, lng: 121.9452, akurasi_m: 14, status: 'diterima', platform: 'ios' }),
  kejadian({ pegawai_id: 4, aksi: 'masuk', waktu: jamIni('07:33'), lat: 0.4739, lng: 121.9372, akurasi_m: 22, status: 'diterima' }),
  kejadian({ pegawai_id: 20, aksi: 'masuk', waktu: jamIni('07:35'), lat: 0.4751, lng: 121.939, akurasi_m: 6, status: 'diterima', sumber: 'web', platform: 'web' }),
  kejadian({ pegawai_id: 21, aksi: 'masuk', waktu: jamIni('07:40'), lat: 0.4799, lng: 121.9449, akurasi_m: 11, status: 'diterima', tanda: ['perangkat_baru'] }),
  kejadian({ pegawai_id: 5, aksi: 'masuk', waktu: jamIni('07:48'), lat: 0.4952, lng: 121.9301, akurasi_m: 12, status: 'ditinjau', alasan: 'Perlu tinjauan: di luar area presensi', catatan: 'Rapat koordinasi di kantor Bupati Pohuwato' }),
  kejadian({ pegawai_id: 6, aksi: 'masuk', waktu: jamIni('07:52'), lat: 0.4748, lng: 121.9383, akurasi_m: 18, status: 'ditinjau', alasan: 'Perlu tinjauan: perangkat dipakai pegawai lain', tanda: ['perangkat_bersama', 'perangkat_baru'], skor_risiko: 70 }),
  kejadian({ pegawai_id: 7, aksi: 'masuk', waktu: jamIni('08:02'), lat: 0.4744, lng: 121.938, akurasi_m: 340, status: 'ditolak', alasan: 'Akurasi lokasi terlalu rendah (340 m, batas 100 m).', tanda: ['akurasi_rendah'] }),
  kejadian({ pegawai_id: 8, aksi: 'masuk', waktu: jamIni('08:05'), lat: 0.4712, lng: 121.9601, akurasi_m: 5, status: 'ditolak', alasan: 'Lokasi palsu terdeteksi.', lokasi_palsu: true, tanda: ['lokasi_palsu'] }),
];
const KOREKSI: Baris[] = [
  { id: uuid(), pegawai_id: 23, pegawai_nama: pegawai(23)?.nama_lengkap, tanggal: tgl(new Date(Date.now() - 86_400_000)), jenis: 'lupa_pulang', jam_masuk: null, jam_pulang: `${tgl(new Date(Date.now() - 86_400_000))} 16:10:00`, alasan: 'Baterai ponsel habis saat jam pulang.', berkas_id: null, kejadian_id: null, status: 'diajukan', atasan_nama: null, diputuskan_oleh: null, diputuskan_at: null, catatan_keputusan: null, presensi_masuk: `${tgl(new Date(Date.now() - 86_400_000))} 07:28:00`, presensi_pulang: null, presensi_status: 'hadir', bisa_putuskan: true, created_at: jamIni('06:50') },
  { id: uuid(), pegawai_id: SAYA, pegawai_nama: pegawai(SAYA)?.nama_lengkap, tanggal: tgl(new Date(Date.now() - 3 * 86_400_000)), jenis: 'luar_area', jam_masuk: `${tgl(new Date(Date.now() - 3 * 86_400_000))} 08:00:00`, jam_pulang: null, alasan: 'Menguji mahasiswa KKN di Desa Buntulia.', berkas_id: null, kejadian_id: null, status: 'disetujui', atasan_nama: 'Dekan', diputuskan_oleh: 'dekan', diputuskan_at: '2026-11-14 09:00:00', catatan_keputusan: null, presensi_masuk: `${tgl(new Date(Date.now() - 3 * 86_400_000))} 08:00:00`, presensi_pulang: null, presensi_status: 'hadir', bisa_putuskan: false, created_at: '2026-11-13 17:00:00' },
];
let presensiSaya: Baris | null = null;
const kejadianSaya: Baris[] = [];

// ---------------------------------------------------------------- Rute
function halaman<T>(rows: T[], u: URL) {
  const per = Number(u.searchParams.get('per_page') ?? 25) || 25;
  const page = Number(u.searchParams.get('page') ?? 1) || 1;
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
}
function hariIniData(): Baris {
  const j = JADWAL.find((x) => x.id === 3)!;
  const aksi = !presensiSaya?.jam_masuk ? 'masuk' : 'pulang';
  return {
    server_waktu: new Date().toISOString(),
    zona: 'Asia/Makassar',
    tanggal: hariIni(),
    jadwal: { kerja: true, libur: null, masuk: '08:00', pulang: '16:00', masuk_at: jamIni('08:00'), pulang_at: jamIni('16:00'), buka_at: jamIni('06:00'), tutup_at: jamIni('22:00'), kode: j.kode, nama: j.nama, jenis: j.jenis, toleransi_terlambat_menit: 0, min_kerja_menit: j.min_kerja_menit, lintas_hari: false, wajib_lokasi: true, wajib_foto: false, mode_lokasi: 'area' },
    presensi: presensiSaya,
    cuti: null,
    mode_lokasi: 'area',
    lokasi: AREA.filter((a) => a.id !== 3).map(({ jaringan, ...a }) => a),
    aksi_berikut: aksi,
    bisa: true,
    alasan: null,
    aturan: { wajib_lokasi: true, wajib_foto: false, akurasi_maks_m: 100, luar_area: 'tinjau', lokasi_palsu: 'tolak', hari_libur: 'tinjau', batas_perangkat: 2, perangkat_baru: 'otomatis' },
    kejadian: kejadianSaya,
    perangkat: { status: 'aktif' },
  };
}

tambahRute(/^\/v1\/sdm\/presensi\/.*$/, (u, init) => {
  const path = u.pathname.slice('/v1/sdm/presensi'.length);
  const m = metode(init);
  const b = badan(init);
  let r: RegExpMatchArray | null;

  if (path === '/hari-ini') return { data: hariIniData() };
  if (path === '/catat' && m === 'POST') {
    const d = hariIniData();
    if (b.lat == null) return galat(422, 'lokasi_wajib', 'Aktifkan lokasi (GPS) untuk presensi. Presensi dibatasi area kerja.');
    if (b.akurasi > 100) return galat(422, 'akurasi_rendah', `Akurasi lokasi terlalu rendah (${Math.round(b.akurasi)} m, batas 100 m). Pindah ke tempat terbuka lalu coba lagi.`, { akurasi_maks_m: 100 });
    const k = kejadian({ pegawai_id: SAYA, aksi: d.aksi_berikut, waktu: waktu(new Date()), lat: b.lat, lng: b.lng, akurasi_m: Math.round(b.akurasi ?? 0), sumber: 'web', platform: 'web', catatan: b.catatan ?? null, status: 'diterima' });
    if (!k.di_area) {
      if (!b.catatan) return galat(422, 'alasan_wajib', `Anda ${k.jarak_m} m dari ${k.lokasi?.nama}. Tulis alasan agar presensi ditinjau atasan.`, { jarak_m: k.jarak_m });
      k.status = 'ditinjau';
      k.alasan = 'Perlu tinjauan: di luar area presensi';
    }
    kejadianSaya.unshift(k);
    KEJADIAN.unshift(k);
    if (k.status === 'diterima') {
      const jm = waktu(new Date()).slice(11, 16);
      presensiSaya = presensiSaya
        ? { ...presensiSaya, jam_pulang: k.waktu }
        : { id: 1, pegawai_id: SAYA, tanggal: hariIni(), jam_masuk: k.waktu, jam_pulang: null, status: jm > '08:00' ? 'terlambat' : 'hadir', terlambat_menit: 0, pulang_cepat_menit: 0, sumber: 'mandiri', keterangan: null };
    }
    return { data: { status: k.status, aksi: k.aksi, pesan: k.status === 'diterima' ? `${k.aksi === 'masuk' ? 'Masuk' : 'Pulang'} tercatat pukul ${k.waktu.slice(11, 16)}.` : 'Presensi dikirim untuk ditinjau atasan.', ulang: false, kejadian: k, presensi: presensiSaya } };
  }
  if (path === '/kejadian') {
    const sebagai = u.searchParams.get('sebagai') ?? 'saya';
    const st = u.searchParams.get('status');
    const rows = KEJADIAN.filter((k) => (sebagai === 'saya' ? k.pegawai_id === SAYA : k.pegawai_id !== SAYA) && (!st || k.status === st));
    return halaman(rows, u);
  }
  if ((r = path.match(/^\/kejadian\/([^/]+)\/tinjau$/)) && m === 'POST') {
    const k = KEJADIAN.find((x) => x.id === r![1]);
    if (!k) return galat(404, 'not_found', 'Percobaan presensi tidak ditemukan.');
    if (b.keputusan === 'tolak' && !b.catatan) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { catatan: 'Tulis alasan penolakan.' } });
    Object.assign(k, { status: b.keputusan === 'terima' ? 'diterima' : 'ditolak', ditinjau_oleh: 'demo', ditinjau_at: waktu(new Date()), catatan_tinjau: b.catatan ?? null });
    return { data: k };
  }
  if (path === '/peta') {
    const titik = KEJADIAN.filter((k) => k.tanggal === (u.searchParams.get('tanggal') ?? hariIni()));
    const n = (s: string) => titik.filter((k) => k.status === s).length;
    return { data: { tanggal: u.searchParams.get('tanggal') ?? hariIni(), lokasi: AREA, titik, ringkasan: { diterima: n('diterima'), ditinjau: n('ditinjau'), ditolak: n('ditolak'), di_area: titik.filter((k) => k.di_area).length, luar_area: titik.filter((k) => !k.di_area && k.lat != null).length } } };
  }
  // Area
  if (path === '/lokasi' && m === 'GET') return { data: u.searchParams.get('semua') === '1' ? AREA : AREA.filter((a) => a.aktif) };
  if (path === '/lokasi' && m === 'POST') {
    if (AREA.some((a) => a.kode === b.kode)) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { kode: 'Kode sudah dipakai.' } });
    const a = { ...b, id: AREA.length + 1, uuid: uuid(), unit_nama: null, ada_jaringan: !!b.jaringan };
    AREA.push(a);
    return { __status: 201, data: a };
  }
  if ((r = path.match(/^\/lokasi\/([^/]+)(\/hapus)?$/)) && m === 'POST') {
    const i = AREA.findIndex((a) => a.uuid === r![1] || String(a.id) === r![1]);
    if (i < 0) return galat(404, 'not_found', 'Area tidak ditemukan.');
    if (r[2]) return { data: { dihapus: true, ...AREA.splice(i, 1)[0] } };
    AREA[i] = { ...AREA[i], ...b, ada_jaringan: !!b.jaringan };
    return { data: AREA[i] };
  }
  // Jadwal
  if (path === '/jadwal' && m === 'GET') return { data: JADWAL };
  if (path === '/jadwal' && m === 'POST') {
    const j = { ...b, id: JADWAL.length, uuid: uuid(), dipakai: 0, bawaan: false };
    JADWAL.push(j);
    return { __status: 201, data: j };
  }
  if ((r = path.match(/^\/jadwal\/([^/]+)(\/hapus)?$/)) && m === 'POST') {
    const i = JADWAL.findIndex((a) => a.uuid === r![1] || String(a.id) === r![1]);
    if (i < 0) return galat(404, 'not_found', 'Jadwal tidak ditemukan.');
    if (r[2]) {
      if (JADWAL[i]!.dipakai) return galat(409, 'dipakai', 'Jadwal masih dipakai penugasan.');
      return { data: JADWAL.splice(i, 1)[0] };
    }
    JADWAL[i] = { ...JADWAL[i], ...b };
    return { data: JADWAL[i] };
  }
  // Penugasan
  if (path === '/penugasan' && m === 'GET') return { data: PENUGASAN.map(bentukPenugasan) };
  if (path === '/penugasan' && m === 'POST') {
    const p = { ...b, id: PENUGASAN.length + 1, jadwal_id: JADWAL.find((j) => j.uuid === b.jadwal_id)?.id ?? 1, lokasi_ids: b.lokasi_ids?.map(Number) ?? null };
    PENUGASAN.push(p);
    return { __status: 201, data: bentukPenugasan(p) };
  }
  if ((r = path.match(/^\/penugasan\/(\d+)(\/hapus)?$/)) && m === 'POST') {
    const i = PENUGASAN.findIndex((a) => String(a.id) === r![1]);
    if (i < 0) return galat(404, 'not_found', 'Penugasan tidak ditemukan.');
    if (r[2]) return { data: PENUGASAN.splice(i, 1)[0] };
    PENUGASAN[i] = { ...PENUGASAN[i], ...b, jadwal_id: JADWAL.find((j) => j.uuid === b.jadwal_id)?.id ?? PENUGASAN[i]!.jadwal_id, lokasi_ids: b.lokasi_ids?.map(Number) ?? null };
    return { data: bentukPenugasan(PENUGASAN[i]!) };
  }
  // Perangkat
  if (path === '/perangkat' && m === 'GET') {
    const kelola = u.searchParams.get('sebagai') === 'kelola';
    const st = u.searchParams.get('status');
    return { data: PERANGKAT.filter((p) => (kelola || p.pegawai_id === SAYA) && (!st || p.status === st)).map((p) => ({ ...p, pegawai_nama: pegawai(p.pegawai_id)?.nama_lengkap, pegawai_jenis: pegawai(p.pegawai_id)?.jenis })) };
  }
  if ((r = path.match(/^\/perangkat\/(\d+)$/)) && m === 'POST') {
    const i = PERANGKAT.findIndex((p) => String(p.id) === r![1]);
    if (i < 0) return galat(404, 'not_found', 'Perangkat tidak ditemukan.');
    if (b.status === 'lepas') return { data: PERANGKAT.splice(i, 1)[0] };
    PERANGKAT[i]!.status = b.status;
    return { data: PERANGKAT[i] };
  }
  // Koreksi
  if (path === '/koreksi' && m === 'GET') {
    const penyetuju = u.searchParams.get('sebagai') === 'penyetuju';
    const st = u.searchParams.get('status');
    return halaman(KOREKSI.filter((k) => (penyetuju ? k.pegawai_id !== SAYA : k.pegawai_id === SAYA) && (!st || k.status === st)), u);
  }
  if (path === '/koreksi' && m === 'POST') {
    if (!b.alasan) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { alasan: 'Tulis alasan.' } });
    const k = { ...b, id: uuid(), pegawai_id: SAYA, pegawai_nama: pegawai(SAYA)?.nama_lengkap, status: 'diajukan', presensi_masuk: null, presensi_pulang: null, presensi_status: null, bisa_putuskan: false, created_at: waktu(new Date()) };
    KOREKSI.unshift(k);
    return { __status: 201, data: k };
  }
  if ((r = path.match(/^\/koreksi\/([^/]+)\/(setujui|tolak|batal)$/)) && m === 'POST') {
    const k = KOREKSI.find((x) => x.id === r![1]);
    if (!k) return galat(404, 'not_found', 'Koreksi tidak ditemukan.');
    if (r[2] === 'tolak' && !b.catatan) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { catatan: 'Tulis alasan penolakan.' } });
    Object.assign(k, { status: r[2] === 'setujui' ? 'disetujui' : r[2] === 'tolak' ? 'ditolak' : 'dibatalkan', catatan_keputusan: b.catatan ?? null, diputuskan_oleh: 'demo', diputuskan_at: waktu(new Date()) });
    if (r[2] === 'setujui') Object.assign(k, { presensi_masuk: k.jam_masuk ?? k.presensi_masuk, presensi_pulang: k.jam_pulang ?? k.presensi_pulang });
    return { data: k };
  }
  return galat(404, 'not_found', 'Rute presensi kerja tiruan tidak ada.');
});
