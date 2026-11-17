/**
 * Generator tema UNIPO UI: dari beberapa pilihan (warna, netral, sudut, huruf, ukuran teks, bayangan, gerak) menjadi
 * satu berkas CSS lengkap (mode terang + gelap) yang dimuat setelah CSS unipo-ui.
 *
 * Tanpa dependensi dan tanpa React, jadi bisa dipakai di browser, Node (CLI), maupun build. Logika yang sama ada
 * dalam PHP di portal api.unipo.ac.id (/ui/tema.css) — bila mengubah keluaran di sini, ubah juga di sana.
 *
 *   import { buatTema } from 'unipo-ui/tema';
 *   const css = buatTema({ primary: '#0f766e', netral: 'hangat', radius: 8, font: 'inter' });
 */

export type KunciNetral = 'unipo' | 'slate' | 'abu' | 'hangat' | 'zaitun';
export type KunciFont = 'jakarta' | 'inter' | 'poppins' | 'dmsans' | 'sistem' | 'serif';
export type KunciFontMono = 'jetbrains' | 'sistem';
export type Bayangan = 'tanpa' | 'halus' | 'normal' | 'tegas';
export type Gerak = 'normal' | 'cepat' | 'lambat' | 'tanpa';
/**
 * Efek bayangan: permukaan mana yang memakai bayangan. `datar` hanya garis tepi, `normal` kartu dengan bayangan tipis,
 * `terangkat` kartu + sidebar + bilah atas, `melayang` kartu lebih tinggi dan bayangan hover lebih dalam.
 * Kekuatan bayangannya sendiri diatur `bayangan`.
 */
export type Elevasi = 'datar' | 'normal' | 'terangkat' | 'melayang';

export interface OpsiTema {
  /** Warna utama: tombol, tautan, fokus, elemen aktif. */
  primary: string;
  /** Warna aksen: sorotan, lencana, grafik kedua. */
  secondary: string;
  /** Warna primer khusus mode gelap. Kosong = dihitung otomatis (lebih terang). */
  primaryGelap: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Skala abu-abu untuk latar, teks, dan garis. */
  netral: KunciNetral;
  /** Latar halaman mode terang. Kosong = putih dari skala netral. */
  latar: string;
  /** Latar halaman mode gelap. Kosong = dari skala netral. */
  latarGelap: string;
  /** Radius sudut dasar dalam px (0 = siku). Ukuran lain mengikuti. */
  radius: number;
  font: KunciFont;
  /** Huruf judul; 'sama' = sama dengan huruf isi. */
  fontJudul: KunciFont | 'sama';
  fontMono: KunciFontMono;
  /** Ukuran teks isi dalam px; seluruh skala teks ikut diskalakan. */
  teks: number;
  bayangan: Bayangan;
  /** Permukaan yang memakai bayangan (kartu, panel, sidebar, bilah atas). */
  elevasi: Elevasi;
  gerak: Gerak;
  /** Tambahkan @import Google Fonts untuk huruf yang dipilih. */
  muatFont: boolean;
}

export const TEMA_BAWAAN: OpsiTema = {
  primary: '#244ce6',
  secondary: '#f2b42a',
  primaryGelap: '',
  success: '#15803d',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#0284c7',
  netral: 'unipo',
  latar: '',
  latarGelap: '',
  radius: 10,
  font: 'jakarta',
  fontJudul: 'sama',
  fontMono: 'jetbrains',
  teks: 14,
  bayangan: 'normal',
  elevasi: 'normal',
  gerak: 'normal',
  muatFont: false,
};

/** Versi mode gelap untuk warna bawaan (persis seperti token). Warna lain dihitung dengan color-mix. */
const GELAP_BAWAAN: Record<string, string> = {
  '#244ce6': '#3a69f2',
  '#f2b42a': '#f2b42a',
  '#15803d': '#16a34a',
  '#d97706': '#f59e0b',
  '#dc2626': '#ef4444',
  '#0284c7': '#0ea5e9',
};

