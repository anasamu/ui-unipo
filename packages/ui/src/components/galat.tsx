'use client';
import * as React from 'react';
import { Bug } from 'lucide-react';
import { cn } from '../lib/cn';
import { CopyButton } from './code';

/**
 * Ambil ID permintaan (request_id) dari galat API: `requestId` di SiakadError (unipo-siakad-sdk),
 * `request_id` di jawaban JSON, atau `details.request_id`. Kosong bila tidak ada.
 */
export function requestIdDari(e: unknown): string | null {
  if (!e || typeof e !== 'object') return null;
  const g = e as { requestId?: unknown; request_id?: unknown; details?: { request_id?: unknown }; body?: { request_id?: unknown }; cause?: unknown };
  const id = g.requestId ?? g.request_id ?? g.details?.request_id ?? g.body?.request_id;
  if (typeof id === 'string' && id) return id;
  return g.cause && g.cause !== e ? requestIdDari(g.cause) : null;
}

// ---------------------------------------------------------------- Laporkan galat (buat tiket bug ke Pustikom)

/** Data galat yang dibawa ke panel lapor. Hanya ringkasan: tidak pernah token atau isi permintaan. */
export interface InfoGalat {
  requestId: string;
  /** Kode HTTP (SiakadError.status). */
  status?: number | null;
  /** Kode galat API, mis. server_error. */
  kode?: string | null;
  /** Pesan galat yang dilihat pengguna. */
  pesan?: string | null;
  /** Waktu galat (ISO). Bawaan: saat tombol diklik. */
  waktu?: string;
}

/** Bentuk info galat dari objek galat API (SiakadError, jawaban JSON). null bila tidak ada request_id. */
export function infoGalatDari(e: unknown, id?: string | null): InfoGalat | null {
  const requestId = id ?? requestIdDari(e);
  if (!requestId) return null;
  const g = (e && typeof e === 'object' ? e : {}) as { status?: unknown; code?: unknown; message?: unknown; body?: { error?: { code?: unknown; message?: unknown } } };
  const teks = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 500) : null);
  return {
    requestId,
    status: typeof g.status === 'number' && g.status > 0 ? g.status : null,
    kode: teks(g.code) ?? teks(g.body?.error?.code),
    pesan: teks(g.message) ?? teks(g.body?.error?.message),
  };
}

type PelaporGalat = (info: InfoGalat) => void;
// Tumpukan penangan: <UnipoProvider> bersarang (mis. publik di luar, pengguna di dalam) memakai yang terdalam.
const tumpukanPelapor: PelaporGalat[] = [];
let pelaporAktif: PelaporGalat | null = null;
const pendengarPelapor = new Set<() => void>();
const segarkanPelapor = () => {
  pelaporAktif = tumpukanPelapor[tumpukanPelapor.length - 1] ?? null;
  pendengarPelapor.forEach((l) => l());
};

/**
 * Pasang penangan tombol "Buat tiket" pada kode laporan (dipasang otomatis oleh <UnipoProvider siakad> lewat
 * <LaporGalat />). Mengembalikan fungsi pelepas. Tanpa penangan, tombol Buat tiket tidak tampil.
 */
export function pasangPelaporGalat(fn: PelaporGalat): () => void {
  tumpukanPelapor.push(fn);
  segarkanPelapor();
  return () => {
    const i = tumpukanPelapor.lastIndexOf(fn);
    if (i >= 0) tumpukanPelapor.splice(i, 1);
    segarkanPelapor();
  };
}

/** Penangan lapor galat yang sedang terpasang, atau null. */
export function usePelaporGalat(): PelaporGalat | null {
  return React.useSyncExternalStore(
    (l) => {
      pendengarPelapor.add(l);
      return () => void pendengarPelapor.delete(l);
    },
    () => pelaporAktif,
    () => null,
  );
}

/** Buka panel lapor galat dari kode sendiri (mis. tombol khusus). Tidak melakukan apa pun bila belum terpasang. */
export function laporkanGalat(info: InfoGalat) {
  pelaporAktif?.({ waktu: new Date().toISOString(), ...info });
}

/** Tombol kecil "Buat tiket" untuk satu kode laporan. Tidak tampil bila penangan lapor belum terpasang. */
export function TombolLaporGalat({ info, className, label = 'Buat tiket' }: { info: InfoGalat | null; className?: string; label?: string }) {
  const lapor = usePelaporGalat();
  if (!lapor || !info) return null;
  return (
    <button
      type="button"
      className={cn('u-kode-laporan-lapor', className)}
      onClick={(e) => {
        e.stopPropagation();
        lapor({ waktu: new Date().toISOString(), ...info });
      }}
      title="Buat tiket laporan bug ke Pustikom dengan kode ini"
    >
      <Bug aria-hidden />
      {label}
    </button>
  );
}

/**
 * Baris "Kode laporan: abc123 [salin] [Buat tiket]" untuk ditaruh di bawah pesan galat. Tidak tampil apa pun bila
 * galat tidak membawa request_id. Pengguna bisa menyalin kode ini, atau langsung membuat tiket bug ke Pustikom
 * (tombol Buat tiket, muncul bila aplikasi memakai <UnipoProvider siakad>).
 */
export function KodeLaporan({ error, id, className }: { error?: unknown; /** Isi langsung bila sudah tahu ID-nya. */ id?: string | null; className?: string }) {
  const kode = id ?? requestIdDari(error);
  if (!kode) return null;
  return (
    <span className={cn('u-kode-laporan', className)}>
      <span>Kode laporan</span>
      <span className="u-kode-laporan-nilai">
        <code>{kode}</code>
        <CopyButton text={kode} label="Salin kode laporan" />
      </span>
      <TombolLaporGalat info={infoGalatDari(error, kode)} />
    </span>
  );
}
