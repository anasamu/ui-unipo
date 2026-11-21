'use client';
import * as React from 'react';
import { BadgeCheck, BookOpen, Clock, Folder, LayoutGrid, Paperclip, Rows3 } from 'lucide-react';
import type { ApiResult, Siakad } from 'unipo-siakad-sdk';
import { Badge } from '../components/actions';
import { Avatar, CellPrimary } from '../components/display';
import { DataTable, type DataColumn, type DataTableProps } from '../components/data-table';
import { SegmentedControl } from '../components/forms';
import { filterToQuery, useFilterParams, type FilterField, type FilterValues } from '../components/filter';
import type { MenuEntry } from '../components/overlays';
import { formatDate } from '../lib/format';
import { useOptionalSiakad, useSiakadQuery } from './provider';
import { ambilSemuaHalaman } from '../lib/tabel';
import { LabelProdi } from './prodi';
import { SheetDetailDosen, SheetDetailMahasiswa, SheetDetailMataKuliah } from './akademik';
import {
  AKSES_ARSIP,
  FilterBerkas,
  FilterDokumen,
  FilterDosen,
  FilterMahasiswa,
  FilterMataKuliah,
  FilterPegawai,
  FilterSuratKeluar,
  FilterSuratMasuk,
  SIFAT_SURAT,
  STATUS_ARSIP,
  STATUS_PEGAWAI,
  STATUS_SURAT_KELUAR,
  STATUS_SURAT_MASUK,
  STATUS_VERIFIKASI,
  useFilterFields,
  type FilterPreset,
  type PresetFilterProps,
} from './filter-presets';

type Row = Record<string, any>;
type Tone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

// ================================================================ Hook tabel server
export interface SiakadTableOptions<T> {
  /** Kunci cache, mis. 'mahasiswa'. */
  key: string;
  /** Panggilan SDK dengan query (saringan + page + per_page). */
  fetch: (siakad: Siakad, query: Record<string, string | number>, signal: AbortSignal) => Promise<ApiResult<T[]>>;
  initialFilter?: FilterValues;
  /** Field saringan, untuk menerjemahkan rentang tanggal ke parameter yang benar. */
  fields?: FilterField[];
  perPage?: number;
  /** Simpan saringan di URL (?status=A). */
  syncUrl?: boolean;
}

/**
 * Hubungkan DataTable + FilterBar ke endpoint daftar SDK (berhalaman di server).
 *   const t = useSiakadTable({ key: 'mhs', fetch: (s, q, signal) => s.mahasiswa.list(q, { signal }) });
 *   <DataTable {...t.tableProps} columns={…} rowKey={(r) => r.nim} toolbar={<FilterMahasiswa {...t.filterProps} />} />
 */
export function useSiakadTable<T>({ key, fetch, initialFilter = {}, fields, perPage: perPageInit = 20, syncUrl }: SiakadTableOptions<T>) {
  const local = React.useState<FilterValues>(initialFilter);
  const url = useFilterParams(initialFilter);
  const [filter, setFilterRaw] = syncUrl ? url : local;
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(perPageInit);
  const query = { ...filterToQuery(filter, fields), page, per_page: perPage };
  const q = useSiakadQuery([key, query], (s, signal) => fetch(s, query, signal), { staleTime: 15_000 });
  const siakad = useOptionalSiakad();
  /** Ekspor CSV: ambil SEMUA halaman sesuai saringan aktif (bukan hanya halaman tampil), maksimal `batas` baris. */
  const exportAll: DataTableProps<T>['exportAll'] = siakad
    ? ({ signal, batas, onProgress }) => {
        const saringan = filterToQuery(filter, fields);
        return ambilSemuaHalaman<T>({
          signal,
          batas,
          onProgress,
          ambil: async (p, per, sig) => {
            const r = await fetch(siakad, { ...saringan, page: p, per_page: per }, sig);
            return { data: r.data, meta: r.meta };
          },
        });
      }
    : undefined;
  const setFilter = (v: FilterValues) => {
    setFilterRaw(v);
    setPage(1);
  };
  const filtered = Object.keys(filter).length > 0;
  return {
    filter,
    setFilter,
    query,
    ...q,
    filterProps: { value: filter, onValueChange: setFilter, resultCount: q.meta?.total ?? undefined },
    tableProps: {
      rows: q.data,
      loading: q.loading,
      error: q.error,
      onRetry: q.refetch,
      page,
      perPage,
      total: q.meta?.total ?? q.data?.length ?? 0,
      onPageChange: setPage,
      onPerPageChange: (n: number) => {
        setPerPage(n);
        setPage(1);
      },
      filtered,
      emptyFiltered: { onReset: () => setFilter({}) },
      exportAll,
    } satisfies Partial<DataTableProps<T>>,
  };
}

