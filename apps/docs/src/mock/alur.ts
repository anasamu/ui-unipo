// Data contoh alur bisnis: ambil KRS, persetujuan PA, input nilai, EDOM, pendaftaran wisuda. Isi rekaan.
import { tambahRute } from './siakad';

const TAHUN = '20261';
const badan = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Record<string, any>;
const salin = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ================================================================ Ambil KRS
type Kls = { idj: number; nama: string; kelas: string; hari: string; jamke: number; ruang: string; kapasitas: number; penuh?: boolean; terpilih?: boolean };
type Mk = {
  id: number;
  kode_mk: string;
  nama_mk: string;
  semester: number;
  sks: number;
  dosen?: string;
  sudah_diambil: boolean;
  bisa_dipilih: boolean;
  keterangan?: string;
  nilai_sebelumnya?: string;
  pilih_kelas: boolean;
  kelas: Kls[];
};
const kls = (idj: number, kelas: string, hari: string, jamke: number, ruang: string, penuh = false): Kls => ({ idj, nama: `Kelas ${kelas}`, kelas, hari, jamke, ruang, kapasitas: 40, penuh });
const MK_KRS: Mk[] = [
  {
    id: 501,
    kode_mk: 'INF501',
    nama_mk: 'Rekayasa Perangkat Lunak',
    semester: 5,
    sks: 3,
    dosen: 'Dr. Ahmad Yusuf, M.Kom.',
    sudah_diambil: true,
    bisa_dipilih: true,
    pilih_kelas: false,
    kelas: [{ ...kls(9001, 'A', '1', 1, 'R.201'), terpilih: true }],
  },
  {
    id: 502,
    kode_mk: 'INF502',
    nama_mk: 'Kecerdasan Buatan',
    semester: 5,
    sks: 3,
    dosen: 'Nurul Huda, M.T.',
    sudah_diambil: false,
    bisa_dipilih: true,
    pilih_kelas: true,
    kelas: [kls(9002, 'A', '2', 1, 'Lab 1'), kls(9003, 'B', '3', 2, 'Lab 1', true)],
  },
  {
    id: 503,
    kode_mk: 'INF503',
    nama_mk: 'Jaringan Komputer',
    semester: 5,
    sks: 3,
    dosen: 'Rizal Pakaya, M.Kom.',
    sudah_diambil: false,
    bisa_dipilih: true,
    pilih_kelas: true,
    kelas: [kls(9004, 'A', '2', 1, 'Lab 2'), kls(9005, 'B', '4', 3, 'Lab 2')],
  },
  {
    id: 504,
    kode_mk: 'INF504',
    nama_mk: 'Interaksi Manusia dan Komputer',
    semester: 5,
    sks: 2,
    dosen: 'Sri Wahyuni, M.Pd.',
    sudah_diambil: false,
    bisa_dipilih: true,
    pilih_kelas: false,
    kelas: [kls(9006, 'A', '5', 2, 'R.104')],
  },
  { id: 505, kode_mk: 'INF505', nama_mk: 'Metodologi Penelitian', semester: 5, sks: 2, sudah_diambil: false, bisa_dipilih: true, pilih_kelas: false, kelas: [kls(9007, 'A', '1', 3, 'R.202')] },
  {
    id: 701,
    kode_mk: 'INF701',
    nama_mk: 'Skripsi',
    semester: 7,
    sks: 6,
    sudah_diambil: false,
    bisa_dipilih: false,
    keterangan: 'Prasyarat: lulus Metodologi Penelitian dan minimal 120 SKS.',
    pilih_kelas: false,
    kelas: [],
  },
  {
    id: 302,
    kode_mk: 'INF302',
    nama_mk: 'Basis Data',
    semester: 3,
    sks: 3,
    dosen: 'Fadli Gobel, M.Kom.',
    sudah_diambil: false,
    bisa_dipilih: true,
    nilai_sebelumnya: 'D',
    keterangan: 'Mengulang',
    pilih_kelas: false,
    kelas: [kls(9008, 'A', '3', 1, 'Lab 1')],
  },
];
let krsMhs: Record<number, number> = { 501: 9001 };
const sksMk = (id: number) => MK_KRS.find((m) => m.id === id)?.sks ?? 0;
const sksTerambil = () => Object.keys(krsMhs).reduce((s, id) => s + sksMk(Number(id)), 0);

