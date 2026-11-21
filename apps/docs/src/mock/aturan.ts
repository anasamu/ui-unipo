// Aturan dinamis (/v1/aturan): server tiruan dengan mesin pemeriksa sederhana yang meniru Mesin.php (cakupan, kondisi
// bersarang, batas waktu, batas nilai bertingkat, dispensasi) dan aturan kelola (draf → SK → aktif, riwayat, sampah).
// Isi rekaan.
import { INDIKATOR_ATURAN, TITIK_ATURAN } from './aturan-katalog';
import { LEWATI, MAHASISWA, PRODI, tambahRute } from './siakad';

type Grup = { semua?: Item[]; salah_satu?: Item[] };
type Kondisi = { indikator: string; op: string; nilai?: unknown; pesan?: string };
type Item = Grup | Kondisi;
type Baris = Record<string, any>;

const badan = (init?: RequestInit) => (init?.body ? JSON.parse(String(init.body)) : {}) as Baris;
const metode = (init?: RequestInit) => (init?.method ?? 'GET').toUpperCase();
const KATEGORI: Record<string, string> = {
  akademik: 'Akademik (KRS, nilai, ujian, tugas akhir)',
  kelulusan: 'Kelulusan (yudisium, wisuda)',
  keuangan: 'Keuangan (syarat pembayaran)',
  kemahasiswaan: 'Kemahasiswaan (KKN, cuti, layanan)',
  kepegawaian: 'Kepegawaian dosen dan tendik (cuti, presensi, BKD/SKP, usulan kenaikan, pemutakhiran data)',
  penelitian: 'Penelitian & PkM (usulan hibah, laporan, verifikasi luaran)',
  umum: 'Umum',
};
const JENIS: Record<string, string> = {
  syarat: 'Syarat: semua kondisi harus terpenuhi',
  batas_waktu: 'Batas waktu: langkah hanya boleh antara mulai dan selesai',
  batas_nilai: 'Batas nilai: nilai target tidak boleh melewati batas, batas bisa bertingkat menurut kondisi',
};
const OP = ['>=', '>', '<=', '<', '=', '!=', 'dalam', 'bukan_dalam', 'memuat', 'tidak_memuat', 'benar', 'salah'];

function indikatorTitik(titik: string) {
  const t = TITIK_ATURAN[titik];
  return Object.entries(INDIKATOR_ATURAN)
    .filter(([k, d]) => d.subjek === 'umum' || (d.subjek === t.subjek && (d.sumber !== 'konteks' || t.konteks.includes(k))))
    .map(([k]) => k);
}
const katalog = () => ({
  kategori: Object.entries(KATEGORI).map(([kode, judul]) => ({ kode, judul, izin_bawaan: `aturan:${kode}` })),
  jenis: Object.entries(JENIS).map(([kode, judul]) => ({ kode, judul })),
  operator: OP,
  titik: Object.entries(TITIK_ATURAN).map(([kode, t]) => ({
    kode,
    judul: t.judul,
    keterangan: t.keterangan,
    kategori: t.kategori,
    subjek: t.subjek,
    jenis: t.jenis,
    konteks: t.konteks,
    indikator: indikatorTitik(kode),
    batas_lama: t.lama,
    penerapan: t.penerapan,
    unit: t.unit,
    kelompok: t.kelompok,
    contoh: t.contoh ?? [],
    aktif: t.aktif !== false,
    bawaan: !t.kustom,
    kustom: Boolean(t.kustom),
  })),
  indikator: Object.entries(INDIKATOR_ATURAN).map(([kode, d]) => ({ kode, ...d })),
});

// ---------------------------------------------------------------- Waktu
const pad = (n: number) => String(n).padStart(2, '0');
const tgl = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const jam = (d: Date) => `${tgl(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const geser = (hari: number) => tgl(new Date(Date.now() + hari * 86_400_000));
const sekarang = () => jam(new Date());
const keWaktu = (s: string, akhir: boolean) => (s.length <= 10 ? `${s} ${akhir ? '23:59:59' : '00:00:00'}` : s.length === 16 ? `${s}:${akhir ? '59' : '00'}` : s);
let urut = 100;
const uuid = () => `0b7c${(++urut).toString(16).padStart(4, '0')}-a7e1-4c2f-9d10-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;

// ---------------------------------------------------------------- Data awal
const TAHUN = new Date().getMonth() >= 7 ? `${new Date().getFullYear()}1` : `${new Date().getFullYear() - 1}2`;
interface Aturan extends Baris {
  id: string;
  lampiran: Baris[];
  pengecualian: Baris[];
  riwayat: Baris[];
}
function aturan(a: Partial<Aturan> & { nama: string; titik: string; kategori: string; jenis: string }, sk = true): Aturan {
  const dibuat = jam(new Date(Date.now() - 40 * 86_400_000));
  const r: Aturan = {
    id: uuid(),
    kode: null,
    keterangan: null,
    cakupan: {},
    kondisi: null,
    parameter: null,
    tahun_id: null,
    berlaku_mulai: null,
    berlaku_selesai: null,
    mode: 'blokir',
    pesan: null,
    prioritas: 0,
    status: 'aktif',
    versi: 1,
    diaktifkan_oleh: 'baak01',
    diaktifkan_at: dibuat,
    dibuat_oleh: 'baak01',
    diubah_oleh: 'baak01',
    created_at: dibuat,
    updated_at: dibuat,
    dihapus_at: null,
    lampiran: [],
    pengecualian: [],
    riwayat: [],
    ...a,
  };
  if (sk)
    r.lampiran.push({
      id: uuid(),
      jenis: 'sk',
      nomor: `${120 + urut}/UNIPO/SK/R/${new Date().getFullYear()}`,
      tanggal: geser(-42),
      perihal: `Penetapan ${a.nama.toLowerCase()}`,
      berkas_id: uuid(),
      nama_file: `SK-${a.nama.replace(/\W+/g, '-')}.pdf`,
      mime: 'application/pdf',
      ukuran: 248_000,
      dilepas_at: null,
      oleh: 'baak01',
      waktu: dibuat,
    });
  r.riwayat.push({ versi: 1, aksi: 'dibuat', catatan: null, oleh: r.dibuat_oleh, waktu: dibuat, data: null });
  if (sk) r.riwayat.unshift({ versi: 1, aksi: 'lampiran', catatan: `Lampirkan SK ${r.lampiran[0].nomor}`, oleh: 'baak01', waktu: dibuat, data: null });
  if (r.status === 'aktif') r.riwayat.unshift({ versi: 1, aksi: 'aktif', catatan: 'Berlaku mulai periode ini.', oleh: 'baak01', waktu: dibuat, data: null });
  return r;
}

