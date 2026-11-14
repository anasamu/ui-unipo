import { ArrowRight, Download, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { Button, ButtonGroup, Tooltip } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Button',
  category: 'Aksi',
  description: 'Tombol untuk aksi utama dan sekunder. Tulis label dengan kata kerja ("Simpan KRS", bukan "OK").',
  importLine: "import { Button, ButtonGroup } from '@unipo/ui';",
  demos: { Varian: 'Varian', Ukuran: 'Ukuran', Ikon: 'Dengan ikon', Memuat: 'Status memuat dan nonaktif', Grup: 'Grup tombol', Tautan: 'Sebagai tautan' },
  props: [
    ['variant', "'primary' | 'secondary' | 'outline' | 'soft' | 'ghost' | 'destructive' | 'destructive-soft' | 'link'", 'Gaya tombol. Bawaan primary.'],
    ['size', "'xs' | 'sm' | 'md' | 'lg' | 'xl'", 'Tinggi 28/32/36/42/48 px.'],
    ['iconOnly', 'boolean', 'Tombol persegi berisi ikon; wajib aria-label + Tooltip.'],
    ['loading', 'boolean', 'Spinner, lebar tetap, klik dinonaktifkan.'],
    ['fullWidth', 'boolean', 'Lebar penuh.'],
    ['render', 'ReactElement', 'Render sebagai elemen lain, mis. <a href>.'],
  ],
};

export function Varian() {
  return (
    <>
      <Button>Simpan</Button>
      <Button variant="secondary">Daftar sekarang</Button>
      <Button variant="outline">Batal</Button>
      <Button variant="soft">Tambah catatan</Button>
      <Button variant="ghost">Lewati</Button>
      <Button variant="destructive">Hapus</Button>
      <Button variant="destructive-soft">Tolak berkas</Button>
      <Button variant="link">Lihat detail</Button>
    </>
  );
}

export function Ukuran() {
  return (
    <>
      <Button size="xs">Sangat kecil</Button>
      <Button size="sm">Kecil</Button>
      <Button size="md">Sedang</Button>
      <Button size="lg">Besar</Button>
      <Button size="xl">Sangat besar</Button>
    </>
  );
}

export function Ikon() {
  return (
    <>
      <Button><Plus /> Tambah mahasiswa</Button>
      <Button variant="outline"><Download /> Unduh KHS</Button>
      <Button variant="secondary">Lanjutkan <ArrowRight /></Button>
      <Tooltip content="Cetak transkrip" shortcut="⌘P">
        <Button variant="outline" iconOnly aria-label="Cetak transkrip"><Printer /></Button>
      </Tooltip>
      <Tooltip content="Hapus">
        <Button variant="ghost" iconOnly aria-label="Hapus"><Trash2 /></Button>
      </Tooltip>
    </>
  );
}

export function Memuat() {
  return (
    <>
      <Button loading><Save /> Menyimpan</Button>
      <Button variant="outline" loading>Memuat</Button>
      <Button disabled>Nonaktif</Button>
      <Button variant="outline" disabled>Nonaktif</Button>
    </>
  );
}

export function Grup() {
  return (
    <ButtonGroup aria-label="Ekspor">
      <Button variant="outline">PDF</Button>
      <Button variant="outline">Excel</Button>
      <Button variant="outline">CSV</Button>
    </ButtonGroup>
  );
}

export function Tautan() {
  return (
    <Button variant="outline" render={<a href="#/tombol" />}>
      Buka panduan KRS <ArrowRight />
    </Button>
  );
}
