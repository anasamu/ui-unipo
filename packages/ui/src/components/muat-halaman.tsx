'use client';
import * as React from 'react';
import { cn } from '../lib/cn';
import { Skeleton, Spinner } from './actions';

// ================================================================ Efek memuat halaman
//
// Dipakai KerangkaAplikasi (unipo-ui/siakad) untuk semua aplikasi dasbor: saat halaman pertama dibuka dan saat pindah
// menu. Bisa juga dipakai langsung. Aturan bersama:
//   - tidak tampil bila selesai dalam ~150 ms (tanpa kedip), dan sekali tampil bertahan minimal ~300 ms;
//   - menghormati prefers-reduced-motion (tanpa gerak, hanya muncul/hilang).

/** Efek saat aplikasi pertama dibuka (isi halaman belum siap). */
export type GayaMuatAwal = 'kerangka' | 'logo' | 'putar' | 'titik' | 'tidak';
/** Efek saat pindah menu/rute. */
export type GayaMuatPindah = 'progres-pudar' | 'progres' | 'progres-blur' | 'pudar' | 'blur' | 'tidak';
/** Bentuk kerangka (skeleton) yang meniru tata letak halaman. */
export type TataMuatHalaman = 'dasbor' | 'tabel' | 'formulir' | 'daftar' | 'detail';

export const PILIHAN_MUAT_AWAL: ReadonlyArray<{ value: GayaMuatAwal; label: string; keterangan: string }> = [
  { value: 'kerangka', label: 'Kerangka isi', keterangan: 'Bentuk abu-abu meniru tata letak halaman (bawaan).' },
  { value: 'logo', label: 'Logo berdenyut', keterangan: 'Logo aplikasi berdenyut pelan di tengah.' },
  { value: 'putar', label: 'Putaran', keterangan: 'Ikon putar dengan teks "Memuat".' },
  { value: 'titik', label: 'Tiga titik', keterangan: 'Tiga titik bergantian.' },
  { value: 'tidak', label: 'Tanpa efek', keterangan: 'Halaman langsung tampil dengan pemuat masing-masing.' },
];

export const PILIHAN_MUAT_PINDAH: ReadonlyArray<{ value: GayaMuatPindah; label: string; keterangan: string }> = [
  { value: 'progres-pudar', label: 'Bilah progres + pudar', keterangan: 'Bilah tipis warna tema di tepi atas, isi muncul halus (bawaan).' },
  { value: 'progres', label: 'Bilah progres', keterangan: 'Hanya bilah tipis di tepi atas.' },
  { value: 'progres-blur', label: 'Bilah progres + kabur', keterangan: 'Bilah di tepi atas, isi baru muncul dari kabur.' },
  { value: 'pudar', label: 'Pudar', keterangan: 'Isi baru muncul halus tanpa bilah.' },
  { value: 'blur', label: 'Kabur', keterangan: 'Isi baru muncul dari kabur tanpa bilah.' },
  { value: 'tidak', label: 'Tanpa efek', keterangan: 'Pindah halaman tanpa animasi.' },
];

/** true bila pengguna meminta gerak dikurangi (prefers-reduced-motion). */
export function useGerakDikurangi(): boolean {
  const [v, setV] = React.useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  React.useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!m) return;
    const f = () => setV(m.matches);
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return v;
}

/**
 * Status memuat tanpa kedip: menjadi true hanya bila `aktif` bertahan lebih dari `tunda` ms, dan sekali true
 * bertahan minimal `minimal` ms walau pemuatan sudah selesai.
 */
export function useMuatTertunda(aktif: boolean, { tunda = 150, minimal = 300 }: { tunda?: number; minimal?: number } = {}): boolean {
  const [tampil, setTampil] = React.useState(false);
  const sejak = React.useRef(0);
  React.useEffect(() => {
    if (aktif) {
      if (tampil) return;
      const t = setTimeout(() => ((sejak.current = Date.now()), setTampil(true)), tunda);
      return () => clearTimeout(t);
    }
    if (!tampil) return;
    const t = setTimeout(() => setTampil(false), Math.max(0, minimal - (Date.now() - sejak.current)));
    return () => clearTimeout(t);
  }, [aktif, tampil, tunda, minimal]);
  return tampil;
}

