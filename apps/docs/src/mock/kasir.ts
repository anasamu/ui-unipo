// Data contoh kasir (/v1/keuangan), tagihan PMB, buku kas (/v1/keu/kas), dan jurnal (/v1/keu/jurnal). Semua fiktif.
import { MAHASISWA, PRODI, tambahRute } from './siakad';

type Baris = Record<string, unknown>;
const badan = async (init?: RequestInit): Promise<Baris> => {
  try {
    return JSON.parse(String(init?.body ?? '{}'));
  } catch {
    return {};
  }
};
const hari = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
const JENIS = [
  { kode: 1, nama: 'UKT', nilai: 3_500_000 },
  { kode: 2, nama: 'Praktikum', nilai: 400_000 },
  { kode: 3, nama: 'KKN', nilai: 750_000 },
  { kode: 4, nama: 'Wisuda', nilai: 1_250_000 },
];

// ---------------------------------------------------------------- keuangan per mahasiswa (bisa dibayar)
interface Item {
  kode_biaya: number;
  jenis_biaya: string;
  tagihan: number;
  dibayar: number;
  potongan: number;
  sisa: number;
  pembayaran: Array<{ id: number; tanggal: string; jumlah: number; keterangan: string | null }>;
}
const keu = new Map<string, Array<{ tahun_id: string; item: Item[] }>>();
let idBayar = 900;
function dataMhs(nim: string) {
  if (!keu.has(nim)) {
    const i = Math.max(
      0,
      MAHASISWA.findIndex((m) => m.nim === nim),
    );
    const it = (kode: number, dibayar: number, tgl: string): Item => {
      const j = JENIS.find((x) => x.kode === kode)!;
      const potongan = kode === 1 && i % 4 === 1 ? 500_000 : 0;
      const tagihan = j.nilai;
      return {
        kode_biaya: kode,
        jenis_biaya: j.nama,
        tagihan,
        dibayar,
        potongan,
        sisa: tagihan - potongan - dibayar,
        pembayaran: dibayar ? [{ id: ++idBayar, tanggal: tgl, jumlah: dibayar, keterangan: ['Tunai loket 1', 'VA BSI', 'Transfer'][idBayar % 3] }] : [],
      };
    };
    keu.set(nim, [
      { tahun_id: '20251', item: [it(1, 3_500_000 - (i % 4 === 1 ? 500_000 : 0), '2025-08-12'), it(3, 750_000, '2025-09-01')] },
      { tahun_id: '20252', item: [it(1, 3_000_000 - (i % 4 === 1 ? 500_000 : 0) * 0, '2026-02-08'), it(2, 400_000, '2026-02-10')] },
      { tahun_id: '20261', item: [it(1, i % 3 === 0 ? 0 : 1_500_000, '2026-08-20'), it(2, 0, '2026-08-20')] },
    ]);
  }
  return keu.get(nim)!;
}
const ringkas = (it: Item[]) => ({
  tagihan: it.reduce((a, b) => a + b.tagihan, 0),
  dibayar: it.reduce((a, b) => a + b.dibayar, 0),
  potongan: it.reduce((a, b) => a + b.potongan, 0),
  sisa: it.reduce((a, b) => a + b.sisa, 0),
});

tambahRute(/^\/v1\/keuangan\/mahasiswa\/[^/]+$/, (u) => {
  const nim = decodeURIComponent(u.pathname.split('/')[4]);
  const per = dataMhs(nim).map((p) => ({ ...p, ringkasan: ringkas(p.item) }));
  return { data: { nim, periode: per, ringkasan: ringkas(per.flatMap((p) => p.item)), deposit: 0, invoice_aktif: [], dispensasi: [] } };
});

