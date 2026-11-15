import { tambahRute } from './siakad';

/** Unit arsip, jenis naskah, dan templat surat tiruan (/v1/arsip/unit, /jenis, /template). */
const UNIT = [
  { id: 1, induk_id: null, kode: 'UNIPO', jenis: 'universitas', nama: 'Universitas Pohuwato', singkatan: 'UNIPO', aktif: 1, peran_saya: 'pengawas' },
  { id: 2, induk_id: 1, kode: 'FT', jenis: 'fakultas', nama: 'Fakultas Teknik', singkatan: 'FT', aktif: 1, peran_saya: 'sekretaris' },
  { id: 3, induk_id: 2, kode: 'TI', jenis: 'prodi', nama: 'Program Studi Teknik Informatika', singkatan: 'TI', aktif: 1, peran_saya: 'admin' },
  { id: 4, induk_id: 1, kode: 'BAAK', jenis: 'unit', nama: 'Biro Administrasi Akademik dan Kemahasiswaan', singkatan: 'BAAK', aktif: 1, peran_saya: null },
  { id: 5, induk_id: 1, kode: 'LPPM', jenis: 'unit', nama: 'Lembaga Penelitian dan Pengabdian kepada Masyarakat', singkatan: 'LPPM', aktif: 1, peran_saya: null },
];

const JENIS = [
  { id: 1, kelompok: 'naskah', kode: 'UND', nama: 'Surat undangan' },
  { id: 2, kelompok: 'naskah', kode: 'ST', nama: 'Surat tugas' },
  { id: 3, kelompok: 'naskah', kode: 'KET', nama: 'Surat keterangan' },
  { id: 4, kelompok: 'naskah', kode: 'PB', nama: 'Surat pemberitahuan' },
];

let urut = 10;
const TEMPLAT = [
  {
    id: 1,
    unit_id: 2,
    jenis_id: 1,
    nama: 'Undangan rapat pimpinan',
    perihal: 'Undangan rapat',
    aktif: 1,
    keterangan: 'Rapat rutin pimpinan fakultas.',
    isi:
      '<p>Dengan hormat,</p><p>Bersama ini kami mengundang Bapak/Ibu untuk menghadiri rapat {{agenda}} yang akan dilaksanakan pada:</p>' +
      '<figure class="ub-tabel"><table><tr><td>Hari/tanggal</td><td>{{hari_tanggal}}</td></tr><tr><td>Waktu</td><td>{{waktu}}</td></tr><tr><td>Tempat</td><td>{{tempat}}</td></tr></table></figure>' +
      '<p>Mengingat pentingnya acara tersebut, kami mohon kehadiran Bapak/Ibu tepat waktu. Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>',
  },
  {
    id: 2,
    unit_id: 3,
    jenis_id: 3,
    nama: 'Keterangan aktif kuliah',
    perihal: 'Surat keterangan aktif kuliah',
    aktif: 1,
    keterangan: null,
    isi:
      '<p>Ketua {{unit}} menerangkan bahwa:</p><figure class="ub-tabel"><table><tr><td>Nama</td><td><strong>{{nama_mahasiswa}}</strong></td></tr><tr><td>NIM</td><td>{{nim}}</td></tr><tr><td>Semester</td><td>{{semester}}</td></tr></table></figure>' +
      '<p>adalah benar mahasiswa aktif pada {{unit}} Universitas Pohuwato tahun akademik {{tahun_akademik}}. Surat keterangan ini dibuat untuk keperluan {{keperluan}}.</p><p>Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>',
  },
  {
    id: 3,
    unit_id: null,
    jenis_id: 2,
    nama: 'Surat tugas',
    perihal: 'Surat tugas',
    aktif: 1,
    keterangan: 'Templat bersama untuk semua unit.',
    isi:
      '<p>Yang bertanda tangan di bawah ini, pimpinan {{unit}}, menugaskan:</p><ol><li>{{nama_petugas}}</li></ol><p>untuk {{tugas}} pada {{tanggal_tugas}} bertempat di {{tempat}}.</p><p>Setelah melaksanakan tugas agar menyampaikan laporan secara tertulis. Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.</p>',
  },
];

const halaman = <T,>(rows: T[], u: URL) => {
  const per = Number(u.searchParams.get('per_page') ?? 20);
  const page = Number(u.searchParams.get('page') ?? 1);
  return { data: rows.slice((page - 1) * per, page * per), meta: { page, per_page: per, total: rows.length, total_pages: Math.max(1, Math.ceil(rows.length / per)) } };
};
const cari = (q: string | null, ...t: Array<string | null | undefined>) => !q || t.some((x) => x?.toLowerCase().includes(q.toLowerCase()));

tambahRute(/^\/v1\/arsip\/unit\/\d+$/, (u) => {
  const x = UNIT.find((r) => r.id === Number(u.pathname.split('/').pop()));
  return x ? { data: x } : { __status: 404, error: { message: 'Unit tidak ditemukan.' } };
});
tambahRute(/^\/v1\/arsip\/unit$/, (u) =>
  halaman(
    UNIT.filter((r) => (u.searchParams.get('saya') !== '1' || r.peran_saya) && cari(u.searchParams.get('q'), r.nama, r.kode, r.singkatan)),
    u,
  ),
);
tambahRute(/^\/v1\/arsip\/jenis$/, (u) => halaman(JENIS.filter((r) => cari(u.searchParams.get('q'), r.nama, r.kode)), u));

const galatTemplat = (b: Record<string, unknown>) => {
  const g: Record<string, string> = {};
  if (!String(b.nama ?? '').trim()) g.nama = 'wajib diisi';
  if (!String(b.isi ?? '').trim()) g.isi = 'wajib diisi';
  return Object.keys(g).length ? { __status: 422, error: { code: 'validation_failed', message: 'Data tidak valid.', fields: g } } : null;
};

tambahRute(/^\/v1\/arsip\/template\/\d+$/, (u, init) => {
  const id = Number(u.pathname.split('/').pop());
  const i = TEMPLAT.findIndex((r) => r.id === id);
  if (i < 0) return { __status: 404, error: { message: 'Templat tidak ditemukan.' } };
  if (init?.method === 'DELETE') {
    TEMPLAT.splice(i, 1);
    return { data: null };
  }
  if (init?.method === 'PUT') {
    const b = JSON.parse(String(init.body ?? '{}'));
    const g = galatTemplat(b);
    if (g) return g;
    TEMPLAT[i] = { ...TEMPLAT[i], ...b, aktif: b.aktif ? 1 : 0 };
  }
  return { data: TEMPLAT[i] };
});
tambahRute(/^\/v1\/arsip\/template$/, (u, init) => {
  if (init?.method === 'POST') {
    const b = JSON.parse(String(init.body ?? '{}'));
    const g = galatTemplat(b);
    if (g) return g;
    const baru = { id: ++urut, keterangan: null, perihal: null, jenis_id: null, unit_id: null, ...b, aktif: b.aktif === false ? 0 : 1 };
    TEMPLAT.unshift(baru);
    return { __status: 201, data: baru };
  }
  const unit = u.searchParams.get('unit_id');
  const aktif = u.searchParams.get('aktif');
  return halaman(
    TEMPLAT.filter((r) => (!unit || r.unit_id === null || r.unit_id === Number(unit)) && (aktif === null || String(r.aktif) === aktif) && cari(u.searchParams.get('q'), r.nama, r.perihal)),
    u,
  );
});
