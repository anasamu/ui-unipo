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
  /**
   * horizontal (bawaan), stacked (tanda di tengah, teks di bawah), mark (tanda saja), wordmark (teks saja),
   * full (gambar logo utuh apa adanya, tanpa teks; tanpa `src` sama dengan horizontal).
   */
  layout?: 'horizontal' | 'stacked' | 'mark' | 'wordmark' | 'full';
  shape?: MarkShape;
  tone?: LogoTone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Warna tanda khusus aplikasi (mis. PMB oranye, LMS hijau). Untuk logo gambar: warna pelat di belakang gambar. */
  color?: string;
  glyph?: React.ReactNode;
  /**
   * Cara gambar `src` mengisi bentuk: cover (memenuhi bentuk, bawaan tanpa `color`) atau contain (utuh dengan jarak,
   * bawaan bila `color` diisi, cocok untuk logo PNG transparan).
   */
  fit?: 'cover' | 'contain';
  /** Dipanggil bila gambar `src` gagal dimuat. */
  onSrcError?: () => void;
}

const MARK_SIZE = { sm: 24, md: 32, lg: 40, xl: 56 };

/** Logo aplikasi UNIPO dengan banyak varian: tata letak, bentuk, nada warna, ukuran. */
export function AppLogo({ name = 'UNIPO', tagline, src, layout = 'horizontal', shape = 'square', tone = 'brand', size = 'md', color, glyph, fit, onSrcError, className, ...props }: AppLogoProps) {
  const px = MARK_SIZE[size];
  const judul = typeof name === 'string' ? name : 'UNIPO';
  const tata = layout === 'full' && !src ? 'horizontal' : layout;
  if (layout === 'full' && src) {
    return (
      <span className={cn('u-app-logo', className)} data-layout="full" data-size={size} data-tone={tone} {...props}>
        <img className="u-app-logo-full" src={src} alt={judul} height={px} onError={onSrcError} />
      </span>
    );
  }
  const mark = src ? (
    <LogoGambar src={src} size={px} shape={shape} tone={tone} color={color} fit={fit} title={judul} onGagal={onSrcError} />
  ) : (
    <UnipoMark size={px} shape={shape} tone={tone} color={color} glyph={glyph} title={judul} />
  );
  return (
    <span className={cn('u-app-logo', className)} data-layout={tata} data-size={size} data-tone={tone} {...props}>
      {tata !== 'wordmark' && mark}
      {tata !== 'mark' && (
        <span className="u-app-logo-text">
          <span className="u-app-logo-name">{name}</span>
          {tagline && <span className="u-app-logo-tagline">{tagline}</span>}
        </span>
      )}
    </span>
  );
}

// ================================================================ Logo gambar dalam bentuk tanda
export interface LogoGambarProps extends Omit<React.ComponentProps<'span'>, 'title'> {
  src: string;
  size?: number;
  shape?: MarkShape;
  tone?: LogoTone;
  /** Warna pelat di belakang gambar. */
  color?: string;
  fit?: 'cover' | 'contain';
  title?: string;
  /** Dipanggil bila gambar gagal dimuat (mis. untuk beralih ke logo cadangan). */
  onGagal?: () => void;
}

/**
 * Logo unggahan (PNG/JPG/WebP) yang dipotong mengikuti bentuk tanda UNIPO: square, circle, shield, atau plain.
 * tone mono membuat gambar abu-abu, inverse memberi pelat putih untuk latar gelap.
 */
