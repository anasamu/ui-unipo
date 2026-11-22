'use client';
import * as React from 'react';
import { AlertTriangle, Columns3, Download, MoreHorizontal, Rows3, SearchX, X } from 'lucide-react';
import { KodeLaporan } from './galat';
import { cn, dataFlag } from '../lib/cn';
import {
  BATAS_EKSPOR,
  labelStatus,
  namaBerkasCsv,
  nilaiCsv,
  opsiPerHalaman,
  rataFormat,
  susunCsv,
  teksFormat,
  type FormatKolom,
  type HasilAmbilSemua,
  type PetaStatus,
} from '../lib/tabel';
import { Badge, Button, Skeleton, Spinner } from './actions';
import { Checkbox } from './forms';
import { Select } from './select';
import { ConfirmDialog, Menu, Popover, Tooltip, type MenuEntry } from './overlays';
import { Empty, Pagination, SortButton } from './display';
import { SelPohon, TombolPohon, susunPohon, usePohon, type NodePohon } from './pohon';

// ================================================================ Tipe
export interface DataColumn<T> {
  /** Kunci unik; juga nama field bila `cell`/`value` tidak diisi, dan nilai `sort` yang dikirim ke server. */
  key: string;
  header: React.ReactNode;
  /** Isi sel. Bawaan: nilai field `key`. */
  cell?: (row: T, index: number) => React.ReactNode;
  /** Nilai mentah untuk urut lokal dan ekspor CSV. */
  value?: (row: T) => string | number | null | undefined;
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  width?: number | string;
  /** Lebar seperlunya (kolom aksi, status). */
  shrink?: boolean;
  /** Bisa disembunyikan lewat menu Kolom (bawaan true). */
  hideable?: boolean;
  defaultHidden?: boolean;
  /**
   * Tampilan kartu di layar sempit: `title` (judul kartu), `subtitle`, `meta` (baris label: nilai), `badge` (pojok kanan),
   * `hidden`. Bawaan: kolom pertama `title`, sisanya `meta`.
   */
  mobile?: 'title' | 'subtitle' | 'meta' | 'badge' | 'hidden';
  /** Teks header untuk kartu ponsel dan ekspor bila `header` bukan string. */
  label?: string;
  /**
   * Format bawaan isi sel bila `cell` tidak diisi: `angka`, `rupiah`, `persen` (rata kanan otomatis), `tanggal`,
   * `tanggal-waktu`, atau `status` (lencana dari peta `status`). Ekspor CSV memakai nilai mentah (angka tanpa "Rp").
   */
  format?: FormatKolom;
  /** Peta nilai → label (+ nada lencana) untuk `format: 'status'`, mis. { lunas: { label: 'Lunas', tone: 'success' } }. */
  status?: PetaStatus;
}

/** Ambil semua baris sesuai saringan aktif dari server untuk ekspor (lihat `ambilSemuaHalaman`). */
export type AmbilSemuaBaris<T> = (opsi: { signal: AbortSignal; batas: number; onProgress: (terambil: number, total: number | null) => void }) => Promise<HasilAmbilSemua<T>>;

