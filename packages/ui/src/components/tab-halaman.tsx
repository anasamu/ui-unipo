'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import type { NavItem } from './layout';
import type { HasilMenu, TabHalamanAktif } from './menu-aplikasi';

// ================================================================ Tab halaman (halaman bertab dari definisi menu)
//
// Halaman yang berkaitan digabung menjadi satu menu sidebar dengan tab (`ItemMenuDef.tab`). Tiap tab punya rute sendiri,
// jadi tautan lama, bookmark, pintasan, dan Cari fitur tetap jalan; tab yang tidak boleh dilihat tidak tampil, dan alamat
// dasar/tab terlarang dialihkan ke tab pertama yang terlihat. Tab berupa tautan (navigasi), bukan tombol panel.

type RenderLink = (item: NavItem, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactElement;

export interface KonteksMenuHalaman {
  menu?: HasilMenu;
  /** Pindah alamat di dalam aplikasi (router aplikasi), dipakai saat mengalihkan. */
  navigasi?: (href: string, opsi?: { replace?: boolean }) => void;
  /** Tautan router aplikasi (sama dengan `renderLink` Sidebar). */
  renderLink?: RenderLink;
}

const Konteks = React.createContext<KonteksMenuHalaman>({});

/** Dipasang oleh `KerangkaAplikasi`; pasang sendiri bila tidak memakai kerangka itu. */
export function PenyediaMenuHalaman({ menu, navigasi, renderLink, children }: KonteksMenuHalaman & { children: React.ReactNode }) {
  const nilai = React.useMemo(() => ({ menu, navigasi, renderLink }), [menu, navigasi, renderLink]);
  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

/** Menu aplikasi yang sedang dipakai kerangka (hasil `useMenuAplikasi`). */
export function useMenuHalaman(): KonteksMenuHalaman {
  return React.useContext(Konteks);
}

export interface TabMenuHalamanProps extends KonteksMenuHalaman {
  /**
   * Isi per kunci tab (`TabMenuDef.kunci`, bawaan rute tab). Bila tidak diisi, `children` dirender di bawah deret tab
   * (halaman lama yang tetap punya rute sendiri, mis. `<Outlet />`).
   */
  isi?: Readonly<Record<string, React.ReactNode>> | ((kunci: string) => React.ReactNode);
  children?: React.ReactNode;
  className?: string;
}

/**
 * Deret tab halaman bertab, tersinkron ke alamat. Tab dan hak aksesnya berasal dari definisi menu, jadi sama dengan
 * sidebar dan Cari fitur. `KerangkaAplikasi` sudah memasangnya otomatis di atas isi halaman bila menu aktif bertab
 * (prop `tabHalaman`), sehingga aplikasi cukup menambah `tab` di menu.ts; rute halaman lama tetap.
 *
 * ```ts
 * { label: 'Akun pengguna', ke: '/akun', tab: [
 *   { kunci: 'daftar', label: 'Daftar akun', ke: '/akun' },
 *   { kunci: 'riwayat', label: 'Riwayat masuk', ke: '/akun/riwayat', izin: 'akun:audit' },
 * ] }
 * ```
 */
export function TabMenuHalaman({ menu: menuProp, navigasi: navProp, renderLink: linkProp, isi, children, className }: TabMenuHalamanProps) {
  const k = useMenuHalaman();
  const tab: TabHalamanAktif | undefined = (menuProp ?? k.menu)?.tab;
  const nav = navProp ?? k.navigasi;
  const renderLink = linkProp ?? k.renderLink;
  const pertama = tab?.items[0];
  const aktif = (!tab?.terlarang && tab?.aktif) || pertama?.key;
  // Alamat dasar yang bukan tab, atau tab yang tidak boleh dilihat: alihkan ke tab pertama tanpa menambah riwayat.
  const perluAlih = Boolean(tab && pertama && (!tab.aktif || tab.terlarang));
  const hrefPertama = pertama?.href;
  React.useEffect(() => {
    if (!perluAlih || !hrefPertama || typeof window === 'undefined') return;
    if (window.location.pathname + window.location.search === hrefPertama) return;
    if (nav) nav(hrefPertama, { replace: true });
    else window.location.replace(hrefPertama);
  }, [perluAlih, hrefPertama, nav]);
  if (!tab || tab.items.length < 2) return <>{isi && aktif !== undefined ? (typeof isi === 'function' ? isi(aktif) : isi[aktif]) : children}</>;
  const isiAktif = aktif === undefined ? null : typeof isi === 'function' ? isi(aktif) : isi ? isi[aktif] : null;
  return (
    <>
      <nav className={cn('u-tab-halaman', className)} aria-label={tab.judul} data-tab-halaman={tab.induk}>
        <div className="u-tabs-list" data-variant="underline">
          {tab.items.map((t) => {
            const pilih = t.key === aktif;
            const isiTab = (
              <>
                <span className="u-tab-label">{t.label}</span>
                {t.badge != null && (
                  <span className="u-badge" data-variant="neutral">
                    {t.badge}
                  </span>
                )}
              </>
            );
            const props = {
              className: 'u-tab',
              'data-active': pilih ? '' : undefined,
              'aria-current': pilih ? ('page' as const) : undefined,
              title: t.keterangan,
            };
            return (
              <React.Fragment key={t.key}>
                {renderLink ? (
                  renderLink({ key: t.key, label: t.label, href: t.href }, { ...props, href: t.href, children: isiTab })
                ) : (
                  <a {...props} href={t.href}>
                    {isiTab}
                  </a>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </nav>
      {perluAlih ? null : isi ? isiAktif : children}
    </>
  );
}
