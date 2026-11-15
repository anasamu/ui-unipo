import { KasUnit, KebijakanUnit, LaporanKeuangan, StatistikKeuangan, TransparansiBiaya } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Keuangan universitas',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 6,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/keu: laporan keuangan entitas nirlaba (posisi keuangan, aktivitas, arus kas, neraca saldo) dari buku besar, kas per unit (fakultas ikut menjumlah prodi), transparansi biaya kuliah per prodi dan jenis biaya, statistik keuangan, dan SOP/kebijakan yang berlaku dari SPMI. Dipakai aplikasi BAUK bauk.unipo.ac.id dan dasbor fakultas.',
  importLine: "import { LaporanKeuangan, KasUnit, TransparansiBiaya, StatistikKeuangan, KebijakanUnit } from 'unipo-ui/siakad';",
  demos: {
    Laporan: 'LaporanKeuangan: empat laporan dengan pembanding, cetak/PDF, CSV',
    Kas: 'KasUnit: saldo kas per unit dan per rekening',
    Transparansi: 'TransparansiBiaya: tarif dan realisasi per jenis biaya dan prodi',
    Statistik: 'StatistikKeuangan: penerimaan, piutang, belanja, kas',
    Kebijakan: 'KebijakanUnit: SOP dan kebijakan unit dari SPMI (publik)',
  },
  props: [
    ['LaporanKeuangan.jenis', "'posisi' | 'aktivitas' | 'arus-kas' | 'neraca-saldo'", 'Laporan awal; pilihJenis=false untuk satu laporan saja.'],
    ['LaporanKeuangan.onPilihAkun', '(akunId) => void', 'Klik baris akun, mis. buka buku besar akun.'],
    ['unit_id', 'number', 'Batasi ke satu unit (pengelola unit otomatis dibatasi server).'],
    ['TransparansiBiaya.denganRealisasi', 'boolean', 'false untuk halaman publik: cukup tarif per prodi dan jenis biaya.'],
    ['KebijakanUnit.unit', 'string | number', 'Kode atau id unit SPMI, mis. "bauk"; turunan ikut bawaan.'],
  ],
  notes: ['Scope token: keu:read. Dokumen SOP/kebijakan dibaca dari /v1/spmi/publik/dokumen (publik, hanya yang disahkan dan ditandai publik).', 'Angka di halaman ini rekaan.'],
};

export function Laporan() {
  return <LaporanKeuangan penandatangan={[{ jabatan: 'Kepala BAUK', nama: 'Nurhayati Ali, S.E., M.Ak.' }]} />;
}
export function Kas() {
  return <KasUnit />;
}
export function Transparansi() {
  return <TransparansiBiaya />;
}
export function Statistik() {
  return <StatistikKeuangan />;
}
export function Kebijakan() {
  return <KebijakanUnit unit="bauk" />;
}
