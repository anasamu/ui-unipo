import { Archive, Download, Mail, Pencil, Trash2, UserPlus } from 'lucide-react';
import * as React from 'react';
import { Badge, Button, DataTable, useToast, type DataColumn } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Tabel data (DataTable)',
  category: 'Tabel data',
  layout: 'wide',
  order: 1,
  description: 'Tabel inti untuk semua daftar: urut, halaman, pilih baris dengan aksi massal, menu aksi per baris, pilih kolom, kerapatan, unduh CSV, kerangka saat memuat, keadaan kosong dan galat. Di layar di bawah 640 px baris berubah menjadi kartu bertumpuk.',
  importLine: "import { DataTable, type DataColumn } from 'unipo-ui';",
  demos: { Dasar: 'Data lokal: urut, halaman, kolom', Pilih: 'Pilih baris dan aksi massal', Memuat: 'Memuat, kosong, galat' },
  props: [
    ['columns', 'DataColumn<T>[]', 'key, header, cell, value, sortable, align, shrink, hideable, defaultHidden, mobile.'],
    ['rows, rowKey', 'T[], (row) => string', 'Data dan kunci unik baris.'],
    ['sort / onSortChange', 'SortState', 'Tanpa onSortChange diurutkan di browser.'],
    ['page, perPage, total, onPageChange', 'number', 'Tanpa onPageChange dipotong di browser.'],
    ['selectable, bulkActions', 'boolean, (keys, clear) => ReactNode', 'Kotak centang dan bilah aksi massal.'],
    ['rowActions', '(row) => MenuEntry[]', 'Menu ⋯ di ujung baris.'],
    ['toolbar, actions', 'ReactNode', 'Isi bilah atas (mis. FilterBar) dan tombol tambahan.'],
    ['exportCsv', 'boolean | string', 'Unduh CSV kolom yang tampil.'],
    ['empty, emptyFiltered, filtered', 'object', 'Keadaan kosong vs tidak ada yang cocok.'],
    ['storageKey', 'string', 'Ingat pilihan kolom dan kerapatan di localStorage.'],
  ],
};

interface Prodi { kode: string; nama: string; jenjang: string; fakultas: string; mahasiswa: number; dosen: number; akreditasi: string }
const PRODI: Prodi[] = [
  { kode: '55201', nama: 'Informatika', jenjang: 'S1', fakultas: 'Ilmu Komputer', mahasiswa: 612, dosen: 18, akreditasi: 'Baik Sekali' },
  { kode: '57201', nama: 'Sistem Informasi', jenjang: 'S1', fakultas: 'Ilmu Komputer', mahasiswa: 455, dosen: 14, akreditasi: 'Baik' },
  { kode: '61201', nama: 'Manajemen', jenjang: 'S1', fakultas: 'Ekonomi', mahasiswa: 803, dosen: 21, akreditasi: 'Baik Sekali' },
  { kode: '62201', nama: 'Akuntansi', jenjang: 'S1', fakultas: 'Ekonomi', mahasiswa: 390, dosen: 12, akreditasi: 'Baik' },
  { kode: '54211', nama: 'Agroteknologi', jenjang: 'S1', fakultas: 'Pertanian', mahasiswa: 268, dosen: 11, akreditasi: 'Baik' },
  { kode: '74201', nama: 'Ilmu Hukum', jenjang: 'S1', fakultas: 'Hukum', mahasiswa: 541, dosen: 16, akreditasi: 'Unggul' },
  { kode: '86206', nama: 'Pendidikan Guru SD', jenjang: 'S1', fakultas: 'Keguruan', mahasiswa: 477, dosen: 15, akreditasi: 'Baik Sekali' },
  { kode: '63201', nama: 'Ilmu Administrasi Negara', jenjang: 'S1', fakultas: 'Ilmu Sosial', mahasiswa: 322, dosen: 10, akreditasi: 'Baik' },
  { kode: '13241', nama: 'Kesehatan Masyarakat', jenjang: 'S1', fakultas: 'Kesehatan', mahasiswa: 288, dosen: 9, akreditasi: 'Baik' },
  { kode: '57401', nama: 'Manajemen Informatika', jenjang: 'D3', fakultas: 'Ilmu Komputer', mahasiswa: 140, dosen: 6, akreditasi: 'Baik' },
  { kode: '20201', nama: 'Teknik Elektro', jenjang: 'S1', fakultas: 'Teknik', mahasiswa: 205, dosen: 8, akreditasi: 'Baik' },
  { kode: '22201', nama: 'Teknik Sipil', jenjang: 'S1', fakultas: 'Teknik', mahasiswa: 318, dosen: 11, akreditasi: 'Baik Sekali' },
];
const TONE: Record<string, 'success' | 'info' | 'primary'> = { Unggul: 'success', 'Baik Sekali': 'info', Baik: 'primary' };
const COLS: DataColumn<Prodi>[] = [
  { key: 'nama', header: 'Program studi', sortable: true, cell: (r) => <><strong>{r.jenjang} {r.nama}</strong><div style={{ fontSize: 12, color: 'var(--u-muted-foreground)' }}>Kode {r.kode}</div></> },
  { key: 'fakultas', header: 'Fakultas', sortable: true },
  { key: 'mahasiswa', header: 'Mahasiswa', sortable: true, align: 'end', cell: (r) => r.mahasiswa.toLocaleString('id-ID') },
  { key: 'dosen', header: 'Dosen', sortable: true, align: 'end' },
  { key: 'rasio', header: 'Rasio', align: 'end', value: (r) => Math.round(r.mahasiswa / r.dosen), cell: (r) => `1 : ${Math.round(r.mahasiswa / r.dosen)}`, sortable: true, defaultHidden: true },
  { key: 'akreditasi', header: 'Akreditasi', shrink: true, mobile: 'badge', cell: (r) => <Badge variant={TONE[r.akreditasi]}>{r.akreditasi}</Badge> },
];

