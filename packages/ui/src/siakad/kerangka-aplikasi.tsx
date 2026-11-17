'use client';
import * as React from 'react';
import { Monitor, Moon, Pin, PinOff, Search, Sun } from 'lucide-react';
import { Button } from '../components/actions';
import type { AkunPengguna, MenuAkunProps, TemaAkun } from '../components/akun';
import { LogoAplikasi } from '../components/identity';
import { AppShell, SearchTrigger, Sidebar, type NavGroup, type NavItem, type SidebarProps, type SidebarUser } from '../components/layout';
import { Tooltip } from '../components/overlays';
import { fiturDariMenu, labelPintasanCari, PencarianFitur, usePintasanCari, type ItemFitur } from '../components/pencarian-fitur';
import { NavigasiBawah, type ItemNavigasiBawah } from '../components/platform';
import { cn } from '../lib/cn';
import { MenuAkunSiakad, useAkunSaya } from './akun';
import { useOptionalSiakad } from './provider';
import { useTemaAplikasi } from './tema-aplikasi';
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
  /**
   * Navigasi bawah untuk layar sempit. Bawaan otomatis dari Menu utama: Beranda + menu yang sering dibuka, dilengkapi
   * menu teratas sidebar sampai 5 item. Isi untuk menimpa; [] = tanpa navigasi bawah.
   */
  navBawah?: ItemNavigasiBawah[];
  /** Kunci aktif navigasi bawah. Bawaan bagian pertama activeKey. */
  navBawahAktif?: string;
  /** Versi aplikasi di kaki sidebar, mis. dari package.json lewat `define` Vite (`__VERSI__`). */
  versi?: string;
  /** Status layanan API di kaki sidebar (GET /v1/health, tiap 60 detik saat tab terlihat). Bawaan true. */
  statusApi?: boolean;
  /** Bagian "Pintasan": menu yang paling sering dibuka pengguna ini (disimpan di browser), bisa disematkan. Bawaan true. */
  pintasan?: boolean;
  /** Kode aplikasi tema (/v1/tema) bila berbeda dari `kode`, mis. "api-portal". */
  temaAplikasi?: string;
  /** Lingkup tema, mis. kode fakultas untuk aplikasi fakultas. */
  temaLingkup?: string;
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
  versi,
  statusApi = true,
  pintasan = true,
  temaAplikasi,
  temaLingkup,
  children,
  className,
}: KerangkaAplikasiProps) {
  const siakad = useOptionalSiakad();
  const temaQ = useTemaAplikasi(temaAplikasi ?? (kode === 'api' ? 'api-portal' : kode), temaLingkup, { enabled: Boolean(siakad) });
  const t = tataKerangka(temaQ.data?.tata);
  const kunciCiut = `unipo.sidebar.ciut.${kode}`;
  const [rail, setRailDalam] = React.useState<boolean | null>(() => {
    const v = baca(kunciCiut);
    return v === null ? null : v === '1';
  });
  const railBawaan = t.sidebarMode === 'mini' || (t.sidebarMode === 'otomatis' && typeof window !== 'undefined' && window.innerWidth < 1280);
  const collapsed = collapsedProp ?? rail ?? railBawaan;
  const setCollapsed =
    onCollapsedChange ??
    ((v: boolean) => {
      setRailDalam(v);
      simpan(kunciCiut, v ? '1' : '0');
    });
  const pengguna = useAkunSaya({ foto: false }).data?.akun?.username ?? null;
  const pin = usePintasanMenu(kode, pengguna, groups, activeKey, pintasan && t.sidebarPintasan, beranda);
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
  const kelompokAktif = t.headerJudul === 'breadcrumb' && !subjudul ? cariKelompok(groups, activeKey) : undefined;
  const sidebarKelas = cn(
    t.sidebarGaya === 'gelap' && 'dark u-sb-gelap',
    t.sidebarGaya === 'utama' && 'u-sb-utama',
    t.sidebarGaya === 'menyatu' && 'u-sb-menyatu',
    t.sidebarPadat !== 'normal' && `u-sb-${t.sidebarPadat}`,
    `u-sb-aktif-${t.sidebarAktif}`,
    t.sidebarLebar !== 'normal' && `u-sb-${t.sidebarLebar}`,
  );
  // "Menu utama": Beranda + menu yang sering dibuka, di atas daftar menu. Beranda tidak diulang di bawahnya.
  const berandaItem = groups.flatMap((g) => g.items).find((it) => !it.children?.length && (it.href === beranda || it.key === 'beranda'));
  // Item tingkat atas yang sudah tampil di Menu utama (Beranda, pintasan) tidak diulang di daftar bawah; anak sub menu tetap.
  const diUtama = new Set([...(berandaItem ? [berandaItem.key] : []), ...pin.items.map((x) => x.key)]);
  const groupsTanpaBeranda = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => it.children?.length || !diUtama.has(it.key)) }))
    .filter((g) => g.items.length > 0);
  const adaMenuUtama = Boolean(berandaItem) || pin.items.length > 0;
  const groupsTampil: NavGroup[] =
    collapsed && adaMenuUtama
      ? [{ label: 'Menu utama', items: [...(berandaItem ? [berandaItem] : []), ...pin.items.map((it) => ({ ...it, key: `__pin:${it.key}`, badge: '', children: undefined }))] }, ...groupsTanpaBeranda]
      : groupsTanpaBeranda;
  const navBawahTampil: ItemNavigasiBawah[] = navBawah ?? navBawahOtomatis(berandaItem, pin.items, groupsTanpaBeranda);
  const cariIkonSaja = t.headerCari === 'ikon';
  const cariEl =
    cari !== false ? (
      <>
        {!cariIkonSaja && <SearchTrigger className="u-kerangka-cari" placeholder={opsiCari.placeholder ?? 'Cari fitur'} shortcut={labelPintasanCari()} onClick={bukaCari} />}
        <Button variant="ghost" size="sm" iconOnly className="u-kerangka-cari-ikon" data-selalu={cariIkonSaja ? '' : undefined} aria-label="Cari fitur" onClick={bukaCari}>
          <Search />
        </Button>
      </>
    ) : null;
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
      atribut={{ 'data-header-gaya': t.headerGaya, 'data-header-tinggi': t.headerTinggi, 'data-header-lengket': t.headerLengket ? undefined : 'tidak', 'data-cari': t.headerCari }}
      sidebar={
        <Sidebar
          brand={brand}
          groups={groupsTampil}
          activeKey={activeKey}
          header={
            adaMenuUtama || sidebarHeader ? (
              <>
                {adaMenuUtama && <PintasanSidebar pin={pin} utama={berandaItem} activeKey={activeKey} renderLink={renderLink} />}
                {sidebarHeader}
              </>
            ) : undefined
          }
          footer={sidebarFooter}
          user={sidebarUser}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          renderLink={renderLink}
          ingat={`unipo.sidebar.buka.${kode}`}
          footerTetap={<KakiSidebar versi={versi} statusApi={statusApi} collapsed={collapsed} />}
          className={sidebarKelas}
        />
      }
      topbar={
        <div className="u-kerangka-topbar">
          {t.headerJudul !== 'tanpa' && (
            <div className="u-kerangka-judul">
              {(subjudul ?? kelompokAktif) && <small>{subjudul ?? kelompokAktif}</small>}
              <span>{judulTampil}</span>
            </div>
          )}
          {topbarKiri && <div className="u-kerangka-kiri">{topbarKiri}</div>}
          {t.headerCari === 'tengah' && <div className="u-kerangka-cari-tengah">{cariEl}</div>}
          <div className="u-kerangka-aksi">
            {t.headerCari !== 'tengah' && cariEl}
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
      <div className="u-kerangka-isi" data-nav-bawah={navBawahTampil.length ? '' : undefined}>
        {children}
      </div>
      {cari !== false && !opsiCari.onBuka && <PencarianFitur open={palet} onOpenChange={setPalet} items={fitur} placeholder={opsiCari.placeholder ?? 'Cari fitur atau menu'} onPilih={(it) => it.href && navigasi(it.href)} />}
      {pesan !== false && opsiPesan.mengambang !== false && <ChatMengambang judul={opsiPesan.judul} bawah={navBawahTampil.length ? 84 : 20} className="u-kerangka-ob" />}
      {navBawahTampil.length ? (
        <NavigasiBawah
          items={navBawahTampil}
          activeKey={navBawahAktif ?? (navBawah ? activeKey?.split('/')[0] : activeKey)}
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

// ================================================================ tata kerangka dari tema aplikasi

/** Pilihan tampilan sidebar dan bilah atas di `tata` tema aplikasi (PengaturanTema → Sidebar, Header). */
export interface TataKerangka {
  sidebarGaya: 'terang' | 'gelap' | 'utama' | 'menyatu';
  sidebarMode: 'penuh' | 'mini' | 'otomatis';
  sidebarPadat: 'rapat' | 'normal' | 'lega';
  sidebarAktif: 'lembut' | 'garis' | 'pil';
  sidebarPintasan: boolean;
  sidebarLebar: 'sempit' | 'normal' | 'lebar';
  headerGaya: 'polos' | 'garis' | 'bayang' | 'blur' | 'utama';
  headerTinggi: 'ringkas' | 'normal';
  headerCari: 'tengah' | 'kanan' | 'ikon';
  headerLengket: boolean;
  headerJudul: 'judul' | 'breadcrumb' | 'tanpa';
}

export const TATA_KERANGKA_BAWAAN: TataKerangka = {
  sidebarGaya: 'terang',
  sidebarMode: 'penuh',
  sidebarPadat: 'normal',
  sidebarAktif: 'lembut',
  sidebarPintasan: true,
  sidebarLebar: 'normal',
  headerGaya: 'garis',
  headerTinggi: 'normal',
  headerCari: 'kanan',
  headerLengket: true,
  headerJudul: 'judul',
};

/** Kunci `tata` (snake_case, disimpan di /v1/tema) untuk tiap pilihan kerangka. */
export const KUNCI_TATA_KERANGKA: Record<keyof TataKerangka, string> = {
  sidebarGaya: 'sidebar_gaya',
  sidebarMode: 'sidebar_mode',
  sidebarPadat: 'sidebar_padat',
  sidebarAktif: 'sidebar_aktif',
  sidebarPintasan: 'sidebar_pintasan',
  sidebarLebar: 'sidebar_lebar',
  headerGaya: 'header_gaya',
  headerTinggi: 'header_tinggi',
  headerCari: 'header_cari',
  headerLengket: 'header_lengket',
  headerJudul: 'header_judul',
};

const PILIHAN_TATA: { [K in keyof TataKerangka]: ReadonlyArray<TataKerangka[K]> } = {
  sidebarGaya: ['terang', 'gelap', 'utama', 'menyatu'],
  sidebarMode: ['penuh', 'mini', 'otomatis'],
  sidebarPadat: ['rapat', 'normal', 'lega'],
  sidebarAktif: ['lembut', 'garis', 'pil'],
  sidebarPintasan: [true, false],
  sidebarLebar: ['sempit', 'normal', 'lebar'],
  headerGaya: ['polos', 'garis', 'bayang', 'blur', 'utama'],
  headerTinggi: ['ringkas', 'normal'],
  headerCari: ['tengah', 'kanan', 'ikon'],
  headerLengket: [true, false],
  headerJudul: ['judul', 'breadcrumb', 'tanpa'],
};

/** Baca pilihan kerangka dari `tata` tema; nilai yang tidak dikenal memakai bawaan. */
export function tataKerangka(tata?: Record<string, unknown> | null): TataKerangka {
  const out = { ...TATA_KERANGKA_BAWAAN } as Record<string, unknown>;
  for (const k of Object.keys(KUNCI_TATA_KERANGKA) as Array<keyof TataKerangka>) {
    let v = tata?.[KUNCI_TATA_KERANGKA[k]];
    if (v === 'ya' || v === '1' || v === 1) v = true;
    if (v === 'tidak' || v === '0' || v === 0) v = false;
    if ((PILIHAN_TATA[k] as ReadonlyArray<unknown>).includes(v)) out[k] = v;
  }
  return out as unknown as TataKerangka;
}

function cariKelompok(groups: NavGroup[], key?: string): string | undefined {
  if (!key) return undefined;
  for (const g of groups)
    for (const it of g.items) {
      const label = typeof g.label === 'string' ? g.label : undefined;
      if (it.key === key) return label;
      if (it.children?.some((c) => c.key === key)) return [label, it.labelTeks ?? (typeof it.label === 'string' ? it.label : '')].filter(Boolean).join(' › ');
    }
  return undefined;
}

function baca(kunci: string): string | null {
  try {
    return localStorage.getItem(kunci);
  } catch {
    return null;
  }
}
function simpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai);
  } catch {
    /* penyimpanan diblokir */
  }
}

