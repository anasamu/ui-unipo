'use client';
import * as React from 'react';
import { ArrowRight, ArrowUpRight, Clock, Eye, MapPin, Megaphone, Pin, Users, Video } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { formatCompact, formatDate, formatRelative } from '../lib/format';
import { Skeleton } from './actions';
import { DateTile } from './schedule';

// ================================================================ Berita
export interface NewsItem {
  id: string | number;
  title: React.ReactNode;
  href?: string;
  excerpt?: React.ReactNode;
  image?: string | null;
  imageAlt?: string;
  category?: { name: string; color?: string | null; href?: string } | null;
  author?: React.ReactNode;
  date?: string | Date | null;
  views?: number | null;
  /** Lencana kecil, mis. "Prestasi". */
  badge?: React.ReactNode;
}

export interface NewsCardProps {
  item: NewsItem;
  /** vertical = gambar di atas; horizontal = gambar di kiri; overlay = teks di atas gambar (sorotan); minimal = tanpa gambar. */
  variant?: 'vertical' | 'horizontal' | 'overlay' | 'minimal';
  /** Tampilkan tanggal relatif ("3 jam lalu") untuk berita kurang dari seminggu. Bawaan true. */
  relativeDate?: boolean;
  className?: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
}

function tanggal(d: NewsItem['date'], relative: boolean) {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d.replace(' ', 'T')) : d;
  if (relative && Date.now() - date.getTime() < 7 * 864e5) return formatRelative(date);
  return formatDate(date, 'medium');
}

