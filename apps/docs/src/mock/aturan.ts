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
const KATALOG = {
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
  })),
  indikator: Object.entries(INDIKATOR_ATURAN).map(([kode, d]) => ({ kode, ...d })),
};

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
  { kategori: 'akademik', titik: '', jenis: 'peran', kode: 'baak', keterangan: 'Staf BAAK' },
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
      const p = { id: a.id, uuid: a.id, kode: a.kode, nama: a.nama, kategori: a.kategori, jenis: a.jenis, mode: a.mode, ...langgar };
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
  return { ...x, titik_judul: TITIK_ATURAN[a.titik]?.judul ?? null };
};
const lampiranAktif = (a: Aturan) => a.lampiran.filter((l) => !l.dilepas_at);
const detail = (a: Aturan) => ({ ...bentuk(a), lampiran: lampiranAktif(a), pengecualian: a.pengecualian, pengatur: PENGATUR.filter((p) => p.kategori === a.kategori), boleh_atur: true });
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
tambahRute(/^\/v1\/aturan\/katalog$/, () => ({ data: KATALOG }));
tambahRute(/^\/v1\/aturan\/saya$/, () => ({
  data: {
    admin: true,
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
      (!s.get('tahun_id') || !a.tahun_id || a.tahun_id === s.get('tahun_id')) &&
      (!q || `${a.nama} ${a.kode ?? ''}`.toLowerCase().includes(q)),
  );
  const per = Number(s.get('per_page') ?? 50);
  return {
    data: rows.slice(0, per).map((a) => ({ ...bentuk(a), jumlah_sk: lampiranAktif(a).filter((l) => l.jenis === 'sk').length })),
    meta: { page: 1, per_page: per, total: rows.length, total_pages: Math.ceil(rows.length / per) },
  };
});
tambahRute(/^\/v1\/aturan\/[^/]+(\/[a-z]+)?$/, (u, init) => {
  const [, , , id, aksi] = u.pathname.split('/');
  if (['katalog', 'saya', 'periksa', 'pengatur'].includes(id)) return LEWATI;
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
