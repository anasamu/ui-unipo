import { describe, expect, it } from 'vitest';
import { formatRibuan, keAngka, teksAngka, gabungTanggalWaktu, geserJam, periksaBatasAngka, pisahTanggalWaktu, rapikanKetikan, uraiAngka, uraiJam } from '../src/lib/angka';
import { periksaIsianTanya } from '../src/components/aksi';
import { saringBerkasLokal } from '../src/components/pilih-berkas-lokal';
import { saringIkon, IKON_PILIHAN, warnaToken } from '../src/components/pilih-tampilan';
import { urutkanAksi } from '../src/components/aksi';

describe('formatRibuan & uraiAngka', () => {
  it('format gaya Indonesia', () => {
    expect(formatRibuan(25000000)).toBe('25.000.000');
    expect(formatRibuan(1.5, 2)).toBe('1,5');
    expect(formatRibuan(null)).toBe('');
    expect(formatRibuan(-1200)).toBe('-1.200');
  });
  it('urai ketikan uang dan angka', () => {
    expect(uraiAngka('25.000.000')).toEqual({ ok: true, nilai: 25000000 });
    expect(uraiAngka('Rp 25.000')).toEqual({ ok: true, nilai: 25000 });
    expect(uraiAngka('')).toEqual({ ok: true, nilai: null });
    expect(uraiAngka('1,5', { desimal: 2 })).toEqual({ ok: true, nilai: 1.5 });
    expect(uraiAngka('1,555', { desimal: 2 })).toMatchObject({ ok: false });
    expect(uraiAngka('1,5')).toEqual({ ok: false, pesan: 'Isi tanpa angka di belakang koma.' });
    expect(uraiAngka('-3')).toEqual({ ok: false, pesan: 'Angka tidak boleh negatif.' });
    expect(uraiAngka('-3', { negatif: true })).toEqual({ ok: true, nilai: -3 });
    expect(uraiAngka('12a')).toEqual({ ok: false, pesan: 'Isi dengan angka saja.' });
    expect(uraiAngka('99999999999999999999')).toEqual({ ok: false, pesan: 'Angka terlalu besar.' });
  });
  it('rapikan ketikan menjaga posisi kursor', () => {
    // ketik "5" di ujung "2500" → "25.005", kursor di ujung
    expect(rapikanKetikan('25005', 5)).toEqual({ teks: '25.005', kursor: 6 });
    // sisip "0" setelah "1" pada "1.000" (kursor 2) → "10.000", kursor setelah dua digit = posisi 2
    expect(rapikanKetikan('10.000', 2)).toEqual({ teks: '10.000', kursor: 2 });
    expect(rapikanKetikan('1000000', 7).teks).toBe('1.000.000');
    // nol di depan dibuang
    expect(rapikanKetikan('0012', 4)).toEqual({ teks: '12', kursor: 2 });
    // desimal
    expect(rapikanKetikan('1234,56', 7, { desimal: 2 })).toEqual({ teks: '1.234,56', kursor: 8 });
    expect(rapikanKetikan('1234,567', 8, { desimal: 2 }).teks).toBe('1.234,56');
    // huruf dibuang
    expect(rapikanKetikan('12x3', 4).teks).toBe('123');
    expect(rapikanKetikan('-5000', 5, { negatif: true }).teks).toBe('-5.000');
  });
  it('pesan batas awam', () => {
    const rp = (n: number) => `Rp ${formatRibuan(n)}`;
    expect(periksaBatasAngka(500, { min: 1000, fmt: rp })).toBe('Paling sedikit Rp 1.000.');
    expect(periksaBatasAngka(5e7, { max: 2.5e7, fmt: rp })).toBe('Paling banyak Rp 25.000.000.');
    expect(periksaBatasAngka(null, { wajib: true })).toBe('Wajib diisi.');
    expect(periksaBatasAngka(null, {})).toBeNull();
  });
});

