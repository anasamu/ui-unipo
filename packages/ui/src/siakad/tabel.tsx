'use client';
import * as React from 'react';
import { BadgeCheck, Clock, Folder, Paperclip } from 'lucide-react';
import type { ApiResult, Siakad } from 'unipo-siakad-sdk';
import { Badge } from '../components/actions';
import { Avatar, CellPrimary } from '../components/display';
import { DataTable, type DataColumn, type DataTableProps } from '../components/data-table';
import { filterToQuery, useFilterParams, type FilterField, type FilterValues } from '../components/filter';
import type { MenuEntry } from '../components/overlays';
import { formatDate } from '../lib/format';
import { useSiakadQuery } from './provider';
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

// ================================================================ Props bersama tabel turunan
export interface TabelSiakadProps<T> extends Omit<Partial<DataTableProps<T>>, 'rows' | 'columns' | 'toolbar'> {
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
}

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
}) {
  function Tabel({ initialFilter, syncUrl, extraColumns = [], hideColumns = [], filterProps, noFilter, perPage, ...rest }: TabelSiakadProps<T>) {
    const fields = useFilterFields(cfg.preset);
    const t = useSiakadTable<T>({ key: cfg.key, fetch: cfg.fetch, initialFilter, fields, perPage, syncUrl });
    const columns = [...cfg.columns.filter((c) => !hideColumns.includes(c.key) && !extraColumns.some((e) => e.key === c.key)), ...extraColumns];
    return (
      <DataTable<T>
        columns={columns}
        rowKey={cfg.rowKey}
        toolbar={noFilter ? undefined : <cfg.Filter {...t.filterProps} {...filterProps} />}
        empty={cfg.empty}
        exportCsv={cfg.csv}
        storageKey={cfg.key}
        {...t.tableProps}
        {...rest}
      />
    );
  }
  Tabel.displayName = cfg.name;
  return Tabel;
}

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
  columns: [
    {
      key: 'nama',
      header: 'Mahasiswa',
      mobile: 'title',
      value: (r) => r.nama,
      cell: (r) => <CellPrimary media={<Avatar name={String(r.nama ?? r.nim)} src={r.foto} size="sm" />} title={r.nama} subtitle={<Mono>{r.nim}</Mono>} />,
    },
    { key: 'nim', header: 'NIM', defaultHidden: true, mobile: 'hidden' },
    { key: 'nama_prodi', header: 'Program studi', cell: (r) => `${r.kode_jenjang ? r.kode_jenjang + ' ' : ''}${r.nama_prodi ?? '–'}`, value: (r) => r.nama_prodi },
    { key: 'tahun_masuk', header: 'Angkatan', shrink: true },
    { key: 'kelas', header: 'Kelas', shrink: true, cell: (r) => KELAS[r.kelas] ?? r.kelas ?? '–' },
    { key: 'semester', header: 'Smt', align: 'end', shrink: true, defaultHidden: true },
    { key: 'ipk', header: 'IPK', align: 'end', shrink: true, cell: (r) => (r.ipk != null ? Number(r.ipk).toFixed(2) : '–') },
    { key: 'status_aktif', header: 'Status', shrink: true, mobile: 'badge', value: (r) => r.status_aktif_label ?? r.status_aktif, cell: (r) => <StatusBadge tone={toneOf(TONE_MHS, r.status_aktif)}>{r.status_aktif_label ?? r.status_aktif}</StatusBadge> },
  ],
});

// ================================================================ Dosen
/** Tabel dosen (dosen.list) dengan saringan prodi dan status. */
export const TabelDosen = makeTabel<Row>({
  name: 'TabelDosen',
  key: 'tabel-dosen',
  preset: 'dosen',
  Filter: FilterDosen,
  fetch: (s, q, signal) => s.dosen.list(q, { signal }) as Promise<ApiResult<Row[]>>,
  rowKey: (r) => String(r.nidn),
  csv: 'dosen',
  empty: { title: 'Belum ada dosen' },
  columns: [
    {
      key: 'nama',
      header: 'Dosen',
      mobile: 'title',
      value: (r) => r.nama_lengkap ?? r.nama,
      cell: (r) => <CellPrimary media={<Avatar name={String(r.nama ?? r.nidn)} src={r.foto} size="sm" />} title={r.nama_lengkap ?? r.nama} subtitle={<>NIDN <Mono>{r.nidn}</Mono></>} />,
    },
    { key: 'nama_prodi', header: 'Homebase' },
    { key: 'jabatan_akademik', header: 'Jabatan akademik', cell: (r) => r.jabatan_akademik ?? <Muted>Belum ada</Muted> },
    { key: 'pendidikan', header: 'Pendidikan', shrink: true, defaultHidden: true },
    { key: 'status', header: 'Status', shrink: true, mobile: 'badge', value: (r) => r.status_aktif ?? r.status, cell: (r) => { const v = r.status_aktif ?? r.status; return <StatusBadge tone={v === 'A' || v === 'aktif' ? 'success' : v === 'T' ? 'info' : 'neutral'}>{({ A: 'Aktif', T: 'Tugas belajar', C: 'Cuti', K: 'Keluar' } as Record<string, string>)[v] ?? v}</StatusBadge>; } },
  ],
});