/** Pemuat yang dikenali di dalam isi halaman (unipo-ui Spinner/Skeleton, aria-busy, ProgressHalaman). */
export const PEMILIH_PEMUAT = '.u-spinner, .u-skeleton, [aria-busy="true"], .u-phal';

/** Apakah elemen berisi pemuat yang terlihat (mengabaikan `[data-muat-abaikan]` dan overlay efek memuat sendiri). */
export function adaPemuat(el: Element | null): boolean {
  if (!el) return false;
  for (const x of el.querySelectorAll(PEMILIH_PEMUAT)) {
    if (x.closest('[data-muat-abaikan], .u-mh-tutup, .u-dialog, .u-sheet')) continue;
    if ((x as HTMLElement).offsetParent === null && getComputedStyle(x).position !== 'fixed') continue;
    return true;
  }
  return false;
}

/**
 * Pantau isi elemen: true selama ada pemuat (Spinner, Skeleton, aria-busy) di dalamnya. Tidak bergantung pada
 * cara aplikasi memuat data (useSiakadQuery, TanStack Query, fetch sendiri).
 */
export function usePantauMuat(ref: React.RefObject<Element | null>, aktif = true): boolean {
  const [muat, setMuat] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!aktif || !el) return setMuat(false);
    let bingkai = 0;
    const cek = () => {
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(() => setMuat(adaPemuat(el)));
    };
    cek();
    const mo = new MutationObserver(cek);
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy', 'class'] });
    return () => (mo.disconnect(), cancelAnimationFrame(bingkai));
  }, [ref, aktif]);
  return muat;
}

// ---------------------------------------------------------------- Bilah progres

export interface BilahProgresProps {
  /** Sedang memuat. Bilah baru muncul setelah `tunda` ms dan maju pelan sampai ~90% hingga selesai. */
  aktif: boolean;
  /** Bawaan 150 ms: pemuatan yang lebih cepat tidak menampilkan apa pun. */
  tunda?: number;
  /** Tebal bilah (px), bawaan 3. */
  tebal?: number;
  /** Warna; bawaan warna utama tema. */
  warna?: string;
  /** Posisi: menempel ke viewport (bawaan) atau ke wadah terdekat yang `position: relative`. */
  posisi?: 'tetap' | 'wadah';
  className?: string;
}

