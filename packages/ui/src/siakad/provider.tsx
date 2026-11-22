'use client';
import * as React from 'react';
import { Siakad } from 'unipo-siakad-sdk';
import type { ApiResult, Meta } from 'unipo-siakad-sdk';
import { Toaster, TooltipProvider } from '../components/overlays';
import { requestIdDari } from '../components/galat';
import { laporPemeliharaan } from './pemeliharaan';
import { LaporGalat } from './lapor-galat';
import { PemberitahuanPeriodeDitutup } from './kunci-periode';
import { KalenderAkademikProvider } from './kalender-tanggal';

const SiakadContext = React.createContext<Siakad | null>(null);

/** Fungsi bergaya `fetch` (Web Fetch API). */
export type PengambilSiakad = (input: string, init?: RequestInit) => Promise<Response>;

export interface PenghubungSiakad {
  /**
   * Alamat yang dipanggil komponen, tanpa `/v1`. Biasanya proxy di backend Anda sendiri (Next.js route handler,
   * NestJS, Express, Laravel) yang meneruskan ke API SIAKAD dengan token server, mis. `'/api/siakad'`.
   * Bawaan `''` (asal halaman) bila `fetcher` diisi, selain itu `https://api.unipo.ac.id`.
   */
  baseUrl?: string;
  /** Ganti `fetch`: data tiruan (`buatFetcherTiruan`), klien HTTP sendiri, atau penambah header. */
  fetcher?: PengambilSiakad;
  /**
   * Token akses pengguna untuk setiap permintaan (dari sesi login aplikasi Anda). Kembalikan `null`/kosong bila
   * proxy server yang menempelkan token; dalam hal itu tidak ada header Authorization dari browser.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

export interface UnipoProviderProps extends PenghubungSiakad {
  /**
   * Instans SDK yang sudah dibuat sendiri. Bila kosong, provider membuat instans dari `baseUrl`/`fetcher`/`getToken`.
   * Jangan menaruh client_secret di kode yang dikirim ke browser.
   */
  siakad?: Siakad | null;
  children: React.ReactNode;
  /** Pasang Toaster + TooltipProvider (bawaan true). */
  withProviders?: boolean;
  /**
   * Pasang panel "Laporkan ke Pustikom" untuk tombol Buat tiket di kode laporan galat (bawaan true bila `siakad` ada).
   * Matikan untuk SDK tanpa sesi pengguna yang tidak bersarang di provider lain.
   */
  laporGalat?: boolean;
  /**
   * Komponen tanggal (Calendar, DatePicker, DateRangePicker) memakai kalender akademik SIAKAD: libur, agenda, tahapan,
   * preset, peringatan periode ditutup (bawaan true bila `siakad` ada; data dimuat saat kalender pertama tampil).
   */
  kalenderAkademik?: boolean;
}

const TANDA_PROXY = 'unipo-ui-penghubung';

/**
 * Instans SDK untuk browser dari penghubung data: `baseUrl` (proxy backend Anda), `fetcher`, `getToken`. Tidak pernah
 * memakai client_secret. Berlaku untuk SDK 1.x dan 2.x: token dipasang lewat `fetch`, bukan opsi SDK.
 *
 *   const siakad = buatSiakadPenghubung({ baseUrl: '/api/siakad' });
 */
export function buatSiakadPenghubung({ baseUrl, fetcher, getToken }: PenghubungSiakad): Siakad {
  const dasar: PengambilSiakad = fetcher ?? ((u, i) => globalThis.fetch(u, i));
  const kirim: PengambilSiakad = async (input, init = {}) => {
    const h = new Headers(init.headers);
    // SDK selalu butuh token; tanda tempat diganti token dari getToken, atau dibuang (proxy menempelkan token sendiri).
    if (h.get('authorization') === `Bearer ${TANDA_PROXY}`) h.delete('authorization');
    const token = getToken ? await getToken() : null;
    if (token) h.set('authorization', `Bearer ${token}`);
    return dasar(input, { ...init, headers: h });
  };
  return new Siakad({
    baseUrl: baseUrl ?? (fetcher ? '' : undefined),
    accessToken: TANDA_PROXY,
    fetch: kirim as typeof fetch,
  });
}

