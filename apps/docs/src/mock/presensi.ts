// Presensi QR (/v1/presensi): server tiruan di memori. Sesi kuliah/kegiatan, QR berganti, pindai kode, peserta,
// izin, titik kerja. Nama dan NIM rekaan; gambar QR tiruan (pola acak dengan penanda sudut, tidak bisa dipindai).
import { DOSEN, LEWATI, MAHASISWA, PEGAWAI, tambahRute } from './siakad';

type Baris = Record<string, any>;
const badan = (init?: RequestInit) => (init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : {}) as Baris;
const metode = (init?: RequestInit) => (init?.method ?? 'GET').toUpperCase();
const galat = (status: number, code: string, message: string, details?: unknown) => ({ __status: status, error: { code, message, details } });
const pad = (n: number) => String(n).padStart(2, '0');
const tgl = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const waktu = (d: Date) => `${tgl(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const kini = () => waktu(new Date());
const menitLalu = (m: number) => waktu(new Date(Date.now() - m * 60_000));
const hari = (h: number) => tgl(new Date(Date.now() + h * 86_400_000));
let urut = 1;
const uuid = () => `5e551000-0000-4000-8000-${String(urut++).padStart(12, '0')}`;
const kodeAcak = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');

// ---------------------------------------------------------------- QR tiruan
function svgTiruan(isi: string): string {
  const n = 29;
  let h = 2166136261;
  for (const c of isi) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const acak = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) % 1000) / 1000;
  const penanda = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="#111"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#111"/>`;
  const dalam = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  let modul = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!dalam(x, y) && acak() < 0.48) modul += `M${x} ${y}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${n + 2} ${n + 2}" shape-rendering="crispEdges"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><path d="${modul}" fill="#111"/>${penanda(0, 0)}${penanda(n - 7, 0)}${penanda(0, n - 7)}</svg>`;
}
function qr(tipe: string, id: string, interval: number) {
  const det = Math.floor(Date.now() / 1000);
  const jendela = Math.floor(det / interval);
  const sisa = interval - (det % interval);
  const token = `UP1.${tipe}.${id.replace(/-/g, '')}.${jendela.toString(36)}.tiruan`;
  return {
    token,
    isi: `https://e-learning.unipo.ac.id/presensi?t=${token}`,
    jendela,
    berlaku_sampai: waktu(new Date(Date.now() + sisa * 1000)),
    sisa_detik: sisa,
    interval_detik: interval,
    svg: svgTiruan(token),
  };
}

// ---------------------------------------------------------------- Data
const KELAS = [
  { idj: 4101, kode_mk: 'IF2103', nama_mk: 'Algoritma dan Struktur Data', kelas: 'A', hari: 'Senin', jam_mulai: '08:00', nama_ruang: 'Lab Komputer 1', kode_prodi: '55201' },
  { idj: 4102, kode_mk: 'IF2105', nama_mk: 'Basis Data', kelas: 'B', hari: 'Selasa', jam_mulai: '10:00', nama_ruang: 'R.202', kode_prodi: '55201' },
  { idj: 4103, kode_mk: 'IF3107', nama_mk: 'Rekayasa Perangkat Lunak', kelas: 'A', hari: 'Kamis', jam_mulai: '13:00', nama_ruang: 'R.305', kode_prodi: '55201' },
];
const PESERTA_KELAS = MAHASISWA.slice(0, 24).map((m) => ({ jenis: 'mahasiswa', subjek: m.nim, nama: m.nama }));
const dosen = DOSEN[2]!;

const SESI: Baris[] = [];
const HADIR = new Map<string, Baris[]>();
const UNDANGAN = new Map<string, Baris[]>();
const LOG = new Map<string, Baris[]>();
const IZIN: Baris[] = [];