describe('jam & tanggal-waktu', () => {
  it('urai jam', () => {
    expect(uraiJam('8')).toEqual({ ok: true, nilai: '08:00' });
    expect(uraiJam('08.30')).toEqual({ ok: true, nilai: '08:30' });
    expect(uraiJam('0830')).toEqual({ ok: true, nilai: '08:30' });
    expect(uraiJam('830')).toEqual({ ok: true, nilai: '08:30' });
    expect(uraiJam('20:15')).toEqual({ ok: true, nilai: '20:15' });
    expect(uraiJam('')).toEqual({ ok: true, nilai: null });
    expect(uraiJam('25:00')).toEqual({ ok: false, pesan: 'Jam harus 00 sampai 23.' });
    expect(uraiJam('10:75')).toEqual({ ok: false, pesan: 'Menit harus 00 sampai 59.' });
    expect(uraiJam('jam 8')).toMatchObject({ ok: false });
  });
  it('geser jam berputar', () => {
    expect(geserJam('23:50', 15)).toBe('00:05');
    expect(geserJam('00:00', -15)).toBe('23:45');
    expect(geserJam(null, 60)).toBe('01:00');
  });
  it('pisah dan gabung nilai API', () => {
    expect(pisahTanggalWaktu('2026-11-22T08:30')).toEqual({ tanggal: '2026-11-22', jam: '08:30' });
    expect(pisahTanggalWaktu('2026-11-22 08:30:00')).toEqual({ tanggal: '2026-11-22', jam: '08:30' });
    expect(pisahTanggalWaktu('2026-11-22')).toEqual({ tanggal: '2026-11-22', jam: null });
    expect(pisahTanggalWaktu(null)).toEqual({ tanggal: null, jam: null });
    expect(gabungTanggalWaktu('2026-11-22', '08:30')).toBe('2026-11-22T08:30');
    expect(gabungTanggalWaktu('2026-11-22', '08:30', 'sql')).toBe('2026-11-22 08:30:00');
    expect(gabungTanggalWaktu(null, '08:30')).toBeNull();
  });
});

describe('aksi, ikon, warna', () => {
  it('validasi isian tanya (pengganti prompt)', () => {
    expect(periksaIsianTanya('  ', {})).toBe('Wajib diisi.');
    expect(periksaIsianTanya('', { wajib: false })).toBeNull();
    expect(periksaIsianTanya('abc', { min: 5 })).toBe('Tulis paling sedikit 5 huruf (sekarang 3).');
    expect(periksaIsianTanya('abcdef', { maks: 5 })).toBe('Paling banyak 5 huruf (sekarang 6).');
    expect(periksaIsianTanya('audit rutin', { min: 5, periksa: (t) => (t.includes('rutin') ? null : 'x') })).toBeNull();
  });
  it('urutan aksi baku: utama paling kanan, yang disembunyikan dibuang', () => {
    const r = urutkanAksi([
      { kunci: 'simpan', label: 'Simpan', nada: 'utama' },
      { kunci: 'hapus', label: 'Hapus', nada: 'bahaya' },
      { kunci: 'batal', label: 'Batal' },
      { kunci: 'rahasia', label: 'X', sembunyi: true },
    ]).map((a) => a.kunci);
    expect(r).toEqual(['batal', 'hapus', 'simpan']);
  });
  it('saring ikon dengan kata Indonesia', () => {
    expect(saringIkon(IKON_PILIHAN, 'keuangan')).toContain('Wallet');
    expect(saringIkon(IKON_PILIHAN, 'wisuda')).toContain('GraduationCap');
    expect(saringIkon(IKON_PILIHAN, '').length).toBe(Object.keys(IKON_PILIHAN).length);
    expect(saringIkon(IKON_PILIHAN, 'zzz')).toEqual([]);
    expect(warnaToken('success')).toBe('var(--u-success)');
  });
});

describe('isian tanpa titik ribuan & keAngka', () => {
  it('ribuan=false untuk tahun', () => {
    expect(formatRibuan(2026, 0, false)).toBe('2026');
    expect(rapikanKetikan('2026', 4, { ribuan: false })).toEqual({ teks: '2026', kursor: 4 });
    expect(rapikanKetikan('2026', 4).teks).toBe('2.026');
  });
  it('keAngka/teksAngka menjembatani state teks formulir', () => {
    expect(keAngka('')).toBeNull();
    expect(keAngka(null)).toBeNull();
    expect(keAngka(undefined)).toBeNull();
    expect(keAngka('12')).toBe(12);
    expect(keAngka('3,25')).toBe(3.25);
    expect(keAngka(7)).toBe(7);
    expect(keAngka('abc')).toBeNull();
    expect(teksAngka(null)).toBe('');
    expect(teksAngka(2.5)).toBe('2.5');
  });
});

describe('saringBerkasLokal', () => {
  const berkas = (nama: string, ukuran: number, tipe = '') => new File([new Uint8Array(ukuran)], nama, { type: tipe });
  it('menyaring jenis dan ukuran dengan pesan awam', () => {
    const r = saringBerkasLokal([berkas('a.pdf', 10, 'application/pdf'), berkas('b.exe', 10), berkas('c.PDF', 5000)], { accept: '.pdf', maxSize: 1000 });
    expect(r.lolos.map((f) => f.name)).toEqual(['a.pdf']);
    expect(r.pesan).toContain('b.exe: jenis berkas tidak diterima');
    expect(r.pesan).toContain('c.PDF: melebihi batas');
  });
  it('menerima pola mime image/*', () => {
    expect(saringBerkasLokal([berkas('x.png', 1, 'image/png')], { accept: 'image/*' }).lolos).toHaveLength(1);
  });
});
