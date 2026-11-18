import * as React from 'react';
import { Card, CardContent } from 'unipo-ui';
import { KartuSK, KelolaSK, PilihSK, RiwayatSK, type SKRegistri } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Registri SK (PilihSK, KartuSK, KelolaSK)',
  category: 'Terhubung SDK',
  layout: 'narrow',
  order: 4,
  badge: 'baru',
  description:
    'Satu SK dicatat sekali oleh unit penerbitnya di registri SK tunggal (SIAKAD /v1/sk). Form di semua aplikasi memakai PilihSK dan menyimpan sk_id: nomor, tanggal, penandatangan (dari data pejabat), tempat, dan berkas diambil dari registri, tidak diketik ulang atau diunggah ulang. Nomor yang sama dengan tulisan berbeda (spasi, huruf besar, tanda baca, nol depan) langsung disarankan. SK yang belum tercatat diajukan pencatatannya ke penerbit.',
  importLine: "import { PilihSK, KartuSK, KelolaSK, RiwayatSK, useSK } from 'unipo-ui/siakad';",
  demos: { Kartu: 'KartuSK dan RiwayatSK (data contoh)', Pilih: 'PilihSK (butuh SIAKAD)', Kelola: 'KelolaSK, halaman Registri SK (butuh SIAKAD)' },
  props: [
    ['value / onValueChange', 'string | null, (id, sk) => void', 'PilihSK: UUID SK registri; kirim sebagai sk_id ke endpoint modul.'],
    ['sk', 'SKRegistri', 'Data awal (objek sk dari API modul) agar tidak memuat ulang.'],
    ['jenis / penerbitUnitId / perihal', 'string / number / string', 'Bawaan saat mengajukan pencatatan SK baru.'],
    ['bolehAjukan', 'boolean', 'Tampilkan "Ajukan pencatatan SK". Bawaan true.'],
    ['pengawasan', 'boolean', 'KelolaSK: semua penerbit (Pustikom).'],
  ],
  notes: [
    'Penerbit (izin sk.catat di unit penerbit, mis. peran Pencatat SK unit di Rektorat) mencatat dan memverifikasi; unit lain hanya merujuk.',
    'BFF aplikasi harus meneruskan /v1/sk. SDK: registriSK(siakad) di unipo-siakad-sdk 1.20.0.',
    'IsianSK dan PilihNomorSK lama tetap ada dan kini mencari di registri; nilainya membawa sk_id bila SK dipilih dari registri (pakai bodySK).',
  ],
};

const CONTOH: SKRegistri = {
  id: '00000000-0000-0000-0000-000000000001',
  nomor: '91.01/UNIPO-SK/VII/2026',
  nomor_kunci: '91/1/UNIPO/SK/VII/2026',
  tanggal: '2026-07-15',
  perihal: 'Kalender Akademik Tahun Akademik 2026/2027',
  jenis: 'kalender',
  penerbit: { unit_id: 1, nama: 'Universitas Pohuwato', kode: 'UNIPO', jenis: 'universitas' },
  penandatangan: { pejabat_id: 1, jabatan: 'Rektor Universitas Pohuwato', nama: 'Nama Rektor' },
  tempat: 'Marisa',
  berkas: { ada: true, nama: 'SK-kalender.pdf', mime: 'application/pdf', ukuran: 182000, url: '/v1/sk/00000000-0000-0000-0000-000000000001/berkas' },
  status: 'terbit',
  sumber: 'registri',
  diverifikasi_at: '2026-07-15 09:00:00',
};

export function Kartu() {
  return (
    <Card>
      <CardContent style={{ display: 'grid', gap: '1rem' }}>
        <KartuSK sk={CONTOH} />
        <RiwayatSK sk={{ status: 'terbit', mengubah: [{ id: 'x', nomor: '88/UNIPO-SK/VII/2025', perihal: 'Kalender 2025/2026', jenis: 'mencabut', status: 'dicabut' }], diubah_oleh_sk: [] }} />
      </CardContent>
    </Card>
  );
}

export function Pilih() {
  const [id, setId] = React.useState<string | null>(null);
  return <PilihSK value={id} onValueChange={(v) => setId(v)} jenis="kalender" label="SK kalender" />;
}

export function Kelola() {
  return <KelolaSK />;
}
