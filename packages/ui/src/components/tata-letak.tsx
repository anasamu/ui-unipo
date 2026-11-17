'use client';
import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { saringHtml } from '../editor/dokumen/saring';

/**
 * Primitif tata letak UNIPO: aplikasi menyusun halaman dari komponen ini (bukan kelas utilitas sendiri), sehingga
 * jarak, lebar, dan perilaku responsif sama di semua aplikasi. Jarak memakai skala --u-space-* (1 = 0,25rem).
 */
type Jarak = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24;
const jarak = (n?: Jarak) => (n == null ? undefined : `var(--u-space-${n})`);
type Elemen = 'div' | 'section' | 'main' | 'aside' | 'header' | 'footer' | 'nav' | 'ul' | 'ol' | 'li' | 'article' | 'form' | 'dl';

// ================================================================ Container
export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /** Lebar maksimum: sm 40rem, md 48rem, lg 64rem, xl 80rem (bawaan), full tanpa batas. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  as?: Elemen;
  /** Jarak atas-bawah (skala ruang). */
  padY?: Jarak;
}
/** Wadah selebar halaman dengan jarak tepi 16px di ponsel dan 24px di layar lebar. */
export function Container({ size = 'xl', as: As = 'div', padY, className, style, ...props }: ContainerProps) {
  return <As className={cn('u-container', className)} data-size={size} style={{ paddingBlock: jarak(padY), ...style }} {...props} />;
}

// ================================================================ Stack & Cluster
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  gap?: Jarak;
  as?: Elemen;
  align?: 'start' | 'center' | 'end' | 'stretch';
}
/** Susunan vertikal dengan jarak seragam. */
export function Stack({ gap = 4, as: As = 'div', align, className, style, ...props }: StackProps) {
  return <As className={cn('u-stack', className)} style={{ gap: jarak(gap), alignItems: align, ...style }} {...props} />;
}

export interface ClusterProps extends React.HTMLAttributes<HTMLElement> {
  gap?: Jarak;
  as?: Elemen;
  justify?: 'start' | 'center' | 'end' | 'between';
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  /** Bawaan true: turun baris bila tidak muat. */
  wrap?: boolean;
}
/** Susunan mendatar (tombol, lencana, meta) yang turun baris bila sempit. */
export function Cluster({ gap = 2, as: As = 'div', justify = 'start', align = 'center', wrap = true, className, style, ...props }: ClusterProps) {
  return (
    <As
      className={cn('u-cluster', className)}
      style={{ gap: jarak(gap), justifyContent: justify === 'between' ? 'space-between' : justify === 'start' ? 'flex-start' : justify === 'end' ? 'flex-end' : 'center', alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align, flexWrap: wrap ? 'wrap' : 'nowrap', ...style }}
      {...props}
    />
  );
}

