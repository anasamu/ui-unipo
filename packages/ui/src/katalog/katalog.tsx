'use client';
import * as React from 'react';
import indeksJson from './data/indeks.json';
import { MUAT_MODUL } from './data/muat';
import type { IndeksKatalog, ModulIndeks, ModulKatalog, Operasi, Skema, Sumber } from './tipe';

/** Katalog bawaan: dibuat dari OpenAPI API SIAKAD saat paket dirilis. */
export const INDEKS_KATALOG = indeksJson as unknown as IndeksKatalog;

export interface KatalogContextValue {
  indeks: IndeksKatalog;
  /** Muat katalog satu modul. */
  muat: (key: string) => Promise<ModulKatalog>;
  /**
   * Scope token pengguna (mis. dari id_token SSO atau /v1/rbac/saya). Bila diisi, menu, tombol tambah/ubah/hapus,
   * dan aksi yang butuh scope lain disembunyikan, sama seperti backend menolaknya dengan 403.
   */
  scopes?: readonly string[] | null;
  /** Modul yang ditampilkan (bawaan semua). */
  modul?: readonly string[];
}

const cacheBawaan = new Map<string, Promise<ModulKatalog>>();
/** Muat katalog satu modul dari data bawaan paket (tanpa React). */
export function muatModulKatalog(key: string): Promise<ModulKatalog> {
  return muatBawaan(key);
}
function muatBawaan(key: string): Promise<ModulKatalog> {
  let p = cacheBawaan.get(key);
  if (!p) {
    const f = MUAT_MODUL[key];
    p = f ? f() : Promise.reject(new Error(`Modul "${key}" tidak ada di katalog.`));
    p.catch(() => cacheBawaan.delete(key));
    cacheBawaan.set(key, p);
  }
  return p;
}

const KatalogContext = React.createContext<KatalogContextValue>({ indeks: INDEKS_KATALOG, muat: muatBawaan });

export interface KatalogProviderProps {
  children: React.ReactNode;
  /** Katalog sendiri (mis. dibuat ulang dari openapi.json terbaru dengan scripts/katalog/buat.mjs). */
  indeks?: IndeksKatalog;
  muat?: (key: string) => Promise<ModulKatalog>;
  scopes?: readonly string[] | null;
  modul?: readonly string[];
}

/**
 * Penyedia katalog fitur. Opsional: tanpa provider, komponen memakai katalog bawaan tanpa penyaringan scope.
 *   <KatalogProvider scopes={token.scope.split(' ')}>…</KatalogProvider>
 */
export function KatalogProvider({ children, indeks = INDEKS_KATALOG, muat = muatBawaan, scopes, modul }: KatalogProviderProps) {
  const value = React.useMemo(() => ({ indeks, muat, scopes, modul }), [indeks, muat, scopes, modul]);
  return <KatalogContext.Provider value={value}>{children}</KatalogContext.Provider>;
}

export function useKatalog(): KatalogContextValue {
  return React.useContext(KatalogContext);
}

/** Modul yang terlihat (sesuai `modul` dan scope di provider), dikelompokkan per grup. */
export function useModulTerlihat(): Array<{ grup: IndeksKatalog['grup'][number]; modul: ModulIndeks[] }> {
  const { indeks, scopes, modul } = useKatalog();
  return React.useMemo(() => {
    const boleh = (m: ModulIndeks) => (!modul || modul.includes(m.key)) && (!scopes || !m.scope?.length || m.scope.some((s) => scopes.includes(s)));
    return indeks.grup.map((g) => ({ grup: g, modul: indeks.modul.filter((m) => m.group === g.key && boleh(m)) })).filter((x) => x.modul.length);
  }, [indeks, scopes, modul]);
}

export interface ModulState {
  modul: ModulKatalog | undefined;
  loading: boolean;
  error: Error | null;
}

const hasilModul = new Map<string, ModulKatalog>();

/** Muat katalog satu modul (operasi + skema). */
export function useModulKatalog(key: string | undefined | null): ModulState {
  const { muat } = useKatalog();
  const [state, setState] = React.useState<ModulState>(() => ({ modul: key ? hasilModul.get(key) : undefined, loading: Boolean(key && !hasilModul.has(key)), error: null }));
  React.useEffect(() => {
    if (!key) return void setState({ modul: undefined, loading: false, error: null });
    const hit = hasilModul.get(key);
    if (hit) return void setState({ modul: hit, loading: false, error: null });
    let hidup = true;
    setState({ modul: undefined, loading: true, error: null });
    muat(key).then(
      (m) => {
        hasilModul.set(key, m);
        if (hidup) setState({ modul: m, loading: false, error: null });
      },
      (e: Error) => hidup && setState({ modul: undefined, loading: false, error: e }),
    );
    return () => {
      hidup = false;
    };
  }, [key, muat]);
  return state;
}

/** Kunci modul untuk path sumber, mis. '/v1/kemahasiswaan/beasiswa' → 'kemahasiswaan'. */
export function modulUntukSumber(indeks: IndeksKatalog, id: string): string | undefined {
  if (indeks.peta[id]) return indeks.peta[id];
  // Sumber anak dengan nilai path terisi, mis. /v1/x/12/berkas → cocokkan pola.
  const norm = id.replace(/\/\d+(?=\/|$)/g, '/{}');
  for (const [k, v] of Object.entries(indeks.peta)) if (k.replace(/\{[^}]+\}/g, '{}') === norm) return v;
  return undefined;
}

export interface SumberState extends ModulState {
  sumber: Sumber | undefined;
  /** Operasi berdasarkan id. */
  op: (id: string | undefined) => Operasi | undefined;
  /** Skema baris (hasil daftar/detail). */
  skemaBaris: Skema | undefined;
}

/** Muat satu sumber data berdasarkan path-nya. */
export function useSumber(id: string): SumberState {
  const { indeks } = useKatalog();
  const key = modulUntukSumber(indeks, id);
  const st = useModulKatalog(key);
  const sumber = st.modul?.resources.find((r) => r.id === id);
  const op = React.useCallback((x: string | undefined) => (x ? st.modul?.ops[x] : undefined), [st.modul]);
  const contoh = sumber && (op(sumber.list) ?? op(sumber.get) ?? op(sumber.create));
  const skemaBaris = contoh?.it ? st.modul?.skema[contoh.it] : undefined;
  return {
    ...st,
    error: st.error ?? (!key ? new Error(`Sumber "${id}" tidak ada di katalog.`) : st.modul && !sumber ? new Error(`Sumber "${id}" tidak ada di modul ${key}.`) : null),
    loading: st.loading,
    sumber,
    op,
    skemaBaris,
  };
}
