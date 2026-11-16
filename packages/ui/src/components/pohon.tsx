'use client';
import * as React from 'react';
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button } from './actions';
import { Combobox, type ComboboxProps } from './select';

/**
 * Data bertingkat (induk-anak): kategori, unit kerja, akun/COA, klasifikasi arsip, menu, standar SPMI, dan sejenisnya.
 * Satu set utilitas + komponen supaya semua tabel dan pemilih induk tampil seragam:
 * - `susunPohon` mengubah daftar datar `{ id, induk_id }` menjadi urutan pohon (anak tepat di bawah induknya);
 * - `usePohon` menyimpan cabang yang terbuka/tertutup dan memberi baris yang tampil;
 * - `SelPohon` isi sel pertama tabel: menjorok sesuai tingkat + tombol buka/tutup;
 * - `OpsiPohon` isi butir pemilih (Combobox/Select) yang menjorok + jalur induknya;
 * - `DataTable` menerima prop `tree` yang memakai semua ini.
 */

export interface NodePohon<T> {
  key: string;
  row: T;
  /** Tingkat, mulai 0 untuk akar. */
  depth: number;
  parentKey: string | null;
  /** Jumlah anak langsung. */
  childCount: number;
  /** Jumlah seluruh turunan. */
  descendantCount: number;
  /** Leluhur dari akar sampai induk langsung (tanpa dirinya). */
  ancestors: T[];
  /** Anak terakhir dari induknya (untuk garis bantu). */
  last: boolean;
}

export interface OpsiSusunPohon<T> {
  /** Kunci baris. */
  getKey: (row: T) => string;
  /** Kunci induk; null/undefined/''/'0' berarti akar. */
  getParent: (row: T) => string | number | null | undefined;
  /** Urutan antar-saudara. Bawaan: urutan masukan dipertahankan. */
  compare?: (a: T, b: T) => number;
}

const kosong = (v: unknown) => v === null || v === undefined || v === '' || v === 0 || v === '0';

/**
 * Susun daftar datar jadi urutan pohon (depth-first). Baris yang induknya tidak ada di daftar menjadi akar,
 * sehingga hasil pencarian/halaman tetap tampil. Aman dari siklus (A induk B, B induk A).
 */
export function susunPohon<T>(rows: readonly T[], { getKey, getParent, compare }: OpsiSusunPohon<T>): NodePohon<T>[] {
  const byKey = new Map<string, T>();
  for (const r of rows) byKey.set(getKey(r), r);
  const children = new Map<string | null, T[]>();
  const parentOf = (r: T): string | null => {
    const p = getParent(r);
    if (kosong(p)) return null;
    const pk = String(p);
    return pk !== getKey(r) && byKey.has(pk) ? pk : null;
  };
  for (const r of rows) {
    const p = parentOf(r);
    const list = children.get(p);
    if (list) list.push(r);
    else children.set(p, [r]);
  }
  if (compare) for (const list of children.values()) list.sort(compare);

  const out: NodePohon<T>[] = [];
  const seen = new Set<string>();
  const walk = (r: T, depth: number, ancestors: T[], last: boolean): number => {
    const key = getKey(r);
    if (seen.has(key)) return 0;
    seen.add(key);
    const kids = children.get(key) ?? [];
    const node: NodePohon<T> = { key, row: r, depth, parentKey: ancestors.length ? getKey(ancestors[ancestors.length - 1]) : null, childCount: kids.length, descendantCount: 0, ancestors, last };
    out.push(node);
    let n = 0;
    kids.forEach((c, i) => {
      n += 1 + walk(c, depth + 1, [...ancestors, r], i === kids.length - 1);
    });
    node.descendantCount = n;
    return n;
  };
  const roots = children.get(null) ?? [];
  roots.forEach((r, i) => walk(r, 0, [], i === roots.length - 1));
  // Sisa = baris dalam siklus: tampilkan sebagai akar supaya tidak hilang.
  for (const r of rows) if (!seen.has(getKey(r))) walk(r, 0, [], true);
  return out;
}

/** Kunci semua turunan sebuah node (untuk mencegah memilih diri sendiri/turunannya sebagai induk). */
export function turunanPohon<T>(nodes: readonly NodePohon<T>[], key: string): Set<string> {
  const hasil = new Set<string>();
  const i = nodes.findIndex((n) => n.key === key);
  if (i < 0) return hasil;
  const d = nodes[i].depth;
  for (let j = i + 1; j < nodes.length && nodes[j].depth > d; j++) hasil.add(nodes[j].key);
  return hasil;
}

/** Teks jalur induk, mis. "Peralatan Elektronik › Komputer". */
export function jalurPohon<T>(node: Pick<NodePohon<T>, 'ancestors'>, getLabel: (row: T) => string, pemisah = ' › '): string {
  return node.ancestors.map(getLabel).join(pemisah);
}

