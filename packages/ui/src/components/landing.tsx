'use client';
import * as React from 'react';
import { AtSign, CalendarDays, ChevronDown, Globe, MapPin, Mail, MessageCircle, MessagesSquare, Music2, PlayCircle, Quote, SendHorizontal, Sparkles, Star, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Badge, Button, Skeleton } from './actions';
import { Animasi, TitikMengetik } from './animasi';
import { Avatar, Empty } from './display';

/**
 * Blok landing page umum (PMB, LMS, portal fakultas, tracer, humas): papan fakta, angka, keunggulan, galeri,
 * testimoni, ajakan, garis waktu, navigasi bagian, tautan sosial, dan jendela tanya-jawab mengambang.
 */

// ================================================================ Papan fakta
export interface FactItem {
  icon?: React.ReactNode;
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}
/** Papan informasi bersekat (mis. di bawah hero): tanggal tutup, biaya, jalur, jumlah prodi. */
export function FactBoard({ items, loading, className }: { items: FactItem[]; loading?: boolean; className?: string }) {
  if (loading) return <Skeleton className={className} style={{ height: 112, borderRadius: 'var(--u-radius-xl)' }} />;
  return (
    <dl className={cn('u-factboard', className)} style={{ '--n': items.length } as React.CSSProperties}>
      {items.map((f, i) => (
        <Animasi key={i} jenis="masuk" tunda={i} pemicu="terlihat" className="u-fact">
          <dt>
            {f.icon}
            {f.label}
          </dt>
          <dd className="u-fact-value">{f.value}</dd>
          {f.hint && <dd className="u-fact-hint">{f.hint}</dd>}
        </Animasi>
      ))}
    </dl>
  );
}

