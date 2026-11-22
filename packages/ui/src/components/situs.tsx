'use client';
import * as React from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, type ButtonVariant } from './actions';
import { Footer, PitaPengumuman, TopbarKontak, tautanWhatsapp, type ItemPita } from './kaki-situs';
import { SocialLinks } from './landing';
import { TeksRingan, type AksiLanding, type PenyediaLanding } from './landing-blok';
import { IKON_LANDING, gambarAman, type TombolLanding } from './landing-skema';
import { Navbar, type NavbarColumn, type NavbarLink, type NavbarMenu, type NavbarProps } from './navbar';
import { bentukMenu, normalisasiSitus, tautanSitusAman, type ButirMenu, type DokumenSitus, type KunciBagianSitus, type TautanSitus, type WidgetSidebar } from './situs-skema';
import type { SidebarUser } from './layout';

/**
 * Kerangka situs publik dari pengaturan tema (GET /v1/tema/{aplikasi}/situs): pita pengumuman, bilah atas, navbar
 * dengan menu utama bertingkat (dropdown, mega menu + kartu sorotan), kotak cari, tombol ajakan, sidebar halaman
 * dalam, dan kaki situs. Satu renderer untuk halaman publik dan pratinjau penyunting (PenyuntingSitus).
 * Komponen dasarnya tetap bisa dipakai sendiri: Navbar, TopbarKontak, PitaPengumuman, Footer.
 */

type RenderLink = NavbarProps['renderLink'];

export interface KerangkaSitusProps {
  /** Pengaturan situs (terbit atau draf). Null = kerangka tidak dirender, hanya isi. */
  situs: DokumenSitus | null | undefined;
  /** Peta `uuid → URL` untuk `berkas:<uuid>` (gambar kartu sorotan, tautan unduhan). */
  berkas?: Record<string, string> | null;
  /** Logo + nama aplikasi untuk navbar dan kaki. */
  merek: React.ReactNode;
  /** Tujuan klik logo (bawaan "/"). */
  merekHref?: string;
  /** Nama untuk hak cipta bawaan kaki situs. */
  namaHakCipta?: React.ReactNode;
  /** Aksi aplikasi untuk tautan `aksi:<kunci>` (mis. masuk, daftar). Tombol dengan aksi yang tidak tersedia disembunyikan. */
  aksi?: Record<string, AksiLanding>;
  /** Bagian halaman bertanda menu (menuLanding(dok)); dipakai bila kepala.menu_bagian. */
  menuBagian?: Array<{ key: string; label: string; href: string }>;
  /** Kunci atau alamat menu yang sedang dibuka (aria-current). Bawaan: cocokkan location.pathname. */
  aktif?: string;
  /** Menu pengguna di navbar (aplikasi yang sudah masuk). */
  user?: SidebarUser;
  /** Penyedia data dinamis (widget berita sidebar memakai `Kabar`). LandingAplikasi/SitusAplikasi memasangnya otomatis. */
  penyedia?: PenyediaLanding;
  /** Tampilkan sidebar (untuk halaman dalam). Bawaan false: beranda landing tanpa sidebar. */
  sidebar?: boolean;
  /**
   * Bagian pertama isi berlatar foto atau gelap (hero bergambar). Hanya bila true, pilihan "navbar tembus pandang"
   * berlaku, agar teks menu putih tidak pernah jatuh di atas latar terang. SitusAplikasi menghitungnya dari halaman.
   */
  atasGelap?: boolean;
  /** Mode penyunting: tautan tidak berpindah halaman, klik memilih bagian. */
  pratinjau?: boolean;
  /** Bagian yang sedang dipilih di penyunting (diberi garis sorot). */
  terpilih?: KunciBagianSitus | null;
  onPilih?: (bagian: KunciBagianSitus) => void;
  renderLink?: RenderLink;
  className?: string;
  children?: React.ReactNode;
}

interface Tujuan {
  href?: string;
  onClick?: () => void;
  external?: boolean;
  label?: string;
}