/** Bilah progres tipis di tepi atas (gaya browser modern) dengan warna tema. */
export function BilahProgres({ aktif, tunda = 150, tebal = 3, warna, posisi = 'tetap', className }: BilahProgresProps) {
  const tampil = useMuatTertunda(aktif, { tunda, minimal: 250 });
  const [persen, setPersen] = React.useState(0);
  const [keluar, setKeluar] = React.useState(false);
  const [ada, setAda] = React.useState(false);

  React.useEffect(() => {
    if (tampil) {
      setAda(true);
      setKeluar(false);
      setPersen(8);
      const t = setInterval(() => setPersen((p) => Math.min(92, p + Math.max(0.6, (92 - p) * 0.09))), 220);
      return () => clearInterval(t);
    }
    if (!ada) return;
    setPersen(100);
    const t1 = setTimeout(() => setKeluar(true), 180);
    const t2 = setTimeout(() => (setAda(false), setPersen(0)), 480);
    return () => (clearTimeout(t1), clearTimeout(t2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tampil]);

  if (!ada) return null;
  return (
    <div
      className={cn('u-mh-bilah', className)}
      data-posisi={posisi}
      data-keluar={keluar ? '' : undefined}
      role="progressbar"
      aria-label="Memuat halaman"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(persen)}
      data-muat-abaikan=""
      style={{ '--u-mh-tebal': `${tebal}px`, ...(warna ? { '--u-mh-warna': warna } : {}) } as React.CSSProperties}
    >
      <span style={{ transform: `scaleX(${persen / 100})` }} />
    </div>
  );
}

// ---------------------------------------------------------------- Kerangka (skeleton) per tata letak

/** Skeleton yang meniru tata letak halaman: dasbor (kartu statistik + panel), tabel, formulir, daftar, detail. */
export function KerangkaHalamanMuat({ tata = 'dasbor', className }: { tata?: TataMuatHalaman; className?: string }) {
  const judul = (
    <div className="u-mh-judul">
      <Skeleton width="34%" height={22} />
      <Skeleton width="52%" height={12} />
    </div>
  );
  let isi: React.ReactNode;
  if (tata === 'dasbor')
    isi = (
      <>
        <div className="u-mh-statistik">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="u-mh-kartu">
              <Skeleton width="45%" height={11} />
              <Skeleton width="62%" height={24} />
              <Skeleton width="38%" height={10} />
            </div>
          ))}
        </div>
        <div className="u-mh-dua">
          <div className="u-mh-kartu u-mh-tinggi">
            <Skeleton width="30%" height={14} />
            <Skeleton height="100%" className="u-mh-grafik" />
          </div>
          <div className="u-mh-kartu u-mh-tinggi">
            <Skeleton width="40%" height={14} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="u-mh-baris">
                <Skeleton shape="circle" width={28} height={28} />
                <Skeleton width={`${70 - i * 7}%`} height={11} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  else if (tata === 'tabel')
    isi = (
      <div className="u-mh-kartu">
        <div className="u-mh-alat">
          <Skeleton width="38%" height={32} />
          <Skeleton width={96} height={32} />
        </div>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="u-mh-sel" data-kepala={i === 0 ? '' : undefined}>
            <Skeleton width="22%" height={11} />
            <Skeleton width="30%" height={11} />
            <Skeleton width="16%" height={11} />
            <Skeleton width="12%" height={11} />
          </div>
        ))}
      </div>
    );
  else if (tata === 'formulir')
    isi = (
      <div className="u-mh-kartu u-mh-form">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="u-mh-isian">
            <Skeleton width={`${18 + (i % 3) * 6}%`} height={11} />
            <Skeleton height={36} />
          </div>
        ))}
        <Skeleton width={120} height={36} />
      </div>
    );
  else if (tata === 'daftar')
    isi = (
      <div className="u-mh-kartu">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="u-mh-baris u-mh-baris-besar">
            <Skeleton shape="circle" width={36} height={36} />
            <div className="u-mh-tumpuk">
              <Skeleton width={`${55 - (i % 3) * 8}%`} height={12} />
              <Skeleton width={`${35 + (i % 2) * 10}%`} height={10} />
            </div>
          </div>
        ))}
      </div>
    );
  else
    isi = (
      <>
        <div className="u-mh-kartu u-mh-profil">
          <Skeleton shape="circle" width={64} height={64} />
          <div className="u-mh-tumpuk">
            <Skeleton width="40%" height={18} />
            <Skeleton width="28%" height={11} />
          </div>
        </div>
        <div className="u-mh-dua">
          {[0, 1].map((k) => (
            <div key={k} className="u-mh-kartu">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="u-mh-isian">
                  <Skeleton width="25%" height={10} />
                  <Skeleton width={`${50 + i * 8}%`} height={13} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </>
    );
  return (
    <div className={cn('u-mh-kerangka', className)} role="status" aria-label="Memuat halaman">
      {judul}
      {isi}
    </div>
  );
}

// ---------------------------------------------------------------- Logo, putaran, titik

/** Logo aplikasi berdenyut pelan di tengah area. */
export function MuatLogo({ logo, label = 'Memuat…', className }: { logo?: React.ReactNode; label?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('u-mh-tengah', className)} role="status" aria-label={typeof label === 'string' ? label : 'Memuat'}>
      <span className="u-mh-logo">{logo ?? <span className="u-mh-logo-bulat" />}</span>
      {label && <span className="u-mh-label">{label}</span>}
    </div>
  );
}

/** Tiga titik bergantian. */
export function MuatTitik({ label, ukuran = 'md', className }: { label?: React.ReactNode; ukuran?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <div className={cn('u-mh-tengah', className)} role="status" aria-label={typeof label === 'string' ? label : 'Memuat'}>
      <span className="u-mh-titik" data-ukuran={ukuran} aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label && <span className="u-mh-label">{label}</span>}
    </div>
  );
}

/** Ikon putar di tengah dengan teks. */
export function MuatPutar({ label = 'Memuat…', className }: { label?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('u-mh-tengah', className)}>
      <Spinner size="lg" label={typeof label === 'string' ? label : 'Memuat'} />
      {label && <span className="u-mh-label">{label}</span>}
    </div>
  );
}