tambahRute(/^\/v1\/mahasiswa\/[^/]+\/krs\/penawaran$/, (u) => ({
  data: {
    nim: decodeURIComponent(u.pathname.split('/')[3]),
    tahun_id: TAHUN,
    boleh_ambil: true,
    alasan: null,
    mode: 'paket',
    batas_sks: 21,
    ips_sebelumnya: 3.42,
    sks_terambil: sksTerambil(),
    mata_kuliah: MK_KRS.map((m) => ({ ...m, sudah_diambil: m.id in krsMhs, kelas: m.kelas.map((k) => ({ ...k, terpilih: krsMhs[m.id] === k.idj })) })),
    pesan: ['Masa KRS 1–14 September 2026. KRS perlu disetujui dosen PA.'],
  },
}));
/** POST /v1/mahasiswa/{nim}/krs; GET-nya tetap di mock/akademik.ts. */
export function simpanKrsDemo(init?: RequestInit) {
  const b = badan(init);
  const out = { tersimpan: [] as unknown[], sudah_ada: [] as unknown[], kelas_belum_terpilih_atau_penuh: [] as unknown[], bentrok: [] as unknown[] };
  let lebih = false;
  const slot = new Set(
    Object.entries(krsMhs).map(([id, idj]) => {
      const k = MK_KRS.find((m) => m.id === Number(id))?.kelas.find((x) => x.idj === idj);
      return `${k?.hari}-${k?.jamke}`;
    }),
  );
  for (const x of (b.mata_kuliah ?? []) as Array<{ id: number; idj?: number }>) {
    const m = MK_KRS.find((y) => y.id === x.id);
    if (!m) continue;
    const baris = { kode_mk: m.kode_mk, nama_mk: m.nama_mk };
    if (m.id in krsMhs) {
      out.sudah_ada.push(baris);
      continue;
    }
    const k = m.kelas.find((y) => y.idj === x.idj) ?? (m.kelas.length === 1 ? m.kelas[0] : undefined);
    if (!k || k.penuh) {
      out.kelas_belum_terpilih_atau_penuh.push(baris);
      continue;
    }
    if (slot.has(`${k.hari}-${k.jamke}`)) {
      out.bentrok.push(baris);
      continue;
    }
    if (sksTerambil() + m.sks > 21) {
      lebih = true;
      continue;
    }
    krsMhs = { ...krsMhs, [m.id]: k.idj };
    slot.add(`${k.hari}-${k.jamke}`);
    out.tersimpan.push({ ...baris, kelas: k.kelas });
  }
  return {
    data: { nim: 'demo', tahun_id: TAHUN, batas_sks: 21, melebihi_batas_sks: lebih, ...out, sks_terambil: sksTerambil(), pesan: out.tersimpan.length ? ['KRS menunggu persetujuan dosen PA.'] : [] },
  };
}

// ================================================================ Persetujuan KRS (PA)
type Antri = { nim: string; nama: string; kode_prodi: string; angkatan: string; kelas: string; mk: number; sks: number; mk_disetujui: number; status: 'belum' | 'menunggu' | 'disetujui' };
const NAMA = [
  'Andi Saputra',
  'Siti Rahma Djafar',
  'Moh. Rizky Hulawa',
  'Nur Aisyah Lamato',
  'Fikri Ramadhan',
  'Dewi Kartika Ali',
  'Arif Gani',
  'Putri Ayu Mohi',
  'Rahmat Hidayat',
  'Wulan Sari Pateda',
  'Yusril Ihza Daud',
  'Indah Permata Kadir',
];
const ANTRI: Antri[] = NAMA.map((nama, i) => {
  const status = i < 6 ? 'menunggu' : i < 9 ? 'disetujui' : 'belum';
  const mk = status === 'belum' ? 0 : 6 + (i % 3);
  return {
    nim: `2304110${String(i + 1).padStart(3, '0')}`,
    nama,
    kode_prodi: '55201',
    angkatan: '2023',
    kelas: i % 2 ? 'B' : 'A',
    mk,
    sks: mk * 3 - (i % 2),
    mk_disetujui: status === 'disetujui' ? mk : 0,
    status,
  };
});
const PESAN: Record<string, Array<{ id: number; pesan: string; oleh: string; waktu: string; dari_mahasiswa: boolean }>> = {
  '2304110001': [{ id: 1, pesan: 'Pak, apakah saya boleh mengambil 21 SKS semester ini?', oleh: '2304110001', waktu: '2026-09-02 09:14', dari_mahasiswa: true }],
};
const KRS_PA: Record<string, number[]> = {};
const krsPa = (nim: string) => (KRS_PA[nim] ??= [501, 502, 503, 504, 505, 302].slice(0, ANTRI.find((a) => a.nim === nim)?.mk ?? 6));