// ================================================================ Deret angka
/** Deret angka besar (jumlah mahasiswa, akreditasi, dll.). */
export function StatStrip({ items, className }: { items: Array<{ value: React.ReactNode; label: React.ReactNode }>; className?: string }) {
  if (!items.length) return null;
  return (
    <dl className={cn('u-statstrip', className)}>
      {items.map((s, i) => (
        <div key={i}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ================================================================ Keunggulan
export interface FeatureItem {
  icon?: React.ReactNode;
  title: React.ReactNode;
  text?: React.ReactNode;
}
/** Kisi keunggulan: ikon dalam kotak bernada primer, judul, dan teks singkat. */
export function FeatureGrid({ items, columns = 2, className }: { items: FeatureItem[]; columns?: 2 | 3 | 4; className?: string }) {
  return (
    <ul className={cn('u-features', className)} data-cols={columns}>
      {items.map((f, i) => (
        <Animasi as="li" key={i} jenis="masuk" tunda={i} pemicu="terlihat" className="u-feature">
          <span className="u-feature-icon" aria-hidden>
            {f.icon ?? <Sparkles />}
          </span>
          <p className="u-feature-title">{f.title}</p>
          {f.text && <p className="u-feature-text">{f.text}</p>}
        </Animasi>
      ))}
    </ul>
  );
}

// ================================================================ Galeri
/** Galeri mosaik: foto pertama besar, sisanya kecil. Klik untuk memperbesar. */
export function Gallery({ items, max = 8, className }: { items: Array<{ src: string; caption?: React.ReactNode; alt?: string }>; max?: number; className?: string }) {
  const [buka, setBuka] = React.useState<number | null>(null);
  const tampil = items.slice(0, max);
  React.useEffect(() => {
    if (buka == null) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBuka(null);
      if (e.key === 'ArrowRight') setBuka((b) => (b == null ? b : (b + 1) % tampil.length));
      if (e.key === 'ArrowLeft') setBuka((b) => (b == null ? b : (b - 1 + tampil.length) % tampil.length));
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [buka, tampil.length]);
  if (!tampil.length) return null;
  const aktif = buka != null ? tampil[buka] : null;
  return (
    <>
      <ul className={cn('u-gallery', className)}>
        {tampil.map((g, i) => (
          <li key={i} data-wide={dataFlag(i === 0)}>
            <button type="button" onClick={() => setBuka(i)} aria-label={`Perbesar foto ${typeof g.caption === 'string' ? g.caption : i + 1}`}>
              <img src={g.src} alt={g.alt ?? (typeof g.caption === 'string' ? g.caption : '')} loading="lazy" />
            </button>
            {g.caption && <span className="u-gallery-caption">{g.caption}</span>}
          </li>
        ))}
      </ul>
      {aktif && (
        <div className="u-lightbox" role="dialog" aria-modal="true" aria-label="Foto" onClick={() => setBuka(null)}>
          <figure onClick={(e) => e.stopPropagation()}>
            <img src={aktif.src} alt={aktif.alt ?? ''} />
            {aktif.caption && <figcaption>{aktif.caption}</figcaption>}
          </figure>
          <button type="button" className="u-lightbox-close" onClick={() => setBuka(null)} aria-label="Tutup">
            <X />
          </button>
        </div>
      )}
    </>
  );
}

// ================================================================ Testimoni
/** Bintang penilaian hanya-baca (nilai dibulatkan ke bintang terdekat, 0 sampai `max`) untuk testimoni dan ulasan. */
export function Rating({ value, max = 5, className }: { value: number; max?: number; className?: string }) {
  return (
    <span className={cn('u-rating', className)} role="img" aria-label={`${value} dari ${max} bintang`}>
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} data-on={dataFlag(i < Math.round(value))} aria-hidden />
      ))}
    </span>
  );
}

export interface TestimonialItem {
  id?: React.Key;
  quote: React.ReactNode;
  name: string;
  role?: React.ReactNode;
  avatar?: string | null;
  rating?: number | null;
  /** Tautan video testimoni. */
  videoUrl?: string | null;
}
/** Satu kutipan testimoni dengan foto, peran, bintang, dan tautan video. */
export function Testimonial({ item, className }: { item: TestimonialItem; className?: string }) {
  return (
    <figure className={cn('u-testimonial', className)}>
      <Quote className="u-testimonial-mark" aria-hidden />
      {item.rating ? <Rating value={item.rating} /> : null}
      <blockquote>{item.quote}</blockquote>
      <figcaption>
        <Avatar name={item.name} src={item.avatar ?? undefined} size="md" />
        <span className="u-testimonial-who">
          <b>{item.name}</b>
          {item.role && <span>{item.role}</span>}
        </span>
        {item.videoUrl && (
          <a href={item.videoUrl} target="_blank" rel="noopener noreferrer" className="u-testimonial-video">
            <PlayCircle aria-hidden /> Video
          </a>
        )}
      </figcaption>
    </figure>
  );
}
/** Kisi testimoni dengan tombol "Tampilkan semua". */
export function TestimonialGrid({ items, initial = 6, className }: { items: TestimonialItem[]; initial?: number; className?: string }) {
  const [semua, setSemua] = React.useState(false);
  if (!items.length) return null;
  const tampil = semua ? items : items.slice(0, initial);
  return (
    <div className={cn('u-testimonials', className)}>
      <div className="u-testimonials-grid">
        {tampil.map((t, i) => (
          <Animasi key={t.id ?? i} jenis="masuk" tunda={i % 3} pemicu="terlihat">
            <Testimonial item={t} />
          </Animasi>
        ))}
      </div>
      {!semua && items.length > initial && (
        <Button variant="ghost" onClick={() => setSemua(true)} className="u-testimonials-more">
          Tampilkan semua ({items.length}) <ChevronDown />
        </Button>
      )}
    </div>
  );
}

// ================================================================ Ajakan
export interface CtaBandProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** primary = latar warna primer; dark = gelap; soft = lembut. */
  tone?: 'primary' | 'dark' | 'soft';
  className?: string;
}
/** Pita ajakan penutup halaman (tenggat, tombol daftar). */
export function CtaBand({ title, description, actions, tone = 'primary', className }: CtaBandProps) {
  return (
    <section className={cn('u-cta', className)} data-tone={tone}>
      <div className="u-cta-inner">
        <div className="u-cta-text">
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="u-cta-actions">{actions}</div>}
      </div>
    </section>
  );
}

