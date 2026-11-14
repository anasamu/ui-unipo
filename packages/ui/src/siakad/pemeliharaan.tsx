'use client';
import * as React from 'react';
import { BannerPemeliharaan, ModePemeliharaan, type ModePemeliharaanProps } from '../components/pemeliharaan';
import { invalidateSiakad } from './provider';

export interface InfoPemeliharaan {
  /** Pesan dari server (body galat 503). */
  message?: string;
  /** Perkiraan selesai, dari header Retry-After atau body `until`/`selesai`. */
  until?: Date | null;
}

let sekarang: InfoPemeliharaan | null = null;
const pendengar = new Set<() => void>();

/** Tandai aplikasi sedang pemeliharaan (null = selesai). Dipanggil otomatis saat API membalas 503. */
export function laporPemeliharaan(info: InfoPemeliharaan | null) {
  sekarang = info;
  pendengar.forEach((l) => l());
}

/** Status pemeliharaan yang terdeteksi dari API. */
export function usePemeliharaan(): InfoPemeliharaan | null {
  return React.useSyncExternalStore(
    (l) => {
      pendengar.add(l);
      return () => void pendengar.delete(l);
    },
    () => sekarang,
    () => null,
  );
}

function selesaiDari(retryAfter: string | null, body: Record<string, unknown> | null): Date | null {
  const b = (body?.error as Record<string, unknown> | undefined) ?? body ?? {};
  const t = (b.until ?? b.selesai ?? (b.details as Record<string, unknown> | undefined)?.until) as string | undefined;
  if (t) {
    const d = new Date(String(t).replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (retryAfter) {
    const n = Number(retryAfter);
    if (!Number.isNaN(n)) return new Date(Date.now() + n * 1000);
    const d = new Date(retryAfter);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/**
 * Bungkus `fetch` untuk SDK agar balasan 503 dari API menyalakan mode pemeliharaan di seluruh aplikasi:
 *   new Siakad({ baseUrl, accessToken, fetch: fetchPemeliharaan() })
 */
export function fetchPemeliharaan(dasar: typeof fetch = (...a) => globalThis.fetch(...a)): typeof fetch {
  return async (input, init) => {
    const r = await dasar(input, init);
    if (r.status === 503) {
      let body: Record<string, unknown> | null = null;
      try {
        body = await r.clone().json();
      } catch {
        /* bukan JSON */
      }
      const pesan = ((body?.error as Record<string, unknown> | undefined)?.message ?? body?.message) as string | undefined;
      laporPemeliharaan({ message: pesan, until: selesaiDari(r.headers.get('retry-after'), body) });
    } else if (sekarang && r.ok) {
      laporPemeliharaan(null);
    }
    return r;
  };
}

export interface GerbangPemeliharaanProps extends Omit<ModePemeliharaanProps, 'until' | 'onRetry'> {
  children: React.ReactNode;
  /** Paksa mode pemeliharaan (mis. dari pengaturan aplikasi). */
  active?: boolean;
  /** Jadwal pemeliharaan: spanduk muncul sebelumnya, halaman pemeliharaan saat berjalan. */
  schedule?: { start: Date | string; end?: Date | string | null; message?: React.ReactNode };
  /** Periksa apakah layanan sudah pulih (bawaan: muat ulang data). */
  onRetry?: () => void | Promise<void>;
}

/**
 * Gerbang aplikasi: tampilkan halaman pemeliharaan saat `active`, saat jadwal berjalan, atau saat API membalas 503
 * (pasang {@link fetchPemeliharaan} di SDK). Spanduk muncul sebelum jadwal.
 */
export function GerbangPemeliharaan({ children, active, schedule, onRetry, message, ...rest }: GerbangPemeliharaanProps) {
  const dariApi = usePemeliharaan();
  const [kini, setKini] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!schedule) return;
    const t = setInterval(() => setKini(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [schedule]);
  const mulai = schedule ? new Date(String(schedule.start).replace(' ', 'T')).getTime() : 0;
  const akhir = schedule?.end ? new Date(String(schedule.end).replace(' ', 'T')).getTime() : Infinity;
  const terjadwal = Boolean(schedule && kini >= mulai && kini < akhir);
  if (active || terjadwal || dariApi) {
    return (
      <ModePemeliharaan
        {...rest}
        message={dariApi?.message ?? (terjadwal ? schedule?.message : undefined) ?? message}
        until={dariApi?.until ?? (schedule?.end ? schedule.end : null)}
        onRetry={async () => {
          laporPemeliharaan(null);
          invalidateSiakad('');
          await onRetry?.();
        }}
      />
    );
  }
  return (
    <>
      {schedule && <BannerPemeliharaan start={schedule.start} end={schedule.end} message={schedule.message} />}
      {children}
    </>
  );
}
