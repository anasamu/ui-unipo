'use client';
import * as React from 'react';
import { Monitor, Moon, Search, Sun } from 'lucide-react';
import { Button } from '../components/actions';
import type { AkunPengguna, MenuAkunProps, TemaAkun } from '../components/akun';
import { LogoAplikasi } from '../components/identity';
import { AppShell, SearchTrigger, Sidebar, type NavGroup, type SidebarProps, type SidebarUser } from '../components/layout';
import { Tooltip } from '../components/overlays';
import { fiturDariMenu, labelPintasanCari, PencarianFitur, usePintasanCari, type ItemFitur } from '../components/pencarian-fitur';
import { NavigasiBawah, type ItemNavigasiBawah } from '../components/platform';
import { cn } from '../lib/cn';
import { MenuAkunSiakad } from './akun';
import { TombolBerkas, type TombolBerkasProps } from './berkas-cepat';
import { TombolNotifikasi, type OpsiNotifikasi } from './notifikasi';
import { ChatMengambang, TombolPesan } from './obrolan';


export interface KerangkaAplikasiProps {
  /** Kode aplikasi terdaftar di Pustikom/SSO (logo diambil dari sana), mis. "bauk", "lms", "sdm". */
  kode: string;
  /** Nama aplikasi di sidebar, mis. "BAUK UNIPO". */
  nama?: string;
  /** Baris kecil di bawah nama, mis. "Keuangan, payroll, dan sarpras". */
  tagline?: string;
  /** Ganti seluruh logo (bawaan LogoAplikasi dari `kode`). */
  logo?: React.ReactNode;
  /** Alamat beranda; logo dan nama aplikasi menuju ke sini. Bawaan "/". */
  beranda?: string;
  /** Kelompok menu yang sudah disaring sesuai izin pengguna. */
  groups: NavGroup[];
  activeKey?: string;
  /** Tautan menu, mis. `(item, p) => <Link to={item.href!} {...p} />`. Juga dipakai logo. */
  renderLink?: SidebarProps['renderLink'];
  /** Navigasi dari kode (pencarian, notifikasi), mis. `useNavigate()`. Bawaan `location.assign`. */
  onNavigasi?: (href: string) => void;
  /** Judul halaman di bilah atas. Bawaan label menu aktif. */
  judul?: React.ReactNode;
  /** Baris kecil di atas judul (mis. kelompok menu atau peran). */
  subjudul?: React.ReactNode;
  /** Konten di bawah logo sidebar (pemilih prodi/periode). */
  sidebarHeader?: React.ReactNode;
  /** Konten di bagian bawah sidebar. */
  sidebarFooter?: React.ReactNode;
  /** Blok pengguna di kaki sidebar (nama + peran + menu), sama dengan Sidebar `user`. */
  sidebarUser?: SidebarUser;
  /** Sidebar ikon saja; dikendalikan dari luar bila diisi bersama onCollapsedChange. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Pencarian fitur di bilah atas (Ctrl/⌘K atau "/"). Bawaan mencari semua menu `groups`. `tambahan` = fitur lain;
   * `onBuka` mengganti palet bawaan dengan palet milik aplikasi. false = tanpa pencarian.
   */
  cari?: boolean | { placeholder?: string; tambahan?: ItemFitur[]; onBuka?: () => void };
  /** Ikon notifikasi (GET /v1/notif). `semuaHref` = halaman semua notifikasi di aplikasi. false = tanpa ikon. */
  notifikasi?: boolean | (OpsiNotifikasi & { semuaHref?: string; belumLuar?: number });
  /**
   * Ikon kelola berkas (/v1/berkas): unggah cepat, tab Terbaru (berkas milik sendiri) dan Dibagikan dengan saya,
   * unduh, dan "Kelola berkas" yang selalu membuka file manager (DriveBerkas) dalam modal. false = tanpa ikon.
   */
  berkas?: boolean | TombolBerkasProps;
  /**
   * Ikon pesan masuk (obrolan /v1/obrolan) dan ChatMengambang. `onBuka` bila aplikasi punya halaman obrolan
   * sendiri; `mengambang: false` = tanpa tombol obrolan mengambang. false = tanpa keduanya.
   */
  pesan?: boolean | { onBuka?: (ruang: string | null) => void; mengambang?: boolean; judul?: React.ReactNode };
  /** Mode tampilan untuk tombol tema dan menu akun. */
  tema?: TemaAkun;
  onTema?: (tema: TemaAkun) => void;
  /**
   * Menu akun (avatar). Objek = props MenuAkunSiakad (cadangan, menu, item, ...). ReactNode = menu akun sendiri
   * (mis. alumni tanpa akun SIAKAD). false = tanpa menu akun.
   */
  akun?: false | React.ReactNode | (Omit<MenuAkunProps, 'pengguna' | 'kelengkapan' | 'tema' | 'onTema' | 'onKeluar'> & { cadangan?: AkunPengguna });
  onKeluar?: () => void;
  /** Isi tambahan di kiri bilah atas setelah judul (pemilih prodi, breadcrumb). */
  topbarKiri?: React.ReactNode;
  /** Tombol tambahan di kanan bilah atas, sebelum notifikasi. */
  aksi?: React.ReactNode;
  /** Navigasi bawah untuk layar sempit. */
  navBawah?: ItemNavigasiBawah[];
  /** Kunci aktif navigasi bawah. Bawaan bagian pertama activeKey. */
  navBawahAktif?: string;
  children: React.ReactNode;
  className?: string;
}