// ================================================================ Sel bersama
const toneOf = (map: Record<string, Tone>, v: unknown): Tone => map[String(v)] ?? 'neutral';
const labelFrom = (opts: Array<{ value: string; text?: string; label: React.ReactNode }>, v: unknown) => String(opts.find((o) => o.value === v)?.text ?? v ?? '–');

function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <Badge variant={tone} dot>
      {children}
    </Badge>
  );
}
const Mono = ({ children }: { children: React.ReactNode }) => <span className="u-mono">{children}</span>;
const Muted = ({ children }: { children: React.ReactNode }) => <span style={{ color: 'var(--u-muted-foreground)' }}>{children}</span>;
const tanggal = (v: unknown) => (v ? formatDate(String(v), 'medium') : '–');

// ================================================================ Kartu untuk tampilan kisi
/** Isi kartu standar untuk tampilan kisi tabel: media, judul, subjudul, lencana, dan beberapa angka. */
export function KartuData({
  media,
  title,
  subtitle,
  badge,
  prodi,
  meta,
}: {
  media?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  /** Baris program studi, mis. <LabelProdi kode="22201" /> (logo fakultas + akreditasi). */
  prodi?: React.ReactNode;
  meta?: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div className="u-kartu-data">
      <div className="u-kartu-data-head">
        {media}
        <div className="u-kartu-data-id">
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </div>
      </div>
      {badge && <div className="u-kartu-data-badge">{badge}</div>}
      {prodi && <div className="u-kartu-data-prodi">{prodi}</div>}
      {meta && meta.length > 0 && (
        <dl className="u-kartu-data-meta">
          {meta.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// ================================================================ Props bersama tabel turunan
export type TampilanTabel = 'tabel' | 'kartu';
export interface TabelSiakadProps<T> extends Omit<Partial<DataTableProps<T>>, 'rows' | 'columns' | 'toolbar' | 'grid'> {
  /** Saringan awal, mis. { prodi: '55201', status: 'A' }. */
  initialFilter?: FilterValues;
  syncUrl?: boolean;
  /** Kolom tambahan (di akhir) atau pengganti (key sama). */
  extraColumns?: DataColumn<T>[];
  hideColumns?: string[];
  /** Props tambahan untuk saringan (hide, extraFields). */
  filterProps?: Partial<PresetFilterProps>;
  /** Sembunyikan bilah saringan. */
  noFilter?: boolean;
  rowActions?: (row: T) => MenuEntry[];
  /**
   * 'lengkap' (bawaan): saringan, pilih kolom, kerapatan, CSV.
   * 'ringkas': untuk kartu dasbor atau tab detail. Tanpa saringan dan alat, rapat, 5 baris per halaman.
   */
  varian?: 'lengkap' | 'ringkas';
  /** Tampilan awal: tabel atau kisi kartu (tersedia untuk mahasiswa, dosen, pegawai, mata kuliah). */
  tampilan?: TampilanTabel;
  onTampilanChange?: (t: TampilanTabel) => void;
  /** Tombol ganti tabel/kartu di bilah alat. Bawaan: tampil bila tabel punya tampilan kartu dan varian lengkap. */
  tampilanToggle?: boolean;
  /** Klik baris membuka panel detail (mahasiswa, dosen, mata kuliah). Diabaikan bila onRowClick diisi. */
  detail?: boolean;
}

type DetailSheet<T> = React.ComponentType<{ row: T | null; onClose: () => void }>;

function makeTabel<T extends Row>(cfg: {
  name: string;
  key: string;
  preset: FilterPreset;
  Filter: React.ComponentType<PresetFilterProps>;
  fetch: SiakadTableOptions<T>['fetch'];
  rowKey: (r: T) => string;
  columns: DataColumn<T>[];
  empty: DataTableProps<T>['empty'];
  csv: string;
  kartu?: (r: T) => React.ReactNode;
  Detail?: DetailSheet<T>;
}) {
  function Tabel({
    initialFilter,
    syncUrl,
    extraColumns = [],
    hideColumns = [],
    filterProps,
    noFilter,
    perPage,
    varian = 'lengkap',
    tampilan: tampilanProp,
    onTampilanChange,
    tampilanToggle,
    detail,
    onRowClick,
    actions,
    ...rest
  }: TabelSiakadProps<T>) {
    const ringkas = varian === 'ringkas';
    const fields = useFilterFields(cfg.preset);
    const t = useSiakadTable<T>({ key: cfg.key, fetch: cfg.fetch, initialFilter, fields, perPage: perPage ?? (ringkas ? 5 : undefined), syncUrl });
    const columns = [...cfg.columns.filter((c) => !hideColumns.includes(c.key) && !extraColumns.some((e) => e.key === c.key)), ...extraColumns];
    const [tampilanInner, setTampilan] = React.useState<TampilanTabel>(tampilanProp ?? 'tabel');
    const tampilan = cfg.kartu ? (tampilanProp ?? tampilanInner) : 'tabel';
    const [dipilih, setDipilih] = React.useState<T | null>(null);
    const bukaDetail = detail && cfg.Detail && !onRowClick ? setDipilih : undefined;
    const toggle =
      cfg.kartu && (tampilanToggle ?? !ringkas) ? (
        <SegmentedControl<TampilanTabel>
          aria-label="Tampilan"
          value={tampilan}
          onValueChange={(v) => {
            setTampilan(v);
            onTampilanChange?.(v);
          }}
          options={[
            { value: 'tabel', label: '', icon: <Rows3 />, 'aria-label': 'Tabel' },
            { value: 'kartu', label: '', icon: <LayoutGrid />, 'aria-label': 'Kartu' },
          ]}
        />
      ) : null;
    const kisi = tampilan === 'kartu';
    return (
      <>
        <DataTable<T>
          columns={columns}
          rowKey={cfg.rowKey}
          toolbar={noFilter || ringkas ? undefined : <cfg.Filter {...t.filterProps} {...filterProps} />}
          empty={cfg.empty}
          exportCsv={ringkas ? undefined : cfg.csv}
          storageKey={cfg.key}
          columnToggle={!ringkas && !kisi}
          densityToggle={!ringkas && !kisi}
          defaultDensity={ringkas ? 'compact' : undefined}
          grid={kisi ? cfg.kartu : undefined}
          actions={
            toggle || actions ? (
              <>
                {actions}
                {toggle}
              </>
            ) : undefined
          }
          {...t.tableProps}
          onPerPageChange={ringkas ? undefined : t.tableProps.onPerPageChange}
          onRowClick={onRowClick ?? bukaDetail}
          {...rest}
        />
        {bukaDetail && cfg.Detail && <cfg.Detail row={dipilih} onClose={() => setDipilih(null)} />}
      </>
    );
  }
  Tabel.displayName = cfg.name;
  return Tabel;
}

const meta = (label: string, value: React.ReactNode) => ({ label, value: value ?? '–' });

// ================================================================ Mahasiswa
const TONE_MHS: Record<string, Tone> = { A: 'success', C: 'warning', N: 'neutral', L: 'info', K: 'danger', D: 'danger' };
const KELAS: Record<string, string> = { R: 'Reguler', K: 'Karyawan', D: 'Daring' };

/** Tabel mahasiswa (mahasiswa.list) dengan saringan prodi, angkatan, status, kelas. */
export const TabelMahasiswa = makeTabel<Row>({
  name: 'TabelMahasiswa',
  key: 'tabel-mahasiswa',
  preset: 'mahasiswa',
  Filter: FilterMahasiswa,
  fetch: (s, q, signal) => s.mahasiswa.list(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.nim),
  csv: 'mahasiswa',
  empty: { title: 'Belum ada mahasiswa', description: 'Data mahasiswa muncul di sini setelah diimpor atau didaftarkan.' },
  Detail: ({ row, onClose }) => <SheetDetailMahasiswa nim={row ? String(row.nim) : null} onOpenChange={(o) => !o && onClose()} />,
  kartu: (r) => (
    <KartuData
      media={<Avatar name={String(r.nama ?? r.nim)} src={r.foto} size="lg" />}
      title={r.nama}
      subtitle={
        <>
          <Mono>{r.nim}</Mono>
        </>
      }
      badge={<StatusBadge tone={toneOf(TONE_MHS, r.status_aktif)}>{r.status_aktif_label ?? r.status_aktif}</StatusBadge>}
      prodi={r.kode_prodi || r.nama_prodi ? <LabelProdi kode={r.kode_prodi} nama={r.nama_prodi} prodi={{ kode_jenjang: r.kode_jenjang }} /> : undefined}
      meta={[meta('Angkatan', r.tahun_masuk), meta('IPK', r.ipk != null ? Number(r.ipk).toFixed(2) : null), meta('Kelas', KELAS[r.kelas] ?? r.kelas)]}
    />
  ),
  columns: [
    {
      key: 'nama',
      header: 'Mahasiswa',
      mobile: 'title',
      value: (r) => r.nama,
      cell: (r) => <CellPrimary media={<Avatar name={String(r.nama ?? r.nim)} src={r.foto} size="sm" />} title={r.nama} subtitle={<Mono>{r.nim}</Mono>} />,
    },
    { key: 'nim', header: 'NIM', defaultHidden: true, mobile: 'hidden' },
    { key: 'nama_prodi', header: 'Program studi', cell: (r) => <LabelProdi kode={r.kode_prodi} nama={r.nama_prodi} prodi={{ kode_jenjang: r.kode_jenjang }} />, value: (r) => r.nama_prodi },
    { key: 'tahun_masuk', header: 'Angkatan', shrink: true },
    { key: 'kelas', header: 'Kelas', shrink: true, cell: (r) => KELAS[r.kelas] ?? r.kelas ?? '–' },
    { key: 'semester', header: 'Smt', align: 'end', shrink: true, defaultHidden: true },
    { key: 'ipk', header: 'IPK', align: 'end', shrink: true, cell: (r) => (r.ipk != null ? Number(r.ipk).toFixed(2) : '–') },
    {
      key: 'status_aktif',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      value: (r) => r.status_aktif_label ?? r.status_aktif,
      cell: (r) => <StatusBadge tone={toneOf(TONE_MHS, r.status_aktif)}>{r.status_aktif_label ?? r.status_aktif}</StatusBadge>,
    },
  ],
});

// ================================================================ Dosen
/** Status dosen r_kode 15 SIAKAD (cadangan bila respons belum membawa `status_label`). */
const STATUS_DOSEN: Record<string, string> = { A: 'Aktif', C: 'Cuti', S: 'Studi lanjut', B: 'Tugas belajar', T: 'Tugas di instansi lain', K: 'Keluar', P: 'Pensiun', M: 'Almarhum', G: 'Ganti NIDN', H: 'NIDN dihapus' };
const toneStatusDosen = (v: unknown): Tone => (v === 'A' || v === 'aktif' ? 'success' : v === 'C' || v === 'S' || v === 'B' || v === 'T' ? 'info' : 'neutral');
const labelStatusDosen = (r: Row): string => {
  const v = String(r.status_aktif ?? r.status ?? '');
  if (STATUS_DOSEN[v]) return STATUS_DOSEN[v];
  const l = typeof r.status_label === 'string' ? r.status_label.toLowerCase() : '';
  return l ? l.charAt(0).toUpperCase() + l.slice(1) : v;
};
/** Tabel dosen (dosen.list) dengan saringan prodi dan status. Bawaan SIAKAD hanya dosen aktif. */
export const TabelDosen = makeTabel<Row>({
  name: 'TabelDosen',
  key: 'tabel-dosen',
  preset: 'dosen',
  Filter: FilterDosen,
  fetch: (s, q, signal) => s.dosen.list(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.nidn),
  csv: 'dosen',
  empty: { title: 'Belum ada dosen' },
  Detail: ({ row, onClose }) => <SheetDetailDosen nidn={row ? String(row.nidn) : null} onOpenChange={(o) => !o && onClose()} />,
  kartu: (r) => {
    const v = r.status_aktif ?? r.status;
    return (
      <KartuData
        media={<Avatar name={String(r.nama ?? r.nidn)} src={r.foto} size="lg" />}
        title={r.nama_lengkap ?? r.nama}
        subtitle={
          <>
            NIDN <Mono>{r.nidn}</Mono>
          </>
        }
        prodi={r.kode_prodi || r.nama_prodi ? <LabelProdi kode={r.kode_prodi} nama={r.nama_prodi} /> : undefined}
        badge={<StatusBadge tone={toneStatusDosen(v)}>{labelStatusDosen(r)}</StatusBadge>}
        meta={[meta('Jabatan', r.jabatan_akademik ?? 'Belum ada'), meta('Pendidikan', r.pendidikan)]}
      />
    );
  },
  columns: [
    {
      key: 'nama',
      header: 'Dosen',
      mobile: 'title',
      value: (r) => r.nama_lengkap ?? r.nama,
      cell: (r) => (
        <CellPrimary
          media={<Avatar name={String(r.nama ?? r.nidn)} src={r.foto} size="sm" />}
          title={r.nama_lengkap ?? r.nama}
          subtitle={
            <>
              NIDN <Mono>{r.nidn}</Mono>
            </>
          }
        />
      ),
    },
    { key: 'nama_prodi', header: 'Homebase', value: (r) => r.nama_prodi, cell: (r) => (r.kode_prodi || r.nama_prodi ? <LabelProdi kode={r.kode_prodi} nama={r.nama_prodi} /> : '–') },
    { key: 'jabatan_akademik', header: 'Jabatan akademik', cell: (r) => r.jabatan_akademik ?? <Muted>Belum ada</Muted> },
    { key: 'pendidikan', header: 'Pendidikan', shrink: true, defaultHidden: true },
    {
      key: 'status',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      value: (r) => r.status_aktif ?? r.status,
      cell: (r) => {
        const v = r.status_aktif ?? r.status;
        return <StatusBadge tone={toneStatusDosen(v)}>{labelStatusDosen(r)}</StatusBadge>;
      },
    },
  ],
});

// ================================================================ Pegawai / tendik
const TONE_PEGAWAI: Record<string, Tone> = {
  aktif: 'success',
  cuti: 'warning',
  tugas_belajar: 'info',
  izin_belajar: 'info',
  diperbantukan: 'info',
  nonaktif: 'neutral',
  pensiun: 'neutral',
  keluar: 'danger',
};

/** Tabel pegawai, dosen, dan tendik dari modul SDM (sdm.getPegawai). Isi initialFilter={{ jenis: 'tendik' }} untuk tendik saja. */
export const TabelPegawai = makeTabel<Row>({
  name: 'TabelPegawai',
  key: 'tabel-pegawai',
  preset: 'pegawai',
  Filter: FilterPegawai,
  fetch: (s, q, signal) => s.sdm.getPegawai(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.id ?? r.uuid ?? r.nip ?? r.nidn),
  csv: 'pegawai',
  empty: { title: 'Belum ada pegawai' },
  kartu: (r) => (
    <KartuData
      media={<Avatar name={String(r.nama ?? '')} src={r.foto} size="lg" />}
      title={r.nama_lengkap ?? r.nama}
      subtitle={r.unit_nama ?? (r.nip ? `NIP ${r.nip}` : undefined)}
      badge={
        <>
          <Badge variant={r.jenis === 'dosen' ? 'primary' : 'secondary'}>{r.jenis === 'dosen' ? 'Dosen' : 'Tendik'}</Badge>
          <StatusBadge tone={toneOf(TONE_PEGAWAI, r.status_aktif)}>{labelFrom(STATUS_PEGAWAI, r.status_aktif)}</StatusBadge>
        </>
      }
      meta={[meta('Kategori', r.kategori === 'tidak_tetap' ? 'Tidak tetap' : r.kategori === 'tetap' ? 'Tetap' : null), meta('Golongan', r.golongan)]}
    />
  ),
  columns: [
    {
      key: 'nama',
      header: 'Pegawai',
      mobile: 'title',
      value: (r) => r.nama_lengkap ?? r.nama,
      cell: (r) => (
        <CellPrimary
          media={<Avatar name={String(r.nama ?? '')} src={r.foto} size="sm" badge={r.serdos ? <BadgeCheck aria-label="Bersertifikat dosen" /> : undefined} />}
          title={r.nama_lengkap ?? r.nama}
          subtitle={
            r.nip ? (
              <>
                NIP <Mono>{r.nip}</Mono>
              </>
            ) : r.nidn ? (
              <>
                NIDN <Mono>{r.nidn}</Mono>
              </>
            ) : undefined
          }
        />
      ),
    },
    { key: 'jenis', header: 'Jenis', shrink: true, cell: (r) => <Badge variant={r.jenis === 'dosen' ? 'primary' : 'secondary'}>{r.jenis === 'dosen' ? 'Dosen' : 'Tendik'}</Badge> },
    { key: 'unit_nama', header: 'Unit kerja' },
    { key: 'kategori', header: 'Kategori', shrink: true, cell: (r) => (r.kategori === 'tidak_tetap' ? 'Tidak tetap' : r.kategori === 'tetap' ? 'Tetap' : '–') },
    { key: 'golongan', header: 'Gol.', shrink: true, defaultHidden: true },
    {
      key: 'status_aktif',
      header: 'Status',
      shrink: true,
      mobile: 'badge',
      cell: (r) => <StatusBadge tone={toneOf(TONE_PEGAWAI, r.status_aktif)}>{labelFrom(STATUS_PEGAWAI, r.status_aktif)}</StatusBadge>,
    },
  ],
});

// ================================================================ Mata kuliah
/** Tabel mata kuliah (mataKuliah.list) dengan saringan prodi, semester, tahun akademik. */
export const TabelMataKuliah = makeTabel<Row>({
  name: 'TabelMataKuliah',
  key: 'tabel-mk',
  preset: 'mata-kuliah',
  Filter: FilterMataKuliah,
  fetch: (s, q, signal) => s.mataKuliah.list(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.id ?? `${r.kode_prodi}-${r.kode_mk}`),
  csv: 'mata-kuliah',
  empty: { title: 'Belum ada mata kuliah', description: 'Tambahkan mata kuliah di kurikulum program studi.' },
  Detail: ({ row, onClose }) => <SheetDetailMataKuliah mk={row} onOpenChange={(o) => !o && onClose()} />,
  kartu: (r) => (
    <KartuData
      media={
        <span className="u-kartu-data-ikon" aria-hidden>
          <BookOpen />
        </span>
      }
      title={r.nama_mk}
      subtitle={<Mono>{r.kode_mk}</Mono>}
      badge={
        <>
          <Badge variant="outline">{r.sks_mk ?? '–'} SKS</Badge>
          {r.sifat === 'P' ? <Badge>Pilihan</Badge> : r.sifat === 'W' ? <Badge variant="primary">Wajib</Badge> : null}
        </>
      }
      prodi={r.kode_prodi ? <LabelProdi kode={r.kode_prodi} /> : undefined}
      meta={[meta('Semester', r.semester)]}
    />
  ),
  columns: [
    { key: 'kode_mk', header: 'Kode', shrink: true, mobile: 'subtitle', cell: (r) => <Mono>{r.kode_mk}</Mono> },
    { key: 'nama_mk', header: 'Mata kuliah', mobile: 'title', cell: (r) => <span style={{ fontWeight: 600 }}>{r.nama_mk}</span> },
    { key: 'sks_mk', header: 'SKS', align: 'end', shrink: true, mobile: 'badge', cell: (r) => <Badge variant="outline">{r.sks_mk ?? '–'} SKS</Badge> },
    { key: 'semester', header: 'Semester', align: 'end', shrink: true },
    { key: 'sifat', header: 'Sifat', shrink: true, cell: (r) => (r.sifat === 'P' ? <Badge>Pilihan</Badge> : r.sifat === 'W' ? <Badge variant="primary">Wajib</Badge> : '–') },
    { key: 'kode_prodi', header: 'Prodi', defaultHidden: true, cell: (r) => (r.kode_prodi ? <LabelProdi kode={r.kode_prodi} sub={false} /> : '–') },
  ],
});

// ================================================================ Surat masuk / keluar
const TONE_SURAT: Record<string, Tone> = {
  baru: 'primary',
  didisposisi: 'info',
  diproses: 'warning',
  selesai: 'success',
  diarsipkan: 'neutral',
  dibatalkan: 'danger',
  draf: 'neutral',
  review: 'warning',
  revisi: 'warning',
  disetujui: 'info',
  terkirim: 'success',
};
const TONE_SIFAT: Record<string, Tone> = { biasa: 'neutral', penting: 'info', segera: 'warning', sangat_segera: 'danger' };

function BatasWaktu({ v, selesai }: { v?: string | null; selesai?: boolean }) {
  if (!v) return <Muted>–</Muted>;
  const lewat = !selesai && new Date(v + 'T23:59:59') < new Date();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: lewat ? 'var(--u-danger)' : undefined, fontWeight: lewat ? 600 : undefined }}>
      {lewat && <Clock size={13} aria-hidden />}
      {tanggal(v)}
    </span>
  );
}
const lampiran = (n?: number) =>
  n ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--u-muted-foreground)' }} aria-label={`${n} lampiran`}>
      <Paperclip size={13} aria-hidden />
      {n}
    </span>
  ) : null;

