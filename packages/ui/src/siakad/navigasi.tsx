'use client';
import * as React from 'react';
import { AppLogo, UnipoAppLogo, type AppLogoProps, type UnipoApp } from '../components/identity';
import { Navbar, type NavbarMenu, type NavbarProps, type NavbarLink } from '../components/navbar';
import { Faq, type FaqProps } from '../components/faq';
import { useSiakadQuery } from './provider';

type Row = Record<string, any>;

// ================================================================ Logo situs
export interface LogoSitusProps extends Omit<AppLogoProps, 'src' | 'name'> {
  /** Kode situs portal, mis. 'univ', 'fti', 'pmb'. */
  situs: string;
  /** Logo cadangan bila situs belum punya logo atau API belum menjawab. */
  app?: UnipoApp;
  /** Nama pengganti (bawaan: nama situs dari API). */
  name?: React.ReactNode;
}

/**
 * Logo dari pengaturan situs portal (`/v1/portal/situs/{kode}`): pakai logo unggahan bila ada,
 * bila tidak pakai logo aplikasi UNIPO (`app`). Nama dan tagline mengikuti data situs.
 */
export function LogoSitus({ situs, app, name, tagline, ...props }: LogoSitusProps) {
  const q = useSiakadQuery<Row>(['portal-situs', situs], (s, signal) => s.portal.getSitusByKode(situs, {}, { signal }) as never, { staleTime: 10 * 60_000 });
  const d = q.data;
  const nama = name ?? d?.singkatan ?? d?.nama;
  const sub = tagline ?? (d ? (d.tagline ?? (d.jenis === 'universitas' ? undefined : 'Universitas Pohuwato')) : undefined);
  const src = d?.logo?.url as string | undefined;
  if (src) return <AppLogo src={src} name={nama} tagline={sub} {...props} />;
  if (app) return <UnipoAppLogo app={app} {...(nama ? { name: nama } : {})} {...(sub !== undefined ? { tagline: sub } : {})} {...props} />;
  return <AppLogo name={nama ?? 'UNIPO'} tagline={sub} {...props} />;
}

// ================================================================ Navbar dari menu portal
/** Item menu `/v1/portal/situs/{kode}/menu` (tabel portal_menu). */
export interface MenuPortal {
  id: number;
  label: string;
  label_en?: string | null;
  tipe?: 'halaman' | 'kategori' | 'url' | 'modul';
  ref_id?: number | null;
  url?: string | null;
  tab_baru?: boolean | number;
  anak?: MenuPortal[];
  [k: string]: any;
}

/** Bawaan: url apa adanya; modul → /{nama-modul}; halaman → /halaman/{id}; kategori → /kategori/{id}. */
export function hrefMenuPortal(m: MenuPortal): string | undefined {
  if (m.tipe === 'modul') return `/${String(m.url ?? '').replace(/^\//, '')}`;
  if (m.tipe === 'halaman' && m.ref_id) return `/halaman/${m.ref_id}`;
  if (m.tipe === 'kategori' && m.ref_id) return `/kategori/${m.ref_id}`;
  return m.url || undefined;
}

/**
 * Ubah pohon menu portal ke NavbarMenu. Tiga tingkat (induk → judul kolom → tautan) menjadi mega menu;
 * dua tingkat menjadi dropdown biasa.
 */
export function keNavbarMenu(items: MenuPortal[], opts: { href?: (m: MenuPortal) => string | undefined; bahasa?: 'id' | 'en'; ekstra?: (m: MenuPortal) => Partial<NavbarMenu> } = {}): NavbarMenu[] {
  const href = opts.href ?? hrefMenuPortal;
  const lbl = (m: MenuPortal) => (opts.bahasa === 'en' && m.label_en) || m.label;
  const link = (m: MenuPortal): NavbarLink => ({ key: String(m.id), label: lbl(m), href: href(m), external: Boolean(Number(m.tab_baru)), description: m.deskripsi ?? undefined });
  return items.map((m) => {
    const anak = m.anak ?? [];
    const base: NavbarMenu = { key: String(m.id), label: lbl(m), href: anak.length ? undefined : href(m), external: Boolean(Number(m.tab_baru)) };
    if (!anak.length) return { ...base, ...opts.ekstra?.(m) };
    const mega = anak.some((a) => a.anak?.length);
    return {
      ...base,
      ...(mega ? { columns: anak.map((a) => ({ title: lbl(a), items: a.anak?.length ? a.anak.map(link) : [link(a)] })) } : { items: anak.map(link) }),
      ...opts.ekstra?.(m),
    };
  });
}