export type SortState = { key: string; dir: 'asc' | 'desc' } | null;

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  /** Memuat: kerangka saat belum ada data, garis progres saat memuat ulang. */
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** Urutan. Tanpa `onSortChange` diurutkan di browser; dengan `onSortChange` diserahkan ke server. */
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Halaman. Tanpa `onPageChange` dipotong di browser. */
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  /** `false`: tampilkan semua baris tanpa kaki halaman (tabel kecil, mis. 3–15 baris di panel). Bawaan `true`. */
  pagination?: boolean;
  /** Pilih baris (kotak centang). */
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (keys: string[]) => void;
  /** Aksi untuk baris terpilih, tampil di bilah atas tabel. */
  bulkActions?: (keys: string[], clear: () => void) => React.ReactNode;
  /** Menu ⋯ di ujung baris. */
  rowActions?: (row: T) => MenuEntry[];
  onRowClick?: (row: T) => void;
  /** Isi kiri bilah alat, biasanya <FilterBar /> atau judul. */
  toolbar?: React.ReactNode;
  /** Tombol tambahan di kanan bilah alat. */
  actions?: React.ReactNode;
  /** Menu pilih kolom (bawaan true). */
  columnToggle?: boolean;
  /** Tombol ubah kerapatan (bawaan true). */
  densityToggle?: boolean;
  defaultDensity?: 'comfortable' | 'compact';
  /**
   * Tombol unduh CSV; isi string untuk nama berkas. Data lokal: semua baris (sesuai urutan). Data ber-paging server:
   * isi juga `exportAll` agar SEMUA baris sesuai saringan diambil dari server (useSiakadTable/TabelSumber sudah
   * mengisinya). Tanpa `exportAll` tombol jelas bertuliskan "halaman ini saja".
   */
  exportCsv?: boolean | string;
  /** Ambil semua baris sesuai saringan dari server untuk ekspor (paging berulang ber-batas). */
  exportAll?: AmbilSemuaBaris<T>;
  /** Batas baris ekspor (bawaan 10.000). Di atas batas, pengguna diperingatkan dan berkas ditandai "sebagian". */
  exportLimit?: number;
  /**
   * Header menempel saat isi tabel digulir (bawaan true): tabel diberi tinggi maksimum setinggi layar (dikurangi
   * `--u-dt-sticky-offset`, bawaan 10rem) sehingga baris digulir di dalam tabel dan gulir horizontal tetap jalan.
   * `false` = tinggi bebas (tabel kecil di panel/cetak).
   */
  stickyHeader?: boolean;
  /** Tampilan saat tidak ada data sama sekali. */
  empty?: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  /** Tampilan saat saringan/pencarian tidak menemukan apa pun. Isi `filtered` agar dipakai. */
  emptyFiltered?: { title?: React.ReactNode; description?: React.ReactNode; onReset?: () => void };
  filtered?: boolean;
  /** Tampilan di bawah 640 px: kartu bertumpuk (bawaan) atau tabel geser. */
  mobile?: 'cards' | 'scroll';
  /** Tinggi maksimum isi tabel (mengganti tinggi bawaan `stickyHeader`); header tetap menempel saat digulir. */
  maxHeight?: number | string;
  striped?: boolean;
  /**
   * Baris ringkasan (mis. total) di kaki tabel: kunci = `key` kolom, isi = sel yang ditampilkan. Kolom tanpa kunci
   * dibiarkan kosong; kunci `_label` mengisi kolom pertama yang kosong (bawaan "Total"). Di tampilan kartu menjadi
   * kartu ringkasan di bawah daftar.
   */
  ringkasan?: Partial<Record<string, React.ReactNode>>;
  caption?: string;
  className?: string;
  /** Simpan pilihan kolom dan kerapatan di localStorage dengan kunci ini. */
  storageKey?: string;
  /** Ganti tabel dengan kisi kartu: fungsi penggambar satu kartu per baris. Halaman, saringan, dan keadaan kosong tetap sama. */
  grid?: (row: T, index: number) => React.ReactNode;
  /** Lebar minimum kartu di kisi (bawaan 15rem). */
  gridMin?: string;
  /**
   * Data bertingkat (induk-anak). Baris disusun sebagai pohon: anak menjorok di bawah induknya dan cabang bisa
   * dibuka/tutup lewat kolom pertama. Bawaan hanya induk teratas yang tampil; saat `filtered` semua cabang dibuka
   * supaya hasil pencarian tidak tersembunyi. Urutan berlaku antar-saudara, halaman dihitung dari baris yang tampil.
   */
  tree?: {
    /** Kunci induk baris (cocok dengan `rowKey` induknya); kosong/0 = akar. */
    parentKey: (row: T) => string | number | null | undefined;
    /** true = semua terbuka, false = hanya induk teratas (bawaan), angka = buka sampai tingkat itu. */
    defaultExpanded?: boolean | number;
    /** Tombol "Buka semua/Tutup semua" di bilah alat (bawaan true). */
    expandAllToggle?: boolean;
  };
}

// ================================================================ Utilitas
const raw = <T,>(c: DataColumn<T>, row: T): unknown => (c.value ? c.value(row) : (row as Record<string, unknown>)[c.key]);
const labelOf = <T,>(c: DataColumn<T>) => c.label ?? (typeof c.header === 'string' ? c.header : c.key);

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
}

