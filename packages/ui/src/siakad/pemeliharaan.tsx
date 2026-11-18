'use client';
import * as React from 'react';
import { laporPeriodeDitutup, type GalatPeriodeDitutup } from './kunci-periode';
import { BannerPemeliharaan, ModePemeliharaan, type ModePemeliharaanProps } from '../components/pemeliharaan';
import { Wrench } from 'lucide-react';
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
  const t = (b.until ?? b.selesai ?? (b.details as Record<string, unknown> | undefined)?.until ?? (body?.pemeliharaan as Record<string, unknown> | undefined)?.sampai) as string | undefined;
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
    } else if (r.status === 423) {
      // Kunci periode akademik: toast global (PemberitahuanPeriodeDitutup di UnipoProvider).
      try {
        const body = (await r.clone().json()) as { error?: { message?: string; details?: GalatPeriodeDitutup['details'] } };
        laporPeriodeDitutup({ message: body.error?.message ?? 'Periode sudah ditutup. Perubahan data periode ini tidak diizinkan.', details: body.error?.details });
      } catch {
        laporPeriodeDitutup({ message: 'Periode sudah ditutup. Perubahan data periode ini tidak diizinkan.' });
      }
    } else if (sekarang && r.ok) {
      laporPemeliharaan(null);
    }
    return r;
  };
}

/** Jawaban `GET /bff/pemeliharaan` (BFF aplikasi React, status dari SSO yang diatur di Pustikom). */
export interface StatusPemeliharaanBff {
  aktif: boolean;
  pesan: string;
  sampai: string | null;
  sejak: string | null;
  /** Pengguna ini pengelola (mis. ADMIN / izin pustikom.akses) yang tetap boleh membuka aplikasi. */
  lolos: boolean;
}

/**
 * Status pemeliharaan aplikasi dari BFF (`GET {bff}/pemeliharaan`), diperiksa saat dipasang, saat tab kembali
 * dilihat, dan tiap `intervalMs` (bawaan 60 detik). null = belum diketahui, atau BFF/SSO versi lama (anggap normal).
 */
export function usePemeliharaanBff(bff: string | false | undefined, intervalMs = 60_000) {
  const [status, setStatus] = React.useState<StatusPemeliharaanBff | null>(null);
  const [memuat, setMemuat] = React.useState(Boolean(bff));
  const periksa = React.useCallback(async () => {
    if (!bff) return;
    try {
      const r = await globalThis.fetch(`${bff.replace(/\/$/, '')}/pemeliharaan`, { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
      const d = r.ok ? ((await r.json()) as Partial<StatusPemeliharaanBff>) : null;
      setStatus(d && typeof d.aktif === 'boolean' ? { aktif: d.aktif, pesan: d.pesan ?? '', sampai: d.sampai ?? null, sejak: d.sejak ?? null, lolos: Boolean(d.lolos) } : null);
      if (d && d.aktif === false && sekarang) laporPemeliharaan(null);
    } catch {
      /* jaringan putus: biarkan status terakhir */
    } finally {
      setMemuat(false);
    }
  }, [bff]);
  React.useEffect(() => {
    if (!bff) return;
    void periksa();
    const t = setInterval(() => void periksa(), Math.max(10_000, intervalMs));
    const lihat = () => document.visibilityState === 'visible' && void periksa();
    document.addEventListener('visibilitychange', lihat);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
    };
  }, [bff, intervalMs, periksa]);
  return { status, memuat, periksa };
}

export interface GerbangPemeliharaanProps extends Omit<ModePemeliharaanProps, 'until' | 'onRetry'> {
  children: React.ReactNode;
  /**
   * Awalan BFF aplikasi (mis. "/bff"): status pemeliharaan diambil dari `GET /bff/pemeliharaan` yang diatur admin di
   * Pustikom (Aplikasi » Pemeliharaan). Pengelola (`lolos`) tetap melihat aplikasi dengan pita penanda.
   */
  bff?: string | false;
  /** Teks pita bagi pengelola saat pemeliharaan berjalan. */
  bypassNotice?: React.ReactNode;
  /** Paksa mode pemeliharaan (mis. dari pengaturan aplikasi). */
  active?: boolean;
  /** Jadwal pemeliharaan: spanduk muncul sebelumnya, halaman pemeliharaan saat berjalan. */
  schedule?: { start: Date | string; end?: Date | string | null; message?: React.ReactNode };
  /** Periksa apakah layanan sudah pulih (bawaan: muat ulang data). */
  onRetry?: () => void | Promise<void>;
}

/**
 * Gerbang aplikasi: tampilkan halaman pemeliharaan saat `active`, saat jadwal berjalan, atau saat API membalas 503
 * (pasang {@link fetchPemeliharaan} di SDK), atau saat BFF (`bff="/bff"`) melaporkan mode pemeliharaan dari Pustikom/SSO.
 * Spanduk muncul sebelum jadwal; pengelola yang lolos melihat pita "Mode pemeliharaan aktif".
 */
export function GerbangPemeliharaan({ children, active, schedule, onRetry, message, bff, bypassNotice, ...rest }: GerbangPemeliharaanProps) {
  const dariApi = usePemeliharaan();
  const { status: dariBff, memuat, periksa } = usePemeliharaanBff(bff);
  const [kini, setKini] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!schedule) return;
    const t = setInterval(() => setKini(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [schedule]);
  const mulai = schedule ? new Date(String(schedule.start).replace(' ', 'T')).getTime() : 0;
  const akhir = schedule?.end ? new Date(String(schedule.end).replace(' ', 'T')).getTime() : Infinity;
  const terjadwal = Boolean(schedule && kini >= mulai && kini < akhir);
  const bffTutup = Boolean(dariBff?.aktif && !dariBff.lolos);
  // Pengelola boleh lewat: 503 dari API saat pemeliharaan aplikasi ini tidak menutup layar mereka.
  const pengelola = Boolean(dariBff?.aktif && dariBff.lolos);
  if (bff && memuat && !dariBff) return null;
  if (active || terjadwal || bffTutup || (dariApi && !pengelola)) {
    return (
      <ModePemeliharaan
        {...rest}
        message={(bffTutup && dariBff?.pesan) || dariApi?.message || (terjadwal ? schedule?.message : undefined) || message}
        until={(bffTutup ? dariBff?.sampai : null) ?? dariApi?.until ?? (schedule?.end ? schedule.end : null)}
        onRetry={async () => {
          laporPemeliharaan(null);
          invalidateSiakad('');
          await periksa();
          await onRetry?.();
        }}
      />
    );
  }
  return (
    <>
      {schedule && <BannerPemeliharaan start={schedule.start} end={schedule.end} message={schedule.message} />}
      {pengelola && (
        <div className="u-banner-pemeliharaan" data-berjalan role="status">
          <Wrench aria-hidden />
          <p>
            <b>Mode pemeliharaan aktif.</b>{' '}
            {bypassNotice ?? `Pengguna lain melihat halaman pemeliharaan${dariBff?.pesan ? ` ("${dariBff.pesan}")` : ''}. Anda tetap bisa membuka aplikasi karena pengelola.`}
          </p>
        </div>
      )}
      {children}
    </>
  );
}
