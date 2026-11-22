'use client';
import * as React from 'react';
import { NavigationMenu } from '@base-ui/react/navigation-menu';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { ArrowRight, ChevronDown, Menu as MenuIcon } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button } from './actions';
import { Avatar } from './display';
import { Dialog, Menu } from './overlays';
import type { SidebarUser } from './layout';
import { useWadahPortal } from '../lib/wadah-portal';

// ================================================================ Tipe
export interface NavbarLink {
  key?: string;
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** Satu baris penjelasan di bawah label (dropdown dan mega menu). */
  description?: React.ReactNode;
  badge?: React.ReactNode;
  /** Buka di tab baru. */
  external?: boolean;
}

export interface NavbarColumn {
  title?: React.ReactNode;
  items: NavbarLink[];
}

export interface NavbarFeatured {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  href: string;
  /** Gambar sampul; tanpa gambar dipakai latar warna primer. */
  image?: string;
  cta?: React.ReactNode;
}

export interface NavbarMenu {
  /** Kunci unik; dicocokkan dengan `activeKey`. */
  key: string;
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Dropdown satu kolom. */
  items?: NavbarLink[];
  /** Mega menu: beberapa kolom berjudul. */
  columns?: NavbarColumn[];
  /** Kartu sorotan di kanan mega menu (berita, pendaftaran dibuka, dll.). */
  featured?: NavbarFeatured;
  /** Baris bawah panel, mis. tautan "Semua program studi". */
  footer?: React.ReactNode;
  external?: boolean;
}

export interface NavbarProps {
  /** Logo + nama aplikasi (<AppLogo />, <UnipoAppLogo />, atau <LogoSitus /> dari unipo-ui/siakad). */
  brand: React.ReactNode;
  /** Tujuan klik logo (bawaan "/"). */
  brandHref?: string;
  menus: NavbarMenu[];
  activeKey?: string;
  /** Tombol di kanan, mis. "Masuk" dan "Daftar". */
  actions?: React.ReactNode;
  /** Profil + menu pengguna di kanan (aplikasi yang sudah masuk). */
  user?: SidebarUser;
  /** Slot di antara menu dan aksi, mis. <SearchTrigger />. */
  search?: React.ReactNode;
  /** Pita tipis di atas navbar: kontak, bahasa, tautan cepat. */
  topbar?: React.ReactNode;
  /**
   * app (bawaan): latar solid, garis bawah, cocok untuk aplikasi.
   * portal: lebih tinggi; dengan `transparent` tembus pandang di atas hero lalu solid saat digulir.
   * ringkas: tinggi 48px, teks kecil.
   */
  variant?: 'app' | 'portal' | 'ringkas';
  /** Tembus pandang sampai halaman digulir (untuk hero bergambar). */
  transparent?: boolean;
  /** Menempel di atas saat digulir (bawaan true). */
  sticky?: boolean;
  /** Letak menu: tengah atau setelah logo (bawaan). */
  align?: 'start' | 'center';
  /** Lebar maksimum isi (bawaan 80rem). */
  maxWidth?: string;
  /** Kunci menu yang terbuka di awal (untuk pratinjau atau tur). */
  defaultOpen?: string;
  /** Lebar navbar (px) saat berubah ke tombol menu ponsel (bawaan 960). */
  mobileBreakpoint?: number;
  /** Renderer tautan kustom, mis. <Link> Next.js/React Router. */
  renderLink?: (link: { href: string; external?: boolean }, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactElement;
  className?: string;
}

// ================================================================ Utilitas
/** Halaman sudah digulir. Memakai jendela milik navbar (bisa iframe pratinjau penyunting), bukan selalu window induk. */
function useScrolled(on: boolean, ref: React.RefObject<HTMLElement | null>, threshold = 8) {
  const [s, setS] = React.useState(false);
  React.useEffect(() => {
    if (!on) return;
    const w = ref.current?.ownerDocument.defaultView ?? window;
    const f = () => setS(w.scrollY > threshold);
    f();
    w.addEventListener('scroll', f, { passive: true });
    return () => w.removeEventListener('scroll', f);
  }, [on, ref, threshold]);
  return s;
}

/** Lebar cukup bila header >= breakpoint dan menu tidak berdesakan (lebar yang dibutuhkan diingat saat masih lebar). */
function useWide(ref: React.RefObject<HTMLElement | null>, px: number, versi: string) {
  const [m, setM] = React.useState(true);
  const butuh = React.useRef(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = () => {
      const bar = el.querySelector<HTMLElement>('.u-navbar-bar');
      const list = bar?.querySelector<HTMLElement>('.u-navbar-list');
      const w = el.getBoundingClientRect().width;
      if (bar && list) {
        // Lebar total yang dibutuhkan agar semua menu muat; disimpan untuk dipakai saat sudah mode ponsel.
        const cs = getComputedStyle(bar);
        const brand = bar.querySelector<HTMLElement>('.u-navbar-brand')?.offsetWidth ?? 0;
        const end = bar.querySelector<HTMLElement>('.u-navbar-end')?.scrollWidth ?? 0;
        butuh.current = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + brand + list.scrollWidth + end + 2 * (parseFloat(cs.columnGap) || 24) + 8;
      }
      setM(w >= px && w >= butuh.current);
    };
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, px, versi]);
  return m;
}

