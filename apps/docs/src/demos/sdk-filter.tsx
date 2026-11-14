import { Download, LayoutGrid, Tag as TagIcon } from 'lucide-react';
import * as React from 'react';
import { Badge, Button, FilterBar, filterToQuery, Tooltip, type FilterField, type FilterValues } from 'unipo-ui';
import { FilterBerkas, FilterDokumen, FilterDosen, FilterMahasiswa, FilterMataKuliah, FilterPegawai, FilterSuratKeluar, FilterSuratMasuk, useSiakadQuery } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Saringan data (Filter)',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 3,
  description: 'Bilah saringan modern: kotak cari, tombol saringan berbentuk pil (pilih satu, pilih banyak, rentang tanggal, ya/tidak), chip saringan aktif, dan jumlah hasil. Di layar kecil semua saringan pindah ke lembar bawah "Saring". Tersedia preset untuk mahasiswa, dosen, pegawai, mata kuliah, dokumen, berkas, surat masuk, dan surat keluar.',
  importLine: "import { FilterBar, filterToQuery } from 'unipo-ui';\nimport { FilterMahasiswa, FilterSuratMasuk } from 'unipo-ui/siakad';",
  demos: {
    Mahasiswa: 'Mahasiswa, langsung memanggil mahasiswa.list',
    Dosen: 'Dosen',
    Pegawai: 'Pegawai dan tendik',
    MataKuliah: 'Mata kuliah',
    SuratMasuk: 'Surat masuk',
    SuratKeluar: 'Surat keluar',
    Dokumen: 'Dokumen arsip',
    Berkas: 'Berkas',
    Kustom: 'FilterBar dengan field sendiri',
  },
  props: [
    ['value / onValueChange', 'FilterValues', 'Nilai saringan; kunci sama dengan parameter query endpoint SDK.'],
    ['resultCount, resultLabel', 'number, string', 'Teks "64 mahasiswa" di kanan.'],
    ['actions', 'ReactNode', 'Tombol tambahan (ekspor, ganti tampilan).'],
    ['extraFields / hide', 'FilterField[] / string[]', 'Preset: tambah, ganti, atau sembunyikan field bawaan.'],
    ['FilterField.type', "'select' | 'multi' | 'date-range' | 'boolean' | 'custom'", 'Jenis kontrol di dalam popover.'],
  ],
  notes: [
    'filterToQuery(values) mengubah nilai saringan menjadi parameter query: pilihan banyak → "a,b", rentang tanggal → tanggal_dari dan tanggal_sampai, ya/tidak → 1.',
    'useFilterParams() menyimpan saringan di URL (?prodi=55201&status=A) sehingga halaman bisa dibagikan dan tombol kembali browser tetap bekerja.',
  ],
};

export function Mahasiswa() {
  const [f, setF] = React.useState<FilterValues>({ status: 'A' });
  const { data, meta: m, loading } = useSiakadQuery(['mhs-filter', f], (s, signal) => s.mahasiswa.list({ ...filterToQuery(f), per_page: 5 }, { signal }));
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <FilterMahasiswa
        value={f}
        onValueChange={setF}
        resultCount={m?.total as number | undefined}
        actions={
          <Tooltip content="Ekspor CSV">
            <Button variant="outline" size="sm" iconOnly aria-label="Ekspor CSV">
              <Download />
            </Button>
          </Tooltip>
        }
      />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, opacity: loading ? 0.55 : 1, transition: 'opacity .15s' }}>
        {((data as Array<Record<string, string>>) ?? []).map((r) => (
          <li key={r.nim} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '6px 10px', border: '1px solid var(--u-border)', borderRadius: 8, fontSize: 13 }}>
            <code style={{ fontFamily: 'var(--u-font-mono)', color: 'var(--u-muted-foreground)' }}>{r.nim}</code>
            <span style={{ flex: 1, fontWeight: 500 }}>{r.nama}</span>
            <span style={{ color: 'var(--u-muted-foreground)' }}>{r.nama_prodi}</span>
            <Badge variant={r.status_aktif === 'A' ? 'success' : 'neutral'} dot>
              {r.status_aktif_label}
            </Badge>
          </li>
        ))}
      </ul>
      <code style={{ fontSize: 12, color: 'var(--u-muted-foreground)' }}>mahasiswa.list({JSON.stringify(filterToQuery(f))})</code>
    </div>
  );
}

const useF = (init: FilterValues = {}) => React.useState<FilterValues>(init);

export function Dosen() {
  const [f, setF] = useF({ jabatan: ['lektor', 'lektor_kepala'] });
  return <FilterDosen value={f} onValueChange={setF} resultCount={24} />;
}
export function Pegawai() {
  const [f, setF] = useF({ jenis: 'tendik' });
  return <FilterPegawai value={f} onValueChange={setF} resultCount={86} />;
}
export function MataKuliah() {
  const [f, setF] = useF({ prodi: '55201', sks: ['3'] });
  return <FilterMataKuliah value={f} onValueChange={setF} resultCount={42} />;
}
export function SuratMasuk() {
  const [f, setF] = useF({ status: ['baru', 'didisposisi'], perlu_tindakan: true });
  return <FilterSuratMasuk value={f} onValueChange={setF} resultCount={7} />;
}
export function SuratKeluar() {
  const [f, setF] = useF({ tanggal: { from: '2026-11-01', to: '2026-11-14' } });
  return <FilterSuratKeluar value={f} onValueChange={setF} resultCount={19} />;
}
export function Dokumen() {
  const [f, setF] = useF({ status_verifikasi: 'diajukan' });
  return <FilterDokumen value={f} onValueChange={setF} resultCount={128} />;
}
export function Berkas() {
  const [f, setF] = useF({ tipe: ['pdf'] });
  return (
    <FilterBerkas
      value={f}
      onValueChange={setF}
      resultCount={312}
      actions={
        <Tooltip content="Tampilan kisi">
          <Button variant="outline" size="sm" iconOnly aria-label="Tampilan kisi">
            <LayoutGrid />
          </Button>
        </Tooltip>
      }
    />
  );
}

const FIELDS: FilterField[] = [
  { key: 'kategori', label: 'Kategori', type: 'multi', icon: <TagIcon />, options: [
    { value: 'akademik', label: 'Akademik', count: 32 },
    { value: 'kemahasiswaan', label: 'Kemahasiswaan', count: 18 },
    { value: 'penelitian', label: 'Penelitian', count: 9 },
    { value: 'pengabdian', label: 'Pengabdian', count: 6 },
  ] },
  { key: 'terbit', label: 'Tanggal terbit', type: 'date-range' },
  { key: 'unggulan', label: 'Berita unggulan', type: 'boolean' },
];
export function Kustom() {
  const [f, setF] = useF();
  return <FilterBar fields={FIELDS} value={f} onValueChange={setF} search={{ placeholder: 'Cari judul berita' }} resultCount={65} resultLabel="berita" />;
}