const ATURAN: Aturan[] = [
  aturan({
    nama: 'Batas SKS KRS menurut IPS',
    kode: 'krs.batas-sks',
    titik: 'krs.ambil',
    kategori: 'akademik',
    jenis: 'batas_nilai',
    keterangan: 'Peraturan Akademik Pasal 14 ayat 2.',
    parameter: {
      target: 'sks_diambil',
      op: '<=',
      tabel: [
        { jika: { semua: [{ indikator: 'ips_lalu', op: '>=', nilai: 3 }] }, nilai: 24 },
        { jika: { semua: [{ indikator: 'ips_lalu', op: '>=', nilai: 2.5 }] }, nilai: 21 },
      ],
      nilai: 18,
    },
    kondisi: { semua: [{ indikator: 'semester_ke', op: '>', nilai: 1 }] },
    prioritas: 10,
  }),
  aturan({
    nama: 'Masa kontrak KRS',
    kode: 'krs.masa',
    titik: 'krs.ambil',
    kategori: 'akademik',
    jenis: 'batas_waktu',
    tahun_id: TAHUN,
    parameter: { mulai: `${geser(-6)} 08:00:00`, selesai: `${geser(9)} 23:59:59` },
  }),
  aturan({
    nama: 'Minimal bayar sebelum KRS',
    kode: 'krs.bayar',
    titik: 'krs.ambil',
    kategori: 'keuangan',
    jenis: 'syarat',
    kondisi: {
      salah_satu: [
        { indikator: 'bayar_syarat_krs', op: 'benar' },
        { indikator: 'dispensasi_keuangan', op: 'benar' },
      ],
    },
    pesan: 'Lunasi pembayaran minimal KRS atau ajukan dispensasi ke Biro Keuangan.',
  }),
  aturan({
    nama: 'Syarat pendaftaran KKN',
    kode: 'kkn.syarat',
    titik: 'kkn.daftar',
    kategori: 'kemahasiswaan',
    jenis: 'syarat',
    kondisi: {
      semua: [
        { indikator: 'sks_lulus', op: '>=', nilai: 100 },
        { indikator: 'ipk', op: '>=', nilai: 2 },
        { indikator: 'mk_lulus', op: 'memuat', nilai: 'MKU156', pesan: 'Lulus Pendidikan Pancasila terlebih dahulu.' },
        { indikator: 'status_aktif', op: '=', nilai: 'A' },
      ],
    },
  }),
  aturan({
    nama: 'Kehadiran minimal ikut UAS',
    titik: 'ujian.uas',
    kategori: 'akademik',
    jenis: 'syarat',
    mode: 'peringatan',
    kondisi: { semua: [{ indikator: 'presensi_persen', op: '>=', nilai: 75 }] },
  }),
  aturan({
    nama: 'Syarat daftar wisuda',
    titik: 'wisuda.daftar',
    kategori: 'kelulusan',
    jenis: 'syarat',
    kondisi: {
      semua: [
        { indikator: 'bebas_pustaka', op: 'benar' },
        {
          salah_satu: [
            { indikator: 'tunggakan', op: '<=', nilai: 0 },
            { indikator: 'dispensasi_keuangan', op: 'benar' },
          ],
        },
      ],
    },
  }),
  aturan(
    {
      nama: 'Syarat yudisium sarjana',
      titik: 'yudisium.tetapkan',
      kategori: 'kelulusan',
      jenis: 'syarat',
      status: 'draf',
      diaktifkan_oleh: null,
      diaktifkan_at: null,
      cakupan: { jenjang: ['C'] },
      kondisi: {
        semua: [
          { indikator: 'ipk', op: '>=', nilai: 2 },
          { indikator: 'jumlah_nilai_e', op: '=', nilai: 0 },
          { indikator: 'ta_lulus', op: 'benar' },
          { indikator: 'poin_kegiatan', op: '>=', nilai: 50 },
        ],
      },
    },
    false,
  ),
  aturan({
    nama: 'Batas input nilai dosen semester lalu',
    titik: 'nilai.input.dosen',
    kategori: 'akademik',
    jenis: 'batas_waktu',
    status: 'nonaktif',
    tahun_id: TAHUN.endsWith('1') ? `${Number(TAHUN.slice(0, 4)) - 1}2` : `${TAHUN.slice(0, 4)}1`,
    cakupan: { prodi: ['55201', '57201'] },
    parameter: { mulai: geser(-120) + ' 00:00:00', selesai: geser(-95) + ' 23:59:59' },
  }),
];
// Aturan bawaan kampus: draf sampai SK dilampirkan dan disetujui.
ATURAN.push(
  aturan(
    {
      nama: 'Status mahasiswa aktif untuk KRS',
      kode: 'bawaan.krs-status',
      titik: 'krs.ambil',
      kategori: 'akademik',
      jenis: 'syarat',
      status: 'draf',
      bawaan: true,
      menunggu_sk: true,
      prioritas: 100,
      diaktifkan_at: null,
      diaktifkan_oleh: null,
      dibuat_oleh: 'sistem',
      kondisi: { semua: [{ indikator: 'status_aktif', op: 'dalam', nilai: ['A'] }] },
    },
    false,
  ),
  aturan(
    {
      nama: 'Bebas pustaka sebelum wisuda',
      kode: 'bawaan.wisuda-pustaka',
      titik: 'wisuda.daftar',
      kategori: 'kelulusan',
      jenis: 'syarat',
      status: 'draf',
      bawaan: true,
      menunggu_sk: true,
      prioritas: 100,
      diaktifkan_at: null,
      diaktifkan_oleh: null,
      dibuat_oleh: 'sistem',
      kondisi: { semua: [{ indikator: 'bebas_pustaka', op: 'benar' }] },
    },
    false,
  ),
  aturan({
    nama: 'Syarat KKN untuk mahasiswa semester 7',
    kode: 'kkn.semester',
    titik: 'kkn.daftar',
    kategori: 'kemahasiswaan',
    jenis: 'syarat',
    status: 'diajukan',
    diaktifkan_at: null,
    diaktifkan_oleh: null,
    kondisi: {
      semua: [
        { indikator: 'semester_ke', op: '>=', nilai: 7 },
        { indikator: 'ipk', op: '>=', nilai: 2.5 },
        { indikator: 'ipk', op: '<=', nilai: 4 },
      ],
    },
    persetujuan: [
      {
        aksi: 'diajukan',
        oleh: 'baak01',
        nama_oleh: 'Rahmawati Pakaya',
        peran: 'Staf BAAK',
        catatan: 'Mohon disetujui sebelum pendaftaran KKN dibuka.',
        waktu: jam(new Date(Date.now() - 86_400_000)),
      },
    ],
  }),
);
for (const a of ATURAN)
  for (const l of a.lampiran) {
    l.lokasi = { unit: 'baak', unit_nama: 'BAAK', folder: 'SK Aturan' };
  }
ATURAN[0].pengecualian.push({
  id: uuid(),
  subjek_jenis: 'mahasiswa',
  subjek: MAHASISWA[3].nim,
  alasan: 'Mahasiswa berprestasi, disetujui Wakil Rektor I.',
  berlaku_sampai: geser(60),
  berkas_id: null,
  oleh: 'baak01',
  waktu: sekarang(),
  berlaku: true,
});

const PENGATUR: Baris[] = [
  { kategori: 'akademik', titik: '', jenis: 'izin', kode: 'aturan:akademik', keterangan: 'Pengatur bawaan kategori akademik' },
  { kategori: 'akademik', titik: '', jenis: 'peran', kode: 'staf-baak', keterangan: 'Pengatur bawaan kategori akademik' },
  { kategori: 'akademik', titik: '', jenis: 'peran', kode: 'kepala-baak', keterangan: 'Pengatur bawaan kategori akademik' },
  { kategori: 'akademik', titik: '', jenis: 'peran', kode: 'baak', keterangan: 'Staf BAAK' },
  { kategori: 'kelulusan', titik: '', jenis: 'peran', kode: 'kepala-baak', keterangan: 'Pengatur bawaan kategori kelulusan' },
  { kategori: 'keuangan', titik: '', jenis: 'peran', kode: 'kepala-bauk', keterangan: 'Pengatur bawaan kategori keuangan' },
  { kategori: 'akademik', titik: 'nilai.input.dosen', jenis: 'peran', kode: 'baak', keterangan: 'Staf BAAK' },
  { kategori: 'akademik', titik: 'nilai.input.dosen', jenis: 'peran', kode: 'kaprodi', keterangan: 'Ketua program studi' },
  { kategori: 'keuangan', titik: '', jenis: 'peran', kode: 'keuangan', keterangan: 'Staf keuangan' },
];

