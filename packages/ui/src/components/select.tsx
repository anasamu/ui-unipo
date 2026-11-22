'use client';
import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, Plus, Search, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Spinner } from './actions';
import type { ControlSize } from './forms';
import { labelBuatPilihan, teksKosongPilihan, teksPengelolaPilihan, useBuatPilihan, type BuatPilihan } from './pilihan-kosong';

export * from './pilihan-kosong';

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
  /**
   * Pola pilihan kosong: bila datanya belum ada, yang berhak (`boleh`) mendapat tombol buat di akhir daftar (menonjol
   * saat kosong) yang membuka panel samping; data baru langsung terpilih. Yang tidak berhak melihat unit pengelolanya.
   * `selesai()` menerima opsi baru (`{ value, label }`, tampil walau daftar belum dimuat ulang) atau nilainya saja.
   */
  buat?: BuatPilihan<SelectOption<V> | V>;
  /** Daftar sedang dimuat: tampil "Memuat…", bukan keadaan kosong. */
  memuat?: boolean;
  /** Daftar gagal dimuat (true = pesan bawaan): bukan keadaan kosong. */
  galat?: React.ReactNode;
}

const KOSONG = '\u0000kosong';
/** Nilai butir "buat baru" di dalam daftar (pola pilihan kosong). Tidak pernah menjadi nilai terpilih. */
const BUAT = '\u0000buat';

const adalahOpsi = <V,>(x: unknown): x is SelectOption<V> => typeof x === 'object' && x !== null && 'value' in x && 'label' in x;

