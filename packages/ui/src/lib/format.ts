const LOCALE = 'id-ID';

/** Inisial dari nama, mis. "Siti Nurhaliza Putri" -> "SN". Gelar dan kata sambung diabaikan. */
export function initials(name: string | null | undefined, max = 2): string {
  if (!name) return '?';
  const words = name
    .replace(/,.*$/, '')
    .replace(/\b(dr|drs|dra|ir|prof|h|hj|s\.\w+|m\.\w+)\.?\s/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(dan|di|ke|dari|untuk|bin|binti|the|of|and)$/i.test(w));
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, max).toUpperCase();
  return words
    .slice(0, max)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Warna latar avatar/monogram yang stabil per nama (hue dari hash). */
export function hueFromString(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function formatNumber(n: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (n == null || Number.isNaN(n)) return '–';
  return new Intl.NumberFormat(LOCALE, opts).format(n);
}

export function formatCompact(n: number | null | undefined): string {
  return formatNumber(n, { notation: 'compact', maximumFractionDigits: 1 });
}

export function formatRupiah(n: number | null | undefined): string {
  return formatNumber(n, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
}

export function formatDate(d: Date | string | null | undefined, style: 'short' | 'medium' | 'long' | 'full' = 'medium'): string {
  if (!d) return '–';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: style }).format(date);
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return '–';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' }).format(date);
}

/** "3 hari lalu", "dalam 2 jam" */
export function formatRelative(d: Date | string, now: Date = new Date()): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const diff = (date.getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, sec] of units) if (Math.abs(diff) >= sec) return rtf.format(Math.round(diff / sec), unit);
  return rtf.format(Math.round(diff), 'second');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const u = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${formatNumber(v, { maximumFractionDigits: 1 })} ${u[i]}`;
}
