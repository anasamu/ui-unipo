'use client';
import * as React from 'react';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Skeleton, Spinner } from './actions';
import type { ControlSize } from './forms';

export interface MultiPilihProps<T> {
  /** Butir statis (disaring di browser). Abaikan bila memakai `loadItems`. */
  items?: T[];
  /** Ambil butir dari server sesuai kata kunci (debounce otomatis). */
  loadItems?: (query: string, signal: AbortSignal) => Promise<T[]>;
  minQueryLength?: number;
  debounceMs?: number;
  itemToString: (item: T) => string;
  itemKey: (item: T) => string;
  /** Tampilan butir di daftar (bawaan teks). */
  renderItem?: (item: T) => React.ReactNode;
  /** Teks chip (bawaan itemToString). */
  chipLabel?: (item: T) => string;
  /** Butir tidak bisa dipilih (mis. sudah anggota tim); kembalikan alasannya untuk ditampilkan. */
  itemDisabled?: (item: T) => string | boolean | null | undefined;
  value?: T[];
  defaultValue?: T[];
  onValueChange?: (value: T[]) => void;
  /** Batas jumlah pilihan. Setelah tercapai, butir lain nonaktif. */
  maks?: number;
  placeholder?: string;
  emptyText?: React.ReactNode;
  hintText?: React.ReactNode;
  errorText?: string;
  size?: ControlSize;
  disabled?: boolean;
  /** Hanya menampilkan pilihan sebagai chip tanpa bisa diubah. */
  readOnly?: boolean;
  memuat?: boolean;
  /** Galat dari luar (validasi server). */
  galat?: string | null;
  /** Nama untuk formulir HTML: nilai dikirim sebagai beberapa input tersembunyi `name[]` berisi itemKey. */
  name?: string;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
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
 * Pilih banyak dengan pencarian: pilihan tampil sebagai chip (Backspace menghapus chip terakhir, panah kiri/kanan
 * berpindah chip), daftar bisa statis atau dimuat dari server. Pengganti daftar checkbox panjang dan isian
 * "pisahkan dengan koma".
 */
export function MultiPilih<T>({
  items,
  loadItems,
  minQueryLength = 0,
  debounceMs = 250,
  itemToString,
  itemKey,
  renderItem,
  chipLabel,
  itemDisabled,
  value,
  defaultValue,
  onValueChange,
  maks,
  placeholder = 'Cari lalu pilih…',
  emptyText = 'Tidak ada hasil.',
  hintText,
  errorText = 'Data tidak bisa dimuat. Coba lagi.',
  size,
  disabled,
  readOnly,
  memuat,
  galat,
  name,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: MultiPilihProps<T>) {
  const [dalam, setDalam] = React.useState<T[]>(defaultValue ?? []);
  const terpilih = value ?? dalam;
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [remote, setRemote] = React.useState<T[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const debounced = useDebounced(query, debounceMs);
  const jangkar = React.useRef<HTMLDivElement>(null);
  const idGalat = React.useId();
  const tooShort = Boolean(loadItems) && debounced.trim().length < minQueryLength;
  const penuh = maks !== undefined && terpilih.length >= maks;

  React.useEffect(() => {
    if (!loadItems || !open || tooShort) return;
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    loadItems(debounced.trim(), ctrl.signal)
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

  // Butir terpilih tetap ada di daftar agar chip dan centang konsisten saat hasil server berganti.
  const dasar = loadItems ? (tooShort ? [] : remote) : (items ?? []);
  const kunciDasar = new Set(dasar.map(itemKey));
  const daftar = loadItems ? [...dasar, ...terpilih.filter((t) => !kunciDasar.has(itemKey(t)))] : dasar;
  const kunciTerpilih = new Set(terpilih.map(itemKey));
  const ubah = (v: T[]) => {
    setDalam(v);
    onValueChange?.(v);
  };

  if (memuat) return <Skeleton className={cn('u-isian-kerangka', className)} data-size={size} />;
  const label = chipLabel ?? itemToString;

  if (readOnly)
    return (
      <div className={cn('u-multi-pilih', className)} data-readonly="" aria-label={ariaLabel} id={id}>
        <div className="u-multi-pilih-kotak" data-size={size}>
          {terpilih.length ? (
            terpilih.map((t) => (
              <span key={itemKey(t)} className="u-multi-pilih-chip">
                {label(t)}
              </span>
            ))
          ) : (
            <span className="u-multi-pilih-kosong">Belum ada pilihan</span>
          )}
        </div>
      </div>
    );

  return (
    <div className={cn('u-multi-pilih', className)} data-disabled={dataFlag(disabled)}>
      <BaseCombobox.Root<T, true>
        multiple
        items={daftar}
        filter={loadItems ? null : undefined}
        itemToStringLabel={itemToString}
        itemToStringValue={itemKey}
        isItemEqualToValue={(a, b) => itemKey(a) === itemKey(b)}
        value={terpilih}
        onValueChange={(v) => ubah((v as T[]) ?? [])}
        inputValue={query}
        onInputValueChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
      >
        <BaseCombobox.Chips ref={jangkar} className="u-multi-pilih-kotak" data-size={size} data-invalid={dataFlag(Boolean(galat))}>
          <BaseCombobox.Value>
            {(nilai: T[]) => (
              <>
                {nilai.map((t) => (
                  <BaseCombobox.Chip key={itemKey(t)} className="u-multi-pilih-chip" aria-label={label(t)}>
                    <span className="u-multi-pilih-chip-teks">{label(t)}</span>
                    {!disabled && (
                      <BaseCombobox.ChipRemove className="u-multi-pilih-chip-hapus" aria-label={`Hapus ${label(t)}`}>
                        <X />
                      </BaseCombobox.ChipRemove>
                    )}
                  </BaseCombobox.Chip>
                ))}
                <BaseCombobox.Input
                  id={id}
                  className="u-multi-pilih-input"
                  placeholder={disabled ? '' : nilai.length ? (penuh ? '' : 'Tambah…') : placeholder}
                  aria-label={ariaLabel}
                  aria-invalid={galat ? true : undefined}
                  aria-describedby={cn(ariaDescribedby, galat && idGalat) || undefined}
                />
              </>
            )}
          </BaseCombobox.Value>
          <span className="u-multi-pilih-ujung">
            {disabled ? null : loading && open ? (
              <Spinner size="sm" />
            ) : terpilih.length > 0 ? (
              <BaseCombobox.Clear className="u-select-icon" aria-label="Kosongkan semua pilihan">
                <X />
              </BaseCombobox.Clear>
            ) : (
              <BaseCombobox.Trigger className="u-select-icon" aria-label="Buka daftar">
                <ChevronsUpDown />
              </BaseCombobox.Trigger>
            )}
          </span>
        </BaseCombobox.Chips>
        <BaseCombobox.Portal>
          <BaseCombobox.Positioner className="u-popup-positioner" anchor={jangkar} sideOffset={6} collisionPadding={8}>
            <BaseCombobox.Popup className="u-listbox u-multi-pilih-popup">
              <BaseCombobox.Status className="u-listbox-status">
                {failed ? (
                  errorText
                ) : tooShort ? (
                  (hintText ?? `Ketik minimal ${minQueryLength} huruf.`)
                ) : loading && !daftar.length ? (
                  <>
                    <Spinner size="sm" /> Mencari…
                  </>
                ) : penuh ? (
                  `Sudah memilih ${maks} (batas maksimal).`
                ) : null}
              </BaseCombobox.Status>
              {!loading && !failed && !tooShort && <BaseCombobox.Empty className="u-listbox-empty">{emptyText}</BaseCombobox.Empty>}
              <BaseCombobox.List>
                {(item: T) => {
                  const alasan = itemDisabled?.(item);
                  const pilih = kunciTerpilih.has(itemKey(item));
                  const mati = Boolean(alasan) || (penuh && !pilih);
                  return (
                    <BaseCombobox.Item key={itemKey(item)} value={item} disabled={mati} className="u-listbox-item">
                      <span className="u-multi-pilih-centang" data-checked={dataFlag(pilih)} aria-hidden>
                        <Check />
                      </span>
                      <span className="u-option-text">
                        <span>{renderItem ? renderItem(item) : itemToString(item)}</span>
                        {typeof alasan === 'string' && <span className="u-option-meta">{alasan}</span>}
                      </span>
                    </BaseCombobox.Item>
                  );
                }}
              </BaseCombobox.List>
            </BaseCombobox.Popup>
          </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
      </BaseCombobox.Root>
      {name && terpilih.map((t) => <input key={itemKey(t)} type="hidden" name={`${name}[]`} value={itemKey(t)} />)}
      {(galat || maks !== undefined) && (
        <span id={idGalat} className="u-isian-pesan" data-tone={galat ? 'danger' : undefined} role={galat ? 'alert' : undefined}>
          {galat ?? `${terpilih.length} dari maks ${maks} dipilih`}
        </span>
      )}
    </div>
  );
}
