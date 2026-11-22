'use client';
import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './actions';
import { Input } from './forms';

const HEX = /^#[0-9a-f]{6}$/i;

export interface IsianWarnaHexProps {
  /** Kode warna `#RRGGBB`; '' = kosong (mengikuti tema bila `otomatis` diisi). */
  value: string;
  onValueChange: (hex: string) => void;
  /** Warna yang dibuka pemilih saat nilai kosong/tidak sah. */
  bawaan?: string;
  /** Contoh warna cepat (tombol bulat). */
  cepat?: string[];
  /** Label tombol "kosongkan" (mis. "Ikuti tema", "Otomatis"); tanpa ini tombol tidak tampil. */
  otomatis?: React.ReactNode;
  /** Sembunyikan isian kode (hanya contoh + pemilih bebas). */
  tanpaKode?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Isian warna bebas `#RRGGBB` untuk identitas visual (logo kwitansi, warna aksen prodi, latar halaman masuk):
 * kotak contoh yang membuka pemilih warna perangkat, kode hex yang bisa diketik/ditempel, dan warna cepat.
 * Untuk warna komponen yang mengikuti tema, pakai `PilihWarna` (token).
 */
export function IsianWarnaHex({ value, onValueChange, bawaan = '#244ce6', cepat, otomatis, tanpaKode, disabled, id, 'aria-label': ariaLabel = 'Warna', className }: IsianWarnaHexProps) {
  const sah = HEX.test(value);
  const idPemilih = React.useId();
  return (
    <div className={cn('u-warna-hex', className)} role="group" aria-label={ariaLabel}>
      <label className="u-warna-hex-contoh" htmlFor={idPemilih} data-kosong={!sah || undefined} style={sah ? { background: value } : undefined} title="Pilih warna bebas">
        <input id={idPemilih} type="color" className="u-sr-only" value={sah ? value : bawaan} disabled={disabled} onChange={(e) => onValueChange(e.target.value)} aria-label={`${ariaLabel}: pilih warna bebas`} />
      </label>
      {!tanpaKode && (
        <Input id={id} className="u-warna-hex-kode" size="sm" value={value} maxLength={7} placeholder={bawaan.toUpperCase()} disabled={disabled} aria-label={`${ariaLabel}: kode warna`} onChange={(e) => onValueChange((e.target as HTMLInputElement).value.trim())} />
      )}
      {cepat?.length ? (
        <span className="u-warna-hex-cepat">
          {cepat.map((w) => (
            <Button key={w} variant="ghost" size="xs" iconOnly className="u-warna-hex-butir" style={{ background: w }} aria-label={`Warna ${w}`} aria-pressed={value.toLowerCase() === w.toLowerCase()} disabled={disabled} onClick={() => onValueChange(w)}>
              {value.toLowerCase() === w.toLowerCase() ? <Check /> : null}
            </Button>
          ))}
        </span>
      ) : null}
      {otomatis && (
        <Button variant={value ? 'ghost' : 'soft'} size="sm" aria-pressed={!value} disabled={disabled} onClick={() => onValueChange('')}>
          {otomatis}
        </Button>
      )}
    </div>
  );
}
