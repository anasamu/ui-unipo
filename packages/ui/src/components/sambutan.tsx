'use client';
import * as React from 'react';
import { ArrowRight, ChevronDown, Play, Quote } from 'lucide-react';
import { cn } from '../lib/cn';
import { Avatar } from './display';
import { Dialog } from './overlays';

// ================================================================ Sambutan pimpinan

export interface PimpinanSambutan {
  nama: string;
  jabatan: string;
  /** URL pas foto (potret, rasio 4:5 paling pas). */
  foto?: string | null;
  /** Unit atau institusi di bawah jabatan, mis. "Universitas Pohuwato". */
  unit?: string | null;
  /** Masa jabatan, mis. "2024–2028". */
  periode?: string | null;
  /** Gambar tanda tangan (PNG transparan) untuk penutup sambutan. */
  tandaTangan?: string | null;
}

export type VarianSambutan = 'klasik' | 'terpisah' | 'sorot' | 'kutipan' | 'kartu' | 'minimal' | 'video';

export interface SambutanPimpinanProps {
  pimpinan: PimpinanSambutan;
  /** Isi sambutan: teks (paragraf dipisah baris kosong), HTML dari server (dibaca sebagai teks), atau elemen. */
  isi: React.ReactNode;
  varian?: VarianSambutan;
  /** Label kecil di atas judul. Bawaan "Sambutan". */
  label?: React.ReactNode;
  /** Judul. Bawaan "Sambutan {jabatan}". */
  judul?: React.ReactNode;
  /** Kutipan pendek yang ditonjolkan. Bawaan kalimat pertama isi. */
  kutipan?: string;
  /** Jumlah paragraf yang tampil sebelum "Baca selengkapnya" (klasik, terpisah, minimal). 0 = semua. Bawaan 3. */
  ringkas?: number;
  /** Tautan halaman sambutan lengkap; bila diisi, tombol membuka tautan ini, bukan memperluas di tempat. */
  tautan?: { href: string; label?: string };
  /** Video sambutan (YouTube, Vimeo, atau berkas https .mp4) untuk varian video. */
  videoUrl?: string | null;
  /** Gambar sampul video; bawaan foto pimpinan. */
  sampulVideo?: string | null;
  /** Posisi foto pada klasik dan terpisah. */
  posisiFoto?: 'kiri' | 'kanan';
  className?: string;
}

/** Ubah HTML sambutan (sudah disaring server) menjadi paragraf teks tanpa innerHTML. */
export function htmlKeParagraf(html: string): string[] {
  const teks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|blockquote)\s*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
  return teks
    .split(/\n\s*\n/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);
}

function paragrafDari(isi: React.ReactNode): React.ReactNode[] {
  if (typeof isi === 'string')
    return /<[a-z][\s\S]*>/i.test(isi)
      ? htmlKeParagraf(isi)
      : isi
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean);
  if (Array.isArray(isi)) return isi;
  return [isi];
}

function kalimatPertama(p: React.ReactNode[]): string {
  const awal = p.find((x) => typeof x === 'string') as string | undefined;
  if (!awal) return '';
  const m = awal.match(/^(.{40,220}?[.!?])(\s|$)/);
  return m ? m[1] : awal.length > 200 ? `${awal.slice(0, 197).trimEnd()}…` : awal;
}

/** Alamat sematan untuk YouTube/Vimeo; berkas https langsung dipakai apa adanya. */
export function sematanVideo(url: string): { jenis: 'iframe' | 'video'; src: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    const yt = u.hostname.replace(/^www\./, '');
    if (yt === 'youtu.be') return { jenis: 'iframe', src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?autoplay=1` };
    if (yt === 'youtube.com' || yt === 'm.youtube.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/\/(embed|shorts)\/([^/?]+)/)?.[2];
      return id ? { jenis: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` } : null;
    }
    if (yt === 'vimeo.com') return { jenis: 'iframe', src: `https://player.vimeo.com/video/${u.pathname.split('/').filter(Boolean)[0]}?autoplay=1` };
    if (/\.(mp4|webm)$/i.test(u.pathname)) return { jenis: 'video', src: u.href };
    return null;
  } catch {
    return null;
  }
}