/** Skala netral 0, 50, 100, ..., 950. */
export const NETRAL: Record<KunciNetral, { label: string; skala: string[] }> = {
  unipo: { label: 'UNIPO (abu kebiruan)', skala: ['#ffffff', '#f7f8fa', '#eff1f4', '#e2e5ea', '#c9ced6', '#9aa2ae', '#6b7482', '#4f5866', '#3c4350', '#262b34', '#171a21', '#0d0f14'] },
  slate: { label: 'Slate (biru dingin)', skala: ['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'] },
  abu: { label: 'Abu murni', skala: ['#ffffff', '#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'] },
  hangat: { label: 'Hangat (batu)', skala: ['#ffffff', '#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09'] },
  zaitun: { label: 'Zaitun (abu kehijauan)', skala: ['#ffffff', '#f8f9f7', '#f1f3ef', '#e3e7df', '#c9cfc3', '#9ba395', '#6c7566', '#50584b', '#3d4339', '#272b24', '#181b16', '#0d0f0b'] },
};
const LANGKAH_NETRAL = ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

export const FONT: Record<KunciFont, { label: string; css: string; google?: string }> = {
  jakarta: { label: 'Plus Jakarta Sans', css: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', google: 'Plus+Jakarta+Sans:wght@400..800' },
  inter: { label: 'Inter', css: '"Inter Variable", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', google: 'Inter:wght@400..700' },
  poppins: { label: 'Poppins', css: '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', google: 'Poppins:wght@400;500;600;700' },
  dmsans: { label: 'DM Sans', css: '"DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif', google: 'DM+Sans:wght@400..700' },
  sistem: { label: 'Huruf sistem', css: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' },
  serif: { label: 'Serif (Source Serif)', css: '"Source Serif 4", Georgia, "Times New Roman", serif', google: 'Source+Serif+4:wght@400..700' },
};
export const FONT_MONO: Record<KunciFontMono, { label: string; css: string; google?: string }> = {
  jetbrains: { label: 'JetBrains Mono', css: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', google: 'JetBrains+Mono:wght@400..600' },
  sistem: { label: 'Monospace sistem', css: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
};

/** Skala teks (px pada ukuran isi 14 px). */
const TEKS: Array<[string, number]> = [
  ['xs', 12], ['sm', 13], ['base', 14], ['md', 15], ['lg', 17], ['xl', 20], ['2xl', 24], ['3xl', 30], ['4xl', 38], ['5xl', 48], ['6xl', 60],
];
/** Radius turunan sebagai kelipatan radius dasar. */
const RADIUS: Array<[string, number]> = [['sm', 0.6], ['md', 0.8], ['lg', 1], ['xl', 1.4], ['2xl', 2]];

type Lapis = Array<[number, number, number, number, number]>;
const BAYANGAN_TERANG: Array<[string, Lapis]> = [
  ['xs', [[0, 1, 2, 0, 0.05]]],
  ['sm', [[0, 1, 2, 0, 0.04], [0, 1, 3, 0, 0.06]]],
  ['md', [[0, 2, 4, -1, 0.05], [0, 6, 14, -4, 0.08]]],
  ['lg', [[0, 4, 8, -2, 0.05], [0, 16, 32, -8, 0.14]]],
  ['xl', [[0, 8, 16, -4, 0.06], [0, 28, 56, -12, 0.22]]],
];
const BAYANGAN_GELAP: Array<[string, Lapis]> = [
  ['xs', [[0, 1, 2, 0, 0.3]]],
  ['sm', [[0, 1, 2, 0, 0.3], [0, 1, 3, 0, 0.25]]],
  ['md', [[0, 2, 4, -1, 0.35], [0, 6, 14, -4, 0.4]]],
  ['lg', [[0, 4, 8, -2, 0.4], [0, 16, 32, -8, 0.5]]],
  ['xl', [[0, 8, 16, -4, 0.4], [0, 28, 56, -12, 0.6]]],
];
const KALI_BAYANGAN: Record<Bayangan, number> = { tanpa: 0, halus: 0.6, normal: 1, tegas: 1.6 };
/** Efek bayangan → [kartu, kartu saat hover, sidebar & bilah atas]. */
const ELEVASI: Record<Elevasi, [string, string, string]> = {
  datar: ['none', 'none', 'none'],
  normal: ['var(--u-shadow-xs)', 'var(--u-shadow-md)', 'none'],
  terangkat: ['var(--u-shadow-sm)', 'var(--u-shadow-lg)', 'var(--u-shadow-sm)'],
  melayang: ['var(--u-shadow-md)', 'var(--u-shadow-xl)', 'var(--u-shadow-md)'],
};
export const PILIHAN_ELEVASI: Array<{ value: Elevasi; label: string; keterangan: string }> = [
  { value: 'datar', label: 'Datar', keterangan: 'Hanya garis tepi, tanpa bayangan' },
  { value: 'normal', label: 'Normal', keterangan: 'Kartu dengan bayangan tipis' },
  { value: 'terangkat', label: 'Terangkat', keterangan: 'Kartu, sidebar, dan bilah atas berbayang' },
  { value: 'melayang', label: 'Melayang', keterangan: 'Bayangan lebih tinggi, hover lebih dalam' },
];
const GERAK: Record<Gerak, [number, number, number]> = { normal: [120, 180, 260], cepat: [80, 120, 170], lambat: [180, 260, 380], tanpa: [0, 0, 0] };

/** Tema siap pakai sebagai titik awal. */
export const PRESET_TEMA: Array<{ nama: string; opsi: Partial<OpsiTema> }> = [
  { nama: 'UNIPO', opsi: {} },
  { nama: 'Toska', opsi: { primary: '#0f766e', secondary: '#f59e0b', netral: 'slate', radius: 8, font: 'inter' } },
  { nama: 'Marun', opsi: { primary: '#9f1d35', secondary: '#d4a017', netral: 'hangat', radius: 6, fontJudul: 'serif' } },
  { nama: 'Hutan', opsi: { primary: '#15803d', secondary: '#ca8a04', netral: 'zaitun', radius: 12, font: 'dmsans' } },
  { nama: 'Ungu', opsi: { primary: '#6d28d9', secondary: '#ec4899', netral: 'slate', radius: 14, font: 'poppins', bayangan: 'halus' } },
  { nama: 'Grafit', opsi: { primary: '#334155', secondary: '#0ea5e9', netral: 'abu', radius: 4, font: 'sistem', bayangan: 'halus', elevasi: 'datar', gerak: 'cepat' } },
  { nama: 'Samudra', opsi: { primary: '#0369a1', secondary: '#14b8a6', netral: 'slate', radius: 10, font: 'inter', bayangan: 'tegas', elevasi: 'terangkat' } },
];

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Hex dinormalisasi ke #rrggbb huruf kecil; '' bila tidak valid. */
export function hexValid(v: unknown): string {
  if (typeof v !== 'string') return '';
  const m = HEX.exec(v.trim());
  if (!m) return '';
  let h = m[1]!.toLowerCase();
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return `#${h}`;
}

/** Luminans relatif (WCAG) dari #rrggbb. */
function luminans(hex: string): number {
  const k = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * k[0]! + 0.7152 * k[1]! + 0.0722 * k[2]!;
}

/** Warna teks di atas warna latar: putih untuk latar gelap, warna latar yang sangat digelapkan untuk latar terang. */
function teksDiAtas(hex: string): string {
  return luminans(hex) > 0.36 ? `color-mix(in oklab, ${hex} 18%, black)` : '#ffffff';
}

function gelapDari(hex: string, persen = 88): string {
  return GELAP_BAWAAN[hex] ?? `color-mix(in oklab, ${hex} ${persen}%, white)`;
}

const bulat = (n: number, d = 4) => String(Math.round(n * 10 ** d) / 10 ** d);
const rem = (px: number) => (px === 0 ? '0' : `${bulat(px / 16)}rem`);

function bayangan(l: Lapis, kali: number, warna: string): string {
  if (kali === 0) return 'none';
  return l.map(([x, y, b, s, a]) => `${x} ${y}px ${b}px${s ? ` ${s}px` : ''} rgb(${warna} / ${bulat(Math.min(1, a * kali), 3)})`).join(', ');
}

/** Lengkapi dan bersihkan opsi: nilai tidak valid diganti bawaan. */
export function normalisasiTema(o: Partial<OpsiTema> = {}): OpsiTema {
  const b = TEMA_BAWAAN;
  const warna = (v: unknown, d: string) => hexValid(v) || d;
  const pilih = <T extends string>(v: unknown, daftar: readonly T[], d: T): T => (daftar.includes(v as T) ? (v as T) : d);
  const angka = (v: unknown, min: number, max: number, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== '' && v !== null ? Math.min(max, Math.max(min, Math.round(n))) : d;
  };
  const fonts = Object.keys(FONT) as KunciFont[];
  return {
    primary: warna(o.primary, b.primary),
    secondary: warna(o.secondary, b.secondary),
    primaryGelap: hexValid(o.primaryGelap),
    success: warna(o.success, b.success),
    warning: warna(o.warning, b.warning),
    danger: warna(o.danger, b.danger),
    info: warna(o.info, b.info),
    netral: pilih(o.netral, Object.keys(NETRAL) as KunciNetral[], b.netral),
    latar: hexValid(o.latar),
    latarGelap: hexValid(o.latarGelap),
    radius: angka(o.radius, 0, 28, b.radius),
    font: pilih(o.font, fonts, b.font),
    fontJudul: pilih(o.fontJudul, [...fonts, 'sama'] as const, b.fontJudul),
    fontMono: pilih(o.fontMono, Object.keys(FONT_MONO) as KunciFontMono[], b.fontMono),
    teks: angka(o.teks, 12, 18, b.teks),
    bayangan: pilih(o.bayangan, ['tanpa', 'halus', 'normal', 'tegas'] as const, b.bayangan),
    elevasi: pilih(o.elevasi, ['datar', 'normal', 'terangkat', 'melayang'] as const, b.elevasi),
    gerak: pilih(o.gerak, ['normal', 'cepat', 'lambat', 'tanpa'] as const, b.gerak),
    muatFont: o.muatFont === true || (o.muatFont as unknown) === '1' || (o.muatFont as unknown) === 'true',
  };
}

/** URL Google Fonts untuk huruf yang dipilih ('' bila tidak perlu). */
export function urlGoogleFont(o: Partial<OpsiTema>): string {
  const t = normalisasiTema(o);
  const kel = new Set<string>();
  for (const f of [FONT[t.font], t.fontJudul === 'sama' ? undefined : FONT[t.fontJudul], FONT_MONO[t.fontMono]]) if (f?.google) kel.add(f.google);
  return kel.size ? `https://fonts.googleapis.com/css2?${[...kel].map((k) => `family=${k}`).join('&')}&display=swap` : '';
}

/** CSS tema lengkap (mode terang + gelap). Muat setelah CSS unipo-ui. */
export function buatTema(opsi: Partial<OpsiTema> = {}): string {
  const t = normalisasiTema(opsi);
  const n = NETRAL[t.netral].skala;
  const nv = (langkah: string) => n[LANGKAH_NETRAL.indexOf(langkah)]!;
  const fTeks = t.teks / 14;
  const kali = KALI_BAYANGAN[t.bayangan];
  const [elKartu, elHover, elBilah] = ELEVASI[t.elevasi];
  const [cepat, dasar, lambat] = GERAK[t.gerak];
  const fontIsi = FONT[t.font].css;
  const fontJudul = t.fontJudul === 'sama' ? fontIsi : FONT[t.fontJudul].css;
  const pGelap = t.primaryGelap || gelapDari(t.primary);
  const sGelap = gelapDari(t.secondary, 92);

  const terang: Array<string | [string, string]> = [
    '/* Warna merek */',
    ['primary', t.primary],
    ['primary-foreground', teksDiAtas(t.primary)],
    ['secondary', t.secondary],
    ['secondary-foreground', teksDiAtas(t.secondary)],
    '/* Warna status */',
    ['success', t.success],
    ['warning', t.warning],
    ['danger', t.danger],
    ['info', t.info],
    '/* Latar, teks, dan garis */',
    ['background', t.latar || nv('0')],
    ['foreground', nv('900')],
    ['surface', t.latar ? `color-mix(in oklab, ${t.latar} 97%, ${nv('900')})` : nv('50')],
    ['muted', nv('100')],
    ['muted-foreground', nv('500')],
    ['border', nv('200')],
    ['input', nv('300')],
    ...LANGKAH_NETRAL.map((l) => [`neutral-${l}`, nv(l)] as [string, string]),
    '/* Grafik */',
    ['chart-1', t.primary],
    ['chart-2', t.secondary],
    '/* Sudut */',
    ['radius-base', rem(t.radius)],
    ['radius', rem(t.radius)],
    ...RADIUS.map(([k, x]) => [`radius-${k}`, rem(Math.round(t.radius * x))] as [string, string]),
    '/* Huruf */',
    ['font-sans', fontIsi],
    ['font-heading', fontJudul],
    ['font-mono', FONT_MONO[t.fontMono].css],
    '/* Ukuran teks */',
    ...TEKS.map(([k, px]) => [`text-${k}`, rem(Math.round(px * fTeks * 2) / 2)] as [string, string]),
    '/* Bayangan */',
    ...BAYANGAN_TERANG.map(([k, l]) => [`shadow-${k}`, bayangan(l, kali, '16 24 40')] as [string, string]),
    '/* Efek bayangan (elevasi) */',
    ['elevation-card', elKartu],
    ['elevation-card-hover', elHover],
    ['elevation-bar', elBilah],
    '/* Gerak */',
    ['duration-fast', `${cepat}ms`],
    ['duration-base', `${dasar}ms`],
    ['duration-slow', `${lambat}ms`],
  ];
  const gelap: Array<string | [string, string]> = [
    ['primary', pGelap],
    ['primary-foreground', teksDiAtas(t.primary)],
    ['secondary', sGelap],
    ['secondary-foreground', teksDiAtas(t.secondary)],
    ['success', gelapDari(t.success, 85)],
    ['warning', gelapDari(t.warning, 85)],
    ['danger', gelapDari(t.danger, 85)],
    ['info', gelapDari(t.info, 85)],
    ['background', t.latarGelap || nv('950')],
    ['foreground', nv('50')],
    ['surface', t.latarGelap ? `color-mix(in oklab, ${t.latarGelap} 94%, ${nv('50')})` : nv('900')],
    ['muted', nv('800')],
    ['muted-foreground', nv('400')],
    ['border', nv('800')],
    ['input', nv('700')],
    ['chart-1', pGelap],
    ...BAYANGAN_GELAP.map(([k, l]) => [`shadow-${k}`, bayangan(l, kali, '0 0 0')] as [string, string]),
  ];
  const blok = (sel: string, isi: Array<string | [string, string]>) =>
    `${sel} {\n${isi.map((x) => (typeof x === 'string' ? `  ${x}` : `  --u-${x[0]}: ${x[1]};`)).join('\n')}\n}`;
  const font = t.muatFont ? urlGoogleFont(t) : '';
  return [
    '/* Tema UNIPO UI. Muat setelah CSS unipo-ui. Atur ulang di https://api.unipo.ac.id/docs/tema */',
    ...(font ? [`@import url('${font}');`] : []),
    '',
    blok(':root,\n.u-theme', terang),
    '',
    '/* Mode gelap: kelas .dark atau atribut data-theme="dark" di <html> */',
    blok(".dark,\n[data-theme='dark']", gelap),
    '',
  ].join('\n');
}

/** Opsi yang berbeda dari bawaan, sebagai query string (untuk tautan impor dan berbagi). */
export function paramTema(opsi: Partial<OpsiTema>): string {
  const t = normalisasiTema(opsi);
  const q = new URLSearchParams();
  for (const k of Object.keys(TEMA_BAWAAN) as Array<keyof OpsiTema>) {
    const v = t[k];
    if (v === TEMA_BAWAAN[k]) continue;
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : typeof v === 'string' && v.startsWith('#') ? v.slice(1) : String(v));
  }
  return q.toString();
}

/** Kebalikan paramTema: query string atau URLSearchParams menjadi opsi lengkap. */
export function opsiDariParam(q: string | URLSearchParams): OpsiTema {
  const p = typeof q === 'string' ? new URLSearchParams(q.replace(/^\?/, '')) : q;
  return normalisasiTema(Object.fromEntries(p.entries()) as Partial<OpsiTema>);
}

// ---------------------------------------------------------------- Tema aplikasi dari SIAKAD (/v1/tema)

/** Mode tampilan bawaan aplikasi: `pengguna` = ikuti pilihan pengunjung / sistem. */
export type ModeTampilan = 'pengguna' | 'terang' | 'gelap';

/** Jawaban GET /v1/tema/{aplikasi}: tema berlaku hasil gabungan lapis kampus → aplikasi → lingkup. */
export interface DataTemaAplikasi<Tata extends Record<string, unknown> = Record<string, unknown>> {
  aplikasi: string;
  lingkup: string;
  /** Pilihan buatTema yang berlaku (lapis bawah menimpa lapis atas). */
  tema: Partial<OpsiTema>;
  /** Tata letak milik aplikasi yang berlaku (mis. hero, navbar, mode). */
  tata: Partial<Tata> & { mode?: ModeTampilan };
  /** Isi lapis ini saja (untuk formulir pengaturan). */
  sendiri: { tema: Partial<OpsiTema>; tata: Partial<Tata> & { mode?: ModeTampilan } };
  /** Gabungan lapis di atasnya (yang dipakai bila lapis ini dikosongkan). */
  warisan: { tema: Partial<OpsiTema>; tata: Partial<Tata> & { mode?: ModeTampilan } };
  sumber: Array<{ aplikasi: string; lingkup: string; versi: number; diubah_pada: string | null }>;
  versi: number;
  diubah_oleh: string | null;
  diubah_pada: string | null;
  tersedia: boolean;
}

/** id <style> tempat tema aplikasi dipasang, dan kunci localStorage bawaan. */
export const ID_TEMA_APLIKASI = 'unipo-tema-aplikasi';
const KUNCI_MODE_PENGGUNA = 'unipo.mode';

/**
 * CSS tema untuk dipasang di aplikasi: sama dengan buatTema tetapi selektornya dipertegas (html:root, html.dark) agar
 * menang atas CSS unipo-ui apa pun urutan pemuatannya. Objek kosong = '' (bawaan unipo-ui).
 */
export function cssTemaAplikasi(opsi: Partial<OpsiTema> = {}): string {
  if (!Object.keys(opsi).length) return '';
  return buatTema({ ...opsi, muatFont: false })
    .replace(':root,\n.u-theme {', 'html:root,\nhtml .u-theme {')
    .replace(".dark,\n[data-theme='dark'] {", "html.dark,\nhtml[data-theme='dark'] {");
}

/**
 * Pasang tema ke <style id="unipo-tema-aplikasi"> + tautan Google Fonts bila perlu, perbarui meta theme-color, dan
 * (bila `kunciCache` diisi) simpan CSS-nya di localStorage agar skripAwalTema bisa memasangnya sebelum aplikasi dimuat.
 */
export function pasangTemaAplikasi(opsi: Partial<OpsiTema> = {}, { kunciCache, id = ID_TEMA_APLIKASI }: { kunciCache?: string; id?: string } = {}) {
  if (typeof document === 'undefined') return;
  const css = cssTemaAplikasi(opsi);
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
  const font = css && opsi.muatFont !== false ? urlGoogleFont(opsi) : '';
  let link = document.getElementById(`${id}-font`) as HTMLLinkElement | null;
  if (font && !link) {
    link = document.createElement('link');
    link.id = `${id}-font`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link && link.href !== font) font ? (link.href = font) : link.remove();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', normalisasiTema(opsi).primary);
  if (!kunciCache) return;
  try {
    if (css) localStorage.setItem(kunciCache, css);
    else localStorage.removeItem(kunciCache);
  } catch {
    /* penyimpanan diblokir */
  }
}

/** Terapkan terang/gelap ke <html> (kelas .dark + data-theme). `sistem` mengikuti prefers-color-scheme. */
export function terapkanModeTampilan(mode: 'terang' | 'gelap' | 'sistem') {
  if (typeof document === 'undefined') return;
  const gelap = mode === 'gelap' || (mode === 'sistem' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', gelap);
  document.documentElement.dataset.theme = gelap ? 'dark' : 'light';
}

/**
 * Mode bawaan dari tema aplikasi, dipakai hanya bila pengunjung belum memilih sendiri (pilihan pengunjung disimpan
 * aplikasi di localStorage `kunciPilihan`).
 */
export function pasangModeBawaan(mode: ModeTampilan | undefined, kunciPilihan = KUNCI_MODE_PENGGUNA) {
  if (!mode || mode === 'pengguna') return;
  try {
    if (localStorage.getItem(kunciPilihan)) return;
  } catch {
    /* */
  }
  terapkanModeTampilan(mode);
}

/**
 * Isi <script> kecil untuk index.html (sebelum CSS/JS aplikasi) yang memasang tema dari cache dan mode pilihan
 * pengunjung, agar halaman tidak berkedip saat dimuat:
 *   <script>{skripAwalTema('pmb.tema.css', 'pmb.mode')}</script>
 */
export function skripAwalTema(kunciCache: string, kunciPilihan = KUNCI_MODE_PENGGUNA, id = ID_TEMA_APLIKASI): string {
  const k = JSON.stringify;
  return `(function(){try{var d=document.documentElement,m=localStorage.getItem(${k(kunciPilihan)}),g=m==='gelap'||((m===null||m==='sistem')&&matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',g);d.dataset.theme=g?'dark':'light';var c=localStorage.getItem(${k(kunciCache)});if(c){var s=document.createElement('style');s.id=${k(id)};s.textContent=c;document.head.appendChild(s);}}catch(e){}})();`;
}

/** Gabungkan tema warisan dengan isi lapis sendiri (untuk pratinjau formulir). */
export function gabungTema(warisan: Partial<OpsiTema> = {}, sendiri: Partial<OpsiTema> = {}): Partial<OpsiTema> {
  return { ...warisan, ...sendiri };
}
