import { tambahRute } from './siakad';

/**
 * Berkas terpusat tiruan (/v1/berkas) untuk PilihBerkas, UnggahBerkas, lampiran katalog, dan ManajerBerkas
 * (folder, pindah, hapus ke sampah). Aturan folder mengikuti app/Modules/Berkas/Services/Folder.php.
 */
interface B {
  id: string;
  nama: string;
  ekstensi: string;
  mime: string;
  ukuran: number;
  status: 'tersedia';
  kategori: string;
  folder: string | null;
  modul: string | null;
  keterangan: string | null;
  jumlah_unduh: number;
  dibuat_at: string;
  url?: string;
  unit: string | null;
  periode: string | null;
  terenkripsi: boolean;
}
const uuid = () => '6f1c2d3e-xxxx-4xxx-9xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  txt: 'text/plain',
};
let hari = 0;
const b = (nama: string, ukuran: number, kategori: string, folder: string | null = null): B => {
  const ekstensi = (nama.split('.').pop() ?? '').toLowerCase();
  const t = new Date(Date.UTC(2026, 10, 14, 9, 0) - hari++ * 86_400_000 * 1.7);
  return {
    id: uuid(),
    nama,
    ekstensi,
    mime: MIME[ekstensi] ?? 'application/octet-stream',
    ukuran,
    status: 'tersedia',
    kategori,
    folder,
    modul: null,
    keterangan: null,
    jumlah_unduh: Math.floor(Math.random() * 12),
    dibuat_at: t.toISOString().slice(0, 19).replace('T', ' '),
    url: '#',
    unit: null,
    periode: hari > 14 ? '20242' : '20251',
    terenkripsi: false,
  };
};
let BERKAS: B[] = [
  b('SK Rektor tentang kalender akademik 2026.pdf', 412_000, 'dokumen', 'Surat Keputusan'),
  b('Surat undangan rapat senat.pdf', 188_400, 'dokumen', 'Surat Masuk/2026'),
  b('Ijazah S2 - Dr. Rahmawati.pdf', 1_120_000, 'dokumen', 'Kepegawaian/Ijazah'),
  b('Sertifikat pendidik dosen.pdf', 640_000, 'dokumen', 'Kepegawaian'),
  b('Laporan AMI prodi Informatika 2026.docx', 2_350_000, 'lampiran', 'Akreditasi'),
  b('Rekap presensi Oktober.xlsx', 96_000, 'lampiran'),
  b('Pas foto 4x6.jpg', 210_000, 'foto'),
  b('Bukti bayar UKT semester ganjil.png', 380_000, 'lampiran'),
  b('Undangan wisuda ke-12.pdf', 233_000, 'dokumen', 'Surat Masuk/2026'),
  b('Permohonan narasumber seminar.docx', 74_000, 'dokumen', 'Surat Masuk/2026'),
  b('Balasan kerja sama Dinas Pendidikan.pdf', 301_000, 'dokumen', 'Surat Keluar'),
  b('Foto kegiatan PKKMB 01.jpg', 2_840_000, 'foto', 'Dokumentasi/PKKMB 2026'),
  b('Foto kegiatan PKKMB 02.jpg', 3_120_000, 'foto', 'Dokumentasi/PKKMB 2026'),
  b('Foto kegiatan PKKMB 03.png', 1_460_000, 'foto', 'Dokumentasi/PKKMB 2026'),
  b('Video profil kampus.mp4', 48_200_000, 'lampiran', 'Dokumentasi'),
  b('Materi sosialisasi OBE.pptx', 5_600_000, 'lampiran', 'Akreditasi'),
  b('Borang LKPS 2026.xlsx', 820_000, 'lampiran', 'Akreditasi/LKPS'),
  b('Data dukung kriteria 9.zip', 18_400_000, 'lampiran', 'Akreditasi/LKPS'),
  b('Rekaman rapat pimpinan.mp3', 12_800_000, 'lampiran', 'Notulen'),
  b('Notulen rapat pimpinan 3 November.docx', 58_000, 'dokumen', 'Notulen'),
  b('Catatan.txt', 1_200, 'lampiran'),
];
const SAMPAH: B[] = [];
interface F {
  path: string;
  warna: string | null;
  dibuat_at: string;
}
let FOLDER: F[] = [
  { path: 'Surat Masuk', warna: 'biru', dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Surat Masuk/2026', warna: null, dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Surat Keluar', warna: 'teal', dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Akreditasi', warna: 'ungu', dibuat_at: '2026-10-02 08:00:00' },
  { path: 'Draf', warna: 'abu', dibuat_at: '2026-11-10 08:00:00' },
];

// ---------------------------------------------------------------- ruang: pribadi, unit, folder yang dibagikan
const unitB = (unit: string, nama: string, ukuran: number, folder: string | null, periode: string, terenkripsi = false): B => ({ ...b(nama, ukuran, 'dokumen', folder), unit, periode, terenkripsi });
const RUANG: Record<string, { berkas: B[]; folder: F[] }> = {
  u: { berkas: BERKAS, folder: FOLDER },
  'n:bauk': {
    berkas: [
      unitB('bauk', 'Laporan realisasi anggaran Oktober.xlsx', 410_000, 'Laporan Keuangan', '20251', true),
      unitB('bauk', 'Rekap pembayaran UKT ganjil.xlsx', 1_250_000, 'Tagihan', '20251', true),
      unitB('bauk', 'SK honor dosen luar biasa.pdf', 288_000, 'SK', '20251', true),
      unitB('bauk', 'Laporan realisasi anggaran Mei.xlsx', 380_000, 'Laporan Keuangan', '20242', true),
      unitB('bauk', 'Rekap pembayaran UKT genap.xlsx', 1_090_000, 'Tagihan', '20242', true),
      unitB('bauk', 'Template kuitansi.docx', 42_000, null, '20251', true),
    ],
    folder: [{ path: 'Laporan Keuangan', warna: 'hijau', dibuat_at: '2026-08-01 08:00:00' }],
  },
  'n:lpm': {
    berkas: [unitB('lpm', 'Instrumen AMI 2026.docx', 520_000, 'Akreditasi', '20251'), unitB('lpm', 'Jadwal AMI.pdf', 160_000, 'Akreditasi/Jadwal', '20251')],
    folder: [],
  },
};
const KEBIJAKAN: Record<string, string> = { global: 'opsional', 'unit:bauk': 'wajib' };
interface Bagi {
  id: string;
  berkas_id?: string;
  path?: string;
  ruang?: string;
  ke_jenis: 'pengguna' | 'unit' | 'tautan';
  ke: string | null;
  izin: 'lihat' | 'ubah';
  sandi: boolean;
  kedaluwarsa_at: string | null;
  pesan: string | null;
  dibuat_oleh: string;
  masuk: boolean;
}
const BAGI: Bagi[] = [
  { id: uuid(), path: 'Akreditasi', ruang: 'n:lpm', ke_jenis: 'pengguna', ke: 'demo', izin: 'lihat', sandi: false, kedaluwarsa_at: null, pesan: 'Bahan AMI', dibuat_oleh: 'kepala.lpm', masuk: true },
];
/** Pilih ruang dari parameter `unit` / `bagi` (body atau query). */
function pakai(u: URL, d: Record<string, unknown> = {}) {
  const bagi = (d.bagi as string) || u.searchParams.get('bagi');
  const unit = (d.unit as string) || u.searchParams.get('unit');
  const sh = bagi ? BAGI.find((x) => x.id === bagi) : undefined;
  const kunci = sh?.ruang ?? (unit ? `n:${unit}` : 'u');
  RUANG[kunci] ??= { berkas: [], folder: [] };
  BERKAS = RUANG[kunci].berkas;
  FOLDER = RUANG[kunci].folder;
  return { kunci, unit: kunci.startsWith('n:') ? kunci.slice(2) : null, batas: sh?.path ?? null, akses: sh ? 'bagi' : unit ? 'kelola' : 'pemilik' };
}
/** Cari berkas di semua ruang (untuk rute per id). */
function cariDiMana(id: string): { x: B; daftar: B[] } | null {
  for (const r of Object.values(RUANG)) {
    const x = r.berkas.find((y) => y.id === id);
    if (x) return { x, daftar: r.berkas };
  }
  return null;
}

const galat = (status: number, code: string, message: string, details?: unknown) => ({ __status: status, error: { code, message, details } });
const SEGMEN = /^[\p{L}\p{N}][\p{L}\p{N} ._()&,+-]*$/u;
const normal = (v: unknown): string | null | { salah: string } => {
  if (v === null || v === undefined || v === '' || v === '/') return null;
  const seg = String(v)
    .replace(/^[/ ]+|[/ ]+$/g, '')
    .split('/')
    .map((s) => s.replace(/\s+/g, ' ').trim());
  const p = seg.join('/');
  if (p.length > 150 || seg.some((s) => !s || s.length > 60 || s.startsWith('.') || !SEGMEN.test(s))) return { salah: 'nama folder 1-60 karakter (huruf, angka, spasi, . _ - ( ) & , +) dipisah /' };
  return p;
};
const sama = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const dalam = (p: string | null, akar: string) => p !== null && (sama(p, akar) || p.toLowerCase().startsWith(`${akar.toLowerCase()}/`));
const induk = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : null);
const ada = (p: string) => FOLDER.some((f) => dalam(f.path, p)) || BERKAS.some((x) => dalam(x.folder, p));
const sekarang = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const tambahFolder = (p: string, warna: string | null = null) => {
  for (let x: string | null = p; x; x = induk(x)) if (!FOLDER.some((f) => sama(f.path, x!))) FOLDER.push({ path: x, warna: x === p ? warna : null, dibuat_at: sekarang() });
};
const JENIS: Record<string, string[]> = {
  gambar: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  pdf: ['pdf'],
  dokumen: ['doc', 'docx', 'odt', 'rtf', 'txt', 'md'],
  spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
  presentasi: ['ppt', 'pptx', 'odp'],
  arsip: ['zip', 'rar', '7z'],
  video: ['mp4', 'webm', 'mov'],
  audio: ['mp3', 'wav', 'ogg', 'm4a'],
};

