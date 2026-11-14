'use client';
import * as React from 'react';
import { AlertTriangle, Columns3, Download, MoreHorizontal, Rows3, SearchX } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, Skeleton } from './actions';
import { Checkbox } from './forms';
import { Select } from './select';
import { Menu, Popover, Tooltip, type MenuEntry } from './overlays';
import { Empty, Pagination, SortButton } from './display';

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
}

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
  /** Unduh CSV dari baris yang tampil; isi string untuk nama berkas. */
  exportCsv?: boolean | string;
  /** Tampilan saat tidak ada data sama sekali. */
  empty?: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode };
  /** Tampilan saat saringan/pencarian tidak menemukan apa pun. Isi `filtered` agar dipakai. */
  emptyFiltered?: { title?: React.ReactNode; description?: React.ReactNode; onReset?: () => void };
  filtered?: boolean;
  /** Tampilan di bawah 640 px: kartu bertumpuk (bawaan) atau tabel geser. */
  mobile?: 'cards' | 'scroll';
  /** Tinggi maksimum isi tabel; header tetap menempel saat digulir. */
  maxHeight?: number | string;
  striped?: boolean;
  caption?: string;
  className?: string;
  /** Simpan pilihan kolom dan kerapatan di localStorage dengan kunci ini. */
  storageKey?: string;
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

