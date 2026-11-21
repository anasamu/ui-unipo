'use client';
import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu';
import { ChevronDown, ChevronsUpDown, ExternalLink, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Button, Kbd } from './actions';
import { Avatar } from './display';
import { Dialog, Menu, Tooltip, type MenuEntry } from './overlays';

// ================================================================ Sidebar dasbor aplikasi
export interface NavItem {
  /** Kunci unik; dicocokkan dengan `activeKey`. */
  key: string;
  label: React.ReactNode;
  /** Teks label untuk pencarian fitur dan judul halaman bila `label` bukan teks biasa (mis. berikon). */
  labelTeks?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  /** Angka/teks kecil di kanan (mis. jumlah KRS menunggu). */
  badge?: React.ReactNode;
  /** Sub-menu (satu tingkat). */
  children?: NavItem[];
  disabled?: boolean;
  /** Keterangan satu baris: tooltip item (juga di mode ikon) dan baris kecil di Cari fitur. */
  keterangan?: string;
  /** Sinonim untuk Cari fitur. */
  kataKunci?: string[];
  /** Tautan ke aplikasi lain: dibuka di tab baru, diberi ikon tautan keluar. */
  luar?: boolean;
  /** Lencana "Baru" di kanan label. */
  baru?: boolean;
}
export interface NavGroup {
  label?: React.ReactNode;
  items: NavItem[];
  /** Kunci stabil kategori untuk mengingat lipatan (bawaan label teks). */
  kunci?: string;
  /** Judul kategori bisa dilipat (menimpa `lipatKategori` Sidebar untuk grup ini). */
  lipat?: boolean;
  /** Terlipat saat pertama dibuka (bila bisa dilipat). */
  terlipat?: boolean;
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
  /**
   * Kunci localStorage untuk mengingat sub menu yang terbuka (mis. "unipo.sidebar.bauk"). Kosong = tidak diingat.
   */
  ingat?: string;
  /** Kaki sidebar yang selalu tampil di bawah (juga saat mode ikon), tidak ikut gulir: status, versi, hak cipta. */
  footerTetap?: React.ReactNode;
  /**
   * Kontrol kecil di ujung kanan item menu (mis. bintang sematkan pintasan): tampil saat kursor/fokus di item, atau
   * selalu bila elemennya ber-`data-tetap`. Tidak tampil saat mode ikon.
   */
  aksiItem?: (item: NavItem) => React.ReactNode;
  /** Isi menu konteks item (klik kanan, Shift+F10, tekan lama). Kosong = menu bawaan peramban. Tidak saat mode ikon. */
  menuItem?: (item: NavItem) => MenuEntry[] | undefined;
  /**
   * Judul kategori bisa dilipat. `true` = terbuka bawaan, `'terlipat'` = terlipat bawaan. Kategori yang memuat halaman
   * aktif selalu dibuka saat halaman itu dibuka. Lencana kategori terlipat = jumlah lencana angka di dalamnya.
   */
  lipatKategori?: boolean | 'terlipat';
  /** Kunci localStorage untuk mengingat kategori yang dilipat/dibuka (mis. "unipo.sidebar.kategori.bauk"). */
  ingatKategori?: string;
  className?: string;
}

type AksiNav = Pick<SidebarProps, 'aksiItem' | 'menuItem'>;

