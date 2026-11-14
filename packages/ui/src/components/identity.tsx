'use client';
import * as React from 'react';
import { cn } from '../lib/cn';

// ================================================================ Tanda (mark) UNIPO
export type MarkShape = 'square' | 'circle' | 'shield' | 'plain';
export type LogoTone = 'brand' | 'mono' | 'inverse';

export interface UnipoMarkProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  size?: number;
  shape?: MarkShape;
  tone?: LogoTone;
  /** Warna dasar; bawaan var(--u-primary). */
  color?: string;
  /** Warna aksen (palang atas); bawaan var(--u-secondary). */
  accent?: string;
  /** Glyph pengganti "U" (mis. ikon aplikasi). Koordinat 0–32. */
  glyph?: React.ReactNode;
  title?: string;
}

/**
 * Tanda grafis UNIPO: huruf U bergaya toga (palang emas di atas).
 * Sepenuhnya vektor dan mengikuti tema (--u-primary / --u-secondary). Ganti dengan logo resmi lewat <AppLogo src="…" />.
 */
export function UnipoMark({ size = 32, shape = 'square', tone = 'brand', color, accent, glyph, title = 'UNIPO', ...props }: UnipoMarkProps) {
  const bg = tone === 'inverse' ? '#fff' : tone === 'mono' ? 'currentColor' : (color ?? 'var(--u-primary)');
  const fg = tone === 'inverse' ? (color ?? 'var(--u-primary)') : tone === 'mono' ? 'var(--u-background, #fff)' : '#fff';
  const acc = tone === 'brand' ? (accent ?? 'var(--u-secondary)') : fg;
  const plain = shape === 'plain';
  const stroke = plain ? bg : fg;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title} {...props}>
      {shape === 'square' && <rect width="32" height="32" rx="8.5" fill={bg} />}
      {shape === 'circle' && <circle cx="16" cy="16" r="16" fill={bg} />}
      {shape === 'shield' && <path d="M16 1.5 29 5.6v10.2c0 7.6-5.3 12.6-13 14.7C8.3 28.4 3 23.4 3 15.8V5.6Z" fill={bg} />}
      {shape !== 'plain' && shape !== 'shield' && <path d="M0 8.5A8.5 8.5 0 0 1 8.5 0h15A8.5 8.5 0 0 1 32 8.5V11C21 9 11 9 0 13Z" fill="#fff" fillOpacity={tone === 'brand' ? 0.08 : 0} />}
      {glyph ?? (
        <>
          <path d="M9.5 9.5h13" stroke={acc} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M10.5 13.2v4.6a5.5 5.5 0 0 0 11 0v-4.6" stroke={stroke} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
    </svg>
  );
}

// ================================================================ Logo aplikasi
export interface AppLogoProps extends Omit<React.ComponentProps<'span'>, 'title'> {
  /** Nama utama, mis. "SIAKAD" atau "UNIPO". */
  name?: React.ReactNode;
  /** Baris kedua kecil, mis. "Universitas Pohuwato". */
  tagline?: React.ReactNode;
  /** Logo resmi (gambar). Bila diisi, menggantikan UnipoMark. */
  src?: string;
  /** horizontal (bawaan), stacked (tanda di atas), mark (tanda saja), wordmark (teks saja). */
  layout?: 'horizontal' | 'stacked' | 'mark' | 'wordmark';
  shape?: MarkShape;
  tone?: LogoTone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Warna tanda khusus aplikasi (mis. PMB oranye, LMS hijau). */
  color?: string;
  glyph?: React.ReactNode;
}

const MARK_SIZE = { sm: 24, md: 32, lg: 40, xl: 56 };

