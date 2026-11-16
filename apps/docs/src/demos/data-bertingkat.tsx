import * as React from 'react';
import { Badge, DataTable, Field, Input, PilihInduk, type DataColumn } from 'unipo-ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Data bertingkat (induk-anak)',
  category: 'Tabel data',
  layout: 'wide',
  order: 2,
  badge: 'baru',
  description:
    'Untuk data yang punya sub: kategori aset, unit kerja, akun/COA, klasifikasi arsip, menu portal, standar SPMI. Tabel mulai dari induk teratas; anak dibuka per induk lewat tombol panah dan tampil menjorok dengan garis penghubung. Pemilih induk menampilkan susunan yang sama, tanpa ID mentah, dan saat dicari menampilkan jalur induknya.',
  importLine: "import { DataTable, PilihInduk, susunPohon, usePohon, SelPohon, OpsiPohon } from 'unipo-ui';",
  demos: {
    Tabel: 'DataTable dengan prop tree: mulai dari induk teratas, buka/tutup per induk',
    Cari: 'Saat mencari (filtered) semua cabang terbuka supaya hasil tidak tersembunyi',
    Pemilih: 'PilihInduk: pilihan berjenjang; data yang sedang diubah dan turunannya tidak bisa dipilih',
  },
  props: [
    ['tree.parentKey', '(row) => string | number | null', 'DataTable: kunci induk baris. Kosong/0 = induk teratas.'],
    ['tree.defaultExpanded', 'boolean | number', 'Bawaan false: hanya induk teratas. true = semua terbuka, angka = sampai tingkat itu.'],
    ['tree.expandAllToggle', 'boolean', 'Tombol Buka semua/Tutup semua di bilah alat. Bawaan true.'],
    ['PilihInduk: rows, getKey, getParent, getLabel, getMeta', 'fungsi', 'Baris datar disusun jadi pohon di dalam. getMeta biasanya kode, bukan ID.'],
    ['PilihInduk: value, onValueChange, exclude', 'string | null', 'exclude = kunci data yang sedang diubah: dirinya dan turunannya disembunyikan (mencegah siklus).'],
    ['susunPohon(rows, { getKey, getParent })', 'NodePohon[]', 'Utilitas: urutan pohon dengan depth, childCount, ancestors. Baris yang induknya tidak ada menjadi akar.'],
    ['usePohon(nodes, { defaultExpanded, storageKey, showAll })', 'hook', 'Keadaan buka/tutup untuk tabel atau daftar buatan sendiri; pasangkan dengan SelPohon.'],
  ],
  notes: [
    'Halaman dihitung dari baris yang tampil, jadi induk teratas tidak terpotong oleh anak-anaknya. Untuk data yang sangat besar (lebih dari beberapa ribu baris) muat per induk dari server.',
    'Kolom "Induk" tidak perlu ditampilkan di mode pohon karena posisinya sudah menunjukkan induk. Bila tetap perlu (mis. ekspor), tampilkan nama induk, bukan ID.',
  ],
};

interface Kategori {
  id: number;
  induk_id: number | null;
  kode: string;
  nama: string;
  umur_ekonomis: number | null;
  habis_pakai: boolean;
}
const KATEGORI: Kategori[] = [
  { id: 5, induk_id: null, kode: 'elektronik', nama: 'Peralatan Elektronik', umur_ekonomis: 4, habis_pakai: false },
  { id: 6, induk_id: null, kode: 'furniture', nama: 'Perabot dan Furniture', umur_ekonomis: 8, habis_pakai: false },
  { id: 9, induk_id: 5, kode: 'komputer', nama: 'Komputer', umur_ekonomis: 4, habis_pakai: false },
  { id: 8, induk_id: null, kode: 'laboratorium', nama: 'Peralatan Laboratorium', umur_ekonomis: 5, habis_pakai: false },
  { id: 10, induk_id: 9, kode: 'laptop', nama: 'Laptop', umur_ekonomis: 4, habis_pakai: false },
  { id: 15, induk_id: 6, kode: 'meja-dosen', nama: 'Meja Belajar Dosen', umur_ekonomis: 8, habis_pakai: false },
  { id: 14, induk_id: 6, kode: 'meja-mahasiswa', nama: 'Meja Belajar Mahasiswa', umur_ekonomis: 8, habis_pakai: false },
  { id: 7, induk_id: null, kode: 'networking', nama: 'Peralatan Jaringan', umur_ekonomis: 4, habis_pakai: false },
  { id: 11, induk_id: 9, kode: 'pc', nama: 'PC', umur_ekonomis: 4, habis_pakai: false },
  { id: 12, induk_id: 5, kode: 'printer', nama: 'Printer', umur_ekonomis: 3, habis_pakai: false },
  { id: 16, induk_id: 12, kode: 'tinta', nama: 'Tinta dan Toner', umur_ekonomis: null, habis_pakai: true },
  { id: 13, induk_id: 5, kode: 'tv', nama: 'TV LCD', umur_ekonomis: 5, habis_pakai: false },
  { id: 17, induk_id: 7, kode: 'router', nama: 'Router dan Switch', umur_ekonomis: 4, habis_pakai: false },
];

const KOLOM: DataColumn<Kategori>[] = [
  { key: 'nama', header: 'Nama', sortable: true, cell: (r) => r.nama },
  { key: 'kode', header: 'Kode', sortable: true, cell: (r) => <code>{r.kode}</code> },
  { key: 'umur_ekonomis', header: 'Umur ekonomis', align: 'end', cell: (r) => (r.umur_ekonomis ? `${r.umur_ekonomis} tahun` : '—') },
  { key: 'habis_pakai', header: 'Habis pakai', cell: (r) => (r.habis_pakai ? <Badge variant="warning">Ya</Badge> : <span style={{ color: 'var(--u-muted-foreground)' }}>Tidak</span>) },
];
const induk = (r: Kategori) => r.induk_id;
const kunci = (r: Kategori) => String(r.id);

export function Tabel() {
  return <DataTable columns={KOLOM} rows={KATEGORI} rowKey={kunci} tree={{ parentKey: induk }} defaultSort={{ key: 'nama', dir: 'asc' }} perPageOptions={[25, 50]} perPage={25} />;
}

export function Cari() {
  const [q, setQ] = React.useState('meja');
  const rows = KATEGORI.filter((r) => !q || `${r.nama} ${r.kode}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <DataTable
      toolbar={<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kategori…" aria-label="Cari kategori" style={{ maxWidth: 260 }} />}
      columns={KOLOM}
      rows={rows}
      rowKey={kunci}
      tree={{ parentKey: induk }}
      filtered={Boolean(q)}
      emptyFiltered={{ onReset: () => setQ('') }}
    />
  );
}

export function Pemilih() {
  const [baru, setBaru] = React.useState<string | null>('9');
  const [ubah, setUbah] = React.useState<string | null>('5');
  return (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
      <Field label="Induk (tambah kategori)" description="Kosongkan bila kategori ini induk teratas.">
        <PilihInduk rows={KATEGORI} getKey={kunci} getParent={induk} getLabel={(r) => r.nama} getMeta={(r) => r.kode} value={baru} onValueChange={(k) => setBaru(k)} />
      </Field>
      <Field label="Induk (ubah “Komputer”)" description="Komputer, Laptop, dan PC tidak muncul: kategori tidak bisa menjadi induk dirinya sendiri.">
        <PilihInduk rows={KATEGORI} getKey={kunci} getParent={induk} getLabel={(r) => r.nama} getMeta={(r) => r.kode} value={ubah} onValueChange={(k) => setUbah(k)} exclude="9" />
      </Field>
    </div>
  );
}