tambahRute(/^\/v1\/akademik\/krs\/persetujuan$/, (u, init) => {
  if (init?.method === 'POST') {
    const b = badan(init);
    const disetujui: string[] = [];
    const gagal: Array<{ nim: string; alasan: string }> = [];
    for (const nim of b.nim as string[]) {
      const a = ANTRI.find((x) => x.nim === nim);
      if (!a || !a.mk) gagal.push({ nim, alasan: 'KRS kosong' });
      else {
        a.status = 'disetujui';
        a.mk_disetujui = a.mk;
        disetujui.push(nim);
      }
    }
    return { data: { disetujui, gagal } };
  }
  const status = u.searchParams.get('status') ?? 'menunggu';
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const page = Number(u.searchParams.get('page') ?? 1);
  const per = Number(u.searchParams.get('per_page') ?? 25);
  const ring = { belum: 0, menunggu: 0, disetujui: 0 };
  ANTRI.forEach((a) => ring[a.status]++);
  const semua = ANTRI.filter((a) => a.status === status && (!q || a.nim.includes(q) || a.nama.toLowerCase().includes(q)));
  return {
    data: semua.slice((page - 1) * per, page * per),
    meta: { page, per_page: per, total: semua.length, total_pages: Math.max(1, Math.ceil(semua.length / per)), ringkasan: ring, tahun_id: TAHUN },
  };
});
tambahRute(/^\/v1\/akademik\/krs\/persetujuan\/[^/]+(\/(hapus-mk|pesan))?$/, (u, init) => {
  const seg = u.pathname.split('/');
  const nim = decodeURIComponent(seg[5]);
  const a = ANTRI.find((x) => x.nim === nim) ?? ANTRI[0];
  const b = badan(init);
  if (init?.method === 'POST') {
    if (seg[6] === 'hapus-mk') {
      KRS_PA[nim] = krsPa(nim).filter((id) => id * 10 + 1 !== b.idkrs);
      a.mk = KRS_PA[nim].length;
      a.sks = KRS_PA[nim].reduce((s, id) => s + sksMk(id), 0);
    } else if (seg[6] === 'pesan') {
      (PESAN[nim] ??= []).push({ id: Date.now(), pesan: b.pesan, oleh: 'Dr. Ahmad Yusuf, M.Kom.', waktu: '2026-09-03 10:20', dari_mahasiswa: false });
    } else {
      a.status = b.setuju ? 'disetujui' : 'menunggu';
      a.mk_disetujui = b.setuju ? a.mk : 0;
    }
  }
  const ids = krsPa(nim);
  return {
    data: {
      mahasiswa: { nim: a.nim, nama: a.nama, kode_prodi: a.kode_prodi, nama_prodi: 'Teknik Informatika', angkatan: a.angkatan, kelas: a.kelas, status_aktif: 'A', nama_pa: 'Dr. Ahmad Yusuf, M.Kom.' },
      tahun_id: TAHUN,
      status: a.status,
      perlu_persetujuan_pa: true,
      batas_sks: 21,
      sks: ids.reduce((s, id) => s + sksMk(id), 0),
      krs: ids.map((id) => {
        const m = MK_KRS.find((x) => x.id === id)!;
        const k = m.kelas[0];
        return {
          id: id * 10 + 1,
          kode_mk: m.kode_mk,
          nama_mk: m.nama_mk,
          sks: m.sks,
          semester: m.semester,
          kelas: k?.kelas,
          disetujui: a.status === 'disetujui',
          hari: k?.hari,
          jamke: k?.jamke,
          mulai: k ? `${String(6 + k.jamke * 2).padStart(2, '0')}:00` : null,
          sampai: k ? `${String(8 + k.jamke * 2).padStart(2, '0')}:30` : null,
          ruang: k?.ruang,
          nama_dosen: m.dosen,
          nilai: null,
          bisa_dihapus: true,
        };
      }),
      riwayat_ips: [
        { tahun_id: '20232', sks: 20, ips: 3.25 },
        { tahun_id: '20241', sks: 21, ips: 3.5 },
        { tahun_id: '20242', sks: 20, ips: 3.42 },
      ],
      pesan: PESAN[nim] ?? [],
    },
  };
});

