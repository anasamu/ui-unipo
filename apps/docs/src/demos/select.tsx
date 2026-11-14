import { BookOpen, Building, Calendar } from 'lucide-react';
import * as React from 'react';
import { Combobox, Field, OptionContent, Select } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Select & Combobox',
  category: 'Pilihan',
  layout: 'narrow',
  description: 'Select untuk daftar pendek yang sudah diketahui. Combobox untuk daftar panjang atau data dari API; menjadi dasar semua komponen Cari* (mahasiswa, dosen, negara, sekolah).',
  importLine: "import { Select, Combobox, OptionContent } from '@unipo/ui';",
  demos: { Dasar: 'Select', Grup: 'Select dengan grup dan deskripsi', Cari: 'Combobox statis', Async: 'Combobox memuat dari server' },
  props: [
    ['items / loadItems', 'T[] / (q, signal) => Promise<T[]>', 'Daftar statis atau fungsi pemuat (debounce + batal otomatis).'],
    ['itemToString, itemKey', '(item) => string', 'Teks tampil dan kunci unik.'],
    ['renderItem', '(item) => ReactNode', 'Isi butir, mis. <OptionContent media title meta />.'],
    ['minQueryLength', 'number', 'Minimal huruf sebelum memuat.'],
  ],
};

export function Dasar() {
  return (
    <Field label="Semester">
      <Select
        defaultValue="20261"
        options={[
          { value: '20261', label: '2026/2027 Ganjil', icon: <Calendar /> },
          { value: '20252', label: '2025/2026 Genap', icon: <Calendar /> },
          { value: '20251', label: '2025/2026 Ganjil', icon: <Calendar /> },
        ]}
      />
    </Field>
  );
}

export function Grup() {
  return (
    <Field label="Program studi">
      <Select
        placeholder="Pilih program studi"
        options={[
          { group: 'Fakultas Ilmu Komputer', value: '55201', label: 'Teknik Informatika', description: 'S1 · Akreditasi Baik Sekali' },
          { group: 'Fakultas Ilmu Komputer', value: '57201', label: 'Sistem Informasi', description: 'S1 · Akreditasi Baik' },
          { group: 'Fakultas Ekonomi', value: '61201', label: 'Manajemen', description: 'S1 · Akreditasi Baik Sekali' },
          { group: 'Fakultas Ekonomi', value: '62201', label: 'Akuntansi', description: 'S1 · Akreditasi Baik' },
        ]}
      />
    </Field>
  );
}

const FAKULTAS = ['Fakultas Ilmu Komputer', 'Fakultas Ekonomi', 'Fakultas Hukum', 'Fakultas Pertanian', 'Fakultas Keguruan dan Ilmu Pendidikan', 'Fakultas Teknik', 'Fakultas Kesehatan'];

export function Cari() {
  return (
    <Field label="Fakultas">
      <Combobox
        items={FAKULTAS}
        itemToString={(s) => s}
        itemKey={(s) => s}
        placeholder="Ketik nama fakultas…"
        renderItem={(s) => <OptionContent media={<Building size={14} />} mediaShape="square" title={s} />}
      />
    </Field>
  );
}

type MK = { kode: string; nama: string; sks: number };
const MKS: MK[] = [
  { kode: 'TIF201', nama: 'Struktur Data', sks: 3 },
  { kode: 'TIF202', nama: 'Basis Data', sks: 3 },
  { kode: 'TIF305', nama: 'Rekayasa Perangkat Lunak', sks: 3 },
  { kode: 'TIF310', nama: 'Kecerdasan Buatan', sks: 3 },
  { kode: 'UNI101', nama: 'Pendidikan Pancasila', sks: 2 },
];

export function Async() {
  const [mk, setMk] = React.useState<MK | null>(null);
  const load = React.useCallback(async (q: string) => {
    await new Promise((r) => setTimeout(r, 450)); // contoh jeda jaringan
    return MKS.filter((m) => (m.kode + m.nama).toLowerCase().includes(q.toLowerCase()));
  }, []);
  return (
    <Field label="Mata kuliah" description={mk ? `${mk.sks} SKS dipilih` : 'Data dimuat setiap kali Anda mengetik.'}>
      <Combobox<MK>
        loadItems={load}
        value={mk}
        onValueChange={setMk}
        itemToString={(m) => `${m.kode} · ${m.nama}`}
        itemKey={(m) => m.kode}
        placeholder="Cari kode atau nama mata kuliah"
        renderItem={(m) => <OptionContent media={<BookOpen size={14} />} mediaShape="square" title={m.nama} meta={`${m.kode} · ${m.sks} SKS`} />}
      />
    </Field>
  );
}