// ================================================================ Garis waktu
export type TimelineStatus = 'done' | 'active' | 'upcoming';
export interface TimelineItem {
  id?: React.Key;
  title: React.ReactNode;
  time?: React.ReactNode;
  place?: React.ReactNode;
  description?: React.ReactNode;
  status?: TimelineStatus;
  /** Label di kanan (tahap). Bawaan dari status. */
  badge?: React.ReactNode;
}
/** Garis waktu tahapan dengan garis kemajuan dan penanda tahap yang sedang berlangsung. */
export function Timeline({ items, loading, empty, className }: { items: TimelineItem[]; loading?: boolean; empty?: React.ReactNode; className?: string }) {
  if (loading)
    return (
      <div className={cn('u-timeline', className)}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} style={{ height: 64, borderRadius: 'var(--u-radius-lg)' }} />
        ))}
      </div>
    );
  if (!items.length) return <>{empty ?? <Empty icon={<CalendarDays />} title="Jadwal segera diumumkan" bordered />}</>;
  const aktif = items.findIndex((x) => x.status !== 'done');
  const persen = aktif < 0 ? 100 : (aktif / Math.max(1, items.length - 1)) * 100;
  return (
    <ol className={cn('u-timeline', className)} style={{ '--persen': `${persen}%` } as React.CSSProperties}>
      {items.map((it, i) => {
        const st = it.status ?? 'upcoming';
        return (
          <Animasi as="li" key={it.id ?? i} jenis="masuk" tunda={i} pemicu="terlihat" className="u-timeline-item" data-status={st}>
            <span className="u-timeline-dot" aria-hidden>
              {i + 1}
            </span>
            <div className="u-timeline-card">
              <div className="u-timeline-head">
                <p className="u-timeline-title">{it.title}</p>
                {it.badge ??
                  (st === 'active' ? (
                    <Badge variant="success" dot>
                      Berlangsung
                    </Badge>
                  ) : st === 'done' ? (
                    <Badge>Selesai</Badge>
                  ) : null)}
              </div>
              {it.time && (
                <p className="u-timeline-meta">
                  <CalendarDays aria-hidden /> {it.time}
                </p>
              )}
              {it.place && (
                <p className="u-timeline-meta">
                  <MapPin aria-hidden /> {it.place}
                </p>
              )}
              {it.description && <p className="u-timeline-desc">{it.description}</p>}
            </div>
          </Animasi>
        );
      })}
    </ol>
  );
}

// ================================================================ Navigasi bagian
/** Id bagian yang sedang dibaca: bagian terakhir yang bagian atasnya sudah melewati `offset` px dari atas. */
export function useScrollSpy(ids: string[], offset = 140): string {
  const [aktif, setAktif] = React.useState('');
  const kunci = ids.join('|');
  React.useEffect(() => {
    let antre = 0;
    const hitung = () => {
      antre = 0;
      let kini = '';
      for (const id of kunci.split('|')) {
        const el = id ? document.getElementById(id) : null;
        if (el && el.getBoundingClientRect().top <= offset) kini = id;
      }
      setAktif(kini);
    };
    const gulir = () => {
      if (!antre) antre = requestAnimationFrame(hitung);
    };
    hitung();
    window.addEventListener('scroll', gulir, { passive: true });
    window.addEventListener('resize', gulir);
    return () => {
      window.removeEventListener('scroll', gulir);
      window.removeEventListener('resize', gulir);
      cancelAnimationFrame(antre);
    };
  }, [kunci, offset]);
  return aktif;
}