export interface UsePohonOpsi {
  /** Cabang terbuka saat awal: true (semua), false (hanya induk teratas), atau angka tingkat (mis. 1 = akar + anaknya). Bawaan false: daftar mulai dari induk teratas, anak dibuka per induk. */
  defaultExpanded?: boolean | number;
  /** Simpan cabang yang ditutup di localStorage dengan kunci ini. */
  storageKey?: string;
  /** Tampilkan semua cabang tanpa memperhatikan buka/tutup (mis. saat mencari, supaya hasil tidak tersembunyi). */
  showAll?: boolean;
}

/** Keadaan buka/tutup cabang. Yang disimpan adalah cabang yang DITUTUP, supaya data baru tampil terbuka. */
export function usePohon<T>(nodes: readonly NodePohon<T>[], { defaultExpanded = false, storageKey, showAll }: UsePohonOpsi = {}) {
  const awal = React.useMemo(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const s = window.localStorage.getItem(`unipo-pohon:${storageKey}`);
        if (s) return new Set<string>(JSON.parse(s) as string[]);
      } catch {
        /* penyimpanan diblokir */
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const batas = defaultExpanded === true ? Infinity : defaultExpanded === false ? 0 : defaultExpanded;
  const [ditutup, setDitutup] = React.useState<Set<string> | null>(awal);
  // Bawaan dihitung dari tingkat bila pengguna belum pernah membuka/menutup.
  const tertutup = React.useMemo(() => ditutup ?? new Set(nodes.filter((n) => n.childCount > 0 && n.depth >= batas).map((n) => n.key)), [ditutup, nodes, batas]);

  const simpan = (s: Set<string>) => {
    setDitutup(s);
    if (storageKey)
      try {
        window.localStorage.setItem(`unipo-pohon:${storageKey}`, JSON.stringify([...s]));
      } catch {
        /* penyimpanan diblokir */
      }
  };

  const visible = React.useMemo(() => {
    if (showAll) return [...nodes];
    const out: NodePohon<T>[] = [];
    let sembunyiSampai = -1;
    for (const n of nodes) {
      if (sembunyiSampai >= 0) {
        if (n.depth > sembunyiSampai) continue;
        sembunyiSampai = -1;
      }
      out.push(n);
      if (n.childCount > 0 && tertutup.has(n.key)) sembunyiSampai = n.depth;
    }
    return out;
  }, [nodes, tertutup, showAll]);

  const isExpanded = (key: string) => Boolean(showAll) || !tertutup.has(key);
  const toggle = (key: string) => {
    const s = new Set(tertutup);
    if (s.has(key)) s.delete(key);
    else s.add(key);
    simpan(s);
  };
  const expandAll = () => simpan(new Set());
  const collapseAll = () => simpan(new Set(nodes.filter((n) => n.childCount > 0).map((n) => n.key)));
  const punyaCabang = nodes.some((n) => n.childCount > 0);
  const semuaTerbuka = !nodes.some((n) => n.childCount > 0 && tertutup.has(n.key));
  return { visible, isExpanded, toggle, expandAll, collapseAll, punyaCabang, semuaTerbuka };
}

export interface SelPohonProps {
  depth: number;
  /** Punya anak: tampilkan tombol buka/tutup. */
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  /** Jumlah turunan, tampil kecil di samping saat cabang tertutup. */
  count?: number;
  children: React.ReactNode;
  className?: string;
}

/** Isi sel pertama baris bertingkat: menjorok sesuai tingkat, garis bantu, dan tombol buka/tutup. */
export function SelPohon({ depth, hasChildren, expanded, onToggle, count, children, className }: SelPohonProps) {
  return (
    <span className={cn('u-tree-cell', className)} style={{ '--u-tree-depth': depth } as React.CSSProperties} data-depth={depth}>
      {depth > 0 && <span className="u-tree-guide" aria-hidden />}
      {hasChildren ? (
        <button
          type="button"
          className="u-tree-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Tutup cabang' : 'Buka cabang'}
          data-expanded={dataFlag(expanded)}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          <ChevronRight />
        </button>
      ) : (
        <span className="u-tree-leaf" aria-hidden />
      )}
      <span className="u-tree-label">{children}</span>
      {hasChildren && !expanded && count ? <span className="u-tree-count">{count}</span> : null}
    </span>
  );
}

/** Butir pemilih bertingkat: judul menjorok + keterangan (kode) + jalur induk saat dicari. */
export function OpsiPohon({ depth, title, meta, path, flat }: { depth: number; title: React.ReactNode; meta?: React.ReactNode; path?: React.ReactNode; flat?: boolean }) {
  return (
    <span className="u-tree-option" style={{ '--u-tree-depth': flat ? 0 : depth } as React.CSSProperties} data-depth={flat ? 0 : depth}>
      {!flat && depth > 0 && <span className="u-tree-option-elbow" aria-hidden />}
      <span className="u-option-text">
        <span>{title}</span>
        {(meta || (flat && path)) && (
          <span className="u-option-meta">
            {flat && path ? (
              <>
                {path}
                {meta ? <> · {meta}</> : null}
              </>
            ) : (
              meta
            )}
          </span>
        )}
      </span>
    </span>
  );
}

/** Tombol "Buka semua / Tutup semua" untuk bilah alat tabel bertingkat. */
export function TombolPohon({ semuaTerbuka, onExpandAll, onCollapseAll, size = 'sm' }: { semuaTerbuka: boolean; onExpandAll: () => void; onCollapseAll: () => void; size?: 'xs' | 'sm' }) {
  return (
    <Button variant="outline" size={size} onClick={semuaTerbuka ? onCollapseAll : onExpandAll} aria-label={semuaTerbuka ? 'Tutup semua cabang' : 'Buka semua cabang'}>
      {semuaTerbuka ? <ChevronsDownUp /> : <ChevronsUpDown />}
      <span className="u-dt-hide-sm">{semuaTerbuka ? 'Tutup semua' : 'Buka semua'}</span>
    </Button>
  );
}

export interface PilihIndukProps<T> {
  /** Semua baris (datar); disusun jadi pohon di dalam. */
  rows: readonly T[] | undefined;
  getKey: (row: T) => string;
  getParent: (row: T) => string | number | null | undefined;
  getLabel: (row: T) => string;
  /** Keterangan kecil di bawah judul (mis. kode). Jangan isi ID mentah. */
  getMeta?: (row: T) => string | null | undefined;
  /** Kunci terpilih ('' / null = tanpa induk). */
  value: string | null | undefined;
  onValueChange: (key: string | null, row: T | null) => void;
  /** Kunci data yang sedang diubah: dirinya dan semua turunannya tidak bisa dipilih (mencegah siklus). */
  exclude?: string | null;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  emptyText?: React.ReactNode;
}

type ButirInduk<T> = { node: NodePohon<T>; cocok: boolean };

/**
 * Pemilih induk untuk data bertingkat: daftar menjorok sesuai tingkat (induk teratas tebal, anak di bawahnya),
 * tanpa ID mentah. Saat mengetik, hasil tampil datar dengan jalur induknya, mis. "Peralatan Elektronik › Komputer".
 */
export function PilihInduk<T>({ rows, getKey, getParent, getLabel, getMeta, value, onValueChange, exclude, placeholder = 'Pilih induk…', loading, disabled, className, id, emptyText = 'Tidak ditemukan.', ...rest }: PilihIndukProps<T>) {
  const nodes = React.useMemo(() => susunPohon(rows ?? [], { getKey, getParent }), [rows, getKey, getParent]);
  const terlarang = React.useMemo(() => {
    if (!exclude) return new Set<string>();
    const s = turunanPohon(nodes, exclude);
    s.add(exclude);
    return s;
  }, [nodes, exclude]);
  const pilihan = React.useMemo(() => nodes.filter((n) => !terlarang.has(n.key)), [nodes, terlarang]);
  const terpilih = React.useMemo<ButirInduk<T> | null>(() => {
    const n = value ? nodes.find((x) => x.key === String(value)) : undefined;
    return n ? { node: n, cocok: false } : null;
  }, [nodes, value]);
  const jalur = (n: NodePohon<T>) => jalurPohon(n, getLabel);

  const muat = React.useCallback(
    async (q: string): Promise<ButirInduk<T>[]> => {
      const k = q.trim().toLowerCase();
      if (!k) return pilihan.map((node) => ({ node, cocok: false }));
      return pilihan.filter((n) => `${getLabel(n.row)} ${getMeta?.(n.row) ?? ''} ${jalur(n)}`.toLowerCase().includes(k)).map((node) => ({ node, cocok: true }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pilihan, getLabel, getMeta],
  );

  return (
    <ComboboxInduk<T>
      key={`${nodes.length}:${exclude ?? ''}`}
      className={className}
      id={id}
      aria-label={rest['aria-label']}
      loadItems={muat}
      debounceMs={0}
      itemToString={(b) => getLabel(b.node.row)}
      itemKey={(b) => b.node.key}
      renderItem={(b) => <OpsiPohon depth={b.node.depth} flat={b.cocok} title={getLabel(b.node.row)} meta={getMeta?.(b.node.row) ?? undefined} path={b.cocok ? jalur(b.node) || undefined : undefined} />}
      value={terpilih}
      onValueChange={(b) => onValueChange(b ? b.node.key : null, b ? b.node.row : null)}
      placeholder={loading ? 'Memuat…' : placeholder}
      emptyText={emptyText}
      disabled={disabled || loading}
    />
  );
}

// Combobox bertipe butir induk (alias supaya generik tetap terbaca).
function ComboboxInduk<T>(props: ComboboxProps<ButirInduk<T>>) {
  return <Combobox<ButirInduk<T>> {...props} />;
}