/** Dialog pemutar video (YouTube, Vimeo, mp4) yang dipakai sambutan dan testimoni. */
export function DialogVideo({ url, judul, tutup }: { url: string | null; judul: string; tutup: () => void }) {
  const s = url ? sematanVideo(url) : null;
  return (
    <Dialog open={Boolean(url)} onOpenChange={(o) => !o && tutup()} title={judul} size="xl">
      <div className="u-video-bingkai">
        {s?.jenis === 'iframe' ? (
          <iframe src={s.src} title={judul} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        ) : s?.jenis === 'video' ? (
          <video src={s.src} controls autoPlay />
        ) : (
          <p>Video tidak bisa diputar di sini.</p>
        )}
      </div>
    </Dialog>
  );
}

function Tandatangan({ p, ttd = true }: { p: PimpinanSambutan; ttd?: boolean }) {
  return (
    <div className="u-sambutan-ttd">
      {ttd && p.tandaTangan && <img src={p.tandaTangan} alt={`Tanda tangan ${p.nama}`} />}
      <b>{p.nama}</b>
      <span>{[p.jabatan, p.unit].filter(Boolean).join(', ')}</span>
      {p.periode && <small>Masa jabatan {p.periode}</small>}
    </div>
  );
}

function Foto({ p, className }: { p: PimpinanSambutan; className?: string }) {
  return p.foto ? (
    <img className={className} src={p.foto} alt={`Foto ${p.nama}, ${p.jabatan}`} loading="lazy" />
  ) : (
    <span className={cn(className, 'u-sambutan-foto-kosong')} aria-hidden>
      <Avatar name={p.nama} size="2xl" />
    </span>
  );
}

/**
 * Sambutan rektor, dekan, ketua prodi, atau kepala unit untuk portal dan landing page. Tujuh varian: klasik (foto +
 * teks bertanda tangan), terpisah (foto penuh setengah layar), sorot (panel gelap dengan kutipan besar), kutipan
 * (kutipan di tengah, teks lengkap di dialog), kartu (ringkas untuk sidebar/beranda), minimal (artikel), dan video.
 */
