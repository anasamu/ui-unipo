import { Copy, Download, Eye, LogOut, MoreHorizontal, Pencil, Settings, Trash2, User } from 'lucide-react';
import { Button, ConfirmDialog, Dialog, DialogClose, Field, Input, Menu, Popover, Select, Sheet, Tooltip, useToast } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Dialog, Sheet & Menu',
  category: 'Overlay',
  description: 'Lapisan di atas halaman. Dialog untuk tugas singkat, Sheet (panel samping) untuk saringan dan detail, ConfirmDialog untuk tindakan yang tidak bisa dibatalkan, Menu untuk aksi baris.',
  importLine: "import { Dialog, Sheet, ConfirmDialog, Popover, Tooltip, Menu, useToast } from 'unipo-ui';",
  demos: { DialogForm: 'Dialog berisi formulir', Konfirmasi: 'Konfirmasi hapus', Panel: 'Sheet saringan', MenuAksi: 'Menu aksi', Melayang: 'Popover & Tooltip', Notifikasi: 'Toast' },
};

export function DialogForm() {
  return (
    <Dialog
      trigger={<Button>Tambah kelas</Button>}
      title="Tambah kelas perkuliahan"
      description="Kelas baru langsung tampil di penawaran KRS."
      footer={
        <>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button>Simpan kelas</Button>
        </>
      }
    >
      <div className="demo-stack">
        <Field label="Nama kelas" required><Input defaultValue="TI-3A" /></Field>
        <Field label="Ruang">
          <Select options={[{ value: 'L201', label: 'Lab Komputer 201' }, { value: 'R105', label: 'Ruang Kuliah 105' }]} placeholder="Pilih ruang" />
        </Field>
      </div>
    </Dialog>
  );
}

export function Konfirmasi() {
  const toast = useToast();
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive-soft"><Trash2 /> Hapus mahasiswa</Button>}
      title="Hapus data Ahmad Fauzi?"
      description="Data KRS, nilai, dan riwayat pembayaran ikut terhapus. Tindakan ini tidak bisa dibatalkan."
      confirmLabel="Hapus mahasiswa"
      onConfirm={async () => {
        await new Promise((r) => setTimeout(r, 800));
        toast.add({ title: 'Mahasiswa dihapus', description: '2024010021 · Ahmad Fauzi', type: 'success' });
      }}
    />
  );
}

export function Panel() {
  return (
    <Sheet
      trigger={<Button variant="outline">Saring data</Button>}
      title="Saring mahasiswa"
      description="Hasil diperbarui setelah Anda menekan Terapkan."
      footer={
        <>
          <DialogClose render={<Button variant="ghost" />}>Atur ulang</DialogClose>
          <DialogClose render={<Button />}>Terapkan</DialogClose>
        </>
      }
    >
      <div className="demo-stack">
        <Field label="Angkatan"><Select options={['2026', '2025', '2024', '2023'].map((v) => ({ value: v, label: v }))} placeholder="Semua angkatan" /></Field>
        <Field label="Status"><Select options={[{ value: 'A', label: 'Aktif' }, { value: 'C', label: 'Cuti' }, { value: 'L', label: 'Lulus' }]} placeholder="Semua status" /></Field>
      </div>
    </Sheet>
  );
}

export function MenuAksi() {
  return (
    <div className="demo-row">
      <Menu
        trigger={<Button variant="ghost" iconOnly aria-label="Aksi"><MoreHorizontal /></Button>}
        items={[
          { label: 'Lihat profil', icon: <Eye /> },
          { label: 'Ubah data', icon: <Pencil />, shortcut: 'E' },
          { label: 'Salin NIM', icon: <Copy /> },
          { label: 'Unduh transkrip', icon: <Download /> },
          { type: 'separator' },
          { label: 'Hapus', icon: <Trash2 />, destructive: true },
        ]}
      />
      <Menu
        trigger={<Button variant="outline"><User /> Akun saya</Button>}
        items={[
          { type: 'label', label: 'Siti Nurhaliza · 2024010001' },
          { label: 'Pengaturan', icon: <Settings /> },
          { type: 'separator' },
          { label: 'Keluar', icon: <LogOut /> },
        ]}
      />
    </div>
  );
}

export function Melayang() {
  return (
    <div className="demo-row">
      <Popover trigger={<Button variant="outline">Apa itu SKS?</Button>} title="Satuan Kredit Semester" description="1 SKS teori = 50 menit tatap muka + 60 menit tugas terstruktur + 60 menit mandiri per minggu." />
      <Tooltip content="Disalin ke papan klip" side="bottom">
        <Button variant="soft">Arahkan kursor</Button>
      </Tooltip>
    </div>
  );
}

export function Notifikasi() {
  const toast = useToast();
  return (
    <div className="demo-row">
      <Button variant="outline" onClick={() => toast.add({ title: 'KRS tersimpan', description: '21 SKS · menunggu persetujuan dosen PA', type: 'success' })}>Berhasil</Button>
      <Button variant="outline" onClick={() => toast.add({ title: 'Berkas terlalu besar', description: 'Maksimal 2 MB. Kompres PDF lalu unggah lagi.', type: 'error' })}>Galat</Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((r) => setTimeout(r, 1500)), {
            loading: { title: 'Mengirim nilai ke PDDikti…' },
            success: { title: 'Nilai terkirim', description: '38 mahasiswa' },
            error: { title: 'Gagal mengirim' },
          })
        }
      >
        Proses
      </Button>
    </div>
  );
}
