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