/** Pilihan tunggal dari daftar pendek yang sudah diketahui (≤ ±30 butir). Untuk daftar panjang/berasal dari API, pakai Combobox. */
export function Select<V = string>({ options: opsiLuar, placeholder, size, className, value, defaultValue, onValueChange, lencana, buat, memuat, galat, ...props }: SelectProps<V>) {
  // Data yang baru dibuat lewat `buat` tampil walau daftar dari server belum diperbarui.
  const [tambahan, setTambahan] = React.useState<SelectOption<V>[]>([]);
  const options = React.useMemo(() => [...opsiLuar, ...tambahan.filter((t) => !opsiLuar.some((o) => o.value === t.value))], [opsiLuar, tambahan]);
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
  // Nilai dipegang sendiri (juga saat tidak dikendalikan) supaya butir "buat baru" tidak pernah menjadi nilai terpilih.
  const [dalam, setDalam] = React.useState<V | null | undefined>(defaultValue);
  const nilai = value !== undefined ? value : dalam;
  const pemicu = React.useRef<HTMLButtonElement>(null);
  const pilih = (v: V | null) => {
    setDalam(v);
    onValueChange?.(v);
  };
  const b = useBuatPilihan<SelectOption<V> | V>(buat, {
    fokusKe: props.id ?? pemicu,
    onDibuat: (baru) => {
      if (adalahOpsi<V>(baru)) {
        setTambahan((t) => [...t.filter((x) => x.value !== baru.value), baru]);
        pilih(baru.value);
      } else pilih(baru as V);
    },
  });
  const kosong = !memuat && !galat && !opsiLuar.length && !tambahan.length;
  const tampilBuat = Boolean(buat?.boleh) && !memuat && !galat && (!buat?.hanyaKosong || kosong);
  const pengelola = kosong ? teksPengelolaPilihan(buat) : null;
  const placeholderAkhir = placeholder ?? (memuat ? 'Memuat…' : kosong && buat ? String(teksKosongPilihan(buat, 'Pilih…')).replace(/\.$/, '') : 'Pilih…');
  return (
    <>
      <BaseSelect.Root<V>
        items={options.map((o) => ({ value: enc(o.value) as V, label: o.label }))}
        value={enc(nilai) ?? null}
        onValueChange={(v) => {
          if (v === (BUAT as unknown as V)) return void b.mulai('');
          pilih(dec(v as V | null));
        }}
        disabled={props.disabled}
        name={adaKosong ? undefined : props.name}
        required={props.required}
      >
        <BaseSelect.Trigger ref={pemicu} className={cn('u-select-trigger', className)} data-size={size} id={props.id} aria-label={props['aria-label']} aria-busy={memuat || undefined}>
          <BaseSelect.Value className="u-select-value" placeholder={placeholderAkhir} />
          {lencana ? <span className="u-select-lencana">{lencana}</span> : null}
          <BaseSelect.Icon className="u-select-icon">{memuat ? <Spinner size="sm" /> : <ChevronsUpDown />}</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner className="u-popup-positioner" sideOffset={6} alignItemWithTrigger={false} collisionPadding={8}>
            <BaseSelect.Popup className="u-listbox">
              {memuat ? (
                <div className="u-listbox-status" role="status">
                  <Spinner size="sm" /> Memuat…
                </div>
              ) : galat ? (
                <div className="u-listbox-status" role="alert">
                  {galat === true ? 'Data tidak bisa dimuat. Coba lagi.' : (galat as React.ReactNode)}
                </div>
              ) : kosong ? (
                <div className="u-listbox-empty" role="status">
                  {buat ? teksKosongPilihan(buat) : 'Belum ada pilihan.'}
                  {pengelola && <span className="u-listbox-pengelola">{pengelola}</span>}
                </div>
              ) : null}
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
              {tampilBuat && buat && (
                <BaseSelect.Item value={BUAT as unknown as V} className="u-listbox-tambah" data-menonjol={kosong ? '' : undefined} data-buat="">
                  <Plus aria-hidden />
                  <span>{labelBuatPilihan(buat, '')}</span>
                </BaseSelect.Item>
              )}
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
        {adaKosong && props.name && <input type="hidden" name={props.name} value={nilai == null ? '' : String(nilai)} disabled={props.disabled} />}
      </BaseSelect.Root>
      {b.elemen}
    </>
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
   * Pola pilihan kosong (lihat {@link BuatPilihan}): tombol buat di akhir daftar (atau hanya saat hasil kosong bila
   * `hanyaKosong`) bagi yang berhak, membuka panel samping (`panel`) atau langsung menyimpan (`onBuat`); data baru
   * langsung terpilih dan fokus kembali ke isian. Yang tidak berhak melihat unit pengelola saat daftar kosong.
   */
  buat?: BuatPilihan<T>;
  /**
   * @deprecated Pakai `buat` (`{ boleh: true, onBuat, label, hanyaKosong }`). Tetap berfungsi: diubah ke `buat`.
   */
  tambah?: TambahCombobox<T>;
}

/** Bentuk lama `Combobox.tambah`; sama dengan `buat` berhak dengan `onBuat`. */
export interface TambahCombobox<T> {
  onTambah: (kata: string) => T | null | void | Promise<T | null | void>;
  label?: (kata: string) => React.ReactNode;
  hanyaKosong?: boolean;
}

/** Ubah `tambah` (bentuk lama) ke `buat`. */
export function buatDariTambah<T>(tambah: TambahCombobox<T> | undefined): BuatPilihan<T> | undefined {
  if (!tambah) return undefined;
  return {
    boleh: true,
    onBuat: tambah.onTambah,
    hanyaKosong: tambah.hanyaKosong,
    label: (k: string) => (tambah.label ? tambah.label(k) : k ? <>Tambah “{k}”</> : 'Tambah data baru'),
  };
}

/** Butir penanda "buat baru" di daftar Combobox (bukan data). */
const BUTIR_BUAT = { __buat: true } as const;
const KUNCI_BUAT = '\u0000buat';

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
  buat: buatProp,
  itemGroup,
  lencana,
  ...rest
}: ComboboxProps<T>) {
  const buat = buatProp ?? buatDariTambah(tambah);
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

  // ---- pola pilihan kosong: butir "buat baru" ikut daftar (bisa dipilih dengan keyboard), panel samping bersama.
  const isian = React.useRef<HTMLInputElement>(null);
  const saring = BaseCombobox.useFilter({ value: selected });
  // Kata yang benar-benar dicari (bukan label butir terpilih).
  const kata = selected && query === itemToString(selected) ? '' : query.trim();
  const adaHasil = loadItems ? listWithSelected.length > 0 : list.some((i) => !kata || saring.contains(i, kata, itemToString));
  const kosongTotal = !loading && !failed && !tooShort && !adaHasil && !kata;
  const tampilBuat = Boolean(buat?.boleh) && !tooShort && !failed && (!buat?.hanyaKosong || (!loading && !adaHasil));
  const abaikanInput = React.useRef(false);
  const b = useBuatPilihan<T>(buat, {
    fokusKe: isian,
    onDibuat: (baru) => {
      setInner(baru);
      setQuery(itemToString(baru));
      if (loadItems) setRemote((r) => [baru, ...r.filter((x) => itemKey(x) !== itemKey(baru))]);
      onValueChange?.(baru);
    },
  });
  const butirBuat = BUTIR_BUAT as unknown as T;
  const keyOf = (i: T) => (i === butirBuat ? KUNCI_BUAT : itemKey(i));
  const labelOf = (i: T) => (i === butirBuat ? '' : itemToString(i));

  const grouped = React.useMemo(() => {
    if (!itemGroup || loadItems) return null;
    const map = new Map<string, T[]>();
    for (const it of listWithSelected) {
      const g = itemGroup(it) ?? '';
      map.set(g, [...(map.get(g) ?? []), it]);
    }
    return [...map].map(([value, items]) => ({ value, items }));
  }, [itemGroup, loadItems, listWithSelected]);
  const daftarAkhir = tampilBuat
    ? grouped
      ? [...grouped, { value: KUNCI_BUAT, items: [butirBuat] }]
      : [...listWithSelected, butirBuat]
    : (grouped ?? listWithSelected);
  const renderEl = (item: T) =>
    item === butirBuat && buat ? (
      <BaseCombobox.Item key={KUNCI_BUAT} value={item} className="u-listbox-tambah" data-menonjol={kosongTotal ? '' : undefined} data-buat="">
        <Plus aria-hidden />
        <span>{labelBuatPilihan(buat, kata)}</span>
      </BaseCombobox.Item>
    ) : (
      <BaseCombobox.Item key={itemKey(item)} value={item} className="u-listbox-item">
        {renderItem ? renderItem(item) : itemToString(item)}
        <BaseCombobox.ItemIndicator className="u-listbox-item-indicator">
          <Check />
        </BaseCombobox.ItemIndicator>
      </BaseCombobox.Item>
    );
  const pengelola = !adaHasil && !loading && !failed && !tooShort ? teksPengelolaPilihan(buat) : null;

  return (
    <>
    <BaseCombobox.Root<T>
      items={daftarAkhir as T[]}
      filter={loadItems ? null : buat ? (i: T, q: string, f?: (i: T) => string) => i === butirBuat || saring.contains(i, q, f) : undefined}
      itemToStringLabel={labelOf}
      itemToStringValue={keyOf}
      isItemEqualToValue={(a, c) => keyOf(a) === keyOf(c)}
      value={selected}
      onValueChange={(v) => {
        if (v === butirBuat) {
          // Butir "buat baru" tidak pernah menjadi nilai: kembalikan teks isian, buka panel.
          abaikanInput.current = true;
          setTimeout(() => (abaikanInput.current = false), 0);
          setQuery(selectedLabel);
          void b.mulai(kata);
          return;
        }
        setInner(v as T | null);
        onValueChange?.(v as T | null);
      }}
      inputValue={query}
      onInputValueChange={(v) => {
        if (!abaikanInput.current) setQuery(v);
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      name={name}
    >
      <div className={cn('u-input-group', className)} data-size={size}>
        <span className="u-input-addon" data-align="start">
          {icon}
        </span>
        <BaseCombobox.Input ref={isian} placeholder={placeholder} id={id} aria-label={rest['aria-label']} />
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
            {buat ? (
              !loading && !failed && !tooShort && !adaHasil ? (
                <div className="u-listbox-empty" role="status">
                  {kata ? emptyText : teksKosongPilihan(buat, emptyText)}
                  {pengelola && <span className="u-listbox-pengelola">{pengelola}</span>}
                </div>
              ) : null
            ) : (
              !loading && !failed && !tooShort && <BaseCombobox.Empty className="u-listbox-empty">{emptyText}</BaseCombobox.Empty>
            )}
            <BaseCombobox.List>
              {grouped
                ? (g: { value: string; items: T[] }) => (
                    <BaseCombobox.Group key={g.value} items={g.items} className="u-listbox-group">
                      {g.value && g.value !== KUNCI_BUAT && <BaseCombobox.GroupLabel className="u-listbox-group-label">{g.value}</BaseCombobox.GroupLabel>}
                      <BaseCombobox.Collection>{(item: T) => renderEl(item)}</BaseCombobox.Collection>
                    </BaseCombobox.Group>
                  )
                : (item: T) => renderEl(item)}
            </BaseCombobox.List>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </BaseCombobox.Root>
    {b.elemen}
    </>
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
