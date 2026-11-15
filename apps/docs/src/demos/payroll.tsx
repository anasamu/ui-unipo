import * as React from 'react';
import { DaftarSlipSaya, RekapGaji, SlipGaji, StatistikGaji, VerifikasiSlipGaji } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Payroll gaji',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/gaji: rekap payroll per periode, slip gaji siap cetak dengan QR verifikasi, halaman "Gaji saya" untuk pegawai, PPh 21 setahun, statistik payroll, dan halaman publik verifikasi slip. Gaji pokok, tunjangan, dan honor ditetapkan SDM berdasarkan SK; BAUK menghitung potongan, PPh 21 (TER), BPJS, dan membayar. Dipakai aplikasi BAUK dan aplikasi SDM (admin SDM membaca laporan).',
  importLine: "import { RekapGaji, SlipGaji, DaftarSlipSaya, PajakGajiSaya, StatistikGaji, VerifikasiSlipGaji, PilihPeriodeGaji } from 'unipo-ui/siakad';",
  demos: {
    Rekap: 'RekapGaji: ringkasan, peringatan, per pegawai/unit/komponen; klik pegawai untuk slip',
    Slip: 'SlipGaji: pendapatan, potongan, PPh 21, iuran universitas, terbilang, QR verifikasi',
    Saya: 'DaftarSlipSaya: halaman pegawai (slip per bulan dan PPh 21 setahun)',
    Statistik: 'StatistikGaji: beban vs tahun lalu, tren bulanan, per unit, komposisi, rata-rata per golongan',
    Verifikasi: 'VerifikasiSlipGaji: halaman publik untuk QR di slip cetak (tanpa nominal)',
  },
  props: [
    ['RekapGaji.denganRekening', 'boolean', 'Kolom rekening dan status bayar (pengelola BAUK). Aplikasi SDM cukup tanpa.'],
    ['RekapGaji.onPilihSlip', '(slipId) => void', 'Klik baris pegawai, mis. buka SlipGaji.'],
    ['SlipGaji.saya', 'boolean', 'Slip milik pegawai login (/v1/gaji/saya/{id}); tanpa ini memakai /slip/{id}/lengkap (pengelola).'],
    ['SlipGaji.tautanVerifikasi', '(kode) => string', 'Alamat halaman verifikasi untuk QR. Bawaan {origin}/verifikasi/slip/{kode}.'],
    ['StatistikGaji.onPilihPeriode', '(kode) => void', 'Klik periode di tabel, mis. buka rekap periode itu.'],
  ],
  notes: [
    'Scope token: gaji:read (laporan, slip saya). Admin SDM boleh membaca laporan; pengelola berlingkup unit hanya melihat unitnya.',
    'Slip tampil ke pegawai setelah payroll disetujui. QR verifikasi hanya muncul pada slip yang sudah terbit.',
    'Angka di halaman ini rekaan.',
  ],
};

export function Rekap() {
  const [slip, setSlip] = React.useState<number | null>(null);
  return slip ? <SlipGaji id={slip} onKembali={() => setSlip(null)} /> : <RekapGaji denganRekening onPilihSlip={setSlip} />;
}
export function Slip() {
  const b = Math.max(1, new Date().getMonth());
  return <SlipGaji id={b * 1000 + 3} penandatangan={[{ jabatan: 'Kepala BAUK', nama: 'Nurhayati Ali, S.E., M.Ak.' }]} />;
}
export function Saya() {
  return <DaftarSlipSaya />;
}
export function Statistik() {
  return <StatistikGaji />;
}
export function Verifikasi() {
  return <VerifikasiSlipGaji kode="A1B2C3D4E5F60002" />;
}
