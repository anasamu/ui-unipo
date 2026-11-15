import * as React from 'react';
import { KerangkaLaporan, PilihPeriode, StatistikRingkas, TabelLaporan, TabelRekap, labelPeriode, rekapKeCsv, rentangPreset, tabelLaporanKeCsv, terbilang, type BarisLaporan, type KolomRekap } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Laporan dan statistik',
  category: 'Statistik',
  layout: 'wide',
  order: 1,
  badge: 'baru',
  description:
    'Bahan bersama untuk laporan di semua aplikasi UNIPO: kerangka laporan dengan tombol Cetak/PDF dan CSV (yang dicetak hanya laporan itu, lengkap dengan kepala surat dan tanda tangan), tabel laporan berjenjang dengan format akuntansi, tabel rekap dengan batang proporsi dan baris total, pemilih periode, dan deret kartu statistik.',
  importLine: "import { KerangkaLaporan, TabelLaporan, TabelRekap, StatistikRingkas, PilihPeriode, unduhCsv, formatAkuntansi, terbilang } from 'unipo-ui';",
  demos: {
    Kerangka: 'KerangkaLaporan + TabelLaporan: laporan berjenjang dengan subtotal, total, dan angka negatif dalam kurung',
    Rekap: 'TabelRekap: rekap per prodi dengan batang proporsi, persen berwarna, dan baris total',
    Statistik: 'StatistikRingkas: kartu angka dengan perubahan, progres, dan tren',
  },
  props: [
    ['KerangkaLaporan.csv', '{ namaFile, data: () => { kolom, baris } }', 'Munculkan tombol CSV. Pemisah titik koma dan BOM UTF-8 agar terbuka rapi di Excel berbahasa Indonesia.'],
    ['KerangkaLaporan.penandatangan', 'Penandatangan[]', 'Blok tanda tangan di bawah laporan (jabatan, nama, NIP).'],
    ['KerangkaLaporan.periode', 'ReactNode', 'Tampil di kepala layar dan kepala cetak. Pakai labelPeriode({ dari, sampai }).'],
    ['BarisLaporan.jenis', "'grup' | 'item' | 'subtotal' | 'total' | 'catatan'", 'Gaya baris; subtotal bergaris tunggal, total bergaris ganda.'],
    ['KolomLaporan.format', "'akuntansi' | 'rupiah' | 'rupiah-ringkas' | 'angka' | 'persen' | 'teks'", 'Bawaan akuntansi: negatif dalam kurung, nol sebagai "–".'],
    ['KolomRekap.batang', 'boolean', 'Batang proporsi di sel angka; untuk persen diberi warna baik/sedang/buruk.'],
  ],
  notes: [
    'Tombol cetak menandai laporan terdekat lalu mencetak; bagian lain halaman disembunyikan lewat @media print, jadi tidak perlu halaman cetak terpisah.',
    `terbilang(1250000) menghasilkan "${terbilang(1250000)}".`,
  ],
};

