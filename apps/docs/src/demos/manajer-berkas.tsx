import * as React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button, Dialog } from 'unipo-ui';
import { ManajerBerkas, type BerkasManajer } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Manajer berkas',
  category: 'Tanggal & berkas',
  layout: 'full',
  order: 61,
  badge: 'baru',
  description:
    'Manajer berkas seperti di Google Drive untuk arsip dokumen dan unggahan: pohon folder dan subfolder, tampilan kisi atau daftar, seret file atau folder dari komputer untuk mengunggah, seret berkas ke folder untuk memindah, cari, filter jenis, urutkan, pilih banyak, ganti nama, pratinjau, unduh, dan hapus ke sampah. Terhubung langsung ke /v1/berkas dan /v1/berkas/folder.',
  importLine: "import { ManajerBerkas, useFolderBerkas, useAksiBerkas } from 'unipo-ui/siakad';",
  demos: {
    Lengkap: 'Manajer berkas lengkap (coba seret file dari komputer, klik kanan, Ctrl+A, Delete, F2)',
    Daftar: 'Tampilan daftar, ruang folder per modul (arsip)',
    Pemilih: 'Mode pemilih di dalam dialog: pilih berkas untuk formulir',
    BacaSaja: 'Hanya lihat dan unduh (tanpa unggah, kelola, atau hapus)',
  },
  props: [
    ['modul', 'string', 'Ruang folder per aplikasi/modul, mis. "arsip" atau "lms". Kosong = folder umum pengguna.'],
    ['kategori', 'string', 'Kategori berkas yang diunggah. Bawaan "dokumen".'],
    ['folderAwal / folder / onFolderChange', 'string | null', 'Folder awal, atau folder terkendali (mis. disimpan di URL).'],
    ['tampilanAwal', "'grid' | 'daftar'", 'Bawaan grid.'],
    ['accept', 'string', 'Ekstensi yang diterima, mis. ".pdf,.docx". Bawaan dari GET /v1/berkas/info.'],
    ['bolehUnggah / bolehKelola / bolehHapus', 'boolean', 'Matikan aksi sesuai hak pengguna. Bawaan semuanya true.'],
    ['pilih / onPilih / labelPilih', "'satu' | 'banyak'", 'Mode pemilih: tombol "Pakai berkas ini" memanggil onPilih(berkas[]).'],
    ['onBuka', '(berkas) => void', 'Ganti pratinjau bawaan saat berkas dibuka (klik ganda atau Enter).'],
    ['judul', 'string', 'Nama folder utama. Bawaan "Berkas saya".'],
    ['tinggi', 'number | string', 'Tinggi komponen. Bawaan 36rem.'],
  ],
  notes: [
    'Endpoint: GET /v1/berkas/folder (pohon folder + jumlah dan ukuran), POST /v1/berkas/folder, /folder/ubah (ganti nama, pindah, warna), /folder/hapus; GET /v1/berkas?folder=…&dalam=…&jenis=…&urut=…; POST /v1/berkas/pindah dan /hapus-banyak; unggah lewat POST /v1/berkas atau /v1/berkas/bertahap untuk file besar. Butuh scope berkas:read dan berkas:write.',
    'Hapus selalu soft delete: berkas pindah ke sampah dan hanya admin (berkas:admin) yang bisa memulihkan atau menghapus permanen. Berkas yang masih dipakai data modul ditolak dengan pesan dari server.',
    'Seret folder dari komputer: subfolder ikut dibuat di SIAKAD. Nama folder boleh berisi spasi ("Surat Masuk 2026"); karakter yang ditolak server diganti tanda "-".',
    'Keyboard: panah untuk berpindah, Enter membuka, Spasi memilih, Ctrl/Cmd+A pilih semua, Shift+klik rentang, F2 ganti nama, Delete hapus, Esc batal pilih. Klik kanan membuka menu konteks.',
    'Pakai useFolderBerkas(modul) dan useAksiBerkas(modul) untuk membangun tampilan sendiri dengan logika yang sama.',
  ],
};

export function Lengkap() {
  return <ManajerBerkas tinggi="38rem" />;
}

export function Daftar() {
  return <ManajerBerkas modul="arsip" judul="Arsip unit" tampilanAwal="daftar" tinggi="28rem" />;
}

export function Pemilih() {
  const [buka, setBuka] = React.useState(false);
  const [dipilih, setDipilih] = React.useState<BerkasManajer[]>([]);
  return (
    <div style={{ display: 'grid', gap: '0.75rem', justifyItems: 'start' }}>
      <Button variant="outline" onClick={() => setBuka(true)}>
        <FolderOpen aria-hidden />
        Pilih lampiran dari berkas saya
      </Button>
      <p style={{ margin: 0, fontSize: 'var(--u-text-sm)', color: 'var(--u-muted-foreground)' }}>{dipilih.length ? `Dipilih: ${dipilih.map((b) => b.nama).join(', ')}` : 'Belum ada lampiran.'}</p>
      <Dialog open={buka} onOpenChange={setBuka} title="Pilih lampiran" size="full">
        <ManajerBerkas
          pilih="banyak"
          accept=".pdf,.docx"
          labelPilih="Lampirkan"
          tinggi="min(32rem, 70vh)"
          onPilih={(b) => {
            setDipilih(b);
            setBuka(false);
          }}
        />
      </Dialog>
    </div>
  );
}

export function BacaSaja() {
  return <ManajerBerkas folderAwal="Dokumentasi" bolehUnggah={false} bolehKelola={false} bolehHapus={false} tinggi="26rem" />;
}