// ================================================================ Pintasan (menu yang sering dibuka)

interface DataPintasan {
  hitung: Record<string, number>;
  sematan: string[];
}

export interface PintasanMenu {
  items: Array<NavItem & { disematkan: boolean }>;
  sematkan: (key: string) => void;
  lepas: (key: string) => void;
  bolehSematkan: (key?: string) => boolean;
}

function ratakanMenu(groups: NavGroup[]): NavItem[] {
  const out: NavItem[] = [];
  for (const g of groups)
    for (const it of g.items) {
      if (it.children?.length) out.push(...it.children.map((c) => ({ ...c, icon: c.icon ?? it.icon })));
      else out.push(it);
    }
  return out.filter((x) => x.href && !x.disabled);
}

/**
 * Menu yang paling sering dibuka pengguna ini di aplikasi ini (hitungan kunjungan di localStorage per aplikasi dan
 * pengguna) ditambah yang disematkan. Maksimal 5; menu yang dibuka kurang dari 2 kali tidak ikut kecuali disematkan.
 */
export function usePintasanMenu(kode: string, pengguna: string | null, groups: NavGroup[], activeKey: string | undefined, aktif = true, beranda?: string): PintasanMenu {
  const kunci = `unipo.pintasan.${kode}.${pengguna ?? 'tamu'}`;
  const [data, setData] = React.useState<DataPintasan>({ hitung: {}, sematan: [] });
  React.useEffect(() => {
    try {
      const v = JSON.parse(baca(kunci) ?? 'null') as DataPintasan | null;
      setData(v && typeof v === 'object' ? { hitung: v.hitung ?? {}, sematan: Array.isArray(v.sematan) ? v.sematan : [] } : { hitung: {}, sematan: [] });
    } catch {
      setData({ hitung: {}, sematan: [] });
    }
  }, [kunci]);
  const ubah = React.useCallback(
    (fn: (d: DataPintasan) => DataPintasan) =>
      setData((d) => {
        const baru = fn(d);
        simpan(kunci, JSON.stringify(baru));
        return baru;
      }),
    [kunci],
  );
  // Beranda selalu ada di atas menu, jadi tidak ikut pintasan.
  const semua = React.useMemo(() => ratakanMenu(groups).filter((x) => !beranda || x.href !== beranda), [groups, beranda]);
  React.useEffect(() => {
    if (!aktif || !activeKey || !semua.some((x) => x.key === activeKey)) return;
    ubah((d) => ({ ...d, hitung: { ...d.hitung, [activeKey]: (d.hitung[activeKey] ?? 0) + 1 } }));
  }, [activeKey, aktif, semua, ubah]);
  const items = React.useMemo(() => {
    if (!aktif) return [];
    const byKey = new Map(semua.map((x) => [x.key, x]));
    const sem = data.sematan.map((k) => byKey.get(k)).filter((x): x is NavItem => Boolean(x));
    const sering = Object.entries(data.hitung)
      .filter(([k, n]) => n >= 2 && !data.sematan.includes(k) && byKey.has(k))
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => byKey.get(k)!);
    return [...sem.map((x) => ({ ...x, disematkan: true })), ...sering.map((x) => ({ ...x, disematkan: false }))].slice(0, 5);
  }, [aktif, semua, data]);
  return {
    items,
    sematkan: (key) => ubah((d) => ({ ...d, sematan: [...d.sematan.filter((k) => k !== key), key].slice(-5) })),
    lepas: (key) => ubah((d) => ({ hitung: { ...d.hitung, [key]: 0 }, sematan: d.sematan.filter((k) => k !== key) })),
    bolehSematkan: (key) => Boolean(key) && semua.some((x) => x.key === key) && !data.sematan.includes(key!),
  };
}

