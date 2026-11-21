'use client';
import * as React from 'react';
import {
  AppWindow,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  List,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { Siakad } from 'unipo-siakad-sdk';
import { cn } from '../lib/cn';
import { formatDate, formatNumber } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, DescriptionList, Empty, Tabs } from '../components/display';
import { StatCard, StatGrid } from '../components/charts';
import { CodeBlock, CopyButton } from '../components/code';
import { Checkbox, Field, Input, InputGroup, SegmentedControl, Switch, Textarea } from '../components/forms';
import { ConfirmDialog, Dialog, Sheet } from '../components/overlays';
import { Wizard, WizardReview, FormGrid } from '../components/wizard';
import { DataTable, type DataColumn } from '../components/data-table';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery, type QueryState } from './provider';
import { KodeLaporan } from '../components/galat';
import { LogoAplikasi } from '../components/identity';
import { LogAktivitas, LogApi, RingkasanLogApi } from './log';
import { TombolPilihBerkas } from '../components/pilih-berkas-lokal';

/*
 * Komponen pengelolaan aplikasi integrasi (Pustikom): satu aplikasi = entri katalog hak akses SIAKAD (/v1/rbac/aplikasi)
 * + klien login SSO (API admin SSO, lewat BFF) + klien API SIAKAD (/v1/rbac/klien-api). Daftar, kartu, detail, ubah,
 * wizard pembuatan, tampilan secret sekali lihat, dan pemilih scope.
 */

// ================================================================ Klien API admin SSO
export class SsoAdminError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SsoAdminError';
  }
}

export interface SsoAdminClient {
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts?: { query?: Record<string, unknown>; body?: unknown; signal?: AbortSignal },
  ): Promise<{ data: T; meta?: Record<string, any> }>;
}

export interface SsoAdminOptions {
  /** Alamat BFF yang meneruskan ke /api/admin SSO (bawaan '/bff/sso'). Jangan panggil SSO langsung dari browser: butuh client secret. */
  baseUrl?: string;
  /** Header tambahan per permintaan, mis. () => ({ 'X-CSRF-Token': csrf }). */
  headers?: () => Record<string, string>;
  /** Kirim PUT/PATCH/DELETE sebagai POST + X-HTTP-Method-Override (untuk hosting yang menolak metode itu). */
  methodOverride?: boolean;
  fetch?: typeof fetch;
}

/** Klien API admin SSO lewat BFF aplikasi Anda (cookie sesi + CSRF). */
export function createSsoAdmin({ baseUrl = '/bff/sso', headers, methodOverride, fetch: f }: SsoAdminOptions = {}): SsoAdminClient {
  return {
    async request(method, path, opts = {}) {
      const q = Object.entries(opts.query ?? {}).filter(([, v]) => v != null && v !== '');
      const url = `${baseUrl.replace(/\/$/, '')}${path}${q.length ? `?${new URLSearchParams(q.map(([k, v]) => [k, String(v)]))}` : ''}`;
      const h: Record<string, string> = { Accept: 'application/json', ...headers?.() };
      if (opts.body !== undefined) h['Content-Type'] = 'application/json';
      let m: string = method;
      if (methodOverride && method !== 'GET' && method !== 'POST') {
        h['X-HTTP-Method-Override'] = method;
        m = 'POST';
      }
      const res = await (f ?? fetch)(url, { method: m, headers: h, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), credentials: 'same-origin', signal: opts.signal });
      const json = (await res.json().catch(() => null)) as { data?: unknown; meta?: Record<string, any>; error?: { code?: string; message?: string } } | null;
      if (!res.ok) throw new SsoAdminError(res.status, json?.error?.code ?? 'error', json?.error?.message ?? `SSO menjawab ${res.status}.`);
      return { data: json?.data as never, meta: json?.meta };
    },
  };
}

const SsoContext = React.createContext<SsoAdminClient | null>(null);
/** Pasang klien admin SSO untuk komponen aplikasi, log aktivitas, dan keamanan pengguna. */
export function SsoAdminProvider({ client, children }: { client: SsoAdminClient; children: React.ReactNode }) {
  return <SsoContext.Provider value={client}>{children}</SsoContext.Provider>;
}
export function useSsoAdmin(): SsoAdminClient | null {
  return React.useContext(SsoContext);
}

const ssoListeners = new Set<() => void>();
/** Muat ulang semua data SSO yang tampil (setelah menyimpan). */
export function invalidateSso() {
  ssoListeners.forEach((l) => l());
}

/** Query sederhana ke API admin SSO (tanpa cache bersama). */
export function useSsoQuery<T>(
  key: ReadonlyArray<unknown>,
  fn: (sso: SsoAdminClient, signal: AbortSignal) => Promise<{ data: T; meta?: Record<string, any> }>,
  opts: { enabled?: boolean } = {},
): QueryState<T> {
  const sso = useSsoAdmin();
  const k = JSON.stringify(key);
  const enabled = opts.enabled ?? true;
  const [nonce, setNonce] = React.useState(0);
  const [st, setSt] = React.useState<{ r?: { data: T; meta?: Record<string, any> }; loading: boolean; error: Error | null }>({ loading: enabled, error: null });
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  React.useEffect(() => {
    const l = () => setNonce((n) => n + 1);
    ssoListeners.add(l);
    return () => void ssoListeners.delete(l);
  }, []);
  React.useEffect(() => {
    if (!enabled) return void setSt((s) => ({ ...s, loading: false }));
    if (!sso) return void setSt({ loading: false, error: new SsoAdminError(0, 'no_client', 'Klien admin SSO belum dipasang (<SsoAdminProvider>).') });
    const ctrl = new AbortController();
    setSt((s) => ({ ...s, loading: true, error: null }));
    fnRef
      .current(sso, ctrl.signal)
      .then((r) => !ctrl.signal.aborted && setSt({ r, loading: false, error: null }))
      .catch((e: Error) => !ctrl.signal.aborted && e?.name !== 'AbortError' && setSt((s) => ({ ...s, loading: false, error: e })));
    return () => ctrl.abort();
  }, [k, sso, enabled, nonce]);
  return { data: st.r?.data, meta: st.r?.meta as never, loading: st.loading, error: st.error, refetch: () => setNonce((n) => n + 1) };
}

// ================================================================ Tipe
export type JenisAplikasi = 'web' | 'mobile' | 'layanan' | 'api';
export type Visibilitas = 'publik' | 'privat';

/** Aplikasi di katalog hak akses SIAKAD (/v1/rbac/aplikasi). */
export interface AplikasiRbac {
  id: number;
  kode: string;
  nama: string;
  keterangan?: string | null;
  jenis: JenisAplikasi;
  url?: string | null;
  /** publik = tampil di dasbor SSO dan /v1/rbac/aplikasi-publik; privat = hanya di Pustikom. */
  visibilitas?: Visibilitas;
  /** Tautan unduh Android (Google Play / APK). */
  url_android?: string | null;
  /** Tautan unduh iOS (App Store / TestFlight). */
  url_ios?: string | null;
  client_id_api?: string | null;
  client_id_sso?: string | null;
  sistem?: boolean;
  aktif: boolean;
  urut?: number;
  created_at?: string | null;
}

