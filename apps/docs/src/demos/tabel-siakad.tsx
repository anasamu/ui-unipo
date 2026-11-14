import { Eye, FileText, Pencil, Send } from 'lucide-react';
import { Button } from 'unipo-ui';
import { TabelBerkas, TabelDokumen, TabelDosen, TabelMahasiswa, TabelMataKuliah, TabelPegawai, TabelSuratKeluar, TabelSuratMasuk } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Tabel SIAKAD',
  category: 'Tabel data',
  layout: 'wide',
  order: 2,
  description:
    'Turunan DataTable yang sudah terhubung ke SDK: saringan, halaman di server, kolom, status berwarna, dan unduh CSV. Cukup satu baris untuk daftar mahasiswa, dosen, pegawai/tendik, mata kuliah, surat masuk, surat keluar, dokumen, dan berkas arsip.',
  importLine: "import { TabelMahasiswa, TabelSuratMasuk, useSiakadTable } from 'unipo-ui/siakad';",
  demos: {
    Mahasiswa: 'TabelMahasiswa: klik baris membuka detail',
    MahasiswaKartu: 'Tampilan kartu (tombol tabel/kartu di kanan atas)',
    Ringkas: "varian='ringkas' untuk panel dasbor",
    Dosen: 'TabelDosen dengan panel detail',
    Tendik: 'TabelPegawai khusus tendik (sdm.getPegawai)',
    MataKuliah: 'TabelMataKuliah dengan panel detail',
    SuratMasuk: 'TabelSuratMasuk (arsip.getSuratMasuk)',
    SuratKeluar: 'TabelSuratKeluar (arsip.getSuratKeluar)',
    Dokumen: 'TabelDokumen (arsip.getDokumen)',
    Berkas: 'TabelBerkas (arsip.getBerkas)',
  },
  props: [
    ['initialFilter', 'FilterValues', 'Saringan awal, mis. { prodi: "55201", status: "A" }.'],
    ['syncUrl', 'boolean', 'Simpan saringan di URL agar bisa dibagikan.'],
    ['extraColumns / hideColumns', 'DataColumn[] / string[]', 'Tambah, ganti, atau sembunyikan kolom.'],
    ['filterProps', 'PresetFilterProps', 'Atur saringan (hide, extraFields).'],
    ['detail', 'boolean', 'Klik baris membuka panel detail bertab (mahasiswa: ringkasan, KRS, KHS, transkrip; dosen: profil, jadwal, bimbingan; MK: kelas dibuka).'],
    ['tampilan / onTampilanChange', "'tabel' | 'kartu'", 'Tampilan awal. Tombol ganti muncul otomatis untuk mahasiswa, dosen, pegawai, dan mata kuliah (matikan dengan tampilanToggle={false}).'],
    ['varian', "'lengkap' | 'ringkas'", 'Ringkas: tanpa saringan dan alat, baris rapat, 5 per halaman.'],
    ['rowActions, onRowClick, selectable, bulkActions', '…', 'Semua props DataTable tetap bisa dipakai.'],
  ],
  notes: [
    'Untuk endpoint lain, pakai useSiakadTable({ key, fetch: (s, q, signal) => s.modul.metode(q, { signal }) }) lalu sebarkan tableProps ke DataTable dan filterProps ke FilterBar.',
    'API daftar SIAKAD belum menerima parameter urutan umum, jadi tabel turunan tidak menampilkan tombol urut kolom; urutan mengikuti server.',
  ],
};

export function Mahasiswa() {
  return (
    <TabelMahasiswa
      initialFilter={{ status: 'A' }}
      perPage={5}
      detail
      selectable
      rowActions={(r) => [{ label: 'Lihat profil', icon: <Eye /> }, { label: 'KHS dan transkrip', icon: <FileText /> }, { type: 'separator' }, { label: `Ubah data ${r.nim}`, icon: <Pencil /> }]}
    />
  );
}
export function MahasiswaKartu() {
  return <TabelMahasiswa perPage={6} tampilan="kartu" detail />;
}
export function Ringkas() {
  return (
    <div style={{ maxWidth: 640 }}>
      <TabelMahasiswa varian="ringkas" initialFilter={{ prodi: '55201' }} hideColumns={['kelas', 'tahun_masuk']} detail />
    </div>
  );
}
export function Dosen() {
  return <TabelDosen perPage={5} detail />;
}
export function Tendik() {
  return <TabelPegawai initialFilter={{ jenis: 'tendik' }} perPage={5} filterProps={{ hide: ['jenis', 'kode_prodi', 'serdos'] }} hideColumns={['jenis']} />;
}
export function MataKuliah() {
  return <TabelMataKuliah initialFilter={{ prodi: '55201' }} perPage={5} detail />;
}
export function SuratMasuk() {
  return <TabelSuratMasuk perPage={5} actions={<Button size="sm">Catat surat</Button>} />;
}
export function SuratKeluar() {
  return (
    <TabelSuratKeluar
      perPage={5}
      rowActions={(r) => [
        { label: 'Buka', icon: <Eye /> },
        { label: r.status === 'disetujui' ? 'Kirim' : 'Ajukan', icon: <Send /> },
      ]}
    />
  );
}
export function Dokumen() {
  return <TabelDokumen perPage={5} />;
}
export function Berkas() {
  return <TabelBerkas perPage={5} />;
}