/** Ubah url pengaturan menjadi tujuan klik: aksi aplikasi, unduhan berkas publik, atau tautan biasa. */
export function tujuanSitus(url: unknown, ctx: { aksi?: Record<string, AksiLanding>; berkas?: Record<string, string> | null; baru?: boolean }): Tujuan | null {
  const u = tautanSitusAman(url);
  if (!u) return null;
  if (u.startsWith('aksi:')) {
    const a = ctx.aksi?.[u.slice(5)];
    if (!a || (!a.href && !a.onClick)) return null;
    const href = a.href ? tautanSitusAman(a.href) : undefined;
    return { href: href && !href.startsWith('aksi:') && !href.startsWith('berkas:') ? href : undefined, onClick: a.onClick, label: a.labelTombol };
  }
  if (u.startsWith('berkas:')) {
    const href = ctx.berkas?.[u.slice(7)];
    return href ? { href, external: true } : null;
  }
  return { href: u, external: !!ctx.baru && /^https?:/i.test(u) };
}

const ikonMenu = (nama?: string) => {
  const I = nama ? IKON_LANDING[nama]?.Ikon : undefined;
  return I ? <I aria-hidden /> : undefined;
};

function keTautan(b: ButirMenu, ctx: Parameters<typeof tujuanSitus>[1]): NavbarLink | null {
  const t = tujuanSitus(b.url, { ...ctx, baru: b.baru });
  if (!b.label || (!t && b.url)) return null;
  return { key: b.id, label: b.label, href: t?.href, onClick: t?.onClick, external: t?.external, description: b.keterangan, icon: ikonMenu(b.ikon), badge: b.lencana };
}

/** Menu utama pengaturan → menu Navbar: tautan, dropdown satu kolom, atau mega menu berkolom + kartu sorotan. */
export function menuSitusKeNavbar(menu: ButirMenu[], ctx: Parameters<typeof tujuanSitus>[1] = {}): NavbarMenu[] {
  const out: NavbarMenu[] = [];
  for (const b of menu) {
    if (!b.label) continue;
    const bentuk = bentukMenu(b);
    const t = tujuanSitus(b.url, { ...ctx, baru: b.baru });
    if (bentuk === 'tautan') {
      if (t) out.push({ key: b.id, label: b.label, href: t.href, onClick: t.onClick, external: t.external });
      continue;
    }
    const anak = b.anak ?? [];
    const sorotT = b.sorot?.judul ? tujuanSitus(b.sorot.url, ctx) : null;
    const featured =
      b.sorot?.judul && sorotT?.href
        ? { eyebrow: b.sorot.label, title: b.sorot.judul, description: b.sorot.teks, href: sorotT.href, image: gambarAman(b.sorot.gambar, ctx.berkas), cta: b.sorot.tombol }
        : undefined;
    // Induk yang punya tujuan sendiri ditaruh sebagai tautan pertama panel ("Ikhtisar"), karena pemicunya membuka panel.
    const ikhtisar: NavbarLink[] = t?.href ? [{ key: `${b.id}-ikhtisar`, label: `Semua ${b.label.toLowerCase()}`, href: t.href, external: t.external }] : [];
    if (bentuk === 'dropdown') {
      const items = [...ikhtisar, ...anak.map((a) => keTautan(a, ctx)).filter((x): x is NavbarLink => !!x)];
      if (items.length) out.push({ key: b.id, label: b.label, items, featured });
      continue;
    }
    const lepas = anak
      .filter((a) => !a.anak?.length)
      .map((a) => keTautan(a, ctx))
      .filter((x): x is NavbarLink => !!x);
    const columns: NavbarColumn[] = [
      ...(lepas.length || ikhtisar.length ? [{ items: [...ikhtisar, ...lepas] }] : []),
      ...anak
        .filter((a) => a.anak?.length)
        .map((a) => ({ title: a.label, items: (a.anak ?? []).map((c) => keTautan(c, ctx)).filter((x): x is NavbarLink => !!x) }))
        .filter((c) => c.items.length),
    ];
    if (columns.length) out.push({ key: b.id, label: b.label, columns, featured });
  }
  return out;
}

const VARIAN_TOMBOL: Record<string, ButtonVariant> = { utama: 'primary', garis: 'outline', teks: 'link', aksen: 'secondary' };

