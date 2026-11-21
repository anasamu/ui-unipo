import { describe, expect, it, vi } from 'vitest';
import { cocokIzin, definisiMenu, periksaMenu, susunMenu, type KategoriMenuDef } from '../src/components/menu-aplikasi';

const DASAR: KategoriMenuDef[] = [
  { kategori: 'pengaturan', item: [{ label: 'Tema tampilan', ke: '/tema' }] },
  { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/' }] },
  { kategori: 'tugas', item: [{ label: 'Persetujuan', ke: '/persetujuan', izin: 'x.setujui' }] },
  {
    kategori: 'bidang',
    judul: 'Akun & akses',
    item: [
      { label: 'Akun pengguna', ke: '/akun', ket: 'Kelola akun', kata: 'user sandi' },
      {
        label: 'Peran & hak akses',
        anak: [
          { label: 'Peran & izin', ke: '/peran', izin: 'rbac:read' },
          { label: 'Penugasan peran', ke: '/penugasan', izin: 'rbac:admin' },
        ],
      },
      { label: 'Kelas', ke: '/kelas', ruteTurunan: ['/kelas-detail/:id'] },
      { label: 'Pengembang', ke: '/pengembang', ruteTurunan: ['/m/*'] },
      { label: 'Aplikasi lain', ke: 'https://contoh.unipo.ac.id/', luar: true },
    ],
  },
];
const def = (k: KategoriMenuDef[] = DASAR) => definisiMenu(k, { periksa: false });

describe('definisiMenu', () => {
  it('mengurutkan kategori standar', () => {
    expect(def().kategori.map((k) => k.kategori)).toEqual(['beranda', 'tugas', 'bidang', 'pengaturan']);
  });
  it('menulis console.warn untuk masalah saat diperiksa', () => {
    const w = vi.spyOn(console, 'warn').mockImplementation(() => {});
    definisiMenu([{ kategori: 'bidang', judul: 'A', item: [{ label: 'X', ke: '/x' }, { label: 'Y', ke: '/x?tab=2' }] }], { periksa: true, nama: 'Uji' });
    expect(w).toHaveBeenCalledWith(expect.stringContaining('[menu Uji] rute ganda: /x'));
    w.mockRestore();
  });
});

describe('susunMenu', () => {
  it('menyaring izin, meratakan induk beranak satu, membuang kategori kosong', () => {
    const h = susunMenu(def(), { izin: ['rbac:read'] });
    expect(h.groups.map((g) => g.label)).toEqual([undefined, 'Akun & akses', 'Pengaturan']);
    const akun = h.groups[1]!.items;
    expect(akun.map((i) => i.label)).toEqual(['Akun pengguna', 'Peran & izin', 'Kelas', 'Pengembang', 'Aplikasi lain']);
    expect(akun[0]!.keterangan).toBe('Kelola akun');
    expect(akun[0]!.kataKunci).toEqual(['user', 'sandi']);
    expect(akun[4]!.luar).toBe(true);
  });
  it('superadmin dan pola izin', () => {
    expect(susunMenu(def(), { superadmin: true }).groups[2]!.items[1]!.children).toHaveLength(2);
    expect(susunMenu(def(), { izin: ['rbac:*', 'x.*'] }).groups.map((g) => g.label)).toContain('Tugas & persetujuan');
    expect(cocokIzin('kalender.kunci.*', 'kalender.kunci.atur')).toBe(true);
    expect(cocokIzin('rbac:read', 'rbac:admin')).toBe(false);
  });
  it('menu aktif: awalan terpanjang, ruteTurunan, judul, kelompok', () => {
    const k = { superadmin: true };
    expect(susunMenu(def(), k, { path: '/' }).activeKey).toBe('/');
    expect(susunMenu(def(), k, { path: '/peran/12' }).kelompok).toBe('Akun & akses › Peran & hak akses');
    expect(susunMenu(def(), k, { path: '/kelas-detail/9' }).judul).toBe('Kelas');
    expect(susunMenu(def(), k, { path: '/m/akademik/op/x' }).activeKey).toBe('/pengembang');
    expect(susunMenu(def(), k, { path: '/tidak-ada' }).activeKey).toBeUndefined();
  });
  it('fitur Cari membawa keterangan; tautan keluar dibuka lewat onSelect', () => {
    const f = susunMenu(def(), { superadmin: true }).fitur;
    expect(f.find((x) => x.key === '/akun')).toMatchObject({ keterangan: 'Kelola akun', kelompok: 'Akun & akses' });
    const luar = f.find((x) => x.label === 'Aplikasi lain')!;
    expect(luar.href).toBeUndefined();
    expect(typeof luar.onSelect).toBe('function');
  });
  it('lencana per kunci', () => {
    const h = susunMenu(def(), { superadmin: true }, { lencana: { '/persetujuan': 4 } });
    expect(h.groups[1]!.items[0]!.badge).toBe(4);
  });
});

describe('periksaMenu', () => {
  it('definisi bersih tanpa masalah', () => {
    expect(periksaMenu(def())).toEqual([]);
  });
  it('menangkap semua jenis masalah', () => {
    const buruk = definisiMenu(
      [
        { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/' }] },
        {
          kategori: 'bidang',
          judul: 'Kurikulum',
          item: [
            { label: 'Kurikulum', anak: [{ label: 'Mata kuliah', ke: '/mk' }, { label: 'Prasyarat', ke: '/pra' }] },
            { label: 'Satu', anak: [{ label: 'Anak tunggal', ke: '/tunggal' }] },
            { label: 'Notifikasi', ke: '/notif' },
            { label: 'Profil saya', ke: '/p' },
            { label: 'mata kuliah', ke: '/mk?tab=2', kunci: '/pra' },
            ...['a', 'b', 'c'].map((x) => ({ label: x, ke: `/${x}` })),
          ],
        },
        { kategori: 'bidang', judul: 'Kurikulum', item: [{ label: 'Z', ke: '/z' }, { label: 'Z2', ke: '/z2', bolehGanda: 'uji' }] },
      ],
      { periksa: false, menuAkun: ['Profil saya'] },
    );
    const jenis = new Set(periksaMenu(buruk).map((m) => m.jenis));
    expect([...jenis].sort()).toEqual(
      ['bilah-atas', 'induk-sama-kategori', 'induk-satu-anak', 'kategori-ganda', 'kategori-penuh', 'kunci-ganda', 'label-ganda', 'menu-akun', 'rute-ganda'].sort(),
    );
  });
  it('bolehGanda melewati rute/label ganda yang disengaja', () => {
    const d = definisiMenu(
      [
        { kategori: 'saya', judul: 'Akademik saya', item: [{ label: 'Aturan & syarat', ke: '/aturan', kunci: 'aturan-mhs', izin: 'mhs', bolehGanda: 'mahasiswa dan staf tidak pernah bertemu' }, { label: 'KRS', ke: '/krs' }] },
        { kategori: 'pengaturan', item: [{ label: 'Aturan & syarat', ke: '/aturan', izin: 'staf' }] },
      ],
      { periksa: false },
    );
    expect(periksaMenu(d)).toEqual([]);
  });
  it('dengan konteks: memeriksa menu yang terlihat untuk satu peran', () => {
    expect(periksaMenu(def(), { konteks: { izin: ['rbac:read'] } })).toEqual([]);
  });
});

describe('navigasi bawah', () => {
  const d = () =>
    definisiMenu(
      [
        { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/', ikon: 'B', bawah: 1 }] },
        {
          kategori: 'bidang',
          judul: 'Akun & akses',
          item: [
            { label: 'Akun pengguna', ke: '/akses/akun', ikon: 'A', pendek: 'Akun', bawah: 2 },
            { label: 'Peran & hak akses', ikon: 'P', anak: [{ label: 'Peran & izin', ke: '/akses/peran', pendek: 'Peran', bawah: 3, izin: 'rbac:read' }, { label: 'Penugasan peran', ke: '/akses/pengguna' }] },
            { label: 'Luar', ke: 'https://x.unipo.ac.id', luar: true },
          ],
        },
      ],
      { periksa: false },
    );
  it('dari item ber-bawah yang terlihat, label singkat (bukan rute), ikon induk', () => {
    const nb = susunMenu(d(), { superadmin: true }, { lencana: { '/akses/akun': 2 } }).navBawah;
    expect(nb.map((x) => x.label)).toEqual(['Beranda', 'Akun', 'Peran']);
    expect(nb.every((x) => !x.label.startsWith('/'))).toBe(true);
    expect(nb[1]!.badge).toBe(2);
    expect(nb[2]!.icon).toBe('P');
    expect(susunMenu(d(), { izin: [] }).navBawah.map((x) => x.key)).toEqual(['/', '/akses/akun']);
    expect(periksaMenu(d())).toEqual([]);
  });
  it('periksaMenu: label panjang/rute, induk, tautan keluar, terlalu banyak', () => {
    const buruk = definisiMenu(
      [
        { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/', ikon: 'B', bawah: true }] },
        {
          kategori: 'bidang',
          judul: 'X',
          item: [
            { label: 'Pengajuan akses API', ke: '/api', ikon: 'K', bawah: true },
            { label: 'Induk', ikon: 'I', bawah: true, anak: [{ label: 'a', ke: '/a' }, { label: 'b', ke: '/b' }] },
            { label: 'Keluar', ke: 'https://x', ikon: 'L', luar: true, bawah: true },
            { label: 'Rute', pendek: '/rute', ke: '/r', ikon: 'R', bawah: true },
          ],
        },
      ],
      { periksa: false },
    );
    const pesan = periksaMenu(buruk, { konteks: { superadmin: true } }).filter((m) => m.jenis === 'bawah').map((m) => m.pesan);
    expect(pesan.some((p) => p.includes('lebih dari 12 huruf'))).toBe(true);
    expect(pesan.some((p) => p.includes('"Induk" tidak bisa'))).toBe(true);
    expect(pesan.some((p) => p.includes('"Keluar" tidak bisa'))).toBe(true);
    expect(pesan.some((p) => p.includes('berupa rute'))).toBe(true);
    expect(pesan.some((p) => p.includes('berisi 5 item'))).toBe(true);
  });
});


describe('label panjang', () => {
  it('label sidebar dan judul kategori > 22 huruf ditandai; pendek tampil di sidebar dengan label penuh untuk judul', () => {
    const d = definisiMenu(
      [
        { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/' }] },
        {
          kategori: 'bidang',
          judul: 'Pengendalian & peningkatan',
          item: [
            { label: 'Penyusunan (CPL, MK, CPMK, RPS)', ke: '/kurikulum' },
            { label: 'Pemutakhiran rekening & pajak', ke: '/rekening', pendek: 'Rekening' },
            { label: 'Induk', anak: [{ label: 'Anak dengan label yang terlalu panjang', ke: '/anak' }, { label: 'Pendek', ke: '/p' }] },
          ],
        },
      ],
      { periksa: false },
    );
    const m = periksaMenu(d).filter((x) => x.jenis === 'label-panjang');
    expect(m.map((x) => x.pesan)).toEqual([
      expect.stringContaining('judul kategori "Pengendalian & peningkatan" 26 huruf'),
      expect.stringContaining('"Penyusunan (CPL, MK, CPMK, RPS)" 31 huruf'),
      expect.stringContaining('"Anak dengan label yang terlalu panjang"'),
    ]);
    expect(periksaMenu(d, { maksLabel: 40 }).filter((x) => x.jenis === 'label-panjang')).toEqual([]);
    const h = susunMenu(d, {}, { path: '/rekening' });
    const rek = h.groups[1]!.items[1]!;
    expect(rek.label).toBe('Rekening');
    expect(rek.labelTeks).toBe('Pemutakhiran rekening & pajak');
    expect(h.judul).toBe('Pemutakhiran rekening & pajak');
    expect(h.judulPendek).toBe('Rekening');
    expect(h.fitur.find((f) => f.key === '/rekening')!.label).toBe('Pemutakhiran rekening & pajak');
  });
});

describe('halaman bertab', () => {
  const d = () =>
    definisiMenu(
      [
        { kategori: 'beranda', item: [{ label: 'Beranda', ke: '/' }] },
        {
          kategori: 'bidang',
          judul: 'Akun & akses',
          item: [
            {
              label: 'Akun pengguna',
              ke: '/akun',
              ket: 'Kelola akun',
              tab: [
                { kunci: 'daftar', label: 'Daftar akun', ke: '/akun' },
                { kunci: 'riwayat', label: 'Riwayat masuk', ke: '/akun/riwayat', izin: 'akun:audit', kata: 'login log' },
                { kunci: 'sesi', label: 'Sesi aktif', ke: '/akun?tab=sesi', izin: 'akun:sesi' },
              ],
            },
            { label: 'Hanya admin', ke: '/admin', tab: [{ label: 'A', ke: '/admin', izin: 'x' }, { label: 'B', ke: '/admin/b', izin: 'x' }] },
          ],
        },
      ],
      { periksa: false },
    );
  it('satu item sidebar; tab disaring izin; item tanpa tab terlihat disembunyikan', () => {
    const h = susunMenu(d(), { izin: ['akun:audit'] }, { path: '/akun/riwayat' });
    expect(h.groups[1]!.items.map((i) => i.label)).toEqual(['Akun pengguna']);
    expect(h.activeKey).toBe('/akun');
    expect(h.judul).toBe('Akun pengguna');
    expect(h.tab).toMatchObject({ induk: '/akun', judul: 'Akun pengguna', aktif: 'riwayat' });
    expect(h.tab!.items.map((t) => t.label)).toEqual(['Daftar akun', 'Riwayat masuk']);
  });
  it('tab ber-?tab= dan alamat dasar', () => {
    const k = { superadmin: true };
    expect(susunMenu(d(), k, { path: '/akun?tab=sesi' }).tab!.aktif).toBe('sesi');
    expect(susunMenu(d(), k, { path: '/akun' }).tab!.aktif).toBe('daftar');
    expect(susunMenu(d(), k, { path: '/akun/12' }).tab!.aktif).toBe('daftar');
  });
  it('alamat tab terlarang ditandai agar dialihkan', () => {
    const h = susunMenu(d(), { izin: [] }, { path: '/akun/riwayat' });
    expect(h.tab!.terlarang).toBe(true);
    expect(susunMenu(d(), { izin: [] }, { path: '/akun' }).tab!.terlarang).toBeUndefined();
    // Alamat tab terlarang di luar alamat dasar item tetap mengaktifkan halamannya.
    const d2 = definisiMenu([{ kategori: 'bidang', judul: 'X', item: [{ label: 'Pegawai', ke: '/pegawai', tab: [{ label: 'Aktif', ke: '/pegawai' }, { label: 'Nonaktif', ke: '/pegawai-keluar', izin: 'x' }] }] }], { periksa: false });
    expect(susunMenu(d2, { izin: [] }, { path: '/pegawai-keluar' })).toMatchObject({ activeKey: '/pegawai', tab: { terlarang: true } });
  });
  it('Cari fitur menemukan tiap tab yang terlihat', () => {
    const f = susunMenu(d(), { izin: ['akun:audit'] }).fitur;
    expect(f.map((x) => x.key)).toEqual(['/', '/akun', 'tab:riwayat']);
    expect(f[2]).toMatchObject({ label: 'Riwayat masuk', href: '/akun/riwayat', kelompok: 'Akun & akses › Akun pengguna', kataKunci: ['login', 'log'] });
  });
  it('lencana induk = jumlah lencana tab', () => {
    const h = susunMenu(d(), { superadmin: true }, { lencana: { riwayat: 2, sesi: 3 } });
    expect(h.groups[1]!.items[0]!.badge).toBe(5);
  });
  it('periksaMenu: tab bersih; rute tab ganda, tab tunggal, label tab ganda', () => {
    expect(periksaMenu(d())).toEqual([]);
    const buruk = definisiMenu(
      [
        {
          kategori: 'bidang',
          judul: 'X',
          item: [
            { label: 'Riwayat', ke: '/akun/riwayat' },
            { label: 'Akun', ke: '/akun', tab: [{ label: 'Daftar', ke: '/akun' }, { label: 'Riwayat', ke: '/akun/riwayat' }, { label: 'riwayat', ke: '/akun/r2' }] },
            { label: 'Tunggal', ke: '/t', tab: [{ label: 'T', ke: '/t' }] },
          ],
        },
      ],
      { periksa: false },
    );
    const m = periksaMenu(buruk);
    expect(m.some((x) => x.jenis === 'rute-ganda' && x.pesan.includes('/akun/riwayat'))).toBe(true);
    expect(m.some((x) => x.jenis === 'tab' && x.pesan.includes('hanya punya 1 tab'))).toBe(true);
    expect(m.some((x) => x.jenis === 'tab' && x.pesan.includes('ganda di halaman "Akun"'))).toBe(true);
  });
});

describe('halaman bertab: tautan item', () => {
  it('sidebar, Cari fitur, dan navigasi bawah menuju tab pertama yang terlihat bila tab di alamat item terlarang', () => {
    const d = definisiMenu(
      [
        {
          kategori: 'bidang',
          judul: 'X',
          item: [{ label: 'Akun', ke: '/akun', ikon: 'A', bawah: true, tab: [{ label: 'Daftar', ke: '/akun', izin: 'a' }, { label: 'Sesi', ke: '/sesi', izin: 'b' }, { label: 'Log', ke: '/log' }] }],
        },
      ],
      { periksa: false },
    );
    const h = susunMenu(d, { izin: ['b'] });
    expect(h.groups[0]!.items[0]!.href).toBe('/sesi');
    expect(h.groups[0]!.items[0]!.key).toBe('/akun');
    expect(h.navBawah[0]!.href).toBe('/sesi');
    expect(h.fitur.map((f) => f.href)).toEqual(['/sesi', '/log']);
    expect(periksaMenu(d, { konteks: { izin: [] } })).toEqual([]);
  });
});