export interface NavbarPortalProps extends Omit<NavbarProps, 'menus' | 'brand'> {
  /** Kode situs portal. */
  situs: string;
  /** Lokasi menu (bawaan 'utama'). */
  lokasi?: 'utama' | 'atas' | 'footer' | 'sidebar';
  /** Logo; bawaan <LogoSitus situs={situs} app={app} />. */
  brand?: React.ReactNode;
  app?: UnipoApp;
  /** Pemetaan tautan menu ke URL aplikasi Anda. */
  href?: (m: MenuPortal) => string | undefined;
  bahasa?: 'id' | 'en';
  /** Tambahkan ikon, deskripsi, atau kartu sorotan ke menu tertentu, mis. (m) => m.label === 'Akademik' ? { featured: … } : {}. */
  ekstra?: (m: MenuPortal) => Partial<NavbarMenu>;
  /** Menu tambahan di ujung (mis. tautan aplikasi) atau saat API belum menjawab. */
  menuTambahan?: NavbarMenu[];
  /**
   * Menu bawaan bila situs belum punya menu di lokasi ini (API menjawab kosong atau galat), supaya navbar dan lembar
   * menu ponsel tidak kosong. Tidak dipakai selama menu masih dimuat.
   */
  menuCadangan?: NavbarMenu[];
}

/** Navbar portal yang menunya diambil dari pengaturan situs (`/v1/portal/situs/{kode}/menu`), lengkap dengan mega menu. */
export function NavbarPortal({ situs, lokasi = 'utama', brand, app, href, bahasa, ekstra, menuTambahan = [], menuCadangan, variant = 'portal', ...rest }: NavbarPortalProps) {
  const q = useSiakadQuery<Record<string, MenuPortal[]>>(['portal-menu', situs, lokasi], (s, signal) => s.portal.getSitusByKodeMenu(situs, { lokasi }, { signal }) as never, { staleTime: 5 * 60_000 });
  const menus = React.useMemo(() => {
    const dariSitus = keNavbarMenu(q.data?.[lokasi] ?? [], { href, bahasa, ekstra });
    const kosong = !dariSitus.length && (q.error != null || (!q.loading && q.data != null));
    return [...(kosong && menuCadangan ? menuCadangan : dariSitus), ...menuTambahan];
  }, [q.data, q.error, q.loading, lokasi, href, bahasa, ekstra, menuTambahan, menuCadangan]);
  return <Navbar brand={brand ?? <LogoSitus situs={situs} app={app} />} menus={menus} variant={variant} {...rest} />;
}

// ================================================================ FAQ portal
export interface FaqPortalProps extends Omit<FaqProps, 'items' | 'loading' | 'onSearch'> {
  /** Kode situs; kosong = semua situs. */
  situs?: string;
  /** ID atau slug kategori FAQ. */
  kategori?: string;
  /** Sertakan FAQ situs turunan (fakultas, prodi). */
  turunan?: boolean;
  bahasa?: 'id' | 'en';
  /** Maksimal pertanyaan (bawaan 100). */
  jumlah?: number;
}

/** FAQ dari portal (`/v1/portal/faq`), dikelompokkan per kategori dengan pencarian. */
export function FaqPortal({ situs, kategori, turunan, bahasa, jumlah = 100, ...rest }: FaqPortalProps) {
  const query = { ...(situs ? { situs } : {}), ...(kategori ? { kategori } : {}), ...(turunan ? { turunan: '1' } : {}), per_page: jumlah };
  const q = useSiakadQuery<Row[]>(['portal-faq', query], (s, signal) => s.portal.getFaq(query, { signal }) as never, { staleTime: 5 * 60_000 });
  const items = (q.data ?? []).map((f) => ({
    id: f.id,
    question: String((bahasa === 'en' && f.pertanyaan_en) || f.pertanyaan || f.judul || ''),
    answer: String((bahasa === 'en' && f.jawaban_en) || f.jawaban || ''),
    category: f.kategori?.nama ?? undefined,
  }));
  if (q.error && !q.data) return <Faq {...rest} items={[]} />;
  return <Faq {...rest} items={items} loading={q.loading && !q.data} />;
}
