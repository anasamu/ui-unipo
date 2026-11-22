'use client';
import * as React from 'react';
import { cn, dataFlag } from '../lib/cn';

// ---------------------------------------------------------------- Tekan
// Satu komponen untuk permukaan yang bisa diklik: kartu, baris daftar, chip, petak, tautan berbentuk kartu.
// Menggantikan pola <div onClick> dan <button> polos bergaya sendiri. Selalu:
//   - elemen semantik: <button type="button"> (bawaan) atau <a href> (bila href diisi);
//   - Enter/Space mengaktifkan (bawaan peramban untuk <button>; ditambahkan untuk <a> dan elemen non-semantik);
//   - cincin fokus :focus-visible dari token (--u-ring);
//   - status nonaktif (disabled / aria-disabled) dan terpilih (aria-pressed / aria-checked / aria-selected) atau kini
//     (aria-current) sesuai peran.

export type BentukTekan = 'polos' | 'kartu' | 'baris' | 'chip';
/** Elemen yang dirender. `div`/`span`/`li` hanya untuk kasus berisi elemen interaktif lain atau widget komposit (role). */
export type ElemenTekan = 'button' | 'a' | 'div' | 'span' | 'li';
export type KiniTekan = boolean | 'page' | 'step' | 'location' | 'date' | 'time' | 'true';

type PropsDasar = Omit<React.HTMLAttributes<HTMLElement>, 'role'>;

export interface TekanProps extends PropsDasar {
  /** Gaya: `polos` (hanya reset + fokus; bawa className sendiri), `kartu`, `baris`, `chip`. Bawaan `polos`. */
  bentuk?: BentukTekan;
  /** Elemen. Bawaan `a` bila `href` diisi, selain itu `button`. */
  elemen?: ElemenTekan;
  /** Peran ARIA untuk elemen non-semantik di widget komposit (option, treeitem, checkbox, row, tab, …). */
  role?: React.AriaRole;
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
  /** Hanya untuk `button`. Bawaan `button` (tidak mengirim form). */
  type?: 'button' | 'submit' | 'reset';
  name?: string;
  value?: string | number;
  form?: string;
  disabled?: boolean;
  /** Status pilihan/toggle. Menjadi aria-pressed (tombol), aria-checked (checkbox/radio/switch), atau aria-selected (option/treeitem/row/tab/gridcell). */
  terpilih?: boolean;
  /** Butir yang sedang dibuka/aktif di navigasi (aria-current). `true` = aria-current="true". */
  kini?: KiniTekan;
  ref?: React.Ref<HTMLElement>;
}

const PERAN_DICENTANG = new Set(['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio']);
const PERAN_DIPILIH = new Set(['option', 'treeitem', 'row', 'gridcell', 'tab', 'columnheader', 'rowheader']);

/** Atribut ARIA untuk status terpilih, sesuai peran elemen. */
export function ariaTerpilih(peran: string, terpilih: boolean | undefined): Record<string, boolean | undefined> {
  if (terpilih === undefined) return {};
  if (PERAN_DICENTANG.has(peran)) return { 'aria-checked': terpilih };
  if (PERAN_DIPILIH.has(peran)) return { 'aria-selected': terpilih };
  if (peran === 'button') return { 'aria-pressed': terpilih };
  return {};
}

/** Kunci papan ketik yang mengaktifkan permukaan tekan. */
export const kunciTekan = (key: string) => key === 'Enter' || key === ' ' || key === 'Spacebar';

interface OpsiTekan {
  elemen: ElemenTekan;
  role?: React.AriaRole;
  disabled?: boolean;
  terpilih?: boolean;
  kini?: KiniTekan;
  tabIndex?: number;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: React.MouseEventHandler<HTMLElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
}

