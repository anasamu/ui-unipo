import { describe, expect, it } from 'vitest';
import { formatIsianTanggal, indeksBulan, maskerTanggal, uraiTanggal } from '../src/lib/tanggal';

const KINI = new Date(2026, 10, 21);
const iso = (teks: string, opsi = {}) => {
  const h = uraiTanggal(teks, { kini: KINI, ...opsi });
  if (!h) return null;
  if (!h.ok) return `galat: ${h.pesan}`;
  const d = h.tanggal;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('uraiTanggal', () => {
  it('format Indonesia dd/mm/yyyy dan variasinya', () => {
    expect(iso('20/07/2018')).toBe('2018-07-20');
    expect(iso('20-07-2018')).toBe('2018-07-20');
    expect(iso('20.07.2018')).toBe('2018-07-20');
    expect(iso('  20 / 07 / 2018 ')).toBe('2018-07-20');
    expect(iso('2/7/2018')).toBe('2018-07-02');
    expect(iso('20072018')).toBe('2018-07-20');
  });

  it('tahun dua digit memakai acuan tahun ini + 10', () => {
    expect(iso('2/7/18')).toBe('2018-07-02');
    expect(iso('1/1/36')).toBe('2036-01-01');
    expect(iso('1/1/37')).toBe('1937-01-01');
    expect(iso('5/3/95')).toBe('1995-03-05');
  });

  it('ISO yyyy-mm-dd', () => {
    expect(iso('2018-07-20')).toBe('2018-07-20');
    expect(iso('2018/7/2')).toBe('2018-07-02');
  });

  it('nama bulan Indonesia & Inggris', () => {
    expect(iso('20 jul 2018')).toBe('2018-07-20');
    expect(iso('20 Juli 2018')).toBe('2018-07-20');
    expect(iso('20-Agt-18')).toBe('2018-08-20');
    expect(iso('1 agustus 2020')).toBe('2020-08-01');
    expect(iso('3 Des 2019')).toBe('2019-12-03');
    expect(iso('3 dec 2019')).toBe('2019-12-03');
    expect(iso('17 Mei 1945')).toBe('1945-05-17');
    expect(iso('17 may 1945')).toBe('1945-05-17');
    expect(iso('9 Okt. 2001')).toBe('2001-10-09');
    expect(iso('20 jux 2018')).toBe('galat: Nama bulan "jux" tidak dikenal.');
  });

  it('kosong → null', () => {
    expect(uraiTanggal('')).toBeNull();
    expect(uraiTanggal('   ')).toBeNull();
  });

  it('menolak tanggal yang tidak ada', () => {
    expect(iso('30/02/2018')).toBe('galat: Tanggal 30 Februari 2018 tidak ada.');
    expect(iso('29/02/2019')).toBe('galat: Tanggal 29 Februari 2019 tidak ada.');
    expect(iso('29/02/2020')).toBe('2020-02-29');
    expect(iso('31/04/2018')).toBe('galat: Tanggal 31 April 2018 tidak ada.');
    expect(iso('00/01/2018')).toBe('galat: Tanggal 0 Januari 2018 tidak ada.');
    expect(iso('12/13/2018')).toBe('galat: Bulan 13 tidak ada (1–12).');
    expect(iso('abc')).toBe('galat: Format tanggal tidak dikenali. Contoh: 20/07/2018.');
  });

  it('menghormati min/max (jam diabaikan)', () => {
    const min = new Date(2000, 0, 1);
    const max = new Date(2026, 10, 21, 15, 30);
    expect(iso('31/12/1999', { min })).toBe('galat: Paling awal 1 Januari 2000.');
    expect(iso('01/01/2000', { min })).toBe('2000-01-01');
    expect(iso('21/11/2026', { max })).toBe('2026-11-21');
    expect(iso('22/11/2026', { max })).toBe('galat: Paling akhir 21 November 2026.');
  });
});

describe('formatIsianTanggal & indeksBulan', () => {
  it('format dd/mm/yyyy', () => {
    expect(formatIsianTanggal(new Date(2018, 6, 20))).toBe('20/07/2018');
    expect(formatIsianTanggal(null)).toBe('');
  });
  it('indeks bulan', () => {
    expect(indeksBulan('jan')).toBe(0);
    expect(indeksBulan('Nopember')).toBe(10);
    expect(indeksBulan('ju')).toBe(-1);
    expect(indeksBulan('jun')).toBe(5);
    expect(indeksBulan('jul')).toBe(6);
  });
});

describe('maskerTanggal', () => {
  /** Ketik karakter demi karakter seperti pengguna. */
  const ketik = (s: string) => [...s].reduce((teks, c) => maskerTanggal(teks + c, teks), '');
  it('menyisipkan garis miring saat mengetik angka', () => {
    expect(ketik('20072018')).toBe('20/07/2018');
    expect(ketik('200')).toBe('20/0');
  });
  it('garis miring yang diketik sendiri dihormati', () => {
    expect(ketik('20/07/2018')).toBe('20/07/2018');
    expect(ketik('2/7/18')).toBe('2/7/18');
    expect(ketik('20/7/18')).toBe('20/7/18');
  });
  it('ISO dan nama bulan tidak dirusak', () => {
    expect(ketik('2018-07-20')).toBe('2018-07-20');
    expect(ketik('20 jul 2018')).toBe('20 jul 2018');
    expect(ketik('20-07-2018')).toBe('20-07-2018');
  });
  it('menghapus tidak dimasker', () => {
    expect(maskerTanggal('20/0', '20/07')).toBe('20/0');
  });
  it('maksimal 8 angka', () => {
    expect(maskerTanggal('20/07/20189', '20/07/2018')).toBe('20/07/2018');
  });
});
