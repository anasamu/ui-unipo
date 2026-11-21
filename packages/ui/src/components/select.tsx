'use client';
import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Spinner } from './actions';
import type { ControlSize } from './forms';

// ---------------------------------------------------------------- Select
export interface SelectOption<V = string> {
  value: V;
  label: React.ReactNode;
  /** Teks kecil di bawah label. */
  description?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps<V> {
  options: SelectOption<V>[];
  value?: V | null;
  defaultValue?: V | null;
  onValueChange?: (value: V | null) => void;
  placeholder?: string;
  size?: ControlSize;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /**
   * Lencana kecil di dalam isian, rata kanan sebelum ikon panah (mis. `<LencanaPeriode>` "Aktif"/"Ditutup"). Letakkan
   * lencana status di sini, bukan di bawah isian, supaya isian satu baris saringan tetap sejajar.
   */
  lencana?: React.ReactNode;
}

const KOSONG = '\u0000kosong';

/** Pilihan tunggal dari daftar pendek yang sudah diketahui (≤ ±30 butir). Untuk daftar panjang/berasal dari API, pakai Combobox. */
export function Select<V = string>({ options, placeholder = 'Pilih…', size, className, value, defaultValue, onValueChange, lencana, ...props }: SelectProps<V>) {
  const groups = React.useMemo(() => {
    const map = new Map<string, SelectOption<V>[]>();
    for (const o of options) {
      const k = o.group ?? '';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return [...map.entries()];
  }, [options]);
  // Base UI menganggap nilai '' sebagai "belum memilih" sehingga opsi seperti { value: '', label: 'Semua status' } tampil
  // sebagai placeholder "Pilih…". Nilai '' diganti penanda internal lalu dikembalikan ke '' saat berubah, TETAPI hanya
  // bila memang ada opsi bernilai ''. Tanpa opsi itu, '' berarti "belum diisi" (mis. isian formulir kosong) dan harus
  // menampilkan placeholder, bukan teks penanda internal.
  const adaKosong = options.some((o) => o.value === ('' as unknown as V));
  const enc = (v: V | null | undefined) => (v === ('' as unknown as V) ? (adaKosong ? (KOSONG as unknown as V) : null) : v);
  const dec = (v: V | null) => (v === (KOSONG as unknown as V) ? ('' as unknown as V) : v);
  // Input tersembunyi Base UI akan mengirim penanda internal; bila ada opsi '', nilai formulir dikirim sendiri.
  const [nilaiAwal, setNilaiForm] = React.useState<V | null | undefined>(defaultValue);
  const nilaiForm = value !== undefined ? value : nilaiAwal;
  return (
    <BaseSelect.Root<V>
      items={options.map((o) => ({ value: enc(o.value) as V, label: o.label }))}
      value={value === undefined ? undefined : (enc(value) ?? null)}
      defaultValue={defaultValue === undefined ? undefined : (enc(defaultValue) ?? null)}
      onValueChange={(v) => {
        const d = dec(v as V | null);
        setNilaiForm(d);
        onValueChange?.(d);
      }}
      disabled={props.disabled}
      name={adaKosong ? undefined : props.name}
      required={props.required}
    >
      <BaseSelect.Trigger className={cn('u-select-trigger', className)} data-size={size} id={props.id} aria-label={props['aria-label']}>
        <BaseSelect.Value className="u-select-value" placeholder={placeholder} />
        {lencana ? <span className="u-select-lencana">{lencana}</span> : null}
        <BaseSelect.Icon className="u-select-icon">
          <ChevronsUpDown />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="u-popup-positioner" sideOffset={6} alignItemWithTrigger={false} collisionPadding={8}>
          <BaseSelect.Popup className="u-listbox">
            {groups.map(([g, items], gi) => (
              <BaseSelect.Group key={g || gi}>
                {gi > 0 && <BaseSelect.Separator className="u-listbox-separator" />}
                {g && <BaseSelect.GroupLabel className="u-listbox-group-label">{g}</BaseSelect.GroupLabel>}
                {items.map((o) => (
                  <BaseSelect.Item key={String(o.value)} value={enc(o.value)} disabled={o.disabled} className="u-listbox-item">
                    {o.icon}
                    <span className="u-option-text">
                      <BaseSelect.ItemText>{o.label}</BaseSelect.ItemText>
                      {o.description && <span className="u-option-meta" title={typeof o.description === 'string' ? o.description : undefined}>{o.description}</span>}
                    </span>
                    <BaseSelect.ItemIndicator className="u-listbox-item-indicator">
                      <Check />
                    </BaseSelect.ItemIndicator>
                  </BaseSelect.Item>
                ))}
              </BaseSelect.Group>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
      {adaKosong && props.name && <input type="hidden" name={props.name} value={nilaiForm == null ? '' : String(nilaiForm)} disabled={props.disabled} />}
    </BaseSelect.Root>
  );
}

// ---------------------------------------------------------------- Combobox
export interface ComboboxProps<T> {
  /** Butir statis (disaring di klien). Abaikan bila memakai `loadItems`. */
  items?: T[];
  /** Ambil butir dari server sesuai kata kunci (debounce otomatis). Dipakai komponen Cari* yang terhubung SDK. */
  loadItems?: (query: string, signal: AbortSignal) => Promise<T[]>;
  /** Minimal huruf sebelum `loadItems` dipanggil. Bawaan 0 (langsung memuat saat dibuka). */
  minQueryLength?: number;
  debounceMs?: number;
  itemToString: (item: T) => string;
  itemKey: (item: T) => string;
  /** Tampilan satu butir di daftar. Bawaan: teks dari itemToString. */
  renderItem?: (item: T) => React.ReactNode;
  /** Kelompokkan butir statis (`items`) dengan judul kelompok, mis. per unit. Urutan kelompok mengikuti butir pertama. */
  itemGroup?: (item: T) => string | null | undefined;
  /**
   * Lencana untuk butir terpilih, tampil di dalam isian (mis. "Nonaktif" untuk nilai lama yang menunjuk dosen yang sudah
   * keluar). Kembalikan null bila tidak perlu lencana.
   */
  lencana?: (item: T) => React.ReactNode;
  value?: T | null;
  defaultValue?: T | null;
  onValueChange?: (value: T | null) => void;
  placeholder?: string;
  emptyText?: React.ReactNode;
  /** Teks saat kata kunci belum cukup panjang. */
  hintText?: React.ReactNode;
  icon?: React.ReactNode;
  size?: ControlSize;
  disabled?: boolean;
  name?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /** Pesan galat pemuatan, mis. "Tidak bisa memuat data". */
  errorText?: string;
  /**
   * Tambah data baru bila yang dicari tidak ada. Tombol "Tambah …" muncul di kaki daftar (selalu, atau hanya saat
   * hasil kosong bila `hanyaKosong`). Kembalikan butir baru (boleh Promise) agar langsung terpilih.
   */
  tambah?: {
    onTambah: (kata: string) => T | null | void | Promise<T | null | void>;
    label?: (kata: string) => React.ReactNode;
    hanyaKosong?: boolean;
  };
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * Isian cari-dan-pilih. Bisa dengan daftar statis (`items`) atau memuat dari API (`loadItems`).
 * Fondasi semua komponen Cari* (CariMahasiswa, CariDosen, CariNegara, ...).
 */
export function Combobox<T>({
  items,
  loadItems,
  minQueryLength = 0,
  debounceMs = 250,
  itemToString,
  itemKey,
  renderItem,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Cari…',
  emptyText = 'Tidak ada hasil.',
  hintText,
  icon = <Search />,
  size,
  disabled,
  name,
  className,
  id,
  errorText = 'Data tidak bisa dimuat. Coba lagi.',
  tambah,
  itemGroup,
  lencana,
  ...rest
}: ComboboxProps<T>) {
  const initial = value !== undefined ? value : (defaultValue ?? null);
  const [query, setQuery] = React.useState(() => (initial ? itemToString(initial) : ''));
  const [open, setOpen] = React.useState(false);
  const [remote, setRemote] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [inner, setInner] = React.useState<T | null>(defaultValue ?? null);
  const selected = value !== undefined ? value : inner;
  const debounced = useDebounced(query, debounceMs);
  // Nilai dari luar berubah (mis. form diisi ulang): samakan teks isian selama daftar tertutup.
  const selectedLabel = selected ? itemToString(selected) : '';
  React.useEffect(() => {
    if (!open) setQuery(selectedLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabel]);
  const tooShort = Boolean(loadItems) && debounced.trim().length < minQueryLength;

  React.useEffect(() => {
    if (!loadItems || !open || tooShort) return;
    // Kata kunci sama dengan butir terpilih = pengguna belum mengetik apa pun.
    const q = selected && debounced === itemToString(selected) ? '' : debounced.trim();
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    loadItems(q, ctrl.signal)
      .then((r) => !ctrl.signal.aborted && setRemote(r))
      .catch((e) => {
        if (!ctrl.signal.aborted && e?.name !== 'AbortError') {
          setFailed(true);
          setRemote([]);
        }
      })
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, open, tooShort, loadItems]);

  const list = loadItems ? (tooShort ? [] : remote) : (items ?? []);
  const listWithSelected = selected && loadItems && !list.some((i) => itemKey(i) === itemKey(selected)) ? [selected, ...list] : list;
  const grouped = React.useMemo(() => {
    if (!itemGroup || loadItems) return null;
    const map = new Map<string, T[]>();
    for (const it of listWithSelected) {
      const g = itemGroup(it) ?? '';
      map.set(g, [...(map.get(g) ?? []), it]);
    }
    return [...map].map(([value, items]) => ({ value, items }));
  }, [itemGroup, loadItems, listWithSelected]);
  const renderEl = (item: T) => (
    <BaseCombobox.Item key={itemKey(item)} value={item} className="u-listbox-item">
      {renderItem ? renderItem(item) : itemToString(item)}
      <BaseCombobox.ItemIndicator className="u-listbox-item-indicator">
        <Check />
      </BaseCombobox.ItemIndicator>
    </BaseCombobox.Item>
  );

  return (
    <BaseCombobox.Root<T>
      items={(grouped ?? listWithSelected) as T[]}
      filter={loadItems ? null : undefined}
      itemToStringLabel={itemToString}
      itemToStringValue={itemKey}
      isItemEqualToValue={(a, b) => itemKey(a) === itemKey(b)}
      value={selected}
      onValueChange={(v) => {
        setInner(v as T | null);
        onValueChange?.(v as T | null);
      }}
      inputValue={query}
      onInputValueChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      name={name}
    >
      <div className={cn('u-input-group', className)} data-size={size}>
        <span className="u-input-addon" data-align="start">
          {icon}
        </span>
        <BaseCombobox.Input placeholder={placeholder} id={id} aria-label={rest['aria-label']} />
        {selected && lencana && !open ? (() => {
          const l = lencana(selected);
          return l == null || l === false ? null : <span className="u-input-addon" data-align="end" data-lencana="">{l}</span>;
        })() : null}
        <span className="u-input-addon" data-align="end">
          {loading && open ? (
            <Spinner size="sm" />
          ) : selected ? (
            <BaseCombobox.Clear className="u-select-icon" aria-label="Kosongkan">
              <X />
            </BaseCombobox.Clear>
          ) : (
            <BaseCombobox.Trigger className="u-select-icon" aria-label="Buka daftar">
              <ChevronsUpDown />
            </BaseCombobox.Trigger>
          )}
        </span>
      </div>
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner className="u-popup-positioner" sideOffset={6} collisionPadding={8}>
          <BaseCombobox.Popup className="u-listbox">
            <BaseCombobox.Status className="u-listbox-status">
              {failed ? (
                errorText
              ) : tooShort ? (
                (hintText ?? `Ketik minimal ${minQueryLength} huruf.`)
              ) : loading && !listWithSelected.length ? (
                <>
                  <Spinner size="sm" /> Mencari…
                </>
              ) : null}
            </BaseCombobox.Status>
            {!loading && !failed && !tooShort && <BaseCombobox.Empty className="u-listbox-empty">{emptyText}</BaseCombobox.Empty>}
            <BaseCombobox.List>
              {grouped
                ? (g: { value: string; items: T[] }) => (
                    <BaseCombobox.Group key={g.value} items={g.items} className="u-listbox-group">
                      {g.value && <BaseCombobox.GroupLabel className="u-listbox-group-label">{g.value}</BaseCombobox.GroupLabel>}
                      <BaseCombobox.Collection>{(item: T) => renderEl(item)}</BaseCombobox.Collection>
                    </BaseCombobox.Group>
                  )
                : (item: T) => renderEl(item)}
            </BaseCombobox.List>
            {tambah && !tooShort && (!tambah.hanyaKosong || (!loading && !listWithSelected.length)) && (
              <button
                type="button"
                className="u-listbox-tambah"
                onMouseDown={(e) => e.preventDefault()}
                onClick={async () => {
                  const kata = selected && query === itemToString(selected) ? '' : query.trim();
                  setOpen(false);
                  const baru = await tambah.onTambah(kata);
                  if (baru) {
                    setInner(baru);
                    setRemote((r) => [baru, ...r]);
                    onValueChange?.(baru);
                  }
                }}
              >
                <Plus aria-hidden />
                <span>{tambah.label ? tambah.label(query.trim()) : query.trim() && !(selected && query === itemToString(selected)) ? <>Tambah “{query.trim()}”</> : 'Tambah data baru'}</span>
              </button>
            )}
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
  );
}

/** Isi standar satu butir: media (avatar/bendera/logo) + judul + keterangan. */
export function OptionContent({ media, mediaShape, title, meta }: { media?: React.ReactNode; mediaShape?: 'circle' | 'square' | 'flag'; title: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <>
      {media != null && (
        <span className="u-option-media" data-shape={mediaShape}>
          {media}
        </span>
      )}
      <span className="u-option-text">
        <span>{title}</span>
        {meta && <span className="u-option-meta" title={typeof meta === 'string' ? meta : undefined}>{meta}</span>}
      </span>
    </>
  );
}