async function bacaBody(init?: RequestInit): Promise<Record<string, unknown>> {
  if (!init?.body) return {};
  if (init.body instanceof FormData) return Object.fromEntries(init.body.entries());
  try {
    return JSON.parse(String(init.body));
  } catch {
    return {};
  }
}

/** Gambar mini tiruan (SVG warna) supaya pratinjau dan kartu gambar tampak hidup. */
function gambarTiruan(x: B) {
  const hue = [...x.nama].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 38%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="470" cy="150" r="60" fill="rgba(255,255,255,.55)"/><path d="M0 400 L180 240 L320 360 L430 280 L640 430 L640 480 L0 480Z" fill="rgba(0,0,0,.28)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

tambahRute(/^\/v1\/berkas\/info$/, () => ({
  data: {
    maks_byte: 50 * 1024 * 1024,
    maks_mb: 50,
    batas_sekali_unggah_byte: 8 * 1024 * 1024,
    ukuran_potongan: 2 * 1024 * 1024,
    ekstensi: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'pptx', 'zip', 'mp4', 'mp3', 'txt'],
    penyimpanan: { driver: 'r2', kode: 'r2', nama: 'Cloudflare R2' },
  },
}));

// ---------------------------------------------------------------- folder
tambahRute(/^\/v1\/berkas\/folder$/, async (u, init) => {
  if (init?.method === 'POST') {
    const d = await bacaBody(init);
    pakai(u, d);
    const ind = normal(d.induk);
    if (ind && typeof ind === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { induk: ind.salah });
    const nama = String(d.nama ?? '').trim();
    const p = nama.includes('/') ? { salah: 'tanpa /' } : normal(ind ? `${ind}/${nama}` : nama);
    if (!p || typeof p === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { nama: p && typeof p === 'object' ? p.salah : 'wajib' });
    if (ada(p)) return galat(409, 'folder_sudah_ada', `Folder "${p}" sudah ada.`);
    tambahFolder(p, (d.warna as string) || null);
    return { __status: 201, data: daftar().folder.find((f) => f.path === p) };
  }
  const r = pakai(u);
  const dft = daftar();
  if (r.batas) dft.folder = dft.folder.filter((f) => dalam(f.path, r.batas!));
  return { data: { ...dft, ruang: { kode: r.kunci, unit: r.unit, akses: r.akses, batas: r.batas, periode: u.searchParams.get('periode') } } };
});
tambahRute(/^\/v1\/berkas\/folder\/ubah$/, async (u, init) => {
  const d = await bacaBody(init);
  pakai(u, d);
  const lama = normal(d.path);
  if (!lama || typeof lama === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { path: 'wajib' });
  if (!ada(lama)) return galat(404, 'not_found', 'Folder tidak ditemukan.');
  const ind = 'induk_baru' in d ? normal(d.induk_baru) : induk(lama);
  if (ind && typeof ind === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { induk_baru: ind.salah });
  const nama = String(d.nama || lama.slice(lama.lastIndexOf('/') + 1)).trim();
  const baru = normal(ind ? `${ind}/${nama}` : nama);
  if (!baru || typeof baru === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { nama: baru && typeof baru === 'object' ? baru.salah : 'wajib' });
  if (baru !== lama && `${baru}/`.toLowerCase().startsWith(`${lama}/`.toLowerCase()))
    return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { path_baru: 'folder tidak bisa dipindah ke dalam dirinya sendiri' });
  if (!sama(baru, lama) && ada(baru)) return galat(409, 'folder_sudah_ada', `Folder "${baru}" sudah ada.`);
  tambahFolder(lama);
  const ganti = (p: string) => baru + p.slice(lama.length);
  let n = 0;
  BERKAS.forEach((x) => {
    if (dalam(x.folder, lama)) {
      x.folder = ganti(x.folder!);
      n++;
    }
  });
  FOLDER.forEach((f) => {
    if (dalam(f.path, lama)) f.path = ganti(f.path);
  });
  if ('warna' in d) FOLDER.find((f) => f.path === baru)!.warna = (d.warna as string) || null;
  if (induk(baru)) tambahFolder(induk(baru)!);
  return { data: { ...daftar().folder.find((f) => f.path === baru), berkas_dipindah: n } };
});
tambahRute(/^\/v1\/berkas\/folder\/hapus$/, async (u, init) => {
  const d = await bacaBody(init);
  pakai(u, d);
  const p = normal(d.path);
  if (!p || typeof p === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { path: 'wajib' });
  if (!ada(p)) return galat(404, 'not_found', 'Folder tidak ditemukan.');
  const isi = BERKAS.filter((x) => dalam(x.folder, p));
  if (isi.length && !d.isi) return galat(409, 'folder_berisi', `Folder masih berisi ${isi.length} berkas. Kirim isi=1 untuk ikut memindahkan berkasnya ke sampah.`, { jumlah_berkas: isi.length });
  isi.forEach((x) => SAMPAH.push(...BERKAS.splice(BERKAS.indexOf(x), 1)));
  const sebelum = FOLDER.length;
  for (let i = FOLDER.length - 1; i >= 0; i--) if (dalam(FOLDER[i].path, p)) FOLDER.splice(i, 1);
  return { data: { path: p, berkas_dihapus: isi.length, folder_dihapus: sebelum - FOLDER.length } };
});
function daftar() {
  const isi = new Map<string, { n: number; b: number; t: string }>();
  BERKAS.forEach((x) => {
    const k = x.folder ?? '';
    const v = isi.get(k) ?? { n: 0, b: 0, t: '' };
    isi.set(k, { n: v.n + 1, b: v.b + x.ukuran, t: x.dibuat_at > v.t ? x.dibuat_at : v.t });
  });
  const semua = new Set<string>();
  [...FOLDER.map((f) => f.path), ...[...isi.keys()].filter(Boolean)].forEach((p) => {
    for (let x: string | null = p; x; x = induk(x)) semua.add(x);
  });
  const folder = [...semua]
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
    .map((path) => {
      const f = FOLDER.find((x) => x.path === path);
      const turunan = BERKAS.filter((x) => dalam(x.folder, path));
      return {
        path,
        nama: path.slice(path.lastIndexOf('/') + 1),
        induk: induk(path),
        jumlah_berkas: isi.get(path)?.n ?? 0,
        ukuran: isi.get(path)?.b ?? 0,
        total_berkas: turunan.length,
        total_ukuran: turunan.reduce((a, x) => a + x.ukuran, 0),
        jumlah_subfolder: [...semua].filter((x) => induk(x) === path).length,
        warna: f?.warna ?? null,
        dibuat_at: f?.dibuat_at ?? null,
        terakhir_isi_at: isi.get(path)?.t ?? null,
      };
    });
  return {
    akar: {
      jumlah_berkas: isi.get('')?.n ?? 0,
      ukuran: isi.get('')?.b ?? 0,
      total_berkas: BERKAS.length,
      total_ukuran: BERKAS.reduce((a, x) => a + x.ukuran, 0),
      jumlah_subfolder: folder.filter((f) => !f.induk).length,
    },
    folder,
  };
}

