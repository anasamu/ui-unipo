'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import { formatNumber } from '../lib/format';

/**
 * Jenis animasi UNIPO. Semua memakai transform/opacity (ringan), berdurasi pendek, dan otomatis mati bila pengguna
 * memilih "kurangi gerakan" (prefers-reduced-motion).
 *
 * - masuk: muncul naik pelan (kartu, baris, panel)
 * - muncul: membesar dari 96% (dialog kecil, lencana, angka)
 * - geser: masuk dari samping (notifikasi, langkah wizard)
 * - pantul: masuk memantul (ikon sukses, hadiah, prestasi)
 * - sukses: letupan kecil (setelah menyimpan)
 * - goyang: getar singkat (galat validasi, akses ditolak)
 * - denyut: cincin berdenyut (status langsung, antrean, tiket baru)
 * - mengambang: naik-turun pelan (ilustrasi, maskot)
 * - lonceng: ayun lonceng (notifikasi, pengumuman)
 * - naik: panah naik (unggah, kirim, sinkron)
 * - balik: balik halaman (kalender, agenda, berita)
 * - putar: berputar pelan (sinkronisasi, pemeliharaan)
 * - kedip: menyala sebentar (perlu perhatian)
 * - ketik: kursor mengetik (editor, chat, AI)
 */
export type JenisAnimasi = 'masuk' | 'muncul' | 'geser' | 'pantul' | 'sukses' | 'goyang' | 'denyut' | 'mengambang' | 'lonceng' | 'naik' | 'balik' | 'putar' | 'kedip' | 'ketik';

/** Animasi yang cocok untuk tiap modul/fitur katalog (kunci modul atau kata fitur). */
export const ANIMASI_FITUR: Record<string, JenisAnimasi> = {
  notifikasi: 'lonceng',
  pengumuman: 'lonceng',
  kalender: 'balik',
  agenda: 'balik',
  portal: 'balik',
  humas: 'balik',
  keu: 'naik',
  keuangan: 'naik',
  pembayaran: 'naik',
  unggah: 'naik',
  berkas: 'naik',
  pddikti: 'putar',
  sinkron: 'putar',
  integrasi: 'putar',
  pemeliharaan: 'putar',
  helpdesk: 'denyut',
  tiket: 'denyut',
  dasbor: 'denyut',
  cbt: 'denyut',
  kelulusan: 'pantul',
  prestasi: 'pantul',
  wisuda: 'pantul',
  kemahasiswaan: 'pantul',
  akses: 'goyang',
  galat: 'goyang',
  ditolak: 'goyang',
  ai: 'ketik',
  editor: 'ketik',
  arsip: 'geser',
  layanan: 'geser',
  sukses: 'sukses',
};

/** Animasi untuk satu fitur; bawaan 'masuk'. */
export function animasiFitur(fitur: string | undefined | null): JenisAnimasi {
  return (fitur && ANIMASI_FITUR[fitur]) || 'masuk';
}

export interface AnimasiProps extends React.HTMLAttributes<HTMLElement> {
  jenis?: JenisAnimasi;
  /** Urutan untuk efek bertahap (tiap langkah 60 ms) atau tunda dalam ms bila > 20. */
  tunda?: number;
  /** Durasi (ms). */
  durasi?: number;
  /**
   * Kapan jalan: 'muat' (saat dirender), 'terlihat' (saat masuk layar), 'hover' (saat disorot), 'selalu' (berulang).
   * Bawaan: 'muat', kecuali jenis berulang (denyut, mengambang, putar) yang 'selalu'.
   */
  pemicu?: 'muat' | 'terlihat' | 'hover' | 'selalu';
  /** Elemen pembungkus (bawaan div). */
  as?: 'div' | 'span' | 'li' | 'section';
  /** Ganti kunci untuk menjalankan ulang animasi (mis. setelah sukses). */
  ulang?: React.Key;
}

const BERULANG: JenisAnimasi[] = ['denyut', 'mengambang', 'putar'];