function cariLabel(groups: NavGroup[], key?: string): string | undefined {
  if (!key) return undefined;
  for (const g of groups)
    for (const it of g.items) {
      if (it.key === key) return it.labelTeks ?? (typeof it.label === 'string' ? it.label : undefined);
      const c = it.children?.find((x) => x.key === key);
      if (c) return c.labelTeks ?? (typeof c.label === 'string' ? c.label : undefined);
    }
  return undefined;
}

const URUTAN_TEMA: TemaAkun[] = ['terang', 'gelap', 'sistem'];
const LABEL_TEMA: Record<TemaAkun, string> = { terang: 'Mode terang', gelap: 'Mode gelap', sistem: 'Ikuti sistem' };

/**
 * Kerangka bawaan aplikasi dasbor UNIPO, sama di semua aplikasi: sidebar dengan logo + nama yang menuju beranda dan
 * tombol ciutkan; bilah atas dengan judul halaman, pencarian fitur (Ctrl/⌘K), notifikasi, pesan masuk, tombol tema,
 * dan menu akun SIAKAD; navigasi bawah di ponsel; obrolan mengambang.
 *
 * ```tsx
 * <KerangkaAplikasi kode="bauk" nama="BAUK UNIPO" tagline="Keuangan, payroll, dan sarpras" groups={menu} activeKey={aktif}
 *   renderLink={(it, p) => <Link to={it.href!} {...p} />} onNavigasi={navigate} tema={tema} onTema={setTema} onKeluar={keluar}>
 *   <Routes>…</Routes>
 * </KerangkaAplikasi>
 * ```
 */
