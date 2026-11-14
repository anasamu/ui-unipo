'use client';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface IkonProps extends React.SVGProps<SVGSVGElement> {
  /** Ukuran (px atau CSS). Bawaan 24. */
  size?: number | string;
  strokeWidth?: number;
  /** Isi lembut warna kedua (duotone) memakai currentColor 18%. */
  duo?: boolean;
}

/** Pembuat ikon UNIPO bergaya sama dengan lucide (24×24, garis 2, ujung bulat) + opsi duotone. */
function buat(nama: string, isi: React.ReactNode, duo?: React.ReactNode) {
  const C = React.forwardRef<SVGSVGElement, IkonProps>(function Ikon({ size = 24, strokeWidth = 2, duo: pakaiDuo, className, children, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('u-ikon', `u-ikon-${nama}`, className)}
        aria-hidden={rest['aria-label'] ? undefined : true}
        {...rest}
      >
        {pakaiDuo && duo ? (
          <g fill="currentColor" fillOpacity={0.18} stroke="none">
            {duo}
          </g>
        ) : null}
        {isi}
        {children}
      </svg>
    );
  });
  C.displayName = `Ikon${nama.charAt(0).toUpperCase()}${nama.slice(1)}`;
  return C;
}

// ---------------------------------------------------------------- Akademik
/** Kartu tanda mahasiswa. */
export const IkonKtm = buat(
  'ktm',
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2" />
    <path d="M14 10h4.5M14 13h3" />
  </>,
  <rect x="2.5" y="5" width="19" height="14" rx="2.5" />,
);
/** Ijazah: gulungan dengan pita. */
export const IkonIjazah = buat(
  'ijazah',
  <>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v12H6.5A2.5 2.5 0 0 0 4 18.5z" />
    <path d="M4 18.5A2.5 2.5 0 0 0 6.5 21H19v-5" />
    <path d="M8 8h7M8 11h5" />
    <circle cx="15.5" cy="13.5" r="1.5" />
  </>,
  <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v12H6.5A2.5 2.5 0 0 0 4 18.5z" />,
);
/** Kartu hasil studi (KHS): lembar nilai dengan grafik kecil. */
export const IkonKhs = buat(
  'khs',
  <>
    <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path d="M14 3v5h5" />
    <path d="M8.5 17v-2M12 17v-4.5M15.5 17v-3" />
  </>,
  <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />,
);
/** Kartu rencana studi (KRS): daftar dengan centang. */
export const IkonKrs = buat(
  'krs',
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="m7.5 8 1.2 1.2L11 7M7.5 13l1.2 1.2L11 12" />
    <path d="M13.5 8h3M13.5 13h3M7.5 17.5h9" />
  </>,
  <rect x="4" y="3" width="16" height="18" rx="2" />,
);
/** Satuan kredit semester: tumpukan buku. */
export const IkonSks = buat(
  'sks',
  <>
    <rect x="3.5" y="15" width="17" height="4.5" rx="1" />
    <rect x="5" y="10" width="14" height="5" rx="1" />
    <rect x="6.5" y="4.5" width="11" height="5.5" rx="1" />
    <path d="M7 17.25h4M8.5 12.5h3M10 7.25h4" />
  </>,
  <rect x="5" y="10" width="14" height="5" rx="1" />,
);
/** Toga wisuda dengan tali. */
export const IkonToga = buat(
  'toga',
  <>
    <path d="M2 9.5 12 5l10 4.5-10 4.5z" />
    <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
    <path d="M20 10.5v5.5" />
    <circle cx="20" cy="17" r="1" />
  </>,
  <path d="M2 9.5 12 5l10 4.5-10 4.5z" />,
);
/** Skripsi/tugas akhir: buku tebal dengan pembatas. */
export const IkonSkripsi = buat(
  'skripsi',
  <>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19" />
    <path d="M14 3v6l2-1.3L18 9V3" />
    <path d="M8.5 12h6M8.5 15h4" />
  </>,
  <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />,
);
/** Uang kuliah tunggal: dompet dengan topi wisuda kecil. */
export const IkonUkt = buat(
  'ukt',
  <>
    <path d="M19 8V6.5A1.5 1.5 0 0 0 17.5 5h-12A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19h12a1.5 1.5 0 0 0 1.5-1.5V16" />
    <path d="M21 10h-4a2 2 0 0 0 0 4h4z" />
    <path d="m6 10 3-1.5 3 1.5-3 1.5z" />
  </>,
  <path d="M19 8V6.5A1.5 1.5 0 0 0 17.5 5h-12A2.5 2.5 0 0 0 3 7.5v9A2.5 2.5 0 0 0 5.5 19h12a1.5 1.5 0 0 0 1.5-1.5V16" />,
);
/** Beasiswa: koin dengan topi wisuda. */
export const IkonBeasiswa = buat(
  'beasiswa',
  <>
    <circle cx="12" cy="13" r="7.5" />
    <path d="m7.5 12 4.5-2 4.5 2-4.5 2z" />
    <path d="M9.5 13v2c0 .7 1.1 1.3 2.5 1.3s2.5-.6 2.5-1.3v-2" />
    <path d="M12 2.5v2M8 3.5l.8 1.6M16 3.5l-.8 1.6" />
  </>,
  <circle cx="12" cy="13" r="7.5" />,
);
/** Yudisium: palu sidang dan berkas. */
export const IkonYudisium = buat(
  'yudisium',
  <>
    <path d="m13 5 6 6M11.5 6.5l6 6M14 4l5 5-2.5 2.5-5-5z" />
    <path d="m11 10-6.5 6.5a1.4 1.4 0 0 0 2 2L13 12" />
    <path d="M13 20h8" />
  </>,
  <path d="M14 4l5 5-2.5 2.5-5-5z" />,
);
/** Presensi QR. */
export const IkonPresensi = buat(
  'presensi',
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3M21 14v.01M17 21h4v-4M14 18v3" />
  </>,
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </>,
);
/** Jadwal kuliah: kalender dengan jam. */
export const IkonJadwalKuliah = buat(
  'jadwal-kuliah',
  <>
    <path d="M20 11V6.5A1.5 1.5 0 0 0 18.5 5h-13A1.5 1.5 0 0 0 4 6.5v12A1.5 1.5 0 0 0 5.5 20H11" />
    <path d="M8 3v4M16 3v4M4 10h16" />
    <circle cx="17" cy="17" r="4" />
    <path d="M17 15.5V17l1 1" />
  </>,
  <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V10H4z" />,
);

