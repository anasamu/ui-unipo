import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bacaPrefBerkas,
  jenisAwam,
  jenisBerkas,
  kelompokkanBerkas,
  klikKolom,
  rapikanPref,
  simpanPrefBerkas,
  urutDariServer,
  urutKeServer,
  urutkanBerkas,
  urutkanFolder,
} from '../src/siakad/berkas-finder';

const b = (nama: string, ukuran: number, dibuat_at: string, pemilik?: string) => ({ nama, ukuran, dibuat_at, ekstensi: nama.split('.').pop(), pemilik });
const DAFTAR = [
  b('Laporan.pdf', 400_000, '2026-11-20 10:00:00', 'ani'),
  b('foto 10.png', 2_000_000, '2026-11-21 08:00:00', 'budi'),
  b('foto 2.jpg', 150_000, '2026-11-14 08:00:00', 'ani'),
  b('Rekap.xlsx', 90_000, '2026-10-02 08:00:00'),
  b('Surat.docx', 50_000, '2026-11-19 08:00:00', 'budi'),
  b('Data.zip', 30_000_000, '2025-12-01 08:00:00'),
  b('catatan.txt', 1_000, '2026-11-21 07:00:00'),
];
const nama = (x: Array<{ nama: string }>) => x.map((y) => y.nama);

describe('jenis berkas', () => {
  it('memberi nama jenis awam', () => {
    expect(jenisAwam({ nama: 'a.png' })).toBe('Gambar PNG');
    expect(jenisAwam({ nama: 'a.jpeg' })).toBe('Gambar JPG');
    expect(jenisAwam({ ekstensi: 'PDF' })).toBe('Dokumen PDF');
    expect(jenisAwam({ nama: 'a.xlsx' })).toBe('Spreadsheet Excel');
    expect(jenisAwam({ nama: 'a.docx' })).toBe('Dokumen Word');
    expect(jenisAwam({ nama: 'a.txt' })).toBe('Teks');
    expect(jenisAwam({ nama: 'a.zip' })).toBe('Arsip ZIP');
    expect(jenisAwam({ nama: 'a.xyz' })).toBe('Berkas XYZ');
    expect(jenisAwam({ nama: 'tanpa-ekstensi' })).toBe('Berkas');
    expect(jenisAwam({ nama: 'kamera', mime: 'image/webp' })).toBe('Gambar');
  });
  it('menggolongkan dari ekstensi atau MIME', () => {
    expect(jenisBerkas({ nama: 'x.pptx' })).toBe('presentasi');
    expect(jenisBerkas({ nama: 'x', mime: 'video/mp4' })).toBe('video');
    expect(jenisBerkas({ nama: 'x.bin' })).toBe('lain');
  });
});

describe('urut per kolom', () => {
  it('klik kolom membalik arah, kolom baru pakai arah bawaan', () => {
    expect(klikKolom({ kunci: 'nama', arah: 'naik' }, 'nama')).toEqual({ kunci: 'nama', arah: 'turun' });
    expect(klikKolom({ kunci: 'nama', arah: 'naik' }, 'ukuran')).toEqual({ kunci: 'ukuran', arah: 'turun' });
    expect(klikKolom({ kunci: 'ukuran', arah: 'turun' }, 'jenis')).toEqual({ kunci: 'jenis', arah: 'naik' });
  });
  it('memetakan ke parameter server dan kembali', () => {
    expect(urutKeServer({ kunci: 'tanggal', arah: 'turun' })).toBe('baru');
    expect(urutKeServer({ kunci: 'tanggal', arah: 'naik' })).toBe('lama');
    expect(urutKeServer({ kunci: 'ukuran', arah: 'turun' })).toBe('-ukuran');
    expect(urutKeServer({ kunci: 'nama', arah: 'turun' })).toBe('-nama');
    expect(urutKeServer({ kunci: 'jenis', arah: 'turun' })).toBe('nama');
    for (const s of ['baru', 'lama', 'nama', '-nama', 'ukuran', '-ukuran'] as const) expect(urutKeServer(urutDariServer(s))).toBe(s);
    expect(urutDariServer('ngawur')).toEqual({ kunci: 'tanggal', arah: 'turun' });
  });
  it('mengurutkan nama secara alami (foto 2 sebelum foto 10)', () => {
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'nama', arah: 'naik' }))).toEqual(['catatan.txt', 'Data.zip', 'foto 2.jpg', 'foto 10.png', 'Laporan.pdf', 'Rekap.xlsx', 'Surat.docx']);
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'nama', arah: 'turun' }))[0]).toBe('Surat.docx');
  });
  it('mengurutkan ukuran dan tanggal', () => {
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'ukuran', arah: 'turun' })).slice(0, 2)).toEqual(['Data.zip', 'foto 10.png']);
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'tanggal', arah: 'turun' })).slice(0, 2)).toEqual(['foto 10.png', 'catatan.txt']);
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'tanggal', arah: 'naik' }))[0]).toBe('Data.zip');
  });
  it('mengurutkan jenis: dokumen, PDF, spreadsheet, gambar, arsip', () => {
    expect(nama(urutkanBerkas(DAFTAR, { kunci: 'jenis', arah: 'naik' }))).toEqual(['Surat.docx', 'catatan.txt', 'Laporan.pdf', 'Rekap.xlsx', 'foto 2.jpg', 'foto 10.png', 'Data.zip']);
  });
  it('tidak mengubah larik asal', () => {
    const salin = [...DAFTAR];
    urutkanBerkas(DAFTAR, { kunci: 'ukuran', arah: 'naik' });
    expect(DAFTAR).toEqual(salin);
  });
  it('mengurutkan folder', () => {
    const f = [
      { nama: 'Surat', total_ukuran: 10, terakhir_isi_at: '2026-01-01 00:00:00' },
      { nama: 'arsip', total_ukuran: 99, terakhir_isi_at: '2026-05-01 00:00:00' },
    ];
    expect(nama(urutkanFolder(f, { kunci: 'nama', arah: 'naik' }))).toEqual(['arsip', 'Surat']);
    expect(nama(urutkanFolder(f, { kunci: 'ukuran', arah: 'naik' }))).toEqual(['Surat', 'arsip']);
    expect(nama(urutkanFolder(f, { kunci: 'tanggal', arah: 'turun' }))).toEqual(['arsip', 'Surat']);
    expect(nama(urutkanFolder(f, { kunci: 'jenis', arah: 'turun' }))).toEqual(['arsip', 'Surat']);
  });
});