// ---------------------------------------------------------------- banyak berkas
tambahRute(/^\/v1\/berkas\/pindah$/, async (_u, init) => {
  const d = await bacaBody(init);
  const f = normal(d.folder);
  if (f && typeof f === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: f.salah });
  const ok: string[] = [];
  const gagal: Array<{ id: string; kode: string; pesan: string }> = [];
  const tujuan = 'tujuan_unit' in d ? (d.tujuan_unit ? `n:${d.tujuan_unit}` : 'u') : null;
  for (const id of (d.id as string[]) ?? []) {
    const c = cariDiMana(id);
    if (!c) gagal.push({ id, kode: 'not_found', pesan: 'Berkas tidak ditemukan.' });
    else {
      c.x.folder = f;
      if (tujuan) {
        c.daftar.splice(c.daftar.indexOf(c.x), 1);
        RUANG[tujuan] ??= { berkas: [], folder: [] };
        c.x.unit = tujuan.startsWith('n:') ? tujuan.slice(2) : null;
        RUANG[tujuan].berkas.unshift(c.x);
      }
      ok.push(id);
    }
  }
  return { data: { folder: f, dipindah: ok, gagal } };
});
tambahRute(/^\/v1\/berkas\/hapus-banyak$/, async (_u, init) => {
  const d = await bacaBody(init);
  const ok: string[] = [];
  const gagal: Array<{ id: string; kode: string; pesan: string }> = [];
  for (const id of (d.id as string[]) ?? []) {
    const c = cariDiMana(id);
    if (!c) gagal.push({ id, kode: 'not_found', pesan: 'Berkas tidak ditemukan.' });
    else if (/ijazah/i.test(c.x.nama)) gagal.push({ id, kode: 'berkas_dipakai', pesan: `${c.x.nama} masih dipakai data Kepegawaian.` });
    else {
      SAMPAH.push(...c.daftar.splice(c.daftar.indexOf(c.x), 1));
      ok.push(id);
    }
  }
  return { data: { dihapus: ok, gagal } };
});

