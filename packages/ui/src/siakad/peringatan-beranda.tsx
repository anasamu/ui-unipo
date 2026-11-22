'use client';
import * as React from 'react';
import { AlertOctagon, AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { cn } from '../lib/cn';
import { Tautan, type RenderLink } from '../lib/tautan';
import { formatDate } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Sheet } from '../components/overlays';

/**
 * Peringatan beranda aplikasi unit (keputusan Anas 2026-11-22): peringatan sejenis digabung dalam satu kartu ringkas
 * ("Akreditasi habis · 2 prodi"), kartu diurut dari yang paling mendesak (tingkat, lalu tenggat terdekat), paling banyak
 * `maks` jenis tampil (bawaan 3); sisanya lewat "Lihat semua" (panel samping atau `hrefSemua`). Di layar sempit kartu
 * menjadi slide yang bisa digeser (scroll-snap, tombol sebelum/berikut, tetap terbaca pembaca layar).
 *
 * Lingkup data (unit/prodi pengguna) WAJIB disaring di server; komponen ini hanya menyajikan.
 */

export type TingkatPeringatan = 'danger' | 'warning' | 'info';

export interface ButirPeringatan {
  key: string;
  /** Subjek singkat, mis. nama prodi atau unit. */
  judul: React.ReactNode;
  /** Keterangan satu baris, mis. "Unggul · berlaku sampai 1 Mar 2026". */
  keterangan?: React.ReactNode;
  /** Tanggal jatuh tempo (ISO/Date) untuk urutan dan teks "lewat N hari"/"sisa N hari". */
  tenggat?: string | Date | null;
  /** Tingkat butir (bawaan: tingkat jenisnya). */
  tingkat?: TingkatPeringatan;
  /** Label lencana status; bawaan dari tenggat ("Lewat 12 hari" / "Sisa 30 hari"). */
  status?: React.ReactNode;
  href?: string;
}

export interface JenisPeringatan {
  key: string;
  /** Nama jenis, mis. "Akreditasi habis". */
  judul: string;
  /** Satuan butir untuk hitungan, mis. "prodi" → "2 prodi". Bawaan "butir". */
  satuan?: string;
  tingkat: TingkatPeringatan;
  ikon?: React.ReactNode;
  /** Keterangan singkat jenis (tampil di panel Lihat semua). */
  keterangan?: React.ReactNode;
  butir: ButirPeringatan[];
  /** Halaman tindak lanjut jenis ini. */
  href?: string;
  /** Label tautan jenis. Bawaan "Buka". */
  labelAksi?: string;
}

export interface PeringatanBerandaProps {
  jenis: JenisPeringatan[];
  /** Paling banyak jenis yang tampil di beranda. Bawaan 3. */
  maks?: number;
  /** Paling banyak butir per kartu. Bawaan 3. */
  maksButir?: number;
  judul?: React.ReactNode;
  deskripsi?: React.ReactNode;
  /** Halaman daftar lengkap; tanpa ini "Lihat semua" membuka panel samping. */
  hrefSemua?: string;
  loading?: boolean;
  /** Ditampilkan bila tidak ada peringatan. Bawaan: tidak merender apa pun. */
  kosong?: React.ReactNode;
  renderLink?: RenderLink;
  /** Tanggal acuan (uji). */
  kini?: Date;
  className?: string;
}

const PERINGKAT: Record<TingkatPeringatan, number> = { danger: 0, warning: 1, info: 2 };
const IKON: Record<TingkatPeringatan, React.ReactNode> = { danger: <AlertOctagon />, warning: <AlertTriangle />, info: <Info /> };
const LABEL_TINGKAT: Record<TingkatPeringatan, string> = { danger: 'Mendesak', warning: 'Perlu perhatian', info: 'Info' };

const keTanggal = (d: string | Date | null | undefined): Date | null => {
  if (!d) return null;
  const x = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d;
  return Number.isNaN(x.getTime()) ? null : x;
};
const hariAntara = (d: Date, kini: Date) => Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(kini).setHours(0, 0, 0, 0)) / 864e5);
const angka = (n: number) => new Intl.NumberFormat('id-ID').format(n);

