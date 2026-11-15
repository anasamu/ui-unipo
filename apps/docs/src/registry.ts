import type { ComponentType } from 'react';
import type { PlaygroundSpec } from './Playground';

export interface DemoMeta {
  title: string;
  category: string;
  description: string;
  /** Nama ekspor → judul contoh. Urutan = urutan tampil. */
  demos: Record<string, string>;
  /** Cara impor yang ditampilkan di halaman. */
  importLine?: string;
  /** Tabel props singkat. */
  props?: Array<[string, string, string]>;
  /** Catatan tambahan (markdown sederhana: paragraf). */
  notes?: string[];
  /** Lebar area contoh: 'narrow' (formulir), 'wide' (widget). */
  layout?: 'narrow' | 'normal' | 'wide' | 'full';
  order?: number;
  /** Halaman prosa: contoh dirender tanpa bingkai dan tanpa kode. */
  prose?: boolean;
  badge?: string;
  /** Pratinjau dengan panel props dan kode yang ikut berubah, tampil paling atas. */
  playground?: PlaygroundSpec;
}

export interface DocPage {
  slug: string;
  meta: DemoMeta;
  demos: Array<{ name: string; title: string; Component: ComponentType; code: string }>;
}

const mods = import.meta.glob<Record<string, unknown>>('./demos/*.tsx', { eager: true });
const raws = import.meta.glob<string>('./demos/*.tsx', { eager: true, query: '?raw', import: 'default' });

function slice(src: string, name: string): string {
  const start = src.indexOf(`export function ${name}(`);
  if (start < 0) return '';
  const rest = src.slice(start + 1);
  const next = rest.search(/\nexport (function|const) /);
  const body = next < 0 ? src.slice(start) : src.slice(start, start + 1 + next);
  return body.trim();
}

export const CATEGORIES = [
  'Mulai',
  'Fitur API',
  'Fondasi',
  'Aksi',
  'Formulir',
  'Pilihan',
  'Overlay',
  'Tampilan data',
  'Navigasi & alur',
  'Tanggal & berkas',
  'Terhubung SDK',
  'Tabel data',
  'Akademik',
  'Portal & landing',
  'Editor',
  'AI',
  'Kalender akademik',
  'Profil',
  'PMB',
  'LMS',
  'CBT',
  'Pustikom & SSO',
  'Statistik',
  'Identitas',
];

export const PAGES: DocPage[] = Object.entries(mods)
  .map(([path, mod]) => {
    const meta = mod.meta as DemoMeta;
    const src = raws[path] ?? '';
    const slug = path.replace('./demos/', '').replace('.tsx', '');
    return {
      slug,
      meta,
      demos: Object.entries(meta.demos).map(([name, title]) => ({ name, title, Component: mod[name] as ComponentType, code: slice(src, name) })),
    };
  })
  .sort((a, b) => CATEGORIES.indexOf(a.meta.category) - CATEGORIES.indexOf(b.meta.category) || (a.meta.order ?? 50) - (b.meta.order ?? 50) || a.meta.title.localeCompare(b.meta.title));