// ---------------------------------------------------------------- satu berkas
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/url$/, (u) => {
  const x = cariDiMana(u.pathname.split('/')[3])?.x;
  if (!x) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  const url = x.mime.startsWith('image/') ? gambarTiruan(x) : x.ekstensi === 'txt' ? `data:text/plain;charset=utf-8,${encodeURIComponent('Catatan contoh dari berkas tiruan.')}` : 'about:blank';
  return { data: { url, kedaluwarsa_at: sekarang() } };
});
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/ubah$/, async (u, init) => {
  const x = cariDiMana(u.pathname.split('/')[3])?.x;
  if (!x) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  const d = await bacaBody(init);
  if (typeof d.nama === 'string') {
    if (d.nama.split('.').pop()?.toLowerCase() !== x.ekstensi)
      return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { nama: `nama file dengan ekstensi yang sama (.${x.ekstensi})` });
    x.nama = d.nama;
  }
  if ('folder' in d) {
    const f = normal(d.folder);
    if (f && typeof f === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: f.salah });
    x.folder = f;
  }
  if (typeof d.keterangan === 'string') x.keterangan = d.keterangan;
  if (typeof d.periode === 'string') x.periode = d.periode === 'tanpa' ? null : d.periode;
  return { data: x };
});
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}$/, (u) => {
  const x = cariDiMana(u.pathname.split('/').pop()!)?.x;
  return x ? { data: x } : galat(404, 'not_found', 'Berkas tidak ditemukan.');
});
tambahRute(/^\/v1\/berkas$/, async (u, init) => {
  if (init?.method === 'POST') {
    const d = await bacaBody(init);
    const r = pakai(u, d);
    const f = d.berkas instanceof File ? d.berkas : null;
    const folder = normal(d.folder);
    if (folder && typeof folder === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: folder.salah });
    const baru = b(f?.name ?? 'berkas.pdf', f?.size ?? 1000, String(d.kategori ?? 'dokumen'), folder);
    baru.dibuat_at = sekarang();
    if (typeof d.modul === 'string') baru.modul = d.modul;
    baru.unit = r.unit;
    baru.periode = typeof d.periode === 'string' ? (d.periode === 'tanpa' ? null : d.periode) : '20251';
    baru.terenkripsi = KEBIJAKAN.global !== 'mati' && (d.enkripsi === '1' || efektif(r.unit) === 'wajib');
    BERKAS.unshift(baru);
    return { __status: 201, data: baru };
  }
  const ru = pakai(u);
  const p = u.searchParams;
  const per0 = p.get('periode');
  const q = (p.get('q') ?? '').toLowerCase();
  const kat = p.get('kategori');
  const fol = p.get('folder');
  const dlm = p.get('dalam');
  const jenis = (p.get('jenis') ?? '').split(',').filter(Boolean);
  const ext = jenis.flatMap((j) => JENIS[j] ?? []);
  const rows = BERKAS.filter(
    (r) =>
      (!q || r.nama.toLowerCase().includes(q)) &&
      (!kat || r.kategori === kat) &&
      (fol === null || (fol === '/' ? !r.folder : r.folder !== null && sama(r.folder, fol))) &&
      (!dlm || dalam(r.folder, dlm)) &&
      (!ext.length || ext.includes(r.ekstensi)) &&
      (!per0 || (per0 === 'tanpa' ? !r.periode : r.periode === per0)) &&
      (!ru.batas || dalam(r.folder, ru.batas)),
  );
  const urut = p.get('urut') ?? 'baru';
  const banding: Record<string, (a: B, b: B) => number> = {
    baru: (a, b) => b.dibuat_at.localeCompare(a.dibuat_at),
    lama: (a, b) => a.dibuat_at.localeCompare(b.dibuat_at),
    nama: (a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }),
    '-nama': (a, b) => b.nama.localeCompare(a.nama, 'id', { numeric: true }),
    ukuran: (a, b) => a.ukuran - b.ukuran,
    '-ukuran': (a, b) => b.ukuran - a.ukuran,
  };
  rows.sort(banding[urut] ?? banding.baru);
  const per = Number(p.get('per_page') ?? 20);
  const page = Number(p.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
});

