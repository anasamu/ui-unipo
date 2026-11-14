'use client';
import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
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
}

/** Pilihan tunggal dari daftar pendek yang sudah diketahui (≤ ±30 butir). Untuk daftar panjang/berasal dari API, pakai Combobox. */
export function Select<V = string>({ options, placeholder = 'Pilih…', size, className, value, defaultValue, onValueChange, ...props }: SelectProps<V>) {
  const groups = React.useMemo(() => {
    const map = new Map<string, SelectOption<V>[]>();
    for (const o of options) {
      const k = o.group ?? '';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return [...map.entries()];
  }, [options]);
  return (
    <BaseSelect.Root<V>
      items={options.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(v) => onValueChange?.(v as V | null)}
      disabled={props.disabled}
      name={props.name}
      required={props.required}
    >
      <BaseSelect.Trigger className={cn('u-select-trigger', className)} data-size={size} id={props.id} aria-label={props['aria-label']}>
        <BaseSelect.Value className="u-select-value" placeholder={placeholder} />
        <BaseSelect.Icon className="u-select-icon">
          <ChevronsUpDown />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="u-popup-positioner" sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className="u-listbox">
            {groups.map(([g, items], gi) => (
              <BaseSelect.Group key={g || gi}>
                {gi > 0 && <BaseSelect.Separator className="u-listbox-separator" />}
                {g && <BaseSelect.GroupLabel className="u-listbox-group-label">{g}</BaseSelect.GroupLabel>}
                {items.map((o) => (
                  <BaseSelect.Item key={String(o.value)} value={o.value} disabled={o.disabled} className="u-listbox-item">
                    {o.icon}
                    <span className="u-option-text">
                      <BaseSelect.ItemText>{o.label}</BaseSelect.ItemText>
                      {o.description && <span className="u-option-meta">{o.description}</span>}
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

  return (
    <BaseCombobox.Root<T>
      items={listWithSelected}
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
        <BaseCombobox.Positioner className="u-popup-positioner" sideOffset={6}>
          <BaseCombobox.Popup className="u-listbox">
            <BaseCombobox.Status className="u-listbox-status">
              {failed ? errorText : tooShort ? (hintText ?? `Ketik minimal ${minQueryLength} huruf.`) : loading && !listWithSelected.length ? <><Spinner size="sm" /> Mencari…</> : null}
            </BaseCombobox.Status>
            {!loading && !failed && !tooShort && <BaseCombobox.Empty className="u-listbox-empty">{emptyText}</BaseCombobox.Empty>}
            <BaseCombobox.List>
              {(item: T) => (
                <BaseCombobox.Item key={itemKey(item)} value={item} className="u-listbox-item">
                  {renderItem ? renderItem(item) : itemToString(item)}
                  <BaseCombobox.ItemIndicator className="u-listbox-item-indicator">
                    <Check />
                  </BaseCombobox.ItemIndicator>
                </BaseCombobox.Item>
              )}
            </BaseCombobox.List>
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
        {meta && <span className="u-option-meta">{meta}</span>}
      </span>
    </>
  );
}
