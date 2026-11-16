import * as React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button, Dialog } from 'unipo-ui';
import { DriveBerkas, KebijakanEnkripsiBerkas, ManajerBerkas, type BerkasManajer } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Manajer berkas',
  category: 'Tanggal & berkas',
  layout: 'full',
  order: 61,
  badge: 'baru',
  description:
    'Manajer berkas seperti di Google Drive untuk berkas pribadi dan ruang bersama setiap unit: pohon folder, tampilan kisi atau daftar, periode akademik, salin/potong/tempel (juga antar unit), buat folder dan dokumen baru, unggah file atau folder, bagikan ke orang, unit, atau tautan publik bersandi, dan enkripsi isi berkas yang kebijakannya diatur Pustikom, unit, atau pengguna. Terhubung langsung ke /v1/berkas.',
  importLine: "import { DriveBerkas, ManajerBerkas, KebijakanEnkripsiBerkas, useFolderBerkas, useAksiBerkas } from 'unipo-ui/siakad';",
  demos: {
    Drive: 'DriveBerkas: berkas saya, ruang unit (BAUK, BAAK), dan yang dibagikan ke saya',
    Unit: 'Ruang bersama unit BAUK: periode akademik, enkripsi wajib, salin/potong/tempel (Ctrl+C, Ctrl+X, Ctrl+V)',
    Lengkap: 'Manajer berkas pribadi (coba seret file dari komputer, klik kanan, Ctrl+A, Delete, F2, Baru → Dokumen teks)',
    Keamanan: 'Pengaturan enkripsi: global (Pustikom), unit, dan pengguna',
    Daftar: 'Tampilan daftar, ruang folder per modul (arsip)',
    Pemilih: 'Mode pemilih di dalam dialog: pilih berkas untuk formulir',
    BacaSaja: 'Hanya lihat dan unduh (tanpa unggah, kelola, atau hapus)',
  },
  props: [
    ['modul', 'string', 'Ruang folder per aplikasi/modul, mis. "arsip" atau "lms". Kosong = folder umum pengguna.'],
    ['unit', 'string', 'Ruang bersama unit, mis. "baak", "bauk", "sdm", "lpm", "pmb", "lppm", "humas", atau kode fakultas/prodi. Semua anggota unit melihat isinya.'],
    ['bagi', 'string', 'UUID folder yang dibagikan ke pengguna (dari GET /v1/berkas/dibagikan): hanya lihat, unduh, dan salin.'],
    ['periode / periodeAwal', 'boolean / string | null', 'Pilihan periode akademik (bawaan tampil). periodeAwal: "20251", "tanpa", atau null = semua.'],
    ['bolehBagikan', 'boolean', 'Menu Bagikan untuk berkas dan folder. Bawaan true.'],
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
    'Pakai useFolderBerkas(modul, { unit }) dan useAksiBerkas(modul, unit) untuk membangun tampilan sendiri dengan logika yang sama.',
    'Ruang unit: anggota (izin <aplikasi>.berkas) bisa melihat, mengunggah, dan mengubah berkasnya sendiri; pengelola (<aplikasi>.berkas.kelola, admin/pimpinan unit) juga menghapus folder, membagikan folder, dan mengatur enkripsi unit. Di aplikasi bagian cukup <ManajerBerkas unit="bauk" />.',
    'Salin/potong/tempel memakai papan klip bersama di halaman: salin dari ruang unit lalu tempel di Berkas saya (atau sebaliknya). Antar ruang, potong = pindah; salinan berbagi isi di penyimpanan sampai salah satunya diubah.',
    'Enkripsi: isi dienkripsi AES-256-GCM di server sebelum dikirim ke penyimpanan (R2/S3/MinIO/Google Drive), jadi penyedia storage hanya melihat teks sandi. Pengguna tetap membuka berkas biasa tanpa kata sandi. Kebijakan: global (Pustikom: mati/opsional/wajib), unit, dan pengguna (opsional/wajib); salah satu wajib = semua berkas baru dienkripsi. Saat opsional, tombol gembok di bilah alat meminta enkripsi untuk unggahan.',
    'Tautan publik: alamatnya bisa dibuka di browser tanpa login (halaman unduh sederhana), opsional kata sandi dan tanggal kedaluwarsa. Berbagi bisa dicabut kapan saja.',
  ],
};

export function Drive() {
  return <DriveBerkas tinggi="36rem" />;
}

export function Unit() {
  return <ManajerBerkas unit="bauk" tampilanAwal="daftar" tinggi="34rem" />;
}

export function Keamanan() {
  return (
    <div style={{ maxWidth: '36rem' }}>
      <KebijakanEnkripsiBerkas tampilkanSemua />
    </div>
  );
}

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
