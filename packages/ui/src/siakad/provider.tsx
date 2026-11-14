'use client';
import * as React from 'react';
import type { ApiResult, Meta, Siakad } from 'unipo-siakad-sdk';
import { Toaster, TooltipProvider } from '../components/overlays';
import { requestIdDari } from '../components/galat';
import { laporPemeliharaan } from './pemeliharaan';

const SiakadContext = React.createContext<Siakad | null>(null);

export interface UnipoProviderProps {
  /**
   * Instans SDK. Di browser: `new Siakad({ baseUrl: '/bff/api', accessToken })`.
   * Jangan menaruh client_secret di kode yang dikirim ke browser.
   */
  siakad?: Siakad | null;
  children: React.ReactNode;
  /** Pasang Toaster + TooltipProvider (bawaan true). */
  withProviders?: boolean;
}

/** Penyedia konteks UNIPO: instans SDK untuk komponen terhubung, toast, dan tooltip. */
export function UnipoProvider({ siakad = null, children, withProviders = true }: UnipoProviderProps) {
  const inner = <SiakadContext.Provider value={siakad}>{children}</SiakadContext.Provider>;
  if (!withProviders) return inner;
  return (
    <TooltipProvider>
      <Toaster>{inner}</Toaster>
    </TooltipProvider>
  );
}

/** Instans SDK dari <UnipoProvider>. */
export function useSiakad(): Siakad {
  const s = React.useContext(SiakadContext);
  if (!s) throw new Error('Komponen ini butuh SDK: bungkus aplikasi dengan <UnipoProvider siakad={new Siakad(...)}>.');
  return s;
}
export function useOptionalSiakad(): Siakad | null {
  return React.useContext(SiakadContext);
}

// ---------------------------------------------------------------- Query sederhana dengan cache
type Entry = { at: number; result: ApiResult<unknown>; promise?: Promise<ApiResult<unknown>> };
const caches = new WeakMap<object, Map<string, Entry>>();
function cacheFor(s: object) {
  let c = caches.get(s);
  if (!c) caches.set(s, (c = new Map()));
  return c;
}
const listeners = new Set<(prefix: string) => void>();
// Permintaan yang sedang berjalan per kunci: beberapa widget dengan kunci sama berbagi satu panggilan API.
const inflight = new WeakMap<object, Map<string, Promise<unknown>>>();
function inflightFor(s: object) {
  let m = inflight.get(s);
  if (!m) inflight.set(s, (m = new Map()));
  return m;
}

/** Buang cache yang kuncinya diawali `prefix` (mis. setelah menyimpan data) dan muat ulang komponen yang memakainya. */
export function invalidateSiakad(prefix = '') {
  listeners.forEach((l) => l(prefix));
}

export interface QueryState<T> {
  data: T | undefined;
  meta: Meta | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface QueryOptions {
  /** Lama data dianggap segar (ms). Bawaan 30 detik. */
  staleTime?: number;
  enabled?: boolean;
}

/**
 * Ambil data dari SDK dengan cache per instans, batal otomatis, dan muat ulang saat kunci berubah.
 *   const { data, loading } = useSiakadQuery(['prodi'], (s, signal) => s.referensi.getProdi({}, { signal }));
 */
export function useSiakadQuery<T>(key: ReadonlyArray<unknown>, fn: (siakad: Siakad, signal: AbortSignal) => Promise<ApiResult<T>>, opts: QueryOptions = {}): QueryState<T> {
  const siakad = useOptionalSiakad();
  const k = JSON.stringify(key);
  const { staleTime = 30_000, enabled = true } = opts;
  const [state, setState] = React.useState<{ result?: ApiResult<T>; loading: boolean; error: Error | null }>(() => {
    const hit = siakad ? cacheFor(siakad).get(k) : undefined;
    return { result: hit?.result as ApiResult<T> | undefined, loading: enabled && !hit, error: null };
  });
  const [nonce, setNonce] = React.useState(0);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;

  React.useEffect(() => {
    const l = (prefix: string) => {
      if (k.startsWith(JSON.stringify(prefix ? [prefix] : []).slice(0, -1))) {
        if (siakad) cacheFor(siakad).delete(k);
        setNonce((n) => n + 1);
      }
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, [k, siakad]);

  React.useEffect(() => {
    if (!enabled) return void setState((s) => ({ ...s, loading: false }));
    if (!siakad) return void setState({ loading: false, error: new Error('SDK belum dipasang di <UnipoProvider>.') });
    const cache = cacheFor(siakad);
    const hit = cache.get(k);
    if (hit && Date.now() - hit.at < staleTime && nonce === 0) {
      setState({ result: hit.result as ApiResult<T>, loading: false, error: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    const jalan = inflightFor(siakad);
    let p = jalan.get(k) as Promise<ApiResult<T>> | undefined;
    if (!p) {
      // Dibagi ke beberapa pemakai, jadi tidak dibatalkan saat satu pemakai dilepas.
      p = fnRef.current(siakad, new AbortController().signal).then((result) => {
        cache.set(k, { at: Date.now(), result });
        return result;
      });
      jalan.set(k, p);
      const lepas = () => jalan.delete(k);
      p.then(lepas, lepas);
    }
    p
      .then((result) => {
        if (!ctrl.signal.aborted) setState({ result, loading: false, error: null });
      })
      .catch((e: Error) => {
        if ((e as { status?: number })?.status === 503) laporPemeliharaan({ message: e.message, until: null });
        if (!ctrl.signal.aborted && e?.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: e }));
      });
    return () => ctrl.abort();
  }, [k, siakad, enabled, staleTime, nonce]);

  return {
    data: state.result?.data,
    meta: state.result?.meta,
    loading: state.loading,
    error: state.error,
    refetch: () => {
      if (siakad) cacheFor(siakad).delete(k);
      setNonce((n) => n + 1);
    },
  };
}

/**
 * Pesan galat ramah dari galat SDK (SiakadError punya .status dan .message). Untuk galat server (5xx) pesan
 * menyertakan kode laporan (request_id); matikan dengan `{ kode: false }` bila kode ditampilkan terpisah
 * dengan <KodeLaporan />.
 */
export function pesanGalat(e: unknown, opsi: { kode?: boolean } = {}): string {
  const err = e as { status?: number; message?: string } | null;
  if (!err) return 'Terjadi kesalahan.';
  if (err.status === 401) return 'Sesi Anda berakhir. Silakan masuk lagi.';
  if (err.status === 403) return 'Akun Anda belum punya izin untuk data ini.';
  if (err.status === 404) return 'Data tidak ditemukan.';
  if (err.status === 429) return 'Terlalu banyak permintaan. Coba lagi sebentar lagi.';
  if (err.status && err.status >= 500) {
    // Sertakan kode laporan agar teks ini juga berguna di toast (tempat <KodeLaporan /> tidak bisa dipasang).
    const id = opsi.kode === false ? null : requestIdDari(e);
    return `Server SIAKAD sedang bermasalah. Coba lagi beberapa saat.${id ? ` Kode laporan: ${id}.` : ''}`;
  }
  return err.message || 'Terjadi kesalahan.';
}
