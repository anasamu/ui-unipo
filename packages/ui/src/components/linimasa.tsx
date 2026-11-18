'use client';
import * as React from 'react';
import { Check, CircleDashed, CircleHelp, X } from 'lucide-react';
import { cn } from '../lib/cn';

// ================================================================ Linimasa riwayat
export interface LinimasaItem {
  id: React.Key;
  /** Judul baris, mis. "Lektor" atau "III/b - Penata Muda Tingkat I". */
  judul: React.ReactNode;
  /** Tanggal mulai berlaku (TMT) atau rentang, tampil di kolom kiri / di atas judul pada layar sempit. */
  tanggal?: React.ReactNode;
  /** Baris kecil di bawah judul (nomor SK, unit, penetap). */
  keterangan?: React.ReactNode;
  /** Lencana di kanan judul (mis. "Saat ini", "Plt"). */
  lencana?: React.ReactNode;
  /** Tautan/tombol di bawah keterangan (mis. unduh SK). */
  aksi?: React.ReactNode;
  /** Penanda titik: `aktif` (posisi sekarang, berwarna), `lalu` (riwayat), `datang` (akan berlaku). */
  status?: 'aktif' | 'lalu' | 'datang';
  ikon?: React.ReactNode;
}

/**
 * Linimasa riwayat vertikal (jabatan, pangkat, penugasan): titik dan garis di kiri, tanggal di atas judul, posisi
 * sekarang ditandai berwarna. Urutan mengikuti `items` (biasanya terbaru di atas). `kosong` tampil bila tanpa item.
 */
export function Linimasa({ items, kosong, className, 'aria-label': label }: { items: LinimasaItem[]; kosong?: React.ReactNode; className?: string; 'aria-label'?: string }) {
  if (!items.length) return <>{kosong ?? null}</>;
  return (
    <ol className={cn('u-linimasa', className)} aria-label={label}>
      {items.map((it) => (
        <li key={it.id} className="u-linimasa-item" data-status={it.status ?? 'lalu'}>
          <span className="u-linimasa-titik" aria-hidden>
            {it.ikon ?? null}
          </span>
          <div className="u-linimasa-isi">
            {it.tanggal ? <p className="u-linimasa-tanggal">{it.tanggal}</p> : null}
            <p className="u-linimasa-judul">
              <span>{it.judul}</span>
              {it.lencana}
            </p>
            {it.keterangan ? <p className="u-linimasa-ket">{it.keterangan}</p> : null}
            {it.aksi ? <div className="u-linimasa-aksi">{it.aksi}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ================================================================ Daftar syarat
export interface ButirSyarat {
  id?: React.Key;
  judul: React.ReactNode;
  /** true = terpenuhi, false = belum terpenuhi, null = belum bisa dicek otomatis (diperiksa manual). */
  terpenuhi: boolean | null;
  keterangan?: React.ReactNode;
}

const TEKS_SYARAT = { ya: 'Terpenuhi', tidak: 'Belum terpenuhi', cek: 'Diperiksa manual' };

/**
 * Daftar periksa syarat dengan tanda terpenuhi (centang hijau), belum (silang merah), atau diperiksa manual (tanda
 * tanya). `ringkas` = tanpa keterangan, untuk kartu kecil. Status juga dibacakan pembaca layar.
 */
export function DaftarSyarat({ items, ringkas, className }: { items: ButirSyarat[]; ringkas?: boolean; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn('u-daftar-syarat', className)} data-ringkas={ringkas ? '' : undefined}>
      {items.map((s, i) => {
        const st = s.terpenuhi === true ? 'ya' : s.terpenuhi === false ? 'tidak' : 'cek';
        return (
          <li key={s.id ?? i} data-status={st}>
            <span className="u-daftar-syarat-tanda" aria-hidden>
              {st === 'ya' ? <Check /> : st === 'tidak' ? <X /> : <CircleHelp />}
            </span>
            <span className="u-daftar-syarat-teks">
              <span className="u-daftar-syarat-judul">
                {s.judul}
                <span className="u-sr-only"> ({TEKS_SYARAT[st]})</span>
              </span>
              {!ringkas && s.keterangan ? <span className="u-daftar-syarat-ket">{s.keterangan}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Ringkasan jumlah syarat: { ya, tidak, cek }. */
export function hitungSyarat(items: Pick<ButirSyarat, 'terpenuhi'>[]): { ya: number; tidak: number; cek: number } {
  return items.reduce((a, s) => (s.terpenuhi === true ? { ...a, ya: a.ya + 1 } : s.terpenuhi === false ? { ...a, tidak: a.tidak + 1 } : { ...a, cek: a.cek + 1 }), { ya: 0, tidak: 0, cek: 0 });
}

// ================================================================ Jalur jenjang
export interface JenjangItem {
  id: React.Key;
  /** Singkatan pendek di penanda, mis. "AA". */
  kode: React.ReactNode;
  nama: React.ReactNode;
}

/**
 * Jalur jenjang mendatar (mis. Asisten Ahli → Lektor → Lektor Kepala → Profesor): jenjang yang sudah dilalui, posisi
 * sekarang, dan sasaran berikutnya ditandai. `saatIni`/`sasaran` = indeks (−1/null = belum ada).
 */
export function JalurJenjang({ jenjang, saatIni, sasaran, className, 'aria-label': label = 'Jalur jenjang' }: { jenjang: JenjangItem[]; saatIni: number; sasaran?: number | null; className?: string; 'aria-label'?: string }) {
  return (
    <ol className={cn('u-jalur-jenjang', className)} aria-label={label}>
      {jenjang.map((j, i) => {
        const st = i < saatIni ? 'lalu' : i === saatIni ? 'aktif' : i === sasaran ? 'sasaran' : 'datang';
        return (
          <li key={j.id} data-status={st} aria-current={st === 'aktif' ? 'step' : undefined}>
            <span className="u-jalur-jenjang-tanda" aria-hidden>
              {st === 'lalu' ? <Check /> : st === 'sasaran' ? <CircleDashed /> : j.kode}
            </span>
            <span className="u-jalur-jenjang-nama">
              {j.nama}
              {st === 'aktif' ? <span className="u-sr-only"> (saat ini)</span> : st === 'sasaran' ? <span className="u-sr-only"> (berikutnya)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