/** Tabel surat masuk (arsip.getSuratMasuk): nomor agenda, perihal, pengirim, sifat, status, batas waktu. */
export const TabelSuratMasuk = makeTabel<Row>({
  name: 'TabelSuratMasuk',
  key: 'tabel-surat-masuk',
  preset: 'surat-masuk',
  Filter: FilterSuratMasuk,
  fetch: (s, q, signal) => s.arsip.getSuratMasuk(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.uuid ?? r.id),
  csv: 'surat-masuk',
  empty: { title: 'Kotak surat kosong', description: 'Surat masuk yang dicatat unit Anda akan tampil di sini.' },
  columns: [
    { key: 'nomor_agenda', header: 'Agenda', shrink: true, mobile: 'hidden', cell: (r) => <Mono>{r.nomor_agenda ?? '–'}</Mono> },
    {
      key: 'perihal',
      header: 'Perihal',
      mobile: 'title',
      cell: (r) => (
        <CellPrimary
          title={
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {r.perihal} {lampiran(r.jumlah_file)}
            </span>
          }
          subtitle={[r.pengirim_nama, r.pengirim_instansi].filter(Boolean).join(' · ') || r.nomor_surat}
        />
      ),
    },
    { key: 'nomor_surat', header: 'Nomor surat', defaultHidden: true, cell: (r) => <Mono>{r.nomor_surat ?? '–'}</Mono> },
    { key: 'tanggal_surat', header: 'Tanggal', shrink: true, value: (r) => r.tanggal_surat, cell: (r) => tanggal(r.tanggal_surat) },
    { key: 'sifat', header: 'Sifat', shrink: true, cell: (r) => <Badge variant={toneOf(TONE_SIFAT, r.sifat)}>{labelFrom(SIFAT_SURAT, r.sifat)}</Badge> },
    { key: 'batas_waktu', header: 'Batas', shrink: true, cell: (r) => <BatasWaktu v={r.batas_waktu} selesai={['selesai', 'diarsipkan', 'dibatalkan'].includes(r.status)} /> },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (r) => <StatusBadge tone={toneOf(TONE_SURAT, r.status)}>{labelFrom(STATUS_SURAT_MASUK, r.status)}</StatusBadge> },
  ],
});