function DeretTombolSitus({ tombol, ctx, ukuran = 'sm', className }: { tombol?: TombolLanding[]; ctx: Parameters<typeof tujuanSitus>[1]; ukuran?: 'sm' | 'md' | 'lg'; className?: string }) {
  const isi = (tombol ?? [])
    .filter((x) => x.label)
    .map((x, i) => ({ x, i, t: tujuanSitus(x.url, { ...ctx, baru: x.baru }) }))
    .filter((b) => b.t);
  if (!isi.length) return null;
  return (
    <div className={cn('us-tombol', className)}>
      {isi.map(({ x, i, t }) => {
        const varian = VARIAN_TOMBOL[x.gaya ?? (i === isi.length - 1 ? 'utama' : 'garis')] ?? 'primary';
        const label = (
          <>
            {t!.label ?? x.label}
            {x.gaya === 'teks' && <ArrowRight aria-hidden />}
          </>
        );
        return t!.href ? (
          <Button key={i} size={ukuran} variant={varian} onClick={t!.onClick} render={<a href={t!.href} {...(t!.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />}>
            {label}
          </Button>
        ) : (
          <Button key={i} size={ukuran} variant={varian} onClick={t!.onClick}>
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/** Kotak cari situs (GET ke halaman hasil dengan ?q=). */
export function KotakCariSitus({ url = '/cari', contoh = 'Cari di situs ini', ringkas, className }: { url?: string; contoh?: string; ringkas?: boolean; className?: string }) {
  const id = React.useId();
  const tujuan = /^(\/(?!\/)|https?:)/.test(url) ? url : '/cari';
  return (
    <form
      role="search"
      action={tujuan}
      method="get"
      className={cn('us-cari', className)}
      data-ringkas={dataFlag(ringkas)}
      onSubmit={(e) => {
        // Kotak yang menyusut menjadi ikon: klik pertama membuka isian, bukan mencari kata kosong.
        const isian = e.currentTarget.elements.namedItem('q') as HTMLInputElement | null;
        if (isian && !isian.value.trim()) {
          e.preventDefault();
          isian.focus();
        }
      }}
    >
      <label htmlFor={id} className="u-sr-only">
        {contoh}
      </label>
      <input id={id} className="us-cari-isian" type="search" name="q" placeholder={contoh} autoComplete="off" enterKeyHint="search" />
      <button type="submit" className="us-cari-tombol" aria-label="Cari">
        <Search aria-hidden />
      </button>
    </form>
  );
}

const tautanDaftar = (daftar: TautanSitus[] | undefined, ctx: Parameters<typeof tujuanSitus>[1]): NavbarLink[] =>
  (daftar ?? []).flatMap((l, i) => {
    const t = tujuanSitus(l.url, { ...ctx, baru: l.baru });
    return l.label && t ? [{ key: String(i), label: l.label, href: t.href, onClick: t.onClick, external: t.external }] : [];
  });

const sosialDaftar = (d?: Array<{ jenis?: string; url?: string }>) => (d ?? []).flatMap((x) => (x.url && /^(https?:|mailto:)/.test(x.url) ? [{ jenis: x.jenis ?? 'website', url: x.url }] : []));

function cocokAktif(menu: NavbarMenu[], aktif?: string): string | undefined {
  const jalur = aktif ?? (typeof location !== 'undefined' ? location.pathname : undefined);
  if (!jalur) return undefined;
  let terbaik: { key: string; panjang: number } | undefined;
  const periksa = (key: string | undefined, href?: string) => {
    if (!key) return;
    if (key === jalur) terbaik = { key, panjang: Infinity };
    if (!href || !href.startsWith('/')) return;
    const sama = href === jalur || (href !== '/' && jalur.startsWith(`${href}/`));
    if (sama && (!terbaik || href.length > terbaik.panjang)) terbaik = { key, panjang: href.length };
  };
  for (const m of menu) {
    periksa(m.key, m.href);
    for (const c of m.columns ?? (m.items ? [{ items: m.items }] : [])) for (const l of c.items) periksa(l.key, l.href);
  }
  return terbaik?.key;
}

// ---------------------------------------------------------------- bagian

/** Pita pengumuman dari pengaturan situs. */
export function PitaSitus({ pita, ctx, pratinjau }: { pita: DokumenSitus['pita']; ctx: Parameters<typeof tujuanSitus>[1]; pratinjau?: boolean }) {
  if (!pita.aktif) return null;
  const items: ItemPita[] = (pita.butir ?? []).flatMap((b, i) => {
    if (!b.teks) return [];
    const t = tujuanSitus(b.url, ctx);
    return [
      {
        id: `${i}-${b.teks}`,
        title: b.teks,
        href: t?.href,
        external: t?.external,
        cta: b.label || undefined,
        priority: ({ utama: 'biasa', aksen: 'aksen', lembut: 'lembut', gelap: 'gelap' } as const)[pita.nada ?? 'utama'],
        dapatDitutup: pita.tutup !== false,
      },
    ];
  });
  if (!items.length) return null;
  return <PitaPengumuman items={items} dapatDitutup={pita.tutup !== false && !pratinjau} ingat={pratinjau ? undefined : 'unipo.situs.pita'} className="us-pita" />;
}

/** Isi bilah atas navbar (kontak, tautan cepat, media sosial). */
export function BilahAtasSitus({ atas, ctx, renderLink }: { atas: DokumenSitus['atas']; ctx: Parameters<typeof tujuanSitus>[1]; renderLink?: RenderLink }) {
  if (!atas.aktif) return null;
  const sosial = sosialDaftar(atas.sosial);
  return (
    <TopbarKontak
      kontak={{ telepon: atas.telepon, email: atas.surel, jam: atas.jam, whatsapp: atas.whatsapp }}
      links={tautanDaftar(atas.tautan, ctx)}
      extra={sosial.length ? <SocialLinks items={sosial} className="us-atas-sosial" /> : undefined}
      renderLink={renderLink}
    />
  );
}

/** Kepala situs: pita, bilah atas, dan navbar dengan menu utama. */
export function KepalaSitus({
  situs,
  berkas,
  merek,
  merekHref = '/',
  aksi,
  menuBagian,
  aktif,
  user,
  pratinjau,
  transparan,
  renderLink,
  className,
}: Pick<KerangkaSitusProps, 'berkas' | 'merek' | 'merekHref' | 'aksi' | 'menuBagian' | 'aktif' | 'user' | 'pratinjau' | 'renderLink' | 'className'> & {
  situs: DokumenSitus;
  /** Navbar tembus pandang (pemanggil memastikan latar di bawahnya gelap). */ transparan?: boolean;
}) {
  const ctx = React.useMemo(() => ({ aksi, berkas }), [aksi, berkas]);
  const k = situs.kepala;
  const menus = React.useMemo(() => {
    const utama = menuSitusKeNavbar(situs.menu, ctx);
    const bagian = k.menu_bagian ? (menuBagian ?? []).filter((m) => !utama.some((u) => u.href === m.href)) : [];
    return [...utama, ...bagian];
  }, [situs.menu, ctx, k.menu_bagian, menuBagian]);
  const kunciAktif = React.useMemo(() => cocokAktif(menus, aktif), [menus, aktif]);
  const atas = <BilahAtasSitus atas={situs.atas} ctx={ctx} renderLink={renderLink} />;
  return (
    <div className={cn('us-kepala', className)}>
      <div data-bagian="pita">
        <PitaSitus pita={situs.pita} ctx={ctx} pratinjau={pratinjau} />
      </div>
      <Navbar
        brand={merek}
        brandHref={merekHref}
        menus={menus}
        activeKey={kunciAktif}
        variant={k.tampilan === 'aplikasi' ? 'app' : k.tampilan === 'ringkas' ? 'ringkas' : 'portal'}
        sticky={k.lengket !== false}
        transparent={!!transparan}
        align={k.rata === 'tengah' ? 'center' : 'start'}
        topbar={situs.atas.aktif ? atas : undefined}
        search={k.cari ? <KotakCariSitus url={k.cari_url || '/cari'} contoh={k.cari_contoh || undefined} /> : undefined}
        actions={<DeretTombolSitus tombol={k.tombol} ctx={ctx} />}
        user={user}
        renderLink={renderLink}
        className="us-navbar"
      />
    </div>
  );
}

/** Kaki situs dari pengaturan. */
export function KakiSitus({
  situs,
  berkas,
  merek,
  namaHakCipta,
  aksi,
  renderLink,
  className,
}: Pick<KerangkaSitusProps, 'berkas' | 'merek' | 'namaHakCipta' | 'aksi' | 'renderLink' | 'className'> & { situs: DokumenSitus }) {
  const k = situs.kaki;
  if (!k.aktif) return null;
  const ctx = { aksi, berkas };
  const ringkas = k.tampilan === 'ringkas';
  const columns: NavbarColumn[] = (k.kolom ?? []).map((c) => ({ title: c.judul, items: tautanDaftar(c.tautan, ctx) })).filter((c) => c.items.length);
  const ajakan =
    !ringkas && k.ajakan_judul ? (
      <div className="us-kaki-ajakan">
        <div>
          <p className="us-kaki-ajakan-judul">{k.ajakan_judul}</p>
          {k.ajakan_teks && <p className="us-kaki-ajakan-teks">{k.ajakan_teks}</p>}
        </div>
        <DeretTombolSitus tombol={k.ajakan_tombol} ctx={ctx} ukuran="md" />
      </div>
    ) : undefined;
  return (
    <Footer
      className={cn('us-kaki', className)}
      variant={k.tampilan ?? 'gelap'}
      brand={merek}
      description={k.teks || undefined}
      columns={columns}
      kontak={ringkas ? undefined : { alamat: k.alamat, telepon: k.telepon, email: k.surel, whatsapp: k.whatsapp, jam: k.jam, peta: k.peta_url }}
      sosial={sosialDaftar(k.sosial)}
      ajakan={ajakan}
      hakCipta={k.hak_cipta || undefined}
      namaHakCipta={namaHakCipta ?? 'Universitas Pohuwato'}
      tautanBawah={tautanDaftar(k.tautan_bawah, ctx)}
      keAtas={k.ke_atas ?? !ringkas}
      renderLink={renderLink}
    />
  );
}

function Widget({ w, situs, ctx, penyedia, pratinjau }: { w: WidgetSidebar; situs: DokumenSitus; ctx: Parameters<typeof tujuanSitus>[1]; penyedia?: PenyediaLanding; pratinjau?: boolean }) {
  const judul = w.judul ? <h2 className="us-widget-judul">{w.judul}</h2> : null;
  switch (w.jenis) {
    case 'kabar': {
      const P = penyedia?.Kabar;
      const isi = { jenis: w.sumber ?? 'berita', jumlah: w.jumlah ?? 4, situs: w.situs, tampilan: 'daftar' };
      if (!P && !pratinjau) return null;
      return (
        <section className="us-widget" data-jenis="kabar">
          {judul}
          {P ? <P isi={isi} pratinjau={pratinjau} /> : <p className="us-widget-penanda">Berita terbaru dari portal Humas tampil di sini.</p>}
        </section>
      );
    }
    case 'tautan': {
      const l = tautanDaftar(w.tautan, ctx);
      if (!l.length) return null;
      return (
        <nav className="us-widget" data-jenis="tautan" aria-label={w.judul || 'Tautan'}>
          {judul}
          <ul>
            {l.map((x) => (
              <li key={x.key}>
                <a href={x.href} onClick={x.onClick} {...(x.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                  {x.label}
                  <ArrowRight aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      );
    }
    case 'teks':
      return w.teks ? (
        <section className="us-widget" data-jenis="teks">
          {judul}
          <TeksRingan teks={w.teks} className="us-widget-teks" />
        </section>
      ) : null;
    case 'ajakan':
      return (
        <section className="us-widget" data-jenis="ajakan">
          {judul}
          {w.teks && <TeksRingan teks={w.teks} className="us-widget-teks" />}
          <DeretTombolSitus tombol={w.tombol} ctx={ctx} ukuran="md" />
        </section>
      );
    case 'kontak': {
      const k = situs.kaki;
      const baris = [
        k.alamat && <span key="a">{k.alamat}</span>,
        k.telepon && (
          <a key="t" href={`tel:${k.telepon.replace(/[^\d+]/g, '')}`}>
            {k.telepon}
          </a>
        ),
        k.whatsapp && (
          <a key="w" href={tautanWhatsapp(k.whatsapp)} target="_blank" rel="noopener noreferrer">
            WhatsApp {k.whatsapp}
          </a>
        ),
        k.surel && (
          <a key="s" href={`mailto:${k.surel}`}>
            {k.surel}
          </a>
        ),
        k.jam && <span key="j">{k.jam}</span>,
      ].filter(Boolean);
      if (!baris.length) return pratinjau ? <p className="us-widget-penanda">Isi kontak di bagian Kaki situs.</p> : null;
      return (
        <section className="us-widget" data-jenis="kontak">
          {judul}
          <ul>
            {baris.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      );
    }
    case 'cari':
      return (
        <section className="us-widget" data-jenis="cari">
          {judul}
          <KotakCariSitus url={situs.kepala.cari_url || '/cari'} contoh={situs.kepala.cari_contoh || undefined} />
        </section>
      );
    default:
      return null;
  }
}

/** Sidebar halaman dalam dari pengaturan situs. */
export function SidebarSitus({ situs, berkas, aksi, penyedia, pratinjau, className }: Pick<KerangkaSitusProps, 'berkas' | 'aksi' | 'penyedia' | 'pratinjau' | 'className'> & { situs: DokumenSitus }) {
  const sb = situs.sidebar;
  if (!sb.aktif || !sb.widget?.length) return null;
  const ctx = { aksi, berkas };
  return (
    <aside className={cn('us-sidebar', className)} data-lengket={dataFlag(sb.lengket)} aria-label="Informasi samping">
      {sb.widget.map((w) => (
        <Widget key={w.id} w={w} situs={situs} ctx={ctx} penyedia={penyedia} pratinjau={pratinjau} />
      ))}
    </aside>
  );
}

const KELAS_BAGIAN: Array<[string, KunciBagianSitus]> = [
  ['[data-bagian="pita"]', 'pita'],
  ['.u-navbar-topbar', 'atas'],
  ['.u-navbar-list, .u-navbar-popup, .u-navbar-m', 'menu'],
  ['.u-navbar', 'kepala'],
  ['.us-sidebar', 'sidebar'],
  ['.us-kaki', 'kaki'],
];

/**
 * Kerangka situs lengkap: kepala (pita, bilah atas, navbar), isi (`children`), sidebar (bila `sidebar`), dan kaki.
 *
 *   <KerangkaSitus situs={dok} merek={<Logo />} aksi={{ masuk: { label: 'Masuk', href: '/bff/masuk' } }}>
 *     <HalamanLanding dokumen={landing} />
 *   </KerangkaSitus>
 */
export function KerangkaSitus({ situs, sidebar, atasGelap, pratinjau, terpilih, onPilih, className, children, ...rest }: KerangkaSitusProps) {
  const dok = React.useMemo(() => (situs ? normalisasiSitus(situs) : null), [situs]);
  const akar = React.useRef<HTMLDivElement>(null);
  const transparan = !!dok?.kepala.transparan && !!atasGelap;
  // Tinggi navbar sebagai --us-kepala-h: jarak gulir jangkar, sidebar lengket, dan hero di bawah navbar tembus.
  React.useLayoutEffect(() => {
    const el = akar.current;
    const nav = el?.querySelector<HTMLElement>('.u-navbar');
    if (!el || !nav || typeof ResizeObserver === 'undefined') return;
    const atur = () => el.style.setProperty('--us-kepala-h', `${nav.offsetHeight}px`);
    atur();
    const ro = new ResizeObserver(atur);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [dok]);
  if (!dok) return <>{children}</>;
  const adaSidebar = !!sidebar && !!dok.sidebar.aktif && !!dok.sidebar.widget?.length;
  const pilih = pratinjau
    ? (e: React.MouseEvent) => {
        const t = e.target as Element;
        const a = t.closest('a, button[type="submit"], form');
        if (a && (a.tagName === 'A' || a.tagName === 'FORM' || (a as HTMLButtonElement).type === 'submit')) e.preventDefault();
        const kunci = KELAS_BAGIAN.find(([sel]) => t.closest(sel))?.[1];
        if (kunci && onPilih) onPilih(kunci);
      }
    : undefined;
  return (
    <div
      ref={akar}
      className={cn('us-situs', className)}
      data-pratinjau={dataFlag(pratinjau)}
      data-transparan={dataFlag(transparan)}
      data-terpilih={terpilih ?? undefined}
      onClickCapture={pilih}
      onSubmitCapture={pratinjau ? (e) => e.preventDefault() : undefined}
    >
      <a className="us-lewati" href="#isi-utama">
        Lewati ke isi
      </a>
      <KepalaSitus situs={dok} pratinjau={pratinjau} transparan={transparan} {...rest} />
      <div className="us-badan" data-sidebar={adaSidebar ? (dok.sidebar.posisi ?? 'kanan') : undefined}>
        <main id="isi-utama" className="us-isi" tabIndex={-1}>
          {children}
        </main>
        {adaSidebar && <SidebarSitus situs={dok} berkas={rest.berkas} aksi={rest.aksi} penyedia={rest.penyedia} pratinjau={pratinjau} />}
      </div>
      <KakiSitus situs={dok} berkas={rest.berkas} merek={rest.merek} namaHakCipta={rest.namaHakCipta} aksi={rest.aksi} renderLink={rest.renderLink} />
    </div>
  );
}