function sesiBaru(x: Baris): Baris {
  const s: Baris = {
    id: uuid(),
    keterangan: null,
    mulai_at: null,
    selesai_at: null,
    dibuka_at: null,
    ditutup_at: null,
    kuliah: null,
    peserta: 'kelas',
    unit: 'prodi-55201',
    interval_detik: 20,
    kode: kodeAcak(),
    izinkan_kartu: true,
    terlambat_menit: 15,
    lokasi: { lat: 0.4785, lng: 121.9372, radius_m: 100, wajib: false },
    tolak_perangkat_ganda: false,
    status_kosong: 'A',
    disahkan_at: null,
    disahkan_oleh: null,
    dibuat_oleh: dosen.nidn,
    created_at: kini(),
    petugas: [],
    ...x,
  };
  SESI.unshift(s);
  HADIR.set(s.id, []);
  LOG.set(s.id, []);
  return s;
}
const kuliah = (k: (typeof KELAS)[number], pertemuan: number) => ({
  idj: k.idj,
  kode_prodi: k.kode_prodi,
  tahun_id: '20251',
  kode_mk: k.kode_mk,
  kelas: k.kelas,
  nidn: dosen.nidn,
  jam: 1,
  jam_selesai: 3,
  lama: 3,
  bahasan: `Pertemuan ${pertemuan}`,
  siakad_iddm: null,
  lms_kelas_id: 12,
  lms_sesi_id: null,
});

// Sesi lalu (disahkan), sesi berjalan (buka), dan kegiatan (draf).
const lalu = sesiBaru({ jenis: 'kuliah', judul: KELAS[0]!.nama_mk, status: 'disahkan', tanggal: hari(-7), kuliah: { ...kuliah(KELAS[0]!, 6), siakad_iddm: 14321, lms_sesi_id: 88 }, dibuka_at: `${hari(-7)} 08:03:00`, ditutup_at: `${hari(-7)} 09:41:00`, disahkan_at: `${hari(-7)} 09:41:00`, disahkan_oleh: dosen.nidn });
HADIR.set(
  lalu.id,
  PESERTA_KELAS.map((p, i) => ({ ...p, status: i % 9 === 4 ? 'A' : i % 11 === 3 ? 'I' : 'H', waktu: `${hari(-7)} 08:${pad(5 + (i % 20))}:00`, cara: 'qr', terlambat: i % 7 === 2, terlambat_menit: i % 7 === 2 ? 18 : 0, jarak_m: 12 + i, curiga: false })),
);
const buka = sesiBaru({ jenis: 'kuliah', judul: KELAS[0]!.nama_mk, status: 'buka', tanggal: hari(0), kuliah: kuliah(KELAS[0]!, 7), dibuka_at: menitLalu(14) });
HADIR.set(buka.id, [
  { jenis: 'dosen', subjek: dosen.nidn, nama: dosen.nama_lengkap, status: 'H', waktu: menitLalu(14), cara: 'buka', terlambat: false, terlambat_menit: 0, jarak_m: 3, curiga: false },
  ...PESERTA_KELAS.slice(0, 13).map((p, i) => ({
    ...p,
    status: 'H',
    waktu: menitLalu(13 - i),
    cara: i === 5 ? 'kode' : i === 9 ? 'kartu' : 'qr',
    terlambat: false,
    terlambat_menit: 0,
    jarak_m: i === 7 ? 1840 : 8 + i * 3,
    curiga: i === 7,
    alasan_curiga: i === 7 ? 'Lokasi 1840 m dari ruang (batas 100 m)' : null,
  })),
]);
const kegiatan = sesiBaru({ jenis: 'kegiatan', judul: 'Rapat koordinasi akreditasi prodi', status: 'draf', tanggal: hari(1), peserta: 'undangan', mulai_at: `${hari(1)} 09:00:00`, selesai_at: `${hari(1)} 11:00:00`, unit: 'fak-01', dibuat_oleh: 'operator.fakultas' });
UNDANGAN.set(kegiatan.id, [...DOSEN.slice(0, 6).map((d) => ({ jenis: 'dosen', subjek: d.nidn, nama: d.nama_lengkap, peran: 'Peserta' })), { jenis: 'tendik', subjek: 'staf.bak', nama: PEGAWAI[11]!.nama_lengkap, peran: 'Notulis' }]);
IZIN.push(
  { id: uuid(), sesi_id: buka.id, sesi_judul: buka.judul, idj: KELAS[0]!.idj, tanggal: hari(0), jenis_subjek: 'mahasiswa', subjek: PESERTA_KELAS[20]!.subjek, nama: PESERTA_KELAS[20]!.nama, jenis: 'sakit', alasan: 'Demam tinggi sejak semalam', berkas_id: 'b0000000-0000-4000-8000-000000000001', status: 'diajukan', diproses_oleh: null, diproses_at: null, catatan_proses: null, created_at: menitLalu(40) },
  { id: uuid(), sesi_id: null, sesi_judul: null, idj: KELAS[1]!.idj, tanggal: hari(-3), jenis_subjek: 'mahasiswa', subjek: PESERTA_KELAS[0]!.subjek, nama: PESERTA_KELAS[0]!.nama, jenis: 'izin', alasan: 'Mewakili kampus di lomba debat tingkat provinsi', berkas_id: null, status: 'disetujui', diproses_oleh: dosen.nidn, diproses_at: `${hari(-4)} 15:20:00`, catatan_proses: null, created_at: `${hari(-5)} 10:00:00` },
);