// ---------------------------------------------------------------- Kelembagaan & layanan
/** Gedung kampus berpilar. */
export const IkonKampus = buat(
  'kampus',
  <>
    <path d="M3 9.5 12 4l9 5.5" />
    <path d="M4 9.5h16" />
    <path d="M6 12v6M10 12v6M14 12v6M18 12v6" />
    <path d="M3 21h18M4 18h16" />
  </>,
  <path d="M3 9.5 12 4l9 5.5z" />,
);
/** Akreditasi: lencana bintang dengan pita. */
export const IkonAkreditasi = buat(
  'akreditasi',
  <>
    <circle cx="12" cy="9" r="6" />
    <path d="m12 6 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 8.3 11 8z" />
    <path d="M8.5 14 7 21l5-2.5L17 21l-1.5-7" />
  </>,
  <circle cx="12" cy="9" r="6" />,
);
/** Organisasi mahasiswa: tiga orang dengan bendera. */
export const IkonOrmawa = buat(
  'ormawa',
  <>
    <circle cx="12" cy="8" r="2.5" />
    <circle cx="5.5" cy="10.5" r="2" />
    <circle cx="18.5" cy="10.5" r="2" />
    <path d="M7.5 20v-1.5a4.5 4.5 0 0 1 9 0V20M2 20v-1a3.5 3.5 0 0 1 4.5-3.3M22 20v-1a3.5 3.5 0 0 0-4.5-3.3" />
    <path d="M12 5.5V2l3 1.2L12 4.4" />
  </>,
  <circle cx="12" cy="8" r="2.5" />,
);
/** KKN/pengabdian: rumah desa dengan pohon. */
export const IkonKkn = buat(
  'kkn',
  <>
    <path d="M3 11 9 6l6 5" />
    <path d="M4.5 10v10h9V10" />
    <path d="M8 20v-4h2v4" />
    <circle cx="18.5" cy="10" r="2.5" />
    <path d="M18.5 12.5V20M2 20h20" />
  </>,
  <path d="M4.5 10 9 6.3l4.5 3.7v10h-9z" />,
);
/** Penelitian: tabung dengan grafik. */
export const IkonPenelitian = buat(
  'penelitian',
  <>
    <path d="M9 3h6M10 3v6l-5 8.5A2.3 2.3 0 0 0 7 21h10a2.3 2.3 0 0 0 2-3.5L14 9V3" />
    <path d="M7.5 15h9" />
    <circle cx="11" cy="17.5" r=".6" />
    <circle cx="14" cy="18" r=".6" />
  </>,
  <path d="M7.5 15h9l1.5 2.5A2.3 2.3 0 0 1 17 21H7a2.3 2.3 0 0 1-2-3.5z" />,
);
/** Surat resmi dengan kop dan stempel. */
export const IkonSurat = buat(
  'surat',
  <>
    <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path d="M14 3v5h5" />
    <path d="M8 7h3M8 11h8M8 14h6" />
    <circle cx="15" cy="17.5" r="1.8" />
  </>,
  <circle cx="15" cy="17.5" r="1.8" />,
);
/** Tanda tangan elektronik. */
export const IkonTandaTangan = buat(
  'tanda-tangan',
  <>
    <path d="M3 17c2-3 3.5-7 5-7s.5 6 2 6 2.5-4 4-4 1 3 2.5 3 2-1.5 3.5-2" />
    <path d="M3 21h18" />
    <path d="m15.5 4.5 3 3-6 6H9.5v-3z" />
  </>,
  <path d="m15.5 4.5 3 3-6 6H9.5v-3z" />,
);
/** Sinkronisasi PDDikti/Feeder: awan dengan panah dua arah. */
export const IkonSinkronPddikti = buat(
  'sinkron-pddikti',
  <>
    <path d="M7 18.5A4.5 4.5 0 0 1 6.5 9.5 6 6 0 0 1 18 8a4 4 0 0 1-.5 8" />
    <path d="M10 13l2-2 2 2M12 11v8M14 17l-2 2" />
  </>,
  <path d="M7 18.5A4.5 4.5 0 0 1 6.5 9.5 6 6 0 0 1 18 8a4 4 0 0 1-.5 8z" />,
);
/** Peminjaman ruang: pintu dengan kalender. */
export const IkonPinjamRuang = buat(
  'pinjam-ruang',
  <>
    <path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3h7A1.5 1.5 0 0 1 14 4.5V21" />
    <path d="M2 21h20" />
    <circle cx="11" cy="12" r=".8" />
    <rect x="15" y="10" width="7" height="7" rx="1.2" />
    <path d="M15 12.5h7M17 9v2M20 9v2" />
  </>,
  <path d="M4 21V4.5A1.5 1.5 0 0 1 5.5 3h7A1.5 1.5 0 0 1 14 4.5V21z" />,
);
/** Alumni/karier: koper dengan topi wisuda. */
export const IkonAlumni = buat(
  'alumni',
  <>
    <rect x="3" y="9" width="18" height="11" rx="2" />
    <path d="M9 9V7a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 7v2" />
    <path d="m8 14 4-1.8 4 1.8-4 1.8z" />
  </>,
  <rect x="3" y="9" width="18" height="11" rx="2" />,
);
/** Berita/humas: koran dengan pengeras suara. */
export const IkonBerita = buat(
  'berita',
  <>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V19a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z" />
    <path d="M17 9h2.5A1.5 1.5 0 0 1 21 10.5V19a2 2 0 0 1-4 0" />
    <rect x="7" y="7.5" width="7" height="4" rx=".8" />
    <path d="M7 15h7M7 18h5" />
  </>,
  <rect x="7" y="7.5" width="7" height="4" rx=".8" />,
);

/** Semua ikon khas UNIPO (untuk galeri dan pencarian). */
export const IKON_UNIPO = {
  IkonKtm,
  IkonIjazah,
  IkonKhs,
  IkonKrs,
  IkonSks,
  IkonToga,
  IkonSkripsi,
  IkonUkt,
  IkonBeasiswa,
  IkonYudisium,
  IkonPresensi,
  IkonJadwalKuliah,
  IkonKampus,
  IkonAkreditasi,
  IkonOrmawa,
  IkonKkn,
  IkonPenelitian,
  IkonSurat,
  IkonTandaTangan,
  IkonSinkronPddikti,
  IkonPinjamRuang,
  IkonAlumni,
  IkonBerita,
};
