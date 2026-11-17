'use client';
import * as React from 'react';
import { ArrowUp, ChevronLeft, ChevronRight, CircleCheck, Clock3, Info, Mail, MapPin, Megaphone, MessageCircle, Phone, Siren, Wrench, X } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';
import { SocialLinks } from './landing';
import type { NavbarColumn, NavbarLink, NavbarProps } from './navbar';

/**
 * Kerangka situs: kaki halaman (Footer), pita pengumuman di atas navbar (PitaPengumuman), dan isi pita atas navbar
 * (TopbarKontak). Versi yang datanya diambil dari portal SIAKAD ada di 'unipo-ui/siakad' (FooterPortal, …).
 */

type RenderLink = NavbarProps['renderLink'];

function Tautan({ link, renderLink, className }: { link: NavbarLink; renderLink?: RenderLink; className?: string }) {
  const isi = (
    <>
      {link.icon}
      <span>{link.label}</span>
      {link.badge}
    </>
  );
  if (!link.href)
    return link.onClick ? (
      <button type="button" className={className} onClick={link.onClick}>
        {isi}
      </button>
    ) : (
      <span className={className}>{isi}</span>
    );
  const props = { className, ...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}), children: isi };
  return renderLink ? renderLink({ href: link.href, external: link.external }, props) : <a href={link.href} {...props} />;
}

// ================================================================ Kontak
export interface KontakSitus {
  alamat?: React.ReactNode;
  telepon?: string | null;
  email?: string | null;
  /** Nomor WhatsApp (08…/62…); ditautkan ke wa.me. */
  whatsapp?: string | null;
  /** Jam layanan, mis. "Senin–Jumat, 08.00–16.00 WITA". */
  jam?: React.ReactNode;
  /** Tautan peta (Google Maps) untuk alamat. */
  peta?: string | null;
}

/** Nomor WhatsApp → https://wa.me/62… */
export function tautanWhatsapp(no: string): string {
  return `https://wa.me/${no.replace(/\D/g, '').replace(/^0/, '62')}`;
}

function DaftarKontak({ kontak }: { kontak: KontakSitus }) {
  const baris = [
    kontak.alamat && {
      ikon: <MapPin />,
      isi: kontak.peta ? (
        <a href={kontak.peta} target="_blank" rel="noopener noreferrer">
          {kontak.alamat}
        </a>
      ) : (
        kontak.alamat
      ),
    },
    kontak.telepon && { ikon: <Phone />, isi: <a href={`tel:${kontak.telepon.replace(/[^\d+]/g, '')}`}>{kontak.telepon}</a> },
    kontak.whatsapp && {
      ikon: <MessageCircle />,
      isi: (
        <a href={tautanWhatsapp(kontak.whatsapp)} target="_blank" rel="noopener noreferrer">
          {kontak.whatsapp}
        </a>
      ),
    },
    kontak.email && { ikon: <Mail />, isi: <a href={`mailto:${kontak.email}`}>{kontak.email}</a> },
    kontak.jam && { ikon: <Clock3 />, isi: kontak.jam },
  ].filter(Boolean) as Array<{ ikon: React.ReactNode; isi: React.ReactNode }>;
  if (!baris.length) return null;
  return (
    <ul className="u-footer-kontak">
      {baris.map((b, i) => (
        <li key={i}>
          <span aria-hidden>{b.ikon}</span>
          <span>{b.isi}</span>
        </li>
      ))}
    </ul>
  );
}

// ================================================================ Footer
export interface FooterProps {
  /** Logo + nama (<AppLogo />, <LogoSitus />). */
  brand: React.ReactNode;
  /** Satu-dua kalimat tentang situs. */
  description?: React.ReactNode;
  /** Kolom tautan (struktur sama dengan mega menu Navbar). */
  columns?: NavbarColumn[];
  kontak?: KontakSitus;
  /** Media sosial: [{ jenis: 'instagram', url }]. */
  sosial?: Array<{ jenis: string; url: string }>;
  /** Pita ajakan di atas kaki halaman, mis. "Pendaftaran dibuka" + tombol. */
  ajakan?: React.ReactNode;
  /** Slot tambahan di kolom identitas (lencana akreditasi, unduh aplikasi). */
  extra?: React.ReactNode;
  /** Baris paling bawah kiri. Bawaan: "© {tahun} {namaHakCipta}". */
  hakCipta?: React.ReactNode;
  /** Nama untuk hak cipta bawaan. */
  namaHakCipta?: React.ReactNode;
  /** Tautan kecil di baris bawah (kebijakan privasi, peta situs, PPID). */
  tautanBawah?: NavbarLink[];
  /**
   * gelap (bawaan): latar gelap tetap di mode terang dan gelap, cocok untuk portal.
   * terang: latar kartu dengan garis atas, cocok untuk aplikasi.
   * ringkas: satu-dua baris (logo, tautan, sosial, hak cipta) untuk dasbor dan halaman masuk.
   */
  variant?: 'gelap' | 'terang' | 'ringkas';
  /** Tombol "Kembali ke atas" (bawaan true kecuali ringkas). */
  keAtas?: boolean;
  /** Lebar maksimum isi (bawaan 80rem, sama dengan Navbar). */
  maxWidth?: string;
  renderLink?: RenderLink;
  className?: string;
}