/** Logo aplikasi UNIPO dengan banyak varian: tata letak, bentuk, nada warna, ukuran. */
export function AppLogo({ name = 'UNIPO', tagline, src, layout = 'horizontal', shape = 'square', tone = 'brand', size = 'md', color, glyph, className, ...props }: AppLogoProps) {
  const px = MARK_SIZE[size];
  const mark = src ? (
    <img src={src} alt="" width={px} height={px} style={{ objectFit: 'contain' }} />
  ) : (
    <UnipoMark size={px} shape={shape} tone={tone} color={color} glyph={glyph} title={typeof name === 'string' ? name : 'UNIPO'} />
  );
  return (
    <span className={cn('u-app-logo', className)} data-layout={layout} data-size={size} data-tone={tone} {...props}>
      {layout !== 'wordmark' && mark}
      {layout !== 'mark' && (
        <span className="u-app-logo-text">
          <span className="u-app-logo-name">{name}</span>
          {tagline && <span className="u-app-logo-tagline">{tagline}</span>}
        </span>
      )}
    </span>
  );
}

// ================================================================ Logo per aplikasi ekosistem UNIPO
const G = (d: string, extra?: React.ReactNode) => (
  <>
    <path d={d} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {extra}
  </>
);

/** Glyph khas tiap aplikasi (dalam kotak 32×32). */
export const APP_GLYPHS = {
  siakad: G('M9.5 9.5h13M10.5 13.2v4.6a5.5 5.5 0 0 0 11 0v-4.6'),
  pmb: G('M16 8.5v15M8.5 16h15', <circle cx="16" cy="16" r="10" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" fill="none" />),
  lms: G('M8 11.5 16 8l8 3.5-8 3.5Zm3.5 2v5c0 1.6 2 3 4.5 3s4.5-1.4 4.5-3v-5'),
  cbt: G('M9 9.5h14v10H9ZM13 23h6M16 19.5V23M12.5 14.5l2.2 2.2 4.3-4.3'),
  tracer: G('M8.5 22.5 13 17l3.5 3 7-8.5M19 11.5h4.5V16'),
  humas: G('M9 13.5v5l3 .5 1.5 4h2l-1-3.6L23 22V10l-11 3.5Z'),
  pustikom: G('M9 9h14v9H9ZM12.5 23h7M16 18v5'),
  sso: G('M12 15v-2.5a4 4 0 0 1 8 0V15M10.5 15h11v8h-11ZM16 18.3v1.7'),
  api: G('M12.5 10.5 8 16l4.5 5.5M19.5 10.5 24 16l-4.5 5.5M17.5 9l-3 14'),
  fakultas: G('M8 13 16 9l8 4M9.5 13v8M22.5 13v8M13 13.5v7M19 13.5v7M8 22.5h16'),
  alumni: G('M16 9a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM9.5 23a6.5 6.5 0 0 1 13 0'),
  arsip: G('M8.5 10h15v4h-15ZM9.5 14v8.5h13V14M14 17.5h4'),
} satisfies Record<string, React.ReactNode>;

export type UnipoApp = keyof typeof APP_GLYPHS;

/** Warna bawaan tiap aplikasi; bisa ditimpa lewat prop `color`. */
export const APP_COLORS: Record<UnipoApp, string> = {
  siakad: 'var(--u-primary)',
  pmb: '#d9541e',
  lms: '#0f8a6a',
  cbt: '#6d4fd1',
  tracer: '#0e7490',
  humas: '#c2416b',
  pustikom: '#1f2937',
  sso: '#244ce6',
  api: '#0f172a',
  fakultas: '#8a5a12',
  alumni: '#7c3aed',
  arsip: '#5b6b7f',
};

const APP_NAMES: Record<UnipoApp, string> = {
  siakad: 'SIAKAD',
  pmb: 'PMB',
  lms: 'E-Learning',
  cbt: 'CBT',
  tracer: 'Tracer Study',
  humas: 'Humas',
  pustikom: 'Pustikom',
  sso: 'SSO',
  api: 'API',
  fakultas: 'Fakultas',
  alumni: 'Alumni',
  arsip: 'Arsip',
};

/** Logo siap pakai untuk aplikasi di ekosistem UNIPO: <UnipoAppLogo app="pmb" />. */
export function UnipoAppLogo({ app, tagline = 'Universitas Pohuwato', ...props }: { app: UnipoApp } & Omit<AppLogoProps, 'glyph'>) {
  return <AppLogo name={APP_NAMES[app]} tagline={tagline} glyph={APP_GLYPHS[app]} color={props.color ?? APP_COLORS[app]} {...props} />;
}