describe('kelompok', () => {
  const sekarang = new Date(2026, 10, 21, 12, 0);
  it('per jenis dengan judul dan urutan tetap', () => {
    const k = kelompokkanBerkas(urutkanBerkas(DAFTAR, { kunci: 'nama', arah: 'naik' }), 'jenis', sekarang);
    expect(k.map((x) => [x.label, x.isi.length])).toEqual([
      ['Dokumen', 2],
      ['Dokumen PDF', 1],
      ['Spreadsheet', 1],
      ['Gambar', 2],
      ['Arsip', 1],
    ]);
    // urutan di dalam kelompok mengikuti urutan masukan
    expect(nama(k[3].isi)).toEqual(['foto 2.jpg', 'foto 10.png']);
  });
  it('per tanggal', () => {
    const k = kelompokkanBerkas(DAFTAR, 'tanggal', sekarang);
    expect(k.map((x) => x.label)).toEqual(['Hari ini', 'Kemarin', '7 hari terakhir', '30 hari terakhir', 'Oktober', 'Desember 2025']);
    expect(nama(k[0].isi)).toEqual(['foto 10.png', 'catatan.txt']);
  });
  it('per ukuran dan pemilik', () => {
    expect(kelompokkanBerkas(DAFTAR, 'ukuran', sekarang).map((x) => x.kunci)).toEqual(['besar', 'sedang', 'kecil', 'mini']);
    expect(kelompokkanBerkas(DAFTAR, 'pemilik', sekarang).map((x) => x.label)).toEqual(['ani', 'budi', 'Tanpa keterangan pemilik']);
  });
  it('tanpa kelompok = satu kelompok, daftar kosong = tanpa kelompok', () => {
    expect(kelompokkanBerkas(DAFTAR, 'tidak')).toHaveLength(1);
    expect(kelompokkanBerkas([], 'jenis')).toEqual([]);
    expect(kelompokkanBerkas([], 'tidak')).toEqual([]);
  });
});

describe('preferensi', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('membuang nilai rusak', () => {
    expect(rapikanPref({ tampilan: 'kolom', kelompok: 'x', urut: { kunci: 'jenis', arah: 'turun' }, samping: 'ikon', lebar: 9999, info: true })).toEqual({
      tampilan: 'kolom',
      urut: { kunci: 'jenis', arah: 'turun' },
      samping: 'ikon',
      info: true,
    });
    expect(rapikanPref('rusak')).toEqual({});
  });
  it('menyimpan dan membaca, termasuk saat localStorage melempar', () => {
    const isi = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => isi.get(k) ?? null, setItem: (k: string, v: string) => void isi.set(k, v) });
    simpanPrefBerkas({ tampilan: 'daftar' });
    simpanPrefBerkas({ kelompok: 'jenis' });
    expect(bacaPrefBerkas()).toEqual({ tampilan: 'daftar', kelompok: 'jenis' });
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('diblokir');
      },
      setItem: () => {
        throw new Error('diblokir');
      },
    });
    expect(bacaPrefBerkas()).toEqual({});
    expect(() => simpanPrefBerkas({ tampilan: 'ikon' })).not.toThrow();
  });
});