/** Teks status dari tenggat: "Lewat 12 hari", "Hari ini", "Sisa 30 hari". */
export function statusTenggat(tenggat: string | Date | null | undefined, kini: Date = new Date()): string | null {
  const d = keTanggal(tenggat);
  if (!d) return null;
  const h = hariAntara(d, kini);
  return h < 0 ? `Lewat ${angka(-h)} hari` : h === 0 ? 'Hari ini' : `Sisa ${angka(h)} hari`;
}

const waktu = (d: string | Date | null | undefined) => keTanggal(d)?.getTime() ?? Number.POSITIVE_INFINITY;
const tingkatButir = (b: ButirPeringatan, j: JenisPeringatan) => b.tingkat ?? j.tingkat;
const urutButir = (j: JenisPeringatan) =>
  j.butir.toSorted((a, b) => PERINGKAT[tingkatButir(a, j)] - PERINGKAT[tingkatButir(b, j)] || waktu(a.tenggat) - waktu(b.tenggat));

/** Urutkan jenis dari yang paling mendesak: tingkat, lalu tenggat terdekat, lalu jumlah butir terbanyak. Jenis tanpa butir dibuang. */
export function urutPeringatan(jenis: JenisPeringatan[]): JenisPeringatan[] {
  const ringkas = jenis
    .filter((j) => j.butir.length > 0)
    .map((j) => {
      const butir = urutButir(j);
      const tingkat = butir.reduce<TingkatPeringatan>((m, b) => (PERINGKAT[tingkatButir(b, j)] < PERINGKAT[m] ? tingkatButir(b, j) : m), j.tingkat);
      return { ...j, tingkat, butir };
    });
  return ringkas.sort(
    (a, b) => PERINGKAT[a.tingkat] - PERINGKAT[b.tingkat] || Math.min(...a.butir.map((x) => waktu(x.tenggat))) - Math.min(...b.butir.map((x) => waktu(x.tenggat))) || b.butir.length - a.butir.length,
  );
}

function BarisButir({ b, j, kini, renderLink }: { b: ButirPeringatan; j: JenisPeringatan; kini: Date; renderLink?: RenderLink }) {
  const t = tingkatButir(b, j);
  const status = b.status ?? statusTenggat(b.tenggat, kini);
  const ket = b.keterangan ?? (b.tenggat ? `Jatuh tempo ${formatDate(keTanggal(b.tenggat)!, 'medium')}` : null);
  const isi = (
    <>
      <span className="u-peringatan-titik" data-tingkat={t} aria-hidden />
      <span className="u-peringatan-butir-teks">
        <span className="u-peringatan-butir-judul">{b.judul}</span>
        {ket && <span className="u-peringatan-butir-ket">{ket}</span>}
      </span>
      {status && (
        <Badge variant={t} className="u-peringatan-butir-status">
          {status}
        </Badge>
      )}
    </>
  );
  return (
    <li>
      {b.href ? (
        <Tautan className="u-peringatan-butir" data-tautan="" href={b.href} renderLink={renderLink}>
          {isi}
        </Tautan>
      ) : (
        <div className="u-peringatan-butir">{isi}</div>
      )}
    </li>
  );
}