/** Tabel surat keluar (arsip.getSuratKeluar): nomor, perihal, tujuan, sifat, status. */
export const TabelSuratKeluar = makeTabel<Row>({
  name: 'TabelSuratKeluar',
  key: 'tabel-surat-keluar',
  preset: 'surat-keluar',
  Filter: FilterSuratKeluar,
  fetch: (s, q, signal) => s.arsip.getSuratKeluar(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.uuid ?? r.id),
  csv: 'surat-keluar',
  empty: { title: 'Belum ada surat keluar', description: 'Buat draf surat, ajukan untuk ditinjau, lalu kirim.' },
  columns: [
    {
      key: 'perihal',
      header: 'Perihal',
      mobile: 'title',
      cell: (r) => (
        <CellPrimary
          title={
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {r.perihal} {lampiran(r.jumlah_file)}
            </span>
          }
          subtitle={r.tujuan_ringkas ? `Kepada: ${r.tujuan_ringkas}` : undefined}
        />
      ),
    },
    { key: 'nomor_surat', header: 'Nomor', cell: (r) => (r.nomor_surat ? <Mono>{r.nomor_surat}</Mono> : <Muted>Belum bernomor</Muted>) },
    { key: 'tanggal_surat', header: 'Tanggal', shrink: true, cell: (r) => tanggal(r.tanggal_surat ?? r.tanggal_kirim) },
    { key: 'sifat', header: 'Sifat', shrink: true, cell: (r) => <Badge variant={toneOf(TONE_SIFAT, r.sifat)}>{labelFrom(SIFAT_SURAT, r.sifat)}</Badge> },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', cell: (r) => <StatusBadge tone={toneOf(TONE_SURAT, r.status)}>{labelFrom(STATUS_SURAT_KELUAR, r.status)}</StatusBadge> },
  ],
});