/** Kartu berita: gambar 16:9 dengan cadangan pola, kategori berwarna, judul dua baris, ringkasan, penulis, tanggal, dan jumlah dilihat. */
export function NewsCard({ item, variant = 'vertical', relativeDate = true, className, headingLevel = 'h3' }: NewsCardProps) {
  const H = headingLevel;
  const tgl = tanggal(item.date, relativeDate);
  const tone = item.category?.color ?? 'var(--u-primary)';
  return (
    <article className={cn('u-news', className)} data-variant={variant} style={{ '--tone': tone } as React.CSSProperties}>
      {variant !== 'minimal' && (
        <div className="u-news-media">{item.image ? <img src={item.image} alt={item.imageAlt ?? ''} loading="lazy" decoding="async" /> : <span className="u-news-placeholder" aria-hidden />}</div>
      )}
      <div className="u-news-body">
        {(item.category || item.badge) && (
          <div className="u-news-eyebrow">
            {item.category && <span className="u-news-cat">{item.category.name}</span>}
            {item.badge && <span className="u-news-badge">{item.badge}</span>}
          </div>
        )}
        <H className="u-news-title">
          {item.href ? (
            <a href={item.href} className="u-news-link">
              {item.title}
            </a>
          ) : (
            item.title
          )}
        </H>
        {item.excerpt && variant !== 'minimal' && <p className="u-news-excerpt">{item.excerpt}</p>}
        {(item.author || tgl || item.views != null) && (
          <div className="u-news-meta">
            {item.author && <span className="u-news-author">{item.author}</span>}
            {tgl && <time dateTime={typeof item.date === 'string' ? item.date : item.date?.toISOString()}>{tgl}</time>}
            {item.views != null && (
              <span title="Dilihat">
                <Eye aria-hidden />
                {formatCompact(item.views)}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function NewsCardSkeleton({ variant = 'vertical' }: { variant?: NewsCardProps['variant'] }) {
  return (
    <div className="u-news" data-variant={variant} aria-hidden>
      {variant !== 'minimal' && <Skeleton className="u-news-media" />}
      <div className="u-news-body">
        <Skeleton style={{ height: 12, width: 72 }} />
        <Skeleton style={{ height: 16, width: '92%' }} />
        <Skeleton style={{ height: 16, width: '64%' }} />
        <Skeleton style={{ height: 12, width: 120 }} />
      </div>
    </div>
  );
}

export interface NewsGridProps {
  items: NewsItem[];
  /** grid = kartu sama besar; featured = satu besar + sisanya di samping; list = daftar horizontal. */
  layout?: 'grid' | 'featured' | 'list';
  /** Kolom minimum (px) untuk mode grid. Bawaan 260. */
  minColumn?: number;
  loading?: boolean;
  /** Jumlah kerangka saat memuat. */
  skeletonCount?: number;
  empty?: React.ReactNode;
  className?: string;
}

/** Kumpulan kartu berita dengan tiga tata letak; responsif tanpa media query (container query). */
export function NewsGrid({ items, layout = 'grid', minColumn = 260, loading, skeletonCount = 6, empty, className }: NewsGridProps) {
  const style = { '--min': `${minColumn}px` } as React.CSSProperties;
  if (loading)
    return (
      <div className={cn('u-news-grid', className)} data-layout={layout} style={style} aria-busy>
        {Array.from({ length: layout === 'featured' ? 4 : skeletonCount }, (_, i) => (
          <NewsCardSkeleton key={i} variant={layout === 'list' || (layout === 'featured' && i > 0) ? 'horizontal' : layout === 'featured' ? 'overlay' : 'vertical'} />
        ))}
      </div>
    );
  if (!items.length) return <div className="u-agenda-empty">{empty ?? 'Belum ada berita.'}</div>;
  if (layout === 'featured') {
    const [first, ...rest] = items;
    return (
      <div className={cn('u-news-wrap', className)}>
        <div className="u-news-grid" data-layout="featured" style={style}>
          <NewsCard item={first!} variant="overlay" headingLevel="h2" />
          <div className="u-news-side">
            {rest.slice(0, 4).map((it) => (
              <NewsCard key={it.id} item={it} variant="horizontal" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={cn('u-news-grid', className)} data-layout={layout} style={style}>
      {items.map((it) => (
        <NewsCard key={it.id} item={it} variant={layout === 'list' ? 'horizontal' : 'vertical'} />
      ))}
    </div>
  );
}

/** Daftar bernomor "Terpopuler" untuk sidebar. */
export function RankedList({ items, loading, className }: { items: NewsItem[]; loading?: boolean; className?: string }) {
  return (
    <ol className={cn('u-ranked', className)} aria-busy={loading || undefined}>
      {loading
        ? Array.from({ length: 5 }, (_, i) => (
            <li key={i}>
              <span className="u-ranked-no">{i + 1}</span>
              <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                <Skeleton style={{ height: 14 }} />
                <Skeleton style={{ height: 12, width: '50%' }} />
              </div>
            </li>
          ))
        : items.map((it, i) => (
            <li key={it.id}>
              <span className="u-ranked-no">{i + 1}</span>
              <div className="u-ranked-body">
                {it.href ? (
                  <a href={it.href} className="u-ranked-title">
                    {it.title}
                  </a>
                ) : (
                  <span className="u-ranked-title">{it.title}</span>
                )}
                <span className="u-news-meta">
                  {it.category && <span style={{ color: it.category.color ?? undefined }}>{it.category.name}</span>}
                  {it.views != null && (
                    <span>
                      <Eye aria-hidden />
                      {formatCompact(it.views)}
                    </span>
                  )}
                </span>
              </div>
            </li>
          ))}
    </ol>
  );
}

// ================================================================ Pengumuman
export interface AnnouncementItem {
  id: string | number;
  title: React.ReactNode;
  href?: string;
  number?: React.ReactNode;
  priority?: 'biasa' | 'penting' | 'darurat' | string;
  date?: string | null;
  until?: string | null;
  pinned?: boolean;
}
const PRIORITAS: Record<string, string> = {
  penting: 'Penting',
  darurat: 'Darurat',
};

/** Daftar pengumuman: ikon prioritas, nomor surat, berlaku sampai, dan sematan. */
export function AnnouncementList({ items, loading, className, empty }: { items: AnnouncementItem[]; loading?: boolean; className?: string; empty?: React.ReactNode }) {
  if (loading)
    return (
      <ul className={cn('u-announce', className)} aria-busy>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="u-announce-item">
            <Skeleton style={{ width: 36, height: 36, borderRadius: 10 }} />
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              <Skeleton style={{ height: 14, width: '80%' }} />
              <Skeleton style={{ height: 12, width: '40%' }} />
            </div>
          </li>
        ))}
      </ul>
    );
  if (!items.length) return <div className="u-agenda-empty">{empty ?? 'Belum ada pengumuman.'}</div>;
  return (
    <ul className={cn('u-announce', className)}>
      {items.map((a) => {
        const Tag = a.href ? 'a' : 'div';
        return (
          <li key={a.id} className="u-announce-item" data-priority={a.priority ?? 'biasa'} data-pinned={dataFlag(a.pinned)}>
            <Tag className="u-announce-link" {...(a.href ? { href: a.href } : {})}>
              <span className="u-announce-icon" aria-hidden>
                {a.pinned ? <Pin /> : <Megaphone />}
              </span>
              <span className="u-announce-body">
                <span className="u-announce-title">
                  {a.priority && PRIORITAS[a.priority] && <span className="u-announce-flag">{PRIORITAS[a.priority]}</span>}
                  {a.title}
                </span>
                <span className="u-news-meta">
                  {a.number && <span>{a.number}</span>}
                  {a.date && <span>{formatDate(a.date.replace(' ', 'T'), 'medium')}</span>}
                  {a.until && (
                    <span>
                      <Clock aria-hidden />
                      Berlaku s.d. {formatDate(a.until, 'medium')}
                    </span>
                  )}
                </span>
              </span>
              {a.href && <ArrowUpRight className="u-announce-arrow" aria-hidden />}
            </Tag>
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Acara
export interface EventCardItem {
  id: string | number;
  title: React.ReactNode;
  href?: string;
  /** "YYYY-MM-DD HH:MM:SS" atau ISO. */
  start: string;
  end?: string | null;
  allDay?: boolean;
  mode?: 'luring' | 'daring' | 'hibrida' | string | null;
  location?: React.ReactNode;
  organizer?: React.ReactNode;
  image?: string | null;
  /** Pendaftaran dibuka. */
  registration?: boolean;
}
const MODE: Record<string, string> = {
  luring: 'Luring',
  daring: 'Daring',
  hibrida: 'Hibrida',
};
const jam = (s?: string | null) => (s && s.length > 10 ? s.slice(11, 16).replace(':', '.') : null);

/** Kartu acara: tile tanggal, jam, mode (luring/daring/hibrida), lokasi, penyelenggara, dan tanda pendaftaran. */
export function EventCard({ item, variant = 'row', className }: { item: EventCardItem; variant?: 'row' | 'card'; className?: string }) {
  const j1 = jam(item.start);
  const j2 = jam(item.end);
  const beda = item.end && item.end.slice(0, 10) !== item.start.slice(0, 10);
  return (
    <article className={cn('u-event', className)} data-variant={variant}>
      {variant === 'card' && item.image && (
        <div className="u-news-media">
          <img src={item.image} alt="" loading="lazy" />
        </div>
      )}
      <div className="u-event-main">
        <DateTile date={item.start.slice(0, 10)} size={variant === 'card' ? 'md' : 'lg'} />
        <div className="u-event-body">
          <h3 className="u-news-title">
            {item.href ? (
              <a href={item.href} className="u-news-link">
                {item.title}
              </a>
            ) : (
              item.title
            )}
          </h3>
          <div className="u-news-meta">
            <span>
              <Clock aria-hidden />
              {beda ? `${formatDate(item.start.slice(0, 10), 'medium')} – ${formatDate(item.end!.slice(0, 10), 'medium')}` : item.allDay || !j1 ? 'Sepanjang hari' : `${j1}${j2 ? `–${j2}` : ''} WITA`}
            </span>
            {item.location && (
              <span>
                {item.mode === 'daring' ? <Video aria-hidden /> : <MapPin aria-hidden />}
                {item.location}
              </span>
            )}
            {item.organizer && (
              <span>
                <Users aria-hidden />
                {item.organizer}
              </span>
            )}
          </div>
          {(item.mode || item.registration) && (
            <div className="u-event-tags">
              {item.mode && MODE[item.mode] && (
                <span className="u-event-tag" data-mode={item.mode}>
                  {MODE[item.mode]}
                </span>
              )}
              {item.registration && (
                <span className="u-event-tag" data-mode="daftar">
                  Pendaftaran dibuka
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ================================================================ Bagian landing
export interface SectionProps extends Omit<React.ComponentProps<'section'>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Tautan "Lihat semua". */
  href?: string;
  linkLabel?: React.ReactNode;
  /** Aksi lain di kanan judul. */
  actions?: React.ReactNode;
  align?: 'start' | 'center';
}

/** Kepala bagian halaman (eyebrow, judul, deskripsi, tautan) + isi. Dipakai di landing page dan beranda portal. */
export function Section({ eyebrow, title, description, href, linkLabel = 'Lihat semua', actions, align = 'start', className, children, ...props }: SectionProps) {
  return (
    <section className={cn('u-section', className)} data-align={align} {...props}>
      <header className="u-section-head">
        <div className="u-section-text">
          {eyebrow && <p className="u-section-eyebrow">{eyebrow}</p>}
          <h2 className="u-section-title">{title}</h2>
          {description && <p className="u-section-desc">{description}</p>}
        </div>
        {(href || actions) && (
          <div className="u-section-actions">
            {actions}
            {href && (
              <a href={href} className="u-section-link">
                {linkLabel} <ArrowRight aria-hidden />
              </a>
            )}
          </div>
        )}
      </header>
      {children}
    </section>
  );
}

export interface HeroProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Angka singkat di bawah aksi, mis. [{ value: '12', label: 'Program studi' }]. */
  stats?: Array<{ value: React.ReactNode; label: React.ReactNode }>;
  /** Gambar atau ilustrasi di kanan (atau latar untuk variant="image"). */
  media?: React.ReactNode;
  image?: string;
  /** split = teks kiri, media kanan; image = teks di atas foto lebar; plain = teks tengah. */
  variant?: 'split' | 'image' | 'plain';
  /** Kartu/pengumuman kecil di atas judul, mis. "Pendaftaran gelombang I dibuka". */
  announcement?: React.ReactNode;
  className?: string;
}

/** Hero landing page kampus: tiga varian, angka singkat, dan pengumuman kecil. */
export function Hero({ eyebrow, title, description, actions, stats, media, image, variant = 'split', announcement, className }: HeroProps) {
  return (
    <section className={cn('u-hero', className)} data-variant={variant} style={variant === 'image' && image ? ({ '--hero-image': `url("${image}")` } as React.CSSProperties) : undefined}>
      <div className="u-hero-grid">
        <div className="u-hero-text">
          {announcement && <div className="u-hero-announce">{announcement}</div>}
          {eyebrow && <p className="u-section-eyebrow">{eyebrow}</p>}
          <h1 className="u-hero-title">{title}</h1>
          {description && <p className="u-hero-desc">{description}</p>}
          {actions && <div className="u-hero-actions">{actions}</div>}
          {stats && (
            <dl className="u-hero-stats">
              {stats.map((s, i) => (
                <div key={i}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {variant === 'split' && (media || image) && <div className="u-hero-media">{media ?? <img src={image} alt="" />}</div>}
      </div>
    </section>
  );
}