// ================================================================ Input nilai
const SKALA = [
  { huruf: 'A', bobot: 4, min: 85, max: 100, lulus: true },
  { huruf: 'B+', bobot: 3.5, min: 80, max: 84.99, lulus: true },
  { huruf: 'B', bobot: 3, min: 70, max: 79.99, lulus: true },
  { huruf: 'C+', bobot: 2.5, min: 65, max: 69.99, lulus: true },
  { huruf: 'C', bobot: 2, min: 55, max: 64.99, lulus: true },
  { huruf: 'D', bobot: 1, min: 40, max: 54.99, lulus: false },
  { huruf: 'E', bobot: 0, min: 0, max: 39.99, lulus: false },
];
const KELAS_NILAI = [
  { id: 9002, kode_mk: 'INF502', nama_mk: 'Kecerdasan Buatan', kelas: 'A', sks: 3, semester: 5 },
  { id: 9004, kode_mk: 'INF503', nama_mk: 'Jaringan Komputer', kelas: 'A', sks: 3, semester: 5 },
  { id: 9008, kode_mk: 'INF302', nama_mk: 'Basis Data', kelas: 'A', sks: 3, semester: 3 },
];
type Ps = { idkrs: number; nim: string; nama: string; Harian: Array<number | null>; Tugas: Array<number | null>; UTS: number | null; UAS: number | null };
const TABEL: Record<number, { persen: Record<string, number | null>; kolom: { Harian: number; Tugas: number }; peserta: Ps[] }> = {};
const tabel = (idj: number) =>
  (TABEL[idj] ??= {
    persen: { Harian: 10, Tugas: 20, UTS: 30, UAS: 40 },
    kolom: { Harian: 2, Tugas: 2 },
    peserta: NAMA.slice(0, 10).map((nama, i) => {
      const n = (b: number) => (idj === 9008 && i > 5 ? null : Math.min(100, b + ((i * 7) % 23)));
      return { idkrs: idj * 100 + i, nim: `2304110${String(i + 1).padStart(3, '0')}`, nama, Harian: [n(70), n(66)], Tugas: [n(72), n(75)], UTS: n(60), UAS: idj === 9004 ? null : n(64) };
    }),
  });