export interface SectionNavProps {
  items: Array<{ id: string; label: React.ReactNode }>;
  /** sidebar = daftar tegak menempel; bar = baris mendatar menempel (ponsel). */
  variant?: 'sidebar' | 'bar';
  title?: React.ReactNode;
  /** Jarak dari atas layar saat menempel / batas bagian dianggap aktif. */
  offset?: number;
  className?: string;
}
/** Daftar isi "Di halaman ini" yang mengikuti posisi gulir. */
export function SectionNav({ items, variant = 'sidebar', title = 'Di halaman ini', offset = 140, className }: SectionNavProps) {
  const aktif = useScrollSpy(
    items.map((i) => i.id),
    offset,
  );
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (variant !== 'bar') return;
    const el = ref.current?.querySelector<HTMLElement>(`[data-active]`);
    if (el && ref.current) ref.current.scrollTo({ left: el.offsetLeft - 16, behavior: 'smooth' });
  }, [aktif, variant]);
  return (
    <nav ref={ref} className={cn('u-sectionnav', className)} data-variant={variant} aria-label={typeof title === 'string' ? title : 'Bagian halaman'}>
      {variant === 'sidebar' && <p className="u-sectionnav-title">{title}</p>}
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} data-active={dataFlag(aktif === i.id)} aria-current={aktif === i.id ? 'location' : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ================================================================ Tautan sosial
const svg = (d: React.ReactNode) => (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    {d}
  </svg>
);
const IkonInstagram = svg(
  <>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </>,
);
const IkonFacebook = svg(<path d="M14 21v-8h3l.5-3.5H14V7.8c0-1 .3-1.8 1.8-1.8H18V3a24 24 0 0 0-2.8-.1C12.6 2.9 11 4.5 11 7.3v2.2H8V13h3v8" />);
const IkonYoutube = svg(
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" />
  </>,
);
const IkonX = svg(<path d="M4 4l16 16M20 4 4 20" />);
const IkonLinkedin = svg(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V16M8 7.5v.01M11.5 16v-5.5M11.5 13c0-1.7 1-2.6 2.3-2.6s2.2.8 2.2 2.6V16" />
  </>,
);
const SOSIAL: Record<string, { label: string; Ikon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  instagram: { label: 'Instagram', Ikon: IkonInstagram },
  facebook: { label: 'Facebook', Ikon: IkonFacebook },
  youtube: { label: 'YouTube', Ikon: IkonYoutube },
  tiktok: { label: 'TikTok', Ikon: Music2 as never },
  x: { label: 'X', Ikon: IkonX },
  twitter: { label: 'X', Ikon: IkonX },
  linkedin: { label: 'LinkedIn', Ikon: IkonLinkedin },
  threads: { label: 'Threads', Ikon: AtSign as never },
  whatsapp: { label: 'WhatsApp', Ikon: MessageCircle as never },
  whatsapp_channel: { label: 'Saluran WhatsApp', Ikon: MessageCircle as never },
  email: { label: 'Email', Ikon: Mail as never },
  website: { label: 'Situs web', Ikon: Globe as never },
};
/** Deret tombol ikon media sosial. `jenis`: instagram, facebook, youtube, tiktok, x, linkedin, threads, whatsapp, whatsapp_channel, email, website. */
export function SocialLinks({ items, className }: { items: Array<{ jenis: string; url: string }>; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn('u-social', className)}>
      {items.map((s) => {
        const d = SOSIAL[s.jenis] ?? SOSIAL.website!;
        return (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={d.label} title={d.label}>
              <d.Ikon />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

// ================================================================ Jendela tanya jawab
export interface ChatReply {
  /** Isi balasan. */
  content: React.ReactNode;
  /** Tombol di bawah balasan (mis. teruskan ke WhatsApp). */
  actions?: React.ReactNode;
}
export interface ChatWidgetProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  greeting?: React.ReactNode;
  /** Pertanyaan cepat yang tampil sebelum percakapan dimulai. */
  suggestions?: string[];
  /** Jawab pertanyaan (boleh async). */
  onAsk: (question: string) => ChatReply | Promise<ChatReply>;
  /** Tautan di kaki jendela, mis. "Chat langsung di WhatsApp". */
  footer?: React.ReactNode;
  launcherLabel?: string;
  /** Buka dari luar (mis. tombol "Tanya cepat"). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nama event window untuk membuka jendela + pertanyaan awal: window.dispatchEvent(new CustomEvent(nama, { detail: 'tanya' })). */
  eventName?: string;
  className?: string;
}
type Pesan = { dari: 'bot' | 'saya'; isi: React.ReactNode; aksi?: React.ReactNode };

/** Tombol mengambang + jendela tanya jawab (asisten FAQ, bantuan cepat). Escape menutup, fokus ke kotak tulis. */
export function ChatWidget({
  title = 'Tanya jawab',
  subtitle,
  greeting = 'Halo! Ada yang bisa dibantu?',
  suggestions = [],
  onAsk,
  footer,
  launcherLabel = 'Tanya',
  open: openProp,
  onOpenChange,
  eventName,
  className,
}: ChatWidgetProps) {
  const [inner, setInner] = React.useState(false);
  const open = openProp ?? inner;
  const setOpen = React.useCallback(
    (v: boolean) => {
      setInner(v);
      onOpenChange?.(v);
    },
    [onOpenChange],
  );
  const [teks, setTeks] = React.useState('');
  const [pesan, setPesan] = React.useState<Pesan[]>([]);
  const [mengetik, setMengetik] = React.useState(false);
  const bawah = React.useRef<HTMLDivElement>(null);
  const masukan = React.useRef<HTMLInputElement>(null);
  const askRef = React.useRef(onAsk);
  askRef.current = onAsk;

  const tanya = React.useCallback(async (q: string) => {
    const t = q.trim();
    if (!t) return;
    setPesan((p) => [...p, { dari: 'saya', isi: t }]);
    setTeks('');
    setMengetik(true);
    try {
      const [r] = await Promise.all([askRef.current(t), new Promise((ok) => setTimeout(ok, 450))]);
      setPesan((p) => [...p, { dari: 'bot', isi: (r as ChatReply).content, aksi: (r as ChatReply).actions }]);
    } catch {
      setPesan((p) => [...p, { dari: 'bot', isi: 'Maaf, terjadi kesalahan. Coba lagi sebentar.' }]);
    } finally {
      setMengetik(false);
    }
  }, []);

  React.useEffect(() => {
    if (!eventName) return;
    const f = (e: Event) => {
      setOpen(true);
      const q = (e as CustomEvent<string | undefined>).detail;
      if (q) void tanya(q);
    };
    window.addEventListener(eventName, f);
    return () => window.removeEventListener(eventName, f);
  }, [eventName, setOpen, tanya]);
  React.useEffect(() => {
    bawah.current?.scrollIntoView({ block: 'end' });
  }, [pesan, mengetik, open]);
  React.useEffect(() => {
    if (!open) return;
    masukan.current?.focus();
    const f = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [open, setOpen]);

  return (
    <div className={cn('u-chatw', className)}>
      <button type="button" className="u-chatw-launcher" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Tutup jendela tanya jawab' : launcherLabel}>
        {open ? <X aria-hidden /> : <MessagesSquare aria-hidden />}
        <span>{open ? 'Tutup' : launcherLabel}</span>
      </button>
      {open && (
        <div className="u-chatw-panel" role="dialog" aria-label={typeof title === 'string' ? title : 'Tanya jawab'}>
          <header className="u-chatw-head">
            <span className="u-chatw-avatar" aria-hidden>
              <MessagesSquare />
            </span>
            <div>
              <p className="u-chatw-title">{title}</p>
              {subtitle && <p className="u-chatw-sub">{subtitle}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="u-chatw-close">
              <X />
            </button>
          </header>
          <div className="u-chatw-body" aria-live="polite">
            <div className="u-chatw-msg" data-from="bot">
              <div>{greeting}</div>
            </div>
            {!pesan.length && suggestions.length > 0 && (
              <div className="u-chatw-suggest">
                {suggestions.slice(0, 4).map((s) => (
                  <button key={s} type="button" onClick={() => void tanya(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {pesan.map((p, i) => (
              <div key={i} className="u-chatw-msg" data-from={p.dari}>
                <div>
                  {p.isi}
                  {p.aksi && <div className="u-chatw-actions">{p.aksi}</div>}
                </div>
              </div>
            ))}
            {mengetik && (
              <div className="u-chatw-msg" data-from="bot">
                <div>
                  <TitikMengetik />
                </div>
              </div>
            )}
            <div ref={bawah} />
          </div>
          <form
            className="u-chatw-form"
            onSubmit={(e) => {
              e.preventDefault();
              void tanya(teks);
            }}
          >
            <input ref={masukan} value={teks} onChange={(e) => setTeks(e.target.value)} maxLength={300} placeholder="Tulis pertanyaan…" aria-label="Pertanyaan" />
            <Button type="submit" iconOnly disabled={!teks.trim()} aria-label="Kirim">
              <SendHorizontal />
            </Button>
          </form>
          {footer && <div className="u-chatw-foot">{footer}</div>}
        </div>
      )}
    </div>
  );
}

// ================================================================ Pencocok FAQ sederhana
const KATA_UMUM = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'apa',
  'apakah',
  'bagaimana',
  'saya',
  'bisa',
  'untuk',
  'ini',
  'itu',
  'cara',
  'ada',
  'atau',
  'dengan',
  'kapan',
  'harus',
  'mau',
  'ingin',
  'tidak',
  'berapa',
]);
const polosFaq = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
const kataKunci = (s: string) =>
  polosFaq(s)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !KATA_UMUM.has(w));
/**
 * FAQ yang paling cocok dengan pertanyaan (kata yang sama; kata di pertanyaan FAQ dibobot 2). Null bila skor < 2.
 * Dipakai ChatWidget sebagai asisten FAQ tanpa server.
 */
export function cocokkanFaq<T extends { pertanyaan?: string; question?: string; jawaban?: string; answer?: string }>(q: string, daftar: T[]): T | null {
  const kq = kataKunci(q);
  if (!kq.length) return null;
  let terbaik: T | null = null;
  let skor = 0;
  for (const f of daftar) {
    const kp = kataKunci(String(f.pertanyaan ?? f.question ?? ''));
    const kj = kataKunci(String(f.jawaban ?? f.answer ?? ''));
    const s = kq.reduce((n, w) => n + (kp.some((x) => x.includes(w) || w.includes(x)) ? 2 : 0) + (kj.some((x) => x.includes(w)) ? 1 : 0), 0);
    if (s > skor) {
      skor = s;
      terbaik = f;
    }
  }
  return skor >= 2 ? terbaik : null;
}
