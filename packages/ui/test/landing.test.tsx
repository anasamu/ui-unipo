import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HalamanLanding, TeksRingan } from '../src/components/landing-blok';
import { LANDING_APLIKASI, POTONGAN_LANDING, TEMPLAT_LANDING, landingBawaan, templatLanding } from '../src/components/landing-kit';
import { SKEMA_BLOK, URUT_BLOK, blokBaru, gambarAman, menuLanding, normalisasiDokumen, urlAman, type DokumenLanding } from '../src/components/landing-skema';
import { mulaiRiwayat, setelKolom, terapkan, ubahDokumen, ulangi, urungkan } from '../src/components/landing-sunting';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

describe('urlAman / gambarAman', () => {
  it('menerima tautan aman', () => {
    for (const u of ['#fitur', '/masuk', '/bff/masuk?kembali=%2F', 'https://unipo.ac.id', 'http://contoh.id/a', 'mailto:pustikom@unipo.ac.id', 'tel:+6281234', 'aksi:masuk']) expect(urlAman(u)).toBe(u);
  });
  it('menolak tautan berbahaya', () => {
    for (const u of ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', '//evil.com', '/a b', 'https://x.id/"onmouseover', '<script>', 'vbscript:x', '', 42, null]) expect(urlAman(u)).toBeUndefined();
  });
  it('gambar: berkas lewat peta, https, /alamat; bukan http, data, aksi', () => {
    const id = '0e8b4d1c-1111-2222-3333-444455556666';
    expect(gambarAman(`berkas:${id.toUpperCase()}`, { [id]: 'https://s3/x.png' })).toBe('https://s3/x.png');
    expect(gambarAman(`berkas:${id}`, {})).toBeUndefined();
    expect(gambarAman('https://a.id/b.png')).toBe('https://a.id/b.png');
    expect(gambarAman('/logo.svg')).toBe('/logo.svg');
    for (const u of ['http://a.id/b.png', 'data:image/png;base64,AAA', 'aksi:masuk', '#x']) expect(gambarAman(u)).toBeUndefined();
  });
});

describe('normalisasiDokumen', () => {
  it('membuang tipe tak dikenal, menyatukan id ganda, membatasi 40 blok', () => {
    const d = normalisasiDokumen({ blok: [{ id: 'aaaa1111', tipe: 'hero', isi: {} }, { id: 'aaaa1111', tipe: 'faq' }, { tipe: 'iframe' }, 'x', ...Array.from({ length: 50 }, () => ({ tipe: 'teks' }))] });
    expect(d.blok).toHaveLength(40);
    expect(d.blok[0]!.id).toBe('aaaa1111');
    expect(d.blok[1]!.id).not.toBe('aaaa1111');
    expect(new Set(d.blok.map((b) => b.id)).size).toBe(40);
    expect(d.blok.every((b) => b.tipe in SKEMA_BLOK)).toBe(true);
  });
  it('tahan masukan rusak', () => {
    expect(normalisasiDokumen(null).blok).toEqual([]);
    expect(normalisasiDokumen({ blok: 'bukan daftar' }).blok).toEqual([]);
  });
});

describe('TeksRingan', () => {
  it('tidak pernah merender HTML mentah', () => {
    const h = html(<TeksRingan teks={'<img src=x onerror=alert(1)> **tebal** *miring*'} />);
    expect(h).not.toContain('<img');
    expect(h).toContain('&lt;img');
    expect(h).toContain('<strong>tebal</strong>');
    expect(h).toContain('<em>miring</em>');
  });
  it('tautan disaring; javascript: menjadi teks biasa', () => {
    const h = html(<TeksRingan teks={'[aman](/panduan) dan [jahat](javascript:alert(1)) dan [luar](https://unipo.ac.id)'} />);
    expect(h).toContain('href="/panduan"');
    expect(h).not.toContain('javascript:');
    expect(h).toContain('rel="noopener noreferrer"');
  });
  it('paragraf dan daftar', () => {
    const h = html(<TeksRingan teks={'Satu\nbaris\n\n- a\n- b'} />);
    expect(h).toContain('<p>Satu<br/>baris</p>');
    expect(h).toContain('<ul><li>a</li><li>b</li></ul>');
  });
});

describe('HalamanLanding', () => {
  it('setiap tipe blok bawaan dirender tanpa galat (publik dan penyunting)', () => {
    const d: DokumenLanding = { versi: 1, blok: URUT_BLOK.map((t) => blokBaru(t)) };
    const publik = html(<HalamanLanding dokumen={d} />);
    const sunting = html(<HalamanLanding dokumen={d} pratinjau terpilih={d.blok[0]!.id} onPilih={() => {}} />);
    expect(publik).toContain('class="ul-halaman"');
    expect(sunting.match(/data-blok-id=/g)).toHaveLength(URUT_BLOK.length);
    expect(sunting).toContain('data-terpilih');
    // Penanda hanya di penyunting.
    expect(publik).not.toContain('ul-penanda');
    expect(sunting).toContain('ul-penanda');
  });

  it('tombol aksi:<kunci> memakai tujuan dari aplikasi; tanpa aksi tidak tampil ke pengunjung', () => {
    const d = normalisasiDokumen({ blok: [{ tipe: 'ajakan', isi: { judul: 'Ayo', tombol: [{ label: 'Masuk', url: 'aksi:masuk' }, { label: 'Panduan', url: '/panduan' }] } }] });
    const ada = html(<HalamanLanding dokumen={d} aksi={{ masuk: { label: 'Masuk', href: '/bff/masuk?kembali=%2F', labelTombol: 'Lanjut belajar' } }} />);
    expect(ada).toContain('href="/bff/masuk?kembali=%2F"');
    expect(ada).toContain('Lanjut belajar');
    const tanpa = html(<HalamanLanding dokumen={d} />);
    expect(tanpa).not.toContain('Masuk');
    expect(tanpa).toContain('href="/panduan"');
    expect(html(<HalamanLanding dokumen={d} pratinjau />)).toMatch(/<button[^>]*disabled[^>]*>Masuk/);
  });

  it('gaya hanya atribut data (tanpa CSS bebas), latar foto lewat url() aman', () => {
    const id = '0e8b4d1c-1111-2222-3333-444455556666';
    const d = normalisasiDokumen({ blok: [{ tipe: 'teks', isi: { isi: 'x' }, gaya: { latar: 'gambar', latar_gambar: `berkas:${id}`, jarak: 'lega', rata: 'tengah', lebar: 'sempit', sembunyi: 'ponsel', jangkar: 'tentang' } }] });
    const h = html(<HalamanLanding dokumen={d} berkas={{ [id]: 'https://s3/a.jpg?X-Sig=a%2Fb' }} />);
    expect(h).toContain('data-latar="gambar"');
    expect(h).toContain('id="tentang"');
    expect(h).toContain('--ul-latar-gambar:url(&quot;https://s3/a.jpg?X-Sig=a%2Fb&quot;)');
  });

  it('slot memakai isi dari aplikasi', () => {
    const d = normalisasiDokumen({ blok: [{ tipe: 'slot', isi: { kunci: 'kelas-terbuka', judul: 'Kelas terbuka' } }] });
    expect(html(<HalamanLanding dokumen={d} slot={{ 'kelas-terbuka': { label: 'Kelas', render: <p>KATALOG</p> } }} />)).toContain('<p>KATALOG</p>');
    expect(html(<HalamanLanding dokumen={d} />)).not.toContain('KATALOG');
  });

  it('menu atas dari blok berlabel menu dan berjangkar', () => {
    const d = landingBawaan('lms');
    expect(menuLanding(d).map((m) => m.label)).toEqual(['Fitur', 'Kelas terbuka', 'Cara mulai', 'FAQ']);
  });
});

describe('kit & templat', () => {
  it('setiap templat valid, id unik, dan dirender', () => {
    for (const t of TEMPLAT_LANDING) {
      const d = t.buat();
      const n = normalisasiDokumen(d);
      expect(n.blok.length, t.kunci).toBe(d.blok.length);
      expect(new Set(n.blok.map((b) => b.id)).size).toBe(n.blok.length);
      expect(() => html(<HalamanLanding dokumen={n} pratinjau />)).not.toThrow();
    }
  });
  it('templat bawaan per aplikasi; slot templat terdaftar', () => {
    expect(templatLanding('lms').kunci).toBe('lms');
    expect(templatLanding('lppm').kunci).toBe('unit');
    expect(templatLanding('tidak-ada').kunci).toBe('umum');
    for (const [aplikasi, reg] of Object.entries(LANDING_APLIKASI)) {
      const kunci = landingBawaan(reg.bawaan).blok.flatMap((b) => [b.tipe === 'slot' ? b.isi.kunci : undefined, b.isi.media === 'slot' ? b.isi.slot : undefined]).filter(Boolean);
      for (const k of kunci) expect(reg.slot?.[String(k)], `${aplikasi}:${k}`).toBeTruthy();
    }
  });
  it('potongan siap pakai membuat blok bertipe benar', () => {
    for (const p of POTONGAN_LANDING) expect(p.buat().tipe).toBe(p.tipe);
  });
  it('templat LMS setara landing lama (judul, 9 fitur, 6 FAQ)', () => {
    const d = landingBawaan('lms');
    expect(d.blok[0]!.isi.judul).toBe('Belajar lebih teratur, di kelas maupun dari rumah.');
    expect((d.blok.find((b) => b.tipe === 'fitur')!.isi.butir as unknown[]).length).toBe(9);
    expect((d.blok.find((b) => b.tipe === 'faq')!.isi.butir as unknown[]).length).toBe(6);
  });
});

describe('logika penyunting', () => {
  const d = (): DokumenLanding => ({ versi: 1, blok: [blokBaru('hero'), blokBaru('fitur'), blokBaru('faq')] });
  it('pindah, geser, hapus, duplikat, tambah setelah blok terpilih', () => {
    const a = d();
    const [h, f, q] = a.blok.map((b) => b.id);
    expect(ubahDokumen(a, { t: 'pindah', id: q!, ke: 0 }).blok.map((b) => b.id)).toEqual([q, h, f]);
    expect(ubahDokumen(a, { t: 'geser', id: h!, arah: -1 })).toBe(a);
    expect(ubahDokumen(a, { t: 'geser', id: h!, arah: 1 }).blok.map((b) => b.id)).toEqual([f, h, q]);
    expect(ubahDokumen(a, { t: 'hapus', id: f! }).blok).toHaveLength(2);
    const dup = ubahDokumen(a, { t: 'duplikat', id: f! });
    expect(dup.blok).toHaveLength(4);
    expect(dup.blok[2]!.id).not.toBe(f);
    expect(dup.blok[2]!.isi).toEqual(dup.blok[1]!.isi);
    const baru = blokBaru('teks');
    expect(ubahDokumen(a, { t: 'tambah', blok: baru, setelah: h }).blok[1]!.id).toBe(baru.id);
    expect(a.blok.map((b) => b.id)).toEqual([h, f, q]);
  });
  it('urungkan/ulangi, ketikan beruntun digabung', () => {
    const a = d();
    const id = a.blok[0]!.id;
    let r = mulaiRiwayat(a);
    r = terapkan(r, { t: 'isi', id, isi: { judul: 'A' } }, 1000);
    r = terapkan(r, { t: 'isi', id, isi: { judul: 'AB' } }, 1300);
    r = terapkan(r, { t: 'isi', id, isi: { judul: 'ABC' } }, 1500);
    expect(r.lalu).toHaveLength(1);
    r = terapkan(r, { t: 'geser', id, arah: 1 }, 1600);
    expect(r.lalu).toHaveLength(2);
    r = urungkan(r);
    expect(r.kini.blok[0]!.isi.judul).toBe('ABC');
    r = urungkan(r);
    expect(r.kini).toBe(a);
    r = ulangi(ulangi(r));
    expect(r.kini.blok[1]!.isi.judul).toBe('ABC');
  });
  it('setelKolom menghapus kolom kosong', () => {
    expect(setelKolom({ a: 1, b: 'x' }, 'b', '')).toEqual({ a: 1 });
    expect(setelKolom({ a: 1 }, 'c', [])).toEqual({ a: 1 });
    expect(setelKolom({}, 'c', 0)).toEqual({ c: 0 });
  });
});