const TITIK: Baris[] = [
  { id: uuid(), kode: 'gerbang-utama', nama: 'Gerbang utama', jenis: 'gerbang', untuk: 'pegawai', unit: 'rektorat', lokasi: { lat: 0.4781, lng: 121.9369, radius_m: 150 }, wajib_lokasi: true, interval_detik: 20, aktif: true, keterangan: 'Tablet di pos satpam', updated_at: `${hari(-20)} 10:00:00` },
  { id: uuid(), kode: 'biro-akademik', nama: 'Biro Akademik', jenis: 'kantor', untuk: 'tendik', unit: 'baak', lokasi: { lat: 0.4788, lng: 121.9375, radius_m: 60 }, wajib_lokasi: true, interval_detik: 20, aktif: true, keterangan: null, updated_at: `${hari(-12)} 10:00:00` },
  { id: uuid(), kode: 'gedung-lama', nama: 'Gedung lama', jenis: 'lainnya', untuk: 'pegawai', unit: null, lokasi: null, wajib_lokasi: false, interval_detik: 30, aktif: false, keterangan: 'Sedang direnovasi', updated_at: `${hari(-40)} 10:00:00` },
];

// ---------------------------------------------------------------- Bentuk
const daftarPeserta = (s: Baris): Baris[] => (s.jenis === 'kuliah' ? PESERTA_KELAS : s.peserta === 'undangan' ? (UNDANGAN.get(s.id) ?? []) : []);
function ringkasan(s: Baris) {
  const h = (HADIR.get(s.id) ?? []).filter((x) => !(s.jenis === 'kuliah' && x.jenis === 'dosen'));
  const n = { H: 0, I: 0, S: 0, A: 0 } as Record<string, number>;
  h.forEach((x) => (n[x.status] = (n[x.status] ?? 0) + 1));
  const total = s.jenis === 'kuliah' || s.peserta === 'undangan' ? daftarPeserta(s).length : null;
  return {
    peserta: total,
    hadir: n.H,
    izin: n.I,
    sakit: n.S,
    alpa: n.A,
    terlambat: h.filter((x) => x.terlambat).length,
    curiga: h.filter((x) => x.curiga).length,
    belum: total == null ? null : Math.max(0, total - h.length),
    persen_hadir: total ? Math.round((1000 * n.H!) / total) / 10 : null,
  };
}
const bentuk = (s: Baris) => {
  const { kode, petugas, ...r } = s;
  return { ...r, pakai_kode: kode != null, jumlah_hadir: (HADIR.get(s.id) ?? []).filter((x) => x.status === 'H' && x.jenis !== 'dosen').length };
};
const detail = (s: Baris) => ({ ...bentuk(s), hak: { kelola: true, bantu: true }, ringkasan: ringkasan(s), kode: s.kode, petugas: s.petugas });
const cariSesi = (id: string) => SESI.find((s) => s.id === id);

