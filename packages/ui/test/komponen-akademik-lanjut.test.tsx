import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { penentuSkala, type BarisSkalaNilai } from '../src/siakad/komponen-akademik/skala';
import { LembarTranskrip } from '../src/siakad/komponen-akademik/transkrip';
import { LembarKhs } from '../src/siakad/komponen-akademik/khs';
import { JadwalMingguan, tataJadwal } from '../src/siakad/komponen-akademik/jadwal';
import { MENIT_PER_SKS_BAWAAN, menitPerSksDari } from '../src/siakad/komponen-akademik/hooks';
import {
  FormIsiKrs,
  PesanAturanKrs,
  bentrokPilihan,
  bodyAjukanKrs,
  cariBentrok,
  pesanHasilAjukan,
  ringkasPilihanKrs,
  type SlotKuliah,
} from '../src/siakad/komponen-akademik/isi-krs';
import type { PenawaranKrs } from '../src/siakad/alur';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// m_nilai dua versi: 20201 (D tidak ada, C lulus) dan 20231 (D tidak lulus, B+ baru).
const M_NILAI: BarisSkalaNilai[] = [
  { tahun_id: '20201', nilai: 'A', bobot: 4, lulus: 1, nilai_min: 80, nilai_max: 100 },
  { tahun_id: '20201', nilai: 'B', bobot: 3, lulus: 1, nilai_min: 65, nilai_max: 79.99 },
  { tahun_id: '20201', nilai: 'C', bobot: 2, lulus: 1, nilai_min: 50, nilai_max: 64.99 },
  { tahun_id: '20201', nilai: 'D', bobot: 1, lulus: 1, nilai_min: 40, nilai_max: 49.99 },
  { tahun_id: '20201', nilai: 'E', bobot: 0, lulus: 0, nilai_min: 0, nilai_max: 39.99 },
  { tahun_id: '20231', nilai: 'A', bobot: 4, lulus: 1, nilai_min: 85, nilai_max: 100 },
  { tahun_id: '20231', nilai: 'B+', bobot: 3.5, lulus: 1, nilai_min: 75, nilai_max: 84.99 },
  { tahun_id: '20231', nilai: 'B', bobot: 3, lulus: 1, nilai_min: 65, nilai_max: 74.99 },
  { tahun_id: '20231', nilai: 'C', bobot: 2, lulus: 1, nilai_min: 50, nilai_max: 64.99 },
  { tahun_id: '20231', nilai: 'D', bobot: 1, lulus: 0, nilai_min: 40, nilai_max: 49.99 },
  { tahun_id: '20231', nilai: 'E', bobot: 0, lulus: 0, nilai_min: 0, nilai_max: 39.99 },
];