function toCsv<T>(cols: DataColumn<T>[], rows: T[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map((c) => esc(labelOf(c))).join(','), ...rows.map((r) => cols.map((c) => esc(raw(c, r))).join(','))].join('\n');
}

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
    empty,
    emptyFiltered,
    filtered,
    mobile = 'cards',
    maxHeight,
    striped,
    caption,
    className,
    storageKey,
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
  const [hidden, setHidden] = useStored<string[]>(storageKey && `${storageKey}:kolom`, columns.filter((c) => c.defaultHidden).map((c) => c.key));
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
  const total = totalProp ?? sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const shown = serverPage ? sorted : sorted.slice((page - 1) * perPage, page * perPage);
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
  const cards = mobile === 'cards' && isMobile;
  const firstLoad = loading && !rows;
  const hasError = Boolean(error) && !loading;
  const isEmpty = !firstLoad && !hasError && shown.length === 0;
  const colSpan = visible.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  const downloadCsv = () => {
    const name = typeof exportCsv === 'string' ? exportCsv : 'data';
    const blob = new Blob(['﻿' + toCsv(visible, sorted)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.endsWith('.csv') ? name : `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- bilah alat
  const tools = (
    <>
      {actions}
      {densityToggle && !cards && (
        <Tooltip content={density === 'compact' ? 'Baris lega' : 'Baris rapat'}>
          <Button variant="outline" size="sm" iconOnly aria-label="Ubah kerapatan baris" aria-pressed={density === 'compact'} onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}>
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
                  <Checkbox checked={!hidden.includes(c.key)} onCheckedChange={(on) => setHidden(on ? hidden.filter((k) => k !== c.key) : [...hidden, c.key])} disabled={!hidden.includes(c.key) && visible.length === 1} />
                  {labelOf(c)}
                </label>
              ))}
          </div>
        </Popover>
      )}
      {exportCsv && (
        <Tooltip content="Unduh CSV">
          <Button variant="outline" size="sm" iconOnly aria-label="Unduh CSV" onClick={downloadCsv} disabled={!sorted.length}>
            <Download />
          </Button>
        </Tooltip>
      )}
    </>
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
        description={error instanceof Error ? error.message : typeof error === 'string' ? error : 'Periksa koneksi, lalu coba lagi.'}
        actions={onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button>}
      />,
    );
  else if (isEmpty && filtered)
    state = stateRow(
      <Empty
        icon={<SearchX />}
        title={emptyFiltered?.title ?? 'Tidak ada yang cocok'}
        description={emptyFiltered?.description ?? 'Ubah kata kunci atau saringan untuk melihat data lain.'}
        actions={emptyFiltered?.onReset && <Button variant="outline" size="sm" onClick={emptyFiltered.onReset}>Atur ulang saringan</Button>}
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

  const body = cards ? (
    <div className="u-dt-cards" role="list" aria-busy={loading || undefined}>
      {firstLoad
        ? Array.from({ length: skeletonCount }, (_, i) => (
            <div key={i} className="u-dt-card">
              <Skeleton style={{ height: 14, width: '60%' }} />
              <Skeleton style={{ height: 12, width: '40%', marginTop: 8 }} />
            </div>
          ))
        : state ??
          shown.map((row, i) => {
            const k = rowKey(row);
            const role = (c: DataColumn<T>, idx: number) => c.mobile ?? (idx === 0 ? 'title' : 'meta');
            const by = (r: string) => visible.filter((c, idx) => role(c, idx) === r);
            return (
              <div key={k} role="listitem" className="u-dt-card" data-selected={dataFlag(selected.includes(k))} data-clickable={dataFlag(Boolean(onRowClick))} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                <div className="u-dt-card-head">
                  {selectable && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={selected.includes(k)} onCheckedChange={() => toggleRow(k)} aria-label="Pilih baris" />
                    </span>
                  )}
                  <div className="u-dt-card-title">
                    {by('title').map((c) => (
                      <div key={c.key}>{c.cell ? c.cell(row, i) : String(raw(c, row) ?? '')}</div>
                    ))}
                    {by('subtitle').map((c) => (
                      <div key={c.key} className="u-dt-card-subtitle">
                        {c.cell ? c.cell(row, i) : String(raw(c, row) ?? '')}
                      </div>
                    ))}
                  </div>
                  {by('badge').map((c) => (
                    <div key={c.key}>{c.cell ? c.cell(row, i) : String(raw(c, row) ?? '')}</div>
                  ))}
                  <span onClick={(e) => e.stopPropagation()}>{menuCell(row)}</span>
                </div>
                {by('meta').length > 0 && (
                  <dl className="u-dt-card-meta">
                    {by('meta').map((c) => (
                      <div key={c.key}>
                        <dt>{labelOf(c)}</dt>
                        <dd>{c.cell ? c.cell(row, i) : String(raw(c, row) ?? '–')}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
    </div>
  ) : (
    <div className="u-table-wrap u-dt-scroll" style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
      <table className="u-table" data-density={density} data-striped={dataFlag(striped)} aria-busy={loading || undefined}>
        {caption && <caption className="u-sr-only">{caption}</caption>}
        <thead>
          <tr>
            {selectable && (
              <th data-shrink="" className="u-dt-check">
                <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onCheckedChange={toggleAll} aria-label="Pilih semua di halaman ini" disabled={!shown.length} />
              </th>
            )}
            {visible.map((c) => (
              <th key={c.key} data-align={c.align} data-shrink={c.shrink ? '' : undefined} style={c.width ? { width: c.width } : undefined} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
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
                    <td key={c.key} data-align={c.align}>
                      <Skeleton style={{ height: 12, width: j === 0 ? '70%' : `${40 + ((i * 17 + j * 11) % 40)}%`, display: 'inline-block' }} />
                    </td>
                  ))}
                  {rowActions && <td />}
                </tr>
              ))
            : state ??
              shown.map((row, i) => {
                const k = rowKey(row);
                const sel = selected.includes(k);
                return (
                  <tr key={k} data-selected={dataFlag(sel)} data-clickable={dataFlag(Boolean(onRowClick))} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                    {selectable && (
                      <td className="u-dt-check" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel} onCheckedChange={() => toggleRow(k)} aria-label="Pilih baris" />
                      </td>
                    )}
                    {visible.map((c) => (
                      <td key={c.key} data-align={c.align} data-shrink={c.shrink ? '' : undefined}>
                        {c.cell ? c.cell(row, i) : String(raw(c, row) ?? '')}
                      </td>
                    ))}
                    {rowActions && (
                      <td data-shrink="" data-align="end" onClick={(e) => e.stopPropagation()}>
                        {menuCell(row)}
                      </td>
                    )}
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );

  const showFooter = !firstLoad && !hasError && total > 0;
  return (
    <div className={cn('u-data-table', className)} data-loading={dataFlag(loading)} data-cards={dataFlag(cards)}>
      {(toolbar || columnToggle || exportCsv || actions || densityToggle) && (
        <div className="u-dt-toolbar">
          <div className="u-dt-toolbar-start">{toolbar}</div>
          <div className="u-dt-toolbar-end">{tools}</div>
        </div>
      )}
      {bulk}
      {cards && loading && rows && <div className="u-dt-progress-bar" aria-hidden />}
      {body}
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
                options={perPageOptions.map((n) => ({ value: n, label: String(n) }))}
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
    </div>
  );
}