// Pindaian baru setiap kali layar QR mengambil QR, agar demo terasa hidup.
function simulasiPindai(s: Baris) {
  if (s.status !== 'buka' || Math.random() < 0.45) return;
  const h = HADIR.get(s.id)!;
  const belum = daftarPeserta(s).filter((p) => !h.some((x) => x.jenis === p.jenis && x.subjek === p.subjek));
  const p = belum[Math.floor(Math.random() * belum.length)];
  if (!p) return;
  const telat = Date.now() - new Date(s.dibuka_at.replace(' ', 'T')).getTime() > (s.terlambat_menit ?? 999) * 60_000;
  h.push({ ...p, status: 'H', waktu: kini(), cara: 'qr', terlambat: telat, terlambat_menit: telat ? 16 : 0, jarak_m: 10 + Math.floor(Math.random() * 40), curiga: false });
  LOG.get(s.id)!.unshift({ subjek: p.subjek, cara: 'qr', hasil: 'ok', alasan: null, ip: '10.12.0.' + Math.floor(Math.random() * 200), perangkat: Math.random().toString(16).slice(2, 10), created_at: kini() });
}
LOG.set(buka.id, [
  { subjek: PESERTA_KELAS[14]!.subjek, cara: 'qr', hasil: 'ditolak', alasan: 'QR kedaluwarsa (foto QR lama)', ip: '10.12.0.44', perangkat: '9f3a21bc', created_at: menitLalu(6) },
  { subjek: PESERTA_KELAS[7]!.subjek, cara: 'qr', hasil: 'ok', alasan: 'di luar radius (ditandai)', ip: '36.85.1.20', perangkat: '1c77e0aa', created_at: menitLalu(6) },
  { subjek: 'K5726099', cara: 'kode', hasil: 'ditolak', alasan: 'Bukan peserta kelas', ip: '10.12.0.81', perangkat: 'a0b1c2d3', created_at: menitLalu(9) },
]);

function peserta(s: Baris) {
  const h = HADIR.get(s.id) ?? [];
  const kunci = (x: Baris) => `${x.jenis}|${x.subjek}`;
  const izin = (x: Baris) => {
    const i = IZIN.find((z) => z.sesi_id === s.id && z.subjek === x.subjek && ['diajukan', 'disetujui'].includes(z.status));
    return i ? { id: i.id, jenis: i.jenis, status: i.status } : null;
  };
  const baris = (p: Baris, x?: Baris) => ({
    jenis: p.jenis,
    subjek: p.subjek,
    nama: p.nama,
    peran: p.peran ?? null,
    status: x?.status ?? null,
    waktu: x?.waktu ?? null,
    cara: x?.cara ?? null,
    terlambat: !!x?.terlambat,
    terlambat_menit: x?.terlambat_menit ?? 0,
    jarak_m: x?.jarak_m ?? null,
    curiga: !!x?.curiga,
    alasan_curiga: x?.alasan_curiga ?? null,
    catatan: x?.catatan ?? null,
    dicatat_oleh: x?.dicatat_oleh ?? null,
    izin: izin(p),
  });
  const daftar = daftarPeserta(s);
  const ada = new Set(daftar.map(kunci));
  const lain = h.filter((x) => !ada.has(kunci(x)));
  return {
    sesi: bentuk(s),
    ringkasan: ringkasan(s),
    peserta: [...daftar.map((p) => baris(p, h.find((x) => kunci(x) === kunci(p)))), ...lain.filter((x) => !(s.jenis === 'kuliah' && x.jenis === 'dosen')).map((x) => baris(x, x))],
    pengajar: lain.filter((x) => s.jenis === 'kuliah' && x.jenis === 'dosen').map((x) => baris(x, x)),
  };
}