// ================================================================ Dokumen & berkas arsip
const TONE_VERIF: Record<string, Tone> = { diajukan: 'warning', terverifikasi: 'success', ditolak: 'danger', tidak_perlu: 'neutral' };
const TONE_ARSIP: Record<string, Tone> = { aktif: 'success', inaktif: 'warning', permanen: 'info', dimusnahkan: 'danger', diserahkan: 'neutral' };

function Berlaku({ v }: { v?: string | null }) {
  if (!v) return <Muted>Selamanya</Muted>;
  const d = new Date(v + 'T23:59:59').getTime() - Date.now();
  const hari = Math.ceil(d / 86_400_000);
  if (hari < 0) return <Badge variant="danger">Habis {tanggal(v)}</Badge>;
  if (hari <= 90) return <Badge variant="warning">{hari} hari lagi</Badge>;
  return <span>{tanggal(v)}</span>;
}

/** Tabel dokumen arsip (arsip.getDokumen): ijazah, SK, sertifikat, kontrak, dengan status verifikasi dan masa berlaku. */
export const TabelDokumen = makeTabel<Row>({
  name: 'TabelDokumen',
  key: 'tabel-dokumen',
  preset: 'dokumen',
  Filter: FilterDokumen,
  fetch: (s, q, signal) => s.arsip.getDokumen(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.uuid ?? r.id),
  csv: 'dokumen',
  empty: { title: 'Belum ada dokumen', description: 'Unggah ijazah, SK, sertifikat, atau kontrak agar tersimpan rapi dan mudah dicari.' },
  columns: [
    { key: 'judul', header: 'Dokumen', mobile: 'title', cell: (r) => <CellPrimary title={r.judul} subtitle={[r.jenis_nama, r.nomor].filter(Boolean).join(' · ')} /> },
    { key: 'pemilik_nama', header: 'Pemilik', cell: (r) => r.pemilik_nama ?? r.unit_nama ?? '–' },
    { key: 'tanggal_dokumen', header: 'Tanggal', shrink: true, cell: (r) => tanggal(r.tanggal_dokumen) },
    { key: 'berlaku_sampai', header: 'Berlaku', shrink: true, cell: (r) => <Berlaku v={r.berlaku_sampai} /> },
    { key: 'akses', header: 'Akses', shrink: true, defaultHidden: true, cell: (r) => labelFrom(AKSES_ARSIP, r.akses) },
    {
      key: 'status_verifikasi',
      header: 'Verifikasi',
      shrink: true,
      mobile: 'badge',
      cell: (r) => <StatusBadge tone={toneOf(TONE_VERIF, r.status_verifikasi)}>{labelFrom(STATUS_VERIFIKASI, r.status_verifikasi)}</StatusBadge>,
    },
  ],
});