// ---------------------------------------------------------------- unggah bertahap (file di atas 8 MB)
const SESI = new Map<string, { b: B; jumlah: number }>();
tambahRute(/^\/v1\/berkas\/bertahap$/, async (u, init) => {
  const d = await bacaBody(init);
  const r = pakai(u, d);
  const folder = normal(d.folder);
  if (folder && typeof folder === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: folder.salah });
  const x = b(String(d.nama ?? 'berkas.bin'), Number(d.ukuran ?? 0), String(d.kategori ?? 'dokumen'), folder);
  x.dibuat_at = sekarang();
  x.unit = r.unit;
  x.terenkripsi = d.enkripsi === '1' || efektif(r.unit) === 'wajib';
  const ukuran = 2 * 1024 * 1024;
  const jumlah = Math.max(1, Math.ceil(x.ukuran / ukuran));
  SESI.set(x.id, { b: x, jumlah });
  return { __status: 201, data: { ...x, status: 'mengunggah', sesi: { ukuran_potongan: ukuran, jumlah_potongan: jumlah, diterima: [] } } };
});
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/potongan\/\d+$/, (u) => ({ data: { id: u.pathname.split('/')[3], ke: Number(u.pathname.split('/').pop()) } }));
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/selesai$/, (u) => {
  const s = SESI.get(u.pathname.split('/')[3]);
  if (!s) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  SESI.delete(s.b.id);
  (RUANG[s.b.unit ? `n:${s.b.unit}` : 'u'] ??= { berkas: [], folder: [] }).berkas.unshift(s.b);
  return { data: s.b };
});