const rata = (x: Array<number | null>) => {
  const a = x.filter((v): v is number => v !== null);
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
};
function hitung(idj: number) {
  const t = tabel(idj);
  const k = KELAS_NILAI.find((x) => x.id === idj) ?? KELAS_NILAI[0];
  const distribusi: Record<string, number> = {};
  const peserta = t.peserta.map((p) => {
    const komp = [rata(p.Harian), rata(p.Tugas), p.UTS, p.UAS];
    if (komp.every((v) => v === null)) return { ...p, nilai_angka: null, nilai_huruf: null, bobot: null, lulus: false };
    const a = Math.round((komp[0] ?? 0) * (t.persen.Harian ?? 0) + (komp[1] ?? 0) * (t.persen.Tugas ?? 0) + (komp[2] ?? 0) * (t.persen.UTS ?? 0) + (komp[3] ?? 0) * (t.persen.UAS ?? 0)) / 100;
    const s = SKALA.find((x) => a >= x.min && a <= x.max) ?? SKALA[SKALA.length - 1];
    distribusi[s.huruf] = (distribusi[s.huruf] ?? 0) + 1;
    return { ...p, nilai_angka: a, nilai_huruf: s.huruf, bobot: s.bobot, lulus: s.lulus };
  });
  return {
    kelas: { ...k, kode_prodi: '55201', nama_prodi: 'Teknik Informatika', tahun_id: TAHUN, nidn: '0912078501', nama_dosen: 'Dr. Ahmad Yusuf, M.Kom.' },
    persen_aktif: true,
    persen: t.persen,
    kolom: t.kolom,
    peserta,
    input_dibuka: idj !== 9008,
    batas: idj === 9008 ? { mulai: '2026-12-15', selesai: '2027-01-10' } : { mulai: '2026-11-01', selesai: '2026-11-30' },
    distribusi,
    skala: SKALA,
  };
}
tambahRute(/^\/v1\/akademik\/nilai\/kelas$/, () => ({
  data: {
    tahun_id: TAHUN,
    mode: 'dosen',
    data: KELAS_NILAI.map((k) => ({ ...k, nama_dosen: 'Dr. Ahmad Yusuf, M.Kom.', peserta: 10, bernilai: hitung(k.id).peserta.filter((p) => p.nilai_huruf).length })),
  },
}));
tambahRute(/^\/v1\/akademik\/nilai\/kelas\/\d+(\/umumkan)?$/, (u, init) => {
  const idj = Number(u.pathname.split('/')[5]);
  if (u.pathname.endsWith('/umumkan')) return { data: { terkirim: hitung(idj).peserta.filter((p) => p.nilai_huruf).length } };
  if (init?.method === 'POST') {
    const b = badan(init);
    const t = tabel(idj);
    if (b.persen) t.persen = b.persen;
    let n = 0;
    for (const x of (b.nilai ?? []) as Array<{ idkrs: number; jenis: 'Harian' | 'Tugas' | 'UTS' | 'UAS'; ke: number; nilai: number }>) {
      const p = t.peserta.find((y) => y.idkrs === x.idkrs);
      if (!p) continue;
      if (x.jenis === 'UTS' || x.jenis === 'UAS') p[x.jenis] = x.nilai;
      else {
        p[x.jenis][x.ke - 1] = x.nilai;
        t.kolom[x.jenis] = Math.max(t.kolom[x.jenis], x.ke);
      }
      n++;
    }
    return { data: { ...salin(hitung(idj)), tersimpan: n, pesan: [] } };
  }
  return { data: hitung(idj) };
});