/** Klien login SSO (/api/admin/clients). */
export interface KlienSso {
  id: string;
  name: string;
  description?: string;
  redirect_uris: string[];
  post_logout_redirect_uris: string[];
  frontchannel_logout_uri?: string;
  levels?: string[];
  permission?: string;
  portal_url?: string;
  /** public = tampil di dasbor SSO (bawaan), private = disembunyikan. */
  visibility?: 'public' | 'private';
  android_url?: string;
  ios_url?: string;
  active: boolean;
  logo_url?: string | null;
  admin?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Klien API SIAKAD (/v1/rbac/klien-api). */
export interface KlienApi {
  id: string;
  name: string;
  scopes: string[];
  allow_user_login: boolean;
  trust_user_ip?: boolean;
  sso_audience?: string | null;
  allowed_ips: string[];
  allowed_origins: string[];
  prodi?: string[];
  rate_limit?: number | null;
  active: boolean;
  created_at?: string;
  logo_uri?: string | null;
  lingkungan?: 'live' | 'development' | string;
}

/** Satu aplikasi nyata: gabungan katalog, klien SSO, dan klien API. */
export interface AplikasiTerpadu {
  kunci: string;
  kode: string;
  nama: string;
  keterangan?: string | null;
  jenis: JenisAplikasi;
  url: string | null;
  logo: string | null;
  visibilitas: Visibilitas;
  url_android: string | null;
  url_ios: string | null;
  aktif: boolean;
  bawaan: boolean;
  /** Login SSO dibatasi izin <kode>.akses. */
  terbatas: boolean;
  rbac?: AplikasiRbac;
  sso?: KlienSso;
  api?: KlienApi;
}

// ================================================================ Data
const A = '/v1/rbac';
const sekali = { staleTime: 60_000 };

export function useAplikasiRbac() {
  return useSiakadQuery<AplikasiRbac[]>(['rbac', 'aplikasi'], (s, signal) => s.request({ method: 'GET', path: `${A}/aplikasi`, query: { per_page: 100 } }, { signal }), sekali);
}
export function useKlienApi() {
  return useSiakadQuery<KlienApi[]>(['rbac', 'klien-api'], (s, signal) => s.request({ method: 'GET', path: `${A}/klien-api` }, { signal }), sekali);
}
/** Katalog scope API: { 'krs:read': 'Baca KRS', ... }. */
export function useKatalogScope() {
  return useSiakadQuery<Record<string, string>>(['rbac', 'scope'], (s, signal) => s.request({ method: 'GET', path: `${A}/klien-api/scope` }, { signal }), { staleTime: 10 * 60_000 });
}
export function usePeranRbac() {
  return useSiakadQuery<Array<{ id: number; kode: string; nama: string; aktif: boolean; level_siakad?: string | null }>>(
    ['rbac', 'peran'],
    (s, signal) => s.request({ method: 'GET', path: `${A}/peran`, query: { per_page: 100 } }, { signal }),
    sekali,
  );
}
export function useKlienSso() {
  return useSsoQuery<KlienSso[]>(['clients'], (sso, signal) => sso.request('GET', '/clients', { signal }));
}

/** Client ID SSO dari kode aplikasi (SSO hanya menerima huruf kecil, angka, garis bawah). */
export const idSsoDariKode = (kode: string) => kode.replace(/-/g, '_');

/**
 * Gabungkan katalog, klien SSO, dan klien API menjadi satu baris per aplikasi. Urutan pencocokan: tautan tersimpan
 * (client_id_sso / client_id_api), client ID sama dengan kode, lalu sso_audience klien API. Klien tanpa pasangan tampil sendiri.
 */
export function gabungAplikasi(rbac: AplikasiRbac[], sso: KlienSso[], api: KlienApi[]): AplikasiTerpadu[] {
  const pakaiSso = new Set<string>();
  const pakaiApi = new Set<string>();
  const hasil: AplikasiTerpadu[] = rbac.map((a) => {
    const s = sso.find((c) => c.id === a.client_id_sso) ?? sso.find((c) => !a.client_id_sso && c.id === idSsoDariKode(a.kode));
    if (s) pakaiSso.add(s.id);
    const k = api.find((c) => c.id === a.client_id_api) ?? (a.client_id_api ? undefined : api.find((c) => !pakaiApi.has(c.id) && (c.id === a.kode || (s && c.sso_audience === s.id))));
    if (k) pakaiApi.add(k.id);
    return {
      kunci: a.kode,
      kode: a.kode,
      nama: a.nama,
      keterangan: a.keterangan,
      jenis: a.jenis,
      url: a.url || s?.portal_url || null,
      logo: s?.logo_url ?? k?.logo_uri ?? null,
      visibilitas: a.visibilitas ?? (s?.visibility === 'private' ? 'privat' : 'publik'),
      url_android: a.url_android || s?.android_url || null,
      url_ios: a.url_ios || s?.ios_url || null,
      aktif: a.aktif && (s ? s.active : true) && (k ? k.active : true),
      bawaan: !!a.sistem,
      terbatas: !!s?.permission,
      rbac: a,
      sso: s,
      api: k,
    };
  });
  for (const s of sso) {
    if (pakaiSso.has(s.id) || s.admin) continue;
    hasil.push({
      kunci: `sso:${s.id}`,
      kode: s.id,
      nama: s.name,
      keterangan: s.description,
      jenis: 'web',
      url: s.portal_url || null,
      logo: s.logo_url ?? null,
      visibilitas: s.visibility === 'private' ? 'privat' : 'publik',
      url_android: s.android_url || null,
      url_ios: s.ios_url || null,
      aktif: s.active,
      bawaan: false,
      terbatas: !!s.permission,
      sso: s,
    });
  }
  for (const k of api) {
    if (pakaiApi.has(k.id)) continue;
    hasil.push({
      kunci: `api:${k.id}`,
      kode: k.id,
      nama: k.name,
      jenis: 'api',
      url: null,
      logo: k.logo_uri ?? null,
      visibilitas: 'privat',
      url_android: null,
      url_ios: null,
      aktif: k.active,
      bawaan: false,
      terbatas: false,
      api: k,
    });
  }
  return hasil;
}

export interface AplikasiTerpaduState {
  data: AplikasiTerpadu[] | undefined;
  loading: boolean;
  error: Error | null;
  /** Galat sumber yang tidak wajib (SSO atau klien API), ditampilkan sebagai peringatan. */
  peringatan: string[];
  refetch: () => void;
}

/** Semua aplikasi integrasi, sudah digabung. Bila SSO belum terpasang, daftar tetap tampil dari SIAKAD. */
export function useAplikasiTerpadu(): AplikasiTerpaduState {
  const rbac = useAplikasiRbac();
  const sso = useKlienSso();
  const api = useKlienApi();
  const data = React.useMemo(() => (rbac.data ? gabungAplikasi(rbac.data, sso.data ?? [], api.data ?? []) : undefined), [rbac.data, sso.data, api.data]);
  const peringatan = [sso.error && `Data login SSO tidak terbaca: ${pesanGalat(sso.error)}`, api.error && `Klien API tidak terbaca: ${pesanGalat(api.error)}`].filter(Boolean) as string[];
  return {
    data,
    loading: rbac.loading || (sso.loading && !sso.data) || (api.loading && !api.data),
    error: rbac.error,
    peringatan,
    refetch: () => {
      rbac.refetch();
      sso.refetch();
      api.refetch();
    },
  };
}

const daftarTeks = (t: string) =>
  t
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
const hostDari = (u?: string | null) => (u ? u.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : '');
const JENIS: Record<JenisAplikasi, { label: string; pendek: string; icon: React.ReactNode }> = {
  web: { label: 'Aplikasi web', pendek: 'Web', icon: <Globe /> },
  mobile: { label: 'Aplikasi mobile', pendek: 'Mobile', icon: <Smartphone /> },
  layanan: { label: 'Layanan server', pendek: 'Server', icon: <Server /> },
  api: { label: 'Integrasi API', pendek: 'API', icon: <KeyRound /> },
};

// ================================================================ Tampilan kecil
/** Logo aplikasi; tanpa gambar memakai inisial berwarna tetap. */
export function IkonAplikasi({ nama, kode, src, size = 'md', className }: { nama: string; kode?: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <LogoAplikasi kode={kode || nama || '?'} name={nama || '?'} src={src} ssoUrl={null} layout="mark" size={size} className={cn('u-app-icon', className)} />;
}

/** Logo Android (robot) untuk tombol unduh. */
export function IkonAndroid(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden {...props}>
      <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.4 11.4 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

/** Logo Apple untuk tombol unduh iOS. */
export function IkonApple(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden {...props}>
      <path d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.3.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.8-1-2.8-4.2zM13.9 5.1c.7-.9 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1.1 3 1.1.1 2.3-.6 3-1.4z" />
    </svg>
  );
}

export interface TautanAplikasiProps {
  nama: string;
  /** Alamat web: tombol Buka. */
  url?: string | null;
  url_android?: string | null;
  url_ios?: string | null;
  size?: 'sm' | 'md';
  /** Hentikan klik agar tidak ikut memicu klik kartu. */
  hentikanKlik?: boolean;
  className?: string;
}

/** Tombol aksi aplikasi: Buka (web) dan unduh Android/iOS sesuai platform yang didukung. Kosong bila tidak ada tautan. */
export function TautanAplikasi({ nama, url, url_android, url_ios, size = 'sm', hentikanKlik = true, className }: TautanAplikasiProps) {
  if (!url && !url_android && !url_ios) return null;
  const henti = hentikanKlik ? { onClick: (e: React.MouseEvent) => e.stopPropagation(), onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() } : {};
  return (
    <span className={cn('u-app-links', className)}>
      {url && (
        <Button size={size} render={<a href={url} target="_blank" rel="noopener noreferrer" {...henti} />}>
          Buka <ExternalLink aria-hidden />
        </Button>
      )}
      {url_android && (
        <Button size={size} variant="outline" render={<a href={url_android} target="_blank" rel="noopener noreferrer" aria-label={`Unduh ${nama} untuk Android`} {...henti} />}>
          <IkonAndroid /> Android
        </Button>
      )}
      {url_ios && (
        <Button size={size} variant="outline" render={<a href={url_ios} target="_blank" rel="noopener noreferrer" aria-label={`Unduh ${nama} untuk iOS`} {...henti} />}>
          <IkonApple /> iOS
        </Button>
      )}
    </span>
  );
}

/** Lencana status aplikasi: aktif/nonaktif, login SSO, klien API, login terbatas, bawaan, lingkungan data. */
export function LencanaAplikasi({ aplikasi: a, className }: { aplikasi: AplikasiTerpadu; className?: string }) {
  return (
    <span className={cn('u-app-badges', className)}>
      <Badge variant={a.aktif ? 'success' : 'neutral'} dot>
        {a.aktif ? 'Aktif' : 'Nonaktif'}
      </Badge>
      {(a.jenis === 'web' || a.jenis === 'mobile') && (
        <Badge variant={a.visibilitas === 'publik' ? 'success' : 'neutral'}>
          {a.visibilitas === 'publik' ? <Eye aria-hidden /> : <EyeOff aria-hidden />} {a.visibilitas === 'publik' ? 'Publik' : 'Privat'}
        </Badge>
      )}
      {a.sso && <Badge variant="info">SSO</Badge>}
      {a.api && <Badge variant="primary">API</Badge>}
      {a.terbatas && (
        <Badge variant="warning">
          <Lock aria-hidden /> Terbatas
        </Badge>
      )}
      {a.api?.lingkungan && a.api.lingkungan !== 'live' && <Badge variant="outline">Development</Badge>}
      {a.bawaan && <Badge variant="outline">Bawaan</Badge>}
    </span>
  );
}

export interface KartuAplikasiProps {
  aplikasi: AplikasiTerpadu;
  onPilih?: (a: AplikasiTerpadu) => void;
  href?: string;
  /** Isi kaki kartu (tombol). */
  aksi?: React.ReactNode;
  className?: string;
}

/** Kartu satu aplikasi: logo, nama, alamat, lencana, dan ringkasan scope/redirect. */
export function KartuAplikasi({ aplikasi: a, onPilih, href, aksi, className }: KartuAplikasiProps) {
  const isi = (
    <>
      <div className="u-app-card-head">
        <IkonAplikasi nama={a.nama} kode={a.kode} src={a.logo} size="lg" />
        <div className="u-app-card-title">
          <strong>{a.nama}</strong>
          <span>{a.url ? hostDari(a.url) : <code>{a.kode}</code>}</span>
        </div>
      </div>
      {a.keterangan && <p className="u-app-card-desc">{a.keterangan}</p>}
      <LencanaAplikasi aplikasi={a} />
      <dl className="u-app-card-meta">
        <div>
          <dt>Jenis</dt>
          <dd>{JENIS[a.jenis]?.label ?? a.jenis}</dd>
        </div>
        <div>
          <dt>Scope API</dt>
          <dd>{a.api ? formatNumber(a.api.scopes.length) : '–'}</dd>
        </div>
        <div>
          <dt>Callback</dt>
          <dd>{a.sso ? formatNumber(a.sso.redirect_uris.length) : '–'}</dd>
        </div>
      </dl>
      {!href && (a.jenis === 'web' || a.jenis === 'mobile') && <TautanAplikasi nama={a.nama} url={a.jenis === 'web' || a.url ? a.url : null} url_android={a.url_android} url_ios={a.url_ios} />}
      {aksi && <div className="u-app-card-actions">{aksi}</div>}
    </>
  );
  if (href)
    return (
      <Card render={<a href={href} />} interactive className={cn('u-app-card', className)}>
        {isi}
      </Card>
    );
  return (
    <Card
      interactive={!!onPilih}
      className={cn('u-app-card', className)}
      {...(onPilih ? { role: 'button', tabIndex: 0, onClick: () => onPilih(a), onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPilih(a)) } : {})}
    >
      {isi}
    </Card>
  );
}

// ================================================================ Daftar aplikasi
type Saring = 'semua' | 'sso' | 'api' | 'nonaktif';

export interface DaftarAplikasiProps {
  /** Klik kartu/baris. Bawaan: buka panel detail. */
  onPilih?: (a: AplikasiTerpadu) => void;
  /** Tautan per aplikasi (mengganti panel detail). */
  href?: (a: AplikasiTerpadu) => string;
  /** Tampilan awal. */
  tampilan?: 'kartu' | 'tabel';
  /** Tombol "Aplikasi baru" membuka wizard (bawaan true). */
  bolehBuat?: boolean;
  /** Dipanggil setelah wizard membuat aplikasi. */
  onDibuat?: (h: HasilAplikasiBaru) => void;
  /** Tampilkan kartu angka di atas (bawaan true). */
  statistik?: boolean;
  className?: string;
}

/**
 * Daftar aplikasi integrasi untuk admin: angka ringkas, pencarian, saringan (SSO, API, nonaktif), kartu atau tabel,
 * panel detail, dan wizard aplikasi baru.
 */
export function DaftarAplikasi({ onPilih, href, tampilan: awal = 'kartu', bolehBuat = true, onDibuat, statistik = true, className }: DaftarAplikasiProps) {
  const q = useAplikasiTerpadu();
  const [cari, setCari] = React.useState('');
  const [saring, setSaring] = React.useState<Saring>('semua');
  const [tampilan, setTampilan] = React.useState(awal);
  const [pilih, setPilih] = React.useState<string | null>(null);
  const [wizard, setWizard] = React.useState(false);
  const semua = q.data ?? [];
  const kata = cari.trim().toLowerCase();
  const baris = semua.filter(
    (a) =>
      (saring === 'semua' || (saring === 'sso' && a.sso) || (saring === 'api' && a.api) || (saring === 'nonaktif' && !a.aktif)) &&
      (!kata || [a.nama, a.kode, a.url, a.sso?.id, a.api?.id].some((x) => x?.toLowerCase().includes(kata))),
  );
  const buka = (a: AplikasiTerpadu) => (onPilih ? onPilih(a) : setPilih(a.kunci));

  const kolom: DataColumn<AplikasiTerpadu>[] = [
    {
      key: 'nama',
      header: 'Aplikasi',
      value: (a) => a.nama,
      sortable: true,
      cell: (a) => (
        <span className="u-app-cell">
          <IkonAplikasi nama={a.nama} kode={a.kode} src={a.logo} size="sm" />
          <span>
            <strong>{a.nama}</strong>
            <small>{a.url ? hostDari(a.url) : a.kode}</small>
          </span>
        </span>
      ),
    },
    { key: 'jenis', header: 'Jenis', value: (a) => JENIS[a.jenis]?.label ?? a.jenis, mobile: 'meta' },
    { key: 'sso', header: 'Client SSO', value: (a) => a.sso?.id ?? '', cell: (a) => (a.sso ? <code>{a.sso.id}</code> : '–'), mobile: 'meta' },
    { key: 'api', header: 'Klien API', value: (a) => a.api?.id ?? '', cell: (a) => (a.api ? <code>{a.api.id}</code> : '–'), mobile: 'meta' },
    { key: 'status', header: 'Status', value: (a) => (a.aktif ? 'Aktif' : 'Nonaktif'), cell: (a) => <LencanaAplikasi aplikasi={a} />, mobile: 'badge' },
  ];

  return (
    <div className={cn('u-app-list', className)}>
      {statistik && (
        <StatGrid>
          <StatCard label="Aplikasi" value={formatNumber(semua.length)} icon={<AppWindow />} loading={q.loading && !q.data} />
          <StatCard label="Aktif" value={formatNumber(semua.filter((a) => a.aktif).length)} icon={<ShieldCheck />} tone="success" loading={q.loading && !q.data} />
          <StatCard label="Login SSO" value={formatNumber(semua.filter((a) => a.sso).length)} icon={<Users />} tone="info" loading={q.loading && !q.data} />
          <StatCard label="Klien API" value={formatNumber(semua.filter((a) => a.api).length)} icon={<KeyRound />} tone="warning" loading={q.loading && !q.data} />
        </StatGrid>
      )}
      {q.peringatan.map((p) => (
        <Alert key={p} variant="warning">
          {p}
        </Alert>
      ))}
      <div className="u-app-toolbar">
        <InputGroup start={<Search />} className="u-app-search">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama, kode, client ID" aria-label="Cari aplikasi" />
        </InputGroup>
        <SegmentedControl<Saring>
          value={saring}
          onValueChange={setSaring}
          options={[
            { value: 'semua', label: 'Semua' },
            { value: 'sso', label: 'SSO' },
            { value: 'api', label: 'API' },
            { value: 'nonaktif', label: 'Nonaktif' },
          ]}
          aria-label="Saring aplikasi"
        />
        <span className="u-app-toolbar-end">
          <SegmentedControl<'kartu' | 'tabel'>
            value={tampilan}
            onValueChange={setTampilan}
            options={[
              { value: 'kartu', label: <LayoutGrid />, 'aria-label': 'Tampilan kartu' },
              { value: 'tabel', label: <List />, 'aria-label': 'Tampilan tabel' },
            ]}
          />
          {bolehBuat && (
            <Button onClick={() => setWizard(true)}>
              <Plus /> Aplikasi baru
            </Button>
          )}
        </span>
      </div>

      {q.error ? (
        <Alert
          variant="danger"
          title="Daftar aplikasi gagal dimuat"
          actions={
            <Button size="sm" variant="outline" onClick={q.refetch}>
              Coba lagi
            </Button>
          }
        >
          {pesanGalat(q.error, { kode: false })}
          <KodeLaporan error={q.error} />
        </Alert>
      ) : tampilan === 'kartu' ? (
        q.loading && !q.data ? (
          <div className="u-app-grid">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 196 }} />
            ))}
          </div>
        ) : baris.length ? (
          <div className="u-app-grid">
            {baris.map((a) => (
              <KartuAplikasi key={a.kunci} aplikasi={a} href={href?.(a)} onPilih={href ? undefined : buka} />
            ))}
          </div>
        ) : (
          <Empty
            bordered
            icon={<AppWindow />}
            title={semua.length ? 'Tidak ada aplikasi yang cocok' : 'Belum ada aplikasi'}
            description={semua.length ? 'Ubah kata kunci atau saringan.' : 'Daftarkan aplikasi pertama untuk memberi login SSO dan akses API.'}
            actions={
              semua.length ? (
                <Button variant="outline" onClick={() => (setCari(''), setSaring('semua'))}>
                  Hapus saringan
                </Button>
              ) : bolehBuat ? (
                <Button onClick={() => setWizard(true)}>
                  <Plus /> Aplikasi baru
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <DataTable
          columns={kolom}
          rows={baris}
          rowKey={(a) => a.kunci}
          loading={q.loading}
          onRowClick={href ? (a) => (window.location.href = href(a)) : buka}
          columnToggle={false}
          filtered={!!kata || saring !== 'semua'}
          emptyFiltered={{ onReset: () => (setCari(''), setSaring('semua')) }}
          empty={{ icon: <AppWindow />, title: 'Belum ada aplikasi' }}
        />
      )}

      {!onPilih && !href && <SheetDetailAplikasi kode={pilih} open={pilih != null} onOpenChange={(o) => !o && setPilih(null)} />}
      {bolehBuat && (
        <WizardAplikasi
          open={wizard}
          onOpenChange={setWizard}
          onSelesai={(h) => {
            onDibuat?.(h);
            q.refetch();
          }}
        />
      )}
    </div>
  );
}

