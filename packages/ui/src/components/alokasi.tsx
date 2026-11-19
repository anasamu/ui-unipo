'use client';
import * as React from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { Slider } from './forms';
import { chartColor } from './charts';

/**
 * Komponen alokasi generik (mis. kuota penyimpanan, anggaran):
 *   - SliderNilai   : slider + isian angka presisi + satuan (MB/GB) dengan langkah yang menyesuaikan skala.
 *   - BatangAlokasi : bar tumpuk alokasi per bagian terhadap batas (kolam), garis batas, sisa, dan warna peringatan
 *                     saat melebihi; ikut berubah langsung saat slider digeser.
 *   - MeterKuota    : bar pemakaian terhadap kuota (hijau, kuning ≥80%, merah ≥90%, penuh).
 * Semua aksesibel (keyboard dan aria lewat Base UI Slider), mendukung mode gelap, dan bisa disentuh di ponsel.
 */

export type SatuanByte = 'MB' | 'GB';
const KALI: Record<SatuanByte, number> = { MB: 1048576, GB: 1073741824 };

/** Langkah slider (byte) menurut batas atas: 10 MB, 100 MB, 512 MB, atau 1 GB. */
export function langkahByte(maks: number): number {
  if (maks <= 2 * KALI.GB) return 10 * KALI.MB;
  if (maks <= 20 * KALI.GB) return 100 * KALI.MB;
  if (maks <= 200 * KALI.GB) return 512 * KALI.MB;
  return KALI.GB;
}

export interface SliderNilaiProps {
  label: React.ReactNode;
  /** Nilai dalam byte. */
  value: number;
  onValueChange: (byte: number) => void;
  /** Batas atas slider (byte). Isian angka boleh melebihi. */
  max: number;
  min?: number;
  /** Langkah slider (byte); bawaan menurut skala `max`. */
  step?: number;
  /** Label kecil di samping nilai, mis. "per orang" atau "total". */
  keterangan?: React.ReactNode;
  /** Perkiraan di bawah slider, mis. "× 122 anggota = 244 GB". */
  perkiraan?: React.ReactNode;
  /** Warna penanda (mis. warna bagian di BatangAlokasi). */
  warna?: string;
  /** Kunci nilai (tidak ikut disesuaikan mode proporsional). */
  terkunci?: boolean;
  onTerkunciChange?: (v: boolean) => void;
  disabled?: boolean;
  /** Isi tambahan di kanan judul (mis. pilihan per orang/total). */
  aksi?: React.ReactNode;
  className?: string;
}

