'use client';
import * as React from 'react';
import type { UnitBagan } from '../components/bagan-organisasi';
import { useOptionalSiakad } from './provider';

// ================================================================ Pas foto untuk bagan organisasi

const cache = new Map<string, string | null>();
const jalan = new Map<string, Promise<string | null>>();

function keDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

/**
 * Isi `foto` jabatan bagan dari `fotoRef` (alamat API pas foto, mis. `/v1/induk/organisasi/foto/pejabat/12`): diambil
 * lewat SDK (token pengguna), diubah ke data URL supaya ikut unduhan PNG/PDF, dan di-cache per sesi. Jabatan tanpa
 * foto tetap memakai inisial.
 *
 *   const data = useFotoBagan(unitBagan);
 *   <BaganOrganisasi data={data} />
 */
export function useFotoBagan(data: UnitBagan[]): UnitBagan[] {
  const siakad = useOptionalSiakad();
  const [, setTik] = React.useState(0);
  const refs = React.useMemo(() => [...new Set(data.flatMap((u) => (u.jabatan ?? []).map((j) => j.fotoRef).filter((x): x is string => !!x)))], [data]);
  React.useEffect(() => {
    if (!siakad) return;
    let hidup = true;
    const belum = refs.filter((r) => !cache.has(r));
    if (!belum.length) return;
    const ambil = (path: string) => {
      let p = jalan.get(path);
      if (!p) {
        p = siakad
          .request<unknown>({ method: 'GET', path })
          .then(async (r) => {
            const d = r.data as { blob?: () => Blob } | Blob | string | null;
            const blob = d instanceof Blob ? d : d && typeof d === 'object' && typeof (d as { blob?: () => Blob }).blob === 'function' ? (d as { blob: () => Blob }).blob() : null;
            const url = blob ? await keDataUrl(blob) : typeof d === 'string' && d.startsWith('data:image/') ? d : null;
            cache.set(path, url);
            return url;
          })
          .catch(() => { cache.set(path, null); return null; })
          .finally(() => jalan.delete(path));
        jalan.set(path, p);
      }
      return p;
    };
    (async () => {
      // Maks 6 permintaan bersamaan.
      for (let i = 0; i < belum.length; i += 6) {
        await Promise.all(belum.slice(i, i + 6).map(ambil));
        if (hidup) setTik((t) => t + 1);
      }
    })();
    return () => { hidup = false; };
  }, [refs, siakad]);
  return React.useMemo(
    () => data.map((u) => (u.jabatan?.some((j) => j.fotoRef && cache.get(j.fotoRef))
      ? { ...u, jabatan: u.jabatan!.map((j) => (j.fotoRef && cache.get(j.fotoRef) ? { ...j, foto: cache.get(j.fotoRef) } : j)) }
      : u)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, refs, cache.size],
  );
}

/** Pas foto satu orang (mis. kartu pengurus Yayasan) sebagai data URL, atau null. */
export function useFotoApi(path: string | null | undefined): string | null {
  const siakad = useOptionalSiakad();
  const [, setTik] = React.useState(0);
  React.useEffect(() => {
    if (!siakad || !path || cache.has(path)) return;
    let hidup = true;
    siakad.request<unknown>({ method: 'GET', path })
      .then(async (r) => {
        const d = r.data as Blob | { blob?: () => Blob } | null;
        const blob = d instanceof Blob ? d : d && typeof (d as { blob?: () => Blob }).blob === 'function' ? (d as { blob: () => Blob }).blob() : null;
        cache.set(path, blob ? await keDataUrl(blob) : null);
      })
      .catch(() => cache.set(path, null))
      .finally(() => { if (hidup) setTik((t) => t + 1); });
    return () => { hidup = false; };
  }, [path, siakad]);
  return path ? cache.get(path) ?? null : null;
}

/**
 * Alamat API pas foto dari pejabat di jawaban struktur organisasi (`ada_foto`, `id` pejabat atau `pengurus_id` pengurus
 * Yayasan), untuk `JabatanBagan.fotoRef`.
 */
export function fotoRefPejabat(p: { id?: number | null; pengurus_id?: number | null; ada_foto?: boolean } | null | undefined): string | null {
  if (!p?.ada_foto) return null;
  if (p.pengurus_id) return `/v1/induk/organisasi/foto/pengurus/${p.pengurus_id}`;
  return p.id ? `/v1/induk/organisasi/foto/pejabat/${p.id}` : null;
}

/** Lupakan cache pas foto (mis. sesudah mengganti foto). */
export function lupakanFotoBagan(path?: string) {
  if (path) cache.delete(path);
  else cache.clear();
}
