import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HalamanLanding } from '../src/components/landing-blok';
import { blokBaru, type DokumenLanding } from '../src/components/landing-skema';
import { KerangkaSitus, menuSitusKeNavbar, tujuanSitus } from '../src/components/situs';
import {
  BAGIAN_SITUS,
  PRESET_SITUS,
  URUT_BAGIAN_SITUS,
  bentukMenu,
  butirDi,
  geserButir,
  hapusButir,
  jalurMenu,
  keluarkanButir,
  menjorokButir,
  normalisasiSitus,
  objekBersih,
  ATURAN_SITUS,
  pindahButir,
  situsBawaan,
  tambahButir,
  type ButirMenu,
} from '../src/components/situs-skema';
import { atasGelapLanding } from '../src/siakad/situs-aplikasi';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const UUID = '0a1b2c3d-0000-4000-8000-123456789abc';

describe('normalisasiSitus (cermin SkemaSitus.php)', () => {
  it('membuang kunci liar, HTML-ish tetap teks, tautan berbahaya, dan nilai pilihan tak dikenal', () => {
    const d = normalisasiSitus({
      liar: 1,
      kepala: {
        tampilan: 'portal',
        css: 'x',
        lengket: '1',
        tombol: [
          { label: 'Masuk', url: 'aksi:masuk' },
          { label: 'Jahat', url: 'javascript:alert(1)' },
        ],
      },
      pita: { aktif: true, nada: 'ungu', butir: [{ teks: 'PMB', url: 'data:text/html,x' }] },
      menu: [
        { label: 'A', url: `berkas:${UUID.toUpperCase()}` },
        { label: 'B', url: '//evil.com' },
      ],
    });
    expect(d).not.toHaveProperty('liar');
    expect(d.kepala).not.toHaveProperty('css');
    expect(d.kepala.lengket).toBe(true);
    expect(d.kepala.tombol).toEqual([{ label: 'Masuk', url: 'aksi:masuk' }, { label: 'Jahat' }]);
    expect(d.pita.nada).toBeUndefined();
    expect(d.pita.butir).toEqual([{ teks: 'PMB' }]);
    expect(d.menu[0]!.url).toBe(`berkas:${UUID}`);
    expect(d.menu[1]!.url).toBeUndefined();
  });
  it('batas jumlah dan tiga tingkat; id unik diberikan', () => {
    const cucu = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `c${i}`, anak: [{ label: 'tingkat4' }] }));
    const d = normalisasiSitus({ menu: Array.from({ length: 14 }, (_, i) => ({ id: 'sama', label: `m${i}`, anak: [{ label: 'a', anak: cucu(20) }] })) });
    expect(d.menu).toHaveLength(10);
    expect(new Set(d.menu.map((m) => m.id)).size).toBe(10);
    const t2 = d.menu[0]!.anak![0]!;
    expect(t2.anak).toHaveLength(12);
    expect(t2.anak![0]).not.toHaveProperty('anak');
  });
  it('masukan rusak menjadi kerangka kosong yang sah', () => {
    for (const x of [null, 'x', 42, { menu: 'bukan daftar', kaki: [] }]) {
      const d = normalisasiSitus(x);
      expect(d.versi).toBe(1);
      expect(d.menu).toEqual([]);
      expect(d.kaki).toEqual({});
    }
  });
  it('angka widget dibatasi', () => {
    expect(objekBersih({ sidebar: { widget: [{ jenis: 'kabar', jumlah: 99 }] } }, ATURAN_SITUS)).toEqual({ sidebar: { widget: [{ jenis: 'kabar', jumlah: 8 }] } });
  });
});

const M = (): ButirMenu[] =>
  normalisasiSitus({
    menu: [
      { id: 'beranda', label: 'Beranda', url: '/' },
      {
        id: 'profil',
        label: 'Profil',
        anak: [
          { id: 'sejarah', label: 'Sejarah', url: '/sejarah' },
          { id: 'visi', label: 'Visi', url: '/visi' },
        ],
      },
      { id: 'akad', label: 'Akademik', anak: [{ id: 'fak', label: 'Fakultas', anak: [{ id: 'ft', label: 'Teknik', url: '/ft' }] }] },
      { id: 'kontak', label: 'Kontak', url: '/kontak' },
    ],
  }).menu;
const ids = (m: ButirMenu[]): unknown => m.map((b) => (b.anak?.length ? { [b.id]: ids(b.anak) } : b.id));

