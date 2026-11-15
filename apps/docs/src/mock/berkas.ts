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
  };
};
const BERKAS: B[] = [
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
const FOLDER: F[] = [
  { path: 'Surat Masuk', warna: 'biru', dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Surat Masuk/2026', warna: null, dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Surat Keluar', warna: 'teal', dibuat_at: '2026-10-01 08:00:00' },
  { path: 'Akreditasi', warna: 'ungu', dibuat_at: '2026-10-02 08:00:00' },
  { path: 'Draf', warna: 'abu', dibuat_at: '2026-11-10 08:00:00' },
];

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
tambahRute(/^\/v1\/berkas\/folder$/, async (_u, init) => {
  if (init?.method === 'POST') {
    const d = await bacaBody(init);
    const ind = normal(d.induk);
    if (ind && typeof ind === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { induk: ind.salah });
    const nama = String(d.nama ?? '').trim();
    const p = nama.includes('/') ? { salah: 'tanpa /' } : normal(ind ? `${ind}/${nama}` : nama);
    if (!p || typeof p === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { nama: p && typeof p === 'object' ? p.salah : 'wajib' });
    if (ada(p)) return galat(409, 'folder_sudah_ada', `Folder "${p}" sudah ada.`);
    tambahFolder(p, (d.warna as string) || null);
    return { __status: 201, data: daftar().folder.find((f) => f.path === p) };
  }
  return { data: daftar() };
});
tambahRute(/^\/v1\/berkas\/folder\/ubah$/, async (_u, init) => {
  const d = await bacaBody(init);
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
tambahRute(/^\/v1\/berkas\/folder\/hapus$/, async (_u, init) => {
  const d = await bacaBody(init);
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
  for (const id of (d.id as string[]) ?? []) {
    const x = BERKAS.find((r) => r.id === id);
    if (!x) gagal.push({ id, kode: 'not_found', pesan: 'Berkas tidak ditemukan.' });
    else {
      x.folder = f;
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
    const i = BERKAS.findIndex((r) => r.id === id);
    if (i < 0) gagal.push({ id, kode: 'not_found', pesan: 'Berkas tidak ditemukan.' });
    else if (/ijazah/i.test(BERKAS[i].nama)) gagal.push({ id, kode: 'berkas_dipakai', pesan: `${BERKAS[i].nama} masih dipakai data Kepegawaian.` });
    else {
      SAMPAH.push(...BERKAS.splice(i, 1));
      ok.push(id);
    }
  }
  return { data: { dihapus: ok, gagal } };
});

// ---------------------------------------------------------------- satu berkas
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/url$/, (u) => {
  const x = BERKAS.find((r) => r.id === u.pathname.split('/')[3]);
  if (!x) return galat(404, 'not_found', 'Berkas tidak ditemukan.');
  const url = x.mime.startsWith('image/') ? gambarTiruan(x) : x.ekstensi === 'txt' ? `data:text/plain;charset=utf-8,${encodeURIComponent('Catatan contoh dari berkas tiruan.')}` : 'about:blank';
  return { data: { url, kedaluwarsa_at: sekarang() } };
});
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}\/ubah$/, async (u, init) => {
  const x = BERKAS.find((r) => r.id === u.pathname.split('/')[3]);
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
  return { data: x };
});
tambahRute(/^\/v1\/berkas\/[0-9a-f-]{36}$/, (u) => {
  const x = BERKAS.find((r) => r.id === u.pathname.split('/').pop());
  return x ? { data: x } : galat(404, 'not_found', 'Berkas tidak ditemukan.');
});
tambahRute(/^\/v1\/berkas$/, async (u, init) => {
  if (init?.method === 'POST') {
    const d = await bacaBody(init);
    const f = d.berkas instanceof File ? d.berkas : null;
    const folder = normal(d.folder);
    if (folder && typeof folder === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: folder.salah });
    const baru = b(f?.name ?? 'berkas.pdf', f?.size ?? 1000, String(d.kategori ?? 'dokumen'), folder);
    baru.dibuat_at = sekarang();
    if (typeof d.modul === 'string') baru.modul = d.modul;
    BERKAS.unshift(baru);
    return { __status: 201, data: baru };
  }
  const p = u.searchParams;
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
      (!ext.length || ext.includes(r.ekstensi)),
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
tambahRute(/^\/v1\/berkas\/bertahap$/, async (_u, init) => {
  const d = await bacaBody(init);
  const folder = normal(d.folder);
  if (folder && typeof folder === 'object') return galat(422, 'validation_failed', 'Data yang dikirim tidak valid.', { folder: folder.salah });
  const x = b(String(d.nama ?? 'berkas.bin'), Number(d.ukuran ?? 0), String(d.kategori ?? 'dokumen'), folder);
  x.dibuat_at = sekarang();
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
  BERKAS.unshift(s.b);
  return { data: s.b };
});
