import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModePemeliharaan } from '../src/components/pemeliharaan';
import { alamatMasukPemeliharaan, type StatusPemeliharaanBff } from '../src/siakad/pemeliharaan';

const tutup: StatusPemeliharaanBff = { aktif: true, pesan: 'Pembaruan', sampai: null, sejak: null, lolos: false, masuk: false, rute_masuk: '/masuk' };

describe('mode pemeliharaan: masuk khusus Pustikom', () => {
  it('pengunjung belum login: tombol menuju rute masuk BFF dengan halaman kembali', () => {
    expect(alamatMasukPemeliharaan('/bff', tutup, '/nilai?x=1')).toBe('/bff/masuk?kembali=%2Fnilai%3Fx%3D1');
    expect(alamatMasukPemeliharaan('/bff/', { ...tutup, rute_masuk: '/panitia/masuk' }, '/panitia')).toBe('/bff/panitia/masuk?kembali=%2Fpanitia');
  });
  it('BFF lama tanpa field masuk/rute_masuk: tetap /masuk', () => {
    const lama = { aktif: true, pesan: '', sampai: null, sejak: null, lolos: false };
    expect(alamatMasukPemeliharaan('/bff', lama)).toBe('/bff/masuk?kembali=%2F');
  });
  it('tanpa tombol: sudah login, pengelola lolos, tidak pemeliharaan, tanpa BFF, rute aneh diganti /masuk', () => {
    expect(alamatMasukPemeliharaan('/bff', { ...tutup, masuk: true })).toBeNull();
    expect(alamatMasukPemeliharaan('/bff', { ...tutup, lolos: true, masuk: true })).toBeNull();
    expect(alamatMasukPemeliharaan('/bff', { ...tutup, aktif: false })).toBeNull();
    expect(alamatMasukPemeliharaan(false, tutup)).toBeNull();
    expect(alamatMasukPemeliharaan('/bff', null)).toBeNull();
    expect(alamatMasukPemeliharaan('/bff', { ...tutup, rute_masuk: 'https://jahat.test/x' })).toBe('/bff/masuk?kembali=%2F');
  });
  it('ModePemeliharaan menampilkan tautan "Masuk (khusus Pustikom)" di samping Coba lagi', () => {
    const h = renderToStaticMarkup(<ModePemeliharaan message="Pembaruan" onRetry={() => {}} login={{ href: '/bff/masuk?kembali=%2F' }} />);
    expect(h).toContain('u-pemeliharaan-aksi');
    expect(h).toContain('href="/bff/masuk?kembali=%2F"');
    expect(h).toContain('Masuk (khusus Pustikom)');
    expect(h).toContain('Coba lagi');
    expect(renderToStaticMarkup(<ModePemeliharaan message="x" />)).not.toContain('Masuk (khusus Pustikom)');
  });
});
