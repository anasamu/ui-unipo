'use client';
import * as React from 'react';
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react';
import { cn } from '../lib/cn';
import { Kbd } from './actions';
import type { NavGroup, NavItem } from './layout';
import { Dialog } from './overlays';

/** Satu fitur yang bisa dicari: menu sidebar atau item tambahan (mis. "Ekspor laporan", "Tambah mahasiswa"). */
export interface ItemFitur {
  key: string;
  label: string;
  href?: string;
  /** Dipanggil saat dipilih (selain/ganti navigasi ke href). */
  onSelect?: () => void;
  icon?: React.ReactNode;
  /** Nama kelompok menu; hasil dikelompokkan dengan judul ini. */
  kelompok?: string;
  /** Baris kecil di bawah label. */
  keterangan?: string;
  /** Kata lain yang juga cocok (sinonim, singkatan), mis. ['ukt', 'spp']. */
  kataKunci?: string[];
}

const teks = (n: React.ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : '');

/** Ratakan kelompok menu Sidebar (termasuk sub-menu) menjadi daftar fitur untuk PencarianFitur. */
export function fiturDariMenu(groups: NavGroup[]): ItemFitur[] {
  const out: ItemFitur[] = [];
  const masuk = (it: NavItem, kelompok: string, induk?: NavItem) => {
    if (it.disabled) return;
    if (it.children?.length) return it.children.forEach((c) => masuk(c, kelompok, it));
    if (!it.href && !it.onClick) return;
    out.push({
      key: it.key,
      label: it.labelTeks || teks(it.label) || it.key,
      href: it.href,
      onSelect: it.onClick,
      icon: it.icon ?? induk?.icon,
      kelompok: [kelompok, induk ? induk.labelTeks || teks(induk.label) : ''].filter(Boolean).join(' › ') || undefined,
    });
  };
  groups.forEach((g) => g.items.forEach((it) => masuk(it, teks(g.label))));
  return out;
}

const normal = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Cocokkan dan urutkan fitur: semua kata harus ada; label yang diawali kata kunci naik ke atas. */
export function cariFitur(items: ItemFitur[], q: string): ItemFitur[] {
  const kata = normal(q).split(' ').filter(Boolean);
  if (!kata.length) return items;
  const nilai = (it: ItemFitur): number | null => {
    const label = normal(it.label);
    const semua = normal([it.label, it.kelompok, it.keterangan, ...(it.kataKunci ?? [])].filter(Boolean).join(' '));
    if (!kata.every((k) => semua.includes(k))) return null;
    const q0 = kata.join(' ');
    if (label.startsWith(q0)) return 0;
    if (label.split(' ').some((w) => w.startsWith(kata[0]!))) return 1;
    if (label.includes(kata[0]!)) return 2;
    return 3;
  };
  return items
    .map((it, i) => ({ it, i, n: nilai(it) }))
    .filter((x): x is { it: ItemFitur; i: number; n: number } => x.n !== null)
    .sort((a, b) => a.n - b.n || a.i - b.i)
    .map((x) => x.it);
}

function Sorot({ teks: t, q }: { teks: string; q: string }) {
  const k = normal(q).split(' ').filter(Boolean)[0];
  if (!k) return <>{t}</>;
  // Posisi pada teks asli (normalisasi tidak mengubah panjang untuk huruf Latin tanpa diakritik).
  const i = normal(t).indexOf(k);
  if (i < 0 || normal(t).length !== t.toLowerCase().length) return <>{t}</>;
  return (
    <>
      {t.slice(0, i)}
      <mark>{t.slice(i, i + k.length)}</mark>
      {t.slice(i + k.length)}
    </>
  );
}

/** "⌘K" di Mac/iOS, "Ctrl K" di lainnya. */
export function labelPintasanCari(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K';
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘K' : 'Ctrl K';
}

/** Pasang pintasan Ctrl/⌘K (dan "/" di luar isian) untuk membuka pencarian. */
export function usePintasanCari(buka: () => void, aktif = true) {
  const ref = React.useRef(buka);
  ref.current = buka;
  React.useEffect(() => {
    if (!aktif) return;
    const f = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const isian = el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        ref.current();
      } else if (e.key === '/' && !isian && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        ref.current();
      }
    };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [aktif]);
}

export interface PencarianFiturProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ItemFitur[];
  /** Dipanggil saat fitur dipilih (setelah item.onSelect). Biasanya navigasi ke item.href. */
  onPilih?: (item: ItemFitur) => void;
  placeholder?: string;
  /** Batas hasil yang ditampilkan. Bawaan 50. */
  batas?: number;
  className?: string;
}

/**
 * Palet pencarian fitur (Ctrl/⌘K): cari menu dan aksi aplikasi, pilih dengan panah + Enter. Isi `items` dengan
 * `fiturDariMenu(groups)` ditambah fitur lain yang tidak ada di sidebar.
 */
