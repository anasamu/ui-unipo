'use client';
import * as React from 'react';
import { ChevronLeft } from 'lucide-react';
import { cn } from '../lib/cn';
import { setelPlatform, usePlatform, type Platform, type SistemOperasi } from '../lib/platform';

export interface PlatformProviderProps {
  platform?: Platform | 'auto';
  os?: SistemOperasi | 'auto';
  children: React.ReactNode;
}

/** Komponen pengganti setelPlatform() untuk aplikasi React: atur platform saat dipasang. */
export function PlatformProvider({ platform = 'auto', os = 'auto', children }: PlatformProviderProps) {
  React.useLayoutEffect(() => {
    setelPlatform({ platform, os });
  }, [platform, os]);
  return <>{children}</>;
}

export interface ItemNavigasiBawah {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: React.ReactNode;
}

/**
 * Bilah tab bawah untuk aplikasi mobile (gaya iOS: ikon + label kecil, latar buram; gaya Android: pil penanda aktif).
 * Di web/desktop tampil hanya pada layar sempit.
 */
export function NavigasiBawah({ items, activeKey, renderLink, className }: { items: ItemNavigasiBawah[]; activeKey?: string; renderLink?: (item: ItemNavigasiBawah, children: React.ReactNode) => React.ReactNode; className?: string }) {
  const p = usePlatform();
  return (
    <nav className={cn('u-nav-bawah', className)} data-os={p.os} aria-label="Navigasi utama">
      {items.map((it) => {
        const isi = (
          <>
            <span className="u-nav-bawah-ikon">
              {it.icon}
              {it.badge != null && <span className="u-nav-bawah-badge">{it.badge}</span>}
            </span>
            <span className="u-nav-bawah-label">{it.label}</span>
          </>
        );
        const props = { className: 'u-nav-bawah-item', 'aria-current': it.key === activeKey ? ('page' as const) : undefined };
        if (renderLink) return <React.Fragment key={it.key}>{renderLink(it, <span {...props}>{isi}</span>)}</React.Fragment>;
        return it.href ? (
          <a key={it.key} href={it.href} {...props}>
            {isi}
          </a>
        ) : (
          <button key={it.key} type="button" onClick={it.onClick} {...props}>
            {isi}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Bilah judul aplikasi: di iOS judul di tengah dengan tombol kembali "‹ Kembali", di Android judul rata kiri dengan
 * panah, di desktop bisa dipakai menyeret jendela (Electron/Tauri) dan memberi ruang tombol jendela.
 */
export function BilahAplikasi({ title, onBack, backLabel = 'Kembali', actions, besar, className }: { title: React.ReactNode; onBack?: () => void; backLabel?: string; actions?: React.ReactNode; besar?: boolean; className?: string }) {
  const p = usePlatform();
  return (
    <header className={cn('u-bilah-aplikasi', className)} data-os={p.os} data-platform={p.platform} data-besar={besar || undefined}>
      <div className="u-bilah-aplikasi-kiri">
        {onBack && (
          <button type="button" className="u-bilah-kembali" onClick={onBack} aria-label={backLabel}>
            <ChevronLeft aria-hidden />
            {p.ios && <span>{backLabel}</span>}
          </button>
        )}
      </div>
      <h1 className="u-bilah-aplikasi-judul">{title}</h1>
      <div className="u-bilah-aplikasi-kanan">{actions}</div>
    </header>
  );
}

/** Tombol aksi melayang (Android FAB; di iOS menjadi tombol bulat dengan bayangan lembut). */
export function TombolMelayang({ icon, label, onClick, extended, className }: { icon: React.ReactNode; label: string; onClick?: () => void; extended?: boolean; className?: string }) {
  return (
    <button type="button" className={cn('u-tombol-melayang', className)} data-extended={extended || undefined} onClick={onClick} aria-label={extended ? undefined : label}>
      {icon}
      {extended && <span>{label}</span>}
    </button>
  );
}
