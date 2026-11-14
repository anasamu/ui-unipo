'use client';
import * as React from 'react';
import { CalendarClock, RefreshCw, Wrench, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDate, formatTime } from '../lib/format';
import { Button } from './actions';

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
  className?: string;
}

/**
 * Halaman pemeliharaan: aplikasi sedang diperbarui. Menampilkan perkiraan selesai, hitung mundur, dan tombol coba
 * lagi. Pasang di depan aplikasi saat API membalas 503 (lihat GerbangPemeliharaan di unipo-ui/siakad).
 */
export function ModePemeliharaan({ title = 'Sedang ada pemeliharaan', message = 'Kami sedang memperbarui sistem agar lebih cepat dan aman. Data Anda tetap aman; silakan kembali sebentar lagi.', until, onRetry, autoRetry = true, logo, footer, variant = 'page', className }: ModePemeliharaanProps) {
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
        <span className="u-pemeliharaan-ikon" aria-hidden>
          <Wrench />
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
        {selesai && (
          <p className="u-pemeliharaan-waktu">
            <CalendarClock aria-hidden />
            Perkiraan selesai {formatDate(selesai, 'medium') === formatDate(kini, 'medium') ? '' : `${formatDate(selesai, 'medium')} `}pukul {formatTime(selesai)} ({sisaWaktu(selesai, kini)})
          </p>
        )}
        {onRetry && (
          <Button variant="outline" onClick={coba} loading={sibuk}>
            <RefreshCw /> Coba lagi
          </Button>
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