function catat(s: Baris, p: Baris, cara: string) {
  const h = HADIR.get(s.id)!;
  const ada = h.find((x) => x.jenis === p.jenis && x.subjek === p.subjek && x.status === 'H');
  if (ada) return { sudah: true, pesan: `Presensi Anda sudah tercatat pukul ${ada.waktu.slice(11, 16)}.`, hadir: ada, sesi: { id: s.id, jenis: s.jenis, judul: s.judul, tanggal: s.tanggal, kelas: s.kuliah?.kelas ?? null, kode_mk: s.kuliah?.kode_mk ?? null } };
  const x = { ...p, status: 'H', waktu: kini(), cara, terlambat: false, terlambat_menit: 0, jarak_m: 14, curiga: false };
  const i = h.findIndex((y) => y.jenis === p.jenis && y.subjek === p.subjek);
  if (i >= 0) h[i] = x;
  else h.push(x);
  LOG.get(s.id)!.unshift({ subjek: p.subjek, cara, hasil: 'ok', alasan: null, ip: '10.12.0.7', perangkat: 'demo', created_at: kini() });
  return { sudah: false, pesan: 'Presensi tercatat.', hadir: x, sesi: { id: s.id, jenis: s.jenis, judul: s.judul, tanggal: s.tanggal, kelas: s.kuliah?.kelas ?? null, kode_mk: s.kuliah?.kode_mk ?? null } };
}

// ---------------------------------------------------------------- Rute
const SAYA = PESERTA_KELAS[3]!;

tambahRute(/^\/v1\/jadwal(\/\d+)?$/, (u) => {
  const id = u.pathname.match(/\/(\d+)$/)?.[1];
  if (id) {
    const k = KELAS.find((x) => String(x.idj) === id);
    return k ? { data: k } : LEWATI;
  }
  if (u.searchParams.get('kode_mk')) return LEWATI;
  return { data: KELAS };
});

