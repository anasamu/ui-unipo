'use client';
import * as React from 'react';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Puzzle } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { Badge, Button, type ButtonVariant } from './actions';
import { Animasi } from './animasi';
import { Faq } from './faq';
import { Ilustrasi } from '../ikon/ilustrasi';
import { CtaBand, FactBoard, Gallery, SocialLinks, StatStrip, TestimonialGrid } from './landing';
import { Footer } from './kaki-situs';
import { Peta } from './peta';
import {
  IKON_LANDING,
  SKEMA_BLOK,
  gambarAman,
  normalisasiDokumen,
  urlAman,
  type BlokLanding,
  type DokumenLanding,
  type IsiBlok,
  type TombolLanding,
} from './landing-skema';

/**
 * Renderer halaman landing dari data (pembangun halaman di Pengaturan tema). Satu renderer untuk halaman publik,
 * kanvas penyunting, dan pratinjau versi, jadi yang terlihat saat menyunting sama dengan yang tampil ke pengunjung.
 */

// ---------------------------------------------------------------- teks ringan aman

/** Tautan biasa (tanpa aksi:<kunci>) untuk teks, logo, kaki halaman, dan media sosial. */
const hrefAman = (u: unknown) => {
  const v = urlAman(u);
  return v && !v.startsWith('aksi:') ? v : undefined;
};

const POLA_INLINE = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]{1,200})\]\(([^)\s]{1,500})\)/g;