function PintasanSidebar({ pin, utama, activeKey, renderLink }: { pin: PintasanMenu; utama?: NavItem; activeKey?: string; renderLink?: SidebarProps['renderLink'] }) {
  const tautan = (it: NavItem) => {
    const isi = (
      <>
        <span className="u-nav-icon">{it.icon}</span>
        <span className="u-nav-label">{it.labelTeks ?? it.label}</span>
      </>
    );
    const props = { className: 'u-nav-item', 'data-active': it.key === activeKey ? '' : undefined, 'data-depth': 0, 'aria-current': it.key === activeKey ? ('page' as const) : undefined, children: isi };
    return renderLink ? renderLink(it, { ...props, href: it.href }) : <a {...props} href={it.href} />;
  };
  return (
    <div className="u-pintasan-sb" aria-label="Menu utama">
      <div className="u-pintasan-sb-judul">
        <span>Menu utama</span>
        {pin.bolehSematkan(activeKey) && (
          <Tooltip content="Sematkan halaman ini ke pintasan">
            <button type="button" className="u-pintasan-sb-pin" aria-label="Sematkan halaman ini" onClick={() => activeKey && pin.sematkan(activeKey)}>
              <Pin />
            </button>
          </Tooltip>
        )}
      </div>
      {utama && <div className="u-pintasan-sb-item">{tautan(utama)}</div>}
      {pin.items.map((it) => {
        return (
          <div key={it.key} className="u-pintasan-sb-item">
            {tautan(it)}
            <Tooltip content={it.disematkan ? 'Lepas dari pintasan' : 'Sembunyikan dari pintasan'}>
              <button type="button" className="u-pintasan-sb-lepas" aria-label={`${it.disematkan ? 'Lepas' : 'Sembunyikan'} ${typeof it.label === 'string' ? it.label : ''} dari pintasan`} onClick={() => pin.lepas(it.key)}>
                <PinOff />
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}

// ================================================================ Kaki sidebar: status API, versi, hak cipta

type StatusApi = 'memeriksa' | 'normal' | 'lambat' | 'gangguan';

/** Kesehatan API SIAKAD: GET /v1/health tiap `interval` ms saat tab terlihat. Jawaban 4xx tetap berarti server hidup. */
export function useStatusApi(aktif = true, interval = 60_000): { status: StatusApi; ms: number | null } {
  const siakad = useOptionalSiakad();
  const [st, setSt] = React.useState<{ status: StatusApi; ms: number | null }>({ status: 'memeriksa', ms: null });
  React.useEffect(() => {
    if (!aktif || !siakad) return;
    let batal = false;
    const cek = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const t0 = performance.now();
      try {
        await siakad.request({ method: 'GET', path: '/v1/health', public: true }, { maxRetries: 0, timeout: 15_000 });
        const ms = Math.round(performance.now() - t0);
        if (!batal) setSt({ status: ms > 2500 ? 'lambat' : 'normal', ms });
      } catch (e) {
        const ms = Math.round(performance.now() - t0);
        const kode = Number((e as { status?: number })?.status);
        if (!batal) setSt(kode && kode < 500 ? { status: ms > 2500 ? 'lambat' : 'normal', ms } : { status: 'gangguan', ms: null });
      }
    };
    void cek();
    const t = setInterval(() => void cek(), interval);
    return () => {
      batal = true;
      clearInterval(t);
    };
  }, [aktif, siakad, interval]);
  return st;
}

const LABEL_STATUS: Record<StatusApi, string> = { memeriksa: 'Memeriksa API', normal: 'API normal', lambat: 'API lambat', gangguan: 'API gangguan' };
/** Teks singkat kaki sidebar: "API 42 ms", "API gangguan", atau "API …" saat memeriksa. */
const teksStatus = (st: { status: StatusApi; ms: number | null }) => (st.status === 'gangguan' ? 'API gangguan' : st.ms != null ? `API ${st.ms} ms` : 'API …');

function KakiSidebar({ versi, statusApi, collapsed }: { versi?: string; statusApi: boolean; collapsed?: boolean }) {
  const st = useStatusApi(statusApi);
  const tahun = new Date().getFullYear();
  const hak = `© ${tahun} Universitas Pohuwato`;
  const label = st.ms != null && st.status !== 'gangguan' ? `${LABEL_STATUS[st.status]} · ${st.ms} ms` : LABEL_STATUS[st.status];
  if (collapsed)
    return (
      <Tooltip content={[statusApi ? label : null, versi ? `Versi ${versi}` : null, hak].filter(Boolean).join(' · ')} side="right">
        <span className="u-kaki-sb" data-ringkas="" tabIndex={0} aria-label={[statusApi ? label : null, versi ? `versi ${versi}` : null, hak].filter(Boolean).join(', ')}>
          <span className="u-kaki-sb-titik" data-status={statusApi ? st.status : 'normal'} />
        </span>
      </Tooltip>
    );
  return (
    <div className="u-kaki-sb">
      <div className="u-kaki-sb-baris">
        {statusApi && (
          <span className="u-kaki-sb-status" title={label}>
            <span className="u-kaki-sb-titik" data-status={st.status} />
            {teksStatus(st)}
          </span>
        )}
        {versi && <span className="u-kaki-sb-versi">v{versi.replace(/^v/, '')}</span>}
      </div>
      <small>{hak}</small>
    </div>
  );
}

/** Label pendek untuk navigasi bawah, mis. "Kasir & pembayaran" menjadi "Kasir". */
function labelPendek(it: NavItem): string {
  const t = (it.labelTeks ?? (typeof it.label === 'string' ? it.label : it.key)).trim();
  return t.length <= 12 ? t : (t.split(/[\s&,/]+/)[0] ?? t);
}

/** Navigasi bawah otomatis: Beranda, menu yang sering dibuka, lalu menu teratas sidebar; maksimal 5. */
function navBawahOtomatis(beranda: NavItem | undefined, pin: NavItem[], groups: NavGroup[]): ItemNavigasiBawah[] {
  const out: NavItem[] = [];
  const tambah = (it?: NavItem) => {
    if (it && it.href && !it.disabled && out.length < 5 && !out.some((x) => x.key === it.key)) out.push(it);
  };
  tambah(beranda);
  pin.forEach(tambah);
  for (const g of groups)
    for (const it of g.items) {
      if (it.children?.length) it.children.forEach((c) => tambah({ ...c, icon: c.icon ?? it.icon }));
      else tambah(it);
    }
  return out.map((it) => ({ key: it.key, label: labelPendek(it), icon: it.icon, href: it.href, badge: it.badge }));
}
