'use client';
import * as React from 'react';
import { MessageCircleQuestion, Search, SearchX } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button, Skeleton } from './actions';
import { Accordion, Empty } from './display';

export interface FaqItem {
  id?: string | number;
  question: React.ReactNode;
  /** Teks biasa (baris baru dipertahankan) atau elemen. */
  answer: React.ReactNode;
  category?: string;
  /** Teks untuk pencarian bila question/answer berupa elemen. */
  searchText?: string;
}

export interface FaqProps {
  items: FaqItem[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Kotak cari (bawaan true bila lebih dari 5 pertanyaan). */
  searchable?: boolean;
  /** Pil kategori (bawaan true bila ada lebih dari satu kategori). */
  categories?: boolean;
  /** stack: judul di atas; split: judul + kategori di kiri, pertanyaan di kanan (halaman FAQ). */
  layout?: 'stack' | 'split';
  variant?: 'line' | 'card';
  /** Buka pertanyaan pertama. */
  openFirst?: boolean;
  loading?: boolean;
  /** Kotak "Masih ada pertanyaan?" di bawah. */
  contact?: { title?: React.ReactNode; description?: React.ReactNode; action: React.ReactNode };
  /** Pencarian di server: dipanggil saat kata kunci berubah (sudah ditunda 300 ms). Tanpa ini disaring di browser. */
  onSearch?: (q: string) => void;
  className?: string;
}

const textOf = (n: React.ReactNode): string => (typeof n === 'string' || typeof n === 'number' ? String(n) : '');
const norm = (s: string) => s.toLocaleLowerCase('id').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Tanya jawab: pencarian, pil kategori, akordeon, dan kotak kontak. Untuk portal, PMB, LMS, layanan akademik. */
export function Faq({ items, title, description, searchable, categories, layout = 'stack', variant = 'line', openFirst, loading, contact, onSearch, className }: FaqProps) {
  const [q, setQ] = React.useState('');
  const [kat, setKat] = React.useState<string | null>(null);
  const cats = React.useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean) as string[])], [items]);
  const showCats = (categories ?? cats.length > 1) && cats.length > 0;
  const showSearch = searchable ?? (items.length > 5 || Boolean(onSearch));

  React.useEffect(() => {
    if (!onSearch) return;
    const t = setTimeout(() => onSearch(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, onSearch]);

  const shown = items.filter((i) => {
    if (kat && i.category !== kat) return false;
    if (!q.trim() || onSearch) return true;
    const hay = norm(`${textOf(i.question)} ${textOf(i.answer)} ${i.searchText ?? ''}`);
    return norm(q.trim())
      .split(/\s+/)
      .every((w) => hay.includes(w));
  });
  const count = (c: string | null) => (c ? items.filter((i) => i.category === c).length : items.length);

  const head = (title || description) && (
    <div className="u-faq-head">
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
    </div>
  );
  const search = showSearch && (
    <label className="u-faq-search">
      <Search aria-hidden />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pertanyaan…" aria-label="Cari pertanyaan" />
    </label>
  );
  const pills = showCats && (
    <div className="u-faq-cats" role="tablist" aria-label="Kategori">
      {[null, ...cats].map((c) => (
        <button key={c ?? '_semua'} type="button" role="tab" aria-selected={kat === c} onClick={() => setKat(c)}>
          {c ?? 'Semua'}
          <span>{count(c)}</span>
        </button>
      ))}
    </div>
  );
  const list = loading ? (
    <div className="u-faq-loading">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} style={{ height: 52 }} />
      ))}
    </div>
  ) : shown.length ? (
    <Accordion
      key={`${kat}|${q}`}
      variant={variant}
      defaultValue={openFirst ? [String(shown[0]!.id ?? 0)] : undefined}
      items={shown.map((i, idx) => ({
        value: String(i.id ?? idx),
        title: i.question,
        content: typeof i.answer === 'string' ? <p className="u-faq-answer">{i.answer}</p> : i.answer,
      }))}
    />
  ) : (
    <Empty
      icon={<SearchX />}
      title={items.length ? 'Tidak ada pertanyaan yang cocok' : 'Belum ada tanya jawab'}
      description={items.length ? 'Coba kata lain atau pilih kategori Semua.' : undefined}
      actions={
        items.length ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQ('');
              setKat(null);
            }}
          >
            Atur ulang
          </Button>
        ) : undefined
      }
    />
  );
  const kontak = contact && (
    <div className="u-faq-contact">
      <span className="u-faq-contact-icon" aria-hidden>
        <MessageCircleQuestion />
      </span>
      <div>
        <b>{contact.title ?? 'Masih ada pertanyaan?'}</b>
        {contact.description && <p>{contact.description}</p>}
      </div>
      <div className="u-faq-contact-action">{contact.action}</div>
    </div>
  );

  if (layout === 'split')
    return (
      <section className={cn('u-faq', className)} data-layout="split">
        <aside className="u-faq-side">
          {head}
          {search}
          {pills}
        </aside>
        <div className="u-faq-main">
          {list}
          {kontak}
        </div>
      </section>
    );
  return (
    <section className={cn('u-faq', className)} data-layout="stack">
      {head}
      {(search || pills) && (
        <div className="u-faq-tools">
          {search}
          {pills}
        </div>
      )}
      {list}
      {kontak}
    </section>
  );
}