/** Penyedia konteks UNIPO: instans SDK untuk komponen terhubung, toast, dan tooltip. */
export function UnipoProvider({ siakad: siakadProp = null, baseUrl, fetcher, getToken, children, withProviders = true, laporGalat = true, kalenderAkademik = true }: UnipoProviderProps) {
  // getToken lewat ref: fungsi baru tiap render tidak membuat instans (dan cache) baru.
  const tokenRef = React.useRef(getToken);
  tokenRef.current = getToken;
  const adaToken = getToken !== undefined;
  const dibuat = React.useMemo(
    () => (siakadProp || (baseUrl === undefined && !fetcher) ? null : buatSiakadPenghubung({ baseUrl, fetcher, getToken: adaToken ? () => tokenRef.current?.() : undefined })),
    [siakadProp, baseUrl, fetcher, adaToken],
  );
  const siakad = siakadProp ?? dibuat;
  const inner = (
    <SiakadContext.Provider value={siakad}>
      <KalenderAkademikProvider aktif={kalenderAkademik}>{children}</KalenderAkademikProvider>
      {siakad && laporGalat && <LaporGalat siakad={siakad} />}
    </SiakadContext.Provider>
  );
  if (!withProviders) return inner;
  return (
    <TooltipProvider>
      <Toaster>
        <PemberitahuanPeriodeDitutup />
        {inner}
      </Toaster>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------- Sesi habis (401)
let sesiHabis: unknown = null;
const pendengarSesi = new Set<() => void>();

/** Tandai sesi berakhir (galat 401 dari API). Dipanggil otomatis oleh useSiakadQuery; panggil sendiri untuk aksi tulis. */
export function laporSesiHabis(galat: unknown = true) {
  sesiHabis = galat;
  pendengarSesi.forEach((l) => l());
}
/** Bersihkan tanda sesi habis (mis. setelah token diperbarui). */
export function pulihkanSesi() {
  laporSesiHabis(null);
}
/** Galat 401 terakhir, atau null bila sesi masih berlaku. */
export function useSesiHabis(): unknown {
  return React.useSyncExternalStore(
    (l) => {
      pendengarSesi.add(l);
      return () => void pendengarSesi.delete(l);
    },
    () => sesiHabis,
    () => null,
  );
}

/** Instans SDK dari <UnipoProvider>. */
export function useSiakad(): Siakad {
  const s = React.useContext(SiakadContext);
  if (!s) throw new Error('Komponen ini butuh sumber data: bungkus aplikasi dengan <UnipoProvider baseUrl="/api/siakad"> (proxy di backend Anda) atau <UnipoProvider fetcher={buatFetcherTiruan(...)}> untuk data tiruan.');
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

/** Jalankan `fn` setiap kali invalidateSiakad dipanggil dengan `prefix` ini (atau tanpa prefix), untuk data yang dimuat sendiri. */
export function useSaatInvalidasi(prefix: string, fn: () => void) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useEffect(() => {
    const l = (p: string) => {
      if (!p || p === prefix) ref.current();
    };
    listeners.add(l);
    return () => void listeners.delete(l);
  }, [prefix]);
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
    if (!siakad) return void setState({ loading: false, error: new Error('Sumber data belum dipasang: isi <UnipoProvider baseUrl="/api/siakad"> (proxy di backend Anda) atau fetcher data tiruan.') });
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
    p.then((result) => {
      if (!ctrl.signal.aborted) setState({ result, loading: false, error: null });
    }).catch((e: Error) => {
      if ((e as { status?: number })?.status === 503) laporPemeliharaan({ message: e.message, until: null });
      if ((e as { status?: number })?.status === 401) laporSesiHabis(e);
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
  // Kunci periode: pesan server sudah lengkap ("Periode … sudah ditutup sejak …").
  if (err.status === 423) return err.message || 'Periode sudah ditutup. Perubahan data periode ini tidak diizinkan.';
  if (err.status && err.status >= 500) {
    // Sertakan kode laporan agar teks ini juga berguna di toast (tempat <KodeLaporan /> tidak bisa dipasang).
    const id = opsi.kode === false ? null : requestIdDari(e);
    return `Server SIAKAD sedang bermasalah. Coba lagi beberapa saat.${id ? ` Kode laporan: ${id}.` : ''}`;
  }
  return err.message || 'Terjadi kesalahan.';
}