function KartuJenis({ j, maksButir, kini, renderLink, onSemua, posisi }: { j: JenisPeringatan; maksButir: number; kini: Date; renderLink?: RenderLink; onSemua?: () => void; posisi?: string }) {
  const id = React.useId();
  const tampil = j.butir.slice(0, maksButir);
  const sisa = j.butir.length - tampil.length;
  return (
    <article
      className="u-peringatan-kartu"
      data-tingkat={j.tingkat}
      {...(posisi ? { role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${posisi}: ${j.judul}` } : { 'aria-labelledby': id })}
    >
      <header className="u-peringatan-kepala">
        <span className="u-peringatan-ikon" aria-hidden>
          {j.ikon ?? IKON[j.tingkat]}
        </span>
        <div className="u-peringatan-kepala-teks">
          <h3 id={id}>{j.judul}</h3>
          <p>
            {angka(j.butir.length)} {j.satuan ?? 'butir'} · {LABEL_TINGKAT[j.tingkat]}
          </p>
        </div>
      </header>
      <ul className="u-peringatan-daftar">
        {tampil.map((b) => (
          <BarisButir key={b.key} b={b} j={j} kini={kini} renderLink={renderLink} />
        ))}
      </ul>
      {(j.href || sisa > 0) && (
        <footer className="u-peringatan-kaki">
          {sisa > 0 ? (
            <Button size="sm" variant="link" className="u-peringatan-lagi" onClick={onSemua}>
              +{angka(sisa)} {j.satuan ?? 'butir'} lainnya
            </Button>
          ) : (
            <span />
          )}
          {j.href && (
            <Tautan className="u-peringatan-aksi" href={j.href} renderLink={renderLink}>
              {j.labelAksi ?? 'Buka'} <ArrowRight aria-hidden />
            </Tautan>
          )}
        </footer>
      )}
    </article>
  );
}

/** Kartu peringatan beranda berkelompok per jenis, urut paling mendesak, maks 3 jenis + Lihat semua. */
export function PeringatanBeranda({ jenis, maks = 3, maksButir = 3, judul = 'Peringatan', deskripsi = 'Hal yang perlu diperhatikan sebelum jatuh tempo', hrefSemua, loading, kosong = null, renderLink, kini: kiniProp, className }: PeringatanBerandaProps) {
  const kini = React.useMemo(() => kiniProp ?? new Date(), [kiniProp]);
  const urut = React.useMemo(() => urutPeringatan(jenis), [jenis]);
  const [buka, setBuka] = React.useState(false);
  const geser = React.useRef<HTMLDivElement>(null);
  const [ujung, setUjung] = React.useState({ awal: true, akhir: true });
  const [umum, setUmum] = React.useState('');
  const sebelum = React.useRef<HTMLButtonElement>(null);
  const berikut = React.useRef<HTMLButtonElement>(null);
  const terakhir = React.useRef<number | null>(null);
  const tampil = urut.slice(0, maks);
  const totalButir = urut.reduce((n, j) => n + j.butir.length, 0);
  const terpotong = urut.length > tampil.length || tampil.some((j) => j.butir.length > maksButir);

  React.useEffect(() => {
    const el = geser.current;
    if (!el) return;
    const hitung = () => setUjung({ awal: el.scrollLeft <= 4, akhir: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    // Setelah geser berhenti: perbarui tombol dan umumkan slide yang terlihat (hanya bila berubah, tidak saat dimuat).
    const tenang = () => {
      hitung();
      const kartu = [...el.querySelectorAll<HTMLElement>(':scope > .u-peringatan-kartu')];
      if (kartu.length < 2) return;
      const awal = el.getBoundingClientRect().left;
      let i = 0;
      kartu.forEach((k, n) => {
        if (Math.abs(k.getBoundingClientRect().left - awal) < Math.abs(kartu[i].getBoundingClientRect().left - awal)) i = n;
      });
      if (terakhir.current !== null && terakhir.current !== i) setUmum(`Peringatan ${i + 1} dari ${kartu.length}`);
      terakhir.current = i;
    };
    hitung();
    terakhir.current = 0;
    const adaScrollend = typeof window !== 'undefined' && 'onscrollend' in window;
    let tunda: ReturnType<typeof setTimeout> | undefined;
    const geserLama = () => {
      clearTimeout(tunda);
      tunda = setTimeout(tenang, 120);
    };
    if (adaScrollend) el.addEventListener('scrollend', tenang);
    else el.addEventListener('scroll', geserLama, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(hitung) : null;
    ro?.observe(el);
    return () => {
      if (adaScrollend) el.removeEventListener('scrollend', tenang);
      else el.removeEventListener('scroll', geserLama);
      clearTimeout(tunda);
      ro?.disconnect();
    };
  }, [tampil.length]);

  // Tombol yang menjadi nonaktif saat difokus: pindahkan fokus ke tombol lawannya.
  React.useEffect(() => {
    if (ujung.awal && document.activeElement === sebelum.current) berikut.current?.focus();
    if (ujung.akhir && document.activeElement === berikut.current) sebelum.current?.focus();
  }, [ujung]);

  if (loading) {
    return (
      <section className={cn('u-peringatan', className)} aria-busy="true">
        <div className="u-peringatan-head">
          <h2 className="u-peringatan-judul">{judul}</h2>
        </div>
        <div className="u-peringatan-geser" data-jumlah={2}>
          {[0, 1].map((i) => (
            <Skeleton key={i} className="u-peringatan-kerangka" />
          ))}
        </div>
      </section>
    );
  }
  if (!urut.length) return <>{kosong}</>;

  // Geser ke kartu tetangga dari posisi gulir sebenarnya (bukan lebar tetap); gerak halus diatur CSS (hormati reduced motion).
  const langkah = (arah: 1 | -1) => {
    const el = geser.current;
    if (!el) return;
    const awal = el.getBoundingClientRect().left;
    const kartu = [...el.querySelectorAll<HTMLElement>(':scope > .u-peringatan-kartu')];
    const jarak = kartu.map((k) => k.getBoundingClientRect().left - awal);
    const kini = jarak.reduce((m, d, n) => (Math.abs(d) < Math.abs(jarak[m]) ? n : m), 0);
    const tujuan = Math.min(kartu.length - 1, Math.max(0, kini + arah));
    el.scrollBy({ left: jarak[tujuan] });
  };

  const bisaGeser = !(ujung.awal && ujung.akhir);
  const semua = hrefSemua ? (
    <Tautan className="u-peringatan-semua" href={hrefSemua} renderLink={renderLink}>
      Lihat semua ({angka(totalButir)}) <ArrowRight aria-hidden />
    </Tautan>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setBuka(true)}>
      Lihat semua ({angka(totalButir)}) <ArrowRight aria-hidden />
    </Button>
  );

  return (
    <section className={cn('u-peringatan', className)} aria-label={typeof judul === 'string' ? judul : undefined} aria-roledescription={bisaGeser ? 'carousel' : undefined}>
      <div className="u-peringatan-head">
        <div className="u-peringatan-head-teks">
          <h2 className="u-peringatan-judul">{judul}</h2>
          <p className="u-peringatan-meta">
            {deskripsi}
            {deskripsi ? ' · ' : ''}
            {angka(urut.length)} jenis, {angka(totalButir)} butir
          </p>
        </div>
        <div className="u-peringatan-head-aksi">
          {bisaGeser && (
            <span className="u-peringatan-nav">
              <Button ref={sebelum} size="sm" iconOnly variant="outline" aria-label="Peringatan sebelumnya" disabled={ujung.awal} onClick={() => langkah(-1)}>
                <ChevronLeft />
              </Button>
              <Button ref={berikut} size="sm" iconOnly variant="outline" aria-label="Peringatan berikutnya" disabled={ujung.akhir} onClick={() => langkah(1)}>
                <ChevronRight />
              </Button>
            </span>
          )}
          {terpotong && semua}
        </div>
      </div>
      <div ref={geser} className="u-peringatan-geser" data-jumlah={tampil.length} role="group" aria-label="Daftar peringatan" tabIndex={bisaGeser ? 0 : undefined}>
        {tampil.map((j, i) => (
          <KartuJenis key={j.key} j={j} maksButir={maksButir} kini={kini} renderLink={renderLink} onSemua={() => setBuka(true)} posisi={tampil.length > 1 ? `${i + 1} dari ${tampil.length}` : undefined} />
        ))}
      </div>
      <p className="u-sr-only" role="status" aria-live="polite">
        {umum}
      </p>
      {!hrefSemua && (
        <Sheet open={buka} onOpenChange={setBuka} title={typeof judul === 'string' ? `Semua ${judul.toLowerCase()}` : 'Semua peringatan'} description={`${angka(urut.length)} jenis, ${angka(totalButir)} butir, urut paling mendesak`} size="md">
          <div className="u-peringatan-semua-isi">
            {urut.map((j) => (
              <section key={j.key} className="u-peringatan-grup" data-tingkat={j.tingkat}>
                <header className="u-peringatan-kepala">
                  <span className="u-peringatan-ikon" aria-hidden>
                    {j.ikon ?? IKON[j.tingkat]}
                  </span>
                  <div className="u-peringatan-kepala-teks">
                    <h3>{j.judul}</h3>
                    <p>
                      {angka(j.butir.length)} {j.satuan ?? 'butir'}
                      {j.keterangan ? <> · {j.keterangan}</> : null}
                    </p>
                  </div>
                  {j.href && (
                    <Tautan className="u-peringatan-aksi" href={j.href} renderLink={renderLink} onClick={() => setBuka(false)}>
                      {j.labelAksi ?? 'Buka'} <ArrowRight aria-hidden />
                    </Tautan>
                  )}
                </header>
                <ul className="u-peringatan-daftar">
                  {j.butir.map((b) => (
                    <BarisButir key={b.key} b={b} j={j} kini={kini} renderLink={renderLink} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Sheet>
      )}
    </section>
  );
}
