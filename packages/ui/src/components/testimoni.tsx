'use client';
import * as React from 'react';
import { BadgeCheck, ChevronLeft, ChevronRight, Pause, Play, Quote, Star } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatNumber } from '../lib/format';
import { Avatar } from './display';
import { DialogVideo } from './sambutan';

// ================================================================ Bintang

export interface NilaiBintangProps {
  /** Nilai 0..maks, boleh pecahan (4,5). */
  nilai: number;
  maks?: number;
  ukuran?: 'sm' | 'md' | 'lg';
  /** Tampilkan angka di samping bintang. */
  angka?: boolean;
  /** Mode isian: bintang bisa dipilih (klik atau panah kiri/kanan). */
  onUbah?: (nilai: number) => void;
  /** Label untuk pembaca layar pada mode isian. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

const fmt1 = (n: number) => formatNumber(n, { maximumFractionDigits: 1, minimumFractionDigits: n % 1 ? 1 : 0 });

/** Bintang penilaian: tampilan (mendukung pecahan) atau isian 1..maks yang bisa dipakai keyboard. */
export function NilaiBintang({ nilai, maks = 5, ukuran = 'md', angka, onUbah, label = 'Penilaian', disabled, className }: NilaiBintangProps) {
  const [sorot, setSorot] = React.useState<number | null>(null);
  const v = Math.max(0, Math.min(maks, nilai || 0));
  if (onUbah) {
    const aktif = sorot ?? v;
    return (
      <div className={cn('u-bintang', className)} data-ukuran={ukuran} data-isian="" role="radiogroup" aria-label={label} aria-disabled={disabled || undefined} onMouseLeave={() => setSorot(null)}>
        {Array.from({ length: maks }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Math.round(v) === n}
              aria-label={`${n} dari ${maks} bintang`}
              tabIndex={Math.round(v) === n || (v === 0 && n === 1) ? 0 : -1}
              disabled={disabled}
              data-isi={n <= aktif ? '' : undefined}
              onMouseEnter={() => setSorot(n)}
              onClick={() => onUbah(n)}
              onKeyDown={(e) => {
                const ke = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? Math.min(maks, n + 1) : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? Math.max(1, n - 1) : null;
                if (ke === null) return;
                e.preventDefault();
                onUbah(ke);
                (e.currentTarget.parentElement?.children[ke - 1] as HTMLElement | undefined)?.focus();
              }}
            >
              <Star aria-hidden />
            </button>
          );
        })}
        {angka && <span className="u-bintang-angka">{v ? `${v}/${maks}` : 'Belum dinilai'}</span>}
      </div>
    );
  }
  return (
    <span className={cn('u-bintang', className)} data-ukuran={ukuran} role="img" aria-label={`Nilai ${fmt1(v)} dari ${maks}`}>
      <span className="u-bintang-baris" aria-hidden>
        {Array.from({ length: maks }, (_, i) => (
          <span key={i} className="u-bintang-satu">
            <Star />
            <span className="u-bintang-isi" style={{ width: `${Math.max(0, Math.min(1, v - i)) * 100}%` }}>
              <Star />
            </span>
          </span>
        ))}
      </span>
      {angka && (
        <span className="u-bintang-angka" aria-hidden>
          {fmt1(v)}
        </span>
      )}
    </span>
  );
}

export interface RingkasanRatingProps {
  /** Hitung dari testimoni (kolom rating), atau isi `distribusi` sendiri. */
  items?: Array<{ rating?: number | null }>;
  /** Jumlah ulasan per bintang: { 5: 120, 4: 30, ... }. */
  distribusi?: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
  judul?: React.ReactNode;
  /** Tata letak: menyamping (angka besar di kiri) atau ringkas satu baris. */
  varian?: 'lengkap' | 'ringkas';
  className?: string;
}

export function hitungRating(items: Array<{ rating?: number | null }>) {
  const d: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let n = 0;
  items.forEach((x) => {
    const r = Math.round(Number(x.rating));
    if (r >= 1 && r <= 5) {
      d[r]++;
      total += r;
      n++;
    }
  });
  return { rata: n ? total / n : 0, jumlah: n, distribusi: d as Record<1 | 2 | 3 | 4 | 5, number> };
}