describe('operasi pohon menu', () => {
  it('bentuk: tautan, dropdown, mega', () => {
    const m = M();
    expect(m.map(bentukMenu)).toEqual(['tautan', 'dropdown', 'mega', 'tautan']);
  });
  it('geser naik/turun di antara saudara', () => {
    expect(ids(geserButir(M(), [3], -1))).toEqual(['beranda', { profil: ['sejarah', 'visi'] }, 'kontak', { akad: [{ fak: ['ft'] }] }]);
    expect(ids(geserButir(M(), [1, 0], 1))).toEqual(['beranda', { profil: ['visi', 'sejarah'] }, { akad: [{ fak: ['ft'] }] }, 'kontak']);
    const m = M();
    expect(geserButir(m, [0], -1)).toBe(m);
  });
  it('menjorok menjadi anak saudara di atasnya, keluarkan kembali setelah induk', () => {
    const a = menjorokButir(M(), [3]);
    expect(ids(a)).toEqual(['beranda', { profil: ['sejarah', 'visi'] }, { akad: [{ fak: ['ft'] }, 'kontak'] }]);
    const b = keluarkanButir(a, jalurMenu(a, 'kontak')!);
    expect(ids(b)).toEqual(ids(M()));
  });
  it('menolak lebih dari tiga tingkat dan memindah ke dalam dirinya sendiri', () => {
    const m = M();
    // Akademik (kedalaman 3) tidak bisa menjadi anak Profil.
    expect(menjorokButir(m, [2])).toBe(m);
    expect(pindahButir(m, [2], [2, 0], 0)).toBe(m);
    expect(tambahButir(m, [2, 0, 0], { id: 'x', label: 'x' })).toBe(m);
  });
  it('pindah seret-lepas: ke posisi lain dan ke dalam butir', () => {
    expect(ids(pindahButir(M(), [0], [], 4))).toEqual([{ profil: ['sejarah', 'visi'] }, { akad: [{ fak: ['ft'] }] }, 'kontak', 'beranda']);
    expect(ids(pindahButir(M(), [3], [1], 1))).toEqual(['beranda', { profil: ['sejarah', 'kontak', 'visi'] }, { akad: [{ fak: ['ft'] }] }]);
    // Anak terakhir yang dipindah keluar: induk tidak menyisakan anak kosong.
    const a = pindahButir(M(), [2, 0, 0], [], 0);
    expect(ids(a)).toEqual(['ft', 'beranda', { profil: ['sejarah', 'visi'] }, { akad: ['fak'] }, 'kontak']);
    expect(butirDi(a, [3, 0])).not.toHaveProperty('anak');
  });
  it('hapus beserta anak; batas menu tingkat 1', () => {
    expect(ids(hapusButir(M(), [1]))).toEqual(['beranda', { akad: [{ fak: ['ft'] }] }, 'kontak']);
    let m: ButirMenu[] = [];
    for (let i = 0; i < 12; i++) m = tambahButir(m, null, { id: `m${i}`, label: `m${i}` });
    expect(m).toHaveLength(10);
  });
});

describe('menu ke navbar dan tujuan', () => {
  it('dropdown, mega berkolom + sorotan, ikhtisar induk bertujuan', () => {
    const m = normalisasiSitus({
      menu: [
        { label: 'Profil', url: '/profil', anak: [{ label: 'Sejarah', url: '/sejarah', keterangan: 'Sejak 2010' }] },
        {
          label: 'Akademik',
          anak: [
            { label: 'Panduan', url: `berkas:${UUID}` },
            { label: 'Fakultas', anak: [{ label: 'Teknik', url: '/ft', lencana: 'Baru dibuka' }] },
          ],
          sorot: { judul: 'PMB', url: '/pmb', gambar: `berkas:${UUID}` },
        },
        { label: 'Masuk', url: 'aksi:masuk' },
        { label: 'Tanpa tujuan' },
      ],
    }).menu;
    const nav = menuSitusKeNavbar(m, { berkas: { [UUID]: 'https://s3/x' }, aksi: { masuk: { label: 'Masuk', href: '/bff/masuk' } } });
    expect(nav.map((x) => x.label)).toEqual(['Profil', 'Akademik', 'Masuk']);
    expect(nav[0]!.items!.map((x) => x.href)).toEqual(['/profil', '/sejarah']);
    expect(nav[0]!.items![1]!.description).toBe('Sejak 2010');
    expect(nav[1]!.columns!.map((c) => c.title)).toEqual([undefined, 'Fakultas']);
    expect(nav[1]!.columns![0]!.items[0]!).toMatchObject({ href: 'https://s3/x', external: true });
    expect(nav[1]!.columns![1]!.items[0]!.badge).toBe('Baru dibuka');
    expect(nav[1]!.featured).toMatchObject({ title: 'PMB', href: '/pmb', image: 'https://s3/x' });
    expect(nav[2]!.href).toBe('/bff/masuk');
  });
  it('berkas tanpa peta dan aksi tak tersedia tidak tampil', () => {
    expect(tujuanSitus(`berkas:${UUID}`, {})).toBeNull();
    expect(tujuanSitus('aksi:daftar', { aksi: {} })).toBeNull();
    expect(tujuanSitus('javascript:alert(1)', {})).toBeNull();
    expect(tujuanSitus('https://unipo.ac.id', { baru: true })).toEqual({ href: 'https://unipo.ac.id', external: true });
  });
});