// ================================================================ EDOM
const SOAL = [
  'Dosen menjelaskan tujuan dan rencana pembelajaran di awal perkuliahan.',
  'Dosen hadir dan memulai perkuliahan tepat waktu.',
  'Materi disampaikan dengan jelas dan mudah dipahami.',
  'Dosen memberi kesempatan bertanya dan menanggapi dengan baik.',
  'Tugas dan ujian sesuai dengan materi yang diajarkan.',
  'Dosen mengembalikan hasil tugas atau ujian beserta umpan balik.',
];
const PILIHAN = { A: 'Sangat baik', B: 'Baik', C: 'Cukup', D: 'Kurang', E: 'Sangat kurang' };
const EDOM_MK = [
  { idkrs: 5011, kode_mk: 'INF501', nama_mk: 'Rekayasa Perangkat Lunak', kelas: 'A', sks: 3, dosen: 'Dr. Ahmad Yusuf, M.Kom.' },
  { idkrs: 5021, kode_mk: 'INF502', nama_mk: 'Kecerdasan Buatan', kelas: 'A', sks: 3, dosen: 'Nurul Huda, M.T.' },
  { idkrs: 5031, kode_mk: 'INF503', nama_mk: 'Jaringan Komputer', kelas: 'B', sks: 3, dosen: 'Rizal Pakaya, M.Kom.' },
  { idkrs: 5041, kode_mk: 'INF504', nama_mk: 'Interaksi Manusia dan Komputer', kelas: 'A', sks: 2, dosen: 'Sri Wahyuni, M.Pd.' },
];
const JAWAB: Record<number, { jawaban: Record<string, string>; saran: string }> = {
  5011: { jawaban: Object.fromEntries(SOAL.map((_, i) => [String(i + 1), 'A'])), saran: '' },
  5031: { jawaban: { '1': 'B', '2': 'B' }, saran: '' },
};
const terjawab = (id: number) => Object.keys(JAWAB[id]?.jawaban ?? {}).length;
tambahRute(/^\/v1\/edom\/isi$/, () => ({
  data: {
    tahun_id: TAHUN,
    jumlah_soal: SOAL.length,
    jumlah_mk: EDOM_MK.length,
    mk_selesai: EDOM_MK.filter((m) => terjawab(m.idkrs) >= SOAL.length).length,
    mata_kuliah: EDOM_MK.map((m) => ({ ...m, soal_terjawab: terjawab(m.idkrs), selesai: terjawab(m.idkrs) >= SOAL.length })),
    pilihan_jawaban: Object.keys(PILIHAN),
  },
}));
tambahRute(/^\/v1\/edom\/isi\/\d+$/, (u, init) => {
  const id = Number(u.pathname.split('/')[4]);
  if (init?.method === 'POST') {
    const b = badan(init);
    if (Object.keys(b.jawaban ?? {}).length < SOAL.length) return { __status: 422, error: { message: 'Semua pertanyaan wajib dijawab.' } };
    JAWAB[id] = { jawaban: b.jawaban, saran: b.saran ?? '' };
    return { data: { idkrs: id, tersimpan: SOAL.length } };
  }
  const m = EDOM_MK.find((x) => x.idkrs === id) ?? EDOM_MK[0];
  return {
    data: {
      ...m,
      saran: JAWAB[id]?.saran ?? null,
      soal: SOAL.map((pertanyaan, i) => ({ idk: i + 1, pertanyaan, pilihan: PILIHAN, jawab: JAWAB[id]?.jawaban[String(i + 1)] ?? null })),
      pilihan_jawaban: Object.keys(PILIHAN),
    },
  };
});

// ================================================================ Wisuda
let daftarWisuda: Record<string, unknown> | null = null;
tambahRute(/^\/v1\/kelulusan\/wisuda\/saya$/, () => ({
  data: {
    nim: '2204110017',
    tahun_id: TAHUN,
    boleh_daftar: true,
    syarat: [
      { kode: 'ta', nama: 'Tugas akhir lulus (nilai A)', terpenuhi: true },
      { kode: 'sks', nama: 'SKS lulus 146 dari minimal 144', terpenuhi: true },
      { kode: 'aktif', nama: 'Status aktif semester ini', terpenuhi: true },
      { kode: 'nilai_de', nama: 'Tidak ada nilai D/E', terpenuhi: true },
    ],
    syarat_tambahan: [
      { kode: 'toefl', nama: 'Sertifikat TOEFL minimal 450', terpenuhi: true },
      { kode: 'pustaka', nama: 'Bebas pinjaman perpustakaan', terpenuhi: false, wajib: false },
    ],
    kurang: [],
    pendaftaran: daftarWisuda,
    periode_buka: [
      { idw: 12, kode_prodi: '55201', nama: 'Wisuda Periode I 2027', tahun_id: TAHUN, tanggal_mulai: '2026-11-01', tanggal_selesai: '2026-12-20', tanggal_wisuda: '2027-02-14' },
      { idw: 13, kode_prodi: '55201', nama: 'Wisuda Periode II 2027', tahun_id: TAHUN, tanggal_mulai: '2027-03-01', tanggal_selesai: '2027-05-31', tanggal_wisuda: '2027-08-21' },
    ],
    isian: ['toga', 'ukuran_toga', 'topi', 'ukuran_topi', 'kalung', 'undangan', 'foto', 'ijazah'],
  },
}));
tambahRute(/^\/v1\/kelulusan\/wisuda\/daftar$/, (_u, init) => {
  const b = badan(init);
  daftarWisuda = { ...b, nim: '2204110017', periode: b.idw === 13 ? 'Wisuda Periode II 2027' : 'Wisuda Periode I 2027', terima: 'N', tanggal_wisuda: b.idw === 13 ? '2027-08-21' : '2027-02-14' };
  return { data: daftarWisuda };
});