export interface MuatHalamanProps {
  /** Bawaan "kerangka". */
  gaya?: GayaMuatAwal;
  /** Bentuk skeleton untuk gaya "kerangka". Bawaan "dasbor". */
  tata?: TataMuatHalaman;
  /** Logo untuk gaya "logo". */
  logo?: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
}

/** Satu pintu untuk semua gaya efek memuat halaman pertama. */
export function MuatHalaman({ gaya = 'kerangka', tata, logo, label, className }: MuatHalamanProps) {
  if (gaya === 'tidak') return null;
  if (gaya === 'logo') return <MuatLogo logo={logo} label={label} className={className} />;
  if (gaya === 'putar') return <MuatPutar label={label} className={className} />;
  if (gaya === 'titik') return <MuatTitik label={label ?? 'Memuat…'} className={className} />;
  return <KerangkaHalamanMuat tata={tata} className={className} />;
}

// ---------------------------------------------------------------- Transisi isi

/** Animasi masuk isi baru (Web Animations API, tanpa memasang ulang komponen). Diabaikan bila gerak dikurangi. */
export function animasikanMasuk(el: Element | null, efek: 'pudar' | 'blur') {
  if (!el || typeof (el as HTMLElement).animate !== 'function') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const awal = efek === 'blur' ? { opacity: 0.4, filter: 'blur(6px)' } : { opacity: 0.35, transform: 'translateY(4px)' };
  const akhir = efek === 'blur' ? { opacity: 1, filter: 'blur(0)' } : { opacity: 1, transform: 'none' };
  (el as HTMLElement).animate([awal, akhir], { duration: efek === 'blur' ? 260 : 220, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
}

/** Bungkus isi yang dianimasikan masuk setiap `kunci` berubah (mis. pathname). */
export function TransisiIsi({ kunci, efek = 'pudar', children, className }: { kunci: unknown; efek?: 'pudar' | 'blur' | 'tidak'; children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const awal = React.useRef(true);
  React.useLayoutEffect(() => {
    if (awal.current) return void (awal.current = false);
    if (efek !== 'tidak') animasikanMasuk(ref.current, efek);
  }, [kunci, efek]);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Seluruh aplikasi (sebelum KerangkaAplikasi tampil)

export interface MuatAplikasiProps {
  /** Teks untuk pembaca layar. */
  label?: string;
  /** Bentuk isi. Bawaan "dasbor". */
  tata?: TataMuatHalaman;
  /** Tunda sebelum tampil (ms), bawaan 150: cek sesi yang cepat tidak menampilkan apa pun. */
  tunda?: number;
  className?: string;
}

/**
 * Kerangka seluruh aplikasi (sidebar, bilah atas, isi) + bilah progres, untuk saat sesi/izin masih dicek sebelum
 * KerangkaAplikasi bisa dirender. Ukurannya sama dengan KerangkaAplikasi sehingga tidak ada lompatan tata letak.
 */
export function MuatAplikasi({ label = 'Memuat aplikasi', tata = 'dasbor', tunda = 150, className }: MuatAplikasiProps) {
  const tampil = useMuatTertunda(true, { tunda, minimal: 0 });
  return (
    <div className={cn('u-mh-aplikasi', className)} role="status" aria-label={label} aria-busy="true">
      <BilahProgres aktif tunda={tunda} />
      {tampil && (
        <>
          <aside className="u-mh-aplikasi-sb" aria-hidden>
            <div className="u-mh-baris">
              <Skeleton width={32} height={32} />
              <div className="u-mh-tumpuk">
                <Skeleton width="60%" height={12} />
                <Skeleton width="80%" height={9} />
              </div>
            </div>
            {[70, 55, 62, 48, 66, 52, 58].map((w, i) => (
              <div key={i} className="u-mh-baris">
                <Skeleton width={18} height={18} />
                <Skeleton width={`${w}%`} height={11} />
              </div>
            ))}
          </aside>
          <div className="u-mh-aplikasi-utama" aria-hidden>
            <div className="u-mh-aplikasi-atas">
              <Skeleton width={140} height={14} />
              <span className="u-mh-baris">
                <Skeleton width={220} height={34} className="u-mh-aplikasi-cari" />
                <Skeleton shape="circle" width={30} height={30} />
                <Skeleton shape="circle" width={30} height={30} />
              </span>
            </div>
            <div className="u-mh-aplikasi-isi">
              <KerangkaHalamanMuat tata={tata} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