export function LogoGambar({ src, size = 32, shape = 'square', tone = 'brand', color, fit, title, onGagal, className, style, ...props }: LogoGambarProps) {
  const cara = fit ?? (color || tone === 'inverse' ? 'contain' : 'cover');
  return (
    <span
      className={cn('u-logo-gambar', className)}
      data-shape={shape}
      data-tone={tone}
      data-fit={cara}
      role="img"
      aria-label={title}
      style={{ width: size, height: size, ...(color ? { ['--u-logo-pelat' as string]: color } : {}), ...style }}
      {...props}
    >
      <img src={src} alt="" width={size} height={size} draggable={false} onError={onGagal} />
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

// ================================================================ Logo aplikasi terdaftar (Pustikom)
const WARNA_INISIAL = ['#244ce6', '#0f8a6a', '#d9541e', '#6d4fd1', '#0e7490', '#c2416b', '#8a5a12', '#5b6b7f'];

/** Inisial nama aplikasi sebagai glyph tanda (koordinat 0–32), untuk aplikasi tanpa logo dan tanpa glyph bawaan. */
export function glyphInisial(nama: string): React.ReactNode {
  const kata = nama
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const teks = (kata.length > 1 ? kata[0]![0]! + kata[1]![0]! : (kata[0] ?? '?').slice(0, 2)).toUpperCase();
  return (
    <text
      x="16"
      y="16.5"
      textAnchor="middle"
      dominantBaseline="central"
      fill="#fff"
      fontSize={teks.length > 1 ? 12.5 : 15}
      fontWeight={800}
      fontFamily="var(--u-font-heading, inherit)"
      letterSpacing="-0.02em"
    >
      {teks}
    </text>
  );
}

/** Warna tetap dari kode aplikasi, agar aplikasi tanpa logo tetap punya warna yang konsisten. */
export function warnaAplikasi(kode: string): string {
  if (kode in APP_COLORS) return APP_COLORS[kode as UnipoApp];
  let h = 0;
  for (const c of kode) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return WARNA_INISIAL[h % WARNA_INISIAL.length]!;
}

/** Alamat logo publik klien SSO (sso.unipo.ac.id/logos/<client_id>.png|webp|jpg), urut dari yang paling mungkin. */
export function urlLogoSso(kode: string, ssoUrl = 'https://sso.unipo.ac.id'): string[] {
  const id = kode.toLowerCase().replace(/-/g, '_');
  if (!/^[a-z0-9_]{3,64}$/.test(id)) return [];
  const dasar = ssoUrl.replace(/\/+$/, '');
  return ['png', 'webp', 'jpg'].map((x) => `${dasar}/logos/${id}.${x}`);
}

const cacheLogo = new Map<string, string | null>();

/** Muat calon logo satu per satu dan kembalikan yang pertama berhasil (null bila tidak ada). Hasil disimpan per sesi. */
export function useLogoTersedia(calon: Array<string | null | undefined>): { src: string | null; memuat: boolean } {
  const daftar = calon.filter((x): x is string => !!x);
  const kunci = daftar.join('|');
  const [hasil, setHasil] = React.useState<{ kunci: string; src: string | null } | null>(() => (cacheLogo.has(kunci) ? { kunci, src: cacheLogo.get(kunci)! } : null));
  React.useEffect(() => {
    if (cacheLogo.has(kunci)) {
      setHasil({ kunci, src: cacheLogo.get(kunci)! });
      return;
    }
    if (!daftar.length || typeof Image === 'undefined') {
      setHasil({ kunci, src: null });
      return;
    }
    let batal = false;
    const coba = (i: number) => {
      if (batal) return;
      if (i >= daftar.length) {
        cacheLogo.set(kunci, null);
        setHasil({ kunci, src: null });
        return;
      }
      const img = new Image();
      img.onload = () => {
        if (batal) return;
        cacheLogo.set(kunci, daftar[i]!);
        setHasil({ kunci, src: daftar[i]! });
      };
      img.onerror = () => coba(i + 1);
      img.src = daftar[i]!;
    };
    coba(0);
    return () => {
      batal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci]);
  const ok = hasil?.kunci === kunci;
  return { src: ok ? hasil!.src : null, memuat: !ok };
}

export interface LogoAplikasiProps extends Omit<AppLogoProps, 'glyph' | 'name' | 'src'> {
  /** Kode aplikasi yang terdaftar di Pustikom (katalog RBAC / client ID SSO), mis. "pmb" atau "kuliahku". */
  kode: string;
  /** Nama tampilan. Bawaan: nama aplikasi bawaan UNIPO atau kode. */
  name?: React.ReactNode;
  /** Logo yang sudah diketahui, mis. `aplikasi.logo` dari useAplikasiTerpadu(). Dicoba lebih dulu. */
  src?: string | null;
  /**
   * Alamat SSO untuk mengambil logo publik klien (`/logos/<client_id>.png`). Bawaan https://sso.unipo.ac.id;
   * isi null agar hanya memakai `src`.
   */
  ssoUrl?: string | null;
}

/**
 * Logo aplikasi yang terdaftar di Pustikom: bila aplikasinya punya logo unggahan (klien SSO / klien API), logo itu
 * dipakai, dipotong mengikuti `shape` dan `tone` yang sama dengan logo vektor. Bila belum ada logo, dipakai glyph
 * bawaan aplikasi UNIPO, atau inisial nama dengan warna tetap. Semua `layout` AppLogo berlaku, termasuk `full`.
 */
export function LogoAplikasi({ kode, name, src, ssoUrl = 'https://sso.unipo.ac.id', tagline = 'Universitas Pohuwato', color, ...props }: LogoAplikasiProps) {
  const calon = React.useMemo(() => [src, ...(ssoUrl ? urlLogoSso(kode, ssoUrl) : [])], [src, kode, ssoUrl]);
  const logo = useLogoTersedia(calon);
  const bawaan = (kode.toLowerCase() in APP_GLYPHS ? kode.toLowerCase() : null) as UnipoApp | null;
  const nama = name ?? (bawaan ? APP_NAMES[bawaan] : kode);
  if (logo.src) return <AppLogo name={nama} tagline={tagline} src={logo.src} color={color} {...props} />;
  const glyph = bawaan ? APP_GLYPHS[bawaan] : glyphInisial(typeof nama === 'string' ? nama : kode);
  const layout = props.layout === 'full' ? 'horizontal' : props.layout;
  return <AppLogo name={nama} tagline={tagline} glyph={glyph} color={color ?? warnaAplikasi(kode.toLowerCase())} {...props} layout={layout} data-memuat={logo.memuat || undefined} />;
}