export function Kerangka() {
  const [r, setR] = React.useState(() => rentangPreset('tahun_ini'));
  const kolom = [{ label: 'Tahun ini' }, { label: 'Tahun lalu' }];
  const baris: BarisLaporan[] = [
    { jenis: 'grup', label: 'Pendapatan' },
    { label: 'UKT/SPP', kode: '4.1.01', nilai: [9_850_000_000, 9_120_000_000], tingkat: 1 },
    { label: 'Uang gedung', kode: '4.1.02', nilai: [1_240_000_000, 1_310_000_000], tingkat: 1 },
    { jenis: 'subtotal', label: 'Jumlah pendapatan', nilai: [11_090_000_000, 10_430_000_000], tingkat: 1 },
    { jenis: 'grup', label: 'Beban' },
    { label: 'Beban gaji dosen', kode: '5.1.01', nilai: [4_620_000_000, 4_380_000_000], tingkat: 1 },
    { label: 'Beban gaji tendik', kode: '5.1.02', nilai: [2_180_000_000, 2_050_000_000], tingkat: 1 },
    { label: 'Selisih kurs', kode: '5.9.01', nilai: [-12_000_000, 0], tingkat: 1 },
    { jenis: 'subtotal', label: 'Jumlah beban', nilai: [6_788_000_000, 6_430_000_000], tingkat: 1 },
    { jenis: 'total', label: 'Surplus', nilai: [4_302_000_000, 4_000_000_000] },
  ];
  return (
    <KerangkaLaporan
      judul="Laporan aktivitas"
      deskripsi="Pendapatan dan beban selama periode."
      periode={labelPeriode(r)}
      unit="Biro Administrasi Umum dan Keuangan"
      filter={<PilihPeriode value={r} onChange={setR} />}
      csv={{ namaFile: 'laporan-aktivitas', data: () => tabelLaporanKeCsv(kolom, baris, { denganKode: true }) }}
      penandatangan={[
        { jabatan: 'Kepala BAUK', nama: 'Nurhayati Ali, S.E., M.Ak.', nomor: 'NIP 198403122010012003' },
        { jabatan: 'Rektor', tempatTanggal: 'Marisa, 16 November 2026', nama: 'Dr. Ir. Hasan Basri, M.Si.' },
      ]}
      catatan={<p>Disusun dari jurnal yang sudah diposting.</p>}
    >
      <TabelLaporan kolom={kolom} baris={baris} denganKode />
    </KerangkaLaporan>
  );
}

type Prodi = { kode: string; prodi: string; mahasiswa: number; tagihan: number; persen: number };
const DATA: Prodi[] = [
  { kode: '55201', prodi: 'Informatika', mahasiswa: 412, tagihan: 1_640_000_000, persen: 92.4 },
  { kode: '57201', prodi: 'Sistem Informasi', mahasiswa: 288, tagihan: 1_120_000_000, persen: 81.2 },
  { kode: '61201', prodi: 'Manajemen', mahasiswa: 356, tagihan: 1_390_000_000, persen: 74.5 },
  { kode: '62201', prodi: 'Akuntansi', mahasiswa: 201, tagihan: 780_000_000, persen: 63.0 },
];
export function Rekap() {
  const kolom: KolomRekap<Prodi>[] = [
    { key: 'prodi', label: 'Program studi', nilai: (b) => b.prodi, format: 'teks' },
    { key: 'mhs', label: 'Mahasiswa', nilai: (b) => b.mahasiswa, total: true },
    { key: 'tagihan', label: 'Tagihan', nilai: (b) => b.tagihan, format: 'akuntansi', total: true, batang: true },
    { key: 'persen', label: 'Terbayar', nilai: (b) => b.persen, format: 'persen', batang: true },
  ];
  return (
    <KerangkaLaporan judul="Tagihan per program studi" csv={{ namaFile: 'tagihan-prodi', data: () => rekapKeCsv(kolom, DATA) }}>
      <TabelRekap kolom={kolom} baris={DATA} kunci={(b) => b.kode} onPilih={() => undefined} />
    </KerangkaLaporan>
  );
}

export function Statistik() {
  return (
    <StatistikRingkas
      items={[
        { label: 'Penerimaan tahun ini', nilai: 11_090_000_000, format: 'rupiah-ringkas', perubahan: 6.3, tren: [3, 5, 4, 6, 8, 7, 9] },
        { label: 'Piutang semester', nilai: 1_110_000_000, format: 'rupiah-ringkas', perubahan: -4.1, terbalik: true, progres: 80.2, keterangan: '80,2% tagihan sudah dibayar' },
        { label: 'Mahasiswa membayar', nilai: 1257, perubahan: 2.4 },
        { label: 'Rasio beban gaji', nilai: 61.2, format: 'persen', nada: 'warning' },
      ]}
    />
  );
}