// ================================================================ Detail aplikasi
export type TabDetailAplikasi = 'ringkasan' | 'sso' | 'api' | 'log' | 'aktivitas';

export interface DetailAplikasiProps {
  /** Kode aplikasi (atau `sso:<id>` / `api:<id>` untuk klien tanpa katalog). */
  kode?: string | null;
  /** Data siap pakai (mis. dari daftar); tanpa ini diambil dari API. */
  aplikasi?: AplikasiTerpadu;
  tab?: TabDetailAplikasi;
  onTabChange?: (t: TabDetailAplikasi) => void;
  /** Tombol "Ubah" (bawaan: panel FormAplikasi). */
  onUbah?: (a: AplikasiTerpadu) => void;
  className?: string;
}

/** Halaman detail aplikasi: kepala dengan aksi, lalu tab ringkasan, login SSO, klien API, log API, dan log aktivitas. */
export function DetailAplikasi({ kode, aplikasi, tab, onTabChange, onUbah, className }: DetailAplikasiProps) {
  const q = useAplikasiTerpadu();
  const a = aplikasi ?? q.data?.find((x) => x.kunci === kode || x.kode === kode);
  const [ubah, setUbah] = React.useState(false);
  if (!a) {
    if (q.loading) return <Skeleton style={{ height: 320 }} />;
    return <Empty bordered icon={<AppWindow />} title="Aplikasi tidak ditemukan" description={q.error ? pesanGalat(q.error) : `Tidak ada aplikasi dengan kode ${kode ?? ''}.`} />;
  }
  const items: Array<{ value: TabDetailAplikasi; label: string; content: React.ReactNode; disabled?: boolean }> = [
    { value: 'ringkasan', label: 'Ringkasan', content: <TabRingkasan a={a} /> },
    { value: 'sso', label: 'Login SSO', content: <TabSso a={a} /> },
    { value: 'api', label: 'Klien API', content: <TabApi a={a} /> },
    {
      value: 'log',
      label: 'Log API',
      content: a.api ? <LogApi clientId={a.api.id} /> : <Empty title="Belum punya klien API" description="Log permintaan API muncul setelah aplikasi memakai klien API SIAKAD." />,
      disabled: !a.api,
    },
    { value: 'aktivitas', label: 'Aktivitas login', content: a.sso ? <LogAktivitas clientId={a.sso.id} /> : <Empty title="Belum memakai login SSO" />, disabled: !a.sso },
  ];
  return (
    <div className={cn('u-app-detail', className)}>
      <header className="u-app-detail-head">
        <IkonAplikasi nama={a.nama} kode={a.kode} src={a.logo} size="xl" />
        <div className="u-app-detail-title">
          <h2>{a.nama}</h2>
          <p>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                {hostDari(a.url)}
              </a>
            ) : (
              <code>{a.kode}</code>
            )}
            <span aria-hidden> · </span>
            {JENIS[a.jenis]?.label ?? a.jenis}
          </p>
          <LencanaAplikasi aplikasi={a} />
        </div>
        <div className="u-app-detail-actions">
          <GantiSecret aplikasi={a} />
          <Button variant="outline" onClick={() => (onUbah ? onUbah(a) : setUbah(true))}>
            <Pencil /> Ubah
          </Button>
        </div>
      </header>
      <Tabs items={items} value={tab} defaultValue={tab ? undefined : 'ringkasan'} onValueChange={onTabChange} />
      {!onUbah && <SheetUbahAplikasi aplikasi={ubah ? a : null} onOpenChange={(o) => !o && setUbah(false)} onTersimpan={q.refetch} />}
    </div>
  );
}

/** DetailAplikasi di panel samping. */
export function SheetDetailAplikasi({ kode, open, onOpenChange, aplikasi }: { kode?: string | null; aplikasi?: AplikasiTerpadu; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Detail aplikasi" size="xl">
      {open && <DetailAplikasi kode={kode} aplikasi={aplikasi} />}
    </Sheet>
  );
}