/**
 * Hitung atribut aksesibilitas + penangan papan ketik untuk permukaan tekan (murni, dapat diuji tanpa DOM).
 * Untuk elemen non-semantik dan `<a>`: Enter/Space memanggil `onClick` (sekali; Space tidak menggulir halaman).
 * Tombol yang ditekan di dalam isian/elemen anak tidak ikut diproses (hanya bila sasaran = elemen ini).
 */
export function propsTekan(o: OpsiTekan) {
  const asli = o.elemen === 'button';
  const tautan = o.elemen === 'a' && !!o.href && !o.disabled;
  const peran = o.role ?? (tautan ? 'link' : 'button');
  const kini = o.kini === true ? 'true' : o.kini || undefined;
  const props: Record<string, unknown> = {
    ...ariaTerpilih(peran, o.terpilih),
    'aria-current': kini,
    'data-terpilih': dataFlag(o.terpilih),
    'data-kini': dataFlag(!!kini),
    'data-disabled': dataFlag(o.disabled),
  };
  if (asli) {
    props.type = o.type ?? 'button';
    props.disabled = o.disabled || undefined;
    if (o.role) props.role = o.role;
    props.onClick = o.onClick;
    props.onKeyDown = o.onKeyDown;
    props.tabIndex = o.tabIndex;
    return props;
  }
  if (o.elemen === 'a') {
    // <a> tanpa href / nonaktif bukan tautan: tetap dapat difokus sebagai tombol bila punya onClick.
    if (tautan) props.href = o.href;
    else props.role = o.role ?? 'button';
    if (o.role && tautan) props.role = o.role;
  } else props.role = peran;
  props['aria-disabled'] = o.disabled || undefined;
  props.tabIndex = o.disabled ? -1 : (o.tabIndex ?? 0);
  props.onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (o.disabled) {
      e.preventDefault();
      return;
    }
    o.onClick?.(e);
  };
  props.onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    o.onKeyDown?.(e);
    if (e.defaultPrevented || o.disabled || e.target !== e.currentTarget) return;
    // Enter pada tautan asli sudah ditangani peramban (navigasi + klik).
    if (e.key === 'Enter' && tautan) return;
    if (!kunciTekan(e.key)) return;
    e.preventDefault();
    // Klik sintetis lewat DOM: melewati penangan onClick di atas (termasuk cek nonaktif) dan pendengar lain.
    (e.currentTarget as HTMLElement).click();
  };
  return props;
}

/**
 * Permukaan yang bisa ditekan (kartu, baris, chip). Merender `<button type="button">` atau `<a href>`,
 * dengan cincin fokus token, Enter/Space, dan status nonaktif/terpilih/kini.
 *
 * ```tsx
 * <Tekan bentuk="kartu" onClick={() => buka(m)}>…</Tekan>
 * <Tekan bentuk="chip" terpilih={aktif} onClick={() => setAktif(!aktif)}>Semester 3</Tekan>
 * <Tekan bentuk="baris" href={`/kelas/${k.id}`} kini={k.id === sekarang ? 'page' : undefined}>…</Tekan>
 * ```
 */
export function Tekan({ bentuk = 'polos', elemen, role, href, target, rel, download, type, name, value, form, disabled, terpilih, kini, className, onClick, onKeyDown, tabIndex, ref, ...props }: TekanProps) {
  const el: ElemenTekan = elemen ?? (href ? 'a' : 'button');
  const a11y = propsTekan({ elemen: el, role, disabled, terpilih, kini, tabIndex, href, type, onClick, onKeyDown });
  const ekstra: Record<string, unknown> =
    el === 'a' ? { target, rel: rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined), download } : el === 'button' ? { name, value, form } : {};
  // Nilai undefined dari propsTekan tidak boleh menimpa atribut yang diberikan pemanggil (mis. data-terpilih sendiri).
  const tetap = Object.fromEntries(Object.entries({ ...ekstra, ...a11y }).filter(([, v]) => v !== undefined));
  return React.createElement(el, {
    ...props,
    ...tetap,
    ref,
    className: cn('u-tekan', className),
    'data-bentuk': bentuk,
  });
}
