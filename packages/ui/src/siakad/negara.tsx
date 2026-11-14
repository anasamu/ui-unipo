'use client';
import * as React from 'react';
import { countries } from 'country-flag-icons';
import { cn } from '../lib/cn';

let flagUrl = (code: string) => `https://purecatamphetamine.github.io/country-flag-icons/3x2/${code}.svg`;

/**
 * Atur sumber gambar bendera (SVG 3:2). Bawaan: CDN country-flag-icons.
 * Untuk aplikasi tanpa internet luar, salin `node_modules/country-flag-icons/3x2/*.svg` ke folder publik:
 *   configureFlags((kode) => `/bendera/${kode}.svg`)
 */
export function configureFlags(fn: (code: string) => string) {
  flagUrl = fn;
}

export interface Negara {
  /** ISO 3166-1 alpha-2, mis. "ID". */
  kode: string;
  /** Nama dalam bahasa Indonesia, mis. "Indonesia", "Malaysia", "Arab Saudi". */
  nama: string;
}

let cached: Negara[] | null = null;
/** Daftar negara (ISO 3166-1) dengan nama Indonesia dari Intl.DisplayNames; Indonesia di urutan pertama. */
export function daftarNegara(): Negara[] {
  if (cached) return cached;
  const dn = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['id'], { type: 'region' }) : null;
  const list = countries
    .filter((c) => c.length === 2 && !['AC', 'TA', 'XK', 'EU'].includes(c))
    .map((kode) => ({ kode, nama: dn?.of(kode) ?? kode }))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  const id = list.findIndex((n) => n.kode === 'ID');
  if (id > 0) list.unshift(...list.splice(id, 1));
  return (cached = list);
}

/** Gambar bendera negara (rasio 3:2). */
export function Bendera({ kode, size = 20, className, title }: { kode: string; size?: number; className?: string; title?: string }) {
  const [gagal, setGagal] = React.useState(false);
  const h = Math.round((size * 2) / 3);
  if (gagal || !kode) return <span className={cn('u-flag', className)} style={{ width: size, height: h }} aria-hidden />;
  return <img className={cn('u-flag', className)} src={flagUrl(kode.toUpperCase())} width={size} height={h} alt={title ?? ''} loading="lazy" onError={() => setGagal(true)} />;
}
