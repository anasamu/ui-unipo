'use client';
import * as React from 'react';
import { CalendarClock, LogIn, RefreshCw, Wrench, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatTime } from '../lib/format';
import { Button } from './actions';
import { Ilustrasi } from '../ikon/ilustrasi';

const keDate = (d: Date | string | number | null | undefined) => (d == null || d === '' ? null : d instanceof Date ? d : new Date(typeof d === 'string' ? d.replace(' ', 'T') : d));

function sisaWaktu(sampai: Date, kini: Date): string {
  const ms = sampai.getTime() - kini.getTime();
  if (ms <= 0) return 'sebentar lagi';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `sekitar ${m} menit lagi`;
  const j = Math.floor(m / 60);
  const sm = m % 60;
  return `sekitar ${j} jam${sm ? ` ${sm} menit` : ''} lagi`;
}

/** Waktu sekarang yang diperbarui tiap `ms`. */
function useKini(ms = 30_000) {
  const [kini, setKini] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setKini(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return kini;
}

export interface ModePemeliharaanProps {
  title?: React.ReactNode;
  /** Penjelasan singkat apa yang sedang dikerjakan. */
  message?: React.ReactNode;
  /** Perkiraan selesai (ISO, Date). Ditampilkan sebagai jam dan hitung mundur. */
  until?: Date | string | null;
  /** Tombol coba lagi; dipanggil juga otomatis saat `until` lewat bila `autoRetry`. */
  onRetry?: () => void | Promise<void>;
  autoRetry?: boolean;
  /** Logo aplikasi di atas. */
  logo?: React.ReactNode;
  /** Kontak/tautan status, mis. <a href="https://status.unipo.ac.id">Status layanan</a>. */
  footer?: React.ReactNode;
  /** Isi layar penuh (bawaan) atau kartu di dalam halaman. */
  variant?: 'page' | 'inline';
  /**
   * Tombol masuk bagi administrator Pustikom yang tetap boleh membuka aplikasi selama pemeliharaan (mis. `/bff/masuk`).
   * Diisi otomatis oleh GerbangPemeliharaan bagi pengunjung yang belum login. Label bawaan "Masuk (khusus Pustikom)".
   */
  login?: { href: string; label?: React.ReactNode } | null;
  className?: string;
}

/**
 * Halaman pemeliharaan: aplikasi sedang diperbarui. Menampilkan perkiraan selesai, hitung mundur, dan tombol coba
 * lagi. Pasang di depan aplikasi saat API membalas 503 (lihat GerbangPemeliharaan di unipo-ui/siakad).
 */
export function ModePemeliharaan({ title = 'Sedang ada pemeliharaan', message = 'Kami sedang memperbarui sistem agar lebih cepat dan aman. Data Anda tetap aman; silakan kembali sebentar lagi.', until, onRetry, autoRetry = true, logo, footer, variant = 'page', login, className }: ModePemeliharaanProps) {
  const kini = useKini(15_000);
  const selesai = keDate(until);
  const [sibuk, setSibuk] = React.useState(false);
  const coba = React.useCallback(async () => {
    if (!onRetry) return;
    setSibuk(true);
    try {
      await onRetry();
    } finally {
      setSibuk(false);
    }
  }, [onRetry]);
  const lewat = Boolean(selesai && kini >= selesai);
  React.useEffect(() => {
    if (autoRetry && lewat) void coba();
  }, [autoRetry, lewat]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <main className={cn('u-pemeliharaan', className)} data-variant={variant} role="status" aria-live="polite">
      <div className="u-pemeliharaan-kartu">
        {logo && <div className="u-pemeliharaan-logo">{logo}</div>}
        {variant === 'page' ? (
          <Ilustrasi nama="pemeliharaan" lebar="min(18rem, 70vw)" className="u-pemeliharaan-ilustrasi" />
        ) : (
          <span className="u-pemeliharaan-ikon" aria-hidden>
            <Wrench />
          </span>
        )}
        <h1>{title}</h1>
        <p>{message}</p>
        {selesai && (
          <p className="u-pemeliharaan-waktu">
            <CalendarClock aria-hidden />
            Perkiraan selesai {formatDate(selesai, 'medium') === formatDate(kini, 'medium') ? '' : `${formatDate(selesai, 'medium')} `}pukul {formatTime(selesai)} ({sisaWaktu(selesai, kini)})
          </p>
        )}
        {(onRetry || login) && (
          <div className="u-pemeliharaan-aksi">
            {onRetry && (
              <Button variant="outline" onClick={coba} loading={sibuk}>
                <RefreshCw /> Coba lagi
              </Button>
            )}
            {login && (
              <Button variant="ghost" render={<a href={login.href} />}>
                <LogIn /> {login.label ?? 'Masuk (khusus Pustikom)'}
              </Button>
            )}
          </div>
        )}
        {footer && <div className="u-pemeliharaan-kaki">{footer}</div>}
      </div>
    </main>
  );
}

export interface BannerPemeliharaanProps {
  /** Mulai pemeliharaan terjadwal. */
  start: Date | string;
  end?: Date | string | null;
  message?: React.ReactNode;
  /** Tampilkan mulai berapa jam sebelum `start` (bawaan 48). */
  showHoursBefore?: number;
  /** Bisa ditutup; ingat penutupan per jadwal di localStorage. */
  dismissible?: boolean;
  className?: string;
}

/** Spanduk pengumuman pemeliharaan terjadwal di atas aplikasi, hilang sendiri setelah jadwal selesai. */
export function BannerPemeliharaan({ start, end, message, showHoursBefore = 48, dismissible = true, className }: BannerPemeliharaanProps) {
  const kini = useKini(60_000);
  const mulai = keDate(start)!;
  const selesai = keDate(end);
  const kunci = `u-pemeliharaan:${mulai.toISOString()}`;
  const [tutup, setTutup] = React.useState(false);
  React.useEffect(() => {
    try {
      setTutup(localStorage.getItem(kunci) === '1');
    } catch {
      /* penyimpanan tidak tersedia */
    }
  }, [kunci]);
  const tampil = kini.getTime() >= mulai.getTime() - showHoursBefore * 3600_000 && (!selesai || kini < selesai) && !tutup;
  if (!tampil) return null;
  const berjalan = kini >= mulai;
  return (
    <div className={cn('u-banner-pemeliharaan', className)} data-berjalan={berjalan || undefined} role="status">
      <Wrench aria-hidden />
      <p>
        <b>{berjalan ? 'Pemeliharaan sedang berjalan.' : 'Pemeliharaan terjadwal.'}</b>{' '}
        {message ??
          `${berjalan ? 'Beberapa fitur mungkin tidak tersedia' : `Layanan tidak tersedia ${formatDate(mulai, 'medium')} pukul ${formatTime(mulai)}`}${selesai ? ` sampai ${formatDate(selesai, 'medium') === formatDate(mulai, 'medium') ? '' : `${formatDate(selesai, 'medium')} `}pukul ${formatTime(selesai)}` : ''}.`}
      </p>
      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Tutup pengumuman"
          onClick={() => {
            setTutup(true);
            try {
              localStorage.setItem(kunci, '1');
            } catch {
              /* abaikan */
            }
          }}
        >
          <X />
        </Button>
      )}
    </div>
  );
}