export function PencarianFitur({ open, onOpenChange, items, onPilih, placeholder = 'Cari fitur atau menu', batas = 50, className }: PencarianFiturProps) {
  const [q, setQ] = React.useState('');
  const [aktif, setAktif] = React.useState(0);
  const daftarRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId();
  const hasil = React.useMemo(() => cariFitur(items, q).slice(0, batas), [items, q, batas]);

  React.useEffect(() => {
    if (open) {
      setQ('');
      setAktif(0);
    }
  }, [open]);
  React.useEffect(() => setAktif(0), [q]);
  React.useEffect(() => {
    daftarRef.current?.querySelector('[data-aktif]')?.scrollIntoView({ block: 'nearest' });
  }, [aktif]);

  const pilih = (it: ItemFitur | undefined) => {
    if (!it) return;
    onOpenChange(false);
    it.onSelect?.();
    onPilih?.(it);
  };
  const tombol = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setAktif((a) => Math.min(hasil.length - 1, a + 1)));
    else if (e.key === 'ArrowUp') (e.preventDefault(), setAktif((a) => Math.max(0, a - 1)));
    else if (e.key === 'Home' && e.ctrlKey) (e.preventDefault(), setAktif(0));
    else if (e.key === 'End' && e.ctrlKey) (e.preventDefault(), setAktif(hasil.length - 1));
    else if (e.key === 'Enter') (e.preventDefault(), pilih(hasil[aktif]));
  };

  // Kelompokkan berurutan: judul kelompok tampil saat kelompok berganti.
  let kelompokSebelum: string | undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={<span className="u-sr-only">Cari fitur</span>} size="md" className={cn('u-cari-fitur', className)}>
      <div className="u-cari-fitur-isian">
        <Search aria-hidden />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={tombol}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded
          aria-controls={`${id}-daftar`}
          aria-activedescendant={hasil[aktif] ? `${id}-${aktif}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="button" className="u-cari-fitur-tutup" onClick={() => onOpenChange(false)} aria-label="Tutup pencarian">
          <Kbd>Esc</Kbd>
        </button>
      </div>
      <div ref={daftarRef} id={`${id}-daftar`} className="u-cari-fitur-daftar" role="listbox" aria-label="Hasil pencarian">
        {hasil.length ? (
          hasil.map((it, i) => {
            const judul = it.kelompok !== kelompokSebelum && !q.trim() ? it.kelompok : undefined;
            kelompokSebelum = it.kelompok;
            return (
              <React.Fragment key={`${it.key}-${i}`}>
                {judul && <div className="u-cari-fitur-kelompok">{judul}</div>}
                <div
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={i === aktif}
                  data-aktif={i === aktif ? '' : undefined}
                  className="u-cari-fitur-item"
                  onMouseMove={() => i !== aktif && setAktif(i)}
                  onClick={() => pilih(it)}
                >
                  <span className="u-cari-fitur-ikon" aria-hidden>
                    {it.icon ?? <ArrowRight />}
                  </span>
                  <span className="u-cari-fitur-teks">
                    <span>
                      <Sorot teks={it.label} q={q} />
                    </span>
                    {(it.keterangan || (q.trim() && it.kelompok)) && <small>{it.keterangan ?? it.kelompok}</small>}
                  </span>
                  {i === aktif && <CornerDownLeft className="u-cari-fitur-enter" aria-hidden />}
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <p className="u-cari-fitur-kosong">Tidak ada fitur yang cocok dengan “{q.trim()}”</p>
        )}
      </div>
      <div className="u-cari-fitur-kaki" aria-hidden>
        <span>
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> pilih
        </span>
        <span>
          <Kbd>Enter</Kbd> buka
        </span>
        <span>
          <Kbd>{labelPintasanCari()}</Kbd> cari dari mana saja
        </span>
      </div>
    </Dialog>
  );
}

export interface PintasanFiturProps {
  items: ItemFitur[];
  /** Tautan kustom (mis. <Link> React Router). Bawaan <a href>. */
  renderLink?: (item: ItemFitur, props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { children: React.ReactNode }) => React.ReactElement;
  /** Kolom minimum (px) untuk grid otomatis. Bawaan 200. */
  lebarMin?: number;
  className?: string;
}

/**
 * Grid pintasan fitur untuk beranda aplikasi: ikon + label + kelompok, dari `fiturDariMenu(groups)` yang sudah
 * disaring izinnya. Mengikuti efek bayangan tema.
 */
export function PintasanFitur({ items, renderLink, lebarMin = 200, className }: PintasanFiturProps) {
  return (
    <div className={cn('u-pintasan-fitur', className)} style={{ '--u-pintasan-min': `${lebarMin}px` } as React.CSSProperties}>
      {items.map((it) => {
        const isi = (
          <>
            <span className="u-pintasan-ikon" aria-hidden>
              {it.icon ?? <ArrowRight />}
            </span>
            <span className="u-pintasan-teks">
              <b>{it.label}</b>
              {(it.keterangan ?? it.kelompok) && <small>{it.keterangan ?? it.kelompok}</small>}
            </span>
          </>
        );
        const props = { className: 'u-pintasan-item', children: isi };
        if (it.href) return <React.Fragment key={it.key}>{renderLink ? renderLink(it, { ...props, href: it.href }) : <a {...props} href={it.href} />}</React.Fragment>;
        return <button key={it.key} type="button" {...props} onClick={it.onSelect} />;
      })}
    </div>
  );
}