/** Baris item + aksi kecil + menu konteks (bila ada). */
function BarisNav({ item, el, aksiItem, menuItem }: AksiNav & { item: NavItem; el: React.ReactElement }) {
  const aksi = aksiItem?.(item);
  const menu = menuItem?.(item);
  if (!aksi && !menu?.length) return el;
  const isi = (
    <>
      {el}
      {aksi && <span className="u-nav-aksi">{aksi}</span>}
    </>
  );
  if (!menu?.length)
    return (
      <div className="u-nav-baris" data-ada-aksi="">
        {isi}
      </div>
    );
  return (
    <BaseContextMenu.Root>
      <BaseContextMenu.Trigger className="u-nav-baris" data-ada-aksi={aksi ? '' : undefined}>
        {isi}
      </BaseContextMenu.Trigger>
      <BaseContextMenu.Portal>
        <BaseContextMenu.Positioner className="u-popup-positioner">
          <BaseContextMenu.Popup className="u-menu">
            {menu.map((it, i) => {
              if (it.type === 'separator') return <BaseContextMenu.Separator key={i} className="u-menu-separator" />;
              if (it.type === 'label') return <div key={i} className="u-menu-label">{it.label}</div>;
              const inner = (
                <>
                  {it.icon}
                  <span>{it.label}</span>
                  {it.shortcut && <span className="u-menu-shortcut">{it.shortcut}</span>}
                </>
              );
              return it.href ? (
                <BaseContextMenu.LinkItem key={i} href={it.href} className="u-menu-item">
                  {inner}
                </BaseContextMenu.LinkItem>
              ) : (
                <BaseContextMenu.Item key={i} className="u-menu-item" onClick={it.onSelect} disabled={it.disabled} data-variant={it.destructive ? 'destructive' : undefined}>
                  {inner}
                </BaseContextMenu.Item>
              );
            })}
          </BaseContextMenu.Popup>
        </BaseContextMenu.Positioner>
      </BaseContextMenu.Portal>
    </BaseContextMenu.Root>
  );
}

function bacaIngat(kunci?: string): string | null {
  if (!kunci) return null;
  try {
    return localStorage.getItem(kunci);
  } catch {
    return null;
  }
}
function simpanIngat(kunci: string | undefined, nilai: string | null) {
  if (!kunci) return;
  try {
    if (nilai) localStorage.setItem(kunci, nilai);
    else localStorage.removeItem(kunci);
  } catch {
    /* penyimpanan diblokir */
  }
}

function containsActive(item: NavItem, key?: string): boolean {
  return item.key === key || Boolean(item.children?.some((c) => containsActive(c, key)));
}

/** Jumlah lencana angka di item dan sub-menunya (lencana bukan angka diabaikan). */
function jumlahLencana(items: NavItem[]): number {
  let n = 0;
  for (const it of items) {
    const b = typeof it.badge === 'number' ? it.badge : typeof it.badge === 'string' && /^\d+$/.test(it.badge) ? Number(it.badge) : 0;
    n += b + (it.children ? jumlahLencana(it.children) : 0);
  }
  return n;
}