// ---------------------------------------------------------------- Fakta dan mesin
function fakta(nim: string | undefined, konteks: Baris = {}, waktu = new Date()): Baris {
  const m = MAHASISWA.find((x) => x.nim === nim);
  const i = m ? MAHASISWA.indexOf(m) : 0;
  const prodi = m?.kode_prodi ?? '55201';
  return {
    __prodi: prodi,
    __fakultas: PRODI.find((p) => p.kode_prodi === prodi)?.kode_fakultas,
    __jenjang: 'C',
    __kelas: m?.kelas ?? 'R',
    ipk: m?.ipk ?? 3.12,
    sks_lulus: m?.sks_lulus ?? 96,
    ips_lalu: m ? Math.min(4, Math.round((m.ipk + ((i % 5) - 2) / 10) * 100) / 100) : 2.84,
    semester_ke: m ? (2025 - Number(m.tahun_masuk)) * 2 + 1 : 5,
    angkatan: m ? `${m.tahun_masuk}1` : '20231',
    status_aktif: m?.status_aktif ?? 'A',
    jumlah_nilai_d: i % 3,
    jumlah_nilai_e: i % 7 === 0 ? 1 : 0,
    ta_lulus: (m?.sks_lulus ?? 0) > 130,
    mk_lulus: ['MKU156', 'INF100', 'INF107'].slice(0, m ? 1 + (i % 3) : 2),
    jumlah_cuti: 0,
    poin_kegiatan: 30 + ((i * 11) % 60),
    bebas_pustaka: i % 4 !== 1,
    tunggakan: m ? (i % 3) * 750_000 : 1_250_000,
    bayar_syarat_krs: m ? i % 5 !== 2 : true,
    bayar_syarat_ujian: m ? i % 4 !== 3 : false,
    persen_bayar_periode: m ? 40 + ((i * 17) % 61) : 60,
    tagihan_periode_lunas: m ? i % 3 === 0 : false,
    dispensasi_keuangan: false,
    sks_diambil: 20,
    jumlah_mk: 8,
    presensi_persen: 72,
    hari: ((waktu.getDay() + 6) % 7) + 1,
    jenis_pegawai: 'dosen',
    status_kepegawaian: 'tetap_yayasan',
    masa_kerja_tahun: 0.8,
    serdos: true,
    sedang_disiplin: false,
    gelombang_pmb: '1',
    daftar_ulang_lunas: false,
    ...konteks,
  };
}
const judulInd = (k: string) => INDIKATOR_ATURAN[k]?.judul ?? k;
function nilaiKondisi(c: Kondisi, f: Baris): { lulus: boolean; pesan: string; sekarang: unknown } {
  const v = f[c.indikator];
  const n = c.nilai;
  let ok = false;
  switch (c.op) {
    case '>=':
      ok = Number(v) >= Number(n);
      break;
    case '>':
      ok = Number(v) > Number(n);
      break;
    case '<=':
      ok = Number(v) <= Number(n);
      break;
    case '<':
      ok = Number(v) < Number(n);
      break;
    case '=':
      ok = String(v) === String(n);
      break;
    case '!=':
      ok = String(v) !== String(n);
      break;
    case 'dalam':
      ok = (n as unknown[]).map(String).includes(String(v));
      break;
    case 'bukan_dalam':
      ok = !(n as unknown[]).map(String).includes(String(v));
      break;
    case 'memuat':
      ok = (v as string[]).includes(String(n));
      break;
    case 'tidak_memuat':
      ok = !(v as string[]).includes(String(n));
      break;
    case 'benar':
      ok = Boolean(v);
      break;
    case 'salah':
      ok = !v;
      break;
  }
  const kata: Record<string, string> = {
    '>=': 'minimal',
    '>': 'harus lebih dari',
    '<=': 'maksimal',
    '<': 'harus kurang dari',
    '=': 'harus',
    '!=': 'tidak boleh',
    memuat: 'harus memuat',
    tidak_memuat: 'tidak boleh memuat',
    dalam: 'harus salah satu dari',
    bukan_dalam: 'tidak boleh',
  };
  const sek = Array.isArray(v) ? `${v.length} mata kuliah` : typeof v === 'boolean' ? (v ? 'ya' : 'belum') : typeof v === 'number' ? v.toLocaleString('id-ID') : String(v);
  const pesan =
    c.pesan ??
    (c.op === 'benar'
      ? `${judulInd(c.indikator)} belum terpenuhi.`
      : c.op === 'salah'
        ? `${judulInd(c.indikator)} tidak boleh.`
        : `${judulInd(c.indikator)} ${kata[c.op]} ${Array.isArray(n) ? n.join(', ') : n} (sekarang ${sek}).`);
  return { lulus: ok, pesan, sekarang: v };
}
function nilaiGrup(g: Grup, f: Baris): { lulus: boolean; rincian: Baris[] } {
  const semua = 'semua' in g && g.semua;
  const isi = (g.semua ?? g.salah_satu ?? []) as Item[];
  const hasil = isi.map((k) =>
    'semua' in k || 'salah_satu' in k
      ? nilaiGrup(k as Grup, f)
      : (() => {
          const r = nilaiKondisi(k as Kondisi, f);
          return { lulus: r.lulus, rincian: r.lulus ? [] : [{ ...(k as Kondisi), sekarang: r.sekarang, pesan: r.pesan }] };
        })(),
  );
  const lulus = semua ? hasil.every((h) => h.lulus) : hasil.some((h) => h.lulus);
  return { lulus, rincian: lulus ? [] : hasil.flatMap((h) => h.rincian) };
}
function dalamCakupan(a: Aturan, f: Baris) {
  const c = a.cakupan ?? {};
  if (c.prodi?.length && !c.prodi.includes(f.__prodi)) return false;
  if (c.fakultas?.length && !c.fakultas.includes(f.__fakultas)) return false;
  if (c.jenjang?.length && !c.jenjang.includes(f.__jenjang)) return false;
  if (c.kelas?.length && !c.kelas.includes(f.__kelas)) return false;
  if (c.angkatan_min && f.angkatan < c.angkatan_min) return false;
  if (c.angkatan_max && f.angkatan > c.angkatan_max) return false;
  return true;
}
function periksa(titik: string, b: Baris, hanya?: Aturan) {
  const waktu = b.waktu ? keWaktu(String(b.waktu), false) : sekarang();
  const kini = new Date(waktu.replace(' ', 'T'));
  const f = fakta(b.nim, b.konteks ?? {}, kini);
  const tahun = b.tahun_id || TAHUN;
  const h: Baris = {
    titik,
    judul: TITIK_ATURAN[titik]?.judul,
    tahun_id: tahun,
    waktu,
    subjek: { nim: b.nim, kode_prodi: f.__prodi },
    boleh: true,
    pelanggaran: [],
    peringatan: [],
    diterapkan: [],
    dikecualikan: [],
    batas: {},
    indikator: {},
  };
  const daftar = hanya ? [hanya] : ATURAN.filter((a) => a.titik === titik && a.status === 'aktif' && !a.dihapus_at);
  for (const a of daftar.sort((x, y) => y.prioritas - x.prioritas)) {
    if (a.tahun_id && a.tahun_id !== tahun) continue;
    if (a.berlaku_mulai && waktu < a.berlaku_mulai) continue;
    if (a.berlaku_selesai && waktu > a.berlaku_selesai) continue;
    if (!dalamCakupan(a, f)) continue;
    const kec = a.pengecualian.find((p) => p.berlaku && ((p.subjek_jenis === 'mahasiswa' && p.subjek === b.nim) || (p.subjek_jenis === 'prodi' && p.subjek === f.__prodi)));
    if (kec) {
      h.dikecualikan.push({ id: a.id, nama: a.nama, alasan: kec.alasan });
      continue;
    }
    const pakai = (ks: string[]) => ks.forEach((k) => (h.indikator[k] = f[k]));
    const kumpul = (g: Grup | null): string[] => (g ? ((g.semua ?? g.salah_satu ?? []) as Item[]).flatMap((k) => ('indikator' in k ? [k.indikator] : kumpul(k as Grup))) : []);
    pakai(kumpul(a.kondisi));
    let langgar: Baris | null = null;
    if (a.jenis === 'syarat') {
      const r = nilaiGrup(a.kondisi, f);
      if (!r.lulus) langgar = { rincian: r.rincian, pesan: a.pesan ?? r.rincian.map((x) => x.pesan).join(' ') };
    } else {
      if (a.kondisi && !nilaiGrup(a.kondisi, f).lulus) continue;
      if (a.jenis === 'batas_waktu') {
        const p = a.parameter;
        h.batas.waktu = { mulai: p.mulai, selesai: p.selesai };
        if (waktu < p.mulai || waktu > p.selesai) {
          const fm = (s: string) => new Date(s.replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
          langgar = { rincian: [], pesan: a.pesan ?? (waktu < p.mulai ? `Belum dibuka. Dibuka mulai ${fm(p.mulai)}.` : `Sudah ditutup sejak ${fm(p.selesai)}.`) };
        }
      } else {
        const p = a.parameter;
        let batas = p.nilai;
        for (const t of p.tabel ?? []) {
          pakai(kumpul(t.jika));
          if (nilaiGrup(t.jika, f).lulus) {
            batas = t.nilai;
            break;
          }
        }
        pakai([p.target]);
        const lama = h.batas[p.target];
        if (!lama || (p.op.startsWith('<') ? batas < lama.nilai : batas > lama.nilai)) h.batas[p.target] = { op: p.op, nilai: batas };
        const r = nilaiKondisi({ indikator: p.target, op: p.op, nilai: batas }, f);
        if (!r.lulus) langgar = { rincian: [{ indikator: p.target, op: p.op, nilai: batas, sekarang: r.sekarang, pesan: r.pesan }], pesan: a.pesan ?? r.pesan };
      }
    }
    h.diterapkan.push(a.id);
    if (langgar) {
      const p = {
        id: a.id,
        uuid: a.id,
        aturan_id: a.id,
        kode: a.kode,
        nama: a.nama,
        kategori: a.kategori,
        jenis: a.jenis,
        mode: a.mode,
        sifat: a.sifat ?? 'ketat',
        boleh_pengecualian: a.sifat === 'boleh_pengecualian',
        ...langgar,
      };
      if (a.mode === 'blokir') {
        h.pelanggaran.push(p);
        h.boleh = false;
      } else h.peringatan.push(p);
    }
  }
  return h;
}

// ---------------------------------------------------------------- Bentuk respons
const bentuk = (a: Aturan) => {
  const { lampiran: _l, pengecualian: _p, riwayat: _r, ...x } = a;
  const sk = a.lampiran.filter((l) => !l.dilepas_at && l.jenis === 'sk').at(-1);
  return { ...x, titik_judul: TITIK_ATURAN[a.titik]?.judul ?? null, sk: sk ? { nomor: sk.nomor, tanggal: sk.tanggal } : null };
};
const lampiranAktif = (a: Aturan) => a.lampiran.filter((l) => !l.dilepas_at);
const detail = (a: Aturan) => ({
  ...bentuk(a),
  lampiran: lampiranAktif(a),
  pengecualian: a.pengecualian,
  pengatur: PENGATUR.filter((p) => p.kategori === a.kategori),
  boleh_atur: true,
  persetujuan: a.persetujuan ?? [],
  telaah: a.telaah ?? [],
  boleh_setujui: true,
  boleh_telaah: true,
  unit_sk: { unit: 'baak', unit_nama: 'BAAK', folder: 'SK Aturan' },
  boleh_ajukan_pengecualian: a.sifat === 'boleh_pengecualian',
  boleh_putus_pengecualian: a.sifat === 'boleh_pengecualian',
  spmi: a.status === 'aktif' && lampiranAktif(a).length ? [{ spmi_dokumen_id: 12, versi: a.versi, status: 'berlaku', status_dokumen: 'disahkan', waktu: a.diaktifkan_at }] : [],
  penyetuju: {
    kategori: a.kategori,
    bidang: 'akademik',
    jabatan: 'WR1',
    keterangan: 'Wakil Rektor I',
    rektor: false,
    orang: [{ username: 'wr1', nama: 'Dr. Hasanuddin Lamatenggo', sebagai: 'Pejabat WR1' }],
  },
  telaah_spmi: true,
});
function alur(a: Aturan, aksi: string, catatan: string | null) {
  a.persetujuan = [
    ...(a.persetujuan ?? []),
    {
      aksi,
      oleh: 'wr1',
      nama_oleh: aksi === 'diajukan' ? 'Rahmawati Pakaya' : 'Dr. Hasanuddin Lamatenggo',
      peran: aksi === 'diajukan' ? 'Staf BAAK' : 'Wakil Rektor I',
      catatan,
      waktu: sekarang(),
      versi: a.versi,
    },
  ];
}
const tidakAda = { __status: 404, error: { code: 'tidak_ditemukan', message: 'Aturan tidak ditemukan.' } };
const galat422 = (details: Baris) => ({ __status: 422, error: { code: 'validation_failed', message: 'Data tidak valid.', details } });
const cari = (id: string) => ATURAN.find((a) => a.id === id);
function catat(a: Aturan, aksi: string, catatan: string | null, data: unknown = null) {
  a.riwayat.unshift({ versi: a.versi, aksi, catatan, oleh: 'baak01', waktu: sekarang(), data });
}
function validasi(b: Baris, lama?: Aturan): Baris | null {
  const g: Baris = {};
  const titik = lama?.titik ?? b.titik;
  const t = TITIK_ATURAN[titik];
  if (!t) return { titik: 'wajib diisi (lihat GET /v1/aturan/katalog)' };
  if (!t.kategori.includes(b.kategori)) g.kategori = `titik ini menerima: ${t.kategori.join(', ')}`;
  if (!t.jenis.includes(b.jenis)) g.jenis = `titik ini menerima: ${t.jenis.join(', ')}`;
  if (!String(b.nama ?? '').trim()) g.nama = 'wajib diisi';
  if (b.kode && ATURAN.some((a) => a.kode === b.kode && a.id !== lama?.id && !a.dihapus_at)) g.kode = 'sudah dipakai aturan lain';
  if (b.jenis === 'syarat' && !b.kondisi) g.kondisi = 'aturan syarat wajib punya kondisi';
  if (b.jenis === 'batas_waktu' && (!b.parameter?.mulai || !b.parameter?.selesai)) g.parameter = '{"mulai": "YYYY-MM-DD[ HH:MM]", "selesai": "YYYY-MM-DD[ HH:MM]"}';
  return Object.keys(g).length ? g : null;
}
function simpan(b: Baris, a?: Aturan) {
  const p = b.jenis === 'batas_waktu' ? { mulai: keWaktu(b.parameter.mulai, false), selesai: keWaktu(b.parameter.selesai, true) } : b.parameter;
  const isi: Baris = {
    ...b,
    parameter: p,
    cakupan: b.cakupan ?? {},
    berlaku_mulai: b.berlaku_mulai ? keWaktu(b.berlaku_mulai, false) : null,
    berlaku_selesai: b.berlaku_selesai ? keWaktu(b.berlaku_selesai, true) : null,
  };
  delete isi.catatan;
  if (!a) {
    const baru = aturan(
      { ...isi, status: 'draf', diaktifkan_at: null, diaktifkan_oleh: null, created_at: sekarang(), updated_at: sekarang() } as unknown as Aturan & {
        nama: string;
        titik: string;
        kategori: string;
        jenis: string;
      },
      false,
    );
    baru.riwayat = [{ versi: 1, aksi: 'dibuat', catatan: null, oleh: 'baak01', waktu: sekarang(), data: null }];
    ATURAN.unshift(baru);
    return baru;
  }
  Object.assign(a, isi, { versi: a.versi + 1, updated_at: sekarang(), diubah_oleh: 'baak01' });
  catat(a, 'diubah', b.catatan ?? null, bentuk(a));
  return a;
}
function tembus(a: Aturan) {
  const t = TITIK_ATURAN[a.titik];
  if (a.jenis !== 'batas_waktu') return null;
  if (!t.lama) return { diterapkan: false, alasan: 'Titik ini tidak punya menu batas waktu lama.', jenis_lama: null, baris: [] };
  if (!a.tahun_id) return { diterapkan: false, alasan: 'Periode kosong; tabel batas lama disimpan per periode, jadi aturan ini hanya ditegakkan lewat API.', jenis_lama: t.lama, baris: [] };
  const c = a.cakupan ?? {};
  if (a.kondisi || c.jenjang?.length || c.kelas?.length || c.angkatan_min || c.angkatan_max)
    return { diterapkan: false, alasan: 'Cakupan lebih sempit dari prodi/fakultas, jadi tidak bisa diwakili menu lama. Aturan tetap ditegakkan lewat API.', jenis_lama: t.lama, baris: [] };
  const prodi = c.prodi?.length ? c.prodi : PRODI.map((p) => p.kode_prodi);
  const baris = prodi.map((p: string, i: number) => ({
    id: 300 + i,
    kode_prodi: p,
    idkp: 1,
    dari: { mulai: geser(-20), selesai: geser(-3) },
    menjadi: { mulai: a.parameter.mulai.slice(0, 10), selesai: a.parameter.selesai.slice(0, 10) },
  }));
  catat(a, 'tulis_tembus', `Tulis-tembus ke ${t.lama} untuk ${baris.length} prodi`, { baris });
  return { diterapkan: true, alasan: null, jenis_lama: t.lama, baris };
}

// ---------------------------------------------------------------- Rute
tambahRute(/^\/v1\/aturan\/katalog$/, () => ({ data: katalog() }));
tambahRute(/^\/v1\/aturan\/saya$/, () => ({
  data: {
    admin: true,
    boleh_setujui: true,
    boleh_telaah: true,
    boleh_darurat: true,
    boleh_pengecualian: true,
    izin: ['aturan.setujui', 'aturan.telaah', 'aturan.darurat'],
    kategori: Object.entries(KATEGORI).map(([kategori, judul]) => ({ kategori, judul, boleh_atur: true, prodi: null, semua_prodi: true, pengatur: PENGATUR.filter((p) => p.kategori === kategori) })),
  },
}));
tambahRute(/^\/v1\/aturan\/periksa$/, (_u, init) => {
  const b = badan(init);
  if (!TITIK_ATURAN[b.titik]) return galat422({ titik: 'tidak dikenal; lihat GET /v1/aturan/katalog' });
  return { data: periksa(b.titik, b) };
});
tambahRute(/^\/v1\/aturan\/pengatur$/, (_u, init) => {
  if (metode(init) === 'POST') {
    const b = badan(init);
    const titik = b.titik ?? '';
    for (let i = PENGATUR.length - 1; i >= 0; i--) if (PENGATUR[i].kategori === b.kategori && PENGATUR[i].titik === titik) PENGATUR.splice(i, 1);
    for (const p of b.pengatur ?? []) PENGATUR.push({ kategori: b.kategori, titik, ...p });
  }
  return {
    data: Object.entries(KATEGORI).map(([kategori, judul]) => ({
      kategori,
      judul,
      pengatur: PENGATUR.filter((p) => p.kategori === kategori).map((p) => ({ titik: p.titik || null, jenis: p.jenis, kode: p.kode, keterangan: p.keterangan })),
      bawaan: { jenis: 'izin', kode: `aturan:${kategori}` },
      boleh_saya: true,
    })),
  };
});
tambahRute(/^\/v1\/aturan$/, (u, init) => {
  if (metode(init) === 'POST') {
    const b = badan(init);
    const g = validasi(b);
    if (g) return galat422(g);
    return { __status: 201, data: detail(simpan(b)) };
  }
  const s = u.searchParams;
  const q = (s.get('q') ?? '').toLowerCase();
  const rows = ATURAN.filter(
    (a) =>
      (s.get('terhapus') === '1' ? a.dihapus_at : !a.dihapus_at) &&
      (!s.get('titik') || a.titik === s.get('titik')) &&
      (!s.get('kategori') || a.kategori === s.get('kategori')) &&
      (!s.get('status') || a.status === s.get('status')) &&
      (!s.get('jenis') || a.jenis === s.get('jenis')) &&
      (s.get('bawaan') !== '1' || a.bawaan) &&
      (!s.get('unit') || a.unit === s.get('unit')) &&
      (!s.get('antrean') || a.status === 'diajukan' || a.usulan?.status === 'diajukan') &&
      (!s.get('tahun_id') || !a.tahun_id || a.tahun_id === s.get('tahun_id')) &&
      (!q || `${a.nama} ${a.kode ?? ''}`.toLowerCase().includes(q)),
  );
  const per = Number(s.get('per_page') ?? 50);
  const ringkas = (xs: Aturan[]) => ({
    total: xs.length,
    menunggu_sk: xs.filter((a) => a.status !== 'aktif' && !lampiranAktif(a).some((l) => l.jenis === 'sk')).length,
    draf: xs.filter((a) => a.status === 'draf').length,
    diajukan: xs.filter((a) => a.status === 'diajukan').length,
    aktif: xs.filter((a) => a.status === 'aktif').length,
    nonaktif: xs.filter((a) => a.status === 'nonaktif').length,
  });
  const bawaan = rows.filter((a) => a.bawaan);
  const kelompok = (k: 'kategori' | 'unit') => Object.fromEntries([...new Set(bawaan.map((a) => a[k]))].map((v) => [v, ringkas(bawaan.filter((a) => a[k] === v))]));
  return {
    data: rows
      .slice(0, per)
      .map((a) => ({
        ...bentuk(a),
        jumlah_sk: lampiranAktif(a).filter((l) => l.jenis === 'sk').length,
        menunggu_sk: a.bawaan ? a.status !== 'aktif' && !lampiranAktif(a).some((l) => l.jenis === 'sk') : undefined,
      })),
    meta: { page: 1, per_page: per, total: rows.length, total_pages: Math.ceil(rows.length / per), bawaan: { ...ringkas(bawaan), per_kategori: kelompok('kategori'), per_unit: kelompok('unit') } },
  };
});
tambahRute(/^\/v1\/aturan\/[^/]+(\/[a-z]+)?$/, (u, init) => {
  const [, , , id, aksi] = u.pathname.split('/');
  if (['katalog', 'saya', 'periksa', 'pengatur', 'titik', 'penyetuju', 'pengecualian'].includes(id)) return LEWATI;
  const a = cari(id);
  if (!a) return tidakAda;
  const b = badan(init);
  if (!aksi) {
    if (metode(init) !== 'POST') return { data: detail(a) };
    const g = validasi({ ...b, titik: a.titik }, a);
    if (g) return galat422(g);
    simpan(b, a);
    return { data: { ...detail(a), tulis_tembus: a.status === 'aktif' ? tembus(a) : undefined } };
  }
  switch (aksi) {
    case 'riwayat':
      return { data: a.riwayat };
    case 'aktifkan': {
      if (!lampiranAktif(a).some((l) => l.jenis === 'sk'))
        return { __status: 422, error: { code: 'validation_failed', message: 'Lampirkan SK sebelum mengaktifkan aturan.', details: { lampiran: 'SK wajib' } } };
      Object.assign(a, { status: 'aktif', diaktifkan_at: sekarang(), diaktifkan_oleh: 'baak01' });
      catat(a, 'aktif', b.catatan ?? null);
      return { data: { ...detail(a), tulis_tembus: tembus(a) } };
    }
    case 'nonaktifkan':
      a.status = 'nonaktif';
      catat(a, 'nonaktif', b.catatan ?? null);
      return { data: detail(a) };
    case 'hapus':
      if (a.bawaan) return { __status: 409, error: { code: 'conflict', message: 'Aturan bawaan tidak bisa dihapus.', details: { bawaan: true } } };
      a.dihapus_at = sekarang();
      a.status = a.status === 'aktif' ? 'nonaktif' : a.status;
      catat(a, 'dihapus', b.alasan ?? null);
      return { data: { ok: true } };
    case 'pulihkan':
      Object.assign(a, { dihapus_at: null, status: 'draf' });
      catat(a, 'dipulihkan', null);
      return { data: detail(a) };
    case 'uji':
      return { data: periksa(a.titik, b, a) };
    case 'darurat':
      Object.assign(a, {
        status: 'aktif',
        darurat: true,
        darurat_info: { label: 'Aktif lewat jalur darurat', alasan: b.alasan, oleh: 'superadmin', waktu: sekarang() },
        usulan: { jenis: 'darurat', status: 'diajukan', diajukan_oleh: 'superadmin', diajukan_at: sekarang() },
        diaktifkan_at: sekarang(),
        diaktifkan_oleh: 'superadmin',
      });
      catat(a, 'darurat', b.alasan ?? null);
      return { data: detail(a) };
    case 'ajukan':
      if (!lampiranAktif(a).some((l) => l.jenis === 'sk'))
        return { __status: 422, error: { code: 'validation_failed', message: 'Lampirkan SK sebelum mengajukan aturan.', details: { sk: 'SK wajib' } } };
      a.status = 'diajukan';
      a.usulan = null;
      alur(a, 'diajukan', b.catatan ?? null);
      catat(a, 'diajukan', b.catatan ?? null);
      return { data: detail(a) };
    case 'setujui':
      Object.assign(a, { status: 'aktif', diaktifkan_at: sekarang(), diaktifkan_oleh: 'wr1' });
      alur(a, 'disetujui', b.catatan ?? null);
      catat(a, 'disetujui', a.darurat ? 'Jalur darurat disahkan.' : (b.catatan ?? 'Disetujui dan berlaku.'));
      Object.assign(a, { darurat: false, darurat_info: null, usulan: null });
      Object.assign(a.riwayat[0], { oleh: 'wr1', nama_oleh: 'Dr. Hasanuddin Lamatenggo', jabatan: 'WR1' });
      return { data: detail(a) };
    case 'kembalikan':
      if (!String(b.catatan ?? '').trim()) return galat422({ catatan: 'wajib diisi' });
      if (a.darurat) {
        Object.assign(a, { status: 'nonaktif', darurat: false, darurat_info: null, usulan: null });
        catat(a, 'darurat_dicabut', b.catatan);
        return { data: detail(a) };
      }
      a.status = 'draf';
      a.usulan = { jenis: 'aktifkan', status: 'dikembalikan', catatan_putusan: b.catatan, diputus_oleh: 'Wakil Rektor I', diputus_at: sekarang() };
      alur(a, 'dikembalikan', b.catatan);
      return { data: detail(a) };
    case 'telaah':
      a.telaah = [...(a.telaah ?? []), { oleh: 'lpm01', nama_oleh: 'Unit SPMI', catatan: b.catatan, waktu: sekarang() }];
      alur(a, 'ditelaah', b.catatan ?? null);
      return { data: detail(a) };
    case 'lampiran':
      if (metode(init) === 'POST') {
        const l = {
          id: uuid(),
          jenis: b.jenis ?? 'sk',
          nomor: b.nomor,
          tanggal: b.tanggal,
          perihal: b.perihal,
          berkas_id: b.berkas_id,
          nama_file: `${b.jenis === 'sk' ? 'SK' : 'Lampiran'}-${String(b.nomor ?? 'baru').replace(/\W+/g, '-')}.pdf`,
          mime: 'application/pdf',
          ukuran: 186_000,
          dilepas_at: null,
          oleh: 'baak01',
          waktu: sekarang(),
        };
        a.lampiran.push(l);
        catat(a, 'lampiran', `Lampirkan ${l.jenis === 'sk' ? 'SK' : 'lampiran'} ${l.nomor ?? ''}`.trim());
        return { __status: 201, data: lampiranAktif(a) };
      }
      return { data: lampiranAktif(a) };
    case 'pengecualian':
      if (metode(init) === 'POST') {
        a.pengecualian.unshift({
          id: uuid(),
          subjek_jenis: b.subjek_jenis,
          subjek: b.subjek,
          alasan: b.alasan,
          berlaku_sampai: b.berlaku_sampai ? keWaktu(b.berlaku_sampai, true) : null,
          berkas_id: b.berkas_id ?? null,
          oleh: 'baak01',
          waktu: sekarang(),
          berlaku: true,
        });
        catat(a, 'pengecualian', `Tambah pengecualian ${b.subjek_jenis} ${b.subjek}: ${b.alasan}`);
        return { __status: 201, data: a.pengecualian };
      }
      return { data: a.pengecualian };
  }
  return tidakAda;
});
tambahRute(/^\/v1\/aturan\/[^/]+\/(lampiran|pengecualian)\/[^/]+\/(hapus|unduh)$/, (u) => {
  const [, , , id, jenis, sub, aksi] = u.pathname.split('/');
  const a = cari(id);
  if (!a) return tidakAda;
  if (aksi === 'unduh') return { __mentah: new TextEncoder().encode('%PDF-1.4\n% Contoh SK aturan (docs)\n') };
  if (jenis === 'lampiran') {
    const l = a.lampiran.find((x) => x.id === sub);
    if (!l) return tidakAda;
    if (l.jenis === 'sk' && a.status === 'aktif' && lampiranAktif(a).filter((x) => x.jenis === 'sk').length === 1)
      return { __status: 409, error: { code: 'conflict', message: 'SK terakhir aturan aktif tidak bisa dilepas.' } };
    l.dilepas_at = sekarang();
    catat(a, 'lampiran', `Lepas lampiran ${l.nomor ?? ''}`.trim());
  } else {
    a.pengecualian = a.pengecualian.filter((p) => p.id !== sub);
    catat(a, 'pengecualian', 'Cabut pengecualian');
  }
  return { data: { ok: true } };
});

// ---------------------------------------------------------------- Titik penerapan (kelola)
const PENGATUR_TITIK: Record<string, Baris[]> = { 'nilai.input.dosen': [{ jenis: 'peran', kode: 'kaprodi', keterangan: 'Ketua program studi' }] };
const bentukTitik = (kode: string) => {
  const t = TITIK_ATURAN[kode]!;
  const k = katalog().titik.find((x) => x.kode === kode)!;
  return {
    ...k,
    konteks: t.kustom ? ((t as Baris).konteks_def ?? []) : t.konteks,
    status_mahasiswa: (t as Baris).status_mahasiswa ?? null,
    pengatur: PENGATUR_TITIK[kode] ?? [],
    jumlah_aturan: ATURAN.filter((a) => a.titik === kode && !a.dihapus_at).length,
    rute: kode.startsWith('rute.'),
  };
};
TITIK_ATURAN['kustom.seminar_proposal'] = {
  judul: 'Mahasiswa mendaftar seminar proposal',
  keterangan: 'Diperiksa aplikasi Fakultas saat mahasiswa menekan Daftar seminar.',
  kategori: ['akademik'],
  subjek: 'mahasiswa',
  jenis: ['syarat', 'batas_waktu'],
  konteks: ['jenis_seminar'],
  lama: null,
  penerapan: [],
  unit: 'fakultas',
  kustom: true,
};
(TITIK_ATURAN['kustom.seminar_proposal'] as Baris).konteks_def = [
  {
    kode: 'jenis_seminar',
    judul: 'Jenis seminar',
    tipe: 'pilihan',
    opsi: [
      { nilai: 'proposal', label: 'Seminar proposal' },
      { nilai: 'hasil', label: 'Seminar hasil' },
    ],
  },
];
INDIKATOR_ATURAN.jenis_seminar = {
  judul: 'Jenis seminar',
  tipe: 'pilihan',
  subjek: 'mahasiswa',
  sumber: 'konteks',
  keterangan: 'Dikirim aplikasi Fakultas',
  opsi: [
    { nilai: 'proposal', label: 'Seminar proposal' },
    { nilai: 'hasil', label: 'Seminar hasil' },
  ],
};
tambahRute(/^\/v1\/aturan\/titik$/, (_u, init) => {
  if (metode(init) === 'POST') {
    const b = badan(init);
    if (!/^kustom\.[a-z0-9_.]+$/.test(String(b.kode ?? ''))) return galat422({ kode: 'berawalan kustom.' });
    if (TITIK_ATURAN[b.kode]) return galat422({ kode: 'sudah dipakai' });
    TITIK_ATURAN[b.kode] = {
      judul: b.judul,
      keterangan: b.keterangan ?? '',
      kategori: b.kategori,
      subjek: b.subjek,
      jenis: b.jenis,
      konteks: (b.konteks ?? []).map((k: Baris) => k.kode),
      lama: null,
      penerapan: [],
      unit: 'baak',
      kustom: true,
    };
    (TITIK_ATURAN[b.kode] as Baris).konteks_def = b.konteks ?? [];
    PENGATUR_TITIK[b.kode] = b.pengatur ?? [];
    return { __status: 201, data: bentukTitik(b.kode) };
  }
  return { data: Object.keys(TITIK_ATURAN).map(bentukTitik) };
});
tambahRute(/^\/v1\/aturan\/titik\/[^/]+(\/hapus)?$/, (u, init) => {
  const [, , , , kode, aksi] = u.pathname.split('/').map(decodeURIComponent);
  const t = TITIK_ATURAN[kode!];
  if (!t) return tidakAda;
  if (aksi === 'hapus') {
    if (!t.kustom) return { __status: 409, error: { code: 'conflict', message: 'Titik bawaan tidak bisa dihapus.' } };
    const aktif = ATURAN.filter((a) => a.titik === kode && a.status === 'aktif' && !a.dihapus_at);
    if (aktif.length)
      return { __status: 409, error: { code: 'conflict', message: `Titik ini masih dipakai ${aktif.length} aturan aktif.`, details: { aturan: aktif.map((a) => ({ id: a.id, nama: a.nama })) } } };
    delete TITIK_ATURAN[kode!];
    return { data: { ok: true } };
  }
  const b = badan(init);
  Object.assign(t, { judul: b.judul ?? t.judul, keterangan: b.keterangan ?? t.keterangan, contoh: b.contoh ?? t.contoh, aktif: b.aktif ?? t.aktif });
  if (t.kustom) Object.assign(t, { kategori: b.kategori ?? t.kategori, jenis: b.jenis ?? t.jenis, konteks_def: b.konteks ?? (t as Baris).konteks_def });
  if (b.pengatur) PENGATUR_TITIK[kode!] = b.pengatur;
  return { data: bentukTitik(kode!) };
});
ATURAN.push(
  aturan({
    nama: 'Seminar proposal minimal 110 SKS',
    titik: 'kustom.seminar_proposal',
    kategori: 'akademik',
    jenis: 'syarat',
    kondisi: { semua: [{ indikator: 'sks_lulus', op: '>=', nilai: 110 }] },
  }),
);

// ---------------------------------------------------------------- Sifat, jalur darurat, penyetuju, pengecualian
for (const a of ATURAN) a.sifat = ['kkn.syarat', 'krs.batas-sks'].includes(a.kode) ? 'boleh_pengecualian' : 'ketat';
ATURAN.push(
  aturan({
    nama: 'Masa pendaftaran KKN gelombang 2',
    kode: 'kkn.masa-2',
    titik: 'kkn.daftar',
    kategori: 'kemahasiswaan',
    jenis: 'batas_waktu',
    sifat: 'ketat',
    darurat: true,
    darurat_info: {
      label: 'Aktif lewat jalur darurat',
      alasan: 'Pendaftaran dibuka besok sesuai SK Rektor; rapat pimpinan baru pekan depan.',
      oleh: 'superadmin',
      waktu: jam(new Date(Date.now() - 3 * 3_600_000)),
    },
    usulan: { jenis: 'darurat', status: 'diajukan', diajukan_oleh: 'superadmin', diajukan_at: jam(new Date(Date.now() - 3 * 3_600_000)) },
    parameter: { mulai: `${geser(-1)} 08:00:00`, selesai: `${geser(13)} 23:59:59` },
  }),
);
const ISI_DI = [
  {
    aplikasi: 'Pustikom',
    menu: 'Modul Pusat data (induk) » Pejabat struktural',
    path: '/m/induk/induk~pejabat',
    langkah: 'Tambah pejabat: unit Universitas, jabatan (mis. WR1/REKTOR), username akun SIAKAD pejabat, tanggal mulai, nomor SK. Pejabat tanpa username tidak bisa menyetujui.',
  },
  {
    aplikasi: 'Dasbor Pimpinan',
    menu: 'Pengaturan » Bidang',
    path: '/pengaturan/bidang',
    langkah: 'Pada bidang yang dipetakan, tambahkan pemegang: jabatan struktural, atau orang (username) dengan masa berlaku (mis. Plt).',
  },
];
const PEJABAT: Record<string, { nama: string; pejabat: Baris[] }> = {
  REKTOR: { nama: 'Rektor', pejabat: [{ username: 'rektor', nama: 'Prof. Rahmat Puluhulawa', plt: false }] },
  WR1: { nama: 'Wakil Rektor I (Akademik)', pejabat: [{ username: 'wr1', nama: 'Dr. Hasanuddin Lamatenggo', plt: false }] },
  WR2: { nama: 'Wakil Rektor II (Keuangan & SDM)', pejabat: [{ username: 'wr2', nama: 'Sri Yuliani Abdullah, M.Ak.', plt: false }] },
  WR3: { nama: 'Wakil Rektor III (Kemahasiswaan)', pejabat: [{ username: null, nama: 'Moh. Rizal Pakaya, M.Pd.', plt: true }] },
  WR4: { nama: 'Wakil Rektor IV (Penelitian)', pejabat: [] },
};
const PETA: Record<string, string[]> = { akademik: ['WR1'], kelulusan: ['WR1', 'REKTOR'], keuangan: ['WR2'], kemahasiswaan: ['WR3'], kepegawaian: ['WR2'], penelitian: ['WR4'], umum: ['REKTOR'] };
const barisPenyetuju = (k: string) => {
  const jab = PETA[k]!;
  const rinci = [...jab, ...(jab.includes('REKTOR') ? [] : ['REKTOR'])].map((kode) => ({ kode, nama: PEJABAT[kode]?.nama ?? kode, pejabat: PEJABAT[kode]?.pejabat ?? [] }));
  const siap = jab.some((j) => (PEJABAT[j]?.pejabat ?? []).some((p) => p.username));
  return {
    kategori: k,
    judul: KATEGORI[k],
    jabatan: jab[0],
    jabatan_daftar: jab,
    telaah_spmi: k !== 'umum',
    penyetuju: { kategori: k, jabatan_daftar: jab, rektor: !siap, orang: [], jabatan_rinci: rinci, siap, isi_di: ISI_DI },
  };
};
tambahRute(/^\/v1\/aturan\/penyetuju$/, (_u, init) => {
  if (metode(init) === 'POST') for (const x of badan(init).penyetuju ?? []) PETA[x.kategori] = Array.isArray(x.jabatan) ? x.jabatan : [x.jabatan];
  return { data: Object.keys(PETA).map(barisPenyetuju) };
});
const AJUAN: Baris[] = [
  {
    id: uuid(),
    subjek_jenis: 'mahasiswa',
    subjek: MAHASISWA[5].nim,
    subjek_nama: MAHASISWA[5].nama,
    tahun_id: TAHUN,
    berlaku_sampai: geser(120),
    alasan: 'Mahasiswa pertukaran MBKM; mata kuliah konversi diakui lewat SK Dekan sehingga perlu 26 SKS.',
    dokumen: { berkas_id: uuid(), jenis: 'sk', nomor: '45/FT-UNIPO/SK/XI/2026', tanggal: geser(-3) },
    status: 'diajukan',
    diajukan_oleh: 'operator.ft',
    diajukan_at: jam(new Date(Date.now() - 5 * 3_600_000)),
    diputus_oleh: null,
    diputus_at: null,
    catatan_putusan: null,
    aturan: { id: ATURAN.find((a) => a.kode === 'krs.batas-sks')!.id, nama: 'Batas SKS KRS menurut IPS', titik: 'krs.ambil', status: 'aktif' },
    boleh_putus: true,
  },
  {
    id: uuid(),
    subjek_jenis: 'mahasiswa',
    subjek: MAHASISWA[9].nim,
    subjek_nama: MAHASISWA[9].nama,
    tahun_id: null,
    berlaku_sampai: null,
    alasan: 'Sudah lulus Pendidikan Pancasila di kampus asal (mahasiswa pindahan), nilai diakui lewat dokumen konversi.',
    dokumen: { berkas_id: uuid(), jenis: 'dokumen_kebijakan', nomor: '12/BAAK/KONV/2026', tanggal: geser(-10) },
    status: 'diajukan',
    diajukan_oleh: MAHASISWA[9].nim,
    diajukan_at: jam(new Date(Date.now() - 26 * 3_600_000)),
    diputus_oleh: null,
    diputus_at: null,
    catatan_putusan: null,
    aturan: { id: ATURAN.find((a) => a.kode === 'kkn.syarat')!.id, nama: 'Syarat pendaftaran KKN', titik: 'kkn.daftar', status: 'aktif' },
    boleh_putus: true,
  },
];
tambahRute(/^\/v1\/aturan\/pengecualian\/ajuan$/, (u) => {
  const st = u.searchParams.get('status');
  const at = u.searchParams.get('aturan');
  return { data: AJUAN.filter((x) => (!st || x.status === st) && (!at || x.aturan?.id === at)) };
});
tambahRute(/^\/v1\/aturan\/pengecualian\/ajuan\/[^/]+\/(setujui|tolak)$/, (u, init) => {
  const [, , , , , id, aksi] = u.pathname.split('/');
  const x = AJUAN.find((y) => y.id === id);
  if (!x) return tidakAda;
  if (aksi === 'tolak' && !String(badan(init).catatan ?? '').trim()) return galat422({ catatan: 'wajib diisi' });
  Object.assign(x, { status: aksi === 'setujui' ? 'disetujui' : 'ditolak', diputus_oleh: 'baak01', diputus_at: sekarang(), catatan_putusan: badan(init).catatan ?? null });
  return { data: x };
});
tambahRute(/^\/v1\/aturan\/[^/]+\/pengecualian\/ajukan$/, (u, init) => {
  const a = cari(u.pathname.split('/')[3]!);
  if (!a) return tidakAda;
  if (a.sifat !== 'boleh_pengecualian') return { __status: 409, error: { code: 'conflict', message: 'Aturan ini ketat dan tidak bisa dikecualikan.', details: { sifat: 'ketat' } } };
  const b = badan(init);
  AJUAN.unshift({
    id: uuid(),
    ...b,
    dokumen: { berkas_id: b.berkas_id, jenis: b.dok_jenis, nomor: b.dok_nomor ?? null, tanggal: b.dok_tanggal ?? null },
    status: 'diajukan',
    diajukan_oleh: 'baak01',
    diajukan_at: sekarang(),
    aturan: { id: a.id, nama: a.nama, titik: a.titik, status: a.status },
    boleh_putus: true,
  });
  return { __status: 201, data: AJUAN[0] };
});

// Aturan bawaan tambahan per unit (19 di SIAKAD; contoh sebagian).
ATURAN.push(
  aturan({
    nama: 'Masa kontrak KRS mengikuti kalender akademik',
    kode: 'UNIPO-KRS-MASA',
    titik: 'krs.ambil',
    kategori: 'akademik',
    jenis: 'batas_waktu',
    status: 'diajukan',
    bawaan: true,
    diaktifkan_at: null,
    diaktifkan_oleh: null,
    dibuat_oleh: 'migration',
    parameter: { mulai: `${geser(20)} 08:00:00`, selesai: `${geser(34)} 23:59:59` },
  }),
  aturan({
    nama: 'KRS hanya untuk mahasiswa ber-status aktif',
    kode: 'UNIPO-KRS-AKTIF',
    titik: 'krs.ambil',
    kategori: 'akademik',
    jenis: 'syarat',
    bawaan: true,
    dibuat_oleh: 'migration',
    kondisi: { semua: [{ indikator: 'status_aktif', op: '=', nilai: 'A' }] },
  }),
  aturan(
    {
      nama: 'Her-registrasi wajib memenuhi syarat bayar',
      kode: 'UNIPO-REGISTRASI-SYARAT-BAYAR',
      titik: 'krs.ambil',
      kategori: 'keuangan',
      jenis: 'syarat',
      status: 'draf',
      bawaan: true,
      sifat: 'boleh_pengecualian',
      diaktifkan_at: null,
      diaktifkan_oleh: null,
      dibuat_oleh: 'migration',
      kondisi: { semua: [{ indikator: 'bayar_syarat_krs', op: 'benar' }] },
    },
    false,
  ),
  aturan(
    {
      nama: 'Yudisium minimal 144 SKS dan IPK 2,00',
      kode: 'UNIPO-YUDISIUM-DASAR',
      titik: 'yudisium.tetapkan',
      kategori: 'kelulusan',
      jenis: 'syarat',
      status: 'draf',
      bawaan: true,
      diaktifkan_at: null,
      diaktifkan_oleh: null,
      dibuat_oleh: 'migration',
      kondisi: {
        semua: [
          { indikator: 'sks_lulus', op: '>=', nilai: 144 },
          { indikator: 'ipk', op: '>=', nilai: 2 },
        ],
      },
    },
    false,
  ),
);
const UNIT_KATEGORI: Record<string, string> = {
  akademik: 'baak',
  kelulusan: 'baak',
  kemahasiswaan: 'baak',
  keuangan: 'bauk',
  kepegawaian: 'sdm',
  mutu: 'spmi',
  penelitian: 'lppm',
  akun: 'pustikom',
  umum: 'baak',
};
for (const a of ATURAN) if (a.bawaan) a.unit ??= UNIT_KATEGORI[a.kategori] ?? 'baak';

// ---------------------------------------------------------------- Titik dari aksi aplikasi (/v1/aturan/rute, tahap 2a)
const saranMhs = (path: string) => ({
  mahasiswa: path.includes('{nim}') ? [{ sumber: 'path:nim', label: 'NIM di alamat aksi' }] : [{ sumber: 'pengguna:nim', label: 'Mahasiswa yang sedang masuk (yang menekan tombol)' }],
  pegawai: [{ sumber: 'pengguna:username', label: 'Pegawai yang sedang masuk (yang menekan tombol)' }],
  pendaftar: [],
  tahun: [{ sumber: 'body:tahun_id', label: 'Periode yang dikirim di isian' }],
  prodi: [{ sumber: 'body:prodi', label: 'Kode prodi di isian (prodi)' }],
});
const KATALOG_RUTE = [
  ['Ujian TA', [['POST', '/v1/ta/ujian/ajukan', 'Mahasiswa mengajukan siap ujian', 'Ujian TA: Kelayakan & pengajuan'], ['POST', '/v1/ta/ujian/{id}/jadwal', 'Susun jadwal dan tim', 'Ujian TA: Penjadwalan']]],
  ['KRS', [['POST', '/v1/mahasiswa/{nim}/krs', 'Simpan KRS mahasiswa', 'KRS: Pengisian']]],
  ['Cuti', [['POST', '/v1/cuti/ajukan', 'Mahasiswa mengajukan cuti', 'Cuti: Pengajuan']]],
  ['KKN', [['POST', '/v1/lppm/kkn/daftar', 'Mahasiswa mendaftar KKN', 'KKN: Pendaftaran']]],
] as const;
const ruteKatalog = () => ({
  jumlah: 5,
  cari: [{ kode: 'ujian_ta', label: 'Mahasiswa pemilik ujian tugas akhir', subjek: 'mahasiswa', dari: 'UUID ujian TA' }],
  sumber_pengguna: [],
  kelompok: KATALOG_RUTE.map(([modul, r]) => ({
    modul,
    jumlah: r.length,
    rute: r.map(([m, p, nama, tag]) => ({ kunci: `${m} ${p}`, metode: m, path: p, nama, tag, keterangan: '', parameter_path: [], hanya_pengguna: true, saran: saranMhs(p), titik: [] })),
  })),
});
const RUTE_TITIK: Record<string, Baris> = {};
tambahRute(/^\/v1\/aturan\/rute\/katalog$/, () => ({ data: ruteKatalog() }));
tambahRute(/^\/v1\/aturan\/rute$/, (_u, init) => {
  if (metode(init) === 'POST') {
    const b = badan(init);
    const kode = `rute.${String(b.judul ?? 'aksi').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`;
    TITIK_ATURAN[kode] = { judul: b.judul, keterangan: b.keterangan ?? '', kategori: b.kategori, subjek: b.subjek, jenis: b.jenis, konteks: [], lama: null, penerapan: [], unit: b.unit ?? 'baak', kustom: true };
    (TITIK_ATURAN[kode] as Baris).konteks_def = b.konteks ?? [];
    RUTE_TITIK[kode] = { ...b, kode };
    return { __status: 201, data: { kode } };
  }
  return { data: Object.values(RUTE_TITIK).map((r) => bentukRute(String(r.kode))) };
});
const bentukRute = (kode: string) => {
  const r = RUTE_TITIK[kode]!;
  const [m, p] = String(r.rute).split(' ');
  const nama = KATALOG_RUTE.flatMap(([, x]) => x).find((x) => x[1] === p)?.[2] ?? p;
  return {
    kode, judul: TITIK_ATURAN[kode]?.judul, keterangan: '', aktif: true, rute: { kunci: r.rute, metode: m, path: p, nama, modul: 'Ujian TA', ada: true },
    subjek: r.subjek, subjek_sumber: r.subjek_sumber ?? [], tahun_sumber: r.tahun_sumber ?? [], prodi_sumber: [], konteks_sumber: r.konteks_sumber ?? {},
    bila: (r.bila ?? []), kategori: r.kategori, jenis: r.jenis, konteks: r.konteks ?? [], jumlah_aturan_aktif: 0,
  };
};
tambahRute(/^\/v1\/aturan\/rute\/rute\.[^/]+$/, (u) => {
  const kode = decodeURIComponent(u.pathname.split('/').pop()!);
  return RUTE_TITIK[kode] ? { data: bentukRute(kode) } : tidakAda;
});
RUTE_TITIK['rute.mahasiswa_mendaftar_seminar_proposal'] = {
  kode: 'rute.mahasiswa_mendaftar_seminar_proposal', rute: 'POST /v1/ta/ujian/ajukan', subjek: 'mahasiswa', subjek_sumber: ['pengguna:nim'], kategori: ['akademik'], jenis: ['syarat'],
  bila: [{ sumber: 'body:jenis', nilai: ['proposal'] }],
};
TITIK_ATURAN['rute.mahasiswa_mendaftar_seminar_proposal'] = {
  judul: 'Mahasiswa mendaftar seminar proposal (otomatis)', keterangan: 'Diperiksa otomatis sebelum aksi "Mahasiswa mengajukan siap ujian" dijalankan.', kategori: ['akademik'], subjek: 'mahasiswa',
  jenis: ['syarat'], konteks: [], lama: null, penerapan: [], unit: 'baak', kustom: true,
};
tambahRute(/^\/v1\/rbac\/peran$/, () => ({
  data: [
    { kode: 'kepala-baak', nama: 'Kepala BAAK' }, { kode: 'staf-baak', nama: 'Staf BAAK' }, { kode: 'dekan', nama: 'Dekan' }, { kode: 'wakil-dekan', nama: 'Wakil dekan' },
    { kode: 'kaprodi', nama: 'Ketua program studi' }, { kode: 'kepala-bauk', nama: 'Kepala BAUK' },
  ],
}));