export function SambutanPimpinan({
  pimpinan: p,
  isi,
  varian = 'klasik',
  label = 'Sambutan',
  judul,
  kutipan,
  ringkas = 3,
  tautan,
  videoUrl,
  sampulVideo,
  posisiFoto = 'kiri',
  className,
}: SambutanPimpinanProps) {
  const paragraf = React.useMemo(() => paragrafDari(isi), [isi]);
  const kutip = kutipan ?? kalimatPertama(paragraf);
  const [lebar, setLebar] = React.useState(false);
  const [dialog, setDialog] = React.useState(false);
  const [video, setVideo] = React.useState<string | null>(null);
  const idIsi = React.useId();
  const judulAkhir = judul ?? `Sambutan ${p.jabatan}`;
  const potong = ringkas > 0 && paragraf.length > ringkas && !lebar;
  const tampil = potong ? paragraf.slice(0, ringkas) : paragraf;

  const teks = (
    <div className="u-sambutan-teks" id={idIsi} data-potong={potong ? '' : undefined}>
      {tampil.map((x, i) => (typeof x === 'string' ? <p key={i}>{x}</p> : <React.Fragment key={i}>{x}</React.Fragment>))}
    </div>
  );
  const tombolLanjut = tautan ? (
    <a className="u-sambutan-lanjut" href={tautan.href}>
      {tautan.label ?? 'Baca sambutan lengkap'}
      <ArrowRight aria-hidden />
    </a>
  ) : ringkas > 0 && paragraf.length > ringkas ? (
    <button type="button" className="u-sambutan-lanjut" aria-expanded={lebar} aria-controls={idIsi} onClick={() => setLebar((x) => !x)}>
      {lebar ? 'Tampilkan lebih sedikit' : 'Baca selengkapnya'}
      <ChevronDown aria-hidden data-buka={lebar ? '' : undefined} />
    </button>
  ) : null;
  const tombolDialog = tautan ? (
    tombolLanjut
  ) : (
    <button type="button" className="u-sambutan-lanjut" onClick={() => setDialog(true)}>
      Baca sambutan lengkap
      <ArrowRight aria-hidden />
    </button>
  );
  const dialogLengkap = (
    <Dialog open={dialog} onOpenChange={setDialog} title={judulAkhir} description={`${p.nama} · ${p.jabatan}`} size="lg">
      <div className="u-sambutan-dialog">
        {paragraf.map((x, i) => (typeof x === 'string' ? <p key={i}>{x}</p> : <React.Fragment key={i}>{x}</React.Fragment>))}
        <Tandatangan p={p} />
      </div>
    </Dialog>
  );
  const kepala = (
    <header className="u-sambutan-kepala">
      {label && <span className="u-sambutan-label">{label}</span>}
      <h2>{judulAkhir}</h2>
    </header>
  );

  if (varian === 'kutipan' || varian === 'sorot') {
    return (
      <section className={cn('u-sambutan', className)} data-varian={varian} aria-label={typeof judulAkhir === 'string' ? judulAkhir : undefined}>
        {varian === 'sorot' && (
          <div className="u-sambutan-sorot-foto">
            <Foto p={p} />
          </div>
        )}
        <div className="u-sambutan-badan">
          {varian === 'sorot' && label && <span className="u-sambutan-label">{label}</span>}
          <Quote aria-hidden className="u-sambutan-petik" />
          <blockquote>
            <p>{kutip}</p>
          </blockquote>
          <div className="u-sambutan-oleh">
            {varian === 'kutipan' && <Avatar name={p.nama} src={p.foto ?? undefined} size="lg" />}
            <span>
              <b>{p.nama}</b>
              <small>{[p.jabatan, p.unit].filter(Boolean).join(' · ')}</small>
            </span>
          </div>
          {paragraf.length > 0 && tombolDialog}
        </div>
        {dialogLengkap}
      </section>
    );
  }

  if (varian === 'kartu') {
    return (
      <section className={cn('u-sambutan', className)} data-varian="kartu" aria-label={typeof judulAkhir === 'string' ? judulAkhir : undefined}>
        <div className="u-sambutan-oleh">
          <Avatar name={p.nama} src={p.foto ?? undefined} size="xl" />
          <span>
            {label && <span className="u-sambutan-label">{label}</span>}
            <b>{p.nama}</b>
            <small>{p.jabatan}</small>
          </span>
        </div>
        <p className="u-sambutan-cuplik">{typeof paragraf[0] === 'string' ? paragraf[0] : kutip}</p>
        {tombolDialog}
        {dialogLengkap}
      </section>
    );
  }

  if (varian === 'video') {
    const sampul = sampulVideo ?? p.foto;
    return (
      <section className={cn('u-sambutan', className)} data-varian="video" aria-label={typeof judulAkhir === 'string' ? judulAkhir : undefined}>
        <button type="button" className="u-sambutan-video" disabled={!videoUrl} onClick={() => videoUrl && setVideo(videoUrl)} aria-label={`Putar video sambutan ${p.nama}`}>
          {sampul ? <img src={sampul} alt="" loading="lazy" /> : <span className="u-sambutan-foto-kosong" />}
          <span className="u-sambutan-putar">
            <Play aria-hidden />
          </span>
        </button>
        <div className="u-sambutan-badan">
          {kepala}
          <blockquote className="u-sambutan-kutip-kecil">
            <p>{kutip}</p>
          </blockquote>
          <Tandatangan p={p} ttd={false} />
          {paragraf.length > 0 && tombolDialog}
        </div>
        {dialogLengkap}
        <DialogVideo url={video} judul={`Sambutan ${p.jabatan}`} tutup={() => setVideo(null)} />
      </section>
    );
  }

  if (varian === 'minimal') {
    return (
      <article className={cn('u-sambutan', className)} data-varian="minimal">
        {kepala}
        {teks}
        {tombolLanjut}
        <div className="u-sambutan-oleh">
          <Avatar name={p.nama} src={p.foto ?? undefined} size="lg" />
          <Tandatangan p={p} />
        </div>
      </article>
    );
  }

  // klasik dan terpisah
  return (
    <section className={cn('u-sambutan', className)} data-varian={varian} data-foto={posisiFoto} aria-label={typeof judulAkhir === 'string' ? judulAkhir : undefined}>
      <figure className="u-sambutan-figur">
        <Foto p={p} className="u-sambutan-foto" />
        {varian === 'klasik' && (
          <figcaption>
            <b>{p.nama}</b>
            <small>{p.jabatan}</small>
          </figcaption>
        )}
      </figure>
      <div className="u-sambutan-badan">
        {kepala}
        {varian === 'terpisah' && kutipan && (
          <blockquote className="u-sambutan-kutip-kecil">
            <p>{kutipan}</p>
          </blockquote>
        )}
        {teks}
        {tombolLanjut}
        <Tandatangan p={p} />
      </div>
    </section>
  );
}
