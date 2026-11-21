import { describe, expect, it } from 'vitest';
import { kalimatIzinPengatur, labelIzinPengatur, ringkasPengatur, type BarisPengatur } from '../src/siakad/aturan-pengatur';
import { pesanGalatAturanBaru } from '../src/siakad/aturan-sk';

const b = (titik: string | null, jenis: 'peran' | 'izin', kode: string): BarisPengatur => ({ titik, jenis, kode });
const umum = [b(null, 'izin', 'aturan:akademik'), b(null, 'peran', 'bak'), b(null, 'peran', 'staf-baak'), b(null, 'peran', 'kepala-baak')];
const katalog: Record<string, { judul: string; kelompok: string }> = {
  'pmb.daftar': { judul: 'Pendaftaran PMB', kelompok: 'PMB' },
  'pmb.daftar_ulang': { judul: 'Daftar ulang PMB', kelompok: 'PMB' },
  'akademik.pa.tetapkan': { judul: 'Penetapan dosen PA', kelompok: 'Akademik' },
  'ta.pembimbing.tetapkan': { judul: 'Penetapan pembimbing', kelompok: 'Akademik' },
  'edom.isi': { judul: 'Pengisian EDOM', kelompok: 'Akademik' },
};
const titik = (k: string) => (katalog[k] ? { kode: k, ...katalog[k] } : undefined);

describe('ringkasPengatur (tab Pengatur)', () => {
  const data = [
    ...umum,
    ...['pmb.daftar', 'pmb.daftar_ulang'].flatMap((t) => [b(t, 'izin', 'aturan:akademik'), b(t, 'peran', 'ketua-pmb'), b(t, 'peran', 'panitia-pmb')]),
    ...['akademik.pa.tetapkan', 'ta.pembimbing.tetapkan'].flatMap((t) => [...umum.map((u) => ({ ...u, titik: t })), b(t, 'izin', 'fakultas.aturan.kelola')]),
    ...umum.map((u) => ({ ...u, titik: 'edom.isi' })),
  ];
  const r = ringkasPengatur(data, titik, 'Akademik');

  it('titik berpengatur sama dikelompokkan, tidak diulang per titik', () => {
    expect(r.khusus).toHaveLength(2);
    expect(r.khusus.map((g) => g.titik.length)).toEqual([2, 2]);
  });
  it('titik yang sama dengan pengatur kategori tidak masuk kelompok khusus', () => {
    expect(r.samaDenganKategori.map((t) => t.kode)).toEqual(['edom.isi']);
  });
  it('kelompok yang mewarisi kategori hanya menampilkan tambahan', () => {
    const fak = r.khusus.find((g) => g.titik[0].kode === 'akademik.pa.tetapkan')!;
    expect(fak.mewarisi).toBe(true);
    expect(fak.tambahPeran).toEqual([]);
    expect(fak.tambahIzin).toEqual(['fakultas.aturan.kelola']);
  });
  it('kelompok PMB (di luar bidang kategori) di bawah dan berlabel kelompoknya', () => {
    const pmb = r.khusus[r.khusus.length - 1];
    expect(pmb.titik.every((t) => t.kelompok === 'PMB')).toBe(true);
    expect(pmb.mewarisi).toBe(false);
    expect(pmb.peran).toEqual(['ketua-pmb', 'panitia-pmb']);
  });
});

describe('ringkasPengatur: langkah menambah peran tanpa izin kategori', () => {
  it('EDOM: pengatur kategori + Operator SPMI, izin kategori tidak berlaku', () => {
    const data = [...umum, ...umum.filter((u) => u.jenis === 'peran').map((u) => ({ ...u, titik: 'edom.isi' })), b('edom.isi', 'peran', 'operator-spmi')];
    const [g] = ringkasPengatur(data, titik, 'Akademik').khusus;
    expect(g.mewarisi).toBe(true);
    expect(g.tambahPeran).toEqual(['operator-spmi']);
    expect(g.kurangIzin).toEqual(['aturan:akademik']);
  });
});

describe('label izin awam', () => {
  it('izin teknis menjadi nama awam', () => {
    expect(labelIzinPengatur('aturan:akademik')).toBe('Mengatur aturan akademik');
    expect(labelIzinPengatur('fakultas.aturan.kelola')).toBe('Mengatur aturan fakultas');
    expect(labelIzinPengatur('x.y', 'Nama RBAC')).toBe('Nama RBAC');
    expect(kalimatIzinPengatur(['aturan:akademik', 'fakultas.aturan.kelola'])).toBe('siapa pun yang punya izin Mengatur aturan akademik atau Mengatur aturan fakultas');
    expect(kalimatIzinPengatur(['aturan:akademik', 'fakultas.aturan.kelola'])).not.toMatch(/aturan:|\.kelola/);
  });
});

describe('pesanGalatAturanBaru (API SIAKAD belum diperbarui)', () => {
  it('422 details.id dari server lama dijelaskan', () => {
    expect(pesanGalatAturanBaru({ status: 422, code: 'validation_failed', details: { id: 'uuid aturan' } })).toMatch(/belum tersedia di server SIAKAD/);
  });
  it('404 route_not_found dijelaskan', () => {
    expect(pesanGalatAturanBaru({ status: 404, code: 'route_not_found' })).toMatch(/pembaruan SIAKAD/);
  });
  it('galat lain memakai pesan bawaan', () => {
    expect(pesanGalatAturanBaru({ status: 422, code: 'validation_failed', details: { unit: 'wajib' } })).toBeNull();
    expect(pesanGalatAturanBaru({ status: 404, code: 'not_found' })).toBeNull();
    expect(pesanGalatAturanBaru(null)).toBeNull();
  });
});