export interface HalamanPemeliharaanProps {
  /** Logo aplikasi di atas. */
  logo?: React.ReactNode;
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Perkiraan selesai (ISO, Date); kosong = tidak ditampilkan. */
  until?: Date | string | null;
  /** Kontak bantuan. Bawaan "Butuh bantuan? Hubungi Pustikom UNIPO." */
  kontak?: React.ReactNode;
  /** Tombol coba lagi. Bawaan memuat ulang halaman. */
  onRetry?: () => void | Promise<void>;
  /** Kunci adegan <Ilustrasi> (bawaan "pemeliharaan"). */
  ilustrasi?: string;
  className?: string;
}

/**
 * Halaman pemeliharaan layar penuh untuk aplikasi bawaan UNIPO: ilustrasi, "Aplikasi sedang dalam pemeliharaan",
 * perkiraan selesai (bila diketahui), kontak Pustikom, dan tombol coba lagi. Dipakai HalamanMasuk saat konfigurasi
 * aplikasi belum lengkap (tanpa menyebut detail teknis), dan bisa dipakai langsung.
 */
export function HalamanPemeliharaan({
  logo,
  title = 'Aplikasi sedang dalam pemeliharaan',
  message = 'Kami sedang menyiapkan aplikasi ini agar bisa dipakai dengan baik. Data Anda tetap aman. Silakan coba lagi beberapa saat lagi.',
  until,
  kontak = 'Butuh bantuan? Hubungi Pustikom UNIPO.',
  onRetry,
  ilustrasi = 'pemeliharaan',
  className,
}: HalamanPemeliharaanProps) {
  const kini = useKini(15_000);
  const selesai = keDate(until);
  const [sibuk, setSibuk] = React.useState(false);
  const coba = async () => {
    setSibuk(true);
    try {
      if (onRetry) await onRetry();
      else window.location.reload();
    } finally {
      setSibuk(false);
    }
  };
  return (
    <main className={cn('u-halaman-pemeliharaan', className)} role="status" aria-live="polite">
      <div className="u-halaman-pemeliharaan-isi">
        {logo && <div className="u-halaman-pemeliharaan-logo">{logo}</div>}
        <Ilustrasi nama={ilustrasi} lebar="min(20rem, 78vw)" />
        <h1>{title}</h1>
        <p>{message}</p>
        {selesai && (
          <p className="u-pemeliharaan-waktu">
            <CalendarClock aria-hidden />
            Perkiraan selesai {formatDate(selesai, 'medium') === formatDate(kini, 'medium') ? '' : `${formatDate(selesai, 'medium')} `}pukul {formatTime(selesai)} ({sisaWaktu(selesai, kini)})
          </p>
        )}
        <Button variant="outline" onClick={() => void coba()} loading={sibuk}>
          <RefreshCw /> Coba lagi
        </Button>
        {kontak && <p className="u-halaman-pemeliharaan-kontak">{kontak}</p>}
      </div>
    </main>
  );
}
