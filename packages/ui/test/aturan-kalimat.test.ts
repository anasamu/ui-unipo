import { describe, expect, it } from 'vitest';
import { labelTitik, namaIndikatorAwam, ringkasKetentuan, type Aturan } from '../src/siakad/aturan';

type Isi = Pick<Aturan, 'jenis' | 'kondisi' | 'parameter'>;
const aturan = (x: Record<string, unknown>) => x as unknown as Isi;

describe('ringkasKetentuan aman untuk data kosong & jenis baru', () => {
  it('jenis akibat baru tidak menghasilkan "undefined"', () => {
    const t = ringkasKetentuan(aturan({ jenis: 'akibat', kondisi: null, parameter: { akibat: 'hitung', bentuk: 'predikat' } }));
    expect(t).not.toContain('undefined');
    expect(t).toBe('Menghitung nilai');
  });
  it('jenis tak dikenal tanpa parameter memakai label umum', () => {
    expect(ringkasKetentuan(aturan({ jenis: 'apa_saja', kondisi: null, parameter: null }))).toBe('Ketentuan khusus');
  });
  it('akibat dengan kondisi menyertakan "bila"', () => {
    const t = ringkasKetentuan(aturan({ jenis: 'akibat', kondisi: { semua: [{ indikator: 'angkatan', op: '>=', nilai: '20261' }] }, parameter: { akibat: 'ubah_tagihan' } }));
    expect(t.startsWith('Mengubah tagihan bila')).toBe(true);
    expect(t).not.toContain('undefined');
  });
  it('batas nilai tanpa target tidak menulis undefined', () => {
    expect(ringkasKetentuan(aturan({ jenis: 'batas_nilai', kondisi: null, parameter: { op: '>=' } }))).not.toContain('undefined');
  });
  it('batas nilai dengan tingkat dan nilai kosong memakai tanda pisah', () => {
    const t = ringkasKetentuan(aturan({ jenis: 'batas_nilai', kondisi: null, parameter: { target: 'sks_diambil', op: '<=', tabel: [{ nilai: null }] } }));
    expect(t).toContain('paling banyak');
    expect(t).toContain('—');
    expect(t).not.toContain('undefined');
  });
});

describe('labelTitik', () => {
  it('memakai judul katalog bila ada', () => expect(labelTitik('krs.ambil', 'Ambil KRS')).toBe('Ambil KRS'));
  it('menyusun nama awam dari kode', () => {
    expect(labelTitik('kelulusan.predikat')).toBe('Predikat kelulusan');
    expect(labelTitik('nilai.konversi')).toBe('Konversi nilai');
    expect(labelTitik('kustom.skor_toefl')).toBe('Skor toefl');
  });
  it('kode kosong', () => expect(labelTitik(null)).toBe('—'));
});

describe('namaIndikatorAwam', () => {
  it('kode indikator tidak tampil mentah', () => {
    expect(namaIndikatorAwam('dosen_jumlah_pa')).toBe('Dosen jumlah PA');
    expect(namaIndikatorAwam('ips_lalu')).toBe('IPS lalu');
  });
});