type RenderLink = NavbarProps['renderLink'];
function Anchor({
  href,
  external,
  renderLink,
  ...props
}: { href: string; external?: boolean; renderLink?: RenderLink } & React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) {
  const p = { ...props, href, ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) };
  return renderLink ? renderLink({ href, external }, p) : <a {...p} />;
}

const hasPanel = (m: NavbarMenu) => Boolean(m.items?.length || m.columns?.length);
const columnsOf = (m: NavbarMenu): NavbarColumn[] => m.columns ?? (m.items ? [{ items: m.items }] : []);

function LinkBody({ link }: { link: NavbarLink }) {
  return (
    <>
      {link.icon && <span className="u-navbar-link-icon">{link.icon}</span>}
      <span className="u-navbar-link-text">
        <span className="u-navbar-link-label">
          {link.label}
          {link.badge != null && <span className="u-navbar-link-badge">{link.badge}</span>}
        </span>
        {link.description && <span className="u-navbar-link-desc">{link.description}</span>}
      </span>
    </>
  );
}

function PanelLink({ link, renderLink }: { link: NavbarLink; renderLink?: RenderLink }) {
  if (!link.href)
    return (
      <button type="button" className="u-navbar-link" onClick={link.onClick}>
        <LinkBody link={link} />
      </button>
    );
  return (
    <NavigationMenu.Link
      className="u-navbar-link"
      render={(props) => (
        <Anchor {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)} href={link.href!} external={link.external} renderLink={renderLink} onClick={link.onClick}>
          <LinkBody link={link} />
        </Anchor>
      )}
    />
  );
}

function Featured({ f, renderLink }: { f: NavbarFeatured; renderLink?: RenderLink }) {
  return (
    <Anchor href={f.href} renderLink={renderLink} className="u-navbar-featured" data-image={dataFlag(Boolean(f.image))}>
      {f.image && <img src={f.image} alt="" loading="lazy" />}
      <span className="u-navbar-featured-body">
        {f.eyebrow && <span className="u-navbar-featured-eyebrow">{f.eyebrow}</span>}
        <b>{f.title}</b>
        {f.description && <span className="u-navbar-featured-desc">{f.description}</span>}
        <span className="u-navbar-featured-cta">
          {f.cta ?? 'Selengkapnya'} <ArrowRight aria-hidden />
        </span>
      </span>
    </Anchor>
  );
}