/** Isi CSV: angka/uang tetap angka mentah, status berlabel awam, sel dinetralkan dari injeksi rumus. */
export function toCsv<T>(cols: DataColumn<T>[], rows: T[]): string {
  return susunCsv(
    cols.map((c) => labelOf(c)),
    rows.map((r) => cols.map((c) => nilaiCsv(raw(c, r), c.format, c.status))),
  );
}

function unduhCsv(nama: string, isi: string) {
  const blob = new Blob(['\ufeff' + isi], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

/** Isi sel bawaan: `cell`, atau nilai berformat (`format`), atau teks mentah. */
function isiSel<T>(c: DataColumn<T>, row: T, i: number, kosong = ''): React.ReactNode {
  if (c.cell) return c.cell(row, i);
  const v = raw(c, row);
  if (c.format === 'status') {
    if (v == null || v === '') return '–';
    const st = labelStatus(v, c.status);
    return (
      <Badge variant={st.tone} dot>
        {st.label}
      </Badge>
    );
  }
  if (c.format && c.format !== 'teks') return teksFormat(v, c.format, c.status);
  return String(v ?? kosong);
}
const alignOf = <T,>(c: DataColumn<T>) => c.align ?? rataFormat(c.format);

function useStored<V>(key: string | undefined, init: V): [V, (v: V) => void] {
  const [v, setV] = React.useState<V>(() => {
    if (!key || typeof window === 'undefined') return init;
    try {
      const s = window.localStorage.getItem(`unipo-table:${key}`);
      return s ? (JSON.parse(s) as V) : init;
    } catch {
      return init;
    }
  });
  const set = (n: V) => {
    setV(n);
    if (key)
      try {
        window.localStorage.setItem(`unipo-table:${key}`, JSON.stringify(n));
      } catch {
        /* penyimpanan diblokir */
      }
  };
  return [v, set];
}

function useMedia(q: string) {
  const [m, setM] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}

// ================================================================ DataTable
/**
 * Tabel data lengkap: urut, halaman, pilih baris + aksi massal, menu aksi per baris, pilih kolom, kerapatan,
 * ekspor CSV, kerangka memuat, keadaan kosong/galat, dan kartu bertumpuk di ponsel.
 * Bekerja di browser (data lokal) maupun server (isi onSortChange/onPageChange).
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const {
    columns,
    rows,
    rowKey,
    loading,
    error,
    onRetry,
    sort: sortProp,
    defaultSort = null,
    onSortChange,
    page: pageProp,
    perPage: perPageProp,
    total: totalProp,
    onPageChange,
    onPerPageChange,
    perPageOptions = [10, 20, 50, 100],
    pagination = true,
    selectable,
    selected: selectedProp,
    onSelectedChange,
    bulkActions,
    rowActions,
    onRowClick,
    toolbar,
    actions,
    columnToggle = true,
    densityToggle = true,
    defaultDensity = 'comfortable',
    exportCsv,
    exportAll,
    exportLimit = BATAS_EKSPOR,
    stickyHeader = true,
    empty,
    emptyFiltered,
    filtered,
    mobile = 'cards',
    maxHeight,
    striped,
    ringkasan,
    caption,
    className,
    storageKey,
    grid,
    gridMin,
    tree,
  } = props;

  // ---- urutan
  const [innerSort, setInnerSort] = React.useState<SortState>(defaultSort);
  const sort = sortProp !== undefined ? sortProp : innerSort;
  const serverSort = Boolean(onSortChange);
  const toggleSort = (key: string) => {
    const next: SortState = sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null;
    setInnerSort(next);
    onSortChange?.(next);
  };

  // ---- halaman
  const serverPage = Boolean(onPageChange);
  const [innerPage, setInnerPage] = React.useState(1);
  const [innerPer, setInnerPer] = React.useState(perPageProp ?? 10);
  const page = pageProp ?? innerPage;
  const perPage = perPageProp ?? innerPer;

  // ---- kolom & kerapatan
  const [hidden, setHidden] = useStored<string[]>(
    storageKey && `${storageKey}:kolom`,
    columns.filter((c) => c.defaultHidden).map((c) => c.key),
  );
  const [density, setDensity] = useStored<'comfortable' | 'compact'>(storageKey && `${storageKey}:rapat`, defaultDensity);
  const visible = columns.filter((c) => !hidden.includes(c.key));

  // ---- data tampil
  const all = rows ?? [];
  const sorted = React.useMemo(() => {
    if (serverSort || !sort) return all;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return all;
    const out = [...all].sort((a, b) => compare(raw(col, a), raw(col, b)));
    return sort.dir === 'desc' ? out.reverse() : out;
  }, [all, sort, serverSort, columns]);
  // ---- pohon (data bertingkat)
  const nodes = React.useMemo<NodePohon<T>[]>(() => (tree ? susunPohon(sorted, { getKey: rowKey, getParent: tree.parentKey }) : []), [sorted, tree?.parentKey, rowKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const pohon = usePohon(nodes, { defaultExpanded: tree?.defaultExpanded ?? false, storageKey: storageKey && `${storageKey}:pohon`, showAll: Boolean(filtered) });
  const nodeOf = React.useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);
  const ordered = tree ? pohon.visible.map((n) => n.row) : sorted;
  const total = tree && !serverPage ? ordered.length : (totalProp ?? sorted.length);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const shown = serverPage || !pagination ? ordered : ordered.slice((page - 1) * perPage, page * perPage);
  /** Isi sel kolom pertama, dibungkus SelPohon bila tabel bertingkat. */
  const treeCell = (row: T, content: React.ReactNode) => {
    const n = tree ? nodeOf.get(rowKey(row)) : undefined;
    if (!n) return content;
    const open = pohon.isExpanded(n.key);
    return (
      <SelPohon depth={n.depth} hasChildren={n.childCount > 0} expanded={open} onToggle={() => pohon.toggle(n.key)} count={n.descendantCount}>
        {content}
      </SelPohon>
    );
  };
  React.useEffect(() => {
    if (!serverPage && page > totalPages) setInnerPage(totalPages);
  }, [serverPage, page, totalPages]);

  // ---- pilihan
  const [innerSel, setInnerSel] = React.useState<string[]>([]);
  const selected = selectedProp ?? innerSel;
  const setSelected = (k: string[]) => {
    setInnerSel(k);
    onSelectedChange?.(k);
  };
  const shownKeys = shown.map(rowKey);
  const allOnPage = shownKeys.length > 0 && shownKeys.every((k) => selected.includes(k));
  const someOnPage = shownKeys.some((k) => selected.includes(k));
  const toggleAll = () => setSelected(allOnPage ? selected.filter((k) => !shownKeys.includes(k)) : [...new Set([...selected, ...shownKeys])]);
  const toggleRow = (k: string) => setSelected(selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]);

  const isMobile = useMedia('(max-width: 639px)');
  const cards = Boolean(grid) || (mobile === 'cards' && isMobile);
  const firstLoad = loading && !rows;
  const hasError = Boolean(error) && !loading;
  const isEmpty = !firstLoad && !hasError && shown.length === 0;
  const colSpan = visible.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  // ---- ekspor CSV
  const namaCsv = (typeof exportCsv === 'string' ? exportCsv : 'data').replace(/\.csv$/i, '');
  /** Hanya halaman aktif yang bisa diekspor: paging server tanpa `exportAll`. */
  const eksporHalamanSaja = serverPage && pagination && !exportAll;
  const [ekspor, setEkspor] = React.useState<{ terambil: number; total: number | null } | null>(null);
  const [galatEkspor, setGalatEkspor] = React.useState<string | null>(null);
  const [konfirmasiEkspor, setKonfirmasiEkspor] = React.useState(false);
  const batalEkspor = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => batalEkspor.current?.abort(), []);

  const eksporServer = async () => {
    if (!exportAll) return;
    const ac = new AbortController();
    batalEkspor.current = ac;
    setGalatEkspor(null);
    setEkspor({ terambil: 0, total: totalProp ?? null });
    try {
      const hasil = await exportAll({ signal: ac.signal, batas: exportLimit, onProgress: (terambil, t) => setEkspor({ terambil, total: t ?? totalProp ?? null }) });
      if (ac.signal.aborted) return;
      const nama = namaBerkasCsv(namaCsv, hasil.terpotong ? { diambil: hasil.rows.length, total: hasil.total } : undefined);
      unduhCsv(nama, toCsv(visible, hasil.rows));
    } catch (e) {
      if (!ac.signal.aborted) setGalatEkspor(e instanceof Error && e.message ? e.message : 'Data tidak bisa diambil dari server.');
    } finally {
      if (batalEkspor.current === ac) batalEkspor.current = null;
      setEkspor(null);
    }
  };

  const downloadCsv = () => {
    if (serverPage && exportAll) {
      if (totalProp != null && totalProp > exportLimit) setKonfirmasiEkspor(true);
      else void eksporServer();
      return;
    }
    if (eksporHalamanSaja) {
      unduhCsv(namaBerkasCsv(`${namaCsv}-halaman-${page}`), toCsv(visible, shown));
      return;
    }
    unduhCsv(namaBerkasCsv(namaCsv), toCsv(visible, tree ? nodes.map((n) => n.row) : sorted));
  };
  const labelUnduh = eksporHalamanSaja ? 'Unduh CSV halaman ini saja' : serverPage ? 'Unduh CSV semua data sesuai saringan' : 'Unduh CSV';

  // ---- bilah alat
  const tools = (
    <>
      {actions}
      {tree && tree.expandAllToggle !== false && pohon.punyaCabang && !filtered && (
        <TombolPohon semuaTerbuka={pohon.semuaTerbuka} onExpandAll={pohon.expandAll} onCollapseAll={pohon.collapseAll} />
      )}
      {densityToggle && !cards && (
        <Tooltip content={density === 'compact' ? 'Baris lega' : 'Baris rapat'}>
          <Button
            variant="outline"
            size="sm"
            iconOnly
            aria-label="Ubah kerapatan baris"
            aria-pressed={density === 'compact'}
            onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
          >
            <Rows3 />
          </Button>
        </Tooltip>
      )}
      {columnToggle && (
        <Popover
          align="end"
          width={220}
          trigger={
            <Button variant="outline" size="sm" aria-label="Pilih kolom">
              <Columns3 /> <span className="u-dt-hide-sm">Kolom</span>
            </Button>
          }
        >
          <div className="u-dt-columns" role="group" aria-label="Kolom yang tampil">
            {columns
              .filter((c) => c.hideable !== false)
              .map((c) => (
                <label key={c.key} className="u-dt-column-option">
                  <Checkbox
                    checked={!hidden.includes(c.key)}
                    onCheckedChange={(on) => setHidden(on ? hidden.filter((k) => k !== c.key) : [...hidden, c.key])}
                    disabled={!hidden.includes(c.key) && visible.length === 1}
                  />
                  {labelOf(c)}
                </label>
              ))}
          </div>
        </Popover>
      )}
      {exportCsv && (
        <Tooltip content={labelUnduh}>
          <Button variant="outline" size="sm" iconOnly aria-label={labelUnduh} onClick={downloadCsv} disabled={!sorted.length || Boolean(ekspor)} loading={Boolean(ekspor)}>
            {!ekspor && <Download />}
          </Button>
        </Tooltip>
      )}
    </>
  );

  const nf = (n: number) => n.toLocaleString('id-ID');
  const statusEkspor = (ekspor || galatEkspor) && (
    <div className="u-dt-export" role="status" aria-live="polite" data-tone={galatEkspor ? 'danger' : undefined}>
      {ekspor ? (
        <>
          <Spinner size="sm" label="Menyiapkan CSV" />
          <span>
            Menyiapkan CSV: <strong>{nf(ekspor.terambil)}</strong>
            {ekspor.total != null && (
              <>
                {' '}
                dari <strong>{nf(Math.min(ekspor.total, exportLimit))}</strong>
              </>
            )}{' '}
            baris
          </span>
          {ekspor.total != null && ekspor.total > 0 && (
            <progress className="u-dt-export-bar" value={ekspor.terambil} max={Math.min(ekspor.total, exportLimit)} aria-hidden />
          )}
          <Button variant="ghost" size="xs" onClick={() => batalEkspor.current?.abort()}>
            Batalkan
          </Button>
        </>
      ) : (
        <>
          <AlertTriangle aria-hidden />
          <span>Unduh CSV gagal: {galatEkspor}</span>
          <Button variant="ghost" size="xs" iconOnly aria-label="Tutup pesan" onClick={() => setGalatEkspor(null)}>
            <X />
          </Button>
        </>
      )}
    </div>
  );
  const dialogEkspor = exportAll && (
    <ConfirmDialog
      open={konfirmasiEkspor}
      onOpenChange={setKonfirmasiEkspor}
      tone="warning"
      title="Data terlalu besar untuk diunduh lengkap"
      description={
        <>
          Saringan ini berisi {nf(totalProp ?? 0)} baris, melebihi batas unduh {nf(exportLimit)} baris. Persempit saringan (mis. per periode atau per unit) agar
          berkasnya lengkap. Bila tetap diunduh, berkas hanya berisi {nf(exportLimit)} baris pertama dan namanya ditandai &ldquo;sebagian&rdquo;.
        </>
      }
      confirmLabel={`Unduh ${nf(exportLimit)} baris pertama`}
      cancelLabel="Persempit saringan"
      onConfirm={() => {
        setKonfirmasiEkspor(false);
        void eksporServer();
      }}
    />
  );

  const bulk = selectable && selected.length > 0 && (
    <div className="u-dt-bulk" role="region" aria-label="Aksi untuk baris terpilih">
      <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onCheckedChange={toggleAll} aria-label="Pilih semua di halaman ini" />
      <span className="u-dt-bulk-count">
        <strong>{selected.length.toLocaleString('id-ID')}</strong> dipilih
      </span>
      <Button variant="ghost" size="xs" onClick={() => setSelected([])}>
        Batalkan
      </Button>
      <div className="u-dt-bulk-actions">{bulkActions?.(selected, () => setSelected([]))}</div>
    </div>
  );

  // ---- isi
  const stateRow = (content: React.ReactNode) =>
    cards ? (
      <div className="u-dt-state">{content}</div>
    ) : (
      <tr className="u-dt-state-row">
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );

  let state: React.ReactNode = null;
  if (hasError)
    state = stateRow(
      <Empty
        icon={<AlertTriangle />}
        title="Data tidak bisa dimuat"
        description={
          <>
            {error instanceof Error ? error.message : typeof error === 'string' ? error : 'Periksa koneksi, lalu coba lagi.'}
            <KodeLaporan error={error} />
          </>
        }
        actions={
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Coba lagi
            </Button>
          )
        }
      />,
    );
  else if (isEmpty && filtered)
    state = stateRow(
      <Empty
        icon={<SearchX />}
        title={emptyFiltered?.title ?? 'Tidak ada yang cocok'}
        description={emptyFiltered?.description ?? 'Ubah kata kunci atau saringan untuk melihat data lain.'}
        actions={
          emptyFiltered?.onReset && (
            <Button variant="outline" size="sm" onClick={emptyFiltered.onReset}>
              Atur ulang saringan
            </Button>
          )
        }
      />,
    );
  else if (isEmpty) state = stateRow(<Empty icon={empty?.icon} title={empty?.title ?? 'Belum ada data'} description={empty?.description} actions={empty?.action} />);

  const skeletonCount = Math.min(perPage, 6);
  const menuCell = (row: T) =>
    rowActions && (
      <Menu
        items={rowActions(row)}
        trigger={
          <Button variant="ghost" size="sm" iconOnly aria-label="Aksi baris" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <MoreHorizontal />
          </Button>
        }
      />
    );

  const gridBody = grid && (
    <div className="u-dt-grid" role="list" aria-busy={loading || undefined} style={gridMin ? ({ '--u-dt-grid-min': gridMin } as React.CSSProperties) : undefined}>
      {firstLoad
        ? Array.from({ length: skeletonCount }, (_, i) => <Skeleton key={i} className="u-dt-grid-skeleton" />)
        : (state ??
          shown.map((row, i) => {
            const k = rowKey(row);
            return (
              <div
                key={k}
                role="listitem"
                className="u-dt-grid-item"
                data-selected={dataFlag(selected.includes(k))}
                data-clickable={dataFlag(Boolean(onRowClick))}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {grid(row, i)}
                {(selectable || rowActions) && (
                  <span className="u-dt-grid-tools" onClick={(e) => e.stopPropagation()}>
                    {selectable && <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggleRow(k)} aria-label="Pilih baris" />}
                    {menuCell(row)}
                  </span>
                )}
              </div>
            );
          }))}
    </div>
  );

  const barisRingkasan = Boolean(ringkasan) && !firstLoad && !hasError && shown.length > 0;
  const labelKe = ringkasan ? visible.findIndex((c) => ringkasan[c.key] == null) : -1;
  const kartuRingkasan = barisRingkasan && cards && (
    <div className="u-dt-card u-dt-ringkasan-kartu">
      <strong className="u-dt-ringkasan-judul">{ringkasan!._label ?? 'Total'}</strong>
      <dl>
        {visible
          .filter((c) => ringkasan![c.key] != null)
          .map((c) => (
            <div key={c.key} className="u-dt-ringkasan-baris">
              <dt>{labelOf(c)}</dt>
              <dd>{ringkasan![c.key]}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
  const body = gridBody ? (
    gridBody
  ) : cards ? (
    <div className="u-dt-cards" role="list" aria-busy={loading || undefined}>
      {firstLoad
        ? Array.from({ length: skeletonCount }, (_, i) => (
            <div key={i} className="u-dt-card">
              <Skeleton style={{ height: 14, width: '60%' }} />
              <Skeleton style={{ height: 12, width: '40%', marginTop: 8 }} />
            </div>
          ))
        : (state ??
          shown.map((row, i) => {
            const k = rowKey(row);
            const role = (c: DataColumn<T>, idx: number) => c.mobile ?? (idx === 0 ? 'title' : 'meta');
            const by = (r: string) => visible.filter((c, idx) => role(c, idx) === r);
            return (
              <div
                key={k}
                role="listitem"
                className="u-dt-card"
                data-selected={dataFlag(selected.includes(k))}
                data-clickable={dataFlag(Boolean(onRowClick))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="u-dt-card-head">
                  {selectable && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggleRow(k)} aria-label="Pilih baris" />
                    </span>
                  )}
                  <div className="u-dt-card-title">
                    {by('title').map((c, ti) => (
                      <div key={c.key}>{ti === 0 ? treeCell(row, isiSel(c, row, i)) : isiSel(c, row, i)}</div>
                    ))}
                    {by('subtitle').map((c) => (
                      <div key={c.key} className="u-dt-card-subtitle">
                        {isiSel(c, row, i)}
                      </div>
                    ))}
                  </div>
                  {by('badge').map((c) => (
                    <div key={c.key}>{isiSel(c, row, i)}</div>
                  ))}
                  <span onClick={(e) => e.stopPropagation()}>{menuCell(row)}</span>
                </div>
                {by('meta').length > 0 && (
                  <dl className="u-dt-card-meta">
                    {by('meta').map((c) => (
                      <div key={c.key}>
                        <dt>{labelOf(c)}</dt>
                        <dd>{isiSel(c, row, i, '–')}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          }))}
    </div>
  ) : (
    <div className="u-table-wrap u-dt-scroll" data-sticky={dataFlag(stickyHeader && !maxHeight)} style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="u-table" role={tree ? 'treegrid' : undefined} data-tree={dataFlag(Boolean(tree))} data-density={density} data-striped={dataFlag(striped)} aria-busy={loading || undefined}>
        {caption && <caption className="u-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th data-shrink="" className="u-dt-check">
                <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onCheckedChange={toggleAll} aria-label="Pilih semua di halaman ini" disabled={!shown.length} />
              </th>
            )}
            {visible.map((c) => (
              <th
                key={c.key}
                data-align={alignOf(c)}
                data-shrink={c.shrink ? '' : undefined}
                style={c.width ? { width: c.width } : undefined}
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.sortable ? (
                  <SortButton direction={sort?.key === c.key ? sort.dir : null} onClick={() => toggleSort(c.key)}>
                    {c.header}
                  </SortButton>
                ) : (
                  c.header
                )}
              </th>
            ))}
            {rowActions && (
              <th data-shrink="">
                <span className="u-sr-only">Aksi</span>
              </th>
            )}
          </tr>
          {loading && rows && (
            <tr className="u-dt-progress" aria-hidden>
              <th colSpan={colSpan} />
            </tr>
          )}
        </thead>
        <tbody>
          {firstLoad
            ? Array.from({ length: skeletonCount }, (_, i) => (
                <tr key={i}>
                  {selectable && <td />}
                  {visible.map((c, j) => (
                    <td key={c.key} data-align={alignOf(c)}>
                      <Skeleton style={{ height: 12, width: j === 0 ? '70%' : `${40 + ((i * 17 + j * 11) % 40)}%`, display: 'inline-block' }} />
                    </td>
                  ))}
                  {rowActions && <td />}
                </tr>
              ))
            : (state ??
              shown.map((row, i) => {
                const k = rowKey(row);
                const sel = selected.includes(k);
                return (
                  <tr
                    key={k}
                    data-selected={dataFlag(sel)}
                    data-clickable={dataFlag(Boolean(onRowClick))}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    aria-level={tree ? (nodeOf.get(k)?.depth ?? 0) + 1 : undefined}
                    data-tree-depth={tree ? (nodeOf.get(k)?.depth ?? 0) : undefined}
                  >
                    {selectable && (
                      <td className="u-dt-check" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel} onCheckedChange={() => toggleRow(k)} aria-label="Pilih baris" />
                      </td>
                    )}
                    {visible.map((c, ci) => (
                      <td key={c.key} data-align={alignOf(c)} data-shrink={c.shrink ? '' : undefined}>
                        {ci === 0 ? treeCell(row, isiSel(c, row, i)) : isiSel(c, row, i)}
                      </td>
                    ))}
                    {rowActions && (
                      <td data-shrink="" data-align="end" onClick={(e) => e.stopPropagation()}>
                        {menuCell(row)}
                      </td>
                    )}
                  </tr>
                );
              }))}
        </tbody>
        {barisRingkasan && (
          <tfoot className="u-dt-ringkasan">
            <tr>
              {selectable && <td />}
              {visible.map((c, ci) => (
                <td key={c.key} data-align={alignOf(c)} data-shrink={c.shrink ? '' : undefined}>
                  {ringkasan![c.key] ?? (ci === labelKe ? (ringkasan!._label ?? 'Total') : null)}
                </td>
              ))}
              {rowActions && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  const showFooter = pagination && !firstLoad && !hasError && total > 0;
  return (
    <div className={cn('u-data-table', className)} data-loading={dataFlag(loading)} data-cards={dataFlag(cards)}>
      {(toolbar || columnToggle || exportCsv || actions || densityToggle) && (
        <div className="u-dt-toolbar">
          <div className="u-dt-toolbar-start">{toolbar}</div>
          <div className="u-dt-toolbar-end">{tools}</div>
        </div>
      )}
      {statusEkspor}
      {bulk}
      {cards && loading && rows && <div className="u-dt-progress-bar" aria-hidden />}
      {body}
      {kartuRingkasan}
      {showFooter && (
        <div className="u-dt-footer">
          {onPerPageChange || !serverPage ? (
            <label className="u-dt-per-page">
              <span className="u-dt-hide-sm">Baris per halaman</span>
              <Select<number>
                size="sm"
                aria-label="Baris per halaman"
                value={perPage}
                onValueChange={(v) => {
                  if (v == null) return;
                  setInnerPer(v);
                  onPerPageChange?.(v);
                  setInnerPage(1);
                  onPageChange?.(1);
                }}
                options={opsiPerHalaman(perPageOptions, perPage).map((n) => ({ value: n, label: String(n) }))}
              />
            </label>
          ) : (
            <span />
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            compact={isMobile}
            onPageChange={(p) => {
              setInnerPage(p);
              onPageChange?.(p);
            }}
          />
        </div>
      )}
      {dialogEkspor}
    </div>
  );
}
