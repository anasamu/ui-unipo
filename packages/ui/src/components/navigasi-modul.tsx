'use client';
import * as React from 'react';
import { ChevronDown, ChevronRight, Menu as IkonMenu, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { usePlatform } from '../lib/platform';
import { Avatar } from './display';
import { Dialog, Menu, Tooltip, type MenuEntry } from './overlays';
import { NavigasiBawah } from './platform';
import type { NavGroup, NavItem, SidebarUser } from './layout';

// Navigasi per modul: sidebar modul (7 varian), menu utama/peluncur modul (6 varian), menu atas (6 varian).
// Semua mengikuti pengaturan perangkat (setelPlatform / PlatformProvider): di mobile sidebar menjadi laci atau
// bilah bawah, menu atas bergulir ke samping atau masuk ke laci, peluncur jadi kisi 4 kolom.

type RenderTautan = (item: { key: string; href?: string }, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactElement;

function Tautan({
  item,
  className,
  aktif,
  renderLink,
  children,
  ...rest
}: { item: { key: string; href?: string; onClick?: () => void; disabled?: boolean }; className: string; aktif?: boolean; renderLink?: RenderTautan; children: React.ReactNode } & Record<
  string,
  unknown
>) {
  const props = {
    className,
    'data-active': dataFlag(aktif),
    'aria-current': aktif ? ('page' as const) : undefined,
    'aria-disabled': item.disabled || undefined,
    onClick: item.onClick,
    ...rest,
  };
  if (item.href)
    return renderLink ? (
      renderLink(item, { ...props, href: item.href, children })
    ) : (
      <a {...props} href={item.href}>
        {children}
      </a>
    );
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}

const memuatAktif = (it: NavItem, key?: string): boolean => it.key === key || Boolean(it.children?.some((c) => memuatAktif(c, key)));
const teksLabel = (l: React.ReactNode) => (typeof l === 'string' ? l : '');

function saringGrup(grup: NavGroup[], kata: string): NavGroup[] {
  const t = kata.trim().toLowerCase();
  if (!t) return grup;
  const cocok = (it: NavItem): NavItem | null => {
    if (teksLabel(it.label).toLowerCase().includes(t)) return it;
    const anak = (it.children ?? []).map(cocok).filter(Boolean) as NavItem[];
    return anak.length ? { ...it, children: anak } : null;
  };
  return grup.map((g) => ({ ...g, items: g.items.map(cocok).filter(Boolean) as NavItem[] })).filter((g) => g.items.length);
}

// ================================================================ Sidebar modul
export interface ModulNavigasi {
  key: string;
  nama: React.ReactNode;
  ikon?: React.ReactNode;
  /** Warna aksen modul (CSS), mis. "#7c3aed" atau var(--u-chart-3). */
  warna?: string;
  keterangan?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

export type VarianSidebarModul = 'standar' | 'ringkas' | 'melayang' | 'berkelompok' | 'ganda' | 'berwarna' | 'garis';

export interface SidebarModulProps {
  /** Modul aktif (judul sidebar): SDM, BAAK, Keuangan, LP2M, SPMI, … */
  modul: ModulNavigasi;
  grup: NavGroup[];
  activeKey?: string;
  /**
   * `standar` daftar dengan sub-menu · `ringkas` ikon saja (rail) · `melayang` kartu mengambang dengan sudut bulat ·
   * `berkelompok` judul grup bisa dilipat · `ganda` rail daftar modul + panel menu · `berwarna` latar warna modul ·
   * `garis` penanda aktif garis kiri tanpa latar.
   */
  varian?: VarianSidebarModul;
  /** Untuk varian `ganda`: daftar modul lain di rail kiri. */
  modulLain?: ModulNavigasi[];
  /** Kotak saring menu di atas daftar. */
  cari?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  user?: SidebarUser;
  /** Tombol lipat (rail) di kaki; terkendali lewat `ringkas`/`onRingkasChange`. */
  ringkas?: boolean;
  onRingkasChange?: (ringkas: boolean) => void;
  /** Perilaku di perangkat mobile: `laci` (tombol menu membuka laci kiri, bawaan) atau `bawah` (5 menu pertama di bilah bawah). */
  mobile?: 'laci' | 'bawah';
  /** Isi laci mobile: buka/tutup terkendali (mis. dari tombol di bilah aplikasi). */
  laciTerbuka?: boolean;
  onLaciChange?: (buka: boolean) => void;
  renderLink?: RenderTautan;
  className?: string;
}

function ItemSidebar({ it, activeKey, ringkas, renderLink, onPilih }: { it: NavItem; activeKey?: string; ringkas?: boolean; renderLink?: RenderTautan; onPilih?: () => void }) {
  const anakAktif = memuatAktif(it, activeKey);
  const [buka, setBuka] = React.useState(anakAktif);
  React.useEffect(() => {
    if (anakAktif) setBuka(true);
  }, [anakAktif]);
  if (it.children?.length) {
    if (ringkas)
      return (
        <Menu
          side="right"
          align="start"
          trigger={
            <button type="button" className="u-sm-item" data-active={dataFlag(anakAktif)} aria-label={teksLabel(it.label)}>
              <span className="u-sm-ikon">{it.icon}</span>
            </button>
          }
          items={[{ type: 'label', label: it.label }, ...it.children.map((c) => ({ label: c.label, href: c.href, onSelect: c.onClick }))]}
        />
      );
    return (
      <div className="u-sm-cabang" data-buka={dataFlag(buka)}>
        <button type="button" className="u-sm-item" data-induk-aktif={dataFlag(anakAktif)} aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
          <span className="u-sm-ikon">{it.icon}</span>
          <span className="u-sm-label">{it.label}</span>
          {it.badge != null && <span className="u-sm-badge">{it.badge}</span>}
          <ChevronDown className="u-sm-panah" aria-hidden />
        </button>
        {buka && (
          <div className="u-sm-sub">
            {it.children.map((c) => (
              <Tautan key={c.key} item={{ ...c, onClick: () => (c.onClick?.(), onPilih?.()) }} className="u-sm-item" data-depth={1} aktif={c.key === activeKey} renderLink={renderLink}>
                <span className="u-sm-label">{c.label}</span>
                {c.badge != null && <span className="u-sm-badge">{c.badge}</span>}
              </Tautan>
            ))}
          </div>
        )}
      </div>
    );
  }
  const el = (
    <Tautan item={{ ...it, onClick: () => (it.onClick?.(), onPilih?.()) }} className="u-sm-item" aktif={it.key === activeKey} renderLink={renderLink}>
      <span className="u-sm-ikon">{it.icon}</span>
      {!ringkas && <span className="u-sm-label">{it.label}</span>}
      {it.badge != null && <span className="u-sm-badge">{it.badge}</span>}
    </Tautan>
  );
  return ringkas ? (
    <Tooltip content={it.label} side="right">
      {el}
    </Tooltip>
  ) : (
    el
  );
}

function GrupSidebar({ g, lipat, ...p }: { g: NavGroup; lipat?: boolean; activeKey?: string; ringkas?: boolean; renderLink?: RenderTautan; onPilih?: () => void }) {
  const [buka, setBuka] = React.useState(true);
  return (
    <div className="u-sm-grup" data-buka={dataFlag(buka)}>
      {g.label &&
        !p.ringkas &&
        (lipat ? (
          <button type="button" className="u-sm-grup-judul" aria-expanded={buka} onClick={() => setBuka((b) => !b)}>
            <span>{g.label}</span>
            <ChevronRight className="u-sm-panah" aria-hidden />
          </button>
        ) : (
          <div className="u-sm-grup-judul">{g.label}</div>
        ))}
      {(buka || !lipat) && g.items.map((it) => <ItemSidebar key={it.key} it={it} {...p} />)}
    </div>
  );
}

function IsiSidebar({ modul, grup, activeKey, varian, cari, header, footer, user, ringkas, onRingkasChange, renderLink, onPilih }: SidebarModulProps & { onPilih?: () => void }) {
  const [kata, setKata] = React.useState('');
  const tampil = saringGrup(grup, kata);
  return (
    <>
      <div className="u-sm-kepala">
        <span className="u-sm-modul-ikon" aria-hidden>
          {modul.ikon}
        </span>
        {!ringkas && (
          <span className="u-sm-modul-teks">
            <b>{modul.nama}</b>
            {modul.keterangan && <small>{modul.keterangan}</small>}
          </span>
        )}
      </div>
      {header && !ringkas && <div className="u-sm-header">{header}</div>}
      {cari && !ringkas && (
        <label className="u-sm-cari">
          <Search aria-hidden />
          <input type="search" value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Saring menu…" aria-label="Saring menu" />
        </label>
      )}
      <nav className="u-sm-nav" aria-label={`Menu ${teksLabel(modul.nama)}`}>
        {tampil.map((g, i) => (
          <GrupSidebar key={i} g={g} lipat={varian === 'berkelompok'} activeKey={activeKey} ringkas={ringkas} renderLink={renderLink} onPilih={onPilih} />
        ))}
        {!tampil.length && <p className="u-sm-kosong">Tidak ada menu “{kata}”.</p>}
      </nav>
      {footer && !ringkas && <div className="u-sm-footer">{footer}</div>}
      {(user || onRingkasChange) && (
        <div className="u-sm-kaki">
          {user &&
            (user.menu?.length ? (
              <Menu
                side="top"
                align="start"
                items={user.menu}
                trigger={
                  <button type="button" className="u-sm-pengguna">
                    <Avatar name={user.name} src={user.avatar} size="sm" />
                    {!ringkas && (
                      <span>
                        <b>{user.name}</b>
                        {user.subtitle && <small>{user.subtitle}</small>}
                      </span>
                    )}
                  </button>
                }
              />
            ) : (
              <div className="u-sm-pengguna">
                <Avatar name={user.name} src={user.avatar} size="sm" />
                {!ringkas && (
                  <span>
                    <b>{user.name}</b>
                    {user.subtitle && <small>{user.subtitle}</small>}
                  </span>
                )}
              </div>
            ))}
          {onRingkasChange && (
            <button type="button" className="u-sm-lipat" aria-label={ringkas ? 'Lebarkan menu' : 'Ringkas menu'} onClick={() => onRingkasChange(!ringkas)}>
              {ringkas ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Sidebar untuk satu modul aplikasi (SDM, BAAK, Keuangan, LP2M, SPMI, Presensi, …) dengan tujuh varian tampilan.
 * Di perangkat mobile otomatis menjadi tombol + laci kiri, atau bilah bawah (`mobile="bawah"`).
 */
export function SidebarModul(props: SidebarModulProps) {
  const { modul, varian = 'standar', modulLain = [], mobile = 'laci', className, laciTerbuka, onLaciChange, grup, activeKey, renderLink } = props;
  const p = usePlatform();
  const [laciDalam, setLaciDalam] = React.useState(false);
  const laci = laciTerbuka ?? laciDalam;
  const setLaci = (b: boolean) => (onLaciChange ? onLaciChange(b) : setLaciDalam(b));
  const ringkas = varian === 'ringkas' ? (props.ringkas ?? true) : props.ringkas;
  const gaya = modul.warna ? ({ '--u-sm-warna': modul.warna } as React.CSSProperties) : undefined;

  if (p.mobile) {
    if (mobile === 'bawah') {
      const datar = grup.flatMap((g) => g.items).flatMap((it) => (it.children?.length ? it.children : [it]));
      const lima = datar.slice(0, 4);
      return (
        <>
          <NavigasiBawah
            className={className}
            activeKey={activeKey}
            items={[
              ...lima.map((it) => ({ key: it.key, label: teksLabel(it.label) || it.key, icon: it.icon ?? <span className="u-sm-titik" />, href: it.href, onClick: it.onClick, badge: it.badge })),
              ...(datar.length > 4 ? [{ key: '__lain', label: 'Lainnya', icon: <MoreHorizontal />, onClick: () => setLaci(true) }] : []),
            ]}
          />
          <Dialog open={laci} onOpenChange={setLaci} side="left" title={modul.nama} className="u-sm-laci">
            <div className="u-sm" data-varian="standar" style={gaya}>
              <IsiSidebar {...props} ringkas={false} onRingkasChange={undefined} onPilih={() => setLaci(false)} />
            </div>
          </Dialog>
        </>
      );
    }
    return (
      <>
        {laciTerbuka === undefined && (
          <button type="button" className={cn('u-sm-pemicu', className)} onClick={() => setLaci(true)} aria-label={`Buka menu ${teksLabel(modul.nama)}`} style={gaya}>
            <IkonMenu aria-hidden />
            <span className="u-sm-modul-ikon" aria-hidden>
              {modul.ikon}
            </span>
            <b>{modul.nama}</b>
          </button>
        )}
        <Dialog open={laci} onOpenChange={setLaci} side="left" title={<span className="u-sr-only">{teksLabel(modul.nama) || 'Menu'}</span>} className="u-sm-laci">
          <div className="u-sm" data-varian={varian === 'ringkas' || varian === 'ganda' || varian === 'melayang' ? 'standar' : varian} style={gaya}>
            <IsiSidebar {...props} ringkas={false} onRingkasChange={undefined} onPilih={() => setLaci(false)} />
          </div>
        </Dialog>
      </>
    );
  }

  if (varian === 'ganda') {
    return (
      <div className={cn('u-sm-ganda', className)} style={gaya}>
        <nav className="u-sm-rail" aria-label="Modul">
          {[modul, ...modulLain.filter((m) => m.key !== modul.key)].map((m) => (
            <Tooltip key={m.key} content={m.nama} side="right">
              <Tautan item={m} className="u-sm-rail-item" aktif={m.key === modul.key} renderLink={renderLink} style={m.warna ? ({ '--u-sm-warna': m.warna } as React.CSSProperties) : undefined}>
                {m.ikon}
                {m.badge != null && <span className="u-sm-rail-badge">{m.badge}</span>}
              </Tautan>
            </Tooltip>
          ))}
        </nav>
        <aside className="u-sm" data-varian="standar">
          <IsiSidebar {...props} ringkas={false} />
        </aside>
      </div>
    );
  }
  return (
    <aside className={cn('u-sm', className)} data-varian={varian} data-ringkas={dataFlag(ringkas)} style={gaya}>
      <IsiSidebar {...props} ringkas={ringkas} />
    </aside>
  );
}

// ================================================================ Menu utama / peluncur modul
export interface ItemMenuUtama {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  keterangan?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  /** Warna aksen kotak ikon. */
  warna?: string;
  /** Nama grup (untuk varian mega/daftar/kartu): Akademik, Keuangan, Kepegawaian, … */
  grup?: string;
  disabled?: boolean;
  /** Sorot sebagai baru/disarankan. */
  baru?: boolean;
}

export type VarianMenuUtama = 'grid' | 'daftar' | 'kartu' | 'mega' | 'dok' | 'ubin';

export interface MenuUtamaProps {
  items: ItemMenuUtama[];
  /**
   * `grid` ikon + label (peluncur aplikasi) · `daftar` baris dengan keterangan · `kartu` kartu besar berwarna ·
   * `mega` kolom per grup (untuk panel menu besar) · `dok` bilah ikon mengambang ala dock · `ubin` ubin warna ukuran campur.
   */
  varian?: VarianMenuUtama;
  activeKey?: string;
  /** Kotak cari di atas menu. */
  cari?: boolean | string;
  /** Kolom minimum (px) untuk grid/kartu. */
  lebarMin?: number;
  judul?: React.ReactNode;
  renderLink?: RenderTautan;
  className?: string;
}

function kelompokkan(items: ItemMenuUtama[]) {
  const m = new Map<string, ItemMenuUtama[]>();
  items.forEach((it) => {
    const g = it.grup ?? '';
    m.set(g, [...(m.get(g) ?? []), it]);
  });
  return [...m.entries()];
}

/** Menu utama / peluncur modul dengan enam varian. Di mobile: kisi 4 kolom, dok jadi bilah bawah, mega jadi daftar per grup. */
export function MenuUtama({ items, varian = 'grid', activeKey, cari, lebarMin, judul, renderLink, className }: MenuUtamaProps) {
  const p = usePlatform();
  const [kata, setKata] = React.useState('');
  const t = kata.trim().toLowerCase();
  const tampil = t ? items.filter((it) => `${teksLabel(it.label)} ${teksLabel(it.keterangan)} ${it.grup ?? ''}`.toLowerCase().includes(t)) : items;
  const v: VarianMenuUtama = p.mobile && varian === 'mega' ? 'daftar' : varian;

  if (v === 'dok' && p.mobile) {
    return (
      <NavigasiBawah
        className={className}
        activeKey={activeKey}
        items={items.slice(0, 5).map((it) => ({ key: it.key, label: teksLabel(it.label) || it.key, icon: it.icon ?? <span />, href: it.href, onClick: it.onClick, badge: it.badge }))}
      />
    );
  }

  const butir = (it: ItemMenuUtama) => {
    const gaya = it.warna ? ({ '--u-mu-warna': it.warna } as React.CSSProperties) : undefined;
    const isi = (
      <>
        <span className="u-mu-ikon" aria-hidden>
          {it.icon}
          {it.badge != null && <span className="u-mu-badge">{it.badge}</span>}
        </span>
        <span className="u-mu-teks">
          <span className="u-mu-label">
            {it.label}
            {it.baru && <span className="u-mu-baru">Baru</span>}
          </span>
          {it.keterangan && v !== 'grid' && v !== 'dok' && <small>{it.keterangan}</small>}
        </span>
        {v === 'daftar' && <ChevronRight className="u-mu-panah" aria-hidden />}
      </>
    );
    const el = (
      <Tautan key={it.key} item={it} className="u-mu-item" aktif={it.key === activeKey} renderLink={renderLink} style={gaya}>
        {isi}
      </Tautan>
    );
    return v === 'dok' ? (
      <Tooltip key={it.key} content={it.label}>
        {el}
      </Tooltip>
    ) : (
      el
    );
  };

  return (
    <div className={cn('u-mu', className)} data-varian={v} style={lebarMin ? ({ '--u-mu-min': `${lebarMin}px` } as React.CSSProperties) : undefined}>
      {(judul || cari) && (
        <div className="u-mu-kepala">
          {judul && <b className="u-mu-judul">{judul}</b>}
          {cari && (
            <label className="u-mu-cari">
              <Search aria-hidden />
              <input type="search" value={kata} onChange={(e) => setKata(e.target.value)} placeholder={typeof cari === 'string' ? cari : 'Cari menu atau modul…'} aria-label="Cari menu" />
              {kata && (
                <button type="button" onClick={() => setKata('')} aria-label="Kosongkan">
                  <X />
                </button>
              )}
            </label>
          )}
        </div>
      )}
      {v === 'mega' || (v === 'daftar' && items.some((it) => it.grup)) || (v === 'kartu' && items.some((it) => it.grup)) ? (
        <div className="u-mu-kelompok">
          {kelompokkan(tampil).map(([g, isi]) => (
            <section key={g || '_'} className="u-mu-bagian">
              {g && <h3 className="u-mu-grup">{g}</h3>}
              <div className="u-mu-isi">{isi.map(butir)}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="u-mu-isi">{tampil.map(butir)}</div>
      )}
      {!tampil.length && <p className="u-mu-kosong">Tidak ada menu “{kata}”.</p>}
    </div>
  );
}

// ================================================================ Menu atas
export interface ItemMenuAtas {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
  disabled?: boolean;
  /** Sub-menu tarik-turun. */
  children?: Array<{ key: string; label: React.ReactNode; icon?: React.ReactNode; href?: string; onClick?: () => void }>;
}

export type VarianMenuAtas = 'tab' | 'pil' | 'garis' | 'segmen' | 'remah' | 'bilah';

export interface MenuAtasProps {
  items: ItemMenuAtas[];
  activeKey?: string;
  onPilih?: (key: string) => void;
  /**
   * `tab` tab bergaris bawah · `pil` kapsul · `garis` teks dengan penanda tipis · `segmen` kontrol tersegmen ·
   * `remah` jejak (breadcrumb) dengan pemisah · `bilah` bilah atas lengkap (merek, menu, pencarian, aksi).
   */
  varian?: VarianMenuAtas;
  /** Menu lebih dari ini masuk ke "Lainnya" (desktop). */
  maks?: number;
  /** Untuk varian `bilah`. */
  brand?: React.ReactNode;
  cari?: React.ReactNode;
  aksi?: React.ReactNode;
  /** Bilah menempel di atas saat digulir. */
  lekat?: boolean;
  renderLink?: RenderTautan;
  className?: string;
  'aria-label'?: string;
}

/**
 * Menu atas dengan enam varian. Di mobile tab/pil/garis bergulir ke samping (aktif dibawa ke tengah), remah memendek ke
 * "… › induk › halaman", dan bilah menjadi tombol menu + laci.
 */
export function MenuAtas({ items, activeKey, onPilih, varian = 'tab', maks, brand, cari, aksi, lekat, renderLink, className, ...rest }: MenuAtasProps) {
  const p = usePlatform();
  const [laci, setLaci] = React.useState(false);
  const wadah = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!p.mobile) return;
    const el = wadah.current?.querySelector<HTMLElement>('[data-active]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [activeKey, p.mobile]);

  const pilih = (it: ItemMenuAtas) => () => {
    it.onClick?.();
    onPilih?.(it.key);
    setLaci(false);
  };
  const tampil = !p.mobile && maks && items.length > maks ? items.slice(0, maks) : items;
  const sisa = !p.mobile && maks && items.length > maks ? items.slice(maks) : [];
  const sisaAktif = sisa.some((s) => s.key === activeKey);

  const butir = (it: ItemMenuAtas, i: number) => {
    const aktif = it.key === activeKey || Boolean(it.children?.some((c) => c.key === activeKey));
    if (it.children?.length && !p.mobile) {
      return (
        <Menu
          key={it.key}
          align="start"
          items={it.children.map((c) => ({ label: c.label, icon: c.icon, href: c.href, onSelect: () => (c.onClick?.(), onPilih?.(c.key)) }))}
          trigger={
            <button type="button" className="u-ma-item" data-active={dataFlag(aktif)}>
              {it.icon}
              <span>{it.label}</span>
              <ChevronDown className="u-ma-panah" aria-hidden />
            </button>
          }
        />
      );
    }
    return (
      <React.Fragment key={it.key}>
        {varian === 'remah' && i > 0 && <ChevronRight className="u-ma-pemisah" aria-hidden />}
        <Tautan
          item={{ ...it, onClick: pilih(it) }}
          className="u-ma-item"
          aktif={aktif}
          renderLink={renderLink}
          role={varian === 'segmen' || varian === 'tab' ? 'tab' : undefined}
          aria-selected={varian === 'segmen' || varian === 'tab' ? aktif : undefined}
        >
          {it.icon}
          <span>{it.label}</span>
          {it.badge != null && <span className="u-ma-badge">{it.badge}</span>}
        </Tautan>
      </React.Fragment>
    );
  };

  if (varian === 'remah') {
    const pendek = p.mobile && items.length > 2 ? items.slice(-2) : items;
    return (
      <nav className={cn('u-ma', className)} data-varian="remah" aria-label={rest['aria-label'] ?? 'Jejak halaman'}>
        {pendek !== items && (
          <>
            <Menu
              align="start"
              items={items.slice(0, -2).map((it) => ({ label: it.label, href: it.href, onSelect: pilih(it) }))}
              trigger={
                <button type="button" className="u-ma-item" aria-label="Halaman sebelumnya">
                  …
                </button>
              }
            />
            <ChevronRight className="u-ma-pemisah" aria-hidden />
          </>
        )}
        {pendek.map((it, i) => butir(it, i))}
      </nav>
    );
  }

  const lainnya = sisa.length ? (
    <Menu
      align="end"
      items={sisa.map((s): MenuEntry => ({ label: s.label, icon: s.icon, href: s.href, onSelect: pilih(s) }))}
      trigger={
        <button type="button" className="u-ma-item" data-active={dataFlag(sisaAktif)}>
          <MoreHorizontal aria-hidden />
          <span>Lainnya</span>
        </button>
      }
    />
  ) : null;

  if (varian === 'bilah') {
    return (
      <header className={cn('u-ma-bilah', className)} data-lekat={dataFlag(lekat)}>
        {p.mobile && (
          <button type="button" className="u-ma-tombol-laci" aria-label="Buka menu" onClick={() => setLaci(true)}>
            <IkonMenu />
          </button>
        )}
        {brand && <div className="u-ma-brand">{brand}</div>}
        {!p.mobile && (
          <nav className="u-ma" data-varian="garis" aria-label={rest['aria-label'] ?? 'Menu utama'}>
            {tampil.map(butir)}
            {lainnya}
          </nav>
        )}
        <div className="u-ma-kanan">
          {cari}
          {aksi}
        </div>
        {p.mobile && (
          <Dialog open={laci} onOpenChange={setLaci} side="left" title={brand ?? 'Menu'} className="u-ma-laci">
            <nav className="u-ma-laci-daftar">
              {items
                .flatMap((it) => (it.children?.length ? it.children.map((c) => ({ ...c, badge: undefined })) : [it]))
                .map((it) => (
                  <Tautan key={it.key} item={{ ...it, onClick: pilih(it as ItemMenuAtas) }} className="u-ma-laci-item" aktif={it.key === activeKey} renderLink={renderLink}>
                    {it.icon}
                    <span>{it.label}</span>
                  </Tautan>
                ))}
            </nav>
          </Dialog>
        )}
      </header>
    );
  }

  const isi = (
    <div
      ref={wadah}
      className={cn('u-ma', varian !== 'segmen' && className)}
      data-varian={varian}
      data-lekat={dataFlag(lekat)}
      role={varian === 'segmen' || varian === 'tab' ? 'tablist' : undefined}
      aria-label={rest['aria-label']}
    >
      {tampil.map(butir)}
      {lainnya}
    </div>
  );
  // Segmen selebar isinya: dibungkus wadah selebar baris agar tidak mendorong tata letak di layar sempit.
  return varian === 'segmen' ? <div className={cn('u-ma-wadah', className)}>{isi}</div> : isi;
}
