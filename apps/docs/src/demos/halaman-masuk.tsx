import * as React from 'react';
import { HalamanPemeliharaan, SegmentedControl } from 'unipo-ui';
import { BAWAAN_MASUK, BAWAAN_MASUK_APLIKASI, PILIHAN_LATAR_MASUK, PILIHAN_TATA_MASUK, PratinjauHalamanMasuk, type LatarMasuk, type TataLetakMasuk } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Halaman masuk',
  category: 'Tata letak',
  layout: 'wide',
  order: 40,
  badge: 'baru',
  description:
    'Halaman masuk baku semua aplikasi bawaan UNIPO. Posisi panel (kiri, kanan, terbelah, kartu tengah, minimal), sisi visual (ilustrasi, foto, slider, gradien bergerak, pola, warna polos, daftar fitur), dan semua teks diatur dari pengaturan tema (bagian Halaman masuk, panel samping bertahap dengan pratinjau desktop/tablet/ponsel) dan berlaku tanpa deploy ulang. Responsif lewat container query, mode gelap, dan menghormati prefers-reduced-motion. Bila konfigurasi BFF belum lengkap, yang tampil HalamanPemeliharaan tanpa nama isian .env.',
  importLine: "import { HalamanMasuk, PengaturanHalamanMasuk, useTataMasuk } from 'unipo-ui/siakad';\nimport { HalamanPemeliharaan } from 'unipo-ui';",
  demos: { Varian: 'Tata letak dan sisi visual (pratinjau)', Pemeliharaan: 'Konfigurasi aplikasi belum lengkap' },
  props: [
    ['aplikasi', 'string', 'Kode tema aplikasi (dashboard, baak, bauk, lms, ...). Pengaturan dibaca dari GET /v1/tema/{aplikasi} (publik).'],
    ['lingkup', 'string', 'Lingkup tema, mis. kode fakultas.'],
    ['logo / nama', 'ReactNode / string', 'Logo aplikasi dan nama untuk {nama} di teks.'],
    ['hrefMasuk / labelMasuk', 'string / ReactNode', 'Alamat masuk SSO lewat BFF (bawaan /bff/masuk) dan label tombol.'],
    ['galat / ditolak / keluar', 'ReactNode / boolean / boolean', 'Pesan dari BFF atau ?galat=, penolakan akses, dan "Anda sudah keluar".'],
    ['pemeliharaan', 'boolean', 'Konfigurasi aplikasi belum lengkap: tampilkan HalamanPemeliharaan (nama isian tidak pernah ditampilkan).'],
    ['opsiLain / children', 'ReactNode', 'Cara masuk lain yang sudah didukung aplikasi di bawah tombol SSO, atau ganti seluruh bagian tombol (formulir akun).'],
    ['bawaan', 'Partial<TataMasuk>', 'Bawaan khusus aplikasi (mis. foto banner fakultas). Pengaturan tema tetap menimpanya.'],
    ['judul / keterangan / catatan / atas', 'ReactNode', 'Teks khusus satu halaman (mis. "Daftar akun") dan isi di atas judul (tautan kembali).'],
    ['kunciMode', 'string', 'Kunci localStorage terang/gelap aplikasi; tanpa ini tombol mode tidak tampil.'],
    ['tata / berkas / pratinjau', 'TataMasuk / Record / boolean', 'Untuk pratinjau di pengaturan: pengaturan langsung, peta berkas:<uuid>, dan mode tidak aktif.'],
  ],
};

export function Varian() {
  const [tata, setTata] = React.useState<TataLetakMasuk>('kiri');
  const [latar, setLatar] = React.useState<LatarMasuk>('gradien');
  const t = { ...BAWAAN_MASUK, ...BAWAAN_MASUK_APLIKASI.dashboard, tata, latar, poin: BAWAAN_MASUK_APLIKASI.sdm!.poin! };
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <SegmentedControl<TataLetakMasuk> value={tata} onValueChange={setTata} options={PILIHAN_TATA_MASUK.map(({ value, label }) => ({ value, label }))} aria-label="Tata letak" />
      <SegmentedControl<LatarMasuk> value={latar} onValueChange={setLatar} options={PILIHAN_LATAR_MASUK.filter((x) => x.value !== 'gambar' && x.value !== 'slider').map(({ value, label }) => ({ value, label }))} aria-label="Sisi visual" />
      <PratinjauHalamanMasuk aplikasi="dashboard" nama="Dasbor Pimpinan" tata={t} />
    </div>
  );
}

export function Pemeliharaan() {
  return (
    <div style={{ height: 560, overflow: 'auto', borderRadius: 12, border: '1px solid var(--u-border)' }}>
      <HalamanPemeliharaan />
    </div>
  );
}