/** Tabel berkas arsip (arsip.getBerkas): map berisi surat dan dokumen, dengan status dan retensi. */
export const TabelBerkas = makeTabel<Row>({
  name: 'TabelBerkas',
  key: 'tabel-berkas',
  preset: 'berkas',
  Filter: FilterBerkas,
  fetch: (s, q, signal) => s.arsip.getBerkas(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.id),
  csv: 'berkas-arsip',
  empty: { icon: <Folder />, title: 'Belum ada berkas', description: 'Berkas mengelompokkan surat dan dokumen satu urusan dalam satu map.' },
  columns: [
    { key: 'nomor_berkas', header: 'Nomor', shrink: true, mobile: 'subtitle', cell: (r) => <Mono>{r.nomor_berkas}</Mono> },
    {
      key: 'judul',
      header: 'Berkas',
      mobile: 'title',
      cell: (r) => (
        <CellPrimary
          media={
            <span className="u-dt-file-icon">
              <Folder />
            </span>
          }
          title={r.judul}
          subtitle={r.uraian ?? undefined}
        />
      ),
    },
    {
      key: 'tahun',
      header: 'Tahun',
      shrink: true,
      value: (r) => r.tahun_awal,
      cell: (r) => (r.tahun_awal ? (r.tahun_akhir && r.tahun_akhir !== r.tahun_awal ? `${r.tahun_awal}–${r.tahun_akhir}` : r.tahun_awal) : '–'),
    },
    {
      key: 'isi',
      header: 'Isi',
      shrink: true,
      align: 'end',
      value: (r) => (r.surat?.length ?? 0) + (r.dokumen?.length ?? 0),
      cell: (r) => `${(r.surat?.length ?? r.jumlah_surat ?? 0) + (r.dokumen?.length ?? r.jumlah_dokumen ?? 0)} item`,
    },
    { key: 'status', header: 'Status', shrink: true, cell: (r) => <Badge variant={r.status === 'terbuka' ? 'primary' : 'neutral'}>{r.status === 'terbuka' ? 'Terbuka' : 'Ditutup'}</Badge> },
    {
      key: 'status_arsip',
      header: 'Arsip',
      shrink: true,
      mobile: 'badge',
      cell: (r) => <StatusBadge tone={toneOf(TONE_ARSIP, r.status_arsip)}>{labelFrom(STATUS_ARSIP, r.status_arsip)}</StatusBadge>,
    },
  ],
});
