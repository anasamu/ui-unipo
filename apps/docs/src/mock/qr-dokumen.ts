import { tambahRute } from './siakad';

/** Server tiruan /v1/qr (gaya per bagian) dan /v1/dokumen (templat, terbit, verifikasi) untuk halaman demo. */
const sekarang = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const json = (init?: RequestInit): Record<string, unknown> => {
  if (!init?.body || init.body instanceof FormData) return {};
  try {
    return JSON.parse(String(init.body)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const LOGO =
  'data:image/svg+xml;base64,' +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#0f3d5e"/><circle cx="32" cy="32" r="19" fill="#f5b301"/><circle cx="32" cy="32" r="10" fill="#0f3d5e"/></svg>');

type Gaya = Record<string, unknown>;
const PRESET: Record<string, Gaya> = {
  bawaan: {},
  presensi: { modul: 'menyatu', mata_luar: 'rounded', mata_dalam: 'rounded', warna: '#0f3d5e', koreksi: 'M', margin: 3 },
  dokumen: { modul: 'kotak', mata_luar: 'kotak', mata_dalam: 'kotak', warna: '#000000', koreksi: 'Q', margin: 2 },
  kartu: { modul: 'rounded', mata_luar: 'rounded', mata_dalam: 'bulat', warna: '#0f172a', margin: 2 },
};
const UNIT: Record<string, { nama: string; induk: string | null }> = {
  univ: { nama: 'Universitas Pohuwato', induk: null },
  ft: { nama: 'Fakultas Teknik', induk: 'univ' },
  '55201': { nama: 'Prodi Informatika', induk: 'ft' },
  keuangan: { nama: 'Biro Keuangan', induk: 'univ' },
  baak: { nama: 'BAAK', induk: 'univ' },
};
const GAYA: Array<{ id: string; kode: string; nama: string; bagian: string | null; gaya: Gaya; aktif: boolean; diubah_at: string }> = [
  {
    id: 'g-presensi-kampus', kode: 'presensi', nama: 'Presensi kampus', bagian: null, aktif: true, diubah_at: '2026-11-15 08:00:00',
    gaya: { ...PRESET.presensi, gradasi: { jenis: 'linear', sudut: 45, warna: ['#0f3d5e', '#0e7490'] }, logo: { sumber: 'kampus', ukuran: 0.22, bulat: true, latar: '#ffffff' }, bingkai: { teks: 'PINDAI UNTUK PRESENSI', warna: '#0f3d5e' } },
  },
  {
    id: 'g-presensi-ft', kode: 'presensi', nama: 'Presensi Fakultas Teknik', bagian: 'ft', aktif: true, diubah_at: '2026-11-15 09:30:00',
    gaya: { warna: '#7c2d12', modul: 'bulat', mata_luar: 'daun', mata_dalam: 'daun', warna_mata_dalam: '#ea580c', logo: { sumber: 'kampus', ukuran: 0.2, latar: '#ffffff' }, bingkai: { teks: 'PRESENSI FT', warna: '#7c2d12', bentuk: 'pil' }, margin: 2 },
  },
];
const lengkap = (g: (typeof GAYA)[number]) => ({ ...g, bagian_nama: g.bagian ? UNIT[g.bagian]?.nama ?? g.bagian : null, diubah_oleh: 'admin' });
const denganLogo = (g: Gaya): Gaya => {
  const l = g.logo as Record<string, unknown> | null | undefined;
  return l ? { ...g, logo: { ...l, sumber: 'data', data: LOGO, berkas_id: null } } : g;
};

tambahRute(/^\/v1\/qr\/gaya\/efektif$/, (u) => {
  const kode = u.searchParams.get('kode') ?? 'bawaan';
  let b: string | null = u.searchParams.get('bagian');
  while (true) {
    const g = GAYA.find((x) => x.kode === kode && x.bagian === b && x.aktif);
    if (g) return { data: { kode, bagian: g.bagian, sumber: 'tersimpan', id: g.id, nama: g.nama, gaya: denganLogo(g.gaya) } };
    if (b === null) break;
    b = UNIT[b]?.induk ?? null;
    if (b === 'univ') b = null;
  }
  return { data: { kode, bagian: null, sumber: 'bawaan', id: null, nama: null, gaya: denganLogo(PRESET[kode] ?? {}) } };
});
tambahRute(/^\/v1\/qr\/gaya$/, (u, init) => {
  if (init?.method === 'POST') {
    const b = json(init);
    const g = { id: `g-${Date.now()}`, kode: String(b.kode ?? 'presensi'), nama: String(b.nama ?? b.kode), bagian: (b.bagian as string) ?? null, gaya: (b.gaya as Gaya) ?? {}, aktif: true, diubah_at: sekarang() };
    if (GAYA.some((x) => x.kode === g.kode && x.bagian === g.bagian)) return { __status: 409, error: { code: 'conflict', message: 'Bagian ini sudah punya gaya dengan kode tersebut.' } };
    GAYA.push(g);
    return { __status: 201, data: lengkap(g) };
  }
  const kode = u.searchParams.get('kode');
  const bagian = u.searchParams.get('bagian');
  return { data: { gaya: GAYA.filter((g) => (!kode || g.kode === kode) && (!bagian || g.bagian === bagian)).map(lengkap), preset: Object.keys(PRESET), tersedia: true } };
});
tambahRute(/^\/v1\/qr\/gaya\/(?!efektif$)[^/]+(\/hapus)?$/, (u, init) => {
  const [, , , , id, aksi] = u.pathname.split('/');
  const i = GAYA.findIndex((g) => g.id === id);
  if (i < 0) return { __status: 404, error: { code: 'not_found', message: 'Gaya tidak ditemukan.' } };
  if (aksi === 'hapus') {
    GAYA.splice(i, 1);
    return { __status: 204 };
  }
  if (init?.method === 'POST') {
    const b = json(init);
    GAYA[i] = { ...GAYA[i]!, ...(b.nama ? { nama: String(b.nama) } : {}), ...(b.gaya ? { gaya: b.gaya as Gaya } : {}), diubah_at: sekarang() };
  }
  return { data: lengkap(GAYA[i]!) };
});

// ---------------------------------------------------------------- dokumen

let pdf: Uint8Array<ArrayBuffer> | null = null;
async function contohPdf() {
  if (!pdf) pdf = new Uint8Array(await (await fetch(`${import.meta.env.BASE_URL}contoh/dokumen-pratinjau.pdf`)).arrayBuffer());
  return { __mentah: pdf, __tipe: 'application/pdf' };
}

const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const kodeBaru = () => Array.from({ length: 12 }, () => HURUF[Math.floor(Math.random() * HURUF.length)]).join('');
type Terbit = {
  id: string; kode_verifikasi: string; url_verifikasi: string; jenis: string; jenis_nama: string; judul: string; nomor: string | null; bagian: string; bagian_nama: string;
  pemilik: string; pemilik_nama: string; ringkasan: Record<string, string>; sha256: string; ukuran: number; halaman: number; status: 'sah' | 'diganti' | 'dibatalkan';
  alasan_batal: string | null; dibatalkan_at: string | null; kedaluwarsa_at: string | null; diterbitkan_at: string;
};
const url = (k: string) => `https://siakad.unipo.ac.id/api/v1/dokumen/v/${k}`;
const TERBIT: Terbit[] = [
  {
    id: 'd-1', kode_verifikasi: 'K7QM2XPA9RTD', url_verifikasi: url('K7QM2XPA9RTD'), jenis: 'krs', jenis_nama: 'Kartu Rencana Studi', judul: 'KRS Semester Ganjil 2026/2027', nomor: null,
    bagian: '55201', bagian_nama: 'Prodi Informatika', pemilik: '2301010001', pemilik_nama: 'Nur Aisyah Hasan', ringkasan: { 'Tahun akademik': 'Ganjil 2026/2027', 'Jumlah SKS': '21' },
    sha256: '4d1c0b6a2f0e9a77d6a4c5b1e8f3a2d9c0b7e6f5a4d3c2b1a0f9e8d7c6b5a4f3', ukuran: 26521, halaman: 1, status: 'sah', alasan_batal: null, dibatalkan_at: null, kedaluwarsa_at: null, diterbitkan_at: '2026-11-15 10:12:00',
  },
  {
    id: 'd-2', kode_verifikasi: 'W3HN8BQZ4MKE', url_verifikasi: url('W3HN8BQZ4MKE'), jenis: 'kwitansi', jenis_nama: 'Kwitansi', judul: 'Kwitansi Pembayaran', nomor: 'KW/2026/0142',
    bagian: 'keuangan', bagian_nama: 'Biro Keuangan', pemilik: '2301010001', pemilik_nama: 'Nur Aisyah Hasan', ringkasan: { Jumlah: 'Rp 2.500.000', Untuk: 'UKT Ganjil 2026/2027' },
    sha256: '9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0', ukuran: 21877, halaman: 1, status: 'dibatalkan', alasan_batal: 'Salah nominal, diganti kwitansi baru', dibatalkan_at: '2026-11-15 11:00:00', kedaluwarsa_at: null, diterbitkan_at: '2026-11-15 10:40:00',
  },
];
const samar = (s: string) => s.split(' ').map((k) => k[0] + '*'.repeat(Math.max(1, k.length - 1))).join(' ');
const publik = (d: Terbit) => ({
  sah: d.status === 'sah', status: d.status, kode: d.kode_verifikasi.match(/.{4}/g)!.join('-'),
  pesan: d.status === 'sah' ? 'Dokumen ini asli dan tercatat di SIAKAD.' : `Dokumen ini dibatalkan pada ${d.dibatalkan_at}: ${d.alasan_batal}.`,
  jenis: d.jenis, jenis_nama: d.jenis_nama, judul: d.judul, nomor: d.nomor, penerbit: d.bagian_nama, pemilik: samar(d.pemilik_nama), pemilik_id: d.pemilik.slice(0, 4) + '****' + d.pemilik.slice(-2),
  ringkasan: d.ringkasan, diterbitkan_at: d.diterbitkan_at, kedaluwarsa_at: d.kedaluwarsa_at, dibatalkan_at: d.dibatalkan_at, sha256: d.sha256, halaman: d.halaman,
});

tambahRute(/^\/v1\/dokumen\/(verifikasi|v)\/[^/]+$/, (u) => {
  const k = decodeURIComponent(u.pathname.split('/').pop()!).replace(/-/g, '').toUpperCase();
  const d = TERBIT.find((x) => x.kode_verifikasi === k);
  return d ? { data: publik(d) } : { __status: 404, error: { code: 'not_found', message: 'Kode verifikasi tidak dikenal.' } };
});
tambahRute(/^\/v1\/dokumen\/verifikasi$/, (_u, init) => {
  const f = init?.body instanceof FormData ? (init.body.get('berkas') as File | null) : null;
  const d = TERBIT[0]!;
  // Di demo, file bernama krs*.pdf dianggap sama dengan dokumen contoh.
  return f && /^krs/i.test(f.name)
    ? { data: { cocok: true, sha256: d.sha256, pesan: 'Isi file sama persis dengan dokumen yang diterbitkan.', dokumen: publik(d) } }
    : { data: { cocok: false, sha256: 'c0ffee' + '0'.repeat(58), pesan: 'Tidak ada dokumen terbit dengan isi file ini. File mungkin diubah setelah diterbitkan, atau bukan terbitan SIAKAD.', dokumen: null } };
});
tambahRute(/^\/v1\/dokumen\/(krs|khs|transkrip|kwitansi|surat-keluar|buat)$/, (u, init) => {
  const b = json(init);
  if (b.keluaran === 'pdf') return contohPdf();
  const jenis = u.pathname.split('/').pop()!.replace('-', '_');
  const k = kodeBaru();
  const nama: Record<string, string> = { krs: 'Kartu Rencana Studi', khs: 'Kartu Hasil Studi', transkrip: 'Transkrip Nilai', kwitansi: 'Kwitansi', surat_keluar: 'Surat Keluar', buat: 'Dokumen' };
  const d: Terbit = {
    id: `d-${Date.now()}`, kode_verifikasi: k, url_verifikasi: url(k), jenis, jenis_nama: nama[jenis] ?? jenis, judul: String(b.judul ?? `${nama[jenis] ?? 'Dokumen'} ${b.nim ?? ''}`.trim()), nomor: null,
    bagian: String(b.bagian ?? '55201'), bagian_nama: UNIT[String(b.bagian ?? '55201')]?.nama ?? 'Prodi Informatika', pemilik: String(b.nim ?? '2301010001'), pemilik_nama: 'Nur Aisyah Hasan',
    ringkasan: {}, sha256: Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''), ukuran: 26521, halaman: 1, status: 'sah',
    alasan_batal: null, dibatalkan_at: null, kedaluwarsa_at: null, diterbitkan_at: sekarang(),
  };
  TERBIT.unshift(d);
  return { __status: 201, data: d };
});
tambahRute(/^\/v1\/dokumen\/terbit$/, (u) => {
  const q = (u.searchParams.get('q') ?? '').toLowerCase();
  const jenis = u.searchParams.get('jenis');
  const rows = TERBIT.filter((d) => (!jenis || d.jenis === jenis) && (!q || `${d.judul} ${d.nomor} ${d.pemilik_nama} ${d.kode_verifikasi}`.toLowerCase().includes(q)));
  return { data: rows, meta: { total: rows.length, page: 1, per_page: 50 } };
});
tambahRute(/^\/v1\/dokumen\/terbit\/[^/]+\/(unduh|batal)$/, (u, init) => {
  const [, , , , id, aksi] = u.pathname.split('/');
  const d = TERBIT.find((x) => x.id === id);
  if (!d) return { __status: 404, error: { code: 'not_found', message: 'Dokumen tidak ditemukan.' } };
  if (aksi === 'unduh') return contohPdf();
  Object.assign(d, { status: 'dibatalkan', alasan_batal: String(json(init).alasan ?? ''), dibatalkan_at: sekarang() });
  return { data: d };
});

const BAWAAN = {
  kertas: 'A4', orientasi: 'potret', margin: { atas: 15, kanan: 20, bawah: 18, kiri: 25 }, font: 'helvetica', ukuran_font: 10.5, warna_utama: '#0f3d5e',
  kop: {
    tampil: true, perataan: 'tengah', logo: 'kampus', logo_berkas_id: null, logo_kanan_berkas_id: null, gambar_berkas_id: null,
    baris: [{ teks: '{nama_pt}', ukuran: 15, tebal: true }, { teks: '{nama_unit}', ukuran: 12.5, tebal: true }],
    alamat: '{alamat_unit}', kontak: 'Telp. {telepon_unit} · {email_unit} · {website_pt}', garis: 'tebal_tipis', warna_garis: '#000000', tinggi_logo: 22, semua_halaman: false,
  },
  judul: { ukuran: 13, huruf_besar: true, garis_bawah: true },
  ttd: { tampil: true, posisi: 'kanan', kota: '{kota}', jabatan: null, nama: null, nip: null, label_nip: 'NIP/NIDN', gambar_berkas_id: null, stempel_berkas_id: null },
  kaki: { teks: '{nama_pt} · {alamat_pt}', nomor_halaman: true, waktu_cetak: true },
  qr: { posisi: 'ttd', ukuran: 24, gaya: 'dokumen', teks: 'Pindai untuk memeriksa keaslian dokumen ini' },
  tanda_air: { teks: null, opasitas: 0.07 },
  bagian_penerbit: null,
};
const TEMPLAT: Array<{ id: string; nama: string; jenis: string | null; bagian: string | null; pengaturan: Record<string, unknown>; aktif: boolean }> = [
  { id: 't-ft', nama: 'Templat Fakultas Teknik', jenis: null, bagian: 'ft', aktif: true, pengaturan: { warna_utama: '#7c2d12', kop: { garis: 'ganda' }, ttd: { jabatan: 'Dekan', nama: 'Dr. Ir. Rahmat Lamato, M.T.', nip: '0912057801' } } },
];
tambahRute(/^\/v1\/dokumen\/templat\/efektif$/, (u) => ({
  data: { jenis: u.searchParams.get('jenis') ?? 'umum', bagian: u.searchParams.get('bagian'), pengaturan: BAWAAN, lapis: [{ sumber: 'bawaan' }], data: { nama_pt: 'Universitas Pohuwato', kota: 'Marisa' } },
}));
tambahRute(/^\/v1\/dokumen\/templat\/pratinjau$/, () => contohPdf());
tambahRute(/^\/v1\/dokumen\/templat$/, (u, init) => {
  if (init?.method === 'POST') {
    const b = json(init);
    const t = { id: `t-${Date.now()}`, nama: String(b.nama), jenis: (b.jenis as string) ?? null, bagian: (b.bagian as string) ?? null, pengaturan: (b.pengaturan as Record<string, unknown>) ?? {}, aktif: true };
    TEMPLAT.push(t);
    return { __status: 201, data: { ...t, bagian_nama: t.bagian ? UNIT[t.bagian]?.nama : 'Kampus (semua bagian)' } };
  }
  const bagian = u.searchParams.get('bagian');
  return { data: { templat: TEMPLAT.filter((t) => !bagian || t.bagian === bagian).map((t) => ({ ...t, bagian_nama: t.bagian ? UNIT[t.bagian]?.nama : 'Kampus (semua bagian)' })), tersedia: true } };
});
tambahRute(/^\/v1\/dokumen\/templat\/(?!efektif$|pratinjau$)[^/]+$/, (u, init) => {
  const id = u.pathname.split('/').pop();
  const t = TEMPLAT.find((x) => x.id === id);
  if (!t) return { __status: 404, error: { code: 'not_found', message: 'Templat tidak ditemukan.' } };
  if (init?.method === 'POST') Object.assign(t, { pengaturan: json(init).pengaturan ?? t.pengaturan });
  return { data: { ...t, bagian_nama: t.bagian ? UNIT[t.bagian]?.nama : 'Kampus (semua bagian)' } };
});