function Daftar({ isi, kosong = '–' }: { isi?: string[] | null; kosong?: string }) {
  if (!isi?.length) return <span className="u-app-muted">{kosong}</span>;
  return (
    <ul className="u-app-uris">
      {isi.map((x) => (
        <li key={x}>
          <code>{x}</code>
        </li>
      ))}
    </ul>
  );
}

function IdSalin({ id }: { id: string }) {
  return (
    <span className="u-app-id">
      <code>{id}</code>
      <CopyButton text={id} label="Salin client ID" />
    </span>
  );
}

function TabRingkasan({ a }: { a: AplikasiTerpadu }) {
  return (
    <div className="u-app-tab">
      <DescriptionList
        items={[
          { label: 'Kode', value: <code>{a.kode}</code> },
          { label: 'Jenis', value: JENIS[a.jenis]?.label ?? a.jenis },
          {
            label: 'Alamat',
            value: a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                {a.url}
              </a>
            ) : null,
          },
          ...(a.jenis === 'web' || a.jenis === 'mobile'
            ? [
                { label: 'Dasbor SSO', value: a.visibilitas === 'publik' ? 'Publik, tampil di dasbor SSO' : 'Privat, hanya terlihat di Pustikom' },
                { label: 'Unduh', value: a.url_android || a.url_ios ? <TautanAplikasi nama={a.nama} url_android={a.url_android} url_ios={a.url_ios} /> : null },
              ]
            : []),
          { label: 'Keterangan', value: a.keterangan || null },
          { label: 'Login SSO', value: a.sso ? <IdSalin id={a.sso.id} /> : 'Belum dipasang' },
          { label: 'Klien API', value: a.api ? <IdSalin id={a.api.id} /> : 'Belum dipasang' },
          {
            label: 'Siapa boleh login',
            value: a.sso ? (
              a.terbatas ? (
                <>
                  Pemegang izin <code>{a.sso.permission}</code>
                </>
              ) : (
                'Semua pengguna SIAKAD'
              )
            ) : null,
          },
          { label: 'Didaftarkan', value: a.rbac?.created_at || a.sso?.created_at || a.api?.created_at ? formatDate(a.rbac?.created_at || a.sso?.created_at || a.api?.created_at, 'long') : null },
        ]}
      />
      {a.api && (
        <section>
          <h3 className="u-app-subtitle">Pemakaian API 7 hari terakhir</h3>
          <RingkasanLogApi clientId={a.api.id} ringkas />
        </section>
      )}
    </div>
  );
}

function TabSso({ a }: { a: AplikasiTerpadu }) {
  const s = a.sso;
  if (!s) return <Empty icon={<ShieldCheck />} title="Belum memakai login SSO" description="Ubah aplikasi ini untuk memasang login lewat sso.unipo.ac.id." />;
  return (
    <DescriptionList
      className="u-app-tab"
      items={[
        { label: 'Client ID', value: <IdSalin id={s.id} /> },
        {
          label: 'Status',
          value: (
            <Badge variant={s.active ? 'success' : 'neutral'} dot>
              {s.active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          ),
        },
        { label: 'Alamat callback', value: <Daftar isi={s.redirect_uris} /> },
        { label: 'Setelah keluar', value: <Daftar isi={s.post_logout_redirect_uris} /> },
        { label: 'Logout serentak', value: s.frontchannel_logout_uri ? <code>{s.frontchannel_logout_uri}</code> : null },
        { label: 'Izin wajib', value: s.permission ? <code>{s.permission}</code> : 'Tidak ada (semua pengguna)' },
        { label: 'Level SIAKAD', value: s.levels?.length ? s.levels.join(', ') : 'Semua level' },
        { label: 'Alamat portal', value: s.portal_url || null },
        { label: 'Diubah', value: s.updated_at ? formatDate(s.updated_at, 'long') : null },
      ]}
    />
  );
}

/** Kelompokkan scope per sumber data: krs:read, krs:write → krs. */
function kelompokScope(scopes: string[]): Array<[string, string[]]> {
  const m = new Map<string, string[]>();
  for (const s of scopes) {
    const [g] = s.split(':');
    m.set(g!, [...(m.get(g!) ?? []), s]);
  }
  return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0]));
}

function TabApi({ a }: { a: AplikasiTerpadu }) {
  const k = a.api;
  if (!k) return <Empty icon={<KeyRound />} title="Belum punya klien API" description="Ubah aplikasi ini untuk memberi akses API SIAKAD." />;
  return (
    <DescriptionList
      className="u-app-tab"
      items={[
        { label: 'Client ID', value: <IdSalin id={k.id} /> },
        {
          label: 'Status',
          value: (
            <Badge variant={k.active ? 'success' : 'neutral'} dot>
              {k.active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          ),
        },
        { label: 'Database', value: k.lingkungan ? (k.lingkungan === 'live' ? 'Live' : 'Development (data tiruan)') : null },
        {
          label: `Scope (${k.scopes.length})`,
          value: (
            <span className="u-scope-chips">
              {k.scopes.map((s) => (
                <Badge key={s} variant={s.endsWith(':write') ? 'warning' : 'neutral'} shape="square">
                  {s}
                </Badge>
              ))}
            </span>
          ),
        },
        {
          label: 'Token pengguna',
          value: [k.sso_audience && `tukar login SSO (${k.sso_audience})`, k.allow_user_login && 'login username/password'].filter(Boolean).join(', ') || 'Tidak (hanya token aplikasi)',
        },
        { label: 'Batas IP', value: <Daftar isi={k.allowed_ips} kosong="Semua IP" /> },
        { label: 'Origin browser', value: <Daftar isi={k.allowed_origins} kosong="Tidak ada (CORS tertutup)" /> },
        { label: 'Batas permintaan', value: k.rate_limit ? `${formatNumber(k.rate_limit)} per menit` : 'Bawaan server' },
      ]}
    />
  );
}

// ================================================================ Secret sekali lihat
export interface IsiRahasia {
  label: string;
  nilai: string;
  /** Disamarkan sampai ditampilkan. */
  rahasia?: boolean;
}

export interface SecretSekaliProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  judul?: React.ReactNode;
  isi: IsiRahasia[];
  /** Isi .env siap tempel. */
  env?: string;
}

/**
 * Menampilkan client secret yang hanya muncul sekali: tersamar, bisa ditampilkan dan disalin, isi .env siap tempel,
 * dan tombol tutup baru aktif setelah admin mencentang "sudah saya simpan".
 */
export function SecretSekali({ open, onOpenChange, judul = 'Simpan kredensial ini', isi, env }: SecretSekaliProps) {
  const [simpan, setSimpan] = React.useState(false);
  const [lihat, setLihat] = React.useState<Record<number, boolean>>({});
  React.useEffect(() => {
    if (open) (setSimpan(false), setLihat({}));
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o || simpan) && onOpenChange(o)}
      title={judul}
      description="Secret hanya ditampilkan sekali. Setelah dialog ini ditutup, secret tidak bisa dilihat lagi; yang bisa dilakukan hanya membuat secret baru."
      size="lg"
      footer={
        <>
          <label className="u-secret-ack">
            <Checkbox checked={simpan} onCheckedChange={(v) => setSimpan(v === true)} /> Sudah saya simpan di tempat aman
          </label>
          <Button disabled={!simpan} onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </>
      }
    >
      <div className="u-secret">
        {isi.map((r, i) => (
          <Field key={r.label} label={r.label}>
            <InputGroup
              end={
                <span className="u-secret-tools">
                  {r.rahasia && (
                    <Button variant="ghost" size="xs" iconOnly aria-label={lihat[i] ? 'Sembunyikan' : 'Tampilkan'} onClick={() => setLihat((l) => ({ ...l, [i]: !l[i] }))}>
                      {lihat[i] ? <EyeOff /> : <Eye />}
                    </Button>
                  )}
                  <CopyButton text={r.nilai} label={`Salin ${r.label}`} />
                </span>
              }
            >
              <Input readOnly value={r.rahasia && !lihat[i] ? '•'.repeat(Math.min(32, r.nilai.length)) : r.nilai} className="u-mono" onFocus={(e) => e.currentTarget.select()} />
            </InputGroup>
          </Field>
        ))}
        {env && <CodeBlock code={env} language="bash" filename=".env" lineNumbers={false} />}
      </div>
    </Dialog>
  );
}

/** Isi .env untuk aplikasi integrasi. */
export function teksEnv(o: { issuer?: string; siakad?: string; sso?: { id: string; secret: string }; api?: { id: string; secret: string } }): string {
  const b: string[] = [];
  if (o.sso) b.push(`SSO_ISSUER=${o.issuer ?? 'https://sso.unipo.ac.id'}`, `SSO_CLIENT_ID=${o.sso.id}`, `SSO_CLIENT_SECRET=${o.sso.secret}`);
  if (o.api) b.push(`SIAKAD_API_URL=${(o.siakad ?? 'https://siakad.unipo.ac.id').replace(/\/$/, '')}/api`, `SIAKAD_API_CLIENT_ID=${o.api.id}`, `SIAKAD_API_CLIENT_SECRET=${o.api.secret}`);
  return b.join('\n');
}

/** Tombol ganti secret SSO/API dengan konfirmasi, lalu tampilkan secret baru sekali. */
export function GantiSecret({ aplikasi: a, issuer, siakadUrl }: { aplikasi: AplikasiTerpadu; issuer?: string; siakadUrl?: string }) {
  const siakad = useOptionalSiakad();
  const sso = useSsoAdmin();
  const [target, setTarget] = React.useState<'sso' | 'api' | null>(null);
  const [hasil, setHasil] = React.useState<{ judul: string; isi: IsiRahasia[]; env: string } | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  if (!a.sso && !a.api) return null;
  const jalan = async () => {
    setGalat(null);
    try {
      if (target === 'sso' && a.sso && sso) {
        const r = await sso.request<{ client_secret: string }>('POST', `/clients/${a.sso.id}/secret`);
        setHasil({
          judul: `Secret SSO baru ${a.nama}`,
          isi: [
            { label: 'Client ID SSO', nilai: a.sso.id },
            { label: 'Client secret SSO', nilai: r.data.client_secret, rahasia: true },
          ],
          env: teksEnv({ issuer, sso: { id: a.sso.id, secret: r.data.client_secret } }),
        });
      } else if (target === 'api' && a.api && siakad) {
        const r = await siakad.request<{ client_secret: string }>({ method: 'POST', path: `${A}/klien-api/${a.api.id}/secret` });
        setHasil({
          judul: `Secret API baru ${a.nama}`,
          isi: [
            { label: 'Client ID API', nilai: a.api.id },
            { label: 'Client secret API', nilai: r.data.client_secret, rahasia: true },
          ],
          env: teksEnv({ siakad: siakadUrl, api: { id: a.api.id, secret: r.data.client_secret } }),
        });
      }
    } catch (e) {
      setGalat(pesanGalat(e));
    }
  };
  return (
    <>
      {a.sso && (
        <Button variant="outline" onClick={() => setTarget('sso')}>
          <RefreshCw /> Secret SSO
        </Button>
      )}
      {a.api && (
        <Button variant="outline" onClick={() => setTarget('api')}>
          <RefreshCw /> Secret API
        </Button>
      )}
      <ConfirmDialog
        open={target != null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`Ganti secret ${target === 'sso' ? 'SSO' : 'API'} ${a.nama}?`}
        description="Secret lama langsung tidak berlaku. Aplikasi berhenti bisa login/memanggil API sampai .env-nya diisi secret baru."
        confirmLabel="Ganti secret"
        tone="warning"
        icon={<TriangleAlert />}
        onConfirm={jalan}
      />
      {galat && (
        <Alert variant="danger" className="u-app-inline-alert">
          {galat}
        </Alert>
      )}
      <SecretSekali open={hasil != null} onOpenChange={(o) => !o && setHasil(null)} judul={hasil?.judul} isi={hasil?.isi ?? []} env={hasil?.env} />
    </>
  );
}

