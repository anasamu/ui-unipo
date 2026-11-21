import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DaftarDrive, driveDariUnit, type DriveBerkasData } from '../src/siakad/daftar-drive';
import {
  alihSematan,
  anakDrive,
  catatTerakhir,
  hakUmum,
  leluhurDrive,
  rapikanNamaUnit,
  saringDrive,
  simpulTerbuka,
  teksKuotaKaki,
} from '../src/siakad/drive-pohon';

const d = (id: string, nama: string, induk: string | null, hak: DriveBerkasData['hak'], unit_jenis = 'unit', singkatan: string | null = null): DriveBerkasData => ({
  id, jenis: id === 'pribadi' ? 'pribadi' : 'unit', unit_id: id.replace('unit:', ''), unit_jenis, induk, tingkat: 0, nama, singkatan, hak,
  ruang: { unit: id.replace('unit:', '') }, pakai: null, batas: null,
});

// Admin dengan banyak unit (nama seperti di arsip_unit).
const BANYAK: DriveBerkasData[] = [
  { ...d('pribadi', 'Berkas saya', null, 'pemilik'), pakai: { byte: 434_278, jumlah: 3 } },
  d('unit:univ', 'Universitas Pohuwato', null, 'kelola', 'universitas', 'UNIPO'),
  d('unit:fak-01', 'FAKULTAS ILMU KOMPUTER', 'unit:univ', 'kelola', 'fakultas', 'FIK'),
  d('unit:prodi-55201', 'Program Studi INFORMATIKA', 'unit:fak-01', 'pembaca', 'prodi', 'INF'),
  d('unit:prodi-57201', 'Program Studi SISTEM INFORMASI', 'unit:fak-01', 'kelola', 'prodi', 'SI'),
  d('unit:fak-04', 'FAKULTAS HUKUM', 'unit:univ', 'kelola', 'fakultas', 'FH'),
  d('unit:prodi-74201', 'Program Studi ILMU HUKUM', 'unit:fak-04', 'kelola', 'prodi', 'IH'),
  d('unit:fak-05', 'FAKULTAS ILMU SOSIAL DAN ILMU POLITIK', 'unit:univ', 'kelola', 'fakultas', 'FISIP'),
  d('unit:prodi-65201', 'Program Studi ILMU PEMERINTAHAN', 'unit:fak-05', 'kelola', 'prodi', 'IP'),
  d('unit:baak', 'Biro Administrasi Akademik', 'unit:univ', 'kelola', 'unit', 'BAAK'),
  d('unit:bauk', 'Biro Administrasi Umum dan Keuangan', 'unit:univ', 'kelola', 'unit', 'BAUK'),
];
// Dosen satu prodi: universitas dan fakultas hanya penanda jalur.
const SATU: DriveBerkasData[] = [
  d('pribadi', 'Berkas saya', null, 'pemilik'),
  d('unit:univ', 'Universitas Pohuwato', null, null, 'universitas', 'UNIPO'),
  d('unit:fak-01', 'FAKULTAS ILMU KOMPUTER', 'unit:univ', null, 'fakultas', 'FIK'),
  d('unit:prodi-55201', 'Program Studi INFORMATIKA', 'unit:fak-01', 'anggota', 'prodi', 'INF'),
];

const html = (props: Partial<React.ComponentProps<typeof DaftarDrive>> & { drive: DriveBerkasData[] }) =>
  renderToStaticMarkup(<DaftarDrive aktif="pribadi" onPilih={() => {}} ingat={false} {...props} />);

