import * as React from 'react';
import { Pilihan } from 'unipo-ui';
import { KartuWidget, KisiWidgetUnit, WidgetPengajuan, type JenisWidgetUnit, type PengajuanRingkas, type VarianWidget } from 'unipo-ui/siakad';
import { Wallet } from 'lucide-react';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Widget per unit',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 8,
  badge: 'baru',
  description:
    'Widget ringkas untuk beranda tiap unit: SDM, dosen, tendik, BAAK, mahasiswa, SPMI, LP2M, keuangan, PMB, arsip, surat, dan presensi, masing-masing langsung memuat data lewat SDK. Lima varian tampilan (kartu, ringkas, cincin, baris, sorot) dan widget lacak pengajuan dengan tahap alur. Kisi menyesuaikan perangkat: satu kolom di mobile, beberapa kolom di desktop.',
  importLine:
    "import { KisiWidgetUnit, KartuWidget, WidgetSdm, WidgetDosen, WidgetTendik, WidgetBaak, WidgetMahasiswa, WidgetSpmi, WidgetLppm, WidgetKeuangan, WidgetPmb, WidgetArsip, WidgetSurat, WidgetPresensi, WidgetPengajuan } from 'unipo-ui/siakad';",
  demos: {
    Kisi: 'KisiWidgetUnit: semua widget unit, pilih varian',
    Pengajuan: 'WidgetPengajuan: daftar, linimasa, kartu',
    Kustom: 'KartuWidget dengan data sendiri',
  },
  props: [
    ['KisiWidgetUnit.widget', "('sdm' | 'dosen' | 'tendik' | 'baak' | 'mahasiswa' | 'spmi' | 'lppm' | 'keuangan' | 'pmb' | 'arsip' | 'surat' | 'presensi')[]", 'Widget yang ditampilkan, berurutan.'],
    ['varian', "'kartu' | 'ringkas' | 'cincin' | 'baris' | 'sorot'", 'Berlaku untuk semua widget.'],
    ['href', 'Partial<Record<JenisWidgetUnit, string>>', 'Tautan "Lihat detail" per widget.'],
    ['WidgetPengajuan.items', 'PengajuanRingkas[]', '{ id, judul, nomor, tanggal, langkah, status, href }; data dari modul mana pun.'],
    ['KartuWidget.data', 'DataWidget', '{ judul, ikon, nilai, satuan, keterangan, rasio, bagian, rincian, tren, langkah, lencana, warna } untuk widget buatan sendiri.'],
  ],
  notes: [
    'Sumber data: /v1/sdm/ringkasan, /v1/akademik/ringkasan, /v1/spmi/dasbor, /v1/lppm/rekap, /v1/keu/serapan, /v1/pmb/statistik, /v1/arsip/laporan, /v1/presensi/ringkasan. Widget tanpa izin baca menampilkan galat dengan kode laporan.',
    'Data di halaman ini rekaan.',
  ],
};

const SEMUA: JenisWidgetUnit[] = ['sdm', 'dosen', 'tendik', 'baak', 'mahasiswa', 'spmi', 'lppm', 'keuangan', 'pmb', 'arsip', 'surat', 'presensi'];

export function Kisi() {
  const [v, setV] = React.useState<VarianWidget>('kartu');
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <Pilihan value={v} onValueChange={(x) => setV(x as VarianWidget)} options={(['kartu', 'ringkas', 'cincin', 'baris', 'sorot'] as const).map((x) => ({ value: x, label: x }))} />
      <KisiWidgetUnit widget={SEMUA} varian={v} />
    </div>
  );
}

const PENGAJUAN: PengajuanRingkas[] = [
  {
    id: 1,
    judul: 'Surat keterangan aktif kuliah',
    nomor: 'SK-2026-0112',
    tanggal: '12 Nov 2026',
    langkah: [{ label: 'Diajukan', status: 'selesai' }, { label: 'Verifikasi prodi', status: 'selesai' }, { label: 'Tanda tangan dekan', status: 'aktif' }, { label: 'Selesai' }],
    status: { teks: 'Diproses', tone: 'info' },
  },
  {
    id: 2,
    judul: 'Cuti akademik semester genap',
    nomor: 'CT-2026-0031',
    tanggal: '9 Nov 2026',
    langkah: [{ label: 'Diajukan', status: 'selesai' }, { label: 'Dosen PA', status: 'selesai' }, { label: 'Kaprodi', status: 'gagal', keterangan: 'Lengkapi surat orang tua' }, { label: 'BAAK' }],
    status: { teks: 'Perlu perbaikan', tone: 'warning' },
  },
  {
    id: 3,
    judul: 'Dispensasi pembayaran SPP',
    nomor: 'DP-2026-0204',
    tanggal: '2 Nov 2026',
    langkah: [
      { label: 'Diajukan', status: 'selesai' },
      { label: 'BAUK', status: 'selesai' },
      { label: 'Wakil rektor II', status: 'selesai' },
    ],
    status: { teks: 'Disetujui', tone: 'success' },
  },
];

export function Pengajuan() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <WidgetPengajuan items={PENGAJUAN} varian="daftar" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <WidgetPengajuan judul="Lacak: cuti akademik" items={[PENGAJUAN[1]!]} varian="linimasa" />
        <WidgetPengajuan judul="Pengajuan surat" items={PENGAJUAN} varian="kartu" />
      </div>
      <WidgetPengajuan items={[]} kosong="Belum ada pengajuan. Ajukan surat dari menu Layanan." />
    </div>
  );
}

export function Kustom() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
      {(['kartu', 'cincin', 'sorot'] as const).map((v) => (
        <KartuWidget
          key={v}
          varian={v}
          data={{
            judul: 'Penerimaan hari ini',
            ikon: <Wallet />,
            nilai: 'Rp18,4 jt',
            keterangan: '42 transaksi di 3 loket',
            rasio: 0.61,
            rasioLabel: '61% dari target harian',
            tren: [8, 11, 9, 14, 12, 16, 18],
            rincian: [
              { label: 'Tunai', nilai: 'Rp7,2 jt' },
              { label: 'Transfer/VA', nilai: 'Rp11,2 jt' },
            ],
          }}
        />
      ))}
    </div>
  );
}