// ---------------------------------------------------------------- hak akses & sesi kasir
let sesi: { id: number; loket: string | null; dibuka_at: string; saldo_awal: number; total_tunai: number } | null = {
  id: 7,
  loket: 'Loket 1 BAUK',
  dibuka_at: `${hari(0)} 07:45:00`,
  saldo_awal: 500_000,
  total_tunai: 2_150_000,
};
tambahRute(/^\/v1\/keuangan\/saya$/, () => ({
  data: {
    pengelola: true,
    admin: true,
    mahasiswa: null,
    prodi: PRODI.map((p) => p.kode_prodi),
    tahun_aktif: '20261',
    mode: {},
    kasir_terbuka: sesi && { id: sesi.id, loket: sesi.loket, dibuka_at: sesi.dibuka_at },
  },
}));
tambahRute(/^\/v1\/keuangan\/kasir\/buka$/, async (_u, init) => {
  if (sesi) return { __status: 409, error: { code: 'conflict', message: 'Anda masih punya sesi kasir yang terbuka; tutup dulu.' } };
  const b = await badan(init);
  sesi = { id: 8, loket: (b.loket as string) ?? null, dibuka_at: new Date().toISOString(), saldo_awal: Number(b.saldo_awal ?? 0), total_tunai: 0 };
  return { __status: 201, data: { ...sesi, status: 'buka' } };
});
tambahRute(/^\/v1\/keuangan\/kasir\/\d+\/tutup$/, async (_u, init) => {
  if (!sesi) return { __status: 409, error: { code: 'conflict', message: 'Sesi kasir sudah ditutup.' } };
  const b = await badan(init);
  const setoran = Number(b.setoran ?? 0);
  const out = {
    ...sesi,
    status: 'tutup',
    setoran,
    selisih: setoran - (sesi.saldo_awal + sesi.total_tunai),
    per_metode: [
      { metode: 'tunai', transaksi: 6, jumlah: sesi.total_tunai },
      { metode: 'transfer', transaksi: 3, jumlah: 4_250_000 },
      { metode: 'va', transaksi: 2, jumlah: 7_000_000 },
    ],
  };
  sesi = null;
  return { data: out };
});

// ---------------------------------------------------------------- transaksi + kwitansi
const transaksi = new Map<number, Baris>();
let idTr = 5000;
tambahRute(/^\/v1\/keuangan\/transaksi$/, async (u, init) => {
  if (init?.method !== 'POST') return { data: [...transaksi.values()], meta: { page: 1, per_page: 20, total: transaksi.size, total_pages: 1 } };
  const b = await badan(init);
  const per = dataMhs(String(b.nim)).find((p) => p.tahun_id === b.tahun_id);
  const it = per?.item.find((x) => String(x.kode_biaya) === String(b.kode_biaya));
  const jumlah = Number(b.jumlah ?? 0);
  if (!it) return { __status: 422, error: { code: 'validation_failed', message: 'Tagihan tidak ditemukan.', details: { kode_biaya: 'Tidak ada tagihan ini' } } };
  if (jumlah <= 0 || jumlah > it.sisa) return { __status: 422, error: { code: 'validation_failed', message: 'Jumlah melebihi sisa tagihan.', details: { jumlah: `Maksimal ${it.sisa}` } } };
  it.dibayar += jumlah;
  it.sisa -= jumlah;
  const id = ++idTr;
  it.pembayaran.push({ id, tanggal: hari(0), jumlah, keterangan: `Kasir · ${b.metode}` });
  if (b.metode === 'tunai' && sesi) sesi.total_tunai += jumlah;
  const t = {
    id,
    nomor: `KW/${hari(0).replace(/-/g, '')}/${id}`,
    nim: b.nim,
    tahun_id: b.tahun_id,
    kode_biaya: b.kode_biaya,
    jenis_biaya: it.jenis_biaya,
    jumlah,
    tanggal: hari(0),
    metode: b.metode,
    status: 'sah',
    keterangan: b.keterangan ?? null,
    kode_verifikasi: `${id}`.padStart(32, 'a'),
  };
  transaksi.set(id, t);
  return { __status: 201, data: t };
});
tambahRute(/^\/v1\/keuangan\/transaksi\/\d+\/kwitansi$/, (u) => {
  const t = transaksi.get(Number(u.pathname.split('/')[4]));
  if (!t) return { __status: 404, error: { code: 'not_found', message: 'Transaksi tidak ditemukan.' } };
  const m = MAHASISWA.find((x) => x.nim === t.nim);
  const p = PRODI.find((x) => x.kode_prodi === m?.kode_prodi);
  return {
    data: {
      ...t,
      perguruan_tinggi: { nama_pt: 'Universitas Pohuwato', singkatan: 'UNIPO', alamat: 'Jl. Trans Sulawesi, Marisa, Pohuwato' },
      mahasiswa: { nim: t.nim, nama: m?.nama ?? 'Mahasiswa', kode_prodi: m?.kode_prodi, angkatan: m?.tahun_masuk },
      prodi: { nama_prodi: p?.nama_prodi, kode_jenjang: p?.kode_jenjang },
      petugas: 'kasir.bauk',
      url_verifikasi: `/api/v1/keuangan/kwitansi/verifikasi/${t.kode_verifikasi}`,
    },
  };
});