function Panel({ menu, renderLink }: { menu: NavbarMenu; renderLink?: RenderLink }) {
  const cols = columnsOf(menu);
  const mega = Boolean(menu.columns?.length) || Boolean(menu.featured);
  return (
    <div className="u-navbar-panel" data-mega={dataFlag(mega)} style={mega ? ({ '--u-navbar-cols': cols.length } as React.CSSProperties) : undefined}>
      <div className="u-navbar-panel-main">
        <div className="u-navbar-cols">
          {cols.map((c, i) => (
            <div key={i} className="u-navbar-col">
              {c.title && <p className="u-navbar-col-title">{c.title}</p>}
              <ul>
                {c.items.map((l, j) => (
                  <li key={l.key ?? j}>
                    <PanelLink link={l} renderLink={renderLink} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {menu.featured && <Featured f={menu.featured} renderLink={renderLink} />}
      </div>
      {menu.footer && <div className="u-navbar-panel-footer">{menu.footer}</div>}
    </div>
  );
}

function UserMenu({ user }: { user: SidebarUser }) {
  return (
    <Menu
      align="end"
      trigger={
        <button type="button" className="u-navbar-user" aria-label={`Menu ${user.name}`}>
          <Avatar name={user.name} src={user.avatar} size="sm" />
          <span className="u-navbar-user-text">
            <b>{user.name}</b>
            {user.subtitle && <small>{user.subtitle}</small>}
          </span>
          <ChevronDown aria-hidden />
        </button>
      }
      items={user.menu ?? []}
    />
  );
}

// ================================================================ Navbar ponsel
function MobileNav({
  brand,
  menus,
  activeKey,
  actions,
  user,
  renderLink,
  open,
  onOpenChange,
}: Pick<NavbarProps, 'brand' | 'menus' | 'activeKey' | 'actions' | 'user' | 'renderLink'> & { open: boolean; onOpenChange: (o: boolean) => void }) {
  const close = () => onOpenChange(false);
  const item = (l: NavbarLink | NavbarMenu, depth: number, k: React.Key) => {
    const active = activeKey != null && 'key' in l && l.key === activeKey;
    const cls = 'u-navbar-m-link';
    const body = (
      <>
        {'icon' in l && l.icon && <span className="u-navbar-link-icon">{l.icon}</span>}
        <span className="u-navbar-link-label">{l.label}</span>
      </>
    );
    return l.href ? (
      <Anchor
        key={k}
        href={l.href}
        external={l.external}
        renderLink={renderLink}
        className={cls}
        data-depth={depth}
        data-active={dataFlag(active)}
        aria-current={active ? 'page' : undefined}
        onClick={() => (l.onClick?.(), close())}
      >
        {body}
      </Anchor>
    ) : (
      <button key={k} type="button" className={cls} data-depth={depth} onClick={() => (l.onClick?.(), close())}>
        {body}
      </button>
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} side="right" title={brand} className="u-navbar-sheet">
      <nav className="u-navbar-m" aria-label="Menu utama">
        {menus.map((m) =>
          hasPanel(m) ? (
            <BaseCollapsible.Root key={m.key} defaultOpen={activeKey != null && (m.key === activeKey || columnsOf(m).some((c) => c.items.some((l) => l.key === activeKey)))}>
              <BaseCollapsible.Trigger className="u-navbar-m-link" data-depth={0}>
                <span className="u-navbar-link-label">{m.label}</span>
                <ChevronDown className="u-navbar-m-chevron" aria-hidden />
              </BaseCollapsible.Trigger>
              <BaseCollapsible.Panel className="u-collapsible-panel">
                <div className="u-navbar-m-sub">
                  {columnsOf(m).map((c, i) => (
                    <div key={i}>
                      {c.title && <p className="u-navbar-col-title">{c.title}</p>}
                      {c.items.map((l, j) => item(l, 1, l.key ?? j))}
                    </div>
                  ))}
                  {m.featured && item({ label: m.featured.title, href: m.featured.href }, 1, 'featured')}
                </div>
              </BaseCollapsible.Panel>
            </BaseCollapsible.Root>
          ) : (
            item(m, 0, m.key)
          ),
        )}
      </nav>
      {(actions || user) && (
        <div className="u-navbar-m-foot">
          {user && (
            <div className="u-navbar-m-user">
              <Avatar name={user.name} src={user.avatar} size="md" />
              <span className="u-navbar-user-text">
                <b>{user.name}</b>
                {user.subtitle && <small>{user.subtitle}</small>}
              </span>
            </div>
          )}
          {actions && <div className="u-navbar-m-actions">{actions}</div>}
        </div>
      )}
    </Dialog>
  );
}

// ================================================================ Navbar
/**
 * Navbar responsif untuk aplikasi dan portal: tautan, dropdown, mega menu (kolom + kartu sorotan),
 * slot pencarian, tombol aksi, menu pengguna, dan panel samping di ponsel.
 */
export function Navbar({
  brand,
  brandHref = '/',
  menus,
  activeKey,
  actions,
  user,
  search,
  topbar,
  variant = 'app',
  transparent,
  sticky = true,
  align = 'start',
  maxWidth,
  mobileBreakpoint = 960,
  defaultOpen,
  renderLink,
  className,
}: NavbarProps) {
  const ref = React.useRef<HTMLElement>(null);
  const scrolled = useScrolled(sticky, ref);
  const wadah = useWadahPortal();
  const wide = useWide(ref, mobileBreakpoint, menus.map((m) => m.key).join('|'));
  const [open, setOpen] = React.useState(false);
  const childActive = (m: NavbarMenu) => activeKey != null && (m.key === activeKey || columnsOf(m).some((c) => c.items.some((l) => l.key === activeKey)));
  return (
    <header
      ref={ref}
      className={cn('u-navbar', className)}
      data-variant={variant}
      data-sticky={dataFlag(sticky)}
      data-transparent={dataFlag(Boolean(transparent) && !scrolled && !open)}
      data-scrolled={dataFlag(scrolled)}
      style={maxWidth ? ({ '--u-navbar-max': maxWidth } as React.CSSProperties) : undefined}
    >
      {topbar && wide && (
        <div className="u-navbar-topbar">
          <div className="u-navbar-inner">{topbar}</div>
        </div>
      )}
      <div className="u-navbar-inner u-navbar-bar" data-align={align}>
        <Anchor href={brandHref} renderLink={renderLink} className="u-navbar-brand">
          {brand}
        </Anchor>
        {wide ? (
          <NavigationMenu.Root className="u-navbar-nav" aria-label="Menu utama" defaultValue={defaultOpen}>
            <NavigationMenu.List className="u-navbar-list">
              {menus.map((m) => (
                <NavigationMenu.Item key={m.key} value={m.key}>
                  {hasPanel(m) ? (
                    <>
                      <NavigationMenu.Trigger className="u-navbar-item" data-active={dataFlag(childActive(m))}>
                        {m.label}
                        <NavigationMenu.Icon className="u-navbar-chevron">
                          <ChevronDown />
                        </NavigationMenu.Icon>
                      </NavigationMenu.Trigger>
                      <NavigationMenu.Content className="u-navbar-content">
                        <Panel menu={m} renderLink={renderLink} />
                      </NavigationMenu.Content>
                    </>
                  ) : m.href ? (
                    <NavigationMenu.Link
                      className="u-navbar-item"
                      active={m.key === activeKey}
                      render={(props) => (
                        <Anchor
                          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                          href={m.href!}
                          external={m.external}
                          renderLink={renderLink}
                          data-active={dataFlag(m.key === activeKey)}
                          aria-current={m.key === activeKey ? 'page' : undefined}
                        >
                          {m.label}
                        </Anchor>
                      )}
                    />
                  ) : (
                    <button type="button" className="u-navbar-item" onClick={m.onClick}>
                      {m.label}
                    </button>
                  )}
                </NavigationMenu.Item>
              ))}
            </NavigationMenu.List>
            <NavigationMenu.Portal container={wadah}>
              <NavigationMenu.Positioner className="u-navbar-positioner" sideOffset={8} collisionPadding={16} collisionAvoidance={{ side: 'none' }}>
                <NavigationMenu.Popup className="u-navbar-popup">
                  <NavigationMenu.Viewport className="u-navbar-viewport" />
                </NavigationMenu.Popup>
              </NavigationMenu.Positioner>
            </NavigationMenu.Portal>
          </NavigationMenu.Root>
        ) : (
          <span className="u-navbar-spacer" />
        )}
        <div className="u-navbar-end">
          {search}
          {wide && actions}
          {user && <UserMenu user={user} />}
          {!wide && (
            <Button variant="ghost" size="sm" iconOnly aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <MenuIcon />
            </Button>
          )}
        </div>
      </div>
      {!wide && <MobileNav brand={brand} menus={menus} activeKey={activeKey} actions={actions} user={undefined} renderLink={renderLink} open={open} onOpenChange={setOpen} />}
    </header>
  );
}
