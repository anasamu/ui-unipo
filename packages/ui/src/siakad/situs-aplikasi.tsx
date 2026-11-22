'use client';
import * as React from 'react';
import { KerangkaSitus, type KerangkaSitusProps } from '../components/situs';
import { normalisasiSitus, situsBawaan, type DokumenSitus } from '../components/situs-skema';
import { menuLanding, type DokumenLanding } from '../components/landing-skema';
import { LandingAplikasi, PENYEDIA_SIAKAD, useDokumenLanding, type LandingAplikasiProps } from './landing-aplikasi';
import { useOptionalSiakad, useSiakadQuery } from './provider';

/** Data kerangka situs dari GET /v1/tema/{aplikasi}/situs. */
export interface DataSitus {
  aplikasi: string;
  lingkup: string;
  /** Pengaturan yang tampil ke pengunjung; null = belum pernah diterbitkan (pakai kerangka bawaan). */
  terbit: DokumenSitus | null;
  versi: number;
  terbit_oleh: string | null;
  terbit_pada: string | null;
  sumber: { aplikasi: string; lingkup: string } | null;
  tersedia: boolean;
  berkas: Record<string, string>;
  /** Hanya dengan draf=1 (penyunting). */
  draf?: DokumenSitus | null;
  revisi?: number;
  draf_oleh?: string | null;
  draf_pada?: string | null;
}

export const pathSitus = (aplikasi: string, sub = '') => `/v1/tema/${encodeURIComponent(aplikasi)}/situs${sub}`;

/**
 * Kerangka situs yang tampil untuk aplikasi: isi terbit, salinan terakhir di peramban selama memuat, atau kerangka
 * bawaan (setara tampilan sebelum ada pengaturan) bila belum pernah terbit / SIAKAD tidak terjangkau.
 */
export function useSitusAplikasi(aplikasi: string, opts: { lingkup?: string; enabled?: boolean } = {}) {
  const { lingkup, enabled = true } = opts;
  const siakad = useOptionalSiakad();
  const q = useSiakadQuery<DataSitus>(
    ['tema-situs', aplikasi, lingkup ?? ''],
    (s, signal) => s.request<DataSitus>({ method: 'GET', path: pathSitus(aplikasi), query: lingkup ? { lingkup } : undefined, public: true }, { signal, maxRetries: 1 }),
    { staleTime: 60_000, enabled: enabled && !!siakad },
  );
  const kunci = `unipo.situs.${aplikasi}.${lingkup ?? ''}`;
  const [cache] = React.useState<DokumenSitus | null>(() => {
    try {
      const v = typeof localStorage !== 'undefined' ? localStorage.getItem(kunci) : null;
      return v ? normalisasiSitus(JSON.parse(v)) : null;
    } catch {
      return null;
    }
  });
  const terbit = q.data?.terbit;
  React.useEffect(() => {
    if (!q.data) return;
    try {
      if (terbit) localStorage.setItem(kunci, JSON.stringify(terbit));
      else localStorage.removeItem(kunci);
    } catch {
      // penyimpanan peramban tidak tersedia: tanpa cache
    }
  }, [q.data, terbit, kunci]);
  const situs = React.useMemo(() => (terbit ? normalisasiSitus(terbit) : (cache ?? situsBawaan())), [terbit, cache]);
  return { situs, berkas: q.data?.berkas, versi: q.data?.versi ?? 0, memuat: q.loading };
}

/** Bagian pertama halaman landing berlatar foto/gelap (syarat navbar tembus pandang). */
export function atasGelapLanding(dok: DokumenLanding | null | undefined): boolean {
  const b = dok?.blok[0];
  if (!b) return false;
  if (b.tipe === 'hero' && ['gambar', 'layar'].includes(String(b.isi.tata))) return true;
  return ['utama', 'gelap', 'gambar', 'aksen'].includes(String(b.gaya.latar));
}

export interface SitusAplikasiProps extends Omit<KerangkaSitusProps, 'situs' | 'berkas' | 'penyedia'> {
  /** Kode aplikasi (lms, tracer, pmb, ...). */
  aplikasi: string;
  lingkup?: string;
  /** Halaman landing di dalamnya, untuk menu bagian dan syarat navbar tembus pandang. */
  landing?: DokumenLanding | null;
}

/**
 * Kerangka situs publik aplikasi dari Pengaturan tema (Kepala & kaki situs): pita, bilah atas, navbar + menu utama,
 * sidebar halaman dalam, dan kaki situs. Berita sidebar otomatis dari portal Humas.
 *
 *   <SitusAplikasi aplikasi="lms" merek={<Logo />} aksi={{ masuk: { label: 'Masuk', href: '/bff/masuk' } }}>
 *     <LandingAplikasi aplikasi="lms" />
 *   </SitusAplikasi>
 */
export function SitusAplikasi({ aplikasi, lingkup, landing, menuBagian, atasGelap, ...rest }: SitusAplikasiProps) {
  const { situs, berkas } = useSitusAplikasi(aplikasi, { lingkup });
  return (
    <KerangkaSitus
      situs={situs}
      berkas={berkas}
      penyedia={PENYEDIA_SIAKAD}
      menuBagian={menuBagian ?? (landing ? menuLanding(landing) : undefined)}
      atasGelap={atasGelap ?? atasGelapLanding(landing)}
      {...rest}
    />
  );
}

export interface HalamanDepanAplikasiProps extends Omit<LandingAplikasiProps, 'merek'> {
  /** Logo + nama aplikasi (navbar dan kaki). */
  merek: React.ReactNode;
  /** Menu pengguna di navbar bila pengunjung sudah masuk. */
  user?: KerangkaSitusProps['user'];
  renderLink?: KerangkaSitusProps['renderLink'];
}

/**
 * Halaman depan lengkap aplikasi bawaan: kerangka situs (Pengaturan tema → Kepala & kaki situs) membungkus landing page
 * (Pengaturan tema → Halaman depan). Pengganti `<Navbar menus={menuLanding(dok)} /> + <LandingAplikasi />`.
 *
 *   <HalamanDepanAplikasi aplikasi="lms" merek={<Logo />} slot={slot} aksi={{ masuk: { label: 'Masuk', href: '/bff/masuk' } }} />
 */
export function HalamanDepanAplikasi({ aplikasi, lingkup, halaman, bawaan, merek, aksi, namaHakCipta, user, renderLink, ...rest }: HalamanDepanAplikasiProps) {
  const { dok } = useDokumenLanding(aplikasi, { lingkup, halaman, bawaan });
  return (
    <SitusAplikasi aplikasi={aplikasi} lingkup={lingkup} landing={dok} merek={merek} aksi={aksi} namaHakCipta={namaHakCipta} user={user} renderLink={renderLink}>
      <LandingAplikasi aplikasi={aplikasi} lingkup={lingkup} halaman={halaman} bawaan={bawaan} aksi={aksi} merek={merek} namaHakCipta={namaHakCipta} {...rest} />
    </SitusAplikasi>
  );
}