// ================================================================ Pemilih scope
const AKSI: Record<string, string> = { read: 'Baca', write: 'Tulis', admin: 'Kelola' };
const kapital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export interface PilihScopeProps {
  value: string[];
  onValueChange: (v: string[]) => void;
  /** Katalog { scope: keterangan }; bawaan diambil dari /v1/rbac/klien-api/scope. */
  katalog?: Record<string, string>;
  /** Tinggi maksimum daftar (bawaan 22rem). */
  maxHeight?: string;
  className?: string;
}

/** Pilih scope API per sumber data: baris per sumber (krs, nilai, mahasiswa) dengan centang Baca/Tulis, pencarian, dan jumlah terpilih. */
export function PilihScope({ value, onValueChange, katalog: katalogProp, maxHeight = '22rem', className }: PilihScopeProps) {
  const q = useKatalogScope();
  const katalog = katalogProp ?? q.data ?? {};
  const [cari, setCari] = React.useState('');
  const kata = cari.trim().toLowerCase();
  const grup = kelompokScope(Object.keys(katalog)).filter(([g, list]) => !kata || g.includes(kata) || list.some((s) => katalog[s]?.toLowerCase().includes(kata)));
  const pilih = new Set(value);
  const ganti = (s: string, on: boolean) => onValueChange(on ? [...value, s] : value.filter((x) => x !== s));
  if (!katalogProp && q.loading && !q.data) return <Skeleton style={{ height: 160 }} />;
  if (!katalogProp && q.error)
    return (
      <Alert variant="danger">
        {pesanGalat(q.error, { kode: false })}
        <KodeLaporan error={q.error} />
      </Alert>
    );
  return (
    <div className={cn('u-scope-picker', className)}>
      <div className="u-scope-picker-head">
        <InputGroup start={<Search />} size="sm">
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari scope" aria-label="Cari scope" size="sm" />
        </InputGroup>
        <span className="u-scope-count">{formatNumber(value.length)} dipilih</span>
        {value.length > 0 && (
          <Button variant="ghost" size="xs" onClick={() => onValueChange([])}>
            Kosongkan
          </Button>
        )}
      </div>
      <ul className="u-scope-rows" style={{ maxHeight }}>
        {grup.map(([g, list]) => (
          <li key={g}>
            <span className="u-scope-name">
              <strong>{g}</strong>
              <small>{kapital(katalog[list[0]!]?.replace(/^(Baca|Tulis|Ubah|Kelola|Impor)\s+/i, '') ?? '')}</small>
            </span>
            <span className="u-scope-actions">
              {list.map((s) => {
                const aksi = s.split(':')[1] ?? s;
                return (
                  <label key={s} title={katalog[s]} data-tulis={aksi !== 'read' ? '' : undefined} style={{ gridColumn: aksi === 'read' ? 1 : 2 }}>
                    <Checkbox checked={pilih.has(s)} onCheckedChange={(v) => ganti(s, v === true)} aria-label={s} />
                    {AKSI[aksi] ?? aksi}
                  </label>
                );
              })}
            </span>
          </li>
        ))}
        {!grup.length && <li className="u-scope-empty">Tidak ada scope yang cocok.</li>}
      </ul>
    </div>
  );
}

// ================================================================ Visibilitas & unduhan
const urlHttps = (u: string) => /^https:\/\/[^\s/]+\.[^\s]+$/.test(u.trim());

/** Pesan galat isian unduhan (aturan sama dengan /v1/rbac/aplikasi): mobile publik wajib punya tautan Android atau iOS. */
export function galatUnduhan(jenis: JenisAplikasi, visibilitas: Visibilitas, android: string, ios: string): string | undefined {
  if (android.trim() && !urlHttps(android)) return 'Tautan Android harus alamat https://.';
  if (ios.trim() && !urlHttps(ios)) return 'Tautan iOS harus alamat https://.';
  if (jenis === 'mobile' && visibilitas === 'publik' && !android.trim() && !ios.trim()) return 'Aplikasi mobile publik perlu tautan unduh Android atau iOS.';
}

/** Pilihan publik/privat aplikasi di dasbor SSO. */
export function PilihVisibilitas({ value, onValueChange }: { value: Visibilitas; onValueChange: (v: Visibilitas) => void }) {
  return (
    <SegmentedControl<Visibilitas>
      value={value}
      onValueChange={onValueChange}
      fullWidth
      options={[
        { value: 'publik', label: 'Publik', icon: <Eye />, 'aria-label': 'Publik: tampil di dasbor SSO dan daftar aplikasi kampus' },
        { value: 'privat', label: 'Privat', icon: <EyeOff />, 'aria-label': 'Privat: hanya terlihat di Pustikom' },
      ]}
    />
  );
}

function IsianUnduhan({ android, ios, onAndroid, onIos }: { android: string; ios: string; onAndroid: (v: string) => void; onIos: (v: string) => void }) {
  return (
    <>
      <Field
        label={
          <>
            <IkonAndroid /> Tautan Android
          </>
        }
        optional
        description="Google Play atau APK."
      >
        <Input value={android} onChange={(e) => onAndroid(e.target.value)} placeholder="https://play.google.com/store/apps/details?id=…" className="u-mono" />
      </Field>
      <Field
        label={
          <>
            <IkonApple /> Tautan iOS
          </>
        }
        optional
        description="App Store atau TestFlight."
      >
        <Input value={ios} onChange={(e) => onIos(e.target.value)} placeholder="https://apps.apple.com/app/…" className="u-mono" />
      </Field>
    </>
  );
}

// ================================================================ Wizard aplikasi baru
export interface InputAplikasiBaru {
  kode: string;
  nama: string;
  keterangan: string;
  jenis: JenisAplikasi;
  url: string;
  /** Bawaan publik. */
  visibilitas?: Visibilitas;
  url_android?: string;
  url_ios?: string;
  logo?: string | null;
  sso?: { redirect_uris: string[]; post_logout_redirect_uris: string[]; frontchannel_logout_uri: string; portal_url: string } | null;
  batasiLogin: boolean;
  peranAkses: number[];
  api?: { scopes: string[]; allow_user_login: boolean; tukarSso: boolean; allowed_ips: string[]; allowed_origins: string[] } | null;
}

export interface HasilAplikasiBaru {
  aplikasi: AplikasiRbac;
  sso?: { id: string; secret: string };
  api?: { id: string; secret: string };
  peringatan: string[];
}

/**
 * Buat aplikasi lengkap: katalog → izin <kode>.akses + peran → klien SSO (+ logo) → klien API → tautan.
 * Langkah setelah katalog yang gagal tidak membatalkan semuanya; dikembalikan sebagai peringatan.
 */
export async function buatAplikasiLengkap(siakad: Siakad, sso: SsoAdminClient | null, x: InputAplikasiBaru): Promise<HasilAplikasiBaru> {
  const peringatan: string[] = [];
  const req = <T,>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, query?: Record<string, string | number>) => siakad.request<T>({ method, path, body, query });
  let app = (
    await req<AplikasiRbac>('POST', `${A}/aplikasi`, {
      kode: x.kode,
      nama: x.nama,
      keterangan: x.keterangan || null,
      jenis: x.jenis,
      url: x.url || null,
      visibilitas: x.visibilitas ?? 'publik',
      url_android: x.url_android || null,
      url_ios: x.url_ios || null,
      aktif: true,
    })
  ).data;
  const hasil: HasilAplikasiBaru = { aplikasi: app, peringatan };
  const tautan: Partial<AplikasiRbac> = {};
  const galat = (e: unknown) => (e instanceof Error ? e.message : String(e));
  let izin = '';
  if (x.batasiLogin || x.peranAkses.length) {
    try {
      izin = `${x.kode}.akses`;
      const ada = await req<unknown[]>('GET', `${A}/izin`, undefined, { kode: izin, per_page: 1 });
      if (!ada.data.length)
        await req('POST', `${A}/izin`, {
          aplikasi_id: app.id,
          kode: izin,
          jenis: 'akses',
          grup: 'Akses',
          nama: `Masuk ${x.nama}`,
          keterangan: `Boleh login ke ${x.nama} lewat SSO`,
          berlingkup: false,
        });
      for (const p of x.peranAkses) await req('POST', `${A}/peran-izin`, { peran_id: p, izin });
    } catch (e) {
      peringatan.push(`Hak akses login belum lengkap: ${galat(e)}`);
    }
  }
  if (x.sso) {
    if (!sso) peringatan.push('Klien SSO belum dibuat: klien admin SSO belum dipasang.');
    else
      try {
        const r = await sso.request<KlienSso & { client_secret: string }>('POST', '/clients', {
          body: {
            id: idSsoDariKode(x.kode),
            name: x.nama,
            description: x.keterangan,
            ...x.sso,
            permission: x.batasiLogin ? izin : '',
            visibility: x.visibilitas === 'privat' ? 'private' : 'public',
            android_url: x.url_android || '',
            ios_url: x.url_ios || '',
          },
        });
        hasil.sso = { id: r.data.id, secret: r.data.client_secret };
        tautan.client_id_sso = r.data.id;
        if (x.logo) await sso.request('POST', `/clients/${r.data.id}/logo`, { body: { data: x.logo } }).catch((e) => peringatan.push(`Logo belum terpasang: ${galat(e)}`));
      } catch (e) {
        peringatan.push(`Klien SSO gagal dibuat: ${galat(e)}`);
      }
  }
  if (x.api) {
    try {
      const { tukarSso, ...input } = x.api;
      const r = await req<KlienApi & { client_id: string; client_secret: string }>('POST', `${A}/klien-api`, { name: x.nama, ...input, sso_audience: tukarSso && hasil.sso ? hasil.sso.id : null });
      hasil.api = { id: r.data.client_id ?? r.data.id, secret: r.data.client_secret };
      tautan.client_id_api = hasil.api.id;
    } catch (e) {
      peringatan.push(`Klien API gagal dibuat: ${galat(e)}`);
    }
  }
  if (Object.keys(tautan).length) {
    try {
      app = (await req<AplikasiRbac>('PUT', `${A}/aplikasi/${app.id}`, tautan)).data;
      hasil.aplikasi = app;
    } catch (e) {
      peringatan.push(`Klien belum tertaut ke aplikasi: ${galat(e)}`);
    }
  }
  return hasil;
}