describe('nama unit', () => {
  it('merapikan nama berhuruf besar dan memendekkan prodi', () => {
    expect(rapikanNamaUnit('FAKULTAS ILMU SOSIAL DAN ILMU POLITIK', 'fakultas')).toBe('Fakultas Ilmu Sosial dan Ilmu Politik');
    expect(rapikanNamaUnit('Program Studi INFORMATIKA', 'prodi')).toBe('Informatika');
    expect(rapikanNamaUnit('Program Studi INFORMATIKA', 'prodi', { pendek: false })).toBe('Program Studi Informatika');
    expect(rapikanNamaUnit('Program Studi AGROTEKNOLOGI/AGROEKOTEKNOLOGI', 'prodi')).toBe('Agroteknologi/Agroekoteknologi');
  });
  it('membiarkan nama yang sudah rapi dan singkatan resmi', () => {
    expect(rapikanNamaUnit('UPT Pusat Teknologi Informasi')).toBe('UPT Pusat Teknologi Informasi');
    expect(rapikanNamaUnit('Biro Administrasi Akademik')).toBe('Biro Administrasi Akademik');
  });
});

describe('pohon drive', () => {
  const peta = new Map(BANYAK.map((x) => [x.id, x]));
  it('menyusun induk → anak dan leluhur', () => {
    const a = anakDrive(BANYAK);
    expect(a.get(null)?.map((x) => x.id)).toEqual(['pribadi', 'unit:univ']);
    expect(a.get('unit:fak-01')?.map((x) => x.id)).toEqual(['unit:prodi-55201', 'unit:prodi-57201']);
    expect(leluhurDrive(peta, 'unit:prodi-55201')).toEqual(['unit:fak-01', 'unit:univ']);
  });
  it('terlipat bawaan bila banyak, leluhur aktif selalu terbuka, pilihan pengguna diingat', () => {
    const dasar = { ingat: {}, banyak: true, leluhurAktif: new Set<string>() };
    expect(simpulTerbuka('unit:univ', { ...dasar, akar: true })).toBe(true);
    expect(simpulTerbuka('unit:fak-01', { ...dasar, akar: false })).toBe(false);
    expect(simpulTerbuka('unit:fak-01', { ...dasar, akar: false, leluhurAktif: new Set(['unit:fak-01']) })).toBe(true);
    expect(simpulTerbuka('unit:fak-01', { ...dasar, akar: false, ingat: { 'unit:fak-01': true } })).toBe(true);
    expect(simpulTerbuka('unit:univ', { ...dasar, akar: true, ingat: { 'unit:univ': false } })).toBe(false);
    expect(simpulTerbuka('unit:fak-01', { ...dasar, akar: false, banyak: false })).toBe(true);
  });
  it('mencari nama, nama rapi, atau singkatan beserta leluhurnya', () => {
    expect([...saringDrive(BANYAK, 'inf')!].sort()).toEqual(['unit:fak-01', 'unit:prodi-55201', 'unit:prodi-57201', 'unit:univ'].sort());
    expect([...saringDrive(BANYAK, 'fisip')!].sort()).toEqual(['unit:fak-05', 'unit:univ']);
    expect(saringDrive(BANYAK, '  ')).toBeNull();
  });
  it('hak mayoritas cukup disebut sekali', () => {
    expect(hakUmum(BANYAK)).toBe('kelola');
    expect(hakUmum(SATU)).toBeNull();
  });
  it('sematan dan terakhir dibuka', () => {
    expect(alihSematan(['a'], 'b')).toEqual(['a', 'b']);
    expect(alihSematan(['a', 'b'], 'a')).toEqual(['b']);
    expect(catatTerakhir(['a', 'b', 'c'], 'c', 3)).toEqual(['c', 'a', 'b']);
    expect(catatTerakhir(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
  it('teks kaki kuota tidak bergantung pada pemotongan', () => {
    expect(teksKuotaKaki('424,1 KB', null)).toEqual({ utama: '424,1 KB dipakai', ket: 'Kuota belum diatur' });
    expect(teksKuotaKaki('1 GB', '5 GB', 'Kolam FIK')).toEqual({ utama: '1 GB dari 5 GB', ket: 'Mengikuti Kolam FIK' });
  });
});

describe('DaftarDrive', () => {
  it('admin banyak unit: kotak cari, nama lengkap, tanpa teks hak berulang, tingkat kedua terlipat', () => {
    const h = html({ drive: BANYAK });
    expect(h).toContain('Cari di 10 unit');
    expect(h).toContain('Fakultas Ilmu Komputer');
    expect(h).toContain('>FIK<');
    expect(h).not.toContain('pengelola</small>');
    expect(h).toContain('Dapat dikelola');
    // Prodi di bawah fakultas terlipat bawaan (fakultas tampil, prodi tidak).
    expect(h).not.toContain('Sistem Informasi');
    expect((h.match(/data-hak="kelola"/g) ?? []).length).toBe(0);
  });
  it('unit aktif dan leluhurnya terbuka otomatis; hak minoritas diberi lencana', () => {
    const h = html({ drive: BANYAK, aktif: 'unit:prodi-55201' });
    expect(h).toContain('Informatika');
    expect(h).toContain('Sistem Informasi');
    expect(h).toContain('data-hak="pembaca"');
  });
  it('Berkas saya satu item di Pintasan dengan jumlah, tanpa judul bagian ganda; subfolder langsung di bawahnya', () => {
    const h = html({ drive: BANYAK, folder: <ul data-uji-folder="" />, terbaru: { aktif: false, onPilih: () => {} } });
    expect((h.match(/>Berkas saya</g) ?? []).length).toBe(1);
    expect(h).not.toContain('Semua berkas');
    expect(h).toMatch(/Berkas saya<\/span><span class="u-dd-jumlah">3</);
    expect(h).toContain('data-uji-folder');
  });
  it('akun satu unit: tanpa kotak cari, jalur terbuka sampai prodi', () => {
    const h = html({ drive: SATU });
    expect(h).not.toContain('Cari di');
    expect(h).toContain('Universitas Pohuwato');
    expect(h).toContain('Fakultas Ilmu Komputer');
    expect(h).toContain('Informatika');
  });
  it('mode ikon dengan banyak unit: hanya unit aktif + tombol Semua unit', () => {
    const h = html({ drive: BANYAK, aktif: 'unit:fak-04', ringkas: true, onLebarkan: () => {} });
    expect(h).toContain('Semua unit');
    expect(h).toContain('u-dd-huruf');
    expect(h).toContain('>FH<');
    expect(h).not.toContain('Fakultas Ilmu Komputer');
  });
});

describe('cadangan SIAKAD lama (daftar unit datar)', () => {
  it('banyak unit dikelompokkan menurut jenis', () => {
    const unit = [
      { kode: 'univ', nama: 'Universitas Pohuwato', jenis: 'universitas', akses: 'kelola' as const },
      ...['fak-01', 'fak-02', 'fak-03'].map((k) => ({ kode: k, nama: `FAKULTAS ${k}`, jenis: 'fakultas', akses: 'kelola' as const })),
      ...['p1', 'p2', 'p3', 'p4'].map((k) => ({ kode: k, nama: `Program Studi ${k}`, jenis: 'prodi', akses: 'kelola' as const })),
      { kode: 'baak', nama: 'Biro Administrasi Akademik', jenis: 'unit', akses: 'anggota' as const },
      { kode: 'bauk', nama: 'Biro Administrasi Umum dan Keuangan', jenis: 'unit', akses: 'anggota' as const },
    ];
    const dr = driveDariUnit(unit);
    expect(dr.filter((x) => x.hak === null).map((x) => x.nama)).toEqual(['Fakultas', 'Program studi', 'Biro, lembaga, dan UPT']);
    expect(dr.find((x) => x.id === 'unit:p1')?.induk).toBe('kelompok:prodi');
    expect(dr.find((x) => x.id === 'unit:univ')?.induk).toBeNull();
  });
  it('sedikit unit tetap datar', () => {
    expect(driveDariUnit([{ kode: 'baak', nama: 'BAAK', jenis: 'unit', akses: 'kelola' }]).every((x) => x.induk === null)).toBe(true);
  });
});
