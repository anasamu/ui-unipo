import { describe, expect, it } from 'vitest';
import { cocokTahapan, kodeTahapan } from '../src/components/calendar';
import { olahKalenderBulan, presetDariPeriode } from '../src/siakad/kalender-tanggal';

describe('olahKalenderBulan', () => {
  const data = olahKalenderBulan([
    { sumber: 'libur', jenis: 'libur', judul: 'Hari Raya Natal', mulai: '2026-12-25', selesai: null, libur: true },
    { sumber: 'libur', jenis: 'cuti_bersama', judul: 'Cuti bersama', mulai: '2026-12-24', selesai: '2026-12-26', libur: true },
    { sumber: 'tahun', jenis: 'ujian', tahap: 'uts', judul: 'UTS Ganjil 2026/2027', mulai: '2026-11-12', selesai: '2026-11-17', tahun_id: '20261' } as never,
    { sumber: 'tahun', jenis: 'perkuliahan', tahap: 'perkuliahan', judul: 'Perkuliahan Ganjil 2026/2027', mulai: '2026-09-01 08:00:00', selesai: '2027-01-05' } as never,
    { sumber: 'kalender', jenis: 'rapat', judul: 'Rapat senat', mulai: '2026-11-24', selesai: null },
    { sumber: 'pmb', jenis: 'pmb', judul: 'PMB (tidak diminta)', mulai: '2026-11-24', selesai: null },
  ]);
  it('libur per tanggal, rentang libur dibentangkan, nama digabung', () => {
    expect(data.libur['2026-12-25']).toBe('Hari Raya Natal; Cuti bersama');
    expect(data.libur['2026-12-24']).toBe('Cuti bersama');
    expect(data.libur['2026-12-26']).toBe('Cuti bersama');
  });
  it('tahapan beberapa hari jadi latar; perkuliahan tanpa latar; jam dibuang', () => {
    expect(data.tahapan.map((t) => [t.judul, t.latar, t.mulai])).toEqual([
      ['UTS Ganjil 2026/2027', true, '2026-11-12'],
      ['Perkuliahan Ganjil 2026/2027', false, '2026-09-01'],
    ]);
  });
  it('agenda satu hari jadi titik; sumber di luar daftar dilewati', () => {
    expect(data.agenda['2026-11-24']).toEqual([{ judul: 'Rapat senat', jenis: 'rapat', warna: null }]);
  });
});

describe('cocokTahapan', () => {
  it('kode modern dan kolom lama', () => {
    expect(cocokTahapan({ tahap: 'perubahan_krs', jenis: 'krs' }, 'krs')).toBe(true);
    expect(cocokTahapan({ tahap: 'krs_online_mulai', jenis: 'krs' }, 'krs')).toBe(true);
    expect(cocokTahapan({ tahap: 'uts_mulai', jenis: 'ujian' }, ['uts', 'uas'])).toBe(true);
    expect(cocokTahapan({ tahap: 'input_nilai_dosen', jenis: 'nilai' }, 'nilai')).toBe(true);
    expect(cocokTahapan({ tahap: 'uas', jenis: 'ujian' }, 'uts')).toBe(false);
    expect(cocokTahapan({ tahap: null, jenis: 'wisuda' }, 'wisuda')).toBe(true);
    expect(kodeTahapan({ tahap: 'kuliah_mulai', jenis: 'perkuliahan' })).toBe('perkuliahan');
  });
});

describe('presetDariPeriode', () => {
  const t = (tahap: string, jenis: string, mulai: string, selesai: string) => ({ sumber: 'tahun', jenis, tahap, judul: `${tahap} Ganjil`, mulai, selesai });
  const periode = [
    { tahun_id: '20262', nama: 'Genap 2026/2027', aktif: false, tahap: [t('krs', 'krs', '2027-01-20', '2027-01-30')] },
    {
      tahun_id: '20261',
      nama: 'Ganjil 2026/2027',
      aktif: true,
      tahap: [t('krs', 'krs', '2026-08-18', '2026-09-01'), t('perubahan_krs', 'krs', '2026-09-02', '2026-09-09'), t('uts', 'ujian', '2026-11-12', '2026-11-17'), t('uas', 'ujian', '2027-01-04', '2027-01-12')],
    },
  ];
  it('periode yang memuat hari ini: Semester ini, Periode KRS (bukan perubahan), Masa UTS, Masa UAS', () => {
    const p = presetDariPeriode(periode as never, new Date(2026, 10, 21));
    const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    expect(p.map((x) => [x.label, iso(x.dari), iso(x.sampai)])).toEqual([
      ['Semester ini', '2026-8-18', '2027-1-12'],
      ['Periode KRS', '2026-8-18', '2026-9-1'],
      ['Masa UTS', '2026-11-12', '2026-11-17'],
      ['Masa UAS', '2027-1-4', '2027-1-12'],
    ]);
  });
  it('tanpa data → kosong', () => {
    expect(presetDariPeriode([])).toEqual([]);
  });
});