const slug = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

function bacaDataUri(f: File): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => gagal(new Error('Berkas tidak bisa dibaca.'));
    r.readAsDataURL(f);
  });
}

/** Pilihan besar dengan sakelar: ikon, judul, penjelasan. */
function Opsi({ icon, judul, teks, value, onChange }: { icon: React.ReactNode; judul: string; teks: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="u-app-option" data-on={value ? '' : undefined}>
      <span className="u-app-option-icon">{icon}</span>
      <span className="u-app-option-text">
        <strong>{judul}</strong>
        <span>{teks}</span>
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

function PilihLogo({ value, onChange, nama }: { value: string | null; onChange: (v: string | null) => void; nama: string }) {
  return (
    <div className="u-app-logo-pick">
      <IkonAplikasi nama={nama || '?'} src={value} size="xl" />
      <TombolPilihBerkas accept="image/png,image/jpeg,image/webp" onFiles={async (f) => onChange(await bacaDataUri(f[0]!))}>
        <ImagePlus /> {value ? 'Ganti logo' : 'Pilih logo'}
      </TombolPilihBerkas>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Hapus
        </Button>
      )}
      <small>PNG, JPG, atau WebP, maks 2 MB.</small>
    </div>
  );
}

export interface WizardAplikasiProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSelesai?: (h: HasilAplikasiBaru) => void;
  /** Ganti cara membuat (mis. lewat endpoint BFF sendiri). Bawaan: buatAplikasiLengkap. */
  buat?: (x: InputAplikasiBaru) => Promise<HasilAplikasiBaru>;
  /** Kode yang sudah dipakai (validasi). Bawaan dari katalog. */
  kodeTerpakai?: string[];
  issuer?: string;
  siakadUrl?: string;
  /** 'dialog' (bawaan) atau 'halaman' untuk dipasang langsung di halaman (mis. /aplikasi/baru); `open` diabaikan. */
  tampilan?: 'dialog' | 'halaman';
}

/**
 * Wizard modal membuat aplikasi integrasi: identitas → login SSO → hak akses login → akses API → periksa,
 * lalu secret ditampilkan sekali beserta isi .env.
 */