describe('skala nilai per periode mata kuliah (keputusan Anas 13:17)', () => {
  it('penentuSkala: tiap periode memakai versi m_nilai terbaru yang tidak melewatinya', () => {
    const untuk = penentuSkala(M_NILAI);
    expect(untuk('20211').find((s) => s.huruf === 'D')?.lulus).toBe(true);
    expect(untuk('20241').find((s) => s.huruf === 'D')?.lulus).toBe(false);
    expect(untuk('20211').some((s) => s.huruf === 'B+')).toBe(false);
    // Fungsi periode → skala (mis. skala aturan kurikulum dari server) juga diterima.
    const f = penentuSkala((t) => (t && t >= '20231' ? [{ huruf: 'A', bobot: 4, min: 85, maks: 100, lulus: true }] : [{ huruf: 'A', bobot: 4, min: 80, maks: 100, lulus: true }]));
    expect(f('20221')[0]!.min).toBe(80);
    expect(f('20241')[0]!.min).toBe(85);
  });
  it('LembarTranskrip: nilai D periode lama berwarna lulus, D periode baru tidak lulus; legenda per versi', () => {
    const data = {
      nim: '2001001',
      mata_kuliah: [
        { kode_mk: 'A1', nama_mk: 'Kalkulus', tahun_id: '20201', semester: 1, sks: 3, nilai_huruf: 'D', bobot: 1, mutu: 3 },
        { kode_mk: 'A2', nama_mk: 'Statistika', tahun_id: '20232', semester: 6, sks: 3, nilai_huruf: 'D', bobot: 1, mutu: 3 },
      ],
    };
    const h = html(<LembarTranskrip data={data} skala={M_NILAI} tampilan="tabel" />);
    // Dua lencana D: satu nada lulus (warning/primary), satu danger (tidak lulus).
    const tabel = h.slice(h.indexOf('u-ak-transkrip-isi'), h.indexOf('u-ak-cetak"'));
    const nada = [...tabel.matchAll(/class="u-ak-nilai[^"]*" data-nada="([a-z]+)"[^>]*>D</g)].map((m) => m[1]);
    expect(nada).toHaveLength(2);
    expect(nada).toContain('danger');
    expect(nada.filter((n) => n !== 'danger')).toHaveLength(1);
    expect(h).toContain('u-ak-legenda-versi');
    expect(h).toContain('Skala nilai');
  });
  it('LembarKhs: skala versi periode KHS yang ditampilkan', () => {
    const periode = [{ tahun_id: '20201', mata_kuliah: [{ kode_mk: 'A1', nama_mk: 'Kalkulus', sks: 3, nilai_huruf: 'D', bobot: 1, mutu: 3 }], ips: { nilai: 1 } }];
    const h = html(<LembarKhs periode={periode} skala={M_NILAI} />);
    expect(h).not.toContain('B+');
    expect(h).toMatch(/data-nada="(warning|primary|success)"[^>]*>D</);
  });
});

describe('menit per SKS dari aturan beban SKS', () => {
  it('menitPerSksDari: nilai aturan server, bawaan 50 bila kosong/tidak valid', () => {
    expect(menitPerSksDari({ menit_per_sks: 60 })).toBe(60);
    expect(menitPerSksDari(null)).toBe(MENIT_PER_SKS_BAWAAN);
    expect(menitPerSksDari({ menit_per_sks: 0 })).toBe(50);
    expect(MENIT_PER_SKS_BAWAAN).toBe(50);
  });
  it('tinggi sesi tanpa jam selesai = SKS × menit per SKS aturan', () => {
    const j = [{ idj: 1, hari: '1', jam_mulai: '07:00', sks: 3, nama_mk: 'X' }];
    expect(tataJadwal(j).sesi[0]!.selesai - tataJadwal(j).sesi[0]!.mulai).toBe(150);
    expect(tataJadwal(j, menitPerSksDari({ menit_per_sks: 40 })).sesi[0]!.selesai - 420).toBe(120);
    // JadwalMingguan: tanpa SDK memakai bawaan 50; dengan nilai aturan tinggi kotak berubah.
    const a = html(<JadwalMingguan jadwal={j} kini={new Date(2026, 10, 23, 6, 0)} />);
    const b = html(<JadwalMingguan jadwal={j} menitPerSks={60} kini={new Date(2026, 10, 23, 6, 0)} />);
    expect(a).not.toEqual(b);
    expect(b).toContain('u-ak-kisi-sesi');
  });
});

const PENAWARAN: PenawaranKrs = {
  nim: '2301001',
  tahun_id: '20261',
  boleh_ambil: true,
  batas_sks: 9,
  sks_terambil: 3,
  aturan: { titik: 'krs.ambil', boleh: true, pelanggaran: [], peringatan: [{ pesan: 'Batas SKS mengikuti SK Rektor No. 12/2026.' }] },
  mata_kuliah: [
    { id: 1, kode_mk: 'INF101', nama_mk: 'Algoritma', semester: 1, sks: 3, sudah_diambil: true, bisa_dipilih: true, pilih_kelas: true, kelas: [{ idj: 11, kelas: 'A', hari: '1', jamke: 1, jam_mulai: '07:30', jam_selesai: '10:00' }] },
    {
      id: 2,
      kode_mk: 'INF102',
      nama_mk: 'Basis Data',
      semester: 1,
      sks: 3,
      sudah_diambil: false,
      bisa_dipilih: true,
      pilih_kelas: true,
      kelas: [
        { idj: 21, kelas: 'A', hari: '1', jamke: 2, jam_mulai: '09:00', jam_selesai: '11:30', nama_ruang: 'Lab 1' },
        { idj: 22, kelas: 'B', hari: '2', jamke: 1, jam_mulai: '07:30', jam_selesai: '10:00' },
        { idj: 23, kelas: 'C', hari: '3', jamke: 1, penuh: true },
      ],
    },
    { id: 3, kode_mk: 'INF103', nama_mk: 'Jaringan', semester: 2, sks: 3, sudah_diambil: false, bisa_dipilih: true, pilih_kelas: true, kelas: [{ idj: 31, kelas: 'A', hari: '2', jamke: 2, jam_mulai: '09:00', jam_selesai: '11:30' }] },
    { id: 4, kode_mk: 'INF201', nama_mk: 'Kecerdasan Buatan', semester: 3, sks: 3, sudah_diambil: false, bisa_dipilih: false, keterangan: 'Prasyarat Algoritma belum lulus', pilih_kelas: true, kelas: [] },
  ],
};
const KRS_ADA = [{ idkrs: 9, kode_mk: 'INF101', nama_mk: 'Algoritma', sks: 3, hari: '1', jam_ke: 1, jam_mulai: '07:30', jam_selesai: '10:00' }];

describe('isi KRS: bentrok jadwal, SKS terhadap batas server', () => {
  it('cariBentrok: irisan jam di hari sama; jam ke-n sama bila tanpa jam; hari beda aman', () => {
    const s: SlotKuliah[] = [
      { kunci: 'a', label: 'A', hari: '1', jam_mulai: '07:30', jam_selesai: '10:00' },
      { kunci: 'b', label: 'B', hari: '1', jam_mulai: '09:00', jam_selesai: '11:30' },
      { kunci: 'c', label: 'C', hari: '1', jam_mulai: '10:00', jam_selesai: '12:00' },
      { kunci: 'd', label: 'D', hari: 'Selasa', jam_ke: 3 },
      { kunci: 'e', label: 'E', hari: '2', jam_ke: 3 },
      { kunci: 'f', label: 'F', hari: '3', jam_mulai: '07:30', jam_selesai: '10:00' },
    ];
    const b = cariBentrok(s).map((x) => `${x.a.label}-${x.b.label}`);
    expect(b).toEqual(['A-B', 'B-C', 'D-E']);
    // Jam selesai kosong diperkirakan SKS × menit per SKS (aturan beban SKS).
    const t: SlotKuliah[] = [
      { kunci: 'x', label: 'X', hari: '4', jam_mulai: '07:00', sks: 3 },
      { kunci: 'y', label: 'Y', hari: '4', jam_mulai: '09:20' },
    ];
    expect(cariBentrok(t, 50)).toHaveLength(1); // 07.00 + 150 menit = 09.30
    expect(cariBentrok(t, 40)).toHaveLength(0); // 07.00 + 120 menit = 09.00
  });
  it('bentrokPilihan: kelas baru vs KRS yang ada', () => {
    expect(bentrokPilihan(PENAWARAN, { 2: 21 }, KRS_ADA)).toHaveLength(1);
    expect(bentrokPilihan(PENAWARAN, { 2: 22 }, KRS_ADA)).toHaveLength(0);
    // Sesama pilihan baru: Basis Data B (Selasa 07.30–10.00) vs Jaringan A (Selasa 09.00–11.30).
    expect(bentrokPilihan(PENAWARAN, { 2: 22, 3: 31 }, KRS_ADA)).toHaveLength(1);
  });
  it('ringkasPilihanKrs: SKS terhadap batas_sks server, kelas belum dipilih, body POST', () => {
    const r = ringkasPilihanKrs(PENAWARAN, { 2: 22, 3: null });
    expect(r).toMatchObject({ sksBaru: 6, sksTerambil: 3, total: 9, batas: 9, lebih: false });
    expect(r.belumKelas.map((m) => m.id)).toEqual([3]);
    expect(ringkasPilihanKrs({ ...PENAWARAN, batas_sks: 6 }, { 2: 22 }).lebih).toBe(false);
    expect(ringkasPilihanKrs({ ...PENAWARAN, batas_sks: 5 }, { 2: 22 }).lebih).toBe(true);
    expect(bodyAjukanKrs({ 2: 22, 3: null })).toEqual({ mata_kuliah: [{ id: 2, idj: 22 }, { id: 3 }] });
  });
  it('pesan hasil server: melebihi batas, bentrok, kelas penuh; semua tersimpan = null', () => {
    expect(pesanHasilAjukan({ melebihi_batas_sks: true, batas_sks: 9 })).toContain('melebihi batas 9');
    expect(pesanHasilAjukan({ bentrok: [{}], kelas_belum_terpilih_atau_penuh: [{}, {}] })).toContain('1 mata kuliah bentrok');
    expect(pesanHasilAjukan({ tersimpan: [{}], bentrok: [] })).toBeNull();
  });
  it('FormIsiKrs: semester, sudah di KRS, prasyarat dari server, kelas penuh & bentrok ditandai', () => {
    const h = html(<FormIsiKrs penawaran={PENAWARAN} pilihan={{ 2: 21 }} onPilihanChange={() => {}} krsAda={KRS_ADA} />);
    expect(h).toContain('Semester 1');
    expect(h).toContain('Sudah di KRS');
    expect(h).toContain('Prasyarat Algoritma belum lulus');
    expect(h).toContain('Penuh');
    expect(h).toContain('Bentrok');
    expect(h).toContain('bentrok dengan Algoritma');
    expect(h).not.toMatch(/<(input|select|table)\b(?![^>]*type="(checkbox|radio|hidden)")[^>]*class="(?!u-)/);
  });
  it('PesanAturanKrs: pelanggaran/peringatan ber-SK apa adanya', () => {
    const h = html(<PesanAturanKrs aturan={{ pelanggaran: [{ pesan: 'Tagihan semester belum lunas.' }], peringatan: PENAWARAN.aturan!.peringatan }} pesan={['Masa KRS berakhir 30 Agustus.']} />);
    expect(h).toContain('Tagihan semester belum lunas.');
    expect(h).toContain('SK Rektor No. 12/2026');
    expect(h).toContain('Masa KRS berakhir');
    expect(html(<PesanAturanKrs aturan={null} />)).toBe('');
  });
});