export function KerangkaAplikasi({
  kode,
  nama,
  tagline,
  logo,
  beranda = '/',
  groups,
  activeKey,
  renderLink,
  onNavigasi,
  judul,
  subjudul,
  sidebarHeader,
  sidebarFooter,
  sidebarUser,
  collapsed: collapsedProp,
  onCollapsedChange,
  cari = true,
  notifikasi = true,
  pesan = true,
  berkas = true,
  tema,
  onTema,
  akun,
  onKeluar,
  topbarKiri,
  aksi,
  navBawah,
  navBawahAktif,
  children,
  className,
}: KerangkaAplikasiProps) {
  const [rail, setRail] = React.useState(false);
  const collapsed = collapsedProp ?? rail;
  const setCollapsed = onCollapsedChange ?? setRail;
  const [palet, setPalet] = React.useState(false);

  const navigasi = React.useCallback(
    (href: string) => {
      if (onNavigasi) onNavigasi(href);
      else if (typeof window !== 'undefined') window.location.assign(href);
    },
    [onNavigasi],
  );

  const opsiCari = typeof cari === 'object' ? cari : {};
  const fitur = React.useMemo(() => [...fiturDariMenu(groups), ...(opsiCari.tambahan ?? [])], [groups, opsiCari.tambahan]);
  const bukaCari = opsiCari.onBuka ?? (() => setPalet(true));
  usePintasanCari(bukaCari, cari !== false && !opsiCari.onBuka);

  const brandIsi = logo ?? <LogoAplikasi kode={kode} name={nama} tagline={tagline} color="var(--u-primary)" />;
  const brandProps = { className: 'u-kerangka-brand', 'aria-label': `${nama ?? kode}: beranda`, children: brandIsi };
  const brand = renderLink ? renderLink({ key: '__beranda', label: nama ?? kode, href: beranda }, { ...brandProps, href: beranda }) : <a {...brandProps} href={beranda} />;

  const judulTampil = judul ?? cariLabel(groups, activeKey) ?? nama ?? kode;
  const gelap = tema === 'gelap' || (tema === 'sistem' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const IkonTema = tema === 'sistem' ? Monitor : gelap ? Moon : Sun;
  const temaBerikut = tema ? URUTAN_TEMA[(URUTAN_TEMA.indexOf(tema) + 1) % URUTAN_TEMA.length]! : 'terang';

  const opsiNotif = typeof notifikasi === 'object' ? notifikasi : {};
  const opsiPesan = typeof pesan === 'object' ? pesan : {};
  const akunNode =
    akun === false ? null : akun && React.isValidElement(akun) ? (
      akun
    ) : (
      <MenuAkunSiakad varian="avatar" align="end" {...((akun as object) ?? {})} tema={tema} onTema={onTema} onKeluar={onKeluar} />
    );

  return (
    <AppShell
      className={cn('u-kerangka-aplikasi', className)}
      sidebar={<Sidebar brand={brand} groups={groups} activeKey={activeKey} header={sidebarHeader} footer={sidebarFooter} user={sidebarUser} collapsed={collapsed} onCollapsedChange={setCollapsed} renderLink={renderLink} />}
      topbar={
        <div className="u-kerangka-topbar">
          <div className="u-kerangka-judul">
            {subjudul && <small>{subjudul}</small>}
            <span>{judulTampil}</span>
          </div>
          {topbarKiri && <div className="u-kerangka-kiri">{topbarKiri}</div>}
          <div className="u-kerangka-aksi">
            {cari !== false && (
              <>
                <SearchTrigger className="u-kerangka-cari" placeholder={opsiCari.placeholder ?? 'Cari fitur'} shortcut={labelPintasanCari()} onClick={bukaCari} />
                <Button variant="ghost" size="sm" iconOnly className="u-kerangka-cari-ikon" aria-label="Cari fitur" onClick={bukaCari}>
                  <Search />
                </Button>
              </>
            )}
            {aksi}
            {notifikasi !== false && <TombolNotifikasi {...opsiNotif} onNavigasi={navigasi} />}
            {pesan !== false && <TombolPesan onBuka={opsiPesan.onBuka} />}
            {berkas !== false && <TombolBerkas {...(typeof berkas === 'object' ? berkas : {})} />}
            {tema && onTema && (
              <Tooltip content={`${LABEL_TEMA[tema]} (ganti ke ${LABEL_TEMA[temaBerikut].toLowerCase()})`}>
                <Button variant="ghost" size="sm" iconOnly className="u-kerangka-tema" aria-label={`Ganti ke ${LABEL_TEMA[temaBerikut].toLowerCase()}`} onClick={() => onTema(temaBerikut)}>
                  <IkonTema />
                </Button>
              </Tooltip>
            )}
            {akunNode}
          </div>
        </div>
      }
    >
      <div className="u-kerangka-isi" data-nav-bawah={navBawah?.length ? '' : undefined}>
        {children}
      </div>
      {cari !== false && !opsiCari.onBuka && <PencarianFitur open={palet} onOpenChange={setPalet} items={fitur} placeholder={opsiCari.placeholder ?? 'Cari fitur atau menu'} onPilih={(it) => it.href && navigasi(it.href)} />}
      {pesan !== false && opsiPesan.mengambang !== false && <ChatMengambang judul={opsiPesan.judul} bawah={navBawah?.length ? 84 : 20} className="u-kerangka-ob" />}
      {navBawah?.length ? (
        <NavigasiBawah
          items={navBawah}
          activeKey={navBawahAktif ?? activeKey?.split('/')[0]}
          renderLink={
            renderLink
              ? (it, isi) =>
                  it.href ? (
                    renderLink({ key: it.key, label: it.label, href: it.href }, { href: it.href, className: 'u-kerangka-nav-bawah', children: isi })
                  ) : (
                    <button type="button" className="u-kerangka-nav-bawah" onClick={it.onClick}>
                      {isi}
                    </button>
                  )
              : undefined
          }
        />
      ) : null}
    </AppShell>
  );
}
