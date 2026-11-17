'use client';
import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { ChevronDown, ChevronsUpDown, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, Kbd } from './actions';
import { Avatar } from './display';
import { Dialog, Menu, Tooltip, type MenuEntry } from './overlays';

// ================================================================ Sidebar dasbor aplikasi
export interface NavItem {
  /** Kunci unik; dicocokkan dengan `activeKey`. */
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Angka/teks kecil di kanan (mis. jumlah KRS menunggu). */
  badge?: React.ReactNode;
  /** Sub-menu (satu tingkat). */
  children?: NavItem[];
  disabled?: boolean;
}
export interface NavGroup {
  label?: React.ReactNode;
  items: NavItem[];
}

export interface SidebarUser {
  name: string;
  /** Baris kedua: NIM/NIDN/peran. */
  subtitle?: string;
  avatar?: string | null;
  menu?: MenuEntry[];
}

export interface SidebarProps {
  /** Logo + nama aplikasi (gunakan <AppLogo />). */
  brand: React.ReactNode;
  groups: NavGroup[];
  activeKey?: string;
  /** Konten tepat di bawah brand, mis. pemilih prodi/periode atau pencarian. */
  header?: React.ReactNode;
  /** Konten di atas profil, mis. kartu "Periode KRS dibuka". */
  footer?: React.ReactNode;
  user?: SidebarUser;
  /** Mode ikon saja (rail). */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Renderer tautan kustom, mis. <Link> Next.js/React Router. */
  renderLink?: (item: NavItem, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactElement;
  /**
   * Hanya satu sub-menu terbuka dalam satu waktu: membuka satu menutup yang lain. Bawaan `true`.
   * Isi `false` agar setiap sub-menu bisa dibuka bersamaan.
   */
  accordion?: boolean;
  className?: string;
}

function containsActive(item: NavItem, key?: string): boolean {
  return item.key === key || Boolean(item.children?.some((c) => containsActive(c, key)));
}

function NavLink({ item, active, collapsed, renderLink, depth }: { item: NavItem; active: boolean; collapsed?: boolean; renderLink?: SidebarProps['renderLink']; depth: number }) {
  const content = (
    <>
      {depth === 0 && <span className="u-nav-icon">{item.icon}</span>}
      <span className="u-nav-label">{item.label}</span>
      {item.badge != null && <span className="u-nav-badge">{item.badge}</span>}
    </>
  );
  const props = {
    className: 'u-nav-item',
    'data-active': dataFlag(active),
    'data-depth': depth,
    'aria-current': active ? ('page' as const) : undefined,
    'aria-disabled': item.disabled || undefined,
    onClick: item.onClick,
  };
  let el: React.ReactElement;
  if (item.href) el = renderLink ? renderLink(item, { ...props, href: item.href, children: content }) : <a {...props} href={item.href}>{content}</a>;
  else el = <button type="button" {...props}>{content}</button>;
  return collapsed && depth === 0 ? (
    <Tooltip content={item.label} side="right">
      {el}
    </Tooltip>
  ) : (
    el
  );
}

function NavTree({
  item,
  activeKey,
  collapsed,
  renderLink,
  open: openProp,
  onOpenChange,
}: {
  item: NavItem;
  activeKey?: string;
  collapsed?: boolean;
  renderLink?: SidebarProps['renderLink'];
  /** Dikendalikan Sidebar saat mode accordion. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openInner, setOpenInner] = React.useState(() => containsActive(item, activeKey));
  const open = openProp ?? openInner;
  const setOpen = (o: boolean) => (onOpenChange ? onOpenChange(o) : setOpenInner(o));
  if (!item.children?.length) return <NavLink item={item} active={item.key === activeKey} collapsed={collapsed} renderLink={renderLink} depth={0} />;
  const childActive = containsActive(item, activeKey);
  if (collapsed) {
    // Saat rail, sub-menu dibuka sebagai menu melayang.
    return (
      <Menu
        side="right"
        align="start"
        trigger={
          <button type="button" className="u-nav-item" data-active={dataFlag(childActive)} aria-label={typeof item.label === 'string' ? item.label : undefined}>
            <span className="u-nav-icon">{item.icon}</span>
          </button>
        }
        items={[{ type: 'label', label: item.label }, ...item.children.map((c) => ({ label: c.label, href: c.href, onSelect: c.onClick }))]}
      />
    );
  }
  return (
    <BaseCollapsible.Root open={open} onOpenChange={setOpen}>
      <BaseCollapsible.Trigger className="u-nav-item" data-parent-active={dataFlag(childActive)}>
        <span className="u-nav-icon">{item.icon}</span>
        <span className="u-nav-label">{item.label}</span>
        <ChevronDown className="u-nav-chevron" />
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel className="u-collapsible-panel">
        <div className="u-nav-sub">
          {item.children.map((c) => (
            <NavLink key={c.key} item={c} active={c.key === activeKey} renderLink={renderLink} depth={1} />
          ))}
        </div>
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}

/** Sidebar aplikasi dasbor (SIAKAD, Pustikom, LMS, fakultas): grup menu, sub-menu, lencana, profil, mode rail. */
export function Sidebar({ brand, groups, activeKey, header, footer, user, collapsed, onCollapsedChange, renderLink, accordion = true, className }: SidebarProps) {
  // Mode accordion: simpan satu kunci sub-menu yang terbuka. Awalnya sub-menu yang memuat halaman aktif,
  // dan ikut berpindah saat halaman aktif pindah ke sub-menu lain.
  const induk = (key?: string) => groups.flatMap((g) => g.items).find((it) => it.children?.length && containsActive(it, key))?.key ?? null;
  // `indukAktif` ikut dihitung ulang saat `groups` berubah, karena menu sering baru lengkap setelah peran pengguna dimuat
  // (sub menu halaman aktif harus tetap terbuka walau grupnya muncul belakangan).
  const indukAktif = induk(activeKey);
  const [openKey, setOpenKey] = React.useState<string | null>(indukAktif);
  React.useEffect(() => {
    if (indukAktif) setOpenKey(indukAktif);
  }, [activeKey, indukAktif]);
  return (
    <aside className={cn('u-sidebar', className)} data-collapsed={dataFlag(collapsed)}>
      <div className="u-sidebar-brand">
        {brand}
        {onCollapsedChange && (
          <Tooltip content={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'} side="right">
            <Button variant="ghost" size="xs" iconOnly className="u-sidebar-toggle" aria-label={collapsed ? 'Lebarkan menu' : 'Ciutkan menu'} onClick={() => onCollapsedChange(!collapsed)}>
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
          </Tooltip>
        )}
      </div>
      {header && !collapsed && <div className="u-sidebar-header">{header}</div>}
      <nav className="u-sidebar-nav" aria-label="Menu utama">
        {groups.map((g, gi) => (
          <div key={gi} className="u-nav-group">
            {g.label && !collapsed && <div className="u-nav-group-label">{g.label}</div>}
            {g.items.map((it) => (
              <NavTree
                key={it.key}
                item={it}
                activeKey={activeKey}
                collapsed={collapsed}
                renderLink={renderLink}
                {...(accordion && it.children?.length ? { open: openKey === it.key, onOpenChange: (o: boolean) => setOpenKey(o ? it.key : openKey === it.key ? null : openKey) } : {})}
              />
            ))}
          </div>
        ))}
      </nav>
      {footer && !collapsed && <div className="u-sidebar-footer">{footer}</div>}
      {user && (
        <div className="u-sidebar-user">
          <Menu
            side={collapsed ? 'right' : 'top'}
            align="start"
            trigger={
              <button type="button" className="u-sidebar-user-button">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                {!collapsed && (
                  <>
                    <span className="u-sidebar-user-text">
                      <span>{user.name}</span>
                      {user.subtitle && <span>{user.subtitle}</span>}
                    </span>
                    <ChevronsUpDown className="u-nav-chevron" />
                  </>
                )}
              </button>
            }
            items={user.menu ?? []}
          />
        </div>
      )}
    </aside>
  );
}

// ================================================================ App shell
export interface AppShellProps {
  sidebar: React.ReactElement<SidebarProps>;
  /** Isi bilah atas (breadcrumb, pencarian, notifikasi). */
  topbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
/** Kerangka halaman dasbor: sidebar tetap di desktop, laci (sheet) di ponsel. */
export function AppShell({ sidebar, topbar, children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className={cn('u-app-shell', className)} data-collapsed={dataFlag(sidebar.props.collapsed)}>
      <div className="u-app-shell-sidebar">{sidebar}</div>
      <div className="u-app-shell-main">
        <header className="u-topbar">
          <Button variant="ghost" size="sm" iconOnly className="u-topbar-menu" aria-label="Buka menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </Button>
          {topbar}
        </header>
        <main className="u-app-shell-content">{children}</main>
      </div>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen} side="left" title={<span className="u-sr-only">Menu</span>} className="u-app-shell-drawer">
        {React.cloneElement(sidebar, { collapsed: false, onCollapsedChange: undefined })}
      </Dialog>
    </div>
  );
}

/** Tombol pencarian ala command palette di bilah atas. */
export function SearchTrigger({ placeholder = 'Cari menu, mahasiswa, dosen…', shortcut = '⌘K', onClick, className }: { placeholder?: string; shortcut?: string; onClick?: () => void; className?: string }) {
  return (
    <button type="button" className={cn('u-search-trigger', className)} onClick={onClick}>
      <Search />
      <span>{placeholder}</span>
      {shortcut && <Kbd>{shortcut}</Kbd>}
    </button>
  );
}

// ================================================================ Sidebar dokumentasi
export interface DocsNavSection {
  title: React.ReactNode;
  items: Array<{ key: string; label: React.ReactNode; href?: string; onClick?: () => void; badge?: React.ReactNode }>;
}
export interface DocsSidebarProps {
  sections: DocsNavSection[];
  activeKey?: string;
  /** Pencarian di dalam daftar (penyaringan klien). */
  searchable?: boolean;
  header?: React.ReactNode;
  className?: string;
  renderLink?: SidebarProps['renderLink'];
}
/** Sidebar halaman dokumentasi (API, panduan, pustaka komponen): seksi bertajuk, penanda aktif, saringan. */
export function DocsSidebar({ sections, activeKey, searchable = true, header, className, renderLink }: DocsSidebarProps) {
  const [q, setQ] = React.useState('');
  const norm = q.trim().toLowerCase();
  const filtered = sections
    .map((s) => ({ ...s, items: norm ? s.items.filter((i) => String(i.label).toLowerCase().includes(norm)) : s.items }))
    .filter((s) => s.items.length);
  return (
    <aside className={cn('u-docs-sidebar', className)}>
      {header}
      {searchable && (
        <div className="u-input-group" data-size="sm">
          <span className="u-input-addon" data-align="start">
            <Search />
          </span>
          <input placeholder="Saring…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Saring menu dokumentasi" />
        </div>
      )}
      <nav className="u-docs-nav" aria-label="Dokumentasi">
        {filtered.map((s, i) => (
          <div key={i} className="u-docs-section">
            <div className="u-docs-section-title">{s.title}</div>
            <ul>
              {s.items.map((it) => {
                const active = it.key === activeKey;
                const props = { className: 'u-docs-link', 'data-active': dataFlag(active), 'aria-current': active ? ('page' as const) : undefined, onClick: it.onClick };
                const inner = (
                  <>
                    {it.label}
                    {it.badge && <span className="u-docs-badge">{it.badge}</span>}
                  </>
                );
                return (
                  <li key={it.key}>
                    {it.href ? (
                      renderLink ? (
                        renderLink(it as NavItem, { ...props, href: it.href, children: inner })
                      ) : (
                        <a {...props} href={it.href}>
                          {inner}
                        </a>
                      )
                    ) : (
                      <button type="button" {...props}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!filtered.length && <p className="u-field-description" style={{ padding: '0.5rem' }}>Tidak ada yang cocok dengan “{q}”.</p>}
      </nav>
    </aside>
  );
}

/** Daftar isi "Di halaman ini" dengan penanda bagian yang sedang dibaca (scroll-spy). */
export function TableOfContents({ items, title = 'Di halaman ini', className }: { items: Array<{ id: string; label: React.ReactNode; level?: 2 | 3 }>; title?: string; className?: string }) {
  const [active, setActive] = React.useState<string | undefined>(items[0]?.id);
  React.useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav className={cn('u-toc', className)} aria-label={title}>
      <div className="u-docs-section-title">{title}</div>
      <ul>
        {items.map((i) => (
          <li key={i.id} data-level={i.level ?? 2}>
            <a href={`#${i.id}`} data-active={dataFlag(active === i.id)} onClick={(e) => (e.preventDefault(), document.getElementById(i.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), setActive(i.id))}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ================================================================ Sidebar portal/media
export interface SidebarWidgetProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  title: React.ReactNode;
  /** Tautan "Lihat semua" di kanan judul. */
  action?: React.ReactNode;
  variant?: 'plain' | 'card';
}
/** Satu blok di kolom samping portal (Terpopuler, Agenda, Pengumuman, Kategori, ...). */
export function SidebarWidget({ title, action, variant = 'plain', className, children, ...props }: SidebarWidgetProps) {
  return (
    <section className={cn('u-side-widget', className)} data-variant={variant} {...props}>
      <header className="u-side-widget-header">
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
/** Kolom samping portal berita/media: tumpukan SidebarWidget, lengket saat digulir. */
export function PortalSidebar({ sticky = true, className, children }: { sticky?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <aside className={cn('u-portal-sidebar', className)} data-sticky={dataFlag(sticky)}>
      {children}
    </aside>
  );
}
