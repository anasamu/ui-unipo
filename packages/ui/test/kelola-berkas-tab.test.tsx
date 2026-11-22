import { describe, expect, it } from 'vitest';
import { bukaKelolaBerkas, dengarKelolaBerkas, tabKelolaAktif, type BukaKelolaBerkas } from '../src/siakad/berkas-cepat';

describe('Kelola berkas: tab tambahan aplikasi', () => {
  const tab = [{ value: 'arsip' }, { value: 'lain' }];
  it('tab diminta dibuka bila ada; tab tak dikenal kembali ke file manager', () => {
    expect(tabKelolaAktif('arsip', tab, true)).toBe('arsip');
    expect(tabKelolaAktif('berkas', tab, true)).toBe('berkas');
    expect(tabKelolaAktif('arsip', [], true)).toBe('berkas');
    expect(tabKelolaAktif('tidak-ada', tab, true)).toBe('berkas');
  });
  it('tanpa akses file manager: tab tambahan pertama', () => {
    expect(tabKelolaAktif('berkas', tab, false)).toBe('arsip');
    expect(tabKelolaAktif('lain', tab, false)).toBe('lain');
  });
});

describe('bukaKelolaBerkas', () => {
  it('permintaan sebelum bilah atas terpasang ditunda lalu dijalankan sekali', () => {
    bukaKelolaBerkas({ tab: 'arsip' });
    const masuk: BukaKelolaBerkas[] = [];
    const lepas = dengarKelolaBerkas((p) => masuk.push(p));
    expect(masuk).toEqual([{ tab: 'arsip' }]);
    lepas();
    const kedua: BukaKelolaBerkas[] = [];
    const lepas2 = dengarKelolaBerkas((p) => kedua.push(p));
    expect(kedua).toEqual([]);
    lepas2();
  });
  it('pendengar terpasang menerima permintaan langsung; string = nama tab', () => {
    const masuk: BukaKelolaBerkas[] = [];
    const lepas = dengarKelolaBerkas((p) => masuk.push(p));
    bukaKelolaBerkas('arsip');
    bukaKelolaBerkas({ ruang: 'sampah' });
    expect(masuk).toEqual([{ tab: 'arsip' }, { ruang: 'sampah' }]);
    lepas();
  });
});