function bacaLipatan(kunci?: string): Record<string, boolean> {
  const v = bacaIngat(kunci);
  if (!v) return {};
  try {
    const o = JSON.parse(v) as unknown;
    return o && typeof o === 'object' ? (o as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** Isi tooltip item: label tebal + keterangan. */
function isiTip(item: NavItem, denganLabel: boolean): React.ReactNode {
  if (!item.keterangan) return item.label;
  return (
    <span className="u-nav-tip">
      {denganLabel && <strong>{item.label}</strong>}
      <span>{item.keterangan}</span>
    </span>
  );
}

function NavLink({ item, active, collapsed, renderLink, depth, aksiItem, menuItem }: AksiNav & { item: NavItem; active: boolean; collapsed?: boolean; renderLink?: SidebarProps['renderLink']; depth: number }) {
  const content = (
    <>
      {depth === 0 && <span className="u-nav-icon">{item.icon}</span>}
      <span className="u-nav-label">{item.label}</span>
      {item.luar && <ExternalLink className="u-nav-luar" aria-label="(tab baru)" />}
      {item.baru && <span className="u-nav-baru">Baru</span>}
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
  if (item.href && item.luar)
    el = (
      <a {...props} href={item.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  else if (item.href) el = renderLink ? renderLink(item, { ...props, href: item.href, children: content }) : <a {...props} href={item.href}>{content}</a>;
  else el = <button type="button" {...props}>{content}</button>;
  if (collapsed && depth === 0)
    return (
      <Tooltip content={isiTip(item, true)} side="right">
        {el}
      </Tooltip>
    );
  if (item.keterangan)
    el = (
      <Tooltip content={isiTip(item, false)} side="right" delay={700}>
        {el}
      </Tooltip>
    );
  return <BarisNav item={item} el={el} aksiItem={aksiItem} menuItem={menuItem} />;
}

function NavTree({
  item,
  activeKey,
  collapsed,
  renderLink,
  open: openProp,
  onOpenChange,
  aksiItem,
  menuItem,
}: AksiNav & {
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
  if (!item.children?.length) return <NavLink item={item} active={item.key === activeKey} collapsed={collapsed} renderLink={renderLink} depth={0} aksiItem={aksiItem} menuItem={menuItem} />;
  const childActive = containsActive(item, activeKey);
  // Lencana induk = jumlah lencana anak, tampil saat sub-menu tertutup (dan di mode ikon).
  const lencanaAnak = item.badge ?? (jumlahLencana(item.children) || undefined);
  if (collapsed) {
    // Saat rail, sub-menu dibuka sebagai menu melayang.
    return (
      <Menu
        side="right"
        align="start"
        openOnHover
        trigger={
          <button type="button" className="u-nav-item" data-active={dataFlag(childActive)} aria-label={typeof item.label === 'string' ? item.label : undefined}>
            <span className="u-nav-icon">{item.icon}</span>
            {lencanaAnak != null && <span className="u-nav-badge">{lencanaAnak}</span>}
          </button>
        }
        items={[
          { type: 'label', label: item.label },
          ...item.children.map((c) => ({
            label: c.badge != null ? (
              <>
                {c.label} <span className="u-nav-badge">{c.badge}</span>
              </>
            ) : (
              c.label
            ),
            // Tautan keluar dibuka di tab baru.
            href: c.luar ? undefined : c.href,
            onSelect: c.luar && c.href ? () => window.open(c.href, '_blank', 'noopener') : c.onClick,
            icon: c.key === activeKey ? <span className="u-nav-flyout-aktif" aria-hidden /> : undefined,
          })),
        ]}
      />
    );
  }
  return (
    <BaseCollapsible.Root open={open} onOpenChange={setOpen}>
      <BaseCollapsible.Trigger className="u-nav-item" data-parent-active={dataFlag(childActive)}>
        <span className="u-nav-icon">{item.icon}</span>
        <span className="u-nav-label">{item.label}</span>
        {!open && lencanaAnak != null && <span className="u-nav-badge">{lencanaAnak}</span>}
        <ChevronDown className="u-nav-chevron" />
      </BaseCollapsible.Trigger>
      <BaseCollapsible.Panel className="u-collapsible-panel">
        <div className="u-nav-sub">
          {item.children.map((c) => (
            <NavLink key={c.key} item={c} active={c.key === activeKey} renderLink={renderLink} depth={1} aksiItem={aksiItem} menuItem={menuItem} />
          ))}
        </div>
      </BaseCollapsible.Panel>
    </BaseCollapsible.Root>
  );
}

/** Sidebar aplikasi dasbor (SIAKAD, Pustikom, LMS, fakultas): grup menu, sub-menu, lencana, profil, mode rail. */
export function Sidebar({ brand, groups, activeKey, header, footer, user, collapsed, onCollapsedChange, renderLink, accordion = true, ingat, footerTetap, aksiItem, menuItem, lipatKategori, ingatKategori, className }: SidebarProps) {
  // Mode accordion: simpan satu kunci sub-menu yang terbuka. Awalnya sub-menu yang memuat halaman aktif,
  // dan ikut berpindah saat halaman aktif pindah ke sub-menu lain.
  const induk = (key?: string) => groups.flatMap((g) => g.items).find((it) => it.children?.length && containsActive(it, key))?.key ?? null;
  // `indukAktif` ikut dihitung ulang saat `groups` berubah, karena menu sering baru lengkap setelah peran pengguna dimuat
  // (sub menu halaman aktif harus tetap terbuka walau grupnya muncul belakangan).
  const indukAktif = induk(activeKey);
  const [openKey, setOpenKeyDalam] = React.useState<string | null>(() => indukAktif ?? bacaIngat(ingat));
  const setOpenKey = (k: string | null) => {
    setOpenKeyDalam(k);
    simpanIngat(ingat, k);
  };
  React.useEffect(() => {
    if (indukAktif) setOpenKeyDalam(indukAktif);
  }, [activeKey, indukAktif]);

  // Kategori yang bisa dilipat: peta kunci → terlipat (diingat). Kategori yang memuat halaman aktif dibuka.
  const kunciGrup = (g: NavGroup, gi: number) => g.kunci ?? (typeof g.label === 'string' ? g.label : `grup-${gi}`);
  const bisaLipat = (g: NavGroup) => Boolean(g.label) && (g.lipat ?? Boolean(lipatKategori));
  const [lipatan, setLipatan] = React.useState<Record<string, boolean>>(() => bacaLipatan(ingatKategori));
  const giAktif = groups.findIndex((g) => g.items.some((it) => containsActive(it, activeKey)));
  const kunciAktif = giAktif >= 0 ? kunciGrup(groups[giAktif]!, giAktif) : null;
  const ubahLipatan = (k: string, terlipat: boolean) =>
    setLipatan((l) => {
      const baru = { ...l, [k]: terlipat };
      simpanIngat(ingatKategori, JSON.stringify(baru));
      return baru;
    });
  React.useEffect(() => {
    if (kunciAktif && lipatan[kunciAktif]) ubahLipatan(kunciAktif, false);
  }, [activeKey, kunciAktif]); // eslint-disable-line react-hooks/exhaustive-deps
  const terlipat = (g: NavGroup, gi: number) => {
    if (!bisaLipat(g)) return false;
    const k = kunciGrup(g, gi);
    if (lipatan[k] !== undefined) return lipatan[k]!;
    if (k === kunciAktif) return false;
    return lipatKategori === 'terlipat' || Boolean(g.terlipat);
  };
  const isiGrup = (g: NavGroup) =>
    g.items.map((it) => (
      <NavTree
        key={it.key}
        item={it}
        activeKey={activeKey}
        collapsed={collapsed}
        renderLink={renderLink}
        aksiItem={collapsed ? undefined : aksiItem}
        menuItem={collapsed ? undefined : menuItem}
        {...(accordion && it.children?.length ? { open: openKey === it.key, onOpenChange: (o: boolean) => setOpenKey(o ? it.key : openKey === it.key ? null : openKey) } : {})}
      />
    ));
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
        {groups.map((g, gi) => {
          // Mode ikon: semua item tampil, kategori dipisah garis tipis (lihat _layout.scss).
          if (collapsed || !bisaLipat(g))
            return (
              <div key={gi} className="u-nav-group">
                {g.label && !collapsed && <div className="u-nav-group-label">{g.label}</div>}
                {isiGrup(g)}
              </div>
            );
          const k = kunciGrup(g, gi);
          const lipat = terlipat(g, gi);
          const jumlah = lipat ? jumlahLencana(g.items) : 0;
          return (
            <BaseCollapsible.Root key={gi} className="u-nav-group" data-lipat="" open={!lipat} onOpenChange={(o) => ubahLipatan(k, !o)}>
              <BaseCollapsible.Trigger className="u-nav-group-label" data-lipat="">
                <span>{g.label}</span>
                {jumlah > 0 && <span className="u-nav-badge">{jumlah}</span>}
                <ChevronDown className="u-nav-chevron" />
              </BaseCollapsible.Trigger>
              <BaseCollapsible.Panel className="u-collapsible-panel">{isiGrup(g)}</BaseCollapsible.Panel>
            </BaseCollapsible.Root>
          );
        })}
      </nav>
      {footer && !collapsed && <div className="u-sidebar-footer">{footer}</div>}
      {footerTetap && <div className="u-sidebar-tetap">{footerTetap}</div>}
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
  /** Atribut data tambahan di elemen akar (mis. gaya bilah atas dari tema). */
  atribut?: Record<`data-${string}`, string | undefined>;
  /** Laci menu ponsel dikendalikan dari luar (mis. tombol "Menu" di navigasi bawah). */
  menuTerbuka?: boolean;
  onMenuTerbuka?: (terbuka: boolean) => void;
}
/** Kerangka halaman dasbor: sidebar tetap di desktop, laci (sheet) di ponsel. */
export function AppShell({ sidebar, topbar, children, className, atribut, menuTerbuka, onMenuTerbuka }: AppShellProps) {
  const [mobileOpenDalam, setMobileOpenDalam] = React.useState(false);
  const mobileOpen = menuTerbuka ?? mobileOpenDalam;
  const setMobileOpen = (o: boolean) => (onMenuTerbuka ? onMenuTerbuka(o) : setMobileOpenDalam(o));
  return (
    <div className={cn('u-app-shell', className)} data-collapsed={dataFlag(sidebar.props.collapsed)} {...atribut}>
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
