import { DaftarDokumenTerbit, EditorTemplatDokumen, TerbitkanDokumen, VerifikasiDokumen } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Dokumen terverifikasi',
  category: 'Per kegunaan',
  layout: 'wide',
  order: 5,
  badge: 'baru',
  description:
    'Antarmuka untuk /v1/dokumen: templat dokumen per bagian (kertas, margin, huruf, kop surat, tanda tangan, QR, tanda air) yang diwariskan kampus → fakultas → prodi, penerbitan PDF resmi (KRS, KHS, transkrip, kwitansi, surat keluar, dokumen bebas) yang disimpan di berkas terpusat dengan kode dan QR verifikasi, arsip dokumen terbit, dan pemeriksa keaslian publik (kode/QR atau unggah file PDF untuk dicocokkan SHA-256-nya).',
  importLine: "import { VerifikasiDokumen, TerbitkanDokumen, DaftarDokumenTerbit, EditorTemplatDokumen, useTemplatDokumen, useVerifikasiDokumen } from 'unipo-ui/siakad';",
  demos: {
    Verifikasi: 'VerifikasiDokumen: halaman cek keaslian untuk publik',
    Terbitkan: 'TerbitkanDokumen: tombol terbit + pratinjau',
    Arsip: 'DaftarDokumenTerbit: arsip, unduh, batalkan',
    Templat: 'EditorTemplatDokumen: aturan dokumen per bagian dengan pratinjau PDF',
  },
  props: [
    ['VerifikasiDokumen.kode', 'string', 'Kode awal, mis. dari parameter URL halaman.'],
    ['TerbitkanDokumen.jenis', "'krs' | 'khs' | 'transkrip' | 'kwitansi' | 'surat_keluar' | jenis lain", 'Jenis lain diterbitkan lewat POST /v1/dokumen/buat.'],
    ['TerbitkanDokumen.data', 'object', '{nim, tahun_id} / {transaksi_id} / {surat} atau body dokumen bebas.'],
    ['DaftarDokumenTerbit.bolehBatal', 'boolean', 'Tampilkan pembatalan beralasan (dokumen:admin atau pimpinan/admin unit).'],
    ['EditorTemplatDokumen.bagian', 'string', 'Kode unit; kosong = templat tingkat kampus.'],
  ],
  notes: [
    'Scope: dokumen:read untuk templat dan arsip, dokumen:write untuk menerbitkan, dokumen:admin untuk templat kampus. Verifikasi tidak butuh token.',
    'Di halaman ini, unggah file bernama krs*.pdf untuk melihat hasil “cocok”; nama lain menampilkan hasil “tidak dikenal”. Coba kode K7QM-2XPA-9RTD (sah) dan W3HN-8BQZ-4MKE (dibatalkan).',
  ],
};

export function Verifikasi() {
  return <VerifikasiDokumen kode="K7QM-2XPA-9RTD" />;
}

export function Terbitkan() {
  return (
    <div style={{ display: 'grid', gap: '.75rem' }}>
      <TerbitkanDokumen jenis="krs" data={{ nim: '2301010001', tahun_id: '20261' }} label="Cetak KRS" />
      <TerbitkanDokumen jenis="transkrip" data={{ nim: '2301010001' }} label="Cetak transkrip" variant="outline" />
    </div>
  );
}

export function Arsip() {
  return <DaftarDokumenTerbit bolehBatal />;
}

export function Templat() {
  return <EditorTemplatDokumen bagian="ft" />;
}