/**
 * Kaki halaman portal dan aplikasi: identitas + kontak + media sosial, kolom tautan, pita ajakan, dan baris hak cipta.
 * Kolom menumpuk di layar sempit; varian `ringkas` untuk aplikasi yang sudah masuk.
 */
export function Footer({
  brand,
  description,
  columns = [],
  kontak,
  sosial = [],
  ajakan,
  extra,
  hakCipta,
  namaHakCipta = 'Universitas Pohuwato',
  tautanBawah = [],
  variant = 'gelap',
  keAtas,
  maxWidth,
  renderLink,
  className,
}: FooterProps) {
  const hc = hakCipta ?? (
    <>
      © {new Date().getFullYear()} {namaHakCipta}
    </>
  );
  const atas = keAtas ?? variant !== 'ringkas';
  const style = maxWidth ? ({ '--u-footer-max': maxWidth } as React.CSSProperties) : undefined;
  const bawah = (
    <div className="u-footer-bawah">
      <p>{hc}</p>
      {tautanBawah.length > 0 && (
        <ul>
          {tautanBawah.map((l, i) => (
            <li key={l.key ?? i}>
              <Tautan link={l} renderLink={renderLink} />
            </li>
          ))}
        </ul>
      )}
      {atas && (
        <button type="button" className="u-footer-keatas" onClick={() => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}>
          <ArrowUp aria-hidden />
          Kembali ke atas
        </button>
      )}
    </div>
  );

  if (variant === 'ringkas')
    return (
      <footer className={cn('u-footer', className)} data-variant="ringkas" style={style}>
        <div className="u-footer-inner">
          <div className="u-footer-ringkas">
            <div className="u-footer-brand">{brand}</div>
            {columns.length > 0 && (
              <ul className="u-footer-ringkas-tautan">
                {columns
                  .flatMap((c) => c.items)
                  .map((l, i) => (
                    <li key={l.key ?? i}>
                      <Tautan link={l} renderLink={renderLink} />
                    </li>
                  ))}
              </ul>
            )}
            <SocialLinks items={sosial} />
          </div>
          {bawah}
        </div>
      </footer>
    );

  return (
    <footer className={cn('u-footer', className)} data-variant={variant} style={style}>
      {ajakan && (
        <div className="u-footer-ajakan">
          <div className="u-footer-inner">{ajakan}</div>
        </div>
      )}
      <div className="u-footer-inner">
        <div className="u-footer-grid" data-kolom={columns.length}>
          <div className="u-footer-identitas">
            <div className="u-footer-brand">{brand}</div>
            {description && <p className="u-footer-desk">{description}</p>}
            {kontak && <DaftarKontak kontak={kontak} />}
            <SocialLinks items={sosial} />
            {extra}
          </div>
          {columns.map((c, i) => (
            <nav key={i} className="u-footer-kolom" aria-label={typeof c.title === 'string' ? c.title : undefined}>
              {c.title && <p className="u-footer-judul">{c.title}</p>}
              <ul>
                {c.items.map((l, j) => (
                  <li key={l.key ?? j}>
                    <Tautan link={l} renderLink={renderLink} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        {bawah}
      </div>
    </footer>
  );
}

// ================================================================ Pita pengumuman
export interface ItemPita {
  id: string | number;
  title: React.ReactNode;
  href?: string;
  /** biasa | penting | darurat | info | pemeliharaan | sukses (warna dan ikon). */
  priority?: 'biasa' | 'penting' | 'darurat' | 'info' | 'pemeliharaan' | 'sukses' | string;
  /** Keterangan singkat di belakang judul (opsional). */
  detail?: React.ReactNode;
  /** false = butir ini tidak bisa ditutup (bawaan ikut `dapatDitutup`). */
  dapatDitutup?: boolean;
  /** Teks tombol tautan (bawaan "Selengkapnya"). */
  cta?: React.ReactNode;
  external?: boolean;
  /** Ganti ikon bawaan menurut prioritas; null = tanpa ikon. */
  icon?: React.ReactNode;
}

export interface PitaPengumumanProps {
  items: ItemPita[];
  /** Jeda ganti pengumuman (ms). 0 mematikan rotasi. Rotasi berhenti saat disorot dan bila pengguna memilih gerak minimal. */
  interval?: number;
  /** Bisa ditutup (bawaan true). */
  dapatDitutup?: boolean;
  /** Kunci localStorage: pita yang ditutup tidak muncul lagi sampai isinya berubah. */
  ingat?: string;
  onTutup?: () => void;
  /** Bila diisi, tombol tutup hanya menutup butir yang sedang tampil (mis. disimpan per akun di server). */
  onTutupItem?: (item: ItemPita) => void;
  renderLink?: RenderLink;
  className?: string;
}

const prioritasTertinggi = (items: ItemPita[]) => (items.some((i) => i.priority === 'darurat') ? 'darurat' : items.some((i) => i.priority === 'penting') ? 'penting' : 'biasa');

/** Pita tipis di atas navbar untuk pengumuman penting/darurat: berganti otomatis, bisa ditutup, warna sesuai prioritas. */
export function PitaPengumuman({ items, interval = 6000, dapatDitutup = true, ingat, onTutup, onTutupItem, renderLink, className }: PitaPengumumanProps) {
  const sidik = items.map((i) => i.id).join(',');
  const [tutup, setTutup] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [jeda, setJeda] = React.useState(false);
  React.useEffect(() => {
    if (!ingat) return;
    try {
      setTutup(localStorage.getItem(ingat) === sidik);
    } catch {
      /* penyimpanan diblokir */
    }
  }, [ingat, sidik]);
  React.useEffect(() => {
    if (!interval || items.length < 2 || jeda) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), interval);
    return () => clearInterval(t);
  }, [interval, items.length, jeda]);
  if (!items.length || tutup) return null;
  const a = items[idx % items.length]!;
  const geser = (d: number) => setIdx((i) => (i + d + items.length) % items.length);
  return (
    <div
      className={cn('u-pita', className)}
      data-priority={a.priority ?? prioritasTertinggi(items)}
      role="region"
      aria-label="Pengumuman"
      onMouseEnter={() => setJeda(true)}
      onMouseLeave={() => setJeda(false)}
      onFocus={() => setJeda(true)}
      onBlur={() => setJeda(false)}
    >
      <div className="u-pita-inner">
        {a.icon !== null && (
          <span className="u-pita-ikon" aria-hidden>
            {a.icon ?? (a.priority === 'darurat' ? <Siren /> : a.priority === 'pemeliharaan' ? <Wrench /> : a.priority === 'sukses' ? <CircleCheck /> : a.priority === 'info' ? <Info /> : <Megaphone />)}
          </span>
        )}
        <p className="u-pita-teks" key={a.id} aria-live={jeda ? 'off' : 'polite'}>
          <span>{a.title}</span>
          {a.detail && <span className="u-pita-detail">{a.detail}</span>}
          {a.href && <Tautan link={{ label: a.cta ?? 'Selengkapnya', href: a.href, external: a.external }} renderLink={renderLink} className="u-pita-cta" />}
        </p>
        {items.length > 1 && (
          <span className="u-pita-nav">
            <button type="button" aria-label="Pengumuman sebelumnya" onClick={() => geser(-1)}>
              <ChevronLeft />
            </button>
            <span aria-hidden>
              {(idx % items.length) + 1}/{items.length}
            </span>
            <button type="button" aria-label="Pengumuman berikutnya" onClick={() => geser(1)}>
              <ChevronRight />
            </button>
          </span>
        )}
        {dapatDitutup && a.dapatDitutup !== false && (
          <button
            type="button"
            className="u-pita-tutup"
            aria-label="Tutup pengumuman"
            onClick={() => {
              if (onTutupItem) {
                onTutupItem(a);
                setIdx(0);
                return;
              }
              setTutup(true);
              if (ingat)
                try {
                  localStorage.setItem(ingat, sidik);
                } catch {
                  /* abaikan */
                }
              onTutup?.();
            }}
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
}

// ================================================================ Pita atas navbar
export interface TopbarKontakProps {
  kontak?: KontakSitus;
  /** Tautan cepat di kanan (SIAKAD, e-learning, PPID). */
  links?: NavbarLink[];
  /** Slot paling kanan, mis. pilihan bahasa. */
  extra?: React.ReactNode;
  renderLink?: RenderLink;
  className?: string;
}

/** Isi prop `topbar` Navbar: telepon, email, jam layanan di kiri; tautan cepat dan bahasa di kanan. */
export function TopbarKontak({ kontak = {}, links = [], extra, renderLink, className }: TopbarKontakProps) {
  return (
    <div className={cn('u-topbar-kontak', className)}>
      <ul>
        {kontak.telepon && (
          <li>
            <Phone aria-hidden />
            <a href={`tel:${kontak.telepon.replace(/[^\d+]/g, '')}`}>{kontak.telepon}</a>
          </li>
        )}
        {kontak.email && (
          <li>
            <Mail aria-hidden />
            <a href={`mailto:${kontak.email}`}>{kontak.email}</a>
          </li>
        )}
        {kontak.jam && (
          <li data-sekunder={dataFlag(true)}>
            <Clock3 aria-hidden />
            {kontak.jam}
          </li>
        )}
      </ul>
      <ul>
        {links.map((l, i) => (
          <li key={l.key ?? i}>
            <Tautan link={l} renderLink={renderLink} />
          </li>
        ))}
        {extra && <li>{extra}</li>}
      </ul>
    </div>
  );
}