// ---------------------------------------------------------------- tagihan PMB
const PMB = Array.from({ length: 9 }, (_, i) => ({
  id: 300 + i,
  nomor: `PMB2611${String(12 + i)}A${(i * 7) % 10}C${i}`,
  jenis: i % 3 === 2 ? 'daftar_ulang' : 'formulir',
  keterangan: i % 3 === 2 ? 'Daftar ulang + almamater' : 'Biaya pendaftaran gelombang 2',
  nominal: i % 3 === 2 ? 2_750_000 : 250_000,
  potongan: 0,
  total: i % 3 === 2 ? 2_750_000 : 250_000,
  status: 'belum_bayar',
  no_pmb: `26${String(1001 + i)}`,
  akun_nama: ['Mira Hasan', 'Fikri Lamato', 'Aulia Pakaya', 'Rendi Gobel', 'Salsa Daud', 'Yoga Ismail', 'Nadia Usman', 'Dimas Kadir', 'Putri Dai'][i],
}));
tambahRute(/^\/v1\/pmb\/admin\/tagihan$/, (u) => {
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const st = u.searchParams.get('status');
  const rows = PMB.filter((t) => (!st || t.status === st) && (!q || `${t.nomor} ${t.no_pmb} ${t.akun_nama}`.toLowerCase().includes(q)));
  return { data: rows, meta: { page: 1, per_page: 15, total: rows.length, total_pages: 1 } };
});
tambahRute(/^\/v1\/pmb\/admin\/tagihan\/\d+\/lunas$/, (u) => {
  const t = PMB.find((x) => x.id === Number(u.pathname.split('/')[5]));
  if (!t) return { __status: 404, error: { code: 'not_found', message: 'Tagihan tidak ditemukan.' } };
  t.status = 'lunas';
  return { data: { ...t, lunas_at: new Date().toISOString() } };
});

// ---------------------------------------------------------------- buku kas
tambahRute(/^\/v1\/keu\/kas$/, (u) => {
  const unit = u.searchParams.get('unit_id');
  const baris: Baris[] = [];
  let saldo = 0;
  const items: Array<[number, 'masuk' | 'keluar', string, string, number]> = [
    [-28, 'masuk', 'Sewa aula untuk seminar mitra', 'sewa', 4_500_000],
    [-26, 'keluar', 'Pembelian ATK semester ganjil', 'dibayar', 1_275_000],
    [-22, 'masuk', 'Hibah kegiatan kemahasiswaan', 'hibah', 12_000_000],
    [-19, 'keluar', 'Honor narasumber kuliah umum', 'selesai', 2_000_000],
    [-15, 'keluar', 'Konsumsi rapat kurikulum', 'selesai', 850_000],
    [-12, 'masuk', 'Pelatihan sertifikasi (kontribusi peserta)', 'jasa', 6_300_000],
    [-8, 'keluar', 'Perawatan laboratorium komputer', 'dibayar', 3_400_000],
    [-5, 'keluar', 'Transport KKN tahap 1', 'dibayar', 5_600_000],
    [-2, 'masuk', 'Kerja sama penelitian dengan pemda', 'kerjasama', 9_000_000],
    [-1, 'keluar', 'Cetak sertifikat dan plakat', 'selesai', 720_000],
  ];
  let tm = 0;
  let tk = 0;
  items.forEach(([d, arah, uraian, kategori, j], i) => {
    const jumlah = unit ? Math.round(j * 0.4) : j;
    saldo += arah === 'masuk' ? jumlah : -jumlah;
    if (arah === 'masuk') tm += jumlah;
    else tk += jumlah;
    baris.push({
      arah,
      sumber: arah === 'masuk' ? 'penerimaan' : 'realisasi',
      id: 100 + i,
      tanggal: hari(d),
      uraian,
      kategori,
      nomor_bukti: `${arah === 'masuk' ? 'BKM' : 'BKK'}-${String(31 + i).padStart(4, '0')}`,
      jumlah,
      unit_id: 4,
      unit: unit ? 'Fakultas Ilmu Komputer' : ['Rektorat', 'Fakultas Ilmu Komputer', 'LP2M', 'Biro Kemahasiswaan'][i % 4],
      saldo,
    });
  });
  return { data: { masuk: tm, keluar: tk, saldo, baris } };
});