// ================================================================ Pegawai / tendik
const TONE_PEGAWAI: Record<string, Tone> = { aktif: 'success', cuti: 'warning', tugas_belajar: 'info', izin_belajar: 'info', diperbantukan: 'info', nonaktif: 'neutral', pensiun: 'neutral', keluar: 'danger' };

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
          subtitle={r.nip ? <>NIP <Mono>{r.nip}</Mono></> : r.nidn ? <>NIDN <Mono>{r.nidn}</Mono></> : undefined}
        />
      ),
    },
    { key: 'jenis', header: 'Jenis', shrink: true, cell: (r) => <Badge variant={r.jenis === 'dosen' ? 'primary' : 'secondary'}>{r.jenis === 'dosen' ? 'Dosen' : 'Tendik'}</Badge> },
    { key: 'unit_nama', header: 'Unit kerja' },
    { key: 'kategori', header: 'Kategori', shrink: true, cell: (r) => (r.kategori === 'tidak_tetap' ? 'Tidak tetap' : r.kategori === 'tetap' ? 'Tetap' : '–') },
    { key: 'golongan', header: 'Gol.', shrink: true, defaultHidden: true },
    { key: 'status_aktif', header: 'Status', shrink: true, mobile: 'badge', cell: (r) => <StatusBadge tone={toneOf(TONE_PEGAWAI, r.status_aktif)}>{labelFrom(STATUS_PEGAWAI, r.status_aktif)}</StatusBadge> },
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
  columns: [
    { key: 'kode_mk', header: 'Kode', shrink: true, mobile: 'subtitle', cell: (r) => <Mono>{r.kode_mk}</Mono> },
    { key: 'nama_mk', header: 'Mata kuliah', mobile: 'title', cell: (r) => <span style={{ fontWeight: 600 }}>{r.nama_mk}</span> },
    { key: 'sks_mk', header: 'SKS', align: 'end', shrink: true, mobile: 'badge', cell: (r) => <Badge variant="outline">{r.sks_mk ?? '–'} SKS</Badge> },
    { key: 'semester', header: 'Semester', align: 'end', shrink: true },
    { key: 'sifat', header: 'Sifat', shrink: true, cell: (r) => (r.sifat === 'P' ? <Badge>Pilihan</Badge> : r.sifat === 'W' ? <Badge variant="primary">Wajib</Badge> : '–') },
    { key: 'kode_prodi', header: 'Prodi', shrink: true, defaultHidden: true },
  ],
});

// ================================================================ Surat masuk / keluar
const TONE_SURAT: Record<string, Tone> = { baru: 'primary', didisposisi: 'info', diproses: 'warning', selesai: 'success', diarsipkan: 'neutral', dibatalkan: 'danger', draf: 'neutral', review: 'warning', revisi: 'warning', disetujui: 'info', terkirim: 'success' };
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
    { key: 'status_verifikasi', header: 'Verifikasi', shrink: true, mobile: 'badge', cell: (r) => <StatusBadge tone={toneOf(TONE_VERIF, r.status_verifikasi)}>{labelFrom(STATUS_VERIFIKASI, r.status_verifikasi)}</StatusBadge> },
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
      cell: (r) => <CellPrimary media={<span className="u-dt-file-icon"><Folder /></span>} title={r.judul} subtitle={r.uraian ?? undefined} />,
    },
    { key: 'tahun', header: 'Tahun', shrink: true, value: (r) => r.tahun_awal, cell: (r) => (r.tahun_awal ? (r.tahun_akhir && r.tahun_akhir !== r.tahun_awal ? `${r.tahun_awal}–${r.tahun_akhir}` : r.tahun_awal) : '–') },
    { key: 'isi', header: 'Isi', shrink: true, align: 'end', value: (r) => (r.surat?.length ?? 0) + (r.dokumen?.length ?? 0), cell: (r) => `${(r.surat?.length ?? r.jumlah_surat ?? 0) + (r.dokumen?.length ?? r.jumlah_dokumen ?? 0)} item` },
    { key: 'status', header: 'Status', shrink: true, cell: (r) => <Badge variant={r.status === 'terbuka' ? 'primary' : 'neutral'}>{r.status === 'terbuka' ? 'Terbuka' : 'Ditutup'}</Badge> },
    { key: 'status_arsip', header: 'Arsip', shrink: true, mobile: 'badge', cell: (r) => <StatusBadge tone={toneOf(TONE_ARSIP, r.status_arsip)}>{labelFrom(STATUS_ARSIP, r.status_arsip)}</StatusBadge> },
  ],
});
