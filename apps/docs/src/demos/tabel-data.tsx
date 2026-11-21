import { Archive, Download, Mail, Pencil, Trash2, UserPlus } from 'lucide-react';
import * as React from 'react';
import { ambilSemuaHalaman, Badge, Button, DataTable, useToast, type DataColumn } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Tabel data (DataTable)',
  category: 'Tabel data',
  layout: 'wide',
  order: 1,
  description: 'Tabel inti untuk semua daftar: urut, halaman, pilih baris dengan aksi massal, menu aksi per baris, pilih kolom, kerapatan, unduh CSV, kerangka saat memuat, keadaan kosong dan galat. Di layar di bawah 640 px baris berubah menjadi kartu bertumpuk.',
  importLine: "import { DataTable, type DataColumn } from 'unipo-ui';",
  demos: { Dasar: 'Data lokal: urut, halaman, kolom', Pilih: 'Pilih baris dan aksi massal', Memuat: 'Memuat, kosong, galat', TanpaHalaman: 'Tabel kecil tanpa kaki halaman (pagination={false})', Server: 'Paging server: format kolom, baris per halaman, unduh CSV semua data' },
  props: [
    ['columns', 'DataColumn<T>[]', "key, header, cell, value, sortable, align, shrink, hideable, defaultHidden, mobile, format ('angka' | 'rupiah' | 'persen' rata kanan, 'tanggal', 'tanggal-waktu', 'status' + peta status)."],
    ['rows, rowKey', 'T[], (row) => string', 'Data dan kunci unik baris.'],
    ['sort / onSortChange', 'SortState', 'Tanpa onSortChange diurutkan di browser.'],
    ['page, perPage, total, onPageChange', 'number', 'Tanpa onPageChange dipotong di browser.'],
    ['onPerPageChange, perPageOptions', '(n) => void, number[]', 'Pemilih baris per halaman. Otomatis untuk data lokal dan useSiakadTable/TabelSumber; paging server buatan sendiri wajib mengisi onPerPageChange.'],
    ['stickyHeader, maxHeight', 'boolean, number | string', 'Header menempel (bawaan true): tinggi maksimum setinggi layar dikurangi --u-dt-sticky-offset, baris digulir di dalam tabel, gulir horizontal tetap.'],
    ['pagination', 'boolean', 'false: semua baris tampil tanpa kaki halaman, untuk tabel kecil di panel. Bawaan true.'],
    ['selectable, bulkActions', 'boolean, (keys, clear) => ReactNode', 'Kotak centang dan bilah aksi massal.'],
    ['rowActions', '(row) => MenuEntry[]', 'Menu ⋯ di ujung baris.'],
    ['toolbar, actions', 'ReactNode', 'Isi bilah atas (mis. FilterBar) dan tombol tambahan.'],
    ['exportCsv', 'boolean | string', 'Unduh CSV kolom yang tampil. Data lokal: semua baris. Paging server: semua baris sesuai saringan bila exportAll diisi; tanpa exportAll tombolnya "halaman ini saja".'],
    ['exportAll, exportLimit', '({ signal, batas, onProgress }) => Promise, number', 'Ambil semua halaman dari server (ambilSemuaHalaman) dengan status progres + Batalkan; di atas batas (bawaan 10.000) ada peringatan dan berkas ditandai "sebagian". useSiakadTable/TabelSumber mengisinya otomatis.'],
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

export function TanpaHalaman() {
  return <DataTable columns={COLS.slice(0, 4)} rows={PRODI.slice(0, 4)} rowKey={(r) => r.kode} pagination={false} columnToggle={false} densityToggle={false} />;
}

// ---------------------------------------------------------------- Paging server (tiruan)
interface Tagihan { id: number; nim: string; nama: string; jumlah: number; jatuh_tempo: string; status: string }
const STATUS_TAGIHAN = { lunas: { label: 'Lunas', tone: 'success' as const }, belum: { label: 'Belum dibayar', tone: 'warning' as const }, lewat: { label: 'Lewat tempo', tone: 'danger' as const } };
const SEMUA_TAGIHAN: Tagihan[] = Array.from({ length: 1234 }, (_, i) => ({
  id: i + 1,
  nim: `2${String(100000 + i * 7).slice(0, 6)}`,
  nama: ['Ani Lestari', 'Budi Santoso', 'Citra Dewi', 'Dedi Kurniawan', 'Eka Putri'][i % 5]!,
  jumlah: 1_500_000 + (i % 7) * 250_000,
  jatuh_tempo: `2026-${String((i % 12) + 1).padStart(2, '0')}-15`,
  status: ['lunas', 'belum', 'lewat'][i % 3]!,
}));
/** Server tiruan: per_page dibatasi 100, jeda 150 ms per halaman. */
const ambilTagihan = (page: number, per: number) =>
  new Promise<{ data: Tagihan[]; meta: { page: number; per_page: number; total: number; total_pages: number } }>((ok) => {
    const p = Math.min(per, 100);
    setTimeout(() => ok({ data: SEMUA_TAGIHAN.slice((page - 1) * p, page * p), meta: { page, per_page: p, total: SEMUA_TAGIHAN.length, total_pages: Math.ceil(SEMUA_TAGIHAN.length / p) } }), 150);
  });
const COLS_TAGIHAN: DataColumn<Tagihan>[] = [
  { key: 'nama', header: 'Mahasiswa', cell: (r) => <><strong>{r.nama}</strong><div style={{ fontSize: 12, color: 'var(--u-muted-foreground)' }}>NIM {r.nim}</div></>, value: (r) => r.nama },
  { key: 'nim', header: 'NIM', defaultHidden: true },
  { key: 'jumlah', header: 'Jumlah', format: 'rupiah' },
  { key: 'jatuh_tempo', header: 'Jatuh tempo', format: 'tanggal' },
  { key: 'status', header: 'Status', format: 'status', status: STATUS_TAGIHAN, shrink: true, mobile: 'badge' },
];

export function Server() {
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(25);
  const [res, setRes] = React.useState<{ data: Tagihan[]; total: number }>();
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setLoading(true);
    let hidup = true;
    void ambilTagihan(page, perPage).then((r) => hidup && (setRes({ data: r.data, total: r.meta.total }), setLoading(false)));
    return () => {
      hidup = false;
    };
  }, [page, perPage]);
  return (
    <DataTable
      columns={COLS_TAGIHAN}
      rows={res?.data}
      total={res?.total}
      loading={loading}
      rowKey={(r) => String(r.id)}
      page={page}
      perPage={perPage}
      onPageChange={setPage}
      onPerPageChange={(n) => (setPerPage(n), setPage(1))}
      exportCsv="tagihan"
      exportAll={({ signal, batas, onProgress }) => ambilSemuaHalaman({ signal, batas, onProgress, ambil: (p, per) => ambilTagihan(p, per) })}
      exportLimit={1000}
      toolbar={<strong style={{ lineHeight: '2rem' }}>Tagihan (1.234 baris, batas unduh contoh 1.000)</strong>}
    />
  );
}