export function Dasar() {
  return <DataTable columns={COLS} rows={PRODI} rowKey={(r) => r.kode} defaultSort={{ key: 'mahasiswa', dir: 'desc' }} perPage={5} exportCsv="program-studi" toolbar={<strong style={{ lineHeight: '2rem' }}>Program studi</strong>} />;
}

export function Pilih() {
  const toast = useToast();
  return (
    <DataTable
      columns={COLS}
      rows={PRODI}
      rowKey={(r) => r.kode}
      perPage={5}
      selectable
      defaultDensity="compact"
      actions={<Button size="sm"><UserPlus /> Tambah</Button>}
      bulkActions={(keys, clear) => (
        <>
          <Button size="xs" variant="outline" onClick={() => toast.add({ title: `${keys.length} prodi diekspor` })}><Download /> Ekspor</Button>
          <Button size="xs" variant="destructive-soft" onClick={() => { toast.add({ title: `${keys.length} prodi diarsipkan` }); clear(); }}><Archive /> Arsipkan</Button>
        </>
      )}
      rowActions={(r) => [
        { label: 'Ubah', icon: <Pencil />, onSelect: () => toast.add({ title: `Ubah ${r.nama}` }) },
        { label: 'Kirim surel ke kaprodi', icon: <Mail /> },
        { type: 'separator' },
        { label: 'Hapus', icon: <Trash2 />, destructive: true },
      ]}
    />
  );
}

export function Memuat() {
  const [mode, setMode] = React.useState<'memuat' | 'kosong' | 'galat'>('memuat');
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['memuat', 'kosong', 'galat'] as const).map((m) => (
          <Button key={m} size="xs" variant={mode === m ? 'soft' : 'ghost'} onClick={() => setMode(m)}>{m[0].toUpperCase() + m.slice(1)}</Button>
        ))}
      </div>
      <DataTable
        columns={COLS}
        rows={mode === 'memuat' ? undefined : []}
        loading={mode === 'memuat'}
        error={mode === 'galat' ? new Error('Server tidak menjawab (503). Coba beberapa saat lagi.') : undefined}
        onRetry={() => setMode('memuat')}
        rowKey={(r) => r.kode}
        columnToggle={false}
        densityToggle={false}
        empty={{ title: 'Belum ada program studi', description: 'Tambahkan program studi pertama untuk mulai mengelola kurikulum.', action: <Button size="sm"><UserPlus /> Tambah prodi</Button> }}
      />
    </div>
  );
}
