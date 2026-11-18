'use client';
import * as React from 'react';
import { ExternalLink, Monitor, Moon, Search, Star, Sun } from 'lucide-react';
import { Button } from '../components/actions';
import type { AkunPengguna, MenuAkunProps, TemaAkun } from '../components/akun';
import { LogoAplikasi } from '../components/identity';
import { animasikanMasuk, BilahProgres, MuatHalaman, useMuatTertunda, usePantauMuat, type GayaMuatAwal, type GayaMuatPindah, type TataMuatHalaman } from '../components/muat-halaman';
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
import { PengumumanTampil } from './pengumuman-lintas';
import { StatusSidebar, type StatusSidebarProps } from './status-sidebar';
import { BintangPintasan, MAKS_SEMATAN, PenyediaPintasan, TombolPintasan, usePintasanMenu } from './pintasan-menu';


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
   * Navigasi bawah untuk layar sempit. Bawaan: Beranda + menu yang disematkan pengguna (maks. 5 item); bila belum ada
   * sematan, Beranda + menu teratas sidebar. Isi untuk menimpa; [] = tanpa navigasi bawah.
   */
  navBawah?: ItemNavigasiBawah[];
  /** Kunci aktif navigasi bawah. Bawaan bagian pertama activeKey. */
  navBawahAktif?: string;
  /** Versi aplikasi di kaki sidebar, mis. dari package.json lewat `define` Vite (`__VERSI__`). */
  versi?: string;
  /** Commit pendek build aplikasi di kaki sidebar, mis. `__COMMIT__` dari `define` Vite. */
  commit?: string;
  /**
   * Status API dan lencana lingkungan/database di kaki sidebar (GET /v1/health/lingkungan, tiap 60 detik saat tab
   * terlihat; SIAKAD lama: GET /v1/health). Bawaan true.
   */
  statusApi?: boolean;
  /**
   * Kaki sidebar bawaan (`StatusSidebar`): objek = timpa sebagian prop (mis. `lingkunganAplikasi`, `hakCipta`,
   * `interval`); ReactNode = kaki sendiri; false = tanpa kaki sidebar.
   */
  statusSidebar?: false | React.ReactElement | Omit<StatusSidebarProps, 'collapsed' | 'versi' | 'commit' | 'statusApi'>;
  /**
   * Pintasan menu pengguna (disimpan di peramban per aplikasi + pengguna): bintang sematkan di item sidebar (item tetap
   * di grupnya), tombol bintang "Pintasan" di bilah atas (Disematkan + Sering dibuka), bagian awal pencarian fitur,
   * navigasi bawah ponsel, dan `PintasanBeranda`. Bawaan true; false mematikan semuanya.
   */
  pintasan?: boolean;
  /** Kode aplikasi tema (/v1/tema) bila berbeda dari `kode`, mis. "api-portal". */
  temaAplikasi?: string;
  /** Lingkup tema, mis. kode fakultas untuk aplikasi fakultas. */
  temaLingkup?: string;
  /**
   * Bentuk kerangka (skeleton) saat halaman pertama dimuat. Bawaan: "dasbor" di beranda, "tabel" di halaman lain.
   * Fungsi menerima `activeKey`.
   */
  tataMuat?: TataMuatHalaman | ((activeKey?: string) => TataMuatHalaman);
  /**
   * Pengumuman lintas aplikasi (/v1/notif/pita) sesuai mode masing-masing: pita di atas, banner di atas isi, popup,
   * toast, dan bilah bawah. Bawaan true (kode aplikasi = `kode`); false mematikan.
   */
  pengumuman?: boolean | { aplikasi?: string };
  /** Timpa efek memuat dari tema (`tata.muat_awal`, `tata.muat_pindah`); `false` mematikan semuanya. */
  muat?: false | { awal?: GayaMuatAwal; pindah?: GayaMuatPindah };
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
 * tombol ciutkan; bilah atas dengan judul halaman, pencarian fitur (Ctrl/⌘K), notifikasi, pesan masuk, tombol tema (hanya bila
 * tanpa menu akun bawaan, yang sudah memuat pilihan tema),
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
  commit,
  statusApi = true,
  statusSidebar,
  pintasan = true,
  temaAplikasi,
  temaLingkup,
  tataMuat,
  muat,
  pengumuman = true,
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
  const akunQ = useAkunSaya({ foto: false });
  const pengguna = akunQ.data?.akun?.username ?? null;
  const pin = usePintasanMenu(kode, pengguna, groups, activeKey, pintasan, beranda, !akunQ.loading);
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
  // Beranda selalu paling atas sidebar. Menu lain TIDAK pernah dipindah atau disembunyikan oleh pintasan: yang
  // disematkan tetap di grupnya dan hanya diberi bintang (pintasan ada di tombol bilah atas, Ctrl/⌘K, dan beranda).
  const berandaItem = groups.flatMap((g) => g.items).find((it) => !it.children?.length && (it.href === beranda || it.key === 'beranda'));
  const groupsTanpaBeranda = berandaItem
    ? groups.map((g) => ({ ...g, items: g.items.filter((it) => it.key !== berandaItem.key) })).filter((g) => g.items.length > 0)
    : groups;
  const groupsTampil: NavGroup[] = berandaItem ? [{ items: [berandaItem] }, ...groupsTanpaBeranda] : groupsTanpaBeranda;
  const aksiItem = pin.aktif ? (it: NavItem) => (pin.bisa(it.key) ? <BintangPintasan pin={pin} item={it} className={pin.apakahDisematkan(it.key) ? 'u-nav-aksi-tetap' : undefined} /> : null) : undefined;
  const menuItem = pin.aktif
    ? (it: NavItem) => {
        if (!pin.bisa(it.key)) return undefined;
        const di = pin.apakahDisematkan(it.key);
        return [
          di
            ? { label: 'Lepas dari Pintasan', icon: <Star />, onSelect: () => pin.lepas(it.key) }
            : { label: pin.penuh ? `Pintasan penuh (maks. ${MAKS_SEMATAN})` : 'Sematkan ke Pintasan', icon: <Star />, onSelect: () => pin.sematkan(it.key), disabled: pin.penuh },
          { label: 'Buka di tab baru', icon: <ExternalLink />, onSelect: () => it.href && window.open(it.href, '_blank', 'noopener') },
        ];
      }
    : undefined;
  const navBawahTampil: ItemNavigasiBawah[] = navBawah ?? navBawahOtomatis(berandaItem, pin.disematkan, groupsTanpaBeranda);
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

  // ---- efek memuat: halaman pertama dan pindah menu (lihat components/muat-halaman)
  const muatAwal: GayaMuatAwal = muat === false ? 'tidak' : (muat?.awal ?? t.muatAwal);
  const muatPindah: GayaMuatPindah = muat === false ? 'tidak' : (muat?.pindah ?? t.muatPindah);
  const isiRef = React.useRef<HTMLDivElement>(null);
  const jalur = `${typeof window !== 'undefined' ? window.location.pathname : ''}|${activeKey ?? ''}`;
  const [sesiMuat, setSesiMuat] = React.useState<'awal' | 'pindah' | null>('awal');
  const jalurLalu = React.useRef(jalur);
  const efekMasuk = muatPindah.endsWith('blur') ? 'blur' : muatPindah.endsWith('pudar') ? 'pudar' : null;
  React.useLayoutEffect(() => {
    if (jalurLalu.current === jalur) return;
    jalurLalu.current = jalur;
    setSesiMuat('pindah');
    if (efekMasuk) animasikanMasuk(isiRef.current, efekMasuk);
  }, [jalur, efekMasuk]);
  const adaMuat = usePantauMuat(isiRef, sesiMuat !== null);
  const sesiSebelum = React.useRef(sesiMuat);
  React.useEffect(() => {
    if (!sesiMuat) return;
    // Selesai bila isi tidak lagi punya pemuat (setelah jeda singkat), paling lama 10 detik.
    const t = setTimeout(() => setSesiMuat(null), adaMuat ? 10_000 : 140);
    return () => clearTimeout(t);
  }, [sesiMuat, adaMuat]);
  const muatTerlihat = useMuatTertunda(sesiMuat !== null && adaMuat, { tunda: 150, minimal: 300 });
  React.useEffect(() => {
    // Isi baru muncul halus setelah pemuat yang sempat terlihat hilang.
    if (!muatTerlihat && sesiSebelum.current && efekMasuk) animasikanMasuk(isiRef.current, efekMasuk);
    sesiSebelum.current = muatTerlihat ? sesiMuat : null;
  }, [muatTerlihat]); // eslint-disable-line react-hooks/exhaustive-deps
  const tutupAktif = sesiMuat === 'awal' && adaMuat && muatAwal !== 'tidak';
  const tutupTampil = useMuatTertunda(tutupAktif, { tunda: 150, minimal: 350 });
  const [tutupAda, setTutupAda] = React.useState(false);
  React.useEffect(() => {
    if (tutupTampil) return setTutupAda(true);
    const x = setTimeout(() => setTutupAda(false), 220);
    return () => clearTimeout(x);
  }, [tutupTampil]);
  const tataMuatTampil: TataMuatHalaman =
    typeof tataMuat === 'function' ? tataMuat(activeKey) : (tataMuat ?? (activeKey && berandaItem && activeKey === berandaItem.key ? 'dasbor' : 'tabel'));

  const nilaiPintasan = React.useMemo(() => ({ pin, activeKey, renderLink }), [pin, activeKey, renderLink]);

  const kodePengumuman = pengumuman === false ? null : ((typeof pengumuman === 'object' ? pengumuman.aplikasi : undefined) ?? kode);

  return (
    <PenyediaPintasan value={nilaiPintasan}>
    {kodePengumuman && siakad && <PengumumanTampil aplikasi={kodePengumuman} bagian={['atas']} />}
    <AppShell
      className={cn('u-kerangka-aplikasi', className)}
      atribut={{ 'data-header-gaya': t.headerGaya, 'data-header-tinggi': t.headerTinggi, 'data-header-lengket': t.headerLengket ? undefined : 'tidak', 'data-cari': t.headerCari }}
      sidebar={
        <Sidebar
          brand={brand}
          groups={groupsTampil}
          activeKey={activeKey}
          header={sidebarHeader}
          aksiItem={aksiItem}
          menuItem={menuItem}
          footer={sidebarFooter}
          user={sidebarUser}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          renderLink={renderLink}
          ingat={`unipo.sidebar.buka.${kode}`}
          footerTetap={
            statusSidebar === false ? undefined : React.isValidElement(statusSidebar) ? (
              statusSidebar
            ) : (
              <StatusSidebar {...(statusSidebar ?? {})} versi={versi} commit={commit} statusApi={statusApi} collapsed={collapsed} />
            )
          }
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
            {pintasan && t.sidebarPintasan && <TombolPintasan pin={pin} activeKey={activeKey} renderLink={renderLink} />}
            {notifikasi !== false && <TombolNotifikasi {...opsiNotif} onNavigasi={navigasi} />}
            {pesan !== false && <TombolPesan onBuka={opsiPesan.onBuka} />}
            {berkas !== false && <TombolBerkas {...(typeof berkas === 'object' ? berkas : {})} />}
            {/* Pilihan tema ada di menu akun bawaan (Terang/Gelap/Sistem); tombol bilah atas hanya bila menu akun itu tidak dipakai. */}
            {tema && onTema && (akun === false || React.isValidElement(akun)) && (
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
      <div ref={isiRef} className="u-kerangka-isi" data-nav-bawah={navBawahTampil.length ? '' : undefined} aria-busy={muatTerlihat || undefined}>
        {kodePengumuman && siakad && <PengumumanTampil aplikasi={kodePengumuman} bagian={['isi']} />}
        {children}
        {tutupAda && (
          <div className="u-mh-tutup" data-keluar={tutupTampil ? undefined : ''}>
            <MuatHalaman gaya={muatAwal} tata={tataMuatTampil} logo={brandIsi} />
          </div>
        )}
      </div>
      {muatPindah.startsWith('progres') && <BilahProgres aktif={sesiMuat !== null && adaMuat} tunda={150} />}
      {kodePengumuman && siakad && <PengumumanTampil aplikasi={kodePengumuman} bagian={['lapis']} />}
      {cari !== false && !opsiCari.onBuka && (
        <PencarianFitur
          open={palet}
          onOpenChange={setPalet}
          items={fitur}
          placeholder={opsiCari.placeholder ?? 'Cari fitur atau menu'}
          onPilih={(it) => it.href && navigasi(it.href)}
          bagianAwal={
            pin.aktif
              ? [
                  { judul: 'Disematkan', keys: pin.disematkan.map((x) => x.key) },
                  { judul: 'Sering dibuka', keys: pin.sering.map((x) => x.key) },
                ]
              : undefined
          }
          sematan={pin.aktif ? { apakah: pin.apakahDisematkan, bisa: pin.bisa, penuh: pin.penuh, alihkan: pin.alihkan } : undefined}
        />
      )}
      {pesan !== false && opsiPesan.mengambang !== false && <ChatMengambang judul={opsiPesan.judul} navBawah={navBawahTampil.length > 0} className="u-kerangka-ob" />}
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
    </PenyediaPintasan>
  );
}

// ================================================================ tata kerangka dari tema aplikasi

/** Pilihan tampilan sidebar dan bilah atas di `tata` tema aplikasi (PengaturanTema → Sidebar, Header). */
export interface TataKerangka {
  sidebarGaya: 'terang' | 'gelap' | 'utama' | 'menyatu';
  sidebarMode: 'penuh' | 'mini' | 'otomatis';
  sidebarPadat: 'rapat' | 'normal' | 'lega';
  sidebarAktif: 'lembut' | 'garis' | 'pil';
  /** Tombol bintang "Pintasan" di bilah atas (kunci lama `sidebar_pintasan` dipertahankan). Bawaan true. */
  sidebarPintasan: boolean;
  sidebarLebar: 'sempit' | 'normal' | 'lebar';
  headerGaya: 'polos' | 'garis' | 'bayang' | 'blur' | 'utama';
  headerTinggi: 'ringkas' | 'normal';
  headerCari: 'tengah' | 'kanan' | 'ikon';
  headerLengket: boolean;
  headerJudul: 'judul' | 'breadcrumb' | 'tanpa';
  /** Efek saat aplikasi pertama dibuka. */
  muatAwal: GayaMuatAwal;
  /** Efek saat pindah menu. */
  muatPindah: GayaMuatPindah;
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
  muatAwal: 'kerangka',
  muatPindah: 'progres-pudar',
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
  muatAwal: 'muat_awal',
  muatPindah: 'muat_pindah',
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
  muatAwal: ['kerangka', 'logo', 'putar', 'titik', 'tidak'],
  muatPindah: ['progres-pudar', 'progres', 'progres-blur', 'pudar', 'blur', 'tidak'],
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

/** Label pendek untuk navigasi bawah, mis. "Kasir & pembayaran" menjadi "Kasir". */
function labelPendek(it: NavItem): string {
  const t = (it.labelTeks ?? (typeof it.label === 'string' ? it.label : it.key)).trim();
  return t.length <= 12 ? t : (t.split(/[\s&,/]+/)[0] ?? t);
}

/**
 * Navigasi bawah otomatis, maksimal 5: Beranda + menu yang disematkan (stabil, tidak ikut hitungan kunjungan). Bila
 * belum ada sematan: Beranda + menu teratas sidebar.
 */
function navBawahOtomatis(beranda: NavItem | undefined, pin: NavItem[], groups: NavGroup[]): ItemNavigasiBawah[] {
  const out: NavItem[] = [];
  const tambah = (it?: NavItem) => {
    if (it && it.href && !it.disabled && out.length < 5 && !out.some((x) => x.key === it.key)) out.push(it);
  };
  tambah(beranda);
  pin.forEach(tambah);
  if (!pin.length)
    for (const g of groups)
      for (const it of g.items) {
        if (it.children?.length) it.children.forEach((c) => tambah({ ...c, icon: c.icon ?? it.icon }));
        else tambah(it);
      }
  return out.map((it) => ({ key: it.key, label: labelPendek(it), icon: it.icon, href: it.href, badge: it.badge }));
}