// ---------------------------------------------------------------- unit, periode, salin, berbagi, enkripsi (SIAKAD 2026-11)
const UNIT = [
  { kode: 'bauk', nama: 'Biro Administrasi Umum dan Keuangan', singkatan: 'BAUK', jenis: 'unit', aplikasi: 'bauk', akses: 'kelola' as const },
  { kode: 'baak', nama: 'Biro Administrasi Akademik', singkatan: 'BAAK', jenis: 'unit', aplikasi: 'baak', akses: 'anggota' as const },
];
const SEMUA_UNIT = [
  ...UNIT,
  { kode: 'sdm', nama: 'Biro Sumber Daya Manusia', singkatan: 'SDM', jenis: 'unit' },
  { kode: 'lpm', nama: 'Lembaga Penjaminan Mutu', singkatan: 'LPM', jenis: 'unit' },
  { kode: 'pmb', nama: 'Panitia Penerimaan Mahasiswa Baru', singkatan: 'PMB', jenis: 'unit' },
  { kode: 'fak-teknik', nama: 'Fakultas Teknik', singkatan: 'FT', jenis: 'fakultas' },
];
function efektif(unit: string | null) {
  const g = KEBIJAKAN.global ?? 'opsional';
  const un = unit ? (KEBIJAKAN[`unit:${unit}`] ?? 'opsional') : null;
  const pg = unit ? null : (KEBIJAKAN['pengguna:demo'] ?? 'opsional');
  return g === 'mati' ? 'mati' : [g, un, pg].includes('wajib') ? 'wajib' : 'opsional';
}
const NAMA_PERIODE: Record<string, string> = { '20251': '2025/2026 Ganjil', '20242': '2024/2025 Genap' };
tambahRute(/^\/v1\/berkas\/unit$/, (u) => ({
  data: { unit: UNIT.map((x) => ({ ...x, enkripsi: efektif(x.kode) })), ...(u.searchParams.get('semua') ? { semua: SEMUA_UNIT.map(({ kode, nama, singkatan, jenis }) => ({ kode, nama, singkatan, jenis })) } : {}) },
}));
tambahRute(/^\/v1\/berkas\/periode$/, (u) => {
  pakai(u);
  const hit = new Map<string, { n: number; b: number }>();
  BERKAS.forEach((x) => {
    const k = x.periode ?? 'tanpa';
    const v = hit.get(k) ?? { n: 0, b: 0 };
    hit.set(k, { n: v.n + 1, b: v.b + x.ukuran });
  });
  hit.set('20251', hit.get('20251') ?? { n: 0, b: 0 });
  const kode = [...hit.keys()].filter((k) => k !== 'tanpa').sort().reverse();
  return {
    data: {
      aktif: '20251',
      periode: [...kode, ...(hit.has('tanpa') ? ['tanpa'] : [])].map((k) => ({
        periode: k,
        nama: k === 'tanpa' ? 'Tanpa periode' : (NAMA_PERIODE[k] ?? k),
        tahun: k === 'tanpa' ? null : k.slice(0, 4),
        semester: k === 'tanpa' ? null : k.slice(4),
        aktif: k === '20251',
        jumlah_berkas: hit.get(k)!.n,
        ukuran: hit.get(k)!.b,
      })),
    },
  };
});
const namaSalinan = (daftar: B[], nama: string, folder: string | null) => {
  if (!daftar.some((x) => x.nama === nama && x.folder === folder)) return nama;
  const i = nama.lastIndexOf('.');
  return `${nama.slice(0, i)} (salinan)${nama.slice(i)}`;
};
tambahRute(/^\/v1\/berkas\/salin$/, async (_u, init) => {
  const d = await bacaBody(init);
  const f = normal(d.folder);
  if (f && typeof f === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: f.salah });
  const disalin: B[] = [];
  const gagal: Array<{ id: string; kode: string; pesan: string }> = [];
  for (const id of (d.id as string[]) ?? []) {
    const c = cariDiMana(id);
    if (!c) {
      gagal.push({ id, kode: 'not_found', pesan: 'Berkas tidak ditemukan.' });
      continue;
    }
    const kunci = 'tujuan_unit' in d ? (d.tujuan_unit ? `n:${d.tujuan_unit}` : 'u') : c.x.unit ? `n:${c.x.unit}` : 'u';
    const tujuan = (RUANG[kunci] ??= { berkas: [], folder: [] }).berkas;
    const baru = { ...c.x, id: uuid(), folder: f, nama: namaSalinan(tujuan, c.x.nama, f), unit: kunci.startsWith('n:') ? kunci.slice(2) : null, dibuat_at: sekarang() };
    tujuan.unshift(baru);
    disalin.push(baru);
  }
  return { __status: 201, data: { folder: f, disalin, gagal } };
});
tambahRute(/^\/v1\/berkas\/folder\/salin$/, async (u, init) => {
  const d = await bacaBody(init);
  pakai(u, d);
  const p = normal(d.path);
  if (!p || typeof p === 'object' || !ada(p)) return galat(404, 'not_found', 'Folder tidak ditemukan.');
  const ind = normal(d.induk_baru);
  const isi = BERKAS.filter((x) => dalam(x.folder, p));
  const sub = FOLDER.filter((x) => dalam(x.path, p));
  const kunci = 'tujuan_unit' in d ? (d.tujuan_unit ? `n:${d.tujuan_unit}` : 'u') : null;
  if (kunci) {
    BERKAS = (RUANG[kunci] ??= { berkas: [], folder: [] }).berkas;
    FOLDER = RUANG[kunci].folder;
  }
  const nama0 = p.slice(p.lastIndexOf('/') + 1);
  let nama = nama0;
  for (let i = 2; ada(ind && typeof ind === 'string' ? `${ind}/${nama}` : nama); i++) nama = `${nama0} (${i})`;
  const baru = ind && typeof ind === 'string' ? `${ind}/${nama}` : nama;
  tambahFolder(baru);
  sub.forEach((x) => tambahFolder(baru + x.path.slice(p.length), x.warna));
  isi.forEach((x) => BERKAS.unshift({ ...x, id: uuid(), folder: baru + x.folder!.slice(p.length), unit: kunci ? (kunci.startsWith('n:') ? kunci.slice(2) : null) : x.unit }));
  return { __status: 201, data: { path: baru, berkas_disalin: isi.length, folder_disalin: sub.length + 1 } };
});
const bentukBagi = (x: Bagi) => ({
  id: x.id,
  jenis: x.berkas_id ? 'berkas' : 'folder',
  folder: x.path ? { path: x.path, nama: x.path.slice(x.path.lastIndexOf('/') + 1), unit: x.ruang?.startsWith('n:') ? x.ruang.slice(2) : null } : undefined,
  ke_jenis: x.ke_jenis,
  ke: x.ke,
  ke_nama: x.ke_jenis === 'unit' ? SEMUA_UNIT.find((s) => s.kode === x.ke)?.nama : undefined,
  izin: x.izin,
  tautan: x.ke_jenis === 'tautan' ? `https://siakad.unipo.ac.id/api/v1/berkas/tautan/${x.id.replace(/-/g, '')}` : undefined,
  bersandi: x.sandi,
  kedaluwarsa_at: x.kedaluwarsa_at,
  pesan: x.pesan,
  jumlah_akses: x.ke_jenis === 'tautan' ? 3 : 0,
  dibuat_oleh: x.dibuat_oleh,
  berkas: x.berkas_id ? cariDiMana(x.berkas_id)?.x : undefined,
});
async function buatBagi(d: Record<string, unknown>, isi: Partial<Bagi>) {
  const jenis = d.ke_jenis as Bagi['ke_jenis'];
  if (!['pengguna', 'unit', 'tautan'].includes(jenis)) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { ke_jenis: 'pengguna, unit, atau tautan' });
  if (jenis !== 'tautan' && !d.ke) return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { ke: 'wajib' });
  const x: Bagi = {
    id: uuid(),
    ke_jenis: jenis,
    ke: jenis === 'tautan' ? null : String(d.ke),
    izin: d.izin === 'ubah' && jenis !== 'tautan' ? 'ubah' : 'lihat',
    sandi: Boolean(d.sandi),
    kedaluwarsa_at: (d.kedaluwarsa_at as string) || null,
    pesan: (d.pesan as string) || null,
    dibuat_oleh: 'demo',
    masuk: false,
    ...isi,
  };
  BAGI.unshift(x);
  return { __status: 201, data: bentukBagi(x) };
}
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/bagikan$/, async (u, init) => {
  const id = u.pathname.split('/')[3];
  if (!cariDiMana(id)) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  if (init?.method === 'POST') return buatBagi(await bacaBody(init), { berkas_id: id });
  return { data: { dibagikan: BAGI.filter((x) => x.berkas_id === id).map(bentukBagi) } };
});
tambahRute(/^\/v1\/berkas\/folder\/bagikan$/, async (u, init) => {
  const d = await bacaBody(init);
  const r = pakai(u, d);
  const path = String(d.path ?? u.searchParams.get('path') ?? '');
  if (init?.method === 'POST') return buatBagi(d, { path, ruang: r.kunci });
  return { data: { dibagikan: BAGI.filter((x) => x.path === path && x.ruang === r.kunci && !x.masuk).map(bentukBagi) } };
});
tambahRute(/^\/v1\/berkas\/bagikan\/[0-9a-f-]{36}\/cabut$/, (u) => {
  const i = BAGI.findIndex((x) => x.id === u.pathname.split('/')[4]);
  if (i >= 0) BAGI.splice(i, 1);
  return { data: { dicabut: true } };
});
tambahRute(/^\/v1\/berkas\/dibagikan$/, (u) => ({
  data: { dibagikan: BAGI.filter((x) => x.masuk === (u.searchParams.get('arah') !== 'keluar')).map(bentukBagi) },
}));
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/enkripsi$/, async (u, init) => {
  const c = cariDiMana(u.pathname.split('/')[3]);
  if (!c) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  const d = await bacaBody(init);
  const aktif = d.aktif !== false;
  if (!aktif && efektif(c.x.unit) === 'wajib') return galat(409, 'enkripsi_wajib', 'Kebijakan ruang ini mewajibkan enkripsi.');
  c.x.terenkripsi = aktif;
  return { data: c.x };
});
tambahRute(/^\/v1\/berkas\/kebijakan$/, async (u, init) => {
  if (init?.method === 'POST') {
    const d = await bacaBody(init);
    const k = d.lingkup === 'global' ? 'global' : d.lingkup === 'unit' ? `unit:${d.unit}` : 'pengguna:demo';
    KEBIJAKAN[k] = String(d.enkripsi);
    return { data: { tersimpan: true } };
  }
  const unit = u.searchParams.get('unit');
  return {
    data: {
      global: KEBIJAKAN.global,
      unit: unit ? (KEBIJAKAN[`unit:${unit}`] ?? 'opsional') : null,
      pengguna: unit ? null : (KEBIJAKAN['pengguna:demo'] ?? 'opsional'),
      efektif: efektif(unit),
      boleh_ubah: { global: true, unit: Boolean(unit && UNIT.find((x) => x.kode === unit)?.akses === 'kelola'), pengguna: !unit },
      semua: Object.entries(KEBIJAKAN).map(([k, v]) => ({ lingkup: k.split(':')[0], kunci: k.split(':')[1] ?? '', enkripsi: v, diubah_oleh: 'pustikom', updated_at: '2026-11-16 08:00:00' })),
    },
  };
});