function inline(teks: string, kunci: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let akhir = 0;
  let n = 0;
  for (const m of teks.matchAll(POLA_INLINE)) {
    if (m.index! > akhir) out.push(teks.slice(akhir, m.index));
    const k = `${kunci}-${n++}`;
    if (m[1]) out.push(<strong key={k}>{m[1]}</strong>);
    else if (m[2]) out.push(<em key={k}>{m[2]}</em>);
    else {
      const href = hrefAman(m[4]);
      const luar = href && /^https?:/i.test(href);
      out.push(href ? <a key={k} href={href} {...(luar ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[3]}</a> : m[3]);
    }
    akhir = m.index! + m[0].length;
  }
  if (akhir < teks.length) out.push(teks.slice(akhir));
  return out;
}

/**
 * Teks dengan pemformatan ringan tanpa HTML: paragraf (baris kosong), `**tebal**`, `*miring*`, `[teks](alamat)`
 * (alamat disaring urlAman), dan baris berawalan "- " menjadi daftar. Tidak pernah memakai innerHTML.
 */
export function TeksRingan({ teks, className }: { teks?: unknown; className?: string }) {
  if (typeof teks !== 'string' || !teks.trim()) return null;
  const blok = teks.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  return (
    <div className={cn('ul-teks', className)}>
      {blok.map((p, i) => {
        const baris = p.split('\n');
        if (baris.every((b) => /^\s*[-•]\s+/.test(b)))
          return (
            <ul key={i}>
              {baris.map((b, j) => (
                <li key={j}>{inline(b.replace(/^\s*[-•]\s+/, ''), `${i}-${j}`)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            {baris.map((b, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(b, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- konteks

export interface ButirAngka {
  nilai: string;
  label: string;
  keterangan?: string;
  ikon?: string;
}

export interface PenyediaLanding {
  /** Blok `kabar`: berita/pengumuman/agenda (unipo-ui/siakad memasang penyedia dari /v1/portal). */
  Kabar?: React.ComponentType<{ isi: IsiBlok; pratinjau?: boolean }>;
  /** Blok `statistik` bersumber kampus: memanggil `render(butir)` dengan angka dari SIAKAD. */
  StatistikKampus?: React.ComponentType<{ isi: IsiBlok; render: (butir: ButirAngka[] | null, memuat: boolean) => React.ReactNode }>;
}

export interface SlotLanding {
  /** Nama bagian di penyunting, mis. "Katalog kelas terbuka". */
  label: string;
  keterangan?: string;
  /** Isi bagian. Bila kosong, penyunting menampilkan penanda. */
  render?: React.ReactNode | ((isi: IsiBlok) => React.ReactNode);
  /** Data bagian ini sedang kosong: seluruh blok (termasuk judulnya) tidak tampil ke pengunjung. */
  kosong?: boolean;
}

/** Aksi milik aplikasi yang bisa dipasang ke tombol lewat alamat `aksi:<kunci>` (mis. aksi:masuk). */
export interface AksiLanding {
  /** Nama aksi di penyunting, mis. "Masuk SSO / buka beranda". */
  label: string;
  href?: string;
  onClick?: () => void;
  /** Ganti label tombol (mis. "Lanjut belajar" bila pengunjung sudah masuk). */
  labelTombol?: string;
}

export interface HalamanLandingProps {
  dokumen: DokumenLanding | null | undefined;
  /** Peta `uuid → URL` untuk gambar `berkas:<uuid>` (dari API halaman). */
  berkas?: Record<string, string> | null;
  /** Bagian data milik aplikasi (blok `slot`), mis. { 'kelas-terbuka': { label, render } }. */
  slot?: Record<string, SlotLanding>;
  penyedia?: PenyediaLanding;
  /** Aksi untuk tombol beralamat `aksi:<kunci>`; tombol dengan aksi yang tidak tersedia tidak ditampilkan. */
  aksi?: Record<string, AksiLanding>;
  /** Logo aplikasi untuk blok kaki halaman. */
  merek?: React.ReactNode;
  /** Nama untuk hak cipta di kaki halaman. */
  namaHakCipta?: React.ReactNode;
  /** Mode penyunting: penanda untuk bagian kosong, klik memilih blok, tautan tidak berpindah halaman. */
  pratinjau?: boolean;
  terpilih?: string | null;
  onPilih?: (id: string) => void;
  className?: string;
}

interface Konteks extends Omit<HalamanLandingProps, 'dokumen' | 'className' | 'onPilih' | 'terpilih'> {}
const KonteksLanding = React.createContext<Konteks>({});

/** Nilai CSS url() yang aman: kutip, garis miring balik, dan baris baru dibuang. */
const cssUrl = (u: string) => `url("${u.replace(/["\\\n\r]/g, '')}")`;
const s = (v: unknown) => (typeof v === 'string' ? v : '');
const daftar = <T = Record<string, unknown>,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : []);

function Penanda({ judul, teks }: { judul: React.ReactNode; teks?: React.ReactNode }) {
  return (
    <div className="ul-penanda" role="note">
      <Puzzle aria-hidden />
      <div>
        <strong>{judul}</strong>
        {teks && <p>{teks}</p>}
      </div>
    </div>
  );
}

function isiSlot(def: SlotLanding | undefined, isi: IsiBlok): React.ReactNode {
  const r = def?.render;
  return (typeof r === 'function' ? r(isi) : r) ?? null;
}

const VARIAN_TOMBOL: Record<string, ButtonVariant> = { utama: 'primary', garis: 'outline', teks: 'link', aksen: 'secondary' };

function useTautan() {
  const { aksi } = React.useContext(KonteksLanding);
  return React.useCallback(
    (url: unknown): { href?: string; onClick?: () => void; label?: string } | null => {
      const u = urlAman(url);
      if (!u) return null;
      if (u.startsWith('aksi:')) {
        const a = aksi?.[u.slice(5)];
        return a && (a.href || a.onClick) ? { href: a.href ? urlAman(a.href) : undefined, onClick: a.onClick, label: a.labelTombol } : null;
      }
      return { href: u };
    },
    [aksi],
  );
}

function DeretTombol({ tombol, ukuran = 'lg', className }: { tombol: unknown; ukuran?: 'md' | 'lg'; className?: string }) {
  const { pratinjau } = React.useContext(KonteksLanding);
  const tautan = useTautan();
  const t = daftar<TombolLanding>(tombol).filter((x) => s(x.label));
  const isi = t.map((x, i) => ({ x, i, t: tautan(x.url) })).filter((b) => b.t || pratinjau);
  if (!isi.length) return null;
  return (
    <div className={cn('ul-tombol', className)}>
      {isi.map(({ x, i, t: tuju }) => {
        const varian = VARIAN_TOMBOL[x.gaya ?? (i === 0 ? 'utama' : 'garis')] ?? 'primary';
        const luar = !!tuju?.href && /^https?:/i.test(tuju.href);
        const label = (
          <>
            {tuju?.label ?? x.label}
            {x.gaya === 'teks' && <ArrowRight aria-hidden />}
            {luar && x.baru && <ExternalLink aria-hidden />}
          </>
        );
        if (tuju?.href)
          return (
            <Button key={i} size={ukuran} variant={varian} onClick={tuju.onClick} render={<a href={tuju.href} {...(x.baru ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />}>
              {label}
            </Button>
          );
        return (
          <Button key={i} size={ukuran} variant={varian} onClick={tuju?.onClick} disabled={!tuju}>
            {label}
          </Button>
        );
      })}
    </div>
  );
}

/** Kepala bagian (label kecil, judul, keterangan). Tidak dirender bila semuanya kosong. */
function Kepala({ isi, aksi }: { isi: IsiBlok; aksi?: React.ReactNode }) {
  if (!s(isi.eyebrow) && !s(isi.judul) && !s(isi.deskripsi) && !aksi) return null;
  return (
    <header className="ul-kepala">
      <div className="ul-kepala-teks">
        {s(isi.eyebrow) && <p className="ul-eyebrow">{s(isi.eyebrow)}</p>}
        {s(isi.judul) && <h2 className="ul-judul">{s(isi.judul)}</h2>}
        {s(isi.deskripsi) && <p className="ul-desk">{s(isi.deskripsi)}</p>}
      </div>
      {aksi && <div className="ul-kepala-aksi">{aksi}</div>}
    </header>
  );
}

/** Animasi muncul saat digulir; mati di penyunting (isi harus selalu terlihat) dan bila gaya.animasi = false. */
const AnimasiAktif = React.createContext(true);
function Muncul({ as = 'div', tunda, className, children }: { as?: 'div' | 'li'; tunda?: number; className?: string; children: React.ReactNode }) {
  const aktif = React.useContext(AnimasiAktif);
  if (!aktif) return React.createElement(as, { className }, children);
  return (
    <Animasi as={as} jenis="masuk" tunda={tunda} pemicu="terlihat" className={className}>
      {children}
    </Animasi>
  );
}

function Ikon({ nama }: { nama: unknown }) {
  const I = IKON_LANDING[s(nama)]?.Ikon ?? IKON_LANDING.bintang!.Ikon;
  return <I aria-hidden />;
}

// ---------------------------------------------------------------- blok

function BlokHero({ isi }: { isi: IsiBlok }) {
  const { berkas, slot, pratinjau } = React.useContext(KonteksLanding);
  const tata = s(isi.tata) || 'belah';
  const gambar = gambarAman(isi.gambar, berkas);
  const media = tata === 'tengah' ? 'tanpa' : s(isi.media) || 'ilustrasi';
  const angka = daftar<{ nilai?: string; label?: string }>(isi.angka).filter((a) => s(a.nilai));
  const varian = tata === 'gambar' ? 'image' : tata === 'tengah' ? 'plain' : 'split';
  return (
    <div className="u-hero ul-hero" data-variant={varian} style={varian === 'image' && gambar ? ({ '--hero-image': cssUrl(gambar) } as React.CSSProperties) : undefined}>
      <div className="u-hero-grid">
        <div className="u-hero-text">
          {s(isi.lencana) && (
            <div className="u-hero-announce">
              <Badge variant="primary" dot>
                {s(isi.lencana)}
              </Badge>
            </div>
          )}
          <h1 className="u-hero-title">
            {s(isi.judul)}
            {s(isi.sorot) && (
              <>
                {' '}
                <span className="ul-sorot">{s(isi.sorot)}</span>
              </>
            )}
          </h1>
          {s(isi.deskripsi) && <p className="u-hero-desc">{s(isi.deskripsi)}</p>}
          <DeretTombol tombol={isi.tombol} className="u-hero-actions" />
          {s(isi.catatan) && <p className="ul-catatan">{s(isi.catatan)}</p>}
          {angka.length > 0 && (
            <dl className="u-hero-stats">
              {angka.map((a, i) => (
                <div key={i}>
                  <dt>{s(a.label)}</dt>
                  <dd>{s(a.nilai)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {varian === 'split' && media !== 'tanpa' && (
          <div className="u-hero-media ul-hero-media">
            {media === 'slot' ? (
              isiSlot(slot?.[s(isi.slot)], isi) ?? (pratinjau ? <Penanda judul={slot?.[s(isi.slot)]?.label ?? 'Pilih bagian data aplikasi'} teks="Diisi otomatis oleh aplikasi." /> : null)
            ) : media === 'gambar' ? (
              gambar ? <img src={gambar} alt="" /> : <div className="ul-gambar-kosong" aria-hidden />
            ) : (
              <Animasi jenis="mengambang">
                <Ilustrasi nama={s(isi.ilustrasi) || 'portal'} lebar={440} nada="primary" />
              </Animasi>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BlokFitur({ isi }: { isi: IsiBlok }) {
  const tautan = useTautan();
  const butir = daftar<{ ikon?: string; judul?: string; teks?: string; url?: string }>(isi.butir).filter((b) => s(b.judul));
  return (
    <>
      <Kepala isi={isi} />
      <ul className="ul-fitur" data-kolom={String(isi.kolom ?? 3)} data-tampilan={s(isi.tampilan) || 'kartu'}>
        {butir.map((b, i) => {
          const href = tautan(b.url)?.href;
          const isiButir = (
            <>
              <span className="u-feature-icon" aria-hidden>
                <Ikon nama={b.ikon} />
              </span>
              <p className="u-feature-title">{s(b.judul)}</p>
              {s(b.teks) && <p className="u-feature-text">{s(b.teks)}</p>}
              {href && (
                <span className="ul-fitur-tautan">
                  Selengkapnya <ArrowRight aria-hidden />
                </span>
              )}
            </>
          );
          return (
            <Muncul as="li" key={i} tunda={i} className="ul-fitur-butir">
              {href ? (
                <a href={href} className="ul-fitur-isi">
                  {isiButir}
                </a>
              ) : (
                <div className="ul-fitur-isi">{isiButir}</div>
              )}
            </Muncul>
          );
        })}
      </ul>
    </>
  );
}

function DeretAngka({ butir, tampilan }: { butir: ButirAngka[]; tampilan: string }) {
  if (tampilan === 'papan') return <FactBoard items={butir.map((b) => ({ label: b.label, value: b.nilai, hint: b.keterangan || undefined }))} />;
  if (tampilan === 'kartu')
    return (
      <ul className="ul-angka-kartu">
        {butir.map((b, i) => (
          <Muncul as="li" key={i} tunda={i}>
            <span className="u-feature-icon" aria-hidden>
              <Ikon nama={b.ikon} />
            </span>
            <strong>{b.nilai}</strong>
            <span>{b.label}</span>
            {b.keterangan && <small>{b.keterangan}</small>}
          </Muncul>
        ))}
      </ul>
    );
  return <StatStrip className="ul-angka-pita" items={butir.map((b) => ({ value: b.nilai, label: b.label }))} />;
}

function BlokStatistik({ isi }: { isi: IsiBlok }) {
  const { penyedia, pratinjau } = React.useContext(KonteksLanding);
  const tampilan = s(isi.tampilan) || 'pita';
  if (s(isi.sumber) === 'kampus') {
    const P = penyedia?.StatistikKampus;
    return (
      <>
        <Kepala isi={isi} />
        {P ? (
          <P isi={isi} render={(b, memuat) => (memuat ? <div className="ul-memuat u-skeleton" aria-busy="true" aria-label="Memuat angka" /> : b?.length ? <DeretAngka butir={b} tampilan={tampilan} /> : pratinjau ? <Penanda judul="Angka kampus belum tersedia" teks="Data SIAKAD tidak dapat dibaca dari aplikasi ini. Pilih sumber Diisi sendiri." /> : null)} />
        ) : pratinjau ? (
          <Penanda judul="Angka otomatis dari SIAKAD" teks="Tampil di halaman yang terhubung ke SIAKAD." />
        ) : null}
      </>
    );
  }
  const butir = daftar<ButirAngka>(isi.butir).filter((b) => s(b.nilai));
  return (
    <>
      <Kepala isi={isi} />
      {butir.length > 0 && <DeretAngka butir={butir} tampilan={tampilan} />}
    </>
  );
}

function BlokLangkah({ isi }: { isi: IsiBlok }) {
  const butir = daftar<{ judul?: string; teks?: string }>(isi.butir).filter((b) => s(b.judul));
  return (
    <>
      <Kepala isi={isi} />
      <ol className="ul-langkah" data-tampilan={s(isi.tampilan) || 'alur'} style={{ '--n': butir.length } as React.CSSProperties}>
        {butir.map((b, i) => (
          <Muncul as="li" key={i} tunda={i}>
            <span className="ul-langkah-no" aria-hidden>
              {i + 1}
            </span>
            <div>
              <strong>{s(b.judul)}</strong>
              {s(b.teks) && <p>{s(b.teks)}</p>}
            </div>
          </Muncul>
        ))}
      </ol>
    </>
  );
}

function BlokKabar({ isi }: { isi: IsiBlok }) {
  const { penyedia, pratinjau } = React.useContext(KonteksLanding);
  const href = useTautan()(isi.semua_url)?.href;
  const P = penyedia?.Kabar;
  return (
    <>
      <Kepala
        isi={isi}
        aksi={
          href ? (
            <Button variant="link" render={<a href={href} />}>
              {s(isi.semua_label) || 'Lihat semua'} <ArrowRight aria-hidden />
            </Button>
          ) : undefined
        }
      />
      {P ? <P isi={isi} pratinjau={pratinjau} /> : pratinjau ? <Penanda judul={`${s(isi.jenis) === 'agenda' ? 'Agenda' : s(isi.jenis) === 'pengumuman' ? 'Pengumuman' : 'Berita'} terbaru dari portal Humas`} teks="Tampil otomatis di halaman yang terhubung ke SIAKAD." /> : null}
    </>
  );
}

function BlokAjakan({ isi }: { isi: IsiBlok }) {
  const nada = ({ utama: 'primary', lembut: 'soft', gelap: 'dark' } as const)[s(isi.nada) as 'utama'] ?? 'primary';
  return <CtaBand tone={nada} title={s(isi.judul)} description={s(isi.deskripsi) || undefined} actions={<DeretTombol tombol={isi.tombol} />} />;
}

function BlokFaq({ isi }: { isi: IsiBlok }) {
  const butir = daftar<{ tanya?: string; jawab?: string }>(isi.butir).filter((b) => s(b.tanya));
  const tampilan = s(isi.tampilan) || 'garis';
  const items = butir.map((b, i) => ({ id: i, question: s(b.tanya), answer: <TeksRingan teks={b.jawab} />, searchText: `${s(b.tanya)} ${s(b.jawab)}` }));
  if (tampilan === 'dua')
    return (
      <div className="ul-dua">
        <Kepala isi={isi} />
        <Faq items={items} variant="line" searchable={!!isi.cari} />
      </div>
    );
  return (
    <>
      <Kepala isi={isi} />
      <div className="ul-faq" data-tampilan={tampilan}>
        <Faq items={items} variant={tampilan === 'kartu' ? 'card' : 'line'} openFirst={tampilan === 'kartu'} searchable={!!isi.cari} />
      </div>
    </>
  );
}

function BlokTestimoni({ isi }: { isi: IsiBlok }) {
  const { berkas } = React.useContext(KonteksLanding);
  const butir = daftar<{ kutipan?: string; nama?: string; peran?: string; foto?: string; bintang?: number }>(isi.butir).filter((b) => s(b.kutipan) && s(b.nama));
  return (
    <>
      <Kepala isi={isi} />
      <TestimonialGrid items={butir.map((b, i) => ({ id: i, quote: s(b.kutipan), name: s(b.nama), role: s(b.peran) || undefined, avatar: gambarAman(b.foto, berkas) ?? null, rating: Number(b.bintang) || null }))} />
    </>
  );
}

function BlokLogo({ isi }: { isi: IsiBlok }) {
  const { berkas, pratinjau } = React.useContext(KonteksLanding);
  const butir = daftar<{ gambar?: string; nama?: string; url?: string }>(isi.butir).map((b) => ({ ...b, src: gambarAman(b.gambar, berkas) })).filter((b) => b.src);
  return (
    <>
      <Kepala isi={isi} />
      {butir.length ? (
        <ul className="ul-logo" data-tampilan={s(isi.tampilan) || 'abu'}>
          {butir.map((b, i) => {
            const href = hrefAman(b.url);
            const img = <img src={b.src} alt={s(b.nama)} loading="lazy" />;
            return (
              <li key={i} title={s(b.nama) || undefined}>
                {href ? (
                  <a href={href} target={/^https?:/.test(href) ? '_blank' : undefined} rel="noopener noreferrer">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </li>
            );
          })}
        </ul>
      ) : pratinjau ? (
        <Penanda judul="Belum ada logo" teks="Tambahkan logo mitra di panel properti." />
      ) : null}
    </>
  );
}

function BlokGaleri({ isi }: { isi: IsiBlok }) {
  const { berkas, pratinjau } = React.useContext(KonteksLanding);
  const butir = daftar<{ gambar?: string; keterangan?: string }>(isi.butir)
    .map((b) => ({ src: gambarAman(b.gambar, berkas) ?? '', caption: s(b.keterangan) || undefined, alt: s(b.keterangan) }))
    .filter((b) => b.src);
  return (
    <>
      <Kepala isi={isi} />
      {butir.length ? <Gallery items={butir} max={16} /> : pratinjau ? <Penanda judul="Belum ada foto" teks="Tambahkan foto dari Kelola berkas di panel properti." /> : null}
    </>
  );
}

function BlokKontak({ isi }: { isi: IsiBlok }) {
  const { pratinjau } = React.useContext(KonteksLanding);
  const lat = Number(isi.lintang);
  const lng = Number(isi.bujur);
  const adaPeta = Number.isFinite(lat) && Number.isFinite(lng) && isi.lintang != null && isi.bujur != null && !(lat === 0 && lng === 0);
  const arah = hrefAman(isi.peta_url);
  const wa = s(isi.whatsapp).replace(/\D/g, '').replace(/^0/, '62');
  const baris: Array<[React.ReactNode, React.ReactNode]> = [];
  if (s(isi.alamat)) baris.push([<MapPin key="i" aria-hidden />, <TeksRingan key="t" teks={isi.alamat} />]);
  if (s(isi.telepon)) baris.push([<Phone key="i" aria-hidden />, <a key="t" href={`tel:${s(isi.telepon).replace(/[^\d+]/g, '')}`}>{s(isi.telepon)}</a>]);
  if (wa) baris.push([<MessageCircle key="i" aria-hidden />, <a key="t" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp {s(isi.whatsapp)}</a>]);
  if (s(isi.surel)) baris.push([<Mail key="i" aria-hidden />, <a key="t" href={`mailto:${s(isi.surel)}`}>{s(isi.surel)}</a>]);
  if (s(isi.jam)) baris.push([<Clock key="i" aria-hidden />, <span key="t">{s(isi.jam)}</span>]);
  const sosial = daftar<{ jenis?: string; url?: string }>(isi.sosial).flatMap((x) => (hrefAman(x.url) ? [{ jenis: s(x.jenis) || 'website', url: hrefAman(x.url)! }] : []));
  return (
    <div className="ul-kontak" data-peta={dataFlag(adaPeta)}>
      <div className="ul-kontak-info">
        <Kepala isi={isi} />
        {baris.length > 0 && (
          <ul className="ul-kontak-daftar">
            {baris.map(([ikon, isiBaris], i) => (
              <li key={i}>
                {ikon}
                <div>{isiBaris}</div>
              </li>
            ))}
          </ul>
        )}
        {arah && (
          <Button variant="outline" render={<a href={arah} target="_blank" rel="noopener noreferrer" />}>
            <MapPin aria-hidden /> Petunjuk arah
          </Button>
        )}
        <SocialLinks items={sosial} />
      </div>
      {adaPeta &&
        (pratinjau ? (
          <div className="ul-peta-pratinjau" role="img" aria-label="Peta lokasi">
            <MapPin aria-hidden />
            <span>
              Peta {lat.toFixed(4)}, {lng.toFixed(4)}
            </span>
          </div>
        ) : (
          <Peta className="ul-peta" pusat={{ lat, lng }} zoom={16} tinggi={360} penanda={[{ id: 'lokasi', lat, lng, label: s(isi.judul) || 'Lokasi' }]} aria-label="Peta lokasi" />
        ))}
    </div>
  );
}

function BlokTeks({ isi }: { isi: IsiBlok }) {
  return (
    <>
      <Kepala isi={{ eyebrow: isi.eyebrow, judul: isi.judul }} />
      <TeksRingan teks={isi.isi} className="ul-prosa" />
    </>
  );
}

function BlokMedia({ isi }: { isi: IsiBlok }) {
  const { berkas } = React.useContext(KonteksLanding);
  const gambar = gambarAman(isi.gambar, berkas);
  const poin = daftar<{ teks?: string }>(isi.poin).filter((p) => s(p.teks));
  return (
    <div className="ul-media" data-posisi={s(isi.posisi) || 'kanan'}>
      <div className="ul-media-teks">
        <Kepala isi={{ eyebrow: isi.eyebrow, judul: isi.judul }} />
        <TeksRingan teks={isi.isi} className="ul-prosa" />
        {poin.length > 0 && (
          <ul className="ul-poin">
            {poin.map((p, i) => (
              <li key={i}>
                <CheckCircle2 aria-hidden /> {s(p.teks)}
              </li>
            ))}
          </ul>
        )}
        <DeretTombol tombol={isi.tombol} ukuran="md" />
      </div>
      <div className="ul-media-gambar">{gambar ? <img src={gambar} alt={s(isi.alt)} loading="lazy" /> : <div className="ul-gambar-kosong" aria-hidden />}</div>
    </div>
  );
}

function BlokKaki({ isi }: { isi: IsiBlok }) {
  const { merek, namaHakCipta } = React.useContext(KonteksLanding);
  const tautan = daftar<{ label?: string; url?: string }>(isi.tautan).flatMap((t, i) => (s(t.label) && hrefAman(t.url) ? [{ key: String(i), label: s(t.label), href: hrefAman(t.url)!, external: /^https?:/.test(hrefAman(t.url)!) }] : []));
  const sosial = daftar<{ jenis?: string; url?: string }>(isi.sosial).flatMap((x) => (hrefAman(x.url) ? [{ jenis: s(x.jenis) || 'website', url: hrefAman(x.url)! }] : []));
  const tampilan = (s(isi.tampilan) || 'ringkas') as 'terang' | 'gelap' | 'ringkas';
  return (
    <Footer
      variant={tampilan}
      brand={isi.logo === false ? <span /> : (merek ?? <strong>Universitas Pohuwato</strong>)}
      description={s(isi.teks) || undefined}
      columns={tampilan === 'ringkas' || !tautan.length ? undefined : [{ title: 'Tautan', items: tautan }]}
      tautanBawah={tampilan === 'ringkas' ? tautan : undefined}
      sosial={sosial}
      namaHakCipta={namaHakCipta ?? 'Universitas Pohuwato'}
      keAtas={false}
    />
  );
}

function BlokSlot({ isi }: { isi: IsiBlok }) {
  const { slot, pratinjau } = React.useContext(KonteksLanding);
  const k = s(isi.kunci);
  const def = slot?.[k];
  const konten = isiSlot(def, isi);
  return (
    <>
      <Kepala isi={isi} />
      {konten || (pratinjau ? <Penanda judul={def?.label ?? (k ? `Bagian "${k}"` : 'Pilih bagian data aplikasi')} teks={def ? (def.keterangan ?? 'Diisi otomatis oleh aplikasi.') : k ? 'Aplikasi ini belum menyediakan bagian tersebut; blok tidak tampil ke pengunjung.' : 'Pilih bagian di panel properti.'} /> : null)}
    </>
  );
}

const RENDER: Record<BlokLanding['tipe'], React.ComponentType<{ isi: IsiBlok }>> = {
  hero: BlokHero,
  fitur: BlokFitur,
  statistik: BlokStatistik,
  langkah: BlokLangkah,
  kabar: BlokKabar,
  ajakan: BlokAjakan,
  faq: BlokFaq,
  testimoni: BlokTestimoni,
  logo: BlokLogo,
  galeri: BlokGaleri,
  kontak: BlokKontak,
  teks: BlokTeks,
  media: BlokMedia,
  kaki: BlokKaki,
  slot: BlokSlot,
};

class BatasGalatBlok extends React.Component<{ label: string; pratinjau?: boolean; children: React.ReactNode }, { galat: boolean }> {
  state = { galat: false };
  static getDerivedStateFromError() {
    return { galat: true };
  }
  render() {
    if (this.state.galat) return this.props.pratinjau ? <Penanda judul={`${this.props.label} tidak dapat ditampilkan`} teks="Periksa isian blok ini di panel properti." /> : null;
    return this.props.children;
  }
}

/** Satu blok dengan pembungkus gaya (latar, jarak, lebar, perataan, sembunyi di ponsel/desktop, jangkar). */
export function BlokLandingView({ blok, terpilih, onPilih }: { blok: BlokLanding; terpilih?: boolean; onPilih?: (id: string) => void }) {
  const k = React.useContext(KonteksLanding);
  const R = RENDER[blok.tipe];
  // Bagian data aplikasi yang tidak disediakan aplikasi ini atau datanya kosong tidak tampil ke pengunjung.
  if (blok.tipe === 'slot' && !k.pratinjau) {
    const def = k.slot?.[String(blok.isi?.kunci ?? '')];
    if (!def || def.kosong) return null;
  }
  const g = blok.gaya ?? {};
  const latarGambar = g.latar === 'gambar' ? gambarAman(g.latar_gambar, k.berkas) : undefined;
  const lebar = g.lebar ?? (blok.tipe === 'kaki' ? 'penuh' : 'normal');
  const jangkar = g.jangkar && /^[a-z0-9][a-z0-9_-]{0,39}$/.test(g.jangkar) ? g.jangkar : undefined;
  const pilih = onPilih
    ? (e: React.MouseEvent) => {
        e.preventDefault();
        onPilih(blok.id);
      }
    : undefined;
  return (
    <section
      id={jangkar}
      className="ul-blok"
      data-tipe={blok.tipe}
      data-latar={g.latar ?? 'polos'}
      data-jarak={g.jarak ?? (blok.tipe === 'kaki' ? 'tanpa' : 'normal')}
      data-rata={g.rata ?? 'kiri'}
      data-lebar={lebar}
      data-sembunyi={g.sembunyi}
      data-terpilih={dataFlag(terpilih)}
      data-blok-id={k.pratinjau ? blok.id : undefined}
      onClickCapture={pilih}
      style={latarGambar ? ({ '--ul-latar-gambar': cssUrl(latarGambar) } as React.CSSProperties) : undefined}
      aria-label={k.pratinjau ? SKEMA_BLOK[blok.tipe].label : undefined}
    >
      <div className="ul-wadah">
        <BatasGalatBlok label={SKEMA_BLOK[blok.tipe].label} pratinjau={k.pratinjau}>
          <AnimasiAktif.Provider value={!k.pratinjau && g.animasi !== false}>
            <R isi={blok.isi ?? {}} />
          </AnimasiAktif.Provider>
        </BatasGalatBlok>
      </div>
    </section>
  );
}

/**
 * Halaman landing dari dokumen blok (GET /v1/tema/{aplikasi}/halaman/{halaman}). Bagian data milik aplikasi lewat
 * `slot`; berita dan angka kampus lewat `penyedia` (LandingAplikasi di unipo-ui/siakad memasangnya otomatis).
 *
 *   <HalamanLanding dokumen={dok} berkas={berkas} slot={{ 'kelas-terbuka': { label: 'Kelas terbuka', render: <Katalog /> } }} />
 */
export function HalamanLanding({ dokumen, berkas, slot, penyedia, aksi, merek, namaHakCipta, pratinjau, terpilih, onPilih, className }: HalamanLandingProps) {
  const dok = React.useMemo(() => (dokumen ? normalisasiDokumen(dokumen) : null), [dokumen]);
  const nilai = React.useMemo(() => ({ berkas, slot, penyedia, aksi, merek, namaHakCipta, pratinjau }), [berkas, slot, penyedia, aksi, merek, namaHakCipta, pratinjau]);
  if (!dok) return null;
  return (
    <KonteksLanding.Provider value={nilai}>
      <div className={cn('ul-halaman', className)} data-pratinjau={dataFlag(pratinjau)}>
        {dok.blok.map((b) => (
          <BlokLandingView key={b.id} blok={b} terpilih={terpilih === b.id} onPilih={onPilih} />
        ))}
      </div>
    </KonteksLanding.Provider>
  );
}