// ================================================================ Grid
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Lebar minimum kolom (px): kolom bertambah sendiri sesuai lebar wadah. */
  min?: number;
  /** Jumlah kolom tetap di layar lebar (turun ke 1 kolom di bawah 640px, 2 kolom di bawah 1024px bila > 2). */
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: Jarak;
  as?: Elemen;
  align?: 'start' | 'center' | 'end' | 'stretch';
}
/** Kisi responsif: `min` untuk kolom otomatis, atau `cols` untuk jumlah tetap. */
export function Grid({ min, cols, gap = 4, as: As = 'div', align, className, style, ...props }: GridProps) {
  return (
    <As
      className={cn('u-grid', className)}
      data-cols={cols}
      style={{ gap: jarak(gap), alignItems: align, ...(min ? { gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))` } : {}), ...style }}
      {...props}
    />
  );
}

// ================================================================ Split (konten + sisi)
export interface SplitProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  /** Isi kolom sisi (sidebar, ringkasan, kontak). */
  aside: React.ReactNode;
  children: React.ReactNode;
  /** Letak sisi; bawaan kanan. */
  side?: 'start' | 'end';
  /** Lebar sisi di layar lebar (px). */
  asideWidth?: number;
  /** Sisi menempel saat digulir. */
  sticky?: boolean;
  /** Di ponsel sisi tampil lebih dulu. */
  asideFirst?: boolean;
  gap?: Jarak;
  /** Lebar wadah (px) saat dua kolom mulai dipakai. Bawaan 960. */
  breakpoint?: 768 | 960 | 1100;
}
/** Dua kolom: konten utama + sisi selebar tetap; satu kolom di layar sempit. */
export function Split({ aside, children, side = 'end', asideWidth = 320, sticky, asideFirst, gap = 8, breakpoint = 960, className, style, ...props }: SplitProps) {
  return (
    <div
      className={cn('u-split', className)}
      data-side={side}
      data-bp={breakpoint}
      data-aside-first={dataFlag(asideFirst)}
      style={{ '--split-aside': `${asideWidth}px`, gap: jarak(gap), ...style } as React.CSSProperties}
      {...props}
    >
      <div className="u-split-main">{children}</div>
      <aside className="u-split-aside" data-sticky={dataFlag(sticky)}>
        {aside}
      </aside>
    </div>
  );
}

// ================================================================ Kepala halaman
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Tombol di kanan judul. */
  actions?: React.ReactNode;
  /** Lencana di samping judul. */
  badge?: React.ReactNode;
  /** Tautan kembali; berupa elemen (mis. <Link>) atau fungsi klik. */
  back?: React.ReactElement | (() => void);
  backLabel?: string;
  /** Remah roti di atas judul. */
  breadcrumb?: React.ReactNode;
  /** Ikon fitur di kiri judul (petak berwarna lembut), mis. <ClipboardCheck />. */
  icon?: React.ReactNode;
}
/** Judul halaman aplikasi: remah roti/kembali, eyebrow, judul + lencana, deskripsi, dan aksi. */
export function PageHeader({ title, description, eyebrow, actions, badge, back, backLabel = 'Kembali', breadcrumb, icon, className, ...props }: PageHeaderProps) {
  const tombolKembali =
    typeof back === 'function' ? (
      <button type="button" className="u-page-back" onClick={back}>
        <ArrowLeft aria-hidden /> {backLabel}
      </button>
    ) : back ? (
      React.cloneElement(back as React.ReactElement<{ className?: string; children?: React.ReactNode }>, {
        className: cn('u-page-back', (back.props as { className?: string }).className),
        children: (
          <>
            <ArrowLeft aria-hidden /> {(back.props as { children?: React.ReactNode }).children ?? backLabel}
          </>
        ),
      })
    ) : null;
  const teks = (
    <div className="u-page-header-text">
      {eyebrow && <p className="u-page-eyebrow">{eyebrow}</p>}
      <h1 className="u-page-title">
        {title}
        {badge && <span className="u-page-badge">{badge}</span>}
      </h1>
      {description && <p className="u-page-desc">{description}</p>}
    </div>
  );
  return (
    <header className={cn('u-page-header', className)} data-icon={dataFlag(Boolean(icon))} {...props}>
      {(breadcrumb || tombolKembali) && <div className="u-page-header-top">{breadcrumb ?? tombolKembali}</div>}
      <div className="u-page-header-row">
        {icon ? (
          <div className="u-page-header-lead">
            <span className="u-page-icon" aria-hidden>
              {icon}
            </span>
            {teks}
          </div>
        ) : (
          teks
        )}
        {actions && <div className="u-page-actions">{actions}</div>}
      </div>
    </header>
  );
}

// ================================================================ Teks
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'p' | 'span' | 'div' | 'small' | 'strong' | 'label';
  size?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl';
  tone?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  /** Angka sama lebar (nominal, jam). */
  numeric?: boolean;
  /** Potong satu baris dengan elipsis. */
  truncate?: boolean;
  mono?: boolean;
}
/** Teks dengan ukuran, warna, dan tebal dari token, tanpa CSS sendiri. */
export function Text({ as: As = 'p', size, tone, weight, numeric, truncate, mono, className, ...props }: TextProps) {
  return <As className={cn('u-text', className)} data-size={size} data-tone={tone} data-weight={weight} data-numeric={dataFlag(numeric)} data-truncate={dataFlag(truncate)} data-mono={dataFlag(mono)} {...props} />;
}

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Ukuran tampilan, terpisah dari tingkat semantik. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}
/** Judul dengan huruf heading tema. */
export function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const As = `h${level}` as 'h2';
  return <As className={cn('u-heading', className)} data-size={size ?? (['3xl', '2xl', 'xl', 'lg', 'md', 'sm'] as const)[level - 1]} {...props} />;
}

// ================================================================ HTML dari API
/**
 * Isi HTML dari API (pengumuman, FAQ, soal, deskripsi jalur) yang disaring dulu dengan aturan yang sama dengan
 * HtmlSanitizer SIAKAD, lalu diberi gaya prosa `ub-konten`.
 */
export function KontenHtml({ html, className, compact }: { html?: string | null; className?: string; compact?: boolean }) {
  const bersih = React.useMemo(() => (html ? saringHtml(html) : ''), [html]);
  if (!bersih) return null;
  return <div className={cn('ub-konten u-konten-html', className)} data-compact={dataFlag(compact)} dangerouslySetInnerHTML={{ __html: bersih }} />;
}

/** Ubah HTML ringan menjadi teks polos (cuplikan kartu, meta). */
export function teksPolos(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<(br|\/p|\/li|\/h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