/** Slider nilai byte dengan isian angka + satuan untuk nilai presisi. */
export function SliderNilai({ label, value, onValueChange, max, min = 0, step, keterangan, perkiraan, warna, terkunci, onTerkunciChange, disabled, aksi, className }: SliderNilaiProps) {
  const id = React.useId();
  const [satuan, setSatuan] = React.useState<SatuanByte>(() => (Math.max(value, max) >= 2 * KALI.GB ? 'GB' : 'MB'));
  const langkah = step ?? langkahByte(max);
  const angka = Math.round((value / KALI[satuan]) * 100) / 100;
  const [teks, setTeks] = React.useState(String(angka).replace('.', ','));
  const fokus = React.useRef(false);
  React.useEffect(() => {
    if (!fokus.current) setTeks(String(angka).replace('.', ','));
  }, [angka]);
  const atasSlider = Math.max(max, value);
  const terapkanTeks = (t: string) => {
    const n = Number(t.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) onValueChange(Math.max(min, Math.round(n * KALI[satuan])));
  };
  return (
    <div className={cn('u-slider-nilai', className)} data-disabled={disabled ? '' : undefined}>
      <div className="u-slider-nilai-kepala">
        <label htmlFor={`${id}-angka`} className="u-slider-nilai-label">
          {warna && <i style={{ background: warna }} aria-hidden />}
          {label}
        </label>
        {aksi}
        {onTerkunciChange && (
          <button
            type="button"
            className="u-slider-nilai-kunci"
            aria-pressed={terkunci ? 'true' : 'false'}
            aria-label={terkunci ? 'Buka kunci nilai' : 'Kunci nilai'}
            title={terkunci ? 'Terkunci: tidak ikut disesuaikan' : 'Kunci nilai ini'}
            onClick={() => onTerkunciChange(!terkunci)}
            disabled={disabled}
          >
            {terkunci ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
          </button>
        )}
      </div>
      <div className="u-slider-nilai-baris">
        <Slider
          min={min}
          max={atasSlider}
          step={langkah}
          value={Math.min(value, atasSlider)}
          disabled={disabled || terkunci}
          onValueChange={(v) => onValueChange(Array.isArray(v) ? (v[0] ?? 0) : (v as number))}
          aria-label={typeof label === 'string' ? label : undefined}
          style={warna ? ({ '--u-slider-warna': warna } as React.CSSProperties) : undefined}
          className="u-slider-nilai-slider"
        />
        <div className="u-slider-nilai-isian">
          <input
            id={`${id}-angka`}
            inputMode="decimal"
            value={teks}
            disabled={disabled || terkunci}
            onFocus={() => (fokus.current = true)}
            onBlur={() => {
              fokus.current = false;
              terapkanTeks(teks);
            }}
            onChange={(e) => setTeks(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') terapkanTeks(teks);
            }}
            aria-describedby={keterangan ? `${id}-ket` : undefined}
          />
          <select aria-label="Satuan" value={satuan} disabled={disabled} onChange={(e) => setSatuan(e.target.value as SatuanByte)}>
            <option value="MB">MB</option>
            <option value="GB">GB</option>
          </select>
        </div>
        {keterangan && (
          <span id={`${id}-ket`} className="u-slider-nilai-ket">
            {keterangan}
          </span>
        )}
      </div>
      {perkiraan && <p className="u-slider-nilai-perkiraan">{perkiraan}</p>}
    </div>
  );
}

export interface BagianAlokasi {
  kunci: string;
  label: React.ReactNode;
  /** Byte teralokasi. */
  nilai: number;
  warna?: string;
  /** Pemakaian nyata bagian ini (garis tipis di dalam bagian). */
  terpakai?: number;
}

export interface BatangAlokasiProps {
  bagian: BagianAlokasi[];
  /** Batas (kolam). null = tanpa batas. */
  batas: number | null;
  /** Pemakaian nyata seluruhnya (penanda). */
  terpakai?: number;
  format?: (n: number) => string;
  /** Label ringkas, mis. "Kolam FIK". */
  judul?: React.ReactNode;
  /** Melebihi batas diperbolehkan (overcommit): warna peringatan, bukan galat. */
  bolehLebih?: boolean;
  className?: string;
}

/** Bar tumpuk alokasi terhadap batas: bagian berwarna, sisa, garis batas, dan bagian yang melebihi. */
export function BatangAlokasi({ bagian, batas, terpakai, format = formatBytes, judul, bolehLebih, className }: BatangAlokasiProps) {
  const total = bagian.reduce((a, b) => a + Math.max(0, b.nilai), 0);
  const skala = Math.max(1, batas ?? 0, total, terpakai ?? 0);
  const lebih = batas !== null && total > batas;
  const sisa = batas === null ? null : Math.max(0, batas - total);
  const persen = (n: number) => `${(n / skala) * 100}%`;
  const ringkas =
    batas === null
      ? `Teralokasi ${format(total)}`
      : lebih
        ? `Teralokasi ${format(total)} dari ${format(batas)}, lebih ${format(total - batas)}`
        : `Teralokasi ${format(total)} dari ${format(batas)}, sisa ${format(sisa ?? 0)}`;
  return (
    <div className={cn('u-alokasi', className)} data-lebih={lebih ? (bolehLebih ? 'peringatan' : 'galat') : undefined}>
      <div className="u-alokasi-kepala">
        {judul && <span className="u-alokasi-judul">{judul}</span>}
        <b aria-live="polite">{ringkas}</b>
      </div>
      <div className="u-alokasi-trek" role="img" aria-label={ringkas}>
        {bagian.map((b, i) =>
          b.nilai > 0 ? (
            <span key={b.kunci} className="u-alokasi-bagian" style={{ width: persen(b.nilai), background: b.warna ?? chartColor(i) }} title={`${typeof b.label === 'string' ? b.label : ''} ${format(b.nilai)}`}>
              {b.terpakai !== undefined && b.terpakai > 0 && <i className="u-alokasi-pakai" style={{ width: `${Math.min(100, (b.terpakai / Math.max(1, b.nilai)) * 100)}%` }} />}
            </span>
          ) : null,
        )}
        {sisa !== null && sisa > 0 && <span className="u-alokasi-sisa" style={{ width: persen(sisa) }} />}
        {batas !== null && <span className="u-alokasi-batas" style={{ left: persen(batas) }} aria-hidden />}
        {terpakai !== undefined && <span className="u-alokasi-terpakai" style={{ left: persen(Math.min(terpakai, skala)) }} aria-hidden title={`Terpakai nyata ${format(terpakai)}`} />}
      </div>
      <ul className="u-alokasi-legenda">
        {bagian.map((b, i) => (
          <li key={b.kunci}>
            <i style={{ background: b.warna ?? chartColor(i) }} aria-hidden />
            <span>{b.label}</span>
            <b>{format(b.nilai)}</b>
            {b.terpakai !== undefined && <small>terpakai {format(b.terpakai)}</small>}
          </li>
        ))}
        {sisa !== null && (
          <li>
            <i className="u-alokasi-i-sisa" aria-hidden />
            <span>Belum dibagi</span>
            <b>{format(sisa)}</b>
          </li>
        )}
        {terpakai !== undefined && (
          <li>
            <i className="u-alokasi-i-pakai" aria-hidden />
            <span>Terpakai nyata</span>
            <b>{format(terpakai)}</b>
          </li>
        )}
      </ul>
    </div>
  );
}

export interface MeterKuotaProps {
  terpakai: number;
  /** Kuota; null = tanpa batas. */
  kuota: number | null;
  label?: React.ReactNode;
  keterangan?: React.ReactNode;
  format?: (n: number) => string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Nada bar menurut persen: aman (<80), hampir (≥80), kritis (≥90), penuh (≥100). */
export function nadaKuota(persen: number | null): 'aman' | 'hampir' | 'kritis' | 'penuh' {
  if (persen === null) return 'aman';
  if (persen >= 100) return 'penuh';
  if (persen >= 90) return 'kritis';
  if (persen >= 80) return 'hampir';
  return 'aman';
}

/** Bar pemakaian terhadap kuota dengan warna hijau/kuning/merah. */
export function MeterKuota({ terpakai, kuota, label, keterangan, format = formatBytes, size = 'md', className }: MeterKuotaProps) {
  const persen = kuota ? (terpakai / kuota) * 100 : null;
  const nada = nadaKuota(persen);
  const teks = kuota === null ? `${format(terpakai)} terpakai (tanpa batas)` : `${format(terpakai)} dari ${format(kuota)}`;
  return (
    <div className={cn('u-meter-kuota', className)} data-nada={nada} data-size={size}>
      {(label || persen !== null) && (
        <div className="u-meter-kuota-kepala">
          {label && <span>{label}</span>}
          {persen !== null && <b>{nada === 'penuh' ? 'Penuh' : `${persen.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`}</b>}
        </div>
      )}
      <div
        className="u-meter-kuota-trek"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={kuota ?? undefined}
        aria-valuenow={terpakai}
        aria-valuetext={teks}
        aria-label={typeof label === 'string' ? label : 'Pemakaian penyimpanan'}
      >
        <span style={{ width: `${Math.min(100, persen ?? (terpakai > 0 ? 4 : 0))}%` }} />
      </div>
      <div className="u-meter-kuota-kaki">
        <span>{teks}</span>
        {kuota !== null && <span>sisa {format(Math.max(0, kuota - terpakai))}</span>}
      </div>
      {keterangan && <p className="u-meter-kuota-ket">{keterangan}</p>}
    </div>
  );
}