export function WizardAplikasi({ open: openProp, onOpenChange, onSelesai, buat, kodeTerpakai, issuer, siakadUrl, tampilan = 'dialog' }: WizardAplikasiProps) {
  const open = tampilan === 'halaman' || openProp;
  const siakad = useOptionalSiakad();
  const sso = useSsoAdmin();
  const rbac = useAplikasiRbac();
  const peran = usePeranRbac();
  const [step, setStep] = React.useState(0);
  const [hasil, setHasil] = React.useState<HasilAplikasiBaru | null>(null);
  const [nama, setNama] = React.useState('');
  const [kode, setKode] = React.useState('');
  const [kodeManual, setKodeManual] = React.useState(false);
  const [jenis, setJenis] = React.useState<JenisAplikasi>('web');
  const [url, setUrl] = React.useState('https://');
  const [visibilitas, setVisibilitas] = React.useState<Visibilitas>('publik');
  const [android, setAndroid] = React.useState('');
  const [ios, setIos] = React.useState('');
  const [ket, setKet] = React.useState('');
  const [logo, setLogo] = React.useState<string | null>(null);
  const [pakaiSso, setPakaiSso] = React.useState(true);
  const [callback, setCallback] = React.useState('');
  const [keluar, setKeluar] = React.useState('');
  const [fc, setFc] = React.useState('');
  const [batasi, setBatasi] = React.useState(true);
  const [peranAkses, setPeranAkses] = React.useState<number[]>([]);
  const [pakaiApi, setPakaiApi] = React.useState(false);
  const [scopes, setScopes] = React.useState<string[]>(['referensi:read']);
  const [tukar, setTukar] = React.useState(true);
  const [langsung, setLangsung] = React.useState(false);
  const [ips, setIps] = React.useState('');
  const [origins, setOrigins] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setStep(0);
    setHasil(null);
  }, [open]);

  const dasar = url.replace(/\/+$/, '');
  const urlValid = /^https?:\/\/[^\s/]+\.[^\s/]+/.test(dasar);
  const cb = callback || (urlValid ? `${dasar}/sso/callback` : '');
  const terpakai = kodeTerpakai ?? rbac.data?.map((a) => a.kode) ?? [];
  const daftarPeran = (peran.data ?? []).filter((p) => p.aktif);

  const input = (): InputAplikasiBaru => ({
    kode,
    nama: nama.trim(),
    keterangan: ket.trim(),
    jenis,
    url: urlValid ? dasar : '',
    visibilitas,
    url_android: jenis === 'mobile' ? android.trim() : '',
    url_ios: jenis === 'mobile' ? ios.trim() : '',
    logo,
    sso: pakaiSso ? { redirect_uris: daftarTeks(cb), post_logout_redirect_uris: daftarTeks(keluar || `${dasar}/`), frontchannel_logout_uri: fc.trim(), portal_url: dasar } : null,
    batasiLogin: pakaiSso && batasi,
    peranAkses: pakaiSso && batasi ? peranAkses : [],
    api: pakaiApi ? { scopes, allow_user_login: langsung, tukarSso: pakaiSso && tukar, allowed_ips: daftarTeks(ips), allowed_origins: daftarTeks(origins) } : null,
  });

  const steps = [
    {
      id: 'identitas',
      title: 'Identitas',
      description: 'Nama, kode, dan alamat',
      icon: <AppWindow />,
      onNext: () => {
        if (!nama.trim()) return 'Nama aplikasi wajib diisi.';
        if (!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(kode)) return 'Kode: huruf kecil, angka, - atau _, 2 sampai 40 karakter.';
        if (terpakai.includes(kode)) return `Kode ${kode} sudah dipakai aplikasi lain.`;
        if (pakaiSso && !urlValid && jenis !== 'mobile') return 'Alamat aplikasi wajib diisi (https://...).';
        const salah = galatUnduhan(jenis, visibilitas, android, ios);
        if (salah) return salah;
      },
      content: (
        <FormGrid>
          <div className="u-span-2">
            <PilihLogo value={logo} onChange={setLogo} nama={nama} />
          </div>
          <Field label="Nama aplikasi" required className="u-span-2">
            <Input
              value={nama}
              placeholder="mis. E-Learning UNIPO"
              onChange={(e) => {
                setNama(e.target.value);
                if (!kodeManual) setKode(slug(e.target.value));
              }}
            />
          </Field>
          <Field label="Kode" required description={`Awalan izin (${kode || 'kode'}.akses) dan client ID SSO. Tidak bisa diganti.`}>
            <Input value={kode} className="u-mono" placeholder="elearning" onChange={(e) => (setKode(e.target.value.toLowerCase()), setKodeManual(true))} />
          </Field>
          <Field label="Jenis">
            <SegmentedControl<JenisAplikasi>
              value={jenis}
              onValueChange={setJenis}
              fullWidth
              options={(Object.keys(JENIS) as JenisAplikasi[]).map((j) => ({ value: j, label: JENIS[j].pendek, icon: JENIS[j].icon, 'aria-label': JENIS[j].label }))}
            />
          </Field>
          <Field
            label="Alamat aplikasi"
            className="u-span-2"
            description={jenis === 'mobile' ? 'Opsional untuk aplikasi mobile: versi web bila ada.' : 'Tombol Buka di dasbor SSO dan alamat callback bawaan.'}
          >
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://elearning.unipo.ac.id" />
          </Field>
          {jenis === 'mobile' && <IsianUnduhan android={android} ios={ios} onAndroid={setAndroid} onIos={setIos} />}
          <Field label="Tampil di dasbor SSO" className="u-span-2">
            <PilihVisibilitas value={visibilitas} onValueChange={setVisibilitas} />
          </Field>
          <Field label="Keterangan" optional className="u-span-2">
            <Textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} maxLength={255} />
          </Field>
        </FormGrid>
      ),
    },
    {
      id: 'sso',
      title: 'Login SSO',
      description: 'Masuk dengan akun SIAKAD',
      icon: <ShieldCheck />,
      onNext: () => (pakaiSso && !daftarTeks(cb).length ? 'Alamat callback wajib diisi.' : undefined),
      content: (
        <div className="u-app-step">
          <Opsi
            icon={<ShieldCheck />}
            judul="Login lewat SSO UNIPO"
            teks="Pengguna masuk dengan akun SIAKAD di sso.unipo.ac.id dan aplikasi tampil di portal SSO."
            value={pakaiSso}
            onChange={setPakaiSso}
          />
          {pakaiSso && (
            <FormGrid>
              <Field label="Alamat callback" required className="u-span-2" description="Satu per baris. Harus persis sama dengan yang dipakai aplikasi.">
                <Textarea value={cb} onChange={(e) => setCallback(e.target.value)} rows={2} className="u-mono" />
              </Field>
              <Field label="Alamat setelah keluar">
                <Input value={keluar || (urlValid ? `${dasar}/` : '')} onChange={(e) => setKeluar(e.target.value)} className="u-mono" />
              </Field>
              <Field label="Logout serentak" optional description="Dibuka SSO saat pengguna keluar dari aplikasi lain.">
                <Input value={fc} onChange={(e) => setFc(e.target.value)} placeholder={urlValid ? `${dasar}/sso/logout` : ''} className="u-mono" />
              </Field>
            </FormGrid>
          )}
        </div>
      ),
    },
    {
      id: 'hak',
      title: 'Hak akses',
      description: 'Siapa yang boleh masuk',
      icon: <Lock />,
      optional: true,
      content: !pakaiSso ? (
        <Empty title="Tanpa login SSO" description="Aplikasi ini tidak memakai login SSO, jadi tidak perlu batas pengguna. Lanjutkan ke akses API." />
      ) : (
        <div className="u-app-step">
          <Opsi
            icon={<Lock />}
            judul="Hanya peran tertentu yang boleh login"
            teks={`Pengguna wajib memegang izin ${kode || 'kode'}.akses; aplikasi juga disembunyikan dari portal pengguna lain.`}
            value={batasi}
            onChange={setBatasi}
          />
          {batasi && (
            <Field label="Peran yang boleh masuk" description="Administrator selalu bisa masuk. Peran turunan ikut mewarisi.">
              {peran.loading && !peran.data ? (
                <Skeleton style={{ height: 120 }} />
              ) : (
                <div className="u-app-roles">
                  {daftarPeran.map((p) => (
                    <label key={p.id}>
                      <Checkbox checked={peranAkses.includes(p.id)} onCheckedChange={(v) => setPeranAkses(v === true ? [...peranAkses, p.id] : peranAkses.filter((x) => x !== p.id))} />
                      <span>
                        <strong>{p.nama}</strong>
                        <code>{p.kode}</code>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Field>
          )}
        </div>
      ),
    },
    {
      id: 'api',
      title: 'Akses API',
      description: 'Data SIAKAD yang boleh dipakai',
      icon: <KeyRound />,
      onNext: () => (pakaiApi && !scopes.length ? 'Pilih minimal satu scope.' : undefined),
      content: (
        <div className="u-app-step">
          <Opsi icon={<KeyRound />} judul="Butuh akses API SIAKAD" teks="Membuat klien API untuk membaca atau menulis data SIAKAD sesuai scope yang dipilih." value={pakaiApi} onChange={setPakaiApi} />
          {pakaiApi && (
            <>
              <Field label="Scope">
                <PilihScope value={scopes} onValueChange={setScopes} maxHeight="15rem" />
              </Field>
              <div className="u-app-checks">
                {pakaiSso && (
                  <label>
                    <Checkbox checked={tukar} onCheckedChange={(v) => setTukar(v === true)} />
                    <span>
                      <strong>Tukar login SSO menjadi token API pengguna</strong>
                      <small>Disarankan: aplikasi memakai id_token SSO untuk token API atas nama pengguna.</small>
                    </span>
                  </label>
                )}
                <label>
                  <Checkbox checked={langsung} onCheckedChange={(v) => setLangsung(v === true)} />
                  <span>
                    <strong>Izinkan login username/password langsung ke API</strong>
                    <small>Hanya untuk aplikasi tepercaya; lebih aman lewat SSO.</small>
                  </span>
                </label>
              </div>
              <FormGrid>
                <Field label="Batas IP server" optional description="IP atau CIDR, satu per baris.">
                  <Textarea value={ips} onChange={(e) => setIps(e.target.value)} rows={2} className="u-mono" />
                </Field>
                <Field label="Origin browser" optional description="Untuk memanggil API dari browser (CORS).">
                  <Textarea value={origins} onChange={(e) => setOrigins(e.target.value)} rows={2} className="u-mono" placeholder={urlValid ? dasar : ''} />
                </Field>
              </FormGrid>
            </>
          )}
        </div>
      ),
    },
    {
      id: 'periksa',
      title: 'Periksa',
      description: 'Tinjau sebelum dibuat',
      icon: <AppWindow />,
      content: hasil ? (
        <div className="u-app-step">
          <Alert variant="success" title={`${hasil.aplikasi.nama} sudah terdaftar`}>
            {hasil.sso ? `Login SSO aktif (client ${hasil.sso.id}). ` : ''}
            {hasil.api ? `Klien API ${hasil.api.id} dibuat. ` : ''}
            Pengaturan lain bisa diubah di halaman aplikasi.
          </Alert>
          {hasil.peringatan.map((p) => (
            <Alert key={p} variant="warning">
              {p}
            </Alert>
          ))}
        </div>
      ) : (
        <div className="u-app-step">
          <div className="u-app-review-head">
            <IkonAplikasi nama={nama} src={logo} size="lg" />
            <div>
              <strong>{nama || 'Tanpa nama'}</strong>
              <span>
                <code>{kode}</code> · {JENIS[jenis].label}
              </span>
            </div>
          </div>
          <WizardReview
            sections={[
              {
                title: 'Identitas',
                onEdit: () => setStep(0),
                items: [
                  { label: 'Alamat', value: urlValid ? dasar : '–' },
                  { label: 'Dasbor SSO', value: visibilitas === 'publik' ? 'Publik' : 'Privat' },
                  ...(jenis === 'mobile' ? [{ label: 'Unduh', value: [android.trim() && 'Android', ios.trim() && 'iOS'].filter(Boolean).join(', ') || '–' }] : []),
                  { label: 'Keterangan', value: ket || '–' },
                ],
              },
              {
                title: 'Login SSO',
                onEdit: () => setStep(1),
                items: pakaiSso
                  ? [
                      { label: 'Client ID', value: idSsoDariKode(kode) },
                      { label: 'Callback', value: daftarTeks(cb).join(', ') },
                    ]
                  : [{ label: 'Login SSO', value: 'Tidak dipakai' }],
              },
              {
                title: 'Hak akses',
                onEdit: () => setStep(2),
                items: [
                  {
                    label: 'Boleh login',
                    value: pakaiSso
                      ? batasi
                        ? `Pemegang ${kode}.akses${
                            peranAkses.length
                              ? `: ${daftarPeran
                                  .filter((p) => peranAkses.includes(p.id))
                                  .map((p) => p.nama)
                                  .join(', ')}`
                              : ' (administrator)'
                          }`
                        : 'Semua pengguna SIAKAD'
                      : '–',
                  },
                ],
              },
              {
                title: 'Akses API',
                onEdit: () => setStep(3),
                items: pakaiApi
                  ? [
                      { label: 'Scope', value: scopes.join(', ') },
                      { label: 'Token pengguna', value: [pakaiSso && tukar && 'tukar SSO', langsung && 'login langsung'].filter(Boolean).join(', ') || 'Tidak' },
                    ]
                  : [{ label: 'API SIAKAD', value: 'Tidak dipakai' }],
              },
            ]}
          />
          <Alert variant="info">Secret SSO dan API hanya ditampilkan sekali setelah dibuat. Siapkan tempat menyimpannya.</Alert>
        </div>
      ),
    },
  ];

  const selesai = async () => {
    if (hasil) {
      onOpenChange(false);
      return;
    }
    if (!buat && !siakad) return 'SDK SIAKAD belum dipasang.';
    try {
      const h = await (buat ? buat(input()) : buatAplikasiLengkap(siakad!, sso, input()));
      setHasil(h);
      invalidateSiakad('rbac');
      invalidateSso();
      onSelesai?.(h);
    } catch (e) {
      return pesanGalat(e);
    }
  };

  return (
    <>
      {tampilan === 'halaman' ? (
        <Wizard
          steps={steps}
          step={step}
          onStepChange={setStep}
          onFinish={selesai}
          finishLabel={hasil ? 'Selesai' : 'Buat aplikasi'}
          nextLabel="Lanjut"
          title="Aplikasi baru"
          description="Login SSO, hak akses, dan akses API SIAKAD."
        />
      ) : (
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
          title="Aplikasi baru"
          description="Daftarkan aplikasi integrasi: login SSO, hak akses, dan akses API SIAKAD."
          size="xl"
          className="u-app-wizard"
        >
          <Wizard steps={steps} step={step} onStepChange={setStep} onFinish={selesai} finishLabel={hasil ? 'Tutup' : 'Buat aplikasi'} nextLabel="Lanjut" />
        </Dialog>
      )}
      <SecretSekali
        open={!!hasil && !!(hasil.sso || hasil.api) && open}
        onOpenChange={() => setHasil((h) => (h ? { ...h, sso: undefined, api: undefined } : h))}
        judul={hasil ? `Kredensial ${hasil.aplikasi.nama}` : undefined}
        isi={[
          ...(hasil?.sso
            ? [
                { label: 'Client ID SSO', nilai: hasil.sso.id },
                { label: 'Client secret SSO', nilai: hasil.sso.secret, rahasia: true },
              ]
            : []),
          ...(hasil?.api
            ? [
                { label: 'Client ID API SIAKAD', nilai: hasil.api.id },
                { label: 'Client secret API SIAKAD', nilai: hasil.api.secret, rahasia: true },
              ]
            : []),
        ]}
        env={hasil ? teksEnv({ issuer, siakad: siakadUrl, sso: hasil.sso, api: hasil.api }) : undefined}
      />
    </>
  );
}

// ================================================================ Ubah aplikasi
export interface FormAplikasiProps {
  aplikasi: AplikasiTerpadu;
  onTersimpan?: () => void;
  onBatal?: () => void;
  className?: string;
}

/**
 * Formulir ubah aplikasi: identitas (katalog), login SSO (callback, logout, batas izin, aktif), dan klien API
 * (scope, IP, origin, batas permintaan, aktif). Hanya bagian yang berubah yang dikirim.
 */
export function FormAplikasi({ aplikasi: a, onTersimpan, onBatal, className }: FormAplikasiProps) {
  const siakad = useOptionalSiakad();
  const sso = useSsoAdmin();
  const [nama, setNama] = React.useState(a.nama);
  const [ket, setKet] = React.useState(a.keterangan ?? '');
  const [url, setUrl] = React.useState(a.url ?? '');
  const [aktif, setAktif] = React.useState(a.aktif);
  const [visibilitas, setVisibilitas] = React.useState<Visibilitas>(a.visibilitas);
  const [android, setAndroid] = React.useState(a.url_android ?? '');
  const [ios, setIos] = React.useState(a.url_ios ?? '');
  const [logo, setLogo] = React.useState<string | null>(a.logo);
  const [cb, setCb] = React.useState(a.sso?.redirect_uris.join('\n') ?? '');
  const [keluar, setKeluar] = React.useState(a.sso?.post_logout_redirect_uris.join('\n') ?? '');
  const [fc, setFc] = React.useState(a.sso?.frontchannel_logout_uri ?? '');
  const [batasi, setBatasi] = React.useState(a.terbatas);
  const [scopes, setScopes] = React.useState(a.api?.scopes ?? []);
  const [ips, setIps] = React.useState(a.api?.allowed_ips.join('\n') ?? '');
  const [origins, setOrigins] = React.useState(a.api?.allowed_origins.join('\n') ?? '');
  const [rate, setRate] = React.useState(a.api?.rate_limit ? String(a.api.rate_limit) : '');
  const [langsung, setLangsung] = React.useState(a.api?.allow_user_login ?? false);
  const [kirim, setKirim] = React.useState(false);
  const [galat, setGalat] = React.useState<string[]>([]);
  const sama = (x: string[], y: string[]) => x.length === y.length && x.every((v, i) => v === y[i]);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const salah = galatUnduhan(a.jenis, visibilitas, android, ios);
    if (salah) return setGalat([salah]);
    setKirim(true);
    const g: string[] = [];
    const req = (method: 'PUT' | 'PATCH', path: string, body: unknown) => siakad!.request({ method, path, body });
    const unduhBerubah = visibilitas !== (a.rbac?.visibilitas ?? 'publik') || android !== (a.rbac?.url_android ?? '') || ios !== (a.rbac?.url_ios ?? '');
    if (a.rbac && siakad && (nama !== a.rbac.nama || ket !== (a.rbac.keterangan ?? '') || url !== (a.rbac.url ?? '') || aktif !== a.rbac.aktif || unduhBerubah))
      await req('PUT', `${A}/aplikasi/${a.rbac.id}`, { nama, keterangan: ket || null, url: url || null, aktif, visibilitas, url_android: android.trim() || null, url_ios: ios.trim() || null }).catch(
        (x) => g.push(`Katalog: ${pesanGalat(x)}`),
      );
    if (a.sso && sso) {
      const ubah: Record<string, unknown> = {};
      if (nama !== a.sso.name) ubah.name = nama;
      if (ket !== (a.sso.description ?? '')) ubah.description = ket;
      if (!sama(daftarTeks(cb), a.sso.redirect_uris)) ubah.redirect_uris = daftarTeks(cb);
      if (!sama(daftarTeks(keluar), a.sso.post_logout_redirect_uris)) ubah.post_logout_redirect_uris = daftarTeks(keluar);
      if (fc !== (a.sso.frontchannel_logout_uri ?? '')) ubah.frontchannel_logout_uri = fc;
      if (url && url !== (a.sso.portal_url ?? '')) ubah.portal_url = url;
      if (batasi !== a.terbatas) ubah.permission = batasi ? `${a.kode}.akses` : '';
      if (aktif !== a.sso.active && !a.sso.admin) ubah.active = aktif;
      const vis = visibilitas === 'privat' ? 'private' : 'public';
      if (vis !== (a.sso.visibility ?? 'public')) ubah.visibility = vis;
      if (android.trim() !== (a.sso.android_url ?? '')) ubah.android_url = android.trim();
      if (ios.trim() !== (a.sso.ios_url ?? '')) ubah.ios_url = ios.trim();
      if (Object.keys(ubah).length) await sso.request('PATCH', `/clients/${a.sso.id}`, { body: ubah }).catch((x) => g.push(`Login SSO: ${pesanGalat(x)}`));
      if (logo !== a.logo) await sso.request(logo ? 'POST' : 'DELETE', `/clients/${a.sso.id}/logo`, logo ? { body: { data: logo } } : {}).catch((x) => g.push(`Logo: ${pesanGalat(x)}`));
    }
    if (a.api && siakad) {
      const ubah: Record<string, unknown> = {};
      if (nama !== a.api.name) ubah.name = nama;
      if (!sama([...scopes].sort(), [...a.api.scopes].sort())) ubah.scopes = scopes;
      if (!sama(daftarTeks(ips), a.api.allowed_ips)) ubah.allowed_ips = daftarTeks(ips);
      if (!sama(daftarTeks(origins), a.api.allowed_origins)) ubah.allowed_origins = daftarTeks(origins);
      if ((rate ? Number(rate) : null) !== (a.api.rate_limit ?? null)) ubah.rate_limit = rate ? Number(rate) : null;
      if (langsung !== a.api.allow_user_login) ubah.allow_user_login = langsung;
      if (aktif !== a.api.active) ubah.active = aktif;
      if (Object.keys(ubah).length) await req('PATCH', `${A}/klien-api/${a.api.id}`, ubah).catch((x) => g.push(`Klien API: ${pesanGalat(x)}`));
    }
    setKirim(false);
    setGalat(g);
    invalidateSiakad('rbac');
    invalidateSso();
    if (!g.length) onTersimpan?.();
  };

  return (
    <form className={cn('u-app-form', className)} onSubmit={simpan}>
      {galat.length > 0 && (
        <Alert variant="danger" title="Sebagian perubahan belum tersimpan">
          <ul>
            {galat.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Alert>
      )}
      <fieldset>
        <legend>Identitas</legend>
        {a.sso && <PilihLogo value={logo} onChange={setLogo} nama={nama} />}
        <FormGrid>
          <Field label="Nama" required>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} />
          </Field>
          <Field label="Kode" description="Tidak bisa diganti.">
            <Input value={a.kode} readOnly className="u-mono" />
          </Field>
          <Field label="Alamat aplikasi" className="u-span-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
          </Field>
          {a.jenis === 'mobile' && <IsianUnduhan android={android} ios={ios} onAndroid={setAndroid} onIos={setIos} />}
          {(a.jenis === 'web' || a.jenis === 'mobile') && (
            <Field label="Tampil di dasbor SSO" className="u-span-2">
              <PilihVisibilitas value={visibilitas} onValueChange={setVisibilitas} />
            </Field>
          )}
          <Field label="Keterangan" optional className="u-span-2">
            <Textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} maxLength={255} />
          </Field>
        </FormGrid>
        <Opsi icon={<ShieldCheck />} judul="Aplikasi aktif" teks="Nonaktif: login SSO dan token API aplikasi ini ditolak sampai diaktifkan lagi." value={aktif} onChange={setAktif} />
      </fieldset>
      {a.sso && (
        <fieldset>
          <legend>Login SSO</legend>
          <Field label="Alamat callback" required description="Satu per baris.">
            <Textarea value={cb} onChange={(e) => setCb(e.target.value)} rows={2} className="u-mono" />
          </Field>
          <FormGrid>
            <Field label="Setelah keluar">
              <Textarea value={keluar} onChange={(e) => setKeluar(e.target.value)} rows={2} className="u-mono" />
            </Field>
            <Field label="Logout serentak" optional>
              <Input value={fc} onChange={(e) => setFc(e.target.value)} className="u-mono" />
            </Field>
          </FormGrid>
          <Opsi icon={<Lock />} judul="Hanya pemegang izin yang boleh login" teks={`Pengguna wajib memegang ${a.kode}.akses.`} value={batasi} onChange={setBatasi} />
        </fieldset>
      )}
      {a.api && (
        <fieldset>
          <legend>Klien API</legend>
          <Field label="Scope">
            <PilihScope value={scopes} onValueChange={setScopes} maxHeight="16rem" />
          </Field>
          <FormGrid>
            <Field label="Batas IP" optional description="Satu per baris.">
              <Textarea value={ips} onChange={(e) => setIps(e.target.value)} rows={2} className="u-mono" />
            </Field>
            <Field label="Origin browser" optional>
              <Textarea value={origins} onChange={(e) => setOrigins(e.target.value)} rows={2} className="u-mono" />
            </Field>
            <Field label="Batas permintaan per menit" optional description="Kosong = bawaan server.">
              <Input value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ''))} inputMode="numeric" />
            </Field>
          </FormGrid>
          <label className="u-app-checks">
            <span>
              <Checkbox checked={langsung} onCheckedChange={(v) => setLangsung(v === true)} />
              <span>
                <strong>Izinkan login username/password langsung ke API</strong>
              </span>
            </span>
          </label>
        </fieldset>
      )}
      <div className="u-app-form-actions">
        {onBatal && (
          <Button variant="outline" type="button" onClick={onBatal}>
            Batal
          </Button>
        )}
        <Button type="submit" loading={kirim}>
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}

