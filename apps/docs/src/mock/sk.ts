// Registri SK tiruan (/v1/sk) untuk PilihSK, IsianSK, AjukanPencatatanSK (panel samping 4 langkah), dan KelolaSK.
// Semua nomor, nama, dan unit fiktif. Pengguna demo pencatat SK di Universitas dan Fakultas Ilmu Komputer.
import { tambahRute } from './siakad';

type Baris = Record<string, unknown>;
const badan = (init?: RequestInit): Baris => {
  try {
    return JSON.parse(String(init?.body ?? '{}'));
  } catch {
    return {};
  }
};
/** Normalisasi nomor seperti server: huruf besar, tanpa spasi/tanda baca, tanpa nol di depan angka. */
const kunci = (n: string) =>
  n
    .toUpperCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((b) => (/^\d+$/.test(b) ? String(Number(b)) : b))
    .join('/');

const PENERBIT = [
  { unit_id: 1, kode: 'UNIPO', jenis: 'universitas', nama: 'Universitas Pohuwato', induk_id: null, boleh_catat: true },
  { unit_id: 2, kode: 'BAAK', jenis: 'biro', nama: 'Biro Administrasi Akademik', induk_id: 1, boleh_catat: false },
  { unit_id: 10, kode: 'FIK', jenis: 'fakultas', nama: 'Fakultas Ilmu Komputer', induk_id: 1, boleh_catat: true },
  { unit_id: 11, kode: 'IF', jenis: 'prodi', nama: 'Program Studi Informatika', induk_id: 10, boleh_catat: false },
  { unit_id: 20, kode: 'FE', jenis: 'fakultas', nama: 'Fakultas Ekonomi', induk_id: 1, boleh_catat: false },
];
const PEJABAT: Record<number, Array<{ pejabat_id: number; nama: string; jabatan: string; unit_penerbit_id: number }>> = {
  1: [
    { pejabat_id: 1, nama: 'Dr. Rahmat Pakaya, M.Si.', jabatan: 'Rektor Universitas Pohuwato', unit_penerbit_id: 1 },
    { pejabat_id: 2, nama: 'Siti Gobel, M.Pd.', jabatan: 'Wakil Rektor Bidang Akademik', unit_penerbit_id: 1 },
  ],
  10: [{ pejabat_id: 3, nama: 'Fajar Lamato, M.Kom.', jabatan: 'Dekan Fakultas Ilmu Komputer', unit_penerbit_id: 10 }],
  20: [],
};
const JABATAN: Record<number, Array<{ jabatan_id: number; kode: string; jabatan_lengkap: string; unit_id: number }>> = {
  1: [{ jabatan_id: 1, kode: 'REKTOR', jabatan_lengkap: 'Rektor Universitas Pohuwato', unit_id: 1 }],
  10: [{ jabatan_id: 5, kode: 'DEKAN', jabatan_lengkap: 'Dekan Fakultas Ilmu Komputer', unit_id: 10 }],
  20: [{ jabatan_id: 6, kode: 'DEKAN', jabatan_lengkap: 'Dekan Fakultas Ekonomi', unit_id: 20 }],
};
const penerbitDari = (id: number | null) => {
  const u = PENERBIT.find((x) => x.unit_id === id);
  return u ? { unit_id: u.unit_id, nama: u.nama, kode: u.kode, jenis: u.jenis } : null;
};

const SK: Baris[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nomor: '91.01/UNIPO-SK/VII/2026',
    tanggal: '2026-07-15',
    perihal: 'Kalender Akademik Tahun Akademik 2026/2027',
    jenis: 'kalender',
    penerbit: penerbitDari(1),
    penandatangan: { pejabat_id: 1, jabatan: 'Rektor Universitas Pohuwato', nama: 'Dr. Rahmat Pakaya, M.Si.', tautan: 'pejabat' },
    tempat: 'Marisa',
    berkas: { ada: true, nama: 'SK-kalender-2026.pdf', mime: 'application/pdf', ukuran: 182000, url: '#' },
    status: 'terbit',
    sumber: 'registri',
    diverifikasi_at: '2026-07-15 09:00:00',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nomor: '014/FIK-UNIPO/SK/IX/2026',
    tanggal: '2026-09-02',
    perihal: 'Pembentukan Panitia Seminar Nasional Informatika',
    jenis: 'panitia',
    penerbit: penerbitDari(10),
    penandatangan: { pejabat_id: 3, jabatan: 'Dekan Fakultas Ilmu Komputer', nama: 'Fajar Lamato, M.Kom.', tautan: 'pejabat' },
    tempat: 'Marisa',
    berkas: { ada: false, url: '' },
    status: 'terbit',
    sumber: 'registri',
    diverifikasi_at: '2026-09-02 10:00:00',
  },
];

const detail = (s: Baris) => ({ ...s, pemakaian: [], mengubah: [], diubah_oleh_sk: [], ganda: [], boleh: { catat: PENERBIT.find((u) => u.unit_id === (s.penerbit as { unit_id?: number } | null)?.unit_id)?.boleh_catat ?? false } });
const angka = (u: URL, k: string) => (u.searchParams.get(k) ? Number(u.searchParams.get(k)) : null);