/** Ringkasan rating: rata-rata, jumlah ulasan, dan sebaran bintang 5 sampai 1. */
export function RingkasanRating({ items, distribusi, judul = 'Penilaian', varian = 'lengkap', className }: RingkasanRatingProps) {
  const h = React.useMemo(() => {
    if (!distribusi) return hitungRating(items ?? []);
    const d = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...distribusi } as Record<1 | 2 | 3 | 4 | 5, number>;
    const jumlah = Object.values(d).reduce((a, b) => a + b, 0);
    const rata = jumlah ? ([1, 2, 3, 4, 5] as const).reduce((a, k) => a + k * d[k], 0) / jumlah : 0;
    return { rata, jumlah, distribusi: d };
  }, [items, distribusi]);
  if (varian === 'ringkas')
    return (
      <div className={cn('u-rating-ringkas', className)}>
        <b>{fmt1(h.rata)}</b>
        <NilaiBintang nilai={h.rata} ukuran="sm" />
        <span>dari {formatNumber(h.jumlah)} ulasan</span>
      </div>
    );
  const maks = Math.max(1, ...Object.values(h.distribusi));
  return (
    <div className={cn('u-rating', className)}>
      <div className="u-rating-angka">
        {judul && <span className="u-rating-judul">{judul}</span>}
        <b>{fmt1(h.rata)}</b>
        <NilaiBintang nilai={h.rata} />
        <small>{formatNumber(h.jumlah)} ulasan</small>
      </div>
      <ul className="u-rating-sebaran" aria-label="Sebaran bintang">
        {([5, 4, 3, 2, 1] as const).map((k) => (
          <li key={k}>
            <span>
              {k} <Star aria-hidden />
            </span>
            <span className="u-rating-bilah" aria-hidden>
              <span style={{ width: `${(h.distribusi[k] / maks) * 100}%` }} />
            </span>
            <span className="u-rating-jumlah">
              {formatNumber(h.distribusi[k])}
              <span className="u-sr-only"> ulasan {k} bintang</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================================================================ Testimoni

export interface ItemTestimoni {
  id?: string | number;
  nama: string;
  /** Mis. "Alumni 2021", "Mahasiswa semester 5", "Orang tua mahasiswa". */
  peran?: string | null;
  /** Prodi atau unit, mis. "S1 Teknik Informatika". */
  unit?: string | null;
  /** Tempat bekerja atau jabatan sekarang (alumni). */
  instansi?: string | null;
  foto?: string | null;
  isi: string;
  /** 1..5 */
  rating?: number | null;
  /** Kelompok untuk tab filter, mis. "alumni", "mahasiswa", "mitra". */
  kategori?: string | null;
  tanggal?: string | null;
  /** Video testimoni (YouTube, Vimeo, mp4). */
  video_url?: string | null;
  /** Tandai terverifikasi (mis. alumni terdata di tracer study). */
  terverifikasi?: boolean;
}

export type VarianTestimoni = 'kisi' | 'masonry' | 'carousel' | 'sorotan' | 'kutipan' | 'marquee' | 'daftar';

export interface TestimoniProps {
  items: ItemTestimoni[];
  varian?: VarianTestimoni;
  /** Kolom kisi (kisi, masonry). Bawaan 3; menyesuaikan lebar. */
  kolom?: 2 | 3 | 4;
  /** Tab filter per kategori. `true` = dari kategori yang ada; atau daftar {nilai, label}. */
  filter?: boolean | Array<{ nilai: string; label: string }>;
  /** Tampilkan ringkasan rating di atas. */
  ringkasan?: boolean;
  /** Tampilkan bintang di setiap kartu (bila ada rating). Bawaan true. */
  bintang?: boolean;
  /** Ganti otomatis (carousel, kutipan), dalam milidetik. 0 = mati. */
  otomatis?: number;
  /** Batas karakter isi sebelum dipotong dengan "Selengkapnya" (kisi, carousel, marquee). 0 = tanpa batas. */
  potong?: number;
  loading?: boolean;
  kosong?: React.ReactNode;
  className?: string;
}

const LABEL_KATEGORI: Record<string, string> = { alumni: 'Alumni', mahasiswa: 'Mahasiswa', orang_tua: 'Orang tua', mitra: 'Mitra', dosen: 'Dosen', pengguna: 'Pengguna lulusan' };

function Identitas({ t, besar }: { t: ItemTestimoni; besar?: boolean }) {
  const sub = [t.peran, t.unit].filter(Boolean).join(' · ');
  return (
    <div className="u-testi-orang">
      <Avatar name={t.nama} src={t.foto ?? undefined} size={besar ? 'xl' : 'md'} />
      <span>
        <b>
          {t.nama}
          {t.terverifikasi && <BadgeCheck aria-label="Terverifikasi" className="u-testi-verif" />}
        </b>
        {sub && <small>{sub}</small>}
        {t.instansi && <small className="u-testi-instansi">{t.instansi}</small>}
      </span>
    </div>
  );
}

function IsiTestimoni({ t, potong }: { t: ItemTestimoni; potong: number }) {
  const [buka, setBuka] = React.useState(false);
  const panjang = potong > 0 && t.isi.length > potong;
  return (
    <blockquote className="u-testi-isi">
      <p>{panjang && !buka ? `${t.isi.slice(0, potong).replace(/\s+\S*$/, '')}…` : t.isi}</p>
      {panjang && (
        <button type="button" className="u-testi-lagi" aria-expanded={buka} onClick={() => setBuka((x) => !x)}>
          {buka ? 'Lebih sedikit' : 'Selengkapnya'}
        </button>
      )}
    </blockquote>
  );
}

/** Satu kartu testimoni. */
export function KartuTestimoni({
  t,
  bintang = true,
  potong = 220,
  onVideo,
  varian = 'kartu',
  className,
}: {
  t: ItemTestimoni;
  bintang?: boolean;
  potong?: number;
  onVideo?: (url: string) => void;
  varian?: 'kartu' | 'baris';
  className?: string;
}) {
  return (
    <figure className={cn('u-testi-kartu', className)} data-varian={varian}>
      {varian === 'kartu' && <Quote aria-hidden className="u-testi-petik" />}
      {bintang && t.rating ? <NilaiBintang nilai={t.rating} ukuran="sm" /> : null}
      <IsiTestimoni t={t} potong={potong} />
      <figcaption>
        <Identitas t={t} />
        {t.video_url && onVideo && (
          <button type="button" className="u-testi-video" onClick={() => onVideo(t.video_url!)} aria-label={`Putar video testimoni ${t.nama}`}>
            <Play aria-hidden />
          </button>
        )}
      </figcaption>
    </figure>
  );
}

function useOtomatis(jalan: boolean, ms: number, maju: () => void) {
  const ref = React.useRef(maju);
  ref.current = maju;
  React.useEffect(() => {
    if (!jalan || !ms) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [jalan, ms]);
}

/**
 * Testimoni alumni, mahasiswa, orang tua, atau mitra dengan rating bintang. Tujuh varian: kisi, masonry, carousel
 * (geser + tombol + titik), sorotan (satu besar + daftar), kutipan (satu kutipan besar bergantian), marquee (berjalan
 * pelan, berhenti saat disorot), dan daftar ringkas. Opsional: tab filter per kategori dan ringkasan rating.
 */
export function Testimoni({ items, varian = 'kisi', kolom = 3, filter, ringkasan, bintang = true, otomatis = 0, potong = 220, loading, kosong, className }: TestimoniProps) {
  const [kat, setKat] = React.useState<string>('semua');
  const [video, setVideo] = React.useState<{ url: string; nama: string } | null>(null);
  const opsiFilter = React.useMemo(() => {
    if (!filter) return [];
    if (Array.isArray(filter)) return filter;
    const ada = [...new Set(items.map((t) => t.kategori).filter(Boolean) as string[])];
    return ada.map((k) => ({ nilai: k, label: LABEL_KATEGORI[k] ?? k.charAt(0).toUpperCase() + k.slice(1) }));
  }, [filter, items]);
  const data = kat === 'semua' ? items : items.filter((t) => t.kategori === kat);
  const putar = (t: ItemTestimoni) => (url: string) => setVideo({ url, nama: t.nama });

  const kepala = (ringkasan || opsiFilter.length > 0) && (
    <div className="u-testi-kepala">
      {ringkasan && <RingkasanRating items={data} varian="ringkas" />}
      {opsiFilter.length > 0 && (
        <div className="u-testi-filter" role="tablist" aria-label="Kelompok testimoni">
          {[{ nilai: 'semua', label: 'Semua' }, ...opsiFilter].map((o) => (
            <button key={o.nilai} type="button" role="tab" aria-selected={kat === o.nilai} onClick={() => setKat(o.nilai)}>
              {o.label}
              <span>{o.nilai === 'semua' ? items.length : items.filter((t) => t.kategori === o.nilai).length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  let isi: React.ReactNode;
  if (loading) {
    isi = (
      <div className="u-testi-kisi" data-kolom={kolom}>
        {Array.from({ length: kolom }, (_, i) => (
          <span key={i} className="u-testi-kartu u-skeleton" aria-hidden />
        ))}
      </div>
    );
  } else if (!data.length) {
    isi = <p className="u-testi-kosong">{kosong ?? 'Belum ada testimoni.'}</p>;
  } else if (varian === 'carousel') {
    isi = <CarouselTestimoni items={data} bintang={bintang} potong={potong} otomatis={otomatis} putar={putar} />;
  } else if (varian === 'kutipan') {
    isi = <KutipanTestimoni items={data} bintang={bintang} otomatis={otomatis} putar={putar} />;
  } else if (varian === 'marquee') {
    isi = <MarqueeTestimoni items={data} bintang={bintang} potong={potong} />;
  } else if (varian === 'sorotan') {
    const [utama, ...lain] = data;
    isi = (
      <div className="u-testi-sorotan">
        <figure className="u-testi-utama">
          {utama.foto && <img src={utama.foto} alt="" loading="lazy" className="u-testi-utama-foto" />}
          <div className="u-testi-utama-isi">
            <Quote aria-hidden className="u-testi-petik" />
            {bintang && utama.rating ? <NilaiBintang nilai={utama.rating} /> : null}
            <blockquote className="u-testi-isi">
              <p>{utama.isi}</p>
            </blockquote>
            <figcaption>
              <Identitas t={utama} besar />
              {utama.video_url && (
                <button type="button" className="u-testi-video" onClick={() => putar(utama)(utama.video_url!)} aria-label={`Putar video testimoni ${utama.nama}`}>
                  <Play aria-hidden />
                </button>
              )}
            </figcaption>
          </div>
        </figure>
        {lain.length > 0 && (
          <div className="u-testi-lain">
            {lain.slice(0, 4).map((t, i) => (
              <KartuTestimoni key={t.id ?? i} t={t} bintang={bintang} potong={140} onVideo={putar(t)} varian="baris" />
            ))}
          </div>
        )}
      </div>
    );
  } else if (varian === 'daftar') {
    isi = (
      <div className="u-testi-daftar">
        {data.map((t, i) => (
          <KartuTestimoni key={t.id ?? i} t={t} bintang={bintang} potong={potong} onVideo={putar(t)} varian="baris" />
        ))}
      </div>
    );
  } else {
    isi = (
      <div className={varian === 'masonry' ? 'u-testi-masonry' : 'u-testi-kisi'} data-kolom={kolom}>
        {data.map((t, i) => (
          <KartuTestimoni key={t.id ?? i} t={t} bintang={bintang} potong={varian === 'masonry' ? 0 : potong} onVideo={putar(t)} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('u-testi', className)} data-varian={varian}>
      {kepala}
      {isi}
      <DialogVideo url={video?.url ?? null} judul={video ? `Testimoni ${video.nama}` : ''} tutup={() => setVideo(null)} />
    </div>
  );
}

function CarouselTestimoni({
  items,
  bintang,
  potong,
  otomatis,
  putar,
}: {
  items: ItemTestimoni[];
  bintang: boolean;
  potong: number;
  otomatis: number;
  putar: (t: ItemTestimoni) => (url: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [ke, setKe] = React.useState(0);
  const [jeda, setJeda] = React.useState(false);
  const [halaman, setHalaman] = React.useState(1);
  const ukur = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const kartu = el.firstElementChild as HTMLElement | null;
    const lebar = kartu ? kartu.offsetWidth + 16 : el.clientWidth;
    const perLayar = Math.max(1, Math.round(el.clientWidth / lebar));
    setHalaman(Math.max(1, Math.ceil(items.length / perLayar)));
    setKe(Math.min(Math.round(el.scrollLeft / (lebar * perLayar)), Math.ceil(items.length / perLayar) - 1));
  }, [items.length]);
  React.useEffect(() => {
    ukur();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(ukur);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ukur]);
  const geser = (arah: number | 'awal') => {
    const el = ref.current;
    if (!el) return;
    if (arah === 'awal') return el.scrollTo({ left: 0, behavior: 'smooth' });
    const akhir = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (arah > 0 && akhir) return el.scrollTo({ left: 0, behavior: 'smooth' });
    el.scrollBy({ left: arah * el.clientWidth, behavior: 'smooth' });
  };
  useOtomatis(!jeda && halaman > 1, otomatis, () => geser(1));
  return (
    <div className="u-testi-carousel" onMouseEnter={() => setJeda(true)} onMouseLeave={() => setJeda(false)} onFocus={() => setJeda(true)} onBlur={() => setJeda(false)}>
      <div className="u-testi-rel" ref={ref} onScroll={ukur} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Testimoni">
        {items.map((t, i) => (
          <KartuTestimoni key={t.id ?? i} t={t} bintang={bintang} potong={potong} onVideo={putar(t)} />
        ))}
      </div>
      {halaman > 1 && (
        <div className="u-testi-navigasi">
          <button type="button" aria-label="Sebelumnya" onClick={() => geser(-1)} disabled={ke === 0}>
            <ChevronLeft aria-hidden />
          </button>
          <div className="u-testi-titik" aria-hidden>
            {Array.from({ length: halaman }, (_, i) => (
              <span key={i} data-aktif={i === ke ? '' : undefined} />
            ))}
          </div>
          <span className="u-sr-only" aria-live="polite">
            Halaman {ke + 1} dari {halaman}
          </span>
          <button type="button" aria-label="Berikutnya" onClick={() => geser(1)}>
            <ChevronRight aria-hidden />
          </button>
          {otomatis > 0 && (
            <button type="button" aria-label={jeda ? 'Lanjutkan putar otomatis' : 'Jeda putar otomatis'} onClick={() => setJeda((j) => !j)}>
              {jeda ? <Play aria-hidden /> : <Pause aria-hidden />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function KutipanTestimoni({ items, bintang, otomatis, putar }: { items: ItemTestimoni[]; bintang: boolean; otomatis: number; putar: (t: ItemTestimoni) => (url: string) => void }) {
  const [ke, setKe] = React.useState(0);
  const [jeda, setJeda] = React.useState(false);
  const t = items[Math.min(ke, items.length - 1)];
  useOtomatis(!jeda && items.length > 1, otomatis, () => setKe((k) => (k + 1) % items.length));
  return (
    <div className="u-testi-kutipan" onMouseEnter={() => setJeda(true)} onMouseLeave={() => setJeda(false)} onFocus={() => setJeda(true)} onBlur={() => setJeda(false)}>
      <Quote aria-hidden className="u-testi-petik" />
      <figure key={ke} aria-live="polite">
        <blockquote>
          <p>{t.isi}</p>
        </blockquote>
        {bintang && t.rating ? <NilaiBintang nilai={t.rating} /> : null}
        <figcaption>
          <b>
            {t.nama}
            {t.terverifikasi && <BadgeCheck aria-label="Terverifikasi" className="u-testi-verif" />}
          </b>
          <small>{[t.peran, t.unit, t.instansi].filter(Boolean).join(' · ')}</small>
          {t.video_url && (
            <button type="button" className="u-testi-video-teks" onClick={() => putar(t)(t.video_url!)}>
              <Play aria-hidden /> Tonton video
            </button>
          )}
        </figcaption>
      </figure>
      {items.length > 1 && (
        <div className="u-testi-wajah" role="tablist" aria-label="Pilih testimoni">
          {items.slice(0, 8).map((x, i) => (
            <button key={x.id ?? i} type="button" role="tab" aria-selected={i === ke} aria-label={x.nama} onClick={() => setKe(i)}>
              <Avatar name={x.nama} src={x.foto ?? undefined} size="md" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MarqueeTestimoni({ items, bintang, potong }: { items: ItemTestimoni[]; bintang: boolean; potong: number }) {
  const [jeda, setJeda] = React.useState(false);
  const baris = items.length >= 6 ? [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)] : [items];
  return (
    <div className="u-testi-marquee" data-jeda={jeda ? '' : undefined}>
      {baris.map((b, r) => (
        <div key={r} className="u-testi-pita" data-arah={r % 2 ? 'balik' : undefined} style={{ ['--u-testi-durasi' as string]: `${Math.max(30, b.length * 9)}s` }}>
          <div className="u-testi-jalur">
            {b.map((t, i) => (
              <KartuTestimoni key={`a${t.id ?? i}`} t={t} bintang={bintang} potong={potong || 160} />
            ))}
          </div>
          <div className="u-testi-jalur" aria-hidden inert>
            {b.map((t, i) => (
              <KartuTestimoni key={`b${t.id ?? i}`} t={t} bintang={bintang} potong={potong || 160} />
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="u-testi-jeda" onClick={() => setJeda((j) => !j)} aria-label={jeda ? 'Jalankan testimoni' : 'Hentikan testimoni berjalan'}>
        {jeda ? <Play aria-hidden /> : <Pause aria-hidden />}
      </button>
    </div>
  );
}