/** FormAplikasi di panel samping. Buka dengan memberi `aplikasi`, tutup dengan null. */
export function SheetUbahAplikasi({ aplikasi, onOpenChange, onTersimpan }: { aplikasi: AplikasiTerpadu | null; onOpenChange: (o: boolean) => void; onTersimpan?: () => void }) {
  return (
    <Sheet open={aplikasi != null} onOpenChange={onOpenChange} title={aplikasi ? `Ubah ${aplikasi.nama}` : 'Ubah aplikasi'} size="lg">
      {aplikasi && (
        <FormAplikasi
          key={aplikasi.kunci}
          aplikasi={aplikasi}
          onBatal={() => onOpenChange(false)}
          onTersimpan={() => {
            onTersimpan?.();
            onOpenChange(false);
          }}
        />
      )}
    </Sheet>
  );
}

// ================================================================ Daftar aplikasi publik (tanpa login)
/** Satu baris GET /v1/rbac/aplikasi-publik. */
export interface AplikasiPublik {
  kode: string;
  nama: string;
  keterangan?: string | null;
  jenis: 'web' | 'mobile';
  url?: string | null;
  url_android?: string | null;
  url_ios?: string | null;
  client_id_sso?: string | null;
  platform: Array<'web' | 'android' | 'ios'>;
}

/** Aplikasi kampus yang visibilitasnya publik (tanpa token). */
export function useAplikasiPublik(jenis?: 'web' | 'mobile') {
  return useSiakadQuery<AplikasiPublik[]>(
    ['rbac', 'aplikasi-publik', jenis ?? ''],
    (s, signal) => s.request<AplikasiPublik[]>({ method: 'GET', path: `${A}/aplikasi-publik`, query: { jenis }, public: true }, { signal }),
    { staleTime: 5 * 60_000 },
  );
}

export interface DaftarAplikasiPublikProps {
  /** Batasi ke aplikasi web atau mobile. Bawaan: keduanya dengan saringan. */
  jenis?: 'web' | 'mobile';
  /** Alamat SSO untuk logo aplikasi (bawaan https://sso.unipo.ac.id). */
  ssoUrl?: string | null;
  /** Tagline di bawah nama; bawaan keterangan aplikasi. */
  tagline?: string;
  className?: string;
}

/**
 * Daftar aplikasi kampus yang publik (sama dengan dasbor SSO): logo terdaftar, nama, keterangan, tombol Buka untuk
 * aplikasi web, dan tombol unduh Android/iOS untuk aplikasi mobile sesuai platform yang didukung.
 */
export function DaftarAplikasiPublik({ jenis, ssoUrl, tagline, className }: DaftarAplikasiPublikProps) {
  const [saring, setSaring] = React.useState<'semua' | 'web' | 'mobile'>('semua');
  const q = useAplikasiPublik(jenis);
  if (q.error)
    return (
      <Alert variant="danger" title="Daftar aplikasi tidak termuat" className={className}>
        {pesanGalat(q.error)}
      </Alert>
    );
  if (!q.data) return <Skeleton className={className} style={{ height: 180 }} />;
  const semua = q.data;
  const ada = { web: semua.filter((a) => a.jenis === 'web').length, mobile: semua.filter((a) => a.jenis === 'mobile').length };
  const daftar = jenis || saring === 'semua' ? semua : semua.filter((a) => a.jenis === saring);
  return (
    <div className={cn('u-app-publik', className)}>
      {!jenis && ada.web > 0 && ada.mobile > 0 && (
        <Tabs<'semua' | 'web' | 'mobile'>
          value={saring}
          onValueChange={setSaring}
          items={[
            { value: 'semua', label: 'Semua', count: semua.length },
            { value: 'web', label: 'Web', count: ada.web },
            { value: 'mobile', label: 'Mobile', count: ada.mobile },
          ]}
        />
      )}
      {!daftar.length ? (
        <Empty icon={<LayoutGrid />} title="Belum ada aplikasi publik" description="Aplikasi tampil di sini setelah ditandai publik di Pustikom." />
      ) : (
        <ul className="u-app-publik-grid">
          {daftar.map((a) => (
            <li key={a.kode} className="u-app-publik-item">
              <LogoAplikasi kode={a.client_id_sso || a.kode} name={a.nama} tagline={tagline ?? (a.keterangan || (a.jenis === 'mobile' ? 'Aplikasi mobile' : hostDari(a.url ?? '')))} ssoUrl={ssoUrl} />
              <TautanAplikasi nama={a.nama} url={a.url} url_android={a.url_android} url_ios={a.url_ios} hentikanKlik={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