tambahRute(/\/v1\/sk\/penerbit$/, () => ({ data: PENERBIT }));
tambahRute(/\/v1\/sk\/penandatangan$/, (u) => ({ data: PEJABAT[angka(u, 'unit_id') ?? 0] ?? [] }));
tambahRute(/\/v1\/sk\/jabatan-penandatangan$/, (u) => ({ data: JABATAN[angka(u, 'unit_id') ?? 0] ?? [] }));
tambahRute(/\/v1\/sk\/bawaan$/, () => ({ data: { penerbit_unit_id: null, penerbit_luar: null, perihal: null, penandatangan: null } }));
tambahRute(/\/v1\/sk\/periksa$/, (u) => {
  const nomor = u.searchParams.get('nomor') ?? '';
  const k = kunci(nomor);
  const pen = angka(u, 'penerbit_unit_id');
  const cocok = SK.filter((s) => kunci(String(s.nomor)) === k);
  const sama = cocok.filter((s) => !pen || (s.penerbit as { unit_id?: number } | null)?.unit_id === pen);
  const mirip = cocok.filter((s) => !sama.includes(s));
  return { data: { nomor, nomor_kunci: k, sama, mirip, pesan: sama.length ? `Sudah tercatat sebagai ${sama[0].nomor}` : null } };
});
tambahRute(/\/v1\/sk\/[0-9a-f-]{36}$/, (u, init) => {
  const id = u.pathname.split('/').pop()!;
  const s = SK.find((x) => x.id === id);
  if (!s) return { __status: 404, error: { message: 'SK tidak ditemukan.' } };
  if (init?.method === 'POST') Object.assign(s, badan(init));
  return { data: detail(s) };
});
tambahRute(/\/v1\/sk$/, (u, init) => {
  if (init?.method === 'POST') {
    const b = badan(init);
    const pen = typeof b.penerbit_unit_id === 'number' ? b.penerbit_unit_id : null;
    const ada = SK.find((s) => kunci(String(s.nomor)) === kunci(String(b.nomor ?? '')) && (s.penerbit as { unit_id?: number } | null)?.unit_id === pen);
    if (ada) return { __status: 422, error: { message: `SK ini sudah tercatat sebagai ${ada.nomor}.`, details: { kode: 'sk_sudah_tercatat', sk: ada } } };
    const pj = Object.values(PEJABAT)
      .flat()
      .find((p) => p.pejabat_id === b.penandatangan_pejabat_id);
    const boleh = pen ? (PENERBIT.find((x) => x.unit_id === pen)?.boleh_catat ?? false) : true;
    const baru: Baris = {
      id: crypto.randomUUID(),
      nomor: String(b.nomor),
      tanggal: b.tanggal ?? null,
      perihal: b.perihal ?? null,
      jenis: b.jenis ?? null,
      penerbit: pen ? penerbitDari(pen) : { unit_id: null, nama: String(b.penerbit_luar ?? 'Instansi luar'), luar: true },
      penandatangan: pj
        ? { pejabat_id: pj.pejabat_id, jabatan: pj.jabatan, nama: pj.nama, tautan: 'pejabat' }
        : b.penandatangan_jabatan || b.penandatangan_nama
          ? { pejabat_id: null, jabatan: b.penandatangan_jabatan ?? null, nama: b.penandatangan_nama ?? null, tautan: b.penandatangan_jabatan_id ? 'jabatan' : 'teks' }
          : null,
      tempat: b.tempat ?? (pen ? (SK.find((s) => (s.penerbit as { unit_id?: number } | null)?.unit_id === pen && s.tempat)?.tempat ?? null) : null),
      berkas: b.berkas_id ? { ada: true, nama: 'Berkas SK', url: '#' } : { ada: false, url: '' },
      status: boleh ? 'terbit' : 'draf',
      sumber: 'registri',
      diverifikasi_at: boleh ? new Date().toISOString() : null,
    };
    SK.unshift(baru);
    return { __status: 201, data: baru };
  }
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const pen = angka(u, 'penerbit');
  const rows = SK.filter((s) => (!q || `${s.nomor} ${s.perihal ?? ''}`.toLowerCase().includes(q) || kunci(String(s.nomor)).includes(kunci(q))) && (!pen || (s.penerbit as { unit_id?: number } | null)?.unit_id === pen));
  return { data: rows.slice(0, Number(u.searchParams.get('per_page') ?? 15)), meta: { total: rows.length, unit_catat: [1, 10] } };
});

// Pohon unit organisasi (induk_unit) untuk PilihUnit penerbit SK: id sama dengan /v1/sk/penerbit.
const pohon = (induk: number | null): Baris[] =>
  PENERBIT.filter((u) => u.induk_id === induk).map((u) => ({ id: u.unit_id, induk_id: u.induk_id, kode: u.kode, jenis: u.jenis, nama: u.nama, singkatan: u.kode, aktif: true, turunan: pohon(u.unit_id) }));
tambahRute(/\/v1\/induk\/unit-pohon$/, () => ({ data: pohon(null) }));