/** Bungkus elemen dengan animasi UNIPO. `<Animasi jenis="masuk" tunda={i}>…</Animasi>` */
export function Animasi({ jenis = 'masuk', tunda, durasi, pemicu, as = 'div', ulang, className, style, children, ...rest }: AnimasiProps) {
  const p = pemicu ?? (BERULANG.includes(jenis) ? 'selalu' : 'muat');
  const ref = React.useRef<HTMLElement>(null);
  const [terlihat, setTerlihat] = React.useState(p !== 'terlihat');
  React.useEffect(() => {
    if (p !== 'terlihat' || !ref.current || typeof IntersectionObserver === 'undefined') return setTerlihat(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setTerlihat(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [p]);
  const ms = tunda === undefined ? undefined : tunda > 20 ? tunda : tunda * 60;
  const Tag = as as 'div';
  return (
    <Tag
      key={ulang}
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn('u-anim', className)}
      data-anim={jenis}
      data-pemicu={p}
      data-siap={terlihat || undefined}
      style={{ ...(ms !== undefined ? { ['--u-anim-tunda' as string]: `${ms}ms` } : {}), ...(durasi ? { ['--u-anim-durasi' as string]: `${durasi}ms` } : {}), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Anak-anaknya muncul bertahap (kartu dasbor, daftar modul). */
export function Bertahap({ jenis = 'masuk', jeda = 60, pemicu = 'muat', className, children, as = 'div' }: { jenis?: JenisAnimasi; jeda?: number; pemicu?: AnimasiProps['pemicu']; className?: string; children: React.ReactNode; as?: AnimasiProps['as'] }) {
  return (
    <>
      {React.Children.toArray(children).map((c, i) => (
        <Animasi key={(c as React.ReactElement).key ?? i} jenis={jenis} tunda={i * jeda + 1} pemicu={pemicu} className={className} as={as}>
          {c}
        </Animasi>
      ))}
    </>
  );
}

function kurangiGerak(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Angka yang berjalan naik dari nilai lama ke nilai baru (statistik, saldo, jumlah pendaftar). */
export function AngkaBerjalan({ nilai, durasi = 900, format = (n) => formatNumber(Math.round(n)), className }: { nilai: number; durasi?: number; format?: (n: number) => string; className?: string }) {
  const [tampil, setTampil] = React.useState(nilai);
  const dari = React.useRef(0);
  React.useEffect(() => {
    if (kurangiGerak()) return setTampil(nilai);
    const awal = dari.current;
    const t0 = performance.now();
    let id = 0;
    const langkah = (t: number) => {
      const p = Math.min(1, (t - t0) / durasi);
      const e = 1 - Math.pow(1 - p, 3);
      setTampil(awal + (nilai - awal) * e);
      if (p < 1) id = requestAnimationFrame(langkah);
      else dari.current = nilai;
    };
    id = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(id);
  }, [nilai, durasi]);
  return (
    <span className={cn('u-angka-berjalan', className)} aria-label={format(nilai)}>
      <span aria-hidden>{format(tampil)}</span>
    </span>
  );
}

/** Centang sukses beranimasi: lingkaran tergambar lalu centang. Cocok setelah menyimpan/mengirim. */
export function CentangSukses({ ukuran = 56, nada = 'success', className, label = 'Berhasil' }: { ukuran?: number; nada?: 'success' | 'primary' | 'danger' | 'warning'; className?: string; label?: string }) {
  const silang = nada === 'danger';
  return (
    <svg className={cn('u-centang', className)} data-nada={nada} width={ukuran} height={ukuran} viewBox="0 0 52 52" role="img" aria-label={label}>
      <circle className="u-centang-lingkar" cx="26" cy="26" r="23" fill="none" strokeWidth="3" />
      {silang ? <path className="u-centang-tanda" fill="none" strokeWidth="4" strokeLinecap="round" d="M18 18 34 34M34 18 18 34" /> : <path className="u-centang-tanda" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M15 27l7 7 15-16" />}
    </svg>
  );
}

/** Titik-titik mengetik (chat, asisten AI, editor kolaboratif). */
export function TitikMengetik({ label = 'Sedang mengetik', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('u-titik-mengetik', className)} role="status" aria-label={label}>
      <i />
      <i />
      <i />
    </span>
  );
}