describe('KerangkaSitus', () => {
  const landing: DokumenLanding = { versi: 1, blok: [{ ...blokBaru('hero'), gaya: { menu: 'Fitur', jangkar: 'fitur' } }] };
  it('setiap preset dirender: pita, bilah atas, navbar, kaki, sidebar halaman dalam, lewati ke isi', () => {
    for (const [kunci, p] of Object.entries(PRESET_SITUS)) {
      const d = p.buat();
      const h = html(
        <KerangkaSitus situs={d} merek={<b>UNIPO</b>} sidebar aksi={{ masuk: { label: 'Masuk', href: '/masuk' }, daftar: { label: 'Daftar', href: '/daftar' } }}>
          <HalamanLanding dokumen={landing} />
        </KerangkaSitus>,
      );
      expect(h, kunci).toContain('href="#isi-utama"');
      expect(h, kunci).toContain('id="isi-utama"');
      expect(h, kunci).toContain('u-navbar');
      if (d.kaki.aktif) expect(h, kunci).toContain('u-footer');
      if (d.pita.aktif) expect(h, kunci).toContain('u-pita');
      if (d.sidebar.aktif) expect(h, kunci).toContain('us-sidebar');
      expect(h).not.toMatch(/javascript:/i);
    }
  });
  it('kerangka bawaan setara tampilan lama: tanpa kaki dan pita, tombol Masuk, menu dari bagian halaman', () => {
    const d = situsBawaan();
    expect(d.kaki.aktif).toBe(false);
    expect(d.kepala.menu_bagian).toBe(true);
    const h = html(
      <KerangkaSitus situs={d} merek="UNIPO" menuBagian={[{ key: 'f', label: 'Fitur', href: '#fitur' }]} aksi={{ masuk: { label: 'Masuk', href: '/masuk' } }}>
        <p>isi</p>
      </KerangkaSitus>,
    );
    expect(h).not.toContain('u-footer');
    expect(h).toContain('href="/masuk"');
  });
  it('kotak cari dan pita ajakan kaki', () => {
    const h = html(<KerangkaSitus situs={PRESET_SITUS.portal!.buat()} merek="UNIPO" />);
    expect(h).toContain('role="search"');
    expect(h).toContain('action="/cari"');
    const p = html(<KerangkaSitus situs={PRESET_SITUS.pendaftaran!.buat()} merek="UNIPO" aksi={{ daftar: { label: 'Daftar', href: '/daftar' } }} />);
    expect(p).toContain('Siap kuliah di UNIPO?');
  });
  it('navbar tembus pandang hanya di atas bagian pertama yang gelap', () => {
    const d = normalisasiSitus({ kepala: { transparan: true } });
    expect(html(<KerangkaSitus situs={d} merek="U" />)).not.toContain('data-transparan');
    expect(html(<KerangkaSitus situs={d} merek="U" atasGelap />)).toContain('data-transparan');
    expect(atasGelapLanding({ versi: 1, blok: [{ ...blokBaru('hero'), isi: { tata: 'layar' } }] })).toBe(true);
    expect(atasGelapLanding({ versi: 1, blok: [blokBaru('hero')] })).toBe(false);
    expect(atasGelapLanding({ versi: 1, blok: [{ ...blokBaru('fitur'), gaya: { latar: 'gelap' } }] })).toBe(true);
  });
  it('null situs = hanya isi', () => {
    expect(
      html(
        <KerangkaSitus situs={null} merek="U">
          <p>isi</p>
        </KerangkaSitus>,
      ),
    ).toBe('<p>isi</p>');
  });
});

describe('hero varian baru', () => {
  it('layar, kartu, dan cari dirender; kotak cari memakai alamat aman', () => {
    for (const tata of ['layar', 'kartu', 'cari']) {
      const h = html(
        <HalamanLanding dokumen={{ versi: 1, blok: [{ ...blokBaru('hero'), isi: { judul: 'Judul', tata, cari_url: 'javascript:x', pintasan: [{ label: 'KRS', url: '/krs', ikon: 'buku' }] } }] }} />,
      );
      expect(h).toContain(`data-tata="${tata}"`);
      if (tata === 'cari') {
        expect(h).toContain('action="/cari"');
        expect(h).toContain('href="/krs"');
      }
      expect(h).not.toContain('javascript:');
    }
  });
});

describe('bagian penyunting', () => {
  it('semua bagian punya label, ikon, dan kolom bernama unik', () => {
    for (const k of URUT_BAGIAN_SITUS) {
      const b = BAGIAN_SITUS[k];
      expect(b.label).toBeTruthy();
      const nama = b.kolom.map((x) => x.k);
      expect(new Set(nama).size).toBe(nama.length);
    }
  });
});