// ---------------------------------------------------------------- akun & jurnal
const AKUN = [
  [101, '1-1101', 'Kas tunai'],
  [102, '1-1102', 'Bank BSI operasional'],
  [103, '1-1201', 'Piutang mahasiswa'],
  [201, '2-1101', 'Utang usaha'],
  [401, '4-1101', 'Pendapatan UKT'],
  [402, '4-1201', 'Pendapatan jasa dan sewa'],
  [501, '5-1101', 'Beban ATK'],
  [502, '5-1201', 'Beban honor'],
  [503, '5-1301', 'Beban pemeliharaan'],
].map(([id, kode, nama]) => ({
  id,
  kode,
  nama,
  kelompok: String(kode).startsWith('1') ? 'Aset' : String(kode).startsWith('2') ? 'Liabilitas' : String(kode).startsWith('4') ? 'Pendapatan' : 'Beban',
}));
tambahRute(/^\/v1\/keu\/akun$/, (u) => {
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const id = u.searchParams.get('id');
  const rows = AKUN.filter((a) => (!q || `${a.kode} ${a.nama}`.toLowerCase().includes(q)) && (!id || String(a.id) === id));
  return { data: rows, meta: { page: 1, per_page: 50, total: rows.length, total_pages: 1 } };
});
const akun = (id: number) => AKUN.find((a) => a.id === id)!;
type Jurnal = Baris & { id: number; status: string; baris: Baris[] };
const JURNAL: Jurnal[] = [
  [
    hari(-20),
    'Penerimaan UKT harian (sinkron)',
    'kas_masuk',
    'pembayaran_mahasiswa',
    'diposting',
    [
      [102, 18_500_000, 0],
      [401, 0, 18_500_000],
    ],
  ],
  [
    hari(-18),
    'Pembelian ATK semester ganjil',
    'kas_keluar',
    'realisasi',
    'diposting',
    [
      [501, 1_275_000, 0],
      [101, 0, 1_275_000],
    ],
  ],
  [
    hari(-12),
    'Sewa aula seminar mitra',
    'kas_masuk',
    'penerimaan',
    'diposting',
    [
      [101, 4_500_000, 0],
      [402, 0, 4_500_000],
    ],
  ],
  [
    hari(-6),
    'Honor narasumber kuliah umum',
    'umum',
    'manual',
    'draf',
    [
      [502, 2_000_000, 0],
      [102, 0, 2_000_000],
    ],
  ],
  [
    hari(-3),
    'Koreksi salah posting pemeliharaan',
    'penyesuaian',
    'manual',
    'dibatalkan',
    [
      [503, 400_000, 0],
      [101, 0, 400_000],
    ],
  ],
  [
    hari(-1),
    'Perawatan laboratorium komputer',
    'kas_keluar',
    'manual',
    'draf',
    [
      [503, 3_400_000, 0],
      [102, 0, 3_400_000],
    ],
  ],
].map(([tanggal, uraian, jenis, sumber, status, baris], i) => ({
  id: 70 + i,
  nomor: `JU/2611/${String(41 + i).padStart(4, '0')}`,
  tanggal,
  uraian,
  jenis,
  sumber,
  status,
  nomor_bukti: i % 2 ? `BKK-${String(30 + i).padStart(4, '0')}` : null,
  unit: ['Rektorat', 'Fakultas Ilmu Komputer'][i % 2],
  alasan_batal: status === 'dibatalkan' ? 'Akun beban salah pilih.' : null,
  baris: (baris as number[][]).map(([a, d, k], j) => ({
    id: i * 10 + j,
    akun_id: a,
    akun_kode: akun(a).kode,
    akun_nama: akun(a).nama,
    unit: null,
    rekening: a === 102 ? 'BSI 7123xxxx' : null,
    debit: d,
    kredit: k,
  })),
})) as Jurnal[];
const total = (j: Jurnal) => j.baris.reduce((a, b) => a + Number(b.debit), 0);
const ringkasJurnal = ({ baris: _b, ...j }: Jurnal) => ({ ...j, total: total({ ...j, baris: _b } as Jurnal) });
tambahRute(/^\/v1\/keu\/jurnal$/, async (u, init) => {
  if (init?.method === 'POST') {
    const b = await badan(init);
    const rows = (b.baris as Baris[]) ?? [];
    const d = rows.reduce((a, r) => a + Number(r.debit ?? 0), 0);
    const k = rows.reduce((a, r) => a + Number(r.kredit ?? 0), 0);
    if (Math.abs(d - k) > 0.004) return { __status: 422, error: { code: 'validation_failed', message: 'Debit harus sama dengan kredit.', details: { baris: 'Tidak seimbang' } } };
    const id = 70 + JURNAL.length;
    const j: Jurnal = {
      id,
      nomor: `JU/2611/${String(41 + JURNAL.length).padStart(4, '0')}`,
      tanggal: b.tanggal,
      uraian: b.uraian,
      jenis: b.jenis ?? 'umum',
      sumber: 'manual',
      status: b.posting ? 'diposting' : 'draf',
      nomor_bukti: b.nomor_bukti ?? null,
      unit: 'Rektorat',
      baris: rows.map((r, i) => ({ id: id * 10 + i, ...r, akun_kode: akun(Number(r.akun_id))?.kode, akun_nama: akun(Number(r.akun_id))?.nama })),
    };
    JURNAL.unshift(j);
    return { __status: 201, data: { ...j, total: total(j) } };
  }
  const st = u.searchParams.get('status');
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const rows = JURNAL.filter((j) => (!st || j.status === st) && (!q || `${j.nomor} ${j.uraian} ${j.nomor_bukti ?? ''}`.toLowerCase().includes(q))).map(ringkasJurnal);
  return { data: rows, meta: { page: 1, per_page: 30, total: rows.length, total_pages: 1 } };
});
tambahRute(/^\/v1\/keu\/jurnal\/\d+(\/(posting|batalkan|hapus))?$/, async (u, init) => {
  const [, , , , id, aksi] = u.pathname.split('/');
  const j = JURNAL.find((x) => x.id === Number(id));
  if (!j) return { __status: 404, error: { code: 'not_found', message: 'Jurnal tidak ditemukan.' } };
  if (init?.method === 'POST') {
    const b = await badan(init);
    if (aksi === 'posting') j.status = 'diposting';
    else if (aksi === 'batalkan') Object.assign(j, { status: 'dibatalkan', alasan_batal: b.alasan });
    else if (aksi === 'hapus') JURNAL.splice(JURNAL.indexOf(j), 1);
    else
      Object.assign(j, {
        tanggal: b.tanggal,
        uraian: b.uraian,
        jenis: b.jenis,
        nomor_bukti: b.nomor_bukti,
        baris: ((b.baris as Baris[]) ?? []).map((r, i) => ({ id: j.id * 10 + i, ...r, akun_kode: akun(Number(r.akun_id))?.kode, akun_nama: akun(Number(r.akun_id))?.nama })),
      });
  }
  return { data: { ...j, total: total(j), pembalik: null, membalik: null } };
});