tambahRute(/^\/v1\/presensi\/.*$/, (u, init) => {
  const path = u.pathname.slice('/v1/presensi'.length);
  const m = metode(init);
  const b = badan(init);
  let r: RegExpMatchArray | null;

  if (path === '/sesi' && m === 'GET') {
    const st = u.searchParams.get('status');
    const jenis = u.searchParams.get('jenis');
    const idj = u.searchParams.get('idj');
    return { data: SESI.filter((s) => (!st || s.status === st) && (!jenis || s.jenis === jenis) && (!idj || String(s.kuliah?.idj) === idj)).map(bentuk) };
  }
  if (path === '/sesi' && m === 'POST') {
    const jenis = b.jenis === 'kegiatan' ? 'kegiatan' : 'kuliah';
    if (jenis === 'kuliah') {
      const k = KELAS.find((x) => x.idj === Number(b.idj)) ?? (b.lms_kelas_id ? KELAS[0] : undefined);
      if (!k) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { idj: 'Kelas tidak ditemukan.' } });
      const s = sesiBaru({ jenis, judul: k.nama_mk, status: b.buka ? 'buka' : 'draf', tanggal: b.tanggal || hari(0), kuliah: { ...kuliah(k, 8), bahasan: b.bahasan ?? null }, dibuka_at: b.buka ? kini() : null, kode: b.pakai_kode === false ? null : kodeAcak() });
      return { __status: 201, data: detail(s) };
    }
    if (!b.judul) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { judul: 'Tulis nama kegiatan.' } });
    const s = sesiBaru({ jenis, judul: b.judul, status: b.buka ? 'buka' : 'draf', tanggal: b.tanggal || hari(0), peserta: b.peserta ?? 'undangan', unit: b.unit ?? null, mulai_at: b.mulai_at ?? null, selesai_at: b.selesai_at ?? null, dibuka_at: b.buka ? kini() : null, petugas: b.petugas ?? [], dibuat_oleh: 'demo' });
    if (Array.isArray(b.undangan)) UNDANGAN.set(s.id, b.undangan.map((x: Baris) => ({ ...x, nama: x.nama ?? x.subjek })));
    return { __status: 201, data: detail(s) };
  }
  if ((r = path.match(/^\/sesi\/([^/]+)(?:\/([a-z-]+))?$/))) {
    const s = cariSesi(r[1]!);
    if (!s) return galat(404, 'not_found', 'Sesi presensi tidak ditemukan.');
    const aksi = r[2];
    if (!aksi && m === 'GET') return { data: detail(s) };
    if (!aksi && m === 'POST') {
      Object.assign(s, Object.fromEntries(Object.entries(b).filter(([k]) => ['judul', 'keterangan', 'interval_detik', 'izinkan_kartu', 'tolak_perangkat_ganda', 'terlambat_menit', 'status_kosong', 'petugas', 'unit', 'mulai_at', 'selesai_at'].includes(k))));
      if (b.bahasan !== undefined && s.kuliah) s.kuliah.bahasan = b.bahasan;
      if (b.pakai_kode !== undefined) s.kode = b.pakai_kode ? (s.kode ?? kodeAcak()) : null;
      if (Array.isArray(b.undangan)) UNDANGAN.set(s.id, [...(UNDANGAN.get(s.id) ?? []), ...b.undangan.map((x: Baris) => ({ ...x, nama: x.nama ?? x.subjek }))]);
      return { data: detail(s) };
    }
    if (aksi === 'buka') {
      if (s.status !== 'draf') return galat(409, 'conflict', 'Hanya sesi draf yang bisa dibuka.');
      Object.assign(s, { status: 'buka', dibuka_at: kini() });
      return { data: detail(s) };
    }
    if (aksi === 'tutup') {
      if (s.status !== 'buka') return galat(409, 'conflict', 'Sesi tidak sedang dibuka.');
      Object.assign(s, { status: s.jenis === 'kuliah' ? 'disahkan' : 'tutup', ditutup_at: kini() });
      if (s.jenis === 'kuliah') Object.assign(s, { disahkan_at: kini(), disahkan_oleh: dosen.nidn, kuliah: { ...s.kuliah, siakad_iddm: 14400 + urut, lms_sesi_id: 90 + urut } });
      return { data: detail(s) };
    }
    if (aksi === 'sahkan') {
      Object.assign(s, { status: 'disahkan', disahkan_at: kini(), disahkan_oleh: 'demo' });
      return { data: detail(s) };
    }
    if (aksi === 'batal') {
      if (s.status === 'disahkan') return galat(409, 'conflict', 'Sesi yang sudah disahkan tidak bisa dibatalkan.');
      s.status = 'batal';
      return { data: detail(s) };
    }
    if (aksi === 'kode-baru') {
      s.kode = kodeAcak();
      return { data: detail(s) };
    }
    if (aksi === 'qr') {
      if (s.status !== 'buka') return galat(409, 'conflict', 'Buka sesi lebih dulu untuk menampilkan QR.');
      simulasiPindai(s);
      const h = HADIR.get(s.id)!;
      return {
        data: {
          ...qr('S', s.id, s.interval_detik),
          kode: s.kode,
          gaya: { kode: 'presensi', bagian: s.unit },
          ringkasan: ringkasan(s),
          terbaru: h.filter((x) => x.status === 'H' && x.jenis !== 'dosen').slice(-8).reverse(),
        },
      };
    }
    if (aksi === 'peserta' && m === 'GET') return { data: peserta(s) };
    if (aksi === 'peserta' && m === 'POST') {
      const h = HADIR.get(s.id)!;
      for (const x of b.peserta ?? []) {
        const p = daftarPeserta(s).find((y) => y.subjek === x.subjek) ?? { jenis: x.jenis, subjek: x.subjek, nama: x.subjek };
        const i = h.findIndex((y) => y.subjek === x.subjek);
        const baru = { ...p, ...(i >= 0 ? h[i] : {}), status: x.status, cara: i >= 0 ? h[i]!.cara : 'manual', waktu: i >= 0 ? h[i]!.waktu : kini(), dicatat_oleh: 'demo' };
        if (i >= 0) h[i] = baru;
        else h.push(baru);
      }
      if (b.lainnya) for (const p of daftarPeserta(s)) if (!h.some((y) => y.subjek === p.subjek)) h.push({ ...p, status: b.lainnya, cara: 'manual', waktu: kini(), dicatat_oleh: 'demo', terlambat: false, terlambat_menit: 0, curiga: false });
      return { data: peserta(s) };
    }
    if (aksi === 'curiga') {
      const x = HADIR.get(s.id)!.find((y) => y.subjek === b.subjek);
      if (x) Object.assign(x, { curiga: false, catatan: b.catatan ?? null });
      return { data: peserta(s) };
    }
    if (aksi === 'pindai-kartu') {
      const p = PESERTA_KELAS[Math.floor(Math.random() * PESERTA_KELAS.length)]!;
      return { data: catat(s, p, 'kartu') };
    }
    if (aksi === 'log') return { data: { log: LOG.get(s.id) ?? [] } };
  }

  if (path === '/pindai' && m === 'POST') {
    if (b.kode) {
      const s = SESI.find((x) => x.status === 'buka' && x.kode === String(b.kode).toUpperCase());
      if (!s) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { kode: 'Kode tidak cocok dengan sesi yang sedang dibuka. Periksa lagi kode di layar.' } });
      return { data: catat(s, SAYA, 'kode') };
    }
    const t = String(b.token ?? '');
    const id = t.match(/UP1\.S\.([0-9a-f]{32})\./)?.[1];
    const s = id ? SESI.find((x) => x.id.replace(/-/g, '') === id) : undefined;
    if (!s) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { token: 'QR ini bukan QR presensi UNIPO.' } });
    if (s.status !== 'buka') return galat(409, 'sesi_tidak_dibuka', 'Sesi presensi sudah ditutup.');
    return { data: catat(s, SAYA, 'qr') };
  }
  if (path === '/kartu') return { data: { ...qr('K', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', 30), pemilik: { jenis: 'mahasiswa', subjek: SAYA.subjek }, gaya: { kode: 'presensi', bagian: null } } };
  if (path === '/saya') {
    const berlangsung = SESI.filter((s) => s.status === 'buka').map((s) => {
      const h = HADIR.get(s.id)!.find((x) => x.subjek === SAYA.subjek);
      return { ...bentuk(s), saya: h ? { status: h.status, waktu: h.waktu } : null };
    });
    const riwayat = SESI.flatMap((s) => {
      const h = HADIR.get(s.id)!.find((x) => x.subjek === SAYA.subjek);
      return h ? [{ sesi_id: s.id, jenis: s.jenis, judul: s.judul, tanggal: s.tanggal, kode_mk: s.kuliah?.kode_mk ?? null, kelas: s.kuliah?.kelas ?? null, status_sesi: s.status, status: h.status, waktu: h.waktu, cara: h.cara, terlambat: !!h.terlambat, terlambat_menit: h.terlambat_menit ?? 0 }] : [];
    });
    return { data: { pemilik: { jenis: 'mahasiswa', subjek: SAYA.subjek }, berlangsung, riwayat } };
  }

  if (path === '/izin' && m === 'GET') {
    const st = u.searchParams.get('status');
    const sesiId = u.searchParams.get('sesi_id');
    const saya = u.searchParams.get('sebagai') === 'saya';
    return { data: IZIN.filter((i) => (!st || i.status === st) && (!sesiId || i.sesi_id === sesiId) && (!saya || i.subjek === SAYA.subjek || i.subjek === PESERTA_KELAS[0]!.subjek)) };
  }
  if (path === '/izin' && m === 'POST') {
    const s = b.sesi_id ? cariSesi(b.sesi_id) : null;
    const k = KELAS.find((x) => x.idj === Number(b.idj));
    const i = { id: uuid(), sesi_id: s?.id ?? null, sesi_judul: s?.judul ?? (k ? `${k.nama_mk}, kelas ${k.kelas}` : null), idj: s?.kuliah?.idj ?? k?.idj ?? null, tanggal: s?.tanggal ?? b.tanggal, jenis_subjek: 'mahasiswa', subjek: SAYA.subjek, nama: SAYA.nama, jenis: b.jenis, alasan: b.alasan, berkas_id: b.berkas_id ?? null, status: 'diajukan', diproses_oleh: null, diproses_at: null, catatan_proses: null, created_at: kini() };
    IZIN.unshift(i);
    return { __status: 201, data: i };
  }
  if ((r = path.match(/^\/izin\/([^/]+)\/(setujui|tolak|batal)$/))) {
    const i = IZIN.find((x) => x.id === r![1]);
    if (!i) return galat(404, 'not_found', 'Izin tidak ditemukan.');
    if (i.status !== 'diajukan') return galat(409, 'conflict', 'Izin sudah diproses.');
    Object.assign(i, { status: { setujui: 'disetujui', tolak: 'ditolak', batal: 'batal' }[r[2]!], diproses_oleh: 'demo', diproses_at: kini(), catatan_proses: b.catatan ?? null });
    if (r[2] === 'setujui' && i.sesi_id) {
      const h = HADIR.get(i.sesi_id)!;
      if (!h.some((x) => x.subjek === i.subjek)) h.push({ jenis: 'mahasiswa', subjek: i.subjek, nama: i.nama, status: i.jenis === 'sakit' ? 'S' : 'I', waktu: kini(), cara: 'izin', terlambat: false, terlambat_menit: 0, curiga: false });
    }
    return { data: i };
  }
  if (path.match(/^\/izin\/[^/]+\/berkas$/)) return { __mentah: new TextEncoder().encode('%PDF-1.4\n% surat contoh\n') };

  if (path === '/titik' && m === 'GET') return { data: u.searchParams.get('semua') ? TITIK : TITIK.filter((t) => t.aktif) };
  if (path === '/titik' && m === 'POST') {
    if (TITIK.some((t) => t.kode === b.kode)) return galat(422, 'validation_failed', 'Data tidak valid.', { fields: { kode: 'Kode sudah dipakai titik lain.' } });
    const [lat, lng] = String(b.lokasi ?? '').split(',').map(Number);
    const t = { id: uuid(), ...b, lokasi: b.lokasi ? { lat, lng, radius_m: b.radius_m } : null, updated_at: kini() };
    TITIK.push(t);
    return { __status: 201, data: t };
  }
  if ((r = path.match(/^\/titik\/([^/]+)(?:\/([a-z]+))?$/))) {
    const t = TITIK.find((x) => x.id === r![1] || x.kode === r![1]);
    if (!t) return galat(404, 'not_found', 'Titik presensi tidak ditemukan.');
    const aksi = r[2];
    if (!aksi && m === 'GET') return { data: t };
    if (!aksi && m === 'POST') {
      const [lat, lng] = String(b.lokasi ?? '').split(',').map(Number);
      Object.assign(t, { ...b, lokasi: b.lokasi ? { lat, lng, radius_m: b.radius_m } : null, updated_at: kini() });
      return { data: t };
    }
    if (aksi === 'hapus') {
      TITIK.splice(TITIK.indexOf(t), 1);
      return { data: { ok: true } };
    }
    if (aksi === 'qr') {
      if (!t.aktif) return galat(409, 'conflict', 'Titik presensi nonaktif.');
      const jamKini = new Date().getHours();
      return { data: { ...qr('T', t.id, t.interval_detik), titik: t, gaya: { kode: 'presensi', bagian: t.unit }, hari_ini: { masuk: 40 + Math.min(jamKini, 12) * 3, pulang: Math.max(0, jamKini - 15) * 9 } } };
    }
    if (aksi === 'log')
      return {
        data: {
          titik: t,
          tanggal: hari(0),
          log: PEGAWAI.slice(0, 8).map((p, i) => ({ subjek: p.nidn ?? p.nip, hasil: i === 5 ? 'ditolak' : 'ok', alasan: i === 5 ? 'Lokasi 420 m dari titik (batas 150 m)' : i < 6 ? 'masuk' : 'pulang', ip: `10.12.1.${20 + i}`, perangkat: `${(i * 2654435761).toString(16).slice(0, 8)}`, created_at: `${hari(0)} 0${7 + Math.floor(i / 4)}:${pad(10 + i * 5)}:00` })),
        },
      };
  }
  return LEWATI;
});
